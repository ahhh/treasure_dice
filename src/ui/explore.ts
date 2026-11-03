/** Dungeon exploration: room view, relative movement, minimap, party, fortune summary. */
import type { RelDir } from '../engine/types.ts';
import { h, btn } from './dom.ts';
import { app, run, render } from './app.ts';
import { bgStyle, firstArt } from './art.ts';
import { heroPortrait, hpBar, charmEl, doubloons, TOKEN_GLYPH, conds } from './widgets.ts';
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
      h('b', null, `Fortune Rank ${f.rank}`), doubloons(f.doubloons),
      h('span', { class: 'small', style: 'color:#b9e2cc' }, `${f.bag.length} dice`),
      ...f.tokens.map((t) => h('span', { class: 'token', title: `${TOKENS[t]?.name}: ${TOKENS[t]?.text}` }, TOKEN_GLYPH[t] ?? '¤')),
      h('span', { class: 'spacer' }),
      btn('Dice bag', () => { app.ui.modal = { kind: 'bag' }; render(); }, { cls: 'small' })),
    h('div', { class: 'charm-bar', style: 'margin-top:8px' },
      ...f.charms.map((c) => charmEl(c.id, c.counter)),
      ...Array.from({ length: Math.max(0, slots - f.charms.length) }, () => h('div', { class: 'charm empty', title: 'Empty charm slot' }))));
}

export function partyStrip(clickable = true): HTMLElement {
  const g = app.game!;
  const exp = g.expedition!;
  return h('div', { class: 'party-strip' }, ...exp.partyIds.map((id) => {
    const hero = g.roster.find((x) => x.id === id)!;
    const d = derive(hero);
    return h('div', { class: 'pmini', tabindex: 0, style: clickable ? 'cursor:pointer' : '', on: clickable ? { click: () => { app.ui.heroSheet = hero.id; render(); } } : undefined },
      heroPortrait(hero), h('div', { class: 'grow', style: 'min-width:0' }, h('div', { class: 'name' }, hero.name), hero.status === 'dead' ? h('span', { class: 'small danger' }, 'Fallen') : hpBar(hero.hp, d.maxHp), h('span', { class: 'hpnum' }, `${hero.hp}/${d.maxHp} · ${CLASSES[hero.classId].name} ${hero.level}`),
        exp.flags[`blessed:${hero.id}`] ? conds([{ id: 'blessed', rounds: -1 }], 'hero') : null));
  }));
}

