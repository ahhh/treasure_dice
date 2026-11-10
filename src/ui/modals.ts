/** Overlays: hero sheet, level-up wizard, spoils, boons, shop, events, bag, results. */
import type { Ability, EquipSlot, Hero, BoonOffer } from '../engine/types.ts';
import { ABILITIES, EQUIP_SLOTS } from '../engine/types.ts';
import { h, btn, fmt } from './dom.ts';
import { app, run, render, toast } from './app.ts';
import { art, bgStyle, banner, firstArt } from './art.ts';
import { heroPortrait, heroLine, hpBar, boonCard, bagView, itemIcon, doubloons, charmEl, dieFace, signatureDice } from './widgets.ts';
import { heroDice, heroColour, markTitle, markText, TRAIT_LEVELS, RECOLOUR_LEVEL } from '../fortune/dicepath.ts';
import { SKILL_TRICKS } from '../content/skilltricks.ts';
import { CLASSES, featuresUpTo, FEATS, FIGHTING_STYLES, METAMAGIC, INVOCATIONS, EPIC_BOONS } from '../content/classes.ts';
import { ITEMS, itemName } from '../content/items.ts';
import { SPECIES, BACKGROUNDS } from '../content/origins.ts';
import { spellsForClass, SPELLS } from '../content/spells.ts';
import { derive, SKILL_NAMES, ABILITY_NAMES, maxPrepared, choiceOptions } from '../rules/character.ts';
import { levelUpPreview, canEquip, type LevelChoices } from '../meta/town.ts';
import { offerNeedsTarget, offerTakesSlot } from '../fortune/boons.ts';
import { charmSlots } from '../fortune/tray.ts';
import { CHARM_BY_ID, omenLevels } from '../fortune/charms.ts';
import { HANDS } from '../fortune/hands.ts';
import { EVENTS } from '../content/events.ts';
import { eventOptions } from '../dungeon/explore.ts';
import { staticBox } from './dialogue.ts';
import { HEAD_EYES } from '../content/npcs.ts';
import { headLine } from '../i18n/dialogue.ts';
import { EVIDENCE } from '../content/quest.ts';
import { BIOMES } from '../content/biomes.ts';
import { SKILL_ABILITY } from '../rules/character.ts';
import { itemSummary, SLOT_NAMES } from './town.ts';
import { sfx } from './audio.ts';
import { CLASS_MATERIAL, MATERIALS } from '../fortune/materials.ts';
import { CHAPTERS, EPILOGUE, FINALE, type Chapter } from '../content/story.ts';
import { openShareCard } from './shareCard.ts';
import { restartTutorial } from './tutorial.ts';
import { tx, rich, text } from '../i18n/index.ts';
import { languagePicker } from './language.ts';
import { term } from '../content/terms.ts';

const mod = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

