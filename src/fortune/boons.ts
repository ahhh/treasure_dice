/**
 * Boons: the after-combat level-up picks and the Peddler's stock.
 * Each combat raises the run's Fortune Rank and offers three boons; ranks 3,
 * 6 and 9 are milestones that offer structural upgrades instead.
 */
import type { BoonOffer, FaceMod, FortuneRun, HandType } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';
import { CHARMS, CHARM_BY_ID, CHARM_PRICE, newCharm, type CharmRarity } from './charms.ts';
import { HANDS, HAND_BY_ID } from './hands.ts';
import { SPECIAL_DICE, SPECIAL_BY_ID, makeDie, MATERIALS } from './materials.ts';
import { charmSlots, MAX_TOKENS } from './tray.ts';

export interface TokenDef { id: string; name: string; text: string; price: number }

export const TOKENS: Record<string, TokenDef> = {
  mulligan: { id: 'mulligan', name: 'Mulligan Coin', text: 'Reroll your whole tray for free.', price: 3 },
  fateCoin: { id: 'fateCoin', name: 'Fate Coin', text: 'Turn one tray die to any face it has.', price: 4 },
  loadedCoin: { id: 'loadedCoin', name: 'Loaded Coin', text: 'Your next attack roll is a natural 20.', price: 4 },
  encore: { id: 'encore', name: 'Encore Coin', text: 'The acting hero may play a second hand this turn.', price: 5 },
  tonic: { id: 'tonic', name: 'Tonic Coin', text: 'Heal the acting hero for 30% of max HP.', price: 3 },
};

export const OMEN_NAMES: Record<HandType, string> = {
  high: 'Omen of the Lone Star', pair: 'Omen of the Twins', twoPair: 'Omen of the Mirror',
  three: 'Omen of the Triad', straight: 'Omen of the Road', set: 'Omen of the Banner',
  fullHouse: 'Omen of the Hearth', four: 'Omen of the Tower', straightSet: 'Omen of the Comet',
  five: 'Omen of the Hoard', fullSet: 'Omen of the Crown', hoard: 'Omen of the Dragon',
};

export const FACE_BOONS: FaceMod[] = ['gilded', 'keen', 'fierce', 'savage', 'wild', 'lucky'];
export const FACE_PRICE: Record<string, number> = { gilded: 3, keen: 3, fierce: 4, lucky: 4, savage: 6, wild: 6 };

export const UPGRADES: Record<string, { name: string; text: string }> = {
  handSize: { name: 'Wider Tray', text: '+1 tray size for the rest of this run.' },
  rerolls: { name: 'Steady Wrist', text: '+1 reroll every turn for the rest of this run.' },
  charmSlot: { name: 'Charm Hook', text: '+1 charm slot for the rest of this run.' },
  chisel: { name: "Mason's Chisel", text: 'Raise every face of one die by 1 except its highest (max 9).' },
};

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
      if (exclude.has(`omen_${hand}`)) return null;
      exclude.add(`omen_${hand}`);
      return { kind, id: `omen_${hand}`, hand, price: 3 };
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
    case 'omen': return OMEN_NAMES[o.hand!];
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
    case 'charm': return CHARM_BY_ID[o.id]?.text.replace('{n}', String(CHARM_BY_ID[o.id]?.startCounter ?? 0)) ?? '';
    case 'omen': {
      const h = HAND_BY_ID[o.hand!];
      return `Level up ${h.name}: +${h.lvChips} chips, +${h.lvMult} mult.`;
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

const FACE_TEXT: Record<FaceMod, string> = {
  gilded: '+1 doubloon when scored.', keen: '+6 chips when scored.', fierce: '+2 mult when scored.',
  savage: '×1.5 mult when scored.', wild: 'counts as any value.', lucky: '1 in 3: +6 mult.', cursed: '',
};

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
    case 'charm': {
      if (run.charms.length >= charmSlots(run)) {
        if (target?.replaceCharm === undefined) return { ok: false, reason: 'Charm slots full — choose one to replace.' };
        run.charms.splice(target.replaceCharm, 1);
      }
      run.charms.push(newCharm(o.id));
      run.seenCharms.push(o.id);
      return { ok: true, text: `Gained ${CHARM_BY_ID[o.id].name}.` };
    }
    case 'omen':
      run.omens[o.hand!] = (run.omens[o.hand!] ?? 0) + 1;
      return { ok: true, text: `${HAND_BY_ID[o.hand!].name} is now Lv.${1 + run.omens[o.hand!]!}.` };
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
