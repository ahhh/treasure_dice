/**
 * SRD 5.2.1 spells, translated to ranks and the Fortune pipeline.
 * Every damaging/healing spell's dice are the `base` of a Fortune hand.
 * Spells with open-ended tabletop effects are curated to explicit outcomes.
 */
import type { Ability, ClassId, ConditionId, DamageType, Hero } from '../engine/types.ts';
import { CLASSES, maxSpellLevel } from './classes.ts';

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
const S = (d: SpellDef) => { SPELLS[d.id] = d; };

// ── cantrips ─────────────────────────────────────────────────────────────────
S({ id: 'fireBolt', name: 'Fire Bolt', level: 0, school: 'evocation', classes: ['sorcerer', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d10', dmgType: 'fire', text: 'Ranged spell attack: 1d10 fire.' });
S({ id: 'rayOfFrost', name: 'Ray of Frost', level: 0, school: 'evocation', classes: ['sorcerer', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d8', dmgType: 'cold', condition: { id: 'slowed', rounds: 1 }, text: 'Ranged spell attack: 1d8 cold; the target is slowed.' });
S({ id: 'shockingGrasp', name: 'Shocking Grasp', level: 0, school: 'evocation', classes: ['sorcerer', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', melee: true, dice: '1d8', dmgType: 'lightning', text: 'Melee spell attack: 1d8 lightning; the target loses its reaction.' });
S({ id: 'chillTouch', name: 'Chill Touch', level: 0, school: 'necromancy', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', melee: true, dice: '1d10', dmgType: 'necrotic', condition: { id: 'noHeal', rounds: 1 }, text: 'Melee spell attack: 1d10 necrotic; the target cannot regain HP.' });
S({ id: 'poisonSpray', name: 'Poison Spray', level: 0, school: 'necromancy', classes: ['druid', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d12', dmgType: 'poison', text: 'Ranged spell attack: 1d12 poison.' });
S({ id: 'sacredFlame', name: 'Sacred Flame', level: 0, school: 'evocation', classes: ['cleric'], cost: 'action', target: 'enemy', kind: 'save', save: 'dex', dice: '1d8', dmgType: 'radiant', text: 'DEX save or take 1d8 radiant.' });
S({ id: 'tollTheDead', name: 'Toll the Dead', level: 0, school: 'necromancy', classes: ['cleric', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'save', save: 'wis', dice: '1d8', dmgType: 'necrotic', special: 'tollTheDead', text: 'WIS save or take 1d8 necrotic (1d12 if the target is wounded).' });
S({ id: 'eldritchBlast', name: 'Eldritch Blast', level: 0, school: 'evocation', classes: ['warlock'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d10', dmgType: 'force', special: 'beams', priority: 9, text: 'One beam (more at 5, 11, 17): ranged spell attack, 1d10 force each.' });
S({ id: 'viciousMockery', name: 'Vicious Mockery', level: 0, school: 'enchantment', classes: ['bard'], cost: 'action', target: 'enemy', kind: 'save', save: 'wis', dice: '1d6', dmgType: 'psychic', condition: { id: 'weakened', rounds: 1 }, text: 'WIS save or 1d6 psychic and disadvantage on its next attack.' });
S({ id: 'starryWisp', name: 'Starry Wisp', level: 0, school: 'evocation', classes: ['bard', 'druid'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d8', dmgType: 'radiant', condition: { id: 'faerieFire', rounds: 1 }, text: 'Ranged spell attack: 1d8 radiant; the target glows (attacks against it have advantage).' });
S({ id: 'produceFlame', name: 'Produce Flame', level: 0, school: 'conjuration', classes: ['druid'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d8', dmgType: 'fire', explore: 'light', text: 'Ranged spell attack: 1d8 fire. Lights dark rooms.' });
S({ id: 'thornWhip', name: 'Thorn Whip', level: 0, school: 'transmutation', classes: ['druid'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d6', dmgType: 'piercing', special: 'pull', text: 'Melee-range spell attack at any rank: 1d6 piercing; pulls a back-rank target to the front.' });
S({ id: 'light', name: 'Light', level: 0, school: 'evocation', classes: ['bard', 'cleric', 'sorcerer', 'wizard'], cost: 'action', target: 'self', kind: 'special', explore: 'light', special: 'utility', text: 'Exploration: illuminates dark rooms and reveals clues.' });
S({ id: 'guidance', name: 'Guidance', level: 0, school: 'divination', classes: ['cleric', 'druid'], cost: 'action', target: 'self', kind: 'special', explore: 'guidance', special: 'utility', text: 'Exploration: +1d4 to the next skill check.' });

// ── 1st ──────────────────────────────────────────────────────────────────────
S({ id: 'magicMissile', name: 'Magic Missile', level: 1, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemy', kind: 'auto', dice: '3d4+3', dmgType: 'force', upcast: '1d4+1', text: 'Three darts that never miss: 3d4+3 force.' });
S({ id: 'burningHands', name: 'Burning Hands', level: 1, school: 'evocation', classes: ARCANE, cost: 'action', target: 'rank', kind: 'save', save: 'dex', half: true, dice: '3d6', dmgType: 'fire', upcast: '1d6', text: 'A rank of foes: DEX save, 3d6 fire (half on success).' });
S({ id: 'thunderwave', name: 'Thunderwave', level: 1, school: 'evocation', classes: ['bard', 'druid', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'save', save: 'con', half: true, dice: '2d8', dmgType: 'thunder', upcast: '1d8', special: 'push', text: 'A rank of foes: CON save, 2d8 thunder; failures are pushed back.' });
S({ id: 'chromaticOrb', name: 'Chromatic Orb', level: 1, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemy', kind: 'attack', dice: '3d8', dmgType: 'acid', upcast: '1d8', special: 'chromatic', text: 'Ranged spell attack: 3d8 of the element the target is weakest to.' });
S({ id: 'iceKnife', name: 'Ice Knife', level: 1, school: 'conjuration', classes: ['druid', 'sorcerer', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', dice: '1d10', dmgType: 'piercing', special: 'iceKnife', upcast: '1d6', text: 'Ranged attack 1d10 piercing, then the target\'s rank makes a DEX save vs 2d6 cold.' });
S({ id: 'sleep', name: 'Sleep', level: 1, school: 'enchantment', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'debuff', save: 'wis', condition: { id: 'unconscious', rounds: 2, saveEnds: true }, concentration: true, text: 'A rank of foes: WIS save or fall asleep (damage wakes them).' });
S({ id: 'shield', name: 'Shield', level: 1, school: 'abjuration', classes: ARCANE, cost: 'bonus', target: 'self', kind: 'buff', condition: { id: 'shielded', rounds: 1, value: 5 }, text: 'Adapted: +5 AC until your next turn (cast as a bonus action).' });
S({ id: 'cureWounds', name: 'Cure Wounds', level: 1, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], cost: 'action', target: 'ally', kind: 'heal', dice: '2d8', upcast: '2d8', explore: 'heal', priority: 8, text: 'Heal 2d8 + casting modifier.' });
S({ id: 'healingWord', name: 'Healing Word', level: 1, school: 'abjuration', classes: ['bard', 'cleric', 'druid'], cost: 'bonus', target: 'ally', kind: 'heal', dice: '2d4', upcast: '2d4', explore: 'heal', priority: 9, text: 'Bonus Action: heal 2d4 + casting modifier at range — can lift a downed ally.' });
S({ id: 'guidingBolt', name: 'Guiding Bolt', level: 1, school: 'evocation', classes: ['cleric'], cost: 'action', target: 'enemy', kind: 'attack', dice: '4d6', dmgType: 'radiant', upcast: '1d6', condition: { id: 'faerieFire', rounds: 1 }, priority: 7, text: 'Ranged spell attack: 4d6 radiant; the next attack against the target has advantage.' });
S({ id: 'bless', name: 'Bless', level: 1, school: 'enchantment', classes: ['cleric', 'paladin'], cost: 'action', target: 'allies', kind: 'buff', condition: { id: 'blessed', rounds: 10, value: 4 }, concentration: true, priority: 6, text: 'The party adds 1d4 to attack rolls and saves.' });
S({ id: 'bane', name: 'Bane', level: 1, school: 'enchantment', classes: ['bard', 'cleric'], cost: 'action', target: 'enemies', kind: 'debuff', save: 'cha', condition: { id: 'baned', rounds: 10, value: 4 }, concentration: true, maxTargets: 3, text: 'Up to three foes: CHA save or subtract 1d4 from attacks and saves.' });
S({ id: 'shieldOfFaith', name: 'Shield of Faith', level: 1, school: 'abjuration', classes: ['cleric', 'paladin'], cost: 'bonus', target: 'ally', kind: 'buff', condition: { id: 'shielded', rounds: 10, value: 2 }, concentration: true, text: 'An ally gains +2 AC.' });
S({ id: 'inflictWounds', name: 'Inflict Wounds', level: 1, school: 'necromancy', classes: ['cleric'], cost: 'action', target: 'enemy', kind: 'save', save: 'con', half: true, melee: true, dice: '2d10', dmgType: 'necrotic', upcast: '1d10', text: 'Touch: CON save, 2d10 necrotic (half on success).' });
S({ id: 'command', name: 'Command', level: 1, school: 'enchantment', classes: ['bard', 'cleric', 'paladin'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'wis', condition: { id: 'prone', rounds: 1 }, special: 'command', text: 'WIS save or the target grovels: prone and loses its next action.' });
S({ id: 'huntersMark', name: "Hunter's Mark", level: 1, school: 'divination', classes: ['ranger'], cost: 'bonus', target: 'enemy', kind: 'debuff', condition: { id: 'marked', rounds: 10, value: 6 }, concentration: true, priority: 9, text: 'Bonus Action: mark a foe; your hits deal +1d6 force to it.' });
S({ id: 'hex', name: 'Hex', level: 1, school: 'enchantment', classes: ['warlock'], cost: 'bonus', target: 'enemy', kind: 'debuff', condition: { id: 'hexed', rounds: 10, value: 6 }, concentration: true, priority: 9, text: 'Bonus Action: curse a foe; your hits deal +1d6 necrotic to it.' });
S({ id: 'armorOfAgathys', name: 'Armor of Agathys', level: 1, school: 'abjuration', classes: ['warlock'], cost: 'bonus', target: 'self', kind: 'buff', special: 'agathys', text: 'Gain 5 temp HP per slot level (× vitality); attackers that hit you take cold damage.' });
S({ id: 'dissonantWhispers', name: 'Dissonant Whispers', level: 1, school: 'enchantment', classes: ['bard'], cost: 'action', target: 'enemy', kind: 'save', save: 'wis', half: true, dice: '3d6', dmgType: 'psychic', upcast: '1d6', condition: { id: 'frightened', rounds: 1 }, text: 'WIS save: 3d6 psychic and frightened (half, no fear on success).' });
S({ id: 'faerieFire', name: 'Faerie Fire', level: 1, school: 'evocation', classes: ['bard', 'druid'], cost: 'action', target: 'enemies', kind: 'debuff', save: 'dex', condition: { id: 'faerieFire', rounds: 10 }, concentration: true, text: 'All foes: DEX save or glow — attacks against them have advantage.' });
S({ id: 'entangle', name: 'Entangle', level: 1, school: 'conjuration', classes: ['druid'], cost: 'action', target: 'rank', kind: 'debuff', save: 'str', condition: { id: 'restrained', rounds: 10, saveEnds: true }, concentration: true, text: 'A rank of foes: STR save or restrained.' });
S({ id: 'divineSmite', name: 'Divine Smite', level: 1, school: 'evocation', classes: ['paladin'], cost: 'bonus', target: 'enemy', kind: 'special', dice: '2d8', dmgType: 'radiant', upcast: '1d8', special: 'smite', priority: 10, text: 'Attack with a smite: on a hit add 2d8 radiant (+1d8 vs fiends/undead) and Oath Seal Mult.' });
S({ id: 'heroism', name: 'Heroism', level: 1, school: 'enchantment', classes: ['bard', 'paladin'], cost: 'action', target: 'ally', kind: 'buff', special: 'heroism', concentration: true, text: 'An ally gains temp HP equal to your modifier (× vitality) each turn and is immune to fear.' });
S({ id: 'falseLife', name: 'False Life', level: 1, school: 'necromancy', classes: ['sorcerer', 'wizard'], cost: 'action', target: 'self', kind: 'buff', special: 'falseLife', text: 'Gain 2d4+4 temp HP (× vitality).' });

// ── 2nd ──────────────────────────────────────────────────────────────────────
S({ id: 'scorchingRay', name: 'Scorching Ray', level: 2, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemy', kind: 'attack', dice: '2d6', dmgType: 'fire', rays: 3, special: 'rays', priority: 7, text: 'Three rays (+1 per upcast level): ranged spell attacks, 2d6 fire each.' });
S({ id: 'shatter', name: 'Shatter', level: 2, school: 'evocation', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'save', save: 'con', half: true, dice: '3d8', dmgType: 'thunder', upcast: '1d8', text: 'A rank of foes: CON save, 3d8 thunder.' });
S({ id: 'holdPerson', name: 'Hold Person', level: 2, school: 'enchantment', classes: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'wis', condition: { id: 'paralyzed', rounds: 10, saveEnds: true }, concentration: true, special: 'humanoid', text: 'A humanoid foe: WIS save or paralyzed (repeat save each turn).' });
S({ id: 'spiritualWeapon', name: 'Spiritual Weapon', level: 2, school: 'evocation', classes: ['cleric'], cost: 'bonus', target: 'enemy', kind: 'special', dice: '1d8', dmgType: 'force', special: 'spiritualWeapon', concentration: true, priority: 8, text: 'A floating weapon strikes now and as a free strike each of your turns: 1d8 + mod force.' });
S({ id: 'mistyStep', name: 'Misty Step', level: 2, school: 'conjuration', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'bonus', target: 'self', kind: 'buff', special: 'mistyStep', text: 'Teleport: switch ranks and become blurred until your next turn.' });
S({ id: 'aid', name: 'Aid', level: 2, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], cost: 'action', target: 'allies', kind: 'buff', special: 'aid', explore: 'aid', text: 'The party gains 5 temp HP per slot level above 1st (× vitality).' });
S({ id: 'blur', name: 'Blur', level: 2, school: 'illusion', classes: ARCANE, cost: 'action', target: 'self', kind: 'buff', condition: { id: 'blurred', rounds: 10 }, concentration: true, text: 'Attacks against you have disadvantage.' });
S({ id: 'moonbeam', name: 'Moonbeam', level: 2, school: 'evocation', classes: ['druid'], cost: 'action', target: 'enemy', kind: 'zone', save: 'con', half: true, dice: '2d10', dmgType: 'radiant', upcast: '1d10', concentration: true, text: 'A beam of moonlight sears a foe now and at the start of each of your turns (CON half).' });
S({ id: 'lesserRestoration', name: 'Lesser Restoration', level: 2, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], cost: 'bonus', target: 'ally', kind: 'special', special: 'cleanse', explore: 'cleanse', text: 'End one condition (blinded, paralyzed, poisoned…) on an ally.' });
S({ id: 'invisibility', name: 'Invisibility', level: 2, school: 'illusion', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'invisible', rounds: 10 }, concentration: true, explore: 'sneak', text: 'An ally turns invisible until it attacks.' });
S({ id: 'web', name: 'Web', level: 2, school: 'conjuration', classes: ARCANE, cost: 'action', target: 'rank', kind: 'debuff', save: 'dex', condition: { id: 'restrained', rounds: 10, saveEnds: true }, concentration: true, text: 'A rank of foes: DEX save or restrained.' });
S({ id: 'spikeGrowth', name: 'Spike Growth', level: 2, school: 'transmutation', classes: ['druid', 'ranger'], cost: 'action', target: 'rank', kind: 'zone', dice: '2d4', dmgType: 'piercing', concentration: true, text: 'Thorns rake a rank of foes each of your turns (no save).' });
S({ id: 'heatMetal', name: 'Heat Metal', level: 2, school: 'transmutation', classes: ['bard', 'druid'], cost: 'action', target: 'enemy', kind: 'zone', dice: '2d8', dmgType: 'fire', upcast: '1d8', concentration: true, text: 'A foe\'s metal glows: 2d8 fire now and each of your turns.' });
S({ id: 'cloudOfDaggers', name: 'Cloud of Daggers', level: 2, school: 'conjuration', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'zone', dice: '4d4', dmgType: 'slashing', upcast: '2d4', concentration: true, text: 'Spinning blades: 4d4 slashing now and each of your turns.' });
S({ id: 'prayerOfHealing', name: 'Prayer of Healing', level: 2, school: 'abjuration', classes: ['cleric', 'paladin'], cost: 'action', target: 'allies', kind: 'heal', dice: '2d8', upcast: '1d8', explore: 'partyHeal', text: 'Exploration: the party heals 2d8 + modifier each.' });
S({ id: 'findTraps', name: 'Find Traps', level: 2, school: 'divination', classes: ['cleric', 'druid', 'ranger'], cost: 'action', target: 'self', kind: 'special', special: 'utility', explore: 'traps', text: 'Exploration: reveals traps — automatically succeed trap checks this expedition room.' });
S({ id: 'knock', name: 'Knock', level: 2, school: 'transmutation', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'self', kind: 'special', special: 'utility', explore: 'unlock', text: 'Exploration: opens a locked door or chest.' });

// ── 3rd ──────────────────────────────────────────────────────────────────────
S({ id: 'fireball', name: 'Fireball', level: 3, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '8d6', dmgType: 'fire', upcast: '1d6', priority: 10, text: 'All foes: DEX save, 8d6 fire.' });
S({ id: 'lightningBolt', name: 'Lightning Bolt', level: 3, school: 'evocation', classes: ARCANE, cost: 'action', target: 'rank', kind: 'save', save: 'dex', half: true, dice: '8d6', dmgType: 'lightning', upcast: '1d6', text: 'A rank of foes: DEX save, 8d6 lightning.' });
S({ id: 'massHealingWord', name: 'Mass Healing Word', level: 3, school: 'abjuration', classes: ['bard', 'cleric'], cost: 'bonus', target: 'allies', kind: 'heal', dice: '2d4', upcast: '1d4', priority: 8, text: 'Bonus Action: the whole party heals 2d4 + modifier.' });
S({ id: 'spiritGuardians', name: 'Spirit Guardians', level: 3, school: 'conjuration', classes: ['cleric'], cost: 'action', target: 'rank', kind: 'zone', save: 'wis', half: true, dice: '3d8', dmgType: 'radiant', upcast: '1d8', concentration: true, priority: 9, text: 'Spirits sear the front rank of foes each of your turns (WIS half).' });
S({ id: 'haste', name: 'Haste', level: 3, school: 'transmutation', classes: ARCANE, cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'hasted', rounds: 10 }, concentration: true, text: 'An ally gains +2 AC, advantage on DEX saves, and plays an extra Fortune hand each turn (attack only).' });
S({ id: 'hypnoticPattern', name: 'Hypnotic Pattern', level: 3, school: 'illusion', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemies', kind: 'debuff', save: 'wis', condition: { id: 'incapacitated', rounds: 10 }, concentration: true, text: 'All foes: WIS save or incapacitated until damaged.' });
S({ id: 'revivify', name: 'Revivify', level: 3, school: 'necromancy', classes: ['cleric', 'druid', 'paladin', 'ranger'], cost: 'action', target: 'fallenAlly', kind: 'special', special: 'revivify', explore: 'revive', text: 'Return an ally who died during this fight to 1 HP (costs 300 carried gold).' });
S({ id: 'callLightning', name: 'Call Lightning', level: 3, school: 'conjuration', classes: ['druid'], cost: 'action', target: 'enemy', kind: 'zone', save: 'dex', half: true, dice: '3d10', dmgType: 'lightning', upcast: '1d10', concentration: true, text: 'A storm cloud strikes a foe now and each of your turns (DEX half).' });
S({ id: 'vampiricTouch', name: 'Vampiric Touch', level: 3, school: 'necromancy', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'attack', melee: true, dice: '3d6', dmgType: 'necrotic', upcast: '1d6', special: 'drain', text: 'Melee spell attack: 3d6 necrotic; you heal half the damage dealt.' });
S({ id: 'fear', name: 'Fear', level: 3, school: 'illusion', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'rank', kind: 'debuff', save: 'wis', condition: { id: 'frightened', rounds: 10, saveEnds: true }, concentration: true, text: 'A rank of foes: WIS save or frightened.' });
S({ id: 'slow', name: 'Slow', level: 3, school: 'transmutation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'debuff', save: 'wis', condition: { id: 'slowed', rounds: 10, saveEnds: true }, concentration: true, maxTargets: 6, text: 'Up to six foes: WIS save or slowed (-2 AC, no reactions, weaker turns).' });
S({ id: 'hungerOfHadar', name: 'Hunger of Hadar', level: 3, school: 'conjuration', classes: ['warlock'], cost: 'action', target: 'rank', kind: 'zone', dice: '4d6', dmgType: 'cold', upcast: '1d6', condition: { id: 'blinded', rounds: 1 }, concentration: true, text: 'A void swallows a rank: 4d6 cold each of your turns and they are blinded.' });
S({ id: 'crusadersMantle', name: "Crusader's Mantle", level: 3, school: 'evocation', classes: ['paladin'], cost: 'action', target: 'allies', kind: 'buff', condition: { id: 'empowered', rounds: 10, value: 4 }, concentration: true, text: 'Allies\' weapon hits deal +1d4 radiant.' });
S({ id: 'conjureBarrage', name: 'Conjure Barrage', level: 3, school: 'conjuration', classes: ['ranger'], cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '5d8', dmgType: 'piercing', upcast: '1d8', text: 'A storm of spectral blades: all foes DEX save, 5d8 force.' });
S({ id: 'dispelMagic', name: 'Dispel Magic', level: 3, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'special', special: 'dispel', explore: 'dispel', text: 'Strip magical buffs from a foe; exploration: dispel wards.' });

// ── 4th ──────────────────────────────────────────────────────────────────────
S({ id: 'iceStorm', name: 'Ice Storm', level: 4, school: 'evocation', classes: ['druid', 'sorcerer', 'wizard'], cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '6d8', dmgType: 'cold', upcast: '1d8', text: 'All foes: DEX save, 2d10 bludgeoning + 4d6 cold (folded as 6d8).' });
S({ id: 'blight', name: 'Blight', level: 4, school: 'necromancy', classes: ['druid', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'save', save: 'con', half: true, dice: '8d8', dmgType: 'necrotic', upcast: '1d8', text: 'CON save: 8d8 necrotic (plants are devastated).' });
S({ id: 'greaterInvisibility', name: 'Greater Invisibility', level: 4, school: 'illusion', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'invisible', rounds: 10, value: 1 }, concentration: true, text: 'An ally stays invisible even while attacking.' });
S({ id: 'deathWard', name: 'Death Ward', level: 4, school: 'abjuration', classes: ['cleric', 'paladin'], cost: 'action', target: 'ally', kind: 'buff', special: 'deathWard', text: 'The next time the ally would drop to 0 HP, it drops to 1 instead.' });
S({ id: 'stoneskin', name: 'Stoneskin', level: 4, school: 'transmutation', classes: ['druid', 'ranger', 'sorcerer', 'wizard'], cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'stoneskin', rounds: 10 }, concentration: true, text: 'An ally resists bludgeoning, piercing and slashing.' });
S({ id: 'wallOfFire', name: 'Wall of Fire', level: 4, school: 'evocation', classes: ['druid', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'zone', save: 'dex', half: true, dice: '5d8', dmgType: 'fire', upcast: '1d8', concentration: true, text: 'Flames scour a rank each of your turns (DEX half).' });
S({ id: 'banishment', name: 'Banishment', level: 4, school: 'abjuration', classes: ['cleric', 'paladin', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'cha', condition: { id: 'incapacitated', rounds: 10, saveEnds: true }, concentration: true, special: 'banish', text: 'CHA save or the foe is banished (incapacitated, untargetable; bosses resist).' });
S({ id: 'guardianOfFaith', name: 'Guardian of Faith', level: 4, school: 'conjuration', classes: ['cleric'], cost: 'action', target: 'rank', kind: 'zone', save: 'dex', half: true, dice: '4d8', dmgType: 'radiant', text: 'A spectral guardian strikes a rank each of your turns (DEX half).' });

// ── 5th ──────────────────────────────────────────────────────────────────────
S({ id: 'coneOfCold', name: 'Cone of Cold', level: 5, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'con', half: true, dice: '8d8', dmgType: 'cold', upcast: '1d8', priority: 9, text: 'All foes: CON save, 8d8 cold.' });
S({ id: 'flameStrike', name: 'Flame Strike', level: 5, school: 'evocation', classes: ['cleric'], cost: 'action', target: 'rank', kind: 'save', save: 'dex', half: true, dice: '10d6', dmgType: 'radiant', upcast: '1d6', text: 'A rank of foes: DEX save, 5d6 fire + 5d6 radiant.' });
S({ id: 'massCureWounds', name: 'Mass Cure Wounds', level: 5, school: 'abjuration', classes: ['bard', 'cleric', 'druid'], cost: 'action', target: 'allies', kind: 'heal', dice: '5d8', upcast: '1d8', priority: 8, text: 'The whole party heals 5d8 + modifier.' });
S({ id: 'holdMonster', name: 'Hold Monster', level: 5, school: 'enchantment', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'wis', condition: { id: 'paralyzed', rounds: 10, saveEnds: true }, concentration: true, text: 'Any foe: WIS save or paralyzed (repeat save each turn).' });
S({ id: 'insectPlague', name: 'Insect Plague', level: 5, school: 'conjuration', classes: ['cleric', 'druid', 'sorcerer'], cost: 'action', target: 'rank', kind: 'zone', save: 'con', half: true, dice: '4d10', dmgType: 'piercing', upcast: '1d10', concentration: true, text: 'Locusts devour a rank each of your turns (CON half).' });
S({ id: 'raiseDead', name: 'Raise Dead', level: 5, school: 'necromancy', classes: ['bard', 'cleric', 'paladin'], cost: 'action', target: 'fallenAlly', kind: 'special', special: 'raiseDead', explore: 'revive', text: 'Exploration (safe room): return a fallen ally to life (costs 500 carried gold).' });
S({ id: 'greaterRestoration', name: 'Greater Restoration', level: 5, school: 'abjuration', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], cost: 'action', target: 'ally', kind: 'special', special: 'cleanseAll', explore: 'cleanse', text: 'End every condition on an ally.' });
S({ id: 'cloudkill', name: 'Cloudkill', level: 5, school: 'conjuration', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'zone', save: 'con', half: true, dice: '5d8', dmgType: 'poison', upcast: '1d8', concentration: true, text: 'Poison fog hits all foes each of your turns (CON half).' });
S({ id: 'destructiveWave', name: 'Destructive Wave', level: 5, school: 'evocation', classes: ['paladin'], cost: 'action', target: 'enemies', kind: 'save', save: 'con', half: true, dice: '10d6', dmgType: 'radiant', condition: { id: 'prone', rounds: 1 }, text: 'All foes: CON save, 5d6 thunder + 5d6 radiant and prone.' });
S({ id: 'swiftQuiver', name: 'Swift Quiver', level: 5, school: 'transmutation', classes: ['ranger'], cost: 'bonus', target: 'self', kind: 'buff', condition: { id: 'hasted', rounds: 10 }, concentration: true, text: 'Your quiver refills itself: play an extra attack hand each turn.' });

// ── 6th ──────────────────────────────────────────────────────────────────────
S({ id: 'chainLightning', name: 'Chain Lightning', level: 6, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '10d8', dmgType: 'lightning', maxTargets: 4, upcast: '0', text: 'Up to four foes: DEX save, 10d8 lightning.' });
S({ id: 'disintegrate', name: 'Disintegrate', level: 6, school: 'transmutation', classes: ARCANE, cost: 'action', target: 'enemy', kind: 'save', save: 'dex', dice: '10d6+40', dmgType: 'force', upcast: '3d6', text: 'DEX save or take 10d6+40 force. Reduced to dust at 0.' });
S({ id: 'heal', name: 'Heal', level: 6, school: 'abjuration', classes: ['cleric', 'druid'], cost: 'action', target: 'ally', kind: 'heal', dice: '70', upcast: '10', special: 'cleanseAll', text: 'An ally regains 70 HP and is cured of blindness and disease.' });
S({ id: 'harm', name: 'Harm', level: 6, school: 'necromancy', classes: ['cleric'], cost: 'action', target: 'enemy', kind: 'save', save: 'con', half: true, dice: '14d6', dmgType: 'necrotic', text: 'CON save: 14d6 necrotic.' });
S({ id: 'sunbeam', name: 'Sunbeam', level: 6, school: 'evocation', classes: ['cleric', 'druid', 'sorcerer', 'wizard'], cost: 'action', target: 'rank', kind: 'save', save: 'con', half: true, dice: '6d8', dmgType: 'radiant', condition: { id: 'blinded', rounds: 1 }, text: 'A rank of foes: CON save, 6d8 radiant and blinded.' });
S({ id: 'bladeBarrier', name: 'Blade Barrier', level: 6, school: 'evocation', classes: ['cleric'], cost: 'action', target: 'rank', kind: 'zone', save: 'dex', half: true, dice: '6d10', dmgType: 'slashing', concentration: true, text: 'A wall of whirling blades shreds a rank each turn (DEX half).' });
S({ id: 'circleOfDeath', name: 'Circle of Death', level: 6, school: 'necromancy', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemies', kind: 'save', save: 'con', half: true, dice: '8d8', dmgType: 'necrotic', upcast: '2d8', text: 'All foes: CON save, 8d8 necrotic.' });
S({ id: 'eyebite', name: 'Eyebite', level: 6, school: 'necromancy', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'debuff', save: 'wis', condition: { id: 'unconscious', rounds: 10, saveEnds: true }, concentration: true, text: 'WIS save or fall unconscious.' });

// ── 7th ──────────────────────────────────────────────────────────────────────
S({ id: 'fingerOfDeath', name: 'Finger of Death', level: 7, school: 'necromancy', classes: ['sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'save', save: 'con', half: true, dice: '7d8+30', dmgType: 'necrotic', text: 'CON save: 7d8+30 necrotic.' });
S({ id: 'fireStorm', name: 'Fire Storm', level: 7, school: 'evocation', classes: ['cleric', 'druid', 'sorcerer'], cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '7d10', dmgType: 'fire', text: 'All foes: DEX save, 7d10 fire.' });
S({ id: 'delayedBlastFireball', name: 'Delayed Blast Fireball', level: 7, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '12d6', dmgType: 'fire', upcast: '1d6', text: 'All foes: DEX save, 12d6 fire.' });
S({ id: 'regenerate', name: 'Regenerate', level: 7, school: 'transmutation', classes: ['bard', 'cleric', 'druid'], cost: 'action', target: 'ally', kind: 'heal', dice: '4d8+15', condition: { id: 'regenerating', rounds: 10, value: 4 }, text: 'Heal 4d8+15 and regenerate each turn.' });
S({ id: 'powerWordFortify', name: 'Power Word Fortify', level: 7, school: 'enchantment', classes: ['bard', 'cleric'], cost: 'action', target: 'allies', kind: 'buff', special: 'fortify', text: 'The party shares 120 temp HP (× vitality).' });
S({ id: 'prismaticSpray', name: 'Prismatic Spray', level: 7, school: 'evocation', classes: ['bard', 'sorcerer', 'wizard'], cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '12d6', dmgType: 'force', text: 'All foes: DEX save, 12d6 of mixed elements.' });

// ── 8th ──────────────────────────────────────────────────────────────────────
S({ id: 'sunburst', name: 'Sunburst', level: 8, school: 'evocation', classes: ['cleric', 'druid', 'sorcerer', 'wizard'], cost: 'action', target: 'enemies', kind: 'save', save: 'con', half: true, dice: '12d6', dmgType: 'radiant', condition: { id: 'blinded', rounds: 1 }, text: 'All foes: CON save, 12d6 radiant and blinded.' });
S({ id: 'incendiaryCloud', name: 'Incendiary Cloud', level: 8, school: 'conjuration', classes: ['druid', 'sorcerer', 'wizard'], cost: 'action', target: 'enemies', kind: 'zone', save: 'dex', half: true, dice: '10d8', dmgType: 'fire', concentration: true, text: 'Burning smoke engulfs all foes each of your turns.' });
S({ id: 'powerWordStun', name: 'Power Word Stun', level: 8, school: 'enchantment', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'special', special: 'pwStun', text: 'A foe below 40% HP is stunned (CON save each turn); otherwise it is slowed.' });
S({ id: 'holyAura', name: 'Holy Aura', level: 8, school: 'abjuration', classes: ['cleric'], cost: 'action', target: 'allies', kind: 'buff', condition: { id: 'holyAura', rounds: 10 }, concentration: true, text: 'Allies gain advantage on saves; attacks against them have disadvantage.' });

// ── 9th ──────────────────────────────────────────────────────────────────────
S({ id: 'meteorSwarm', name: 'Meteor Swarm', level: 9, school: 'evocation', classes: ARCANE, cost: 'action', target: 'enemies', kind: 'save', save: 'dex', half: true, dice: '40d6', dmgType: 'fire', text: 'All foes: DEX save, 20d6 fire + 20d6 bludgeoning.' });
S({ id: 'powerWordKill', name: 'Power Word Kill', level: 9, school: 'enchantment', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], cost: 'action', target: 'enemy', kind: 'special', special: 'pwKill', dice: '12d12', dmgType: 'psychic', text: 'A non-boss foe below 35% HP dies; otherwise 12d12 psychic.' });
S({ id: 'massHeal', name: 'Mass Heal', level: 9, school: 'abjuration', classes: ['cleric'], cost: 'action', target: 'allies', kind: 'heal', dice: '233', special: 'cleanseAll', text: 'Restore up to 700 HP split across the party and cure conditions.' });
S({ id: 'powerWordHeal', name: 'Power Word Heal', level: 9, school: 'enchantment', classes: ['bard', 'cleric'], cost: 'action', target: 'ally', kind: 'heal', dice: '999', special: 'cleanseAll', text: 'An ally regains all HP and is cured of every condition.' });
S({ id: 'timeStop', name: 'Time Stop', level: 9, school: 'transmutation', classes: ARCANE, cost: 'action', target: 'self', kind: 'special', special: 'timeStop', text: 'Act twice more immediately — and play two extra Fortune hands.' });
S({ id: 'foresight', name: 'Foresight', level: 9, school: 'divination', classes: ['bard', 'druid', 'warlock', 'wizard'], cost: 'action', target: 'ally', kind: 'buff', condition: { id: 'holyAura', rounds: 99 }, text: 'An ally gains advantage on everything; foes have disadvantage against it.' });
S({ id: 'trueResurrection', name: 'True Resurrection', level: 9, school: 'necromancy', classes: ['cleric', 'druid'], cost: 'action', target: 'fallenAlly', kind: 'special', special: 'revivifyFull', explore: 'revive', text: 'Return a fallen ally to full health.' });

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
