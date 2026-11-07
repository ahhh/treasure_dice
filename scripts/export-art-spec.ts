/**
 * Export every image the game wants as art/spec.json for the image pipeline
 * (~/Programming/image_gen_pipeline/treasure_art). Each entry names its
 * `group` — the house-style family it must match — and a subject.
 *   node scripts/export-art-spec.ts
 */
import { writeFileSync } from 'node:fs';
import { CLASSES } from '../src/content/classes.ts';
import { PORTRAITS } from '../src/content/portraits.ts';
import { MONSTER_LIST } from '../src/content/monsters.ts';
import { BIOMES } from '../src/content/biomes.ts';
import { CHARMS } from '../src/fortune/charms.ts';
import { ITEMS } from '../src/content/items.ts';
import { EVENTS } from '../src/content/events.ts';

interface Entry { key: string; kind: 'portrait' | 'sprite' | 'icon' | 'scene' | 'vignette'; group: string; name: string; subject: string; anchor?: boolean }
const out: Entry[] = [];

for (const p of PORTRAITS) {
  const c = CLASSES[p.classId];
  out.push({ key: p.key, kind: 'portrait', group: `class:${p.classId}`, name: `${c.name} (${p.ancestry})`, subject: `${p.look}. A ${c.name.toLowerCase()} — ${c.summary}`, anchor: p.key.endsWith('_1') });
}

const seenBiome = new Set<string>();
for (const m of MONSTER_LIST) {
  const anchor = !seenBiome.has(m.biome) && m.role !== 'boss';
  if (anchor) seenBiome.add(m.biome);
  out.push({ key: `monsters/${m.biome}_${m.id}`, kind: 'sprite', group: `biome:${m.biome}`, name: m.name, subject: `${m.look}. ${m.flavor}${m.role === 'boss' ? ' It is a towering BOSS: monumental, imposing, filling the frame.' : ''}`, anchor });
}

// Charms whose names the model kept overriding with the rarity's gold-and-gem look.
const CHARM_ART: Record<string, string> = {
  butchersHook: 'a small heavy iron butcher\'s meat hook charm, dark and notched along its curve, hung from a short loop of chain with a red thread wound at the top',
  glassHeart: 'a heart-shaped charm blown from clear, fragile glass, hollow and transparent with a faint pink glow inside and a hairline crack, hung on a thin gold chain',
  paupersCrown: 'a tiny shabby crown made of dented tin and knotted twine, with chipped coloured-glass "jewels", hung on a frayed cord: a beggar-king\'s crown that is somehow precious',
  monolith: 'a tiny standing stone of dark granite, a single tall monolith with faint glowing carved bands and no markings that read as numbers, hung from a gold ring',
  avalanche: 'a small gold idol carved as a cascade of tumbling white stones and snow pouring down a mountainside, rubies set in the rocks',
  idol_verdant: 'a small carved wooden idol of a sleeping forest spirit wrapped in leaves and moss, cradling a green six-sided die marked only with pips, hung on a cord',
  idol_sun: 'a small gold idol of a radiant sun-faced figure holding up a yellow six-sided die marked only with pips, hung on a cord, no tags or letters',
  weightedFate: 'a heavy grey lead die hanging from a silver chain, one corner drilled and plugged with a bead of blue enamel, a small silver weight swinging beneath it',
};
const seenRarity = new Set<string>();
for (const c of CHARMS) {
  const anchor = !seenRarity.has(c.rarity);
  seenRarity.add(c.rarity);
  out.push({ key: `charms/${c.id}`, kind: 'icon', group: `charm:${c.rarity}`, name: c.name, subject: CHARM_ART[c.id] ?? `a magical trinket charm called "${c.name}". Its power: ${c.text.replace(/\{n\}/g, '').replace(/\(Currently.*\)/, '')}`, anchor });
}

