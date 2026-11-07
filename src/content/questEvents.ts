/**
 * Quest rooms for The Queen's Due. A taken lead may swap one ordinary event
 * room for one of these (about one run in three, always by the third try;
 * see src/meta/quest.ts).
 *
 * Side quests are earned, not automatic: the reward comes only from a passed
 * check or a won fight. A failed check usually costs HP and leaves the lead
 * open, so the room can turn up again on a later run. Quest fights hold their
 * reward (`onWin`) until the fight is won; fleeing or falling forfeits it.
 */
import type { EventDef } from './events.ts';
import type { QuestFx } from './questTypes.ts';

const Q = (e: Omit<EventDef, 'kind' | 'quest' | 'scene'>): EventDef => ({ ...e, kind: 'event', quest: true, scene: `scenes/${e.id}` });
const win = (fx: QuestFx[]) => ({ type: 'quest' as const, fx });
const fight = (cultist: string, onWin: QuestFx[], elite = true) => ({ type: 'combat' as const, elite, cultist, onWin });
const lost = (t: string) => ({ type: 'text' as const, t: `${t} The lead is still open: try again on another run.` });

const L0: QuestFx[] = [{ evidence: 'E1' }, { leadDone: 'L0' }];
const L2: QuestFx[] = [{ evidence: 'E3' }, { leadDone: 'L2' }, { flag: 'iloFreed' }, { trust: ['kilnrow', 1] }];
const L3: QuestFx[] = [{ evidence: 'E6' }, { leadDone: 'L3' }];
const LE: QuestFx[] = [{ fate: ['eren', 'alive'] }, { leadDone: 'LE' }, { trust: ['eren', 2] }];
const L4: QuestFx[] = [{ evidence: 'E7' }, { leadDone: 'L4' }];
const L5: QuestFx[] = [{ flag: 'tarnFreed' }, { leadDone: 'L5' }, { resolve: 1 }, { trust: ['kilnrow', 1] }];

