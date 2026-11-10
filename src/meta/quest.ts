/**
 * The Queen's Due: quest state machine (docs/side-quest-the-queens-due.md).
 * Every story beat is gated on heads awake (echoes cleared), never on hero
 * level. All state changes run through dispatch() commands, so they autosave
 * and replay like the rest of the game.
 */
import type { BiomeId, Expedition, GameState, Hero, QuestState, Skill } from '../engine/types.ts';
import { Rng, seedState } from '../engine/rng.ts';
import { rollD20 } from '../engine/dice.ts';
import { derive } from '../rules/character.ts';
import { BIOME_ORDER } from '../content/biomes.ts';
import { EVENTS } from '../content/events.ts';
import { storyOf } from '../content/story.ts';
import { heroColour } from '../fortune/dicepath.ts';
import { DRINKS, LEADS, LEAD_CHANCE, LEAD_PITY, MUSTER, RUMORS, type DrinkId, type MusterTask, type Track } from '../content/quest.ts';
import type { QuestCond, QuestFx } from '../content/questTypes.ts';
import { SCRIPTS, type DlgChoice, type DlgNode, type Script } from '../content/dialogue.ts';
import { NPCS } from '../content/npcs.ts';
import { ref, text, tx } from '../i18n/index.ts';

// ── state ───────────────────────────────────────────────────────────────────

export function questOf(g: GameState): QuestState {
  return (g.profile.quest ??= { flags: [], trust: {}, fate: {}, resolve: 0, leads: [], rumors: [] });
}

/** Tiamat's heads awake: one per echo broken. */
export function heads(g: GameState): number {
  return BIOME_ORDER.filter((b) => (g.profile.sigils[b] ?? 0) > 0).length;
}
export const awakened = (g: GameState) => heads(g) >= 5;
export const tiamatSlain = (g: GameState) => storyOf(g).tiamat > 0;

/** The Low Lantern opens once the guided tour is over (finished or skipped). */
export function tavernOpen(g: GameState): boolean {
  return !g.tutorial;
}

export function has(g: GameState, flag: string): boolean {
  const q = questOf(g);
  if (flag.startsWith('fate:')) { const [, npc, f] = flag.split(':'); return q.fate[npc] === f; }
  return q.flags.includes(flag);
}

function addFlag(q: QuestState, f: string) { if (!q.flags.includes(f)) q.flags.push(f); }

export function check(g: GameState, c: QuestCond | undefined): boolean {
  if (!c) return true;
  const q = questOf(g);
  const n = heads(g);
  if (c.headsAtLeast !== undefined && n < c.headsAtLeast) return false;
  if (c.headsBelow !== undefined && n >= c.headsBelow) return false;
  if (c.has && !c.has.every((f) => has(g, f))) return false;
  if (c.not && c.not.some((f) => has(g, f))) return false;
  if (c.any && !c.any.some((f) => has(g, f))) return false;
  if (c.trust && (q.trust[c.trust[0]] ?? 0) < c.trust[1]) return false;
  if (c.fate && q.fate[c.fate[0]] !== c.fate[1]) return false;
  if (c.notFate && q.fate[c.notFate[0]] === c.notFate[1]) return false;
  if (c.resolve !== undefined && q.resolve < c.resolve) return false;
  if (c.awakened !== undefined && awakened(g) !== c.awakened) return false;
  if (c.tiamatSlain !== undefined && tiamatSlain(g) !== c.tiamatSlain) return false;
  if (c.mode && g.mode !== c.mode) return false;
  if (c.goldAtLeast !== undefined && g.profile.bankedGold < c.goldAtLeast) return false;
  return true;
}

