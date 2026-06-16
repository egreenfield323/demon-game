import { Rng } from '../../engine/rng';
import { STARTING_DECK } from '../data/cards';
import { pickWorld } from '../data/districts';
import type { MetaState, NpcDef, RunState } from './state';
import { DAY_COUNT, DAY_START_MIN, MIN_PER_SEC, QUOTAS } from './state';

export function newRun(meta: MetaState, seed: number): RunState {
  const deck = STARTING_DECK.slice();
  if (meta.upgrades.includes('night-school')) deck.push('cold-read');
  const maxFire = 6 + (meta.upgrades.includes('bigger-furnace') ? 1 : 0);
  const run: RunState = {
    seed,
    day: 1,
    loop: 1,
    world: pickWorld(new Rng(`world:${seed}:1:1`)),
    coins: meta.upgrades.includes('expense-account') ? 3 : 0,
    soulsToday: 0,
    totalSouls: 0,
    fire: maxFire,
    maxFire,
    deck,
    charms: [],
    consumablesPending: [],
    longingArmed: false,
    loopholeUsed: false,
    timeMin: DAY_START_MIN,
    fledToday: 0,
  };
  startDay(run);
  return run;
}

/** Roll the next day's hunting ground (avoiding an immediate repeat). */
export function advanceWorld(run: RunState): void {
  run.world = pickWorld(new Rng(`world:${run.seed}:${run.loop}:${run.day}`), run.world);
}

/** A single rising scalar (day across loops) that scales every world. */
export function runDifficulty(run: RunState): number {
  return (run.loop - 1) * DAY_COUNT + run.day;
}

/** How fast the delivery meter sweeps — faster as the run gets harder. */
export function meterSpeedFor(run: RunState): number {
  return 1.5 * (1 + (runDifficulty(run) - 1) * 0.06);
}

export function quotaFor(run: RunState): number {
  let q = QUOTAS[run.day - 1] ?? QUOTAS[QUOTAS.length - 1];
  q += run.loop - 1; // each loop raises the bar
  if (run.charms.includes('first-lie-quill') && run.day === DAY_COUNT) q += 1;
  return q;
}

/** Refill fire, apply pending consumables, reset the clock. */
export function startDay(run: RunState): void {
  let fire = run.maxFire;
  if (run.charms.includes('opal-echoes')) fire -= 1;
  run.longingArmed = false;
  for (const c of run.consumablesPending) {
    if (c === 'brimstone-espresso') fire += 2;
    if (c === 'bottled-longing') run.longingArmed = true;
  }
  run.consumablesPending = [];
  run.fire = Math.max(1, fire);
  run.timeMin = DAY_START_MIN;
  run.soulsToday = 0;
  run.fledToday = 0;
}

export type DayOutcome = 'met' | 'forgiven' | 'satan';

export function endDayOutcome(run: RunState, meta: MetaState): DayOutcome {
  if (run.soulsToday >= quotaFor(run)) return 'met';
  if (meta.upgrades.includes('hr-loophole') && !run.loopholeUsed) {
    run.loopholeUsed = true;
    return 'forgiven';
  }
  return 'satan';
}

export function clockRate(run: RunState): number {
  return MIN_PER_SEC * (run.charms.includes('dead-mans-watch') ? 1.2 : 1);
}

export function soulPayout(run: RunState, npc: NpcDef): number {
  return npc.soulValue + (run.charms.includes('first-lie-quill') ? 1 : 0);
}

export function scanCosts(run: RunState): { quick: number; deep: number } {
  return { quick: 1, deep: run.charms.includes('hagstone-monocle') ? 1 : 2 };
}

export function aurasVisible(run: RunState): boolean {
  return !run.charms.includes('hagstone-monocle');
}

/** Total days survived across every loop (for scoring + the review screen). */
export function daysSurvived(run: RunState, won: boolean): number {
  return (run.loop - 1) * DAY_COUNT + (won ? DAY_COUNT : run.day - 1);
}

export function sinPointsFor(run: RunState, won: boolean): number {
  const days = daysSurvived(run, won);
  return run.totalSouls + 2 * days + (won ? 10 : 0);
}
