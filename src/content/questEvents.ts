/**
 * Quest rooms for The Queen's Due. A taken lead may swap one ordinary event
 * room for one of these (about one run in three, always by the third try;
 * see src/meta/quest.ts).
 *
 * Side quests are earned, not automatic: the reward comes only from a passed
 * check or a won fight. A failed check usually costs HP and leaves the lead
 * open, so the room can turn up again on a later run. Quest fights hold their
 * reward (`onWin`) until the fight is won; fleeing or falling forfeits it.
 */
import type { EventSpec } from './events.ts';
import type { QuestFx } from './questTypes.ts';

const Q = (e: Omit<EventSpec, 'kind' | 'quest' | 'scene'>): EventSpec => ({ ...e, kind: 'event', quest: true, scene: `scenes/${e.id}` });
const win = (fx: QuestFx[]) => ({ type: 'quest' as const, fx });
const fight = (cultist: string, onWin: QuestFx[], elite = true) => ({ type: 'combat' as const, elite, cultist, onWin });
/** A failed quest check: its line, plus "the lead is still open". */
const lost = () => ({ type: 'text' as const, leadOpen: true });

const L0: QuestFx[] = [{ evidence: 'E1' }, { leadDone: 'L0' }];
const L2: QuestFx[] = [{ evidence: 'E3' }, { leadDone: 'L2' }, { flag: 'iloFreed' }, { trust: ['kilnrow', 1] }];
const L3: QuestFx[] = [{ evidence: 'E6' }, { leadDone: 'L3' }];
const LE: QuestFx[] = [{ fate: ['eren', 'alive'] }, { leadDone: 'LE' }, { trust: ['eren', 2] }];
const L4: QuestFx[] = [{ evidence: 'E7' }, { leadDone: 'L4' }];
const L5: QuestFx[] = [{ flag: 'tarnFreed' }, { leadDone: 'L5' }, { resolve: 1 }, { trust: ['kilnrow', 1] }];