function modal(content: (HTMLElement | null)[], opts: { narrow?: boolean; onClose?: () => void; label: string }): HTMLElement {
  return h('div', { class: 'modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label, on: { click: (e: Event) => { if (e.target === e.currentTarget && opts.onClose) opts.onClose(); } } },
    h('div', { class: `win modal ${opts.narrow ? 'narrow' : ''}` }, ...content));
}

// ── hero sheet ──────────────────────────────────────────────────────────────

let prepEdit: string[] | null = null;

export function heroSheet(id: string): HTMLElement {
  const g = app.game!;
  const recruit = id.startsWith('recruit:');
  const hero = recruit ? g.recruits[Number(id.split(':')[1])] : g.roster.find((x) => x.id === id)!;
  const close = () => { app.ui.heroSheet = undefined; prepEdit = null; render(); };
  if (!hero) { app.ui.heroSheet = undefined; return h('div'); }
  const d = derive(hero);
  const cls = CLASSES[hero.classId];
  const inDungeon = !!g.expedition;
  const editable = !recruit && !inDungeon && hero.status === 'alive';
  const feats = featuresUpTo(hero.classId, hero.level);
  const spells = spellsForClass(hero);
  const prepared = prepEdit ?? hero.prepared;
  const vaultFor = (slot: EquipSlot) => g.vault.filter((it) => !canEquip(hero, it, slot));
  return modal([
    h('div', { class: 'sheet' },
      h('div', { class: 'col' }, heroPortrait(hero, 'lg'), h('b', null, hero.name), h('span', { class: 'small muted' }, heroLine(hero)),
        h('span', { class: 'small' }, hero.level < 3 ? tx('modals.subclassAtLevel3', { name: cls.subclass.name }) : cls.subclass.name),
        h('span', { class: 'small muted' }, `${SPECIES[hero.ancestry]?.name} · ${BACKGROUNDS[hero.background]?.name}`)),
      h('div', { class: 'col' },
        h('div', { class: 'row' }, h('span', null, tx('modals.hp', { hp: hero.hp, maxHp: d.maxHp })), h('span', null, tx('modals.ac', { ac: d.ac })), h('span', null, tx('modals.init', { mod: mod(d.init) })), h('span', null, tx('modals.prof', { mod: mod(d.pb) })),
          d.spellAbility ? h('span', null, tx('modals.spellDcAttack', { spellDc: d.spellDc, mod: mod(d.spellAttack) })) : null),
        hpBar(hero.hp, d.maxHp),
        h('div', { class: 'abil' }, ...ABILITIES.map((a) => h('div', { title: ABILITY_NAMES[a] }, a.toUpperCase(), h('b', null, d.abilities[a]), h('span', { class: 'small muted' }, tx('modals.save', { mod: mod(d.mods[a]), mod2: mod(d.saves[a]), v: d.saveProf.includes(a) ? '●' : '' }))))),
        h('div', { class: 'small' }, ...rich(tx('modals.attackToHit', { mainName: d.main.name, attacks: d.attacks, toHit: d.main.toHit, dice: d.main.dice, mod: mod(d.main.bonus), type: term('damageTypes', d.main.type), mastery: d.main.mastery ? tx('modals.masterySuffix', { mastery: term('masteries', d.main.mastery) }) : '' }))),
        h('div', { class: 'small' }, h('b', null, tx('modals.fortuneTalent')), `${cls.fortuneTalent.name} — ${cls.fortuneTalent.text}`, h('span', { class: 'impl adapted' }, 'adapted')),
        h('div', { class: 'small' }, h('b', null, tx('modals.dice')), tx('modals.bringsSignatureDiceToThe', { length: heroDice(hero).length, name: MATERIALS[heroColour(hero)].name, v: d.diceGear.affinity.length ? `, ${[...new Set(d.diceGear.affinity)].map((m) => MATERIALS[m].name).join(', ')}` : '' }), d.rerollBonus ? tx('modals.rerollOnTheirTurns', { rerollBonus: d.rerollBonus }) : ''),
        signatureDice(hero),
        h('div', { class: 'small' }, h('b', null, tx('modals.skills')), d.proficient.map((s) => `${SKILL_NAMES[s]} ${mod(d.skills[s])}${hero.expertise.includes(s) ? '★' : ''}`).join(', ')),
        h('div', { class: 'small' }, h('b', null, tx('modals.skillTricksPerFight', { tricks: d.tricks })), d.proficient.map((s) => `${SKILL_TRICKS[s].name} — ${SKILL_TRICKS[s].text}`).join(' · ')),
        hero.feats.length ? h('div', { class: 'small' }, h('b', null, tx('modals.feats')), hero.feats.map((f) => FEATS[f]?.name ?? f).join(', ')) : null,
        Object.keys(hero.choices).length ? h('div', { class: 'small' }, h('b', null, tx('modals.choices')), Object.values(hero.choices).flat().map((c) => FIGHTING_STYLES[c]?.name ?? METAMAGIC[c]?.name ?? INVOCATIONS[c]?.name ?? EPIC_BOONS[c]?.name ?? c).join(', ')) : null,
      )),
    h('h3', { style: 'margin-top:12px' }, tx('modals.equipment')),
    h('div', { class: 'list' }, ...EQUIP_SLOTS.map((slot) => {
      const it = hero.equipment[slot];
      const opts = editable ? vaultFor(slot) : [];
      return h('div', { class: 'item-row' }, it ? itemIcon(it.defId) : h('div', { class: 'icon' }),
        h('div', { class: 'grow' }, h('span', { class: 'small muted' }, SLOT_NAMES[slot]), h('div', null, it ? itemName(it) : '—'), it ? h('div', { class: 'small muted' }, itemSummary(it.defId, it)) : null),
        editable && opts.length ? h('select', { 'aria-label': tx('modals.equip', { SLOT_NAMES: SLOT_NAMES[slot] }), style: 'background:#0b1230;color:inherit;border:1px solid #556;border-radius:4px;padding:4px;max-width:180px', on: { change: (e: Event) => { const v = (e.target as HTMLSelectElement).value; if (v) run({ type: 'equip', heroId: hero.id, uid: v, slot }); } } },
          h('option', { value: '' }, tx('modals.equip2')), ...opts.map((o) => h('option', { value: o.uid }, itemName(o)))) : null,
        editable && it ? btn(tx('modals.remove'), () => run({ type: 'unequip', heroId: hero.id, slot }), { cls: 'small' }) : null);
    })),
    spells.length ? h('div', null,
      h('div', { class: 'row', style: 'margin-top:12px' }, h('h3', { class: 'grow' }, tx('modals.spellsPrepared', { preparedLength: prepared.length, maxPrepared: maxPrepared(hero) })),
        editable && prepEdit ? btn(tx('modals.savePreparation'), () => { const r = run({ type: 'prepare', heroId: hero.id, spellIds: prepEdit! }); if (r.ok) { prepEdit = null; toast(tx('modals.spellsPrepared2'), true); render(); } }, { cls: 'small primary' }) : null),
      h('div', { class: 'row small muted' }, tx('modals.slots'), ...hero.slots.map((n, i) => (i > 0 && d.slots[i] ? h('span', { class: 'badge blue' }, `${i}: ${n}/${d.slots[i]}`) : null))),
      h('div', { class: 'list' }, ...spells.sort((a, b) => a.level - b.level).map((s) => {
        const prep = s.level === 0 || prepared.includes(s.id);
        return h('div', { class: 'item-row' },
          s.level > 0 && editable ? h('input', { type: 'checkbox', checked: prep, 'aria-label': tx('modals.prepare', { sName: s.name }), on: { change: () => { const cur = prepEdit ?? hero.prepared.slice(); prepEdit = prep ? cur.filter((x) => x !== s.id) : [...cur, s.id]; render(); } } }) : h('span', { class: 'small' }, prep ? '●' : '○'),
          h('div', { class: 'grow' }, h('b', null, `${s.name} `), h('span', { class: 'small muted' }, s.level ? tx('modals.level', { level: s.level }) : 'cantrip'), h('div', { class: 'small muted' }, s.text)));
      }))) : null,
    h('h3', { style: 'margin-top:12px' }, tx('modals.features')),
    h('div', null, ...feats.map((f) => h('div', { class: 'feat' }, h('b', null, f.name), h('span', { class: `impl ${f.impl}` }, f.impl), ' — ', f.text))),
    h('div', { class: 'row', style: 'margin-top:12px' },
      editable && hero.pendingLevel ? btn(tx('modals.levelUp'), () => { app.ui.heroSheet = undefined; app.ui.levelUp = hero.id; render(); }, { cls: 'primary' }) : null,
      editable ? btn(tx('modals.retire'), () => { if (confirm(tx('modals.retireTheirGearGoesTo', { heroName: hero.name }))) { run({ type: 'retire', heroId: hero.id }); close(); } }, { cls: 'small danger' }) : null,
      h('span', { class: 'spacer' }), btn(tx('modals.close'), close, { key: 'close-sheet' })),
  ], { label: tx('modals.sSheet', { heroName: hero.name }), onClose: close });
}

// ── level-up wizard ─────────────────────────────────────────────────────────

let lvl: { hero: string; asiMode: 'plus2' | 'split' | 'feat'; a: Ability; b: Ability; feat: string; picks: Record<string, string[]>; expertise: string[]; mark: number } | null = null;

export function levelUpModal(id: string): HTMLElement {
  const g = app.game!;
  const hero = g.roster.find((x) => x.id === id)!;
  const close = () => { app.ui.levelUp = undefined; lvl = null; render(); };
  if (!hero || !hero.pendingLevel) { app.ui.levelUp = undefined; return h('div'); }
  const pv = levelUpPreview(hero);
  const cls = CLASSES[hero.classId];
  if (!lvl || lvl.hero !== id) lvl = { hero: id, asiMode: 'plus2', a: cls.arrayOrder[0], b: cls.arrayOrder[1], feat: 'tough', picks: {}, expertise: [], mark: 0 };
  const st = lvl;
  const sel = (key: string, opt: string, max: number) => {
    const cur = st.picks[key] ?? [];
    st.picks[key] = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt].slice(-max);
    render();
  };
  const choiceName = (kind: string, o: string) => FIGHTING_STYLES[o]?.name ?? METAMAGIC[o]?.name ?? INVOCATIONS[o]?.name ?? EPIC_BOONS[o]?.name ?? (kind === 'expertise' ? SKILL_NAMES[o as keyof typeof SKILL_NAMES] : o[0].toUpperCase() + o.slice(1));
  const choiceText = (o: string) => FIGHTING_STYLES[o]?.text ?? METAMAGIC[o]?.text ?? INVOCATIONS[o]?.text ?? EPIC_BOONS[o]?.text ?? '';
  const sheetSelect = (val: string, on: (v: string) => void, opts: [string, string][]) => h('select', { style: 'background:#0b1230;color:inherit;border:1px solid #556;border-radius:4px;padding:4px', on: { change: (e: Event) => on((e.target as HTMLSelectElement).value) } }, ...opts.map(([v, l]) => h('option', { value: v, selected: v === val }, l)));
  const confirmLevel = () => {
    const ch: LevelChoices = { picks: st.picks, expertise: st.expertise, mark: st.mark };
    if (pv.choices.some((c) => c.feature.choice === 'asi')) ch.asi = st.asiMode === 'plus2' ? { mode: 'plus2', a: st.a } : st.asiMode === 'split' ? { mode: 'split', a: st.a, b: st.b } : { mode: 'feat', feat: st.feat };
    const r = run({ type: 'levelUp', heroId: hero.id, choices: ch });
    if (r.ok) { sfx.fanfare(); toast(tx('modals.reachedLevel', { heroName: hero.name, next: pv.next }), true); close(); }
  };
  return modal([
    h('div', { class: 'row' }, heroPortrait(hero, 'lg'), h('div', null, h('h2', null, `${hero.name} — ${cls.name} ${pv.next}`), h('p', { class: 'small muted' }, tx('modals.conHitPointsVitalityResources', { hpGain: pv.hpGain })))),
    h('h3', null, tx('modals.newFeatures')),
    pv.features.length ? h('div', null, ...pv.features.map((f) => h('div', { class: 'feat' }, h('b', null, f.name), h('span', { class: `impl ${f.impl}` }, f.impl), ' — ', f.text))) : h('p', { class: 'muted' }, tx('modals.moreHitPointsAndA')),
    pv.newSpells.length ? h('p', { class: 'small' }, h('b', null, tx('modals.newSpellsAvailable')), pv.newSpells.map((s) => SPELLS[s]?.name).join(', ')) : null,
    ...pv.choices.map(({ feature, options }) => {
      if (feature.choice === 'asi') {
        return h('div', { class: 'win', style: 'margin-top:8px' }, h('h3', null, tx('modals.abilityScoreImprovementOrFeat')),
          h('div', { class: 'row' }, ...(['plus2', 'split', 'feat'] as const).map((m) => btn(m === 'plus2' ? tx('modals.n2ToOne') : m === 'split' ? tx('modals.n1ToTwo') : tx('modals.takeAFeat'), () => { st.asiMode = m; render(); }, { cls: `small ${st.asiMode === m ? 'on' : ''}` }))),
          st.asiMode !== 'feat' ? h('div', { class: 'row', style: 'margin-top:6px' },
            sheetSelect(st.a, (v) => { st.a = v as Ability; }, ABILITIES.map((a) => [a, `${ABILITY_NAMES[a]} (${hero.abilities[a]})`])),
            st.asiMode === 'split' ? sheetSelect(st.b, (v) => { st.b = v as Ability; }, ABILITIES.map((a) => [a, `${ABILITY_NAMES[a]} (${hero.abilities[a]})`])) : null)
            : h('div', { class: 'col', style: 'margin-top:6px' }, ...Object.entries(FEATS).filter(([k, f]) => !hero.feats.includes(k) || f.repeatable).map(([k, f]) => btn([h('b', null, f.name), ' — ', h('span', { class: 'small muted' }, f.text)], () => { st.feat = k; render(); }, { cls: `small ${st.feat === k ? 'on' : ''}` }))));
      }
      const key = feature.choice!;
      const max = feature.choiceCount ?? (key === 'expertise' ? 2 : 1);
      const opts = key === 'expertise' ? hero.skillProfs.filter((s) => !hero.expertise.includes(s)) : options.filter((o) => !(hero.choices[key] ?? []).includes(o));
      const cur = key === 'expertise' ? st.expertise : st.picks[key] ?? [];
      return h('div', { class: 'win', style: 'margin-top:8px' }, h('h3', null, tx('modals.choose', { featureName: feature.name, max })),
        h('div', { class: 'col' }, ...opts.map((o) => btn([h('b', null, choiceName(key, o)), choiceText(o) ? h('span', { class: 'small muted' }, ` — ${choiceText(o)}`) : null], () => {
          if (key === 'expertise') { st.expertise = st.expertise.includes(o) ? st.expertise.filter((x) => x !== o) : [...st.expertise, o].slice(-max); render(); } else sel(key, o, max);
        }, { cls: `small ${cur.includes(o) ? 'on' : ''}` }))));
    }),
    pv.marks.length ? h('div', { class: 'win', style: 'margin-top:8px', 'data-tut': 'dicepath' },
      h('h3', null, pv.next === RECOLOUR_LEVEL ? tx('modals.dicePathChooseYourColour') : tx('modals.dicePathChooseOneMark', { milestone: TRAIT_LEVELS.includes(pv.next) ? tx('modals.traitMilestone') : '' })),
      h('p', { class: 'small muted' }, tx('modals.permanentChangesToThisHero')),
      signatureDice(hero, (() => { const m = pv.marks[st.mark]; return m && m.kind !== 'newDie' && m.kind !== 'recolour' ? { die: m.die, face: m.kind === 'engrave' ? m.face : undefined } : undefined; })()),
      h('div', { class: 'mark-cards', style: 'margin-top:8px' }, ...pv.marks.map((m, i) => btn([h('b', null, m.kind === 'recolour' ? h('span', { class: 'swatch', style: `display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px;background:${MATERIALS[m.material].color}` }) : null, markTitle(hero, m)), h('span', { class: 'small muted' }, markText(hero, m))], () => { st.mark = i; render(); }, { cls: `small mark-card ${st.mark === i ? 'on' : ''}`, key: `mark-${i}` })))) : null,
    h('div', { class: 'row', style: 'margin-top:12px' }, h('span', { class: 'spacer' }), btn(tx('modals.later'), close), btn(tx('modals.becomeLevel', { next: pv.next }), confirmLevel, { cls: 'primary', key: 'confirm-level' })),
  ], { label: tx('modals.levelUp'), onClose: close });
  void choiceOptions;
}

