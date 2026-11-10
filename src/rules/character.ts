/**
 * The single stat resolver (plan §3.1): character state in, derived numbers
 * out. UI never hand-computes AC or damage; it calls derive().
 */
import type { Ability, ClassId, DamageType, HandType, Hero, ItemInstance, Material, Skill } from '../engine/types.ts';
import { ABILITIES } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';
import { CLASSES, maxSlots, proficiency, featuresUpTo, FIGHTING_STYLES, METAMAGIC, INVOCATIONS, EPIC_BOONS } from '../content/classes.ts';
import { ITEMS, AFFIXES, type LegendMods, type Mastery, type WeaponProp } from '../content/items.ts';
import { SPECIES, BACKGROUNDS, uniqueName } from '../content/origins.ts';
import { portraitsFor } from '../content/portraits.ts';
import { VITALITY } from './balance.ts';
import { SPELLS, spellsForClass } from '../content/spells.ts';
import { markOffers, applyMark } from '../fortune/dicepath.ts';
import { bindText } from '../i18n/index.ts';

export const SKILL_ABILITY: Record<Skill, Ability> = {
  athletics: 'str', acrobatics: 'dex', sleightOfHand: 'dex', stealth: 'dex',
  arcana: 'int', history: 'int', investigation: 'int', nature: 'int', religion: 'int',
  animalHandling: 'wis', insight: 'wis', medicine: 'wis', perception: 'wis', survival: 'wis',
  deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha',
};

export const SKILL_NAMES: Record<Skill, string> = {
  athletics: 'Athletics', acrobatics: 'Acrobatics', sleightOfHand: 'Sleight of Hand', stealth: 'Stealth',
  arcana: 'Arcana', history: 'History', investigation: 'Investigation', nature: 'Nature', religion: 'Religion',
  animalHandling: 'Animal Handling', insight: 'Insight', medicine: 'Medicine', perception: 'Perception', survival: 'Survival',
  deception: 'Deception', intimidation: 'Intimidation', performance: 'Performance', persuasion: 'Persuasion',
};

export const ABILITY_NAMES: Record<Ability, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

export const mod = (score: number) => Math.floor((score - 10) / 2);

export interface WeaponProfile {
  name: string;
  toHit: number;
  dice: string;
  bonus: number;
  type: DamageType;
  ranged: boolean;
  reach: boolean;
  mastery?: Mastery;
  props: WeaponProp[];
  ability: Ability;
  onHit: { dice: string; type: DamageType }[];
  heavy: boolean;
  light: boolean;
  plus: number;
}

export interface Derived {
  abilities: Record<Ability, number>;
  mods: Record<Ability, number>;
  pb: number;
  maxHp: number;
  ac: number;
  init: number;
  saves: Record<Ability, number>;
  saveProf: Ability[];
  skills: Record<Skill, number>;
  spellAbility?: Ability;
  spellDc: number;
  spellAttack: number;
  main: WeaponProfile;
  offhand?: WeaponProfile;
  attacks: number;
  critMin: number;
  resist: DamageType[];
  rerollBonus: number;
  martialArtsDie: number;
  sneakDice: number;
  rageDamage: number;
  cantripDice: number;
  slots: number[];
  resources: Record<string, number>;
  features: Set<string>;
  inspirationDie: number;
  armored: boolean;
  hasShield: boolean;
  lifesteal: number;
  doubloonOnKill: number;
  /** Skills the hero is proficient in (own + from gear): each unlocks a tray trick. */
  proficient: Skill[];
  /** Skill tricks usable per fight. */
  tricks: number;
  /** Legendary hooks, summed over equipped gear. */
  legend: LegendTotals;
  /** Dice hooks from gear. */
  diceGear: {
    affinity: Material[];
    hands: { name: string; hands: HandType[]; mult?: number; xmult?: number }[];
    startDice: string[];
    tokens: string[];
    openingWild: number;
  };
}

export interface LegendTotals {
  dmgPct: number; bloodied: number; bossDmgPct: number; healPct: number; healTakenPct: number; regen: number; thorns: number; spellDmg: number;
  spill: boolean; execute: boolean; firstHitImmune: boolean; deathWard: boolean; openingHidden: boolean;
  onKill: { healPct: number; rerolls: number };
}

