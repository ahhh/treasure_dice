/** SRD-compatible base items plus original trinkets and affixes. */
import type { Ability, DamageType, HandType, ItemInstance, ItemKind, Material, Rarity, Skill } from '../engine/types.ts';

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

const W = (id: string, name: string, dice: string, type: DamageType, props: WeaponProp[], mastery: Mastery, martial: boolean, price: number, versatile?: string): ItemDef => ({
  id, name, kind: 'weapon', price, rarity: 'common', art: `items/${martial ? 'martial' : 'simple'}_${id}`,
  weapon: { dice, type, props, mastery, martial, versatile },
});
const A = (id: string, name: string, base: number, type: 'light' | 'medium' | 'heavy', price: number, dexCap?: number, str?: number): ItemDef => ({
  id, name, kind: 'armor', price, rarity: 'common', art: `items/armor_${id}`, armor: { base, type, dexCap, str },
});

export const ITEMS: Record<string, ItemDef> = {};
const add = (d: ItemDef) => { ITEMS[d.id] = d; };

[
  W('club', 'Club', '1d4', 'bludgeoning', ['light'], 'slow', false, 1),
  W('dagger', 'Dagger', '1d4', 'piercing', ['finesse', 'light', 'thrown'], 'nick', false, 2),
  W('greatclub', 'Greatclub', '1d8', 'bludgeoning', ['twoHanded'], 'push', false, 2),
  W('handaxe', 'Handaxe', '1d6', 'slashing', ['light', 'thrown'], 'vex', false, 5),
  W('javelin', 'Javelin', '1d6', 'piercing', ['thrown'], 'slow', false, 2),
  W('mace', 'Mace', '1d6', 'bludgeoning', [], 'sap', false, 5),
  W('quarterstaff', 'Quarterstaff', '1d6', 'bludgeoning', ['versatile', 'monk'], 'topple', false, 2, '1d8'),
  W('spear', 'Spear', '1d6', 'piercing', ['thrown', 'versatile', 'monk'], 'sap', false, 2, '1d8'),
  W('lightCrossbow', 'Light Crossbow', '1d8', 'piercing', ['ranged', 'loading', 'twoHanded'], 'slow', false, 25),
  W('shortbow', 'Shortbow', '1d6', 'piercing', ['ranged', 'twoHanded'], 'vex', false, 25),
  W('dart', 'Darts', '1d4', 'piercing', ['finesse', 'thrown', 'ranged', 'monk'], 'vex', false, 1),
  W('battleaxe', 'Battleaxe', '1d8', 'slashing', ['versatile'], 'topple', true, 10, '1d10'),
  W('flail', 'Flail', '1d8', 'bludgeoning', [], 'sap', true, 10),
  W('glaive', 'Glaive', '1d10', 'slashing', ['heavy', 'reach', 'twoHanded'], 'graze', true, 20),
  W('greataxe', 'Greataxe', '1d12', 'slashing', ['heavy', 'twoHanded'], 'cleave', true, 30),
  W('greatsword', 'Greatsword', '2d6', 'slashing', ['heavy', 'twoHanded'], 'graze', true, 50),
  W('halberd', 'Halberd', '1d10', 'slashing', ['heavy', 'reach', 'twoHanded'], 'cleave', true, 20),
  W('longsword', 'Longsword', '1d8', 'slashing', ['versatile'], 'sap', true, 15, '1d10'),
  W('maul', 'Maul', '2d6', 'bludgeoning', ['heavy', 'twoHanded'], 'topple', true, 10),
  W('morningstar', 'Morningstar', '1d8', 'piercing', [], 'sap', true, 15),
  W('rapier', 'Rapier', '1d8', 'piercing', ['finesse'], 'vex', true, 25),
  W('scimitar', 'Scimitar', '1d6', 'slashing', ['finesse', 'light'], 'nick', true, 25),
  W('shortsword', 'Shortsword', '1d6', 'piercing', ['finesse', 'light', 'monk'], 'vex', true, 10),
  W('warhammer', 'Warhammer', '1d8', 'bludgeoning', ['versatile'], 'push', true, 15, '1d10'),
  W('whip', 'Whip', '1d4', 'slashing', ['finesse', 'reach'], 'slow', true, 2),
  W('handCrossbow', 'Hand Crossbow', '1d6', 'piercing', ['ranged', 'light', 'loading'], 'vex', true, 75),
  W('heavyCrossbow', 'Heavy Crossbow', '1d10', 'piercing', ['ranged', 'heavy', 'loading', 'twoHanded'], 'push', true, 50),
  W('longbow', 'Longbow', '1d8', 'piercing', ['ranged', 'heavy', 'twoHanded'], 'slow', true, 50),
].forEach(add);

