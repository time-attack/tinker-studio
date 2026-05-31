import React from "react";
import { Ic } from "./Icons";

// ───────── Buttons ─────────
interface BtnProps {
  kind?: "ghost" | "primary";
  icon?: string;
  children?: React.ReactNode;
  big?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const Btn: React.FC<BtnProps> = ({
  kind = "ghost", icon, children, big, onClick, style, disabled,
}) => (
  <button
    className={`st-btn ${kind}${big ? " big" : ""}${icon && !children ? " icon" : ""}`}
    onClick={onClick}
    disabled={disabled}
    style={{ ...style }}
  >
    {icon && <Ic d={icon} sm />}
    {children}
  </button>
);

// ───────── Pill ─────────
interface PillProps {
  children: React.ReactNode;
  tone?: string;
}

export const Pill: React.FC<PillProps> = ({ children, tone }) => (
  <span
    className="st-meta-pill"
    style={tone ? { background: `${tone}1A`, color: tone } : undefined}
  >
    {children}
  </span>
);

// ───────── Mono inline code ─────────
export const Mono: React.FC<{ children: React.ReactNode; tone?: string }> = ({
  children,
  tone = "var(--st-violet)",
}) => (
  <code
    style={{
      font: "500 12.5px/1 var(--st-mono)",
      background: "var(--st-violet-08)",
      padding: "1px 5px",
      borderRadius: 4,
      color: tone,
    }}
  >
    {children}
  </code>
);

// ───────── AppIcon (color swatch) ─────────
interface AppIconProps {
  tone?: string;
  size?: number;
  radius?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({ tone = "linear-gradient(150deg,#FF8866,#E8A23F 55%,#3FB57E)", size = 24, radius }) => (
  <div
    style={{
      width: size, height: size,
      borderRadius: radius ?? Math.round(size * 0.24),
      background: tone,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
      flex: `0 0 ${size}px`,
    }}
  />
);

// ───────── TowerGlyph (stacked blocks icon) ─────────
export const TowerGlyph: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div
    style={{
      width: size, height: size,
      borderRadius: Math.round(size * 0.24),
      background: "#15121f",
      display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center",
      padding: size * 0.16, gap: size * 0.05,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
      flex: `0 0 ${size}px`,
    }}
  >
    {["#FF8866", "#E8A23F", "#3FB57E"].map((c, i) => (
      <div
        key={i}
        style={{
          width: `${72 - i * 8}%`, height: size * 0.13, borderRadius: 2, background: c,
          transform: `translateX(${(i % 2 ? 1 : -1) * size * 0.04}px)`,
        }}
      />
    ))}
  </div>
);
