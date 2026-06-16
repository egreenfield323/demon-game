import type { GameCtx, GScene } from '../ctx';
import { SATAN } from '../data/sprites/chars';
import { advanceWorld, quotaFor, startDay, type DayOutcome } from '../sim/run';
import { DAY_COUNT, type RunState } from '../sim/state';
import { CityMapScene } from './citymap';
import { drawHintBar, drawPanel, UI } from './hud';
import { NightScene } from './night';
import { RunEndScene } from './runend';

/** Quota check at 20:00 (or early sleep). Either a tidy little summary, a
 * survive-the-week fork (bank or loop), or the Boss pays a visit. */
export class DayEndScene implements GScene {
  private t = 0;
  /** On the final day: 0 = bank & clock out, 1 = sign on for another loop. */
  private choice = 0;

  constructor(
    private run: RunState,
    private outcome: DayOutcome,
    /** Dragged off by the Exorcist rather than a missed quota. */
    private caught = false,
  ) {}

  private get finalDay(): boolean {
    return this.run.day >= DAY_COUNT;
  }

  enter(c: GameCtx): void {
    if (this.outcome === 'satan') c.audio.play('satan');
    else c.audio.play('levelup');
  }

  update(c: GameCtx, dt: number): void {
    this.t += dt;
    if (this.outcome === 'satan') {
      // The run-end review is its own cinematic; cut straight to it.
      if (this.t > 3 && c.input.hit('confirm')) {
        c.scenes.replace(c, new RunEndScene(this.run, false));
      }
      return;
    }

    // Surviving the seventh day: bank the run, or push into a harder loop.
    if (this.finalDay) {
      if (c.input.hit('up') || c.input.hit('down')) {
        this.choice = 1 - this.choice;
        c.audio.play('blip');
      }
      if (c.input.hit('confirm')) {
        if (this.choice === 0) {
          c.audio.play('confirm');
          c.scenes.replace(c, new RunEndScene(this.run, true));
        } else {
          c.audio.play('satan');
          this.run.loop += 1;
          this.run.day = 1;
          advanceWorld(this.run);
          startDay(this.run);
          c.transition.go(c, (cc) => cc.scenes.replace(cc, new CityMapScene(this.run)), {
            kind: 'rise',
            label: `LOOP ${this.run.loop}`,
            sub: 'HARDER. RICHER. YOUR FUNERAL.',
            color: UI.accent,
          });
        }
      }
      return;
    }

    if (c.input.hit('confirm')) {
      c.audio.play('confirm');
      c.transition.go(c, (cc) => cc.scenes.replace(cc, new NightScene(this.run)), {
        kind: 'descend',
        label: 'THE COMMISSARY',
        color: UI.blue,
      });
    }
  }

  draw(c: GameCtx): void {
    const r = c.r;

    if (this.outcome === 'satan') {
      const shake = this.t < 2.6 ? Math.sin(this.t * 50) * Math.max(0, 2.6 - this.t) * 2 : 0;
      r.clear('#1a0408');
      for (let i = 0; i < 8; i++) {
        r.rect(0, 230 + i * 5 + shake, r.w, 5, i % 2 ? '#2a060c' : '#200508');
      }
      const rise = Math.min(1, Math.max(0, (this.t - 0.6) / 2));
      const satanY = 270 - rise * 220;
      r.sprite(SATAN, r.w / 2 - 72 + shake, satanY, { scale: 6 });
      r.dim(0.25, '#3a0a0a');

      if (this.t > 1.2) {
        r.text(this.caught ? 'EXPOSED.' : 'QUOTA UNMET.', r.w / 2, 30, UI.bad, { align: 'center', scale: 3 });
      }
      if (this.t > 2.0) {
        const sub = this.caught
          ? 'A PRIEST HANDED YOU TO THE BOSS HIMSELF.'
          : `${this.run.soulsToday} OF ${quotaFor(this.run)} SOULS. ON DAY ${this.run.day}.`;
        r.text(sub, r.w / 2, 60, UI.text, { align: 'center' });
      }
      if (this.t > 2.8) {
        r.text(this.caught ? '"YOU LET THEM SEE YOU. SLOPPY."' : '"PATHETIC. EVEN FOR YOU."', r.w / 2, 76, '#ffd84a', {
          align: 'center',
        });
      }
      if (this.t > 3.4 && Math.floor(this.t * 2) % 2 === 0) {
        r.text('[ENTER] BE DRAGGED BACK', r.w / 2, 250, UI.dim, { align: 'center' });
      }
      return;
    }

    r.clear('#0e0a12');
    drawPanel(c, 90, 56, 300, 96, this.outcome === 'forgiven' ? 'A MEMO ARRIVES' : 'DAY COMPLETE');
    r.text(this.run.loop > 1 ? `DAY ${this.run.day}/${DAY_COUNT} - LOOP ${this.run.loop}` : `DAY ${this.run.day} / ${DAY_COUNT}`, 240, 78, UI.gold, { align: 'center', scale: 2 });

    if (this.outcome === 'forgiven') {
      r.text('"This failure has been reclassified', 240, 104, UI.text, { align: 'center' });
      r.text('as a SUCCESS." - HR. (Loophole spent.)', 240, 116, UI.dim, { align: 'center' });
    } else {
      r.text(`SOULS TODAY: ${this.run.soulsToday} / ${quotaFor(this.run)}`, 240, 104, UI.good, { align: 'center' });
      r.text(`COMMISSION HELD: $${this.run.coins}`, 240, 116, UI.gold, { align: 'center' });
      r.text(`SOULS THIS WEEK: ${this.run.totalSouls}`, 240, 128, UI.text, { align: 'center' });
    }

    if (this.finalDay) {
      r.text('A WEEK SURVIVED. The bus idles. So does the Pit.', 240, 162, UI.text, { align: 'center' });
      const opt = (i: number, label: string, col: string): void => {
        const sel = this.choice === i;
        const y = 178 + i * 16;
        if (sel) r.rect(120, y - 3, 240, 14, UI.panelLight);
        r.text(`${sel ? '> ' : '  '}${label}`, 240, y, sel ? col : UI.dim, { align: 'center' });
      };
      opt(0, 'CLOCK OUT - bank your Sin', UI.gold);
      opt(1, `SIGN ON - loop ${this.run.loop + 1}, harder & richer`, UI.accent);
      drawHintBar(c, '[UP/DOWN] CHOOSE   [ENTER] CONFIRM   PUSH YOUR LUCK?');
    } else {
      r.text('[ENTER] VISIT THE COMMISSARY', 240, 165, UI.accent, { align: 'center' });
      drawHintBar(c, 'THE BOSS IS... NOT DISPLEASED');
    }
  }
}
