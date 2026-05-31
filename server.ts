import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import AdmZip from "adm-zip";
import bplistParser from "bplist-parser";

// Inline XML plist parser — no npm dependency, handles the simple key/value pairs
// we need from Info.plist (CFBundleIdentifier, CFBundleDisplayName, etc.)
function parseXmlPlist(xml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // Match <key>K</key> followed by a value tag
  const re = /<key>([^<]+)<\/key>\s*(?:<string>([^<]*)<\/string>|<integer>([^<]*)<\/integer>|<real>([^<]*)<\/real>|(<true\/>)|(<false\/>)|<array>([\s\S]*?)<\/array>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const key = m[1];
    if (m[2] !== undefined) result[key] = m[2];           // string
    else if (m[3] !== undefined) result[key] = parseInt(m[3]); // integer
    else if (m[4] !== undefined) result[key] = parseFloat(m[4]); // real
    else if (m[5] !== undefined) result[key] = true;       // <true/>
    else if (m[6] !== undefined) result[key] = false;      // <false/>
    else if (m[7] !== undefined) {                         // <array>
      const items = [...m[7].matchAll(/<string>([^<]*)<\/string>/g)].map(a => a[1]);
      result[key] = items;
    }
  }
  return result;
}
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY is not set. Add it to .env or your Railway environment variables.");
  process.exit(1);
}

const claude = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  maxRetries: 3,        // auto-retry on transient network errors
  timeout: 5 * 60 * 1000, // 5 min timeout for large generations
});

app.use(express.json({ limit: "50mb" }));

// Multer — save uploaded IPA to OS temp dir
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 600 * 1024 * 1024 }, // 600 MB
});

// ── Logging ──────────────────────────────────────────────────────────
const ts = () => new Date().toISOString().slice(11, 23);
function slog(scope: string, msg: string) {
  console.log(`\x1b[90m[${ts()}]\x1b[0m \x1b[36m[${scope}]\x1b[0m ${msg}`);
}

// ── SSE ──────────────────────────────────────────────────────────────
function setupSSE(res: express.Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  return function emit(type: string, data: Record<string, unknown>) {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };
}

// ── Persistent data directories ──────────────────────────────────────
const DATA_DIR      = path.join(process.cwd(), "data");
const SESSIONS_DIR  = path.join(DATA_DIR, "sessions");
const DOWNLOADS_DIR = path.join(DATA_DIR, "downloads");
for (const d of [DATA_DIR, SESSIONS_DIR, DOWNLOADS_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

// ── GET /api/sessions ─────────────────────────────────────────────────
app.get("/api/sessions", (_req, res) => {
  try {
    const sessions = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), "utf8")); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    res.json(sessions);
  } catch {
    res.json([]);
  }
});

// ── PUT /api/sessions/:id ─────────────────────────────────────────────
app.put("/api/sessions/:id", (req, res) => {
  const { id } = req.params;
  if (!id || id.includes("/") || id.includes("..")) {
    return res.status(400).json({ error: "Invalid session id" });
  }
  const session = { ...req.body, id, updatedAt: Date.now() };
  fs.writeFileSync(path.join(SESSIONS_DIR, `${id}.json`), JSON.stringify(session, null, 2));
  slog("session", `💾 Saved session ${id} (${session.displayName ?? "?"} — ${session.chatHistory?.length ?? 0} messages)`);
  res.json({ ok: true });
});

// ── DELETE /api/sessions/:id ──────────────────────────────────────────
app.delete("/api/sessions/:id", (req, res) => {
  const { id } = req.params;
  if (!id || id.includes("/") || id.includes("..")) {
    return res.status(400).json({ error: "Invalid session id" });
  }
  const p = path.join(SESSIONS_DIR, `${id}.json`);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  slog("session", `🗑️  Deleted session ${id}`);
  res.json({ ok: true });
});

// ── GET /api/download/:filename ───────────────────────────────────────
app.get("/api/download/:filename", (req, res) => {
  const filename = req.params.filename;
  if (!filename || filename.includes("/") || filename.includes("..")) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const filepath = path.join(DOWNLOADS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    slog("download", `❌ Not found: ${filename}`);
    return res.status(404).json({ error: "File not found — it may have been cleaned up. Re-compile to regenerate." });
  }
  slog("download", `📦 Serving: ${filename}`);
  res.download(filepath);
});

// ── IPA extraction ───────────────────────────────────────────────────

interface ExtractedBinaryInfo {
  bundleIdentifier: string;
  displayName: string;
  bundleName: string;
  version: string;
  minOS: string;
  sdkVersion: string;
  architectures: string[];
  frameworks: string[];
  objcClasses: string[];        // real ObjC class names from binary
  objcSelectors: string[];      // real method selectors
  stringSymbols: string[];      // interesting strings from binary
  fileSize: string;
}

function sh(cmd: string, timeoutMs = 60000, maxBuffer = 32 * 1024 * 1024): string {
  return execSync(cmd, { encoding: "utf8", timeout: timeoutMs, shell: "/bin/sh", maxBuffer });
}

// Port of IPAai's MachOAnalyzer.parseObjcClasses — reads `otool -o -V` output
interface ParsedClass {
  name: string;
  superClass: string;
  methods: string[];
}

function parseOtoolObjc(otoolOut: string): ParsedClass[] {
  const classes: ParsedClass[] = [];
  let current: ParsedClass | null = null;

  const flush = () => {
    if (current && current.name) classes.push(current);
    current = null;
  };

  for (const raw of otoolOut.split("\n")) {
    const t = raw.trim();

    // Class name line: "name 0x1a2b3c ClassName"
    if (t.startsWith("name ") && t.includes("0x")) {
      const parts = t.split(/\s+/);
      const last = parts[parts.length - 1];
      if (last && !last.startsWith("0x") && last.length > 1) {
        flush();
        current = { name: last, superClass: "NSObject", methods: [] };
      }
    } else if ((t.startsWith("superclass") || t.startsWith("baseClass")) && current) {
      const parts = t.split(/\s+/);
      const last = parts[parts.length - 1];
      if (last && !last.startsWith("0x") && last !== "(null)") {
        current.superClass = last;
      }
    } else if (t.startsWith("name 0x") && current) {
      // Method selector line inside a method list
      const parts = t.split(/\s+/);
      const last = parts[parts.length - 1];
      if (last && !last.startsWith("0x") && last !== current.name) {
        current.methods.push(last);
      }
    }
  }
  flush();
  return classes;
}

