/** Dungeon exploration: room view, relative movement, minimap, party, fortune summary. */
import type { RelDir } from '../engine/types.ts';
import { h, btn } from './dom.ts';
import { app, run, render } from './app.ts';
import { bgStyle, firstArt } from './art.ts';
import { heroPortrait, hpBar, charmEl, doubloons, TOKEN_GLYPH, conds, itemIcon } from './widgets.ts';
import { showTip } from './tips.ts';
import { itemSummary } from './town.ts';
import type { ItemInstance } from '../engine/types.ts';
import { exitsView, mapView } from '../dungeon/explore.ts';
import { BIOMES } from '../content/biomes.ts';
import { DIRS, legacyRoomArt } from '../dungeon/generator.ts';
import { ITEMS, itemName } from '../content/items.ts';
import { castableSpells, SPELLS } from '../content/spells.ts';
import { derive } from '../rules/character.ts';
import { charmSlots } from '../fortune/tray.ts';
import { TOKENS } from '../fortune/boons.ts';
import { CLASSES } from '../content/classes.ts';
import { sfx } from './audio.ts';
import { roomName, roomText, themeText } from '../dungeon/roomText.ts';
import { tx, txn } from '../i18n/index.ts';

const ARROW: Record<string, string> = { N: '▲', E: '▶', S: '▼', W: '◀' };
const ROOM_ICON: Record<string, string> = { boss: '☠', key: '⚿', treasure: '$', peddler: '¤', shrine: '✶', event: '?', camp: '⌂', elite: '!', entrance: '⇧', mechanism: '⚙' };

export function move(dir: RelDir) {
  const r = run({ type: 'move', dir });
  if (r.ok) sfx.step();
}

export function fortuneStrip(): HTMLElement {
  const exp = app.game!.expedition!;
  const f = exp.fortune;
  const slots = charmSlots(f);
  return h('div', { class: 'felt', style: 'padding:10px 12px' },
    h('div', { class: 'row' },
      h('b', null, tx('explore.fortuneRank', { rank: f.rank })), doubloons(f.doubloons),
      h('span', { class: 'small', style: 'color:#b9e2cc' }, tx('explore.dice', { bagLength: f.bag.length })),
      ...f.tokens.map((t) => h('span', { class: 'token', title: `${TOKENS[t]?.name}: ${TOKENS[t]?.text}` }, TOKEN_GLYPH[t] ?? '¤')),
      h('span', { class: 'spacer' }),
      btn(tx('explore.diceBag'), () => { app.ui.modal = { kind: 'bag' }; render(); }, { cls: 'small' })),
    h('div', { class: 'charm-bar', style: 'margin-top:8px' },
      ...f.charms.map((c) => charmEl(c.id, c.counter)),
      ...Array.from({ length: Math.max(0, slots - f.charms.length) }, () => h('div', { class: 'charm empty', title: tx('explore.emptyCharmSlot') }))));
}

export function partyStrip(clickable = true): HTMLElement {
  const g = app.game!;
  const exp = g.expedition!;
  return h('div', { class: 'party-strip' }, ...exp.partyIds.map((id) => {
    const hero = g.roster.find((x) => x.id === id)!;
    const d = derive(hero);
    return h('div', { class: 'pmini', tabindex: 0, style: clickable ? 'cursor:pointer' : '', on: clickable ? { click: () => { app.ui.heroSheet = hero.id; render(); } } : undefined },
      heroPortrait(hero), h('div', { class: 'grow', style: 'min-width:0' }, h('div', { class: 'name' }, hero.name), hero.status === 'dead' ? h('span', { class: 'small danger' }, tx('explore.fallen')) : hpBar(hero.hp, d.maxHp), h('span', { class: 'hpnum' }, `${hero.hp}/${d.maxHp} · ${CLASSES[hero.classId].name} ${hero.level}`),
        exp.flags[`blessed:${hero.id}`] ? conds([{ id: 'blessed', rounds: -1 }], 'hero') : null));
  }));
}

