import React from "react";
import { Ic, I } from "./Icons";
import { Btn } from "./Atoms";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  locked?: boolean;
  ctaLabel?: string;
}

export const Composer: React.FC<ComposerProps> = ({
  value, onChange, onSend,
  placeholder = "Describe a change in plain English…",
  locked = false,
  ctaLabel = "Ask",
}) => (
  <div className="st-composer" style={locked ? { opacity: 0.6 } : undefined}>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      disabled={locked}
      onKeyDown={e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSend();
        }
      }}
    />
    <div className="row">
      <Btn icon={I.at}>App</Btn>
      <Btn icon={I.attach}>Screenshot</Btn>
      <div style={{ flex: 1 }} />
      <Btn kind="primary" icon={I.send} onClick={onSend} disabled={locked}>
        {ctaLabel}
      </Btn>
    </div>
  </div>
);

// ───────── Suggestion chips ─────────
const SUGGESTIONS = [
  "Get rid of the ads",
  "Skip the \"watch an ad to continue\" screen",
  "Unlock the dark theme without paying",
  "Make the blocks fall slower",
];

interface SuggestionChipsProps {
  onPick: (text: string) => void;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ onPick }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
    {SUGGESTIONS.map((s, i) => (
      <button
        key={i}
        className="st-chip ghost"
        onClick={() => onPick(s)}
      >
        {s}
      </button>
    ))}
  </div>
);
