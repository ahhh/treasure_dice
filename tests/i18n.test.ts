import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../src/content/dialogue.ts';
import { lineText, choiceLabel, scriptTitle } from '../src/i18n/dialogue.ts';
import { newGame } from '../src/meta/town.ts';
import en from '../src/locales/en/dialogue.json';

type Lines = Record<string, string | Record<string, string>>;
const scripts = en.scripts as Record<string, { title: string; lines: Lines; choices?: Record<string, string[]>; terms?: Record<string, string> }>;

/** Every leaf string in a catalog, by slash path. */
function leaves(o: unknown, at = '', out: Record<string, string> = {}): Record<string, string> {
  if (typeof o === 'string') out[at] = o;
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) leaves(v, at ? `${at}/${k}` : k, out);
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+(?::\w+)?)\}/g)].map((m) => m[1]).sort();

describe('dialogue text', () => {
  it('every script, line and choice in code has English text, and nothing in the file is orphaned', () => {
    const ids = new Set(SCRIPTS.map((s) => s.id));
    for (const id of Object.keys(scripts)) expect(ids.has(id), `dialogue.json has text for unknown script ${id}`).toBe(true);
    for (const s of SCRIPTS) {
      const t = scripts[s.id];
      expect(t, `no text for script ${s.id}`).toBeTruthy();
      expect(t.title, `${s.id} has no title`).toBeTruthy();
      for (const id of Object.keys(t.lines)) expect(s.nodes[id], `${s.id}: text for unknown node ${id}`).toBeTruthy();
      for (const [id, n] of Object.entries(s.nodes)) {
        const line = t.lines[id];
        expect(line, `${s.id}/${id} has no line`).toBeTruthy();
        if (typeof line === 'object') {
          expect(n.pick, `${s.id}/${id} has variants but no pick()`).toBeTruthy();
        } else expect(n.pick, `${s.id}/${id} has pick() but a single line`).toBeFalsy();
        expect(t.choices?.[id]?.length ?? 0, `${s.id}/${id} choice labels`).toBe(n.choices?.length ?? 0);
      }
    }
  });

  it('every line resolves without gaps in a fresh game', () => {
    const g = newGame(1, 'legacy', 'I18N');
    for (const s of SCRIPTS) {
      expect(scriptTitle(s.id)).not.toContain('⟦');
      for (const [id, n] of Object.entries(s.nodes)) {
        const line = lineText(g, s.id, id, n);
        expect(line, `${s.id}/${id}`).not.toContain('⟦');
        expect(line, `${s.id}/${id} left a placeholder unfilled`).not.toMatch(/\{(?!keeper\}|hero\}|best:)\w+\}/);
        n.choices?.forEach((_, i) => expect(choiceLabel(s.id, id, i)).not.toContain('⟦'));
      }
    }
  });
});

describe('translations', () => {
  const root = 'src/locales';
  const langs = existsSync(root) ? readdirSync(root).filter((l) => l !== 'en') : [];
  it.skipIf(!langs.length)('only translate keys English has, and keep every placeholder', () => {
    for (const lang of langs) {
      for (const file of readdirSync(`${root}/${lang}`).filter((f) => f.endsWith('.json'))) {
        const base = leaves(JSON.parse(readFileSync(`${root}/en/${file}`, 'utf8')));
        const tr = leaves(JSON.parse(readFileSync(`${root}/${lang}/${file}`, 'utf8')));
        for (const [k, v] of Object.entries(tr)) {
          // Plural categories differ by language (`few`, `many`…), so only the parent must exist.
          const parent = k.replace(/\/(zero|one|two|few|many|other)$/, '');
          const known = k in base || Object.keys(base).some((b) => b.startsWith(`${parent}/`));
          expect(known, `${lang}/${file}: ${k} is not in English`).toBe(true);
          if (v && k in base) expect(placeholders(v), `${lang}/${file}: ${k} placeholders`).toEqual(placeholders(base[k]));
        }
      }
    }
  });
});
