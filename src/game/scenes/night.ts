import type { GameCtx, GScene } from '../ctx';
import { CARDS } from '../data/cards';
import { CHARMS, CONSUMABLES } from '../data/charms';
import { buyItem, genShop, type ShopItem } from '../sim/shop';
import { startDay } from '../sim/run';
import type { RunState } from '../sim/state';
import { CityMapScene } from './citymap';
import { drawHintBar, drawPanel, UI } from './hud';

function itemName(it: ShopItem): string {
  if (it.kind === 'charm') return CHARMS[it.id].name;
  if (it.kind === 'card') return `${CARDS[it.id].name} [CARD]`;
  return CONSUMABLES[it.id].name;
}

/** The Underworld Commissary. Spend commission, mind the curses, sleep. */
export class NightScene implements GScene {
  private items: ShopItem[];
  private sold = new Set<number>();
  private sel = 0;
  private msg = 'Everything here helps. Everything here costs.';

  constructor(private run: RunState) {
    this.items = genShop(run);
  }

  private get entries(): number {
    return this.items.length + 1;
  }

  update(c: GameCtx, _dt: number): void {
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
        c.audio.play('door');
        this.run.day += 1;
        startDay(this.run);
        c.transition.go(c, (cc) => cc.scenes.replace(cc, new CityMapScene(this.run)), {
          kind: 'rise',
          label: 'DAWN',
          sub: `DAY ${this.run.day}`,
          color: UI.gold,
        });
        return;
      }
      const item = this.items[this.sel];
      if (this.sold.has(this.sel)) {
        c.audio.play('denied');
        this.msg = 'Already sold. The shelf remembers.';
      } else if (buyItem(this.run, item)) {
        c.audio.play('coin');
        this.sold.add(this.sel);
        this.msg = 'A pleasure doing business with the damned.';
      } else {
        c.audio.play('denied');
        this.msg = 'Insufficient coin. Souls first, trinkets after.';
      }
    }
  }

  draw(c: GameCtx): void {
    const r = c.r;
    r.clear('#0c0710');
    r.text('THE UNDERWORLD COMMISSARY', 14, 8, UI.accent, { scale: 2 });
    r.text(`Night after day ${this.run.day}. ${'$'} ${this.run.coins} in commission.`, 14, 26, UI.text);

    drawPanel(c, 14, 38, 250, 186, 'TONIGHT\'S SHELF');
    this.items.forEach((it, i) => {
      const y = 54 + i * 24;
      const selected = this.sel === i;
      const sold = this.sold.has(i);
      if (selected) r.rect(17, y - 2, 244, 22, UI.panelLight);
      r.text(selected ? '>' : ' ', 20, y, UI.accent);
      r.text(itemName(it), 28, y, sold ? '#5a4a52' : UI.text);
      r.text(sold ? 'SOLD' : `$${it.price}`, 256, y, sold ? UI.dim : UI.gold, { align: 'right' });
      const kind = it.kind.toUpperCase();
      r.text(kind, 28, y + 10, UI.dim);
    });
    const sleepY = 54 + this.items.length * 24 + 4;
    const sleepSel = this.sel === this.entries - 1;
    if (sleepSel) r.rect(17, sleepY - 3, 244, 14, '#3a1418');
    r.text(`${sleepSel ? '> ' : '  '}SLEEP UNTIL DAWN (DAY ${this.run.day + 1})`, 20, sleepY, sleepSel ? UI.accent : UI.text);

    drawPanel(c, 276, 38, 192, 130, 'APPRAISAL');
    if (this.sel < this.items.length) {
      const it = this.items[this.sel];
      let ly = 56;
      const write = (text: string, color: string) => {
        for (const line of splitLines(text, 178, r.textWidth.bind(r))) {
          r.text(line, 282, ly, color);
          ly += 10;
        }
        ly += 3;
      };
      if (it.kind === 'charm') {
        const ch = CHARMS[it.id];
        write(`BOON: ${ch.boon}`, UI.good);
        write(`CURSE: ${ch.curse}`, UI.bad);
      } else if (it.kind === 'card') {
        const card = CARDS[it.id];
        write(card.desc, UI.text);
        write(card.line, UI.dim);
      } else {
        write(CONSUMABLES[it.id].desc, UI.text);
      }
    } else {
      r.text('Tomorrow has a bigger quota.', 282, 56, UI.text);
      r.text('Sleep rarely helps. Try anyway.', 282, 66, UI.dim);
    }

    drawPanel(c, 276, 174, 192, 50, 'INVENTORY');
    r.text(`DECK: ${this.run.deck.length} LINES`, 282, 190, UI.blue);
    r.text(`CHARMS: ${this.run.charms.length ? this.run.charms.length : 'NONE'}`, 282, 200, UI.gold);
    r.text(`FIRE TOMORROW: ${this.run.maxFire}{`, 282, 210, UI.fire);

    r.text(this.msg, 14, 232, UI.dim);
    drawHintBar(c, '[UP/DOWN] BROWSE   [ENTER] BUY / SLEEP');
  }
}

function splitLines(text: string, maxW: number, measure: (s: string) => number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (measure(probe) > maxW && line) {
      out.push(line);
      line = w;
    } else {
      line = probe;
    }
  }
  if (line) out.push(line);
  return out;
}
