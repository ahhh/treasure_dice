// Browser smoke test: new game -> skip tour -> town -> expedition -> combat -> one attack.
import { open, newGameUI } from './ui-lib.mjs';

const { page, check, shot, done } = await open('ui-smoke');
await page.waitForTimeout(500);
await shot('01-title');
await newGameUI(page);
await shot('02-town');
check(await page.locator('.town-nav').count() > 0, 'town menu did not render');
await page.locator('[data-key="tab-cartographer"]').click();
await shot('03-cart');
await page.locator('[data-key="start-exp"]').click();
await page.locator('.dpad').waitFor();
await shot('04-explore');
// Walk until a fight starts.
for (let i = 0; i < 80; i++) {
  if (await page.locator('.felt .dice-row').count()) break;
  for (const m of ['.modal-back [data-key="claim"]', '[data-key="ev-continue"]', '[data-key="leave-shop"]']) {
    if (await page.locator(m).count()) await page.locator(m).click();
  }
  if (await page.locator('.boon').count()) await page.locator('.boon').first().click();
  if (await page.getByRole('button', { name: 'Decide later' }).count()) await page.getByRole('button', { name: 'Decide later' }).click();
  for (const k of ['forward', 'left', 'right', 'back']) {
    const b = page.locator(`[data-key="mv-${k}"]`);
    if (await b.count() && await b.isEnabled()) { await b.click(); break; }
  }
  await page.waitForTimeout(150);
}
const inFight = check(await page.locator('.felt .dice-row').count() > 0, 'never reached a fight');
if (inFight) {
  // Wait for a hero's turn (enemies may act first).
  await page.locator('[data-key="menu-attack"]').waitFor({ timeout: 15000 });
  await shot('05-combat');
  const logBefore = await page.locator('.command .log').innerText().catch(() => '');
  for (const k of ['1', '2', '3']) await page.keyboard.press(k);
  check(await page.locator('.die.sel').count() > 0, 'number keys did not select dice');
  await shot('06-selected');
  await page.locator('[data-key="menu-attack"]').click();
  await page.locator('.opt-list .btn:not([disabled])').first().click();
  const tgt = page.locator('.enemy.targetable').first();
  if (await tgt.count()) await tgt.click();
  await page.waitForTimeout(700);
  await shot('07-scoring');
  await page.waitForTimeout(2500);
  await shot('08-after');
  const logAfter = await page.locator('.command .log').innerText().catch(() => '');
  check(logAfter !== logBefore || !(await page.locator('.felt .dice-row').count()), 'attacking did not change the battle log');
}
await done();
