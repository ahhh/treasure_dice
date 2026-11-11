/** The Lantern Keep hub. */
import type { BiomeId, EquipSlot, Hero, ItemInstance } from '../engine/types.ts';
import { h, btn, fmt } from './dom.ts';
import { app, run, render, setGame, toast, afterRender } from './app.ts';
import { bgStyle, art, banner } from './art.ts';
import { heroPortrait, heroLine, hpBar, itemIcon, charmEl } from './widgets.ts';
import { CLASSES } from '../content/classes.ts';
import { ITEMS, itemName, sellValue, AFFIXES } from '../content/items.ts';
import { BIOMES, BIOME_ORDER } from '../content/biomes.ts';
import { MONSTERS } from '../content/monsters.ts';
import { CHARMS } from '../fortune/charms.ts';
import { HANDS } from '../fortune/hands.ts';
import { derive } from '../rules/character.ts';
import {
  shopItems, rosterCap, recruitCost, FACILITIES, facilityCost, enchantCost, trainingCap, trainingCost, partySuggestion, canEquip,
} from '../meta/town.ts';
import { randomSeed } from '../engine/rng.ts';
import { DIFFICULTY_MOD, DIFFICULTY_ORDER, DIFFICULTY_INFO, difficultyOpen, sizeOpen } from '../rules/balance.ts';
import { tripcode } from '../meta/tripcode.ts';
import { exportSave } from '../persistence/save.ts';
import { download } from './title.ts';
import { saveGame } from '../persistence/save.ts';
import { sfx } from './audio.ts';
import { PROLOGUE, CHAPTERS, HEADS, FINALE, FINALE_LEVEL, EPILOGUE, finaleBlocked, finaleSealed, echoesUncleared, storyOf, doorName } from '../content/story.ts';
import { openShareCard } from './shareCard.ts';
import { tavernTab, tavernArt, tavernNews } from './tavern.ts';
import { autoDialogue, openDialogue, bark, staticBox } from './dialogue.ts';
import { dispatch } from '../app/commands.ts';
import { TUTORIAL_MAX_LEVEL } from '../dungeon/explore.ts';
import { persist } from './app.ts';
import { tavernOpen, heads, awakened, tiamatSlain, readyScripts, leadsFor, has, trainingClosed, questOf, trackDone, hymnColour, CHROMATIC } from '../meta/quest.ts';
import { ANNOTATIONS, dissent, EVIDENCE, LULLABY, TRACKS } from '../content/quest.ts';
import { KEEPER_BY_TAB, NPCS } from '../content/npcs.ts';
import { barkLine, eulogyLine, scriptTitle } from '../i18n/dialogue.ts';
import type { Where } from '../content/dialogue.ts';
import { tx } from '../i18n/index.ts';
import { term } from '../content/terms.ts';

/** The Keep's tabs: [id, label, art]. A function so labels follow the language. */
const allTabs = (): [string, string, string][] => ([
  ['cartographer', 'town/cartographer'], ['guild', 'town/guild'], ['tavern', 'town/tavern'], ['chronicle', 'town/door'], ['armory', 'town/armory'],
  ['apothecary', 'town/apothecary'], ['enchanter', 'town/enchanter'], ['training', 'town/training'], ['vault', 'town/vault'],
] as const).map(([id, art]) => [id, tx(`town.tab.${id}`), art]);

/**
 * The Cartographer (where every run starts) always leads the list. The Low Lantern
 * appears once the guided tour is over; once Tiamat wakes it moves up right below.
 */
function tabsFor(): [string, string, string][] {
  const g = app.game!;
  const tabs = allTabs().filter(([id]) => id !== 'tavern' || tavernOpen(g));
  const rank = (id: string) => (id === 'cartographer' ? 0 : id === 'tavern' && awakened(g) && !tiamatSlain(g) ? 1 : 2);
  return tabs.sort((a, b) => rank(a[0]) - rank(b[0]));
}

// ── keeper barks: one line on the first visit after each head wakes ─────────
let barkNow: { tab: string; who: string; text: string } | null = null;
function keeperBark(tab: string): HTMLElement | null {
  const g = app.game!;
  if (!tavernOpen(g)) return null;
  if (barkNow && barkNow.tab !== tab) barkNow = null;
  if (!barkNow) {
    let pending: { who: string; text: string; flag: string } | null = null;
    const fallen = g.roster.filter((x) => x.status === 'dead' && !has(g, `note:eulogy:${x.id}`));
    if (tab === 'guild' && fallen.length) {
      const x = fallen[0];
      pending = { who: 'maren', flag: `note:eulogy:${x.id}`, text: eulogyLine(x.name, x.history.clears, x.history.kills, x.history.deathCause) };
    } else {
      const who = KEEPER_BY_TAB[tab];
      const stage = tiamatSlain(g) ? 6 : heads(g);
      const line = who ? barkLine(who, stage) : undefined;
      if (who && line && !has(g, `bark:${who}:${stage}`)) pending = { who, flag: `bark:${who}:${stage}`, text: line };
    }
    if (!pending) return null;
    barkNow = { tab, who: pending.who, text: pending.text };
    const flag = pending.flag;
    afterRender.push(() => { dispatch(g, { type: 'questSeen', flag }); persist(); });
  }
  const b = barkNow;
  return bark(b.who, b.text, () => { barkNow = { ...b, tab: '' }; render(); });
}

