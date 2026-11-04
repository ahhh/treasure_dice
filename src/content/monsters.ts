/**
 * Original monsters for the five echoes. Stats are not SRD stat blocks; they
 * are role templates scaled by level (rules/balance.ts) so every biome works
 * from level 1 to 20 with a tiered title, not a 5,000-HP rat (plan §6.1).
 */
import type { BiomeId, DamageType, HexId, MonsterAction } from '../engine/types.ts';
import type { CurseId } from '../fortune/curses.ts';

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

const atk = (id: string, name: string, dmg: number, type: DamageType, weight = 3, extra: Partial<MonsterAction> = {}): MonsterAction => ({ id, name, kind: 'attack', dmg, damageType: type, target: 'single', weight, ...extra });
const save = (id: string, name: string, dmg: number, type: DamageType, ability: MonsterAction['save'], target: MonsterAction['target'], weight = 2, extra: Partial<MonsterAction> = {}): MonsterAction => ({ id, name, kind: 'save', dmg, damageType: type, save: ability, halfOnSave: true, target, weight, ...extra });
const hex = (id: string, name: string, h: HexId, weight = 1.5, text?: string): MonsterAction => ({ id, name, kind: 'hex', hex: h, target: 'self', weight, text });
const heal = (id: string, name: string, dmg: number, weight = 2): MonsterAction => ({ id, name, kind: 'heal', dmg, target: 'ally', weight });

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

export const TRAIT_INFO: Record<MonsterTrait, { name: string; text: string }> = {
  multiattack: { name: 'Multiattack', text: 'Its attacks strike several times.' },
  uncannyDodge: { name: 'Uncanny Dodge', text: 'Halves the first hit it takes each round.' },
  magicResist: { name: 'Magic Resistance', text: 'Advantage on saving throws.' },
  retaliate: { name: 'Retaliation', text: 'Strikes back at anyone who hits it in melee.' },
  deathburst: { name: 'Death Burst', text: 'Explodes when it dies, hurting the front rank.' },
  massMend: { name: 'Mass Mending', text: 'Its healing reaches every ally.' },
  frenzy: { name: 'Frenzy', text: 'Hits 30% harder while bloodied.' },
  pack: { name: 'Pack Tactics', text: 'Advantage on attacks while an ally stands in its rank.' },
  lair: { name: 'Lair Actions', text: 'The lair itself strikes at the top of every round.' },
  relentless: { name: 'Relentless', text: 'Often strikes twice in a turn.' },
};

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
    out.push({ id: 'barrage', name: 'Barrage', kind: 'save', dmg: 0.55, damageType: main?.damageType ?? 'force', save: 'dex', halfOnSave: true, target: 'all', weight: 1.6 });
  }
  return out;
}

export const MONSTERS: Record<string, MonsterDef> = {};
const M = (d: MonsterDef) => { MONSTERS[d.id] = d; };

// ── 1. Cinder Vaults ─────────────────────────────────────────────────────────
M({ id: 'sootGoblin', name: 'Soot Goblin', biome: 'cinder', role: 'skirmisher', rank: 'front', tags: ['humanoid', 'goblinoid'], maxLevel: 14,
  actions: [atk('shiv', 'Soot Shiv', 1, 'slashing'), hex('pilfer', 'Pilfer', 'pilfer', 1.2)],
  flavor: 'Quick hands, sooty grins, and a nose for your dice.', look: 'a wiry soot-blackened goblin miner with a jagged knife, ember-lit eyes and a sack of stolen dice' });
M({ id: 'emberImp', name: 'Ember Imp', biome: 'cinder', role: 'artillery', rank: 'back', tags: ['fiend'], resist: ['fire'], immune: ['fire'], vuln: ['cold'],
  actions: [atk('emberBolt', 'Ember Bolt', 1.1, 'fire', 3, { ranged: true }), hex('jinx', 'Jinx', 'jinx', 1.2)],
  flavor: 'A cackling spark with a grudge against good fortune.', look: 'a tiny winged fire imp made of glowing coals, cackling, flinging a bolt of flame' });
M({ id: 'slagHound', name: 'Slag Hound', biome: 'cinder', role: 'brute', rank: 'front', tags: ['beast'], resist: ['fire'],
  actions: [atk('bite', 'Molten Bite', 1.2, 'fire', 3), { id: 'lunge', name: 'Burning Lunge', kind: 'condition', dmg: 0.7, damageType: 'fire', target: 'single', weight: 1.5, condition: { id: 'burning', rounds: 2, value: 3 } }],
  flavor: 'Its hide is cooling slag; its bite is not.', look: 'a hulking hound with a hide of cracked cooling slag and magma glowing through the cracks, jaws dripping molten metal' });
M({ id: 'forgeAutomaton', name: 'Forge Automaton', biome: 'cinder', role: 'defender', rank: 'front', tags: ['construct'], resist: ['fire', 'poison', 'piercing'], vuln: ['lightning'],
  actions: [atk('hammer', 'Anvil Fist', 1, 'bludgeoning', 3), { id: 'guard', name: 'Bulwark Stance', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 1, value: 2 } }],
  flavor: 'Built to guard the forge long after the smiths were gone.', look: 'a squat iron forge automaton with a furnace belly, riveted plates and anvil fists' });
M({ id: 'ashCultist', name: 'Ash Cultist', biome: 'cinder', role: 'healer', rank: 'back', tags: ['humanoid'],
  actions: [atk('cinderLash', 'Cinder Lash', 0.8, 'fire', 2, { ranged: true }), heal('ashMend', 'Ash Mending', 1.5), hex('curse', 'Brand of Ash', 'curseFace', 1)],
  flavor: 'Robed in grey, chanting to a furnace god.', look: 'a hooded ash-grey cultist with a smouldering censer and soot-painted face' });
