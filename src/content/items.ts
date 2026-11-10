/** SRD-compatible base items plus original trinkets and affixes. */
import type { Ability, DamageType, HandType, ItemInstance, ItemKind, Material, Rarity, Skill } from '../engine/types.ts';
import { text, textTable, type Textless } from '../i18n/index.ts';

export type WeaponProp = 'finesse' | 'light' | 'heavy' | 'twoHanded' | 'versatile' | 'reach' | 'thrown' | 'ranged' | 'loading' | 'monk';
export type Mastery = 'cleave' | 'graze' | 'nick' | 'push' | 'sap' | 'slow' | 'topple' | 'vex';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  price: number;
  rarity: Rarity;
  art: string;
  text?: string;
  weapon?: { dice: string; type: DamageType; props: WeaponProp[]; mastery: Mastery; martial: boolean; versatile?: string };
  armor?: { base: number; type: 'light' | 'medium' | 'heavy'; dexCap?: number; str?: number };
  shield?: { ac: number };
  trinket?: TrinketMods;
  consumable?: ConsumableDef;
  tool?: 'thieves';
  /** Not sold in town shops. */
  lootOnly?: boolean;
  /** Facility level required to stock it. */
  shopTier?: number;
  /** A one-of-a-kind legendary: never sold, never rolled as ordinary loot, at most one per Keep. */
  legend?: LegendDef;
}

/** Hooks a legendary can carry on top of the trinket mods (which apply from any slot). */
export interface LegendMods extends TrinketMods {
  /** Weapon attacks may use this ability for attack and damage ('spell' = the spellcasting ability). */
  attackAbility?: Ability | 'spell';
  /** Unarmed strikes roll this die (and count as slashing claws with Demon Armor). */
  unarmedDie?: number;
  /** With no body armor: AC = this + DEX. */
  unarmoredBase?: number;
  /** AC bonus only while the off hand holds no shield. */
  acNoShield?: number;
  /** Weapon attacks hit at least this many times per attack action. */
  minAttacks?: number;
  onHit?: { dice: string; type: DamageType }[];
  lifesteal?: number;
  /** Outgoing damage ×(1 + n). */
  dmgPct?: number;
  /** Extra damage ×(1 + n) while at or below half HP. */
  bloodied?: number;
  /** Extra damage ×(1 + n) against elites and bosses. */
  bossDmgPct?: number;
  /** Weapon overkill carries into the next foe. */
  spill?: boolean;
  /** A crit leaves any non-boss foe at or below 25% HP dead. */
  execute?: boolean;
  /** On a kill: heal this fraction of max HP and/or gain rerolls this turn. */
  onKill?: { healPct?: number; rerolls?: number };
  /** Flat bonus to every spell damage roll. */
  spellDmg?: number;
  /** Extra spell slots by level. */
  bonusSlots?: Partial<Record<number, number>>;
  /** Extra uses of class resources (rage, focus, channel, sorcery…). */
  resources?: Record<string, number>;
  /** Healing you give ×(1 + n). */
  healPct?: number;
  /** Healing you receive ×(1 + n) (negative = less). */
  healTakenPct?: number;
  /** Heal this fraction of max HP at the start of each of your turns. */
  regen?: number;
  /** Melee attackers take this × your level in fire damage. */
  thorns?: number;
  /** The first hit you take each fight deals nothing. */
  firstHitImmune?: boolean;
  /** The first time you would drop to 0 HP each fight, you stay at 1. */
  deathWard?: boolean;
  /** Each fight you start hidden (advantage on your first attack). */
  openingHidden?: boolean;
}

export interface LegendDef {
  /** Party level from which it can turn up. */
  level: number;
  /** Where its legend comes from, for the item card. */
  lore: string;
  mods: LegendMods;
  /** Art subject for the image pipeline. */
  look: string;
}

