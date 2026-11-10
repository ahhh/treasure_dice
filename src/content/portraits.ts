/**
 * Hero portraits. Every class has one portrait per species and sex
 * (`heroes/<class>_<species>_<sex>`), each with an art subject (`look`) built
 * from the species' features, the class's outfit and one signature prop of its
 * own, so a recruit's art always matches their sheet. The original four per
 * class (`heroes/<class>_<n>`) stay as legacy variants: old saves point at them.
 * Looks describe pictures for the image pipeline; they are not player text.
 */
import type { ClassId } from '../engine/types.ts';

export type Sex = 'male' | 'female';
export const SEXES: Sex[] = ['male', 'female'];

export interface PortraitDef { key: string; classId: ClassId; ancestry: string; sex: Sex; look: string; legacy?: boolean }

const P = (classId: ClassId, n: number, ancestry: string, sex: Sex, look: string): PortraitDef => ({ key: `heroes/${classId}_${n}`, classId, ancestry, sex, look, legacy: true });

const LEGACY: PortraitDef[] = [
  P('fighter', 1, 'human', 'male', 'a broad-shouldered human man in his thirties with a short dark beard, chain mail and a steel-rimmed shield'),
  P('fighter', 2, 'dwarf', 'female', 'a stout dwarf woman with braided copper hair and a battle-scarred breastplate'),
  P('fighter', 3, 'orc', 'female', 'a tall grey-green orc woman with tusks, a shaved head and heavy plate pauldrons'),
  P('fighter', 4, 'goliath', 'male', 'a towering goliath man with stone-grey skin and tribal markings, holding a greatsword'),
  P('cleric', 1, 'dwarf', 'female', 'a dwarf woman priestess with silver-streaked braids, a sun-disc holy symbol and a mace'),
  P('cleric', 2, 'human', 'male', 'an elderly human man with kind eyes, white robes over scale mail and a glowing holy symbol'),
  P('cleric', 3, 'dragonborn', 'female', 'a bronze-scaled dragonborn woman in vestments with a radiant halo of light'),
  P('cleric', 4, 'halfling', 'male', 'a cheerful halfling man with curly hair, a too-large shield and a lantern of holy light'),
  P('rogue', 1, 'halfling', 'male', 'a sly halfling with a crooked grin, a dark hood and a dagger twirling between fingers'),
  P('rogue', 2, 'elf', 'female', 'a sharp-featured elf woman with a cowl, a mask over her lower face and twin shortswords'),
  P('rogue', 3, 'tiefling', 'male', 'a purple-skinned tiefling man with curled horns, a feathered hat and loaded dice'),
  P('rogue', 4, 'human', 'female', 'a young human woman with freckles, a patched leather coat and a lockpick behind her ear'),
  P('barbarian', 1, 'goliath', 'female', 'a massive goliath woman with stone-grey skin, war paint and a greataxe'),
  P('barbarian', 2, 'human', 'male', 'a wild-haired human man with a bear-pelt cloak, scars and a roaring expression'),
  P('barbarian', 3, 'orc', 'male', 'a scarred orc man with tusks, braids and blood-red war paint'),
  P('barbarian', 4, 'dwarf', 'male', 'a dwarf berserker with a flame-red beard, one hand wrapped firmly around the haft of a single raised handaxe, a second handaxe hanging from his belt'),
  P('bard', 1, 'elf', 'male', 'a graceful elf man with long silver hair, a lute and an embroidered violet coat'),
  P('bard', 2, 'tiefling', 'female', 'a crimson-skinned tiefling woman with ram horns, a feathered cap and a fiddle'),
  P('bard', 3, 'gnome', 'male', 'a tiny gnome with wild teal hair, round spectacles and a set of pan-pipes'),
  P('bard', 4, 'human', 'female', 'a charming human woman with a grin, a cloak of patchwork and a hand drum'),
  P('druid', 1, 'elf', 'female', 'a wood elf woman with a crown of antlers and leaves, holding a gnarled staff'),
  P('druid', 2, 'human', 'male', 'a weathered human man with moss in his beard and a staff topped with a crow skull'),
  P('druid', 3, 'halfling', 'female', 'a halfling woman with mushrooms woven into her hair and a fox companion on her shoulder'),
  P('druid', 4, 'orc', 'male', 'an orc druid with bark-like tattoos and a cloak of living vines'),
  P('monk', 1, 'human', 'female', 'a shaven-headed human woman in storm-blue wraps, hands wrapped, in a fighting stance'),
  P('monk', 2, 'elf', 'male', 'a serene elf man with a long braid and simple robes, crackling with blue ki energy'),
  P('monk', 3, 'dragonborn', 'male', 'a sapphire-scaled dragonborn monk with prayer beads and wrapped fists'),
  P('monk', 4, 'gnome', 'male', 'a wiry old gnome master with a long white moustache and a bo staff'),
  P('paladin', 1, 'human', 'female', 'a noble human woman in polished plate with a sunburst tabard and a longsword'),
  P('paladin', 2, 'dragonborn', 'male', 'a gold-scaled dragonborn knight in gleaming armour with a radiant shield'),
  P('paladin', 3, 'dwarf', 'male', 'a dwarf paladin with a white beard, a warhammer and a sun-emblazoned shield'),
  P('paladin', 4, 'goliath', 'female', 'a goliath paladin with a halo of light and a great holy blade'),
  P('ranger', 1, 'elf', 'female', 'a hooded elf archer with a longbow, green cloak and keen eyes'),
  P('ranger', 2, 'human', 'male', 'a rugged human man with a three-day beard, a wolf-pelt mantle and a quiver'),
  P('ranger', 3, 'halfling', 'female', 'a halfling woman scout with a hawk on her arm and a shortbow'),
  P('ranger', 4, 'orc', 'male', 'an orc tracker with a scarred face, a recurve bow and bone fetishes'),
  P('sorcerer', 1, 'human', 'male', 'a young human man with ember-orange eyes and flames curling from his fingertips'),
  P('sorcerer', 2, 'dragonborn', 'female', 'a red-scaled dragonborn woman wreathed in draconic fire'),
  P('sorcerer', 3, 'tiefling', 'male', 'a tiefling with glowing magma veins and a confident smirk'),
  P('sorcerer', 4, 'elf', 'female', 'an elf woman with hair of living flame and gold draconic scales on her cheeks'),
  P('warlock', 1, 'tiefling', 'male', 'a tiefling man in a black coat with an infernal contract and violet hellfire'),
  P('warlock', 2, 'human', 'female', 'a pale human woman with a raven-feather collar and shadowy eldritch power'),
  P('warlock', 3, 'elf', 'male', 'a drow-like dark elf with white hair and a pact blade of purple flame'),
  P('warlock', 4, 'gnome', 'female', 'a gnome with an unsettling grin and a glowing fiendish tome'),
  P('wizard', 1, 'human', 'male', 'an old human wizard with a long grey beard, a starry blue robe and a crystal staff'),
  P('wizard', 2, 'gnome', 'female', 'a gnome woman wizard with goggles, scrolls tucked everywhere and arcane sparks'),
  P('wizard', 3, 'elf', 'female', 'a high elf woman with a circlet, an open spellbook and floating glyphs'),
  P('wizard', 4, 'tiefling', 'male', 'a scholarly tiefling man with spectacles on his horns and a quill of light'),
];

