/** The Low Lantern: the Keep's tavern, The Queen's Due's home, and (once she wakes) the muster hall. */
import type { BiomeId } from '../engine/types.ts';
import { h, btn } from './dom.ts';
import { app, run, render } from './app.ts';
import { art, banner } from './art.ts';
import { sfx } from './audio.ts';
import { openDialogue, autoDialogue, npcPortrait, speakerName } from './dialogue.ts';
import { scriptTitle } from '../i18n/dialogue.ts';
import { NPCS } from '../content/npcs.ts';
import { BIOMES } from '../content/biomes.ts';
import { DRINKS, EVIDENCE, LEADS, SOURCES, TRACKS, LEAD_PITY, type DrinkId, type Track } from '../content/quest.ts';
import { questOf, readyScripts, heads, awakened, tiamatSlain, drinkAvailable, rumorsTonight, activeLeads, musterTasks, trackDone, has } from '../meta/quest.ts';
import type { Script } from '../content/dialogue.ts';
import { tx, txn } from '../i18n/index.ts';

/** The tavern's banner changes with the story. */
export function tavernArt(): string {
  const g = app.game!;
  if (tiamatSlain(g)) return 'town/tavern_dawn';
  if (awakened(g)) return 'town/tavern_muster';
  if (heads(g) >= 3) return 'town/tavern_uneasy';
  return 'town/tavern';
}

/** New (non-repeat) scenes waiting in the tavern, for the nav badge. */
export function tavernNews(): number {
  const g = app.game!;
  return readyScripts(g, 'tavern').filter((s) => !s.repeat).length + readyScripts(g, 'kilnrow').length;
}

function patronList(scripts: Script[]): HTMLElement {
  const g = app.game!;
  const by = new Map<string, Script[]>();
  for (const s of scripts) by.set(s.speaker, [...(by.get(s.speaker) ?? []), s]);
  return h('div', { class: 'patrons' }, ...[...by.entries()].map(([who, list]) => {
    const fresh = list.find((s) => !s.repeat);
    const s = fresh ?? list[0];
    return h('button', { class: `patron ${fresh ? 'new' : ''}`, 'data-key': `talk-${who}`, on: { click: () => { sfx.select(); openDialogue(s.id); } } },
      npcPortrait(who, 'neutral', 'patron-face'),
      h('span', { class: 'col', style: 'gap:2px;align-items:flex-start' },
        h('b', null, speakerName(g, who)),
        h('span', { class: 'small muted' }, fresh ? scriptTitle(fresh.id) : NPCS[who]?.title ?? '')),
      fresh ? h('span', { class: 'badge red' }, '!') : h('span', { class: 'small muted' }, '…'));
  }));
}

function drinksWin(): HTMLElement {
  const g = app.game!;
  const q = questOf(g);
  return h('div', { class: 'win' },
    h('div', { class: 'row' }, h('h2', { class: 'grow' }, tx('tavern.orderADrink')), q.drink ? h('span', { class: 'small gold' }, tx('tavern.waitingForYou', { name: DRINKS[q.drink as DrinkId].name })) : h('span', { class: 'small muted' }, tx('tavern.oneDrinkPerRunIt'))),
    h('div', { class: 'list' }, ...Object.values(DRINKS).filter((d) => !d.when || drinkAvailable(g, d.id) !== tx('metaQuest.notOnTheMenuYet')).map((d) => {
      const why = drinkAvailable(g, d.id);
      return h('div', { class: 'item-row' },
        h('div', { class: 'icon' }, art(`drinks/${d.id}`, d.name)),
        h('div', { class: 'grow' }, h('b', null, d.name, d.soft ? h('span', { class: 'small muted' }, tx('tavern.noAlcohol')) : null), h('div', { class: 'small' }, d.text), h('div', { class: 'small muted', style: 'font-style:italic' }, tx('tavern.bet', { line: d.line }))),
        h('span', { class: 'gold' }, tx('tavern.priceG', { price: d.price })),
        btn(why ? tx('tavern.unavailable') : tx('tavern.order'), () => { if (run({ type: 'buyDrink', id: d.id }).ok) sfx.coin(); }, { cls: 'small', disabled: !!why || !!q.drink || g.profile.bankedGold < d.price, title: why ?? undefined }));
    })),
    has(g, 'met:sereth') && !['faith', 'martyr'].includes(q.fate.sereth ?? '')
      ? h('div', { class: 'row', style: 'margin-top:8px' },
        npcPortrait('sereth', 'neutral', 'patron-face'),
        h('span', { class: 'grow small' }, q.tended ? tx('tavern.serethHasDressedYourHeroes') : tx('tavern.serethTendsWoundedHeroesAt')),
        btn(q.tended ? tx('tavern.tended') : tx('tavern.askSereth'), () => { if (run({ type: 'tend' }).ok) sfx.heal(); }, { cls: 'small', disabled: q.tended || q.tendedDay === g.profile.townDay }))
      : null);
}

function rumorsWin(): HTMLElement {
  const g = app.game!;
  const rs = rumorsTonight(g);
  return h('div', { class: 'win' }, h('h2', null, tx('tavern.hearRumors')),
    rs.length ? h('div', { class: 'list' }, ...rs.map((r) => {
      const src = SOURCES[r.source];
      return h('div', { class: `rumor ${r.isNew ? 'new' : ''}` },
        h('span', { class: 'rumor-icon', title: src.bias }, src.icon),
        h('div', { class: 'grow' },
          h('div', { class: 'small muted' }, src.name, h('span', { class: 'small', style: 'margin-left:6px;opacity:.75' }, `(${src.bias})`)),
          r.isNew ? btn(tx('tavern.listen'), () => { run({ type: 'hearRumor', id: r.id }); sfx.select(); }, { cls: 'small' }) : h('p', { class: 'prose', style: 'margin:2px 0' }, `"${r.text}"`)));
    })) : h('p', { class: 'muted' }, tx('tavern.quietTonight')));
}

