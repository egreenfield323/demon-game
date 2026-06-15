import type { GameCtx, GScene } from '../ctx';
import { ARCHETYPES, SKIN_TONES } from '../data/archetypes';
import { AURAS, buildCharacter, HORNS, PLAYER_PALETTE, SATAN, type CharSprites } from '../data/sprites/chars';
import { CARD_ART } from '../data/sprites/cards';
import { UI } from './hud';

interface Beat {
  /** 'narrator' = cold caption along the bottom; 'satan' = the Boss bellows up top. */
  voice: 'narrator' | 'satan';
  lines: string[];
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** The hiring. Each beat gets its own little animation visualizing the text:
 * the failed clerk, the Boss's ultimatum, the shove topside + the human mask,
 * the demon-vision read, and the seven-day quota. */
export class IntroScene implements GScene {
  private beat = 0;
  private beatT = 0;
  private t = 0;
  private player: CharSprites = buildCharacter(PLAYER_PALETTE, 'player');
  private civ: CharSprites[] = [
    buildCharacter({ ...ARCHETYPES.widow.palette, s: SKIN_TONES[0] }, 'intro-civ0'),
    buildCharacter({ ...ARCHETYPES.barfly.palette, s: SKIN_TONES[3] }, 'intro-civ1'),
    buildCharacter({ ...ARCHETYPES.cryptobro.palette, s: SKIN_TONES[1] }, 'intro-civ2'),
  ];

  constructor(private onDone: (c: GameCtx) => void) {}

  private static readonly BEATS: Beat[] = [
    {
      voice: 'narrator',
      lines: [
        'You were the worst closer in Hell.',
        'A clerk of small damnations. Misfiled sins.',
        'Then Management remembered your name.',
      ],
    },
    {
      voice: 'satan',
      lines: ['"ONE QUOTA SHORT. AGAIN."', '"I HAVE A SPECIAL ASSIGNMENT FOR FAILURES."'],
    },
    {
      voice: 'satan',
      lines: ['"TOPSIDE. THE LAND OF THE LIVING."', '"WEAR A FACE THEY TRUST. SMILE LIKE YOU MEAN IT."'],
    },
    {
      voice: 'narrator',
      lines: [
        'Find what each soul is starving for.',
        'Your DEMON VISION lays them bare.',
        'Say what they need to hear. Get the signature.',
        'Never let them glimpse what you are.',
      ],
    },
    {
      voice: 'satan',
      lines: ['"SEVEN DAYS. A QUOTA EVERY DAWN."', '"FILL IT... OR I FILL THE PIT WITH YOU."'],
    },
  ];

  update(c: GameCtx, dt: number): void {
    this.t += dt;
    this.beatT += dt;
    if (this.beatT > 0.45 && c.input.hit('confirm')) {
      if (this.beat >= IntroScene.BEATS.length - 1) {
        c.audio.play('confirm');
        this.onDone(c);
        return;
      }
      this.beat += 1;
      this.beatT = 0;
      c.audio.play(this.beat === 1 ? 'satan' : 'door');
    }
  }

  // --- shared bits ---

  private fireStrips(c: GameCtx, shake = 0): void {
    const r = c.r;
    for (let i = 0; i < 9; i++) {
      const fl = Math.sin(this.t * 3 + i * 1.7) * 2;
      r.rect(0, 236 + i * 4 + fl + shake, r.w, 4, i % 2 ? '#2a060c' : '#200508');
    }
  }

  private skyline(c: GameCtx, baseY: number): void {
    const r = c.r;
    const heights = [40, 64, 28, 52, 80, 36, 60, 44, 72, 30, 56];
    let x = 0;
    let i = 0;
    while (x < r.w) {
      const h = heights[i % heights.length];
      const w = 28 + (i % 3) * 10;
      r.rect(x, baseY - h, w, h, '#15131f');
      for (let wy = baseY - h + 6; wy < baseY - 6; wy += 10) {
        for (let wx = x + 4; wx < x + w - 4; wx += 8) {
          if ((wx + wy + i) % 3 === 0) r.rect(wx, wy, 3, 4, '#46402a', 0.7);
        }
      }
      x += w + 2;
      i++;
    }
  }

  // --- per-beat animations ---

