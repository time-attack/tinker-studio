import React from "react";
import { ChatMessage, ClaudeSettings, DEFAULT_CLAUDE_SETTINGS, IpaMetadata, Session } from "./types";
import { Landing } from "./components/Landing";
import { Analyzing } from "./components/Analyzing";
import { Rail } from "./components/Rail";
import { ChatStage } from "./components/ChatStage";
import { RightPanel } from "./components/RightPanel";

type Stage = "landing" | "analyzing" | "studio";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [stage, setStage] = React.useState<Stage>("landing");
  const [view, setView] = React.useState("chat");
  const [rightTab, setRightTab] = React.useState("inside");

  const [activeIpa, setActiveIpa] = React.useState<IpaMetadata | null>(null);
  const [pendingFileName, setPendingFileName] = React.useState("");
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);

  const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = React.useState(false);
  const [claudeLogs, setClaudeLogs] = React.useState<string[]>([]);

  const [tweakCode, setTweakCode] = React.useState("");
  const [tweakLanguage] = React.useState<"logos" | "swift">("logos");

  const [isCompiling, setIsCompiling] = React.useState(false);
  const [compileLogs, setCompileLogs] = React.useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const [dylibUrl, setDylibUrl] = React.useState<string | null>(null);

  const [claudeSettings, setClaudeSettings] = React.useState<ClaudeSettings>(DEFAULT_CLAUDE_SETTINGS);

  // ── Session persistence ──
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load sessions on mount
  React.useEffect(() => {
    fetch("/api/sessions")
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {});
  }, []);

  // Debounced session save
  const saveSession = React.useCallback((
    id: string,
    ipa: IpaMetadata,
    history: ChatMessage[],
    code: string,
    settings: ClaudeSettings,
  ) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const session: Session = {
        id,
        displayName: ipa.displayName,
        bundleId: ipa.bundleIdentifier,
        fileName: ipa.fileName,
        createdAt: parseInt(id.split("-")[0]) || Date.now(),
        updatedAt: Date.now(),
        metadata: ipa,
        tweakCode: code,
        chatHistory: history,
        settings,
      };
      try {
        await fetch(`/api/sessions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session),
        });
        setSessions(prev => {
          const without = prev.filter(s => s.id !== id);
          return [session, ...without].sort((a, b) => b.updatedAt - a.updatedAt);
        });
      } catch { /* non-fatal */ }
    }, 800);
  }, []);

  // Auto-save whenever studio state changes
  React.useEffect(() => {
    if (stage === "studio" && activeIpa && sessionId) {
      saveSession(sessionId, activeIpa, chatHistory, tweakCode, claudeSettings);
    }
  }, [chatHistory, tweakCode, stage]);

  // ── Upload → analyzing ──
  const handleUpload = (fileName: string, file?: File) => {
    setPendingFileName(fileName);
    setPendingFile(file ?? null);
    setStage("analyzing");
  };

  const handleAnalyzeDone = (metadata: IpaMetadata, starterCode: string) => {
    const id = makeId();
    setSessionId(id);
    setActiveIpa(metadata);
    setTweakCode(starterCode);
    setChatHistory([]);
    setClaudeLogs([]);
    setDownloadUrl(null);
    setDylibUrl(null);
    setCompileLogs([]);
    setStage("studio");
    // Save initial session
    saveSession(id, metadata, [], starterCode, claudeSettings);
  };

  // ── Restore session ──
  const handleRestoreSession = (s: Session) => {
    setSessionId(s.id);
    setActiveIpa(s.metadata);
    setTweakCode(s.tweakCode);
    setChatHistory(s.chatHistory);
    setClaudeSettings(s.settings);
    setClaudeLogs([]);
    setCompileLogs([]);
    setDownloadUrl(null);
    setDylibUrl(null);
    setStage("studio");
  };

  const handleDeleteSession = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  // ── Chat via SSE streaming ──
  const handleSendMessage = async (userMsgText: string) => {
    if (!userMsgText.trim() || isChatLoading || !activeIpa) return;

    const userMsgObj: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatHistory(prev => [...prev, userMsgObj]);
    setIsChatLoading(true);
    setClaudeLogs([]);

    const appendLog = (msg: string) => setClaudeLogs(prev => [...prev, msg]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          chatHistory: chatHistory.concat(userMsgObj),
          ipaMetadata: activeIpa,
          tweakCode,
          tweakLanguage,
          model: claudeSettings.model,
          budgetTokens: claudeSettings.budgetTokens,
        }),
      });

      if (!response.ok || !response.body) throw new Error(`Server error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalPayload: Record<string, unknown> | null = null;

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
          if (event.type === "log") appendLog(event.message as string);
          else if (event.type === "thinking") appendLog(`🧠 [thinking] …${String(event.text ?? "").slice(-150)}`);
          else if (event.type === "done") finalPayload = event;
          else if (event.type === "error") throw new Error(event.message as string);
        }
      }

      if (finalPayload) {
        const newCode = (finalPayload.tweakCode as string) || tweakCode;
        if (finalPayload.tweakCode) setTweakCode(newCode);

        const meta = finalPayload.meta as Record<string, unknown> | undefined;
        appendLog(meta
          ? `✅ Done — ${meta.model} · ${meta.outputTokens} out tokens · ${meta.elapsed}s`
          : "✅ Done");

        const assistantMsg: ChatMessage = {
          id: Math.random().toString(),
          role: "assistant",
          content: (finalPayload.explanation as string) || "Tweak code has been updated.",
          timestamp: new Date().toLocaleTimeString(),
          commandRun: finalPayload.commandRun as ChatMessage["commandRun"],
        };
        setChatHistory(prev => [...prev, assistantMsg]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      appendLog(`❌ Error: ${msg}`);
      setChatHistory(prev => [...prev, {
        id: Math.random().toString(),
        role: "assistant",
        content: `Failed to reach the API: ${msg}`,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ── Compile ──
  const handleCompile = async () => {
    if (isCompiling || !tweakCode.trim() || !activeIpa) return;
    setIsCompiling(true);
    setCompileLogs(["[+] Packaging tweak project…"]);
    setDownloadUrl(null);
    setDylibUrl(null);

    try {
      const response = await fetch("/api/compile-tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweakCode,
          tweakLanguage,
          appName: activeIpa.bundleName || "CustomApp",
          bundleId: activeIpa.bundleIdentifier,
        }),
      });
      const data = await response.json();
      setCompileLogs(data.logs || []);
      if (data.success) {
        setDownloadUrl(data.downloadUrl);
        setDylibUrl(data.dylibUrl ?? null);
      }
    } catch {
      setCompileLogs(prev => [...prev, "[ERROR] Compilation server timed out."]);
    } finally {
      setIsCompiling(false);
    }
  };

  // ── Navigation ──
  const handleNav = (id: string) => {
    if (id === "apps") {
      setStage("landing");
      setView("chat");
      setActiveIpa(null);
      setTweakCode("");
      setChatHistory([]);
      setClaudeLogs([]);
      setCompileLogs([]);
      setDownloadUrl(null);
    setDylibUrl(null);
      setSessionId(null);
    } else if (id === "chat" || id === "appcurrent") {
      setView("chat");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#D9D3C8" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", background: "#D9D3C8" }}>
        <div className="st-root" style={{ flex: 1, minWidth: 0, display: "flex", background: "var(--st-bg)" }}>
          {stage === "landing" && (
            <Landing
              onUpload={handleUpload}
              settings={claudeSettings}
              onSettingsChange={setClaudeSettings}
              sessions={sessions}
              onRestoreSession={handleRestoreSession}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {stage === "analyzing" && (
            <Analyzing
              appName={pendingFileName}
              file={pendingFile ?? undefined}
              settings={claudeSettings}
              onDone={handleAnalyzeDone}
            />
          )}

          {stage === "studio" && activeIpa && (
            <>
              <Rail view={view} onNav={handleNav} appName={activeIpa.fileName} />
              <div className="st-main">
                <ChatStage
                  chatHistory={chatHistory}
                  onSendMessage={handleSendMessage}
                  isChatLoading={isChatLoading}
                  activeIpa={activeIpa}
                  tweakCode={tweakCode}
                  onCompile={handleCompile}
                  isCompiling={isCompiling}
                  compileLogs={compileLogs}
                  downloadUrl={downloadUrl}
                  dylibUrl={dylibUrl}
                  claudeLogs={claudeLogs}
                  settings={claudeSettings}
                />
                <RightPanel tab={rightTab} onTab={setRightTab} metadata={activeIpa} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