function minimap(): HTMLElement {
  const exp = app.game!.expedition!;
  const cells = mapView(exp);
  return h('div', { class: 'minimap', style: `grid-template-columns:repeat(${exp.map.width},1fr);width:min(100%, ${exp.map.width * 26}px)`, role: 'img', 'aria-label': 'Dungeon map' },
    ...cells.map((c) => {
      if (!c.room || !c.seen) return h('div', { class: 'mm' });
      const doors = DIRS.filter((d) => c.room!.exits[d] && (!c.room!.exits[d]!.hidden || exp.searched.includes(`${c.room!.key}:${d}`)));
      const icon = c.here ? ARROW[exp.facing] : c.visited || c.room.type === 'boss' ? ROOM_ICON[c.room.type] ?? '' : '';
      return h('div', { class: `mm seen ${c.visited ? 'visited' : ''} ${c.here ? 'here' : ''}`, title: c.visited ? c.room.name : 'Unexplored' },
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
  if (room.loot && !room.loot.taken && (!room.encounter || room.encounter.cleared)) actions.push(btn('Open the treasure', () => { sfx.coin(); run({ type: 'takeLoot' }); }, { cls: 'primary', key: 'loot' }));
  if (room.eventId && !room.eventDone) actions.push(btn('Investigate', () => run({ type: 'eventOpen' }), { cls: 'primary', key: 'investigate' }));
  if (room.type === 'peddler') actions.push(btn('Browse the Peddler', () => run({ type: 'shopOpen' }), { cls: 'primary', key: 'shop' }));
  if (room.type === 'camp') {
    actions.push(btn('Short rest', () => run({ type: 'rest', kind: 'short' }), { disabled: !!exp.flags[`rested:${room.key}`] && !exp.carriedItems.some((i) => i.defId === 'campSupplies'), title: 'Spend hit dice, restore short-rest powers. Once per camp.' }));
    actions.push(btn('Long rest', () => { if (confirm('Long rest: fully restore the party, but the dungeon hardens (+1 depth). Only once per expedition.')) run({ type: 'rest', kind: 'long' }); }, { disabled: exp.longRestUsed }));
  }
  actions.push(btn('Search', () => run({ type: 'search' }), { disabled: !!exp.flags[`searched:${room.key}`], title: 'Perception: hidden doors, loose coins.' }));
  if (exp.pos === exp.map.start && !exp.bossDefeated) actions.push(btn('Retreat to the Keep', () => { if (confirm('Retreat? You keep your items and half the carried gold. No level-ups.')) run({ type: 'retreat' }); }, { cls: 'danger' }));
  if (exp.bossDefeated) actions.push(btn('Return to the Keep in triumph', () => { sfx.fanfare(); run({ type: 'exitDungeon' }); }, { cls: 'primary big', key: 'exit' }));

  return h('div', null,
    h('div', { class: 'topbar' },
      h('span', { class: 'title' }, biome.name),
      h('span', { class: 'stat', title: 'Carried gold — lost if the party falls' }, h('span', { class: 'coin' }), h('b', { class: 'gold' }, exp.carriedGold), 'carried'),
      h('span', { class: 'stat' }, `Depth ${exp.depth}`),
      exp.keys.includes('sigil') ? h('span', { class: 'badge' }, '⚿ Boss Sigil') : null,
      h('span', { class: 'spacer' }),
      h('span', { class: 'small muted' }, `Seed ${exp.seed}`),
      btn(g.settings.fast ? 'Fast: on' : 'Fast: off', () => { g.settings.fast = !g.settings.fast; render(); }, { cls: 'small' })),
    h('div', { class: 'explore' },
      h('div', { class: 'col' },
        h('div', { class: 'room-view', style: bgStyle(firstArt(room.art, legacyRoomArt(room.type, exp.biome)), `linear-gradient(160deg, ${biome.color}55, #0b1230)`) },
          h('span', { class: 'meter-pill', title: biome.meter.text }, `${biome.meter.icon} ${biome.meter.name} ${exp.biome === 'drowned' ? (exp.meter ? 'high' : 'low') : `${exp.meter}/${biome.meter.max}`}`),
          h('span', { class: 'compass', 'aria-label': `Facing ${exp.facing}` }, ARROW[exp.facing], h('span', { class: 'small', style: 'position:absolute;bottom:2px' }, exp.facing)),
          h('h1', null, room.name),
          h('p', { class: 'prose', style: 'margin:0' }, room.text),
          mirror ? h('p', { class: 'small gold' }, '🪞 This room is mirrored: Left and Right are swapped.') : null,
          exp.biome === 'starfall' && exp.meter ? h('p', { class: 'small gold' }, `🌌 Gravity has turned ${exp.meter} quarter${exp.meter > 1 ? 's' : ''} — directions are rotated.`) : null),
        h('div', { class: 'row' }, ...actions),
        h('div', { class: 'win' }, h('h3', null, 'Journal'), h('div', { class: 'log', role: 'log', 'aria-live': 'polite' }, ...exp.log.slice(-40).map((l) => h('div', { class: l.kind ?? '' }, l.t)))),
        partyStrip(),
        fortuneStrip()),
      h('div', { class: 'col' },
        h('div', { class: 'win' }, h('h3', null, `Facing ${({ N: 'north', E: 'east', S: 'south', W: 'west' })[exp.facing]}`),
          h('div', { class: 'dpad' }, dirBtn('forward', 'Forward', '↑'), dirBtn('left', 'Left', '←'), h('div', { class: 'mid' }, `${exp.visited.length} rooms`), dirBtn('right', 'Right', '→'), dirBtn('back', 'Back', '↓'))),
        h('div', { class: 'win' }, h('h3', null, 'Map'), minimap(), h('p', { class: 'small muted' }, exp.theme.objective[0].toUpperCase() + exp.theme.objective.slice(1) + `. ${exp.keys.includes('sigil') ? 'You hold the sigil — find the boss.' : 'Find the Boss Sigil to open the final door.'}`)),
        suppliesWin()),
    ));
}

function suppliesWin(): HTMLElement {
  const g = app.game!;
  const exp = g.expedition!;
  const party = exp.partyIds.map((id) => g.roster.find((x) => x.id === id)!);
  const usable = exp.carriedItems.filter((i) => ITEMS[i.defId]?.consumable?.explore);
  const casters = party.filter((p) => p.status === 'alive').flatMap((p) => castableSpells(p).filter((s) => s.explore && ['heal', 'partyHeal', 'revive', 'aid'].includes(s.explore)).map((s) => ({ p, s })));
  const [selItem, setItem] = [app.ui.modal?.kind === 'useItem' ? (app.ui.modal.data as string) : '', (v: string) => { app.ui.modal = v ? { kind: 'useItem', data: v } : undefined; render(); }];
  return h('div', { class: 'win' }, h('h3', null, 'Supplies & spells'),
    exp.carriedItems.length ? h('div', { class: 'small muted' }, exp.carriedItems.map(itemName).join(', ')) : h('div', { class: 'small muted' }, 'Nothing carried.'),
    usable.length ? h('div', { class: 'col', style: 'margin-top:6px' }, ...usable.map((it) => h('div', { class: 'row' },
      btn(`Use ${itemName(it)}`, () => setItem(selItem === it.uid ? '' : it.uid), { cls: `small ${selItem === it.uid ? 'on' : ''}` }),
      selItem === it.uid ? party.map((p) => btn(p.name, () => { const r = run({ type: 'useItem', uid: it.uid, heroId: p.id }); if (r.ok) { sfx.heal(); setItem(''); } }, { cls: 'small' })) : null))) : null,
    casters.length ? h('div', { class: 'col', style: 'margin-top:6px' }, ...casters.map(({ p, s }) => h('div', { class: 'row' },
      h('span', { class: 'small' }, `${p.name}: ${s.name}`),
      ...(s.target === 'allies' || s.explore === 'partyHeal' || s.explore === 'aid' ? [btn('Cast', () => run({ type: 'castExplore', heroId: p.id, spellId: s.id }), { cls: 'small' })]
        : party.filter((t) => (s.explore === 'revive' ? t.status === 'dead' : t.status === 'alive')).map((t) => btn(t.name, () => { const r = run({ type: 'castExplore', heroId: p.id, spellId: s.id, targetId: t.id }); if (r.ok) sfx.heal(); }, { cls: 'small' })))))) : null,
    h('p', { class: 'small muted' }, `${SPELLS.cureWounds ? '' : ''}Heal between fights here; slots only return at camps.`));
}
