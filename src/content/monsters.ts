/**
 * Original monsters for the five echoes. Stats are not SRD stat blocks; they
 * are role templates scaled by level (rules/balance.ts) so every biome works
 * from level 1 to 20 with a tiered title, not a 5,000-HP rat (plan §6.1).
 */
import type { BiomeId, DamageType, HexId, MonsterAction } from '../engine/types.ts';
import type { CurseId } from '../fortune/curses.ts';
import { text, textTable, type Textless } from '../i18n/index.ts';

export type Role = 'brute' | 'skirmisher' | 'controller' | 'artillery' | 'healer' | 'defender' | 'minion' | 'boss';

export interface MonsterDef {
  id: string;
  name: string;
  biome: BiomeId;
  role: Role;
  rank: 'front' | 'back';
  tags: string[];
  resist?: DamageType[];
  immune?: DamageType[];
  vuln?: DamageType[];
  actions: MonsterAction[];
  boss?: { curse: CurseId; phases: number; title: string; intro: string; hpMult?: number };
  /** Final-stage boss: never rolled into an ordinary echo. */
  finale?: boolean;
  /** Party level band in which it is rolled into encounters (like a CR band). Summons ignore this. */
  minLevel?: number;
  maxLevel?: number;
  /** Signature traits it always has, on top of its role's tier traits. */
  traits?: MonsterTrait[];
  /** Extra actions it learns at heroic (party level 11+) and mythic (17+) tiers. */
  heroic?: MonsterAction[];
  mythic?: MonsterAction[];
  flavor: string;
  /** Visual description for the art pipeline. */
  look: string;
}

/** Monster text (names, actions, flavour, boss titles) lives in src/locales/<lang>/game.json → monsters.<id>. */
type MonsterTextKey = 'name' | 'text' | 'flavor' | 'title' | 'intro';
type ActionSpec = Textless<MonsterAction, MonsterTextKey>;
const atk = (id: string, dmg: number, type: DamageType, weight = 3, extra: Partial<ActionSpec> = {}): ActionSpec => ({ id, kind: 'attack', dmg, damageType: type, target: 'single', weight, ...extra });
const save = (id: string, dmg: number, type: DamageType, ability: MonsterAction['save'], target: MonsterAction['target'], weight = 2, extra: Partial<ActionSpec> = {}): ActionSpec => ({ id, kind: 'save', dmg, damageType: type, save: ability, halfOnSave: true, target, weight, ...extra });
const hex = (id: string, h: HexId, weight = 1.5): ActionSpec => ({ id, kind: 'hex', hex: h, target: 'self', weight });
const heal = (id: string, dmg: number, weight = 2): ActionSpec => ({ id, kind: 'heal', dmg, target: 'ally', weight });

/**
 * Passive monster traits. Every role picks some up as the party climbs tiers
 * (ROLE_TRAITS), so a level-15 Slag Hound fights differently from a level-3
 * one instead of only having bigger numbers.
 */
export type MonsterTrait =
  | 'multiattack'   // attack actions strike 2× (heroic) or 3× (mythic) at reduced damage each
  | 'uncannyDodge'  // halves the first hero hit it takes each round
  | 'magicResist'   // advantage on saving throws
  | 'retaliate'     // melee attackers take a counter-blow
  | 'deathburst'    // explodes on death, hitting the front rank
  | 'massMend'      // its healing spreads to every ally
  | 'frenzy'        // +30% damage while bloodied (below half HP)
  | 'pack'          // advantage on attacks while an ally shares its rank
  | 'lair'          // boss: a lair action at the top of every round
  | 'relentless';   // boss: may strike again even in phase 1

export const TRAIT_INFO = textTable<Record<MonsterTrait, { name: string; text: string }>, 'name' | 'text'>('game', ['monsterTraits'], {
  multiattack: {},
  uncannyDodge: {},
  magicResist: {},
  retaliate: {},
  deathburst: {},
  massMend: {},
  frenzy: {},
  pack: {},
  lair: {},
  relentless: {},
});

/** Traits each role gains at heroic (index 2: level 11+) and mythic (index 3: level 17+). */
export const ROLE_TRAITS: Record<Role, [MonsterTrait[], MonsterTrait[]]> = {
  brute: [['multiattack'], ['multiattack', 'frenzy']],
  skirmisher: [['uncannyDodge'], ['uncannyDodge', 'pack']],
  controller: [['magicResist'], ['magicResist', 'uncannyDodge']],
  artillery: [[], ['magicResist']],
  healer: [['massMend'], ['massMend', 'magicResist']],
  defender: [['retaliate'], ['retaliate', 'magicResist']],
  minion: [['deathburst'], ['deathburst', 'pack']],
  boss: [['relentless'], ['relentless', 'lair', 'magicResist']],
};

