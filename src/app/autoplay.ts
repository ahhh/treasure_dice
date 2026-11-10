/**
 * A reasonable headless player, used by tests and the balance simulator.
 * It plays through the same dispatch() commands as the UI.
 */
import type { GameState, RelDir, Facing, Hero } from '../engine/types.ts';
import { dispatch } from './commands.ts';
import { makeCtx, current, livingEnemies, livingHeroes, heroOf } from '../combat/core.ts';
import { listActions, legalTargets, type ActionOption } from '../combat/hero.ts';
import { previewHand } from '../fortune/scoring.ts';
import { HAND_RANK } from '../fortune/hands.ts';
import { CLASS_MATERIAL } from '../fortune/materials.ts';
import { heroColour } from '../fortune/dicepath.ts';
import { exitsView, eventOptions, absoluteDir } from '../dungeon/explore.ts';
import { DIRS, DELTA } from '../dungeon/generator.ts';
import { derive, choiceOptions } from '../rules/character.ts';
import { CLASSES } from '../content/classes.ts';
import { featuresAt } from '../content/subclasses.ts';
import { offerNeedsTarget } from '../fortune/boons.ts';
import { charmSlots } from '../fortune/tray.ts';
import type { LevelChoices } from '../meta/town.ts';
import { Rng } from '../engine/rng.ts';

const DEBUG = !!(globalThis as { process?: { env?: Record<string, string> } }).process?.env?.TD_DEBUG;

/** Best subset of up to `limit` tray dice by previewed score. */
export function bestDice(g: GameState, limit = 5, base = 8): { dice: number[]; score: number; rank: number } {
  const exp = g.expedition!;
  const run = exp.fortune;
  const ctx = makeCtx(g);
  const actor = current(ctx);
  const h = actor ? heroOf(ctx, actor) : undefined;
  const n = run.tray.length;
  let best = { dice: [] as number[], score: 0, rank: -1 };
  const idx = [...Array(n).keys()].filter((i) => !run.tray[i].jinxed);
  const rng = new Rng([1, 2, 3, 4]);
  const subsets = (arr: number[], k: number): number[][] => {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    return [...subsets(rest, k - 1).map((s) => [first, ...s]), ...subsets(rest, k)];
  };
  for (let k = 1; k <= Math.min(limit, idx.length); k++) {
    for (const s of subsets(idx, k)) {
      const p = previewHand({ run, trayIndices: s, actor: { classId: h?.classId ?? 'fighter', level: h?.level ?? 1, hpFrac: 1, affinity: h ? heroColour(h) : CLASS_MATERIAL.fighter }, action: 'attack', base, baseLabel: '', rng, firstHand: false, marked: false, enemiesAlive: 2, curse: exp.combat?.curse });
      // Only commit the scoring dice: unscored dice stay on the tray for allies.
      const scoringOnly = p.scoringDice.length === s.length;
      const val = p.total - (scoringOnly ? 0 : 1);
      if (val > best.score) best = { dice: s, score: val, rank: HAND_RANK[p.hand] };
    }
  }
  return best;
}

/** Options this hero already took this turn (so free/bonus openers don't repeat). */
const tookThisTurn = { stamp: '', keys: new Set<string>() };

