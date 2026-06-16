import { ARCHETYPES } from '../data/archetypes';
import { DISTRICTS } from '../data/districts';
import type { GameCtx, GScene } from '../ctx';
import { quotaFor, runDifficulty } from '../sim/run';
import { DAY_COUNT, type RunState } from '../sim/state';
import { drawHintBar, drawPanel, drawTopBar, UI } from './hud';
import { OverworldScene } from './overworld';

/** Morning briefing. You no longer pick the ground — the day drops you into a
 * world automatically, harder as the run wears on. This just shows where you've
 * landed and who's about. */
export class CityMapScene implements GScene {
  private t = 0;

  constructor(private run: RunState) {}

  update(c: GameCtx, dt: number): void {
    this.t += dt;
    if (c.input.hit('confirm')) {
      const d = DISTRICTS[this.run.world];
      c.transition.go(c, (cc) => cc.scenes.replace(cc, new OverworldScene(this.run)), {
        kind: 'curtain',
        label: d.name.toUpperCase(),
        sub: this.run.loop > 1 ? `DAY ${this.run.day} - LOOP ${this.run.loop}` : `DAY ${this.run.day}`,
        color: UI.gold,
      });
    }
  }

  draw(c: GameCtx): void {
    const r = c.r;
    const d = DISTRICTS[this.run.world];
    r.clear('#0e0a12');
    drawTopBar(c, this.run);

    r.text(this.run.loop > 1 ? `MORNING - DAY ${this.run.day}, LOOP ${this.run.loop}` : `MORNING, DAY ${this.run.day}`, 14, 22, UI.accent, { scale: 2 });
    r.text(`The dawn bus drops you somewhere new. Today's quota: ${quotaFor(this.run)} soul(s).`, 14, 42, UI.text);

    drawPanel(c, 14, 56, 300, 150, "TODAY'S GROUND");
    r.text(d.name, 22, 70, UI.gold, { scale: 2 });
    r.text(d.tagline, 22, 90, UI.dim);
    // Blurb, wrapped within the panel; track the baseline so nothing collides.
    let ly = 104;
    for (const w of wrapLines(d.blurb, 286, r.textWidth.bind(r))) {
      r.text(w, 22, ly, UI.text);
      ly += 10;
    }
    // Who's about — wrapped, so the long labels never bleed under CONDITIONS.
    ly += 6;
    r.text("YOU'LL MEET", 22, ly, UI.blue);
    ly += 10;
    const meet = d.archetypes.map((a) => ARCHETYPES[a].label).join(', ');
    for (const w of wrapLines(meet, 286, r.textWidth.bind(r))) {
      r.text(w, 22, ly, UI.text);
      ly += 10;
    }

    drawPanel(c, 322, 56, 144, 150, 'CONDITIONS');
    const diff = runDifficulty(this.run);
    r.text(`DIFFICULTY ${diff}`, 328, 72, diff > DAY_COUNT ? UI.bad : UI.gold);
    r.text(d.softness < 0.85 ? 'Locals: gullible' : d.softness > 0.97 ? 'Locals: guarded' : 'Locals: ordinary', 328, 86, UI.dim);
    r.text('Faster talk meter', 328, 100, diff > 4 ? UI.bad : UI.dim);
    r.text(`DECK ${this.run.deck.length}`, 328, 118, UI.text);
    r.text(`CHARMS ${this.run.charms.length || 'none'}`, 328, 130, UI.text);
    r.text(`FIRE ${this.run.fire}{`, 328, 142, UI.fire);

    if (Math.floor(this.t * 1.6) % 2 === 0) {
      r.text('[ENTER] STEP OUT', 240, 218, UI.text, { align: 'center' });
    }
    drawHintBar(c, '[ENTER] GET TO WORK   THE GROUND CHANGES EACH DAWN');
  }
}

/** Greedy word-wrap to a pixel width. */
function wrapLines(text: string, maxW: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const probe = line ? `${line} ${w}` : w;
    if (line && measure(probe) > maxW) {
      out.push(line);
      line = w;
    } else line = probe;
  }
  if (line) out.push(line);
  return out;
}
