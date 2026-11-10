import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../src/content/dialogue.ts';
import { lineText, choiceLabel, scriptTitle } from '../src/i18n/dialogue.ts';
import { newGame } from '../src/meta/town.ts';
import en from '../src/locales/en/dialogue.json';
import story from '../src/locales/en/story.json';
import { EVENTS } from '../src/content/events.ts';
import { CHAPTERS, PROLOGUE, EPILOGUE, HEADS, FINALE } from '../src/content/story.ts';
import { EVIDENCE, DRINKS, LEADS, SOURCES, RUMORS, MUSTER, TRACKS, LULLABY } from '../src/content/quest.ts';
import { NPCS } from '../src/content/npcs.ts';
import game from '../src/locales/en/game.json';
import { ITEMS, AFFIXES, itemName } from '../src/content/items.ts';
import { MONSTERS } from '../src/content/monsters.ts';
import { SPELLS } from '../src/content/spells.ts';
import { CLASSES } from '../src/content/classes.ts';
import { BIOMES } from '../src/content/biomes.ts';
import { CHARM_BY_ID, charmText } from '../src/fortune/charms.ts';
import { HANDS } from '../src/fortune/hands.ts';
import { generateDungeon } from '../src/dungeon/generator.ts';
import { buildTutorialMap } from '../src/dungeon/tutorial.ts';
import { roomName, roomText, themeText } from '../src/dungeon/roomText.ts';
import { dispatch } from '../src/app/commands.ts';
import { Rng, seedState } from '../src/engine/rng.ts';
import { setCatalog, setLocale } from '../src/i18n/index.ts';

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

describe('story text', () => {
  const ids = (o: object) => Object.keys(o).sort();
  it('every event, option and text outcome has words, and no words point at missing content', () => {
    expect(ids(story.events)).toEqual(ids(EVENTS));
    for (const e of Object.values(EVENTS)) {
      expect(e.title, `${e.id} title`).toBeTruthy();
      expect(e.text, `${e.id} text`).toBeTruthy();
      e.options.forEach((o, i) => {
        expect(o.label, `${e.id} option ${i}`).toBeTruthy();
        for (const x of [...o.success, ...(o.failure ?? [])]) if (x.type === 'text') expect(x.t, `${e.id} option ${i} text outcome`).toBeTruthy();
      });
      // Every outcome the JSON speaks for is a text outcome in code.
      const opts = (story.events as unknown as Record<string, { options: Record<string, unknown>[] }>)[e.id].options;
      opts.forEach((o, i) => {
        for (const side of ['success', 'failure'] as const) {
          for (const j of Object.keys((o[side] as object) ?? {})) expect(e.options[i]?.[side]?.[Number(j)]?.type, `${e.id} option ${i} ${side}[${j}]`).toBe('text');
        }
      });
    }
  });
  it('every story table has its words', () => {
    for (const c of [PROLOGUE, EPILOGUE, ...Object.values(CHAPTERS)]) { expect(c.title).toBeTruthy(); expect(c.text.length).toBeGreaterThan(0); }
    for (const x of Object.values(HEADS)) expect(x.name && x.breath).toBeTruthy();
    expect(FINALE.name && FINALE.bossText).toBeTruthy();
    expect(LULLABY.length).toBe(10);
    expect(ids(story.npcs)).toEqual(ids(NPCS));
    for (const n of Object.values(NPCS)) expect(n.name && n.title, n.id).toBeTruthy();
    expect(ids(story.evidence)).toEqual(ids(EVIDENCE));
    for (const e of Object.values(EVIDENCE)) expect(e.name && e.text, e.id).toBeTruthy();
    expect(ids(story.drinks)).toEqual(ids(DRINKS));
    for (const d of Object.values(DRINKS)) expect(d.name && d.text && d.line, d.id).toBeTruthy();
    expect(ids(story.leads)).toEqual(ids(LEADS));
    for (const l of Object.values(LEADS)) expect(l.title && l.brief, l.id).toBeTruthy();
    expect(ids(story.rumorSources)).toEqual(ids(SOURCES));
    expect(ids(story.rumors)).toEqual(RUMORS.map((r) => r.id).sort());
    for (const r of RUMORS) expect(r.text, r.id).toBeTruthy();
    expect(ids(story.muster)).toEqual(MUSTER.map((m) => m.id).sort());
    for (const m of MUSTER) expect(m.title && m.text, m.id).toBeTruthy();
    for (const t of Object.values(TRACKS)) expect(t.name && t.boon && t.cost).toBeTruthy();
  });
});

