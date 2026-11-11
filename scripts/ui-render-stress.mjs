// Drive whole expeditions with the autoplayer inside the page, rendering every state.
import { open, ready } from './ui-lib.mjs';
const { page, check, done } = await open('ui-render-stress');
await ready(page);
const kinds = await page.evaluate(async () => {
  const { app, newGame, dispatch, setGame, render, auto } = window.__td;
  const seen = {};
  const errs = [];
  for (let run = 0; run < 6; run++) {
    const g = newGame(1, 'legacy', `STRESS-${run}`);
    g.tutorial = null;
    g.profile.unlockedBiomes = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
    setGame(g);
    const biome = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall', 'cinder'][run];
    dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome, difficulty: 'explorer', seed: `ST-${run}` });
    for (let i = 0; i < 3000 && g.expedition; i++) {
      const e = g.expedition;
      const k = e.combat ? (e.spoils ? 'spoils' : 'combat') : e.boons ? 'boons' : e.event ? `event-${e.event.stage}` : e.shop ? 'shop' : e.lootChoice ? 'loot' : 'explore';
      seen[k] = (seen[k] ?? 0) + 1;
      try { render(); } catch (err) { errs.push(`${k}: ${err}`); }
      if (e.combat && e.combat.status === 'active') auto.autoCombatStep(g); else auto.autoExploreStep(g);
    }
    try { render(); seen.result = (seen.result ?? 0) + 1; } catch (err) { errs.push(`result: ${err}`); }
    dispatch(g, { type: 'ackResult' });
    for (const h of g.roster.filter((x) => x.pendingLevel)) { app.ui.levelUp = h.id; try { render(); } catch (err) { errs.push(`levelup: ${err}`); } app.ui.levelUp = undefined; }
    for (const tab of ['guild', 'cartographer', 'armory', 'apothecary', 'enchanter', 'training', 'vault', 'chronicle']) { app.ui.townTab = tab; try { render(); } catch (err) { errs.push(`town-${tab}: ${err}`); } }
  }
  return { seen, errs };
});
check(!kinds.errs.length, `render errors:\n  ${kinds.errs.slice(0, 10).join('\n  ')}`);
for (const k of ['explore', 'combat', 'spoils', 'boons', 'result']) check(kinds.seen[k] > 0, `never rendered a ${k} state`);
await done(JSON.stringify(kinds.seen));
