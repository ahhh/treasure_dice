/**
 * The people of the Lantern Keep who speak in dialogue boxes (docs/side-quest-the-queens-due.md §4, §12).
 * Each has a portrait per mood (`npcs/<id>_<mood>`), a nameplate colour and a
 * blip voice. `look` and `moods` double as the art subjects.
 */
import { textTable, type Textless } from '../i18n/index.ts';

export type Mood = 'neutral' | 'warm' | 'worried' | 'grief' | 'grin' | 'resolved' | 'cornered' | 'ashamed' | 'fervent' | 'broken' | 'exultant';

export interface NpcDef {
  id: string;
  name: string;
  /** Shown in the nameplate until the flag `met:<id>` is set. */
  alias?: string;
  title: string;
  color: string;
  voice: { wave: OscillatorType; pitch: number };
  look: string;
  /** Extra moods (beyond neutral): the expression the variant should show. */
  moods: Partial<Record<Mood, string>>;
  /** The Keep tab this keeper runs, if any. */
  tab?: string;
}

/** Names, aliases and titles live in src/locales/<lang>/story.json → npcs; `look` and `moods` stay here as art subjects. */
const N = (d: Textless<NpcDef, 'name' | 'alias' | 'title'>) => textTable<NpcDef, 'name' | 'alias' | 'title'>('story', ['npcs', d.id], d);

export const NPCS: Record<string, NpcDef> = {
  bet: N({ id: 'bet', color: '#f2c14e', voice: { wave: 'square', pitch: 180 },
    look: 'a human woman innkeeper in her late fifties, short-cropped grey hair, strong forearms, an old faded military quartermaster\'s coat with the insignia cut away, a cleaning rag over one shoulder, a level, unimpressed, quietly kind look',
    moods: { warm: 'a small rare smile, eyes crinkled at the corners', worried: 'jaw set, looking past the viewer at something far away', grief: 'eyes lowered, holding a small pinched-out candle in both hands' } }),
  eren: N({ id: 'eren', color: '#e0a060', voice: { wave: 'square', pitch: 330 },
    look: 'a young bronze-scaled dragonborn man of about twenty-four, a dragon-like reptilian head with warm bronze scales and a short frill, a coil of rope over one shoulder, a worn leather courier\'s harness, a pencil tucked behind his frill, an easy open friendly face',
    moods: { grin: 'a wide toothy grin, laughing', worried: 'frowning down at a folded paper manifest held in his claws', resolved: 'no grin at all, determined and grim, a small scrape on his snout, rope gripped tight' } }),
  veska: N({ id: 'veska', color: '#cfd8e6', voice: { wave: 'triangle', pitch: 240 },
    look: 'an older white-scaled dragonborn woman registrar in her fifties, a dragon-like reptilian head with pale white scales, thin reading spectacles on a fine chain, a grey high-buttoned clerk\'s coat, ink stains on her claws, composed and polite',
    moods: { cornered: 'spectacles taken off and held tightly in one claw, eyes hard and guarded', ashamed: 'head bowed, a thick leather ledger clutched to her chest' } }),
  sereth: N({ id: 'sereth', color: '#e2604a', voice: { wave: 'sine', pitch: 260 },
    look: 'a deep red-scaled dragonborn man healer in his thirties, a dragon-like reptilian head with dark crimson scales, a stained linen healer\'s apron over plain grey robes, five tiny brass bells sewn along his collar, steady kind eyes',
    moods: { fervent: 'eyes bright with faith, one hand raised as if in the middle of a hymn', broken: 'NO bells on his collar any more: the collar is bare, with only a few loose cut threads where the five bells used to be; his hands clasped, exhausted and gentle' } }),
  corvin: N({ id: 'corvin', color: '#b07ad8', voice: { wave: 'triangle', pitch: 150 },
    look: 'a genial silver-haired human gentleman in his sixties, an elegant plum-coloured frock coat, a cane topped with a gold egg-shaped pommel, a generous smile that does not reach his eyes',
    moods: { exultant: 'plain grey cult robes thrown over the plum coat, arms spread wide, lit by golden light from below, triumphant' } }),
  hessa: N({ id: 'hessa', color: '#d08a50', voice: { wave: 'triangle', pitch: 200 },
    look: 'an old bronze-scaled dragonborn woman, a dragon-like reptilian head with faded bronze scales, flour on her apron, holding a small clay hearth lamp whose flame is clearly BLUE (a cool blue fire, not yellow)', moods: {} }),
  ilo: N({ id: 'ilo', color: '#a0b8a0', voice: { wave: 'sine', pitch: 300 },
    look: 'a thin young dragonborn labourer, a dragon-like reptilian head with dusty grey-green scales, rope burns on his wrists, a wool blanket around his shoulders, tired wary eyes', moods: {} }),
  // ── facility keepers ──
  maren: N({ id: 'maren', color: '#9fb2c4', voice: { wave: 'square', pitch: 160 }, tab: 'guild',
    look: 'a gruff human woman guildmaster in her sixties, a black leather patch over one eye, iron-grey hair in a short braid, a heavy guild sash over a worn gambeson, an old soldier\'s bearing', moods: {} }),
  ilvane: N({ id: 'ilvane', color: '#c9a24a', voice: { wave: 'sine', pitch: 380 }, tab: 'chronicle',
    look: 'an ageless elf chronicler with long straight silver hair tied back, ink-stained fingers holding a quill, half-moon spectacles, a scholar\'s deep green robe with many pockets', moods: {} }),
  pim: N({ id: 'pim', color: '#7fc0a0', voice: { wave: 'square', pitch: 420 }, tab: 'cartographer',
    look: 'an excitable elderly gnome cartographer with wild white hair, round brass spectacles pushed up on his forehead, a pencil in each hand, rolled maps under one arm', moods: {} }),
  hulda: N({ id: 'hulda', color: '#e4643a', voice: { wave: 'square', pitch: 140 }, tab: 'armory',
    look: 'a stocky dwarf woman smith with soot on her cheeks, dark hair bound up in a red scarf, a heavy leather forge apron, burn-scarred bare forearms, a pair of smith\'s tongs in one hand', moods: {} }),
  fennick: N({ id: 'fennick', color: '#8fc06a', voice: { wave: 'triangle', pitch: 340 }, tab: 'apothecary',
    look: 'a very old halfling woman apothecary with white curls under a flowered kerchief, sharp bright eyes, a shawl, bundles of dried herbs and a mortar and pestle', moods: {} }),
  sabeline: N({ id: 'sabeline', color: '#b48cff', voice: { wave: 'sine', pitch: 300 }, tab: 'enchanter',
    look: 'a poised tiefling woman enchanter with lavender skin, swept-back horns ringed with silver bands, dark hair, a high-collared indigo coat, a faint glowing rune hovering over one palm', moods: {} }),
  kost: N({ id: 'kost', color: '#c8b48a', voice: { wave: 'square', pitch: 120 }, tab: 'training',
    look: 'a towering goliath drillmaster with grey stone-like skin marked with dark lines, a bald head, a whistle on a cord, a padded training vest and a wooden practice sword over his shoulder', moods: {} }),
  pell: N({ id: 'pell', color: '#f2d27a', voice: { wave: 'triangle', pitch: 360 }, tab: 'vault',
    look: 'a nervous young human vault clerk with neat parted brown hair, a high starched collar, ink-smudged cuffs, a brass key ring and an abacus held to his chest', moods: {} }),
};

