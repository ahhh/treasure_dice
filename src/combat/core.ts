/**
 * Combat kernel: setup, conditions, the damage pipeline, turn order, death
 * saves, victory/defeat. Pure state mutation over plain JSON + seeded RNG.
 */
import type {
  Ability, Combat, Combatant, Condition, ConditionId, DamageType, Expedition, GameState, Hero, LogEntry, Rank,
} from '../engine/types.ts';
import { Rng } from '../engine/rng.ts';
import { rollD20, combineAdvantage, roll, type Advantage } from '../engine/dice.ts';
import { MONSTERS, TIER_TITLES, tierIndex } from '../content/monsters.ts';
import { derive, mod } from '../rules/character.ts';
import {
  monsterHp, monsterDamage, monsterAttack, monsterAc, monsterDc, depthScale, DIFFICULTY_MOD, ROLE_MOD, ELITE_MOD, VITALITY, ECHO,
} from '../rules/balance.ts';
import { monsterIdOf } from '../dungeon/generator.ts';
import { startCombatTray, handSize, endCombatTray } from '../fortune/tray.ts';
import { CHARM_BY_ID } from '../fortune/charms.ts';
import { CURSES, type CurseId } from '../fortune/curses.ts';
import { BIOMES } from '../content/biomes.ts';

export interface Ctx {
  game: GameState;
  exp: Expedition;
  combat: Combat;
  rng: Rng;
  fortuneRng: Rng;
  aiRng: Rng;
}

export function makeCtx(game: GameState): Ctx {
  const exp = game.expedition!;
  return {
    game, exp, combat: exp.combat!,
    rng: new Rng(exp.rng.combat), fortuneRng: new Rng(exp.rng.fortune), aiRng: new Rng(exp.rng.ai),
  };
}

export const heroOf = (ctx: Ctx, c: Combatant): Hero | undefined => (c.side === 'hero' ? ctx.game.roster.find((h) => h.id === c.refId) : undefined);

export function log(ctx: Ctx, t: string, kind?: LogEntry['kind']) {
  ctx.combat.log.push({ t, kind });
  if (ctx.combat.log.length > 200) ctx.combat.log.splice(0, ctx.combat.log.length - 200);
}

export function fx(ctx: Ctx, f: Combat['fx'][number]) {
  ctx.combat.fx.push(f);
}

export const all = (ctx: Ctx) => Object.values(ctx.combat.combatants);
export const heroes = (ctx: Ctx) => all(ctx).filter((c) => c.side === 'hero');
export const enemies = (ctx: Ctx) => all(ctx).filter((c) => c.side === 'enemy');
export const alive = (c: Combatant) => !c.dead && !c.downed;
export const livingEnemies = (ctx: Ctx) => enemies(ctx).filter(alive);
export const livingHeroes = (ctx: Ctx) => heroes(ctx).filter(alive);

export function has(c: Combatant, id: ConditionId): boolean {
  return c.conditions.some((x) => x.id === id);
}
export function cond(c: Combatant, id: ConditionId): Condition | undefined {
  return c.conditions.find((x) => x.id === id);
}

export function addCondition(ctx: Ctx, c: Combatant, condition: Condition) {
  // Immunities from features.
  const h = heroOf(ctx, c);
  if (h) {
    if ((condition.id === 'charmed' || condition.id === 'frightened') && has(c, 'raging') && h.level >= 6 && h.classId === 'barbarian') return;
    if (condition.id === 'frightened' && partyHasAura(ctx, 'auraOfCourage')) return;
    if (condition.id === 'charmed' && partyHasAura(ctx, 'auraOfDevotion')) return;
    if (condition.id === 'poisoned' && h.classId === 'druid' && h.level >= 10) return;
    if (condition.id === 'frightened' && h.ancestry === 'halfling' && ctx.rng.chance(0.5)) return;
  }
  if (c.mon?.tags.includes('construct') && (condition.id === 'poisoned' || condition.id === 'charmed' || condition.id === 'frightened')) return;
  const existing = cond(c, condition.id);
  if (existing) {
    existing.rounds = Math.max(existing.rounds, condition.rounds);
    if ((condition.value ?? 0) > (existing.value ?? 0)) existing.value = condition.value;
    return;
  }
  c.conditions.push({ ...condition });
}

export function removeCondition(c: Combatant, id: ConditionId) {
  c.conditions = c.conditions.filter((x) => x.id !== id);
}

function partyHasAura(ctx: Ctx, featureId: string): boolean {
  return livingHeroes(ctx).some((c) => { const h = heroOf(ctx, c); return !!h && derive(h).features.has(featureId); });
}

export function incapacitated(c: Combatant): boolean {
  return c.downed || c.dead || ['incapacitated', 'paralyzed', 'stunned', 'unconscious', 'banished'].some((id) => has(c, id as ConditionId));
}

