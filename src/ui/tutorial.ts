/**
 * The guided tour: coach marks over the Keep's menus, then a scripted practice
 * dungeon (movement, one fight, treasure, the Boss Sigil, a gentle boss) that
 * takes a fresh party from level 1 to 2, then the level-up wizard.
 *
 * Progress lives in GameState.tutorial so it survives saves; it is null once
 * the tour is finished or skipped. A step either blocks the screen and waits
 * for Next (`next`), lets the player act and advances once `done` holds, or
 * (`free`) parks a small reminder in the corner while the player plays.
 * Contextual tips explain the dungeon pop-ups (spoils, boons, events…) the
 * first time each one appears.
 */
import type { Facing, GameState, RelDir } from '../engine/types.ts';
import { h } from './dom.ts';
import { app, render, persist, toast, postRender } from './app.ts';
import { exitsView } from '../dungeon/explore.ts';
import { DIRS } from '../dungeon/generator.ts';
import { TUT } from '../dungeon/tutorial.ts';
import { bestDice } from '../app/autoplay.ts';
import { makeCtx, current } from '../combat/core.ts';
import { HAND_BY_ID } from '../fortune/hands.ts';
import { previewHand } from '../fortune/scoring.ts';
import { CLASS_MATERIAL } from '../fortune/materials.ts';
import { Rng } from '../engine/rng.ts';
import { PROLOGUE, FINALE_LEVEL } from '../content/story.ts';

type Where = 'town' | 'dungeon' | 'combat' | 'result';
type Kids = (Node | string | null)[];
type Targets = Element | (Element | null)[] | null | undefined;

interface Step {
  id: string;
  where: Where;
  title: string;
  text: (g: GameState) => Kids;
  target?: (g: GameState) => Targets;
  /** Blocks the screen until Next. */
  next?: boolean;
  /** Advances when this holds. */
  done?: (g: GameState) => boolean;
  /** Non-blocking reminder parked in a corner while the player plays. */
  free?: boolean;
  /** Town tab the step lives on (a redirect bubble points there first). */
  tab?: string;
  enter?: (g: GameState) => void;
  onNext?: () => void;
  last?: boolean;
}

const $ = (sel: string) => document.querySelector(sel);
const $$ = (sel: string) => [...document.querySelectorAll(sel)];
const P = (...t: (Node | string)[]) => h('p', null, ...t);
const B = (t: string) => h('b', null, t);

function where(g: GameState): Where {
  if (g.lastResult) return 'result';
  const exp = g.expedition;
  if (exp?.combat && exp.combat.status === 'active') return 'combat';
  if (exp) return 'dungeon';
  return 'town';
}

const inCellar = (g: GameState) => !!g.expedition?.tutorial;
const combatActive = (g: GameState) => !!g.expedition?.combat && g.expedition.combat.status === 'active';

// ── movement helpers ────────────────────────────────────────────────────────

const REL_LABEL: Record<RelDir, string> = { forward: 'Forward (↑)', left: 'Left (←)', right: 'Right (→)', back: 'Back (↓)' };

/** The relative direction of the first step on the shortest open path to `target`. */
function stepToward(g: GameState, target: string): RelDir | null {
  const exp = g.expedition;
  if (!exp || exp.pos === target) return null;
  const rooms = exp.map.rooms;
  const first: Record<string, Facing | null> = { [exp.pos]: null };
  const q = [exp.pos];
  while (q.length) {
    const k = q.shift()!;
    for (const d of DIRS) {
      const e = rooms[k].exits[d];
      if (!e || e.to in first || e.hidden) continue;
      if (e.lock === 'sigil' && !exp.keys.includes('sigil')) continue;
      first[e.to] = first[k] ?? d;
      q.push(e.to);
    }
  }
  const fd = first[target];
  if (!fd) return null;
  return exitsView(g).find((v) => v.dir === fd && v.state === 'open')?.rel ?? null;
}

const moveTarget = (room: string) => (g: GameState) => {
  const rel = stepToward(g, room);
  return rel ? $(`[data-key="mv-${rel}"]`) : null;
};
const moveText = (g: GameState, room: string, intro: Kids): Kids => {
  const rel = stepToward(g, room);
  return [...intro, rel ? P(B(`Tap ${REL_LABEL[rel]}.`), ' Directions are relative to the way you face, so the same door can be Forward one moment and Left the next.') : null];
};