// ── dungeon overlays ────────────────────────────────────────────────────────

export function spoilsModal(): HTMLElement {
  const exp = app.game!.expedition!;
  const s = exp.spoils!;
  return modal([
    h('h2', { class: 'result-big gold' }, s.kind === 'boss' ? tx('modals.bossDefeated') : tx('modals.victory')),
    h('div', { class: 'col', style: 'align-items:center;margin:10px 0' },
      h('div', { class: 'row' }, h('span', { class: 'coin' }), h('b', { class: 'gold' }, tx('modals.gold', { gold: s.gold })), h('span', { class: 'small muted' }, tx('modals.carriedBankItByEscaping'))),
      h('div', { class: 'row' }, tx('modals.doubloons'), h('b', { class: 'gold' }, `+${s.doubloons}`), tx('modals.interest'), h('b', { class: 'gold' }, `+${s.interest}`), s.charmBonus ? [tx('modals.charms'), h('b', { class: 'gold' }, `+${s.charmBonus}`)] : null),
      ...s.items.map((i) => h('div', null, tx('modals.found'), h('b', null, i))),
      h('div', { class: 'result-big', style: 'font-size:28px;margin-top:8px' }, tx('modals.fortuneRank', { rank: s.rank })),
      h('p', { class: 'small muted' }, s.rank % 3 === 0 ? tx('modals.aMilestoneRankChooseA') : tx('modals.chooseABoonForThis'))),
    h('div', { class: 'row', style: 'justify-content:center' }, btn(tx('modals.claim'), () => { sfx.coin(); run({ type: 'closeSpoils' }); }, { cls: 'primary big', key: 'claim' })),
  ], { narrow: true, label: tx('modals.victory2') });
}

