# THE FIFTH DOOR
## Game Design & Technical Implementation Plan

**Working title:** *The Fifth Door: Echoes of the Labyrinth*  
**Document version:** 1.0 — November 2, 2026  
**Target:** Single-player, turn-based, browser-native dungeon roguelite for GitHub Pages  
**Technology:** HTML, CSS, JavaScript/TypeScript compiled to static JavaScript  
**Rules baseline:** D&D System Reference Document (SRD) **5.2.1**, CC BY 4.0, with explicit adaptation rules  
**Status:** Design proposal; no game implementation or live Lockboxx API integration is claimed yet

---

## 1. The elevator pitch

An old-school, menu-driven, three-hero fantasy RPG where every expedition enters a newly generated, text-forward labyrinth. Exploration feels like a graphical MUD: choose **forward / left / right / back**; uncover rooms, make skill checks, find allies and secrets, and work toward a boss. Combat looks and feels like classic console-era Final Fantasy, but the heroes are recognizable fifth-edition fantasy classes with real statistics, spell slots, class features, feats, equipment, tactical choices, and advancement from levels **1–20**.

**The hook:** There are five unstable worlds beyond a mysterious fifth door. Every dungeon is a different *echo* of a fallen civilization. The dungeon remembers choices from the current expedition and changes its threats, routes, and rewards in response. Surviving adventurers return to a persistent town, level up after clearing a dungeon, spend loot, recruit new heroes, and venture out again. Dead heroes are lost; the town's progress endures.

### Design pillars

1. **Faithful characters, fast combat.** Keep the identity of fifth-edition classes; convert fiddly tabletop procedures into clear, deterministic, UI-visible game actions.
2. **Three meaningful heroes.** Exactly three active adventurers; all three should matter in and out of battle.
3. **Explore, don't just click next.** Orientation, branching paths, exploration skills, clues, secrets, hazards, and choices matter.
4. **Survival has value.** Persistent roster, permadeath, loot, equipment, and safe returns make each run consequential.
5. **Infinite combinations, finite authored rules.** Seeds and data-driven room/event/enemy composition create variety, not unconstrained AI inventing mechanics.
6. **Static-host first.** A complete run works without a server, paid API, user account, or internet connection after assets load.

### Non-goals for the first release

- No multiplayer, server-owned economy, live leaderboard, or cloud saves.
- No free-form natural-language command parser or AI game master required for normal play.
- No full grid-based tactical combat movement: combat uses **front/back ranks** and target selection, not squares.
- No promise that every option from every commercial D&D book is legally redistributable. **Every rule explicitly included in the licensed SRD** is in scope for the long-term rules-coverage goal; other content needs independent rights or original equivalents.

---

## 2. The player experience

### 2.1 A complete expedition loop

```text
TOWN / THE LANTERN KEEP
  -> Roster: recruit / retire / revive? (NO: permanent death by default)
  -> Select exactly three surviving heroes
  -> Level-up choices, prepared spells, feats, gear, consumables
  -> Shop / enchant / craft / unlock town services
  -> Choose a biome + expedition difficulty
  -> Generate a seeded dungeon matched to the party

DUNGEON
  -> Explore via relative movement: F / L / R / B
  -> Reveal the map; log narration; make checks and choices
  -> Fight encounters; manage HP, spells, items and rests
  -> Locate boss, complete objective, choose final reward
  -> Return alive, retreat, or suffer a total party wipe

AFTERMATH
  -> On boss clear: gold + item rewards + all surviving active heroes gain
     one class level (maximum 20); make level-up selections
  -> On retreat: survivors and a reduced, explicitly defined share
     of carried treasure return; NO completion level
  -> On wipe: dead active heroes and unbanked carried loot are gone;
     town purchases, stored items, and inactive heroes survive
  -> Save permanent town/roster; start another expedition
```

**Important balance rule:** One *cleared dungeon* is one level-up opportunity per surviving active hero. A level-1 party can reach level 20 after at least 19 successful clears. Surviving bench heroes do not gain free levels; a paid town training feature can keep replacements within a limited range of the active party, preventing unusable low-level reserves. XP can be tracked for achievements but is **not** a second level-up system.

### 2.2 Run length and difficulty

- Intended first-playthrough expedition: **20–40 minutes**, with adjustable size and optional longer dives.
- Every run has one boss, one required objective, **2–4 optional branches**, at least one safe-room opportunity, and several skill-dependent alternatives.
- **Explorer / Standard / Perilous** modifiers change encounter budget, resource scarcity, and optional reward multiplier; they do not silently change class rules.
- Run end is explicit: defeat boss and exit, retreat at a valid retreat point, or wipe. Save-and-quit is available between actions.
- Keep a compact **seed code** so players can replay a layout, though imported content versions must also be pinned for reproducibility.

### 2.3 In-between-run metagame

**The Lantern Keep** is a functional hub, not a second dungeon:

| Facility | Purpose | Persistent progression |
|---|---|---|
| Guild Hall | Roster, select 3, inspect class sheet, hire procedurally rolled recruits | More candidate recruits and roster capacity |
| Armory | Equip weapons, armor, shields, rings, tools; compare stats | More item categories and rarity tiers |
| Apothecary | Potions, antidotes, bombs, scrolls | Better stock as boss sigils accumulate |
| Enchanter | Add bounded affixes, remove curses, upgrade items | More recipes, higher upgrade caps |
| Training Grounds | Select level-up features and limited paid reserve catch-up | More retraining options, not free power |
| Cartographer | Review maps, journal, biome lore, seed history | New biome modifiers and expedition leads |
| Vault | Bank gold and items not carried into a run | More storage; safe from party wipes |

**Gold handling:** banked gold persists; carried gold is at risk. Shopping uses shared town gold. Potions are consumables, inventory stacks have caps, and equipment slots/attunement (where relevant) are enforced. Avoid randomized shop stock that makes required class equipment unobtainable.

---

## 3. Characters, classes, and levels 1–20

### 3.1 Source-of-truth character schema

Each hero must retain a complete **canonical character sheet** independent of the combat UI:

