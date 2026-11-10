# Text and localisation

All player-facing words are moving out of code into `src/locales/<lang>/<namespace>.json`.
English (`en`) is the source language: it is bundled with the game and is the fallback for
anything a translation hasn't covered. Other languages load on demand.

## Editing text

```
npm run text        # standalone editor at http://localhost:5180 (opens in your browser)
```

It is its own app (`text-editor/vite.config.ts`), separate from the game's dev server, so you
never have to play to reach a line. Tabs along the top split the text by kind; the sidebar lists
every entry in that tab. The editor covers:

- **Dialogue** (`dialogue.json`): every scene by place, keeper barks, Tiamat's heads, the
  eulogy. Each line shows the speaker's portrait for that mood, their description, when the
  line plays, where choices lead, the d20 checks and effects.
- **Events** (`story.json`): every room event with its scene art, checks, spells that
  auto-succeed, costs and outcomes.
- **Story and quest** (`story.json`): the Chronicle (chapters, later notes, lullaby), people,
  heads, doors and the finale, leads, evidence, rumours, drinks and the Muster.
- **Game data** (`game.json`): echoes (names, meters, room-name lists, flavour lines), items
  and affixes, monsters and their actions, spells, classes and their features, feats and other
  class options, species, backgrounds, skills, dice, hands, curses, charms and omens, tokens,
  facilities, the tutorial rooms, and the formats that assemble names (“Veteran {name}”,
  “{prefix} {name}{plus} {suffix}”). `terms` holds small vocabularies shown by id: condition
  names, damage types, weapon properties and masteries, armor types, item kinds, ancestry.
- **Interface** (`ui.json`): every button, label, tooltip, toast, journal and combat-log line,
  and the tutorial, one section per source file. Each string shows its key, the file and line
  that uses it and the code around it (from src/dev/ui-context.json).

Edit, then **Save** (⌘S): the JSON on disk changes, an open game tab (`npm run dev`) swaps the
new text in without reloading, and the editor keeps your place. Commit the file as usual. Link
straight to an entry with its id: `localhost:5180/#event:q_stalledCart`, `#evidence`,
`#script:bet.intro`.

### Reviewing for slop

- **Step through everything:** `j`/`k` (or Alt+↓/↑ while typing) move to the next/previous
  entry, across tabs. `/` focuses search; search covers all tabs at once.
- **Mark reviewed:** ⌘↵ marks the entry reviewed and moves on. Marks are saved to
  `text-editor/review.json` with a hash of the entry's text: edit it later and it shows ● (changed
  since review) instead of ✓. The top bar and each tab count what's reviewed.
- **Flagged phrases:** anything matching `text-editor/slop-phrases.json` (em dashes, “tapestry”,
  “not just X but Y”, “a sense of”…) is highlighted in place, with a chip under the box (click it
  to select the phrase). The sidebar shows ⚑ counts; the **⚑ Flagged** filter lists only entries
  with hits, **To review** only those not yet marked. Edit the JSON to tune the list: each entry
  is a case-insensitive regex and a reason.

The editor only exists as a dev server (`scripts/vite-locales.ts`, `scripts/vite-review.ts`,
`apply: 'serve'`); it is not in the production build.

## Choosing a language

Players pick a language from the 🌐 menu on the title screen or in How to Play. The choice is
saved per device (localStorage); a first visit picks the best match for the browser's
languages. `?lang=fr` overrides it for a session. The menu lists every language that has a
folder in src/locales, by its own name (“Français”).

## Translating

Pick **+ New language…** in the editor and enter a code (`fr`, `de`, `pt-BR`…). English shows
above every box; anything left empty falls back to English in game. The sidebar counts what is
done. Preview in game with `?lang=fr`.

`tests/i18n.test.ts` fails if a translation has keys English doesn't, or drops or renames a
`{placeholder}`.

## How dialogue is keyed

Scripts in `src/content/dialogue/*.ts` hold structure only (who, mood, flow, conditions,
effects). Their words live at:

