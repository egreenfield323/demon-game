import type { GameCtx, GScene } from '../ctx';
import { daysSurvived, sinPointsFor } from '../sim/run';
import { type RunState } from '../sim/state';
import { drawHintBar, drawPanel, UI } from './hud';
import { PitScene } from './pit';

export class RunEndScene implements GScene {
  private sin = 0;
  private t = 0;

  constructor(
    private run: RunState,
    private won: boolean,
  ) {}

  enter(c: GameCtx): void {
    this.sin = sinPointsFor(this.run, this.won);
    c.meta.recordRun({
      souls: this.run.totalSouls,
      daysCompleted: daysSurvived(this.run, this.won),
      won: this.won,
      sinEarned: this.sin,
    });
    if (this.won) c.audio.play('levelup');
  }

  update(c: GameCtx, dt: number): void {
    this.t += dt;
    if (this.t > 0.5 && c.input.hit('confirm')) {
      c.audio.play('confirm');
      c.transition.go(c, (cc) => cc.scenes.reset(cc, new PitScene()), {
        kind: 'rise',
        label: 'THE ORIENTATION PIT',
      });
    }
  }

  draw(c: GameCtx): void {
    const r = c.r;
    r.clear(this.won ? '#101408' : '#140608');

    const title = this.won ? 'QUOTA WEEK SURVIVED' : 'DRAGGED BACK TO THE PIT';
    const sub = this.won
      ? 'Promoted to Slightly Less Junior Temptation Associate.'
      : 'Your desk has been reassigned. Your stapler, incinerated.';
    r.text(title, r.w / 2, 36, this.won ? UI.gold : UI.bad, { align: 'center', scale: 3 });
    r.text(sub, r.w / 2, 70, UI.text, { align: 'center' });

    drawPanel(c, 140, 92, 200, 110, 'PERFORMANCE REVIEW');
    const days = daysSurvived(this.run, this.won);
    const lines: Array<[string, string, string]> = [
      ['DAYS SURVIVED', this.run.loop > 1 ? `${days} (loop ${this.run.loop})` : `${days}`, UI.text],
      ['SOULS HARVESTED', `${this.run.totalSouls}`, UI.text],
      ['COMMISSION LEFT', `$${this.run.coins}`, UI.gold],
      ['SIN POINTS EARNED', `+${this.sin}`, UI.accent],
      ['SIN BALANCE', `${c.meta.state.sinPoints}`, UI.gold],
    ];
    lines.forEach(([k, v, col], i) => {
      const y = 110 + i * 16;
      r.text(k, 150, y, UI.dim);
      r.text(v, 330, y, col, { align: 'right' });
    });

    if (Math.floor(this.t * 1.6) % 2 === 0) {
      r.text('[ENTER] RETURN TO THE ORIENTATION PIT', r.w / 2, 220, UI.text, { align: 'center' });
    }
    drawHintBar(c, this.won ? 'MANAGEMENT REMEMBERS THIS. BRIEFLY.' : 'SIN POINTS PERSIST. SPEND THEM WISELY.');
  }
}
