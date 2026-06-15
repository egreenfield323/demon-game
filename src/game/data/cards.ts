import type { Keyword } from './keywords';

/** Dialogue moves. dmg chips Willpower; susp feeds the Suspicion meter.
 * Matching a card's keyword to a known trait = 1.75x, to their deep Desire =
 * 3x, to their Ick = zero damage and a suspicion spike. */

export type CardId =
  | 'small-talk'
  | 'warm-smile'
  | 'listen'
  | 'probe'
  | 'wealth-1'
  | 'wealth-2'
  | 'love-1'
  | 'love-2'
  | 'fame-1'
  | 'fame-2'
  | 'power-1'
  | 'power-2'
  | 'comfort-1'
  | 'comfort-2'
  | 'legacy-1'
  | 'legacy-2'
  | 'escape-1'
  | 'escape-2'
  | 'fine-print'
  | 'honeyed-promise'
  | 'crocodile-tears'
  | 'devils-advocate'
  | 'cold-read';

export type CardSpecial = 'probe' | 'coldRead' | 'finePrint' | 'honeyed' | 'crocodile' | 'advocate' | 'prime';

export interface CardDef {
  id: CardId;
  name: string;
  /** What you actually say. */
  line: string;
  kw?: Keyword;
  dmg: number;
  susp: number;
  /** Suspicion removed (applied after susp). */
  soothe?: number;
  special?: CardSpecial;
  /** Commissary price; cards without one never appear in the shop. */
  price?: number;
  desc: string;
}

