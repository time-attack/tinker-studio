import React from "react";

// Minimal stroke icon set — no emoji, no external deps.
// Each entry is raw SVG path data rendered inside a 24×24 viewBox.

export const I = {
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chev:'<path d="m9 6 6 6-6 6"/>',
  chevDown:'<path d="m6 9 6 6 6-6"/>',
  bolt:'<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  wand:'<path d="M3 21 14 10"/><path d="M16 2v3M19 5l-2 2M22 8h-3M19 11l-2-2"/>',
  book:'<path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h12"/>',
  send:'<path d="M5 12 19 5l-7 14-2-7z"/>',
  attach:'<path d="m21 11-9 9a5 5 0 0 1-7-7l9-9a3 3 0 1 1 4 4l-9 9a1 1 0 0 1-1.5-1.4l8-8"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  app:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>',
  file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  shield:'<path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6z"/>',
  sparkle:'<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="m6 6 3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
  code:'<path d="m9 8-5 4 5 4M15 8l5 4-5 4"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  x:'<path d="M6 6 18 18M18 6 6 18"/>',
  download:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  package:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  dot:'<circle cx="12" cy="12" r="4"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
  grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  text:'<path d="M5 6h14M5 6v-1M19 6v-1M12 6v13M9 19h6"/>',
  cpu:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>',
  flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
  back:'<path d="M15 6 9 12l6 6"/>',
  more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  at:'<circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1"/>',
};

interface IcProps {
  d: string;
  lg?: boolean;
  sm?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const Ic: React.FC<IcProps> = ({ d, lg, sm, style, className }) => (
  <svg
    className={`st-i${lg ? ' lg' : ''}${sm ? ' sm' : ''}${className ? ` ${className}` : ''}`}
    viewBox="0 0 24 24"
    style={style}
    dangerouslySetInnerHTML={{ __html: d }}
  />
);