let replacing: { purpose: 'boon' | 'shop'; idx: number } | null = null;

export function boonsModal(): HTMLElement {
  const exp = app.game!.expedition!;
  const b = exp.boons!;
  const run0 = exp.fortune;
  if (app.ui.bagPick?.purpose === 'boon') return bagPickModal();
  if (replacing?.purpose === 'boon') return replaceModal();
  return modal([
    h('h2', null, b.picks > 1 ? tx('modals.chooseBoons', { picks: b.picks }) : tx('modals.chooseABoon')),
    h('div', { class: 'row small muted' }, tx('modals.charms2', { charmsLength: run0.charms.length, charmSlots: charmSlots(run0) }), doubloons(run0.doubloons)),
    h('div', { class: 'boons', style: 'margin:10px 0' }, ...b.offers.map((o, i) => boonCard(o, () => pickOffer('boon', o, i)))),
    h('div', { class: 'row' }, h('span', { class: 'spacer' }), btn(tx('modals.skip2Doubloons'), () => run({ type: 'skipBoon' }))),
  ], { label: tx('modals.chooseABoon') });
}

function pickOffer(purpose: 'boon' | 'shop', o: BoonOffer, i: number) {
  const exp = app.game!.expedition!;
  if (offerTakesSlot(o) && exp.fortune.charms.length >= charmSlots(exp.fortune)) { replacing = { purpose, idx: i }; render(); return; }
  const need = offerNeedsTarget(o);
  if (need) { app.ui.bagPick = { purpose, idx: i }; render(); return; }
  const r = run(purpose === 'boon' ? { type: 'pickBoon', idx: i } : { type: 'shopBuy', idx: i });
  if (r.ok) sfx.coin();
}