- Identity: persistent UUID, name, portrait key, origin/ancestry, background, class, subclass, alignment/flavor tags, recruitment provenance.
- Levels: class level 1–20; XP/achievement history optional; a ruleset ID and rules version.
- Attributes: STR, DEX, CON, INT, WIS, CHA; derived modifiers, proficiency bonus, HP/max HP, hit dice, AC, initiative, movement.
- Proficiencies: saving throws, skills, tools, armor, weapons, languages where supported; expertise and passive scores.
- Combat: actions granted by class/features, attacks, equipment, weapon mastery, extra attacks, reactions, active conditions, immunities/resistances, concentration, limited-use counters.
- Magic: cantrips, known/prepared spells, available spell lists, spell slots (levels 1–9), pact slots, spell save DC, attack bonus, spellcasting ability, active spell effects.
- Progression: class/subclass selections, feat selections, ability score improvements, feature-granted choices, retraining history.
- Inventory: equipped slots, pack items, consumable quantities, treasure, equipment enchantments and charges.
- Persistence: `alive`, `retired`, `onExpedition`, last seen seed, accumulated accomplishments; permanent death cannot be undone by simple save reloading in normal mode (within practical offline limitations).

Keep **class data**, **character state**, and **derived statistics** separate. Recalculate derived stats using a single resolver after every equip, level-up, or long rest; never hand-edit AC or damage in UI code.

### 3.2 Core SRD classes

The initial 12-class rules registry targets these fifth-edition classes and the subclasses/options actually present in the selected SRD, not every published supplement:

| Class | Signature interface translation | Core mechanical concerns |
|---|---|---|
| Barbarian | **Rage** in Skills; heavy attacks | Rage uses, damage/resistance, Reckless Attack, critical effects |
| Bard | **Inspiration / Spells** | Support die, prepared/known magic, skill expertise |
| Cleric | **Channel Divinity / Spells** | Healing, turning undead, domain features, concentration |
| Druid | **Wild Shape / Spells** | Alternate form statistics, transformation resources, spells |
| Fighter | **Techniques** | Fighting style, Action Surge, Second Wind, multiple attacks, masteries |
| Monk | **Focus** | Martial Arts, discipline/focus points, flurry, mobility, reactions |
| Paladin | **Oaths / Spells** | Smites, Lay on Hands, auras, limited resources |
| Ranger | **Hunter Arts / Spells** | Tracking, marks, exploration, fighting styles |
| Rogue | **Cunning Actions** | Sneak Attack qualification, expertise, evasions |
| Sorcerer | **Metamagic / Spells** | Sorcery points, metamagic, spell slot conversion |
| Warlock | **Invocations / Pact Magic** | Pact slots, invocations, short-rest recovery |
| Wizard | **Spellbook / Spells** | Spellbook, preparation, ritual casting, Arcane Recovery |

**Crucial:** These are **menu names**, not substitutes for the actual underlying feature definitions. Each feature needs its own executable rules translation and explicit exceptions. A class can be enabled in the build only when its currently reachable class features have been implemented and tested. If an option's effect relies on unimplemented free-form tabletop interpretation, mark it as unsupported instead of pretending it works.

### 3.3 Menu mechanics versus tabletop mechanics

The hero's classic four-command panel is:

```text
  ALARIC — FIGHTER Lv. 6
  HP 48/52   AC 18   ACTION ◆   BONUS ◇   REACTION ○

    > ATTACK
      SKILLS / MAGIC
      ITEMS
      GUARD / WAIT
```

- **Attack:** pick target, then weapon/attack mode. Extra Attack offers multiple attacks within the same Attack action, not extra turns. Offhand attacks and weapon mastery obey chosen SRD version.
- **Skills / Magic:** list legal active features, class resources, spells/cantrips, and contextual skill maneuvers. Each shows cost, action type, target, range/rank limitations, and expected effect.
- **Items:** consumable item use with appropriate action cost; equipment changes only where rules/design explicitly allow it. Never assume item use is a free action.
- **Guard / Wait:** Guard is a documented custom game action (e.g., gain +2 AC until next turn or next hit, tuning required); Wait passes remaining actions, optionally retaining a reaction. Label custom adaptations clearly.

The player chooses **three active heroes**, but each hero acts when their own initiative entry comes up. Enemy entries appear between hero entries, maintaining a familiar **player action → enemy response** cadence while preserving initiative. A strict party-side/enemy-side phase mode could be offered later as a separately balanced rules variant.

### 3.4 Rules adapter: fidelity tiers

Use a **mechanical translation contract** for every licensed rule:

| Rule concept | Browser translation | Fidelity target |
|---|---|---|
| d20 check/attack/save | Deterministic seeded d20 + modifier; advantage/disadvantage | Exact math and conditions |
| Ability/proficiency/expertise | Derived from canonical stats | Exact |
| HP, AC, damage types, resistance | Standard resolution pipeline | Exact where licensed |
| Action / bonus action / reaction | Per-turn economy and event triggers | Exact |
| Short/long rest, spell slots | Explicit limited-use resources; rest sites | Exact resource logic, custom availability |
| Concentration | Single maintained spell; CON saves after damage | Exact core mechanic |
| Initiative | Individual timeline, tie-breaking seeded | Exact rules plus deterministic tie-break |
| Grid distance / range | Near/far ranks, single/party/area targets | **Adapted** |
| Movement/positioning | Front/back lane, guard interception and target weights | **Adapted** |
| Exploration utility magic | Data-driven room transitions and encounter flags | **Adapted** |
| Social/investigation checks | Dialogue branches and seeded skill checks | **Adapted** |
| Free-form divine/illusion/world spells | Curated, explicit effects with preview | **Adapted or gated** |

Keep a machine-readable `rules-coverage.json` with an entry for **every SRD class feature, spell, feat, item property, condition, and monster mechanic**: `implemented_exact`, `implemented_adapted`, `not_yet_supported`, or `requires_license`. Tests ensure that the UI never exposes a choice marked unsupported.

### 3.5 Unlocking and leveling

- Classes use their canonical SRD level tables, proficiency progression, spell slot progressions, subclass milestones, ASI/feat choices, and high-level capstones.
- Each hero's level-up is a small wizard: **new features → new spell/feat/ability choices → recalculated stats → confirm**. Stat increases are earned from the actual level progression, not random stat inflation after runs.
- Users may reassign *prepared* spells where class rules allow, and may purchase bounded retraining for selectable features according to an explicit house rule; don't freely rewrite a class's progression.
- **Early phase:** three fully implemented starter classes, levels 1–4, with testable feature coverage. **Full release:** 12 SRD classes, 1–20, with coverage audited against the locked SRD version.
- Hire found NPCs with a procedurally generated legal character at the appropriate level range; some are quest allies and **not** recruitable heroes.
- Reserve training (optional): pay gold to raise a benched hero to at most `max(1, activePartyMedianLevel - 2)`, never above the party leader and never above 20. This is a meta-progression adaptation, not a D&D class rule.