// Weapons whose names alone came out as near-duplicates.
const ITEM_ART: Record<string, string> = {
  club: 'a simple wooden cudgel of dark oak, thicker and knotted at the striking end, a leather thong at the grip',
  greatclub: 'a huge two-handed club: a rough-hewn length of knotted oak, swollen at the end and bound with iron bands, no metal head',
  quarterstaff: 'a long plain wooden quarterstaff as tall as a person, smooth ash wood with iron caps at both ends and a cloth-wrapped middle grip, shown diagonally across the frame',
  javelin: 'a light throwing javelin: a slim shaft with a narrow barbed iron point and a leather throwing loop near its balance point',
  morningstar: 'a one-handed morningstar: a stout wooden haft topped directly by a heavy iron ball studded with long spikes, no chain at all',
  greatsword: 'a massive two-handed greatsword, a very long and broad blade, a long two-hand leather grip and a wide straight crossguard, clearly bigger than a longsword',
  warhammer: 'a one-handed war hammer: a small square steel hammer head with a curved spike on the back, on a slim haft',
  handCrossbow: 'a tiny one-handed hand crossbow no bigger than a pistol, compact and elegant with a short curved grip',
  heavyCrossbow: 'a huge heavy crossbow with a thick steel prod, a long stock and a winding crank windlass at the back',
  padded: 'a quilted padded gambeson of off-white cloth with thick diamond stitching and no metal at all',
  leather: 'a simple jerkin of stiff boiled brown leather, laced up the front, no metal plates at all',
  hide: 'crude armour of thick animal hides and fur stitched together with sinew, a shaggy fur collar, no metal',
  ringMail: 'a leather coat sewn all over with rows of large flat iron rings',
  chainMail: 'a long hauberk of fine interlocking chain mail reaching the knees, with a mail hood',
  splint: 'armour of narrow vertical steel strips riveted onto a leather backing, with shoulder guards',
  plate: 'a complete suit of gleaming steel full plate armour with helmet, gauntlets and greaves, standing upright as if on an armour stand',
  breastplate: 'a single polished steel breastplate covering only the chest and belly, leather side straps, no sleeves or shoulders',
  halfPlate: 'half plate armour: a steel breastplate, rounded pauldrons and hip tassets worn over a chain shirt, no leg armour',
  luckstone: 'a smooth, polished river agate stone with a natural pale ring around it, warm to the eye, hung on a leather thong',
  graveCharm: 'a small bone-white charm carved like a tiny gravestone, wrapped in black ribbon with a sprig of dried violets',
  diceOfTheDoor: 'an ancient yellowed bone die, worn smooth, its faces marked only with tiny carved door-shaped arches instead of pips, faintly glowing from inside, hung on an old cord',
  hawkEye: 'a falcon-feather brooch with an amber gem set in it like a hawk\'s golden eye, a tiny hooded falcon head carved in silver above it',
  glassEye: 'a clear glass orb shaped like an eye with a pale blue iris, held in a silver claw pendant, light refracting through it, no numbers or writing',
  antitoxin: 'a small square vial of milky pale-green antidote with a bundle of dried herbs tied around its neck',
  potionGreater: 'a tall teardrop-shaped bottle of glowing crimson healing potion, bigger than a common potion, with a brass collar',
  potionSuperior: 'an ornate faceted crystal flask of radiant ruby-red healing potion inside a gold filigree cage',
  potionSupreme: 'a magnificent gold-and-crystal reliquary bottle of brilliant scarlet healing elixir glowing with inner light, a winged gold stopper',
  hoardTorc: 'a heavy open-ended gold neck torc whose two ends are dragon heads clutching rubies, tiny gold coins clinking from it',
  potionHeroism: 'a slim bottle of shimmering golden potion with a tiny embossed lion crest on the glass and a red ribbon at the neck',
  elixirHealth: 'a small round flask of luminous pale-violet elixir with a silver stopper and flower petals floating inside',
  smokeBomb: 'a round grey clay smoke bomb with a short twisted fuse, wisps of grey smoke curling from it',
  spear: 'a sturdy spear with a broad leaf-shaped steel head, a red tassel below the head, and a long ash shaft',
};
const cat = (k: string, id: string) => k === 'weapon' ? 'weapon' : k === 'armor' || k === 'shield' ? 'armor' : k === 'consumable' ? (id.startsWith('scroll') ? 'scroll' : 'consumable') : 'trinket';
const seenCat = new Set<string>();
for (const d of Object.values(ITEMS)) {
  if (d.legend) continue; // painted below as their own family
  const g = cat(d.kind, d.id);
  const anchor = !seenCat.has(g);
  seenCat.add(g);
  if (d.id === 'thievesTools') { out.push({ key: d.art, kind: 'icon', group: `item:${g}`, name: d.name, subject: "a half-unrolled leather craftsman's pouch of small brass and steel tools: a tiny hammer, a file, tweezers and a little round mirror" }); continue; }
  out.push({ key: d.art, kind: 'icon', group: `item:${g}`, name: d.name, subject: ITEM_ART[d.id] ?? `${d.name}${d.text ? ` — ${d.text}` : ''}${d.weapon ? ` (a ${d.weapon.props.includes('ranged') ? 'ranged' : 'melee'} weapon dealing ${d.weapon.type} damage)` : ''}`, anchor });
}

