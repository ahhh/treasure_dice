/**
 * The Queen's Due: data for the Lantern Keep side quest (docs/side-quest-the-queens-due.md).
 * Evidence, drinks, leads, rumors, Muster tasks, the Wardens' Lullaby and the
 * Chronicler's later notes. Logic lives in src/meta/quest.ts.
 */
import type { BiomeId } from '../engine/types.ts';
import type { QuestCond, QuestFx } from './questTypes.ts';
import { bindText, text, textTable, type Textless } from '../i18n/index.ts';

// Every word in these tables lives in src/locales/<lang>/story.json; the code keeps ids, art and rules.

// ── evidence ────────────────────────────────────────────────────────────────

export interface EvidenceDef { id: string; name: string; text: string; after?: string; art: string; look: string }

const EV = (id: string, art: string, look: string) => ({ id, art: `evidence/${art}`, look });

export const EVIDENCE = textTable<Record<string, EvidenceDef>, 'name' | 'text' | 'after'>('story', ['evidence'], Object.fromEntries([
  EV('E1', 'shortCount', 'a creased paper cargo manifest folded twice, a smudged red wax thumbprint at the bottom'),
  EV('E2', 'hessaTally', 'a folded sheet of paper covered in neat handwriting, tied with a red thread, a small clay lamp beside it'),
  EV('E3', 'groveRoster', 'a grey cloth-bound roster book stamped on the cover with a ring of five open dragon mouths'),
  EV('E4', 'hymnalPage', 'a torn page from a hymnal with lines of musical notation and a grey ribbon'),
  EV('E5', 'lampGlass', 'a warm round amber glass lens in a bronze ring etched with one curving rune, glowing faintly'),
  EV('E6', 'precentorLetter', 'a folded letter sealed with plum-coloured wax, an elegant flourish of ink on the outside'),
  EV('E7', 'reflectedCharge', 'a small silver hand mirror with a single crack running straight across the glass'),
  EV('E8', 'veskaLedger', 'a thick leather registrar\'s ledger with a pair of reading spectacles on a fine chain looped around it'),
  EV('E9', 'lullaby', 'a charcoal rubbing on a long sheet of rough paper, lines of abstract carved marks, curling at the edges'),
].map((e) => [e.id, e])));

// ── the Wardens' Lullaby ───────────────────────────────────────────────────

export const LULLABY: string[] = bindText([], 'story', ['lullaby']);

/** The Chronicler's later notes, unlocked after the awakening (keyed by chapter id). */
export const ANNOTATIONS: Record<string, string[]> = bindText({}, 'story', ['annotations']);
export const dissent = () => text('story', ['dissent']);

// ── drinks ──────────────────────────────────────────────────────────────────

export type DrinkId = 'houseAle' | 'kilnStout' | 'spicedMead' | 'minersTea' | 'cordial';
export interface DrinkDef { id: DrinkId; name: string; price: number; text: string; line: string; soft?: boolean; when?: QuestCond; rationed?: boolean; look: string }

export const DRINKS = textTable<Record<DrinkId, DrinkDef>, 'name' | 'text' | 'line'>('story', ['drinks'], {
  houseAle: { id: 'houseAle', price: 10, rationed: true, look: 'a foaming pewter tankard of golden ale' },
  kilnStout: { id: 'kilnStout', price: 15, look: 'a dark stout with a tan head in a glazed clay mug painted with a small blue flame' },
  spicedMead: { id: 'spicedMead', price: 15, look: 'amber spiced mead in a carved drinking horn with a cinnamon stick' },
  minersTea: { id: 'minersTea', price: 10, soft: true, rationed: true, look: 'a dented tin cup of steaming dark tea' },
  cordial: { id: 'cordial', price: 20, soft: true, when: { has: ['met:sereth'] }, look: 'a small stemmed glass of luminous pale-gold cordial with a sprig of green herbs' },
});

// ── leads ───────────────────────────────────────────────────────────────────

export interface LeadDef {
  id: string;
  title: string;
  biome: BiomeId | 'town';
  /** Quest room placed when the lead spawns. */
  eventId?: string;
  brief: string;
  /** Expeditions before it fails (Eren's last run). */
  timed?: number;
}

export const LEADS = textTable<Record<string, LeadDef>, 'title' | 'brief'>('story', ['leads'], {
  L0: { id: 'L0', biome: 'cinder', eventId: 'q_stalledCart' },
  L1: { id: 'L1', biome: 'town' },
  L2: { id: 'L2', biome: 'rootbound', eventId: 'q_choirGrove' },
  L3: { id: 'L3', biome: 'drowned', eventId: 'q_titheBarge' },
  LE: { id: 'LE', biome: 'mirror', eventId: 'q_erenCaptive', timed: 4 },
  L4: { id: 'L4', biome: 'mirror', eventId: 'q_reflectedCharge' },
  L5: { id: 'L5', biome: 'starfall', eventId: 'q_throneRoad' },
  M_hands: { id: 'M_hands', biome: 'cinder', eventId: 'q_lostHands' },
  M_stores: { id: 'M_stores', biome: 'rootbound', eventId: 'q_choirStores' },
  M_due: { id: 'M_due', biome: 'drowned', eventId: 'q_sunkenDue' },
  M_precentor: { id: 'M_precentor', biome: 'starfall', eventId: 'q_precentor' },
});