export function monsterTraits(def: MonsterDef, level: number): MonsterTrait[] {
  const t = tierIndex(level);
  const out = new Set<MonsterTrait>(def.traits ?? []);
  if (t >= 2) for (const x of ROLE_TRAITS[def.role][t - 2]) out.add(x);
  return [...out];
}

/** Actions at this level: base kit, tier-unlocked moves, and an artillery barrage from heroic on. */
export function monsterActions(def: MonsterDef, level: number): MonsterAction[] {
  const t = tierIndex(level);
  const out = def.actions.slice();
  if (t >= 2) out.push(...(def.heroic ?? []));
  if (t >= 3) out.push(...(def.mythic ?? []));
  if (t >= 2 && def.role === 'artillery' && !out.some((a) => a.kind === 'save' && a.target === 'all')) {
    const main = def.actions.find((a) => a.kind === 'attack');
    out.push({ id: 'barrage', name: text('game', ['genericActions', 'barrage']), kind: 'save', dmg: 0.55, damageType: main?.damageType ?? 'force', save: 'dex', halfOnSave: true, target: 'all', weight: 1.6 });
  }
  return out;
}

export const MONSTERS: Record<string, MonsterDef> = {};
const M = (d: Textless<MonsterDef, MonsterTextKey>) => { MONSTERS[d.id] = textTable<MonsterDef, MonsterTextKey>('game', ['monsters', d.id], d); };

// ── 1. Cinder Vaults ─────────────────────────────────────────────────────────
M({ id: 'sootGoblin', biome: 'cinder', role: 'skirmisher', rank: 'front', tags: ['humanoid', 'goblinoid'], maxLevel: 14,
  actions: [atk('shiv', 1, 'slashing'), hex('pilfer', 'pilfer', 1.2)],
  look: 'a wiry soot-blackened goblin miner with a jagged knife, ember-lit eyes and a sack of stolen dice' });
M({ id: 'emberImp', biome: 'cinder', role: 'artillery', rank: 'back', tags: ['fiend'], resist: ['fire'], immune: ['fire'], vuln: ['cold'],
  actions: [atk('emberBolt', 1.1, 'fire', 3, { ranged: true }), hex('jinx', 'jinx', 1.2)],
  look: 'a tiny winged fire imp made of glowing coals, cackling, flinging a bolt of flame' });
M({ id: 'slagHound', biome: 'cinder', role: 'brute', rank: 'front', tags: ['beast'], resist: ['fire'],
  actions: [atk('bite', 1.2, 'fire', 3), { id: 'lunge', kind: 'condition', dmg: 0.7, damageType: 'fire', target: 'single', weight: 1.5, condition: { id: 'burning', rounds: 2, value: 3 } }],
  look: 'a hulking hound with a hide of cracked cooling slag and magma glowing through the cracks, jaws dripping molten metal' });
M({ id: 'forgeAutomaton', biome: 'cinder', role: 'defender', rank: 'front', tags: ['construct'], resist: ['fire', 'poison', 'piercing'], vuln: ['lightning'],
  actions: [atk('hammer', 1, 'bludgeoning', 3), { id: 'guard', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 1, value: 2 } }],
  look: 'a squat iron forge automaton with a furnace belly, riveted plates and anvil fists' });
M({ id: 'ashCultist', biome: 'cinder', role: 'healer', rank: 'back', tags: ['humanoid'],
  actions: [atk('cinderLash', 0.8, 'fire', 2, { ranged: true }), heal('ashMend', 1.5), hex('curse', 'curseFace', 1)],
  look: 'a hooded ash-grey cultist with a smouldering censer and soot-painted face' });
M({ id: 'magmaOoze', biome: 'cinder', role: 'brute', rank: 'front', tags: ['ooze'], immune: ['fire'], resist: ['slashing'],
  actions: [atk('engulf', 1.3, 'fire', 3), save('spatter', 0.8, 'fire', 'dex', 'front', 1.5)],
  look: 'a glistening blob of bright orange magma with half-melted weapons floating inside' });
M({ id: 'forgemaster', biome: 'cinder', role: 'boss', rank: 'front', tags: ['construct'], resist: ['fire', 'poison'], vuln: ['cold'],
  actions: [atk('slam', 1.1, 'bludgeoning', 3), save('quench', 0.9, 'fire', 'dex', 'all', 2, { telegraph: true }), { id: 'reforge', kind: 'heal', dmg: 2, target: 'self', weight: 1, phase: 2 }, hex('seal', 'curseFace', 1)],
  boss: { curse: 'molten', phases: 2 },
  look: 'a towering black-iron forge golem with a furnace chest, a giant hammer, chains and bellows, molten light pouring from its seams' });
