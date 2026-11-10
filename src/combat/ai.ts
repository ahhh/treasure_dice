/**
 * Transparent priority AI (plan §4.4): finish a kill → heal an ally in danger
 * → fire a telegraphed boss move → otherwise a weighted legal action by role.
 */
import type { Combatant, MonsterAction } from '../engine/types.ts';
import { roll, rollD20, combineAdvantage } from '../engine/dice.ts';
import {
  type Ctx, log, fx, livingHeroes, livingEnemies, has, cond, addCondition, applyDamage, heal, savingThrow, heroOf, removeCondition, scaledMonster, enemies,
  hasTrait, telemetry,
} from './core.ts';
import { tierIndex } from '../content/monsters.ts';
import { effectiveAc } from './hero.ts';
import { applyHex, handSize } from '../fortune/tray.ts';
import { derive } from '../rules/character.ts';
import { VITALITY, ECHO } from '../rules/balance.ts';
import { MONSTERS } from '../content/monsters.ts';
import { CURSES } from '../fortune/curses.ts';
import { tx } from '../i18n/index.ts';
import { condName } from '../content/terms.ts';

function usable(c: Combatant, a: MonsterAction): boolean {
  if (a.phase && c.mon!.phase < a.phase) return false;
  return true;
}

function pickTarget(ctx: Ctx, c: Combatant, a: MonsterAction): Combatant | undefined {
  const heroes = livingHeroes(ctx).filter((h) => !has(h, 'invisible') || ctx.aiRng.chance(0.3));
  if (!heroes.length) return livingHeroes(ctx)[0];
  const melee = a.kind === 'attack' && !a.ranged && c.rank === 'front';
  let pool = heroes;
  if (melee || (a.kind === 'attack' && !a.ranged)) {
    const front = heroes.filter((h) => h.rank === 'front');
    if (front.length) pool = front;
  }
  return ctx.aiRng.weighted(pool, (h) => {
    let w = 1;
    if (has(h, 'guarding')) w += 2;
    if (h.hp / h.maxHp < 0.35) w += 1.2; // smell blood
    if (has(h, 'reckless')) w += 0.8;
    if (h.concentration) w += 0.6;
    return w;
  });
}

export function enemyTurn(ctx: Ctx, c: Combatant) {
  const m = c.mon!;
  const actions = m.actions.filter((a) => usable(c, a));
  // Telegraphed move fires now.
  if (m.telegraphed) {
    const a = actions.find((x) => x.id === m.telegraphed);
    m.telegraphed = undefined;
    if (a) { perform(ctx, c, a); return; }
  }
  // Healers save allies in danger.
  const hurt = livingEnemies(ctx).filter((e) => e.hp / e.maxHp < 0.5);
  const healAct = actions.find((a) => a.kind === 'heal');
  if (healAct && hurt.length && ctx.aiRng.chance(0.75)) { perform(ctx, c, healAct); return; }
  // Bosses telegraph big moves a turn ahead.
  const tele = actions.filter((a) => a.telegraph);
  if (m.boss && tele.length && ctx.aiRng.chance(0.4)) {
    const t = ctx.aiRng.pick(tele);
    m.telegraphed = t.id;
    log(ctx, tx('combatAi.preparesNextTurn', { cName: c.name, tName: t.name }), 'warn');
    fx(ctx, { kind: 'text', target: c.id, text: `${t.name}!` });
    const basic = actions.filter((a) => a.kind === 'attack' && !a.telegraph);
    if (basic.length) perform(ctx, c, ctx.aiRng.pick(basic));
    return;
  }
  const pool = actions.filter((a) => !a.telegraph && (a.kind !== 'heal' || hurt.length) && (a.kind !== 'summon' || livingEnemies(ctx).length < 5));
  const a = ctx.aiRng.weighted(pool.length ? pool : actions, (x) => x.weight);
  perform(ctx, c, a);
  // Bosses in later phases (or relentless ones) act twice sometimes (legendary-like).
  const again = m.phase >= 2 ? (hasTrait(c, 'relentless') ? 0.5 : 0.35) : hasTrait(c, 'relentless') ? 0.3 : 0;
  if (m.boss && again && ctx.aiRng.chance(again) && livingHeroes(ctx).length) {
    const extra = actions.filter((x) => x.kind === 'attack' && !x.telegraph);
    if (extra.length) { log(ctx, tx('combatAi.strikesAgain', { cName: c.name }), 'warn'); perform(ctx, c, ctx.aiRng.pick(extra)); }
  }
}