  /** A tiny demon drowning in paperwork under a guttering bulb. */
  private drawClerk(c: GameCtx): void {
    const r = c.r;
    const bt = this.beatT;
    r.clear('#140a10');
    const lit = Math.sin(this.t * 31) + Math.sin(this.t * 7.3) > -1.2 ? 1 : 0.35;
    r.rect(r.w / 2 - 2, 18, 4, 6, '#fff0c0', lit); // bulb
    for (let i = 0; i < 64; i++) {
      const ww = 12 + i * 1.7;
      r.rect(r.w / 2 - ww / 2, 24 + i, ww, 1, '#3a3010', 0.035 * lit); // light cone
    }
    // Desk + clerk.
    const deskY = 150;
    r.rect(r.w / 2 - 62, deskY, 124, 24, '#241820');
    r.rect(r.w / 2 - 62, deskY, 124, 3, '#3a2a32');
    r.sprite(this.player.down[0], r.w / 2 - 16, deskY - 40, { scale: 2 });
    // Endless paperwork raining down + piling.
    for (let k = 0; k < 12; k++) {
      const fall = (bt * 42 + k * 26) % (deskY - 28);
      const px = r.w / 2 - 56 + ((k * 53) % 112) + Math.sin(this.t * 2 + k) * 5;
      r.rect(px, 24 + fall, 5, 6, '#cfc4b0', lit);
    }
    r.rect(r.w / 2 - 56, deskY - 6, 32, 6, '#cfc4b0');
    r.rect(r.w / 2 + 22, deskY - 5, 30, 5, '#bdb29e');
    // Management notices: two burning eyes swell open up top.
    if (bt > 2.3) {
      const a = clamp01((bt - 2.3) / 1.3) * lit;
      r.rect(r.w / 2 - 74, 26, 20, 7, '#b8202c', a);
      r.rect(r.w / 2 + 54, 26, 20, 7, '#b8202c', a);
      r.rect(r.w / 2 - 68, 28, 8, 3, '#ffd84a', a);
      r.rect(r.w / 2 + 60, 28, 8, 3, '#ffd84a', a);
    }
  }

  /** The Boss erupts from the pit and looms over a cowering you. */
  private drawSummons(c: GameCtx): void {
    const r = c.r;
    const bt = this.beatT;
    r.clear('#150407');
    const shake = bt < 1.4 ? Math.sin(bt * 50) * Math.max(0, 1.4 - bt) * 2 : 0;
    this.fireStrips(c, shake);
    r.sprite(this.player.side[0], 44, 158, { scale: 2 }); // you, small
    const rise = clamp01(bt / 1.6);
    const sy = 248 - rise * 150 + Math.sin(this.t * 1.4) * 3 + shake;
    r.sprite(SATAN, r.w / 2 - 72 + shake, sy, { scale: 6 });
    r.dim(0.18, '#3a0a0a');
    if (bt > 1) r.dim(clamp01((bt - 1) * 0.5) * 0.12 + Math.sin(this.t * 9) * 0.04, '#5a0a10');
  }

  /** Dragged up onto a dawn street; horns fade as the human mask sets. */
  private drawTopside(c: GameCtx): void {
    const r = c.r;
    const bt = this.beatT;
    r.clear('#16121e');
    r.rect(0, 0, r.w, 84, '#241a2a'); // dawn band
    this.skyline(c, 152);
    r.rect(0, 152, r.w, 22, '#0c0a12'); // pavement
    r.rect(0, 170, r.w, 4, '#3a0a0a'); // the seam he threw you through, still glowing
    const rise = clamp01(bt / 1.4);
    const py = lerp(212, 128, rise);
    r.sprite(this.player.down[0], r.w / 2 - 16, py, { scale: 2 });
    const hornA = Math.max(0, 1 - (bt - 1.4) / 1.0);
    if (hornA > 0) r.sprite(HORNS, r.w / 2 - 16, py - 6, { scale: 2, alpha: hornA });
    if (bt > 2.3) r.text('"...perfect."', r.w / 2, py - 16, UI.text, { align: 'center', alpha: clamp01(bt - 2.3) });
  }

