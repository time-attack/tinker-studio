import React from "react";
import { Ic, I } from "./Icons";
import { TowerGlyph } from "./Atoms";
import { ClaudeSettings, IpaMetadata } from "../types";

interface AnalyzingProps {
  appName: string;
  file?: File;
  settings: ClaudeSettings;
  onDone: (metadata: IpaMetadata, starterCode: string) => void;
}

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
  label: string;
  detail?: string;
  status: StepStatus;
}

const INITIAL_STEPS: Step[] = [
  { label: "Preparing binary for analysis", status: "pending" },
  { label: "Sending to Claude for decompilation", status: "pending" },
  { label: "Waiting for Claude to analyze the binary", status: "pending" },
  { label: "Parsing decompiled class headers", status: "pending" },
  { label: "Generating starter tweak template", status: "pending" },
];

export const Analyzing: React.FC<AnalyzingProps> = ({ appName, file, settings, onDone }) => {
  const [steps, setSteps] = React.useState<Step[]>(INITIAL_STEPS);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<string | null>(null);
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  const ran = React.useRef(false);

  const updateStep = (index: number, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const appendLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  // Auto-scroll log panel
  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : null;
        updateStep(0, {
          status: "running",
          detail: file
            ? `Uploading ${appName} (${fileSizeMB} MB)…`
            : `Staging ${appName} by name…`,
        });

        let body: FormData | string;
        let headers: Record<string, string> = {};

        if (file) {
          const fd = new FormData();
          fd.append("file", file, appName);
          fd.append("model", settings.model);
          fd.append("budgetTokens", String(settings.budgetTokens));
          body = fd;
          // Don't set Content-Type — browser sets multipart boundary automatically
        } else {
          body = JSON.stringify({ fileName: appName, model: settings.model, budgetTokens: settings.budgetTokens });
          headers["Content-Type"] = "application/json";
        }

        const response = await fetch("/api/analyze-ipa", {
          method: "POST",
          headers,
          body,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let metadata: IpaMetadata | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            let event: Record<string, unknown>;
            try { event = JSON.parse(jsonStr); } catch { continue; }

            if (event.type === "log") {
              const msg = event.message as string;
              const step = typeof event.step === "number" ? event.step : undefined;
              appendLog(msg);

              // Drive the step UI from step tags
              if (step === 0) {
                updateStep(0, { status: "running", detail: msg.replace(/^[^\s]+ /, "") });
              } else if (step === 1) {
                updateStep(0, { status: "done" });
                updateStep(1, { status: "running", detail: msg.replace(/^[^\s]+ /, "") });
              } else if (step === 2) {
                updateStep(1, { status: "done" });
                updateStep(2, { status: "running", detail: msg.replace(/^[^\s]+ /, "") });
              } else if (step === 3) {
                updateStep(2, { status: "done" });
                updateStep(3, { status: "running", detail: msg.replace(/^[^\s]+ /, "") });
              } else if (step === 4) {
                updateStep(3, { status: "done" });
                updateStep(4, { status: "running", detail: msg.replace(/^[^\s]+ /, "") });
              }
            } else if (event.type === "thinking") {
              appendLog(`🧠 [thinking] …${String(event.text ?? "").slice(-120)}`);
            } else if (event.type === "done") {
              metadata = event.metadata as IpaMetadata;
            } else if (event.type === "error") {
              throw new Error(event.message as string);
            }
          }
        }

        if (!metadata) throw new Error("No metadata received from server.");

        // Complete all steps
        updateStep(3, { status: "done" });
        updateStep(4, { status: "done", detail: "Starter template ready" });

        const classCount = metadata.classes?.length ?? 0;
        const methodCount =
          metadata.classes?.reduce((a, c) => a + (c.methods?.length ?? 0), 0) ?? 0;
        const fwCount = metadata.frameworks?.length ?? 0;

        const statsMsg = `Found ${classCount} hookable classes with ${methodCount} methods across ${fwCount} frameworks`;
        setStats(statsMsg);
        appendLog(`✅ ${statsMsg}`);

        // Build starter code
        let startCode = `/**\n * Tinker — Dynamic Substrate Patch\n * Target: ${metadata.bundleIdentifier} (${metadata.displayName})\n * Decompiled: ${classCount} classes, ${methodCount} methods\n */\n\n#import <UIKit/UIKit.h>\n\n`;

        if (metadata.classes?.length > 0) {
          const cls = metadata.classes[0];
          startCode += `%hook ${cls.name}\n\n`;
          if (cls.methods?.length > 0) {
            const m = cls.methods[0];
            const argsSig =
              m.arguments?.length > 0
                ? m.arguments.map((a) => `(${a.type})${a.name}`).join(" ")
                : "";
            startCode += `- (${m.returnType})${m.name}${argsSig} {\n`;
            if (m.returnType === "BOOL") {
              startCode += `    NSLog(@"[Tinker] Hooked ${m.name} → forcing YES");\n    return YES;\n`;
            } else if (m.returnType === "void") {
              startCode += `    NSLog(@"[Tinker] Hooked ${m.name}");\n    %orig;\n`;
            } else {
              startCode += `    NSLog(@"[Tinker] Hooked ${m.name}");\n    return %orig;\n`;
            }
            startCode += `}\n\n`;
          }
          startCode += `%end\n`;
        }

        await wait(300);
        onDone(metadata, startCode);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        appendLog(`❌ Error: ${msg}`);
        setError(msg);

        // Mark the currently-running step as errored
        setSteps((prev) => prev.map((s) => s.status === "running" ? { ...s, status: "error", detail: msg } : s));

        // Fallback after delay
        setTimeout(() => {
          const cleanName = appName.replace(/\.ipa$/i, "");
          const fallback: IpaMetadata = {
            fileName: appName,
            fileSize: "78.4 MB",
            bundleIdentifier: `com.developer.${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            bundleName: cleanName,
            displayName: cleanName,
            minimumOSVersion: "14.0",
            sdkVersion: "17.0",
            architecture: ["arm64"],
            frameworks: ["UIKit.framework"],
            classes: [],
          };
          onDone(fallback, "// Analysis failed — ask the assistant to generate hooks manually.\n");
        }, 3000);
      }
    })();
  }, []);

  const displayName = appName.replace(/\.ipa$/i, "");

  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 40, background: "var(--st-bg)",
    }}>
      <div style={{ width: 560, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Main card */}
        <div className="st-panel" style={{ padding: 0, overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 13,
            padding: "16px 20px", borderBottom: "1px solid var(--st-line)",
            background: "var(--st-elev)",
          }}>
            <TowerGlyph size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ font: "600 15px/1.2 var(--st-font)" }}>{displayName}</div>
              <div style={{ font: "500 11px/1.3 var(--st-mono)", color: "var(--st-fg3)", marginTop: 2 }}>
                {appName}
              </div>
            </div>
            <div style={{
              font: "500 10.5px/1 var(--st-mono)", color: "var(--st-violet)",
              padding: "3px 8px", borderRadius: 6,
              background: "rgba(91,71,230,0.08)", border: "1px solid rgba(91,71,230,0.18)",
            }}>
              {settings.model.split("-").slice(1, 3).join(" ")}
              {settings.budgetTokens > 0 && ` · ${settings.budgetTokens / 1000}k`}
            </div>
            {!error && !stats && (
              <div style={{ width: 20, height: 20, position: "relative", flex: "0 0 20px" }}>
                <div style={{
                  position: "absolute", inset: 0,
                  border: "2.5px solid var(--st-violet-12)", borderTopColor: "var(--st-violet)",
                  borderRadius: "50%", animation: "tk-spin .8s linear infinite",
                }} />
              </div>
            )}
            {stats && <Ic d={I.check} style={{ color: "var(--st-green)" }} />}
            {error && <Ic d={I.x} style={{ color: "#FF8866" }} />}
          </div>

          {/* Steps */}
          <div style={{ padding: "14px 20px 18px", display: "flex", flexDirection: "column", gap: 0 }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, padding: "9px 0",
                borderTop: i > 0 ? "1px solid var(--st-line)" : "none",
                opacity: s.status === "pending" ? 0.35 : 1,
                transition: "opacity 0.3s",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flex: "0 0 20px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: 1,
                  ...(s.status === "done"
                    ? { background: "rgba(63,181,126,0.16)", color: "var(--st-green)" }
                    : s.status === "running"
                    ? { background: "var(--st-violet)", color: "#fff", boxShadow: "0 0 0 3px var(--st-violet-12)" }
                    : s.status === "error"
                    ? { background: "rgba(255,136,102,0.16)", color: "#FF8866" }
                    : { background: "rgba(20,16,40,0.06)", color: "var(--st-fg3)" }),
                }}>
                  {s.status === "done" ? <Ic d={I.check} sm /> :
                   s.status === "error" ? <Ic d={I.x} sm /> :
                   s.status === "running" ? (
                     <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "tk-pulse 1s ease-in-out infinite" }} />
                   ) : (
                     <span style={{ font: "600 9px/1 var(--st-mono)" }}>{i + 1}</span>
                   )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    font: "500 13px/1.3 var(--st-font)",
                    color: s.status === "error" ? "#FF8866" : s.status === "pending" ? "var(--st-fg3)" : "var(--st-fg)",
                  }}>
                    {s.label}
                  </div>
                  {s.detail && (
                    <div style={{
                      font: "500 11px/1.4 var(--st-mono)",
                      color: s.status === "error" ? "#FF8866" : s.status === "running" ? "var(--st-violet)" : "var(--st-fg3)",
                      marginTop: 2, wordBreak: "break-word",
                    }}>
                      {s.status === "running" && "→ "}{s.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary / error banner */}
          {stats && (
            <div style={{
              padding: "11px 20px", borderTop: "1px solid var(--st-line)",
              background: "#F0FAF4", font: "600 12px/1.3 var(--st-font)", color: "#1F8458",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Ic d={I.check} sm /> {stats}
            </div>
          )}
          {error && (
            <div style={{
              padding: "11px 20px", borderTop: "1px solid var(--st-line)",
              background: "#FFF5F3", font: "500 11.5px/1.4 var(--st-font)", color: "#CC4422",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Ic d={I.x} sm /> {error} — falling back to basic mode…
            </div>
          )}
        </div>

        {/* ── Claude Activity Log ── */}
        {logs.length > 0 && (
          <div style={{
            background: "#16121F", borderRadius: 12,
            border: "1px solid rgba(91,71,230,0.25)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "9px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span style={{ font: "500 10px/1 var(--st-mono)", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>
                CLAUDE ACTIVITY LOG
              </span>
              <div style={{ flex: 1 }} />
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: stats ? "#3FB57E" : error ? "#FF8866" : "var(--st-violet)",
                animation: !stats && !error ? "tk-pulse 1s ease-in-out infinite" : undefined,
              }} />
            </div>
            <div style={{
              padding: "10px 14px", maxHeight: 180, overflowY: "auto",
              display: "flex", flexDirection: "column", gap: 3,
            }}>
              {logs.map((line, i) => {
                let color = "rgba(255,255,255,0.5)";
                if (line.includes("✅")) color = "#3FB57E";
                else if (line.includes("❌")) color = "#FF8866";
                else if (line.includes("🧠")) color = "#9B8FFF";
                else if (line.includes("🦊") || line.includes("🐺") || line.includes("🦅")) color = "rgba(255,255,255,0.75)";
                else if (line.includes("🎯") || line.includes("🪝") || line.includes("📦")) color = "#5999D9";
                return (
                  <div key={i} style={{ font: "500 11px/1.5 var(--st-mono)", color, whiteSpace: "pre-wrap" }}>
                    {line}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
