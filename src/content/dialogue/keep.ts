/**
 * The Keep speaks: facility keepers' quest scenes, their one-line barks for
 * each head awake, and the heads' own voices (docs/side-quest-the-queens-due.md §11–12).
 */
import { chain, type Script } from '../dialogueTypes.ts';

const S = (s: Script) => s;

export const KEEP_SCRIPTS: Script[] = [
  S({ id: 'pim.leads', where: 'cartographer', speaker: 'pim', when: { has: ['seen:bet.intro'] }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['pim', 'neutral'],
      ['pim', 'neutral'],
      ['pim', 'neutral'],
    ]) }),

  S({ id: 'sabeline.lampGlass', where: 'enchanter', speaker: 'sabeline', when: { has: ['ev:E5'] }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['sabeline', 'neutral'],
      ['sabeline', 'neutral'],
      ['sabeline', 'neutral'],
      ['sabeline', 'neutral'],
    ]) }),

  S({ id: 'pell.coins', where: 'vault', speaker: 'pell', when: { headsAtLeast: 3 }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['pell', 'neutral'],
      ['pell', 'neutral'],
      ['pell', 'neutral'],
    ]) }),

  S({ id: 'ilvane.warning', where: 'chronicle', speaker: 'ilvane', when: { headsAtLeast: 4, headsBelow: 5, has: ['ev:E7'], any: ['ev:E6', 'ev:E8'] }, priority: 50, start: 'a0',
    nodes: {
      ...chain('a', [
        ['ilvane', 'neutral'],
        { who: 'narrator', variant: 'read' },
        ['ilvane', 'neutral'],
        { who: 'ilvane', mood: 'neutral', choices: [
          { goto: 'warn0', fx: [{ flag: 'warned' }, { resolve: 2 }, { remember: 'ilvane' }] },
          { goto: 'wait' },
        ] },
      ]),
      ...chain('warn', [
        ['ilvane', 'neutral'],
        ['maren', 'neutral'],
      ]),
      wait: { who: 'ilvane', mood: 'neutral', end: true },
    } }),

  S({ id: 'ilvane.annotations', where: 'chronicle', speaker: 'ilvane', when: { awakened: true }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['ilvane', 'neutral'],
      ['ilvane', 'neutral'],
      ['ilvane', 'neutral'],
    ]) }),

  S({ id: 'maren.fallen', where: 'guild', speaker: 'maren', when: { has: ['seen:bet.intro'] }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['maren', 'neutral'],
      { who: 'maren', mood: 'neutral', pick: (g) => (g.roster.some((x) => x.status === 'dead') ? 'fallen' : 'none') },
    ]) }),
];

// Barks (one line per facility keeper per head awake) and Tiamat's heads' lines live in
// src/locales/<lang>/dialogue.json under `barks` and `heads`; read them via src/i18n/dialogue.ts.