/** Stat mods an equipped item grants from any slot: a legendary's hooks, or a trinket's mods. */
export function gearMods(inst: ItemInstance): LegendMods | undefined {
  const def = ITEMS[inst.defId];
  return def?.legend?.mods ?? def?.trinket;
}

function legendTotals(items: ItemInstance[]): LegendTotals {
  const t: LegendTotals = { dmgPct: 0, bloodied: 0, bossDmgPct: 0, healPct: 0, healTakenPct: 0, regen: 0, thorns: 0, spellDmg: 0, spill: false, execute: false, firstHitImmune: false, deathWard: false, openingHidden: false, onKill: { healPct: 0, rerolls: 0 } };
  for (const inst of items) {
    const m = ITEMS[inst.defId]?.legend?.mods;
    if (!m) continue;
    t.dmgPct += m.dmgPct ?? 0; t.bloodied += m.bloodied ?? 0; t.bossDmgPct += m.bossDmgPct ?? 0;
    t.healPct += m.healPct ?? 0; t.healTakenPct += m.healTakenPct ?? 0; t.regen += m.regen ?? 0; t.thorns += m.thorns ?? 0; t.spellDmg += m.spellDmg ?? 0;
    t.spill ||= !!m.spill; t.execute ||= !!m.execute; t.openingHidden ||= !!m.openingHidden;
    t.firstHitImmune ||= !!m.firstHitImmune;
    t.deathWard ||= !!m.deathWard;
    t.onKill.healPct += m.onKill?.healPct ?? 0; t.onKill.rerolls += m.onKill?.rerolls ?? 0;
  }
  return t;
}

function equipped(hero: Hero): ItemInstance[] {
  return Object.values(hero.equipment).filter(Boolean) as ItemInstance[];
}

export function effectiveAbilities(hero: Hero): Record<Ability, number> {
  const a = { ...hero.abilities };
  if (hero.level >= 20 && hero.classId === 'barbarian') { a.str = Math.min(25, a.str + 4); a.con = Math.min(25, a.con + 4); }
  if (hero.level >= 20 && hero.classId === 'monk') { a.dex = Math.min(25, a.dex + 4); a.wis = Math.min(25, a.wis + 4); }
  for (const inst of equipped(hero)) {
    const t = gearMods(inst);
    if (!t) continue;
    if (t.setAbility) for (const [k, v] of Object.entries(t.setAbility)) a[k as Ability] = Math.max(a[k as Ability], v!);
    if (t.ability) for (const [k, v] of Object.entries(t.ability)) a[k as Ability] += v!;
  }
  return a;
}

export function hasFeat(hero: Hero, id: string) {
  return hero.feats.includes(id);
}

export function choice(hero: Hero, key: string): string[] {
  return hero.choices[key] ?? [];
}

