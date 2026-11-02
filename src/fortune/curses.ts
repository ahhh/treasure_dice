/**
 * Curses: boss and elite rules that bend the Fortune Tray for one fight —
 * this game's answer to boss blinds. Shown up front so players can adapt.
 */
import type { PlayedDie } from './charms.ts';

export type CurseId =
  | 'ashen' | 'molten' | 'thorns' | 'barren' | 'tide' | 'oddDrown' | 'evenMirror'
  | 'void' | 'gravity' | 'hunger' | 'silence' | 'judgement' | 'chromatic';

export interface CurseDef {
  id: CurseId;
  name: string;
  text: string;
  debuff?: (d: PlayedDie) => boolean;
  multFactor?: number;
  rerollDelta?: number;
  handSizeDelta?: number;
  ignoreOmens?: boolean;
  rerollHpCost?: number;
  repeatPenalty?: boolean;
}

export const CURSES: Record<CurseId, CurseDef> = {
  ashen: { id: 'ashen', name: 'Ashen Pall', text: 'Dice showing 1 or 2 are debuffed (score nothing).', debuff: (d) => d.value <= 2 },
  molten: { id: 'molten', name: 'Molten Seal', text: 'Steel and Ember dice are debuffed.', debuff: (d) => d.material === 'steel' || d.material === 'ember' },
  thorns: { id: 'thorns', name: 'Thorned Cup', text: 'Each reroll costs the acting hero 4% of max HP.', rerollHpCost: 0.04 },
  barren: { id: 'barren', name: 'Barren Bones', text: 'Bone dice are debuffed.', debuff: (d) => d.material === 'bone' },
  tide: { id: 'tide', name: 'Undertow', text: 'All Mult is halved.', multFactor: 0.5 },
  oddDrown: { id: 'oddDrown', name: 'Drowned Odds', text: 'Odd dice are debuffed.', debuff: (d) => d.value % 2 === 1 },
  evenMirror: { id: 'evenMirror', name: 'Mirror Pall', text: 'Even dice are debuffed.', debuff: (d) => d.value % 2 === 0 },
  void: { id: 'void', name: 'The Unwritten', text: 'Omens are ignored: every hand scores at Lv.1.', ignoreOmens: true },
  gravity: { id: 'gravity', name: 'Crushing Weight', text: 'Dice showing 5 or more are debuffed.', debuff: (d) => d.value >= 5 },
  hunger: { id: 'hunger', name: 'Gnawing Hunger', text: 'Tray size -2.', handSizeDelta: -2 },
  silence: { id: 'silence', name: 'Hush', text: '-1 reroll every turn.', rerollDelta: -1 },
  chromatic: { id: 'chromatic', name: 'Chromatic Dominion', text: 'Ember, Verdant, Shadow, Frost and Storm dice are debuffed, and Mult is ×0.75.', debuff: (d) => ['ember', 'verdant', 'shadow', 'frost', 'storm'].includes(d.material), multFactor: 0.75 },
  judgement: { id: 'judgement', name: 'Judgement', text: 'Playing the same hand type twice in a row scores ×0.5.', repeatPenalty: true },
};
