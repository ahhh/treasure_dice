/**
 * Hero turns: the command menu (Attack / Skills / Magic / Items / Guard),
 * Fortune Tray interactions (reroll, talents, tokens), and resolution of every
 * hero ability through the shared (base + chips) × mult pipeline.
 */
import type { Combatant, Hero, HandType, ConditionId, DamageType, Rank } from '../engine/types.ts';
import { roll, rollD20, combineAdvantage, average } from '../engine/dice.ts';
import {
  type Ctx, heroOf, log, fx, livingEnemies, livingHeroes, heroes, has, cond, addCondition, removeCondition,
  applyDamage, heal, savingThrow, endConcentration, advance, incapacitated, alive, kill, type DmgPart, enemies,
} from './core.ts';
import { derive, type Derived, type WeaponProfile } from '../rules/character.ts';
import { castableSpells, SPELLS, upcastDice, type SpellDef } from '../content/spells.ts';
import { ITEMS } from '../content/items.ts';
import { CLASS_MATERIAL } from '../fortune/materials.ts';
import { scoreHand, previewHand, type ScoreOutput } from '../fortune/scoring.ts';
import { reroll as trayReroll, spendDice, rerollsPerTurn, handSize, nudge, flip, forceValue, addGhostDie, faceValue, rollTrayDie } from '../fortune/tray.ts';
import { charmPassives } from '../fortune/charms.ts';
import { CURSES } from '../fortune/curses.ts';
import { HAND_RANK, handContains } from '../fortune/hands.ts';
import { VITALITY, ECHO, HEAL_MULT_SLOPE } from '../rules/balance.ts';
import { METAMAGIC } from '../content/classes.ts';
import type { Effect, PlayedDie } from '../fortune/charms.ts';

export type FortuneUse = 'attack' | 'spell' | 'heal' | 'guard' | 'dc' | 'none';
export type TargetKind = 'enemy' | 'enemies' | 'rank' | 'ally' | 'allies' | 'self' | 'fallenAlly';

export interface ActionOption {
  key: string;
  group: 'attack' | 'skill' | 'magic' | 'item' | 'guard';
  name: string;
  text: string;
  cost: 'action' | 'bonus' | 'free';
  target: TargetKind;
  usable: boolean;
  reason?: string;
  fortune: FortuneUse;
  slots?: number[];
  melee?: boolean;
  spellLevel?: number;
  resource?: string;
}

export type CombatCmd =
  | { type: 'reroll'; dice: number[] }
  | { type: 'act'; key: string; targets: string[]; dice: number[]; slot?: number; meta?: string[] }
  | { type: 'talent'; id: string; die?: number; value?: number; delta?: 1 | -1 }
  | { type: 'token'; id: string; die?: number; value?: number }
  | { type: 'rank' }
  | { type: 'endTurn' };

export interface CmdResult { ok: boolean; error?: string; score?: ScoreOutput }

const RES_NAME: Record<string, string> = {
  rage: 'Rage', secondWind: 'Second Wind', actionSurge: 'Action Surge', channel: 'Channel Divinity', layOnHands: 'Lay on Hands',
  inspiration: 'Inspiration', wildShape: 'Wild Shape', focus: 'Focus', sorcery: 'Sorcery Points', innateSorcery: 'Innate Sorcery',
};

// ── turn start ──────────────────────────────────────────────────────────────

export function heroTurnStart(ctx: Ctx, c: Combatant) {
  const h = heroOf(ctx, c)!;
  const d = derive(h);
  const run = ctx.exp.fortune;
  const curse = ctx.combat.curse ? CURSES[ctx.combat.curse] : undefined;
  let bonus = d.rerollBonus;
  if (ctx.exp.biome === 'starfall' && ctx.exp.meter > 0) bonus += 1;
  run.rerollsLeft = rerollsPerTurn(run, bonus, curse?.rerollDelta ?? 0);
  const plays = 1 + (has(c, 'hasted') ? 1 : 0);
  ctx.combat.turn = { actorId: c.id, plays, playsUsed: 0, playLimit: 5, flags: {} };
  // Refill the tray in case curses/hexes shrank it.
  const maxLevel = Math.max(...heroes(ctx).map((x) => x.level));
  const size = handSize(run, maxLevel, curse?.handSizeDelta ?? 0);
  if (run.tray.length < size) {
    // refill happens via spendDice with nothing spent
    spendDice(run, ctx.fortuneRng, [], size);
  }
  log(ctx, `${c.name}'s turn.`, 'info');
}

function trayLimit(ctx: Ctx): number {
  const curse = ctx.combat.curse ? CURSES[ctx.combat.curse] : undefined;
  const maxLevel = Math.max(...heroes(ctx).map((x) => x.level));
  return handSize(ctx.exp.fortune, maxLevel, curse?.handSizeDelta ?? 0);
}

// ── helpers ─────────────────────────────────────────────────────────────────

function actor(ctx: Ctx): { c: Combatant; h: Hero; d: Derived } | null {
  const t = ctx.combat.turn;
  if (!t) return null;
  const c = ctx.combat.combatants[t.actorId];
  const h = heroOf(ctx, c);
  if (!c || !h) return null;
  return { c, h, d: derive(h) };
}

function frontEnemies(ctx: Ctx) {
  return livingEnemies(ctx).filter((e) => e.rank === 'front' && !has(e, 'banished'));
}

/** Melee can reach the front rank, or anything once the front is clear. */
export function legalTargets(ctx: Ctx, kind: TargetKind, melee: boolean): Combatant[] {
  switch (kind) {
    case 'enemy': {
      const live = livingEnemies(ctx).filter((e) => !has(e, 'banished'));
      if (!melee) return live;
      const front = frontEnemies(ctx);
      return front.length ? front : live;
    }
    case 'enemies': case 'rank': return livingEnemies(ctx);
    case 'ally': return heroes(ctx).filter((x) => !x.dead);
    case 'allies': case 'self': return livingHeroes(ctx);
    case 'fallenAlly': return heroes(ctx).filter((x) => x.dead && ctx.combat.diedThisFight.includes(x.id));
  }
}

function costFree(ctx: Ctx, c: Combatant, cost: ActionOption['cost']): string | null {
  if (cost === 'action' && c.used.action) return 'Action already used';
  if (cost === 'bonus' && c.used.bonus) return 'Bonus action already used';
  void ctx;
  return null;
}

function spend(ctx: Ctx, c: Combatant, cost: ActionOption['cost']) {
  if (cost === 'action') {
    const t = ctx.combat.turn!;
    if ((t.extraActions ?? 0) > 0) { t.extraActions! -= 1; return; }
    c.used.action = true;
  } else if (cost === 'bonus') c.used.bonus = true;
}

function slotOptions(h: Hero, spell: SpellDef): number[] {
  if (spell.level === 0) return [0];
  const out: number[] = [];
  for (let l = spell.level; l <= 9; l++) if ((h.slots[l] ?? 0) > 0) out.push(l);
  if (h.classId === 'warlock' && spell.level >= 6) {
    const r = h.resources[`arcanum${spell.level}`] ?? 0;
    if (r > 0) out.push(spell.level);
  }
  return [...new Set(out)];
}

function freeCast(h: Hero, spell: SpellDef): string | null {
  if (spell.id === 'huntersMark' && (h.resources.favoredEnemy ?? 0) > 0) return 'favoredEnemy';
  if (spell.id === 'divineSmite' && (h.resources.freeSmite ?? 0) > 0) return 'freeSmite';
  return null;
}

// ── option list (UI) ────────────────────────────────────────────────────────

export function listActions(ctx: Ctx): ActionOption[] {
  const a = actor(ctx);
  if (!a) return [];
  const { c, h, d } = a;
  const out: ActionOption[] = [];
  const add = (o: Omit<ActionOption, 'usable' | 'reason'> & { usable?: boolean; reason?: string | null }, reason?: string | null) => {
    const r = reason ?? costFree(ctx, c, o.cost);
    out.push({ ...o, usable: o.usable !== false && !r, reason: r ?? undefined });
  };
  const wild = has(c, 'wildShape');
  const meleeMain = !d.main.ranged;
  const backMelee = meleeMain && c.rank === 'back' && !d.main.reach && frontEnemies(ctx).length > 0;

  // Attacks.
  add({ key: 'attack', group: 'attack', name: wild ? 'Beast Strike' : `Attack — ${d.main.name}`, text: attackText(d, wild), cost: 'action', target: 'enemy', fortune: 'attack', melee: meleeMain || wild },
    backMelee && !wild ? 'Back rank: move forward or use a ranged weapon' : null);
  if (d.offhand && d.offhand.light && !wild) add({ key: 'offhand', group: 'attack', name: `Off-hand — ${d.offhand.name}`, text: 'Bonus Action: one attack with your off-hand weapon.', cost: 'bonus', target: 'enemy', fortune: 'attack', melee: !d.offhand.ranged });
  if (h.classId === 'monk' && !wild) add({ key: 'martialArts', group: 'attack', name: 'Martial Arts Strike', text: `Bonus Action: an unarmed strike (1d${d.martialArtsDie}).`, cost: 'bonus', target: 'enemy', fortune: 'attack', melee: true });
  if (h.classId === 'paladin' && h.level >= 2 && !wild) {
    const sm = SPELLS.divineSmite;
    const slots = slotOptions(h, sm);
    const free = freeCast(h, sm);
    add({ key: 'smite', group: 'attack', name: 'Smite Attack', text: 'Attack, and on the first hit spend a slot: +2d8 radiant (+1d8 per slot above 1st, +1d8 vs fiends/undead). Oath Seal: +1 Mult per slot level.', cost: 'action', target: 'enemy', fortune: 'attack', melee: true, slots: free ? [1, ...slots] : slots },
      c.used.bonus ? 'Needs your bonus action too' : !slots.length && !free ? 'No spell slots' : backMelee ? 'Back rank' : null);
  }
  if (h.classId === 'monk' && h.level >= 5) add({ key: 'stunningStrike', group: 'attack', name: 'Stunning Strike', text: '1 Focus: attack; on the first hit the target makes a CON save or is stunned.', cost: 'action', target: 'enemy', fortune: 'attack', melee: true, resource: 'focus' }, (h.resources.focus ?? 0) < 1 ? 'No Focus' : backMelee ? 'Back rank' : null);
  if (h.classId === 'monk' && h.level >= 17) add({ key: 'quiveringPalm', group: 'attack', name: 'Quivering Palm', text: '4 Focus: on hit, CON save or 10d12 force (half on success).', cost: 'action', target: 'enemy', fortune: 'attack', melee: true }, (h.resources.focus ?? 0) < 4 ? 'Needs 4 Focus' : null);
  if (h.classId === 'rogue' && h.level >= 5) {
    add({ key: 'cunning:poison', group: 'attack', name: 'Cunning Strike: Poison', text: 'Attack; trade a Sneak Attack die to poison the target (CON save).', cost: 'action', target: 'enemy', fortune: 'attack', melee: meleeMain }, backMelee ? 'Back rank' : null);
    add({ key: 'cunning:trip', group: 'attack', name: 'Cunning Strike: Trip', text: 'Attack; trade a Sneak Attack die to knock the target prone (DEX save).', cost: 'action', target: 'enemy', fortune: 'attack', melee: meleeMain }, backMelee ? 'Back rank' : null);
  }
  if (h.classId === 'barbarian' && h.level >= 9) add({ key: 'brutalStrike', group: 'attack', name: 'Brutal Strike', text: `While Reckless: forgo advantage on one attack for +${h.level >= 17 ? '2d10' : '1d10'} and push the target back.`, cost: 'action', target: 'enemy', fortune: 'attack', melee: true }, !has(c, 'reckless') ? 'Requires Reckless Attack this turn' : backMelee ? 'Back rank' : null);
  if (h.classId === 'ranger' && h.level >= 11) add({ key: 'volley', group: 'attack', name: 'Volley', text: 'Ranged attack against every foe in one rank.', cost: 'action', target: 'rank', fortune: 'attack' }, !d.main.ranged ? 'Needs a ranged weapon' : null);

  // Skills (class features).
  for (const o of featureActions(ctx, c, h, d)) add(o, o.reason);

  // Magic.
  if (!wild || h.level >= 18) {
    for (const s of castableSpells(h)) {
      if (s.id === 'divineSmite') continue;
      if (s.special === 'utility') continue;
      const slots = slotOptions(h, s);
      const free = freeCast(h, s);
      const cost = s.cost === 'reaction' ? 'bonus' : s.cost;
      let reason: string | null = null;
      if (s.level > 0 && !slots.length && !free) reason = 'No spell slots';
      if (s.melee && c.rank === 'back' && frontEnemies(ctx).length > 0 && s.id !== 'thornWhip') reason = reason ?? 'Touch spell: move to the front';
      if (s.target === 'fallenAlly' && !legalTargets(ctx, 'fallenAlly', false).length) reason = reason ?? 'No ally has fallen this fight';
      if (s.special === 'revivify' && ctx.exp.carriedGold < 300) reason = reason ?? 'Needs 300 carried gold';
      if (s.special === 'raiseDead' || s.special === 'revivifyFull') reason = reason ?? (s.special === 'raiseDead' ? 'Cast at a safe room' : null);
      const fortune = spellFortune(s);
      add({
        key: `spell:${s.id}`, group: 'magic', name: s.name + (s.level ? ` (${ordinal(s.level)})` : ' (cantrip)'), text: s.text, cost, target: s.target,
        fortune, slots: free ? [s.level, ...slots] : slots, melee: s.melee, spellLevel: s.level,
      }, reason);
    }
  }

  // Items.
  const fast = h.classId === 'rogue' && h.level >= 3;
  for (const inst of ctx.exp.carriedItems) {
    const def = ITEMS[inst.defId];
    if (!def?.consumable?.combat) continue;
    const cons = def.consumable;
    let target: TargetKind = cons.target === 'party' ? 'self' : cons.target === 'enemies' ? 'enemies' : cons.target;
    if (cons.effect === 'scroll' && cons.spell) target = SPELLS[cons.spell].target;
    let reason: string | null = null;
    if (cons.effect === 'smoke' && ctx.combat.kind === 'boss') reason = 'Cannot flee a boss';
    if (cons.effect === 'scroll' && cons.spell === 'revivify' && !legalTargets(ctx, 'fallenAlly', false).length) reason = 'No ally has fallen this fight';
    add({ key: `item:${inst.uid}`, group: 'item', name: `${def.name}${inst.qty && inst.qty > 1 ? ` ×${inst.qty}` : ''}`, text: def.text ?? '', cost: fast ? 'bonus' : 'action', target, fortune: cons.effect === 'heal' ? 'heal' : cons.effect === 'bomb' || cons.effect === 'holy' ? 'spell' : cons.effect === 'scroll' && cons.spell ? spellFortune(SPELLS[cons.spell]) : 'none' }, reason);
  }

  // Guard.
  add({ key: 'guard', group: 'guard', name: 'Guard', text: '+2 AC until your next turn and gain Ward (temp HP) scaled by your Fortune hand. Foes are drawn to guarding heroes in the front.', cost: 'action', target: 'self', fortune: 'guard' });
  const freeMove = (h.classId === 'barbarian' && h.level >= 5) || (h.classId === 'monk' && h.level >= 9);
  add({ key: 'rank', group: 'guard', name: c.rank === 'front' ? 'Fall Back' : 'Step Forward', text: freeMove ? 'Switch ranks (free for you).' : 'Switch ranks.', cost: freeMove ? 'free' : 'bonus', target: 'self', fortune: 'none' },
    ctx.combat.turn!.flags.moved ? 'Already moved this turn' : has(c, 'restrained') ? 'Restrained' : null);
  return out;
}