  /** Demon vision sweeps a crowd, exposing what each one lacks. */
  private drawVision(c: GameCtx): void {
    const r = c.r;
    const bt = this.beatT;
    r.clear('#0e0c16');
    this.skyline(c, 122);
    r.rect(0, 122, r.w, 10, '#0c0a12');
    const xs = [110, 240, 370];
    xs.forEach((cx, i) => r.sprite(this.civ[i].down[0], cx - 16, 82, { scale: 2 }));
    if (bt > 0.8) {
      const a = clamp01(bt - 0.8);
      r.dim(0.3 * a, '#46101c');
      r.sprite(CARD_ART.eye, r.w / 2 - 16, 16, { scale: 2, alpha: a });
      const sx = Math.min(r.w, (bt - 0.8) * 200);
      r.rect(sx, 30, 2, 100, '#e8604a', 0.6 * a);
      const wants = ['WANTS LOVE', 'WANTS ESCAPE', 'WANTS WEALTH'];
      xs.forEach((cx, i) => {
        if (sx > cx - 18) {
          r.sprite(AURAS[i + 1], cx - 12, 98, { alpha: 0.3 });
          const w = r.textWidth(wants[i]);
          r.rect(cx - w / 2 - 2, 68, w + 4, 9, '#08050a', 0.85);
          r.text(wants[i], cx, 69, UI.gold, { align: 'center' });
        }
      });
    }
    if (bt > 2.2) {
      const a = clamp01((bt - 2.2) * 2);
      r.sprite(CARD_ART.scroll, r.w / 2 + 86, 132, { scale: 2, alpha: a });
      r.text('SIGN', r.w / 2 + 86 + 16, 168, UI.gold, { align: 'center', alpha: a });
    }
    if (bt > 3.0) {
      // Never let them glimpse what you are.
      const flick = Math.sin(this.t * 18) > 0.4 ? 1 : 0;
      r.sprite(HORNS, r.w / 2 - 16 - 130, 82 - 6, { scale: 2, alpha: 0.7 * flick });
    }
  }

  /** Seven days light up with their quotas; the Boss waits at the bottom. */
  private drawQuota(c: GameCtx): void {
    const r = c.r;
    const bt = this.beatT;
    r.clear('#150407');
    this.fireStrips(c);
    const quotas = [1, 1, 2, 2, 3, 3, 4];
    const bw = 44;
    const gap = 8;
    const totalW = 7 * bw + 6 * gap;
    const x0 = (r.w - totalW) / 2;
    for (let d = 0; d < 7; d++) {
      const on = bt * 2.4 > d;
      const bx = x0 + d * (bw + gap);
      const by = 64;
      r.rect(bx, by, bw, 30, on ? (d === 6 ? '#2e0e12' : '#241420') : '#160a0e');
      r.frame(bx, by, bw, 30, d === 6 ? '#b8202c' : '#7a6a52');
      if (on) {
        r.text(`DAY ${d + 1}`, bx + bw / 2, by + 4, UI.dim, { align: 'center' });
        r.text(`${quotas[d]}`, bx + bw / 2, by + 13, d === 6 ? UI.bad : UI.gold, { align: 'center', scale: 2 });
      }
    }
    const sy = 250 - clamp01(bt / 1.6) * 118 + Math.sin(this.t * 1.4) * 3;
    r.sprite(SATAN, r.w / 2 - 72, sy, { scale: 6, alpha: 0.95 });
    if (bt > 2.1) r.dim(Math.min(0.3, (bt - 2.1) * 0.45), '#3a0a0a');
  }

  draw(c: GameCtx): void {
    const r = c.r;
    const beat = IntroScene.BEATS[this.beat];

    switch (this.beat) {
      case 0:
        this.drawClerk(c);
        break;
      case 1:
        this.drawSummons(c);
        break;
      case 2:
        this.drawTopside(c);
        break;
      case 3:
        this.drawVision(c);
        break;
      default:
        this.drawQuota(c);
        break;
    }

    // Captions: the Boss up top, the narrator along the bottom. Dark backing
    // strip keeps them legible over the animation.
    const speaker = beat.voice === 'satan';
    const baseY = speaker ? 24 : 180;
    const col = speaker ? '#ffd84a' : UI.text;
    r.rect(0, baseY - 6, r.w, beat.lines.length * 12 + 8, '#08050a', 0.55);
    beat.lines.forEach((line, i) => {
      const a = clamp01(this.beatT * 1.6 - i * 0.35);
      r.text(line, r.w / 2, baseY + i * 12, col, { align: 'center', alpha: a });
    });

    const last = this.beat >= IntroScene.BEATS.length - 1;
    if (this.beatT > 0.6 && Math.floor(this.t * 1.6) % 2 === 0) {
      r.text(last ? 'PRESS [ENTER] TO CLOCK IN' : '[ENTER]', r.w / 2, 250, UI.gold, { align: 'center' });
    }
    if (!last) r.text('ENTER: SKIP', r.w - 6, 6, '#6a5a60', { align: 'right' });
  }
}
