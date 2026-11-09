/**
 * Domain types. Every game-state object here is plain JSON so a save is just
 * JSON.stringify(state) (plan §10.1) and every engine function can mutate a
 * state in place behind the session controller.
 */
import type { RngStreams } from './rng.ts';
import type { CurseId } from '../fortune/curses.ts';

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export type Skill =
  | 'athletics' | 'acrobatics' | 'sleightOfHand' | 'stealth'
  | 'arcana' | 'history' | 'investigation' | 'nature' | 'religion'
  | 'animalHandling' | 'insight' | 'medicine' | 'perception' | 'survival'
  | 'deception' | 'intimidation' | 'performance' | 'persuasion';

export type DamageType =
  | 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'cold' | 'lightning'
  | 'thunder' | 'acid' | 'poison' | 'necrotic' | 'radiant' | 'force' | 'psychic';

export type ClassId =
  | 'barbarian' | 'bard' | 'cleric' | 'druid' | 'fighter' | 'monk'
  | 'paladin' | 'ranger' | 'rogue' | 'sorcerer' | 'warlock' | 'wizard';

export type BiomeId = 'cinder' | 'rootbound' | 'drowned' | 'mirror' | 'starfall';

export type Rank = 'front' | 'back';

export type ConditionId =
  | 'blinded' | 'charmed' | 'frightened' | 'incapacitated' | 'invisible'
  | 'paralyzed' | 'poisoned' | 'prone' | 'restrained' | 'stunned' | 'unconscious'
  // game-specific statuses (documented adaptations)
  | 'raging' | 'guarding' | 'blessed' | 'baned' | 'marked' | 'hexed' | 'hasted'
  | 'slowed' | 'burning' | 'regenerating' | 'shielded' | 'faerieFire'
  | 'dodging' | 'reckless' | 'inspired' | 'sacredWeapon' | 'wildShape'
  | 'spiritGuardians' | 'innateSorcery' | 'blurred' | 'stoneskin' | 'holyAura'
  | 'weakened' | 'empowered' | 'hidden' | 'noHeal' | 'vulnerable' | 'mirrorImage'
  | 'deathWard' | 'spiritualWeapon' | 'banished' | 'agathys' | 'heroism' | 'superiorDefense'
  | 'nimbus' | 'staggered';

export interface Condition {
  id: ConditionId;
  /** Rounds remaining; decremented at the end of the owner's turn. -1 = until removed. */
  rounds: number;
  sourceId?: string;
  /** Repeat save at end of the owner's turn. */
  save?: { ability: Ability; dc: number };
  /** Generic magnitude: rage damage, bless die, mark die, burn damage... */
  value?: number;
  /** Concentration link so ending concentration strips it. */
  concentrationOf?: string;
  /** Expires at the start of the owner's next turn (Reckless, Guard, Shield…). */
  untilTurnStart?: boolean;
}

export type Difficulty = 'explorer' | 'standard' | 'perilous' | 'deadly';
export type Tier = 'novice' | 'veteran' | 'heroic' | 'mythic';

// ── items ────────────────────────────────────────────────────────────────────

export type ItemKind = 'weapon' | 'armor' | 'shield' | 'trinket' | 'consumable';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'veryRare' | 'legendary';

export interface ItemInstance {
  uid: string;
  defId: string;
  /** Enchantment +0..+3 */
  plus: number;
  affixes: string[];
  qty?: number;
}

// ── heroes ───────────────────────────────────────────────────────────────────

