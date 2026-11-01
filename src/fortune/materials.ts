/** Fortune die materials, special dice, and bag construction. */
import type { ClassId, Face, FaceMod, FortuneDie, Material } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';

export interface MaterialInfo {
  id: Material;
  name: string;
  color: string;
  ink: string;
  text: string;
}

export const MATERIALS: Record<Material, MaterialInfo> = {
  bone: { id: 'bone', name: 'Bone', color: '#e9e1cf', ink: '#2a2118', text: 'Plain old bone. No special effect.' },
  steel: { id: 'steel', name: 'Steel', color: '#9fb2c4', ink: '#0f1b26', text: 'Fighter affinity.' },
  sun: { id: 'sun', name: 'Sun', color: '#f5c74a', ink: '#3b2600', text: 'Cleric & Paladin affinity.' },
  shadow: { id: 'shadow', name: 'Shadow', color: '#4b3b6b', ink: '#efe6ff', text: 'Rogue & Warlock affinity.' },
  ember: { id: 'ember', name: 'Ember', color: '#e4643a', ink: '#2b0b00', text: 'Sorcerer affinity.' },
  frost: { id: 'frost', name: 'Frost', color: '#9ad8f0', ink: '#082231', text: 'When scored: +8 chips.' },
  verdant: { id: 'verdant', name: 'Verdant', color: '#5fae5b', ink: '#071d06', text: 'Druid & Ranger affinity.' },
  arcane: { id: 'arcane', name: 'Arcane', color: '#7b6cf0', ink: '#f2efff', text: 'Wizard & Bard affinity.' },
  blood: { id: 'blood', name: 'Blood', color: '#b3233a', ink: '#fff0f0', text: 'Barbarian affinity.' },
  storm: { id: 'storm', name: 'Storm', color: '#3a8fb8', ink: '#eaf8ff', text: 'Monk affinity.' },
  gold: { id: 'gold', name: 'Gold', color: '#d9a520', ink: '#2d1c00', text: 'When scored: +1 doubloon.' },
  glass: { id: 'glass', name: 'Glass', color: '#cfeff5', ink: '#0d3640', text: 'When scored: ×2 mult. 1 in 4 chance to shatter.' },
  prism: { id: 'prism', name: 'Prism', color: '#ffffff', ink: '#222', text: 'Counts as every material.' },
  lead: { id: 'lead', name: 'Lead', color: '#6c6f74', ink: '#f4f4f4', text: 'Loaded: rolls twice and keeps the higher face.' },
};

export const CLASS_MATERIAL: Record<ClassId, Material> = {
  fighter: 'steel', paladin: 'sun', cleric: 'sun', barbarian: 'blood',
  rogue: 'shadow', warlock: 'shadow', wizard: 'arcane', bard: 'arcane',
  sorcerer: 'ember', druid: 'verdant', ranger: 'verdant', monk: 'storm',
};

export const FACE_MODS: Record<FaceMod, { name: string; text: string; glyph: string }> = {
  gilded: { name: 'Gilded', text: '+1 doubloon when scored.', glyph: '¤' },
  keen: { name: 'Keen', text: '+6 chips when scored.', glyph: '◆' },
  fierce: { name: 'Fierce', text: '+2 mult when scored.', glyph: '✦' },
  savage: { name: 'Savage', text: '×1.5 mult when scored.', glyph: '✸' },
  wild: { name: 'Wild', text: 'Counts as any value.', glyph: '★' },
  lucky: { name: 'Lucky', text: '1 in 3 chance: +6 mult when scored.', glyph: '♣' },
  cursed: { name: 'Cursed', text: 'Scores no pips and -1 mult.', glyph: '☠' },
};

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

export const SPECIAL_DICE: SpecialDie[] = [
  { id: 'twinned', name: 'Twinned Die', material: 'bone', faces: [3, 3, 3, 4, 4, 4].map((v) => ({ v })), text: 'Only threes and fours. Pairs come easy.', rarity: 'common' },
  { id: 'highroller', name: "High Roller's Die", material: 'bone', faces: [4, 5, 5, 6, 6, 6].map((v) => ({ v })), text: 'Weighted toward big pips.', rarity: 'uncommon' },
  { id: 'snake', name: 'Snake Die', material: 'shadow', faces: [1, 1, 1, 1, 6, 6].map((v) => ({ v })), text: 'Ones and sixes — feast or famine.', rarity: 'common' },
  { id: 'ladder', name: 'Ladder Die', material: 'bone', faces: [{ v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 3, mod: 'wild' }, { v: 4 }], text: 'Built for straights. One wild face.', rarity: 'uncommon' },
  { id: 'goldbug', name: 'Goldbug Die', material: 'gold', faces: standardFaces().map((f, i) => (i % 2 ? { ...f, mod: 'gilded' as FaceMod } : f)), text: 'Gold die with three gilded faces.', rarity: 'uncommon' },
  { id: 'glass', name: 'Glass Die', material: 'glass', faces: standardFaces(), text: '×2 mult when scored; might shatter.', rarity: 'uncommon' },
  { id: 'prism', name: 'Prism Die', material: 'prism', faces: standardFaces(), text: 'Counts as every material — Sets love it.', rarity: 'rare' },
  { id: 'loaded', name: 'Loaded Die', material: 'lead', faces: standardFaces(), text: 'Rolls twice, keeps the higher.', rarity: 'uncommon' },
  { id: 'frost', name: 'Frost Die', material: 'frost', faces: standardFaces(), text: '+8 chips whenever it scores.', rarity: 'common' },
  { id: 'nine', name: 'Ninefold Die', material: 'arcane', faces: [4, 5, 6, 7, 8, 9].map((v) => ({ v })), text: 'Faces from four to nine.', rarity: 'rare' },
  { id: 'starseed', name: 'Starseed Die', material: 'prism', faces: [{ v: 6, mod: 'wild' }, { v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }], text: 'Prism die with a wild face.', rarity: 'rare' },
  { id: 'berserk', name: 'Berserk Die', material: 'blood', faces: [{ v: 1 }, { v: 2 }, { v: 6, mod: 'fierce' }, { v: 6, mod: 'fierce' }, { v: 3 }, { v: 4 }], text: 'Two fierce sixes.', rarity: 'uncommon' },
];

export const SPECIAL_BY_ID: Record<string, SpecialDie> = Object.fromEntries(SPECIAL_DICE.map((d) => [d.id, d]));

export function buildStartingBag(rng: Rng, classes: ClassId[]): FortuneDie[] {
  const bag: FortuneDie[] = [];
  for (let i = 0; i < 6; i++) bag.push(makeDie(rng, 'bone'));
  for (const c of classes) {
    bag.push(makeDie(rng, CLASS_MATERIAL[c]));
    bag.push(makeDie(rng, CLASS_MATERIAL[c]));
  }
  return bag;
}

/** Roll a die: returns a face index. Lead dice roll twice and keep the higher. */
export function rollFace(rng: Rng, die: FortuneDie): number {
  const a = rng.int(0, die.faces.length - 1);
  if (die.material !== 'lead') return a;
  const b = rng.int(0, die.faces.length - 1);
  return die.faces[b].v > die.faces[a].v ? b : a;
}
