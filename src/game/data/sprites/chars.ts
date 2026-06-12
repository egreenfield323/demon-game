import { makeSprite, type Sprite } from '../../../engine/types';

/** 16x20 character bodies, two walk frames per facing. Palette chars:
 * h hair, s skin, c clothes, p pants, b boots, t accent, o eyes. */

export const CHAR_W = 16;
export const CHAR_H = 20;

const DOWN_A = [
  '....hhhhhhhh....',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhsssssshh...',
  '...hssssssssh...',
  '...hssossossh...',
  '...hssssssssh...',
  '....ssssssss....',
  '.....ssssss.....',
  '....cccccccc....',
  '...cccccccccc...',
  '..sccccttccccs..',
  '..sccccttccccs..',
  '...cccccccccc...',
  '...pppppppppp...',
  '....pppppppp....',
  '....ppp..ppp....',
  '....ppp..ppp....',
  '....bbb..bbb....',
  '...bbbb..bbbb...',
];

const DOWN_B = [
  '....hhhhhhhh....',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhsssssshh...',
  '...hssssssssh...',
  '...hssossossh...',
  '...hssssssssh...',
  '....ssssssss....',
  '.....ssssss.....',
  '....cccccccc....',
  '...cccccccccc...',
  '..sccccttccccs..',
  '..sccccttccccs..',
  '...cccccccccc...',
  '...pppppppppp...',
  '....pppppppp....',
  '....ppp..ppp....',
  '...ppp....ppp...',
  '...bbb....bbb...',
  '..bbb......bbb..',
];

const UP_A = [
  '....hhhhhhhh....',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '....hhhhhhhh....',
  '.....ssssss.....',
  '....cccccccc....',
  '...cccccccccc...',
  '..sccccccccccs..',
  '..sccccccccccs..',
  '...cccccccccc...',
  '...pppppppppp...',
  '....pppppppp....',
  '....ppp..ppp....',
  '....ppp..ppp....',
  '....bbb..bbb....',
  '...bbbb..bbbb...',
];

const UP_B = [
  '....hhhhhhhh....',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '....hhhhhhhh....',
  '.....ssssss.....',
  '....cccccccc....',
  '...cccccccccc...',
  '..sccccccccccs..',
  '..sccccccccccs..',
  '...cccccccccc...',
  '...pppppppppp...',
  '....pppppppp....',
  '....ppp..ppp....',
  '...ppp....ppp...',
  '...bbb....bbb...',
  '..bbb......bbb..',
];

const SIDE_A = [
  '....hhhhhhhh....',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...ssshhhhhhh...',
  '...sssshhhhhh...',
  '...ossshhhhhh...',
  '...sssshhhhhh...',
  '....ssshhhhh....',
  '.....sssshh.....',
  '....cccccccc....',
  '...cccccccccc...',
  '...sccccccccc...',
  '...sccccccccc...',
  '...cccccccccc...',
  '...pppppppppp...',
  '....pppppppp....',
  '.....pppppp.....',
  '.....pppppp.....',
  '.....bbbbbb.....',
  '....bbbbbbb.....',
];

const SIDE_B = [
  '....hhhhhhhh....',
  '...hhhhhhhhhh...',
  '...hhhhhhhhhh...',
  '...ssshhhhhhh...',
  '...sssshhhhhh...',
  '...ossshhhhhh...',
  '...sssshhhhhh...',
  '....ssshhhhh....',
  '.....sssshh.....',
  '....cccccccc....',
  '...cccccccccc...',
  '...sccccccccc...',
  '...sccccccccc...',
  '...cccccccccc...',
  '...pppppppppp...',
  '....pppppppp....',
  '....ppppppp.....',
  '...pppp..ppp....',
  '...bbb....bbb...',
  '..bbb......bbb..',
];

export interface CharPalette {
  h: string;
  c: string;
  p: string;
  t: string;
  s: string;
}

export interface CharSprites {
  down: [Sprite, Sprite];
  up: [Sprite, Sprite];
  side: [Sprite, Sprite];
}

const charCache = new Map<string, CharSprites>();

export function buildCharacter(pal: CharPalette, key: string): CharSprites {
  const cached = charCache.get(key);
  if (cached) return cached;
  const full = { ...pal, b: '#201a22', o: '#1a1118' };
  const built: CharSprites = {
    down: [makeSprite(DOWN_A, full, `${key}-d0`), makeSprite(DOWN_B, full, `${key}-d1`)],
    up: [makeSprite(UP_A, full, `${key}-u0`), makeSprite(UP_B, full, `${key}-u1`)],
    side: [makeSprite(SIDE_A, full, `${key}-s0`), makeSprite(SIDE_B, full, `${key}-s1`)],
  };
  charCache.set(key, built);
  return built;
}

/** The salesman. Sharp suit, red tie, employee-of-the-month smile. */
export const PLAYER_PALETTE: CharPalette = {
  h: '#1c1418',
  c: '#2a2433',
  p: '#231f2b',
  t: '#c03030',
  s: '#e6b4a0',
};

/** Visible only in Demon Vision. Your real face. */
export const HORNS = makeSprite(
  ['..rr........rr..', '..rr........rr..', '...r........r...'],
  { r: '#e04848' },
  'horns',
);

const AURA_GRID = [
  '......xxxxxxxxxxxx......',
  '...xxxxxxxxxxxxxxxxxx...',
  '.xxxxxxxxxxxxxxxxxxxxxx.',
  'xxxxxxxxxxxxxxxxxxxxxxxx',
  'xxxxxxxxxxxxxxxxxxxxxxxx',
  '.xxxxxxxxxxxxxxxxxxxxxx.',
  '...xxxxxxxxxxxxxxxxxx...',
  '......xxxxxxxxxxxx......',
];

export const AURAS: Record<number, Sprite> = {
  1: makeSprite(AURA_GRID, { x: '#c08a50' }, 'aura-bronze'),
  2: makeSprite(AURA_GRID, { x: '#c8d0dc' }, 'aura-silver'),
  3: makeSprite(AURA_GRID, { x: '#ffd84a' }, 'aura-gold'),
};

/** Management. 24x24, drawn scaled up. */
export const SATAN = makeSprite(
  [
    '..hh................hh..',
    '..hh................hh..',
    '...hh..............hh...',
    '...hh......rr......hh...',
    '....hh....rrrr....hh....',
    '....hh...rrrrrr...hh....',
    '.....hh..rrrrrr..hh.....',
    '......h.rrrrrrrr.h......',
    '........ryyrryyr........',
    '........rrrrrrrr........',
    '........rrkkkkrr........',
    '.........rrrrrr.........',
    '......rrrrrrrrrrrr......',
    '....rrrrrrrrrrrrrrrr....',
    '...rrrRRrrrrrrrrRRrrr...',
    '...rrrrrrrrrrrrrrrrrr...',
    '..rrr.rrrrrrrrrrrr.rrr..',
    '..rrr.rrrrrrrrrrrr.rrr..',
    '..rrr..rrrrrrrrrr..rrr..',
    '..kkk..rrrrrrrrrr..kkk..',
    '.......rrrrrrrrrr.......',
    '.......rrrr..rrrr.......',
    '......kkkk....kkkk......',
    '......kkkk....kkkk......',
  ],
  { h: '#d8c8a8', r: '#7a1420', R: '#b8202c', y: '#ffd84a', k: '#1a0a0e' },
  'satan',
);