M({ id: 'magmaOoze', name: 'Magma Ooze', biome: 'cinder', role: 'brute', rank: 'front', tags: ['ooze'], immune: ['fire'], resist: ['slashing'],
  actions: [atk('engulf', 'Engulf', 1.3, 'fire', 3), save('spatter', 'Spatter', 0.8, 'fire', 'dex', 'front', 1.5)],
  flavor: 'It remembers being a mountain.', look: 'a glistening blob of bright orange magma with half-melted weapons floating inside' });
M({ id: 'forgemaster', name: 'The Forgemaster', biome: 'cinder', role: 'boss', rank: 'front', tags: ['construct'], resist: ['fire', 'poison'], vuln: ['cold'],
  actions: [atk('slam', 'Hammerfall', 1.1, 'bludgeoning', 3), save('quench', 'Slag Wave', 0.9, 'fire', 'dex', 'all', 2, { telegraph: true }), { id: 'reforge', name: 'Reforge', kind: 'heal', dmg: 2, target: 'self', weight: 1, phase: 2 }, hex('seal', 'Molten Seal', 'curseFace', 1)],
  boss: { curse: 'molten', phases: 2, title: 'Warden of the Deep Forge', intro: 'Bellows breathe. A giant of black iron lifts its hammer.' },
  flavor: 'A colossal smith-engine that still keeps the forge lit.', look: 'a towering black-iron forge golem with a furnace chest, a giant hammer, chains and bellows, molten light pouring from its seams' });
M({ id: 'ashHydra', name: 'Ash Hydra', biome: 'cinder', role: 'boss', rank: 'front', tags: ['monstrosity'], resist: ['fire'],
  actions: [atk('bites', 'Five Heads', 0.7, 'piercing', 4, { target: 'front' }), save('ashBreath', 'Ash Breath', 0.9, 'fire', 'con', 'all', 2, { telegraph: true }), { id: 'regrow', name: 'Regrow Head', kind: 'heal', dmg: 1.5, target: 'self', weight: 1, phase: 2 }],
  boss: { curse: 'ashen', phases: 2, title: 'The Many-Throated', intro: 'Five necks of cinder rise from the ash pit.' },
  flavor: 'Every head you cut grows back hotter.', look: 'a five-headed hydra of charcoal scales and glowing ember throats rising from an ash pit' });
M({ id: 'boundEmber', name: 'The Bound Ember', biome: 'cinder', role: 'boss', rank: 'back', tags: ['elemental'], immune: ['fire', 'poison'], vuln: ['cold'],
  actions: [atk('flare', 'Solar Flare', 1.2, 'fire', 3, { ranged: true }), save('nova', 'Nova', 1.1, 'fire', 'dex', 'all', 2, { telegraph: true }), hex('thorns', 'Searing Grip', 'drain', 1.5)],
  boss: { curse: 'thorns', phases: 2, title: 'Fire in Chains', intro: 'Chained in runes, a living star strains against its prison.' },
  flavor: 'A fire elemental chained beneath the vaults for an age.', look: 'a blazing fire elemental bound by glowing runic chains, a white-hot core and a crown of flame' });

// ── 2. Rootbound Halls ───────────────────────────────────────────────────────
M({ id: 'sporeling', name: 'Sporeling', biome: 'rootbound', role: 'minion', rank: 'front', tags: ['plant'], resist: ['poison'], maxLevel: 14,
  actions: [atk('headbutt', 'Cap Bash', 1, 'bludgeoning', 3), { id: 'puff', name: 'Spore Puff', kind: 'condition', dmg: 0.4, damageType: 'poison', target: 'single', weight: 1.5, save: 'con', condition: { id: 'poisoned', rounds: 2 } }],
  flavor: 'Waddling mushrooms with a toxic sneeze.', look: 'a waddling knee-high mushroom creature with a spotted cap, puffing a cloud of glowing spores' });
M({ id: 'mossWight', name: 'Moss Wight', biome: 'rootbound', role: 'brute', rank: 'front', tags: ['undead'], resist: ['necrotic', 'poison'], vuln: ['radiant', 'fire'],
  actions: [atk('drain', 'Life Drain', 1.2, 'necrotic', 3), atk('claw', 'Root Claw', 1, 'slashing', 2)],
  flavor: 'A mausoleum knight wrapped in moss and grave-roots.', look: 'an undead knight overgrown with moss and roots, hollow green-glowing eyes and a rusted blade' });
M({ id: 'thornSprite', name: 'Thorn Sprite', biome: 'rootbound', role: 'artillery', rank: 'back', tags: ['fey'],
  actions: [atk('dart', 'Thorn Dart', 1.1, 'piercing', 3, { ranged: true }), hex('jinx', 'Hex of Brambles', 'jinx', 1.2)],
  flavor: 'Giggling fey that think your luck is their toy.', look: 'a tiny malicious fey sprite with bramble wings and a bow of thorns, glowing pink' });
M({ id: 'vineStrangler', name: 'Vine Strangler', biome: 'rootbound', role: 'controller', rank: 'front', tags: ['plant'], vuln: ['fire'],
  actions: [atk('lash', 'Vine Lash', 0.9, 'bludgeoning', 2), { id: 'grasp', name: 'Strangling Grasp', kind: 'condition', dmg: 0.6, damageType: 'bludgeoning', target: 'single', weight: 2, save: 'str', condition: { id: 'restrained', rounds: 2, saveEnds: true } }],
  flavor: 'The hallway is alive, and it wants to hug you.', look: 'a writhing mass of thick strangling vines with a gaping flower maw at its centre' });
