/** The five echoes, each behind its own door (plan §6); Tiamat waits behind the sixth. */
import type { BiomeId, RoomType } from '../engine/types.ts';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  tagline: string;
  premise: string;
  color: string;
  accent: string;
  meter: { name: string; max: number; text: string; icon: string };
  rooms: Partial<Record<RoomType, string[]>>;
  atmosphere: string[];
  details: string[];
  civilizations: string[];
  factions: string[];
  anomalies: string[];
  objectives: string[];
  hooks: string[];
  /** Room tag that carries the biome mechanic and its probability. */
  tag: { id: string; chance: number; label: string };
  /** Room tag that resets the meter. */
  resetTag: { id: string; label: string };
  scenes: string[];
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  cinder: {
    id: 'cinder', name: 'The Cinder Vaults', tagline: 'Ash-filled mines and molten catacombs.',
    premise: 'Dwarven forge-halls that never cooled. Iron doors, slag rivers, and a heat that builds with every step.',
    color: '#e4643a', accent: '#ffb347',
    meter: { name: 'Heat', max: 6, icon: '🔥', text: 'Hot rooms raise Heat. At 3+, fights begin with the party burning — but Ember and Steel dice score +1 Mult. Cooling cisterns reset it.' },
    rooms: {
      corridor: ['Slag Gallery', 'Ash Tunnel', 'Cinder Stair', 'Rail Cut', 'Bellows Hall', 'Chain Bridge'],
      combat: ['Smelting Floor', 'Ore Crusher', 'Collapsed Shaft', 'Molten Catwalk'],
      elite: ['The Anvil Court', 'Guardroom of Iron'],
      treasure: ['Ingot Vault', 'Smith\'s Hoard'],
      peddler: ['Soot-Market Stall'], shrine: ['Furnace Shrine'], event: ['Valve Chamber', 'Abandoned Foundry', 'Miners\' Chapel'],
      camp: ['Cooling Cistern'], boss: ['The Deep Forge'], key: ['Sigil Kiln'], entrance: ['Iron Gate'], mechanism: ['Steam Valve Room'],
    },
    atmosphere: ['Heat rolls off the walls in waves.', 'Ash drifts like grey snow.', 'Somewhere below, metal rings on metal.', 'The air tastes of copper and smoke.', 'Lava light paints everything orange.'],
    details: ['A cart of slag has frozen mid-pour.', 'Rune-plates on the wall have half melted.', 'Chains sway though there is no wind.', 'A dwarf-sized helmet lies cooling on the floor.', 'Old soot handprints climb the wall.'],
    civilizations: ['the Ironbound Clans', 'the Ember Guild', 'the Lost Smiths of Khar'],
    factions: ['soot goblins', 'ash cultists', 'rogue automata', 'slag beasts'],
    anomalies: ['the forge-heart beats again', 'ash falls upward', 'molten rivers run backwards'],
    objectives: ['quench the forge-heart', 'recover the Ingot of Oaths', 'free the bound miners'],
    hooks: ['a fighter\'s old shield-brother went missing here', 'the Keep\'s smith wants a lost recipe'],
    tag: { id: 'hot', chance: 0.4, label: 'Sweltering' },
    resetTag: { id: 'cool', label: 'Cool air' },
    scenes: ['corridor', 'forge', 'vault', 'boss'],
  },
  rootbound: {
    id: 'rootbound', name: 'The Rootbound Halls', tagline: 'Overgrown mausoleums and fungal shrines.',
    premise: 'A necropolis swallowed by a living forest. Every footstep wakes the spores.',
    color: '#5fae5b', accent: '#c8e070',
    meter: { name: 'Bloom', max: 6, icon: '🍄', text: 'Every step raises Bloom. At 3+, foes regenerate — but Verdant dice score +4 Chips. Quiet groves reset it.' },
    rooms: {
      corridor: ['Root Tunnel', 'Fungal Arcade', 'Vine-Choked Crypt', 'Mossy Ossuary', 'Canopy Ruin'],
      combat: ['Spore Chamber', 'Overgrown Tomb', 'Root-Cracked Hall'],
      elite: ['The Briar Court', 'Bark Sentinel\'s Gate'],
      treasure: ['Burial Cache', 'Druid Reliquary'],
      peddler: ['Mushroom Trader\'s Hollow'], shrine: ['Moss Altar'], event: ['Whispering Tree', 'Sealed Sarcophagus', 'Glowcap Garden'],
      camp: ['Quiet Grove'], boss: ['The Heartroot'], key: ['Seed Vault'], entrance: ['Mausoleum Door'], mechanism: ['Root Gate'],
    },
    atmosphere: ['Spores glitter in the lamplight.', 'The walls breathe softly.', 'Roots creak like old doors.', 'It smells of rain on graves.', 'Bioluminescent caps pulse green.'],
    details: ['A skeleton is cradled in a root like a hammock.', 'Names on the tombs have been eaten by lichen.', 'A shrine bell hangs choked by vines.', 'Mushrooms grow in a perfect ring.', 'Something has dug its way out of a grave.'],
    civilizations: ['the Mourning Druids', 'the Verdant Court', 'the Elder Keepers'],
    factions: ['sporelings', 'moss wights', 'thorn fey', 'fungal folk'],
    anomalies: ['the dead are flowering', 'the canopy blots out time', 'every root leads to one heart'],
    objectives: ['cleanse the Heartroot', 'retrieve a druid\'s last seed', 'lay the moss-wights to rest'],
    hooks: ['a cleric\'s old master was buried here', 'the Apothecary needs a rare glowcap'],
    tag: { id: 'spore', chance: 0.5, label: 'Spore-thick' },
    resetTag: { id: 'quiet', label: 'Still air' },
    scenes: ['corridor', 'tomb', 'grove', 'boss'],
  },
  drowned: {
    id: 'drowned', name: 'The Drowned Archive', tagline: 'Sunken libraries and brass pumps.',
    premise: 'An astronomers\' library sank beneath an inverted tide. Brass pumps still move the water between wings.',
    color: '#3a8fb8', accent: '#7fe0e0',
    meter: { name: 'Water', max: 1, icon: '🌊', text: 'Pump levers raise or lower the water. Low water opens flooded passages; high water gives Storm and Frost dice +2 Mult but foes resist cold.' },
    rooms: {
      corridor: ['Flooded Stacks', 'Brass Conduit', 'Reading Gallery', 'Collapsed Scriptorium', 'Tidal Stair'],
      combat: ['Drowned Reading Room', 'Map Hall', 'Pump Gallery'],
      elite: ['The Index Vault', 'Leviathan Pen'],
      treasure: ['Sealed Archive', 'Star-Chart Cabinet'],
      peddler: ['Bookbinder\'s Barge'], shrine: ['Tide Altar'], event: ['Ciphered Door', 'Drowned Observatory', 'Bell of the Deep'],
      camp: ['Dry Alcove'], boss: ['The Drowned Star'], key: ['Archivist\'s Desk'], entrance: ['Sea Stair'], mechanism: ['Pump Room'],
    },
    atmosphere: ['Water drips through shattered shelves.', 'Ink swirls in the shallows.', 'The pumps groan like whales.', 'Pages float past like leaves.', 'Blue lamplight wavers through water.'],
    details: ['A brass orrery turns slowly underwater.', 'A ledger lists the drowned in neat handwriting.', 'Shelves lean together like tired friends.', 'An eel coils around a reading lamp.', 'A star chart is pinned to the ceiling.'],
    civilizations: ['the Astronomers of Vel', 'the Tidebound Scholars', 'the Brass Collegium'],
    factions: ['eel cultists', 'drowned scribes', 'brass constructs', 'deep things'],
    anomalies: ['the tide runs upward', 'glass-rot spreads through the shelves', 'the stars are reflected wrong'],
    objectives: ['recover the Drowned Star', 'rescue the trapped archivists', 'silence the pump-heart'],
    hooks: ['a wizard\'s missing tutor catalogued this wing', 'the Cartographer wants the old star charts'],
    tag: { id: 'flooded', chance: 0.3, label: 'Waist-deep water' },
    resetTag: { id: 'pump', label: 'Pump lever' },
    scenes: ['corridor', 'library', 'pumps', 'boss'],
  },
  mirror: {
    id: 'mirror', name: 'The Mirror Reliquary', tagline: 'Glass corridors and impossible reflections.',
    premise: 'A cathedral built to trap a god inside its reflections. Facing matters here: doors exist only in the right light.',
    color: '#c9d6ff', accent: '#f0a8ff',
    meter: { name: 'Reflection', max: 3, icon: '🪞', text: 'Mirror rooms swap Left and Right. Visiting mirrored rooms raises Reflection; at 3, hidden mirror-doors reveal themselves.' },
    rooms: {
      corridor: ['Glass Corridor', 'Hall of Facets', 'Shattered Nave', 'Prism Walk', 'Silvered Cloister'],
      combat: ['Chapel of Shards', 'Reflecting Pool', 'Lens Gallery'],
      elite: ['The Bright Choir', 'Hall of Doubles'],
      treasure: ['Reliquary Case', 'Lens Vault'],
      peddler: ['Glasswright\'s Booth'], shrine: ['Altar of Reflections'], event: ['Talking Mirror', 'Broken Window', 'The Confessional'],
      camp: ['Dim Sanctuary'], boss: ['The Bright Nave'], key: ['Lens Altar'], entrance: ['Silver Door'], mechanism: ['Light Angle Room'],
    },
    atmosphere: ['Your reflections move a heartbeat late.', 'Light splits into colours that have no names.', 'Glass chimes like distant bells.', 'Every surface shows a different room.', 'The floor is a mirror; the sky beneath it is wrong.'],
    details: ['A reflection waves at you. You did not wave.', 'A stained-glass saint has your face.', 'Shards hang in the air, motionless.', 'A cracked mirror shows the boss room.', 'Prayer candles burn with reversed flames.'],
    civilizations: ['the Order of the Pane', 'the Lumen Monks', 'the Glasswright Saints'],
    factions: ['shard stalkers', 'facet cultists', 'mirror mimics', 'hollow doubles'],
    anomalies: ['reflections are trying to swap places', 'the light remembers', 'a god is cracking the glass from inside'],
    objectives: ['seal the cracked god-mirror', 'recover the Lens of Truth', 'free a hero trapped in a reflection'],
    hooks: ['a rogue swears they saw their double here', 'the Enchanter wants a perfect lens'],
    tag: { id: 'mirror', chance: 0.35, label: 'Mirrored — Left and Right are swapped' },
    resetTag: { id: 'dim', label: 'Dim light' },
    scenes: ['corridor', 'chapel', 'lenses', 'boss'],
  },
  starfall: {
    id: 'starfall', name: 'The Starfall Ossuary', tagline: 'Floating graves and silent cosmic machinery.',
    premise: 'A tomb-city adrift among fallen stars. Gravity shifts as the ossuary turns.',
    color: '#8e7cff', accent: '#ffd36e',
    meter: { name: 'Gravity', max: 3, icon: '🌌', text: 'Every few steps gravity turns, rotating your directions. Low gravity grants +1 reroll in fights. Anchor shrines stabilise it.' },
    rooms: {
      corridor: ['Floating Causeway', 'Bone Orbit', 'Meteor Crypt', 'Silent Engine', 'Star-Lit Ossuary'],
      combat: ['Gravity Well', 'Comet Grave', 'Orrery Hall'],
      elite: ['The Judgement Steps', 'Warden\'s Orbit'],
      treasure: ['Meteor Vault', 'Astral Reliquary'],
      peddler: ['Star-Pilgrim\'s Camp'], shrine: ['Altar of Fate'], event: ['Weighing Scales', 'Sleeping Star', 'Astronomer\'s Ghost'],
      camp: ['Anchor Shrine'], boss: ['The End of Ages'], key: ['Star-Key Plinth'], entrance: ['Falling Gate'], mechanism: ['Gravity Lever'],
    },
    atmosphere: ['Graves drift past like slow boats.', 'There is no sound at all.', 'Starlight pours through a hole in the world.', 'Your hair floats as gravity slips.', 'Ancient machinery turns without power.'],
    details: ['A meteor is embedded in a sarcophagus.', 'Constellations are painted on a skull.', 'A bell rings with no clapper.', 'Bones orbit a small dead star.', 'A pilgrim\'s lantern still burns.'],
    civilizations: ['the Sky-Burial Kings', 'the Star-Readers', 'the Last Astronomers'],
    factions: ['grave sentinels', 'void motes', 'comet cultists', 'astral leeches'],
    anomalies: ['time leaks through the cracks', 'the stars are falling inward', 'the dead are being weighed'],
    objectives: ['stop the Epoch Devourer', 'return the fallen star', 'witness the final judgement'],
    hooks: ['a warlock\'s patron whispers of this place', 'the Keep\'s founder is buried here'],
    tag: { id: 'drift', chance: 0.35, label: 'Weightless' },
    resetTag: { id: 'anchor', label: 'Anchor shrine' },
    scenes: ['corridor', 'graves', 'orrery', 'boss'],
  },
};

export const BIOME_ORDER: BiomeId[] = ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'];
