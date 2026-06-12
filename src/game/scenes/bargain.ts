import type { GameCtx, GScene } from '../ctx';
import { ARCHETYPES } from '../data/archetypes';
import { CARDS, type CardDef } from '../data/cards';
import { KEYWORD_COLORS } from '../data/keywords';
import { TRAITS } from '../data/traits';
import { buildCharacter } from '../data/sprites/chars';
import {
  canPlay,
  playCard,
  startBargain,
  walkAway,
  type BargainOpts,
  type BargainState,
} from '../sim/bargain';
import { drawHintBar, drawPanel, UI } from './hud';

interface LogLine {
  text: string;
  color: string;
}

interface Floater {
  text: string;
  color: string;
  x: number;
  y: number;
  t: number;
}

const MOOD_COLOR: Record<string, string> = {
  neutral: '#9a8a90',
  receptive: '#8ae86a',
  wary: '#e8c84a',
  offended: '#e8604a',
};

export class BargainScene implements GScene {
  private st: BargainState;
  private sel = 0;
  private log: LogLine[] = [];
  private npcLine: string;
  private floats: Floater[] = [];
  private terminal = false;
  private confirmExit = false;
  private t = 0;
  private shakeW = 0;
  private shakeS = 0;

  constructor(
    opts: BargainOpts,
    private onDone: (st: BargainState) => void,
  ) {
    this.st = startBargain(opts);
    const arch = ARCHETYPES[opts.npc.archetype];
    this.npcLine = `${opts.npc.name} sizes you up.`;
    this.log.push({ text: `You corner ${opts.npc.name}, ${arch.label}.`, color: UI.dim });
    if ((opts.startSuspicion ?? 0) > 0) {
      this.log.push({ text: 'They have heard things about you today.', color: UI.bad });
    }
  }

  private pushLog(text: string, color: string): void {
    this.log.push({ text, color });
    if (this.log.length > 5) this.log.shift();
  }

  private bark(pool: string[]): string {
    return this.st.rng.pick(pool);
  }

  private processPlay(c: GameCtx, idx: number): void {
    const events = playCard(this.st, idx);
    const arch = ARCHETYPES[this.st.npc.archetype];
    for (const ev of events) {
      switch (ev.kind) {
        case 'say':
          this.pushLog(`YOU: ${ev.text}`, UI.text);
          break;
        case 'dmg': {
          const amt = ev.amount ?? 0;
          if (amt <= 0) {
            c.audio.play('zeroHit');
            this.floats.push({ text: 'NO EFFECT', color: UI.dim, x: 360, y: 30, t: 1 });
          } else {
            c.audio.play(amt >= 12 ? 'bigHit' : 'hit');
            this.shakeW = 0.25;
            const tag = ev.hit === 'desire' ? ' DEEP CUT!' : ev.hit === 'trait' ? ' it lands.' : '';
            this.floats.push({ text: `-${amt}${tag}`, color: ev.hit === 'desire' ? UI.gold : UI.good, x: 360, y: 30, t: 1 });
          }
          break;
        }
        case 'susp': {
          c.audio.play('suspicion');
          this.shakeS = 0.25;
          this.floats.push({ text: `+${ev.amount}`, color: UI.bad, x: 360, y: 52, t: 1 });
          break;
        }
        case 'soothe':
          if ((ev.amount ?? 0) > 0) {
            c.audio.play('soothe');
            this.floats.push({ text: `-${ev.amount}`, color: UI.blue, x: 360, y: 52, t: 1 });
          }
          break;
        case 'reveal':
          c.audio.play('scan');
          this.pushLog(ev.text ?? '', UI.blue);
          break;
        case 'mood':
          this.pushLog(`(Their mood shifts: ${ev.text?.toUpperCase()})`, MOOD_COLOR[ev.text ?? 'neutral']);
          break;
        case 'info':
          this.pushLog(ev.text ?? '', UI.dim);
          break;
        case 'status':
          break;
      }
    }

    const status = this.st.status;
    if (status === 'active') {
      const pool =
        this.st.mood === 'receptive'
          ? arch.barks.receptive
          : this.st.mood === 'wary'
            ? arch.barks.wary
            : this.st.mood === 'offended'
              ? arch.barks.offended
              : arch.barks.neutral;
      this.npcLine = this.bark(pool);
    } else {
      this.terminal = true;
      if (status === 'signed') {
        c.audio.play('sign');
        this.npcLine = arch.barks.sign;
      } else if (status === 'fled') {
        c.audio.play('flee');
        this.npcLine = arch.barks.flee;
      } else {
        c.audio.play('cancel');
        this.npcLine = arch.barks.bored;
      }
    }
    this.sel = Math.min(this.sel, Math.max(0, this.st.hand.length - 1));
  }

