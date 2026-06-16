/** Permanent unlocks bought with Sin Points in the Orientation Pit. Costs run
 * deep on purpose — the full roster is many runs of grinding away. */

export type UpgradeId =
  | 'forked-tongue'
  | 'bigger-furnace'
  | 'expense-account'
  | 'night-school'
  | 'cool-customer'
  | 'iron-patience'
  | 'connoisseur'
  | 'unholy-charisma'
  | 'extra-hand'
  | 'steady-hand'
  | 'hr-loophole';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  cost: number;
  desc: string;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  'forked-tongue': {
    id: 'forked-tongue',
    name: 'Forked Tongue',
    cost: 4,
    desc: '+1 base damage on every card, every run.',
  },
  'bigger-furnace': {
    id: 'bigger-furnace',
    name: 'Bigger Furnace',
    cost: 4,
    desc: '+1 max Hellfire, every run.',
  },
  'expense-account': {
    id: 'expense-account',
    name: 'Expense Account',
    cost: 3,
    desc: 'Start every run with 3 coins.',
  },
  'night-school': {
    id: 'night-school',
    name: 'Night School Diploma',
    cost: 5,
    desc: 'Start with a Cold Read card in your deck.',
  },
  'cool-customer': {
    id: 'cool-customer',
    name: 'Cool Customer',
    cost: 7,
    desc: 'Suspicion climbs 15% slower in every bargain.',
  },
  'iron-patience': {
    id: 'iron-patience',
    name: 'Iron Patience',
    cost: 7,
    desc: '+1 Patience in every bargain.',
  },
  connoisseur: {
    id: 'connoisseur',
    name: 'Connoisseur of Souls',
    cost: 9,
    desc: 'Every signed soul pays +1 coin.',
  },
  'unholy-charisma': {
    id: 'unholy-charisma',
    name: 'Unholy Charisma',
    cost: 12,
    desc: '+15% willpower damage on every line.',
  },
  'extra-hand': {
    id: 'extra-hand',
    name: 'Sleight of Hand',
    cost: 15,
    desc: 'Draw a hand of 5 lines instead of 4.',
  },
  'steady-hand': {
    id: 'steady-hand',
    name: 'Steady Hand',
    cost: 13,
    desc: 'Delivery sweet spot shrinks, but crits hit far harder. A miss adds +25% suspicion.',
  },
  'hr-loophole': {
    id: 'hr-loophole',
    name: 'HR Loophole',
    cost: 10,
    desc: 'Once per run, a missed quota is... overlooked.',
  },
};

export const UPGRADE_LIST: UpgradeId[] = [
  'forked-tongue',
  'bigger-furnace',
  'expense-account',
  'night-school',
  'cool-customer',
  'iron-patience',
  'connoisseur',
  'unholy-charisma',
  'extra-hand',
  'steady-hand',
  'hr-loophole',
];
