import { describe, expect, it } from 'vitest';
import { Rng } from '../engine/rng';
import { DISTRICT_LIST, DISTRICTS, isWalkable, worldSize } from '../game/data/districts';
import { TRAITS } from '../game/data/traits';
import { genNpcs } from '../game/sim/npcgen';
import { newRun } from '../game/sim/run';
import type { MetaState } from '../game/sim/state';

const meta: MetaState = { sinPoints: 0, upgrades: [], runs: 0, wins: 0, soulsAllTime: 0, bestDay: 0, seenIntro: true };

describe('world generators', () => {
  for (const id of DISTRICT_LIST) {
    const d = DISTRICTS[id];
    // Validate at the base size and a scaled-up (late-run) size.
    for (const diff of [1, 12]) {
      it(`${id} generates a valid map at difficulty ${diff}`, () => {
        const [w, h] = worldSize(d, diff);
        const { layout, spawn } = d.gen(w, h, new Rng(`test:${id}:${diff}`));

        expect(layout.length).toBe(h);
        for (const row of layout) expect(row.length).toBe(w);

        // Sealed border.
        for (let x = 0; x < w; x++) {
          expect(isWalkable(layout[0][x])).toBe(false);
          expect(isWalkable(layout[h - 1][x])).toBe(false);
        }
        for (let y = 0; y < h; y++) {
          expect(isWalkable(layout[y][0])).toBe(false);
          expect(isWalkable(layout[y][w - 1])).toBe(false);
        }

        // Player spawn is walkable; a portal exists; plenty of open room.
        expect(isWalkable(layout[spawn[1]][spawn[0]])).toBe(true);
        expect(layout.some((row) => row.includes('o'))).toBe(true);
        let open = 0;
        for (const row of layout) for (const ch of row) if (isWalkable(ch)) open++;
        expect(open).toBeGreaterThan(80);
      });
    }
  }

  for (const id of DISTRICT_LIST) {
    for (const diff of [1, 8, 14]) {
      it(`${id} keeps the exit reachable at difficulty ${diff}`, () => {
        const d = DISTRICTS[id];
        const [w, h] = worldSize(d, diff);
        const { layout, spawn } = d.gen(w, h, new Rng(`reach:${id}:${diff}`));
        // Flood-fill walkable tiles from the spawn; the portal must be reached.
        const seen = new Set<string>();
        const stack = [spawn];
        let reachedPortal = false;
        while (stack.length) {
          const [x, y] = stack.pop()!;
          const key = `${x},${y}`;
          if (x < 0 || y < 0 || x >= w || y >= h || seen.has(key)) continue;
          if (!isWalkable(layout[y][x])) continue;
          seen.add(key);
          if (layout[y][x] === 'o') reachedPortal = true;
          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        expect(reachedPortal).toBe(true);
      });
    }
  }

  it('bigger difficulty yields a bigger map', () => {
    const small = worldSize(DISTRICTS.gildport, 1);
    const big = worldSize(DISTRICTS.gildport, 12);
    expect(big[0] * big[1]).toBeGreaterThan(small[0] * small[1]);
  });
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

  it('marks toughen as the run wears on', () => {
    const run = newRun(meta, 77);
    const sum = (ns: ReturnType<typeof genNpcs>): number => ns.reduce((a, n) => a + n.maxWillpower, 0);
    const early = sum(genNpcs({ ...run, day: 1 }, DISTRICTS.gildport));
    const late = sum(genNpcs({ ...run, day: 7 }, DISTRICTS.gildport));
    expect(late).toBeGreaterThan(early);
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