export interface TrinketMods {
  ac?: number;
  saves?: number;
  setAbility?: Partial<Record<Ability, number>>;
  ability?: Partial<Record<Ability, number>>;
  init?: number;
  hpPct?: number;
  spellDc?: number;
  rerolls?: number;
  slotRecover?: number;
  resist?: DamageType[];
  critRange?: number;
  // ── dice hooks ──
  /** Skill proficiency (and a flat bonus) — proficiency unlocks that skill's tray trick. */
  skillProf?: Skill[];
  skillBonus?: Partial<Record<Skill, number>>;
  /** Extra skill tricks per fight. */
  tricks?: number;
  /** Special dice (SPECIAL_DICE ids) added to the bag each expedition. */
  startDice?: string[];
  /** Fortune tokens granted at the start of each expedition. */
  tokens?: string[];
  /** These materials also count as the wearer's colour (+1 Mult each). */
  affinity?: Material[];
  /** Bonus when the wearer plays one of these hands. */
  hand?: { hands: HandType[]; mult?: number; xmult?: number };
  /** Each fight opens with this many Wild ghost dice on the tray. */
  openingWild?: number;
}

export interface ConsumableDef {
  effect: 'heal' | 'cleanse' | 'bomb' | 'holy' | 'scroll' | 'heroism' | 'smoke' | 'elixir' | 'camp' | 'revive' | 'fortune';
  dice?: string;
  damageType?: DamageType;
  spell?: string;
  combat: boolean;
  explore: boolean;
  target: 'self' | 'ally' | 'enemy' | 'enemies' | 'party';
}

const W = (id: string, dice: string, type: DamageType, props: WeaponProp[], mastery: Mastery, martial: boolean, price: number, versatile?: string): ItemSpec => ({
  id, kind: 'weapon', price, rarity: 'common', art: `items/${martial ? 'martial' : 'simple'}_${id}`,
  weapon: { dice, type, props, mastery, martial, versatile },
});
const A = (id: string, base: number, type: 'light' | 'medium' | 'heavy', price: number, dexCap?: number, str?: number): ItemSpec => ({
  id, kind: 'armor', price, rarity: 'common', art: `items/armor_${id}`, armor: { base, type, dexCap, str },
});

export const ITEMS: Record<string, ItemDef> = {};

/** Names, rules text and legend lore live in src/locales/<lang>/game.json → items.<id>. */
export type ItemTextKey = 'name' | 'text' | 'lore';
type ItemSpec = Textless<ItemDef, ItemTextKey>;
const add = (d: ItemSpec) => { ITEMS[d.id] = textTable<ItemDef, ItemTextKey>('game', ['items', d.id], d); };

