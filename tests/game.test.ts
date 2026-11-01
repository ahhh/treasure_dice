import { describe, it, expect } from 'vitest';
import { newGame } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoExpedition, autoCombatStep, autoExploreStep, autoLevelChoices } from '../src/app/autoplay.ts';
import { createHero, derive, fullRestore } from '../src/rules/character.ts';
import { CLASS_IDS, CLASSES, maxSlots } from '../src/content/classes.ts';
import { Rng } from '../src/engine/rng.ts';
import { castableSpells } from '../src/content/spells.ts';
import type { GameState } from '../src/engine/types.ts';
import { exportSave, importSave, migrate } from '../src/persistence/save.ts';

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

describe('characters', () => {
  it('every class builds and levels 1→20 with legal derived stats', () => {
    for (const c of CLASS_IDS) {
      const rng = new Rng([3, 1, 4, 1]);
      for (const lvl of [1, 3, 5, 11, 17, 20]) {
        const h = createHero(rng, c, lvl);
        const d = derive(h);
        expect(h.level).toBe(lvl);
        expect(d.maxHp).toBeGreaterThan(0);
        expect(d.ac).toBeGreaterThanOrEqual(10);
        expect(d.pb).toBe(2 + Math.floor((lvl - 1) / 4));
        for (const a of Object.values(h.abilities)) expect(a).toBeLessThanOrEqual(20);
        expect(h.slots).toEqual(maxSlots(c, lvl));
        if (CLASSES[c].caster) expect(castableSpells(h).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('expeditions', () => {
  it('a full headless run ends in a valid state with rewards granted once', () => {
    let wins = 0;
    for (let i = 0; i < 12; i++) {
      const g = newGame(1, 'legacy', `T-${i}`);
      const before = g.profile.bankedGold;
      const r = dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'cinder', difficulty: 'standard', seed: `RUN-${i}` });
      expect(r.ok).toBe(true);
      const rep = autoExpedition(g);
      expect(rep.result).not.toBe('stuck');
      expect(g.expedition).toBeUndefined();
      expect(g.lastResult).toBeTruthy();
      if (g.lastResult!.kind === 'won') {
        wins++;
        expect(g.profile.bankedGold).toBe(before + g.lastResult!.gold);
        for (const h of g.roster.filter((x) => x.status === 'alive')) expect(h.pendingLevel).toBe(true);
        expect(g.profile.unlockedBiomes).toContain('rootbound');
      }
      for (const h of g.roster) {
        expect(h.hp).toBeGreaterThanOrEqual(0);
        if (h.status === 'alive') expect(h.hp).toBeLessThanOrEqual(derive(h).maxHp);
      }
      // Acknowledge, level up, go again: the roguelite loop.
      dispatch(g, { type: 'ackResult' });
      for (const h of g.roster.filter((x) => x.pendingLevel)) expect(dispatch(g, { type: 'levelUp', heroId: h.id, choices: autoLevelChoices(h) }).ok).toBe(true);
    }
    expect(wins).toBeGreaterThan(5);
  });

  it('saving and reloading mid-combat reproduces the same next outcome', () => {
    const g = newGame(1, 'legacy', 'DET');
    g.profile.unlockedBiomes.push('rootbound');
    dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'rootbound', difficulty: 'standard', seed: 'DET-1' });
    let guard = 0;
    while (g.expedition && !(g.expedition.combat?.status === 'active') && guard++ < 300) autoExploreStep(g);
    expect(g.expedition?.combat?.status).toBe('active');
    const snapshot: GameState = clone(g);
    const a = g;
    const b = clone(snapshot);
    for (let i = 0; i < 6; i++) { if (a.expedition?.combat?.status === 'active') autoCombatStep(a); if (b.expedition?.combat?.status === 'active') autoCombatStep(b); }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('cannot claim the same spoils twice or move during combat', () => {
    const g = newGame(1, 'legacy', 'ONCE');
    dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'cinder', difficulty: 'explorer', seed: 'ONCE-1' });
    let guard = 0;
    while (g.expedition && !(g.expedition.combat?.status === 'active') && guard++ < 300) autoExploreStep(g);
    expect(dispatch(g, { type: 'move', dir: 'back' }).ok).toBe(false);
    guard = 0;
    while (g.expedition?.combat?.status === 'active' && guard++ < 300) autoCombatStep(g);
    if (g.expedition?.spoils) {
      const gold = g.expedition.carriedGold;
      dispatch(g, { type: 'closeSpoils' });
      dispatch(g, { type: 'closeSpoils' });
      expect(g.expedition.carriedGold).toBe(gold);
      expect(g.expedition.combat).toBeUndefined();
    }
  });

  it('only three living heroes may start; dead heroes cannot join', () => {
    const g = newGame(1, 'legacy', 'RULES');
    expect(dispatch(g, { type: 'startExpedition', partyIds: g.roster.slice(0, 2).map((h) => h.id), biome: 'cinder', difficulty: 'standard', seed: 'X' }).ok).toBe(false);
    g.roster[0].status = 'dead';
    expect(dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'cinder', difficulty: 'standard', seed: 'X' }).ok).toBe(false);
    expect(dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'starfall', difficulty: 'standard', seed: 'X' }).ok).toBe(false);
  });

  it('every class combination completes a run at levels 1, 5, 11, 17 and 20 without getting stuck', () => {
    const rng = new Rng([9, 9, 9, 9]);
    for (const lvl of [1, 5, 11, 17, 20]) {
      for (let i = 0; i < CLASS_IDS.length; i += 3) {
        const g = newGame(1, 'legacy', `ALL-${lvl}-${i}`);
        g.profile.unlockedBiomes = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
        g.roster = CLASS_IDS.slice(i, i + 3).map((c) => createHero(rng, c, lvl));
        g.roster.forEach(fullRestore);
        const biome = (['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'] as const)[(i / 3 + lvl) % 5];
        expect(dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome, difficulty: 'standard', seed: `ALL-${lvl}-${i}` }).ok).toBe(true);
        const rep = autoExpedition(g, 8000);
        expect(rep.result, `L${lvl} ${CLASS_IDS.slice(i, i + 3).join('/')} in ${biome}`).not.toBe('stuck');
      }
    }
  }, 120000);
});

describe('saves', () => {
  it('export/import round-trips and rejects tampering', () => {
    const g = newGame(2, 'story', 'SAVE');
    const text = exportSave(g);
    const r = importSave(text, 3);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.game.roster.length).toBe(3);
    const bad = text.replace('\\"bankedGold\\":150', '\\"bankedGold\\":999999');
    expect(bad).not.toBe(text);
    expect(importSave(bad, 3).ok).toBe(false);
    expect(importSave('{"nope":1}', 1).ok).toBe(false);
    expect(migrate(clone(g)).schemaVersion).toBe(1);
  });
});