M({ id: 'fungalShaman', name: 'Fungal Shaman', biome: 'rootbound', role: 'healer', rank: 'back', tags: ['plant', 'humanoid'],
  actions: [atk('sporeBolt', 'Spore Bolt', 0.8, 'poison', 2, { ranged: true }), heal('bloom', 'Healing Bloom', 1.5), hex('pilfer', 'Mycelial Theft', 'pilfer', 1)],
  flavor: 'A myconid elder whose staff blooms with healing caps.', look: 'a tall stooped fungus-folk shaman with a glowing mushroom-capped staff and robes of lichen' });
M({ id: 'barkGolem', name: 'Bark Golem', biome: 'rootbound', role: 'defender', rank: 'front', tags: ['construct', 'plant'], resist: ['bludgeoning', 'piercing'], vuln: ['fire'],
  actions: [atk('slam', 'Trunk Slam', 1, 'bludgeoning', 3), { id: 'bark', name: 'Barkskin Grove', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 1, value: 2 } }],
  flavor: 'Old oak shaped into a guardian by forgotten druids.', look: 'a massive golem of living oak bark and roots, moss beard, glowing amber sap eyes' });
M({ id: 'mycelialMonarch', name: 'The Mycelial Monarch', biome: 'rootbound', role: 'boss', rank: 'back', tags: ['plant'], resist: ['poison', 'necrotic'], vuln: ['fire'],
  actions: [save('sporestorm', 'Sporestorm', 0.8, 'poison', 'con', 'all', 2, { telegraph: true, condition: { id: 'poisoned', rounds: 2 } }), atk('tendril', 'Tendril', 1, 'bludgeoning', 3), { id: 'summon', name: 'Spawn Sporelings', kind: 'summon', summon: 'sporeling', target: 'self', weight: 0.9 }],
  boss: { curse: 'barren', phases: 2, title: 'Crown of the Undergrowth', intro: 'The whole hall breathes spores. Something vast is thinking.' },
  flavor: 'A fungal intelligence that rules the halls from a throne of caps.', look: 'a colossal regal fungus monarch on a throne of mushrooms, a crown of glowing caps and a veil of drifting spores' });
M({ id: 'thornKnight', name: 'The Thorn Knight', biome: 'rootbound', role: 'boss', rank: 'front', tags: ['fey', 'humanoid'], resist: ['piercing'],
  actions: [atk('lance', 'Briar Lance', 1.1, 'piercing', 3), save('thicket', 'Thicket', 0.8, 'piercing', 'dex', 'all', 2, { telegraph: true }), { id: 'vow', name: 'Vow of Thorns', kind: 'buff', target: 'self', weight: 1, condition: { id: 'shielded', rounds: 2, value: 3 }, phase: 2 }],
  boss: { curse: 'thorns', phases: 2, title: 'Oathsworn of the Briar', intro: 'A knight in armour of living thorns lowers her lance.' },
  flavor: 'A fey knight sworn to keep the dead asleep.', look: 'a fey knight in armour grown from thorny briars and roses, wielding a briar lance' });
M({ id: 'rootDragon', name: 'The Root Dragon', biome: 'rootbound', role: 'boss', rank: 'front', tags: ['dragon', 'plant'], resist: ['poison'], vuln: ['fire'],
  actions: [atk('bite', 'Heartwood Bite', 1.2, 'piercing', 3), save('breath', 'Rot Breath', 1, 'necrotic', 'con', 'all', 2, { telegraph: true }), atk('tail', 'Tail Sweep', 0.8, 'bludgeoning', 2, { target: 'front' })],
  boss: { curse: 'hunger', phases: 2, title: 'The Hollow Wyrm', intro: 'Roots uncoil into a serpentine shape. Bark-scales creak.' },
  flavor: 'An ancient wyrm that became more tree than dragon.', look: 'a great dragon whose body is twisted roots and bark, with moss wings and glowing green rot breath' });

// ── 3. Drowned Archive ───────────────────────────────────────────────────────
M({ id: 'inkEel', name: 'Ink Eel', biome: 'drowned', role: 'skirmisher', rank: 'front', tags: ['beast'],
  actions: [atk('bite', 'Ink Bite', 1, 'piercing', 3), { id: 'ink', name: 'Ink Cloud', kind: 'condition', target: 'single', weight: 1.5, save: 'con', condition: { id: 'blinded', rounds: 1 } }],
  flavor: 'It swims through the drowned stacks in clouds of black ink.', look: 'a sinuous black eel with glowing glyph markings, trailing clouds of ink through water' });
M({ id: 'drownedScribe', name: 'Drowned Scribe', biome: 'drowned', role: 'controller', rank: 'back', tags: ['undead', 'humanoid'], resist: ['necrotic', 'cold'], vuln: ['radiant'],
  actions: [atk('quill', 'Cursed Quill', 0.9, 'necrotic', 2, { ranged: true }), hex('invert', 'Rewrite Fate', 'invert', 1.4), { id: 'edict', name: 'Edict of Silence', kind: 'condition', target: 'single', weight: 1, save: 'wis', condition: { id: 'incapacitated', rounds: 1 } }],
  flavor: 'Still copying the same page it drowned writing.', look: 'a bloated drowned undead scribe in waterlogged robes with a glowing quill and dripping scrolls' });