  update(c: GameCtx, dt: number): void {
    this.t += dt;
    this.shakeW = Math.max(0, this.shakeW - dt);
    this.shakeS = Math.max(0, this.shakeS - dt);
    this.floats = this.floats.filter((f) => {
      f.t -= dt;
      f.y -= dt * 14;
      return f.t > 0;
    });

    if (this.terminal) {
      if (c.input.hit('confirm')) {
        c.audio.play('confirm');
        this.onDone(this.st);
        c.scenes.pop();
      }
      return;
    }

    if (this.confirmExit) {
      if (c.input.hit('confirm')) {
        walkAway(this.st);
        this.confirmExit = false;
        this.terminal = true;
        this.npcLine = '"...okay then. Weird guy."';
        c.audio.play('cancel');
      } else if (c.input.hit('cancel')) {
        this.confirmExit = false;
        c.audio.play('blip');
      }
      return;
    }

    if (c.input.hit('cancel')) {
      this.confirmExit = true;
      c.audio.play('blip');
      return;
    }
    if (c.input.hit('left')) {
      this.sel = (this.sel + this.st.hand.length - 1) % Math.max(1, this.st.hand.length);
      c.audio.play('blip');
    }
    if (c.input.hit('right')) {
      this.sel = (this.sel + 1) % Math.max(1, this.st.hand.length);
      c.audio.play('blip');
    }
    if (c.input.hit('confirm') && this.st.hand.length > 0) {
      const check = canPlay(this.st, this.sel);
      if (!check.ok) {
        c.audio.play('denied');
        if (check.reason) this.pushLog(check.reason, UI.dim);
        return;
      }
      this.processPlay(c, this.sel);
    }
  }

  private cardHint(card: CardDef): LogLine | null {
    if (!card.kw) return null;
    const npc = this.st.npc;
    if (this.st.reveal.desire && card.kw === npc.desire) return { text: '>>> THE DESIRE', color: UI.gold };
    if (this.st.reveal.ick && card.kw === npc.ick) return { text: 'XX THE ICK', color: UI.bad };
    const known = npc.traits.filter((t, i) => this.st.reveal.traits[i]);
    if (known.some((t) => TRAITS[t].keywords.includes(card.kw!))) return { text: '+ RESONATES', color: UI.blue };
    return null;
  }

