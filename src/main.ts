import { WebAudio } from './engine/audio';
import { CanvasRenderer } from './engine/canvasRenderer';
import { Input } from './engine/input';
import { createGame } from './game/createGame';

const canvas = document.getElementById('game') as HTMLCanvasElement;

// Integer upscale of the 480x270 buffer, letterboxed by the page background.
function fitCanvas(): void {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height)));
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const audio = new WebAudio();
window.addEventListener('keydown', () => audio.unlock(), { once: false });

const input = new Input();
input.bindDom(window);

const game = createGame({
  renderer: new CanvasRenderer(canvas),
  audio,
  storage: window.localStorage,
  input,
});
game.start();

// Dev/debug handle (used by scripts/screenshot scripts and the console).
(window as unknown as { __game: typeof game }).__game = game;

// Fixed-timestep update, render once per animation frame.
const STEP = 1 / 60;
let last = performance.now();
let acc = 0;

function frame(now: number): void {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    game.update(STEP);
    acc -= STEP;
  }
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
