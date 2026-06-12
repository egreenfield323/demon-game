import { hashStr } from '../../../engine/rng';
import { makeSprite, type Sprite } from '../../../engine/types';
import type { ThemeId } from '../districts';

export const TILE = 16;

/** Deterministic speckled texture tile (grass, asphalt, concrete...). */
function texTile(id: string, base: string, dark: string, light: string, density = 0.08): Sprite {
  const seed = hashStr(id);
  const grid: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = '';
    for (let x = 0; x < TILE; x++) {
      const h = (Math.imul(x + 7, 374761393) ^ Math.imul(y + 13, 668265263) ^ seed) >>> 0;
      const v = (h % 1000) / 1000;
      row += v < density ? '2' : v < density * 2 ? '3' : '1';
    }
    grid.push(row);
  }
  return makeSprite(grid, { '1': base, '2': dark, '3': light }, id);
}

/** Brick/panel wall with mortar lines. */
function wallTile(id: string, brick: string, mortar: string, shade: string): Sprite {
  const grid: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = '';
    const courseLine = y % 4 === 3;
    const offset = Math.floor(y / 4) % 2 === 0 ? 0 : 4;
    for (let x = 0; x < TILE; x++) {
      if (courseLine) row += '2';
      else if ((x + offset) % 8 === 7) row += '2';
      else row += y % 4 === 0 ? '3' : '1';
    }
    grid.push(row);
  }
  return makeSprite(grid, { '1': brick, '2': mortar, '3': shade }, id);
}

function roofTile(id: string, base: string, edge: string, dark: string): Sprite {
  const grid: string[] = [];
  for (let y = 0; y < TILE; y++) {
    grid.push((y === 0 ? '3' : y % 5 === 4 ? '2' : '1').repeat(TILE));
  }
  return makeSprite(grid, { '1': base, '2': dark, '3': edge }, id);
}

const WINDOW_GRID = [
  '1111111111111111',
  '1111111111111111',
  '1444444444444441',
  '1433333333333341',
  '1433333333333341',
  '1433222333333341',
  '1433333333333341',
  '1444444444444441',
  '1433333333333341',
  '1433333333333341',
  '1433333333333341',
  '1433333333333341',
  '1444444444444441',
  '1111111111111111',
  '1111111111111111',
  '1111111111111111',
];

const DOOR_GRID = [
  '4444444444444444',
  '4222222222222224',
  '4233333333333324',
  '4232222222222324',
  '4232222222222324',
  '4232222222222324',
  '4232222222222324',
  '4232222222y22324',
  '4232222222y22324',
  '4232222222222324',
  '4232222222222324',
  '4232222222222324',
  '4232222222222324',
  '4233333333333324',
  '4222222222222224',
  '4222222222222224',
];

const TREE_GRID = [
  '.....111111.....',
  '...1112221111...',
  '..112222222211..',
  '..122223322221..',
  '.11222333322211.',
  '.12223333332221.',
  '.12233333333221.',
  '..122333333221..',
  '..112233332211..',
  '...1122332211...',
  '....11222211....',
  '.......45.......',
  '.......45.......',
  '.......45.......',
  '......4455......',
  '.....445555.....',
];

const LAMP_GRID = [
  '......kyyk......',
  '.....kyyyyk.....',
  '......kyyk......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '......kkkk......',
  '................',
  '................',
];

const BENCH_GRID = [
  '................',
  '................',
  '................',
  '..555555555555..',
  '..544444444445..',
  '..544444444445..',
  '..555555555555..',
  '..544444444445..',
  '..544444444445..',
  '..55........55..',
  '..55........55..',
  '..55........55..',
  '................',
  '................',
  '................',
  '................',
];

const FOUNTAIN_GRID = [
  '5555555555555555',
  '5444444444444445',
  '5411111111111145',
  '5411211111121145',
  '5411111211111145',
  '5411111111111145',
  '5412111111112145',
  '5411111121111145',
  '5411111111111145',
  '5411121111111145',
  '5411111111211145',
  '5411111111111145',
  '5411112111111145',
  '5411111111111145',
  '5444444444444445',
  '5555555555555555',
];