M({ id: 'ashHydra', biome: 'cinder', role: 'boss', rank: 'front', tags: ['monstrosity'], resist: ['fire'],
  actions: [atk('bites', 0.7, 'piercing', 4, { target: 'front' }), save('ashBreath', 0.9, 'fire', 'con', 'all', 2, { telegraph: true }), { id: 'regrow', kind: 'heal', dmg: 1.5, target: 'self', weight: 1, phase: 2 }],
  boss: { curse: 'ashen', phases: 2 },
  look: 'a five-headed hydra of charcoal scales and glowing ember throats rising from an ash pit' });
M({ id: 'boundEmber', biome: 'cinder', role: 'boss', rank: 'back', tags: ['elemental'], immune: ['fire', 'poison'], vuln: ['cold'],
  actions: [atk('flare', 1.2, 'fire', 3, { ranged: true }), save('nova', 1.1, 'fire', 'dex', 'all', 2, { telegraph: true }), hex('thorns', 'drain', 1.5)],
  boss: { curse: 'thorns', phases: 2 },
  look: 'a blazing fire elemental bound by glowing runic chains, a white-hot core and a crown of flame' });

// ── 2. Rootbound Halls ───────────────────────────────────────────────────────
M({ id: 'sporeling', biome: 'rootbound', role: 'minion', rank: 'front', tags: ['plant'], resist: ['poison'], maxLevel: 14,
  actions: [atk('headbutt', 1, 'bludgeoning', 3), { id: 'puff', kind: 'condition', dmg: 0.4, damageType: 'poison', target: 'single', weight: 1.5, save: 'con', condition: { id: 'poisoned', rounds: 2 } }],
  look: 'a waddling knee-high mushroom creature with a spotted cap, puffing a cloud of glowing spores' });
M({ id: 'mossWight', biome: 'rootbound', role: 'brute', rank: 'front', tags: ['undead'], resist: ['necrotic', 'poison'], vuln: ['radiant', 'fire'],
  actions: [atk('drain', 1.2, 'necrotic', 3), atk('claw', 1, 'slashing', 2)],
  look: 'an undead knight overgrown with moss and roots, hollow green-glowing eyes and a rusted blade' });
M({ id: 'thornSprite', biome: 'rootbound', role: 'artillery', rank: 'back', tags: ['fey'],
  actions: [atk('dart', 1.1, 'piercing', 3, { ranged: true }), hex('jinx', 'jinx', 1.2)],
  look: 'a tiny malicious fey sprite with bramble wings and a bow of thorns, glowing pink' });
M({ id: 'vineStrangler', biome: 'rootbound', role: 'controller', rank: 'front', tags: ['plant'], vuln: ['fire'],
  actions: [atk('lash', 0.9, 'bludgeoning', 2), { id: 'grasp', kind: 'condition', dmg: 0.6, damageType: 'bludgeoning', target: 'single', weight: 2, save: 'str', condition: { id: 'restrained', rounds: 2, saveEnds: true } }],
  look: 'a writhing mass of thick strangling vines with a gaping flower maw at its centre' });
M({ id: 'fungalShaman', biome: 'rootbound', role: 'healer', rank: 'back', tags: ['plant', 'humanoid'],
  actions: [atk('sporeBolt', 0.8, 'poison', 2, { ranged: true }), heal('bloom', 1.5), hex('pilfer', 'pilfer', 1)],
  look: 'a tall stooped fungus-folk shaman with a glowing mushroom-capped staff and robes of lichen' });
M({ id: 'barkGolem', biome: 'rootbound', role: 'defender', rank: 'front', tags: ['construct', 'plant'], resist: ['bludgeoning', 'piercing'], vuln: ['fire'],
  actions: [atk('slam', 1, 'bludgeoning', 3), { id: 'bark', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 1, value: 2 } }],
  look: 'a massive golem of living oak bark and roots, moss beard, glowing amber sap eyes' });
M({ id: 'mycelialMonarch', biome: 'rootbound', role: 'boss', rank: 'back', tags: ['plant'], resist: ['poison', 'necrotic'], vuln: ['fire'],
  actions: [save('sporestorm', 0.8, 'poison', 'con', 'all', 2, { telegraph: true, condition: { id: 'poisoned', rounds: 2 } }), atk('tendril', 1, 'bludgeoning', 3), { id: 'summon', kind: 'summon', summon: 'sporeling', target: 'self', weight: 0.9 }],
  boss: { curse: 'barren', phases: 2 },
  look: 'a colossal regal fungus monarch on a throne of mushrooms, a crown of glowing caps and a veil of drifting spores' });