M({ id: 'brassCrab', name: 'Brass Crab', biome: 'drowned', role: 'defender', rank: 'front', tags: ['construct'], resist: ['slashing', 'piercing', 'cold'], vuln: ['lightning'],
  actions: [atk('pinch', 'Brass Pincer', 1, 'bludgeoning', 3), { id: 'shell', name: 'Shell Up', kind: 'buff', target: 'self', weight: 1, condition: { id: 'shielded', rounds: 1, value: 4 } }],
  flavor: 'A clockwork librarian\'s guard, barnacled and furious.', look: 'a large clockwork crab of verdigris brass with gears, barnacles and lamp eyes' });
M({ id: 'tideCultist', name: 'Tide Cultist', biome: 'drowned', role: 'healer', rank: 'back', tags: ['humanoid'],
  actions: [atk('trident', 'Coral Trident', 0.9, 'piercing', 2), heal('tide', 'Tidal Blessing', 1.5), hex('drain', 'Undertow', 'drain', 1)],
  flavor: 'Eel-cult priests who sing to the inverted tide.', look: 'a scaled tide cultist with a coral trident, eel-skin robes and a conch' });
M({ id: 'glyphWisp', name: 'Glyph Wisp', biome: 'drowned', role: 'artillery', rank: 'back', tags: ['elemental'], immune: ['lightning'],
  actions: [atk('zap', 'Glyph Bolt', 1.0, 'lightning', 3, { ranged: true }), save('arc', 'Arc Discharge', 0.7, 'lightning', 'dex', 'back', 1.5)],
  flavor: 'A loose letter of power, crackling between the shelves.', look: 'a floating crackling ball of blue lightning shaped like a glowing rune' });
M({ id: 'deepLurker', name: 'Deep Lurker', biome: 'drowned', role: 'brute', rank: 'front', tags: ['monstrosity'], resist: ['cold'],
  actions: [atk('tentacle', 'Crushing Tentacle', 1.25, 'bludgeoning', 3), { id: 'drag', name: 'Drag Under', kind: 'condition', dmg: 0.7, damageType: 'bludgeoning', target: 'single', weight: 1.5, save: 'str', condition: { id: 'restrained', rounds: 1 } }],
  flavor: 'Something with too many arms lives in the reading pool.', look: 'a hulking anglerfish-like lurker with tentacles and a lantern lure, teeth like broken pens' });
M({ id: 'drownedArchivist', name: 'The Drowned Archivist', biome: 'drowned', role: 'boss', rank: 'back', tags: ['undead'], resist: ['necrotic', 'cold'], vuln: ['radiant'],
  actions: [atk('tome', 'Tome Strike', 1, 'force', 3, { ranged: true }), save('erase', 'Erasure', 0.9, 'psychic', 'int', 'all', 2, { telegraph: true }), hex('invert', 'Redaction', 'invert', 1.2), { id: 'summon', name: 'Call the Scribes', kind: 'summon', summon: 'drownedScribe', target: 'self', weight: 0.8 }],
  boss: { curse: 'void', phases: 2, title: 'Keeper of Unwritten Things', intro: 'Pages swirl in the black water. The Archivist turns to your chapter.' },
  flavor: 'It has catalogued every death in the archive. Yours is next.', look: 'a towering drowned lich-librarian with a hood of floating pages, chained tomes and a lantern of drowned starlight' });
M({ id: 'tideOracle', name: 'The Tide Oracle', biome: 'drowned', role: 'boss', rank: 'back', tags: ['monstrosity'], resist: ['cold', 'lightning'],
  actions: [atk('waterLance', 'Water Lance', 1, 'cold', 3, { ranged: true }), save('wave', 'Inverted Tide', 1, 'bludgeoning', 'str', 'all', 2, { telegraph: true, condition: { id: 'prone', rounds: 1 } }), heal('pool', 'Healing Pool', 1.1, 1.4)],
  boss: { curse: 'oddDrown', phases: 2, title: 'She Who Reads the Tide', intro: 'The water rises upward. A blind oracle smiles at you.' },
  flavor: 'A sea-witch who sees futures in reversed tides.', look: 'a blindfolded sea oracle with a fishtail of glowing scales, floating in an upward-falling column of water' });
M({ id: 'armoredLeviathan', name: 'The Armored Leviathan', biome: 'drowned', role: 'boss', rank: 'front', tags: ['construct', 'beast'], resist: ['piercing', 'cold'], vuln: ['lightning'],
  actions: [atk('ram', 'Brass Ram', 1.15, 'bludgeoning', 3), save('surge', 'Pressure Surge', 0.9, 'bludgeoning', 'con', 'all', 2, { telegraph: true }), { id: 'plates', name: 'Seal Plates', kind: 'buff', target: 'self', weight: 1, condition: { id: 'shielded', rounds: 2, value: 3 } }],
  boss: { curse: 'tide', phases: 2, title: 'The Pump-Heart Beast', intro: 'Pistons thunder. A whale of brass and barnacles surfaces.' },
  flavor: 'A great beast caged in brass to drive the archive\'s pumps.', look: 'an enormous armored leviathan encased in brass plating and pistons, barnacled, porthole eyes glowing' });

