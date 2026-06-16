import { describe, expect, it } from 'vitest';
import { MemStore } from '../engine/types';
import { MetaStore } from '../game/sim/meta';
import { advanceWorld, daysSurvived, endDayOutcome, meterSpeedFor, newRun, quotaFor, runDifficulty, sinPointsFor, startDay } from '../game/sim/run';
import { buyItem, genShop } from '../game/sim/shop';
import { DAY_COUNT, type MetaState } from '../game/sim/state';

const plainMeta = (): MetaState => ({ sinPoints: 0, upgrades: [], runs: 0, wins: 0, soulsAllTime: 0, bestDay: 0, seenIntro: true });

describe('run lifecycle', () => {
  it('applies meta upgrades to a fresh run', () => {
    const meta = plainMeta();
    meta.upgrades = ['night-school', 'bigger-furnace', 'expense-account'];
    const run = newRun(meta, 1);
    expect(run.deck).toContain('cold-read');
    expect(run.maxFire).toBe(7);
    expect(run.fire).toBe(7);
    expect(run.coins).toBe(3);
  });

  it('quotas escalate and the quill curses the final day', () => {
    const run = newRun(plainMeta(), 1);
    expect(quotaFor(run)).toBe(1);
    run.day = DAY_COUNT;
    expect(quotaFor(run)).toBe(4);
    run.charms.push('first-lie-quill');
    expect(quotaFor(run)).toBe(5);
  });

  it('looping raises difficulty, quota, meter speed, and counts days', () => {
    const run = newRun(plainMeta(), 5);
    const q1 = quotaFor(run);
    const s1 = meterSpeedFor(run);
    run.day = DAY_COUNT;
    expect(meterSpeedFor(run)).toBeGreaterThan(s1); // faster as the week wears on
    run.loop = 2;
    run.day = 1;
    expect(quotaFor(run)).toBe(q1 + 1); // each loop raises the bar
    expect(runDifficulty(run)).toBe(DAY_COUNT + 1);
    run.day = 3;
    expect(daysSurvived(run, false)).toBe(DAY_COUNT + 2);
  });

  it('the ground changes each day and never repeats back-to-back', () => {
    const run = newRun(plainMeta(), 5);
    const first = run.world;
    run.day = 2;
    advanceWorld(run);
    expect(run.world).not.toBe(first);
  });

  it('consumables and the opal shape the morning fire', () => {
    const run = newRun(plainMeta(), 1);
    run.consumablesPending = ['brimstone-espresso', 'bottled-longing'];
    startDay(run);
    expect(run.fire).toBe(8); // 6 + 2
    expect(run.longingArmed).toBe(true);
    expect(run.consumablesPending).toEqual([]);

    run.charms.push('opal-echoes');
    startDay(run);
    expect(run.fire).toBe(5); // 6 - 1
  });

  it('HR loophole forgives exactly one missed quota', () => {
    const meta = plainMeta();
    meta.upgrades = ['hr-loophole'];
    const run = newRun(meta, 1);
    expect(endDayOutcome(run, meta)).toBe('forgiven');
    expect(endDayOutcome(run, meta)).toBe('satan');
    run.soulsToday = 5;
    expect(endDayOutcome(run, meta)).toBe('met');
  });

  it('scores sin points by souls, days, and victory', () => {
    const run = newRun(plainMeta(), 1);
    run.totalSouls = 5;
    run.day = 3; // failed during day 3 => 2 full days
    expect(sinPointsFor(run, false)).toBe(9);
    expect(sinPointsFor(run, true)).toBe(5 + 14 + 10);
  });
});

describe('commissary', () => {
  it('stocks unowned charms and sells things', () => {
    const run = newRun(plainMeta(), 7);
    run.coins = 50;
    run.charms.push('silver-tongue');
    const items = genShop(run);
    expect(items.filter((i) => i.kind === 'charm').every((i) => i.id !== 'silver-tongue')).toBe(true);
    expect(items.filter((i) => i.kind === 'card').length).toBe(2);
    expect(items.filter((i) => i.kind === 'consumable').length).toBe(1);

    const charm = items.find((i) => i.kind === 'charm')!;
    const before = run.coins;
    expect(buyItem(run, charm)).toBe(true);
    expect(run.coins).toBe(before - charm.price);
    expect(buyItem(run, charm)).toBe(false); // already owned

    run.coins = 0;
    const card = items.find((i) => i.kind === 'card')!;
    expect(buyItem(run, card)).toBe(false);
  });

  it('shop stock is deterministic per night', () => {
    const run = newRun(plainMeta(), 7);
    expect(genShop(run)).toEqual(genShop(run));
    run.day = 2;
    // Different night, (very likely) different shelf; at minimum it still builds.
    expect(genShop(run).length).toBeGreaterThan(0);
  });
});

describe('meta persistence', () => {
  it('round-trips through storage', () => {
    const store = new MemStore();
    const m1 = new MetaStore(store);
    expect(m1.buyUpgrade('forked-tongue')).toBe(false); // no points
    m1.recordRun({ souls: 6, daysCompleted: 3, won: false, sinEarned: 12 });
    expect(m1.state.sinPoints).toBe(12);
    expect(m1.buyUpgrade('forked-tongue')).toBe(true);
    expect(m1.state.sinPoints).toBe(8);

    const m2 = new MetaStore(store);
    expect(m2.state.sinPoints).toBe(8);
    expect(m2.has('forked-tongue')).toBe(true);
    expect(m2.state.runs).toBe(1);
  });

  it('survives corrupted storage', () => {
    const store = new MemStore();
    store.setItem('soul-quota-meta-v1', '{not json');
    const m = new MetaStore(store);
    expect(m.state.sinPoints).toBe(0);
  });
});