---

## 4. Turn-based battle engine

### 4.1 Rendering and feel

**Aesthetic:** dark blue/black bordered panels, crisp bitmap-inspired type, readable status icons, monster sprites/silhouettes on a static battlefield, a compact message log, and a right-side command panel. The goal is a console-RPG presentation without relying on Final Fantasy artwork, copyrighted UI assets, or names.

```text
┌───────────────────────────────────────────────────────┐
│  THE ROOTBOUND HALLS               ROUND 3           │
│                                                       │
│          [Moss Wight]       [Sporeling]               │
│           HP ????            HP ????                 │
│                                                       │
│ ALARIC   38/52     MIRA    19/31    VEX   27/27      │
│ FTR 6   Rage? —    CLR 6   2nd slots   ROG 6         │
├───────────────────────────┬───────────────────────────┤
│ > Attack                  │  The wight raises a root. │
│   Skills / Magic          │  Mira has the next turn.  │
│   Items                   │  [Timeline: M W V S A]    │
│   Guard / Wait            │                           │
└───────────────────────────┴───────────────────────────┘
```

This is an illustrative mockup, not final art or a playable screen. Mobile layout collapses panels; keyboard arrows/Enter/Escape, number shortcuts, and touch controls all work.

### 4.2 Deterministic combat resolution

**Combat encounter pipeline:**

1. Load enemy templates and affixes; snapshot party loadout, conditions, resources and initiative modifiers.
2. Roll initiative with the seeded **combat RNG stream**. Apply surprise and precombat effects from the rules adapter.
3. Build an ordered timeline; at each actor turn refresh legal turn resources, process start-of-turn effects, and prompt AI/player.
4. Execute chosen ability through the same **action validator** for heroes and enemies. Invalid actions cannot spend resources.
5. Emit ordered domain events (`ActionDeclared`, `ResourceSpent`, `RollMade`, `Hit`, `DamageApplied`, `ConditionAdded`, `Death`, etc.). Reactive features and concentrations subscribe to events and respect priority.
6. Check victory, defeat, summon/despawn, boss phases, and retreat rules after every event batch.
7. On victory, resolve gold/loot and persist the dungeon state atomically; on defeat invoke permanent-death and run-end rules.

**Suggested action object:**

```json
{
  "type": "cast_spell",
  "actorId": "hero_2",
  "abilityId": "spell:guiding-bolt",
  "targets": ["monster_1"],
  "slotLevel": 1,
  "mode": "normal",
  "actionCost": "action"
}
```

`actionCost` is validated against the ability definition, not trusted from UI input.

### 4.3 Mechanics required in the rules kernel

- Dice interpreter supporting `XdY ± Z`, rerolls, advantage/disadvantage, critical hit damage, and explicit random stream use.
- Attack roll versus AC; saving throw versus DC; flat checks and contested checks with class/skill modifiers.
- Damage/heal pipeline: modifier → hit/save outcome → vulnerabilities/resistances/immunities → temporary HP → regular HP → zero-HP rule.
- Conditions such as poisoned, frightened, blinded, stunned, restrained, prone, etc. with durations, save timing, and rules impact.
- Action, bonus action, free interactions, reactions, multiattack/Extra Attack, attacks of opportunity where meaningful in ranks.
- Spellcasting, upcasting, concentration, target selection, area templates, short/long rests and per-rest feature recharges.
- Summoned/companion creatures with controlled or AI behaviors; maximum summon count to preserve play speed.
- Boss phases, telegraphs, legendary-like responses only where justified by creature data/encounter balance.
- Legal target validation, enemy death cleanup, rollback-safe transactions, replayable event log.

**Important zero-HP decision:** At 0 HP, a hero falls unconscious and makes death saving throws at the scheduled turn per the selected SRD. They may be stabilized or healed. Permanent death occurs on failed death saves or other relevant lethal mechanics, not merely at zero HP. At a completed expedition, heroes still unconscious but stabilized/alive survive if the party extracts them; a wipe/retreat rule must explicitly handle abandoned allies.

### 4.4 Enemy AI

A transparent priority AI is safer than a black box:

```text
If an enemy can win now with a legal attack, consider it.
Else if a heal/support prevents imminent loss, consider it.
Else if a telegraphed boss move is due, execute it.
Else choose weighted legal actions based on role, threat, statuses,
position, resource budgets and theme.
```

Use archetypes **brute, skirmisher, controller, artillery, healer, defender, summoner, boss**. Seed-weighted action choice prevents perfect, punishing AI. Each monster statblock goes through the same ability interpreter with explicit AI hints.

### 4.5 Combat difficulty, not naïve CR matching

A CR number is **not** a safe one-to-one match to a party's level, particularly with only **three** heroes and high-level spellcasters. Challenge budgets need to account for:

- Party size (always 3), level spread, active AC/HP, DPR/healing/control potential and action economy.
- Deadly combinations: stun-locks, multiple paralysis saves, energy immunities, unexpected one-turn kills.
- Encounter cadence per run and current attrition (HP, spell slots, charges, rest opportunities).
- Enemies' number of turns, area damage, legendary/reaction actions and boss/minion interactions.
- Build diversity and extreme multiclass or imported characters; multiclass can be postponed until coverage is sound.

**Algorithm:** derive an initial budget from the selected SRD's encounter-design baseline, **adapt for a three-character party**, then adjust using measured simulation and curated safety constraints. Do not present a hand-invented budget as official D&D balance. Use telemetry from local test runs and Monte Carlo simulations to calibrate clearance rates. Early levels should be unusually conservative; high-level encounters should scale with action economy and control, not merely massive HP.

| Character levels | Design tier | Typical threats | Additional needs |
|---|---|---|---|
| 1–4 | Novice | Small groups, visible hazards, elite miniboss | Prevent one-hit party deletions |
| 5–10 | Veteran | Enemy synergies, control, resistances, multi-phase bosses | Extra Attack, 3rd–5th level spells |
| 11–16 | Heroic | Layered defenses, terrain switches, waves, rare powerful foes | Reactions, counterplay to 6th–8th level magic |
| 17–20 | Mythic | Reality effects, coordinated lieutenants, elaborate boss phases | 9th-level spells, capstones, capped burst loops |