M({ id: 'thornKnight', biome: 'rootbound', role: 'boss', rank: 'front', tags: ['fey', 'humanoid'], resist: ['piercing'],
  actions: [atk('lance', 1.1, 'piercing', 3), save('thicket', 0.8, 'piercing', 'dex', 'all', 2, { telegraph: true }), { id: 'vow', kind: 'buff', target: 'self', weight: 1, condition: { id: 'shielded', rounds: 2, value: 3 }, phase: 2 }],
  boss: { curse: 'thorns', phases: 2 },
  look: 'a fey knight in armour grown from thorny briars and roses, wielding a briar lance' });
M({ id: 'rootDragon', biome: 'rootbound', role: 'boss', rank: 'front', tags: ['dragon', 'plant'], resist: ['poison'], vuln: ['fire'],
  actions: [atk('bite', 1.2, 'piercing', 3), save('breath', 1, 'necrotic', 'con', 'all', 2, { telegraph: true }), atk('tail', 0.8, 'bludgeoning', 2, { target: 'front' })],
  boss: { curse: 'hunger', phases: 2 },
  look: 'a great dragon whose body is twisted roots and bark, with moss wings and glowing green rot breath' });

// ── 3. Drowned Archive ───────────────────────────────────────────────────────
M({ id: 'inkEel', biome: 'drowned', role: 'skirmisher', rank: 'front', tags: ['beast'],
  actions: [atk('bite', 1, 'piercing', 3), { id: 'ink', kind: 'condition', target: 'single', weight: 1.5, save: 'con', condition: { id: 'blinded', rounds: 1 } }],
  look: 'a sinuous black eel with glowing glyph markings, trailing clouds of ink through water' });
M({ id: 'drownedScribe', biome: 'drowned', role: 'controller', rank: 'back', tags: ['undead', 'humanoid'], resist: ['necrotic', 'cold'], vuln: ['radiant'],
  actions: [atk('quill', 0.9, 'necrotic', 2, { ranged: true }), hex('invert', 'invert', 1.4), { id: 'edict', kind: 'condition', target: 'single', weight: 1, save: 'wis', condition: { id: 'incapacitated', rounds: 1 } }],
  look: 'a bloated drowned undead scribe in waterlogged robes with a glowing quill and dripping scrolls' });
M({ id: 'brassCrab', biome: 'drowned', role: 'defender', rank: 'front', tags: ['construct'], resist: ['slashing', 'piercing', 'cold'], vuln: ['lightning'],
  actions: [atk('pinch', 1, 'bludgeoning', 3), { id: 'shell', kind: 'buff', target: 'self', weight: 1, condition: { id: 'shielded', rounds: 1, value: 4 } }],
  look: 'a large clockwork crab of verdigris brass with gears, barnacles and lamp eyes' });
M({ id: 'tideCultist', biome: 'drowned', role: 'healer', rank: 'back', tags: ['humanoid'],
  actions: [atk('trident', 0.9, 'piercing', 2), heal('tide', 1.5), hex('drain', 'drain', 1)],
  look: 'a scaled tide cultist with a coral trident, eel-skin robes and a conch' });
M({ id: 'glyphWisp', biome: 'drowned', role: 'artillery', rank: 'back', tags: ['elemental'], immune: ['lightning'],
  actions: [atk('zap', 1.0, 'lightning', 3, { ranged: true }), save('arc', 0.7, 'lightning', 'dex', 'back', 1.5)],
  look: 'a floating crackling ball of blue lightning shaped like a glowing rune' });
M({ id: 'deepLurker', biome: 'drowned', role: 'brute', rank: 'front', tags: ['monstrosity'], resist: ['cold'],
  actions: [atk('tentacle', 1.25, 'bludgeoning', 3), { id: 'drag', kind: 'condition', dmg: 0.7, damageType: 'bludgeoning', target: 'single', weight: 1.5, save: 'str', condition: { id: 'restrained', rounds: 1 } }],
  look: 'a hulking anglerfish-like lurker with tentacles and a lantern lure, teeth like broken pens' });
M({ id: 'drownedArchivist', biome: 'drowned', role: 'boss', rank: 'back', tags: ['undead'], resist: ['necrotic', 'cold'], vuln: ['radiant'],
  actions: [atk('tome', 1, 'force', 3, { ranged: true }), save('erase', 0.9, 'psychic', 'int', 'all', 2, { telegraph: true }), hex('invert', 'invert', 1.2), { id: 'summon', kind: 'summon', summon: 'drownedScribe', target: 'self', weight: 0.8 }],
  boss: { curse: 'void', phases: 2 },
  look: 'a towering drowned lich-librarian with a hood of floating pages, chained tomes and a lantern of drowned starlight' });
