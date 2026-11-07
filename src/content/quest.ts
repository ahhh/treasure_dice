/**
 * The Queen's Due: data for the Lantern Keep side quest (docs/side-quest-the-queens-due.md).
 * Evidence, drinks, leads, rumors, Muster tasks, the Wardens' Lullaby and the
 * Chronicler's later notes. Logic lives in src/meta/quest.ts.
 */
import type { BiomeId } from '../engine/types.ts';
import type { QuestCond, QuestFx } from './questTypes.ts';

// ── evidence ────────────────────────────────────────────────────────────────

export interface EvidenceDef { id: string; name: string; text: string; after?: string; art: string; look: string }

const EV = (id: string, name: string, art: string, text: string, look: string, after?: string): EvidenceDef => ({ id, name, art: `evidence/${art}`, text, look, after });

export const EVIDENCE: Record<string, EvidenceDef> = Object.fromEntries([
  EV('E1', 'The Short Count', 'shortCount', 'A courier\'s manifest. "Lamp oil, 40 sacks. Hardtack, 1 crate. Hands, 6. Due. Rec\'d V."', 'a creased paper cargo manifest folded twice, a smudged red wax thumbprint at the bottom', 'The hands carried the oil. The oil fed the lamps. The lamps watched her sleep.'),
  EV('E2', 'Hessa\'s Tally', 'hessaTally', 'Names and seasons in a mother\'s careful hand. Tarn\'s name is last.', 'a folded sheet of paper covered in neat handwriting, tied with a red thread, a small clay lamp beside it', 'She kept every name. Nobody else did.'),
  EV('E3', 'The Grove Roster', 'groveRoster', 'The cult\'s own list of hands. The last two seasons have no return dates.', 'a grey cloth-bound roster book stamped on the cover with a ring of five open dragon mouths', 'Not missing. Stacking.'),
  EV('E4', 'The Hymnal Page', 'hymnalPage', '"…avails nothing less than power, a champion at the height of…" A lullaby, sung wrong.', 'a torn page from a hymnal with lines of musical notation and a grey ribbon', 'It is the Lullaby, sung backwards.'),
  EV('E5', 'The Warden\'s Lamp-Glass', 'lampGlass', 'A round amber lens from the Drowned Star\'s vault, set in bronze and etched with a rune of holding. Warm to the touch.', 'a warm round amber glass lens in a bronze ring etched with one curving rune, glowing faintly', 'A cradle. You broke four of them.'),
  EV('E6', 'The Precentor\'s Letter', 'precentorLetter', '"The road is nearly clear. The heroes are doing splendidly. Keep the Keep grateful. — P."', 'a folded letter sealed with plum-coloured wax, an elegant flourish of ink on the outside'),
  EV('E7', 'The Reflected Charge', 'reflectedCharge', '"Break no— dream that she is dreaming." The letter after "no" is lost under a crack.', 'a small silver hand mirror with a single crack running straight across the glass', 'No.'),
  EV('E8', 'Veska\'s Ledger', 'veskaLedger', 'Every hand, every season, and every return date she stopped writing.', 'a thick leather registrar\'s ledger with a pair of reading spectacles on a fine chain looped around it', 'She kept the ledger. That is something.'),
  EV('E9', 'The Wardens\' Lullaby', 'lullaby', 'The full text, copied from the inside of the Sixth Door.', 'a charcoal rubbing on a long sheet of rough paper, lines of abstract carved marks, curling at the edges'),
].map((e) => [e.id, e]));

// ── the Wardens' Lullaby ───────────────────────────────────────────────────