// Legendaries: one family so they share a heroic finish, each with a concrete subject of its own.
let firstLegend = true;
for (const d of Object.values(ITEMS)) {
  if (!d.legend) continue;
  const what = d.kind === 'weapon' ? 'weapon' : d.kind === 'armor' ? 'suit of armour' : d.kind === 'shield' ? 'shield' : 'wondrous item';
  out.push({ key: d.art, kind: 'icon', group: 'item:legendary', name: d.name, subject: `${d.legend.look}. A one-of-a-kind legendary ${what}, clearly finer and more storied than ordinary gear.`, anchor: firstLegend });
  firstLegend = false;
}

const SCENE_TEXT: Record<string, Record<string, string>> = {
  cinder: { corridor: 'an ash-choked dwarven mine tunnel with rail tracks, iron doors and glowing lava seams', forge: 'a vast molten forge hall with chains, anvils and rivers of lava, a battle arena', vault: 'a treasure vault of iron ingots and gold behind a heat-warped door', boss: 'the Deep Forge: a colossal cathedral-sized furnace with a giant anvil, molten falls and chains' },
  rootbound: { corridor: 'a root-choked mausoleum corridor with bioluminescent mushrooms and cracked tombs', tomb: 'an overgrown burial hall where giant roots split sarcophagi, glowing spores in the air', grove: 'a quiet hidden grove inside a crypt, moss and a glowing pool, treasure among roots', boss: 'the Heartroot: an enormous hollow tree heart inside a necropolis, pulsing green light' },
  drowned: { corridor: 'a flooded library corridor with toppled bookshelves, brass pipes and floating pages', library: 'a sunken reading hall with a brass orrery, waist-deep teal water and drifting ink', pumps: 'a brass pump room with valves, gauges and treasure chests on a dry platform', boss: 'the Drowned Star: a flooded observatory dome where a fallen star glows beneath the water' },
  mirror: { corridor: 'a corridor of mirrors and stained glass reflecting impossible rooms', chapel: 'a shattered chapel of glass with floating shards and prismatic light', lenses: 'a reliquary of giant lenses and crystal cases holding glowing relics', boss: 'the Bright Nave: a vast cathedral of mirrors with a cracked colossal window of light' },
  starfall: { corridor: 'a floating causeway of bones and gravestones drifting through a starfield', graves: 'an ossuary of floating tombs around a small dead star, silent cosmic machinery', orrery: 'a giant brass orrery vault with meteorite treasure and constellations', boss: 'the End of Ages: a ruined temple adrift in a nebula, a black hole swallowing the stars' },
};
for (const [b, scenes] of Object.entries(SCENE_TEXT)) {
  for (const [s, text] of Object.entries(scenes)) {
    out.push({ key: `scenes/${b}_${s}`, kind: 'scene', group: `scene:${b}`, name: `${BIOMES[b as keyof typeof BIOMES].name} — ${s}`, subject: text, anchor: s === 'corridor' });
  }
}
// Room-specific scenes and corridor variants (newer art; the game falls back to the four above).
const ROOM_TEXT: Record<string, Record<string, string>> = {
  cinder: {
    treasure: 'a dwarven strongroom carved into black basalt: an open iron-bound chest spilling gold coins and ingots, lit by a glowing lava seam in the wall',
    elite: 'a scorched duelling pit ringed by cooling lava, a giant cracked anvil in the centre and broken chains hanging from the dark, ominous red light',
    arena2: 'an abandoned ore-sorting hall with huge iron buckets on chains, stone ramps and glowing slag heaps, wide open floor',
    entrance: 'the mouth of a dwarven mine cut into a mountainside, ash drifting over cart rails and a broken iron gate, a warm glow deep within',
    camp: 'a sheltered alcove off a mine tunnel with a small campfire and bedrolls, a cooled lava flow forming a bench',
    shrine: 'a small dwarven shrine to a forge spirit carved into basalt, offering bowls of embers on an anvil altar',
    peddler: "a travelling merchant's covered cart parked at a mine junction, lanterns, crates of curios and dice, nobody in sight",
    corridor2: 'a narrow catwalk of iron grating over a slow glowing magma river',
    corridor3: 'a collapsed dwarven hall with toppled statues and drifts of ash lit by shafts of daylight from a cracked ceiling',
  },
  rootbound: {
    treasure: 'a forgotten tomb-hoard cradled in tree roots: an open stone coffer of gold and jewelled grave-goods glowing under shafts of green light',
    elite: 'a dark round crypt chamber where a single colossal thorned root coils around the walls, toppled grave statues and sickly green spore-light',
    arena2: 'a wide burial nave carpeted with moss and white flowers, roots arching overhead like ribs, cracked tombstones scattered across the floor',
    entrance: 'a moss-swallowed mausoleum gate in an old forest, roots prying the stones apart, light falling through leaves',
    camp: 'a dry hollow beneath a giant root arch with a small campfire and softly glowing mushrooms',
    shrine: 'a forgotten ivy-covered shrine with a weathered stone guardian statue and flowers growing from its cracks',
    peddler: "a merchant's stall built into a hollow tree trunk inside a crypt, hanging lanterns and jars of seeds",
    corridor2: 'a crypt corridor whose floor has become a clear mossy stream with stepping stones',
    corridor3: 'a gallery of moss-covered sarcophagi under a canopy of roots, petals and spores drifting in light',
  },
  drowned: {
    treasure: 'a dry archive alcove above the floodwater: an open brass-bound chest of gold, scroll cases and pearls on a stone shelf, ripples of teal light',
    elite: 'a flooded circular reading room with a huge broken chandelier half-sunk in black water, shelves leaning inward, cold menacing light from below',
    arena2: 'a shallow flooded atrium with drowned reading desks, pillars and a long stone balcony, still water reflecting a glass ceiling',
    entrance: 'the grand stair of a sunken library descending into still teal water between toppled columns',
    camp: 'a dry reading nook on a balcony above flooded stacks, a small oil lamp and folded blankets',
    shrine: 'a small flooded chapel of the archivists with a stone lectern and candles floating on the water',
    peddler: "a merchant's rowing boat moored among floating bookshelves, lanterns and crates aboard",
    corridor2: 'a narrow aisle between towering flooded bookshelves, light rippling across the spines',
    corridor3: 'a brass-piped passage with a soft waterfall of loose pages pouring from a broken ceiling',
  },
  mirror: {
    treasure: 'a glass reliquary: a crystal chest overflowing with gold and prismatic gems on a pedestal, reflected endlessly in surrounding mirrors',
    elite: 'a dusky twilight hall of tall smoky grey-violet mirrors, softly painted, lit mainly by a cold violet glow spilling from one huge cracked mirror at the far end, shards of broken glass scattered across the floor, an uneasy hushed mood but still clearly visible',
    arena2: 'a sunlit glass cloister with tall stained-glass panes casting coloured light across an open marble floor, a few shattered panes',
    entrance: 'a pale crystalline portal in a ruined cloister, daylight refracting into soft rainbows',
    camp: 'a quiet alcove in a glass cathedral, a small campfire reflected endlessly in the mirrored walls',
    shrine: 'a slender white altar holding a floating crystal, petals of light drifting down',
    peddler: "a merchant's stall of hanging mirrors and lenses in a glass gallery",
    corridor2: 'a hall of tall arched mirrors reflecting a sunlit meadow that is not there',
    corridor3: 'a spiral staircase of stained glass rising into white light',
  },
  starfall: {
    treasure: 'a meteorite hoard on a drifting rock: an open star-iron chest of gold and glowing star fragments under a dense field of stars',
    elite: 'a broken ring-shaped platform floating in the void, a huge cracked dark star looming behind it, shards of bone and rock orbiting, ominous light',
    arena2: 'a wide floating plaza of pale stone tiles adrift among clouds, broken columns and a soft violet nebula overhead',
    entrance: 'a ruined stone archway on a floating island at the edge of a starfield, a path of drifting stepping stones',
    camp: 'a small campfire on a floating island of gravestones beneath a vast sky of stars and aurora',
    shrine: 'a lonely observatory shrine with a brass astrolabe and a meteorite altar',
    peddler: "a merchant's cart chained to a drifting rock, star maps and lanterns swaying",
    corridor2: 'a narrow bridge of bone and starlight arcing over a sea of clouds',
    corridor3: 'a cloister of floating tombs orbiting a dim dead star, constellations traced in light',
  },
};
for (const [b, scenes] of Object.entries(ROOM_TEXT)) {
  for (const [s, text] of Object.entries(scenes)) {
    out.push({ key: `scenes/${b}_${s}`, kind: 'scene', group: `scene:${b}`, name: `${BIOMES[b as keyof typeof BIOMES].name} — ${s}`, subject: text });
  }
}

