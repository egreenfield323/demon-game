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
    r.sprite(SATAN, r.w - 110, 40 + bob, { scale: 4, alpha: 0.35 });

    r.text('THE ORIENTATION PIT', 14, 8, UI.accent, { scale: 2 });
    r.text('Management is watching. Again.', 14, 26, UI.dim);

    const m = c.meta.state;
    drawPanel(c, 14, 40, 200, 30);
    r.text(`SIN POINTS: ${m.sinPoints}`, 20, 46, UI.gold);
    r.text(`RUNS ${m.runs}  WINS ${m.wins}  BEST DAY ${m.bestDay}`, 20, 57, UI.dim);

    drawPanel(c, 14, 76, 240, 150, 'INFERNAL REQUISITIONS');
    UPGRADE_LIST.forEach((id, i) => {
      const u = UPGRADES[id];
      const y = 92 + i * 22;
      const selected = this.sel === i;
      if (selected) r.rect(17, y - 2, 234, 20, UI.panelLight);
      const owned = c.meta.has(id);
      r.text(selected ? '>' : ' ', 20, y, UI.accent);
      r.text(u.name, 28, y, owned ? UI.dim : UI.text);
      r.text(owned ? 'OWNED' : `${u.cost} SP`, 246, y, owned ? UI.good : UI.gold, { align: 'right' });
      if (selected) r.text(u.desc, 28, y + 9, UI.dim);
    });

    const beginY = 92 + UPGRADE_LIST.length * 22 + 4;
    const beginSel = this.sel === this.entries - 1;
    if (beginSel) r.rect(17, beginY - 3, 234, 14, '#3a1418');
    r.text(`${beginSel ? '> ' : '  '}BEGIN SHIFT (7 DAYS. DON'T FAIL.)`, 20, beginY, beginSel ? UI.accent : UI.text);

    drawPanel(c, 270, 76, 196, 120, 'MEMO FROM BELOW');
    const memo = [
      'Rep: you are 0 for forever.',
      '',
      'Hit the daily soul quota or',
      'the Boss collects YOU.',
      '',
      'Scan with Demon Vision.',
      'Say what they need to hear.',
      'Get the signature.',
    ];
    memo.forEach((line, i) => r.text(line, 276, 92 + i * 10, i < 2 ? UI.dim : UI.text));

    drawHintBar(c, '[UP/DOWN] SELECT   [ENTER] BUY / BEGIN');
  }
}
