// Visit specific screens via the dev hook and screenshot them.
import { open, ready } from './ui-lib.mjs';
const tag = process.env.TAG ?? 'd';
const { page, check, done, shot: rawShot } = await open('ui-screens');
await ready(page);
const shot = (n) => rawShot(`${tag}-${n}`);
const has = async (sel, what) => check(await page.locator(sel).count() > 0, `${what}: ${sel} not shown`);
// A level-up waiting.
await page.evaluate(() => {
  const { newGame, setGame, render, app } = window.__td;
  const g = newGame(1, 'legacy', 'SCREENS');
  g.tutorial = null;
  g.roster[0].level = 3; g.roster[0].hpRolls.push(6, 6); g.roster[0].pendingLevel = true;
  setGame(g); app.ui.levelUp = g.roster[0].id; render();
});
await page.waitForTimeout(300); await shot('levelup');
await has('[data-key="confirm-level"]', 'level-up wizard');
await page.evaluate(() => { const { app, render } = window.__td; app.ui.levelUp = undefined; app.ui.heroSheet = app.game.roster[1].id; render(); });
await page.waitForTimeout(300); await shot('sheet');
await has('.modal .sheet', 'hero sheet');
await page.evaluate(() => { const { app, render } = window.__td; app.ui.heroSheet = undefined; app.ui.townTab = 'cartographer'; render(); });
await page.waitForTimeout(300); await shot('cart');
await has('[data-key="start-exp"]', 'cartographer');
// Explore a few rooms with the autoplayer, then screenshot an event if one shows.
await page.evaluate(() => {
  const { app, dispatch, render, auto } = window.__td;
  const g = app.game;
  g.profile.unlockedBiomes.push('mirror'); g.roster[0].pendingLevel = false;
  dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'mirror', difficulty: 'explorer', seed: 'SHOT-5' });
  for (let i = 0; i < 400 && g.expedition; i++) {
    const e = g.expedition;
    if (e.event && e.event.stage === 'choose') break;
    if (e.combat && e.combat.status === 'active') auto.autoCombatStep(g); else auto.autoExploreStep(g);
  }
  render();
});
await page.waitForTimeout(400); await shot('event');
await page.evaluate(() => {
  const { app, dispatch, render, auto } = window.__td;
  const g = app.game;
  dispatch(g, { type: 'eventClose' });
  for (let i = 0; i < 30 && g.expedition; i++) { if (g.expedition.combat) break; auto.autoExploreStep(g); }
  render();
});
await page.waitForTimeout(400); await shot('explore2');
await page.evaluate(() => {
  const { app, render, auto } = window.__td;
  const g = app.game;
  for (let i = 0; i < 300 && g.expedition; i++) { const e = g.expedition; if (e.combat && e.combat.status === 'active') break; auto.autoExploreStep(g); }
  render();
});
await page.waitForTimeout(400); await shot('combat');
await has('.felt .dice-row', 'combat');
check(await page.locator('.coach').count() === 0, 'tutorial coach is covering the screen');
await done();