// ── setup ───────────────────────────────────────────────────────────────────

export function scaledMonster(ctx: { exp: Expedition }, entry: string, idx: number): Combatant {
  const { id, elite } = monsterIdOf(entry);
  const def = MONSTERS[id];
  const L = ctx.exp.partyLevel;
  const role = ROLE_MOD[def.role] ?? ROLE_MOD.brute;
  const diff = DIFFICULTY_MOD[ctx.exp.difficulty];
  const depth = depthScale(ctx.exp.depth, L);
  let hp = monsterHp(L) * role.hp * diff.hp * depth;
  let dmg = monsterDamage(L) * role.dmg * diff.dmg * (1 + 0.04 * ctx.exp.depth);
  let ac = monsterAc(L) + role.ac;
  let atk = monsterAttack(L) + role.atk;
  if (elite) { hp *= ELITE_MOD.hp; dmg *= ELITE_MOD.dmg; ac += ELITE_MOD.ac; atk += ELITE_MOD.atk; }
  if (def.role === 'boss' && L <= 2) hp *= 0.85;
  const dc = monsterDc(L) + (def.role === 'boss' ? 1 : 0);
  const saveBase = Math.floor(L / 3) + 1;
  const saves: Record<Ability, number> = { str: saveBase, dex: saveBase, con: saveBase + 1, int: saveBase - 1, wis: saveBase, cha: saveBase - 1 };
  if (def.role === 'boss') for (const k of Object.keys(saves) as Ability[]) saves[k] += 2;
  const tier = TIER_TITLES[tierIndex(L)];
  hp = Math.round(hp);
  return {
    id: `e${idx}`, side: 'enemy', refId: id, name: `${elite ? 'Elite ' : ''}${def.role === 'boss' ? '' : tier}${def.name}`,
    art: `monsters/${def.biome}_${def.id}`, rank: def.rank, level: L, hp, maxHp: hp, tempHp: 0, ac, initiative: 0,
    dexMod: def.role === 'skirmisher' ? 3 : def.role === 'artillery' ? 2 : 1,
    conditions: [], downed: false, dead: false, stable: false, deathSaves: { s: 0, f: 0 },
    used: { action: false, bonus: false, reaction: false, fortune: false, extraFortune: 0 },
    mon: {
      role: def.role, attackBonus: atk, saveDc: dc, dmgBase: Math.max(2, Math.round(dmg)), saves,
      resist: def.resist ?? [], immune: def.immune ?? [], vuln: def.vuln ?? [], actions: def.actions, recharge: {},
      tags: def.tags, boss: def.role === 'boss', phase: 1, phases: def.boss?.phases ?? 1, elite,
    },
  };
}

export function heroCombatant(hero: Hero, rank: Rank): Combatant {
  const d = derive(hero);
  return {
    id: hero.id, side: 'hero', refId: hero.id, name: hero.name, art: hero.portrait, rank, level: hero.level,
    hp: Math.min(hero.hp, d.maxHp), maxHp: d.maxHp, tempHp: 0, ac: d.ac, initiative: 0, dexMod: d.mods.dex,
    conditions: [], downed: hero.hp <= 0, dead: hero.status === 'dead', stable: hero.hp <= 0, deathSaves: { s: 0, f: 0 },
    used: { action: false, bonus: false, reaction: false, fortune: false, extraFortune: 0 },
  };
}

export function defaultRank(hero: Hero): Rank {
  const d = derive(hero);
  if (['wizard', 'sorcerer', 'warlock', 'bard', 'druid'].includes(hero.classId)) return 'back';
  if (d.main.ranged) return 'back';
  return 'front';
}