export function derive(hero: Hero): Derived {
  const cls = CLASSES[hero.classId];
  const abilities = effectiveAbilities(hero);
  const mods = Object.fromEntries(ABILITIES.map((k) => [k, mod(abilities[k])])) as Record<Ability, number>;
  const pb = proficiency(hero.level);
  const L = hero.level;
  const feats = new Set(featuresUpTo(hero.classId, L).map((f) => f.id));
  const species = SPECIES[hero.ancestry];
  const items = equipped(hero);
  const armorInst = hero.equipment.armor;
  const armor = armorInst ? ITEMS[armorInst.defId]?.armor : undefined;
  const shieldInst = hero.equipment.offHand && ITEMS[hero.equipment.offHand.defId]?.shield ? hero.equipment.offHand : undefined;
  const styles = choice(hero, 'fightingStyle');
  const invocations = choice(hero, 'invocation');

  // HP
  let maxHp = cls.hitDie + mods.con;
  for (const r of hero.hpRolls) maxHp += Math.max(1, r + mods.con);
  if (species?.hpPerLevel) maxHp += species.hpPerLevel * L;
  if (hero.classId === 'sorcerer' && L >= 3) maxHp += L;
  if (hasFeat(hero, 'tough')) maxHp += 2 * L;
  if (choice(hero, 'epicBoon').includes('fortitude')) maxHp += 40;
  let hpPct = 0;
  for (const inst of items) {
    hpPct += gearMods(inst)?.hpPct ?? 0;
    for (const a of inst.affixes) hpPct += AFFIXES[a]?.hpPct ?? 0;
  }
  maxHp = Math.round(Math.max(1, maxHp) * VITALITY * (1 + hpPct));

  // AC
  let ac: number;
  if (armor) {
    const dex = armor.type === 'heavy' ? 0 : armor.dexCap !== undefined ? Math.min(armor.dexCap, mods.dex) : mods.dex;
    ac = armor.base + dex + (armorInst?.plus ?? 0);
  } else if (hero.classId === 'barbarian') ac = 10 + mods.dex + mods.con;
  else if (hero.classId === 'monk' && !shieldInst) ac = 10 + mods.dex + mods.wis;
  else if (hero.classId === 'sorcerer' && L >= 3) ac = 10 + mods.dex + mods.cha;
  else if (invocations.includes('armorOfShadows')) ac = 13 + mods.dex;
  else ac = 10 + mods.dex;
  const robe = Math.max(0, ...items.map((i) => gearMods(i)?.unarmoredBase ?? 0));
  if (!armor && robe) ac = Math.max(ac, robe + mods.dex);
  if (shieldInst) ac += 2 + shieldInst.plus;
  if (armor && styles.includes('defense')) ac += 1;
  for (const inst of items) {
    const t = gearMods(inst);
    if (t?.acNoShield && !shieldInst) ac += t.acNoShield;
    if (t?.ac) {
      if (inst.defId === 'bracersDefense') { if (!armor && !shieldInst) ac += t.ac; } else ac += t.ac;
    }
    for (const a of inst.affixes) ac += AFFIXES[a]?.ac ?? 0;
  }

  // Saves
  const saveProf = new Set<Ability>(cls.saves);
  if (L >= 14 && hero.classId === 'monk') ABILITIES.forEach((a) => saveProf.add(a));
  if (L >= 15 && hero.classId === 'rogue') { saveProf.add('wis'); saveProf.add('cha'); }
  if (hasFeat(hero, 'resilient')) saveProf.add('con');
  let saveBonus = 0;
  for (const inst of items) saveBonus += gearMods(inst)?.saves ?? 0;
  const saves = Object.fromEntries(ABILITIES.map((a) => [a, mods[a] + (saveProf.has(a) ? pb : 0) + saveBonus])) as Record<Ability, number>;

  // Skills
  const jack = hero.classId === 'bard' && L >= 2;
  const proficient = new Set<Skill>(hero.skillProfs);
  const diceGear: Derived['diceGear'] = { affinity: [], hands: [], startDice: [], tokens: [], openingWild: 0 };
  let tricks = 1 + (hero.expertise.length ? 1 : 0);
  const skillBonus: Partial<Record<Skill, number>> = {};
  for (const inst of items) {
    const def = ITEMS[inst.defId];
    const t = gearMods(inst);
    if (!t) continue;
    for (const s of t.skillProf ?? []) proficient.add(s);
    for (const [k, v] of Object.entries(t.skillBonus ?? {})) skillBonus[k as Skill] = (skillBonus[k as Skill] ?? 0) + v!;
    tricks += t.tricks ?? 0;
    diceGear.affinity.push(...(t.affinity ?? []));
    if (t.hand) diceGear.hands.push({ name: def.name, ...t.hand });
    diceGear.startDice.push(...(t.startDice ?? []));
    diceGear.tokens.push(...(t.tokens ?? []));
    diceGear.openingWild += t.openingWild ?? 0;
  }
  const skills = {} as Record<Skill, number>;
  for (const s of Object.keys(SKILL_ABILITY) as Skill[]) {
    const prof = proficient.has(s);
    const exp = hero.expertise.includes(s);
    skills[s] = mods[SKILL_ABILITY[s]] + (exp ? pb * 2 : prof ? pb : jack ? Math.floor(pb / 2) : 0) + (skillBonus[s] ?? 0);
  }

  // Initiative
  let init = mods.dex;
  if (hasFeat(hero, 'alert')) init += pb;
  for (const inst of items) {
    init += gearMods(inst)?.init ?? 0;
    for (const a of inst.affixes) init += AFFIXES[a]?.init ?? 0;
  }

  // Spellcasting
  const spellAbility = cls.caster?.ability ?? (hero.feats.includes('magicInitiate') ? 'wis' : undefined);
  let spellBonus = 0;
  for (const inst of items) spellBonus += gearMods(inst)?.spellDc ?? 0;
  const spellDc = 8 + pb + (spellAbility ? mods[spellAbility] : 0) + spellBonus;
  const spellAttack = pb + (spellAbility ? mods[spellAbility] : 0) + spellBonus;

  // Weapons
  const martialArtsDie = L >= 17 ? 12 : L >= 11 ? 10 : L >= 5 ? 8 : 6;
  const main = weaponProfile(hero, hero.equipment.mainHand, mods, pb, styles, martialArtsDie, invocations, false, !!shieldInst);
  const offInst = hero.equipment.offHand && ITEMS[hero.equipment.offHand.defId]?.weapon ? hero.equipment.offHand : undefined;
  const offhand = offInst ? weaponProfile(hero, offInst, mods, pb, styles, martialArtsDie, invocations, true, false) : undefined;

  let attacks = 1;
  if (feats.has('extraAttack') || (invocations.includes('thirstingBlade') && L >= 5)) attacks = 2;
  if (feats.has('extraAttack2')) attacks = 3;
  if (feats.has('extraAttack3')) attacks = 4;
  for (const inst of items) attacks = Math.max(attacks, gearMods(inst)?.minAttacks ?? 0);

  let critMin = 20;
  if (feats.has('improvedCritical')) critMin = 19;
  if (feats.has('superiorCritical')) critMin = 18;
  for (const inst of items) {
    critMin -= gearMods(inst)?.critRange ?? 0;
    for (const a of inst.affixes) critMin -= AFFIXES[a]?.critRange ?? 0;
  }

  const resist = new Set<DamageType>(species?.resist ?? []);
  for (const inst of items) {
    for (const r of gearMods(inst)?.resist ?? []) resist.add(r);
    for (const a of inst.affixes) for (const r of AFFIXES[a]?.resist ?? []) resist.add(r);
  }
  if (hero.classId === 'sorcerer' && L >= 6) resist.add('fire');
  if (hero.classId === 'warlock' && L >= 10) resist.add('fire');
  if (hero.classId === 'druid' && L >= 10) resist.add('poison');

  let rerollBonus = 0;
  if (hero.classId === 'rogue') rerollBonus += 1;
  if (feats.has('heroicWarrior')) rerollBonus += 1;
  if (choice(hero, 'epicBoon').includes('fate')) rerollBonus += 1;
  for (const inst of items) {
    rerollBonus += gearMods(inst)?.rerolls ?? 0;
    for (const a of inst.affixes) rerollBonus += AFFIXES[a]?.rerolls ?? 0;
  }
  let lifesteal = 0;
  let doubloonOnKill = 0;
  if (hero.equipment.mainHand) lifesteal += ITEMS[hero.equipment.mainHand.defId]?.legend?.mods.lifesteal ?? 0;
  for (const a of hero.equipment.mainHand?.affixes ?? []) {
    lifesteal += AFFIXES[a]?.lifesteal ?? 0;
    doubloonOnKill += AFFIXES[a]?.doubloonOnKill ?? 0;
  }

  const resources: Record<string, number> = {};
  for (const r of cls.resources) resources[r.id] = r.max(L, mods);
  if (hasFeat(hero, 'lucky')) resources.luck = pb;
  if (hero.ancestry === 'goliath') resources.stonesEndurance = pb;
  if (hero.ancestry === 'orc') resources.relentless = 1;
  if (hero.ancestry === 'dragonborn') resources.breath = pb;
  // Legendary gear: extra uses of resources the hero already has, and extra slots for casters.
  const slots = maxSlots(hero.classId, L);
  for (const inst of items) {
    const m = gearMods(inst);
    for (const [k, v] of Object.entries(m?.resources ?? {})) if (k in resources) resources[k] += v;
    if (m?.bonusSlots && slots.some((n) => n > 0)) for (const [lv, n] of Object.entries(m.bonusSlots)) slots[Number(lv)] = (slots[Number(lv)] ?? 0) + (n ?? 0);
  }

  return {
    abilities, mods, pb, maxHp, ac, init, saves, saveProf: [...saveProf], skills,
    spellAbility, spellDc, spellAttack, main, offhand, attacks, critMin, resist: [...resist],
    rerollBonus, martialArtsDie,
    sneakDice: hero.classId === 'rogue' ? Math.ceil(L / 2) : 0,
    rageDamage: L >= 16 ? 4 : L >= 9 ? 3 : 2,
    cantripDice: L >= 17 ? 4 : L >= 11 ? 3 : L >= 5 ? 2 : 1,
    slots,
    resources,
    features: feats,
    inspirationDie: L >= 15 ? 12 : L >= 10 ? 10 : L >= 5 ? 8 : 6,
    armored: !!armor,
    hasShield: !!shieldInst,
    lifesteal, doubloonOnKill,
    proficient: [...proficient], tricks, diceGear,
    legend: legendTotals(items),
  };
}

