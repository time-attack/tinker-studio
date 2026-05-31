import React from "react";
import { Ic, I } from "./Icons";
import { Pill, TowerGlyph, Btn } from "./Atoms";
import { IpaMetadata } from "../types";

interface RightPanelProps {
  tab: string;
  onTab: (tab: string) => void;
  metadata: IpaMetadata | null;
  adsRemoved?: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({ tab, onTab, metadata, adsRemoved = false }) => (
  <div className="st-preview" style={{ flex: "0 0 376px" }}>
    {/* Segmented tabs */}
    <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(20,16,40,0.05)", borderRadius: 9 }}>
      {([["preview", "Live preview", I.eye], ["inside", "Under the hood", I.cpu]] as const).map(([id, label, ic]) => (
        <button
          key={id}
          onClick={() => onTab(id)}
          style={{
            all: "unset", flex: 1, textAlign: "center", cursor: "pointer",
            padding: "7px 8px", borderRadius: 7, font: "600 12px/1 var(--st-font)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: tab === id ? "var(--st-panel)" : "transparent",
            color: tab === id ? "var(--st-fg)" : "var(--st-fg3)",
            boxShadow: tab === id ? "var(--sh-soft)" : "none",
          }}
        >
          <Ic d={ic} sm />
          {label}
        </button>
      ))}
    </div>

    {tab === "preview" ? (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{
          font: "500 11px/1 var(--st-mono)",
          color: adsRemoved ? "var(--st-green)" : "var(--st-fg3)",
          alignSelf: "center",
        }}>
          {adsRemoved ? "● ad-free copy" : "original · with ads"}
        </div>
        <PhoneMock ads={!adsRemoved} />
      </div>
    ) : (
      <InsideView metadata={metadata} />
    )}
  </div>
);

// ───────── Phone mockup ─────────
const PhoneMock: React.FC<{ ads?: boolean }> = ({ ads = true }) => {
  const blocks = [
    { w: 84, c: "#5B47E6", x: 0 }, { w: 80, c: "#7B61FF", x: -6 }, { w: 84, c: "#FF8866", x: 4 },
    { w: 76, c: "#E8A23F", x: -10 }, { w: 82, c: "#3FB57E", x: 8 }, { w: 70, c: "#5999D9", x: -4 },
  ];

  return (
    <div className="st-phone-frame" style={{ transform: "scale(0.82)", transformOrigin: "top center" }}>
      <div className="notch" />
      <div className="st-phone-screen" style={{
        background: "linear-gradient(180deg,#1A1530,#0E0B1C)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Status bar */}
        <div style={{
          padding: "20px 18px 0", display: "flex", justifyContent: "space-between",
          font: "600 13px/1 -apple-system", color: "#fff",
        }}>
          <span>9:41</span>
          <span style={{ display: "flex", gap: 5, alignItems: "center", opacity: 0.9 }}>
            <span style={{ width: 16, height: 9, border: "1px solid #fff", borderRadius: 2, opacity: 0.7 }} />
          </span>
        </div>
        {/* Score */}
        <div style={{ textAlign: "center", marginTop: 10, color: "#fff" }}>
          <div style={{ font: "800 40px/1 -apple-system", letterSpacing: "-0.02em" }}>42</div>
          <div style={{ font: "600 10px/1 -apple-system", letterSpacing: "0.14em", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>BEST 88</div>
        </div>
        {/* Tower */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "flex-end", paddingBottom: ads ? 6 : 30, gap: 3,
        }}>
          {blocks.map((b, i) => (
            <div key={i} style={{
              width: b.w, height: 20, borderRadius: 4, background: b.c,
              transform: `translateX(${b.x}px)`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.3)",
            }} />
          ))}
          <div style={{ font: "600 10px/1 -apple-system", color: "rgba(255,255,255,0.45)", marginTop: 12, letterSpacing: "0.1em" }}>
            TAP TO DROP
          </div>
        </div>
        {/* Banner ad */}
        {ads && (
          <div style={{
            height: 56, background: "#fff", display: "flex", alignItems: "center", gap: 8,
            padding: "0 10px", borderTop: "2px solid #FFD23F",
          }}>
            <div style={{
              position: "absolute", marginTop: -44, marginLeft: -2,
              font: "700 7px/1 -apple-system", background: "#FFD23F", color: "#5a4500",
              padding: "2px 4px", borderRadius: 3, letterSpacing: "0.06em",
            }}>AD</div>
            <div style={{ width: 36, height: 36, borderRadius: 7, background: "linear-gradient(135deg,#FF4E50,#F9D423)", flex: "0 0 36px" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "700 11px/1.1 -apple-system", color: "#111" }}>Raid Heroes: Tap Now!</div>
              <div style={{ font: "400 9.5px/1.2 -apple-system", color: "#888", marginTop: 2 }}>Install · Free · ★ 4.2</div>
            </div>
            <div style={{ font: "700 10px/1 -apple-system", color: "#fff", background: "#2BB24C", padding: "6px 12px", borderRadius: 14 }}>GET</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ───────── Under the hood view ─────────
const InsideSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ font: "600 10px/1 var(--st-font)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--st-fg3)" }}>
      {title}
    </div>
    {children}
  </div>
);

const InsideView: React.FC<{ metadata: IpaMetadata | null }> = ({ metadata }) => {
  if (!metadata) return null;

  return (
    <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 2 }}>
      {/* Info banner */}
      <div style={{
        display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 11px", borderRadius: 9,
        background: "var(--st-violet-08)", font: "400 11.5px/1.4 var(--st-font)", color: "var(--st-fg2)",
      }}>
        <Ic d={I.cpu} sm style={{ color: "var(--st-violet)", flex: "0 0 16px", marginTop: 1 }} />
        The nerdy view of what's inside {metadata.displayName}. You never have to read it — the assistant does.
      </div>

      {/* Frameworks */}
      <InsideSection title="Frameworks">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {metadata.frameworks.map(f => (
            <span key={f} style={{
              font: "500 10.5px/1 var(--st-mono)", padding: "4px 8px", borderRadius: 5,
              background: "var(--st-elev)", border: "1px solid var(--st-line)", color: "var(--st-fg2)",
            }}>{f}</span>
          ))}
        </div>
      </InsideSection>

      {/* Classes */}
      <InsideSection title="Suspicious classes">
        <div style={{ border: "1px solid var(--st-line)", borderRadius: 10, overflow: "hidden" }}>
          {metadata.classes.slice(0, 6).map((c, i) => (
            <div key={c.name} style={{
              padding: "8px 11px", borderTop: i ? "1px solid var(--st-line)" : "none",
              background: i % 2 ? "var(--st-elev)" : "transparent",
            }}>
              <code style={{ font: "600 11.5px/1.2 var(--st-mono)", color: "var(--st-violet)" }}>{c.name}</code>
              <div style={{ font: "400 11px/1.3 var(--st-font)", color: "var(--st-fg3)", marginTop: 2 }}>
                extends {c.superClass} · {c.methods.length} methods · {c.properties.length} properties
              </div>
            </div>
          ))}
        </div>
      </InsideSection>

      {/* App info */}
      <InsideSection title="App info">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Pill>{metadata.bundleIdentifier}</Pill>
          <Pill>iOS {metadata.minimumOSVersion}+</Pill>
          <Pill>{metadata.architecture.join(", ")}</Pill>
          <Pill>{metadata.fileSize}</Pill>
        </div>
      </InsideSection>
    </div>
  );
};
