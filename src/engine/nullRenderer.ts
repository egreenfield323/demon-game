import { measureText } from './font';
import type { Renderer, Sprite, SpriteOpts, TextOpts } from './types';

/** No-op renderer so the full game loop can run headless in tests. */
export class NullRenderer implements Renderer {
  constructor(
    readonly w = 480,
    readonly h = 270,
  ) {}
  clear(_color: string): void {}
  rect(_x: number, _y: number, _w: number, _h: number, _color: string, _alpha?: number): void {}
  frame(_x: number, _y: number, _w: number, _h: number, _color: string): void {}
  sprite(_s: Sprite, _x: number, _y: number, _opts?: SpriteOpts): void {}
  text(_str: string, _x: number, _y: number, _color: string, _opts?: TextOpts): void {}
  textWidth(str: string, scale = 1): number {
    return measureText(str, scale);
  }
  dim(_alpha: number, _color?: string): void {}
}
