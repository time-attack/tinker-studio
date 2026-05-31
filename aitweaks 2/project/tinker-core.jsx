// Tinker — shared core: icons, sample data, atoms, phone mock, browser bar
// Visual language: violet "Studio" theme (studio.css). No emoji.

// ───────────────────────── Icons (minimal stroke set) ─────────────────────────
const Ic = ({ d, lg, sm, style }) => (
  <svg className={`st-i${lg ? ' lg' : ''}${sm ? ' sm' : ''}`} viewBox="0 0 24 24"
    style={style} dangerouslySetInnerHTML={{ __html: d }} />
);
const I = {
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

// ───────────────────────── App identity (sample data) ─────────────────────────
const TOWER = {
  name: 'Tower Stack',
  dev: 'Mintleaf Games',
  bundle: 'com.mintleaf.towerstack',
  version: '3.8.1',
  size: '47.2 MB',
  tone: 'linear-gradient(150deg,#FF8866,#E8A23F 55%,#3FB57E)',
};

// "Under the hood" decompiled findings — friendly but real
const INSIDE = {
  screens: ['Home', 'Game', 'Game over', 'Shop', 'Settings'],
  adSdks: [
    { name: 'Google AdMob', detail: 'GoogleMobileAds.framework', kind: 'banner + interstitial' },
    { name: 'AppLovin MAX', detail: 'AppLovinSDK.framework', kind: 'mediation' },
  ],
  frameworks: ['GoogleMobileAds', 'AppLovinSDK', 'FBAudienceNetwork', 'StoreKit', 'UIKit', 'SpriteKit'],
  classes: [
    { name: 'TSAdManager', note: 'shows the banners & full-screen ads' },
    { name: 'GADBannerView', note: 'AdMob banner at the bottom' },
    { name: 'GADInterstitialAd', note: 'full-screen ad between games' },
    { name: 'TSGameOverViewController', note: 'where the ad pops up' },
    { name: 'TSStoreManager', note: 'the "Remove Ads $4.99" purchase' },
  ],
  strings: [
    { s: '"Remove Ads"', tag: 'shop' },
    { s: '"Watch ad to keep your tower"', tag: 'game over' },
    { s: 'ca-app-pub-3940256099…/6300978111', tag: 'admob unit' },
    { s: '"Loading ad…"', tag: 'ad' },
    { s: '"Continue — free"', tag: 'game over' },
    { s: '"$4.99"', tag: 'purchase' },
  ],
};

const SUGGESTIONS = [
  'Get rid of the ads',
  'Skip the "watch an ad to continue" screen',
  'Unlock the dark theme without paying',
  'Make the blocks fall slower',
];

// ───────────────────────── Atoms ─────────────────────────
const AppIcon = ({ tone = TOWER.tone, size = 24, radius }) => (
  <div style={{ width: size, height: size, borderRadius: radius ?? Math.round(size * 0.24),
    background: tone, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)', flex: `0 0 ${size}px` }} />
);

// Little stacked-blocks glyph used as the Tower Stack app icon face
const TowerGlyph = ({ size = 24 }) => (
  <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.24), background: '#15121f',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
    padding: size * 0.16, gap: size * 0.05, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)', flex: `0 0 ${size}px` }}>
    {['#FF8866', '#E8A23F', '#3FB57E'].map((c, i) => (
      <div key={i} style={{ width: `${72 - i * 8}%`, height: size * 0.13, borderRadius: 2, background: c,
        transform: `translateX(${(i % 2 ? 1 : -1) * size * 0.04}px)` }} />
    ))}
  </div>
);

const Pill = ({ children, tone }) => (
  <span className="st-meta-pill" style={{ whiteSpace: 'nowrap', ...(tone ? { background: `${tone}1A`, color: tone } : {}) }}>{children}</span>
);

function Btn({ kind = 'ghost', icon, children, big, onClick, style, disabled }) {
  return (
    <button className={`st-btn ${kind}${big ? ' big' : ''}${icon && !children ? ' icon' : ''}`}
      onClick={onClick} disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer', ...style }}>
      {icon && <Ic d={icon} sm />}{children}
    </button>
  );
}

