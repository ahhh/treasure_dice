// Text editor check: starts the editor's own dev server, opens every sidebar entry,
// and fails if any English string in src/locales/en/*.json has no box in the editor,
// if the page throws, or if it asks for anything off this machine (it must work offline).
// `npm run test:ui -- editor`, or `node scripts/ui-editor.mjs`.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { freePort, stopVite } from './ui-lib.mjs';

const port = await freePort();
const proc = spawn('npx', ['vite', '--config', 'text-editor/vite.config.ts', '--port', String(port), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', env: { ...process.env, BROWSER: 'none' },
});
const url = `http://localhost:${port}/`;
let up = false;
for (let i = 0; i < 150 && !up; i++) {
  try { up = (await fetch(url)).ok; } catch { await new Promise((r) => setTimeout(r, 200)); }
}
if (!up) { stopVite(proc); console.log('FAIL ui-editor: the editor dev server did not start'); process.exit(1); }

const failures = [];
const offsite = new Set();
const errors = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || route.request().url().startsWith('data:')) return route.continue();
    offsite.add(route.request().url());
    return route.abort();
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__editor?.ready(), null, { timeout: 30000 });
  const keys = await page.evaluate(() => window.__editor.keys());
  const shown = new Set();
  for (const k of keys) {
    const paths = await page.evaluate((key) => { window.__editor.select(key); return [...document.querySelectorAll('[data-path]')].map((e) => e.dataset.path); }, k);
    if (!paths.length) failures.push(`entry ${k} shows no text boxes`);
    paths.forEach((p) => shown.add(p));
  }
  // Every English string must sit under some box (a list box covers its items).
  const missing = [];
  for (const ns of ['dialogue', 'story', 'game', 'ui']) {
    const json = JSON.parse(readFileSync(`src/locales/en/${ns}.json`, 'utf8'));
    const walk = (v, at) => {
      if (typeof v === 'string') {
        const full = `${ns}:${at.join('/')}`;
        let ok = false;
        for (let i = at.length; i >= 1 && !ok; i--) ok = shown.has(`${ns}:${at.slice(0, i).join('/')}`);
        if (!ok) missing.push(full);
      } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...at, k]);
    };
    walk(json, []);
  }
  if (missing.length) failures.push(`${missing.length} string(s) not editable in the editor:\n    ${missing.slice(0, 40).join('\n    ')}${missing.length > 40 ? '\n    …' : ''}`);
  if (offsite.size) failures.push(`the editor asked for off-machine resources (breaks offline use):\n    ${[...offsite].slice(0, 20).join('\n    ')}`);
  if (errors.length) failures.push(`page errors:\n    ${errors.slice(0, 10).join('\n    ')}`);
  console.log(failures.length ? `FAIL ui-editor\n- ${failures.join('\n- ')}` : `ok   ui-editor (${keys.length} entries, ${shown.size} boxes, every string covered, no off-machine requests)`);
} finally {
  await browser.close().catch(() => {});
  stopVite(proc);
}
process.exit(failures.length ? 1 : 0);
