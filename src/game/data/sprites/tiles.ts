import { hashStr } from '../../../engine/rng';
import { makeSprite, type Sprite } from '../../../engine/types';
import type { ThemeId } from '../districts';

export const TILE = 16;

const hash2 = (x: number, y: number, seed: number): number =>
  ((Math.imul(x + 7, 374761393) ^ Math.imul(y + 13, 668265263) ^ seed) >>> 0) % 1000 / 1000;

/** Deterministic ground texture with fine speckle AND soft low-frequency
 * patches, so grass/asphalt/etc read as varied terrain instead of flat noise. */
function texTile(id: string, base: string, dark: string, light: string, density = 0.08): Sprite {
  const seed = hashStr(id);
  const grid: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = '';
    for (let x = 0; x < TILE; x++) {
      const v = hash2(x, y, seed); // fine grain
      const patch = hash2(Math.floor(x / 3), Math.floor(y / 3), seed ^ 0x9e37); // soft blotches
      let ch = '1';
      if (v < density) ch = '2';
      else if (v < density * 2) ch = '3';
      else if (patch < 0.14) ch = '3';
      else if (patch > 0.9) ch = '2';
      row += ch;
    }
    grid.push(row);
  }
  return makeSprite(grid, { '1': base, '2': dark, '3': light }, id);
}

/** Grass with scattered upright blades for a lusher look. */
function grassTile(id: string, base: string, dark: string, light: string, blade: string): Sprite {
  const seed = hashStr(id);
  const grid: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = '';
    for (let x = 0; x < TILE; x++) {
      const v = hash2(x, y, seed);
      const patch = hash2(Math.floor(x / 4), Math.floor(y / 4), seed ^ 0x51a);
      // blades: a short vertical pair seeded sparsely
      const bl = hash2(x, Math.floor(y / 2), seed ^ 0x2c9) < 0.04 && y % 2 === 0;
      let ch = patch < 0.16 ? '3' : patch > 0.88 ? '2' : '1';
      if (v < 0.05) ch = '2';
      if (bl) ch = '4';
      row += ch;
    }
    grid.push(row);
  }
  return makeSprite(grid, { '1': base, '2': dark, '3': light, '4': blade }, id);
}

/** Wooden planks with seams + joints (boardwalks, docks). */
function plankTile(id: string, base: string, dark: string, light: string): Sprite {
  const seed = hashStr(id);
  const grid: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = '';
    const seam = y % 5 === 4;
    for (let x = 0; x < TILE; x++) {
      if (seam) row += '2';
      else if ((x + Math.floor(y / 5) * 3) % 11 === 0) row += '2'; // staggered joints
      else if (hash2(x, y, seed) < 0.06) row += '3';
      else row += y % 5 === 0 ? '3' : '1';
    }
    grid.push(row);
  }
  return makeSprite(grid, { '1': base, '2': dark, '3': light }, id);
}

/** Rippling water with drifting wave crests. */
function waterTile(id: string): Sprite {
  const grid: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = '';
    for (let x = 0; x < TILE; x++) {
      const wave = Math.sin((x + y * 0.5) * 0.9 + y) + Math.sin(x * 0.5 - y * 0.7);
      row += wave > 1.3 ? '3' : wave < -1.3 ? '2' : '1';
    }
    grid.push(row);
  }
  return makeSprite(grid, { '1': '#2a5a86', '2': '#1d4670', '3': '#5a9ad0' }, id);
}

/** Brick wall with mortar, a shaded top course and a highlight per brick. */
function wallTile(id: string, brick: string, mortar: string, shade: string, hi: string): Sprite {
  const grid: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = '';
    const courseLine = y % 4 === 3;
    const topOfBrick = y % 4 === 0;
    const offset = Math.floor(y / 4) % 2 === 0 ? 0 : 4;
    for (let x = 0; x < TILE; x++) {
      const joint = (x + offset) % 8 === 7;
      if (courseLine || joint) row += '2';
      else if (topOfBrick) row += '4'; // sunlit top edge
      else if ((x + offset) % 8 === 0) row += '3'; // shadowed left edge
      else row += '1';
    }
    grid.push(row);
  }
  return makeSprite(grid, { '1': brick, '2': mortar, '3': shade, '4': hi }, id);
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

function water(id: string): Sprite {
  return waterTile(id);
}

const ROCK_GRID = [
  '................',
  '................',
  '.....22222......',
  '...223111122....',
  '..23111111122...',
  '..2111111111 2..',
  '.2311111111112..',
  '.2111131111112..',
  '.2111111113112..',
  '..2111111111 2..',
  '..2211111111 2..',
  '...2222222222...',
  '................',
  '................',
  '................',
  '................',
];

const FERN_GRID = [
  '................',
  '................',
  '.......2........',
  '...2...2...2....',
  '....2..2..2.....',
  '....22.2.22.....',
  '.....22222......',
  '..2...222...2...',
  '...2..212..2....',
  '....2.212.2.....',
  '.....22122......',
  '.......1........',
  '.......1........',
  '................',
  '................',
  '................',
];