function weaponProfile(
  hero: Hero, inst: ItemInstance | undefined, mods: Record<Ability, number>, pb: number,
  styles: string[], maDie: number, invocations: string[], offhand: boolean, shield: boolean,
): WeaponProfile {
  const def = inst ? ITEMS[inst.defId] : undefined;
  const w = def?.weapon;
  const monk = hero.classId === 'monk';
  const wildShaped = false;
  const gear = equipped(hero).map(gearMods);
  if (!w || wildShaped) {
    // Unarmed strike. Demon Armor claws and fist gauntlets raise the die for anyone.
    const ability: Ability = monk && mods.dex > mods.str ? 'dex' : 'str';
    const gearDie = Math.max(0, ...gear.map((m) => m?.unarmedDie ?? 0));
    const die = Math.max(monk ? maDie : 0, gearDie);
    const claws = equipped(hero).some((i) => i.defId === 'demonArmor');
    return {
      name: 'Unarmed Strike', toHit: mods[ability] + pb + (claws ? 1 : 0), dice: die ? `1d${die}` : '1', bonus: mods[ability] + (claws ? 1 : 0),
      type: monk && hero.level >= 6 ? 'force' : claws && gearDie >= die ? 'slashing' : 'bludgeoning', ranged: false, reach: false, props: [], ability,
      onHit: [], heavy: false, light: true, plus: 0,
    };
  }
  let ability: Ability = 'str';
  if (w.props.includes('ranged')) ability = 'dex';
  else if (w.props.includes('finesse') && mods.dex > mods.str) ability = 'dex';
  if (monk && (w.props.includes('monk') || w.props.includes('light')) && mods.dex > mods[ability]) ability = 'dex';
  if (invocations.includes('pactOfTheBlade') && !w.props.includes('ranged') && mods.cha > mods[ability]) ability = 'cha';
  // Spellthief's Kris and the like: fight with the mind.
  const legendAbility = def?.legend?.mods.attackAbility;
  const alt: Ability | undefined = legendAbility === 'spell' ? CLASSES[hero.classId].caster?.ability : legendAbility;
  if (alt && mods[alt] > mods[ability]) ability = alt;
  const proficient = w.martial ? CLASSES[hero.classId].martial || (hero.classId === 'cleric' && choice(hero, 'divineOrder').includes('protector')) || (hero.classId === 'druid' && choice(hero, 'primalOrder').includes('warden')) || invocations.includes('pactOfTheBlade') || (hero.classId === 'rogue' && (w.props.includes('finesse') || w.props.includes('light'))) || (hero.classId === 'bard' && w.props.includes('finesse')) || (monk && w.props.includes('monk')) : true;
  const plus = inst?.plus ?? 0;
  let toHit = mods[ability] + (proficient ? pb : 0) + plus;
  if (w.props.includes('ranged') && styles.includes('archery')) toHit += 2;
  let dice = w.dice;
  if (w.versatile && !shield && !hero.equipment.offHand) dice = w.versatile;
  if (monk && (w.props.includes('monk') || w.props.includes('light'))) {
    const md = `1d${maDie}`;
    if (Number(md.slice(2)) > Number(dice.split('d')[1] ?? 0) && !dice.startsWith('2')) dice = md;
  }
  let bonus = offhand && !styles.includes('twoWeapon') ? Math.min(0, mods[ability]) : mods[ability];
  bonus += plus;
  if (styles.includes('dueling') && !w.props.includes('twoHanded') && !w.props.includes('ranged') && !offhand) bonus += 2;
  if (hasFeat(hero, 'greatWeaponMaster') && w.props.includes('heavy')) bonus += pb;
  const onHit = (inst?.affixes ?? []).map((a) => AFFIXES[a]?.onHit).filter(Boolean) as { dice: string; type: DamageType }[];
  onHit.push(...(def?.legend?.mods.onHit ?? []));
  if (invocations.includes('lifedrinker') && invocations.includes('pactOfTheBlade')) onHit.push({ dice: '1d6', type: 'necrotic' });
  return {
    name: def!.name + (plus ? ` +${plus}` : ''), toHit, dice, bonus, type: monk && hero.level >= 6 && w.props.includes('monk') ? 'force' : w.type,
    ranged: w.props.includes('ranged'), reach: w.props.includes('reach'), mastery: w.mastery, props: w.props, ability, onHit,
    heavy: w.props.includes('heavy'), light: w.props.includes('light'), plus,
  };
}

