/**
 * Expedition controller: relative movement on the grid, room entry, events,
 * loot, post-combat spoils and Fortune level-ups, rests, and extraction.
 */
import type { BiomeId, Difficulty, Expedition, Facing, GameState, Hero, RelDir, Room, Skill, BoonOffer, LogEntry, HandType } from '../engine/types.ts';
import { Rng, makeStreams, stream } from '../engine/rng.ts';
import { rollD20, roll } from '../engine/dice.ts';
import { ref, resolveRef, text, tx } from '../i18n/index.ts';
import { generateDungeon, tierFor, DIRS, DELTA, rollEncounter, key, parseKey } from './generator.ts';
import { BIOMES, BIOME_ORDER } from '../content/biomes.ts';
import { EVENTS, type Outcome } from '../content/events.ts';
import { MONSTERS, biomeMonsters } from '../content/monsters.ts';
import { ITEMS, itemName } from '../content/items.ts';
import { newFortuneRun, interest, endCombatTray, MAX_TOKENS } from '../fortune/tray.ts';
import { heroDice } from '../fortune/dicepath.ts';
import { makeDie, SPECIAL_BY_ID } from '../fortune/materials.ts';
import { rollBoons, rollShop, applyOffer, makeOffer, offerTitle, omenOffer, TOKENS } from '../fortune/boons.ts';
import { CHARMS, CHARM_BY_ID, newCharm } from '../fortune/charms.ts';
import { HANDS } from '../fortune/hands.ts';
import { startCombat, makeCtx, syncHeroes, hooks, heroOf, heroes as combatHeroes } from '../combat/core.ts';
import { derive, fullRestore, shortRest, spendHitDice, SKILL_NAMES } from '../rules/character.ts';
import { castableSpells, SPELLS } from '../content/spells.ts';
import { goldReward, DOUBLOONS_PER_COMBAT, DIFFICULTY_MOD, VITALITY } from '../rules/balance.ts';
import { rollItem, rollMagicItem, bossLootChoice, rollLegendary, ownedLegends, LEGEND_CHANCE } from '../meta/loot.ts';
import { makeItem } from '../rules/character.ts';
import { buildTutorialMap, TUTORIAL_SEED } from './tutorial.ts';
import { FINALE, CHAPTERS, EPILOGUE, finaleBlocked, storyOf } from '../content/story.ts';
import { onExpeditionStart, onExpeditionEnd, applyFx } from '../meta/quest.ts';
import { EVIDENCE, LEADS } from '../content/quest.ts';
import { roomName, roomText, themeText } from './roomText.ts';

export function xlog(exp: Expedition, t: string, kind?: LogEntry['kind']) {
  exp.log.push({ t, kind });
  if (exp.log.length > 120) exp.log.splice(0, exp.log.length - 120);
}

const party = (g: GameState) => g.expedition!.partyIds.map((id) => g.roster.find((h) => h.id === id)!).filter(Boolean);
const living = (g: GameState) => party(g).filter((h) => h.status === 'alive');

// ── start ───────────────────────────────────────────────────────────────────

/** Heroes at this level or higher are too seasoned for the Training Cellar. */
export const TUTORIAL_MAX_LEVEL = 4;

export interface StartOpts { partyIds: string[]; biome: BiomeId; difficulty: Difficulty; seed: string; size?: 'short' | 'normal' | 'long'; tutorial?: boolean; finale?: boolean }

export function startExpedition(g: GameState, o: StartOpts): string | null {
  if (o.partyIds.length !== 3) return tx('dungeonExplore.chooseExactlyThreeHeroes');
  const heroes = o.partyIds.map((id) => g.roster.find((h) => h.id === id));
  if (heroes.some((h) => !h || h.status !== 'alive')) return tx('dungeonExplore.onlyLivingHeroesCanJoin');
  if (heroes.some((h) => h!.pendingLevel)) return tx('dungeonExplore.finishLevelUpsFirst');
  if (o.tutorial && o.finale) return tx('dungeonExplore.pickOneTheTutorialOr');
  if (o.tutorial && heroes.some((h) => h!.level >= TUTORIAL_MAX_LEVEL)) return tx('dungeonExplore.trainingCellarTooExperienced', { level: TUTORIAL_MAX_LEVEL });
  if (o.tutorial) { o = { ...o, biome: 'cinder', difficulty: 'explorer', seed: TUTORIAL_SEED, size: 'short' }; }
  if (o.finale) {
    const blocked = finaleBlocked(heroes as Hero[], g);
    if (blocked) return blocked;
    o = { ...o, biome: 'starfall', size: 'long' };
  } else if (!o.tutorial && !g.profile.unlockedBiomes.includes(o.biome)) return tx('dungeonExplore.thatEchoIsStillSealed');
  const levels = heroes.map((h) => h!.level).sort((a, b) => a - b);
  // Effective level weights the strongest heroes but never ignores a weak link (plan §4.5).
  const partyLevel = Math.max(1, Math.round((levels[0] + levels[1] * 1.5 + levels[2] * 1.5) / 4));
  const rng = makeStreams(o.seed);
  const layout = new Rng(rng.layout);
  const map = o.tutorial ? buildTutorialMap() : generateDungeon(layout, { seed: o.seed, biome: o.biome, level: partyLevel, difficulty: o.difficulty, size: o.size });
  if (o.finale) {
    // The last stage: Tiamat replaces the echo's boss.
    const throne = map.rooms[map.bossKey];
    throne.name = FINALE.bossRoom;
    throne.text = FINALE.bossText;
    throne.encounter!.monsters[0] = 'tiamat';
  }
  const narr = new Rng(rng.narrative);
  const b = BIOMES[o.biome];
  const bossRoom = map.rooms[map.bossKey];
  const bossDef = MONSTERS[bossRoom.encounter!.monsters[0]];
  const fortuneRng = new Rng(rng.fortune);
  const fortune = newFortuneRun(fortuneRng, heroes.map((h) => h!.classId), heroes.map((h) => ({ owner: h!.id, dice: heroDice(h!) })));
  // Humans are resourceful: an extra Mulligan coin.
  if (heroes.some((h) => h!.ancestry === 'human')) fortune.tokens.push('mulligan');
  // Dice-touched gear: extra dice for the bag, starting tokens.
  for (const h of heroes) {
    const gear = derive(h!).diceGear;
    for (const id of gear.startDice) {
      const sd = SPECIAL_BY_ID[id];
      if (!sd) continue;
      const die = makeDie(fortuneRng, sd.material, sd.faces.map((f) => ({ ...f })), sd.name);
      die.owner = h!.id;
      fortune.bag.push(die);
    }
    for (const t of gear.tokens) if (fortune.tokens.length < MAX_TOKENS) fortune.tokens.push(t);
  }
  for (const h of heroes) {
    if (h!.feats.includes('lucky')) h!.resources.luck = derive(h!).pb;
    h!.history.expeditions += 1;
  }
  // The run's theme: refs into the locale files (so a saved run follows the language) plus the words now.
  const B = ['biomes', o.biome];
  const pickRef = (k: 'anomalies' | 'factions' | 'objectives' | 'hooks') => ref('game', [...B, k, b[k].indexOf(narr.pick(b[k]))]);
  const anomaly = pickRef('anomalies'), faction = pickRef('factions');
  const objective = o.finale || o.tutorial ? '' : pickRef('objectives');
  const themeRefs: NonNullable<Expedition['themeRefs']> = {
    name: o.finale ? ref('story', ['finale', 'name']) : o.tutorial ? ref('game', ['themes', 'tutorial', 'name']) : ref('game', [...B, 'name']),
    anomaly, faction,
    objective: o.finale ? ref('game', ['themes', 'finale', 'objective']) : o.tutorial ? ref('game', ['themes', 'tutorial', 'objective']) : objective,
    boss: o.finale ? ref('game', ['themes', 'finale', 'boss']) : ref('game', ['monsters', bossDef.id, 'name']),
    hook: pickRef('hooks'),
  };
  const theme = Object.fromEntries(Object.entries(themeRefs).map(([k, r]) => [k, resolveRef(r)])) as Expedition['theme'];
  const exp: Expedition = {
    seed: o.seed, biome: o.biome, difficulty: o.difficulty, tier: tierFor(partyLevel), partyLevel, partyIds: o.partyIds.slice(),
    map, pos: map.start, facing: 'N', visited: [map.start], seen: [map.start], fortune, log: [], depth: 0, status: 'active', rng,
    carriedGold: 0, carriedItems: [], keys: [], flags: {}, meter: o.biome === 'drowned' ? 1 : 0, steps: 0, shortRests: 0, longRestUsed: false,
    theme, themeRefs,
    fallen: [], bossDefeated: false, journal: [], searched: [],
  };
  if (o.tutorial) exp.tutorial = true;
  if (o.finale) exp.finale = true;
  // Carry the party's packed consumables (one stack of potions from the vault, if any).
  for (const inst of g.vault.filter((i) => ITEMS[i.defId]?.kind === 'consumable').slice(0, 6)) {
    exp.carriedItems.push(inst);
  }
  g.vault = g.vault.filter((i) => !exp.carriedItems.includes(i));
  g.expedition = exp;
  // The Queen's Due: the drink Bet poured, and maybe a lead's quest room.
  onExpeditionStart(g, exp, heroes as Hero[], MAX_TOKENS);
  revealAround(exp);
  if (o.tutorial) xlog(exp, tx('dungeonExplore.theTrainingCellarAShort'), 'info');
  else if (o.finale) xlog(exp, `${FINALE.name}: ${FINALE.premise}`, 'warn');
  else xlog(exp, tx('dungeonExplore.yourGoal', { bName: b.name, themeText: themeText(exp, 'anomaly'), themeText2: themeText(exp, 'objective') }), 'info');
  xlog(exp, tx('dungeonExplore.rumourHasItWaitsIn', { themeText: themeText(exp, 'boss') }), 'info');
  if (exp.quest?.lead) xlog(exp, tx('dungeonExplore.yourLeadIsSomewhereIn', { title: LEADS[exp.quest.lead].title }), 'warn');
  g.profile.stats.expeditions += 1;
  // Face into the dungeon.
  const start = map.rooms[map.start];
  exp.facing = (DIRS.find((d) => start.exits[d]) ?? 'N') as Facing;
  return null;
}

