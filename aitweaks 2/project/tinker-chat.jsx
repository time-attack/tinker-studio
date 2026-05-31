// Tinker — chat surface pieces: bubbles, reasoning trace, proposal, diff, build, done, composer
// Depends on tinker-core.jsx (Ic, I, Btn, TowerStackPhone, etc.)

// ───────────────────────── Bubbles ─────────────────────────
function UserBubble({ children }) {
  return (
    <div className="st-msg user">
      <div className="st-msg-bubble">{children}</div>
    </div>
  );
}
function AiRow({ children }) {
  return (
    <div className="st-msg ai">
      <div className="st-avatar" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, maxWidth: 700 }}>{children}</div>
    </div>
  );
}
function AiBubble({ children, dashed }) {
  return (
    <div className="st-msg-bubble" style={dashed ? { background: 'transparent', border: '1px dashed var(--st-line2)', color: 'var(--st-fg2)' } : undefined}>{children}</div>
  );
}
const Mono = ({ children, tone = 'var(--st-violet)' }) => (
  <code style={{ font: '500 12.5px/1 var(--st-mono)', background: 'var(--st-violet-08)', padding: '1px 5px', borderRadius: 4, color: tone }}>{children}</code>
);

// ───────────────────────── Reasoning trace (tucked, collapsible) ─────────────────────────
const TRACE = [
  { t: 'Checked the app is unlocked', d: "It's already decrypted — good to go.", meta: '0.3s' },
  { t: 'Read the app’s text', d: 'Scanned 8,210 strings, flagged 34 that mention ads.', meta: '0.9s' },
  { t: 'Spotted the ad kits', d: 'Google AdMob and AppLovin are both bundled in.', meta: '0.4s' },
  { t: 'Found what shows them', d: 'TSAdManager drives the banner and the full-screen ad.', meta: '0.6s', code: 'TSAdManager' },
  { t: 'Picked the safest fix', d: 'Tell it to skip showing ads instead of ripping the kit out — that could crash the game.', meta: '1.1s' },
  { t: 'Wrote the change', d: '2 methods quietly switched off, 1 banner forced hidden.', meta: '0.7s' },
];

