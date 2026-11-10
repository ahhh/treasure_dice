/** Shared widgets: dice, charms, hero portraits, HP bars, bag picker. */
import type { Combatant, Condition, FortuneDie, FortuneRun, Hero, TrayDie, BoonOffer } from '../engine/types.ts';
import { h, fmt } from './dom.ts';
import { art } from './art.ts';
import { MATERIALS, FACE_MODS, SPECIAL_BY_ID } from '../fortune/materials.ts';
import { CHARM_BY_ID, charmText } from '../fortune/charms.ts';
import { HAND_BY_ID } from '../fortune/hands.ts';
import { offerTitle, offerText, TOKENS } from '../fortune/boons.ts';
import { CLASSES } from '../content/classes.ts';
import { derive } from '../rules/character.ts';
import { ITEMS } from '../content/items.ts';
import { heroDice, dieLabel, TRAITS } from '../fortune/dicepath.ts';
import { tx, txn } from '../i18n/index.ts';
import { condName, term } from '../content/terms.ts';

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  7: [0, 2, 3, 4, 5, 6, 8], 8: [0, 1, 2, 3, 5, 6, 7, 8], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
};

export function dieFace(value: number, material: FortuneDie['material'], mod?: string, opts: { cls?: string; onClick?: () => void; label?: string; key?: string } = {}): HTMLElement {
  const m = MATERIALS[material];
  const pips = PIP_LAYOUT[value];
  const body = pips && value > 0
    ? h('div', { class: 'pips' }, ...Array.from({ length: 9 }, (_, i) => (pips.includes(i) ? h('span', { class: 'pip' }) : h('span'))))
    : String(value);
  return h('button', {
    class: `die ${material} ${opts.cls ?? ''}`, style: `--dc:${m.color};--di:${m.ink}`, 'data-key': opts.key,
    'aria-label': opts.label ?? tx('widgets.dieShowing', { mName: m.name, value, v: mod ? `, ${mod}` : '' }), title: tx('widgets.die', { mName: m.name, mod: mod ? tx('widgets.dieMod', { name: FACE_MODS[mod as keyof typeof FACE_MODS]?.name, text: FACE_MODS[mod as keyof typeof FACE_MODS]?.text }) : '', mText: m.text }),
    on: opts.onClick ? { click: (e: Event) => { e.stopPropagation(); opts.onClick!(); } } : undefined,
  }, body, mod ? h('span', { class: 'mod' }, FACE_MODS[mod as keyof typeof FACE_MODS]?.glyph ?? '?') : null);
}

export function trayDie(run: FortuneRun, td: TrayDie, i: number, selected: boolean, rolling: boolean, onClick: () => void): HTMLElement {
  const die = run.bag.find((d) => d.uid === td.dieUid);
  const f = die?.faces[td.face] ?? { v: 0 };
  return dieFace(f.v, die?.material ?? 'bone', f.mod, {
    cls: `${selected ? 'sel' : ''} ${td.jinxed ? 'jinx' : ''} ${td.ghost ? 'ghost' : ''} ${rolling ? 'rolling' : ''}`,
    onClick, key: `die${i}`,
    label: tx('widgets.die2', { v: i + 1, name: MATERIALS[die?.material ?? 'bone'].name, v2: f.v, jinxed: td.jinxed ? tx('widgets.jinxedSuffix') : '', selected: selected ? tx('widgets.selectedSuffix') : '' }),
  });
}

export function charmEl(id: string, counter?: number, extra = ''): HTMLElement {
  const def = CHARM_BY_ID[id];
  const text = def ? charmText(def, counter !== undefined ? { id, counter } : undefined) : id;
  const omen = def?.passive?.omen;
  if (omen) {
    return h('div', { class: `charm omen ${extra}`, title: tx('widgets.omen', { defName: def.name, text }), tabindex: 0, 'data-charm': id },
      h('span', { class: 'omen-star' }, '✶'), h('span', { class: 'omen-hand' }, HAND_BY_ID[omen].name));
  }
  return h('div', { class: `charm ${def?.rarity ?? ''} ${extra}`, title: `${def?.name} (${def?.rarity}) — ${text}`, tabindex: 0, 'data-charm': id },
    art(`charms/${id}`, def?.name ?? id, '', '#5a4a1a'),
    def?.showCounter && counter !== undefined ? h('span', { class: 'cnt' }, id === 'ouroboros' || id === 'avalanche' ? `×${counter}` : `+${counter}`) : null);
}

