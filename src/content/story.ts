/**
 * The story: the re-emergence of Tiamat, the Dragon Queen. Deliberately
 * light — a prologue, one short chapter per echo cleared, a gate to the final
 * stage, and an epilogue. Chapters are keyed by biome so progress can be
 * derived from the sigils a Keep has already earned.
 */
import type { BiomeId, GameState, Hero } from '../engine/types.ts';
import { bindText, text, textTable, tx, txn } from '../i18n/index.ts';

export interface Chapter { id: string; title: string; head: string; text: string[] }

// Every word here lives in src/locales/<lang>/story.json (chapters, heads, finale, doors).
const chapter = (id: string) => textTable<Chapter, 'title' | 'head' | 'text'>('story', ['chapters', id], { id });

export const PROLOGUE: Chapter = chapter('prologue');

/** Which of Tiamat's heads feeds each echo. */
export const HEADS = textTable<Record<BiomeId, { color: string; name: string; breath: string }>, 'name' | 'breath'>('story', ['heads'], {
  cinder: { color: '#e4643a' },
  rootbound: { color: '#5fae5b' },
  drowned: { color: '#5a5a6e' },
  mirror: { color: '#dfe8f5' },
  starfall: { color: '#5aa9ff' },
});

export const CHAPTERS: Record<BiomeId, Chapter> = {
  cinder: chapter('cinder'),
  rootbound: chapter('rootbound'),
  drowned: chapter('drowned'),
  mirror: chapter('mirror'),
  starfall: chapter('starfall'),
};

export const FINALE = textTable<{ id: string; name: string; tagline: string; premise: string; bossRoom: string; bossText: string }, 'name' | 'tagline' | 'premise' | 'bossRoom' | 'bossText'>('story', ['finale'], { id: 'finale' });

export const EPILOGUE: Chapter = chapter('epilogue');

/** Each echo sits behind its own door, one per head; Tiamat waits behind the sixth. */
const DOOR_NAMES = bindText([] as string[], 'story', ['doors']);
const BIOME_DOORS: BiomeId[] = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
export function doorName(biome: BiomeId | undefined): string {
  const i = biome ? BIOME_DOORS.indexOf(biome) : -1;
  return i >= 0 ? DOOR_NAMES[i] : text('story', ['door']);
}

export const FINALE_LEVEL = 20;

/** Echoes whose doors are still unbroken (the Sixth Door stays sealed until all five fall). */
export function echoesUncleared(g: GameState): BiomeId[] {
  return BIOME_DOORS.filter((b) => !((g.profile.sigils[b] ?? 0) > 0));
}

/** Why the Sixth Door is still sealed for the whole Keep, or null once all five echoes are cleared and a level-20 hero lives. */
export function finaleSealed(g: GameState): string | null {
  const left = echoesUncleared(g).length;
  const champion = g.roster.some((h) => h.status === 'alive' && h.level >= FINALE_LEVEL);
  if (left && !champion) return txn('contentStory.sealedClearTheOtherEcho', left, { FINALE_LEVEL });
  if (left) return txn('contentStory.sealedClearTheOtherEcho2', left);
  if (!champion) return tx('contentStory.sealedNeedsALevelHero', { FINALE_LEVEL });
  return null;
}

/** The finale needs all five echoes cleared and at least one level-20 hero in the chosen party. */
export function finaleBlocked(party: Hero[], g?: GameState): string | null {
  if (g && echoesUncleared(g).length) return tx('contentStory.theSixthDoorStaysSealed');
  if (!party.some((h) => h.level >= FINALE_LEVEL)) return tx('contentStory.tiamatCanOnlyBeFaced', { FINALE_LEVEL });
  return null;
}

/** Chapters the Keep has earned (one per echo cleared). */
export function earnedChapters(g: GameState): Chapter[] {
  return (Object.keys(CHAPTERS) as BiomeId[]).filter((b) => (g.profile.sigils[b] ?? 0) > 0).map((b) => CHAPTERS[b]);
}

export function storyOf(g: GameState) {
  return (g.profile.story ??= { seen: [], tiamat: 0 });
}
