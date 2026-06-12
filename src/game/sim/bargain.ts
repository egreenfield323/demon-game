import { Rng } from '../../engine/rng';
import { CARDS, type CardId } from '../data/cards';
import type { CharmId } from '../data/charms';
import type { Keyword } from '../data/keywords';
import { TRAITS } from '../data/traits';
import type { NpcDef } from './state';

/** The Soul-Bargain: chip Willpower to 0 before Suspicion hits 100 or
 * Patience runs out. Pure logic; the scene layer renders/voices the events. */

export type Mood = 'neutral' | 'receptive' | 'wary' | 'offended';
export type BargainStatus = 'active' | 'signed' | 'fled' | 'bored' | 'walked';

export interface RevealState {
  traits: [boolean, boolean];
  quirk: boolean;
  desire: boolean;
  ick: boolean;
}

export interface BargainEvent {
  kind: 'say' | 'dmg' | 'susp' | 'soothe' | 'reveal' | 'mood' | 'status' | 'info';
  text?: string;
  amount?: number;
  /** For dmg: the multiplier bucket that produced it. */
  hit?: 'desire' | 'trait' | 'ick' | 'plain';
}

export interface BargainState {
  npc: NpcDef;
  willpower: number;
  suspicion: number;
  patience: number;
  maxPatience: number;
  mood: Mood;
  status: BargainStatus;
  reveal: RevealState;
  deck: CardId[];
  hand: CardId[];
  discard: CardId[];
  nextDmgPenalty: number;
  turn: number;
  charms: CharmId[];
  flatDmgBonus: number;
  rng: Rng;
}

export interface BargainOpts {
  npc: NpcDef;
  deck: CardId[];
  charms: CharmId[];
  /** From the HR meta upgrade 'forked-tongue'. */
  flatDmgBonus: number;
  /** District heat etc. */
  startSuspicion?: number;
  /** Bottled Longing. */
  revealDesire?: boolean;
  /** Pre-bargain scan results carry over. */
  reveal?: Partial<RevealState>;
  seed: number | string;
}

export const HAND_SIZE = 4;

function draw(st: BargainState, n: number): void {
  for (let i = 0; i < n; i++) {
    if (st.deck.length === 0) {
      if (st.discard.length === 0) return;
      st.deck = st.rng.shuffle(st.discard);
      st.discard = [];
    }
    const card = st.deck.pop();
    if (card) st.hand.push(card);
  }
}

export function startBargain(opts: BargainOpts): BargainState {
  const rng = new Rng(opts.seed);
  const npc = opts.npc;

  let patience = npc.basePatience;
  if (opts.charms.includes('dead-mans-watch')) patience += 2;
  if (opts.charms.includes('velvet-glove')) patience -= 1;
  patience = Math.max(3, patience);

  const reveal: RevealState = {
    traits: [opts.reveal?.traits?.[0] ?? false, opts.reveal?.traits?.[1] ?? false],
    quirk: opts.reveal?.quirk ?? false,
    desire: (opts.reveal?.desire ?? false) || (opts.revealDesire ?? false),
    ick: opts.reveal?.ick ?? false,
  };

  const st: BargainState = {
    npc,
    willpower: npc.maxWillpower,
    suspicion: Math.max(0, Math.min(99, Math.round(opts.startSuspicion ?? 0))),
    patience,
    maxPatience: patience,
    mood: 'neutral',
    status: 'active',
    reveal,
    deck: rng.shuffle(opts.deck),
    hand: [],
    discard: [],
    nextDmgPenalty: 0,
    turn: 0,
    charms: opts.charms.slice(),
    flatDmgBonus: opts.flatDmgBonus,
    rng,
  };

  if (opts.charms.includes('opal-echoes')) {
    const hidden: number[] = [];
    if (!st.reveal.traits[0]) hidden.push(0);
    if (!st.reveal.traits[1]) hidden.push(1);
    if (hidden.length) st.reveal.traits[rng.pick(hidden)] = true;
  }

  draw(st, HAND_SIZE);
  return st;
}

export function canPlay(st: BargainState, idx: number): { ok: boolean; reason?: string } {
  const id = st.hand[idx];
  if (!id || st.status !== 'active') return { ok: false, reason: 'no card' };
  const card = CARDS[id];
  if (card.special === 'finePrint' && st.willpower > st.npc.maxWillpower * 0.5) {
    return { ok: false, reason: 'They are not worn down enough.' };
  }
  return { ok: true };
}

/** What multiplier bucket a keyword lands in, given current knowledge of the
 * NPC (used by both the sim and the card UI hints). */
export function keywordHit(npc: NpcDef, kw: Keyword): 'desire' | 'trait' | 'ick' | 'plain' {
  if (kw === npc.desire) return 'desire';
  if (kw === npc.ick) return 'ick';
  const affinities = new Set(npc.traits.flatMap((t) => TRAITS[t].keywords));
  return affinities.has(kw) ? 'trait' : 'plain';
}

