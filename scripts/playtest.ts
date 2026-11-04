/**
 * Offline playtest harness: plays thousands of headless expeditions with the
 * same autoplayer the tests use, records what happened, and writes a report
 * with balance flags (classes, abilities, monsters, the difficulty curve).
 *
 *   node scripts/playtest.ts                       # sweep + campaign, defaults
 *   node scripts/playtest.ts --mode sweep --runs 120 --levels 1,5,11,17,20
 *   node scripts/playtest.ts --mode campaign --campaigns 24 --difficulties standard
 *   node scripts/playtest.ts --mode sweep --finale --runs 40
 *
 * Options
 *   --mode sweep|campaign|both   sweep: fresh level-N parties (gear from the class kit only).
 *                                campaign: one party levelled 1→20 (+ finale) through real
 *                                loot, level-ups and recruits — the progression players feel.
 *   --runs N                     sweep runs per level × difficulty cell (default 60)
 *   --campaigns N                campaigns per difficulty (default 8)
 *   --levels a,b,c               sweep levels (default 1,5,8,11,14,17,20)
 *   --difficulties a,b           default explorer,standard,perilous,deadly
 *   --biomes a,b|all             sweep biomes, rotated per run (default all)
 *   --classes a,b                restrict parties to these classes
 *   --gear earned|kit            sweep gear: loot a campaign would have earned by that level
 *                                (default), or the class starting kit only
 *   --finale                     sweep fights Tiamat's Dragon Throne (level 20 only)
 *   --workers N                  parallel workers (default: cores - 1)
 *   --seed S                     base seed (default PT)
 *   --out DIR                    output directory (default playtest-results/<stamp>)
 *   --quiet                      only print the summary table
 *
 * Outputs report.md (human-readable, with flagged outliers) and data.json
 * (every aggregate, for diffing two balance passes).
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { newGame } from '../src/meta/town.ts';
import { createHero, fullRestore, derive } from '../src/rules/character.ts';
import { Rng } from '../src/engine/rng.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoCombatStep, autoExploreStep, autoLevelChoices } from '../src/app/autoplay.ts';
import { telemetry, type Ctx } from '../src/combat/core.ts';
import { CLASS_IDS } from '../src/content/classes.ts';
import { MONSTERS } from '../src/content/monsters.ts';
import { ITEMS } from '../src/content/items.ts';
import { BIOME_ORDER } from '../src/content/biomes.ts';
import { average } from '../src/engine/dice.ts';
import { rollItem } from '../src/meta/loot.ts';
import { DIFFICULTY_ORDER } from '../src/rules/balance.ts';
import type { BiomeId, ClassId, Combat, Combatant, Difficulty, EquipSlot, GameState, Hero } from '../src/engine/types.ts';

// ── run records ─────────────────────────────────────────────────────────────

interface Num { [k: string]: number }
interface ClassRec { dmg: number; heal: number; kills: number; downs: number; deaths: number; taken: number }
interface MonRec { seen: number; dmg: number; downs: number; kills: number; taken: number; rounds: number; died: number }
interface AbilRec { uses: number; dmg: number }
interface FightRec { kind: Combat['kind']; rounds: number; hpIn: number; hpOut: number; won: boolean }

interface RunRec {
  mode: 'sweep' | 'campaign';
  level: number;
  biome: BiomeId;
  difficulty: Difficulty;
  finale: boolean;
  comp: ClassId[];
  result: 'won' | 'retreated' | 'wiped' | 'stuck';
  deaths: number;
  deadClasses: ClassId[];
  fights: FightRec[];
  bossHpIn: number;
  heroTurns: number;
  bestHand: number;
  wasted: number;
  dealt: number;
  classes: Record<string, ClassRec>;
  abilities: Record<string, AbilRec>;
  monsters: Record<string, MonRec>;
  heals: Num;
  sources: Num;
  /** campaign only */
  campaign?: { id: number; attempt: number };
}

interface CampaignRec { id: number; difficulty: Difficulty; reached: number; finaleWon: boolean; attempts: Num; recruits: number; wipes: number; stalledAt?: number }

let cur: RunRec | null = null;
/** The action each hero is resolving right now (damage on their turn is credited to it). */
const acting: Record<string, string> = {};
const classOf = (ctx: Ctx, c?: Combatant): ClassId | undefined => (c?.side === 'hero' ? ctx.game.roster.find((h) => h.id === c.refId)?.classId : undefined);
const cls = (k: string): ClassRec => (cur!.classes[k] ??= { dmg: 0, heal: 0, kills: 0, downs: 0, deaths: 0, taken: 0 });
const mon = (k: string): MonRec => (cur!.monsters[k] ??= { seen: 0, dmg: 0, downs: 0, kills: 0, taken: 0, rounds: 0, died: 0 });
const abil = (k: string): AbilRec => (cur!.abilities[k] ??= { uses: 0, dmg: 0 });
/** The hero whose turn it is (heals are credited to whoever is acting). */
const actorClass = (ctx: Ctx): ClassId | undefined => {
  const id = ctx.combat.order[ctx.combat.turnIndex];
  return classOf(ctx, id ? ctx.combat.combatants[id] : undefined);
};

