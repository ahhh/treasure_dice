/**
 * NES/SNES-style dialogue boxes: a portrait window, a nameplate notched into
 * the border, typewriter text with per-speaker blips, a blinking ▼, a ▶
 * choice cursor, and d20 checks rolled right in the box.
 * Space/Enter/Z/click advance (first press finishes the line), ↑↓ / W S / 1–4
 * pick, L opens the log, Esc fast-forwards to the next choice.
 */
import type { GameState, Hero } from '../engine/types.ts';
import { h } from './dom.ts';
import { app, render, run, toast, afterRender } from './app.ts';
import { art, hasArt } from './art.ts';
import { heroPortrait } from './widgets.ts';
import { sfx } from './audio.ts';
import { NPCS, HEAD_EYES, portraitKey, type Mood } from '../content/npcs.ts';
import { EVIDENCE, LEADS } from '../content/quest.ts';
import { SKILL_NAMES } from '../rules/character.ts';
import { script, resolveNode, visibleChoices, bestAtKeep, has, readyScripts, type TalkResult } from '../meta/quest.ts';
import type { DlgNode, Where } from '../content/dialogue.ts';
import { lineText, choiceLabel } from '../i18n/dialogue.ts';
import { tx } from '../i18n/index.ts';

interface DlgUi { script: string; node: string; cursor: number; roll?: TalkResult['roll']; roller?: string; log: { who: string; text: string }[]; showLog?: boolean }

let dlg: DlgUi | null = null;
/** Typewriter progress for the current node. */
let typed = 0;
let typing = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let ffwd = false;

export const dialogueOpen = () => !!dlg;

export function openDialogue(id: string) {
  const g = app.game!;
  const s = script(id);
  if (!s) return;
  const node = resolveNode(g, s, s.start);
  if (!node) return;
  dlg = { script: id, node, cursor: 0, log: [] };
  startTyping();
  render();
}

/** Open the first auto scene ready at a place (once per render cycle). */
export function autoDialogue(where: Where) {
  const g = app.game;
  if (!g || dlg) return;
  const s = readyScripts(g, where).find((x) => x.auto);
  if (s) afterRender.push(() => { if (!dlg) openDialogue(s.id); });
}

// ── text ────────────────────────────────────────────────────────────────────

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function nodeOf(): DlgNode | null {
  if (!dlg) return null;
  return script(dlg.script)?.nodes[dlg.node] ?? null;
}

/** Raw text with markup resolved, `|` kept as beat marks. */
function rawText(g: GameState, n: DlgNode): string {
  let t = lineText(g, dlg!.script, dlg!.node, n);
  t = t.replace(/\{keeper\}/g, g.profile.keeperName || 'Keeper');
  t = t.replace(/\{hero\}/g, dlg?.roller ?? tx('dialogue.yourHero'));
  t = t.replace(/\{best:(\w+)\}/g, (_, sk) => bestAtKeep(g, sk)?.hero.name ?? tx('dialogue.yourHero'));
  return t;
}
const visible = (t: string) => t.replace(/\|/g, '');

function startTyping() {
  if (timer) clearTimeout(timer);
  typed = 0;
  typing = true;
  const g = app.game!;
  const n = nodeOf();
  if (!n) return;
  const text = rawText(g, n);
  const voice = NPCS[n.who]?.voice;
  if (n.variant === 'head' || n.who.startsWith('head:')) sfx.rumble();
  if (reduced()) { typed = text.length; typing = false; return; }
  const cps = ffwd ? 400 : g.settings.fast ? 140 : 45;
  const step = () => {
    if (!dlg) return;
    const ch = text[typed];
    typed += 1;
    if (voice && typed % 2 === 0 && ch && /\w/.test(ch)) sfx.blip(voice.wave, voice.pitch);
    paintText();
    if (typed >= text.length) { typing = false; paintText(); if (ffwd) advance(); return; }
    const delay = ch === '|' ? 400 : /[.!?]/.test(ch) ? 180 : ch === ',' ? 60 : ch === '—' ? 120 : 1000 / cps;
    timer = setTimeout(step, ffwd ? 8 : delay);
  };
  timer = setTimeout(step, 30);
}

function paintText() {
  const el = document.querySelector('.dlg-text');
  if (!el || !dlg) return;
  const n = nodeOf();
  if (!n) return;
  const text = rawText(app.game!, n);
  el.textContent = visible(text.slice(0, typed));
  document.querySelector('.dlg')?.classList.toggle('typing', typing);
  if (!typing) render();
}

// ── flow ────────────────────────────────────────────────────────────────────

function finishLine() {
  if (timer) clearTimeout(timer);
  const n = nodeOf();
  if (n) typed = rawText(app.game!, n).length;
  typing = false;
  render();
}