export const LULLABY = [
  'Hush now, Mother of Five. We give you five dreams to keep.',
  'To the Red, a forge that never cools, that she may rage asleep.',
  'To the Green, a garden of the dead, that she may grow and grieve.',
  'To the Black, a drowning library, that she may hoard and never leave.',
  'To the White, a hall of mirrors, that she see no face but hers.',
  'To the Blue, a sky of falling stars, that she chase what never stirs.',
  'Light a lamp for every dream, and let the lamps burn low.',
  'Break no dream that she is dreaming. Let no lantern-bearer go',
  'behind the doors to end them. But should the dreaming fail,',
  'raise a champion at the height of power, for nothing less avails.',
];

/** The Chronicler's later notes, unlocked after the awakening (keyed by chapter id). */
export const ANNOTATIONS: Record<string, string[]> = {
  prologue: [
    'The doors were hidden to keep us out, not to keep her in. We built a town on the warning and called it a fortress.',
    'Each echo grew stronger while it stood. So does any dream, as the dreamer sinks deeper. We took her sleep for her strength.',
  ],
  cinder: ['We recorded "you have only woken me sooner" as a boast. It was a statement of fact.'],
  rootbound: ['A lamp flares like that once: at the end of its wick.'],
  drowned: ['The last line of a lullaby. They were not telling us to fight her. They were telling us what we would need if someone failed to leave her be.'],
  mirror: ['Since the fourth door, she has seen everything a mirror sees. Including this page.'],
  starfall: ['We thought the dreams were where she hid. They were where we hid her.'],
};
export const DISSENT = 'Before the fifth door, someone warned us. We wrote it down. We did not listen.';

// ── drinks ──────────────────────────────────────────────────────────────────

export type DrinkId = 'houseAle' | 'kilnStout' | 'spicedMead' | 'minersTea' | 'cordial';
export interface DrinkDef { id: DrinkId; name: string; price: number; text: string; line: string; soft?: boolean; when?: QuestCond; rationed?: boolean; look: string }

export const DRINKS: Record<DrinkId, DrinkDef> = {
  houseAle: { id: 'houseAle', name: 'House Ale', price: 10, rationed: true, text: 'Start the next run with a Tonic token.', line: 'It\'s beer, love. It does what beer does.', look: 'a foaming pewter tankard of golden ale' },
  kilnStout: { id: 'kilnStout', name: 'Kiln-Row Stout', price: 15, text: 'The next run\'s first fight begins with every hero Warded.', line: 'Hessa brews it. Don\'t tell her I water it. I don\'t water it.', look: 'a dark stout with a tan head in a glazed clay mug painted with a small blue flame' },
  spicedMead: { id: 'spicedMead', name: 'Spiced Mead', price: 15, text: '+10% gold banked when you come home (up to +150).', line: 'For people who plan on counting something later.', look: 'amber spiced mead in a carved drinking horn with a cinnamon stick' },
  minersTea: { id: 'minersTea', name: 'Miner\'s Tea', price: 10, soft: true, rationed: true, text: 'Start the next run with a Mulligan Coin: reroll your whole tray once, free.', line: 'For people who\'d like to remember the stairs.', look: 'a dented tin cup of steaming dark tea' },
  cordial: { id: 'cordial', name: 'Lamplighter\'s Cordial', price: 20, soft: true, when: { has: ['met:sereth'] }, text: 'Start the next run with a Fate Coin.', line: 'Sereth brings the herbs. Good herbs. Don\'t ask me who pays for them.', look: 'a small stemmed glass of luminous pale-gold cordial with a sprig of green herbs' },
};

// ── leads ───────────────────────────────────────────────────────────────────

export interface LeadDef {
  id: string;
  title: string;
  biome: BiomeId | 'town';
  /** Quest room placed when the lead spawns. */
  eventId?: string;
  brief: string;
  /** Expeditions before it fails (Eren's last run). */
  timed?: number;
}

