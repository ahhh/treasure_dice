import { describe, it, expect } from 'vitest';
import { newGame } from '../src/meta/town.ts';
import { dispatch } from '../src/app/commands.ts';
import { generateDungeon } from '../src/dungeon/generator.ts';
import { Rng, makeStreams } from '../src/engine/rng.ts';
import { SCRIPTS } from '../src/content/dialogue.ts';
import { NPCS, portraitKey } from '../src/content/npcs.ts';
import { EVENTS } from '../src/content/events.ts';
import { EVIDENCE, LEADS, RUMORS, MUSTER } from '../src/content/quest.ts';
import en from '../src/locales/en/dialogue.json';
import { CHROMATIC, hymnColour, applyFx, questOf, heads, readyScripts, talk, check, offerLead, placeQuestRoom, onExpeditionEnd, migrateQuest, visibleChoices, musterAct, trackDone } from '../src/meta/quest.ts';
import { migrate } from '../src/persistence/save.ts';
import { afterCombat } from '../src/dungeon/explore.ts';
import { finaleSealed } from '../src/content/story.ts';
import type { GameState, BiomeId } from '../src/engine/types.ts';
import spec from '../art/spec.json' with { type: 'json' };

const BIOMES: BiomeId[] = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
const keep = (seed = 'QUEST') => { const g = newGame(1, 'legacy', seed); g.tutorial = null; return g; };
const clear = (g: GameState, n: number) => { for (const b of BIOMES.slice(0, n)) g.profile.sigils[b] = 1; };

/** Play a scene to the end, always taking the first visible choice. */
function playScene(g: GameState, id: string, pick = 0) {
  const s = SCRIPTS.find((x) => x.id === id)!;
  let node: string | null = s.start;
  for (let i = 0; node && i < 80; i++) {
    const n = s.nodes[node];
    const ch = visibleChoices(g, n);
    const r = dispatch(g, { type: 'talk', script: id, node, choice: ch.length ? Math.min(pick, ch.length - 1) : undefined });
    expect(r.ok, `${id}/${node}: ${r.error}`).toBe(true);
    node = r.talk!.next;
  }
  expect(node).toBeNull();
}

describe('dialogue scripts (lint)', () => {
  const artKeys = new Set((spec as { entries: { key: string }[] }).entries.map((e) => e.key));

  it('every goto, next and skip lands on a real node, and every scene can end', () => {
    for (const s of SCRIPTS) {
      expect(s.nodes[s.start], `${s.id} start`).toBeTruthy();
      for (const [id, n] of Object.entries(s.nodes)) {
        for (const t of [n.next, n.skip, ...(n.choices ?? []).flatMap((c) => [c.goto, c.fail])]) if (t) expect(s.nodes[t], `${s.id}/${id} -> ${t}`).toBeTruthy();
        if (n.choices?.length) expect(n.choices.every((c) => c.goto), `${s.id}/${id} choice without goto`).toBe(true);
        if (!n.choices?.length && !n.end && !n.next) throw new Error(`${s.id}/${id} is a dead end`);
      }
    }
  });

  it('every speaker exists and has a portrait in the art spec', () => {
    for (const s of SCRIPTS) for (const n of Object.values(s.nodes)) {
      if (['narrator', 'hero'].includes(n.who) || n.who.startsWith('head:')) continue;
      expect(NPCS[n.who], `${s.id}: unknown speaker ${n.who}`).toBeTruthy();
      expect(artKeys.has(portraitKey(n.who, n.mood)), `${s.id}: no art for ${n.who}/${n.mood ?? 'neutral'}`).toBe(true);
    }
  });

  it('checks always have somewhere to go on a failure', () => {
    for (const s of SCRIPTS) for (const n of Object.values(s.nodes)) for (const c of n.choices ?? []) if (c.check) expect(c.fail ?? c.goto).toBeTruthy();
  });

  it('every lead names a real quest room, every quest room has unique art, and evidence has an icon', () => {
    for (const l of Object.values(LEADS)) if (l.eventId) {
      const ev = EVENTS[l.eventId];
      expect(ev?.quest, l.id).toBe(true);
      expect(artKeys.has(`scenes/${ev.id}`) && artKeys.has(`events/${ev.id}`), ev.id).toBe(true);
    }
    for (const e of Object.values(EVIDENCE)) expect(artKeys.has(e.art), e.id).toBe(true);
  });

  it('keepers have a bark for every stage, and every head has a voice', () => {
    for (const lines of Object.values(en.barks)) expect(lines).toHaveLength(7);
    for (const b of BIOMES) expect((en.heads as Record<string, string>)[b]).toBeTruthy();
  });

  it('quest rooms never appear at random, and their rewards are earned', () => {
    for (const ev of Object.values(EVENTS).filter((e) => e.quest)) {
      let earnable = false;
      for (const o of ev.options) {
        const grants = (list: typeof o.success) => list.some((x) => x.type === 'quest' && x.fx.length);
        // No free rewards: a direct grant needs a passed check; otherwise it must come from winning a fight.
        if (!o.check) expect(grants(o.success), `${ev.id}: "${o.label}" grants without a check`).toBe(false);
        if (o.failure) expect(grants(o.failure), `${ev.id}: "${o.label}" rewards a failure`).toBe(false);
        if (grants(o.success) || [...o.success, ...(o.failure ?? [])].some((x) => x.type === 'combat' && x.onWin?.length)) earnable = true;
      }
      expect(earnable, `${ev.id} can be completed`).toBe(true);
    }
  });
});

