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
import { heroColour } from '../fortune/dicepath.ts';
import { Rng } from '../engine/rng.ts';
import { PROLOGUE, FINALE_LEVEL } from '../content/story.ts';
import { tx, rich } from '../i18n/index.ts';

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
  /** Becomes a small corner reminder (no ring) while this holds — e.g. when a window fills the screen. */
  freeWhen?: (g: GameState) => boolean;
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

const REL_LABEL: Record<RelDir, string> = { get forward() { return tx('tutorial.rel.forward'); }, get left() { return tx('tutorial.rel.left'); }, get right() { return tx('tutorial.rel.right'); }, get back() { return tx('tutorial.rel.back'); } };

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
  return [...intro, rel ? P(...rich(tx('tutorial.tapDirectionsAreRelativeTo', { REL_LABEL: REL_LABEL[rel] }))) : null];
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
  const p = previewHand({ run: g.expedition!.fortune, trayIndices: dice, actor: { classId: hero.classId, level: hero.level, hpFrac: 1, affinity: heroColour(hero) }, action: 'attack', base: 0, baseLabel: '', rng: new Rng([1, 2, 3, 4]), firstHand: false, marked: false, enemiesAlive: 2, curse: ctx.combat.curse });
  return HAND_BY_ID[p.hand].name;
}

function actorName(g: GameState): string {
  const ctx = makeCtx(g);
  return current(ctx)?.name ?? tx('tutorial.yourHero');
}

