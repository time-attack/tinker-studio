import React from "react";
import { Ic, I } from "./Icons";
import { Btn, Mono, Pill } from "./Atoms";
import { Composer } from "./Composer";
import { ChatMessage, ClaudeSettings, IpaMetadata } from "../types";

interface ChatStageProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isChatLoading: boolean;
  activeIpa: IpaMetadata;
  tweakCode: string;
  onCompile: () => void;
  isCompiling: boolean;
  compileLogs: string[];
  downloadUrl: string | null;
  dylibUrl?: string | null;
  claudeLogs: string[];
  settings: ClaudeSettings;
}

export const ChatStage: React.FC<ChatStageProps> = ({
  chatHistory, onSendMessage, isChatLoading, activeIpa,
  tweakCode, onCompile, isCompiling, compileLogs, downloadUrl, dylibUrl,
  claudeLogs, settings,
}) => {
  const [draft, setDraft] = React.useState("");
  const threadRef = React.useRef<HTMLDivElement>(null);
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  const [codeExpanded, setCodeExpanded] = React.useState(false);
  const [logsExpanded, setLogsExpanded] = React.useState(true);

  // Auto-scroll thread
  React.useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatHistory, isChatLoading]);

  // Auto-scroll logs
  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [claudeLogs]);

  const send = (text: string) => {
    const v = (text || "").trim();
    if (!v) return;
    setDraft("");
    onSendMessage(v);
  };

  const hasMessages = chatHistory.length > 0;

  const modelShort = settings.model.split("-").slice(1, 3).join(" ");
  const effortLabel = settings.budgetTokens > 0
    ? `${settings.budgetTokens.toLocaleString()} thinking tokens`
    : "standard";

  return (
    <div className="st-stage">
      {/* Breadcrumb */}
      <div className="st-stage-head">
        <div className="st-crumb">
          <b>{activeIpa.displayName}</b>
          <span style={{ color: "var(--st-fg3)" }}> · {activeIpa.bundleIdentifier}</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Model badge */}
        <div style={{
          font: "500 10.5px/1 var(--st-mono)", color: "var(--st-violet)",
          padding: "3px 8px", borderRadius: 6,
          background: "rgba(91,71,230,0.08)", border: "1px solid rgba(91,71,230,0.18)",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          🤖 {modelShort} · {effortLabel}
        </div>
        {tweakCode && (
          <Btn icon={I.code} onClick={() => setCodeExpanded((e) => !e)}>
            {codeExpanded ? "Hide code" : "View code"}
          </Btn>
        )}
        {tweakCode && (
          <Btn
            kind="primary"
            icon={isCompiling ? I.refresh : I.bolt}
            onClick={onCompile}
            disabled={isCompiling || !tweakCode.trim()}
          >
            {isCompiling ? "Compiling…" : "Compile & Inject"}
          </Btn>
        )}
      </div>

      {/* Code panel */}
      {codeExpanded && tweakCode && (
        <div style={{
          background: "#16121F", borderRadius: 10, padding: "14px 16px",
          marginBottom: 12, maxHeight: 280, overflow: "auto",
          border: "1px solid rgba(91,71,230,0.3)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <Pill tone="#9491A1">Tweak.x — Logos</Pill>
            <button
              onClick={() => navigator.clipboard.writeText(tweakCode)}
              style={{
                all: "unset", cursor: "pointer",
                font: "500 10.5px/1 var(--st-mono)", color: "rgba(255,255,255,0.5)",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <Ic d={I.copy} sm /> Copy
            </button>
          </div>
          <pre style={{ margin: 0, font: "500 12px/1.7 var(--st-mono)", whiteSpace: "pre-wrap", color: "#cfc9e0" }}>
            {tweakCode}
          </pre>
        </div>
      )}

      {/* Compile logs */}
      {compileLogs.length > 0 && (
        <div style={{
          background: "#16121F", borderRadius: 10, padding: "10px 14px",
          marginBottom: 12, maxHeight: 160, overflow: "auto",
          border: "1px solid var(--st-line)",
        }}>
          <div style={{
            font: "600 10px/1 var(--st-font)", letterSpacing: "0.08em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8,
          }}>
            Theos Compiler Output
          </div>
          {compileLogs.map((line, i) => {
            let color = "rgba(255,255,255,0.5)";
            if (line.includes("[+]")) color = "#7B61FF";
            else if (line.includes("[*]")) color = "#5999D9";
            else if (line.includes("[SUCCESS]")) color = "#3FB57E";
            else if (line.includes("[ERROR]")) color = "#FF8866";
            else if (line.includes("[!]")) color = "#E8A23F";
            return (
              <div key={i} style={{ font: "500 11px/1.5 var(--st-mono)", whiteSpace: "pre-wrap", color }}>
                {line}
              </div>
            );
          })}
          {(downloadUrl || dylibUrl) && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {downloadUrl && (
                <a href={downloadUrl} download className="st-btn primary" style={{ textDecoration: "none" }}>
                  <Ic d={I.download} sm /> Download .deb
                </a>
              )}
              {dylibUrl && (
                <a href={dylibUrl} download className="st-btn" style={{ textDecoration: "none" }}>
                  <Ic d={I.download} sm /> Download .dylib
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Claude Activity Log — shown during and after loading */}
      {claudeLogs.length > 0 && (
        <div style={{
          background: "#16121F", borderRadius: 10, marginBottom: 12,
          border: "1px solid rgba(91,71,230,0.25)", overflow: "hidden",
        }}>
          <button
            onClick={() => setLogsExpanded((e) => !e)}
            style={{
              all: "unset", cursor: "pointer", width: "100%",
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 13px",
              borderBottom: logsExpanded ? "1px solid rgba(255,255,255,0.07)" : "none",
            }}
          >
            <span style={{ font: "500 10px/1 var(--st-mono)", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>
              CLAUDE ACTIVITY LOG
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ font: "500 10px/1 var(--st-mono)", color: "rgba(255,255,255,0.3)" }}>
              {claudeLogs.length} lines · {logsExpanded ? "collapse ▲" : "expand ▼"}
            </span>
            {isChatLoading && (
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--st-violet)",
                animation: "tk-pulse 1s ease-in-out infinite",
              }} />
            )}
          </button>
          {logsExpanded && (
            <div style={{
              padding: "9px 13px", maxHeight: 200, overflowY: "auto",
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              {claudeLogs.map((line, i) => {
                let color = "rgba(255,255,255,0.45)";
                if (line.includes("✅")) color = "#3FB57E";
                else if (line.includes("❌") || line.includes("Error")) color = "#FF8866";
                else if (line.includes("🧠") || line.includes("[thinking]")) color = "#9B8FFF";
                else if (line.includes("🦊") || line.includes("🐺") || line.includes("🦅") || line.includes("🐉")) color = "rgba(255,255,255,0.7)";
                else if (line.includes("📊") || line.includes("🎯") || line.includes("🪝")) color = "#5999D9";
                else if (line.includes("⚠️")) color = "#E8A23F";
                return (
                  <div key={i} style={{ font: "500 10.5px/1.5 var(--st-mono)", color, whiteSpace: "pre-wrap" }}>
                    {line}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Thread */}
      <div className="st-thread" ref={threadRef} style={{ flex: 1, overflow: "auto" }}>
        {!hasMessages && (
          <AiRow>
            <AiBubble>
              <strong>{activeIpa.displayName}</strong> is fully mapped — I decompiled{" "}
              <Mono>{activeIpa.classes.length} classes</Mono> across{" "}
              {activeIpa.frameworks.length} frameworks ({activeIpa.architecture.join(", ")}).
              <br /><br />
              Tell me what you want to change. I'll generate real Logos hooks targeting the actual classes I found.
            </AiBubble>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 700 }}>
              {activeIpa.classes.slice(0, 8).map((c) => (
                <span key={c.name} className="st-chip ghost" style={{ cursor: "default" }}>
                  <Ic d={I.code} sm />
                  {c.name}
                </span>
              ))}
            </div>
          </AiRow>
        )}

        {chatHistory.map((msg) =>
          msg.role === "user" ? (
            <UserBubble key={msg.id}>{msg.content}</UserBubble>
          ) : (
            <AiRow key={msg.id}>
              <AiBubble>{msg.content}</AiBubble>
              {msg.commandRun?.command && (
                <div className="st-card" style={{ maxWidth: 720 }}>
                  <div className="st-card-head">
                    <Ic d={I.cpu} sm />
                    Binary Analysis
                    <span className="right">terminal output</span>
                  </div>
                  <div style={{ background: "#16121F", padding: "12px 14px", overflow: "auto", maxHeight: 200 }}>
                    <div style={{ font: "500 11px/1 var(--st-mono)", color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                      $ {msg.commandRun.command}
                    </div>
                    <pre style={{ margin: 0, font: "500 11px/1.6 var(--st-mono)", whiteSpace: "pre-wrap", color: "#cfc9e0" }}>
                      {msg.commandRun.output}
                    </pre>
                  </div>
                </div>
              )}
            </AiRow>
          ),
        )}

        {isChatLoading && (
          <AiRow>
            <div style={{
              display: "flex", alignItems: "center", gap: 9, padding: "7px 12px",
              borderRadius: 999, background: "var(--st-violet-08)", width: "fit-content",
              font: "600 12px/1 var(--st-font)", color: "var(--st-violet)",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", background: "var(--st-violet)",
                animation: "tk-pulse 1s ease-in-out infinite",
              }} />
              {settings.budgetTokens > 0 ? "Thinking & generating patches…" : "Analyzing binary & generating patches…"}
            </div>
          </AiRow>
        )}
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        onSend={() => send(draft)}
        locked={isChatLoading}
        ctaLabel={hasMessages ? "Send" : "Ask"}
        placeholder={`Describe what to change in ${activeIpa.displayName}…`}
      />
    </div>
  );
};

const UserBubble: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="st-msg user">
    <div className="st-msg-bubble">{children}</div>
  </div>
);

const AiRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="st-msg ai">
    <div className="st-avatar" />
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, maxWidth: 700 }}>
      {children}
    </div>
  </div>
);

const AiBubble: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="st-msg-bubble">{children}</div>
);