function dmgRoll(ctx: Ctx, c: Combatant, a: MonsterAction, crit = false): number {
  const base = c.mon!.dmgBase * (a.dmg ?? 1);
  let v = base * (0.75 + ctx.aiRng.next() * 0.5);
  if (crit) v *= 1.75;
  if (has(c, 'weakened')) { v *= 0.75; removeCondition(c, 'weakened'); }
  if (has(c, 'frightened')) v *= 0.85;
  if (has(c, 'slowed')) v *= 0.85;
  if (hasTrait(c, 'frenzy') && c.hp < c.maxHp / 2) v *= 1.3;
  return Math.max(1, Math.round(v));
}

/** Multiattack: how many swings an attack action makes, and the damage share of each. */
function swings(ctx: Ctx, c: Combatant): { n: number; each: number } {
  if (!hasTrait(c, 'multiattack')) return { n: 1, each: 1 };
  return tierIndex(ctx.exp.partyLevel) >= 3 ? { n: 3, each: 0.45 } : { n: 2, each: 0.6 };
}

/** Lair actions: at the top of each round, a mythic boss's lair lashes the party. */
export function lairActions(ctx: Ctx) {
  if (ctx.combat.round < 2) return;
  for (const b of livingEnemies(ctx).filter((e) => hasTrait(e, 'lair'))) {
    const a = b.mon!.actions.find((x) => x.kind === 'save' && x.target === 'all') ?? b.mon!.actions.find((x) => x.kind === 'save');
    if (!a) continue;
    log(ctx, tx('combatAi.theLairAnswersRipplesThrough', { bName: b.name, aName: a.name }), 'warn');
    perform(ctx, b, { ...a, id: `lair:${a.id}`, name: tx('combatAi.lair', { aName: a.name }), dmg: (a.dmg ?? 1) * 0.45, condition: undefined, telegraph: false });
  }
}

