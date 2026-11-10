/**
 * Boons: the after-combat level-up picks and the Peddler's stock.
 * Each combat raises the run's Fortune Rank and offers three boons; ranks 3,
 * 6 and 9 are milestones that offer structural upgrades instead.
 */
import type { BoonOffer, FaceMod, FortuneRun, HandType } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';
import { CHARMS, CHARM_BY_ID, CHARM_PRICE, newCharm, charmText, omenId, omenLevels, type CharmRarity } from './charms.ts';
import { HANDS, HAND_BY_ID } from './hands.ts';
import { SPECIAL_DICE, SPECIAL_BY_ID, makeDie, MATERIALS } from './materials.ts';
import { charmSlots, MAX_TOKENS } from './tray.ts';
import { bindText, textTable } from '../i18n/index.ts';

export interface TokenDef { id: string; name: string; text: string; price: number }

export const TOKENS = textTable<Record<string, TokenDef>, 'name' | 'text'>('game', ['tokens'], {
  mulligan: { id: 'mulligan', price: 3 },
  fateCoin: { id: 'fateCoin', price: 4 },
  loadedCoin: { id: 'loadedCoin', price: 4 },
  encore: { id: 'encore', price: 5 },
  tonic: { id: 'tonic', price: 3 },
});

export const FACE_BOONS: FaceMod[] = ['gilded', 'keen', 'fierce', 'savage', 'wild', 'lucky'];
export const FACE_PRICE: Record<string, number> = { gilded: 3, keen: 3, fierce: 4, lucky: 4, savage: 6, wild: 6 };

export const UPGRADES = textTable<Record<string, { name: string; text: string }>, 'name' | 'text'>('game', ['upgrades'], {
  handSize: {},
  rerolls: {},
  charmSlot: {},
  chisel: {},
});

function rollRarity(rng: Rng, rank: number, boost = 0): CharmRarity {
  const r = rng.next() * 100;
  const legendary = 0.5 + boost * 2 + rank * 0.15;
  const rare = 7 + boost * 8 + rank * 1.2;
  const uncommon = 30 + boost * 10;
  if (r < legendary) return 'legendary';
  if (r < legendary + rare) return 'rare';
  if (r < legendary + rare + uncommon) return 'uncommon';
  return 'common';
}

function pickCharm(rng: Rng, run: FortuneRun, exclude: Set<string>, boost: number): string | null {
  const owned = new Set(run.charms.map((c) => c.id));
  for (let tries = 0; tries < 6; tries++) {
    const rarity = rollRarity(rng, run.rank, boost);
    const pool = CHARMS.filter((c) => c.rarity === rarity && !owned.has(c.id) && !exclude.has(c.id));
    if (pool.length) return rng.pick(pool).id;
  }
  const pool = CHARMS.filter((c) => !owned.has(c.id) && !exclude.has(c.id));
  return pool.length ? rng.pick(pool).id : null;
}

function omenHand(rng: Rng, run: FortuneRun): HandType {
  // Bias toward hands the player actually plays.
  const playable = HANDS.slice(0, 10);
  return rng.weighted(playable, (h) => 1 + (run.handsPlayed[h.id] ?? 0) * 0.6 + (h.id === 'pair' || h.id === 'three' ? 1 : 0)).id;
}

export function makeOffer(rng: Rng, run: FortuneRun, kind: BoonOffer['kind'], exclude: Set<string>, boost = 0): BoonOffer | null {
  switch (kind) {
    case 'charm': {
      const id = pickCharm(rng, run, exclude, boost);
      if (!id) return null;
      exclude.add(id);
      return { kind, id, price: CHARM_PRICE[CHARM_BY_ID[id].rarity] };
    }
    case 'omen': {
      const hand = omenHand(rng, run);
      if (exclude.has(omenId(hand))) return null;
      exclude.add(omenId(hand));
      return omenOffer(hand);
    }
    case 'die': {
      const pool = SPECIAL_DICE.filter((d) => d.rarity !== 'rare' || rng.chance(0.4 + boost * 0.3));
      const def = rng.pick(pool);
      if (exclude.has(`die_${def.id}`)) return null;
      exclude.add(`die_${def.id}`);
      const die = makeDie(rng, def.material, def.faces.map((f) => ({ ...f })), def.name);
      return { kind, id: def.id, die, price: def.rarity === 'rare' ? 6 : def.rarity === 'uncommon' ? 4 : 3 };
    }
    case 'face': {
      const face = rng.pick(FACE_BOONS);
      if (exclude.has(`face_${face}`)) return null;
      exclude.add(`face_${face}`);
      return { kind, id: `face_${face}`, face, price: FACE_PRICE[face] };
    }
    case 'token': {
      const t = rng.pick(Object.keys(TOKENS));
      if (exclude.has(`tok_${t}`)) return null;
      exclude.add(`tok_${t}`);
      return { kind, id: t, price: TOKENS[t].price };
    }
    case 'remove':
      if (exclude.has('remove')) return null;
      exclude.add('remove');
      return { kind, id: 'remove', price: 2 };
    case 'upgrade': {
      const ids = Object.keys(UPGRADES).filter((u) => !exclude.has(u));
      if (!ids.length) return null;
      const id = rng.pick(ids);
      exclude.add(id);
      return { kind, id, price: id === 'chisel' ? 4 : 8 };
    }
    default:
      return null;
  }
}