[
  A('padded', 'Padded Armor', 11, 'light', 5),
  A('leather', 'Leather Armor', 11, 'light', 10),
  A('studdedLeather', 'Studded Leather', 12, 'light', 45),
  A('hide', 'Hide Armor', 12, 'medium', 10, 2),
  A('chainShirt', 'Chain Shirt', 13, 'medium', 50, 2),
  A('scaleMail', 'Scale Mail', 14, 'medium', 50, 2),
  A('breastplate', 'Breastplate', 14, 'medium', 400, 2),
  A('halfPlate', 'Half Plate', 15, 'medium', 750, 2),
  A('ringMail', 'Ring Mail', 14, 'heavy', 30, 0),
  A('chainMail', 'Chain Mail', 16, 'heavy', 75, 0, 13),
  A('splint', 'Splint Armor', 17, 'heavy', 200, 0, 15),
  A('plate', 'Plate Armor', 18, 'heavy', 1500, 0, 15),
].forEach(add);
add({ id: 'shield', name: 'Shield', kind: 'shield', price: 10, rarity: 'common', art: 'items/armor_shield', shield: { ac: 2 } });
add({ id: 'thievesTools', name: "Thieves' Tools", kind: 'trinket', price: 25, rarity: 'common', art: 'items/trinket_thievesTools', tool: 'thieves', text: 'Proficient users gain advantage on lockpicking and trap checks.', trinket: {} });

