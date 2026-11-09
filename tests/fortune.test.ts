import { describe, it, expect } from 'vitest';
import { evaluateHand, type EvalDie } from '../src/fortune/hands.ts';
import { Rng, seedState } from '../src/engine/rng.ts';
import { newFortuneRun, startCombatTray, reroll, spendDice, charmSlots } from '../src/fortune/tray.ts';
import { scoreHand } from '../src/fortune/scoring.ts';
import { newCharm, omenLevels } from '../src/fortune/charms.ts';
import { applyOffer, rollBoons, rollShop } from '../src/fortune/boons.ts';

const d = (value: number, material: EvalDie['material'] = 'bone', wild = false): EvalDie => ({ value, material, wild });

describe('hand evaluation', () => {
  it('detects the basic hands', () => {
    expect(evaluateHand([d(3)]).hand).toBe('high');
    expect(evaluateHand([d(3), d(3), d(5)]).hand).toBe('pair');
    expect(evaluateHand([d(3), d(3), d(5), d(5)]).hand).toBe('twoPair');
    expect(evaluateHand([d(4), d(4), d(4), d(1)]).hand).toBe('three');
    expect(evaluateHand([d(1), d(2), d(3), d(4), d(5)]).hand).toBe('straight');
    expect(evaluateHand([d(1, 'steel'), d(1, 'steel'), d(3, 'steel'), d(4, 'steel'), d(6, 'steel')]).hand).toBe('set');
    expect(evaluateHand([d(2), d(2), d(2), d(6), d(6)]).hand).toBe('fullHouse');
    expect(evaluateHand([d(6), d(6), d(6), d(6), d(1)]).hand).toBe('four');
    expect(evaluateHand([d(2, 'sun'), d(3, 'sun'), d(4, 'sun'), d(5, 'sun'), d(6, 'prism')]).hand).toBe('straightSet');
    expect(evaluateHand([d(5), d(5), d(5), d(5), d(5)]).hand).toBe('five');
    expect(evaluateHand([d(5, 'ember'), d(5, 'ember'), d(5, 'ember'), d(5, 'ember'), d(5, 'ember')]).hand).toBe('hoard');
    expect(evaluateHand([d(2, 'ember'), d(2, 'ember'), d(5, 'ember'), d(5, 'ember'), d(5, 'ember')]).hand).toBe('fullSet');
  });
  it('only scores the dice that form the pattern', () => {
    const r = evaluateHand([d(6), d(6), d(1), d(2)]);
    expect(r.hand).toBe('pair');
    expect(r.scoring.sort()).toEqual([0, 1]);
  });
  it('wild faces take the best value', () => {
    expect(evaluateHand([d(4), d(4), d(4), d(4), d(1, 'bone', true)]).hand).toBe('five');
    expect(evaluateHand([d(2), d(3), d(5), d(6), d(1, 'bone', true)]).hand).toBe('straight');
  });
  it('honours four-finger and gap rules', () => {
    expect(evaluateHand([d(1), d(2), d(3), d(4)], { fourFingers: true }).hand).toBe('straight');
    expect(evaluateHand([d(1), d(2), d(4), d(5), d(6)], { gapStraight: true }).hand).toBe('straight');
    expect(evaluateHand([d(5)], { monolith: true }).hand).toBe('three');
  });
});

