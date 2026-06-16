import { Rng } from '../../engine/rng';
import type { ArchetypeId } from './archetypes';

/** Tile legend (sprites + themes live in sprites/tiles.ts):
 *  g ground   G flowers/deco   p path/plaza   r road/dock   s sidewalk/boards
 *  w wall     W roof           d door         n window
 *  t tree     h hedge/bramble  R rock         F fern/bush
 *  l lamp     e bench/crate    f fountain     c crate        b boat/buoy
 *  a water (impassable; the overworld shimmers it)
 *  o portal (walkable; interact to end the day)
 *
 * Maps are generated per day from a seed, so each world is laid out fresh and
 * grows larger as the run's difficulty climbs. */

export const MAP_MAX_W = 60;
export const MAP_MAX_H = 40;

export const SOLID_TILES = new Set(['w', 'W', 'd', 'n', 't', 'h', 'l', 'e', 'f', 'a', 'R', 'c', 'b']);

export function isWalkable(ch: string): boolean {
  return !SOLID_TILES.has(ch);
}

class MapGrid {
  g: string[][];
  constructor(
    public w: number,
    public h: number,
    fill: string,
  ) {
    this.g = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }
  in(x: number, y: number): boolean {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }
  at(x: number, y: number): string {
    return this.in(x, y) ? this.g[y][x] : 'w';
  }
  set(x: number, y: number, ch: string): void {
    if (this.in(x, y)) this.g[y][x] = ch;
  }
  /** Only paint if the target is currently one of `over` (keeps borders/water intact). */
  setIf(x: number, y: number, ch: string, over: string[]): void {
    if (this.in(x, y) && over.includes(this.g[y][x])) this.g[y][x] = ch;
  }
  hline(x0: number, x1: number, y: number, ch: string): void {
    for (let x = x0; x <= x1; x++) this.set(x, y, ch);
  }
  vline(x: number, y0: number, y1: number, ch: string): void {
    for (let y = y0; y <= y1; y++) this.set(x, y, ch);
  }
  rect(x0: number, y0: number, x1: number, y1: number, ch: string): void {
    for (let y = y0; y <= y1; y++) this.hline(x0, x1, y, ch);
  }
  border(ch: string): void {
    this.hline(0, this.w - 1, 0, ch);
    this.hline(0, this.w - 1, this.h - 1, ch);
    this.vline(0, 0, this.h - 1, ch);
    this.vline(this.w - 1, 0, this.h - 1, ch);
  }
  building(x0: number, y0: number, x1: number, y1: number, doorX: number): void {
    this.rect(x0, y0, x1, y1, 'w');
    this.rect(x0, y0, x1, Math.min(y0 + 1, y1), 'W');
    for (let x = x0 + 1; x < x1; x += 2) this.set(x, y0 + 2, 'n');
    this.set(doorX, y1, 'd');
  }
  /** A clutch of `ch` blobs at random interior spots, on tiles in `over`. */
  clusters(rng: Rng, ch: string, count: number, over: string[]): void {
    for (let i = 0; i < count; i++) {
      const cx = rng.int(2, this.w - 3);
      const cy = rng.int(2, this.h - 3);
      const r = rng.int(0, 1);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) this.setIf(cx + dx, cy + dy, ch, over);
    }
  }
  scatter(rng: Rng, ch: string, count: number, over: string[]): void {
    for (let i = 0; i < count; i++) this.setIf(rng.int(1, this.w - 2), rng.int(1, this.h - 2), ch, over);
  }
  /** Carve a guaranteed L-shaped walkable corridor (overwriting obstacles). */
  carve(x0: number, y0: number, x1: number, y1: number, ch: string): void {
    this.hline(Math.min(x0, x1), Math.max(x0, x1), y0, ch);
    this.vline(x1, Math.min(y0, y1), Math.max(y0, y1), ch);
  }
  rows(): string[] {
    return this.g.map((r) => r.join(''));
  }
}

export interface GenResult {
  layout: string[];
  spawn: [number, number];
}
type Gen = (w: number, h: number, rng: Rng) => GenResult;

// --- Per-world generators (each a distinct silhouette) ---

const genPark: Gen = (w, h, rng) => {
  const m = new MapGrid(w, h, 'g');
  m.border('h');
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  // Crossing avenues + a central plaza & fountain.
  m.hline(1, w - 2, cy, 'p');
  m.vline(cx, 1, h - 2, 'p');
  m.rect(cx - 4, cy - 3, cx + 4, cy + 3, 'p');
  m.rect(cx - 1, cy - 1, cx + 1, cy + 1, 'f');
  // A couple of meandering side paths.
  for (let k = 0; k < 3; k++) m.hline(rng.int(1, cx), rng.int(cx, w - 2), rng.int(2, h - 3), 'p');
  // Tree clumps, flower beds, ferns on the grass only.
  m.clusters(rng, 't', Math.floor((w * h) / 70), ['g']);
  m.scatter(rng, 'G', Math.floor((w * h) / 60), ['g']);
  m.scatter(rng, 'F', Math.floor((w * h) / 80), ['g']);
  m.scatter(rng, 'R', 4, ['g']);
  m.scatter(rng, 'e', 5, ['p']);
  m.scatter(rng, 'l', 6, ['p']);
  m.set(2, cy, 'p');
  m.set(w - 3, cy, 'o');
  return { layout: m.rows(), spawn: [2, cy] };
};