// Infer likely return type from a selector name
function inferReturnType(sel: string): string {
  const lower = sel.toLowerCase();
  if (lower.startsWith("is") || lower.startsWith("has") || lower.startsWith("can") ||
      lower.startsWith("should") || lower.startsWith("contains") || lower.endsWith("Enabled") ||
      lower.endsWith("Valid") || lower.endsWith("Active") || lower.endsWith("Hidden")) return "BOOL";
  if (lower.startsWith("set") || lower === "dealloc" || lower === "viewdidload" ||
      lower.startsWith("did") || lower.startsWith("will") || lower.endsWith("Action:") ||
      lower.endsWith("tapped:") || lower.endsWith("pressed:")) return "void";
  if (lower.startsWith("count") || lower.endsWith("count") || lower.startsWith("num") ||
      lower.endsWith("index") || lower.endsWith("length")) return "NSInteger";
  if (lower.startsWith("string") || lower.endsWith("string") || lower.endsWith("title") ||
      lower.endsWith("text") || lower.endsWith("name") || lower.endsWith("key") ||
      lower.endsWith("identifier") || lower.endsWith("url") || lower.endsWith("path")) return "NSString *";
  if (lower.startsWith("init")) return "instancetype";
  return "id";
}

function extractIpaInfo(
  ipaPath: string,
  emit: (type: string, data: Record<string, unknown>) => void,
): ExtractedBinaryInfo {
  const log = (msg: string) => {
    slog("extract", msg);
    emit("log", { message: msg, step: 0 });
  };

  // ── 1. Verify the file actually arrived ────────────────────────────
  const fileBytes = fs.statSync(ipaPath).size;
  const sizeMB = (fileBytes / 1024 / 1024).toFixed(1);
  log(`📦 IPA received on server: ${sizeMB} MB (${fileBytes.toLocaleString()} bytes)`);

  if (fileBytes < 5000) {
    throw new Error(
      `IPA is only ${fileBytes} bytes — the browser sent an empty file. ` +
      `Make sure you're dropping a real .ipa file, not just typing the name.`,
    );
  }

  // ── 2. List entries with shell unzip (no memory load) ─────────────
  log(`🗜️  Listing archive contents…`);
  let listing: string;
  try {
    listing = sh(`unzip -Z1 "${ipaPath}" 2>&1`);
  } catch (e) {
    throw new Error(`unzip failed — not a valid zip/IPA: ${(e as Error).message?.slice(0, 120)}`);
  }
  const entries = listing.split("\n").map(l => l.trim()).filter(Boolean);
  log(`🗂️  ${entries.length} entries in archive`);

  // ── 3. Find Payload/App.app/Info.plist ─────────────────────────────
  const plistEntry = entries.find(e => /^Payload\/[^/]+\.app\/Info\.plist$/.test(e));
  if (!plistEntry) {
    throw new Error(
      `No Payload/*.app/Info.plist found in archive. ` +
      `Top entries: ${entries.slice(0, 5).join(", ")}`,
    );
  }

  const appDirName = plistEntry.split("/")[1];   // e.g. "Instagram.app"
  const binaryName = appDirName.replace(/\.app$/, ""); // e.g. "Instagram"
  log(`📱 App bundle: ${appDirName}`);
  log(`🔧 Expected binary: ${binaryName}`);

  // ── 4. Extract and parse Info.plist ────────────────────────────────
  log(`📋 Extracting Info.plist…`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tinker-"));
  let info: Record<string, unknown> = {};
  try {
    sh(`unzip -q -o "${ipaPath}" "${plistEntry}" -d "${tmpDir}"`, 30000);
    const plistPath = path.join(tmpDir, plistEntry);
    const plistBuf = fs.readFileSync(plistPath);

    // 1. bplist-parser (binary plist, cross-platform — works on Linux/Railway)
    let parsed = false;
    try {
      const result = bplistParser.parseBuffer(plistBuf);
      if (result?.[0]) { info = result[0] as Record<string, unknown>; parsed = true; }
    } catch { /* fall through */ }

    // 2. plist npm (XML plist)
    if (!parsed) {
      try {
        info = parseXmlPlist(plistBuf.toString("utf8"));
        parsed = true;
      } catch { /* fall through */ }
    }

    // 3. plutil (macOS-only fallback)
    if (!parsed) {
      const xml = sh(`plutil -convert xml1 -o - "${plistPath}"`, 15000);
      info = parseXmlPlist(xml);
    }

    log(`✅ Info.plist parsed`);
  } catch (e) {
    log(`⚠️  Info.plist parse failed: ${(e as Error).message?.slice(0, 100)}`);
  }

  const bundleId     = (info["CFBundleIdentifier"] as string)        || "unknown.bundle.id";
  const displayName  = (info["CFBundleDisplayName"] as string)
                    || (info["CFBundleName"] as string)               || binaryName;
  const bundleName   = (info["CFBundleName"] as string)               || binaryName;
  const version      = (info["CFBundleShortVersionString"] as string) || "?";
  const minOS        = (info["MinimumOSVersion"] as string)           || "14.0";
  const sdkVersion   = ((info["DTSDKName"] as string) ?? "").replace(/[^0-9.]/g, "") || "17.0";
  // Use CFBundleExecutable — this is the real binary name, not the app bundle name
  const executableName = (info["CFBundleExecutable"] as string) || binaryName;

  log(`✅ Bundle ID: ${bundleId}`);
  log(`✅ Display name: ${displayName}  v${version}`);
  log(`✅ Min iOS: ${minOS}`);
  log(`🔧 CFBundleExecutable: ${executableName}`);

  // ── 5. Find and extract main binary (using CFBundleExecutable exact name) ──
  const binaryEntry = entries.find(
    e => e === `Payload/${appDirName}/${executableName}`,
  );

  let architectures: string[] = ["arm64"];
  let objcClasses:   string[] = [];
  let objcSelectors: string[] = [];
  let stringSymbols: string[] = [];
  let frameworks:    string[] = [];

  if (!binaryEntry) {
    log(`⚠️  Binary "${executableName}" not found in archive`);
    log(`   Sample entries: ${entries.filter(e => e.startsWith(`Payload/${appDirName}/`)).slice(0, 8).join(", ")}`);
  } else {
    log(`🐺 Extracting: ${binaryEntry}`);
    const binaryPath = path.join(tmpDir, executableName);
    try {
      sh(`unzip -q -o -j "${ipaPath}" "${binaryEntry}" -d "${tmpDir}"`, 180000);
    } catch (e) {
      log(`❌ unzip failed: ${(e as Error).message?.slice(0, 120)}`);
    }

    if (fs.existsSync(binaryPath)) {
      const binaryBytes = fs.statSync(binaryPath).size;
      log(`🦅 Binary on disk: ${(binaryBytes / 1024 / 1024).toFixed(1)} MB`);

      // ── Architectures via lipo (same as IPAai) ──
      try {
        const lipoOut = sh(`lipo -archs "${binaryPath}" 2>/dev/null`, 20000);
        architectures = lipoOut.trim().split(/\s+/).filter(Boolean);
        log(`🏗️  Architectures (lipo): ${architectures.join(", ")}`);
      } catch {
        // Fall back to magic byte check (read 8 bytes only)
        try {
          const hdr = Buffer.alloc(8);
          const fd = fs.openSync(binaryPath, "r");
          fs.readSync(fd, hdr, 0, 8, 0);
          fs.closeSync(fd);
          const magic = hdr.readUInt32LE(0);
          if (magic === 0xcafebabe) architectures = ["arm64", "armv7"];
          else if (magic === 0xfeedfacf) architectures = ["arm64"];
          else if (magic === 0xfeedface) architectures = ["armv7"];
        } catch { /* ignore */ }
        log(`🏗️  Architectures (header): ${architectures.join(", ")}`);
      }

      // ── ObjC class names via nm (reads symbol table — correct approach) ──
      // nm gives us _OBJC_CLASS_$_ClassName entries from the Mach-O symtab.
      // strings | grep _OBJC_CLASS_ does NOT work because those symbols live
      // in the symtab, not as raw ASCII strings in the binary.
      log(`🔬 Extracting ObjC class names via nm (symbol table)…`);
      try {
        const nmOut = sh(
          `nm -arch arm64 "${binaryPath}" 2>/dev/null | grep '_OBJC_CLASS_\\$_' | sed 's/.*_OBJC_CLASS_\\$_//' | sort -u | head -2000`,
          120000,
          64 * 1024 * 1024,
        );
        objcClasses = nmOut.split("\n").filter(Boolean);
        log(`🎯 ObjC classes (nm symtab): ${objcClasses.length}`);
      } catch (e) {
        log(`⚠️  nm failed: ${(e as Error).message?.slice(0, 80)}`);
      }

      // ── Method selectors via strings (works for ObjC AND Swift/ObjC bridge apps) ──
      // ObjC method selectors live in the __objc_methnames section as plain C strings.
      // nm's [+-][Class method] format only works for pure ObjC; Swift apps mangle differently.
      // strings reads every null-terminated string from ALL sections, which includes methnames.
      log(`🔧 Extracting method selectors via strings (works for Swift + ObjC)…`);
      try {
        const selRaw = sh(
          // lowercase-starting identifiers 4-80 chars = ObjC/Swift selectors
          // filter out URLs, paths, digits-heavy strings
          `strings -a "${binaryPath}" 2>/dev/null | grep -E '^[a-z][A-Za-z0-9_:]{3,80}$' | grep -v '\\.' | sort -u | head -3000`,
          90000,
          64 * 1024 * 1024,
        );
        objcSelectors = selRaw.split("\n").filter(Boolean);
        log(`🔧 Method selectors (strings): ${objcSelectors.length}`);
      } catch (e) {
        log(`⚠️  Selector extraction failed: ${(e as Error).message?.slice(0, 80)}`);
      }

      // Also try ObjC method implementations via nm (pure ObjC apps / ObjC files in hybrid)
      try {
        const nmMethods = sh(
          `nm -arch arm64 "${binaryPath}" 2>/dev/null | grep -E ' [tT] [+-]\\[' | grep -oE '[+-]\\[[A-Za-z][A-Za-z0-9_]+ [a-zA-Z][a-zA-Z0-9_:]+\\]' | sort -u | head -2000`,
          60000,
          32 * 1024 * 1024,
        );
        const classMethodMap = new Map<string, string[]>();
        for (const line of nmMethods.split("\n").filter(Boolean)) {
          const m = line.match(/^[+-]\[([A-Za-z][A-Za-z0-9_]+) ([a-zA-Z][a-zA-Z0-9_:]+)\]$/);
          if (m) {
            const [, cls, sel] = m;
            if (!classMethodMap.has(cls)) classMethodMap.set(cls, []);
            classMethodMap.get(cls)!.push(sel);
          }
        }
        if (classMethodMap.size > 0) {
          const parsed: ParsedClass[] = [];
          for (const [cls, methods] of classMethodMap) {
            parsed.push({ name: cls, superClass: "NSObject", methods });
          }
          (extractIpaInfo as unknown as { _parsedClasses?: ParsedClass[] })._parsedClasses = parsed;
          // Merge nm selectors into strings-based list
          const nmSels = [...classMethodMap.values()].flat();
          objcSelectors = [...new Set([...objcSelectors, ...nmSels])];
          log(`🗺️  ObjC method map from nm: ${classMethodMap.size} classes, ${nmSels.length} methods`);
        }
      } catch { /* non-fatal — Swift apps won't have [+-][ entries */ }

      // ── otool -o -V fallback (only if nm gave us no classes) ──
      if (objcClasses.length === 0) {
        log(`🔬 Trying otool -o -V as fallback…`);
        try {
          // Stream-cap to 8MB to avoid ENOBUFS
          const otoolOut = sh(
            `otool -o -V "${binaryPath}" 2>/dev/null | head -c 8388608`,
            120000,
            16 * 1024 * 1024,
          );
          const parsed = parseOtoolObjc(otoolOut);
          objcClasses = parsed.map(c => c.name);
          objcSelectors = [...new Set(parsed.flatMap(c => c.methods))];
          (extractIpaInfo as unknown as { _parsedClasses?: ParsedClass[] })._parsedClasses = parsed;
          log(`🎯 ObjC classes (otool -o -V fallback): ${objcClasses.length}`);
        } catch (e) {
          log(`⚠️  otool -o -V also failed: ${(e as Error).message?.slice(0, 80)}`);
        }
      }

      // ── Interesting keyword strings ──
      try {
        const raw = sh(
          `strings -a "${binaryPath}" 2>/dev/null | grep -iE '(premium|subscri|unlocked|vip|trial|purchase|receipt|license|billing|ad_|banner|interstitial|jailbreak|debugger|detect|bypass|verify)' | sort -u | head -300`,
          60000,
        );
        stringSymbols = raw.split("\n").filter(Boolean);
        log(`💡 Keyword strings: ${stringSymbols.length}`);
      } catch { /* non-fatal */ }

      // ── Frameworks via otool -L ──
      try {
        const raw = sh(
          `otool -L "${binaryPath}" 2>/dev/null | grep -oE '[A-Za-z0-9_]+\\.framework' | sort -u`,
          30000,
        );
        frameworks = raw.split("\n").filter(Boolean);
        log(`📚 Frameworks (otool -L): ${frameworks.length}`);
      } catch { /* fall through */ }
    } else {
      log(`❌ Binary not on disk after extraction: ${binaryPath}`);
    }
  }

  // ── 6. Cleanup ─────────────────────────────────────────────────────
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }

  // Fallback: scan IPA zip entries for framework names
  if (frameworks.length === 0) {
    const fwSet = new Set<string>();
    for (const e of entries) {
      const m = e.match(/Frameworks\/([A-Za-z0-9_]+\.framework)\//);
      if (m) fwSet.add(m[1]);
    }
    frameworks = Array.from(fwSet);
    if (frameworks.length > 0) log(`📚 Frameworks from IPA structure: ${frameworks.length}`);
  }
  if (frameworks.length === 0) {
    frameworks = ["UIKit.framework", "Foundation.framework", "StoreKit.framework"];
  }

  return {
    bundleIdentifier: bundleId,
    displayName,
    bundleName,
    version,
    minOS,
    sdkVersion,
    architectures,
    frameworks,
    objcClasses,
    objcSelectors,
    stringSymbols,
    fileSize: `${sizeMB} MB`,
  };
}

// ── POST /api/analyze-ipa ─────────────────────────────────────────────
app.post(
  "/api/analyze-ipa",
  upload.single("file"),
  async (req: express.Request, res: express.Response) => {
    const emit = setupSSE(res);

    const model = (req.body?.model as string) || "claude-sonnet-4-6";
    const budgetTokens = parseInt(req.body?.budgetTokens as string) || 0;
    const uploadedFile = (req as express.Request & { file?: Express.Multer.File }).file;
    const fileName = uploadedFile?.originalname || (req.body?.fileName as string) || "unknown.ipa";

    const log = (message: string, step?: number) => {
      slog("analyze", message);
      const p: Record<string, unknown> = { message };
      if (step !== undefined) p.step = step;
      emit("log", p);
    };

    log(`🦊 Analysis session started`, 0);
    log(`📱 File: ${fileName}`, 0);
    log(uploadedFile
      ? `📤 Real IPA uploaded — ${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB on disk`
      : `⚠️  No file uploaded — will simulate from filename only`, 0);
    log(`🤖 Model: ${model}`, 0);
    log(budgetTokens > 0
      ? `🧠 Extended thinking: ${budgetTokens.toLocaleString()} tokens`
      : `⚡ Standard mode`, 0);

    let extracted: ExtractedBinaryInfo | null = null;

    if (uploadedFile) {
      try {
        log(`🔬 Starting real binary extraction…`, 0);
        extracted = extractIpaInfo(uploadedFile.path, emit);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log(`⚠️  Extraction failed: ${msg} — falling back to Claude simulation`, 0);
      } finally {
        // Always clean up the uploaded file
        try { fs.unlinkSync(uploadedFile.path); } catch { /* ignore */ }
      }
    }

    try {
      log(`🐺 Building Claude prompt…`, 1);

      let userPrompt: string;

      if (extracted && extracted.objcClasses.length > 0) {
        // ── REAL DATA PATH ─────────────────────────────────────────────────────
        // We have real classes from otool -o -V. Build most of the metadata
        // directly in TypeScript, then ask Claude only to ANNOTATE the top
        // hookable classes (small response, no truncation risk).

        log(`✅ REAL data: ${extracted.objcClasses.length} classes · ${extracted.objcSelectors.length} selectors`, 1);

        // Priority-sort classes: ones with ad/premium/jailbreak keywords first
        const HOOK_KEYWORDS = /ad|sponsor|premium|subscri|purchase|receipt|license|vip|pro|jailbreak|debugger|detect|bypass|verify|paywall|unlock|free|trial/i;
        const priority = extracted.objcClasses.filter(c => HOOK_KEYWORDS.test(c));
        const rest     = extracted.objcClasses.filter(c => !HOOK_KEYWORDS.test(c));
        const top15    = [...priority, ...rest].slice(0, 15);

        log(`🎯 Top hookable classes: ${top15.slice(0, 5).join(", ")}…`, 1);
        log(`📡 Asking Claude to annotate ${top15.length} real classes…`, 1);

        // Build selector context for these classes
        const relevantSelectors = extracted.objcSelectors
          .filter(s => HOOK_KEYWORDS.test(s))
          .slice(0, 80);

        userPrompt = `You are annotating a REAL iOS binary class dump for tweak development.

APP: ${extracted.displayName} (${extracted.bundleIdentifier}) v${extracted.version}

These are REAL class names extracted from the binary with otool:
${top15.join("\n")}

These are REAL method selectors found in the binary (keyword-filtered):
${relevantSelectors.join(", ")}

For each class above, output EXACTLY this compact JSON array (no extras, no markdown):
[
  {
    "name": "exact class name from list",
    "superClass": "best guess superclass",
    "protocols": [],
    "properties": [{"name": "...", "type": "...", "attributes": ["nonatomic","strong"]}],
    "methods": [
      {"name": "matching selector or inferred", "returnType": "BOOL|void|id|NSString *|NSInteger|instancetype", "arguments": [], "isClassMethod": false, "notes": "one line: what this does and why it matters for hooking"}
    ]
  }
]

Rules:
- Use ONLY class names from the list above.
- Prefer selectors from the real selector list; infer others from class name.
- 2-4 methods per class, focused on hooking value.
- Keep notes brief (one sentence).
- Output the raw JSON array only, no wrapper object.`;

      } else {
        // ── FALLBACK — no real binary data ─────────────────────────────────────
        log(`⚠️  No real binary data — simulating from filename`, 1);
        log(`📡 Sending simulation request to Claude…`, 1);

        userPrompt = `Generate a realistic class dump for iOS app: "${fileName}".
Focus on: subscription checks, ad controllers, jailbreak detection, premium gates.
Generate 6 realistic ObjC classes.

Return a raw JSON array only (no wrapper, no markdown):
[
  {
    "name": "ClassName",
    "superClass": "UIViewController",
    "protocols": [],
    "properties": [{"name": "isPremium", "type": "BOOL", "attributes": ["nonatomic","assign"]}],
    "methods": [{"name": "checkSubscription", "returnType": "BOOL", "arguments": [], "isClassMethod": false, "notes": "Returns YES if user has active subscription"}]
  }
]`;
      }

      // Analyze annotation is a small task — always use standard mode (no thinking),
      // max 8192 tokens. Extended thinking requires streaming (messages.stream),
      // but analyze uses messages.create. budgetTokens is for chat only.
      const analyzeMaxTokens = 8192;

      log(`🦅 Dispatching to Claude ${model} — max_tokens=${analyzeMaxTokens} (standard, no thinking)…`, 1);
      const t0 = Date.now();

      const response = await claude.messages.create({
        model,
        max_tokens: analyzeMaxTokens,
        system:
          "You are a professional iOS reverse engineer and binary analyst. You MUST respond with ONLY valid JSON — no markdown, no code fences, no explanation. Just raw JSON.",
        messages: [{ role: "user", content: userPrompt }],
      });

      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      log(`✅ Claude responded in ${elapsed}s`, 2);
      log(`📊 Tokens: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`, 2);

      // Log thinking block if present
      for (const block of response.content) {
        if (block.type === "thinking") {
          const tb = block as { type: "thinking"; thinking: string };
          const preview = tb.thinking.slice(0, 300);
          log(`🧠 Thinking: "${preview}${tb.thinking.length > 300 ? "…" : ""}"`, 2);
          emit("thinking", { text: tb.thinking });
        }
      }

      log(`🐝 Parsing class dump JSON from response…`, 3);
      const textBlock = response.content.find((b) => b.type === "text");
      const rawText = textBlock?.type === "text" ? (textBlock as Anthropic.TextBlock).text : "";
      log(`📄 Response: ${rawText.length} chars`, 3);

      let jsonText = rawText.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        log(`🧹 Stripped code fence`, 3);
      }

      // Claude returns a classes ARRAY (not a full metadata object) in the real data path
      let classes: unknown[] = [];
      try {
        const parsed = JSON.parse(jsonText);
        classes = Array.isArray(parsed) ? parsed : (parsed.classes ?? []);
      } catch (e) {
        log(`⚠️  JSON parse failed: ${(e as Error).message?.slice(0, 80)}`, 3);
        // Try to salvage partial JSON by cutting at last complete class
        const lastBrace = jsonText.lastIndexOf("},");
        if (lastBrace > 0) {
          try {
            classes = JSON.parse(jsonText.slice(0, lastBrace + 1) + "]");
            log(`🔧 Salvaged ${classes.length} classes from partial JSON`, 3);
          } catch { /* give up */ }
        }
      }

      // Assemble the full metadata object (real fields from extraction, classes from Claude)
      const metadata = extracted ? {
        fileName,
        fileSize: extracted.fileSize,
        bundleIdentifier: extracted.bundleIdentifier,
        bundleName: extracted.bundleName,
        displayName: extracted.displayName,
        minimumOSVersion: extracted.minOS,
        sdkVersion: extracted.sdkVersion,
        architecture: extracted.architectures,
        frameworks: extracted.frameworks,
        classes,
      } : JSON.parse(jsonText); // fallback: Claude returned full object

      const classCount  = metadata.classes?.length ?? 0;
      const methodCount = metadata.classes?.reduce((a: number, c: { methods?: unknown[] }) => a + (c.methods?.length ?? 0), 0) ?? 0;

      log(`🎯 Mapped: ${classCount} classes · ${methodCount} methods`, 3);
      for (const cls of (metadata.classes ?? []).slice(0, 8)) {
        const c = cls as { name?: string; superClass?: string; methods?: unknown[] };
        log(`   🪝 ${c.name} ← ${c.superClass} (${c.methods?.length ?? 0} methods)`, 3);
      }

      log(`🐉 Building Logos starter template…`, 4);
      await wait(180);
      log(`✅ Analysis complete — ${classCount} REAL hookable classes mapped`, 4);

      emit("done", { metadata });
      res.end();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      slog("analyze", `❌ Claude annotation failed: ${msg}`);

      // If we have real extracted data, emit it as-is without Claude annotation
      // rather than falling back to completely fake metadata
      if (extracted && extracted.bundleIdentifier !== "unknown.bundle.id") {
        log(`🔧 Claude failed but we have real binary data — returning extracted metadata directly`, 3);
        const directClasses = extracted.objcClasses.slice(0, 15).map(name => ({
          name,
          superClass: "NSObject",
          protocols: [],
          properties: [] as unknown[],
          methods: extracted.objcSelectors
            .filter(s => name.toLowerCase().includes(s.slice(0, 4).toLowerCase()))
            .slice(0, 4)
            .map(sel => ({
              name: sel,
              returnType: inferReturnType(sel),
              arguments: [],
              isClassMethod: false,
              notes: `Real selector extracted from binary`,
            })),
        }));

        const fallbackMetadata = {
          fileName,
          fileSize: extracted.fileSize,
          bundleIdentifier: extracted.bundleIdentifier,
          bundleName: extracted.bundleName,
          displayName: extracted.displayName,
          minimumOSVersion: extracted.minOS,
          sdkVersion: extracted.sdkVersion,
          architecture: extracted.architectures,
          frameworks: extracted.frameworks,
          classes: directClasses,
        };

        log(`✅ Emitting real metadata: ${extracted.bundleIdentifier} · ${directClasses.length} classes`, 4);
        emit("done", { metadata: fallbackMetadata });
      } else {
        emit("error", { message: msg });
      }
      res.end();
    }
  },
);

