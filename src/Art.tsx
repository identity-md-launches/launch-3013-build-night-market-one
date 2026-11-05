import type { CSSProperties } from 'react';
import type { StallId } from './model';

export function Icon({ name, className = '' }: { name: 'wheel' | 'wallet' | 'spark' | 'arrow' | 'moon' | 'check' | 'pause' | 'play'; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'wheel' && <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" />{[0, 45, 90, 135].map(angle => <path key={angle} d="M12 3v7m0 4v7" transform={`rotate(${angle} 12 12)`} />)}</>}
    {name === 'wallet' && <><path d="M20 7V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7" /><path d="M21 12h-5v5h5" /><path d="M17.5 14.5h.01" /></>}
    {name === 'spark' && <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></>}
    {name === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5" />}
    {name === 'check' && <path d="m5 12 4 4L19 6" />}
    {name === 'moon' && <><path d="M20 15a8 8 0 0 1-11-11 8.5 8.5 0 1 0 11 11Z" /><path d="M18 3v4m-2-2h4" /></>}
    {name === 'pause' && <><path d="M9 5v14M15 5v14" /></>}
    {name === 'play' && <path d="m8 4 12 8-12 8V4Z" />}
  </svg>;
}

export function Awning({ stall }: { stall: StallId }) {
  return <svg className="awning" viewBox="0 0 320 44" preserveAspectRatio="none" aria-hidden="true">
    <defs><clipPath id={`awning-${stall}`}><path d="M18 0h284l18 24v8a20 14 0 0 1-40 0 20 14 0 0 1-40 0 20 14 0 0 1-40 0 20 14 0 0 1-40 0 20 14 0 0 1-40 0 20 14 0 0 1-40 0 20 14 0 0 1-40 0 20 14 0 0 1-40 0v-8Z" /></clipPath></defs>
    <g clipPath={`url(#awning-${stall})`}>
      <path fill="var(--awning-dark)" d="M0 0h320v44H0z" />
      {[0, 80, 160, 240].map(x => <path key={x} fill="var(--awning-light)" d={`M${x + 18 - x * 0.056} 0h35l${x < 160 ? -2 : 2} 44h-40Z`} />)}
      <path stroke="var(--awning-edge)" d="M0 24h320" />
    </g>
  </svg>;
}

export function StallArt({ stall, fill }: { stall: StallId; fill: number }) {
  return <div className={`stall-picture picture-${stall}`} aria-hidden="true" style={{ '--fill': fill } as CSSProperties}>
    <svg className="display-shelf" viewBox="0 0 240 180" fill="none">
      <ellipse cx="120" cy="158" rx="75" ry="12" fill="var(--art-shadow)" />
      <path d="M30 160h180M45 166h150" stroke="var(--art-line)" />
      {stall === 'wick' && <>
        <path d="M81 89v53c0 15 78 15 78 0V89" fill="var(--candle)" />
        <ellipse cx="120" cy="89" rx="39" ry="11" fill="var(--candle-top)" />
        <path d="M81 90c0 10 15 4 15 19 0 11 9 9 9-1V97m25 1v20c0 9 10 10 10 0V96" stroke="var(--candle-drip)" strokeWidth="4" />
        <path d="M88 102v35m62-33v30" stroke="var(--candle-highlight)" strokeWidth="2" opacity=".55" />
        <path d="m118 86 2-11 2 10" stroke="var(--wick)" strokeWidth="2" />
        <ellipse cx="120" cy="147" rx="37" ry="8" stroke="var(--candle-drip)" />
        <path d="m69 53 3 4m97 8 4-3m-15-20-2 5" stroke="var(--art-line)" />
      </>}
      {stall === 'oil' && <>
        <defs>
          <clipPath id="bottle-inside"><path d="M105 47v28c0 13-22 20-22 39v29c0 15 74 15 74 0v-29c0-19-22-26-22-39V47Z" /></clipPath>
          <linearGradient id="bottle-tint"><stop stopColor="var(--glass)" stopOpacity=".12" /><stop offset=".5" stopColor="var(--glass)" stopOpacity=".02" /><stop offset="1" stopColor="var(--glass)" stopOpacity=".09" /></linearGradient>
        </defs>
        <path d="M102 45v29c0 12-23 20-23 40v30c0 20 82 20 82 0v-30c0-20-23-28-23-40V45Z" fill="url(#bottle-tint)" stroke="var(--glass)" strokeOpacity=".65" strokeWidth="1.5" />
        <g clipPath="url(#bottle-inside)">
          <g style={{ transform: `translateY(${(1 - fill) * 68}px)` }} className="oil-level">
            <path className="oil-slosh" d="M40 83Q60 76 80 83t40 0 40 0 40 0 40 0v95H40Z" fill="var(--oil)" />
            <path className="oil-slosh" d="M40 83Q60 76 80 83t40 0 40 0 40 0 40 0" stroke="var(--accent)" strokeOpacity=".6" strokeWidth="2" />
            <circle cx="105" cy="127" r="2.5" fill="var(--accent)" opacity=".3" /><circle cx="134" cy="141" r="1.5" fill="var(--accent)" opacity=".4" />
          </g>
        </g>
        <rect x="100" y="34" width="40" height="13" rx="3" fill="var(--bottle-cap)" stroke="var(--art-line)" />
        <path d="M107 36v8m6-8v8m7-8v8m7-8v8m6-8v8" stroke="var(--glass)" strokeOpacity=".22" />
        <path d="M92 113v23m21-80v20m37 43v18" stroke="var(--glass)" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
        <path d="m170 68 3 4m-98 8-4-2" stroke="var(--art-line)" />
      </>}
      {stall === 'glass' && <>
        <g className="glass-pane pane-one" transform="rotate(-14 104 111)"><rect x="69" y="60" width="61" height="91" rx="3" fill="var(--glass)" fillOpacity=".055" stroke="var(--glass)" strokeOpacity=".48" /><path d="m78 91 25-23m-23 34 34-31" stroke="var(--glass)" strokeOpacity=".23" /></g>
        <g className="glass-pane pane-two" transform="rotate(12 147 111)"><rect x="116" y="51" width="61" height="100" rx="3" fill="var(--glass)" fillOpacity=".07" stroke="var(--glass)" strokeOpacity=".65" /><path d="m127 81 21-20m-21 31 34-32" stroke="var(--glass)" strokeOpacity=".35" /></g>
        <g className="glass-pane pane-three"><rect x="92" y="68" width="62" height="87" rx="3" fill="var(--glass)" fillOpacity=".11" stroke="var(--glass)" strokeOpacity=".8" /><path d="m102 99 23-22m-23 34 35-33" stroke="var(--glass)" strokeOpacity=".5" /><path d="M146 127v19h-19" stroke="var(--glass)" strokeOpacity=".3" /></g>
        <path d="M177 42v10m-5-5h10M62 106v6m-3-3h6" stroke="var(--accent)" strokeOpacity=".6" strokeLinecap="round" />
      </>}
    </svg>
    {stall === 'wick' && <div className="flame"><div className="flame-core" /></div>}
  </div>;
}

export function Crowd() {
  return <div className="crowd" aria-hidden="true">{[0, 1, 2].map(i => <svg key={i} viewBox="0 0 16 18" className={`customer customer-${i}`} fill="currentColor"><circle cx="8" cy="5" r="3" /><path d="M2 16v-2a6 6 0 0 1 12 0v2H2Z" /></svg>)}</div>;
}