[
  W('club', '1d4', 'bludgeoning', ['light'], 'slow', false, 1),
  W('dagger', '1d4', 'piercing', ['finesse', 'light', 'thrown'], 'nick', false, 2),
  W('greatclub', '1d8', 'bludgeoning', ['twoHanded'], 'push', false, 2),
  W('handaxe', '1d6', 'slashing', ['light', 'thrown'], 'vex', false, 5),
  W('javelin', '1d6', 'piercing', ['thrown'], 'slow', false, 2),
  W('mace', '1d6', 'bludgeoning', [], 'sap', false, 5),
  W('quarterstaff', '1d6', 'bludgeoning', ['versatile', 'monk'], 'topple', false, 2, '1d8'),
  W('spear', '1d6', 'piercing', ['thrown', 'versatile', 'monk'], 'sap', false, 2, '1d8'),
  W('lightCrossbow', '1d8', 'piercing', ['ranged', 'loading', 'twoHanded'], 'slow', false, 25),
  W('shortbow', '1d6', 'piercing', ['ranged', 'twoHanded'], 'vex', false, 25),
  W('dart', '1d4', 'piercing', ['finesse', 'thrown', 'ranged', 'monk'], 'vex', false, 1),
  W('battleaxe', '1d8', 'slashing', ['versatile'], 'topple', true, 10, '1d10'),
  W('flail', '1d8', 'bludgeoning', [], 'sap', true, 10),
  W('glaive', '1d10', 'slashing', ['heavy', 'reach', 'twoHanded'], 'graze', true, 20),
  W('greataxe', '1d12', 'slashing', ['heavy', 'twoHanded'], 'cleave', true, 30),
  W('greatsword', '2d6', 'slashing', ['heavy', 'twoHanded'], 'graze', true, 50),
  W('halberd', '1d10', 'slashing', ['heavy', 'reach', 'twoHanded'], 'cleave', true, 20),
  W('longsword', '1d8', 'slashing', ['versatile'], 'sap', true, 15, '1d10'),
  W('maul', '2d6', 'bludgeoning', ['heavy', 'twoHanded'], 'topple', true, 10),
  W('morningstar', '1d8', 'piercing', [], 'sap', true, 15),
  W('rapier', '1d8', 'piercing', ['finesse'], 'vex', true, 25),
  W('scimitar', '1d6', 'slashing', ['finesse', 'light'], 'nick', true, 25),
  W('shortsword', '1d6', 'piercing', ['finesse', 'light', 'monk'], 'vex', true, 10),
  W('warhammer', '1d8', 'bludgeoning', ['versatile'], 'push', true, 15, '1d10'),
  W('whip', '1d4', 'slashing', ['finesse', 'reach'], 'slow', true, 2),
  W('handCrossbow', '1d6', 'piercing', ['ranged', 'light', 'loading'], 'vex', true, 75),
  W('heavyCrossbow', '1d10', 'piercing', ['ranged', 'heavy', 'loading', 'twoHanded'], 'push', true, 50),
  W('longbow', '1d8', 'piercing', ['ranged', 'heavy', 'twoHanded'], 'slow', true, 50),
].forEach(add);

[
  A('padded', 11, 'light', 5),
  A('leather', 11, 'light', 10),
  A('studdedLeather', 12, 'light', 45),
  A('hide', 12, 'medium', 10, 2),
  A('chainShirt', 13, 'medium', 50, 2),
  A('scaleMail', 14, 'medium', 50, 2),
  A('breastplate', 14, 'medium', 400, 2),
  A('halfPlate', 15, 'medium', 750, 2),
  A('ringMail', 14, 'heavy', 30, 0),
  A('chainMail', 16, 'heavy', 75, 0, 13),
  A('splint', 17, 'heavy', 200, 0, 15),
  A('plate', 18, 'heavy', 1500, 0, 15),
].forEach(add);
add({ id: 'shield', kind: 'shield', price: 10, rarity: 'common', art: 'items/armor_shield', shield: { ac: 2 } });
add({ id: 'thievesTools', kind: 'trinket', price: 25, rarity: 'common', art: 'items/trinket_thievesTools', tool: 'thieves', trinket: {} });

