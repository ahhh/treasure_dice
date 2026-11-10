/**
 * SRD 5.2.1 spells, translated to ranks and the Fortune pipeline.
 * Every damaging/healing spell's dice are the `base` of a Fortune hand.
 * Spells with open-ended tabletop effects are curated to explicit outcomes.
 */
import type { Ability, ClassId, ConditionId, DamageType, Hero } from '../engine/types.ts';
import { CLASSES, maxSpellLevel } from './classes.ts';
import { bindText, textTable, type Textless } from '../i18n/index.ts';

export type SpellTarget = 'enemy' | 'enemies' | 'rank' | 'ally' | 'allies' | 'self' | 'fallenAlly';
export type SpellKind = 'attack' | 'save' | 'auto' | 'heal' | 'buff' | 'debuff' | 'zone' | 'special';

export interface SpellDef {
  id: string;
  name: string;
  level: number;
  school: string;
  classes: ClassId[];
  cost: 'action' | 'bonus' | 'reaction';
  target: SpellTarget;
  kind: SpellKind;
  dice?: string;
  dmgType?: DamageType;
  /** Extra dice per slot level above the spell's level. */
  upcast?: string;
  rays?: number;
  save?: Ability;
  half?: boolean;
  condition?: { id: ConditionId; rounds: number; saveEnds?: boolean; value?: number };
  concentration?: boolean;
  melee?: boolean;
  special?: string;
  priority?: number;
  /** Exploration uses (light, unlock, detect, heal, revive…). */
  explore?: string;
  /** Max number of targets for multi-target spells. */
  maxTargets?: number;
  text: string;
}

const ALL_FULL: ClassId[] = ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'];
const ARCANE: ClassId[] = ['sorcerer', 'wizard'];

export const SPELLS: Record<string, SpellDef> = {};
/** Spell names and rules text live in src/locales/<lang>/game.json → spells.<id>. */
const S = (d: Textless<SpellDef, 'name' | 'text'>) => { SPELLS[d.id] = textTable<SpellDef, 'name' | 'text'>('game', ['spells', d.id], d); };

