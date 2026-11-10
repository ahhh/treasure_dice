/**
 * Dialogue text, looked up by script and node id from `locales/<lang>/dialogue.json`.
 * Script files in src/content/dialogue hold only structure (who, mood, flow,
 * conditions, effects); every word comes from here.
 *
 * A line is either a string or a set of named variants. A node with variants
 * has a `pick(g)` that names the one to show, and may have `vars(g, helpers)`
 * for `{placeholders}` (e.g. the names of the fallen).
 */
import type { GameState } from '../engine/types.ts';
import type { DlgNode } from '../content/dialogueTypes.ts';
import { lookup, text, format, listJoin, plural } from './index.ts';

const NS = 'dialogue';

export const scriptTitle = (id: string) => text(NS, ['scripts', id, 'title']);

export const choiceLabel = (scriptId: string, nodeId: string, i: number) => text(NS, ['scripts', scriptId, 'choices', nodeId, String(i)]);

export const scriptTerm = (scriptId: string, key: string) => text(NS, ['scripts', scriptId, 'terms', key]);

/** The line for a node, variant and placeholders resolved (dialogue markup like `|` and {keeper} left in). */
export function lineText(g: GameState, scriptId: string, nodeId: string, node: DlgNode): string {
  const base = ['scripts', scriptId, 'lines', nodeId];
  const raw = lookup(NS, base);
  let out: string;
  if (raw !== null && typeof raw === 'object') {
    const v = node.pick?.(g) ?? 'default';
    out = text(NS, [...base, (raw as Record<string, unknown>)[v] !== undefined ? v : 'default']);
  } else out = text(NS, base);
  const vars = node.vars?.(g, { term: (k) => scriptTerm(scriptId, k), list: listJoin });
  return format(out, vars);
}

/** Index 0 = no heads awake … 5 = awakened; 6 = Tiamat slain. */
export const barkLine = (npc: string, stage: number): string | undefined => {
  const v = lookup(NS, ['barks', npc, String(stage)]);
  return typeof v === 'string' ? v : undefined;
};

export const hasBarks = (npc: string) => Array.isArray(lookup(NS, ['barks', npc]));

export const headLine = (biome: string) => text(NS, ['heads', biome]);

/** Maren reads a fallen hero's name off the Wall. */
export function eulogyLine(name: string, clears: number, kills: number, cause?: string): string {
  return text(NS, ['eulogy', 'line'], {
    name, kills,
    clears: plural(NS, ['eulogy', 'clears'], clears),
    cause: cause ? text(NS, ['eulogy', 'cause'], { cause }) : '',
  });
}
