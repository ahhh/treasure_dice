/**
 * Every class × subclass × species × sex, end to end: heroes build and level,
 * subclass features land at the right levels, portraits exist for the pair,
 * every subclass power can be used in a real fight, and every subclass
 * finishes expeditions without the game getting stuck.
 */
import { describe, it, expect } from 'vitest';
import { newGame, levelUpPreview, levelUp } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { autoExpedition, autoExploreStep, autoCombatStep } from '../src/app/autoplay.ts';
import { createHero, derive, fullRestore, choiceOptions } from '../src/rules/character.ts';
import { CLASS_IDS, CLASSES, FEATS, featsFor, maxSlots } from '../src/content/classes.ts';
import { SUBCLASSES, SUBCLASS_LEVEL, subclassOf, featuresUpTo } from '../src/content/subclasses.ts';
import { SPECIES } from '../src/content/origins.ts';
import { portraitsFor } from '../src/content/portraits.ts';
import { listActions } from '../src/combat/hero.ts';
import { makeCtx } from '../src/combat/index.ts';
import { Rng } from '../src/engine/rng.ts';
import type { ClassId, GameState, Hero } from '../src/engine/types.ts';

const SEXES = ['female', 'male'] as const;
const ALL = CLASS_IDS.flatMap((c) => SUBCLASSES[c].map((s) => ({ c, s: s.id })));
const SPECIES_IDS = Object.keys(SPECIES);

describe('subclass catalogue', () => {
  it('every class has subclasses, the SRD one first, offered as the level-3 choice', () => {
    for (const c of CLASS_IDS) {
      const list = SUBCLASSES[c];
      expect(list?.length, c).toBeGreaterThanOrEqual(4);
      expect(list.filter((s) => s.srd).length, c).toBeLessThanOrEqual(1);
      expect(CLASSES[c].levels[SUBCLASS_LEVEL].some((f) => f.choice === 'subclass'), c).toBe(true);
      const h = createHero(new Rng([1, 2, 3, 4]), c, 2);
      expect(choiceOptions(h, 'subclass')).toEqual(list.map((s) => s.id));
      // Subclass features never ask for a level-3 choice (the pick itself is that level's choice).
      for (const s of list) for (const f of s.levels[SUBCLASS_LEVEL] ?? []) expect(f.choice, `${c}/${s.id}/${f.id}`).toBeUndefined();
    }
    expect(ALL.length).toBeGreaterThanOrEqual(120);
  });

  it('feature ids never collide inside one class unless they reuse a core mechanic on purpose', () => {
    const reuse = new Set(['extraAttack', 'evasion', 'uncannyDodge']);
    for (const c of CLASS_IDS) {
      const core = new Set(Object.values(CLASSES[c].levels).flat().map((f) => f.id));
      for (const s of SUBCLASSES[c]) for (const f of Object.values(s.levels).flat()) {
        if (!reuse.has(f.id)) expect(core.has(f.id), `${c}/${s.id}/${f.id}`).toBe(false);
      }
    }
  });
});

