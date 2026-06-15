import type { GameCtx, GScene } from '../ctx';
import { SATAN } from '../data/sprites/chars';
import { UPGRADES, UPGRADE_LIST } from '../data/upgrades';
import { newRun } from '../sim/run';
import { DAY_COUNT } from '../sim/state';
import { CityMapScene } from './citymap';
import { drawHintBar, drawPanel, UI } from './hud';

/** The Orientation Pit: spend Sin Points, then clock in for another run. */
export class PitScene implements GScene {
  private sel = 0;
  private t = 0;

  private get entries(): number {
    return UPGRADE_LIST.length + 1; // +1 for BEGIN SHIFT
  }

  update(c: GameCtx, dt: number): void {
    this.t += dt;
    if (c.input.hit('up')) {
      this.sel = (this.sel + this.entries - 1) % this.entries;
      c.audio.play('blip');
    }
    if (c.input.hit('down')) {
      this.sel = (this.sel + 1) % this.entries;
      c.audio.play('blip');
    }
    if (c.input.hit('confirm')) {
      if (this.sel === this.entries - 1) {
        c.audio.play('satan');
        const run = newRun(c.meta.state, c.newSeed());
        c.transition.go(c, (cc) => cc.scenes.replace(cc, new CityMapScene(run)), {
          kind: 'rise',
          label: 'CLOCK IN',
          sub: `DAY ${run.day} OF ${DAY_COUNT}`,
          color: UI.gold,
        });
      } else {
        const id = UPGRADE_LIST[this.sel];
        if (c.meta.has(id)) {
          c.audio.play('denied');
        } else if (c.meta.buyUpgrade(id)) {
          c.audio.play('levelup');
        } else {
          c.audio.play('denied');
        }
      }
    }
  }

  draw(c: GameCtx): void {
    const r = c.r;
    r.clear('#140608');
    // Pit walls.
    for (let i = 0; i < 10; i++) {
      r.rect(0, i * 28, r.w, 14, i % 2 ? '#1a080c' : '#160709', 0.9);
    }
    const bob = Math.sin(this.t * 1.5) * 3;
    r.sprite(SATAN, r.w - 96, 30 + bob, { scale: 3, alpha: 0.3 });

    r.text('THE ORIENTATION PIT', 14, 8, UI.accent, { scale: 2 });
    r.text('Management is watching. Again.', 14, 26, UI.dim);

    const m = c.meta.state;
    drawPanel(c, 14, 40, 452, 26);
    r.text(`SIN POINTS: ${m.sinPoints}`, 20, 48, UI.gold);
    r.text(`RUNS ${m.runs}   WINS ${m.wins}   BEST DAY ${m.bestDay}`, 250, 48, UI.dim);

    // --- Scrollable requisitions list ---
    const total = this.entries;
    const VISIBLE = 8;
    const rowH = 15;
    const listTop = 96;
    const maxOff = Math.max(0, total - VISIBLE);
    const offset = Math.max(0, Math.min(maxOff, this.sel - Math.floor(VISIBLE / 2)));

    drawPanel(c, 14, 72, 240, 154, 'INFERNAL REQUISITIONS');
    for (let row = 0; row < VISIBLE && offset + row < total; row++) {
      const i = offset + row;
      const y = listTop + row * rowH;
      const selected = this.sel === i;
      if (selected) r.rect(17, y - 2, 234, rowH, UI.panelLight);
      if (i < UPGRADE_LIST.length) {
        const u = UPGRADES[UPGRADE_LIST[i]];
        const owned = c.meta.has(UPGRADE_LIST[i]);
        r.text(selected ? '>' : ' ', 20, y, UI.accent);
        r.text(u.name, 28, y, owned ? UI.dim : UI.text);
        r.text(owned ? 'OWNED' : `${u.cost}`, 248, y, owned ? UI.good : UI.gold, { align: 'right' });
      } else {
        r.text(`${selected ? '>' : ' '} BEGIN SHIFT`, 20, y, selected ? UI.accent : UI.text);
        r.text("DON'T FAIL", 248, y, UI.bad, { align: 'right' });
      }
    }
    // Scroll hints live in the panel margins (above first / below last row) so
    // they never sit on top of an option.
    if (offset > 0) scrollTri(c, 134, 86, true);
    if (offset + VISIBLE < total) scrollTri(c, 134, 216, false);

    // --- Detail of the selected entry ---
    drawPanel(c, 270, 72, 196, 154, 'REQUISITION');
    if (this.sel < UPGRADE_LIST.length) {
      const id = UPGRADE_LIST[this.sel];
      const u = UPGRADES[id];
      const owned = c.meta.has(id);
      r.text(u.name, 276, 90, UI.text);
      let dy = 104;
      for (const line of wrap(u.desc, 184, r.textWidth.bind(r))) {
        r.text(line, 276, dy, UI.dim);
        dy += 10;
      }
      dy += 6;
      if (owned) {
        r.text('OWNED', 276, dy, UI.good);
      } else {
        const afford = m.sinPoints >= u.cost;
        r.text(`COST: ${u.cost} SIN`, 276, dy, afford ? UI.gold : UI.bad);
        r.text(afford ? '[ENTER] REQUISITION' : 'NOT ENOUGH SIN', 276, dy + 12, afford ? UI.accent : UI.dim);
      }
    } else {
      const memo = ['Seven days topside.', 'A quota every dawn.', '', 'Scan. Say what they', 'need. Get the', 'signature. Survive.'];
      memo.forEach((line, i) => r.text(line, 276, 90 + i * 11, i === 2 ? UI.dim : UI.text));
      r.text('[ENTER] CLOCK IN', 276, 90 + memo.length * 11 + 4, UI.accent);
    }

    drawHintBar(c, '[UP/DOWN] SELECT   [ENTER] BUY / BEGIN');
  }
}

/** A small filled triangle (the font has no arrow glyphs). */
function scrollTri(c: GameCtx, cx: number, cy: number, up: boolean): void {
  for (let i = 0; i < 4; i++) {
    const w = up ? 1 + i * 2 : 7 - i * 2;
    c.r.rect(cx - Math.floor(w / 2), cy + i, w, 1, UI.gold);
  }
}

/** Greedy word-wrap for the detail blurb. */
function wrap(text: string, maxW: number, measure: (s: string) => number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (line && measure(probe) > maxW) {
      out.push(line);
      line = w;
    } else {
      line = probe;
    }
  }
  if (line) out.push(line);
  return out;
}