/** An omen as a boon: lands in a charm slot like any charm. */
export function omenOffer(hand: HandType): BoonOffer {
  return { kind: 'omen', id: omenId(hand), hand, price: 3 };
}

/** Boons that occupy a charm slot (and so may need one replaced). */
export function offerTakesSlot(o: BoonOffer): boolean {
  return o.kind === 'charm' || o.kind === 'omen';
}

/** Post-combat level-up: three choices (boss/elite fights roll richer). */
export function rollBoons(rng: Rng, run: FortuneRun, source: 'normal' | 'elite' | 'boss' | 'treasure'): BoonOffer[] {
  const exclude = new Set<string>();
  const boost = source === 'boss' ? 2 : source === 'elite' || source === 'treasure' ? 1 : 0;
  const milestone = source !== 'treasure' && run.rank > 0 && run.rank % 3 === 0;
  const offers: BoonOffer[] = [];
  if (milestone) {
    for (const id of ['handSize', 'rerolls', 'charmSlot']) {
      exclude.add(id);
      offers.push({ kind: 'upgrade', id });
    }
    return offers;
  }
  const kinds: BoonOffer['kind'][] = ['charm', 'charm', 'omen', 'die', 'face', 'omen', 'token', 'remove'];
  let guard = 0;
  // Always at least one charm in every level-up: they are the stars of the show.
  const first = makeOffer(rng, run, 'charm', exclude, boost);
  if (first) offers.push(first);
  while (offers.length < 3 && guard++ < 40) {
    const kind = rng.weighted(kinds, (k) => (k === 'charm' ? 3 : k === 'omen' ? 3 : k === 'remove' ? 0.6 : k === 'token' ? 0.8 : 1.5));
    const o = makeOffer(rng, run, kind, exclude, boost);
    if (o) offers.push(o);
  }
  return offers.map((o) => ({ ...o, price: undefined }));
}

/** The Peddler: priced stock with a reroll button. */
export function rollShop(rng: Rng, run: FortuneRun): BoonOffer[] {
  const exclude = new Set<string>();
  const offers: BoonOffer[] = [];
  const plan: BoonOffer['kind'][] = ['charm', 'charm', 'charm', 'omen', 'die', 'face', 'token', 'upgrade'];
  for (const k of plan) {
    const o = makeOffer(rng, run, k, exclude, 0.5);
    if (o) offers.push(o);
  }
  return offers;
}

export function offerTitle(o: BoonOffer): string {
  switch (o.kind) {
    case 'charm': return CHARM_BY_ID[o.id]?.name ?? o.id;
    case 'omen': return CHARM_BY_ID[omenId(o.hand!)]?.name ?? o.id;
    case 'die': return o.die?.name ?? SPECIAL_BY_ID[o.id]?.name ?? 'Die';
    case 'face': return `${o.face![0].toUpperCase()}${o.face!.slice(1)} Face`;
    case 'token': return TOKENS[o.id]?.name ?? o.id;
    case 'remove': return 'Smash a Die';
    case 'upgrade': return UPGRADES[o.id]?.name ?? o.id;
    case 'heal': return 'Healing Spring';
    case 'gold': return 'Treasure';
  }
}

