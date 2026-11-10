/**
 * Touch tooltips. Phones never show `title` hovers, so on touch screens:
 *  - tapping a non-interactive thing with a title (charm, token, stat, foe…) opens a tip sheet;
 *  - long-pressing anything with a title (buttons too) opens it without triggering the button;
 *  - consumables call `showTip` with actions, so the sheet asks "use it now?" first.
 * The sheet closes with its ✕, a tap anywhere outside it, or Escape.
 */
import { h } from './dom.ts';
import { tx } from '../i18n/index.ts';

export interface TipAction { label: string; primary?: boolean; run: () => void }
export interface Tip { title: string; text?: string; actions?: TipAction[] }

export const touchUi = (): boolean => typeof matchMedia === 'function' && matchMedia('(hover: none), (pointer: coarse)').matches;

let open: HTMLElement | null = null;
let suppressClick = false;

export function closeTip() {
  open?.remove();
  open = null;
}

export function tipOpen(): boolean {
  return !!open;
}

export function showTip(tip: Tip) {
  closeTip();
  const sheet = h('div', { class: 'tip-sheet', role: 'dialog', 'aria-label': tip.title },
    h('div', { class: 'row tip-head' },
      h('b', { class: 'grow' }, tip.title),
      h('button', { class: 'tip-x', 'aria-label': tx('tips.close'), on: { click: (e: Event) => { e.stopPropagation(); closeTip(); } } }, '✕')),
    tip.text ? h('p', { class: 'tip-text' }, tip.text) : null,
    tip.actions?.length
      ? h('div', { class: 'row tip-actions' },
        ...tip.actions.map((a) => h('button', { class: `btn small ${a.primary ? 'primary' : ''}`, on: { click: (e: Event) => { e.stopPropagation(); closeTip(); a.run(); } } }, a.label)),
        h('button', { class: 'btn small', on: { click: (e: Event) => { e.stopPropagation(); closeTip(); } } }, tx('tips.notNow')))
      : null);
  // The scrim catches the "tap elsewhere" so dismissing never presses whatever sits underneath.
  const root = h('div', { class: 'tip-root' }, h('div', { class: 'tip-scrim', on: { click: (e: Event) => { e.stopPropagation(); closeTip(); } } }), sheet);
  document.body.append(root);
  open = root;
}

/** "Name — description" / "Name: description" → a title and body. */
export function parseTip(raw: string): Tip {
  const m = raw.match(/^(.{1,48}?)(?: — |: )([\s\S]+)$/);
  return m ? { title: m[1].trim(), text: m[2].trim() } : { title: raw.trim() };
}

const ACTIONABLE = 'button, a, input, select, textarea, label, [role="button"], [contenteditable]';
const tipEl = (t: EventTarget | null) => (t instanceof Element ? t.closest('[data-tip], [title]') : null) as HTMLElement | null;
const tipOf = (el: HTMLElement) => parseTip(el.dataset.tip ?? el.getAttribute('title') ?? '');
const inChrome = (el: Element) => !!el.closest('.tip-root, .coach');

export function installTips() {
  // Tap: plain (non-interactive) titled things open their tip.
  document.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    if (!touchUi()) return;
    const el = tipEl(e.target);
    if (!el || inChrome(el)) return;
    if ((e.target as Element).closest(ACTIONABLE) && !el.hasAttribute('data-tip-tap')) return;
    const tip = tipOf(el);
    if (!tip.title) return;
    e.preventDefault();
    e.stopPropagation();
    showTip(tip);
  }, true);

  // Long-press: works on buttons too, without pressing them.
  let timer = 0;
  let start: { x: number; y: number } | null = null;
  const cancel = () => { clearTimeout(timer); timer = 0; start = null; };
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const el = tipEl(e.target);
    if (!el || inChrome(el)) return;
    start = { x: e.clientX, y: e.clientY };
    timer = window.setTimeout(() => {
      timer = 0;
      const tip = tipOf(el);
      if (!tip.title) return;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 800);
      showTip(tip);
    }, 450);
  }, true);
  document.addEventListener('pointermove', (e) => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel(); }, true);
  document.addEventListener('pointerup', () => { if (timer) cancel(); }, true);
  document.addEventListener('pointercancel', cancel, true);
  document.addEventListener('contextmenu', (e) => { if (touchUi() && tipEl(e.target)) e.preventDefault(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); closeTip(); } }, true);
}