export function playCard(st: BargainState, idx: number): BargainEvent[] {
  const events: BargainEvent[] = [];
  const check = canPlay(st, idx);
  if (!check.ok) return events;

  const id = st.hand[idx];
  const card = CARDS[id];
  st.hand.splice(idx, 1);
  st.discard.push(id);
  st.turn += 1;

  events.push({ kind: 'say', text: card.line });

  // --- Damage ---
  let hit: 'desire' | 'trait' | 'ick' | 'plain' = 'plain';
  let base = card.dmg;
  if (card.special === 'advocate') base = Math.floor(st.suspicion / 4);
  if (base > 0) base += st.flatDmgBonus;
  if (base > 0 && st.nextDmgPenalty > 0) {
    base = Math.max(0, base - st.nextDmgPenalty);
    events.push({ kind: 'info', text: 'Your last promise rings hollow.' });
  }
  st.nextDmgPenalty = 0;

  let mult = 1;
  if (card.kw) {
    hit = keywordHit(st.npc, card.kw);
    if (hit === 'desire') mult = 3;
    else if (hit === 'trait') mult = 1.75;
    else if (hit === 'ick') mult = 0;
    if (st.npc.quirk === 'SKEPTIC' && mult > 1) mult = 1 + (mult - 1) * 0.5;
    if (!st.reveal.desire && hit === 'desire') {
      st.reveal.desire = true;
      events.push({ kind: 'reveal', text: `That hit something deep. Desire: ${st.npc.desire}.` });
    }
    if (!st.reveal.ick && hit === 'ick') {
      st.reveal.ick = true;
      events.push({ kind: 'reveal', text: `Wrong nerve. Ick: ${st.npc.ick}.` });
    }
  }
  if (st.mood === 'receptive') mult *= 1.25;
  if (st.mood === 'offended') mult *= 0.75;
  if (st.charms.includes('silver-tongue')) mult *= 1.25;

  let dmg = Math.round(base * mult);
  if (st.npc.quirk === 'DRUNK' && dmg > 0) dmg = Math.round(dmg * st.rng.range(0.6, 1.4));
  if (hit === 'ick') dmg = 0;
  dmg = Math.max(0, dmg);

  if (dmg > 0) {
    st.willpower = Math.max(0, st.willpower - dmg);
    events.push({ kind: 'dmg', amount: dmg, hit });
  } else if (card.dmg > 0 || card.special === 'advocate') {
    events.push({ kind: 'dmg', amount: 0, hit });
  }

  // --- Suspicion ---
  let susBase = card.susp + (hit === 'ick' ? 12 : 0);
  if (susBase > 0) {
    let gain = susBase * st.npc.susRate;
    if (st.npc.quirk === 'DEVOUT') gain *= 1.5;
    if (st.mood === 'wary') gain *= 1.5;
    if (st.charms.includes('silver-tongue')) gain *= 1.1;
    const rounded = Math.max(1, Math.round(gain));
    st.suspicion = Math.min(100, st.suspicion + rounded);
    events.push({ kind: 'susp', amount: rounded });
  }
  if (card.soothe) {
    const amt = card.soothe * (st.charms.includes('velvet-glove') ? 2 : 1);
    const before = st.suspicion;
    st.suspicion = Math.max(0, st.suspicion - amt);
    events.push({ kind: 'soothe', amount: before - st.suspicion });
  }

  // --- Specials ---
  if (card.special === 'probe') {
    revealSomething(st, events, false);
  } else if (card.special === 'coldRead') {
    revealSomething(st, events, st.rng.chance(0.5));
  } else if (card.special === 'honeyed') {
    st.nextDmgPenalty = 3;
  }

  // --- Resolution ---
  if (st.willpower <= 0) {
    st.status = 'signed';
    events.push({ kind: 'status', text: 'signed' });
    return events;
  }
  if (st.suspicion >= 100) {
    st.status = 'fled';
    events.push({ kind: 'status', text: 'fled' });
    return events;
  }

  st.patience -= 1;
  if (card.special === 'crocodile') st.patience -= 1;
  if (st.patience <= 0) {
    st.status = 'bored';
    events.push({ kind: 'status', text: 'bored' });
    return events;
  }

  // --- Mood for next turn ---
  let next: Mood = 'neutral';
  if (hit === 'ick') next = 'offended';
  else if (st.suspicion >= 60 && st.rng.chance(0.5)) next = 'wary';
  else if (dmg >= 12 && st.rng.chance(0.6)) next = 'receptive';
  if (next !== st.mood) events.push({ kind: 'mood', text: next });
  st.mood = next;

  draw(st, 1);
  return events;
}

function revealSomething(st: BargainState, events: BargainEvent[], preferDesire: boolean): void {
  if (preferDesire && !st.reveal.desire) {
    st.reveal.desire = true;
    events.push({ kind: 'reveal', text: `You glimpse the hunger itself: ${st.npc.desire}.` });
    return;
  }
  const options: Array<() => void> = [];
  if (!st.reveal.traits[0])
    options.push(() => {
      st.reveal.traits[0] = true;
      events.push({ kind: 'reveal', text: `You sense it: ${st.npc.traits[0]}.` });
    });
  if (!st.reveal.traits[1])
    options.push(() => {
      st.reveal.traits[1] = true;
      events.push({ kind: 'reveal', text: `You sense it: ${st.npc.traits[1]}.` });
    });
  if (st.npc.quirk && !st.reveal.quirk)
    options.push(() => {
      st.reveal.quirk = true;
      events.push({ kind: 'reveal', text: `Complication: ${st.npc.quirk}.` });
    });
  if (!st.reveal.desire)
    options.push(() => {
      st.reveal.desire = true;
      events.push({ kind: 'reveal', text: `You glimpse the hunger itself: ${st.npc.desire}.` });
    });
  if (options.length === 0) {
    events.push({ kind: 'info', text: 'Nothing left to learn. They are an open book.' });
    return;
  }
  st.rng.pick(options)();
}

export function walkAway(st: BargainState): void {
  if (st.status === 'active') st.status = 'walked';
}
