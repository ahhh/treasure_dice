import './styles/main.css';
import { app, render } from './ui/app.ts';
import { loadManifest } from './ui/art.ts';
import { titleScreen } from './ui/title.ts';
import { townScreen } from './ui/town.ts';
import { exploreScreen, move } from './ui/explore.ts';
import { combatScreen, combatKeys } from './ui/combat.ts';
import { heroSheet, levelUpModal, spoilsModal, boonsModal, lootChoiceModal, eventModal, shopModal, bagModal, resultScreen, helpModal } from './ui/modals.ts';

app.root = document.getElementById('app')!;
app.renderers.title = titleScreen;
app.renderers.town = townScreen;
app.renderers.explore = exploreScreen;
app.renderers.combat = combatScreen;
app.renderers.result = resultScreen;
app.renderers.overlay = () => {
  const g = app.game;
  if (!g) return null as unknown as HTMLElement;
  if (app.ui.heroSheet) return heroSheet(app.ui.heroSheet);
  if (app.ui.levelUp) return levelUpModal(app.ui.levelUp);
  if (app.ui.modal?.kind === 'bag' && g.expedition) return bagModal();
  if (app.ui.modal?.kind === 'help') return helpModal();
  const exp = g.expedition;
  if (exp) {
    if (exp.spoils) return spoilsModal();
    if (exp.lootChoice) return lootChoiceModal();
    if (exp.boons) return boonsModal();
    if (exp.event && !(exp.combat && exp.combat.status === 'active')) return eventModal();
    if (exp.shop) return shopModal();
  }
  return null as unknown as HTMLElement;
};

document.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const g = app.game;
  if (!g) return;
  if (e.key === 'Escape' && (app.ui.heroSheet || app.ui.levelUp || app.ui.modal)) {
    app.ui.heroSheet = undefined; app.ui.levelUp = undefined; app.ui.modal = undefined; render(); e.preventDefault(); return;
  }
  if (document.querySelector('.modal-back')) return;
  const exp = g.expedition;
  if (exp?.combat && exp.combat.status === 'active') { if (combatKeys(e)) e.preventDefault(); return; }
  if (exp && !exp.combat) {
    const map: Record<string, 'forward' | 'left' | 'right' | 'back'> = { ArrowUp: 'forward', ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'back', w: 'forward', a: 'left', d: 'right', s: 'back' };
    const dir = map[e.key];
    if (dir) { e.preventDefault(); move(dir); }
  }
});

void loadManifest().then(render);
render();

// Dev-only hook for browser tests (stripped from production builds).
if (import.meta.env.DEV) {
  void Promise.all([import('./meta/town.ts'), import('./app/commands.ts'), import('./ui/app.ts'), import('./app/autoplay.ts')]).then(([town, cmds, ui, auto]) => {
    (window as unknown as Record<string, unknown>).__td = { app, render, newGame: town.newGame, dispatch: cmds.dispatch, setGame: ui.setGame, auto };
  });
}
