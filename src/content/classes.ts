/**
 * The thirteen classes, levels 1–20: the twelve SRD 5.2.1 classes plus the
 * Artificer. Subclasses live in src/content/subclasses.ts and are chosen at
 * level 3 (the `subclass` choice below).
 *
 * Feature text paraphrases the SRD (CC BY 4.0). `impl` records how each
 * feature is translated into this game (plan §3.4 fidelity tiers):
 *   exact    — same math as the tabletop rule
 *   adapted  — translated to ranks/menus/fortune; behaviour documented
 *   narrative— flavour only; affects exploration text or nothing mechanical
 *
 * Words live in game.json → classes.<id>: name, summary, subclassLabel,
 * fortuneTalent, resources.<resourceId>.name and features.<featureId>.{name,text}.
 */
import type { Ability, ClassId, ConditionId, DamageType, Material, Skill } from '../engine/types.ts';
import type { LegendMods } from './items.ts';
import { bindText, text, textTable, type Textless } from '../i18n/index.ts';

export type Impl = 'exact' | 'adapted' | 'narrative';

export type ChoiceKind = 'asi' | 'fightingStyle' | 'metamagic' | 'invocation' | 'expertise' | 'epicBoon' | 'divineOrder' | 'primalOrder' | 'subclass';

/**
 * A data-driven active power (most subclass actives). It shows up as a button
 * under Skills and is resolved generically in combat (src/combat/hero.ts → usePower).
 *   blast  — damage to the target(s), scored as a spell hand; `save` halves it
 *   strike — a weapon Attack action whose first hit adds the dice
 *   heal   — heals the target(s), scored as a heal hand
 *   buff   — puts `cond` (and/or `tempHp`) on the target(s)
 *   debuff — `cond` on each target that fails the `save` (dice raise the DC)
 * Dice scale with level: `dice` is the count at level 3, doubled at 7,
 * tripled at 13 and quadrupled at 18 (like Divine Spark).
 */
export interface PowerDef {
  kind: 'blast' | 'strike' | 'heal' | 'buff' | 'debuff';
  cost: 'action' | 'bonus' | 'free';
  target: 'enemy' | 'rank' | 'enemies' | 'ally' | 'allies' | 'self';
  /** Resource spent per use (the subclass's own pool, or a class resource such as channel or focus). */
  resource: string;
  spend?: number;
  dice?: string;
  /** Added once to the dice: an ability modifier, the spellcasting modifier, or the hero's level. */
  flat?: Ability | 'spell' | 'level';
  dmg?: DamageType;
  save?: Ability;
  /** `perLevel` sets the condition's value to that × level (regeneration, burning, shield strength…). */
  cond?: { id: ConditionId; rounds: number; value?: number; perLevel?: number };
  /** Temp HP = this × level (× vitality). */
  tempHp?: number;
  melee?: boolean;
}

export interface FeatureDef {
  id: string;
  name: string;
  text: string;
  impl: Impl;
  /** Requires a level-up choice of this kind. */
  choice?: ChoiceKind;
  choiceCount?: number;
  /** Passive bonuses, folded into derive() exactly like gear hooks. */
  mods?: LegendMods;
  /** Conditions this hero can't suffer. */
  immune?: ConditionId[];
  /** An active power (see PowerDef). */
  power?: PowerDef;
}

export type CasterKind = 'full' | 'half' | 'pact';

export interface ResourceDef {
  id: string;
  name: string;
  max: (level: number, mods: Record<Ability, number>) => number;
  recharge: 'short' | 'long';
}

export interface ClassDef {
  id: ClassId;
  name: string;
  /** What the class calls its subclass: Primal Path, Divine Domain… */
  subclassLabel: string;
  hitDie: number;
  primary: Ability[];
  saves: Ability[];
  skillChoices: Skill[];
  numSkills: number;
  armor: ('light' | 'medium' | 'heavy' | 'shield')[];
  martial: boolean;
  caster?: { kind: CasterKind; ability: Ability; prepared: number[] };
  material: Material;
  /** Standard-array assignment, highest to lowest priority. */
  arrayOrder: Ability[];
  kit: string[];
  resources: ResourceDef[];
  /** Class features by level (the subclass adds its own; see featuresAt in subclasses.ts). */
  levels: Record<number, FeatureDef[]>;
  fortuneTalent: { name: string; text: string };
  summary: string;
  color: string;
}

