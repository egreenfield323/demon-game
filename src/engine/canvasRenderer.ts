import { glyphFor, measureText } from './font';
import type { Renderer, Sprite, SpriteOpts, TextOpts } from './types';

function parseHex(color: string): [number, number, number] {
  let c = color.replace('#', '');
  if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
  const n = parseInt(c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Renders the game into a low-res canvas; the page scales it up with
 * image-rendering: pixelated. Sprites and glyphs are rasterized once and
 * cached as offscreen canvases. */
export class CanvasRenderer implements Renderer {
  readonly w: number;
  readonly h: number;
  private ctx: CanvasRenderingContext2D;
  private spriteCache = new Map<string, HTMLCanvasElement>();
  private glyphCache = new Map<string, HTMLCanvasElement>();

  constructor(canvas: HTMLCanvasElement) {
    this.w = canvas.width;
    this.h = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  clear(color: string): void {
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    this.ctx.globalAlpha = 1;
  }

  frame(x: number, y: number, w: number, h: number, color: string): void {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color);
    this.rect(x + w - 1, y, 1, h, color);
  }

  private rasterize(s: Sprite): HTMLCanvasElement {
    let cv = this.spriteCache.get(s.id);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = s.w;
    cv.height = s.h;
    const c = cv.getContext('2d')!;
    const img = c.createImageData(s.w, s.h);
    for (let y = 0; y < s.h; y++) {
      const row = s.grid[y] ?? '';
      for (let x = 0; x < s.w; x++) {
        const ch = row[x] ?? '.';
        if (ch === '.' || ch === ' ') continue;
        const color = s.palette[ch];
        if (!color) continue;
        const [r, g, b] = parseHex(color);
        const i = (y * s.w + x) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    this.spriteCache.set(s.id, cv);
    return cv;
  }

  sprite(s: Sprite, x: number, y: number, opts: SpriteOpts = {}): void {
    const cv = this.rasterize(s);
    const sc = opts.scale ?? 1;
    this.ctx.globalAlpha = opts.alpha ?? 1;
    if (opts.flipX) {
      this.ctx.save();
      this.ctx.translate(Math.round(x) + s.w * sc, Math.round(y));
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(cv, 0, 0, s.w * sc, s.h * sc);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(cv, Math.round(x), Math.round(y), s.w * sc, s.h * sc);
    }
    this.ctx.globalAlpha = 1;
  }

  private glyphCanvas(ch: string, color: string): HTMLCanvasElement {
    const key = ch + '|' + color;
    let cv = this.glyphCache.get(key);
    if (cv) return cv;
    const rows = glyphFor(ch);
    const gw = rows[0].length;
    cv = document.createElement('canvas');
    cv.width = gw;
    cv.height = rows.length;
    const c = cv.getContext('2d')!;
    const img = c.createImageData(gw, rows.length);
    const [r, g, b] = parseHex(color);
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < gw; x++) {
        if (rows[y][x] !== '#') continue;
        const i = (y * gw + x) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    this.glyphCache.set(key, cv);
    return cv;
  }

  text(str: string, x: number, y: number, color: string, opts: TextOpts = {}): void {
    const scale = opts.scale ?? 1;
    this.ctx.globalAlpha = opts.alpha ?? 1;
    let cy = Math.round(y);
    for (const line of str.split('\n')) {
      let cx = Math.round(x);
      if (opts.align === 'center') cx -= Math.round(measureText(line, scale) / 2);
      else if (opts.align === 'right') cx -= measureText(line, scale);
      for (const ch of line) {
        const cv = this.glyphCanvas(ch, color);
        this.ctx.drawImage(cv, cx, cy, cv.width * scale, cv.height * scale);
        cx += (cv.width + 1) * scale;
      }
      cy += 9 * scale;
    }
    this.ctx.globalAlpha = 1;
  }

  textWidth(str: string, scale = 1): number {
    return measureText(str, scale);
  }

  dim(alpha: number, color = '#000000'): void {
    this.rect(0, 0, this.w, this.h, color, alpha);
  }
}
