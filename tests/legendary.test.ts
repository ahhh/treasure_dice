import { describe, it, expect } from 'vitest';
import { newGame, shopItems, canEquip } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoExpedition } from '../src/app/autoplay.ts';
import { createHero, derive, fullRestore, makeItem } from '../src/rules/character.ts';
import { ITEMS, LEGENDARIES, legendPlus } from '../src/content/items.ts';
import { rollItem, rollMagicItem, rollLegendary, ownedLegends } from '../src/meta/loot.ts';
import { Rng } from '../src/engine/rng.ts';
import type { EquipSlot, Hero } from '../src/engine/types.ts';

const rng = () => new Rng([3, 1, 4, 1]);
function wear(h: Hero, id: string, slot?: EquipSlot): Hero {
  const def = ITEMS[id];
  const s: EquipSlot = slot ?? (def.kind === 'weapon' ? 'mainHand' : def.kind === 'shield' ? 'offHand' : def.kind === 'armor' ? 'armor' : 'trinket1');
  h.equipment[s] = makeItem(rng(), id, legendPlus(def));
  return h;
}

describe('legendary items', () => {
  it('about three dozen, spread across weapons, armor and trinkets and across levels 1-20', () => {
    expect(LEGENDARIES.length).toBe(36);
    const kinds = (k: string[]) => LEGENDARIES.filter((d) => k.includes(d.kind)).length;
    expect(kinds(['weapon'])).toBeGreaterThanOrEqual(10);
    expect(kinds(['armor', 'shield'])).toBeGreaterThanOrEqual(10);
    expect(kinds(['trinket'])).toBeGreaterThanOrEqual(10);
    const lv = LEGENDARIES.map((d) => d.legend!.level);
    expect(Math.min(...lv)).toBe(1);
    expect(Math.max(...lv)).toBe(20);
    expect(lv.filter((l) => l <= 6).length).toBeGreaterThanOrEqual(8);
    expect(lv.filter((l) => l >= 7 && l <= 13).length).toBeGreaterThanOrEqual(8);
    expect(lv.filter((l) => l >= 14).length).toBeGreaterThanOrEqual(8);
    for (const d of LEGENDARIES) {
      expect(d.art).toBe(`items/legend_${d.id}`);
      expect(d.text && d.legend!.lore && d.legend!.look).toBeTruthy();
    }
  });

  it('are never sold and never roll as ordinary loot', () => {
    const g = newGame(1, 'legacy', 'LG');
    g.profile.facility.armory = 9;
    g.profile.facility.apothecary = 9;
    expect(shopItems(g).some((id) => ITEMS[id].legend)).toBe(false);
    const r = rng();
    for (let i = 0; i < 2000; i++) {
      expect(ITEMS[rollItem(r, 20, 'starfall', { boost: 2 }).defId].legend).toBeUndefined();
      expect(ITEMS[rollMagicItem(r, 20, 'mirror', 2).defId].legend).toBeUndefined();
    }
  });

  it('turn up only from their level on, at most once per Keep', () => {
    const r = rng();
    for (let i = 0; i < 300; i++) {
      const it = rollLegendary(r, 4, new Set())!;
      expect(ITEMS[it.defId].legend!.level).toBeLessThanOrEqual(4);
    }
    const owned = new Set(LEGENDARIES.filter((d) => d.legend!.level <= 4).map((d) => d.id));
    expect(rollLegendary(r, 4, owned)).toBeNull();
    const g = newGame(1, 'legacy', 'OWN');
    g.vault.push(makeItem(r, 'frostbrand', 1));
    wear(g.roster[0], 'ladyLuck');
    expect([...ownedLegends(g)].sort()).toEqual(['frostbrand', 'ladyLuck']);
    // Tier-appropriate enchantment.
    expect(legendPlus(ITEMS.ladyLuck)).toBe(1);
    expect(legendPlus(ITEMS.dragonfang)).toBe(2);
    expect(legendPlus(ITEMS.vorpal)).toBe(3);
    expect(legendPlus(ITEMS.robeArchmagi)).toBe(0);
  });

  it('reshape builds', () => {
    // Spellthief's Kris: a wizard fights with Intelligence.
    const wiz = createHero(rng(), 'wizard', 5);
    const before = derive(wiz).main.toHit;
    wear(wiz, 'spellthiefKris');
    const d = derive(wiz);
    expect(d.main.ability).toBe('int');
    expect(d.main.toHit).toBeGreaterThan(before);
    // Robe of the Archmagi: unarmored AC 15 + DEX, +2 DC.
    const w2 = createHero(rng(), 'wizard', 18);
    const ac0 = derive(w2).ac, dc0 = derive(w2).spellDc;
    wear(w2, 'robeArchmagi');
    expect(derive(w2).ac).toBe(Math.max(ac0, 15 + derive(w2).mods.dex));
    expect(derive(w2).spellDc).toBe(dc0 + 2);
    // Mithral Shirt counts as light armor, so a rogue can wear it with full DEX.
    const rogue = createHero(rng(), 'rogue', 3);
    expect(canEquip(rogue, makeItem(rng(), 'mithralShirt', 1), 'armor')).toBeNull();
    expect(canEquip(rogue, makeItem(rng(), 'chainShirt'), 'armor')).not.toBeNull();
    wear(rogue, 'mithralShirt');
    expect(derive(rogue).ac).toBe(13 + derive(rogue).mods.dex + 1);
    // Demon Armor: claws for anyone.
    const f = createHero(rng(), 'fighter', 8);
    delete f.equipment.mainHand; delete f.equipment.offHand;
    wear(f, 'demonArmor');
    expect(derive(f).main.dice).toBe('1d8');
    expect(derive(f).main.type).toBe('slashing');
    // Twin Gale: two swings for a cleric.
    const cl = createHero(rng(), 'cleric', 8);
    expect(derive(cl).attacks).toBe(1);
    wear(cl, 'twinGale');
    expect(derive(cl).attacks).toBe(2);
    // Ring of Spell Storing helps casters, does nothing for a barbarian.
    const w3 = createHero(rng(), 'wizard', 5);
    const s0 = derive(w3).slots.slice();
    wear(w3, 'ringSpellStoring');
    expect(derive(w3).slots[1]).toBe(s0[1] + 1);
    expect(derive(w3).slots[2]).toBe(s0[2] + 1);
    const barb = wear(createHero(rng(), 'barbarian', 5), 'ringSpellStoring');
    expect(derive(barb).slots.every((n) => n === 0)).toBe(true);
    // Wolfmother's Pelt: an extra Rage.
    const b2 = createHero(rng(), 'barbarian', 13);
    const rage = derive(b2).resources.rage;
    wear(b2, 'wolfPelt');
    expect(derive(b2).resources.rage).toBe(rage + 1);
    // Animated Shield stacks with a two-hander, not with a real shield.
    const p = createHero(rng(), 'paladin', 10);
    wear(p, 'dragonfang');
    delete p.equipment.offHand;
    const acNo = derive(p).ac;
    wear(p, 'animatedShield', 'trinket2');
    expect(derive(p).ac).toBe(acNo + 2);
    // Trade-offs bite.
    const r2 = createHero(rng(), 'rogue', 14);
    const hp = derive(r2).maxHp;
    wear(r2, 'ninelives');
    expect(derive(r2).maxHp).toBeLessThan(hp);
  });

  it('parties wearing legendaries still finish runs', () => {
    const r = rng();
    for (const lvl of [3, 9, 14, 20]) {
      const pool = LEGENDARIES.filter((d) => d.legend!.level <= lvl);
      const g = newGame(1, 'legacy', `LGRUN-${lvl}`);
      g.profile.unlockedBiomes = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
      g.roster = (['fighter', 'wizard', 'rogue'] as const).map((c) => createHero(r, c, lvl));
      for (const [i, h] of g.roster.entries()) {
        for (const def of pool.filter((_, j) => j % 3 === i)) {
          const slot = ITEMS[def.id].kind === 'trinket' ? (h.equipment.trinket1 ? 'trinket2' : 'trinket1') : undefined;
          const s = slot ?? (def.kind === 'weapon' ? 'mainHand' : def.kind === 'shield' ? 'offHand' : 'armor');
          if (canEquip(h, makeItem(r, def.id), s) === null) wear(h, def.id, s);
        }
      }
      g.roster.forEach(fullRestore);
      expect(dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'mirror', difficulty: 'standard', seed: `LG-${lvl}` }).ok).toBe(true);
      expect(autoExpedition(g, 8000).result).not.toBe('stuck');
    }
  }, 60000);
});