// ── combat helpers ──────────────────────────────────────────────────────────

/** The dice the tour suggests for this hero's turn (same search as the autoplayer). */
let recCache: { key: string; dice: number[] } | null = null;
function recommended(g: GameState): number[] {
  const ctx = makeCtx(g);
  const actor = current(ctx);
  if (!actor || !ctx.combat.turn) return [];
  const tray = g.expedition!.fortune.tray;
  const key = `${actor.id}:${ctx.combat.round}:${tray.map((t) => `${t.dieUid}/${t.face}`).join(',')}`;
  if (recCache?.key === key) return recCache.dice;
  recCache = { key, dice: bestDice(g, ctx.combat.turn.playLimit).dice };
  return recCache.dice;
}

function recHandName(g: GameState, dice: number[]): string {
  const ctx = makeCtx(g);
  const actor = current(ctx);
  const hero = actor && g.roster.find((x) => x.id === actor.refId);
  if (!hero || !dice.length) return 'a hand';
  const p = previewHand({ run: g.expedition!.fortune, trayIndices: dice, actor: { classId: hero.classId, level: hero.level, hpFrac: 1, affinity: CLASS_MATERIAL[hero.classId] }, action: 'attack', base: 0, baseLabel: '', rng: new Rng([1, 2, 3, 4]), firstHand: false, marked: false, enemiesAlive: 2, curse: ctx.combat.curse });
  return HAND_BY_ID[p.hand].name;
}

function actorName(g: GameState): string {
  const ctx = makeCtx(g);
  return current(ctx)?.name ?? 'Your hero';
}

