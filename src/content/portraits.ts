/**
 * Portrait variants: four per class, each tied to an ancestry and a look so
 * a recruit's art always matches their sheet. Keys are art paths.
 */
import type { ClassId } from '../engine/types.ts';

export interface PortraitDef { key: string; classId: ClassId; ancestry: string; look: string }

const P = (classId: ClassId, n: number, ancestry: string, look: string): PortraitDef => ({ key: `heroes/${classId}_${n}`, classId, ancestry, look });

export const PORTRAITS: PortraitDef[] = [
  P('fighter', 1, 'human', 'a broad-shouldered human man in his thirties with a short dark beard, chain mail and a steel-rimmed shield'),
  P('fighter', 2, 'dwarf', 'a stout dwarf woman with braided copper hair and a battle-scarred breastplate'),
  P('fighter', 3, 'orc', 'a tall grey-green orc woman with tusks, a shaved head and heavy plate pauldrons'),
  P('fighter', 4, 'goliath', 'a towering goliath man with stone-grey skin and tribal markings, holding a greatsword'),
  P('cleric', 1, 'dwarf', 'a dwarf woman priestess with silver-streaked braids, a sun-disc holy symbol and a mace'),
  P('cleric', 2, 'human', 'an elderly human man with kind eyes, white robes over scale mail and a glowing holy symbol'),
  P('cleric', 3, 'dragonborn', 'a bronze-scaled dragonborn woman in vestments with a radiant halo of light'),
  P('cleric', 4, 'halfling', 'a cheerful halfling man with curly hair, a too-large shield and a lantern of holy light'),
  P('rogue', 1, 'halfling', 'a sly halfling with a crooked grin, a dark hood and a dagger twirling between fingers'),
  P('rogue', 2, 'elf', 'a sharp-featured elf woman with a cowl, a mask over her lower face and twin shortswords'),
  P('rogue', 3, 'tiefling', 'a purple-skinned tiefling man with curled horns, a feathered hat and loaded dice'),
  P('rogue', 4, 'human', 'a young human woman with freckles, a patched leather coat and a lockpick behind her ear'),
  P('barbarian', 1, 'goliath', 'a massive goliath woman with stone-grey skin, war paint and a greataxe'),
  P('barbarian', 2, 'human', 'a wild-haired human man with a bear-pelt cloak, scars and a roaring expression'),
  P('barbarian', 3, 'orc', 'a scarred orc man with tusks, braids and blood-red war paint'),
  P('barbarian', 4, 'dwarf', 'a dwarf berserker with a flame-red beard and twin handaxes'),
  P('bard', 1, 'elf', 'a graceful elf man with long silver hair, a lute and an embroidered violet coat'),
  P('bard', 2, 'tiefling', 'a crimson-skinned tiefling woman with ram horns, a feathered cap and a fiddle'),
  P('bard', 3, 'gnome', 'a tiny gnome with wild teal hair, round spectacles and a set of pan-pipes'),
  P('bard', 4, 'human', 'a charming human woman with a grin, a cloak of patchwork and a hand drum'),
  P('druid', 1, 'elf', 'a wood elf woman with a crown of antlers and leaves, holding a gnarled staff'),
  P('druid', 2, 'human', 'a weathered human man with moss in his beard and a staff topped with a crow skull'),
  P('druid', 3, 'halfling', 'a halfling woman with mushrooms woven into her hair and a fox companion on her shoulder'),
  P('druid', 4, 'orc', 'an orc druid with bark-like tattoos and a cloak of living vines'),
  P('monk', 1, 'human', 'a shaven-headed human woman in storm-blue wraps, hands wrapped, in a fighting stance'),
  P('monk', 2, 'elf', 'a serene elf man with a long braid and simple robes, crackling with blue ki energy'),
  P('monk', 3, 'dragonborn', 'a sapphire-scaled dragonborn monk with prayer beads and wrapped fists'),
  P('monk', 4, 'gnome', 'a wiry old gnome master with a long white moustache and a bo staff'),
  P('paladin', 1, 'human', 'a noble human woman in polished plate with a sunburst tabard and a longsword'),
  P('paladin', 2, 'dragonborn', 'a gold-scaled dragonborn knight in gleaming armour with a radiant shield'),
  P('paladin', 3, 'dwarf', 'a dwarf paladin with a white beard, a warhammer and a sun-emblazoned shield'),
  P('paladin', 4, 'goliath', 'a goliath paladin with a halo of light and a great holy blade'),
  P('ranger', 1, 'elf', 'a hooded elf archer with a longbow, green cloak and keen eyes'),
  P('ranger', 2, 'human', 'a rugged human man with a three-day beard, a wolf-pelt mantle and a quiver'),
  P('ranger', 3, 'halfling', 'a halfling woman scout with a hawk on her arm and a shortbow'),
  P('ranger', 4, 'orc', 'an orc tracker with a scarred face, a recurve bow and bone fetishes'),
  P('sorcerer', 1, 'human', 'a young human man with ember-orange eyes and flames curling from his fingertips'),
  P('sorcerer', 2, 'dragonborn', 'a red-scaled dragonborn woman wreathed in draconic fire'),
  P('sorcerer', 3, 'tiefling', 'a tiefling with glowing magma veins and a confident smirk'),
  P('sorcerer', 4, 'elf', 'an elf woman with hair of living flame and gold draconic scales on her cheeks'),
  P('warlock', 1, 'tiefling', 'a tiefling man in a black coat with an infernal contract and violet hellfire'),
  P('warlock', 2, 'human', 'a pale human woman with a raven-feather collar and shadowy eldritch power'),
  P('warlock', 3, 'elf', 'a drow-like dark elf with white hair and a pact blade of purple flame'),
  P('warlock', 4, 'gnome', 'a gnome with an unsettling grin and a glowing fiendish tome'),
  P('wizard', 1, 'human', 'an old human wizard with a long grey beard, a starry blue robe and a crystal staff'),
  P('wizard', 2, 'gnome', 'a gnome woman wizard with goggles, scrolls tucked everywhere and arcane sparks'),
  P('wizard', 3, 'elf', 'a high elf woman with a circlet, an open spellbook and floating glyphs'),
  P('wizard', 4, 'tiefling', 'a scholarly tiefling man with spectacles on his horns and a quill of light'),
];

export function portraitsFor(classId: ClassId): PortraitDef[] {
  return PORTRAITS.filter((p) => p.classId === classId);
}