**New run scaling:** Snapshot the exact selected trio. Calculate each hero's effective tier from **actual level plus quantified party capability**; identify huge disparities, and suggest a balanced trio. The encounter generator targets that trio's difficulty and scales rewards. A level-17 survivor starting with two level-2 recruits must not receive a careless "average level 7" dungeon. Offer a level-range warning and optional roster adjustment/training.

---

## 5. Exploration: MUD-style procedural 2D labyrinth

### 5.1 Movement and orientation

A map is a real integer **2D grid**, not a list of unrelated scenes. The player has `{ x, y, facing }`, where facing is N/E/S/W. The four movement choices are **relative to facing**, and move one traversable tile:

- **Forward:** move facing direction.
- **Left / Right:** move to the corresponding adjacent side and face that travel direction.
- **Back:** move to the tile behind and face backward.

The UI should show compass orientation, current room type, visible exits, landmark description, and discovered fog-of-war map. An unavailable exit is clearly blocked; trying it does **not** spend a dungeon turn. Exploration movement may advance a world tick that triggers optional patrols and timed effects.

Example room UI:

```text
THE DROWNED ARCHIVE — Scriptorium [facing East]

Water drips through shattered shelves. A bronze door bears three
inscriptions; the south corridor smells of oil and ozone.

Available exits: Forward [open] · Left [locked] · Back [open]

[ FORWARD ] [ LEFT ] [ RIGHT ] [ BACK ]

[Look] [Inspect] [Map] [Party] [Inventory] [Journal] [Rest]
```

### 5.2 Generator phases

Use separate seeded PRNG streams for **layout, encounters, narrative, loot, AI, and combat**; the same seed/content revision should reproduce a run independently of cosmetic actions.

1. Choose biome, party level tier, difficulty, dungeon size, faction, twist, major objective and boss archetype.
2. Build an entrance-to-boss **critical path** with minimum graph distance and no immediate-boss shortcuts.
3. Add side branches, meaningful loops, dead ends, one or more shortcuts, a safe room, loot caches, optional NPC/event rooms and secret routes.
4. Place mandatory keys/puzzle clues **before** their gates; ensure no required item is exclusively behind a skill check that the chosen party can fail.
5. Assign room types and puzzles with biome constraints and *alternative solutions* (skill check / item / combat / detour).
6. Allocate encounters using party-aware budgets; separate ambush, elite, event and boss difficulty distributions.
7. Select loot and resource restoration pacing according to the planned challenge curve.
8. Run solvability analysis: BFS/graph search over possible door/key states; verify critical-path reachability; validate no one-way softlocks or unrecoverable run states.
9. Commit an immutable dungeon blueprint and seed. Save only explored state, deltas, local NPC choices and live encounter state.

**Default sizing examples** (tuning inputs, not guarantees): novice 9×9 bounding grid with 12–18 reachable rooms; veteran 13×13 with 18–26; heroic/mythic 17×17 with 24–38. Maps are **sparse connected graphs on a grid**, not all cells occupied. Room count and length are a separate option from difficulty.

### 5.3 More than combat

Every room is a typed event evaluated by the same rules system:

- **Investigation:** clues, inscriptions, hidden switches, historical fragments, treasure maps; INT/WIS skills help reveal optional information.
- **Obstacle:** locks, traps, weak bridges, floods, machinery; skills, tools, spells, alternate routes and resources can solve them.
- **Social:** merchant, prisoner, betrayer, cursed scholar, rival party; dialogue choices and CHA/WIS checks with tracked consequences.
- **Resource:** camp, altar, corruption sink, supply cache, temporary boon, a difficult choice between rest and risk.
- **Encounter:** wandering patrol, staged battlefield, miniboss, boss, wave defense, enemy that can be talked past.
- **World change:** open a shortcut, remove a patrol, change boss's resistance, rescue a future recruit, flood or drain a wing.

**Fairness invariant:** Every mandatory objective can be reached without requiring a specific class, feat, spell, consumable, or lucky check. Specialized abilities grant better or faster alternatives, not permanent dead ends. Failure should generally cost time, HP, gold or a detour, and keep the game moving.

### 5.4 Run themes and narrative grammar

Procedurally combine:

```text
Biome + Civilization + Enemy faction + Catastrophe + Current anomaly
+ Personal hook + Objective type + Boss motive + Consequence
```

Example: **The Drowned Archive** + forgotten astronomers + eel cult + inverted tide + glass-rot + a cleric's old master + rescue hostages + boss guarding a drowned star. This creates a recognizable episode with authored mechanics, rather than random rooms named after nouns.

NPCs keep scoped memory within a run; rare recurring NPCs carry a stable identifier into town and future runs. Record discovered lore and world flags in a journal.

---

## 6. Five distinct biomes

Each biome ships with original room descriptions, tile palettes, enemy archetypes, loot modifiers, hazards, event/puzzle families, traversal quirks, and at least **three boss patterns**. Every biome appears across tiers 1–20 using escalating regional variants. Players select an unlocked biome; each has a difficulty-aware map.

| Biome | Look & premise | Signature environmental rule | Exploration opportunities | Boss patterns / loot identity |
|---|---|---|---|---|
| **1. Cinder Vaults** | Ash-filled mines, iron doors, molten catacombs | **Heat clock:** certain chambers increase Heat; valves and cooling rooms clear it | Smithing tools, pressure releases, cracked walls, forge diplomacy | Forgemaster construct, ash hydra, bound ember / fire resistance, heated blades, forging reagents |
| **2. Rootbound Halls** | Overgrown mausoleums, fungal shrines, ruined canopy | **Spore bloom:** room states change with noise/steps; bloom grants cover or poison risk | Nature/survival checks, speaking to plant wards, vine bridges | Mycelial monarch, thorn knight, root dragon / antidotes, natural staves, regeneration-affixes |
| **3. Drowned Archive** | Sunken libraries, brass pumps, flooded observatories | **Water level:** switches alter traversable routes and enemy traits | Investigation, historical ciphers, pumps, diving shortcuts | Drowned archivist, tide oracle, armored leviathan / scrolls, memory trinkets, lightning tools |
| **4. Mirror Reliquary** | Glass corridors, shattered chapels, impossible reflections | **Reflection state:** correct facing/light reveals doors and changes illusion targets | Insight, perception, mirror angles, duplicated clues | Prism sentinel, shattered double, glass seraph / crit-defense, illusion wards, trick weapons |
| **5. Starfall Ossuary** | Floating graves, meteor vaults, silent cosmic machinery | **Gravity shifts:** room groups rotate travel constraints; anchor shrines stabilize | Arcana, astronomy, gravity levers, spectral parley | Astral judge, fallen comet, epoch devourer / force wards, rare focuses, mythic affixes |