// Trinkets (attuned accessories). SRD magic items where available, original otherwise.
const T = (id: string, name: string, price: number, rarity: Rarity, trinket: TrinketMods, text: string, shopTier = 1, lootOnly = false): ItemDef => ({
  id, name, kind: 'trinket', price, rarity, art: `items/trinket_${id}`, trinket, text, shopTier, lootOnly,
});
[
  T('ringProtection', 'Ring of Protection', 450, 'rare', { ac: 1, saves: 1 }, '+1 AC and saving throws.', 2),
  T('cloakProtection', 'Cloak of Protection', 400, 'uncommon', { ac: 1, saves: 1 }, '+1 AC and saving throws.', 2),
  T('amuletHealth', 'Amulet of Health', 1200, 'rare', { setAbility: { con: 19 } }, 'Constitution becomes 19.', 3),
  T('gauntletsOgre', 'Gauntlets of Ogre Power', 1000, 'uncommon', { setAbility: { str: 19 } }, 'Strength becomes 19.', 3),
  T('headbandIntellect', 'Headband of Intellect', 1000, 'uncommon', { setAbility: { int: 19 } }, 'Intelligence becomes 19.', 3),
  T('bracersDefense', 'Bracers of Defense', 600, 'rare', { ac: 2 }, '+2 AC while wearing no armor and no shield.', 2),
  T('pearlPower', 'Pearl of Power', 300, 'uncommon', { slotRecover: 3 }, 'Once per expedition, recover a spell slot of 3rd level or lower at a safe room.', 2),
  T('bootsSpeed', 'Boots of Haste', 500, 'rare', { init: 5 }, '+5 initiative.', 2),
  T('periaptWound', 'Periapt of Wound Closure', 500, 'uncommon', { hpPct: 0.1 }, '+10% max HP; you stabilise automatically when downed.', 2),
  T('luckstone', 'Luckstone', 350, 'uncommon', { saves: 1, rerolls: 1 }, '+1 to saves and +1 reroll on your turns.', 1),
  T('emberCharm', 'Ember Ward', 200, 'uncommon', { resist: ['fire'] }, 'Resistance to fire.', 1),
  T('frostCharm', 'Tideglass Ward', 200, 'uncommon', { resist: ['cold', 'lightning'] }, 'Resistance to cold and lightning.', 1),
  T('graveCharm', 'Grave Ward', 250, 'uncommon', { resist: ['necrotic', 'poison'] }, 'Resistance to necrotic and poison.', 1),
  T('rodPact', 'Rod of the Pact Keeper', 600, 'rare', { spellDc: 1 }, '+1 spell save DC and spell attacks.', 2),
  T('wandWar', "Wand of the War Mage", 600, 'rare', { spellDc: 1 }, '+1 spell attack rolls and save DC.', 2),
  T('hawkEye', "Falconer's Eye", 700, 'rare', { critRange: 1 }, 'Critical hits on one lower d20 face.', 3, true),
  T('diceOfTheDoor', 'Bone of the Sixth Door', 1500, 'veryRare', { rerolls: 1, saves: 1, ac: 1 }, 'An old die-bone that hums near the door: +1 reroll, +1 AC, +1 saves.', 4, true),
  T('beltGiant', 'Belt of Hill Giant Strength', 2500, 'rare', { setAbility: { str: 21 } }, 'Strength becomes 21.', 4, true),
  // Dice-touched trinkets: skills that unlock tray tricks, dice for the bag, hands and colours.
  T('glovesThievery', 'Gloves of Thievery', 300, 'uncommon', { skillProf: ['sleightOfHand'], skillBonus: { sleightOfHand: 5 } }, '+5 Sleight of Hand, and its Palm trick: swap a tray die for the next one in the bag.', 1),
  T('bootsElvenkind', 'Boots of Elvenkind', 300, 'uncommon', { skillProf: ['stealth'], skillBonus: { stealth: 5 } }, '+5 Stealth, and its Lurk trick: reroll one die for free.', 1),
  T('eyesEagle', 'Eyes of the Eagle', 350, 'uncommon', { skillProf: ['perception'], skillBonus: { perception: 5 } }, '+5 Perception, and its Spot trick: a die\'s face turns Keen.', 1),
  T('hatDisguise', 'Hat of Disguise', 350, 'uncommon', { skillProf: ['deception'], skillBonus: { deception: 5 } }, '+5 Deception, and its Bluff trick: a die turns Wild.', 2),
  T('dossLute', 'Doss Lute', 450, 'uncommon', { skillProf: ['performance'], skillBonus: { performance: 5 }, tricks: 1 }, '+5 Performance and one extra skill trick each fight.', 2),
  T('iounInsight', 'Ioun Stone of Insight', 800, 'rare', { skillProf: ['insight'], tricks: 1 }, 'Insight proficiency and one extra skill trick each fight.', 3),
  T('bagTricks', 'Bag of Tricks', 450, 'uncommon', { openingWild: 1 }, 'Every fight starts with a Wild ghost die on the tray.', 2),
  T('ivoryBones', 'Ivory Knucklebones', 350, 'uncommon', { startDice: ['loaded'] }, 'Adds a Loaded Die to the bag on every expedition.', 1),
  T('goldbugLocket', 'Goldbug Locket', 250, 'uncommon', { startDice: ['goldbug'] }, 'Adds a Goldbug Die (three gilded faces) to the bag on every expedition.', 1),
  T('glassEye', 'Glass Eye of Fortune', 600, 'rare', { startDice: ['glass'] }, 'Adds a Glass Die (×2 Mult, may shatter) to the bag on every expedition.', 2),
  T('prismShard', 'Prism Shard Pendant', 900, 'rare', { startDice: ['prism'] }, 'Adds a Prism Die (counts as every material) to the bag on every expedition.', 3),
  T('gamblersPurse', "Gambler's Purse", 150, 'common', { tokens: ['fateCoin'] }, 'Start every expedition with a Fate Coin.', 1),
  T('encoreHourglass', 'Hourglass of Encores', 700, 'rare', { tokens: ['encore'] }, 'Start every expedition with an Encore token.', 3),
  T('boneCirclet', 'Circlet of Bone', 150, 'common', { affinity: ['bone'] }, 'Bone dice count as your colour (+1 Mult each).', 1),
  T('fourWinds', 'Band of the Four Winds', 700, 'rare', { affinity: ['ember', 'frost', 'storm'] }, 'Ember, Frost and Storm dice count as your colour.', 2),
  T('twinRing', 'Ring of Twin Fortune', 400, 'uncommon', { hand: { hands: ['pair', 'twoPair'], mult: 3 } }, 'Your Pairs and Two Pairs gain +3 Mult.', 1),
  T('threesBracelet', 'Bracelet of Threes', 450, 'uncommon', { hand: { hands: ['three', 'fullHouse'], mult: 4 } }, 'Your Three of a Kinds and Full Houses gain +4 Mult.', 2),
  T('starweave', 'Starweave Mantle', 1000, 'rare', { hand: { hands: ['straight', 'straightSet'], xmult: 1.5 } }, 'Your Straights and Straight Sets gain ×1.5 Mult.', 3),
  T('hoardTorc', 'Torc of the Hoard', 2400, 'veryRare', { hand: { hands: ['set', 'fullSet', 'hoard'], xmult: 2 } }, 'Your Sets, Full Sets and Dragon Hoards gain ×2 Mult.', 4, true),
].forEach(add);

