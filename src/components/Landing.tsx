import React from "react";
import { Ic, I } from "./Icons";
import { TowerGlyph } from "./Atoms";
import { ClaudeSettings, CLAUDE_MODELS, EFFORT_LEVELS, Session } from "../types";

interface LandingProps {
  onUpload: (fileName: string, file?: File) => void;
  settings: ClaudeSettings;
  onSettingsChange: (s: ClaudeSettings) => void;
  sessions: Session[];
  onRestoreSession: (s: Session) => void;
  onDeleteSession: (id: string) => void;
}

export const Landing: React.FC<LandingProps> = ({
  onUpload, settings, onSettingsChange,
  sessions, onRestoreSession, onDeleteSession,
}) => {
  const [dragActive, setDragActive] = React.useState(false);
  const [typedName, setTypedName] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const steps = [
    { icon: I.upload, t: "Drop in an app", d: "A decrypted .ipa you own" },
    { icon: I.wand, t: "Describe the change", d: "Plain English, no code" },
    { icon: I.download, t: "Install your copy", d: "Sideload the tweaked IPA" },
  ];

  const activeModel = CLAUDE_MODELS.find((m) => m.id === settings.model) ?? CLAUDE_MODELS[1];
  const supportsThinking = activeModel.supportsThinking;

  const setModel = (id: string) => {
    const m = CLAUDE_MODELS.find((m) => m.id === id);
    // Reset thinking if new model doesn't support it
    const budget = m?.supportsThinking ? settings.budgetTokens : 0;
    onSettingsChange({ ...settings, model: id, budgetTokens: budget });
  };

  const setBudget = (b: number) => onSettingsChange({ ...settings, budgetTokens: b });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      onUpload(file.name.endsWith(".ipa") ? file.name : `${file.name}.ipa`, file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      onUpload(file.name.endsWith(".ipa") ? file.name : `${file.name}.ipa`, file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedName.trim()) return;
    onUpload(typedName.trim().endsWith(".ipa") ? typedName.trim() : `${typedName.trim()}.ipa`);
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 40, background: "radial-gradient(120% 90% at 50% -10%, #F4F0E9, var(--st-bg))",
      overflowY: "auto",
    }}>
      <div style={{ width: "100%", maxWidth: 580, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, marginTop: -20 }}>

        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <div className="st-mark" style={{ width: 52, height: 52, borderRadius: 15 }} />
          <div>
            <div style={{ font: "700 30px/1.15 var(--st-font)", letterSpacing: "-0.025em" }}>Tinker</div>
            <div style={{ font: "500 15px/1.4 var(--st-font)", color: "var(--st-fg2)", marginTop: 6 }}>
              Browser extensions, but for your iPhone apps.
            </div>
          </div>
        </div>

        {/* Upload zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            cursor: "pointer", width: "100%",
            border: `2px dashed ${dragActive ? "var(--st-violet)" : "var(--st-line2)"}`,
            borderRadius: 18, background: "var(--st-panel)",
            padding: "34px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            boxShadow: "var(--sh-soft)", transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--st-violet)")}
          onMouseLeave={(e) => { if (!dragActive) e.currentTarget.style.borderColor = "var(--st-line2)"; }}
        >
          <input ref={fileRef} type="file" accept=".ipa" onChange={handleFileSelect} style={{ display: "none" }} />
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: "var(--st-violet-08)", color: "var(--st-violet)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ic d={I.upload} lg />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ font: "600 16px/1.3 var(--st-font)" }}>Drop an app here to start</div>
            <div style={{ font: "400 13px/1.4 var(--st-font)", color: "var(--st-fg3)", marginTop: 4 }}>
              or <span style={{ color: "var(--st-violet)", fontWeight: 600 }}>choose a .ipa file</span> · stays on your machine
            </div>
          </div>
        </div>

        {/* Manual name entry */}
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, width: "100%" }}>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Or type an app name (e.g. Spotify)"
            style={{
              flex: 1, height: 38, padding: "0 14px", borderRadius: 10,
              border: "1px solid var(--st-line)", background: "rgba(255,255,255,0.5)",
              font: "500 13px/1 var(--st-font)", color: "var(--st-fg)", outline: "none",
            }}
          />
          <button type="submit" className="st-btn primary big" disabled={!typedName.trim()}>
            <Ic d={I.wand} sm />
            Analyze
          </button>
        </form>

        {/* ── Claude Settings Panel ── */}
        <div style={{
          width: "100%", borderRadius: 14,
          border: "1px solid var(--st-line)", background: "var(--st-panel)",
          boxShadow: "var(--sh-soft)", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "11px 16px", borderBottom: "1px solid var(--st-line)",
            background: "var(--st-elev)",
          }}>
            <span style={{ font: "500 11px/1 var(--st-mono)", color: "var(--st-violet)" }}>🤖</span>
            <span style={{ font: "600 12px/1 var(--st-font)" }}>Claude Settings</span>
            <div style={{ flex: 1 }} />
            <span style={{
              font: "500 10.5px/1 var(--st-mono)",
              color: "var(--st-fg3)",
              padding: "2px 7px", borderRadius: 5,
              background: "rgba(91,71,230,0.08)",
            }}>
              {activeModel.label}
              {settings.budgetTokens > 0 && ` · ${settings.budgetTokens.toLocaleString()} thinking tokens`}
            </span>
          </div>

          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Model selector */}
            <div>
              <div style={{ font: "600 11px/1 var(--st-font)", color: "var(--st-fg2)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Model
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                {CLAUDE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    style={{
                      flex: 1, padding: "9px 10px", borderRadius: 9, cursor: "pointer",
                      border: settings.model === m.id
                        ? "1.5px solid var(--st-violet)"
                        : "1px solid var(--st-line)",
                      background: settings.model === m.id
                        ? "rgba(91,71,230,0.08)"
                        : "rgba(255,255,255,0.4)",
                      display: "flex", flexDirection: "column", gap: 3,
                      transition: "all 0.12s",
                      textAlign: "left",
                    }}
                  >
                    <div style={{
                      font: "600 12px/1.2 var(--st-font)",
                      color: settings.model === m.id ? "var(--st-violet)" : "var(--st-fg)",
                    }}>
                      {m.label}
                    </div>
                    <div style={{ font: "400 10.5px/1.3 var(--st-font)", color: "var(--st-fg3)" }}>
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Effort / thinking budget */}
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                font: "600 11px/1 var(--st-font)", color: "var(--st-fg2)",
                marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                Effort
                {!supportsThinking && (
                  <span style={{ font: "400 10px/1 var(--st-font)", color: "var(--st-fg3)", textTransform: "none", letterSpacing: 0 }}>
                    (Haiku doesn't support extended thinking)
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                {EFFORT_LEVELS.map((e) => {
                  const disabled = !supportsThinking && e.budgetTokens > 0;
                  const selected = settings.budgetTokens === e.budgetTokens;
                  return (
                    <button
                      key={e.budgetTokens}
                      onClick={() => { if (!disabled) setBudget(e.budgetTokens); }}
                      disabled={disabled}
                      style={{
                        flex: 1, padding: "9px 10px", borderRadius: 9,
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.4 : 1,
                        border: selected
                          ? "1.5px solid var(--st-violet)"
                          : "1px solid var(--st-line)",
                        background: selected
                          ? "rgba(91,71,230,0.08)"
                          : "rgba(255,255,255,0.4)",
                        display: "flex", flexDirection: "column", gap: 3,
                        transition: "all 0.12s",
                        textAlign: "left",
                      }}
                    >
                      <div style={{
                        font: "600 12px/1.2 var(--st-font)",
                        color: selected ? "var(--st-violet)" : "var(--st-fg)",
                      }}>
                        {e.budgetTokens === 0 ? "⚡ " : e.budgetTokens === 8000 ? "🧠 " : "🐉 "}{e.label}
                      </div>
                      <div style={{ font: "400 10.5px/1.3 var(--st-font)", color: "var(--st-fg3)" }}>
                        {e.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              flex: 1, display: "flex", flexDirection: "column", gap: 7, padding: "12px 13px",
              borderRadius: 12, background: "rgba(255,255,255,0.5)", border: "1px solid var(--st-line)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--st-fg3)" }}>
                <span style={{ font: "600 10px/1 var(--st-mono)" }}>{i + 1}</span>
                <Ic d={s.icon} sm />
              </div>
              <div style={{ font: "600 12.5px/1.2 var(--st-font)" }}>{s.t}</div>
              <div style={{ font: "400 11px/1.35 var(--st-font)", color: "var(--st-fg3)" }}>{s.d}</div>
            </div>
          ))}
        </div>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div style={{ width: "100%", borderRadius: 14, border: "1px solid var(--st-line)", background: "var(--st-panel)", boxShadow: "var(--sh-soft)", overflow: "hidden" }}>
            <div style={{
              padding: "11px 16px", borderBottom: "1px solid var(--st-line)",
              background: "var(--st-elev)", font: "600 12px/1 var(--st-font)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>🕐</span> Recent sessions
              <span style={{ font: "400 11px/1 var(--st-font)", color: "var(--st-fg3)", marginLeft: "auto" }}>
                {sessions.length} saved
              </span>
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {sessions.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 16px",
                    borderTop: i > 0 ? "1px solid var(--st-line)" : "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  {/* App icon placeholder */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flex: "0 0 36px",
                    background: "var(--st-violet-08)", border: "1px solid rgba(91,71,230,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    font: "700 14px/1 var(--st-font)", color: "var(--st-violet)",
                  }}>
                    {s.displayName[0]?.toUpperCase() ?? "?"}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => onRestoreSession(s)}>
                    <div style={{ font: "600 13px/1.2 var(--st-font)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.displayName}
                    </div>
                    <div style={{ font: "400 11px/1.3 var(--st-mono)", color: "var(--st-fg3)", marginTop: 2 }}>
                      {s.chatHistory.length} messages · {new Date(s.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
                    style={{
                      all: "unset", cursor: "pointer", padding: 4, borderRadius: 6,
                      color: "var(--st-fg3)", opacity: 0.5,
                      transition: "opacity 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
                    title="Delete session"
                  >
                    <Ic d={I.x} sm />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy note */}
        <div style={{
          font: "400 11.5px/1.4 var(--st-font)", color: "var(--st-fg3)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Ic d={I.shield} sm style={{ color: "var(--st-green)" }} />
          Only works on apps you own and have decrypted.
        </div>
      </div>
    </div>
  );
};
