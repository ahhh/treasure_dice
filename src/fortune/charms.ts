/**
 * Charms: run-only trinkets that bend the Fortune scoring pipeline (the
 * Jokers of this game). Order matters — charms resolve left to right — and
 * the player can rearrange them.
 */
import type { CharmInstance, FortuneRun, HandType, Material } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';
import { handContains, type EvalRules } from './hands.ts';

export type CharmRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface PlayedDie {
  value: number;
  material: Material;
  mod?: string;
  trayIndex: number;
  owner?: string;
  trait?: string;
}

export interface ScoreCtx {
  run: FortuneRun;
  hand: HandType;
  /** All dice the player committed. */
  played: PlayedDie[];
  /** Indices into `played` that score. */
  scoring: number[];
  actor: { classId: string; level: number; hpFrac: number; affinity: Material; heroId?: string; extraAffinity?: Material[] };
  action: 'attack' | 'spell' | 'heal' | 'guard';
  rerollsLeft: number;
  firstHand: boolean;
  rng: Rng;
  marked: boolean;
  enemiesAlive: number;
}

export interface Effect {
  chips?: number;
  mult?: number;
  xmult?: number;
  doubloons?: number;
  /** Retrigger this die once more (onDie only). */
  retrigger?: boolean;
  note?: string;
}

export interface CharmDef {
  id: string;
  name: string;
  rarity: CharmRarity;
  /** Use {n} for the live counter. */
  text: string;
  theme: 'mult' | 'chips' | 'xmult' | 'economy' | 'dice' | 'utility';
  passive?: {
    handSize?: number;
    rerolls?: number;
    interestCap?: number;
    critRange?: number;
    rules?: EvalRules;
    healMult?: number;
    guardMult?: number;
    hitBonus?: number;
    charmSlots?: number;
    /** Overkill from any single-target hit carries half into the next foe. */
    overkill?: boolean;
  };
  onDie?: (ctx: ScoreCtx, die: PlayedDie, self: CharmInstance) => Effect | null;
  onHand?: (ctx: ScoreCtx, self: CharmInstance) => Effect | null;
  onPlayed?: (ctx: ScoreCtx, self: CharmInstance) => void;
  onKill?: (self: CharmInstance, run: FortuneRun) => void;
  onCombatEnd?: (self: CharmInstance, run: FortuneRun) => number | void;
  onReroll?: (self: CharmInstance, run: FortuneRun) => void;
  /** Number shown on the charm (for scaling charms). */
  showCounter?: boolean;
  startCounter?: number;
}

export const CHARM_PRICE: Record<CharmRarity, number> = { common: 4, uncommon: 6, rare: 8, legendary: 12 };

const contains = (ctx: ScoreCtx, h: HandType) => handContains(ctx.hand, h);
const scored = (ctx: ScoreCtx) => ctx.scoring.map((i) => ctx.played[i]);

