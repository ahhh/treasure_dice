// Fight through combats in the browser via the real UI, screenshotting key moments.
import { chromium } from 'playwright';
const OUT = process.env.SHOTS ?? 'test-results';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1400), height: Number(process.env.H ?? 950) } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(process.env.URL ?? 'http://localhost:5179/');
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'New (Legacy)' }).nth(1).click();
await page.locator('[data-key="tab-cartographer"]').click();
await page.locator('[data-key="start-exp"]').click();
let shots = 0;
const snap = async (n) => { if (shots < 40) await page.screenshot({ path: `${OUT}/b${String(++shots).padStart(2, '0')}-${n}.png` }); };
let fights = 0, scoredShot = false, boonShot = false, spoilShot = false;
for (let step = 0; step < 500; step++) {
  if (step % 100 === 99) await snap(`step${step}`);
  if (await page.locator('.result-big').count() && !(await page.locator('.modal-back').count())) { await snap('result'); break; }
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
    const free = page.locator('.dice-row .die:not(.jinx)');
    const n = Math.min(5, await free.count());
    for (let i = 0; i < n; i++) await free.nth(i).click();
    await page.locator('[data-key="menu-attack"]').click();
    const first = page.locator('.opt-list .btn:not([disabled])').first();
    if (await first.count()) {
      await first.click();
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
console.log('fights', fights, 'errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
