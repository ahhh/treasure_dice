/**
 * Text editor (dev server only: `npm run text`, or /dev/text.html under `npm run dev`).
 *
 * Every player-facing word that lives in src/locales, shown with its context:
 * dialogue scenes (speaker, portrait, mood, when a line plays, where choices
 * lead), room events (scene art, checks, outcomes), the chronicle, people,
 * leads, evidence, rumours, drinks and the Muster. Save writes
 * src/locales/<lang>/<namespace>.json through the dev server
 * (scripts/vite-locales.ts), ready to commit; the game tab reloads.
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
import { EVENTS, type EventDef, type Outcome } from '../content/events.ts';
import { EVIDENCE, DRINKS, LEADS, SOURCES, RUMORS, MUSTER, TRACKS } from '../content/quest.ts';
import { ITEMS } from '../content/items.ts';
import { MONSTERS } from '../content/monsters.ts';
import { SPELLS } from '../content/spells.ts';
import { CLASSES } from '../content/classes.ts';
import { CHARM_BY_ID } from '../fortune/charms.ts';
import { MATERIALS } from '../fortune/materials.ts';

type Json = Record<string, unknown>;
type Path = string[];
type Ns = 'dialogue' | 'story' | 'game';

const NAMESPACES: Ns[] = ['dialogue', 'story', 'game'];
const D: Ns = 'dialogue';
const S: Ns = 'story';
const G: Ns = 'game';
const root = document.getElementById('app')!;

const st = {
  langs: {} as Record<string, string[]>,
  lang: 'en',
  en: { dialogue: {}, story: {}, game: {} } as Record<Ns, Json>,
  work: { dialogue: {}, story: {}, game: {} } as Record<Ns, Json>,
  saved: { dialogue: '', story: '', game: '' } as Record<Ns, string>,
  sel: `script:${SCRIPTS[0]?.id}`,
  q: '',
  status: '',
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

const payload = (ns: Ns) => (st.lang === 'en' ? st.work[ns] : (prune(st.work[ns]) as Json) ?? {});
const dirtyNs = () => NAMESPACES.filter((ns) => JSON.stringify(payload(ns)) !== st.saved[ns]);

function leaves(o: unknown, at: Path = [], out: Path[] = []): Path[] {
  if (typeof o === 'string') out.push(at);
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) leaves(v, [...at, k], out);
  return out;
}
/** [translated, total] English strings under these paths. */
function progress(parts: [Ns, Path][]): [number, number] {
  let done = 0, total = 0;
  for (const [ns, path] of parts) {
    const all = leaves(getAt(st.en[ns], path), path);
    total += all.length;
    done += all.filter((p) => { const v = getAt(st.work[ns], p); return typeof v === 'string' && v !== ''; }).length;
  }
  return [done, total];
}

async function api(path: string, init?: RequestInit) {
  const r = await fetch(`/__locales${path}`, init);
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? r.statusText);
  return body;
}

async function loadLang(lang: string) {
  st.lang = lang;
  for (const ns of NAMESPACES) {
    st.work[ns] = lang === 'en' ? clone(st.en[ns]) : await api(`/${lang}/${ns}`);
    st.saved[ns] = JSON.stringify(payload(ns));
  }
  st.status = '';
}

async function save() {
  const files: string[] = [];
  try {
    for (const ns of dirtyNs()) {
      const r = await api(`/${st.lang}/${ns}`, { method: 'PUT', body: JSON.stringify(payload(ns)) });
      st.saved[ns] = JSON.stringify(payload(ns));
      if (st.lang === 'en') st.en[ns] = clone(st.work[ns]);
      files.push(r.file);
    }
    if (!st.langs[st.lang]) st.langs[st.lang] = [...NAMESPACES];
    st.status = files.length ? `Saved ${files.join(', ')}` : st.status;
    st.error = false;
  } catch (e) { st.status = `Save failed: ${(e as Error).message}`; st.error = true; }
  renderBar();
}

// ── small pieces ────────────────────────────────────────────────────────────

