import type { GameCtx, GScene } from '../ctx';
import { ARCHETYPES } from '../data/archetypes';
import { CARDS, type CardDef } from '../data/cards';
import { KEYWORD_COLORS, KEYWORD_REACTIONS } from '../data/keywords';
import { TRAITS } from '../data/traits';
import { CARD_ART, CARD_BACK, KEYWORD_ICONS, UTIL_ICONS } from '../data/sprites/cards';
import { buildCharacter } from '../data/sprites/chars';
import {
  canPlay,
  HAND_SIZE,
  playCard,
  startBargain,
  SUSPICION_MAX,
  walkAway,
  type BargainOpts,
  type BargainState,
  type HitBucket,
  type Mood,
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

// --- Battle-intro timeline (seconds) ---
const DEAL_START = 0.8;
const DEAL_STEP = 0.16;
const DEAL_TWEEN = 0.24;
const INTRO_END = DEAL_START + HAND_SIZE * DEAL_STEP + DEAL_TWEEN + 0.3;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/** Small corner pip — the card's "suit" index. */
function cardPip(card: CardDef) {
  if (card.kw) return KEYWORD_ICONS[card.kw];
  if (card.special === 'probe' || card.special === 'coldRead') return UTIL_ICONS.eye;
  if (card.special === 'finePrint') return UTIL_ICONS.contract;
  if (card.special === 'honeyed') return UTIL_ICONS.drop;
  if (card.special === 'advocate') return UTIL_ICONS.advocate;
  if (card.soothe) return UTIL_ICONS.calm;
  return UTIL_ICONS.speech;
}

/** The big central illustration. */
function cardArt(card: CardDef) {
  if (card.kw) return CARD_ART[card.kw];
  if (card.special === 'probe' || card.special === 'coldRead') return CARD_ART.eye;
  if (card.special === 'finePrint') return CARD_ART.scroll;
  if (card.special === 'honeyed') return CARD_ART.drop;
  if (card.special === 'advocate') return CARD_ART.mouth;
  if (card.soothe) return CARD_ART.calm;
  return CARD_ART.mouth;
}

// Portrait card geometry.
const CARD_W = 74;
const CARD_H = 86;
const HAND_Y = 170;
const HAND_X0 = 80;
const HAND_STEP = 82;
const DECK_X = 432;
const DECK_Y = 196;
const SCENE_BG = '#0e0812';

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
  /** Pokemon-style entrance before play begins. */
  private phase: 'intro' | 'play' = 'intro';
  private introT = 0;
  private dealt = 0;
  /** A little punch when the mark's expression flips. */
  private moodPop = 0;

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

  private dealProgress(i: number): number {
    return clamp01((this.introT - (DEAL_START + i * DEAL_STEP)) / DEAL_TWEEN);
  }

  private dealtCount(): number {
    let n = 0;
    for (let i = 0; i < this.st.hand.length; i++) if (this.dealProgress(i) >= 1) n++;
    return n;
  }

  private processPlay(c: GameCtx, idx: number): void {
    const prevMood = this.st.mood;
    const playedCard = CARDS[this.st.hand[idx]];
    const events = playCard(this.st, idx);
    const arch = ARCHETYPES[this.st.npc.archetype];
    let hit: HitBucket | undefined;
    for (const ev of events) {
      switch (ev.kind) {
        case 'say':
          this.pushLog(`YOU: ${ev.text}`, UI.text);
          break;
        case 'dmg': {
          hit = ev.hit;
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
        case 'rapport': {
          const amt = ev.amount ?? 0;
          if (amt > 0) {
            c.audio.play('blip');
            this.floats.push({ text: `COMBO x${amt}`, color: amt >= 3 ? UI.gold : UI.accent, x: 300, y: 46, t: 1.1 });
          } else {
            this.floats.push({ text: 'RHYTHM LOST', color: UI.dim, x: 300, y: 46, t: 1 });
          }
          break;
        }
        case 'patience':
          this.floats.push({ text: `+${ev.amount} PATIENCE`, color: UI.good, x: 210, y: 54, t: 1 });
          break;
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

    if (this.st.mood !== prevMood) this.moodPop = 0.3;

    const status = this.st.status;
    if (status === 'active') {
      // If the line struck a hunger, the mark lets something slip about it;
      // otherwise they react in-mood. Both pools are randomized per play.
      if (playedCard.kw && hit && hit !== 'ick') {
        this.npcLine = this.st.rng.pick(KEYWORD_REACTIONS[playedCard.kw]);
      } else {
        const pool =
          this.st.mood === 'receptive'
            ? arch.barks.receptive
            : this.st.mood === 'wary'
              ? arch.barks.wary
              : this.st.mood === 'offended'
                ? arch.barks.offended
                : arch.barks.neutral;
        this.npcLine = this.bark(pool);
      }
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
    this.moodPop = Math.max(0, this.moodPop - dt);
    this.floats = this.floats.filter((f) => {
      f.t -= dt;
      f.y -= dt * 14;
      return f.t > 0;
    });

    if (this.phase === 'intro') {
      this.introT += dt;
      const landed = this.dealtCount();
      if (landed > this.dealt) {
        c.audio.play('blip');
        this.dealt = landed;
      }
      if (this.introT > 0.2 && (c.input.hit('confirm') || c.input.hit('cancel'))) {
        this.introT = INTRO_END;
      }
      if (this.introT >= INTRO_END) this.phase = 'play';
      return;
    }

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

  /** Eyes / brows / mouth painted over the mark's head, by mood. */
  private drawExpression(c: GameCtx, mood: Mood, ox: number, oy: number, s: number): void {
    const r = c.r;
    const lx = ox + 6 * s; // left eye col
    const rx = ox + 9 * s; // right eye col
    const ey = oy + 5 * s; // eye row
    const browY = oy + 3 * s + 2;
    const mx = ox + 6 * s;
    const my = oy + 8 * s;
    const mw = 3 * s;
    const ink = '#120a0f';
    if (mood === 'receptive') {
      r.rect(lx - 1, browY - 3, s + 1, 2, ink);
      r.rect(rx - 1, browY - 3, s + 1, 2, ink);
      r.rect(mx, my + 2, mw, 2, ink); // smile floor
      r.rect(mx - 2, my, 2, 2, ink);
      r.rect(mx + mw, my, 2, 2, ink);
    } else if (mood === 'wary') {
      r.rect(lx - 2, ey - 1, s + 3, 3, ink); // heavy lids
      r.rect(rx - 2, ey - 1, s + 3, 3, ink);
      r.rect(mx, my + 1, mw, 2, ink); // flat line
    } else if (mood === 'offended') {
      r.rect(ox + 3 * s, oy + 2 * s, 9 * s, 6 * s, '#7a1420', 0.2); // flushed
      r.rect(lx - 2, browY, s + 1, 2, ink); // angled brows
      r.rect(lx, browY + 2, s, 2, ink);
      r.rect(rx + s - 1, browY, s + 1, 2, ink);
      r.rect(rx, browY + 2, s, 2, ink);
      r.rect(mx, my, mw, 2, ink); // frown
      r.rect(mx - 2, my + 2, 2, 2, ink);
      r.rect(mx + mw, my + 2, 2, 2, ink);
    } else {
      r.rect(mx, my + 1, mw, 2, ink); // neutral
    }
  }

  private drawMark(c: GameCtx, dx: number, mood: Mood): void {
    const r = c.r;
    const st = this.st;
    const npc = st.npc;
    const arch = ARCHETYPES[npc.archetype];
    drawPanel(c, 8 + dx, 10, 132, 158);
    const sprites = buildCharacter({ ...arch.palette, s: npc.skin }, `${npc.archetype}-${npc.skin}`);
    const pop = this.moodPop > 0 ? Math.round(Math.sin(this.t * 50) * 2) : 0;
    const sx = 42 + dx;
    const sy = 18 + pop;
    r.sprite(sprites.down[0], sx, sy, { scale: 4 });
    this.drawExpression(c, mood, sx, sy, 4);
    const cx = 74 + dx;
    r.text(npc.name, cx, 102, UI.text, { align: 'center' });
    r.text(arch.label, cx, 112, UI.dim, { align: 'center' });

    let infoY = 124;
    if (st.reveal.traits[0] || st.reveal.traits[1]) {
      r.text(`${npc.traits[0]} / ${npc.traits[1]}`, cx, infoY, UI.blue, { align: 'center' });
    } else {
      r.text('TRAITS: ? ?', cx, infoY, '#7a6a72', { align: 'center' });
    }
    infoY += 10;
    if (st.reveal.desire) {
      r.text(`WANTS ${npc.desire}`, cx, infoY, UI.gold, { align: 'center' });
      infoY += 10;
    }
    if (st.reveal.ick) {
      r.text(`HATES ${npc.ick}`, cx, infoY, UI.bad, { align: 'center' });
      infoY += 10;
    }
    if (st.reveal.quirk && npc.quirk) {
      r.text(npc.quirk, cx, infoY, UI.accent, { align: 'center' });
    }
  }

  private drawBars(c: GameCtx): void {
    const r = c.r;
    const st = this.st;
    const npc = st.npc;
    const wob = this.shakeW > 0 ? Math.round(Math.sin(this.t * 60) * 2) : 0;
    const sob = this.shakeS > 0 ? Math.round(Math.sin(this.t * 60) * 2) : 0;
    r.text('WILLPOWER', 150, 14, UI.text);
    const wpFrac = st.willpower / npc.maxWillpower;
    r.rect(150 + wob, 24, 250, 10, '#0c080c');
    r.rect(151 + wob, 25, Math.round(248 * Math.max(0, wpFrac)), 8, wpFrac > 0.5 ? '#5aa84a' : wpFrac > 0.25 ? '#c8a83a' : '#c84a3a');
    r.frame(150 + wob, 24, 250, 10, UI.border);
    r.text(`${st.willpower}/${npc.maxWillpower}`, 406, 25, UI.text);

    r.text('SUSPICION', 150, 38, UI.text);
    const susFrac = Math.min(1, st.suspicion / SUSPICION_MAX);
    r.rect(150 + sob, 48, 250, 10, '#0c080c');
    r.rect(151 + sob, 49, Math.round(248 * susFrac), 8, st.suspicion < SUSPICION_MAX * 0.5 ? '#c8a83a' : '#d8503a');
    r.frame(150 + sob, 48, 250, 10, UI.border);
    r.text(`${st.suspicion}/${SUSPICION_MAX}`, 406, 49, st.suspicion >= SUSPICION_MAX * 0.7 ? UI.bad : UI.text);

    r.text('PATIENCE', 150, 62, UI.text);
    const pips = '*'.repeat(Math.max(0, st.patience)) + '-'.repeat(Math.max(0, st.maxPatience - st.patience));
    r.text(pips, 210, 62, UI.gold);
    r.text(`MOOD: ${st.mood.toUpperCase()}`, 300, 62, MOOD_COLOR[st.mood]);
    if (st.rapport > 0) {
      r.text(`COMBO x${st.rapport}`, 470, 62, st.rapport >= 3 ? UI.gold : UI.accent, { align: 'right' });
    }
  }

  private drawLog(c: GameCtx): void {
    const r = c.r;
    const npc = this.st.npc;
    drawPanel(c, 150, 74, 322, 94);
    let ly = 80;
    for (const line of this.log) {
      r.text(line.text.length > 52 ? line.text.slice(0, 52) + '...' : line.text, 156, ly, line.color);
      ly += 10;
    }
    r.rect(154, 142, 314, 20, UI.panelLight);
    r.text(`${npc.name}:`, 158, 146, UI.accent);
    r.text(this.npcLine.length > 50 ? this.npcLine.slice(0, 50) + '...' : this.npcLine, 158, 155, UI.text);
  }

  /** Carve the four corners to the scene background so the card reads round. */
  private roundCorners(c: GameCtx, x: number, y: number, w: number, h: number): void {
    const r = c.r;
    for (const [cx, cy] of [
      [x, y],
      [x + w - 2, y],
      [x, y + h - 2],
      [x + w - 2, y + h - 2],
    ]) {
      r.rect(cx, cy, 2, 2, SCENE_BG);
    }
  }

  /** Greedy word-wrap to at most two lines that fit maxW; the second line is
   * ellipsized if the name is too long to fit. */
  private wrap2(c: GameCtx, text: string, maxW: number): [string, string] {
    const r = c.r;
    const words = text.split(' ');
    let l0 = '';
    let i = 0;
    for (; i < words.length; i++) {
      const probe = l0 ? `${l0} ${words[i]}` : words[i];
      if (l0 && r.textWidth(probe) > maxW) break;
      l0 = probe;
    }
    let l1 = words.slice(i).join(' ');
    while (l1 && r.textWidth(l1) > maxW) l1 = l1.slice(0, -1);
    if (i < words.length && words.slice(i).join(' ') !== l1 && l1) l1 = l1.slice(0, -1) + '.';
    return [l0, l1];
  }

  /** A dialogue line rendered as an actual playing card. The banner names the
   * hunger (WEALTH / ESCAPE / PLAIN...); the wrapped caption is what you say. */
  private drawCard(c: GameCtx, card: CardDef, x: number, y: number, selected: boolean, playable: boolean, hint: LogLine | null): void {
    const r = c.r;
    const W = CARD_W;
    const H = CARD_H;
    if (selected) r.rect(x - 3, y - 3, W + 6, H + 6, UI.accent, 0.25);
    r.rect(x + 2, y + 4, W, H, UI.shadow, 0.5);
    r.rect(x, y, W, H, '#1d1622');
    this.roundCorners(c, x, y, W, H);
    r.frame(x, y, W, H, selected ? UI.accent : '#7a6a52');
    r.frame(x + 2, y + 2, W - 4, H - 4, '#352a36');

    // Banner = the hunger this line appeals to.
    const banner = card.kw ? KEYWORD_COLORS[card.kw] : '#5a4a58';
    r.rect(x + 3, y + 3, W - 6, 11, banner);
    r.text(card.kw ?? 'PLAIN', x + W / 2, y + 4, card.kw ? '#150d12' : UI.text, { align: 'center' });

    // Illustration.
    const ax = x + 5;
    const ay = y + 16;
    const aw = W - 10;
    const ah = 34;
    r.rect(ax, ay, aw, ah, '#0b070d');
    r.frame(ax, ay, aw, ah, '#2a1f2c');
    r.sprite(cardArt(card), ax + (aw - 32) / 2, ay + (ah - 32) / 2, { scale: 2 });
    r.sprite(cardPip(card), ax + 1, ay + 1); // corner index
    if (hint) {
      r.rect(ax, ay, aw, 9, '#08050a', 0.86);
      r.text(hint.text, ax + aw / 2, ay + 1, hint.color, { align: 'center' });
    }

    // What you actually say.
    const [l0, l1] = this.wrap2(c, card.name, W - 6);
    r.text(l0, x + W / 2, y + 52, UI.text, { align: 'center' });
    if (l1) r.text(l1, x + W / 2, y + 60, UI.text, { align: 'center' });

    // Stat chips.
    let cxp = x + 5;
    const cy = y + 73;
    const chip = (txt: string, bg: string, fg: string): void => {
      const w = r.textWidth(txt);
      r.rect(cxp - 1, cy - 1, w + 3, 9, bg);
      r.text(txt, cxp, cy, fg);
      cxp += w + 5;
    };
    if (card.dmg > 0 || card.special === 'advocate') chip(card.special === 'advocate' ? 'S/4' : `${card.dmg}`, '#1a3a14', UI.good);
    if (card.susp > 0) chip(`+${card.susp}`, '#3a1410', UI.bad);
    if (card.soothe) chip(`-${card.soothe}`, '#103040', UI.blue);

    if (!playable) {
      r.rect(x, y, W, H, '#08050a', 0.55);
      r.text('NOT YET', x + W / 2, y + H / 2 - 4, UI.dim, { align: 'center' });
    }
  }

  /** Face-down card, shown mid-deal before it flips up. */
  private drawCardBack(c: GameCtx, x: number, y: number): void {
    const r = c.r;
    const W = CARD_W;
    const H = CARD_H;
    r.rect(x + 2, y + 4, W, H, UI.shadow, 0.5);
    r.rect(x, y, W, H, '#1d1622');
    this.roundCorners(c, x, y, W, H);
    r.frame(x, y, W, H, '#7a6a52');
    const s = 4;
    r.sprite(CARD_BACK, x + (W - 16 * s) / 2, y + (H - 16 * s) / 2, { scale: s });
  }

  private drawHand(c: GameCtx): void {
    const r = c.r;
    const st = this.st;
    const introing = this.phase === 'intro';

    if (introing) {
      // The draw pile cards are dealt from.
      for (let k = 2; k >= 0; k--) {
        const ox = DECK_X - k * 2;
        const oy = DECK_Y - k * 2;
        r.rect(ox, oy, 40, 52, '#1d1622');
        r.frame(ox, oy, 40, 52, '#7a6a52');
        r.sprite(CARD_BACK, ox + 4, oy + 10, { scale: 2 });
      }
    }

    st.hand.forEach((id, i) => {
      const card = CARDS[id];
      const slotX = HAND_X0 + i * HAND_STEP;
      if (introing) {
        const p = this.dealProgress(i);
        if (p <= 0) return;
        const e = easeOut(p);
        const cx = lerp(DECK_X, slotX, e);
        const cy = lerp(DECK_Y, HAND_Y, e);
        if (p < 0.82) this.drawCardBack(c, cx, cy);
        else this.drawCard(c, card, cx, cy, false, true, null);
        if (p > 0.76 && p < 0.88) r.rect(cx + CARD_W / 2 - 1, cy, 2, CARD_H, '#fff4e0', 0.6);
      } else {
        const selected = i === this.sel;
        this.drawCard(c, card, slotX, HAND_Y + (selected ? -5 : 0), selected, canPlay(st, i).ok, this.cardHint(card));
      }
    });
  }

  draw(c: GameCtx): void {
    const r = c.r;
    const introing = this.phase === 'intro';
    r.clear('#0e0812');
    r.rect(0, 0, r.w, 4, '#2a0c14');
    r.rect(0, r.h - 4, r.w, 4, '#2a0c14');

    const slide = introing ? (1 - clamp01(this.introT / 0.45)) * 170 : 0;
    const mood: Mood = introing ? 'wary' : this.st.mood;
    this.drawMark(c, slide, mood);
    this.drawBars(c);
    this.drawLog(c);

    for (const f of this.floats) {
      r.text(f.text, f.x, f.y, f.color, { alpha: Math.min(1, f.t * 2) });
    }

    this.drawHand(c);

    if (introing) {
      // The "VS" beat.
      if (this.introT > 0.4 && this.introT < DEAL_START + 0.2) {
        r.rect(0, 86, r.w, 24, '#08050a', 0.82);
        const flash = Math.floor(this.t * 8) % 2 === 0;
        r.text('A SOUL IS AT STAKE', r.w / 2, 90, flash ? UI.gold : UI.accent, { align: 'center', scale: 2 });
      }
      drawHintBar(c, 'THE BARGAIN BEGINS...   [ENTER] SKIP');
      return;
    }

    drawHintBar(c, '[LEFT/RIGHT] CHOOSE LINE   [ENTER] SPEAK   [ESC] WALK AWAY');

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
      const status = this.st.status;
      const titles: Record<string, [string, string]> = {
        signed: ['CONTRACT SIGNED', UI.gold],
        fled: ['THEY FLED', UI.bad],
        bored: ['PATIENCE EXHAUSTED', UI.dim],
        walked: ['YOU WALK AWAY', UI.dim],
      };
      const [title, color] = titles[status] ?? ['...', UI.dim];
      r.frame(mx, my, mw, mh, color);
      r.text(title, r.w / 2, my + 10, color, { align: 'center', scale: 2 });
      const npc = this.st.npc;
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
