import { describe, it, expect } from 'vitest';
import { newGame, refreshRecruits } from '../src/meta/town.ts';
import { nameParts, uniqueName } from '../src/content/origins.ts';
import { createHero } from '../src/rules/character.ts';
import { Rng } from '../src/engine/rng.ts';
import { SPECIES } from '../src/content/origins.ts';
import game from '../src/locales/en/game.json';

const species = Object.keys(SPECIES);
const tables = (game as unknown as { heroNames: Record<string, Record<string, string[]>> }).heroNames;

describe('hero names', () => {
  it('every species has its own name tables', () => {
    expect(Object.keys(tables).sort()).toEqual([...species].sort());
    for (const sp of species) for (const k of ['female', 'male', 'surnameStart', 'surnameEnd']) expect(tables[sp][k].length).toBeGreaterThanOrEqual(12);
  });

  it('no first name or surname half is shared between species', () => {
    for (const role of [['female', 'male'], ['surnameStart'], ['surnameEnd']]) {
      const owner = new Map<string, string>();
      for (const sp of species) for (const n of role.flatMap((r) => tables[sp][r])) {
        expect(owner.get(n.toLowerCase()), `${n} is both ${owner.get(n.toLowerCase())} and ${sp}`).toBeUndefined();
        owner.set(n.toLowerCase(), sp);
      }
    }
  });

  it('a recruit is named from their own species and sex', () => {
    const rng = new Rng([5, 4, 3, 2]);
    for (let i = 0; i < 300; i++) {
      const h = createHero(rng, 'fighter', 1, { rolled: true });
      const p = nameParts(h.ancestry);
      const [first, ...rest] = h.name.split(' ');
      expect(h.sex === 'female' ? p.female : p.male).toContain(first);
      const last = rest.join(' ');
      expect(p.surnameStart.some((s) => last.startsWith(s) && p.surnameEnd.some((e) => last === s + e.toLowerCase())), `${h.name} (${h.ancestry})`).toBe(true);
    }
  });

  it('many draws give many different names, avoiding repeated first names and surnames', () => {
    const rng = new Rng([9, 9, 9, 9]);
    const taken: string[] = [];
    for (let i = 0; i < 25; i++) taken.push(uniqueName(rng, taken, 'dwarf', i % 2 ? 'male' : 'female'));
    expect(new Set(taken.map((n) => n.split(' ')[0])).size).toBe(25);
    expect(new Set(taken.map((n) => n.split(' ')[1])).size).toBe(25);
  });

  it('the starting three keep their names', () => {
    const g = newGame(1, 'legacy', 'START');
    refreshRecruits(g);
    expect(g.roster.map((h) => h.name)).toEqual(['Ross Heartwood', 'Kelsey Coppervein', 'Pippen Underbough']);
  });
});
