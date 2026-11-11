import { describe, it, expect } from 'vitest';
import { newGame } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { difficultyOpen, sizeOpen } from '../src/rules/balance.ts';
import { keepSummary, tripcode, tripcodeOf, TRIP_ALPHABET, TRIP_LENGTH } from '../src/meta/tripcode.ts';

const start = (g: ReturnType<typeof newGame>, o: Record<string, unknown>) =>
  dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'cinder', difficulty: 'standard', seed: 'U', ...o } as never);

describe('per-echo unlocks', () => {
  it('an unbroken echo offers only Normal length and Explorer/Standard', () => {
    const g = newGame(1, 'legacy', 'LOCK');
    expect(difficultyOpen(g, 'cinder', 'explorer')).toBe(true);
    expect(difficultyOpen(g, 'cinder', 'standard')).toBe(true);
    expect(difficultyOpen(g, 'cinder', 'perilous')).toBe(false);
    expect(sizeOpen(g, 'cinder', 'short')).toBe(false);
    expect(sizeOpen(g, 'cinder', 'normal')).toBe(true);
    expect(start(g, { difficulty: 'perilous' }).ok).toBe(false);
    expect(start(g, { difficulty: 'deadly' }).ok).toBe(false);
    expect(start(g, { size: 'long' }).ok).toBe(false);
    expect(start(g, { size: 'short' }).ok).toBe(false);
  });

  it('the first clear of an echo opens every length and difficulty there, and only there', () => {
    const g = newGame(1, 'legacy', 'UNLOCK');
    g.profile.sigils.cinder = 1;
    g.profile.unlockedBiomes.push('rootbound');
    expect(difficultyOpen(g, 'rootbound', 'deadly')).toBe(false);
    expect(sizeOpen(g, 'rootbound', 'long')).toBe(false);
    expect(start(g, { difficulty: 'deadly', size: 'long' }).ok).toBe(true);
  });

  it('the Training Cellar opens without the guided tour', () => {
    const g = newGame(1, 'legacy', 'SKIP');
    g.tutorial = null;
    expect(start(g, { tutorial: true }).ok).toBe(true);
    expect(g.expedition?.tutorial).toBe(true);
  });
});

describe('tripcode', () => {
  it('is eight symbols from the alphabet and reproducible', () => {
    const g = newGame(1, 'legacy', 'TRIP');
    const a = tripcode(g);
    expect([...a]).toHaveLength(TRIP_LENGTH);
    expect([...a].every((c) => TRIP_ALPHABET.includes(c))).toBe(true);
    expect(tripcode(JSON.parse(JSON.stringify(g)))).toBe(a);
    expect(tripcodeOf(keepSummary(g))).toBe(a);
  });

  it('changes when the record changes', () => {
    const g = newGame(1, 'legacy', 'TRIP2');
    const a = tripcode(g);
    g.profile.sigils.cinder = 1;
    const b = tripcode(g);
    g.profile.keeperName = 'Ada';
    expect(new Set([a, b, tripcode(g)]).size).toBe(3);
  });

  it('spreads small inputs across distinct codes', () => {
    const codes = new Set(Array.from({ length: 5000 }, (_, i) => tripcodeOf(String(i))));
    expect(codes.size).toBe(5000);
  });
});