// ───────────────────────── Browser bar (light, slim) ─────────────────────────
function BrowserBar({ url = 'tinker.app/studio/tower-stack' }) {
  return (
    <div style={{ height: 38, flex: '0 0 38px', display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 12px', background: '#E4DFD6', borderBottom: '1px solid rgba(20,16,40,0.10)' }}>
      <div style={{ display: 'flex', gap: 7 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#F0655B' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#F4BD4F' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#5FC967' }} />
      </div>
      <div style={{ display: 'flex', gap: 2, color: '#9491A1', marginLeft: 2 }}>
        <Ic d={I.back} sm style={{ opacity: 0.7 }} />
        <Ic d="m9 6 6 6-6 6" sm style={{ opacity: 0.35 }} />
      </div>
      <div style={{ flex: 1, maxWidth: 460, height: 24, borderRadius: 13, background: '#F6F2EB',
        border: '1px solid rgba(20,16,40,0.08)', display: 'flex', alignItems: 'center', gap: 7,
        padding: '0 12px', font: '500 11.5px/1 var(--st-font)', color: '#5C586C' }}>
        <Ic d={I.lock} sm style={{ width: 11, height: 11, color: '#3FB57E' }} />
        <span style={{ color: '#9491A1', whiteSpace: 'nowrap' }}>tinker.app</span>
        <span style={{ whiteSpace: 'nowrap' }}>/studio/tower-stack</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#7B61FF,#5B47E6)' }} />
    </div>
  );
}

// ───────────────────────── Tower Stack phone mock ─────────────────────────
// A casual block-stacking game. `ads` toggles the banner + interstitial chrome.
function TowerStackPhone({ ads = true, scale = 1, screen = 'game' }) {
  const blocks = [
    { w: 84, c: '#5B47E6', x: 0 }, { w: 80, c: '#7B61FF', x: -6 }, { w: 84, c: '#FF8866', x: 4 },
    { w: 76, c: '#E8A23F', x: -10 }, { w: 82, c: '#3FB57E', x: 8 }, { w: 70, c: '#5999D9', x: -4 },
  ];
  return (
    <div className="st-phone-frame" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
      <div className="notch" />
      <div className="st-phone-screen" style={{ background: 'linear-gradient(180deg,#1A1530,#0E0B1C)', display: 'flex', flexDirection: 'column' }}>
        {/* status bar */}
        <div style={{ padding: '20px 18px 0', display: 'flex', justifyContent: 'space-between',
          font: '600 13px/1 -apple-system', color: '#fff' }}>
          <span>9:41</span>
          <span style={{ display: 'flex', gap: 5, alignItems: 'center', opacity: 0.9 }}>
            <span style={{ width: 16, height: 9, border: '1px solid #fff', borderRadius: 2, opacity: 0.7 }} />
          </span>
        </div>
        {/* score */}
        <div style={{ textAlign: 'center', marginTop: 10, color: '#fff' }}>
          <div style={{ font: '800 40px/1 -apple-system', letterSpacing: '-0.02em' }}>42</div>
          <div style={{ font: '600 10px/1 -apple-system', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>BEST 88</div>
        </div>
        {/* tower */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'flex-end', paddingBottom: ads ? 6 : 30, gap: 3 }}>
          {blocks.map((b, i) => (
            <div key={i} style={{ width: b.w, height: 20, borderRadius: 4, background: b.c,
              transform: `translateX(${b.x}px)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.3)' }} />
          ))}
          <div style={{ font: '600 10px/1 -apple-system', color: 'rgba(255,255,255,0.45)', marginTop: 12, letterSpacing: '0.1em' }}>TAP TO DROP</div>
        </div>
        {/* banner ad */}
        {ads && (
          <div style={{ height: 56, background: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
            borderTop: '2px solid #FFD23F' }}>
            <div style={{ position: 'absolute', marginTop: -44, marginLeft: -2, font: '700 7px/1 -apple-system',
              background: '#FFD23F', color: '#5a4500', padding: '2px 4px', borderRadius: 3, letterSpacing: '0.06em' }}>AD</div>
            <div style={{ width: 36, height: 36, borderRadius: 7, background: 'linear-gradient(135deg,#FF4E50,#F9D423)', flex: '0 0 36px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '700 11px/1.1 -apple-system', color: '#111' }}>Raid Heroes: Tap Now!</div>
              <div style={{ font: '400 9.5px/1.2 -apple-system', color: '#888', marginTop: 2 }}>Install · Free · ★ 4.2</div>
            </div>
            <div style={{ font: '700 10px/1 -apple-system', color: '#fff', background: '#2BB24C', padding: '6px 12px', borderRadius: 14 }}>GET</div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  Ic, I, TOWER, INSIDE, SUGGESTIONS, AppIcon, TowerGlyph, Pill, Btn, BrowserBar, TowerStackPhone,
});