// ── the steps ───────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  // ---------------------------------------------------------------- the Keep
  {
    id: 'welcome', where: 'town', next: true, get title() { return PROLOGUE.title; },
    text: () => [...PROLOGUE.text.map((t) => P(t)),
      h('p', { class: 'coach-faint' }, tx('tutorial.thisShortTourShowsYou'))],
  },
  {
    id: 'purse', where: 'town', next: true, get title() { return tx('tutorial.goldAndSigils'); }, target: () => $('.topbar'),
    text: () => [P(...rich(tx('tutorial.bankedGoldIsSafeIn'))),
      P(...rich(tx('tutorial.sigilsComeFromBeatingEcho')))],
  },
  {
    id: 'nav', where: 'town', next: true, get title() { return tx('tutorial.theKeepIsABig'); }, target: () => $('.town-nav'),
    text: () => [P(tx('tutorial.eachTabIsAFacility')),
      h('ul', { class: 'coach-list' },
        h('li', null, ...rich(tx('tutorial.guildHallYourRosterLevel'))),
        h('li', null, ...rich(tx('tutorial.chronicleTheStorySoFar'))),
        h('li', null, ...rich(tx('tutorial.cartographerPickThreeHeroesAnd'))),
        h('li', null, ...rich(tx('tutorial.armoryApothecaryBuyGearAnd'))),
        h('li', null, ...rich(tx('tutorial.enchanterTrainingUpgradeGearTrain'))),
        h('li', null, ...rich(tx('tutorial.vaultCodexYourLootAnd')))),
      P(tx('tutorial.clickAnyTabToSwitch'))],
  },
  {
    id: 'hero', where: 'town', tab: 'guild', get title() { return tx('tutorial.meetYourHeroes'); },
    target: () => $('[data-tut="roster"] .hero-card'),
    done: () => !!app.ui.heroSheet,
    text: (g) => [P(tx('tutorial.theseAreYourFirstThree', { map: g.roster.filter((x) => x.status === 'alive').slice(0, 3).map((x) => x.name.split(' ')[0]).join(', ') })), P(...rich(tx('tutorial.clickAHeroToOpen')))],
  },
  {
    id: 'sheet', where: 'town', next: true, get title() { return tx('tutorial.theHeroSheet'); }, target: () => $('.modal .sheet'),
    onNext: () => { app.ui.heroSheet = undefined; render(); },
    text: () => [P(tx('tutorial.everythingAboutAHeroHp')),
      P(...rich(tx('tutorial.closeAnyWindowWithEsc')))],
  },
  {
    id: 'recruits', where: 'town', tab: 'guild', next: true, get title() { return tx('tutorial.recruits'); }, target: () => $('[data-tut="recruits"]'),
    text: () => [P(tx('tutorial.moreHeroesAreForHire')),
      P(tx('tutorial.everyRecruitHasAUnique'))],
  },
  {
    id: 'chronicle', where: 'town', tab: 'chronicle', next: true, get title() { return tx('tutorial.theChronicle'); }, target: () => $('[data-tut="story"]'),
    text: () => [P(tx('tutorial.yourStoryTiamatTheDragon')),
      P(...rich(tx('tutorial.toFaceHerYouNeed', { FINALE_LEVEL })))],
  },
  {
    id: 'cart', where: 'town', tab: 'cartographer', next: true, get title() { return tx('tutorial.theCartographer'); }, target: () => $('[data-tut="party"]'),
    text: () => [P(tx('tutorial.pickYourThreeHeroesHere')),
      P(tx('tutorial.belowThatYouPickAn'))],
  },
  {
    id: 'enter', where: 'town', tab: 'cartographer', get title() { return tx('tutorial.enterTheTrainingCellar'); }, target: () => $('[data-key="start-tutorial"]'),
    done: (g) => inCellar(g),
    text: () => [P(tx('tutorial.aSmallPracticeDungeonWaits')), P(B(tx('tutorial.clickEnterTheTrainingCellar')))],
  },
  // ---------------------------------------------------------------- the cellar
  {
    id: 'room', where: 'dungeon', next: true, get title() { return tx('tutorial.yourFirstRoom'); }, target: () => $('.room-view'),
    text: () => [P(tx('tutorial.thisIsTheRoomYou')),
      P(...rich(tx('tutorial.theCompassAtTheTop')))],
  },
  {
    id: 'dpad', where: 'dungeon', next: true, get title() { return tx('tutorial.moving'); }, target: () => $('.dpad'),
    text: () => [P(...rich(tx('tutorial.moveForwardLeftRightOr'))),
      P(tx('tutorial.turningDownASidePassage'))],
  },
  {
    id: 'map', where: 'dungeon', next: true, get title() { return tx('tutorial.theMap'); }, target: () => $('.minimap'),
    text: () => [P(tx('tutorial.theMapFillsInAs')),
      P(tx('tutorial.inEveryDungeonYouNeed'))],
  },
  {
    id: 'journal', where: 'dungeon', next: true, get title() { return tx('tutorial.journalPartyAndFortune'); }, target: () => [$('.explore .log'), $('.party-strip')],
    text: () => [P(...rich(tx('tutorial.theJournalRecordsEverythingThat')))],
  },
  {
    id: 'move1', where: 'dungeon', get title() { return tx('tutorial.takeAStep'); }, target: moveTarget(TUT.tunnel),
    done: (g) => g.expedition?.pos !== TUT.entrance,
    text: (g) => moveText(g, TUT.tunnel, [P(tx('tutorial.letSGo'))]),
  },
  {
    id: 'move2', where: 'dungeon', get title() { return tx('tutorial.somethingIsCountingDice'); }, target: moveTarget(TUT.fight),
    done: (g) => !!g.expedition?.combat || !!g.expedition?.map.rooms[TUT.fight].encounter?.cleared,
    text: (g) => moveText(g, TUT.fight, [P(tx('tutorial.goblinsAreJustAheadWalking'))]),
  },
  // ---------------------------------------------------------------- first fight
  {
    id: 'field', where: 'combat', next: true, get title() { return tx('tutorial.theBattlefield'); }, target: () => $('.battlefield'),
    text: () => [P(...rich(tx('tutorial.foesStandInAFront'))),
      P(tx('tutorial.yourHeroesAreAlongThe'))],
  },
  {
    id: 'timeline', where: 'combat', next: true, get title() { return tx('tutorial.turnOrder'); }, target: () => $('.timeline'),
    text: () => [P(tx('tutorial.everyoneActsInInitiativeOrder'))],
  },
  {
    id: 'tray', where: 'combat', next: true, get title() { return tx('tutorial.theFortuneTray'); }, target: () => $('.felt .dice-row'),
    text: () => [P(...rich(tx('tutorial.thisIsTheHeartOf'))),
      P(tx('tutorial.eachDieHasAMaterial'))],
  },
  {
    id: 'select', where: 'combat', get title() { return tx('tutorial.pickAHand'); },
    target: (g) => { const sel = app.ui.selected; return recommended(g).filter((i) => !sel.includes(i)).map((i) => $(`[data-key="die${i}"]`)).filter((x): x is Element => !!x); },
    done: (g) => { const rec = recommended(g); return rec.length === 0 || rec.every((i) => app.ui.selected.includes(i)); },
    text: (g) => { const rec = recommended(g); return [P(tx('tutorial.onSTurnChooseUp', { actorName: actorName(g) })),
      P(B(tx('tutorial.clickTheHighlightedDice')), tx('tutorial.orPressTheirNumberKeys', { v: /^[AEIOU]/.test(recHandName(g, rec)) ? 'an' : 'a' }), B(recHandName(g, rec)), '.')]; },
  },
  {
    id: 'score', where: 'combat', next: true, get title() { return tx('tutorial.chipsMult'); }, target: () => $('.felt-head'),
    text: () => [P(tx('tutorial.thePreviewShowsYourHand'), h('b', { class: 'chipc' }, tx('tutorial.chips')), ' × ', h('b', { class: 'multc' }, tx('tutorial.mult')), tx('tutorial.whenYouActTheAction')),
      P(tx('tutorial.onlyTheDiceThatMake'))],
  },
  {
    id: 'reroll', where: 'combat', next: true, get title() { return tx('tutorial.rerolls'); }, target: () => $('[data-key="reroll"]'),
    text: () => [P(...rich(tx('tutorial.notHappyWithADie'))),
      P(tx('tutorial.theButtonsBesideItAre'))],
  },
  {
    id: 'attack', where: 'combat', get title() { return tx('tutorial.attack'); },
    enter: (g) => { g.tutorial!.mark = `actor:${current(makeCtx(g))?.id ?? ''}`; },
    target: () => app.ui.pending ? $$('.enemy.targetable') : app.ui.menu === 'attack' ? $('[data-key="opt-attack"]') : $('[data-key="menu-attack"]'),
    done: (g) => {
      if (!combatActive(g)) return true;
      const c = current(makeCtx(g));
      const was = g.tutorial!.mark?.startsWith('actor:') ? g.tutorial!.mark.slice(6) : '';
      return !c || c.id !== was || c.used.action;
    },
    text: () => [P(app.ui.pending ? tx('tutorial.nowClickAHighlightedFoe') : app.ui.menu === 'attack' ? tx('tutorial.pickTheWeaponAttackMeans') : tx('tutorial.openTheAttackMenuA')),
      h('p', { class: 'coach-faint' }, tx('tutorial.ifYouMissYourDice'))],
  },
  {
    id: 'log', where: 'combat', next: true, get title() { return tx('tutorial.theBattleLog'); }, target: () => $('.command .log'),
    text: () => [P(tx('tutorial.everyRollHitAndMiss'))],
  },
  {
    id: 'menus', where: 'combat', next: true, get title() { return tx('tutorial.otherCommands'); }, target: () => $('.command .win'),
    text: () => [P(...rich(tx('tutorial.skillsAreClassFeaturesSecond'))),
      P(...rich(tx('tutorial.endTurnEPassesTo')))],
  },
  {
    // Players stall here wondering what to do with "bonus ready". Only shown while the
    // hero who attacked is still up with their action spent; otherwise it passes at once.
    id: 'endturn', where: 'combat', get title() { return tx('tutorial.endingYourTurn'); },
    enter: (g) => { const c = current(makeCtx(g)); g.tutorial!.mark = `endturn:${c && c.used.action && !c.used.bonus ? c.id : ''}`; },
    target: () => $('[data-key="end-turn"]') ?? $('[data-key="menu-back"]'),
    done: (g) => {
      if (!combatActive(g)) return true;
      const was = g.tutorial!.mark?.startsWith('endturn:') ? g.tutorial!.mark.slice(8) : '';
      const c = current(makeCtx(g));
      return !was || !c || c.id !== was;
    },
    text: (g) => [P(...rich(tx('tutorial.eachTurnHasAnAction'))),
      P(tx('tutorial.stillHasABonusAction', { actorName: actorName(g) }),
        B(app.ui.menu !== 'root' ? tx('tutorial.clickBackThenEndTurn') : tx('tutorial.clickEndTurn')), ' (E).')],
  },
  {
    id: 'win1', where: 'combat', free: true, get title() { return tx('tutorial.finishTheFight'); },
    done: (g) => !combatActive(g),
    text: () => [P(tx('tutorial.selectDicePickAnAction'))],
  },
  // ---------------------------------------------------------------- after the fight
  {
    id: 'treasure', where: 'dungeon', get title() { return tx('tutorial.aSideRoom'); }, target: moveTarget(TUT.treasure),
    done: (g) => g.expedition?.pos === TUT.treasure || !!g.expedition?.map.rooms[TUT.treasure].loot?.taken,
    text: (g) => moveText(g, TUT.treasure, [P(tx('tutorial.victoryTheMapShowsA'))]),
  },
  {
    id: 'loot', where: 'dungeon', get title() { return tx('tutorial.openTheTreasure'); }, target: () => $('[data-key="loot"]'),
    done: (g) => !!g.expedition?.map.rooms[TUT.treasure].loot?.taken,
    text: () => [P(...rich(tx('tutorial.roomActionsAppearUnderThe')))],
  },
  {
    id: 'kiln', where: 'dungeon', get title() { return tx('tutorial.findTheBossSigil'); }, target: moveTarget(TUT.kiln),
    done: (g) => g.expedition?.pos === TUT.kiln || !!g.expedition?.keys.includes('sigil'),
    text: (g) => moveText(g, TUT.kiln, [P(tx('tutorial.theSigilKilnIsPast'))]),
  },
  {
    id: 'sigil', where: 'dungeon', get title() { return tx('tutorial.takeTheSigil'); }, target: () => $('.modal-back .menu') ?? $('[data-key="investigate"]'),
    done: (g) => !!g.expedition?.keys.includes('sigil'),
    text: () => [P(tx('tutorial.roomsWithOrHoldEvents')), $('.modal-back .menu') ? P(...rich(tx('tutorial.pickAChoiceToTake'))) : P(...rich(tx('tutorial.investigateAndTakeTheSigil')))],
  },
  {
    id: 'fortune', where: 'dungeon', next: true, get title() { return tx('tutorial.thisRunSFortune'); }, target: () => $('.explore .felt'),
    text: () => [P(tx('tutorial.charmsOmensDoubloonsTokensAnd')),
      P(...rich(tx('tutorial.theSlotsBelowAreYour'))),
      P(...rich(tx('tutorial.openTheDiceBagTo')))],
  },
  {
    id: 'bossdoor', where: 'dungeon', get title() { return tx('tutorial.theBossDoor'); }, target: moveTarget(TUT.boss),
    done: (g) => (combatActive(g) && g.expedition!.combat!.kind === 'boss') || !!g.expedition?.bossDefeated,
    text: (g) => moveText(g, TUT.boss, [P(tx('tutorial.theSigilOpensTheSealed'))]),
  },
  {
    id: 'curse', where: 'combat', next: true, get title() { return tx('tutorial.bossCurses'); }, target: () => $('.curse-banner'),
    text: () => [P(...rich(tx('tutorial.everyBossBringsACurse'))),
      P(tx('tutorial.bossesAlsoHavePhasesAnd'))],
  },
  {
    id: 'win2', where: 'combat', free: true, get title() { return tx('tutorial.beatThePracticeForge'); },
    done: (g) => !!g.expedition?.bossDefeated || !combatActive(g),
    text: () => [P(tx('tutorial.everythingYouLearnedTogetherBig'))],
  },
  {
    id: 'exit', where: 'dungeon', get title() { return tx('tutorial.goHomeInTriumph'); }, target: () => $('[data-key="exit"]'),
    done: (g) => !g.expedition,
    text: () => [P(...rich(tx('tutorial.withTheBossDownYou')))],
  },
  // ---------------------------------------------------------------- home again
  {
    id: 'result', where: 'result', next: true, get title() { return tx('tutorial.aClearedDungeon'); }, target: () => $('.title-inner .win'),
    text: () => [P(...rich(tx('tutorial.everyHeroWhoSurvivesA'))),
      P(tx('tutorial.inLegacyModeHeroesWho'))],
  },
  {
    id: 'home', where: 'result', get title() { return tx('tutorial.backToTheKeep'); }, target: () => $('[data-key="ack"]'),
    done: (g) => !g.lastResult,
    text: () => [P(B(tx('tutorial.clickReturnToTheKeep')))],
  },
  {
    id: 'levelup', where: 'town', tab: 'guild', get title() { return tx('tutorial.levelUp'); },
    // Inside the wizard the choices fill the screen (on phones the confirm button is off-screen),
    // so the bubble shrinks to a corner reminder instead of parking on top of the options.
    freeWhen: () => !!app.ui.levelUp,
    target: () => app.ui.levelUp ? null : $('[data-tut="levelup"] button') ?? $('[data-tut="levelup"]'),
    done: (g) => !g.roster.some((x) => x.status === 'alive' && x.pendingLevel),
    text: () => [P(app.ui.levelUp
      ? tx('tutorial.theLevelUpWizardLists')
      : tx('tutorial.heroesWithALevelWaiting')), P(B(app.ui.levelUp ? tx('tutorial.clickBecomeLevel2') : tx('tutorial.levelUpAllThreeHeroes')))],
  },
  {
    id: 'share', where: 'town', tab: 'chronicle', next: true, get title() { return tx('tutorial.shareYourLegends'); }, target: () => $('[data-tut="share"]'),
    text: () => [P(tx('tutorial.yourShareCardShowsYour'))],
  },
  {
    id: 'ready', where: 'town', tab: 'cartographer', next: true, last: true, get title() { return tx('tutorial.theRealThing'); }, target: () => $('[data-tut="biomes"]'),
    text: () => [P(tx('tutorial.thatSTheTourNow')),
      P(...rich(tx('tutorial.reachLevelAndTheDragon', { FINALE_LEVEL })))],
  },
];