export const CARDS: Record<CardId, CardDef> = {
  'small-talk': {
    id: 'small-talk', name: 'Small Talk', line: '"Some weather we\'re having."',
    dmg: 2, susp: 1, special: 'prime', desc: 'Setup: your next line hits +6 harder.',
  },
  'warm-smile': {
    id: 'warm-smile', name: 'Warm Smile', line: 'You practice the one from the brochure.',
    dmg: 2, susp: 0, soothe: 5, desc: 'Chips willpower, calms suspicion.',
  },
  listen: {
    id: 'listen', name: 'Just Listen', line: 'You nod. You "mm-hm". You wait.',
    dmg: 0, susp: 0, soothe: 9, desc: 'No damage. Big suspicion relief.',
  },
  probe: {
    id: 'probe', name: 'Probing Question', line: '"And how does that make you FEEL?"',
    dmg: 1, susp: 3, special: 'probe', desc: 'Reveals one hidden trait.',
  },
  'wealth-1': {
    id: 'wealth-1', name: 'Money Talks', line: '"What would you do with real money?"',
    kw: 'WEALTH', dmg: 6, susp: 6, desc: 'Appeal to WEALTH.',
  },
  'wealth-2': {
    id: 'wealth-2', name: 'Golden Tomorrows', line: '"Imagine never checking a price tag again."',
    kw: 'WEALTH', dmg: 10, susp: 10, price: 3, desc: 'Heavy WEALTH appeal.',
  },
  'love-1': {
    id: 'love-1', name: 'Someone Misses You', line: '"You deserve someone who stays."',
    kw: 'LOVE', dmg: 6, susp: 6, desc: 'Appeal to LOVE.',
  },
  'love-2': {
    id: 'love-2', name: "They'd Come Back", line: '"What if they walked through that door tonight?"',
    kw: 'LOVE', dmg: 10, susp: 10, price: 3, desc: 'Heavy LOVE appeal.',
  },
  'fame-1': {
    id: 'fame-1', name: 'Picture Your Name', line: '"I knew you were somebody the moment I saw you."',
    kw: 'FAME', dmg: 6, susp: 6, desc: 'Appeal to FAME.',
  },
  'fame-2': {
    id: 'fame-2', name: 'The World Will Watch', line: '"They\'ll all wish they\'d been nicer to you."',
    kw: 'FAME', dmg: 10, susp: 10, price: 3, desc: 'Heavy FAME appeal.',
  },
  'power-1': {
    id: 'power-1', name: 'Take Back Control', line: '"Nobody should get to tell you no."',
    kw: 'POWER', dmg: 6, susp: 6, desc: 'Appeal to POWER.',
  },
  'power-2': {
    id: 'power-2', name: 'Make Them Listen', line: '"Picture their faces when you\'re the one deciding."',
    kw: 'POWER', dmg: 10, susp: 10, price: 3, desc: 'Heavy POWER appeal.',
  },
  'comfort-1': {
    id: 'comfort-1', name: 'No More Worries', line: '"When did you last sleep through the night?"',
    kw: 'COMFORT', dmg: 6, susp: 6, desc: 'Appeal to COMFORT.',
  },
  'comfort-2': {
    id: 'comfort-2', name: 'Rest, Finally', line: '"You\'ve earned a soft place to land. Let me build it."',
    kw: 'COMFORT', dmg: 10, susp: 10, price: 3, desc: 'Heavy COMFORT appeal.',
  },
  'legacy-1': {
    id: 'legacy-1', name: 'Be Remembered', line: '"A hundred years from now, who says your name?"',
    kw: 'LEGACY', dmg: 6, susp: 6, desc: 'Appeal to LEGACY.',
  },
  'legacy-2': {
    id: 'legacy-2', name: 'Outlive Yourself', line: '"Statues, scholarships, your name on the building."',
    kw: 'LEGACY', dmg: 10, susp: 10, price: 3, desc: 'Heavy LEGACY appeal.',
  },
  'escape-1': {
    id: 'escape-1', name: 'Picture the Exit', line: '"You could just... go. Tonight. New name, new town."',
    kw: 'ESCAPE', dmg: 6, susp: 6, desc: 'Appeal to ESCAPE.',
  },
  'escape-2': {
    id: 'escape-2', name: 'Vanish Clean', line: '"No note, no forwarding address, no regrets."',
    kw: 'ESCAPE', dmg: 10, susp: 10, price: 3, desc: 'Heavy ESCAPE appeal.',
  },
  'fine-print': {
    id: 'fine-print', name: 'The Fine Print', line: 'You slide the paper across. "Standard terms."',
    dmg: 14, susp: 12, special: 'finePrint', price: 4,
    desc: 'Huge damage, +2 per Rapport. Only under 50% willpower.',
  },
  'honeyed-promise': {
    id: 'honeyed-promise', name: 'Honeyed Promise', line: '"Everything you want. One signature."',
    dmg: 8, susp: 8, special: 'honeyed', price: 3,
    desc: 'Strong, but your next card -3 damage.',
  },
  'crocodile-tears': {
    id: 'crocodile-tears', name: 'Crocodile Tears', line: '"I just— I see so much of myself in you."',
    dmg: 0, susp: 0, soothe: 14, special: 'crocodile', price: 3,
    desc: 'Massive suspicion relief. Costs 1 extra patience.',
  },
  'devils-advocate': {
    id: 'devils-advocate', name: "Devil's Advocate", line: '"You\'re right not to trust me. Smart."',
    dmg: 0, susp: 4, special: 'advocate', price: 4,
    desc: 'Damage equals a third of their suspicion.',
  },
  'cold-read': {
    id: 'cold-read', name: 'Cold Read', line: 'You squint past their face at the shape beneath.',
    dmg: 1, susp: 2, special: 'coldRead',
    desc: 'Half the time reveals their deep Desire.',
  },
};

/** Deck every fresh demon is issued. A full set of basic appeals (one per
 * hunger) so you're never RNG-starved of the keyword you need — skill is in
 * scanning, sequencing, and managing suspicion, not praying for the right draw. */
export const STARTING_DECK: CardId[] = [
  'small-talk',
  'small-talk',
  'warm-smile',
  'listen',
  'probe',
  'wealth-1',
  'love-1',
  'fame-1',
  'power-1',
  'comfort-1',
  'legacy-1',
  'escape-1',
];

/** Cards the Commissary may stock — heavy appeals and utility lines that
 * upgrade the complete basic kit you start with. */
export const SHOP_CARDS: CardId[] = [
  'wealth-2', 'love-2', 'fame-2', 'power-2', 'comfort-2', 'legacy-2', 'escape-2',
  'fine-print', 'honeyed-promise', 'crocodile-tears', 'devils-advocate',
];
