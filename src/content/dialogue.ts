/** All dialogue scenes (The Queen's Due and the Keep's keepers). Types live in dialogueTypes.ts. */
import type { Script } from './dialogueTypes.ts';
import { TAVERN_SCRIPTS } from './dialogue/tavern.ts';
import { KEEP_SCRIPTS } from './dialogue/keep.ts';

export type { Script, DlgNode, DlgChoice, Where, Line } from './dialogueTypes.ts';
export { chain } from './dialogueTypes.ts';

export const SCRIPTS: Script[] = [...TAVERN_SCRIPTS, ...KEEP_SCRIPTS];