describe('every class × subclass × species × sex', () => {
  it('builds at levels 3, 10 and 20 with legal stats, its subclass features and a matching portrait', () => {
    const rng = new Rng([7, 7, 7, 7]);
    let n = 0;
    for (const { c, s } of ALL) {
      for (const ancestry of SPECIES_IDS) {
        for (const sex of SEXES) {
          for (const lvl of [3, 10, 20]) {
            const h = createHero(rng, c, lvl, { ancestry, sex, subclass: s });
            const tag = `${c}/${s}/${ancestry}/${sex}/L${lvl}`;
            expect(h.ancestry, tag).toBe(ancestry);
            expect(h.sex, tag).toBe(sex);
            expect(subclassOf(h)?.id, tag).toBe(s);
            const d = derive(h);
            expect(d.maxHp, tag).toBeGreaterThan(0);
            expect(d.ac, tag).toBeGreaterThanOrEqual(10);
            expect(Number.isFinite(d.main.toHit) && Number.isFinite(d.main.bonus), tag).toBe(true);
            expect(h.slots, tag).toEqual(d.slots);
            expect(d.slots.slice(1).reduce((a, b) => a + b, 0), tag).toBeGreaterThanOrEqual(maxSlots(c, lvl).slice(1).reduce((a, b) => a + b, 0));
            const sub = SUBCLASSES[c].find((x) => x.id === s)!;
            for (const [fl, fs] of Object.entries(sub.levels)) for (const f of fs) expect(d.features.has(f.id), `${tag} ${f.id}@${fl}`).toBe(Number(fl) <= lvl);
            for (const r of sub.resources) expect(h.resources[r.id], `${tag} ${r.id}`).toBe(d.resources[r.id]);
            for (const f of d.powers) expect(d.resources[f.power!.resource] ?? 0, `${tag} ${f.id} pool`).toBeGreaterThan(0);
            n++;
          }
          expect(portraitsFor(c, ancestry, sex).some((p) => p.ancestry === ancestry && p.sex === sex), `portrait ${c}/${ancestry}/${sex}`).toBe(true);
        }
      }
    }
    expect(n).toBe(ALL.length * SPECIES_IDS.length * 2 * 3);
  }, 300000);

  it('recruits come in any species and either sex, with a portrait for the pair', () => {
    const g = newGame(1, 'legacy', 'RECRUITS');
    const seen = { species: new Set<string>(), sex: new Set<string>(), subs: new Set<string>() };
    for (let i = 0; i < 60; i++) {
      g.profile.facility.guild = 3;
      dispatch(g, { type: 'rerollRecruits' } as never);
      const rng = new Rng([i, 3, 5, 7]);
      for (const c of CLASS_IDS) {
        const h = createHero(rng, c, 5, { rolled: true });
        seen.species.add(h.ancestry); seen.sex.add(h.sex!);
        seen.subs.add(`${c}/${subclassOf(h)!.id}`);
        const p = portraitsFor(c).find((x) => x.key === h.portrait)!;
        expect(p, h.portrait).toBeTruthy();
        expect([p.ancestry, p.sex]).toEqual([h.ancestry, h.sex]);
      }
    }
    expect([...seen.species].sort()).toEqual([...SPECIES_IDS].sort());
    expect(seen.sex.size).toBe(2);
    expect(seen.subs.size).toBeGreaterThan(ALL.length * 0.8);
  });

  it('the level-up wizard offers the subclass at 3, then grants its features later', () => {
    for (const c of CLASS_IDS) {
      const g = newGame(1, 'legacy', `LV-${c}`);
      const h = createHero(new Rng([5, 5, 5, 5]), c, 2);
      g.roster.push(h);
      for (const sub of SUBCLASSES[c].slice(0, 2)) {
        const x: Hero = JSON.parse(JSON.stringify(h));
        x.id = `${h.id}-${sub.id}`;
        g.roster.push(x);
        x.pendingLevel = true;
        const pv = levelUpPreview(x);
        expect(pv.choices.some((ch) => ch.feature.choice === 'subclass' && ch.options.includes(sub.id)), c).toBe(true);
        const picks: Record<string, string[]> = { subclass: [sub.id] };
        for (const ch of pv.choices) if (ch.feature.choice && ch.feature.choice !== 'subclass' && ch.feature.choice !== 'asi' && ch.feature.choice !== 'expertise') picks[ch.feature.choice] = ch.options.slice(0, ch.feature.choiceCount ?? 1);
        expect(levelUp(g, x.id, { picks, expertise: x.skillProfs.slice(0, 2), asi: { mode: 'plus2', a: CLASSES[c].arrayOrder[0] } }), `${c}/${sub.id}`).toBeNull();
        expect(subclassOf(x)?.id).toBe(sub.id);
        expect(featuresUpTo(x).some((f) => (sub.levels[3] ?? []).includes(f)) || !(sub.levels[3] ?? []).length).toBe(true);
      }
    }
  });
});

/** A party at the first turn of `heroId` in an active fight, or undefined if no fight turned up. */
function turnOf(g: GameState, heroId: string): boolean {
  let guard = 0;
  while (g.expedition && g.expedition.combat?.status !== 'active' && guard++ < 400) autoExploreStep(g);
  guard = 0;
  const c = () => g.expedition?.combat;
  while (c()?.status === 'active' && guard++ < 200) {
    const t = c()!.turn;
    if (t && c()!.combatants[t.actorId]?.refId === heroId) return true;
    autoCombatStep(g);
  }
  return false;
}

