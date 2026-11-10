/**
 * The Lantern Keep: persistent hub (plan §2.3). Roster, recruits, armory,
 * apothecary, enchanter, training grounds, vault, and level-up wizard.
 */
import type { Ability, ClassId, EquipSlot, GameState, Hero, ItemInstance } from '../engine/types.ts';
import { Rng, makeStreams } from '../engine/rng.ts';
import { CLASSES, CLASS_IDS, FEATS } from '../content/classes.ts';
import { featuresAt } from '../content/subclasses.ts';
import { ITEMS, sellValue, itemValue, isTwoHanded, itemName } from '../content/items.ts';
import { armorTraining, createHero, derive, applyLevel, autoPrepare, fullRestore, makeItem, choiceOptions, maxPrepared } from '../rules/character.ts';
import { spellsForClass } from '../content/spells.ts';
import { markOffers, applyMark } from '../fortune/dicepath.ts';
import { trainingClosed } from './quest.ts';
import { textTable, tx } from '../i18n/index.ts';

export const SCHEMA_VERSION = 1;
export const CONTENT_REVISION = 'td-1.2';
/** Banked gold for a brand-new Keep: enough for a potion or two, not a shopping spree. */
export const STARTING_GOLD = 50;

export const FACILITIES = textTable<Record<string, { name: string; text: string; max: number }>, 'name' | 'text'>('game', ['facilities'], {
  guild: { max: 4 },
  armory: { max: 4 },
  apothecary: { max: 4 },
  enchanter: { max: 3 },
  training: { max: 3 },
});

export function facilityCost(id: string, level: number): { gold: number; sigils: number } {
  return { gold: 250 * level * level, sigils: Math.max(0, level - 1) };
}

function townRng(g: GameState): Rng {
  return new Rng(g.townRng);
}

export function newGame(slot: number, mode: 'legacy' | 'story', seed = `KEEP-${Date.now()}`): GameState {
  const rng = new Rng(makeStreams(seed).town);
  const g: GameState = {
    schemaVersion: SCHEMA_VERSION, contentRevision: CONTENT_REVISION, slot, mode, createdAt: Date.now(), savedAt: Date.now(),
    profile: {
      bankedGold: STARTING_GOLD, unlockedBiomes: ['cinder'], sigils: {}, facility: { guild: 1, armory: 1, apothecary: 1, enchanter: 1, training: 1 },
      codex: { charms: [], monsters: [], hands: [] }, stats: { expeditions: 0, clears: 0, wipes: 0, deaths: 0, bestScore: 0, retreats: 0 }, townDay: 1,
      story: { seen: [], tiamat: 0 },
    },
    roster: [], vault: [], recruits: [], shopStock: [], townRng: rng.state, uidCounter: 0, settings: { fast: false, sound: true },
    // A fresh Keep offers the guided tour; the first bubble lets the player skip it.
    tutorial: { step: 0, tips: [] },
  };
  // The plan's starting trio.
  g.roster.push(createHero(rng, 'fighter', 1, { name: tx('metaTown.alaricHeartwood'), ancestry: 'human', background: 'soldier', portrait: 'heroes/fighter_1' }));
  g.roster.push(createHero(rng, 'cleric', 1, { name: tx('metaTown.kelseyCoppervein'), ancestry: 'dwarf', background: 'acolyte', portrait: 'heroes/cleric_1' }));
  g.roster.push(createHero(rng, 'rogue', 1, { name: tx('metaTown.pippenUnderbough'), ancestry: 'halfling', background: 'criminal', portrait: 'heroes/rogue_1' }));
  g.vault.push(makeItem(rng, 'potionHealing', 0, [], 2));
  g.townRng = rng.state;
  refreshRecruits(g);
  return g;
}

export function rosterCap(g: GameState): number {
  return 6 + 2 * (g.profile.facility.guild - 1);
}

export function recruitLevel(g: GameState): number {
  const alive = g.roster.filter((h) => h.status === 'alive').map((h) => h.level).sort((a, b) => a - b);
  if (!alive.length) return 1;
  const median = alive[Math.floor(alive.length / 2)];
  return Math.max(1, median - 2);
}