const PORTAL_GRID = [
  '................',
  '................',
  '................',
  '....kkkkkkkk....',
  '..kkrrrrrrrrkk..',
  '..krryyyyyyrrk..',
  '..krryykkyyrrk..',
  '..krryykkyyrrk..',
  '..krryyyyyyrrk..',
  '..kkrrrrrrrrkk..',
  '....kkkkkkkk....',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const FLOWERS_GRID = [
  '................',
  '....y...........',
  '...yry.....m....',
  '....y.....mwm...',
  '...........m....',
  '................',
  '.m..............',
  'mwm.......y.....',
  '.m.......yry....',
  '..........y.....',
  '................',
  '......m.........',
  '.....mwm....y...',
  '......m....yry..',
  '............y...',
  '................',
];

const CRACK_GRID = [
  '................',
  '................',
  '....k...........',
  '.....k..........',
  '.....k..........',
  '......kk........',
  '........k.......',
  '........k.......',
  '.........kk.....',
  '...........k....',
  '...........k....',
  '..........k.....',
  '................',
  '................',
  '................',
  '................',
];

const LITTER_GRID = [
  '................',
  '................',
  '...ww...........',
  '...w............',
  '................',
  '..........y.....',
  '.........yy.....',
  '................',
  '................',
  '....k...........',
  '...kk...........',
  '................',
  '..........ww....',
  '...........w....',
  '................',
  '................',
];

export interface TileSet {
  /** Base ground drawn under everything. */
  ground: Sprite;
  /** Per-char tile; overlay tiles render on top of ground. */
  tiles: Record<string, { spr: Sprite; overlay: boolean }>;
}

function hedge(id: string): Sprite {
  return texTile(id, '#2e5230', '#243f26', '#3f6b40', 0.18);
}

export function buildTileSet(theme: ThemeId): TileSet {
  const overlayPal = {
    k: '#221c26',
    y: '#ffd870',
    r: '#c03a3a',
    w: '#e8e4dc',
    m: '#d06ab0',
  };
  const tree = makeSprite(TREE_GRID, { '1': '#274d2a', '2': '#346436', '3': '#4a8a4c', '4': '#6a4a32', '5': '#54382a' }, `tree-${theme}`);
  const lamp = makeSprite(LAMP_GRID, overlayPal, `lamp-${theme}`);
  const bench = makeSprite(BENCH_GRID, { '4': '#8a623c', '5': '#684a2e' }, `bench-${theme}`);
  const portal = makeSprite(PORTAL_GRID, { k: '#1a1016', r: '#b8332e', y: '#ff9a3a' }, `portal-${theme}`);
  const fountain = makeSprite(FOUNTAIN_GRID, { '1': '#3a6ea8', '2': '#7ab8e8', '4': '#9a9aa6', '5': '#6e6e7c' }, `fountain-${theme}`);

  if (theme === 'park') {
    const ground = texTile('park-grass', '#3e6e3a', '#34602f', '#4c7f46', 0.1);
    return {
      ground,
      tiles: {
        p: { spr: texTile('park-path', '#a8895c', '#937650', '#bb9a6a', 0.09), overlay: false },
        G: { spr: makeSprite(FLOWERS_GRID, overlayPal, 'park-flowers'), overlay: true },
        h: { spr: hedge('park-hedge'), overlay: false },
        t: { spr: tree, overlay: true },
        l: { spr: lamp, overlay: true },
        e: { spr: bench, overlay: true },
        f: { spr: fountain, overlay: false },
        o: { spr: portal, overlay: true },
      },
    };
  }

  if (theme === 'city') {
    const ground = texTile('city-walk', '#9a9aa2', '#88888f', '#ababb4', 0.05);
    return {
      ground,
      tiles: {
        r: { spr: texTile('city-road', '#46464e', '#3c3c44', '#52525a', 0.06), overlay: false },
        p: { spr: texTile('city-plaza', '#8a8a94', '#7a7a84', '#9a9aa4', 0.06), overlay: false },
        G: { spr: makeSprite(CRACK_GRID, overlayPal, 'city-crack'), overlay: true },
        w: { spr: wallTile('city-wall', '#5a6e8a', '#46566c', '#6c829e', ), overlay: false },
        W: { spr: roofTile('city-roof', '#3a4456', '#52607a', '#2e3644'), overlay: false },
        n: { spr: makeSprite(WINDOW_GRID, { '1': '#5a6e8a', '3': '#9ad8e8', '2': '#cef0f8', '4': '#3c4a60' }, 'city-window'), overlay: false },
        d: { spr: makeSprite(DOOR_GRID, { '2': '#3c4a60', '3': '#5a87a8', y: '#ffd870', '4': '#2e3644' }, 'city-door'), overlay: false },
        l: { spr: lamp, overlay: true },
        e: { spr: bench, overlay: true },
        f: { spr: fountain, overlay: false },
        o: { spr: portal, overlay: true },
      },
    };
  }

  // stoop
  const ground = texTile('stoop-walk', '#8a8078', '#7a7068', '#9a9088', 0.07);
  return {
    ground,
    tiles: {
      r: { spr: texTile('stoop-road', '#42403e', '#383634', '#4e4c4a', 0.07), overlay: false },
      G: { spr: makeSprite(LITTER_GRID, overlayPal, 'stoop-litter'), overlay: true },
      w: { spr: wallTile('stoop-wall', '#7a4434', '#5e3428', '#8e5440'), overlay: false },
      W: { spr: roofTile('stoop-roof', '#4a3a36', '#5e4a44', '#3a2e2a'), overlay: false },
      n: { spr: makeSprite(WINDOW_GRID, { '1': '#7a4434', '3': '#ffc860', '2': '#ffe8a0', '4': '#4a2c22' }, 'stoop-window'), overlay: false },
      d: { spr: makeSprite(DOOR_GRID, { '2': '#5a3a26', '3': '#6e4a30', y: '#ffd870', '4': '#3a2418' }, 'stoop-door'), overlay: false },
      l: { spr: lamp, overlay: true },
      e: { spr: bench, overlay: true },
      f: { spr: fountain, overlay: false },
      o: { spr: portal, overlay: true },
    },
  };
}
