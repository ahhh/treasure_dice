/**
 * The Dice Path: a second, tiny advancement track that runs beside the class
 * levels. Every hero owns their signature dice (two class-coloured dice to
 * start) and brings them into every expedition's bag. Each level-up offers
 * three permanent "marks" for those dice; the player picks one.
 *
 *   most levels      engrave a face (keen, fierce, gilded…) or hone a die
 *   levels 5/10/15/20 a trait milestone: loaded, kindred, echoing…
 *   levels 8 and 16   one of the offers is a new signature die (max 4)
 *   level 3           recolour: keep your colour or switch to one of two
 *                     random others; the colour you play is your affinity
 *
 * Offers are seeded from the hero id + level, so the preview and the
 * confirmed level-up always agree, and reloading never rerolls them.
 */
import type { DieTrait, Face, FaceMod, Hero, HeroDie, Material } from '../engine/types.ts';
import { Rng, seedState } from '../engine/rng.ts';
import { CLASS_MATERIAL, MATERIALS, FACE_MODS, standardFaces } from './materials.ts';
import { textTable } from '../i18n/index.ts';
import { subclassOf } from '../content/subclasses.ts';

export const TRAIT_LEVELS = [5, 10, 15, 20];
export const NEW_DIE_LEVELS = [8, 16];
export const MAX_SIGNATURE_DICE = 4;
/** Caps keep a level-20 die special without every face doing something. */
export const MAX_ENGRAVED_PER_DIE = 3;
export const HONE_FLOOR = 3;
export const RECOLOUR_LEVEL = 3;
/** Colours a hero can adopt at the recolour step: the class colours (no specials like Glass or Prism). */
export const DICE_COLOURS: Material[] = ['steel', 'sun', 'shadow', 'ember', 'verdant', 'arcane', 'blood', 'storm'];

/** The hero's dice colour: their class colour unless they changed it on the Dice Path. Dice of this colour earn their affinity bonus. */
export function heroColour(hero: Pick<Hero, 'classId' | 'colour'>): Material {
  return hero.colour ?? CLASS_MATERIAL[hero.classId];
}

export const TRAITS = textTable<Record<DieTrait, { name: string; text: string; glyph: string }>, 'name' | 'text'>('game', ['dieTraits'], {
  loaded: { glyph: '⬢' },
  kindred: { glyph: '♥' },
  echoing: { glyph: '↻' },
  steadfast: { glyph: '⛨' },
  eager: { glyph: '➚' },
});

export type DiceMark =
  | { kind: 'engrave'; die: number; face: number; mod: FaceMod }
  | { kind: 'hone'; die: number }
  | { kind: 'trait'; die: number; trait: DieTrait }
  | { kind: 'newDie' }
  | { kind: 'recolour'; material: Material };

type DiceOwner = Pick<Hero, 'classId' | 'dice' | 'colour'> & Partial<Pick<Hero, 'level' | 'choices'>>;

/** The second colour the hero's subclass adds, if any. */
export function subclassColour(hero: DiceOwner): Material | undefined {
  if (hero.level === undefined || !hero.choices) return undefined;
  return subclassOf(hero as Pick<Hero, 'classId' | 'level' | 'choices'>)?.dice;
}

/**
 * The hero's signature dice (a fresh copy; never mutate the result to change the hero).
 * A subclass with a colour adds one die of it; it is appended the first time it
 * appears and then saved with the hero's marks, recoloured if the subclass changes.
 */
export function heroDice(hero: DiceOwner): HeroDie[] {
  const src: HeroDie[] = hero.dice ?? [0, 1].map(() => ({ material: heroColour(hero), faces: standardFaces() }));
  const sub = subclassColour(hero);
  const out = src.filter((d) => !d.sub || sub).map((d): HeroDie => ({ material: d.sub ? sub! : d.material, faces: d.faces.map((f) => ({ ...f })), trait: d.trait, ...(d.sub ? { sub: true as const } : {}) }));
  if (sub && !out.some((d) => d.sub)) out.push({ material: sub, faces: standardFaces(), sub: true });
  return out;
}

/** Signature dice cap: the subclass die doesn't use up one of the Dice Path's slots. */
export function maxSignatureDice(dice: HeroDie[]): number {
  return MAX_SIGNATURE_DICE + (dice.some((d) => d.sub) ? 1 : 0);
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

  if (level === RECOLOUR_LEVEL) {
    // Keep your colour (always first, so auto-levelled recruits keep it) or take one of two others.
    const now = heroColour(hero);
    push({ kind: 'recolour', material: now });
    for (const material of rng.shuffle(DICE_COLOURS.filter((m) => m !== now)).slice(0, 2)) push({ kind: 'recolour', material });
    return out;
  }
  if (TRAIT_LEVELS.includes(level)) {
    const die = dice.findIndex((d) => !d.trait);
    if (die >= 0) {
      for (const trait of rng.shuffle(Object.keys(TRAITS) as DieTrait[]).slice(0, 3)) push({ kind: 'trait', die, trait });
      return out;
    }
  }
  if (NEW_DIE_LEVELS.includes(level) && dice.length < maxSignatureDice(dice)) push({ kind: 'newDie' });

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
  if (!out.length && dice.length < maxSignatureDice(dice)) push({ kind: 'newDie' });
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
      if (dice.length < maxSignatureDice(dice)) dice.push({ material: heroColour(hero), faces: standardFaces() });
      break;
    case 'recolour': {
      const old = heroColour(hero);
      for (const d of dice) if (!d.sub && d.material === old) d.material = mark.material;
      if (mark.material === CLASS_MATERIAL[hero.classId]) delete hero.colour;
      else hero.colour = mark.material;
      break;
    }
  }
  hero.dice = dice;
}

const ROMAN = ['I', 'II', 'III', 'IV'];

export function dieLabel(hero: Hero, i: number): string {
  const d = heroDice(hero)[i];
  return `${MATERIALS[d?.material ?? heroColour(hero)].name} die ${ROMAN[i] ?? i + 1}`;
}

export function markTitle(hero: Hero, m: DiceMark): string {
  switch (m.kind) {
    case 'engrave': return `${FACE_MODS[m.mod].name} ${heroDice(hero)[m.die].faces[m.face].v}`;
    case 'hone': return 'Hone';
    case 'trait': return TRAITS[m.trait].name;
    case 'newDie': return 'New signature die';
    case 'recolour': return m.material === heroColour(hero) ? `Stay ${MATERIALS[m.material].name}` : `Become ${MATERIALS[m.material].name}`;
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
    case 'newDie': return `Add a plain ${MATERIALS[heroColour(hero)].name} die (${dice.length + 1} of ${maxSignatureDice(dice)}). More of your colour in the bag means more Sets.`;
    case 'recolour': {
      const m2 = MATERIALS[m.material];
      return m.material === heroColour(hero)
        ? `Keep your ${m2.name} dice. ${m2.name} dice keep scoring +1 Mult for you.`
        : `Repaint your signature dice ${m2.name}. From now on ${m2.name} dice (not ${MATERIALS[heroColour(hero)].name}) score +1 Mult for you, and new signature dice come in ${m2.name}.`;
    }
  }
}
