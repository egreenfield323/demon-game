import { describe, expect, it } from 'vitest';
import { DISTRICT_LIST, DISTRICTS, isWalkable, MAP_H, MAP_W } from '../game/data/districts';
import { TRAITS } from '../game/data/traits';
import { genNpcs } from '../game/sim/npcgen';
import { newRun } from '../game/sim/run';
import type { MetaState } from '../game/sim/state';

const meta: MetaState = { sinPoints: 0, upgrades: [], runs: 0, wins: 0, soulsAllTime: 0, bestDay: 0, seenIntro: true };

describe('district maps', () => {
  for (const id of DISTRICT_LIST) {
    const d = DISTRICTS[id];
    it(`${id} has a valid layout`, () => {
      expect(d.layout.length).toBe(MAP_H);
      for (const row of d.layout) expect(row.length).toBe(MAP_W);

      // Sealed border.
      for (let x = 0; x < MAP_W; x++) {
        expect(isWalkable(d.layout[0][x])).toBe(false);
        expect(isWalkable(d.layout[MAP_H - 1][x])).toBe(false);
      }
      for (let y = 0; y < MAP_H; y++) {
        expect(isWalkable(d.layout[y][0])).toBe(false);
        expect(isWalkable(d.layout[y][MAP_W - 1])).toBe(false);
      }

      // Player spawn is walkable; a portal exists; enough room for NPCs.
      expect(isWalkable(d.layout[d.spawn[1]][d.spawn[0]])).toBe(true);
      expect(d.layout.some((row) => row.includes('o'))).toBe(true);
      let open = 0;
      for (const row of d.layout) for (const ch of row) if (isWalkable(ch)) open++;
      expect(open).toBeGreaterThan(80);
    });
  }
});

describe('npc generation', () => {
  it('is deterministic for a given seed/day/district', () => {
    const run = newRun(meta, 1234);
    const a = genNpcs(run, DISTRICTS.commons);
    const b = genNpcs(run, DISTRICTS.commons);
    expect(a).toEqual(b);
    const c = genNpcs({ ...run, day: 2 }, DISTRICTS.commons);
    expect(c).not.toEqual(a);
  });

  it('salts a disguised angel into the crowd, deterministically', () => {
    const d = DISTRICTS[DISTRICT_LIST[0]];
    const a = genNpcs(newRun(meta, 4321), d).map((n) => !!n.isAngel);
    const b = genNpcs(newRun(meta, 4321), d).map((n) => !!n.isAngel);
    expect(a).toEqual(b); // same seed, same angel placement

    let anyAngel = false;
    for (let s = 0; s < 60 && !anyAngel; s++) {
      for (const id of DISTRICT_LIST) {
        if (genNpcs(newRun(meta, s), DISTRICTS[id]).some((n) => n.isAngel)) anyAngel = true;
      }
    }
    expect(anyAngel).toBe(true);
  });

  it('produces coherent humans', () => {
    const run = newRun(meta, 99);
    for (const district of DISTRICT_LIST) {
      const npcs = genNpcs({ ...run, seed: 5 }, DISTRICTS[district]);
      expect(npcs.length).toBe(DISTRICTS[district].npcCount);
      for (const n of npcs) {
        expect(n.traits[0]).not.toBe(n.traits[1]);
        expect(n.ick).not.toBe(n.desire);
        const affinities = new Set(n.traits.flatMap((t) => TRAITS[t].keywords));
        expect(affinities.has(n.ick)).toBe(false);
        expect(n.maxWillpower).toBeGreaterThan(15);
        expect(n.maxWillpower).toBeLessThanOrEqual(90);
        expect(n.basePatience).toBeGreaterThanOrEqual(3);
        expect(n.soulValue).toBeGreaterThanOrEqual(1);
        expect(n.soulValue).toBeLessThanOrEqual(3);
      }
    }
  });
});
