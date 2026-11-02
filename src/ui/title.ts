/** Title screen: save slots, new game, import/export, credits. */
import { h, btn } from './dom.ts';
import { app, render, setGame, toast } from './app.ts';
import { bgStyle } from './art.ts';
import { listSlots, loadGame, saveGame, deleteSlot, exportSave, importSave, type SlotInfo } from '../persistence/save.ts';
import { newGame } from '../meta/town.ts';
import { dieFace } from './widgets.ts';
import { sfx } from './audio.ts';

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
    if (!confirm(`Import into slot ${slot}? It holds ${alive} living heroes and ${r.game.profile.bankedGold} gold. This replaces the slot.`)) return;
    await saveGame(r.game);
    toast('Save imported.', true);
    void refreshSlots();
  };
  input.click();
}

export function titleScreen(): HTMLElement {
  if (!slots) void refreshSlots();
  const seal = [5, 5, 5, 5, 5];
  return h('div', { class: 'title-screen', style: bgStyle('town/door', 'radial-gradient(circle at 50% 30%, #2a2050, #070b1a)') + ';background-size:cover;background-position:center' },
    h('div', { class: 'title-inner' },
      h('h1', { class: 'logo' }, 'Treasure Dice', h('small', null, 'Echoes of the Fifth Door')),
      h('div', { class: 'title-dice', 'aria-hidden': 'true' }, ...seal.map((v, i) => dieFace(v, (['steel', 'sun', 'shadow', 'arcane', 'ember'] as const)[i], undefined, { cls: 'rolling' }))),
      showCredits ? credits() : h('div', { class: 'win slots' },
        h('h2', null, 'Choose a save slot'),
        ...(slots ?? []).map((s) => h('div', { class: 'slot' },
          h('div', { class: 'grow' }, h('b', null, `Slot ${s.slot}`), h('div', { class: 'small muted' }, s.exists ? `${s.summary} — saved ${new Date(s.savedAt!).toLocaleString()}` : 'Empty')),
          s.exists ? btn('Continue', async () => { const g = await loadGame(s.slot); if (g) { setGame(g); sfx.fanfare(); render(); } }, { cls: 'primary', key: `cont${s.slot}` }) : null,
          !s.exists ? btn('New (Legacy)', () => start(s.slot, 'legacy'), { cls: 'primary', title: 'Permadeath: fallen heroes stay fallen.' }) : null,
          !s.exists ? btn('New (Story)', () => start(s.slot, 'story'), { title: 'No permadeath: a wipe sends the party home empty-handed.' }) : null,
          s.exists ? btn('Export', async () => { const g = await loadGame(s.slot); if (g) download(`treasure-dice-slot${s.slot}.json`, exportSave(g)); }, { cls: 'small' }) : null,
          btn('Import', () => importInto(s.slot), { cls: 'small' }),
          s.exists ? btn('Delete', async () => { if (confirm(`Delete slot ${s.slot}? This cannot be undone.`)) { await deleteSlot(s.slot); void refreshSlots(); } }, { cls: 'small danger' }) : null,
        )),
        h('div', { class: 'row' }, btn('Credits & licences', () => { showCredits = true; render(); }, { cls: 'small' })),
      ),
    ),
    h('div', { class: 'legal' }, 'Saves live in this browser. Export a backup now and then — clearing site data erases them.'),
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
    h('h2', null, 'Credits & licences'),
    h('p', null, 'This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.'),
    h('p', null, 'Class features, spells and rules are paraphrased and adapted to a rank-based, dice-tray game. Each feature on a hero sheet is tagged exact, adapted or narrative. Monsters, biomes, charms, curses, the Fortune Tray and all art are original to Treasure Dice.'),
    h('p', null, 'Fonts: Pixelify Sans and Alegreya (SIL Open Font License).'),
    btn('Back', () => { showCredits = false; render(); }),
  );
}