// Event vignettes: the event's own text is the brief, unless it implies a viewer in frame.
const EVENT_ART: Record<string, string> = {
  dicingGhost: 'The Dicing Ghost. The translucent ghost of an old riverboat gambler, a stout grey-whiskered man in a tattered frock coat and battered hat, sits at a table of bone in a candlelit vault, grinning as he rattles a dice cup.',
  woundedStranger: 'A Wounded Adventurer. A stocky middle-aged dwarf woman with short grey-streaked hair, in a rival guild\'s red-and-gold tabard, slumps against a dungeon wall clutching a wound; beside her an empty, torn dice pouch lies open on the floor.',
  trapHall: 'Pressure Plates. An empty stone hall whose floor is a chessboard of square pressure plates, rows of small dark dart holes in both walls, a few old darts and a dropped lantern on the tiles. No people.',
  confessional: 'The Confessional. An empty confessional booth made of black glass standing alone in a white crystal cathedral, a faint violet light glowing behind its lattice, its little door ajar. Nobody inside or nearby.',
  talkingMirror: 'The Talking Mirror. A tall ornate standing mirror in an empty glass cathedral; its surface ripples like water and glows softly, as if about to speak. Nobody stands before it.',
};
const seenEvent = new Set<string>();
for (const ev of Object.values(EVENTS)) {
  const group = `event:${ev.biome}`;
  const anchor = !seenEvent.has(group);
  seenEvent.add(group);
  out.push({ key: `events/${ev.id}`, kind: 'vignette', group, name: ev.title, subject: EVENT_ART[ev.id] ?? `${ev.title}. ${ev.text}`, anchor });
}

