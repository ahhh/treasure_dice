/** SRD 5.2.1 species and backgrounds (paraphrased), plus name tables. */
import type { Ability, DamageType, Skill } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';
import { lookup, textTable } from '../i18n/index.ts';

export interface SpeciesDef {
  id: string;
  name: string;
  text: string;
  resist?: DamageType[];
  hpPerLevel?: number;
  skill?: Skill;
  traits: string[];
}

export const SPECIES = textTable<Record<string, SpeciesDef>, 'name' | 'text'>('game', ['species'], {
  human: { id: 'human', traits: ['resourceful'], skill: 'perception' },
  elf: { id: 'elf', traits: ['feyAncestry', 'darkvision'], skill: 'perception' },
  dwarf: { id: 'dwarf', resist: ['poison'], hpPerLevel: 1, traits: ['darkvision', 'stonecunning'] },
  halfling: { id: 'halfling', traits: ['halflingLuck', 'brave'] },
  dragonborn: { id: 'dragonborn', resist: ['fire'], traits: ['breathWeapon'] },
  gnome: { id: 'gnome', traits: ['gnomishCunning', 'darkvision'] },
  goliath: { id: 'goliath', traits: ['stonesEndurance'] },
  orc: { id: 'orc', traits: ['relentlessEndurance', 'darkvision'] },
  tiefling: { id: 'tiefling', resist: ['fire'], traits: ['infernalLegacy', 'darkvision'] },
});

export interface BackgroundDef {
  id: string;
  name: string;
  text: string;
  skills: Skill[];
  abilities: Ability[];
  feat: string;
}

export const BACKGROUNDS = textTable<Record<string, BackgroundDef>, 'name' | 'text'>('game', ['backgrounds'], {
  acolyte: { id: 'acolyte', skills: ['insight', 'religion'], abilities: ['int', 'wis', 'cha'], feat: 'magicInitiate' },
  criminal: { id: 'criminal', skills: ['sleightOfHand', 'stealth'], abilities: ['dex', 'con', 'int'], feat: 'alert' },
  sage: { id: 'sage', skills: ['arcana', 'history'], abilities: ['con', 'int', 'wis'], feat: 'magicInitiate' },
  soldier: { id: 'soldier', skills: ['athletics', 'intimidation'], abilities: ['str', 'dex', 'con'], feat: 'savageAttacker' },
});

/** Name parts for one species (game.json → heroNames.<species>). Surnames join a start and an end. */
interface NameParts { female: string[]; male: string[]; surnameStart: string[]; surnameEnd: string[] }

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);
/** A species' name parts in the current language, falling back to English list by list. */
export function nameParts(species: string): NameParts {
  const sp = SPECIES[species] ? species : 'human';
  const get = (k: keyof NameParts) => { const here = list(lookup('game', ['heroNames', sp, k])); return here.length ? here : list(lookup('game', ['heroNames', 'human', k])); };
  return { female: get('female'), male: get('male'), surnameStart: get('surnameStart'), surnameEnd: get('surnameEnd') };
}

/** One random name in a species' style: a first name for the sex, and a two-part surname. */
export function speciesName(rng: Rng, species: string, sex?: 'male' | 'female'): string {
  const p = nameParts(species);
  const first = rng.pick(sex === 'female' ? p.female : sex === 'male' ? p.male : [...p.female, ...p.male]);
  return `${first} ${rng.pick(p.surnameStart)}${rng.pick(p.surnameEnd).toLowerCase()}`;
}

/**
 * A fresh name for a recruit of this species and sex, never one already in
 * `taken` (case-insensitive). It also tries to give a first name and a surname
 * nobody in `taken` has yet, so a roster reads as distinct people.
 */
export function uniqueName(rng: Rng, taken: Iterable<string>, species = 'human', sex?: 'male' | 'female'): string {
  const names = [...taken].map((n) => n.toLowerCase());
  const used = new Set(names);
  const firsts = new Set(names.map((n) => n.split(' ')[0]));
  const lasts = new Set(names.map((n) => n.split(' ').slice(1).join(' ')));
  let fallback = '';
  for (let i = 0; i < 200; i++) {
    const n = speciesName(rng, species, sex);
    const k = n.toLowerCase();
    if (used.has(k)) continue;
    const [f, ...rest] = k.split(' ');
    if (!firsts.has(f) && !lasts.has(rest.join(' '))) return n;
    fallback ||= n;
  }
  if (fallback) return fallback;
  // Exhausted the random tries (absurdly large roster): number the name.
  const base = speciesName(rng, species, sex);
  let k = 2;
  while (used.has(`${base} ${k}`.toLowerCase())) k++;
  return `${base} ${k}`;
}

export const EPITHETS = [
  'the Bold', 'Ashborn', 'of the Lantern', 'Dicehand', 'the Quiet', 'Coinsworn', 'the Unlucky', 'Thrice-Risen',
  'Stormcalled', 'of Six Doors', 'the Gilded', 'Bonecaster', 'Lightfoot', 'the Grey', 'Oathbound', 'the Sly',
];
