/** The seven hungers. Every human wants one of these badly enough to sign. */

export const KEYWORDS = ['WEALTH', 'LOVE', 'FAME', 'POWER', 'COMFORT', 'LEGACY', 'ESCAPE'] as const;
export type Keyword = (typeof KEYWORDS)[number];

export const KEYWORD_COLORS: Record<Keyword, string> = {
  WEALTH: '#e8c84a',
  LOVE: '#e86a8a',
  FAME: '#b06ae8',
  POWER: '#e8604a',
  COMFORT: '#6ac8e8',
  LEGACY: '#8ae86a',
  ESCAPE: '#e8a96a',
};