export const QUEST_EVENTS: EventDef[] = [
  // ── Act 0 · The Short Count (Cinder) ─────────────────────────────────────
  Q({ id: 'q_stalledCart', biome: 'cinder', title: 'The Stalled Cart',
    text: 'A rail cart lies tipped against the wall of the cut, one wheel shattered. Sacks of lamp oil, a crate of hardtack, and a brass lockbox chained to the frame. Six sets of boot-prints lead away from it, deeper in. None of them come back.',
    options: [
      { label: 'Pick the lockbox', check: { skill: 'sleightOfHand', dc: 13 }, spell: 'unlock',
        success: [win(L0), { type: 'gold', amount: 0.5 }, { type: 'text', t: 'Inside: Eren\'s manifest, folded twice, and a little coin for his trouble.' }],
        failure: [{ type: 'damage', pct: 0.08, who: 'one' }, lost('A needle trap bites, and the lock seizes for good.')] },
      { label: 'Break the chain', check: { skill: 'athletics', dc: 14 },
        success: [win(L0), { type: 'text', t: 'The chain snaps. The lockbox spills the manifest at your feet.' }],
        failure: [{ type: 'damage', pct: 0.08, who: 'one' }, lost('The cart rolls onto a foot and wedges the lockbox under the rail.')] },
      { label: 'Follow the boot-prints', check: { skill: 'survival', dc: 14 },
        success: [win(L0), { type: 'reveal' }, { type: 'text', t: 'The prints lead toward the deep forge. Someone dropped the manifest on the way. You mark the route.' }],
        failure: [lost('The prints vanish in drifting ash. When you come back, the cart is gone.')] },
      { label: 'Take the oil and go', success: [{ type: 'doubloons', n: 1 }, { type: 'text', t: 'Lamp oil sells. The lockbox stays where it is.' }] },
    ] }),

  // ── Act 1 · The Supply Station (Rootbound) ───────────────────────────────
  Q({ id: 'q_choirGrove', biome: 'rootbound', title: 'The Choir\'s Grove',
    text: 'Someone has cleared the spores from this grove and hung lanterns that hold no flame, only grey cloth. Crates stamped with a ring of five open mouths. Two grey-robed cultists stand over a bedroll where a young Dragonborn sleeps in chains.',
    options: [
      { label: 'Fight', success: [{ type: 'text', t: 'The cultists draw knives. "The Queen is owed!"' }, fight('ashCultist', L2)] },
      { label: 'Talk them down', check: { skill: 'persuasion', dc: 16 },
        success: [win(L2), { type: 'text', t: 'They are not soldiers. They leave the key and the roster, and they do not look back.' }],
        failure: [{ type: 'text', t: '"Heretics!" Steel comes out.' }, fight('ashCultist', L2)] },
      { label: 'Watch and follow', check: { skill: 'stealth', dc: 15 },
        success: [win([{ evidence: 'E3' }, { evidence: 'E4' }, { leadDone: 'L2' }]), { type: 'text', t: 'They sing from a hymnal before they move on: a lullaby, but wrong. A page tears loose. They take the sleeper with them and leave the roster behind.' }],
        failure: [{ type: 'text', t: 'A twig snaps. "Who\'s there?"' }, fight('ashCultist', L2)] },
      { label: 'Leave them be', success: [lost('You back away into the roots.')] },
    ] }),

  // ── Act 2 · The Tithe Barge (Drowned) ────────────────────────────────────
  Q({ id: 'q_titheBarge', biome: 'drowned', title: 'The Tithe Barge',
    text: 'A flat barge is moored between two drowned shelves, low in the water with the weight of locked strongboxes. Each box is stamped with five open mouths. A writing desk is bolted to the deck, its drawer swollen shut.',
    options: [
      { label: 'Force the desk drawer', check: { skill: 'athletics', dc: 15 },
        success: [win(L3), { type: 'text', t: 'Inside, letters in a beautiful hand, every one signed "P."' }],
        failure: [{ type: 'text', t: 'The drawer won\'t give, and you hear oars. The bargemen are back.' }, fight('tideCultist', L3, false)] },
      { label: 'Read the strongbox seals', check: { skill: 'investigation', dc: 15 },
        success: [win([...L3, { flag: 'sawDue' }]), { type: 'gold', amount: 0.6 }, { type: 'text', t: 'Coin, all of it, tagged by family name. Kiln Row\'s names. In the desk, a letter signed "P."' }],
        failure: [{ type: 'damage', pct: 0.06, who: 'one' }, lost('A seal is trapped with acid ink. By the time the burning stops, the barge has drifted off.')] },
      { label: 'Wait for the bargemen', success: [{ type: 'text', t: 'Two cult bargemen come back for the boat.' }, fight('tideCultist', L3)] },
    ] }),

  // ── Act 3 · Eren's Last Run (Mirror, timed) ──────────────────────────────
  Q({ id: 'q_erenCaptive', biome: 'mirror', title: 'Eren\'s Last Run',
    text: 'A grey mule stands perfectly calm in a hall of mirrors. Every reflection shows her alone. Behind her, Eren is bound to a pillar of glass, a gag in his jaws. Two masked cultists argue about whether the Queen wants him whole.',
    options: [
      { label: 'Fight', success: [{ type: 'text', t: '"Oh thank the — behind you! BEHIND YOU!"' }, fight('facetCultist', LE)] },
      { label: 'Turn the mirrors on them', check: { skill: 'arcana', dc: 16 },
        success: [win(LE), { type: 'text', t: 'You tilt the glass. The cultists see something in it they do not like, and run. Eren spits out the gag. "Tuesday. Her name is Tuesday."' }],
        failure: [{ type: 'text', t: 'The glass shows them only you.' }, fight('facetCultist', LE)] },
      { label: 'Bluff: "The Precentor sent us."', check: { skill: 'deception', dc: 16 },
        success: [win([...LE, { evidence: 'E6' }]), { type: 'text', t: '"Splendid," one says, and hands you a letter for the Precentor. They leave Eren with you.' }],
        failure: [{ type: 'text', t: '"The Precentor would never send YOU."' }, fight('facetCultist', LE)] },
    ] }),

  // ── Act 3 · The Reflected Charge (Mirror) ────────────────────────────────
  Q({ id: 'q_reflectedCharge', biome: 'mirror', title: 'The Reflected Charge',
    text: 'The great mirror here shows no reflection of you. It shows the Lantern Keep\'s gate, centuries younger, its inscription freshly cut. Every word is still there. A crack is already creeping across the glass.',
    options: [
      { label: 'Read it aloud', check: { skill: 'history', dc: 14 },
        success: [win(L4), { type: 'text', t: '"Break no—" The glass cracks across the next letter with a sound like ice. No? Now?' }],
        failure: [{ type: 'damage', pct: 0.08, who: 'party' }, lost('The old script won\'t come. The mirror shatters before you find the line.')] },
      { label: 'Copy it down carefully', check: { skill: 'investigation', dc: 15 },
        success: [win(L4), { type: 'omen' }, { type: 'text', t: 'You copy every line before the crack spreads. It runs through one word: "Break no—"' }],
        failure: [lost('The crack outruns your pencil, and the image goes dark.')] },
    ] }),

  // ── Act 4 · The Throne Road (Starfall) ───────────────────────────────────
  Q({ id: 'q_throneRoad', biome: 'starfall', title: 'The Throne Road',
    text: 'A road of drifting stones strewn with dropped coins. A line of exhausted labourers carries sacks toward a golden glow far below, watched by a cultist with a lantern of grey cloth. One of the labourers is a bronze-scaled boy who looks very like Eren.',
    options: [
      { label: 'Free them', success: [{ type: 'text', t: 'The overseer raises the alarm.' }, fight('cometCultist', L5)] },
      { label: 'Speak to the boy', check: { skill: 'insight', dc: 15 },
        success: [win([...L5, { flag: 'sawThrone' }]), { type: 'text', t: '"I\'m Tarn. We stack it. Down there, at the big door. She sleeps on it." While the overseer looks the other way, the line walks back up the road with you.' }],
        failure: [{ type: 'text', t: 'He flinches, and the overseer turns.' }, fight('cometCultist', L5)] },
    ] }),

  // ── Muster · Shelter: The Lost Hands (Cinder) ────────────────────────────
  Q({ id: 'q_lostHands', biome: 'cinder', title: 'The Hands\' Camp',
    text: 'A camp of grey tents in a cooled forge hall. Workers sit in silence around a fire that gives no heat. The cultists who kept them have gone below to see their Queen. Nobody told the workers they could leave, and they do not believe strangers who say so.',
    options: [
      { label: '"You can go home."', check: { skill: 'persuasion', dc: 15 },
        success: [win([{ muster: 'shelter.hands' }, { resolve: 1 }]), { type: 'text', t: 'It takes a long moment. Then someone stands, and then all of them.' }],
        failure: [lost('They look through you. "They said someone would come and say that. They said it would be a test."')] },
      { label: 'Find their overseer\'s orders', check: { skill: 'investigation', dc: 14 },
        success: [win([{ muster: 'shelter.hands' }, { resolve: 1 }]), { type: 'item', tier: 1 }, { type: 'text', t: 'The orders say "leave them". You read it aloud. That, they believe.' }],
        failure: [lost('Nothing but grey cloth and cold ash.')] },
    ] }),

  // ── Muster · Break: The Cult's Stores (Rootbound) ────────────────────────
  Q({ id: 'q_choirStores', biome: 'rootbound', title: 'The Cult\'s Stores',
    text: 'The cult has turned a burial vault into a storehouse: grain, oil, medicine, weapons, all stamped with five open mouths. Enough to outlast a siege, and wardens to guard it.',
    options: [
      { label: 'Burn it', success: [fight('ashCultist', [{ muster: 'break.stores' }])] },
      { label: 'Carry the medicine home first', check: { skill: 'athletics', dc: 15 },
        success: [win([{ muster: 'break.stores' }, { resolve: 1 }]), { type: 'heal', pct: 0.3 }, { type: 'text', t: 'The medicine goes up the Stair. The rest goes up in smoke.' }],
        failure: [{ type: 'text', t: 'The wardens come back as you load up.' }, fight('ashCultist', [{ muster: 'break.stores' }])] },
    ] }),

  // ── Muster · Break: The Sunken Due (Drowned) ─────────────────────────────
  Q({ id: 'q_sunkenDue', biome: 'drowned', title: 'The Sunken Due',
    text: 'A strongroom where the tithe barge unloaded: coin by the chestful, tagged with family names from Kiln Row. The tide has risen around it. A cult tide-singer is trying to sing it lower.',
    options: [
      { label: 'Take it back', success: [{ type: 'gold', amount: 1 }, fight('tideCultist', [{ muster: 'break.due' }, { resolve: 1 }, { trust: ['kilnrow', 1] }])] },
      { label: 'Haul it out through the water', check: { skill: 'athletics', dc: 16 },
        success: [win([{ muster: 'break.due' }, { resolve: 1 }, { trust: ['kilnrow', 1] }]), { type: 'gold', amount: 1.5 }, { type: 'text', t: 'Chest by chest, Kiln Row\'s money comes back up.' }],
        failure: [{ type: 'damage', pct: 0.1, who: 'party' }, lost('The tide takes the first chest and nearly takes you with it.')] },
    ] }),

  // ── Muster · Break: The Precentor (Starfall) ─────────────────────────────
  Q({ id: 'q_precentor', biome: 'starfall', title: 'The Precentor',
    text: 'At the edge of a floating causeway, a silver-haired man in a plum coat sits on a folding stool, watching a golden glow below the stars. "Ah," says Corvin Aldane, without turning. "The heroes. You did splendidly, you know. Truly."',
    options: [
      { label: 'Take him', success: [{ type: 'text', t: '"Oh, very well." He raises his cane, and his cult rises with him.' }, fight('cometCultist', [{ muster: 'break.precentor' }, { fate: ['corvin', 'captive'] }])] },
      { label: '"It\'s over, Corvin."', check: { skill: 'intimidation', dc: 18 },
        success: [win([{ muster: 'break.precentor' }, { fate: ['corvin', 'captive'] }]), { type: 'text', t: 'He looks at you for a long time. Then he hands you his cane. "I suppose it is. For me."' }],
        failure: [{ type: 'text', t: '"Is it?" He smiles. His cult steps out of the dark.' }, fight('cometCultist', [{ muster: 'break.precentor' }, { fate: ['corvin', 'captive'] }])] },
    ] }),
];
