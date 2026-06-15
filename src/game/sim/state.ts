import type { CardId } from '../data/cards';
import type { CharmId, ConsumableId } from '../data/charms';
import type { Keyword } from '../data/keywords';
import type { ArchetypeId } from '../data/archetypes';
import type { QuirkId, TraitId } from '../data/traits';
import type { UpgradeId } from '../data/upgrades';

export const DAY_COUNT = 7;
export const QUOTAS = [1, 1, 2, 2, 3, 3, 4];

/** Working hours: 8:00 to 20:00, in absolute minutes. */
export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 20 * 60;
/** Game-minutes that pass per real second. */
export const MIN_PER_SEC = 1 / 0.7;
/** Game-minutes a bargain costs, win or lose. */
export const BARGAIN_TIME_COST = 25;

export interface RunState {
  seed: number;
  day: number;
  coins: number;
  soulsToday: number;
  totalSouls: number;
  fire: number;
  maxFire: number;
  deck: CardId[];
  charms: CharmId[];
  /** Consumables bought tonight, applied at next day start. */
  consumablesPending: ConsumableId[];
  /** Today's first bargain starts with Desire revealed (Bottled Longing). */
  longingArmed: boolean;
  loopholeUsed: boolean;
  timeMin: number;
  fledToday: number;
}

export interface MetaState {
  sinPoints: number;
  upgrades: UpgradeId[];
  runs: number;
  wins: number;
  soulsAllTime: number;
  bestDay: number;
  /** Whether the player has watched the opening cinematic. */
  seenIntro: boolean;
}

export interface NpcDef {
  id: number;
  name: string;
  archetype: ArchetypeId;
  traits: [TraitId, TraitId];
  quirk?: QuirkId;
  desire: Keyword;
  ick: Keyword;
  maxWillpower: number;
  susRate: number;
  basePatience: number;
  soulValue: number;
  skin: string;
}