// ── the steps ───────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  // ---------------------------------------------------------------- the Keep
  {
    id: 'welcome', where: 'town', next: true, title: PROLOGUE.title,
    text: () => [...PROLOGUE.text.map((t) => P(t)),
      h('p', { class: 'coach-faint' }, 'This short tour shows you around the Keep, then takes your three heroes through a practice dungeon: moving, one fight, treasure and a boss. They come back at level 2. You can skip it at any time.')],
  },
  {
    id: 'purse', where: 'town', next: true, title: 'Gold and sigils', target: () => $('.topbar'),
    text: () => [P(B('Banked gold'), ' is safe in the Keep. You start with 50, enough for a potion or two. Gold you find in a dungeon is only banked if you walk out alive.'),
      P(B('Sigils'), ' come from beating echo bosses. They pay for Keep upgrades, together with gold.')],
  },
  {
    id: 'nav', where: 'town', next: true, title: 'The Keep is a big menu', target: () => $('.town-nav'),
    text: () => [P('Each tab is a facility:'),
      h('ul', { class: 'coach-list' },
        h('li', null, B('Guild Hall'), ': your roster, level-ups and recruits.'),
        h('li', null, B('Chronicle'), ': the story so far, and your share card.'),
        h('li', null, B('Cartographer'), ': pick three heroes and a dungeon.'),
        h('li', null, B('Armory / Apothecary'), ': buy gear and potions.'),
        h('li', null, B('Enchanter / Training'), ': upgrade gear, train benched heroes, upgrade the Keep.'),
        h('li', null, B('Vault / Codex'), ': your loot, and everything you have discovered.')),
      P('Click any tab to switch. The tour will take you to the ones that matter now.')],
  },
  {
    id: 'hero', where: 'town', tab: 'guild', title: 'Meet your heroes',
    target: () => $('[data-tut="roster"] .hero-card'),
    done: () => !!app.ui.heroSheet,
    text: (g) => [P(`These are your first three heroes: ${g.roster.filter((x) => x.status === 'alive').slice(0, 3).map((x) => x.name.split(' ')[0]).join(', ')}. A fighter up front, a cleric to heal, and a rogue for big hits.`), P(B('Click a hero'), ' to open their sheet.')],
  },
  {
    id: 'sheet', where: 'town', next: true, title: 'The hero sheet', target: () => $('.modal .sheet'),
    onNext: () => { app.ui.heroSheet = undefined; render(); },
    text: () => [P('Everything about a hero: HP, AC, ability scores, gear slots, class features and spells. In the Keep you equip gear from the Vault here and choose prepared spells.'),
      P('Close any window with ', B('Esc'), ' or by clicking outside it. (Next closes it for you.)')],
  },
  {
    id: 'recruits', where: 'town', tab: 'guild', next: true, title: 'Recruits', target: () => $('[data-tut="recruits"]'),
    text: () => [P('More heroes are for hire here, from all twelve classes. Each has their own colour of dice. Hiring costs gold, but volunteers sign on free whenever you have fewer than three living heroes.'),
      P('Every recruit has a unique name, so nobody gets mixed up on the Wall of the Fallen.')],
  },
  {
    id: 'chronicle', where: 'town', tab: 'chronicle', next: true, title: 'The Chronicle', target: () => $('[data-tut="story"]'),
    text: () => [P('Your story. Tiamat the Dragon Queen is stirring beyond the Fifth Door. Each echo you break tells the next chapter.'),
      P(`To face her you need at least one hero at `, B(`level ${FINALE_LEVEL}`), '. Heroes gain one level for every dungeon they clear and survive.')],
  },
  {
    id: 'cart', where: 'town', tab: 'cartographer', next: true, title: 'The Cartographer', target: () => $('[data-tut="party"]'),
    text: () => [P('Pick your three heroes here. Click a card to add or remove it. A good party has a front-liner, a healer and someone who hits hard.'),
      P('Below that you pick an echo (a dungeon), the difficulty and the length.')],
  },
  {
    id: 'enter', where: 'town', tab: 'cartographer', title: 'Enter the Training Cellar', target: () => $('[data-key="start-tutorial"]'),
    done: (g) => inCellar(g),
    text: () => [P('A small practice dungeon waits under the Keep. It is gentle, and nobody can die there, even in Legacy mode.'), P(B('Click Enter the Training Cellar.'))],
  },
  // ---------------------------------------------------------------- the cellar
  {
    id: 'room', where: 'dungeon', next: true, title: 'Your first room', target: () => $('.room-view'),
    text: () => [P('This is the room you are standing in: its name, what you see, and the echo\'s meter (Heat, here) at the top left.'),
      P('The compass at the top right shows which way you are ', B('facing'), '.')],
  },
  {
    id: 'dpad', where: 'dungeon', next: true, title: 'Moving', target: () => $('.dpad'),
    text: () => [P('Move ', B('Forward, Left, Right or Back'), ' relative to the way you face, with these buttons or the arrow keys / WASD. Each button shows what lies that way; a dash means a wall.'),
      P('Turning down a side passage changes your facing, so keep an eye on the compass.')],
  },
  {
    id: 'map', where: 'dungeon', next: true, title: 'The map', target: () => $('.minimap'),
    text: () => [P('The map fills in as you explore. The arrow is you. ☠ is the boss, ⚿ the Boss Sigil, $ treasure, ? an event, ⌂ a camp.'),
      P('In every dungeon you need the Boss Sigil to open the boss\'s door.')],
  },
  {
    id: 'journal', where: 'dungeon', next: true, title: 'Journal, party and Fortune', target: () => [$('.explore .log'), $('.party-strip')],
    text: () => [P('The journal records everything that happens. Below it is your party: click a portrait for their sheet. Potions and healing spells are under ', B('Supplies'), ' on the right.')],
  },
  {
    id: 'move1', where: 'dungeon', title: 'Take a step', target: moveTarget(TUT.tunnel),
    done: (g) => g.expedition?.pos !== TUT.entrance,
    text: (g) => moveText(g, TUT.tunnel, [P('Let\'s go.')]),
  },
  {
    id: 'move2', where: 'dungeon', title: 'Something is counting dice', target: moveTarget(TUT.fight),
    done: (g) => !!g.expedition?.combat || !!g.expedition?.map.rooms[TUT.fight].encounter?.cleared,
    text: (g) => moveText(g, TUT.fight, [P('Goblins are just ahead. Walking into an occupied room starts a fight.')]),
  },
  // ---------------------------------------------------------------- first fight
  {
    id: 'field', where: 'combat', next: true, title: 'The battlefield', target: () => $('.battlefield'),
    text: () => [P('Foes stand in a ', B('front'), ' and a ', B('back'), ' rank. Melee attacks can only reach the front rank while it stands. Hover a foe to see its AC and weaknesses.'),
      P('Your heroes are along the bottom. The glowing one is acting now.')],
  },
  {
    id: 'timeline', where: 'combat', next: true, title: 'Turn order', target: () => $('.timeline'),
    text: () => [P('Everyone acts in initiative order, shown here. Enemy turns play out on their own.')],
  },
  {
    id: 'tray', where: 'combat', next: true, title: 'The Fortune Tray', target: () => $('.felt .dice-row'),
    text: () => [P('This is the heart of the game. Every fight deals dice from your bag onto this tray, and the ', B('whole party shares it'), '.'),
      P('Each die has a material (colour). Dice that match the acting hero\'s colour score extra Mult.')],
  },
  {
    id: 'select', where: 'combat', title: 'Pick a hand',
    target: (g) => { const sel = app.ui.selected; return recommended(g).filter((i) => !sel.includes(i)).map((i) => $(`[data-key="die${i}"]`)).filter((x): x is Element => !!x); },
    done: (g) => { const rec = recommended(g); return rec.length === 0 || rec.every((i) => app.ui.selected.includes(i)); },
    text: (g) => { const rec = recommended(g); return [P(`On ${actorName(g)}'s turn, choose up to five dice to play with an action. They score like poker dice: Pair, Two Pair, Three of a Kind, Straight…`),
      P(B(`Click the highlighted dice`), ` (or press their number keys). They make ${/^[AEIOU]/.test(recHandName(g, rec)) ? 'an' : 'a'} `, B(recHandName(g, rec)), '.')]; },
  },
  {
    id: 'score', where: 'combat', next: true, title: 'Chips × Mult', target: () => $('.felt-head'),
    text: () => [P('The preview shows your hand and its ', h('b', { class: 'chipc' }, 'Chips'), ' × ', h('b', { class: 'multc' }, 'Mult'), '. When you act, the action\'s real damage dice are added to the Chips, then everything is multiplied.'),
      P('Only the dice that make the pattern score. The rest stay on the tray for the next hero.')],
  },
  {
    id: 'reroll', where: 'combat', next: true, title: 'Rerolls', target: () => $('[data-key="reroll"]'),
    text: () => [P('Not happy with a die? Select it and ', B('Reroll'), ' (R). You get 2 rerolls per turn, and more as heroes level up.'),
      P('The buttons beside it are class talents. A fighter can nudge a die ±1, a cleric can turn one into a Sun 6, and so on. Tokens (coins) are one-shot tricks.')],
  },
  {
    id: 'attack', where: 'combat', title: 'Attack!',
    enter: (g) => { g.tutorial!.mark = `actor:${current(makeCtx(g))?.id ?? ''}`; },
    target: () => app.ui.pending ? $$('.enemy.targetable') : app.ui.menu === 'attack' ? $('[data-key="opt-attack"]') : $('[data-key="menu-attack"]'),
    done: (g) => {
      if (!combatActive(g)) return true;
      const c = current(makeCtx(g));
      const was = g.tutorial!.mark?.startsWith('actor:') ? g.tutorial!.mark.slice(6) : '';
      return !c || c.id !== was || c.used.action;
    },
    text: () => [P(app.ui.pending ? 'Now click a highlighted foe.' : app.ui.menu === 'attack' ? 'Pick the weapon attack. 🎲 means it carries your selected dice.' : 'Open the Attack menu (A).'),
      h('p', { class: 'coach-faint' }, 'If you miss, your dice come back to the tray.')],
  },
  {
    id: 'log', where: 'combat', next: true, title: 'The battle log', target: () => $('.command .log'),
    text: () => [P('Every roll, hit and miss is written here. A big hand plays a scoring animation first, so you can watch the Chips and Mult add up.')],
  },
  {
    id: 'menus', where: 'combat', next: true, title: 'Other commands', target: () => $('.command .win'),
    text: () => [P(B('Skills'), ' are class features (Second Wind, Sneak Attack…), ', B('Magic'), ' holds spells, ', B('Items'), ' your potions, and ', B('Guard / Move'), ' raises a ward or switches rank.'),
      P(B('End turn'), ' (E) passes to the next hero. Unplayed dice stay on the tray, so you can save a good pair for a teammate.')],
  },
  {
    id: 'win1', where: 'combat', free: true, title: 'Finish the fight',
    done: (g) => !combatActive(g),
    text: () => [P('Select dice, pick an action, click a target. Keep going until the goblins drop.')],
  },
  // ---------------------------------------------------------------- after the fight
  {
    id: 'treasure', where: 'dungeon', title: 'A side room', target: moveTarget(TUT.treasure),
    done: (g) => g.expedition?.pos === TUT.treasure || !!g.expedition?.map.rooms[TUT.treasure].loot?.taken,
    text: (g) => moveText(g, TUT.treasure, [P('Victory! The map shows a room off to the side. Treasure rooms are worth the detour.')]),
  },
  {
    id: 'loot', where: 'dungeon', title: 'Open the treasure', target: () => $('[data-key="loot"]'),
    done: (g) => !!g.expedition?.map.rooms[TUT.treasure].loot?.taken,
    text: () => [P('Room actions appear under the room: treasure, events, the Peddler, camps and ', B('Search'), ', which finds hidden doors. ', B('Click Open the treasure.'))],
  },
  {
    id: 'kiln', where: 'dungeon', title: 'Find the Boss Sigil', target: moveTarget(TUT.kiln),
    done: (g) => g.expedition?.pos === TUT.kiln || !!g.expedition?.keys.includes('sigil'),
    text: (g) => moveText(g, TUT.kiln, [P('The Sigil Kiln (⚿) is past the fight room.')]),
  },
  {
    id: 'sigil', where: 'dungeon', title: 'Take the sigil', target: () => $('[data-key="investigate"]') ?? $('[data-key="ev0"]'),
    done: (g) => !!g.expedition?.keys.includes('sigil'),
    text: () => [P('Rooms with ? or ⚿ hold events: choices, often with a skill check. Your best hero rolls, and the odds are shown before you choose.'), P(B('Investigate'), ' and take the sigil.')],
  },
  {
    id: 'fortune', where: 'dungeon', next: true, title: 'This run\'s Fortune', target: () => $('.explore .felt'),
    text: () => [P('Charms, doubloons (¤), tokens and your dice bag only last for this dungeon. They build into a scoring engine as you go deeper, then vanish when the dungeon ends. So go big.'),
      P('Open the ', B('Dice bag'), ' to see every die, reorder charms (they score left to right) and check your hand levels.')],
  },
  {
    id: 'bossdoor', where: 'dungeon', title: 'The boss door', target: moveTarget(TUT.boss),
    done: (g) => (combatActive(g) && g.expedition!.combat!.kind === 'boss') || !!g.expedition?.bossDefeated,
    text: (g) => moveText(g, TUT.boss, [P('The sigil opens the sealed door. Your heroes healed up a little after the fight; in real dungeons, camps (⌂) let you rest.')]),
  },
  {
    id: 'curse', where: 'combat', next: true, title: 'Boss curses', target: () => $('.curse-banner'),
    text: () => [P('Every boss brings a ', B('curse'), ' that changes the dice rules for the fight. This one weakens Steel and Ember dice, so lean on the others.'),
      P('Bosses also have phases, and they warn you (⚠) before a big attack.')],
  },
  {
    id: 'win2', where: 'combat', free: true, title: 'Beat the practice forge',
    done: (g) => !!g.expedition?.bossDefeated || !combatActive(g),
    text: () => [P('Everything you learned, together. Big hands, rerolls, talents. You\'ve got this.')],
  },
  {
    id: 'exit', where: 'dungeon', title: 'Go home in triumph', target: () => $('[data-key="exit"]'),
    done: (g) => !g.expedition,
    text: () => [P('With the boss down you can leave from anywhere. ', B('Return to the Keep'), ' to bank your gold and treasure.')],
  },
  // ---------------------------------------------------------------- home again
  {
    id: 'result', where: 'result', next: true, title: 'A cleared dungeon', target: () => $('.title-inner .win'),
    text: () => [P('Every hero who survives a cleared dungeon ', B('gains a level'), '. Gold and items go to the Keep.'),
      P('In Legacy mode, heroes who fall in a real dungeon stay dead. In Story mode a wipe just sends you home empty-handed.')],
  },
  {
    id: 'home', where: 'result', title: 'Back to the Keep', target: () => $('[data-key="ack"]'),
    done: (g) => !g.lastResult,
    text: () => [P(B('Click Return to the Keep.'))],
  },
  {
    id: 'levelup', where: 'town', tab: 'guild', title: 'Level up',
    target: () => app.ui.levelUp ? $('[data-key="confirm-level"]') : $('[data-tut="levelup"]'),
    done: (g) => !g.roster.some((x) => x.status === 'alive' && x.pendingLevel),
    text: () => [P(app.ui.levelUp
      ? 'The level-up wizard lists the new features. When a level offers a choice (a fighting style, a feat…), pick it here. Then confirm.'
      : 'Heroes with a level waiting have a red badge. Click Level up on each of them.'), P(B(app.ui.levelUp ? 'Click Become level 2.' : 'Level up all three heroes.'))],
  },
  {
    id: 'share', where: 'town', tab: 'chronicle', next: true, title: 'Share your legends', target: () => $('[data-tut="share"]'),
    text: () => [P('Your share card shows your three best heroes, the echoes you have broken, and whether you have beaten Tiamat. Save it as an image or share it.')],
  },
  {
    id: 'ready', where: 'town', tab: 'cartographer', next: true, last: true, title: 'The real thing', target: () => $('[data-tut="biomes"]'),
    text: () => [P('That\'s the tour. Now pick an echo and open the Fifth Door for real. Each echo you break unlocks the next and tells the next chapter of the story.'),
      P(`Reach level ${FINALE_LEVEL} and the Dragon Throne opens. `, B('How to play'), ' in the top bar has the rules whenever you need them.')],
  },
];

