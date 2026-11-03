import { describe, it, expect } from 'vitest';
import { newGame } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoExploreStep, autoCombatStep } from '../src/app/autoplay.ts';
import { createHero, derive, makeItem } from '../src/rules/character.ts';
import { Rng } from '../src/engine/rng.ts';
import { markOffers, applyMark, heroDice, TRAIT_LEVELS } from '../src/fortune/dicepath.ts';
import { newFortuneRun, startCombatTray, applyHex } from '../src/fortune/tray.ts';
import { scoreHand } from '../src/fortune/scoring.ts';
import type { GameState, Hero } from '../src/engine/types.ts';

function hero(level = 1): Hero {
  return createHero(new Rng([5, 4, 3, 2]), 'fighter', level);
}

function toHeroTurn(g: GameState): Hero {
  let guard = 0;
  while (g.expedition && !(g.expedition.combat?.status === 'active') && guard++ < 300) autoExploreStep(g);
  const c = () => g.expedition!.combat!;
  guard = 0;
  while (c().status === 'active' && !(c().turn && c().combatants[c().turn!.actorId].side === 'hero') && guard++ < 50) autoCombatStep(g);
  const actor = c().combatants[c().turn!.actorId];
  return g.roster.find((h) => h.id === actor.refId)!;
}

describe('dice path', () => {
  it('offers are stable for a hero and level, and milestones offer traits', () => {
    const h = hero();
    expect(markOffers(h, 3)).toEqual(markOffers(h, 3));
    expect(markOffers(h, 3).length).toBe(3);
    for (const l of TRAIT_LEVELS) expect(markOffers(h, l).every((m) => m.kind === 'trait')).toBe(true);
    expect(markOffers(h, 8).some((m) => m.kind === 'newDie')).toBe(true);
  });

  it('marks permanently reshape signature dice', () => {
    const h = hero();
    expect(heroDice(h).length).toBe(2);
    applyMark(h, { kind: 'engrave', die: 0, face: 5, mod: 'fierce' });
    applyMark(h, { kind: 'hone', die: 1 });
    applyMark(h, { kind: 'trait', die: 1, trait: 'loaded' });
    applyMark(h, { kind: 'newDie' });
    const d = heroDice(h);
    expect(d[0].faces[5]).toEqual({ v: 6, mod: 'fierce' });
    expect(d[1].faces.map((f) => f.v)).toEqual([2, 2, 3, 4, 5, 6]);
    expect(d[1].trait).toBe('loaded');
    expect(d.length).toBe(3);
    // heroDice returns a copy.
    d[0].faces[0].v = 9;
    expect(heroDice(h)[0].faces[0].v).toBe(1);
  });

  it('a level-up applies the chosen mark; recruits get marks automatically', () => {
    const g = newGame(1, 'legacy', 'PATH');
    const h = g.roster[0];
    h.pendingLevel = true;
    const offers = markOffers(h, 2);
    expect(dispatch(g, { type: 'levelUp', heroId: h.id, choices: { mark: 1, asi: { mode: 'plus2', a: 'str' } } }).ok).toBe(true);
    const fresh = hero();
    applyMark(fresh, offers[1]);
    expect(heroDice(h)).toEqual(heroDice({ ...fresh, classId: h.classId }));
    // A level-9 recruit has walked 8 steps of the path.
    const vet = hero(9);
    const marks = heroDice(vet).flatMap((d) => d.faces).filter((f) => f.mod).length
      + heroDice(vet).filter((d) => d.trait).length;
    expect(marks).toBeGreaterThan(0);
  });

  it('signature dice join the bag with their owner and traits', () => {
    const h = hero();
    applyMark(h, { kind: 'trait', die: 0, trait: 'eager' });
    applyMark(h, { kind: 'trait', die: 1, trait: 'steadfast' });
    const run = newFortuneRun(new Rng([1, 2, 3, 4]), ['fighter'], [{ owner: h.id, dice: heroDice(h) }]);
    const sig = run.bag.filter((d) => d.owner === h.id);
    expect(sig.map((d) => d.trait)).toEqual(['eager', 'steadfast']);
    // Eager: always in the opening tray.
    for (let s = 0; s < 20; s++) {
      startCombatTray(run, new Rng([s, 7, 7, 7]), 3);
      expect(run.tray.some((t) => t.dieUid === sig[0].uid)).toBe(true);
    }
    // Steadfast: never jinxed.
    run.tray = [{ dieUid: sig[1].uid, face: 5 }];
    expect(applyHex(run, new Rng([1, 1, 1, 1]), 'jinx', 1)).toBeNull();
  });

  it('kindred and echoing dice only wake for their owner', () => {
    const run = newFortuneRun(new Rng([1, 2, 3, 4]), ['fighter'], [{ owner: 'A', dice: [{ material: 'steel', faces: [{ v: 6 }], trait: 'kindred' }, { material: 'steel', faces: [{ v: 6 }], trait: 'echoing' }] }]);
    const [k, e] = run.bag.filter((d) => d.owner === 'A');
    run.tray = [{ dieUid: k.uid, face: 0 }, { dieUid: e.uid, face: 0 }];
    const base = { run, trayIndices: [0, 1], action: 'attack' as const, base: 0, baseLabel: 'x', rng: new Rng([1, 1, 1, 1]), firstHand: false, marked: false, enemiesAlive: 1, preview: true };
    const actor = (heroId: string) => ({ classId: 'fighter', level: 1, hpFrac: 1, affinity: 'steel' as const, heroId });
    const mine = scoreHand({ ...base, actor: actor('A') });
    const theirs = scoreHand({ ...base, actor: actor('B') });
    expect(mine.steps.some((s) => s.label === 'Kindred')).toBe(true);
    expect(mine.steps.some((s) => s.label === 'Again!')).toBe(true);
    expect(theirs.steps.some((s) => s.label === 'Kindred' || s.label === 'Again!')).toBe(false);
    expect(mine.total).toBeGreaterThan(theirs.total);
  });
});