export function startCombat(game: GameState, roomKey: string, entries: string[], kind: Combat['kind']): void {
  const exp = game.expedition!;
  const combat: Combat = {
    id: `c${exp.depth}_${roomKey}`, kind, round: 0, order: [], turnIndex: -1, combatants: {}, log: [], status: 'active',
    roomKey, rewarded: false, kills: 0, handsThisCombat: 0, rerollsUsed: 0, zones: [], fx: [], once: {}, diedThisFight: [],
    legendary: {}, extraTurns: {},
  };
  exp.combat = combat;
  const ctx = makeCtx(game);
  const party = exp.partyIds.map((id) => game.roster.find((h) => h.id === id)!).filter((h) => h && h.status === 'alive');
  for (const h of party) {
    const rank = (exp.flags[`rank:${h.id}`] === 1 ? 'back' : exp.flags[`rank:${h.id}`] === 2 ? 'front' : defaultRank(h)) as Rank;
    combat.combatants[h.id] = heroCombatant(h, rank);
  }
  // Ensure someone stands in front.
  const hs = heroes(ctx).filter(alive);
  if (hs.length && !hs.some((c) => c.rank === 'front')) hs.sort((a, b) => b.maxHp - a.maxHp)[0].rank = 'front';

  entries.forEach((e, i) => {
    const m = scaledMonster(ctx, e, i);
    combat.combatants[m.id] = m;
  });
  if (kind === 'boss') {
    const b = enemies(ctx).find((c) => c.mon?.boss);
    if (b) {
      const def = MONSTERS[b.refId];
      combat.curse = def.boss?.curse;
      ctx.combat.legendary[b.id] = exp.partyLevel >= 11 ? 3 : 2;
      log(ctx, `${def.name}, ${def.boss?.title}! ${def.boss?.intro}`, 'warn');
    }
  } else if (kind === 'elite') {
    // Elites bring a lesser curse on perilous or deeper runs.
    const pool: CurseId[] = ['hunger', 'silence', 'oddDrown', 'evenMirror', 'ashen'];
    if (exp.difficulty === 'perilous' || exp.depth >= 4) combat.curse = ctx.rng.pick(pool);
  }
  if (combat.curse) log(ctx, `Curse — ${CURSES[combat.curse].name}: ${CURSES[combat.curse].text}`, 'warn');

  // Initiative.
  for (const c of all(ctx)) {
    let mode: Advantage = 'normal';
    const h = heroOf(ctx, c);
    let bonus = c.dexMod;
    if (h) {
      const d = derive(h);
      bonus = d.init;
      if (d.features.has('feralInstinct') || d.features.has('remarkableAthlete')) mode = 'advantage';
    }
    if (exp.flags.surprise && c.side === 'enemy') mode = 'advantage';
    const r = rollD20(ctx.rng, mode);
    c.initiative = r.natural + bonus + (c.side === 'hero' ? 0.1 : 0) + ctx.rng.next() * 0.01;
  }
  combat.order = all(ctx).sort((a, b) => b.initiative - a.initiative).map((c) => c.id);

  // Fortune tray.
  const maxLevel = Math.max(...party.map((h) => h.level));
  const curseDelta = combat.curse ? CURSES[combat.curse].handSizeDelta ?? 0 : 0;
  startCombatTray(exp.fortune, ctx.fortuneRng, handSize(exp.fortune, maxLevel, curseDelta));

  // Start-of-combat features.
  for (const c of heroes(ctx)) {
    const h = heroOf(ctx, c)!;
    const d = derive(h);
    if (h.choices.invocation?.includes('fiendishVigor')) c.tempHp = Math.round(8 * VITALITY);
    if (d.features.has('thiefsReflexes')) combat.extraTurns[c.id] = 1;
    if (d.features.has('archdruid')) h.resources.wildShape = Math.min(d.resources.wildShape, (h.resources.wildShape ?? 0) + 1);
    if (d.features.has('perfectFocus')) h.resources.focus = Math.max(h.resources.focus ?? 0, 4);
    if (d.features.has('superiorInspiration')) h.resources.inspiration = Math.max(h.resources.inspiration ?? 0, 2);
    if (d.features.has('persistentRage') && (h.resources.rage ?? 0) === 0) h.resources.rage = 1;
    if (exp.flags[`blessed:${h.id}`]) { addCondition(ctx, c, { id: 'blessed', rounds: 3, value: 4 }); delete exp.flags[`blessed:${h.id}`]; }
    if (exp.flags[`frightened:${h.id}`]) { addCondition(ctx, c, { id: 'frightened', rounds: 2 }); delete exp.flags[`frightened:${h.id}`]; }
    if (exp.flags[`poisoned:${h.id}`]) { addCondition(ctx, c, { id: 'poisoned', rounds: 3 }); delete exp.flags[`poisoned:${h.id}`]; }
  }
  applyBiomeAtStart(ctx);
  for (const ch of exp.fortune.charms) {
    const def = CHARM_BY_ID[ch.id];
    void def;
  }
  advance(ctx);
}