export const CHARMS: CharmDef[] = [
  // ── common: flat mult / chips ────────────────────────────────────────────
  { id: 'copperTooth', name: 'Copper Tooth', rarity: 'common', theme: 'mult', text: '+3 Mult.',
    onHand: () => ({ mult: 3 }) },
  { id: 'twinFang', name: 'Twin Fang', rarity: 'common', theme: 'mult', text: '+5 Mult if the hand contains a Pair.',
    onHand: (c) => (contains(c, 'pair') ? { mult: 5 } : null) },
  { id: 'tripleCrown', name: 'Triple Crown', rarity: 'common', theme: 'mult', text: '+8 Mult if the hand contains Three of a Kind.',
    onHand: (c) => (contains(c, 'three') ? { mult: 8 } : null) },
  { id: 'ladderOfBones', name: 'Ladder of Bones', rarity: 'common', theme: 'mult', text: '+8 Mult if the hand contains a Straight.',
    onHand: (c) => (contains(c, 'straight') ? { mult: 8 } : null) },
  { id: 'guildmark', name: 'Guildmark', rarity: 'common', theme: 'mult', text: '+7 Mult if the hand contains a Set.',
    onHand: (c) => (contains(c, 'set') ? { mult: 7 } : null) },
  { id: 'pebblePouch', name: 'Pebble Pouch', rarity: 'common', theme: 'chips', text: '+16 Chips if the hand contains Two Pair.',
    onHand: (c) => (contains(c, 'twoPair') ? { chips: 16 } : null) },
  { id: 'oddFellow', name: "Odd Fellow's Coin", rarity: 'common', theme: 'mult', text: 'Scored odd dice give +2 Mult.',
    onDie: (_c, d) => (d.value % 2 === 1 ? { mult: 2 } : null) },
  { id: 'evenKeel', name: 'Even Keel', rarity: 'common', theme: 'chips', text: 'Scored even dice give +4 Chips.',
    onDie: (_c, d) => (d.value % 2 === 0 ? { chips: 4 } : null) },
  { id: 'snakeEyes', name: 'Snake-Eye Locket', rarity: 'common', theme: 'mult', text: 'Scored 1s give +5 Mult.',
    onDie: (_c, d) => (d.value === 1 ? { mult: 5 } : null) },
  { id: 'hexSpur', name: 'Hexagon Spur', rarity: 'common', theme: 'chips', text: 'Scored 6s give +6 Chips and +1 Mult.',
    onDie: (_c, d) => (d.value === 6 ? { chips: 6, mult: 1 } : null) },
  { id: 'whetstone', name: 'Whetstone', rarity: 'common', theme: 'chips', text: '+20 Chips if 3 or fewer dice are played.',
    onHand: (c) => (c.played.length <= 3 ? { chips: 20 } : null) },
  { id: 'gamblersGrin', name: "Gambler's Grin", rarity: 'common', theme: 'mult', text: '+3 Mult per unused reroll (up to +9).',
    onHand: (c) => (c.rerollsLeft > 0 ? { mult: 3 * Math.min(3, c.rerollsLeft) } : null) },
  { id: 'lastLaugh', name: 'Last Laugh', rarity: 'common', theme: 'mult', text: '+10 Mult if the acting hero is below half HP.',
    onHand: (c) => (c.actor.hpFrac < 0.5 ? { mult: 10 } : null) },
  { id: 'rustedKey', name: 'Rusted Key', rarity: 'common', theme: 'economy', text: 'Earn 2 doubloons after each combat.',
    onCombatEnd: () => 2 },
  { id: 'kinship', name: 'Kinship Band', rarity: 'common', theme: 'mult', text: 'Scored dice matching the hero\'s affinity give +1 extra Mult.',
    onDie: (c, d) => (d.material === c.actor.affinity || d.material === 'prism' ? { mult: 1 } : null) },
  { id: 'lanternMoth', name: 'Lantern Moth', rarity: 'common', theme: 'chips', text: '+12 Chips on spells.',
    onHand: (c) => (c.action === 'spell' ? { chips: 12 } : null) },
  { id: 'brawlersKnuckle', name: "Brawler's Knuckle", rarity: 'common', theme: 'mult', text: '+4 Mult on weapon attacks.',
    onHand: (c) => (c.action === 'attack' ? { mult: 4 } : null) },

  // ── uncommon: scaling, economy, rules ────────────────────────────────────
  { id: 'bloodstone', name: 'Bloodstone', rarity: 'uncommon', theme: 'mult', text: 'Gains +1 Mult whenever an enemy dies. (Currently +{n})',
    showCounter: true, onHand: (_c, s) => (s.counter > 0 ? { mult: s.counter } : null), onKill: (s) => { s.counter += 1; } },
  { id: 'dragonLedger', name: "Dragon's Ledger", rarity: 'uncommon', theme: 'mult', text: '+1 Mult for every 3 doubloons you hold.',
    onHand: (c) => { const m = Math.floor(c.run.doubloons / 3); return m > 0 ? { mult: m } : null; } },
  { id: 'loadedBone', name: 'Loaded Knucklebone', rarity: 'uncommon', theme: 'dice', text: '+1 reroll every turn.', passive: { rerolls: 1 } },
  { id: 'deepPockets', name: 'Deep Pockets', rarity: 'uncommon', theme: 'dice', text: '+1 tray size.', passive: { handSize: 1 } },
  { id: 'crookedLadder', name: 'Crooked Ladder', rarity: 'uncommon', theme: 'dice', text: 'Straights and Sets can be made with 4 dice.', passive: { rules: { fourFingers: true } } },
  { id: 'gapTooth', name: 'Gap-Tooth Grin', rarity: 'uncommon', theme: 'dice', text: 'Straights may skip one number.', passive: { rules: { gapStraight: true } } },
  { id: 'weightedFate', name: 'Weighted Fate', rarity: 'uncommon', theme: 'utility', text: '+2 to hit on all attack rolls.', passive: { hitBonus: 2 } },
  { id: 'butchersHook', name: "Butcher's Hook", rarity: 'uncommon', theme: 'utility', text: 'Overkill from a single-target hit carries half into the next foe.', passive: { overkill: true } },
  { id: 'hawkMonocle', name: "Hawk's Monocle", rarity: 'uncommon', theme: 'utility', text: 'Critical hits on one lower d20 face.', passive: { critRange: 1 } },
  { id: 'stoicShield', name: 'Stoic Shield', rarity: 'uncommon', theme: 'utility', text: 'Guard grants double Ward.', passive: { guardMult: 2 } },
  { id: 'mendersThread', name: "Mender's Thread", rarity: 'uncommon', theme: 'utility', text: 'Healing is 50% stronger.', passive: { healMult: 1.5 } },
  { id: 'luckySeven', name: 'Lucky Seven', rarity: 'uncommon', theme: 'xmult', text: '×3 Mult if scored pips total a multiple of 7.',
    onHand: (c) => { const p = scored(c).reduce((a, d) => a + d.value, 0); return p > 0 && p % 7 === 0 ? { xmult: 3 } : null; } },
  { id: 'snowball', name: 'Rolling Snowball', rarity: 'uncommon', theme: 'chips', text: 'Gains +3 Chips each time a Pair is played. (Currently +{n})',
    showCounter: true, onHand: (_c, s) => (s.counter > 0 ? { chips: s.counter } : null),
    onPlayed: (c, s) => { if (c.hand === 'pair') s.counter += 3; } },
  { id: 'ironPiggy', name: 'Iron Piggy', rarity: 'uncommon', theme: 'economy', text: 'Interest cap +5.', passive: { interestCap: 5 } },
  { id: 'paritySeal', name: 'Parity Seal', rarity: 'uncommon', theme: 'xmult', text: '×1.5 Mult if all scored dice are odd, or all even.',
    onHand: (c) => { const s = scored(c); if (s.length < 2) return null; const p = s[0].value % 2; return s.every((d) => d.value % 2 === p) ? { xmult: 1.5 } : null; } },
  { id: 'magpie', name: 'Magpie Nest', rarity: 'uncommon', theme: 'economy', text: 'Scored Gold dice give +2 more doubloons.',
    onDie: (_c, d) => (d.material === 'gold' ? { doubloons: 2 } : null) },
  { id: 'echoBell', name: 'Echo Bell', rarity: 'uncommon', theme: 'dice', text: 'The first scored die triggers twice.',
    onDie: (c, d) => (c.scoring[0] !== undefined && c.played[c.scoring[0]] === d ? { retrigger: true } : null) },
  { id: 'sixfoldBell', name: 'Sixfold Bell', rarity: 'uncommon', theme: 'dice', text: 'Scored 6s trigger twice.',
    onDie: (_c, d) => (d.value === 6 ? { retrigger: true } : null) },
  { id: 'hourglass', name: 'Sandglass', rarity: 'uncommon', theme: 'xmult', text: '×2 Mult on the first hand of each combat.',
    onHand: (c) => (c.firstHand ? { xmult: 2 } : null) },
  { id: 'quarrymark', name: 'Quarry Sigil', rarity: 'uncommon', theme: 'xmult', text: '×1.5 Mult against a Marked or Hexed target.',
    onHand: (c) => (c.marked ? { xmult: 1.5 } : null) },
  { id: 'pocketSun', name: 'Pocket Sun', rarity: 'uncommon', theme: 'mult', text: '+3 Mult per scored Sun or Ember die.',
    onDie: (_c, d) => (d.material === 'sun' || d.material === 'ember' ? { mult: 3 } : null) },
  { id: 'nightOwl', name: 'Night Owl', rarity: 'uncommon', theme: 'mult', text: '+3 Mult per scored Shadow or Arcane die.',
    onDie: (_c, d) => (d.material === 'shadow' || d.material === 'arcane' ? { mult: 3 } : null) },
  { id: 'ironRoot', name: 'Iron Root', rarity: 'uncommon', theme: 'mult', text: '+3 Mult per scored Steel, Verdant, Storm or Blood die.',
    onDie: (_c, d) => (['steel', 'verdant', 'storm', 'blood'].includes(d.material) ? { mult: 3 } : null) },
  { id: 'boneDust', name: 'Bone Dust', rarity: 'uncommon', theme: 'chips', text: 'Scored Bone dice give +10 Chips.',
    onDie: (_c, d) => (d.material === 'bone' ? { chips: 10 } : null) },

  // ── rare: ×mult ─────────────────────────────────────────────────────────
  { id: 'tyrantCrown', name: "Tyrant's Crown", rarity: 'rare', theme: 'xmult', text: '×2 Mult on Four of a Kind or better.',
    onHand: (c) => (contains(c, 'four') || ['straightSet', 'fullSet', 'hoard'].includes(c.hand) ? { xmult: 2 } : null) },
  { id: 'twinSuns', name: 'Twin Suns', rarity: 'rare', theme: 'xmult', text: '×2 Mult if the hand contains Two Pair.',
    onHand: (c) => (contains(c, 'twoPair') ? { xmult: 2 } : null) },
  { id: 'glassHeart', name: 'Glass Heart', rarity: 'rare', theme: 'xmult', text: '×3 Mult. The acting hero loses 5% max HP per hand.',
    onHand: () => ({ xmult: 3 }) },
  { id: 'ouroboros', name: 'Ouroboros Ring', rarity: 'rare', theme: 'xmult', text: 'Gains ×0.1 Mult per hand played this run. (Currently ×{n})',
    showCounter: true, startCounter: 1, onHand: (_c, s) => (s.counter > 1 ? { xmult: s.counter } : null),
    onPlayed: (_c, s) => { s.counter = Math.round((s.counter + 0.1) * 10) / 10; } },
  { id: 'fortuneWheel', name: 'Wheel of Chance', rarity: 'rare', theme: 'xmult', text: '1 in 3 chance for ×3 Mult.',
    onHand: (c) => (c.rng.chance(1 / 3) ? { xmult: 3, note: 'The wheel lands!' } : null) },
  { id: 'paupersCrown', name: "Pauper's Crown", rarity: 'rare', theme: 'xmult', text: '×2.5 Mult while you hold fewer than 5 doubloons.',
    onHand: (c) => (c.run.doubloons < 5 ? { xmult: 2.5 } : null) },
  { id: 'monolith', name: 'Monolith', rarity: 'rare', theme: 'dice', text: 'A single played die scores as Three of a Kind.', passive: { rules: { monolith: true } } },
  { id: 'prismLens', name: 'Prismatic Lens', rarity: 'rare', theme: 'dice', text: 'Every die counts as every material.', passive: { rules: { allPrism: true } } },
  { id: 'mimicTongue', name: 'Mimic Tongue', rarity: 'rare', theme: 'utility', text: 'Copies the charm to its right.' },
  { id: 'avalanche', name: 'Avalanche Idol', rarity: 'rare', theme: 'xmult', text: 'Gains ×0.25 Mult each combat won without a hero falling. Resets if one falls. (Currently ×{n})',
    showCounter: true, startCounter: 1, onHand: (_c, s) => (s.counter > 1 ? { xmult: s.counter } : null) },
  { id: 'warDrum', name: 'War Drum', rarity: 'rare', theme: 'xmult', text: '×1 Mult per enemy still standing (min ×1).',
    onHand: (c) => (c.enemiesAlive > 1 ? { xmult: c.enemiesAlive } : null) },
  { id: 'cartographer', name: "Cartographer's Pin", rarity: 'rare', theme: 'utility', text: '+1 Charm slot.', passive: { charmSlots: 1 } },

  // ── legendary ───────────────────────────────────────────────────────────
  { id: 'dragonHoard', name: 'Heart of the Hoard', rarity: 'legendary', theme: 'xmult', text: '×0.2 Mult for every 5 doubloons held (min ×1).',
    onHand: (c) => { const x = 1 + 0.2 * Math.floor(c.run.doubloons / 5); return x > 1 ? { xmult: Math.round(x * 10) / 10 } : null; } },
  { id: 'crownOfAges', name: 'Crown of Ages', rarity: 'legendary', theme: 'xmult', text: '×3 Mult. -1 reroll every turn.',
    passive: { rerolls: -1 }, onHand: () => ({ xmult: 3 }) },
  { id: 'fifthDoor', name: 'Key of the Sixth Door', rarity: 'legendary', theme: 'dice', text: '+1 tray size, +1 reroll, +1 Charm slot.',
    passive: { handSize: 1, rerolls: 1, charmSlots: 1 } },
  { id: 'starEater', name: 'Star-Eater Fang', rarity: 'legendary', theme: 'xmult', text: 'Scored dice of 5 or higher give ×1.25 Mult.',
    onDie: (_c, d) => (d.value >= 5 ? { xmult: 1.25 } : null) },
];

