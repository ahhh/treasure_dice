// Browser smoke test: new game -> town -> expedition -> combat -> score.
import { chromium } from 'playwright';
const OUT = process.env.SHOTS ?? 'test-results';
const url = process.env.URL ?? 'http://localhost:5179/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1400), height: Number(process.env.H ?? 950) } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/01-title.png` });
await page.getByRole('button', { name: 'New (Legacy)' }).first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-town.png` });
await page.locator('[data-key="tab-cartographer"]').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/03-cart.png`, fullPage: true });
await page.locator('[data-key="start-exp"]').click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/04-explore.png` });
// Walk until a fight starts.
for (let i = 0; i < 40; i++) {
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
  await page.waitForTimeout(250);
}
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-combat.png` });
// Select three dice and attack.
for (const k of ['1', '2', '3']) await page.keyboard.press(k);
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/06-selected.png` });
await page.locator('[data-key="menu-attack"]').click();
await page.waitForTimeout(150);
await page.locator('.opt-list .btn').first().click();
await page.waitForTimeout(200);
const tgt = page.locator('.enemy.targetable').first();
if (await tgt.count()) await tgt.click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/07-scoring.png` });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/08-after.png` });
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