export const LEADS: Record<string, LeadDef> = {
  L0: { id: 'L0', title: 'The Short Count', biome: 'cinder', eventId: 'q_stalledCart', brief: 'Eren\'s supply cart is stuck on a rail cut past the First Door. The manifest is in the lockbox.' },
  L1: { id: 'L1', title: 'Kiln Row\'s Empty Chairs', biome: 'town', brief: 'Visit Eren\'s mother Hessa in Kiln Row and ask about the Due.' },
  L2: { id: 'L2', title: 'The Supply Station', biome: 'rootbound', eventId: 'q_choirGrove', brief: 'The Dragon\'s Choir keeps a camp of its own behind the Second Door. Tarn wrote home from there once.' },
  L3: { id: 'L3', title: 'The Tithe Barge', biome: 'drowned', eventId: 'q_titheBarge', brief: 'A barge carries the Due through the Drowned Archive. Somebody is keeping its books.' },
  LE: { id: 'LE', title: 'Eren\'s Last Run', biome: 'mirror', eventId: 'q_erenCaptive', brief: 'Eren followed the hands through the Fourth Door with no lantern. Find him before it is too late.', timed: 4 },
  L4: { id: 'L4', title: 'The Reflected Charge', biome: 'mirror', eventId: 'q_reflectedCharge', brief: 'A mirror in the Fourth Door is said to show things as they were. The Keep\'s gate, for instance.' },
  L5: { id: 'L5', title: 'The Throne Road', biome: 'starfall', eventId: 'q_throneRoad', brief: 'The hands carry the Due down a road of drifting stones behind the Fifth Door. Tarn is among them.' },
  M_hands: { id: 'M_hands', title: 'Muster: The Hands\' Camp', biome: 'cinder', eventId: 'q_lostHands', brief: 'Workers the cult abandoned are still waiting in a forge camp behind the First Door.' },
  M_stores: { id: 'M_stores', title: 'Muster: The Cult\'s Stores', biome: 'rootbound', eventId: 'q_choirStores', brief: 'Burn the Dragon\'s Choir\'s stores behind the Second Door.' },
  M_due: { id: 'M_due', title: 'Muster: The Sunken Due', biome: 'drowned', eventId: 'q_sunkenDue', brief: 'Bring Kiln Row\'s tithe back up from the Drowned Archive.' },
  M_precentor: { id: 'M_precentor', title: 'Muster: The Precentor', biome: 'starfall', eventId: 'q_precentor', brief: 'Corvin Aldane waits at the edge of the Fifth Door, watching her wake.' },
};

/** A taken lead spawns its room in about one run in three, and always by the third try. */
export const LEAD_CHANCE = 1 / 3;
export const LEAD_PITY = 2;

// ── rumors ──────────────────────────────────────────────────────────────────

export type RumorKind = 'everyday' | 'investigative' | 'reactive';
export interface RumorDef { id: string; source: string; kind: RumorKind; text: string; when: QuestCond; fx?: QuestFx[] }
export const SOURCES: Record<string, { name: string; icon: string; bias: string }> = {
  dace: { name: 'Dace, a frightened miner', icon: '⛏', bias: 'Honest. Exaggerates danger.' },
  pellam: { name: 'Ser Pellam, a boastful sellsword', icon: '🗡', bias: 'Wrong about anything he didn\'t do himself.' },
  recruiter: { name: 'A recruiter for the Dragon\'s Choir', icon: '🔔', bias: 'Accurate facts. Wrong conclusions.' },
  clerk: { name: 'A Guild clerk', icon: '📋', bias: 'Accurate on paper. Blind to what isn\'t.' },
  dockhand: { name: 'A dockhand from the Stair', icon: '⚓', bias: 'Sees everything. Understands little.' },
};

const R = (id: string, source: string, kind: RumorKind, when: QuestCond, text: string, fx?: QuestFx[]): RumorDef => ({ id, source, kind, when, text, fx });