/** Apply effects; returns short notes for the UI ("Evidence: …", "Eren will remember that."). */
export function applyFx(g: GameState, fx: QuestFx[] | undefined): string[] {
  const q = questOf(g);
  const notes: string[] = [];
  for (const e of fx ?? []) {
    if ('flag' in e) addFlag(q, e.flag);
    else if ('unflag' in e) q.flags = q.flags.filter((f) => f !== e.unflag);
    else if ('evidence' in e) { if (!q.flags.includes(`ev:${e.evidence}`)) { addFlag(q, `ev:${e.evidence}`); notes.push(tx('metaQuest.ev', { evidence: e.evidence })); } }
    else if ('trust' in e) q.trust[e.trust[0]] = Math.max(0, Math.min(3, (q.trust[e.trust[0]] ?? 0) + e.trust[1]));
    else if ('resolve' in e) q.resolve = Math.max(0, Math.min(10, q.resolve + e.resolve));
    else if ('lead' in e) { if (offerLead(g, e.lead)) notes.push(tx('metaQuest.lead', { lead: e.lead })); }
    else if ('leadDone' in e) { addFlag(q, `leadDone:${e.leadDone}`); q.leads = q.leads.filter((l) => l.id !== e.leadDone); }
    else if ('fate' in e) {
      const [npc, f] = e.fate;
      // A rescue after capture leaves a scar.
      if (npc === 'eren' && f === 'alive' && q.fate.eren === 'captured') addFlag(q, 'erenScarred');
      q.fate[npc] = f;
    }
    else if ('gold' in e) g.profile.bankedGold = Math.max(0, g.profile.bankedGold + e.gold);
    else if ('rumor' in e) { if (!q.rumors.includes(e.rumor)) q.rumors.push(e.rumor); }
    else if ('remember' in e) notes.push(tx('metaQuest.remember', { remember: e.remember }));
    else if ('muster' in e) completeMuster(g, e.muster);
  }
  return notes;
}

// ── leads ───────────────────────────────────────────────────────────────────

export function offerLead(g: GameState, id: string): boolean {
  const q = questOf(g);
  if (q.leads.some((l) => l.id === id) || q.flags.includes(`leadDone:${id}`)) return false;
  const def = LEADS[id];
  if (!def) return false;
  q.leads.push({ id, misses: 0, runsLeft: def.timed });
  return true;
}

export function activeLeads(g: GameState) {
  return questOf(g).leads.map((l) => ({ ...l, def: LEADS[l.id] }));
}

export function leadsFor(g: GameState, biome: BiomeId) {
  return activeLeads(g).filter((l) => l.def.biome === biome && l.def.eventId);
}

/** The farthest event room off the critical path (or any event room) becomes the quest room. */
function questRoomKey(exp: Expedition): string | null {
  const start = exp.map.rooms[exp.map.start];
  const events = Object.values(exp.map.rooms).filter((r) => r.type === 'event');
  if (!events.length) return null;
  const off = events.filter((r) => !exp.map.criticalPath.includes(r.key));
  const pool = off.length ? off : events;
  pool.sort((a, b) => (Math.abs(b.x - start.x) + Math.abs(b.y - start.y)) - (Math.abs(a.x - start.x) + Math.abs(a.y - start.y)) || a.key.localeCompare(b.key));
  return pool[0].key;
}

/**
 * A taken lead places its room in about one run in three, and always by the
 * third try. Uses its own RNG, so the layout a seed produces never changes.
 */
export function placeQuestRoom(g: GameState, exp: Expedition): string | null {
  if (exp.tutorial || exp.finale) return null;
  const leads = leadsFor(g, exp.biome).sort((a, b) => Number(!!b.def.timed) - Number(!!a.def.timed));
  const lead = leads[0];
  if (!lead) return null;
  const q = questOf(g);
  const state = q.leads.find((l) => l.id === lead.id)!;
  const rng = new Rng(seedState(`${exp.seed}|${lead.id}|${state.misses}`));
  const spawn = state.misses >= LEAD_PITY || rng.next() < LEAD_CHANCE;
  const roomKey = spawn ? questRoomKey(exp) : null;
  if (!roomKey) { state.misses += 1; return null; }
  state.misses = 0;
  const ev = EVENTS[lead.def.eventId!];
  const room = exp.map.rooms[roomKey];
  room.eventId = ev.id;
  room.eventDone = false;
  room.name = ev.title;
  room.nameRef = ref('story', ['events', ev.id, 'title']);
  room.text = text('story', ['questRoomText']);
  room.textRefs = [ref('story', ['questRoomText'])];
  room.art = ev.scene;
  exp.quest = { ...exp.quest, lead: lead.id };
  return roomKey;
}

// ── drinks ──────────────────────────────────────────────────────────────────

export function drinkAvailable(g: GameState, id: DrinkId): string | null {
  const d = DRINKS[id];
  if (!check(g, d.when)) return tx('metaQuest.notOnTheMenuYet');
  if (awakened(g) && !tiamatSlain(g) && !d.rationed && !has(g, 'muster:shelter.cellar')) return tx('metaQuest.rationedStockTheCellarTo');
  return null;
}