export const QUEST_EVENTS: EventSpec[] = [
  // ── Act 0 · The Short Count (Cinder) ─────────────────────────────────────
  Q({ id: 'q_stalledCart', biome: 'cinder', options: [
      { check: { skill: 'sleightOfHand', dc: 13 }, spell: 'unlock',
        success: [win(L0), { type: 'gold', amount: 0.5 }, { type: 'text' }],
        failure: [{ type: 'damage', pct: 0.08, who: 'one' }, lost()] },
      { check: { skill: 'athletics', dc: 14 },
        success: [win(L0), { type: 'text' }],
        failure: [{ type: 'damage', pct: 0.08, who: 'one' }, lost()] },
      { check: { skill: 'survival', dc: 14 },
        success: [win(L0), { type: 'reveal' }, { type: 'text' }],
        failure: [lost()] },
      { success: [{ type: 'doubloons', n: 1 }, { type: 'text' }] },
    ] }),

  // ── Act 1 · The Supply Station (Rootbound) ───────────────────────────────
  Q({ id: 'q_choirGrove', biome: 'rootbound', options: [
      { success: [{ type: 'text' }, fight('ashCultist', L2)] },
      { check: { skill: 'persuasion', dc: 16 },
        success: [win(L2), { type: 'text' }],
        failure: [{ type: 'text' }, fight('ashCultist', L2)] },
      { check: { skill: 'stealth', dc: 15 },
        success: [win([{ evidence: 'E3' }, { evidence: 'E4' }, { leadDone: 'L2' }]), { type: 'text' }],
        failure: [{ type: 'text' }, fight('ashCultist', L2)] },
      { success: [lost()] },
    ] }),

  // ── Act 2 · The Tithe Barge (Drowned) ────────────────────────────────────
  Q({ id: 'q_titheBarge', biome: 'drowned', options: [
      { check: { skill: 'athletics', dc: 15 },
        success: [win(L3), { type: 'text' }],
        failure: [{ type: 'text' }, fight('tideCultist', L3, false)] },
      { check: { skill: 'investigation', dc: 15 },
        success: [win([...L3, { flag: 'sawDue' }]), { type: 'gold', amount: 0.6 }, { type: 'text' }],
        failure: [{ type: 'damage', pct: 0.06, who: 'one' }, lost()] },
      { success: [{ type: 'text' }, fight('tideCultist', L3)] },
    ] }),

  // ── Act 3 · Eren's Last Run (Mirror, timed) ──────────────────────────────
  Q({ id: 'q_erenCaptive', biome: 'mirror', options: [
      { success: [{ type: 'text' }, fight('facetCultist', LE)] },
      { check: { skill: 'arcana', dc: 16 },
        success: [win(LE), { type: 'text' }],
        failure: [{ type: 'text' }, fight('facetCultist', LE)] },
      { check: { skill: 'deception', dc: 16 },
        success: [win([...LE, { evidence: 'E6' }]), { type: 'text' }],
        failure: [{ type: 'text' }, fight('facetCultist', LE)] },
    ] }),

  // ── Act 3 · The Reflected Charge (Mirror) ────────────────────────────────
  Q({ id: 'q_reflectedCharge', biome: 'mirror', options: [
      { check: { skill: 'history', dc: 14 },
        success: [win(L4), { type: 'text' }],
        failure: [{ type: 'damage', pct: 0.08, who: 'party' }, lost()] },
      { check: { skill: 'investigation', dc: 15 },
        success: [win(L4), { type: 'omen' }, { type: 'text' }],
        failure: [lost()] },
    ] }),

  // ── Act 4 · The Throne Road (Starfall) ───────────────────────────────────
  Q({ id: 'q_throneRoad', biome: 'starfall', options: [
      { success: [{ type: 'text' }, fight('cometCultist', L5)] },
      { check: { skill: 'insight', dc: 15 },
        success: [win([...L5, { flag: 'sawThrone' }]), { type: 'text' }],
        failure: [{ type: 'text' }, fight('cometCultist', L5)] },
    ] }),

  // ── Muster · Shelter: The Lost Hands (Cinder) ────────────────────────────
  Q({ id: 'q_lostHands', biome: 'cinder', options: [
      { check: { skill: 'persuasion', dc: 15 },
        success: [win([{ muster: 'shelter.hands' }, { resolve: 1 }]), { type: 'text' }],
        failure: [lost()] },
      { check: { skill: 'investigation', dc: 14 },
        success: [win([{ muster: 'shelter.hands' }, { resolve: 1 }]), { type: 'item', tier: 1 }, { type: 'text' }],
        failure: [lost()] },
    ] }),

  // ── Muster · Break: The Cult's Stores (Rootbound) ────────────────────────
  Q({ id: 'q_choirStores', biome: 'rootbound', options: [
      { success: [fight('ashCultist', [{ muster: 'break.stores' }])] },
      { check: { skill: 'athletics', dc: 15 },
        success: [win([{ muster: 'break.stores' }, { resolve: 1 }]), { type: 'heal', pct: 0.3 }, { type: 'text' }],
        failure: [{ type: 'text' }, fight('ashCultist', [{ muster: 'break.stores' }])] },
    ] }),

  // ── Muster · Break: The Sunken Due (Drowned) ─────────────────────────────
  Q({ id: 'q_sunkenDue', biome: 'drowned', options: [
      { success: [{ type: 'gold', amount: 1 }, fight('tideCultist', [{ muster: 'break.due' }, { resolve: 1 }, { trust: ['kilnrow', 1] }])] },
      { check: { skill: 'athletics', dc: 16 },
        success: [win([{ muster: 'break.due' }, { resolve: 1 }, { trust: ['kilnrow', 1] }]), { type: 'gold', amount: 1.5 }, { type: 'text' }],
        failure: [{ type: 'damage', pct: 0.1, who: 'party' }, lost()] },
    ] }),

  // ── Muster · Break: The Precentor (Starfall) ─────────────────────────────
  Q({ id: 'q_precentor', biome: 'starfall', options: [
      { success: [{ type: 'text' }, fight('cometCultist', [{ muster: 'break.precentor' }, { fate: ['corvin', 'captive'] }])] },
      { check: { skill: 'intimidation', dc: 18 },
        success: [win([{ muster: 'break.precentor' }, { fate: ['corvin', 'captive'] }]), { type: 'text' }],
        failure: [{ type: 'text' }, fight('cometCultist', [{ muster: 'break.precentor' }, { fate: ['corvin', 'captive'] }])] },
    ] }),
];