/** Tiamat's heads speak in boxes without portraits: a single eye. */
export const HEAD_EYES: Record<string, { key: string; color: string; subject: string }> = {
  cinder: { key: 'npcs/head_red', color: '#e4643a', subject: 'a single enormous slit-pupilled dragon eye, half-open, glowing fiery red-orange, surrounded by crimson scales, wisps of smoke' },
  rootbound: { key: 'npcs/head_green', color: '#5fae5b', subject: 'a single enormous slit-pupilled dragon eye, half-open, glowing poison green, surrounded by emerald scales, drifting spores' },
  drowned: { key: 'npcs/head_black', color: '#7a7a9e', subject: 'a single enormous slit-pupilled dragon eye, half-open, glowing pale sickly yellow, surrounded by glossy black scales dripping with water' },
  mirror: { key: 'npcs/head_white', color: '#dfe8f5', subject: 'a single enormous slit-pupilled dragon eye, half-open, glowing icy pale blue-white, surrounded by frosted white scales and ice crystals' },
  starfall: { key: 'npcs/head_blue', color: '#5aa9ff', subject: 'a single enormous slit-pupilled dragon eye, half-open, glowing electric blue, surrounded by sapphire scales crackling with tiny sparks of lightning' },
};

export function portraitKey(id: string, mood: Mood = 'neutral'): string {
  return `npcs/${id}_${mood}`;
}

export const KEEPER_BY_TAB: Record<string, string> = Object.fromEntries(Object.values(NPCS).filter((n) => n.tab).map((n) => [n.tab!, n.id]));
