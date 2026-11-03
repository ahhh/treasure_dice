// Autoplay to the first hero turn of a boss fight and screenshot it with dice selected.
import { open, ready, OUT } from './ui-lib.mjs';
const { page, check, done } = await open('ui-boss', { width: 1400, height: 1000 });
await ready(page);
const reached = await page.evaluate(() => {
  const { newGame, dispatch, setGame, render, auto } = window.__td;
  const g = newGame(1, 'legacy', 'BOSSY');
  g.tutorial = null;
  g.profile.unlockedBiomes = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
  setGame(g);
  dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'starfall', difficulty: 'explorer', seed: 'BOSS-2' });
  for (let i = 0; i < 4000 && g.expedition; i++) {
    const e = g.expedition;
    if (e.combat && e.combat.kind === 'boss' && e.combat.status === 'active' && e.combat.turn) break;
    if (e.combat && e.combat.status === 'active') auto.autoCombatStep(g); else auto.autoExploreStep(g);
  }
  // Select a few dice to show the preview (after one render, which resets selection for a new actor).
  render();
  window.__td.app.ui.selected = [0, 1, 2, 3, 4];
  render();
  const c = g.expedition?.combat;
  return !!c && c.kind === 'boss' && c.status === 'active';
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/boss.png` });
check(reached, 'autoplayer never reached an active boss fight');
check(await page.locator('.curse-banner').count() > 0, 'boss fight shows no curse banner');
check(await page.locator('.die.sel').count() === 5, 'selected dice are not highlighted');
check(await page.locator('.coach').count() === 0, 'tutorial coach is covering the screen');
await done();