// ── movement ────────────────────────────────────────────────────────────────

const ROT = (f: Facing, n: number): Facing => DIRS[(DIRS.indexOf(f) + n + 4) % 4];

export function absoluteDir(exp: Expedition, rel: RelDir): Facing {
  let r = rel;
  const room = exp.map.rooms[exp.pos];
  if (exp.biome === 'mirror' && room.tags.includes('mirror')) r = rel === 'left' ? 'right' : rel === 'right' ? 'left' : rel;
  const turn = { forward: 0, right: 1, back: 2, left: 3 }[r];
  const gravity = exp.biome === 'starfall' ? exp.meter : 0;
  return ROT(exp.facing, turn + gravity);
}

export interface ExitView { rel: RelDir; dir: Facing; state: 'open' | 'locked' | 'wall' | 'hidden'; lock?: string; to?: string; visited?: boolean; label: string }

export function exitsView(g: GameState): ExitView[] {
  const exp = g.expedition!;
  const room = exp.map.rooms[exp.pos];
  return (['forward', 'left', 'right', 'back'] as RelDir[]).map((rel) => {
    const dir = absoluteDir(exp, rel);
    const e = room.exits[dir];
    if (!e || (e.hidden && !exp.searched.includes(`${room.key}:${dir}`))) return { rel, dir, state: 'wall', label: tx('dungeonExplore.wall') };
    const lockReason = doorBlocked(exp, e.lock);
    if (lockReason) return { rel, dir, state: 'locked', lock: e.lock, to: e.to, label: lockReason };
    return { rel, dir, state: 'open', to: e.to, visited: exp.visited.includes(e.to), label: exp.visited.includes(e.to) ? exp.map.rooms[e.to].name : tx('dungeonExplore.unexplored') };
  });
}

function doorBlocked(exp: Expedition, lock?: string): string | null {
  if (!lock) return null;
  if (lock === 'sigil' && !exp.keys.includes('sigil')) return tx('dungeonExplore.sealedNeedsTheBossSigil');
  if (lock === 'water' && exp.meter >= 1) return tx('dungeonExplore.floodedLowerTheWater');
  if (lock === 'mirror' && !exp.flags.mirrorOpen) return tx('dungeonExplore.aDoorThatExistsOnly');
  return null;
}

export function canAct(g: GameState): string | null {
  const exp = g.expedition;
  if (!exp || exp.status !== 'active') return tx('dungeonExplore.noActiveExpedition');
  if (exp.combat && exp.combat.status === 'active') return tx('dungeonExplore.inCombat');
  if (exp.spoils || exp.boons || exp.lootChoice) return tx('dungeonExplore.claimYourSpoilsFirst');
  if (exp.event && exp.event.stage !== 'result') return tx('dungeonExplore.resolveTheEventFirst');
  return null;
}

export function move(g: GameState, rel: RelDir): string | null {
  const err = canAct(g);
  if (err) return err;
  const exp = g.expedition!;
  const room = exp.map.rooms[exp.pos];
  const dir = absoluteDir(exp, rel);
  const e = room.exits[dir];
  if (!e || (e.hidden && !exp.searched.includes(`${room.key}:${dir}`))) return tx('dungeonExplore.aWallBlocksTheWay');
  const blocked = doorBlocked(exp, e.lock);
  if (blocked) return blocked;
  exp.event = undefined;
  exp.shop = undefined;
  exp.prev = exp.pos;
  exp.pos = e.to;
  exp.facing = dir;
  exp.steps += 1;
  if (!exp.visited.includes(e.to)) exp.visited.push(e.to);
  revealAround(exp);
  exp.flags.recentDeadClear = 1;
  biomeStep(g);
  enterRoom(g);
  return null;
}

function revealAround(exp: Expedition) {
  const room = exp.map.rooms[exp.pos];
  if (!exp.seen.includes(room.key)) exp.seen.push(room.key);
  for (const d of DIRS) {
    const e = room.exits[d];
    if (e && !e.hidden && !exp.seen.includes(e.to)) exp.seen.push(e.to);
  }
}

function biomeStep(g: GameState) {
  const exp = g.expedition!;
  const room = exp.map.rooms[exp.pos];
  const b = BIOMES[exp.biome];
  const before = exp.meter;
  switch (exp.biome) {
    case 'cinder':
      if (room.tags.includes('hot')) exp.meter = Math.min(b.meter.max, exp.meter + 1);
      if (room.tags.includes('cool')) exp.meter = 0;
      break;
    case 'rootbound':
      if (room.tags.includes('spore') || exp.steps % 3 === 0) exp.meter = Math.min(b.meter.max, exp.meter + 1);
      if (room.tags.includes('quiet')) exp.meter = 0;
      break;
    case 'mirror':
      if (room.tags.includes('mirror') && !exp.visited.slice(0, -1).includes(room.key)) exp.meter = Math.min(b.meter.max, exp.meter + 1);
      if (exp.meter >= 3 && !exp.flags.mirrorOpen) { exp.flags.mirrorOpen = 1; xlog(exp, tx('dungeonExplore.yourReflectionsStepAsideHidden'), 'loot'); }
      break;
    case 'starfall':
      if (room.tags.includes('anchor')) exp.meter = 0;
      else if (exp.steps % 4 === 0) { exp.meter = (exp.meter + 1) % 4; }
      break;
  }
  if (exp.meter !== before) {
    const arrow = exp.meter > before ? '▲' : '▼';
    xlog(exp, `${b.meter.icon} ${b.meter.name} ${arrow} ${exp.meter}`, exp.meter > before ? 'warn' : 'info');
    if (exp.biome === 'starfall' && exp.meter !== 0) xlog(exp, tx('dungeonExplore.gravityTurnsYourDirectionsRotate'), 'warn');
  }
}

