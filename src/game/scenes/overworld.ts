import { Rng } from '../../engine/rng';
import type { GameCtx, GScene } from '../ctx';
import { ARCHETYPES } from '../data/archetypes';
import { DISTRICTS, isWalkable, MAP_H, MAP_W, type DistrictId } from '../data/districts';
import { AURAS, buildCharacter, CHAR_H, HALO, HORNS, PLAYER_PALETTE, PRIEST_PALETTE, SATAN, type CharSprites } from '../data/sprites/chars';
import { buildTileSet, TILE, type TileSet } from '../data/sprites/tiles';
import type { RevealState } from '../sim/bargain';
import { genNpcs } from '../sim/npcgen';
import { aurasVisible, clockRate, endDayOutcome, quotaFor, scanCosts, soulPayout } from '../sim/run';
import { BARGAIN_TIME_COST, DAY_END_MIN, DAY_START_MIN, type NpcDef, type RunState } from '../sim/state';
import { BargainScene } from './bargain';
import { DayEndScene } from './dayend';
import { drawHintBar, drawTopBar, UI } from './hud';

type Dir = 'down' | 'up' | 'left' | 'right';

interface WorldNpc {
  def: NpcDef;
  x: number;
  y: number;
  dir: Dir;
  frame: number;
  animT: number;
  idleT: number;
  tx: number | null;
  ty: number | null;
  /** Bored/walked-away: still around, won't engage again today. */
  done: boolean;
  /** Signed or fled: removed from the street. */
  gone: boolean;
  reveal: RevealState;
  bark: { text: string; t: number } | null;
  barkCooldown: number;
  sprites: CharSprites;
}

const DEEP_SCAN_HOLD = 0.85;
const TALK_RANGE = 26;
/** Fleeing this many marks (or blowing your cover on an angel) summons the
 * Exorcist to hunt you for the rest of the day. */
const HUNT_HEAT = 2;
const HUNTER_SPEED = 48;
const HUNTER_CATCH = 13;

interface Hunter {
  x: number;
  y: number;
  dir: Dir;
  frame: number;
  animT: number;
}

export class OverworldScene implements GScene {
  private run: RunState;
  private districtId: DistrictId;
  private tiles!: TileSet;
  private npcs: WorldNpc[] = [];
  private playerSprites!: CharSprites;
  private px = 0;
  private py = 0;
  private pdir: Dir = 'down';
  private pframe = 0;
  private panimT = 0;
  private vision = false;
  private holdT = 0;
  private holdFired = false;
  private modal: 'sleep' | null = null;
  private toasts: Array<{ text: string; t: number; color: string }> = [];
  private wrng!: Rng;
  private t = 0;
  private hunter: Hunter | null = null;
  private priestSprites!: CharSprites;
  /** Walkable tiles far from spawn, reused to place the hunter. */
  private spawnSpots: Array<[number, number]> = [];

  constructor(run: RunState, districtId: DistrictId) {
    this.run = run;
    this.districtId = districtId;
  }

  private get district() {
    return DISTRICTS[this.districtId];
  }