export function refreshRecruits(g: GameState) {
  const rng = townRng(g);
  const n = 2 + g.profile.facility.guild;
  const lvl = recruitLevel(g);
  const owned = new Set(g.roster.filter((h) => h.status === 'alive').map((h) => h.classId));
  const classes = rng.shuffle(CLASS_IDS.slice()).sort((a, b) => Number(owned.has(a)) - Number(owned.has(b)));
  // Every name on the roster (fallen and retired included) stays unique.
  const taken = g.roster.map((h) => h.name);
  g.recruits = [];
  for (const c of classes.slice(0, n)) {
    const r = createHero(rng, c, Math.max(1, lvl - (rng.chance(0.3) ? 1 : 0)), { rolled: true, taken });
    taken.push(r.name);
    g.recruits.push(r);
  }
  g.townRng = rng.state;
}

export function recruitCost(h: Hero, g?: GameState): number {
  // While the guild can't field a full party, volunteers sign on for free (no soft-lock after a wipe).
  if (g && g.roster.filter((x) => x.status === 'alive').length < 3) return 0;
  return 40 + 60 * (h.level - 1);
}

export function hire(g: GameState, idx: number): string | null {
  const h = g.recruits[idx];
  if (!h) return tx('metaTown.noSuchRecruit');
  if (g.roster.filter((x) => x.status === 'alive').length >= rosterCap(g)) return tx('metaTown.theRosterIsFull');
  const cost = recruitCost(h, g);
  if (g.profile.bankedGold < cost) return tx('metaTown.hiringCostsGold', { cost });
  g.profile.bankedGold -= cost;
  g.roster.push(h);
  g.recruits.splice(idx, 1);
  return null;
}

export function rerollRecruits(g: GameState): string | null {
  const cost = 25;
  if (g.profile.bankedGold < cost) return tx('metaTown.needsGold', { cost });
  g.profile.bankedGold -= cost;
  refreshRecruits(g);
  return null;
}

export function retire(g: GameState, heroId: string): string | null {
  const h = g.roster.find((x) => x.id === heroId);
  if (!h || h.status !== 'alive') return tx('metaTown.notAvailable');
  for (const slot of Object.keys(h.equipment) as EquipSlot[]) {
    const it = h.equipment[slot];
    if (it) g.vault.push(it);
  }
  h.equipment = {};
  h.status = 'retired';
  return null;
}

export function buryDead(g: GameState) {
  // Graveyard keeps names for the memorial wall; gear went to the vault already.
  void g;
}

// ── shops ───────────────────────────────────────────────────────────────────

export function shopItems(g: GameState): string[] {
  const armory = g.profile.facility.armory;
  const apo = g.profile.facility.apothecary;
  return Object.values(ITEMS).filter((d) => {
    if (d.lootOnly) return false;
    if (d.kind === 'consumable') return (d.shopTier ?? 0) <= apo - 1 + 1 && d.id !== 'luckyCharm' || (d.id === 'luckyCharm' && apo >= 2);
    if (d.kind === 'trinket') return (d.shopTier ?? 1) <= armory;
    if (d.kind === 'armor' && d.price >= 1500) return armory >= 2;
    return true;
  }).map((d) => d.id);
}

export function buy(g: GameState, defId: string): string | null {
  const def = ITEMS[defId];
  if (!def || !shopItems(g).includes(defId)) return tx('metaTown.notInStock');
  if (g.profile.bankedGold < def.price) return tx('metaTown.notEnoughGold');
  g.profile.bankedGold -= def.price;
  const rng = townRng(g);
  const existing = def.kind === 'consumable' ? g.vault.find((i) => i.defId === defId && i.plus === 0 && !i.affixes.length) : undefined;
  if (existing) existing.qty = (existing.qty ?? 1) + 1;
  else g.vault.push(makeItem(rng, defId, 0, [], def.kind === 'consumable' ? 1 : undefined));
  g.townRng = rng.state;
  return null;
}

export function sell(g: GameState, uid: string): string | null {
  const idx = g.vault.findIndex((i) => i.uid === uid);
  if (idx < 0) return tx('metaTown.notInTheVault');
  const it = g.vault[idx];
  const unit = { ...it, qty: 1 };
  g.profile.bankedGold += sellValue(unit);
  if ((it.qty ?? 1) > 1) it.qty! -= 1;
  else g.vault.splice(idx, 1);
  return null;
}