telemetry.sink = {
  damage(ctx, e) {
    if (!cur) return;
    if (e.target.side === 'enemy') {
      mon(e.target.refId).taken += e.amount;
      const k = classOf(ctx, e.attacker);
      if (k) {
        cls(k).dmg += e.amount;
        cur.dealt += e.amount;
        const onTurn = ctx.combat.turn?.actorId === e.attacker!.id && acting[e.attacker!.id];
        abil(onTurn ? `${k}: ${acting[e.attacker!.id]}` : `${k}: ${e.source} (off-turn)`).dmg += e.amount;
        cur.sources[e.source] = (cur.sources[e.source] ?? 0) + e.amount;
      }
    } else {
      const k = classOf(ctx, e.target);
      if (k) cls(k).taken += e.amount;
      if (e.attacker?.side === 'enemy') mon(e.attacker.refId).dmg += e.amount;
    }
  },
  down(ctx, e) {
    if (!cur) return;
    const k = classOf(ctx, e.target);
    if (k) cls(k).downs++;
    if (e.attacker?.side === 'enemy') mon(e.attacker.refId).downs++;
  },
  kill(ctx, e) {
    if (!cur) return;
    if (e.target.side === 'enemy') {
      mon(e.target.refId).died++;
      const k = classOf(ctx, e.attacker);
      if (k) cls(k).kills++;
    } else {
      const k = classOf(ctx, e.target);
      if (k) cls(k).deaths++;
      if (e.attacker?.side === 'enemy') mon(e.attacker.refId).kills++;
    }
  },
  heal(ctx, e) {
    if (!cur || e.target.side !== 'hero') return;
    cur.heals[e.source] = (cur.heals[e.source] ?? 0) + e.amount;
    const k = actorClass(ctx);
    if (k) cls(k).heal += e.amount;
  },
  heroAction(ctx, e) {
    if (!cur) return;
    const k = classOf(ctx, e.actor);
    const label = e.label.replace(/ [+]\d+$/, '').replace(/^Attack — .*/, 'Attack');
    acting[e.actor.id] = label;
    if (k) abil(`${k}: ${label}`).uses++;
  },
  wasted(_ctx, e) { if (cur && e.attacker.side === 'hero') cur.wasted += e.amount; },
};

function newRec(mode: RunRec['mode'], level: number, biome: BiomeId, difficulty: Difficulty, finale: boolean, comp: ClassId[]): RunRec {
  return { mode, level, biome, difficulty, finale, comp, result: 'stuck', deaths: 0, deadClasses: [], fights: [], bossHpIn: -1, heroTurns: 0, bestHand: 0, wasted: 0, dealt: 0, classes: {}, abilities: {}, monsters: {}, heals: {}, sources: {} };
}

const partyHpFrac = (combat: Combat) => {
  const hs = Object.values(combat.combatants).filter((c) => c.side === 'hero' && !c.dead);
  const max = hs.reduce((a, c) => a + c.maxHp, 0) || 1;
  return hs.reduce((a, c) => a + c.hp, 0) / max;
};

/** Plays the current expedition to the end, filling `rec`. */
function playExpedition(g: GameState, rec: RunRec) {
  cur = rec;
  const partyIds = g.expedition!.partyIds.slice();
  let steps = 0, stuck = 0;
  let combat: Combat | undefined;
  let hpIn = 1;
  const seenIds = new Set<string>();
  const closeFight = () => {
    if (!combat) return;
    rec.fights.push({ kind: combat.kind, rounds: combat.round, hpIn, hpOut: partyHpFrac(combat), won: combat.status === 'victory' });
    for (const c of Object.values(combat.combatants)) if (c.side === 'enemy') mon(c.refId).rounds += combat.round;
    combat = undefined;
  };
  while (g.expedition && steps++ < 8000) {
    const exp = g.expedition;
    const cb = exp.combat;
    if (cb && cb !== combat) {
      closeFight();
      combat = cb;
      hpIn = partyHpFrac(cb);
      if (cb.kind === 'boss') rec.bossHpIn = hpIn;
      seenIds.clear();
    }
    if (cb) for (const c of Object.values(cb.combatants)) if (c.side === 'enemy' && !seenIds.has(c.id)) { seenIds.add(c.id); mon(c.refId).seen++; }
    if (cb && cb.status === 'active') {
      if (!autoCombatStep(g)) { if (++stuck > 5) break; } else { stuck = 0; rec.heroTurns++; }
      continue;
    }
    if (!autoExploreStep(g)) { if (++stuck > 3) break; } else stuck = 0;
  }
  closeFight();
  const res = g.lastResult;
  rec.result = g.expedition ? 'stuck' : res?.kind ?? 'stuck';
  rec.bestHand = res?.score ?? 0;
  const dead = g.roster.filter((h) => partyIds.includes(h.id) && h.status === 'dead');
  rec.deaths = dead.length;
  rec.deadClasses = dead.map((h) => h.classId);
  cur = null;
  if (g.expedition) g.expedition = undefined; // abandon a stuck run
}

// ── sweep ───────────────────────────────────────────────────────────────────

interface SweepJob { kind: 'sweep'; level: number; difficulty: Difficulty; biome: BiomeId; finale: boolean; seed: string; comp: ClassId[]; gear: 'kit' | 'earned' }
interface CampaignJob { kind: 'campaign'; id: number; difficulty: Difficulty; seed: string; comp: ClassId[]; classes: ClassId[] }
type Job = SweepJob | CampaignJob;

function runSweep(j: SweepJob): RunRec {
  const g = newGame(1, 'legacy', j.seed);
  g.profile.unlockedBiomes = [...BIOME_ORDER];
  const rng = new Rng([hash(j.seed), 7, 9, 11]);
  g.roster = j.comp.map((c) => createHero(rng, c, j.level));
  g.roster.forEach(fullRestore);
  if (j.gear === 'earned') earnedGear(g, rng, j.level);
  const rec = newRec('sweep', j.level, j.finale ? 'starfall' : j.biome, j.difficulty, j.finale, j.comp);
  const r = dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: j.biome, difficulty: j.difficulty, seed: `${j.seed}-x`, finale: j.finale });
  if (!r.ok) throw new Error(`start failed: ${r.error}`);
  playExpedition(g, rec);
  return rec;
}

// ── campaign ────────────────────────────────────────────────────────────────