function perform(ctx: Ctx, c: Combatant, a: MonsterAction) {
  const m = c.mon!;
  telemetry.sink?.monsterAction?.(ctx, { actor: c, actionId: a.id, name: a.name });
  switch (a.kind) {
    case 'attack': {
      const multi = swings(ctx, c);
      const swing = multi.n > 1 ? { ...a, dmg: (a.dmg ?? 1) * multi.each } : a;
      for (let i = 0; i < multi.n && livingHeroes(ctx).length && !c.dead; i++) {
        const targets = a.target === 'front' ? livingHeroes(ctx).filter((h) => h.rank === 'front') : [pickTarget(ctx, c, a)].filter(Boolean) as Combatant[];
        for (const t of targets.length ? targets : livingHeroes(ctx).slice(0, 1)) attack(ctx, c, t, swing);
      }
      return;
    }
    case 'save': {
      const list = a.target === 'all' ? livingHeroes(ctx) : a.target === 'front' ? livingHeroes(ctx).filter((h) => h.rank === 'front') : a.target === 'back' ? livingHeroes(ctx).filter((h) => h.rank === 'back') : [pickTarget(ctx, c, a)!];
      log(ctx, tx('combatAi.unleashes', { cName: c.name, aName: a.name }), 'enemy');
      const dmg = dmgRoll(ctx, c, a);
      for (const t of list.length ? list : livingHeroes(ctx)) {
        if (!t) continue;
        const h = heroOf(ctx, t)!;
        const ok = savingThrow(ctx, t, a.save!, m.saveDc);
        const evasion = a.save === 'dex' && (h.classId === 'rogue' || h.classId === 'monk') && h.level >= 7;
        let amt = ok ? (a.halfOnSave ? dmg / 2 : 0) : dmg;
        if (evasion) amt = ok ? 0 : dmg / 2;
        if (amt > 0) applyDamage(ctx, t, [{ type: a.damageType ?? 'force', amount: amt }], { source: a.name, attacker: c });
        else log(ctx, tx('combatAi.avoidsIt', { tName: t.name }), 'miss');
        if (!ok && a.condition && !t.dead && !t.downed) addCondition(ctx, t, { id: a.condition.id, rounds: a.condition.rounds, value: a.condition.value, save: a.condition.saveEnds ? { ability: a.save!, dc: m.saveDc } : undefined });
      }
      return;
    }
    case 'condition': {
      const t = pickTarget(ctx, c, a);
      if (!t) return;
      log(ctx, tx('combatAi.usesOn', { cName: c.name, aName: a.name, tName: t.name }), 'enemy');
      if (a.save) {
        if (savingThrow(ctx, t, a.save, m.saveDc)) { log(ctx, tx('combatAi.resists', { tName: t.name }), 'miss'); return; }
      } else {
        const r = rollD20(ctx.aiRng).natural + m.attackBonus;
        if (r < effectiveAc(ctx, t)) { log(ctx, tx('combatAi.itMisses'), 'miss'); fx(ctx, { kind: 'miss', target: t.id, actor: c.id }); return; }
      }
      if (a.dmg) applyDamage(ctx, t, [{ type: a.damageType ?? 'force', amount: dmgRoll(ctx, c, a) }], { source: a.name, attacker: c });
      if (!t.dead && !t.downed && a.condition) {
        addCondition(ctx, t, { id: a.condition.id, rounds: a.condition.rounds, value: a.condition.value ? Math.round(a.condition.value * VITALITY) : undefined, save: a.condition.saveEnds && a.save ? { ability: a.save, dc: m.saveDc } : undefined });
        log(ctx, tx('combatAi.is', { tName: t.name, conditionId: condName(a.condition.id) }), 'warn');
      }
      return;
    }
    case 'heal': {
      const list = a.target === 'self' ? [c] : livingEnemies(ctx).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp);
      const t = list[0];
      if (!t) return;
      log(ctx, tx('combatAi.uses', { cName: c.name, aName: a.name }), 'enemy');
      if (a.target !== 'self' && hasTrait(c, 'massMend')) {
        for (const x of list) heal(ctx, x, m.dmgBase * (a.dmg ?? 1) * (x === t ? 1.6 : 0.6), a.name);
        return;
      }
      heal(ctx, t, m.dmgBase * (a.dmg ?? 1) * 1.6, a.name);
      return;
    }
    case 'buff': {
      const list = a.target === 'self' ? [c] : livingEnemies(ctx);
      log(ctx, tx('combatAi.uses', { cName: c.name, aName: a.name }), 'enemy');
      for (const t of list) if (a.condition) addCondition(ctx, t, { id: a.condition.id, rounds: a.condition.rounds, value: a.condition.value });
      return;
    }
    case 'hex': {
      const run = ctx.exp.fortune;
      const maxLevel = Math.max(...livingHeroes(ctx).map((h) => h.level), 1);
      const curse = ctx.combat.curse ? CURSES[ctx.combat.curse] : undefined;
      const msg = applyHex(run, ctx.fortuneRng, a.hex!, handSize(run, maxLevel, curse?.handSizeDelta ?? 0));
      if (msg) {
        log(ctx, `${c.name} ${msg}`, 'warn');
        fx(ctx, { kind: 'hex', target: c.id, text: a.name });
        if (a.hex === 'drain') ctx.exp.flags.drainNext = 1;
      } else {
        // Nothing to hex — attack instead.
        const atk = m.actions.find((x) => x.kind === 'attack');
        if (atk) perform(ctx, c, atk);
      }
      return;
    }
    case 'summon': {
      const n = Object.keys(ctx.combat.combatants).length;
      const def = MONSTERS[a.summon!];
      if (!def || livingEnemies(ctx).length >= 5) return;
      const s = scaledMonster(ctx, a.summon!, n + 10);
      s.id = `s${n}${Math.floor(ctx.aiRng.next() * 1000)}`;
      s.hp = s.maxHp = Math.round(s.maxHp * 0.6);
      s.initiative = c.initiative - 0.5;
      ctx.combat.combatants[s.id] = s;
      const idx = ctx.combat.order.indexOf(c.id);
      ctx.combat.order.splice(idx + 1, 0, s.id);
      log(ctx, tx('combatAi.callsForthA', { cName: c.name, defName: def.name }), 'warn');
      return;
    }
  }
}