// Trinkets (attuned accessories). SRD magic items where available, original otherwise.
const T = (id: string, price: number, rarity: Rarity, trinket: TrinketMods, shopTier = 1, lootOnly = false): ItemSpec => ({
  id, kind: 'trinket', price, rarity, art: `items/trinket_${id}`, trinket, shopTier, lootOnly,
});
[
  T('ringProtection', 450, 'rare', { ac: 1, saves: 1 }, 2),
  T('cloakProtection', 400, 'uncommon', { ac: 1, saves: 1 }, 2),
  T('amuletHealth', 1200, 'rare', { setAbility: { con: 19 } }, 3),
  T('gauntletsOgre', 1000, 'uncommon', { setAbility: { str: 19 } }, 3),
  T('headbandIntellect', 1000, 'uncommon', { setAbility: { int: 19 } }, 3),
  T('bracersDefense', 600, 'rare', { ac: 2 }, 2),
  T('pearlPower', 300, 'uncommon', { slotRecover: 3 }, 2),
  T('bootsSpeed', 500, 'rare', { init: 5 }, 2),
  T('periaptWound', 500, 'uncommon', { hpPct: 0.1 }, 2),
  T('luckstone', 350, 'uncommon', { saves: 1, rerolls: 1 }, 1),
  T('emberCharm', 200, 'uncommon', { resist: ['fire'] }, 1),
  T('frostCharm', 200, 'uncommon', { resist: ['cold', 'lightning'] }, 1),
  T('graveCharm', 250, 'uncommon', { resist: ['necrotic', 'poison'] }, 1),
  T('rodPact', 600, 'rare', { spellDc: 1 }, 2),
  T('wandWar', 600, 'rare', { spellDc: 1 }, 2),
  T('hawkEye', 700, 'rare', { critRange: 1 }, 3, true),
  T('diceOfTheDoor', 1500, 'veryRare', { rerolls: 1, saves: 1, ac: 1 }, 4, true),
  T('beltGiant', 2500, 'rare', { setAbility: { str: 21 } }, 4, true),
  // Dice-touched trinkets: skills that unlock tray tricks, dice for the bag, hands and colours.
  T('glovesThievery', 300, 'uncommon', { skillProf: ['sleightOfHand'], skillBonus: { sleightOfHand: 5 } }, 1),
  T('bootsElvenkind', 300, 'uncommon', { skillProf: ['stealth'], skillBonus: { stealth: 5 } }, 1),
  T('eyesEagle', 350, 'uncommon', { skillProf: ['perception'], skillBonus: { perception: 5 } }, 1),
  T('hatDisguise', 350, 'uncommon', { skillProf: ['deception'], skillBonus: { deception: 5 } }, 2),
  T('dossLute', 450, 'uncommon', { skillProf: ['performance'], skillBonus: { performance: 5 }, tricks: 1 }, 2),
  T('iounInsight', 800, 'rare', { skillProf: ['insight'], tricks: 1 }, 3),
  T('bagTricks', 450, 'uncommon', { openingWild: 1 }, 2),
  T('ivoryBones', 350, 'uncommon', { startDice: ['loaded'] }, 1),
  T('goldbugLocket', 250, 'uncommon', { startDice: ['goldbug'] }, 1),
  T('glassEye', 600, 'rare', { startDice: ['glass'] }, 2),
  T('prismShard', 900, 'rare', { startDice: ['prism'] }, 3),
  T('gamblersPurse', 150, 'common', { tokens: ['fateCoin'] }, 1),
  T('encoreHourglass', 700, 'rare', { tokens: ['encore'] }, 3),
  T('boneCirclet', 150, 'common', { affinity: ['bone'] }, 1),
  T('fourWinds', 700, 'rare', { affinity: ['ember', 'frost', 'storm'] }, 2),
  T('twinRing', 400, 'uncommon', { hand: { hands: ['pair', 'twoPair'], mult: 3 } }, 1),
  T('threesBracelet', 450, 'uncommon', { hand: { hands: ['three', 'fullHouse'], mult: 4 } }, 2),
  T('starweave', 1000, 'rare', { hand: { hands: ['straight', 'straightSet'], xmult: 1.5 } }, 3),
  T('hoardTorc', 2400, 'veryRare', { hand: { hands: ['set', 'fullSet', 'hoard'], xmult: 2 } }, 4, true),
].forEach(add);