describe('subclass powers in a real fight', () => {
  const withPowers = ALL.filter(({ c, s }) => Object.values(SUBCLASSES[c].find((x) => x.id === s)!.levels).flat().some((f) => f.power));
  it('every power is listed, usable and resolves', () => {
    let used = 0;
    withPowers.forEach(({ c, s }, i) => {
      const sub = SUBCLASSES[c].find((x) => x.id === s)!;
      for (const f of Object.values(sub.levels).flat().filter((x) => x.power)) {
        let done = false;
        let lastReason = '';
        for (let tries = 0; tries < 6 && !done; tries++) {
          const g = newGame(1, 'legacy', `PW-${s}-${f.id}-${tries}`);
          const rng = new Rng([i + 1, tries + 2, 3, 4]);
          const hero = createHero(rng, c, 20, { subclass: s, ancestry: SPECIES_IDS[i % SPECIES_IDS.length] });
          g.roster = [hero, createHero(rng, 'fighter', 20), createHero(rng, 'cleric', 20)];
          g.roster.forEach(fullRestore);
          dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'cinder', difficulty: 'explorer', seed: `PW-${s}-${tries}` });
          if (!turnOf(g, hero.id)) continue;
          const ctx = makeCtx(g);
          // Melee powers need the front rank, as in play: step up first.
          const me = Object.values(ctx.combat.combatants).find((x) => x.refId === hero.id)!;
          me.rank = 'front';
          // A self-buff isn't offered while it is already up (e.g. Shadow Step opens a fight hidden).
          if (f.power!.kind === 'buff' && f.power!.cond) me.conditions = me.conditions.filter((x) => x.id !== f.power!.cond!.id);
          const opt = listActions(ctx).find((o) => o.key === `feat:power:${f.id}`);
          expect(opt, `${c}/${s}/${f.id} listed`).toBeTruthy();
          lastReason = opt!.reason ?? '';
          if (!opt!.usable) continue;
          const before = hero.resources[f.power!.resource];
          const foes = Object.values(ctx.combat.combatants).filter((x) => x.side === 'enemy' && !x.dead);
          const allies = Object.values(ctx.combat.combatants).filter((x) => x.side === 'hero' && !x.dead);
          const targets = opt!.target === 'enemy' || opt!.target === 'rank' ? [foes.find((x) => x.rank === 'front')?.id ?? foes[0].id] : opt!.target === 'ally' ? [allies[0].id] : [];
          const playable = g.expedition!.fortune.tray.map((d, k) => (d.jinxed ? -1 : k)).filter((k) => k >= 0);
          const dice = opt!.fortune === 'none' ? [] : playable.slice(0, 2);
          const r = dispatch(g, { type: 'combat', cmd: { type: 'act', key: opt!.key, targets, dice } });
          expect(r.ok, `${c}/${s}/${f.id}: ${'error' in r ? r.error : ''}`).toBe(true);
          expect(hero.resources[f.power!.resource], `${c}/${s}/${f.id} spends`).toBe(before - (f.power!.spend ?? 1));
          done = true;
          used++;
        }
        expect(done, `${c}/${s}/${f.id} never got a usable turn (${lastReason})`).toBe(true);
      }
    });
    expect(used).toBeGreaterThan(0);
  }, 600000);
});