export interface Hero {
  id: string;
  name: string;
  portrait: string;
  ancestry: string;
  background: string;
  classId: ClassId;
  level: number;
  abilities: Record<Ability, number>;
  /** Accumulated hit-point gains (before CON and vitality scaling). */
  hpRolls: number[];
  hp: number;
  hitDice: number;
  skillProfs: Skill[];
  expertise: Skill[];
  feats: string[];
  /** Level-up selections: fightingStyle, metamagic, invocations, etc. */
  choices: Record<string, string[]>;
  equipment: Partial<Record<EquipSlot, ItemInstance>>;
  /** Current uses of limited resources keyed by resource id. */
  resources: Record<string, number>;
  /** Current spell slots by level index 1..9 (index 0 unused). */
  slots: number[];
  prepared: string[];
  status: 'alive' | 'dead' | 'retired';
  history: { expeditions: number; clears: number; kills: number; deathCause?: string };
  /** Pending level-up awaiting the wizard. */
  pendingLevel?: boolean;
  /**
   * Signature dice: the hero's own dice, carried into every expedition's bag
   * and permanently shaped by Dice Path marks at each level-up. Absent on
   * older saves; `heroDice()` supplies two plain class-coloured dice.
   */
  dice?: HeroDie[];
  /** Dice colour chosen on the Dice Path (level 3). Absent = the class colour. */
  colour?: Material;
}

/** Permanent per-die traits from Dice Path milestones (levels 5, 10, 15, 20). */
export type DieTrait =
  | 'loaded'     // rolls twice, keeps the higher face
  | 'kindred'    // +2 mult when its owner plays it
  | 'echoing'    // retriggers when its owner scores it
  | 'steadfast'  // can't be jinxed, pilfered or cursed
  | 'eager';     // always in the opening tray

export interface HeroDie {
  material: Material;
  faces: Face[];
  trait?: DieTrait;
}

export type EquipSlot = 'mainHand' | 'offHand' | 'armor' | 'trinket1' | 'trinket2';
export const EQUIP_SLOTS: EquipSlot[] = ['mainHand', 'offHand', 'armor', 'trinket1', 'trinket2'];

// ── fortune (the run-only dice layer) ────────────────────────────────────────

export type Material =
  | 'bone' | 'steel' | 'sun' | 'shadow' | 'ember' | 'frost' | 'verdant' | 'arcane'
  | 'blood' | 'gold' | 'glass' | 'prism' | 'lead' | 'storm';

export type FaceMod =
  | 'gilded'    // +1 doubloon when scored
  | 'keen'      // +6 chips when scored
  | 'fierce'    // +2 mult when scored
  | 'savage'    // ×1.5 mult when scored
  | 'wild'      // counts as any value
  | 'lucky'     // 1 in 3: +6 mult
  | 'cursed';   // scores 0 pips, -1 mult (enemy-applied)

export interface Face { v: number; mod?: FaceMod }

export interface FortuneDie {
  uid: string;
  material: Material;
  faces: Face[];
  /** Display name for special dice. */
  name?: string;
  /** Hero id for signature dice (and dice added by a hero's gear). */
  owner?: string;
  trait?: DieTrait;
}

export interface TrayDie {
  dieUid: string;
  face: number;
  /** Jinxed by an enemy hex: cannot be selected until rerolled. */
  jinxed?: boolean;
  /** Ghost dice (e.g. Bardic Inspiration) vanish when played. */
  ghost?: boolean;
}

export type HandType =
  | 'high' | 'pair' | 'twoPair' | 'three' | 'straight' | 'set' | 'fullHouse'
  | 'four' | 'straightSet' | 'five' | 'fullSet' | 'hoard';

export interface CharmInstance {
  id: string;
  /** Scaling charms accumulate here. */
  counter: number;
  edition?: 'foil' | 'gilt' | 'astral';
}

export interface FortuneRun {
  /** Silenced Hymn (The Queen's Due): Chromatic Dominion spares this material. */
  spared?: Material;
  bag: FortuneDie[];
  drawPile: string[];
  discard: string[];
  tray: TrayDie[];
  charms: CharmInstance[];
  charmSlots: number;
  doubloons: number;
  rank: number;
  /** Rerolls remaining for the acting hero this turn. */
  rerollsLeft: number;
  /** Per-run bonuses from boons. */
  bonusHandSize: number;
  bonusRerolls: number;
  handsPlayed: Partial<Record<HandType, number>>;
  bestScore: number;
  /** Consumable fortune tokens: 'loadedCoin', 'chisel', etc. */
  tokens: string[];
  /** Charm ids already offered and taken this run (for dedupe). */
  seenCharms: string[];
  lastHand?: HandType;
}

