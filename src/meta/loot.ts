/** Procedural loot with bounded rarity and biome-themed affixes (plan §7). */
import type { BiomeId, ClassId, ItemInstance } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';
import { ITEMS, AFFIXES } from '../content/items.ts';
import { makeItem } from '../rules/character.ts';

const BIOME_AFFIX: Record<BiomeId, string[]> = {
  cinder: ['flaming', 'embers', 'gilded'],
  rootbound: ['vampiric', 'vitality', 'lucky'],
  drowned: ['frost', 'tides', 'shocking'],
  mirror: ['keen', 'warding', 'lucky'],
  starfall: ['holy', 'swiftness', 'vampiric'],
};

/** Tier 0..4 by party level. */
export function lootTier(level: number): number {
  return level >= 17 ? 4 : level >= 11 ? 3 : level >= 7 ? 2 : level >= 3 ? 1 : 0;
}

export function rollItem(rng: Rng, level: number, biome: BiomeId, opts: { boost?: number; forClass?: ClassId } = {}): ItemInstance {
  const tier = Math.min(4, lootTier(level) + (opts.boost ?? 0));
  const r = rng.next();
  // Consumables are the most common drop.
  if (r < 0.38) {
    const pool = Object.values(ITEMS).filter((d) => d.kind === 'consumable' && (d.shopTier ?? 0) <= tier + 1 && d.id !== 'diamond');
    const def = rng.pick(pool);
    return makeItem(rng, def.id, 0, [], def.id.startsWith('potion') ? rng.int(1, 2) : 1);
  }
  if (r < 0.58) {
    const pool = Object.values(ITEMS).filter((d) => d.kind === 'trinket' && !d.tool && (d.shopTier ?? 1) <= tier + 1);
    const def = rng.pick(pool);
    const aff = tier >= 2 && rng.chance(0.3) ? [rollAffix(rng, 'trinket', biome, tier)].filter(Boolean) as string[] : [];
    return makeItem(rng, def.id, 0, aff);
  }
  const gear = Object.values(ITEMS).filter((d) => (d.kind === 'weapon' || d.kind === 'armor' || d.kind === 'shield') && (tier >= 2 || d.price <= 200));
  const def = rng.pick(gear);
  const plus = Math.min(3, rng.chance(0.35 + tier * 0.12) ? 1 + (tier >= 3 && rng.chance(0.4) ? 1 : 0) + (tier >= 4 && rng.chance(0.3) ? 1 : 0) : 0);
  const nAff = rng.chance(0.5 + tier * 0.1) ? 1 + (tier >= 3 && rng.chance(0.35) ? 1 : 0) : 0;
  const affixes: string[] = [];
  for (let i = 0; i < nAff; i++) {
    const a = rollAffix(rng, def.kind, biome, tier);
    if (a && !affixes.includes(a)) affixes.push(a);
  }
  return makeItem(rng, def.id, plus, affixes);
}

function rollAffix(rng: Rng, kind: string, biome: BiomeId, tier: number): string | null {
  const all = Object.values(AFFIXES).filter((a) => a.kinds.includes(kind as never) && a.minTier <= tier);
  if (!all.length) return null;
  const themed = all.filter((a) => BIOME_AFFIX[biome].includes(a.id));
  return (themed.length && rng.chance(0.6) ? rng.pick(themed) : rng.pick(all)).id;
}

const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, veryRare: 3, legendary: 4 };

/**
 * A guaranteed magic item (never a consumable). `quality` is the number of
 * difficulty steps above Standard: each step raises the floor on enchantment
 * (+N, affix count) and on trinket rarity.
 */
export function rollMagicItem(rng: Rng, level: number, biome: BiomeId, quality: number): ItemInstance {
  const tier = Math.min(4, lootTier(level) + quality);
  if (rng.chance(0.4)) {
    const minRarity = quality >= 2 ? 2 : 1;
    const ok = (d: (typeof ITEMS)[string]) => d.kind === 'trinket' && !d.tool && (d.shopTier ?? 1) <= tier + 1;
    let pool = Object.values(ITEMS).filter((d) => ok(d) && RARITY_RANK[d.rarity] >= minRarity);
    if (!pool.length) pool = Object.values(ITEMS).filter(ok);
    const def = rng.pick(pool);
    const aff = rng.chance(0.25 + quality * 0.25) ? [rollAffix(rng, 'trinket', biome, tier)].filter(Boolean) as string[] : [];
    return makeItem(rng, def.id, 0, aff);
  }
  const gear = Object.values(ITEMS).filter((d) => (d.kind === 'weapon' || d.kind === 'armor' || d.kind === 'shield') && (tier >= 2 || d.price <= 200));
  const def = rng.pick(gear);
  const plus = Math.min(3, Math.max(1, quality) + (rng.chance(0.25 + tier * 0.1) ? 1 : 0));
  const nAff = Math.max(1, quality) + (tier >= 3 && rng.chance(0.3) ? 1 : 0);
  const affixes: string[] = [];
  for (let i = 0; i < nAff * 3 && affixes.length < nAff; i++) {
    const a = rollAffix(rng, def.kind, biome, tier);
    if (a && !affixes.includes(a)) affixes.push(a);
  }
  return makeItem(rng, def.id, plus, affixes);
}

/** Boss reward: three distinct items to choose from; harder runs offer finer ones. */
export function bossLootChoice(rng: Rng, level: number, biome: BiomeId, quality = 0): ItemInstance[] {
  const out: ItemInstance[] = [];
  let guard = 0;
  while (out.length < 3 && guard++ < 30) {
    const it = quality > 0 ? rollMagicItem(rng, level, biome, quality) : rollItem(rng, level, biome, { boost: 1 });
    if (ITEMS[it.defId].kind === 'consumable') continue;
    if (out.some((o) => o.defId === it.defId)) continue;
    out.push(it);
  }
  return out;
}
