import { describe, expect, it } from 'vitest';
import type { CardId } from '../game/data/cards';
import { canPlay, playCard, startBargain, walkAway, type BargainOpts } from '../game/sim/bargain';
import type { NpcDef } from '../game/sim/state';

function npc(over: Partial<NpcDef> = {}): NpcDef {
  return {
    id: 0,
    name: 'Testa',
    archetype: 'widow',
    traits: ['LONELY', 'GRIEVING'], // affinities: LOVE, COMFORT, LEGACY
    quirk: undefined,
    desire: 'LOVE',
    ick: 'WEALTH',
    maxWillpower: 40,
    susRate: 1,
    basePatience: 8,
    soulValue: 1,
    skin: '#e8b890',
    ...over,
  };
}

function start(deck: CardId[], over: Partial<NpcDef> = {}, opts: Partial<BargainOpts> = {}) {
  return startBargain({
    npc: npc(over),
    deck,
    charms: [],
    flatDmgBonus: 0,
    seed: 7,
    ...opts,
  });
}

describe('soul bargain', () => {
  it('desire keyword hits for 3x and reveals the desire', () => {
    const st = start(Array(9).fill('love-1') as CardId[]);
    const events = playCard(st, 0);
    const dmg = events.find((e) => e.kind === 'dmg')!;
    expect(dmg.amount).toBe(18); // 6 * 3
    expect(dmg.hit).toBe('desire');
    expect(st.willpower).toBe(22);
    expect(st.reveal.desire).toBe(true);
    expect(events.some((e) => e.kind === 'reveal')).toBe(true);
  });

  it('trait affinity hits for 1.75x', () => {
    const st = start(Array(9).fill('comfort-1') as CardId[]);
    const events = playCard(st, 0);
    const dmg = events.find((e) => e.kind === 'dmg')!;
    expect(dmg.amount).toBe(11); // round(6 * 1.75)
    expect(dmg.hit).toBe('trait');
  });

  it('the ick deals zero damage, spikes suspicion, and offends', () => {
    const st = start(Array(9).fill('wealth-1') as CardId[]);
    const events = playCard(st, 0);
    const dmg = events.find((e) => e.kind === 'dmg')!;
    expect(dmg.amount).toBe(0);
    expect(st.willpower).toBe(40);
    const susp = events.find((e) => e.kind === 'susp')!;
    expect(susp.amount).toBe(12); // (6 + 6) * 1.0
    expect(st.mood).toBe('offended');
    expect(st.reveal.ick).toBe(true);
  });

  it('skeptics halve keyword bonuses', () => {
    const st = start(Array(9).fill('love-1') as CardId[], { quirk: 'SKEPTIC' });
    const events = playCard(st, 0);
    expect(events.find((e) => e.kind === 'dmg')!.amount).toBe(12); // 6 * (1 + (3-1)/2)
  });

  it('signs when willpower hits zero', () => {
    const st = start(Array(9).fill('love-1') as CardId[], { maxWillpower: 10 });
    playCard(st, 0);
    expect(st.status).toBe('signed');
  });

  it('flees when the suspicion meter fills', () => {
    const st = start(Array(9).fill('small-talk') as CardId[], {}, { startSuspicion: 49 });
    playCard(st, 0);
    expect(st.suspicion).toBe(50);
    expect(st.status).toBe('fled');
  });

  it('gets bored when patience runs out', () => {
    const st = start(Array(9).fill('small-talk') as CardId[], { maxWillpower: 999, basePatience: 1 });
    expect(st.patience).toBe(3); // clamped minimum
    playCard(st, 0);
    playCard(st, 0);
    expect(st.status).toBe('active');
    playCard(st, 0);
    expect(st.status).toBe('bored');
  });

  it('soothe cannot push suspicion below zero', () => {
    const st = start(Array(9).fill('listen') as CardId[]);
    const events = playCard(st, 0);
    expect(st.suspicion).toBe(0);
    expect(events.find((e) => e.kind === 'soothe')!.amount).toBe(0);
  });

  it('fine print is gated behind 50% willpower', () => {
    const st = start(Array(9).fill('fine-print') as CardId[]);
    expect(canPlay(st, 0).ok).toBe(false);
    st.willpower = 19;
    expect(canPlay(st, 0).ok).toBe(true);
    playCard(st, 0);
    expect(st.willpower).toBe(5); // 19 - 14
    expect(st.status).toBe('active');
  });

  it('honeyed promise weakens the next line', () => {
    const st = start(['honeyed-promise', ...Array(8).fill('small-talk')] as CardId[], { maxWillpower: 200 });
    const honeyIdx = st.hand.indexOf('honeyed-promise');
    // Make sure honeyed is in hand for the test; deck order is shuffled.
    if (honeyIdx === -1) {
      st.hand[0] = 'honeyed-promise';
    }
    playCard(st, Math.max(0, honeyIdx));
    expect(st.nextDmgPenalty).toBe(3);
    const events = playCard(st, 0); // small-talk: 3 dmg - 3 penalty = 0
    expect(events.find((e) => e.kind === 'dmg')!.amount).toBe(0);
    expect(events.some((e) => e.kind === 'info')).toBe(true);
  });

  it('velvet glove doubles soothe, silver tongue boosts damage and suspicion', () => {
    const st = start(Array(9).fill('love-1') as CardId[], {}, { charms: ['silver-tongue'], startSuspicion: 0 });
    const events = playCard(st, 0);
    expect(events.find((e) => e.kind === 'dmg')!.amount).toBe(23); // round(6*3*1.25)

    const st2 = start(Array(9).fill('listen') as CardId[], {}, { charms: ['velvet-glove'], startSuspicion: 30 });
    const ev2 = playCard(st2, 0);
    expect(ev2.find((e) => e.kind === 'soothe')!.amount).toBe(18); // listen 9 soothe, doubled
  });

  it('replenishes the hand from deck and discard', () => {
    const st = start(Array(9).fill('small-talk') as CardId[], { maxWillpower: 999, basePatience: 99 });
    expect(st.hand.length).toBe(4);
    for (let i = 0; i < 8; i++) playCard(st, 0);
    expect(st.hand.length).toBe(4); // recycled through discard
  });

  it('walk away ends the bargain quietly', () => {
    const st = start(Array(9).fill('small-talk') as CardId[]);
    walkAway(st);
    expect(st.status).toBe('walked');
  });

  it('opal of echoes reveals a trait at the start', () => {
    const st = start(Array(9).fill('small-talk') as CardId[], {}, { charms: ['opal-echoes'] });
    expect(st.reveal.traits[0] || st.reveal.traits[1]).toBe(true);
  });

  it('rapport momentum amplifies a resonant chain', () => {
    const st = start(Array(9).fill('love-1') as CardId[], { maxWillpower: 999, basePatience: 99 });
    const first = playCard(st, 0).find((e) => e.kind === 'dmg')!.amount!;
    expect(first).toBe(18); // rapport 0, no bonus yet
    expect(st.rapport).toBe(2);
    const second = playCard(st, 0).find((e) => e.kind === 'dmg')!.amount!;
    expect(second).toBeGreaterThan(first); // the chain pays off
    expect(st.rapport).toBe(4);
  });

  it('a misread snaps the rapport chain', () => {
    const st = start(Array(9).fill('love-1') as CardId[], { maxWillpower: 999, basePatience: 99 });
    playCard(st, 0);
    expect(st.rapport).toBe(2);
    st.hand[0] = 'wealth-1'; // their ICK
    playCard(st, 0);
    expect(st.rapport).toBe(0);
  });

  it('a setup card primes the next line for bonus damage', () => {
    const st = start(Array(9).fill('love-1') as CardId[], { maxWillpower: 999 });
    st.hand = ['small-talk', 'love-1', 'love-1', 'love-1'];
    playCard(st, 0); // Small Talk primes
    expect(st.primed).toBe(true);
    const ev = playCard(st, 0); // love-1 consumes the prime
    expect(st.primed).toBe(false);
    expect(ev.find((e) => e.kind === 'dmg')!.amount).toBe(36); // (6 + 6) * 3
  });

  it('patience is a firm budget — a single desire hit does not refund it', () => {
    const st = start(Array(9).fill('love-1') as CardId[], { maxWillpower: 999, basePatience: 8 });
    const before = st.patience;
    playCard(st, 0); // desire hit, but combo only just starting
    expect(st.patience).toBe(before - 1);
  });

  it('a hot combo lets them lean in (a free turn), once earned', () => {
    const st = start(Array(9).fill('love-1') as CardId[], { maxWillpower: 999, basePatience: 8 });
    playCard(st, 0); // combo -> 2, patience -1
    playCard(st, 0); // combo -> 4, patience -1
    const held = st.patience;
    const ev = playCard(st, 0); // desire at combo 4 -> they lean in, no cost
    expect(st.patience).toBe(held);
    expect(ev.some((e) => e.kind === 'patience')).toBe(true);
  });
});
