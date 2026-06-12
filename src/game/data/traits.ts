import type { Keyword } from './keywords';

/** Personality traits revealed by Demon Vision. Each trait makes certain
 * keywords land harder (1.75x). Some carry mechanical riders. */

export type TraitId =
  | 'LONELY'
  | 'GREEDY'
  | 'VAIN'
  | 'DESPERATE'
  | 'GRIEVING'
  | 'AMBITIOUS'
  | 'INSECURE'
  | 'NOSTALGIC'
  | 'EXHAUSTED'
  | 'PROUD';

export interface TraitDef {
  id: TraitId;
  keywords: Keyword[];
  blurb: string;
  /** Mechanical rider applied at NPC generation. */
  rider?: 'patience+2' | 'willpower-10%';
}

export const TRAITS: Record<TraitId, TraitDef> = {
  LONELY: {
    id: 'LONELY',
    keywords: ['LOVE', 'COMFORT'],
    blurb: 'Will talk to anyone. Even you.',
    rider: 'patience+2',
  },
  GREEDY: { id: 'GREEDY', keywords: ['WEALTH'], blurb: 'The hole money never fills.' },
  VAIN: { id: 'VAIN', keywords: ['FAME'], blurb: 'Checks reflections in car windows.' },
  DESPERATE: {
    id: 'DESPERATE',
    keywords: ['ESCAPE', 'WEALTH'],
    blurb: 'Out of options. Almost.',
    rider: 'willpower-10%',
  },
  GRIEVING: { id: 'GRIEVING', keywords: ['LOVE', 'LEGACY'], blurb: 'Someone-shaped hole in their life.' },
  AMBITIOUS: { id: 'AMBITIOUS', keywords: ['POWER', 'FAME'], blurb: 'The ladder is all they see.' },
  INSECURE: { id: 'INSECURE', keywords: ['FAME', 'COMFORT'], blurb: 'Needs to hear it from someone.' },
  NOSTALGIC: { id: 'NOSTALGIC', keywords: ['LEGACY', 'LOVE'], blurb: 'Lives in a better yesterday.' },
  EXHAUSTED: { id: 'EXHAUSTED', keywords: ['ESCAPE', 'COMFORT'], blurb: 'Running on fumes and coffee.' },
  PROUD: { id: 'PROUD', keywords: ['LEGACY', 'POWER'], blurb: 'Would rather break than bend.' },
};

/** Quirks change the rules of the bargain itself. Deep scan reveals them. */
export type QuirkId = 'DEVOUT' | 'SKEPTIC' | 'DRUNK';

export interface QuirkDef {
  id: QuirkId;
  blurb: string;
}

export const QUIRKS: Record<QuirkId, QuirkDef> = {
  DEVOUT: { id: 'DEVOUT', blurb: 'Smells brimstone. Suspicion rises 50% faster.' },
  SKEPTIC: { id: 'SKEPTIC', blurb: 'Heard every pitch. Keyword bonuses halved.' },
  DRUNK: { id: 'DRUNK', blurb: 'Willpower -15%, but persuasion lands... unevenly.' },
};
