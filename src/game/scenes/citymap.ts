import type { GameCtx, GScene } from '../ctx';
import { DISTRICT_LIST, DISTRICTS } from '../data/districts';
import { quotaFor } from '../sim/run';
import type { RunState } from '../sim/state';
import { drawHintBar, drawPanel, drawTopBar, UI } from './hud';
import { OverworldScene } from './overworld';

/** Morning: pick tonight's hunting ground. The bus only runs at dawn. */
export class CityMapScene implements GScene {
  private sel = 0;

  constructor(private run: RunState) {}

  update(c: GameCtx, _dt: number): void {
    if (c.input.hit('up')) {
      this.sel = (this.sel + DISTRICT_LIST.length - 1) % DISTRICT_LIST.length;
      c.audio.play('blip');
    }
    if (c.input.hit('down')) {
      this.sel = (this.sel + 1) % DISTRICT_LIST.length;
      c.audio.play('blip');
    }
    if (c.input.hit('confirm')) {
      c.audio.play('door');
      const id = DISTRICT_LIST[this.sel];
      c.transition.go(c, (cc) => cc.scenes.replace(cc, new OverworldScene(this.run, id)), {
        kind: 'curtain',
        label: DISTRICTS[id].name.toUpperCase(),
        sub: `DAY ${this.run.day}`,
        color: UI.gold,
      });
    }
  }

  draw(c: GameCtx): void {
    const r = c.r;
    r.clear('#0e0a12');
    drawTopBar(c, this.run);

    r.text(`MORNING, DAY ${this.run.day}`, 14, 22, UI.accent, { scale: 2 });
    r.text(`Today's quota: ${quotaFor(this.run)} soul(s). Pick your hunting ground.`, 14, 40, UI.text);

    DISTRICT_LIST.forEach((id, i) => {
      const d = DISTRICTS[id];
      const y = 56 + i * 56;
      const selected = this.sel === i;
      drawPanel(c, 14, y, 290, 50);
      if (selected) r.frame(14, y, 290, 50, UI.accent);
      r.text(`${selected ? '> ' : '  '}${d.name}`, 20, y + 6, selected ? UI.accent : UI.text);
      r.text('*'.repeat(d.danger), 296, y + 6, UI.gold, { align: 'right' });
      r.text(d.tagline, 26, y + 18, UI.dim);
      const jobs = d.archetypes.map((a) => a.toUpperCase()).join(', ');
      r.text(jobs, 26, y + 29, UI.blue);
      r.text(`SOULS FETCH AROUND $${d.danger} EACH`, 26, y + 40, UI.gold);
    });

    const d = DISTRICTS[DISTRICT_LIST[this.sel]];
    drawPanel(c, 316, 56, 152, 168, 'FIELD NOTES');
    const words = d.blurb.split(' ');
    let line = '';
    let ly = 72;
    for (const w of words) {
      const probe = line ? line + ' ' + w : w;
      if (r.textWidth(probe) > 138) {
        r.text(line, 322, ly, UI.text);
        ly += 10;
        line = w;
      } else {
        line = probe;
      }
    }
    if (line) r.text(line, 322, ly, UI.text);

    drawHintBar(c, '[UP/DOWN] DISTRICT   [ENTER] RIDE THE DAWN BUS');
  }
}