function applyBiomeAtStart(ctx: Ctx) {
  const exp = ctx.exp;
  const b = BIOMES[exp.biome];
  const room = exp.map.rooms[ctx.combat.roomKey];
  switch (exp.biome) {
    case 'cinder':
      if (exp.meter >= 3) {
        for (const c of livingHeroes(ctx)) addCondition(ctx, c, { id: 'burning', rounds: 2, value: Math.max(1, Math.round(c.maxHp * 0.025 * exp.meter)) });
        ctx.combat.biomeNote = `${b.meter.icon} Heat ${exp.meter}: the party is burning — Ember & Steel dice +1 Mult.`;
      }
      break;
    case 'rootbound':
      if (exp.meter >= 3) {
        for (const c of livingEnemies(ctx)) addCondition(ctx, c, { id: 'regenerating', rounds: -1, value: Math.max(2, Math.round(c.maxHp * 0.04)) });
        ctx.combat.biomeNote = `${b.meter.icon} Bloom ${exp.meter}: foes regenerate — Verdant dice +4 Chips.`;
      }
      break;
    case 'drowned':
      if (exp.meter >= 1) {
        for (const c of livingEnemies(ctx)) if (!c.mon!.resist.includes('cold')) c.mon!.resist = [...c.mon!.resist, 'cold'];
        ctx.combat.biomeNote = `${b.meter.icon} High water: Storm & Frost dice +2 Mult; foes resist cold.`;
      }
      break;
    case 'mirror':
      if (room?.tags.includes('mirror')) ctx.combat.biomeNote = `${b.meter.icon} Mirrored room: dice reflections — rerolled dice show their opposite on a 1 in 4.`;
      break;
    case 'starfall':
      if (exp.meter > 0) ctx.combat.biomeNote = `${b.meter.icon} Gravity ${exp.meter}: weightless — +1 reroll every turn.`;
      break;
  }
  if (ctx.combat.biomeNote) log(ctx, ctx.combat.biomeNote, 'info');
}

// ── turn order ──────────────────────────────────────────────────────────────

export function current(ctx: Ctx): Combatant | undefined {
  const id = ctx.combat.order[ctx.combat.turnIndex];
  return id ? ctx.combat.combatants[id] : undefined;
}

/** Hooks wired in by index.ts to avoid import cycles. */
export const hooks = {
  heroTurnStart: (_ctx: Ctx, _c: Combatant) => {},
  enemyTurn: (_ctx: Ctx, _c: Combatant) => {},
  victory: (_ctx: Ctx) => {},
};

/** Advance to the next actor; run enemy turns until a hero needs input or combat ends. */
export function advance(ctx: Ctx) {
  const combat = ctx.combat;
  let guard = 0;
  while (combat.status === 'active' && guard++ < 200) {
    if (checkEnd(ctx)) return;
    combat.turnIndex += 1;
    if (combat.turnIndex >= combat.order.length) combat.turnIndex = 0;
    if (combat.turnIndex === 0) {
      combat.round += 1;
      startRound(ctx);
    }
    const c = current(ctx);
    if (!c || c.dead) continue;
    c.used = { action: false, bonus: false, reaction: false, fortune: false, extraFortune: 0 };
    c.conditions = c.conditions.filter((x) => !x.untilTurnStart);
    if (c.side === 'enemy') {
      if (c.downed) continue;
      startOfTurn(ctx, c);
      if (checkEnd(ctx)) return;
      if (!c.dead && !c.downed) {
        if (incapacitated(c)) log(ctx, `${c.name} can't act.`, 'info');
        else hooks.enemyTurn(ctx, c);
      }
      endOfTurn(ctx, c);
      continue;
    }
    // Hero.
    if (c.downed) {
      deathSave(ctx, c);
      endOfTurn(ctx, c);
      continue;
    }
    startOfTurn(ctx, c);
    if (checkEnd(ctx)) return;
    if (c.downed || c.dead) { endOfTurn(ctx, c); continue; }
    if (incapacitated(c)) {
      log(ctx, `${c.name} is ${c.conditions.find((x) => ['paralyzed', 'stunned', 'unconscious', 'incapacitated'].includes(x.id))?.id ?? 'helpless'} and loses the turn.`, 'warn');
      endOfTurn(ctx, c);
      continue;
    }
    hooks.heroTurnStart(ctx, c);
    return; // wait for player input
  }
}

function startRound(ctx: Ctx) {
  log(ctx, `— Round ${ctx.combat.round} —`, 'info');
}