function replaceModal(): HTMLElement {
  const exp = app.game!.expedition!;
  const rp = replacing!;
  const cancel = () => { replacing = null; render(); };
  return modal([
    h('h2', null, tx('modals.yourCharmSlotsAreFull')),
    h('p', { class: 'prose' }, tx('modals.chooseACharmOrOmen')),
    h('div', { class: 'charm-bar' }, ...exp.fortune.charms.map((c, i) => h('button', { class: 'btn', on: { click: () => {
      const r = run(rp.purpose === 'boon' ? { type: 'pickBoon', idx: rp.idx, replaceCharm: i } : { type: 'shopBuy', idx: rp.idx, replaceCharm: i });
      if (r.ok) { replacing = null; render(); }
    } } }, charmEl(c.id, c.counter), h('div', { class: 'small' }, CHARM_BY_ID[c.id]?.name)))),
    h('div', { class: 'row' }, h('span', { class: 'spacer' }), btn(tx('modals.cancel'), cancel)),
  ], { narrow: true, label: tx('modals.replaceACharm'), onClose: cancel });
}

function bagPickModal(): HTMLElement {
  const exp = app.game!.expedition!;
  const bp = app.ui.bagPick!;
  const offers = bp.purpose === 'boon' ? exp.boons?.offers : bp.purpose === 'shop' ? exp.shop?.offers : undefined;
  const o = offers?.[bp.idx];
  const needFace = !!o && offerNeedsTarget(o) === 'face';
  const cancel = () => { app.ui.bagPick = undefined; render(); };
  const commit = (uid: string, face?: number) => {
    if (bp.purpose === 'sacrifice') { const r = run({ type: 'sacrifice', dieUid: uid }); if (r.ok) cancel(); return; }
    if (needFace && face === undefined) { app.ui.bagPick = { ...bp, die: uid }; render(); return; }
    const r = run(bp.purpose === 'boon' ? { type: 'pickBoon', idx: bp.idx, dieUid: uid, face } : { type: 'shopBuy', idx: bp.idx, dieUid: uid, face });
    if (r.ok) { sfx.coin(); app.ui.bagPick = undefined; render(); }
  };
  return modal([
    h('h2', null, bp.purpose === 'sacrifice' ? tx('modals.offerADieToThe') : needFace ? tx('modals.chooseAFaceToEnchant') : tx('modals.chooseADie')),
    h('p', { class: 'small muted' }, needFace ? tx('modals.clickAFaceOnAny') : tx('modals.clickADie')),
    bagView(exp.fortune, commit, { pickFace: needFace, sel: bp.die }),
    h('div', { class: 'row', style: 'margin-top:10px' }, h('span', { class: 'spacer' }), btn(tx('modals.cancel'), cancel)),
  ], { label: tx('modals.pickADie'), onClose: cancel });
}