/** Scenes a keeper has for you at this tab (auto ones open themselves). */
function keeperScenes(tab: string): HTMLElement | null {
  const g = app.game!;
  if (!tavernOpen(g)) return null;
  const where = tab as Where;
  autoDialogue(where);
  const list = readyScripts(g, where).filter((x) => !x.auto);
  if (!list.length) return null;
  return h('div', { class: 'win keeper-call' }, ...list.map((sc) => h('div', { class: 'row' },
    h('span', { class: 'grow' }, h('b', null, NPCS[sc.speaker]?.name ?? ''), ` — ${scriptTitle(sc.id)}`),
    btn(tx('town.talk'), () => openDialogue(sc.id), { cls: 'small primary', key: `scene-${sc.id}` }))));
}

export function topbar(): HTMLElement {
  const g = app.game!;
  const sig = Object.values(g.profile.sigils).reduce((a, b) => a + (b ?? 0), 0);
  return h('div', { class: 'topbar' },
    h('span', { class: 'title' }, awakened(g) && !tiamatSlain(g) ? tx('town.theLanternKeepUnderThe') : tx('town.theLanternKeep')),
    questOf(g).drink ? h('span', { class: 'stat', title: tx('town.aDrinkIsWaitingFor') }, '🍺') : null,
    h('span', { class: 'stat', title: tx('town.bankedGoldSafeFromWipes') }, h('span', { class: 'coin' }), h('b', { class: 'gold' }, fmt(g.profile.bankedGold)), tx('town.goldWord')),
    h('span', { class: 'stat', title: tx('town.bossSigilsUnlockFacilityUpgrades') }, h('b', null, sig), tx('town.sigilsWord')),
    h('span', { class: 'stat muted' }, tx('town.day', { townDay: g.profile.townDay })),
    h('span', { class: 'stat muted' }, g.mode === 'legacy' ? tx('town.legacyMode') : tx('town.storyMode')),
    h('span', { class: 'spacer' }),
    btn(tx('town.howToPlay'), () => { app.ui.modal = { kind: 'help' }; render(); }, { cls: 'small' }),
    btn(g.settings.fast ? tx('town.fastOn') : tx('town.fastOff'), () => { g.settings.fast = !g.settings.fast; render(); }, { cls: 'small' }),
    btn(g.settings.sound ? tx('town.soundOn') : tx('town.soundOff'), () => { g.settings.sound = !g.settings.sound; setGame(g); render(); }, { cls: 'small' }),
    btn(tx('town.saveQuit'), async () => { await saveGame(g); setGame(null); render(); }, { cls: 'small' }),
  );
}

export function townScreen(): HTMLElement {
  const g = app.game!;
  const tab = app.ui.townTab;
  const TABS = tabsFor();
  const t = TABS.find((x) => x[0] === tab) ?? TABS[0];
  const pending = g.roster.filter((x) => x.pendingLevel && x.status === 'alive').length;
  const news = tavernOpen(g) ? tavernNews() : 0;
  const bannerKey = t[0] === 'tavern' ? tavernArt() : t[0] === 'guild' && awakened(g) && !tiamatSlain(g) ? 'town/keep_awakened' : t[2];
  return h('div', null, topbar(),
    h('div', { class: 'town' },
      h('nav', { class: 'town-nav', 'aria-label': tx('town.keepFacilities') }, ...TABS.map(([id, name]) =>
        id === 'cartographer'
          ? btn([h('span', { class: 'adv-icon', 'aria-hidden': 'true' }, '🗺'), h('span', { class: 'adv-text' }, name, h('small', null, tx('town.startARun')))], () => { app.ui.townTab = id; render(); }, { cls: `adventure ${tab === id ? 'on' : ''}`, key: `tab-${id}`, title: tx('town.startARunTitle') })
          : btn([name, id === 'guild' && pending ? h('span', { class: 'badge red', style: 'margin-left:6px' }, tx('town.levelUp', { pending })) : null, id === 'tavern' && news ? h('span', { class: 'badge red', style: 'margin-left:6px' }, '!') : null], () => { app.ui.townTab = id; render(); }, { cls: tab === id ? 'on' : '', key: `tab-${id}` }))),
      h('main', null,
        h('div', { class: 'town-banner', style: bgStyle(bannerKey, 'linear-gradient(135deg,#26346a,#0b1230)') }, h('h1', null, t[1])),
        keeperBark(t[0]),
        t[0] !== 'tavern' ? keeperScenes(t[0]) : null,
        TAB_RENDER[t[0]]?.() ?? null)));
}

const TAB_RENDER: Record<string, () => HTMLElement> = {
  guild: guildTab, tavern: tavernTab, chronicle: chronicleTab, cartographer: cartTab, armory: () => shopTab('gear'), apothecary: () => shopTab('consumable'),
  enchanter: enchantTab, training: trainingTab, vault: vaultTab,
};

