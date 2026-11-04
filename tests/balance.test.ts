import { describe, it, expect } from 'vitest';
import { newGame } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoExploreStep, autoCombatStep } from '../src/app/autoplay.ts';
import { createHero, fullRestore, makeItem } from '../src/rules/character.ts';
import { Rng, seedState } from '../src/engine/rng.ts';
import { newCharm } from '../src/fortune/charms.ts';
import { MONSTERS, monsterTraits, monsterActions } from '../src/content/monsters.ts';
import { rollEncounter, monsterIdOf } from '../src/dungeon/generator.ts';
import { DIFFICULTY_MOD, DIFFICULTY_ORDER, levelPressure } from '../src/rules/balance.ts';
import type { Combatant, GameState } from '../src/engine/types.ts';

/** A fighter party at its first hero turn with two or more foes standing. */
function fighterTurn(weapon?: string): GameState {
  for (let i = 0; i < 40; i++) {
    const g = newGame(1, 'legacy', `OK-${i}`);
    const rng = new Rng([i + 1, 2, 3, 4]);
    g.roster = (['fighter', 'fighter', 'fighter'] as const).map((c) => createHero(rng, c, 3));
    if (weapon) for (const h of g.roster) { h.equipment.mainHand = makeItem(rng, weapon); delete h.equipment.offHand; }
    g.roster.forEach(fullRestore);
    dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'cinder', difficulty: 'standard', seed: `OK-${i}` });
    let guard = 0;
    while (g.expedition && g.expedition.combat?.status !== 'active' && guard++ < 300) autoExploreStep(g);
    const c = () => g.expedition?.combat;
    guard = 0;
    while (c()?.status === 'active' && !(c()!.turn && c()!.combatants[c()!.turn!.actorId].side === 'hero') && guard++ < 50) autoCombatStep(g);
    const live = Object.values(c()?.combatants ?? {}).filter((x) => x.side === 'enemy' && !x.dead);
    if (c()?.status === 'active' && c()!.turn && live.length >= 2) return g;
  }
  throw new Error('no two-foe fight found');
}

/** Sets up a one-HP victim and a healthy bystander, forces a natural 20, attacks the victim. */
function overkillHit(g: GameState): { bystander: Combatant; before: number } {
  const combat = g.expedition!.combat!;
  const foes = Object.values(combat.combatants).filter((x) => x.side === 'enemy' && !x.dead);
  const [victim, bystander] = foes;
  for (const f of foes) if (f.mon) f.mon.traits = [];
  victim.hp = 1;
  victim.tempHp = 0;
  const before = bystander.hp;
  combat.turn!.loaded = true;
  const r = dispatch(g, { type: 'combat', cmd: { type: 'act', key: 'attack', targets: [victim.id], dice: [] } });
  expect(r.ok).toBe(true);
  expect(victim.dead).toBe(true);
  return { bystander, before };
}

describe('overkill', () => {
  it('a plain weapon kill stops at the body it kills', () => {
    const g = fighterTurn('longsword');
    const { bystander, before } = overkillHit(g);
    expect(bystander.hp).toBe(before);
  });

  it('Cleave weapons carry the overkill into the next foe', () => {
    const g = fighterTurn('greataxe');
    const { bystander, before } = overkillHit(g);
    expect(bystander.hp).toBeLessThan(before);
  });

  it("the Butcher's Hook charm makes any single-target kill carry over", () => {
    const g = fighterTurn('longsword');
    g.expedition!.fortune.charms.push(newCharm('butchersHook'));
    const { bystander, before } = overkillHit(g);
    expect(bystander.hp).toBeLessThan(before);
  });
});

describe('monster tiers', () => {
  it('roles gain traits from heroic tier on, and more at mythic', () => {
    const hound = MONSTERS.slagHound;
    expect(monsterTraits(hound, 10)).toEqual([]);
    expect(monsterTraits(hound, 11)).toContain('multiattack');
    expect(monsterTraits(hound, 17)).toEqual(expect.arrayContaining(['multiattack', 'frenzy']));
    expect(monsterTraits(MONSTERS.forgemaster, 17)).toContain('lair');
    // Artillery learns an area barrage at heroic tier.
    expect(monsterActions(MONSTERS.emberImp, 5).some((a) => a.id === 'barrage')).toBe(false);
    expect(monsterActions(MONSTERS.emberImp, 12).some((a) => a.id === 'barrage')).toBe(true);
  });

  it('greater foes only join encounters inside their level band', () => {
    const rng = new Rng(seedState('BAND'));
    const seen = (level: number) => {
      const ids = new Set<string>();
      for (let i = 0; i < 300; i++) for (const e of rollEncounter(rng, 'cinder', level, 'normal', 'standard')) ids.add(monsterIdOf(e).id);
      return ids;
    };
    const low = seen(3), mid = seen(10), high = seen(16);
    expect(low.has('cinderGiant')).toBe(false);
    expect(mid.has('cinderGiant')).toBe(true);
    expect(mid.has('pyreDrake')).toBe(false);
    expect(high.has('pyreDrake')).toBe(true);
    expect(high.has('sootGoblin')).toBe(false);
    for (const id of [...low, ...mid, ...high]) {
      const m = MONSTERS[id];
      expect(m.biome).toBe('cinder');
    }
  });

  it('difficulty steps are monotonic and pressure stays in a sane range', () => {
    for (let i = 1; i < DIFFICULTY_ORDER.length; i++) {
      const a = DIFFICULTY_MOD[DIFFICULTY_ORDER[i - 1]], b = DIFFICULTY_MOD[DIFFICULTY_ORDER[i]];
      expect(b.hp).toBeGreaterThanOrEqual(a.hp);
      expect(b.dmg).toBeGreaterThanOrEqual(a.dmg);
      expect(b.enemies + b.bossAdds).toBeGreaterThanOrEqual(a.enemies + a.bossAdds);
    }
    for (let L = 1; L <= 20; L++) {
      const p = levelPressure(L);
      expect(p.hp).toBeGreaterThan(0.8);
      expect(p.hp).toBeLessThan(1.6);
      expect(p.dmg).toBeGreaterThan(0.8);
      expect(p.dmg).toBeLessThan(1.6);
    }
  });
});