export const RUMORS: RumorDef[] = [
  // Act 0
  R('r0a', 'dace', 'everyday', { headsBelow: 1 }, 'Patrol out of the First Door camp never came back. Guild says they took the long way. There is no long way.'),
  R('r0b', 'pellam', 'everyday', { headsBelow: 1 }, 'The Cinder Vaults? Walked them twice. Forge-thing at the bottom is all smoke. I\'d have killed it myself if I hadn\'t sprained something.'),
  R('r0c', 'clerk', 'everyday', { headsBelow: 1 }, 'The Aldane Trust has posted a bounty on the Deep Forge. Four hundred gold. Generous people, the Aldanes.'),
  // Act 1
  R('r1a', 'dockhand', 'investigative', { headsAtLeast: 1, headsBelow: 3 }, 'Saw six lads go down the Long Stair with no lanterns and no swords. Who goes down without a lantern?', [{ lead: 'L2' }]),
  R('r1b', 'dace', 'reactive', { headsAtLeast: 1, headsBelow: 2 }, 'Every hearth in the Keep burned too hot the night the Forge went cold. My wife\'s bread came out black. Coincidence, she says.'),
  R('r1c', 'recruiter', 'reactive', { headsAtLeast: 1, headsBelow: 2 }, 'Did you feel it when the Forge went cold? She stirred. That was joy, friend. That was joy.'),
  // Act 2
  R('r2a', 'clerk', 'everyday', { headsAtLeast: 2, headsBelow: 3 }, 'The Trust doubled the bounty on the Drowned Star. Nobody asks why a bounty needs doubling if the job\'s already being done.'),
  R('r2b', 'dockhand', 'investigative', { headsAtLeast: 2, headsBelow: 4 }, 'There\'s a barge down in the Drowned Archive, low in the water. Heavy boxes. I asked the bargeman what was in them. He said "the Queen\'s Due" and laughed.', [{ lead: 'L3' }]),
  R('r2c', 'pellam', 'everyday', { headsAtLeast: 2, headsBelow: 3 }, 'The apothecary\'s herbs all bloomed in one night, they say, and rotted by morning. I say it was a prank. Possibly mine.'),
  // Act 3
  R('r3a', 'dace', 'reactive', { headsAtLeast: 3, headsBelow: 4 }, 'I\'m not going back down. Water in my well tastes like ink. You don\'t have to believe me. Taste it.'),
  R('r3b', 'recruiter', 'reactive', { headsAtLeast: 3, headsBelow: 5 }, 'Three heads stirring, and the Keep still thinks it\'s winning. She\'s not dying. She\'s waking up and she\'s hungry. Pay your due.'),
  R('r3c', 'clerk', 'investigative', { headsAtLeast: 3, headsBelow: 5 }, 'The Codex has a note about a mirror in the Fourth Door that shows places "as they were". Probably nonsense. Somebody filed it, though.', [{ lead: 'L4' }]),
  // Act 4
  R('r4a', 'clerk', 'reactive', { headsAtLeast: 4, headsBelow: 5 }, 'Guild notice: "The disturbances are the Queen\'s death throes. Press on." I wrote it. I didn\'t make it up. I just wrote it.'),
  R('r4b', 'dockhand', 'investigative', { headsAtLeast: 4, headsBelow: 5 }, 'Behind the Fifth Door there\'s a road of floating stones with coins all over it. Like someone\'s been dropping them for years.', [{ lead: 'L5' }]),
  R('r4c', 'pellam', 'reactive', { headsAtLeast: 4, headsBelow: 5 }, 'Frost on the inside of my window this morning. Inside! I\'m not frightened. I simply prefer the window shut.'),
  // Awakened
  R('r5a', 'dace', 'reactive', { awakened: true, tiamatSlain: false }, 'Every lamp in the Keep went out but this one. Bet\'s. I\'m not leaving this room till someone kills that thing.'),
  R('r5b', 'recruiter', 'reactive', { awakened: true, tiamatSlain: false }, 'She\'s awake. She\'ll remember who paid her due. Will she? She\'ll remember. She will.'),
  R('r5c', 'clerk', 'reactive', { awakened: true, tiamatSlain: false }, 'The Guild has taken down every Aldane bounty. Nobody can find Master Aldane. Nobody can find most of his money either.'),
  R('r6a', 'dace', 'everyday', { tiamatSlain: true }, 'Went down the First Door yesterday. Just a mine. Ugly, hot, ordinary mine. I could have kissed it.'),
];