const IDX = (id: string) => STEPS.findIndex((s) => s.id === id);
const ENTER_IDX = IDX('enter');
const CELLAR_FIRST = IDX('room');
const CELLAR_LAST = IDX('exit');

// ── contextual tips for dungeon pop-ups ─────────────────────────────────────

interface Tip { id: string; title: string; text: Kids; target: () => Targets; when: (g: GameState) => boolean }
const TIPS: Tip[] = [
  { id: 'spoils', title: 'Spoils', when: (g) => !!g.expedition?.spoils, target: () => $('.modal'),
    text: [P('Gold you find is ', B('carried'), ' until you get home alive. ', B('Doubloons'), ' are this dungeon\'s currency, and you earn +1 interest for every 5 you hold.'), P('Each fight raises your ', B('Fortune Rank'), ': a boon now, and every third rank a bigger upgrade.')] },
  { id: 'boons', title: 'Pick a boon', when: (g) => !!g.expedition?.boons && !g.expedition.spoils, target: () => $('.boons'),
    text: [P(B('Charms'), ' are lasting scoring effects for this run (5 slots). ', B('Omens'), ' level up a hand type. ', B('Dice'), ' and ', B('face enchants'), ' reshape your bag. ', B('Tokens'), ' are one-shot tricks.'), P('Hover a card for details, then pick one. When in doubt, take a charm.')] },
  { id: 'event', title: 'Events', when: (g) => !!g.expedition?.event && g.expedition.event.stage === 'choose', target: () => $('.modal .menu'),
    text: [P('Each option shows which hero rolls, their bonus and their chance. Some spells (and thieves\' tools) succeed automatically.')] },
  { id: 'hoard', title: 'The boss hoard', when: (g) => !!g.expedition?.lootChoice && !g.expedition.spoils, target: () => $('.modal .list'),
    text: [P('Bosses guard a hoard: take one item. It goes to the Vault when you get home, and you equip it from a hero\'s sheet.')] },
];
let activeTip: string | null = null;
/** The open tip was dismissed with Got it (it stays dismissed until its pop-up closes). */
let tipHidden = false;