// Chronicle illustrations, one per chapter.
const STORY_TEXT: Record<string, string> = {
  prologue: 'a hilltop town at dusk with a great lantern tower; far below in the cliff an ancient stone door with five faintly glowing seals; the faint shape of a five-headed dragon in the clouds',
  cinder: 'a vast dwarven forge hall going cold, ash drifting up through a broken roof into a pale sky, a single lantern lit on a distant hill',
  rootbound: 'the giant hollow heart-tree of a forest necropolis withering, its spores dissolving into motes of light',
  drowned: 'a drained archive vault, an old chart of a great stone door spread on a table, puddles reflecting the sky',
  mirror: "a shattered cathedral of mirrors, shards floating in the air, a white dragon's reflection fading from the glass",
  retreat: "a winding road at dusk leading back to a small hilltop keep with warm lit windows, a dropped lantern and scattered dice beside the road, nobody in sight",
  wipe: "an empty dungeon hall at night, a single guttering lantern on the stone floor beside a broken shield and spilled dice, dust in a shaft of pale light, nobody in sight",
  starfall: "the fifth lantern flaring on a hilltop keep's tower beneath a sky of falling stars",
  finale: 'beyond a colossal opened stone door, a mountain of treasure and the vast silhouette of a five-headed dragon, three tiny adventurers seen from behind',
  epilogue: 'a peaceful hilltop town at dawn with five lanterns burning, flower fields, travellers setting out on a long road',
};
for (const [k, t] of Object.entries(STORY_TEXT)) out.push({ key: `story/${k}`, kind: 'vignette', group: 'story:chronicle', name: k, subject: t, anchor: k === 'prologue' });

