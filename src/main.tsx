import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './style.css';
import { Awning, Crowd, Icon, StallArt } from './Art';
import {
  STALLS, STALL_INFO, STORAGE_KEY, STATUS_URL, addEvent, advance, hexMessage, isAddress,
  newGame, openStall, parseReading, practiceWheel, savedBook, serializeBook, settleRound,
  signatureMessage, wheelLabel, wheelSentence, wheelState, type Reading, type Wheel,
} from './model';

interface EthereumProvider { request(args: { method: string; params?: unknown[] }): Promise<unknown> }
declare global { interface Window { ethereum?: EthereumProvider } }

function App() {
  const [game, setGame] = useState(() => {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* Guest play works without storage. */ }
    return newGame(savedBook(raw), Date.now());
  });
  const [reading, setReading] = useState<Reading | null>(null);
  const [load, setLoad] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [practice, setPractice] = useState(false);
  const [pending, setPending] = useState(false);
  const [paused, setPaused] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const practiceStarted = useRef(0);
  const practiceRef = useRef(false);
  const wheelRef = useRef<Wheel>(wheelState(null, 'loading', now));
  const motionRef = useRef<HTMLDivElement>(null);
  const wheel = practice ? practiceWheel((now - practiceStarted.current) / 1000) : wheelState(reading, load, now);
  wheelRef.current = wheel;

  useEffect(() => {
    let alive = true;
    let controller: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    async function poll() {
      controller?.abort();
      if (timeout) clearTimeout(timeout);
      const request = new AbortController();
      controller = request;
      timeout = setTimeout(() => request.abort(), 6500);
      try {
        const response = await fetch(STATUS_URL, { cache: 'no-store', signal: request.signal });
        if (!response.ok) throw new Error(`Wheel status ${response.status}`);
        const next = parseReading(await response.json());
        if (!alive || request !== controller) return;
        setReading(next);
        setLoad('ready');
        if (!practiceRef.current) setGame(current => settleRound(current, next.round, Date.now()));
      } catch {
        if (alive && request === controller) setLoad('failed');
      } finally {
        if (request === controller && timeout) clearTimeout(timeout);
      }
    }
    void poll();
    const interval = setInterval(() => { void poll(); }, 8000);
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; controller?.abort(); clearInterval(interval); if (timeout) clearTimeout(timeout); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => {
    let previous = performance.now();
    const timer = setInterval(() => {
      const current = performance.now();
      // Hidden tabs do not accumulate an offline reward or a catch-up burst.
      const elapsed = document.hidden ? 0 : Math.min((current - previous) / 1000, 0.5);
      previous = current;
      const time = Date.now();
      setNow(time);
      setGame(book => advance(book, elapsed, wheelRef.current, time));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeBook(game));
      setStorageFailed(false);
    } catch { setStorageFailed(true); }
  }, [game.points, game.counts, game.open, game.round, game.address]);

  function togglePractice() {
    const active = !practiceRef.current;
    practiceRef.current = active;
    practiceStarted.current = Date.now();
    setPractice(active);
    setGame(book => {
      const next = addEvent(book, active ? 'Practice started. This wheel is simulated.' : 'Live wheel again.', 'wheel', Date.now());
      return !active && load === 'ready' ? settleRound(next, reading?.round ?? null, Date.now()) : next;
    });
  }

  async function signIn() {
    if (pending) return;
    const provider = window.ethereum;
    if (!provider) {
      setGame(book => addEvent(book, 'This browser has no wallet. The market still runs as a guest.', 'wallet', Date.now()));
      return;
    }
    setPending(true);
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = Array.isArray(accounts) ? accounts[0] : null;
      if (!isAddress(address)) throw new Error('No wallet address was returned. Try Sign in again.');
      const signature = await provider.request({ method: 'personal_sign', params: [hexMessage(signatureMessage(address)), address] });
      if (typeof signature !== 'string' || !/^0x[\da-f]+$/i.test(signature)) throw new Error('No signature was returned. Try Sign in again.');
      setGame(book => addEvent({ ...book, address }, 'Signed in. Your stall book has a name. No tokens spent.', 'wallet', Date.now()));
    } catch (error: unknown) {
      const detail = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'The wallet request did not finish.';
      setGame(book => addEvent(book, `Sign in: ${detail} The market still runs. You can try Sign in again.`, 'wallet', Date.now()));
    } finally { setPending(false); }
  }

  const name = STALL_INFO[game.open].name;
  const shortAddress = game.address ? `${game.address.slice(0, 6)}…${game.address.slice(-4)}` : null;
  const status = wheelLabel(wheel);
  const rotation = wheel.running ? Math.max(1.8, 12 - (wheel.rpm ?? 0) / 3) : 32;

  return <div className={`market-app${paused ? ' motion-paused' : ''}`} ref={motionRef} data-wheel={wheel.mode} style={{ '--wheel-duration': `${rotation}s` } as CSSProperties}>
    <a className="skip-link" href="#stalls">Skip to the stalls</a>
    <header className="site-header page-width">
      <div className="community"><Icon name="moon" /><span>Squeekchain <span className="community-detail">after hours</span></span></div>
      <div className="header-actions">
        <button className="button utility practice-button" type="button" aria-pressed={practice} onClick={togglePractice}><Icon name="spark" /><span>{practice ? 'Back to live' : 'Practice'}</span></button>
        <button className="button utility signin-button" type="button" onClick={() => { void signIn(); }} disabled={pending} title={game.address ?? 'Optional signature. No gas or token transfers.'} aria-label={pending ? 'Check wallet…' : game.address ? `Sign in, ${shortAddress}. Full address ${game.address}` : undefined}><Icon name="wallet" /><span>{pending ? 'Check wallet…' : shortAddress ?? 'Sign in'}</span></button>
      </div>
    </header>

    <main className="page-width">
      <section className="introduction" aria-labelledby="market-title">
        <h1 id="market-title">Night Market<span className="title-star" aria-hidden="true">✧</span></h1>
        <p className="tagline">Pick a stall. The real wheel decides how fast it works.</p>
        <div className={`wheel-status ${practice ? 'is-practice' : ''}`}>
          <span className="wheel-symbol"><Icon name="wheel" /></span>
          <p className="status-text" role="status" aria-live="polite" aria-atomic="true">{status}</p>
          <span className={`status-dot ${wheel.running ? 'is-running' : ''}`} aria-hidden="true" />
        </div>
        <p className="wheel-sentence">{wheelSentence(wheel, game.open)}</p>
      </section>

      <section className="stalls" id="stalls" aria-label="Choose an open stall" tabIndex={-1}>
        {STALLS.map(stall => {
          const info = STALL_INFO[stall];
          const open = game.open === stall;
          const reward = game.reward?.stall === stall ? game.reward : null;
          return <article className={`stall${open ? ' is-open' : ''}`} key={stall} aria-labelledby={`${stall}-name`}>
            <div className="stall-structure">
              <Awning stall={stall} />
              <div className="stall-heading"><h2 id={`${stall}-name`}>{info.name}</h2><span className={`stall-state${open ? ' state-open' : ''}`}>{open ? <><span className="tiny-dot" />Open</> : 'Slow craft'}</span></div>
              <div className="picture-wrap">
                <StallArt stall={stall} fill={game.fills[stall]} />
                {reward && <span className="floating-points" key={reward.id} aria-hidden="true">+{reward.points}</span>}
              </div>
              <div className="stall-work">
                <div className="work-meter" role="progressbar" aria-label={`${info.name} piece progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(game.fills[stall] * 100)} aria-valuetext={`${Math.floor(game.fills[stall] * 100)} percent of next piece`}><div className="meter-fill" style={{ transform: `scaleX(${game.fills[stall]})` }} /></div>
                <p className="made-count"><span>{game.counts[stall].toLocaleString('en-US')}</span> {info.unit}</p>
                <button type="button" className={`button stall-button${open ? ' primary' : ''}`} aria-pressed={open} onClick={() => setGame(book => openStall(book, stall, Date.now()))}><span>Open {stall}</span><Icon name={open ? 'check' : 'arrow'} /></button>
              </div>
            </div>
            <Crowd />
          </article>;
        })}
      </section>

      <section className="round-book" aria-labelledby="round-heading">
        <div className="round-detail"><h2 id="round-heading">This round</h2><p><span className="tiny-dot" />{name} stall is open</p></div>
        <p className="market-points"><Icon name="spark" /><span className="points-number">{game.points.toLocaleString('en-US')}</span> <span>market points</span></p>
        <p className="local-note">Points stay in this browser. They are not SQK. No Squeek is required.</p>
        {storageFailed && <p className="save-warning" role="status">Browser storage is unavailable. You can still play; this visit cannot be saved.</p>}
      </section>

      <section className="event-section" aria-labelledby="event-heading">
        <div className="event-heading"><h2 id="event-heading">What just happened</h2><span className="newest-label">Newest first</span></div>
        <ol className="event-log" aria-live="polite" aria-relevant="additions" aria-label="Market activity, newest first">
          {game.events.map(event => <li key={event.id}><span className={`event-mark event-${event.kind}`} aria-hidden="true">{event.kind === 'piece' ? '+' : '·'}</span><span className="event-message">{event.text}</span><time dateTime={new Date(event.at).toISOString()}>{new Date(event.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time></li>)}
        </ol>
      </section>
    </main>

    <footer className="site-footer page-width"><p>A little craft. A real wheel. Your own pace.</p><button className="motion-button" type="button" aria-pressed={paused} aria-describedby="motion-help" onClick={() => setPaused(value => !value)}><Icon name={paused ? 'play' : 'pause'} />{paused ? 'Resume motion' : 'Pause motion'}</button><span className="sr-only" id="motion-help">Pauses decorative animations. Stalls keep working. Your reduced motion preference is always respected.</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