function enterRoom(g: GameState) {
  const exp = g.expedition!;
  const room = exp.map.rooms[exp.pos];
  xlog(exp, `${roomName(room)}. ${roomText(room)}`);
  if (room.encounter && !room.encounter.cleared) {
    const kind = room.encounter.kind;
    if (kind === 'ambush') xlog(exp, tx('dungeonExplore.ambush'), 'warn');
    if (kind === 'boss') xlog(exp, tx('dungeonExplore.theAirThickensAwaits', { themeText: themeText(exp, 'boss') }), 'warn');
    startCombat(g, room.key, room.encounter.monsters, kind);
    return;
  }
  openRoomFeature(g, room);
}

function openRoomFeature(g: GameState, room: Room) {
  const exp = g.expedition!;
  if (room.eventId && !room.eventDone) exp.event = { roomKey: room.key, eventId: room.eventId, stage: 'choose' };
  if (room.type === 'peddler') {
    const roomShop = exp.flags[`shop:${room.key}`];
    if (!roomShop) exp.flags[`shop:${room.key}`] = 1;
    if (!exp.shop || exp.shop.roomKey !== room.key) {
      const saved = exp.shops?.[room.key];
      exp.shop = saved ?? { roomKey: room.key, offers: rollShop(stream(exp.rng, 'loot'), exp.fortune), rerollCost: 2 };
      persistShop(exp);
    }
  }
}

// ── search ──────────────────────────────────────────────────────────────────

export function bestCheck(g: GameState, skill: Skill): { hero: Hero; bonus: number } {
  let best: { hero: Hero; bonus: number } | null = null;
  for (const h of living(g)) {
    const d = derive(h);
    const b = d.skills[skill];
    if (!best || b > best.bonus) best = { hero: h, bonus: b };
  }
  return best!;
}

export function search(g: GameState): string | null {
  const err = canAct(g);
  if (err) return err;
  const exp = g.expedition!;
  const room = exp.map.rooms[exp.pos];
  const flag = `searched:${room.key}`;
  if (exp.flags[flag]) return tx('dungeonExplore.youHaveAlreadySearchedHere');
  exp.flags[flag] = 1;
  const { hero, bonus } = bestCheck(g, 'perception');
  const dc = 12 + (exp.tier === 'mythic' ? 3 : exp.tier === 'heroic' ? 2 : exp.tier === 'veteran' ? 1 : 0);
  const r = rollD20(stream(exp.rng, 'narrative')).natural;
  const total = r + bonus;
  let found = false;
  for (const d of DIRS) {
    const e = room.exits[d];
    if (e?.hidden && total >= dc) {
      exp.searched.push(`${room.key}:${d}`);
      if (e.lock === 'mirror') e.lock = undefined;
      const back = exp.map.rooms[e.to].exits[({ N: 'S', S: 'N', E: 'W', W: 'E' } as const)[d]];
      if (back) { exp.searched.push(`${e.to}:${({ N: 'S', S: 'N', E: 'W', W: 'E' } as const)[d]}`); if (back.lock === 'mirror') back.lock = undefined; }
      found = true;
    }
  }
  if (found) xlog(exp, tx('dungeonExplore.findsAHiddenPassagePerception', { heroName: hero.name, total }), 'loot');
  else if (total >= dc + 3 && stream(exp.rng, 'loot').chance(0.35)) {
    const gold = Math.round(goldReward(exp.partyLevel, 'normal') * 0.4);
    exp.carriedGold += gold;
    xlog(exp, tx('dungeonExplore.spotsALooseStoneHiding', { heroName: hero.name, gold, total }), 'loot');
  } else xlog(exp, tx('dungeonExplore.searchesCarefullyButFindsNothing', { heroName: hero.name, total }));
  return null;
}

// ── events ──────────────────────────────────────────────────────────────────

export function eventOptions(g: GameState) {
  const exp = g.expedition!;
  if (!exp.event) return [];
  const ev = EVENTS[exp.event.eventId];
  return ev.options.map((o) => {
    let usable = true;
    let reason = '';
    if (o.cost?.gold && exp.carriedGold < o.cost.gold) { usable = false; reason = tx('dungeonExplore.needsCarriedGold', { gold: o.cost.gold }); }
    if (o.cost?.doubloons && exp.fortune.doubloons < o.cost.doubloons) { usable = false; reason = tx('dungeonExplore.needsDoubloons', { doubloons: o.cost.doubloons }); }
    const spellHelper = o.spell ? spellFor(g, o.spell) : null;
    const best = o.check?.skill ? bestCheck(g, o.check.skill) : null;
    const dc = o.check ? o.check.dc + tierDc(exp) : 0;
    return { ...o, usable, reason, spellHelper, best, dc };
  });
}

function tierDc(exp: Expedition) {
  return exp.tier === 'mythic' ? 6 : exp.tier === 'heroic' ? 4 : exp.tier === 'veteran' ? 2 : 0;
}

function spellFor(g: GameState, tag: string): { hero: Hero; spell: string } | null {
  for (const h of living(g)) {
    for (const s of castableSpells(h)) {
      if (s.explore !== tag) continue;
      if (s.level === 0) return { hero: h, spell: s.id };
      if (h.slots.some((n, i) => i >= s.level && n > 0)) return { hero: h, spell: s.id };
    }
    if (tag === 'unlock' && Object.values(h.equipment).some((i) => i && ITEMS[i.defId]?.tool === 'thieves') && h.classId === 'rogue') return { hero: h, spell: 'thievesTools' };
  }
  return null;
}

export function chooseEvent(g: GameState, idx: number, useSpell = false): string | null {
  const exp = g.expedition!;
  if (!exp.event || exp.event.stage !== 'choose') return tx('dungeonExplore.noEvent');
  const opts = eventOptions(g);
  const o = opts[idx];
  if (!o) return tx('dungeonExplore.invalidChoice');
  if (!o.usable) return o.reason;
  if (o.cost?.gold) exp.carriedGold -= o.cost.gold;
  if (o.cost?.doubloons) exp.fortune.doubloons -= o.cost.doubloons;
  const lines: string[] = [];
  let success = true;
  if (o.check) {
    if (useSpell && o.spellHelper) {
      const sp = o.spellHelper.spell;
      if (SPELLS[sp] && SPELLS[sp].level > 0) {
        const h = o.spellHelper.hero;
        const lvl = h.slots.findIndex((n, i) => i >= SPELLS[sp].level && n > 0);
        if (lvl > 0) h.slots[lvl] -= 1;
      }
      lines.push(tx('dungeonExplore.usesAutomaticSuccess', { heroName: o.spellHelper.hero.name, means: SPELLS[sp]?.name ?? tx('dungeonExplore.thievesTools') }));
    } else {
      const rng = stream(exp.rng, 'narrative');
      const skill = o.check.skill!;
      const { hero, bonus } = bestCheck(g, skill);
      let r = rollD20(rng).natural;
      const d = derive(hero);
      if (hero.classId === 'rogue' && hero.level >= 7 && hero.skillProfs.includes(skill) && r < 10) r = 10;
      if (exp.flags.guidance) { r += roll(rng, '1d4').total; delete exp.flags.guidance; }
      const total = r + bonus;
      success = total >= o.dc;
      void d;
      lines.push(tx('dungeonExplore.triesVsDc', { heroName: hero.name, SKILL_NAMES: SKILL_NAMES[skill], total, dc: o.dc, result: tx(success ? 'dungeonExplore.successResult' : 'dungeonExplore.failureResult') }));
    }
  }
  const outcomes = success ? o.success : o.failure ?? [];
  for (const out of outcomes) {
    const t = applyOutcome(g, out);
    if (t) lines.push(t);
    if (g.expedition!.combat?.status === 'active') break;
  }
  const room = exp.map.rooms[exp.event.roomKey];
  room.eventDone = true;
  if (exp.event.stage === 'choose') exp.event.stage = 'result';
  exp.event.result = lines;
  for (const l of lines) xlog(exp, l, 'info');
  return null;
}

