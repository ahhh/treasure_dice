/** SRD 5.2.1 species and backgrounds (paraphrased), plus name tables. */
import type { Ability, DamageType, Skill } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';

export interface SpeciesDef {
  id: string;
  name: string;
  text: string;
  resist?: DamageType[];
  hpPerLevel?: number;
  skill?: Skill;
  traits: string[];
}

export const SPECIES: Record<string, SpeciesDef> = {
  human: { id: 'human', name: 'Human', text: 'Resourceful and skilled: an extra skill and an extra reroll at the start of each expedition.', traits: ['resourceful'], skill: 'perception' },
  elf: { id: 'elf', name: 'Elf', text: 'Keen senses (Perception) and fey ancestry (advantage against charm).', traits: ['feyAncestry', 'darkvision'], skill: 'perception' },
  dwarf: { id: 'dwarf', name: 'Dwarf', text: 'Dwarven toughness (+1 HP per level) and poison resistance.', resist: ['poison'], hpPerLevel: 1, traits: ['darkvision', 'stonecunning'] },
  halfling: { id: 'halfling', name: 'Halfling', text: 'Luck: a natural 1 on an attack or save is rerolled. Brave against fear.', traits: ['halflingLuck', 'brave'] },
  dragonborn: { id: 'dragonborn', name: 'Dragonborn', text: 'Breath Weapon (1d10 per tier, DEX save, a whole rank) and fire resistance.', resist: ['fire'], traits: ['breathWeapon'] },
  gnome: { id: 'gnome', name: 'Gnome', text: 'Gnomish cunning: advantage on INT, WIS and CHA saves.', traits: ['gnomishCunning', 'darkvision'] },
  goliath: { id: 'goliath', name: 'Goliath', text: "Stone's Endurance: reduce a hit by 1d12 + CON, PB times per rest.", traits: ['stonesEndurance'] },
  orc: { id: 'orc', name: 'Orc', text: 'Relentless Endurance: once per long rest drop to 1 HP instead of 0.', traits: ['relentlessEndurance', 'darkvision'] },
  tiefling: { id: 'tiefling', name: 'Tiefling', text: 'Infernal legacy: fire resistance and the Fire Bolt cantrip.', resist: ['fire'], traits: ['infernalLegacy', 'darkvision'] },
};

export interface BackgroundDef {
  id: string;
  name: string;
  text: string;
  skills: Skill[];
  abilities: Ability[];
  feat: string;
}

export const BACKGROUNDS: Record<string, BackgroundDef> = {
  acolyte: { id: 'acolyte', name: 'Acolyte', text: 'Raised in a temple.', skills: ['insight', 'religion'], abilities: ['int', 'wis', 'cha'], feat: 'magicInitiate' },
  criminal: { id: 'criminal', name: 'Criminal', text: 'Knows the underside of every city.', skills: ['sleightOfHand', 'stealth'], abilities: ['dex', 'con', 'int'], feat: 'alert' },
  sage: { id: 'sage', name: 'Sage', text: 'A lifetime among books.', skills: ['arcana', 'history'], abilities: ['con', 'int', 'wis'], feat: 'magicInitiate' },
  soldier: { id: 'soldier', name: 'Soldier', text: 'Drilled, scarred, dependable.', skills: ['athletics', 'intimidation'], abilities: ['str', 'dex', 'con'], feat: 'savageAttacker' },
};

export const FIRST_NAMES = [
  'Alaric', 'Mira', 'Vex', 'Brannoc', 'Ysolde', 'Corvin', 'Tamsin', 'Oren', 'Kestrel', 'Ilsa', 'Davor', 'Seren',
  'Harrow', 'Quill', 'Rook', 'Elowen', 'Garrick', 'Liesl', 'Thane', 'Nyx', 'Bastian', 'Aveline', 'Doran', 'Fen',
  'Isolde', 'Jory', 'Kael', 'Lark', 'Magnus', 'Nell', 'Orla', 'Piety', 'Rhosyn', 'Sable', 'Tobin', 'Ula',
  'Wren', 'Yarrow', 'Zephyr', 'Ansel', 'Brisa', 'Cato', 'Delphine', 'Emrys', 'Frey', 'Gideon', 'Hale', 'Ivo',
];

export const LAST_NAMES = [
  'Ashdown', 'Blackbriar', 'Coppervein', 'Dunmore', 'Emberly', 'Fairwind', 'Greymantle', 'Hollowell', 'Ironwood', 'Kettleburn',
  'Larkspur', 'Mossgrave', 'Nettlefield', 'Oakhart', 'Pennywhistle', 'Quarrystone', 'Ravenscar', 'Saltmarsh', 'Thornwood', 'Underbough',
  'Vantrell', 'Whitlock', 'Yewbrook', 'Ambervale', 'Brightwater', 'Cindermoor', 'Dawnmere', 'Elmsworth', 'Foxglove', 'Goldhollow',
  'Hearthstone', 'Juniper', 'Kingsley', 'Lockhart', 'Marrowby', 'Northam', 'Oldcastle', 'Pike', 'Redfern', 'Stormcrow',
  'Tallowmere', 'Umber', 'Vale', 'Wyndham', 'Fletcher', 'Dicewright', 'Lanternfall', 'Blackwood', 'Silverhand', 'Gallowglass',
];

/** First + last name, avoiding every name in `taken` (case-insensitive). */
export function uniqueName(rng: Rng, taken: Iterable<string>): string {
  const used = new Set([...taken].map((n) => n.toLowerCase()));
  for (let i = 0; i < 200; i++) {
    const n = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    if (!used.has(n.toLowerCase())) return n;
  }
  // Exhausted the random tries (absurdly large roster): number the name.
  const base = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  let k = 2;
  while (used.has(`${base} ${k}`.toLowerCase())) k++;
  return `${base} ${k}`;
}

export const EPITHETS = [
  'the Bold', 'Ashborn', 'of the Lantern', 'Dicehand', 'the Quiet', 'Coinsworn', 'the Unlucky', 'Thrice-Risen',
  'Stormcalled', 'of Five Doors', 'the Gilded', 'Bonecaster', 'Lightfoot', 'the Grey', 'Oathbound', 'the Sly',
];