  enter(_c: GameCtx): void {
    const d = this.district;
    this.tiles = buildTileSet(d.theme);
    this.playerSprites = buildCharacter(PLAYER_PALETTE, 'player');
    this.priestSprites = buildCharacter(PRIEST_PALETTE, 'priest');
    this.wrng = new Rng(`world:${this.run.seed}:${this.run.day}:${d.id}`);
    this.px = d.spawn[0] * TILE + TILE / 2;
    this.py = d.spawn[1] * TILE + TILE - 3;

    // Spawn the day's population on walkable tiles away from the player.
    const defs = genNpcs(this.run, d);
    const candidates: Array<[number, number]> = [];
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        const ch = d.layout[y][x];
        if (!isWalkable(ch) || ch === 'o') continue;
        const dist = Math.abs(x - d.spawn[0]) + Math.abs(y - d.spawn[1]);
        if (dist >= 6) candidates.push([x, y]);
      }
    }
    const spots = this.wrng.shuffle(candidates);
    this.spawnSpots = spots;
    this.npcs = defs.map((def, i) => {
      const [tx, ty] = spots[i % spots.length];
      const arch = ARCHETYPES[def.archetype];
      return {
        def,
        x: tx * TILE + TILE / 2,
        y: ty * TILE + TILE - 3,
        dir: 'down' as Dir,
        frame: 0,
        animT: 0,
        idleT: this.wrng.range(0.3, 2),
        tx: null,
        ty: null,
        done: false,
        gone: false,
        reveal: { traits: [false, false], quirk: false, desire: false, ick: false },
        bark: null,
        barkCooldown: this.wrng.range(2, 10),
        sprites: buildCharacter({ ...arch.palette, s: def.skin }, `${def.archetype}-${def.skin}`),
      };
    });
  }

  // --- helpers ---

  private tileCharAt(px: number, py: number): string {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 'w';
    return this.district.layout[ty][tx];
  }

  private walkableAt(px: number, py: number): boolean {
    return (
      isWalkable(this.tileCharAt(px - 5, py - 1)) &&
      isWalkable(this.tileCharAt(px + 5, py - 1)) &&
      isWalkable(this.tileCharAt(px - 5, py + 2)) &&
      isWalkable(this.tileCharAt(px + 5, py + 2))
    );
  }

  private toast(text: string, color = UI.text): void {
    this.toasts.push({ text, t: 3.2, color });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  private target(): WorldNpc | null {
    let best: WorldNpc | null = null;
    let bestD = TALK_RANGE;
    for (const n of this.npcs) {
      if (n.gone || n.done) continue;
      const d = Math.hypot(n.x - this.px, n.y - this.py);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  private onPortal(): boolean {
    return this.tileCharAt(this.px, this.py) === 'o';
  }

  // --- update ---

  update(c: GameCtx, dt: number): void {
    this.t += dt;

    if (this.modal === 'sleep') {
      if (c.input.hit('confirm')) {
        c.audio.play('door');
        this.endDay(c);
      } else if (c.input.hit('cancel')) {
        c.audio.play('cancel');
        this.modal = null;
      }
      return;
    }

    // Clock.
    this.run.timeMin += clockRate(this.run) * dt;
    if (this.run.timeMin >= DAY_END_MIN) {
      this.endDay(c);
      return;
    }

    const tgt = this.target();

    if (c.input.hit('vision')) {
      this.vision = !this.vision;
      c.audio.play(this.vision ? 'scan' : 'cancel');
      this.holdT = 0;
      this.holdFired = false;
    }

    if (this.vision) {
      // Scan tool: tap = quick, hold = deep.
      if (tgt && c.input.held('confirm')) {
        this.holdT += dt;
        if (this.holdT >= DEEP_SCAN_HOLD && !this.holdFired) {
          this.holdFired = true;
          this.deepScan(c, tgt);
        }
      }
      if (c.input.released('confirm')) {
        if (tgt && !this.holdFired && this.holdT > 0) this.quickScan(c, tgt);
        this.holdT = 0;
        this.holdFired = false;
      }
      if (!tgt) this.holdT = 0;
    } else {
      this.holdT = 0;
      if (c.input.hit('confirm')) {
        if (tgt) this.startBargain(c, tgt);
        else if (this.onPortal()) this.modal = 'sleep';
      }
    }

    // Heat brings the hunter; once loose, it stalks you all day.
    if (!this.hunter && this.run.fledToday >= HUNT_HEAT) this.spawnHunter(c);
    if (this.hunter) this.updateHunter(c, dt);

    this.updatePlayer(c, dt);
    this.updateNpcs(dt);

    this.toasts = this.toasts.filter((t) => (t.t -= dt) > 0);
  }

  private updatePlayer(c: GameCtx, dt: number): void {
    let dx = 0;
    let dy = 0;
    if (c.input.held('left')) dx -= 1;
    if (c.input.held('right')) dx += 1;
    if (c.input.held('up')) dy -= 1;
    if (c.input.held('down')) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const speed = 75;
      const nx = this.px + (dx / len) * speed * dt;
      const ny = this.py + (dy / len) * speed * dt;
      if (this.walkableAt(nx, this.py)) this.px = nx;
      if (this.walkableAt(this.px, ny)) this.py = ny;
      this.pdir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : dx > 0 ? 'right' : this.pdir) : dy < 0 ? 'up' : 'down';
      this.panimT += dt;
      if (this.panimT > 0.16) {
        this.panimT = 0;
        this.pframe = 1 - this.pframe;
      }
    } else {
      this.pframe = 0;
    }
  }

  private updateNpcs(dt: number): void {
    for (const n of this.npcs) {
      if (n.gone) continue;

      if (n.bark) {
        n.bark.t -= dt;
        if (n.bark.t <= 0) n.bark = null;
      }
      n.barkCooldown -= dt;
      if (n.barkCooldown <= 0) {
        n.barkCooldown = this.wrng.range(7, 16);
        if (this.wrng.chance(0.6)) {
          n.bark = { text: this.wrng.pick(ARCHETYPES[n.def.archetype].barks.idle), t: 3 };
        }
      }

      const nearPlayer = Math.hypot(n.x - this.px, n.y - this.py) < TALK_RANGE;
      if (nearPlayer && !n.done) {
        // Face the salesman.
        const ddx = this.px - n.x;
        const ddy = this.py - n.y;
        n.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 'left' : 'right') : ddy < 0 ? 'up' : 'down';
        n.tx = null;
        n.ty = null;
        n.frame = 0;
        continue;
      }

      if (n.tx !== null && n.ty !== null) {
        const ddx = n.tx - n.x;
        const ddy = n.ty - n.y;
        const dist = Math.hypot(ddx, ddy);
        if (dist < 1.5) {
          n.tx = null;
          n.ty = null;
          n.idleT = this.wrng.range(0.8, 3.2);
          n.frame = 0;
        } else {
          const speed = 22;
          n.x += (ddx / dist) * speed * dt;
          n.y += (ddy / dist) * speed * dt;
          n.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 'left' : 'right') : ddy < 0 ? 'up' : 'down';
          n.animT += dt;
          if (n.animT > 0.22) {
            n.animT = 0;
            n.frame = 1 - n.frame;
          }
        }
      } else {
        n.idleT -= dt;
        if (n.idleT <= 0) {
          const dirs: Array<[number, number]> = [
            [TILE, 0],
            [-TILE, 0],
            [0, TILE],
            [0, -TILE],
          ];
          const [ox, oy] = this.wrng.pick(dirs);
          const nx = n.x + ox;
          const ny = n.y + oy;
          if (this.walkableAt(nx, ny) && this.tileCharAt(nx, ny) !== 'o') {
            n.tx = nx;
            n.ty = ny;
          } else {
            n.idleT = this.wrng.range(0.5, 1.5);
          }
        }
      }
    }
  }

  // --- actions ---

  private quickScan(c: GameCtx, n: WorldNpc): void {
    if (n.reveal.traits[0] && n.reveal.traits[1]) {
      this.toast('Surface already read.', UI.dim);
      c.audio.play('denied');
      return;
    }
    if (this.run.fire < 1) {
      this.toast('Not enough Hellfire.', UI.bad);
      c.audio.play('denied');
      return;
    }
    this.run.fire -= 1;
    n.reveal.traits = [true, true];
    c.audio.play('scan');
    this.toast(`${n.def.name}: ${n.def.traits[0]} / ${n.def.traits[1]}`, UI.blue);
  }

  private deepScan(c: GameCtx, n: WorldNpc): void {
    const cost = scanCosts(this.run).deep;
    const nothingLeft = n.reveal.desire && n.reveal.ick && (!n.def.quirk || n.reveal.quirk);
    if (nothingLeft) {
      this.toast('Nothing deeper to see.', UI.dim);
      c.audio.play('denied');
      return;
    }
    if (this.run.fire < cost) {
      this.toast(`Deep scan needs ${cost} Hellfire.`, UI.bad);
      c.audio.play('denied');
      return;
    }
    this.run.fire -= cost;
    n.reveal.traits = [true, true];
    n.reveal.desire = true;
    n.reveal.ick = true;
    n.reveal.quirk = true;
    c.audio.play('scanDeep');
    this.toast(`${n.def.name} WANTS ${n.def.desire}. HATES ${n.def.ick}.`, UI.gold);
    if (n.def.quirk) this.toast(`Complication: ${n.def.quirk}`, UI.accent);
  }

  /** Pitching a disguised angel blows your cover instead of bargaining. */
  private exposeAngel(c: GameCtx, n: WorldNpc): void {
    n.gone = true;
    this.run.fledToday += 3; // instant, heavy heat — the hunter is coming
    c.audio.play('satan');
    this.toast('AN ANGEL! Your cover is blown — they know what you are.', UI.bad);
    this.toast('The whole street turns wary. Something is coming.', UI.bad);
  }

  private spawnHunter(c: GameCtx): void {
    // Place it on a far walkable tile, away from the player.
    let best: [number, number] | null = null;
    let bestD = -1;
    for (const [tx, ty] of this.spawnSpots) {
      const sx = tx * TILE + TILE / 2;
      const sy = ty * TILE + TILE - 3;
      const d = Math.hypot(sx - this.px, sy - this.py);
      if (d > bestD) {
        bestD = d;
        best = [sx, sy];
      }
    }
    const [hx, hy] = best ?? [this.px + 120, this.py];
    this.hunter = { x: hx, y: hy, dir: 'down', frame: 0, animT: 0 };
    c.audio.play('satan');
    this.toast('A PRIEST is hunting you. REACH THE MANHOLE.', UI.bad);
  }

  private updateHunter(c: GameCtx, dt: number): void {
    const h = this.hunter!;
    const ddx = this.px - h.x;
    const ddy = this.py - h.y;
    const dist = Math.hypot(ddx, ddy);
    if (dist < HUNTER_CATCH) {
      this.caught(c);
      return;
    }
    if (dist > 0.1) {
      const nx = h.x + (ddx / dist) * HUNTER_SPEED * dt;
      const ny = h.y + (ddy / dist) * HUNTER_SPEED * dt;
      // Slide along walls so corners don't stop it dead.
      if (this.walkableAt(nx, h.y)) h.x = nx;
      if (this.walkableAt(h.x, ny)) h.y = ny;
      h.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 'left' : 'right') : ddy < 0 ? 'up' : 'down';
      h.animT += dt;
      if (h.animT > 0.2) {
        h.animT = 0;
        h.frame = 1 - h.frame;
      }
    }
  }

  private caught(c: GameCtx): void {
    this.hunter = null;
    c.audio.play('satan');
    // The Boss is summoned regardless of quota — the run is over.
    c.scenes.replace(c, new DayEndScene(this.run, 'satan', true));
  }

  private startBargain(c: GameCtx, n: WorldNpc): void {
    if (n.def.isAngel) {
      this.exposeAngel(c, n);
      return;
    }
    const revealDesire = this.run.longingArmed;
    this.run.longingArmed = false;
    c.audio.play('confirm');
    c.scenes.push(
      c,
      new BargainScene(
        {
          npc: n.def,
          deck: this.run.deck.slice(),
          charms: this.run.charms,
          flatDmgBonus: c.meta.has('forked-tongue') ? 1 : 0,
          patienceBonus: c.meta.has('iron-patience') ? 1 : 0,
          handBonus: c.meta.has('extra-hand') ? 1 : 0,
          dmgMult: c.meta.has('unholy-charisma') ? 1.15 : 1,
          suspMult: c.meta.has('cool-customer') ? 0.85 : 1,
          startSuspicion: this.run.fledToday * 10,
          revealDesire,
          reveal: n.reveal,
          seed: `${this.run.seed}:b:${this.run.day}:${this.districtId}:${n.def.id}`,
        },
        (st) => {
          n.reveal = st.reveal;
          this.run.timeMin += BARGAIN_TIME_COST;
          if (st.status === 'signed') {
            n.gone = true;
            this.run.soulsToday += 1;
            this.run.totalSouls += 1;
            const pay = soulPayout(this.run, n.def) + (c.meta.has('connoisseur') ? 1 : 0);
            this.run.coins += pay;
            c.audio.play('coin');
            this.toast(`SOUL COLLECTED  +$${pay}`, UI.good);
          } else if (st.status === 'fled') {
            n.gone = true;
            this.run.fledToday += 1;
            this.toast('They fled! Word spreads: +10 suspicion today.', UI.bad);
          } else {
            n.done = true;
            this.toast(`${n.def.name} is done with you today.`, UI.dim);
          }
        },
      ),
    );
  }

  private endDay(c: GameCtx): void {
    const outcome = endDayOutcome(this.run, c.meta.state);
    // On a failed quota the Boss's arrival cinematic is the transition; cut to it.
    if (outcome === 'satan') {
      c.scenes.replace(c, new DayEndScene(this.run, outcome));
      return;
    }
    c.transition.go(c, (cc) => cc.scenes.replace(cc, new DayEndScene(this.run, outcome)), {
      kind: 'descend',
      label: 'NIGHTFALL',
      sub: `DAY ${this.run.day}`,
      color: UI.blue,
    });
  }

  // --- draw ---

  draw(c: GameCtx): void {
    const r = c.r;
    const camX = Math.max(0, Math.min(MAP_W * TILE - r.w, this.px - r.w / 2));
    const camY = Math.max(0, Math.min(MAP_H * TILE - r.h, this.py - r.h / 2 - 6));

    r.clear('#0a0608');
    const d = this.district;
    const tx0 = Math.floor(camX / TILE);
    const ty0 = Math.floor(camY / TILE);
    const tx1 = Math.min(MAP_W - 1, Math.ceil((camX + r.w) / TILE));
    const ty1 = Math.min(MAP_H - 1, Math.ceil((camY + r.h) / TILE));
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = d.layout[ty][tx];
        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;
        const entry = this.tiles.tiles[ch];
        if (!entry) {
          r.sprite(this.tiles.ground, sx, sy);
        } else if (entry.overlay) {
          r.sprite(this.tiles.ground, sx, sy);
          if (ch === 'o') {
            const pulse = 0.7 + Math.sin(this.t * 4) * 0.3;
            r.sprite(entry.spr, sx, sy, { alpha: pulse });
          } else {
            r.sprite(entry.spr, sx, sy);
          }
        } else {
          r.sprite(entry.spr, sx, sy);
        }
      }
    }

    const tgt = this.target();

    // Auras render under bodies, only in vision.
    if (this.vision && aurasVisible(this.run)) {
      for (const n of this.npcs) {
        if (n.gone) continue;
        const aura = AURAS[Math.max(1, Math.min(3, n.def.soulValue))];
        r.sprite(aura, n.x - 12 - camX, n.y - 3 - camY, { alpha: 0.35 + Math.sin(this.t * 3 + n.def.id) * 0.08 });
      }
    }

    // Y-sorted bodies.
    const bodies: Array<{ y: number; fn: () => void }> = [];
    for (const n of this.npcs) {
      if (n.gone) continue;
      bodies.push({
        y: n.y,
        fn: () => {
          const spr = n.dir === 'up' ? n.sprites.up[n.frame] : n.dir === 'down' ? n.sprites.down[n.frame] : n.sprites.side[n.frame];
          r.sprite(spr, n.x - 8 - camX, n.y - CHAR_H + 1 - camY, {
            flipX: n.dir === 'right',
            alpha: n.done ? 0.65 : 1,
          });
        },
      });
    }
    bodies.push({
      y: this.py,
      fn: () => {
        const spr =
          this.pdir === 'up'
            ? this.playerSprites.up[this.pframe]
            : this.pdir === 'down'
              ? this.playerSprites.down[this.pframe]
              : this.playerSprites.side[this.pframe];
        r.sprite(spr, this.px - 8 - camX, this.py - CHAR_H + 1 - camY, { flipX: this.pdir === 'right' });
      },
    });
    if (this.hunter) {
      const h = this.hunter;
      bodies.push({
        y: h.y,
        fn: () => {
          const spr = h.dir === 'up' ? this.priestSprites.up[h.frame] : h.dir === 'down' ? this.priestSprites.down[h.frame] : this.priestSprites.side[h.frame];
          r.sprite(spr, h.x - 8 - camX, h.y - CHAR_H + 1 - camY, { flipX: h.dir === 'right' });
          r.sprite(HALO, h.x - 5 - camX, h.y - CHAR_H - 4 - camY);
        },
      });
    }
    bodies.sort((a, b) => a.y - b.y);
    for (const b of bodies) b.fn();

    // Demon vision tint + intel labels.
    if (this.vision) {
      r.dim(0.38, '#46101c');
      r.sprite(HORNS, this.px - 8 - camX, this.py - CHAR_H - 2 - camY);
      for (const n of this.npcs) {
        if (n.gone) continue;
        const lx = n.x - camX;
        let ly = n.y - CHAR_H - 8 - camY;
        if (n.def.isAngel) {
          // No soul to read — just a warning and the halo.
          r.sprite(HALO, n.x - 5 - camX, n.y - CHAR_H - 4 - camY);
          const warn = [
            { text: 'ANGEL', color: '#fff0c0' },
            { text: 'DO NOT ENGAGE', color: UI.bad },
          ];
          ly -= (warn.length - 1) * 9;
          for (const line of warn) {
            const w = r.textWidth(line.text);
            r.rect(lx - w / 2 - 2, ly - 1, w + 4, 9, '#08050a', 0.8);
            r.text(line.text, lx, ly, line.color, { align: 'center' });
            ly += 9;
          }
          continue;
        }
        const lines: Array<{ text: string; color: string }> = [];
        if (n.reveal.traits[0] || n.reveal.traits[1]) {
          lines.push({ text: `${n.def.traits[0]}/${n.def.traits[1]}`, color: UI.blue });
        } else {
          lines.push({ text: '? ?', color: '#b88a9a' });
        }
        if (n.reveal.desire) lines.push({ text: `WANTS ${n.def.desire}`, color: UI.gold });
        if (n.reveal.ick) lines.push({ text: `HATES ${n.def.ick}`, color: UI.bad });
        if (n.reveal.quirk && n.def.quirk) lines.push({ text: n.def.quirk, color: UI.accent });
        ly -= (lines.length - 1) * 9;
        for (const line of lines) {
          const w = r.textWidth(line.text);
          r.rect(lx - w / 2 - 2, ly - 1, w + 4, 9, '#08050a', 0.75);
          r.text(line.text, lx, ly, line.color, { align: 'center' });
          ly += 9;
        }
      }
    }

    // Name tag + talk affordance for the current target.
    if (tgt) {
      const lx = tgt.x - camX;
      const ly = tgt.y + 5 - camY;
      const label = `${tgt.def.name} - ${ARCHETYPES[tgt.def.archetype].label}`;
      const w = r.textWidth(label);
      r.rect(lx - w / 2 - 2, ly - 1, w + 4, 9, '#08050a', 0.8);
      r.text(label, lx, ly, UI.text, { align: 'center' });
    }

    // Ambient barks.
    for (const n of this.npcs) {
      if (n.gone || !n.bark) continue;
      const alpha = Math.min(1, n.bark.t);
      const w = r.textWidth(n.bark.text);
      const lx = n.x - camX;
      const ly = n.y - CHAR_H - 18 - camY;
      r.rect(lx - w / 2 - 2, ly - 1, w + 4, 9, '#08050a', 0.7 * alpha);
      r.text(n.bark.text, lx, ly, '#cfc4b8', { align: 'center', alpha });
    }

    // Deep-scan hold meter.
    if (this.holdT > 0 && tgt) {
      const frac = Math.min(1, this.holdT / DEEP_SCAN_HOLD);
      r.rect(this.px - 11 - camX, this.py - CHAR_H - 7 - camY, 22, 4, '#0c080c');
      r.rect(this.px - 10 - camX, this.py - CHAR_H - 6 - camY, Math.round(20 * frac), 2, UI.fire);
    }

    // --- Creepy grade: cold near-black wash, a heavy vignette, the odd
    // guttering flicker. Center stays legible; the edges close in. ---
    r.dim(0.17, '#06030e');
    const bands = 22;
    for (let i = 0; i < bands; i++) {
      const a = 0.5 * Math.pow(1 - i / bands, 1.6);
      r.rect(0, i, r.w, 1, '#000000', a);
      r.rect(0, r.h - 1 - i, r.w, 1, '#000000', a);
      r.rect(i, 0, 1, r.h, '#000000', a);
      r.rect(r.w - 1 - i, 0, 1, r.h, '#000000', a);
    }
    const flick = Math.sin(this.t * 6.3) + Math.sin(this.t * 11.7) + Math.sin(this.t * 2.1);
    if (flick > 2.6) r.dim(0.12, '#000000');

    // Looming dread: the Boss leans down over the street as the clock runs out
    // with quota unmet. Faint and high so it haunts without blocking play.
    const dayLen = DAY_END_MIN - DAY_START_MIN;
    const dayFrac = Math.max(0, Math.min(1, (this.run.timeMin - DAY_START_MIN) / dayLen));
    const unmet = this.run.soulsToday < quotaFor(this.run);
    const dread = Math.max(0, Math.min(1, unmet ? dayFrac : dayFrac * 0.25));
    if (dread > 0.05) {
      const bob = Math.sin(this.t * 1.1) * 4;
      const drop = -156 + dread * 64 + bob; // descends as the deadline nears
      r.sprite(SATAN, r.w / 2 - 96, drop, { scale: 8, alpha: 0.1 + dread * 0.4 });
      const pulse = 0.04 + dread * (0.1 + Math.sin(this.t * 4) * 0.03);
      r.dim(Math.max(0, pulse), '#3a0610');
    }

    // The hunt: a blood-red pulse that swells as the priest closes in.
    if (this.hunter) {
      const hd = Math.hypot(this.hunter.x - this.px, this.hunter.y - this.py);
      const near = Math.max(0, 1 - hd / 200);
      if (near > 0) r.dim(near * 0.32 * (0.7 + Math.sin(this.t * 10) * 0.3), '#4a0610');
    }

    drawTopBar(c, this.run);

    if (this.hunter && Math.floor(this.t * 2) % 2 === 0) {
      r.text('A PRIEST HUNTS YOU - REACH THE MANHOLE', r.w / 2, 17, UI.bad, { align: 'center' });
    }

    let hint: string;
    if (this.modal === 'sleep') hint = '[ENTER] SLEEP   [ESC] KEEP HUNTING';
    else if (this.vision && tgt) {
      const costs = scanCosts(this.run);
      hint = `[E] QUICK SCAN (${costs.quick}{)   [HOLD E] DEEP SCAN (${costs.deep}{)   [V] VISION OFF`;
    } else if (this.vision) hint = '[V] VISION OFF   GET CLOSE TO A MARK TO SCAN';
    else if (tgt) hint = `[E] PITCH ${tgt.def.name.toUpperCase()}   [V] DEMON VISION`;
    else if (this.onPortal()) hint = '[E] DESCEND (END THE DAY)';
    else hint = '[V] DEMON VISION   [E] TALK   THE MANHOLE ENDS THE DAY';
    drawHintBar(c, hint);

    // Toasts.
    let toastY = r.h - 26;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      const alpha = Math.min(1, t.t / 0.5);
      const w = r.textWidth(t.text);
      r.rect(r.w - w - 14, toastY - 2, w + 8, 11, '#08050a', 0.8 * alpha);
      r.text(t.text, r.w - 10, toastY, t.color, { align: 'right', alpha });
      toastY -= 13;
    }

    if (this.modal === 'sleep') {
      r.dim(0.55);
      const mw = 250;
      const mh = 64;
      const mx = (r.w - mw) / 2;
      const my = (r.h - mh) / 2;
      r.rect(mx, my, mw, mh, UI.panel);
      r.frame(mx, my, mw, mh, UI.borderHi);
      r.text('Crawl back below and end the day?', mx + 12, my + 12, UI.text);
      const met = this.run.soulsToday >= quotaFor(this.run);
      const warn = met ? 'Quota met. The Boss will tolerate you.' : 'QUOTA UNMET. He will come for you.';
      r.text(warn, mx + 12, my + 28, met ? UI.good : UI.bad);
      r.text('[ENTER] SLEEP   [ESC] BACK', mx + 12, my + 46, UI.dim);
    }
  }
}