function heroCard(hero: Hero, opts: { onClick?: () => void; sel?: boolean; extra?: HTMLElement | null } = {}): HTMLElement {
  const d = derive(hero);
  return h('div', { class: `hero-card ${opts.sel ? 'sel' : ''} ${hero.status !== 'alive' ? 'dead' : ''}`, tabindex: 0, on: opts.onClick ? { click: opts.onClick, keydown: (e: Event) => { if ((e as KeyboardEvent).key === 'Enter') opts.onClick!(); } } : undefined, 'data-key': `hero-${hero.id}` },
    heroPortrait(hero),
    h('div', { class: 'grow col', style: 'gap:3px;min-width:0' },
      h('b', null, hero.name),
      h('span', { class: 'small muted' }, heroLine(hero)),
      hero.status === 'alive' ? hpBar(hero.hp, d.maxHp) : h('span', { class: 'small danger' }, hero.status === 'dead' ? tx('town.fallen', { v: hero.history.deathCause ?? '' }) : tx('town.retired')),
      h('span', { class: 'small muted' }, tx('town.acClearsKills', { ac: d.ac, clears: hero.history.clears, kills: hero.history.kills })),
      hero.pendingLevel ? h('span', { class: 'badge red' }, tx('town.levelUpReady')) : null,
      opts.extra ?? null),
    h('span', { class: 'lvl' }, tx('town.lv', { level: hero.level })));
}

function guildTab(): HTMLElement {
  const g = app.game!;
  const alive = g.roster.filter((x) => x.status === 'alive');
  const fallen = g.roster.filter((x) => x.status === 'dead');
  return h('div', { class: 'col' },
    h('div', { class: 'win', 'data-tut': 'roster' },
      h('h2', null, tx('town.roster', { aliveLength: alive.length, rosterCap: rosterCap(g) })),
      h('p', { class: 'small muted' }, tx('town.clickAHeroToSee')),
      h('div', { class: 'cards' }, ...alive.map((hero) => heroCard(hero, {
        onClick: () => { app.ui.heroSheet = hero.id; render(); },
        extra: hero.pendingLevel ? h('span', { 'data-tut': 'levelup' }, btn(tx('town.levelUp2'), () => { app.ui.levelUp = hero.id; render(); }, { cls: 'primary small' })) : null,
      })))),
    h('div', { class: 'win', 'data-tut': 'recruits' },
      h('div', { class: 'row' }, h('h2', { class: 'grow' }, tx('town.recruits')), btn(tx('town.newFaces25Gold'), () => run({ type: 'rerollRecruits' }), { cls: 'small' })),
      h('div', { class: 'cards' }, ...g.recruits.map((hero, i) => heroCard(hero, {
        onClick: () => { app.ui.heroSheet = `recruit:${i}`; render(); },
        extra: btn(recruitCost(hero, g) ? tx('town.hireGold', { recruitCost: recruitCost(hero, g) }) : tx('town.hireVolunteersFree'), () => { const r = run({ type: 'hire', idx: i }); if (r.ok) sfx.coin(); }, { cls: 'small primary', disabled: g.profile.bankedGold < recruitCost(hero, g) }),
      })))),
    fallen.length ? h('div', { class: 'win' }, h('h2', null, tx('town.theWallOfTheFallen')),
      h('div', { class: 'cards' }, ...fallen.map((hero) => heroCard(hero)))) : null,
  );
}