// ── 4. Mirror Reliquary ──────────────────────────────────────────────────────
M({ id: 'shardStalker', name: 'Shard Stalker', biome: 'mirror', role: 'skirmisher', rank: 'front', tags: ['construct'], vuln: ['bludgeoning', 'thunder'],
  actions: [atk('slice', 'Glass Slice', 1.05, 'slashing', 3), { id: 'bleed', name: 'Splinter', kind: 'condition', dmg: 0.5, damageType: 'slashing', target: 'single', weight: 1.2, condition: { id: 'burning', rounds: 2, value: 2 } }],
  flavor: 'A predator of broken glass that moves between reflections.', look: 'a lean predator made of jagged mirror shards, reflecting distorted faces' });
M({ id: 'mirrorMimic', name: 'Mirror Mimic', biome: 'mirror', role: 'controller', rank: 'front', tags: ['monstrosity'],
  actions: [atk('bite', 'Glass Maw', 1, 'piercing', 3), hex('invert', 'Reversal', 'invert', 1.5)],
  heroic: [{ id: 'swallow', name: 'Swallow Whole', kind: 'condition', dmg: 1.2, damageType: 'piercing', target: 'single', weight: 2, save: 'str', condition: { id: 'restrained', rounds: 2, saveEnds: true } }],
  flavor: 'It looks like you. Then it opens its mouth.', look: 'an ornate standing mirror whose frame is splitting into a toothy maw with a long tongue' });
M({ id: 'prismWisp', name: 'Prism Wisp', biome: 'mirror', role: 'artillery', rank: 'back', tags: ['elemental'], resist: ['radiant'],
  actions: [atk('ray', 'Prism Ray', 1.1, 'radiant', 3, { ranged: true }), { id: 'dazzle', name: 'Dazzle', kind: 'condition', target: 'single', weight: 1.2, save: 'con', condition: { id: 'blinded', rounds: 1 } }],
  flavor: 'Light, split and angry.', look: 'a floating crystal prism splitting light into rainbow beams' });
M({ id: 'glassGolem', name: 'Glass Golem', biome: 'mirror', role: 'defender', rank: 'front', tags: ['construct'], resist: ['slashing', 'piercing', 'radiant'], vuln: ['thunder', 'bludgeoning'],
  actions: [atk('fist', 'Crystal Fist', 1, 'bludgeoning', 3), { id: 'reflect', name: 'Mirror Guard', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 1, value: 2 } }],
  flavor: 'A cathedral window that got up and walked.', look: 'a hulking golem made of stained-glass panels with lead seams and a glowing rose window chest' });
M({ id: 'facetCultist', name: 'Facet Cultist', biome: 'mirror', role: 'healer', rank: 'back', tags: ['humanoid'],
  actions: [atk('shard', 'Shard Throw', 0.8, 'piercing', 2, { ranged: true }), heal('mend', 'Mirror Mend', 1.4), hex('jinx', 'Evil Eye', 'jinx', 1.2)],
  flavor: 'Worshippers of the perfect reflection.', look: 'a masked cultist with a faceted mirror mask and robes sewn with glass beads' });
M({ id: 'hollowDouble', name: 'Hollow Double', biome: 'mirror', role: 'brute', rank: 'front', tags: ['humanoid', 'shapechanger'],
  actions: [atk('strike', 'Stolen Strike', 1.25, 'slashing', 3), hex('snuff', 'Pickpocket', 'snuff', 1)],
  flavor: 'Your reflection, hungry and hollow.', look: 'a faceless humanoid made of dark mirror glass, holding a mirror-image sword' });
M({ id: 'prismSentinel', name: 'The Prism Sentinel', biome: 'mirror', role: 'boss', rank: 'front', tags: ['construct'], resist: ['radiant', 'slashing'], vuln: ['thunder'],
  actions: [atk('halberd', 'Refracting Halberd', 1.1, 'radiant', 3), save('lattice', 'Light Lattice', 0.9, 'radiant', 'dex', 'all', 2, { telegraph: true }), hex('invert', 'Mirror Turn', 'invert', 1)],
  boss: { curse: 'evenMirror', phases: 2, title: 'Guardian of the Bright Nave', intro: 'Light bends into a towering knight of crystal.' },
  flavor: 'The reliquary\'s last guardian, built of a thousand lenses.', look: 'a towering crystal knight sentinel of faceted prisms with a halberd of light, rainbow refractions everywhere' });
M({ id: 'shatteredDouble', name: 'The Shattered Double', biome: 'mirror', role: 'boss', rank: 'front', tags: ['shapechanger'],
  actions: [atk('mirrorBlade', 'Mirror Blade', 1.15, 'slashing', 3), save('shatter', 'Shatterburst', 0.9, 'piercing', 'dex', 'all', 2, { telegraph: true }), hex('jinx', 'Your Own Luck', 'jinx', 1.2), { id: 'split', name: 'Split Reflection', kind: 'summon', summon: 'hollowDouble', target: 'self', weight: 0.8, phase: 2 }],
  boss: { curse: 'judgement', phases: 2, title: 'What the Mirror Kept', intro: 'A cracked reflection steps out. It knows every hand you played.' },
  flavor: 'Everything the mirrors ever stole, wearing your face.', look: 'a fractured mirror-glass doppelganger warrior with shards orbiting it, cracks of white light across its body' });
M({ id: 'glassSeraph', name: 'The Glass Seraph', biome: 'mirror', role: 'boss', rank: 'back', tags: ['celestial'], resist: ['radiant'],
  actions: [atk('judgement', 'Lance of Dawn', 1.1, 'radiant', 3, { ranged: true }), save('hymn', 'Shattering Hymn', 1, 'thunder', 'con', 'all', 2, { telegraph: true }), heal('grace', 'False Grace', 1.5)],
  boss: { curse: 'silence', phases: 2, title: 'The Cracked Halo', intro: 'Six wings of stained glass unfold. Silence falls.' },
  flavor: 'An angel of stained glass with a cracked halo.', look: 'a six-winged seraph made of stained glass with a cracked golden halo, radiant and serene' });