const IDX = (id: string) => STEPS.findIndex((s) => s.id === id);
const ENTER_IDX = IDX('enter');
const CELLAR_FIRST = IDX('room');
const CELLAR_LAST = IDX('exit');

// ── contextual tips for dungeon pop-ups ─────────────────────────────────────

interface Tip { id: string; title: string; text: Kids; target: () => Targets; when: (g: GameState) => boolean }
const TIPS: Tip[] = [
  { id: 'spoils', get title() { return tx('tutorial.spoils'); }, when: (g) => !!g.expedition?.spoils, target: () => $('.modal'),
    get text() { return [P(...rich(tx('tutorial.goldYouFindIsCarried'))), P(...rich(tx('tutorial.eachFightRaisesYourFortune')))]; } },
  { id: 'boons', get title() { return tx('tutorial.pickABoon'); }, when: (g) => !!g.expedition?.boons && !g.expedition.spoils, target: () => $('.boons'),
    get text() { return [P(...rich(tx('tutorial.charmsAreLastingScoringEffects'))), P(tx('tutorial.hoverACardForDetails'))]; } },
  { id: 'event', get title() { return tx('tutorial.events'); }, when: (g) => !!g.expedition?.event && g.expedition.event.stage === 'choose', target: () => $('.modal .menu'),
    get text() { return [P(tx('tutorial.eachOptionShowsWhichHero'))]; } },
  { id: 'hoard', get title() { return tx('tutorial.theBossHoard'); }, when: (g) => !!g.expedition?.lootChoice && !g.expedition.spoils, target: () => $('.modal .list'),
    get text() { return [P(tx('tutorial.bossesGuardAHoardTake'))]; } },
];
let activeTip: string | null = null;
/** The open tip was dismissed with Got it (it stays dismissed until its pop-up closes). */
let tipHidden = false;

