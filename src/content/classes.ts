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
const asi = (): FeatureDef => ({ id: 'asi', name: 'Ability Score Improvement', text: 'Raise one score by 2 or two by 1 (max 20), or take a feat.', impl: 'exact', choice: 'asi' });
const epic = (): FeatureDef => ({ id: 'epicBoon', name: 'Epic Boon', text: 'Choose an Epic Boon.', impl: 'adapted', choice: 'epicBoon' });
const mastery = (): FeatureDef => ({ id: 'weaponMastery', name: 'Weapon Mastery', text: 'Use the mastery property of your equipped weapon (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex).', impl: 'adapted' });
const extra = (n = 1): FeatureDef => ({ id: n === 1 ? 'extraAttack' : n === 2 ? 'extraAttack2' : 'extraAttack3', name: n === 1 ? 'Extra Attack' : n === 2 ? 'Two Extra Attacks' : 'Three Extra Attacks', text: `Attack ${n + 1} times whenever you take the Attack action.`, impl: 'exact' });
const spellcasting = (abil: string): FeatureDef => ({ id: 'spellcasting', name: 'Spellcasting', text: `Cast prepared spells using ${abil}.`, impl: 'adapted' });

const FULL_PREP = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22];
const HALF_PREP = [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15];
const PACT_PREP = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];

