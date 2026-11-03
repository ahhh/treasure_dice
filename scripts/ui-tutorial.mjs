// Play the whole guided tour through the real UI, following the coach bubbles:
// Keep coach marks -> Training Cellar (move, fight, treasure, sigil, boss) -> result -> level-up -> finish.
// Fails if the tour stalls on a step, skips a step, or the party does not end at level 2.
import { open, ready, newGameUI } from './ui-lib.mjs';

const { page, check, shot, done } = await open('ui-tutorial');
await ready(page);
await newGameUI(page, { tutorial: true });

const state = () => page.evaluate(() => {
  const g = window.__td.app.game;
  const bubble = document.querySelector('.coach-bubble');
  const ring = document.querySelector('.coach-ring');
  const r = ring && getComputedStyle(ring).display !== 'none' ? ring.getBoundingClientRect() : null;
  return {
    step: g.tutorial?.step ?? null,
    title: bubble?.querySelector('h4')?.textContent ?? null,
    meta: bubble?.querySelector('.coach-meta')?.textContent ?? null,
    ring: r && r.width > 1 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null,
    free: !!bubble?.classList.contains('free'),
    combat: !!g.expedition?.combat && g.expedition.combat.status === 'active',
    myTurn: !!document.querySelector('[data-key="menu-attack"]'),
  };
});

const click = async (sel) => { const l = page.locator(sel).first(); if (await l.count() && await l.isEnabled()) { await l.click(); return true; } return false; };

/** One combat move through the UI: autoplayer-chosen dice, first usable attack, first target. */
async function fightStep() {
  if (!(await page.locator('[data-key="menu-attack"]').count())) { await page.waitForTimeout(150); return; }
  if (await page.locator('.die.sel').count()) await click('.btn:has-text("Clear")');
  const pick = await page.evaluate(() => { const g = window.__td.app.game; const t = g.expedition?.combat?.turn; return t ? window.__td.auto.bestDice(g, t.playLimit).dice : []; });
  for (const i of pick) await page.locator(`[data-key="die${i}"]`).click();
  await page.locator('[data-key="menu-attack"]').click();
  if (!(await click('.opt-list .btn:not([disabled])'))) { await click('[data-key="menu-back"]'); await click('[data-key="end-turn"]'); return; }
  if (await page.locator('.enemy.targetable').count()) await page.locator('.enemy.targetable').first().click();
  await page.waitForTimeout(900);
  await click('[data-key="end-turn"]');
}

const seen = [];
let last = '', stuck = 0, finished = false;
for (let i = 0; i < 600; i++) {
  const s = await state();
  if (s.step === null) { finished = true; break; }
  const key = `${s.step}|${s.title}`;
  if (key !== last) {
    if (s.meta?.startsWith('Tutorial ·')) seen.push(s.step);
    last = key; stuck = 0;
    await page.waitForTimeout(300); // let the bubble fade in
    await shot(`tut-${String(s.step).padStart(2, '0')}-${(s.title ?? 'none').replace(/\W+/g, '_').slice(0, 30)}`);
  } else if (++stuck > 60) { check(false, `stuck on step ${s.step} "${s.title}"`); await shot('tut-stuck'); break; }

  // 1. Blocking bubble: Next. Tip: Got it.
  if (await click('[data-coach="next"]')) continue;
  if (await click('.coach-bubble .btn:has-text("Got it")')) continue;

  // 2. Pop-ups that the tour waits behind.
  if (await click('.modal-back [data-key="claim"]')) continue;
  if (await page.locator('.modal-back .boon:not([disabled])').count()) { await page.locator('.modal-back .boon:not([disabled])').first().click(); continue; }
  if (await click('[data-key="ev-continue"]')) continue;
  if (await click('.modal-back [data-key="ev0"]')) continue;
  if (await click('.modal .btn:has-text("Take")')) continue;
  if (await page.locator('[data-key="confirm-level"]').count()) {
    // Answer any level-up choice (first option of each group) until the confirm button unlocks.
    if (!(await click('[data-key="confirm-level"]'))) await page.locator('.modal .opt:not(.on), .modal .btn.small:not(.on)').first().click().catch(() => {});
    continue;
  }

  // 3. Fights: the free "finish the fight" steps, and any turn without a ringed target.
  if (s.combat && (s.free || !s.ring || !s.title)) { await fightStep(); continue; }

  // 4. Otherwise do what the ring points at. Several dice: click the leftmost unselected one inside it.
  if (s.ring) {
    if (await click('.enemy.targetable')) { await page.waitForTimeout(900); continue; }
    const die = await page.evaluate((r) => {
      const inside = [...document.querySelectorAll('.dice-row .die:not(.sel)')].map((el) => ({ el, b: el.getBoundingClientRect() }))
        .filter(({ b }) => b.left >= r.x - 1 && b.right <= r.x + r.w + 1 && b.top >= r.y - 1 && b.bottom <= r.y + r.h + 1)
        .sort((a, b) => a.b.left - b.b.left);
      return inside.length && inside.length < document.querySelectorAll('.dice-row .die').length + 1 ? inside[0].el.dataset.key : null;
    }, s.ring);
    if (die && s.combat) await page.locator(`[data-key="${die}"]`).click();
    else await page.mouse.click(s.ring.x + s.ring.w / 2, s.ring.y + s.ring.h / 2);
    await page.waitForTimeout(250);
    continue;
  }
  // Nothing to follow: a window the tour isn't using is open (e.g. a hero sheet) — close it.
  if (!s.title && await page.locator('.modal-back').count()) await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

const end = await page.evaluate(() => {
  const g = window.__td.app.game;
  return { tutorial: g.tutorial, levels: g.roster.filter((h) => h.status === 'alive').map((h) => h.level), pending: g.roster.some((h) => h.pendingLevel), coach: !!document.querySelector('.coach') };
});
await shot('tut-end');
check(finished, 'tour did not finish');
check(end.tutorial === null, 'game.tutorial is not cleared');
check(!end.coach, 'coach overlay still on screen');
check(end.levels.length === 3 && end.levels.every((l) => l === 2), `heroes should end at level 2, got ${end.levels.join(',')}`);
check(!end.pending, 'a level-up is still pending');
const total = await page.evaluate(async () => (await import('/src/ui/tutorial.ts')).TUTORIAL_STEPS.length);
const missing = [...Array(total).keys()].filter((n) => !seen.includes(n));
check(!missing.length, `tour steps never shown: ${missing.join(', ')}`);
await done(`${seen.length}/${total} steps shown`);
