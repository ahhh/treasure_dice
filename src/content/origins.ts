/** SRD 5.2.1 species and backgrounds (paraphrased), plus name tables. */
import type { Ability, DamageType, Skill } from '../engine/types.ts';
import type { Rng } from '../engine/rng.ts';
import { textTable } from '../i18n/index.ts';

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
  'Stormcalled', 'of Six Doors', 'the Gilded', 'Bonecaster', 'Lightfoot', 'the Grey', 'Oathbound', 'the Sly',
];
