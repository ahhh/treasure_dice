# Text and localisation

All player-facing words are moving out of code into `src/locales/<lang>/<namespace>.json`.
English (`en`) is the source language: it is bundled with the game and is the fallback for
anything a translation hasn't covered. Other languages load on demand.

## Editing text

```
npm run text        # dev server + opens /dev/dialogue.html
```

The editor lists every scene by place (tavern, guild, muster…), plus keeper barks, Tiamat's
heads and the eulogy. Each line shows the speaker's portrait for that mood, their description,
when the line plays, where choices lead, the d20 checks and effects. Edit, then **Save** (⌘S):
the JSON on disk changes and the game tab reloads. Commit the file as usual.

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

## Code API

```ts
import { t, text, plural, setLocale } from './i18n/index.ts';
t('ui:menu.newGame', { n: 3 });         // dotted keys, `ui` namespace by default
text('dialogue', ['scripts', 'bet.intro', 'title']); // path form, for ids with dots
await setLocale('fr');                   // loads that language's chunks, then re-renders
```

## Still to move

1. Dialogue scenes, barks, heads, eulogy: **done**.
2. Story content: events (`events.ts`, `questEvents.ts`), chapters (`story.ts`), leads,
   evidence, rumours, drinks, NPC names and titles.
3. Game data names and descriptions: charms, items, monsters, spells, classes, biomes.
4. UI strings in `src/ui/*` (buttons, labels, tutorial, tooltips) into `ui.json`, plus a
   language menu in settings.
