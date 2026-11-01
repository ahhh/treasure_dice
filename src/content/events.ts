/**
 * Room events: investigation, obstacles, social encounters, gambles.
 * Every option either needs no check, or has an alternative, so no event can
 * soft-lock a run (plan §5.3 fairness invariant).
 */
import type { Ability, BiomeId, Skill } from '../engine/types.ts';

export type Outcome =
  | { type: 'gold'; amount: number }
  | { type: 'doubloons'; n: number }
  | { type: 'boons'; source: 'normal' | 'elite' | 'treasure' }
  | { type: 'charm'; rarity?: 'common' | 'uncommon' | 'rare' | 'legendary' }
  | { type: 'heal'; pct: number }
  | { type: 'damage'; pct: number; who: 'party' | 'one' }
  | { type: 'item'; tier: number }
  | { type: 'combat'; elite?: boolean }
  | { type: 'meter'; delta: number; set?: number }
  | { type: 'reveal' }
  | { type: 'key' }
  | { type: 'omen' }
  | { type: 'die' }
  | { type: 'token'; id?: string }
  | { type: 'resources' }
  | { type: 'condition'; id: 'poisoned' | 'frightened' | 'blessed' }
  | { type: 'wheel' }
  | { type: 'gamble' }
  | { type: 'sacrifice' }
  | { type: 'text'; t: string };

export interface EventOption {
  label: string;
  check?: { skill?: Skill; ability?: Ability; dc: number };
  /** Exploration spell tag that auto-succeeds the check. */
  spell?: string;
  /** Class that auto-succeeds. */
  cls?: string;
  cost?: { gold?: number; doubloons?: number; hpPct?: number };
  success: Outcome[];
  failure?: Outcome[];
  hint?: string;
}

export interface EventDef {
  id: string;
  biome: BiomeId | 'any';
  kind: 'event' | 'shrine' | 'key' | 'mechanism';
  title: string;
  text: string;
  options: EventOption[];
}

export const EVENTS: Record<string, EventDef> = {};
const E = (e: EventDef) => { EVENTS[e.id] = e; };

// ── generic ─────────────────────────────────────────────────────────────────
E({ id: 'lockedChest', biome: 'any', kind: 'event', title: 'A Locked Chest', text: 'An iron-banded chest squats in an alcove. The lock is old but stubborn, and there are scratches around the keyhole — someone tried before you.',
  options: [
    { label: 'Pick the lock', check: { skill: 'sleightOfHand', dc: 13 }, spell: 'unlock', success: [{ type: 'gold', amount: 1 }, { type: 'item', tier: 1 }], failure: [{ type: 'damage', pct: 0.1, who: 'one' }, { type: 'text', t: 'A needle trap jabs you. The lock holds.' }], hint: 'Rogues and thieves\' tools help.' },
    { label: 'Smash it open', check: { skill: 'athletics', dc: 14 }, success: [{ type: 'gold', amount: 1 }], failure: [{ type: 'text', t: 'The chest dents but holds. Your shoulder aches.' }, { type: 'damage', pct: 0.05, who: 'one' }] },
    { label: 'Leave it', success: [{ type: 'text', t: 'Some treasures are bait.' }] },
  ] });
E({ id: 'woundedStranger', biome: 'any', kind: 'event', title: 'A Wounded Adventurer', text: 'A stranger in a rival guild\'s colours slumps against the wall, bleeding. "They took my dice," she gasps. "All of them."',
  options: [
    { label: 'Tend her wounds', check: { skill: 'medicine', dc: 12 }, spell: 'heal', success: [{ type: 'text', t: 'She presses a strange die into your hand. "For luck."' }, { type: 'die' }], failure: [{ type: 'text', t: 'You do what you can. She thanks you and limps away.' }, { type: 'doubloons', n: 2 }] },
    { label: 'Ask what she saw', check: { skill: 'insight', dc: 11 }, success: [{ type: 'reveal' }, { type: 'text', t: 'She sketches the path to the boss on your map.' }], failure: [{ type: 'text', t: 'Her story makes no sense. Fever, perhaps.' }] },
    { label: 'Rob her', success: [{ type: 'gold', amount: 1 }, { type: 'text', t: 'You take her purse. The dungeon notices.' }, { type: 'condition', id: 'frightened' }] },
  ] });