// Consumables.
const C = (id: string, name: string, price: number, rarity: Rarity, consumable: ConsumableDef, text: string, shopTier = 0): ItemDef => ({
  id, name, kind: 'consumable', price, rarity, art: `items/consumable_${id}`, consumable, text, shopTier,
});
[
  C('potionHealing', 'Potion of Healing', 50, 'common', { effect: 'heal', dice: '2d4+2', combat: true, explore: true, target: 'ally' }, 'Restore 2d4+2 HP (× vitality).'),
  C('potionGreater', 'Potion of Greater Healing', 150, 'uncommon', { effect: 'heal', dice: '4d4+4', combat: true, explore: true, target: 'ally' }, 'Restore 4d4+4 HP (× vitality).', 1),
  C('potionSuperior', 'Potion of Superior Healing', 500, 'rare', { effect: 'heal', dice: '8d4+8', combat: true, explore: true, target: 'ally' }, 'Restore 8d4+8 HP (× vitality).', 2),
  C('potionSupreme', 'Potion of Supreme Healing', 1350, 'veryRare', { effect: 'heal', dice: '10d4+20', combat: true, explore: true, target: 'ally' }, 'Restore 10d4+20 HP (× vitality).', 3),
  C('antitoxin', 'Antitoxin', 50, 'common', { effect: 'cleanse', combat: true, explore: true, target: 'ally' }, 'End poisoned and similar ailments.'),
  C('alchemistsFire', "Alchemist's Fire", 50, 'common', { effect: 'bomb', dice: '2d6', damageType: 'fire', combat: true, explore: false, target: 'enemy' }, 'Hurl: 2d6 fire and the target burns.'),
  C('holyWater', 'Holy Water', 25, 'common', { effect: 'holy', dice: '2d8', damageType: 'radiant', combat: true, explore: false, target: 'enemy' }, '2d8 radiant to a fiend or undead (half to others).'),
  C('potionHeroism', 'Potion of Heroism', 180, 'rare', { effect: 'heroism', combat: true, explore: false, target: 'self' }, '10 temp HP (× vitality) and Bless for the fight.', 1),
  C('smokeBomb', 'Smoke Bomb', 40, 'common', { effect: 'smoke', combat: true, explore: false, target: 'party' }, 'Escape from a non-boss fight (lose this room\'s rewards).'),
  C('elixirHealth', 'Elixir of Health', 120, 'uncommon', { effect: 'elixir', combat: true, explore: true, target: 'ally' }, 'Cure all conditions and heal 25%.', 1),
  C('campSupplies', 'Camp Supplies', 60, 'common', { effect: 'camp', combat: false, explore: true, target: 'party' }, 'Take a short rest anywhere that is not a combat room.'),
  C('diamond', 'Resurrection Diamond', 600, 'rare', { effect: 'revive', combat: false, explore: true, target: 'ally' }, 'Revive a fallen hero at a safe room (consumed).', 2),
  C('luckyCharm', 'Gambler\'s Rabbit Foot', 75, 'uncommon', { effect: 'fortune', combat: true, explore: false, target: 'self' }, 'Gain a Mulligan Coin for this expedition.', 1),
  C('scrollCure', 'Scroll of Cure Wounds', 60, 'common', { effect: 'scroll', spell: 'cureWounds', combat: true, explore: true, target: 'ally' }, 'Cast Cure Wounds (1st). Anyone can read it.'),
  C('scrollFireball', 'Scroll of Fireball', 300, 'uncommon', { effect: 'scroll', spell: 'fireball', combat: true, explore: false, target: 'enemies' }, 'Cast Fireball (3rd). Anyone can read it.', 2),
  C('scrollShield', 'Scroll of Shield of Faith', 60, 'common', { effect: 'scroll', spell: 'shieldOfFaith', combat: true, explore: false, target: 'ally' }, 'Cast Shield of Faith. Anyone can read it.'),
  C('scrollRevivify', 'Scroll of Revivify', 400, 'rare', { effect: 'scroll', spell: 'revivify', combat: true, explore: true, target: 'ally' }, 'Cast Revivify on an ally who fell this fight.', 2),
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

export const AFFIXES: Record<string, AffixDef> = {
  flaming: { id: 'flaming', name: 'Flaming', prefix: true, kinds: ['weapon'], text: '+1d4 fire on hit.', onHit: { dice: '1d4', type: 'fire' }, minTier: 0 },
  frost: { id: 'frost', name: 'Frostbitten', prefix: true, kinds: ['weapon'], text: '+1d4 cold on hit.', onHit: { dice: '1d4', type: 'cold' }, minTier: 0 },
  shocking: { id: 'shocking', name: 'Storm-forged', prefix: true, kinds: ['weapon'], text: '+1d6 lightning on hit.', onHit: { dice: '1d6', type: 'lightning' }, minTier: 1 },
  holy: { id: 'holy', name: 'Hallowed', prefix: true, kinds: ['weapon'], text: '+1d6 radiant on hit.', onHit: { dice: '1d6', type: 'radiant' }, minTier: 1 },
  keen: { id: 'keen', name: 'Keen', prefix: true, kinds: ['weapon'], text: 'Critical hits on one lower face.', critRange: 1, minTier: 1 },
  vampiric: { id: 'vampiric', name: 'Vampiric', prefix: true, kinds: ['weapon'], text: 'Heal 8% of damage dealt.', lifesteal: 0.08, minTier: 2 },
  lucky: { id: 'lucky', name: 'Lucky', prefix: true, kinds: ['weapon', 'trinket', 'armor'], text: '+1 reroll on your turns.', rerolls: 1, minTier: 1 },
  gilded: { id: 'gilded', name: 'Gilded', prefix: true, kinds: ['weapon'], text: '+1 doubloon when you land a killing blow.', doubloonOnKill: 1, minTier: 0 },
  warding: { id: 'warding', name: 'of Warding', prefix: false, kinds: ['armor', 'shield', 'trinket'], text: '+1 AC.', ac: 1, minTier: 1 },
  vitality: { id: 'vitality', name: 'of Vitality', prefix: false, kinds: ['armor', 'trinket'], text: '+10% max HP.', hpPct: 0.1, minTier: 0 },
  swiftness: { id: 'swiftness', name: 'of Swiftness', prefix: false, kinds: ['armor', 'trinket', 'weapon'], text: '+3 initiative.', init: 3, minTier: 0 },
  embers: { id: 'embers', name: 'of the Ember', prefix: false, kinds: ['armor', 'shield'], text: 'Resistance to fire.', resist: ['fire'], minTier: 1 },
  tides: { id: 'tides', name: 'of the Tide', prefix: false, kinds: ['armor', 'shield'], text: 'Resistance to cold.', resist: ['cold'], minTier: 1 },
};

export function itemName(inst: ItemInstance): string {
  const def = ITEMS[inst.defId];
  if (!def) return inst.defId;
  const pre = inst.affixes.map((a) => AFFIXES[a]).filter((a) => a?.prefix).map((a) => a!.name);
  const suf = inst.affixes.map((a) => AFFIXES[a]).filter((a) => a && !a.prefix).map((a) => a!.name);
  const plus = inst.plus > 0 ? ` +${inst.plus}` : '';
  return [...pre, def.name].join(' ') + plus + (suf.length ? ` ${suf.join(' ')}` : '') + (inst.qty && inst.qty > 1 ? ` ×${inst.qty}` : '');
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

const LG = (id: string, name: string, base: string | 'trinket', level: number, text: string, mods: LegendMods, lore: string, look: string, armor?: ItemDef['armor']): ItemDef => {
  const b = base === 'trinket' ? undefined : ITEMS[base];
  return {
    id, name, kind: b ? b.kind : 'trinket', price: 400 + level * 300, rarity: 'legendary', art: `items/legend_${id}`, text,
    weapon: b?.weapon, armor: armor ?? b?.armor, shield: b?.shield, trinket: b ? undefined : {}, lootOnly: true,
    legend: { level, lore, mods, look },
  };
};

[
  // ── weapons ──
  LG('ladyLuck', "Lady Luck's Rapier", 'rapier', 1, 'Your High Die plays gain +4 Mult: one die at a time is a strategy now.',
    { hand: { hands: ['high'], mult: 4 } }, 'A riverboat gambler won it on a single die and never rolled two again.',
    'a slender rapier with a swept gold hilt shaped like a coiled ribbon, a single ivory six-sided die set into the pommel, a red tassel'),
  LG('spellthiefKris', "Spellthief's Kris", 'dagger', 2, 'Attack and damage with your spellcasting ability if it is higher. Casters can fight in melee.',
    { attackAbility: 'spell' }, 'A blade-dancer\'s wavy dagger that answers to the mind rather than the arm.',
    'a wavy-bladed kris dagger whose flame-shaped blade is etched with faintly glowing violet arcane circles, a silver hilt wrapped in indigo cord'),
  LG('bloodCleaver', 'Bloodthirst Cleaver', 'greataxe', 4, '+30% damage while you are at or below half HP; heal 5% of damage dealt; −1 AC.',
    { bloodied: 0.3, lifesteal: 0.05, ac: -1 }, 'An oversized black cleaver from a mercenary legend: it grows hungrier the more its wielder bleeds.',
    'a huge, crude two-handed cleaver-axe of black iron, a single broad slab of a blade with a jagged edge and red veins glowing in the metal, a long bandaged grip'),
  LG('frostbrand', 'Frost Brand', 'longsword', 6, '+1d6 cold on hit; resistance to fire; Frost dice count as your colour.',
    { onHit: [{ dice: '1d6', type: 'cold' }], resist: ['fire'], affinity: ['frost'] }, 'Forged in a glacier\'s heart, it sheds pale light and puts out flames.',
    'a straight longsword whose blade is clear blue ice-crystal with frost creeping along the edge, a silver crossguard shaped like snowflake points, cold mist trailing from it'),
  LG('starshotBow', 'Starshot Longbow', 'longbow', 7, 'Your Straights and Straight Sets gain ×1.5 Mult; +2 initiative.',
    { hand: { hands: ['straight', 'straightSet'], xmult: 1.5 }, init: 2 }, 'Each arrow loosed from it draws a line of stars, one point after the next.',
    'an elegant white-wood longbow with golden tips curled like crescent moons, a string of faint starlight, tiny stars dotted along the limbs'),
  LG('twinGale', 'Twin Gale Blade', 'scimitar', 8, 'Your attack action always strikes at least twice, but your weapon damage is 15% lower.',
    { minAttacks: 2, dmgPct: -0.15 }, 'A wind-spirit\'s sword that cuts once and echoes once, whoever holds it.',
    'a single clearly visible curved scimitar shown whole and diagonally: a broad, strongly curved pale jade-green steel blade, a gold crossguard and a wrapped grip, a short green ribbon at the pommel, with a faint translucent after-image of the same blade offset just behind it like a gust of wind'),
  LG('dragonfang', 'Dragonfang Greatsword', 'greatsword', 9, '+25% damage against elites and bosses; −2 initiative.',
    { bossDmgPct: 0.25, init: -2 }, 'Too big to be called a sword: a slab of iron hammered from a dragon\'s fallen tooth.',
    'an enormous, absurdly broad and thick greatsword taller than a man, a plain heavy slab of dark iron with a dragon tooth set into the guard, worn leather grip'),
  LG('earthshaker', 'Earthshaker Maul', 'maul', 10, '+1d6 thunder on hit; your overkill carries into the next foe.',
    { onHit: [{ dice: '1d6', type: 'thunder' }], spill: true }, 'Giants used it to drive mountain roots. One swing never stops at one body.',
    'a colossal two-handed maul whose head is a block of rough grey mountain stone bound in bronze bands, cracks in the stone glowing amber'),
  LG('stormcaller', 'Stormcaller Hammer', 'warhammer', 11, '+1d8 lightning on hit; resistance to lightning; Storm dice count as your colour.',
    { onHit: [{ dice: '1d8', type: 'lightning' }], resist: ['lightning'], affinity: ['storm'] }, 'A sky-god\'s hammer that only the worthy can lift.',
    'a short heavy war hammer with a squat rectangular silver-blue head crackling with small lightning arcs, a short leather-wrapped haft with a wrist strap'),
  LG('moonreaper', 'Moonreaper Glaive', 'glaive', 12, '+1d8 necrotic on hit; heal 12% of damage dealt; healing from others is halved on you.',
    { onHit: [{ dice: '1d8', type: 'necrotic' }], lifesteal: 0.12, healTakenPct: -0.5 }, 'A reaper\'s polearm that feeds its bearer and nobody else.',
    'a tall glaive with a wide crescent-moon blade of pale silver like a scythe, a black shaft, wisps of violet-black mist curling from the edge'),
  LG('ninelives', 'Nine Lives Stealer', 'rapier', 14, 'When you kill a foe: heal 10% of max HP and gain a reroll; −10% max HP.',
    { onKill: { healPct: 0.1, rerolls: 1 }, hpPct: -0.1 }, 'A duellist\'s blade with nine notches on the guard. It is always hungry for the tenth.',
    'a black-steel rapier with a cage-like basket hilt bearing nine small notches, a faint green ghostly glow running down the narrow blade'),
  LG('vorpal', 'Vorpal Sword', 'longsword', 17, 'Crits on one lower face; a crit kills any non-boss foe at or below 25% HP outright.',
    { critRange: 1, execute: true }, 'Snicker-snack. The oldest legend in the Keep.',
    'a gleaming longsword with an impossibly thin, mirror-bright blade that seems to cut the air itself, a simple silver crossguard and a pale blue gem in the pommel'),
  LG('staffMagi', 'Staff of the Magi', 'quarterstaff', 19, '+1 spell save DC and attack; +4 damage on every spell; one extra 5th-level slot.',
    { spellDc: 1, spellDmg: 4, bonusSlots: { 5: 1 } }, 'The staff of an archmage who outlived their own legend.',
    'a tall ancient staff of dark twisted wood crowned by a ring of floating crystal shards orbiting a glowing white orb, silver bands up the shaft'),
  LG('starcleaver', 'Starcleaver', 'longsword', 20, '+15% damage; every fight opens with a Wild ghost die on the tray.',
    { dmgPct: 0.15, openingWild: 1 }, 'The hero\'s sword at the end of the story, made from the star that fell over the Keep.',
    'a radiant longsword whose blade is deep night-blue metal filled with tiny shining stars and a nebula swirl, a golden crossguard shaped like spread wings'),

  // ── armor and shields ──
  LG('glamouredLeather', 'Glamoured Studded Leather', 'studdedLeather', 1, 'Deception proficiency (+3) and its Bluff trick; +1 initiative.',
    { skillProf: ['deception'], skillBonus: { deception: 3 }, init: 1 }, 'Armor that looks like a fine coat until the knives come out.',
    'an elegant fitted coat of dark studded leather that shimmers between plain armour and a fancy embroidered burgundy doublet, silver studs'),
  LG('mithralShirt', 'Mithral Shirt', 'chainShirt', 3, 'A chain shirt that counts as LIGHT armor: AC 13 + full DEX. Any class trained in light armor can wear it.',
    {}, 'Woven by deep-delving smiths from silver-bright mithral, light as silk.',
    'a shirt of very fine bright silvery mithral chain links that drapes like cloth, gleaming almost white', { base: 13, type: 'light' }),
  LG('sentinelShield', 'Sentinel Shield', 'shield', 4, '+4 initiative; Perception proficiency and its Spot trick.',
    { init: 4, skillProf: ['perception'] }, 'An eye painted on its face never closes.',
    'a round wooden shield with a bronze rim, a large watchful painted eye in the centre that glows faintly gold'),
  LG('dragonscale', 'Red Dragon Scale Mail', 'scaleMail', 5, 'Resistance to fire; Ember dice count as your colour.',
    { resist: ['fire'], affinity: ['ember'] }, 'Scales shed by a red dragon, still warm to the touch.',
    'a coat of overlapping large crimson dragon scales with a dark leather lining and a high scaled collar, glinting like embers'),
  LG('demonArmor', 'Demon Armor', 'plate', 8, 'Your unarmed strikes become 1d8 claws, so you can fight bare-handed in plate; −1 to all saves.',
    { unarmedDie: 8, saves: -1 }, 'Fiend-forged plate whose gauntlets end in talons. It whispers.',
    'a suit of black spiked full plate armour with horned helmet, the gauntlets ending in long curved claws, faint red light from the visor slits'),
  LG('invulnerable', 'Armor of Invulnerability', 'plate', 12, 'The first hit you take each fight deals no damage.',
    { firstHitImmune: true }, 'Plate that the first blow of any battle simply slides off.',
    'a suit of pale grey full plate with smooth flawless rounded plates like polished river stone, a faint protective shimmer over the surface'),
  LG('wolfPelt', "Wolfmother's Pelt", 'hide', 13, '+1 Rage; heal 3% of max HP at the start of each of your turns.',
    { resources: { rage: 1 }, regen: 0.03 }, 'The pelt of a great white wolf who mothered a whole tribe.',
    'a huge white wolf pelt worn as a hooded mantle over hide armour, the wolf\'s head forming the hood, bone toggles and blue war-paint marks'),
  LG('efreetiChain', 'Efreeti Chain', 'chainMail', 15, 'Resistance to fire; melee attackers take fire damage equal to your level.',
    { resist: ['fire'], thorns: 1 }, 'Chain woven from the brass of the City of Fire.',
    'a hauberk of glowing brass-gold chain mail with small flames licking between the links, an ornate brass collar'),
  LG('dawnPlate', 'Plate of the Unbroken Oath', 'plate', 16, 'The first time you would drop to 0 HP each fight, you stay at 1; healing you receive +25%.',
    { deathWard: true, healTakenPct: 0.25 }, 'A paladin\'s armor that held the line for a hundred years.',
    'a suit of white-and-gold full plate with a sunburst on the breastplate, a long white tabard and small gold wings on the helmet'),
  LG('dragonboneAegis', 'Dragonbone Aegis', 'shield', 18, 'Resistance to acid, cold, fire, lightning and poison; −2 initiative.',
    { resist: ['acid', 'cold', 'fire', 'lightning', 'poison'], init: -2 }, 'Carved from a skull-plate of one of the Dragon Queen\'s fallen consorts.',
    'a large kite shield carved from a single pale dragon skull-plate, five small coloured gems (red, green, blue, white, black) set in a ring'),

  // ── trinkets ──
  LG('foxMask', 'Fox Spirit Mask', 'trinket', 3, 'Each fight opens with a Wild ghost die on the tray; Deception proficiency and its Bluff trick.',
    { openingWild: 1, skillProf: ['deception'] }, 'A shrine fox\'s white mask. Wear it and luck mistakes you for a friend.',
    'a white lacquered fox-face mask with red swirling markings and gold-tipped ears, a red cord tied at the back'),
  LG('ringSpellStoring', 'Ring of Spell Storing', 'trinket', 5, 'Spellcasters gain an extra 1st- and 2nd-level spell slot.',
    { bonusSlots: { 1: 1, 2: 1 } }, 'A ring that keeps a spell or two tucked away for later.',
    'a thick silver ring set with a large sapphire in which tiny swirling sparks of magic are trapped'),
  LG('robeStars', 'Robe of Stars', 'trinket', 6, '+2 damage on every spell; +1 to all saves.',
    { spellDmg: 2, saves: 1 }, 'A night-black robe whose embroidered stars can be plucked and thrown.',
    'a folded deep-blue velvet wizard\'s robe embroidered with silver stars and constellations that twinkle'),
  LG('capeMountebank', 'Cape of the Mountebank', 'trinket', 9, 'Each fight you start hidden: advantage on your first attack (and Sneak Attack).',
    { openingHidden: true }, 'A showman\'s cape that smells faintly of brimstone and applause.',
    'a flamboyant short cape, black outside and bright crimson inside, a puff of purple smoke curling from its hem, a gold clasp'),
  LG('animatedShield', 'Animated Shield', 'trinket', 10, '+2 AC while you hold no shield: it floats beside you, leaving both hands free.',
    { acNoShield: 2 }, 'A shield that guards on its own, so a greatsword need not choose.',
    'a round steel shield floating in the air by itself, faint blue magic glow around its rim, a stylised wing emblem'),
  LG('ringRegeneration', 'Ring of Regeneration', 'trinket', 11, 'Heal 4% of max HP at the start of each of your turns.',
    { regen: 0.04 }, 'Its wearer\'s wounds close as you watch.',
    'a gold ring shaped like a green vine wrapped around the finger, a small emerald bud with a glowing green leaf'),
  LG('hundredFists', 'Gauntlets of the Hundred Fists', 'trinket', 12, 'Unarmed strikes roll 1d10; +2 Focus for monks.',
    { unarmedDie: 10, resources: { focus: 2 } }, 'Fighting-school gauntlets that throw a hundred punches in the time it takes to blink.',
    'a pair of red cloth hand-wraps with steel knuckle plates, wisps of white ki energy and blurred after-images of fists around them'),
  LG('saintRosary', 'Rosary of the Dawn Saint', 'trinket', 13, 'Healing you give +30%; +1 Channel Divinity.',
    { healPct: 0.3, resources: { channel: 1 } }, 'Prayer beads of a saint who never let a friend fall.',
    'a long string of pearl prayer beads with a small golden sunburst pendant glowing softly'),
  LG('hellfireContract', 'Hellfire Contract', 'trinket', 14, '+12% damage and +1 spell save DC; −15% max HP.',
    { dmgPct: 0.12, spellDc: 1, hpPct: -0.15 }, 'Signed in blood. The fine print is written in fire.',
    'a rolled black parchment contract sealed with a red wax seal shaped like a horned skull, edges smouldering with tiny flames, abstract marks only'),
  LG('hollowEye', 'Eye of the Hollow King', 'trinket', 16, 'Crits on one lower face; +1 spell save DC; −10% max HP.',
    { critRange: 1, spellDc: 1, hpPct: -0.1 }, 'Plucked from a lich-king who saw everything and spared nothing.',
    'a withered amber-gold eyeball set in a black iron claw pendant, its slit pupil glowing violet'),
  LG('robeArchmagi', 'Robe of the Archmagi', 'trinket', 18, 'With no body armor your AC is 15 + DEX; +2 spell save DC and attack.',
    { unarmoredBase: 15, spellDc: 2 }, 'The robe of the highest office of magic. It protects as well as plate.',
    'a folded flowing robe of white and silver silk with glowing arcane sigil embroidery along the hems, faint light rising from it'),
  LG('dragonOrb', 'Orb of Dragonkind', 'trinket', 20, 'Ember, Verdant, Shadow, Frost and Storm dice all count as your colour.',
    { affinity: ['ember', 'verdant', 'shadow', 'frost', 'storm'] }, 'Five dragon souls swirl inside. They do not agree on anything, except you.',
    'a crystal orb held in a gold dragon-claw stand, five swirling coloured mists inside it: red, green, black, white and blue'),
].forEach(add);

export const LEGENDARIES: ItemDef[] = Object.values(ITEMS).filter((d) => d.legend);
