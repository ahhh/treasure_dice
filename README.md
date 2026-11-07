# Treasure Dice — Echoes of the Sixth Door

A browser dungeon roguelite: three fifth-edition heroes, menu combat in the style of a console RPG, MUD-style procedural labyrinths, and a gambling layer on top that is built to make each dungeon run feel like a hot streak.

It's a static site (Vite + TypeScript, no backend) that works offline once loaded and deploys to GitHub Pages. It implements `docs/The_Sixth_Door_Game_Plan.md`, plus the Fortune system described below.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 39 tests: rules, fortune scoring, Dice Path, skill tricks, 1,000-seed dungeon property test, runs, saves, tutorial, finale, balance mechanics
npm run test:ui    # browser checks (Playwright, starts its own dev server): smoke, full guided tour, screens, boss, battle, render stress
npm run test:ui -- tutorial smoke   # ...or just some of them; screenshots land in test-results/
npm run build      # dist/ for GitHub Pages (relative base, works at any project path)
npm run playtest                      # offline balance report: sweep + campaigns, all difficulties (~3 min)
npm run playtest -- --mode campaign --campaigns 24 --difficulties standard
npm run playtest -- --finale --runs 40   # Tiamat's Dragon Throne
npm run sim -- 40 1 cinder standard   # quick single-cell Monte Carlo: runs, level, biome, difficulty
```

## The loop

1. **The Lantern Keep (persistent).** Recruit from all 12 SRD classes, gear up, enchant, train your reserves, then pick three heroes and an echo.
2. **The dungeon (one instance).** Move forward, left, right or back on a seeded grid. Search for secret doors, take skill checks, haggle with the Peddler, spin the Wheel of Fate, find the Boss Sigil, and kill the boss.
3. **Aftermath.** Survivors gain **one class level** (1→20). Carried gold and items are banked. Clearing an echo unlocks the next one and earns a boss sigil for Keep upgrades. Dead heroes stay dead in Legacy mode. Story mode sends a wiped party home empty-handed instead.

## Story, tutorial and sharing

- **The story.** Tiamat, the five-headed Dragon Queen, is stirring behind the Sixth Door. Each of her five heads feeds an echo behind a door of its own. A new Keep opens on the prologue, and the first clear of each echo adds a chapter to the **Chronicle** tab (`src/content/story.ts`).
- **The Low Lantern and The Queen's Due.** Once the tour ends, a tavern opens in the Keep: drinks for the next run, rumors, and a side quest told in NES-style dialogue boxes (`src/ui/dialogue.ts`). A cult called the Dragon's Choir has been paying for your expeditions, and every echo you break wakes one of Tiamat's heads. Leads from the tavern place quest rooms in an echo (about one run in three, always by the third). After the awakening, the Muster's three tracks add boons to the Dragon Throne. Design: `docs/side-quest-the-queens-due.md`; logic: `src/meta/quest.ts`.
- **The finale.** The **Dragon Throne** in the Cartographer is a long Starfall dungeon with Tiamat (3 phases, ×1.6 HP, the *Chromatic Dominion* curse) in place of its boss. The party needs at least one level-20 hero to enter.
- **The guided tour.** A new Keep starts a coach-mark tutorial (`src/ui/tutorial.ts`) that can be skipped at any step. It covers the Keep's menus and hero sheets, then runs the hand-built **Training Cellar** (`src/dungeon/tutorial.ts`): movement, one fight with recommended dice, treasure, the Boss Sigil and a gentle boss. Nobody can die there, it earns no sigil, and it takes level-1 heroes to level 2. *How to play* can restart the tour.
- **Share card.** The Chronicle tab (and the result screen after a win) makes a PNG of your three best heroes, the echoes you've broken and your record (`src/ui/shareCard.ts`). The frame and title improve as you progress, up to *Dragonslayer*.

## The Fortune layer (the run-only, Balatro-style meta game)

Every dungeon starts with a fresh **Dice Bag**: 6 colourless bone dice plus 2 dice per hero in that hero's colour (steel for fighters, sun for clerics and paladins, shadow for rogues and warlocks, and so on).

- **The tray.** At the start of a fight you draw 7 dice (8 at level 5, 9 at 11, 10 at 17) onto a felt tray that the whole party shares. On a hero's turn you may **reroll** any dice (1 reroll per turn, more from rogues, skills, charms and items). Then you **play up to 5 dice with an action**. Dice you don't play stay on the tray for the next hero, so you can hold the pair of sixes for the rogue.
- **Hands.** Played dice form a poker-dice hand: High Die, Pair, Two Pair, Three of a Kind, Straight, **Set** (five dice of one colour), Full House, Four of a Kind, Straight Set, Five of a Kind, Full Set, and Dragon Hoard. Only the dice that make the pattern score.
- **Score = (action base + hand chips + pips) × mult.** The action's base is the real fifth-edition result: weapon dice, Sneak Attack, Smite, or a spell's dice. Every scored die matching the acting hero's colour adds +1 Mult. Heals and Guard (Ward) scale on a gentler curve. Control spells turn the hand into a higher save DC. A miss returns your dice to the tray.
- **Charms (5 slots)** are the Jokers: 64 of them, scoring left to right, with scaling (Bloodstone, Ouroboros Ring, Avalanche Idol), retriggers (Echo Bell, Sixfold Bell), rule-benders (Crooked Ladder, Gap-Tooth Grin, Monolith, Prismatic Lens), ×Mult (Tyrant's Crown, Glass Heart, Wheel of Chance) and a Mimic Tongue that copies the charm to its right.
- **Omens** level up hand types. **Face enchants** (gilded, keen, fierce, savage, wild, lucky) and **special dice** (glass, gold, prism, lead, Ninefold…) reshape the bag. **Smashing** a die thins the bag. **Tokens** (Mulligan, Fate Coin, Loaded Coin, Encore, Tonic) are one-shot dice tricks.
- **Doubloons** are run-only coins with interest: +1 for every 5 you hold, up to 5. Spend them at the Peddler or the Dicing Ghost.
- **Level-ups after every fight.** Your Fortune Rank rises and you pick 1 of 3 boons. Every third rank is a milestone that offers a wider tray, +1 reroll per turn, or another charm slot. Bosses give two picks.
- **Fights push back.** Enemies have hexes: Pilfer steals a tray die, Jinx locks your best die, others curse faces or flip the tray. Bosses carry curses, like boss blinds (Molten Seal debuffs steel and ember dice, Undertow halves mult, Judgement punishes repeated hands). Each biome's meter bends the dice too: Heat, Bloom, Water, Reflection, Gravity.
- **Class talents manipulate dice directly.** Fighter nudges a die ±1. Cleric sanctifies a die into a sun 6. Bard drops Inspiration dice onto the tray. Sorcerer flips dice with Sorcery Points. Warlock bargains HP for any face. Wizard scries the next die in the bag. Druid copies a die. Barbarian buys rerolls with blood. Monk plays a second hand with Flurry. Ranger doubles Straights against a marked quarry. Paladin's Smite adds +Mult per slot level. Rogue Sneak Attacks off any Pair or better.

All of this resets when the run ends. What carries over is the heroes: their levels raise tray size and rerolls, their gear raises the base, and their class features add new ways to touch the dice.

## The Dice Path (persistent dice progression)

Each hero owns **signature dice**: two dice in their class colour that join the bag on every expedition. A second, one-click track runs beside the class levels. Every level-up also offers **three marks** for those dice, and you keep one forever (`src/fortune/dicepath.ts`):

- **Engrave** a face: Keen, Fierce, Gilded or Lucky, then Savage from level 9 and Wild from 13. Up to 3 engraved faces per die.
- **Hone** a die: raise its lowest face by 1 (up to 3), so pairs come easier.
- **Trait milestones** at levels 5, 10, 15 and 20: *Loaded* (rolls twice, keeps the higher), *Kindred* (+2 Mult when its owner plays it), *Echoing* (scores twice for its owner), *Steadfast* (can't be jinxed, stolen or cursed), *Eager* (always in the opening tray).
- A **new signature die** is offered at levels 8 and 16 (4 at most).

Offers are seeded by hero and level, so they never change on reload. Recruits hired above level 1 have already walked their path. The hero sheet shows every face.

## Skill tricks

Every skill a hero is proficient in unlocks a small **tray trick** in combat (`src/content/skilltricks.ts`). A hero can use one trick per fight, two with any Expertise, and more from gear. Each trick works once per fight. Some examples: Athletics *Heave* (+1 to a die), Sleight of Hand *Palm* (swap with the next bag die), Arcana *Attune* (a die becomes your colour), History *Precedent* (match the tray's most common value), Deception *Bluff* (a die turns Wild), Religion *Prayer* (+2 Mult on your next hand), Performance *Showstopper* (×1.5 on a Straight or better). Tricks sit beside the class talents on the tray, and the sheet lists them.

## Dice-touched magic items

Trinkets can now reach into the Fortune layer:
- **Skill items** grant a skill and its trick: Gloves of Thievery, Boots of Elvenkind, Eyes of the Eagle, Hat of Disguise. The Doss Lute and the Ioun Stone of Insight also add an extra trick per fight.
- **Bag dice** add a special die to every expedition: Ivory Knucklebones (Loaded), Goldbug Locket, Glass Eye of Fortune, Prism Shard Pendant.
- **Hand items** boost your own hands: Ring of Twin Fortune, Bracelet of Threes, Starweave Mantle, Torc of the Hoard.
- **Colour items** make other dice count as yours: Circlet of Bone, Band of the Four Winds.
- **Others:** the Bag of Tricks (a Wild die at the start of every fight), the Gambler's Purse and the Hourglass of Encores (starting tokens).

## Rules fidelity

The rules kernel is SRD 5.2.1: d20 attacks against AC, saving throws, advantage and disadvantage, conditions, concentration, death saves, weapon mastery, spell slots (full, half and pact), short and long rests, and the class progression tables for 12 classes and their SRD subclasses through level 20, with feats, fighting styles, metamagic, invocations and epic boons. Ranges and positions become **front and back ranks**. Every feature on a hero sheet is tagged *exact*, *adapted* or *narrative*. The full list is in [`docs/rules-coverage.json`](docs/rules-coverage.json) (`node scripts/coverage.ts`).

## Balance

Hero HP and healing use a ×2.5 vitality scale. Monster HP and damage follow level and role, a per-level **pressure** curve (`levelPressure` in `src/rules/balance.ts`) and dungeon depth, like Balatro's ante. The pressure curve is highest in the mid levels, where class features, Dice Path marks and loot outgrow the raw curve fastest. From level 11 on, monsters also gain **tier traits** by role (multiattack, Uncanny Dodge, Magic Resistance, retaliation, death bursts, mass healing, pack tactics, and lair actions for mythic bosses). Each echo also has two **greater foes** that only join encounters from level 9 and 13, the way CR climbs in fifth edition. Elites gain legendary resistance at heroic and mythic tiers.

Overkill does not carry over by default. Cleave weapons, Great Weapon Master hits, multi-bolt spells (Magic Missile, Scorching Ray, Eldritch Blast, Chain Lightning) and the Butcher's Hook charm still carry half the excess into the next foe.

Calibration comes from `scripts/playtest.ts`, a parallel headless harness that uses the same commands as the UI. It writes `playtest-results/<stamp>/report.md` (with flagged outliers) and `data.json`. It runs two modes:

- **sweep**: fresh parties at each level, with the loot a campaign would have earned by then.
- **campaign**: one party levelled from 1 to 20 and then sent to Tiamat, through real loot, level-ups and recruits.

At the last calibration (2026-11-04) the sweep won about 96% of runs on explorer, 84% on standard (78–88% at every level from 1 to 20), 63% on perilous and 49% on deadly. Campaigns beat Tiamat 100% of the time on explorer and standard, and about 40% on perilous and deadly. The target bands are `TARGETS` in the script.

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

The spec lists 344 images: 48 hero portraits, 45 monsters, 64 charms, 96 items, 59 scenes (four plus six room scenes per biome, and the Keep), 23 event vignettes and 8 chronicle illustrations. They all come from `~/Programming/image_gen_pipeline/generate_treasure_art.py`. That script uses the same house-style technique as the other pipelines there: a shared style block, then a per-group identity (class, biome, charm rarity, item category, or location), then the subject, with each group's anchor image attached as a style reference.

There are two house styles. **storybook** (the default) is a soft, luminous, anime-influenced painterly look: thin linework, watercolour gradients, pastel light, quiet melancholy wonder. **classic** is the original dark-fantasy gouache. The pipeline records which style painted each master and only uses same-style anchors as references. `generate --restyle` repaints anything not yet in the current style. One lesson from the storybook repaint: an attached anchor locks in composition as well as style (every charm of a rarity became the same pendant, every room in a biome the same hall). So everything except monster sprites was painted text-only (`regen --no-ref`). The storybook prompt alone keeps the set consistent, and portrait variants `_2`–`_4` each get their own pose. New art that isn't generated yet falls back to the older scene, and event and chronicle banners only appear once their image exists. To regenerate:

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