function pickAction(g: GameState): { opt: ActionOption; targets: string[]; slot?: number } | null {
  const ctx = makeCtx(g);
  const c = current(ctx)!;
  const h = heroOf(ctx, c)!;
  const opts = listActions(ctx).filter((o) => o.usable && !tookThisTurn.keys.has(o.key));
  const enemies = livingEnemies(ctx);
  const allies = livingHeroes(ctx);
  const weakest = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const downed = ctx.combat.order.map((id) => ctx.combat.combatants[id]).find((x) => x.side === 'hero' && x.downed && !x.dead);
  const pickEnemy = (o: ActionOption) => {
    const legal = legalTargets(ctx, o.target, !!o.melee);
    return legal.slice().sort((a, b) => a.hp - b.hp)[0];
  };
  const byKey = (k: string) => opts.find((o) => o.key === k);
  // Emergency heals.
  if (downed || (weakest && weakest.hp / weakest.maxHp < 0.35)) {
    const heals = opts.filter((o) => o.fortune === 'heal' && (o.target === 'ally' || o.target === 'allies' || (o.target === 'self' && weakest.id === c.id)));
    const hw = heals.find((o) => o.key === 'spell:healingWord') ?? heals.find((o) => o.cost === 'bonus') ?? heals[0];
    const lay = byKey('feat:layOnHands');
    const tgt = downed ?? weakest;
    if (hw) return { opt: hw, targets: [tgt.id], slot: hw.slots?.[0] };
    if (lay) return { opt: lay, targets: [tgt.id] };
    const pot = opts.find((o) => o.group === 'item' && o.fortune === 'heal');
    if (pot && (downed || tgt.id === c.id)) return { opt: pot, targets: [tgt.id] };
  }
  // Openers.
  for (const k of ['feat:rage', 'spell:huntersMark', 'spell:hex', 'feat:innateSorcery', 'feat:sacredWeapon', 'feat:inspire']) {
    const o = byKey(k);
    if (o && ctx.combat.round <= 2) return { opt: o, targets: o.target === 'enemy' ? [pickEnemy(o)?.id].filter(Boolean) as string[] : [c.id] };
  }
  const opener = opts.find((o) => o.key.startsWith('feat:power:') && o.fortune === 'none' && (o.target === 'self' || o.target === 'allies' || o.target === 'enemies'));
  if (opener && ctx.combat.round <= 2) return { opt: opener, targets: [] };
  const reck = byKey('feat:reckless');
  if (reck) return { opt: reck, targets: [] };
  if (ctx.combat.round === 1 && byKey('spell:bless') && allies.length >= 2) return { opt: byKey('spell:bless')!, targets: [], slot: 1 };
  if (ctx.combat.round === 1 && byKey('spell:spiritGuardians')) return { opt: byKey('spell:spiritGuardians')!, targets: [enemies.find((e) => e.rank === 'front')?.id ?? enemies[0].id], slot: byKey('spell:spiritGuardians')!.slots?.[0] };
  // Damage: AoE when many foes, else the best single-target.
  const dmg = opts.filter((o) => (o.fortune === 'attack' || o.fortune === 'spell') && (o.cost === 'action' || (o.cost === 'bonus' && c.used.action)) && (o.group !== 'item'));
  if (!dmg.length) {
    const guard = byKey('guard');
    return guard ? { opt: guard, targets: [] } : null;
  }
  const scoreOpt = (o: ActionOption) => {
    const lvl = o.spellLevel ?? 0;
    const aoe = o.target === 'enemies' ? enemies.length : o.target === 'rank' ? Math.max(1, enemies.filter((e) => e.rank === 'front').length) : 1;
    let v = (o.group === 'attack' ? 10 + derive(h).attacks * 6 : 8 + lvl * 9) * aoe;
    if (lvl > 0) v -= lvl * (enemies.length <= 1 && !ctx.combat.kind.startsWith('boss') ? 6 : 2);
    if (o.key === 'smite' && ctx.combat.kind !== 'boss' && ctx.combat.kind !== 'elite') v -= 12;
    if (o.key.startsWith('feat:power:')) v += 6;
    return v;
  };
  const best = dmg.sort((a, b) => scoreOpt(b) - scoreOpt(a))[0];
  const tgt = best.target === 'enemy' || best.target === 'rank' ? pickEnemy(best) : undefined;
  return { opt: best, targets: tgt ? [tgt.id] : [], slot: best.slots?.[best.slots.length > 1 && ctx.combat.kind === 'boss' ? best.slots.length - 1 : 0] };
}