function ordinal(n: number) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

function attackText(d: Derived, wild: boolean): string {
  if (wild) return 'Claws and fangs: 1d8 + WIS per attack.';
  const n = d.attacks;
  return `${n > 1 ? `${n} attacks` : '1 attack'}: +${d.main.toHit} to hit, ${d.main.dice}${d.main.bonus >= 0 ? '+' : ''}${d.main.bonus} ${d.main.type}${d.main.mastery ? ` · ${d.main.mastery}` : ''}.`;
}

export function spellFortune(s: SpellDef): FortuneUse {
  switch (s.kind) {
    case 'attack': case 'save': case 'auto': case 'zone': return 'spell';
    case 'heal': return 'heal';
    case 'debuff': return s.save ? 'dc' : 'none';
    case 'special':
      if (s.special === 'spiritualWeapon' || s.special === 'smite' || s.special === 'pwKill') return 'spell';
      return 'none';
    default: return 'none';
  }
}

function featureActions(ctx: Ctx, c: Combatant, h: Hero, d: Derived): (Omit<ActionOption, 'usable' | 'reason'> & { reason?: string | null })[] {
  const out: (Omit<ActionOption, 'usable' | 'reason'> & { reason?: string | null })[] = [];
  const r = (id: string) => h.resources[id] ?? 0;
  const F = d.features;
  const t = ctx.combat.turn!;
  const o = (key: string, name: string, text: string, cost: ActionOption['cost'], target: TargetKind, fortune: FortuneUse, reason: string | null = null, resource?: string) =>
    out.push({ key: `feat:${key}`, group: 'skill', name, text, cost, target, fortune, reason, resource });
  if (F.has('rage')) o('rage', 'Rage', `+${d.rageDamage} damage on Strength attacks; resist physical damage.`, 'bonus', 'self', 'none', has(c, 'raging') ? 'Already raging' : r('rage') < 1 ? 'No Rage left' : d.armored && ITEMS[h.equipment.armor!.defId]?.armor?.type === 'heavy' ? 'Heavy armor' : null, 'rage');
  if (F.has('recklessAttack')) o('reckless', 'Reckless Attack', 'Advantage on your attacks this turn; foes have advantage against you.', 'free', 'self', 'none', has(c, 'reckless') ? 'Already reckless' : null);
  if (F.has('secondWind')) o('secondWind', 'Second Wind', `Heal 1d10 + ${h.level} (× vitality).`, 'bonus', 'self', 'heal', r('secondWind') < 1 ? 'No uses left' : null, 'secondWind');
  if (F.has('actionSurge')) o('actionSurge', 'Action Surge', 'Regain your action and gain an extra Fortune play.', 'free', 'self', 'none', r('actionSurge') < 1 ? 'No uses left' : t.flags.surged ? 'Once per turn' : !c.used.action ? 'Use your action first' : null, 'actionSurge');
  if (F.has('layOnHands')) o('layOnHands', 'Lay on Hands', `Heal from a pool of ${r('layOnHands')} (× vitality).${h.level >= 14 ? ' Removes conditions.' : ''}`, 'bonus', 'ally', 'none', r('layOnHands') < 1 ? 'Pool empty' : null, 'layOnHands');
  if (F.has('divineSpark')) {
    const n = h.level >= 18 ? 4 : h.level >= 13 ? 3 : h.level >= 7 ? 2 : 1;
    o('sparkHeal', 'Divine Spark (Heal)', `Heal ${n}d8 + WIS.`, 'action', 'ally', 'heal', r('channel') < 1 ? 'No Channel Divinity' : null, 'channel');
    o('sparkHarm', 'Divine Spark (Smite)', `${n}d8 + WIS radiant, CON save for half.`, 'action', 'enemy', 'spell', r('channel') < 1 ? 'No Channel Divinity' : null, 'channel');
  }
  if (F.has('turnUndead')) o('turnUndead', 'Turn Undead', 'Undead make a WIS save or flee in terror (frightened, incapacitated).', 'action', 'enemies', 'dc', r('channel') < 1 ? 'No Channel Divinity' : !livingEnemies(ctx).some((e) => e.mon?.tags.includes('undead')) ? 'No undead here' : null, 'channel');
  if (F.has('preserveLife')) o('preserveLife', 'Preserve Life', `Restore ${5 * h.level} (× vitality) HP split among wounded allies.`, 'action', 'allies', 'none', r('channel') < 1 ? 'No Channel Divinity' : null, 'channel');
  if (F.has('sacredWeapon')) o('sacredWeapon', 'Sacred Weapon', `+${Math.max(1, d.mods.cha)} to attack rolls for 10 rounds.`, 'bonus', 'self', 'none', r('channel') < 1 ? 'No Channel Divinity' : has(c, 'sacredWeapon') ? 'Active' : null, 'channel');
  if (F.has('abjureFoes')) o('abjureFoes', 'Abjure Foes', 'Foes make a WIS save or are frightened.', 'action', 'enemies', 'dc', r('channel') < 1 ? 'No Channel Divinity' : null, 'channel');
  if (F.has('bardicInspiration')) o('inspire', 'Bardic Inspiration', `Add a d${d.inspirationDie} Inspiration die to the Fortune Tray.`, 'bonus', 'self', 'none', r('inspiration') < 1 ? 'No Inspiration left' : null, 'inspiration');
  if (F.has('wildShape')) {
    o('wildShape', has(c, 'wildShape') ? 'Revert Form' : 'Wild Shape', has(c, 'wildShape') ? 'Return to your normal form.' : `Become a beast: ${h.level * 2} × vitality temp HP; claws 1d8 + WIS.`, 'bonus', 'self', 'none', !has(c, 'wildShape') && r('wildShape') < 1 ? 'No Wild Shape left' : null, 'wildShape');
    if (F.has('landsAid')) o('landsAid', "Land's Aid", 'Spend Wild Shape: a rank of foes takes necrotic damage (CON half) and an ally heals.', 'action', 'rank', 'spell', r('wildShape') < 1 ? 'No Wild Shape left' : null, 'wildShape');
  }
  if (F.has('wildResurgence')) o('wildResurgence', 'Wild Resurgence', 'Spend your lowest spell slot to regain a Wild Shape use.', 'free', 'self', 'none', t.flags.resurgence ? 'Once per turn' : !h.slots.some((x, i) => i > 0 && x > 0) ? 'No slots' : null);
  if (F.has('flurryOfBlows')) o('flurry', 'Flurry of Blows', `1 Focus: ${h.level >= 10 ? 'three' : 'two'} unarmed strikes — plays a second hand of up to 3 dice.`, 'bonus', 'enemy', 'attack', r('focus') < 1 ? 'No Focus' : c.rank === 'back' && frontEnemies(ctx).length ? 'Back rank' : null, 'focus');
  if (F.has('patientDefense')) o('patientDefense', 'Patient Defense', '1 Focus: Dodge until your next turn.', 'bonus', 'self', 'none', r('focus') < 1 ? 'No Focus' : null, 'focus');
  if (F.has('wholenessOfBody')) o('wholeness', 'Wholeness of Body', `Heal 1d${d.martialArtsDie} + WIS (× vitality).`, 'bonus', 'self', 'heal', r('wholeness') < 1 ? 'No uses' : null, 'wholeness');
  if (F.has('superiorDefense')) o('superiorDefense', 'Superior Defense', '3 Focus: resist all damage but force.', 'free', 'self', 'none', r('focus') < 3 ? 'Needs 3 Focus' : has(c, 'superiorDefense') ? 'Active' : null, 'focus');
  if (F.has('cunningAction')) o('hide', 'Cunning Action: Hide', 'Your next attack has advantage.', 'bonus', 'self', 'none', has(c, 'hidden') ? 'Already hidden' : null);
  if (F.has('steadyAim')) o('steadyAim', 'Steady Aim', 'Advantage on your next attack.', 'bonus', 'self', 'none', has(c, 'hidden') ? 'Already aiming' : null);
  if (F.has('innateSorcery')) o('innateSorcery', 'Innate Sorcery', '+1 spell DC and advantage on spell attacks for 10 rounds.', 'bonus', 'self', 'none', r('innateSorcery') < 1 ? 'No uses' : has(c, 'innateSorcery') ? 'Active' : null, 'innateSorcery');
  if (F.has('hurlThroughHell')) o('hurl', 'Hurl Through Hell', '8d10 psychic; CHA save negates.', 'action', 'enemy', 'spell', r('hurl') < 1 ? 'Used' : null, 'hurl');
  if (F.has('tireless')) o('tireless', 'Tireless', 'Gain 1d8 + WIS temp HP (× vitality).', 'action', 'self', 'none', r('tireless') < 1 ? 'No uses' : null, 'tireless');
  if (F.has('naturesVeil')) o('naturesVeil', "Nature's Veil", 'Become invisible until your next turn ends.', 'bonus', 'self', 'none', ctx.combat.once[`${h.id}:veil`] ? 'Once per fight' : null);
  if (F.has('intimidatingPresence')) o('intimidate', 'Intimidating Presence', 'Foes make a WIS save or are frightened.', 'bonus', 'enemies', 'dc', r('intimidate') < 1 ? 'Used' : null, 'intimidate');
  if (F.has('divineIntervention')) o('intervention', 'Divine Intervention', `Heal the party to at least half HP and cleanse them${h.level >= 20 ? '; revive the fallen' : ''}.`, 'action', 'allies', 'none', r('intervention') < 1 ? 'Used' : null, 'intervention');
  if (F.has('holyNimbus')) o('nimbus', 'Holy Nimbus', 'Radiant aura scorches foes each turn; advantage on saves.', 'bonus', 'self', 'none', ctx.combat.once[`${h.id}:nimbus`] || ctx.exp.flags[`nimbus:${h.id}`] ? 'Once per rest' : null);
  if (h.ancestry === 'dragonborn') {
    const n = h.level >= 17 ? 4 : h.level >= 11 ? 3 : h.level >= 5 ? 2 : 1;
    o('breath', 'Breath Weapon', `A rank of foes: DEX save, ${n}d10 fire.`, 'action', 'rank', 'spell', r('breath') < 1 ? 'No uses' : null, 'breath');
  }
  return out;
}

// ── Fortune tray commands ───────────────────────────────────────────────────

export function doReroll(ctx: Ctx, dice: number[]): CmdResult {
  const a = actor(ctx);
  if (!a) return { ok: false, error: 'No active hero' };
  const run = ctx.exp.fortune;
  const curse = ctx.combat.curse ? CURSES[ctx.combat.curse] : undefined;
  const valid = dice.filter((i) => run.tray[i]);
  if (!valid.length) return { ok: false, error: 'Select dice to reroll' };
  let viaBlood = false;
  if (run.rerollsLeft <= 0) {
    // Barbarian Blood Dice.
    if (a.h.classId === 'barbarian' && has(a.c, 'raging')) {
      const cost = Math.round((2 + a.h.level) * VITALITY);
      if (a.c.hp <= cost) return { ok: false, error: 'Too wounded to bleed for luck' };
      a.c.hp -= cost;
      log(ctx, `${a.c.name} bleeds for luck (−${cost} HP).`, 'fortune');
      run.rerollsLeft += 1;
      viaBlood = true;
    } else return { ok: false, error: 'No rerolls left' };
  }
  trayReroll(run, ctx.fortuneRng, valid);
  // Mirror rooms: reflections invert some rerolled dice.
  if (ctx.exp.biome === 'mirror' && ctx.exp.map.rooms[ctx.combat.roomKey]?.tags.includes('mirror')) {
    for (const i of valid) if (ctx.fortuneRng.chance(0.25)) flip(run, i);
  }
  ctx.combat.rerollsUsed += 1;
  if (curse?.rerollHpCost && !viaBlood) {
    const cost = Math.max(1, Math.round(a.c.maxHp * curse.rerollHpCost));
    applyDamage(ctx, a.c, [{ type: 'necrotic', amount: cost }], { source: curse.name, noFortune: true });
  }
  return { ok: true };
}