export function lootChoiceModal(): HTMLElement {
  const exp = app.game!.expedition!;
  return modal([
    h('h2', null, tx('modals.theHoardTakeOne')),
    h('div', { class: 'list' }, ...exp.lootChoice!.items.map((it, i) => h('div', { class: 'item-row' }, itemIcon(it.defId),
      h('div', { class: 'grow' }, h('b', null, itemName(it)), h('div', { class: 'small muted' }, itemSummary(it.defId, it))),
      btn(tx('modals.take'), () => { sfx.coin(); run({ type: 'pickLoot', idx: i }); }, { cls: 'primary small' })))),
  ], { label: tx('modals.chooseLoot') });
}

export function shopModal(): HTMLElement {
  const exp = app.game!.expedition!;
  const shop = exp.shop!;
  if (app.ui.bagPick?.purpose === 'shop') return bagPickModal();
  if (replacing?.purpose === 'shop') return replaceModal();
  return modal([
    h('div', { class: 'row' }, h('h2', { class: 'grow' }, tx('modals.thePeddler')), doubloons(exp.fortune.doubloons)),
    h('p', { class: 'prose' }, tx('modals.charmsDiceOmensAllOf')),
    h('div', { class: 'boons', style: 'margin:10px 0' }, ...shop.offers.map((o, i) => boonCard(o, () => pickOffer('shop', o, i), { price: o.price, afford: (o.price ?? 0) <= exp.fortune.doubloons, disabled: (o.price ?? 0) > exp.fortune.doubloons }))),
    h('h3', null, tx('modals.sellACharmHalfPrice')),
    h('div', { class: 'charm-bar' }, ...exp.fortune.charms.map((c, i) => h('button', { class: 'btn small', on: { click: () => { if (confirm(tx('modals.sell', { name: CHARM_BY_ID[c.id]?.name }))) run({ type: 'sellCharm', idx: i }); } } }, charmEl(c.id, c.counter)))),
    h('div', { class: 'row', style: 'margin-top:10px' }, btn(tx('modals.rerollStock', { rerollCost: shop.rerollCost }), () => run({ type: 'shopReroll' }), { disabled: exp.fortune.doubloons < shop.rerollCost }), h('span', { class: 'spacer' }), btn(tx('modals.leave'), () => run({ type: 'shopClose' }), { cls: 'primary', key: 'leave-shop' })),
  ], { label: tx('modals.peddler'), onClose: () => run({ type: 'shopClose' }) });
}

