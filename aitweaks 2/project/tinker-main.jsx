// Tinker — conversation flow + root App + Tweaks
const { useState: useS, useEffect: useE, useRef: useR } = React;

// ───────────────────────── Chat stage (the conversation) ─────────────────────────
function ChatStage(props) {
  const { flow, userMsg, draft, setDraft, onSend, onApply, onLibrary,
    traceOpen, setTraceOpen, showDiff, setShowDiff, runStep, t } = props;
  const threadRef = useR(null);
  useE(() => { const el = threadRef.current; if (el) el.scrollTop = el.scrollHeight; }, [flow, showDiff, traceOpen, runStep]);

  const showProposal = flow === 'proposal' || flow === 'building' || flow === 'done';
  const applied = flow === 'building' || flow === 'done';

  return (
    <div className="st-stage">
      <div className="st-stage-head">
        <div className="st-crumb">{flow === 'intro' ? <b>New extension</b> : <>New extension · <b>Tower Stack</b></>}{flow === 'thinking' && ' · working…'}</div>
        <div style={{ flex: 1 }} />
        {showProposal && <Btn icon={I.book} onClick={onLibrary}>Library</Btn>}
      </div>

      <div className="st-thread" ref={threadRef} style={{ flex: 1, overflow: 'auto' }}>
        {flow === 'intro' && (
          <AiRow>
            <AiBubble>
              Tower Stack is all mapped out — I can see every screen, the two ad kits inside it, and what makes them tick.
              <br /><br />What do you want to change? Most people start by killing the ads.
            </AiBubble>
            <SuggestionChips onPick={onSend} />
          </AiRow>
        )}

        {flow !== 'intro' && <UserBubble>{userMsg}</UserBubble>}

        {flow === 'thinking' && (
          <AiRow>
            <AiBubble>On it — let me look through the app.</AiBubble>
            <ReasoningTrace variant={t.reasoning} open running runningStep={runStep} />
          </AiRow>
        )}

        {showProposal && (
          <AiRow>
            <AiBubble>
              Found it. The ads run through <Mono>TSAdManager</Mono> using Google AdMob — here’s exactly what I’ll change.
            </AiBubble>
            <ReasoningTrace variant={t.reasoning} open={traceOpen} onToggle={() => setTraceOpen(o => !o)} />
            <ProposalCard codeVariant={t.codeStyle} showDiff={showDiff} applied={applied}
              onToggleDiff={() => setShowDiff(s => !s)} onApply={onApply} />
          </AiRow>
        )}

        {applied && (
          <AiRow>
            <AiBubble>Building you a clean copy now — this only takes a moment.</AiBubble>
            <BuildPanel step={props.buildStep} />
          </AiRow>
        )}

        {flow === 'done' && (
          <AiRow>
            <DonePanel onLibrary={onLibrary} />
            <AiBubble dashed>Want more? Try “skip the watch-an-ad-to-continue screen” or “unlock the dark theme for free.”</AiBubble>
          </AiRow>
        )}
      </div>

      <Composer value={draft} onChange={setDraft} onSend={() => onSend(draft)}
        locked={flow === 'thinking' || flow === 'building'}
        ctaLabel={flow === 'intro' ? 'Ask' : 'Send'}
        placeholder={flow === 'intro' ? 'Describe a change in plain English…' : 'Reply, or ask for another change…'} />
    </div>
  );
}