const CRATE_GRID = [
  '................',
  '.5444444444445..',
  '.4533333333354..',
  '.4355333333534..',
  '.4335533335334..',
  '.4333553355334..',
  '.4333355533334..',
  '.4333553355334..',
  '.4335533335334..',
  '.4355333333534..',
  '.4533333333354..',
  '.5444444444445..',
  '................',
  '................',
  '................',
  '................',
];

const BOAT_GRID = [
  '.......5........',
  '.......5........',
  '.......5........',
  '......555.......',
  '.......5........',
  '.......5........',
  '.4444444444444..',
  '.4333333333334..',
  '..43333333334...',
  '...433333334....',
  '....44444444....',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const rockSprite = makeSprite(ROCK_GRID, { '1': '#7a7a82', '2': '#3e3e46', '3': '#9a9aa4' }, 'rock');
const fernSprite = makeSprite(FERN_GRID, { '1': '#2e4a22', '2': '#4e7a36' }, 'fern');
const crateSprite = makeSprite(CRATE_GRID, { '3': '#8a623c', '4': '#5a4028', '5': '#a8804e' }, 'crate');
const boatSprite = makeSprite(BOAT_GRID, { '3': '#7a5e3c', '4': '#54402a', '5': '#cfc6b4' }, 'boat');
/** The moored rowboat — drawn as a bobbing scene prop on the water, not a tile. */
export const BOAT_SPRITE = boatSprite;

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

  const rock = { spr: rockSprite, overlay: true };
  const fern = { spr: fernSprite, overlay: true };
  const crate = { spr: crateSprite, overlay: true };
  const boat = { spr: boatSprite, overlay: true };

  if (theme === 'park') {
    const ground = grassTile('park-grass', '#3e6e3a', '#2f5a2c', '#4f8448', '#5ea050');
    return {
      ground,
      tiles: {
        p: { spr: texTile('park-path', '#a8895c', '#937650', '#bb9a6a', 0.09), overlay: false },
        G: { spr: makeSprite(FLOWERS_GRID, overlayPal, 'park-flowers'), overlay: true },
        h: { spr: hedge('park-hedge'), overlay: false },
        t: { spr: tree, overlay: true },
        R: rock,
        F: fern,
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
        w: { spr: wallTile('city-wall', '#5a6e8a', '#46566c', '#46566c', '#7e93ad'), overlay: false },
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

  if (theme === 'forest') {
    const ground = grassTile('forest-moss', '#2c4a2c', '#1f3b20', '#3a5e38', '#46743e');
    return {
      ground,
      tiles: {
        p: { spr: texTile('forest-dirt', '#6a543a', '#574630', '#7c6446', 0.1), overlay: false },
        G: { spr: makeSprite(FLOWERS_GRID, { ...overlayPal, m: '#c84a3a', w: '#e8e0d0' }, 'forest-shrooms'), overlay: true },
        h: { spr: hedge('forest-bramble'), overlay: false },
        t: { spr: tree, overlay: true },
        R: rock,
        F: fern,
        a: { spr: water('forest-pond'), overlay: false },
        w: { spr: wallTile('forest-wall', '#6a4a30', '#503826', '#3e2c1c', '#86643e'), overlay: false },
        W: { spr: roofTile('forest-roof', '#3e3026', '#52423a', '#2e241c'), overlay: false },
        n: { spr: makeSprite(WINDOW_GRID, { '1': '#6a4a30', '3': '#ffce6a', '2': '#ffe8a0', '4': '#3a2818' }, 'forest-window'), overlay: false },
        d: { spr: makeSprite(DOOR_GRID, { '2': '#503826', '3': '#6a4a30', y: '#ffd870', '4': '#2e2014' }, 'forest-door'), overlay: false },
        l: { spr: lamp, overlay: true },
        e: { spr: bench, overlay: true },
        f: { spr: fountain, overlay: false },
        o: { spr: portal, overlay: true },
      },
    };
  }

  if (theme === 'marina') {
    const ground = plankTile('marina-board', '#9a7a52', '#6e5436', '#b09064');
    return {
      ground,
      tiles: {
        r: { spr: plankTile('marina-dock', '#7a5e3c', '#54402a', '#8e7048'), overlay: false },
        a: { spr: water('marina-sea'), overlay: false },
        G: { spr: makeSprite(LITTER_GRID, overlayPal, 'marina-litter'), overlay: true },
        c: crate,
        b: boat,
        w: { spr: wallTile('marina-wall', '#5a6a6a', '#46545a', '#36444a', '#7c8e8e'), overlay: false },
        W: { spr: roofTile('marina-roof', '#3a4a4a', '#4e6060', '#2e3a3a'), overlay: false },
        n: { spr: makeSprite(WINDOW_GRID, { '1': '#5a6a6a', '3': '#8ad0d8', '2': '#cdeef0', '4': '#3a4a4a' }, 'marina-window'), overlay: false },
        d: { spr: makeSprite(DOOR_GRID, { '2': '#46545a', '3': '#5a6a6a', y: '#ffd870', '4': '#2e3a3a' }, 'marina-door'), overlay: false },
        l: { spr: lamp, overlay: true },
        e: { spr: bench, overlay: true },
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
      c: crate,
      w: { spr: wallTile('stoop-wall', '#7a4434', '#5e3428', '#46241a', '#9a6048'), overlay: false },
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
