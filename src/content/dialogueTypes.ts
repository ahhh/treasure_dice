/**
 * Dialogue script types and the `chain` helper. Scripts are data, not code, so they can be linted and replayed.
 * Scripts hold structure only; their words live in src/locales/<lang>/dialogue.json,
 * keyed by script id and node id (edit them with the dev editor: npm run dev → /dev/dialogue.html).
 * Text markup: `|` is a beat pause, {keeper} the Keeper's name, {hero} the
 * hero who just rolled, {best:<skill>} the roster hero best at a skill.
 */
import type { GameState, Skill } from '../engine/types.ts';
import type { Mood } from './npcs.ts';
import type { QuestCond, QuestFx } from './questTypes.ts';

export interface DlgChoice {
  /** Label text lives in locales/<lang>/dialogue.json → scripts.<id>.choices.<node>[i]. */
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
  /**
   * The text lives in locales/<lang>/dialogue.json → scripts.<id>.lines.<node>.
   * When that entry is a set of named variants, `pick` names the one to show.
   */
  pick?: (g: GameState) => string;
  /** Values for `{placeholders}` in the line; `term` reads the script's translatable `terms`. */
  vars?: (g: GameState, h: { term: (key: string) => string; list: (items: string[]) => string }) => Record<string, string>;
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
  /** The button hook ("Eren has news") is scripts.<id>.title in the locale file. */
  when: QuestCond;
  priority?: number;
  /** Plays as soon as the tab opens (otherwise the player starts it). */
  auto?: boolean;
  repeat?: boolean;
  start: string;
  nodes: Record<string, DlgNode>;
}

export type Line = [who: string, mood?: Mood] | DlgNode;

/** Build a linear run of nodes `${p}0 … ${p}n`; the last node takes `last` (choices, next, end, fx). */
export function chain(p: string, lines: Line[], last: Partial<DlgNode> = { end: true }): Record<string, DlgNode> {
  const out: Record<string, DlgNode> = {};
  lines.forEach((l, i) => {
    const n: DlgNode = Array.isArray(l) ? { who: l[0], mood: l[1] } : { ...l };
    const id = `${p}${i}`;
    if (i < lines.length - 1) { if (!n.choices && !n.end && !n.next) n.next = `${p}${i + 1}`; }
    else { const fx = [...(n.fx ?? []), ...(last.fx ?? [])]; Object.assign(n, last); if (fx.length) n.fx = fx; }
    out[id] = n;
  });
  return out;
}