function ReasoningTrace({ variant = 'timeline', open, onToggle, running, runningStep = TRACE.length }) {
  const head = running ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', borderRadius: 999,
      background: 'var(--st-violet-08)', width: 'fit-content', font: '600 12px/1 var(--st-font)', color: 'var(--st-violet)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--st-violet)', animation: 'tk-pulse 1s ease-in-out infinite' }} />
      Reading the app…
    </div>
  ) : (
    <button onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9,
      padding: '7px 12px', borderRadius: 999, background: 'var(--st-violet-08)', width: 'fit-content',
      font: '600 12px/1 var(--st-font)', color: 'var(--st-violet)' }}>
      <Ic d={I.sparkle} sm />
      Thought for 4s · {TRACE.length} steps
      <Ic d={open ? 'm6 9 6 6 6-6' : I.chev} sm style={{ opacity: 0.7, transform: open ? 'rotate(0)' : 'none' }} />
    </button>
  );
  if (!open) return head;

  if (variant === 'narrative') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {head}
        <div className="st-card" style={{ maxWidth: 680 }}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
            {TRACE.map((s, i) => (
              <div key={i} style={{ font: '400 13.5px/1.5 var(--st-font)', color: 'var(--st-fg2)' }}>
                <span style={{ color: 'var(--st-violet)', font: '600 12px/1 var(--st-mono)', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                <b style={{ color: 'var(--st-fg)', fontWeight: 600 }}>{s.t}.</b> {s.d}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (variant === 'minimal') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {head}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 680 }}>
          {TRACE.map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px',
              borderRadius: 999, background: 'var(--st-elev)', border: '1px solid var(--st-line)',
              font: '500 11.5px/1 var(--st-font)', color: 'var(--st-fg2)' }}>
              <Ic d={I.check} sm style={{ width: 11, height: 11, color: 'var(--st-green)' }} />{s.t}
            </span>
          ))}
        </div>
      </div>
    );
  }
  // timeline (default)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {head}
      <div className="st-card" style={{ maxWidth: 680 }}>
        {TRACE.map((s, i) => {
          const done = i < runningStep, run = i === runningStep;
          return (
            <div key={i} className="st-trace-row">
              <div className={`st-trace-dot ${done ? 'done' : run ? 'run' : ''}`}>
                {done ? <Ic d={I.check} sm /> : i + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                {s.t}{s.code && <> <Mono>{s.code}</Mono></>}
                <span className="desc">{s.d}</span>
              </div>
              <span className="meta">{done ? s.meta : run ? '…' : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Before / after mini ─────────────────────────
function GameBottomMini({ ads }) {
  return (
    <div style={{ width: 132, height: 92, borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(180deg,#1A1530,#0E0B1C)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', border: '1px solid var(--st-line)' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ alignSelf: 'center', width: 56 - i * 8, height: 9, borderRadius: 2, marginBottom: 3,
          background: ['#5B47E6', '#FF8866', '#3FB57E'][i], transform: `translateX(${(i % 2 ? 8 : -8)}px)` }} />
      ))}
      {ads
        ? <div style={{ height: 26, background: '#fff', borderTop: '2px solid #FFD23F', display: 'flex', alignItems: 'center', gap: 5, padding: '0 6px' }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: 'linear-gradient(135deg,#FF4E50,#F9D423)' }} />
            <div style={{ font: '700 7px/1 -apple-system', color: '#111' }}>Raid Heroes</div>
            <div style={{ marginLeft: 'auto', font: '700 6px/1 -apple-system', color: '#fff', background: '#2BB24C', padding: '3px 6px', borderRadius: 8 }}>GET</div>
          </div>
        : <div style={{ height: 14 }} />}
    </div>
  );
}

function ProposalCard({ codeVariant = 'plain', showDiff, onToggleDiff, onApply, applied }) {
  return (
    <div className="st-card">
      <div className="st-card-head" style={{ whiteSpace: 'nowrap' }}>
        <Ic d={I.wand} sm /> Here’s what I’ll do
        <span className="right" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>safe · keeps your saves</span>
      </div>
      <div className="st-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ font: '400 14px/1.55 var(--st-font)', color: 'var(--st-fg)' }}>
          I’ll switch off Tower Stack’s ads. The game won’t even notice — your towers and high score stay exactly the same.
        </div>
        <div className="st-ba">
          <div className="st-ba-tile">
            <div className="st-ba-label">Before</div>
            <GameBottomMini ads />
            <div style={{ font: '500 10.5px/1.3 var(--st-mono)', color: 'var(--st-fg3)' }}>banner + full-screen ads</div>
          </div>
          <div className="st-ba-tile after">
            <div className="st-ba-label">After</div>
            <GameBottomMini />
            <div style={{ font: '500 10.5px/1.3 var(--st-mono)', color: '#1F8458' }}>no ads, ever</div>
          </div>
        </div>
        {showDiff && <DiffBody variant={codeVariant} />}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!applied
            ? <Btn kind="primary" icon={I.check} onClick={onApply}>Make this extension</Btn>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: '600 13px/1 var(--st-font)', color: 'var(--st-green)' }}><Ic d={I.check} sm /> Added</span>}
          <Btn onClick={onToggleDiff} icon={showDiff ? I.eye : I.code}>{showDiff ? 'Hide the changes' : 'Show the changes'}</Btn>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Diff body (3 presentation variants) ─────────────────────────
const CHANGES = [
  { t: 'Bottom banner', d: 'hidden so it never appears' },
  { t: 'Full-screen ad between games', d: 'skipped automatically' },
  { t: '“Watch an ad to continue”', d: 'continues for free instead' },
];
const HOOK_LINES = [
  { k: 'kw', t: '%hook ' }, { k: 'cls', t: 'TSAdManager\n' },
  { k: 'fn', t: '- (void)showBannerInView:(UIView *)v {' }, { k: 'cm', t: '  // Tinker: show nothing' }, { k: 'fn', t: '}' },
  { k: 'fn', t: '- (void)presentInterstitialFrom:(id)vc {' }, { k: 'cm', t: '  // Tinker: skip the full-screen ad' }, { k: 'fn', t: '}' },
  { k: 'kw', t: '%end\n' },
  { k: 'kw', t: '%hook ' }, { k: 'cls', t: 'GADBannerView\n' },
  { k: 'fn', t: '- (void)didMoveToWindow {' }, { k: 'val', t: '  self.hidden = YES;' }, { k: 'cm', t: '  // keep AdMob banners hidden' }, { k: 'fn', t: '}' },
  { k: 'kw', t: '%end' },
];
const HOOK_COLOR = { kw: '#FF8866', cls: '#5B47E6', fn: 'var(--st-fg)', cm: 'var(--st-fg3)', val: '#3FB57E' };

function DiffBody({ variant = 'plain' }) {
  if (variant === 'plain') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '12px 14px', background: 'var(--st-elev)',
        border: '1px solid var(--st-line)', borderRadius: 10 }}>
        {CHANGES.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'baseline' }}>
            <Ic d={I.check} sm style={{ color: 'var(--st-green)', flex: '0 0 14px', transform: 'translateY(2px)' }} />
            <div style={{ font: '400 13px/1.45 var(--st-font)', color: 'var(--st-fg2)' }}>
              <b style={{ color: 'var(--st-fg)', fontWeight: 600 }}>{c.t}</b> — {c.d}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'annotated') {
    return (
      <div style={{ border: '1px solid var(--st-line)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { code: '%hook TSAdManager', note: 'reach into the ad controller' },
          { code: 'showBannerInView: → do nothing', note: 'no bottom banner' },
          { code: 'presentInterstitialFrom: → do nothing', note: 'no full-screen ad' },
          { code: 'GADBannerView.hidden = YES', note: 'belt-and-braces: hide any stragglers' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '9px 14px',
            borderTop: i ? '1px solid var(--st-line)' : 0, background: i % 2 ? 'var(--st-elev)' : 'transparent' }}>
            <code style={{ font: '500 11.5px/1.4 var(--st-mono)', color: 'var(--st-fg)' }}>{r.code}</code>
            <span style={{ font: '400 12px/1.4 var(--st-font)', color: 'var(--st-fg3)' }}>{r.note}</span>
          </div>
        ))}
      </div>
    );
  }
  // raw
  return (
    <div style={{ background: '#16121F', borderRadius: 10, padding: '14px 16px', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Pill tone="#9491A1">TowerStack.xm</Pill>
        <span style={{ font: '500 10.5px/1 var(--st-mono)', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>Logos · the real hook</span>
      </div>
      <pre style={{ margin: 0, font: '500 12px/1.7 var(--st-mono)', whiteSpace: 'pre-wrap', color: '#cfc9e0' }}>
        {HOOK_LINES.map((l, i) => <span key={i} style={{ color: HOOK_COLOR[l.k] === 'var(--st-fg)' ? '#cfc9e0' : HOOK_COLOR[l.k] }}>{l.t}{l.t.endsWith('\n') ? '' : '\n'}</span>)}
      </pre>
    </div>
  );
}

// ───────────────────────── Build pipeline + done ─────────────────────────
const BUILD_STEPS = [
  { t: 'Unpacked the app', icon: I.box },
  { t: 'Slipped in your extension', icon: I.flask },
  { t: 'Re-signed with your certificate', icon: I.shield },
  { t: 'Repackaged into a new IPA', icon: I.package },
];
function BuildPanel({ step = 0 }) {
  return (
    <div className="st-card">
      <div className="st-card-head"><Ic d={I.package} sm /> Building your copy
        <span className="right">{Math.min(step + 1, BUILD_STEPS.length)} / {BUILD_STEPS.length}</span></div>
      <div>
        {BUILD_STEPS.map((s, i) => {
          const done = i < step, run = i === step;
          return (
            <div key={i} className="st-trace-row" style={{ opacity: i > step ? 0.45 : 1 }}>
              <div className={`st-trace-dot ${done ? 'done' : run ? 'run' : ''}`}>{done ? <Ic d={I.check} sm /> : <Ic d={s.icon} sm />}</div>
              <div>{s.t}</div>
              <span className="meta">{done ? 'done' : run ? '…' : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonePanel({ onLibrary }) {
  return (
    <div className="st-card" style={{ borderColor: 'rgba(63,181,126,0.4)' }}>
      <div className="st-card-head" style={{ background: '#F0FAF4', color: '#1F8458', borderColor: 'rgba(63,181,126,0.3)' }}>
        <Ic d={I.check} sm /> Your ad-free Tower Stack is ready
      </div>
      <div className="st-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--st-elev)', borderRadius: 10, border: '1px solid var(--st-line)' }}>
          <TowerGlyph size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '600 14px/1.2 var(--st-font)' }}>Tower Stack <span style={{ color: 'var(--st-violet)' }}>· Tinkered</span></div>
            <div style={{ font: '500 11px/1.3 var(--st-mono)', color: 'var(--st-fg3)', marginTop: 3 }}>TowerStack-tinkered.ipa · 47.4 MB</div>
          </div>
          <Btn kind="primary" icon={I.download}>Download</Btn>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ font: '600 12px/1 var(--st-font)', color: 'var(--st-fg2)' }}>Last step — get it on your phone:</div>
          {['Open AltStore or Sideloadly on your computer', 'Drag the file in — your iPhone installs the ad-free copy', 'Open Tower Stack. No ads.'].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, font: '400 13px/1.45 var(--st-font)', color: 'var(--st-fg2)' }}>
              <span style={{ flex: '0 0 18px', height: 18, borderRadius: '50%', background: 'var(--st-violet-12)', color: 'var(--st-violet)',
                font: '600 10px/18px var(--st-mono)', textAlign: 'center' }}>{i + 1}</span>{s}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn icon={I.book} onClick={onLibrary}>Save to my library</Btn>
          <Btn icon={I.copy}>Copy install link</Btn>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Composer + suggestions ─────────────────────────
function Composer({ value, onChange, onSend, placeholder = 'Describe a change in plain English…', locked, ctaLabel = 'Ask' }) {
  return (
    <div className="st-composer" style={locked ? { opacity: 0.6 } : undefined}>
      <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} rows={2}
        disabled={locked}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend?.(); } }} />
      <div className="row">
        <Btn icon={I.at}>App</Btn>
        <Btn icon={I.attach}>Screenshot</Btn>
        <div style={{ flex: 1 }} />
        <Btn kind="primary" icon={I.send} onClick={onSend} disabled={locked}>{ctaLabel}</Btn>
      </div>
    </div>
  );
}

function SuggestionChips({ onPick }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {SUGGESTIONS.map((s, i) => (
        <button key={i} className="st-chip ghost" style={{ cursor: 'pointer', border: '1px solid var(--st-line)' }} onClick={() => onPick?.(s)}>{s}</button>
      ))}
    </div>
  );
}

Object.assign(window, {
  UserBubble, AiRow, AiBubble, Mono, ReasoningTrace, ProposalCard, DiffBody,
  BuildPanel, DonePanel, Composer, SuggestionChips, GameBottomMini, TRACE,
});