export function buyDrink(g: GameState, id: string): string | null {
  const d = DRINKS[id as DrinkId];
  if (!d) return tx('metaQuest.noSuchDrink');
  const why = drinkAvailable(g, d.id);
  if (why) return why;
  const q = questOf(g);
  if (q.drink) return tx('metaQuest.youAlreadyHaveADrink');
  if (g.profile.bankedGold < d.price) return tx('metaQuest.costsGold', { dName: d.name, price: d.price });
  g.profile.bankedGold -= d.price;
  q.drink = d.id;
  return null;
}

/** Sereth tends the heroes once per Keep day: a Tonic for the next run. */
export function tend(g: GameState): string | null {
  const q = questOf(g);
  if (!has(g, 'met:sereth') || ['faith', 'martyr'].includes(q.fate.sereth ?? '')) return tx('metaQuest.serethIsnTHere');
  if (q.tendedDay === g.profile.townDay) return tx('metaQuest.serethHasAlreadySeenTo');
  q.tendedDay = g.profile.townDay;
  q.tended = true;
  return null;
}

// ── expedition hooks ────────────────────────────────────────────────────────

/** The colours Chromatic Dominion debuffs: the only ones the Silenced Hymn can spare. */
export const CHROMATIC = ['ember', 'verdant', 'shadow', 'frost', 'storm'] as const;
export type Chromatic = typeof CHROMATIC[number];

/**
 * The colour the Silenced Hymn spares: the player's choice, else the party's
 * most common debuffed signature colour, else Shadow (rogues and warlocks).
 */
export function hymnColour(g: GameState, party: Hero[]): Chromatic {
  const pick = questOf(g).hymn as Chromatic | undefined;
  if (pick && CHROMATIC.includes(pick)) return pick;
  const n: Partial<Record<Chromatic, number>> = {};
  for (const h of party) { const c = heroColour(h) as Chromatic; if (CHROMATIC.includes(c)) n[c] = (n[c] ?? 0) + 1; }
  return (Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] as Chromatic | undefined) ?? 'shadow';
}

export function setHymn(g: GameState, colour: string): string | null {
  if (!CHROMATIC.includes(colour as Chromatic)) return tx('metaQuest.theHymnCanOnlySpare');
  questOf(g).hymn = colour;
  return null;
}

export function onExpeditionStart(g: GameState, exp: Expedition, party: Hero[], maxTokens: number): void {
  if (exp.tutorial) return;
  const q = questOf(g);
  const give = (t: string) => { if (exp.fortune.tokens.length < maxTokens) exp.fortune.tokens.push(t); };
  if (q.drink) {
    exp.quest = { ...exp.quest, drink: q.drink };
    if (q.drink === 'houseAle') give('tonic');
    if (q.drink === 'minersTea') give('mulligan');
    if (q.drink === 'cordial') give('fateCoin');
    if (q.drink === 'kilnStout') exp.flags.drinkWard = 1;
    q.drink = undefined;
  }
  if (q.tended) { give('tonic'); q.tended = false; }
  if (exp.finale) {
    if (trackDone(g, 'shelter')) { give('tonic'); give('tonic'); }
    if (trackDone(g, 'unite')) exp.flags.kindred = 1;
    if (trackDone(g, 'break')) exp.fortune.spared = hymnColour(g, party);
    return;
  }
  placeQuestRoom(g, exp);
}

export interface QuestResult { found: string[]; head?: BiomeId; notes: string[] }

export function onExpeditionEnd(g: GameState, exp: Expedition, kind: 'won' | 'retreated' | 'wiped', firstClear: boolean, bankedGold: number): QuestResult {
  const q = questOf(g);
  const res: QuestResult = { found: [], notes: [] };
  if (exp.tutorial) return res;
  if (exp.quest?.drink === 'spicedMead' && kind !== 'wiped') {
    const bonus = Math.min(150, Math.round(bankedGold * 0.1));
    g.profile.bankedGold += bonus;
    if (bonus) res.notes.push(tx('metaQuest.spicedMeadGold', { bonus }));
  }
  // Timed leads count every expedition (Story mode forgives a wipe).
  for (const l of q.leads.slice()) {
    if (l.runsLeft === undefined) continue;
    if (g.mode === 'story' && kind === 'wiped') continue;
    l.runsLeft -= 1;
    if (l.runsLeft <= 0) {
      q.leads = q.leads.filter((x) => x !== l);
      addFlag(q, `leadFailed:${l.id}`);
      if (l.id === 'LE') { q.fate.eren = 'captured'; res.notes.push(tx('metaQuest.erenDidNotComeBack')); }
    }
  }
  if (kind === 'won' && firstClear && !exp.finale) {
    res.head = exp.biome;
    if (exp.biome === 'drowned' && tavernOpen(g)) { applyFx(g, [{ evidence: 'E5' }]); res.found.push('E5'); }
  }
  if (kind === 'won' && exp.finale) addFlag(q, 'slain');
  return res;
}