### 6.1 Biome scaling example

In the Cinder Vaults: at levels 1–4, heat is a readable warning and soot goblins can be avoided; at 5–10, animated furnaces and alternating flame vents demand preparation; at 11–16, enemy forge ritualists can seal shortcuts; at 17–20, a boss manipulates heat, initiative, and terrain across distinct phases. **Same biome, different level-designed threat**, not a reskinned rat with 5,000 HP.

### 6.2 Cross-biome variety

- Five biome seeds × at least 8 layout motifs × 6 objectives × 6 anomalies × 4 factions each = thousands of *possible combinations*, **not** a guarantee that all are narratively unique.
- Rare **incursion** rooms inject another biome's enemies and hazard, with an explained world anomaly.
- A few authored puzzle templates per biome, assembled procedurally; puzzles must be mechanically validated and readable without external clues.
- Boss modifiers are selected from legal combinations. No unwinnable immunity stack or impossible counter mechanic.

---

## 7. Loot, itemization, economy, and persistent consequences

### 7.1 Rewards

Each cleared dungeon provides:

1. **Guaranteed gold** scaled to difficulty and dungeon tier.
2. **Guaranteed meaningful choice** between at least two rewards (e.g., class-friendly equipment, upgrade reagent, rune, unusual utility item).
3. **Procedural loot rolls** from rooms/elites, with rarity caps and biome-themed pools.
4. **One level-up** for each surviving active adventurer (unless already level 20).
5. **One persistent discovery** or hub material on major milestone clears, with no runaway universal stat bonuses.

Retreat awards a fraction of **carried** gold and only physically extracted items; wipe loses them. Town-stored items and roster are safe. Set clear rules for what happens to a dead character's equipment (e.g., drops in the dungeon, only recoverable if a surviving hero extracts the body or retrieves the gear).

### 7.2 Equipment structure

Equipment uses SRD-compatible base items plus **original** affix packages:

```text
Base item (weapon/armor/accessory/focus/consumable)
  + rarity + upgrade level + affix list + charges + curse flags
  + class/proficiency restrictions + weight/pack rules (simplified)
  + content source/license/provenance
```

No random item may override a core class rule unnoticed. Scale affixes through bounded tiers; e.g., early +1/elemental riders, later action-economy-safe utility and rare effects. **Avoid stacking unrestricted extra actions, permanent immunity and exponential damage loops.** Include duplicate protection or salvage so loot never becomes completely worthless.

### 7.3 Fair shop economy

- Maintain separate ledgers for **banked gold**, **carried gold**, and **unspent upgrade materials**.
- Items have buy/sell/salvage values; protect against positive-value buy/sell loops.
- Healing potions, basic weapons, and simple reagents remain obtainable so a party can recover after a setback.
- Enchanting has a displayed cost and deterministic output for chosen recipes; optional random affixes are capped and preview their possible pool.
- Enforce spell scroll/class access, attunement capacity, two-handed conflicts, armor proficiency, item use charges, and other implemented rules.

### 7.4 Character mortality

Default mode is **Legacy**: hero deaths are permanent, roster survivors persist, and a wipe ends the expedition. A separately labeled **Story Mode** can offer no-permadeath or recovery at a meaningful cost. Do not mix modes in score/achievement comparisons.

---

## 8. Lockboxx generators and other external content

The external sites are **candidate content authoring/import tools**, **not assumed production APIs**. The game must remain fully functional if every site is unavailable.

| External source | Observed / known capability | Proposed integration | Current uncertainty |
|---|---|---|---|
| `https://encounters.dnd5e.lockboxx.org/` | User describes encounter and character-sheet generation | Import JSON or manually exported sheets through a validated adapter; optionally use an API *only if documented and permitted* | **Not verified:** site returned a 502 in this research; no schema, endpoint, CORS or content license confirmed |
| `https://quests.dnd5e.lockboxx.org/` | Questforge page shows seed, party, level, difficulty, length, Markdown, **JSON**, checks and maps views | Optional quest blueprint import via a JSON adapter; preserve seed and allow original authored room/event mapping | **Not verified:** machine API, schema stability, CORS, or permission for programmatic reuse |
| `https://items.dnd5e.lockboxx.org/` | Souls Forge generates random 5e-converted weapons, armor and curios from Souls games | **Manual stat/inspiration importer** only after source/licensing review; convert to original names, descriptions, art, and compliant rules | The page states names/art/descriptions belong to third parties; do **not** ship copied assets/content by default |
| `https://www.dnd5eapi.co/` | Public read-only 5e SRD API | Reference or import only records whose rules edition, coverage and reuse terms match the selected SRD | Verify 2014 vs revised rules; never silently blend editions |
| `https://open5e.com/api-docs/` | Open5e API v2 with rules, creature and spell records from multiple sources | Optional offline-authoring pipeline with explicit source/license filters | Verify per-record licensing and compatible mechanics |

### Integration phases

1. **Manual JSON import/export** with a documented versioned schema is the safe starting point.
2. Make a **content normalization layer** mapping provider terms to internal `Class`, `Monster`, `Spell`, `Item`, `QuestTemplate`, and `RoomEvent` definitions.
3. Validate JSON against strict schemas; reject unexpected executable code, HTML fragments, invalid references, out-of-bounds stats, and unsupported actions.
4. Store provenance (`source`, `sourceURL`, `license`, `sourceVersion`, `importedAt`, `originalId`) and **do not redistribute imports** when rights are unclear.
5. Only after an explicit integration test, add browser API fetches when endpoint documentation, CORS, acceptable use, and fallback behavior are all verified.
6. Never put an API secret in shipped JS or GitHub Pages configuration. Optional authoring credentials belong outside the deployed site.

**Security and reproducibility:** Imported descriptions are treated as untrusted plain text (no `innerHTML`). Imported sheets are **data**, never executable scripts. Seed alone is insufficient to reproduce content sourced from a changing remote service: pin the normalized content or its hash/version in the save.

### Legal/content boundary

Use the **SRD 5.2.1** under **CC BY 4.0** with the required attribution. The SRD deliberately excludes some classes, spells, subclasses, monsters, settings, names and art from commercial books (for example, Artificer and Beholder). Do not reproduce non-SRD official text or protected settings without appropriate permission. The game can add **original fifth-edition-compatible options**. Also verify permissions from any third-party generator before republishing its output or source art. This is a project risk-management requirement, not legal advice.