// ── equipment ───────────────────────────────────────────────────────────────

export function canEquip(h: Hero, inst: ItemInstance, slot: EquipSlot): string | null {
  const def = ITEMS[inst.defId];
  if (!def) return tx('metaTown.unknownItem');
  const cls = CLASSES[h.classId];
  switch (slot) {
    case 'mainHand':
      if (def.kind !== 'weapon') return tx('metaTown.notAWeapon');
      return null;
    case 'offHand':
      if (def.kind === 'shield') {
        if (!armorTraining(h).has('shield')) return tx('metaTown.sAreNotTrainedWith', { clsName: cls.name });
        if (isTwoHanded(h.equipment.mainHand)) return tx('metaTown.yourMainWeaponNeedsBoth');
        return null;
      }
      if (def.kind === 'weapon') {
        if (!def.weapon!.props.includes('light')) return tx('metaTown.onlyLightWeaponsGoIn');
        if (isTwoHanded(h.equipment.mainHand)) return tx('metaTown.yourMainWeaponNeedsBoth');
        return null;
      }
      return tx('metaTown.notAnOffHandItem');
    case 'armor': {
      if (def.kind !== 'armor') return tx('metaTown.notArmor');
      const t = def.armor!.type;
      if (!armorTraining(h).has(t)) return tx('metaTown.sAreNotTrainedIn', { clsName: cls.name, t });
      if (def.armor!.str && h.abilities.str < def.armor!.str) return tx('metaTown.needsStrength', { str: def.armor!.str });
      return null;
    }
    case 'trinket1': case 'trinket2':
      if (def.kind !== 'trinket') return tx('metaTown.notATrinket');
      return null;
  }
}

export function equip(g: GameState, heroId: string, uid: string, slot: EquipSlot): string | null {
  const h = g.roster.find((x) => x.id === heroId);
  if (!h) return tx('metaTown.noHero');
  const idx = g.vault.findIndex((i) => i.uid === uid);
  if (idx < 0) return tx('metaTown.notInTheVault');
  const inst = g.vault[idx];
  const err = canEquip(h, inst, slot);
  if (err) return err;
  const hpFrac = h.hp / derive(h).maxHp;
  g.vault.splice(idx, 1);
  const old = h.equipment[slot];
  if (old) g.vault.push(old);
  h.equipment[slot] = inst;
  // Two-handers push the off hand to the vault.
  if (slot === 'mainHand' && isTwoHanded(inst) && h.equipment.offHand) { g.vault.push(h.equipment.offHand); delete h.equipment.offHand; }
  h.hp = Math.max(1, Math.round(derive(h).maxHp * hpFrac));
  return null;
}

export function unequip(g: GameState, heroId: string, slot: EquipSlot): string | null {
  const h = g.roster.find((x) => x.id === heroId);
  if (!h || !h.equipment[slot]) return tx('metaTown.nothingThere');
  g.vault.push(h.equipment[slot]!);
  delete h.equipment[slot];
  h.hp = Math.min(h.hp, derive(h).maxHp);
  return null;
}

// ── enchanter ───────────────────────────────────────────────────────────────

export function enchantCost(inst: ItemInstance): number {
  return [300, 900, 2400][inst.plus] ?? Infinity;
}

export function enchant(g: GameState, uid: string): string | null {
  const inst = g.vault.find((i) => i.uid === uid) ?? g.roster.flatMap((h) => Object.values(h.equipment)).find((i) => i?.uid === uid);
  if (!inst) return tx('metaTown.itemNotFound');
  const def = ITEMS[inst.defId];
  if (!def || !['weapon', 'armor', 'shield'].includes(def.kind)) return tx('metaTown.onlyWeaponsAndArmorTake');
  if (inst.plus >= Math.min(3, g.profile.facility.enchanter)) return tx('metaTown.theEnchanterCannotGoHigher');
  const cost = enchantCost(inst);
  if (g.profile.bankedGold < cost) return tx('metaTown.needsGold', { cost });
  g.profile.bankedGold -= cost;
  inst.plus += 1;
  return null;
}