// Material idols — one per class material (generated so the set stays even).
const IDOL_MATS: Material[] = ['steel', 'sun', 'shadow', 'ember', 'verdant', 'arcane', 'blood', 'storm'];
const IDOL_NAMES: Record<string, string> = {
  steel: 'Anvil Idol', sun: 'Dawn Idol', shadow: 'Dusk Idol', ember: 'Pyre Idol',
  verdant: 'Thorn Idol', arcane: 'Sigil Idol', blood: 'Fury Idol', storm: 'Gale Idol',
};
for (const m of IDOL_MATS) {
  CHARMS.push({
    id: `idol_${m}`, name: IDOL_NAMES[m], rarity: 'common', theme: 'mult',
    text: `Scored ${m[0].toUpperCase() + m.slice(1)} dice give +3 Chips and +2 Mult.`,
    onDie: (_c, d) => (d.material === m || d.material === 'prism' ? { chips: 3, mult: 2 } : null),
  });
}

export const CHARM_BY_ID: Record<string, CharmDef> = Object.fromEntries(CHARMS.map((c) => [c.id, c]));

export function charmText(def: CharmDef, inst?: CharmInstance): string {
  const n = inst ? inst.counter : def.startCounter ?? 0;
  return def.text.replace('{n}', String(n));
}