// ── coach marks ─────────────────────────────────────────────────────────────

let coach: { root: HTMLElement; raf: number; key: string; revealed: boolean } | null = null;

export function clearCoach() {
  if (!coach) return;
  cancelAnimationFrame(coach.raf);
  coach.root.remove();
  coach = null;
}

export function coachBlocking(): boolean {
  return !!document.querySelector('.coach-block');
}

function save() { persist(); }

function finish(g: GameState, skipped: boolean) {
  g.tutorial = null;
  activeTip = null;
  tipHidden = false;
  save();
  clearCoach();
  toast(skipped ? 'Tutorial skipped. "How to play" in the top bar has the rules, and can restart the tour.' : 'Tutorial complete. Good luck beyond the Fifth Door!', true);
}

/** Restart the tour from the top (from the How to play window). */
export function restartTutorial(g: GameState) {
  g.tutorial = { step: 0, tips: [] };
  save();
}

function tick() {
  const g = app.game;
  if (!g || !g.tutorial) return clearCoach();
  const tut = g.tutorial;
  tut.tips ??= [];
  const w = where(g);

  // A real (non-tutorial) dungeon pauses the tour until you are home.
  if (g.expedition && !g.expedition.tutorial) return clearCoach();
  if (w === 'result' && !g.lastResult?.tutorial) return clearCoach();
  // The practice went wrong (wipe or retreat): back to the cellar door.
  if (w === 'result' && g.lastResult?.tutorial && g.lastResult.kind !== 'won' && tut.step >= CELLAR_FIRST) { tut.step = ENTER_IDX; tut.entered = undefined; save(); }
  if (w === 'town' && tut.step >= CELLAR_FIRST && tut.step <= CELLAR_LAST) { tut.step = ENTER_IDX; tut.entered = undefined; save(); }

  // Advance past finished steps, and past combat lessons once the fight is over.
  // A step's enter hook runs before its done check, so done can rely on what enter recorded.
  let st = STEPS[tut.step];
  while (st) {
    if (tut.entered !== tut.step && st.where === w) {
      tut.entered = tut.step;
      st.enter?.(g);
      save();
    }
    const over = (st.done && st.done(g)) || (st.where === 'combat' && w !== 'combat' && (w === 'dungeon' || w === 'result'));
    if (!over) break;
    tut.step++;
    save();
    st = STEPS[tut.step];
  }
  if (!st) return finish(g, false);

  // Dungeon pop-ups get a one-time tip.
  const modalOpen = !!document.querySelector('.modal-back');
  if (w === 'dungeon' || w === 'combat') {
    if (activeTip && !TIPS.find((t) => t.id === activeTip)!.when(g)) { activeTip = null; tipHidden = false; }
    if (!activeTip) {
      const t = TIPS.find((x) => x.when(g) && !tut.tips.includes(x.id));
      if (t) { activeTip = t.id; tut.tips.push(t.id); save(); }
    }
    if (activeTip && !tipHidden) {
      const t = TIPS.find((x) => x.id === activeTip)!;
      return show(g, { id: `tip-${t.id}`, where: w, title: t.title, text: () => t.text, target: t.target, tipOk: true });
    }
  }

  if (st.where !== w) return clearCoach();
  if (st.tab && app.ui.townTab !== st.tab && !app.ui.heroSheet && !app.ui.levelUp) {
    const name = document.querySelector(`[data-key="tab-${st.tab}"]`)?.textContent?.trim() ?? st.tab;
    return show(g, { id: `go-${st.id}`, where: w, title: `Next: ${name}`, text: () => [P(`Click the `, B(name), ' tab to continue the tour.')], target: () => $(`[data-key="tab-${st.tab}"]`) });
  }
  // A pop-up hides the step's target: wait until it closes (unless the target is inside it).
  if (modalOpen) {
    const els = targetsOf(st, g);
    const modal = document.querySelector('.modal-back')!;
    if (!els.some((el) => modal.contains(el))) return clearCoach();
  }
  show(g, st);
}

