/**
 * Subclasses: every 2014 fifth-edition subclass, adapted to this game's rules.
 * A hero picks one at level 3 (the class's `subclass` choice). Heroes from
 * before subclasses existed, and any hero past level 3 without a pick, follow
 * the class's SRD subclass (`srd: true`), which is what the game always used.
 *
 * Mechanics are data: a feature's `mods` fold into derive() like gear hooks,
 * `immune` blocks conditions, and `power` is a generic active resolved in
 * combat. The SRD subclasses keep their hand-written features, checked by id.
 *
 * Words: game.json → subclasses.<classId>.<subclassId>: name, summary,
 * resources.<id>.name and features.<featureId>.{name,text}.
 */
import type { Ability, ClassId, Hero } from '../engine/types.ts';
import { bindNamed, CLASSES, type FeatureDef, type ResourceDef } from './classes.ts';
import { text } from '../i18n/index.ts';
import { SUBCLASS_DATA } from './subclassData.ts';

/** A pool of uses: `max` is the proficiency bonus, an ability modifier (at least 1) or a number, from `from` level on. */
export interface PoolSpec { id: string; recharge: 'short' | 'long'; max: 'pb' | Ability | number; from?: number }

export interface SubclassSpec {
  id: string;
  classId: ClassId;
  /** Source book of the original rules (PHB, XGE, TCE…). */
  source: string;
  /** The class's SRD subclass: the default for heroes who never chose. */
  srd?: boolean;
  resources?: PoolSpec[];
  levels: Record<number, Omit<FeatureDef, 'name' | 'text'>[]>;
}

export interface SubclassDef extends Omit<SubclassSpec, 'resources' | 'levels'> {
  name: string;
  summary: string;
  resources: ResourceDef[];
  levels: Record<number, FeatureDef[]>;
}

/** Subclass choice level, for every class. */
export const SUBCLASS_LEVEL = 3;

const pbOf = (lvl: number) => 2 + Math.floor((lvl - 1) / 4);

function pool(p: PoolSpec): Omit<ResourceDef, 'name'> {
  const from = p.from ?? SUBCLASS_LEVEL;
  return {
    id: p.id, recharge: p.recharge,
    max: (l, m) => (l < from ? 0 : p.max === 'pb' ? pbOf(l) : typeof p.max === 'number' ? p.max : Math.max(1, m[p.max])),
  };
}

function build(spec: SubclassSpec): SubclassDef {
  const path = ['subclasses', spec.classId, spec.id];
  const def = { ...spec, resources: (spec.resources ?? []).map(pool), levels: spec.levels } as unknown as SubclassDef;
  for (const k of ['name', 'summary'] as const) Object.defineProperty(def, k, { get: () => text('game', [...path, k]), enumerable: true, configurable: true });
  for (const r of def.resources) bindNamed(r, [...path, 'resources'], ['name']);
  for (const fs of Object.values(def.levels)) for (const f of fs) bindNamed(f, [...path, 'features']);
  return def;
}

/** Every subclass by class, SRD subclass first. */
export const SUBCLASSES = {} as Record<ClassId, SubclassDef[]>;
for (const spec of SUBCLASS_DATA) (SUBCLASSES[spec.classId] ??= []).push(build(spec));
for (const list of Object.values(SUBCLASSES)) list.sort((a, b) => Number(!!b.srd) - Number(!!a.srd));

export function subclassById(classId: ClassId, id: string | undefined): SubclassDef | undefined {
  return id ? SUBCLASSES[classId]?.find((s) => s.id === id) : undefined;
}

/** The hero's subclass: their pick, else the SRD default once they reach level 3. */
export function subclassOf(hero: Pick<Hero, 'classId' | 'level' | 'choices'>): SubclassDef | undefined {
  if (hero.level < SUBCLASS_LEVEL) return undefined;
  const list = SUBCLASSES[hero.classId] ?? [];
  return subclassById(hero.classId, hero.choices.subclass?.[0]) ?? list.find((s) => s.srd) ?? list[0];
}

/** Has the hero actually picked (rather than defaulting)? */
export function hasChosenSubclass(hero: Pick<Hero, 'choices'>): boolean {
  return !!hero.choices.subclass?.length;
}

/** Features gained at one level: the class's, then the subclass's (once chosen or defaulted). */
export function featuresAt(hero: Pick<Hero, 'classId' | 'level' | 'choices'>, level: number): FeatureDef[] {
  const out = [...(CLASSES[hero.classId].levels[level] ?? [])];
  if (level >= SUBCLASS_LEVEL) {
    const sub = hasChosenSubclass(hero) || hero.level >= SUBCLASS_LEVEL ? subclassOf({ ...hero, level: Math.max(hero.level, SUBCLASS_LEVEL) }) : undefined;
    if (sub) out.push(...(sub.levels[level] ?? []));
  }
  return out;
}

/** Every feature from level 1 to `level`. */
export function featuresUpTo(hero: Pick<Hero, 'classId' | 'level' | 'choices'>, level = hero.level): FeatureDef[] {
  const out: FeatureDef[] = [];
  for (let l = 1; l <= level; l++) out.push(...featuresAt({ ...hero, level }, l));
  return out;
}

/** Class resources plus the subclass's own pools. */
export function resourcesOf(hero: Pick<Hero, 'classId' | 'level' | 'choices'>): ResourceDef[] {
  return [...CLASSES[hero.classId].resources, ...(subclassOf(hero)?.resources ?? [])];
}
