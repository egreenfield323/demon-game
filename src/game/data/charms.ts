/** Curio Shop talismans. Every charm helps — and costs. */

export type CharmId =
  | 'silver-tongue'
  | 'opal-echoes'
  | 'dead-mans-watch'
  | 'first-lie-quill'
  | 'hagstone-monocle'
  | 'velvet-glove';

export interface CharmDef {
  id: CharmId;
  name: string;
  price: number;
  boon: string;
  curse: string;
}

export const CHARMS: Record<CharmId, CharmDef> = {
  'silver-tongue': {
    id: 'silver-tongue',
    name: 'Silver Tongue (Lacquered)',
    price: 5,
    boon: '+25% willpower damage on every card.',
    curse: 'Suspicion also climbs 10% faster.',
  },
  'opal-echoes': {
    id: 'opal-echoes',
    name: 'Opal of Echoes',
    price: 4,
    boon: 'Every bargain starts with one trait revealed.',
    curse: '-1 max Hellfire while carried.',
  },
  'dead-mans-watch': {
    id: 'dead-mans-watch',
    name: "Dead Man's Watch",
    price: 4,
    boon: '+2 patience in every bargain.',
    curse: 'The day burns 20% faster.',
  },
  'first-lie-quill': {
    id: 'first-lie-quill',
    name: 'Quill of the First Lie',
    price: 5,
    boon: 'Every signed soul pays +1 coin.',
    curse: '+1 quota on the final day.',
  },
  'hagstone-monocle': {
    id: 'hagstone-monocle',
    name: 'Hagstone Monocle',
    price: 3,
    boon: 'Deep scans cost 1 Hellfire instead of 2.',
    curse: 'Soul auras invisible — you fly blind on value.',
  },
  'velvet-glove': {
    id: 'velvet-glove',
    name: 'Velvet Glove',
    price: 4,
    boon: 'All soothe effects doubled.',
    curse: '-1 patience in every bargain.',
  },
};

export type ConsumableId = 'brimstone-espresso' | 'bottled-longing';

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  price: number;
  desc: string;
}

export const CONSUMABLES: Record<ConsumableId, ConsumableDef> = {
  'brimstone-espresso': {
    id: 'brimstone-espresso',
    name: 'Brimstone Espresso',
    price: 2,
    desc: 'Tomorrow: +2 Hellfire over your max.',
  },
  'bottled-longing': {
    id: 'bottled-longing',
    name: 'Bottled Longing',
    price: 2,
    desc: "Tomorrow's first bargain: their Desire starts revealed.",
  },
};