M({ id: 'tideOracle', biome: 'drowned', role: 'boss', rank: 'back', tags: ['monstrosity'], resist: ['cold', 'lightning'],
  actions: [atk('waterLance', 1, 'cold', 3, { ranged: true }), save('wave', 1, 'bludgeoning', 'str', 'all', 2, { telegraph: true, condition: { id: 'prone', rounds: 1 } }), heal('pool', 1.1, 1.4)],
  boss: { curse: 'oddDrown', phases: 2 },
  look: 'a blindfolded sea oracle with a fishtail of glowing scales, floating in an upward-falling column of water' });
M({ id: 'armoredLeviathan', biome: 'drowned', role: 'boss', rank: 'front', tags: ['construct', 'beast'], resist: ['piercing', 'cold'], vuln: ['lightning'],
  actions: [atk('ram', 1.15, 'bludgeoning', 3), save('surge', 0.9, 'bludgeoning', 'con', 'all', 2, { telegraph: true }), { id: 'plates', kind: 'buff', target: 'self', weight: 1, condition: { id: 'shielded', rounds: 2, value: 3 } }],
  boss: { curse: 'tide', phases: 2 },
  look: 'an enormous armored leviathan encased in brass plating and pistons, barnacled, porthole eyes glowing' });

// ── 4. Mirror Reliquary ──────────────────────────────────────────────────────
M({ id: 'shardStalker', biome: 'mirror', role: 'skirmisher', rank: 'front', tags: ['construct'], vuln: ['bludgeoning', 'thunder'],
  actions: [atk('slice', 1.05, 'slashing', 3), { id: 'bleed', kind: 'condition', dmg: 0.5, damageType: 'slashing', target: 'single', weight: 1.2, condition: { id: 'burning', rounds: 2, value: 2 } }],
  look: 'a lean predator made of jagged mirror shards, reflecting distorted faces' });
M({ id: 'mirrorMimic', biome: 'mirror', role: 'controller', rank: 'front', tags: ['monstrosity'],
  actions: [atk('bite', 1, 'piercing', 3), hex('invert', 'invert', 1.5)],
  heroic: [{ id: 'swallow', kind: 'condition', dmg: 1.2, damageType: 'piercing', target: 'single', weight: 2, save: 'str', condition: { id: 'restrained', rounds: 2, saveEnds: true } }],
  look: 'an ornate standing mirror whose frame is splitting into a toothy maw with a long tongue' });
M({ id: 'prismWisp', biome: 'mirror', role: 'artillery', rank: 'back', tags: ['elemental'], resist: ['radiant'],
  actions: [atk('ray', 1.1, 'radiant', 3, { ranged: true }), { id: 'dazzle', kind: 'condition', target: 'single', weight: 1.2, save: 'con', condition: { id: 'blinded', rounds: 1 } }],
  look: 'a small floating triangular glass prism with no body, no legs and no animal shape, a bright spark of light burning at its core, fanning sharp rainbow beams out of its faces, tiny glass shards orbiting it like moths' });
M({ id: 'glassGolem', biome: 'mirror', role: 'defender', rank: 'front', tags: ['construct'], resist: ['slashing', 'piercing', 'radiant'], vuln: ['thunder', 'bludgeoning'],
  actions: [atk('fist', 1, 'bludgeoning', 3), { id: 'reflect', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 1, value: 2 } }],
  look: 'a hulking golem made of stained-glass panels with lead seams and a glowing rose window chest' });
M({ id: 'facetCultist', biome: 'mirror', role: 'healer', rank: 'back', tags: ['humanoid'],
  actions: [atk('shard', 0.8, 'piercing', 2, { ranged: true }), heal('mend', 1.4), hex('jinx', 'jinx', 1.2)],
  look: 'a masked cultist with a faceted mirror mask and robes sewn with glass beads' });
M({ id: 'hollowDouble', biome: 'mirror', role: 'brute', rank: 'front', tags: ['humanoid', 'shapechanger'],
  actions: [atk('strike', 1.25, 'slashing', 3), hex('snuff', 'snuff', 1)],
  look: 'a faceless humanoid made of dark mirror glass, holding a mirror-image sword' });
M({ id: 'prismSentinel', biome: 'mirror', role: 'boss', rank: 'front', tags: ['construct'], resist: ['radiant', 'slashing'], vuln: ['thunder'],
  actions: [atk('halberd', 1.1, 'radiant', 3), save('lattice', 0.9, 'radiant', 'dex', 'all', 2, { telegraph: true }), hex('invert', 'invert', 1)],
  boss: { curse: 'evenMirror', phases: 2 },
  look: 'a towering crystal knight sentinel of faceted prisms with a halberd of light, rainbow refractions everywhere' });
