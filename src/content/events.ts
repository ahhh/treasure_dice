/**
 * Room events: investigation, obstacles, social encounters, gambles.
 * Every option either needs no check, or has an alternative, so no event can
 * soft-lock a run (plan §5.3 fairness invariant).
 */
import type { Ability, BiomeId, Skill } from '../engine/types.ts';
import type { QuestFx } from './questTypes.ts';
import { QUEST_EVENTS } from './questEvents.ts';
import { textTable, type Textless } from '../i18n/index.ts';

export type Outcome =
  | { type: 'gold'; amount: number }
  | { type: 'doubloons'; n: number }
  | { type: 'boons'; source: 'normal' | 'elite' | 'treasure' }
  | { type: 'charm'; rarity?: 'common' | 'uncommon' | 'rare' | 'legendary' }
  | { type: 'heal'; pct: number }
  | { type: 'damage'; pct: number; who: 'party' | 'one' }
  | { type: 'item'; tier: number }
  | { type: 'combat'; elite?: boolean; /** Swap one foe for this monster (the Dragon's Choir sends its own). */ cultist?: string; /** Quest effects granted only if this fight is won. */ onWin?: QuestFx[] }
  | { type: 'quest'; fx: QuestFx[] }
  | { type: 'meter'; delta: number; set?: number }
  | { type: 'reveal' }
  | { type: 'key' }
  | { type: 'omen' }
  | { type: 'die' }
  | { type: 'token'; id?: string }
  | { type: 'resources' }
  | { type: 'condition'; id: 'poisoned' | 'frightened' | 'blessed' }
  | { type: 'wheel' }
  | { type: 'gamble' }
  | { type: 'sacrifice' }
  /** `leadOpen`: a failed quest check; the line that says the lead stays open is appended. */
  | { type: 'text'; t: string; leadOpen?: boolean };

export interface EventOption {
  label: string;
  check?: { skill?: Skill; ability?: Ability; dc: number };
  /** Exploration spell tag that auto-succeeds the check. */
  spell?: string;
  /** Class that auto-succeeds. */
  cls?: string;
  cost?: { gold?: number; doubloons?: number; hpPct?: number };
  success: Outcome[];
  failure?: Outcome[];
  hint?: string;
}

export interface EventDef {
  id: string;
  biome: BiomeId | 'any';
  kind: 'event' | 'shrine' | 'key' | 'mechanism';
  title: string;
  text: string;
  options: EventOption[];
  /** Quest rooms (The Queen's Due) are placed only by a lead, never at random. */
  quest?: boolean;
  /** Room scene for a quest room. */
  scene?: string;
}

export const EVENTS: Record<string, EventDef> = {};
/** Text fields of an event, option and outcome; their words live in src/locales/<lang>/story.json → events.<id>. */
export type EventTextKey = 'title' | 'text' | 'label' | 'hint' | 't';
export type EventSpec = Textless<EventDef, EventTextKey>;
const E = (e: EventSpec) => { EVENTS[e.id] = textTable<EventDef, EventTextKey>('story', ['events', e.id], e); };

// ── generic ─────────────────────────────────────────────────────────────────
E({ id: 'lockedChest', biome: 'any', kind: 'event', options: [
    { check: { skill: 'sleightOfHand', dc: 13 }, spell: 'unlock', success: [{ type: 'gold', amount: 1 }, { type: 'item', tier: 1 }], failure: [{ type: 'damage', pct: 0.1, who: 'one' }, { type: 'text' }] },
    { check: { skill: 'athletics', dc: 14 }, success: [{ type: 'gold', amount: 1 }], failure: [{ type: 'text' }, { type: 'damage', pct: 0.05, who: 'one' }] },
    { success: [{ type: 'text' }] },
  ] });
E({ id: 'woundedStranger', biome: 'any', kind: 'event', options: [
    { check: { skill: 'medicine', dc: 12 }, spell: 'heal', success: [{ type: 'text' }, { type: 'die' }], failure: [{ type: 'text' }, { type: 'doubloons', n: 2 }] },
    { check: { skill: 'insight', dc: 11 }, success: [{ type: 'reveal' }, { type: 'text' }], failure: [{ type: 'text' }] },
    { success: [{ type: 'gold', amount: 1 }, { type: 'text' }, { type: 'condition', id: 'frightened' }] },
  ] });
E({ id: 'dicingGhost', biome: 'any', kind: 'shrine', options: [
    { cost: { doubloons: 5 }, success: [{ type: 'gamble' }] },
    { check: { skill: 'deception', dc: 15 }, success: [{ type: 'charm', rarity: 'uncommon' }, { type: 'text' }], failure: [{ type: 'damage', pct: 0.08, who: 'party' }, { type: 'text' }] },
    { success: [{ type: 'text' }] },
  ] });