/** Give a feature or resource `name`/`text` getters reading game.json at `path`.<id> (shared features keep theirs). */
export function bindNamed<T extends { id: string }>(x: T, path: readonly string[], keys: readonly ('name' | 'text')[] = ['name', 'text']): T {
  for (const k of keys) {
    if (Object.getOwnPropertyDescriptor(x, k)?.get) continue;
    Object.defineProperty(x, k, { get: () => text('game', [...path, x.id, k]), enumerable: true, configurable: true });
  }
  return x;
}

const pb = (lvl: number) => 2 + Math.floor((lvl - 1) / 4);
// Features every class shares; their words are game.json → classFeatures.<key>.
const feature = (key: string, f: Textless<FeatureDef, 'name' | 'text'>) => textTable<FeatureDef, 'name' | 'text'>('game', ['classFeatures', key], f);
const asi = () => feature('asi', { id: 'asi', impl: 'exact', choice: 'asi' });
const epic = () => feature('epicBoon', { id: 'epicBoon', impl: 'adapted', choice: 'epicBoon' });
const mastery = () => feature('weaponMastery', { id: 'weaponMastery', impl: 'adapted' });
const extra = (n = 1) => { const id = n === 1 ? 'extraAttack' : `extraAttack${n}`; return feature(id, { id, impl: 'exact' }); };
const spellcasting = (abil: 'Intelligence' | 'Wisdom' | 'Charisma') => feature(`spellcasting_${abil}`, { id: 'spellcasting', impl: 'adapted' });
const sub = () => feature('subclass', { id: 'subclass', impl: 'exact', choice: 'subclass' });

const FULL_PREP = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22];
const HALF_PREP = [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15];
const PACT_PREP = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];

type ClassData = Omit<ClassDef, 'name' | 'summary' | 'subclassLabel' | 'fortuneTalent' | 'resources' | 'levels'> & {
  fortuneTalent: object;
  resources: Omit<ResourceDef, 'name'>[];
  levels: Record<number, Omit<FeatureDef, 'name' | 'text'>[]>;
};

