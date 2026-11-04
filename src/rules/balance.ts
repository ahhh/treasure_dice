/**
 * Tuning knobs. This game runs the fifth-edition kernel on a bigger number
 * scale so the Fortune multiplier has room to breathe:
 *   hero HP and healing   × VITALITY
 *   monster HP            × the curve below, then × dungeon depth
 * Values were calibrated with scripts/sim.ts (Monte Carlo party-vs-dungeon).
 */
export const VITALITY = 2.5;

/** Echo factor for damage that doesn't pass through a Fortune hand (reactions, riders, zones). */
export const ECHO = 6;

/** Heals scale with a gentler slope of the hand's mult. */
export const HEAL_MULT_SLOPE = 0.5;

/** Monster stat curves by effective level (1–20). */
export function monsterHp(level: number): number {
  // Slope 0.17 (was 0.15) absorbs part of the Dice Path: heroes still grow, fights stay fights.
  return Math.round(220 * (1 + 0.17 * (level - 1)));
}
export function monsterDamage(level: number): number {
  return Math.round(8.2 + 2.45 * (level - 1));
}
export function monsterAttack(level: number): number {
  return 3 + Math.ceil(level * 0.55);
}
export function monsterAc(level: number): number {
  return 12 + Math.floor(level / 3);
}
export function monsterDc(level: number): number {
  return 10 + Math.ceil(level * 0.45);
}

/**
 * Level pressure: a multiplier on monster HP and damage by party level. Heroes'
 * class features, Dice Path marks and loot outgrow the raw curve fastest in
 * the mid levels; this keeps the challenge flat from level 1 to 20. Tier
 * traits (content/monsters.ts ROLE_TRAITS) carry part of the load from 11 on,
 * which is why the table eases there. Calibrated with scripts/playtest.ts.
 */
const PRESSURE: [hp: number, dmg: number][] = [
  /* 0 */ [1, 1],
  /* 1-4 */ [1.0, 1.0], [1.06, 1.06], [1.18, 1.2], [1.24, 1.28],
  /* 5-10 */ [1.34, 1.46], [1.36, 1.48], [1.36, 1.48], [1.36, 1.48], [1.36, 1.46], [1.32, 1.42],
  /* 11-16 */ [1.24, 1.3], [1.24, 1.3], [1.22, 1.28], [1.18, 1.24], [1.18, 1.24], [1.18, 1.22],
  /* 17-20 */ [1.06, 1.1], [1.06, 1.08], [1.04, 1.06], [1.0, 1.04],
];
export function levelPressure(level: number): { hp: number; dmg: number } {
  const [hp, dmg] = PRESSURE[Math.max(1, Math.min(20, Math.round(level)))];
  return { hp, dmg };
}

/** Within a run, each combat cleared hardens the dungeon (Balatro's ante). */
export function depthScale(depth: number, level = 1): number {
  // Bigger high-tier dungeons have more fights, so each step hardens less.
  const base = level >= 11 ? 1.11 : level >= 5 ? 1.16 : 1.22;
  return Math.pow(base, depth);
}

/**
 * Difficulty tiers. `rank` counts steps above Standard: each step adds one
 * guaranteed magic item to the boss hoard and lifts the quality of every drop.
 * Harder runs never grant extra levels — a clear is still one level.
 * `enemies` extra foes per fight start at `enemiesFrom` (a level-1 party can't
 * absorb a whole extra monster, so early on the step is carried by hp/dmg).
 */
export const DIFFICULTY_MOD = {
  explorer: { rank: 0, hp: 0.82, dmg: 0.82, gold: 0.9, enemies: 0, enemiesFrom: 1, bossAdds: 0, eliteCurse: false },
  standard: { rank: 0, hp: 1.03, dmg: 1.03, gold: 1, enemies: 0, enemiesFrom: 1, bossAdds: 0, eliteCurse: false },
  perilous: { rank: 1, hp: 1.1, dmg: 1.08, gold: 1.5, enemies: 1, enemiesFrom: 3, bossAdds: 1, eliteCurse: true },
  deadly: { rank: 2, hp: 1.22, dmg: 1.18, gold: 2, enemies: 1, enemiesFrom: 3, bossAdds: 2, eliteCurse: true },
} as const;

export const DIFFICULTY_ORDER = ['explorer', 'standard', 'perilous', 'deadly'] as const;

export const DIFFICULTY_INFO: Record<keyof typeof DIFFICULTY_MOD, string> = {
  explorer: 'Softer foes and a gentler climb; slightly less gold. A good first legacy.',
  standard: 'The intended challenge: real fights from the first door to the last, and heroes can die.',
  perilous: 'More foes, tougher fights, cursed elites, ×1.5 gold. Better loot, +1 bonus magic item for beating the boss.',
  deadly: 'Brutal: much tougher foes, crowded boss lairs, cursed elites, ×2 gold. Much better loot, +2 bonus magic items for beating the boss. Expect funerals.',
};

export const ROLE_MOD: Record<string, { hp: number; dmg: number; ac: number; atk: number }> = {
  brute: { hp: 1.35, dmg: 1.25, ac: -1, atk: 0 },
  skirmisher: { hp: 0.8, dmg: 1.0, ac: 1, atk: 1 },
  controller: { hp: 0.9, dmg: 0.8, ac: 0, atk: 0 },
  artillery: { hp: 0.75, dmg: 1.1, ac: -1, atk: 1 },
  healer: { hp: 0.85, dmg: 0.7, ac: 0, atk: 0 },
  defender: { hp: 1.6, dmg: 0.8, ac: 3, atk: -1 },
  minion: { hp: 0.45, dmg: 0.7, ac: -1, atk: 0 },
  boss: { hp: 6.2, dmg: 1.45, ac: 2, atk: 2 },
};

export const ELITE_MOD = { hp: 1.8, dmg: 1.25, ac: 1, atk: 1 };

/** Gold per combat, scaled by level. */
export function goldReward(level: number, kind: string): number {
  const base = 12 + level * 8;
  return Math.round(base * (kind === 'boss' ? 6 : kind === 'elite' ? 2.5 : 1));
}

export const DOUBLOONS_PER_COMBAT = { normal: 3, ambush: 3, elite: 5, boss: 8 } as const;
