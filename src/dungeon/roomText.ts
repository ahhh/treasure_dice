/**
 * Room and expedition-theme text in the current language. Generated rooms keep
 * locale refs (nameRef/textRefs, themeRefs) next to the English they were made
 * with, so a saved run follows a language switch; old saves fall back to the English.
 */
import type { Expedition, Room } from '../engine/types.ts';
import { resolveRef } from '../i18n/index.ts';

export const roomName = (r: Room) => (r.nameRef ? resolveRef(r.nameRef) : r.name);
export const roomText = (r: Room) => (r.textRefs ? r.textRefs.map(resolveRef).join(' ') : r.text);

type ThemeKey = keyof Expedition['theme'];
export const themeText = (exp: Expedition, k: ThemeKey) => {
  const r = exp.themeRefs?.[k];
  return r ? resolveRef(r) : exp.theme[k];
};