// ── 5. Starfall Ossuary ──────────────────────────────────────────────────────
M({ id: 'graveSentinel', name: 'Grave Sentinel', biome: 'starfall', role: 'defender', rank: 'front', tags: ['undead'], resist: ['necrotic', 'piercing'], vuln: ['radiant'],
  actions: [atk('glaive', 'Bone Glaive', 1, 'slashing', 3), { id: 'stand', name: 'Eternal Watch', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 1, value: 2 } }],
  flavor: 'Skeletal guardians of the floating tombs.', look: 'a tall skeletal sentinel in star-etched armour holding a bone glaive, a nebula glowing in its ribcage' });
M({ id: 'voidMote', name: 'Void Mote', biome: 'starfall', role: 'artillery', rank: 'back', tags: ['aberration'], resist: ['force'],
  actions: [atk('pulse', 'Void Pulse', 1.15, 'force', 3, { ranged: true }), hex('drain', 'Entropy', 'drain', 1.2)],
  flavor: 'A pinprick of nothing that eats light.', look: 'a floating orb of absolute black ringed with violet event-horizon light' });
M({ id: 'starboneHound', name: 'Starbone Hound', biome: 'starfall', role: 'brute', rank: 'front', tags: ['undead', 'beast'], resist: ['necrotic', 'cold'], vuln: ['radiant'],
  actions: [atk('bite', 'Comet Bite', 1.25, 'piercing', 3), atk('howl', 'Gravity Howl', 0.6, 'thunder', 1.5, { target: 'front' })],
  flavor: 'A hound of constellations, held together by old light.', look: 'a skeletal hound whose bones are linked by glowing constellation lines, star-fire eyes' });
M({ id: 'cometCultist', name: 'Comet Cultist', biome: 'starfall', role: 'healer', rank: 'back', tags: ['humanoid'],
  actions: [atk('star', 'Falling Star', 0.9, 'fire', 2, { ranged: true }), heal('starlight', 'Starlight Mend', 1.4), hex('snuff', 'Tithe', 'snuff', 1)],
  flavor: 'They pray for the sky to fall again.', look: 'a robed comet cultist with a meteorite staff trailing fire and a star-map cloak' });
M({ id: 'astralLeech', name: 'Astral Leech', biome: 'starfall', role: 'skirmisher', rank: 'front', tags: ['aberration'],
  actions: [atk('latch', 'Latch', 1, 'necrotic', 3), hex('pilfer', 'Siphon Luck', 'pilfer', 1.2)],
  flavor: 'It feeds on luck, then on blood.', look: 'a translucent cosmic leech with a ring of teeth and swirling galaxy innards' });
M({ id: 'orbitWarden', name: 'Orbit Warden', biome: 'starfall', role: 'controller', rank: 'back', tags: ['construct'], resist: ['force'],
  actions: [atk('orb', 'Orbital Strike', 0.9, 'force', 2, { ranged: true }), { id: 'gravity', name: 'Gravity Well', kind: 'condition', target: 'single', weight: 2, save: 'str', condition: { id: 'prone', rounds: 1 } }, hex('invert', 'Turn the Sky', 'invert', 0.8)],
  flavor: 'A brass orrery that commands gravity.', look: 'a floating brass orrery construct with rotating rings and glowing planet orbs' });
M({ id: 'astralJudge', name: 'The Astral Judge', biome: 'starfall', role: 'boss', rank: 'back', tags: ['celestial', 'undead'], resist: ['radiant', 'necrotic'],
  actions: [atk('gavel', 'Gavel of Stars', 1.1, 'force', 3, { ranged: true }), save('verdict', 'Verdict', 1, 'radiant', 'wis', 'all', 2, { telegraph: true }), hex('drain', 'Sentence', 'drain', 1.2)],
  boss: { curse: 'judgement', phases: 2, title: 'Arbiter of the Fallen Sky', intro: 'A skeletal judge in robes of night raises a gavel of starlight.' },
  flavor: 'It weighs every soul that falls from the sky.', look: 'a robed skeletal judge with a crown of orbiting stars, scales of balance and a gavel of starlight' });
M({ id: 'fallenComet', name: 'The Fallen Comet', biome: 'starfall', role: 'boss', rank: 'front', tags: ['elemental'], immune: ['fire'], resist: ['force'],
  actions: [atk('impact', 'Impact', 1.3, 'fire', 3), save('debris', 'Debris Field', 1, 'bludgeoning', 'dex', 'all', 2, { telegraph: true }), hex('jinx', 'Tidal Gravity', 'jinx', 1)],
  boss: { curse: 'gravity', phases: 2, title: 'The Burning Visitor', intro: 'The ceiling is gone. A comet with a mind stares down.' },
  flavor: 'A star that fell and did not die.', look: 'a living molten comet with a rocky face and a long blazing tail, crater-scarred' });
M({ id: 'epochDevourer', name: 'The Epoch Devourer', biome: 'starfall', role: 'boss', rank: 'front', tags: ['aberration'], resist: ['force', 'necrotic'],
  actions: [atk('maw', 'Devouring Maw', 1.2, 'necrotic', 3), save('unmake', 'Unmaking', 1.05, 'force', 'con', 'all', 2, { telegraph: true }), hex('pilfer', 'Eat the Future', 'pilfer', 1), hex('curse', 'Rot the Hours', 'curseFace', 0.8)],
  boss: { curse: 'void', phases: 3, title: 'That Which Ends Ages', intro: 'Time goes thin. Something that eats eras uncurls.' },
  flavor: 'It ate the civilisation that built the ossuary. It is still hungry.', look: 'a vast cosmic serpent-worm of void with clock-faces dissolving in its maw and nebula-filled eyes' });