// ── combat ───────────────────────────────────────────────────────────────────

export interface MonsterAction {
  id: string;
  name: string;
  kind: 'attack' | 'save' | 'heal' | 'buff' | 'hex' | 'summon' | 'condition';
  /** Relative damage weight against the level's damage budget (1 = standard hit). */
  dmg?: number;
  damageType?: DamageType;
  target: 'single' | 'front' | 'back' | 'all' | 'self' | 'ally' | 'allies';
  save?: Ability;
  halfOnSave?: boolean;
  condition?: { id: ConditionId; rounds: number; saveEnds?: boolean; value?: number };
  hex?: HexId;
  summon?: string;
  recharge?: number; // recharge on d6 >= value
  weight: number;
  ranged?: boolean;
  telegraph?: boolean;
  phase?: number; // boss: only available from this phase on
  text?: string;
}

export type HexId =
  | 'jinx'        // jinx the highest tray die
  | 'pilfer'      // steal a tray die back to the bag
  | 'curseFace'   // curse a random face of a bag die for the combat
  | 'invert'      // flip all tray dice (7 - v)
  | 'drain'       // -1 reroll on next hero turn
  | 'snuff';      // lose 2 doubloons

export interface Combatant {
  id: string;
  side: 'hero' | 'enemy';
  /** Hero id or monster def id. */
  refId: string;
  name: string;
  art: string;
  rank: Rank;
  level: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  initiative: number;
  dexMod: number;
  conditions: Condition[];
  downed: boolean;
  dead: boolean;
  stable: boolean;
  deathSaves: { s: number; f: number };
  concentration?: { spellId: string; targets: string[] };
  used: { action: boolean; bonus: boolean; reaction: boolean; fortune: boolean; extraFortune: number };
  /** Monster-only stat block (scaled). */
  mon?: {
    role: string;
    attackBonus: number;
    saveDc: number;
    dmgBase: number;
    saves: Record<Ability, number>;
    resist: DamageType[];
    immune: DamageType[];
    vuln: DamageType[];
    actions: MonsterAction[];
    recharge: Record<string, boolean>;
    tags: string[];
    /** Passive traits (content/monsters.ts MonsterTrait), from its kit and its tier. */
    traits?: string[];
    boss?: boolean;
    phase: number;
    phases?: number;
    elite?: boolean;
    telegraphed?: string;
  };
  /** Summoned helper (Spiritual Weapon etc.) bound to an owner. */
  ownerId?: string;
}

export interface LogEntry {
  t: string;
  kind?: 'hit' | 'miss' | 'heal' | 'crit' | 'info' | 'fortune' | 'death' | 'enemy' | 'loot' | 'warn';
}

export interface Combat {
  id: string;
  kind: 'normal' | 'elite' | 'boss' | 'ambush';
  round: number;
  order: string[];
  turnIndex: number;
  combatants: Record<string, Combatant>;
  log: LogEntry[];
  status: 'active' | 'victory' | 'defeat' | 'fled';
  /** Boss curse active on the dice for this fight. */
  curse?: CurseId;
  roomKey: string;
  /** Rewards resolved exactly once. */
  rewarded: boolean;
  /** Last scoring breakdown, for UI animation. */
  lastScore?: ScoreReport;
  kills: number;
  handsThisCombat: number;
  rerollsUsed: number;
  turn?: HeroTurn;
  zones: Zone[];
  fx: Fx[];
  /** Once-per-combat flags keyed `${heroId}:${talent}`. */
  once: Record<string, boolean>;
  diedThisFight: string[];
  legendary: Record<string, number>;
  /** Heroes start fights with these extra turn plays (Thief's Reflexes). */
  extraTurns: Record<string, number>;
  biomeNote?: string;
}