const chip = (text: string, cls = '', title?: string) => h('span', { class: `chip ${cls}`, title }, text);
const cond = (c: unknown) => JSON.stringify(c).replace(/"(\w+)":/g, '$1: ').replace(/"/g, '');
const has = (ns: Ns, path: Path) => getAt(st.en[ns], path) !== undefined;
function flash(id: string) { const el = document.getElementById(id); el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 900); }
const goTo = (node: string) => h('a', { class: 'jump', href: `#n-${node}`, on: { click: (e: Event) => { e.preventDefault(); document.getElementById(`n-${node}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(`n-${node}`); } } }, node);
/** A link to another entry in the sidebar (an event from a lead, a scene from a Muster task). */
const open = (key: string, label: string) => h('a', { class: 'jump', href: '#', on: { click: (e: Event) => { e.preventDefault(); select(key); } } }, label);

function grow(t: HTMLTextAreaElement) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; }

/** One editable string. In a translation, English sits above and an empty box falls back to it. */
function field(ns: Ns, path: Path, opts: { label?: string; rows?: number } = {}): HTMLElement {
  const en = getAt(st.en[ns], path);
  const cur = getAt(st.work[ns], path);
  const ta = h('textarea', {
    rows: opts.rows ?? 2, spellcheck: true, lang: st.lang,
    placeholder: st.lang === 'en' ? '' : 'Untranslated: the game shows English',
    on: { input: (e: Event) => { const t = e.target as HTMLTextAreaElement; setAt(st.work[ns], path, t.value); grow(t); wrap.classList.toggle('missing', st.lang !== 'en' && !t.value); renderBar(); renderSide(); } },
  });
  ta.value = typeof cur === 'string' ? cur : '';
  requestAnimationFrame(() => grow(ta));
  const wrap = h('div', { class: `field ${st.lang !== 'en' && !ta.value ? 'missing' : ''}` },
    opts.label ? h('div', { class: 'flabel' }, opts.label) : null,
    st.lang !== 'en' && typeof en === 'string' ? h('div', { class: 'ref', lang: 'en' }, en) : null,
    ta);
  return wrap;
}
/** Fields for whichever of these keys English has at `path`. */
const fields = (ns: Ns, path: Path, keys: [key: string, label: string, rows?: number][]) =>
  keys.filter(([k]) => has(ns, [...path, k])).map(([k, label, rows]) => field(ns, [...path, k], { label, rows }));

function face(who: string, mood?: string): HTMLElement {
  if (who === 'narrator') return h('div', { class: 'face glyph', title: 'Narrator' }, '📜');
  if (who === 'hero') return h('div', { class: 'face glyph', title: 'The hero who rolled the check' }, '🎲');
  if (who.startsWith('head:')) { const e = HEAD_EYES[who.slice(5)]; return h('div', { class: 'face' }, e ? art(e.key, 'An eye') : '👁'); }
  const key = mood && hasArt(portraitKey(who, mood as never)) ? portraitKey(who, mood as never) : portraitKey(who);
  return h('div', { class: 'face', style: `--sc:${NPCS[who]?.color ?? '#888'}` }, art(key, NPCS[who]?.name ?? who, '', NPCS[who]?.color));
}
const pic = (key: string, alt: string, glyph = '▪') => h('div', { class: hasArt(key) ? 'face' : 'face glyph' }, hasArt(key) ? art(key, alt) : glyph);
const banner = (key: string, alt: string) => (hasArt(key) ? h('div', { class: 'banner' }, art(key, alt)) : null);

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

const fxChips = (fx?: unknown[]) => (fx?.length ? fx.map((f) => chip(cond(f), 'fx', 'Effect')) : []);
const card = (left: HTMLElement | null, ...body: unknown[]) => h('div', { class: 'node' }, left, h('div', { class: 'body' }, ...(body as HTMLElement[])));
const view = (...kids: unknown[]) => h('div', { class: 'view' }, ...(kids as HTMLElement[]));
const heading = (title: string, note?: string) => h('div', { class: 'vhead' }, h('h2', null, title), note ? h('p', { class: 'muted small' }, note) : null);

// ── dialogue views ──────────────────────────────────────────────────────────

function nodeCard(s: Script, id: string, n: DlgNode): HTMLElement {
  const base = ['scripts', s.id, 'lines', id];
  const en = getAt(st.en[D], base);
  const variants = en && typeof en === 'object' ? Object.keys(en as Json) : null;
  const incoming = Object.entries(s.nodes).filter(([, m]) => m.next === id || m.skip === id || m.choices?.some((c) => c.goto === id || c.fail === id)).map(([k]) => k);
  return h('div', { class: `node ${id === s.start ? 'start' : ''}`, id: `n-${id}` },
    face(n.who, n.mood),
    h('div', { class: 'body' },
      h('div', { class: 'nhead' }, whoBlock(n.who, n.mood, n.variant), h('span', { class: 'spacer' }), chip(id, 'id', 'Node id (the text key)'), id === s.start ? chip('start', 'start') : null),
      n.when ? h('div', { class: 'meta' }, chip(`only if ${cond(n.when)}`, 'when'), n.skip ? ['otherwise →', goTo(n.skip)] : null) : null,
      variants
        ? h('div', { class: 'variants' },
          h('div', { class: 'meta' }, chip('chosen in code', 'when'), h('code', { class: 'src' }, n.pick?.toString() ?? '(no pick: uses "default")')),
          n.vars ? h('div', { class: 'meta' }, chip('placeholders', 'fx'), h('code', { class: 'src' }, n.vars.toString())) : null,
          ...variants.map((v) => field(D, [...base, v], { label: v })))
        : field(D, base),
      n.choices?.length ? h('div', { class: 'choices' }, ...n.choices.map((c, i) => h('div', { class: 'choice' },
        h('span', { class: 'cur' }, '▶'),
        h('div', { class: 'grow' },
          field(D, ['scripts', s.id, 'choices', id, String(i)], { rows: 1 }),
          h('div', { class: 'meta' },
            c.check ? chip(`🎲 ${SKILL_NAMES[c.check.skill]} DC ${c.check.dc}`, 'check') : null,
            c.when ? chip(`only if ${cond(c.when)}`, 'when') : null,
            c.goto ? ['→', goTo(c.goto)] : chip('ends scene'),
            c.fail ? ['· on fail →', goTo(c.fail)] : null,
            ...fxChips(c.fx), ...fxChips(c.failFx)))))) : null,
      h('div', { class: 'meta flow' },
        incoming.length ? ['from', ...incoming.flatMap((k, i) => [i ? ',' : '', goTo(k)]), '·'] : null,
        n.next ? ['next →', goTo(n.next)] : n.end || !n.choices?.length ? chip('end of scene', 'end') : null,
        ...fxChips(n.fx))));
}

function scriptView(s: Script): HTMLElement {
  return view(
    h('div', { class: 'shead' },
      face(s.speaker),
      h('div', { class: 'grow' },
        h('div', { class: 'muted small' }, `${s.where} · ${NPCS[s.speaker]?.name ?? s.speaker}'s scene · id ${s.id}`),
        field(D, ['scripts', s.id, 'title'], { label: 'Button title', rows: 1 }),
        h('div', { class: 'meta' },
          chip(`plays when ${cond(s.when)}`, 'when'),
          s.auto ? chip('auto-plays on arrival') : chip('player starts it'),
          s.repeat ? chip('repeatable') : null,
          s.priority !== undefined ? chip(`priority ${s.priority}`) : null))),
    ...Object.entries(s.nodes).map(([id, n]) => nodeCard(s, id, n)),
    has(D, ['scripts', s.id, 'terms']) ? card(h('div', { class: 'face glyph' }, '🔤'),
      h('b', null, 'Terms'), h('p', { class: 'muted small' }, 'Words the code slots into {placeholders} above.'),
      ...Object.keys(getAt(st.en[D], ['scripts', s.id, 'terms']) as Json).map((k) => field(D, ['scripts', s.id, 'terms', k], { label: k, rows: 1 }))) : null);
}

const STAGES = ['No heads awake', '1 head awake', '2 heads awake', '3 heads awake', '4 heads awake', 'Tiamat awakened', 'Tiamat slain'];

const barksView = (npc: string) => view(
  h('div', { class: 'shead' }, face(npc), h('div', { class: 'grow' }, whoBlock(npc), h('p', { class: 'muted small' }, `A one-line bark the first time you open ${NPCS[npc]?.tab ?? 'their tab'} at each stage of the story.`))),
  ...((getAt(st.en[D], ['barks', npc]) as string[]) ?? []).map((_, i) => card(face(npc), field(D, ['barks', npc, String(i)], { label: STAGES[i] ?? `Stage ${i}` }))));

const headsView = () => view(
  heading('Tiamat\'s heads speak', 'Heard once each on the way home from breaking an echo, in a portrait-less box with the head\'s eye.'),
  ...Object.keys((getAt(st.en[D], ['heads']) as Json) ?? {}).map((b) => card(face(`head:${b}`), whoBlock(`head:${b}`), field(D, ['heads', b]))));

const eulogyView = () => view(
  h('div', { class: 'shead' }, face('maren'), h('div', { class: 'grow' }, whoBlock('maren'), h('p', { class: 'muted small' }, 'Maren\'s bark at the Guild after a hero dies. {name}, {kills}, {clears} (the plural line below) and {cause} (the cause line, or nothing) are filled in by the game.'))),
  card(face('maren'),
    field(D, ['eulogy', 'line'], { label: 'Line' }),
    ...Object.keys((getAt(st.en[D], ['eulogy', 'clears']) as Json) ?? {}).map((k) => field(D, ['eulogy', 'clears', k], { label: `Echoes broken · plural “${k}”`, rows: 1 })),
    field(D, ['eulogy', 'cause'], { label: 'Cause of death', rows: 1 })));

// ── story views ─────────────────────────────────────────────────────────────

const biomeName = (b: string) => (b === 'any' ? 'Any echo' : b === 'town' ? 'The Keep' : BIOMES[b as keyof typeof BIOMES]?.name ?? b);

function outcomeChip(o: Outcome): HTMLElement {
  const { type, ...rest } = o as Outcome & Json;
  const label: Record<string, string> = { gold: '💰 gold', doubloons: '🪙 doubloons', boons: '✦ boon choice', charm: '✦ charm', heal: '❤ heal', damage: '💥 damage', item: '🎁 item', combat: '⚔ fight', quest: '📜 quest', meter: '◐ biome meter', reveal: '🗺 reveal map', key: '🔑 sigil', omen: '✶ omen', die: '🎲 new die', token: '¤ token', resources: '⛺ short rest', condition: '◆ condition', wheel: '🎡 wheel', gamble: '🎲 gamble', sacrifice: '🔥 sacrifice' };
  const extra = Object.keys(rest).length ? ` ${cond(rest)}` : '';
  return chip(`${label[type] ?? type}${extra}`, type === 'quest' || type === 'combat' ? 'fx' : '');
}

function outcomes(e: EventDef, i: number, side: 'success' | 'failure'): HTMLElement | null {
  const list = e.options[i][side];
  if (!list) return null;
  const textIdx = list.map((o, j) => (o.type === 'text' ? j : -1)).filter((j) => j >= 0);
  return h('div', { class: 'outcomes' },
    h('div', { class: 'meta' }, h('b', { class: side === 'success' ? 'ok' : 'bad' }, side === 'success' ? (e.options[i].check ? 'On success' : 'Result') : 'On failure'),
      ...list.filter((o) => o.type !== 'text').map(outcomeChip), list.length ? null : chip('nothing happens')),
    ...textIdx.map((j) => h('div', null,
      field(S, ['events', e.id, 'options', String(i), side, String(j), 't']),
      (list[j] as { leadOpen?: boolean }).leadOpen ? h('div', { class: 'meta' }, chip('+ “the lead is still open” line', 'when', 'See Quest → Shared lines')) : null)));
}

function eventView(e: EventDef): HTMLElement {
  const P = ['events', e.id];
  return view(
    banner(e.scene ?? `events/${e.id}`, e.title),
    h('div', { class: 'meta' }, chip(biomeName(e.biome), 'when'), chip(e.kind), e.quest ? chip('quest room (placed by a lead)', 'fx') : null, chip(`id ${e.id}`, 'id')),
    field(S, [...P, 'title'], { label: 'Room title', rows: 1 }),
    field(S, [...P, 'text'], { label: 'Room description', rows: 3 }),
    ...e.options.map((o, i) => h('div', { class: 'node option' }, h('div', { class: 'face glyph' }, String(i + 1)), h('div', { class: 'body' },
      field(S, [...P, 'options', String(i), 'label'], { label: 'Choice', rows: 1 }),
      h('div', { class: 'meta' },
        o.check ? chip(`🎲 ${o.check.skill ? SKILL_NAMES[o.check.skill] : o.check.ability?.toUpperCase()} DC ${o.check.dc}`, 'check') : chip('no check'),
        o.spell ? chip(`✨ “${o.spell}” spells auto-succeed`, 'when') : null,
        o.cls ? chip(`${o.cls}s auto-succeed`, 'when') : null,
        o.cost ? chip(`costs ${cond(o.cost)}`, 'end') : null),
      ...fields(S, [...P, 'options', String(i)], [['hint', 'Hint', 1]]),
      outcomes(e, i, 'success'), outcomes(e, i, 'failure')))));
}

const chronicleView = () => view(
  heading('The Chronicle', 'Ilvane\'s book in the Keep: one chapter per echo broken. After the awakening, her later notes appear under each chapter in green ink.'),
  ...['prologue', 'cinder', 'rootbound', 'drowned', 'mirror', 'starfall', 'epilogue'].map((id) => h('div', { class: 'node col' },
    banner(`story/${id}`, id),
    h('div', { class: 'body' },
      h('div', { class: 'meta' }, chip(id === 'prologue' || id === 'epilogue' ? id : `unlocks on breaking ${biomeName(id)}`, 'when')),
      ...fields(S, ['chapters', id], [['head', 'Heading', 1], ['title', 'Title', 1]]),
      ...((getAt(st.en[S], ['chapters', id, 'text']) as string[]) ?? []).map((_, i) => field(S, ['chapters', id, 'text', String(i)], { label: `Paragraph ${i + 1}`, rows: 3 })),
      ...((getAt(st.en[S], ['annotations', id]) as string[]) ?? []).map((_, i) => field(S, ['annotations', id, String(i)], { label: `✒ Later note ${i + 1} (after the awakening)` }))))),
  card(h('div', { class: 'face glyph' }, '✒'), h('b', null, 'The Dissent'), h('p', { class: 'muted small' }, 'Shown under the chronicle if the Keeper warned the Keep.'), field(S, ['dissent'])),
  card(h('div', { class: 'face glyph' }, '♪'), h('b', null, 'The Wardens\' Lullaby'), h('p', { class: 'muted small' }, 'Evidence E9, one line per row.'),
    ...((getAt(st.en[S], ['lullaby']) as string[]) ?? []).map((_, i) => field(S, ['lullaby', String(i)], { rows: 1 }))));

const peopleView = () => view(
  heading('People of the Keep', 'Names show in dialogue nameplates; an alias is shown until the Keeper has met them. Descriptions are art subjects and stay in code.'),
  ...Object.values(NPCS).map((n) => card(face(n.id),
    h('div', { class: 'meta' }, chip(`id ${n.id}`, 'id'), n.tab ? chip(`runs the ${n.tab}`) : null),
    ...fields(S, ['npcs', n.id], [['name', 'Name', 1], ['alias', 'Shown as, until met', 1], ['title', 'Title', 1]]),
    h('details', { class: 'who' }, h('summary', null, 'Description'), h('p', null, n.look)))));

const leadsView = () => view(
  heading('Leads', 'Pinned in the Cartographer once a scene or rumour gives them. A lead with a room sends the party to it.'),
  ...Object.values(LEADS).map((l) => card(h('div', { class: 'face glyph' }, '📜'),
    h('div', { class: 'meta' }, chip(`id ${l.id}`, 'id'), chip(biomeName(l.biome), 'when'), l.eventId ? ['room:', open(`event:${l.eventId}`, EVENTS[l.eventId]?.title ?? l.eventId)] : null, l.timed ? chip(`fails after ${l.timed} runs`, 'end') : null),
    ...fields(S, ['leads', l.id], [['title', 'Title', 1], ['brief', 'Brief']]))));

const evidenceView = () => view(
  heading('Evidence', 'Collected in the Codex. “After” is the later note shown once the awakening reveals what it meant.'),
  ...Object.values(EVIDENCE).map((e) => card(pic(e.art, e.name, '🔎'),
    h('div', { class: 'meta' }, chip(`id ${e.id}`, 'id')),
    ...fields(S, ['evidence', e.id], [['name', 'Name', 1], ['text', 'Text'], ['after', 'After the awakening']]),
    h('details', { class: 'who' }, h('summary', null, 'Description'), h('p', null, e.look)))));

const rumorsView = () => view(
  heading('Rumours', 'Overheard in the Low Lantern. Each source has a bias the player can learn.'),
  ...Object.entries(SOURCES).map(([id, s]) => card(h('div', { class: 'face glyph' }, s.icon),
    h('div', { class: 'meta' }, chip(`source ${id}`, 'id')),
    ...fields(S, ['rumorSources', id], [['name', 'Who', 1], ['bias', 'Their bias', 1]]))),
  ...RUMORS.map((r) => card(h('div', { class: 'face glyph' }, SOURCES[r.source]?.icon ?? '?'),
    h('div', { class: 'meta' }, chip(`id ${r.id}`, 'id'), h('b', null, SOURCES[r.source]?.name ?? r.source), chip(r.kind), chip(`heard when ${cond(r.when)}`, 'when'), ...fxChips(r.fx)),
    field(S, ['rumors', r.id, 'text']))));

const drinksView = () => view(
  heading('Drinks', 'Bet\'s menu. The effect line is the rules text; the line is what Bet says as she pours.'),
  ...Object.values(DRINKS).map((d) => card(pic(`drinks/${d.id}`, d.name, '🍺'),
    h('div', { class: 'meta' }, chip(`id ${d.id}`, 'id'), chip(`${d.price} gold`), d.soft ? chip('soft drink') : null, d.rationed ? chip('rationed after the awakening') : null, d.when ? chip(`on the menu when ${cond(d.when)}`, 'when') : null),
    ...fields(S, ['drinks', d.id], [['name', 'Name', 1], ['text', 'Effect'], ['line', 'Bet says']]))));

const musterView = () => view(
  heading('The Muster', 'After the awakening the Keep prepares along three tracks. “Needs” shows while a task is locked.'),
  ...Object.keys(TRACKS).map((t) => h('div', { class: 'col gap' },
    card(h('div', { class: 'face glyph' }, '⚑'), h('div', { class: 'meta' }, chip(`track ${t}`, 'id')), ...fields(S, ['tracks', t], [['name', 'Track', 1], ['boon', 'Reward when complete'], ['cost', 'Cost']])),
    ...MUSTER.filter((m) => m.track === t).map((m) => h('div', { class: 'node sub' }, h('div', { class: 'face glyph' }, '☐'), h('div', { class: 'body' },
      h('div', { class: 'meta' }, chip(`id ${m.id}`, 'id'),
        m.lead ? ['room:', open(`event:${LEADS[m.lead]?.eventId}`, EVENTS[LEADS[m.lead]?.eventId ?? '']?.title ?? m.lead)] : null,
        m.scene ? ['scene:', open(`script:${m.scene}`, m.scene)] : null,
        m.gold ? chip(`${m.gold} gold`) : null, m.when ? chip(`open when ${cond(m.when)}`, 'when') : null),
      ...fields(S, ['muster', m.id], [['title', 'Task', 1], ['text', 'Description'], ['need', 'Needs (while locked)']])))))));

const worldView = () => view(
  heading('Heads, doors and the finale'),
  ...Object.keys((getAt(st.en[S], ['heads']) as Json) ?? {}).map((b) => card(face(`head:${b}`),
    h('div', { class: 'meta' }, chip(`feeds ${biomeName(b)}`, 'when')),
    ...fields(S, ['heads', b], [['name', 'Name', 1], ['breath', 'Breath', 1]]))),
  card(h('div', { class: 'face glyph' }, '🚪'), h('b', null, 'Doors'), h('p', { class: 'muted small' }, 'Each echo\'s door, in order; “Door” is the fallback.'),
    ...((getAt(st.en[S], ['doors']) as string[]) ?? []).map((_, i) => field(S, ['doors', String(i)], { label: biomeName(['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'][i]), rows: 1 })),
    field(S, ['door'], { label: 'Fallback', rows: 1 })),
  card(h('div', { class: 'face glyph' }, '🐉'), h('b', null, 'The finale'),
    ...fields(S, ['finale'], [['name', 'Name', 1], ['tagline', 'Tagline', 1], ['premise', 'Premise', 3], ['bossRoom', 'Boss room', 1], ['bossText', 'Boss room text']])),
  card(h('div', { class: 'face glyph' }, '🔁'), h('b', null, 'Shared lines'), field(S, ['leadOpen'], { label: 'Appended to a failed quest check' })));

// ── game data views (generic) ───────────────────────────────────────────────

const pretty = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/** A label for a string's path inside a record: numeric steps show the live element's id when it has one. */
function labelFor(rel: Path, live: unknown): string {
  const out: string[] = [];
  let cur = live;
  for (const k of rel) {
    const next = cur && typeof cur === 'object' ? (cur as Json)[k] : undefined;
    const id = next && typeof next === 'object' ? (next as Json).id : undefined;
    const parent = out.length ? rel[out.length - 1] : '';
    out.push(!/^\d+$/.test(k) ? pretty(k) : typeof id === 'string' ? id : parent === 'features' ? `Level ${k}` : Array.isArray(cur) ? `#${Number(k) + 1}` : k);
    cur = next;
  }
  return out.join(' › ');
}

interface Rec { id: string; face?: HTMLElement | null; chips?: (HTMLElement | string | null)[]; look?: string; live?: unknown }

/** Every string English has under ns/path/<id>, labelled, with the record's context. */
const recordCard = (ns: Ns, path: Path, r: Rec) => {
  const base = [...path, r.id];
  const longText = (p: Path) => { const v = getAt(st.en[ns], p); return typeof v === 'string' && v.length > 90 ? 3 : v && String(v).length > 40 ? 2 : 1; };
  return card(r.face ?? null,
    h('div', { class: 'meta' }, chip(`id ${r.id}`, 'id'), ...(r.chips ?? []).map((c) => (typeof c === 'string' ? chip(c) : c))),
    ...leaves(getAt(st.en[ns], base), base).map((p) => field(ns, p, { label: labelFor(p.slice(base.length), r.live), rows: longText(p) })),
    r.look ? h('details', { class: 'who' }, h('summary', null, 'Description (art subject)'), h('p', null, r.look)) : null);
};

const recordsView = (title: string, note: string, ns: Ns, path: Path, recs: Rec[]) => view(heading(title, note), ...recs.map((r) => recordCard(ns, path, r)));

/** All ids under a path, as plain records (for tables with no extra context). */
const plain = (ns: Ns, path: Path, live?: Record<string, unknown>): Rec[] =>
  Object.keys((getAt(st.en[ns], path) as Json) ?? {}).map((id) => ({ id, live: live?.[id] }));

const ITEM_KINDS: Record<string, string> = { weapon: 'Weapons', armor: 'Armor', shield: 'Armor', trinket: 'Trinkets', consumable: 'Consumables' };
const itemGroup = (id: string) => (ITEMS[id]?.legend ? 'Legendaries' : ITEM_KINDS[ITEMS[id]?.kind ?? ''] ?? 'Other');

function gameView(kind: string, id: string): HTMLElement {
  switch (kind) {
    case 'biome': {
      const b = BIOMES[id as keyof typeof BIOMES];
      return recordsView(b?.name ?? id, 'The echo\'s name and pitch, its meter, and the word lists rooms are dressed from: room names by room type, then flavour lines. Room text is assembled from one atmosphere line, maybe a detail, and the tag notes.', G, ['biomes'],
        [{ id, face: pic(`story/${id}`, id, '🗺'), chips: [chip(`${b?.meter.icon} meter max ${b?.meter.max}`)], live: b }]);
    }
    case 'items': return recordsView(`Items · ${id}`, 'Names, rules text and, for legendaries, their lore. Affix names attach to these (see Format → item name).', G, ['items'],
      Object.values(ITEMS).filter((i) => itemGroup(i.id) === id).map((i) => ({ id: i.id, face: pic(i.art, i.name, '🎒'), chips: [i.rarity, `${i.price} gold`, i.weapon ? `${i.weapon.dice} ${i.weapon.type}` : null, i.armor ? `AC ${i.armor.base}` : null], look: i.legend?.look, live: i })));
    case 'monsters': return recordsView(`Monsters · ${biomeName(id)}`, 'Names, flavour, action names and boss titles. Tier titles (“Veteran …”) are in Format.', G, ['monsters'],
      Object.values(MONSTERS).filter((m) => m.biome === id).map((m) => ({ id: m.id, face: pic(`monsters/${m.biome}_${m.id}`, m.name, '👹'), chips: [m.role, m.rank, m.boss ? 'boss' : null, m.finale ? 'finale' : null], look: m.look, live: m })));
    case 'spells': return recordsView(Number(id) ? `Spells · level ${id}` : 'Spells · cantrips', 'Spell names and the rules text on the spell button.', G, ['spells'],
      Object.values(SPELLS).filter((sp) => String(sp.level) === id).map((sp) => ({ id: sp.id, chips: [sp.school, sp.classes.join(', '), sp.cost], live: sp })));
    case 'class': {
      const c = CLASSES[id as keyof typeof CLASSES];
      return recordsView(c?.name ?? id, 'Name, pitch, subclass, Fortune talent, resources and features by level. Features every class shares (Ability Score Improvement, Extra Attack…) are under Game · tables → Shared class features.', G, ['classes'],
        [{ id, face: pic(`heroes/${id}_1`, id, '⚔'), chips: [`d${c?.hitDie}`, c?.caster ? `${c.caster.kind} caster` : 'martial', MATERIALS[c?.material]?.name ?? null], live: c }]);
    }
    case 'charms': return recordsView(`Charms · ${id}`, '{n} is a charm\'s live counter; omens fill {hand}, {chips} and {mult}.', G, ['charms'],
      Object.values(CHARM_BY_ID).filter((c) => (c.theme === 'omen' ? 'omens' : c.rarity) === id).map((c) => ({ id: c.id, face: pic(`charms/${c.id}`, c.name, c.theme === 'omen' ? '✶' : '✦'), chips: [c.theme], live: c })));
    case 'table': {
      const [label, path] = GAME_TABLES[id];
      return recordsView(label, '', G, path, plain(G, path));
    }
  }
  return h('p', null, 'Unknown entry.');
}

/** Smaller game tables, one sidebar entry each: key → [label, path]. */
const GAME_TABLES: Record<string, [string, Path]> = {
  affixes: ['Item affixes', ['affixes']],
  monsterTraits: ['Monster traits', ['monsterTraits']],
  classFeatures: ['Shared class features', ['classFeatures']],
  fightingStyles: ['Fighting styles', ['fightingStyles']],
  metamagic: ['Metamagic', ['metamagic']],
  invocations: ['Invocations', ['invocations']],
  feats: ['Feats', ['feats']],
  epicBoons: ['Epic boons', ['epicBoons']],
  species: ['Species', ['species']],
  backgrounds: ['Backgrounds', ['backgrounds']],
  skillTricks: ['Skill tricks', ['skillTricks']],
  materials: ['Dice materials', ['materials']],
  faceMods: ['Face mods', ['faceMods']],
  faceEnchants: ['Face enchant offers', ['faceEnchants']],
  specialDice: ['Special dice', ['specialDice']],
  dieTraits: ['Die traits', ['dieTraits']],
  hands: ['Hands', ['hands']],
  curses: ['Boss curses', ['curses']],
  tokens: ['Tokens', ['tokens']],
  upgrades: ['Upgrades', ['upgrades']],
  facilities: ['Keep facilities', ['facilities']],
  tutorialRooms: ['Tutorial rooms', ['tutorialRooms']],
};

/** Whole-object tables of loose strings (names lists, formats): one card per top-level key. */
const LOOSE: Record<string, [string, string, Path[]]> = {
  names: ['Names and orders', 'Skill and ability names, cleric and druid orders, difficulty descriptions.', [['skills'], ['abilities'], ['divineOrders'], ['primalOrders'], ['difficulties']]],
  format: ['Formats', '{placeholders} are filled by the game. Word order is yours: “{prefix} {name}{plus} {suffix}” builds item names.', [['format'], ['tierNames'], ['themes'], ['genericActions']]],
};
const looseView = (key: string) => {
  const [title, note, paths] = LOOSE[key];
  return view(heading(title, note), ...paths.map((p) => card(h('div', { class: 'face glyph' }, '¶'), h('b', null, pretty(p[0])),
    ...leaves(getAt(st.en[G], p), p).map((q) => field(G, q, { label: labelFor(q.slice(p.length), undefined) || pretty(p[0]), rows: 1 })))));
};

// ── layout ──────────────────────────────────────────────────────────────────

interface Entry { key: string; label: string; sub: string; parts: [Ns, Path][]; search: string }

const words = (parts: [Ns, Path][]) => parts.map(([ns, p]) => `${JSON.stringify(getAt(st.en[ns], p) ?? '')} ${JSON.stringify(getAt(st.work[ns], p) ?? '')}`).join(' ');

function entries(): { group: string; items: Entry[] }[] {
  const groups = new Map<string, Entry[]>();
  const add = (g: string, key: string, label: string, sub: string, parts: [Ns, Path][], extra = '') =>
    groups.set(g, [...(groups.get(g) ?? []), { key, label, sub, parts, search: `${key} ${label} ${sub} ${extra} ${words(parts)}` }]);
  const title = (ns: Ns, p: Path, fallback: string) => String(getAt(st.work[ns], p) || getAt(st.en[ns], p) || fallback);
  for (const s of SCRIPTS) add(`Dialogue · ${s.where}`, `script:${s.id}`, title(D, ['scripts', s.id, 'title'], s.id), NPCS[s.speaker]?.name ?? s.speaker, [[D, ['scripts', s.id]]], s.where);
  for (const npc of Object.keys((getAt(st.en[D], ['barks']) as Json) ?? {})) add('Dialogue · barks', `barks:${npc}`, NPCS[npc]?.name ?? npc, NPCS[npc]?.title ?? '', [[D, ['barks', npc]]]);
  add('Dialogue · other', 'heads', 'Tiamat\'s heads', '5 lines', [[D, ['heads']]]);
  add('Dialogue · other', 'eulogy', 'Fallen hero eulogy', 'Maren', [[D, ['eulogy']]]);
  const evs = Object.values(EVENTS);
  for (const e of evs.filter((x) => x.quest)) add('Events · quest rooms', `event:${e.id}`, title(S, ['events', e.id, 'title'], e.id), biomeName(e.biome), [[S, ['events', e.id]]]);
  for (const e of evs.filter((x) => !x.quest)) add(`Events · ${biomeName(e.biome)}`, `event:${e.id}`, title(S, ['events', e.id, 'title'], e.id), e.kind, [[S, ['events', e.id]]]);
  add('Story', 'chronicle', 'The Chronicle', 'Chapters, notes, lullaby', [[S, ['chapters']], [S, ['annotations']], [S, ['lullaby']], [S, ['dissent']]]);
  add('Story', 'people', 'People', 'Names and titles', [[S, ['npcs']]]);
  add('Story', 'world', 'Heads, doors, finale', 'Tiamat', [[S, ['heads']], [S, ['doors']], [S, ['door']], [S, ['finale']], [S, ['leadOpen']]]);
  add('Quest', 'leads', 'Leads', `${Object.keys(LEADS).length} leads`, [[S, ['leads']]]);
  add('Quest', 'evidence', 'Evidence', `${Object.keys(EVIDENCE).length} pieces`, [[S, ['evidence']]]);
  add('Quest', 'rumors', 'Rumours', `${RUMORS.length} rumours`, [[S, ['rumorSources']], [S, ['rumors']]]);
  add('Quest', 'drinks', 'Drinks', 'The Low Lantern', [[S, ['drinks']]]);
  add('Quest', 'muster', 'The Muster', 'Tracks and tasks', [[S, ['tracks']], [S, ['muster']]]);
  for (const b of Object.keys(BIOMES)) add('Game · echoes', `biome:${b}`, BIOMES[b as keyof typeof BIOMES].name, 'Rooms, meter, flavour', [[G, ['biomes', b]]]);
  for (const grp of ['Weapons', 'Armor', 'Trinkets', 'Consumables', 'Legendaries']) {
    const ids = Object.keys(ITEMS).filter((i) => itemGroup(i) === grp);
    add('Game · items', `items:${grp}`, grp, `${ids.length} items`, ids.map((i) => [G, ['items', i]] as [Ns, Path]));
  }
  for (const b of [...new Set(Object.values(MONSTERS).map((m) => m.biome))]) {
    const ids = Object.values(MONSTERS).filter((m) => m.biome === b).map((m) => m.id);
    add('Game · monsters', `monsters:${b}`, biomeName(b), `${ids.length} monsters`, ids.map((i) => [G, ['monsters', i]] as [Ns, Path]), ids.join(' '));
  }
  for (let l = 0; l <= 9; l++) {
    const ids = Object.values(SPELLS).filter((sp) => sp.level === l).map((sp) => sp.id);
    if (ids.length) add('Game · spells', `spells:${l}`, l ? `Level ${l}` : 'Cantrips', `${ids.length} spells`, ids.map((i) => [G, ['spells', i]] as [Ns, Path]));
  }
  for (const c of Object.values(CLASSES)) add('Game · classes', `class:${c.id}`, c.name, 'Features, talent, resources', [[G, ['classes', c.id]]]);
  for (const grp of ['common', 'uncommon', 'rare', 'legendary', 'omens']) {
    const ids = Object.values(CHARM_BY_ID).filter((c) => (c.theme === 'omen' ? 'omens' : c.rarity) === grp).map((c) => c.id);
    add('Game · charms', `charms:${grp}`, pretty(grp), `${ids.length} charms`, ids.map((i) => [G, ['charms', i]] as [Ns, Path]));
  }
  for (const [k, [label, path]] of Object.entries(GAME_TABLES)) add('Game · tables', `table:${k}`, label, path.join('.'), [[G, path]]);
  for (const [k, [title, , paths]] of Object.entries(LOOSE)) add('Game · tables', `loose:${k}`, title, '', paths.map((p) => [G, p] as [Ns, Path]));
  const q = st.q.trim().toLowerCase();
  return [...groups.entries()].map(([group, items]) => ({ group, items: q ? items.filter((e) => e.search.toLowerCase().includes(q)) : items })).filter((g) => g.items.length);
}

const side = h('aside', { class: 'side' });
const main = h('main', { class: 'main' });
const bar = h('header', { class: 'bar' });

function select(key: string) {
  st.sel = key;
  try { history.replaceState(null, '', `#${encodeURIComponent(key)}`); } catch { /* ignore */ }
  renderSide();
  renderMain();
  main.scrollTop = 0;
}

function renderSide() {
  const list = h('nav', null, ...entries().map(({ group, items }) => h('div', { class: 'group' },
    h('div', { class: 'gname' }, group),
    ...items.map((e) => {
      const [done, total] = st.lang === 'en' ? [0, 0] : progress(e.parts);
      return h('button', { class: `item ${st.sel === e.key ? 'on' : ''}`, on: { click: () => select(e.key) } },
        h('span', { class: 'grow' }, h('span', { class: 'ilabel' }, e.label), h('span', { class: 'isub' }, e.sub)),
        st.lang !== 'en' ? h('span', { class: `badge ${done === total ? 'done' : ''}` }, `${done}/${total}`) : null);
    }))));
  const old = side.querySelector('nav');
  if (old) side.replaceChild(list, old); else side.append(list);
}

const VIEWS: Record<string, () => HTMLElement> = {
  heads: headsView, eulogy: eulogyView, chronicle: chronicleView, people: peopleView, world: worldView,
  leads: leadsView, evidence: evidenceView, rumors: rumorsView, drinks: drinksView, muster: musterView,
};

function renderMain() {
  clear(main);
  const [kind, id] = st.sel.split(/:(.*)/s);
  const s = kind === 'script' ? SCRIPTS.find((x) => x.id === id) : undefined;
  const e = kind === 'event' ? EVENTS[id] : undefined;
  const gameKinds = ['biome', 'items', 'monsters', 'spells', 'class', 'charms', 'table'];
  main.append(s ? scriptView(s) : e ? eventView(e) : kind === 'barks' ? barksView(id) : gameKinds.includes(kind) ? gameView(kind, id) : kind === 'loose' ? looseView(id) : VIEWS[kind]?.() ?? h('p', null, 'Pick something on the left.'));
}

function renderBar() {
  clear(bar);
  const dirty = dirtyNs();
  const [done, total] = st.lang === 'en' ? [0, 0] : progress(NAMESPACES.map((ns) => [ns, []]));
  const sel = h('select', { on: { change: async (e: Event) => {
    const t = e.target as HTMLSelectElement;
    let lang = t.value;
    if (lang === '+') {
      lang = (prompt('Language code (BCP 47), e.g. fr, de, es, pt-BR, ja') ?? '').trim();
      if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(lang)) { t.value = st.lang; return; }
    }
    if (dirtyNs().length && !confirm('Discard unsaved changes?')) { t.value = st.lang; return; }
    await loadLang(lang);
    renderAll();
  } } },
  ...[...new Set([...Object.keys(st.langs), st.lang])].sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b))).map((l) => h('option', { value: l, selected: l === st.lang }, l === 'en' ? 'en (source)' : l)),
  h('option', { value: '+' }, '+ New language…'));
  bar.append(
    h('b', null, 'Text editor'),
    sel,
    st.lang !== 'en' ? h('span', { class: 'muted' }, `${done}/${total} translated`) : h('span', { class: 'muted' }, 'Markup: | pause · {keeper} · {hero} · {best:skill}'),
    h('span', { class: 'spacer' }),
    h('span', { class: st.error ? 'err' : 'muted' }, dirty.length ? `Unsaved: ${dirty.map((ns) => `${st.lang}/${ns}.json`).join(', ')}` : st.status),
    h('button', { class: `save ${dirty.length ? 'dirty' : ''}`, disabled: !dirty.length, on: { click: () => void save() } }, 'Save'));
}

function renderAll() {
  clear(root);
  clear(side);
  side.append(h('input', { type: 'search', placeholder: 'Search text, speaker, id…', value: st.q, on: { input: (e: Event) => { st.q = (e.target as HTMLInputElement).value; renderSide(); } } }));
  renderSide();
  renderMain();
  renderBar();
  root.append(bar, h('div', { class: 'cols' }, side, main));
  side.querySelector('.item.on')?.scrollIntoView({ block: 'center' });
}

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (dirtyNs().length) void save(); }
});
window.addEventListener('beforeunload', (e) => { if (dirtyNs().length) e.preventDefault(); });

async function boot() {
  root.textContent = 'Loading…';
  try {
    const [{ langs }] = await Promise.all([api(''), loadManifest()]);
    st.langs = langs;
    for (const ns of NAMESPACES) st.en[ns] = await api(`/en/${ns}`);
    const want = new URLSearchParams(location.search).get('lang');
    await loadLang(want && langs[want] ? want : 'en');
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash) st.sel = hash;
    renderAll();
  } catch (e) {
    root.textContent = `The editor needs the dev server (npm run text). ${(e as Error).message}`;
  }
}
void boot();