function cartTab(): HTMLElement {
  const g = app.game!;
  const ui = app.ui;
  if (!ui.party.length || ui.party.some((id) => !g.roster.find((x) => x.id === id && x.status === 'alive' && !x.pendingLevel))) ui.party = partySuggestion(g);
  if (!ui.seed) ui.seed = randomSeed();
  const alive = g.roster.filter((x) => x.status === 'alive');
  const toggle = (id: string) => {
    if (ui.party.includes(id)) ui.party = ui.party.filter((x) => x !== id);
    else if (ui.party.length < 3) ui.party = [...ui.party, id];
    render();
  };
  const finale = ui.biome === 'finale';
  const partyHeroes = ui.party.map((id) => g.roster.find((x) => x.id === id)!);
  const sealed = finaleSealed(g);
  const hasChampion = !sealed;
  if (finale && !hasChampion) ui.biome = 'cinder';
  const tutorialOn = !!g.tutorial;
  const levels = partyHeroes.map((x) => x.level);
  const spread = levels.length ? Math.max(...levels) - Math.min(...levels) : 0;
  const tooSeasoned = levels.some((l) => l >= TUTORIAL_MAX_LEVEL);
  // The cellar stays open after the tour (or a skipped one) while anyone is still green enough for it.
  const cellarOpen = tutorialOn || alive.some((x) => x.level < TUTORIAL_MAX_LEVEL);
  // Lengths and harder difficulties open per echo after its first clear.
  const echo = finale ? null : (ui.biome as BiomeId);
  const lockedTip = echo ? tx('town.clearEchoToUnlock', { name: BIOMES[echo].name }) : '';
  if (echo && !difficultyOpen(g, echo, ui.difficulty)) ui.difficulty = 'standard';
  if (echo && !sizeOpen(g, echo, ui.size)) ui.size = 'normal';
  return h('div', { class: 'col' },
    cellarOpen ? h('div', { class: 'win tutorial-call' },
      h('h2', null, tx('town.theTrainingCellar')),
      h('p', { class: 'prose' }, tx('town.aShortGentlePracticeDungeon')),
      tooSeasoned ? h('p', { class: 'small danger' }, tx('town.cellarTooExperienced', { level: TUTORIAL_MAX_LEVEL })) : null,
      btn(tx('town.enterTheTrainingCellar'), () => {
        const r = run({ type: 'startExpedition', partyIds: ui.party, biome: 'cinder', difficulty: 'explorer', seed: 'TUTORIAL', tutorial: true });
        if (r.ok) sfx.fanfare();
      }, { cls: 'primary big', disabled: ui.party.length !== 3 || tooSeasoned, key: 'start-tutorial' })) : null,
    h('div', { class: 'win', 'data-tut': 'party' },
      h('h2', null, tx('town.chooseYourThree')),
      spread >= 4 ? h('p', { class: 'small danger' }, tx('town.levelSpreadOfTheDungeon', { spread })) : null,
      h('div', { class: 'cards' }, ...alive.map((hero) => heroCard(hero, {
        sel: ui.party.includes(hero.id), onClick: () => (hero.pendingLevel ? toast(tx('town.finishTheirLevelUpIn')) : toggle(hero.id)),
      })))),
    h('div', { class: 'win' },
      h('h2', null, tx('town.chooseAnEcho')),
      h('div', { class: 'biome-pick', 'data-tut': 'biomes' }, ...BIOME_ORDER.map((b) => {
        const def = BIOMES[b];
        const open = g.profile.unlockedBiomes.includes(b);
        return h('button', { class: `biome-card ${ui.biome === b ? 'sel' : ''} ${open ? '' : 'locked'}`, style: bgStyle(`scenes/${b}_corridor`, `linear-gradient(135deg, ${def.color}, #0b1230)`), disabled: !open, on: { click: () => { ui.biome = b; render(); } } },
          h('b', null, def.name), h('span', { class: 'small' }, open ? def.tagline : tx('town.sealedClearThePreviousEcho')), open && g.profile.sigils[b] ? h('span', { class: 'small gold' }, tx('town.cleared', { sigils: g.profile.sigils[b] })) : null,
          ...(open ? leadsFor(g, b) : []).map((l) => h('span', { class: `lead-chip ${l.runsLeft !== undefined ? 'timed' : ''}`, title: l.def.brief }, `📜 ${l.def.title}${l.runsLeft !== undefined ? ` · ${l.runsLeft} left` : ''}`)));
      }), h('button', { class: `biome-card finale ${finale ? 'sel' : ''} ${hasChampion ? '' : 'locked'}`, style: bgStyle('monsters/starfall_tiamat', 'linear-gradient(135deg, #7a1f2b, #2b1550 55%, #0b1230)'), disabled: !hasChampion, 'data-key': 'biome-finale', title: sealed ?? FINALE.tagline, on: { click: () => { ui.biome = 'finale'; render(); } } },
        h('b', null, `👑 ${FINALE.name}`), h('span', { class: 'small' }, sealed ?? FINALE.tagline), storyOf(g).tiamat ? h('span', { class: 'small gold' }, tx('town.tiamatSlain', { tiamat: storyOf(g).tiamat })) : null)),
      finale
        ? h('div', null, h('p', { class: 'prose' }, FINALE.premise),
          h('p', { class: 'small muted' }, tx('town.finalStageALongStarfall')),
          trackDone(g, 'break') ? h('div', { class: 'row', style: 'margin:4px 0' },
            h('span', { class: 'small gold' }, tx('town.silencedHymnSpares')),
            ...CHROMATIC.map((c) => btn(c[0].toUpperCase() + c.slice(1), () => run({ type: 'setHymn', colour: c }), { cls: `small ${hymnColour(g, partyHeroes.filter(Boolean)) === c ? 'on' : ''}`, key: `hymn-${c}` }))) : null,
          ...(['shelter', 'break', 'unite'] as const).filter((t) => has(g, { shelter: 'muster:shelter.cellar', break: 'muster:break.precentor', unite: 'muster:unite.light' }[t]) && (t !== 'shelter' || (has(g, 'muster:shelter.hands') && has(g, 'muster:shelter.hearths'))) && (t !== 'break' || (has(g, 'muster:break.stores') && has(g, 'muster:break.due')))).map((t) => h('p', { class: 'small gold' }, `✦ ${TRACKS[t].boon}`)),
          finaleBlocked(partyHeroes, g) ? h('p', { class: 'small danger' }, finaleBlocked(partyHeroes, g)) : null)
        : h('div', null,
          h('p', { class: 'prose' }, BIOMES[ui.biome as BiomeId].premise),
          h('p', { class: 'small muted' }, `${BIOMES[ui.biome as BiomeId].meter.icon} ${BIOMES[ui.biome as BiomeId].meter.name}: ${BIOMES[ui.biome as BiomeId].meter.text}`)),
      h('div', { class: 'row' },
        h('span', null, tx('town.difficulty')),
        ...DIFFICULTY_ORDER.map((d) => {
          const open = !echo || difficultyOpen(g, echo, d);
          return btn([open ? null : '🔒 ', tx(`town.difficultyName.${d}`)], () => { ui.difficulty = d; render(); }, { cls: `small ${ui.difficulty === d ? 'on' : ''} ${d === 'deadly' ? 'deadly' : ''}`, title: open ? DIFFICULTY_INFO[d] : lockedTip, disabled: !open, key: `diff-${d}` });
        }),
      ),
      finale ? null : h('div', { class: 'row', style: 'margin-top:6px' },
        h('span', null, tx('town.length')),
        ...(['short', 'normal', 'long'] as const).map((s) => {
          const open = sizeOpen(g, echo!, s);
          return btn([open ? null : '🔒 ', tx(`town.size.${s}`)], () => { ui.size = s; render(); }, { cls: `small ${ui.size === s ? 'on' : ''}`, title: open ? undefined : lockedTip, disabled: !open, key: `size-${s}` });
        }),
      ),
      echo && !g.profile.sigils[echo] ? h('p', { class: 'small muted' }, lockedTip) : null,
      h('p', { class: `small ${DIFFICULTY_MOD[ui.difficulty].rank ? 'gold' : 'muted'}` }, tx('town.difficultyLine', { name: tx(`town.difficultyName.${ui.difficulty}`), info: DIFFICULTY_INFO[ui.difficulty] })),
      h('div', { class: 'row', style: 'margin-top:8px' },
        h('label', { for: 'seed' }, tx('town.seed')),
        h('input', { id: 'seed', value: ui.seed, style: 'background:#0b1230;color:inherit;border:1px solid #556;padding:6px;border-radius:4px;font:inherit;width:160px', on: { change: (e: Event) => { ui.seed = (e.target as HTMLInputElement).value.trim().toUpperCase() || randomSeed(); } } }),
        btn(tx('town.random'), () => { ui.seed = randomSeed(); render(); }, { cls: 'small' }),
        h('span', { class: 'spacer' }),
        btn(finale ? tx('town.openTheSixthDoor') : tx('town.openThe', { doorName: doorName(ui.biome as BiomeId) }), () => {
          const r = run(finale
            ? { type: 'startExpedition', partyIds: ui.party, biome: 'starfall', difficulty: ui.difficulty, seed: ui.seed, finale: true }
            : { type: 'startExpedition', partyIds: ui.party, biome: ui.biome as BiomeId, difficulty: ui.difficulty, seed: ui.seed, size: ui.size });
          if (r.ok) { ui.seed = ''; sfx.fanfare(); }
        }, { cls: 'primary big', disabled: ui.party.length !== 3 || (finale && !!finaleBlocked(partyHeroes, g)), key: 'start-exp' }),
      ),
      h('p', { class: 'small muted' }, tx('town.consumablesInTheVaultUp')),
    ),
  );
}

