/**
 * The Keep's record in one place (for the Chronicle and the share card) and a
 * short, reproducible tripcode made from it: the same record always gives the
 * same code, so a card can be matched to the save that made it. It is a
 * fingerprint, not a lock: anyone who can edit a save can make a matching card.
 */
import type { GameState, Hero } from '../engine/types.ts';
import { BIOME_ORDER } from '../content/biomes.ts';
import { CHARMS } from '../fortune/charms.ts';
import { HANDS } from '../fortune/hands.ts';
import { EVIDENCE } from '../content/quest.ts';
import { has } from './quest.ts';
import { storyOf } from '../content/story.ts';
import { subclassOf } from '../content/subclasses.ts';

/**
 * 101 symbols: printable ASCII without the space, quotes, backslash, backtick, the
 * look-alikes 0 O 1 l I | and the specks , . : ; (easy to miss on a card), plus a few
 * glyphs every system font draws.
 * 101^8 > 2^53, so eight symbols carry the whole hash.
 */
export const TRIP_ALPHABET = '!#$%&()*+-/23456789<=>?@ABCDEFGHJKLMNPQRSTUVWXYZ[]^_abcdefghijkmnopqrstuvwxyz{}~✦★☽§¶±µßØÞÆΩΔΣΨλπ£¥€¢';
export const TRIP_LENGTH = 8;

/** The Keep's three best heroes: living first, by level, clears and kills. */
export function topThree(g: GameState): Hero[] {
  const score = (x: Hero) => x.level * 10000 + x.history.clears * 100 + x.history.kills;
  const alive = g.roster.filter((x) => x.status === 'alive').sort((a, b) => score(b) - score(a));
  const fallen = g.roster.filter((x) => x.status === 'dead').sort((a, b) => score(b) - score(a));
  return [...alive, ...fallen].slice(0, 3);
}

export interface KeepSummary {
  mode: GameState['mode'];
  keeper: string;
  day: number;
  sigils: number[];
  tiamat: number;
  stats: GameState['profile']['stats'];
  charms: [number, number];
  monsters: number;
  hands: [number, number];
  evidence: [number, number];
  fallen: number;
  heroes: { name: string; cls: string; sub?: string; species: string; level: number; dead: boolean; clears: number; kills: number }[];
}

/** Everything the card shows, in a fixed shape and order. */
export function keepSummary(g: GameState): KeepSummary {
  const p = g.profile;
  return {
    mode: g.mode,
    keeper: p.keeperName ?? '',
    day: p.townDay,
    sigils: BIOME_ORDER.map((b) => p.sigils[b] ?? 0),
    tiamat: storyOf(g).tiamat,
    stats: { expeditions: p.stats.expeditions, clears: p.stats.clears, wipes: p.stats.wipes, deaths: p.stats.deaths, bestScore: p.stats.bestScore, retreats: p.stats.retreats },
    charms: [p.codex.charms.length, CHARMS.length],
    monsters: p.codex.monsters.length,
    hands: [p.codex.hands.length, HANDS.length],
    evidence: [Object.values(EVIDENCE).filter((e) => has(g, `ev:${e.id}`)).length, Object.keys(EVIDENCE).length],
    fallen: g.roster.filter((x) => x.status === 'dead').length,
    heroes: topThree(g).map((x) => ({ name: x.name, cls: x.classId, sub: subclassOf(x)?.id, species: x.ancestry, level: x.level, dead: x.status === 'dead', clears: x.history.clears, kills: x.history.kills })),
  };
}

/** cyrb53: a fast, well-mixed 53-bit string hash. */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Eight symbols from TRIP_ALPHABET for a summary (or any string). */
export function tripcodeOf(data: KeepSummary | string): string {
  let n = cyrb53(typeof data === 'string' ? data : JSON.stringify(data));
  const abc = [...TRIP_ALPHABET];
  let out = '';
  for (let i = 0; i < TRIP_LENGTH; i++) { out += abc[n % abc.length]; n = Math.floor(n / abc.length); }
  return out;
}

export const tripcode = (g: GameState): string => tripcodeOf(keepSummary(g));
