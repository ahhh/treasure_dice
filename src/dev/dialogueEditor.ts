/**
 * Dialogue editor (dev server only: `npm run text`, or /dev/dialogue.html under `npm run dev`).
 *
 * Shows every scene with its context (who speaks, their portrait and look, the
 * mood, when the line plays, where choices lead, what they change) and lets
 * you edit the words. Save writes src/locales/<lang>/dialogue.json through the
 * dev server (scripts/vite-locales.ts), ready to commit; the game tab reloads.
 *
 * Pick another language to translate: English shows above each box, and any
 * box left empty falls back to English in game.
 */
import './editor.css';
import { h, clear } from '../ui/dom.ts';
import { art, hasArt, loadManifest } from '../ui/art.ts';
import { SCRIPTS, type Script, type DlgNode } from '../content/dialogue.ts';
import { NPCS, HEAD_EYES, portraitKey } from '../content/npcs.ts';
import { BIOMES } from '../content/biomes.ts';
import { SKILL_NAMES } from '../rules/character.ts';

type Json = Record<string, unknown>;
type Path = string[];

const NS = 'dialogue';
const root = document.getElementById('app')!;

const st = {
  langs: {} as Record<string, string[]>,
  en: {} as Json,
  lang: 'en',
  work: {} as Json,
  saved: '',
  sel: `script:${SCRIPTS[0]?.id}`,
  q: '',
  status: '' as string,
  error: false,
};

// ── data ────────────────────────────────────────────────────────────────────

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function getAt(o: unknown, path: Path): unknown {
  let cur = o;
  for (const k of path) { if (!cur || typeof cur !== 'object') return undefined; cur = (cur as Json)[k]; }
  return cur;
}

function setAt(o: Json, path: Path, v: string) {
  let cur: Json = o;
  path.slice(0, -1).forEach((k, i) => {
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(path[i + 1]) ? [] : {};
    cur = cur[k] as Json;
  });
  cur[path[path.length - 1]] = v;
}

/** Translations drop empty strings (they fall back to English); empty arrays/objects go too. */
function prune(v: unknown): unknown {
  if (typeof v === 'string') return v === '' ? undefined : v;
  if (Array.isArray(v)) { const a = v.map((x) => prune(x) ?? ''); return a.some((x) => x !== '') ? a : undefined; }
  if (v && typeof v === 'object') {
    const out: Json = {};
    for (const [k, x] of Object.entries(v)) { const p = prune(x); if (p !== undefined) out[k] = p; }
    return Object.keys(out).length ? out : undefined;
  }
  return v;
}

const payload = () => (st.lang === 'en' ? st.work : (prune(st.work) as Json) ?? {});
const dirty = () => JSON.stringify(payload()) !== st.saved;

function leaves(o: unknown, at: Path = [], out: Path[] = []): Path[] {
  if (typeof o === 'string') out.push(at);
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) leaves(v, [...at, k], out);
  return out;
}
/** [translated, total] English strings under a path. */
function progress(path: Path): [number, number] {
  const all = leaves(getAt(st.en, path), path);
  return [all.filter((p) => { const v = getAt(st.work, p); return typeof v === 'string' && v !== ''; }).length, all.length];
}

async function api(path: string, init?: RequestInit) {
  const r = await fetch(`/__locales${path}`, init);
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? r.statusText);
  return body;
}

async function loadLang(lang: string) {
  st.lang = lang;
  st.work = lang === 'en' ? clone(st.en) : await api(`/${lang}/${NS}`);
  st.saved = JSON.stringify(payload());
  st.status = '';
}

async function save() {
  try {
    const r = await api(`/${st.lang}/${NS}`, { method: 'PUT', body: JSON.stringify(payload()) });
    st.saved = JSON.stringify(payload());
    if (st.lang === 'en') st.en = clone(st.work);
    if (!st.langs[st.lang]) st.langs[st.lang] = [NS];
    st.status = `Saved ${r.file}`;
    st.error = false;
  } catch (e) { st.status = `Save failed: ${(e as Error).message}`; st.error = true; }
  renderBar();
}