function applyOutcome(g: GameState, o: Outcome): string | null {
  const exp = g.expedition!;
  const loot = stream(exp.rng, 'loot');
  const L = exp.partyLevel;
  switch (o.type) {
    case 'text': return o.leadOpen ? `${o.t} ${text('story', ['leadOpen'])}` : o.t;
    case 'gold': { const n = Math.round(goldReward(L, 'normal') * (0.8 + loot.next()) * o.amount); exp.carriedGold += n; return tx('dungeonExplore.gold', { n }); }
    case 'doubloons': exp.fortune.doubloons += o.n; return tx('dungeonExplore.doubloons', { n: o.n });
    case 'item': { const it = rollItem(loot, L, exp.biome, { boost: o.tier }); exp.carriedItems.push(it); return tx('dungeonExplore.found', { itemName: itemName(it) }); }
    case 'heal': for (const h of living(g)) h.hp = Math.min(derive(h).maxHp, h.hp + Math.round(derive(h).maxHp * o.pct)); return tx('dungeonExplore.thePartyRecoversHp', { v: Math.round(o.pct * 100) });
    case 'damage': {
      const victims = o.who === 'party' ? living(g) : [loot.pick(living(g))];
      for (const h of victims) h.hp = Math.max(1, h.hp - Math.round(derive(h).maxHp * o.pct));
      return o.who === 'party' ? tx('dungeonExplore.thePartyIsHurt') : tx('dungeonExplore.isHurt', { name: victims[0].name });
    }
    case 'quest': {
      const notes = applyFx(g, o.fx);
      const found = notes.filter((n) => n.startsWith('ev:')).map((n) => EVIDENCE[n.slice(3)]?.name).filter(Boolean);
      if (found.length) { exp.flags.questFound = (exp.flags.questFound ?? 0) + found.length; return tx('dungeonExplore.evidence', { found: found.join(', ') }); }
      return null;
    }
    case 'combat': {
      const room = exp.map.rooms[exp.pos];
      const mons = rollEncounter(stream(exp.rng, 'encounter'), exp.biome, L, o.elite ? 'elite' : 'normal', exp.difficulty);
      // The Dragon's Choir sends its own: one foe becomes a cultist.
      if (o.cultist && MONSTERS[o.cultist]) mons[mons.length - 1] = o.cultist;
      if (o.onWin) exp.quest = { ...exp.quest, onWin: o.onWin };
      room.encounter = { monsters: mons, kind: o.elite ? 'elite' : 'normal', cleared: false };
      startCombat(g, room.key, mons, o.elite ? 'elite' : 'normal');
      return 'Combat!';
    }
    case 'meter': {
      const b = BIOMES[exp.biome];
      if (o.set !== undefined) {
        if (exp.biome === 'drowned') { exp.meter = exp.meter >= 1 ? 0 : 1; return exp.meter ? tx('dungeonExplore.theWaterRises') : tx('dungeonExplore.theWaterDrainsAwayFlooded'); }
        exp.meter = o.set;
      } else exp.meter = Math.max(0, Math.min(b.meter.max, exp.meter + o.delta));
      return `${b.meter.icon} ${b.meter.name}: ${exp.meter}.`;
    }
    case 'reveal': {
      for (const k of exp.map.criticalPath) if (!exp.seen.includes(k)) exp.seen.push(k);
      return tx('dungeonExplore.thePathToTheBoss');
    }
    case 'key':
      if (!exp.keys.includes('sigil')) exp.keys.push('sigil');
      return tx('dungeonExplore.youHoldTheBossSigil');
    case 'omen':
      return grantOmen(exp, loot.pick(HANDS.slice(1, 8)).id);
    case 'die': {
      const o2 = makeOffer(loot, exp.fortune, 'die', new Set());
      if (o2?.die) { exp.fortune.bag.push(o2.die); return tx('dungeonExplore.joinsYourDiceBag', { dieName: o2.die.name }); }
      return null;
    }
    case 'token': {
      const id = o.id ?? loot.pick(Object.keys(TOKENS));
      if (exp.fortune.tokens.length >= 3) return tx('dungeonExplore.yourTokenPouchIsFull');
      exp.fortune.tokens.push(id);
      return tx('dungeonExplore.gainedA', { name: TOKENS[id].name });
    }
    case 'charm': {
      const pool = CHARMS.filter((c) => (!o.rarity || c.rarity === o.rarity) && !exp.fortune.charms.some((x) => x.id === c.id));
      const c = loot.pick(pool.length ? pool : CHARMS);
      exp.boons = { offers: [{ kind: 'charm', id: c.id }], source: 'event', picks: 1 };
      return tx('dungeonExplore.aCharm', { cName: c.name });
    }
    case 'boons':
      exp.boons = { offers: rollBoons(loot, exp.fortune, o.source), source: o.source, picks: 1 };
      return tx('dungeonExplore.fortuneSmilesChooseABoon');
    case 'resources':
      for (const h of living(g)) shortRest(h);
      return tx('dungeonExplore.thePartyFeelsRefreshed');
    case 'condition':
      for (const h of living(g)) exp.flags[`${o.id}:${h.id}`] = 1;
      return o.id === 'blessed' ? tx('dungeonExplore.thePartyFeelsBlessedNext') : o.id === 'poisoned' ? tx('dungeonExplore.thePartyFeelsSickNext') : tx('dungeonExplore.dreadFollowsYouNextFight');
    case 'wheel': return spinWheel(g);
    case 'gamble': {
      const a = roll(loot, '1d6').total, b = roll(loot, '1d6').total;
      if (a > b) { exp.fortune.doubloons += 10; return tx('dungeonExplore.youRollTheGhostRolls', { a, b }); }
      if (a === b) { exp.fortune.doubloons += 5; return tx('dungeonExplore.youBothRollYourWager', { a }); }
      return tx('dungeonExplore.youRollTheGhostRolls2', { a, b });
    }
    case 'sacrifice':
      exp.event!.stage = 'pickDie';
      return tx('dungeonExplore.chooseADieToGive');
  }
  return null;
}

/** An omen from an event: straight into a free charm slot, or offered as a boon so the player can pick what to replace. */
function grantOmen(exp: Expedition, hand: HandType): string {
  const offer = { ...omenOffer(hand), price: undefined };
  const r = applyOffer(exp.fortune, offer);
  if (r.ok) return r.text;
  exp.boons = { offers: [offer], source: 'event', picks: 1 };
  return tx('dungeonExplore.appearsButYourCharmSlots', { offerTitle: offerTitle(offer) });
}