/** A taken lead spawns its room in about one run in three, and always by the third try. */
export const LEAD_CHANCE = 1 / 3;
export const LEAD_PITY = 2;

// ── rumors ──────────────────────────────────────────────────────────────────

export type RumorKind = 'everyday' | 'investigative' | 'reactive';
export interface RumorDef { id: string; source: string; kind: RumorKind; text: string; when: QuestCond; fx?: QuestFx[] }
export const SOURCES = textTable<Record<string, { name: string; icon: string; bias: string }>, 'name' | 'bias'>('story', ['rumorSources'], {
  dace: { icon: '⛏' },
  pellam: { icon: '🗡' },
  recruiter: { icon: '🔔' },
  clerk: { icon: '📋' },
  dockhand: { icon: '⚓' },
});

const R = (id: string, source: string, kind: RumorKind, when: QuestCond, fx?: QuestFx[]): RumorDef =>
  textTable<RumorDef, 'text'>('story', ['rumors', id], { id, source, kind, when, fx });

export const RUMORS: RumorDef[] = [
  // Act 0
  R('r0a', 'dace', 'everyday', { headsBelow: 1 }),
  R('r0b', 'pellam', 'everyday', { headsBelow: 1 }),
  R('r0c', 'clerk', 'everyday', { headsBelow: 1 }),
  // Act 1
  R('r1a', 'dockhand', 'investigative', { headsAtLeast: 1, headsBelow: 3 }, [{ lead: 'L2' }]),
  R('r1b', 'dace', 'reactive', { headsAtLeast: 1, headsBelow: 2 }),
  R('r1c', 'recruiter', 'reactive', { headsAtLeast: 1, headsBelow: 2 }),
  // Act 2
  R('r2a', 'clerk', 'everyday', { headsAtLeast: 2, headsBelow: 3 }),
  R('r2b', 'dockhand', 'investigative', { headsAtLeast: 2, headsBelow: 4 }, [{ lead: 'L3' }]),
  R('r2c', 'pellam', 'everyday', { headsAtLeast: 2, headsBelow: 3 }),
  // Act 3
  R('r3a', 'dace', 'reactive', { headsAtLeast: 3, headsBelow: 4 }),
  R('r3b', 'recruiter', 'reactive', { headsAtLeast: 3, headsBelow: 5 }),
  R('r3c', 'clerk', 'investigative', { headsAtLeast: 3, headsBelow: 5 }, [{ lead: 'L4' }]),
  // Act 4
  R('r4a', 'clerk', 'reactive', { headsAtLeast: 4, headsBelow: 5 }),
  R('r4b', 'dockhand', 'investigative', { headsAtLeast: 4, headsBelow: 5 }, [{ lead: 'L5' }]),
  R('r4c', 'pellam', 'reactive', { headsAtLeast: 4, headsBelow: 5 }),
  // Awakened
  R('r5a', 'dace', 'reactive', { awakened: true, tiamatSlain: false }),
  R('r5b', 'recruiter', 'reactive', { awakened: true, tiamatSlain: false }),
  R('r5c', 'clerk', 'reactive', { awakened: true, tiamatSlain: false }),
  R('r6a', 'dace', 'everyday', { tiamatSlain: true }),
];

// ── the Muster (after the awakening) ───────────────────────────────────────

export type Track = 'shelter' | 'break' | 'unite';
export interface MusterTask { id: string; track: Track; title: string; text: string; lead?: string; gold?: number; when?: QuestCond; /** What the player still needs, shown while `when` fails. */ need?: string; scene?: string }

export const MUSTER: MusterTask[] = ([
  { id: 'shelter.hands', track: 'shelter', lead: 'M_hands' },
  { id: 'shelter.hearths', track: 'shelter', scene: 'muster.hearths', when: { trust: ['kilnrow', 2] } },
  { id: 'shelter.cellar', track: 'shelter', gold: 300 },
  { id: 'break.stores', track: 'break', lead: 'M_stores' },
  { id: 'break.due', track: 'break', lead: 'M_due' },
  { id: 'break.precentor', track: 'break', lead: 'M_precentor', when: { has: ['ev:E6'] } },
  { id: 'unite.assembly', track: 'unite', scene: 'muster.assembly', when: { any: ['fate:veska:testifies', 'fate:sereth:broken'], resolve: 5 } },
  { id: 'unite.guild', track: 'unite', scene: 'muster.guild', when: { has: ['muster:unite.assembly'], resolve: 7 } },
  { id: 'unite.light', track: 'unite', scene: 'muster.light', when: { has: ['muster:unite.guild'], resolve: 8 } },
] as Textless<MusterTask, 'title' | 'text' | 'need'>[]).map((m) => textTable<MusterTask, 'title' | 'text' | 'need'>('story', ['muster', m.id], m));

export const TRACKS = textTable<Record<Track, { name: string; boon: string; cost: string }>, 'name' | 'boon' | 'cost'>('story', ['tracks'], { shelter: {}, break: {}, unite: {} });