const SLOTS: EquipSlot[] = ['mainHand', 'offHand', 'armor', 'trinket1', 'trinket2'];

/** A rough "is this hero stronger" number used only to pick gear. */
function power(h: Hero): number {
  const d = derive(h);
  const weapon = (average(d.main.dice) + d.main.bonus) * d.attacks + d.main.toHit * 1.5;
  const saves = Object.values(d.saves).reduce((a, b) => a + b, 0);
  const caster = d.spellAbility ? d.spellDc * 3 + d.spellAttack * 1.5 : 0;
  return d.ac * 9 + d.maxHp * 0.12 + weapon * 2.5 + caster + saves * 0.8 + d.rerollBonus * 6 + d.tricks * 3 + d.lifesteal * 40 + d.diceGear.openingWild * 8 + d.diceGear.hands.length * 6;
}

/** Equip whatever vault items make someone stronger (greedy, one pass per item). */
function autoGear(g: GameState) {
  const items = g.vault.filter((i) => ITEMS[i.defId] && ITEMS[i.defId].kind !== 'consumable');
  for (const it of items) {
    let best: { h: Hero; slot: EquipSlot; gain: number } | null = null;
    for (const h of g.roster.filter((x) => x.status === 'alive')) {
      for (const slot of SLOTS) {
        const before = power(h);
        const prev = h.equipment[slot];
        const prevOff = h.equipment.offHand;
        const hp = h.hp;
        if (dispatch(g, { type: 'equip', heroId: h.id, uid: it.uid, slot }).ok) {
          const gain = power(h) - before;
          // revert
          dispatch(g, { type: 'unequip', heroId: h.id, slot });
          if (prev) dispatch(g, { type: 'equip', heroId: h.id, uid: prev.uid, slot });
          if (prevOff && !h.equipment.offHand && slot === 'mainHand') dispatch(g, { type: 'equip', heroId: h.id, uid: prevOff.uid, slot: 'offHand' });
          h.hp = hp;
          if (gain > 0.5 && (!best || gain > best.gain)) best = { h, slot, gain };
        }
      }
    }
    if (best) dispatch(g, { type: 'equip', heroId: best.h.id, uid: it.uid, slot: best.slot });
  }
  for (const h of g.roster) fullRestore(h);
}

/** Spend banked gold on healing potions so the party carries some. */
function autoShop(g: GameState) {
  for (let i = 0; i < 3; i++) {
    const pot = ['potionSuperior', 'potionGreater', 'potionHealing'].find((id) => ITEMS[id] && g.profile.bankedGold >= ITEMS[id].price * 2);
    if (!pot || g.vault.filter((x) => x.defId.startsWith('potion')).length >= 3) break;
    if (!dispatch(g, { type: 'buy', defId: pot }).ok) break;
  }
}

/**
 * Sweep parties get the loot a campaign would have earned by this level: per
 * cleared level, a boss pick and two room finds (the game's own loot tables),
 * then the same greedy auto-equip the campaign uses.
 */
function earnedGear(g: GameState, rng: Rng, level: number) {
  for (let l = 1; l < level; l++) {
    const biome = biomeFor(l);
    let boss = rollItem(rng, l, biome, { boost: 1 });
    for (let k = 0; k < 8 && ITEMS[boss.defId].kind === 'consumable'; k++) boss = rollItem(rng, l, biome, { boost: 1 });
    g.vault.push(boss, rollItem(rng, l, biome), rollItem(rng, l, biome));
  }
  autoGear(g);
}

const biomeFor = (level: number): BiomeId => BIOME_ORDER[Math.min(4, Math.floor((level - 1) / 4))];

function runCampaign(j: CampaignJob): { runs: RunRec[]; camp: CampaignRec } {
  const g = newGame(1, 'legacy', j.seed);
  g.profile.unlockedBiomes = [...BIOME_ORDER];
  const rng = new Rng([hash(j.seed), 3, 5, 7]);
  g.roster = j.comp.map((c) => createHero(rng, c, 1));
  g.roster.forEach(fullRestore);
  const runs: RunRec[] = [];
  const camp: CampaignRec = { id: j.id, difficulty: j.difficulty, reached: 1, finaleWon: false, attempts: {}, recruits: 0, wipes: 0 };
  let attempt = 0;
  let frontier = 1;
  for (let guard = 0; guard < 80; guard++) {
    const party = g.roster.filter((h) => h.status === 'alive').slice(0, 3);
    const level = Math.max(...party.map((h) => h.level));
    const finale = level >= 20 && party.every((h) => h.level >= 20);
    camp.reached = level;
    camp.attempts[level] = (camp.attempts[level] ?? 0) + 1;
    if (camp.attempts[level] > 6) { camp.stalledAt = level; break; }
    const biome = finale ? 'starfall' : biomeFor(level);
    const rec = newRec('campaign', level, biome, j.difficulty, finale, party.map((h) => h.classId));
    rec.campaign = { id: j.id, attempt: attempt++ };
    const r = dispatch(g, { type: 'startExpedition', partyIds: party.map((h) => h.id), biome, difficulty: j.difficulty, seed: `${j.seed}-${guard}`, finale });
    if (!r.ok) throw new Error(`campaign start failed: ${r.error}`);
    playExpedition(g, rec);
    runs.push(rec);
    if (process.env.PT_DEBUG) console.error('camp', j.id, 'L', level, party.map((h) => `${h.classId}${h.level}`).join(','), rec.result, finale ? 'FINALE' : '');
    dispatch(g, { type: 'ackResult' });
    if (finale && rec.result === 'won') { camp.finaleWon = true; break; }
    for (const h of g.roster.filter((x) => x.pendingLevel)) {
      const res = dispatch(g, { type: 'levelUp', heroId: h.id, choices: autoLevelChoices(h) });
      if (!res.ok) { if (process.env.PT_DEBUG) console.error('levelUp failed', h.classId, h.level, res.error); h.pendingLevel = false; }
    }
    // The fallen are replaced by recruits two levels behind the frontier, as the
    // guild offers (a total wipe assumes a benched party of the same standing).
    if (rec.result === 'wiped') camp.wipes++;
    g.roster = g.roster.filter((h) => h.status === 'alive');
    frontier = Math.max(frontier, ...g.roster.map((h) => h.level));
    while (g.roster.length < 3) {
      const pool = j.classes.filter((c) => !g.roster.some((h) => h.classId === c));
      const c = pool.length ? rng.pick(pool) : rng.pick(j.classes);
      const h = createHero(rng, c, Math.max(1, frontier - 2));
      fullRestore(h);
      g.roster.push(h);
      camp.recruits++;
    }
    autoGear(g);
    autoShop(g);
  }
  return { runs, camp };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ── main: schedule, aggregate, report ───────────────────────────────────────

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : 'true';
}

