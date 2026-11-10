/**
 * The Low Lantern: The Queen's Due, scene by scene (docs/side-quest-the-queens-due.md §5, §16).
 * Every act opens on heads awake (echoes cleared), never on hero level.
 */
import type { GameState } from '../../engine/types.ts';
import { chain, type Script } from '../dialogueTypes.ts';

const S = (s: Script) => s;
const stage = (g: GameState) => ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'].filter((b) => (g.profile.sigils[b as 'cinder'] ?? 0) > 0).length;
const fate = (g: GameState, npc: string) => g.profile.quest?.fate[npc];
const flag = (g: GameState, f: string) => !!g.profile.quest?.flags.includes(f);
const fallen = (g: GameState) => g.roster.filter((h) => h.status === 'dead').map((h) => h.name);
/** Evidence the Keeper can read out at the assembly; each is a translatable term. */
const EVIDENCE_READ = ['E1', 'E2', 'E3', 'E6', 'E8'];

export const TAVERN_SCRIPTS: Script[] = [
  // ── Act 0 ───────────────────────────────────────────────────────────────
  S({ id: 'bet.intro', where: 'tavern', speaker: 'bet', when: { not: ['catchup'] }, priority: 100, auto: true, start: 'a0',
    nodes: {
      ...chain('a', [
        ['bet', 'neutral'],
        ['bet', 'neutral'],
        ['bet', 'warm'],
        ['narrator'],
        ['eren', 'grin'],
        ['bet', 'neutral'],
        { who: 'eren', mood: 'grin', choices: [
            { goto: 'lend', fx: [{ trust: ['eren', 1] }, { flag: 'lentSilver' }] },
            { goto: 'refuse' },
            { check: { skill: 'sleightOfHand', dc: 12 }, goto: 'loaded', fail: 'refuse', fx: [{ trust: ['eren', 1] }] },
          ] },
      ]),
      lend: { who: 'eren', mood: 'grin', next: 'b0' },
      refuse: { who: 'eren', mood: 'neutral', next: 'b0' },
      loaded: { who: 'eren', mood: 'worried', next: 'b0' },
      ...chain('b', [
        ['eren', 'neutral'],
        ['eren', 'worried'],
        ['eren', 'grin'],
        ['bet', 'neutral'],
        ['eren', 'grin'],
      ], { end: true, fx: [{ lead: 'L0' }] }),
    } }),

  S({ id: 'bet.catchup', where: 'tavern', speaker: 'bet', when: { has: ['catchup'] }, priority: 110, auto: true, start: 'a0',
    nodes: chain('a', [
      ['bet', 'neutral'],
      ['bet', 'neutral'],
      ['bet', 'worried'],
      ['bet', 'neutral'],
    ], { end: true, fx: [{ unflag: 'catchup' }, { flag: 'seen:bet.intro' }] }) }),

  // ── Act 1: the Red Head wakes ───────────────────────────────────────────
  S({ id: 'bet.lamps', where: 'tavern', speaker: 'bet', when: { headsAtLeast: 1 }, priority: 80, start: 'a0',
    nodes: chain('a', [
      ['bet', 'worried'],
      ['bet', 'neutral'],
    ]) }),

  S({ id: 'eren.noManifest', where: 'tavern', speaker: 'eren', when: { headsAtLeast: 1, not: ['ev:E1'] }, priority: 92, start: 'a0',
    nodes: chain('a', [
      ['eren', 'worried'],
      ['eren', 'neutral'],
    ], { end: true, fx: [{ lead: 'L0' }] }) }),

  S({ id: 'eren.hands', where: 'tavern', speaker: 'eren', when: { headsAtLeast: 1, has: ['ev:E1'] }, priority: 90, start: 'a0',
    nodes: {
      ...chain('a', [
        { who: 'eren', mood: 'grin', when: { has: ['leadDone:L0'] }, skip: 'a1' },
        ['eren', 'worried'],
        { who: 'eren', mood: 'worried', choices: [
          { goto: 'who' },
          { goto: 'mistake' },
          { check: { skill: 'insight', dc: 12 }, goto: 'knows', fail: 'mistake', fx: [{ trust: ['eren', 1] }] },
        ] },
      ]),
      who: { who: 'eren', mood: 'neutral', next: 'c0' },
      mistake: { who: 'eren', mood: 'neutral', next: 'c0' },
      knows: { who: 'eren', mood: 'worried', next: 'c0' },
      ...chain('c', [
        ['eren', 'neutral'],
        ['bet', 'neutral'],
      ], { end: true, fx: [{ flag: 'act1.hands' }, { lead: 'L1' }] }),
    } }),

  S({ id: 'veska.intro', where: 'tavern', speaker: 'veska', when: { headsAtLeast: 1, has: ['seen:eren.hands'] }, priority: 70, start: 'a0',
    nodes: chain('a', [
      ['veska', 'neutral'],
      ['eren', 'grin'],
      ['veska', 'neutral'],
      ['eren', 'worried'],
      ['veska', 'neutral'],
    ], { end: true, fx: [{ flag: 'met:veska' }] }) }),

  S({ id: 'corvin.round', where: 'tavern', speaker: 'corvin', when: { headsAtLeast: 1 }, priority: 60, start: 'a0',
    nodes: chain('a', [
      ['corvin', 'neutral'],
      ['corvin', 'neutral'],
      ['bet', 'neutral'],
    ], { end: true, fx: [{ flag: 'corvin.coat' }] }) }),

  S({ id: 'hessa.kilnrow', where: 'kilnrow', speaker: 'hessa', when: { has: ['act1.hands'], not: ['leadDone:L1'] }, priority: 80, start: 'a0',
    nodes: {
      ...chain('a', [
        ['narrator'],
        ['hessa', 'neutral'],
        ['hessa', 'neutral'],
        { who: 'hessa', mood: 'neutral', choices: [
            { goto: 'who0' },
            { goto: 'cult' },
          ] },
      ]),
      cult: { who: 'hessa', mood: 'neutral', next: 'who0' },
      ...chain('who', [
        ['hessa', 'neutral'],
        { who: 'narrator', variant: 'read' },
        ['hessa', 'neutral'],
      ], { end: true, fx: [{ evidence: 'E2' }, { leadDone: 'L1' }, { lead: 'L2' }, { trust: ['kilnrow', 1] }, { flag: 'met:hessa' }] }),
    } }),

  // ── Act 2: the Green Head wakes ─────────────────────────────────────────
  S({ id: 'eren.trust', where: 'tavern', speaker: 'eren', when: { headsAtLeast: 2 }, priority: 90, start: 'a0',
    nodes: chain('a', [
      ['eren', 'worried'],
      ['eren', 'worried'],
      ['eren', 'resolved'],
      ['eren', 'worried'],
      { who: 'bet', mood: 'neutral', fx: [{ lead: 'L3' }] },
    ], { end: true, fx: [{ flag: 'met:corvin' }] }) }),

  S({ id: 'sereth.intro', where: 'tavern', speaker: 'sereth', when: { headsAtLeast: 2 }, priority: 85, start: 'a0',
    nodes: {
      ...chain('a', [
        ['sereth', 'neutral'],
        ['sereth', 'neutral'],
        { who: 'sereth', mood: 'neutral', fx: [{ flag: 'met:sereth' }],
          choices: [
            { goto: 'why' },
            { goto: 'what0' },
          ] },
      ]),
      why: { who: 'sereth', mood: 'neutral', next: 'end0' },
      ...chain('what', [
        ['sereth', 'fervent'],
        ['sereth', 'neutral'],
        ['sereth', 'fervent'],
        { who: 'sereth', mood: 'fervent', choices: [
            { check: { skill: 'insight', dc: 14 }, goto: 'insight', fail: 'end0' },
            { check: { skill: 'religion', dc: 13 }, goto: 'religion', fail: 'end0' },
            { goto: 'end0' },
          ] },
      ]),
      insight: { who: 'hero', next: 'end0' },
      religion: { who: 'hero', next: 'end0' },
      ...chain('end', [
        ['sereth', 'neutral'],
      ], { end: true, fx: [{ remember: 'sereth' }] }),
    } }),

  S({ id: 'ilo.freed', where: 'tavern', speaker: 'ilo', when: { has: ['iloFreed'] }, priority: 75, start: 'a0',
    nodes: chain('a', [
      ['ilo', 'neutral'],
      ['ilo', 'neutral'],
      ['ilo', 'neutral'],
    ], { end: true, fx: [{ resolve: 1 }, { flag: 'met:ilo' }] }) }),

  // ── Act 3: the Black Head wakes ─────────────────────────────────────────
  S({ id: 'bet.choirCorner', where: 'tavern', speaker: 'bet', when: { headsAtLeast: 3 }, priority: 70, start: 'a0',
    nodes: chain('a', [
      ['bet', 'worried'],
      ['bet', 'neutral'],
      ['bet', 'neutral'],
    ]) }),

  S({ id: 'eren.containment', where: 'tavern', speaker: 'eren', when: { headsAtLeast: 3, has: ['ev:E5'] }, priority: 95, start: 'a0',
    nodes: chain('a', [
      ['eren', 'worried'],
      { who: 'eren', mood: 'worried', when: { has: ['iloFreed'] }, skip: 'a2' },
      ['eren', 'resolved'],
      ['eren', 'resolved'],
      ['bet', 'worried'],
      ['eren', 'grin'],
    ], { end: true, fx: [{ flag: 'erenGoing' }] }) }),

  S({ id: 'bet.erenGone', where: 'tavern', speaker: 'bet', when: { has: ['erenGoing'], notFate: ['eren', 'alive'] }, priority: 120, auto: true, start: 'a0',
    nodes: chain('a', [
      ['bet', 'worried'],
      ['bet', 'worried'],
      ['bet', 'grief'],
    ], { end: true, fx: [{ lead: 'LE' }] }) }),

  S({ id: 'eren.rescued', where: 'tavern', speaker: 'eren', when: { has: ['leadDone:LE'], fate: ['eren', 'alive'] }, priority: 110, auto: true, start: 'a0',
    nodes: chain('a', [
      ['eren', 'resolved'],
      ['eren', 'worried'],
      { who: 'eren', mood: 'grin', when: { has: ['lentSilver'] }, skip: 'a3' },
      ['eren', 'resolved'],
      ['bet', 'warm'],
    ], { end: true, fx: [{ trust: ['eren', 1] }, { resolve: 1 }, { remember: 'eren' }] }) }),

  S({ id: 'bet.erenCaptured', where: 'tavern', speaker: 'bet', when: { fate: ['eren', 'captured'] }, priority: 120, auto: true, start: 'a0',
    nodes: chain('a', [
      ['narrator'],
      ['bet', 'grief'],
      ['bet', 'grief'],
    ]) }),

  // ── Act 4: the White Head wakes ─────────────────────────────────────────
  S({ id: 'veska.ledger', where: 'tavern', speaker: 'veska', when: { headsAtLeast: 4, any: ['ev:E3', 'ev:E2'] }, priority: 95, start: 'a0',
    nodes: {
      ...chain('a', [
        ['veska', 'neutral'],
        { who: 'narrator', variant: 'read' },
        ['veska', 'cornered'],
        ['veska', 'cornered'],
        ['veska', 'neutral'],
        { who: 'veska', mood: 'neutral', choices: [
          { when: { has: ['ev:E3'] }, goto: 'dates' },
          { when: { has: ['ev:E6'] }, goto: 'letter' },
          { goto: 'tarn' },
        ] },
      ]),
      dates: { who: 'veska', mood: 'ashamed', next: 'm0' },
      letter: { who: 'veska', mood: 'cornered', next: 'm0' },
      tarn: { who: 'veska', mood: 'ashamed', next: 'm1' },
      ...chain('m', [
        { who: 'eren', mood: 'resolved', when: { fate: ['eren', 'alive'] }, skip: 'm1' },
        { who: 'veska', mood: 'ashamed', choices: [
          { goto: 'help', fx: [{ fate: ['veska', 'testifies'] }, { evidence: 'E8' }, { resolve: 1 }, { remember: 'veska' }] },
          { goto: 'expose', fx: [{ fate: ['veska', 'imprisoned'] }, { evidence: 'E8' }, { resolve: 1 }, { trust: ['kilnrow', -1] }, { remember: 'veska' }] },
          { goto: 'leave', fx: [{ fate: ['veska', 'fled'] }] },
        ] },
      ]),
      help: { who: 'veska', mood: 'ashamed', end: true },
      expose: { who: 'veska', mood: 'ashamed', end: true },
      leave: { who: 'narrator', variant: 'read', end: true },
    } }),

  S({ id: 'voices.three', where: 'tavern', speaker: 'eren', when: { headsAtLeast: 4, has: ['ev:E7'] }, priority: 90, start: 'a0',
    nodes: {
      ...chain('a', [
        ['narrator'],
        { who: 'eren', mood: 'resolved', when: { fate: ['eren', 'alive'] }, skip: 'a2' },
        { who: 'bet', mood: 'worried', when: { notFate: ['eren', 'alive'] }, skip: 'a3' },
        ['sereth', 'fervent'],
        { who: 'veska', mood: 'cornered', when: { fate: ['veska', 'testifies'] }, skip: 'a5' },
        { who: 'sereth', mood: 'neutral', choices: [
          { when: { has: ['ev:E6'] }, goto: 'letter', fx: [{ flag: 'serethDoubts' }] },
          { when: { has: ['ev:E8'] }, goto: 'ledger', fx: [{ flag: 'serethDoubts' }] },
          { goto: 'b0' },
        ] },
      ]),
      letter: { who: 'sereth', mood: 'neutral', next: 'b0' },
      ledger: { who: 'sereth', mood: 'broken', next: 'b0' },
      ...chain('b', [
        { who: 'eren', mood: 'resolved', when: { has: ['ev:E6'], any: ['ev:E3', 'ev:E4'] }, skip: 'b2', fx: [{ flag: 'corvinExposed' }, { fate: ['corvin', 'exposed'] }] },
        ['bet', 'neutral'],
        ['bet', 'neutral'],
      ]),
    } }),

  // ── Act 5: Tiamat awakens ───────────────────────────────────────────────
  S({ id: 'awaken.onlyLight', where: 'tavern', speaker: 'bet', when: { headsAtLeast: 5, tiamatSlain: false }, priority: 200, auto: true, start: 'a0',
    nodes: {
      ...chain('a', [
        ['bet', 'worried'],
        ['bet', 'neutral'],
        ['bet', 'neutral'],
        ['bet', 'grief'],
        { who: 'eren', mood: 'resolved', pick: (g) => (flag(g, 'erenScarred') ? 'scarred' : 'default'), when: { fate: ['eren', 'alive'] }, skip: 'a5' },
        { who: 'hessa', mood: 'neutral', when: { notFate: ['eren', 'alive'] }, skip: 'a6' },
        { who: 'veska', mood: 'ashamed', when: { fate: ['veska', 'testifies'] }, skip: 'a7' },
        { who: 'sereth', mood: 'neutral', pick: (g) => (flag(g, 'serethDoubts') ? 'doubts' : 'default'), when: { has: ['met:sereth'] }, skip: 'r0' },
        { who: 'sereth', mood: 'broken', when: { has: ['serethDoubts', 'corvinExposed'] }, skip: 's0', choices: [
          { goto: 'martyr', fx: [{ fate: ['sereth', 'martyr'] }] },
          { goto: 'stay', fx: [{ fate: ['sereth', 'broken'] }, { resolve: 1 }] },
        ] },
      ]),
      s0: { who: 'narrator', variant: 'read', when: { has: ['serethDoubts'] }, skip: 's1', fx: [{ fate: ['sereth', 'broken'] }], next: 'r0' },
      s1: { who: 'narrator', variant: 'read', fx: [{ fate: ['sereth', 'faith'] }], next: 'r0' },
      martyr: { who: 'sereth', mood: 'broken', next: 'r0' },
      stay: { who: 'sereth', mood: 'broken', next: 'r0' },
      ...chain('r', [
        ['ilvane', 'neutral'],
        { who: 'narrator', variant: 'read' },
        { who: 'narrator', variant: 'read' },
        { who: 'narrator', variant: 'read' },
        { who: 'narrator', variant: 'read' },
        ['ilvane', 'neutral'],
        ['bet', 'neutral'],
        ['bet', 'neutral'],
      ], { end: true, fx: [{ evidence: 'E9' }, { flag: 'met:ilvane' }] }),
    } }),

  // ── The Muster ──────────────────────────────────────────────────────────
  S({ id: 'muster.hearths', where: 'muster', speaker: 'hessa', when: { awakened: true, not: ['muster:shelter.hearths'], trust: ['kilnrow', 2] }, start: 'a0',
    nodes: chain('a', [
      ['hessa', 'neutral'],
      ['narrator'],
      ['hessa', 'neutral'],
    ], { end: true, fx: [{ muster: 'shelter.hearths' }, { resolve: 1 }, { trust: ['kilnrow', 1] }] }) }),

  S({ id: 'muster.assembly', where: 'muster', speaker: 'veska', when: { awakened: true, not: ['muster:unite.assembly'], any: ['fate:veska:testifies', 'fate:sereth:broken'], resolve: 5 }, start: 'a0',
    nodes: chain('a', [
      { who: 'veska', mood: 'ashamed', when: { fate: ['veska', 'testifies'] }, skip: 'a1' },
      { who: 'sereth', mood: 'broken', when: { fate: ['sereth', 'broken'] }, skip: 'a2' },
      { who: 'narrator', variant: 'read', pick: (g) => (EVIDENCE_READ.some((e) => flag(g, `ev:${e}`)) ? 'some' : 'none'),
        vars: (g, { term, list }) => ({ evidence: list(EVIDENCE_READ.filter((e) => flag(g, `ev:${e}`)).map(term)) }) },
      ['hessa', 'neutral'],
    ], { end: true, fx: [{ muster: 'unite.assembly' }, { resolve: 1 }] }) }),

  S({ id: 'muster.guild', where: 'muster', speaker: 'maren', when: { awakened: true, has: ['muster:unite.assembly'], not: ['muster:unite.guild'], resolve: 7 }, start: 'a0',
    nodes: chain('a', [
      ['maren', 'neutral'],
      ['maren', 'neutral'],
      ['maren', 'neutral'],
    ], { end: true, fx: [{ muster: 'unite.guild' }, { resolve: 1 }] }) }),

  S({ id: 'muster.light', where: 'muster', speaker: 'bet', when: { awakened: true, has: ['muster:unite.guild'], not: ['muster:unite.light'], resolve: 8 }, start: 'a0',
    nodes: chain('a', [
      ['bet', 'neutral'],
      ['narrator'],
      ['bet', 'warm'],
    ], { end: true, fx: [{ muster: 'unite.light' }, { resolve: 2 }] }) }),

  // ── Epilogue ────────────────────────────────────────────────────────────
  S({ id: 'epilogue.lastLight', where: 'tavern', speaker: 'bet', when: { has: ['slain'] }, priority: 300, auto: true, start: 'a0',
    nodes: { ...chain('a', [
      ['bet', 'neutral'],
      { who: 'narrator', variant: 'read' },
      ['bet', 'warm'],
      { who: 'bet', mood: 'grief', pick: (g) => (fallen(g).length ? 'fallen' : 'none'), vars: (g) => ({ names: fallen(g).join('.| ') }) },
      { who: 'eren', mood: 'grin', pick: (g) => (flag(g, 'erenScarred') ? 'scarred' : 'default'), when: { fate: ['eren', 'alive'] }, skip: 'a5' },
      { who: 'hessa', mood: 'neutral', pick: (g) => (fate(g, 'eren') === 'captured' ? 'captured' : 'default'), when: { notFate: ['eren', 'alive'] }, skip: 'a6' },
      { who: 'veska', mood: 'neutral', when: { fate: ['veska', 'testifies'] }, skip: 'v0' },
      { who: 'narrator', variant: 'read', pick: (g) => fate(g, 'sereth') ?? 'default' },
      { who: 'narrator', variant: 'read', pick: (g) => (fate(g, 'corvin') === 'captive' ? 'captive' : 'default') },
      { who: 'bet', mood: 'warm', when: { has: ['warned'] }, skip: 'a10' },
      ['bet', 'warm'],
    ], { end: true, fx: [{ flag: 'epilogueSeen' }] }),
      v0: { who: 'narrator', variant: 'read', when: { fate: ['veska', 'imprisoned'] }, skip: 'a7', next: 'a7' },
    } }),

  // ── Regulars (repeatable small talk) ────────────────────────────────────
  S({ id: 'bet.idle', where: 'tavern', speaker: 'bet', when: { has: ['seen:bet.intro'] }, repeat: true, priority: -10, start: 'a0',
    nodes: { a0: { who: 'bet', mood: 'neutral', end: true, pick: (g) => (flag(g, 'slain') ? 'slain' : stage(g) >= 5 ? 'stage5' : `idle${g.profile.townDay % 5}`) } } }),
  S({ id: 'eren.idle', where: 'tavern', speaker: 'eren', when: { has: ['seen:bet.intro'], notFate: ['eren', 'captured'] }, repeat: true, priority: -10, start: 'a0',
    nodes: { a0: { who: 'eren', mood: 'grin', end: true, pick: (g) => (flag(g, 'slain') ? 'slain' : stage(g) >= 3 ? 'stage3' : `idle${g.profile.townDay % 3}`) } } }),
  S({ id: 'sereth.idle', where: 'tavern', speaker: 'sereth', when: { has: ['seen:sereth.intro'], notFate: ['sereth', 'faith'] }, repeat: true, priority: -10, start: 'a0',
    nodes: { a0: { who: 'sereth', mood: 'neutral', end: true, pick: (g) => (fate(g, 'sereth') === 'broken' ? 'broken' : stage(g) >= 4 ? 'stage4' : 'default') } } }),
];