const TOWN: Record<string, string> = {
  keep: 'the Lantern Keep: a fortified hilltop town at dusk with a great lantern tower, and in the cliff below it, a mysterious ancient stone door with five carved seals glowing',
  guild: 'a warm adventurers\' guild hall interior with a notice board, banners, a roaring hearth and tables of heroes',
  armory: 'a blacksmith\'s armory with racks of swords, shields and armour, a glowing forge in back',
  apothecary: 'a cosy apothecary shop with shelves of glowing potion bottles, dried herbs and a cauldron',
  enchanter: 'an enchanter\'s tower study with runes floating in the air over an anvil of crystal',
  training: 'an outdoor training yard with practice dummies, an archery range and sparring ring at sunset',
  cartographer: 'a cartographer\'s map room with a huge table map, compasses, candles and five glowing doorways painted on the wall',
  vault: 'an underground bank vault with heavy iron doors, chests of gold and guarded lockboxes',
  door: 'the Sixth Door: a colossal ancient single-slab stone door in a cavern, with five glowing round seals set in a curved arch across its upper half, like five points along a rainbow: two seals on the left, ONE seal at the top centre, two seals on the right, 5 seals in total. Left to right their colours are fiery red, poison green, glowing silver-white (the centre, highest seal), smoky violet, lightning blue, one for each head of the five-headed dragon. No other seals, circles or lights on the door. Golden light glows along the base of the door',
};
for (const [k, t] of Object.entries(TOWN)) out.push({ key: `town/${k}`, kind: 'scene', group: 'scene:town', name: k, subject: t, anchor: k === 'keep' });

writeFileSync('art/spec.json', JSON.stringify({ game: 'treasure_dice', count: out.length, entries: out }, null, 1));
const groups = new Map<string, number>();
for (const e of out) groups.set(e.group, (groups.get(e.group) ?? 0) + 1);
console.log(`${out.length} entries in ${groups.size} groups`);