M({ id: 'shatteredDouble', biome: 'mirror', role: 'boss', rank: 'front', tags: ['shapechanger'],
  actions: [atk('mirrorBlade', 1.15, 'slashing', 3), save('shatter', 0.9, 'piercing', 'dex', 'all', 2, { telegraph: true }), hex('jinx', 'jinx', 1.2), { id: 'split', kind: 'summon', summon: 'hollowDouble', target: 'self', weight: 0.8, phase: 2 }],
  boss: { curse: 'judgement', phases: 2 },
  look: 'a fractured mirror-glass doppelganger warrior with shards orbiting it, cracks of white light across its body' });
M({ id: 'glassSeraph', biome: 'mirror', role: 'boss', rank: 'back', tags: ['celestial'], resist: ['radiant'],
  actions: [atk('judgement', 1.1, 'radiant', 3, { ranged: true }), save('hymn', 1, 'thunder', 'con', 'all', 2, { telegraph: true }), heal('grace', 1.5)],
  boss: { curse: 'silence', phases: 2 },
  look: 'a six-winged seraph made of stained glass with a cracked golden halo, radiant and serene' });

// ── 5. Starfall Ossuary ──────────────────────────────────────────────────────
M({ id: 'graveSentinel', biome: 'starfall', role: 'defender', rank: 'front', tags: ['undead'], resist: ['necrotic', 'piercing'], vuln: ['radiant'],
  actions: [atk('glaive', 1, 'slashing', 3), { id: 'stand', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 1, value: 2 } }],
  look: 'a tall skeletal sentinel in star-etched armour holding a bone glaive, a nebula glowing in its ribcage' });
M({ id: 'voidMote', biome: 'starfall', role: 'artillery', rank: 'back', tags: ['aberration'], resist: ['force'],
  actions: [atk('pulse', 1.15, 'force', 3, { ranged: true }), hex('drain', 'drain', 1.2)],
  look: 'a floating orb of absolute black ringed with violet event-horizon light' });
M({ id: 'starboneHound', biome: 'starfall', role: 'brute', rank: 'front', tags: ['undead', 'beast'], resist: ['necrotic', 'cold'], vuln: ['radiant'],
  actions: [atk('bite', 1.25, 'piercing', 3), atk('howl', 0.6, 'thunder', 1.5, { target: 'front' })],
  look: 'a skeletal hound whose bones are linked by glowing constellation lines, star-fire eyes' });
M({ id: 'cometCultist', biome: 'starfall', role: 'healer', rank: 'back', tags: ['humanoid'],
  actions: [atk('star', 0.9, 'fire', 2, { ranged: true }), heal('starlight', 1.4), hex('snuff', 'snuff', 1)],
  look: 'a robed comet cultist with a meteorite staff trailing fire and a star-map cloak' });
M({ id: 'astralLeech', biome: 'starfall', role: 'skirmisher', rank: 'front', tags: ['aberration'],
  actions: [atk('latch', 1, 'necrotic', 3), hex('pilfer', 'pilfer', 1.2)],
  look: 'a translucent cosmic leech with a ring of teeth and swirling galaxy innards' });
M({ id: 'orbitWarden', biome: 'starfall', role: 'controller', rank: 'back', tags: ['construct'], resist: ['force'],
  actions: [atk('orb', 0.9, 'force', 2, { ranged: true }), { id: 'gravity', kind: 'condition', target: 'single', weight: 2, save: 'str', condition: { id: 'prone', rounds: 1 } }, hex('invert', 'invert', 0.8)],
  look: 'a floating brass orrery construct with rotating rings and glowing planet orbs' });
M({ id: 'astralJudge', biome: 'starfall', role: 'boss', rank: 'back', tags: ['celestial', 'undead'], resist: ['radiant', 'necrotic'],
  actions: [atk('gavel', 1.1, 'force', 3, { ranged: true }), save('verdict', 1, 'radiant', 'wis', 'all', 2, { telegraph: true }), hex('drain', 'drain', 1.2)],
  boss: { curse: 'judgement', phases: 2 },
  look: 'a colossal judge seated on a floating throne of meteorite stone, its deep hood empty except for a single blazing white star where the face should be, flowing robes of living night sky, holding up enormous golden balance scales whose two pans each cradle a tiny glowing planet; no skull, no armour, no staff' });
M({ id: 'fallenComet', biome: 'starfall', role: 'boss', rank: 'front', tags: ['elemental'], immune: ['fire'], resist: ['force'],
  actions: [atk('impact', 1.3, 'fire', 3), save('debris', 1, 'bludgeoning', 'dex', 'all', 2, { telegraph: true }), hex('jinx', 'jinx', 1)],
  boss: { curse: 'gravity', phases: 2 },
  look: 'a living molten comet with a rocky face and a long blazing tail, crater-scarred' });