// ── rumors ──────────────────────────────────────────────────────────────────

/** Up to three rumors tonight: unheard investigative ones first, then the current act's talk. */
export function rumorsTonight(g: GameState) {
  const q = questOf(g);
  const pool = RUMORS.filter((r) => check(g, r.when));
  const fresh = pool.filter((r) => !q.rumors.includes(r.id));
  const rng = new Rng(seedState(`rumors|${g.profile.townDay}`));
  const old = rng.shuffle(pool.filter((r) => q.rumors.includes(r.id)));
  return [...fresh, ...old].slice(0, 3).map((r) => ({ ...r, isNew: !q.rumors.includes(r.id) }));
}

export function hearRumor(g: GameState, id: string): string | null {
  const r = RUMORS.find((x) => x.id === id);
  if (!r || !check(g, r.when)) return tx('metaQuest.nobodyIsSayingThatTonight');
  const q = questOf(g);
  if (!q.rumors.includes(id)) { q.rumors.push(id); applyFx(g, r.fx); }
  return null;
}

// ── the Muster ──────────────────────────────────────────────────────────────

export function trackDone(g: GameState, t: Track): boolean {
  const last = { shelter: ['shelter.hands', 'shelter.hearths', 'shelter.cellar'], break: ['break.stores', 'break.due', 'break.precentor'], unite: ['unite.light'] }[t];
  return last.every((id) => has(g, `muster:${id}`));
}
export function trackStarted(g: GameState, t: Track): boolean {
  return MUSTER.some((m) => m.track === t && has(g, `muster:${m.id}`));
}

function completeMuster(g: GameState, id: string) {
  const q = questOf(g);
  addFlag(q, `muster:${id}`);
  // Bringing the hands home brings Eren home too, if the cult took him.
  if (id === 'shelter.hands' && q.fate.eren === 'captured') { q.fate.eren = 'alive'; addFlag(q, 'erenScarred'); }
}

export function musterTasks(g: GameState) {
  return MUSTER.map((m) => ({ ...m, done: has(g, `muster:${m.id}`), open: check(g, m.when), leadOpen: m.lead ? questOf(g).leads.some((l) => l.id === m.lead) : false }));
}

/** A Muster task from the board: takes its lead, pays its gold, or returns the scene to play. */
export function musterAct(g: GameState, id: string): string | null {
  if (!awakened(g) || tiamatSlain(g)) return tx('metaQuest.theMusterIsNotCalled');
  const m = MUSTER.find((x) => x.id === id) as MusterTask | undefined;
  if (!m) return tx('metaQuest.noSuchTask');
  if (has(g, `muster:${id}`)) return tx('metaQuest.alreadyDone');
  if (!check(g, m.when)) return tx('metaQuest.notYetYouNeedMore');
  if (m.lead) { offerLead(g, m.lead); return null; }
  if (m.gold) {
    if (g.profile.bankedGold < m.gold) return tx('metaQuest.needsGold', { gold: m.gold });
    g.profile.bankedGold -= m.gold;
    applyFx(g, [{ muster: id }, { resolve: 1 }]);
    return null;
  }
  return null;
}

export function trainingClosed(g: GameState): boolean {
  return awakened(g) && !tiamatSlain(g) && trackStarted(g, 'shelter');
}

// ── dialogue ────────────────────────────────────────────────────────────────

export function script(id: string): Script | undefined {
  return SCRIPTS.find((s) => s.id === id);
}