function minimap(): HTMLElement {
  const exp = app.game!.expedition!;
  const cells = mapView(exp);
  return h('div', { class: 'minimap', style: `grid-template-columns:repeat(${exp.map.width},1fr);width:min(100%, ${exp.map.width * 26}px)`, role: 'img', 'aria-label': tx('explore.dungeonMap') },
    ...cells.map((c) => {
      if (!c.room || !c.seen) return h('div', { class: 'mm' });
      const doors = DIRS.filter((d) => c.room!.exits[d] && (!c.room!.exits[d]!.hidden || exp.searched.includes(`${c.room!.key}:${d}`)));
      const icon = c.here ? ARROW[exp.facing] : c.visited || c.room.type === 'boss' ? ROOM_ICON[c.room.type] ?? '' : '';
      return h('div', { class: `mm seen ${c.visited ? 'visited' : ''} ${c.here ? 'here' : ''}`, title: c.visited ? roomName(c.room) : tx('explore.unexplored') },
        ...doors.map((d) => h('span', { class: `door ${d.toLowerCase()} ${c.room!.exits[d]!.lock && !(c.room!.exits[d]!.lock === 'sigil' && exp.keys.includes('sigil')) ? 'lock' : ''}` })),
        icon ? h('i', { style: c.here ? 'color:#1b1203' : c.room.type === 'boss' ? 'color:#ff8a80' : '' }, icon) : null);
    }));
}