export function startOfTurn(ctx: Ctx, c: Combatant) {
  // Conditions that act at turn start.
  const burn = cond(c, 'burning');
  if (burn) applyDamage(ctx, c, [{ type: 'fire', amount: burn.value ?? 3 }], { source: 'Burning', noFortune: true });
  const regen = cond(c, 'regenerating');
  if (regen && !c.dead && !has(c, 'noHeal') && c.hp > 0) heal(ctx, c, regen.value ?? 3, 'regenerates');
  const hero = heroOf(ctx, c);
  if (hero && !c.downed) {
    const d = derive(hero);
    if (d.features.has('survivor') && c.hp < c.maxHp / 2 && c.hp > 0) heal(ctx, c, Math.round((5 + d.mods.con) * VITALITY), 'Survivor');
    const hero2 = cond(c, 'heroism');
    if (hero2) c.tempHp = Math.max(c.tempHp, hero2.value ?? 0);
    // Zones owned by this caster tick now.
    for (const z of ctx.combat.zones.filter((z) => z.casterId === c.id)) tickZone(ctx, z);
    // Spiritual weapon free strike.
    const sw = cond(c, 'spiritualWeapon');
    if (sw) {
      const target = livingEnemies(ctx)[0];
      if (target) {
        const dmg = Math.round((roll(ctx.rng, '1d8').total + (d.spellAbility ? d.mods[d.spellAbility] : 0)) * ECHO_SW * (sw.value ?? 1));
        log(ctx, `${c.name}'s spiritual weapon strikes ${target.name}.`, 'hit');
        applyDamage(ctx, target, [{ type: 'force', amount: dmg }], { source: 'Spiritual Weapon', attacker: c, noFortune: true });
      }
    }
    if (d.features.has('holyNimbus') && has(c, 'nimbus')) {
      for (const e of livingEnemies(ctx)) applyDamage(ctx, e, [{ type: 'radiant', amount: Math.round((d.mods.cha + d.pb) * 2.5) }], { source: 'Holy Nimbus', attacker: c, noFortune: true });
    }
  }
}

const ECHO_SW = ECHO;

export function endOfTurn(ctx: Ctx, c: Combatant) {
  // Repeat saves and durations.
  const keep: Condition[] = [];
  for (const x of c.conditions) {
    if (x.save && !c.dead) {
      const bonus = c.mon ? c.mon.saves[x.save.ability] : heroSave(ctx, c, x.save.ability);
      const r = rollD20(ctx.rng).natural + bonus;
      if (r >= x.save.dc) {
        log(ctx, `${c.name} shakes off ${x.id}.`, 'info');
        continue;
      }
    }
    if (x.rounds > 0) x.rounds -= 1;
    if (x.rounds === 0) continue;
    keep.push(x);
  }
  c.conditions = keep;
  // Monk Self-Restoration.
  const h = heroOf(ctx, c);
  if (h && h.classId === 'monk' && h.level >= 10) c.conditions = c.conditions.filter((x) => !['charmed', 'frightened', 'poisoned'].includes(x.id));
}

export function heroSave(ctx: Ctx, c: Combatant, ability: Ability): number {
  const h = heroOf(ctx, c);
  if (!h) return 0;
  const d = derive(h);
  let b = d.saves[ability];
  // Aura of Protection: best paladin CHA.
  for (const p of livingHeroes(ctx)) {
    const ph = heroOf(ctx, p)!;
    if (ph.classId === 'paladin' && ph.level >= 6 && (p.rank === c.rank || ph.level >= 18 || p.id === c.id)) {
      b += Math.max(1, derive(ph).mods.cha);
      break;
    }
  }
  return b;
}

// ── saves ───────────────────────────────────────────────────────────────────

export interface SaveOpts { advantage?: boolean; disadvantage?: boolean; vsCondition?: boolean }

/** Roll a saving throw for any combatant. Returns true on success. */
export function savingThrow(ctx: Ctx, c: Combatant, ability: Ability, dc: number, opts: SaveOpts = {}): boolean {
  let adv = opts.advantage ? 1 : 0;
  let dis = opts.disadvantage ? 1 : 0;
  let bonus = 0;
  if (c.side === 'enemy') {
    bonus = c.mon!.saves[ability];
    if ((ability === 'str' || ability === 'dex') && (has(c, 'paralyzed') || has(c, 'stunned') || has(c, 'unconscious'))) return false;
    if (ability === 'dex' && has(c, 'restrained')) dis++;
    if (has(c, 'staggered')) { dis++; removeCondition(c, 'staggered'); }
    const bane = cond(c, 'baned');
    if (bane) bonus -= roll(ctx.rng, '1d4').total;
  } else {
    const h = heroOf(ctx, c)!;
    bonus = heroSave(ctx, c, ability);
    if ((ability === 'str' || ability === 'dex') && (has(c, 'paralyzed') || has(c, 'stunned'))) return false;
    if (ability === 'dex' && h.classId === 'barbarian' && h.level >= 2) adv++;
    if (ability === 'dex' && has(c, 'hasted')) adv++;
    if (['int', 'wis', 'cha'].includes(ability) && h.ancestry === 'gnome') adv++;
    if (has(c, 'holyAura')) adv++;
    if (ability === 'str' && has(c, 'raging')) adv++;
    const bl = cond(c, 'blessed');
    if (bl) bonus += roll(ctx.rng, '1d4').total;
  }
  const r = rollD20(ctx.rng, combineAdvantage(adv, dis));
  let nat = r.natural;
  if (c.side === 'hero' && nat === 1 && heroOf(ctx, c)?.ancestry === 'halfling') nat = rollD20(ctx.rng).natural;
  let ok = nat + bonus >= dc;
  if (!ok && c.side === 'hero') {
    const h = heroOf(ctx, c)!;
    if ((h.resources.indomitable ?? 0) > 0) {
      h.resources.indomitable -= 1;
      const r2 = rollD20(ctx.rng).natural + bonus + h.level;
      ok = r2 >= dc;
      log(ctx, `${c.name} is Indomitable — rerolls the save (${ok ? 'success' : 'fail'}).`, 'info');
    }
  }
  if (!ok && c.side === 'enemy' && opts.vsCondition && (ctx.combat.legendary[c.id] ?? 0) > 0) {
    ctx.combat.legendary[c.id] -= 1;
    log(ctx, `${c.name} uses Legendary Resistance! (${ctx.combat.legendary[c.id]} left)`, 'warn');
    ok = true;
  }
  return ok;
}

