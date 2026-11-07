/**
 * The Keep speaks: facility keepers' quest scenes, their one-line barks for
 * each head awake, and the heads' own voices (docs/side-quest-the-queens-due.md §11–12).
 */
import type { BiomeId } from '../../engine/types.ts';
import { chain, type Script } from '../dialogueTypes.ts';

const S = (s: Script) => s;

export const KEEP_SCRIPTS: Script[] = [
  S({ id: 'pim.leads', where: 'cartographer', speaker: 'pim', title: 'About leads', when: { has: ['seen:bet.intro'] }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['pim', 'neutral', `Ah! The Keeper! Pim Ashgrove, maps, charts, the occasional rumour pinned to the wall. Mostly rumours, lately.`],
      ['pim', 'neutral', `When somebody at the Low Lantern gives you a lead, I pin it to its Door. Look for the little scroll on the echo.`],
      ['pim', 'neutral', `Mind, the Doors shift. What's there one night isn't there the next. A lead turns up in maybe one run in three. Keep going back and it will turn up, I promise. Always by the third.`],
    ]) }),

  S({ id: 'sabeline.lampGlass', where: 'enchanter', speaker: 'sabeline', title: 'The Lamp-Glass', when: { has: ['ev:E5'] }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['sabeline', 'neutral', `You brought this up from the Drowned Star? Put it down. Gently. Thank you.`],
      ['sabeline', 'neutral', `I expected a weapon. Something to bind a monster, crack a ward. It isn't.`],
      ['sabeline', 'neutral', `It's a cradle. A rune of holding, written the way you'd write a lullaby. It was made to keep something still, very gently, for a very long time.`],
      ['sabeline', 'neutral', `And it's warm. Things like this are only warm while they're working.| It's getting cooler.`],
    ]) }),

  S({ id: 'pell.coins', where: 'vault', speaker: 'pell', title: 'Black coins', when: { headsAtLeast: 3 }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['pell', 'neutral', `Seventy-one. Seventy-two. Seventy-th— they've gone black. Why have they gone black?`],
      ['pell', 'neutral', `In rings, Keeper. Like something wet sat on them. Only the coins from the Trust's accounts. The rest are fine.`],
      ['pell', 'neutral', `And the Trust's ledger doesn't balance. Every season, more goes out than comes in. Out where? There's nowhere to send it but down.`],
    ]) }),

  S({ id: 'ilvane.warning', where: 'chronicle', speaker: 'ilvane', title: 'Warn the Keep', when: { headsAtLeast: 4, headsBelow: 5, has: ['ev:E7'], any: ['ev:E6', 'ev:E8'] }, priority: 50, start: 'a0',
    nodes: {
      ...chain('a', [
        ['ilvane', 'neutral', `You want something in the Chronicle. Everyone does, lately. Most of them want the word "triumph".`],
        { who: 'narrator', variant: 'read', say: `You lay it out: the manifest, the roster, the letter signed P., the mirror's broken line. "Break no—".` },
        ['ilvane', 'neutral', `No, or now. A crack's width between them.| And you want me to write that the Keep has been wrong for three hundred years.`],
        { who: 'ilvane', mood: 'neutral', say: `If I write it, the Guild will read it. They won't stop. But people will know someone said it.`, choices: [
          { label: '"Write it. Warn the Keep."', goto: 'warn0', fx: [{ flag: 'warned' }, { resolve: 2 }, { remember: 'ilvane' }] },
          { label: '"Not yet. I need to be sure."', goto: 'wait' },
        ] },
      ]),
      ...chain('warn', [
        ['ilvane', 'neutral', `Then it's written. In my own hand, so nobody can say a clerk did it.`],
        ['maren', 'neutral', `I read it. Four heads are loose already and the fifth echo is falling in on itself. Do you want her to wake with no one at the door?| The Guild goes on. But I'll have the shelters dug.`],
      ]),
      wait: { who: 'ilvane', mood: 'neutral', say: `Sure is a luxury, Keeper. Come back when you can't afford it.`, end: true },
    } }),

  S({ id: 'ilvane.annotations', where: 'chronicle', speaker: 'ilvane', title: 'The later notes', when: { awakened: true }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['ilvane', 'neutral', `I've left every chapter as it was written. We believed it when we wrote it. That matters.`],
      ['ilvane', 'neutral', `But I've added notes in the margins, in green ink, so you can see what we know now beside what we thought then.`],
      ['ilvane', 'neutral', `Read them in order. It's the only way they make sense.| It's the only way any of it does.`],
    ]) }),

  S({ id: 'maren.fallen', where: 'guild', speaker: 'maren', title: 'The Wall', when: { has: ['seen:bet.intro'] }, auto: true, start: 'a0',
    nodes: chain('a', [
      ['maren', 'neutral', `Maren Holt. Guildmaster. I keep the roster, I post the bounties, and every morning I read the Wall of the Fallen out loud.`],
      { who: 'maren', mood: 'neutral', say: (g) => g.roster.some((x) => x.status === 'dead') ? `There are names on it already, under your Keep. I read them every morning. Let's not add more. Bring them home.` : `Nobody's on it yet, under your Keep. I'd like to keep it that way. Bring them home.` },
    ]) }),
];

// ── barks: one line the first time you visit after each head wakes ──────────