// Consumables.
const C = (id: string, price: number, rarity: Rarity, consumable: ConsumableDef, shopTier = 0): ItemSpec => ({
  id, kind: 'consumable', price, rarity, art: `items/consumable_${id}`, consumable, shopTier,
});
[
  C('potionHealing', 50, 'common', { effect: 'heal', dice: '2d4+2', combat: true, explore: true, target: 'ally' }),
  C('potionGreater', 150, 'uncommon', { effect: 'heal', dice: '4d4+4', combat: true, explore: true, target: 'ally' }, 1),
  C('potionSuperior', 500, 'rare', { effect: 'heal', dice: '8d4+8', combat: true, explore: true, target: 'ally' }, 2),
  C('potionSupreme', 1350, 'veryRare', { effect: 'heal', dice: '10d4+20', combat: true, explore: true, target: 'ally' }, 3),
  C('antitoxin', 50, 'common', { effect: 'cleanse', combat: true, explore: true, target: 'ally' }),
  C('alchemistsFire', 50, 'common', { effect: 'bomb', dice: '2d6', damageType: 'fire', combat: true, explore: false, target: 'enemy' }),
  C('holyWater', 25, 'common', { effect: 'holy', dice: '2d8', damageType: 'radiant', combat: true, explore: false, target: 'enemy' }),
  C('potionHeroism', 180, 'rare', { effect: 'heroism', combat: true, explore: false, target: 'self' }, 1),
  C('smokeBomb', 40, 'common', { effect: 'smoke', combat: true, explore: false, target: 'party' }),
  C('elixirHealth', 120, 'uncommon', { effect: 'elixir', combat: true, explore: true, target: 'ally' }, 1),
  C('campSupplies', 60, 'common', { effect: 'camp', combat: false, explore: true, target: 'party' }),
  C('diamond', 600, 'rare', { effect: 'revive', combat: false, explore: true, target: 'ally' }, 2),
  C('luckyCharm', 75, 'uncommon', { effect: 'fortune', combat: true, explore: false, target: 'self' }, 1),
  C('scrollCure', 60, 'common', { effect: 'scroll', spell: 'cureWounds', combat: true, explore: true, target: 'ally' }),
  C('scrollFireball', 300, 'uncommon', { effect: 'scroll', spell: 'fireball', combat: true, explore: false, target: 'enemies' }, 2),
  C('scrollShield', 60, 'common', { effect: 'scroll', spell: 'shieldOfFaith', combat: true, explore: false, target: 'ally' }),
  C('scrollRevivify', 400, 'rare', { effect: 'scroll', spell: 'revivify', combat: true, explore: true, target: 'ally' }, 2),
].forEach(add);

// ── affixes (bounded tiers; plan §7.2) ──────────────────────────────────────

export interface AffixDef {
  id: string;
  name: string;
  prefix: boolean;
  kinds: ItemKind[];
  text: string;
  onHit?: { dice: string; type: DamageType };
  ac?: number;
  hpPct?: number;
  init?: number;
  rerolls?: number;
  critRange?: number;
  lifesteal?: number;
  doubloonOnKill?: number;
  resist?: DamageType[];
  minTier: number;
}

export const AFFIXES = textTable<Record<string, AffixDef>, 'name' | 'text'>('game', ['affixes'], {
  flaming: { id: 'flaming', prefix: true, kinds: ['weapon'], onHit: { dice: '1d4', type: 'fire' }, minTier: 0 },
  frost: { id: 'frost', prefix: true, kinds: ['weapon'], onHit: { dice: '1d4', type: 'cold' }, minTier: 0 },
  shocking: { id: 'shocking', prefix: true, kinds: ['weapon'], onHit: { dice: '1d6', type: 'lightning' }, minTier: 1 },
  holy: { id: 'holy', prefix: true, kinds: ['weapon'], onHit: { dice: '1d6', type: 'radiant' }, minTier: 1 },
  keen: { id: 'keen', prefix: true, kinds: ['weapon'], critRange: 1, minTier: 1 },
  vampiric: { id: 'vampiric', prefix: true, kinds: ['weapon'], lifesteal: 0.08, minTier: 2 },
  lucky: { id: 'lucky', prefix: true, kinds: ['weapon', 'trinket', 'armor'], rerolls: 1, minTier: 1 },
  gilded: { id: 'gilded', prefix: true, kinds: ['weapon'], doubloonOnKill: 1, minTier: 0 },
  warding: { id: 'warding', prefix: false, kinds: ['armor', 'shield', 'trinket'], ac: 1, minTier: 1 },
  vitality: { id: 'vitality', prefix: false, kinds: ['armor', 'trinket'], hpPct: 0.1, minTier: 0 },
  swiftness: { id: 'swiftness', prefix: false, kinds: ['armor', 'trinket', 'weapon'], init: 3, minTier: 0 },
  embers: { id: 'embers', prefix: false, kinds: ['armor', 'shield'], resist: ['fire'], minTier: 1 },
  tides: { id: 'tides', prefix: false, kinds: ['armor', 'shield'], resist: ['cold'], minTier: 1 },
});

