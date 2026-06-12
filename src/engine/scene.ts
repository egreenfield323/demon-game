/** Scene stack, generic over the game's context type. Only the top scene
 * updates; draw walks up from the lowest non-opaque scene so overlays can
 * show the world beneath them. */

export interface Scene<C> {
  /** Defaults to true; set false for overlay scenes. */
  opaque?: boolean;
  enter?(c: C): void;
  update(c: C, dt: number): void;
  draw(c: C): void;
}

export class SceneStack<C> {
  private stack: Scene<C>[] = [];

  get top(): Scene<C> | undefined {
    return this.stack[this.stack.length - 1];
  }

  get depth(): number {
    return this.stack.length;
  }

  push(c: C, s: Scene<C>): void {
    this.stack.push(s);
    s.enter?.(c);
  }

  pop(): void {
    this.stack.pop();
  }

  replace(c: C, s: Scene<C>): void {
    this.stack.pop();
    this.push(c, s);
  }

  reset(c: C, s: Scene<C>): void {
    this.stack.length = 0;
    this.push(c, s);
  }

  update(c: C, dt: number): void {
    this.top?.update(c, dt);
  }

  draw(c: C): void {
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].opaque === false) start--;
    for (let i = start; i < this.stack.length; i++) this.stack[i].draw(c);
  }
}