function leadsWin(): HTMLElement | null {
  const g = app.game!;
  const leads = activeLeads(g);
  if (!leads.length) return null;
  return h('div', { class: 'win' }, h('h2', null, tx('tavern.leads')),
    h('p', { class: 'small muted' }, tx('tavern.takeAnEchoWithA', { v: LEAD_PITY + 1 })),
    h('div', { class: 'list' }, ...leads.map((l) => h('div', { class: 'item-row' },
      h('div', { class: 'grow' }, h('b', null, l.def.title), h('div', { class: 'small' }, l.def.brief)),
      h('span', { class: 'small muted' }, l.def.biome === 'town' ? tx('tavern.hereInTheKeep') : BIOMES[l.def.biome as BiomeId].name),
      l.runsLeft !== undefined ? h('span', { class: 'small danger' }, txn('tavern.expeditionLeft', l.runsLeft)) : null))));
}

function candleWin(): HTMLElement {
  const g = app.game!;
  const alive = g.roster.filter((x) => x.status === 'alive');
  const dead = g.roster.filter((x) => x.status === 'dead');
  return h('div', { class: 'win' }, h('h2', null, tx('tavern.theCandleShelf')),
    h('p', { class: 'small muted' }, tx('tavern.oneCandleForEveryParty')),
    h('div', { class: 'candles' },
      ...alive.map((x) => h('span', { class: 'candle', title: tx('tavern.cameHome', { xName: x.name }) }, '🕯️', h('span', { class: 'small' }, x.name.split(' ')[0]))),
      ...dead.map((x) => h('span', { class: 'candle out', title: `${x.name}: ${x.history.deathCause ?? 'fallen'}` }, '🕯', h('span', { class: 'small' }, x.name.split(' ')[0]))),
      questOf(g).fate.eren === 'captured' ? h('span', { class: 'candle out', title: tx('tavern.eren') }, '🕯', h('span', { class: 'small' }, tx('tavern.eren'))) : null));
}

function musterWin(): HTMLElement | null {
  const g = app.game!;
  if (!awakened(g) || tiamatSlain(g)) return null;
  const tasks = musterTasks(g);
  const q = questOf(g);
  return h('div', { class: 'win muster' },
    h('div', { class: 'row' }, h('h2', { class: 'grow' }, tx('tavern.theMuster')), h('span', { class: 'gold' }, tx('tavern.resolve10', { resolve: q.resolve }))),
    h('p', { class: 'small muted' }, tx('tavern.tiamatIsAwakeUntilA')),
    h('div', { class: 'tracks' }, ...(Object.keys(TRACKS) as Track[]).map((t) => h('div', { class: `track ${trackDone(g, t) ? 'done' : ''}` },
      h('h3', null, TRACKS[t].name, trackDone(g, t) ? ' ✓' : ''),
      h('p', { class: 'small gold' }, TRACKS[t].boon),
      h('p', { class: 'small muted' }, tx('tavern.cost', { cost: TRACKS[t].cost })),
      ...tasks.filter((m) => m.track === t).map((m) => h('div', { class: 'task' },
        h('div', { class: 'grow' }, h('b', null, m.done ? '✓ ' : '', m.title), h('div', { class: 'small muted' }, m.text), !m.done && !m.open && m.need ? h('div', { class: 'small danger' }, m.need) : null),
        m.done ? null
          : !m.open ? h('span', { class: 'small muted', title: m.need ?? '' }, tx('tavern.notYet'))
            : m.lead ? (m.leadOpen ? h('span', { class: 'small gold' }, tx('tavern.leadTaken')) : btn(tx('tavern.takeTheLead'), () => run({ type: 'muster', id: m.id }), { cls: 'small' }))
              : m.gold ? btn(tx('tavern.payG', { gold: m.gold }), () => { if (run({ type: 'muster', id: m.id }).ok) sfx.coin(); }, { cls: 'small', disabled: g.profile.bankedGold < m.gold })
                : m.scene ? btn(tx('tavern.go'), () => openDialogue(m.scene!), { cls: 'small primary' }) : null))))));
}

export function tavernTab(): HTMLElement {
  const g = app.game!;
  autoDialogue('tavern');
  const tavern = readyScripts(g, 'tavern');
  const kiln = readyScripts(g, 'kilnrow');
  const ev = Object.values(EVIDENCE).filter((e) => has(g, `ev:${e.id}`)).length;
  return h('div', { class: 'col' },
    h('div', { class: 'win' },
      h('div', { class: 'row' }, h('h2', { class: 'grow' }, awakened(g) && !tiamatSlain(g) ? tx('tavern.theOnlyLightInThe') : tx('tavern.tonightAtTheLowLantern')),
        h('span', { class: 'small muted' }, tx('tavern.evidenceSeeTheCodex', { ev, length: Object.keys(EVIDENCE).length }))),
      patronList(tavern),
      kiln.length ? h('div', { style: 'margin-top:8px' }, btn(tx('tavern.walkDownToKilnRow'), () => openDialogue(kiln[0].id), { cls: 'primary', key: 'kilnrow' })) : null),
    musterWin(),
    leadsWin(),
    drinksWin(),
    rumorsWin(),
    candleWin(),
  );
}

export { banner, LEADS, render };