export function newCharm(id: string): CharmInstance {
  const def = CHARM_BY_ID[id];
  return { id, counter: def?.startCounter ?? 0 };
}

/** Aggregate passive modifiers across owned charms (Mimic copies passives too). */
export function charmPassives(run: FortuneRun) {
  const out = { handSize: 0, rerolls: 0, interestCap: 0, critRange: 0, healMult: 1, guardMult: 1, hitBonus: 0, charmSlots: 0, overkill: false, rules: {} as EvalRules };
  const list = effectiveCharms(run);
  for (const { def } of list) {
    const p = def.passive;
    if (!p) continue;
    out.handSize += p.handSize ?? 0;
    out.rerolls += p.rerolls ?? 0;
    out.interestCap += p.interestCap ?? 0;
    out.critRange += p.critRange ?? 0;
    out.hitBonus += p.hitBonus ?? 0;
    out.charmSlots += p.charmSlots ?? 0;
    if (p.overkill) out.overkill = true;
    if (p.healMult) out.healMult *= p.healMult;
    if (p.guardMult) out.guardMult *= p.guardMult;
    if (p.rules) Object.assign(out.rules, p.rules);
  }
  return out;
}

/** Resolve Mimic Tongue: each mimic acts as the charm to its right. */
export function effectiveCharms(run: FortuneRun): { inst: CharmInstance; def: CharmDef; source: CharmInstance }[] {
  const out: { inst: CharmInstance; def: CharmDef; source: CharmInstance }[] = [];
  run.charms.forEach((inst, i) => {
    let def = CHARM_BY_ID[inst.id];
    let target = inst;
    let j = i;
    let hops = 0;
    while (def && def.id === 'mimicTongue' && hops < 5) {
      j += 1;
      const next = run.charms[j];
      if (!next) { def = undefined as unknown as CharmDef; break; }
      target = next;
      def = CHARM_BY_ID[next.id];
      hops++;
    }
    if (def && def.id !== 'mimicTongue') out.push({ inst: target, def, source: inst });
  });
  return out;
}
