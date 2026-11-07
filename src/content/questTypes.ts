/** Shared types for The Queen's Due: quest effects and conditions (used by events, dialogue and the quest engine). */

/** One change to the quest state. Exactly one key per effect. */
export type QuestFx =
  | { flag: string }
  | { unflag: string }
  | { evidence: string }
  | { trust: [string, number] }
  | { resolve: number }
  | { lead: string }
  | { leadDone: string }
  | { fate: [string, string] }
  | { gold: number }
  | { rumor: string }
  | { remember: string }
  | { muster: string };

/** A condition over the quest state. Every listed field must hold. */
export interface QuestCond {
  headsAtLeast?: number;
  headsBelow?: number;
  has?: string[];
  not?: string[];
  any?: string[];
  trust?: [string, number];
  fate?: [string, string];
  notFate?: [string, string];
  resolve?: number;
  awakened?: boolean;
  tiamatSlain?: boolean;
  mode?: 'legacy' | 'story';
  goldAtLeast?: number;
}
