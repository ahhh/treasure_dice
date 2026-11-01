/** Writes docs/rules-coverage.json: every class feature and spell with its fidelity tag (plan §3.4). */
import { writeFileSync } from 'node:fs';
import { CLASSES } from '../src/content/classes.ts';
import { SPELL_LIST } from '../src/content/spells.ts';

const features = Object.values(CLASSES).flatMap((c) => Object.entries(c.features).flatMap(([lvl, fs]) => fs.map((f) => ({
  id: `feature:${c.id}:${f.id}`, class: c.id, level: Number(lvl), name: f.name, implementation: f.impl === 'exact' ? 'implemented_exact' : f.impl === 'adapted' ? 'implemented_adapted' : 'narrative', license: 'CC-BY-4.0',
}))));
const adapted = new Set(['shield', 'sleep', 'command', 'divineSmite', 'banishment', 'powerWordStun', 'powerWordKill', 'timeStop', 'revivify', 'raiseDead', 'massHeal', 'heal', 'haste', 'spiritualWeapon', 'moonbeam', 'spiritGuardians', 'iceStorm', 'flameStrike', 'meteorSwarm', 'hypnoticPattern', 'aid', 'mistyStep', 'chromaticOrb', 'thornWhip']);
const spells = SPELL_LIST.map((s) => ({ id: `spell:${s.id}`, name: s.name, level: s.level, classes: s.classes, implementation: adapted.has(s.id) || s.kind === 'zone' ? 'implemented_adapted' : 'implemented_exact', license: 'CC-BY-4.0' }));
const out = { ruleset: 'srd-5.2.1', generated: new Date().toISOString().slice(0, 10), counts: { features: features.length, spells: spells.length }, features, spells, not_yet_supported: ['multiclassing', 'non-SRD subclasses', 'grid movement', 'free-form utility spells beyond listed exploration uses'] };
writeFileSync('docs/rules-coverage.json', JSON.stringify(out, null, 1));
console.log(`features ${features.length}, spells ${spells.length}`);
