/** Title screen: save slots, new game, import/export, credits. */
import { h, btn } from './dom.ts';
import { app, render, setGame, toast } from './app.ts';
import { bgStyle } from './art.ts';
import { listSlots, loadGame, saveGame, deleteSlot, exportSave, importSave, type SlotInfo } from '../persistence/save.ts';
import { newGame } from '../meta/town.ts';
import { dieFace } from './widgets.ts';
import { sfx } from './audio.ts';
import { tx } from '../i18n/index.ts';
import { languagePicker } from './language.ts';

let slots: SlotInfo[] | null = null;
let showCredits = false;

export async function refreshSlots() {
  slots = await listSlots();
  render();
}

export function download(name: string, text: string) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function importInto(slot: number) {
  const input = h('input', { type: 'file', accept: '.json,application/json' }) as HTMLInputElement;
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    const r = importSave(await f.text(), slot);
    if (!r.ok) { toast(r.error); return; }
    const alive = r.game.roster.filter((x) => x.status === 'alive').length;
    if (!confirm(tx('title.importIntoSlotItHolds', { slot, alive, bankedGold: r.game.profile.bankedGold }))) return;
    await saveGame(r.game);
    toast(tx('title.saveImported'), true);
    void refreshSlots();
  };
  input.click();
}

export function titleScreen(): HTMLElement {
  if (!slots) void refreshSlots();
  // Six dice, each showing a 6: the Sixth Door.
  const seal = ['ember', 'sun', 'verdant', 'steel', 'arcane', 'shadow'] as const;
  return h('div', { class: 'title-screen', style: bgStyle('town/door', 'radial-gradient(circle at 50% 30%, #2a2050, #070b1a)') + ';background-size:cover;background-position:center' },
    h('div', { class: 'title-inner' },
      h('h1', { class: 'logo' }, tx('title.treasureDice'), h('small', null, tx('title.echoesOfTheSixthDoor'))),
      h('div', { class: 'title-dice', 'aria-hidden': 'true' }, ...seal.map((m) => dieFace(6, m, undefined, { cls: 'rolling' }))),
      showCredits ? credits() : h('div', { class: 'win slots' },
        h('h2', null, tx('title.chooseASaveSlot')),
        ...(slots ?? []).map((s) => h('div', { class: 'slot' },
          h('div', { class: 'grow' }, h('b', null, tx('title.slot', { slot: s.slot })), h('div', { class: 'small muted' }, s.exists ? tx('title.saved', { summary: s.summary, date: new Date(s.savedAt!).toLocaleString() }) : tx('title.empty'))),
          s.exists ? btn(tx('title.continue'), async () => { const g = await loadGame(s.slot); if (g) { setGame(g); sfx.fanfare(); render(); } }, { cls: 'primary', key: `cont${s.slot}` }) : null,
          !s.exists ? btn(tx('title.newLegacy'), () => start(s.slot, 'legacy'), { cls: 'primary', title: tx('title.permadeathFallenHeroesStayFallen') }) : null,
          !s.exists ? btn(tx('title.newStory'), () => start(s.slot, 'story'), { title: tx('title.noPermadeathAWipeSends') }) : null,
          s.exists ? btn(tx('title.export'), async () => { const g = await loadGame(s.slot); if (g) download(`treasure-dice-slot${s.slot}.json`, exportSave(g)); }, { cls: 'small' }) : null,
          btn(tx('title.import'), () => importInto(s.slot), { cls: 'small' }),
          s.exists ? btn(tx('title.delete'), async () => { if (confirm(tx('title.deleteSlotThisCannotBe', { slot: s.slot }))) { await deleteSlot(s.slot); void refreshSlots(); } }, { cls: 'small danger' }) : null,
        )),
        h('div', { class: 'row' }, btn(tx('title.creditsLicences'), () => { showCredits = true; render(); }, { cls: 'small' })),
      ),
    ),
    h('div', { class: 'legal' }, languagePicker(), ' ', tx('title.savesLiveInThisBrowser')),
  );
}

async function start(slot: number, mode: 'legacy' | 'story') {
  const g = newGame(slot, mode);
  await saveGame(g);
  setGame(g);
  app.ui.townTab = 'guild';
  // The guided tour opens on its own (with a Skip button) instead of the rules sheet.
  app.ui.modal = g.tutorial ? undefined : { kind: 'help' };
  sfx.fanfare();
  render();
}

export function credits(): HTMLElement {
  return h('div', { class: 'win prose', style: 'max-width:720px;text-align:left' },
    h('h2', null, tx('title.creditsLicences')),
    h('p', null, tx('title.thisWorkIncludesMaterialFrom')),
    h('p', null, tx('title.classFeaturesSpellsAndRules')),
    h('p', null, tx('title.fontsPixelifySansVt323And')),
    btn(tx('title.back'), () => { showCredits = false; render(); }),
  );
}
