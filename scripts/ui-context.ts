/**
 * Rebuilds src/dev/ui-context.json: for every ui.json string, the first place in
 * src/ that uses it (file, line, the line of code). The text editor shows this
 * under "Where it is used". Runs on its own (`npm run text:context`) and every
 * time the editor starts (text-editor/vite.config.ts), so it is never stale.
 *
 * A use is any string literal starting "<section>.<key>" where ui.json has that
 * key: tx('town.records'), a ternary's 'shareCard.legacy', or a template's
 * `town.tab.${id}` prefix. Keys only ever built from variables get no entry.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

type Ctx = { line: number; file: string; code: string };

export function buildUiContext(repo: string): { context: Record<string, Record<string, Ctx>>; missing: string[] } {
  const ui = JSON.parse(readFileSync(join(repo, 'src/locales/en/ui.json'), 'utf8')) as Record<string, Record<string, unknown>>;
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { if (name !== 'dev' && name !== 'locales') walk(p); } else if (/\.ts$/.test(name)) files.push(p);
    }
  };
  walk(join(repo, 'src'));
  const context: Record<string, Record<string, Ctx>> = {};
  const lit = /['"`]([a-z][A-Za-z0-9]*)\.([A-Za-z0-9_]+)(?=[.'"`$])/g;
  for (const f of files) {
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((text, i) => {
      for (const m of text.matchAll(lit)) {
        const [, sec, key] = m;
        if (!ui[sec] || !(key in ui[sec]) || context[sec]?.[key]) continue;
        const code = text.trim();
        (context[sec] ??= {})[key] = { line: i + 1, file: relative(repo, f), code: code.length > 400 ? `${code.slice(0, 400)}…` : code };
      }
    });
  }
  const missing = Object.entries(ui).flatMap(([sec, keys]) => Object.keys(keys).filter((k) => !context[sec]?.[k]).map((k) => `${sec}.${k}`));
  return { context, missing };
}

/** Writes the file; returns the keys no literal points at. */
export function writeUiContext(repo: string): string[] {
  const { context, missing } = buildUiContext(repo);
  const out = join(repo, 'src/dev/ui-context.json');
  const json = `${JSON.stringify(context, null, 1)}\n`;
  let old = '';
  try { old = readFileSync(out, 'utf8'); } catch { /* first run */ }
  if (old !== json) writeFileSync(out, json);
  return missing;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const repo = fileURLToPath(new URL('..', import.meta.url));
  const missing = writeUiContext(repo);
  console.log(`ui-context.json written. ${missing.length} key(s) have no literal use${missing.length ? `: ${missing.join(', ')}` : ''}.`);
}