export interface HeroTurn {
  actorId: string;
  plays: number;
  playsUsed: number;
  /** Dice allowed in the next play (Flurry limits to 3). */
  playLimit: number;
  flags: Record<string, boolean>;
  /** Pending: next attack is a natural 20 (Loaded Coin). */
  loaded?: boolean;
  /** Extra actions granted this turn (Time Stop). */
  extraActions?: number;
}

export interface Zone {
  casterId: string;
  spellId: string;
  dice: string;
  dmgType: DamageType;
  target: 'enemy' | 'rank' | 'enemies';
  targetId?: string;
  rank?: Rank;
  save?: Ability;
  half?: boolean;
  dc: number;
  tickMult: number;
  condition?: Condition['id'];
}

export interface Fx {
  kind: 'dmg' | 'heal' | 'miss' | 'text' | 'crit' | 'ward' | 'hex' | 'kill' | 'down';
  target?: string;
  amount?: number;
  text?: string;
  actor?: string;
}

export interface ScoreStep {
  label: string;
  chips?: number;
  mult?: number;
  xmult?: number;
  dieIndex?: number;
  charm?: string;
  doubloons?: number;
}

export interface ScoreReport {
  hand: HandType;
  handLevel: number;
  scoringDice: number[]; // tray indices
  chips: number;
  mult: number;
  base: number;
  total: number;
  steps: ScoreStep[];
  doubloons: number;
  crit?: boolean;
}

// ── dungeon ──────────────────────────────────────────────────────────────────

export type Facing = 'N' | 'E' | 'S' | 'W';
export type RelDir = 'forward' | 'left' | 'right' | 'back';

export type RoomType =
  | 'entrance' | 'corridor' | 'combat' | 'elite' | 'treasure' | 'peddler'
  | 'shrine' | 'event' | 'camp' | 'boss' | 'key' | 'mechanism' | 'exit';

export interface Room {
  key: string; // "x,y"
  x: number;
  y: number;
  type: RoomType;
  name: string;
  text: string;
  exits: Partial<Record<Facing, Door>>;
  encounter?: { monsters: string[]; kind: Combat['kind']; cleared: boolean };
  eventId?: string;
  eventDone?: boolean;
  loot?: { gold: number; items: string[]; charm?: boolean; taken: boolean };
  /** Biome tags: hot, cool, flooded, mirror, anchor, quiet... */
  tags: string[];
  secret?: boolean;
  art?: string;
}

export interface Door {
  to: string;
  lock?: 'sigil' | 'gate' | 'water' | 'mirror';
  open?: boolean;
  hidden?: boolean;
}

export interface DungeonMap {
  width: number;
  height: number;
  rooms: Record<string, Room>;
  start: string;
  bossKey: string;
  criticalPath: string[];
}

export interface Expedition {
  seed: string;
  biome: BiomeId;
  difficulty: Difficulty;
  tier: Tier;
  partyLevel: number;
  partyIds: string[];
  map: DungeonMap;
  pos: string;
  prev?: string;
  facing: Facing;
  visited: string[];
  seen: string[];
  fortune: FortuneRun;
  combat?: Combat;
  event?: { roomKey: string; eventId: string; stage: 'choose' | 'result' | 'pickDie'; result?: string[] };
  /** Post-combat summary shown before boons. */
  spoils?: { gold: number; doubloons: number; interest: number; items: string[]; kind: string; rank: number; charmBonus: number };
  /** Boss reward: choose one item. */
  lootChoice?: { items: ItemInstance[] };
  searched: string[];
  /** Peddler stock for the current room. */
  shop?: { roomKey: string; offers: BoonOffer[]; rerollCost: number };
  shops?: Record<string, { roomKey: string; offers: BoonOffer[]; rerollCost: number }>;
  /** Boon choice pending after combat. */
  boons?: { offers: BoonOffer[]; source: string; picks: number };
  log: LogEntry[];
  depth: number; // combats cleared
  status: 'active' | 'won' | 'retreated' | 'wiped';
  rng: RngStreams;
  carriedGold: number;
  carriedItems: ItemInstance[];
  keys: string[];
  flags: Record<string, number>;
  /** Biome environmental meter (heat, bloom, water, reflection, gravity). */
  meter: number;
  steps: number;
  shortRests: number;
  longRestUsed: boolean;
  theme: { name: string; anomaly: string; faction: string; objective: string; boss: string; hook: string };
  /** The Queen's Due: the lead whose room was placed this run, and the drink taken. */
  quest?: { lead?: string; drink?: string; /** Quest effects waiting on the current fight being won. */ onWin?: import('../content/questTypes.ts').QuestFx[] };
  fallen: string[];
  bossDefeated: boolean;
  journal: string[];
  /** The scripted first dungeon (guided tutorial). */
  tutorial?: boolean;
  /** The final stage: Tiamat's throne behind the Sixth Door. */
  finale?: boolean;
}