function spinWheel(g: GameState): string {
  const exp = g.expedition!;
  const loot = stream(exp.rng, 'loot');
  const r = loot.next();
  if (r < 0.28) { exp.fortune.doubloons += 8; return tx('dungeonExplore.theWheelLandsOnThe'); }
  if (r < 0.48) { applyOutcome(g, { type: 'charm', rarity: loot.chance(0.3) ? 'rare' : 'uncommon' }); return tx('dungeonExplore.theCrownACharmAppears'); }
  if (r < 0.63) return tx('dungeonExplore.theStar', { applyOutcome: applyOutcome(g, { type: 'omen' }) });
  if (r < 0.75) return tx('dungeonExplore.theDie', { applyOutcome: applyOutcome(g, { type: 'die' }) });
  if (r < 0.85) { applyOutcome(g, { type: 'heal', pct: 0.4 }); return tx('dungeonExplore.theHeartThePartyIs'); }
  if (r < 0.96) { applyOutcome(g, { type: 'damage', pct: 0.15, who: 'party' }); return tx('dungeonExplore.theSkullACurseLashes'); }
  applyOutcome(g, { type: 'charm', rarity: 'legendary' });
  return tx('dungeonExplore.jackpotALegendaryCharm');
}

export function sacrificeDie(g: GameState, dieUid: string): string | null {
  const exp = g.expedition!;
  if (exp.event?.stage !== 'pickDie') return tx('dungeonExplore.nothingToSacrificeTo');
  if (exp.fortune.bag.length <= 8) return tx('dungeonExplore.yourBagMustKeepAt');
  const die = exp.fortune.bag.find((d) => d.uid === dieUid);
  if (!die) return tx('dungeonExplore.pickADie');
  exp.fortune.bag = exp.fortune.bag.filter((d) => d.uid !== dieUid);
  const fav = (Object.entries(exp.fortune.handsPlayed).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? 'pair') as HandType;
  exp.fortune.doubloons += 2;
  exp.event.stage = 'result';
  exp.event.result = [`The altar accepts your ${die.name ?? die.material + ' die'}. An omen for your favourite hand rises from the smoke, and 2 doubloons glint in the bowl.`, grantOmen(exp, fav)];
  return null;
}

export function closeEvent(g: GameState) {
  const exp = g.expedition!;
  if (exp.event?.stage === 'result') exp.event = undefined;
  else if (exp.event?.stage === 'choose') { exp.map.rooms[exp.event.roomKey].eventDone = false; exp.event = undefined; }
}

export function reopenEvent(g: GameState): string | null {
  const exp = g.expedition!;
  const room = exp.map.rooms[exp.pos];
  if (!room.eventId || room.eventDone) return tx('dungeonExplore.nothingHere');
  exp.event = { roomKey: room.key, eventId: room.eventId, stage: 'choose' };
  return null;
}

// ── treasure ────────────────────────────────────────────────────────────────

export function takeLoot(g: GameState): string | null {
  const err = canAct(g);
  if (err) return err;
  const exp = g.expedition!;
  const room = exp.map.rooms[exp.pos];
  if (!room.loot || room.loot.taken) return tx('dungeonExplore.nothingToTake');
  if (room.encounter && !room.encounter.cleared) return tx('dungeonExplore.defeatTheGuardiansFirst');
  const loot = stream(exp.rng, 'loot');
  room.loot.taken = true;
  if (room.loot.gold) {
    const n = Math.round(goldReward(exp.partyLevel, 'elite') * (0.7 + loot.next() * 0.6) * DIFFICULTY_MOD[exp.difficulty].gold);
    exp.carriedGold += n;
    xlog(exp, tx('dungeonExplore.gold', { n }), 'loot');
  }
  for (const _ of room.loot.items) {
    const it = rollItem(loot, exp.partyLevel, exp.biome, { boost: (room.secret ? 1 : 0) + DIFFICULTY_MOD[exp.difficulty].rank });
    exp.carriedItems.push(it);
    xlog(exp, tx('dungeonExplore.found2', { itemName: itemName(it) }), 'loot');
  }
  if (!exp.tutorial && loot.chance(room.secret ? LEGEND_CHANCE.secret : LEGEND_CHANCE.treasure)) {
    const lg = rollLegendary(loot, exp.partyLevel, ownedLegends(g));
    if (lg) { exp.carriedItems.push(lg); xlog(exp, tx('dungeonExplore.aLegendLiesInThe', { itemName: itemName(lg) }), 'loot'); }
  }
  if (room.loot.charm) exp.boons = { offers: rollBoons(loot, exp.fortune, 'treasure'), source: 'treasure', picks: 1 };
  return null;
}

// ── combat outcomes ─────────────────────────────────────────────────────────

hooks.victory = (ctx) => {
  // Spoils are computed when the player continues, so the victory frame shows first.
  void ctx;
};

/** Called after a combat command; resolves victory/defeat/flee transitions. */
export function afterCombat(g: GameState) {
  const exp = g.expedition!;
  const combat = exp.combat;
  if (!combat) return;
  const ctx = makeCtx(g);
  syncHeroes(ctx);
  if (combat.status === 'victory' && !combat.rewarded) {
    combat.rewarded = true;
    grantSpoils(g);
    // The Queen's Due: a quest fight pays out only when it's won.
    if (exp.quest?.onWin) {
      const found = applyFx(g, exp.quest.onWin).filter((n) => n.startsWith('ev:')).map((n) => EVIDENCE[n.slice(3)]?.name).filter(Boolean);
      exp.quest.onWin = undefined;
      for (const f of found) { xlog(exp, tx('dungeonExplore.evidence2', { f }), 'info'); exp.spoils?.items.push(`📜 ${f}`); }
      xlog(exp, tx('dungeonExplore.theWayIsClearYou'), 'info');
    }
  }
  if ((combat.status === 'defeat' || combat.status === 'fled') && exp.quest?.onWin) exp.quest.onWin = undefined;
  if (combat.status === 'defeat') {
    endCombatTray(exp.fortune);
    if (g.mode === 'story' || exp.tutorial) {
      for (const h of party(g)) if (h.status === 'alive' || combat.diedThisFight.includes(h.id)) { h.status = 'alive'; h.hp = 1; }
      exp.carriedGold = 0;
      exp.carriedItems = [];
      xlog(exp, exp.tutorial ? tx('dungeonExplore.theKeepSTrainersDrag') : tx('dungeonExplore.storyModeTheKeepS'), 'warn');
      finishExpedition(g, 'wiped');
    } else {
      for (const h of party(g)) if (h.status === 'alive') { h.status = 'dead'; h.history.deathCause = `fell in ${BIOMES[exp.biome].name}`; }
      finishExpedition(g, 'wiped');
    }
    return;
  }
  if (combat.status === 'fled') {
    endCombatTray(exp.fortune);
    exp.combat = undefined;
    if (exp.prev) { exp.pos = exp.prev; xlog(exp, tx('dungeonExplore.youRetreatToThePrevious'), 'warn'); }
  }
}

