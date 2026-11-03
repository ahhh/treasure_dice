// Fight through combats in the browser via the real UI, screenshotting key moments.
import { open, ready, newGameUI, OUT } from './ui-lib.mjs';
const { page, check, done } = await open('ui-battle');
await ready(page);
await newGameUI(page, { slot: 1 });
await page.locator('[data-key="tab-cartographer"]').click();
await page.locator('[data-key="start-exp"]').click();
let shots = 0;
const snap = async (n) => { if (shots < 40) await page.screenshot({ path: `${OUT}/b${String(++shots).padStart(2, '0')}-${n}.png` }); };
let fights = 0, attacks = 0, ended = false, scoredShot = false, boonShot = false, spoilShot = false;
for (let step = 0; step < 500; step++) {
  if (step % 100 === 99) await snap(`step${step}`);
  if (await page.locator('.result-big').count() && !(await page.locator('.modal-back').count())) { await snap('result'); ended = true; break; }
  if (await page.locator('[data-key="claim"]').count()) { if (!spoilShot) { await snap('spoils'); spoilShot = true; } await page.locator('[data-key="claim"]').click(); fights++; continue; }
  if (await page.locator('.boon:not([disabled])').count() && await page.locator('.modal-back').count()) {
    if (!boonShot) { await snap('boons'); boonShot = true; }
    if (await page.getByRole('button', { name: /Skip/ }).count()) await page.getByRole('button', { name: /Skip/ }).click();
    else if (await page.locator('[data-key="leave-shop"]').count()) await page.locator('[data-key="leave-shop"]').click();
    continue;
  }
  if (await page.locator('[data-key="ev-continue"]').count()) { await page.locator('[data-key="ev-continue"]').click(); continue; }
  if (await page.getByRole('button', { name: 'Decide later' }).count()) { await page.locator('[data-key="ev0"]').click(); continue; }
  if (await page.locator('[data-key="leave-shop"]').count()) { await page.locator('[data-key="leave-shop"]').click(); continue; }
  if (await page.locator('.modal .btn').filter({ hasText: 'Take' }).count()) { await page.locator('.modal .btn').filter({ hasText: 'Take' }).first().click(); continue; }
  if (await page.locator('.modal-back').count()) { await page.keyboard.press('Escape'); await page.locator('.modal-back .btn').last().click().catch(() => {}); continue; }
  if (await page.locator('.felt .dice-row').count()) {
    // Our turn?
    if (!(await page.locator('[data-key="end-turn"]').count()) && !(await page.locator('.opt-list').count()) && !(await page.locator('[data-key="confirm-act"]').count())) { await page.waitForTimeout(100); continue; }
    if (await page.locator('[data-key="menu-back"]').count()) await page.locator('[data-key="menu-back"]').click();
    if (await page.locator('.btn').filter({ hasText: 'Back' }).count() && await page.locator('.target-hint').count()) { await page.locator('.enemy.targetable').first().click(); await page.waitForTimeout(400); continue; }
    if (await page.locator('.die.sel').count()) await page.locator('.btn').filter({ hasText: 'Clear' }).click();
    // Let the autoplayer choose the hand (so the bot plays sensibly), then click it in through the UI.
    const pick = await page.evaluate(() => { const g = window.__td.app.game; const t = g.expedition?.combat?.turn; return t ? window.__td.auto.bestDice(g, t.playLimit).dice : []; });
    for (const i of pick) await page.locator(`[data-key="die${i}"]`).click();
    await page.locator('[data-key="menu-attack"]').click();
    const first = page.locator('.opt-list .btn:not([disabled])').first();
    if (await first.count()) {
      await first.click();
      attacks++;
      await page.waitForTimeout(100);
      if (await page.locator('.enemy.targetable').count()) await page.locator('.enemy.targetable').first().click();
      await page.waitForTimeout(350);
      if (!scoredShot && await page.locator('.score-overlay').count()) { await snap('scoring'); scoredShot = true; }
      await page.waitForTimeout(1200);
    } else await page.locator('[data-key="menu-back"]').click();
    if (await page.locator('[data-key="end-turn"]').count()) await page.locator('[data-key="end-turn"]').click();
    await page.waitForTimeout(200);
    continue;
  }
  // Exploring.
  if (await page.locator('[data-key="exit"]').count()) { await page.locator('[data-key="exit"]').click(); continue; }
  if (await page.locator('[data-key="loot"]').count()) { await page.locator('[data-key="loot"]').click(); continue; }
  if (await page.locator('[data-key="investigate"]').count()) { await page.locator('[data-key="investigate"]').click(); continue; }
  const dirs = ['forward', 'right', 'left', 'back'];
  const d = dirs[Math.floor(Math.random() * 4)];
  const b = page.locator(`[data-key="mv-${d}"]`);
  if (await b.count() && await b.isEnabled()) await b.click();
  await page.waitForTimeout(60);
}
await snap('final');
// The bot only attacks (no heals), so a wipe is a legitimate outcome; what must hold is that
// the combat UI keeps working: attacks go through, scoring plays, and the run reaches an end or a win.
check(attacks >= 3, `only ${attacks} attacks went through the UI`);
check(fights >= 1 || ended, 'neither won a fight nor reached a result screen');
check(scoredShot, 'never saw the scoring overlay');
await done(`attacks ${attacks}, fights ${fights}${ended ? ', reached result' : ''}`);