export function eventModal(): HTMLElement {
  const exp = app.game!.expedition!;
  const ev = EVENTS[exp.event!.eventId];
  if (exp.event!.stage === 'pickDie') {
    app.ui.bagPick = { purpose: 'sacrifice', idx: 0 };
    return bagPickModal();
  }
  if (exp.event!.stage === 'result') {
    return modal([banner(`events/${ev.id}`, ev.title), h('h2', null, ev.title), h('div', { class: 'col prose' }, ...(exp.event!.result ?? []).map((l) => h('p', { style: 'margin:0' }, l))),
      h('div', { class: 'row', style: 'margin-top:10px' }, h('span', { class: 'spacer' }), btn(tx('modals.continue'), () => run({ type: 'eventClose' }), { cls: 'primary', key: 'ev-continue' }))], { narrow: true, label: ev.title });
  }
  const opts = eventOptions(app.game!);
  return modal([
    banner(`events/${ev.id}`, ev.title),
    ev.quest ? h('div', { class: 'chapter-head' }, tx('modals.theQueenSDue')) : null,
    h('h2', null, ev.title),
    h('p', { class: 'prose' }, ev.text),
    h('div', { class: 'menu' }, ...opts.map((o, i) => {
      let detail = '';
      if (o.check?.skill && o.best) {
        const need = o.dc - o.best.bonus;
        const chance = Math.max(5, Math.min(95, (21 - need) * 5));
        detail = tx('modals.dcChance', { SKILL_NAMES: SKILL_NAMES[o.check.skill], dc: o.dc, heroName: o.best.hero.name, mod: mod(o.best.bonus), chance });
      }
      if (o.cost?.gold) detail += ` · costs ${o.cost.gold} gold`;
      if (o.cost?.doubloons) detail += ` · costs ${o.cost.doubloons} doubloons`;
      return h('div', { class: 'col', style: 'gap:2px' },
        btn([o.label, detail ? h('div', { class: 'small muted' }, detail) : null, !o.usable ? h('div', { class: 'small danger' }, o.reason) : null], () => { sfx.select(); run({ type: 'eventChoice', idx: i }); }, { disabled: !o.usable, key: `ev${i}` }),
        o.spellHelper && o.check ? btn(tx('modals.orUsesAutomaticSuccess', { heroName: o.spellHelper.hero.name, means: SPELLS[o.spellHelper.spell]?.name ?? tx('modals.thievesTools') }), () => run({ type: 'eventChoice', idx: i, useSpell: true }), { cls: 'small', disabled: !o.usable }) : null);
    })),
    h('div', { class: 'row', style: 'margin-top:10px' }, h('span', { class: 'spacer' }), btn(tx('modals.decideLater'), () => run({ type: 'eventClose' }), { cls: 'small' })),
  ], { label: ev.title, onClose: () => run({ type: 'eventClose' }) });
}

export function bagModal(): HTMLElement {
  const exp = app.game!.expedition!;
  const f = exp.fortune;
  const close = () => { app.ui.modal = undefined; render(); };
  return modal([
    h('div', { class: 'row' }, h('h2', { class: 'grow' }, tx('modals.diceBagDice', { length: f.bag.filter((d) => !d.uid.startsWith('ghost')).length })), doubloons(f.doubloons)),
    bagView(f, () => {}),
    h('h3', { style: 'margin-top:12px' }, tx('modals.charmsOrderMattersTheyScore', { charmsLength: f.charms.length, charmSlots: charmSlots(f) })),
    h('div', { class: 'charm-bar' }, ...f.charms.map((c, i) => h('div', { class: 'col', style: 'align-items:center;gap:2px' }, charmEl(c.id, c.counter),
      h('div', { class: 'row', style: 'gap:2px' }, btn('◀', () => run({ type: 'moveCharm', from: i, to: i - 1 }), { cls: 'small', disabled: i === 0 }), btn('▶', () => run({ type: 'moveCharm', from: i, to: i + 1 }), { cls: 'small', disabled: i === f.charms.length - 1 }))))),
    h('h3', { style: 'margin-top:12px' }, tx('modals.handLevels')),
    h('table', { class: 'mini' }, h('tr', null, h('th', null, tx('modals.hand')), h('th', null, tx('modals.lv')), h('th', null, tx('modals.chips')), h('th', null, tx('modals.mult')), h('th', null, tx('modals.played'))),
      ...HANDS.map((x) => { const lv = omenLevels(f)[x.id] ?? 0; return h('tr', null, h('td', null, x.name), h('td', null, 1 + lv), h('td', { class: 'chipc' }, x.chips + lv * x.lvChips), h('td', { class: 'multc' }, `×${x.mult + lv * x.lvMult}`), h('td', { class: 'muted' }, f.handsPlayed[x.id] ?? 0)); })),
    h('p', { class: 'small muted' }, tx('modals.tokensBestHandThisRun', { v: f.tokens.length ? f.tokens.join(', ') : 'none', bestScore: fmt(f.bestScore) })),
    h('div', { class: 'row' }, h('span', { class: 'spacer' }), btn(tx('modals.close'), close, { key: 'close-bag' })),
  ], { label: tx('modals.diceBag'), onClose: close });
}