E({ id: 'dicingGhost', biome: 'any', kind: 'shrine', title: 'The Dicing Ghost', text: 'A translucent gambler sits at a table of bone, rattling a cup. "One game, living ones. Double or nothing."',
  options: [
    { label: 'Wager 5 doubloons', cost: { doubloons: 5 }, success: [{ type: 'gamble' }] },
    { label: 'Challenge him to a game of wits', check: { skill: 'deception', dc: 15 }, success: [{ type: 'charm', rarity: 'uncommon' }, { type: 'text', t: 'You bluff the ghost into folding. He tosses you a charm with a scowl.' }], failure: [{ type: 'damage', pct: 0.08, who: 'party' }, { type: 'text', t: 'The ghost laughs; the cold seeps into your bones.' }] },
    { label: 'Decline politely', success: [{ type: 'text', t: '"Coward," the ghost sighs, and fades.' }] },
  ] });
E({ id: 'wheelOfFate', biome: 'any', kind: 'shrine', title: 'The Wheel of Fate', text: 'A great wheel of brass and bone stands in the centre of the room, studded with pictures: a crown, a skull, a coin, a die. A slot waits for a coin.',
  options: [
    { label: 'Spin (3 doubloons)', cost: { doubloons: 3 }, success: [{ type: 'wheel' }] },
    { label: 'Spin (60 gold)', cost: { gold: 60 }, success: [{ type: 'wheel' }] },
    { label: 'Walk away', success: [{ type: 'text', t: 'The wheel ticks once as you leave.' }] },
  ] });
E({ id: 'diceAltar', biome: 'any', kind: 'shrine', title: 'Altar of Offerings', text: 'Carved into the altar: a hand releasing a die. Below, a bowl worn smooth by countless sacrifices.',
  options: [
    { label: 'Sacrifice a die from your bag', success: [{ type: 'sacrifice' }] },
    { label: 'Pray', check: { skill: 'religion', dc: 13 }, success: [{ type: 'omen' }, { type: 'text', t: 'A whisper names a hand you will play well.' }], failure: [{ type: 'text', t: 'Only silence answers.' }] },
    { label: 'Leave', success: [] },
  ] });
E({ id: 'collapsedPassage', biome: 'any', kind: 'event', title: 'Collapsed Passage', text: 'Rubble chokes the way. Beyond it you glimpse the glint of something valuable.',
  options: [
    { label: 'Dig through', check: { skill: 'athletics', dc: 13 }, success: [{ type: 'gold', amount: 1 }, { type: 'item', tier: 0 }], failure: [{ type: 'damage', pct: 0.12, who: 'party' }, { type: 'text', t: 'The ceiling shifts. You scramble back, bruised.' }] },
    { label: 'Find a weak point', check: { skill: 'investigation', dc: 14 }, success: [{ type: 'gold', amount: 1 }, { type: 'item', tier: 1 }], failure: [{ type: 'text', t: 'You find nothing useful.' }] },
    { label: 'Move on', success: [] },
  ] });
E({ id: 'mysteriousPotion', biome: 'any', kind: 'event', title: 'A Bubbling Cauldron', text: 'An abandoned alchemist\'s camp. A cauldron still simmers with something purple and smug.',
  options: [
    { label: 'Identify the brew', check: { skill: 'arcana', dc: 12 }, success: [{ type: 'heal', pct: 0.4 }, { type: 'text', t: 'A restorative! Everyone takes a sip.' }], failure: [{ type: 'condition', id: 'poisoned' }, { type: 'text', t: 'It was not a restorative.' }] },
    { label: 'Just drink it', success: [{ type: 'heal', pct: 0.25 }], failure: [] },
    { label: 'Bottle it for later (Nature)', check: { skill: 'nature', dc: 13 }, success: [{ type: 'token', id: 'tonic' }], failure: [{ type: 'text', t: 'The bottle cracks in your hand.' }] },
  ] });
