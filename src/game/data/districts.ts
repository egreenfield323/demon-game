import type { ArchetypeId } from './archetypes';

/** Tile legend (sprites + themes live in sprites/tiles.ts):
 *  g ground   G ground deco   p path/plaza   r road   s sidewalk
 *  w wall     W roof          d door         n window
 *  t tree     h hedge/fence   l lamp         e bench   f fountain
 *  o portal (walkable; interact to end the day)
 * Maps are built in code so layouts stay exact without hand-counted rows. */

export const MAP_W = 40;
export const MAP_H = 23;

export const SOLID_TILES = new Set(['w', 'W', 'd', 'n', 't', 'h', 'l', 'e', 'f']);

export function isWalkable(ch: string): boolean {
  return !SOLID_TILES.has(ch);
}

class MapGrid {
  g: string[][];

  constructor(fill: string) {
    this.g = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => fill));
  }

  set(x: number, y: number, ch: string): void {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) this.g[y][x] = ch;
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
    this.hline(0, MAP_W - 1, 0, ch);
    this.hline(0, MAP_W - 1, MAP_H - 1, ch);
    this.vline(0, 0, MAP_H - 1, ch);
    this.vline(MAP_W - 1, 0, MAP_H - 1, ch);
  }

  /** Simple boxy building: roof band on top, walls, windows, a door. */
  building(x0: number, y0: number, x1: number, y1: number, doorX: number): void {
    this.rect(x0, y0, x1, y1, 'w');
    this.rect(x0, y0, x1, Math.min(y0 + 1, y1), 'W');
    for (let x = x0 + 1; x < x1; x += 2) this.set(x, y0 + 2, 'n');
    this.set(doorX, y1, 'd');
  }

  scatter(coords: Array<[number, number]>, ch: string): void {
    for (const [x, y] of coords) this.set(x, y, ch);
  }

  rows(): string[] {
    return this.g.map((r) => r.join(''));
  }
}

function buildCommons(): string[] {
  const m = new MapGrid('g');
  m.border('h');
  // Crossing paths with a plaza + fountain in the middle.
  m.hline(1, 38, 11, 'p');
  m.vline(20, 1, 21, 'p');
  m.rect(16, 8, 24, 14, 'p');
  m.rect(19, 10, 21, 12, 'f');
  // Trees.
  m.scatter(
    [
      [4, 3], [9, 2], [14, 4], [27, 3], [33, 2], [36, 5], [6, 6], [30, 6],
      [5, 16], [11, 19], [26, 18], [34, 16], [30, 20], [15, 17], [36, 19], [9, 14],
    ],
    't',
  );
  // Benches face the paths; lamps mark the plaza corners.
  m.scatter([[8, 9], [31, 9], [8, 13], [31, 13], [24, 19], [13, 3]], 'e');
  m.scatter([[16, 7], [24, 7], [16, 15], [24, 15]], 'l');
  // Flower patches.
  m.scatter([[3, 5], [12, 7], [28, 4], [35, 8], [6, 18], [22, 17], [33, 20], [12, 13]], 'G');
  m.set(2, 12, 'o'); // manhole back to hell
  return m.rows();
}

function buildGildport(): string[] {
  const m = new MapGrid('s');
  m.border('w');
  // Glass towers along the top.
  m.building(2, 1, 11, 5, 6);
  m.building(14, 1, 23, 5, 18);
  m.building(26, 1, 37, 5, 31);
  // Crosstown road.
  m.hline(1, 38, 9, 'r');
  m.hline(1, 38, 10, 'r');
  // Lower-corner offices.
  m.building(2, 13, 9, 18, 5);
  m.building(30, 13, 37, 18, 34);
  // Plaza with fountain between them.
  m.rect(13, 14, 26, 20, 'p');
  m.rect(19, 16, 20, 17, 'f');
  m.scatter([[14, 15], [25, 15], [14, 19], [25, 19]], 'l');
  m.scatter([[16, 17], [23, 17]], 'e');
  m.scatter([[4, 8], [12, 8], [20, 8], [28, 8], [36, 8], [8, 11], [24, 11], [32, 11]], 'l');
  m.scatter([[11, 12], [28, 21], [3, 21], [17, 12]], 'G'); // cracked concrete
  m.set(38, 21, 'o');
  return m.rows();
}

function buildStoop(): string[] {
  const m = new MapGrid('s');
  m.border('w');
  // Rowhouses along the top, the bar in the middle.
  m.building(1, 1, 12, 6, 6);
  m.building(13, 1, 26, 6, 20); // THE STOOP (bar)
  m.building(27, 1, 38, 6, 32);
  // Street.
  m.hline(1, 38, 14, 'r');
  m.hline(1, 38, 15, 'r');
  m.hline(1, 38, 16, 'r');
  // Bottom blocks.
  m.building(1, 19, 12, 21, 8);
  m.building(27, 19, 38, 21, 31);
  // Stools and crates outside the bar; lamps down the sidewalk.
  m.scatter([[17, 8], [23, 8], [10, 9], [29, 9]], 'e');
  m.scatter([[4, 13], [14, 13], [24, 13], [34, 13], [9, 7], [30, 7]], 'l');
  m.scatter([[2, 9], [36, 10], [7, 12], [32, 12], [19, 18], [5, 18]], 'G'); // litter
  m.set(2, 17, 'o');
  return m.rows();
}

export type DistrictId = 'commons' | 'stoop' | 'gildport';
export type ThemeId = 'park' | 'city' | 'stoop';

export interface DistrictDef {
  id: DistrictId;
  name: string;
  tagline: string;
  blurb: string;
  danger: 1 | 2 | 3;
  theme: ThemeId;
  archetypes: ArchetypeId[];
  layout: string[];
  /** Player spawn tile. */
  spawn: [number, number];
  npcCount: number;
}

export const DISTRICTS: Record<DistrictId, DistrictDef> = {
  commons: {
    id: 'commons',
    name: 'Murkwell Commons',
    tagline: 'Soft souls, small commissions.',
    blurb: 'Pensioners and burnouts feeding invisible pigeons. Low willpower, low value. A nursery slope for the freshly damned.',
    danger: 1,
    theme: 'park',
    archetypes: ['widow', 'retiree', 'nurse', 'artist'],
    layout: buildCommons(),
    spawn: [4, 11],
    npcCount: 7,
  },
  stoop: {
    id: 'stoop',
    name: 'The Stoop',
    tagline: 'Cheap souls, cheaper whiskey.',
    blurb: 'A dive-bar street where everyone is one bad night from signing anything. Erratic, impatient, but trusting.',
    danger: 2,
    theme: 'stoop',
    archetypes: ['barfly', 'artist', 'nurse', 'founder'],
    layout: buildStoop(),
    spawn: [5, 15],
    npcCount: 7,
  },
  gildport: {
    id: 'gildport',
    name: 'Gildport Financial',
    tagline: 'Hard targets, fat souls.',
    blurb: 'Glass towers full of people who already sold their souls once. High willpower, high suspicion - and the best prices in town.',
    danger: 3,
    theme: 'city',
    archetypes: ['analyst', 'cryptobro', 'founder', 'retiree'],
    layout: buildGildport(),
    spawn: [3, 11],
    npcCount: 7,
  },
};

export const DISTRICT_LIST: DistrictId[] = ['commons', 'stoop', 'gildport'];