const genCity: Gen = (w, h, rng) => {
  const m = new MapGrid(w, h, 's');
  m.border('w');
  // A grid of glass towers with a lattice of narrow streets between them.
  const bw = 6;
  const bh = 4;
  for (let by = 2; by + bh < h - 2; by += bh + 2) {
    for (let bx = 2; bx + bw < w - 2; bx += bw + 2) {
      m.hline(bx - 1, bx + bw, by + bh + 1, 'r'); // street below the block
      if (rng.chance(0.85)) m.building(bx, by, bx + bw - 1, by + bh - 1, bx + Math.floor(bw / 2));
    }
  }
  // Lamps along the streets, a few cracked planters.
  m.scatter(rng, 'l', Math.floor((w * h) / 70), ['r']);
  m.scatter(rng, 'G', Math.floor((w * h) / 90), ['s', 'r']);
  m.set(2, 2, 's');
  m.carve(2, 2, w - 3, h - 3, 's'); // guarantee a route through the lattice
  m.set(w - 3, h - 3, 'o');
  return { layout: m.rows(), spawn: [2, 2] };
};

const genStoop: Gen = (w, h, rng) => {
  const m = new MapGrid(w, h, 's');
  m.border('w');
  const midY = Math.floor(h / 2);
  // A tight strip: rowhouses crammed top and bottom, a road down the middle.
  for (let bx = 1; bx + 5 < w - 1; bx += 6) {
    m.building(bx, 1, bx + 5, Math.max(4, midY - 3), bx + 3);
    m.building(bx, Math.min(h - 2, midY + 3), bx + 5, h - 2, bx + 3);
  }
  m.rect(1, midY - 1, w - 2, midY + 1, 'r');
  // Stoops, crates and litter spilling onto the street.
  m.scatter(rng, 'e', Math.floor(w / 5), ['s']);
  m.scatter(rng, 'c', Math.floor(w / 6), ['s']);
  m.scatter(rng, 'G', Math.floor((w * h) / 80), ['s', 'r']);
  m.scatter(rng, 'l', Math.floor(w / 7), ['s']);
  m.set(2, midY, 'r');
  m.set(w - 3, midY, 'o');
  return { layout: m.rows(), spawn: [2, midY] };
};

const genForest: Gen = (w, h, rng) => {
  const m = new MapGrid(w, h, 'g');
  m.border('t');
  // Deep woods: dense tree clusters with a few clearings and a still pond.
  m.clusters(rng, 't', Math.floor((w * h) / 22), ['g']);
  const px = rng.int(Math.floor(w * 0.3), Math.floor(w * 0.6));
  const py = rng.int(Math.floor(h * 0.3), Math.floor(h * 0.6));
  m.rect(px, py, px + 4, py + 3, 'a'); // pond
  // A cabin tucked in the trees.
  const cbx = rng.int(3, w - 10);
  m.building(cbx, 2, cbx + 6, 6, cbx + 3);
  // Toadstools, ferns, rocks, logs.
  m.scatter(rng, 'G', Math.floor((w * h) / 55), ['g']);
  m.scatter(rng, 'F', Math.floor((w * h) / 40), ['g']);
  m.scatter(rng, 'R', Math.floor((w * h) / 70), ['g']);
  // Winding trails + a guaranteed route from spawn to the manhole.
  const sx = 2;
  const sy = Math.floor(h / 2);
  m.set(sx, sy, 'p');
  m.carve(sx, sy, w - 3, h - 3, 'p');
  m.carve(sx, sy, Math.floor(w / 2), 3, 'p');
  m.set(w - 3, h - 3, 'o');
  return { layout: m.rows(), spawn: [sx, sy] };
};