describe('species feats', () => {
  const speciesFeats = (sp: string) => Object.keys(FEATS).filter((k) => FEATS[k].species === sp);

  it('every species has at least two feats of its own, offered only to that species', () => {
    for (const sp of SPECIES_IDS) {
      expect(speciesFeats(sp).length, sp).toBeGreaterThanOrEqual(2);
      for (const k of Object.keys(FEATS)) expect(featsFor(sp).includes(k), `${sp} ${k}`).toBe(!FEATS[k].species || FEATS[k].species === sp);
      for (const k of speciesFeats(sp)) {
        expect(FEATS[k].name + FEATS[k].text, k).not.toMatch(/⟦/);
        expect(FEATS[k].ability?.length, `${k} gives +1 to an ability`).toBeGreaterThan(0);
        expect(FEATS[k].mods || FEATS[k].immune, `${k} has a perk`).toBeTruthy();
      }
    }
  });

  it('each species can take its feats through the level-up wizard, other species cannot, and the perk shows up', () => {
    SPECIES_IDS.forEach((sp, i) => {
      const other = SPECIES_IDS[(i + 1) % SPECIES_IDS.length];
      for (const k of speciesFeats(sp)) {
        for (const c of CLASS_IDS) {
          const g = newGame(1, 'legacy', `FEAT-${k}-${c}`);
          const rng = new Rng([i + 1, 9, 9, 9]);
          const mk = (ancestry: string) => { const h = createHero(rng, c, 3, { ancestry }); h.pendingLevel = true; g.roster.push(h); return h; };
          const h = mk(sp);
          const before = derive(h);
          const abil = FEATS[k].ability!.slice().sort((x, y) => h.abilities[y] - h.abilities[x])[0];
          const score = h.abilities[abil];
          const pv = levelUpPreview(h);
          const picks: Record<string, string[]> = {};
          for (const ch of pv.choices) if (ch.feature.choice && !['asi', 'expertise'].includes(ch.feature.choice)) picks[ch.feature.choice] = ch.options.slice(0, ch.feature.choiceCount ?? 1);
          expect(levelUp(g, h.id, { picks, asi: { mode: 'feat', feat: k } }), `${sp} ${k} ${c}`).toBeNull();
          expect(h.feats).toContain(k);
          expect(h.abilities[abil]).toBe(Math.min(20, score + 1));
          const after = derive(h);
          const m = FEATS[k].mods ?? {};
          if (m.ac) expect(after.ac - before.ac, `${k} ac`).toBeGreaterThanOrEqual(m.ac);
          if (m.init) expect(after.init).toBeGreaterThan(before.init);
          if (m.tricks) expect(after.tricks).toBeGreaterThan(before.tricks);
          if (m.resist) for (const r of m.resist) expect(after.resist).toContain(r);
          if (m.hand) expect(after.diceGear.hands.some((x) => x.name === FEATS[k].name)).toBe(true);
          if (m.tokens) for (const t of m.tokens) expect(after.diceGear.tokens).toContain(t);
          if (m.openingWild) expect(after.diceGear.openingWild).toBeGreaterThan(before.diceGear.openingWild);
          if (m.weaponPlus) expect(after.main.toHit).toBeGreaterThan(before.main.toHit);
          if (m.affinity) for (const a of m.affinity) expect(after.diceGear.affinity).toContain(a);
          if (m.openingHidden) expect(after.legend.openingHidden).toBe(true);
          if (m.healTakenPct) expect(after.legend.healTakenPct).toBeGreaterThan(before.legend.healTakenPct);
          if (m.bloodied) expect(after.legend.bloodied).toBeGreaterThan(before.legend.bloodied);
          if (m.onKill) expect(after.legend.onKill.healPct).toBeGreaterThan(before.legend.onKill.healPct);
          if (m.thorns) expect(after.legend.retort.amount).toBeGreaterThan(0);
          for (const im of FEATS[k].immune ?? []) expect(after.immune.has(im)).toBe(true);
          // Another species is turned away.
          const o = mk(other);
          expect(levelUp(g, o.id, { picks, asi: { mode: 'feat', feat: k } }), `${other} must not take ${k}`).not.toBeNull();
          expect(o.feats).not.toContain(k);
        }
      }
    });
  });
});

describe('every subclass finishes expeditions', () => {
  it('parties of three subclasses (cycling species, sex and species feats) complete runs without getting stuck', () => {
    const rng = new Rng([4, 4, 2, 2]);
    const biomes = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'] as const;
    for (let i = 0; i < ALL.length; i += 3) {
      const trio = ALL.slice(i, i + 3);
      const lvl = [5, 11, 17, 20][(i / 3) % 4];
      const g = newGame(1, 'legacy', `SUB-${i}`);
      g.profile.unlockedBiomes = [...biomes];
      g.roster = trio.map(({ c, s }, k) => {
        const ancestry = SPECIES_IDS[(i + k) % SPECIES_IDS.length];
        const h = createHero(rng, c as ClassId, lvl, { subclass: s, ancestry, sex: SEXES[(i + k) % 2] });
        // Each hero also carries their species' feats, so every race's feats see real fights.
        if (lvl >= 4) h.feats.push(...Object.keys(FEATS).filter((f) => FEATS[f].species === ancestry));
        return h;
      });
      g.roster.forEach(fullRestore);
      const biome = biomes[(i / 3) % 5];
      expect(dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome, difficulty: 'standard', seed: `SUB-${i}` }).ok).toBe(true);
      const rep = autoExpedition(g, 8000);
      expect(rep.result, `L${lvl} ${trio.map((x) => `${x.c}/${x.s}`).join(' + ')} in ${biome}`).not.toBe('stuck');
    }
  }, 600000);
});