// ── Greater foes (higher "CR": they join encounters as the party levels) ─────
M({ id: 'cinderGiant', name: 'Cinder Giant', biome: 'cinder', role: 'brute', rank: 'front', tags: ['giant'], resist: ['fire'], vuln: ['cold'], minLevel: 9,
  actions: [atk('maul', 'Furnace Maul', 1.25, 'bludgeoning', 3), save('quake', 'Ember Quake', 0.8, 'fire', 'dex', 'front', 1.5, { condition: { id: 'prone', rounds: 1 } })],
  mythic: [atk('hurl', 'Hurl Slag', 1, 'fire', 1.5, { ranged: true, target: 'single' })],
  flavor: 'The forge-tenders the smiths were afraid of.', look: 'a hulking giant with skin like cooling basalt, magma veins, a soot beard and an enormous furnace-iron maul' });
M({ id: 'pyreDrake', name: 'Pyre Drake', biome: 'cinder', role: 'artillery', rank: 'back', tags: ['dragon'], immune: ['fire'], vuln: ['cold'], minLevel: 13, traits: ['magicResist'],
  actions: [atk('spit', 'Firespit', 1.1, 'fire', 3, { ranged: true }), save('breath', 'Pyre Breath', 0.85, 'fire', 'dex', 'all', 1.6, { condition: { id: 'burning', rounds: 2, value: 4 } })],
  flavor: 'A lean drake that nests in the bellows and breathes the forge\'s heat.', look: 'a lean wingspread fire drake with ember-red scales, smoke curling from its nostrils, perched on a chain over a forge' });
M({ id: 'blightTreant', name: 'Blight Treant', biome: 'rootbound', role: 'defender', rank: 'front', tags: ['plant'], resist: ['bludgeoning', 'piercing', 'poison'], vuln: ['fire'], minLevel: 9,
  actions: [atk('crush', 'Root Crush', 1.1, 'bludgeoning', 3), { id: 'roots', name: 'Grasping Roots', kind: 'condition', dmg: 0.5, damageType: 'bludgeoning', target: 'single', weight: 1.5, save: 'str', condition: { id: 'restrained', rounds: 2, saveEnds: true } }, { id: 'grove', name: 'Blighted Grove', kind: 'buff', target: 'allies', weight: 1, condition: { id: 'shielded', rounds: 2, value: 3 } }],
  flavor: 'A rotting oak-warden that still remembers its oath.', look: 'a towering rotting treant with grey blighted bark, glowing fungal growths and roots tearing up the flagstones' });
M({ id: 'briarHag', name: 'Briar Hag', biome: 'rootbound', role: 'controller', rank: 'back', tags: ['fey'], resist: ['poison'], minLevel: 13,
  actions: [atk('claws', 'Thorn Claws', 1, 'slashing', 2), save('bramble', 'Bramble Curse', 0.7, 'piercing', 'str', 'front', 2, { condition: { id: 'restrained', rounds: 1, saveEnds: true } }), hex('jinx', 'Crooked Luck', 'jinx', 1.4)],
  heroic: [{ id: 'sleepSong', name: 'Lullaby of Rot', kind: 'condition', target: 'single', weight: 1, save: 'wis', condition: { id: 'incapacitated', rounds: 1 } }],
  flavor: 'She trades in luck and pays in thorns.', look: 'a stooped fey hag with bark-like skin, a cloak of brambles and roses, long thorn fingers and one glowing green eye' });
M({ id: 'krakenSpawn', name: 'Kraken Spawn', biome: 'drowned', role: 'brute', rank: 'front', tags: ['monstrosity'], resist: ['cold'], vuln: ['lightning'], minLevel: 9,
  actions: [atk('tentacles', 'Lashing Tentacles', 1.15, 'bludgeoning', 3, { target: 'front' }), { id: 'crush', name: 'Constrict', kind: 'condition', dmg: 0.8, damageType: 'bludgeoning', target: 'single', weight: 1.5, save: 'str', condition: { id: 'restrained', rounds: 2, saveEnds: true } }],
  flavor: 'Young, hungry, and already too big for the reading pool.', look: 'a young kraken with a beaked maw and a dozen barnacled tentacles bursting up through flooded library shelves' });
M({ id: 'sunkenLich', name: 'Sunken Lich', biome: 'drowned', role: 'controller', rank: 'back', tags: ['undead'], resist: ['necrotic', 'cold', 'poison'], vuln: ['radiant'], minLevel: 13, traits: ['magicResist'],
  actions: [atk('touch', 'Drowning Touch', 0.95, 'cold', 3, { ranged: true }), save('wave', 'Black Tide', 0.7, 'necrotic', 'con', 'all', 1.4), { id: 'word', name: 'Word of Stillness', kind: 'condition', target: 'single', weight: 1, save: 'wis', condition: { id: 'incapacitated', rounds: 1 } }],
  mythic: [hex('erase', 'Unwrite', 'invert', 1)],
  flavor: 'A scholar who chose the water over forgetting.', look: 'a gaunt drowned lich in waterlogged scholar robes, kelp in its crown, a phylactery lantern and pages swirling around it' });