function chronicleTab(): HTMLElement {
  const g = app.game!;
  const notes = (id: string) => (awakened(g) ? ANNOTATIONS[id] ?? [] : []).map((t) => h('p', { class: 'prose annotation' }, `✒ ${t}`));
  const story = storyOf(g);
  const alive = g.roster.filter((x) => x.status === 'alive');
  const best = alive.reduce((m, x) => Math.max(m, x.level), 0);
  const para = (t: string) => h('p', { class: 'prose' }, t);
  return h('div', { class: 'col' },
    chronicleJumps(),
    h('div', { class: 'win chronicle', 'data-tut': 'story', id: 'chron-story' },
      banner(`story/${PROLOGUE.id}`, PROLOGUE.title), h('div', { class: 'chapter-head' }, PROLOGUE.head), h('h2', null, PROLOGUE.title), ...PROLOGUE.text.map(para), ...notes('prologue'),
      h('div', { class: 'heads' }, ...BIOME_ORDER.map((b) => {
        const broken = (g.profile.sigils[b] ?? 0) > 0;
        return h('div', { class: `head ${broken ? 'broken' : ''}`, style: `--hc:${HEADS[b].color}`, title: tx('town.feeds', { name: HEADS[b].name, breath: HEADS[b].breath, name2: BIOMES[b].name, broken: broken ? tx('town.brokenSuffix') : '' }) },
          h('span', { class: 'head-dot' }), h('span', { class: 'small' }, BIOMES[b].name.replace(/^The /, '')));
      }))),
    ...BIOME_ORDER.map((b) => {
      const c = CHAPTERS[b];
      const earned = (g.profile.sigils[b] ?? 0) > 0;
      return h('div', { class: `win chronicle ${earned ? '' : 'sealed'}` },
        h('div', { class: 'chapter-head' }, `${c.head} · ${BIOMES[b].name}`),
        earned ? [banner(`story/${c.id}`, c.title), h('h2', null, c.title), ...c.text.map(para), ...notes(b)] : h('p', { class: 'muted' }, tx('town.breakToReadThisChapter', { name: BIOMES[b].name })));
    }),
    has(g, 'warned') ? h('div', { class: 'win chronicle' }, h('div', { class: 'chapter-head' }, tx('town.aDissentEnteredBeforeThe')), h('p', { class: 'prose' }, tx('town.aKeeperOfThisHouse')), ...(awakened(g) ? [h('p', { class: 'prose annotation' }, `✒ ${dissent()}`)] : [])) : null,
    awakened(g) ? h('div', { class: 'win chronicle' }, banner('story/lullaby', tx('town.theWardensLullaby')), h('div', { class: 'chapter-head' }, tx('town.copiedFromTheInsideOf')), h('h2', null, tx('town.theWardensLullaby')), ...LULLABY.map((l) => h('p', { class: 'prose lullaby' }, l))) : null,
    h('div', { class: 'win chronicle finale-win' },
      h('div', { class: 'chapter-head' }, tx('town.theFinalStage')),
      banner(`story/${FINALE.id}`, FINALE.name),
      h('h2', null, `👑 ${FINALE.name}`),
      para(FINALE.premise),
      h('p', { class: finaleSealed(g) ? 'muted' : 'gold' }, !finaleSealed(g)
        ? tx('town.allFiveEchoesAreBroken')
        : tx('town.requiresAllFiveEchoesCleared', { v: 5 - echoesUncleared(g).length, FINALE_LEVEL, v2: best || '—' })),
      story.tiamat ? [banner(`story/${EPILOGUE.id}`, EPILOGUE.title), h('div', { class: 'chapter-head', style: 'margin-top:10px' }, EPILOGUE.head), h('h3', null, EPILOGUE.title), ...EPILOGUE.text.map(para), h('p', { class: 'gold' }, tx('town.tiamatSlain2', { tiamat: story.tiamat }))] : null),
    ...keepRecords(),
  );
}