E({ id: 'trapHall', biome: 'any', kind: 'event', title: 'Pressure Plates', text: 'The floor is a chessboard of pressure plates. Dark holes line the walls.',
  options: [
    { label: 'Spot the safe path', check: { skill: 'perception', dc: 13 }, spell: 'traps', success: [{ type: 'doubloons', n: 3 }, { type: 'text', t: 'You dance across, and find coins dropped by the less careful.' }], failure: [{ type: 'damage', pct: 0.12, who: 'party' }] },
    { label: 'Tumble through', check: { skill: 'acrobatics', dc: 14 }, success: [{ type: 'text', t: 'Graceful. Barely.' }], failure: [{ type: 'damage', pct: 0.15, who: 'one' }] },
    { label: 'Disarm the mechanism', check: { skill: 'sleightOfHand', dc: 15 }, success: [{ type: 'gold', amount: 1 }, { type: 'token' }], failure: [{ type: 'damage', pct: 0.1, who: 'one' }] },
  ] });
E({ id: 'rivalParty', biome: 'any', kind: 'event', title: 'A Rival Party', text: 'Three adventurers from the Copper Lantern guild block the corridor. "This dungeon\'s ours. Pay the toll or turn around."',
  options: [
    { label: 'Talk them down', check: { skill: 'persuasion', dc: 14 }, success: [{ type: 'reveal' }, { type: 'text', t: 'They grudgingly share their map.' }], failure: [{ type: 'combat' }] },
    { label: 'Intimidate them', check: { skill: 'intimidation', dc: 14 }, success: [{ type: 'gold', amount: 1 }, { type: 'text', t: 'They flee, dropping a purse.' }], failure: [{ type: 'combat' }] },
    { label: 'Pay 40 gold', cost: { gold: 40 }, success: [{ type: 'text', t: 'They step aside, smirking.' }] },
    { label: 'Fight', success: [{ type: 'combat' }] },
  ] });
E({ id: 'oldShrine', biome: 'any', kind: 'event', title: 'Forgotten Shrine', text: 'A small shrine to a god of travellers. Candle stubs. A cracked offering bowl.',
  options: [
    { label: 'Leave an offering (25 gold)', cost: { gold: 25 }, success: [{ type: 'condition', id: 'blessed' }, { type: 'heal', pct: 0.2 }] },
    { label: 'Study the carvings', check: { skill: 'history', dc: 12 }, success: [{ type: 'omen' }], failure: [{ type: 'text', t: 'The carvings are too worn.' }] },
    { label: 'Pass by', success: [] },
  ] });
E({ id: 'cursedIdol', biome: 'any', kind: 'event', title: 'The Grinning Idol', text: 'A small golden idol grins on a pedestal. It practically begs to be taken. The room is suspiciously clean.',
  options: [
    { label: 'Take it', success: [{ type: 'charm', rarity: 'rare' }, { type: 'combat', elite: true }] },
    { label: 'Check for traps', check: { skill: 'investigation', dc: 15 }, spell: 'traps', success: [{ type: 'charm', rarity: 'uncommon' }, { type: 'text', t: 'You swap it for a rock of equal weight. Classic.' }], failure: [{ type: 'damage', pct: 0.15, who: 'party' }, { type: 'text', t: 'Darts! The idol is gone in the chaos.' }] },
    { label: 'Leave it', success: [{ type: 'text', t: 'Wise. Probably.' }] },
  ] });

// ── keys & mechanisms (always solvable) ─────────────────────────────────────
E({ id: 'sigilKey', biome: 'any', kind: 'key', title: 'The Boss Sigil', text: 'A sigil-key rests on a plinth, humming. Wards flicker around it.',
  options: [
    { label: 'Unravel the wards', check: { skill: 'arcana', dc: 13 }, spell: 'dispel', success: [{ type: 'key' }, { type: 'text', t: 'The wards part. The sigil is yours.' }], failure: [{ type: 'key' }, { type: 'damage', pct: 0.12, who: 'party' }, { type: 'text', t: 'The wards burn you, but you hold on to the sigil.' }] },
    { label: 'Grab it and run', success: [{ type: 'key' }, { type: 'damage', pct: 0.08, who: 'one' }] },
  ] });