// ── POST /api/chat ── SSE streaming ──────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const {
    message,
    chatHistory,
    ipaMetadata,
    tweakCode,
    tweakLanguage,
    model = "claude-sonnet-4-6",
    budgetTokens = 0,
  } = req.body;

  const emit = setupSSE(res);

  const log = (msg: string) => {
    slog("chat", msg);
    emit("log", { message: msg });
  };

  log(`🦊 Chat request received`);
  log(`🤖 Model: ${model} | Thinking: ${budgetTokens > 0 ? budgetTokens.toLocaleString() + " tokens" : "off"}`);
  log(`💬 User: "${(message ?? "").slice(0, 100)}${(message ?? "").length > 100 ? "…" : ""}"`);
  log(`📚 History: ${chatHistory?.length ?? 0} messages`);
  if (ipaMetadata) {
    log(`🎯 Target: ${ipaMetadata.displayName} (${ipaMetadata.bundleIdentifier}) — ${ipaMetadata.classes?.length ?? 0} classes · ${ipaMetadata.frameworks?.length ?? 0} frameworks`);
  }
  log(`📝 Tweak code: ${tweakCode?.length ?? 0} chars (${tweakLanguage})`);

  try {
    const systemPrompt = `You are a veteran iOS security researcher and substrate tweak developer embedded in a web-based IDE called Tinker.

You have deep expertise with:
- Theos build system and Logos preprocessor syntax (%hook, %orig, %end, %ctor, %new)
- Mobile Substrate / CydiaSubstrate hooking
- Objective-C runtime manipulation
- Reverse engineering iOS binaries (class-dump, otool, nm, strings)
- Swift interop hooking via @objc exposure

THE USER HAS ALREADY ANALYZED THEIR APP. The class-dump data below comes from REAL binary extraction (class names, selectors, and strings extracted directly from the decrypted Mach-O binary). Use these REAL class names — they exist in the binary.

═══ TARGET APP METADATA ═══
${JSON.stringify(ipaMetadata || {}, null, 2)}

═══ CURRENT TWEAK CODE ═══
${tweakCode || "// Empty — no tweak code yet."}

═══ RESPONSE FORMAT ═══
Respond with ONLY valid JSON, no markdown, no code fences:
{
  "explanation": "Expert explanation: which real classes/methods you targeted and why.",
  "commandRun": {
    "command": "Simulated terminal command (e.g. nm -arch arm64 Binary | grep isPremium)",
    "output": "Simulated CLI output — derived from the real class/method data above"
  },
  "tweakCode": "COMPLETE updated Logos tweak (.x file). Replaces entire editor. Include all imports, %hook blocks, %end directives. Use ONLY real class names from the metadata."
}

RULES:
1. ONLY hook classes/methods from the metadata — these are REAL names from the binary.
2. Always include a commandRun.
3. tweakCode must be COMPLETE — replaces the whole file.
4. Write production Logos. Use %orig where appropriate.
5. Add NSLog statements so the user can verify hooks are firing.
6. Remove ads: hook ad view controllers, return nil from ad loaders, hide banners.
7. Unlock premium: hook subscription/verification methods to return YES/true.

CRITICAL — MODERN iOS API RULES (target is iOS 16+ — Xcode SDK is strict):
- NEVER use [UIApplication sharedApplication].keyWindow — it is deprecated and won't compile with -Werror.
  Use this instead:
    UIWindow *keyWin = nil;
    for (UIScene *sc in [UIApplication sharedApplication].connectedScenes) {
        if ([sc isKindOfClass:[UIWindowScene class]])
            for (UIWindow *w in ((UIWindowScene *)sc).windows)
                if (w.isKeyWindow) { keyWin = w; break; }
    }
- NEVER use [UIApplication sharedApplication].windows — deprecated iOS 15+.
  Use the connectedScenes loop above and collect windows from UIWindowScene.
- NEVER create a retain cycle in recursive blocks. Use __block __weak:
    __block void (^scanner)(void);
    scanner = ^{ /* ... */ };
    __weak __typeof(scanner) weakScanner = scanner;
    // inside the block, call weakScanner() not scanner().
- ALWAYS include #import <UIKit/UIKit.h> and any other needed framework headers.
- Compiled with -fobjc-arc. Do not use manual retain/release.`;

    const messages: Anthropic.MessageParam[] = [];
    for (const m of chatHistory ?? []) {
      if (m.role === "user") messages.push({ role: "user", content: m.content });
      else if (m.role === "assistant") messages.push({ role: "assistant", content: m.content });
    }
    messages.push({ role: "user", content: message });

    const thinkingOpts: Record<string, unknown> =
      budgetTokens > 0 ? { thinking: { type: "enabled", budget_tokens: budgetTokens } } : {};
    // Tweak code for a real feature can be 5-15k tokens. 16k gives plenty of headroom.
    const maxTokens = budgetTokens > 0 ? budgetTokens + 16000 : 16000;

    log(`📡 Opening Anthropic stream — ${messages.length} messages in context`);
    log(`🐺 max_tokens=${maxTokens}  stream=true`);

    const t0 = Date.now();
    let fullText = "";
    let thinkingText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let thinkingActive = false;

    const stream = claude.messages.stream({
      model,
      max_tokens: maxTokens,
      ...(thinkingOpts as object),
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "message_start") {
        inputTokens = event.message.usage.input_tokens;
        log(`📊 Input tokens: ${inputTokens}`);
        log(`🦅 Claude is generating…`);
      } else if (event.type === "content_block_start") {
        if (event.content_block.type === "thinking") {
          thinkingActive = true;
          log(`🧠 Extended thinking started…`);
        } else if (event.content_block.type === "text") {
          thinkingActive = false;
          if (thinkingText) log(`🧠 Thinking complete — ${thinkingText.length} chars`);
          log(`✍️  Text generation started…`);
        }
      } else if (event.type === "content_block_delta") {
        if (event.delta.type === "thinking_delta") {
          thinkingText += event.delta.thinking;
          if (thinkingText.length % 400 < 20) {
            const snippet = thinkingText.slice(-180).replace(/\n/g, " ");
            log(`🧠 [thinking] …${snippet}`);
            emit("thinking", { text: thinkingText.slice(-400), cumulative: thinkingText.length });
          }
        } else if (event.delta.type === "text_delta") {
          fullText += event.delta.text;
        }
      } else if (event.type === "content_block_stop") {
        if (thinkingActive) thinkingActive = false;
      } else if (event.type === "message_delta") {
        outputTokens = event.usage.output_tokens;
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    log(`✅ Generation complete in ${elapsed}s`);
    log(`📊 Tokens out: ${outputTokens} (total: ${inputTokens + outputTokens})`);
    if (thinkingText) log(`🧠 Thinking: ${thinkingText.length} chars`);
    log(`📄 Response: ${fullText.length} chars`);
    log(`🐝 Parsing JSON payload…`);

    let payload: Record<string, unknown> = {};
    let jsonText = fullText.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      log(`🧹 Stripped code fence`);
    }

    // Try clean parse first
    try {
      payload = JSON.parse(jsonText);
      const code = typeof payload.tweakCode === "string" ? payload.tweakCode : "";
      const hooks = (code.match(/%hook/g) || []).length;
      log(`🎯 Parsed OK — explanation: ${typeof payload.explanation === "string" ? payload.explanation.length : 0} chars, hooks: ${hooks}`);
      log(`🪝 ${hooks} %hook blocks generated`);
    } catch {
      log(`⚠️  JSON parse failed (likely truncated at ${outputTokens} tokens) — attempting recovery`);

      // Recovery: extract fields from partial JSON using regex
      // This handles the common case of tweakCode getting cut off mid-string
      const recovered: Record<string, unknown> = {};

      // Extract explanation (usually comes first and is complete)
      const explMatch = jsonText.match(/"explanation"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/s);
      if (explMatch) {
        recovered.explanation = explMatch[1]
          .replace(/\\n/g, "\n").replace(/\\t/g, "\t")
          .replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        log(`🔧 Recovered explanation: ${String(recovered.explanation).length} chars`);
      }

      // Extract commandRun block
      const crMatch = jsonText.match(/"commandRun"\s*:\s*(\{[\s\S]*?\})/);
      if (crMatch) {
        try { recovered.commandRun = JSON.parse(crMatch[1]); } catch { /* ignore */ }
      }

      // Extract tweakCode — may be truncated, take everything after "tweakCode": "
      const codeStart = jsonText.indexOf('"tweakCode"');
      if (codeStart !== -1) {
        const afterKey = jsonText.slice(codeStart);
        const valueMatch = afterKey.match(/^"tweakCode"\s*:\s*"([\s\S]*)/);
        if (valueMatch) {
          let raw = valueMatch[1];
          // Remove trailing partial JSON if present (closing quotes/braces)
          // If the string ends cleanly with ", keep it; otherwise take all of it
          const cleanEnd = raw.match(/^([\s\S]*?)"\s*\}?\s*$/);
          if (cleanEnd) raw = cleanEnd[1];
          // Unescape JSON string escapes
          const code = raw
            .replace(/\\n/g, "\n").replace(/\\t/g, "\t")
            .replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          recovered.tweakCode = code;
          const hooks = (code.match(/%hook/g) || []).length;
          log(`🔧 Recovered tweakCode: ${code.length} chars, ${hooks} hooks`);
        }
      }

      if (Object.keys(recovered).length > 0) {
        payload = recovered;
        log(`✅ Partial recovery succeeded — ${Object.keys(recovered).join(", ")}`);
      } else {
        // Complete failure — show a clean error message, not raw JSON
        log(`❌ Recovery failed — no fields extracted`);
        payload = {
          explanation: "Response was cut off before completing. Try again — the model hit the token limit mid-response. Consider using the Deep or Max effort setting.",
          tweakCode: tweakCode || "",
        };
      }
    }

    emit("done", {
      ...payload,
      meta: { model, inputTokens, outputTokens, elapsed, thinkingLength: thinkingText.length },
    });
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    slog("chat", `❌ FAILED: ${msg}`);
    emit("error", { message: msg });
    res.end();
  }
});

// ── POST /api/compile-tweak ── REAL Theos compilation ────────────────
app.post("/api/compile-tweak", async (req, res) => {
  const { tweakCode, tweakLanguage, appName, bundleId } = req.body;
  slog("compile", `🔨 Starting REAL Theos build for ${appName}`);

  const logs: string[] = [];
  const srcFile = tweakLanguage === "swift" ? "Tweak.swift" : "Tweak.x";

  const hasHooks =
    tweakCode &&
    (tweakCode.includes("%hook") || tweakCode.includes("@objc") ||
     tweakCode.includes("import") || tweakCode.includes("func"));

  if (!hasHooks) {
    return res.json({
      success: false,
      logs: ["[ERROR] No hookable code found. Ask the assistant to generate tweak code first."],
      error: "No hookable code.",
    });
  }

  const tweakName = `${appName.replace(/[^A-Za-z0-9]/g, "")}Tweak`;
  const pkg = (bundleId || `com.tinker.${appName.toLowerCase()}`).toLowerCase().replace(/[^a-z0-9.]/g, "");

  // Detect Theos — try THEOS env var, then ~/theos
  const theosPath = process.env.THEOS ||
    (fs.existsSync(`${process.env.HOME}/theos`) ? `${process.env.HOME}/theos` : null);

  if (!theosPath) {
    // No Theos — return a source zip the user can build locally
    slog("compile", `⚠️  Theos not found — returning source zip`);
    const filterPlist = `{ Filter = { Bundles = ( "${bundleId}" ); }; }\n`;
    const zip = new AdmZip();
    zip.addFile(srcFile, Buffer.from(tweakCode, "utf8"));
    zip.addFile("Makefile", Buffer.from([
      `THEOS ?= ~/theos`, `TARGET := iphone:clang:latest:16.3`,
      `INSTALL_TARGET_PROCESSES = ${appName}`, ``,
      `include $(THEOS)/makefiles/common.mk`, ``,
      `TWEAK_NAME = ${tweakName}`, `${tweakName}_FILES = ${srcFile}`,
      `${tweakName}_CFLAGS = -fobjc-arc -Wno-deprecated-declarations -Wno-arc-retain-cycles`,
      `${tweakName}_FRAMEWORKS = UIKit Foundation Photos`, ``,
      `include $(THEOS_MAKE_PATH)/tweak.mk`,
    ].join("\n"), "utf8"));
    zip.addFile("control", Buffer.from([
      `Package: ${pkg}`, `Name: ${appName} Tweak`, `Version: 1.0`,
      `Architecture: iphoneos-arm64`, `Description: Generated by Tinker`,
      `Author: Tinker`, `Section: Tweaks`, `Depends: mobilesubstrate`,
    ].join("\n"), "utf8"));
    zip.addFile(`${tweakName}.plist`, Buffer.from(filterPlist, "utf8"));
    const zipName = `${appName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_tweak.zip`;
    zip.writeZip(path.join(DOWNLOADS_DIR, zipName));
    return res.json({
      success: true,
      logs: [
        `[!] Theos not installed on this server — returning source zip instead.`,
        `[+] Unzip and run: THEOS=~/theos make package`,
        `[SUCCESS] ${zipName}`,
      ],
      downloadUrl: `/api/download/${zipName}`,
    });
  }

  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), `tinker-build-`));

  try {
    // ── Write project files ──────────────────────────────────────────
    fs.writeFileSync(path.join(buildDir, srcFile), tweakCode);

    fs.writeFileSync(path.join(buildDir, "Makefile"), [
      `THEOS ?= ${process.env.HOME}/theos`,
      `TARGET := iphone:clang:latest:16.3`,
      `INSTALL_TARGET_PROCESSES = ${appName}`,
      ``,
      `include $(THEOS)/makefiles/common.mk`,
      ``,
      `TWEAK_NAME = ${tweakName}`,
      `${tweakName}_FILES = ${srcFile}`,
      `${tweakName}_CFLAGS = -fobjc-arc -Wno-deprecated-declarations -Wno-arc-retain-cycles`,
      `${tweakName}_FRAMEWORKS = UIKit Foundation Photos`,
      ``,
      `include $(THEOS_MAKE_PATH)/tweak.mk`,
    ].join("\n"));

    fs.writeFileSync(path.join(buildDir, "control"), [
      `Package: ${pkg}`,
      `Name: ${appName} Tweak`,
      `Version: 1.0`,
      `Architecture: iphoneos-arm64`,
      `Description: Generated by Tinker`,
      `Author: Tinker`,
      `Section: Tweaks`,
      `Depends: mobilesubstrate`,
    ].join("\n"));

    fs.writeFileSync(
      path.join(buildDir, `${tweakName}.plist`),
      `{ Filter = { Bundles = ( "${bundleId}" ); }; }\n`,
    );

    logs.push(`[+] Project staged in ${buildDir}`);
    logs.push(`[+] Theos: ${process.env.HOME}/theos`);
    logs.push(`[*] Running: make package`);
    slog("compile", `📁 Build dir: ${buildDir}`);

    // ── Run make package ─────────────────────────────────────────────
    const { execSync: execS } = await import("child_process");
    let makeOutput = "";
    try {
      makeOutput = execS(`make package 2>&1`, {
        cwd: buildDir,
        encoding: "utf8",
        timeout: 120000,
        env: {
          ...process.env,
          THEOS: `${process.env.HOME}/theos`,
          // Silence parallel build notice
          MAKEFLAGS: "--no-print-directory",
        },
      });
    } catch (makeErr: unknown) {
      const err = makeErr as { stdout?: string; stderr?: string; message?: string };
      makeOutput = (err.stdout ?? "") + (err.stderr ?? "") + (err.message ?? "");
      // Log raw output for debugging
      for (const line of makeOutput.split("\n").filter(Boolean)) {
        logs.push(`  ${line}`);
      }
      slog("compile", `❌ make failed:\n${makeOutput.slice(0, 800)}`);
      return res.json({ success: false, logs, error: "Compilation failed — see logs above." });
    }

    // Strip ANSI colour codes from make output for the log panel
    const stripped = makeOutput.replace(/\x1b\[[0-9;]*m/g, "");
    for (const line of stripped.split("\n").filter(l => l.trim())) {
      logs.push(`  ${line}`);
    }

    // ── Find the .deb ────────────────────────────────────────────────
    const packagesDir = path.join(buildDir, "packages");
    const debs = fs.existsSync(packagesDir)
      ? fs.readdirSync(packagesDir).filter(f => f.endsWith(".deb"))
      : [];

    if (debs.length === 0) {
      slog("compile", `❌ No .deb found after make`);
      return res.json({ success: false, logs, error: "Build completed but no .deb was produced." });
    }

    const debSrc = path.join(packagesDir, debs[0]);
    const debName = `${appName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_tweak.deb`;
    const debDest = path.join(DOWNLOADS_DIR, debName);
    fs.copyFileSync(debSrc, debDest);

    // Also find and copy the fat dylib for direct injection
    const dylibSrc = path.join(buildDir, ".theos", "obj", "debug", `${tweakName}.dylib`);
    let dylibName: string | null = null;
    if (fs.existsSync(dylibSrc)) {
      dylibName = `${appName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_tweak.dylib`;
      fs.copyFileSync(dylibSrc, path.join(DOWNLOADS_DIR, dylibName));
      logs.push(`[+] dylib: ${dylibName}`);
    }

    logs.push(`[SUCCESS] ${debName} (${(fs.statSync(debDest).size / 1024).toFixed(0)} KB)`);
    if (dylibName) logs.push(`[+] dylib also available: /api/download/${dylibName}`);
    slog("compile", `✅ Build complete: ${debName}`);

    res.json({
      success: true,
      logs,
      downloadUrl: `/api/download/${debName}`,
      dylibUrl: dylibName ? `/api/download/${dylibName}` : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logs.push(`[ERROR] ${msg}`);
    slog("compile", `❌ ${msg}`);
    res.json({ success: false, logs, error: msg });
  } finally {
    // Clean up build dir (keep output files — they're already copied to DOWNLOADS_DIR)
    try { fs.rmSync(buildDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

});

// ── Static / Vite dev ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  import("vite").then(async (viteModule) => {
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, r) => r.sendFile(path.join(distPath, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  slog("server", `🚀 Tinker server running on http://localhost:${PORT}`);
  slog("server", `🤖 Default model: claude-sonnet-4-6`);
  slog("server", `🔑 API key: ${ANTHROPIC_API_KEY.slice(0, 18)}…`);
});

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