// ── small pieces ────────────────────────────────────────────────────────────

const chip = (text: string, cls = '', title?: string) => h('span', { class: `chip ${cls}`, title }, text);
const cond = (c: unknown) => JSON.stringify(c).replace(/"(\w+)":/g, '$1: ').replace(/"/g, '');
const goTo = (node: string) => h('a', { class: 'jump', href: `#n-${node}`, on: { click: (e: Event) => { e.preventDefault(); document.getElementById(`n-${node}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(node); } } }, node);
function flash(node: string) { const el = document.getElementById(`n-${node}`); el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 900); }

function grow(t: HTMLTextAreaElement) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; }

/** One editable string. In a translation, English sits above and an empty box falls back to it. */
function field(path: Path, opts: { label?: string; rows?: number } = {}): HTMLElement {
  const en = getAt(st.en, path);
  const cur = getAt(st.work, path);
  const ta = h('textarea', {
    rows: opts.rows ?? 2, spellcheck: true, lang: st.lang,
    placeholder: st.lang === 'en' ? '' : 'Untranslated: the game shows English',
    on: { input: (e: Event) => { const t = e.target as HTMLTextAreaElement; setAt(st.work, path, t.value); grow(t); wrap.classList.toggle('missing', st.lang !== 'en' && !t.value); renderBar(); renderSide(); } },
  });
  ta.value = typeof cur === 'string' ? cur : '';
  requestAnimationFrame(() => grow(ta));
  const wrap = h('div', { class: `field ${st.lang !== 'en' && !ta.value ? 'missing' : ''}` },
    opts.label ? h('div', { class: 'flabel' }, opts.label) : null,
    st.lang !== 'en' && typeof en === 'string' ? h('div', { class: 'ref', lang: 'en' }, en) : null,
    ta);
  return wrap;
}

function face(who: string, mood?: string): HTMLElement {
  if (who === 'narrator') return h('div', { class: 'face glyph', title: 'Narrator' }, '📜');
  if (who === 'hero') return h('div', { class: 'face glyph', title: 'The hero who rolled the check' }, '🎲');
  if (who.startsWith('head:')) { const e = HEAD_EYES[who.slice(5)]; return h('div', { class: 'face' }, e ? art(e.key, 'An eye') : '👁'); }
  const key = mood && hasArt(portraitKey(who, mood as never)) ? portraitKey(who, mood as never) : portraitKey(who);
  return h('div', { class: 'face', style: `--sc:${NPCS[who]?.color ?? '#888'}` }, art(key, NPCS[who]?.name ?? who, '', NPCS[who]?.color));
}

function whoBlock(who: string, mood?: string, variant?: string): HTMLElement {
  const npc = NPCS[who];
  if (!npc) {
    const label = who === 'narrator' ? (variant === 'read' ? 'Narrator · parchment box' : 'Narrator') : who === 'hero' ? 'The hero who just rolled' : who.startsWith('head:') ? `Tiamat's head · ${BIOMES[who.slice(5) as keyof typeof BIOMES]?.name ?? who.slice(5)}` : who;
    return h('div', { class: 'who' }, h('b', null, label));
  }
  return h('div', { class: 'who' },
    h('b', { style: `color:${npc.color}` }, npc.name), npc.alias ? h('span', { class: 'muted' }, ` (shown as “${npc.alias}” until met)`) : null,
    h('span', { class: 'muted' }, ` · ${npc.title}`),
    mood ? chip(mood, 'mood') : null,
    h('details', null, h('summary', null, 'Description'),
      h('p', null, npc.look),
      mood && npc.moods[mood as keyof typeof npc.moods] ? h('p', null, h('i', null, `${mood}: `), npc.moods[mood as keyof typeof npc.moods]!) : null));
}

function fxChips(fx?: unknown[]) {
  return fx?.length ? fx.map((f) => chip(cond(f), 'fx', 'Effect when the player moves past this')) : [];
}

// ── views ───────────────────────────────────────────────────────────────────

function nodeCard(s: Script, id: string, n: DlgNode): HTMLElement {
  const base = ['scripts', s.id, 'lines', id];
  const en = getAt(st.en, base);
  const variants = en && typeof en === 'object' ? Object.keys(en as Json) : null;
  const incoming = Object.entries(s.nodes).filter(([, m]) => m.next === id || m.skip === id || m.choices?.some((c) => c.goto === id || c.fail === id)).map(([k]) => k);
  return h('div', { class: `node ${id === s.start ? 'start' : ''}`, id: `n-${id}` },
    face(n.who, n.mood),
    h('div', { class: 'body' },
      h('div', { class: 'nhead' }, whoBlock(n.who, n.mood, n.variant), h('span', { class: 'spacer' }), chip(id, 'id', 'Node id (the text key)'), id === s.start ? chip('start', 'start') : null),
      n.when ? h('div', { class: 'meta' }, chip(`only if ${cond(n.when)}`, 'when'), n.skip ? [' otherwise → ', goTo(n.skip)] : null) : null,
      variants
        ? h('div', { class: 'variants' },
          h('div', { class: 'meta' }, chip('chosen in code', 'when'), h('code', { class: 'src' }, n.pick?.toString() ?? '(no pick: uses "default")')),
          n.vars ? h('div', { class: 'meta' }, chip('placeholders', 'fx'), h('code', { class: 'src' }, n.vars.toString())) : null,
          ...variants.map((v) => field([...base, v], { label: v })))
        : field(base),
      n.choices?.length ? h('div', { class: 'choices' }, ...n.choices.map((c, i) => h('div', { class: 'choice' },
        h('span', { class: 'cur' }, '▶'),
        h('div', { class: 'grow' },
          field(['scripts', s.id, 'choices', id, String(i)], { rows: 1 }),
          h('div', { class: 'meta' },
            c.check ? chip(`🎲 ${SKILL_NAMES[c.check.skill]} DC ${c.check.dc}`, 'check') : null,
            c.when ? chip(`only if ${cond(c.when)}`, 'when') : null,
            c.goto ? ['→ ', goTo(c.goto)] : chip('ends scene'),
            c.fail ? [' · on fail → ', goTo(c.fail)] : null,
            ...fxChips(c.fx), ...fxChips(c.failFx)))))) : null,
      h('div', { class: 'meta flow' },
        incoming.length ? ['from ', ...incoming.flatMap((k, i) => [i ? ', ' : '', goTo(k)]), ' · '] : null,
        n.next ? ['next → ', goTo(n.next)] : n.end ? chip('end of scene', 'end') : n.choices?.length ? null : chip('end of scene', 'end'),
        ...fxChips(n.fx))));
}

function scriptView(s: Script): HTMLElement {
  return h('div', { class: 'view' },
    h('div', { class: 'shead' },
      face(s.speaker),
      h('div', { class: 'grow' },
        h('div', { class: 'muted small' }, `${s.where} · ${NPCS[s.speaker]?.name ?? s.speaker}'s scene · id ${s.id}`),
        field(['scripts', s.id, 'title'], { label: 'Button title', rows: 1 }),
        h('div', { class: 'meta' },
          chip(`plays when ${cond(s.when)}`, 'when'),
          s.auto ? chip('auto-plays on arrival') : chip('player starts it'),
          s.repeat ? chip('repeatable') : null,
          s.priority !== undefined ? chip(`priority ${s.priority}`) : null))),
    ...Object.entries(s.nodes).map(([id, n]) => nodeCard(s, id, n)),
    getAt(st.en, ['scripts', s.id, 'terms']) ? h('div', { class: 'node' }, h('div', { class: 'face glyph' }, '🔤'), h('div', { class: 'body' },
      h('b', null, 'Terms'), h('p', { class: 'muted small' }, 'Words the code slots into {placeholders} above.'),
      ...Object.keys(getAt(st.en, ['scripts', s.id, 'terms']) as Json).map((k) => field(['scripts', s.id, 'terms', k], { label: k, rows: 1 })))) : null);
}

const STAGES = ['No heads awake', '1 head awake', '2 heads awake', '3 heads awake', '4 heads awake', 'Tiamat awakened', 'Tiamat slain'];

function barksView(npc: string): HTMLElement {
  const lines = (getAt(st.en, ['barks', npc]) as string[]) ?? [];
  return h('div', { class: 'view' },
    h('div', { class: 'shead' }, face(npc), h('div', { class: 'grow' }, whoBlock(npc), h('p', { class: 'muted small' }, `A one-line bark the first time you open ${NPCS[npc]?.tab ?? 'their tab'} at each stage of the story.`))),
    ...lines.map((_, i) => h('div', { class: 'node' }, face(npc), h('div', { class: 'body' }, field(['barks', npc, String(i)], { label: STAGES[i] ?? `Stage ${i}` })))));
}

function headsView(): HTMLElement {
  return h('div', { class: 'view' },
    h('p', { class: 'muted' }, 'Heard once each on the way home from breaking an echo, in a portrait-less box with the head\'s eye.'),
    ...Object.keys((getAt(st.en, ['heads']) as Json) ?? {}).map((b) => h('div', { class: 'node' }, face(`head:${b}`), h('div', { class: 'body' }, whoBlock(`head:${b}`), field(['heads', b])))));
}

function eulogyView(): HTMLElement {
  return h('div', { class: 'view' },
    h('div', { class: 'shead' }, face('maren'), h('div', { class: 'grow' }, whoBlock('maren'), h('p', { class: 'muted small' }, 'Maren\'s bark at the Guild after a hero dies. {name}, {kills}, {clears} (the plural line below) and {cause} (the cause line, or nothing) are filled in by the game.'))),
    h('div', { class: 'node' }, face('maren'), h('div', { class: 'body' },
      field(['eulogy', 'line'], { label: 'Line' }),
      ...Object.keys((getAt(st.en, ['eulogy', 'clears']) as Json) ?? {}).map((k) => field(['eulogy', 'clears', k], { label: `Echoes broken · plural “${k}”`, rows: 1 })),
      field(['eulogy', 'cause'], { label: 'Cause of death', rows: 1 }))));
}

// ── layout ──────────────────────────────────────────────────────────────────

interface Entry { key: string; label: string; sub: string; path: Path; search: string }

function entries(): { group: string; items: Entry[] }[] {
  const groups = new Map<string, Entry[]>();
  const add = (g: string, e: Entry) => groups.set(g, [...(groups.get(g) ?? []), e]);
  for (const s of SCRIPTS) {
    const path = ['scripts', s.id];
    const title = String(getAt(st.work, [...path, 'title']) || getAt(st.en, [...path, 'title']) || s.id);
    const words = [getAt(st.en, path), getAt(st.work, path)].map((x) => JSON.stringify(x ?? '')).join(' ');
    add(s.where, { key: `script:${s.id}`, label: title, sub: NPCS[s.speaker]?.name ?? s.speaker, path, search: `${s.id} ${title} ${NPCS[s.speaker]?.name} ${s.where} ${words}` });
  }
  for (const npc of Object.keys((getAt(st.en, ['barks']) as Json) ?? {})) {
    add('barks', { key: `barks:${npc}`, label: NPCS[npc]?.name ?? npc, sub: NPCS[npc]?.title ?? '', path: ['barks', npc], search: `${npc} ${NPCS[npc]?.name} barks ${JSON.stringify(getAt(st.en, ['barks', npc]))} ${JSON.stringify(getAt(st.work, ['barks', npc]) ?? '')}` });
  }
  add('other', { key: 'heads', label: 'Tiamat\'s heads', sub: '5 lines', path: ['heads'], search: `heads tiamat ${JSON.stringify(getAt(st.en, ['heads']))} ${JSON.stringify(getAt(st.work, ['heads']) ?? '')}` });
  add('other', { key: 'eulogy', label: 'Fallen hero eulogy', sub: 'Maren', path: ['eulogy'], search: `eulogy maren fallen ${JSON.stringify(getAt(st.en, ['eulogy']))}` });
  const q = st.q.trim().toLowerCase();
  return [...groups.entries()].map(([group, items]) => ({ group, items: q ? items.filter((e) => e.search.toLowerCase().includes(q)) : items })).filter((g) => g.items.length);
}

const side = h('aside', { class: 'side' });
const main = h('main', { class: 'main' });
const bar = h('header', { class: 'bar' });

function renderSide() {
  const groups = entries();
  const list = h('nav', null, ...groups.map(({ group, items }) => h('div', { class: 'group' },
    h('div', { class: 'gname' }, group),
    ...items.map((e) => {
      const [done, total] = st.lang === 'en' ? [0, 0] : progress(e.path);
      return h('button', { class: `item ${st.sel === e.key ? 'on' : ''}`, on: { click: () => { st.sel = e.key; renderSide(); renderMain(); main.scrollTop = 0; } } },
        h('span', { class: 'grow' }, h('span', { class: 'ilabel' }, e.label), h('span', { class: 'isub' }, e.sub)),
        st.lang !== 'en' ? h('span', { class: `badge ${done === total ? 'done' : ''}` }, `${done}/${total}`) : null);
    }))));
  const old = side.querySelector('nav');
  if (old) side.replaceChild(list, old); else side.append(list);
}

function renderMain() {
  clear(main);
  const [kind, id] = st.sel.split(/:(.*)/s);
  const s = kind === 'script' ? SCRIPTS.find((x) => x.id === id) : undefined;
  main.append(s ? scriptView(s) : kind === 'barks' ? barksView(id) : kind === 'heads' ? headsView() : kind === 'eulogy' ? eulogyView() : h('p', null, 'Pick something on the left.'));
}

function renderBar() {
  clear(bar);
  const d = dirty();
  const [done, total] = st.lang === 'en' ? [0, 0] : progress([]);
  const sel = h('select', { on: { change: async (e: Event) => {
    const t = e.target as HTMLSelectElement;
    let lang = t.value;
    if (lang === '+') {
      lang = (prompt('Language code (BCP 47), e.g. fr, de, es, pt-BR, ja') ?? '').trim();
      if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(lang)) { t.value = st.lang; return; }
    }
    if (dirty() && !confirm('Discard unsaved changes?')) { t.value = st.lang; return; }
    await loadLang(lang);
    renderAll();
  } } },
  ...[...new Set([...Object.keys(st.langs), st.lang])].sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b))).map((l) => h('option', { value: l, selected: l === st.lang }, l === 'en' ? 'en (source)' : l)),
  h('option', { value: '+' }, '+ New language…'));
  bar.append(
    h('b', null, 'Dialogue editor'),
    sel,
    st.lang !== 'en' ? h('span', { class: 'muted' }, `${done}/${total} translated`) : h('span', { class: 'muted' }, 'Markup: | pause · {keeper} · {hero} · {best:skill}'),
    h('span', { class: 'spacer' }),
    h('span', { class: st.error ? 'err' : 'muted' }, d ? 'Unsaved changes' : st.status),
    h('button', { class: `save ${d ? 'dirty' : ''}`, disabled: !d, on: { click: () => void save() } }, `Save ${st.lang}/${NS}.json`));
}

function renderAll() {
  clear(root);
  clear(side);
  side.append(h('input', { type: 'search', placeholder: 'Search text, speaker, id…', value: st.q, on: { input: (e: Event) => { st.q = (e.target as HTMLInputElement).value; renderSide(); } } }));
  renderSide();
  renderMain();
  renderBar();
  root.append(bar, h('div', { class: 'cols' }, side, main));
}

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (dirty()) void save(); }
});
window.addEventListener('beforeunload', (e) => { if (dirty()) e.preventDefault(); });

async function boot() {
  root.textContent = 'Loading…';
  try {
    const [{ langs }] = await Promise.all([api(''), loadManifest()]);
    st.langs = langs;
    st.en = await api(`/en/${NS}`);
    const want = new URLSearchParams(location.search).get('lang');
    await loadLang(want && langs[want] ? want : 'en');
    renderAll();
  } catch (e) {
    root.textContent = `The editor needs the dev server (npm run text). ${(e as Error).message}`;
  }
}
void boot();
