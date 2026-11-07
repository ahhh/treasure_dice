// The Queen's Due in the browser: the Low Lantern, dialogue boxes (typewriter,
// choices, d20 checks), keeper barks, lead chips, the awakened Keep and a quest room.
import { open, ready } from './ui-lib.mjs';

const { page, check, done, shot } = await open('ui-dialogue');
await ready(page);
const has = async (sel, what) => check(await page.locator(sel).count() > 0, `${what}: ${sel} not shown`);

await page.evaluate(() => {
  const { newGame, setGame, render, app } = window.__td;
  const g = newGame(1, 'legacy', 'DIALOGUE');
  g.tutorial = null;
  g.profile.bankedGold = 900;
  setGame(g); app.ui.townTab = 'tavern'; render();
});
await page.waitForTimeout(250);
await has('.dlg-back .dlg', 'auto-opened first evening');
await shot('dlg-1-typing');
check(await page.locator('.dlg.typing').count() === 1, 'text is typing');
await page.keyboard.press('Space');
await page.waitForTimeout(150);
check(await page.locator('.dlg.typing').count() === 0, 'first press finishes the line');
check(await page.locator('.dlg-more').count() === 1, '▼ shown when the line is done');
await shot('dlg-2-line');
// Advance to the first choice.
for (let i = 0; i < 20 && await page.locator('.dlg-choice').count() === 0; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(60);
}
await has('.dlg-choice', 'choice menu');
await shot('dlg-3-choices');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(80);
check(await page.locator('.dlg-choice.on').innerText().then((t) => t.includes('loaded')), 'arrow keys move the ▶ cursor');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await has('.dlg-roll', 'd20 check rolled in the box');
await shot('dlg-4-roll');
for (let i = 0; i < 30 && await page.locator('.dlg-back').count(); i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(40);
}
check(await page.locator('.dlg-back').count() === 0, 'scene ends');
await page.waitForTimeout(200);
await shot('dlg-5-tavern');
await has('.patron', 'patrons at the Low Lantern');
check(await page.evaluate(() => window.__td.app.game.profile.quest.leads.some((l) => l.id === 'L0')), 'first lead offered');

// The Cartographer shows the lead on its echo (Pim explains leads first).
await page.evaluate(() => { const { app, render } = window.__td; app.ui.townTab = 'cartographer'; render(); });
await page.waitForTimeout(250);
await has('.dlg-back', 'Pim explains leads');
await page.keyboard.press('Escape');
for (let i = 0; i < 10 && await page.locator('.dlg-back').count(); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(40); }
await has('.lead-chip', 'lead chip on the echo');
await has('.bark', 'keeper bark');
await shot('dlg-6-cart');

// A quest room: force the lead to spawn (pity) and walk to it.
await page.evaluate(() => {
  const { app, dispatch, render, auto } = window.__td;
  const g = app.game;
  g.profile.quest.leads.find((l) => l.id === 'L0').misses = 2;
  dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'cinder', difficulty: 'explorer', seed: 'QROOM' });
  const room = Object.values(g.expedition.map.rooms).find((r) => r.eventId === 'q_stalledCart');
  g.expedition.pos = room.key;
  g.expedition.event = { roomKey: room.key, eventId: room.eventId, stage: 'choose' };
  render();
  void auto;
});
await page.waitForTimeout(300);
await has('.modal', 'quest room event');
await shot('dlg-7-questroom');
await page.evaluate(() => { const { app, render } = window.__td; const g = app.game; g.expedition = undefined; render(); });

// The awakened Keep: emergency title, muster board, annotations.
await page.evaluate(() => {
  const { app, render } = window.__td;
  const g = app.game;
  for (const b of ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall']) g.profile.sigils[b] = 1;
  g.profile.quest.flags.push('seen:bet.intro', 'seen:awaken.onlyLight', 'ev:E1', 'ev:E5', 'ev:E7', 'ev:E9', 'met:sereth', 'met:veska', 'met:corvin');
  app.ui.townTab = 'tavern'; render();
});
await page.waitForTimeout(250);
for (let i = 0; i < 40 && await page.locator('.dlg-back').count(); i++) { await page.keyboard.press('Escape'); await page.keyboard.press('Space'); await page.waitForTimeout(30); }
await has('.muster', 'muster board');
check((await page.locator('.topbar .title').innerText()).includes('Under the Dragon'), 'emergency title');
await shot('dlg-8-muster');
await page.evaluate(() => { const { app, render } = window.__td; app.ui.townTab = 'chronicle'; render(); });
await page.waitForTimeout(250);
for (let i = 0; i < 10 && await page.locator('.dlg-back').count(); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(40); }
await has('.annotation', 'Chronicler\'s later notes');
await shot('dlg-9-chronicle');

// A head speaks on the way home.
await page.evaluate(() => {
  const { app, render } = window.__td;
  const g = app.game;
  g.lastResult = { kind: 'won', gold: 120, items: [], fallen: [], leveled: [], biome: 'cinder', score: 1000, fights: 4, rank: 4, charms: [], chapter: 'cinder', quest: { head: 'cinder', found: ['E1'], notes: [] } };
  render();
});
await page.waitForTimeout(250);
await has('.dlg.head', 'head voice box');
await shot('dlg-10-head');

// Phone width.
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => { const { app, render } = window.__td; app.game.lastResult = undefined; app.ui.townTab = 'tavern'; render(); window.__td_open = true; });
await page.evaluate(() => { const g = window.__td.app.game; g.profile.quest.flags = g.profile.quest.flags.filter((f) => f !== 'seen:bet.intro'); });
await page.evaluate(() => window.__td.render());
await page.waitForTimeout(250);
await shot('dlg-11-phone');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check(!overflow, 'no horizontal scroll at phone width');
await done();
