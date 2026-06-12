// Drives the dev build in headless Edge and captures verification shots.
// Usage: node scripts/screenshot.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const outDir = 'docs/shots';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const shot = (name) => page.screenshot({ path: `${outDir}/${name}.png` });

await shot('01-title');

await page.keyboard.press('Enter'); // -> orientation pit
await page.waitForTimeout(500);
await shot('02-pit');

await page.keyboard.press('ArrowUp'); // wrap to BEGIN SHIFT
await page.keyboard.press('Enter'); // -> city map
await page.waitForTimeout(500);
await shot('03-citymap');

await page.keyboard.press('Enter'); // -> murkwell commons
await page.waitForTimeout(700);
await shot('04-overworld');

// Wander toward the middle of the park.
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1700);
await page.keyboard.up('ArrowRight');
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(400);
await page.keyboard.up('ArrowUp');

await page.keyboard.press('v'); // demon vision
await page.waitForTimeout(400);
await shot('05-demon-vision');
await page.keyboard.press('v');

// Hunt for a bargain: walk a grid pattern, mashing E near anyone.
const dirs = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
let inBargain = false;
for (let i = 0; i < 24 && !inBargain; i++) {
  const dir = dirs[i % 4];
  await page.keyboard.down(dir);
  await page.waitForTimeout(420);
  await page.keyboard.up(dir);
  await page.keyboard.press('e');
  await page.waitForTimeout(250);
  // The bargain scene swaps the hint bar; detect via canvas-independent trick:
  // probe the page for the game's scene stack? Not exposed. Just screenshot blind
  // on a few attempts and keep the last one that differs.
  if (i === 11 || i === 23) await shot(`06-street-${i}`);
}
await shot('07-final');

await browser.close();
console.log('screenshots written to ' + outDir);