M({ id: 'epochDevourer', biome: 'starfall', role: 'boss', rank: 'front', tags: ['aberration'], resist: ['force', 'necrotic'],
  actions: [atk('maw', 1.2, 'necrotic', 3), save('unmake', 1.05, 'force', 'con', 'all', 2, { telegraph: true }), hex('pilfer', 'pilfer', 1), hex('curse', 'curseFace', 0.8)],
  boss: { curse: 'void', phases: 3 },
  look: 'a vast cosmic serpent-worm of void with clock-faces dissolving in its maw and nebula-filled eyes' });

// ── Greater foes (higher "CR": they join encounters as the party levels) ─────
M({ id: 'cinderGiant', biome: 'cinder', role: 'brute', rank: 'front', tags: ['giant'], resist: ['fire'], vuln: ['cold'], minLevel: 9,
  actions: [atk('maul', 1.25, 'bludgeoning', 3), save('quake', 0.8, 'fire', 'dex', 'front', 1.5, { condition: { id: 'prone', rounds: 1 } })],
  mythic: [atk('hurl', 1, 'fire', 1.5, { ranged: true, target: 'single' })],
  look: 'a hulking giant with skin like cooling basalt, magma veins, a soot beard and an enormous furnace-iron maul' });
M({ id: 'pyreDrake', biome: 'cinder', role: 'artillery', rank: 'back', tags: ['dragon'], immune: ['fire'], vuln: ['cold'], minLevel: 13, traits: ['magicResist'],
  actions: [atk('spit', 1.1, 'fire', 3, { ranged: true }), save('breath', 0.85, 'fire', 'dex', 'all', 1.6, { condition: { id: 'burning', rounds: 2, value: 4 } })],
  look: 'a lean wingspread fire drake with ember-red scales, smoke curling from its nostrils, perched on a chain over a forge' });
M({ id: 'blightTreant', biome: 'rootbound', role: 'defender', rank: 'front', tags: ['plant'], resist: ['bludgeoning', 'piercing', 'poison'], vuln: ['fire'], minLevel: 9,
  actions: [atk('crush', 1.1, 'bludgeoning', 3), { id: 'roots', kind: 'condition', dmg: 0.5, damageType: 'bludgeoning', target: 'single', weight: 1.5, save: 'str', condition: { id: 'restrained', rounds: 2, saveEnds: true } }, { id: 'grove', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 2, value: 3 } }],
  look: 'a towering rotting treant with grey blighted bark, glowing fungal growths and roots tearing up the flagstones' });
M({ id: 'briarHag', biome: 'rootbound', role: 'controller', rank: 'back', tags: ['fey'], resist: ['poison'], minLevel: 13,
  actions: [atk('claws', 1, 'slashing', 2), save('bramble', 0.7, 'piercing', 'str', 'front', 2, { condition: { id: 'restrained', rounds: 1, saveEnds: true } }), hex('jinx', 'jinx', 1.4)],
  heroic: [{ id: 'sleepSong', kind: 'condition', target: 'single', weight: 1, save: 'wis', condition: { id: 'incapacitated', rounds: 1 } }],
  look: 'a stooped fey hag with bark-like skin, a cloak of brambles and roses, long thorn fingers and one glowing green eye' });
M({ id: 'krakenSpawn', biome: 'drowned', role: 'brute', rank: 'front', tags: ['monstrosity'], resist: ['cold'], vuln: ['lightning'], minLevel: 9,
  actions: [atk('tentacles', 1.15, 'bludgeoning', 3, { target: 'front' }), { id: 'crush', kind: 'condition', dmg: 0.8, damageType: 'bludgeoning', target: 'single', weight: 1.5, save: 'str', condition: { id: 'restrained', rounds: 2, saveEnds: true } }],
  look: 'a young kraken with a beaked maw and a dozen barnacled tentacles bursting up through flooded library shelves' });
M({ id: 'sunkenLich', biome: 'drowned', role: 'controller', rank: 'back', tags: ['undead'], resist: ['necrotic', 'cold', 'poison'], vuln: ['radiant'], minLevel: 13, traits: ['magicResist'],
  actions: [atk('touch', 0.95, 'cold', 3, { ranged: true }), save('wave', 0.7, 'necrotic', 'con', 'all', 1.4), { id: 'word', kind: 'condition', target: 'single', weight: 1, save: 'wis', condition: { id: 'incapacitated', rounds: 1 } }],
  mythic: [hex('erase', 'invert', 1)],
  look: 'a skeletal lich crowned with coral and kelp, levitating cross-legged inside a floating sphere of clear seawater, long drifting drowned hair, a glowing sea-glass phylactery on a chain at its ribs, bony hands weaving a small whirlpool; bare-headed, no hood, no lantern, no books or paper' });
