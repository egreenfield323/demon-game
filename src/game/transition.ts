import type { GameCtx } from './ctx';
import { UI } from './scenes/hud';

/** A screen wipe + title card played between main scenes. Lives outside the
 * scene stack (driven by the Game wrapper) so it can swap the scene underneath
 * mid-cover without disturbing itself. `instant` mode (tests) just runs the
 * swap synchronously with no animation. */

export type WipeKind = 'curtain' | 'descend' | 'rise';

export interface TransOpts {
  label?: string;
  sub?: string;
  color?: string;
  kind?: WipeKind;
}

const OUT = 0.45; // cover the old scene
const HOLD = 0.55; // fully black, title card up — long enough to read
const IN = 0.5; // reveal the new scene
const TOTAL = OUT + HOLD + IN;

interface Active {
  t: number;
  swapped: boolean;
  swap: (c: GameCtx) => void;
  label: string;
  sub: string;
  color: string;
  kind: WipeKind;
}

export class Transition {
  private active: Active | null = null;

  constructor(private instant = false) {}

  get busy(): boolean {
    return this.active !== null;
  }

  /** Begin a transition that runs `swap` once the screen is covered. */
  go(c: GameCtx, swap: (c: GameCtx) => void, opts: TransOpts = {}): void {
    if (this.instant || this.active) {
      swap(c);
      return;
    }
    this.active = {
      t: 0,
      swapped: false,
      swap,
      label: opts.label ?? '',
      sub: opts.sub ?? '',
      color: opts.color ?? UI.accent,
      kind: opts.kind ?? 'curtain',
    };
    c.audio.play('door');
  }

  update(c: GameCtx, dt: number): void {
    const a = this.active;
    if (!a) return;
    a.t += dt;
    if (!a.swapped && a.t >= OUT) {
      a.swap(c);
      a.swapped = true;
    }
    if (a.t >= TOTAL) this.active = null;
  }

  draw(c: GameCtx): void {
    const a = this.active;
    if (!a) return;
    const r = c.r;

    let cover: number;
    if (a.t < OUT) cover = a.t / OUT;
    else if (a.t < OUT + HOLD) cover = 1;
    else cover = 1 - (a.t - OUT - HOLD) / IN;
    cover = Math.max(0, Math.min(1, cover));

    const ink = '#08040a';
    const flick = 2 + Math.sin(a.t * 40) * 1.5;

    if (a.kind === 'descend') {
      const ch = cover * (r.h + 4);
      r.rect(0, 0, r.w, ch, ink);
      r.rect(0, ch - flick, r.w, flick, a.color, 0.8);
    } else if (a.kind === 'rise') {
      const ch = cover * (r.h + 4);
      r.rect(0, r.h - ch, r.w, ch, ink);
      r.rect(0, r.h - ch, r.w, flick, a.color, 0.8);
    } else {
      const hh = cover * (r.h / 2 + 6);
      r.rect(0, 0, r.w, hh, ink);
      r.rect(0, r.h - hh, r.w, hh, ink);
      r.rect(0, hh - 2, r.w, 2, a.color, 0.7);
      r.rect(0, r.h - hh, r.w, 2, a.color, 0.7);
    }

    // Title card while the screen is (nearly) covered.
    if (cover > 0.72 && a.label) {
      const al = Math.min(1, (cover - 0.72) / 0.22);
      r.text(a.label, r.w / 2, r.h / 2 - 11, a.color, { align: 'center', scale: 2, alpha: al });
      if (a.sub) r.text(a.sub, r.w / 2, r.h / 2 + 10, UI.text, { align: 'center', alpha: al });
    }
  }
}
