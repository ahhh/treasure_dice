/**
 * Dialogue script types and the `chain` helper. Scripts are data, not code, so they can be linted and replayed.
 * Text markup: `|` is a beat pause, {keeper} the Keeper's name, {hero} the
 * hero who just rolled, {best:<skill>} the roster hero best at a skill.
 */
import type { GameState, Skill } from '../engine/types.ts';
import type { Mood } from './npcs.ts';
import type { QuestCond, QuestFx } from './questTypes.ts';

export interface DlgChoice {
  label: string;
  when?: QuestCond;
  check?: { skill: Skill; dc: number };
  goto?: string;
  /** Where a failed check leads (defaults to goto). */
  fail?: string;
  fx?: QuestFx[];
  failFx?: QuestFx[];
}

export interface DlgNode {
  /** An NPC id, 'hero' (the hero who just rolled), 'narrator', or 'head:<biome>'. */
  who: string;
  mood?: Mood;
  say: string | ((g: GameState) => string);
  /** Effects applied when the player moves past this node. */
  fx?: QuestFx[];
  next?: string;
  choices?: DlgChoice[];
  /** Show only when this holds; otherwise jump to `skip`. */
  when?: QuestCond;
  skip?: string;
  end?: boolean;
  /** 'read' = parchment box for documents; 'head' = one of Tiamat's heads. */
  variant?: 'speech' | 'read' | 'head';
}

export type Where = 'tavern' | 'kilnrow' | 'muster' | 'guild' | 'chronicle' | 'cartographer' | 'armory' | 'apothecary' | 'enchanter' | 'training' | 'vault' | 'codex';

export interface Script {
  id: string;
  where: Where;
  /** Who the scene belongs to (the patron button in the tavern). */
  speaker: string;
  /** A short hook for the button ("Eren has news"). */
  title: string;
  when: QuestCond;
  priority?: number;
  /** Plays as soon as the tab opens (otherwise the player starts it). */
  auto?: boolean;
  repeat?: boolean;
  start: string;
  nodes: Record<string, DlgNode>;
}

export type Line = [who: string, mood: Mood | undefined, say: string] | DlgNode;

/** Build a linear run of nodes `${p}0 … ${p}n`; the last node takes `last` (choices, next, end, fx). */
export function chain(p: string, lines: Line[], last: Partial<DlgNode> = { end: true }): Record<string, DlgNode> {
  const out: Record<string, DlgNode> = {};
  lines.forEach((l, i) => {
    const n: DlgNode = Array.isArray(l) ? { who: l[0], mood: l[1], say: l[2] } : { ...l };
    const id = `${p}${i}`;
    if (i < lines.length - 1) { if (!n.choices && !n.end && !n.next) n.next = `${p}${i + 1}`; }
    else { const fx = [...(n.fx ?? []), ...(last.fx ?? [])]; Object.assign(n, last); if (fx.length) n.fx = fx; }
    out[id] = n;
  });
  return out;
}