export function exploreScreen(): HTMLElement {
  const g = app.game!;
  const exp = g.expedition!;
  const room = exp.map.rooms[exp.pos];
  const biome = BIOMES[exp.biome];
  const exits = exitsView(g);
  const ex = (rel: RelDir) => exits.find((e) => e.rel === rel)!;
  const dirBtn = (rel: RelDir, label: string, kbd: string) => {
    const e = ex(rel);
    return btn([label, ' ', h('span', { class: 'kbd' }, kbd), h('small', null, e.state === 'wall' ? '—' : e.label)], () => move(rel), { cls: `${rel === 'forward' ? 'fwd' : rel} ${e.state === 'locked' ? 'locked' : ''}`, disabled: e.state === 'wall', key: `mv-${rel}`, title: e.state === 'locked' ? e.label : undefined });
  };
  const mirror = exp.biome === 'mirror' && room.tags.includes('mirror');
  const actions: HTMLElement[] = [];
  if (room.loot && !room.loot.taken && (!room.encounter || room.encounter.cleared)) actions.push(btn(tx('explore.openTheTreasure'), () => { sfx.coin(); run({ type: 'takeLoot' }); }, { cls: 'primary', key: 'loot' }));
  if (room.eventId && !room.eventDone) actions.push(btn(tx('explore.investigate'), () => run({ type: 'eventOpen' }), { cls: 'primary', key: 'investigate' }));
  if (room.type === 'peddler') actions.push(btn(tx('explore.browseThePeddler'), () => run({ type: 'shopOpen' }), { cls: 'primary', key: 'shop' }));
  if (room.type === 'camp') {
    actions.push(btn(tx('explore.shortRest'), () => run({ type: 'rest', kind: 'short' }), { disabled: !!exp.flags[`rested:${room.key}`] && !exp.carriedItems.some((i) => i.defId === 'campSupplies'), title: tx('explore.spendHitDiceRestoreShort') }));
    actions.push(btn(tx('explore.longRest'), () => { if (confirm(tx('explore.longRestFullyRestoreThe'))) run({ type: 'rest', kind: 'long' }); }, { disabled: exp.longRestUsed }));
  }
  actions.push(btn(tx('explore.search'), () => run({ type: 'search' }), { disabled: !!exp.flags[`searched:${room.key}`], title: tx('explore.perceptionHiddenDoorsLooseCoins') }));
  if (exp.pos === exp.map.start && !exp.bossDefeated) actions.push(btn(tx('explore.retreatToTheKeep'), () => { if (confirm(tx('explore.retreatYouKeepYourItems'))) run({ type: 'retreat' }); }, { cls: 'danger' }));
  if (exp.bossDefeated) actions.push(btn(tx('explore.returnToTheKeepIn'), () => { sfx.fanfare(); run({ type: 'exitDungeon' }); }, { cls: 'primary big', key: 'exit' }));

  return h('div', null,
    h('div', { class: 'topbar' },
      h('span', { class: 'title' }, biome.name),
      h('span', { class: 'stat', title: tx('explore.carriedGoldLostIfThe') }, h('span', { class: 'coin' }), h('b', { class: 'gold' }, exp.carriedGold), tx('explore.carried')),
      h('span', { class: 'stat' }, tx('explore.depth', { depth: exp.depth })),
      exp.keys.includes('sigil') ? h('span', { class: 'badge' }, tx('explore.bossSigil')) : null,
      h('span', { class: 'spacer' }),
      h('span', { class: 'small muted' }, tx('explore.seed', { seed: exp.seed })),
      btn(g.settings.fast ? tx('explore.fastOn') : tx('explore.fastOff'), () => { g.settings.fast = !g.settings.fast; render(); }, { cls: 'small' })),
    h('div', { class: 'explore' },
      h('div', { class: 'col' },
        h('div', { class: 'room-view', style: bgStyle(firstArt(room.art, legacyRoomArt(room.type, exp.biome)), `linear-gradient(160deg, ${biome.color}55, #0b1230)`) },
          exp.tutorial ? null : h('span', { class: 'meter-pill', title: biome.meter.text }, `${biome.meter.icon} ${biome.meter.name} ${exp.biome === 'drowned' ? tx(exp.meter ? 'explore.meterHigh' : 'explore.meterLow') : `${exp.meter}/${biome.meter.max}`}`),
          h('span', { class: 'compass', 'aria-label': tx('explore.facing', { facing: exp.facing }) }, ARROW[exp.facing], h('span', { class: 'small', style: 'position:absolute;bottom:2px' }, exp.facing)),
          h('h1', null, roomName(room)),
          h('p', { class: 'prose', style: 'margin:0' }, roomText(room)),
          mirror ? h('p', { class: 'small gold' }, tx('explore.thisRoomIsMirroredLeft')) : null,
          exp.biome === 'starfall' && exp.meter ? h('p', { class: 'small gold' }, txn('explore.gravityHasTurnedQuarterDirections', exp.meter)) : null),
        h('div', { class: 'row' }, ...actions),
        h('div', { class: 'win' }, h('h3', null, tx('explore.journal')), h('div', { class: 'log', role: 'log', 'aria-live': 'polite' }, h('div', { class: 'log-lines' }, ...exp.log.slice(-40).map((l) => h('div', { class: l.kind ?? '' }, l.t))))),
        partyStrip(),
        fortuneStrip()),
      h('div', { class: 'col' },
        h('div', { class: 'win' }, h('h3', null, tx('explore.facing2', { dir: tx(`explore.dir.${exp.facing}`) })),
          h('div', { class: 'dpad' }, dirBtn('forward', tx('explore.forward'), '↑'), dirBtn('left', tx('explore.left'), '←'), h('div', { class: 'mid' }, tx('explore.rooms', { visitedLength: exp.visited.length })), dirBtn('right', tx('explore.right'), '→'), dirBtn('back', tx('explore.back'), '↓'))),
        h('div', { class: 'win' }, h('h3', null, tx('explore.map')), minimap(), h('p', { class: 'small muted' }, tx(exp.keys.includes('sigil') ? 'explore.objectiveHasSigil' : 'explore.objectiveNoSigil', { objective: themeText(exp, 'objective')[0].toUpperCase() + themeText(exp, 'objective').slice(1) }))),
        suppliesWin()),
    ));
}