// ── coach marks ─────────────────────────────────────────────────────────────

let coach: { root: HTMLElement; raf: number; key: string; revealed: boolean } | null = null;
/** Bubble the player minimised (by key), so re-renders keep it tucked away. */
let collapsedKey: string | null = null;

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
  toast(skipped ? tx('tutorial.tutorialSkippedHowToPlay') : tx('tutorial.tutorialCompleteGoodLuckBeyond'), true);
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
    return show(g, { id: `go-${st.id}`, where: w, title: tx('tutorial.next', { name }), text: () => [P(tx('tutorial.clickThe'), B(name), tx('tutorial.tabToContinueTheTour'))], target: () => $(`[data-key="tab-${st.tab}"]`) });
  }
  if (st.freeWhen?.(g)) return show(g, { ...st, id: `${st.id}~free`, free: true, target: undefined, dockTop: true });
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

type Shown = Pick<Step, 'id' | 'where' | 'title' | 'text' | 'target' | 'next' | 'free' | 'last' | 'onNext'> & { tipOk?: boolean; dockTop?: boolean };

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
  const idx = STEPS.findIndex((s) => s.id === st.id.replace(/~free$/, ''));
  const ring = h('div', { class: `coach-ring${st.next ? ' block' : ''}${st.free ? ' free' : ''}` });
  const next = () => {
    st.onNext?.();
    if (st.last) return finish(g, false);
    tut.step++;
    save();
    tick();
  };
  const dismissTip = () => { tipHidden = true; tick(); };
  // Non-blocking bubbles can be minimised to a small tab so they never hide what you're choosing.
  const canCollapse = !st.next;
  const setCollapsed = (on: boolean) => {
    collapsedKey = on ? st.id : null;
    bubble.classList.toggle('collapsed', on);
    ring.classList.toggle('hidden', on);
    toggle.textContent = on ? 'Show' : '–';
    toggle.setAttribute('aria-label', tx(on ? 'tutorial.showTutorial' : 'tutorial.minimiseTutorial'));
  };
  const toggle = h('button', { class: 'coach-min', on: { click: (e: Event) => { e.stopPropagation(); setCollapsed(!bubble.classList.contains('collapsed')); } } }, '–');
  const bubble = h('div', { class: `coach-bubble enter${st.free ? ' free' : ''}`, role: 'dialog', 'aria-label': st.title },
    h('div', { class: 'coach-meta' }, isStep ? tx('tutorial.tutorialOf', { v: idx + 1, STEPSLength: STEPS.length }) : st.tipOk ? tx('tutorial.tip') : tx('tutorial.tutorial'), canCollapse ? toggle : null),
    h('h4', { on: { click: () => { if (bubble.classList.contains('collapsed')) setCollapsed(false); } } }, st.title),
    h('div', { class: 'coach-text' }, ...st.text(g).filter((x): x is Node | string => x !== null)),
    h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { class: 'coach-skip', on: { click: () => { if (confirm(tx('tutorial.skipTheRestOfThe'))) finish(g, true); } } }, tx('tutorial.skipTutorial')),
      h('span', { class: 'spacer' }),
      st.tipOk ? h('button', { class: 'btn small', on: { click: dismissTip } }, tx('tutorial.gotIt')) : null,
      st.next ? h('button', { class: 'btn small primary', 'data-coach': 'next', on: { click: next } }, st.id === 'welcome' ? tx('tutorial.startTheTour') : st.last ? tx('tutorial.finish') : tx('tutorial.next2')) : null));
  const root = h('div', { class: 'coach' }, st.next ? h('div', { class: 'coach-block' }) : null, ring, bubble);
  document.body.append(root);
  coach = { root, key: st.id, raf: 0, revealed: false };
  if (canCollapse && collapsedKey === st.id) setCollapsed(true);
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
  if (bubble.classList.contains('collapsed')) {
    bubble.style.left = `${M}px`;
    bubble.style.top = `${innerHeight - bh - M}px`;
    return;
  }
  if (!rects.length) {
    ring.style.display = st.next ? 'block' : 'none';
    Object.assign(ring.style, { left: '50%', top: '50%', width: '0px', height: '0px' });
    if (st.free) {
      bubble.style.left = `${M}px`;
      // A window's choices sit at its bottom; on phones keep the reminder up top, over its header.
      bubble.style.top = `${st.dockTop && innerWidth < 700 ? M : innerHeight - bh - M}px`;
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