export function upgradeFacility(g: GameState, id: string): string | null {
  const f = FACILITIES[id];
  if (!f) return tx('metaTown.unknownFacility');
  const lvl = g.profile.facility[id];
  if (lvl >= f.max) return tx('metaTown.alreadyAtMaximum');
  const { gold, sigils } = facilityCost(id, lvl);
  const total = Object.values(g.profile.sigils).reduce((a, b) => a + (b ?? 0), 0);
  if (total < sigils) return tx('metaTown.needsBossSigilsYouHave', { sigils, total });
  if (g.profile.bankedGold < gold) return tx('metaTown.needsGold2', { gold });
  g.profile.bankedGold -= gold;
  g.profile.facility[id] = lvl + 1;
  if (id === 'guild') refreshRecruits(g);
  return null;
}

// ── training ────────────────────────────────────────────────────────────────

export function trainingCap(g: GameState): number {
  const alive = g.roster.filter((h) => h.status === 'alive').map((h) => h.level).sort((a, b) => b - a);
  const top = alive.slice(0, 3);
  const median = top.length ? top[Math.floor(top.length / 2)] : 1;
  return Math.min(20, Math.max(1, median - 2));
}

export function trainingCost(g: GameState, h: Hero): number {
  return Math.round(120 * h.level * (1 - 0.15 * (g.profile.facility.training - 1)));
}

export function train(g: GameState, heroId: string): string | null {
  const h = g.roster.find((x) => x.id === heroId);
  if (!h || h.status !== 'alive') return tx('metaTown.notAvailable');
  if (h.pendingLevel) return tx('metaTown.finishTheirPendingLevelUp');
  if (trainingClosed(g)) return tx('metaTown.theTrainingGroundsAreClosed');
  if (h.level >= trainingCap(g)) return tx('metaTown.trainingCanOnlyRaiseHeroes', { trainingCap: trainingCap(g) });
  const cost = trainingCost(g, h);
  if (g.profile.bankedGold < cost) return tx('metaTown.needsGold', { cost });
  g.profile.bankedGold -= cost;
  h.pendingLevel = true;
  return null;
}

// ── level up ────────────────────────────────────────────────────────────────

export interface LevelChoices {
  asi?: { mode: 'plus2'; a: Ability } | { mode: 'split'; a: Ability; b: Ability } | { mode: 'feat'; feat: string };
  picks?: Record<string, string[]>;
  expertise?: string[];
  /** Index into markOffers(hero, next): the Dice Path pick. Defaults to the first. */
  mark?: number;
}

export function levelUpPreview(h: Hero) {
  const next = h.level + 1;
  const feats = featuresAt(h, next);
  const choices = feats.filter((f) => f.choice).map((f) => ({ feature: f, options: f.choice === 'asi' ? [] : choiceOptions({ ...h, level: next }, f.choice!) }));
  const before = spellsForClass(h).map((s) => s.id);
  const after = spellsForClass({ ...h, level: next }).map((s) => s.id).filter((id) => !before.includes(id));
  return { next, features: feats, choices, newSpells: after, hpGain: Math.floor(CLASSES[h.classId].hitDie / 2) + 1, marks: markOffers(h, next) };
}

