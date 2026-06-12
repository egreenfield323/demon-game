/** Permanent unlocks bought with Sin Points in the Orientation Pit. */

export type UpgradeId =
  | 'forked-tongue'
  | 'bigger-furnace'
  | 'expense-account'
  | 'night-school'
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
    cost: 3,
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
  'hr-loophole': {
    id: 'hr-loophole',
    name: 'HR Loophole',
    cost: 8,
    desc: 'Once per run, a missed quota is... overlooked.',
  },
};

export const UPGRADE_LIST: UpgradeId[] = [
  'forked-tongue',
  'bigger-furnace',
  'expense-account',
  'night-school',
  'hr-loophole',
];
