import React from "react";
import { Ic, I } from "./Icons";
import { TowerGlyph } from "./Atoms";

interface RailProps {
  view: string;
  onNav: (id: string) => void;
  appName: string;
}

export const Rail: React.FC<RailProps> = ({ view, onNav, appName }) => {
  const items = [
    { id: "chat", label: "New extension", icon: I.wand },
    { id: "apps", label: "All apps", icon: I.app },
  ];

  const displayName = appName.replace(/\.ipa$/i, "");

  return (
    <div className="st-rail">
      {/* Brand header */}
      <div className="st-rail-head" onClick={() => onNav("apps")}>
        <div className="st-mark" />
        <div>
          <div className="st-mark-text">Tinker</div>
          <div className="st-mark-sub">no-code app extensions</div>
        </div>
      </div>

      {/* Search */}
      <div className="st-search">
        <Ic d={I.search} sm />
        Search
        <span className="st-kbd">⌘K</span>
      </div>

      {/* Nav items */}
      {items.map(it => (
        <div
          key={it.id}
          className={`st-rail-item${view === it.id ? " active" : ""}`}
          onClick={() => onNav(it.id)}
        >
          <Ic d={it.icon} />
          {it.label}
        </div>
      ))}

      {/* Current app section */}
      <div className="st-rail-section">This app</div>
      <div
        className={`st-rail-item${view === "chat" ? " active" : ""}`}
        onClick={() => onNav("appcurrent")}
      >
        <TowerGlyph size={18} />
        <span style={{ fontSize: 13 }}>{displayName}</span>
      </div>

      {/* Footer */}
      <div className="st-rail-foot">
        <div className="st-rail-dot" />
        <div>
          <div style={{ font: "600 12px/1.2 var(--st-font)", color: "#fff" }}>Free certificate</div>
          <div style={{ font: "500 10.5px/1.2 var(--st-mono)", color: "var(--st-rail-fg2)" }}>
            signed · 6 days left
          </div>
        </div>
      </div>
    </div>
  );
};