export function itemName(inst: ItemInstance): string {
  const def = ITEMS[inst.defId];
  if (!def) return inst.defId;
  const pre = inst.affixes.map((a) => AFFIXES[a]).filter((a) => a?.prefix).map((a) => a!.name);
  const suf = inst.affixes.map((a) => AFFIXES[a]).filter((a) => a && !a.prefix).map((a) => a!.name);
  // Word order is the language's: game.json → format.itemName ("{prefix} {name}{plus} {suffix}").
  const plus = inst.plus > 0 ? text('game', ['format', 'itemPlus'], { n: inst.plus }) : '';
  const qty = inst.qty && inst.qty > 1 ? text('game', ['format', 'itemQty'], { n: inst.qty }) : '';
  const name = text('game', ['format', 'itemName'], { prefix: pre.join(' '), name: def.name, plus, suffix: suf.join(' ') });
  return name.replace(/\s+/g, ' ').trim() + qty;
}

export function itemValue(inst: ItemInstance): number {
  const def = ITEMS[inst.defId];
  if (!def) return 0;
  const enchant = [0, 300, 1200, 4000][inst.plus] ?? 0;
  return Math.round((def.price + enchant + inst.affixes.length * 150) * (inst.qty ?? 1));
}

/** Sell for 40% — buy/sell can never loop for profit (plan §7.3). */
export function sellValue(inst: ItemInstance): number {
  return Math.floor(itemValue(inst) * 0.4);
}

export function isTwoHanded(inst?: ItemInstance): boolean {
  return !!inst && !!ITEMS[inst.defId]?.weapon?.props.includes('twoHanded');
}

// ── legendaries ─────────────────────────────────────────────────────────────
// One-of-a-kind items that bend a build. Each turns up from its `level` on
// (boss hoards mostly) and comes pre-enchanted for its tier. Inspired by
// classic wondrous items and anime-style legendary gear; all names original or SRD.

/** Enchantment a legendary carries when found. */
export function legendPlus(def: ItemDef): number {
  if (!def.legend || def.kind === 'trinket') return 0;
  return def.legend.level >= 13 ? 3 : def.legend.level >= 7 ? 2 : 1;
}

const LG = (id: string, base: string | 'trinket', level: number, mods: LegendMods, look: string, armor?: ItemDef['armor']): ItemSpec => {
  const b = base === 'trinket' ? undefined : ITEMS[base];
  return {
    id, kind: b ? b.kind : 'trinket', price: 400 + level * 300, rarity: 'legendary', art: `items/legend_${id}`,
    weapon: b?.weapon, armor: armor ?? b?.armor, shield: b?.shield, trinket: b ? undefined : {}, lootOnly: true,
    legend: { level, mods, look },
  };
};