M({ id: 'mirrorKnight', biome: 'mirror', role: 'brute', rank: 'front', tags: ['construct'], resist: ['radiant', 'slashing'], vuln: ['thunder', 'bludgeoning'], minLevel: 9,
  actions: [atk('blade', 1.2, 'slashing', 3), { id: 'mirror', kind: 'buff', target: 'self', weight: 1, condition: { id: 'shielded', rounds: 1, value: 4 } }],
  heroic: [hex('reverse', 'invert', 1)],
  look: 'a tall knight of polished mirror-plate with no one inside, its silvered greatsword reflecting the viewer' });
M({ id: 'facetArchon', biome: 'mirror', role: 'healer', rank: 'back', tags: ['celestial'], resist: ['radiant'], minLevel: 13,
  actions: [atk('beam', 1, 'radiant', 3, { ranged: true }), heal('light', 1.4), { id: 'blind', kind: 'condition', target: 'single', weight: 1.2, save: 'con', condition: { id: 'blinded', rounds: 1 } }],
  look: 'a floating wingless celestial shaped like a huge cut diamond, a calm serene mask-face set into its central facet, four slender crystal arms holding shards of prismatic light, rings of rainbow light orbiting it; abstract and geometric, not a woman, no feathers, no halo' });
M({ id: 'nebulaWraith', biome: 'starfall', role: 'skirmisher', rank: 'front', tags: ['undead'], resist: ['necrotic', 'cold', 'force'], vuln: ['radiant'], minLevel: 9,
  actions: [atk('touch', 1.1, 'necrotic', 3), { id: 'chill', kind: 'condition', dmg: 0.5, damageType: 'cold', target: 'single', weight: 1.5, save: 'con', condition: { id: 'frightened', rounds: 1 } }],
  mythic: [hex('drain', 'drain', 1)],
  look: 'a faceless drifting wraith made of swirling violet and pink nebula gas, an old cracked brass telescope eyepiece glowing where its face should be, a long tail of stardust instead of legs, reaching forward with long shadow claws; no skull, no hood, no robe' });
M({ id: 'starwyrm', biome: 'starfall', role: 'artillery', rank: 'back', tags: ['dragon'], resist: ['force', 'radiant', 'cold'], minLevel: 13, traits: ['magicResist'],
  actions: [atk('bite', 1.15, 'piercing', 2), atk('bolt', 1.1, 'radiant', 3, { ranged: true }), save('breath', 0.8, 'force', 'str', 'all', 1.3, { condition: { id: 'prone', rounds: 1 } })],
  look: 'a long serpentine dragon with deep-blue scales dusted with constellations and a mane of trailing comet-light' });

// ── The finale ───────────────────────────────────────────────────────────────
M({ id: 'tiamat', biome: 'starfall', role: 'boss', rank: 'front', tags: ['dragon', 'fiend'], finale: true,
  resist: ['fire', 'cold', 'lightning', 'acid', 'poison'],
  actions: [
    atk('bites', 0.8, 'piercing', 4, { target: 'front' }),
    atk('tail', 1.2, 'bludgeoning', 2),
    save('redBreath', 1, 'fire', 'dex', 'all', 1.4, { telegraph: true }),
    save('blueBreath', 1.1, 'lightning', 'dex', 'back', 1.2, { telegraph: true }),
    save('greenBreath', 0.9, 'poison', 'con', 'all', 1.2, { phase: 2 }),
    save('whiteBreath', 1.1, 'cold', 'con', 'front', 1.2, { phase: 2 }),
    save('blackBreath', 1.15, 'acid', 'dex', 'all', 1.4, { phase: 3, telegraph: true }),
    hex('dominion', 'curseFace', 1),
    hex('hoard', 'pilfer', 1),
    hex('glare', 'jinx', 0.8),
  ],
  boss: { curse: 'chromatic', phases: 3, hpMult: 1.6 },
    look: 'Tiamat, a colossal five-headed chromatic dragon queen with red, blue, green, black and white heads, coiled atop a mountain of gold coins and dice, wings spread' });

export const MONSTER_LIST = Object.values(MONSTERS);

/** A biome's monsters; with `level`, only those whose level band fits. */
export function biomeMonsters(biome: BiomeId, bosses = false, level?: number): MonsterDef[] {
  return MONSTER_LIST.filter((m) => m.biome === biome && !m.finale && (bosses ? m.role === 'boss' : m.role !== 'boss')
    && (level === undefined || ((m.minLevel ?? 1) <= level && level <= (m.maxLevel ?? 20))));
}

/** "Veteran {name}" etc. by tier (game.json → tierNames). */
export const tierName = (tier: number, name: string) => text('game', ['tierNames', String(tier)], { name });
export function tierIndex(level: number): number {
  return level >= 17 ? 3 : level >= 11 ? 2 : level >= 5 ? 1 : 0;
}