function close() {
  if (timer) clearTimeout(timer);
  dlg = null;
  ffwd = false;
  render();
}

function notesToast(notes: string[]) {
  for (const n of notes) {
    const [kind, id] = n.split(':');
    if (kind === 'ev') toast(tx('dialogue.evidence', { v: EVIDENCE[id]?.name ?? id }), true);
    else if (kind === 'lead') toast(tx('dialogue.newLead', { v: LEADS[id]?.title ?? id }), true);
    else if (kind === 'remember') toast(tx('dialogue.willRememberThat', { v: NPCS[id]?.name ?? id }), true);
  }
}

function step(choice?: number) {
  if (!dlg) return;
  const g = app.game!;
  const n = nodeOf();
  if (!n) return close();
  dlg.log.push({ who: speakerName(g, n.who), text: visible(rawText(g, n)) });
  const r = run({ type: 'talk', script: dlg.script, node: dlg.node, choice }, { silent: true });
  if (!r.ok || !r.talk) { toast(r.error ?? tx('dialogue.theConversationDriftsOff')); return close(); }
  notesToast(r.talk.notes);
  if (r.talk.roll) {
    sfx.roll(2);
    dlg.roll = r.talk.roll;
    dlg.roller = r.talk.roll.hero;
    if (r.talk.roll.ok) sfx.heal(); else sfx.miss();
  } else dlg.roll = undefined;
  if (!r.talk.next) return close();
  dlg.node = r.talk.next;
  dlg.cursor = 0;
  startTyping();
  render();
}

function advance() {
  if (!dlg) return;
  if (typing) return finishLine();
  const g = app.game!;
  const n = nodeOf();
  if (!n) return close();
  const ch = visibleChoices(g, n);
  if (ch.length) { ffwd = false; return step(dlg.cursor); }
  step();
}