---

## 9. Architecture: a reusable browser game engine

### 9.1 Recommended technology stack

- **Vite + TypeScript** for development/build: generates the HTML/CSS/JavaScript static site compatible with GitHub Pages. If plain JavaScript is preferred, use ES modules + JSDoc types with the same module boundaries.
- **Vanilla DOM/CSS UI** for phase one: fast, small and accessible; UI can move to a framework later without rewriting the engine.
- **Pure data-driven core** with no DOM references in calculations, battle logic, procedural generation or save upgrades.
- **IndexedDB** for saves/roster/inventory and content snapshots. Use localStorage only for tiny display preferences. Provide a JSON export/import backup.
- **Vitest** or equivalent for pure logic, **Playwright** for browser/end-to-end tests, GitHub Actions for validation/deployment.
- **Static content bundles** compiled into versioned JSON files; a service worker/PWA is optional later.

### 9.2 Engine design

```text
                         HTML / CSS / JS UI
             ┌────────────────────────────────┐
             │ Town | Party | Map | Combat UI │
             │ Journal | Shop | Level-up      │
             └──────────────┬─────────────────┘
                            │ UI commands
                  GAME SESSION CONTROLLER
                            │
         ┌──────────────────┼───────────────────┐
         ▼                  ▼                   ▼
    RULES ENGINE       DUNGEON ENGINE      PROGRESSION
  - dice and checks   - seeded grid       - class levels
  - action validator  - room events       - roster/shops
  - status/conditions - encounters        - loot/equipment
  - spells/features   - exploration       - hero mortality
         └──────────────────┼───────────────────┘
                            │
                   CONTENT REGISTRY
      classes | spells | features | monsters | rooms | items
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
   SAVE / VERSIONING                      IMPORT ADAPTERS
   IndexedDB + export             SRD, Questforge, encounter,
   event log + migrations             items (permission gated)
```

**Only domain commands change state.** UI asks `dispatch({type: 'TRAVERSE', direction:'left'})`; the engine validates, changes the state, emits typed events, then the UI renders the new state. This keeps saves, keyboard input and automated tests consistent.

### 9.3 Proposed repository tree

```text
fifth-door/
├── index.html
├── package.json
├── vite.config.ts
├── README.md
├── GAME_PLAN.md
├── LICENSES.md
├── public/
│   ├── art/                  # Original or licensed assets only
│   └── icons/
├── src/
│   ├── main.ts
│   ├── app/session.ts
│   ├── engine/
│   │   ├── rng.ts
│   │   ├── dice.ts
│   │   ├── events.ts
│   │   ├── commands.ts
│   │   ├── rules/{actions,checks,spells,features,conditions}.ts
│   │   ├── combat/{timeline,resolution,ai,balance}.ts
│   │   └── dungeon/{grid,generator,validator,events,fog}.ts
│   ├── domain/{character,inventory,encounter,save,quest}.ts
│   ├── content/{registry,loader,schemas}.ts
│   ├── adapters/{srd,questforge,encounters,items}.ts
│   ├── systems/{shop,levelup,loot,recruitment,death}.ts
│   ├── persistence/{indexeddb,migrations,backup}.ts
│   ├── ui/{town,roster,map,combat,levelup,shop,dialogs}.ts
│   └── styles/
├── data/
│   ├── rules/srd-5.2.1/
│   ├── biomes/{cinder,rootbound,drowned,mirror,starfall}/
│   ├── encounters/
│   └── quests/
├── tests/{rules,dungeon,combat,persistence,ui}/
└── .github/workflows/deploy.yml
```

### 9.4 Internal content contracts (example)

```json
{
  "schemaVersion": 1,
  "id": "feature:fighter:action-surge",
  "kind": "class_feature",
  "ruleset": "srd-5.2.1",
  "class": "fighter",
  "name": "Action Surge",
  "unlockLevel": 2,
  "trigger": "activate_on_own_turn",
  "cost": {"resource": "action_surge", "amount": 1},
  "effect": [{"type": "grant_action", "amount": 1, "scope": "current_turn"}],
  "implementation": "implemented_adapted",
  "license": "CC-BY-4.0"
}
```

This is a **shape illustration**. Exact feature wording, exceptions, recharge counts, and level scaling must be validated against the pinned SRD and implemented in the feature interpreter. `grant_action` is a controlled engine operation, not eval'd code; feature-specific restrictions and any 2024 changes must be enforced by tested rules.

```json
{
  "schemaVersion": 1,
  "contentRevision": "core-0.1",
  "seed": "FIFTH-DOOR-9184",
  "biome": "rootbound",
  "tier": "novice",
  "partyIds": ["hero_1", "hero_2", "hero_3"],
  "grid": {"width": 9, "height": 9},
  "start": {"x": 1, "y": 1},
  "bossRoomId": "room_18",
  "objectiveId": "cleanse_roots",
  "modifiers": ["spore_bloom", "silent_patrols"]
}
```

The actual generated run stores **room graph, populated encounters, RNG states, visited flags, quest variables, pending actions, per-character resources and loot transactions**, not just the example seed header.

### 9.5 Game session states

```text
BOOT -> LOAD_OR_NEW -> TOWN -> PARTY_SETUP -> GENERATE_DUNGEON
  -> EXPLORING <-> ROOM_EVENT <-> COMBAT
  -> BOSS_COMPLETE -> REWARD -> LEVEL_UP -> TOWN
  -> RETREAT -> RETREAT_RESULTS -> TOWN
  -> PARTY_WIPE -> LOSS_RESULTS -> TOWN
```

State transitions are explicit and validated. A defeated boss cannot be rewarded twice; an item purchase cannot spend the same coins twice; moving while battle is unresolved is forbidden.

---

## 10. Saving, persistence and GitHub Pages deployment

### 10.1 Save strategy

Store three separate entities in IndexedDB:

1. **Profile:** settings, unlocks, achievements, ruleset/data versions, banked gold.
2. **Town & roster:** surviving characters, bench status, equipment stash, shops, recruited NPCs, progression history.
3. **Active expedition:** seed, frozen dungeon blueprint/content refs, player position/facing, fog-of-war, encounter state, party resources, carried inventory, RNG stream states, transaction/event sequence.