export function autoCombatStep(g: GameState): boolean {
  const exp = g.expedition!;
  const ctx = makeCtx(g);
  const c = current(ctx);
  if (!c || c.side !== 'hero' || !ctx.combat.turn) return false;
  const run = exp.fortune;
  // Shape the tray: reroll the non-scoring dice while the hand is weak.
  let guard = 0;
  while (run.rerollsLeft > 0 && guard++ < 4) {
    if (g.expedition?.combat?.status !== 'active') return true;
    const b = bestDice(g);
    if (b.rank >= HAND_RANK.three) break;
    const keep = new Set(b.dice);
    const toss = run.tray.map((_, i) => i).filter((i) => !keep.has(i) || run.tray[i].jinxed);
    if (!toss.length) break;
    const r = dispatch(g, { type: 'combat', cmd: { type: 'reroll', dice: toss } });
    if (!r.ok) break;
  }
  if (g.expedition?.combat?.status !== 'active' || !ctx.combat.turn) return true;
  const turnStamp = `${ctx.combat.id}:${ctx.combat.round}:${ctx.combat.turnIndex}`;
  if (tookThisTurn.stamp !== turnStamp) { tookThisTurn.stamp = turnStamp; tookThisTurn.keys.clear(); }
  const pick = pickAction(g);
  if (!pick) { dispatch(g, { type: 'combat', cmd: { type: 'endTurn' } }); return true; }
  const t = ctx.combat.turn;
  const limit = pick.opt.key === 'feat:flurry' ? 3 : t.playLimit;
  const dice = pick.opt.fortune !== 'none' && t.playsUsed < t.plays ? bestDice(g, limit).dice : [];
  const r = dispatch(g, { type: 'combat', cmd: { type: 'act', key: pick.opt.key, targets: pick.targets, dice, slot: pick.slot } });
  if (DEBUG) console.log('AUTOPLAY', c.name, pick.opt.key, dice, r.ok ? '' : r.error);
  if (!r.ok) {
    dispatch(g, { type: 'combat', cmd: { type: 'endTurn' } });
    return true;
  }
  // Keep going if the turn is still ours (bonus actions etc.), else end.
  const ctx2 = g.expedition?.combat ? makeCtx(g) : null;
  const sameTurn = (x: typeof ctx2) => !!x && x.combat.status === 'active' && x.combat.turn?.actorId === c.id && `${x.combat.id}:${x.combat.round}:${x.combat.turnIndex}` === turnStamp;
  // A free or bonus opener (Rage, Reckless, Hunter's Mark...) leaves the action: pick again.
  if (ctx2 && sameTurn(ctx2) && pick.opt.cost !== 'action' && !ctx2.combat.combatants[c.id].used.action) {
    tookThisTurn.keys.add(pick.opt.key);
    return true;
  }
  if (ctx2 && sameTurn(ctx2)) {
    const more = listActions(ctx2).filter((o) => o.usable && o.cost === 'bonus' && (o.fortune === 'attack' || o.fortune === 'heal') && o.key !== 'rank');
    if (more.length && !(more[0].fortune === 'heal' && c.hp > c.maxHp * 0.6)) {
      const o = more[0];
      const legal = legalTargets(ctx2, o.target, !!o.melee);
      const tg = o.fortune === 'heal' ? livingHeroes(ctx2).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] : legal[0];
      const rr = dispatch(g, { type: 'combat', cmd: { type: 'act', key: o.key, targets: tg ? [tg.id] : [], dice: [], slot: o.slots?.[0] } });
      if (!rr.ok) dispatch(g, { type: 'combat', cmd: { type: 'endTurn' } });
      else if (sameTurn(g.expedition?.combat ? makeCtx(g) : null)) dispatch(g, { type: 'combat', cmd: { type: 'endTurn' } });
    } else dispatch(g, { type: 'combat', cmd: { type: 'endTurn' } });
  }
  return true;
}

