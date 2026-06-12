import type { Input } from '../engine/input';
import type { Scene, SceneStack } from '../engine/scene';
import type { AudioBus, Renderer } from '../engine/types';
import type { MetaStore } from './sim/meta';

export interface GameCtx {
  r: Renderer;
  input: Input;
  audio: AudioBus;
  scenes: SceneStack<GameCtx>;
  meta: MetaStore;
  /** Seed source for new runs; injected so tests are deterministic. */
  newSeed(): number;
}

export type GScene = Scene<GameCtx>;