// ── creation ────────────────────────────────────────────────────────────────

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function heroUid(rng: Rng): string {
  return `h${Math.floor(rng.next() * 2 ** 32).toString(36)}`;
}

export function itemUid(rng: Rng): string {
  return `i${Math.floor(rng.next() * 2 ** 32).toString(36)}${Math.floor(rng.next() * 1e6).toString(36)}`;
}

export function makeItem(rng: Rng, defId: string, plus = 0, affixes: string[] = [], qty?: number): ItemInstance {
  const inst: ItemInstance = { uid: itemUid(rng), defId, plus, affixes };
  if (qty) inst.qty = qty;
  return inst;
}

export interface CreateOpts {
  name?: string;
  ancestry?: string;
  background?: string;
  portrait?: string;
  rolled?: boolean;
  /** Names already in use, so a generated name never collides. */
  taken?: Iterable<string>;
}

export function createHero(rng: Rng, classId: ClassId, level: number, opts: CreateOpts = {}): Hero {
  const cls = CLASSES[classId];
  const scores = opts.rolled
    ? Array.from({ length: 6 }, () => { const r = [rng.die(6), rng.die(6), rng.die(6), rng.die(6)].sort((a, b) => b - a); return r[0] + r[1] + r[2]; }).sort((a, b) => b - a)
    : STANDARD_ARRAY.slice();
  const abilities = {} as Record<Ability, number>;
  cls.arrayOrder.forEach((a, i) => (abilities[a] = scores[i]));
  const bg = BACKGROUNDS[opts.background ?? pickBackground(rng, classId)];
  // Background: +2 to the class's best listed ability, +1 to another.
  const bgOrder = bg.abilities.slice().sort((x, y) => cls.arrayOrder.indexOf(x) - cls.arrayOrder.indexOf(y));
  abilities[bgOrder[0]] = Math.min(20, abilities[bgOrder[0]] + 2);
  abilities[bgOrder[1]] = Math.min(20, abilities[bgOrder[1]] + 1);
  const variants = portraitsFor(classId);
  const variant = opts.portrait ? variants.find((p) => p.key === opts.portrait) : opts.ancestry ? variants.find((p) => p.ancestry === opts.ancestry) ?? rng.pick(variants) : rng.pick(variants);
  const ancestry = opts.ancestry ?? variant?.ancestry ?? rng.pick(Object.keys(SPECIES));
  const skills = new Set<Skill>(bg.skills);
  const spSkill = SPECIES[ancestry]?.skill;
  if (spSkill) skills.add(spSkill);
  const choices = rng.shuffle(cls.skillChoices.slice());
  for (const s of choices) {
    if ([...skills].filter((x) => cls.skillChoices.includes(x)).length >= cls.numSkills) break;
    skills.add(s);
  }
  const hero: Hero = {
    id: heroUid(rng),
    name: opts.name ?? uniqueName(rng, opts.taken ?? []),
    portrait: opts.portrait ?? variant?.key ?? `heroes/${classId}_1`,
    ancestry, background: bg.id, classId, level: 1, abilities,
    hpRolls: [], hp: 1, hitDice: 1,
    skillProfs: [...skills], expertise: [], feats: [bg.feat],
    choices: {}, equipment: {}, resources: {}, slots: [], prepared: [],
    status: 'alive', history: { expeditions: 0, clears: 0, kills: 0 },
  };
  autoChoices(hero, rng, 1);
  equipKit(hero, rng);
  for (let l = 2; l <= level; l++) applyLevel(hero, rng, l, true);
  autoPrepare(hero);
  fullRestore(hero);
  return hero;
}