  draw(c: GameCtx): void {
    const r = c.r;
    const st = this.st;
    const npc = st.npc;
    const arch = ARCHETYPES[npc.archetype];
    r.clear('#0e0812');
    r.rect(0, 0, r.w, 4, '#2a0c14');
    r.rect(0, r.h - 4, r.w, 4, '#2a0c14');

    // --- Left: the mark ---
    drawPanel(c, 8, 10, 132, 158);
    const sprites = buildCharacter({ ...arch.palette, s: npc.skin }, `${npc.archetype}-${npc.skin}`);
    r.sprite(sprites.down[0], 42, 18, { scale: 4 });
    r.text(npc.name, 74, 102, UI.text, { align: 'center' });
    r.text(arch.label, 74, 112, UI.dim, { align: 'center' });

    let infoY = 124;
    if (st.reveal.traits[0] || st.reveal.traits[1]) {
      r.text(`${npc.traits[0]} / ${npc.traits[1]}`, 74, infoY, UI.blue, { align: 'center' });
    } else {
      r.text('TRAITS: ? ?', 74, infoY, '#7a6a72', { align: 'center' });
    }
    infoY += 10;
    if (st.reveal.desire) {
      r.text(`WANTS ${npc.desire}`, 74, infoY, UI.gold, { align: 'center' });
      infoY += 10;
    }
    if (st.reveal.ick) {
      r.text(`HATES ${npc.ick}`, 74, infoY, UI.bad, { align: 'center' });
      infoY += 10;
    }
    if (st.reveal.quirk && npc.quirk) {
      r.text(npc.quirk, 74, infoY, UI.accent, { align: 'center' });
    }

    // --- Right: bars ---
    const wob = this.shakeW > 0 ? Math.round(Math.sin(this.t * 60) * 2) : 0;
    const sob = this.shakeS > 0 ? Math.round(Math.sin(this.t * 60) * 2) : 0;
    r.text('WILLPOWER', 150, 14, UI.text);
    const wpFrac = st.willpower / npc.maxWillpower;
    r.rect(150 + wob, 24, 250, 10, '#0c080c');
    r.rect(151 + wob, 25, Math.round(248 * Math.max(0, wpFrac)), 8, wpFrac > 0.5 ? '#5aa84a' : wpFrac > 0.25 ? '#c8a83a' : '#c84a3a');
    r.frame(150 + wob, 24, 250, 10, UI.border);
    r.text(`${st.willpower}/${npc.maxWillpower}`, 406, 25, UI.text);

    r.text('SUSPICION', 150, 38, UI.text);
    r.rect(150 + sob, 48, 250, 10, '#0c080c');
    r.rect(151 + sob, 49, Math.round(248 * Math.min(1, st.suspicion / 100)), 8, st.suspicion < 50 ? '#c8a83a' : '#d8503a');
    r.frame(150 + sob, 48, 250, 10, UI.border);
    r.text(`${st.suspicion}/100`, 406, 49, st.suspicion >= 70 ? UI.bad : UI.text);

    r.text('PATIENCE', 150, 62, UI.text);
    const pips = '*'.repeat(Math.max(0, st.patience)) + '-'.repeat(Math.max(0, st.maxPatience - st.patience));
    r.text(pips, 210, 62, UI.gold);
    r.text(`MOOD: ${st.mood.toUpperCase()}`, 406, 62, MOOD_COLOR[st.mood], { align: 'right' });

    // --- Dialogue log ---
    drawPanel(c, 150, 74, 322, 94);
    let ly = 80;
    for (const line of this.log) {
      r.text(line.text.length > 52 ? line.text.slice(0, 52) + '...' : line.text, 156, ly, line.color);
      ly += 10;
    }
    r.rect(154, 142, 314, 20, UI.panelLight);
    r.text(`${npc.name}:`, 158, 146, UI.accent);
    r.text(this.npcLine.length > 50 ? this.npcLine.slice(0, 50) + '...' : this.npcLine, 158, 155, UI.text);

    // --- Floaters ---
    for (const f of this.floats) {
      r.text(f.text, f.x, f.y, f.color, { alpha: Math.min(1, f.t * 2) });
    }

    // --- Hand ---
    const handY = 176;
    st.hand.forEach((id, i) => {
      const card = CARDS[id];
      const x = 8 + i * 117;
      const y = handY + (i === this.sel ? -4 : 0);
      const playable = canPlay(st, i).ok;
      drawPanel(c, x, y, 112, 74);
      if (i === this.sel) r.frame(x, y, 112, 74, UI.accent);
      r.text(card.name, x + 5, y + 5, playable ? UI.text : '#6a5a60');
      if (card.kw) {
        const kc = KEYWORD_COLORS[card.kw];
        r.rect(x + 5, y + 16, r.textWidth(card.kw) + 6, 11, '#08050a');
        r.text(card.kw, x + 8, y + 18, kc);
      } else {
        r.text('PLAIN', x + 8, y + 18, '#7a6a72');
      }
      let statY = y + 31;
      if (card.dmg > 0 || card.special === 'advocate') {
        const dmgTxt = card.special === 'advocate' ? 'DMG: SUSP/4' : `DMG ${card.dmg}`;
        r.text(dmgTxt, x + 5, statY, UI.good);
        statY += 9;
      }
      if (card.susp > 0) {
        r.text(`SUS +${card.susp}`, x + 5, statY, UI.bad);
        statY += 9;
      }
      if (card.soothe) {
        r.text(`CALM -${card.soothe}`, x + 5, statY, UI.blue);
        statY += 9;
      }
      const hint = this.cardHint(card);
      if (hint) r.text(hint.text, x + 5, y + 63, hint.color);
    });

    drawHintBar(c, '[LEFT/RIGHT] CHOOSE LINE   [ENTER] SPEAK   [ESC] WALK AWAY');

    // --- Modals ---
    if (this.confirmExit) {
      r.dim(0.55);
      const mw = 270;
      const mh = 56;
      const mx = (r.w - mw) / 2;
      const my = (r.h - mh) / 2;
      r.rect(mx, my, mw, mh, UI.panel);
      r.frame(mx, my, mw, mh, UI.borderHi);
      r.text('Walk away from the pitch?', mx + 12, my + 10, UI.text);
      r.text("They won't hear you out again today.", mx + 12, my + 22, UI.dim);
      r.text('[ENTER] LEAVE   [ESC] STAY', mx + 12, my + 38, UI.dim);
    }

    if (this.terminal) {
      r.dim(0.6);
      const mw = 320;
      const mh = 92;
      const mx = (r.w - mw) / 2;
      const my = (r.h - mh) / 2 - 10;
      r.rect(mx, my, mw, mh, UI.panel);
      const status = st.status;
      const titles: Record<string, [string, string]> = {
        signed: ['CONTRACT SIGNED', UI.gold],
        fled: ['THEY FLED', UI.bad],
        bored: ['PATIENCE EXHAUSTED', UI.dim],
        walked: ['YOU WALK AWAY', UI.dim],
      };
      const [title, color] = titles[status] ?? ['...', UI.dim];
      r.frame(mx, my, mw, mh, color);
      r.text(title, r.w / 2, my + 10, color, { align: 'center', scale: 2 });
      const sub =
        status === 'signed'
          ? `One soul, ${npc.soulValue} coin(s) of commission.`
          : status === 'fled'
            ? 'Word of a strange salesman will spread.'
            : status === 'walked'
              ? 'No soul. No scene. No second chance today.'
              : 'They drift off mid-sentence.';
      r.text(sub, r.w / 2, my + 34, UI.text, { align: 'center' });
      const line = this.npcLine.length > 56 ? this.npcLine.slice(0, 56) + '...' : this.npcLine;
      r.text(line, r.w / 2, my + 50, UI.dim, { align: 'center' });
      r.text('[ENTER] CONTINUE', r.w / 2, my + 72, UI.gold, { align: 'center' });
    }
  }
}
