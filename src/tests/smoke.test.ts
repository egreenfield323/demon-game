import { describe, expect, it } from 'vitest';
import { Input } from '../engine/input';
import { NullRenderer } from '../engine/nullRenderer';
import { MemStore, NullAudio } from '../engine/types';
import { createGame, type Game } from '../game/createGame';
import { BargainScene } from '../game/scenes/bargain';
import { CityMapScene } from '../game/scenes/citymap';
import { DayEndScene } from '../game/scenes/dayend';
import { OverworldScene } from '../game/scenes/overworld';
import { PitScene } from '../game/scenes/pit';
import { RunEndScene } from '../game/scenes/runend';
import { TitleScene } from '../game/scenes/title';
import { DAY_END_MIN } from '../game/sim/state';
import { UPGRADE_LIST } from '../game/data/upgrades';

const STEP = 1 / 60;

function makeGame(): { g: Game; input: Input } {
  const input = new Input();
  const g = createGame({
    renderer: new NullRenderer(),
    audio: new NullAudio(),
    storage: new MemStore(),
    input,
    seedFn: () => 42,
  });
  g.start();
  return { g, input };
}

function step(g: Game, frames = 1): void {
  for (let i = 0; i < frames; i++) {
    g.update(STEP);
    g.draw(); // exercise draw paths headlessly too
  }
}

function tap(g: Game, input: Input, action: Parameters<Input['press']>[0]): void {
  input.press(action);
  step(g);
  input.release(action);
  step(g);
}

/** The whole game, no canvas: title -> pit -> map -> street -> a real
 * bargain -> satan -> performance review -> back to the pit. */
describe('headless playthrough', () => {
  it('boots to title and clocks in', () => {
    const { g, input } = makeGame();
    expect(g.ctx.scenes.top).toBeInstanceOf(TitleScene);
    tap(g, input, 'confirm');
    expect(g.ctx.scenes.top).toBeInstanceOf(PitScene);
  });

  it('runs a full day cycle including a bargain and the satan ending', () => {
    const { g, input } = makeGame();
    tap(g, input, 'confirm'); // title -> pit
    tap(g, input, 'up'); // wrap selection to BEGIN SHIFT
    tap(g, input, 'confirm');
    expect(g.ctx.scenes.top).toBeInstanceOf(CityMapScene);
    tap(g, input, 'confirm'); // commons
    expect(g.ctx.scenes.top).toBeInstanceOf(OverworldScene);

    const ow = g.ctx.scenes.top as OverworldScene;
    // Reach into the scene: tests drive the world directly.
    const world = ow as unknown as {
      npcs: Array<{ def: { id: number; desire: string }; x: number; y: number; gone: boolean; done: boolean; reveal: { desire: boolean; traits: [boolean, boolean] } }>;
      px: number;
      py: number;
      run: { fire: number; soulsToday: number; timeMin: number; deck: string[] };
      vision: boolean;
    };
    expect(world.npcs.length).toBe(7);

    // Walk around a bit; nothing should explode.
    input.press('right');
    step(g, 120);
    input.release('right');

    // Teleport next to a mark and deep-scan them.
    const mark = world.npcs[0];
    world.px = mark.x + 10;
    world.py = mark.y;
    step(g);
    tap(g, input, 'vision');
    const fireBefore = world.run.fire;
    input.press('confirm');
    step(g, 70); // > 0.85s hold
    input.release('confirm');
    step(g, 2);
    expect(mark.reveal.desire).toBe(true);
    expect(world.run.fire).toBeLessThan(fireBefore);
    tap(g, input, 'vision'); // vision off

    // Pitch them.
    tap(g, input, 'confirm');
    expect(g.ctx.scenes.top).toBeInstanceOf(BargainScene);

    // Play first card until the bargain resolves one way or another.
    for (let i = 0; i < 40 && g.ctx.scenes.top instanceof BargainScene; i++) {
      tap(g, input, 'confirm');
    }
    expect(g.ctx.scenes.top).toBeInstanceOf(OverworldScene);
    expect(mark.gone || mark.done).toBe(true);

    // Force 20:00 with quota unmet -> the Boss arrives.
    world.run.soulsToday = 0;
    world.run.timeMin = DAY_END_MIN;
    step(g, 2);
    expect(g.ctx.scenes.top).toBeInstanceOf(DayEndScene);
    step(g, 240); // let the cinematic play out
    tap(g, input, 'confirm');
    expect(g.ctx.scenes.top).toBeInstanceOf(RunEndScene);
    step(g, 40);
    tap(g, input, 'confirm');
    expect(g.ctx.scenes.top).toBeInstanceOf(PitScene);

    // The run was recorded.
    expect(g.ctx.meta.state.runs).toBe(1);
    expect(g.ctx.meta.state.sinPoints).toBeGreaterThanOrEqual(0);
  });

  it('walking away from a bargain marks the npc done', () => {
    const { g, input } = makeGame();
    tap(g, input, 'confirm');
    tap(g, input, 'up');
    tap(g, input, 'confirm');
    tap(g, input, 'confirm');
    const world = g.ctx.scenes.top as unknown as {
      npcs: Array<{ x: number; y: number; done: boolean }>;
      px: number;
      py: number;
    };
    const mark = world.npcs[1];
    world.px = mark.x + 8;
    world.py = mark.y;
    step(g);
    tap(g, input, 'confirm'); // start bargain
    expect(g.ctx.scenes.top).toBeInstanceOf(BargainScene);
    tap(g, input, 'cancel'); // walk-away modal
    tap(g, input, 'confirm'); // confirm leave -> terminal overlay
    tap(g, input, 'confirm'); // dismiss
    expect(g.ctx.scenes.top).toBeInstanceOf(OverworldScene);
    expect(mark.done).toBe(true);
  });

  it('pit can buy every upgrade with enough sin', () => {
    const { g, input } = makeGame();
    g.ctx.meta.state.sinPoints = 99;
    tap(g, input, 'confirm'); // -> pit
    for (let i = 0; i < UPGRADE_LIST.length; i++) {
      tap(g, input, 'confirm'); // buy selected
      tap(g, input, 'down');
    }
    expect(g.ctx.meta.state.upgrades.length).toBe(UPGRADE_LIST.length);
  });
});