export function offerText(o: BoonOffer): string {
  switch (o.kind) {
    case 'charm': return CHARM_BY_ID[o.id] ? charmText(CHARM_BY_ID[o.id]) : '';
    case 'omen': {
      const h = HAND_BY_ID[o.hand!];
      return `${h.name} +1 level while held: +${h.lvChips} chips, +${h.lvMult} mult. Takes a charm slot.`;
    }
    case 'die': return `${SPECIAL_BY_ID[o.id]?.text ?? ''} (${MATERIALS[o.die!.material].name})`;
    case 'face': return `Enchant one face of a die in your bag: ${FACE_TEXT[o.face!]}`;
    case 'token': return TOKENS[o.id]?.text ?? '';
    case 'remove': return 'Remove one die from your bag permanently. Thinner bag, better odds.';
    case 'upgrade': return UPGRADES[o.id]?.text ?? '';
    case 'heal': return 'Heal the party.';
    case 'gold': return 'Gold.';
  }
}

/** Rules text for a face enchant offer: game.json → faceEnchants. */
const FACE_TEXT = bindText({} as Record<FaceMod, string>, 'game', ['faceEnchants']);

/** Does this offer need the player to pick a die (and face)? */
export function offerNeedsTarget(o: BoonOffer): 'die' | 'face' | null {
  if (o.kind === 'face') return 'face';
  if (o.kind === 'remove') return 'die';
  if (o.kind === 'upgrade' && o.id === 'chisel') return 'die';
  return null;
}

export type ApplyResult = { ok: true; text: string } | { ok: false; reason: string };

export function applyOffer(run: FortuneRun, o: BoonOffer, target?: { dieUid?: string; face?: number; replaceCharm?: number }): ApplyResult {
  switch (o.kind) {
    case 'charm':
    case 'omen': {
      if (run.charms.length >= charmSlots(run)) {
        if (target?.replaceCharm === undefined) return { ok: false, reason: 'Charm slots full — choose one to replace.' };
        run.charms.splice(target.replaceCharm, 1);
      }
      run.charms.push(newCharm(o.id));
      if (o.kind === 'charm') run.seenCharms.push(o.id);
      else return { ok: true, text: `Gained ${CHARM_BY_ID[o.id].name}: ${HAND_BY_ID[o.hand!].name} is now Lv.${1 + (omenLevels(run)[o.hand!] ?? 0)}.` };
      return { ok: true, text: `Gained ${CHARM_BY_ID[o.id].name}.` };
    }
    case 'die':
      run.bag.push(o.die!);
      return { ok: true, text: `${o.die!.name ?? 'A die'} joins your bag.` };
    case 'face': {
      const die = run.bag.find((d) => d.uid === target?.dieUid);
      if (!die || target?.face === undefined) return { ok: false, reason: 'Pick a die and a face.' };
      die.faces[target.face] = { v: die.faces[target.face].v, mod: o.face };
      return { ok: true, text: `Enchanted a face: ${o.face}.` };
    }
    case 'token':
      if (run.tokens.length >= MAX_TOKENS) return { ok: false, reason: 'Token pouch full (3).' };
      run.tokens.push(o.id);
      return { ok: true, text: `Pocketed a ${TOKENS[o.id].name}.` };
    case 'remove': {
      if (run.bag.length <= 8) return { ok: false, reason: 'Your bag must keep at least 8 dice.' };
      const before = run.bag.length;
      run.bag = run.bag.filter((d) => d.uid !== target?.dieUid);
      if (run.bag.length === before) return { ok: false, reason: 'Pick a die to smash.' };
      return { ok: true, text: 'Smashed a die.' };
    }
    case 'upgrade':
      if (o.id === 'handSize') run.bonusHandSize += 1;
      else if (o.id === 'rerolls') run.bonusRerolls += 1;
      else if (o.id === 'charmSlot') run.charmSlots += 1;
      else if (o.id === 'chisel') {
        const die = run.bag.find((d) => d.uid === target?.dieUid);
        if (!die) return { ok: false, reason: 'Pick a die to chisel.' };
        let top = 0;
        die.faces.forEach((f, i) => { if (f.v > die.faces[top].v) top = i; });
        die.faces = die.faces.map((f, i) => (i === top ? f : { ...f, v: Math.min(9, f.v + 1) }));
      }
      return { ok: true, text: `${UPGRADES[o.id].name}!` };
    default:
      return { ok: true, text: '' };
  }
}