async function main() {
  const mode = arg('mode', 'both')!;
  const runs = Number(arg('runs', '60'));
  const campaigns = Number(arg('campaigns', '8'));
  const finale = arg('finale') === 'true';
  const levels = finale ? [20] : arg('levels', '1,5,8,11,14,17,20')!.split(',').map(Number);
  const diffs = arg('difficulties', DIFFICULTY_ORDER.join(','))!.split(',') as Difficulty[];
  const biomesArg = arg('biomes', 'all')!;
  const biomes = (biomesArg === 'all' ? BIOME_ORDER : biomesArg.split(',')) as BiomeId[];
  const classes = (arg('classes') ? arg('classes')!.split(',') : CLASS_IDS) as ClassId[];
  const seed = arg('seed', 'PT')!;
  const workers = Math.max(1, Number(arg('workers', String(Math.max(1, availableParallelism() - 1)))));
  const quiet = arg('quiet') === 'true';
  const gear = (arg('gear', 'earned') === 'kit' ? 'kit' : 'earned') as SweepJob['gear'];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = arg('out', `playtest-results/${stamp}`)!;

  const pickComp = (rng: Rng): ClassId[] => rng.shuffle(classes.slice()).slice(0, 3);
  const jobs: Job[] = [];
  if (mode === 'sweep' || mode === 'both') {
    const rng = new Rng([hash(seed), 1, 2, 3]);
    for (const level of levels) for (const difficulty of diffs) for (let i = 0; i < runs; i++) {
      jobs.push({ kind: 'sweep', level, difficulty, biome: biomes[i % biomes.length], finale, seed: `${seed}-S-${level}-${difficulty}-${i}`, comp: pickComp(rng), gear });
    }
  }
  if ((mode === 'campaign' || mode === 'both') && !finale) {
    const rng = new Rng([hash(seed), 4, 5, 6]);
    for (const difficulty of diffs) for (let i = 0; i < campaigns; i++) {
      jobs.push({ kind: 'campaign', id: jobs.length, difficulty, seed: `${seed}-C-${difficulty}-${i}`, comp: pickComp(rng), classes });
    }
  }
  // Campaigns are long: schedule them first, then interleave sweep jobs round-robin.
  jobs.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'campaign' ? -1 : 1));
  const buckets: Job[][] = Array.from({ length: workers }, () => []);
  jobs.forEach((j, i) => buckets[i % workers].push(j));

  const t0 = Date.now();
  const all: RunRec[] = [];
  const camps: CampaignRec[] = [];
  let done = 0;
  const total = jobs.length;
  const errors: string[] = [];
  await Promise.all(buckets.filter((b) => b.length).map((bucket) => new Promise<void>((resolve, reject) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: bucket } });
    w.on('message', (m: { runs?: RunRec[]; camp?: CampaignRec; error?: string; done?: boolean }) => {
      if (m.error) { errors.push(m.error); done++; return; }
      if (m.done) { w.terminate(); resolve(); return; }
      if (m.runs) all.push(...m.runs);
      if (m.camp) camps.push(m.camp);
      done++;
      if (!quiet && (done % 50 === 0 || done === total)) process.stdout.write(`\r  ${done}/${total} jobs · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    });
    w.on('error', reject);
  })));
  if (!quiet) process.stdout.write('\n');
  if (errors.length) { console.error(`${errors.length} job(s) failed. First:\n${errors[0]}`); }

  const report = analyse(all, camps, { mode, runs, campaigns, levels, diffs, biomes, classes, seed, finale, gear, seconds: (Date.now() - t0) / 1000 });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/report.md`, report.md);
  writeFileSync(`${outDir}/data.json`, JSON.stringify(report.data, null, 1));
  console.log(report.console);
  console.log(`\nReport: ${outDir}/report.md  ·  data: ${outDir}/data.json`);
}

// ── analysis ────────────────────────────────────────────────────────────────

/** Target bands the tuning aims for (sweep, per level): win rate and deaths per run. */
const TARGETS: Record<Difficulty, { win: [number, number]; deaths: [number, number] }> = {
  explorer: { win: [0.9, 0.98], deaths: [0, 0.3] },
  standard: { win: [0.8, 0.9], deaths: [0.2, 0.6] },
  perilous: { win: [0.62, 0.78], deaths: [0.5, 1.1] },
  deadly: { win: [0.42, 0.62], deaths: [0.9, 1.7] },
};

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '–');
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '–');
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs: number[]) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const tierOf = (level: number) => (level >= 17 ? 'mythic' : level >= 11 ? 'heroic' : level >= 5 ? 'veteran' : 'novice');
const table = (head: string[], rows: (string | number)[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

interface Cell { n: number; won: number; wiped: number; retreated: number; stuck: number; deaths: number; fights: number; rounds: number[]; bossRounds: number[]; bossHpIn: number[]; turns: number; wasted: number; dealt: number }

function cellOf(rs: RunRec[]): Cell {
  const c: Cell = { n: rs.length, won: 0, wiped: 0, retreated: 0, stuck: 0, deaths: 0, fights: 0, rounds: [], bossRounds: [], bossHpIn: [], turns: 0, wasted: 0, dealt: 0 };
  for (const r of rs) {
    c[r.result]++;
    c.deaths += r.deaths;
    c.fights += r.fights.length;
    c.turns += r.heroTurns;
    c.wasted += r.wasted;
    c.dealt += r.dealt;
    for (const f of r.fights) { if (f.kind === 'boss') c.bossRounds.push(f.rounds); else c.rounds.push(f.rounds); }
    if (r.bossHpIn >= 0) c.bossHpIn.push(r.bossHpIn);
  }
  return c;
}

function analyse(all: RunRec[], camps: CampaignRec[], meta: Record<string, unknown> & { levels: number[]; diffs: Difficulty[]; seconds: number }) {
  const md: string[] = [];
  const con: string[] = [];
  const flags: string[] = [];
  const sweep = all.filter((r) => r.mode === 'sweep');
  const camp = all.filter((r) => r.mode === 'campaign');
  md.push(`# Playtest report`, '', `${all.length} expeditions (${sweep.length} sweep, ${camp.length} campaign, ${camps.length} campaigns) in ${meta.seconds.toFixed(0)}s. Seed \`${meta.seed}\`.`, '');
  md.push('Sweep = fresh level-N parties (gear: `' + meta.gear + '`). Campaign = one party levelled from 1 to 20 through real loot, level-ups and recruits (the progression players feel). Target bands are in `scripts/playtest.ts` (`TARGETS`).', '');

  // 1. Difficulty curve.
  const data: Record<string, unknown> = { meta, curve: {}, campaign: {}, classes: {}, abilities: {}, monsters: {}, flags };
  for (const [label, rs] of [['Sweep', sweep], ['Campaign', camp]] as const) {
    if (!rs.length) continue;
    const levels = [...new Set(rs.map((r) => r.level))].sort((a, b) => a - b);
    const diffs = meta.diffs.filter((d) => rs.some((r) => r.difficulty === d));
    md.push(`## ${label}: win rate by level`, '');
    const rows: (string | number)[][] = [];
    const curve: Record<string, Record<number, unknown>> = {};
    for (const d of diffs) {
      curve[d] = {};
      const row: (string | number)[] = [d];
      const winsByLevel: number[] = [];
      for (const L of levels) {
        const cs = rs.filter((r) => r.difficulty === d && r.level === L);
        if (!cs.length) { row.push('–'); continue; }
        const c = cellOf(cs);
        const w = c.won / c.n;
        winsByLevel.push(w);
        row.push(`${pct(w)} (${f1(c.deaths / c.n)}†, n${c.n})`);
        curve[d][L] = { n: c.n, win: w, wipe: c.wiped / c.n, deathsPerRun: c.deaths / c.n, fightsPerRun: c.fights / c.n, roundsPerFight: mean(c.rounds), bossRounds: mean(c.bossRounds), bossHpIn: mean(c.bossHpIn), overkillWasted: c.wasted / Math.max(1, c.dealt + c.wasted), stuck: c.stuck };
        if (label === 'Sweep') {
          const t = TARGETS[d];
          if (c.n >= 20 && (w < t.win[0] - 0.04 || w > t.win[1] + 0.04)) flags.push(`Curve: ${d} L${L} wins ${pct(w)} (target ${pct(t.win[0])}–${pct(t.win[1])}).`);
        }
        if (c.stuck) flags.push(`Autoplay got stuck ${c.stuck}× (${label} ${d} L${L}).`);
      }
      const all = rs.filter((r) => r.difficulty === d);
      const c = cellOf(all);
      row.push(`**${pct(c.won / c.n)}**`);
      if (winsByLevel.length >= 3) {
        const spread = Math.max(...winsByLevel) - Math.min(...winsByLevel);
        row.push(pct(spread));
        if (label === 'Sweep' && spread > 0.2) flags.push(`Curve: ${d} win rate swings ${pct(spread)} across levels (${winsByLevel.map(pct).join(' → ')}).`);
      } else row.push('–');
      rows.push(row);
    }
    md.push(table(['difficulty', ...levels.map((l) => `L${l}`), 'all', 'spread'], rows), '', '`(x†)` = heroes killed per run.', '');
    (data.curve as Record<string, unknown>)[label] = curve;
    // Tension details.
    md.push(`### ${label}: fight texture`, '');
    const trows: (string | number)[][] = [];
    for (const d of diffs) {
      for (const L of levels) {
        const cs = rs.filter((r) => r.difficulty === d && r.level === L);
        if (!cs.length) continue;
        const c = cellOf(cs);
        trows.push([d, `L${L}`, f1(c.fights / c.n), f1(mean(c.rounds)), f1(mean(c.bossRounds)), pct(mean(c.bossHpIn)), pct(c.wasted / Math.max(1, c.dealt + c.wasted)), pct(c.wiped / c.n), c.retreated]);
      }
    }
    md.push(table(['difficulty', 'level', 'fights/run', 'rounds/fight', 'boss rounds', 'party HP entering boss', 'dmg lost to overkill', 'wipes', 'retreats'], trows), '');
    // Ordering check.
    for (const L of levels) {
      const ws = diffs.map((d) => { const cs = rs.filter((r) => r.difficulty === d && r.level === L); return cs.length ? cellOf(cs).won / cs.length : NaN; });
      for (let i = 1; i < ws.length; i++) if (ws[i] > ws[i - 1] + 0.05 && label === 'Sweep') flags.push(`Ordering: ${diffs[i]} beats ${diffs[i - 1]} at L${L} (${pct(ws[i])} vs ${pct(ws[i - 1])}).`);
    }
  }

  // 1b. Biomes (sweep rotates biomes per run, so each level sees all five).
  if (sweep.length) {
    const diffs = meta.diffs.filter((d) => sweep.some((r) => r.difficulty === d));
    const bs = [...new Set(sweep.map((r) => r.biome))];
    md.push('## Sweep: win rate by biome', '');
    const brow: (string | number)[][] = [];
    const bdata: Record<string, Record<string, number>> = {};
    for (const b of bs) {
      bdata[b] = {};
      const row: (string | number)[] = [b];
      for (const d of diffs) {
        const cs = sweep.filter((r) => r.biome === b && r.difficulty === d);
        const w = cs.filter((r) => r.result === 'won').length / Math.max(1, cs.length);
        bdata[b][d] = w;
        row.push(cs.length ? `${pct(w)} (n${cs.length})` : '–');
      }
      const cs = sweep.filter((r) => r.biome === b);
      row.push(`**${pct(cs.filter((r) => r.result === 'won').length / Math.max(1, cs.length))}**`, f1(mean(cs.flatMap((r) => r.fights.filter((f) => f.kind === 'boss').map((f) => f.rounds)))));
      brow.push(row);
    }
    const overall = sweep.filter((r) => r.result === 'won').length / sweep.length;
    for (const b of bs) {
      const cs = sweep.filter((r) => r.biome === b);
      const w = cs.filter((r) => r.result === 'won').length / cs.length;
      if (cs.length >= 60 && Math.abs(w - overall) > 0.08) flags.push(`Biome: ${b} wins ${pct(w)} vs ${pct(overall)} overall (${w < overall ? 'harder' : 'easier'}).`);
    }
    md.push(table(['biome', ...diffs, 'all', 'boss rounds'], brow), '');
    data.biomes = bdata;
    // Bosses.
    const bossRows: (string | number)[][] = [];
    const bossIds = [...new Set(sweep.map((r) => Object.keys(r.monsters).find((k) => MONSTERS[k]?.role === 'boss')).filter(Boolean) as string[])];
    for (const id of bossIds) {
      const cs = sweep.filter((r) => r.monsters[id] && r.fights.some((f) => f.kind === 'boss'));
      if (cs.length < 10) continue;
      const fights = cs.map((r) => r.fights.find((f) => f.kind === 'boss')!);
      const w = fights.filter((f) => f.won).length / fights.length;
      bossRows.push([MONSTERS[id].name, MONSTERS[id].biome, cs.length, pct(w), f1(mean(fights.map((f) => f.rounds))), pct(mean(fights.map((f) => f.hpIn))), pct(mean(fights.filter((f) => f.won).map((f) => f.hpOut)))]);
      if (cs.length >= 30 && w < 0.7) flags.push(`Boss: ${MONSTERS[id].name} beats ${pct(1 - w)} of parties that reach it.`);
    }
    if (bossRows.length) md.push('## Sweep: bosses', '', '`win` is the share of boss fights the party won (given it reached the boss).', '', table(['boss', 'biome', 'fights', 'win', 'rounds', 'party HP in', 'HP left on a win'], bossRows.sort((a, b) => parseFloat(String(a[3])) - parseFloat(String(b[3])))), '');
  }

  // 2. Campaigns.
  if (camps.length) {
    md.push('## Campaigns (level 1 → 20 → Tiamat)', '');
    const rows: (string | number)[][] = [];
    const cdata: Record<string, unknown> = {};
    for (const d of meta.diffs) {
      const cs = camps.filter((c) => c.difficulty === d);
      if (!cs.length) continue;
      const tiers: Record<string, number[]> = { novice: [], veteran: [], heroic: [], mythic: [] };
      for (const c of cs) for (const [L, n] of Object.entries(c.attempts)) tiers[tierOf(Number(L))].push(n);
      const finished = cs.filter((c) => c.finaleWon).length;
      const stalled = cs.filter((c) => c.stalledAt).map((c) => c.stalledAt!);
      rows.push([d, cs.length, pct(finished / cs.length), f1(mean(cs.map((c) => c.reached))), ...Object.values(tiers).map((xs) => f2(mean(xs))), f1(mean(cs.map((c) => c.recruits))), f1(mean(cs.map((c) => c.wipes))), stalled.length ? stalled.join(', ') : '–']);
      cdata[d] = { campaigns: cs.length, finaleWon: finished / cs.length, avgReached: mean(cs.map((c) => c.reached)), attemptsPerLevelByTier: Object.fromEntries(Object.entries(tiers).map(([k, v]) => [k, mean(v)])), recruits: mean(cs.map((c) => c.recruits)), wipes: mean(cs.map((c) => c.wipes)), stalled };
      const t = Object.values(tiers).map(mean).filter(Number.isFinite);
      if (t.length >= 3 && t[t.length - 1] < t[0] * 0.75) flags.push(`Campaign (${d}): late game is easier than the start — attempts per level ${t.map(f2).join(' → ')} by tier.`);
      if (t.length >= 3 && t[t.length - 1] > t[0] * 1.6) flags.push(`Campaign (${d}): late game is much harder than the start — attempts per level ${t.map(f2).join(' → ')} by tier.`);
    }
    md.push(table(['difficulty', 'n', 'beat Tiamat', 'avg level reached', 'tries/level L1-4', 'L5-10', 'L11-16', 'L17-20', 'recruits', 'wipes', 'stalled at'], rows), '', '`tries/level` is expeditions per level gained: 1.00 means every run was cleared.', '');
    data.campaign = cdata;
  }

  // 3. Classes.
  md.push('## Classes', '', 'Win rate is for runs that included the class (sweep + campaign). Damage share: the class\'s share of party damage × 3 (1.00 = pulls its weight). Healing share is the same for healing done on its turns.', '');
  const crow: (string | number)[][] = [];
  const cdata: Record<string, unknown> = {};
  const overallWin = all.filter((r) => r.result === 'won').length / Math.max(1, all.length);
  const classIds = [...new Set(all.flatMap((r) => r.comp))].sort();
  for (const k of classIds) {
    const rs = all.filter((r) => r.comp.includes(k));
    const win = rs.filter((r) => r.result === 'won').length / rs.length;
    let share = 0, hshare = 0, downs = 0, deaths = 0, kills = 0;
    for (const r of rs) {
      const tot = Object.values(r.classes).reduce((a, c) => a + c.dmg, 0) || 1;
      const htot = Object.values(r.classes).reduce((a, c) => a + c.heal, 0) || 1;
      const c = r.classes[k];
      if (!c) continue;
      share += (c.dmg / tot) * 3;
      hshare += (c.heal / htot) * 3;
      downs += c.downs; deaths += c.deaths; kills += c.kills;
    }
    const n = rs.length;
    crow.push([k, n, pct(win), `${win - overallWin >= 0 ? '+' : ''}${((win - overallWin) * 100).toFixed(0)}`, f2(share / n), f2(hshare / n), f2(kills / n), f2(downs / n), f2(deaths / n)]);
    cdata[k] = { runs: n, win, winDelta: win - overallWin, dmgShare: share / n, healShare: hshare / n, killsPerRun: kills / n, downsPerRun: downs / n, deathsPerRun: deaths / n };
    if (n >= 40 && Math.abs(win - overallWin) > 0.07) flags.push(`Class: ${k} parties win ${pct(win)} vs ${pct(overallWin)} overall (${win > overallWin ? 'strong' : 'weak'}).`);
    if (n >= 40 && share / n > 1.35) flags.push(`Class: ${k} deals ${f2(share / n)}× its share of damage.`);
    if (n >= 40 && share / n < 0.65 && hshare / n < 1.2) flags.push(`Class: ${k} deals only ${f2(share / n)}× its share of damage and isn't a main healer.`);
  }
  const deathAvg = mean(Object.values(cdata).map((c) => (c as { deathsPerRun: number }).deathsPerRun));
  for (const [k, c] of Object.entries(cdata) as [string, { deathsPerRun: number; runs: number }][]) {
    if (c.runs >= 40 && c.deathsPerRun > deathAvg * 1.6 && c.deathsPerRun > 0.1) flags.push(`Class: ${k} dies ${f2(c.deathsPerRun)}/run (avg ${f2(deathAvg)}) — fragile.`);
  }
  md.push(table(['class', 'runs', 'win', 'Δ win (pp)', 'dmg share', 'heal share', 'kills/run', 'downs/run', 'deaths/run'], crow.sort((a, b) => Number(b[3]) - Number(a[3]))), '');
  data.classes = cdata;

  // 4. Abilities.
  const ab: Record<string, AbilRec & { runs: number }> = {};
  for (const r of all) for (const [k, a] of Object.entries(r.abilities)) { const x = (ab[k] ??= { uses: 0, dmg: 0, runs: 0 }); x.uses += a.uses; x.dmg += a.dmg; x.runs++; }
  const abRows = Object.entries(ab).filter(([, a]) => a.uses >= 15).map(([k, a]) => ({ k, ...a, per: a.dmg / a.uses }));
  // Normalise by level: compare per-use damage inside each class.
  md.push('## Abilities', '', 'Hero actions with at least 15 uses. `dmg/use` is the damage a hero deals during the turn they take that action (riders included) divided by uses. Off-turn damage (zones, reactions) is listed with `(off-turn)`. `vs main attack` compares with the class\'s most-used damaging action.', '');
  const byClass: Record<string, typeof abRows> = {};
  for (const a of abRows) (byClass[a.k.split(':')[0]] ??= []).push(a);
  const arows: (string | number)[][] = [];
  for (const [k, list] of Object.entries(byClass).sort()) {
    // Baseline: the class's most-used action that deals real damage.
    const top = Math.max(...list.map((x) => x.per));
    const base = list.filter((x) => x.per >= top * 0.2).sort((x, y) => y.uses - x.uses)[0];
    for (const a of list.sort((x, y) => y.uses - x.uses).slice(0, 10)) {
      const rel = base && base.per > 0 && a.per > 0 ? a.per / base.per : NaN;
      arows.push([a.k, a.uses, Math.round(a.per), Number.isFinite(rel) ? f2(rel) : '–']);
    }
    void k;
  }
  // Spells against other spells of the same slot level, across classes.
  const byLevel: Record<string, typeof abRows> = {};
  for (const a of abRows) { const m = a.k.match(/\((cantrip|\d+(?:st|nd|rd|th))\)$/); if (m && a.dmg > 0) (byLevel[m[1]] ??= []).push(a); }
  for (const [lvl, list] of Object.entries(byLevel)) {
    if (list.length < 4) continue;
    const med = median(list.map((x) => x.per));
    for (const a of list) {
      if (a.uses < 60) continue;
      if (a.per / med > 2.2) flags.push(`Ability: ${a.k} deals ${f2(a.per / med)}× the median ${lvl}-level damage spell per use.`);
      if (a.per / med < 0.4) flags.push(`Ability: ${a.k} deals only ${f2(a.per / med)}× the median ${lvl}-level damage spell per use.`);
    }
  }
  md.push(table(['class: ability', 'uses', 'dmg/use', 'vs main attack'], arows), '');
  const src: Num = {};
  for (const r of all) for (const [k, v] of Object.entries(r.sources)) src[k] = (src[k] ?? 0) + v;
  const srows = Object.entries(src).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, Math.round(v / all.length), pct(v / Math.max(1, all.reduce((a, r) => a + r.dealt, 0)))]);
  if (srows.length) md.push('### Hero damage by source', '', 'Every damage source, including riders (Cleave, Overkill, Spiritual Weapon, zones) that have no action of their own.', '', table(['source', 'dmg/run', 'share'], srows), '');
  data.abilities = ab;
  // Heals.
  const heals: Num = {};
  for (const r of all) for (const [k, v] of Object.entries(r.heals)) heals[k] = (heals[k] ?? 0) + v;
  const hrows = Object.entries(heals).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => [k, Math.round(v / all.length)]);
  if (hrows.length) md.push('### Healing sources', '', table(['source', 'HP/run'], hrows), '');

  // 5. Monsters, per tier.
  md.push('## Monsters', '', '`threat` = damage dealt to heroes per appearance, relative to the median monster of the same role and tier (1.00 = typical). `downs%` = heroes dropped per appearance. `life` = rounds it survives on average.', '');
  const mdata: Record<string, unknown> = {};
  for (const tier of ['novice', 'veteran', 'heroic', 'mythic']) {
    const rs = all.filter((r) => tierOf(r.level) === tier);
    if (!rs.length) continue;
    const agg: Record<string, MonRec> = {};
    for (const r of rs) for (const [k, m] of Object.entries(r.monsters)) {
      const x = (agg[k] ??= { seen: 0, dmg: 0, downs: 0, kills: 0, taken: 0, rounds: 0, died: 0 });
      for (const f of Object.keys(m) as (keyof MonRec)[]) x[f] += m[f];
    }
    const list = Object.entries(agg).filter(([, m]) => m.seen >= 8).map(([k, m]) => ({ k, role: MONSTERS[k]?.role ?? '?', ...m, per: m.dmg / m.seen }));
    const roleMed: Record<string, number> = {};
    for (const role of new Set(list.map((x) => x.role))) roleMed[role] = median(list.filter((x) => x.role === role).map((x) => x.per));
    const rows = list.sort((a, b) => b.per / (roleMed[b.role] || 1) - a.per / (roleMed[a.role] || 1)).map((m) => {
      const threat = m.per / (roleMed[m.role] || 1);
      if (m.seen >= 30 && list.filter((x) => x.role === m.role).length >= 3 && (threat > 1.6 || threat < 0.5)) flags.push(`Monster (${tier}): ${MONSTERS[m.k]?.name ?? m.k} [${m.role}] threat ${f2(threat)} vs its role.`);
      return [MONSTERS[m.k]?.name ?? m.k, m.role, m.seen, Math.round(m.per), f2(threat), pct(m.downs / m.seen), f1(m.rounds / m.seen)];
    });
    md.push(`### ${tier} (${rs.length} runs)`, '', table(['monster', 'role', 'seen', 'dmg/appearance', 'threat', 'downs%', 'life'], rows), '');
    mdata[tier] = agg;
  }
  data.monsters = mdata;

  // 6. Flags at the top.
  const head = ['## Flags', '', flags.length ? flags.map((f) => `- ${f}`).join('\n') : '_Nothing out of band._', ''];
  md.splice(4, 0, ...head);

  // Console: compact curve + flags.
  con.push(`\n${all.length} expeditions in ${meta.seconds.toFixed(0)}s`);
  for (const [label, rs] of [['sweep', sweep], ['campaign', camp]] as const) {
    if (!rs.length) continue;
    const levels = [...new Set(rs.map((r) => r.level))].sort((a, b) => a - b);
    con.push(`\n${label.padEnd(10)}${levels.map((l) => `L${l}`.padStart(6)).join('')}    all  deaths/run`);
    for (const d of meta.diffs) {
      const ds = rs.filter((r) => r.difficulty === d);
      if (!ds.length) continue;
      const cells = levels.map((L) => { const cs = ds.filter((r) => r.level === L); return cs.length ? pct(cs.filter((r) => r.result === 'won').length / cs.length).padStart(6) : '     –'; });
      const c = cellOf(ds);
      con.push(`${d.padEnd(10)}${cells.join('')}  ${pct(c.won / c.n).padStart(5)}  ${f2(c.deaths / c.n)}`);
    }
  }
  if (camps.length) {
    con.push('\ncampaign    beat Tiamat  tries/level by tier (novice→mythic)');
    for (const d of meta.diffs) {
      const cs = camps.filter((c) => c.difficulty === d);
      if (!cs.length) continue;
      const tiers: Record<string, number[]> = { novice: [], veteran: [], heroic: [], mythic: [] };
      for (const c of cs) for (const [L, n] of Object.entries(c.attempts)) tiers[tierOf(Number(L))].push(n);
      con.push(`${d.padEnd(12)}${pct(cs.filter((c) => c.finaleWon).length / cs.length).padStart(10)}   ${Object.values(tiers).map((x) => f2(mean(x))).join(' → ')}`);
    }
  }
  con.push(`\nFlags (${flags.length}):`);
  for (const f of flags.slice(0, 25)) con.push(`  - ${f}`);
  if (flags.length > 25) con.push(`  … ${flags.length - 25} more in the report`);
  return { md: md.join('\n'), console: con.join('\n'), data };
}

// ── worker ──────────────────────────────────────────────────────────────────

if (!isMainThread) {
  const jobs = workerData.jobs as Job[];
  for (const j of jobs) {
    try {
      if (j.kind === 'sweep') parentPort!.postMessage({ runs: [runSweep(j)] });
      else parentPort!.postMessage(runCampaign(j));
    } catch (e) {
      parentPort!.postMessage({ error: String((e as Error).stack ?? e) });
    }
  }
  parentPort!.postMessage({ done: true });
} else {
  await main();
}