const genMarina: Gen = (w, h, rng) => {
  const m = new MapGrid(w, h, 's');
  m.border('w');
  // Shacks along the top.
  for (let bx = 2; bx + 6 < w - 2; bx += 10) m.building(bx, 1, bx + 6, 5, bx + 3);
  // A tidal channel splits the boards; a plank dock is the only crossing.
  const chY = Math.floor(h * 0.45);
  m.rect(1, chY, w - 2, chY + 2, 'a');
  const dockX = rng.int(Math.floor(w * 0.3), Math.floor(w * 0.6));
  m.rect(dockX, chY, dockX + 3, chY + 2, 'r');
  // A second short channel for flavour (with its own crossing), bigger maps only.
  if (w > 44) {
    const cx2 = rng.int(Math.floor(w * 0.65), w - 6);
    m.rect(cx2, chY + 4, cx2 + 2, h - 3, 'a');
    m.rect(cx2, h - 5, cx2 + 2, h - 4, 'r');
  }
  // Piers, crates, boats, lamps.
  m.vline(6, chY, chY + 2, 'r');
  m.vline(w - 7, chY, chY + 2, 'r');
  m.hline(2, w - 3, h - 4, 'r'); // lower boardwalk
  m.scatter(rng, 'c', Math.floor(w / 6), ['s']);
  m.scatter(rng, 'l', Math.floor(w / 6), ['s', 'r']);
  m.scatter(rng, 'e', 4, ['s']);
  const sx = Math.floor(w / 2);
  m.set(sx, 7, 's');
  m.set(Math.floor(w / 2), h - 3, 'o');
  return { layout: m.rows(), spawn: [sx, 7] };
};

export type DistrictId = 'commons' | 'stoop' | 'gildport' | 'hollow' | 'tidewater';
export type ThemeId = 'park' | 'city' | 'stoop' | 'forest' | 'marina';

export interface DistrictDef {
  id: DistrictId;
  name: string;
  tagline: string;
  blurb: string;
  danger: 1 | 2 | 3;
  /** <1 = the locals fall more easily. Run difficulty scales on top of this. */
  softness: number;
  theme: ThemeId;
  archetypes: ArchetypeId[];
  /** Base map size [w, h]; grows with difficulty (see worldSize). */
  base: [number, number];
  npcCount: number;
  gen: Gen;
}

export const DISTRICTS: Record<DistrictId, DistrictDef> = {
  commons: {
    id: 'commons', name: 'Murkwell Commons', tagline: 'Soft souls in a quiet park.',
    blurb: 'Pensioners and burnouts feeding invisible pigeons. Gentle, lonely, easily moved.',
    danger: 1, softness: 0.85, theme: 'park', archetypes: ['widow', 'retiree', 'nurse', 'artist'],
    base: [40, 24], npcCount: 7, gen: genPark,
  },
  stoop: {
    id: 'stoop', name: 'The Stoop', tagline: 'A tight dive-bar block.',
    blurb: 'A cramped street where everyone is one bad night from signing anything. Erratic, impatient, trusting.',
    danger: 2, softness: 0.95, theme: 'stoop', archetypes: ['barfly', 'artist', 'nurse', 'founder'],
    base: [34, 20], npcCount: 7, gen: genStoop,
  },
  gildport: {
    id: 'gildport', name: 'Gildport Financial', tagline: 'A maze of glass towers.',
    blurb: 'Block after block of people who already sold their souls once. High willpower, high suspicion.',
    danger: 3, softness: 1.0, theme: 'city', archetypes: ['analyst', 'cryptobro', 'founder', 'retiree'],
    base: [46, 28], npcCount: 8, gen: genCity,
  },
  hollow: {
    id: 'hollow', name: 'The Hollow', tagline: 'Deep, tangled old woods.',
    blurb: 'Folk who live close to the trees. Superstitious, plain-spoken, quick to believe kind eyes.',
    danger: 1, softness: 0.78, theme: 'forest', archetypes: ['widow', 'retiree', 'barfly', 'artist'],
    base: [38, 30], npcCount: 7, gen: genForest,
  },
  tidewater: {
    id: 'tidewater', name: 'Tidewater Pier', tagline: 'A wide marina cut by water.',
    blurb: 'A weathered marina. Mind the tidal channels - only the docks cross them. Dreamers and washed-up hustlers.',
    danger: 2, softness: 0.95, theme: 'marina', archetypes: ['artist', 'founder', 'cryptobro', 'nurse'],
    base: [50, 24], npcCount: 7, gen: genMarina,
  },
};

export const DISTRICT_LIST: DistrictId[] = ['commons', 'stoop', 'gildport', 'hollow', 'tidewater'];

/** Map grows with difficulty, up to the canvas maximums. */
export function worldSize(def: DistrictDef, difficulty: number): [number, number] {
  const s = 1 + Math.min(0.5, (difficulty - 1) * 0.04);
  const w = Math.min(MAP_MAX_W, Math.max(def.base[0], Math.round(def.base[0] * s)));
  const h = Math.min(MAP_MAX_H, Math.max(def.base[1], Math.round(def.base[1] * s)));
  return [w, h];
}

/** Pick the next world at random, avoiding an immediate repeat. */
export function pickWorld(rng: { int: (a: number, b: number) => number }, avoid?: DistrictId): DistrictId {
  const pool = avoid ? DISTRICT_LIST.filter((w) => w !== avoid) : DISTRICT_LIST;
  return pool[rng.int(0, pool.length - 1)];
}