// ── the Muster (after the awakening) ───────────────────────────────────────

export type Track = 'shelter' | 'break' | 'unite';
export interface MusterTask { id: string; track: Track; title: string; text: string; lead?: string; gold?: number; when?: QuestCond; /** What the player still needs, shown while `when` fails. */ need?: string; scene?: string }

export const MUSTER: MusterTask[] = [
  { id: 'shelter.hands', track: 'shelter', title: 'Bring the hands home', text: 'Workers the cult abandoned are still waiting behind the First Door.', lead: 'M_hands' },
  { id: 'shelter.hearths', track: 'shelter', title: 'Carry Kiln Row\'s hearth-flames up the Stair', text: 'Hessa will not leave without the family flames, and Kiln Row will not hand them to just anyone.', scene: 'muster.hearths', when: { trust: ['kilnrow', 2] }, need: 'Kiln Row has to trust you: free the cult\'s workers, hear Hessa out, bring Tarn home, or return the Due.' },
  { id: 'shelter.cellar', track: 'shelter', title: 'Stock the Low Lantern\'s cellar', text: 'Food and drink for everyone sheltering here. Restores the full drink menu.', gold: 300 },
  { id: 'break.stores', track: 'break', title: 'Burn the cult\'s stores', text: 'Behind the Second Door.', lead: 'M_stores' },
  { id: 'break.due', track: 'break', title: 'Recover the Due', text: 'Kiln Row\'s tithe, sunk in the Drowned Archive.', lead: 'M_due' },
  { id: 'break.precentor', track: 'break', title: 'Take the Precentor', text: 'Corvin Aldane watches from the Fifth Door.', lead: 'M_precentor', when: { has: ['ev:E6'] }, need: 'You need proof he is the Precentor: the letter signed "P." (the Tithe Barge, behind the Third Door).' },
  { id: 'unite.assembly', track: 'unite', title: 'Kiln Row\'s assembly', text: 'Read the evidence to Kiln Row and let them decide.', scene: 'muster.assembly', when: { any: ['fate:veska:testifies', 'fate:sereth:broken'], resolve: 5 }, need: 'Needs Veska\'s testimony or Sereth\'s change of heart, and Resolve 5.' },
  { id: 'unite.guild', track: 'unite', title: 'The Guild\'s apology', text: 'Maren Holt pulls the Aldane bounties and says so in public.', scene: 'muster.guild', when: { has: ['muster:unite.assembly'], resolve: 7 }, need: 'Needs the assembly first, and Resolve 7.' },
  { id: 'unite.light', track: 'unite', title: 'Light the Keep', text: 'Every household carries a flame from the Low Lantern to the tower.', scene: 'muster.light', when: { has: ['muster:unite.guild'], resolve: 8 }, need: 'Needs the Guild\'s apology first, and Resolve 8.' },
];

export const TRACKS: Record<Track, { name: string; boon: string; cost: string }> = {
  shelter: { name: 'Shelter the Keep', boon: 'Provisions: the Dragon Throne run starts with 2 Tonic tokens.', cost: 'The Training Grounds close while Drillmaster Kost leads the evacuation.' },
  break: { name: 'Silence the Choir', boon: 'Silenced Hymn: Tiamat\'s Chromatic Dominion spares one colour of dice (you choose which in the Cartographer).', cost: 'Three hard fights, and you must first prove who the Precentor is.' },
  unite: { name: 'Unite the Keep', boon: 'Kindred Chorus: in the Dragon Throne, each hero\'s first hand scores +2 Mult.', cost: 'None. It only asks what you have already done.' },
};
