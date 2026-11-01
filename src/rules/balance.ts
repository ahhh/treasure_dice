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
  return Math.round(220 * (1 + 0.15 * (level - 1)));
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

/** Within a run, each combat cleared hardens the dungeon (Balatro's ante). */
export function depthScale(depth: number, level = 1): number {
  // Bigger high-tier dungeons have more fights, so each step hardens less.
  const base = level >= 11 ? 1.11 : level >= 5 ? 1.16 : 1.22;
  return Math.pow(base, depth);
}

export const DIFFICULTY_MOD = {
  explorer: { hp: 0.8, dmg: 0.8, gold: 0.8, enemies: 0 },
  standard: { hp: 1, dmg: 1, gold: 1, enemies: 0 },
  perilous: { hp: 1.12, dmg: 1.12, gold: 1.5, enemies: 1 },
} as const;

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