E({ id: 'wheelOfFate', biome: 'any', kind: 'shrine', options: [
    { cost: { doubloons: 3 }, success: [{ type: 'wheel' }] },
    { cost: { gold: 60 }, success: [{ type: 'wheel' }] },
    { success: [{ type: 'text' }] },
  ] });
E({ id: 'diceAltar', biome: 'any', kind: 'shrine', options: [
    { success: [{ type: 'sacrifice' }] },
    { check: { skill: 'religion', dc: 13 }, success: [{ type: 'omen' }, { type: 'text' }], failure: [{ type: 'text' }] },
    { success: [] },
  ] });
E({ id: 'collapsedPassage', biome: 'any', kind: 'event', options: [
    { check: { skill: 'athletics', dc: 13 }, success: [{ type: 'gold', amount: 1 }, { type: 'item', tier: 0 }], failure: [{ type: 'damage', pct: 0.12, who: 'party' }, { type: 'text' }] },
    { check: { skill: 'investigation', dc: 14 }, success: [{ type: 'gold', amount: 1 }, { type: 'item', tier: 1 }], failure: [{ type: 'text' }] },
    { success: [] },
  ] });
E({ id: 'mysteriousPotion', biome: 'any', kind: 'event', options: [
    { check: { skill: 'arcana', dc: 12 }, success: [{ type: 'heal', pct: 0.4 }, { type: 'text' }], failure: [{ type: 'condition', id: 'poisoned' }, { type: 'text' }] },
    { success: [{ type: 'heal', pct: 0.25 }], failure: [] },
    { check: { skill: 'nature', dc: 13 }, success: [{ type: 'token', id: 'tonic' }], failure: [{ type: 'text' }] },
  ] });
E({ id: 'trapHall', biome: 'any', kind: 'event', options: [
    { check: { skill: 'perception', dc: 13 }, spell: 'traps', success: [{ type: 'doubloons', n: 3 }, { type: 'text' }], failure: [{ type: 'damage', pct: 0.12, who: 'party' }] },
    { check: { skill: 'acrobatics', dc: 14 }, success: [{ type: 'text' }], failure: [{ type: 'damage', pct: 0.15, who: 'one' }] },
    { check: { skill: 'sleightOfHand', dc: 15 }, success: [{ type: 'gold', amount: 1 }, { type: 'token' }], failure: [{ type: 'damage', pct: 0.1, who: 'one' }] },
  ] });
E({ id: 'rivalParty', biome: 'any', kind: 'event', options: [
    { check: { skill: 'persuasion', dc: 14 }, success: [{ type: 'reveal' }, { type: 'text' }], failure: [{ type: 'combat' }] },
    { check: { skill: 'intimidation', dc: 14 }, success: [{ type: 'gold', amount: 1 }, { type: 'text' }], failure: [{ type: 'combat' }] },
    { cost: { gold: 40 }, success: [{ type: 'text' }] },
    { success: [{ type: 'combat' }] },
  ] });
E({ id: 'oldShrine', biome: 'any', kind: 'event', options: [
    { cost: { gold: 25 }, success: [{ type: 'condition', id: 'blessed' }, { type: 'heal', pct: 0.2 }] },
    { check: { skill: 'history', dc: 12 }, success: [{ type: 'omen' }], failure: [{ type: 'text' }] },
    { success: [] },
  ] });
E({ id: 'cursedIdol', biome: 'any', kind: 'event', options: [
    { success: [{ type: 'charm', rarity: 'rare' }, { type: 'combat', elite: true }] },
    { check: { skill: 'investigation', dc: 15 }, spell: 'traps', success: [{ type: 'charm', rarity: 'uncommon' }, { type: 'text' }], failure: [{ type: 'damage', pct: 0.15, who: 'party' }, { type: 'text' }] },
    { success: [{ type: 'text' }] },
  ] });

// ── keys & mechanisms (always solvable) ─────────────────────────────────────
E({ id: 'sigilKey', biome: 'any', kind: 'key', options: [
    { check: { skill: 'arcana', dc: 13 }, spell: 'dispel', success: [{ type: 'key' }, { type: 'text' }], failure: [{ type: 'key' }, { type: 'damage', pct: 0.12, who: 'party' }, { type: 'text' }] },
    { success: [{ type: 'key' }, { type: 'damage', pct: 0.08, who: 'one' }] },
  ] });
E({ id: 'meterReset', biome: 'any', kind: 'mechanism', options: [
    { success: [{ type: 'meter', delta: 0, set: 0 }] },
    { success: [] },
  ] });

