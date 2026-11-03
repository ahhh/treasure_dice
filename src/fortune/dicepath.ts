/**
 * The Dice Path: a second, tiny advancement track that runs beside the class
 * levels. Every hero owns their signature dice (two class-coloured dice to
 * start) and brings them into every expedition's bag. Each level-up offers
 * three permanent "marks" for those dice; the player picks one.
 *
 *   most levels      engrave a face (keen, fierce, gilded…) or hone a die
 *   levels 5/10/15/20 a trait milestone: loaded, kindred, echoing…
 *   levels 8 and 16   one of the offers is a new signature die (max 4)
 *
 * Offers are seeded from the hero id + level, so the preview and the
 * confirmed level-up always agree, and reloading never rerolls them.
 */
import type { DieTrait, Face, FaceMod, Hero, HeroDie } from '../engine/types.ts';
import { Rng, seedState } from '../engine/rng.ts';
import { CLASS_MATERIAL, MATERIALS, FACE_MODS, standardFaces } from './materials.ts';

export const TRAIT_LEVELS = [5, 10, 15, 20];
export const NEW_DIE_LEVELS = [8, 16];
export const MAX_SIGNATURE_DICE = 4;
/** Caps keep a level-20 die special without every face doing something. */
export const MAX_ENGRAVED_PER_DIE = 3;
export const HONE_FLOOR = 3;

export const TRAITS: Record<DieTrait, { name: string; text: string; glyph: string }> = {
  loaded: { name: 'Loaded', text: 'Rolls twice and keeps the higher face.', glyph: '⬢' },
  kindred: { name: 'Kindred', text: '+2 Mult when its owner plays it.', glyph: '♥' },
  echoing: { name: 'Echoing', text: 'Scores twice when its owner plays it.', glyph: '↻' },
  steadfast: { name: 'Steadfast', text: "Can't be jinxed, stolen or cursed.", glyph: '⛨' },
  eager: { name: 'Eager', text: 'Always lands in the opening tray.', glyph: '➚' },
};

export type DiceMark =
  | { kind: 'engrave'; die: number; face: number; mod: FaceMod }
  | { kind: 'hone'; die: number }
  | { kind: 'trait'; die: number; trait: DieTrait }
  | { kind: 'newDie' };

/** The hero's signature dice (a fresh copy; never mutate the result to change the hero). */
export function heroDice(hero: Pick<Hero, 'classId' | 'dice'>): HeroDie[] {
  const src: HeroDie[] = hero.dice ?? [0, 1].map(() => ({ material: CLASS_MATERIAL[hero.classId], faces: standardFaces() }));
  return src.map((d) => ({ material: d.material, faces: d.faces.map((f) => ({ ...f })), trait: d.trait }));
}

function lowestFace(faces: Face[]): number {
  let idx = 0;
  faces.forEach((f, i) => { if (f.v < faces[idx].v) idx = i; });
  return idx;
}

function modPool(level: number): FaceMod[] {
  const pool: FaceMod[] = ['keen', 'keen', 'fierce', 'fierce', 'gilded', 'lucky'];
  if (level >= 9) pool.push('savage');
  if (level >= 13) pool.push('wild');
  return pool;
}