Use `schemaVersion` and migration functions. Save **atomically** on completing any room move, shop transaction, combat action/resolution, recruitment, reward, or level-up selection. Also save at explicit "Save & Quit" checkpoints. Do not save halfway through a multi-event spell resolution; commit the finished action.

**Mid-battle resume:** store exact initiative order, pending actor, status durations, enemy HP/resources, targeting state and RNG stream state; do not reroll combat when reloading.

**Backup:** "Export save" generates a downloadable JSON file with a checksum, content version and timestamp; "Import save" validates, previews profile details, then replaces a selected slot only after confirmation. Offer 2–3 named save slots. Browser storage can be cleared and **does not sync devices**; backups are essential.

**Ironman integrity:** purely offline saves cannot be made cheat-proof. The goal is consistency and no accidental duplication, not a claim of secure anti-cheat.

### 10.2 Deployment

GitHub Pages supports HTML, CSS and JavaScript as a **static site**. Build with Vite and deploy the `dist/` folder via GitHub Actions. For a project site, set Vite's `base` to `/<repository-name>/` (or choose an appropriate relative base and test), and use relative asset paths. Avoid server-only APIs/routes. Hash-based in-app routing can avoid static-host deep-link 404 errors.

**Minimal workflow:** commit -> lint/typecheck/tests -> build -> deploy Pages artifact -> smoke-test a new run, refresh/resume, load artwork and reload at a nested project path.

**Acceptance gate:** No network request to the Lockboxx domains or any third-party API is necessary for character creation, completing a run, getting loot, or continuing a saved game.

---

## 11. Build roadmap with concrete completion gates

### Milestone 0 — Rules and risk spike

**Deliverables:** confirm exact SRD version; build license/source manifest; obtain/inspect sample JSON exports from external generators where possible; choose rules-mapping conventions; implement seeded PRNG and prototype game state schemas.  
**Done when:** versioned content contracts are documented; no dependency on a live external API; known legal exclusions and unsupported features are listed.

### Milestone 1 — Playable vertical slice (**first priority**)

**Scope:** town screen; three predefined level-1 heroes (**Fighter, Cleric, Rogue**); one biome (**Cinder Vaults**); generated 7–12 room map; forward/left/right/back navigation; 3–4 enemy types; 1 boss; classic menu combat; HP/AC/attack rolls/initiative/conditions; potions; gold; saved expedition; return to town; level from 1 to 2.  
**Done when:** a player can start, complete or fail a seed, keep survivors, get a deterministic reward, refresh and resume with no duplicate loot, and start again.

### Milestone 2 — Robust game kernel

**Scope:** status effects, death saves, actions/bonus actions/reactions, concentration, resource recharge, multiple attack resolution, AI archetypes, damage types, combat event log, save migrations, error recovery.  
**Done when:** all implemented features have unit tests; ten thousand seeded simulated encounters terminate without invalid game state or unbounded turns.

### Milestone 3 — True roguelite loop

**Scope:** recruit generation, bench roster, shops, upgrades, item rarity/affixes, multiple save slots, town unlocks, retreat mechanics, treasure extraction, complete level-up flow through level 4.  
**Done when:** players can lose a hero, recruit/gear a replacement, preserve the town, and improve across three successive runs.

### Milestone 4 — Five-biome exploration

**Scope:** all five distinct biomes, room grammar, key/lock puzzle alternatives, skill checks, NPC choices, boss variations, shortcuts, quest journal, minimap/fog.  
**Done when:** automated property tests verify map reachability on thousands of seeds and each biome has distinguishable mechanical gameplay, not just swapped art.

### Milestone 5 — Complete class and spell progression

**Scope:** remaining SRD classes; relevant SRD subclasses, class feature progression, feats, spells, spell slots through level 9, high-level enemies and bosses; original mechanics for hard-to-adapt open-ended effects. Expand the rules coverage report.  
**Done when:** every **supported** SRD option exposed in-game from levels 1–20 resolves with a tested effect, and unsupported options cannot be selected. All 12 core classes have a legal tested 1–20 progression path.

### Milestone 6 — Tuning and public launch

**Scope:** replay balancing, UX/accessibility, tutorials, sound and original pixel art, performance, QA, save compatibility, credits, GitHub Pages workflow, contributor docs.  
**Done when:** mobile/desktop smoke tests pass; imported content handling is safe; level 1, 5, 11, 17 and 20 runs are playable and balanced; public attribution and license files exist.

### Recommended **vertical-slice task order**

1. Create repository, Vite skeleton, content registry, unit tests.
2. Implement seeded RNG, dice, stats, deterministic actions and events.
3. Implement three starter classes with **only** their actually unlocked level-1 features.
4. Implement initiative timeline, menu commands, 3 monsters and victory/death pipeline.
5. Implement grid movement, basic procedural map, fog, boss key and safe room.
6. Implement IndexedDB saves with export and refresh/resume tests.
7. Implement loot, camp return, one-level advancement, and basic shop.
8. Deploy an end-to-end browser build to GitHub Pages.

**Do not start by implementing all spells/classes or by attempting external live APIs.** They are content-scale multipliers; prove the core loop first.

---

## 12. Test plan and balancing targets

### 12.1 Engine invariants

- Three and only three active roster slots at expedition start; dead characters cannot join.
- No action spends a resource it lacks or acts while forbidden by status.
- Attacks and damage are resolved once per committed action; loot and rewards are granted once per victory.
- HP and charges stay within valid bounds; negative gold/inventory and illegal equipment combinations are impossible.
- A hero never levels past 20; each class feature is unlocked on its pinned ruleset milestone.
- Concentration and other exclusive effects cannot coexist illegally.
- All dungeon seeds yield reachable entrance, objective, boss, and valid exit; key dependencies are acyclic.
- All imports pass schema/licensing checks and cannot inject executable markup/scripts.
- Saving and reloading between two actions yields the **same next deterministic outcome**.

### 12.2 Automated tests

- **Unit tests:** rolls, saves, advantage, resistances, spell slots, class progressions, attack resource costs.
- **Property-based tests:** thousands of generated maps, guaranteed solvable locks, no off-grid movement, bounded loops and rewards.
- **Simulation tests:** auto-play combat against every archetype and tier; watch out for unfair early wipes and endless boss/healing loops.
- **Persistence tests:** version migration, mid-battle resume, browser storage failures, corrupted imports, duplicate reward prevention.
- **Accessibility/UI tests:** keyboard-only play, screen-reader names, text scaling, reduced motion, color-independent status indicators, mobile layout.
- **End-to-end tests:** fresh run -> win -> level -> shop -> next run; die -> roster update; import/export -> identical restored state.

