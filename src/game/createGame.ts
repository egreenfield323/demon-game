import { Input } from '../engine/input';
import { SceneStack } from '../engine/scene';
import type { AudioBus, KVStore, Renderer } from '../engine/types';
import type { GameCtx } from './ctx';
import { TitleScene } from './scenes/title';
import { MetaStore } from './sim/meta';
import { Transition } from './transition';

export interface GameOpts {
  renderer: Renderer;
  audio: AudioBus;
  storage: KVStore;
  input?: Input;
  /** Run-seed source; inject a constant for deterministic tests. */
  seedFn?: () => number;
  /** Animated scene transitions. Off (instant) for deterministic tests. */
  transitions?: boolean;
}

export interface Game {
  ctx: GameCtx;
  start(): void;
  update(dt: number): void;
  draw(): void;
}

export function createGame(opts: GameOpts): Game {
  const ctx: GameCtx = {
    r: opts.renderer,
    input: opts.input ?? new Input(),
    audio: opts.audio,
    scenes: new SceneStack<GameCtx>(),
    meta: new MetaStore(opts.storage),
    transition: new Transition(opts.transitions === false),
    newSeed: opts.seedFn ?? (() => Date.now() >>> 0),
  };
  return {
    ctx,
    start() {
      ctx.scenes.reset(ctx, new TitleScene());
    },
    update(dt: number) {
      // While a transition plays, the scene beneath is frozen (the wipe owns
      // the frame and swaps the scene mid-cover).
      if (ctx.transition.busy) ctx.transition.update(ctx, dt);
      else ctx.scenes.update(ctx, dt);
      ctx.input.endFrame();
    },
    draw() {
      ctx.scenes.draw(ctx);
      ctx.transition.draw(ctx);
    },
  };
}
