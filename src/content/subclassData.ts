/**
 * Subclass mechanics, one entry per subclass (words: game.json → subclasses).
 * See subclasses.ts for the format: `mods` fold into derive() like gear,
 * `immune` blocks conditions, `power` is a generic combat active.
 */
import type { SubclassSpec } from './subclasses.ts';

export const SUBCLASS_DATA: SubclassSpec[] = [
  {
    id: 'berserker',
    classId: 'barbarian',
    source: 'PHB',
    srd: true,
    resources: [{ id: 'intimidate', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [{ id: 'frenzy', impl: 'exact' }],
      6: [{ id: 'mindlessRage', impl: 'exact' }],
      10: [{ id: 'retaliation', impl: 'adapted' }],
      14: [{ id: 'intimidatingPresence', impl: 'adapted' }],
    },
  },
  {
    id: 'ancestralGuardian',
    classId: 'barbarian',
    source: 'XGE',
    resources: [{ id: 'ancestors', max: 'pb', recharge: 'long' }, { id: 'spiritShield', max: 'pb', recharge: 'long', from: 6 }],
    levels: {
      3: [
        {
          id: 'ancestralProtectors',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'ancestors', cond: { id: 'shielded', rounds: 2, value: 2 } },
        },
      ],
      6: [{ id: 'spiritShield', impl: 'adapted', power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'spiritShield', tempHp: 0.5 } }],
      10: [{ id: 'consultTheSpirits', impl: 'narrative', mods: { tricks: 1 } }],
      14: [{ id: 'vengefulAncestors', impl: 'adapted', mods: { thorns: 1, thornsType: 'force' } }],
    },
  },
  {
    id: 'battlerager',
    classId: 'barbarian',
    dice: 'steel',
    source: 'SCAG',
    levels: {
      3: [{ id: 'battleragerArmor', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'piercing' }], thorns: 0.5, thornsType: 'piercing' } }],
      6: [{ id: 'recklessAbandon', impl: 'adapted', mods: { regen: 0.02 } }],
      10: [{ id: 'battleragerCharge', impl: 'adapted', mods: { init: 3 } }],
      14: [{ id: 'spikedRetribution', impl: 'adapted', mods: { thorns: 0.5, thornsType: 'piercing' } }],
    },
  },
  {
    id: 'beast',
    classId: 'barbarian',
    source: 'TCE',
    resources: [{ id: 'fury', max: 'pb', recharge: 'long', from: 10 }, { id: 'hunt', max: 'con', recharge: 'long', from: 14 }],
    levels: {
      3: [{ id: 'formOfTheBeast', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'piercing' }], lifesteal: 0.05 } }],
      6: [{ id: 'bestialSoul', impl: 'adapted', mods: { init: 2, skillProf: ['athletics'] } }],
      10: [
        {
          id: 'infectiousFury',
          impl: 'adapted',
          power: {
            kind: 'strike',
            cost: 'action',
            target: 'enemy',
            resource: 'fury',
            dice: '1d12',
            dmg: 'psychic',
            save: 'wis',
            cond: { id: 'charmed', rounds: 1 },
          },
        },
      ],
      14: [
        {
          id: 'callTheHunt',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'hunt', cond: { id: 'empowered', rounds: 10 } },
        },
      ],
    },
  },
  {
    id: 'giant',
    classId: 'barbarian',
    dice: 'ember',
    source: 'BGG',
    resources: [{ id: 'impel', max: 'pb', recharge: 'long', from: 10 }],
    levels: {
      3: [{ id: 'giantsHavoc', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'thunder' }], skillProf: ['athletics'] } }],
      6: [{ id: 'elementalCleaver', impl: 'adapted', mods: { onHit: [{ dice: '1d6', type: 'fire' }] } }],
      10: [
        {
          id: 'mightyImpel',
          impl: 'adapted',
          power: {
            kind: 'blast',
            cost: 'action',
            target: 'enemy',
            resource: 'impel',
            dice: '2d6',
            dmg: 'bludgeoning',
            flat: 'str',
            save: 'str',
            cond: { id: 'prone', rounds: 1 },
          },
        },
      ],
      14: [{ id: 'demiurgicColossus', impl: 'adapted', mods: { onHit: [{ dice: '1d6', type: 'fire' }], hpPct: 0.1 } }],
    },
  },
  {
    id: 'juggernaut',
    classId: 'barbarian',
    source: 'EGW',
    levels: {
      3: [{ id: 'thunderousBlows', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'thunder' }], spill: true } }],
      6: [{ id: 'spiritOfTheMountain', impl: 'adapted', immune: ['prone', 'restrained'] }],
      10: [{ id: 'demolishingMight', impl: 'adapted', mods: { bossDmgPct: 0.15 } }],
      14: [{ id: 'unstoppable', impl: 'adapted', immune: ['frightened', 'stunned', 'slowed'] }],
    },
  },
  {
    id: 'stormHerald',
    classId: 'barbarian',
    dice: 'storm',
    source: 'XGE',
    resources: [{ id: 'stormAura', max: 'pb', recharge: 'short' }],
    levels: {
      3: [
        {
          id: 'stormAura',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'stormAura', dice: '2d6', dmg: 'lightning', save: 'dex' },
        },
      ],
      6: [{ id: 'stormSoul', impl: 'exact', mods: { resist: ['lightning', 'cold'] } }],
      10: [{ id: 'shieldingStorm', impl: 'adapted', mods: { resist: ['fire', 'thunder'], saves: 1 } }],
      14: [{ id: 'ragingStorm', impl: 'adapted', mods: { thorns: 1, thornsType: 'lightning' } }],
    },
  },
  {
    id: 'totemWarrior',
    classId: 'barbarian',
    dice: 'verdant',
    source: 'PHB',
    levels: {
      3: [{ id: 'totemSpirit', impl: 'adapted', mods: { resist: ['cold', 'fire', 'lightning', 'poison'] } }],
      6: [{ id: 'aspectOfTheBeast', impl: 'adapted', mods: { init: 2, skillProf: ['perception'] } }],
      10: [{ id: 'spiritWalker', impl: 'narrative', mods: { tricks: 1 } }],
      14: [{ id: 'totemicAttunement', impl: 'adapted', mods: { hand: { hands: ['twoPair', 'fullHouse'], mult: 3 } } }],
    },
  },
  {
    id: 'zealot',
    classId: 'barbarian',
    source: 'XGE',
    resources: [{ id: 'zealous', max: 1, recharge: 'long', from: 10 }],
    levels: {
      3: [{ id: 'divineFury', impl: 'adapted', mods: { onHit: [{ dice: '1d6', type: 'radiant' }], healTakenPct: 0.2 } }],
      6: [{ id: 'fanaticalFocus', impl: 'adapted', mods: { saves: 1 } }],
      10: [
        {
          id: 'zealousPresence',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'zealous', cond: { id: 'blessed', rounds: 3 } },
        },
      ],
      14: [{ id: 'rageBeyondDeath', impl: 'adapted', mods: { deathWard: true } }],
    },
  },
  {
    id: 'wildMagic',
    classId: 'barbarian',
    source: 'TCE',
    resources: [{ id: 'bolster', max: 'pb', recharge: 'long', from: 6 }],
    levels: {
      3: [{ id: 'wildSurge', impl: 'adapted', mods: { openingWild: 1 } }],
      6: [
        {
          id: 'bolsteringMagic',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'bolster', cond: { id: 'blessed', rounds: 10 } },
        },
      ],
      10: [{ id: 'unstableBacklash', impl: 'adapted', mods: { rerolls: 1 } }],
      14: [{ id: 'controlledSurge', impl: 'adapted', mods: { openingWild: 1, hand: { hands: ['five'], xmult: 1.5 } } }],
    },
  },
  {
    id: 'lore',
    classId: 'bard',
    source: 'PHB',
    srd: true,
    levels: {
      3: [{ id: 'bonusProficiencies', impl: 'exact' }, { id: 'cuttingWords', impl: 'adapted' }],
      6: [{ id: 'magicalDiscoveries', impl: 'adapted' }],
      14: [{ id: 'peerlessSkill', impl: 'adapted' }],
    },
  },
  {
    id: 'creation',
    classId: 'bard',
    source: 'TCE',
    resources: [{ id: 'animate', max: 'pb', recharge: 'long', from: 6 }],
    levels: {
      3: [
        { id: 'noteOfPotential', impl: 'adapted', mods: { hand: { hands: ['straight'], mult: 3 } } },
        { id: 'performanceOfCreation', impl: 'narrative', mods: { tricks: 1 } },
      ],
      6: [
        {
          id: 'animatingPerformance',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'animate', dice: '1d10', dmg: 'force', flat: 'cha' },
        },
      ],
      14: [{ id: 'creativeCrescendo', impl: 'adapted', mods: { resources: { inspiration: 2 }, tricks: 1 } }],
    },
  },
  {
    id: 'eloquence',
    classId: 'bard',
    source: 'TCE',
    levels: {
      3: [
        { id: 'silverTongue', impl: 'adapted', mods: { skillProf: ['deception', 'persuasion'], skillBonus: { deception: 3, persuasion: 3 } } },
        {
          id: 'unsettlingWords',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'inspiration', cond: { id: 'baned', rounds: 3 } },
        },
      ],
      6: [{ id: 'unfailingInspiration', impl: 'adapted', mods: { resources: { inspiration: 1 } } }],
      14: [{ id: 'infectiousInspiration', impl: 'adapted', mods: { resources: { inspiration: 2 }, hand: { hands: ['pair', 'twoPair'], mult: 2 } } }],
    },
  },
  {
    id: 'glamour',
    classId: 'bard',
    source: 'XGE',
    resources: [{ id: 'majesty', max: 'pb', recharge: 'long', from: 6 }],
    levels: {
      3: [
        { id: 'mantleOfInspiration', impl: 'adapted', power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'inspiration', tempHp: 0.5 } },
        { id: 'enthrallingPerformance', impl: 'narrative', mods: { skillProf: ['performance', 'persuasion'] } },
      ],
      6: [
        {
          id: 'mantleOfMajesty',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'majesty', save: 'wis', cond: { id: 'charmed', rounds: 1 } },
        },
      ],
      14: [{ id: 'unbreakableMajesty', impl: 'adapted', mods: { firstHitImmune: true, saves: 1 } }],
    },
  },
  {
    id: 'spirits',
    classId: 'bard',
    source: 'VRGR',
    resources: [{ id: 'tales', max: 'pb', recharge: 'short' }],
    levels: {
      3: [
        { id: 'spiritualFocus', impl: 'adapted', mods: { spellDmg: 2, healPct: 0.1 } },
        {
          id: 'talesFromBeyond',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'enemy', resource: 'tales', dice: '2d6', dmg: 'psychic', flat: 'cha' },
        },
      ],
      6: [{ id: 'spiritSession', impl: 'narrative', mods: { skillProf: ['history', 'religion'], tricks: 1 } }],
      14: [{ id: 'mysticalConnection', impl: 'adapted', mods: { rerolls: 1 } }],
    },
  },
  {
    id: 'swords',
    classId: 'bard',
    dice: 'steel',
    source: 'XGE',
    levels: {
      3: [
        { id: 'swordsTraining', impl: 'adapted', mods: { martialWeapons: true, armorProf: ['medium'] } },
        {
          id: 'bladeFlourish',
          impl: 'adapted',
          power: { kind: 'strike', cost: 'action', target: 'enemy', resource: 'inspiration', dice: '1d8', cond: { id: 'weakened', rounds: 1 } },
        },
      ],
      6: [{ id: 'extraAttack', impl: 'exact' }],
      14: [{ id: 'mastersFlourish', impl: 'adapted', mods: { resources: { inspiration: 3 }, critRange: 1 } }],
    },
  },
  {
    id: 'valor',
    classId: 'bard',
    source: 'PHB',
    levels: {
      3: [
        { id: 'valorTraining', impl: 'adapted', mods: { martialWeapons: true, armorProf: ['medium', 'shield'] } },
        {
          id: 'combatInspiration',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'inspiration', cond: { id: 'empowered', rounds: 3 } },
        },
      ],
      6: [{ id: 'extraAttack', impl: 'exact' }],
      14: [{ id: 'battleMagic', impl: 'adapted', mods: { dmgPct: 0.1 } }],
    },
  },
  {
    id: 'whispers',
    classId: 'bard',
    source: 'XGE',
    resources: [{ id: 'shadowLore', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [
        {
          id: 'psychicBlades',
          impl: 'adapted',
          power: { kind: 'strike', cost: 'action', target: 'enemy', resource: 'inspiration', dice: '2d6', dmg: 'psychic' },
        },
        { id: 'wordsOfTerror', impl: 'narrative', mods: { skillProf: ['intimidation'] } },
      ],
      6: [{ id: 'mantleOfWhispers', impl: 'adapted', mods: { openingHidden: true } }],
      14: [
        {
          id: 'shadowLore',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'shadowLore', save: 'wis', cond: { id: 'charmed', rounds: 2 } },
        },
      ],
    },
  },
  {
    id: 'life',
    classId: 'cleric',
    source: 'PHB',
    srd: true,
    levels: {
      3: [{ id: 'discipleOfLife', impl: 'exact' }, { id: 'preserveLife', impl: 'adapted' }],
      6: [{ id: 'blessedHealer', impl: 'exact' }],
      17: [{ id: 'supremeHealing', impl: 'exact' }],
    },
  },
  {
    id: 'arcana',
    classId: 'cleric',
    dice: 'arcane',
    source: 'SCAG',
    levels: {
      3: [
        { id: 'arcaneInitiate', impl: 'adapted', mods: { skillProf: ['arcana'], spellDmg: 1 } },
        {
          id: 'arcaneAbjuration',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'channel', save: 'cha', cond: { id: 'banished', rounds: 1 } },
        },
      ],
      6: [{ id: 'spellBreaker', impl: 'adapted', mods: { healPct: 0.1, saves: 1 } }],
      17: [{ id: 'arcaneMastery', impl: 'adapted', mods: { bonusSlots: { 6: 1, 8: 1 } } }],
    },
  },
  {
    id: 'blood',
    classId: 'cleric',
    dice: 'blood',
    source: 'EGW',
    levels: {
      3: [
        { id: 'bloodlettingAura', impl: 'adapted', mods: { martialWeapons: true, onHit: [{ dice: '1d4', type: 'necrotic' }] } },
        {
          id: 'crimsonBond',
          impl: 'adapted',
          power: {
            kind: 'debuff',
            cost: 'action',
            target: 'enemy',
            resource: 'channel',
            save: 'con',
            cond: { id: 'noHeal', rounds: 2 },
            dice: '2d6',
            dmg: 'necrotic',
          },
        },
      ],
      6: [{ id: 'sanguineRecall', impl: 'adapted', mods: { bonusSlots: { 1: 1, 2: 1 } } }],
      17: [{ id: 'vascularCorruptionAura', impl: 'adapted', mods: { thorns: 1, thornsType: 'necrotic' } }],
    },
  },
  {
    id: 'death',
    classId: 'cleric',
    dice: 'shadow',
    source: 'DMG',
    levels: {
      3: [
        { id: 'reaper', impl: 'adapted', mods: { martialWeapons: true, spellDmg: 2 } },
        {
          id: 'touchOfDeath',
          impl: 'adapted',
          power: { kind: 'strike', cost: 'action', target: 'enemy', resource: 'channel', dice: '1d10', dmg: 'necrotic', flat: 'level' },
        },
      ],
      6: [{ id: 'inescapableDestruction', impl: 'adapted', mods: { spellDmg: 2 } }],
      17: [{ id: 'improvedReaper', impl: 'adapted', mods: { dmgPct: 0.08, spellDmg: 3 } }],
    },
  },
  {
    id: 'forge',
    classId: 'cleric',
    dice: 'ember',
    source: 'XGE',
    levels: {
      3: [
        { id: 'blessingOfTheForge', impl: 'adapted', mods: { ac: 1, weaponPlus: 1, armorProf: ['heavy'] } },
        { id: 'artisansBlessing', impl: 'narrative', mods: { skillProf: ['sleightOfHand'] } },
      ],
      6: [{ id: 'soulOfTheForge', impl: 'adapted', mods: { resist: ['fire'], ac: 1 } }],
      17: [{ id: 'saintOfForgeAndFire', impl: 'adapted', mods: { hpPct: 0.1, ac: 1 } }],
    },
  },
  {
    id: 'grave',
    classId: 'cleric',
    source: 'XGE',
    resources: [{ id: 'sentinel', max: 'wis', recharge: 'long', from: 6 }],
    levels: {
      3: [
        { id: 'circleOfMortality', impl: 'adapted', mods: { healPct: 0.2 } },
        {
          id: 'pathToTheGrave',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'channel', cond: { id: 'vulnerable', rounds: 2 } },
        },
      ],
      6: [
        {
          id: 'sentinelAtDeathsDoor',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'sentinel', cond: { id: 'shielded', rounds: 1, value: 5 } },
        },
      ],
      17: [{ id: 'keeperOfSouls', impl: 'adapted', mods: { onKill: { healPct: 0.1 } } }],
    },
  },
  {
    id: 'knowledge',
    classId: 'cleric',
    source: 'PHB',
    levels: {
      3: [{ id: 'blessingsOfKnowledge', impl: 'adapted', mods: { skillProf: ['arcana', 'history'], tricks: 1 } }],
      6: [
        {
          id: 'readThoughts',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'channel', save: 'wis', cond: { id: 'charmed', rounds: 1 } },
        },
      ],
      17: [{ id: 'visionsOfThePast', impl: 'adapted', mods: { rerolls: 1, init: 2 } }],
    },
  },
  {
    id: 'light',
    classId: 'cleric',
    source: 'PHB',
    resources: [{ id: 'flare', max: 'wis', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'wardingFlare',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'flare', cond: { id: 'blurred', rounds: 1 } },
        },
        {
          id: 'radianceOfTheDawn',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'enemies', resource: 'channel', dice: '1d10', dmg: 'radiant', flat: 'level', save: 'con' },
        },
      ],
      6: [{ id: 'improvedWardingFlare', impl: 'adapted', mods: { resources: { flare: 2 } } }],
      17: [{ id: 'coronaOfLight', impl: 'adapted', mods: { spellDc: 1, spellDmg: 2 } }],
    },
  },
  {
    id: 'nature',
    classId: 'cleric',
    dice: 'verdant',
    source: 'PHB',
    levels: {
      3: [
        { id: 'acolyteOfNature', impl: 'adapted', mods: { skillProf: ['nature', 'survival'], armorProf: ['heavy'] } },
        {
          id: 'charmAnimalsAndPlants',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemies', resource: 'channel', save: 'wis', cond: { id: 'charmed', rounds: 1 } },
        },
      ],
      6: [{ id: 'dampenElements', impl: 'adapted', mods: { resist: ['cold', 'fire', 'lightning'] } }],
      17: [{ id: 'masterOfNature', impl: 'adapted', mods: { affinity: ['verdant'], hand: { hands: ['set', 'straightSet'], mult: 2 } } }],
    },
  },
  {
    id: 'order',
    classId: 'cleric',
    source: 'TCE',
    levels: {
      3: [
        { id: 'voiceOfAuthority', impl: 'adapted', mods: { armorProf: ['heavy'], skillProf: ['intimidation'] } },
        {
          id: 'ordersDemand',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemies', resource: 'channel', save: 'wis', cond: { id: 'weakened', rounds: 2 } },
        },
      ],
      6: [{ id: 'embodimentOfTheLaw', impl: 'adapted', mods: { spellDc: 1 } }],
      17: [{ id: 'ordersWrath', impl: 'adapted', mods: { onHit: [{ dice: '1d8', type: 'psychic' }] } }],
    },
  },
  {
    id: 'peace',
    classId: 'cleric',
    source: 'TCE',
    resources: [{ id: 'bond', max: 'pb', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'emboldeningBond',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'bond', cond: { id: 'blessed', rounds: 10 } },
        },
        {
          id: 'balmOfPeace',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'action', target: 'allies', resource: 'channel', dice: '1d6', flat: 'wis' },
        },
      ],
      6: [{ id: 'protectiveBond', impl: 'adapted', mods: { ac: 1, saves: 1 } }],
      17: [{ id: 'expansiveBond', impl: 'adapted', mods: { healPct: 0.15, saves: 1 } }],
    },
  },
  {
    id: 'tempest',
    classId: 'cleric',
    dice: 'storm',
    source: 'PHB',
    levels: {
      3: [
        { id: 'wrathOfTheStorm', impl: 'adapted', mods: { armorProf: ['heavy'], martialWeapons: true, thorns: 0.5, thornsType: 'lightning' } },
        {
          id: 'destructiveWrath',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'rank', resource: 'channel', dice: '2d8', dmg: 'thunder', save: 'con' },
        },
      ],
      6: [{ id: 'thunderboltStrike', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'lightning' }] } }],
      17: [{ id: 'stormborn', impl: 'adapted', mods: { resist: ['lightning', 'thunder'], init: 3 } }],
    },
  },
  {
    id: 'trickery',
    classId: 'cleric',
    source: 'PHB',
    levels: {
      3: [
        { id: 'blessingOfTheTrickster', impl: 'adapted', mods: { skillProf: ['stealth', 'deception'] } },
        {
          id: 'invokeDuplicity',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'channel', cond: { id: 'mirrorImage', rounds: 10, value: 3 } },
        },
      ],
      6: [
        {
          id: 'cloakOfShadows',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'channel', cond: { id: 'invisible', rounds: 1 } },
        },
      ],
      17: [{ id: 'improvedDuplicity', impl: 'adapted', mods: { hand: { hands: ['pair', 'twoPair'], mult: 3 } } }],
    },
  },
  {
    id: 'twilight',
    classId: 'cleric',
    source: 'TCE',
    levels: {
      3: [
        { id: 'vigilantBlessing', impl: 'adapted', mods: { armorProf: ['heavy'], martialWeapons: true, init: 3 } },
        { id: 'twilightSanctuary', impl: 'adapted', power: { kind: 'buff', cost: 'action', target: 'allies', resource: 'channel', tempHp: 0.75 } },
      ],
      6: [{ id: 'stepsOfNight', impl: 'adapted', mods: { openingHidden: true } }],
      17: [{ id: 'twilightShroud', impl: 'adapted', mods: { ac: 1, saves: 1 } }],
    },
  },
  {
    id: 'war',
    classId: 'cleric',
    dice: 'steel',
    source: 'PHB',
    resources: [{ id: 'warPriest', max: 'wis', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'warPriest',
          impl: 'adapted',
          mods: { armorProf: ['heavy'], martialWeapons: true },
          power: { kind: 'strike', cost: 'bonus', target: 'enemy', resource: 'warPriest' },
        },
        {
          id: 'guidedStrike',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'channel', cond: { id: 'sacredWeapon', rounds: 1, value: 5 } },
        },
      ],
      6: [
        {
          id: 'warGodsBlessing',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'channel', cond: { id: 'sacredWeapon', rounds: 1, value: 5 } },
        },
      ],
      17: [{ id: 'avatarOfBattle', impl: 'adapted', mods: { dmgPct: 0.1 } }],
    },
  },
  {
    id: 'land',
    classId: 'druid',
    source: 'PHB',
    srd: true,
    levels: {
      3: [{ id: 'landsAid', impl: 'adapted' }],
      6: [{ id: 'naturalRecovery', impl: 'adapted' }],
      10: [{ id: 'naturesWard', impl: 'exact' }],
      14: [{ id: 'naturesSanctuary', impl: 'adapted' }],
    },
  },
  {
    id: 'dreams',
    classId: 'druid',
    source: 'XGE',
    resources: [{ id: 'balm', max: 'pb', recharge: 'long' }, { id: 'paths', max: 'wis', recharge: 'long', from: 10 }],
    levels: {
      3: [
        {
          id: 'balmOfTheSummerCourt',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'bonus', target: 'ally', resource: 'balm', dice: '2d6', flat: 'wis' },
        },
      ],
      6: [{ id: 'hearthOfMoonlightAndShadow', impl: 'adapted', mods: { saves: 1 } }],
      10: [
        {
          id: 'hiddenPaths',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'paths', cond: { id: 'blurred', rounds: 2 } },
        },
      ],
      14: [{ id: 'walkerInDreams', impl: 'adapted', mods: { rerolls: 1 } }],
    },
  },
  {
    id: 'spores',
    classId: 'druid',
    source: 'TCE',
    resources: [{ id: 'spread', max: 'pb', recharge: 'long', from: 10 }],
    levels: {
      3: [
        { id: 'haloOfSpores', impl: 'adapted', mods: { thorns: 0.5, thornsType: 'necrotic' } },
        {
          id: 'symbioticEntity',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'wildShape', cond: { id: 'empowered', rounds: 10 }, tempHp: 1 },
        },
      ],
      6: [{ id: 'fungalInfestation', impl: 'adapted', mods: { onKill: { rerolls: 1 } } }],
      10: [
        {
          id: 'spreadingSpores',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'rank', resource: 'spread', dice: '2d4', dmg: 'necrotic', save: 'con' },
        },
      ],
      14: [{ id: 'fungalBody', impl: 'adapted', immune: ['blinded', 'frightened', 'poisoned'] }],
    },
  },
  {
    id: 'stars',
    classId: 'druid',
    dice: 'sun',
    source: 'TCE',
    levels: {
      3: [
        { id: 'starMap', impl: 'adapted', mods: { skillProf: ['arcana'], tricks: 1 } },
        {
          id: 'starryForm',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'wildShape', dice: '2d8', dmg: 'radiant', flat: 'wis' },
        },
      ],
      6: [{ id: 'cosmicOmen', impl: 'adapted', mods: { rerolls: 1 } }],
      10: [{ id: 'twinklingConstellations', impl: 'adapted', mods: { spellDmg: 2, healPct: 0.1 } }],
      14: [{ id: 'fullOfStars', impl: 'adapted', mods: { firstHitImmune: true, ac: 1 } }],
    },
  },
  {
    id: 'moon',
    classId: 'druid',
    source: 'PHB',
    levels: {
      3: [{ id: 'combatWildShape', impl: 'adapted', mods: { resources: { wildShape: 1 }, ac: 1 } }],
      6: [{ id: 'primalStrike', impl: 'adapted', mods: { onHit: [{ dice: '1d6', type: 'force' }] } }],
      10: [
        {
          id: 'elementalWildShape',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'wildShape', cond: { id: 'stoneskin', rounds: 10 }, spend: 2, tempHp: 2 },
        },
      ],
      14: [{ id: 'thousandForms', impl: 'adapted', mods: { regen: 0.03 } }],
    },
  },
  {
    id: 'shepherd',
    classId: 'druid',
    source: 'XGE',
    resources: [{ id: 'totem', max: 'pb', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'spiritTotem',
          impl: 'adapted',
          mods: { skillProf: ['animalHandling'] },
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'totem', tempHp: 0.75 },
        },
      ],
      6: [{ id: 'mightySummoner', impl: 'adapted', mods: { spellDmg: 2, hpPct: 0.05 } }],
      10: [{ id: 'guardianSpirit', impl: 'adapted', mods: { regen: 0.02 } }],
      14: [{ id: 'faithfulSummons', impl: 'adapted', mods: { deathWard: true } }],
    },
  },
  {
    id: 'wildfire',
    classId: 'druid',
    dice: 'ember',
    source: 'TCE',
    resources: [{ id: 'cauterize', max: 'pb', recharge: 'long', from: 10 }],
    levels: {
      3: [
        {
          id: 'summonWildfireSpirit',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'rank', resource: 'wildShape', dice: '2d6', dmg: 'fire', save: 'dex' },
        },
      ],
      6: [{ id: 'enhancedBond', impl: 'adapted', mods: { spellDmg: 2, healPct: 0.1 } }],
      10: [
        {
          id: 'cauterizingFlames',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'bonus', target: 'ally', resource: 'cauterize', dice: '2d10', flat: 'wis' },
        },
      ],
      14: [{ id: 'blazingRevival', impl: 'adapted', mods: { deathWard: true } }],
    },
  },
  {
    id: 'champion',
    classId: 'fighter',
    source: 'PHB',
    srd: true,
    levels: {
      3: [{ id: 'improvedCritical', impl: 'exact' }, { id: 'remarkableAthlete', impl: 'exact' }],
      7: [{ id: 'additionalFightingStyle', impl: 'exact', choice: 'fightingStyle' }],
      10: [{ id: 'heroicWarrior', impl: 'adapted' }],
      15: [{ id: 'superiorCritical', impl: 'exact' }],
      18: [{ id: 'survivor', impl: 'exact' }],
    },
  },
  {
    id: 'arcaneArcher',
    classId: 'fighter',
    dice: 'arcane',
    source: 'XGE',
    resources: [{ id: 'arcaneShot', max: 2, recharge: 'short' }],
    levels: {
      3: [
        {
          id: 'arcaneShot',
          impl: 'adapted',
          mods: { skillProf: ['arcana'] },
          power: {
            kind: 'strike',
            cost: 'action',
            target: 'enemy',
            resource: 'arcaneShot',
            dice: '2d6',
            dmg: 'force',
            save: 'str',
            cond: { id: 'slowed', rounds: 2 },
          },
        },
      ],
      7: [{ id: 'magicArrow', impl: 'adapted', mods: { resources: { arcaneShot: 1 }, weaponPlus: 1 } }],
      15: [{ id: 'everReadyShot', impl: 'adapted', mods: { resources: { arcaneShot: 2 } } }],
      18: [{ id: 'improvedShots', impl: 'adapted', mods: { onHit: [{ dice: '1d6', type: 'force' }] } }],
    },
  },
  {
    id: 'battleMaster',
    classId: 'fighter',
    source: 'PHB',
    resources: [{ id: 'superiority', max: 4, recharge: 'short' }],
    levels: {
      3: [
        {
          id: 'tripAttack',
          impl: 'adapted',
          power: { kind: 'strike', cost: 'action', target: 'enemy', resource: 'superiority', dice: '1d8', save: 'str', cond: { id: 'prone', rounds: 1 } },
        },
        {
          id: 'rally',
          impl: 'adapted',
          mods: { skillProf: ['history'] },
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'superiority', tempHp: 0.5 },
        },
      ],
      7: [{ id: 'knowYourEnemy', impl: 'adapted', mods: { resources: { superiority: 1 }, init: 2 } }],
      10: [{ id: 'improvedCombatSuperiority', impl: 'adapted', mods: { resources: { superiority: 1 }, dmgPct: 0.05 } }],
      15: [{ id: 'relentless', impl: 'adapted', mods: { resources: { superiority: 1 }, rerolls: 1 } }],
      18: [{ id: 'ultimateSuperiority', impl: 'adapted', mods: { dmgPct: 0.05 } }],
    },
  },
  {
    id: 'cavalier',
    classId: 'fighter',
    source: 'XGE',
    resources: [{ id: 'mark', max: 'pb', recharge: 'long' }, { id: 'ward', max: 'con', recharge: 'long', from: 7 }],
    levels: {
      3: [
        {
          id: 'unwaveringMark',
          impl: 'adapted',
          mods: { skillProf: ['animalHandling'] },
          power: { kind: 'strike', cost: 'action', target: 'enemy', resource: 'mark', dice: '1d8', cond: { id: 'marked', rounds: 2 } },
        },
      ],
      7: [
        {
          id: 'wardingManeuver',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'ward', cond: { id: 'shielded', rounds: 1, value: 4 } },
        },
      ],
      10: [{ id: 'holdTheLine', impl: 'adapted', mods: { thorns: 0.5, thornsType: 'piercing' } }],
      15: [{ id: 'ferociousCharger', impl: 'adapted', mods: { onHit: [{ dice: '1d6', type: 'bludgeoning' }] } }],
      18: [{ id: 'vigilantDefender', impl: 'adapted', mods: { thorns: 0.5, thornsType: 'piercing' } }],
    },
  },
  {
    id: 'echoKnight',
    classId: 'fighter',
    source: 'EGW',
    resources: [{ id: 'incarnation', max: 'con', recharge: 'long' }, { id: 'martyr', max: 1, recharge: 'short', from: 10 }],
    levels: {
      3: [{ id: 'unleashIncarnation', impl: 'adapted', power: { kind: 'strike', cost: 'bonus', target: 'enemy', resource: 'incarnation' } }],
      7: [{ id: 'echoAvatar', impl: 'narrative', mods: { tricks: 1 } }],
      10: [
        {
          id: 'shadowMartyr',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'martyr', cond: { id: 'dodging', rounds: 1 } },
        },
      ],
      15: [{ id: 'reclaimPotential', impl: 'adapted', mods: { regen: 0.02 } }],
      18: [{ id: 'legionOfOne', impl: 'adapted', mods: { resources: { incarnation: 2 }, rerolls: 1 } }],
    },
  },
  {
    id: 'eldritchKnight',
    classId: 'fighter',
    dice: 'arcane',
    source: 'PHB',
    resources: [{ id: 'arcana', max: 'pb', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'ekSpellcasting',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'enemy', resource: 'arcana', dice: '2d8', dmg: 'force', flat: 'int' },
        },
        { id: 'weaponBond', impl: 'adapted', mods: { ac: 1 } },
      ],
      7: [{ id: 'warMagic', impl: 'adapted', power: { kind: 'strike', cost: 'bonus', target: 'enemy', resource: 'arcana' } }],
      10: [{ id: 'eldritchStrike', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'force' }] } }],
      15: [{ id: 'arcaneCharge', impl: 'adapted', mods: { init: 3, resources: { arcana: 1 } } }],
      18: [{ id: 'improvedWarMagic', impl: 'adapted', mods: { dmgPct: 0.08 } }],
    },
  },
  {
    id: 'psiWarrior',
    classId: 'fighter',
    source: 'TCE',
    resources: [{ id: 'psi', max: 'pb', recharge: 'short' }],
    levels: {
      3: [
        {
          id: 'psionicStrike',
          impl: 'adapted',
          power: { kind: 'strike', cost: 'action', target: 'enemy', resource: 'psi', dice: '1d8', dmg: 'force', flat: 'int' },
        },
        {
          id: 'protectiveField',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'psi', cond: { id: 'shielded', rounds: 1, value: 3 } },
        },
      ],
      7: [
        {
          id: 'telekineticAdept',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'psi', save: 'str', cond: { id: 'prone', rounds: 1 } },
        },
      ],
      10: [{ id: 'guardedMind', impl: 'adapted', mods: { resist: ['psychic'] }, immune: ['charmed', 'frightened'] }],
      15: [
        {
          id: 'bulwarkOfForce',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'psi', cond: { id: 'shielded', rounds: 3, value: 2 }, spend: 2 },
        },
      ],
      18: [{ id: 'telekineticMaster', impl: 'adapted', mods: { resources: { psi: 2 }, dmgPct: 0.05 } }],
    },
  },
  {
    id: 'purpleDragonKnight',
    classId: 'fighter',
    source: 'SCAG',
    resources: [{ id: 'surge', max: 1, recharge: 'long', from: 10 }],
    levels: {
      3: [{ id: 'rallyingCry', impl: 'adapted', power: { kind: 'heal', cost: 'bonus', target: 'allies', resource: 'secondWind', flat: 'level' } }],
      7: [{ id: 'royalEnvoy', impl: 'adapted', mods: { skillProf: ['persuasion'], skillBonus: { persuasion: 3 } } }],
      10: [
        {
          id: 'inspiringSurge',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'surge', cond: { id: 'hasted', rounds: 2 } },
        },
      ],
      15: [{ id: 'bulwark', impl: 'adapted', mods: { resources: { indomitable: 1 }, saves: 1 } }],
    },
  },
  {
    id: 'runeKnight',
    classId: 'fighter',
    dice: 'storm',
    source: 'TCE',
    resources: [{ id: 'might', max: 'pb', recharge: 'long' }, { id: 'runicShield', max: 'pb', recharge: 'long', from: 7 }],
    levels: {
      3: [
        {
          id: 'giantsMight',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'might', cond: { id: 'empowered', rounds: 10 }, tempHp: 0.5 },
        },
        { id: 'runeCarver', impl: 'adapted', mods: { resist: ['poison'], skillProf: ['athletics'] } },
      ],
      7: [
        {
          id: 'runicShield',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'runicShield', cond: { id: 'blurred', rounds: 1 } },
        },
      ],
      10: [{ id: 'greatStature', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'thunder' }], hpPct: 0.05 } }],
      15: [{ id: 'masterOfRunes', impl: 'adapted', mods: { resources: { might: 1, runicShield: 1 } } }],
      18: [{ id: 'runicJuggernaut', impl: 'adapted', mods: { dmgPct: 0.08, hpPct: 0.05 } }],
    },
  },
  {
    id: 'samurai',
    classId: 'fighter',
    source: 'XGE',
    resources: [{ id: 'fightingSpirit', max: 3, recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'fightingSpirit',
          impl: 'adapted',
          mods: { skillProf: ['insight'] },
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'fightingSpirit', cond: { id: 'hidden', rounds: 1 }, tempHp: 0.5 },
        },
      ],
      7: [{ id: 'elegantCourtier', impl: 'adapted', mods: { skillProf: ['persuasion'], saves: 1 } }],
      10: [{ id: 'tirelessSpirit', impl: 'adapted', mods: { resources: { fightingSpirit: 1 } } }],
      15: [{ id: 'rapidStrike', impl: 'adapted', mods: { dmgPct: 0.1 } }],
      18: [{ id: 'strengthBeforeDeath', impl: 'adapted', mods: { deathWard: true } }],
    },
  },
  {
    id: 'openHand',
    classId: 'monk',
    source: 'PHB',
    srd: true,
    resources: [{ id: 'wholeness', max: 'wis', recharge: 'long', from: 6 }],
    levels: {
      3: [{ id: 'openHandTechnique', impl: 'adapted' }],
      6: [{ id: 'wholenessOfBody', impl: 'exact' }],
      11: [{ id: 'fleetStep', impl: 'adapted' }],
      17: [{ id: 'quiveringPalm', impl: 'adapted' }],
    },
  },
  {
    id: 'mercy',
    classId: 'monk',
    source: 'TCE',
    resources: [{ id: 'ultimateMercy', max: 1, recharge: 'long', from: 17 }],
    levels: {
      3: [
        {
          id: 'handOfHealing',
          impl: 'adapted',
          mods: { skillProf: ['insight', 'medicine'] },
          power: { kind: 'heal', cost: 'bonus', target: 'ally', resource: 'focus', dice: '1d6', flat: 'wis' },
        },
        {
          id: 'handOfHarm',
          impl: 'adapted',
          power: { kind: 'strike', cost: 'action', target: 'enemy', resource: 'focus', dice: '1d6', dmg: 'necrotic', flat: 'wis' },
        },
      ],
      6: [{ id: 'physiciansTouch', impl: 'adapted', mods: { healPct: 0.15 } }],
      11: [{ id: 'flurryOfHealingAndHarm', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'necrotic' }], healPct: 0.1 } }],
      17: [
        {
          id: 'handOfUltimateMercy',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'action', target: 'ally', resource: 'ultimateMercy', dice: '2d10', flat: 'wis' },
        },
      ],
    },
  },
  {
    id: 'shadow',
    classId: 'monk',
    dice: 'shadow',
    source: 'PHB',
    levels: {
      3: [
        {
          id: 'shadowArts',
          impl: 'adapted',
          mods: { skillProf: ['stealth'] },
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'focus', cond: { id: 'hidden', rounds: 1 } },
        },
      ],
      6: [{ id: 'shadowStep', impl: 'adapted', mods: { openingHidden: true } }],
      11: [
        {
          id: 'cloakOfShadowsMonk',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'focus', cond: { id: 'invisible', rounds: 1 }, spend: 2 },
        },
      ],
      17: [{ id: 'opportunist', impl: 'adapted', mods: { dmgPct: 0.08 } }],
    },
  },
  {
    id: 'ascendantDragon',
    classId: 'monk',
    source: 'FTD',
    resources: [{ id: 'dragonBreath', max: 'pb', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'breathOfTheDragon',
          impl: 'adapted',
          mods: { skillProf: ['intimidation'] },
          power: { kind: 'blast', cost: 'action', target: 'rank', resource: 'dragonBreath', dice: '2d6', dmg: 'fire', save: 'dex' },
        },
      ],
      6: [{ id: 'wingsUnfurled', impl: 'adapted', mods: { init: 2, resist: ['fire'] } }],
      11: [
        {
          id: 'aspectOfTheWyrm',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemies', resource: 'focus', save: 'wis', cond: { id: 'frightened', rounds: 2 }, spend: 3 },
        },
      ],
      17: [{ id: 'ascendantAspect', impl: 'adapted', mods: { resources: { dragonBreath: 2 }, onHit: [{ dice: '1d6', type: 'fire' }] } }],
    },
  },
  {
    id: 'astralSelf',
    classId: 'monk',
    source: 'TCE',
    levels: {
      3: [
        {
          id: 'armsOfTheAstralSelf',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'focus', cond: { id: 'empowered', rounds: 10 } },
        },
      ],
      6: [{ id: 'visageOfTheAstralSelf', impl: 'adapted', mods: { skillProf: ['insight', 'intimidation'] } }],
      11: [{ id: 'bodyOfTheAstralSelf', impl: 'adapted', mods: { resist: ['fire', 'cold', 'lightning'], onHit: [{ dice: '1d6', type: 'force' }] } }],
      17: [{ id: 'awakenedAstralSelf', impl: 'adapted', mods: { ac: 2, minAttacks: 3 } }],
    },
  },
  {
    id: 'cobaltSoul',
    classId: 'monk',
    source: 'EGW',
    levels: {
      3: [
        {
          id: 'extractAspects',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'focus', cond: { id: 'faerieFire', rounds: 2 } },
        },
      ],
      6: [{ id: 'mysticalErudition', impl: 'adapted', mods: { skillProf: ['arcana', 'investigation', 'religion'], tricks: 1 } }],
      11: [{ id: 'mindOfMercury', impl: 'adapted', mods: { rerolls: 1 } }],
      17: [
        {
          id: 'debilitatingBarrage',
          impl: 'adapted',
          power: { kind: 'strike', cost: 'action', target: 'enemy', resource: 'focus', dice: '2d8', spend: 3, cond: { id: 'vulnerable', rounds: 2 } },
        },
      ],
    },
  },
  {
    id: 'drunkenMaster',
    classId: 'monk',
    source: 'XGE',
    levels: {
      3: [{ id: 'drunkenTechnique', impl: 'adapted', mods: { ac: 1, skillProf: ['performance'] } }],
      6: [{ id: 'tipsySway', impl: 'adapted', mods: { thorns: 0.5, thornsType: 'bludgeoning' } }],
      11: [{ id: 'drunkardsLuck', impl: 'adapted', mods: { rerolls: 1 } }],
      17: [{ id: 'intoxicatedFrenzy', impl: 'adapted', mods: { dmgPct: 0.1 } }],
    },
  },
  {
    id: 'fourElements',
    classId: 'monk',
    dice: 'verdant',
    source: 'PHB',
    levels: {
      3: [
        {
          id: 'fangsOfTheFireSnake',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'rank', resource: 'focus', dice: '2d6', dmg: 'thunder', save: 'con', spend: 2 },
        },
      ],
      6: [
        {
          id: 'waterWhip',
          impl: 'adapted',
          power: {
            kind: 'debuff',
            cost: 'bonus',
            target: 'enemy',
            resource: 'focus',
            save: 'dex',
            cond: { id: 'prone', rounds: 1 },
            spend: 2,
            dice: '2d6',
            dmg: 'bludgeoning',
          },
        },
      ],
      11: [
        {
          id: 'riverOfHungryFlame',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'rank', resource: 'focus', dice: '3d6', dmg: 'fire', save: 'dex', spend: 3 },
        },
      ],
      17: [
        {
          id: 'breathOfWinter',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'enemies', resource: 'focus', dice: '3d6', dmg: 'cold', save: 'con', spend: 4 },
        },
      ],
    },
  },
  {
    id: 'kensei',
    classId: 'monk',
    dice: 'steel',
    source: 'XGE',
    levels: {
      3: [{ id: 'pathOfTheKensei', impl: 'adapted', mods: { martialWeapons: true, ac: 1, onHit: [{ dice: '1d4', type: 'piercing' }] } }],
      6: [{ id: 'oneWithTheBlade', impl: 'adapted', mods: { weaponPlus: 1 } }],
      11: [
        {
          id: 'sharpenTheBlade',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'focus', cond: { id: 'sacredWeapon', rounds: 10, value: 3 }, spend: 3 },
        },
      ],
      17: [{ id: 'unerringAccuracy', impl: 'adapted', mods: { critRange: 1, rerolls: 1 } }],
    },
  },
  {
    id: 'longDeath',
    classId: 'monk',
    dice: 'blood',
    source: 'SCAG',
    resources: [{ id: 'reaping', max: 'pb', recharge: 'long', from: 6 }],
    levels: {
      3: [{ id: 'touchOfDeathMonk', impl: 'adapted', mods: { onKill: { healPct: 0.08 } } }],
      6: [
        {
          id: 'hourOfReaping',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemies', resource: 'reaping', save: 'wis', cond: { id: 'frightened', rounds: 2 } },
        },
      ],
      11: [{ id: 'masteryOfDeath', impl: 'adapted', mods: { deathWard: true } }],
      17: [
        {
          id: 'touchOfTheLongDeath',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'enemy', resource: 'focus', dice: '2d10', dmg: 'necrotic', save: 'con', spend: 4, melee: true },
        },
      ],
    },
  },
  {
    id: 'sunSoul',
    classId: 'monk',
    dice: 'sun',
    source: 'XGE',
    levels: {
      3: [
        {
          id: 'radiantSunBolt',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'focus', dice: '1d8', dmg: 'radiant', flat: 'dex' },
        },
      ],
      6: [
        {
          id: 'searingArcStrike',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'rank', resource: 'focus', dice: '2d6', dmg: 'fire', save: 'dex', spend: 2 },
        },
      ],
      11: [
        {
          id: 'searingSunburst',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'enemies', resource: 'focus', dice: '2d6', dmg: 'radiant', save: 'con', spend: 2 },
        },
      ],
      17: [{ id: 'sunShield', impl: 'adapted', mods: { thorns: 1, thornsType: 'radiant' } }],
    },
  },
  {
    id: 'devotion',
    classId: 'paladin',
    source: 'PHB',
    srd: true,
    levels: {
      3: [{ id: 'sacredWeapon', impl: 'exact' }],
      7: [{ id: 'auraOfDevotion', impl: 'adapted' }],
      15: [{ id: 'smiteOfProtection', impl: 'adapted' }],
      20: [{ id: 'holyNimbus', impl: 'adapted' }],
    },
  },
  {
    id: 'conquest',
    classId: 'paladin',
    dice: 'blood',
    source: 'XGE',
    resources: [{ id: 'conqueror', max: 1, recharge: 'long', from: 20 }],
    levels: {
      3: [
        {
          id: 'conqueringPresence',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemies', resource: 'channel', save: 'wis', cond: { id: 'frightened', rounds: 2 } },
        },
      ],
      7: [{ id: 'auraOfConquest', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'psychic' }] } }],
      15: [{ id: 'scornfulRebuke', impl: 'adapted', mods: { thorns: 1, thornsType: 'psychic' } }],
      20: [
        {
          id: 'invincibleConqueror',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'conqueror', cond: { id: 'hasted', rounds: 10 } },
        },
      ],
    },
  },
  {
    id: 'glory',
    classId: 'paladin',
    source: 'TCE',
    resources: [{ id: 'gloriousDefense', max: 'cha', recharge: 'long', from: 15 }],
    levels: {
      3: [
        {
          id: 'inspiringSmite',
          impl: 'adapted',
          mods: { skillProf: ['athletics'] },
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'channel', tempHp: 0.5 },
        },
      ],
      7: [{ id: 'auraOfAlacrity', impl: 'adapted', mods: { init: 3 } }],
      15: [
        {
          id: 'gloriousDefense',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'gloriousDefense', cond: { id: 'shielded', rounds: 1, value: 4 } },
        },
      ],
      20: [{ id: 'livingLegend', impl: 'adapted', mods: { rerolls: 1, dmgPct: 0.08 } }],
    },
  },
  {
    id: 'redemption',
    classId: 'paladin',
    source: 'XGE',
    levels: {
      3: [
        {
          id: 'rebukeTheViolent',
          impl: 'adapted',
          mods: { skillProf: ['persuasion'] },
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'channel', dice: '2d8', dmg: 'radiant', flat: 'cha', save: 'wis' },
        },
      ],
      7: [{ id: 'auraOfTheGuardian', impl: 'adapted', mods: { hpPct: 0.1 } }],
      15: [{ id: 'protectiveSpirit', impl: 'adapted', mods: { regen: 0.02 } }],
      20: [{ id: 'emissaryOfRedemption', impl: 'adapted', mods: { thorns: 1.5, thornsType: 'radiant', saves: 1 } }],
    },
  },
  {
    id: 'ancients',
    classId: 'paladin',
    dice: 'verdant',
    source: 'PHB',
    levels: {
      3: [
        {
          id: 'naturesWrath',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'channel', save: 'str', cond: { id: 'restrained', rounds: 2 } },
        },
      ],
      7: [{ id: 'auraOfWarding', impl: 'adapted', mods: { resist: ['fire', 'cold', 'lightning', 'necrotic'] } }],
      15: [{ id: 'undyingSentinel', impl: 'adapted', mods: { deathWard: true } }],
      20: [{ id: 'elderChampion', impl: 'adapted', mods: { regen: 0.03, spellDc: 1 } }],
    },
  },
  {
    id: 'crown',
    classId: 'paladin',
    source: 'SCAG',
    levels: {
      3: [
        {
          id: 'championChallenge',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemies', resource: 'channel', save: 'wis', cond: { id: 'weakened', rounds: 2 } },
        },
        {
          id: 'turnTheTide',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'bonus', target: 'allies', resource: 'channel', dice: '1d6', flat: 'cha' },
        },
      ],
      7: [{ id: 'divineAllegiance', impl: 'adapted', mods: { hpPct: 0.1 } }],
      15: [{ id: 'unyieldingSpirit', impl: 'adapted', immune: ['paralyzed', 'stunned'], mods: { saves: 1 } }],
      20: [{ id: 'exaltedChampion', impl: 'adapted', mods: { ac: 1, saves: 1, hpPct: 0.05 } }],
    },
  },
  {
    id: 'watchers',
    classId: 'paladin',
    source: 'TCE',
    resources: [{ id: 'bulwark', max: 1, recharge: 'long', from: 20 }],
    levels: {
      3: [
        {
          id: 'watchersWill',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'channel', cond: { id: 'blessed', rounds: 3 } },
        },
        {
          id: 'abjureTheExtraplanar',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemies', resource: 'channel', save: 'wis', cond: { id: 'frightened', rounds: 2 } },
        },
      ],
      7: [{ id: 'auraOfTheSentinel', impl: 'adapted', mods: { init: 4 } }],
      15: [{ id: 'vigilantRebuke', impl: 'adapted', mods: { thorns: 1, thornsType: 'force' } }],
      20: [
        {
          id: 'mortalBulwark',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'bulwark', cond: { id: 'sacredWeapon', rounds: 10, value: 5 } },
        },
      ],
    },
  },
  {
    id: 'vengeance',
    classId: 'paladin',
    source: 'PHB',
    resources: [{ id: 'angel', max: 1, recharge: 'long', from: 20 }],
    levels: {
      3: [
        {
          id: 'vowOfEnmity',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'channel', cond: { id: 'marked', rounds: 10 } },
        },
      ],
      7: [{ id: 'relentlessAvenger', impl: 'adapted', mods: { init: 2, onHit: [{ dice: '1d4', type: 'slashing' }] } }],
      15: [{ id: 'soulOfVengeance', impl: 'adapted', mods: { thorns: 1, thornsType: 'slashing' } }],
      20: [
        {
          id: 'avengingAngel',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemies', resource: 'angel', save: 'wis', cond: { id: 'frightened', rounds: 3 } },
        },
      ],
    },
  },
  {
    id: 'oathbreaker',
    classId: 'paladin',
    dice: 'blood',
    source: 'DMG',
    resources: [{ id: 'dreadLord', max: 1, recharge: 'long', from: 20 }],
    levels: {
      3: [
        {
          id: 'dreadfulAspect',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemies', resource: 'channel', save: 'wis', cond: { id: 'frightened', rounds: 2 } },
        },
      ],
      7: [{ id: 'auraOfHate', impl: 'adapted', mods: { onHit: [{ dice: '1d6', type: 'necrotic' }] } }],
      15: [{ id: 'supernaturalResistance', impl: 'adapted', mods: { resist: ['necrotic', 'poison'], ac: 1 } }],
      20: [
        {
          id: 'dreadLord',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'dreadLord', cond: { id: 'blurred', rounds: 10 } },
        },
      ],
    },
  },
  {
    id: 'hunter',
    classId: 'ranger',
    source: 'PHB',
    srd: true,
    levels: {
      3: [{ id: 'huntersPrey', impl: 'exact' }, { id: 'huntersLore', impl: 'adapted' }],
      7: [{ id: 'defensiveTactics', impl: 'adapted' }],
      11: [{ id: 'volley', impl: 'adapted' }],
      15: [{ id: 'superiorHuntersDefense', impl: 'adapted' }],
    },
  },
  {
    id: 'beastMaster',
    classId: 'ranger',
    source: 'PHB',
    resources: [{ id: 'companion', max: 'pb', recharge: 'short' }],
    levels: {
      3: [
        {
          id: 'primalCompanion',
          impl: 'adapted',
          mods: { onHit: [{ dice: '1d4', type: 'piercing' }] },
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'companion', dice: '1d8', dmg: 'piercing', flat: 'wis' },
        },
      ],
      7: [{ id: 'exceptionalTraining', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'force' }] } }],
      11: [{ id: 'bestialFury', impl: 'adapted', mods: { resources: { companion: 2 }, dmgPct: 0.05 } }],
      15: [{ id: 'shareSpells', impl: 'adapted', mods: { healPct: 0.1, saves: 1 } }],
    },
  },
  {
    id: 'drakewarden',
    classId: 'ranger',
    dice: 'ember',
    source: 'FTD',
    resources: [{ id: 'drake', max: 'pb', recharge: 'long' }, { id: 'drakeBreath', max: 1, recharge: 'short', from: 11 }],
    levels: {
      3: [
        {
          id: 'drakeCompanion',
          impl: 'adapted',
          mods: { skillProf: ['intimidation'] },
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'drake', dice: '1d6', dmg: 'fire', flat: 'wis' },
        },
      ],
      7: [{ id: 'bondOfFangAndScale', impl: 'adapted', mods: { resist: ['fire'], onHit: [{ dice: '1d4', type: 'fire' }] } }],
      11: [
        {
          id: 'drakesBreath',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'rank', resource: 'drakeBreath', dice: '3d6', dmg: 'fire', save: 'dex' },
        },
      ],
      15: [{ id: 'perfectedBond', impl: 'adapted', mods: { resist: ['cold'], ac: 1 } }],
    },
  },
  {
    id: 'feyWanderer',
    classId: 'ranger',
    source: 'TCE',
    resources: [{ id: 'twist', max: 'wis', recharge: 'long', from: 7 }, { id: 'reinforcements', max: 1, recharge: 'long', from: 11 }],
    levels: {
      3: [{ id: 'dreadfulStrikes', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'psychic' }], skillProf: ['persuasion'] } }],
      7: [
        {
          id: 'beguilingTwist',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'twist', save: 'wis', cond: { id: 'charmed', rounds: 1 } },
        },
      ],
      11: [
        {
          id: 'feyReinforcements',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'reinforcements', cond: { id: 'empowered', rounds: 3 } },
        },
      ],
      15: [
        {
          id: 'mistyWanderer',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'twist', cond: { id: 'blurred', rounds: 2 } },
        },
      ],
    },
  },
  {
    id: 'gloomStalker',
    classId: 'ranger',
    dice: 'shadow',
    source: 'XGE',
    levels: {
      3: [{ id: 'dreadAmbusher', impl: 'adapted', mods: { init: 3, openingHidden: true } }],
      7: [{ id: 'ironMind', impl: 'adapted', mods: { saves: 1 } }],
      11: [{ id: 'stalkersFlurry', impl: 'adapted', mods: { rerolls: 1, dmgPct: 0.05 } }],
      15: [{ id: 'shadowyDodge', impl: 'adapted', mods: { firstHitImmune: true } }],
    },
  },
  {
    id: 'horizonWalker',
    classId: 'ranger',
    dice: 'storm',
    source: 'XGE',
    resources: [{ id: 'etherealStep', max: 1, recharge: 'short', from: 7 }],
    levels: {
      3: [{ id: 'planarWarrior', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'force' }] } }],
      7: [
        {
          id: 'etherealStep',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'etherealStep', cond: { id: 'blurred', rounds: 2 } },
        },
      ],
      11: [{ id: 'distantStrike', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'force' }], init: 2 } }],
      15: [{ id: 'spectralDefense', impl: 'adapted', mods: { ac: 1, saves: 1 } }],
    },
  },
  {
    id: 'monsterSlayer',
    classId: 'ranger',
    source: 'XGE',
    resources: [{ id: 'slayer', max: 'pb', recharge: 'long' }, { id: 'nemesis', max: 1, recharge: 'short', from: 11 }],
    levels: {
      3: [
        {
          id: 'slayersPrey',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'slayer', cond: { id: 'marked', rounds: 10 } },
        },
      ],
      7: [{ id: 'supernaturalDefense', impl: 'adapted', mods: { saves: 1 } }],
      11: [
        {
          id: 'magicUsersNemesis',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'nemesis', save: 'wis', cond: { id: 'incapacitated', rounds: 1 } },
        },
      ],
      15: [{ id: 'slayersCounter', impl: 'adapted', mods: { thorns: 1, thornsType: 'piercing' } }],
    },
  },
  {
    id: 'swarmkeeper',
    classId: 'ranger',
    source: 'TCE',
    resources: [{ id: 'dispersal', max: 'pb', recharge: 'long', from: 15 }],
    levels: {
      3: [{ id: 'gatheredSwarm', impl: 'adapted', mods: { onHit: [{ dice: '1d6', type: 'piercing' }] } }],
      7: [{ id: 'writhingTide', impl: 'adapted', mods: { ac: 1, init: 2 } }],
      11: [{ id: 'mightySwarm', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'piercing' }] } }],
      15: [
        {
          id: 'swarmingDispersal',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'dispersal', cond: { id: 'blurred', rounds: 2 } },
        },
      ],
    },
  },
  {
    id: 'thief',
    classId: 'rogue',
    source: 'PHB',
    srd: true,
    levels: {
      3: [{ id: 'fastHands', impl: 'exact' }],
      9: [{ id: 'supremeSneak', impl: 'adapted' }],
      13: [{ id: 'useMagicDevice', impl: 'adapted' }],
      17: [{ id: 'thiefsReflexes', impl: 'exact' }],
    },
  },
  {
    id: 'arcaneTrickster',
    classId: 'rogue',
    dice: 'arcane',
    source: 'PHB',
    resources: [{ id: 'trickery', max: 'pb', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'atSpellcasting',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'enemy', resource: 'trickery', dice: '2d6', dmg: 'force', flat: 'int' },
        },
        { id: 'mageHandLegerdemain', impl: 'adapted', mods: { skillProf: ['sleightOfHand'], skillBonus: { sleightOfHand: 2 } } },
      ],
      9: [{ id: 'magicalAmbush', impl: 'adapted', mods: { openingHidden: true } }],
      13: [{ id: 'versatileTrickster', impl: 'adapted', mods: { hand: { hands: ['pair', 'three'], mult: 2 } } }],
      17: [{ id: 'spellThief', impl: 'adapted', mods: { resources: { trickery: 2 }, saves: 1 } }],
    },
  },
  {
    id: 'assassin',
    classId: 'rogue',
    dice: 'blood',
    source: 'PHB',
    levels: {
      3: [{ id: 'assassinate', impl: 'adapted', mods: { init: 3, openingHidden: true, skillProf: ['deception'] } }],
      9: [{ id: 'infiltrationExpertise', impl: 'adapted', mods: { tricks: 1 } }],
      13: [{ id: 'impostor', impl: 'adapted', mods: { skillBonus: { deception: 3 }, rerolls: 1 } }],
      17: [{ id: 'deathStrike', impl: 'adapted', mods: { execute: true } }],
    },
  },
  {
    id: 'inquisitive',
    classId: 'rogue',
    source: 'XGE',
    resources: [{ id: 'insightful', max: 'pb', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'insightfulFighting',
          impl: 'adapted',
          mods: { skillProf: ['insight', 'investigation'] },
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'insightful', cond: { id: 'faerieFire', rounds: 2 } },
        },
      ],
      9: [{ id: 'steadyEye', impl: 'adapted', mods: { skillBonus: { perception: 3, investigation: 3 } } }],
      13: [{ id: 'unerringEye', impl: 'adapted', mods: { saves: 1 } }],
      17: [{ id: 'eyeForWeakness', impl: 'adapted', mods: { onHit: [{ dice: '2d6', type: 'piercing' }] } }],
    },
  },
  {
    id: 'mastermind',
    classId: 'rogue',
    source: 'XGE',
    resources: [{ id: 'tactics', max: 'pb', recharge: 'short' }],
    levels: {
      3: [
        {
          id: 'masterOfTactics',
          impl: 'adapted',
          mods: { skillProf: ['persuasion'] },
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'tactics', cond: { id: 'hidden', rounds: 1 } },
        },
      ],
      9: [{ id: 'insightfulManipulator', impl: 'adapted', mods: { tricks: 1 } }],
      13: [{ id: 'misdirection', impl: 'adapted', mods: { firstHitImmune: true } }],
      17: [{ id: 'soulOfDeceit', impl: 'adapted', immune: ['charmed'], mods: { saves: 1 } }],
    },
  },
  {
    id: 'phantom',
    classId: 'rogue',
    source: 'TCE',
    resources: [{ id: 'wails', max: 'pb', recharge: 'long' }, { id: 'ghostWalk', max: 1, recharge: 'long', from: 13 }],
    levels: {
      3: [
        {
          id: 'wailsFromTheGrave',
          impl: 'adapted',
          mods: { skillProf: ['religion'] },
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'wails', dice: '2d6', dmg: 'necrotic' },
        },
      ],
      9: [{ id: 'tokensOfTheDeparted', impl: 'adapted', mods: { saves: 1, onKill: { rerolls: 1 } } }],
      13: [
        {
          id: 'ghostWalk',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'ghostWalk', cond: { id: 'blurred', rounds: 10 } },
        },
      ],
      17: [{ id: 'deathsFriend', impl: 'adapted', mods: { resources: { wails: 2 }, onKill: { healPct: 0.05 } } }],
    },
  },
  {
    id: 'scout',
    classId: 'rogue',
    source: 'XGE',
    levels: {
      3: [{ id: 'skirmisher', impl: 'adapted', mods: { skillProf: ['nature', 'survival'], init: 2 } }],
      9: [{ id: 'superiorMobility', impl: 'adapted', mods: { ac: 1, init: 2 } }],
      13: [{ id: 'ambushMaster', impl: 'adapted', mods: { openingHidden: true } }],
      17: [{ id: 'suddenStrike', impl: 'adapted', mods: { minAttacks: 2 } }],
    },
  },
  {
    id: 'soulknife',
    classId: 'rogue',
    source: 'TCE',
    resources: [{ id: 'psi', max: 'pb', recharge: 'short' }, { id: 'rend', max: 1, recharge: 'long', from: 17 }],
    levels: {
      3: [{ id: 'psychicBladesRogue', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'psychic' }], skillProf: ['insight'] } }],
      9: [
        {
          id: 'soulBlades',
          impl: 'adapted',
          power: { kind: 'strike', cost: 'action', target: 'enemy', resource: 'psi', dice: '1d8', dmg: 'psychic' },
        },
      ],
      13: [
        {
          id: 'psychicVeil',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'psi', cond: { id: 'invisible', rounds: 2 } },
        },
      ],
      17: [
        {
          id: 'rendMind',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'rend', save: 'wis', cond: { id: 'stunned', rounds: 1 } },
        },
      ],
    },
  },
  {
    id: 'swashbuckler',
    classId: 'rogue',
    dice: 'steel',
    source: 'XGE',
    resources: [{ id: 'panache', max: 'pb', recharge: 'long', from: 9 }],
    levels: {
      3: [{ id: 'rakishAudacity', impl: 'adapted', mods: { init: 3, ac: 1 } }],
      9: [
        {
          id: 'panache',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'panache', save: 'wis', cond: { id: 'charmed', rounds: 1 } },
        },
      ],
      13: [{ id: 'elegantManeuver', impl: 'adapted', mods: { skillProf: ['acrobatics', 'athletics'] } }],
      17: [{ id: 'masterDuelist', impl: 'adapted', mods: { rerolls: 1, critRange: 1 } }],
    },
  },
  {
    id: 'draconic',
    classId: 'sorcerer',
    source: 'PHB',
    srd: true,
    levels: {
      3: [{ id: 'draconicResilience', impl: 'exact' }],
      6: [{ id: 'elementalAffinity', impl: 'exact' }],
      14: [{ id: 'dragonWings', impl: 'adapted' }],
      18: [{ id: 'dragonCompanion', impl: 'adapted' }],
    },
  },
  {
    id: 'aberrantMind',
    classId: 'sorcerer',
    dice: 'arcane',
    source: 'TCE',
    resources: [{ id: 'implosion', max: 1, recharge: 'long', from: 18 }],
    levels: {
      3: [
        {
          id: 'psionicSpells',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'enemy', resource: 'sorcery', dice: '2d8', dmg: 'psychic', flat: 'cha' },
        },
      ],
      6: [{ id: 'psychicDefenses', impl: 'adapted', mods: { resist: ['psychic'] }, immune: ['charmed'] }],
      14: [{ id: 'revelationInFlesh', impl: 'adapted', mods: { ac: 1, init: 2 } }],
      18: [
        {
          id: 'warpingImplosion',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'action', target: 'enemies', resource: 'implosion', dice: '2d10', dmg: 'force', save: 'str' },
        },
      ],
    },
  },
  {
    id: 'clockworkSoul',
    classId: 'sorcerer',
    source: 'TCE',
    resources: [{ id: 'balance', max: 'pb', recharge: 'long' }, { id: 'cavalcade', max: 1, recharge: 'long', from: 18 }],
    levels: {
      3: [
        {
          id: 'restoreBalance',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'balance', cond: { id: 'weakened', rounds: 1 } },
        },
      ],
      6: [{ id: 'bastionOfLaw', impl: 'adapted', power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'sorcery', spend: 2, tempHp: 0.75 } }],
      14: [{ id: 'tranceOfOrder', impl: 'adapted', mods: { rerolls: 1 } }],
      18: [
        {
          id: 'clockworkCavalcade',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'action', target: 'allies', resource: 'cavalcade', dice: '1d8', flat: 'cha' },
        },
      ],
    },
  },
  {
    id: 'divineSoul',
    classId: 'sorcerer',
    dice: 'sun',
    source: 'XGE',
    resources: [{ id: 'recovery', max: 1, recharge: 'long', from: 18 }],
    levels: {
      3: [{ id: 'favoredByTheGods', impl: 'adapted', mods: { saves: 1, healPct: 0.1 } }],
      6: [{ id: 'empoweredHealing', impl: 'adapted', mods: { healPct: 0.15 } }],
      14: [{ id: 'otherworldlyWings', impl: 'adapted', mods: { ac: 1, init: 2 } }],
      18: [
        {
          id: 'unearthlyRecovery',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'bonus', target: 'self', resource: 'recovery', dice: '2d10', flat: 'level' },
        },
      ],
    },
  },
  {
    id: 'shadowSorcery',
    classId: 'sorcerer',
    dice: 'shadow',
    source: 'XGE',
    resources: [{ id: 'shadowWalk', max: 'pb', recharge: 'long', from: 14 }],
    levels: {
      3: [{ id: 'strengthOfTheGrave', impl: 'adapted', mods: { deathWard: true } }],
      6: [
        {
          id: 'houndOfIllOmen',
          impl: 'adapted',
          power: {
            kind: 'debuff',
            cost: 'action',
            target: 'enemy',
            resource: 'sorcery',
            cond: { id: 'baned', rounds: 3 },
            spend: 3,
            dice: '1d6',
            dmg: 'psychic',
          },
        },
      ],
      14: [
        {
          id: 'shadowWalk',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'shadowWalk', cond: { id: 'invisible', rounds: 1 } },
        },
      ],
      18: [
        {
          id: 'umbralForm',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'sorcery', cond: { id: 'stoneskin', rounds: 10 }, spend: 4 },
        },
      ],
    },
  },
  {
    id: 'storm',
    classId: 'sorcerer',
    dice: 'storm',
    source: 'XGE',
    levels: {
      3: [{ id: 'tempestuousMagic', impl: 'adapted', mods: { init: 2 } }],
      6: [{ id: 'heartOfTheStorm', impl: 'adapted', mods: { resist: ['lightning', 'thunder'], spellDmg: 2 } }],
      14: [{ id: 'stormsFury', impl: 'adapted', mods: { thorns: 1, thornsType: 'lightning' } }],
      18: [{ id: 'windSoul', impl: 'adapted', mods: { saves: 1, init: 2 } }],
    },
  },
  {
    id: 'wildMagicSorcery',
    classId: 'sorcerer',
    source: 'PHB',
    levels: {
      3: [{ id: 'tidesOfChaos', impl: 'adapted', mods: { openingWild: 1 } }],
      6: [
        {
          id: 'bendLuck',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'sorcery', cond: { id: 'blessed', rounds: 3 }, spend: 2 },
        },
      ],
      14: [{ id: 'controlledChaos', impl: 'adapted', mods: { rerolls: 1 } }],
      18: [{ id: 'spellBombardment', impl: 'adapted', mods: { spellDmg: 4 } }],
    },
  },
  {
    id: 'fiend',
    classId: 'warlock',
    dice: 'ember',
    source: 'PHB',
    srd: true,
    resources: [{ id: 'ownLuck', max: 'cha', recharge: 'long', from: 6 }, { id: 'hurl', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [{ id: 'darkOnesBlessing', impl: 'exact' }],
      6: [{ id: 'darkOnesOwnLuck', impl: 'adapted' }],
      10: [{ id: 'fiendishResilience', impl: 'adapted' }],
      14: [{ id: 'hurlThroughHell', impl: 'adapted' }],
    },
  },
  {
    id: 'archfey',
    classId: 'warlock',
    dice: 'verdant',
    source: 'PHB',
    resources: [
      { id: 'feyPresence', max: 1, recharge: 'short' },
      { id: 'mistyEscape', max: 1, recharge: 'short', from: 6 },
      { id: 'delirium', max: 1, recharge: 'short', from: 14 },
    ],
    levels: {
      3: [
        {
          id: 'feyPresence',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemies', resource: 'feyPresence', save: 'wis', cond: { id: 'charmed', rounds: 1 } },
        },
      ],
      6: [
        {
          id: 'mistyEscape',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'mistyEscape', cond: { id: 'invisible', rounds: 1 } },
        },
      ],
      10: [{ id: 'beguilingDefenses', impl: 'adapted', immune: ['charmed'], mods: { thorns: 0.5, thornsType: 'psychic' } }],
      14: [
        {
          id: 'darkDelirium',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'delirium', save: 'wis', cond: { id: 'charmed', rounds: 3 } },
        },
      ],
    },
  },
  {
    id: 'celestial',
    classId: 'warlock',
    dice: 'sun',
    source: 'XGE',
    resources: [{ id: 'healingLight', max: 'pb', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'healingLight',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'bonus', target: 'ally', resource: 'healingLight', dice: '2d6', flat: 'cha' },
        },
      ],
      6: [{ id: 'radiantSoul', impl: 'adapted', mods: { resist: ['radiant'], spellDmg: 2 } }],
      10: [{ id: 'celestialResilience', impl: 'adapted', mods: { hpPct: 0.08 } }],
      14: [{ id: 'searingVengeance', impl: 'adapted', mods: { deathWard: true } }],
    },
  },
  {
    id: 'fathomless',
    classId: 'warlock',
    dice: 'storm',
    source: 'TCE',
    resources: [
      { id: 'tentacle', max: 'pb', recharge: 'long' },
      { id: 'graspingTentacles', max: 1, recharge: 'long', from: 10 },
      { id: 'plunge', max: 1, recharge: 'short', from: 14 },
    ],
    levels: {
      3: [
        {
          id: 'tentacleOfTheDeeps',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'tentacle', dice: '2d6', dmg: 'cold', cond: { id: 'slowed', rounds: 1 } },
        },
      ],
      6: [{ id: 'oceanicSoul', impl: 'adapted', mods: { resist: ['cold'], ac: 1 } }],
      10: [
        {
          id: 'graspingTentacles',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'rank', resource: 'graspingTentacles', save: 'str', cond: { id: 'restrained', rounds: 2 } },
        },
      ],
      14: [
        {
          id: 'fathomlessPlunge',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'plunge', cond: { id: 'blurred', rounds: 1 } },
        },
      ],
    },
  },
  {
    id: 'genie',
    classId: 'warlock',
    source: 'TCE',
    resources: [{ id: 'vessel', max: 1, recharge: 'long', from: 10 }, { id: 'wish', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [{ id: 'genieVessel', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'fire' }], spellDmg: 2 } }],
      6: [{ id: 'elementalGift', impl: 'adapted', mods: { resist: ['fire'], init: 2 } }],
      10: [{ id: 'sanctuaryVessel', impl: 'adapted', power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'vessel', tempHp: 0.5 } }],
      14: [{ id: 'limitedWish', impl: 'adapted', power: { kind: 'heal', cost: 'action', target: 'allies', resource: 'wish', dice: '1d8', flat: 'cha' } }],
    },
  },
  {
    id: 'greatOldOne',
    classId: 'warlock',
    source: 'PHB',
    resources: [{ id: 'thrall', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [{ id: 'awakenedMind', impl: 'adapted', mods: { skillProf: ['insight'], spellDmg: 1 } }],
      6: [{ id: 'entropicWard', impl: 'adapted', mods: { firstHitImmune: true } }],
      10: [{ id: 'thoughtShield', impl: 'adapted', mods: { resist: ['psychic'], thorns: 0.5, thornsType: 'psychic' } }],
      14: [
        {
          id: 'createThrall',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'thrall', save: 'wis', cond: { id: 'charmed', rounds: 3 } },
        },
      ],
    },
  },
  {
    id: 'hexblade',
    classId: 'warlock',
    dice: 'blood',
    source: 'XGE',
    resources: [{ id: 'curse', max: 1, recharge: 'short' }],
    levels: {
      3: [
        { id: 'hexWarrior', impl: 'adapted', mods: { martialWeapons: true, armorProf: ['medium', 'shield'], attackAbility: 'cha' } },
        {
          id: 'hexbladesCurse',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'curse', cond: { id: 'hexed', rounds: 10 } },
        },
      ],
      6: [{ id: 'accursedSpecter', impl: 'adapted', mods: { onKill: { healPct: 0.05, rerolls: 1 } } }],
      10: [{ id: 'armorOfHexes', impl: 'adapted', mods: { ac: 1 } }],
      14: [{ id: 'masterOfHexes', impl: 'adapted', mods: { resources: { curse: 2 }, critRange: 1 } }],
    },
  },
  {
    id: 'undead',
    classId: 'warlock',
    source: 'VRGR',
    resources: [{ id: 'dread', max: 'pb', recharge: 'long' }, { id: 'projection', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [
        {
          id: 'formOfDread',
          impl: 'adapted',
          immune: ['frightened'],
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'dread', tempHp: 1 },
        },
      ],
      6: [{ id: 'graveTouched', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'necrotic' }], spellDmg: 2 } }],
      10: [{ id: 'necroticHusk', impl: 'adapted', mods: { resist: ['necrotic'], deathWard: true } }],
      14: [
        {
          id: 'spiritProjection',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'projection', cond: { id: 'stoneskin', rounds: 10 } },
        },
      ],
    },
  },
  {
    id: 'undying',
    classId: 'warlock',
    source: 'SCAG',
    resources: [{ id: 'indestructible', max: 1, recharge: 'short', from: 14 }],
    levels: {
      3: [{ id: 'amongTheDead', impl: 'adapted', mods: { resist: ['necrotic'] } }],
      6: [{ id: 'defyDeath', impl: 'adapted', mods: { deathWard: true } }],
      10: [{ id: 'undyingNature', impl: 'adapted', mods: { hpPct: 0.1, resist: ['poison'] } }],
      14: [
        {
          id: 'indestructibleLife',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'bonus', target: 'self', resource: 'indestructible', dice: '1d8', flat: 'level' },
        },
      ],
    },
  },
  {
    id: 'evoker',
    classId: 'wizard',
    source: 'PHB',
    srd: true,
    resources: [{ id: 'overchannel', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [{ id: 'potentCantrip', impl: 'exact' }, { id: 'evocationSavant', impl: 'narrative' }],
      6: [{ id: 'sculptSpells', impl: 'adapted' }],
      10: [{ id: 'empoweredEvocation', impl: 'exact' }],
      14: [{ id: 'overchannel', impl: 'exact' }],
    },
  },
  {
    id: 'bladesinging',
    classId: 'wizard',
    source: 'TCE',
    resources: [{ id: 'bladesong', max: 'pb', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'bladesong',
          impl: 'adapted',
          mods: { skillProf: ['performance'], martialWeapons: true },
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'bladesong', cond: { id: 'shielded', rounds: 10, value: 3 } },
        },
      ],
      6: [{ id: 'extraAttack', impl: 'exact' }],
      10: [{ id: 'songOfDefense', impl: 'adapted', mods: { ac: 1 } }],
      14: [{ id: 'songOfVictory', impl: 'adapted', mods: { dmgPct: 0.1 } }],
    },
  },
  {
    id: 'chronurgy',
    classId: 'wizard',
    dice: 'sun',
    source: 'EGW',
    resources: [{ id: 'chronalShift', max: 2, recharge: 'long' }, { id: 'stasis', max: 'int', recharge: 'long', from: 6 }],
    levels: {
      3: [
        {
          id: 'chronalShift',
          impl: 'adapted',
          mods: { init: 3 },
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'chronalShift', cond: { id: 'weakened', rounds: 1 } },
        },
      ],
      6: [
        {
          id: 'momentaryStasis',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'stasis', save: 'con', cond: { id: 'incapacitated', rounds: 1 } },
        },
      ],
      10: [{ id: 'arcaneAbeyance', impl: 'adapted', mods: { bonusSlots: { 4: 1 } } }],
      14: [{ id: 'convergentFuture', impl: 'adapted', mods: { rerolls: 1 } }],
    },
  },
  {
    id: 'graviturgy',
    classId: 'wizard',
    source: 'EGW',
    resources: [{ id: 'density', max: 'pb', recharge: 'long' }, { id: 'horizon', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [
        {
          id: 'adjustDensity',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'bonus', target: 'enemy', resource: 'density', save: 'str', cond: { id: 'slowed', rounds: 2 } },
        },
      ],
      6: [{ id: 'gravityWell', impl: 'adapted', mods: { spellDmg: 2 } }],
      10: [{ id: 'violentAttraction', impl: 'adapted', mods: { dmgPct: 0.06 } }],
      14: [
        {
          id: 'eventHorizon',
          impl: 'adapted',
          power: {
            kind: 'debuff',
            cost: 'action',
            target: 'enemies',
            resource: 'horizon',
            save: 'str',
            cond: { id: 'restrained', rounds: 2 },
            dice: '2d10',
            dmg: 'force',
          },
        },
      ],
    },
  },
  {
    id: 'scribes',
    classId: 'wizard',
    source: 'TCE',
    levels: {
      3: [{ id: 'awakenedSpellbook', impl: 'adapted', mods: { spellDmg: 1, tricks: 1 } }],
      6: [{ id: 'manifestMind', impl: 'adapted', mods: { bonusSlots: { 2: 1 } } }],
      10: [{ id: 'masterScrivener', impl: 'adapted', mods: { bonusSlots: { 3: 1 } } }],
      14: [{ id: 'oneWithTheWord', impl: 'adapted', mods: { deathWard: true } }],
    },
  },
  {
    id: 'abjuration',
    classId: 'wizard',
    source: 'PHB',
    resources: [{ id: 'arcaneWard', max: 'pb', recharge: 'long' }],
    levels: {
      3: [{ id: 'arcaneWard', impl: 'adapted', power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'arcaneWard', tempHp: 1 } }],
      6: [{ id: 'projectedWard', impl: 'adapted', power: { kind: 'buff', cost: 'bonus', target: 'ally', resource: 'arcaneWard', tempHp: 0.75 } }],
      10: [{ id: 'improvedAbjuration', impl: 'adapted', mods: { saves: 1, spellDc: 1 } }],
      14: [{ id: 'spellResistance', impl: 'adapted', mods: { resist: ['force', 'psychic'], saves: 1 } }],
    },
  },
  {
    id: 'conjuration',
    classId: 'wizard',
    source: 'PHB',
    resources: [{ id: 'transposition', max: 1, recharge: 'long', from: 6 }],
    levels: {
      3: [{ id: 'minorConjuration', impl: 'adapted', mods: { tokens: ['fateCoin'] } }],
      6: [
        {
          id: 'benignTransposition',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'transposition', cond: { id: 'blurred', rounds: 2 } },
        },
      ],
      10: [{ id: 'focusedConjuration', impl: 'adapted', mods: { saves: 1 } }],
      14: [{ id: 'durableSummons', impl: 'adapted', mods: { spellDmg: 2, hpPct: 0.05 } }],
    },
  },
  {
    id: 'divination',
    classId: 'wizard',
    source: 'PHB',
    levels: {
      3: [{ id: 'portent', impl: 'adapted', mods: { openingWild: 1 } }],
      6: [{ id: 'expertDivination', impl: 'adapted', mods: { bonusSlots: { 1: 1, 2: 1 } } }],
      10: [{ id: 'theThirdEye', impl: 'adapted', mods: { init: 3, skillProf: ['perception'] } }],
      14: [{ id: 'greaterPortent', impl: 'adapted', mods: { openingWild: 1, tokens: ['fateCoin'] } }],
    },
  },
  {
    id: 'enchantment',
    classId: 'wizard',
    source: 'PHB',
    resources: [{ id: 'gaze', max: 'pb', recharge: 'long' }],
    levels: {
      3: [
        {
          id: 'hypnoticGaze',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'gaze', save: 'wis', cond: { id: 'charmed', rounds: 1 } },
        },
      ],
      6: [{ id: 'instinctiveCharm', impl: 'adapted', mods: { firstHitImmune: true } }],
      10: [{ id: 'splitEnchantment', impl: 'adapted', mods: { spellDc: 1 } }],
      14: [{ id: 'alterMemories', impl: 'adapted', mods: { spellDc: 1, tricks: 1 } }],
    },
  },
  {
    id: 'illusion',
    classId: 'wizard',
    source: 'PHB',
    resources: [{ id: 'malleable', max: 'pb', recharge: 'long', from: 6 }],
    levels: {
      3: [{ id: 'improvedMinorIllusion', impl: 'adapted', mods: { skillProf: ['deception'], tricks: 1 } }],
      6: [
        {
          id: 'malleableIllusions',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'malleable', save: 'int', cond: { id: 'blinded', rounds: 1 } },
        },
      ],
      10: [{ id: 'illusorySelf', impl: 'adapted', mods: { firstHitImmune: true } }],
      14: [{ id: 'illusoryReality', impl: 'adapted', mods: { spellDc: 1, spellDmg: 2 } }],
    },
  },
  {
    id: 'necromancy',
    classId: 'wizard',
    dice: 'shadow',
    source: 'PHB',
    resources: [{ id: 'thralls', max: 'pb', recharge: 'long', from: 6 }, { id: 'commandUndead', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [{ id: 'grimHarvest', impl: 'adapted', mods: { onKill: { healPct: 0.1 } } }],
      6: [
        {
          id: 'undeadThralls',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'thralls', dice: '2d6', dmg: 'necrotic', flat: 'int' },
        },
      ],
      10: [{ id: 'inuredToUndeath', impl: 'adapted', mods: { resist: ['necrotic'], hpPct: 0.05 } }],
      14: [
        {
          id: 'commandUndead',
          impl: 'adapted',
          power: { kind: 'debuff', cost: 'action', target: 'enemy', resource: 'commandUndead', save: 'cha', cond: { id: 'charmed', rounds: 3 } },
        },
      ],
    },
  },
  {
    id: 'transmutation',
    classId: 'wizard',
    source: 'PHB',
    resources: [{ id: 'shapechanger', max: 1, recharge: 'short', from: 10 }, { id: 'panacea', max: 1, recharge: 'long', from: 14 }],
    levels: {
      3: [{ id: 'minorAlchemy', impl: 'adapted', mods: { skillProf: ['nature'], tricks: 1 } }],
      6: [{ id: 'transmutersStone', impl: 'adapted', mods: { saves: 1, resist: ['fire'] } }],
      10: [{ id: 'shapechanger', impl: 'adapted', power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'shapechanger', tempHp: 2 } }],
      14: [
        {
          id: 'masterTransmuter',
          impl: 'adapted',
          power: { kind: 'heal', cost: 'action', target: 'ally', resource: 'panacea', dice: '2d8', flat: 'level' },
        },
      ],
    },
  },
  {
    id: 'warMagic',
    classId: 'wizard',
    source: 'XGE',
    resources: [{ id: 'deflection', max: 'pb', recharge: 'short' }],
    levels: {
      3: [
        {
          id: 'arcaneDeflection',
          impl: 'adapted',
          mods: { init: 3 },
          power: { kind: 'buff', cost: 'bonus', target: 'self', resource: 'deflection', cond: { id: 'shielded', rounds: 1, value: 2 } },
        },
      ],
      6: [{ id: 'powerSurge', impl: 'adapted', mods: { spellDmg: 2 } }],
      10: [{ id: 'durableMagic', impl: 'adapted', mods: { ac: 1, saves: 1 } }],
      14: [{ id: 'deflectingShroud', impl: 'adapted', mods: { thorns: 0.5, thornsType: 'force' } }],
    },
  },
  {
    id: 'alchemist',
    classId: 'artificer',
    source: 'TCE',
    resources: [{ id: 'elixir', max: 'pb', recharge: 'long' }, { id: 'reagents', max: 'int', recharge: 'long', from: 9 }],
    levels: {
      3: [
        {
          id: 'experimentalElixir',
          impl: 'adapted',
          mods: { skillProf: ['medicine'] },
          power: { kind: 'heal', cost: 'bonus', target: 'ally', resource: 'elixir', dice: '2d4', flat: 'int' },
        },
      ],
      5: [{ id: 'alchemicalSavant', impl: 'adapted', mods: { spellDmg: 2, healPct: 0.15 } }],
      9: [{ id: 'restorativeReagents', impl: 'adapted', power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'reagents', tempHp: 0.5 } }],
      15: [{ id: 'chemicalMastery', impl: 'adapted', mods: { resist: ['acid', 'poison'] }, immune: ['poisoned'] }],
    },
  },
  {
    id: 'armorer',
    classId: 'artificer',
    source: 'TCE',
    levels: {
      3: [{ id: 'arcaneArmor', impl: 'adapted', mods: { armorProf: ['heavy'], ac: 1, onHit: [{ dice: '1d4', type: 'thunder' }] } }],
      5: [{ id: 'extraAttack', impl: 'exact' }],
      9: [{ id: 'armorModifications', impl: 'adapted', mods: { hpPct: 0.05 } }],
      15: [{ id: 'perfectedArmor', impl: 'adapted', mods: { thorns: 1, thornsType: 'lightning' } }],
    },
  },
  {
    id: 'artillerist',
    classId: 'artificer',
    dice: 'ember',
    source: 'TCE',
    resources: [{ id: 'cannon', max: 'pb', recharge: 'short' }, { id: 'fortified', max: 1, recharge: 'long', from: 15 }],
    levels: {
      3: [
        {
          id: 'eldritchCannon',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'rank', resource: 'cannon', dice: '2d8', dmg: 'fire', save: 'dex' },
        },
      ],
      5: [{ id: 'arcaneFirearm', impl: 'adapted', mods: { spellDmg: 2 } }],
      9: [{ id: 'explosiveCannon', impl: 'adapted', mods: { resources: { cannon: 2 } } }],
      15: [
        {
          id: 'fortifiedPosition',
          impl: 'adapted',
          power: { kind: 'buff', cost: 'bonus', target: 'allies', resource: 'fortified', cond: { id: 'shielded', rounds: 3, value: 2 } },
        },
      ],
    },
  },
  {
    id: 'battleSmith',
    classId: 'artificer',
    source: 'TCE',
    resources: [{ id: 'defender', max: 'pb', recharge: 'short' }],
    levels: {
      3: [
        { id: 'battleReady', impl: 'adapted', mods: { martialWeapons: true, attackAbility: 'int' } },
        {
          id: 'steelDefender',
          impl: 'adapted',
          power: { kind: 'blast', cost: 'bonus', target: 'enemy', resource: 'defender', dice: '1d8', dmg: 'force', flat: 'int' },
        },
      ],
      5: [{ id: 'extraAttack', impl: 'exact' }],
      9: [{ id: 'arcaneJolt', impl: 'adapted', mods: { onHit: [{ dice: '1d4', type: 'force' }] } }],
      15: [{ id: 'improvedDefender', impl: 'adapted', mods: { ac: 1, thorns: 0.5, thornsType: 'force' } }],
    },
  },
];