/** A carried item: tap for its details; usable consumables ask who should use them. */
function carriedChip(it: ItemInstance, usable: boolean): HTMLElement {
  const g = app.game!;
  const exp = g.expedition!;
  const def = ITEMS[it.defId];
  const open = () => {
    const c = def?.consumable;
    if (!usable || !c) { showTip({ title: itemName(it), text: itemSummary(it.defId, it) }); return; }
    const party = exp.partyIds.map((id) => g.roster.find((x) => x.id === id)!).filter(Boolean);
    const use = (heroId: string) => { const r = run({ type: 'useItem', uid: it.uid, heroId }); if (r.ok) sfx.heal(); };
    const drink = it.defId.startsWith('potion') || c.effect === 'elixir' || c.effect === 'cleanse';
    const question = c.effect === 'camp' ? tx('explore.makeCampNow') : c.effect === 'revive' ? tx('explore.whoShouldItBringBack') : drink ? tx('explore.whoDrinksItNow') : tx('explore.useItNowOnWhom');
    const targets = c.effect === 'camp' ? party.filter((p) => p.status === 'alive').slice(0, 1)
      : party.filter((p) => (c.effect === 'revive' ? p.status === 'dead' : p.status === 'alive'));
    showTip({
      title: itemName(it), text: `${itemSummary(it.defId, it)} ${question}`,
      actions: c.effect === 'camp'
        ? targets.map((p) => ({ label: tx('explore.makeCamp'), primary: true, run: () => use(p.id) }))
        : targets.map((p) => ({ label: `${p.name.split(' ')[0]} (${p.hp}/${derive(p).maxHp})`, primary: true, run: () => use(p.id) })),
    });
  };
  return h('button', { class: `carried-item ${usable ? 'usable' : ''}`, 'aria-label': itemName(it), on: { click: (e: Event) => { e.stopPropagation(); open(); } } },
    itemIcon(it.defId), h('span', null, itemName(it)));
}

function suppliesWin(): HTMLElement {
  const g = app.game!;
  const exp = g.expedition!;
  const party = exp.partyIds.map((id) => g.roster.find((x) => x.id === id)!);
  const usable = exp.carriedItems.filter((i) => ITEMS[i.defId]?.consumable?.explore);
  const casters = party.filter((p) => p.status === 'alive').flatMap((p) => castableSpells(p).filter((s) => s.explore && ['heal', 'partyHeal', 'revive', 'aid'].includes(s.explore)).map((s) => ({ p, s })));
  return h('div', { class: 'win' }, h('h3', null, tx('explore.suppliesSpells')),
    exp.carriedItems.length
      ? h('div', { class: 'carried' }, ...exp.carriedItems.map((it) => carriedChip(it, usable.includes(it))))
      : h('div', { class: 'small muted' }, tx('explore.nothingCarried')),
    usable.length ? h('div', { class: 'small muted', style: 'margin-top:4px' }, tx('explore.tapAnItemToSee')) : null,
    casters.length ? h('div', { class: 'col', style: 'margin-top:6px' }, ...casters.map(({ p, s }) => h('div', { class: 'row' },
      h('span', { class: 'small' }, `${p.name}: ${s.name}`),
      ...(s.target === 'allies' || s.explore === 'partyHeal' || s.explore === 'aid' ? [btn(tx('explore.cast'), () => run({ type: 'castExplore', heroId: p.id, spellId: s.id }), { cls: 'small' })]
        : party.filter((t) => (s.explore === 'revive' ? t.status === 'dead' : t.status === 'alive')).map((t) => btn(t.name, () => { const r = run({ type: 'castExplore', heroId: p.id, spellId: s.id, targetId: t.id }); if (r.ok) sfx.heal(); }, { cls: 'small' })))))) : null,
    h('p', { class: 'small muted' }, tx('explore.healBetweenFightsHereSlots', { v: SPELLS.cureWounds ? '' : '' })));
}