// ── damage & healing ────────────────────────────────────────────────────────

export interface DmgPart { type: DamageType; amount: number }
export interface DmgOpts { source: string; attacker?: Combatant; crit?: boolean; noFortune?: boolean; melee?: boolean; spill?: boolean }

export function resistMult(ctx: Ctx, c: Combatant, type: DamageType): number {
  if (c.side === 'enemy') {
    const m = c.mon!;
    if (m.immune.includes(type)) return 0;
    let x = 1;
    if (m.resist.includes(type)) x *= 0.5;
    if (m.vuln.includes(type)) x *= 2;
    if (has(c, 'vulnerable')) x *= 1.25;
    return x;
  }
  const h = heroOf(ctx, c)!;
  const d = derive(h);
  let x = 1;
  const phys = type === 'bludgeoning' || type === 'piercing' || type === 'slashing';
  if (d.resist.includes(type)) x = 0.5;
  if (phys && (has(c, 'raging') || has(c, 'stoneskin'))) x = 0.5;
  if (has(c, 'superiorDefense') && type !== 'force') x = 0.5;
  return x;
}

/** Applies typed damage parts; returns total HP lost. Handles temp HP, death, concentration, reactions. */
export function applyDamage(ctx: Ctx, target: Combatant, parts: DmgPart[], opts: DmgOpts): number {
  if (target.dead) return 0;
  let total = 0;
  for (const p of parts) total += Math.round(p.amount * resistMult(ctx, target, p.type));
  if (total <= 0) {
    if (parts.some((p) => p.amount > 0)) log(ctx, `${target.name} is unharmed.`, 'info');
    return 0;
  }
  // Downed hero hit → death save failure.
  if (target.side === 'hero' && target.downed) {
    target.deathSaves.f += opts.crit ? 2 : 1;
    log(ctx, `${target.name} is struck while down! (${target.deathSaves.f}/3 failures)`, 'death');
    if (target.deathSaves.f >= 3) kill(ctx, target, opts.source);
    return 0;
  }
  // Temp HP.
  let rem = total;
  if (target.tempHp > 0) {
    const t = Math.min(target.tempHp, rem);
    target.tempHp -= t;
    rem -= t;
    if (t > 0 && has(target, 'agathys') && opts.attacker && opts.melee) {
      const a = cond(target, 'agathys')!;
      applyDamage(ctx, opts.attacker, [{ type: 'cold', amount: a.value ?? 10 }], { source: 'Armor of Agathys', noFortune: true });
    }
  }
  const before = target.hp;
  target.hp = Math.max(0, target.hp - rem);
  const lost = before - target.hp;
  fx(ctx, { kind: opts.crit ? 'crit' : 'dmg', target: target.id, amount: total, actor: opts.attacker?.id });

  // Sleep/hypnotic break on damage.
  for (const id of ['unconscious', 'incapacitated'] as ConditionId[]) {
    const x = cond(target, id);
    if (x && x.concentrationOf) removeCondition(target, id);
  }
  if (target.side === 'enemy') { removeCondition(target, 'unconscious'); }

  // Concentration.
  if (target.concentration && target.hp > 0) {
    const dc = Math.max(10, Math.floor(total / 2 / VITALITY));
    const h = heroOf(ctx, target);
    const adv = !!h && (h.feats.includes('warCaster') || h.choices.invocation?.includes('eldritchMind'));
    const relentless = h && h.classId === 'ranger' && h.level >= 13 && target.concentration.spellId === 'huntersMark';
    if (!relentless && !savingThrow(ctx, target, 'con', dc, { advantage: adv })) {
      log(ctx, `${target.name} loses concentration on ${target.concentration.spellId}.`, 'warn');
      endConcentration(ctx, target);
    }
  }

  if (target.hp <= 0) dropToZero(ctx, target, opts);
  // Boss phases.
  if (target.mon?.boss && !target.dead && target.mon.phases && target.mon.phases > 1) {
    const next = target.mon.phase + 1;
    const threshold = 1 - (target.mon.phase) / target.mon.phases;
    if (next <= target.mon.phases && target.hp / target.maxHp <= threshold) {
      target.mon.phase = next;
      log(ctx, `${target.name} enters phase ${next}! Its fury grows.`, 'warn');
      target.mon.dmgBase = Math.round(target.mon.dmgBase * 1.15);
      target.conditions = target.conditions.filter((c) => !['paralyzed', 'stunned', 'unconscious', 'incapacitated', 'banished'].includes(c.id));
      fx(ctx, { kind: 'text', target: target.id, text: `PHASE ${next}` });
    }
  }
  return lost;
}

