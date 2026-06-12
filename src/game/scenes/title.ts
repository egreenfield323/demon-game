import type { GameCtx, GScene } from '../ctx';
import { UI } from './hud';
import { PitScene } from './pit';

export class TitleScene implements GScene {
  private t = 0;

  update(c: GameCtx, dt: number): void {
    this.t += dt;
    if (c.input.hit('confirm')) {
      c.audio.play('confirm');
      c.scenes.replace(c, new PitScene());
    }
  }

  draw(c: GameCtx): void {
    const r = c.r;
    r.clear('#0c0610');

    // Smouldering horizon.
    for (let i = 0; i < 14; i++) {
      const flick = Math.sin(this.t * 3 + i * 1.7) * 2;
      r.rect(i * 36, 232 + (i % 3) * 4 + flick, 36, 40, i % 2 ? '#2a0c14' : '#360e16', 0.8);
    }
    r.rect(0, 252, r.w, 18, '#1a060c');

    const flames = '{ '.repeat(9);
    r.text(flames, r.w / 2, 38, '#a8362a', { align: 'center' });

    r.text('SOUL QUOTA', r.w / 2 + 2, 72 + 2, '#401418', { align: 'center', scale: 4 });
    r.text('SOUL QUOTA', r.w / 2, 72, UI.accent, { align: 'center', scale: 4 });

    r.text('A DOOR-TO-DOOR DAMNATION SIM', r.w / 2, 118, UI.dim, { align: 'center' });

    const lore = [
      'You are the worst salesman in Hell.',
      'One last chance: seven days topside,',
      'a daily quota of souls, and a smile',
      'that almost passes for human.',
    ];
    lore.forEach((line, i) => r.text(line, r.w / 2, 145 + i * 11, UI.text, { align: 'center' }));

    if (Math.floor(this.t * 1.6) % 2 === 0) {
      r.text('PRESS [ENTER] TO CLOCK IN', r.w / 2, 205, UI.gold, { align: 'center' });
    }
    r.text('MOVE: WASD/ARROWS  TALK: E  VISION: V  BACK: ESC', r.w / 2, 245, '#6a5a60', { align: 'center' });
  }
}