function targetsOf(st: { target?: (g: GameState) => Targets }, g: GameState): Element[] {
  const t = st.target ? st.target(g) : null;
  return (Array.isArray(t) ? t : [t]).filter((el): el is Element => !!el && el.isConnected);
}

type Shown = Pick<Step, 'id' | 'where' | 'title' | 'text' | 'target' | 'next' | 'free' | 'last' | 'onNext'> & { tipOk?: boolean };

function show(g: GameState, st: Shown) {
  const tut = g.tutorial!;
  // Re-rendering the same step keeps the bubble (no re-animation, no flicker).
  if (coach && coach.key === st.id && coach.root.isConnected) {
    const body = coach.root.querySelector('.coach-text');
    if (body) { body.replaceChildren(...st.text(g).filter((x): x is Node | string => x !== null)); }
    return;
  }
  clearCoach();
  const isStep = !st.id.startsWith('tip-') && !st.id.startsWith('go-');
  const idx = STEPS.findIndex((s) => s.id === st.id);
  const ring = h('div', { class: `coach-ring${st.next ? ' block' : ''}${st.free ? ' free' : ''}` });
  const next = () => {
    st.onNext?.();
    if (st.last) return finish(g, false);
    tut.step++;
    save();
    tick();
  };
  const dismissTip = () => { tipHidden = true; tick(); };
  const bubble = h('div', { class: `coach-bubble enter${st.free ? ' free' : ''}`, role: 'dialog', 'aria-label': st.title },
    h('div', { class: 'coach-meta' }, isStep ? `Tutorial · ${idx + 1} of ${STEPS.length}` : st.tipOk ? 'Tip' : 'Tutorial'),
    h('h4', null, st.title),
    h('div', { class: 'coach-text' }, ...st.text(g).filter((x): x is Node | string => x !== null)),
    h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { class: 'coach-skip', on: { click: () => { if (confirm('Skip the rest of the tutorial?')) finish(g, true); } } }, 'Skip tutorial'),
      h('span', { class: 'spacer' }),
      st.tipOk ? h('button', { class: 'btn small', on: { click: dismissTip } }, 'Got it') : null,
      st.next ? h('button', { class: 'btn small primary', 'data-coach': 'next', on: { click: next } }, st.id === 'welcome' ? 'Start the tour' : st.last ? 'Finish' : 'Next') : null));
  const root = h('div', { class: 'coach' }, st.next ? h('div', { class: 'coach-block' }) : null, ring, bubble);
  document.body.append(root);
  coach = { root, key: st.id, raf: 0, revealed: false };
  const frame = () => {
    if (!coach || coach.root !== root) return;
    place(st, g, ring, bubble);
    coach.raf = requestAnimationFrame(frame);
  };
  frame();
  if (st.next) (bubble.querySelector('[data-coach="next"]') as HTMLElement | null)?.focus();
}