export function doTalent(ctx: Ctx, cmd: { id: string; die?: number; value?: number; delta?: 1 | -1 }): CmdResult {
  const a = actor(ctx);
  if (!a) return { ok: false, error: 'No active hero' };
  const { c, h } = a;
  const run = ctx.exp.fortune;
  const t = ctx.combat.turn!;
  const die = cmd.die ?? -1;
  const td = run.tray[die];
  const onceKey = `${h.id}:${cmd.id}`;
  switch (cmd.id) {
    case 'steadyHand': {
      if (h.classId !== 'fighter') return { ok: false, error: 'Fighters only' };
      if (t.flags.steadyHand) return { ok: false, error: 'Once per turn' };
      if (!td) return { ok: false, error: 'Pick a die' };
      if (!nudge(run, die, cmd.delta ?? 1)) return { ok: false, error: 'That die has no such face' };
      t.flags.steadyHand = true;
      log(ctx, `${c.name} nudges a die to ${faceValue(run, td)} (Steady Hand).`, 'fortune');
      return { ok: true };
    }
    case 'sanctify': {
      if (h.classId !== 'cleric') return { ok: false, error: 'Clerics only' };
      if (ctx.combat.once[onceKey]) return { ok: false, error: 'Once per combat' };
      if (!td) return { ok: false, error: 'Pick a die' };
      run.tray.splice(die, 1);
      if (!td.ghost) run.discard.push(td.dieUid); else run.bag = run.bag.filter((x) => x.uid !== td.dieUid);
      addGhostDie(run, ctx.fortuneRng, 'sun', 6);
      ctx.combat.once[onceKey] = true;
      log(ctx, `${c.name} sanctifies a die — a blazing Sun 6!`, 'fortune');
      return { ok: true };
    }
    case 'overgrowth': {
      if (h.classId !== 'druid') return { ok: false, error: 'Druids only' };
      if (ctx.combat.once[onceKey]) return { ok: false, error: 'Once per combat' };
      if (!td) return { ok: false, error: 'Pick a die' };
      const src = run.bag.find((x) => x.uid === td.dieUid);
      addGhostDie(run, ctx.fortuneRng, src?.material ?? 'verdant', faceValue(run, td));
      ctx.combat.once[onceKey] = true;
      log(ctx, `${c.name} grows a copy of the ${faceValue(run, td)}.`, 'fortune');
      return { ok: true };
    }
    case 'darkBargain': case 'ownLuck': {
      if (h.classId !== 'warlock') return { ok: false, error: 'Warlocks only' };
      if (!td || cmd.value === undefined) return { ok: false, error: 'Pick a die and a value' };
      if (cmd.id === 'darkBargain') {
        if (ctx.combat.once[onceKey]) return { ok: false, error: 'Once per combat' };
        const cost = Math.round(c.maxHp * 0.1);
        if (c.hp <= cost) return { ok: false, error: 'Too wounded' };
        c.hp -= cost;
        ctx.combat.once[onceKey] = true;
      } else {
        if ((h.resources.ownLuck ?? 0) < 1) return { ok: false, error: 'No uses left' };
        h.resources.ownLuck -= 1;
      }
      if (!forceValue(run, die, cmd.value)) {
        // Replace with a ghost die showing the value.
        const src = run.bag.find((x) => x.uid === td.dieUid);
        run.tray.splice(die, 1);
        if (!td.ghost) run.discard.push(td.dieUid);
        addGhostDie(run, ctx.fortuneRng, src?.material ?? 'shadow', cmd.value);
      }
      log(ctx, `${c.name} bargains with the dark: a die turns to ${cmd.value}.`, 'fortune');
      return { ok: true };
    }
    case 'scry': {
      if (h.classId !== 'wizard') return { ok: false, error: 'Wizards only' };
      if (t.flags.scry) return { ok: false, error: 'Once per turn' };
      if (!td) return { ok: false, error: 'Pick a die' };
      const next = run.drawPile[run.drawPile.length - 1];
      if (!next) return { ok: false, error: 'The bag is empty' };
      run.drawPile.pop();
      run.drawPile.push(td.dieUid);
      const nd = { dieUid: next, face: 0 };
      rollTrayDie(run, ctx.fortuneRng, nd);
      run.tray[die] = nd;
      t.flags.scry = true;
      log(ctx, `${c.name} swaps a die with the next in the bag (Arcane Foresight).`, 'fortune');
      return { ok: true };
    }
    case 'surgeReroll': {
      if (h.classId !== 'sorcerer' || (h.resources.sorcery ?? 0) < 1) return { ok: false, error: 'Needs 1 Sorcery Point' };
      h.resources.sorcery -= 1;
      run.rerollsLeft += 1;
      log(ctx, `${c.name} spends a Sorcery Point for a reroll.`, 'fortune');
      return { ok: true };
    }
    case 'surgeFlip': {
      if (h.classId !== 'sorcerer' || (h.resources.sorcery ?? 0) < 2) return { ok: false, error: 'Needs 2 Sorcery Points' };
      if (!td) return { ok: false, error: 'Pick a die' };
      if (!flip(run, die)) return { ok: false, error: 'That die has no opposite face' };
      h.resources.sorcery -= 2;
      log(ctx, `${c.name} flips a die to ${faceValue(run, td)} (Wild Surge).`, 'fortune');
      return { ok: true };
    }
    case 'luck': {
      if ((h.resources.luck ?? 0) < 1) return { ok: false, error: 'No Luck left' };
      h.resources.luck -= 1;
      run.rerollsLeft += 1;
      log(ctx, `${c.name} spends Luck for a reroll.`, 'fortune');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Unknown talent' };
}

export interface TalentOption { id: string; name: string; text: string; needs: 'none' | 'die' | 'dieValue' | 'dieDelta'; usable: boolean; reason?: string }

export function listTalents(ctx: Ctx): TalentOption[] {
  const a = actor(ctx);
  if (!a) return [];
  const { h } = a;
  const t = ctx.combat.turn!;
  const once = (id: string) => !!ctx.combat.once[`${h.id}:${id}`];
  const out: TalentOption[] = [];
  const add = (id: string, name: string, text: string, needs: TalentOption['needs'], reason: string | null) => out.push({ id, name, text, needs, usable: !reason, reason: reason ?? undefined });
  switch (h.classId) {
    case 'fighter': add('steadyHand', 'Steady Hand', 'Nudge a die ±1.', 'dieDelta', t.flags.steadyHand ? 'Used this turn' : null); break;
    case 'cleric': add('sanctify', 'Sanctify', 'Turn a die into a Sun 6.', 'die', once('sanctify') ? 'Used this fight' : null); break;
    case 'druid': add('overgrowth', 'Overgrowth', 'Copy a die.', 'die', once('overgrowth') ? 'Used this fight' : null); break;
    case 'warlock':
      add('darkBargain', 'Dark Bargain', 'Pay 10% HP: set a die to any value.', 'dieValue', once('darkBargain') ? 'Used this fight' : null);
      if (h.level >= 6) add('ownLuck', "Dark One's Own Luck", `Set a die to any value (${h.resources.ownLuck ?? 0} left).`, 'dieValue', (h.resources.ownLuck ?? 0) < 1 ? 'None left' : null);
      break;
    case 'wizard': add('scry', 'Arcane Foresight', 'Swap a die with the next in the bag.', 'die', t.flags.scry ? 'Used this turn' : null); break;
    case 'sorcerer':
      add('surgeReroll', 'Wild Surge: Reroll', '1 Sorcery Point: +1 reroll.', 'none', (h.resources.sorcery ?? 0) < 1 ? 'No points' : null);
      add('surgeFlip', 'Wild Surge: Flip', '2 Sorcery Points: flip a die (7 − value).', 'die', (h.resources.sorcery ?? 0) < 2 ? 'Needs 2 points' : null);
      break;
  }
  if (h.feats.includes('lucky')) add('luck', 'Lucky', `Spend Luck for a reroll (${h.resources.luck ?? 0} left).`, 'none', (h.resources.luck ?? 0) < 1 ? 'None left' : null);
  return out;
}

export function nextBagDie(ctx: Ctx): string | undefined {
  return ctx.exp.fortune.drawPile[ctx.exp.fortune.drawPile.length - 1];
}

export function doToken(ctx: Ctx, cmd: { id: string; die?: number; value?: number }): CmdResult {
  const a = actor(ctx);
  if (!a) return { ok: false, error: 'No active hero' };
  const run = ctx.exp.fortune;
  const idx = run.tokens.indexOf(cmd.id);
  if (idx < 0) return { ok: false, error: 'You have no such token' };
  switch (cmd.id) {
    case 'mulligan':
      for (let i = 0; i < run.tray.length; i++) rollTrayDie(run, ctx.fortuneRng, run.tray[i]);
      log(ctx, 'Mulligan! The whole tray is rerolled.', 'fortune');
      break;
    case 'fateCoin': {
      const td = run.tray[cmd.die ?? -1];
      if (!td || cmd.value === undefined) return { ok: false, error: 'Pick a die and value' };
      if (!forceValue(run, cmd.die!, cmd.value)) {
        const src = run.bag.find((x) => x.uid === td.dieUid);
        run.tray.splice(cmd.die!, 1);
        if (!td.ghost) run.discard.push(td.dieUid);
        addGhostDie(run, ctx.fortuneRng, src?.material ?? 'bone', cmd.value);
      }
      log(ctx, `Fate Coin: a die turns to ${cmd.value}.`, 'fortune');
      break;
    }
    case 'loadedCoin':
      ctx.combat.turn!.loaded = true;
      log(ctx, 'Loaded Coin: the next attack roll will be a natural 20.', 'fortune');
      break;
    case 'encore':
      ctx.combat.turn!.plays += 1;
      log(ctx, 'Encore! Play another hand this turn.', 'fortune');
      break;
    case 'tonic':
      heal(ctx, a.c, a.c.maxHp * 0.3, 'Tonic Coin');
      break;
    default:
      return { ok: false, error: 'Unknown token' };
  }
  run.tokens.splice(idx, 1);
  return { ok: true };
}

// ── fortune scoring for an action ───────────────────────────────────────────

interface PlayCtx {
  dice: number[];
  use: FortuneUse;
  target?: Combatant;
  extra?: { label: string; effect: Effect }[];
}

function canPlay(ctx: Ctx, dice: number[]): string | null {
  if (!dice.length) return null;
  const t = ctx.combat.turn!;
  const run = ctx.exp.fortune;
  if (t.playsUsed >= t.plays) return 'No Fortune plays left this turn';
  if (dice.length > t.playLimit) return `You may play at most ${t.playLimit} dice`;
  if (new Set(dice).size !== dice.length) return 'Duplicate dice';
  for (const i of dice) {
    if (!run.tray[i]) return 'Invalid die';
    if (run.tray[i].jinxed) return 'A jinxed die cannot be played — reroll it first';
  }
  return null;
}

function biomeDie(ctx: Ctx): ((d: PlayedDie) => Effect | null) | undefined {
  const exp = ctx.exp;
  if (exp.biome === 'cinder' && exp.meter >= 3) return (d) => (d.material === 'ember' || d.material === 'steel' ? { mult: 1, note: 'Forge-hot' } : null);
  if (exp.biome === 'rootbound' && exp.meter >= 3) return (d) => (d.material === 'verdant' ? { chips: 4, note: 'Bloom' } : null);
  if (exp.biome === 'drowned' && exp.meter >= 1) return (d) => (d.material === 'storm' || d.material === 'frost' ? { mult: 2, note: 'High water' } : null);
  return undefined;
}

/** Score a Fortune play for this action (or a dice-less baseline). */
function score(ctx: Ctx, base: number, label: string, p: PlayCtx): ScoreOutput {
  const a = actor(ctx)!;
  const run = ctx.exp.fortune;
  const marked = !!p.target && (p.target.conditions.some((x) => (x.id === 'marked' || x.id === 'hexed') && x.sourceId === a.c.id));
  const extra: { label: string; effect: Effect }[] = [...(p.extra ?? [])];
  // Ranger Quarry.
  const quarry = a.h.classId === 'ranger' && marked;
  const curse = ctx.combat.curse;
  if (!p.dice.length) {
    // A dice-less action still benefits from charms that don't need dice? No — base only.
    return { hand: 'high', handLevel: 1, scoringDice: [], chips: base, mult: 1, base, total: Math.round(base), steps: [{ label, chips: base }], doubloons: 0, shattered: [] };
  }
  return scoreHand({
    run, trayIndices: p.dice, base, baseLabel: label, rng: ctx.fortuneRng,
    actor: { classId: a.h.classId, level: a.h.level, hpFrac: a.c.hp / a.c.maxHp, affinity: CLASS_MATERIAL[a.h.classId] },
    action: p.use === 'attack' ? 'attack' : p.use === 'heal' ? 'heal' : p.use === 'guard' ? 'guard' : 'spell',
    firstHand: ctx.combat.handsThisCombat === 0, marked, enemiesAlive: livingEnemies(ctx).length, curse,
    extraDie: biomeDie(ctx),
    extraHand: (hand: HandType) => {
      const out = extra.slice();
      if (quarry && handContains(hand, 'straight')) out.push({ label: 'Quarry', effect: { xmult: 2 } });
      return out;
    },
  });
}

/** After a play resolves: spend dice, count, apply side effects. */
function commitPlay(ctx: Ctx, p: PlayCtx, s: ScoreOutput) {
  if (!p.dice.length) return;
  const run = ctx.exp.fortune;
  const t = ctx.combat.turn!;
  t.playsUsed += 1;
  ctx.combat.handsThisCombat += 1;
  run.handsPlayed[s.hand] = (run.handsPlayed[s.hand] ?? 0) + 1;
  run.lastHand = s.hand;
  if (s.total > run.bestScore) run.bestScore = s.total;
  if (!ctx.game.profile.codex.hands.includes(s.hand)) ctx.game.profile.codex.hands.push(s.hand);
  if (s.doubloons) { run.doubloons += s.doubloons; log(ctx, `+${s.doubloons} doubloon${s.doubloons > 1 ? 's' : ''}!`, 'loot'); }
  if (s.shattered.length) log(ctx, `${s.shattered.length > 1 ? 'Glass dice shatter' : 'A glass die shatters'}!`, 'fortune');
  spendDice(run, ctx.fortuneRng, p.dice, trayLimit(ctx), s.shattered);
  ctx.combat.lastScore = s;
  log(ctx, `${handName(s.hand)}: ${s.chips} × ${s.mult} = ${s.total.toLocaleString()}`, 'fortune');
  // Glass Heart costs HP.
  const a = actor(ctx)!;
  if (run.charms.some((ch) => ch.id === 'glassHeart')) {
    const cost = Math.max(1, Math.round(a.c.maxHp * 0.05));
    a.c.hp = Math.max(1, a.c.hp - cost);
  }
}

function handName(h: HandType) {
  return ({ high: 'High Die', pair: 'Pair', twoPair: 'Two Pair', three: 'Three of a Kind', straight: 'Straight', set: 'Set', fullHouse: 'Full House', four: 'Four of a Kind', straightSet: 'Straight Set', five: 'Five of a Kind', fullSet: 'Full Set', hoard: 'Dragon Hoard' } as Record<HandType, string>)[h];
}

function healAmount(base: number, s: ScoreOutput, ctx: Ctx): number {
  const hm = charmPassives(ctx.exp.fortune).healMult;
  return Math.round(base * VITALITY * (1 + (s.mult - 1) * HEAL_MULT_SLOPE * 0.5) * hm);
}

function dcBonus(s: ScoreOutput, played: boolean): number {
  if (!played) return 0;
  return Math.min(4, Math.max(0, Math.floor(s.mult / 2)));
}

/** Split a scored total across typed components and deal it. */
function dealScored(ctx: Ctx, attacker: Combatant, target: Combatant, parts: DmgPart[], total: number, opts: { crit?: boolean; melee?: boolean; source: string; spill?: boolean }): number {
  const sum = parts.reduce((a, p) => a + p.amount, 0) || 1;
  const scaled = parts.map((p) => ({ type: p.type, amount: (total * p.amount) / sum }));
  const hpBefore = target.hp + target.tempHp;
  const dealt = applyDamage(ctx, target, scaled, { source: opts.source, attacker, crit: opts.crit, melee: opts.melee });
  // Overkill spills half into another foe — big numbers should feel big.
  if (opts.spill !== false && target.dead) {
    const over = Math.max(0, total - hpBefore);
    const next = livingEnemies(ctx).sort((a, b) => (a.rank === target.rank ? -1 : 1) - (b.rank === target.rank ? -1 : 1))[0];
    if (over > 4 && next) {
      log(ctx, `Overkill! ${Math.round(over / 2)} spills into ${next.name}.`, 'hit');
      applyDamage(ctx, next, [{ type: parts[0].type, amount: over / 2 }], { source: 'Overkill', attacker });
    }
  }
  return dealt;
}

// ── attack resolution ───────────────────────────────────────────────────────

interface AttackRoll { hit: boolean; crit: boolean; natural: number }

function rollAttack(ctx: Ctx, att: Combatant, tgt: Combatant, toHit: number, opts: { melee: boolean; spell?: boolean; critMin?: number; noAdv?: boolean }): AttackRoll {
  const h = heroOf(ctx, att);
  let adv = 0, dis = 0;
  if (!opts.noAdv && has(att, 'reckless') && opts.melee) adv++;
  if (has(att, 'hidden')) { adv++; removeCondition(att, 'hidden'); }
  if (has(att, 'invisible')) adv++;
  if (opts.spell && has(att, 'innateSorcery')) adv++;
  if (has(tgt, 'faerieFire')) adv++;
  if (has(tgt, 'paralyzed') || has(tgt, 'stunned') || has(tgt, 'unconscious') || has(tgt, 'restrained') || has(tgt, 'blinded')) adv++;
  if (has(tgt, 'prone')) opts.melee ? adv++ : dis++;
  if (has(att, 'poisoned') || has(att, 'frightened') || has(att, 'blinded') || has(att, 'restrained') || has(att, 'prone')) dis++;
  if (has(tgt, 'invisible') || has(tgt, 'blurred') || has(tgt, 'dodging')) dis++;
  if (has(att, 'weakened')) { dis++; removeCondition(att, 'weakened'); }
  if (h && h.level >= 17 && h.classId === 'ranger' && tgt.conditions.some((x) => x.id === 'marked' && x.sourceId === att.id)) adv++;
  if (h && ctx.combat.turn?.flags[`studied:${tgt.id}`]) { adv++; delete ctx.combat.turn.flags[`studied:${tgt.id}`]; }
  let bonus = toHit;
  const bl = cond(att, 'blessed');
  if (bl) bonus += roll(ctx.rng, '1d4').total;
  const bn = cond(att, 'baned');
  if (bn) bonus -= roll(ctx.rng, '1d4').total;
  const sw = cond(att, 'sacredWeapon');
  if (sw && !opts.spell) bonus += sw.value ?? 0;
  bonus += charmPassives(ctx.exp.fortune).hitBonus;
  if (has(att, 'empowered') && opts.spell) bonus += 0;
  let r = rollD20(ctx.rng, combineAdvantage(adv, dis));
  if (ctx.combat.turn?.loaded) { r = { natural: 20, rolls: [20] }; ctx.combat.turn.loaded = false; }
  let nat = r.natural;
  if (nat === 1 && h?.ancestry === 'halfling') nat = rollD20(ctx.rng).natural;
  const critMin = (opts.critMin ?? 20) - charmPassives(ctx.exp.fortune).critRange;
  let crit = nat >= critMin;
  let hit = nat !== 1 && (crit || nat + bonus >= effectiveAc(ctx, tgt));
  if (hit && opts.melee && (has(tgt, 'paralyzed') || has(tgt, 'unconscious'))) crit = true;
  // Boon of Combat Prowess / Stroke of Luck.
  if (!hit && h) {
    const t = ctx.combat.turn!;
    if (h.choices.epicBoon?.includes('combatProwess') && !t.flags.prowess) { t.flags.prowess = true; hit = true; log(ctx, `${att.name}'s Combat Prowess turns a miss into a hit!`, 'fortune'); }
    else if ((h.resources.strokeOfLuck ?? 0) > 0) { h.resources.strokeOfLuck -= 1; hit = true; log(ctx, `${att.name}: Stroke of Luck!`, 'fortune'); }
  }
  if (!hit && h && h.level >= 13 && h.classId === 'fighter') ctx.combat.turn!.flags[`studied:${tgt.id}`] = true;
  return { hit, crit: hit && crit, natural: nat };
}

export function effectiveAc(_ctx: Ctx, c: Combatant): number {
  let ac = c.ac;
  for (const x of c.conditions) {
    if (x.id === 'shielded') ac += x.value ?? 2;
    if (x.id === 'guarding') ac += 2;
    if (x.id === 'hasted') ac += 2;
    if (x.id === 'slowed') ac -= 2;
  }
  return ac;
}

interface HitDamage { parts: DmgPart[]; crit: boolean }

function weaponHitDamage(ctx: Ctx, att: Combatant, h: Hero, d: Derived, w: WeaponProfile, tgt: Combatant, crit: boolean, first: boolean, opts: { wild?: boolean; extraDice?: { dice: string; type: DamageType }[] }): HitDamage {
  const t = ctx.combat.turn!;
  const parts: DmgPart[] = [];
  let dice = w.dice;
  let bonus = w.bonus;
  let type = w.type;
  if (opts.wild) { dice = h.level >= 11 ? '2d8' : '1d8'; bonus = d.mods.wis; type = 'slashing'; }
  const gwf = h.choices.fightingStyle?.includes('greatWeapon') && (w.props.includes('twoHanded') || w.props.includes('versatile'));
  let r = roll(ctx.rng, dice, { crit, minDie: gwf ? 3 : undefined }).total;
  if (h.feats.includes('savageAttacker') && !t.flags.savage) {
    t.flags.savage = true;
    r = Math.max(r, roll(ctx.rng, dice, { crit, minDie: gwf ? 3 : undefined }).total);
  }
  parts.push({ type, amount: Math.max(1, r + bonus) });
  if (has(att, 'raging') && w.ability === 'str' && !w.ranged) parts.push({ type, amount: d.rageDamage });
  if (first && has(att, 'raging') && has(att, 'reckless') && d.features.has('frenzy')) parts.push({ type, amount: roll(ctx.rng, `${d.rageDamage}d6`, { crit }).total });
  for (const x of tgt.conditions) {
    if ((x.id === 'marked' || x.id === 'hexed') && x.sourceId === att.id) {
      const sides = x.id === 'marked' && h.level >= 20 ? 10 : 6;
      parts.push({ type: x.id === 'hexed' ? 'necrotic' : 'force', amount: roll(ctx.rng, `1d${sides}`, { crit }).total });
    }
  }
  if (d.features.has('huntersPrey') && !t.flags.colossus && tgt.hp < tgt.maxHp) { t.flags.colossus = true; parts.push({ type, amount: roll(ctx.rng, '1d8', { crit }).total }); }
  if (d.features.has('radiantStrikes') && !w.ranged) parts.push({ type: 'radiant', amount: roll(ctx.rng, '1d8', { crit }).total });
  if (d.features.has('blessedStrikes') && !t.flags.blessedStrike) { t.flags.blessedStrike = true; parts.push({ type: 'radiant', amount: roll(ctx.rng, d.features.has('improvedBlessedStrikes') ? '2d8' : '1d8', { crit }).total }); }
  const emp = cond(att, 'empowered');
  if (emp) parts.push({ type: 'radiant', amount: roll(ctx.rng, '1d4', { crit }).total });
  for (const oh of w.onHit) parts.push({ type: oh.type, amount: roll(ctx.rng, oh.dice, { crit }).total });
  for (const ex of opts.extraDice ?? []) parts.push({ type: ex.type, amount: roll(ctx.rng, ex.dice, { crit }).total });
  return { parts, crit };
}

function sneakQualifies(ctx: Ctx, att: Combatant, tgt: Combatant, hadAdv: boolean, dice: number[]): boolean {
  if (hadAdv) return true;
  if (tgt.rank === 'front' && livingHeroes(ctx).some((x) => x.id !== att.id && x.rank === 'front')) return true;
  if (dice.length) {
    const pv = previewHand({ run: ctx.exp.fortune, trayIndices: dice, actor: { classId: 'rogue', level: 1, hpFrac: 1, affinity: 'shadow' }, action: 'attack', base: 0, baseLabel: '', rng: ctx.fortuneRng, firstHand: false, marked: false, enemiesAlive: 1, curse: ctx.combat.curse });
    if (HAND_RANK[pv.hand] >= HAND_RANK.pair) return true;
  }
  return false;
}

function applyMastery(ctx: Ctx, att: Combatant, h: Hero, d: Derived, w: WeaponProfile, tgt: Combatant, missed: boolean) {
  if (!w.mastery || !['barbarian', 'fighter', 'paladin', 'ranger', 'rogue'].includes(h.classId)) return;
  const masteryDc = 8 + d.mods[w.ability] + d.pb;
  switch (w.mastery) {
    case 'graze':
      if (missed && d.mods[w.ability] > 0) {
        log(ctx, `Graze: ${tgt.name} is nicked anyway.`, 'hit');
        applyDamage(ctx, tgt, [{ type: w.type, amount: d.mods[w.ability] * ECHO }], { source: 'Graze', attacker: att, noFortune: true });
      }
      return;
    case 'cleave': {
      if (missed) return;
      const other = livingEnemies(ctx).find((e) => e.id !== tgt.id && e.rank === 'front');
      if (other) {
        const dmg = roll(ctx.rng, w.dice).total * ECHO;
        log(ctx, `Cleave! ${att.name} carries the swing into ${other.name}.`, 'hit');
        applyDamage(ctx, other, [{ type: w.type, amount: dmg }], { source: 'Cleave', attacker: att, noFortune: true, melee: true });
      }
      return;
    }
  }
  if (missed || tgt.dead) return;
  switch (w.mastery) {
    case 'push':
      if (tgt.rank === 'front' && !tgt.mon?.boss) { tgt.rank = 'back'; log(ctx, `${tgt.name} is shoved to the back rank.`, 'info'); }
      break;
    case 'sap': addCondition(ctx, tgt, { id: 'weakened', rounds: 1 }); break;
    case 'slow': addCondition(ctx, tgt, { id: 'slowed', rounds: 1 }); break;
    case 'topple':
      if (!savingThrow(ctx, tgt, 'con', masteryDc)) { addCondition(ctx, tgt, { id: 'prone', rounds: 1 }); log(ctx, `${tgt.name} is knocked prone!`, 'info'); }
      break;
    case 'vex': addCondition(ctx, tgt, { id: 'faerieFire', rounds: 1 }); break;
    case 'nick': break;
  }
}

interface AttackSpec {
  attacks: number;
  weapon: WeaponProfile;
  offhand?: WeaponProfile;
  wild?: boolean;
  label: string;
  onFirstHit?: (tgt: Combatant, crit: boolean) => DmgPart[];
  afterHit?: (tgt: Combatant) => void;
  extraHand?: { label: string; effect: Effect }[];
  noAdv?: boolean;
  sneakDiceDelta?: number;
}

/** Make a set of weapon attacks against one target, scoring the whole volley as one Fortune hand. */
function weaponVolley(ctx: Ctx, dice: number[], tgt: Combatant, spec: AttackSpec): CmdResult {
  const a = actor(ctx)!;
  const { c, h, d } = a;
  const t = ctx.combat.turn!;
  const parts: DmgPart[] = [];
  let anyHit = false;
  let anyCrit = false;
  let hadAdv = has(c, 'hidden') || has(c, 'reckless') || has(tgt, 'faerieFire') || has(tgt, 'prone') || has(tgt, 'restrained') || has(tgt, 'paralyzed');
  const melee = !spec.weapon.ranged;
  const swings: { w: WeaponProfile; offhand: boolean }[] = [];
  for (let i = 0; i < spec.attacks; i++) swings.push({ w: spec.weapon, offhand: false });
  if (spec.offhand) swings.push({ w: spec.offhand, offhand: true });
  let firstHitDone = false;
  for (const s of swings) {
    if (tgt.dead) break;
    const r = rollAttack(ctx, c, tgt, s.w.toHit, { melee, critMin: d.critMin, noAdv: spec.noAdv });
    if (!r.hit) {
      log(ctx, `${c.name} misses ${tgt.name} (${r.natural}).`, 'miss');
      fx(ctx, { kind: 'miss', target: tgt.id, actor: c.id });
      applyMastery(ctx, c, h, d, s.w, tgt, true);
      continue;
    }
    anyHit = true;
    if (r.crit) anyCrit = true;
    const hd = weaponHitDamage(ctx, c, h, d, s.w, tgt, r.crit, !firstHitDone, { wild: spec.wild });
    parts.push(...hd.parts);
    if (!firstHitDone) {
      firstHitDone = true;
      if (spec.onFirstHit) parts.push(...spec.onFirstHit(tgt, r.crit));
      if (h.classId === 'rogue' && !t.flags.sneak && (s.w.props.includes('finesse') || s.w.ranged) && sneakQualifies(ctx, c, tgt, hadAdv, dice)) {
        t.flags.sneak = true;
        const n = Math.max(0, d.sneakDice + (spec.sneakDiceDelta ?? 0));
        if (n > 0) {
          parts.push({ type: s.w.type, amount: roll(ctx.rng, `${n}d6`, { crit: r.crit }).total });
          log(ctx, `Sneak Attack! (+${n}d6)`, 'hit');
        }
      }
    }
    log(ctx, `${c.name} ${r.crit ? 'CRITS' : 'hits'} ${tgt.name}${r.crit ? '!' : '.'}`, r.crit ? 'crit' : 'hit');
    applyMastery(ctx, c, h, d, s.w, tgt, false);
    hadAdv = false;
  }
  if (!anyHit) {
    if (dice.length) log(ctx, 'All attacks missed — your dice return to the tray.', 'fortune');
    return { ok: true };
  }
  const base = parts.reduce((x, p) => x + p.amount, 0);
  const s = score(ctx, base, spec.label, { dice, use: 'attack', target: tgt, extra: spec.extraHand });
  if (anyCrit) s.crit = true;
  dealScored(ctx, c, tgt, parts, s.total, { crit: anyCrit, melee, source: spec.label });
  if (d.lifesteal > 0) heal(ctx, c, s.total * d.lifesteal, 'Vampiric');
  spec.afterHit?.(tgt);
  commitPlay(ctx, { dice, use: 'attack', target: tgt }, s);
  return { ok: true, score: s };
}

// ── the act command ─────────────────────────────────────────────────────────

export function doAct(ctx: Ctx, cmd: Extract<CombatCmd, { type: 'act' }>): CmdResult {
  const a = actor(ctx);
  if (!a) return { ok: false, error: 'No active hero' };
  const { c, h, d } = a;
  const opt = listActions(ctx).find((o) => o.key === cmd.key);
  if (!opt) return { ok: false, error: 'Unknown action' };
  if (!opt.usable) return { ok: false, error: opt.reason ?? 'Not usable' };
  const dice = opt.fortune === 'none' ? [] : cmd.dice;
  const playErr = canPlay(ctx, dice);
  if (playErr) return { ok: false, error: playErr };
  if (opt.key === 'flurry' || cmd.key === 'feat:flurry') { /* handled below */ }

  // Targets.
  const legal = legalTargets(ctx, opt.target, !!opt.melee);
  let targets = cmd.targets.map((id) => ctx.combat.combatants[id]).filter((x) => x && legal.includes(x));
  if (opt.target === 'self') targets = [c];
  if (opt.target === 'allies') targets = livingHeroes(ctx);
  if (opt.target === 'enemies') targets = livingEnemies(ctx);
  if ((opt.target === 'enemy' || opt.target === 'ally' || opt.target === 'fallenAlly' || opt.target === 'rank') && !targets.length) {
    if (legal.length === 1) targets = [legal[0]];
    else return { ok: false, error: 'Choose a target' };
  }
  if (opt.target === 'rank') {
    const rank = targets[0].rank;
    targets = livingEnemies(ctx).filter((e) => e.rank === rank);
  }

  const res = resolve(ctx, opt, cmd, dice, targets, c, h, d);
  if (!res.ok) return res;
  return res;
}

function resolve(ctx: Ctx, opt: ActionOption, cmd: Extract<CombatCmd, { type: 'act' }>, dice: number[], targets: Combatant[], c: Combatant, h: Hero, d: Derived): CmdResult {
  const t = ctx.combat.turn!;
  const tgt = targets[0];
  const key = opt.key;
  const wild = has(c, 'wildShape');

  if (key === 'attack' || key.startsWith('cunning:') || key === 'brutalStrike' || key === 'stunningStrike' || key === 'quiveringPalm') {
    spend(ctx, c, 'action');
    const spec: AttackSpec = { attacks: d.attacks, weapon: d.main, wild, label: wild ? 'Beast Strike' : d.main.name };
    // Nick: off-hand light attack folds into the Attack action.
    if (d.offhand && d.main.mastery === 'nick' && !wild) spec.offhand = d.offhand;
    if (key.startsWith('cunning:')) {
      spec.sneakDiceDelta = -1;
      const kind = key.split(':')[1];
      spec.afterHit = (x) => {
        if (x.dead) return;
        const dc = 8 + d.mods.dex + d.pb;
        if (kind === 'poison' && !savingThrow(ctx, x, 'con', dc, { vsCondition: true })) { addCondition(ctx, x, { id: 'poisoned', rounds: 3, save: { ability: 'con', dc } }); log(ctx, `${x.name} is poisoned.`, 'info'); }
        if (kind === 'trip' && !savingThrow(ctx, x, 'dex', dc, { vsCondition: true })) { addCondition(ctx, x, { id: 'prone', rounds: 1 }); log(ctx, `${x.name} is tripped!`, 'info'); }
      };
    }
    if (key === 'brutalStrike') {
      spec.noAdv = true;
      spec.onFirstHit = (_x, crit) => [{ type: d.main.type, amount: roll(ctx.rng, h.level >= 17 ? '2d10' : '1d10', { crit }).total }];
      spec.afterHit = (x) => { if (!x.dead && !x.mon?.boss && x.rank === 'front') { x.rank = 'back'; log(ctx, `${x.name} is hurled back!`, 'info'); } if (h.level >= 13) addCondition(ctx, x, { id: 'staggered', rounds: 2 }); };
    }
    if (key === 'stunningStrike') {
      h.resources.focus -= 1;
      spec.afterHit = (x) => { if (!x.dead && !savingThrow(ctx, x, 'con', 8 + d.pb + d.mods.wis, { vsCondition: true })) { addCondition(ctx, x, { id: 'stunned', rounds: 1 }); log(ctx, `${x.name} is STUNNED!`, 'crit'); } else log(ctx, `${x.name} resists the stun.`, 'info'); };
    }
    if (key === 'quiveringPalm') {
      h.resources.focus -= 4;
      spec.afterHit = (x) => {
        if (x.dead) return;
        const ok = savingThrow(ctx, x, 'con', 8 + d.pb + d.mods.wis);
        const dmg = roll(ctx.rng, '10d12').total * ECHO * (ok ? 0.5 : 1);
        log(ctx, `Quivering Palm resonates through ${x.name}!`, 'crit');
        applyDamage(ctx, x, [{ type: 'force', amount: dmg }], { source: 'Quivering Palm', attacker: c, noFortune: true });
      };
    }
    return finishAct(ctx, weaponVolley(ctx, dice, tgt, spec));
  }

  if (key === 'smite') {
    const slot = cmd.slot ?? (h.resources.freeSmite ? 1 : (opt.slots ?? [])[0]);
    const usingFree = (h.resources.freeSmite ?? 0) > 0 && (cmd.slot === undefined || cmd.slot === 1) && !(h.slots[1] > 0 && cmd.meta?.includes('useSlot'));
    if (!usingFree && !(h.slots[slot] > 0)) return { ok: false, error: 'No slot of that level' };
    spend(ctx, c, 'action');
    c.used.bonus = true;
    let smote = false;
    const spec: AttackSpec = {
      attacks: d.attacks, weapon: d.main, label: `${d.main.name} + Smite`,
      onFirstHit: (x, crit) => {
        smote = true;
        if (usingFree) h.resources.freeSmite -= 1; else h.slots[slot] -= 1;
        const n = 2 + (slot - 1) + (x.mon?.tags.some((tg) => tg === 'undead' || tg === 'fiend') ? 1 : 0);
        log(ctx, `Divine Smite! (${ordinal(slot)})`, 'crit');
        if (d.features.has('smiteOfProtection')) for (const al of livingHeroes(ctx)) addCondition(ctx, al, { id: 'shielded', rounds: 1, value: 2, untilTurnStart: true });
        return [{ type: 'radiant', amount: roll(ctx.rng, `${n}d8`, { crit }).total }];
      },
      extraHand: [{ label: 'Oath Seal', effect: { mult: slot } }],
    };
    const r = weaponVolley(ctx, dice, tgt, spec);
    if (!smote) log(ctx, 'The smite finds no mark — the slot is kept.', 'info');
    return finishAct(ctx, r);
  }

  if (key === 'offhand' || key === 'martialArts') {
    spend(ctx, c, 'bonus');
    const w = key === 'offhand' ? d.offhand! : { ...d.main, name: 'Unarmed Strike', dice: `1d${d.martialArtsDie}`, bonus: Math.max(d.mods.dex, d.mods.str), toHit: Math.max(d.mods.dex, d.mods.str) + d.pb, props: [], ranged: false, mastery: undefined, onHit: [], type: h.level >= 6 ? 'force' as const : 'bludgeoning' as const };
    return finishAct(ctx, weaponVolley(ctx, dice, tgt, { attacks: 1, weapon: w, label: w.name }));
  }

  if (key === 'volley') {
    spend(ctx, c, 'action');
    const parts: { t: Combatant; parts: DmgPart[]; crit: boolean }[] = [];
    for (const x of targets) {
      const r = rollAttack(ctx, c, x, d.main.toHit, { melee: false, critMin: d.critMin });
      if (!r.hit) { log(ctx, `${c.name}'s arrow misses ${x.name}.`, 'miss'); continue; }
      const hd = weaponHitDamage(ctx, c, h, d, d.main, x, r.crit, false, {});
      parts.push({ t: x, parts: hd.parts, crit: r.crit });
    }
    if (!parts.length) return finishAct(ctx, { ok: true });
    const base = parts.reduce((acc, p) => acc + p.parts.reduce((y, q) => y + q.amount, 0), 0);
    const s = score(ctx, base, 'Volley', { dice, use: 'attack', target: parts[0].t });
    for (const p of parts) {
      const share = p.parts.reduce((y, q) => y + q.amount, 0) / base;
      dealScored(ctx, c, p.t, p.parts, s.total * share, { crit: p.crit, source: 'Volley', spill: false });
    }
    commitPlay(ctx, { dice, use: 'attack' }, s);
    return finishAct(ctx, { ok: true, score: s });
  }

  if (key === 'guard') {
    spend(ctx, c, 'action');
    addCondition(ctx, c, { id: 'guarding', rounds: 1, untilTurnStart: true });
    const base = 4 + h.level;
    const s = score(ctx, base, 'Guard', { dice, use: 'guard' });
    const gm = charmPassives(ctx.exp.fortune).guardMult;
    const ward = Math.round(base * VITALITY * (1 + (s.mult - 1) * 0.35) * gm + (dice.length ? (s.chips - base) * 0.5 : 0));
    c.tempHp = Math.max(c.tempHp, ward);
    log(ctx, `${c.name} takes a guarding stance (+2 AC, ${ward} Ward).`, 'info');
    fx(ctx, { kind: 'ward', target: c.id, amount: ward });
    commitPlay(ctx, { dice, use: 'guard' }, s);
    return finishAct(ctx, { ok: true, score: s });
  }

  if (key === 'rank') {
    if (opt.cost === 'bonus') spend(ctx, c, 'bonus');
    t.flags.moved = true;
    c.rank = c.rank === 'front' ? 'back' : 'front';
    ctx.exp.flags[`rank:${h.id}`] = c.rank === 'back' ? 1 : 2;
    log(ctx, `${c.name} moves to the ${c.rank} rank.`, 'info');
    if (!livingHeroes(ctx).some((x) => x.rank === 'front')) {
      c.rank = 'front';
      log(ctx, 'Someone must hold the front — the move fails.', 'warn');
    }
    return { ok: true };
  }

  if (key.startsWith('spell:')) return finishAct(ctx, castSpell(ctx, SPELLS[key.slice(6)], cmd.slot, targets, dice, cmd.meta ?? [], opt.cost));
  if (key.startsWith('feat:')) return finishAct(ctx, useFeature(ctx, key.slice(5), targets, dice, opt));
  if (key.startsWith('item:')) return finishAct(ctx, useItem(ctx, key.slice(5), targets, dice, opt));
  return { ok: false, error: 'Unhandled action' };
}

function finishAct(ctx: Ctx, r: CmdResult): CmdResult {
  return r;
}

// ── spells ──────────────────────────────────────────────────────────────────

export function castSpell(ctx: Ctx, spell: SpellDef, slotIn: number | undefined, targets: Combatant[], dice: number[], meta: string[], cost: ActionOption['cost'], fromItem = false, itemSlot?: number): CmdResult {
  const a = actor(ctx)!;
  const { c, h, d } = a;
  let slot = spell.level;
  let free: string | null = null;
  if (!fromItem && spell.level > 0) {
    free = freeCast(h, spell);
    const opts = slotOptions(h, spell);
    if (slotIn !== undefined && opts.includes(slotIn)) slot = slotIn;
    else if (free && (slotIn === undefined || slotIn === spell.level)) slot = spell.level;
    else if (opts.length) slot = opts[0];
    else if (!free) return { ok: false, error: 'No spell slots' };
    if (h.classId === 'warlock' && spell.level <= 5 && !free) slot = opts.find((l) => l >= spell.level) ?? slot;
  }
  if (fromItem) slot = itemSlot ?? spell.level;
  // Metamagic.
  const mm = new Set(meta.filter((m) => METAMAGIC[m] && h.choices.metamagic?.includes(m)));
  let mmCost = 0;
  for (const m of mm) mmCost += METAMAGIC[m].cost;
  if (mmCost > (h.resources.sorcery ?? 0)) return { ok: false, error: 'Not enough Sorcery Points' };
  let effCost = cost;
  if (mm.has('quickened') && cost === 'action') effCost = 'bonus';
  const err = costFree(ctx, c, effCost);
  if (err) return { ok: false, error: err };
  if (mmCost) h.resources.sorcery -= mmCost;

  // Pay.
  if (!fromItem && spell.level > 0) {
    if (free && slot === spell.level && !(slotIn !== undefined && slotIn > spell.level)) h.resources[free] -= 1;
    else if (h.classId === 'warlock' && spell.level >= 6) h.resources[`arcanum${spell.level}`] -= 1;
    else h.slots[slot] -= 1;
  }
  spend(ctx, c, effCost);
  if (spell.concentration) {
    if (c.concentration) endConcentration(ctx, c);
    c.concentration = { spellId: spell.id, targets: targets.map((x) => x.id) };
  }
  const concTag = spell.concentration ? `${c.id}:${spell.id}` : undefined;
  const mod = d.spellAbility ? d.mods[d.spellAbility] : 0;
  const dc = d.spellDc + (has(c, 'innateSorcery') ? 1 : 0);
  const cantrip = spell.level === 0;
  const tierDice = cantrip ? d.cantripDice : 1;
  const extra: { label: string; effect: Effect }[] = [];
  if (mm.has('empowered')) extra.push({ label: 'Empowered', effect: { mult: 2 } });
  if (d.features.has('sculptSpells') && targets.length >= 3 && spell.kind === 'save') extra.push({ label: 'Sculpt Spells', effect: { mult: 2 } });
  const overchannel = meta.includes('overchannel') && (h.resources.overchannel ?? 0) > 0 && spell.level > 0 && spell.level <= 5;
  if (overchannel) h.resources.overchannel -= 1;
  const rollDice = (expr: string, crit = false) => roll(ctx.rng, expr, { crit, maximize: overchannel }).total;
  const dmgBonus = (spellDef: SpellDef) => {
    let b = 0;
    if (cantrip && d.features.has('elementalFury')) b += d.mods.wis;
    if (spellDef.school === 'evocation' && d.features.has('empoweredEvocation')) b += d.mods.int;
    if (spellDef.dmgType === 'fire' && h.classId === 'sorcerer' && h.level >= 6) b += d.mods.cha;
    return b;
  };
  let diceExpr = spell.dice ? upcastDice(spell, slot) : '';
  if (cantrip && diceExpr && spell.special !== 'beams') {
    const m = /^(\d+)d(\d+)$/.exec(diceExpr);
    if (m) diceExpr = `${Number(m[1]) * tierDice}d${m[2]}`;
  }
  if (spell.special === 'tollTheDead' && targets[0] && targets[0].hp < targets[0].maxHp) diceExpr = `${tierDice}d12`;
  let dmgType: DamageType = spell.dmgType ?? 'force';
  if (spell.special === 'chromatic' && targets[0]) {
    const v = targets[0].mon?.vuln[0];
    const res = targets[0].mon ? [...targets[0].mon.resist, ...targets[0].mon.immune] : [];
    dmgType = v && ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'].includes(v) ? v : (['fire', 'cold', 'lightning', 'acid', 'thunder'] as DamageType[]).find((x) => !res.includes(x)) ?? 'fire';
  }
  const label = `${spell.name}${slot > spell.level ? ` (${ordinal(slot)})` : ''}`;
  const tgt = targets[0];
  log(ctx, `${c.name} casts ${label}.`, 'info');

  switch (spell.kind) {
    case 'attack': {
      let rays = 1;
      if (spell.special === 'beams') rays = d.cantripDice;
      if (spell.special === 'rays') rays = (spell.rays ?? 3) + (slot - spell.level);
      const parts: DmgPart[] = [];
      let crit = false;
      let hits = 0;
      for (let i = 0; i < rays; i++) {
        const x = targets[i % targets.length];
        if (x.dead) continue;
        let r = rollAttack(ctx, c, x, d.spellAttack, { melee: !!spell.melee, spell: true });
        if (!r.hit && mm.has('seeking')) r = rollAttack(ctx, c, x, d.spellAttack, { melee: !!spell.melee, spell: true });
        if (!r.hit) {
          log(ctx, `${spell.name} misses ${x.name}.`, 'miss');
          fx(ctx, { kind: 'miss', target: x.id, actor: c.id });
          if (cantrip && d.features.has('potentCantrip')) parts.push({ type: dmgType, amount: Math.floor((rollDice(diceExpr) + dmgBonus(spell)) / 2) });
          continue;
        }
        hits++;
        if (r.crit) crit = true;
        let amt = rollDice(diceExpr, r.crit) + dmgBonus(spell);
        if (spell.id === 'eldritchBlast' && h.choices.invocation?.includes('agonizingBlast')) amt += d.mods.cha;
        parts.push({ type: dmgType, amount: Math.max(1, amt) });
        if (spell.special === 'iceKnife') {
          const rankFoes = livingEnemies(ctx).filter((e) => e.rank === x.rank);
          const cold = rollDice(`${2 + (slot - 1)}d6`);
          for (const e of rankFoes) {
            const ok = savingThrow(ctx, e, 'dex', dc);
            if (!ok) applyDamage(ctx, e, [{ type: 'cold', amount: cold * ECHO }], { source: 'Ice Knife', attacker: c, noFortune: true });
          }
        }
      }
      if (!parts.length) {
        if (dice.length) log(ctx, 'The spell missed — your dice return to the tray.', 'fortune');
        return { ok: true };
      }
      const base = parts.reduce((x, p) => x + p.amount, 0);
      const s = score(ctx, base, label, { dice, use: 'spell', target: tgt, extra });
      dealScored(ctx, c, tgt, parts, s.total, { crit, source: spell.name, melee: !!spell.melee });
      if (!tgt.dead && hits) {
        if (spell.condition) addCondition(ctx, tgt, { id: spell.condition.id, rounds: spell.condition.rounds, sourceId: c.id });
        if (spell.special === 'pull' && tgt.rank === 'back' && !tgt.mon?.boss) { tgt.rank = 'front'; log(ctx, `${tgt.name} is yanked forward!`, 'info'); }
        if (spell.id === 'eldritchBlast' && h.choices.invocation?.includes('repellingBlast') && tgt.rank === 'front' && !tgt.mon?.boss) { tgt.rank = 'back'; log(ctx, `${tgt.name} is blasted back.`, 'info'); }
      }
      if (spell.special === 'drain') heal(ctx, c, s.total * 0.5, 'Vampiric Touch');
      if (mm.has('twinned') && targets.length === 1) {
        const other = livingEnemies(ctx).find((e) => e.id !== tgt.id);
        if (other) { log(ctx, 'Twinned!', 'fortune'); dealScored(ctx, c, other, parts, s.total, { source: spell.name, spill: false }); }
      }
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
    case 'save': {
      let tlist = targets;
      if (spell.maxTargets) tlist = tlist.slice(0, spell.maxTargets);
      const base = Math.max(1, rollDice(diceExpr) + dmgBonus(spell));
      const s = score(ctx, base, label, { dice, use: 'spell', target: tlist[0], extra });
      for (const x of tlist) {
        if (x.dead) continue;
        const ok = savingThrow(ctx, x, spell.save!, dc, { disadvantage: mm.has('heightened') && x === tlist[0] });
        let amt = s.total;
        if (ok) amt = spell.half ? Math.floor(amt / 2) : cantrip && d.features.has('potentCantrip') ? Math.floor(amt / 2) : 0;
        if (spell.id === 'disintegrate' && ok) amt = 0;
        log(ctx, `${x.name} ${ok ? 'saves' : 'fails'}.`, ok ? 'miss' : 'hit');
        if (amt > 0) dealScored(ctx, c, x, [{ type: dmgType, amount: base }], amt, { source: spell.name, spill: tlist.length === 1 });
        if (!ok && !x.dead && spell.condition) addCondition(ctx, x, { id: spell.condition.id, rounds: spell.condition.rounds, sourceId: c.id });
        if (!ok && !x.dead && spell.special === 'push' && x.rank === 'front' && !x.mon?.boss) x.rank = 'back';
      }
      if (mm.has('twinned') && tlist.length === 1) {
        const other = livingEnemies(ctx).find((e) => e.id !== tlist[0].id);
        if (other) { const ok = savingThrow(ctx, other, spell.save!, dc); dealScored(ctx, c, other, [{ type: dmgType, amount: base }], ok ? (spell.half ? s.total / 2 : 0) : s.total, { source: spell.name, spill: false }); }
      }
      commitPlay(ctx, { dice, use: 'spell', target: tlist[0] }, s);
      return { ok: true, score: s };
    }
    case 'auto': {
      const base = rollDice(diceExpr) + dmgBonus(spell);
      const s = score(ctx, base, label, { dice, use: 'spell', target: tgt, extra });
      dealScored(ctx, c, tgt, [{ type: dmgType, amount: base }], s.total, { source: spell.name });
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
    case 'heal': {
      let base = diceExpr ? rollDice(diceExpr, false) : 0;
      if (d.features.has('supremeHealing')) base = roll(ctx.rng, diceExpr, { maximize: true }).total;
      if (!/^\d+$/.test(spell.dice ?? '')) base += mod;
      if (d.features.has('discipleOfLife') && spell.level > 0) base += 2 + slot;
      const s = score(ctx, base, label, { dice, use: 'heal', extra });
      const amt = /^\d+$/.test(spell.dice ?? '') ? Math.round(base * VITALITY * (1 + (s.mult - 1) * 0.1)) : healAmount(base, s, ctx);
      const list = spell.target === 'allies' ? heroes(ctx).filter((x) => !x.dead) : targets;
      for (const x of list) {
        heal(ctx, x, spell.id === 'massHeal' ? Math.min(amt, x.maxHp) : amt, spell.name);
        if (spell.special === 'cleanseAll') x.conditions = x.conditions.filter((y) => !['blinded', 'poisoned', 'paralyzed', 'stunned', 'frightened', 'charmed', 'restrained', 'burning', 'noHeal'].includes(y.id));
        if (spell.condition) addCondition(ctx, x, { id: spell.condition.id, rounds: spell.condition.rounds, value: Math.round((spell.condition.value ?? 4) * VITALITY) });
      }
      if (d.features.has('blessedHealer') && list.some((x) => x.id !== c.id) && spell.level > 0) heal(ctx, c, (2 + slot) * VITALITY, 'Blessed Healer');
      commitPlay(ctx, { dice, use: 'heal' }, s);
      return { ok: true, score: s };
    }
    case 'buff': {
      const list = spell.target === 'allies' ? livingHeroes(ctx) : spell.target === 'self' ? [c] : targets;
      switch (spell.special) {
        case 'agathys': c.tempHp = Math.max(c.tempHp, Math.round(5 * slot * VITALITY)); addCondition(ctx, c, { id: 'agathys', rounds: 10, value: 5 * slot * ECHO }); break;
        case 'falseLife': c.tempHp = Math.max(c.tempHp, Math.round((roll(ctx.rng, '2d4').total + 4 + 5 * (slot - 1)) * VITALITY)); break;
        case 'aid': for (const x of list) { x.tempHp = Math.max(x.tempHp, Math.round(5 * slot * VITALITY)); } break;
        case 'heroism': addCondition(ctx, list[0], { id: 'heroism', rounds: 10, value: Math.round(Math.max(1, mod) * VITALITY), concentrationOf: concTag }); break;
        case 'mistyStep': c.rank = c.rank === 'front' && livingHeroes(ctx).filter((x) => x.rank === 'front').length > 1 ? 'back' : 'front'; addCondition(ctx, c, { id: 'blurred', rounds: 1, untilTurnStart: true }); break;
        case 'deathWard': addCondition(ctx, list[0], { id: 'deathWard', rounds: -1 }); break;
        case 'fortify': { const each = Math.round((120 * VITALITY) / Math.max(1, list.length)); for (const x of list) x.tempHp = Math.max(x.tempHp, each); break; }
        default:
          for (const x of list) addCondition(ctx, x, { id: spell.condition!.id, rounds: spell.condition!.rounds, value: spell.condition!.value, concentrationOf: concTag, untilTurnStart: spell.id === 'shield' });
      }
      log(ctx, `${spell.name} takes hold.`, 'info');
      return { ok: true };
    }
    case 'debuff': {
      const s = dice.length ? score(ctx, 0, label, { dice, use: 'spell' }) : undefined;
      const bonusDc = s ? dcBonus(s, true) : 0;
      if (bonusDc) log(ctx, `Fortune sharpens the spell: DC +${bonusDc}.`, 'fortune');
      let list = targets;
      if (spell.maxTargets) list = list.slice(0, spell.maxTargets);
      for (const x of list) {
        if (x.dead) continue;
        if (spell.special === 'humanoid' && !x.mon?.tags.includes('humanoid')) { log(ctx, `${x.name} is not a humanoid — unaffected.`, 'miss'); continue; }
        if (spell.special === 'banish' && x.mon?.boss) { log(ctx, `${x.name} is anchored to this place.`, 'miss'); continue; }
        if (!spell.save) {
          addCondition(ctx, x, { id: spell.condition!.id, rounds: spell.condition!.rounds, value: spell.condition!.value, sourceId: c.id, concentrationOf: concTag });
          log(ctx, `${x.name} is ${spell.condition!.id}.`, 'info');
          continue;
        }
        const ok = savingThrow(ctx, x, spell.save, dc + bonusDc, { vsCondition: true, disadvantage: mm.has('heightened') });
        if (ok) { log(ctx, `${x.name} resists ${spell.name}.`, 'miss'); continue; }
        addCondition(ctx, x, {
          id: spell.special === 'banish' ? 'banished' : spell.condition!.id, rounds: spell.condition!.rounds, value: spell.condition!.value, sourceId: c.id,
          concentrationOf: concTag, save: spell.condition!.saveEnds ? { ability: spell.save, dc: dc + bonusDc } : undefined,
        });
        if (spell.special === 'command') addCondition(ctx, x, { id: 'incapacitated', rounds: 1 });
        log(ctx, `${x.name} is ${spell.special === 'banish' ? 'banished' : spell.condition!.id}!`, 'hit');
      }
      if (s) commitPlay(ctx, { dice, use: 'spell' }, s);
      return { ok: true, score: s };
    }
    case 'zone': {
      const base = Math.max(1, rollDice(diceExpr));
      const s = score(ctx, base, label, { dice, use: 'spell', target: tgt, extra });
      const zone = {
        casterId: c.id, spellId: spell.id, dice: diceExpr, dmgType, target: (spell.target === 'rank' ? 'rank' : spell.target === 'enemies' ? 'enemies' : 'enemy') as 'rank' | 'enemies' | 'enemy',
        targetId: tgt?.id, rank: tgt?.rank, save: spell.save, half: spell.half, dc, tickMult: 1 + (s.mult - 1) * 0.4, condition: spell.condition?.id,
      };
      ctx.combat.zones.push(zone);
      const list = zone.target === 'enemy' ? [tgt] : zone.target === 'rank' ? livingEnemies(ctx).filter((e) => e.rank === tgt.rank) : livingEnemies(ctx);
      for (const x of list) {
        let amt = s.total;
        if (spell.save && savingThrow(ctx, x, spell.save, dc)) amt = spell.half ? Math.floor(amt / 2) : 0;
        if (amt > 0) dealScored(ctx, c, x, [{ type: dmgType, amount: base }], amt, { source: spell.name, spill: false });
        if (spell.condition && !x.dead) addCondition(ctx, x, { id: spell.condition.id, rounds: spell.condition.rounds });
      }
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
    case 'special':
      return castSpecial(ctx, spell, slot, targets, dice, label, mod, dc, extra, concTag);
  }
  return { ok: false, error: 'Unhandled spell' };
}

function castSpecial(ctx: Ctx, spell: SpellDef, slot: number, targets: Combatant[], dice: number[], label: string, mod: number, dc: number, extra: { label: string; effect: Effect }[], concTag?: string): CmdResult {
  const a = actor(ctx)!;
  const { c } = a;
  const tgt = targets[0];
  switch (spell.special) {
    case 'spiritualWeapon': {
      const base = roll(ctx.rng, `${1 + Math.floor((slot - 2) / 2)}d8`).total + mod;
      const s = score(ctx, base, label, { dice, use: 'spell', target: tgt, extra });
      dealScored(ctx, c, tgt, [{ type: 'force', amount: base }], s.total, { source: spell.name });
      addCondition(ctx, c, { id: 'spiritualWeapon', rounds: 10, value: 1 + (s.mult - 1) * 0.3, concentrationOf: concTag });
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
    case 'revivify': case 'revivifyFull': {
      const h = heroOf(ctx, tgt);
      if (!h) return { ok: false, error: 'No target' };
      if (spell.special === 'revivify') ctx.exp.carriedGold -= 300;
      tgt.dead = false; tgt.downed = false; tgt.hp = spell.special === 'revivifyFull' ? tgt.maxHp : 1; tgt.deathSaves = { s: 0, f: 0 };
      h.status = 'alive';
      delete h.history.deathCause;
      ctx.combat.diedThisFight = ctx.combat.diedThisFight.filter((x) => x !== h.id);
      log(ctx, `${tgt.name} gasps back to life!`, 'heal');
      fx(ctx, { kind: 'heal', target: tgt.id, amount: tgt.hp });
      return { ok: true };
    }
    case 'cleanse': case 'cleanseAll': {
      const bad: ConditionId[] = ['blinded', 'poisoned', 'paralyzed', 'stunned', 'frightened', 'charmed', 'restrained', 'burning', 'noHeal', 'weakened', 'slowed'];
      const before = tgt.conditions.length;
      tgt.conditions = spell.special === 'cleanse'
        ? (() => { const i = tgt.conditions.findIndex((x) => bad.includes(x.id)); return tgt.conditions.filter((_, j) => j !== i); })()
        : tgt.conditions.filter((x) => !bad.includes(x.id));
      log(ctx, before !== tgt.conditions.length ? `${tgt.name} is cleansed.` : `${tgt.name} had nothing to cleanse.`, 'heal');
      return { ok: true };
    }
    case 'dispel':
      tgt.conditions = tgt.conditions.filter((x) => !['shielded', 'blessed', 'regenerating', 'hasted', 'stoneskin', 'invisible', 'blurred'].includes(x.id));
      log(ctx, `${tgt.name}'s magic unravels.`, 'hit');
      return { ok: true };
    case 'pwStun':
      if (tgt.hp <= tgt.maxHp * 0.4 && !tgt.mon?.boss) { addCondition(ctx, tgt, { id: 'stunned', rounds: 10, save: { ability: 'con', dc } }); log(ctx, `${tgt.name} is stunned by the word!`, 'crit'); }
      else { addCondition(ctx, tgt, { id: 'slowed', rounds: 2 }); log(ctx, `${tgt.name} staggers.`, 'hit'); }
      return { ok: true };
    case 'pwKill': {
      if (tgt.hp <= tgt.maxHp * 0.35 && !tgt.mon?.boss) { kill(ctx, tgt, 'Power Word Kill', c); return { ok: true }; }
      const base = roll(ctx.rng, '12d12').total;
      const s = score(ctx, base, label, { dice, use: 'spell', target: tgt, extra });
      dealScored(ctx, c, tgt, [{ type: 'psychic', amount: base }], s.total, { source: spell.name });
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
    case 'timeStop': {
      const t = ctx.combat.turn!;
      t.plays += 2;
      t.extraActions = 2;
      log(ctx, 'Time stops. You act twice more.', 'fortune');
      return { ok: true };
    }
  }
  return { ok: true };
}

// ── features ────────────────────────────────────────────────────────────────

function useFeature(ctx: Ctx, id: string, targets: Combatant[], dice: number[], opt: ActionOption): CmdResult {
  const a = actor(ctx)!;
  const { c, h, d } = a;
  const t = ctx.combat.turn!;
  const tgt = targets[0];
  const take = (res: string, n = 1) => { h.resources[res] = (h.resources[res] ?? 0) - n; };
  spend(ctx, c, opt.cost);
  switch (id) {
    case 'rage':
      take('rage');
      addCondition(ctx, c, { id: 'raging', rounds: h.level >= 15 ? -1 : 10, value: d.rageDamage });
      if (d.features.has('instinctivePounce')) c.rank = 'front';
      log(ctx, `${c.name} flies into a RAGE!`, 'crit');
      return { ok: true };
    case 'reckless':
      addCondition(ctx, c, { id: 'reckless', rounds: 1, untilTurnStart: true });
      log(ctx, `${c.name} attacks recklessly!`, 'warn');
      return { ok: true };
    case 'secondWind': {
      take('secondWind');
      const base = roll(ctx.rng, '1d10').total + h.level;
      const s = score(ctx, base, 'Second Wind', { dice, use: 'heal' });
      heal(ctx, c, healAmount(base, s, ctx), 'Second Wind');
      if (d.features.has('tacticalShift')) t.flags.moved = false;
      commitPlay(ctx, { dice, use: 'heal' }, s);
      return { ok: true, score: s };
    }
    case 'actionSurge':
      take('actionSurge');
      c.used.action = false;
      t.plays += 1;
      t.flags.surged = true;
      log(ctx, `${c.name} surges into action!`, 'crit');
      return { ok: true };
    case 'layOnHands': {
      const pool = h.resources.layOnHands ?? 0;
      const need = Math.ceil((tgt.maxHp - tgt.hp) / VITALITY);
      const use = Math.max(1, Math.min(pool, need || 1));
      take('layOnHands', use);
      heal(ctx, tgt, use * VITALITY, 'Lay on Hands');
      if (h.level >= 14) tgt.conditions = tgt.conditions.filter((x) => !['poisoned', 'blinded', 'paralyzed', 'stunned', 'frightened', 'charmed'].includes(x.id));
      return { ok: true };
    }
    case 'sparkHeal': case 'sparkHarm': {
      take('channel');
      const n = h.level >= 18 ? 4 : h.level >= 13 ? 3 : h.level >= 7 ? 2 : 1;
      const base = roll(ctx.rng, `${n}d8`).total + d.mods.wis;
      if (id === 'sparkHeal') {
        const s = score(ctx, base, 'Divine Spark', { dice, use: 'heal' });
        heal(ctx, tgt, healAmount(base, s, ctx), 'Divine Spark');
        commitPlay(ctx, { dice, use: 'heal' }, s);
        return { ok: true, score: s };
      }
      const s = score(ctx, base, 'Divine Spark', { dice, use: 'spell', target: tgt });
      const ok = savingThrow(ctx, tgt, 'con', d.spellDc);
      dealScored(ctx, c, tgt, [{ type: 'radiant', amount: base }], ok ? s.total / 2 : s.total, { source: 'Divine Spark' });
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
    case 'turnUndead': case 'abjureFoes': case 'intimidate': {
      take(id === 'intimidate' ? 'intimidate' : 'channel');
      const s = dice.length ? score(ctx, 0, opt.name, { dice, use: 'spell' }) : undefined;
      const bonus = s ? dcBonus(s, true) : 0;
      const dc = (id === 'intimidate' ? 8 + d.pb + d.mods.str : d.spellDc) + bonus;
      for (const x of targets) {
        if (id === 'turnUndead' && !x.mon?.tags.includes('undead')) continue;
        if (savingThrow(ctx, x, 'wis', dc, { vsCondition: true })) { log(ctx, `${x.name} stands firm.`, 'miss'); continue; }
        addCondition(ctx, x, { id: 'frightened', rounds: 3, save: { ability: 'wis', dc } });
        if (id === 'turnUndead') {
          addCondition(ctx, x, { id: 'incapacitated', rounds: 1 });
          if (h.level >= 5) applyDamage(ctx, x, [{ type: 'radiant', amount: roll(ctx.rng, `${Math.max(1, d.mods.wis)}d8`).total * ECHO }], { source: 'Sear Undead', attacker: c, noFortune: true });
        }
        log(ctx, `${x.name} is terrified!`, 'hit');
      }
      if (s) commitPlay(ctx, { dice, use: 'spell' }, s);
      return { ok: true, score: s };
    }
    case 'preserveLife': {
      take('channel');
      let pool = 5 * h.level * VITALITY;
      for (const x of livingHeroes(ctx).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)) {
        const cap = Math.max(0, x.maxHp / 2 - x.hp);
        const amt = Math.min(cap, pool);
        if (amt > 0) { heal(ctx, x, amt, 'Preserve Life'); pool -= amt; }
      }
      return { ok: true };
    }
    case 'sacredWeapon':
      take('channel');
      addCondition(ctx, c, { id: 'sacredWeapon', rounds: 10, value: Math.max(1, d.mods.cha) });
      log(ctx, `${c.name}'s weapon blazes with holy light.`, 'info');
      return { ok: true };
    case 'inspire': {
      take('inspiration');
      const v = Math.min(9, roll(ctx.rng, `1d${d.inspirationDie}`).total);
      addGhostDie(ctx.exp.fortune, ctx.fortuneRng, 'arcane', v);
      log(ctx, `${c.name} plays a rousing chord — an Inspiration die (${v}) joins the tray!`, 'fortune');
      return { ok: true };
    }
    case 'wildShape':
      if (has(c, 'wildShape')) { removeCondition(c, 'wildShape'); log(ctx, `${c.name} returns to their true form.`, 'info'); c.used.bonus = false; return { ok: true }; }
      take('wildShape');
      addCondition(ctx, c, { id: 'wildShape', rounds: -1 });
      c.tempHp = Math.max(c.tempHp, Math.round(h.level * 2 * VITALITY));
      c.rank = 'front';
      log(ctx, `${c.name} takes the shape of a great beast!`, 'crit');
      return { ok: true };
    case 'landsAid': {
      take('wildShape');
      const n = h.level >= 14 ? 4 : h.level >= 10 ? 3 : 2;
      const base = roll(ctx.rng, `${n}d6`).total;
      const s = score(ctx, base, "Land's Aid", { dice, use: 'spell', target: tgt });
      for (const x of targets) {
        const ok = savingThrow(ctx, x, 'con', d.spellDc);
        dealScored(ctx, c, x, [{ type: 'necrotic', amount: base }], ok ? s.total / 2 : s.total, { source: "Land's Aid", spill: false });
      }
      const ally = livingHeroes(ctx).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
      if (ally) heal(ctx, ally, base * VITALITY, "Land's Aid");
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
    case 'wildResurgence': {
      const lvl = h.slots.findIndex((x, i) => i > 0 && x > 0);
      if (lvl < 1) return { ok: false, error: 'No slots' };
      h.slots[lvl] -= 1;
      h.resources.wildShape = (h.resources.wildShape ?? 0) + 1;
      t.flags.resurgence = true;
      log(ctx, `${c.name} trades a spell slot for Wild Shape.`, 'info');
      return { ok: true };
    }
    case 'flurry': {
      take('focus');
      // Flurry is its own Fortune play of up to 3 dice.
      t.plays += 1;
      const limit = t.playLimit;
      t.playLimit = 3;
      if (dice.length > 3) { t.playLimit = limit; return { ok: false, error: 'Flurry plays at most 3 dice' }; }
      const w = { ...d.main, name: 'Flurry of Blows', dice: `1d${d.martialArtsDie}`, bonus: Math.max(d.mods.dex, d.mods.str), toHit: Math.max(d.mods.dex, d.mods.str) + d.pb, props: [] as never[], ranged: false, mastery: undefined, onHit: [], type: h.level >= 6 ? 'force' as const : 'bludgeoning' as const };
      const r = weaponVolley(ctx, dice, tgt, {
        attacks: h.level >= 10 ? 3 : 2, weapon: w, label: 'Flurry of Blows',
        afterHit: (x) => {
          if (h.level < 3 || x.dead) return;
          const dc = 8 + d.pb + d.mods.wis;
          if (!savingThrow(ctx, x, 'dex', dc, { vsCondition: true })) {
            if (x.rank === 'front' && !x.mon?.boss && ctx.rng.chance(0.5)) { x.rank = 'back'; log(ctx, `${x.name} is sent flying!`, 'info'); }
            else { addCondition(ctx, x, { id: 'prone', rounds: 1 }); log(ctx, `${x.name} is knocked down!`, 'info'); }
          }
        },
      });
      t.playLimit = limit;
      return r;
    }
    case 'patientDefense':
      take('focus');
      addCondition(ctx, c, { id: 'dodging', rounds: 1, untilTurnStart: true });
      if (h.level >= 10) c.tempHp = Math.max(c.tempHp, roll(ctx.rng, `2d${d.martialArtsDie}`).total * VITALITY);
      if (h.level >= 11) t.flags.moved = false;
      log(ctx, `${c.name} flows into a defensive stance.`, 'info');
      return { ok: true };
    case 'wholeness': {
      take('wholeness');
      const base = roll(ctx.rng, `1d${d.martialArtsDie}`).total + d.mods.wis;
      const s = score(ctx, base, 'Wholeness of Body', { dice, use: 'heal' });
      heal(ctx, c, healAmount(base, s, ctx), 'Wholeness of Body');
      commitPlay(ctx, { dice, use: 'heal' }, s);
      return { ok: true, score: s };
    }
    case 'superiorDefense':
      take('focus', 3);
      addCondition(ctx, c, { id: 'superiorDefense', rounds: 10 });
      return { ok: true };
    case 'hide': case 'steadyAim':
      addCondition(ctx, c, { id: 'hidden', rounds: 2 });
      log(ctx, `${c.name} ${id === 'hide' ? 'slips into the shadows' : 'takes careful aim'}.`, 'info');
      return { ok: true };
    case 'innateSorcery':
      take('innateSorcery');
      addCondition(ctx, c, { id: 'innateSorcery', rounds: 10 });
      log(ctx, `Magic surges through ${c.name}'s blood.`, 'info');
      return { ok: true };
    case 'hurl': {
      take('hurl');
      const base = roll(ctx.rng, '8d10').total;
      const ok = savingThrow(ctx, tgt, 'cha', d.spellDc);
      if (ok) { log(ctx, `${tgt.name} resists the pull of hell.`, 'miss'); return { ok: true }; }
      const s = score(ctx, base, 'Hurl Through Hell', { dice, use: 'spell', target: tgt });
      dealScored(ctx, c, tgt, [{ type: 'psychic', amount: base }], s.total, { source: 'Hurl Through Hell' });
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
    case 'tireless':
      take('tireless');
      c.tempHp = Math.max(c.tempHp, Math.round((roll(ctx.rng, '1d8').total + d.mods.wis) * VITALITY));
      return { ok: true };
    case 'naturesVeil':
      ctx.combat.once[`${h.id}:veil`] = true;
      addCondition(ctx, c, { id: 'invisible', rounds: 2 });
      return { ok: true };
    case 'intervention': {
      take('intervention');
      for (const x of heroes(ctx)) {
        if (x.dead) {
          if (h.level >= 20 && ctx.combat.diedThisFight.includes(x.id)) {
            const xh = heroOf(ctx, x)!;
            x.dead = false; x.hp = 1; xh.status = 'alive';
            ctx.combat.diedThisFight = ctx.combat.diedThisFight.filter((y) => y !== x.id);
            log(ctx, `${x.name} is returned by divine will!`, 'heal');
          } else continue;
        }
        if (x.hp < x.maxHp / 2) heal(ctx, x, x.maxHp / 2 - x.hp, 'Divine Intervention');
        x.conditions = x.conditions.filter((y) => ['blessed', 'raging', 'shielded', 'hasted'].includes(y.id));
      }
      log(ctx, 'The heavens answer!', 'crit');
      return { ok: true };
    }
    case 'nimbus':
      ctx.combat.once[`${h.id}:nimbus`] = true;
      ctx.exp.flags[`nimbus:${h.id}`] = 1;
      addCondition(ctx, c, { id: 'nimbus', rounds: 10 });
      addCondition(ctx, c, { id: 'holyAura', rounds: 10 });
      return { ok: true };
    case 'breath': {
      take('breath');
      const n = h.level >= 17 ? 4 : h.level >= 11 ? 3 : h.level >= 5 ? 2 : 1;
      const base = roll(ctx.rng, `${n}d10`).total;
      const s = score(ctx, base, 'Breath Weapon', { dice, use: 'spell', target: tgt });
      const dc = 8 + d.mods.con + d.pb;
      for (const x of targets) {
        const ok = savingThrow(ctx, x, 'dex', dc);
        dealScored(ctx, c, x, [{ type: 'fire', amount: base }], ok ? s.total / 2 : s.total, { source: 'Breath Weapon', spill: false });
      }
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
  }
  return { ok: false, error: `Unknown feature ${id}` };
}

// ── items ───────────────────────────────────────────────────────────────────

function useItem(ctx: Ctx, uid: string, targets: Combatant[], dice: number[], opt: ActionOption): CmdResult {
  const a = actor(ctx)!;
  const { c, h, d } = a;
  const idx = ctx.exp.carriedItems.findIndex((i) => i.uid === uid);
  if (idx < 0) return { ok: false, error: 'Item not found' };
  const inst = ctx.exp.carriedItems[idx];
  const def = ITEMS[inst.defId];
  const cons = def.consumable!;
  const tgt = targets[0] ?? c;
  const consume = () => {
    if ((inst.qty ?? 1) > 1) inst.qty! -= 1;
    else ctx.exp.carriedItems.splice(idx, 1);
  };
  if (cons.effect === 'scroll') {
    const sp = SPELLS[cons.spell!];
    const r = castSpell(ctx, sp, sp.level, targets.length ? targets : [c], dice, [], opt.cost, true, sp.level);
    if (r.ok) consume();
    return r;
  }
  spend(ctx, c, opt.cost);
  consume();
  const healerBonus = h.feats.includes('healer') ? h.level : 0;
  switch (cons.effect) {
    case 'heal': {
      const base = roll(ctx.rng, cons.dice!).total + healerBonus;
      const s = score(ctx, base, def.name, { dice, use: 'heal' });
      heal(ctx, tgt, healAmount(base, s, ctx), def.name);
      commitPlay(ctx, { dice, use: 'heal' }, s);
      return { ok: true, score: s };
    }
    case 'cleanse':
      tgt.conditions = tgt.conditions.filter((x) => x.id !== 'poisoned' && x.id !== 'burning');
      log(ctx, `${tgt.name} is cured.`, 'heal');
      return { ok: true };
    case 'elixir':
      tgt.conditions = tgt.conditions.filter((x) => !['poisoned', 'blinded', 'paralyzed', 'frightened', 'burning', 'stunned', 'noHeal'].includes(x.id));
      heal(ctx, tgt, tgt.maxHp * 0.25, def.name);
      return { ok: true };
    case 'bomb': case 'holy': {
      let base = roll(ctx.rng, cons.dice!).total;
      if (cons.effect === 'holy' && !tgt.mon?.tags.some((x) => x === 'undead' || x === 'fiend')) base = Math.floor(base / 2);
      const s = score(ctx, base, def.name, { dice, use: 'spell', target: tgt });
      const ok = savingThrow(ctx, tgt, 'dex', 8 + d.pb + d.mods.dex);
      dealScored(ctx, c, tgt, [{ type: cons.damageType!, amount: base }], ok ? s.total / 2 : s.total, { source: def.name });
      if (cons.effect === 'bomb' && !ok && !tgt.dead) addCondition(ctx, tgt, { id: 'burning', rounds: 2, value: Math.round(roll(ctx.rng, '1d4').total * ECHO) });
      commitPlay(ctx, { dice, use: 'spell', target: tgt }, s);
      return { ok: true, score: s };
    }
    case 'heroism':
      c.tempHp = Math.max(c.tempHp, Math.round(10 * VITALITY));
      addCondition(ctx, c, { id: 'blessed', rounds: 10, value: 4 });
      return { ok: true };
    case 'smoke':
      ctx.combat.status = 'fled';
      log(ctx, 'Smoke fills the room — the party slips away!', 'warn');
      return { ok: true };
    case 'fortune':
      ctx.exp.fortune.tokens.push('mulligan');
      return { ok: true };
  }
  return { ok: true };
}

// ── end turn ────────────────────────────────────────────────────────────────

export function endHeroTurn(ctx: Ctx) {
  const a = actor(ctx);
  if (a) {
    // Thief's Reflexes: an extra turn in the first round.
    if (ctx.combat.round === 1 && (ctx.combat.extraTurns[a.c.id] ?? 0) > 0) {
      ctx.combat.extraTurns[a.c.id] -= 1;
      a.c.used = { action: false, bonus: false, reaction: false, fortune: false, extraFortune: 0 };
      log(ctx, `${a.c.name} moves again (Thief's Reflexes)!`, 'fortune');
      heroTurnStart(ctx, a.c);
      return;
    }
    // Conditions tick at end of turn (core.endOfTurn).
    endOfTurnHook(ctx, a.c);
  }
  ctx.combat.turn = undefined;
  advance(ctx);
}

let endOfTurnHook: (ctx: Ctx, c: Combatant) => void = () => {};
export function setEndOfTurnHook(fn: (ctx: Ctx, c: Combatant) => void) { endOfTurnHook = fn; }

/** True once the hero has nothing meaningful left this turn. */
export function turnExhausted(ctx: Ctx): boolean {
  const a = actor(ctx);
  if (!a) return true;
  if (!a.c.used.action) return false;
  const opts = listActions(ctx).filter((o) => o.usable && (o.cost === 'bonus') && o.key !== 'rank');
  return opts.length === 0;
}

export { average, alive, incapacitated, enemies };
export type { Rank };
