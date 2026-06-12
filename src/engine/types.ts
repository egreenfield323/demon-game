/** Core engine interfaces. Render + audio sit behind interfaces so the whole
 * game can run headless (tests) or on canvas/webaudio (browser). */

export interface Sprite {
  id: string;
  w: number;
  h: number;
  /** Rows of palette characters. '.' (and ' ') = transparent. */
  grid: string[];
  palette: Record<string, string>;
}

let spriteSeq = 0;

export function makeSprite(grid: string[], palette: Record<string, string>, id?: string): Sprite {
  const w = Math.max(...grid.map((r) => r.length));
  return { id: id ?? `spr${spriteSeq++}`, w, h: grid.length, grid, palette };
}

export type TextAlign = 'left' | 'center' | 'right';

export interface SpriteOpts {
  flipX?: boolean;
  alpha?: number;
  scale?: number;
}

export interface TextOpts {
  align?: TextAlign;
  scale?: number;
  alpha?: number;
}

export interface Renderer {
  readonly w: number;
  readonly h: number;
  clear(color: string): void;
  rect(x: number, y: number, w: number, h: number, color: string, alpha?: number): void;
  /** 1px border. */
  frame(x: number, y: number, w: number, h: number, color: string): void;
  sprite(s: Sprite, x: number, y: number, opts?: SpriteOpts): void;
  text(str: string, x: number, y: number, color: string, opts?: TextOpts): void;
  textWidth(str: string, scale?: number): number;
  /** Full-screen overlay. */
  dim(alpha: number, color?: string): void;
}

export type SfxId =
  | 'blip'
  | 'confirm'
  | 'cancel'
  | 'denied'
  | 'scan'
  | 'scanDeep'
  | 'hit'
  | 'bigHit'
  | 'zeroHit'
  | 'soothe'
  | 'suspicion'
  | 'sign'
  | 'flee'
  | 'coin'
  | 'satan'
  | 'door'
  | 'levelup';

export interface AudioBus {
  play(id: SfxId): void;
}

export class NullAudio implements AudioBus {
  play(_id: SfxId): void {}
}

/** Minimal storage interface (localStorage in browser, Map in tests). */
export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class MemStore implements KVStore {
  private m = new Map<string, string>();
  getItem(key: string): string | null {
    return this.m.has(key) ? this.m.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.m.set(key, value);
  }
}
