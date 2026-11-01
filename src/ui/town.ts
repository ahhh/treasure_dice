/** The Lantern Keep hub. */
import type { BiomeId, EquipSlot, Hero, ItemInstance } from '../engine/types.ts';
import { h, btn, fmt } from './dom.ts';
import { app, run, render, setGame, toast } from './app.ts';
import { bgStyle, art } from './art.ts';
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
import { exportSave } from '../persistence/save.ts';
import { download } from './title.ts';
import { saveGame } from '../persistence/save.ts';
import { sfx } from './audio.ts';

const TABS: [string, string, string][] = [
  ['guild', 'Guild Hall', 'town/guild'],
  ['cartographer', 'Cartographer', 'town/cartographer'],
  ['armory', 'Armory', 'town/armory'],
  ['apothecary', 'Apothecary', 'town/apothecary'],
  ['enchanter', 'Enchanter', 'town/enchanter'],
  ['training', 'Training Grounds', 'town/training'],
  ['vault', 'Vault', 'town/vault'],
  ['codex', 'Codex', 'town/keep'],
];

export function topbar(): HTMLElement {
  const g = app.game!;
  const sig = Object.values(g.profile.sigils).reduce((a, b) => a + (b ?? 0), 0);
  return h('div', { class: 'topbar' },
    h('span', { class: 'title' }, 'The Lantern Keep'),
    h('span', { class: 'stat', title: 'Banked gold — safe from wipes' }, h('span', { class: 'coin' }), h('b', { class: 'gold' }, fmt(g.profile.bankedGold)), 'gold'),
    h('span', { class: 'stat', title: 'Boss sigils unlock facility upgrades' }, h('b', null, sig), 'sigils'),
    h('span', { class: 'stat muted' }, `Day ${g.profile.townDay}`),
    h('span', { class: 'stat muted' }, g.mode === 'legacy' ? 'Legacy mode' : 'Story mode'),
    h('span', { class: 'spacer' }),
    btn('How to play', () => { app.ui.modal = { kind: 'help' }; render(); }, { cls: 'small' }),
    btn(g.settings.fast ? 'Fast: on' : 'Fast: off', () => { g.settings.fast = !g.settings.fast; render(); }, { cls: 'small' }),
    btn(g.settings.sound ? 'Sound: on' : 'Sound: off', () => { g.settings.sound = !g.settings.sound; setGame(g); render(); }, { cls: 'small' }),
    btn('Save & quit', async () => { await saveGame(g); setGame(null); render(); }, { cls: 'small' }),
  );
}

export function townScreen(): HTMLElement {
  const g = app.game!;
  const tab = app.ui.townTab;
  const t = TABS.find((x) => x[0] === tab) ?? TABS[0];
  const pending = g.roster.filter((x) => x.pendingLevel && x.status === 'alive').length;
  return h('div', null, topbar(),
    h('div', { class: 'town' },
      h('nav', { class: 'town-nav', 'aria-label': 'Keep facilities' }, ...TABS.map(([id, name]) =>
        btn([name, id === 'guild' && pending ? h('span', { class: 'badge red', style: 'margin-left:6px' }, `${pending} level-up`) : null], () => { app.ui.townTab = id; render(); }, { cls: tab === id ? 'on' : '', key: `tab-${id}` }))),
      h('main', null,
        h('div', { class: 'town-banner', style: bgStyle(t[2], 'linear-gradient(135deg,#26346a,#0b1230)') }, h('h1', null, t[1])),
        TAB_RENDER[tab]?.() ?? null)));
}

const TAB_RENDER: Record<string, () => HTMLElement> = {
  guild: guildTab, cartographer: cartTab, armory: () => shopTab('gear'), apothecary: () => shopTab('consumable'),
  enchanter: enchantTab, training: trainingTab, vault: vaultTab, codex: codexTab,
};

