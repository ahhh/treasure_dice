// Shared plumbing for the browser scripts (ui-*.mjs).
//
// - Starts a Vite dev server on a free port unless URL is set (the `__td` dev hook
//   only exists in dev builds), and stops it on exit.
// - Collects page errors and console errors.
// - `check()` records a failed expectation; `done()` prints a summary and sets the
//   exit code, so `npm run test:ui` can tell pass from fail.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';

export const OUT = process.env.SHOTS ?? 'test-results';
mkdirSync(OUT, { recursive: true });

const freePort = () => new Promise((res, rej) => {
  const s = createServer();
  s.once('error', rej);
  s.listen(0, () => { const { port } = s.address(); s.close(() => res(port)); });
});

export async function startVite() {
  const port = await freePort();
  const proc = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 150; i++) {
    try { if ((await fetch(url)).ok) return { url, proc }; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error('Vite dev server did not start');
}

export const stopVite = (proc) => {
  if (!proc) return;
  try { process.kill(-proc.pid); } catch { proc.kill(); }
};

/**
 * Open a page on a running game build. `name` labels the output.
 * Returns { page, browser, errors, check, shot, done }.
 */
export async function open(name, { width = Number(process.env.W ?? 1400), height = Number(process.env.H ?? 950) } = {}) {
  const server = process.env.URL ? null : await startVite();
  const url = process.env.URL ?? server.url;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  page.setDefaultTimeout(Number(process.env.STEP_TIMEOUT ?? 8000));
  const errors = [];
  const failures = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // The tour's Skip button asks for confirmation; tests always mean yes.
  page.on('dialog', (d) => d.accept());
  await page.goto(url);
  const check = (ok, msg) => { if (!ok) failures.push(msg); return ok; };
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const done = async (extra = '') => {
    const ignored = errors.filter((e) => !/Failed to load resource/.test(e));
    if (ignored.length) failures.push(`page errors:\n  ${ignored.slice(0, 10).join('\n  ')}`);
    await browser.close().catch(() => {});
    stopVite(server?.proc);
    if (failures.length) {
      console.log(`FAIL ${name}${extra ? ` (${extra})` : ''}\n- ${failures.join('\n- ')}`);
      process.exitCode = 1;
    } else console.log(`ok   ${name}${extra ? ` (${extra})` : ''}`);
  };
  // Never leave a dev server behind on a crash.
  const bail = async (err) => { console.log(`FAIL ${name}: ${err?.stack ?? err}`); await shot(`${name}-crash`).catch(() => {}); await browser.close().catch(() => {}); stopVite(server?.proc); process.exit(1); };
  process.on('uncaughtException', bail);
  process.on('unhandledRejection', bail);
  return { page, browser, errors, check, shot, done, url };
}

/** Wait until the in-page dev hook (`window.__td`) is ready. */
export const ready = (page) => page.waitForFunction(() => window.__td);

/**
 * Start a new game from the title screen through the real buttons.
 * With `tutorial: false` (the default) the guided tour is skipped via its own Skip button.
 */
export async function newGameUI(page, { mode = 'Legacy', slot = 0, tutorial = false } = {}) {
  await page.getByRole('button', { name: `New (${mode})` }).nth(slot).click();
  await page.locator('.coach-bubble').waitFor();
  if (!tutorial) await skipTutorial(page);
}

export async function skipTutorial(page) {
  await page.locator('.coach-skip').click();
  await page.locator('.coach').waitFor({ state: 'detached' });
}

/** A fresh game through the dev hook, with the tour already finished. */
export const freshGame = (page, seed, mode = 'legacy') => page.evaluate(([seed, mode]) => {
  const { newGame, setGame, render } = window.__td;
  const g = newGame(1, mode, seed);
  g.tutorial = null;
  setGame(g);
  render();
}, [seed, mode]);