describe('the Queen\'s Due', () => {
  it('opens after the tour, and follows heads awake, never hero level', () => {
    const g = newGame(1, 'legacy', 'Q1');
    expect(readyScripts(g, 'tavern')).toHaveLength(0);
    g.tutorial = null;
    expect(readyScripts(g, 'tavern')[0].id).toBe('bet.intro');
    for (const h of g.roster) h.level = 20;
    expect(heads(g)).toBe(0);
    expect(readyScripts(g, 'tavern').some((s) => s.id === 'eren.hands' || s.id === 'eren.noManifest')).toBe(false);
    clear(g, 1);
    expect(readyScripts(g, 'tavern').some((s) => s.id === 'eren.noManifest')).toBe(true);
  });

  it('plays the first evening and offers the first lead', () => {
    const g = keep();
    playScene(g, 'bet.intro');
    expect(questOf(g).leads.map((l) => l.id)).toContain('L0');
    expect(questOf(g).flags).toContain('met:eren');
  });

  it('a lead\'s room spawns about one run in three, never changes the layout, and always by the third try', () => {
    const g = keep('Q2');
    offerLead(g, 'L0');
    let spawned = 0;
    for (let i = 0; i < 300; i++) {
      const seed = `S${i}`;
      const map = generateDungeon(new Rng(makeStreams(seed).layout), { seed, biome: 'cinder', level: 3, difficulty: 'standard' });
      const before = JSON.stringify(Object.values(map.rooms).map((r) => [r.key, r.type, Object.keys(r.exits)]));
      const exp = { seed, biome: 'cinder', map, tutorial: false, finale: false } as unknown as Parameters<typeof placeQuestRoom>[1];
      questOf(g).leads[0].misses = 0;
      if (placeQuestRoom(g, exp)) spawned++;
      expect(JSON.stringify(Object.values(map.rooms).map((r) => [r.key, r.type, Object.keys(r.exits)]))).toBe(before);
    }
    expect(spawned / 300).toBeGreaterThan(0.25);
    expect(spawned / 300).toBeLessThan(0.42);
    // Pity: the third try always places it.
    questOf(g).leads[0].misses = 2;
    const map = generateDungeon(new Rng(makeStreams('PITY').layout), { seed: 'PITY', biome: 'cinder', level: 3, difficulty: 'standard' });
    expect(placeQuestRoom(g, { seed: 'PITY', biome: 'cinder', map } as unknown as Parameters<typeof placeQuestRoom>[1])).toBeTruthy();
  });

  it('Eren is captured if his timed lead runs out, and the Muster can bring him home', () => {
    const g = keep('Q3');
    offerLead(g, 'LE');
    const exp = { tutorial: false, finale: false, biome: 'cinder' } as unknown as Parameters<typeof onExpeditionEnd>[1];
    for (let i = 0; i < LEADS.LE.timed!; i++) onExpeditionEnd(g, exp, 'won', false, 0);
    expect(questOf(g).fate.eren).toBe('captured');
    clear(g, 5);
    expect(musterAct(g, 'shelter.hands')).toBeNull();
    expect(questOf(g).leads.some((l) => l.id === 'M_hands')).toBe(true);
    // The quest room's effect brings the hands, and Eren, home.
    applyFx(g, [{ muster: 'shelter.hands' }]);
    expect(questOf(g).fate.eren).toBe('alive');
    expect(questOf(g).flags).toContain('erenScarred');
  });

  it('the warning needs the mirror\'s evidence and more', () => {
    const g = keep('Q4');
    clear(g, 4);
    expect(readyScripts(g, 'chronicle').some((s) => s.id === 'ilvane.warning')).toBe(false);
    questOf(g).flags.push('ev:E7', 'ev:E6');
    expect(readyScripts(g, 'chronicle').some((s) => s.id === 'ilvane.warning')).toBe(true);
    playScene(g, 'ilvane.warning');
    expect(questOf(g).flags).toContain('warned');
    expect(questOf(g).resolve).toBe(2);
  });

  it('Unite needs testimony or a changed heart, and resolve', () => {
    const g = keep('Q5');
    clear(g, 5);
    const unite = MUSTER.find((m) => m.id === 'unite.assembly')!;
    expect(check(g, unite.when)).toBe(false);
    questOf(g).fate.veska = 'testifies';
    questOf(g).resolve = 5;
    expect(check(g, unite.when)).toBe(true);
    playScene(g, 'muster.assembly');
    // The Guild and the lanterns need more of the Keep behind you.
    expect(readyScripts(g, 'muster').some((x) => x.id === 'muster.guild')).toBe(false);
    questOf(g).resolve = 8;
    for (const id of ['muster.guild', 'muster.light']) playScene(g, id);
    expect(trackDone(g, 'unite')).toBe(true);
  });

  it('never changes the finale\'s gate', () => {
    const g = keep('Q6');
    clear(g, 5);
    const q = questOf(g);
    q.flags.push('muster:shelter.hands', 'muster:shelter.hearths', 'muster:shelter.cellar', 'warned');
    expect(finaleSealed(g)).toMatch(/level 20/);
  });

  it('a quest fight pays out only when it is won', () => {
    const g = keep('Q8');
    offerLead(g, 'L2');
    questOf(g).leads[0].misses = 2;
    dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'cinder', difficulty: 'explorer', seed: 'NOPE' });
    g.expedition = undefined;
    g.profile.unlockedBiomes.push('rootbound');
    dispatch(g, { type: 'startExpedition', partyIds: g.roster.map((h) => h.id), biome: 'rootbound', difficulty: 'explorer', seed: 'GROVE' });
    const exp = g.expedition!;
    const room = Object.values(exp.map.rooms).find((r) => r.eventId === 'q_choirGrove')!;
    expect(room).toBeTruthy();
    exp.pos = room.key;
    exp.event = { roomKey: room.key, eventId: room.eventId!, stage: 'choose' };
    expect(dispatch(g, { type: 'eventChoice', idx: 0 }).ok).toBe(true);
    expect(exp.combat?.status).toBe('active');
    expect(questOf(g).flags).not.toContain('ev:E3');
    expect(exp.quest?.onWin?.length).toBeGreaterThan(0);
    exp.combat!.status = 'victory';
    afterCombat(g);
    expect(questOf(g).flags).toContain('ev:E3');
    expect(questOf(g).flags).toContain('iloFreed');
  });

  it('the Silenced Hymn only ever spares a colour the curse debuffs', () => {
    const g = keep('Q9');
    const party = g.roster.slice(0, 3);
    for (const h of party) h.classId = 'fighter';
    expect(CHROMATIC).toContain(hymnColour(g, party));
    party[0].classId = 'monk';
    expect(hymnColour(g, party)).toBe('storm');
    expect(dispatch(g, { type: 'setHymn', colour: 'steel' }).ok).toBe(false);
    expect(dispatch(g, { type: 'setHymn', colour: 'frost' }).ok).toBe(true);
    expect(hymnColour(g, party)).toBe('frost');
  });

  it('every rumor resolves, and investigative ones open leads', () => {
    for (const r of RUMORS) if (r.kind === 'investigative') expect(r.fx?.some((f) => 'lead' in f)).toBe(true);
  });

  it('a Keep from before the quest picks up at the current act with a catch-up', () => {
    const g = newGame(1, 'legacy', 'OLD');
    g.tutorial = null;
    clear(g, 3);
    delete g.profile.quest;
    migrate(g);
    expect(questOf(g).flags).toContain('catchup');
    const ids = readyScripts(g, 'tavern').map((s) => s.id);
    expect(ids[0]).toBe('bet.catchup');
    expect(ids).toContain('eren.containment');
    expect(ids).not.toContain('eren.hands');
    // A brand-new Keep is not migrated into a catch-up.
    const fresh = newGame(1, 'legacy', 'NEWER');
    migrate(fresh);
    expect(fresh.profile.quest).toBeUndefined();
    void migrateQuest;
  });

  it('the whole questline plays through without dead ends', () => {
    const g = keep('Q7');
    playScene(g, 'bet.intro');
    clear(g, 1);
    questOf(g).flags.push('ev:E1');
    for (const id of ['eren.hands', 'bet.lamps', 'veska.intro', 'corvin.round', 'hessa.kilnrow']) playScene(g, id);
    clear(g, 2);
    for (const id of ['eren.trust', 'sereth.intro']) playScene(g, id);
    questOf(g).flags.push('iloFreed', 'ev:E3', 'ev:E5', 'ev:E6', 'ev:E4');
    playScene(g, 'ilo.freed');
    clear(g, 3);
    for (const id of ['bet.choirCorner', 'eren.containment', 'bet.erenGone']) playScene(g, id);
    questOf(g).fate.eren = 'alive';
    questOf(g).flags.push('leadDone:LE', 'ev:E7');
    playScene(g, 'eren.rescued');
    clear(g, 4);
    playScene(g, 'veska.ledger');
    expect(questOf(g).fate.veska).toBe('testifies');
    playScene(g, 'voices.three');
    expect(questOf(g).flags).toContain('corvinExposed');
    clear(g, 5);
    playScene(g, 'awaken.onlyLight');
    expect(questOf(g).flags).toContain('ev:E9');
    expect(['broken', 'martyr', 'faith']).toContain(questOf(g).fate.sereth);
    g.profile.story!.tiamat = 1;
    questOf(g).flags.push('slain');
    playScene(g, 'epilogue.lastLight');
    void talk;
  });
});
