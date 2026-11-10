/**
 * Curses: boss and elite rules that bend the Fortune Tray for one fight —
 * this game's answer to boss blinds. Shown up front so players can adapt.
 */
import type { PlayedDie } from './charms.ts';
import { textTable } from '../i18n/index.ts';

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

export const CURSES = textTable<Record<CurseId, CurseDef>, 'name' | 'text'>('game', ['curses'], {
  ashen: { id: 'ashen', debuff: (d) => d.value <= 2 },
  molten: { id: 'molten', debuff: (d) => d.material === 'steel' || d.material === 'ember' },
  thorns: { id: 'thorns', rerollHpCost: 0.04 },
  barren: { id: 'barren', debuff: (d) => d.material === 'bone' },
  tide: { id: 'tide', multFactor: 0.5 },
  oddDrown: { id: 'oddDrown', debuff: (d) => d.value % 2 === 1 },
  evenMirror: { id: 'evenMirror', debuff: (d) => d.value % 2 === 0 },
  void: { id: 'void', ignoreOmens: true },
  gravity: { id: 'gravity', debuff: (d) => d.value >= 5 },
  hunger: { id: 'hunger', handSizeDelta: -2 },
  silence: { id: 'silence', rerollDelta: -1 },
  chromatic: { id: 'chromatic', debuff: (d) => ['ember', 'verdant', 'shadow', 'frost', 'storm'].includes(d.material), multFactor: 0.75 },
  judgement: { id: 'judgement', repeatPenalty: true },
});
