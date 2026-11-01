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

interface Entry { key: string; kind: 'portrait' | 'sprite' | 'icon' | 'scene'; group: string; name: string; subject: string; anchor?: boolean }
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

const seenRarity = new Set<string>();
for (const c of CHARMS) {
  const anchor = !seenRarity.has(c.rarity);
  seenRarity.add(c.rarity);
  out.push({ key: `charms/${c.id}`, kind: 'icon', group: `charm:${c.rarity}`, name: c.name, subject: `a magical trinket charm called "${c.name}". Its power: ${c.text.replace(/\{n\}/g, '').replace(/\(Currently.*\)/, '')}`, anchor });
}

const cat = (k: string, id: string) => k === 'weapon' ? 'weapon' : k === 'armor' || k === 'shield' ? 'armor' : k === 'consumable' ? (id.startsWith('scroll') ? 'scroll' : 'consumable') : 'trinket';
const seenCat = new Set<string>();
for (const d of Object.values(ITEMS)) {
  const g = cat(d.kind, d.id);
  const anchor = !seenCat.has(g);
  seenCat.add(g);
  if (d.id === 'thievesTools') { out.push({ key: d.art, kind: 'icon', group: `item:${g}`, name: d.name, subject: "a rolled-up leather locksmith's kit with fine brass picks, tension wrenches and a tiny mirror" }); continue; }
  out.push({ key: d.art, kind: 'icon', group: `item:${g}`, name: d.name, subject: `${d.name}${d.text ? ` — ${d.text}` : ''}${d.weapon ? ` (a ${d.weapon.props.includes('ranged') ? 'ranged' : 'melee'} weapon dealing ${d.weapon.type} damage)` : ''}`, anchor });
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