function attack(ctx: Ctx, c: Combatant, t: Combatant, a: MonsterAction) {
  const m = c.mon!;
  let adv = 0, dis = 0;
  if (has(t, 'reckless') || has(t, 'prone') && !a.ranged || has(t, 'restrained') || has(t, 'paralyzed') || has(t, 'stunned') || has(t, 'blinded')) adv++;
  if (has(t, 'prone') && a.ranged) dis++;
  if (has(t, 'dodging') || has(t, 'blurred') || has(t, 'invisible') || has(t, 'holyAura')) dis++;
  if (has(c, 'poisoned') || has(c, 'frightened') || has(c, 'blinded') || has(c, 'restrained') || has(c, 'prone')) dis++;
  if (has(c, 'faerieFire')) dis += 0;
  if (hasTrait(c, 'pack') && livingEnemies(ctx).some((e) => e.id !== c.id && e.rank === c.rank)) adv++;
  const th = heroOf(ctx, t)!;
  if (th.classId === 'rogue' && th.level >= 18) adv = 0;
  // Protection fighting style: an adjacent shield-bearing ally imposes disadvantage.
  const protector = livingHeroes(ctx).find((x) => x.id !== t.id && x.rank === t.rank && !x.used.reaction && heroOf(ctx, x)!.choices.fightingStyle?.includes('protection') && derive(heroOf(ctx, x)!).hasShield);
  if (protector) { dis++; protector.used.reaction = true; }
  const r = rollD20(ctx.aiRng, combineAdvantage(adv, dis));
  const bane = cond(c, 'baned');
  let bonus = m.attackBonus;
  if (bane) bonus -= roll(ctx.aiRng, '1d4').total;
  const ac = effectiveAc(ctx, t);
  const hit = r.natural === 20 || (r.natural !== 1 && r.natural + bonus >= ac);
  if (!hit) {
    log(ctx, tx('combatAi.sMisses', { cName: c.name, aName: a.name, tName: t.name }), 'miss');
    fx(ctx, { kind: 'miss', target: t.id, actor: c.id });
    return;
  }
  const crit = r.natural === 20;
  let dmg = dmgRoll(ctx, c, a, crit);
  // Defensive reactions, best first.
  const d = derive(th);
  if (!t.used.reaction) {
    if (th.classId === 'monk' && th.level >= 3 && (th.level >= 13 || ['bludgeoning', 'piercing', 'slashing'].includes(a.damageType ?? ''))) {
      const red = Math.round((roll(ctx.rng, '1d10').total + d.mods.dex + th.level) * VITALITY);
      dmg = Math.max(0, dmg - red); t.used.reaction = true;
      log(ctx, tx('combatAi.deflectsTheBlow', { tName: t.name, red }), 'info');
    } else if (th.classId === 'rogue' && th.level >= 5) {
      dmg = Math.round(dmg / 2); t.used.reaction = true;
      log(ctx, tx('combatAi.uncannyDodgeHalvesTheDamage', { tName: t.name }), 'info');
    } else if (th.ancestry === 'goliath' && (th.resources.stonesEndurance ?? 0) > 0 && dmg > t.maxHp * 0.15) {
      th.resources.stonesEndurance -= 1;
      const red = Math.round((roll(ctx.rng, '1d12').total + d.mods.con) * VITALITY);
      dmg = Math.max(0, dmg - red); t.used.reaction = true;
      log(ctx, tx('combatAi.sStoneSEnduranceAbsorbs', { tName: t.name, red }), 'info');
    }
  }
  // Cutting Words from a bard ally.
  const bard = livingHeroes(ctx).find((x) => !x.used.reaction && heroOf(ctx, x)!.classId === 'bard' && heroOf(ctx, x)!.level >= 3 && (heroOf(ctx, x)!.resources.inspiration ?? 0) > 0);
  if (bard && dmg > t.maxHp * 0.12) {
    const bh = heroOf(ctx, bard)!;
    bh.resources.inspiration -= 1;
    bard.used.reaction = true;
    const red = Math.round(roll(ctx.rng, `1d${derive(bh).inspirationDie}`).total * VITALITY);
    dmg = Math.max(0, dmg - red);
    log(ctx, tx('combatAi.sCuttingWordsBluntThe', { bardName: bard.name, red }), 'info');
  }
  // Interception.
  const interceptor = livingHeroes(ctx).find((x) => x.id !== t.id && !x.used.reaction && heroOf(ctx, x)!.choices.fightingStyle?.includes('interception'));
  if (interceptor && dmg > 0) {
    const ih = heroOf(ctx, interceptor)!;
    const red = Math.round((roll(ctx.rng, '1d10').total + derive(ih).pb) * VITALITY);
    dmg = Math.max(0, dmg - red); interceptor.used.reaction = true;
    log(ctx, tx('combatAi.intercepts', { interceptorName: interceptor.name, red }), 'info');
  }
  log(ctx, tx(crit ? 'combatAi.crits' : 'combatAi.hits', { attacker: c.name, action: a.name, target: t.name }), crit ? 'crit' : 'enemy');
  applyDamage(ctx, t, [{ type: a.damageType ?? 'bludgeoning', amount: dmg }], { source: c.name, attacker: c, crit, melee: !a.ranged });
  // Retaliation (Berserker 10).
  if (!a.ranged && !t.dead && !t.downed && d.features.has('retaliation') && !t.used.reaction && !c.dead) {
    t.used.reaction = true;
    const r2 = rollD20(ctx.rng).natural + d.main.toHit;
    if (r2 >= c.ac) {
      const amt = (roll(ctx.rng, d.main.dice).total + d.main.bonus + (has(t, 'raging') ? d.rageDamage : 0)) * ECHO;
      log(ctx, tx('combatAi.retaliates', { tName: t.name }), 'hit');
      applyDamage(ctx, c, [{ type: d.main.type, amount: amt }], { source: 'Retaliation', attacker: t, noFortune: true });
    }
  }
  // Multiattack Defense.
  if (d.features.has('defensiveTactics')) addCondition(ctx, c, { id: 'weakened', rounds: 1 });
}

export { enemies };
