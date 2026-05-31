// Tinker — app shell & state machine: landing, analyzing, rail, right panel, library, Tweaks
// Depends on tinker-core.jsx + tinker-chat.jsx
const { useState, useEffect, useRef } = React;

// ───────────────────────── Accent theming ─────────────────────────
const ACCENTS = {
  '#5B47E6': '#4A38D6', // indigo (default)
  '#7B61FF': '#6A4FF0', // plum
  '#FF8866': '#EE6F4D', // coral
  '#3FB57E': '#2F9D69', // green
  '#5999D9': '#3F82C8', // blue
};
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function applyAccent(hex) {
  const r = document.documentElement.style;
  r.setProperty('--st-violet', hex);
  r.setProperty('--st-violet-h', ACCENTS[hex] || hex);
  r.setProperty('--st-violet-12', hexA(hex, 0.12));
  r.setProperty('--st-violet-08', hexA(hex, 0.08));
}

// ───────────────────────── Landing / upload ─────────────────────────
function Landing({ onUpload, uploadStyle = 'hero' }) {
  const steps = [
    { icon: I.upload, t: 'Drop in an app', d: 'A decrypted .ipa you own' },
    { icon: I.wand, t: 'Describe the change', d: 'Plain English, no code' },
    { icon: I.download, t: 'Install your copy', d: 'Sideload the tweaked IPA' },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 40, background: 'radial-gradient(120% 90% at 50% -10%, #F4F0E9, var(--st-bg))' }}>
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, marginTop: -20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <div className="st-mark" style={{ width: 52, height: 52, borderRadius: 15 }} />
          <div>
            <div style={{ font: '700 30px/1.15 var(--st-font)', letterSpacing: '-0.025em' }}>Tinker</div>
            <div style={{ font: '500 15px/1.4 var(--st-font)', color: 'var(--st-fg2)', marginTop: 6 }}>
              Browser extensions, but for your iPhone apps.
            </div>
          </div>
        </div>

        <button onClick={onUpload} style={{ all: 'unset', cursor: 'pointer', width: '100%' }}>
          <div style={{ border: '2px dashed var(--st-line2)', borderRadius: 18, background: 'var(--st-panel)',
            padding: '38px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            boxShadow: 'var(--sh-soft)', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--st-violet)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--st-line2)'}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--st-violet-08)', color: 'var(--st-violet)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic d={I.upload} lg /></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '600 16px/1.3 var(--st-font)' }}>Drop an app here to start</div>
              <div style={{ font: '400 13px/1.4 var(--st-font)', color: 'var(--st-fg3)', marginTop: 4 }}>
                or <span style={{ color: 'var(--st-violet)', fontWeight: 600 }}>choose a .ipa file</span> · stays on your machine
              </div>
            </div>
          </div>
        </button>

        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, padding: '12px 13px',
              borderRadius: 12, background: 'rgba(255,255,255,0.5)', border: '1px solid var(--st-line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--st-fg3)' }}>
                <span style={{ font: '600 10px/1 var(--st-mono)' }}>{i + 1}</span><Ic d={s.icon} sm />
              </div>
              <div style={{ font: '600 12.5px/1.2 var(--st-font)' }}>{s.t}</div>
              <div style={{ font: '400 11px/1.35 var(--st-font)', color: 'var(--st-fg3)' }}>{s.d}</div>
            </div>
          ))}
        </div>
        <div style={{ font: '400 11.5px/1.4 var(--st-font)', color: 'var(--st-fg3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic d={I.shield} sm style={{ color: 'var(--st-green)' }} /> Only works on apps you own and have decrypted.
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Analyzing pipeline ─────────────────────────
const SCAN_STEPS = [
  'Unpacking Tower Stack',
  'Reading 8,210 text strings',
  'Mapping the 5 screens',
  'Spotting ad kits & frameworks',
  'Building a map the assistant can read',
];
function Analyzing({ onDone }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= SCAN_STEPS.length) { const t = setTimeout(onDone, 500); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep(s => s + 1), step === 0 ? 600 : 480);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'var(--st-bg)' }}>
      <div className="st-panel" style={{ width: 460, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, paddingBottom: 18, borderBottom: '1px solid var(--st-line)' }}>
          <TowerGlyph size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ font: '600 15px/1.2 var(--st-font)' }}>{TOWER.name}</div>
            <div style={{ font: '500 11px/1.3 var(--st-mono)', color: 'var(--st-fg3)', marginTop: 3 }}>{TOWER.bundle} · {TOWER.size}</div>
          </div>
          <div style={{ width: 26, height: 26, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, border: '2.5px solid var(--st-violet-12)', borderTopColor: 'var(--st-violet)',
              borderRadius: '50%', animation: 'tk-spin .8s linear infinite' }} />
          </div>
        </div>
        <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {SCAN_STEPS.map((s, i) => {
            const done = i < step, run = i === step;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, opacity: i > step ? 0.4 : 1, transition: 'opacity .3s' }}>
                <div className={`st-trace-dot ${done ? 'done' : run ? 'run' : ''}`} style={{ flex: '0 0 18px' }}>
                  {done ? <Ic d={I.check} sm /> : run ? '' : i + 1}
                </div>
                <span style={{ font: '500 13.5px/1.3 var(--st-font)', color: done ? 'var(--st-fg)' : run ? 'var(--st-fg)' : 'var(--st-fg2)' }}>{s}</span>
                {run && <span style={{ marginLeft: 'auto', font: '500 11px/1 var(--st-mono)', color: 'var(--st-violet)' }}>scanning…</span>}
                {done && <Ic d={I.check} sm style={{ marginLeft: 'auto', color: 'var(--st-green)' }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Sidebar rail ─────────────────────────
function Rail({ view, onNav, libCount }) {
  const items = [
    { id: 'chat', label: 'New extension', icon: I.wand },
    { id: 'library', label: 'Your library', icon: I.book, meta: libCount },
    { id: 'apps', label: 'All apps', icon: I.app, meta: '142' },
  ];
  return (
    <div className="st-rail">
      <div className="st-rail-head" style={{ cursor: 'pointer' }} onClick={() => onNav('apps')}>
        <div className="st-mark" />
        <div>
          <div className="st-mark-text">Tinker</div>
          <div className="st-mark-sub">no-code app extensions</div>
        </div>
      </div>
      <div className="st-search"><Ic d={I.search} sm /> Search<span className="st-kbd">⌘K</span></div>
      {items.map(it => (
        <div key={it.id} className={`st-rail-item${view === it.id ? ' active' : ''}`} onClick={() => onNav(it.id)}>
          <Ic d={it.icon} /> {it.label}{it.meta && <span className="st-rail-meta">{it.meta}</span>}
        </div>
      ))}
      <div className="st-rail-section">This app</div>
      <div className={`st-rail-item${view === 'chat' ? ' active' : ''}`} onClick={() => onNav('appcurrent')}>
        <TowerGlyph size={18} /><span style={{ fontSize: 13 }}>Tower Stack</span><span className="st-rail-meta">v{TOWER.version}</span>
      </div>
      <div className="st-rail-foot">
        <div className="st-rail-dot" />
        <div>
          <div style={{ font: '600 12px/1.2 var(--st-font)', color: '#fff' }}>Free certificate</div>
          <div style={{ font: '500 10.5px/1.2 var(--st-mono)', color: 'var(--st-rail-fg2)' }}>signed · 6 days left</div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Right panel (preview / under the hood) ─────────────────────────
function RightPanel({ tab, onTab, adsRemoved }) {
  return (
    <div className="st-preview" style={{ flex: '0 0 376px' }}>
      <div style={{ display: 'flex', gap: 4, padding: 3, background: 'rgba(20,16,40,0.05)', borderRadius: 9 }}>
        {[['preview', 'Live preview', I.eye], ['inside', 'Under the hood', I.cpu]].map(([id, label, ic]) => (
          <button key={id} onClick={() => onTab(id)} style={{ all: 'unset', flex: 1, textAlign: 'center', cursor: 'pointer',
            padding: '7px 8px', borderRadius: 7, font: '600 12px/1 var(--st-font)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: tab === id ? 'var(--st-panel)' : 'transparent', color: tab === id ? 'var(--st-fg)' : 'var(--st-fg3)',
            boxShadow: tab === id ? 'var(--sh-soft)' : 'none' }}><Ic d={ic} sm />{label}</button>
        ))}
      </div>
      {tab === 'preview'
        ? <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ font: '500 11px/1 var(--st-mono)', color: adsRemoved ? 'var(--st-green)' : 'var(--st-fg3)', alignSelf: 'center' }}>
              {adsRemoved ? '● ad-free copy' : 'original · with ads'}
            </div>
            <TowerStackPhone ads={!adsRemoved} scale={0.82} />
          </div>
        : <Inside />}
    </div>
  );
}

function InsideSection({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ font: '600 10px/1 var(--st-font)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--st-fg3)' }}>{title}</div>
      {children}
    </div>
  );
}
function Inside() {
  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 2 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 9,
        background: 'var(--st-violet-08)', font: '400 11.5px/1.4 var(--st-font)', color: 'var(--st-fg2)' }}>
        <Ic d={I.cpu} sm style={{ color: 'var(--st-violet)', flex: '0 0 16px', marginTop: 1 }} />
        The nerdy view of what’s inside Tower Stack. You never have to read it — the assistant does.
      </div>
      <InsideSection title="Ad kits found">
        {INSIDE.adSdks.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 9,
            background: '#FEF3EC', border: '1px solid rgba(255,136,102,0.35)' }}>
            <Ic d={I.ban} sm style={{ color: '#E8703F' }} />
            <div style={{ flex: 1 }}>
              <div style={{ font: '600 12px/1.2 var(--st-font)' }}>{a.name}</div>
              <div style={{ font: '500 10px/1.3 var(--st-mono)', color: 'var(--st-fg3)' }}>{a.detail}</div>
            </div>
            <Pill tone="#E8703F">{a.kind}</Pill>
          </div>
        ))}
      </InsideSection>
      <InsideSection title="Screens">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {INSIDE.screens.map(s => <span key={s} className="st-meta-pill">{s}</span>)}
        </div>
      </InsideSection>
      <InsideSection title="Suspicious classes">
        <div style={{ border: '1px solid var(--st-line)', borderRadius: 10, overflow: 'hidden' }}>
          {INSIDE.classes.map((c, i) => (
            <div key={c.name} style={{ padding: '8px 11px', borderTop: i ? '1px solid var(--st-line)' : 0, background: i % 2 ? 'var(--st-elev)' : 'transparent' }}>
              <code style={{ font: '600 11.5px/1.2 var(--st-mono)', color: 'var(--st-violet)' }}>{c.name}</code>
              <div style={{ font: '400 11px/1.3 var(--st-font)', color: 'var(--st-fg3)', marginTop: 2 }}>{c.note}</div>
            </div>
          ))}
        </div>
      </InsideSection>
      <InsideSection title="Frameworks">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {INSIDE.frameworks.map(f => (
            <span key={f} style={{ font: '500 10.5px/1 var(--st-mono)', padding: '4px 8px', borderRadius: 5,
              background: 'var(--st-elev)', border: '1px solid var(--st-line)', color: 'var(--st-fg2)' }}>{f}</span>
          ))}
        </div>
      </InsideSection>
      <InsideSection title="Flagged strings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {INSIDE.strings.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 11px/1.3 var(--st-mono)', color: 'var(--st-fg2)' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.s}</span>
              <Pill>{s.tag}</Pill>
            </div>
          ))}
        </div>
      </InsideSection>
    </div>
  );
}

