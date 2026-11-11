import { describe, it, expect } from 'vitest';
import { newGame, refreshRecruits, STARTING_GOLD } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoCombatStep, autoExploreStep, autoLevelChoices } from '../src/app/autoplay.ts';
import { createHero } from '../src/rules/character.ts';
import { Rng } from '../src/engine/rng.ts';
import { TUT } from '../src/dungeon/tutorial.ts';
import { MONSTERS, biomeMonsters } from '../src/content/monsters.ts';
import { CHAPTERS, finaleSealed } from '../src/content/story.ts';

describe('new keep', () => {
  it('starts poor, with a pending tour', () => {
    const g = newGame(1, 'legacy', 'NEW');
    expect(g.profile.bankedGold).toBe(STARTING_GOLD);
    expect(STARTING_GOLD).toBeLessThanOrEqual(50);
    expect(g.tutorial).toEqual({ step: 0, tips: [] });
  });

  it('never repeats a hero name across many recruit rerolls', () => {
    const g = newGame(1, 'legacy', 'NAMES');
    for (let i = 0; i < 40; i++) {
      // Hire everyone so the roster keeps growing, then roll new faces.
      g.roster.push(...g.recruits);
      refreshRecruits(g);
      const names = [...g.roster, ...g.recruits].map((h) => h.name);
      expect(new Set(names).size).toBe(names.length);
    }
    expect(g.recruits.every((h) => h.name.includes(' '))).toBe(true);
  });
});

function playOut(g: ReturnType<typeof newGame>, max = 3000) {
  for (let i = 0; i < max && g.expedition; i++) {
    const exp = g.expedition;
    if (exp.combat && exp.combat.status === 'active') autoCombatStep(g);
    else if (!autoExploreStep(g)) break;
  }
}

describe('the training cellar', () => {
  it('is a fixed, gentle dungeon that takes a fresh party from level 1 to 2 without a sigil', () => {
    const g = newGame(1, 'legacy', 'TUT');
    const ids = g.roster.map((h) => h.id);
    expect(dispatch(g, { type: 'startExpedition', partyIds: ids, biome: 'mirror', difficulty: 'perilous', seed: 'X', tutorial: true }).ok).toBe(true);
    const exp = g.expedition!;
    expect(exp.tutorial).toBe(true);
    expect(exp.biome).toBe('cinder');
    expect(exp.difficulty).toBe('explorer');
    expect(exp.pos).toBe(TUT.entrance);
    expect(exp.map.rooms[TUT.fight].encounter?.monsters).toEqual(['cellarRat', 'cellarRat'])
    expect(exp.map.rooms[TUT.boss].encounter?.monsters).toEqual(['oldCooper']);
    playOut(g);
    expect(g.lastResult?.tutorial).toBe(true);
    expect(g.lastResult?.kind).toBe('won');
    expect(g.roster.every((h) => h.status === 'alive')).toBe(true);
    expect(g.roster.every((h) => h.pendingLevel)).toBe(true);
    expect(g.profile.sigils.cinder ?? 0).toBe(0);
    expect(g.profile.unlockedBiomes).toEqual(['cinder']);
    for (const h of g.roster) expect(dispatch(g, { type: 'levelUp', heroId: h.id, choices: autoLevelChoices(h) }).ok).toBe(true);
    expect(g.roster.every((h) => h.level === 2)).toBe(true);
  });
});

describe('Tiamat', () => {
  it('is the final boss, never rolled into an ordinary echo', () => {
    expect(MONSTERS.tiamat.finale).toBe(true);
    expect(biomeMonsters('starfall', true).some((m) => m.id === 'tiamat')).toBe(false);
  });

  it('needs all five echoes cleared and a level 20 hero in the party', () => {
    const g = newGame(1, 'story', 'FIN');
    const ids = g.roster.map((h) => h.id);
    const champ = createHero(new Rng([9, 9, 9, 9]), 'fighter', 20, { name: 'Champion Test' });
    g.roster.push(champ);
    // A champion alone is not enough: the Sixth Door waits on the other five.
    const sealed = dispatch(g, { type: 'startExpedition', partyIds: [champ.id, ids[1], ids[2]], biome: 'starfall', difficulty: 'standard', seed: 'F', finale: true });
    expect(sealed.ok).toBe(false);
    expect(sealed.error).toMatch(/five other echoes/);
    expect(finaleSealed(g)).toMatch(/clear the other 5 echoes/);
    for (const b of ['cinder', 'rootbound', 'drowned', 'mirror'] as const) g.profile.sigils[b] = 1;
    expect(finaleSealed(g)).toMatch(/other 1 echo first/);
    g.profile.sigils.starfall = 1;
    expect(finaleSealed(g)).toBeNull();
    // Every echo broken, but nobody level 20 in the chosen party.
    const r = dispatch(g, { type: 'startExpedition', partyIds: ids, biome: 'starfall', difficulty: 'standard', seed: 'F', finale: true });
    expect(r.ok).toBe(false);
    const ok = dispatch(g, { type: 'startExpedition', partyIds: [champ.id, ids[1], ids[2]], biome: 'cinder', difficulty: 'standard', seed: 'F', finale: true });
    expect(ok.ok).toBe(true);
    const exp = g.expedition!;
    expect(exp.finale).toBe(true);
    expect(exp.map.rooms[exp.map.bossKey].encounter!.monsters[0]).toBe('tiamat');
  });

  it('every echo has a story chapter', () => {
    for (const b of ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'] as const) expect(CHAPTERS[b].text.length).toBeGreaterThan(0);
  });
});
