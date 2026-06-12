import type { GameCtx } from '../ctx';
import { quotaFor } from '../sim/run';
import type { RunState } from '../sim/state';

export const UI = {
  bg: '#100a10',
  panel: '#1c141c',
  panelLight: '#2a1f28',
  border: '#4a3344',
  borderHi: '#8a5468',
  text: '#e8dcd0',
  dim: '#9a8a90',
  accent: '#e85a4a',
  fire: '#ff8a3a',
  gold: '#e8c84a',
  good: '#8ae86a',
  bad: '#e8604a',
  blue: '#6ac8e8',
  shadow: '#08050a',
};

export function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function drawPanel(c: GameCtx, x: number, y: number, w: number, h: number, title?: string): void {
  c.r.rect(x + 2, y + 2, w, h, UI.shadow, 0.6);
  c.r.rect(x, y, w, h, UI.panel);
  c.r.frame(x, y, w, h, UI.border);
  if (title) {
    c.r.rect(x + 1, y + 1, w - 2, 10, UI.panelLight);
    c.r.text(title, x + 4, y + 3, UI.gold);
  }
}

export function drawBar(
  c: GameCtx,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color: string,
  label?: string,
): void {
  c.r.rect(x, y, w, h, '#0c080c');
  c.r.rect(x + 1, y + 1, Math.max(0, Math.round((w - 2) * Math.max(0, Math.min(1, frac)))), h - 2, color);
  c.r.frame(x, y, w, h, UI.border);
  if (label) c.r.text(label, x + 3, y + (h - 7) / 2, UI.text);
}

export function drawTopBar(c: GameCtx, run: RunState): void {
  const r = c.r;
  r.rect(0, 0, r.w, 14, UI.bg, 0.92);
  r.rect(0, 13, r.w, 1, UI.border);
  r.text(`DAY ${run.day}`, 5, 3, UI.gold);
  r.text(fmtTime(run.timeMin), 48, 3, UI.text);
  const q = quotaFor(run);
  const soulsCol = run.soulsToday >= q ? UI.good : UI.text;
  r.text(`SOULS ${run.soulsToday}/${q}`, 92, 3, soulsCol);
  const pips = '{'.repeat(Math.max(0, run.fire)) + '}'.repeat(Math.max(0, run.maxFire - run.fire));
  r.text(pips, 175, 3, UI.fire);
  r.text(`$${run.coins}`, 250, 3, UI.gold);
  r.text(`SOULS TOTAL ${run.totalSouls}`, r.w - 5, 3, UI.dim, { align: 'right' });
}

export function drawHintBar(c: GameCtx, text: string): void {
  const r = c.r;
  r.rect(0, r.h - 12, r.w, 12, UI.bg, 0.92);
  r.rect(0, r.h - 12, r.w, 1, UI.border);
  r.text(text, 5, r.h - 9, UI.dim);
}
