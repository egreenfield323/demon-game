import type { KVStore } from '../../engine/types';
import { UPGRADES, type UpgradeId } from '../data/upgrades';
import type { MetaState } from './state';

const KEY = 'soul-quota-meta-v1';

function freshMeta(): MetaState {
  return { sinPoints: 0, upgrades: [], runs: 0, wins: 0, soulsAllTime: 0, bestDay: 0 };
}

/** Persistent progression: Sin Points and permanent unlocks. */
export class MetaStore {
  state: MetaState;

  constructor(private store: KVStore) {
    this.state = this.load();
  }

  private load(): MetaState {
    try {
      const raw = this.store.getItem(KEY);
      if (!raw) return freshMeta();
      const parsed = JSON.parse(raw) as Partial<MetaState>;
      return { ...freshMeta(), ...parsed, upgrades: Array.isArray(parsed.upgrades) ? parsed.upgrades : [] };
    } catch {
      return freshMeta();
    }
  }

  save(): void {
    try {
      this.store.setItem(KEY, JSON.stringify(this.state));
    } catch {
      // storage full/unavailable: progression just won't persist
    }
  }

  has(u: UpgradeId): boolean {
    return this.state.upgrades.includes(u);
  }

  buyUpgrade(u: UpgradeId): boolean {
    const def = UPGRADES[u];
    if (this.has(u) || this.state.sinPoints < def.cost) return false;
    this.state.sinPoints -= def.cost;
    this.state.upgrades.push(u);
    this.save();
    return true;
  }

  recordRun(opts: { souls: number; daysCompleted: number; won: boolean; sinEarned: number }): void {
    this.state.runs += 1;
    if (opts.won) this.state.wins += 1;
    this.state.soulsAllTime += opts.souls;
    this.state.bestDay = Math.max(this.state.bestDay, opts.daysCompleted);
    this.state.sinPoints += opts.sinEarned;
    this.save();
  }
}