export interface BoonOffer {
  kind: 'charm' | 'die' | 'omen' | 'face' | 'token' | 'upgrade' | 'heal' | 'gold' | 'remove';
  id: string;
  price?: number;
  sold?: boolean;
  /** Pre-rolled payload (e.g. a generated die). */
  die?: FortuneDie;
  face?: FaceMod;
  hand?: HandType;
}

// ── profile / save ───────────────────────────────────────────────────────────

export interface Profile {
  bankedGold: number;
  unlockedBiomes: BiomeId[];
  sigils: Partial<Record<BiomeId, number>>;
  facility: Record<string, number>;
  codex: { charms: string[]; monsters: string[]; hands: HandType[] };
  stats: { expeditions: number; clears: number; wipes: number; deaths: number; bestScore: number; retreats: number };
  townDay: number;
  /** Story progress: chapters already shown, and how often Tiamat has fallen. */
  story?: { seen: string[]; tiamat: number };
  /** Optional name shown on the share card. */
  keeperName?: string;
  /** The Queen's Due side quest (src/meta/quest.ts). */
  quest?: QuestState;
}

/** Progress in The Queen's Due. Heads awake are derived from sigils, never stored. */
export interface QuestState {
  /** 'seen:<script>', 'met:<npc>', 'ev:<id>', 'muster:<task>', 'leadDone:<id>', story flags… */
  flags: string[];
  trust: Record<string, number>;
  fate: Record<string, string>;
  resolve: number;
  leads: { id: string; misses: number; runsLeft?: number }[];
  rumors: string[];
  drink?: string;
  /** Keep day Sereth last tended the heroes. */
  tendedDay?: number;
  tended?: boolean;
  /** Silenced Hymn: the dice colour the player chose to spare. */
  hymn?: string;
}

/** Guided-tutorial progress. Null/undefined once finished or skipped. */
export interface TutorialState {
  step: number;
  /** Last step whose enter hook ran. */
  entered?: number;
  /** Scratch value a step records on entry. */
  mark?: string;
  /** Contextual tips already shown (spoils, boons, events…). */
  tips: string[];
}

export interface GameState {
  schemaVersion: number;
  contentRevision: string;
  slot: number;
  mode: 'legacy' | 'story';
  createdAt: number;
  savedAt: number;
  profile: Profile;
  roster: Hero[];
  vault: ItemInstance[];
  recruits: Hero[];
  shopStock: string[];
  townRng: RngStreams['town'];
  expedition?: Expedition;
  lastResult?: { kind: 'won' | 'retreated' | 'wiped'; gold: number; items: string[]; fallen: string[]; leveled: string[]; biome: BiomeId; score: number; fights: number; rank: number; charms: string[]; bossRounds?: number; tutorial?: boolean; finale?: boolean; chapter?: string; quest?: { found: string[]; head?: BiomeId; notes: string[] } };
  uidCounter: number;
  settings: { fast: boolean; sound: boolean };
  tutorial?: TutorialState | null;
}