/** Scenes ready to play at a place, best first. */
export function readyScripts(g: GameState, where: Script['where']): Script[] {
  if (!tavernOpen(g) && where === 'tavern') return [];
  return SCRIPTS.filter((s) => s.where === where && (s.repeat || !has(g, `seen:${s.id}`)) && check(g, s.when))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function visibleChoices(g: GameState, node: DlgNode): DlgChoice[] {
  return (node.choices ?? []).filter((c) => check(g, c.when));
}

/** Follow `when`/`skip` until a node that should show. */
export function resolveNode(g: GameState, s: Script, id: string | undefined): string | null {
  let cur = id;
  for (let i = 0; cur && i < 50; i++) {
    const n = s.nodes[cur];
    if (!n) return null;
    if (check(g, n.when)) return cur;
    cur = n.skip;
  }
  return null;
}

/** The living hero at the Keep best at a skill (dialogue checks use the whole roster). */
export function bestAtKeep(g: GameState, skill: Skill): { hero: Hero; bonus: number } | null {
  let best: { hero: Hero; bonus: number } | null = null;
  for (const h of g.roster) {
    if (h.status !== 'alive') continue;
    const b = derive(h).skills[skill];
    if (!best || b > best.bonus) best = { hero: h, bonus: b };
  }
  return best;
}

export interface TalkResult { next: string | null; roll?: { hero: string; skill: Skill; natural: number; total: number; dc: number; ok: boolean }; notes: string[] }

/**
 * Advance a scene: apply the node's effects (or the chosen choice's), roll any
 * check on the town RNG, and return the next node to show (null = scene over).
 */
export function talk(g: GameState, scriptId: string, nodeId: string, choice?: number): { error?: string; result?: TalkResult } {
  const s = script(scriptId);
  if (!s) return { error: tx('metaQuest.noSuchConversation') };
  if (!check(g, s.when) && !has(g, `talking:${s.id}`)) return { error: tx('metaQuest.notNow') };
  const node = s.nodes[nodeId];
  if (!node) return { error: tx('metaQuest.lostTheThread') };
  const q = questOf(g);
  addFlag(q, `talking:${s.id}`);
  const notes: string[] = [];
  let next: string | undefined;
  let roll: TalkResult['roll'];
  // Speaking introduces you, except to people who keep their names (they are named by an effect).
  if (NPCS[node.who] && !NPCS[node.who].alias) addFlag(q, `met:${node.who}`);
  notes.push(...applyFx(g, node.fx));
  const choices = visibleChoices(g, node);
  if (choices.length) {
    const c = choices[choice ?? -1];
    if (!c) return { error: tx('metaQuest.chooseAnAnswer') };
    let ok = true;
    if (c.check) {
      const best = bestAtKeep(g, c.check.skill);
      const rng = new Rng(g.townRng);
      const nat = rollD20(rng).natural;
      g.townRng = rng.state;
      const total = nat + (best?.bonus ?? 0);
      ok = total >= c.check.dc;
      roll = { hero: best?.hero.name ?? 'Nobody', skill: c.check.skill, natural: nat, total, dc: c.check.dc, ok };
    }
    notes.push(...applyFx(g, ok ? c.fx : c.failFx));
    next = ok ? c.goto : c.fail ?? c.goto;
  } else next = node.end ? undefined : node.next;
  const resolved = resolveNode(g, s, next);
  if (!resolved) {
    q.flags = q.flags.filter((f) => f !== `talking:${s.id}`);
    addFlag(q, `seen:${s.id}`);
  }
  return { result: { next: resolved, roll, notes } };
}

/** Mark something seen without a scene (barks, banners). */
export function markSeen(g: GameState, flag: string): string | null {
  if (!/^(bark|seen|note):/.test(flag)) return tx('metaQuest.notASeenFlag');
  addFlag(questOf(g), flag);
  return null;
}

// ── migration for Keeps that started before the quest existed ──────────────

export function migrateQuest(g: GameState) {
  if (g.profile.quest) return;
  const n = heads(g);
  if (n === 0) return;
  const q = questOf(g);
  // Skip earlier acts' scenes; Bet tells the player what they missed.
  addFlag(q, 'catchup');
  const past = ['bet.intro', 'eren.hands', 'eren.noManifest', 'bet.lamps', 'veska.intro', 'corvin.round', 'eren.trust', 'sereth.intro', 'bet.choirCorner', 'eren.containment', 'bet.erenGone', 'veska.ledger', 'voices.three', 'awaken.onlyLight'];
  const keep: Record<number, string[]> = { 1: ['eren.hands', 'bet.lamps', 'veska.intro', 'corvin.round'], 2: ['eren.trust', 'sereth.intro'], 3: ['eren.containment', 'bet.choirCorner'], 4: ['veska.ledger', 'voices.three'], 5: ['awaken.onlyLight'] };
  for (const id of past) if (!(keep[n] ?? []).includes(id)) addFlag(q, `seen:${id}`);
  addFlag(q, 'met:bet'); addFlag(q, 'met:eren');
  if (n >= 2) { addFlag(q, 'met:veska'); addFlag(q, 'met:corvin'); }
  if (n >= 3) { addFlag(q, 'met:sereth'); addFlag(q, 'ev:E1'); addFlag(q, 'ev:E5'); }
  if (n >= 3) q.fate.eren = 'alive';
  if (tiamatSlain(g)) { addFlag(q, 'slain'); q.fate.sereth = 'broken'; }
}