function grantSpoils(g: GameState) {
  const exp = g.expedition!;
  const combat = exp.combat!;
  const loot = stream(exp.rng, 'loot');
  const room = exp.map.rooms[combat.roomKey];
  if (room.encounter) room.encounter.cleared = true;
  const kind = combat.kind;
  const gold = Math.round(goldReward(exp.partyLevel, kind) * DIFFICULTY_MOD[exp.difficulty].gold * (0.85 + loot.next() * 0.3));
  exp.carriedGold += gold;
  const intr = interest(exp.fortune);
  let charmBonus = 0;
  for (const ch of exp.fortune.charms) {
    const v = CHARM_BY_ID[ch.id]?.onCombatEnd?.(ch, exp.fortune);
    if (typeof v === 'number') charmBonus += v;
    if (ch.id === 'avalanche' && combat.diedThisFight.length === 0 && !combatHeroes(makeCtx(g)).some((h) => h.downed)) ch.counter = Math.round((ch.counter + 0.25) * 100) / 100;
  }
  const base = DOUBLOONS_PER_COMBAT[kind];
  exp.fortune.doubloons += base + intr + charmBonus;
  const items: string[] = [];
  const dropChance = kind === 'elite' ? 0.75 : kind === 'boss' ? 0 : 0.28;
  if (loot.chance(dropChance)) {
    const it = rollItem(loot, exp.partyLevel, exp.biome, { boost: (kind === 'elite' ? 1 : 0) + DIFFICULTY_MOD[exp.difficulty].rank });
    exp.carriedItems.push(it);
    items.push(itemName(it));
  }
  if (kind === 'elite' && !exp.tutorial && loot.chance(LEGEND_CHANCE.elite)) {
    const lg = rollLegendary(loot, exp.partyLevel, ownedLegends(g));
    if (lg) { exp.carriedItems.push(lg); items.push(`✦ ${itemName(lg)}`); xlog(exp, tx('dungeonExplore.theEliteCarriedALegend', { itemName: itemName(lg) }), 'loot'); }
  }
  exp.depth += 1;
  exp.fortune.rank += 1;
  // Downed heroes get up; stabilise the unconscious.
  const ctx = makeCtx(g);
  for (const c of combatHeroes(ctx)) {
    const h = heroOf(ctx, c)!;
    if (h.status === 'alive' && (c.downed || c.hp <= 0)) { h.hp = 1; }
  }
  for (const id of combat.diedThisFight) if (!exp.fallen.includes(id)) exp.fallen.push(id);
  exp.spoils = { gold, doubloons: base, interest: intr, items, kind, rank: exp.fortune.rank, charmBonus };
  // Beating the boss ends the run's fortune (it only lasts one expedition), so boons would be wasted.
  if (kind !== 'boss') exp.boons = { offers: rollBoons(loot, exp.fortune, kind === 'elite' ? 'elite' : 'normal'), source: kind, picks: 1 };
  if (kind === 'boss') {
    exp.flags.bossRounds = combat.round;
    exp.bossDefeated = true;
    const rank = exp.tutorial ? 0 : DIFFICULTY_MOD[exp.difficulty].rank;
    exp.lootChoice = { items: bossLootChoice(loot, exp.partyLevel, exp.biome, rank) };
    // Boss hoards are where legends turn up: one of the three may be one-of-a-kind.
    if (!exp.tutorial && loot.chance(LEGEND_CHANCE.boss + LEGEND_CHANCE.bossPerRank * rank)) {
      const lg = rollLegendary(loot, exp.partyLevel, ownedLegends(g));
      if (lg) exp.lootChoice.items.splice(Math.max(0, exp.lootChoice.items.length - 1), 1, lg);
    }
    // Harder runs pay out: one bonus magic item per difficulty step above Standard.
    for (let i = 0; i < rank; i++) {
      const it = rollMagicItem(loot, exp.partyLevel, exp.biome, rank);
      exp.carriedItems.push(it);
      items.push(`✦ ${itemName(it)}`);
      xlog(exp, tx('dungeonExplore.bonusForBravingAEcho', { difficulty: exp.difficulty, itemName: itemName(it) }), 'loot');
    }
    xlog(exp, tx('dungeonExplore.isDefeatedTheEchoBegins', { themeText: themeText(exp, 'boss') }), 'loot');
  }
  endCombatTray(exp.fortune);
}

/** Close the victory/spoils screen. */
export function closeSpoils(g: GameState) {
  const exp = g.expedition!;
  exp.spoils = undefined;
  if (exp.combat && exp.combat.status !== 'active') exp.combat = undefined;
  // Room treasure follows its guardians.
  const room = exp.map.rooms[exp.pos];
  if (room.type === 'elite' && room.loot && !room.loot.taken) room.loot.taken = true;
  if (room.eventId && !room.eventDone && !exp.boons) openRoomFeature(g, room);
}

export function pickBoon(g: GameState, idx: number, target?: { dieUid?: string; face?: number; replaceCharm?: number }): string | null {
  const exp = g.expedition!;
  if (!exp.boons) return tx('dungeonExplore.noBoonsToPick');
  const o = exp.boons.offers[idx];
  if (!o || o.sold) return tx('dungeonExplore.invalidBoon');
  const r = applyOffer(exp.fortune, o, target);
  if (!r.ok) return r.reason;
  if (o.kind === 'charm' && !g.profile.codex.charms.includes(o.id)) g.profile.codex.charms.push(o.id);
  xlog(exp, r.text, 'fortune');
  o.sold = true;
  exp.boons.picks -= 1;
  if (exp.boons.picks <= 0) finishBoons(g);
  return null;
}

export function skipBoon(g: GameState): string | null {
  const exp = g.expedition!;
  if (!exp.boons) return null;
  exp.fortune.doubloons += 2;
  xlog(exp, tx('dungeonExplore.youSkipTheBoonAnd'), 'fortune');
  finishBoons(g);
  return null;
}

function finishBoons(g: GameState) {
  const exp = g.expedition!;
  exp.boons = undefined;
  const room = exp.map.rooms[exp.pos];
  if (room.eventId && !room.eventDone && !exp.event && !exp.spoils) openRoomFeature(g, room);
}

export function pickLoot(g: GameState, idx: number): string | null {
  const exp = g.expedition!;
  if (!exp.lootChoice) return tx('dungeonExplore.nothingToChoose');
  const it = exp.lootChoice.items[idx];
  if (!it) return tx('dungeonExplore.invalidChoice2');
  exp.carriedItems.push(it);
  xlog(exp, tx('dungeonExplore.youClaim', { itemName: itemName(it) }), 'loot');
  exp.lootChoice = undefined;
  return null;
}

// ── peddler ─────────────────────────────────────────────────────────────────

export function shopBuy(g: GameState, idx: number, target?: { dieUid?: string; face?: number; replaceCharm?: number }): string | null {
  const exp = g.expedition!;
  const shop = exp.shop;
  if (!shop) return tx('dungeonExplore.noShopHere');
  const o = shop.offers[idx];
  if (!o || o.sold) return tx('dungeonExplore.soldOut');
  if ((o.price ?? 0) > exp.fortune.doubloons) return tx('dungeonExplore.notEnoughDoubloons');
  const r = applyOffer(exp.fortune, o, target);
  if (!r.ok) return r.reason;
  exp.fortune.doubloons -= o.price ?? 0;
  o.sold = true;
  if (o.kind === 'charm' && !g.profile.codex.charms.includes(o.id)) g.profile.codex.charms.push(o.id);
  xlog(exp, tx('dungeonExplore.bought', { offerTitle: offerTitle(o), rText: r.text }), 'fortune');
  persistShop(exp);
  return null;
}

export function shopReroll(g: GameState): string | null {
  const exp = g.expedition!;
  const shop = exp.shop;
  if (!shop) return tx('dungeonExplore.noShopHere');
  if (exp.fortune.doubloons < shop.rerollCost) return tx('dungeonExplore.notEnoughDoubloons');
  exp.fortune.doubloons -= shop.rerollCost;
  shop.offers = rollShop(stream(exp.rng, 'loot'), exp.fortune);
  shop.rerollCost += 1;
  persistShop(exp);
  return null;
}