/** The three marks offered when `hero` reaches `level`. */
export function markOffers(hero: Hero, level: number): DiceMark[] {
  const dice = heroDice(hero);
  const rng = new Rng(seedState(`${hero.id}:dicepath:${level}`));
  const out: DiceMark[] = [];
  const same = (a: DiceMark, b: DiceMark) => JSON.stringify(a) === JSON.stringify(b);
  const push = (m: DiceMark | null) => { if (m && !out.some((o) => same(o, m))) out.push(m); };

  if (TRAIT_LEVELS.includes(level)) {
    const die = dice.findIndex((d) => !d.trait);
    if (die >= 0) {
      for (const trait of rng.shuffle(Object.keys(TRAITS) as DieTrait[]).slice(0, 3)) push({ kind: 'trait', die, trait });
      return out;
    }
  }
  if (NEW_DIE_LEVELS.includes(level) && dice.length < MAX_SIGNATURE_DICE) push({ kind: 'newDie' });

  const engrave = (): DiceMark | null => {
    const cands = dice.flatMap((d, di) => (d.faces.filter((f) => f.mod).length >= MAX_ENGRAVED_PER_DIE ? [] : d.faces.map((f, fi) => ({ di, fi, f })))).filter((x) => !x.f.mod);
    if (!cands.length) return null;
    // Favour the high faces a little: engraving a 6 feels better than a 1.
    const c = rng.weighted(cands, (x) => 1 + x.f.v);
    return { kind: 'engrave', die: c.di, face: c.fi, mod: rng.pick(modPool(level)) };
  };
  const hone = (): DiceMark | null => {
    const cands = dice.map((d, di) => ({ d, di })).filter((x) => x.d.faces[lowestFace(x.d.faces)].v < HONE_FLOOR);
    return cands.length ? { kind: 'hone', die: rng.pick(cands).di } : null;
  };
  for (let guard = 0; out.length < 3 && guard < 30; guard++) push(rng.chance(0.7) ? engrave() : hone());
  // A fully walked path still offers growth: another die while there is room.
  if (!out.length && dice.length < MAX_SIGNATURE_DICE) push({ kind: 'newDie' });
  return out;
}

/** Apply a mark permanently to the hero's signature dice. */
export function applyMark(hero: Hero, mark: DiceMark): void {
  const dice = heroDice(hero);
  switch (mark.kind) {
    case 'engrave': {
      const f = dice[mark.die]?.faces[mark.face];
      if (f && !f.mod) f.mod = mark.mod;
      break;
    }
    case 'hone': {
      const d = dice[mark.die];
      if (d) { const i = lowestFace(d.faces); d.faces[i] = { ...d.faces[i], v: Math.min(HONE_FLOOR, d.faces[i].v + 1) }; }
      break;
    }
    case 'trait': {
      const d = dice[mark.die];
      if (d && !d.trait) d.trait = mark.trait;
      break;
    }
    case 'newDie':
      if (dice.length < MAX_SIGNATURE_DICE) dice.push({ material: CLASS_MATERIAL[hero.classId], faces: standardFaces() });
      break;
  }
  hero.dice = dice;
}

const ROMAN = ['I', 'II', 'III', 'IV'];

export function dieLabel(hero: Hero, i: number): string {
  const d = heroDice(hero)[i];
  return `${MATERIALS[d?.material ?? CLASS_MATERIAL[hero.classId]].name} die ${ROMAN[i] ?? i + 1}`;
}

export function markTitle(hero: Hero, m: DiceMark): string {
  switch (m.kind) {
    case 'engrave': return `${FACE_MODS[m.mod].name} ${heroDice(hero)[m.die].faces[m.face].v}`;
    case 'hone': return 'Hone';
    case 'trait': return TRAITS[m.trait].name;
    case 'newDie': return 'New signature die';
  }
}

export function markText(hero: Hero, m: DiceMark): string {
  const dice = heroDice(hero);
  switch (m.kind) {
    case 'engrave': return `Engrave the ${dice[m.die].faces[m.face].v} on ${dieLabel(hero, m.die)}: ${FACE_MODS[m.mod].text}`;
    case 'hone': {
      const d = dice[m.die];
      const lo = d.faces[lowestFace(d.faces)].v;
      return `Raise the ${lo} on ${dieLabel(hero, m.die)} to a ${lo + 1}. Higher pips, easier pairs.`;
    }
    case 'trait': return `${dieLabel(hero, m.die)} becomes ${TRAITS[m.trait].name}: ${TRAITS[m.trait].text}`;
    case 'newDie': return `Add a plain ${MATERIALS[CLASS_MATERIAL[hero.classId]].name} die (${dice.length + 1} of ${MAX_SIGNATURE_DICE}). More of your colour in the bag means more Sets.`;
  }
}
