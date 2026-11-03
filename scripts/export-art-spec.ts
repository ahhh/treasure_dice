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
  spear: 'a sturdy spear with a broad leaf-shaped steel head, a red tassel below the head, and a long ash shaft',
};
const cat = (k: string, id: string) => k === 'weapon' ? 'weapon' : k === 'armor' || k === 'shield' ? 'armor' : k === 'consumable' ? (id.startsWith('scroll') ? 'scroll' : 'consumable') : 'trinket';
const seenCat = new Set<string>();
for (const d of Object.values(ITEMS)) {
  const g = cat(d.kind, d.id);
  const anchor = !seenCat.has(g);
  seenCat.add(g);
  if (d.id === 'thievesTools') { out.push({ key: d.art, kind: 'icon', group: `item:${g}`, name: d.name, subject: "a half-unrolled leather craftsman's pouch of small brass and steel tools: a tiny hammer, a file, tweezers and a little round mirror" }); continue; }
  out.push({ key: d.art, kind: 'icon', group: `item:${g}`, name: d.name, subject: ITEM_ART[d.id] ?? `${d.name}${d.text ? ` — ${d.text}` : ''}${d.weapon ? ` (a ${d.weapon.props.includes('ranged') ? 'ranged' : 'melee'} weapon dealing ${d.weapon.type} damage)` : ''}`, anchor });
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
    entrance: 'the mouth of a dwarven mine cut into a mountainside, ash drifting over cart rails and a broken iron gate, a warm glow deep within',
    camp: 'a sheltered alcove off a mine tunnel with a small campfire and bedrolls, a cooled lava flow forming a bench',
    shrine: 'a small dwarven shrine to a forge spirit carved into basalt, offering bowls of embers on an anvil altar',
    peddler: "a travelling merchant's covered cart parked at a mine junction, lanterns, crates of curios and dice, nobody in sight",
    corridor2: 'a narrow catwalk of iron grating over a slow glowing magma river',
    corridor3: 'a collapsed dwarven hall with toppled statues and drifts of ash lit by shafts of daylight from a cracked ceiling',
  },
  rootbound: {
    entrance: 'a moss-swallowed mausoleum gate in an old forest, roots prying the stones apart, light falling through leaves',
    camp: 'a dry hollow beneath a giant root arch with a small campfire and softly glowing mushrooms',
    shrine: 'a forgotten ivy-covered shrine with a weathered stone guardian statue and flowers growing from its cracks',
    peddler: "a merchant's stall built into a hollow tree trunk inside a crypt, hanging lanterns and jars of seeds",
    corridor2: 'a crypt corridor whose floor has become a clear mossy stream with stepping stones',
    corridor3: 'a gallery of moss-covered sarcophagi under a canopy of roots, petals and spores drifting in light',
  },
  drowned: {
    entrance: 'the grand stair of a sunken library descending into still teal water between toppled columns',
    camp: 'a dry reading nook on a balcony above flooded stacks, a small oil lamp and folded blankets',
    shrine: 'a small flooded chapel of the archivists with a stone lectern and candles floating on the water',
    peddler: "a merchant's rowing boat moored among floating bookshelves, lanterns and crates aboard",
    corridor2: 'a narrow aisle between towering flooded bookshelves, light rippling across the spines',
    corridor3: 'a brass-piped passage with a soft waterfall of loose pages pouring from a broken ceiling',
  },
  mirror: {
    entrance: 'a pale crystalline portal in a ruined cloister, daylight refracting into soft rainbows',
    camp: 'a quiet alcove in a glass cathedral, a small campfire reflected endlessly in the mirrored walls',
    shrine: 'a slender white altar holding a floating crystal, petals of light drifting down',
    peddler: "a merchant's stall of hanging mirrors and lenses in a glass gallery",
    corridor2: 'a hall of tall arched mirrors reflecting a sunlit meadow that is not there',
    corridor3: 'a spiral staircase of stained glass rising into white light',
  },
  starfall: {
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
  door: 'the Fifth Door: a colossal ancient stone door in a cavern, five glowing seals, dice-shaped runes, light spilling through the crack',
};
for (const [k, t] of Object.entries(TOWN)) out.push({ key: `town/${k}`, kind: 'scene', group: 'scene:town', name: k, subject: t, anchor: k === 'keep' });

writeFileSync('art/spec.json', JSON.stringify({ game: 'treasure_dice', count: out.length, entries: out }, null, 1));
const groups = new Map<string, number>();
for (const e of out) groups.set(e.group, (groups.get(e.group) ?? 0) + 1);
console.log(`${out.length} entries in ${groups.size} groups`);