export function hpBar(hp: number, max: number, ward = 0): HTMLElement {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100));
  const wp = Math.min(100, (ward / Math.max(1, max)) * 100);
  return h('div', { class: `bar ${pct < 30 ? 'low' : ''}`, role: 'meter', 'aria-valuenow': hp, 'aria-valuemax': max, 'aria-label': tx('widgets.hpOf', { hp, max }) },
    h('span', { style: `width:${pct}%` }), ward > 0 ? h('div', { class: 'ward', style: `width:${wp}%` }) : null);
}

const BAD = new Set(['blinded', 'charmed', 'frightened', 'incapacitated', 'paralyzed', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious', 'baned', 'marked', 'hexed', 'slowed', 'burning', 'faerieFire', 'weakened', 'noHeal', 'vulnerable', 'banished', 'staggered']);

/** Standard condition rules, for tooltips. */
const COND_TEXT: Record<string, string> = {
  get blinded() { return tx('widgets.canTSeeAttacksAgainst'); },
  get charmed() { return tx('widgets.wonTAttackTheOne'); },
  get frightened() { return tx('widgets.disadvantageOnAttacksAndChecks'); },
  get incapacitated() { return tx('widgets.canTTakeActionsOr'); },
  get paralyzed() { return tx('widgets.canTActAttacksAgainst'); },
  get poisoned() { return tx('widgets.disadvantageOnAttackRollsAnd'); },
  get prone() { return tx('widgets.meleeAttacksAgainstItHave'); },
  get restrained() { return tx('widgets.attacksAgainstItHaveAdvantage'); },
  get stunned() { return tx('widgets.canTActAttacksAgainst2'); },
  get unconscious() { return tx('widgets.downAndHelplessCloseHits'); },
  get invisible() { return tx('widgets.itsAttacksHaveAdvantageAttacks'); },
};

export function conds(list: Condition[], side: 'hero' | 'enemy'): HTMLElement {
  return h('div', { class: 'conds' }, ...list.map((c) => {
    const bad = BAD.has(c.id);
    const cls = side === 'hero' ? (bad ? 'bad' : 'good') : bad ? 'good' : 'bad';
    const name = condName(c.id);
    const left = c.rounds > 0 && c.rounds < 50 ? txn('widgets.roundLeft', c.rounds) : '';
    const tip = `${name[0].toUpperCase()}${name.slice(1)} — ${COND_TEXT[c.id] ?? tx(bad ? 'widgets.harmfulEffect' : 'widgets.helpfulEffect')}${left}`;
    return h('span', { class: `cond ${cls}`, title: tip }, name, c.rounds > 0 && c.rounds < 50 ? ` ${c.rounds}` : '');
  }));
}

export function heroPortrait(hero: Hero, size = ''): HTMLElement {
  return h('div', { class: `portrait ${size} ${hero.status === 'dead' ? 'dead' : ''}` }, art(hero.portrait, hero.name, '', CLASSES[hero.classId].color));
}

export function heroLine(hero: Hero): string {
  return `${CLASSES[hero.classId].name} ${hero.level} · ${term('ancestry', hero.ancestry)}`;
}

export function combatantArt(c: Combatant, cls = ''): HTMLElement {
  return art(c.art, c.name, cls, c.side === 'hero' ? '#3a4f94' : '#6b2b2b');
}

export function hpText(h0: Hero) {
  return `${h0.hp}/${derive(h0).maxHp}`;
}

export function doubloons(n: number): HTMLElement {
  return h('span', { class: 'doubloons', title: tx('widgets.doubloonsRunOnlyCoinFor') }, h('span', { class: 'coin' }), fmt(n));
}

export function offerIcon(o: BoonOffer): HTMLElement {
  if (o.kind === 'charm') return art(`charms/${o.id}`, offerTitle(o), '', '#5a4a1a');
  if (o.kind === 'die' && o.die) {
    const sp = SPECIAL_BY_ID[o.id];
    return h('div', { class: 'row', style: 'justify-content:center' }, dieFace(sp?.faces.find((f) => f.mod)?.v ?? 6, o.die.material, sp?.faces.find((f) => f.mod)?.mod, { cls: '' }));
  }
  if (o.kind === 'face') return h('div', { class: 'row', style: 'justify-content:center' }, dieFace(6, 'bone', o.face));
  if (o.kind === 'omen') return h('div', { class: 'token', style: 'width:64px;height:64px;font-size:30px;background:radial-gradient(circle at 35% 30%,#e4d9ff,#6b4fd0 60%,#2b1a6a);border-color:#cbbcff;color:#fff' }, '✶');
  if (o.kind === 'token') return h('div', { class: 'token', style: 'width:56px;height:56px;font-size:22px' }, TOKEN_GLYPH[o.id] ?? '¤');
  if (o.kind === 'remove') return h('div', { class: 'token', style: 'width:56px;height:56px;font-size:24px;background:#3a0d12;border-color:var(--mult);color:#fff' }, '✖');
  return h('div', { class: 'token', style: 'width:56px;height:56px;font-size:24px;background:radial-gradient(circle at 35% 30%,#d9f7ff,#2a7fb0 60%,#0b2a40);color:#fff' }, '▲');
}

export const TOKEN_GLYPH: Record<string, string> = { mulligan: '↻', fateCoin: '⚀', loadedCoin: '20', encore: '+1', tonic: '♥' };

export function boonCard(o: BoonOffer, onPick: () => void, opts: { price?: number; afford?: boolean; disabled?: boolean } = {}): HTMLElement {
  const def = o.kind === 'charm' ? CHARM_BY_ID[o.id] : undefined;
  const kindLabel = o.kind === 'charm' ? tx('widgets.charm', { rarity: def?.rarity }) : o.kind === 'omen' ? 'Omen' : o.kind === 'die' ? tx('widgets.newDie') : o.kind === 'face' ? tx('widgets.faceEnchant') : o.kind === 'token' ? 'Token' : o.kind === 'remove' ? tx('widgets.bagThinning') : 'Upgrade';
  return h('button', { class: `boon ${def ? `charm-${def.rarity}` : ''}`, disabled: !!opts.disabled || o.sold, on: { click: onPick } },
    h('span', { class: 'kind' }, kindLabel),
    h('div', { class: 'icon' }, offerIcon(o)),
    h('span', { class: 'name' }, offerTitle(o)),
    h('span', { class: 'desc' }, offerText(o)),
    opts.price !== undefined ? h('span', { class: `price ${opts.afford === false ? 'danger' : 'gold'}` }, o.sold ? tx('widgets.sold') : tx('widgets.doubloons', { price: opts.price })) : null);
}

export function bagView(run: FortuneRun, onPick: (uid: string, face?: number) => void, opts: { pickFace?: boolean; sel?: string } = {}): HTMLElement {
  return h('div', { class: 'bag' }, ...run.bag.filter((d) => !d.uid.startsWith('ghost')).map((d) => {
    const m = MATERIALS[d.material];
    return h('div', { class: `bag-die ${opts.sel === d.uid ? 'sel' : ''}`, tabindex: 0, on: { click: () => onPick(d.uid) } },
      h('div', { class: 'small' }, d.name ?? tx('widgets.die3', { mName: m.name })),
      h('div', { class: 'faces' }, ...d.faces.map((f, i) => h('button', {
        class: 'face', style: `background:${m.color};color:${m.ink}`, title: f.mod ? FACE_MODS[f.mod].text : `${f.v}`,
        on: { click: (e: Event) => { e.stopPropagation(); onPick(d.uid, opts.pickFace ? i : undefined); } },
      }, String(f.v), f.mod ? h('sup', null, FACE_MODS[f.mod].glyph) : null))));
  }));
}

export function itemIcon(defId: string): HTMLElement {
  const d = ITEMS[defId];
  return h('div', { class: d?.legend ? 'icon legend' : 'icon', title: d?.legend ? tx('widgets.legendary', { lore: d.legend.lore }) : undefined }, art(d?.art ?? 'x', d?.name ?? defId, '', '#4a4a5a'));
}

export { MATERIALS, TOKENS };

/** A hero's signature dice, every face laid out, with traits. `hi` highlights one die/face. */
export function signatureDice(hero: Hero, hi?: { die: number; face?: number }): HTMLElement {
  return h('div', { class: 'sig-dice' }, ...heroDice(hero).map((d, di) =>
    h('div', { class: `sig-die ${hi?.die === di && hi.face === undefined ? 'hi' : ''}` },
      h('span', { class: 'small muted' }, dieLabel(hero, di), d.trait ? h('b', { class: 'gold', title: TRAITS[d.trait].text }, ` · ${TRAITS[d.trait].glyph} ${TRAITS[d.trait].name}`) : null),
      h('div', { class: 'sig-faces' }, ...d.faces.map((f, fi) => dieFace(f.v, d.material, f.mod, { cls: `mini ${hi?.die === di && hi.face === fi ? 'sel' : ''}` }))))));
}