// ── cantrips ─────────────────────────────────────────────────────────────────
S({ id: 'fireBolt', level: 0, school: 'evocation', classes: ['sorcerer', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d10', dmgType: 'fire' });
S({ id: 'rayOfFrost', level: 0, school: 'evocation', classes: ['sorcerer', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d8', dmgType: 'cold', condition: { id: 'slowed', rounds: 1 } });
S({ id: 'shockingGrasp', level: 0, school: 'evocation', classes: ['sorcerer', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', melee: true, dice: '1d8', dmgType: 'lightning' });
S({ id: 'chillTouch', level: 0, school: 'necromancy', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', melee: true, dice: '1d10', dmgType: 'necrotic', condition: { id: 'noHeal', rounds: 1 } });
S({ id: 'poisonSpray', level: 0, school: 'necromancy', classes: ['druid', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d12', dmgType: 'poison' });
S({ id: 'sacredFlame', level: 0, school: 'evocation', classes: ['cleric'], cost: 'action', target: 'enemy', kind: 'save', save: 'dex', dice: '1d8', dmgType: 'radiant' });
S({ id: 'tollTheDead', level: 0, school: 'necromancy', classes: ['cleric', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'save', save: 'wis', dice: '1d8', dmgType: 'necrotic', special: 'tollTheDead' });
S({ id: 'eldritchBlast', level: 0, school: 'evocation', classes: ['warlock'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d10', dmgType: 'force', special: 'beams', priority: 9 });
S({ id: 'viciousMockery', level: 0, school: 'enchantment', classes: ['bard'], cost: 'action', target: 'enemy', kind: 'save', save: 'wis', dice: '1d6', dmgType: 'psychic', condition: { id: 'weakened', rounds: 1 } });
S({ id: 'starryWisp', level: 0, school: 'evocation', classes: ['bard', 'druid'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d8', dmgType: 'radiant', condition: { id: 'faerieFire', rounds: 1 } });
S({ id: 'produceFlame', level: 0, school: 'conjuration', classes: ['druid'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d8', dmgType: 'fire', explore: 'light' });
S({ id: 'thornWhip', level: 0, school: 'transmutation', classes: ['druid'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d6', dmgType: 'piercing', special: 'pull' });
S({ id: 'light', level: 0, school: 'evocation', classes: ['bard', 'cleric', 'sorcerer', 'wizard'], cost: 'action', target: 'self', kind: 'special', explore: 'light', special: 'utility' });
S({ id: 'guidance', level: 0, school: 'divination', classes: ['cleric', 'druid'], cost: 'action', target: 'self', kind: 'special', explore: 'guidance', special: 'utility' });

// ── 1st ──────────────────────────────────────────────────────────────────────
S({ id: 'magicMissile', level: 1, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemy', kind: 'auto', dice: '3d4+3', dmgType: 'force', upcast: '1d4+1' });
S({ id: 'burningHands', level: 1, school: 'evocation', classes: ARCANE, cost: 'action', target: 'rank', kind: 'save', save: 'dex', half: true, dice: '3d6', dmgType: 'fire', upcast: '1d6' });
S({ id: 'thunderwave', level: 1, school: 'evocation', classes: ['bard', 'druid', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'save', save: 'con', half: true, dice: '2d8', dmgType: 'thunder', upcast: '1d8', special: 'push' });
S({ id: 'chromaticOrb', level: 1, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemy', kind: 'attack', dice: '3d8', dmgType: 'acid', upcast: '1d8', special: 'chromatic' });
S({ id: 'iceKnife', level: 1, school: 'conjuration', classes: ['druid', 'sorcerer', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d10', dmgType: 'piercing', special: 'iceKnife', upcast: '1d6' });
S({ id: 'sleep', level: 1, school: 'enchantment', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'debuff', save: 'wis', condition: { id: 'unconscious', rounds: 2, saveEnds: true }, concentration: true });
S({ id: 'shield', level: 1, school: 'abjuration', classes: ARCANE, cost: 'bonus', target: 'self', kind: 'buff', condition: { id: 'shielded', rounds: 1, value: 5 } });
S({ id: 'cureWounds', level: 1, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], cost: 'action', target: 'ally', kind: 'heal', dice: '2d8', upcast: '2d8', explore: 'heal', priority: 8 });
S({ id: 'healingWord', level: 1, school: 'abjuration', classes: ['bard', 'cleric', 'druid'], cost: 'bonus', target: 'ally', kind: 'heal', dice: '2d4', upcast: '2d4', explore: 'heal', priority: 9 });
S({ id: 'guidingBolt', level: 1, school: 'evocation', classes: ['cleric'], cost: 'action', target: 'enemy', kind: 'attack', dice: '4d6', dmgType: 'radiant', upcast: '1d6', condition: { id: 'faerieFire', rounds: 1 }, priority: 7 });
S({ id: 'bless', level: 1, school: 'enchantment', classes: ['cleric', 'paladin'], cost: 'action', target: 'allies', kind: 'buff', condition: { id: 'blessed', rounds: 10, value: 4 }, concentration: true, priority: 6 });
S({ id: 'bane', level: 1, school: 'enchantment', classes: ['bard', 'cleric'], cost: 'action', target: 'enemies', kind: 'debuff', save: 'cha', condition: { id: 'baned', rounds: 10, value: 4 }, concentration: true, maxTargets: 3 });
S({ id: 'shieldOfFaith', level: 1, school: 'abjuration', classes: ['cleric', 'paladin'], cost: 'bonus', target: 'ally', kind: 'buff', condition: { id: 'shielded', rounds: 10, value: 2 }, concentration: true });
S({ id: 'inflictWounds', level: 1, school: 'necromancy', classes: ['cleric'], cost: 'action', target: 'enemy', kind: 'save', save: 'con', half: true, melee: true, dice: '2d10', dmgType: 'necrotic', upcast: '1d10' });
S({ id: 'command', level: 1, school: 'enchantment', classes: ['bard', 'cleric', 'paladin'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'wis', condition: { id: 'prone', rounds: 1 }, special: 'command' });
S({ id: 'huntersMark', level: 1, school: 'divination', classes: ['ranger'], cost: 'bonus', target: 'enemy', kind: 'debuff', condition: { id: 'marked', rounds: 10, value: 6 }, concentration: true, priority: 9 });
S({ id: 'hex', level: 1, school: 'enchantment', classes: ['warlock'], cost: 'bonus', target: 'enemy', kind: 'debuff', condition: { id: 'hexed', rounds: 10, value: 6 }, concentration: true, priority: 9 });
S({ id: 'armorOfAgathys', level: 1, school: 'abjuration', classes: ['warlock'], cost: 'bonus', target: 'self', kind: 'buff', special: 'agathys' });
S({ id: 'dissonantWhispers', level: 1, school: 'enchantment', classes: ['bard'], cost: 'action', target: 'enemy', kind: 'save', save: 'wis', half: true, dice: '3d6', dmgType: 'psychic', upcast: '1d6', condition: { id: 'frightened', rounds: 1 } });
S({ id: 'faerieFire', level: 1, school: 'evocation', classes: ['bard', 'druid'], cost: 'action', target: 'enemies', kind: 'debuff', save: 'dex', condition: { id: 'faerieFire', rounds: 10 }, concentration: true });
S({ id: 'entangle', level: 1, school: 'conjuration', classes: ['druid'], cost: 'action', target: 'rank', kind: 'debuff', save: 'str', condition: { id: 'restrained', rounds: 10, saveEnds: true }, concentration: true });
S({ id: 'divineSmite', level: 1, school: 'evocation', classes: ['paladin'], cost: 'bonus', target: 'enemy', kind: 'special', dice: '2d8', dmgType: 'radiant', upcast: '1d8', special: 'smite', priority: 10 });
S({ id: 'heroism', level: 1, school: 'enchantment', classes: ['bard', 'paladin'], cost: 'action', target: 'ally', kind: 'buff', special: 'heroism', concentration: true });
S({ id: 'falseLife', level: 1, school: 'necromancy', classes: ['sorcerer', 'wizard'], cost: 'action', target: 'self', kind: 'buff', special: 'falseLife' });

// ── 2nd ──────────────────────────────────────────────────────────────────────
S({ id: 'scorchingRay', level: 2, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemy', kind: 'attack', dice: '2d6', dmgType: 'fire', rays: 3, special: 'rays', priority: 7 });
S({ id: 'shatter', level: 2, school: 'evocation', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'save', save: 'con', half: true, dice: '3d8', dmgType: 'thunder', upcast: '1d8' });
S({ id: 'holdPerson', level: 2, school: 'enchantment', classes: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'wis', condition: { id: 'paralyzed', rounds: 10, saveEnds: true }, concentration: true, special: 'humanoid' });
S({ id: 'spiritualWeapon', level: 2, school: 'evocation', classes: ['cleric'], cost: 'bonus', target: 'enemy', kind: 'special', dice: '1d8', dmgType: 'force', special: 'spiritualWeapon', concentration: true, priority: 8 });
S({ id: 'mistyStep', level: 2, school: 'conjuration', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'bonus', target: 'self', kind: 'buff', special: 'mistyStep' });
S({ id: 'aid', level: 2, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], cost: 'action', target: 'allies', kind: 'buff', special: 'aid', explore: 'aid' });
S({ id: 'blur', level: 2, school: 'illusion', classes: ARCANE, cost: 'action', target: 'self', kind: 'buff', condition: { id: 'blurred', rounds: 10 }, concentration: true });
S({ id: 'moonbeam', level: 2, school: 'evocation', classes: ['druid'], cost: 'action', target: 'enemy', kind: 'zone', save: 'con', half: true, dice: '2d10', dmgType: 'radiant', upcast: '1d10', concentration: true });
S({ id: 'lesserRestoration', level: 2, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], cost: 'bonus', target: 'ally', kind: 'special', special: 'cleanse', explore: 'cleanse' });
S({ id: 'invisibility', level: 2, school: 'illusion', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'invisible', rounds: 10 }, concentration: true, explore: 'sneak' });
S({ id: 'web', level: 2, school: 'conjuration', classes: ARCANE, cost: 'action', target: 'rank', kind: 'debuff', save: 'dex', condition: { id: 'restrained', rounds: 10, saveEnds: true }, concentration: true });
S({ id: 'spikeGrowth', level: 2, school: 'transmutation', classes: ['druid', 'ranger'], cost: 'action', target: 'rank', kind: 'zone', dice: '2d4', dmgType: 'piercing', concentration: true });
S({ id: 'heatMetal', level: 2, school: 'transmutation', classes: ['bard', 'druid'], cost: 'action', target: 'enemy', kind: 'zone', dice: '2d8', dmgType: 'fire', upcast: '1d8', concentration: true });
S({ id: 'cloudOfDaggers', level: 2, school: 'conjuration', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'zone', dice: '4d4', dmgType: 'slashing', upcast: '2d4', concentration: true });
S({ id: 'prayerOfHealing', level: 2, school: 'abjuration', classes: ['cleric', 'paladin'], cost: 'action', target: 'allies', kind: 'heal', dice: '2d8', upcast: '1d8', explore: 'partyHeal' });
S({ id: 'findTraps', level: 2, school: 'divination', classes: ['cleric', 'druid', 'ranger'], cost: 'action', target: 'self', kind: 'special', special: 'utility', explore: 'traps' });
S({ id: 'knock', level: 2, school: 'transmutation', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'self', kind: 'special', special: 'utility', explore: 'unlock' });

// ── 3rd ──────────────────────────────────────────────────────────────────────
S({ id: 'fireball', level: 3, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '8d6', dmgType: 'fire', upcast: '1d6', priority: 10 });
S({ id: 'lightningBolt', level: 3, school: 'evocation', classes: ARCANE, cost: 'action', target: 'rank', kind: 'save', save: 'dex', half: true, dice: '8d6', dmgType: 'lightning', upcast: '1d6' });
S({ id: 'massHealingWord', level: 3, school: 'abjuration', classes: ['bard', 'cleric'], cost: 'bonus', target: 'allies', kind: 'heal', dice: '2d4', upcast: '1d4', priority: 8 });
S({ id: 'spiritGuardians', level: 3, school: 'conjuration', classes: ['cleric'], cost: 'action', target: 'rank', kind: 'zone', save: 'wis', half: true, dice: '3d8', dmgType: 'radiant', upcast: '1d8', concentration: true, priority: 9 });
S({ id: 'haste', level: 3, school: 'transmutation', classes: ARCANE, cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'hasted', rounds: 10 }, concentration: true });
S({ id: 'hypnoticPattern', level: 3, school: 'illusion', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemies', kind: 'debuff', save: 'wis', condition: { id: 'incapacitated', rounds: 10 }, concentration: true });
S({ id: 'revivify', level: 3, school: 'necromancy', classes: ['cleric', 'druid', 'paladin', 'ranger'], cost: 'action', target: 'fallenAlly', kind: 'special', special: 'revivify', explore: 'revive' });
S({ id: 'callLightning', level: 3, school: 'conjuration', classes: ['druid'], cost: 'action', target: 'enemy', kind: 'zone', save: 'dex', half: true, dice: '3d10', dmgType: 'lightning', upcast: '1d10', concentration: true });
S({ id: 'vampiricTouch', level: 3, school: 'necromancy', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', melee: true, dice: '3d6', dmgType: 'necrotic', upcast: '1d6', special: 'drain' });
S({ id: 'fear', level: 3, school: 'illusion', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'rank', kind: 'debuff', save: 'wis', condition: { id: 'frightened', rounds: 10, saveEnds: true }, concentration: true });
S({ id: 'slow', level: 3, school: 'transmutation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'debuff', save: 'wis', condition: { id: 'slowed', rounds: 10, saveEnds: true }, concentration: true, maxTargets: 6 });
S({ id: 'hungerOfHadar', level: 3, school: 'conjuration', classes: ['warlock'], cost: 'action', target: 'rank', kind: 'zone', dice: '4d6', dmgType: 'cold', upcast: '1d6', condition: { id: 'blinded', rounds: 1 }, concentration: true });
S({ id: 'crusadersMantle', level: 3, school: 'evocation', classes: ['paladin'], cost: 'action', target: 'allies', kind: 'buff', condition: { id: 'empowered', rounds: 10, value: 4 }, concentration: true });
S({ id: 'conjureBarrage', level: 3, school: 'conjuration', classes: ['ranger'], cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '5d8', dmgType: 'piercing', upcast: '1d8' });
S({ id: 'dispelMagic', level: 3, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'special', special: 'dispel', explore: 'dispel' });

// ── 4th ──────────────────────────────────────────────────────────────────────
S({ id: 'iceStorm', level: 4, school: 'evocation', classes: ['druid', 'sorcerer', 'wizard'], cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '6d8', dmgType: 'cold', upcast: '1d8' });
S({ id: 'blight', level: 4, school: 'necromancy', classes: ['druid', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'save', save: 'con', half: true, dice: '8d8', dmgType: 'necrotic', upcast: '1d8' });
S({ id: 'greaterInvisibility', level: 4, school: 'illusion', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'invisible', rounds: 10, value: 1 }, concentration: true });
S({ id: 'deathWard', level: 4, school: 'abjuration', classes: ['cleric', 'paladin'], cost: 'action', target: 'ally', kind: 'buff', special: 'deathWard' });
S({ id: 'stoneskin', level: 4, school: 'transmutation', classes: ['druid', 'ranger', 'sorcerer', 'wizard'], cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'stoneskin', rounds: 10 }, concentration: true });
S({ id: 'wallOfFire', level: 4, school: 'evocation', classes: ['druid', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'zone', save: 'dex', half: true, dice: '5d8', dmgType: 'fire', upcast: '1d8', concentration: true });
S({ id: 'banishment', level: 4, school: 'abjuration', classes: ['cleric', 'paladin', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'cha', condition: { id: 'incapacitated', rounds: 10, saveEnds: true }, concentration: true, special: 'banish' });
S({ id: 'guardianOfFaith', level: 4, school: 'conjuration', classes: ['cleric'], cost: 'action', target: 'rank', kind: 'zone', save: 'dex', half: true, dice: '4d8', dmgType: 'radiant' });

// ── 5th ──────────────────────────────────────────────────────────────────────
S({ id: 'coneOfCold', level: 5, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'con', half: true, dice: '8d8', dmgType: 'cold', upcast: '1d8', priority: 9 });
S({ id: 'flameStrike', level: 5, school: 'evocation', classes: ['cleric'], cost: 'action', target: 'rank', kind: 'save', save: 'dex', half: true, dice: '10d6', dmgType: 'radiant', upcast: '1d6' });
S({ id: 'massCureWounds', level: 5, school: 'abjuration', classes: ['bard', 'cleric', 'druid'], cost: 'action', target: 'allies', kind: 'heal', dice: '5d8', upcast: '1d8', priority: 8 });
S({ id: 'holdMonster', level: 5, school: 'enchantment', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'wis', condition: { id: 'paralyzed', rounds: 10, saveEnds: true }, concentration: true });
S({ id: 'insectPlague', level: 5, school: 'conjuration', classes: ['cleric', 'druid', 'sorcerer'], cost: 'action', target: 'rank', kind: 'zone', save: 'con', half: true, dice: '4d10', dmgType: 'piercing', upcast: '1d10', concentration: true });
S({ id: 'raiseDead', level: 5, school: 'necromancy', classes: ['bard', 'cleric', 'paladin'], cost: 'action', target: 'fallenAlly', kind: 'special', special: 'raiseDead', explore: 'revive' });
S({ id: 'greaterRestoration', level: 5, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], cost: 'action', target: 'ally', kind: 'special', special: 'cleanseAll', explore: 'cleanse' });
S({ id: 'cloudkill', level: 5, school: 'conjuration', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'zone', save: 'con', half: true, dice: '5d8', dmgType: 'poison', upcast: '1d8', concentration: true });
S({ id: 'destructiveWave', level: 5, school: 'evocation', classes: ['paladin'], cost: 'action', target: 'enemies', kind: 'save', save: 'con', half: true, dice: '10d6', dmgType: 'radiant', condition: { id: 'prone', rounds: 1 } });
S({ id: 'swiftQuiver', level: 5, school: 'transmutation', classes: ['ranger'], cost: 'bonus', target: 'self', kind: 'buff', condition: { id: 'hasted', rounds: 10 }, concentration: true });

// ── 6th ──────────────────────────────────────────────────────────────────────
S({ id: 'chainLightning', level: 6, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '10d8', dmgType: 'lightning', maxTargets: 4, upcast: '0' });
S({ id: 'disintegrate', level: 6, school: 'transmutation', classes: ARCANE, cost: 'action', target: 'enemy', kind: 'save', save: 'dex', dice: '10d6+40', dmgType: 'force', upcast: '3d6' });
S({ id: 'heal', level: 6, school: 'abjuration', classes: ['cleric', 'druid'], cost: 'action', target: 'ally', kind: 'heal', dice: '70', upcast: '10', special: 'cleanseAll' });
S({ id: 'harm', level: 6, school: 'necromancy', classes: ['cleric'], cost: 'action', target: 'enemy', kind: 'save', save: 'con', half: true, dice: '14d6', dmgType: 'necrotic' });
S({ id: 'sunbeam', level: 6, school: 'evocation', classes: ['cleric', 'druid', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'save', save: 'con', half: true, dice: '6d8', dmgType: 'radiant', condition: { id: 'blinded', rounds: 1 } });
S({ id: 'bladeBarrier', level: 6, school: 'evocation', classes: ['cleric'], cost: 'action', target: 'rank', kind: 'zone', save: 'dex', half: true, dice: '6d10', dmgType: 'slashing', concentration: true });
S({ id: 'circleOfDeath', level: 6, school: 'necromancy', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemies', kind: 'save', save: 'con', half: true, dice: '8d8', dmgType: 'necrotic', upcast: '2d8' });
S({ id: 'eyebite', level: 6, school: 'necromancy', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'wis', condition: { id: 'unconscious', rounds: 10, saveEnds: true }, concentration: true });

// ── 7th ──────────────────────────────────────────────────────────────────────
S({ id: 'fingerOfDeath', level: 7, school: 'necromancy', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'save', save: 'con', half: true, dice: '7d8+30', dmgType: 'necrotic' });
S({ id: 'fireStorm', level: 7, school: 'evocation', classes: ['cleric', 'druid', 'sorcerer'], cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '7d10', dmgType: 'fire' });
S({ id: 'delayedBlastFireball', level: 7, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '12d6', dmgType: 'fire', upcast: '1d6' });
S({ id: 'regenerate', level: 7, school: 'transmutation', classes: ['bard', 'cleric', 'druid'], cost: 'action', target: 'ally', kind: 'heal', dice: '4d8+15', condition: { id: 'regenerating', rounds: 10, value: 4 } });
S({ id: 'powerWordFortify', level: 7, school: 'enchantment', classes: ['bard', 'cleric'], cost: 'action', target: 'allies', kind: 'buff', special: 'fortify' });
S({ id: 'prismaticSpray', level: 7, school: 'evocation', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '12d6', dmgType: 'force' });

// ── 8th ──────────────────────────────────────────────────────────────────────
S({ id: 'sunburst', level: 8, school: 'evocation', classes: ['cleric', 'druid', 'sorcerer', 'wizard'], cost: 'action', target: 'enemies', kind: 'save', save: 'con', half: true, dice: '12d6', dmgType: 'radiant', condition: { id: 'blinded', rounds: 1 } });
S({ id: 'incendiaryCloud', level: 8, school: 'conjuration', classes: ['druid', 'sorcerer', 'wizard'], cost: 'action', target: 'enemies', kind: 'zone', save: 'dex', half: true, dice: '10d8', dmgType: 'fire', concentration: true });
S({ id: 'powerWordStun', level: 8, school: 'enchantment', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'special', special: 'pwStun' });
S({ id: 'holyAura', level: 8, school: 'abjuration', classes: ['cleric'], cost: 'action', target: 'allies', kind: 'buff', condition: { id: 'holyAura', rounds: 10 }, concentration: true });

// ── 9th ──────────────────────────────────────────────────────────────────────
S({ id: 'meteorSwarm', level: 9, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '40d6', dmgType: 'fire' });
S({ id: 'powerWordKill', level: 9, school: 'enchantment', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'special', special: 'pwKill', dice: '12d12', dmgType: 'psychic' });
S({ id: 'massHeal', level: 9, school: 'abjuration', classes: ['cleric'], cost: 'action', target: 'allies', kind: 'heal', dice: '233', special: 'cleanseAll' });
S({ id: 'powerWordHeal', level: 9, school: 'enchantment', classes: ['bard', 'cleric'], cost: 'action', target: 'ally', kind: 'heal', dice: '999', special: 'cleanseAll' });
S({ id: 'timeStop', level: 9, school: 'transmutation', classes: ARCANE, cost: 'action', target: 'self', kind: 'special', special: 'timeStop' });
S({ id: 'foresight', level: 9, school: 'divination', classes: ['bard', 'druid', 'warlock', 'wizard'], cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'holyAura', rounds: 99 } });
S({ id: 'trueResurrection', level: 9, school: 'necromancy', classes: ['cleric', 'druid'], cost: 'action', target: 'fallenAlly', kind: 'special', special: 'revivifyFull', explore: 'revive' });

export const SPELL_LIST = Object.values(SPELLS);

/** Spells a hero can prepare / cast right now. */
export function spellsForClass(hero: Hero): SpellDef[] {
  const cls = CLASSES[hero.classId];
  const max = maxSpellLevel(hero.classId, hero.level);
  const ids = new Set<string>();
  if (cls.caster) {
    for (const s of SPELL_LIST) if (s.classes.includes(hero.classId) && s.level <= max) ids.add(s.id);
    // Bard: Magical Secrets pulls from the Cleric, Druid and Wizard lists.
    if (hero.classId === 'bard' && hero.level >= 10) {
      for (const s of SPELL_LIST) if (s.level <= max && s.classes.some((c) => c === 'cleric' || c === 'druid' || c === 'wizard')) ids.add(s.id);
    }
    // Warlock: Mystic Arcanum.
    if (hero.classId === 'warlock') {
      for (const [lvl, need] of [[6, 11], [7, 13], [8, 15], [9, 17]] as const) {
        if (hero.level >= need) for (const s of SPELL_LIST) if (s.level === lvl && s.classes.includes('warlock')) ids.add(s.id);
      }
    }
    if (hero.classId === 'paladin' && hero.level >= 2) ids.add('divineSmite');
  }
  if (hero.feats.includes('magicInitiate')) {
    const list = hero.background === 'acolyte' ? ['sacredFlame', 'guidance', 'cureWounds'] : ['fireBolt', 'light', 'magicMissile'];
    for (const id of list) ids.add(id);
  }
  if (hero.ancestry === 'tiefling') ids.add('fireBolt');
  return [...ids].map((id) => SPELLS[id]).filter(Boolean);
}

/** Cast-able right now: prepared levelled spells + all cantrips + always-prepared. */
export function castableSpells(hero: Hero): SpellDef[] {
  const all = spellsForClass(hero);
  const prepared = new Set(hero.prepared);
  if (hero.classId === 'paladin' && hero.level >= 2) prepared.add('divineSmite');
  if (hero.classId === 'ranger') prepared.add('huntersMark');
  if (hero.classId === 'bard' && hero.level >= 20) { prepared.add('powerWordHeal'); prepared.add('powerWordKill'); }
  if (hero.feats.includes('magicInitiate')) { prepared.add('cureWounds'); prepared.add('magicMissile'); }
  return all.filter((s) => s.level === 0 || prepared.has(s.id) || (hero.classId === 'warlock' && s.level >= 6));
}

export function upcastDice(spell: SpellDef, slotLevel: number): string {
  if (!spell.dice) return '';
  const extra = Math.max(0, slotLevel - spell.level);
  if (!spell.upcast || extra === 0 || spell.upcast === '0') return spell.dice;
  // Combine like dice: "8d6" + 2×"1d6" -> "10d6"; flat parts add.
  const base = /^(\d+)d(\d+)([+-]\d+)?$/.exec(spell.dice);
  const up = /^(\d+)d(\d+)([+-]\d+)?$/.exec(spell.upcast);
  if (base && up && base[2] === up[2]) {
    const n = Number(base[1]) + Number(up[1]) * extra;
    const flat = Number(base[3] ?? 0) + Number(up[3] ?? 0) * extra;
    return `${n}d${base[2]}${flat ? (flat > 0 ? `+${flat}` : flat) : ''}`;
  }
  if (/^\d+$/.test(spell.dice) && /^\d+$/.test(spell.upcast)) return String(Number(spell.dice) + Number(spell.upcast) * extra);
  return spell.dice;
}