export function levelUp(g: GameState, heroId: string, ch: LevelChoices): string | null {
  const h = g.roster.find((x) => x.id === heroId);
  if (!h || !h.pendingLevel) return tx('metaTown.noPendingLevel');
  if (h.level >= 20) { h.pendingLevel = false; return null; }
  const next = h.level + 1;
  const feats = featuresAt(h, next);
  // Validate choices before mutating anything.
  for (const f of feats) {
    if (!f.choice) continue;
    if (f.choice === 'asi') {
      if (!ch.asi) return tx('metaTown.chooseAnAbilityScoreImprovement');
      if (ch.asi.mode === 'feat' && (!FEATS[ch.asi.feat] || (FEATS[ch.asi.feat].species && FEATS[ch.asi.feat].species !== h.ancestry) || (h.feats.includes(ch.asi.feat) && !FEATS[ch.asi.feat].repeatable))) return tx('metaTown.invalidFeat');
    } else if (f.choice === 'expertise') {
      const n = f.choiceCount ?? 2;
      const pick = (ch.expertise ?? []).filter((s) => h.skillProfs.includes(s as never) && !h.expertise.includes(s as never));
      if (pick.length < Math.min(n, h.skillProfs.length - h.expertise.length)) return tx('metaTown.chooseSkillsForExpertise', { n });
    } else {
      const opts = choiceOptions({ ...h, level: next }, f.choice);
      const have = h.choices[f.choice] ?? [];
      const pick = (ch.picks?.[f.choice] ?? []).filter((o) => opts.includes(o) && !have.includes(o));
      if (pick.length < Math.min(f.choiceCount ?? 1, opts.filter((o) => !have.includes(o)).length)) return tx('metaTown.choose', { fName: f.name });
    }
  }
  const marks = markOffers(h, next);
  const mark = marks[ch.mark ?? 0];
  if (marks.length && !mark) return tx('metaTown.chooseADicePathMark');
  const hpFracMissing = derive(h).maxHp - h.hp;
  applyLevel(h, new Rng(g.townRng), next, false);
  for (const f of feats) {
    if (!f.choice) continue;
    if (f.choice === 'asi') {
      const a = ch.asi!;
      if (a.mode === 'plus2') h.abilities[a.a] = Math.min(20, h.abilities[a.a] + 2);
      else if (a.mode === 'split') { h.abilities[a.a] = Math.min(20, h.abilities[a.a] + 1); h.abilities[a.b] = Math.min(20, h.abilities[a.b] + 1); }
      else {
        h.feats.push(a.feat);
        const ab = FEATS[a.feat].ability;
        if (ab) {
          const best = ab.slice().sort((x, y) => h.abilities[y] - h.abilities[x])[0];
          h.abilities[best] = Math.min(20, h.abilities[best] + 1);
        }
      }
    } else if (f.choice === 'expertise') {
      const n = f.choiceCount ?? 2;
      for (const s of (ch.expertise ?? []).slice(0, n)) if (h.skillProfs.includes(s as never) && !h.expertise.includes(s as never)) h.expertise.push(s as never);
    } else {
      const have = h.choices[f.choice] ?? [];
      const pick = (ch.picks?.[f.choice] ?? []).filter((o) => !have.includes(o)).slice(0, f.choiceCount ?? 1);
      h.choices[f.choice] = [...have, ...pick];
    }
  }
  if (mark) applyMark(h, mark);
  h.pendingLevel = false;
  autoPrepare(h);
  fullRestore(h);
  h.hp = Math.max(1, derive(h).maxHp - Math.max(0, hpFracMissing));
  fullRestore(h);
  return null;
}

export function setPrepared(g: GameState, heroId: string, ids: string[]): string | null {
  const h = g.roster.find((x) => x.id === heroId);
  if (!h) return tx('metaTown.noHero');
  const legal = new Set(spellsForClass(h).filter((s) => s.level > 0).map((s) => s.id));
  const pick = [...new Set(ids)].filter((id) => legal.has(id));
  if (pick.length > maxPrepared(h)) return tx('metaTown.youCanPrepareSpells', { maxPrepared: maxPrepared(h) });
  h.prepared = pick;
  return null;
}

export function heroValueText(h: Hero): string {
  return `${h.name} — ${CLASSES[h.classId].name} ${h.level}`;
}

export function partySuggestion(g: GameState): string[] {
  const alive = g.roster.filter((h) => h.status === 'alive' && !h.pendingLevel).sort((a, b) => b.level - a.level);
  const out: Hero[] = [];
  const roles = (c: ClassId) => (['fighter', 'barbarian', 'paladin', 'monk'].includes(c) ? 'front' : ['cleric', 'druid', 'bard'].includes(c) ? 'heal' : 'dps');
  for (const want of ['front', 'heal', 'dps']) {
    const h = alive.find((x) => roles(x.classId) === want && !out.includes(x));
    if (h) out.push(h);
  }
  for (const h of alive) if (out.length < 3 && !out.includes(h)) out.push(h);
  return out.slice(0, 3).map((h) => h.id);
}

export { itemName, itemValue };