/** Jump links at the top of the (long) Chronicle. */
function chronicleJumps(): HTMLElement {
  const g = app.game!;
  const go = (id: string) => () => document.getElementById(`chron-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const parts = ['story', 'records', ...(tavernOpen(g) ? ['journal'] : []), 'charms', 'bestiary', 'hands'];
  return h('div', { class: 'win row chronicle-jumps' }, ...parts.map((id) => btn(tx(`town.chronicleSection.${id}`), go(id), { cls: 'small', key: `chron-jump-${id}` })));
}

/** The Keep's record and everything it has found (formerly the Codex), with the share card. */
function keepRecords(): (HTMLElement | null)[] {
  const g = app.game!;
  const s = g.profile.stats;
  const code = tripcode(g);
  return [
    h('div', { class: 'win', id: 'chron-records' }, h('h2', null, tx('town.records')),
      h('table', { class: 'mini' }, ...[
        [tx('town.stat.expeditions'), s.expeditions], [tx('town.stat.clears'), s.clears], [tx('town.stat.retreats'), s.retreats], [tx('town.stat.wipes'), s.wipes], [tx('town.stat.deaths'), s.deaths], [tx('town.stat.bestScore'), fmt(s.bestScore)],
      ].map(([k, v]) => h('tr', null, h('th', null, String(k)), h('td', null, String(v)))))),
    h('div', { class: 'win' },
      h('h2', null, tx('town.shareYourLegends')),
      h('p', { class: 'small muted' }, tx('town.aCardWithYourThree')),
      h('div', { class: 'row' },
        h('span', { 'data-tut': 'share' }, btn(tx('town.makeAShareCard'), () => openShareCard(g), { cls: 'primary', key: 'share-card' })),
        h('span', { class: 'small muted' }, tx('town.tripcode')),
        h('code', { class: 'tripcode', 'data-key': 'tripcode' }, code),
        btn(tx('town.copy'), () => { void navigator.clipboard?.writeText(code).then(() => toast(tx('town.copied'))); }, { cls: 'small', key: 'tripcode-copy' })),
      h('p', { class: 'small muted' }, tx('town.tripcodeHint'))),
    ...codexWins(),
  ];
}


function codexWins(): (HTMLElement | null)[] {
  const g = app.game!;
  return [
    tavernOpen(g) ? h('div', { class: 'win', id: 'chron-journal' }, h('h2', null, tx('town.journalTheQueenSDue', { length: Object.values(EVIDENCE).filter((e) => has(g, `ev:${e.id}`)).length, length2: Object.keys(EVIDENCE).length })),
      h('div', { class: 'list' }, ...Object.values(EVIDENCE).map((e) => has(g, `ev:${e.id}`)
        ? h('div', { class: 'item-row' }, h('div', { class: 'icon', style: 'width:56px;height:56px' }, art(e.art, e.name)), h('div', { class: 'grow' }, h('b', null, e.name), h('div', { class: 'small prose' }, e.text), awakened(g) && e.after ? h('div', { class: 'small annotation' }, `✒ ${e.after}`) : null))
        : h('div', { class: 'item-row muted' }, h('div', { class: 'icon', style: 'width:56px;height:56px' }), h('span', null, '???'))))) : null,
    h('div', { class: 'win', id: 'chron-charms' }, h('h2', null, tx('town.charmsFound', { charmsLength: g.profile.codex.charms.length, CHARMSLength: CHARMS.length })),
      h('div', { class: 'charm-bar' }, ...CHARMS.map((c) => g.profile.codex.charms.includes(c.id) ? charmEl(c.id) : h('div', { class: 'charm empty', title: tx('town.undiscovered') })))),
    h('div', { class: 'win', id: 'chron-bestiary' }, h('h2', null, tx('town.bestiary', { monstersLength: g.profile.codex.monsters.length })),
      h('div', { class: 'cards' }, ...g.profile.codex.monsters.map((id) => MONSTERS[id]).filter(Boolean).map((m) => h('div', { class: 'item-row' },
        h('div', { class: 'icon', style: 'width:56px;height:56px' }, art(`monsters/${m.biome}_${m.id}`, m.name)), h('div', null, h('b', null, m.name), h('div', { class: 'small muted' }, m.flavor)))))),
    h('div', { class: 'win', id: 'chron-hands' }, h('h2', null, tx('town.hands')),
      h('table', { class: 'mini' }, h('tr', null, h('th', null, tx('town.hand')), h('th', null, tx('town.chips')), h('th', null, tx('town.mult')), h('th', null, tx('town.perOmen'))),
        ...HANDS.map((x) => h('tr', null, h('td', null, x.name, g.profile.codex.hands.includes(x.id) ? '' : ' ?'), h('td', { class: 'chipc' }, x.chips), h('td', { class: 'multc' }, `×${x.mult}`), h('td', { class: 'small muted' }, `+${x.lvChips} / +${x.lvMult}`))))),
  ];
}

function shopTab(kind: 'gear' | 'consumable'): HTMLElement {
  const g = app.game!;
  const ids = shopItems(g).filter((id) => (kind === 'consumable' ? ITEMS[id].kind === 'consumable' : ITEMS[id].kind !== 'consumable'));
  const groups: Record<string, string[]> = {};
  for (const id of ids) (groups[ITEMS[id].kind] ??= []).push(id);
  const level = g.profile.facility[kind === 'gear' ? 'armory' : 'apothecary'];
  return h('div', { class: 'col' },
    h('div', { class: 'win' }, h('div', { class: 'row' }, h('h2', { class: 'grow' }, kind === 'gear' ? tx('town.armoryStock') : tx('town.apothecaryStock')), h('span', { class: 'small muted' }, tx('town.facilityLevel', { level }))),
      ...Object.entries(groups).map(([k, list]) => h('div', null, h('h3', null, term('itemKinds', k)),
        h('div', { class: 'list' }, ...list.sort((a, b) => ITEMS[a].price - ITEMS[b].price).map((id) => {
          const d = ITEMS[id];
          return h('div', { class: 'item-row' }, itemIcon(id), h('div', { class: 'grow' }, h('b', null, d.name), h('div', { class: 'small muted' }, itemSummary(id))),
            h('span', { class: 'gold' }, tx('town.priceG', { price: d.price })), btn(tx('town.buy'), () => { if (run({ type: 'buy', defId: id }).ok) sfx.coin(); }, { cls: 'small', disabled: g.profile.bankedGold < d.price }));
        }))))),
  );
}

export function itemSummary(defId: string, inst?: ItemInstance): string {
  const d = ITEMS[defId];
  if (!d) return '';
  const bits: string[] = [];
  if (d.legend) bits.push(tx('town.legendary'));
  if (d.weapon) bits.push(`${d.weapon.dice}${d.weapon.versatile ? ` (${d.weapon.versatile})` : ''} ${term('damageTypes', d.weapon.type)}`, d.weapon.props.map((p) => term('weaponProps', p)).join(', '), tx('town.mastery', { mastery: term('masteries', d.weapon.mastery) }), term('weaponClass', d.weapon.martial ? 'martial' : 'simple'));
  if (d.armor) bits.push(tx('town.ac', { base: d.armor.base, dex: d.armor.type === 'heavy' ? '' : tx(d.armor.dexCap !== undefined ? 'town.plusDexMax2' : 'town.plusDex') }), term('armorTypes', d.armor.type), d.armor.str ? tx('town.str', { str: d.armor.str }) : '');
  if (d.shield) bits.push(tx('town.n2Ac'));
  if (d.text) bits.push(d.text);
  if (inst) for (const a of inst.affixes) bits.push(AFFIXES[a]?.text ?? a);
  if (d.legend) bits.push(`“${d.legend.lore}”`);
  return bits.filter(Boolean).join(' · ');
}

function vaultTab(): HTMLElement {
  const g = app.game!;
  return h('div', { class: 'col' },
    h('div', { class: 'win' },
      h('h2', null, tx('town.vaultItems', { vaultLength: g.vault.length })),
      h('p', { class: 'small muted' }, tx('town.equipGearFromAHero')),
      g.vault.length === 0 ? h('p', { class: 'muted' }, tx('town.emptyTreasureCarriedHomeFrom')) : null,
      h('div', { class: 'list' }, ...g.vault.map((it) => h('div', { class: 'item-row' }, itemIcon(it.defId),
        h('div', { class: 'grow' }, h('b', null, itemName(it)), h('div', { class: 'small muted' }, itemSummary(it.defId, it))),
        btn(tx('town.sellG', { sellValue: sellValue({ ...it, qty: 1 }) }), () => { if (run({ type: 'sell', uid: it.uid }).ok) sfx.coin(); }, { cls: 'small' }))))),
    h('div', { class: 'win' }, h('h2', null, tx('town.backups')),
      h('p', { class: 'small muted' }, tx('town.browserStorageCanBeCleared')),
      btn(tx('town.exportSaveFile'), () => download(`treasure-dice-slot${g.slot}.json`, exportSave(g)))),
  );
}

function enchantTab(): HTMLElement {
  const g = app.game!;
  const cap = Math.min(3, g.profile.facility.enchanter);
  const gear: { it: ItemInstance; owner?: string }[] = [
    ...g.vault.map((it) => ({ it })),
    ...g.roster.filter((x) => x.status === 'alive').flatMap((x) => Object.values(x.equipment).filter(Boolean).map((it) => ({ it: it!, owner: x.name }))),
  ].filter(({ it }) => ['weapon', 'armor', 'shield'].includes(ITEMS[it.defId]?.kind));
  return h('div', { class: 'col' },
    facilityWin(),
    h('div', { class: 'win' }, h('h2', null, tx('town.enchantUpTo', { cap })),
      h('div', { class: 'list' }, ...gear.map(({ it, owner }) => h('div', { class: 'item-row' }, itemIcon(it.defId),
        h('div', { class: 'grow' }, h('b', null, itemName(it)), h('div', { class: 'small muted' }, owner ? tx('town.equippedBy', { owner }) : tx('town.inTheVault'))),
        it.plus >= cap ? h('span', { class: 'small muted' }, tx('town.atCap')) : btn(tx('town.forG', { v: it.plus + 1, enchantCost: enchantCost(it) }), () => { if (run({ type: 'enchant', uid: it.uid }).ok) sfx.coin(); }, { cls: 'small', disabled: g.profile.bankedGold < enchantCost(it) }))))),
  );
}

function facilityWin(): HTMLElement {
  const g = app.game!;
  const sig = Object.values(g.profile.sigils).reduce((a, b) => a + (b ?? 0), 0);
  return h('div', { class: 'win' }, h('h2', null, tx('town.keepUpgrades')),
    h('div', { class: 'list' }, ...Object.entries(FACILITIES).map(([id, f]) => {
      const lvl = g.profile.facility[id];
      const cost = facilityCost(id, lvl);
      return h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('b', null, tx('town.level', { fName: f.name, lvl })), h('div', { class: 'small muted' }, f.text)),
        lvl >= f.max ? h('span', { class: 'small muted' }, tx('town.maxed')) : btn(tx('town.upgradeG', { gold: cost.gold, sigils: cost.sigils ? tx('town.upgradeSigils', { sigils: cost.sigils }) : '' }), () => { if (run({ type: 'upgrade', id }).ok) sfx.fanfare(); }, { cls: 'small', disabled: g.profile.bankedGold < cost.gold || sig < cost.sigils }));
    })));
}

function trainingTab(): HTMLElement {
  const g = app.game!;
  const cap = trainingCap(g);
  const alive = g.roster.filter((x) => x.status === 'alive');
  return h('div', { class: 'col' },
    trainingClosed(g) ? h('div', { class: 'win' }, h('p', { class: 'danger' }, tx('town.theTrainingGroundsAreClosed'))) : null,
    h('div', { class: 'win' }, h('h2', null, tx('town.reserveTraining')),
      h('p', { class: 'prose' }, tx('town.payToRaiseABenched', { cap })),
      h('div', { class: 'cards' }, ...alive.map((hero) => heroCard(hero, {
        extra: hero.level < cap && !hero.pendingLevel ? btn(tx('town.trainG', { trainingCost: trainingCost(g, hero) }), () => { if (run({ type: 'train', heroId: hero.id }).ok) { app.ui.levelUp = hero.id; render(); } }, { cls: 'small primary', disabled: g.profile.bankedGold < trainingCost(g, hero) }) : null,
      })))),
    facilityWin(),
  );
}

// ── hero sheet (also used in dungeons, read-only) ──────────────────────────

export const SLOT_NAMES: Record<EquipSlot, string> = { get mainHand() { return tx('town.mainHand'); }, get offHand() { return tx('town.offHand'); }, get armor() { return tx('town.armor'); }, get trinket1() { return tx('town.trinket'); }, get trinket2() { return tx('town.trinket'); } };

export { CLASSES, heroCard };
