/**
 * The twelve SRD 5.2.1 classes with their SRD subclass, levels 1–20.
 *
 * Feature text paraphrases the SRD (CC BY 4.0). `impl` records how each
 * feature is translated into this game (plan §3.4 fidelity tiers):
 *   exact    — same math as the tabletop rule
 *   adapted  — translated to ranks/menus/fortune; behaviour documented
 *   narrative— flavour only; affects exploration text or nothing mechanical
 */
import type { Ability, ClassId, Material, Skill } from '../engine/types.ts';
import { bindText, textTable, type Textless } from '../i18n/index.ts';

export type Impl = 'exact' | 'adapted' | 'narrative';

export interface FeatureDef {
  id: string;
  name: string;
  text: string;
  impl: Impl;
  /** Requires a level-up choice of this kind. */
  choice?: 'asi' | 'fightingStyle' | 'metamagic' | 'invocation' | 'expertise' | 'epicBoon' | 'divineOrder' | 'primalOrder';
  choiceCount?: number;
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
  subclass: { id: string; name: string };
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
  features: Record<number, FeatureDef[]>;
  fortuneTalent: { name: string; text: string };
  summary: string;
  color: string;
}

const pb = (lvl: number) => 2 + Math.floor((lvl - 1) / 4);
// Features every class shares; their words are game.json → classFeatures.<key>.
const feature = (key: string, f: Textless<FeatureDef, 'name' | 'text'>) => textTable<FeatureDef, 'name' | 'text'>('game', ['classFeatures', key], f);
const asi = () => feature('asi', { id: 'asi', impl: 'exact', choice: 'asi' });
const epic = () => feature('epicBoon', { id: 'epicBoon', impl: 'adapted', choice: 'epicBoon' });
const mastery = () => feature('weaponMastery', { id: 'weaponMastery', impl: 'adapted' });
const extra = (n = 1) => { const id = n === 1 ? 'extraAttack' : `extraAttack${n}`; return feature(id, { id, impl: 'exact' }); };
const spellcasting = (abil: 'Intelligence' | 'Wisdom' | 'Charisma') => feature(`spellcasting_${abil}`, { id: 'spellcasting', impl: 'adapted' });

const FULL_PREP = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22];
const HALF_PREP = [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15];
const PACT_PREP = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];