// ── biome-specific ─────────────────────────────────────────────────────────
E({ id: 'valveChamber', biome: 'cinder', kind: 'event', options: [
    { check: { skill: 'investigation', dc: 12 }, success: [{ type: 'meter', delta: 0, set: 0 }, { type: 'text' }], failure: [{ type: 'damage', pct: 0.12, who: 'party' }, { type: 'meter', delta: 0, set: 0 }] },
    { check: { skill: 'athletics', dc: 13 }, success: [{ type: 'meter', delta: 0, set: 0 }], failure: [{ type: 'meter', delta: 2 }, { type: 'text' }] },
  ] });
E({ id: 'foundry', biome: 'cinder', kind: 'event', options: [
    { check: { skill: 'athletics', dc: 13 }, success: [{ type: 'omen' }, { type: 'text' }], failure: [{ type: 'damage', pct: 0.08, who: 'one' }] },
    { success: [{ type: 'doubloons', n: 4 }, { type: 'meter', delta: 1 }] },
  ] });
E({ id: 'whisperingTree', biome: 'rootbound', kind: 'event', options: [
    { check: { skill: 'nature', dc: 12 }, success: [{ type: 'reveal' }, { type: 'meter', delta: 0, set: 0 }], failure: [{ type: 'meter', delta: 2 }, { type: 'text' }] },
    { check: { skill: 'persuasion', dc: 14 }, success: [{ type: 'charm' }], failure: [{ type: 'combat' }] },
  ] });
E({ id: 'sarcophagus', biome: 'rootbound', kind: 'event', options: [
    { check: { skill: 'athletics', dc: 13 }, success: [{ type: 'item', tier: 1 }, { type: 'gold', amount: 1 }], failure: [{ type: 'combat' }] },
    { check: { skill: 'religion', dc: 12 }, success: [{ type: 'condition', id: 'blessed' }, { type: 'omen' }], failure: [{ type: 'text' }] },
  ] });
E({ id: 'cipherDoor', biome: 'drowned', kind: 'event', options: [
    { check: { skill: 'investigation', dc: 13 }, spell: 'unlock', success: [{ type: 'item', tier: 1 }, { type: 'charm' }], failure: [{ type: 'damage', pct: 0.1, who: 'party' }, { type: 'text' }] },
    { success: [{ type: 'gold', amount: 1 }, { type: 'text' }] },
  ] });
E({ id: 'observatory', biome: 'drowned', kind: 'event', options: [
    { check: { skill: 'arcana', dc: 13 }, success: [{ type: 'omen' }, { type: 'reveal' }], failure: [{ type: 'text' }] },
    { success: [{ type: 'doubloons', n: 3 }] },
  ] });
E({ id: 'talkingMirror', biome: 'mirror', kind: 'event', options: [
    { check: { skill: 'insight', dc: 13 }, success: [{ type: 'reveal' }], failure: [{ type: 'meter', delta: 1 }, { type: 'text' }] },
    { success: [{ type: 'token', id: 'fateCoin' }, { type: 'damage', pct: 0.08, who: 'one' }] },
    { check: { skill: 'athletics', dc: 10 }, success: [{ type: 'doubloons', n: 3 }], failure: [{ type: 'combat' }] },
  ] });
E({ id: 'confessional', biome: 'mirror', kind: 'event', options: [
    { check: { skill: 'persuasion', dc: 12 }, success: [{ type: 'heal', pct: 0.3 }, { type: 'condition', id: 'blessed' }], failure: [{ type: 'text' }, { type: 'condition', id: 'frightened' }] },
    { check: { skill: 'deception', dc: 14 }, success: [{ type: 'charm', rarity: 'uncommon' }], failure: [{ type: 'combat' }] },
  ] });
E({ id: 'weighingScales', biome: 'starfall', kind: 'event', options: [
    { cost: { gold: 50 }, success: [{ type: 'charm', rarity: 'rare' }] },
    { check: { skill: 'insight', dc: 14 }, success: [{ type: 'heal', pct: 0.5 }, { type: 'omen' }], failure: [{ type: 'damage', pct: 0.15, who: 'party' }] },
    { success: [] },
  ] });
E({ id: 'sleepingStar', biome: 'starfall', kind: 'event', options: [
    { check: { skill: 'sleightOfHand', dc: 13 }, success: [{ type: 'die' }, { type: 'text' }], failure: [{ type: 'damage', pct: 0.15, who: 'one' }, { type: 'text' }] },
    { check: { skill: 'performance', dc: 12 }, success: [{ type: 'condition', id: 'blessed' }, { type: 'meter', delta: 0, set: 0 }], failure: [{ type: 'text' }] },
  ] });

for (const q of QUEST_EVENTS) E(q);

export const EVENT_LIST = Object.values(EVENTS);

export function eventsFor(biome: BiomeId, kind: EventDef['kind']): EventDef[] {
  return EVENT_LIST.filter((e) => e.kind === kind && (e.biome === 'any' || e.biome === biome) && !e.quest && e.id !== 'meterReset' && e.id !== 'sigilKey');
}