const CLASS_DATA: Record<ClassId, ClassData> = {
  barbarian: {
    id: 'barbarian',
    hitDie: 12, primary: ['str'], saves: ['str', 'con'],
    skillChoices: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'], numSkills: 2,
    armor: ['light', 'medium', 'shield'], martial: true, material: 'blood',
    arrayOrder: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
    kit: ['greataxe', 'handaxe', 'potionHealing'],
    color: '#b3233a',
    fortuneTalent: {},
    resources: [
      { id: 'rage', recharge: 'long', max: (l) => [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6][l - 1] }],
    levels: {
      1: [
        { id: 'rage', impl: 'adapted' },
        { id: 'unarmoredDefense', impl: 'exact' },
        mastery()],
      2: [
        { id: 'recklessAttack', impl: 'exact' },
        { id: 'dangerSense', impl: 'exact' }],
      3: [sub(),
        { id: 'primalKnowledge', impl: 'narrative' }],
      4: [asi()],
      5: [extra(), { id: 'fastMovement', impl: 'adapted' }],
      7: [{ id: 'feralInstinct', impl: 'exact' }, { id: 'instinctivePounce', impl: 'adapted' }],
      8: [asi()],
      9: [{ id: 'brutalStrike', impl: 'adapted' }],
      11: [{ id: 'relentlessRage', impl: 'exact' }],
      12: [asi()],
      13: [{ id: 'improvedBrutalStrike', impl: 'adapted' }],
      15: [{ id: 'persistentRage', impl: 'adapted' }],
      16: [asi()],
      17: [{ id: 'improvedBrutalStrike2', impl: 'exact' }],
      18: [{ id: 'indomitableMight', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'primalChampion', impl: 'exact' }],
    },
  },

  bard: {
    id: 'bard',
    hitDie: 8, primary: ['cha'], saves: ['dex', 'cha'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival', 'arcana', 'animalHandling'], numSkills: 3,
    armor: ['light'], martial: false, material: 'arcane',
    arrayOrder: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
    caster: { kind: 'full', ability: 'cha', prepared: FULL_PREP },
    kit: ['rapier', 'leather', 'potionHealing'],
    color: '#7b6cf0',
    fortuneTalent: {},
    resources: [
      { id: 'inspiration', recharge: 'long', max: (_l, m) => Math.max(1, m.cha) }],
    levels: {
      1: [
        { id: 'bardicInspiration', impl: 'adapted' },
        spellcasting('Charisma')],
      2: [
        { id: 'expertise', impl: 'exact', choice: 'expertise', choiceCount: 2 },
        { id: 'jackOfAllTrades', impl: 'exact' }],
      3: [sub()],
      4: [asi()],
      5: [{ id: 'fontOfInspiration', impl: 'exact' }],
      7: [{ id: 'countercharm', impl: 'adapted' }],
      8: [asi()],
      10: [{ id: 'magicalSecrets', impl: 'adapted' }],
      12: [asi()],
      16: [asi()],
      18: [{ id: 'superiorInspiration', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'wordsOfCreation', impl: 'adapted' }],
    },
  },

  cleric: {
    id: 'cleric',
    hitDie: 8, primary: ['wis'], saves: ['wis', 'cha'],
    skillChoices: ['history', 'insight', 'medicine', 'persuasion', 'religion'], numSkills: 2,
    armor: ['light', 'medium', 'shield'], martial: false, material: 'sun',
    arrayOrder: ['wis', 'con', 'str', 'cha', 'dex', 'int'],
    caster: { kind: 'full', ability: 'wis', prepared: FULL_PREP },
    kit: ['mace', 'scaleMail', 'shield', 'potionHealing'],
    color: '#f5c74a',
    fortuneTalent: {},
    resources: [
      { id: 'channel', recharge: 'short', max: (l) => (l >= 18 ? 4 : l >= 6 ? 3 : l >= 2 ? 2 : 0) },
      { id: 'intervention', recharge: 'long', max: (l) => (l >= 10 ? 1 : 0) }],
    levels: {
      1: [spellcasting('Wisdom'), { id: 'divineOrder', impl: 'adapted', choice: 'divineOrder' }],
      2: [
        { id: 'divineSpark', impl: 'adapted' },
        { id: 'turnUndead', impl: 'adapted' }],
      3: [sub()],
      4: [asi()],
      5: [{ id: 'searUndead', impl: 'exact' }],
      7: [{ id: 'blessedStrikes', impl: 'exact' }],
      8: [asi()],
      10: [{ id: 'divineIntervention', impl: 'adapted' }],
      12: [asi()],
      14: [{ id: 'improvedBlessedStrikes', impl: 'exact' }],
      16: [asi()],
      19: [epic()],
      20: [{ id: 'greaterIntervention', impl: 'adapted' }],
    },
  },

  druid: {
    id: 'druid',
    hitDie: 8, primary: ['wis'], saves: ['int', 'wis'],
    skillChoices: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'], numSkills: 2,
    armor: ['light', 'shield'], martial: false, material: 'verdant',
    arrayOrder: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
    caster: { kind: 'full', ability: 'wis', prepared: FULL_PREP },
    kit: ['quarterstaff', 'leather', 'shield', 'potionHealing'],
    color: '#5fae5b',
    fortuneTalent: {},
    resources: [
      { id: 'wildShape', recharge: 'short', max: (l) => (l >= 17 ? 4 : l >= 6 ? 3 : l >= 2 ? 2 : 0) }],
    levels: {
      1: [spellcasting('Wisdom'), { id: 'primalOrder', impl: 'adapted', choice: 'primalOrder' }],
      2: [{ id: 'wildShape', impl: 'adapted' }],
      3: [sub()],
      4: [asi()],
      5: [{ id: 'wildResurgence', impl: 'adapted' }],
      7: [{ id: 'elementalFury', impl: 'exact' }],
      8: [asi()],
      12: [asi()],
      15: [{ id: 'improvedElementalFury', impl: 'adapted' }],
      16: [asi()],
      18: [{ id: 'beastSpells', impl: 'exact' }],
      19: [epic()],
      20: [{ id: 'archdruid', impl: 'adapted' }],
    },
  },

  fighter: {
    id: 'fighter',
    hitDie: 10, primary: ['str', 'dex'], saves: ['str', 'con'],
    skillChoices: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'], numSkills: 2,
    armor: ['light', 'medium', 'heavy', 'shield'], martial: true, material: 'steel',
    arrayOrder: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
    kit: ['longsword', 'chainMail', 'shield', 'potionHealing'],
    color: '#9fb2c4',
    fortuneTalent: {},
    resources: [
      { id: 'secondWind', recharge: 'short', max: (l) => (l >= 10 ? 4 : l >= 4 ? 3 : 2) },
      { id: 'actionSurge', recharge: 'short', max: (l) => (l >= 17 ? 2 : l >= 2 ? 1 : 0) },
      { id: 'indomitable', recharge: 'long', max: (l) => (l >= 17 ? 3 : l >= 13 ? 2 : l >= 9 ? 1 : 0) }],
    levels: {
      1: [
        { id: 'fightingStyle', impl: 'exact', choice: 'fightingStyle' },
        { id: 'secondWind', impl: 'exact' },
        mastery()],
      2: [
        { id: 'actionSurge', impl: 'adapted' },
        { id: 'tacticalMind', impl: 'adapted' }],
      3: [sub()],
      4: [asi()],
      5: [extra(), { id: 'tacticalShift', impl: 'adapted' }],
      6: [asi()],
      8: [asi()],
      9: [
        { id: 'indomitable', impl: 'exact' },
        { id: 'tacticalMaster', impl: 'adapted' }],
      11: [extra(2)],
      12: [asi()],
      13: [{ id: 'studiedAttacks', impl: 'exact' }],
      14: [asi()],
      16: [asi()],
      17: [{ id: 'actionSurge2', impl: 'exact' }],
      19: [epic()],
      20: [extra(3)],
    },
  },

  monk: {
    id: 'monk',
    hitDie: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'],
    skillChoices: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'], numSkills: 2,
    armor: [], martial: false, material: 'storm',
    arrayOrder: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
    kit: ['quarterstaff', 'dart', 'potionHealing'],
    color: '#3a8fb8',
    fortuneTalent: {},
    resources: [
      { id: 'focus', recharge: 'short', max: (l) => (l >= 2 ? l : 0) }],
    levels: {
      1: [
        { id: 'martialArts', impl: 'adapted' },
        { id: 'unarmoredDefenseMonk', impl: 'exact' }],
      2: [
        { id: 'flurryOfBlows', impl: 'adapted' },
        { id: 'patientDefense', impl: 'adapted' },
        { id: 'uncannyMetabolism', impl: 'adapted' }],
      3: [sub(),
        { id: 'deflectAttacks', impl: 'adapted' }],
      4: [asi(), { id: 'slowFall', impl: 'adapted' }],
      5: [extra(), { id: 'stunningStrike', impl: 'adapted' }],
      6: [{ id: 'empoweredStrikes', impl: 'exact' }],
      7: [{ id: 'evasion', impl: 'exact' }],
      8: [asi()],
      9: [{ id: 'acrobaticMovement', impl: 'adapted' }],
      10: [{ id: 'heightenedFocus', impl: 'adapted' }, { id: 'selfRestoration', impl: 'exact' }],
      12: [asi()],
      13: [{ id: 'deflectEnergy', impl: 'exact' }],
      14: [{ id: 'disciplinedSurvivor', impl: 'exact' }],
      15: [{ id: 'perfectFocus', impl: 'exact' }],
      16: [asi()],
      18: [{ id: 'superiorDefense', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'bodyAndMind', impl: 'exact' }],
    },
  },

  paladin: {
    id: 'paladin',
    hitDie: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'],
    skillChoices: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'], numSkills: 2,
    armor: ['light', 'medium', 'heavy', 'shield'], martial: true, material: 'sun',
    arrayOrder: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
    caster: { kind: 'half', ability: 'cha', prepared: HALF_PREP },
    kit: ['longsword', 'chainMail', 'shield', 'potionHealing'],
    color: '#e8c35a',
    fortuneTalent: {},
    resources: [
      { id: 'layOnHands', recharge: 'long', max: (l) => 5 * l },
      { id: 'channel', recharge: 'short', max: (l) => (l >= 11 ? 3 : l >= 3 ? 2 : 0) },
      { id: 'freeSmite', recharge: 'long', max: (l) => (l >= 2 ? 1 : 0) }],
    levels: {
      1: [
        { id: 'layOnHands', impl: 'exact' },
        spellcasting('Charisma'),
        mastery()],
      2: [
        { id: 'fightingStyle', impl: 'exact', choice: 'fightingStyle' },
        { id: 'paladinsSmite', impl: 'exact' }],
      3: [sub(),
        { id: 'divineSense', impl: 'narrative' }],
      4: [asi()],
      5: [extra(), { id: 'faithfulSteed', impl: 'narrative' }],
      6: [{ id: 'auraOfProtection', impl: 'adapted' }],
      8: [asi()],
      9: [{ id: 'abjureFoes', impl: 'adapted' }],
      10: [{ id: 'auraOfCourage', impl: 'adapted' }],
      11: [{ id: 'radiantStrikes', impl: 'exact' }],
      12: [asi()],
      14: [{ id: 'restoringTouch', impl: 'exact' }],
      16: [asi()],
      18: [{ id: 'auraExpansion', impl: 'adapted' }],
      19: [epic()],
    },
  },

  ranger: {
    id: 'ranger',
    hitDie: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'],
    skillChoices: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'], numSkills: 3,
    armor: ['light', 'medium', 'shield'], martial: true, material: 'verdant',
    arrayOrder: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
    caster: { kind: 'half', ability: 'wis', prepared: HALF_PREP },
    kit: ['longbow', 'shortsword', 'studdedLeather', 'potionHealing'],
    color: '#4d9c58',
    fortuneTalent: {},
    resources: [
      { id: 'favoredEnemy', recharge: 'long', max: (l) => (l >= 17 ? 6 : l >= 13 ? 5 : l >= 9 ? 4 : l >= 5 ? 3 : 2) },
      { id: 'tireless', recharge: 'long', max: (l, m) => (l >= 10 ? Math.max(1, m.wis) : 0) }],
    levels: {
      1: [
        spellcasting('Wisdom'),
        { id: 'favoredEnemy', impl: 'exact' },
        mastery()],
      2: [{ id: 'deftExplorer', impl: 'adapted' }, { id: 'fightingStyle', impl: 'exact', choice: 'fightingStyle' }],
      3: [sub()],
      4: [asi()],
      5: [extra()],
      6: [{ id: 'roving', impl: 'adapted' }],
      8: [asi()],
      9: [{ id: 'expertiseRanger', impl: 'exact', choice: 'expertise', choiceCount: 2 }],
      10: [{ id: 'tireless', impl: 'exact' }],
      12: [asi()],
      13: [{ id: 'relentlessHunter', impl: 'exact' }],
      14: [{ id: 'naturesVeil', impl: 'adapted' }],
      16: [asi()],
      17: [{ id: 'preciseHunter', impl: 'exact' }],
      18: [{ id: 'feralSenses', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'foeSlayer', impl: 'exact' }],
    },
  },

  rogue: {
    id: 'rogue',
    hitDie: 8, primary: ['dex'], saves: ['dex', 'int'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleightOfHand', 'stealth'], numSkills: 4,
    armor: ['light'], martial: false, material: 'shadow',
    arrayOrder: ['dex', 'con', 'wis', 'int', 'cha', 'str'],
    kit: ['shortsword', 'shortbow', 'leather', 'thievesTools', 'potionHealing'],
    color: '#4b3b6b',
    fortuneTalent: {},
    resources: [{ id: 'strokeOfLuck', recharge: 'short', max: (l) => (l >= 20 ? 1 : 0) }],
    levels: {
      1: [
        { id: 'expertise', impl: 'exact', choice: 'expertise', choiceCount: 2 },
        { id: 'sneakAttack', impl: 'adapted' },
        { id: 'thievesCant', impl: 'narrative' },
        mastery()],
      2: [{ id: 'cunningAction', impl: 'adapted' }],
      3: [sub(), { id: 'steadyAim', impl: 'exact' }],
      4: [asi()],
      5: [{ id: 'cunningStrike', impl: 'adapted' }, { id: 'uncannyDodge', impl: 'adapted' }],
      6: [{ id: 'expertise2', impl: 'exact', choice: 'expertise', choiceCount: 2 }],
      7: [{ id: 'evasion', impl: 'exact' }, { id: 'reliableTalent', impl: 'exact' }],
      8: [asi()],
      10: [asi()],
      11: [{ id: 'improvedCunningStrike', impl: 'adapted' }],
      12: [asi()],
      14: [{ id: 'deviousStrikes', impl: 'adapted' }],
      15: [{ id: 'slipperyMind', impl: 'exact' }],
      16: [asi()],
      18: [{ id: 'elusive', impl: 'exact' }],
      19: [epic()],
      20: [{ id: 'strokeOfLuck', impl: 'exact' }],
    },
  },

  sorcerer: {
    id: 'sorcerer',
    hitDie: 6, primary: ['cha'], saves: ['con', 'cha'],
    skillChoices: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'], numSkills: 2,
    armor: [], martial: false, material: 'ember',
    arrayOrder: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
    caster: { kind: 'full', ability: 'cha', prepared: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
    kit: ['dagger', 'quarterstaff', 'potionHealing'],
    color: '#e4643a',
    fortuneTalent: {},
    resources: [
      { id: 'sorcery', recharge: 'long', max: (l) => (l >= 2 ? l : 0) },
      { id: 'innateSorcery', recharge: 'long', max: () => 2 }],
    levels: {
      1: [spellcasting('Charisma'), { id: 'innateSorcery', impl: 'exact' }],
      2: [{ id: 'fontOfMagic', impl: 'adapted' }, { id: 'metamagic', impl: 'adapted', choice: 'metamagic', choiceCount: 2 }],
      3: [sub()],
      4: [asi()],
      5: [{ id: 'sorcerousRestoration', impl: 'exact' }],
      7: [{ id: 'sorceryIncarnate', impl: 'adapted' }],
      8: [asi()],
      10: [{ id: 'metamagic2', impl: 'adapted', choice: 'metamagic', choiceCount: 1 }],
      12: [asi()],
      16: [asi()],
      17: [{ id: 'metamagic3', impl: 'adapted', choice: 'metamagic', choiceCount: 1 }],
      19: [epic()],
      20: [{ id: 'arcaneApotheosis', impl: 'exact' }],
    },
  },

  warlock: {
    id: 'warlock',
    hitDie: 8, primary: ['cha'], saves: ['wis', 'cha'],
    skillChoices: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'], numSkills: 2,
    armor: ['light'], martial: false, material: 'shadow',
    arrayOrder: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
    caster: { kind: 'pact', ability: 'cha', prepared: PACT_PREP },
    kit: ['dagger', 'leather', 'potionHealing'],
    color: '#6b3b7a',
    fortuneTalent: {},
    resources: [
      { id: 'arcanum6', recharge: 'long', max: (l) => (l >= 11 ? 1 : 0) },
      { id: 'arcanum7', recharge: 'long', max: (l) => (l >= 13 ? 1 : 0) },
      { id: 'arcanum8', recharge: 'long', max: (l) => (l >= 15 ? 1 : 0) },
      { id: 'arcanum9', recharge: 'long', max: (l) => (l >= 17 ? 1 : 0) }],
    levels: {
      1: [
        { id: 'eldritchInvocations', impl: 'adapted', choice: 'invocation', choiceCount: 1 },
        { id: 'pactMagic', impl: 'exact' }],
      2: [{ id: 'magicalCunning', impl: 'adapted' }, { id: 'invocation2', impl: 'adapted', choice: 'invocation', choiceCount: 2 }],
      3: [sub()],
      4: [asi()],
      5: [{ id: 'invocation3', impl: 'adapted', choice: 'invocation', choiceCount: 2 }],
      7: [{ id: 'invocation4', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      8: [asi()],
      9: [{ id: 'contactPatron', impl: 'adapted' }, { id: 'invocation5', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      11: [{ id: 'mysticArcanum6', impl: 'exact' }],
      12: [asi(), { id: 'invocation6', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      13: [{ id: 'mysticArcanum7', impl: 'exact' }],
      15: [{ id: 'mysticArcanum8', impl: 'exact' }, { id: 'invocation7', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      16: [asi()],
      17: [{ id: 'mysticArcanum9', impl: 'exact' }],
      18: [{ id: 'invocation8', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      19: [epic()],
      20: [{ id: 'eldritchMaster', impl: 'adapted' }],
    },
  },

  wizard: {
    id: 'wizard',
    hitDie: 6, primary: ['int'], saves: ['int', 'wis'],
    skillChoices: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'], numSkills: 2,
    armor: [], martial: false, material: 'arcane',
    arrayOrder: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
    caster: { kind: 'full', ability: 'int', prepared: FULL_PREP },
    kit: ['quarterstaff', 'dagger', 'potionHealing'],
    color: '#5b6cf0',
    fortuneTalent: {},
    resources: [{ id: 'arcaneRecovery', recharge: 'long', max: () => 1 }],
    levels: {
      1: [spellcasting('Intelligence'), { id: 'arcaneRecovery', impl: 'exact' }],
      2: [{ id: 'scholar', impl: 'exact' }],
      3: [sub()],
      4: [asi()],
      5: [{ id: 'memorizeSpell', impl: 'adapted' }],
      8: [asi()],
      12: [asi()],
      16: [asi()],
      18: [{ id: 'spellMastery', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'signatureSpells', impl: 'adapted' }],
    },
  },

  artificer: {
    id: 'artificer',
    hitDie: 8, primary: ['int'], saves: ['con', 'int'],
    skillChoices: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleightOfHand'], numSkills: 2,
    armor: ['light', 'medium', 'shield'], martial: false, material: 'steel',
    arrayOrder: ['int', 'con', 'dex', 'wis', 'str', 'cha'],
    caster: { kind: 'half', ability: 'int', prepared: HALF_PREP },
    kit: ['lightCrossbow', 'scaleMail', 'potionHealing'],
    color: '#c08a3e',
    fortuneTalent: {},
    resources: [
      { id: 'flash', recharge: 'long', max: (l, m) => (l >= 7 ? Math.max(1, m.int) : 0) },
      { id: 'storedSpell', recharge: 'long', max: (l, m) => (l >= 11 ? Math.max(2, 2 * m.int) : 0) },
    ],
    levels: {
      1: [{ id: 'magicalTinkering', impl: 'narrative' }, spellcasting('Intelligence')],
      2: [{ id: 'infuseItem', impl: 'adapted', mods: { ac: 1, weaponPlus: 1 } }],
      3: [sub(), { id: 'rightTool', impl: 'narrative' }],
      4: [asi()],
      6: [{ id: 'toolExpertise', impl: 'adapted', mods: { tricks: 1 } }],
      7: [{ id: 'flashOfGenius', impl: 'adapted' }],
      8: [asi()],
      10: [{ id: 'magicItemAdept', impl: 'adapted', mods: { weaponPlus: 1 } }],
      11: [{ id: 'spellStoringItem', impl: 'adapted', power: { kind: 'blast', cost: 'action', target: 'enemy', resource: 'storedSpell', dice: '3d6', flat: 'int', dmg: 'fire' } }],
      12: [asi()],
      14: [{ id: 'magicItemSavant', impl: 'adapted', mods: { saves: 1 } }],
      16: [asi()],
      18: [{ id: 'magicItemMaster', impl: 'adapted', mods: { rerolls: 1 } }],
      19: [epic()],
      20: [{ id: 'soulOfArtifice', impl: 'adapted', mods: { saves: 1, deathWard: true } }],
    },
  },
};

/** Class data with its words bound: game.json → classes.<id> (shared features: classFeatures). */
export const CLASSES = CLASS_DATA as unknown as Record<ClassId, ClassDef>;
for (const [cid, c] of Object.entries(CLASSES)) {
  const path = ['classes', cid];
  for (const k of ['name', 'summary', 'subclassLabel'] as const) Object.defineProperty(c, k, { get: () => text('game', [...path, k]), enumerable: true, configurable: true });
  bindText(c.fortuneTalent, 'game', [...path, 'fortuneTalent']);
  for (const r of c.resources) bindNamed(r, [...path, 'resources'], ['name']);
  for (const fs of Object.values(c.levels)) for (const f of fs) bindNamed(f, [...path, 'features']);
}

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export function proficiency(level: number): number {
  return pb(level);
}

// ── spell slots ──────────────────────────────────────────────────────────────

const FULL_SLOTS: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Max slots by spell level (index 1..9). */
export function maxSlots(classId: ClassId, level: number): number[] {
  const c = CLASSES[classId].caster;
  const out = new Array(10).fill(0);
  if (!c) return out;
  if (c.kind === 'pact') {
    const { count, slotLevel } = pactSlots(level);
    out[slotLevel] = count;
    return out;
  }
  const eff = c.kind === 'full' ? level : Math.ceil(level / 2);
  const row = FULL_SLOTS[Math.max(0, eff - 1)];
  row.forEach((n, i) => (out[i + 1] = n));
  return out;
}

export function pactSlots(level: number): { count: number; slotLevel: number } {
  const count = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
  const slotLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
  return { count, slotLevel };
}

export function maxSpellLevel(classId: ClassId, level: number): number {
  const s = maxSlots(classId, level);
  let m = 0;
  for (let i = 1; i <= 9; i++) if (s[i] > 0) m = i;
  return m;
}

// ── fighting styles, metamagic, invocations, feats, boons ───────────────────

export const FIGHTING_STYLES = textTable<Record<string, { name: string; text: string }>, 'name' | 'text'>('game', ['fightingStyles'], {
  archery: {},
  defense: {},
  dueling: {},
  greatWeapon: {},
  protection: {},
  twoWeapon: {},
  blindFighting: {},
  interception: {},
});

export const METAMAGIC = textTable<Record<string, { name: string; text: string; cost: number }>, 'name' | 'text'>('game', ['metamagic'], {
  quickened: { cost: 2 },
  twinned: { cost: 1 },
  empowered: { cost: 1 },
  heightened: { cost: 2 },
  careful: { cost: 1 },
  seeking: { cost: 1 },
});

export const INVOCATIONS = textTable<Record<string, { name: string; text: string; minLevel: number }>, 'name' | 'text'>('game', ['invocations'], {
  agonizingBlast: { minLevel: 2 },
  repellingBlast: { minLevel: 2 },
  armorOfShadows: { minLevel: 1 },
  pactOfTheBlade: { minLevel: 1 },
  thirstingBlade: { minLevel: 5 },
  devilsSight: { minLevel: 2 },
  lifedrinker: { minLevel: 9 },
  eldritchMind: { minLevel: 1 },
  fiendishVigor: { minLevel: 2 },
  gazeOfTwoMinds: { minLevel: 5 },
});

export interface FeatDef {
  name: string;
  text: string;
  repeatable?: boolean;
  /** +1 to the best of these abilities when taken. */
  ability?: Ability[];
  /** Only heroes of this species may take it (species feats). */
  species?: string;
  /** Passive bonuses, folded into derive() like class perks. */
  mods?: LegendMods;
  immune?: ConditionId[];
}

/** Feats: the general SRD ones, then two species feats per species (original to this game). */
export const FEATS = textTable<Record<string, FeatDef>, 'name' | 'text'>('game', ['feats'], {
  alert: {},
  tough: {},
  lucky: {},
  savageAttacker: {},
  greatWeaponMaster: { ability: ['str'] },
  sharpshooter: { ability: ['dex'] },
  warCaster: { ability: ['int', 'wis', 'cha'] },
  resilient: { ability: ['con'] },
  defensiveDuelist: {},
  healer: {},
  magicInitiate: {},
  // Species feats: +1 to an ability and one perk, worth about as much as Great Weapon Master or Sharpshooter.
  manyHands: { species: 'human', ability: ['str', 'dex', 'con', 'int', 'wis', 'cha'], mods: { tricks: 1, skillProf: ['athletics'] } },
  lanternBearer: { species: 'human', ability: ['con', 'wis'], mods: { tokens: ['tonic'], init: 1 } },
  moonlitStep: { species: 'elf', ability: ['dex', 'wis'], mods: { openingHidden: true } },
  starsong: { species: 'elf', ability: ['dex', 'int', 'cha'], mods: { hand: { hands: ['straight', 'straightSet'], mult: 2 } } },
  forgeBlooded: { species: 'dwarf', ability: ['str', 'con'], mods: { resist: ['fire'], hpPct: 0.05 } },
  stoneTally: { species: 'dwarf', ability: ['con', 'wis'], mods: { hand: { hands: ['three', 'four'], mult: 2 } } },
  secondBreakfast: { species: 'halfling', ability: ['con', 'dex'], mods: { healTakenPct: 0.2 } },
  pocketfulOfLuck: { species: 'halfling', ability: ['dex', 'cha'], mods: { tokens: ['mulligan', 'fateCoin'] } },
  hoardSense: { species: 'dragonborn', ability: ['str', 'cha'], mods: { hand: { hands: ['fullHouse', 'hoard'], mult: 3 } } },
  scaledHide: { species: 'dragonborn', ability: ['con'], mods: { ac: 1 } },
  tinkersKnack: { species: 'gnome', ability: ['int', 'dex'], mods: { tricks: 1, skillProf: ['sleightOfHand'] } },
  clockworkOdds: { species: 'gnome', ability: ['int'], mods: { openingWild: 1 } },
  mountainborn: { species: 'goliath', ability: ['str', 'con'], mods: { resist: ['cold'] }, immune: ['prone'] },
  giantsGrip: { species: 'goliath', ability: ['str'], mods: { weaponPlus: 1 } },
  bloodFury: { species: 'orc', ability: ['str', 'con'], mods: { bloodied: 0.15 } },
  trophyTaker: { species: 'orc', ability: ['str', 'wis'], mods: { onKill: { healPct: 0.06 } } },
  hellfireBlood: { species: 'tiefling', ability: ['con', 'cha'], mods: { thorns: 0.5, thornsType: 'fire' } },
  devilsBargain: { species: 'tiefling', ability: ['cha', 'int'], mods: { affinity: ['shadow', 'ember'] } },
});

/** Feats this hero may take: general ones, plus their own species' feats. */
export function featsFor(ancestry: string): string[] {
  return Object.entries(FEATS).filter(([, f]) => !f.species || f.species === ancestry).map(([k]) => k);
}

export const EPIC_BOONS = textTable<Record<string, { name: string; text: string }>, 'name' | 'text'>('game', ['epicBoons'], {
  combatProwess: {},
  fortitude: {},
  fate: {},
  spellRecall: {},
});

export const DIVINE_ORDERS = bindText({} as Record<'protector' | 'thaumaturge', string>, 'game', ['divineOrders']);
export const PRIMAL_ORDERS = bindText({} as Record<'magician' | 'warden', string>, 'game', ['primalOrders']);
