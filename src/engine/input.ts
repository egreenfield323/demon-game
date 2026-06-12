/** Action-mapped input. Scenes read actions, never raw keys, so tests can
 * drive the game by calling press()/release() directly. */

export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'vision';

const KEY_TO_ACTION: Record<string, Action> = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
  enter: 'confirm',
  ' ': 'confirm',
  e: 'confirm',
  escape: 'cancel',
  q: 'cancel',
  v: 'vision',
};

export class Input {
  private downs = new Set<Action>();
  private hits = new Set<Action>();
  private releases = new Set<Action>();

  held(a: Action): boolean {
    return this.downs.has(a);
  }

  /** Pressed this frame (edge). */
  hit(a: Action): boolean {
    return this.hits.has(a);
  }

  /** Released this frame (edge). */
  released(a: Action): boolean {
    return this.releases.has(a);
  }

  press(a: Action): void {
    if (!this.downs.has(a)) this.hits.add(a);
    this.downs.add(a);
  }

  release(a: Action): void {
    if (this.downs.has(a)) this.releases.add(a);
    this.downs.delete(a);
  }

  /** Call once per frame after scene update. */
  endFrame(): void {
    this.hits.clear();
    this.releases.clear();
  }

  clearAll(): void {
    this.downs.clear();
    this.hits.clear();
    this.releases.clear();
  }

  bindDom(target: Window): void {
    target.addEventListener('keydown', (e) => {
      const a = KEY_TO_ACTION[e.key.toLowerCase()];
      if (!a) return;
      e.preventDefault();
      if (!e.repeat) this.press(a);
    });
    target.addEventListener('keyup', (e) => {
      const a = KEY_TO_ACTION[e.key.toLowerCase()];
      if (!a) return;
      e.preventDefault();
      this.release(a);
    });
    target.addEventListener('blur', () => this.clearAll());
  }
}