M({ id: 'mirrorKnight', name: 'Mirror Knight', biome: 'mirror', role: 'brute', rank: 'front', tags: ['construct'], resist: ['radiant', 'slashing'], vuln: ['thunder', 'bludgeoning'], minLevel: 9,
  actions: [atk('blade', 'Reflected Blade', 1.2, 'slashing', 3), { id: 'mirror', name: 'Mirror Stance', kind: 'buff', target: 'self', weight: 1, condition: { id: 'shielded', rounds: 1, value: 4 } }],
  heroic: [hex('reverse', 'Turn the Blade', 'invert', 1)],
  flavor: 'Armour polished so long it forgot there was a knight inside.', look: 'a tall knight of polished mirror-plate with no one inside, its silvered greatsword reflecting the viewer' });
M({ id: 'facetArchon', name: 'Facet Archon', biome: 'mirror', role: 'healer', rank: 'back', tags: ['celestial'], resist: ['radiant'], minLevel: 13,
  actions: [atk('beam', 'Refracted Beam', 1, 'radiant', 3, { ranged: true }), heal('light', 'Prismatic Renewal', 1.4), { id: 'blind', name: 'Blinding Facet', kind: 'condition', target: 'single', weight: 1.2, save: 'con', condition: { id: 'blinded', rounds: 1 } }],
  flavor: 'An angel of the reliquary, cut like a jewel.', look: 'a floating crystalline angel made of cut gemstone facets with wings of split rainbow light' });
M({ id: 'nebulaWraith', name: 'Nebula Wraith', biome: 'starfall', role: 'skirmisher', rank: 'front', tags: ['undead'], resist: ['necrotic', 'cold', 'force'], vuln: ['radiant'], minLevel: 9,
  actions: [atk('touch', 'Starless Touch', 1.1, 'necrotic', 3), { id: 'chill', name: 'Void Chill', kind: 'condition', dmg: 0.5, damageType: 'cold', target: 'single', weight: 1.5, save: 'con', condition: { id: 'frightened', rounds: 1 } }],
  mythic: [hex('drain', 'Drink the Light', 'drain', 1)],
  flavor: 'A dead astronomer, now mostly the dark between stars.', look: 'a tattered wraith whose body is a swirling violet nebula with pinprick stars, reaching with long shadow claws' });
M({ id: 'starwyrm', name: 'Starwyrm', biome: 'starfall', role: 'artillery', rank: 'back', tags: ['dragon'], resist: ['force', 'radiant', 'cold'], minLevel: 13, traits: ['magicResist'],
  actions: [atk('bite', 'Comet Bite', 1.15, 'piercing', 2), atk('bolt', 'Starbolt', 1.1, 'radiant', 3, { ranged: true }), save('breath', 'Gravity Breath', 0.8, 'force', 'str', 'all', 1.3, { condition: { id: 'prone', rounds: 1 } })],
  flavor: 'A serpent that coils in orbit and breathes falling stars.', look: 'a long serpentine dragon with deep-blue scales dusted with constellations and a mane of trailing comet-light' });

// ── The finale ───────────────────────────────────────────────────────────────
M({ id: 'tiamat', name: 'Tiamat', biome: 'starfall', role: 'boss', rank: 'front', tags: ['dragon', 'fiend'], finale: true,
  resist: ['fire', 'cold', 'lightning', 'acid', 'poison'],
  actions: [
    atk('bites', 'Five-Headed Bite', 0.8, 'piercing', 4, { target: 'front' }),
    atk('tail', 'Tail of the Abyss', 1.2, 'bludgeoning', 2),
    save('redBreath', 'Red Breath', 1, 'fire', 'dex', 'all', 1.4, { telegraph: true }),
    save('blueBreath', 'Blue Breath', 1.1, 'lightning', 'dex', 'back', 1.2, { telegraph: true }),
    save('greenBreath', 'Green Breath', 0.9, 'poison', 'con', 'all', 1.2, { phase: 2 }),
    save('whiteBreath', 'White Breath', 1.1, 'cold', 'con', 'front', 1.2, { phase: 2 }),
    save('blackBreath', 'Black Breath', 1.15, 'acid', 'dex', 'all', 1.4, { phase: 3, telegraph: true }),
    hex('dominion', 'Chromatic Dominion', 'curseFace', 1),
    hex('hoard', 'Claim the Hoard', 'pilfer', 1),
    hex('glare', 'Queen\'s Glare', 'jinx', 0.8),
  ],
  boss: { curse: 'chromatic', phases: 3, hpMult: 1.6, title: 'the Dragon Queen', intro: 'Five heads rise above the hoard. Each breathes a different death.' },
  flavor: 'The five-headed Dragon Queen, sealed behind the Sixth Door for an age, and awake again.',
  look: 'Tiamat, a colossal five-headed chromatic dragon queen with red, blue, green, black and white heads, coiled atop a mountain of gold coins and dice, wings spread' });

export const MONSTER_LIST = Object.values(MONSTERS);

/** A biome's monsters; with `level`, only those whose level band fits. */
export function biomeMonsters(biome: BiomeId, bosses = false, level?: number): MonsterDef[] {
  return MONSTER_LIST.filter((m) => m.biome === biome && !m.finale && (bosses ? m.role === 'boss' : m.role !== 'boss')
    && (level === undefined || ((m.minLevel ?? 1) <= level && level <= (m.maxLevel ?? 20))));
}

export const TIER_TITLES = ['', 'Veteran ', 'Dread ', 'Mythic '];
export function tierIndex(level: number): number {
  return level >= 17 ? 3 : level >= 11 ? 2 : level >= 5 ? 1 : 0;
}