function pickBackground(rng: Rng, classId: ClassId): string {
  const cls = CLASSES[classId];
  const best = Object.values(BACKGROUNDS).filter((b) => b.abilities.includes(cls.arrayOrder[0]));
  return rng.pick(best.length ? best : Object.values(BACKGROUNDS)).id;
}

function equipKit(hero: Hero, rng: Rng) {
  const kit = CLASSES[hero.classId].kit;
  for (const id of kit) {
    const def = ITEMS[id];
    if (!def) continue;
    const inst = makeItem(rng, id);
    if (def.kind === 'weapon') {
      if (!hero.equipment.mainHand) hero.equipment.mainHand = inst;
      else if (!hero.equipment.offHand && def.weapon!.props.includes('light') && ITEMS[hero.equipment.mainHand.defId]?.weapon?.props.includes('light')) hero.equipment.offHand = inst;
    } else if (def.kind === 'armor') hero.equipment.armor = inst;
    else if (def.kind === 'shield' && !ITEMS[hero.equipment.mainHand?.defId ?? '']?.weapon?.props.includes('twoHanded')) hero.equipment.offHand = inst;
    else if (def.kind === 'trinket') hero.equipment.trinket1 = inst;
  }
}

/** Auto-pick level choices (used for generated recruits and the "recommended" button). */
export function autoChoices(hero: Hero, rng: Rng, level: number) {
  const cls = CLASSES[hero.classId];
  for (const f of cls.features[level] ?? []) {
    if (!f.choice) continue;
    const opts = choiceOptions(hero, f.choice);
    switch (f.choice) {
      case 'asi': {
        const a = cls.arrayOrder.find((x) => hero.abilities[x] < 20) ?? cls.arrayOrder[0];
        hero.abilities[a] = Math.min(20, hero.abilities[a] + 2);
        break;
      }
      case 'expertise': {
        const pool = hero.skillProfs.filter((s) => !hero.expertise.includes(s));
        hero.expertise.push(...rng.sample(pool, f.choiceCount ?? 2));
        break;
      }
      default: {
        const key = f.choice;
        const have = hero.choices[key] ?? [];
        const avail = opts.filter((o) => !have.includes(o));
        const prefer: Record<string, string[]> = {
          fightingStyle: hero.classId === 'ranger' ? ['archery', 'defense'] : ['defense', 'dueling', 'greatWeapon'],
          metamagic: ['empowered', 'quickened', 'twinned', 'heightened'],
          invocation: ['agonizingBlast', 'armorOfShadows', 'repellingBlast', 'fiendishVigor', 'eldritchMind', 'devilsSight', 'gazeOfTwoMinds', 'lifedrinker'],
          epicBoon: ['fate', 'fortitude'],
          divineOrder: ['protector'],
          primalOrder: ['magician'],
        };
        const order = (prefer[key] ?? []).filter((o) => avail.includes(o)).concat(avail);
        hero.choices[key] = [...have, ...order.slice(0, f.choiceCount ?? 1)];
      }
    }
  }
}