function heroCard(hero: Hero, opts: { onClick?: () => void; sel?: boolean; extra?: HTMLElement | null } = {}): HTMLElement {
  const d = derive(hero);
  return h('div', { class: `hero-card ${opts.sel ? 'sel' : ''} ${hero.status !== 'alive' ? 'dead' : ''}`, tabindex: 0, on: opts.onClick ? { click: opts.onClick, keydown: (e: Event) => { if ((e as KeyboardEvent).key === 'Enter') opts.onClick!(); } } : undefined, 'data-key': `hero-${hero.id}` },
    heroPortrait(hero),
    h('div', { class: 'grow col', style: 'gap:3px;min-width:0' },
      h('b', null, hero.name),
      h('span', { class: 'small muted' }, heroLine(hero)),
      hero.status === 'alive' ? hpBar(hero.hp, d.maxHp) : h('span', { class: 'small danger' }, hero.status === 'dead' ? `Fallen — ${hero.history.deathCause ?? ''}` : 'Retired'),
      h('span', { class: 'small muted' }, `AC ${d.ac} · ${hero.history.clears} clears · ${hero.history.kills} kills`),
      hero.pendingLevel ? h('span', { class: 'badge red' }, 'Level up ready') : null,
      opts.extra ?? null),
    h('span', { class: 'lvl' }, `Lv ${hero.level}`));
}