export const CLASSES: Record<ClassId, ClassDef> = {
  barbarian: {
    id: 'barbarian', name: 'Barbarian', subclass: { id: 'berserker', name: 'Path of the Berserker' },
    hitDie: 12, primary: ['str'], saves: ['str', 'con'],
    skillChoices: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'], numSkills: 2,
    armor: ['light', 'medium', 'shield'], martial: true, material: 'blood',
    arrayOrder: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
    kit: ['greataxe', 'handaxe', 'potionHealing'],
    color: '#b3233a',
    summary: 'A storm of fury that shrugs off blows and hits like a landslide.',
    fortuneTalent: { name: 'Blood Dice', text: 'While Raging, you may reroll without spending rerolls by paying HP (2 + your level, doubled by vitality).' },
    resources: [
      { id: 'rage', name: 'Rage', recharge: 'long', max: (l) => [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6][l - 1] },
      { id: 'intimidate', name: 'Intimidating Presence', recharge: 'long', max: (l) => (l >= 14 ? 1 : 0) },
    ],
    features: {
      1: [
        { id: 'rage', name: 'Rage', text: 'Bonus Action: +rage damage on Strength attacks, resistance to bludgeoning, piercing and slashing for 10 rounds.', impl: 'adapted' },
        { id: 'unarmoredDefense', name: 'Unarmored Defense', text: 'Without armor, AC = 10 + DEX + CON (shield allowed).', impl: 'exact' },
        mastery(),
      ],
      2: [
        { id: 'recklessAttack', name: 'Reckless Attack', text: 'Gain advantage on Strength attacks this turn; attacks against you have advantage until your next turn.', impl: 'exact' },
        { id: 'dangerSense', name: 'Danger Sense', text: 'Advantage on Dexterity saving throws.', impl: 'exact' },
      ],
      3: [
        { id: 'frenzy', name: 'Frenzy', text: 'While Raging and Reckless, your first hit each turn deals extra d6s equal to your rage damage.', impl: 'exact' },
        { id: 'primalKnowledge', name: 'Primal Knowledge', text: 'Gain a skill proficiency; Strength powers some checks while raging.', impl: 'narrative' },
      ],
      4: [asi()],
      5: [extra(), { id: 'fastMovement', name: 'Fast Movement', text: 'Advantage on initiative is gained at level 7; here you may always switch ranks freely.', impl: 'adapted' }],
      6: [{ id: 'mindlessRage', name: 'Mindless Rage', text: 'While Raging you are immune to charmed and frightened.', impl: 'exact' }],
      7: [{ id: 'feralInstinct', name: 'Feral Instinct', text: 'Advantage on initiative rolls.', impl: 'exact' }, { id: 'instinctivePounce', name: 'Instinctive Pounce', text: 'Entering Rage also moves you to the front rank.', impl: 'adapted' }],
      8: [asi()],
      9: [{ id: 'brutalStrike', name: 'Brutal Strike', text: 'Forgo Reckless advantage on one attack to add 1d10 damage and push or hamstring the target.', impl: 'adapted' }],
      10: [{ id: 'retaliation', name: 'Retaliation', text: 'When a melee attack damages you, strike back with your reaction.', impl: 'adapted' }],
      11: [{ id: 'relentlessRage', name: 'Relentless Rage', text: 'While Raging, dropping to 0 HP instead leaves you at 1 HP on a DC 10 CON save (DC rises by 5 each use).', impl: 'exact' }],
      12: [asi()],
      13: [{ id: 'improvedBrutalStrike', name: 'Improved Brutal Strike', text: 'Brutal Strike may also stagger: the target has disadvantage on its next save.', impl: 'adapted' }],
      14: [{ id: 'intimidatingPresence', name: 'Intimidating Presence', text: 'Bonus Action, once per long rest: enemies make a WIS save or are frightened.', impl: 'adapted' }],
      15: [{ id: 'persistentRage', name: 'Persistent Rage', text: 'Rage lasts the whole combat and initiative restores a use if you have none.', impl: 'adapted' }],
      16: [asi()],
      17: [{ id: 'improvedBrutalStrike2', name: 'Improved Brutal Strike II', text: 'Brutal Strike deals 2d10.', impl: 'exact' }],
      18: [{ id: 'indomitableMight', name: 'Indomitable Might', text: 'Strength checks and saves use at least your Strength score.', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'primalChampion', name: 'Primal Champion', text: 'Strength and Constitution +4 (max 25).', impl: 'exact' }],
    },
  },

  bard: {
    id: 'bard', name: 'Bard', subclass: { id: 'lore', name: 'College of Lore' },
    hitDie: 8, primary: ['cha'], saves: ['dex', 'cha'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival', 'arcana', 'animalHandling'], numSkills: 3,
    armor: ['light'], martial: false, material: 'arcane',
    arrayOrder: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
    caster: { kind: 'full', ability: 'cha', prepared: FULL_PREP },
    kit: ['rapier', 'leather', 'potionHealing'],
    color: '#7b6cf0',
    summary: 'Words and music shape the dice — a bard turns luck into a party resource.',
    fortuneTalent: { name: 'Inspiration Dice', text: 'Bardic Inspiration places a bonus die (your Inspiration die roll, Arcane) straight onto the tray.' },
    resources: [
      { id: 'inspiration', name: 'Bardic Inspiration', recharge: 'long', max: (_l, m) => Math.max(1, m.cha) },
    ],
    features: {
      1: [
        { id: 'bardicInspiration', name: 'Bardic Inspiration', text: 'Bonus Action: add an Inspiration die (d6, d8 at 5, d10 at 10, d12 at 15) to the Fortune Tray as a ghost die.', impl: 'adapted' },
        spellcasting('Charisma'),
      ],
      2: [
        { id: 'expertise', name: 'Expertise', text: 'Double proficiency in two skills.', impl: 'exact', choice: 'expertise', choiceCount: 2 },
        { id: 'jackOfAllTrades', name: 'Jack of All Trades', text: 'Add half proficiency to checks without proficiency.', impl: 'exact' },
      ],
      3: [
        { id: 'cuttingWords', name: 'Cutting Words', text: 'Reaction: when an ally is hit, spend Inspiration to reduce the damage by your Inspiration die.', impl: 'adapted' },
        { id: 'bonusProficiencies', name: 'Bonus Proficiencies', text: 'Gain proficiency in three skills.', impl: 'exact' },
      ],
      4: [asi()],
      5: [{ id: 'fontOfInspiration', name: 'Font of Inspiration', text: 'Inspiration recharges on a short rest.', impl: 'exact' }],
      6: [{ id: 'magicalDiscoveries', name: 'Magical Discoveries', text: 'Learn spells from any list (Cleric, Druid or Wizard).', impl: 'adapted' }],
      7: [{ id: 'countercharm', name: 'Countercharm', text: 'Allies have advantage on saves against charmed and frightened.', impl: 'adapted' }],
      8: [asi()],
      10: [{ id: 'magicalSecrets', name: 'Magical Secrets', text: 'Prepare spells from the Cleric, Druid and Wizard lists.', impl: 'adapted' }],
      12: [asi()],
      14: [{ id: 'peerlessSkill', name: 'Peerless Skill', text: 'Add an Inspiration die to failed checks.', impl: 'adapted' }],
      16: [asi()],
      18: [{ id: 'superiorInspiration', name: 'Superior Inspiration', text: 'Start each combat with at least two Inspiration uses.', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'wordsOfCreation', name: 'Words of Creation', text: 'Power Word Heal and Power Word Kill always prepared; may target two creatures.', impl: 'adapted' }],
    },
  },

  cleric: {
    id: 'cleric', name: 'Cleric', subclass: { id: 'life', name: 'Life Domain' },
    hitDie: 8, primary: ['wis'], saves: ['wis', 'cha'],
    skillChoices: ['history', 'insight', 'medicine', 'persuasion', 'religion'], numSkills: 2,
    armor: ['light', 'medium', 'shield'], martial: false, material: 'sun',
    arrayOrder: ['wis', 'con', 'str', 'cha', 'dex', 'int'],
    caster: { kind: 'full', ability: 'wis', prepared: FULL_PREP },
    kit: ['mace', 'scaleMail', 'shield', 'potionHealing'],
    color: '#f5c74a',
    summary: 'A conduit of divine light: heals, shields, and burns the undead.',
    fortuneTalent: { name: 'Sanctify', text: 'Once per combat, turn one tray die into a blazing 6 (Sun).' },
    resources: [
      { id: 'channel', name: 'Channel Divinity', recharge: 'short', max: (l) => (l >= 18 ? 4 : l >= 6 ? 3 : l >= 2 ? 2 : 0) },
      { id: 'intervention', name: 'Divine Intervention', recharge: 'long', max: (l) => (l >= 10 ? 1 : 0) },
    ],
    features: {
      1: [spellcasting('Wisdom'), { id: 'divineOrder', name: 'Divine Order', text: 'Protector (heavy armor, martial weapons) or Thaumaturge (extra cantrip, +WIS to Arcana/Religion).', impl: 'adapted', choice: 'divineOrder' }],
      2: [
        { id: 'divineSpark', name: 'Channel Divinity: Divine Spark', text: 'Heal an ally or blast a foe for 1d8 + WIS (more dice at 7, 13, 18).', impl: 'adapted' },
        { id: 'turnUndead', name: 'Channel Divinity: Turn Undead', text: 'Undead make a WIS save or are frightened and incapacitated.', impl: 'adapted' },
      ],
      3: [
        { id: 'discipleOfLife', name: 'Disciple of Life', text: 'Healing spells restore 2 + spell level extra HP.', impl: 'exact' },
        { id: 'preserveLife', name: 'Preserve Life', text: 'Channel Divinity: restore 5 × level HP split among wounded allies.', impl: 'adapted' },
      ],
      4: [asi()],
      5: [{ id: 'searUndead', name: 'Sear Undead', text: 'Turn Undead also deals WIS-mod d8 radiant damage.', impl: 'exact' }],
      6: [{ id: 'blessedHealer', name: 'Blessed Healer', text: 'Healing an ally also heals you for 2 + spell level.', impl: 'exact' }],
      7: [{ id: 'blessedStrikes', name: 'Blessed Strikes', text: 'Once per turn, weapon or cantrip damage deals an extra 1d8 radiant.', impl: 'exact' }],
      8: [asi()],
      10: [{ id: 'divineIntervention', name: 'Divine Intervention', text: 'Once per long rest, heal the whole party to at least half and cleanse their conditions.', impl: 'adapted' }],
      12: [asi()],
      14: [{ id: 'improvedBlessedStrikes', name: 'Improved Blessed Strikes', text: 'Blessed Strikes deals 2d8.', impl: 'exact' }],
      16: [asi()],
      17: [{ id: 'supremeHealing', name: 'Supreme Healing', text: 'Healing dice always roll their maximum.', impl: 'exact' }],
      19: [epic()],
      20: [{ id: 'greaterIntervention', name: 'Greater Divine Intervention', text: 'Divine Intervention also revives fallen allies at 1 HP.', impl: 'adapted' }],
    },
  },

  druid: {
    id: 'druid', name: 'Druid', subclass: { id: 'land', name: 'Circle of the Land' },
    hitDie: 8, primary: ['wis'], saves: ['int', 'wis'],
    skillChoices: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'], numSkills: 2,
    armor: ['light', 'shield'], martial: false, material: 'verdant',
    arrayOrder: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
    caster: { kind: 'full', ability: 'wis', prepared: FULL_PREP },
    kit: ['quarterstaff', 'leather', 'shield', 'potionHealing'],
    color: '#5fae5b',
    summary: 'Shapeshifter and storm-caller, rooted in the old magic of living things.',
    fortuneTalent: { name: 'Overgrowth', text: 'Once per combat, a chosen tray die sprouts a ghost copy of itself.' },
    resources: [
      { id: 'wildShape', name: 'Wild Shape', recharge: 'short', max: (l) => (l >= 17 ? 4 : l >= 6 ? 3 : l >= 2 ? 2 : 0) },
    ],
    features: {
      1: [spellcasting('Wisdom'), { id: 'primalOrder', name: 'Primal Order', text: 'Magician (extra cantrip) or Warden (medium armor, martial weapons).', impl: 'adapted', choice: 'primalOrder' }],
      2: [{ id: 'wildShape', name: 'Wild Shape', text: 'Bonus Action: take beast form — gain temp HP equal to 3 × level, and your attacks become claws (1d8 + WIS).', impl: 'adapted' }],
      3: [{ id: 'landsAid', name: "Land's Aid", text: 'Spend Wild Shape: foes in a rank take 2d6 necrotic (CON half) and an ally heals 2d6 (3d6 at 10, 4d6 at 14).', impl: 'adapted' }],
      4: [asi()],
      5: [{ id: 'wildResurgence', name: 'Wild Resurgence', text: 'Spend a spell slot to regain a Wild Shape use.', impl: 'adapted' }],
      6: [{ id: 'naturalRecovery', name: 'Natural Recovery', text: 'Recover spell slots on a short rest (once per expedition).', impl: 'adapted' }],
      7: [{ id: 'elementalFury', name: 'Elemental Fury', text: 'Add WIS to cantrip damage.', impl: 'exact' }],
      8: [asi()],
      10: [{ id: 'naturesWard', name: "Nature's Ward", text: 'Immune to poisoned; resist poison.', impl: 'exact' }],
      12: [asi()],
      14: [{ id: 'naturesSanctuary', name: "Nature's Sanctuary", text: 'Allies in your rank gain resistance while you are Wild Shaped.', impl: 'adapted' }],
      15: [{ id: 'improvedElementalFury', name: 'Improved Elemental Fury', text: 'Cantrips gain +1 die of damage.', impl: 'adapted' }],
      16: [asi()],
      18: [{ id: 'beastSpells', name: 'Beast Spells', text: 'Cast spells while Wild Shaped.', impl: 'exact' }],
      19: [epic()],
      20: [{ id: 'archdruid', name: 'Archdruid', text: 'Regain a Wild Shape use at the start of each combat.', impl: 'adapted' }],
    },
  },

  fighter: {
    id: 'fighter', name: 'Fighter', subclass: { id: 'champion', name: 'Champion' },
    hitDie: 10, primary: ['str', 'dex'], saves: ['str', 'con'],
    skillChoices: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'], numSkills: 2,
    armor: ['light', 'medium', 'heavy', 'shield'], martial: true, material: 'steel',
    arrayOrder: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
    kit: ['longsword', 'chainMail', 'shield', 'potionHealing'],
    color: '#9fb2c4',
    summary: 'The master of weapons and armor — steady, durable, relentless.',
    fortuneTalent: { name: 'Steady Hand', text: 'Once per turn, nudge one tray die up or down by 1.' },
    resources: [
      { id: 'secondWind', name: 'Second Wind', recharge: 'short', max: (l) => (l >= 10 ? 4 : l >= 4 ? 3 : 2) },
      { id: 'actionSurge', name: 'Action Surge', recharge: 'short', max: (l) => (l >= 17 ? 2 : l >= 2 ? 1 : 0) },
      { id: 'indomitable', name: 'Indomitable', recharge: 'long', max: (l) => (l >= 17 ? 3 : l >= 13 ? 2 : l >= 9 ? 1 : 0) },
    ],
    features: {
      1: [
        { id: 'fightingStyle', name: 'Fighting Style', text: 'Choose a Fighting Style.', impl: 'exact', choice: 'fightingStyle' },
        { id: 'secondWind', name: 'Second Wind', text: 'Bonus Action: regain 1d10 + level HP.', impl: 'exact' },
        mastery(),
      ],
      2: [
        { id: 'actionSurge', name: 'Action Surge', text: 'Take one additional action — and play one more Fortune hand — this turn.', impl: 'adapted' },
        { id: 'tacticalMind', name: 'Tactical Mind', text: 'Spend Second Wind to add 1d10 to a failed check.', impl: 'adapted' },
      ],
      3: [
        { id: 'improvedCritical', name: 'Improved Critical', text: 'Critical hits on 19–20.', impl: 'exact' },
        { id: 'remarkableAthlete', name: 'Remarkable Athlete', text: 'Advantage on initiative and Athletics checks.', impl: 'exact' },
      ],
      4: [asi()],
      5: [extra(), { id: 'tacticalShift', name: 'Tactical Shift', text: 'Second Wind also lets you switch ranks.', impl: 'adapted' }],
      6: [asi()],
      7: [{ id: 'additionalFightingStyle', name: 'Additional Fighting Style', text: 'Choose a second Fighting Style.', impl: 'exact', choice: 'fightingStyle' }],
      8: [asi()],
      9: [
        { id: 'indomitable', name: 'Indomitable', text: 'Reroll a failed saving throw with a bonus equal to your level.', impl: 'exact' },
        { id: 'tacticalMaster', name: 'Tactical Master', text: 'Your attacks may use Push, Sap or Slow instead of the weapon\'s mastery.', impl: 'adapted' },
      ],
      10: [{ id: 'heroicWarrior', name: 'Heroic Warrior', text: 'Start each of your turns with one extra reroll.', impl: 'adapted' }],
      11: [extra(2)],
      12: [asi()],
      13: [{ id: 'studiedAttacks', name: 'Studied Attacks', text: 'After you miss a target, your next attack against it has advantage.', impl: 'exact' }],
      14: [asi()],
      15: [{ id: 'superiorCritical', name: 'Superior Critical', text: 'Critical hits on 18–20.', impl: 'exact' }],
      16: [asi()],
      17: [{ id: 'actionSurge2', name: 'Action Surge (two uses)', text: 'Two uses of Action Surge per rest.', impl: 'exact' }],
      18: [{ id: 'survivor', name: 'Survivor', text: 'At the start of your turn while bloodied, regain 5 + CON HP.', impl: 'exact' }],
      19: [epic()],
      20: [extra(3)],
    },
  },

  monk: {
    id: 'monk', name: 'Monk', subclass: { id: 'openHand', name: 'Warrior of the Open Hand' },
    hitDie: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'],
    skillChoices: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'], numSkills: 2,
    armor: [], martial: false, material: 'storm',
    arrayOrder: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
    kit: ['quarterstaff', 'dart', 'potionHealing'],
    color: '#3a8fb8',
    summary: 'A blur of fists and focus who plays more hands than anyone.',
    fortuneTalent: { name: 'Flow of Fortune', text: 'Flurry of Blows plays a second Fortune hand of up to 3 dice.' },
    resources: [
      { id: 'focus', name: 'Focus Points', recharge: 'short', max: (l) => (l >= 2 ? l : 0) },
      { id: 'wholeness', name: 'Wholeness of Body', recharge: 'long', max: (l, m) => (l >= 6 ? Math.max(1, m.wis) : 0) },
    ],
    features: {
      1: [
        { id: 'martialArts', name: 'Martial Arts', text: 'Unarmed strikes and monk weapons use DEX and a Martial Arts die (d6 → d12). Bonus Action unarmed strike.', impl: 'adapted' },
        { id: 'unarmoredDefenseMonk', name: 'Unarmored Defense', text: 'Without armor or shield, AC = 10 + DEX + WIS.', impl: 'exact' },
      ],
      2: [
        { id: 'flurryOfBlows', name: 'Flurry of Blows', text: '1 Focus, Bonus Action: two unarmed strikes (three at 10), playing a second hand of up to 3 dice.', impl: 'adapted' },
        { id: 'patientDefense', name: 'Patient Defense', text: '1 Focus, Bonus Action: Dodge — attacks against you have disadvantage.', impl: 'adapted' },
        { id: 'uncannyMetabolism', name: 'Uncanny Metabolism', text: 'Regain all Focus when you roll initiative, once per long rest.', impl: 'adapted' },
      ],
      3: [
        { id: 'deflectAttacks', name: 'Deflect Attacks', text: 'Reaction: reduce attack damage by 1d10 + DEX + level.', impl: 'adapted' },
        { id: 'openHandTechnique', name: 'Open Hand Technique', text: 'Flurry hits can topple (DEX save or prone) or push the target to the back rank.', impl: 'adapted' },
      ],
      4: [asi(), { id: 'slowFall', name: 'Slow Fall', text: 'Ignore pit and fall damage while exploring.', impl: 'adapted' }],
      5: [extra(), { id: 'stunningStrike', name: 'Stunning Strike', text: '1 Focus on hit: CON save or stunned until your next turn.', impl: 'adapted' }],
      6: [{ id: 'empoweredStrikes', name: 'Empowered Strikes', text: 'Unarmed strikes deal force damage.', impl: 'exact' }, { id: 'wholenessOfBody', name: 'Wholeness of Body', text: 'Bonus Action: heal Martial Arts die + WIS.', impl: 'exact' }],
      7: [{ id: 'evasion', name: 'Evasion', text: 'DEX saves for half take none on a success, half on a failure.', impl: 'exact' }],
      8: [asi()],
      9: [{ id: 'acrobaticMovement', name: 'Acrobatic Movement', text: 'Switch ranks freely.', impl: 'adapted' }],
      10: [{ id: 'heightenedFocus', name: 'Heightened Focus', text: 'Flurry makes three strikes; Patient Defense also grants temp HP.', impl: 'adapted' }, { id: 'selfRestoration', name: 'Self-Restoration', text: 'End charmed, frightened or poisoned at the end of your turn.', impl: 'exact' }],
      11: [{ id: 'fleetStep', name: 'Fleet Step', text: 'Patient Defense also lets you switch ranks.', impl: 'adapted' }],
      12: [asi()],
      13: [{ id: 'deflectEnergy', name: 'Deflect Energy', text: 'Deflect Attacks works on any damage type.', impl: 'exact' }],
      14: [{ id: 'disciplinedSurvivor', name: 'Disciplined Survivor', text: 'Proficiency in all saving throws.', impl: 'exact' }],
      15: [{ id: 'perfectFocus', name: 'Perfect Focus', text: 'Start combat with at least 4 Focus.', impl: 'exact' }],
      16: [asi()],
      17: [{ id: 'quiveringPalm', name: 'Quivering Palm', text: '4 Focus: on hit, CON save or take 10d12 force (half on success).', impl: 'adapted' }],
      18: [{ id: 'superiorDefense', name: 'Superior Defense', text: '3 Focus: resistance to all damage but force for 10 rounds.', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'bodyAndMind', name: 'Body and Mind', text: 'Dexterity and Wisdom +4 (max 25).', impl: 'exact' }],
    },
  },

  paladin: {
    id: 'paladin', name: 'Paladin', subclass: { id: 'devotion', name: 'Oath of Devotion' },
    hitDie: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'],
    skillChoices: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'], numSkills: 2,
    armor: ['light', 'medium', 'heavy', 'shield'], martial: true, material: 'sun',
    arrayOrder: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
    caster: { kind: 'half', ability: 'cha', prepared: HALF_PREP },
    kit: ['longsword', 'chainMail', 'shield', 'potionHealing'],
    color: '#e8c35a',
    summary: 'An oath made steel — smites, auras and hands that mend.',
    fortuneTalent: { name: 'Oath Seal', text: 'Divine Smite adds +1 Mult per spell-slot level spent.' },
    resources: [
      { id: 'layOnHands', name: 'Lay on Hands', recharge: 'long', max: (l) => 5 * l },
      { id: 'channel', name: 'Channel Divinity', recharge: 'short', max: (l) => (l >= 11 ? 3 : l >= 3 ? 2 : 0) },
      { id: 'freeSmite', name: "Paladin's Smite", recharge: 'long', max: (l) => (l >= 2 ? 1 : 0) },
    ],
    features: {
      1: [
        { id: 'layOnHands', name: 'Lay on Hands', text: 'Bonus Action: restore HP from a pool of 5 × level.', impl: 'exact' },
        spellcasting('Charisma'),
        mastery(),
      ],
      2: [
        { id: 'fightingStyle', name: 'Fighting Style', text: 'Choose a Fighting Style.', impl: 'exact', choice: 'fightingStyle' },
        { id: 'paladinsSmite', name: "Paladin's Smite", text: 'Divine Smite is always prepared, and once per long rest it costs no slot.', impl: 'exact' },
      ],
      3: [
        { id: 'sacredWeapon', name: 'Sacred Weapon', text: 'Channel Divinity, Bonus Action: add CHA to attack rolls for 10 rounds; weapon sheds holy light.', impl: 'exact' },
        { id: 'divineSense', name: 'Divine Sense', text: 'Reveal hidden fiends and undead in the next rooms.', impl: 'narrative' },
      ],
      4: [asi()],
      5: [extra(), { id: 'faithfulSteed', name: 'Faithful Steed', text: 'Find Steed is always prepared (exploration speed).', impl: 'narrative' }],
      6: [{ id: 'auraOfProtection', name: 'Aura of Protection', text: 'You and your allies add your CHA to saving throws.', impl: 'adapted' }],
      7: [{ id: 'auraOfDevotion', name: 'Aura of Devotion', text: 'Allies are immune to charmed.', impl: 'adapted' }],
      8: [asi()],
      9: [{ id: 'abjureFoes', name: 'Abjure Foes', text: 'Channel Divinity: up to CHA enemies make a WIS save or are frightened.', impl: 'adapted' }],
      10: [{ id: 'auraOfCourage', name: 'Aura of Courage', text: 'Allies are immune to frightened.', impl: 'adapted' }],
      11: [{ id: 'radiantStrikes', name: 'Radiant Strikes', text: 'Weapon hits deal an extra 1d8 radiant.', impl: 'exact' }],
      12: [asi()],
      14: [{ id: 'restoringTouch', name: 'Restoring Touch', text: 'Lay on Hands also removes conditions.', impl: 'exact' }],
      15: [{ id: 'smiteOfProtection', name: 'Smite of Protection', text: 'When you Smite, allies gain +2 AC until your next turn.', impl: 'adapted' }],
      16: [asi()],
      18: [{ id: 'auraExpansion', name: 'Aura Expansion', text: 'Auras reach the whole party regardless of rank.', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'holyNimbus', name: 'Holy Nimbus', text: 'Once per long rest: radiant aura deals CHA + PB to foes each turn and grants advantage on saves.', impl: 'adapted' }],
    },
  },

  ranger: {
    id: 'ranger', name: 'Ranger', subclass: { id: 'hunter', name: 'Hunter' },
    hitDie: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'],
    skillChoices: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'], numSkills: 3,
    armor: ['light', 'medium', 'shield'], martial: true, material: 'verdant',
    arrayOrder: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
    caster: { kind: 'half', ability: 'wis', prepared: HALF_PREP },
    kit: ['longbow', 'shortsword', 'studdedLeather', 'potionHealing'],
    color: '#4d9c58',
    summary: 'Tracker and archer who marks a quarry and never lets it go.',
    fortuneTalent: { name: 'Quarry', text: 'Against your Marked target, Straights score ×2 Mult.' },
    resources: [
      { id: 'favoredEnemy', name: 'Favored Enemy', recharge: 'long', max: (l) => (l >= 17 ? 6 : l >= 13 ? 5 : l >= 9 ? 4 : l >= 5 ? 3 : 2) },
      { id: 'tireless', name: 'Tireless', recharge: 'long', max: (l, m) => (l >= 10 ? Math.max(1, m.wis) : 0) },
    ],
    features: {
      1: [
        spellcasting('Wisdom'),
        { id: 'favoredEnemy', name: 'Favored Enemy', text: "Cast Hunter's Mark without a slot a few times per long rest.", impl: 'exact' },
        mastery(),
      ],
      2: [{ id: 'deftExplorer', name: 'Deft Explorer', text: 'Expertise in one skill; exploration bonus to Survival checks.', impl: 'adapted' }, { id: 'fightingStyle', name: 'Fighting Style', text: 'Choose a Fighting Style.', impl: 'exact', choice: 'fightingStyle' }],
      3: [{ id: 'huntersPrey', name: "Hunter's Prey: Colossus Slayer", text: 'Once per turn, +1d8 damage to a target that is already wounded.', impl: 'exact' }, { id: 'huntersLore', name: "Hunter's Lore", text: 'Marked targets reveal their resistances.', impl: 'adapted' }],
      4: [asi()],
      5: [extra()],
      6: [{ id: 'roving', name: 'Roving', text: 'Climb and swim freely; flooded corridors cost no extra time.', impl: 'adapted' }],
      7: [{ id: 'defensiveTactics', name: 'Defensive Tactics: Multiattack Defense', text: 'After a creature hits you, its further attacks this turn have disadvantage.', impl: 'adapted' }],
      8: [asi()],
      9: [{ id: 'expertiseRanger', name: 'Expertise', text: 'Expertise in two skills.', impl: 'exact', choice: 'expertise', choiceCount: 2 }],
      10: [{ id: 'tireless', name: 'Tireless', text: 'Action: gain 1d8 + WIS temp HP.', impl: 'exact' }],
      11: [{ id: 'volley', name: 'Superior Hunter\'s Prey: Volley', text: 'Action: make a ranged attack against every enemy in one rank.', impl: 'adapted' }],
      12: [asi()],
      13: [{ id: 'relentlessHunter', name: 'Relentless Hunter', text: "Damage can't break your concentration on Hunter's Mark.", impl: 'exact' }],
      14: [{ id: 'naturesVeil', name: "Nature's Veil", text: 'Bonus Action: become invisible until the end of your next turn.', impl: 'adapted' }],
      15: [{ id: 'superiorHuntersDefense', name: "Superior Hunter's Defense", text: 'Reaction: resistance to one attack\'s damage.', impl: 'adapted' }],
      16: [asi()],
      17: [{ id: 'preciseHunter', name: 'Precise Hunter', text: 'Advantage on attacks against your Marked target.', impl: 'exact' }],
      18: [{ id: 'feralSenses', name: 'Feral Senses', text: 'Ignore invisibility and blindness when attacking.', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'foeSlayer', name: 'Foe Slayer', text: "Hunter's Mark deals d10s instead of d6s.", impl: 'exact' }],
    },
  },

  rogue: {
    id: 'rogue', name: 'Rogue', subclass: { id: 'thief', name: 'Thief' },
    hitDie: 8, primary: ['dex'], saves: ['dex', 'int'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleightOfHand', 'stealth'], numSkills: 4,
    armor: ['light'], martial: false, material: 'shadow',
    arrayOrder: ['dex', 'con', 'wis', 'int', 'cha', 'str'],
    kit: ['shortsword', 'shortbow', 'leather', 'thievesTools', 'potionHealing'],
    color: '#4b3b6b',
    summary: 'A knife in the dark who loves a loaded die.',
    fortuneTalent: { name: 'Loaded Dice', text: '+1 reroll on your turns. Sneak Attack triggers whenever you play a Pair or better.' },
    resources: [{ id: 'strokeOfLuck', name: 'Stroke of Luck', recharge: 'short', max: (l) => (l >= 20 ? 1 : 0) }],
    features: {
      1: [
        { id: 'expertise', name: 'Expertise', text: 'Double proficiency in two skills.', impl: 'exact', choice: 'expertise', choiceCount: 2 },
        { id: 'sneakAttack', name: 'Sneak Attack', text: 'Once per turn add extra d6s when you have advantage, an ally stands in the front rank, or you play a Pair or better.', impl: 'adapted' },
        { id: 'thievesCant', name: "Thieves' Cant", text: 'Read secret marks in the dungeon.', impl: 'narrative' },
        mastery(),
      ],
      2: [{ id: 'cunningAction', name: 'Cunning Action', text: 'Bonus Action: Hide (your next attack has advantage) or switch ranks.', impl: 'adapted' }],
      3: [{ id: 'fastHands', name: 'Fast Hands', text: 'Use items as a Bonus Action.', impl: 'exact' }, { id: 'steadyAim', name: 'Steady Aim', text: 'Bonus Action: advantage on your next attack this turn.', impl: 'exact' }],
      4: [asi()],
      5: [{ id: 'cunningStrike', name: 'Cunning Strike', text: 'Trade a Sneak Attack die to poison, trip or withdraw.', impl: 'adapted' }, { id: 'uncannyDodge', name: 'Uncanny Dodge', text: 'Reaction: halve the damage of an attack that hits you.', impl: 'adapted' }],
      6: [{ id: 'expertise2', name: 'Expertise', text: 'Two more Expertise skills.', impl: 'exact', choice: 'expertise', choiceCount: 2 }],
      7: [{ id: 'evasion', name: 'Evasion', text: 'DEX saves for half take none on a success, half on a failure.', impl: 'exact' }, { id: 'reliableTalent', name: 'Reliable Talent', text: 'Treat a d20 of 9 or lower as 10 on proficient checks.', impl: 'exact' }],
      8: [asi()],
      9: [{ id: 'supremeSneak', name: 'Supreme Sneak', text: 'Hide costs nothing after an attack once per turn.', impl: 'adapted' }],
      10: [asi()],
      11: [{ id: 'improvedCunningStrike', name: 'Improved Cunning Strike', text: 'Use two Cunning Strike effects.', impl: 'adapted' }],
      12: [asi()],
      13: [{ id: 'useMagicDevice', name: 'Use Magic Device', text: 'Use any scroll; attune to more trinkets.', impl: 'adapted' }],
      14: [{ id: 'deviousStrikes', name: 'Devious Strikes', text: 'Cunning Strike may daze or knock out.', impl: 'adapted' }],
      15: [{ id: 'slipperyMind', name: 'Slippery Mind', text: 'Proficiency in WIS and CHA saves.', impl: 'exact' }],
      16: [asi()],
      17: [{ id: 'thiefsReflexes', name: "Thief's Reflexes", text: 'Take two turns in the first round of combat.', impl: 'exact' }],
      18: [{ id: 'elusive', name: 'Elusive', text: 'No attack roll has advantage against you.', impl: 'exact' }],
      19: [epic()],
      20: [{ id: 'strokeOfLuck', name: 'Stroke of Luck', text: 'Turn a missed attack into a hit, once per short rest.', impl: 'exact' }],
    },
  },

  sorcerer: {
    id: 'sorcerer', name: 'Sorcerer', subclass: { id: 'draconic', name: 'Draconic Sorcery' },
    hitDie: 6, primary: ['cha'], saves: ['con', 'cha'],
    skillChoices: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'], numSkills: 2,
    armor: [], martial: false, material: 'ember',
    arrayOrder: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
    caster: { kind: 'full', ability: 'cha', prepared: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
    kit: ['dagger', 'quarterstaff', 'potionHealing'],
    color: '#e4643a',
    summary: 'Raw magic in the blood; bends spells — and dice — at will.',
    fortuneTalent: { name: 'Wild Surge', text: 'Spend Sorcery Points: 1 for a reroll, 2 to flip a tray die (7 − value).' },
    resources: [
      { id: 'sorcery', name: 'Sorcery Points', recharge: 'long', max: (l) => (l >= 2 ? l : 0) },
      { id: 'innateSorcery', name: 'Innate Sorcery', recharge: 'long', max: () => 2 },
    ],
    features: {
      1: [spellcasting('Charisma'), { id: 'innateSorcery', name: 'Innate Sorcery', text: 'Bonus Action, twice per long rest: +1 spell save DC and advantage on spell attacks for 10 rounds.', impl: 'exact' }],
      2: [{ id: 'fontOfMagic', name: 'Font of Magic', text: 'Sorcery Points equal to level fuel metamagic and dice tricks.', impl: 'adapted' }, { id: 'metamagic', name: 'Metamagic', text: 'Choose two Metamagic options.', impl: 'adapted', choice: 'metamagic', choiceCount: 2 }],
      3: [{ id: 'draconicResilience', name: 'Draconic Resilience', text: '+1 HP per level; unarmored AC = 10 + DEX + CHA.', impl: 'exact' }],
      4: [asi()],
      5: [{ id: 'sorcerousRestoration', name: 'Sorcerous Restoration', text: 'Regain half your level in Sorcery Points on a short rest.', impl: 'exact' }],
      6: [{ id: 'elementalAffinity', name: 'Elemental Affinity', text: 'Add CHA to fire spell damage; resist fire.', impl: 'exact' }],
      7: [{ id: 'sorceryIncarnate', name: 'Sorcery Incarnate', text: 'While Innate Sorcery is active, use two Metamagic options on one spell.', impl: 'adapted' }],
      8: [asi()],
      10: [{ id: 'metamagic2', name: 'Metamagic', text: 'Learn another Metamagic option.', impl: 'adapted', choice: 'metamagic', choiceCount: 1 }],
      12: [asi()],
      14: [{ id: 'dragonWings', name: 'Dragon Wings', text: 'Fly over pits and chasms while exploring.', impl: 'adapted' }],
      16: [asi()],
      17: [{ id: 'metamagic3', name: 'Metamagic', text: 'Learn another Metamagic option.', impl: 'adapted', choice: 'metamagic', choiceCount: 1 }],
      18: [{ id: 'dragonCompanion', name: 'Dragon Companion', text: 'Resistance to your affinity element for the party.', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'arcaneApotheosis', name: 'Arcane Apotheosis', text: 'While Innate Sorcery is active, one Metamagic per turn is free.', impl: 'exact' }],
    },
  },

  warlock: {
    id: 'warlock', name: 'Warlock', subclass: { id: 'fiend', name: 'Fiend Patron' },
    hitDie: 8, primary: ['cha'], saves: ['wis', 'cha'],
    skillChoices: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'], numSkills: 2,
    armor: ['light'], martial: false, material: 'shadow',
    arrayOrder: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
    caster: { kind: 'pact', ability: 'cha', prepared: PACT_PREP },
    kit: ['dagger', 'leather', 'potionHealing'],
    color: '#6b3b7a',
    summary: 'A bargain with a fiend: few spells, short rests, terrible power.',
    fortuneTalent: { name: 'Dark Bargain', text: 'Once per combat, pay 10% of max HP to set a tray die to any face it has.' },
    resources: [
      { id: 'arcanum6', name: 'Mystic Arcanum (6th)', recharge: 'long', max: (l) => (l >= 11 ? 1 : 0) },
      { id: 'arcanum7', name: 'Mystic Arcanum (7th)', recharge: 'long', max: (l) => (l >= 13 ? 1 : 0) },
      { id: 'arcanum8', name: 'Mystic Arcanum (8th)', recharge: 'long', max: (l) => (l >= 15 ? 1 : 0) },
      { id: 'arcanum9', name: 'Mystic Arcanum (9th)', recharge: 'long', max: (l) => (l >= 17 ? 1 : 0) },
      { id: 'ownLuck', name: "Dark One's Own Luck", recharge: 'long', max: (l, m) => (l >= 6 ? Math.max(1, m.cha) : 0) },
      { id: 'hurl', name: 'Hurl Through Hell', recharge: 'long', max: (l) => (l >= 14 ? 1 : 0) },
    ],
    features: {
      1: [
        { id: 'eldritchInvocations', name: 'Eldritch Invocations', text: 'Choose invocations that reshape your magic.', impl: 'adapted', choice: 'invocation', choiceCount: 1 },
        { id: 'pactMagic', name: 'Pact Magic', text: 'Few spell slots, always cast at your highest slot level, recovered on a short rest.', impl: 'exact' },
      ],
      2: [{ id: 'magicalCunning', name: 'Magical Cunning', text: 'Recover half your pact slots once per long rest (used automatically at a safe room).', impl: 'adapted' }, { id: 'invocation2', name: 'Eldritch Invocations', text: 'Learn two more invocations.', impl: 'adapted', choice: 'invocation', choiceCount: 2 }],
      3: [{ id: 'darkOnesBlessing', name: "Dark One's Blessing", text: 'When you reduce an enemy to 0 HP, gain CHA + level temp HP.', impl: 'exact' }],
      4: [asi()],
      5: [{ id: 'invocation3', name: 'Eldritch Invocations', text: 'Learn two more invocations.', impl: 'adapted', choice: 'invocation', choiceCount: 2 }],
      6: [{ id: 'darkOnesOwnLuck', name: "Dark One's Own Luck", text: 'Add a d10 to a check or save — or turn one tray die to any face (CHA times per long rest).', impl: 'adapted' }],
      7: [{ id: 'invocation4', name: 'Eldritch Invocation', text: 'Learn another invocation.', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      8: [asi()],
      9: [{ id: 'contactPatron', name: 'Contact Patron', text: 'Ask your patron about the dungeon: reveals the boss room.', impl: 'adapted' }, { id: 'invocation5', name: 'Eldritch Invocation', text: 'Learn another invocation.', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      10: [{ id: 'fiendishResilience', name: 'Fiendish Resilience', text: 'Resistance to one damage type (fire).', impl: 'adapted' }],
      11: [{ id: 'mysticArcanum6', name: 'Mystic Arcanum (6th level)', text: 'Cast a 6th-level spell once per long rest.', impl: 'exact' }],
      12: [asi(), { id: 'invocation6', name: 'Eldritch Invocation', text: 'Learn another invocation.', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      13: [{ id: 'mysticArcanum7', name: 'Mystic Arcanum (7th level)', text: 'Cast a 7th-level spell once per long rest.', impl: 'exact' }],
      14: [{ id: 'hurlThroughHell', name: 'Hurl Through Hell', text: 'Once per long rest: a target takes 8d10 psychic (CHA save avoids).', impl: 'adapted' }],
      15: [{ id: 'mysticArcanum8', name: 'Mystic Arcanum (8th level)', text: 'Cast an 8th-level spell once per long rest.', impl: 'exact' }, { id: 'invocation7', name: 'Eldritch Invocation', text: 'Learn another invocation.', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      16: [asi()],
      17: [{ id: 'mysticArcanum9', name: 'Mystic Arcanum (9th level)', text: 'Cast a 9th-level spell once per long rest.', impl: 'exact' }],
      18: [{ id: 'invocation8', name: 'Eldritch Invocation', text: 'Learn another invocation.', impl: 'adapted', choice: 'invocation', choiceCount: 1 }],
      19: [epic()],
      20: [{ id: 'eldritchMaster', name: 'Eldritch Master', text: 'Magical Cunning restores all pact slots.', impl: 'adapted' }],
    },
  },

  wizard: {
    id: 'wizard', name: 'Wizard', subclass: { id: 'evoker', name: 'Evoker' },
    hitDie: 6, primary: ['int'], saves: ['int', 'wis'],
    skillChoices: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'], numSkills: 2,
    armor: [], martial: false, material: 'arcane',
    arrayOrder: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
    caster: { kind: 'full', ability: 'int', prepared: FULL_PREP },
    kit: ['quarterstaff', 'dagger', 'potionHealing'],
    color: '#5b6cf0',
    summary: 'A scholar of the arcane with the largest spellbook in the Keep.',
    fortuneTalent: { name: 'Arcane Foresight', text: 'See the next die in the bag; once per turn, swap a tray die with it.' },
    resources: [{ id: 'arcaneRecovery', name: 'Arcane Recovery', recharge: 'long', max: () => 1 }, { id: 'overchannel', name: 'Overchannel', recharge: 'long', max: (l) => (l >= 14 ? 1 : 0) }],
    features: {
      1: [spellcasting('Intelligence'), { id: 'arcaneRecovery', name: 'Arcane Recovery', text: 'Once per long rest, during a short rest, recover slots totalling half your level.', impl: 'exact' }],
      2: [{ id: 'scholar', name: 'Scholar', text: 'Expertise in one INT skill.', impl: 'exact' }],
      3: [{ id: 'potentCantrip', name: 'Potent Cantrip', text: 'Cantrips that miss or are saved against still deal half damage.', impl: 'exact' }, { id: 'evocationSavant', name: 'Evocation Savant', text: 'Learn extra evocation spells.', impl: 'narrative' }],
      4: [asi()],
      5: [{ id: 'memorizeSpell', name: 'Memorize Spell', text: 'Swap a prepared spell at any safe room.', impl: 'adapted' }],
      6: [{ id: 'sculptSpells', name: 'Sculpt Spells', text: 'Your area spells never strike allies (already true here) and deal +2 Mult when hitting 3+ foes.', impl: 'adapted' }],
      8: [asi()],
      10: [{ id: 'empoweredEvocation', name: 'Empowered Evocation', text: 'Add INT to evocation damage.', impl: 'exact' }],
      12: [asi()],
      14: [{ id: 'overchannel', name: 'Overchannel', text: 'Once per long rest, a spell of 5th level or lower deals maximum dice damage.', impl: 'exact' }],
      16: [asi()],
      18: [{ id: 'spellMastery', name: 'Spell Mastery', text: 'Magic Missile and Shield cost no slot.', impl: 'adapted' }],
      19: [epic()],
      20: [{ id: 'signatureSpells', name: 'Signature Spells', text: 'Fireball and Counterspell... here: Fireball and Lightning Bolt once each per rest without a slot.', impl: 'adapted' }],
    },
  },
};

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

export const FIGHTING_STYLES: Record<string, { name: string; text: string }> = {
  archery: { name: 'Archery', text: '+2 to ranged weapon attack rolls.' },
  defense: { name: 'Defense', text: '+1 AC while wearing armor.' },
  dueling: { name: 'Dueling', text: '+2 damage with a one-handed melee weapon and no other weapon.' },
  greatWeapon: { name: 'Great Weapon Fighting', text: 'Treat 1s and 2s on two-handed weapon damage dice as 3s.' },
  protection: { name: 'Protection', text: 'Reaction: impose disadvantage on an attack against an ally (needs a shield).' },
  twoWeapon: { name: 'Two-Weapon Fighting', text: 'Add your ability modifier to off-hand attacks.' },
  blindFighting: { name: 'Blind Fighting', text: 'Ignore blindness and invisibility penalties.' },
  interception: { name: 'Interception', text: 'Reaction: reduce damage to an ally by 1d10 + PB.' },
};

export const METAMAGIC: Record<string, { name: string; text: string; cost: number }> = {
  quickened: { name: 'Quickened Spell', text: 'Cast a spell as a Bonus Action.', cost: 2 },
  twinned: { name: 'Twinned Spell', text: 'A single-target spell also strikes a second target.', cost: 1 },
  empowered: { name: 'Empowered Spell', text: '+2 Mult to this spell\'s Fortune score.', cost: 1 },
  heightened: { name: 'Heightened Spell', text: 'One target has disadvantage on its save.', cost: 2 },
  careful: { name: 'Careful Spell', text: 'Allies are unaffected (already true) and gain +1 AC until your next turn.', cost: 1 },
  seeking: { name: 'Seeking Spell', text: 'Reroll a missed spell attack.', cost: 1 },
};

export const INVOCATIONS: Record<string, { name: string; text: string; minLevel: number }> = {
  agonizingBlast: { name: 'Agonizing Blast', text: 'Add CHA to Eldritch Blast damage.', minLevel: 2 },
  repellingBlast: { name: 'Repelling Blast', text: 'Eldritch Blast pushes front-rank targets to the back.', minLevel: 2 },
  armorOfShadows: { name: 'Armor of Shadows', text: 'Unarmored AC = 13 + DEX.', minLevel: 1 },
  pactOfTheBlade: { name: 'Pact of the Blade', text: 'Use CHA for weapon attacks; weapons count as magic.', minLevel: 1 },
  thirstingBlade: { name: 'Thirsting Blade', text: 'Extra Attack with your pact weapon.', minLevel: 5 },
  devilsSight: { name: "Devil's Sight", text: 'Ignore blindness from magical darkness; see hidden doors.', minLevel: 2 },
  lifedrinker: { name: 'Lifedrinker', text: 'Pact weapon hits deal +1d6 necrotic and heal you.', minLevel: 9 },
  eldritchMind: { name: 'Eldritch Mind', text: 'Advantage on concentration saves.', minLevel: 1 },
  fiendishVigor: { name: 'Fiendish Vigor', text: 'Start each combat with temp HP.', minLevel: 2 },
  gazeOfTwoMinds: { name: 'Gaze of Two Minds', text: 'Reveal the next room ahead while exploring.', minLevel: 5 },
};

export const FEATS: Record<string, { name: string; text: string; repeatable?: boolean; ability?: Ability[] }> = {
  alert: { name: 'Alert', text: 'Add your proficiency bonus to initiative.' },
  tough: { name: 'Tough', text: '+2 HP per level.' },
  lucky: { name: 'Lucky', text: 'Gain Luck equal to PB each expedition: spend one for a free reroll.' },
  savageAttacker: { name: 'Savage Attacker', text: 'Roll weapon damage dice twice, keep the higher, once per turn.' },
  greatWeaponMaster: { name: 'Great Weapon Master', text: 'Heavy weapon hits deal + PB damage; +1 STR.', ability: ['str'] },
  sharpshooter: { name: 'Sharpshooter', text: 'Ranged attacks ignore cover and can strike the back rank freely; +1 DEX.', ability: ['dex'] },
  warCaster: { name: 'War Caster', text: 'Advantage on concentration saves; +1 casting score.', ability: ['int', 'wis', 'cha'] },
  resilient: { name: 'Resilient (CON)', text: 'Proficiency in CON saves; +1 CON.', ability: ['con'] },
  defensiveDuelist: { name: 'Defensive Duelist', text: 'Reaction: +PB AC against one melee attack each round.' },
  healer: { name: 'Healer', text: 'Healing potions and kits you use restore extra HP equal to your level.' },
  magicInitiate: { name: 'Magic Initiate', text: 'Learn two cantrips and a 1st-level spell (Cure Wounds).' },
};

export const EPIC_BOONS: Record<string, { name: string; text: string }> = {
  combatProwess: { name: 'Boon of Combat Prowess', text: 'Once per turn, turn a missed attack into a hit.' },
  fortitude: { name: 'Boon of Fortitude', text: '+40 max HP.' },
  fate: { name: 'Boon of Fate', text: '+1 tray size and +1 reroll on your turns.' },
  spellRecall: { name: 'Boon of Spell Recall', text: 'One free 1st–4th level spell per rest.' },
};

export const DIVINE_ORDERS = { protector: 'Protector', thaumaturge: 'Thaumaturge' };
export const PRIMAL_ORDERS = { magician: 'Magician', warden: 'Warden' };