// ───────────────────────── Library ─────────────────────────
const LIB = [
  { glyph: true, app: 'Tower Stack', sub: 'No ads, ever', tone: TOWER.tone, on: true, fresh: true, badge: 'ads off' },
  { app: 'Spotify', sub: 'Always-off shuffle', tone: '#1DB954', on: true, badge: 'no shuffle' },
  { app: 'Instagram', sub: 'Hide the story rail', tone: 'linear-gradient(135deg,#FFC83D,#E1306C 50%,#833AB4)', on: true, badge: 'feed only' },
  { app: 'YouTube', sub: 'Background play', tone: '#FF0000', on: false, badge: 'audio in bg' },
  { app: 'Threads', sub: 'Chronological feed', tone: '#000', on: true, badge: 'no “for you”' },
  { app: 'Reddit', sub: 'No promoted posts', tone: 'linear-gradient(135deg,#FF4500,#FF8717)', on: false, badge: 'no promos' },
];
function Library({ onNew }) {
  const [on, setOn] = useState(LIB.map(x => x.on));
  return (
    <div className="st-stage">
      <div className="st-stage-head">
        <div className="st-crumb" style={{ whiteSpace: 'nowrap' }}><b>Your extensions</b> · {LIB.length} built · {on.filter(Boolean).length} on</div>
        <div style={{ flex: 1 }} />
        <Btn kind="primary" icon={I.plus} onClick={onNew}>New extension</Btn>
      </div>
      <div className="st-lib" style={{ overflow: 'auto', alignContent: 'start' }}>
        {LIB.map((t, i) => (
          <div key={i} className="st-lib-card" style={t.fresh ? { borderColor: 'var(--st-violet-30, rgba(91,71,230,0.4))', boxShadow: '0 0 0 1px var(--st-violet-12)' } : undefined}>
            <div className="st-lib-thumb" style={{ background: 'var(--st-elev)', position: 'relative' }}>
              {t.glyph ? <TowerGlyph size={48} /> : <AppIcon tone={t.tone} size={48} radius={12} />}
              {t.fresh && <span style={{ position: 'absolute', top: 8, right: 8, font: '700 9px/1 var(--st-font)', letterSpacing: '0.06em',
                color: 'var(--st-violet)', background: 'var(--st-violet-12)', padding: '3px 6px', borderRadius: 5 }}>JUST BUILT</span>}
            </div>
            <div>
              <div className="st-lib-title">{t.app}</div>
              <div className="st-lib-sub">{t.sub}</div>
            </div>
            <div className="st-lib-row">
              <Pill>{t.badge}</Pill>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ font: '500 11.5px/1 var(--st-font)', color: 'var(--st-fg3)' }}>{on[i] ? 'On' : 'Off'}</span>
                <div className={`st-toggle${on[i] ? ' on' : ''}`} style={{ cursor: 'pointer' }}
                  onClick={() => setOn(o => o.map((v, j) => j === i ? !v : v))}><div className="knob" /></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { applyAccent, ACCENTS, Landing, Analyzing, Rail, RightPanel, Library });