export function dialogueKeys(e: KeyboardEvent): boolean {
  if (!dlg) return false;
  const g = app.game!;
  const n = nodeOf();
  const ch = n ? visibleChoices(g, n) : [];
  if (dlg.showLog) { if (['Escape', 'l', 'L', 'Enter', ' '].includes(e.key)) { dlg.showLog = false; render(); } return true; }
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') { advance(); return true; }
  if (!typing && ch.length && (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S')) { dlg.cursor = (dlg.cursor + 1) % ch.length; sfx.select(); render(); return true; }
  if (!typing && ch.length && (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) { dlg.cursor = (dlg.cursor + ch.length - 1) % ch.length; sfx.select(); render(); return true; }
  if (!typing && /^[1-4]$/.test(e.key) && Number(e.key) <= ch.length) { dlg.cursor = Number(e.key) - 1; step(dlg.cursor); return true; }
  if (e.key === 'l' || e.key === 'L') { dlg.showLog = true; render(); return true; }
  if (e.key === 'Escape') { if (!ch.length) { ffwd = true; advance(); } return true; }
  return true;
}

// ── look ────────────────────────────────────────────────────────────────────

export function speakerName(g: GameState, who: string): string {
  if (who === 'narrator') return '';
  if (who === 'hero') return dlg?.roller ?? tx('dialogue.yourHero');
  if (who.startsWith('head:')) return '???';
  const n = NPCS[who];
  if (!n) return who;
  if (!n.alias || has(g, `met:${who}`)) return n.name;
  if (who === 'corvin' && has(g, 'corvin.coat')) return tx('dialogue.manInAGoodCoat');
  return n.alias;
}

export function npcPortrait(id: string, mood: Mood = 'neutral', cls = 'dlg-face'): HTMLElement {
  const key = hasArt(portraitKey(id, mood)) ? portraitKey(id, mood) : portraitKey(id);
  return art(key, NPCS[id]?.name ?? id, cls, NPCS[id]?.color);
}

function heroByName(g: GameState, name?: string): Hero | undefined {
  return g.roster.find((x) => x.name === name);
}

function portraitFor(g: GameState, n: DlgNode): HTMLElement | null {
  if (n.who === 'narrator') return null;
  if (n.who === 'hero') { const hero = heroByName(g, dlg?.roller); return hero ? heroPortrait(hero) : null; }
  if (n.who.startsWith('head:')) { const e = HEAD_EYES[n.who.slice(5)]; return e ? art(e.key, tx('dialogue.anEye'), 'dlg-face') : null; }
  return npcPortrait(n.who, n.mood);
}

function rollChip(r: NonNullable<TalkResult['roll']>): HTMLElement {
  return h('div', { class: `dlg-roll ${r.ok ? 'ok' : 'bad'}` },
    h('span', { class: 'd20' }, r.natural),
    tx('dialogue.vsDc', { hero: r.hero, SKILL_NAMES: SKILL_NAMES[r.skill], total: r.total, dc: r.dc, result: tx(r.ok ? 'dialogue.success' : 'dialogue.failure') }));
}

export function dialogueBox(): HTMLElement | null {
  const g = app.game;
  if (!g || !dlg) return null;
  const n = nodeOf();
  if (!n) { dlg = null; return null; }
  if (dlg.showLog) {
    return h('div', { class: 'dlg-back', role: 'dialog', 'aria-label': tx('dialogue.conversationLog'), on: { click: () => { dlg!.showLog = false; render(); } } },
      h('div', { class: 'dlg dlg-log' }, h('div', { class: 'dlg-name' }, tx('dialogue.log')),
        h('div', { class: 'dlg-logbody' }, ...dlg.log.map((l) => h('p', null, l.who ? h('b', null, `${l.who}: `) : null, l.text))),
        h('div', { class: 'small muted' }, tx('dialogue.lOrClickToClose'))));
  }
  const text = rawText(g, n);
  const head = n.who.startsWith('head:') ? HEAD_EYES[n.who.slice(5)] : undefined;
  const variant = head ? 'head' : n.variant ?? (n.who === 'narrator' ? 'read' : 'speech');
  const name = speakerName(g, n.who);
  const color = head?.color ?? NPCS[n.who]?.color ?? '#e9e1cf';
  const isHero = n.who === 'hero';
  const face = portraitFor(g, n);
  const choices = typing ? [] : visibleChoices(g, n);
  const box = h('div', { class: `dlg ${variant} ${typing ? 'typing' : ''} ${isHero ? 'right' : ''}`, style: `--sc:${color}`, on: { click: (e: Event) => { e.stopPropagation(); if (!choices.length) advance(); } } },
    name ? h('div', { class: 'dlg-name' }, name) : null,
    dlg.roll ? rollChip(dlg.roll) : null,
    h('p', { class: 'dlg-text', 'aria-hidden': 'true' }, visible(text.slice(0, typed))),
    h('p', { class: 'sr-only', 'aria-live': 'polite' }, `${name ? `${name}: ` : ''}${visible(text)}`),
    !typing && !choices.length ? h('span', { class: 'dlg-more', 'aria-hidden': 'true' }, '▼') : null,
  );
  return h('div', { class: 'dlg-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': name || tx('dialogue.story') },
    h('div', { class: `dlg-wrap ${isHero ? 'right' : ''}` },
      face ? h('div', { class: 'dlg-portrait', style: `--sc:${color}` }, face) : null,
      h('div', { class: 'dlg-col' },
        box,
        choices.length ? h('div', { class: 'dlg dlg-choices', role: 'listbox' }, ...choices.map((c, i) =>
          h('button', { class: `dlg-choice ${i === dlg!.cursor ? 'on' : ''}`, 'data-key': `choice-${i}`, on: { click: (e: Event) => { e.stopPropagation(); dlg!.cursor = i; step(i); }, mouseenter: () => { if (dlg && dlg.cursor !== i) { dlg.cursor = i; render(); } } } },
            h('span', { class: 'cur' }, i === dlg!.cursor ? '▶' : ''),
            c.check ? h('span', { class: 'dlg-check' }, `🎲 ${SKILL_NAMES[c.check.skill]} ${c.check.dc}`) : null,
            choiceLabel(dlg!.script, dlg!.node, n.choices!.indexOf(c))))) : null,
        h('div', { class: 'dlg-help' }, typing ? tx('dialogue.spaceFinishLine') : choices.length ? tx('dialogue.chooseEnterConfirm') : tx('dialogue.spaceNextEscSkipL')))));
}

/** A one-line, non-blocking bark in the corner (facility keepers). */
export function bark(id: string, text: string, onDone: () => void): HTMLElement {
  return h('div', { class: 'bark', role: 'status', style: `--sc:${NPCS[id]?.color ?? '#e9e1cf'}`, on: { click: onDone } },
    npcPortrait(id, 'neutral', 'bark-face'),
    h('div', null, h('b', null, NPCS[id]?.name ?? id), h('p', null, text)));
}

/** A static box for one-off lines outside a scene (the heads' voices on the way home). */
export function staticBox(who: { name: string; color: string; face?: HTMLElement | null; variant?: string }, text: string): HTMLElement {
  return h('div', { class: 'dlg-wrap static' },
    who.face ? h('div', { class: 'dlg-portrait', style: `--sc:${who.color}` }, who.face) : null,
    h('div', { class: 'dlg-col' }, h('div', { class: `dlg ${who.variant ?? 'speech'}`, style: `--sc:${who.color}` },
      h('div', { class: 'dlg-name' }, who.name), h('p', { class: 'dlg-text' }, text))));
}