/** Class names, summaries, resources and features: game.json → classes.<id> (shared features: classFeatures). */
export const CLASSES = textTable<Record<ClassId, ClassDef>, 'name' | 'text' | 'summary'>('game', ['classes'], {
  barbarian: {
    id: 'barbarian', subclass: { id: 'berserker' },
    hitDie: 12, primary: ['str'], saves: ['str', 'con'],
    skillChoices: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'], numSkills: 2,
    armor: ['light', 'medium', 'shield'], martial: true, material: 'blood',
    arrayOrder: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
    kit: ['greataxe', 'handaxe', 'potionHealing'],
    color: '#b3233a',
    fortuneTalent: {},
    resources: [
      { id: 'rage', recharge: 'long', max: (l) => [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6][l - 1] },
      { id: 'intimidate', recharge: 'long', max: (l) => (l >= 14 ? 1 : 0) },
    ],
    features: {
      1: [
        { id: 'rage', impl: 'adapted' },
        { id: 'unarmoredDefense', impl: 'exact' },
        mastery(),
      ],
      2: [
        { id: 'recklessAttack', impl: 'exact' },
        { id: 'dangerSense', impl: 'exact' },
      ],
      3: [
        { id: 'frenzy', impl: 'exact' },
        { id: 'primalKnowledge', impl: 'narrative' },
      ],
      4: [asi()],
      5: [extra(), { id: 'fastMovement', impl: 'adapted' }],
      6: [{ id: 'mindlessRage', impl: 'exact' }],
      7: [{ id: 'feralInstinct', impl: 'exact' }, { id: 'instinctivePounce', impl: 'adapted' }],
      8: [asi()],
      9: [{ id: 'brutalStrike', impl: 'adapted' }],
      10: [{ id: 'retaliation', impl: 'adapted' }],
      11: [{ id: 'relentlessRage', impl: 'exact' }],
      12: [asi()],
      13: [{ id: 'improvedBrutalStrike', impl: 'adapted' }],
      14: [{ id: 'intimidatingPresence', impl: 'adapted' }],
      15: [{ id: 'persistentRage', impl: 'adapted' }],
      16: [asi()],
      17: [{ id: 'improvedBrutalStrike2', impl: 'exact' }],
      18: [{ id: 'indomitableMight', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'primalChampion', impl: 'exact' }],
    },
  },

  bard: {
    id: 'bard', subclass: { id: 'lore' },
    hitDie: 8, primary: ['cha'], saves: ['dex', 'cha'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival', 'arcana', 'animalHandling'], numSkills: 3,
    armor: ['light'], martial: false, material: 'arcane',
    arrayOrder: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
    caster: { kind: 'full', ability: 'cha', prepared: FULL_PREP },
    kit: ['rapier', 'leather', 'potionHealing'],
    color: '#7b6cf0',
    fortuneTalent: {},
    resources: [
      { id: 'inspiration', recharge: 'long', max: (_l, m) => Math.max(1, m.cha) },
    ],
    features: {
      1: [
        { id: 'bardicInspiration', impl: 'adapted' },
        spellcasting('Charisma'),
      ],
      2: [
        { id: 'expertise', impl: 'exact', choice: 'expertise', choiceCount: 2 },
        { id: 'jackOfAllTrades', impl: 'exact' },
      ],
      3: [
        { id: 'cuttingWords', impl: 'adapted' },
        { id: 'bonusProficiencies', impl: 'exact' },
      ],
      4: [asi()],
      5: [{ id: 'fontOfInspiration', impl: 'exact' }],
      6: [{ id: 'magicalDiscoveries', impl: 'adapted' }],
      7: [{ id: 'countercharm', impl: 'adapted' }],
      8: [asi()],
      10: [{ id: 'magicalSecrets', impl: 'adapted' }],
      12: [asi()],
      14: [{ id: 'peerlessSkill', impl: 'adapted' }],
      16: [asi()],
      18: [{ id: 'superiorInspiration', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'wordsOfCreation', impl: 'adapted' }],
    },
  },

  cleric: {
    id: 'cleric', subclass: { id: 'life' },
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
      { id: 'intervention', recharge: 'long', max: (l) => (l >= 10 ? 1 : 0) },
    ],
    features: {
      1: [spellcasting('Wisdom'), { id: 'divineOrder', impl: 'adapted', choice: 'divineOrder' }],
      2: [
        { id: 'divineSpark', impl: 'adapted' },
        { id: 'turnUndead', impl: 'adapted' },
      ],
      3: [
        { id: 'discipleOfLife', impl: 'exact' },
        { id: 'preserveLife', impl: 'adapted' },
      ],
      4: [asi()],
      5: [{ id: 'searUndead', impl: 'exact' }],
      6: [{ id: 'blessedHealer', impl: 'exact' }],
      7: [{ id: 'blessedStrikes', impl: 'exact' }],
      8: [asi()],
      10: [{ id: 'divineIntervention', impl: 'adapted' }],
      12: [asi()],
      14: [{ id: 'improvedBlessedStrikes', impl: 'exact' }],
      16: [asi()],
      17: [{ id: 'supremeHealing', impl: 'exact' }],
      19: [epic()],
      20: [{ id: 'greaterIntervention', impl: 'adapted' }],
    },
  },

  druid: {
    id: 'druid', subclass: { id: 'land' },
    hitDie: 8, primary: ['wis'], saves: ['int', 'wis'],
    skillChoices: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'], numSkills: 2,
    armor: ['light', 'shield'], martial: false, material: 'verdant',
    arrayOrder: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
    caster: { kind: 'full', ability: 'wis', prepared: FULL_PREP },
    kit: ['quarterstaff', 'leather', 'shield', 'potionHealing'],
    color: '#5fae5b',
    fortuneTalent: {},
    resources: [
      { id: 'wildShape', recharge: 'short', max: (l) => (l >= 17 ? 4 : l >= 6 ? 3 : l >= 2 ? 2 : 0) },
    ],
    features: {
      1: [spellcasting('Wisdom'), { id: 'primalOrder', impl: 'adapted', choice: 'primalOrder' }],
      2: [{ id: 'wildShape', impl: 'adapted' }],
      3: [{ id: 'landsAid', impl: 'adapted' }],
      4: [asi()],
      5: [{ id: 'wildResurgence', impl: 'adapted' }],
      6: [{ id: 'naturalRecovery', impl: 'adapted' }],
      7: [{ id: 'elementalFury', impl: 'exact' }],
      8: [asi()],
      10: [{ id: 'naturesWard', impl: 'exact' }],
      12: [asi()],
      14: [{ id: 'naturesSanctuary', impl: 'adapted' }],
      15: [{ id: 'improvedElementalFury', impl: 'adapted' }],
      16: [asi()],
      18: [{ id: 'beastSpells', impl: 'exact' }],
      19: [epic()],
      20: [{ id: 'archdruid', impl: 'adapted' }],
    },
  },

  fighter: {
    id: 'fighter', subclass: { id: 'champion' },
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
      { id: 'indomitable', recharge: 'long', max: (l) => (l >= 17 ? 3 : l >= 13 ? 2 : l >= 9 ? 1 : 0) },
    ],
    features: {
      1: [
        { id: 'fightingStyle', impl: 'exact', choice: 'fightingStyle' },
        { id: 'secondWind', impl: 'exact' },
        mastery(),
      ],
      2: [
        { id: 'actionSurge', impl: 'adapted' },
        { id: 'tacticalMind', impl: 'adapted' },
      ],
      3: [
        { id: 'improvedCritical', impl: 'exact' },
        { id: 'remarkableAthlete', impl: 'exact' },
      ],
      4: [asi()],
      5: [extra(), { id: 'tacticalShift', impl: 'adapted' }],
      6: [asi()],
      7: [{ id: 'additionalFightingStyle', impl: 'exact', choice: 'fightingStyle' }],
      8: [asi()],
      9: [
        { id: 'indomitable', impl: 'exact' },
        { id: 'tacticalMaster', impl: 'adapted' },
      ],
      10: [{ id: 'heroicWarrior', impl: 'adapted' }],
      11: [extra(2)],
      12: [asi()],
      13: [{ id: 'studiedAttacks', impl: 'exact' }],
      14: [asi()],
      15: [{ id: 'superiorCritical', impl: 'exact' }],
      16: [asi()],
      17: [{ id: 'actionSurge2', impl: 'exact' }],
      18: [{ id: 'survivor', impl: 'exact' }],
      19: [epic()],
      20: [extra(3)],
    },
  },

  monk: {
    id: 'monk', subclass: { id: 'openHand' },
    hitDie: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'],
    skillChoices: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'], numSkills: 2,
    armor: [], martial: false, material: 'storm',
    arrayOrder: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
    kit: ['quarterstaff', 'dart', 'potionHealing'],
    color: '#3a8fb8',
    fortuneTalent: {},
    resources: [
      { id: 'focus', recharge: 'short', max: (l) => (l >= 2 ? l : 0) },
      { id: 'wholeness', recharge: 'long', max: (l, m) => (l >= 6 ? Math.max(1, m.wis) : 0) },
    ],
    features: {
      1: [
        { id: 'martialArts', impl: 'adapted' },
        { id: 'unarmoredDefenseMonk', impl: 'exact' },
      ],
      2: [
        { id: 'flurryOfBlows', impl: 'adapted' },
        { id: 'patientDefense', impl: 'adapted' },
        { id: 'uncannyMetabolism', impl: 'adapted' },
      ],
      3: [
        { id: 'deflectAttacks', impl: 'adapted' },
        { id: 'openHandTechnique', impl: 'adapted' },
      ],
      4: [asi(), { id: 'slowFall', impl: 'adapted' }],
      5: [extra(), { id: 'stunningStrike', impl: 'adapted' }],
      6: [{ id: 'empoweredStrikes', impl: 'exact' }, { id: 'wholenessOfBody', impl: 'exact' }],
      7: [{ id: 'evasion', impl: 'exact' }],
      8: [asi()],
      9: [{ id: 'acrobaticMovement', impl: 'adapted' }],
      10: [{ id: 'heightenedFocus', impl: 'adapted' }, { id: 'selfRestoration', impl: 'exact' }],
      11: [{ id: 'fleetStep', impl: 'adapted' }],
      12: [asi()],
      13: [{ id: 'deflectEnergy', impl: 'exact' }],
      14: [{ id: 'disciplinedSurvivor', impl: 'exact' }],
      15: [{ id: 'perfectFocus', impl: 'exact' }],
      16: [asi()],
      17: [{ id: 'quiveringPalm', impl: 'adapted' }],
      18: [{ id: 'superiorDefense', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'bodyAndMind', impl: 'exact' }],
    },
  },

  paladin: {
    id: 'paladin', subclass: { id: 'devotion' },
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
      { id: 'freeSmite', recharge: 'long', max: (l) => (l >= 2 ? 1 : 0) },
    ],
    features: {
      1: [
        { id: 'layOnHands', impl: 'exact' },
        spellcasting('Charisma'),
        mastery(),
      ],
      2: [
        { id: 'fightingStyle', impl: 'exact', choice: 'fightingStyle' },
        { id: 'paladinsSmite', impl: 'exact' },
      ],
      3: [
        { id: 'sacredWeapon', impl: 'exact' },
        { id: 'divineSense', impl: 'narrative' },
      ],
      4: [asi()],
      5: [extra(), { id: 'faithfulSteed', impl: 'narrative' }],
      6: [{ id: 'auraOfProtection', impl: 'adapted' }],
      7: [{ id: 'auraOfDevotion', impl: 'adapted' }],
      8: [asi()],
      9: [{ id: 'abjureFoes', impl: 'adapted' }],
      10: [{ id: 'auraOfCourage', impl: 'adapted' }],
      11: [{ id: 'radiantStrikes', impl: 'exact' }],
      12: [asi()],
      14: [{ id: 'restoringTouch', impl: 'exact' }],
      15: [{ id: 'smiteOfProtection', impl: 'adapted' }],
      16: [asi()],
      18: [{ id: 'auraExpansion', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'holyNimbus', impl: 'adapted' }],
    },
  },

  ranger: {
    id: 'ranger', subclass: { id: 'hunter' },
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
      { id: 'tireless', recharge: 'long', max: (l, m) => (l >= 10 ? Math.max(1, m.wis) : 0) },
    ],
    features: {
      1: [
        spellcasting('Wisdom'),
        { id: 'favoredEnemy', impl: 'exact' },
        mastery(),
      ],
      2: [{ id: 'deftExplorer', impl: 'adapted' }, { id: 'fightingStyle', impl: 'exact', choice: 'fightingStyle' }],
      3: [{ id: 'huntersPrey', impl: 'exact' }, { id: 'huntersLore', impl: 'adapted' }],
      4: [asi()],
      5: [extra()],
      6: [{ id: 'roving', impl: 'adapted' }],
      7: [{ id: 'defensiveTactics', impl: 'adapted' }],
      8: [asi()],
      9: [{ id: 'expertiseRanger', impl: 'exact', choice: 'expertise', choiceCount: 2 }],
      10: [{ id: 'tireless', impl: 'exact' }],
      11: [{ id: 'volley', impl: 'adapted' }],
      12: [asi()],
      13: [{ id: 'relentlessHunter', impl: 'exact' }],
      14: [{ id: 'naturesVeil', impl: 'adapted' }],
      15: [{ id: 'superiorHuntersDefense', impl: 'adapted' }],
      16: [asi()],
      17: [{ id: 'preciseHunter', impl: 'exact' }],
      18: [{ id: 'feralSenses', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'foeSlayer', impl: 'exact' }],
    },
  },

  rogue: {
    id: 'rogue', subclass: { id: 'thief' },
    hitDie: 8, primary: ['dex'], saves: ['dex', 'int'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleightOfHand', 'stealth'], numSkills: 4,
    armor: ['light'], martial: false, material: 'shadow',
    arrayOrder: ['dex', 'con', 'wis', 'int', 'cha', 'str'],
    kit: ['shortsword', 'shortbow', 'leather', 'thievesTools', 'potionHealing'],
    color: '#4b3b6b',
    fortuneTalent: {},
    resources: [{ id: 'strokeOfLuck', recharge: 'short', max: (l) => (l >= 20 ? 1 : 0) }],
    features: {
      1: [
        { id: 'expertise', impl: 'exact', choice: 'expertise', choiceCount: 2 },
        { id: 'sneakAttack', impl: 'adapted' },
        { id: 'thievesCant', impl: 'narrative' },
        mastery(),
      ],
      2: [{ id: 'cunningAction', impl: 'adapted' }],
      3: [{ id: 'fastHands', impl: 'exact' }, { id: 'steadyAim', impl: 'exact' }],
      4: [asi()],
      5: [{ id: 'cunningStrike', impl: 'adapted' }, { id: 'uncannyDodge', impl: 'adapted' }],
      6: [{ id: 'expertise2', impl: 'exact', choice: 'expertise', choiceCount: 2 }],
      7: [{ id: 'evasion', impl: 'exact' }, { id: 'reliableTalent', impl: 'exact' }],
      8: [asi()],
      9: [{ id: 'supremeSneak', impl: 'adapted' }],
      10: [asi()],
      11: [{ id: 'improvedCunningStrike', impl: 'adapted' }],
      12: [asi()],
      13: [{ id: 'useMagicDevice', impl: 'adapted' }],
      14: [{ id: 'deviousStrikes', impl: 'adapted' }],
      15: [{ id: 'slipperyMind', impl: 'exact' }],
      16: [asi()],
      17: [{ id: 'thiefsReflexes', impl: 'exact' }],
      18: [{ id: 'elusive', impl: 'exact' }],
      19: [epic()],
      20: [{ id: 'strokeOfLuck', impl: 'exact' }],
    },
  },

  sorcerer: {
    id: 'sorcerer', subclass: { id: 'draconic' },
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
      { id: 'innateSorcery', recharge: 'long', max: () => 2 },
    ],
    features: {
      1: [spellcasting('Charisma'), { id: 'innateSorcery', impl: 'exact' }],
      2: [{ id: 'fontOfMagic', impl: 'adapted' }, { id: 'metamagic', impl: 'adapted', choice: 'metamagic', choiceCount: 2 }],
      3: [{ id: 'draconicResilience', impl: 'exact' }],
      4: [asi()],
      5: [{ id: 'sorcerousRestoration', impl: 'exact' }],
      6: [{ id: 'elementalAffinity', impl: 'exact' }],
      7: [{ id: 'sorceryIncarnate', impl: 'adapted' }],
      8: [asi()],
      10: [{ id: 'metamagic2', impl: 'adapted', choice: 'metamagic', choiceCount: 1 }],
      12: [asi()],
      14: [{ id: 'dragonWings', impl: 'adapted' }],
      16: [asi()],
      17: [{ id: 'metamagic3', impl: 'adapted', choice: 'metamagic', choiceCount: 1 }],
      18: [{ id: 'dragonCompanion', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'arcaneApotheosis', impl: 'exact' }],
    },
  },

  warlock: {
    id: 'warlock', subclass: { id: 'fiend' },
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
      { id: 'arcanum9', recharge: 'long', max: (l) => (l >= 17 ? 1 : 0) },
      { id: 'ownLuck', recharge: 'long', max: (l, m) => (l >= 6 ? Math.max(1, m.cha) : 0) },
      { id: 'hurl', recharge: 'long', max: (l) => (l >= 14 ? 1 : 0) },
    ],
    features: {
      1: [
        { id: 'eldritchInvocations', impl: 'adapted', choice: 'invocation', choiceCount: 1 },
        { id: 'pactMagic', impl: 'exact' },
      ],
      2: [{ id: 'magicalCunning', impl: 'adapted' }, { id: 'invocation2', impl: 'adapted', choice: 'invocation', choiceCount: 2 }],
      3: [{ id: 'darkOnesBlessing', impl: 'exact' }],
      4: [asi()],
      5: [{ id: 'invocation3', impl: 'adapted', choice: 'invocation', choiceCount: 2 }],
      6: [{ id: 'darkOnesOwnLuck', impl: 'adapted' }],
      7: [{ id: 'invocation4', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      8: [asi()],
      9: [{ id: 'contactPatron', impl: 'adapted' }, { id: 'invocation5', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      10: [{ id: 'fiendishResilience', impl: 'adapted' }],
      11: [{ id: 'mysticArcanum6', impl: 'exact' }],
      12: [asi(), { id: 'invocation6', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      13: [{ id: 'mysticArcanum7', impl: 'exact' }],
      14: [{ id: 'hurlThroughHell', impl: 'adapted' }],
      15: [{ id: 'mysticArcanum8', impl: 'exact' }, { id: 'invocation7', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      16: [asi()],
      17: [{ id: 'mysticArcanum9', impl: 'exact' }],
      18: [{ id: 'invocation8', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      19: [epic()],
      20: [{ id: 'eldritchMaster', impl: 'adapted' }],
    },
  },

  wizard: {
    id: 'wizard', subclass: { id: 'evoker' },
    hitDie: 6, primary: ['int'], saves: ['int', 'wis'],
    skillChoices: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'], numSkills: 2,
    armor: [], martial: false, material: 'arcane',
    arrayOrder: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
    caster: { kind: 'full', ability: 'int', prepared: FULL_PREP },
    kit: ['quarterstaff', 'dagger', 'potionHealing'],
    color: '#5b6cf0',
    fortuneTalent: {},
    resources: [{ id: 'arcaneRecovery', recharge: 'long', max: () => 1 }, { id: 'overchannel', recharge: 'long', max: (l) => (l >= 14 ? 1 : 0) }],
    features: {
      1: [spellcasting('Intelligence'), { id: 'arcaneRecovery', impl: 'exact' }],
      2: [{ id: 'scholar', impl: 'exact' }],
      3: [{ id: 'potentCantrip', impl: 'exact' }, { id: 'evocationSavant', impl: 'narrative' }],
      4: [asi()],
      5: [{ id: 'memorizeSpell', impl: 'adapted' }],
      6: [{ id: 'sculptSpells', impl: 'adapted' }],
      8: [asi()],
      10: [{ id: 'empoweredEvocation', impl: 'exact' }],
      12: [asi()],
      14: [{ id: 'overchannel', impl: 'exact' }],
      16: [asi()],
      18: [{ id: 'spellMastery', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'signatureSpells', impl: 'adapted' }],
    },
  },
});

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export function proficiency(level: number): number {
  return pb(level);
}

export function featuresUpTo(classId: ClassId, level: number): FeatureDef[] {
  const out: FeatureDef[] = [];
  const f = CLASSES[classId].features;
  for (let l = 1; l <= level; l++) for (const x of f[l] ?? []) out.push(x);
  return out;
}

export function hasFeature(classId: ClassId, level: number, id: string): boolean {
  const f = CLASSES[classId].features;
  for (let l = 1; l <= level; l++) for (const x of f[l] ?? []) if (x.id === id) return true;
  return false;
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

export const FEATS = textTable<Record<string, { name: string; text: string; repeatable?: boolean; ability?: Ability[] }>, 'name' | 'text'>('game', ['feats'], {
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
});

export const EPIC_BOONS = textTable<Record<string, { name: string; text: string }>, 'name' | 'text'>('game', ['epicBoons'], {
  combatProwess: {},
  fortitude: {},
  fate: {},
  spellRecall: {},
});

export const DIVINE_ORDERS = bindText({} as Record<'protector' | 'thaumaturge', string>, 'game', ['divineOrders']);
export const PRIMAL_ORDERS = bindText({} as Record<'magician' | 'warden', string>, 'game', ['primalOrders']);
