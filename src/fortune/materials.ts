/** Fortune die materials, special dice, and bag construction. */
import type { ClassId, Face, FaceMod, FortuneDie, HeroDie, Material } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';
import { bindText, textTable, type Textless } from '../i18n/index.ts';

export interface MaterialInfo {
  id: Material;
  name: string;
  color: string;
  ink: string;
  text: string;
}

export const MATERIALS = textTable<Record<Material, MaterialInfo>, 'name' | 'text'>('game', ['materials'], {
  bone: { id: 'bone', color: '#e9e1cf', ink: '#2a2118' },
  steel: { id: 'steel', color: '#9fb2c4', ink: '#0f1b26' },
  sun: { id: 'sun', color: '#f5c74a', ink: '#3b2600' },
  shadow: { id: 'shadow', color: '#4b3b6b', ink: '#efe6ff' },
  ember: { id: 'ember', color: '#e4643a', ink: '#2b0b00' },
  frost: { id: 'frost', color: '#9ad8f0', ink: '#082231' },
  verdant: { id: 'verdant', color: '#5fae5b', ink: '#071d06' },
  arcane: { id: 'arcane', color: '#7b6cf0', ink: '#f2efff' },
  blood: { id: 'blood', color: '#b3233a', ink: '#fff0f0' },
  storm: { id: 'storm', color: '#3a8fb8', ink: '#eaf8ff' },
  gold: { id: 'gold', color: '#d9a520', ink: '#2d1c00' },
  glass: { id: 'glass', color: '#cfeff5', ink: '#0d3640' },
  prism: { id: 'prism', color: '#ffffff', ink: '#222' },
  lead: { id: 'lead', color: '#6c6f74', ink: '#f4f4f4' },
});

export const CLASS_MATERIAL: Record<ClassId, Material> = {
  fighter: 'steel', paladin: 'sun', cleric: 'sun', barbarian: 'blood',
  rogue: 'shadow', warlock: 'shadow', wizard: 'arcane', bard: 'arcane',
  sorcerer: 'ember', druid: 'verdant', ranger: 'verdant', monk: 'storm', artificer: 'steel',
};

export const FACE_MODS = textTable<Record<FaceMod, { name: string; text: string; glyph: string }>, 'name' | 'text'>('game', ['faceMods'], {
  gilded: { glyph: '¤' },
  keen: { glyph: '◆' },
  fierce: { glyph: '✦' },
  savage: { glyph: '✸' },
  wild: { glyph: '★' },
  lucky: { glyph: '♣' },
  cursed: { glyph: '☠' },
});

export function standardFaces(): Face[] {
  return [1, 2, 3, 4, 5, 6].map((v) => ({ v }));
}

/** UIDs come only from the seeded stream so a reload reproduces them. */
export function newDieUid(rng: Rng): string {
  return `d${Math.floor(rng.next() * 2 ** 32).toString(36)}${Math.floor(rng.next() * 2 ** 32).toString(36)}`;
}

export function makeDie(rng: Rng, material: Material, faces?: Face[], name?: string): FortuneDie {
  return { uid: newDieUid(rng), material, faces: faces ?? standardFaces(), name };
}

/** Special dice that can be found as boons. */
export interface SpecialDie {
  id: string;
  name: string;
  material: Material;
  faces: Face[];
  text: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

export const SPECIAL_DICE: SpecialDie[] = ([
  { id: 'twinned', material: 'bone', faces: [3, 3, 3, 4, 4, 4].map((v) => ({ v })), rarity: 'common' },
  { id: 'highroller', material: 'bone', faces: [4, 5, 5, 6, 6, 6].map((v) => ({ v })), rarity: 'uncommon' },
  { id: 'snake', material: 'shadow', faces: [1, 1, 1, 1, 6, 6].map((v) => ({ v })), rarity: 'common' },
  { id: 'ladder', material: 'bone', faces: [{ v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 3, mod: 'wild' }, { v: 4 }], rarity: 'uncommon' },
  { id: 'goldbug', material: 'gold', faces: standardFaces().map((f, i) => (i % 2 ? { ...f, mod: 'gilded' as FaceMod } : f)), rarity: 'uncommon' },
  { id: 'glass', material: 'glass', faces: standardFaces(), rarity: 'uncommon' },
  { id: 'prism', material: 'prism', faces: standardFaces(), rarity: 'rare' },
  { id: 'loaded', material: 'lead', faces: standardFaces(), rarity: 'uncommon' },
  { id: 'frost', material: 'frost', faces: standardFaces(), rarity: 'common' },
  { id: 'nine', material: 'arcane', faces: [4, 5, 6, 7, 8, 9].map((v) => ({ v })), rarity: 'rare' },
  { id: 'starseed', material: 'prism', faces: [{ v: 6, mod: 'wild' }, { v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }], rarity: 'rare' },
  { id: 'berserk', material: 'blood', faces: [{ v: 1 }, { v: 2 }, { v: 6, mod: 'fierce' }, { v: 6, mod: 'fierce' }, { v: 3 }, { v: 4 }], rarity: 'uncommon' },
] as Textless<SpecialDie, 'name' | 'text'>[]).map((d) => textTable<SpecialDie, 'name' | 'text'>('game', ['specialDice', d.id], d));

export const SPECIAL_BY_ID: Record<string, SpecialDie> = Object.fromEntries(SPECIAL_DICE.map((d) => [d.id, d]));

export interface SignatureSet { owner: string; dice: HeroDie[] }

/**
 * Six bone dice plus each hero's signature dice. Without signature sets
 * (tests, old callers) every class brings two plain dice in its colour.
 */
export function buildStartingBag(rng: Rng, classes: ClassId[], signature?: SignatureSet[]): FortuneDie[] {
  const bag: FortuneDie[] = [];
  for (let i = 0; i < 6; i++) bag.push(makeDie(rng, 'bone'));
  if (signature) {
    for (const s of signature) {
      for (const d of s.dice) {
        const die = makeDie(rng, d.material, d.faces.map((f) => ({ ...f })));
        die.owner = s.owner;
        if (d.trait) die.trait = d.trait;
        bag.push(die);
      }
    }
    return bag;
  }
  for (const c of classes) {
    bag.push(makeDie(rng, CLASS_MATERIAL[c]));
    bag.push(makeDie(rng, CLASS_MATERIAL[c]));
  }
  return bag;
}

/** Roll a die: returns a face index. Lead dice roll twice and keep the higher. */
export function rollFace(rng: Rng, die: FortuneDie): number {
  const a = rng.int(0, die.faces.length - 1);
  if (die.material !== 'lead' && die.trait !== 'loaded') return a;
  const b = rng.int(0, die.faces.length - 1);
  return die.faces[b].v > die.faces[a].v ? b : a;
}