// ───────────────────────── Root App ─────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#5B47E6",
  "reasoning": "timeline",
  "codeStyle": "plain",
  "reasoningOpen": false,
  "browserBar": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [stage, setStage] = useS('landing');     // landing | analyzing | studio
  const [view, setView] = useS('chat');           // chat | library
  const [flow, setFlow] = useS('intro');          // intro | thinking | proposal | building | done
  const [userMsg, setUserMsg] = useS('');
  const [draft, setDraft] = useS('');
  const [traceOpen, setTraceOpen] = useS(false);
  const [showDiff, setShowDiff] = useS(false);
  const [adsRemoved, setAdsRemoved] = useS(false);
  const [buildStep, setBuildStep] = useS(-1);
  const [runStep, setRunStep] = useS(0);
  const [rightTab, setRightTab] = useS('preview');

  useE(() => applyAccent(t.accent), [t.accent]);
  useE(() => { if (flow === 'proposal' || flow === 'done') setTraceOpen(t.reasoningOpen); }, [t.reasoningOpen]);

  // thinking → animate trace, then propose
  useE(() => {
    if (flow !== 'thinking') return;
    setRunStep(0);
    const stepId = setInterval(() => setRunStep(s => Math.min(s + 1, 6)), 330);
    const done = setTimeout(() => { setFlow('proposal'); setTraceOpen(t.reasoningOpen); }, 2300);
    return () => { clearInterval(stepId); clearTimeout(done); };
  }, [flow]);

  // building → step the pipeline, then done
  useE(() => {
    if (flow !== 'building') return;
    setBuildStep(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i >= 4) { clearInterval(id); setBuildStep(4); setAdsRemoved(true); setTimeout(() => setFlow('done'), 350); }
      else setBuildStep(i);
    }, 580);
    return () => clearInterval(id);
  }, [flow]);

  const send = (text) => {
    const v = (text || '').trim(); if (!v || flow === 'thinking' || flow === 'building') return;
    setUserMsg(v); setDraft(''); setShowDiff(false); setFlow('thinking');
  };
  const apply = () => { setFlow('building'); setRightTab('preview'); };

  const onNav = (id) => {
    if (id === 'apps') { setStage('landing'); setView('chat'); setFlow('intro'); setUserMsg(''); setAdsRemoved(false); setBuildStep(-1); }
    else if (id === 'library') setView('library');
    else if (id === 'chat') { setView('chat'); setFlow('intro'); setUserMsg(''); setShowDiff(false); }
    else if (id === 'appcurrent') setView('chat');
  };
  const startUpload = () => { setStage('analyzing'); };
  const newFromLibrary = () => { setView('chat'); setFlow('intro'); setUserMsg(''); };

  const libCount = '6';

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#D9D3C8' }}>
      {t.browserBar && <BrowserBar />}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', padding: t.browserBar ? '0' : 0, background: '#D9D3C8' }}>
        <div className="st-root" style={{ flex: 1, minWidth: 0, display: 'flex', background: 'var(--st-bg)' }}>
          {stage === 'landing' && <Landing onUpload={startUpload} />}
          {stage === 'analyzing' && <Analyzing onDone={() => setStage('studio')} />}
          {stage === 'studio' && (
            <>
              <Rail view={view} onNav={onNav} libCount={libCount} />
              <div className="st-main">
                {view === 'library'
                  ? <Library onNew={newFromLibrary} />
                  : <ChatStage {...{ flow, userMsg, draft, setDraft, onSend: send, onApply: apply,
                      onLibrary: () => setView('library'), traceOpen, setTraceOpen, showDiff, setShowDiff,
                      runStep, buildStep, t }} />}
                {view === 'chat' && <RightPanel tab={rightTab} onTab={setRightTab} adsRemoved={adsRemoved} />}
              </div>
            </>
          )}
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Look" />
        <TweakColor label="Accent" value={t.accent}
          options={['#5B47E6', '#7B61FF', '#FF8866', '#3FB57E', '#5999D9']}
          onChange={v => setTweak('accent', v)} />
        <TweakToggle label="Browser chrome" value={t.browserBar} onChange={v => setTweak('browserBar', v)} />
        <TweakSection label="AI reasoning" />
        <TweakRadio label="Style" value={t.reasoning} options={['timeline', 'narrative', 'minimal']}
          onChange={v => setTweak('reasoning', v)} />
        <TweakToggle label="Open by default" value={t.reasoningOpen} onChange={v => setTweak('reasoningOpen', v)} />
        <TweakSection label="Showing the change" />
        <TweakRadio label="Detail" value={t.codeStyle} options={['plain', 'annotated', 'raw']}
          onChange={v => setTweak('codeStyle', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