export function choiceOptions(hero: Hero, kind: string): string[] {
  const tables = { FIGHTING_STYLES, METAMAGIC, INVOCATIONS, EPIC_BOONS };
  switch (kind) {
    case 'fightingStyle': return Object.keys(tables.FIGHTING_STYLES);
    case 'metamagic': return Object.keys(tables.METAMAGIC);
    case 'invocation': return Object.entries(tables.INVOCATIONS).filter(([, v]) => v.minLevel <= hero.level).map(([k]) => k);
    case 'epicBoon': return Object.keys(tables.EPIC_BOONS);
    case 'divineOrder': return ['protector', 'thaumaturge'];
    case 'primalOrder': return ['magician', 'warden'];
    case 'expertise': return hero.skillProfs.filter((s) => !hero.expertise.includes(s));
    default: return [];
  }
}

/** Apply one level. `auto` makes choices automatically (recruits). */
export function applyLevel(hero: Hero, rng: Rng, newLevel: number, auto: boolean) {
  const cls = CLASSES[hero.classId];
  hero.level = newLevel;
  hero.hpRolls.push(Math.floor(cls.hitDie / 2) + 1); // fixed average per SRD
  if (auto) {
    autoChoices(hero, rng, newLevel);
    const offer = markOffers(hero, newLevel)[0];
    if (offer) applyMark(hero, offer);
  }
}

