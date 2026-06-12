import { STARTING_DECK } from '../data/cards';
import type { MetaState, NpcDef, RunState } from './state';
import { DAY_COUNT, DAY_START_MIN, MIN_PER_SEC, QUOTAS } from './state';

export function newRun(meta: MetaState, seed: number): RunState {
  const deck = STARTING_DECK.slice();
  if (meta.upgrades.includes('night-school')) deck.push('cold-read');
  const maxFire = 6 + (meta.upgrades.includes('bigger-furnace') ? 1 : 0);
  const run: RunState = {
    seed,
    day: 1,
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

export function quotaFor(run: RunState): number {
  let q = QUOTAS[run.day - 1] ?? QUOTAS[QUOTAS.length - 1];
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

export function sinPointsFor(run: RunState, won: boolean): number {
  const daysCompleted = won ? DAY_COUNT : run.day - 1;
  return run.totalSouls + 2 * daysCompleted + (won ? 10 : 0);
}
