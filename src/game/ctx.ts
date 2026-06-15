import type { Input } from '../engine/input';
import type { Scene, SceneStack } from '../engine/scene';
import type { AudioBus, Renderer } from '../engine/types';
import type { MetaStore } from './sim/meta';
import type { Transition } from './transition';

export interface GameCtx {
  r: Renderer;
  input: Input;
  audio: AudioBus;
  scenes: SceneStack<GameCtx>;
  meta: MetaStore;
  /** Animated wipe + title card played between main scenes. */
  transition: Transition;
  /** Seed source for new runs; injected so tests are deterministic. */
  newSeed(): number;
}

export type GScene = Scene<GameCtx>;