function pathTo(g: GameState, goal: (k: string) => boolean): Facing | null {
  const exp = g.expedition!;
  const start = exp.pos;
  const prev = new Map<string, { from: string; dir: Facing }>();
  const q = [start];
  const seen = new Set([start]);
  while (q.length) {
    const k = q.shift()!;
    if (k !== start && goal(k)) {
      let cur = k;
      while (prev.get(cur)!.from !== start) cur = prev.get(cur)!.from;
      return prev.get(cur)!.dir;
    }
    const room = exp.map.rooms[k];
    for (const d of DIRS) {
      const e = room.exits[d];
      if (!e || seen.has(e.to)) continue;
      if (e.hidden && !exp.searched.includes(`${k}:${d}`)) continue;
      if (e.lock === 'sigil' && !exp.keys.includes('sigil')) continue;
      if (e.lock === 'water' && exp.meter >= 1) continue;
      if (e.lock === 'mirror' && !exp.flags.mirrorOpen) continue;
      seen.add(e.to);
      prev.set(e.to, { from: k, dir: d });
      q.push(e.to);
    }
  }
  return null;
}

function relFor(g: GameState, dir: Facing): RelDir | null {
  const exp = g.expedition!;
  for (const r of ['forward', 'left', 'right', 'back'] as RelDir[]) if (absoluteDir(exp, r) === dir) return r;
  return null;
}

/** One exploration decision. Returns false when stuck. */
export function autoExploreStep(g: GameState): boolean {
  const exp = g.expedition!;
  if (exp.spoils) { dispatch(g, { type: 'closeSpoils' }); return true; }
  if (exp.lootChoice) { dispatch(g, { type: 'pickLoot', idx: 0 }); return true; }
  if (exp.boons) {
    const i = exp.boons.offers.findIndex((o) => !o.sold && !offerNeedsTarget(o));
    if (i >= 0) {
      const r = dispatch(g, { type: 'pickBoon', idx: i, replaceCharm: exp.fortune.charms.length >= charmSlots(exp.fortune) ? 0 : undefined });
      if (!r.ok) dispatch(g, { type: 'skipBoon' });
    } else {
      const j = exp.boons.offers.findIndex((o) => !o.sold);
      const o = exp.boons.offers[j];
      const need = offerNeedsTarget(o);
      const die = exp.fortune.bag.find((d) => d.material === 'bone') ?? exp.fortune.bag[0];
      const r = dispatch(g, { type: 'pickBoon', idx: j, dieUid: die.uid, face: need === 'face' ? 5 : undefined });
      if (!r.ok) dispatch(g, { type: 'skipBoon' });
    }
    return true;
  }
  if (exp.event) {
    if (exp.event.stage === 'choose') {
      const opts = eventOptions(g);
      const i = opts.findIndex((o) => o.usable && !o.success.some((s) => s.type === 'combat') && !o.label.startsWith('Leave') && !o.label.startsWith('Walk'));
      dispatch(g, { type: 'eventChoice', idx: i >= 0 ? i : opts.length - 1, useSpell: true });
    } else if (exp.event.stage === 'pickDie') {
      const die = exp.fortune.bag.find((d) => d.material === 'bone') ?? exp.fortune.bag[0];
      dispatch(g, { type: 'sacrifice', dieUid: die.uid });
    } else dispatch(g, { type: 'eventClose' });
    return true;
  }
  if (exp.shop) {
    const i = exp.shop.offers.findIndex((o) => !o.sold && (o.price ?? 0) <= exp.fortune.doubloons && o.kind === 'charm' && exp.fortune.charms.length < charmSlots(exp.fortune));
    if (i >= 0 && dispatch(g, { type: 'shopBuy', idx: i }).ok) return true;
    const j = exp.shop.offers.findIndex((o) => !o.sold && (o.price ?? 0) <= exp.fortune.doubloons && o.kind === 'omen' && exp.fortune.charms.length < charmSlots(exp.fortune));
    if (j >= 0 && dispatch(g, { type: 'shopBuy', idx: j }).ok) return true;
    dispatch(g, { type: 'shopClose' });
    return true;
  }
  const room = exp.map.rooms[exp.pos];
  if (room.loot && !room.loot.taken && (!room.encounter || room.encounter.cleared)) { dispatch(g, { type: 'takeLoot' }); return true; }
  if (room.type === 'camp') {
    const party = exp.partyIds.map((id) => g.roster.find((h) => h.id === id)!).filter((h) => h.status === 'alive');
    const frac = party.reduce((a, h) => a + h.hp / derive(h).maxHp, 0) / party.length;
    if (frac < 0.45 && !exp.longRestUsed) { dispatch(g, { type: 'rest', kind: 'long' }); return true; }
    if (frac < 0.85 && !exp.flags[`rested:${room.key}`]) { dispatch(g, { type: 'rest', kind: 'short' }); return true; }
  }
  // Use potions out of combat when hurt.
  for (const h of exp.partyIds.map((id) => g.roster.find((x) => x.id === id)!)) {
    if (h.status === 'alive' && h.hp < derive(h).maxHp * 0.35) {
      const pot = exp.carriedItems.find((i) => i.defId.startsWith('potion'));
      if (pot && dispatch(g, { type: 'useItem', uid: pot.uid, heroId: h.id }).ok) return true;
    }
  }
  if (exp.bossDefeated) { dispatch(g, { type: 'exitDungeon' }); return true; }
  // Navigate: unexplored rooms first (bias to key), then the boss.
  const wantKey = !exp.keys.includes('sigil');
  let dir = wantKey ? pathTo(g, (k) => exp.map.rooms[k].type === 'key' && !exp.visited.includes(k)) : null;
  if (!dir) dir = pathTo(g, (k) => !exp.visited.includes(k) && exp.map.rooms[k].type !== 'boss');
  if (!dir && !wantKey) dir = pathTo(g, (k) => k === exp.map.bossKey);
  if (!dir) {
    if (!exp.flags[`searched:${exp.pos}`]) { dispatch(g, { type: 'search' }); return true; }
    dir = pathTo(g, (k) => !exp.flags[`searched:${k}`]);
    if (!dir) return false;
  }
  const rel = relFor(g, dir);
  if (!rel) return false;
  const r = dispatch(g, { type: 'move', dir: rel });
  return r.ok;
}