/** Index 0 = no heads awake … 5 = awakened; 6 = Tiamat slain. */
export const BARKS: Record<string, string[]> = {
  maren: [
    'The Aldane Trust posted another bounty. Four hundred gold for the thing in the Deep Forge. Generous people.',
    'First Door broken! I\'ve hung your names in the hall. Don\'t let it go to your heads.',
    'The Trust doubled the bounty on the Third Door. Nobody\'s complaining. I\'m not complaining.',
    'Half the board\'s empty. Folk say the wells taste wrong. Wells don\'t fight back, I tell them.',
    'Notice from the Guild council: "The disturbances are the Queen\'s death throes. Press on." I posted it. I read it twice first.',
    'New recruits came in shaking. I don\'t blame them. I\'m shaking, and I\'ve seen worse. I think.',
    'I read the Wall this morning, same as always. Then I read the names of the hands. Both lists, every morning, from now on.',
  ],
  ilvane: [
    'The Chronicle is open. Every echo you break, I write down. Try to make it worth the ink.',
    'Chapter One. I wrote "triumph". It felt like a triumph.',
    'Chapter Two. I wrote "triumph" again. I am going to have to find another word.',
    'I wrote "triumph" three times in this chapter. I am going to have to stop writing "triumph".',
    'The lanterns flare when an echo breaks. I\'ve always written that they flare in celebration. I\'ve started to wonder.',
    'Every reading candle in the Chronicle went out. I am writing this by the light of a candle Bet lent me.',
    'The last chapter is written. I left a blank page after it. Old habit. Someone always comes after.',
  ],
  pim: [
    'Five Doors, five echoes, one map. Well. Several maps. They disagree.',
    'The First Door\'s map stopped moving. Maps aren\'t supposed to move in the first place, but they were. Now they don\'t.',
    'The Second Door map has gone green at the edges. Mould, probably. Probably.',
    'The Sixth Door is on the map where I drew it. It is also somewhere else on the map. I didn\'t draw that.',
    'Frost on the ink. Inside. I have started wearing gloves to draw.',
    'All the Doors are open on the map now. Even the Sixth. Especially the Sixth.',
    'The maps are just maps again. I\'m almost disappointed. Almost.',
  ],
  hulda: [
    'Steel\'s steel. Buy some.',
    'Forge burned too hot the night the First Door broke. Couldn\'t bank it. Never seen that.',
    'Got a crate in stamped with five mouths. Fine work. I sent it back.',
    'Trust paid in coin. Coin\'s been underwater. Tastes of ink. I took it anyway.',
    'Frost on the blades this morning. In my forge. I don\'t like what that says about my forge.',
    'I\'m forging for the defence now. Whoever\'s defending. Buy something, it pays for the rest.',
    'Back to horseshoes and hinges. Good. I missed hinges.',
  ],
  fennick: [
    'Potions, poultices, and advice. The advice is free and nobody takes it.',
    'Every hearth in the Keep burned too hot, and every pot of honey crystallised. I am old, dear. I notice things.',
    'All my herbs bloomed in one night and rotted by morning. I\'ve sent for more. I\'ve sent twice.',
    'Somebody\'s buying all my willow bark "for Kiln Row". Kiln Row hasn\'t had any. I asked.',
    'Ice in the tinctures. You could skate on my syrups.',
    'I\'m rationing. Not the rich, dear. Everyone else. Don\'t argue with an old woman.',
    'I\'ll have a proper garden again by spring. Ordinary plants. Ordinary weeds. Lovely.',
  ],
  sabeline: [
    'Enchanting is just persuasion, applied to metal. Bring me something worth persuading.',
    'The runes on my anvil flickered when the First Door broke. They\'ve never flickered.',
    'Wards are borrowed things, Keeper. Every ward borrows from something. I\'ve started asking what.',
    'Bring me anything you find with a rune of holding on it. Anything. I need to know how many there were.',
    'The wards on the Keep gate failed at dawn. All of them at once, like a held breath let go.',
    'Every ward we had was borrowed from her dreams. I\'m writing new ones. From scratch. It\'s slow.',
    'My new wards hold. They\'re ugly. They\'re mine.',
  ],
  kost: [
    'You want to live down there? Then you train up here. Simple.',
    'Good clear on the First Door! Again! Faster this time!',
    'Recruits are keen this season. The Trust\'s bounties do that. I don\'t trust keen.',
    'Three of my recruits won\'t hold a sword. Says it\'s no good. Says something\'s listening.',
    'Found the practice dummies frozen solid this morning. Hit them anyway. Builds character.',
    'I\'m drilling cooks and clerks to hold a line. They\'re terrible. They\'re trying. That\'s a line.',
    'Grounds are open. Bring your reserves. Life\'s for living again.',
  ],
  pell: [
    'Everything in the Vault is counted. Twice. I count it twice.',
    'Your gold\'s safe, Keeper. Nobody\'s touched it but me, and I only count it.',
    'The Trust\'s deposits have doubled. I\'ve had to buy a second ledger.',
    'The Trust\'s coins went black in rings. Only the Trust\'s. I have counted them four times.',
    'Tribute ledger doesn\'t match. More goes out than comes in, every season, for years. Out where?',
    'Someone has been emptying us into the mountain for years. I counted it. I counted all of it.',
    'Kiln Row\'s money is back in the Vault, labelled by family. I\'m giving it back one name at a time.',
  ],
};

// ── Tiamat's heads, heard once each on the way home ─────────────────────────

export const HEAD_LINES: Record<BiomeId, string> = {
  cinder: 'I was dreaming of a forge that never cooled. Warm. Endless. Mine. Who taught you to put out fires, little ones?',
  rootbound: 'My garden is dead. Every grave I tended. Every flower. I will plant another, and you will be in it.',
  drowned: 'I had a library of every word ever drowned. I was reading. You closed the book.',
  mirror: 'I could see only myself, and I was beautiful. Now I see you. I see everything a mirror sees.',
  starfall: 'You sang me five lullabies, little lantern-bearers. Then you came and put out every one. I am awake. I remember who did it.',
};