/** Ring the target(s) and park the bubble beside them. */
function place(st: Shown, g: GameState, ring: HTMLElement, bubble: HTMLElement) {
  const rects = targetsOf(st, g).map((el) => el.getBoundingClientRect()).filter((r) => r.width || r.height);
  const pad = 6, M = 10;
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  if (!rects.length) {
    ring.style.display = st.next ? 'block' : 'none';
    Object.assign(ring.style, { left: '50%', top: '50%', width: '0px', height: '0px' });
    if (st.free) {
      bubble.style.left = `${M}px`;
      bubble.style.top = `${innerHeight - bh - M}px`;
    } else {
      bubble.style.left = `${Math.max(M, (innerWidth - bw) / 2)}px`;
      bubble.style.top = `${Math.max(M, (innerHeight - bh) / 2)}px`;
    }
    return;
  }
  if (coach && !coach.revealed) {
    coach.revealed = true;
    const r0 = rects[0];
    if (r0.top < 60 || r0.bottom > innerHeight - 40) window.scrollBy({ top: r0.top - innerHeight / 3, behavior: 'smooth' });
  }
  const r = {
    left: Math.min(...rects.map((x) => x.left)) - pad, top: Math.min(...rects.map((x) => x.top)) - pad,
    right: Math.max(...rects.map((x) => x.right)) + pad, bottom: Math.max(...rects.map((x) => x.bottom)) + pad,
  };
  ring.style.display = 'block';
  Object.assign(ring.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` });
  let x: number, y: number;
  const cx = (r.left + r.right) / 2;
  if (r.bottom + M + bh < innerHeight) { y = r.bottom + M; x = cx - bw / 2; }
  else if (r.top - M - bh > 0) { y = r.top - M - bh; x = cx - bw / 2; }
  else if (r.right + M + bw < innerWidth) { x = r.right + M; y = (r.top + r.bottom) / 2 - bh / 2; }
  else if (r.left - M - bw > 0) { x = r.left - M - bw; y = (r.top + r.bottom) / 2 - bh / 2; }
  else { y = (r.top + r.bottom) / 2 > innerHeight / 2 ? M : innerHeight - bh - M; x = cx - bw / 2; }
  bubble.style.left = `${Math.max(M, Math.min(innerWidth - bw - M, x))}px`;
  bubble.style.top = `${Math.max(M, Math.min(innerHeight - bh - M, y))}px`;
}

export function installTutorial() {
  postRender.push(tick);
  addEventListener('resize', () => { if (coach) coach.revealed = true; });
}

export { STEPS as TUTORIAL_STEPS };
