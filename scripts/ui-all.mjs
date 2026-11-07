// Run every browser check against one shared Vite dev server: `npm run test:ui`.
// Pass script names to run a subset, e.g. `npm run test:ui -- tutorial smoke`.
import { spawn } from 'node:child_process';
import { startVite, stopVite } from './ui-lib.mjs';

const ALL = ['smoke', 'tutorial', 'screens', 'dialogue', 'boss', 'battle', 'render-stress'];
const pick = process.argv.slice(2);
const names = pick.length ? ALL.filter((n) => pick.includes(n)) : ALL;
const server = process.env.URL ? null : await startVite();
const env = { ...process.env, URL: process.env.URL ?? server.url };
const failed = [];
for (const n of names) {
  const t = Date.now();
  const code = await new Promise((res) => spawn('node', [`scripts/ui-${n}.mjs`], { stdio: 'inherit', env }).on('exit', res));
  console.log(`     ${n}: ${((Date.now() - t) / 1000).toFixed(1)}s`);
  if (code !== 0) failed.push(n);
}
stopVite(server?.proc);
console.log(failed.length ? `\n${failed.length} of ${names.length} UI checks failed: ${failed.join(', ')}` : `\nAll ${names.length} UI checks passed.`);
process.exit(failed.length ? 1 : 0);
