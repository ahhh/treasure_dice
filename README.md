# Treasure Dice — Echoes of the Fifth Door

A browser dungeon roguelite: three fifth-edition heroes, menu combat in the style of a console RPG, MUD-style procedural labyrinths, and a gambling layer on top that is built to make each dungeon run feel like a hot streak.

It's a static site (Vite + TypeScript, no backend) that works offline once loaded and deploys to GitHub Pages. It implements `The_Fifth_Door_Game_Plan.md`, plus the Fortune system described below.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 18 tests: rules, fortune scoring, 1,000-seed dungeon property test, runs, saves
npm run build      # dist/ for GitHub Pages (relative base, works at any project path)
npm run sim -- 40 1 cinder standard   # Monte Carlo balance: runs, level, biome, difficulty
```

## The loop

1. **The Lantern Keep (persistent).** Recruit from all 12 SRD classes, gear up, enchant, train your reserves, then pick three heroes and an echo.
2. **The dungeon (one instance).** Move forward, left, right or back on a seeded grid. Search for secret doors, take skill checks, haggle with the Peddler, spin the Wheel of Fate, find the Boss Sigil, and kill the boss.
3. **Aftermath.** Survivors gain **one class level** (1→20). Carried gold and items are banked. Clearing an echo unlocks the next one and earns a boss sigil for Keep upgrades. Dead heroes stay dead in Legacy mode. Story mode sends a wiped party home empty-handed instead.

## The Fortune layer (the run-only, Balatro-style meta game)

Every dungeon starts with a fresh **Dice Bag**: 6 colourless bone dice plus 2 dice per hero in that hero's colour (steel for fighters, sun for clerics and paladins, shadow for rogues and warlocks, and so on).

- **The tray.** At the start of a fight you draw 7 dice (8 at level 5, 9 at 11, 10 at 17) onto a felt tray that the whole party shares. On a hero's turn you may **reroll** any dice (2 rerolls per turn, more from rogues, charms and items). Then you **play up to 5 dice with an action**. Dice you don't play stay on the tray for the next hero, so you can hold the pair of sixes for the rogue.
- **Hands.** Played dice form a poker-dice hand: High Die, Pair, Two Pair, Three of a Kind, Straight, **Set** (five dice of one colour), Full House, Four of a Kind, Straight Set, Five of a Kind, Full Set, and Dragon Hoard. Only the dice that make the pattern score.
- **Score = (action base + hand chips + pips) × mult.** The action's base is the real fifth-edition result: weapon dice, Sneak Attack, Smite, or a spell's dice. Every scored die matching the acting hero's colour adds +1 Mult. Heals and Guard (Ward) scale on a gentler curve. Control spells turn the hand into a higher save DC. A miss returns your dice to the tray.
- **Charms (5 slots)** are the Jokers: 64 of them, scoring left to right, with scaling (Bloodstone, Ouroboros Ring, Avalanche Idol), retriggers (Echo Bell, Sixfold Bell), rule-benders (Crooked Ladder, Gap-Tooth Grin, Monolith, Prismatic Lens), ×Mult (Tyrant's Crown, Glass Heart, Wheel of Chance) and a Mimic Tongue that copies the charm to its right.
- **Omens** level up hand types. **Face enchants** (gilded, keen, fierce, savage, wild, lucky) and **special dice** (glass, gold, prism, lead, Ninefold…) reshape the bag. **Smashing** a die thins the bag. **Tokens** (Mulligan, Fate Coin, Loaded Coin, Encore, Tonic) are one-shot dice tricks.
- **Doubloons** are run-only coins with interest: +1 for every 5 you hold, up to 5. Spend them at the Peddler or the Dicing Ghost.
- **Level-ups after every fight.** Your Fortune Rank rises and you pick 1 of 3 boons. Every third rank is a milestone that offers a wider tray, +1 reroll per turn, or another charm slot. Bosses give two picks.
- **Fights push back.** Enemies have hexes: Pilfer steals a tray die, Jinx locks your best die, others curse faces or flip the tray. Bosses carry curses, like boss blinds (Molten Seal debuffs steel and ember dice, Undertow halves mult, Judgement punishes repeated hands). Each biome's meter bends the dice too: Heat, Bloom, Water, Reflection, Gravity.
- **Class talents manipulate dice directly.** Fighter nudges a die ±1. Cleric sanctifies a die into a sun 6. Bard drops Inspiration dice onto the tray. Sorcerer flips dice with Sorcery Points. Warlock bargains HP for any face. Wizard scries the next die in the bag. Druid copies a die. Barbarian buys rerolls with blood. Monk plays a second hand with Flurry. Ranger doubles Straights against a marked quarry. Paladin's Smite adds +Mult per slot level. Rogue Sneak Attacks off any Pair or better.

All of this resets when the run ends. What carries over is the heroes: their levels raise tray size and rerolls, their gear raises the base, and their class features add new ways to touch the dice.

## Rules fidelity

The rules kernel is SRD 5.2.1: d20 attacks against AC, saving throws, advantage and disadvantage, conditions, concentration, death saves, weapon mastery, spell slots (full, half and pact), short and long rests, and the class progression tables for 12 classes and their SRD subclasses through level 20, with feats, fighting styles, metamagic, invocations and epic boons. Ranges and positions become **front and back ranks**. Every feature on a hero sheet is tagged *exact*, *adapted* or *narrative*. The full list is in [`docs/rules-coverage.json`](docs/rules-coverage.json) (`node scripts/coverage.ts`).

## Balance

Hero HP and healing use a ×2.5 vitality scale. Monster HP follows level and role and compounds with dungeon depth, like Balatro's ante. That is tuned so a well-built Fortune engine is what carries a run. Calibration figures come from `scripts/sim.ts`, a headless autoplayer that uses the same commands as the UI. At the last calibration it won about 75–90% of standard runs at levels 1, 5, 11, 17 and 20, with 3–4 rounds per fight. Perilous difficulty adds a foe per fight and elite curses.

## Code map

| Path | What |
|---|---|
| `src/engine/` | seeded serializable RNG streams, dice, domain types |
| `src/fortune/` | hand evaluation, scoring pipeline, charms, curses, tray, boons |
| `src/content/` | classes, spells, items, species, monsters, biomes, events, portraits |
| `src/rules/` | the single stat resolver (`derive`), balance curves |
| `src/combat/` | kernel, hero actions, enemy AI, command entry point |
| `src/dungeon/` | generator + solvability validator, exploration controller |
| `src/meta/` | the Keep (town), loot |
| `src/app/` | `dispatch(state, cmd)`, headless autoplayer |
| `src/persistence/` | IndexedDB slots, localStorage fallback, export/import with checksum |
| `src/ui/` | vanilla DOM screens, the felt tray, scoring animation, synthesised sound |

Every state change is a command (`src/app/commands.ts`). The UI, keyboard, tests and simulator all go through `dispatch`, and the game autosaves after each command.

## Art

All 263 images (48 hero portraits, 45 monsters, 64 charms, 77 items, 29 scenes) come from `~/Programming/image_gen_pipeline/generate_treasure_art.py`. That script uses the same house-style technique as the other pipelines there: a shared style block, then a per-group identity (class, biome, charm rarity, item category, or location), then the subject, with each group's anchor image attached as a style reference. To regenerate:

```bash
node scripts/export-art-spec.ts                     # game content -> art/spec.json
cd ~/Programming/image_gen_pipeline
python3 generate_treasure_art.py estimate
python3 generate_treasure_art.py generate           # only buys what's missing
python3 generate_treasure_art.py regen --keys monsters/cinder_slagHound
python3 generate_treasure_art.py preview --groups biome
```

The game reads `public/art/manifest.json`, so any missing image falls back to a drawn placeholder rather than a broken link.

## Controls

- **Exploring:** arrow keys or WASD to move.
- **Combat:** `1`–`9` select dice, `R` rerolls the selected dice, `A`/`B`/`C`/`D`/`G` open the Attack, Skills, Magic, Items and Guard menus, `E` ends the turn, `Esc` goes back.
- Everything also works with mouse or touch.

See [LICENSES.md](LICENSES.md) for SRD 5.2.1 attribution.
