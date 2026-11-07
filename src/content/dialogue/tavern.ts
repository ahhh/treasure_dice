/**
 * The Low Lantern: The Queen's Due, scene by scene (docs/side-quest-the-queens-due.md §5, §16).
 * Every act opens on heads awake (echoes cleared), never on hero level.
 */
import type { GameState } from '../../engine/types.ts';
import { chain, type Script } from '../dialogueTypes.ts';

const S = (s: Script) => s;
const stage = (g: GameState) => ['cinder', 'rootbound', 'drowned', 'mirror', 'starfall'].filter((b) => (g.profile.sigils[b as 'cinder'] ?? 0) > 0).length;
const fate = (g: GameState, npc: string) => g.profile.quest?.fate[npc];
const flag = (g: GameState, f: string) => !!g.profile.quest?.flags.includes(f);

export const TAVERN_SCRIPTS: Script[] = [
  // ── Act 0 ───────────────────────────────────────────────────────────────
  S({ id: 'bet.intro', where: 'tavern', speaker: 'bet', title: 'Last orders', when: { not: ['catchup'] }, priority: 100, auto: true, start: 'a0',
    nodes: {
      ...chain('a', [
        ['bet', 'neutral', `You're the new Keeper. Thought you'd be taller.| Sit anywhere that isn't wet.`],
        ['bet', 'neutral', `See that shelf? One candle for every party that goes down the Stair. I light it when you leave.| I pinch it out when you come home.`],
        ['bet', 'warm', `That's the deal. You come home, I pinch it out. Don't make me wait.`],
        ['narrator', undefined, `At the next table, a clatter of dice and a groan.`],
        ['eren', 'grin', `That's — no. No, that's a four. That's clearly a four if you're standing over here.`],
        ['bet', 'neutral', `That's Eren. He runs crates down the Doors for the Provisions Office. He has never once won at dice.`],
        { who: 'eren', mood: 'grin', say: `Statistically, Bet, that means I'm due.| Hello! You're the Keeper. Could your heroes lend a man two silver? For science.`,
          choices: [
            { label: 'Lend him two silver.', goto: 'lend', fx: [{ trust: ['eren', 1] }, { flag: 'lentSilver' }] },
            { label: '"Not a chance."', goto: 'refuse' },
            { label: '"Your dice are loaded."', check: { skill: 'sleightOfHand', dc: 12 }, goto: 'loaded', fail: 'refuse', fx: [{ trust: ['eren', 1] }] },
          ] },
      ]),
      lend: { who: 'eren', mood: 'grin', say: `A patron of the sciences!| ...And it's gone. Science is hard.`, next: 'b0' },
      refuse: { who: 'eren', mood: 'neutral', say: `Fair. Wise. Cruel, but wise.`, next: 'b0' },
      loaded: { who: 'eren', mood: 'worried', say: `They're what?| ...Oh, that's why I keep — Joss! JOSS!`, next: 'b0' },
      ...chain('b', [
        ['eren', 'neutral', `Say, are you going through the First Door? There's a cart of mine stuck on the rail cut past the gate. Bad wheel. The manifest's in the lockbox.`],
        ['eren', 'worried', `Count was off on the last run, too. Forty sacks of oil, a crate of hardtack, and six of something I never loaded.| Probably nothing. Clerk's hand.`],
        ['eren', 'grin', `Bring me that manifest and I owe you a drink. Bet, write that down.`],
        ['bet', 'neutral', `I don't do credit.`],
        ['eren', 'grin', `She does credit.`],
      ], { end: true, fx: [{ lead: 'L0' }] }),
    } }),

  S({ id: 'bet.catchup', where: 'tavern', speaker: 'bet', title: 'What you missed', when: { has: ['catchup'] }, priority: 110, auto: true, start: 'a0',
    nodes: chain('a', [
      ['bet', 'neutral', `You've been busy, love. Sit. I'm Bet. This is the Low Lantern, the last warm room before the Stair.`],
      ['bet', 'neutral', `You won't have heard, being down there. Workers have been going below on false papers. A tithe called the Queen's Due. A cult called the Dragon's Choir, feeding half of Kiln Row and taking the rest.`],
      ['bet', 'worried', `And every time one of your echoes breaks, something in this Keep goes strange. Lamps. Wells. Frost on the inside of windows.`],
      ['bet', 'neutral', `Eren can tell you the rest. He's been counting things again. Talk to the regulars. I'll keep your candle lit.`],
    ], { end: true, fx: [{ unflag: 'catchup' }, { flag: 'seen:bet.intro' }] }) }),

  // ── Act 1: the Red Head wakes ───────────────────────────────────────────
  S({ id: 'bet.lamps', where: 'tavern', speaker: 'bet', title: 'The lamps', when: { headsAtLeast: 1 }, priority: 80, start: 'a0',
    nodes: chain('a', [
      ['bet', 'worried', `Every lamp in my house went out. Same moment the Forge went cold, they tell me.`],
      ['bet', 'neutral', `Then they lit themselves again. I've poured drinks under this roof eleven years. They don't go out.| ...Probably the draught.`],
    ]) }),

  S({ id: 'eren.noManifest', where: 'tavern', speaker: 'eren', title: 'The office copy', when: { headsAtLeast: 1, not: ['ev:E1'] }, priority: 92, start: 'a0',
    nodes: chain('a', [
      ['eren', 'worried', `The First Door's quiet now, and my cart's still down there. The lockbox too. I'd go myself, but I've seen what lives on that rail cut.`],
      ['eren', 'neutral', `If you're ever back that way... the manifest. I just want to see the count.`],
    ], { end: true, fx: [{ lead: 'L0' }] }) }),

  S({ id: 'eren.hands', where: 'tavern', speaker: 'eren', title: 'Eren reads the manifest', when: { headsAtLeast: 1, has: ['ev:E1'] }, priority: 90, start: 'a0',
    nodes: {
      ...chain('a', [
        { who: 'eren', mood: 'grin', say: `You found it! I owe you a drink. I owe you two. Let's see what my wheel cost me...`, when: { has: ['leadDone:L0'] }, skip: 'a1' },
        ['eren', 'worried', `Hands.| Six of them. I've carried oil, hardtack, a piano once, gods help me. I've never carried hands.`],
        { who: 'eren', mood: 'worried', say: `"Due. Received, V."| ...Right.`, choices: [
          { label: '"Who\'s V.?"', goto: 'who' },
          { label: '"Could be a clerk\'s mistake."', goto: 'mistake' },
          { label: '"You already know who V. is."', check: { skill: 'insight', dc: 12 }, goto: 'knows', fail: 'mistake', fx: [{ trust: ['eren', 1] }] },
        ] },
      ]),
      who: { who: 'eren', mood: 'neutral', say: `A lot of names start with V.| A lot.`, next: 'c0' },
      mistake: { who: 'eren', mood: 'neutral', say: `Sure. Six times. In the same column. Under "Due".| Sure.`, next: 'c0' },
      knows: { who: 'eren', mood: 'worried', say: `Veska. My boss. She signs everything V. She signed my birthday card V.| She's not — she's a good person, Keeper.`, next: 'c0' },
      ...chain('c', [
        ['eren', 'neutral', `My mother lives in Kiln Row. If anybody knows what "the Due" is, it's her. She knows everything that happens on that street, and most of what's about to.`],
        ['bet', 'neutral', `Hessa makes the stout. Go and see her. Take something sweet. She won't eat it, but she'll like you for it.`],
      ], { end: true, fx: [{ flag: 'act1.hands' }, { lead: 'L1' }] }),
    } }),

  S({ id: 'veska.intro', where: 'tavern', speaker: 'veska', title: 'A registrar calls', when: { headsAtLeast: 1, has: ['seen:eren.hands'] }, priority: 70, start: 'a0',
    nodes: chain('a', [
      ['veska', 'neutral', `Eren. You were due at the loading dock an hour ago.`],
      ['eren', 'grin', `I was being thanked by heroes, Veska.`],
      ['veska', 'neutral', `Then you were being thanked on the Office's time.| Keeper. Veska, Provisions Registrar. Thank you for the First Door. The camps below will be safer for my runners. That's no small thing.`],
      ['eren', 'worried', `Veska, what's the Due?`],
      ['veska', 'neutral', `A tithe arrangement for Kiln Row. Debt relief. It's registered and it's legal, and it's eleven at night.| Dock. Now.`],
    ], { end: true, fx: [{ flag: 'met:veska' }] }) }),

  S({ id: 'corvin.round', where: 'tavern', speaker: 'corvin', title: 'A generous stranger', when: { headsAtLeast: 1 }, priority: 60, start: 'a0',
    nodes: chain('a', [
      ['corvin', 'neutral', `To the heroes of the First Door! Put the whole room on the Trust, Mistress Harrowgate.`],
      ['corvin', 'neutral', `Splendid work, truly. Every door you open is a gift to us all. Do keep it up.`],
      ['bet', 'neutral', `Generous man. Can't stand him.| Can't say why.`],
    ], { end: true, fx: [{ flag: 'corvin.coat' }] }) }),

  S({ id: 'hessa.kilnrow', where: 'kilnrow', speaker: 'hessa', title: 'Hessa of Kiln Row', when: { has: ['act1.hands'], not: ['leadDone:L1'] }, priority: 80, start: 'a0',
    nodes: {
      ...chain('a', [
        ['narrator', undefined, `Kiln Row smells of hot iron and bread. Every doorway has a small clay lamp burning blue. Eren's mother takes the sweets, does not eat them, and likes you for it.`],
        ['hessa', 'neutral', `Every family on this street keeps a hearth-flame. It doesn't go out while the family lives. When someone dies, we let it go out.| We don't snuff it. We let it.`],
        ['hessa', 'neutral', `The Due. Six winters ago the Guild wouldn't give Kiln Row credit, and the snow came early, and we buried forty-one. The Choir came with grain.`],
        { who: 'hessa', mood: 'neutral', say: `Now we pay the Choir a tithe. And when a family can't pay, someone goes below for a season to work it off. Then they come home.| They used to come home.`,
          choices: [
            { label: '"Who went below?"', goto: 'who0' },
            { label: '"Is the Choir a cult?"', goto: 'cult' },
          ] },
      ]),
      cult: { who: 'hessa', mood: 'neutral', say: `It's a cult, love. It's also the only people who came. Both things are true on this street.`, next: 'who0' },
      ...chain('who', [
        ['hessa', 'neutral', `I keep a list. Nobody asked me to. Somebody ought to.`],
        { who: 'narrator', say: `She gives you a folded sheet of names and seasons, tied with red thread. The last name is Tarn.`, variant: 'read' },
        ['hessa', 'neutral', `Tarn's my sister's boy. Eren's cousin. Went down last spring. His flame's still burning.| I check it every morning.`],
      ], { end: true, fx: [{ evidence: 'E2' }, { leadDone: 'L1' }, { lead: 'L2' }, { trust: ['kilnrow', 1] }, { flag: 'met:hessa' }] }),
    } }),

  // ── Act 2: the Green Head wakes ─────────────────────────────────────────
  S({ id: 'eren.trust', where: 'tavern', speaker: 'eren', title: 'Somebody is paying', when: { headsAtLeast: 2 }, priority: 90, start: 'a0',
    nodes: chain('a', [
      ['eren', 'worried', `I've been at the Guild's records after hours. Don't tell Veska. Don't tell the Guild. Don't tell anybody, actually.`],
      ['eren', 'worried', `Every big bounty on the things at the bottom of the Doors is sponsored by the Aldane Expeditionary Trust. Corvin Aldane. Him in the good coat.`],
      ['eren', 'resolved', `And the Trust keeps its accounts at the same counting-house as the Due.| Somebody is paying you to break those doors, and paying my mother's neighbours to dig under them. That's the same purse.`],
      ['eren', 'worried', `Why is it the same purse?`],
      { who: 'bet', mood: 'neutral', say: `Barge people drink here too. One of them says there's a boat in the Third Door, low in the water. Boxes stamped with mouths.`, fx: [{ lead: 'L3' }] },
    ], { end: true, fx: [{ flag: 'met:corvin' }] }) }),

  S({ id: 'sereth.intro', where: 'tavern', speaker: 'sereth', title: 'A healer at the Stair', when: { headsAtLeast: 2 }, priority: 85, start: 'a0',
    nodes: {
      ...chain('a', [
        ['sereth', 'neutral', `Sit them down. Gently.| There. What's their name?`],
        ['sereth', 'neutral', `You took a root through the shoulder. It missed everything that matters. You're very lucky, or very good.`],
        { who: 'sereth', mood: 'neutral', say: `I'm Sereth. I'm here most nights, at the foot of the Stair. The Choir sends supplies. I send them where they're needed.`, fx: [{ flag: 'met:sereth' }],
          choices: [
            { label: '"Why help us?"', goto: 'why' },
            { label: '"The Choir. The Dragon\'s Choir. What is it?"', goto: 'what0' },
          ] },
      ]),
      why: { who: 'sereth', mood: 'neutral', say: `Because you're bleeding.| Is there usually another reason?`, next: 'end0' },
      ...chain('what', [
        ['sereth', 'fervent', `A family, mostly. Soup on cold nights. A doctor who'll come to Kiln Row. A song.`],
        ['sereth', 'neutral', `They call us a cult up here. I suppose we are. And a hope, which is the part people don't like.| That she wakes.`],
        ['sereth', 'fervent', `Every people with a god who loves them gets to be a people. We had a mother once. The wardens put her to sleep and called it peace.`],
        { who: 'sereth', mood: 'fervent', say: `I don't want the world to burn, Keeper. I want her to open her eyes and see us. Is that so different from what you want from your gods?`,
          choices: [
            { label: '[Insight] Read him.', check: { skill: 'insight', dc: 14 }, goto: 'insight', fail: 'end0' },
            { label: '[Religion] Those five bells on his collar...', check: { skill: 'religion', dc: 13 }, goto: 'religion', fail: 'end0' },
            { label: 'Say nothing.', goto: 'end0' },
          ] },
      ]),
      insight: { who: 'hero', say: `(aside) He believes every word of it. And he's good at this. That shoulder will heal clean.`, next: 'end0' },
      religion: { who: 'hero', say: `(aside) Five bells, one for each head. That's a devotional to Tiamat, not a healer's habit.`, next: 'end0' },
      ...chain('end', [
        ['sereth', 'neutral', `Come and find me before you go down. I'll have something ready for your heroes.| No charge. No hymn either, if you'd rather.`],
      ], { end: true, fx: [{ remember: 'sereth' }] }),
    } }),

  S({ id: 'ilo.freed', where: 'tavern', speaker: 'ilo', title: 'The worker you freed', when: { has: ['iloFreed'] }, priority: 75, start: 'a0',
    nodes: chain('a', [
      ['ilo', 'neutral', `You're the ones from the grove. I'm Ilo. Bet says I can sit here till I stop shaking. I've been here two days.`],
      ['ilo', 'neutral', `We carry the Due. Coin, oil. Down past where the Guild camps stop. Down to the big door, the one with no number.`],
      ['ilo', 'neutral', `And we stack it.| That's all. We stack it. Higher every season.`],
    ], { end: true, fx: [{ resolve: 1 }, { flag: 'met:ilo' }] }) }),

  // ── Act 3: the Black Head wakes ─────────────────────────────────────────
  S({ id: 'bet.choirCorner', where: 'tavern', speaker: 'bet', title: 'The corner table', when: { headsAtLeast: 3 }, priority: 70, start: 'a0',
    nodes: chain('a', [
      ['bet', 'worried', `Dace hasn't been in. Says the well-water tastes of ink. He's right, it does.`],
      ['bet', 'neutral', `See the corner? Grey robes. They've started drinking here. Quiet. Polite. They stop talking when your lot walks past.`],
      ['bet', 'neutral', `Half my regulars won't go below now. The other half say the strange things prove she's desperate, and you should go faster.| I just pour.`],
    ]) }),

  S({ id: 'eren.containment', where: 'tavern', speaker: 'eren', title: 'Not digging. Carrying.', when: { headsAtLeast: 3, has: ['ev:E5'] }, priority: 95, start: 'a0',
    nodes: chain('a', [
      ['eren', 'worried', `Sabeline at the Enchanter's had a look at that glass you brought up from the Drowned Star. Know what she said? "It's not a weapon. It's a cradle."`],
      { who: 'eren', mood: 'worried', say: `And Ilo says they stack it. And the Trust pays the bounties.`, when: { has: ['iloFreed'] }, skip: 'a2' },
      ['eren', 'resolved', `They're not digging down there, Keeper. They're carrying. The Due goes to the Sixth Door. Somebody's building something under us, and they're paying you to clear the road.`],
      ['eren', 'resolved', `I'm done asking people. I'm going to go and look.`],
      ['bet', 'worried', `Eren.`],
      ['eren', 'grin', `I'll take Tuesday. Nobody suspects a mule.`],
    ], { end: true, fx: [{ flag: 'erenGoing' }] }) }),

  S({ id: 'bet.erenGone', where: 'tavern', speaker: 'bet', title: 'Eren didn\'t come back', when: { has: ['erenGoing'], notFate: ['eren', 'alive'] }, priority: 120, auto: true, start: 'a0',
    nodes: chain('a', [
      ['bet', 'worried', `Eren took Tuesday and a crate of nothing down the Fourth Door last night. No lantern.`],
      ['bet', 'worried', `Said if he wasn't back in a few days I should tell you.| I'm telling you.`],
      ['bet', 'grief', `His candle's still lit.| Keep it that way, love.`],
    ], { end: true, fx: [{ lead: 'LE' }] }) }),

  S({ id: 'eren.rescued', where: 'tavern', speaker: 'eren', title: 'Eren is home', when: { has: ['leadDone:LE'], fate: ['eren', 'alive'] }, priority: 110, auto: true, start: 'a0',
    nodes: chain('a', [
      ['eren', 'resolved', `Tuesday got home first. Walked the whole Stair by herself and stood outside Bet's door till somebody let her in.`],
      ['eren', 'worried', `They had me tied to a mirror, Keeper. They kept saying the Queen would want me whole. Like I was cargo.| I was cargo.`],
      { who: 'eren', mood: 'grin', say: `Anyway. I owe you a drink. I owe you a brewery.`, when: { has: ['lentSilver'] }, skip: 'a3' },
      ['eren', 'resolved', `Whatever you do next, I'm with you. Write that down, Bet.`],
      ['bet', 'warm', `Written.`],
    ], { end: true, fx: [{ trust: ['eren', 1] }, { resolve: 1 }, { remember: 'eren' }] }) }),

  S({ id: 'bet.erenCaptured', where: 'tavern', speaker: 'bet', title: 'The candle', when: { fate: ['eren', 'captured'] }, priority: 120, auto: true, start: 'a0',
    nodes: chain('a', [
      ['narrator', undefined, `One candle on the shelf has been pinched out.`],
      ['bet', 'grief', `I kept his candle lit four days. I'd have kept it lit forty.`],
      ['bet', 'grief', `Hessa came in. Asked me if I'd pinched it. I said yes. She said her hearth-flame's still burning.| So he's alive somewhere. That's what it means. That's all it means.`],
    ]) }),

  // ── Act 4: the White Head wakes ─────────────────────────────────────────
  S({ id: 'veska.ledger', where: 'tavern', speaker: 'veska', title: 'Confront Veska', when: { headsAtLeast: 4, any: ['ev:E3', 'ev:E2'] }, priority: 95, start: 'a0',
    nodes: {
      ...chain('a', [
        ['veska', 'neutral', `Keeper. If this is about Eren's hours —`],
        { who: 'narrator', say: `You put the names on the table.`, variant: 'read' },
        ['veska', 'cornered', `...Where did you get that.`],
        ['veska', 'cornered', `Six winters ago the Guild refused Kiln Row credit. Forty-one people died between the first snow and the thaw. I wrote them down.| I'm a registrar. I write things down.`],
        ['veska', 'neutral', `The Choir came with grain. They asked for a tithe, and then for hands. A season's work below and the family's debt was forgiven. It was a good arrangement.| It was a good arrangement.`],
        { who: 'veska', mood: 'neutral', say: `What else do you want me to say?`, choices: [
          { label: '"The last two seasons have no return dates."', when: { has: ['ev:E3'] }, goto: 'dates' },
          { label: 'Show her the letter signed "P."', when: { has: ['ev:E6'] }, goto: 'letter' },
          { label: '"Tarn is on that list."', goto: 'tarn' },
        ] },
      ]),
      dates: { who: 'veska', mood: 'ashamed', say: `I stopped writing them.| Not because I knew. Because I didn't want to keep writing a date and then crossing it out.`, next: 'm0' },
      letter: { who: 'veska', mood: 'cornered', say: `"Keep the Keep grateful."| That's Aldane's hand. I've had a hundred slips from him. Splendidly. He always writes splendidly.`, next: 'm0' },
      tarn: { who: 'veska', mood: 'ashamed', say: `I know where Tarn is on the list. I know where everyone is on the list.`, next: 'm1' },
      ...chain('m', [
        { who: 'eren', mood: 'resolved', say: `Tarn's my cousin, Veska.`, when: { fate: ['eren', 'alive'] }, skip: 'm1' },
        { who: 'veska', mood: 'ashamed', say: `What do you want from me, Keeper?`, choices: [
          { label: '"Help me make it right."', goto: 'help', fx: [{ fate: ['veska', 'testifies'] }, { evidence: 'E8' }, { resolve: 1 }, { remember: 'veska' }] },
          { label: '"The Keep deserves to know what you did."', goto: 'expose', fx: [{ fate: ['veska', 'imprisoned'] }, { evidence: 'E8' }, { resolve: 1 }, { trust: ['kilnrow', -1] }, { remember: 'veska' }] },
          { label: 'Leave.', goto: 'leave', fx: [{ fate: ['veska', 'fled'] }] },
        ] },
      ]),
      help: { who: 'veska', mood: 'ashamed', say: `...Then you'll need this.| Every name. Every season. Every date I stopped writing. Keep it. I've kept it long enough.`, end: true },
      expose: { who: 'veska', mood: 'ashamed', say: `Yes.| Yes, it does. Here. All of it.| Tell them about the winter too.`, end: true },
      leave: { who: 'narrator', say: `By morning the Provisions Office is locked, and Veska is gone.`, variant: 'read', end: true },
    } }),

  S({ id: 'voices.three', where: 'tavern', speaker: 'eren', title: 'Three voices', when: { headsAtLeast: 4, has: ['ev:E7'] }, priority: 90, start: 'a0',
    nodes: {
      ...chain('a', [
        ['narrator', undefined, `Frost on the inside of the windows. The mirror behind the bar shows the room a heartbeat late. The argument has already started.`],
        { who: 'eren', mood: 'resolved', say: `"Break no—". No. It says no. We have to tell the Keep. We have to stop the expeditions.`, when: { fate: ['eren', 'alive'] }, skip: 'a2' },
        { who: 'bet', mood: 'worried', say: `Eren would've had a lot to say about that mirror. "Break no—". He'd have said it means no.`, when: { notFate: ['eren', 'alive'] }, skip: 'a3' },
        ['sereth', 'fervent', `You've read a cracked mirror and decided it's a curse. I've read the hymn every day of my life. She's waking because it is time.`],
        { who: 'veska', mood: 'cornered', say: `Stop the expeditions and the Choir stops paying, and Kiln Row starves again. Warn them about that too.`, when: { fate: ['veska', 'testifies'] }, skip: 'a5' },
        { who: 'sereth', mood: 'neutral', say: `And what will you do, Keeper? Leave the last door shut, with four heads already loose?`, choices: [
          { label: 'Show Sereth the Precentor\'s letter.', when: { has: ['ev:E6'] }, goto: 'letter', fx: [{ flag: 'serethDoubts' }] },
          { label: 'Show Sereth Veska\'s ledger.', when: { has: ['ev:E8'] }, goto: 'ledger', fx: [{ flag: 'serethDoubts' }] },
          { label: '"I don\'t know yet."', goto: 'b0' },
        ] },
      ]),
      letter: { who: 'sereth', mood: 'neutral', say: `"Keep the Keep grateful."| That's the Precentor's hand. He signs our hymnals.| Why would he want you grateful?`, next: 'b0' },
      ledger: { who: 'sereth', mood: 'broken', say: `These are — I know these names. I tended him. And her.| Why are there no return dates?`, next: 'b0' },
      ...chain('b', [
        { who: 'eren', mood: 'resolved', say: `The handwriting on the Trust slips. And on that letter. Same loops on the P. Corvin Aldane is the Precentor.`, when: { has: ['ev:E6'], any: ['ev:E3', 'ev:E4'] }, skip: 'b2', fx: [{ flag: 'corvinExposed' }, { fate: ['corvin', 'exposed'] }] },
        ['bet', 'neutral', `Aldane's coach left the Keep an hour ago. In a hurry. Didn't settle his tab.`],
        ['bet', 'neutral', `The Chronicler's still up. If you want the Keep warned, that's where you write it down.`],
      ]),
    } }),

  // ── Act 5: Tiamat awakens ───────────────────────────────────────────────
  S({ id: 'awaken.onlyLight', where: 'tavern', speaker: 'bet', title: 'The only light', when: { headsAtLeast: 5, tiamatSlain: false }, priority: 200, auto: true, start: 'a0',
    nodes: {
      ...chain('a', [
        ['bet', 'worried', `Every lamp in the Keep went out.| Every lamp. The tower. The Guild. The Chronicler's little reading candles.`],
        ['bet', 'neutral', `Not mine.`],
        ['bet', 'neutral', `I buy my oil.`],
        ['bet', 'grief', `Sit down, love. Everyone else has.`],
        { who: 'eren', mood: 'resolved', say: (g) => flag(g, 'erenScarred') ? `They kept me in the dark a long time, Keeper. I don't mind the dark so much now. I mind it for them.` : `I'm handing out blankets. Tuesday's carrying the soup. Don't laugh, she's good at it.`, when: { fate: ['eren', 'alive'] }, skip: 'a5' },
        { who: 'hessa', mood: 'neutral', say: `I sit by his stool. His flame's still burning. He's somewhere.`, when: { notFate: ['eren', 'alive'] }, skip: 'a6' },
        { who: 'veska', mood: 'ashamed', say: `I've been reading names to people all night. Who went below. Who came back. They have a right to hear it from me.`, when: { fate: ['veska', 'testifies'] }, skip: 'a7' },
        { who: 'sereth', mood: 'neutral', say: (g) => flag(g, 'serethDoubts') ? `I cut the bells off. I didn't know what else to do with my hands.` : `She's awake. Someone who loves her should be there when she opens her eyes.`, when: { has: ['met:sereth'] }, skip: 'r0' },
        { who: 'sereth', mood: 'broken', say: `Keeper. Where did the Precentor go?`, when: { has: ['serethDoubts', 'corvinExposed'] }, skip: 's0', choices: [
          { label: '"Below. To her."', goto: 'martyr', fx: [{ fate: ['sereth', 'martyr'] }] },
          { label: '"Stay. They need a healer here more than you need him."', goto: 'stay', fx: [{ fate: ['sereth', 'broken'] }, { resolve: 1 }] },
        ] },
      ]),
      s0: { who: 'narrator', variant: 'read', say: `Sereth kneels beside a wounded miner and goes back to work.`, when: { has: ['serethDoubts'] }, skip: 's1', fx: [{ fate: ['sereth', 'broken'] }], next: 'r0' },
      s1: { who: 'narrator', variant: 'read', say: `Sereth buttons his coat and goes down the Stair. He does not take a lantern.`, fx: [{ fate: ['sereth', 'faith'] }], next: 'r0' },
      martyr: { who: 'sereth', mood: 'broken', say: `Then that's where I'm going. Someone has to ask him why.| Pour me nothing, Bet. I'll be back for it.`, next: 'r0' },
      stay: { who: 'sereth', mood: 'broken', say: `...Yes. All right. Yes.| Hold this. I need both hands.`, next: 'r0' },
      ...chain('r', [
        ['ilvane', 'neutral', `I copied it off the inside of the Sixth Door. It's open, by the way. You'll want to know that.| I'll read it once. I don't think I can do it twice.`],
        { who: 'narrator', variant: 'read', say: `Hush now, Mother of Five. We give you five dreams to keep. To the Red, a forge that never cools, that she may rage asleep. To the Green, a garden of the dead, that she may grow and grieve.` },
        { who: 'narrator', variant: 'read', say: `To the Black, a drowning library, that she may hoard and never leave. To the White, a hall of mirrors, that she see no face but hers. To the Blue, a sky of falling stars, that she chase what never stirs.` },
        { who: 'narrator', variant: 'read', say: `Light a lamp for every dream, and let the lamps burn low. Break no dream that she is dreaming. Let no lantern-bearer go behind the doors to end them.` },
        { who: 'narrator', variant: 'read', say: `But should the dreaming fail, raise a champion at the height of power, for nothing less avails.` },
        ['ilvane', 'neutral', `"Break no dream that she is dreaming."| No. Not now.| No.`],
        ['bet', 'neutral', `...Right.| Who's hungry. Nobody's hungry. I'm cooking anyway.`],
        ['bet', 'neutral', `This is a muster hall now. Everyone who wants to help, tell me. I was a quartermaster once. I can be one again.`],
      ], { end: true, fx: [{ evidence: 'E9' }, { flag: 'met:ilvane' }] }),
    } }),

  // ── The Muster ──────────────────────────────────────────────────────────
  S({ id: 'muster.hearths', where: 'muster', speaker: 'hessa', title: 'Kiln Row\'s hearth-flames', when: { awakened: true, not: ['muster:shelter.hearths'], trust: ['kilnrow', 2] }, start: 'a0',
    nodes: chain('a', [
      ['hessa', 'neutral', `I won't leave without the flames. None of us will. You understand?`],
      ['narrator', undefined, `You carry them up the Stair in clay pots, forty-odd small blue fires, one for every family on Kiln Row. Nobody drops one.`],
      ['hessa', 'neutral', `There. We can sleep anywhere now.`],
    ], { end: true, fx: [{ muster: 'shelter.hearths' }, { resolve: 1 }, { trust: ['kilnrow', 1] }] }) }),

  S({ id: 'muster.assembly', where: 'muster', speaker: 'veska', title: 'Kiln Row\'s assembly', when: { awakened: true, not: ['muster:unite.assembly'], any: ['fate:veska:testifies', 'fate:sereth:broken'], resolve: 5 }, start: 'a0',
    nodes: chain('a', [
      { who: 'veska', mood: 'ashamed', say: `I'll read the names. All of them. Then you tell them what you found.`, when: { fate: ['veska', 'testifies'] }, skip: 'a1' },
      { who: 'sereth', mood: 'broken', say: `I tended half of them. They'll listen to me. I'll tell them what I believed, and then what I found.`, when: { fate: ['sereth', 'broken'] }, skip: 'a2' },
      { who: 'narrator', variant: 'read', say: (g) => { const ev = ['E1', 'E2', 'E3', 'E6', 'E8'].filter((e) => flag(g, `ev:${e}`)).map((e) => ({ E1: 'the manifest', E2: 'Hessa\'s tally', E3: 'the cult\'s roster', E6: 'the letter signed P.', E8: 'Veska\'s ledger' } as Record<string, string>)[e]); return `The Low Lantern is full to the walls. You read them ${ev.length ? ev.join(', ').replace(/, ([^,]*)$/, ' and $1') : 'everything you know'}. Nobody speaks for a long time.`; } },
      ['hessa', 'neutral', `We paid her due. We paid it in coin and in children.| We're done paying.`],
    ], { end: true, fx: [{ muster: 'unite.assembly' }, { resolve: 1 }] }) }),

  S({ id: 'muster.guild', where: 'muster', speaker: 'maren', title: 'The Guild\'s apology', when: { awakened: true, has: ['muster:unite.assembly'], not: ['muster:unite.guild'], resolve: 7 }, start: 'a0',
    nodes: chain('a', [
      ['maren', 'neutral', `I posted every Aldane bounty myself. I read the names on the Wall every morning, and then I posted his bounties.`],
      ['maren', 'neutral', `They're down. All of them. And I'll stand on the Guild steps and say why, to anyone who asks and most who don't.`],
      ['maren', 'neutral', `The Guild owes Kiln Row a winter. We'll start paying it now.`],
    ], { end: true, fx: [{ muster: 'unite.guild' }, { resolve: 1 }] }) }),

  S({ id: 'muster.light', where: 'muster', speaker: 'bet', title: 'Light the Keep', when: { awakened: true, has: ['muster:unite.guild'], not: ['muster:unite.light'], resolve: 8 }, start: 'a0',
    nodes: chain('a', [
      ['bet', 'neutral', `The tower lanterns were lit from her dreams. That's done. So we'll light them from mine.`],
      ['narrator', undefined, `One by one, every household in the Keep carries a flame from the Low Lantern's door up the hill. Kiln Row's blue flames go with them. By midnight the tower is burning ordinary oil.`],
      ['bet', 'warm', `There. Now it's ours.`],
    ], { end: true, fx: [{ muster: 'unite.light' }, { resolve: 2 }] }) }),

  // ── Epilogue ────────────────────────────────────────────────────────────
  S({ id: 'epilogue.lastLight', where: 'tavern', speaker: 'bet', title: 'The Last Light', when: { has: ['slain'] }, priority: 300, auto: true, start: 'a0',
    nodes: { ...chain('a', [
      ['bet', 'neutral', `There you are.`],
      { who: 'narrator', say: `She sets a glass on the bar. The Last Light. On the house.`, variant: 'read' },
      ['bet', 'warm', `On the house.| Don't get used to it.`],
      { who: 'bet', mood: 'grief', say: (g) => { const f = g.roster.filter((h) => h.status === 'dead').map((h) => h.name); return f.length ? `${f.join('.| ')}.| (She pours a glass for each, and sets them on the candle shelf.)` : `(She looks at the candle shelf for a long moment. Every candle is pinched out. Every one of them came home.)`; } },
      { who: 'eren', mood: 'grin', say: (g) => flag(g, 'erenScarred') ? `So there I was, tied to a mirror, and Tuesday just walks in —| Fine. Fine, it was a different story last time. It gets better every time.` : `So there I was, and Tuesday just walks in —| Bet. Bet, I'm telling it.`, when: { fate: ['eren', 'alive'] }, skip: 'a5' },
      { who: 'hessa', mood: 'neutral', say: (g) => fate(g, 'eren') === 'captured' ? `His flame went out last night. I let it.| Pour him one, Bet.` : `Pour one for the ones who stacked her gold, Bet.`, when: { notFate: ['eren', 'alive'] }, skip: 'a6' },
      { who: 'veska', mood: 'neutral', say: `I'm doing the Keep's books now. Someone has to. I write the return dates in ink.`, when: { fate: ['veska', 'testifies'] }, skip: 'v0' },
      { who: 'narrator', variant: 'read', say: (g) => ({ martyr: `Five small brass bells hang over the bar now.`, faith: `A folded healer's apron lies on the end of the bar. Sereth did not come back.`, broken: `Sereth is in the corner with a miner's arm in a sling, talking him through it.` } as Record<string, string>)[fate(g, 'sereth') ?? ''] ?? `The corner where the grey robes used to sit is empty.` },
      { who: 'narrator', variant: 'read', say: (g) => fate(g, 'corvin') === 'captive' ? `Somewhere in the Keep's cells, Corvin Aldane is writing letters nobody will send.` : `A letter came for you this morning. Unsigned. It says only: "Splendidly done."` },
      { who: 'bet', mood: 'warm', say: `You said. Before any of us. I remember you said.`, when: { has: ['warned'] }, skip: 'a10' },
      ['bet', 'warm', `To those who come back.`],
    ], { end: true, fx: [{ flag: 'epilogueSeen' }] }),
      v0: { who: 'narrator', variant: 'read', say: `A letter from the Keep's cells, in a registrar's careful hand: every name on her ledger, and beside each one, at last, a date.`, when: { fate: ['veska', 'imprisoned'] }, skip: 'a7', next: 'a7' },
    } }),

  // ── Regulars (repeatable small talk) ────────────────────────────────────
  S({ id: 'bet.idle', where: 'tavern', speaker: 'bet', title: 'Talk to Bet', when: { has: ['seen:bet.intro'] }, repeat: true, priority: -10, start: 'a0',
    nodes: { a0: { who: 'bet', mood: 'neutral', end: true, say: (g) => {
      if (flag(g, 'slain')) return `Quiet down there now, they tell me. Ordinary monsters. I'll take ordinary.`;
      if (stage(g) >= 5) return `Every bed's full and every pot's on. Go and kill her, love. I'll keep the soup warm.`;
      return [`One candle per party. Yours is lit while you're below. Don't make me wait.`, `I don't do prophecy. I do last orders.`, `The Kiln-Row Stout's Hessa's. Don't tell her I said it's good. She knows.`, `You look like you need a drink or a bath. I sell one of those.`, `Frost, ink, hot hearths. Every time you come back up, something in this town is wrong. I'm just saying.`][g.profile.townDay % 5];
    } } } }),
  S({ id: 'eren.idle', where: 'tavern', speaker: 'eren', title: 'Talk to Eren', when: { has: ['seen:bet.intro'], notFate: ['eren', 'captured'] }, repeat: true, priority: -10, start: 'a0',
    nodes: { a0: { who: 'eren', mood: 'grin', end: true, say: (g) => {
      if (flag(g, 'slain')) return `I'm buying a boat. I've never seen the sea. Tuesday hasn't either. We'll be terrible at it together.`;
      if (stage(g) >= 3) return `I count everything twice now. Crates. Stairs. People. Especially people.`;
      return [`I lost again. But I lost less. That's a trend.`, `Tuesday's a mule. Bought her on a Tuesday. She's been a Tuesday ever since.`, `Half my pay goes to my mother. The other half goes to Joss, apparently.`][g.profile.townDay % 3];
    } } } }),
  S({ id: 'sereth.idle', where: 'tavern', speaker: 'sereth', title: 'Talk to Sereth', when: { has: ['seen:sereth.intro'], notFate: ['sereth', 'faith'] }, repeat: true, priority: -10, start: 'a0',
    nodes: { a0: { who: 'sereth', mood: 'neutral', end: true, say: (g) => fate(g, 'sereth') === 'broken' ? `I still know how to set a bone. That's something to believe in, it turns out.` : stage(g) >= 4 ? `Four heads stirring. I should be glad. I keep waiting to be glad.` : `Bring them to me before you go down. A clean dressing is worth a prayer, whoever you pray to.` } } }),
];