export function resultScreen(): HTMLElement {
  const g = app.game!;
  const r = g.lastResult!;
  const title = r.finale && r.kind === 'won' ? tx('modals.theDragonQueenFalls') : r.tutorial && r.kind === 'won' ? tx('modals.practiceComplete') : r.kind === 'won' ? tx('modals.theEchoIsBroken') : r.kind === 'retreated' ? tx('modals.aTacticalRetreat') : tx('modals.thePartyHasFallen');
  const chapter: Chapter | undefined = r.chapter === EPILOGUE.id ? EPILOGUE : r.chapter ? CHAPTERS[r.chapter as keyof typeof CHAPTERS] : undefined;
  return h('div', { class: 'title-screen', style: bgStyle(r.kind === 'won' ? `scenes/${r.biome}_boss` : firstArt(`story/${r.kind === 'retreated' ? 'retreat' : 'wipe'}`, 'town/keep'), '#0b1230') + ';background-size:cover;background-position:center' },
    h('div', { class: 'title-inner' },
      h('div', { class: 'win', style: 'width:min(640px,100%)' },
        h('h1', { class: `result-big ${r.kind === 'wiped' ? 'danger' : 'gold'}` }, title),
        h('p', { class: 'prose', style: 'text-align:center;margin:8px auto' }, tx('modals.fightsBestHand', { place: r.finale ? FINALE.name : r.tutorial ? text('game', ['themes', 'tutorial', 'name']) : BIOMES[r.biome].name, fights: r.fights, score: fmt(r.score) })),
        chapter ? h('div', { class: 'chronicle story-beat' }, banner(`story/${chapter.id}`, chapter.title), h('div', { class: 'chapter-head' }, chapter.head), h('h2', null, chapter.title), ...chapter.text.map((t) => h('p', { class: 'prose' }, t))) : null,
        r.quest?.head ? staticBox({ name: '???', color: HEAD_EYES[r.quest.head].color, face: art(HEAD_EYES[r.quest.head].key, tx('dialogue.anEye'), 'dlg-face'), variant: 'head' }, headLine(r.quest.head)) : null,
        r.quest?.found.length || r.quest?.notes.length ? h('div', { class: 'small gold', style: 'text-align:center;margin:6px 0' }, ...(r.quest.found.map((id) => h('div', null, tx('modals.evidence', { v: EVIDENCE[id]?.name ?? id })))), ...r.quest.notes.map((n) => h('div', null, n))) : null,
        r.tutorial && r.kind !== 'won' ? h('p', { class: 'prose', style: 'text-align:center' }, tx('modals.practiceMakesPerfectNobodyDied')) : null,
        h('table', { class: 'mini' },
          h('tr', null, h('th', null, tx('modals.goldBanked')), h('td', { class: 'gold' }, r.gold)),
          r.items.length ? h('tr', null, h('th', null, tx('modals.treasure')), h('td', null, r.items.join(', '))) : null,
          r.leveled.length ? h('tr', null, h('th', null, tx('modals.readyToLevelUp')), h('td', null, r.leveled.join(', '))) : null,
          r.fallen.length ? h('tr', null, h('th', null, tx('modals.fallen')), h('td', { class: 'danger' }, r.fallen.join(', '))) : null),
        r.charms.length ? h('div', { style: 'margin-top:10px' }, h('div', { class: 'small muted' }, tx('modals.thisRunSCharmsNow')), h('div', { class: 'charm-bar' }, ...r.charms.map((c) => charmEl(c)))) : null,
        h('div', { class: 'row', style: 'justify-content:center;margin-top:14px' },
          r.kind === 'won' && !r.tutorial ? btn(tx('modals.shareCard'), () => openShareCard(g), { key: 'result-share' }) : null,
          btn(tx('modals.returnToTheKeep'), () => { app.ui.townTab = r.leveled.length ? 'guild' : 'cartographer'; run({ type: 'ackResult' }); }, { cls: 'primary big', key: 'ack' })))));
}

export { art, dieFace, SKILL_ABILITY };

export function helpModal(): HTMLElement {
  const close = () => { app.ui.modal = undefined; render(); };
  const p = (t: string) => h('p', { class: 'prose', style: 'margin:6px 0' }, t);
  return modal([
    h('div', { class: 'row' }, h('h2', { class: 'grow' }, tx('modals.howToPlay')), languagePicker()),
    h('h3', null, tx('modals.theLoop')),
    p(tx('modals.pickThreeHeroesAndAn')),
    h('h3', null, tx('modals.theFortuneTray')),
    h('div', { class: 'row', style: 'gap:6px' }, dieFace(6, 'steel'), dieFace(6, 'steel'), dieFace(6, 'bone'), dieFace(3, 'sun'), dieFace(2, 'shadow')),
    p(tx('modals.eachFightDealsDiceFrom')),
    p(tx('modals.damageYourActionSReal')),
    h('h3', null, tx('modals.gettingLucky')),
    p(tx('modals.afterEveryFightYourFortune')),
    h('h3', null, tx('modals.watchOut')),
    p(tx('modals.enemiesHexYourTrayThey')),
    h('h3', null, tx('modals.theStory')),
    p(tx('modals.tiamatTheFiveHeadedDragon')),
    p(tx('modals.theLowLanternIsThe')),
    h('p', { class: 'small muted' }, tx('modals.keys19SelectDice')),
    h('div', { class: 'row' },
      app.game && !app.game.expedition && !app.game.tutorial ? btn(tx('modals.restartTheGuidedTour'), () => { restartTutorial(app.game!); app.ui.townTab = 'guild'; close(); }, { cls: 'small' }) : null,
      h('span', { class: 'spacer' }), btn(tx('modals.gotIt'), close, { cls: 'primary', key: 'help-ok' })),
  ], { label: tx('modals.howToPlay'), onClose: close });
}