/** Sell a charm for half its price. */
export function sellCharm(g: GameState, idx: number): string | null {
  const exp = g.expedition!;
  const ch = exp.fortune.charms[idx];
  if (!ch) return tx('dungeonExplore.noSuchCharm');
  const def = CHARM_BY_ID[ch.id];
  const value = Math.max(1, Math.floor(({ common: 4, uncommon: 6, rare: 8, legendary: 12 }[def.rarity]) / 2));
  exp.fortune.charms.splice(idx, 1);
  exp.fortune.doubloons += value;
  xlog(exp, tx('dungeonExplore.soldForDoubloons', { defName: def.name, value }), 'fortune');
  return null;
}

export function moveCharm(g: GameState, from: number, to: number): string | null {
  const run = g.expedition!.fortune;
  if (from < 0 || from >= run.charms.length || to < 0 || to >= run.charms.length) return null;
  const [c] = run.charms.splice(from, 1);
  run.charms.splice(to, 0, c);
  return null;
}

function persistShop(exp: Expedition) {
  exp.shops = exp.shops ?? {};
  if (exp.shop) exp.shops[exp.shop.roomKey] = exp.shop;
}

// ── rest & items ────────────────────────────────────────────────────────────

export function rest(g: GameState, kind: 'short' | 'long'): string | null {
  const err = canAct(g);
  if (err) return err;
  const exp = g.expedition!;
  const room = exp.map.rooms[exp.pos];
  const supplies = exp.carriedItems.findIndex((i) => i.defId === 'campSupplies');
  if (room.type !== 'camp' && !(kind === 'short' && supplies >= 0)) return tx('dungeonExplore.youCanOnlyRestAt');
  if (room.encounter && !room.encounter.cleared) return tx('dungeonExplore.notWhileEnemiesRemain');
  const flag = `rested:${room.key}`;
  if (kind === 'short') {
    if (room.type === 'camp' && exp.flags[flag]) {
      if (supplies < 0) return tx('dungeonExplore.youHaveAlreadyRestedHere');
    }
    if (room.type !== 'camp' || exp.flags[flag]) {
      const s = exp.carriedItems[supplies];
      if ((s.qty ?? 1) > 1) s.qty! -= 1; else exp.carriedItems.splice(supplies, 1);
    }
    exp.flags[flag] = 1;
    const rng = stream(exp.rng, 'narrative');
    for (const h of living(g)) {
      const d = derive(h);
      const need = Math.ceil((d.maxHp - h.hp) / (VITALITY * (h.level ? 6 : 6)));
      spendHitDice(h, rng, Math.min(h.hitDice, Math.max(0, need)));
      shortRest(h);
      // Wizard Arcane Recovery / Druid Natural Recovery.
      if ((h.classId === 'wizard' && (h.resources.arcaneRecovery ?? 0) > 0) || (d.features.has('naturalRecovery') && !exp.flags[`natrec:${h.id}`])) {
        if (h.classId === 'wizard') h.resources.arcaneRecovery -= 1; else exp.flags[`natrec:${h.id}`] = 1;
        let budget = Math.ceil(h.level / 2);
        const max = d.slots;
        for (let l = Math.min(5, 9); l >= 1 && budget > 0; l--) {
          while (budget >= l && h.slots[l] < max[l]) { h.slots[l] += 1; budget -= l; }
        }
        xlog(exp, tx('dungeonExplore.recoversSpellSlots', { hName: h.name }), 'heal');
      }
      if (Object.values(h.equipment).some((i) => i?.defId === 'pearlPower') && !exp.flags[`pearl:${h.id}`]) {
        exp.flags[`pearl:${h.id}`] = 1;
        for (let l = 3; l >= 1; l--) if (h.slots[l] < d.slots[l]) { h.slots[l] += 1; break; }
      }
    }
    exp.shortRests += 1;
    xlog(exp, tx('dungeonExplore.thePartyTakesAShort'), 'heal');
    return null;
  }
  if (exp.longRestUsed) return tx('dungeonExplore.youHaveAlreadyTakenA');
  if (room.type !== 'camp') return tx('dungeonExplore.longRestsNeedACamp');
  exp.longRestUsed = true;
  for (const h of living(g)) fullRestore(h);
  exp.depth += 1;
  xlog(exp, tx('dungeonExplore.thePartySleepsFullyRestored'), 'warn');
  return null;
}

export function useItemExplore(g: GameState, uid: string, heroId: string): string | null {
  const err = canAct(g);
  if (err) return err;
  const exp = g.expedition!;
  const idx = exp.carriedItems.findIndex((i) => i.uid === uid);
  if (idx < 0) return tx('dungeonExplore.noSuchItem');
  const inst = exp.carriedItems[idx];
  const def = ITEMS[inst.defId];
  const target = g.roster.find((h) => h.id === heroId);
  if (!def.consumable?.explore || !target) return tx('dungeonExplore.cannotUseThatHere');
  const consume = () => { if ((inst.qty ?? 1) > 1) inst.qty! -= 1; else exp.carriedItems.splice(idx, 1); };
  const rng = stream(exp.rng, 'narrative');
  const d = derive(target);
  switch (def.consumable.effect) {
    case 'heal': case 'scroll': {
      if (target.status !== 'alive') return tx('dungeonExplore.theyAreBeyondPotions');
      let amt: number;
      if (def.consumable.effect === 'scroll') amt = (roll(rng, '2d8').total + 3) * VITALITY;
      else amt = roll(rng, def.consumable.dice!).total * VITALITY;
      target.hp = Math.min(d.maxHp, Math.round(target.hp + amt));
      consume();
      xlog(exp, tx('dungeonExplore.uses', { targetName: target.name, defName: def.name }), 'heal');
      return null;
    }
    case 'elixir': case 'cleanse':
      target.hp = Math.min(d.maxHp, target.hp + Math.round(d.maxHp * 0.25));
      consume();
      return null;
    case 'camp':
      return rest(g, 'short');
    case 'revive': {
      if (target.status !== 'dead' || !exp.partyIds.includes(target.id)) return tx('dungeonExplore.chooseAFallenPartyMember');
      if (exp.map.rooms[exp.pos].type !== 'camp') return tx('dungeonExplore.revivalRitesNeedACamp');
      target.status = 'alive';
      target.hp = 1;
      delete target.history.deathCause;
      consume();
      xlog(exp, tx('dungeonExplore.drawsBreathAgain', { targetName: target.name }), 'heal');
      return null;
    }
  }
  return tx('dungeonExplore.nothingHappens');
}

