export const STALLS = ['wick', 'oil', 'glass'] as const;
export type StallId = (typeof STALLS)[number];
export const STORAGE_KEY = 'night-market.v1';
export const STATUS_URL = 'https://api.squeekchain.com/v1/status';
export const STALL_INFO = {
  wick: { name: 'Wick', unit: 'lamps' },
  oil: { name: 'Oil', unit: 'flasks' },
  glass: { name: 'Glass', unit: 'panes' },
} as const;

export interface SavedBook {
  points: number;
  counts: Record<StallId, number>;
  open: StallId;
  round: string | null;
  address: string | null;
}

export interface MarketEvent {
  id: number;
  text: string;
  at: number;
  kind: 'piece' | 'stall' | 'wheel' | 'wallet' | 'welcome';
}

export interface Game extends SavedBook {
  fills: Record<StallId, number>;
  events: MarketEvent[];
  eventId: number;
  reward: { id: number; stall: StallId; points: number; until: number } | null;
}

export interface Reading {
  round: string | null;
  measurement: {
    coreStatus: string;
    rpmMilli: number | null;
    freshness: string;
    observedAt: number | null;
    staleAfterSeconds: number;
  } | null;
}

export type WheelMode = 'loading' | 'running' | 'idle' | 'stale' | 'unread' | 'practice';
export interface Wheel {
  mode: WheelMode;
  running: boolean;
  rpm: number | null;
  rate: number;
  round: string | null;
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
const count = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
export const isAddress = (value: unknown): value is string =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
const roundId = (value: unknown): string | null => {
  if (typeof value === 'string' && /^\d+$/.test(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
};

export function savedBook(raw: string | null): SavedBook {
  let saved: Record<string, unknown> = {};
  try { saved = record(raw ? JSON.parse(raw) : null); } catch { /* A damaged book starts fresh. */ }
  const made = record(saved.counts);
  return {
    points: count(saved.points),
    counts: { wick: count(made.wick), oil: count(made.oil), glass: count(made.glass) },
    open: STALLS.includes(saved.open as StallId) ? saved.open as StallId : 'oil',
    round: roundId(saved.round),
    address: isAddress(saved.address) ? saved.address : null,
  };
}

export function newGame(book: SavedBook, now: number): Game {
  return {
    ...book,
    fills: { wick: 0, oil: 0, glass: 0 },
    events: [{ id: 0, text: 'The market is open. Pick a stall and settle in.', at: now, kind: 'welcome' }],
    eventId: 0,
    reward: null,
  };
}

export function addEvent(game: Game, text: string, kind: MarketEvent['kind'], now: number): Game {
  const id = game.eventId + 1;
  return { ...game, eventId: id, events: [{ id, text, at: now, kind }, ...game.events].slice(0, 8) };
}

export function openStall(game: Game, open: StallId, now: number): Game {
  return game.open === open ? game : addEvent({ ...game, open }, `Opened the ${open} stall.`, 'stall', now);
}

export function settleRound(game: Game, round: string | null, now: number): Game {
  return round === null || round === game.round ? game :
    addEvent({ ...game, round }, `Round ${round} started.`, 'wheel', now);
}

export function parseReading(payload: unknown): Reading {
  const root = record(payload);
  const anchor = record(record(root.builder).anchor);
  const closure = record(record(root.oracle).latestClosure);
  const round = roundId(anchor.settledThroughRound ?? closure.lastRound);
  if (!root.measurement || typeof root.measurement !== 'object') return { round, measurement: null };
  const m = record(root.measurement);
  const rpmMilli = typeof m.rpmMilli === 'number' && Number.isFinite(m.rpmMilli) && m.rpmMilli >= 0 ? m.rpmMilli : null;
  const observedAt = typeof m.observedAt === 'string' ? Date.parse(m.observedAt) : NaN;
  return {
    round,
    measurement: {
      coreStatus: typeof m.coreStatus === 'string' ? m.coreStatus : '',
      rpmMilli,
      freshness: typeof m.freshness === 'string' ? m.freshness : '',
      observedAt: Number.isFinite(observedAt) ? observedAt : null,
      staleAfterSeconds: typeof m.staleAfterSeconds === 'number' && Number.isFinite(m.staleAfterSeconds) && m.staleAfterSeconds > 0 ? m.staleAfterSeconds : 120,
    },
  };
}

export function wheelState(reading: Reading | null, load: 'loading' | 'ready' | 'failed', now: number): Wheel {
  const low = { running: false, rpm: null, rate: 0.025, round: reading?.round ?? null };
  if (load === 'loading') return { ...low, mode: 'loading' };
  if (load === 'failed') return { ...low, mode: reading?.measurement ? 'stale' : 'unread' };
  const m = reading?.measurement;
  if (!m || m.observedAt === null) return { ...low, mode: 'unread' };
  const age = now - m.observedAt;
  if (m.freshness !== 'online' || age < 0 || age > m.staleAfterSeconds * 1000) return { ...low, mode: 'stale' };
  if (m.coreStatus === 'ACTIVE' && m.rpmMilli !== null) {
    const rpm = m.rpmMilli / 1000;
    return { mode: 'running', running: true, rpm, rate: 0.09 + Math.min(rpm, 40) / 180, round: reading.round };
  }
  if (m.coreStatus === 'IDLE') return { ...low, mode: 'idle' };
  return { ...low, mode: 'unread' };
}

export function practiceWheel(elapsedSeconds: number): Wheel {
  const rpm = 18 + Math.sin(elapsedSeconds / 9) * 7;
  return { mode: 'practice', running: true, rpm, rate: 0.09 + rpm / 180, round: null };
}

export function wheelLabel(wheel: Wheel): string {
  const round = wheel.round === null ? '' : ` · round ${wheel.round}`;
  switch (wheel.mode) {
    case 'running': return `Running · ${wheel.rpm!.toFixed(1)} rpm${round}`;
    case 'idle': return `Idle · the flame stays low${round}`;
    case 'practice': return 'Practice — simulated, not live';
    case 'stale': return 'Stale reading · holding a low flame';
    case 'unread': return 'Wheel unread';
    case 'loading': return 'Reading the wheel…';
  }
}

export function wheelSentence(wheel: Wheel, stall: StallId): string {
  const name = STALL_INFO[stall].name;
  switch (wheel.mode) {
    case 'running': return `He is on the move. ${name} works a little faster. The market hums.`;
    case 'idle': return `He is resting. ${name} keeps a slow flame. Nothing spoils.`;
    case 'practice': return `A practice night. ${name} follows a simulated wheel.`;
    case 'loading': return `${name} keeps a low flame while we read the wheel.`;
    default: return `${name} keeps a low flame until a fresh reading arrives. Nothing spoils.`;
  }
}

export function advance(game: Game, seconds: number, wheel: Wheel, now: number): Game {
  if (!Number.isFinite(seconds) || seconds <= 0) return game;
  let next = { ...game, fills: { ...game.fills } };
  for (const stall of STALLS) {
    const fill = game.fills[stall] + seconds * wheel.rate * (game.open === stall ? 1 : 0.22);
    const pieces = Math.floor(fill + 1e-10);
    next.fills[stall] = Math.max(0, fill - pieces);
    if (!pieces) continue;
    next.counts = { ...next.counts, [stall]: Math.min(Number.MAX_SAFE_INTEGER, next.counts[stall] + pieces) };
    if (game.open !== stall) continue;
    const reward = wheel.running ? 3 : 1;
    next.points = Math.min(Number.MAX_SAFE_INTEGER, next.points + reward * pieces);
    // Normal frame steps can finish only one; this also handles a bounded delayed frame.
    for (let i = 0; i < Math.min(pieces, 8); i++) {
      next = addEvent(next, `${STALL_INFO[stall].name} finished a piece. +${reward}.`, 'piece', now);
    }
    next.reward = { id: next.eventId, stall, points: reward, until: now + 1300 };
  }
  if (next.reward && next.reward.until <= now) next.reward = null;
  return next;
}

export function serializeBook(game: Game): string {
  const { points, counts, open, round, address } = game;
  return JSON.stringify({ points, counts, open, round, address });
}

export function signatureMessage(address: string): string {
  return `Night Market\n${address}\nThis signature only names the stall book. It does not spend tokens.`;
}

export function hexMessage(text: string): string {
  return `0x${Array.from(new TextEncoder().encode(text), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
