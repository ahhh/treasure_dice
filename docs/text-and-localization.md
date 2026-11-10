# Text and localisation

All player-facing words are moving out of code into `src/locales/<lang>/<namespace>.json`.
English (`en`) is the source language: it is bundled with the game and is the fallback for
anything a translation hasn't covered. Other languages load on demand.

## Editing text

```
npm run text        # dev server + opens /dev/text.html
```

The editor covers:

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
  “{prefix} {name}{plus} {suffix}”).

Edit, then **Save** (⌘S): the JSON on disk changes, an open game tab swaps the new text in
without reloading, and the editor keeps your place. Commit the file as usual. Link straight
to an entry with its id: `/dev/text.html#event:q_stalledCart`, `#evidence`, `#script:bet.intro`.

The editor only exists on the dev server (`scripts/vite-locales.ts`, `apply: 'serve'`); it is
not in the production build.

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
4. UI strings in `src/ui/*` (buttons, labels, tutorial, tooltips) into `ui.json`, plus a
   language menu in settings.
