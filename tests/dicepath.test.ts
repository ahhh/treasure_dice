import { describe, it, expect } from 'vitest';
import { newGame } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoExploreStep, autoCombatStep } from '../src/app/autoplay.ts';
import { createHero, derive, makeItem } from '../src/rules/character.ts';
import { Rng } from '../src/engine/rng.ts';
import { markOffers, applyMark, heroDice, heroColour, subclassColour, maxSignatureDice, MAX_SIGNATURE_DICE, TRAIT_LEVELS, RECOLOUR_LEVEL, DICE_COLOURS } from '../src/fortune/dicepath.ts';
import { CLASS_MATERIAL } from '../src/fortune/materials.ts';
import { migrate } from '../src/persistence/save.ts';
import { SUBCLASSES } from '../src/content/subclasses.ts';
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

  it('level 3 offers: keep your colour, or one of two other dice colours', () => {
    const h = hero();
    const offers = markOffers(h, RECOLOUR_LEVEL);
    expect(offers.map((m) => m.kind)).toEqual(['recolour', 'recolour', 'recolour']);
    const mats = offers.map((m) => (m.kind === 'recolour' ? m.material : null));
    expect(mats[0]).toBe(heroColour(h));
    expect(new Set(mats).size).toBe(3);
    for (const m of mats) expect(DICE_COLOURS).toContain(m);
    // Taking a new colour repaints the signature dice and moves the affinity.
    applyMark(h, offers[1]);
    expect(heroColour(h)).toBe(mats[1]);
    expect(heroDice(h).every((d) => d.material === mats[1])).toBe(true);
    applyMark(h, { kind: 'newDie' });
    expect(heroDice(h)[2].material).toBe(mats[1]);
    // Keeping your colour changes nothing.
    const k = hero();
    applyMark(k, markOffers(k, RECOLOUR_LEVEL)[0]);
    expect(k.colour).toBeUndefined();
  });

  it('a subclass colour adds a signature die that marks can land on', () => {
    // Eldritch Knight adds Arcane to the Fighter's Steel.
    const h = createHero(new Rng([5, 4, 3, 2]), 'fighter', 3, { subclass: 'eldritchKnight' });
    h.dice = undefined; h.colour = undefined; // a clean path, whatever auto-levelling picked
    expect(subclassColour(h)).toBe('arcane');
    expect(heroDice(h).map((d) => d.material)).toEqual(['steel', 'steel', 'arcane']);
    expect(derive(h).diceGear.affinity).toContain('arcane');
    // Engraves stick to it, and a recolour leaves it alone.
    applyMark(h, { kind: 'engrave', die: 2, face: 5, mod: 'keen' });
    applyMark(h, { kind: 'recolour', material: 'storm' });
    const d = heroDice(h);
    expect(d.map((x) => x.material)).toEqual(['storm', 'storm', 'arcane']);
    expect(d[2].faces[5].mod).toBe('keen');
    // It doesn't take one of the Dice Path's four slots.
    expect(maxSignatureDice(d)).toBe(MAX_SIGNATURE_DICE + 1);
    for (let i = 0; i < 3; i++) applyMark(h, { kind: 'newDie' });
    expect(heroDice(h).length).toBe(MAX_SIGNATURE_DICE + 1);
    // Switching subclass repaints that die (marks kept); a colourless subclass drops it.
    h.choices.subclass = ['arcaneArcher'];
    expect(heroDice(h)[2]).toMatchObject({ material: 'arcane', sub: true });
    h.choices.subclass = ['champion'];
    expect(heroDice(h).some((x) => x.sub)).toBe(false);
    expect(derive(h).diceGear.affinity).not.toContain('arcane');
    // Below level 3 there is no subclass, so no extra die.
    expect(heroDice(hero(2)).length).toBe(2);
  });

  it('every dice colour belongs to at least two classes once subclasses count', () => {
    const by = new Map<string, Set<string>>();
    const add = (m: string, c: string) => { if (!by.has(m)) by.set(m, new Set()); by.get(m)!.add(c); };
    for (const [c, m] of Object.entries(CLASS_MATERIAL)) add(m, c);
    for (const [c, list] of Object.entries(SUBCLASSES)) for (const s of list) if (s.dice) { expect(s.dice).not.toBe(CLASS_MATERIAL[c as keyof typeof CLASS_MATERIAL]); add(s.dice, c); }
    for (const m of DICE_COLOURS) expect(by.get(m)?.size ?? 0, m).toBeGreaterThanOrEqual(2);
  });

  it('old saves lose Frost: heroes go back to their colour, stray Frost dice are repainted', () => {
    const g = newGame(1, 'legacy', 'FROST');
    const h = g.roster[0];
    h.colour = 'frost' as never;
    h.dice = [{ material: 'frost' as never, faces: [] }];
    // A run saved mid-expedition: one Frost die of the hero's, one unowned (a Frost Die boon).
    const bag = [{ uid: 'a', material: 'frost', faces: [], owner: h.id }, { uid: 'b', material: 'frost', faces: [] }];
    g.expedition = { fortune: { bag, charms: [] } } as never;
    migrate(g);
    expect(h.colour).toBeUndefined();
    expect(h.dice![0].material).toBe(heroColour(h));
    expect(bag[0].material).toBe(heroColour(h));
    expect(bag[1].material).toBe('storm');
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
