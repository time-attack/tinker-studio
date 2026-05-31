// Tinker — design explorations: 3 variants each of upload, reasoning viz, code presentation
// Reuses tinker-core.jsx + tinker-chat.jsx. Laid out on a DesignCanvas.

const I2 = {
  link: '<path d="M9 15 15 9"/><path d="M11 6l1.5-1.5a4 4 0 0 1 6 6L17 12"/><path d="M13 18l-1.5 1.5a4 4 0 0 1-6-6L7 12"/>',
  key: '<circle cx="8" cy="14" r="4"/><path d="M11 11 20 2M17 5l2 2M14 8l2 2"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
  paint: '<path d="M3 21 14 10"/><path d="M16 2v3M19 5l-2 2M22 8h-3M19 11l-2-2"/>',
};

// ───────────────────────── Frame helpers ─────────────────────────
function CanvasShell({ children, pad = 0, bg = 'var(--st-bg)' }) {
  // gives each artboard the studio root context + chosen bg, filling the artboard
  return (
    <div className="st-root" style={{ width: '100%', height: '100%', background: bg, padding: pad,
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</div>
  );
}

function ChatFrame({ user, children }) {
  return (
    <CanvasShell pad={22} bg="var(--st-bg)">
      <div className="st-thread" style={{ gap: 14 }}>
        {user && <UserBubble>{user}</UserBubble>}
        <AiRow>{children}</AiRow>
      </div>
    </CanvasShell>
  );
}

// ═════════════════════════ UPLOAD / FIRST-RUN ═════════════════════════
function UploadDrop() {
  return <CanvasShell><Landing onUpload={() => {}} /></CanvasShell>;
}

function UploadLink() {
  const recents = [
    { n: 'Tower Stack', glyph: true }, { n: 'Spotify', tone: '#1DB954' },
    { n: 'Instagram', tone: 'linear-gradient(135deg,#FFC83D,#E1306C 50%,#833AB4)' }, { n: 'Notes', tone: 'linear-gradient(180deg,#FFF1A8,#FFC640)' },
  ];
  return (
    <CanvasShell pad={40} bg="radial-gradient(120% 90% at 50% -10%, #F4F0E9, var(--st-bg))">
      <div style={{ margin: 'auto', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <div className="st-mark" style={{ width: 46, height: 46, borderRadius: 14 }} />
          <div style={{ font: '700 24px/1.2 var(--st-font)', letterSpacing: '-0.02em' }}>Start from a link</div>
          <div style={{ font: '400 13.5px/1.4 var(--st-font)', color: 'var(--st-fg2)' }}>Paste a link to an app you own — we’ll fetch and unpack it.</div>
        </div>
        <div className="st-composer" style={{ flexDirection: 'row', alignItems: 'center', padding: '6px 6px 6px 14px' }}>
          <Ic d={I2.link} sm style={{ color: 'var(--st-fg3)' }} />
          <input style={{ flex: 1, border: 0, outline: 0, background: 'transparent', font: '500 14px/1.4 var(--st-font)', color: 'var(--st-fg)' }}
            placeholder="App Store, TestFlight, or .ipa URL" defaultValue="" />
          <Btn kind="primary" style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}>Fetch app</Btn>
        </div>
        <div>
          <div style={{ font: '600 10px/1 var(--st-font)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--st-fg3)', marginBottom: 10 }}>Recent on this Mac</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {recents.map((r, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '14px 8px',
                borderRadius: 12, background: 'var(--st-panel)', border: '1px solid var(--st-line)', cursor: 'pointer' }}>
                {r.glyph ? <TowerGlyph size={38} /> : <AppIcon tone={r.tone} size={38} radius={10} />}
                <span style={{ font: '500 11px/1.2 var(--st-font)', color: 'var(--st-fg2)' }}>{r.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CanvasShell>
  );
}

function UploadGuided() {
  const intents = [
    { ic: I2.ban, t: 'Remove ads', d: 'Banners, pop-ups, the lot', tone: '#FF8866' },
    { ic: I2.key, t: 'Unlock paid features', d: 'Pro tools, themes, no paywall', tone: '#5B47E6' },
    { ic: I2.paint, t: 'Change how it looks', d: 'Colors, text, hide things', tone: '#3FB57E' },
  ];
  return (
    <CanvasShell pad={40} bg="radial-gradient(120% 90% at 50% -10%, #F4F0E9, var(--st-bg))">
      <div style={{ margin: 'auto', width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: '700 24px/1.2 var(--st-font)', letterSpacing: '-0.02em' }}>What do you want to do?</div>
          <div style={{ font: '400 13.5px/1.4 var(--st-font)', color: 'var(--st-fg2)', marginTop: 6 }}>Pick a starting point, then drop in your app.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {intents.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px', borderRadius: 14,
              background: 'var(--st-panel)', border: '1px solid var(--st-line)', boxShadow: 'var(--sh-soft)', cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: `${it.tone}1A`, color: it.tone,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic d={it.ic} lg /></div>
              <div style={{ flex: 1 }}>
                <div style={{ font: '600 14.5px/1.2 var(--st-font)' }}>{it.t}</div>
                <div style={{ font: '400 12px/1.3 var(--st-font)', color: 'var(--st-fg3)', marginTop: 3 }}>{it.d}</div>
              </div>
              <Ic d={I.chev} sm style={{ color: 'var(--st-fg3)' }} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', font: '500 12px/1.4 var(--st-font)', color: 'var(--st-fg3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Ic d={I.upload} sm /> or just drop an app to explore freely
        </div>
      </div>
    </CanvasShell>
  );
}

// ═════════════════════════ REASONING VIZ ═════════════════════════
function ReasoningVariant({ variant }) {
  return (
    <ChatFrame user="Get rid of the ads in Tower Stack.">
      <AiBubble>Found it — the ads run through <Mono>TSAdManager</Mono>. Here’s how I worked it out.</AiBubble>
      <ReasoningTrace variant={variant} open onToggle={() => {}} />
    </ChatFrame>
  );
}

// ═════════════════════════ CODE / CHANGE PRESENTATION ═════════════════════════
function CodeVariant({ variant, label }) {
  return (
    <ChatFrame user="Show me exactly what you’re changing.">
      <AiBubble>Sure — here’s the change, {label}.</AiBubble>
      <div className="st-card" style={{ maxWidth: 660 }}>
        <div className="st-card-head"><Ic d={I.code} sm /> The change<span className="right" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>3 edits</span></div>
        <div className="st-card-body"><DiffBody variant={variant} /></div>
      </div>
    </ChatFrame>
  );
}

// ═════════════════════════ CANVAS ═════════════════════════
function VariationsApp() {
  return (
    <DesignCanvas>
      <DCSection id="upload" title="Upload / first-run" subtitle="Three front doors. All land in the same studio — they differ in what the very first moment asks of the user.">
        <DCArtboard id="u-drop" label="A · Drop zone" width={660} height={580}><UploadDrop /></DCArtboard>
        <DCArtboard id="u-link" label="B · From a link" width={660} height={580}><UploadLink /></DCArtboard>
        <DCArtboard id="u-guided" label="C · Intent-first" width={660} height={580}><UploadGuided /></DCArtboard>
      </DCSection>

      <DCSection id="reasoning" title="How the AI shows its thinking" subtitle="Same six steps, three temperaments. In the prototype this lives collapsed behind a “Thought for 4s” pill — these are the expanded states.">
        <DCArtboard id="r-timeline" label="A · Timeline (default)" width={720} height={520}><ReasoningVariant variant="timeline" /></DCArtboard>
        <DCArtboard id="r-narrative" label="B · Narrative" width={720} height={520}><ReasoningVariant variant="narrative" /></DCArtboard>
        <DCArtboard id="r-minimal" label="C · Minimal" width={720} height={420}><ReasoningVariant variant="minimal" /></DCArtboard>
      </DCSection>

      <DCSection id="code" title="How the change is presented" subtitle="From friendliest to most technical. The prototype defaults to “Plain” for non-coders; power users flip to Raw.">
        <DCArtboard id="c-plain" label="A · Plain English" width={720} height={420}><CodeVariant variant="plain" label="in plain English" /></DCArtboard>
        <DCArtboard id="c-annot" label="B · Annotated" width={720} height={440}><CodeVariant variant="annotated" label="with notes" /></DCArtboard>
        <DCArtboard id="c-raw" label="C · Raw hook" width={720} height={640}><CodeVariant variant="raw" label="the real code" /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<VariationsApp />);
