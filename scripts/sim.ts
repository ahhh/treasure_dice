/**
 * Monte Carlo balance simulator: fresh level-N parties vs dungeons.
 *   node scripts/sim.ts [runs] [level] [biome] [difficulty]
 */
import { newGame } from '../src/meta/town.ts';
import { createHero, fullRestore } from '../src/rules/character.ts';
import { Rng } from '../src/engine/rng.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoExpedition } from '../src/app/autoplay.ts';
import type { BiomeId, ClassId, Difficulty } from '../src/engine/types.ts';

const runs = Number(process.argv[2] ?? 40);
const level = Number(process.argv[3] ?? 1);
const biome = (process.argv[4] ?? 'cinder') as BiomeId;
const diff = (process.argv[5] ?? 'standard') as Difficulty;
const comps: ClassId[][] = [
  ['fighter', 'cleric', 'rogue'], ['barbarian', 'bard', 'wizard'], ['paladin', 'druid', 'ranger'],
  ['monk', 'sorcerer', 'warlock'], ['fighter', 'wizard', 'cleric'], ['rogue', 'warlock', 'paladin'],
];
const tally: Record<string, number> = {};
let best = 0, totalTurns = 0, deaths = 0, fights = 0; const bossRounds: number[] = [];
const t0 = Date.now();
for (let i = 0; i < runs; i++) {
  const g = newGame(1, 'legacy', `SIM-${i}`);
  g.profile.unlockedBiomes = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
  const comp = comps[i % comps.length];
  const rng = new Rng([i + 1, 7, 9, 11]);
  g.roster = comp.map((c) => createHero(rng, c, level));
  g.roster.forEach(fullRestore);
  const r = dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome, difficulty: diff, seed: `SIM-${biome}-${i}` });
  if (!r.ok) { console.log('start failed', r.error); continue; }
  const orig = g;
  const rep = autoExpedition(g);
  void orig;
  tally[`${rep.result}`] = (tally[rep.result] ?? 0) + 1;
  tally[`${comp.join('/')}:${rep.result}`] = (tally[`${comp.join('/')}:${rep.result}`] ?? 0) + 1;
  best = Math.max(best, rep.bestScore);
  totalTurns += rep.turns;
  fights += g.lastResult?.fights ?? 0;
  if (g.lastResult?.bossRounds) bossRounds.push(g.lastResult.bossRounds);
  deaths += g.roster.filter((h) => h.status === 'dead').length;
}
console.log(`L${level} ${biome} ${diff}: ${runs} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const [k, v] of Object.entries(tally).sort()) console.log(`  ${k.padEnd(40)} ${v}`);
console.log(`  boss rounds avg ${(bossRounds.reduce((a, b) => a + b, 0) / Math.max(1, bossRounds.length)).toFixed(1)} (min ${Math.min(...bossRounds)}, max ${Math.max(...bossRounds)})`);
console.log(`  fights/run ${(fights / runs).toFixed(1)}, turns/fight ${(totalTurns / Math.max(1, fights)).toFixed(1)}, avg hero turns/run ${(totalTurns / runs).toFixed(0)}, deaths ${deaths}, best hand ${best}`);