export function fullRestore(hero: Hero) {
  const d = derive(hero);
  hero.hp = d.maxHp;
  hero.hitDice = hero.level;
  hero.resources = { ...d.resources };
  hero.slots = d.slots.slice();
}

export function shortRest(hero: Hero) {
  const d = derive(hero);
  const cls = CLASSES[hero.classId];
  for (const r of cls.resources) if (r.recharge === 'short') hero.resources[r.id] = r.max(hero.level, d.mods);
  if (hero.classId === 'bard' && hero.level >= 5) hero.resources.inspiration = d.resources.inspiration;
  if (hero.classId === 'warlock') hero.slots = d.slots.slice();
  if (hero.classId === 'sorcerer' && hero.level >= 5) hero.resources.sorcery = Math.min(d.resources.sorcery, (hero.resources.sorcery ?? 0) + Math.floor(hero.level / 2));
  if (hero.ancestry === 'goliath') hero.resources.stonesEndurance = d.resources.stonesEndurance;
}

/** Spend hit dice to heal during a short rest. Returns HP healed. */
export function spendHitDice(hero: Hero, rng: Rng, count: number): number {
  const d = derive(hero);
  let healed = 0;
  const cls = CLASSES[hero.classId];
  for (let i = 0; i < count && hero.hitDice > 0 && hero.hp < d.maxHp; i++) {
    hero.hitDice -= 1;
    const amt = Math.max(1, rng.die(cls.hitDie) + d.mods.con) * VITALITY;
    const before = hero.hp;
    hero.hp = Math.min(d.maxHp, Math.round(hero.hp + amt));
    healed += hero.hp - before;
  }
  return healed;
}

export function maxPrepared(hero: Hero): number {
  const c = CLASSES[hero.classId].caster;
  if (!c) return hero.feats.includes('magicInitiate') ? 1 : 0;
  return c.prepared[hero.level - 1];
}

/** Prepare the best available spells, keeping existing picks that are still legal. */
export function autoPrepare(hero: Hero) {
  const avail = spellsForClass(hero).filter((s) => s.level > 0);
  const legal = new Set(avail.map((s) => s.id));
  const keep = hero.prepared.filter((id) => legal.has(id));
  const max = maxPrepared(hero);
  const sorted = avail
    .filter((s) => !keep.includes(s.id))
    .sort((a, b) => (b.level - a.level) || (b.priority ?? 0) - (a.priority ?? 0));
  // Prefer a spread: alternate high-level and utility picks.
  const out = [...keep];
  for (const s of sorted) {
    if (out.length >= max) break;
    out.push(s.id);
  }
  hero.prepared = out.slice(0, max);
}

export function knownCantrips(hero: Hero): string[] {
  return spellsForClass(hero).filter((s) => s.level === 0).map((s) => s.id);
}

export function heroTitle(hero: Hero): string {
  return `${CLASSES[hero.classId].name} ${hero.level}`;
}

export function isSpellAvailable(hero: Hero, spellId: string): boolean {
  return !!SPELLS[spellId];
}