describe('scoring', () => {
  const rng = new Rng(seedState('test'));
  it('computes (base + chips) × mult with charms', () => {
    const run = newFortuneRun(rng, ['fighter', 'cleric', 'rogue']);
    // Force a tray of two bone 6s.
    const bone = run.bag.filter((x) => x.material === 'bone');
    run.tray = [{ dieUid: bone[0].uid, face: 5 }, { dieUid: bone[1].uid, face: 5 }];
    const base = scoreHand({ run, trayIndices: [0, 1], actor: { classId: 'fighter', level: 1, hpFrac: 1, affinity: 'steel' }, action: 'attack', base: 8, baseLabel: 'Sword', rng, firstHand: false, marked: false, enemiesAlive: 1 });
    expect(base.hand).toBe('pair');
    // (8 + 4 + 6 + 6) × 2 = 48
    expect(base.total).toBe(48);
    run.charms.push(newCharm('copperTooth'), newCharm('twinFang'));
    const boosted = scoreHand({ run, trayIndices: [0, 1], actor: { classId: 'fighter', level: 1, hpFrac: 1, affinity: 'steel' }, action: 'attack', base: 8, baseLabel: 'Sword', rng, firstHand: false, marked: false, enemiesAlive: 1 });
    // mult 2 + 3 + 5 = 10 → 24 × 10
    expect(boosted.total).toBe(240);
  });
  it('mimic tongue copies the charm to its right', () => {
    const run = newFortuneRun(rng, ['fighter']);
    const bone = run.bag.filter((x) => x.material === 'bone');
    run.tray = [{ dieUid: bone[0].uid, face: 0 }];
    run.charms.push(newCharm('mimicTongue'), newCharm('copperTooth'));
    const r = scoreHand({ run, trayIndices: [0], actor: { classId: 'fighter', level: 1, hpFrac: 1, affinity: 'steel' }, action: 'attack', base: 0, baseLabel: 'x', rng, firstHand: false, marked: false, enemiesAlive: 1 });
    // chips 2+1 = 3, mult 1 + 3 + 3 = 7
    expect(r.total).toBe(21);
  });
  it('curse debuffs dice', () => {
    const run = newFortuneRun(rng, ['fighter']);
    const bone = run.bag.filter((x) => x.material === 'bone');
    run.tray = [{ dieUid: bone[0].uid, face: 0 }, { dieUid: bone[1].uid, face: 0 }];
    const r = scoreHand({ run, trayIndices: [0, 1], actor: { classId: 'fighter', level: 1, hpFrac: 1, affinity: 'steel' }, action: 'attack', base: 5, baseLabel: 'x', rng, firstHand: false, marked: false, enemiesAlive: 1, curse: 'ashen' });
    expect(r.hand).toBe('high');
    expect(r.scoringDice.length).toBe(0);
  });
});

describe('tray', () => {
  it('draws, rerolls, spends and refills deterministically', () => {
    const a = new Rng(seedState('tray'));
    const b = new Rng(seedState('tray'));
    const ra = newFortuneRun(a, ['fighter', 'cleric', 'rogue']);
    const rb = newFortuneRun(b, ['fighter', 'cleric', 'rogue']);
    startCombatTray(ra, a, 7); startCombatTray(rb, b, 7);
    expect(ra.tray).toEqual(rb.tray);
    expect(ra.tray.length).toBe(7);
    reroll(ra, a, [0, 1]); reroll(rb, b, [0, 1]);
    expect(ra.tray).toEqual(rb.tray);
    spendDice(ra, a, [0, 1, 2], 7);
    expect(ra.tray.length).toBe(7);
    expect(ra.discard.length).toBe(3);
  });
  it('boons apply', () => {
    const rng = new Rng(seedState('boon'));
    const run = newFortuneRun(rng, ['wizard']);
    const offers = rollBoons(rng, run, 'normal');
    expect(offers.length).toBe(3);
    expect(offers.some((o) => o.kind === 'charm')).toBe(true);
    const shop = rollShop(rng, run);
    expect(shop.length).toBeGreaterThan(4);
    const r = applyOffer(run, { kind: 'omen', id: 'omen_pair', hand: 'pair' });
    expect(r.ok).toBe(true);
    expect(omenLevels(run).pair).toBe(1);
  });
  it('omens are relics: each takes a charm slot and its level leaves with it', () => {
    const run = newFortuneRun(new Rng(seedState('omen')), ['fighter']);
    const omen = { kind: 'omen' as const, id: 'omen_pair', hand: 'pair' as const };
    for (let i = 0; i < charmSlots(run); i++) expect(applyOffer(run, omen).ok).toBe(true);
    expect(run.charms.length).toBe(charmSlots(run));
    expect(omenLevels(run).pair).toBe(charmSlots(run));
    // Full tray: omens need a replacement target just like charms.
    expect(applyOffer(run, omen).ok).toBe(false);
    expect(applyOffer(run, { kind: 'charm', id: 'copperTooth' }, { replaceCharm: 0 }).ok).toBe(true);
    expect(omenLevels(run).pair).toBe(charmSlots(run) - 1);
    // Omens never leak into charm draws or the codex.
    expect(run.seenCharms).toEqual(['copperTooth']);
    // Structural upgrades stay slot-free.
    expect(applyOffer(run, { kind: 'upgrade', id: 'charmSlot' }).ok).toBe(true);
    expect(run.charms.length).toBe(charmSlots(run) - 1);
  });
});