E({ id: 'meterReset', biome: 'any', kind: 'mechanism', title: 'Mechanism', text: 'A lever, worn smooth by many hands.',
  options: [
    { label: 'Pull the lever', success: [{ type: 'meter', delta: 0, set: 0 }] },
    { label: 'Leave it', success: [] },
  ] });

// ── biome-specific ─────────────────────────────────────────────────────────
E({ id: 'valveChamber', biome: 'cinder', kind: 'event', title: 'Valve Chamber', text: 'Pipes hiss. A great wheel-valve could vent the heat — or blow the room apart.',
  options: [
    { label: 'Read the pressure gauges', check: { skill: 'investigation', dc: 12 }, success: [{ type: 'meter', delta: 0, set: 0 }, { type: 'text', t: 'Steam roars out harmlessly. The halls cool.' }], failure: [{ type: 'damage', pct: 0.12, who: 'party' }, { type: 'meter', delta: 0, set: 0 }] },
    { label: 'Wrench it open', check: { skill: 'athletics', dc: 13 }, success: [{ type: 'meter', delta: 0, set: 0 }], failure: [{ type: 'meter', delta: 2 }, { type: 'text', t: 'It jams. The heat climbs.' }] },
  ] });
E({ id: 'foundry', biome: 'cinder', kind: 'event', title: 'The Abandoned Foundry', text: 'Moulds for weapons line the walls. The crucible is still hot.',
  options: [
    { label: 'Re-temper your weapons', check: { skill: 'athletics', dc: 13 }, success: [{ type: 'omen' }, { type: 'text', t: 'Your blades ring true.' }], failure: [{ type: 'damage', pct: 0.08, who: 'one' }] },
    { label: 'Melt down loot for coins', success: [{ type: 'doubloons', n: 4 }, { type: 'meter', delta: 1 }] },
  ] });
E({ id: 'whisperingTree', biome: 'rootbound', kind: 'event', title: 'The Whispering Tree', text: 'An ancient tree grows through the crypt roof. Its leaves whisper names of the dead.',
  options: [
    { label: 'Listen closely', check: { skill: 'nature', dc: 12 }, success: [{ type: 'reveal' }, { type: 'meter', delta: 0, set: 0 }], failure: [{ type: 'meter', delta: 2 }, { type: 'text', t: 'The tree shudders and spores billow.' }] },
    { label: 'Ask it a favour', check: { skill: 'persuasion', dc: 14 }, success: [{ type: 'charm' }], failure: [{ type: 'combat' }] },
  ] });
E({ id: 'sarcophagus', biome: 'rootbound', kind: 'event', title: 'Sealed Sarcophagus', text: 'Roots have cracked the lid. Something inside is wrapped in golden thread.',
  options: [
    { label: 'Pry it open', check: { skill: 'athletics', dc: 13 }, success: [{ type: 'item', tier: 1 }, { type: 'gold', amount: 1 }], failure: [{ type: 'combat' }] },
    { label: 'Read the epitaph', check: { skill: 'religion', dc: 12 }, success: [{ type: 'condition', id: 'blessed' }, { type: 'omen' }], failure: [{ type: 'text', t: 'The words are in no tongue you know.' }] },
  ] });
E({ id: 'cipherDoor', biome: 'drowned', kind: 'event', title: 'The Ciphered Door', text: 'Three rings of glyphs turn on a bronze door. A riddle is etched above: "I am read but never written."',
  options: [
    { label: 'Solve the cipher', check: { skill: 'investigation', dc: 13 }, spell: 'unlock', success: [{ type: 'item', tier: 1 }, { type: 'charm' }], failure: [{ type: 'damage', pct: 0.1, who: 'party' }, { type: 'text', t: 'Water jets from the walls.' }] },
    { label: 'Answer: "the stars"', success: [{ type: 'gold', amount: 1 }, { type: 'text', t: 'The door sighs open. Close enough.' }] },
  ] });
