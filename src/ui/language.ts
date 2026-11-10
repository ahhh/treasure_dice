/**
 * Language choice: a per-device preference (localStorage), defaulting to the best
 * match among the browser's languages. `?lang=xx` overrides it for a session.
 */
import { h } from './dom.ts';
import { availableLocales, locale, setLocale, tx } from '../i18n/index.ts';

const KEY = 'td.lang';

function stored(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/** The best available language for this browser: exact match first, then the base language (pt-BR → pt). */
function preferred(available: string[]): string {
  const wants = typeof navigator !== 'undefined' ? [...(navigator.languages ?? []), navigator.language].filter(Boolean) : [];
  for (const w of wants) {
    const exact = available.find((a) => a.toLowerCase() === w.toLowerCase());
    if (exact) return exact;
    const base = available.find((a) => a.split('-')[0] === w.split('-')[0].toLowerCase());
    if (base) return base;
  }
  return 'en';
}

export async function initLanguage(): Promise<void> {
  const available = availableLocales();
  const url = new URLSearchParams(location.search).get('lang');
  const want = [url, stored()].find((l) => l && available.includes(l)) ?? preferred(available);
  if (want !== locale()) await setLocale(want);
}

/** A language's own name for itself ("Français"), falling back to the code. */
export function endonym(code: string): string {
  try {
    const n = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return n ? n[0].toLocaleUpperCase(code) + n.slice(1) : code;
  } catch { return code; }
}

/** A labelled <select> of every language that has a catalog. */
export function languagePicker(): HTMLElement {
  const langs = availableLocales();
  const sel = h('select', {
    'aria-label': tx('language.label'),
    disabled: langs.length < 2,
    on: { change: (e: Event) => {
      const v = (e.target as HTMLSelectElement).value;
      try { localStorage.setItem(KEY, v); } catch { /* private mode: session only */ }
      void setLocale(v);
    } },
  }, ...langs.map((l) => h('option', { value: l, selected: l === locale() }, endonym(l))));
  return h('label', { class: 'lang-picker small' }, h('span', { 'aria-hidden': 'true' }, '🌐'), sel);
}