function guildTab(): HTMLElement {
  const g = app.game!;
  const alive = g.roster.filter((x) => x.status === 'alive');
  const fallen = g.roster.filter((x) => x.status === 'dead');
  return h('div', { class: 'col' },
    h('div', { class: 'win' },
      h('h2', null, `Roster (${alive.length}/${rosterCap(g)})`),
      h('p', { class: 'small muted' }, 'Click a hero to see their sheet, gear and spells.'),
      h('div', { class: 'cards' }, ...alive.map((hero) => heroCard(hero, {
        onClick: () => { app.ui.heroSheet = hero.id; render(); },
        extra: hero.pendingLevel ? btn('Level up', () => { app.ui.levelUp = hero.id; render(); }, { cls: 'primary small' }) : null,
      })))),
    h('div', { class: 'win' },
      h('div', { class: 'row' }, h('h2', { class: 'grow' }, 'Recruits'), btn('New faces (25 gold)', () => run({ type: 'rerollRecruits' }), { cls: 'small' })),
      h('div', { class: 'cards' }, ...g.recruits.map((hero, i) => heroCard(hero, {
        onClick: () => { app.ui.heroSheet = `recruit:${i}`; render(); },
        extra: btn(recruitCost(hero, g) ? `Hire — ${recruitCost(hero, g)} gold` : 'Hire — volunteers (free)', () => { const r = run({ type: 'hire', idx: i }); if (r.ok) sfx.coin(); }, { cls: 'small primary', disabled: g.profile.bankedGold < recruitCost(hero, g) }),
      })))),
    fallen.length ? h('div', { class: 'win' }, h('h2', null, 'The Wall of the Fallen'),
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
  const levels = ui.party.map((id) => g.roster.find((x) => x.id === id)!.level);
  const spread = levels.length ? Math.max(...levels) - Math.min(...levels) : 0;
  return h('div', { class: 'col' },
    h('div', { class: 'win' },
      h('h2', null, 'Choose your three'),
      spread >= 4 ? h('p', { class: 'small danger' }, `Level spread of ${spread}: the dungeon is tuned to the party as a whole, so your weakest hero will struggle. Consider the Training Grounds.`) : null,
      h('div', { class: 'cards' }, ...alive.map((hero) => heroCard(hero, {
        sel: ui.party.includes(hero.id), onClick: () => (hero.pendingLevel ? toast('Finish their level-up in the Guild Hall first.') : toggle(hero.id)),
      })))),
    h('div', { class: 'win' },
      h('h2', null, 'Choose an echo'),
      h('div', { class: 'biome-pick' }, ...BIOME_ORDER.map((b) => {
        const def = BIOMES[b];
        const open = g.profile.unlockedBiomes.includes(b);
        return h('button', { class: `biome-card ${ui.biome === b ? 'sel' : ''} ${open ? '' : 'locked'}`, style: bgStyle(`scenes/${b}_corridor`, `linear-gradient(135deg, ${def.color}, #0b1230)`), disabled: !open, on: { click: () => { ui.biome = b; render(); } } },
          h('b', null, def.name), h('span', { class: 'small' }, open ? def.tagline : 'Sealed — clear the previous echo'), open && g.profile.sigils[b] ? h('span', { class: 'small gold' }, `Cleared ×${g.profile.sigils[b]}`) : null);
      })),
      h('p', { class: 'prose' }, BIOMES[ui.biome as BiomeId].premise),
      h('p', { class: 'small muted' }, `${BIOMES[ui.biome as BiomeId].meter.icon} ${BIOMES[ui.biome as BiomeId].meter.name}: ${BIOMES[ui.biome as BiomeId].meter.text}`),
      h('div', { class: 'row' },
        h('span', null, 'Difficulty'),
        ...(['explorer', 'standard', 'perilous'] as const).map((d) => btn(d[0].toUpperCase() + d.slice(1), () => { ui.difficulty = d; render(); }, { cls: `small ${ui.difficulty === d ? 'on' : ''}`, title: d === 'perilous' ? 'More foes, tougher fights, elite curses, ×1.5 gold' : d === 'explorer' ? 'Fewer, softer foes; less gold' : 'The intended challenge' })),
        h('span', { style: 'margin-left:12px' }, 'Length'),
        ...(['short', 'normal', 'long'] as const).map((s) => btn(s[0].toUpperCase() + s.slice(1), () => { ui.size = s; render(); }, { cls: `small ${ui.size === s ? 'on' : ''}` })),
      ),
      h('div', { class: 'row', style: 'margin-top:8px' },
        h('label', { for: 'seed' }, 'Seed'),
        h('input', { id: 'seed', value: ui.seed, style: 'background:#0b1230;color:inherit;border:1px solid #556;padding:6px;border-radius:4px;font:inherit;width:160px', on: { change: (e: Event) => { ui.seed = (e.target as HTMLInputElement).value.trim().toUpperCase() || randomSeed(); } } }),
        btn('Random', () => { ui.seed = randomSeed(); render(); }, { cls: 'small' }),
        h('span', { class: 'spacer' }),
        btn('Open the Fifth Door', () => {
          const r = run({ type: 'startExpedition', partyIds: ui.party, biome: ui.biome as BiomeId, difficulty: ui.difficulty, seed: ui.seed, size: ui.size });
          if (r.ok) { ui.seed = ''; sfx.fanfare(); }
        }, { cls: 'primary big', disabled: ui.party.length !== 3, key: 'start-exp' }),
      ),
      h('p', { class: 'small muted' }, 'Consumables in the Vault (up to six stacks) are packed automatically. Your Fortune — dice bag, charms, omens, doubloons — starts fresh in every echo.'),
    ),
  );
}

function shopTab(kind: 'gear' | 'consumable'): HTMLElement {
  const g = app.game!;
  const ids = shopItems(g).filter((id) => (kind === 'consumable' ? ITEMS[id].kind === 'consumable' : ITEMS[id].kind !== 'consumable'));
  const groups: Record<string, string[]> = {};
  for (const id of ids) (groups[ITEMS[id].kind] ??= []).push(id);
  const level = g.profile.facility[kind === 'gear' ? 'armory' : 'apothecary'];
  return h('div', { class: 'col' },
    h('div', { class: 'win' }, h('div', { class: 'row' }, h('h2', { class: 'grow' }, kind === 'gear' ? 'Armory stock' : 'Apothecary stock'), h('span', { class: 'small muted' }, `Facility level ${level}`)),
      ...Object.entries(groups).map(([k, list]) => h('div', null, h('h3', null, k[0].toUpperCase() + k.slice(1)),
        h('div', { class: 'list' }, ...list.sort((a, b) => ITEMS[a].price - ITEMS[b].price).map((id) => {
          const d = ITEMS[id];
          return h('div', { class: 'item-row' }, itemIcon(id), h('div', { class: 'grow' }, h('b', null, d.name), h('div', { class: 'small muted' }, itemSummary(id))),
            h('span', { class: 'gold' }, `${d.price} g`), btn('Buy', () => { if (run({ type: 'buy', defId: id }).ok) sfx.coin(); }, { cls: 'small', disabled: g.profile.bankedGold < d.price }));
        }))))),
  );
}

export function itemSummary(defId: string, inst?: ItemInstance): string {
  const d = ITEMS[defId];
  if (!d) return '';
  const bits: string[] = [];
  if (d.weapon) bits.push(`${d.weapon.dice}${d.weapon.versatile ? ` (${d.weapon.versatile})` : ''} ${d.weapon.type}`, d.weapon.props.join(', '), `mastery: ${d.weapon.mastery}`, d.weapon.martial ? 'martial' : 'simple');
  if (d.armor) bits.push(`AC ${d.armor.base}${d.armor.type === 'heavy' ? '' : d.armor.dexCap !== undefined ? ' + DEX (max 2)' : ' + DEX'}`, d.armor.type, d.armor.str ? `STR ${d.armor.str}` : '');
  if (d.shield) bits.push('+2 AC');
  if (d.text) bits.push(d.text);
  if (inst) for (const a of inst.affixes) bits.push(AFFIXES[a]?.text ?? a);
  return bits.filter(Boolean).join(' · ');
}

function vaultTab(): HTMLElement {
  const g = app.game!;
  return h('div', { class: 'col' },
    h('div', { class: 'win' },
      h('h2', null, `Vault (${g.vault.length} items)`),
      h('p', { class: 'small muted' }, 'Equip gear from a hero\'s sheet in the Guild Hall. Selling returns 40% of value.'),
      g.vault.length === 0 ? h('p', { class: 'muted' }, 'Empty. Treasure carried home from a dungeon lands here.') : null,
      h('div', { class: 'list' }, ...g.vault.map((it) => h('div', { class: 'item-row' }, itemIcon(it.defId),
        h('div', { class: 'grow' }, h('b', null, itemName(it)), h('div', { class: 'small muted' }, itemSummary(it.defId, it))),
        btn(`Sell ${sellValue({ ...it, qty: 1 })} g`, () => { if (run({ type: 'sell', uid: it.uid }).ok) sfx.coin(); }, { cls: 'small' }))))),
    h('div', { class: 'win' }, h('h2', null, 'Backups'),
      h('p', { class: 'small muted' }, 'Browser storage can be cleared. Export a backup file now and then.'),
      btn('Export save file', () => download(`treasure-dice-slot${g.slot}.json`, exportSave(g)))),
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
    h('div', { class: 'win' }, h('h2', null, `Enchant (up to +${cap})`),
      h('div', { class: 'list' }, ...gear.map(({ it, owner }) => h('div', { class: 'item-row' }, itemIcon(it.defId),
        h('div', { class: 'grow' }, h('b', null, itemName(it)), h('div', { class: 'small muted' }, owner ? `Equipped by ${owner}` : 'In the vault')),
        it.plus >= cap ? h('span', { class: 'small muted' }, 'At cap') : btn(`+${it.plus + 1} for ${enchantCost(it)} g`, () => { if (run({ type: 'enchant', uid: it.uid }).ok) sfx.coin(); }, { cls: 'small', disabled: g.profile.bankedGold < enchantCost(it) }))))),
  );
}

function facilityWin(): HTMLElement {
  const g = app.game!;
  const sig = Object.values(g.profile.sigils).reduce((a, b) => a + (b ?? 0), 0);
  return h('div', { class: 'win' }, h('h2', null, 'Keep upgrades'),
    h('div', { class: 'list' }, ...Object.entries(FACILITIES).map(([id, f]) => {
      const lvl = g.profile.facility[id];
      const cost = facilityCost(id, lvl);
      return h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('b', null, `${f.name} — level ${lvl}`), h('div', { class: 'small muted' }, f.text)),
        lvl >= f.max ? h('span', { class: 'small muted' }, 'Maxed') : btn(`Upgrade: ${cost.gold} g${cost.sigils ? `, ${cost.sigils} sigils` : ''}`, () => { if (run({ type: 'upgrade', id }).ok) sfx.fanfare(); }, { cls: 'small', disabled: g.profile.bankedGold < cost.gold || sig < cost.sigils }));
    })));
}

