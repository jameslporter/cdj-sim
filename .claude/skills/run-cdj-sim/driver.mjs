// REPL driver for the cdj-sim Expo web app. Reads newline-delimited
// commands from stdin, drives a headless Chromium page via Playwright.
//
// Commands:
//   viewport <width> <height>                  (resize before nav — must be the first command)
//   nav <url>
//   wait-for text=<text>[|nth=N]
//   wait <ms>
//   click text=<text>[|nth=N]
//   click sel=<css selector>
//   press-hold text=<text>[|nth=N] <ms>       (pointerdown, wait, pointerup — e.g. jog wheel brake)
//   down sel=<css selector>                    (pointerdown only, stays held — screenshot mid-hold, then `up`)
//   up                                         (releases whatever `down` pressed)
//   drag sel=<css selector> dx=<px> dy=<px>   (drag from element center — e.g. tempo fader)
//   fill sel=<css selector> <value>
//   screenshot [name]                          -> screenshots/<name|seq>.png
//   screenshot-el sel=<css selector> [name]
//   eval <js expression>                       (runs in page context, result printed)
//   console-errors
//   quit
//
// Example:
//   node .claude/skills/run-cdj-sim/driver.mjs <<'EOF'
//   nav http://localhost:8081
//   wait-for text=DECK A
//   screenshot initial
//   click text=▶|nth=1
//   wait 1200
//   screenshot playing
//   console-errors
//   quit
//   EOF

import { chromium } from 'playwright';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 1100 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

let shotSeq = 0;

function parseTarget(spec) {
  // "text=Foo|nth=1" -> { kind: 'text', value: 'Foo', nth: 1 }
  // "sel=.some-class" -> { kind: 'sel', value: '.some-class' }
  const parts = spec.split('|');
  const [kindRaw, ...rest] = parts[0].split('=');
  const value = rest.join('=');
  let nth = 0;
  for (const p of parts.slice(1)) {
    const m = p.match(/^nth=(\d+)$/);
    if (m) nth = Number(m[1]);
  }
  return { kind: kindRaw, value, nth };
}

function locatorFor(spec) {
  const { kind, value, nth } = parseTarget(spec);
  const loc = kind === 'sel' ? page.locator(value) : page.getByText(value, { exact: true });
  return loc.nth(nth);
}

async function run(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [cmd, ...rest] = trimmed.split(' ');
  const arg = rest.join(' ');

  if (cmd === 'viewport') {
    const [w, h] = arg.split(' ').map(Number);
    await page.setViewportSize({ width: w, height: h });
    console.log(`OK viewport ${arg}`);
  } else if (cmd === 'nav') {
    await page.goto(arg, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`OK nav ${arg}`);
  } else if (cmd === 'wait-for') {
    const { value, nth } = parseTarget(arg.replace(/^text=/, 'text='));
    await page.getByText(value, { exact: true }).nth(nth).waitFor({ timeout: 30000 });
    console.log(`OK wait-for ${arg}`);
  } else if (cmd === 'wait') {
    await page.waitForTimeout(Number(arg));
    console.log(`OK wait ${arg}`);
  } else if (cmd === 'click') {
    await locatorFor(arg).click();
    console.log(`OK click ${arg}`);
  } else if (cmd === 'press-hold') {
    const [target, ms] = arg.split(/\s+(\d+)$/).filter(Boolean);
    const loc = locatorFor(target);
    const box = await loc.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(Number(ms));
    await page.mouse.up();
    console.log(`OK press-hold ${arg}`);
  } else if (cmd === 'down') {
    const loc = locatorFor(arg);
    const box = await loc.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    console.log(`OK down ${arg}`);
  } else if (cmd === 'up') {
    await page.mouse.up();
    console.log('OK up');
  } else if (cmd === 'drag') {
    const m = arg.match(/^sel=(\S+)\s+dx=(-?\d+)\s+dy=(-?\d+)$/);
    if (!m) throw new Error(`bad drag args: ${arg}`);
    const [, sel, dx, dy] = m;
    const box = await page.locator(sel).boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + Number(dx), startY + Number(dy), { steps: 10 });
    await page.mouse.up();
    console.log(`OK drag ${arg}`);
  } else if (cmd === 'fill') {
    const m = arg.match(/^sel=(\S+)\s+(.*)$/);
    if (!m) throw new Error(`bad fill args: ${arg}`);
    const [, sel, value] = m;
    await page.locator(sel).fill(value);
    console.log(`OK fill ${arg}`);
  } else if (cmd === 'screenshot') {
    const name = arg || `shot-${shotSeq++}`;
    const file = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`OK screenshot -> ${file}`);
  } else if (cmd === 'screenshot-el') {
    const m = arg.match(/^sel=(\S+)\s*(.*)$/);
    const [, sel, name] = m;
    const file = path.join(SCREENSHOT_DIR, `${name || `shot-${shotSeq++}`}.png`);
    await page.locator(sel).screenshot({ path: file });
    console.log(`OK screenshot-el -> ${file}`);
  } else if (cmd === 'eval') {
    const result = await page.evaluate(arg);
    console.log(`OK eval -> ${JSON.stringify(result)}`);
  } else if (cmd === 'console-errors') {
    console.log(`CONSOLE_ERRORS: ${JSON.stringify(consoleErrors)}`);
  } else if (cmd === 'quit') {
    await browser.close();
    process.exit(0);
  } else {
    console.log(`UNKNOWN COMMAND: ${cmd}`);
  }
}

const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
  try {
    await run(line);
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
}
await browser.close();