| What | Key in `dialogue.json` |
| --- | --- |
| Scene button title | `scripts.<scriptId>.title` |
| A line | `scripts.<scriptId>.lines.<nodeId>` |
| Choice labels | `scripts.<scriptId>.choices.<nodeId>[i]` |
| Words code slots into a line | `scripts.<scriptId>.terms.<key>` |

`chain('a', [...])` numbers its nodes `a0, a1, …`, so **inserting or reordering lines in a
chain shifts the keys after it**. Add the new node, then move its text into place in the JSON;
the i18n test points at anything that no longer lines up.

A line that depends on game state is an object of named variants. The node's `pick(g)` returns
the variant name (falling back to `default`), and `vars(g, { term, list })` fills placeholders,
e.g. the names of the fallen. Plurals use `Intl.PluralRules` categories (`one`, `few`,
`many`, `other`…) via `plural()` in `src/i18n/index.ts`.

Markup inside lines: `|` is a beat pause, `{keeper}`, `{hero}` and `{best:<skill>}` are
filled in by the dialogue box.

## How content tables get their words

Tables like `EVENTS`, `LEADS` and `NPCS` keep ids, rules and art in code and are declared
without their text (`Textless<T, K>`). `textTable(ns, path, data)` / `bindText` then give each
record live getters that read the current language, so code keeps writing `ev.title` or
`lead.brief`. The JSON mirrors the table's shape and holds only strings; for events, text
outcomes sit at `events.<id>.options[i].success.<j>.t`.

Art subjects (`look`, `moods`) stay in code: they describe pictures, not player text.

## Saved runs

Generated rooms and an expedition's theme store *references* to their words
(`room.nameRef`, `room.textRefs`, `exp.themeRefs`, e.g. `game:biomes/cinder/rooms/combat/2`)
next to the English they were made with. Show them with `roomName`, `roomText` and
`themeText` (src/dungeon/roomText.ts), which resolve the refs in the current language and fall
back to the stored English for saves from before localisation. The journal log is history: it
keeps the language it was written in.

## Writing UI code

- `tx('town.buy')`, `tx('town.facilityLevel', { level })`: a ui.json string.
- `txn('tavern.expeditionLeft', n)`: a plural. The entry is `{ "one": "…{n}…", "other": "…{n}…" }`
  (add `few`, `many`… per Intl.PluralRules in languages that need them).
- `h('p', null, ...rich(tx('tutorial.x')))`: `**bold**` in the string becomes a `<b>`, so a
  sentence with emphasis stays one string a translator can reorder.
- Whole sentences only: never build one from translated pieces plus English glue. A
  conditional bit of a sentence is its own key passed in as a placeholder, or two keys.
- Never call `tx` at module load (a top-level const): it would freeze in the language the game
  started in. Use a function or a getter (`get title() { return tx('…'); }`).
- Damage and healing sources are stable ids the code may compare (`'Vampiric'`); show them with
  `sourceName()`, which reads ui.json → sources.
- Show ids from the vocabularies above with `term(group, id)` / `condName(id)` (src/content/terms.ts).

`tests/i18n.test.ts` fails if code asks for a ui.json key that doesn't exist, or ui.json keeps a
string nothing uses.

## Code API

```ts
import { t, text, plural, setLocale } from './i18n/index.ts';
t('ui:menu.newGame', { n: 3 });         // dotted keys, `ui` namespace by default
text('dialogue', ['scripts', 'bet.intro', 'title']); // path form, for ids with dots
await setLocale('fr');                   // loads that language's chunks, then re-renders
```

## Still to move

1. Dialogue scenes, barks, heads, eulogy: **done**.
2. Story content (events, chapters, leads, evidence, rumours, drinks, Muster, NPC names): **done**.
3. Game data names and descriptions, plus saved room and theme text: **done**.
4. Interface text, plus the language menu: **done**.

Not translated on purpose: hero and Keeper names (proper names), the journal and combat log
already written (history keeps the language it was written in), a fallen hero's recorded cause
of death, and the dev text editor itself.