// ── generated grid: class × species × sex ────────────────────────────────────

/** Species in grid order (matches SPECIES in origins.ts). */
export const PORTRAIT_SPECIES = ['human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'gnome', 'goliath', 'orc', 'tiefling'];

/** Clothing accent per combo, so a class's sheet isn't one costume repeated. */
const ACCENTS = ['deep red', 'forest green', 'navy blue', 'ochre yellow', 'plum', 'teal', 'rust orange', 'charcoal grey', 'cream white', 'burgundy', 'sky blue'];

const AGES = ['a young adult', 'in their late twenties', 'in their thirties', 'in middle age', 'older, with lines around the eyes and grey streaks'];

/** Part-by-part species features: the soft anime style flattens species unless told exactly. */
const SPECIES_LOOK: Record<string, (sex: Sex, v: number) => string> = {
  human: (s, v) => `an ordinary HUMAN ${s === 'male' ? 'man' : 'woman'} with round human ears and ${pick(['brown', 'black', 'auburn', 'sandy blond', 'chestnut', 'dark red'], v)} hair${s === 'male' && v % 2 ? ' and a short beard' : ''}, ${pick(['olive', 'warm brown', 'fair freckled', 'deep brown', 'tan'], v + 1)} skin`,
  elf: (s, v) => `an ELF ${s === 'male' ? 'man' : 'woman'}: tall and slender, with LONG POINTED ELF EARS clearly visible, fine sharp features, ${pick(['silver-white', 'pale gold', 'raven black', 'copper', 'moss-brown'], v)} hair, ${pick(['pale', 'golden-tan', 'dusky grey-blue', 'warm brown'], v + 2)} skin`,
  dwarf: (s, v) => `a DWARF ${s === 'male' ? 'man with a long, thick braided beard' : 'woman with thick braided hair and ruddy cheeks'}: very short and STOCKY, broad shoulders, a wide face and a broad nose, ${pick(['copper-red', 'iron-grey', 'jet black', 'chestnut', 'flaxen'], v)} hair`,
  halfling: (s, v) => `a HALFLING ${s === 'male' ? 'man' : 'woman'}: a small, stout, well-fed person about half human height, a grown-up (not a child) with a ROUND cheerful face, plump rosy cheeks, a small button nose, big CURLY ${pick(['brown', 'honey-blond', 'black', 'russet'], v)} hair and slightly pointed ears; NOT a lean human and NOT an elf`,
  dragonborn: (s, v) => `a DRAGONBORN ${s === 'male' ? 'man' : 'woman'}: a humanoid with a reptilian DRAGON HEAD drawn part by part: a long scaly snout with nostrils at the tip, a ridge of ${s === 'male' ? 'heavy swept-back' : 'slender swept-back'} horns, a small frill, NO ears and NO hair, ${pick(['brass', 'bronze', 'copper', 'gold', 'silver', 'deep red', 'sapphire blue', 'emerald green', 'onyx black', 'pearl white'], v)} scales covering the head and neck; a humanoid body with two arms and hands like a person`,
  gnome: (s, v) => `a GNOME ${s === 'male' ? 'man with a neatly trimmed short beard' : 'woman'}: a tiny grown ADULT, clearly NOT a human or an elf: a large head for the small body, very big bright round eyes, a LARGE ROUND BULBOUS NOSE with a rosy pink tip (round like a ball, NOT long or pointed), rosy cheeks, very long pointed ears sweeping back, ${pick(['wild teal', 'snow-white', 'tangerine', 'lavender', 'chestnut'], v)} hair; their gear looks a little oversized on them`,
  goliath: (s, v) => `a GOLIATH ${s === 'male' ? 'man' : 'woman'}: a giant-kin of huge muscular build with GREY STONE-LIKE SKIN mottled with darker grey patches and thin pale lines like veins in granite, a heavy brow, a broad jaw, ${s === 'male' ? 'a bald head' : 'a clearly FEMININE face (a woman, softer features, defined lips) with long dark hair in one thick braid'}, small ears; clearly NOT a human: the skin is grey like rock`,
  orc: (s, v) => `an ORC ${s === 'male' ? 'man' : 'woman'}: a tall, powerfully muscular and dignified warrior-folk (serious, NOT comical), ${pick(['grey-green', 'olive-green', 'ash-grey', 'moss-green'], v)} skin, TWO PROMINENT LOWER TUSKS jutting up from the jaw and clearly visible, SHORT pointed ears close to the head (NOT long elf ears), a heavy brow and a strong jaw, ${pick(['black', 'dark brown', 'iron-grey'], v + 1)} hair${s === 'female' ? ' in thick braids' : ' tied back'}`,
  tiefling: (s, v) => `a TIEFLING ${s === 'male' ? 'man' : 'woman'}: ${pick(['crimson', 'deep red', 'rose-red', 'burnt orange', 'dusky blue', 'wine-dark red'], v)} skin (NOT the pale purple of a dark elf), two ${pick(['curled ram', 'swept-back', 'tall straight', 'spiralling'], v + 1)} HORNS rising from the forehead, solid glowing ${pick(['gold', 'silver', 'red', 'amber'], v + 2)} eyes with no pupils, pointed ears, ${pick(['black', 'dark violet', 'dark brown', 'deep red'], v + 3)} hair, and a long thin devil TAIL visible curling beside them`,
};

/** Class outfit plus 18 signature props: one per species × sex, so no two portraits in a class share one. */
const CLASS_LOOK: Record<string, { outfit: string; props: string[] }> = {
  barbarian: {
    outfit: 'a barbarian in furs and leather with war paint on the face',
    props: ['a notched greataxe over one shoulder', 'a necklace of wolf teeth', 'a bear-skull helm pushed back', 'a two-handed maul', 'a cloak of white winter fur', 'twin hand axes crossed on the back', 'a bone-hilted greatsword', 'a horned helm', 'a spear wrapped in red cloth', 'an eagle-feather headdress', 'a heavy club studded with iron', 'a boar-tusk necklace', 'a stone-headed warhammer', 'a great hide shield painted with a beast', 'chains wrapped around the forearms', 'a lion mane mantle', 'a flail with a spiked ball', 'a torn red war banner tied to the belt'],
  },
  bard: {
    outfit: 'a bard in a richly embroidered coat',
    props: ['a lute', 'a silver flute', 'a fiddle and bow', 'a small harp', 'a hand drum', 'a hurdy-gurdy', 'a long feathered quill and a song sheet', 'a lyre', 'a pair of finger cymbals', 'a horn trumpet', 'a mandolin with ribbons', 'a set of pan-pipes', 'a tambourine', 'an accordion', 'a theatre mask held up beside the face', 'a bagpipe', 'a set of handbells', 'a bodhrán frame drum with a beater'],
  },
  cleric: {
    outfit: 'a cleric in vestments over scale armour with a sun-disc holy symbol',
    props: ['a sun-disc holy symbol and a mace', 'a glowing prayer book', 'a censer trailing incense smoke', 'a warhammer and a round shield', 'a staff topped with a radiant star', 'a string of prayer beads', 'a lantern of holy light', 'a flanged mace resting on the shoulder', 'a silver chalice', 'a sun-emblazoned kite shield', 'a reliquary box on a chain', 'a halo of soft light', 'a ceremonial bell', 'a white stole embroidered with gold', 'a crook-shaped shepherd staff', 'a bundle of healing herbs', 'a candle cupped in both hands', 'a winged helm'],
  },
  druid: {
    outfit: 'a druid in leaves, bark and woven green cloth',
    props: ['a gnarled oak staff', 'a crown of antlers', 'a raven on the shoulder', 'a sickle of bronze', 'mushrooms woven into the hair', 'a fox curled on the shoulders', 'a staff sprouting fresh leaves', 'a cloak of living vines', 'a small owl perched on one arm', 'a wreath of wildflowers', 'a deer-skull mask pushed up on the head', 'a lantern holding fireflies', 'a pouch of glowing seeds', 'a snake coiled around one arm', 'a wooden totem carved with animals', 'a mantle of moss', 'a hawk feather fan', 'a hare peeking from the cloak'],
  },
  fighter: {
    outfit: 'a fighter in practical soldier\'s armour',
    props: ['a longsword and a round steel shield', 'a greatsword over the shoulder', 'a halberd', 'a crossbow and a short sword', 'a kite shield with a lion crest', 'a battle axe', 'a heavy flail', 'a visored helm held under one arm', 'twin short swords', 'a long spear', 'a war pick', 'a red plumed helm', 'a glaive', 'a tower shield', 'a morningstar', 'a scarred chain-mail coif', 'a rapier and a parrying dagger', 'a lance pennant tied to the shoulder'],
  },
  monk: {
    outfit: 'a monk in simple wrapped robes with taped fists',
    props: ['prayer beads', 'a bo staff', 'a straw hat', 'a pair of nunchaku', 'a wooden begging bowl', 'a crackle of blue ki between the palms', 'a shaved head and a meditation mark', 'a pair of sai', 'a rope belt with a gourd', 'a kama sickle', 'a long braid wrapped around the neck', 'a smooth river stone balanced on one palm', 'a three-section staff', 'a bamboo flute at the belt', 'iron bracers', 'a falling cherry blossom caught in one hand', 'a temple bell pendant', 'a monk\'s spade staff'],
  },
  paladin: {
    outfit: 'a paladin in polished plate armour with a tabard',
    props: ['a longsword raised in salute', 'a sunburst kite shield', 'a warhammer', 'a radiant halo', 'a winged helm', 'a holy lance', 'a heater shield with a white rose', 'a great holy blade', 'a flowing blue cape', 'a sacred tome chained to the belt', 'a gilded mace', 'a laurel circlet', 'an oath scroll sealed with wax', 'a glowing sword held point-down', 'a lion-headed pauldron', 'a banner of a rising sun', 'a crystal-pommel bastard sword', 'a gauntlet raised with a glowing palm'],
  },
  ranger: {
    outfit: 'a ranger in a hooded cloak and travel leathers',
    props: ['a longbow', 'a hawk on the arm', 'a wolf companion at the shoulder', 'a quiver of fletched arrows', 'twin hunting knives', 'a fur mantle', 'a recurve bow', 'a spyglass', 'a tracker\'s map case', 'a falcon-feather cap', 'a short spear', 'a lynx companion', 'a horn for calling', 'a crossbow', 'a raven feather cloak', 'a coil of rope and a grappling hook', 'a woodsman\'s hand axe', 'a bone whistle'],
  },
  rogue: {
    outfit: 'a rogue in dark fitted leathers',
    props: ['a dagger twirled between the fingers', 'a deep hood', 'a mask over the lower face', 'twin short swords', 'a lockpick tucked behind the ear', 'a feathered tricorn hat', 'a small crossbow', 'a pouch of stolen coins', 'a curved knife', 'a rapier', 'a deck of cards fanned in one hand', 'a grappling line', 'a key ring', 'a pair of throwing stars', 'a smoke bomb', 'a scarf wrapped high', 'a garrote cord', 'a jewelled ring held up to the light'],
  },
  sorcerer: {
    outfit: 'a sorcerer in flowing clothes with raw magic in the hands',
    props: ['flames curling from the fingertips', 'faint draconic scales on the cheeks', 'a crackle of lightning', 'swirling embers', 'a floating orb of fire', 'glowing magma veins on the arms', 'a ring of sparks', 'a staff wreathed in fire', 'an amulet of a dragon eye', 'hair lifted by a magical wind', 'a burning rose', 'a whirl of frost crystals', 'a ribbon of starlight', 'a cupped flame', 'a shimmering heat haze', 'a phoenix feather', 'glowing runes on the palms', 'a coin spinning in the air'],
  },
  warlock: {
    outfit: 'a warlock in a dark coat with eldritch violet power',
    props: ['an infernal contract scroll', 'a pact blade of purple flame', 'a raven-feather collar', 'a glowing fiendish tome', 'a chain wrapped around one wrist', 'an eye-shaped amulet', 'a skull lantern', 'a black candle', 'a tentacle-like wisp of shadow', 'a staff topped with a horned skull', 'a violet hellfire orb', 'a key of black iron', 'a carved bone mask hanging at the belt, the face uncovered', 'a cat familiar with glowing eyes', 'a sigil burning on the palm', 'a hood with stars inside', 'a dagger dripping shadow', 'a bound grimoire with chains'],
  },
  wizard: {
    outfit: 'a wizard in star-embroidered robes',
    props: ['a crystal-topped staff', 'an open spellbook', 'floating glyphs', 'a pointed hat', 'spectacles and a quill of light', 'a small owl familiar', 'a crystal ball', 'scrolls tucked everywhere', 'a wand of carved wood', 'an hourglass', 'a floating candle', 'a brass astrolabe', 'a toad familiar', 'a circlet with a gem', 'a lantern of blue fire', 'a chained book', 'a feather quill and ink pot', 'a tiny orbiting moon'],
  },
  artificer: {
    outfit: 'an artificer in a leather work apron and brass-buckled coat with goggles',
    props: ['a tiny clockwork construct on the shoulder', 'a glowing infused wrench', 'a repeating crossbow', 'a brass gauntlet with gears', 'a satchel of potion vials', 'a mechanical arm', 'a hammer with a glowing rune', 'a thunder cannon', 'a toolbelt of fine instruments', 'a magnifying lens over one eye', 'a brass owl automaton', 'a glowing alchemical flask', 'an arcane battery pack', 'a clockwork beetle crawling on the hand', 'a riveted shield with a turret', 'a pair of copper wings folded on the back', 'a spark-throwing wand', 'a blueprint scroll'],
  },
};

function pick<T>(list: T[], v: number): T { return list[((v % list.length) + list.length) % list.length]; }

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function gridLook(classId: string, ancestry: string, sex: Sex, idx: number): string {
  const v = hash(`${classId}:${ancestry}:${sex}`);
  const c = CLASS_LOOK[classId];
  const age = pick(AGES, v >> 3).replace('their', sex === 'male' ? 'his' : 'her');
  // Horns and long ears clash with hoods (the model pokes them through the cloth), so these
  // species wear the hood DOWN, said in the outfit itself; a note tacked on the end gets ignored.
  const sticksOut = ancestry === 'dragonborn' || ancestry === 'tiefling' ? 'horns' : ancestry === 'elf' || ancestry === 'gnome' || ancestry === 'orc' ? 'pointed ears' : '';
  const hoodDown = (t: string) => (sticksOut ? t.replace(/a hooded cloak/, 'a cloak with its hood hanging DOWN behind the neck (bare head)').replace(/a deep hood/, 'a hood lowered onto the shoulders') : t);
  const outfit = hoodDown(c.outfit);
  const prop = hoodDown(c.props[idx]);
  const look = `${SPECIES_LOOK[ancestry](sex, v >> 7)}, ${age}. ${outfit[0].toUpperCase()}${outfit.slice(1)}, with ${prop}; clothing accents in ${pick(ACCENTS, v >> 11)}`;
  return sticksOut && /hood/.test(`${c.outfit} ${c.props[idx]}`) ? `${look}. Nothing covers the head: the hair and ${sticksOut} are in full view` : look;
}

const GRID: PortraitDef[] = Object.keys(CLASS_LOOK).flatMap((classId) =>
  PORTRAIT_SPECIES.flatMap((ancestry, si) => SEXES.map((sex, xi) => ({
    key: `heroes/${classId}_${ancestry}_${sex}`, classId: classId as ClassId, ancestry, sex, look: gridLook(classId, ancestry, sex, si * 2 + xi),
  }))));

export const PORTRAITS: PortraitDef[] = [...GRID, ...LEGACY];

/**
 * Portraits for a class, narrowed by species and sex when given. With both, the
 * grid portrait comes first (legacy matches after it); if nothing matches, every
 * portrait of the class is returned.
 */
export function portraitsFor(classId: ClassId, ancestry?: string, sex?: Sex): PortraitDef[] {
  const all = PORTRAITS.filter((p) => p.classId === classId);
  const hit = all.filter((p) => (!ancestry || p.ancestry === ancestry) && (!sex || p.sex === sex));
  return hit.length ? hit : all;
}

export function portraitByKey(key: string): PortraitDef | undefined {
  return PORTRAITS.find((p) => p.key === key);
}