E({ id: 'observatory', biome: 'drowned', kind: 'event', title: 'Drowned Observatory', text: 'A telescope pokes up through the water, aimed at a ceiling painted with stars.',
  options: [
    { label: 'Align the telescope', check: { skill: 'arcana', dc: 13 }, success: [{ type: 'omen' }, { type: 'reveal' }], failure: [{ type: 'text', t: 'The stars refuse to line up.' }] },
    { label: 'Salvage brass fittings', success: [{ type: 'doubloons', n: 3 }] },
  ] });
E({ id: 'talkingMirror', biome: 'mirror', kind: 'event', title: 'The Talking Mirror', text: '"Ask me anything," says your reflection. "But I only tell the truth backwards."',
  options: [
    { label: 'Ask where the boss waits', check: { skill: 'insight', dc: 13 }, success: [{ type: 'reveal' }], failure: [{ type: 'meter', delta: 1 }, { type: 'text', t: 'The answer twists in your head.' }] },
    { label: 'Ask for luck', success: [{ type: 'token', id: 'fateCoin' }, { type: 'damage', pct: 0.08, who: 'one' }] },
    { label: 'Smash it', check: { skill: 'athletics', dc: 10 }, success: [{ type: 'doubloons', n: 3 }], failure: [{ type: 'combat' }] },
  ] });
E({ id: 'confessional', biome: 'mirror', kind: 'event', title: 'The Confessional', text: 'A booth of black glass. A voice: "Confess one sin, receive one blessing."',
  options: [
    { label: 'Confess honestly', check: { skill: 'persuasion', dc: 12 }, success: [{ type: 'heal', pct: 0.3 }, { type: 'condition', id: 'blessed' }], failure: [{ type: 'text', t: '"Lies," hisses the voice.' }, { type: 'condition', id: 'frightened' }] },
    { label: 'Lie convincingly', check: { skill: 'deception', dc: 14 }, success: [{ type: 'charm', rarity: 'uncommon' }], failure: [{ type: 'combat' }] },
  ] });
E({ id: 'weighingScales', biome: 'starfall', kind: 'event', title: 'The Weighing Scales', text: 'Golden scales float in the void. One pan holds a feather. The other waits for you.',
  options: [
    { label: 'Weigh your gold (lose 50 gold)', cost: { gold: 50 }, success: [{ type: 'charm', rarity: 'rare' }] },
    { label: 'Weigh your heart', check: { skill: 'insight', dc: 14 }, success: [{ type: 'heal', pct: 0.5 }, { type: 'omen' }], failure: [{ type: 'damage', pct: 0.15, who: 'party' }] },
    { label: 'Leave the scales', success: [] },
  ] });
E({ id: 'sleepingStar', biome: 'starfall', kind: 'event', title: 'A Sleeping Star', text: 'A star the size of a fist hovers here, dimly pulsing, fast asleep.',
  options: [
    { label: 'Pocket it', check: { skill: 'sleightOfHand', dc: 13 }, success: [{ type: 'die' }, { type: 'text', t: 'It becomes a die in your hand, warm and humming.' }], failure: [{ type: 'damage', pct: 0.15, who: 'one' }, { type: 'text', t: 'It wakes and flares!' }] },
    { label: 'Sing it a lullaby', check: { skill: 'performance', dc: 12 }, success: [{ type: 'condition', id: 'blessed' }, { type: 'meter', delta: 0, set: 0 }], failure: [{ type: 'text', t: 'The star snores on.' }] },
  ] });

export const EVENT_LIST = Object.values(EVENTS);

export function eventsFor(biome: BiomeId, kind: EventDef['kind']): EventDef[] {
  return EVENT_LIST.filter((e) => e.kind === kind && (e.biome === 'any' || e.biome === biome) && e.id !== 'meterReset' && e.id !== 'sigilKey');
}
