/**
 * Small vocabularies the game shows by id: condition names, damage types, weapon
 * properties and masteries, armor types, item kinds (game.json → terms.<group>.<id>).
 * Falls back to the id itself.
 */
import type { ConditionId } from '../engine/types.ts';
import { lookup } from '../i18n/index.ts';

export type TermGroup = 'conditions' | 'damageTypes' | 'weaponProps' | 'masteries' | 'armorTypes' | 'weaponClass' | 'itemKinds' | 'ancestry';

export function term(group: TermGroup, id: string): string {
  const v = lookup('game', ['terms', group, id]);
  return typeof v === 'string' ? v : id;
}

export const condName = (id: ConditionId | string) => (id ? term('conditions', id) : '');