[
  // ── weapons ──
  LG('ladyLuck', 'rapier', 1, { hand: { hands: ['high'], mult: 4 } }, 'a slender rapier with a swept gold hilt shaped like a coiled ribbon, a single ivory six-sided die set into the pommel, a red tassel'),
  LG('spellthiefKris', 'dagger', 2, { attackAbility: 'spell' }, 'a wavy-bladed kris dagger whose flame-shaped blade is etched with faintly glowing violet arcane circles, a silver hilt wrapped in indigo cord'),
  LG('bloodCleaver', 'greataxe', 4, { bloodied: 0.3, lifesteal: 0.05, ac: -1 }, 'a huge, crude two-handed cleaver-axe of black iron, a single broad slab of a blade with a jagged edge and red veins glowing in the metal, a long bandaged grip'),
  LG('frostbrand', 'longsword', 6, { onHit: [{ dice: '1d6', type: 'cold' }], resist: ['fire'], affinity: ['frost'] }, 'a straight longsword whose blade is clear blue ice-crystal with frost creeping along the edge, a silver crossguard shaped like snowflake points, cold mist trailing from it'),
  LG('starshotBow', 'longbow', 7, { hand: { hands: ['straight', 'straightSet'], xmult: 1.5 }, init: 2 }, 'an elegant white-wood longbow with golden tips curled like crescent moons, a string of faint starlight, tiny stars dotted along the limbs'),
  LG('twinGale', 'scimitar', 8, { minAttacks: 2, dmgPct: -0.15 }, 'a single clearly visible curved scimitar shown whole and diagonally: a broad, strongly curved pale jade-green steel blade, a gold crossguard and a wrapped grip, a short green ribbon at the pommel, with a faint translucent after-image of the same blade offset just behind it like a gust of wind'),
  LG('dragonfang', 'greatsword', 9, { bossDmgPct: 0.25, init: -2 }, 'an enormous, absurdly broad and thick greatsword taller than a man, a plain heavy slab of dark iron with a dragon tooth set into the guard, worn leather grip'),
  LG('earthshaker', 'maul', 10, { onHit: [{ dice: '1d6', type: 'thunder' }], spill: true }, 'a colossal two-handed maul whose head is a block of rough grey mountain stone bound in bronze bands, cracks in the stone glowing amber'),
  LG('stormcaller', 'warhammer', 11, { onHit: [{ dice: '1d8', type: 'lightning' }], resist: ['lightning'], affinity: ['storm'] }, 'a short heavy war hammer with a squat rectangular silver-blue head crackling with small lightning arcs, a short leather-wrapped haft with a wrist strap'),
  LG('moonreaper', 'glaive', 12, { onHit: [{ dice: '1d8', type: 'necrotic' }], lifesteal: 0.12, healTakenPct: -0.5 }, 'a tall glaive with a wide crescent-moon blade of pale silver like a scythe, a black shaft, wisps of violet-black mist curling from the edge'),
  LG('ninelives', 'rapier', 14, { onKill: { healPct: 0.1, rerolls: 1 }, hpPct: -0.1 }, 'a black-steel rapier with a cage-like basket hilt bearing nine small notches, a faint green ghostly glow running down the narrow blade'),
  LG('vorpal', 'longsword', 17, { critRange: 1, execute: true }, 'a gleaming longsword with an impossibly thin, mirror-bright blade that seems to cut the air itself, a simple silver crossguard and a pale blue gem in the pommel'),
  LG('staffMagi', 'quarterstaff', 19, { spellDc: 1, spellDmg: 4, bonusSlots: { 5: 1 } }, 'a tall ancient staff of dark twisted wood crowned by a ring of floating crystal shards orbiting a glowing white orb, silver bands up the shaft'),
  LG('starcleaver', 'longsword', 20, { dmgPct: 0.15, openingWild: 1 }, 'a radiant longsword whose blade is deep night-blue metal filled with tiny shining stars and a nebula swirl, a golden crossguard shaped like spread wings'),

  // ── armor and shields ──
  LG('glamouredLeather', 'studdedLeather', 1, { skillProf: ['deception'], skillBonus: { deception: 3 }, init: 1 }, 'an elegant fitted coat of dark studded leather that shimmers between plain armour and a fancy embroidered burgundy doublet, silver studs'),
  LG('mithralShirt', 'chainShirt', 3, {}, 'a shirt of very fine bright silvery mithral chain links that drapes like cloth, gleaming almost white', { base: 13, type: 'light' }),
  LG('sentinelShield', 'shield', 4, { init: 4, skillProf: ['perception'] }, 'a round wooden shield with a bronze rim, a large watchful painted eye in the centre that glows faintly gold'),
  LG('dragonscale', 'scaleMail', 5, { resist: ['fire'], affinity: ['ember'] }, 'a coat of overlapping large crimson dragon scales with a dark leather lining and a high scaled collar, glinting like embers'),
  LG('demonArmor', 'plate', 8, { unarmedDie: 8, saves: -1 }, 'a suit of black spiked full plate armour with horned helmet, the gauntlets ending in long curved claws, faint red light from the visor slits'),
  LG('invulnerable', 'plate', 12, { firstHitImmune: true }, 'a suit of pale grey full plate with smooth flawless rounded plates like polished river stone, a faint protective shimmer over the surface'),
  LG('wolfPelt', 'hide', 13, { resources: { rage: 1 }, regen: 0.03 }, 'a huge white wolf pelt worn as a hooded mantle over hide armour, the wolf\'s head forming the hood, bone toggles and blue war-paint marks'),
  LG('efreetiChain', 'chainMail', 15, { resist: ['fire'], thorns: 1 }, 'a hauberk of glowing brass-gold chain mail with small flames licking between the links, an ornate brass collar'),
  LG('dawnPlate', 'plate', 16, { deathWard: true, healTakenPct: 0.25 }, 'a suit of white-and-gold full plate with a sunburst on the breastplate, a long white tabard and small gold wings on the helmet'),
  LG('dragonboneAegis', 'shield', 18, { resist: ['acid', 'cold', 'fire', 'lightning', 'poison'], init: -2 }, 'a large kite shield carved from a single pale dragon skull-plate, five small coloured gems (red, green, blue, white, black) set in a ring'),

  // ── trinkets ──
  LG('foxMask', 'trinket', 3, { openingWild: 1, skillProf: ['deception'] }, 'a white lacquered fox-face mask with red swirling markings and gold-tipped ears, a red cord tied at the back'),
  LG('ringSpellStoring', 'trinket', 5, { bonusSlots: { 1: 1, 2: 1 } }, 'a thick silver ring set with a large sapphire in which tiny swirling sparks of magic are trapped'),
  LG('robeStars', 'trinket', 6, { spellDmg: 2, saves: 1 }, 'a folded deep-blue velvet wizard\'s robe embroidered with silver stars and constellations that twinkle'),
  LG('capeMountebank', 'trinket', 9, { openingHidden: true }, 'a flamboyant short cape, black outside and bright crimson inside, a puff of purple smoke curling from its hem, a gold clasp'),
  LG('animatedShield', 'trinket', 10, { acNoShield: 2 }, 'a round steel shield floating in the air by itself, faint blue magic glow around its rim, a stylised wing emblem'),
  LG('ringRegeneration', 'trinket', 11, { regen: 0.04 }, 'a gold ring shaped like a green vine wrapped around the finger, a small emerald bud with a glowing green leaf'),
  LG('hundredFists', 'trinket', 12, { unarmedDie: 10, resources: { focus: 2 } }, 'a pair of red cloth hand-wraps with steel knuckle plates, wisps of white ki energy and blurred after-images of fists around them'),
  LG('saintRosary', 'trinket', 13, { healPct: 0.3, resources: { channel: 1 } }, 'a long string of pearl prayer beads with a small golden sunburst pendant glowing softly'),
  LG('hellfireContract', 'trinket', 14, { dmgPct: 0.12, spellDc: 1, hpPct: -0.15 }, 'a rolled black parchment contract sealed with a red wax seal shaped like a horned skull, edges smouldering with tiny flames, abstract marks only'),
  LG('hollowEye', 'trinket', 16, { critRange: 1, spellDc: 1, hpPct: -0.1 }, 'a withered amber-gold eyeball set in a black iron claw pendant, its slit pupil glowing violet'),
  LG('robeArchmagi', 'trinket', 18, { unarmoredBase: 15, spellDc: 2 }, 'a folded flowing robe of white and silver silk with glowing arcane sigil embroidery along the hems, faint light rising from it'),
  LG('dragonOrb', 'trinket', 20, { affinity: ['ember', 'verdant', 'shadow', 'frost', 'storm'] }, 'a crystal orb held in a gold dragon-claw stand, five swirling coloured mists inside it: red, green, black, white and blue'),
].forEach(add);

export const LEGENDARIES: ItemDef[] = Object.values(ITEMS).filter((d) => d.legend);