function trainingTab(): HTMLElement {
  const g = app.game!;
  const cap = trainingCap(g);
  const alive = g.roster.filter((x) => x.status === 'alive');
  return h('div', { class: 'col' },
    h('div', { class: 'win' }, h('h2', null, 'Reserve training'),
      h('p', { class: 'prose' }, `Pay to raise a benched hero by one level, up to level ${cap} (two below your strongest trio). Clearing dungeons is the only other way to level.`),
      h('div', { class: 'cards' }, ...alive.map((hero) => heroCard(hero, {
        extra: hero.level < cap && !hero.pendingLevel ? btn(`Train — ${trainingCost(g, hero)} g`, () => { if (run({ type: 'train', heroId: hero.id }).ok) { app.ui.levelUp = hero.id; render(); } }, { cls: 'small primary', disabled: g.profile.bankedGold < trainingCost(g, hero) }) : null,
      })))),
    facilityWin(),
  );
}

function codexTab(): HTMLElement {
  const g = app.game!;
  const s = g.profile.stats;
  return h('div', { class: 'col' },
    h('div', { class: 'win' }, h('h2', null, 'Records'),
      h('table', { class: 'mini' }, ...[
        ['Expeditions', s.expeditions], ['Echoes cleared', s.clears], ['Retreats', s.retreats], ['Wipes', s.wipes], ['Heroes lost', s.deaths], ['Best single hand', fmt(s.bestScore)],
      ].map(([k, v]) => h('tr', null, h('th', null, String(k)), h('td', null, String(v)))))),
    h('div', { class: 'win' }, h('h2', null, `Charms found (${g.profile.codex.charms.length}/${CHARMS.length})`),
      h('div', { class: 'charm-bar' }, ...CHARMS.map((c) => g.profile.codex.charms.includes(c.id) ? charmEl(c.id) : h('div', { class: 'charm empty', title: 'Undiscovered' })))),
    h('div', { class: 'win' }, h('h2', null, `Bestiary (${g.profile.codex.monsters.length})`),
      h('div', { class: 'cards' }, ...g.profile.codex.monsters.map((id) => MONSTERS[id]).filter(Boolean).map((m) => h('div', { class: 'item-row' },
        h('div', { class: 'icon', style: 'width:56px;height:56px' }, art(`monsters/${m.biome}_${m.id}`, m.name)), h('div', null, h('b', null, m.name), h('div', { class: 'small muted' }, m.flavor)))))),
    h('div', { class: 'win' }, h('h2', null, 'Hands'),
      h('table', { class: 'mini' }, h('tr', null, h('th', null, 'Hand'), h('th', null, 'Chips'), h('th', null, 'Mult'), h('th', null, 'Per Omen')),
        ...HANDS.map((x) => h('tr', null, h('td', null, x.name, g.profile.codex.hands.includes(x.id) ? '' : ' ?'), h('td', { class: 'chipc' }, x.chips), h('td', { class: 'multc' }, `×${x.mult}`), h('td', { class: 'small muted' }, `+${x.lvChips} / +${x.lvMult}`))))),
  );
}

// ── hero sheet (also used in dungeons, read-only) ──────────────────────────

export const SLOT_NAMES: Record<EquipSlot, string> = { mainHand: 'Main hand', offHand: 'Off hand', armor: 'Armor', trinket1: 'Trinket', trinket2: 'Trinket' };

export { CLASSES, heroCard };