function dropToZero(ctx: Ctx, target: Combatant, opts: DmgOpts) {
  if (target.side === 'enemy') {
    kill(ctx, target, opts.source, opts.attacker);
    return;
  }
  const h = heroOf(ctx, target)!;
  // Death Ward.
  if (has(target, 'deathWard')) {
    removeCondition(target, 'deathWard');
    target.hp = 1;
    log(ctx, `${target.name}'s Death Ward flares — 1 HP!`, 'heal');
    return;
  }
  // Relentless Rage.
  if (h.classId === 'barbarian' && h.level >= 11 && has(target, 'raging')) {
    const k = `${h.id}:relentlessDc`;
    const dc = 10 + 5 * (ctx.combat.once[k] ? Number(ctx.exp.flags[k] ?? 0) : 0);
    if (savingThrow(ctx, target, 'con', dc)) {
      ctx.combat.once[k] = true;
      ctx.exp.flags[k] = (ctx.exp.flags[k] ?? 0) + 1;
      target.hp = h.level * 2;
      log(ctx, `${target.name} refuses to fall! (Relentless Rage)`, 'heal');
      return;
    }
  }
  // Orc Relentless Endurance.
  if ((h.resources.relentless ?? 0) > 0) {
    h.resources.relentless -= 1;
    target.hp = 1;
    log(ctx, `${target.name} endures — 1 HP! (Relentless Endurance)`, 'heal');
    return;
  }
  target.downed = true;
  target.hp = 0;
  target.stable = false;
  target.deathSaves = { s: 0, f: 0 };
  target.conditions = target.conditions.filter((c) => ['blessed'].includes(c.id));
  if (target.concentration) endConcentration(ctx, target);
  log(ctx, `${target.name} falls unconscious!`, 'death');
  fx(ctx, { kind: 'down', target: target.id });
  // Periapt: auto-stabilise.
  if (Object.values(h.equipment).some((i) => i?.defId === 'periaptWound')) {
    target.stable = true;
    log(ctx, `${target.name}'s periapt stabilises them.`, 'info');
  }
  // Avalanche Idol resets.
  for (const ch of ctx.exp.fortune.charms) if (ch.id === 'avalanche') ch.counter = 1;
}

export function kill(ctx: Ctx, target: Combatant, source: string, attacker?: Combatant) {
  target.dead = true;
  target.downed = false;
  target.hp = 0;
  if (target.concentration) endConcentration(ctx, target);
  if (target.side === 'enemy') {
    ctx.combat.kills += 1;
    log(ctx, `${target.name} is destroyed!`, 'death');
    fx(ctx, { kind: 'kill', target: target.id });
    for (const ch of ctx.exp.fortune.charms) CHARM_BY_ID[ch.id]?.onKill?.(ch, ctx.exp.fortune);
    // Remove zones targeting it.
    ctx.combat.zones = ctx.combat.zones.filter((z) => z.targetId !== target.id || z.target !== 'enemy');
    if (attacker?.side === 'hero') {
      const h = heroOf(ctx, attacker)!;
      h.history.kills += 1;
      const d = derive(h);
      if (h.classId === 'warlock' && h.level >= 3) {
        attacker.tempHp = Math.max(attacker.tempHp, Math.round((d.mods.cha + h.level) * VITALITY));
        log(ctx, `${attacker.name} drinks in the kill (Dark One's Blessing).`, 'heal');
      }
      if (d.doubloonOnKill) ctx.exp.fortune.doubloons += d.doubloonOnKill;
    }
    if (!ctx.exp.journal.includes(target.refId) && !ctx.game.profile.codex.monsters.includes(target.refId)) ctx.game.profile.codex.monsters.push(target.refId);
  } else {
    const h = heroOf(ctx, target)!;
    log(ctx, `${target.name} has died. (${source})`, 'death');
    fx(ctx, { kind: 'kill', target: target.id });
    ctx.combat.diedThisFight.push(h.id);
    if (ctx.game.mode === 'legacy') {
      h.status = 'dead';
      h.history.deathCause = `${source} in ${BIOMES[ctx.exp.biome].name}`;
    }
  }
}

