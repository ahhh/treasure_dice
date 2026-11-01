/** SRD-compatible base items plus original trinkets and affixes. */
import type { Ability, DamageType, ItemInstance, ItemKind, Rarity } from '../engine/types.ts';

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
  T('diceOfTheDoor', 'Bone of the Fifth Door', 1500, 'veryRare', { rerolls: 1, saves: 1, ac: 1 }, 'An old die-bone that hums near the door: +1 reroll, +1 AC, +1 saves.', 4, true),
  T('beltGiant', 'Belt of Hill Giant Strength', 2500, 'rare', { setAbility: { str: 21 } }, 'Strength becomes 21.', 4, true),
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
