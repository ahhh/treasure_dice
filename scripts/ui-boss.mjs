import { chromium } from 'playwright';
const OUT = process.env.SHOTS ?? 'test-results';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(process.env.URL ?? 'http://localhost:5179/');
await page.waitForFunction(() => window.__td);
await page.evaluate(() => {
  const { newGame, dispatch, setGame, render, auto } = window.__td;
  const g = newGame(1, 'legacy', 'BOSSY');
  g.profile.unlockedBiomes = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
  setGame(g);
  dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'starfall', difficulty: 'explorer', seed: 'BOSS-2' });
  for (let i = 0; i < 4000 && g.expedition; i++) {
    const e = g.expedition;
    if (e.combat && e.combat.kind === 'boss' && e.combat.status === 'active' && e.combat.round >= 2 && e.combat.turn) break;
    if (e.combat && e.combat.status === 'active') auto.autoCombatStep(g); else auto.autoExploreStep(g);
  }
  // Select a few dice to show the preview.
  window.__td.app.ui.selected = [0, 1, 2, 3, 4];
  render();
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/boss.png` });
await browser.close();
