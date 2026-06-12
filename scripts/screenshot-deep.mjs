// Captures the bargain, commissary, and satan scenes by steering the game
// through the window.__game debug handle.
// Usage: node scripts/screenshot-deep.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const outDir = 'docs/shots';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const shot = (name) => page.screenshot({ path: `${outDir}/${name}.png` });
const press = async (key, wait = 250) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(wait);
};

// Title -> Pit -> begin shift -> Commons.
await press('Enter', 400);
await press('ArrowUp');
await press('Enter', 400);
await press('Enter', 700);

// Teleport beside the first mark.
await page.evaluate(() => {
  const ow = window.__game.ctx.scenes.top;
  const n = ow.npcs[0];
  ow.px = n.x + 12;
  ow.py = n.y;
});
await page.waitForTimeout(300);

// Deep scan them in demon vision.
await press('v', 300);
await page.keyboard.down('e');
await page.waitForTimeout(1100);
await page.keyboard.up('e');
await page.waitForTimeout(400);
await shot('06-deep-scan');
await press('v', 250);

// Open the bargain.
await press('e', 500);
await shot('07-bargain');

// Say something.
await press('Enter', 500);
await shot('08-bargain-played');

// Walk away politely.
await press('Escape', 300);
await press('Enter', 400);
await press('Enter', 500);

// Fast-forward to a successful 20:00.
await page.evaluate(() => {
  const ow = window.__game.ctx.scenes.top;
  ow.run.soulsToday = 1;
  ow.run.timeMin = 1200;
});
await page.waitForTimeout(400);
await shot('09-day-complete');
await press('Enter', 500);
await shot('10-commissary');

// Sleep, ride to gildport, and summon the boss.
await page.evaluate(() => {
  const night = window.__game.ctx.scenes.top;
  night.sel = night.items.length; // SLEEP entry
});
await press('Enter', 500); // -> city map day 2
await press('ArrowDown', 150);
await press('ArrowDown', 150);
await press('Enter', 700); // -> gildport
await shot('11-gildport');
await page.evaluate(() => {
  const ow = window.__game.ctx.scenes.top;
  ow.run.soulsToday = 0;
  ow.run.timeMin = 1200;
});
await page.waitForTimeout(3600);
await shot('12-satan');

await browser.close();
console.log('deep screenshots written to ' + outDir);
