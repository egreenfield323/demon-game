import { Rng } from '../../engine/rng';
import { CARDS, SHOP_CARDS, type CardId } from '../data/cards';
import { CHARMS, CONSUMABLES, type CharmId, type ConsumableId } from '../data/charms';
import type { RunState } from './state';

export type ShopItem =
  | { kind: 'charm'; id: CharmId; price: number }
  | { kind: 'card'; id: CardId; price: number }
  | { kind: 'consumable'; id: ConsumableId; price: number };

/** Nightly Commissary stock: up to 3 unowned charms, 2 cards, 1 consumable. */
export function genShop(run: RunState): ShopItem[] {
  const rng = new Rng(`shop:${run.seed}:${run.day}`);
  const items: ShopItem[] = [];

  const charmPool = (Object.keys(CHARMS) as CharmId[]).filter((id) => !run.charms.includes(id));
  for (const id of rng.shuffle(charmPool).slice(0, 3)) {
    items.push({ kind: 'charm', id, price: CHARMS[id].price });
  }

  for (const id of rng.shuffle(SHOP_CARDS).slice(0, 2)) {
    items.push({ kind: 'card', id, price: CARDS[id].price ?? 2 });
  }

  const consumable = rng.pick(Object.keys(CONSUMABLES) as ConsumableId[]);
  items.push({ kind: 'consumable', id: consumable, price: CONSUMABLES[consumable].price });

  return items;
}

export function buyItem(run: RunState, item: ShopItem): boolean {
  if (run.coins < item.price) return false;
  if (item.kind === 'charm') {
    if (run.charms.includes(item.id)) return false;
    run.charms.push(item.id);
  } else if (item.kind === 'card') {
    run.deck.push(item.id);
  } else {
    run.consumablesPending.push(item.id);
  }
  run.coins -= item.price;
  return true;
}