export function castExplore(g: GameState, casterId: string, spellId: string, targetId?: string): string | null {
  const err = canAct(g);
  if (err) return err;
  const exp = g.expedition!;
  const h = g.roster.find((x) => x.id === casterId);
  const s = SPELLS[spellId];
  if (!h || !s || h.status !== 'alive') return tx('dungeonExplore.invalidCaster');
  if (!castableSpells(h).some((x) => x.id === spellId)) return tx('dungeonExplore.notPrepared');
  const lvl = s.level === 0 ? 0 : h.slots.findIndex((n, i) => i >= s.level && n > 0);
  if (s.level > 0 && lvl < 1) return tx('dungeonExplore.noSlots');
  const d = derive(h);
  const m = d.spellAbility ? d.mods[d.spellAbility] : 0;
  const rng = stream(exp.rng, 'narrative');
  const target = targetId ? g.roster.find((x) => x.id === targetId) : undefined;
  const pay = () => { if (s.level > 0) h.slots[lvl] -= 1; };
  switch (s.explore) {
    case 'heal': {
      if (!target || target.status !== 'alive') return tx('dungeonExplore.pickALivingAlly');
      const amt = (roll(rng, upcast(s, lvl)).total + m + (d.features.has('discipleOfLife') ? 2 + lvl : 0)) * VITALITY;
      target.hp = Math.min(derive(target).maxHp, Math.round(target.hp + amt));
      pay();
      xlog(exp, tx('dungeonExplore.castsOn', { hName: h.name, sName: s.name, targetName: target.name }), 'heal');
      return null;
    }
    case 'partyHeal': {
      for (const x of living(g)) x.hp = Math.min(derive(x).maxHp, Math.round(x.hp + (roll(rng, upcast(s, lvl)).total + m) * VITALITY));
      pay();
      xlog(exp, tx('dungeonExplore.castsThePartyIsHealed', { hName: h.name, sName: s.name }), 'heal');
      return null;
    }
    case 'revive': {
      if (!target || target.status !== 'dead' || !exp.partyIds.includes(target.id)) return tx('dungeonExplore.pickAFallenPartyMember');
      const cost = s.id === 'revivify' ? 300 : s.id === 'raiseDead' ? 500 : 1000;
      if (s.id === 'revivify' && !exp.flags[`recent:${target.id}`] && !exp.fallen.includes(target.id)) return tx('dungeonExplore.tooLongDeadForRevivify');
      if (s.id !== 'revivify' && exp.map.rooms[exp.pos].type !== 'camp') return tx('dungeonExplore.thisRiteNeedsACamp');
      if (exp.carriedGold < cost) return tx('dungeonExplore.needsCarriedGoldForComponents', { cost });
      exp.carriedGold -= cost;
      target.status = 'alive';
      target.hp = s.id === 'trueResurrection' ? derive(target).maxHp : 1;
      delete target.history.deathCause;
      exp.fallen = exp.fallen.filter((x) => x !== target.id);
      pay();
      xlog(exp, tx('dungeonExplore.castsReturnsToLife', { hName: h.name, sName: s.name, targetName: target.name }), 'heal');
      return null;
    }
    case 'light': case 'guidance':
      exp.flags.guidance = 1;
      xlog(exp, tx('dungeonExplore.casts1d4OnTheNext', { hName: h.name, sName: s.name }), 'info');
      return null;
    case 'aid': {
      pay();
      for (const x of living(g)) x.hp = Math.min(derive(x).maxHp, x.hp + Math.round(5 * lvl * VITALITY));
      xlog(exp, tx('dungeonExplore.castsAid', { hName: h.name }), 'heal');
      return null;
    }
  }
  return tx('dungeonExplore.thatSpellHasNoUse');
}

function upcast(s: { dice?: string; upcast?: string; level: number }, lvl: number): string {
  if (!s.dice) return '0';
  const base = /^(\d+)d(\d+)$/.exec(s.dice);
  const up = s.upcast ? /^(\d+)d(\d+)$/.exec(s.upcast) : null;
  if (base && up && base[2] === up[2]) return `${Number(base[1]) + Number(up[1]) * Math.max(0, lvl - s.level)}d${base[2]}`;
  return s.dice;
}

// ── leaving ─────────────────────────────────────────────────────────────────

export function retreat(g: GameState): string | null {
  const err = canAct(g);
  if (err) return err;
  const exp = g.expedition!;
  if (exp.pos !== exp.map.start) return tx('dungeonExplore.youCanOnlyRetreatFrom');
  finishExpedition(g, 'retreated');
  return null;
}

export function exitDungeon(g: GameState): string | null {
  const err = canAct(g);
  if (err) return err;
  const exp = g.expedition!;
  if (!exp.bossDefeated) return tx('dungeonExplore.theBossStillStands');
  finishExpedition(g, 'won');
  return null;
}

export function finishExpedition(g: GameState, kind: 'won' | 'retreated' | 'wiped') {
  const exp = g.expedition!;
  exp.status = kind;
  const result: NonNullable<GameState['lastResult']> = { kind, gold: 0, items: [] as string[], fallen: [] as string[], leveled: [] as string[], biome: exp.biome, score: exp.fortune.bestScore, fights: exp.fortune.rank, rank: exp.fortune.rank, charms: exp.fortune.charms.map((c) => c.id), bossRounds: exp.flags.bossRounds ?? 0 };
  if (exp.tutorial) result.tutorial = true;
  if (exp.finale) result.finale = true;
  const members = party(g);
  if (kind === 'won' || kind === 'retreated') {
    const gold = kind === 'won' ? exp.carriedGold : Math.floor(exp.carriedGold * 0.5);
    g.profile.bankedGold += gold;
    result.gold = gold;
    for (const it of exp.carriedItems) { g.vault.push(it); result.items.push(itemName(it)); }
  }
  for (const h of members) {
    if (h.status === 'dead') { result.fallen.push(h.name); continue; }
    if (kind === 'won') {
      h.history.clears += 1;
      // The practice cellar only takes a fresh hero from level 1 to 2 (replaying the tour is no XP farm).
      if (h.level < 20 && (!exp.tutorial || h.level === 1)) { h.pendingLevel = true; result.leveled.push(h.name); }
    }
    // Everyone comes home rested.
    fullRestore(h);
  }
  // Fallen heroes' gear: recovered when the party extracts their bodies.
  for (const h of members.filter((x) => x.status === 'dead')) {
    if (kind !== 'wiped') {
      for (const slot of Object.keys(h.equipment) as (keyof Hero['equipment'])[]) {
        const it = h.equipment[slot];
        if (it) { g.vault.push(it); delete h.equipment[slot]; }
      }
    }
  }
  const story = storyOf(g);
  const firstClear = kind === 'won' && !exp.finale && !exp.tutorial && !story.seen.includes(exp.biome);
  if (kind === 'won' && exp.finale) {
    // Tiamat slain: the epilogue, not a sigil.
    g.profile.stats.clears += 1;
    story.tiamat += 1;
    result.chapter = EPILOGUE.id;
  } else if (kind === 'won' && !exp.tutorial) {
    // (The practice cellar teaches the loop but earns no sigil and unlocks nothing.)
    g.profile.stats.clears += 1;
    g.profile.sigils[exp.biome] = (g.profile.sigils[exp.biome] ?? 0) + 1;
    const next = BIOME_ORDER[BIOME_ORDER.indexOf(exp.biome) + 1];
    if (next && !g.profile.unlockedBiomes.includes(next)) g.profile.unlockedBiomes.push(next);
    // The first clear of an echo tells the next part of the story.
    if (!story.seen.includes(exp.biome)) { story.seen.push(exp.biome); result.chapter = CHAPTERS[exp.biome].id; }
  }
  if (kind === 'wiped') g.profile.stats.wipes += 1;
  if (kind === 'retreated') g.profile.stats.retreats += 1;
  g.profile.stats.deaths += result.fallen.length;
  if (exp.fortune.bestScore > g.profile.stats.bestScore) g.profile.stats.bestScore = exp.fortune.bestScore;
  const q = onExpeditionEnd(g, exp, kind, firstClear, result.gold);
  if (q.head || q.found.length || q.notes.length) result.quest = q;
  g.lastResult = result;
  g.expedition = undefined;
  g.profile.townDay += 1;
}

export function mapView(exp: Expedition) {
  const cells: { x: number; y: number; room?: Room; seen: boolean; visited: boolean; here: boolean }[] = [];
  for (let y = 0; y < exp.map.height; y++) for (let x = 0; x < exp.map.width; x++) {
    const k = key(x, y);
    const room = exp.map.rooms[k];
    cells.push({ x, y, room, seen: exp.seen.includes(k), visited: exp.visited.includes(k), here: exp.pos === k });
  }
  return cells;
}

export { parseKey, DELTA, biomeMonsters, newCharm };
export type { BoonOffer };
