/**
 * Localisation: every player-facing string lives in `src/locales/<lang>/<namespace>.json`.
 *
 * English is bundled and always loaded; it is the source language and the
 * fallback for any key a translation hasn't covered yet. Other languages are
 * split into their own chunks and fetched by `setLocale`.
 *
 * Lookups take a namespace and a path of keys (`lookup('dialogue', ['scripts', 'bet.intro', 'title'])`),
 * because some ids (dialogue scripts) contain dots. `t('ui:menu.newGame')` is
 * the dotted shorthand for ordinary UI keys.
 */

export type Catalog = Record<string, unknown>;

export const SOURCE_LOCALE = 'en';

/** Languages the game offers, in menu order. Add one here and drop its JSON in src/locales/<code>/. */
export const LOCALES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
];

const eager = import.meta.glob<Catalog>('../locales/en/*.json', { eager: true, import: 'default' });
const lazy = import.meta.glob<Catalog>(['../locales/*/*.json', '!../locales/en/*.json'], { import: 'default' });

const nsOf = (path: string) => /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);

/** catalogs[lang][namespace] */
const catalogs: Record<string, Record<string, Catalog>> = { en: {} };
for (const [path, data] of Object.entries(eager)) {
  const m = nsOf(path);
  if (m) catalogs.en[m[2]] = data;
}

let current = SOURCE_LOCALE;
const listeners = new Set<() => void>();

export const locale = () => current;

/** Every language that has at least one catalog on disk (bundled or lazy). */
export function availableLocales(): string[] {
  const out = new Set(['en']);
  for (const p of Object.keys(lazy)) { const m = nsOf(p); if (m) out.add(m[1]); }
  return [...out];
}

/** Load every namespace for a language, then switch to it. Unknown languages fall back to English. */
export async function setLocale(lang: string): Promise<void> {
  if (lang !== SOURCE_LOCALE && !catalogs[lang]) {
    const entries = Object.entries(lazy).filter(([p]) => nsOf(p)?.[1] === lang);
    if (!entries.length) lang = SOURCE_LOCALE;
    else {
      const loaded: Record<string, Catalog> = {};
      await Promise.all(entries.map(async ([p, load]) => { loaded[nsOf(p)![2]] = await load(); }));
      catalogs[lang] = loaded;
    }
  }
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  for (const fn of listeners) fn();
}

/** Re-render hook: called after the language changes. */
export function onLocaleChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Replace a catalog in place (the dev editor uses this for live preview). */
export function setCatalog(lang: string, ns: string, data: Catalog): void {
  (catalogs[lang] ??= {})[ns] = data;
}

function dig(root: unknown, path: readonly string[]): unknown {
  let cur = root;
  for (const k of path) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

const filled = (v: unknown) => v !== undefined && v !== null && v !== '';

/** The raw value at a path: the current language first, then English. */
export function lookup(ns: string, path: readonly string[]): unknown {
  const here = dig(catalogs[current]?.[ns], path);
  if (filled(here)) return here;
  return dig(catalogs.en[ns], path);
}

/** Fill `{name}` placeholders. Unknown placeholders are left alone (dialogue markup like {keeper} resolves later). */
export function format(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** A string at a path, or the joined path when it's missing everywhere (so gaps are visible, never blank). */
export function text(ns: string, path: readonly string[], vars?: Record<string, string | number>): string {
  const v = lookup(ns, path);
  return typeof v === 'string' ? format(v, vars) : `⟦${ns}:${path.join('/')}⟧`;
}

/** Dotted shorthand: `t('ui:menu.newGame', { n: 3 })`. Namespace defaults to `ui`. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const i = key.indexOf(':');
  const ns = i >= 0 ? key.slice(0, i) : 'ui';
  return text(ns, (i >= 0 ? key.slice(i + 1) : key).split('.'), vars);
}

/**
 * A pluralised string: the entry at `path` is an object keyed by plural category
 * (`one`, `few`, `many`, `other`…, per Intl.PluralRules for the language). `{n}` is the count.
 */
export function plural(ns: string, path: readonly string[], n: number, vars?: Record<string, string | number>): string {
  let cat: string = 'other';
  try { cat = new Intl.PluralRules(current).select(n); } catch { /* keep 'other' */ }
  const v = lookup(ns, [...path, cat]);
  return text(ns, [...path, typeof v === 'string' ? cat : 'other'], { n, ...vars });
}

/** "a, b and c" in the current language. */
export function listJoin(items: string[]): string {
  try { return new Intl.ListFormat(current, { type: 'conjunction' }).format(items); } catch { return items.join(', '); }
}