export function heal(ctx: Ctx, target: Combatant, amount: number, source: string): number {
  if (target.dead || amount <= 0) return 0;
  if (has(target, 'noHeal')) { log(ctx, `${target.name} cannot heal.`, 'warn'); return 0; }
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + Math.round(amount));
  if (target.downed && target.hp > 0) {
    target.downed = false;
    target.stable = false;
    target.deathSaves = { s: 0, f: 0 };
    log(ctx, `${target.name} is back on their feet!`, 'heal');
  }
  const gained = target.hp - before;
  if (gained > 0) {
    log(ctx, `${target.name} recovers ${gained} HP (${source}).`, 'heal');
    fx(ctx, { kind: 'heal', target: target.id, amount: gained });
  }
  return gained;
}

export function endConcentration(ctx: Ctx, caster: Combatant) {
  if (!caster.concentration) return;
  const spell = caster.concentration.spellId;
  for (const c of all(ctx)) c.conditions = c.conditions.filter((x) => x.concentrationOf !== `${caster.id}:${spell}`);
  ctx.combat.zones = ctx.combat.zones.filter((z) => !(z.casterId === caster.id && z.spellId === spell));
  caster.concentration = undefined;
}

export function tickZone(ctx: Ctx, z: Combat['zones'][number]) {
  const caster = ctx.combat.combatants[z.casterId];
  if (!caster || caster.dead || caster.downed) return;
  let targets = livingEnemies(ctx);
  if (z.target === 'enemy') targets = targets.filter((t) => t.id === z.targetId);
  else if (z.target === 'rank') targets = targets.filter((t) => t.rank === z.rank);
  if (!targets.length) return;
  const base = roll(ctx.rng, z.dice).total;
  for (const t of targets) {
    let amt = Math.round(base * ZONE_ECHO * z.tickMult);
    if (z.save) {
      const ok = savingThrow(ctx, t, z.save, z.dc);
      if (ok) amt = z.half ? Math.floor(amt / 2) : 0;
    }
    if (amt > 0) {
      log(ctx, `${z.spellId === 'spiritGuardians' ? 'Spirit guardians' : 'The lingering spell'} burns ${t.name}.`, 'hit');
      applyDamage(ctx, t, [{ type: z.dmgType, amount: amt }], { source: z.spellId, attacker: caster, noFortune: true });
    }
    if (z.condition && !t.dead) addCondition(ctx, t, { id: z.condition, rounds: 1 });
  }
}

const ZONE_ECHO = ECHO;

export function deathSave(ctx: Ctx, c: Combatant) {
  if (c.stable) { log(ctx, `${c.name} is unconscious but stable.`, 'info'); return; }
  const r = rollD20(ctx.rng).natural;
  if (r === 20) {
    c.downed = false;
    c.hp = 1;
    c.deathSaves = { s: 0, f: 0 };
    log(ctx, `${c.name} rolls a natural 20 on a death save and rises!`, 'heal');
    return;
  }
  if (r === 1) c.deathSaves.f += 2;
  else if (r >= 10) c.deathSaves.s += 1;
  else c.deathSaves.f += 1;
  log(ctx, `${c.name} death save: ${r} (${c.deathSaves.s} ✓ / ${c.deathSaves.f} ✗)`, r >= 10 ? 'info' : 'death');
  if (c.deathSaves.f >= 3) kill(ctx, c, 'failed death saves');
  else if (c.deathSaves.s >= 3) { c.stable = true; log(ctx, `${c.name} stabilises.`, 'info'); }
}

export function checkEnd(ctx: Ctx): boolean {
  const combat = ctx.combat;
  if (combat.status !== 'active') return true;
  if (livingEnemies(ctx).length === 0) {
    combat.status = 'victory';
    log(ctx, 'Victory!', 'loot');
    hooks.victory(ctx);
    return true;
  }
  if (livingHeroes(ctx).length === 0) {
    combat.status = 'defeat';
    log(ctx, 'The party has fallen...', 'death');
    return true;
  }
  return false;
}

/** Copy combat HP back to hero sheets. */
export function syncHeroes(ctx: Ctx) {
  for (const c of heroes(ctx)) {
    const h = heroOf(ctx, c);
    if (!h) continue;
    h.hp = c.dead ? 0 : c.hp;
  }
}

export function finishCombatTray(ctx: Ctx) {
  endCombatTray(ctx.exp.fortune);
}

export function abilityMod(c: Combatant, ctx: Ctx, a: Ability): number {
  const h = heroOf(ctx, c);
  return h ? mod(derive(h).abilities[a]) : 0;
}
