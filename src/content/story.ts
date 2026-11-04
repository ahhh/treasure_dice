/**
 * The story: the re-emergence of Tiamat, the Dragon Queen. Deliberately
 * light — a prologue, one short chapter per echo cleared, a gate to the final
 * stage, and an epilogue. Chapters are keyed by biome so progress can be
 * derived from the sigils a Keep has already earned.
 */
import type { BiomeId, GameState, Hero } from '../engine/types.ts';

export interface Chapter { id: string; title: string; head: string; text: string[] }

export const PROLOGUE: Chapter = {
  id: 'prologue',
  title: 'The Queen Stirs',
  head: 'Prologue',
  text: [
    'Long ago five heroes sealed Tiamat, the five-headed Dragon Queen, behind the Sixth Door. In front of it they set five lesser doors, one to bind each of her heads. They hid all six beneath the Lantern Keep and lit a lantern for every head she bore.',
    'The lanterns are guttering. Behind the Sixth Door the Queen dreams, and each head\'s dreams seep out through its own door as an echo: drowned libraries, burning forges, cathedrals of glass. Each echo grows stronger while it stands.',
    'Break the echoes and the five doors with them. Raise heroes worthy of legend. When one of them stands at the height of their power, carry the last lantern through the Sixth Door and end her reign before she wakes.',
  ],
};

/** Which of Tiamat's heads feeds each echo. */
export const HEADS: Record<BiomeId, { color: string; name: string; breath: string }> = {
  cinder: { color: '#e4643a', name: 'the Red Head', breath: 'fire' },
  rootbound: { color: '#5fae5b', name: 'the Green Head', breath: 'poison' },
  drowned: { color: '#5a5a6e', name: 'the Black Head', breath: 'acid' },
  mirror: { color: '#dfe8f5', name: 'the White Head', breath: 'frost' },
  starfall: { color: '#5aa9ff', name: 'the Blue Head', breath: 'lightning' },
};

export const CHAPTERS: Record<BiomeId, Chapter> = {
  cinder: {
    id: 'cinder', head: 'Chapter I', title: 'Ash on the Wind',
    text: ['The Deep Forge goes cold. In the silence a voice like a furnace laughs: the Red Head has noticed you.', '"Little lantern-bearers," it purrs. "You have only woken me sooner."'],
  },
  rootbound: {
    id: 'rootbound', head: 'Chapter II', title: 'The Green Whisper',
    text: ['The Heartroot withers, and the spores scatter into nothing. The Green Head has lost its garden.', 'Back at the Keep a second lantern flares, then dims. The Queen is turning in her sleep.'],
  },
  drowned: {
    id: 'drowned', head: 'Chapter III', title: 'Ink and Acid',
    text: ['The Drowned Archive drains. In its last flooded vault you find a chart of all six doors, drawn by the heroes who first sealed them.', 'Their margin notes say the same thing in five hands: "Only a champion at the height of their power can stand before her."'],
  },
  mirror: {
    id: 'mirror', head: 'Chapter IV', title: 'The White Reflection',
    text: ['The Bright Nave shatters. In every falling shard you see the same thing: a throne of hoarded gold, and five heads raised above it.', 'She sees you too.'],
  },
  starfall: {
    id: 'starfall', head: 'Chapter V', title: 'The Last Lantern',
    text: ['The stars stop falling. All five echoes are broken, all five doors are dark, and the Queen has no more dreams to hide behind.', 'Only the Sixth Door remains, and it stands open. One lantern is left, and a champion of the twentieth level must carry it.'],
  },
};

export const FINALE = {
  id: 'finale',
  name: 'The Dragon Throne',
  tagline: 'Tiamat\'s hoard behind the Sixth Door.',
  premise: 'The last echo is no dream. Tiamat waits on a throne of stolen gold, her five heads breathing fire, poison, acid, frost and lightning. Every die in her presence bends to her will.',
  bossRoom: 'The Throne Behind the Sixth Door',
  bossText: 'A mountain of coins shifts. Five heads rise, each a different colour, and every one of them is looking at you.',
};

export const EPILOGUE: Chapter = {
  id: 'epilogue', head: 'Epilogue', title: 'The Lanterns Burn Bright',
  text: [
    'Tiamat falls. Her five heads breathe one last time, and then her hoard goes dark.',
    'In the Lantern Keep every lantern blazes at once. The echoes fade into ordinary dungeons with ordinary monsters and plenty of treasure.',
    'The Sixth Door still stands. Legends say she will rise again. When she does, the Keep will be ready.',
  ],
};

/** Each echo sits behind its own door, one per head; Tiamat waits behind the sixth. */
const DOOR_ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
const BIOME_DOORS: BiomeId[] = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
export function doorName(biome: BiomeId | undefined): string {
  const i = biome ? BIOME_DOORS.indexOf(biome) : -1;
  return i >= 0 ? `${DOOR_ORDINALS[i]} Door` : 'Door';
}

export const FINALE_LEVEL = 20;

/** The finale needs at least one level-20 hero in the chosen party. */
export function finaleBlocked(party: Hero[]): string | null {
  if (!party.some((h) => h.level >= FINALE_LEVEL)) return `Tiamat can only be faced with a level ${FINALE_LEVEL} hero in the party.`;
  return null;
}

/** Chapters the Keep has earned (one per echo cleared). */
export function earnedChapters(g: GameState): Chapter[] {
  return (Object.keys(CHAPTERS) as BiomeId[]).filter((b) => (g.profile.sigils[b] ?? 0) > 0).map((b) => CHAPTERS[b]);
}

export function storyOf(g: GameState) {
  return (g.profile.story ??= { seen: [], tiamat: 0 });
}
