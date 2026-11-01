/** Tabletop dice expressions: XdY+Z, advantage/disadvantage, crit doubling. */
import type { Rng } from './rng.ts';

export interface DiceExpr {
  count: number;
  sides: number;
  bonus: number;
}

const RE = /^\s*(\d*)d(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i;

export function parseDice(expr: string): DiceExpr {
  const flat = /^\s*([+-]?\d+)\s*$/.exec(expr);
  if (flat) return { count: 0, sides: 0, bonus: Number(flat[1]) };
  const m = RE.exec(expr);
  if (!m) throw new Error(`bad dice expression: ${expr}`);
  const count = m[1] === '' ? 1 : Number(m[1]);
  const sides = Number(m[2]);
  const bonus = m[3] ? (m[3] === '-' ? -1 : 1) * Number(m[4]) : 0;
  return { count, sides, bonus };
}

export function formatDice(d: DiceExpr): string {
  if (d.count === 0) return String(d.bonus);
  const b = d.bonus === 0 ? '' : d.bonus > 0 ? `+${d.bonus}` : `${d.bonus}`;
  return `${d.count}d${d.sides}${b}`;
}

export interface RollResult {
  total: number;
  rolls: number[];
}

/** Roll; `crit` doubles the number of dice (not the flat bonus), per 5e. */
export function roll(rng: Rng, expr: string | DiceExpr, opts: { crit?: boolean; maximize?: boolean; minDie?: number } = {}): RollResult {
  const d = typeof expr === 'string' ? parseDice(expr) : expr;
  const n = d.count * (opts.crit ? 2 : 1);
  const rolls: number[] = [];
  for (let i = 0; i < n; i++) {
    let r = opts.maximize ? d.sides : rng.die(d.sides);
    if (opts.minDie && r < opts.minDie) r = opts.minDie;
    rolls.push(r);
  }
  return { total: rolls.reduce((a, b) => a + b, 0) + d.bonus, rolls };
}

export function average(expr: string | DiceExpr): number {
  const d = typeof expr === 'string' ? parseDice(expr) : expr;
  return d.count * (d.sides + 1) / 2 + d.bonus;
}

export type Advantage = 'normal' | 'advantage' | 'disadvantage';

export function combineAdvantage(adv: number, dis: number): Advantage {
  // 5e: any advantage + any disadvantage cancel.
  if (adv > 0 && dis === 0) return 'advantage';
  if (dis > 0 && adv === 0) return 'disadvantage';
  return 'normal';
}

export interface D20Result {
  natural: number;
  rolls: number[];
}

export function rollD20(rng: Rng, mode: Advantage = 'normal'): D20Result {
  const a = rng.die(20);
  if (mode === 'normal') return { natural: a, rolls: [a] };
  const b = rng.die(20);
  return { natural: mode === 'advantage' ? Math.max(a, b) : Math.min(a, b), rolls: [a, b] };
}

export function scaleDice(expr: string, mult: number): string {
  const d = parseDice(expr);
  return formatDice({ ...d, count: d.count * mult });
}