describe('dice-touched items', () => {
  it('gear grants skills, affinity, hand bonuses and bag dice', () => {
    const g = newGame(1, 'legacy', 'GEAR');
    const h = g.roster[0];
    const rng = new Rng([2, 2, 2, 2]);
    h.equipment.trinket1 = makeItem(rng, 'glovesThievery');
    h.equipment.trinket2 = makeItem(rng, 'ivoryBones');
    const d = derive(h);
    expect(d.proficient).toContain('sleightOfHand');
    expect(d.diceGear.startDice).toEqual(['loaded']);
    expect(dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((x) => x.id), biome: 'cinder', difficulty: 'standard', seed: 'GEAR-1' }).ok).toBe(true);
    const bag = g.expedition!.fortune.bag;
    expect(bag.some((x) => x.material === 'lead' && x.owner === h.id)).toBe(true);
    expect(bag.length).toBe(6 + 6 + 1);
  });
});

describe('skill tricks', () => {
  it('a proficient hero uses one trick per fight; expertise grants a second', () => {
    const g = newGame(1, 'legacy', 'TRICK');
    dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((x) => x.id), biome: 'cinder', difficulty: 'explorer', seed: 'TRICK-1' });
    const h = toHeroTurn(g);
    h.expertise = [];
    h.skillProfs = ['insight', 'religion'];
    const run = g.expedition!.fortune;
    const before = run.rerollsLeft;
    const talent = (id: string) => dispatch(g, { type: 'combat', cmd: { type: 'talent', id } });
    expect(talent('trick:athletics').ok).toBe(false); // not proficient
    expect(talent('trick:insight').ok).toBe(true);
    expect(run.rerollsLeft).toBe(before + 1);
    expect(talent('trick:insight').ok).toBe(false); // once per fight
    expect(talent('trick:religion').ok).toBe(false); // budget spent
    h.expertise = ['insight'];
    expect(talent('trick:religion').ok).toBe(true);
    expect(g.expedition!.combat!.turn!.flags.prayer).toBe(true);
  });
});
