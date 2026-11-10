/**
 * Charms: run-only trinkets that bend the Fortune scoring pipeline (the
 * Jokers of this game). Order matters — charms resolve left to right — and
 * the player can rearrange them.
 */
import type { CharmInstance, FortuneRun, HandType, Material } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';
import { HANDS, HAND_BY_ID, handContains, type EvalRules } from './hands.ts';
import { format, textTable, type Textless } from '../i18n/index.ts';

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
  theme: 'mult' | 'chips' | 'xmult' | 'economy' | 'dice' | 'utility' | 'omen';
  passive?: {
    /** Omen relic: +1 level to this hand type while held. */
    omen?: HandType;
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

/** Charm names and rules text: src/locales/<lang>/game.json → charms.<id>. */
type CharmSpec = Textless<CharmDef, 'name' | 'text'>;
const bindCharm = (c: CharmSpec) => textTable<CharmDef, 'name' | 'text'>('game', ['charms', c.id], c);

const SPECS: CharmSpec[] = [
  // ── common: flat mult / chips ────────────────────────────────────────────
  { id: 'copperTooth', rarity: 'common', theme: 'mult', onHand: () => ({ mult: 3 }) },
  { id: 'twinFang', rarity: 'common', theme: 'mult', onHand: (c) => (contains(c, 'pair') ? { mult: 5 } : null) },
  { id: 'tripleCrown', rarity: 'common', theme: 'mult', onHand: (c) => (contains(c, 'three') ? { mult: 8 } : null) },
  { id: 'ladderOfBones', rarity: 'common', theme: 'mult', onHand: (c) => (contains(c, 'straight') ? { mult: 8 } : null) },
  { id: 'guildmark', rarity: 'common', theme: 'mult', onHand: (c) => (contains(c, 'set') ? { mult: 7 } : null) },
  { id: 'pebblePouch', rarity: 'common', theme: 'chips', onHand: (c) => (contains(c, 'twoPair') ? { chips: 16 } : null) },
  { id: 'oddFellow', rarity: 'common', theme: 'mult', onDie: (_c, d) => (d.value % 2 === 1 ? { mult: 2 } : null) },
  { id: 'evenKeel', rarity: 'common', theme: 'chips', onDie: (_c, d) => (d.value % 2 === 0 ? { chips: 4 } : null) },
  { id: 'snakeEyes', rarity: 'common', theme: 'mult', onDie: (_c, d) => (d.value === 1 ? { mult: 5 } : null) },
  { id: 'hexSpur', rarity: 'common', theme: 'chips', onDie: (_c, d) => (d.value === 6 ? { chips: 6, mult: 1 } : null) },
  { id: 'whetstone', rarity: 'common', theme: 'chips', onHand: (c) => (c.played.length <= 3 ? { chips: 20 } : null) },
  { id: 'gamblersGrin', rarity: 'common', theme: 'mult', onHand: (c) => (c.rerollsLeft > 0 ? { mult: 3 * Math.min(3, c.rerollsLeft) } : null) },
  { id: 'lastLaugh', rarity: 'common', theme: 'mult', onHand: (c) => (c.actor.hpFrac < 0.5 ? { mult: 10 } : null) },
  { id: 'rustedKey', rarity: 'common', theme: 'economy', onCombatEnd: () => 2 },
  { id: 'kinship', rarity: 'common', theme: 'mult', onDie: (c, d) => (d.material === c.actor.affinity || d.material === 'prism' ? { mult: 1 } : null) },
  { id: 'lanternMoth', rarity: 'common', theme: 'chips', onHand: (c) => (c.action === 'spell' ? { chips: 12 } : null) },
  { id: 'brawlersKnuckle', rarity: 'common', theme: 'mult', onHand: (c) => (c.action === 'attack' ? { mult: 4 } : null) },

  // ── uncommon: scaling, economy, rules ────────────────────────────────────
  { id: 'bloodstone', rarity: 'uncommon', theme: 'mult', showCounter: true, onHand: (_c, s) => (s.counter > 0 ? { mult: s.counter } : null), onKill: (s) => { s.counter += 1; } },
  { id: 'dragonLedger', rarity: 'uncommon', theme: 'mult', onHand: (c) => { const m = Math.floor(c.run.doubloons / 3); return m > 0 ? { mult: m } : null; } },
  { id: 'loadedBone', rarity: 'uncommon', theme: 'dice', passive: { rerolls: 1 } },
  { id: 'deepPockets', rarity: 'uncommon', theme: 'dice', passive: { handSize: 1 } },
  { id: 'crookedLadder', rarity: 'uncommon', theme: 'dice', passive: { rules: { fourFingers: true } } },
  { id: 'gapTooth', rarity: 'uncommon', theme: 'dice', passive: { rules: { gapStraight: true } } },
  { id: 'weightedFate', rarity: 'uncommon', theme: 'utility', passive: { hitBonus: 2 } },
  { id: 'butchersHook', rarity: 'uncommon', theme: 'utility', passive: { overkill: true } },
  { id: 'hawkMonocle', rarity: 'uncommon', theme: 'utility', passive: { critRange: 1 } },
  { id: 'stoicShield', rarity: 'uncommon', theme: 'utility', passive: { guardMult: 2 } },
  { id: 'mendersThread', rarity: 'uncommon', theme: 'utility', passive: { healMult: 1.5 } },
  { id: 'luckySeven', rarity: 'uncommon', theme: 'xmult', onHand: (c) => { const p = scored(c).reduce((a, d) => a + d.value, 0); return p > 0 && p % 7 === 0 ? { xmult: 3 } : null; } },
  { id: 'snowball', rarity: 'uncommon', theme: 'chips', showCounter: true, onHand: (_c, s) => (s.counter > 0 ? { chips: s.counter } : null),
    onPlayed: (c, s) => { if (c.hand === 'pair') s.counter += 3; } },
  { id: 'ironPiggy', rarity: 'uncommon', theme: 'economy', passive: { interestCap: 5 } },
  { id: 'paritySeal', rarity: 'uncommon', theme: 'xmult', onHand: (c) => { const s = scored(c); if (s.length < 2) return null; const p = s[0].value % 2; return s.every((d) => d.value % 2 === p) ? { xmult: 1.5 } : null; } },
  { id: 'magpie', rarity: 'uncommon', theme: 'economy', onDie: (_c, d) => (d.material === 'gold' ? { doubloons: 2 } : null) },
  { id: 'echoBell', rarity: 'uncommon', theme: 'dice', onDie: (c, d) => (c.scoring[0] !== undefined && c.played[c.scoring[0]] === d ? { retrigger: true } : null) },
  { id: 'sixfoldBell', rarity: 'uncommon', theme: 'dice', onDie: (_c, d) => (d.value === 6 ? { retrigger: true } : null) },
  { id: 'hourglass', rarity: 'uncommon', theme: 'xmult', onHand: (c) => (c.firstHand ? { xmult: 2 } : null) },
  { id: 'quarrymark', rarity: 'uncommon', theme: 'xmult', onHand: (c) => (c.marked ? { xmult: 1.5 } : null) },
  { id: 'pocketSun', rarity: 'uncommon', theme: 'mult', onDie: (_c, d) => (d.material === 'sun' || d.material === 'ember' ? { mult: 3 } : null) },
  { id: 'nightOwl', rarity: 'uncommon', theme: 'mult', onDie: (_c, d) => (d.material === 'shadow' || d.material === 'arcane' ? { mult: 3 } : null) },
  { id: 'ironRoot', rarity: 'uncommon', theme: 'mult', onDie: (_c, d) => (['steel', 'verdant', 'storm', 'blood'].includes(d.material) ? { mult: 3 } : null) },
  { id: 'boneDust', rarity: 'uncommon', theme: 'chips', onDie: (_c, d) => (d.material === 'bone' ? { chips: 10 } : null) },

  // ── rare: ×mult ─────────────────────────────────────────────────────────
  { id: 'tyrantCrown', rarity: 'rare', theme: 'xmult', onHand: (c) => (contains(c, 'four') || ['straightSet', 'fullSet', 'hoard'].includes(c.hand) ? { xmult: 2 } : null) },
  { id: 'twinSuns', rarity: 'rare', theme: 'xmult', onHand: (c) => (contains(c, 'twoPair') ? { xmult: 2 } : null) },
  { id: 'glassHeart', rarity: 'rare', theme: 'xmult', onHand: () => ({ xmult: 3 }) },
  { id: 'ouroboros', rarity: 'rare', theme: 'xmult', showCounter: true, startCounter: 1, onHand: (_c, s) => (s.counter > 1 ? { xmult: s.counter } : null),
    onPlayed: (_c, s) => { s.counter = Math.round((s.counter + 0.1) * 10) / 10; } },
  { id: 'fortuneWheel', rarity: 'rare', theme: 'xmult', onHand: (c) => (c.rng.chance(1 / 3) ? { xmult: 3, note: 'The wheel lands!' } : null) },
  { id: 'paupersCrown', rarity: 'rare', theme: 'xmult', onHand: (c) => (c.run.doubloons < 5 ? { xmult: 2.5 } : null) },
  { id: 'monolith', rarity: 'rare', theme: 'dice', passive: { rules: { monolith: true } } },
  { id: 'prismLens', rarity: 'rare', theme: 'dice', passive: { rules: { allPrism: true } } },
  { id: 'mimicTongue', rarity: 'rare', theme: 'utility' },
  { id: 'avalanche', rarity: 'rare', theme: 'xmult', showCounter: true, startCounter: 1, onHand: (_c, s) => (s.counter > 1 ? { xmult: s.counter } : null) },
  { id: 'warDrum', rarity: 'rare', theme: 'xmult', onHand: (c) => (c.enemiesAlive > 1 ? { xmult: c.enemiesAlive } : null) },
  { id: 'cartographer', rarity: 'rare', theme: 'utility', passive: { charmSlots: 1 } },

  // ── legendary ───────────────────────────────────────────────────────────
  { id: 'dragonHoard', rarity: 'legendary', theme: 'xmult', onHand: (c) => { const x = 1 + 0.2 * Math.floor(c.run.doubloons / 5); return x > 1 ? { xmult: Math.round(x * 10) / 10 } : null; } },
  { id: 'crownOfAges', rarity: 'legendary', theme: 'xmult', passive: { rerolls: -1 }, onHand: () => ({ xmult: 3 }) },
  { id: 'fifthDoor', rarity: 'legendary', theme: 'dice', passive: { handSize: 1, rerolls: 1, charmSlots: 1 } },
  { id: 'starEater', rarity: 'legendary', theme: 'xmult', onDie: (_c, d) => (d.value >= 5 ? { xmult: 1.25 } : null) },
];

// Material idols — one per class material (generated so the set stays even).
const IDOL_MATS: Material[] = ['steel', 'sun', 'shadow', 'ember', 'verdant', 'arcane', 'blood', 'storm'];
for (const m of IDOL_MATS) {
  SPECS.push({
    id: `idol_${m}`, rarity: 'common', theme: 'mult',
    onDie: (_c, d) => (d.material === m || d.material === 'prism' ? { chips: 3, mult: 2 } : null),
  });
}

export const CHARMS: CharmDef[] = SPECS.map(bindCharm);

/**
 * Omens: relics that level up one hand type for as long as they sit in a charm
 * slot. Each omen is its own slot, so hand levels compete with charms for room.
 * Kept out of CHARMS so they never show up in charm draws or the codex.
 */
export const omenId = (hand: HandType) => `omen_${hand}`;

export const OMENS: CharmDef[] = HANDS.map((h) => bindCharm({ id: omenId(h.id), rarity: 'common', theme: 'omen', passive: { omen: h.id } }));

export const CHARM_BY_ID: Record<string, CharmDef> = Object.fromEntries([...CHARMS, ...OMENS].map((c) => [c.id, c]));

export const isOmen = (id: string) => CHARM_BY_ID[id]?.theme === 'omen';

export function charmText(def: CharmDef, inst?: CharmInstance): string {
  const n = inst ? inst.counter : def.startCounter ?? 0;
  const h = def.passive?.omen ? HAND_BY_ID[def.passive.omen] : undefined;
  return format(def.text, { n, ...(h ? { hand: h.name, chips: h.lvChips, mult: h.lvMult } : {}) });
}

export function newCharm(id: string): CharmInstance {
  const def = CHARM_BY_ID[id];
  return { id, counter: def?.startCounter ?? 0 };
}

/** Aggregate passive modifiers across owned charms (Mimic copies passives too). */
export function charmPassives(run: FortuneRun) {
  const out = { handSize: 0, rerolls: 0, interestCap: 0, critRange: 0, healMult: 1, guardMult: 1, hitBonus: 0, charmSlots: 0, overkill: false, rules: {} as EvalRules, omens: {} as Partial<Record<HandType, number>> };
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
    if (p.omen) out.omens[p.omen] = (out.omens[p.omen] ?? 0) + 1;
    if (p.healMult) out.healMult *= p.healMult;
    if (p.guardMult) out.guardMult *= p.guardMult;
    if (p.rules) Object.assign(out.rules, p.rules);
  }
  return out;
}

/** Hand levels granted by the omens currently held (a Mimic can copy one). */
export function omenLevels(run: FortuneRun): Partial<Record<HandType, number>> {
  return charmPassives(run).omens;
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
