import { describe, it, expect } from 'vitest';
import { generateDungeon, validate, DIRS, OPPOSITE } from '../src/dungeon/generator.ts';
import { Rng, seedState } from '../src/engine/rng.ts';
import type { BiomeId } from '../src/engine/types.ts';
import { MONSTERS } from '../src/content/monsters.ts';
import { EVENTS } from '../src/content/events.ts';

const BIOMES: BiomeId[] = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];

describe('dungeon generator (property)', () => {
  it('produces solvable, symmetric maps across 1000 seeds and all tiers', () => {
    for (let i = 0; i < 1000; i++) {
      const biome = BIOMES[i % 5];
      const level = 1 + (i % 20);
      const map = generateDungeon(new Rng(seedState(`P-${i}`)), { seed: `P-${i}`, biome, level, difficulty: 'standard' });
      expect(validate(map).ok).toBe(true);
      const rooms = Object.values(map.rooms);
      expect(rooms.filter((r) => r.type === 'boss').length).toBe(1);
      expect(rooms.filter((r) => r.type === 'key').length).toBe(1);
      expect(rooms.some((r) => r.type === 'camp')).toBe(true);
      for (const r of rooms) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x).toBeLessThan(map.width);
        expect(r.y).toBeLessThan(map.height);
        for (const d of DIRS) {
          const e = r.exits[d];
          if (e) expect(map.rooms[e.to].exits[OPPOSITE[d]]?.to).toBe(r.key);
        }
        for (const m of r.encounter?.monsters ?? []) expect(MONSTERS[m.replace('elite:', '')]).toBeTruthy();
        if (r.eventId) expect(EVENTS[r.eventId]).toBeTruthy();
      }
    }
  });
  it('is deterministic for a seed', () => {
    const a = generateDungeon(new Rng(seedState('SAME')), { seed: 'SAME', biome: 'mirror', level: 4, difficulty: 'perilous' });
    const b = generateDungeon(new Rng(seedState('SAME')), { seed: 'SAME', biome: 'mirror', level: 4, difficulty: 'perilous' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
