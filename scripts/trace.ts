import { newGame } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoCombatStep, autoExploreStep } from '../src/app/autoplay.ts';
const g = newGame(1, 'legacy', 'TRACE');
dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: (process.argv[2] ?? 'cinder') as never, difficulty: 'standard', seed: process.argv[3] ?? 'TRACE-1' });
let lastC = 0, lastX = 0;
for (let i = 0; i < 3000 && g.expedition; i++) {
  const exp = g.expedition;
  if (exp.combat && exp.combat.status === 'active') {
    autoCombatStep(g);
  } else autoExploreStep(g);
  const e = g.expedition;
  if (!e) break;
  if (e.combat) { for (const l of e.combat.log.slice(lastC)) console.log('  C|', l.t); lastC = e.combat.log.length; } else lastC = 0;
  for (const l of e.log.slice(lastX)) console.log('X|', l.t); lastX = e.log.length;
}
console.log(g.lastResult, g.roster.map((h) => `${h.name} ${h.status} ${h.hp}`));