export function autoLevelChoices(h: Hero): LevelChoices {
  const next = h.level + 1;
  const feats = featuresAt(h, next);
  const ch: LevelChoices = { picks: {} };
  for (const f of feats) {
    if (!f.choice) continue;
    if (f.choice === 'asi') {
      const a = CLASSES[h.classId].arrayOrder.find((x) => h.abilities[x] <= 18) ?? CLASSES[h.classId].arrayOrder[0];
      ch.asi = h.abilities[a] <= 18 ? { mode: 'plus2', a } : { mode: 'feat', feat: h.feats.includes('tough') ? 'alert' : 'tough' };
    } else if (f.choice === 'expertise') ch.expertise = h.skillProfs.filter((s) => !h.expertise.includes(s)).slice(0, f.choiceCount ?? 2);
    else ch.picks![f.choice] = choiceOptions({ ...h, level: next }, f.choice).filter((o) => !(h.choices[f.choice!] ?? []).includes(o)).slice(0, f.choiceCount ?? 1);
  }
  return ch;
}

export interface RunReport { result: 'won' | 'retreated' | 'wiped' | 'stuck'; combats: number; steps: number; bestScore: number; rank: number; charms: number; turns: number }

/** Play one whole expedition headlessly. */
export function autoExpedition(g: GameState, maxSteps = 4000): RunReport {
  let steps = 0;
  let turns = 0;
  let stuck = 0;
  while (g.expedition && steps++ < maxSteps) {
    const exp = g.expedition;
    if (exp.combat && exp.combat.status === 'active') {
      if (!autoCombatStep(g)) { stuck++; if (stuck > 5) break; } else { stuck = 0; turns++; }
      continue;
    }
    if (!autoExploreStep(g)) { stuck++; if (stuck > 3) break; } else stuck = 0;
  }
  const res = g.lastResult;
  return {
    result: g.expedition ? 'stuck' : res?.kind ?? 'stuck', combats: 0, steps, bestScore: res?.score ?? 0,
    rank: 0, charms: 0, turns,
  };
}

export { DELTA, exitsView };
