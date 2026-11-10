/** The five echoes, each behind its own door (plan §6); Tiamat waits behind the sixth. */
import type { BiomeId, RoomType } from '../engine/types.ts';
import { textTable } from '../i18n/index.ts';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  tagline: string;
  premise: string;
  color: string;
  accent: string;
  meter: { name: string; max: number; text: string; icon: string };
  rooms: Partial<Record<RoomType, string[]>>;
  atmosphere: string[];
  details: string[];
  civilizations: string[];
  factions: string[];
  anomalies: string[];
  objectives: string[];
  hooks: string[];
  /** Room tag that carries the biome mechanic and its probability. */
  tag: { id: string; chance: number; label: string };
  /** Room tag that resets the meter. */
  resetTag: { id: string; label: string };
  scenes: string[];
}

/** Every word about an echo (names, meter, room names, flavour lines) is game.json → biomes.<id>. */
export const BIOMES = textTable<Record<BiomeId, BiomeDef>, 'name' | 'tagline' | 'premise' | 'text' | 'label' | 'rooms' | 'atmosphere' | 'details' | 'civilizations' | 'factions' | 'anomalies' | 'objectives' | 'hooks'>('game', ['biomes'], {
  cinder: {
    id: 'cinder', color: '#e4643a', accent: '#ffb347',
    meter: { max: 6, icon: '🔥' },
                                    tag: { id: 'hot', chance: 0.4 },
    resetTag: { id: 'cool' },
    scenes: ['corridor', 'forge', 'vault', 'boss'],
  },
  rootbound: {
    id: 'rootbound', color: '#5fae5b', accent: '#c8e070',
    meter: { max: 6, icon: '🍄' },
                                    tag: { id: 'spore', chance: 0.5 },
    resetTag: { id: 'quiet' },
    scenes: ['corridor', 'tomb', 'grove', 'boss'],
  },
  drowned: {
    id: 'drowned', color: '#3a8fb8', accent: '#7fe0e0',
    meter: { max: 1, icon: '🌊' },
                                    tag: { id: 'flooded', chance: 0.3 },
    resetTag: { id: 'pump' },
    scenes: ['corridor', 'library', 'pumps', 'boss'],
  },
  mirror: {
    id: 'mirror', color: '#c9d6ff', accent: '#f0a8ff',
    meter: { max: 3, icon: '🪞' },
                                    tag: { id: 'mirror', chance: 0.35 },
    resetTag: { id: 'dim' },
    scenes: ['corridor', 'chapel', 'lenses', 'boss'],
  },
  starfall: {
    id: 'starfall', color: '#8e7cff', accent: '#ffd36e',
    meter: { max: 3, icon: '🌌' },
                                    tag: { id: 'drift', chance: 0.35 },
    resetTag: { id: 'anchor' },
    scenes: ['corridor', 'graves', 'orrery', 'boss'],
  },
});

export const BIOME_ORDER: BiomeId[] = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