describe('game data text', () => {
  const ids = (o: object) => Object.keys(o).sort();
  it('every item, monster, spell, class, charm and hand has its words, and nothing in game.json is orphaned', () => {
    for (const [name, table] of [['items', ITEMS], ['affixes', AFFIXES], ['monsters', MONSTERS], ['spells', SPELLS], ['classes', CLASSES], ['biomes', BIOMES]] as const) {
      expect(ids((game as Record<string, object>)[name]), name).toEqual(ids(table));
    }
    for (const i of Object.values(ITEMS)) expect(i.name, i.id).toBeTruthy();
    for (const m of Object.values(MONSTERS)) {
      expect(m.name && m.flavor, m.id).toBeTruthy();
      for (const a of [...m.actions, ...(m.heroic ?? []), ...(m.mythic ?? [])]) expect(a.name, `${m.id}/${a.id}`).toBeTruthy();
      if (m.boss) expect(m.boss.title && m.boss.intro, m.id).toBeTruthy();
    }
    for (const sp of Object.values(SPELLS)) expect(sp.name && sp.text, sp.id).toBeTruthy();
    for (const c of Object.values(CLASSES)) {
      expect(c.name && c.summary && c.subclass.name && c.fortuneTalent.name, c.id).toBeTruthy();
      for (const r of c.resources) expect(r.name, `${c.id}/${r.id}`).toBeTruthy();
      for (const list of Object.values(c.features)) for (const f of list) expect(f.name && f.text, `${c.id}/${f.id}`).toBeTruthy();
    }
    for (const c of Object.values(CHARM_BY_ID)) { expect(c.name, c.id).toBeTruthy(); expect(charmText(c), c.id).not.toMatch(/\{\w+\}/); }
    for (const h of HANDS) expect(h.name && h.blurb, h.id).toBeTruthy();
    const affs = Object.keys(AFFIXES);
    expect(itemName({ uid: 'x', defId: 'dagger', plus: 1, affixes: [affs.find((a) => AFFIXES[a].prefix)!, affs.find((a) => !AFFIXES[a].prefix)!], qty: 2 } as never)).toBe('Flaming Dagger +1 of Warding ×2');
  });

  it('generated rooms and run themes keep refs that resolve, and follow a language switch', () => {
    const map = generateDungeon(new Rng(seedState('refs')), { seed: 'refs', biome: 'cinder', level: 3, difficulty: 'standard' });
    for (const r of [...Object.values(map.rooms), ...Object.values(buildTutorialMap().rooms)]) {
      expect(r.nameRef, r.key).toBeTruthy();
      expect(roomName(r)).toBe(r.name);
      expect(roomText(r)).toBe(r.text);
    }
    const g = newGame(1, 'legacy', 'REFS');
    dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'cinder', difficulty: 'standard', seed: 'refs' });
    const exp = g.expedition!;
    for (const k of ['name', 'anomaly', 'faction', 'objective', 'boss', 'hook'] as const) expect(themeText(exp, k)).toBe(exp.theme[k]);
    // A made-up language that only renames the Cinder Vaults' combat rooms.
    const combat = Object.values(map.rooms).find((r) => r.type === 'combat')!;
    setCatalog('xx', 'game', { biomes: { cinder: { name: 'Les Caves', rooms: { combat: ['Salle', 'Salle', 'Salle', 'Salle'] } } } });
    return setLocale('xx').then(() => {
      expect(roomName(combat)).toBe('Salle');
      expect(themeText(exp, 'name')).toBe('Les Caves');
      expect(roomText(combat)).toBe(combat.text); // untranslated lines fall back to English
      return setLocale('en');
    });
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