### 12.3 Suggested metrics (targets to tune, not facts)

- Normal-difficulty first biome: **60–80%** successful completion for a well-played fresh level-1 trio after onboarding, depending on target audience.
- Median run length: around **25–35 minutes**; avoid forced filler encounters.
- Fewer than **1 in 1,000** valid seeds should fail generation checks; in practice reject and regenerate any failed map *before* gameplay.
- No level-up or gear choice should be dominated by a universally superior free action/bonus action exploit.
- For each class and tier, at least one meaningful combat decision and one distinct exploration advantage should be demonstrable.

---

## 13. Backlog and deliberate design decisions

### Decisions already recommended

| Question | Recommendation | Why |
|---|---|---|
| D&D rules edition | **SRD 5.2.1** as baseline; optional older-rules compatibility as separate future content | Stable, current licensed baseline; avoid mixing versions |
| Party size | Exactly **3 active heroes**; roster larger at town | Clear classic RPG combat and meaningful swapping between runs |
| Leveling | One level per *successful* boss clear per surviving active hero | Matches your run-based progression concept |
| Death | Death saves in combat; permanent hero death after failure | Stakes without immediate zero-HP deletion |
| Movement | Sparse connected 2D grid; four **relative** movement commands | MUD feel with actual spatial logic |
| Combat positioning | Front/back ranks and target tags | Faster than a full tactical combat grid |
| Hosting | GitHub Pages static site, no mandatory backend | Deployable, cheap, maintainable |
| Saves | IndexedDB + import/export JSON | Local first and realistic about browser limits |
| Content creation | Data-first internal registry, external JSON adapters | Avoid brittle service dependencies |
| Graphics | Original pixel-style panels/portraits, text-led exploration | Old-school feel without copying existing game art |

### Deferred questions, not blockers for the slice

- Should multiclassing be supported in a later rules-expansion milestone?
- Is a `3-hero active, 6 reserve` limit right, or should guild capacity grow beyond that?
- Can a newly encountered ally replace a current active hero in a safe room or only join the town roster on extraction?
- Is retreat possible at any cleared safe room, only at entrance, or via rare consumables?
- Should completing each biome's capstone change the town and ultimately unlock a final metaplot ending?
- What optional original content is desirable beyond SRD (new subclasses, monsters, affixes, factions)?

These are safely configurable and need not delay building the first playable version.

---

## 14. Risks and mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Scope of 12 classes × 20 levels × spells | Very high | Coverage registry, phased classes, separate rules engine, test-driven features |
| External generator lacks stable API or CORS | Medium–high | Build own offline generator; import normalized JSON as optional feature |
| Copyright/licensing gaps | High | Pin SRD; audit all third-party data/assets; original substitute content; attribution |
| High-level class powers break encounters | High | Invariant-tested engine, action-economy limits, simulation, boss telegraphs |
| Procedural maps softlock players | High | Critical-path builder plus solvability validator; alternative puzzle solutions |
| Browser wipes player saves | Medium | JSON backup/export, save slots, storage warnings, no cloud-sync promises |
| Feature-rich combat becomes slow | Medium | Quick command previews, speed controls, readable timeline, fast animation option |
| Save migrations corrupt established rosters | High | Schema versioning, backups before migrations, regression fixtures |
| Art/UI copying famous console RPGs | Medium | Genre-inspired, original assets and layout, no copyrighted franchise elements |

---

## 15. First sprint — implementation-ready user stories

**S1. Seeded run.** As a player, I select a trio and enter a newly generated Cinder Vaults. I can replay a saved seed and find the same layout and original room placement.

**S2. Navigate.** I move forward/left/right/back; facing and grid coordinates update; map tiles uncover; I cannot cross walls.

**S3. Fight.** I encounter monsters and use each hero's Attack, Skills/Magic, Items or Guard menu with resources consumed correctly and enemy turns interleaved by initiative.

**S4. Survive.** I can win, fall to 0 HP, be healed, die after death saves, or wipe; alive/dead states persist correctly.

**S5. Reward.** After a boss defeat I receive exactly one treasure/reward event, gold and level-up for survivors, then return to town.

**S6. Prepare next run.** I buy a potion, change equipment, choose a party, and begin a new scaled dungeon, preserving all prior roster/shop changes.

**S7. Resume.** I close the browser during exploration or between combat actions and resume at the same state with no rerolls or duplicated rewards.

**S8. Publish.** All seven preceding stories work at a GitHub Pages project URL with no application server.

**Definition of playable alpha:** Completing S1–S8 once end-to-end with three starter classes, one biome, basic monsters, one boss and a small shop.

---

## 16. Research references and required credits

Research checked **November 2, 2026**. These are reference and feasibility links, not claims that external services are integrated:

- D&D SRD 5.2.1 and FAQ: https://www.dndbeyond.com/srd
- D&D Creator FAQ / licensing distinction: https://www.dndbeyond.com/creator-faq
- GitHub Pages static-site documentation: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- MDN IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology
- Questforge: https://quests.dnd5e.lockboxx.org/
- Souls Forge: https://items.dnd5e.lockboxx.org/
- Proposed encounter generator (**availability/API not verified**): https://encounters.dnd5e.lockboxx.org/
- D&D 5e API: https://docs.dnd5eapi.co/introduction
- Open5e API: https://open5e.com/api-docs/

**For production:** Add the exact CC BY 4.0 attribution wording required by the version of the SRD actually incorporated, in `LICENSES.md` and a visible game credits/legal screen. Maintain source-specific attribution and license records for all imported content. Verify third-party terms before use.

---

## 17. Final production recommendation

**Build the smallest complete game before the widest rule set.** The first release candidate should be a real downloadable, saveable, GitHub Pages-compatible game: **3 heroes, 1 biome, a grid dungeon, one boss, tactical menu combat, survivor leveling, loot, shopping, and another run**. Once the engine can repeatedly execute that loop with correct state persistence, grow content horizontally (five biomes and quests) and vertically (all supported class features, feats, spells, monsters and levels 1–20).

The long-term game is not just “D&D with Final Fantasy menus.” Its distinctive system is the combination of **procedural MUD-like navigation, crunchy three-hero character builds, transparent initiative combat, themed environmental systems, mortal roster continuity, and rules-aware level scaling**. All are achievable in a static browser game if the rules engine and content generators are kept separate from the UI and any external services.
