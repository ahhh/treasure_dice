// Visit specific screens via the dev hook and screenshot them.
import { chromium } from 'playwright';
const OUT = process.env.SHOTS ?? 'test-results';
const W = Number(process.env.W ?? 1400), H = Number(process.env.H ?? 950);
const tag = process.env.TAG ?? 'd';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(process.env.URL ?? 'http://localhost:5179/');
await page.waitForFunction(() => window.__td);
const shot = (n) => page.screenshot({ path: `${OUT}/${tag}-${n}.png` });
// A level-up waiting.
await page.evaluate(() => {
  const { newGame, setGame, render, app } = window.__td;
  const g = newGame(1, 'legacy', 'SCREENS');
  g.roster[0].level = 3; g.roster[0].hpRolls.push(6, 6); g.roster[0].pendingLevel = true;
  setGame(g); app.ui.levelUp = g.roster[0].id; render();
});
await page.waitForTimeout(300); await shot('levelup');
await page.evaluate(() => { const { app, render } = window.__td; app.ui.levelUp = undefined; app.ui.heroSheet = app.game.roster[1].id; render(); });
await page.waitForTimeout(300); await shot('sheet');
await page.evaluate(() => { const { app, render } = window.__td; app.ui.heroSheet = undefined; app.ui.townTab = 'cartographer'; render(); });
await page.waitForTimeout(300); await shot('cart');
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
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
