import type { GameCtx, GScene } from '../ctx';
import { SATAN } from '../data/sprites/chars';
import { quotaFor, type DayOutcome } from '../sim/run';
import { DAY_COUNT, type RunState } from '../sim/state';
import { drawHintBar, drawPanel, UI } from './hud';
import { NightScene } from './night';
import { RunEndScene } from './runend';

/** Quota check at 20:00 (or early sleep). Either a tidy little summary,
 * or the Boss pays a visit. */
export class DayEndScene implements GScene {
  private t = 0;

  constructor(
    private run: RunState,
    private outcome: DayOutcome,
    /** Dragged off by the Exorcist rather than a missed quota. */
    private caught = false,
  ) {}

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
    if (c.input.hit('confirm')) {
      c.audio.play('confirm');
      if (this.run.day >= DAY_COUNT) {
        c.scenes.replace(c, new RunEndScene(this.run, true));
      } else {
        c.transition.go(c, (cc) => cc.scenes.replace(cc, new NightScene(this.run)), {
          kind: 'descend',
          label: 'THE COMMISSARY',
          color: UI.blue,
        });
      }
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
    const won = this.run.day >= DAY_COUNT;
    drawPanel(c, 90, 60, 300, 130, this.outcome === 'forgiven' ? 'A MEMO ARRIVES' : 'DAY COMPLETE');
    r.text(`DAY ${this.run.day} / ${DAY_COUNT}`, 240, 84, UI.gold, { align: 'center', scale: 2 });

    if (this.outcome === 'forgiven') {
      r.text('"Per the attached form, this failure', 240, 110, UI.text, { align: 'center' });
      r.text('has been reclassified as a SUCCESS."', 240, 120, UI.text, { align: 'center' });
      r.text('- HR, with feeling. (Loophole spent.)', 240, 132, UI.dim, { align: 'center' });
    } else {
      r.text(`SOULS TODAY: ${this.run.soulsToday} / ${quotaFor(this.run)}`, 240, 110, UI.good, { align: 'center' });
      r.text(`COMMISSION HELD: $${this.run.coins}`, 240, 122, UI.gold, { align: 'center' });
      r.text(`SOULS THIS WEEK: ${this.run.totalSouls}`, 240, 134, UI.text, { align: 'center' });
    }

    const next = won ? 'COLLECT YOUR PROMOTION' : 'VISIT THE COMMISSARY';
    r.text(`[ENTER] ${next}`, 240, 165, UI.accent, { align: 'center' });
    drawHintBar(c, won ? 'SEVEN DAYS SURVIVED' : 'THE BOSS IS... NOT DISPLEASED');
  }
}
