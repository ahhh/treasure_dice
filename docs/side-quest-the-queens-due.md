# The Queen's Due
### A Lantern Keep side quest, the Low Lantern tavern, and NES-style dialogue boxes

*Design and implementation plan · draft 2 · 2026-11-08 · **implemented** (see §18)*

---

## 0. Summary

**The Queen's Due** is an optional questline that runs alongside the main campaign. It reinforces the twist and doesn't compete with it. The twist: **every echo the player breaks wakes one of Tiamat's heads.** The Keep thinks it is stopping her. It is actually waking her.

All of it happens in places that already exist: the Lantern Keep and the five echoes below. The plan adds **one new Keep location, the Low Lantern** (a tavern), **four recurring characters** plus one hidden antagonist, a **lead → Cartographer → dungeon room → consequence** loop built on the run loop players already have, and a **dialogue box system** in the style of NES and SNES-era RPGs. The whole Keep can then speak through those boxes.

Story beats are triggered by **heads awakened** (echoes cleared). They are never triggered by hero level. The quest never changes the existing rules for the finale (all five echoes cleared plus a level-20 hero). It changes **how the Keep is standing when the player walks through the Sixth Door**, and who is left in the bar afterwards.

### What this plan changes from the notes

| Notes said | Plan does | Why |
|---|---|---|
| "Cult of the Dragon" | **The Dragon's Choir** (members say "the Choir") | Cult of the Dragon is a Forgotten Realms name, not SRD 5.2.1 content. The game plan's legal boundary (§8) rules it out. An original name also lets us tie the cult to the lore (a choir that sings the binding lullaby in reverse). |
| "Cartographee" | **Cartographer** | Matches the existing tab. |
| The five bindings are new lore | The bindings are **the echoes themselves**: Tiamat's five dreams | The prologue already says the echoes are her heads' dreams. A dragon kept dreaming stays asleep. That reinterprets the existing text without rewriting it. |
| The cult is faceless | Optional face: **Corvin Aldane**, a genial human patron who is secretly the Choir's **Precentor** | A cult needs a human-scale villain. Making him a non-Dragonborn who hides behind Dragonborn followers sharpens the theme of exploitation. He can be cut without breaking anything. |
| The bindings' power source is unspecified | **The Keep's lanterns are lit by the dreams.** When a dream ends, its lantern flares and dies. **The Low Lantern burns ordinary oil**, so it is the only light that survives the awakening. | One image ties the existing text ("a second lantern flares, then dims") to the tavern's emotional payoff. |
| Finale untouched | Still untouched. The quest adds small **Muster boons** to the finale run and decides the epilogue. | Keeps your calibrated Tiamat fight (100% campaign wins on standard, about 40% on perilous) within its bands. |

### Decisions (settled 2026-11-08)

1. The cult is **the Dragon's Choir**, and the game calls it a cult, out loud, in its own people's mouths ("They call us a cult up here. I suppose we are.").
2. **Corvin Aldane is the cult's leader**, the Precentor.
3. **Eren can be lost.** If his timed lead runs out he is captured; the Muster's *Bring the hands home* can still bring him back, scarred. If it never does, his flame goes out in the epilogue.
4. **All eight facility keepers have portraits.**
5. **Quest rooms spawn in about one run in three** (33%), and always by the third try on that echo (pity), so a lead can't be starved by bad luck. Every quest room has **its own room scene and its own event vignette**.

---

## 1. The secret history (write the truth first)

Your notes asked for this: write what the prophecy actually means before writing anyone's distortion of it. Everything below is **canon the writers know** and the player pieces together in order.

### 1.1 What really happened

Long ago Tiamat came into the world: a manifestation of her, not her divine body. Five heroes could not kill her. **They put her to sleep instead.**

A five-headed dragon doesn't stay asleep easily. Each head wakes on its own. So the five wardens gave **each head a dream to keep**, a world built to fit its hunger:

| Head | Breath | The dream it was given | Today's echo |
|---|---|---|---|
| Red | fire | A forge that never cools, so she can rage in her sleep | **The Cinder Vaults** |
| Green | poison | A garden of the dead, so she can grow and grieve | **The Rootbound Halls** |
| Black | acid | A drowning library, so she can hoard and never leave | **The Drowned Archive** |
| White | frost | A cathedral of mirrors, so she sees nothing but herself | **The Mirror Reliquary** |
| Blue | lightning | A sky of falling stars, so she can chase and never catch | **The Starfall Ossuary** |

(The head-to-echo mapping is the one already in `HEADS` in `src/content/story.ts`.)

**Every dream has something at the bottom of it.** The nightmare grows where a dream is deepest. This is the boss: a real, hostile, dangerous thing. It is no noble guardian and it doesn't love you. But a dream ends when its nightmare dies, and **when the dream ends, the head wakes.**

The wardens set a door in front of each dream and a sixth in front of the sleeper. They built a watch-house on the mountain above, and lit a lantern from each dream's light so the watchers could see the dreams were holding. **The doors were hidden to keep people out, not to keep her in.**

They carved instructions on the inside of the Sixth Door and on the gate of the watch-house: **the Wardens' Lullaby.**

### 1.2 The Wardens' Lullaby (the true text)

> *Hush now, Mother of Five. We give you five dreams to keep.*
> *To the Red, a forge that never cools, that she may rage asleep.*
> *To the Green, a garden of the dead, that she may grow and grieve.*
> *To the Black, a drowning library, that she may hoard and never leave.*
> *To the White, a hall of mirrors, that she see no face but hers.*
> *To the Blue, a sky of falling stars, that she chase what never stirs.*
>
> *Light a lamp for every dream, and let the lamps burn low.*
> *Break no dream that she is dreaming. Let no lantern-bearer go*
> *behind the doors to end them. But should the dreaming fail,*
> *raise a champion at the height of power, for nothing less avails.*

The last line is already in the game. **Chapter III** quotes it: *"Only a champion at the height of their power can stand before her."* Out of context it reads as a mission. In context it is a **contingency clause**: *if someone is foolish enough to wake her, this is what you'll need.*

### 1.3 How the Keep got it wrong (honestly)

Centuries passed and the watch-house became a town. The gate inscription weathered. The founders' grandchildren copied what they could read and filled the gaps with what made sense to people who lived above a door full of monsters:

> **The Lantern Charge** *(as carved over the Keep gate today; worn words in brackets)*
> *Light a lamp for every [dream] …*
> *Break [ … ] dream that she is dreaming …*
> *… behind the doors to end them …*
> *… a champion at the height of power …*

The Keep reads it as: *Light a lamp at every door. Break every dream she is dreaming. Go behind the doors and end them. Raise a champion at the height of power.*

That is the existing Prologue. **Nobody lied. They misread a rock.** The Guild, the Chronicle and the Keep are acting in good faith on a damaged text.

The echoes "growing stronger while they stand" is a real observation, misread too: a sleeper's dreams get deeper as the sleep gets deeper. The guttering lanterns aren't a sign that she is rising. They are old lamps on old dreams.

### 1.4 What the Dragon's Choir knows, and what it did

The Choir has a copy of the full Lullaby. Its founders found the wardens' chart (the one the player finds in Chapter III) generations ago. They didn't forge the prophecy. **They let the Keep keep its mistake.** That is worse.

What they actively did:

- **Sang it backwards.** The Choir's hymn, *the Waking Hymn*, is the Lullaby reversed line by line. Members believe singing it helps the Queen wake gently and remember who loved her.
- **Funded the expeditions.** Through the *Aldane Expeditionary Trust* they sponsor the Guild's most generous commissions: bounties on the bosses. The Guild is grateful for the money.
- **Collected the Queen's Due.** Tribute in coin, lamp oil and labour, taken from Dragonborn families in Kiln Row in exchange for protection, credit and food in bad winters. The coin goes below. **It becomes the hoard she wakes on.** (The existing finale: *"Tiamat waits on a throne of stolen gold."* It's the Keep's gold.)
- **Sent "hands" below.** Workers listed as cargo carry the Due down to the Sixth Door and pile it into a throne. Some came back. Fewer each season.
- **Circulated one real forgery**: *the Sixth Verse*, a pamphlet promising that "those who paid the Queen her due shall stand beside her when she wakes." This is the lie that keeps Kiln Row paying.

Most Choir members know none of this. They know the hymn, the soup kitchen, and that someone finally showed up for them when the Keep didn't.

### 1.5 The reveal schedule

| Heads awake | What the player can know |
|---|---|
| 0 | The Keep's version. A missing shipment. |
| 1 | Workers are being shipped below as cargo. |
| 2 | The Choir pays for the expeditions. |
| 3 | The relics were built to **contain**, not destroy. The Due is being carried *to the Sixth Door*. |
| 4 | The gate inscription read in a mirror shows **"BREAK NO—"**, and the next letter is cracked. *No? Now?* The player can suspect. They can't confirm. |
| 5 | The full Lullaby. Every earlier clue falls into place. |

---

## 2. What we borrow, and from whom

| Source | What we take | Where it shows up |
|---|---|---|
| **Dark Souls** | Kingseeker Frampt vs. Darkstalker Kaathe: the act you were told was salvation was the plan of someone else. NPC questlines that move only when the *world* moves. Lore delivered in item descriptions. A hub keeper you come home to. | Heads trigger every beat (§5). Evidence items carry the lore (§8). Bet is the hearth you return to. |
| **Elden Ring** | Characters who are named only once you earn the name ("Man in a Good Coat"). Fates you can miss and find later. Long, quiet questlines with a gut-punch ending. | Aldane's reveal. Eren's last run (§5, Act 3). Sereth's three endings. |
| **Final Fantasy** | The blue window, the ▶ cursor, the typewriter text. FFVI's *World of Ruin*: the hub you know, broken. FFX's Yevon: a sanctioned pilgrimage that feeds the cycle it claims to end. | The dialogue box (§10). The awakened Keep (§6). The Guild's commissions. |
| **Clair Obscur: Expedition 33** | A town that sends expeditions knowing many won't come back. Journals left by earlier expeditions. Grief as the main register. *"For those who come after."* | Bet's candle shelf. "Notes of earlier lantern-bearers" in quest rooms. The toast *"To those who come back."* |
| **Baldur's Gate 3** | Visible dice in dialogue checks. Companion interjections. "*X will remember that.*" Approval. An epilogue party where everyone you kept alive shows up. | d20 checks in dialogue, rolled on the box (§10.5). Your heroes chime in. Trust. The final drink (§7.4). |

---

## 3. The Low Lantern

### 3.1 The place

> *The Low Lantern is the lowest building in the Lantern Keep. It's dug into the rock at the top of the Long Stair, the last warm room before the Doors. Adventurers drink here before they go down and after they come back. The innkeeper keeps a shelf of candles behind the bar, one for every party below. She lights it when they leave and pinches it out when they come home.*
>
> *The lamp over the door is an ordinary oil lamp. Bet buys the oil herself.*

That last line is a planted gun. When the fifth head wakes, every dream-lit lantern in the Keep goes out. **The Low Lantern's lamp stays lit**, because it was never part of the binding. It is the one honest light in town, and the survivors gather under it.

### 3.2 Menu

The tab sits between **Guild Hall** and **Chronicle** in `TABS` (`src/ui/town.ts`). Its banner is `town/tavern` and changes per act (§13).

```
┌─ THE LOW LANTERN ──────────────────────────────────────────┐
│  [banner: tavern interior, Bet behind the bar]             │
├────────────────────────────────────────────────────────────┤
│  ▶ Speak to Bet                         (!)                │
│    Patrons tonight:  Eren (!) · Sereth                     │
│    Order a drink          Active: Kiln-Row Stout           │
│    Hear rumors            2 new                            │
│    Leads                  1 open · 1 new                   │
│    Candle shelf           3 candles burning                │
└────────────────────────────────────────────────────────────┘
```

- **Speak to Bet / patrons** opens a dialogue scene (§10). A **(!)** badge means a new story scene. A **(…)** badge means idle barks only.
- **Patrons tonight** changes per act. Who is present is itself a story signal (Dark Souls: an NPC missing from their usual spot means something).
- **Candle shelf** is the Wall of the Fallen as seen from the bar. One candle per living hero, pinched out for the dead (Legacy mode). Mostly flavour, but the epilogue uses it (§7.4).

### 3.3 Drinks

One drink is active at a time. It's bought in town and **consumed when the next expedition starts**. A small icon in the topbar shows it. Every effect uses Fortune tokens or hooks the game already has, so there are no new combat systems. Non-alcoholic drinks are equally strong. **No story content is gated behind a drink.**

| Drink | Price | Effect (tunable) | Notes |
|---|---|---|---|
| **House Ale** | 10 g | Start the run with a **Tonic** token | The default. "It's beer, love. It does what beer does." |
| **Kiln-Row Stout** | 15 g | The first fight begins with the party **Warded** (Guard-strength ward on each hero) | Brewed by Eren's mother, Hessa. Dragonborn culture shown through something ordinary. |
| **Spiced Mead** | 15 g | **+10% gold banked** on a won or retreated run (cap +150) | Gold sink that pays back for good players. |
| **Miner's Tea** *(non-alc)* | 10 g | Start the run with a **Mulligan Coin** | Bet: "For people who'd like to remember the stairs." |
| **Lamplighter's Cordial** *(non-alc)* | 20 g | Start the run with a **Fate Coin** token | Unlocked at Head 2. Sereth supplies the herbs, so it's quietly Choir-funded. A line in Act 4 lets the player notice. |
| **The Last Light** | free | None | Epilogue only (§7.4). |

**After the awakening** the menu shrinks to House Ale and Miner's Tea (rationing). Completing the **Shelter** track (§7.1) restores it.

### 3.4 Rumors

Rumors are short lines, **each with a named source**, refreshed every Keep day (`townDay`). Each rumor has a type and a reliability the player can judge from the source.

| Type | Purpose | Example |
|---|---|---|
| **Everyday** | Atmosphere, continuity | *Dace, a miner:* "Patrol out of the Second Door's camp never came back. Third time this month. Guild says they took the long way." |
| **Investigative** | Opens a lead (§3.5) | *A dockhand:* "Saw six lads go down the Long Stair with no lanterns and no swords. Who goes down without a lantern?" |
| **Reactive** | Reflects the changed world | *A Choir recruiter:* "Did you feel it? When the Forge went cold? She *stirred*. That was joy, friend. That was joy." |

**Source archetypes** (unnamed, no portrait; shown with a small source icon):

| Source | Reliability | Bias |
|---|---|---|
| Dace, a frightened miner | Honest, exaggerates danger | Fear |
| Ser Pellam, a boastful sellsword | Wrong about anything he didn't do himself | Ego |
| A Choir recruiter | Accurate facts, wrong conclusions | Faith |
| A Guild clerk | Accurate on paper, blind to what isn't on paper | Procedure |
| A dockhand | Sees everything, understands little | Distance |

Rule for writers: **a wrong rumor must be wrong for a reason in the source's character.** Never invent misdirection.

Write about 4 rumors per act (about 28 total). One per act is **investigative** and opens that act's lead.

### 3.5 The lead loop

```
  THE LOW LANTERN          CARTOGRAPHER             DUNGEON RUN               BACK AT THE KEEP
  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐         ┌───────────────┐
  │ Hear a lead   │──────▶ │ Lead chip on  │──────▶ │ Quest room    │───────▶ │ Consequence   │
  │ (rumor/scene) │        │ the echo card │        │ replaces one  │         │ scene, new    │
  │ Take it (free)│        │ + briefing    │        │ event room    │         │ evidence, maybe│
  └───────────────┘        └───────────────┘        └───────────────┘         │ a new lead    │
                                                                              └───────────────┘
```

- A lead is **taken** in the tavern (one click, free) and appears as a **📜 lead chip** on its echo's card in the Cartographer.
- The Cartographer stays **the only place you choose a run**. The lead doesn't force anything. It rides along if you pick that echo.
- In the run, one ordinary **event** room is swapped for the quest room (§14.5). Quest rooms follow the fairness invariant: every option resolves and none soft-locks.
- Leads normally never expire. **One exception** is a timed lead with a loud warning (Eren's last run, §5, Act 3).
- A lead can be done in a **cleared echo** on a repeat run. This matters because the quest's later beats sit in echoes already broken.

---

## 4. The cast

Four recurring characters, one hidden antagonist, and eight facility keepers who mostly bark (§12). Names are working names.

> **On the Dragonborn of Kiln Row.** Kiln Row is the Keep's Dragonborn quarter. It was settled by forge-families who came up from the old mines generations ago, and they still work the Keep's forges. Their custom: every household keeps a **hearth-flame** that is never allowed to go out while the family lives. When someone dies, their flame is let go out, not snuffed. In a town of lanterns, they have their own lights. They have trades, feuds, jokes, food (the stout) and their own reasons. **The Choir is one thing that happened to them. It is not who they are.**

### 4.1 Bet Harrowgate, keeper of the Low Lantern *(permanent)*

| | |
|---|---|
| **Look** | Human woman, late fifties. Grey hair cropped short, forearms like a smith's, an old quartermaster's coat with the insignia cut off. A rag over one shoulder that never leaves. |
| **Voice** | Dry, short sentences. Calls everyone "love" or by their usual drink. Hates prophecy talk. *"I don't do prophecy. I do last orders."* |
| **Want** | For the people who go down the Stair to come back up it. |
| **Fear** | The candle shelf. |
| **Secret** | Not a secret, just unsaid: she was quartermaster for a company that went through the Third Door twenty years ago. She came back alone and bought the bar at the top of the Stair so she'd never be the last one up again. |
| **Knows** | Everyone. Who's stopped coming in. Nothing about prophecy, and proud of it. |
| **Arc** | Watching the Keep change. She's the human record of consequence: she notices the lamp, the empty stools, Eren's absence. After the awakening, her bar becomes the Keep's muster hall, and she runs it like a quartermaster again. |
| **Fate** | **Always survives.** She is the fixed point. The room around her is what changes. |
| **Blip voice** | Low square wave, slow. |

### 4.2 Eren, a Dragonborn courier

| | |
|---|---|
| **Look** | Bronze-scaled Dragonborn man, about 24. Courier's harness, rope coiled on one shoulder, a pencil behind his frill. Grins too much. |
| **Voice** | Quick, funny, talks with his hands. Counts things out loud. Loses at dice at the bar cheerfully and constantly. |
| **Ordinary life (write this first)** | Runs crates down the Long Stair to the staging camps inside each Door's mouth, for the Provisions Office. Has a mule named **Tuesday** ("bought her on a Tuesday, she's been a Tuesday ever since"). Sends half his pay to his mother **Hessa** in Kiln Row. Saving for a boat. Has never seen the sea. |
| **Want** | The numbers to add up. |
| **Fear** | Turning into someone who stops asking. |
| **Hook** | His cousin **Tarn** is on the list of "hands." The player learns this in Act 2, not Act 0. Act 0 is just a man whose crate count is off. |
| **Arc** | Curious → personally endangered → willing to do something dangerous (Act 3) → the voice of *warn everyone* (Act 4) → depends on the player. |
| **Fates** | **Alive** (rescued in Act 3), **Captured** (Act 3 lead missed → rescuable in the Muster), **Lost** (captured and never rescued; his empty stool in the epilogue). Never killed offscreen. |
| **Blip voice** | Mid-high square wave, fast. |

### 4.3 Veska, provisions registrar

| | |
|---|---|
| **Look** | White-scaled Dragonborn woman, mid-fifties. Reading spectacles on a chain, ink on her claws, a registrar's grey coat buttoned to the throat. |
| **Voice** | Precise, tired, a clerk's politeness that turns into armour. Never raises her voice. Quotes figures when she's frightened. |
| **The compromise** | Six winters ago the Keep's guild refused credit to Kiln Row and people starved. The Choir didn't. Veska is Eren's employer. Through the Provisions Office she arranged the Due, and then the "hands": workers whose families' debts were forgiven in exchange for a season's labour below. **She has the ledger.** At first most of them came back. |
| **What she tells herself** | "They're paid. They're fed. They come home." |
| **What she knows and won't say** | Fewer came home each season. The last two seasons, none. She stopped writing return dates. |
| **Arc** | The respectable ally → the cornered accomplice → the person who decides what she is. |
| **Fates** | **Testifies** (helps unite Kiln Row), **Flees** (to the Choir), **Imprisoned** (exposed publicly by the player). |
| **Blip voice** | Clipped triangle wave. |

### 4.4 Sereth, devotee of the Dragon's Choir

| | |
|---|---|
| **Look** | Deep red-scaled Dragonborn man, thirties. Healer's apron over plain Choir grey, five small bells sewn at the collar (one per head). Steady hands. |
| **Voice** | Warm, unhurried, sincere. Asks your heroes' names and remembers them. Never preaches unless asked, and then can't stop. |
| **Belief, in his words** | *"Every people with a god who loves them gets to be a people. We had a mother once. The wardens put her to sleep and called it peace. I don't want the world to burn. I want her to wake up and see us."* |
| **What makes it more than foolishness** | He's seen what the Keep gave Kiln Row (nothing) and what the Choir gave (soup, medicine, dignity). His faith comes from **gratitude**, not hate. |
| **What he doesn't know** | The hands. The hoard. That the Precentor thinks of him as useful. |
| **Mechanic** | From Act 2, once per Keep day, Sereth **tends your heroes** before a run: a free potion-strength heal on use, as a one-shot **Tonic** token. It's genuinely good, and players will like him for it. That's the point. |
| **Fates** | **Faith Unbroken** (goes below to kneel at the throne; his voice is heard once in the Dragon Throne), **Broken** (stays and heals the Keep), **Martyr** (dies confronting the Precentor; his bells hang over Bet's bar). |
| **Blip voice** | Soft sine wave, warm. |

### 4.5 Corvin Aldane, "the Man in a Good Coat" *(optional antagonist)*

| | |
|---|---|
| **Look** | Human man, sixties, silver hair, beautiful plum coat, a cane with a gold dragon-egg pommel. Generous smile. |
| **Public face** | Head of the **Aldane Expeditionary Trust**, the sponsor behind the Guild's best bounties. Buys rounds for heroes. |
| **Truth** | **The Precentor** of the Dragon's Choir. Signs documents "P." Knows the full Lullaby. Believes the world after her waking belongs to those who prepared her throne. |
| **Elden Ring treatment** | In Acts 0–1 he's **"???"** in the nameplate, then **"Man in a Good Coat"**. He's named only when Eren finds the Trust's ledger (Act 2). He's exposed as the Precentor only if the player holds the right evidence in Act 4. |
| **Fates** | **Exposed** (flees below; appears as an optional elite in the Dragon Throne run), **Captured** (if the Break track completes), **Untouched** (he simply leaves the Keep before the awakening, and a letter arrives in the epilogue). |

---

## 5. The quest, act by act

> **Pacing change from draft 1.** With rooms spawning one run in three, each act's lead now points at the **next** echo, the one the player is about to fight, so leads are found on the way forward instead of asking for repeat runs. Shipped mapping: Act 0 → *The Short Count* (Cinder); Act 1 → *Kiln Row* (town) and *The Supply Station* (Rootbound); Act 2 → *The Tithe Barge* (Drowned, the Precentor's letter); Act 3 → *Eren's Last Run* (Mirror, timed: 4 expeditions) and *The Reflected Charge* (Mirror); Act 4 → *The Throne Road* (Starfall, Tarn). The Warden's Lamp-Glass (E5) is granted automatically on the first Drowned clear. The Muster's lead tasks use four more rooms (Cinder, Rootbound, Drowned, Starfall). The act-by-act text below is the original draft; where it differs, the code and §18 win.

Each act begins on **return from the expedition that cleared that echo for the first time** (`story.seen` gains the biome). The quest state machine (§14.2) reads `heads = echoes cleared`. **It never reads hero level.**

Each act below lists: the **Keep's mood**, the **head's sign** (§6 has the Keep-wide reaction), the **scenes**, the **lead and quest room**, the **evidence**, and the **story question**.

### Act 0: Before the first door *(0 heads)*

**Opens:** after the guided tour ends or is skipped, or on Day 2, whichever comes first. The Low Lantern tab appears with a **(!)**.

**Mood:** warm, busy, normal. This is the "before" picture. The player has to like the place before it changes.

**Scene 0.1: "Last Orders" (Bet, Eren).** *Hand-written. Full draft in §16.1.*
Bet introduces herself and the candle shelf. Eren loses a dice game at the next table and borrows two silver from the player's heroes to stay in it. *(The player can lend it; Eren pays it back with interest in Act 1. A small trust signal.)* He mentions, in passing, that his last crate count down the First Door was off: forty sacks of lamp oil and **"six of something I didn't load."** He laughs it off.

**Lead L0: "The Short Count"** (Cinder Vaults)
> Eren: "If you're going through the First Door anyway, there's a supply cart stuck on the rail cut past the gate. Mine's the one with the bad wheel. Manifest's in the lockbox. I'd owe you a drink."

**Quest room: *The Stalled Cart*** (replaces one Cinder event room; scene art `events/q_stalledCart`)
> *A rail cart sits tipped against the wall of the cut, its wheel shattered. Sacks of lamp oil, a crate of hardtack, and a brass lockbox chained to the frame. Six sets of boot-prints lead away from it, deeper in. None lead back.*

| Option | Check | Result |
|---|---|---|
| Pick the lockbox | Sleight of Hand DC 12 *(Knock auto)* | Evidence **E1 The Short Count** + small gold |
| Break the chain | Athletics DC 13 | E1, cart crushes a foot (5% HP) |
| Follow the boot-prints | Survival DC 13 | E1 found later, dropped on the trail, + **reveal** (map) |
| Take the oil and go | — | E1 (it's on the floor), +1 doubloon. Eren notices later: "You took my oil? …Fair." |

Every option yields E1. **Fairness invariant:** the evidence can't be missed once you're in the room.

**Story question:** *Why does a supply manifest count people?*

---

### Act 1: The Red Head wakes *(Cinder cleared)*

**Head's sign:** the night the Deep Forge went cold, **every lamp in the Low Lantern went out at once, then relit itself.** Every hearth in the Keep burned too hot for an hour. Kiln Row's hearth-flames flared blue. The Chronicle records the victory. Bet records the lamps.

**Scene 1.1: "Hands" (Eren, Bet).** *Hand-written.*
If the player has E1, Eren reads the manifest. The line reads **"Hands, 6 — Due. Rec'd V."** He's never carried hands. He's never heard of anything called the Due. And "V." is Veska's initial. He doesn't want to say that out loud yet.
If the player doesn't have E1, Eren mentions that the cart was "cleaned out" when he went back. The lead stays open.

**Scene 1.2: Bet on the lamps** (one-off bark). *"Every lamp in my house went out. Same moment the Forge went cold, they tell me. I've been pouring drinks under this roof eleven years. They don't go out. …Probably the draught."* She doesn't believe that, and the player shouldn't either.

**Scene 1.3: Veska arrives** (introduction, ordinary). She comes into the bar to collect Eren for a late shift, polite and brisk. She thanks your heroes for clearing the First Door: *"The camps below will be safer for my runners. That's no small thing."* It's true, and she means it.

**Bark: the Man in a Good Coat buys a round.** *"To the heroes of the First Door! Put it on the Trust, Mistress Harrowgate."* Nameplate: **???** Bet: *"Generous man. Can't stand him. Can't say why."*

**Rumors open:** the dockhand's six lads with no lanterns.

**Lead L1: "Kiln Row's Empty Chairs"** (town-only lead, no dungeon)
Talk to Hessa (Eren's mother; a voice with no portrait, spoken through Eren) by choosing **Kiln Row** from the tavern's patron list for one evening. You learn the Due is a tithe; the hands are "debt-labour, a season below, then home." Tarn went down last spring.
→ Evidence **E2 Hessa's Tally** (a list of names and seasons, in a mother's handwriting).

**Story question:** *Why are workers being sent below under false records?*

---

### Act 2: The Green Head wakes *(Rootbound cleared)*

**Head's sign:** the Apothecary's herbs **bloomed overnight and rotted by morning.** A smell of wet graves in the Low Lantern's cellar. Kiln Row's children dreamt of a garden.

**Scene 2.1: "The Trust" (Eren).** *Hand-written.*
Eren has been at the Guild's records after hours. Every big bounty on the bosses is sponsored by the **Aldane Expeditionary Trust**, and the Trust's accounts are kept at the same counting-house as the Due. *"Somebody is paying you to break those doors, and paying my mother's neighbours to dig under them. That's the same purse. Why is it the same purse?"*
→ The Man in a Good Coat's nameplate becomes **Corvin Aldane**.

**Scene 2.2: "Sereth" (first appearance).** *Hand-written. Draft in §16.2.*
Your party comes home battered. A red-scaled healer at the foot of the stair is already working. He treats your heroes without asking for anything, asks their names, remembers them. If asked, he explains what the Choir is to him. **This is the scene that has to make the player like him.** Unlocks **Sereth's tending** (§4.4) and Lamplighter's Cordial.

**Optional check:** *[Insight DC 14]* "He means every word of it." / *[Religion DC 13]* "The five bells: one per head. That's a Tiamat devotional, not a healer's habit." Both are true. Neither makes him a villain.

**Lead L2: "The Supply Station"** (Rootbound Halls)
> Eren: "The Choir has a camp in the Second Door. Not a Guild camp. Theirs. Hessa says Tarn wrote from there once."

**Quest room: *The Choir's Grove*** (replaces a Rootbound event room; `events/q_choirGrove`)
> *Someone has cleared the spores from this grove and hung lanterns with no flame, only grey cloth. Crates stamped with five open mouths. Two Choir wardens and an Ash Cultist stand over a bedroll where a young Dragonborn sleeps in chains.*

| Option | Check | Result |
|---|---|---|
| Fight | Elite combat: 2 **Choir Wardens** + 1 Ash Cultist | E3 + **free the worker** |
| Talk them down | Persuasion DC 15 *(or Intimidation DC 15)* | E3, worker freed, no fight |
| Watch and follow | Stealth DC 14 | E3 + **E4 The Hymnal Page** (they read from it before leaving). Worker not freed. |
| Leave | — | Lead stays open; can return. |

→ **E3 The Grove Roster:** a list of hands, with seasons, and *no return dates* for the last two seasons. Tarn's name is on it.
→ **Freed worker (Ilo):** shows up at the Low Lantern the next day as a new patron. Small trust gain with Kiln Row. Ilo says the hands carry "the Due" deeper. *"Down to the big door. We stack it. That's all. We stack it."*
→ **E4 The Hymnal Page:** a verse that reads like a lullaby, but wrong. (It's the Lullaby's last four lines, reversed. Players who later read the true text can spot it.)

**Story question:** *Why is a cult devoted to Tiamat paying adventurers to fight the monsters beneath the Keep?*

---

### Act 3: The Black Head wakes *(Drowned cleared)*

**Head's sign:** the Keep's wells **taste of ink and brass.** In the Vault, coins tarnish **black in rings**, as if something wet had sat on them. A Choir procession in Kiln Row the next morning. Not everyone in the bar likes it.

**The bar changes.** Some patrons won't go below anymore. Others say the disturbances prove Tiamat is *desperate*, and that's why you should press on. Dace the miner stops coming in. Two Choir members drink in the corner and stop talking when your heroes pass.

**Scene 3.1: "Containment" (Eren, the Enchanter).** *Hand-written.*
The player found the wardens' chart in the Drowned Archive (existing Chapter III). With the quest active, they also recovered **E5 the Warden's Lamp-Glass**, a lens from the boss vault. The Enchanter (§12) reads its rune: *"It's not a weapon. It's a cradle. This was made to hold something still, gently, for a very long time."*
Eren puts it together with Ilo's "we stack it" and the Trust's money:
*"They're not digging. They're **carrying**. The Due goes to the Sixth Door. Somebody's building something down there, and they're paying you to clear the road."*

This is where Eren changes. He's done asking. He's going to go and look.

**Lead L3: "Eren's Last Run"** *(timed: 2 expeditions; warned loudly)*
Bet, the next time you visit: *"Eren took Tuesday and a crate of nothing down the Third Door last night. No lantern. Said if he wasn't back in two days I should tell you. It's been one."*
The Cartographer's Drowned card shows **📜 Eren's Last Run — 2 expeditions left.** Each expedition (to any echo) counts it down.

**Quest room: *The Pump Room*** (Drowned mechanism room; `events/q_pumpRoom`)
> *Tuesday the mule stands shin-deep in black water, perfectly calm. Behind her, Eren is bound to a pump wheel. Two Tide Cultists are arguing about the water level, and about whether he can swim.*

| Option | Check | Result |
|---|---|---|
| Fight | Combat: 2 Tide Cultists + 1 Choir Warden | Eren **rescued** |
| Drop the water | Pump lever (biome mechanic; no check) | Cultists flee, Eren rescued, half the gold |
| Bluff them | Deception DC 14 | Eren rescued, Cultists leave a **E6 Precentor's Letter** behind |

→ **E6 Precentor's Letter** (also drops in the fight): *"The road is nearly clear. The heroes are doing splendidly. Keep the Keep grateful. — P."*

**If the timer runs out:** Bet's candle for Eren is pinched out on the shelf. Hessa's hearth-flame is still lit. Eren is **Captured**, not dead, and becomes a rescue task in the Muster. This is an Elden Ring fate: missable and devastating, but never final until the epilogue.

**Story question:** *What were the Doors built to hold?*

---

### Act 4: The White Head wakes *(Mirror cleared)*

**Head's sign:** frost on the inside of every window. **The mirror behind Bet's bar shows the room a heartbeat late.** Once, when the player opens the tab, it shows a hall of gold instead (a one-time image swap in the banner art).

**Visible instability around the Doors.** People are now asking out loud whether the victories are making things worse. The Guild posts a notice: *"Disturbances are the Queen's death throes. Press on."*

**Evidence: *The Reflected Charge*** (Mirror quest room, **Talking Mirror** variant; `events/q_reflectedCharge`)
> *The Talking Mirror doesn't talk tonight. It shows the Keep's gate, centuries younger, with the Lantern Charge freshly cut. Every word is there. You lean in to read the worn line, and the glass cracks across it.*

→ **E7 The Reflected Charge:** *"Break no— dream that she is dreaming."* The letter after "no" is under the crack. **No? Now?**
The Guild and the Chronicle will read "Break now." Eren reads "Break no." **The game doesn't say which.** See §5.7.

**Scene 4.1: "Veska's Ledger" (confrontation).** *Hand-written. Draft in §16.3.*
With E3 or E2, the player can confront Veska. Her responses depend on what the player holds:

| Player has | Veska… |
|---|---|
| E3 (Grove Roster) | Admits the hands. Defends it: famine, credit, *"Your Keep let us starve."* |
| + E6 (Precentor's Letter) | Goes quiet. She didn't know about "P." She knew Aldane. |
| + Eren rescued, present | Can't look at him. Tarn is on her ledger. |
| + E5 / Ilo freed | Breaks. Hands over **E8 Veska's Ledger**, every name and every missing return date. |

**Player choice** (BG3: *"Veska will remember that."*):
- **"Help me make it right."** → Veska **Testifies** (path to Unite).
- **"The Keep deserves to know what you did."** → Veska **Imprisoned**. The Keep trusts the player more; Kiln Row trusts them less.
- **Say nothing, leave.** → Veska **Flees** to the Choir that night.

**Scene 4.2: "Three Voices" (Eren, Veska, Sereth).** *Hand-written. The most branching scene in the quest.*
At the bar, the three argue over the evidence the player has actually found. Each claim in the argument is gated by an evidence flag. A player with only E1 and E3 sees a shorter, angrier argument. A player with everything sees Sereth realise, in real time, that the Choir took Tarn.
- **Eren:** warn the Keep. Stop the expeditions if you have to.
- **Sereth:** *"You've read a cracked mirror and decided it's a curse. I've read the hymn every day of my life. She is waking because it is time."* (He hasn't seen the hoard, the letter or the ledger yet. Showing him E6 or E8 here is the hinge for his fate.)
- **Veska** (if present): *"Stop the expeditions and the Choir stops paying, and Kiln Row starves again. You want to warn them? Warn them about that too."*

**Aldane exposed** if the player holds **E4 + E6** (the hymn page and the "P." letter). Eren matches the handwriting with the Trust's sponsorship slips. Aldane's nameplate becomes **The Precentor**. He's gone from the Keep the next morning.

**The Warning choice** (in the Chronicle, §5.7):
- **Warn the Keep** (requires E7 + any two of E3/E6/E8) → The Chronicler records a **Dissent** in the Chronicle. The Guild refuses to stop: *"Four heads are loose already and the fifth echo is collapsing on its own. Do you want her to wake with no one at the door?"* But people listened. **+2 Resolve** (§7), shelters prepared early.
- **Keep investigating** → no penalty, no bonus.

**Story question:** *Have the expeditions been weakening the prison instead of strengthening it?*

---

### Act 5: The Blue Head wakes. Tiamat awakens. *(Starfall cleared)*

**Head's sign:** lightning hits the lantern tower. **Every lantern in the Lantern Keep goes out**: the great tower lamps, the Guild's sconces, the Chronicle's reading lamps. They were all lit from the dreams. Kiln Row's hearth-flames gutter blue and hold.

**One lamp stays lit: the one over the Low Lantern's door.** Bet buys her oil.

**The Keep enters an emergency state** (§6). The topbar title becomes **The Lantern Keep: Under the Dragon**. The tavern tab moves to the top of the nav and gets a red badge.

**Scene 5.1: "The Only Light" (everyone).** *Hand-written. The strongest scene in the quest. Draft in §16.4.*
The player comes home to a dark town and walks to the only lit window. It's full: miners, Guild clerks, Kiln Row families, two Choir members who look as if someone told them a lie. Bet is pouring. Who else is there depends on every fate so far:
- Eren (if rescued) is handing out blankets. If captured, his stool is empty and Hessa sits next to it.
- Sereth: **Faith Unbroken** (he's at the door, coat on, going below: *"She's awake. Someone who loves her should be there."*), **Broken** (he's kneeling by a wounded miner, bells cut from his collar), or **Martyr pending** (he asks where the Precentor went).
- Veska: testifying to a crowd, in a cell, or absent.

Then the Chronicler arrives with the **full Lullaby**, taken from the inside of the Sixth Door, which now stands open. They read it aloud. **This is the reveal.** Every earlier piece of evidence gets a one-line "now you understand" annotation in the evidence journal.

**Head-voice beat:** the first time the player opens any tab after the scene, a single box in five colours, no portrait:
> **???** *"You sang me five lullabies, little lantern-bearers. Then you came and put out every one. I am awake. I remember who did it."*

**Story question:** *What can still be saved before someone is strong enough to face her?*

---

### Act 6: The Muster *(after the awakening, until the Dragon Throne is won)*

Tiamat is awake, but the finale still needs a level-20 hero. Most players arrive here around level 12–15, so **the Muster lasts several runs.** That is the quest's best window. Section 7 covers it.

---

### 5.7 The fourth-head problem: why would anyone clear the fifth door?

The risk in your notes is real. A sharp player who reads "BREAK NO—" might refuse to clear Starfall. The plan answers this without a convenient prophecy:

1. **Real ambiguity.** "No" or "Now" is genuinely undecidable from what the player has. The wardens' *other* line, already in Chapter III, is a call to raise a champion, which a reasonable person could read as a call to fight.
2. **A reasonable opposing argument in the world.** The Guild's case isn't stupid: four heads are already loose and the Starfall echo shows "the stars are falling inward" (an existing biome anomaly). The fifth dream is collapsing on its own. *Better she wakes with a champion at the door than wakes alone.* Eren himself half agrees.
3. **The structure doesn't punish insight.** The Sixth Door needs all five clears. The game never pretends otherwise. A player who suspects the truth gets a meaningful **action** instead: the **Warning** (+2 Resolve, early shelters, and a Chronicle Dissent entry the Chronicler later cites: *"Someone told us. We wrote it down. We did not listen."*).
4. **The Chronicle remembers they were right.** A player who warned the Keep gets a unique annotation and a unique epilogue line from Bet: *"You said. Before any of us. I remember you said."*

That's the Dark Souls answer. The player was always going to do it. The game respects that they saw it coming.

---

## 6. How the Keep changes with each head

Text, banners and small presentation changes only. No new systems. "**Bark**" means a one-box line from the facility keeper the first time you open that tab after the head wakes (§12).

| Location | 1 · Red (fire) | 2 · Green (poison) | 3 · Black (acid) | 4 · White (frost) | 5 · Awakened |
|---|---|---|---|---|---|
| **Low Lantern** | Lamps out and relit | Cellar smells of graves | Choir corner; Dace gone | Mirror lags a heartbeat | Only light in town; muster hall |
| **Guild Hall** | Celebrates; Trust bounty posted | Bark: "Trust doubled the bounty." | Bark: fewer volunteers | Notice: "Death throes. Press on." | Recruits arrive frightened (recruit flavor lines) |
| **Chronicle** | Ch. I recorded | Ch. II | Ch. III | Ch. IV; Dissent entry if warned | Annotations unlock (§9) |
| **Cartographer** | — | Lead chips appear on maps | Map of the Sixth Door redrawn "wrong" | Door ink frosts | Muster tasks on cleared echoes |
| **Armory** | Forge burns too hot | Crates stamped with five mouths | Bark: "Trust pays in coin that's been underwater" | Steel frosts on the rack | Prices +25% if Break track chosen |
| **Apothecary** | — | Herbs bloom and rot | Medicine "sent to Kiln Row", but not by her | Ice in the tinctures | Shelter track rations |
| **Enchanter** | Runes flicker | — | Reads the Lamp-Glass (§5 Act 3) | Wards on the Keep gate fail | Bark: "Every ward we had was borrowed from her dreams." |
| **Training Grounds** | — | — | Drillmaster warns about morale | Practice dummies found frozen | Closed if Shelter track (drillmaster leads evacuation) |
| **Vault** | — | — | Coins tarnish black in rings | Bark: tribute ledger mismatch | Bark: "Someone has been emptying us into the mountain for years." |
| **Codex** | — | Hymnal page (if found) | Lamp-Glass entry | Reflected Charge entry | Full Lullaby page |

**Banner swaps** (art in §13): `town/keep` → `town/keep_awakened` (dark town, one lit window). `town/tavern` cycles through `tavern`, `tavern_uneasy` (Acts 3–4), `tavern_muster` (Acts 5–6), `tavern_dawn` (epilogue).

---

## 7. The Muster and the final chapter

After the awakening, the Low Lantern's **Speak to Bet** becomes **The Muster**: a board with three tracks of tasks. **The tracks overlap.** A thorough player can make progress on all three.

**Resolve** is a Keep-wide number (0–10): how many people are standing with you. Earned by evidence, rescues, the Warning and trust. Each track's final task needs some Resolve.

### 7.1 Shelter the Keep (Protect)

| Task | Where | Notes |
|---|---|---|
| Rescue the remaining hands | Starfall (the throne road) | Brings home Tarn, and Eren if captured |
| Bring Kiln Row's hearth-flames up the Stair | Town lead | Escort scene; Hessa |
| Stock the Low Lantern's cellar | Gold sink: 300 g | Restores the full drink menu |

**Cost:** the Training Grounds close until the finale (the Drillmaster leads the evacuation).
**Finale boon: Provisions.** The Dragon Throne run starts with **2 Tonic tokens**.

### 7.2 Silence the Choir (Break)

| Task | Where | Notes |
|---|---|---|
| Burn the Trust's stores | Rootbound (the Choir's Grove, revisited) | Elite fight |
| Recover the Due | Drowned | Treasure room variant; big gold, returned to Kiln Row (choice: keep 50%?) |
| Take the Precentor | Starfall | Elite fight vs. **the Precentor**. Captures Aldane. |

**Cost:** no shop penalty. The cost is the work: three hard fights, and the Precentor can only be hunted once you hold his letter (E6).
**Finale boon: Silenced Hymn.** Tiamat's *Chromatic Dominion* curse spares **one** of the colours it debuffs (Ember, Verdant, Shadow, Frost or Storm). The player picks it in the Cartographer; the default is the party's most common debuffed colour, else Shadow. The ×0.75 Mult penalty still applies.

### 7.3 Unite the Keep (Rally)

Needs earlier choices. It's never just a dialogue option. Requirements: **Veska Testifies** *or* **Sereth Broken**, plus **Resolve ≥ 6**.

| Task | Where | Notes |
|---|---|---|
| Kiln Row's assembly | Town scene | Veska or Sereth speaks; the player's evidence is read out |
| The Guild's apology | Town scene | The Guildmaster pulls the Trust bounties |
| Light the Keep | Town scene | Every household carries a flame from the Low Lantern's lamp to the tower. **The Keep's lanterns are relit with ordinary oil.** |

**Finale boon: Kindred Chorus.** Every hero begins the Tiamat fight **Blessed** (the whole Keep is singing).

### 7.4 Epilogue: The Last Light

After Tiamat falls, before the existing epilogue text, the player goes back to the Low Lantern. **No speech.** Bet sets out a drink: *The Last Light, on the house.* Then, for **every hero on the Wall of the Fallen** (Legacy mode), she pours one more and sets it on the candle shelf, saying each name. *This uses the player's own dead. It's the payoff only this game can deliver.*

Then the room, as the player left it:

| Character | Possible final state |
|---|---|
| Bet | Always there. *"To those who come back."* |
| Eren | Alive: telling the Tuesday story again, worse. Lost: his stool, with Hessa's hearth-flame on it. |
| Veska | Testified: doing the Keep's books, no spectacles chain, ink on her claws. Imprisoned: a letter. Fled: absent, and Bet won't say her name. |
| Sereth | Broken: tending a miner, no bells. Martyr: five bells hanging over the bar. Faith Unbroken: his apron folded on the bar. Sereth didn't come back. |
| Aldane | Captured: nothing. Exposed/Untouched: a letter, unsigned, that says only *"Splendidly done."* |
| Warned the Keep | Bet: *"You said. Before any of us. I remember you said."* |

The existing **EPILOGUE** text then plays as written. Repeat Tiamat kills (`story.tiamat > 1`) skip the tavern beat.

---

## 8. Evidence (the quest journal)

Evidence items live in a **Journal** section of the Codex. Each one is a short lore text in the style of an item description, Dark Souls style. Each gets **one extra line** after the awakening.

| ID | Name | Found | Text | After the awakening |
|---|---|---|---|---|
| E1 | The Short Count | Act 0, Cinder | A courier's manifest. *"Lamp oil, 40 sacks. Hardtack, 1 crate. Hands, 6. Due. Rec'd V."* | *The hands carried the oil. The oil fed the lamps. The lamps watched her sleep.* |
| E2 | Hessa's Tally | Act 1, town | Names and seasons in a mother's hand. Tarn's is last. | *She kept every name. Nobody else did.* |
| E3 | The Grove Roster | Act 2, Rootbound | The Choir's own list. The last two seasons have no return dates. | *Not missing. Stacking.* |
| E4 | The Hymnal Page | Act 2, Rootbound | *"…avails nothing less than power, a champion at the height of…"* | *It's the Lullaby, sung backwards.* |
| E5 | The Warden's Lamp-Glass | Act 3, Drowned | A lens with a rune of holding. Warm. | *A cradle. You broke four of them.* |
| E6 | The Precentor's Letter | Act 3, Drowned | *"The road is nearly clear. The heroes are doing splendidly. Keep the Keep grateful. — P."* | — |
| E7 | The Reflected Charge | Act 4, Mirror | *"Break no— dream that she is dreaming."* | *No.* |
| E8 | Veska's Ledger | Act 4, town | Every hand, every season, every return date she stopped writing. | *She kept the ledger. That's something.* |
| E9 | The Wardens' Lullaby | Act 5 | The full text (§1.2). | — |

---

## 9. The Chronicle, annotated

Your notes had the best idea in the doc: **don't rewrite the history; add to it.** After the awakening each chapter gets a **Chronicler's later note** in a different hand (italic, a different ink colour, and a small quill icon). The original stays as it was.

| Chapter | Existing line (kept) | Later note |
|---|---|---|
| Prologue | *"Hid all six beneath the Lantern Keep and lit a lantern for every head she bore."* | *The doors were hidden to keep us out, not to keep her in. We built a town on the warning and called it a fortress.* |
| Prologue | *"Each echo grows stronger while it stands."* | *So does any dream, as the dreamer sinks deeper. We took her sleep for her strength.* |
| I · Ash on the Wind | *"You have only woken me sooner."* | *We recorded this as a boast. It was a statement of fact.* |
| II · The Green Whisper | *"A second lantern flares, then dims."* | *A lamp flares like that once: at the end of its wick.* |
| III · Ink and Acid | *"Only a champion at the height of their power can stand before her."* | *The last line of a lullaby. They were not telling us to fight her. They were telling us what we would need if someone failed to leave her be.* |
| IV · The White Reflection | *"She sees you too."* | *Since the fourth door, she has seen everything a mirror sees. Including this page.* |
| V · The Last Lantern | *"The Queen has no more dreams to hide behind."* | ***We thought the dreams were where she hid. They were where we hid her.*** |
| Dissent *(if warned)* | — | *Someone told us before the fifth door. We wrote it down. We did not listen.* |

The last line of Chapter V's note is the thesis of the whole quest. Put it on the share card's "Dragonslayer" tier.

---

## 10. The dialogue box system

### 10.1 What it looks like

The game already has the right bones: the blue `.win` gradient (`--win-a #1b2c63` → `--win-b #0c1638`), the bone border colour, and **Pixelify Sans**. The dialogue box is that window, pushed further toward NES and SNES.

```
                      ┌──────────┐
                      │  E R E N │  ← nameplate tab, speaker colour
 ┌────────────┐ ┌─────┴──────────┴──────────────────────────────────────────┐
 │ ╔════════╗ │ │                                                           │
 │ ║        ║ │ │  Hands. Six of them. I've carried oil, hardtack, a piano  │
 │ ║portrait║ │ │  once, God help me. I've never carried hands._            │
 │ ║ 112px  ║ │ │                                                         ▼ │
 │ ╚════════╝ │ │                                                           │
 └────────────┘ └───────────────────────────────────────────────────────────┘

 Choices:
 ┌───────────────────────────────────────────────────────────────────────────┐
 │  ▶ "Who's V.?"                                                            │
 │    "Could be a clerk's mistake."                                          │
 │    🎲 [INSIGHT 12] "You already know who V. is."                          │
 │    (Leave)                                                                │
 └───────────────────────────────────────────────────────────────────────────┘
```

- **Placement:** docked to the bottom of the screen over the current tab, max-width ~860px, centred. On phones it spans the width and the portrait shrinks to 64px above the text.
- **Frame:** 3px bone (`--bone`) outer border, 1px `#000` inner rule, 4px corners stepped like pixel art (`clip-path` or a 9-slice `border-image`; see the art callouts). The fill is the existing window gradient, so it reads as part of the game, not a new skin.
- **Portrait frame:** a separate small window to the left (FF6 / Mother style). If the speaker is a **party hero**, the portrait sits on the **right** (BG3 companion interjection).
- **Nameplate:** a tab notched into the top border, in the speaker's colour. **"???"** until the player learns the name.
- **Text:** 18px Pixelify Sans, bone colour, 3 lines per page. A settings toggle swaps to the prose font (Alegreya) for readability (accessibility).
- **Advance cursor:** a blinking **▼** at the bottom right.
- **Choice cursor:** a **▶** that moves with the arrow keys. Optional sprite: a small gauntlet pointer, the FF glove (§13).

**Variants**

| Variant | Use | Look |
|---|---|---|
| `speech` | Characters | As above |
| `head` | Tiamat's heads | Border in the head's colour (from `HEADS`), no portrait (a slit-pupil eye icon in its place), text in head colour, **no blips** and a low rumble instead, text appears faster, no ▼ (auto-advances after a beat) |
| `read` | Documents, evidence, the Lullaby | Parchment fill, Alegreya italic, no portrait, small document icon |
| `bark` | One-line facility reactions | A small box, top-right of the tab, dismisses itself after 5s or on click, never blocks |
| `rumor` | Rumors | Like `bark` but with the source icon and a reliability hint |

### 10.2 Behaviour

| Feature | Spec |
|---|---|
| **Typewriter** | About 45 characters per second. **Fast mode** (`g.settings.fast`): 140 cps. `prefers-reduced-motion`: instant. |
| **Punctuation pauses** | `,` = 60ms, `.!?` = 180ms, `—` = 120ms, `\|` in the script = an explicit 400ms beat (for comic timing and grief). |
| **Advance** | Space / Enter / Z / click. **First press finishes the page; second press advances.** |
| **Choices** | ↑/↓ or W/S, 1–4 to pick directly, Enter to confirm. Mouse hover moves the cursor. |
| **Back / skip** | Esc on a scene already seen skips to its next choice (Dark Souls: re-talking repeats the last line). Esc on a **new** scene asks once: "Skip this conversation?" |
| **Backlog** | **L** opens the conversation log for the scene (BG3). Long-press on mobile. |
| **Blips** | One synthesised blip every 2nd character via `audio.ts` `tone()`. Each speaker has a waveform and pitch (§4). Respects `g.settings.sound`. |
| **Portrait mood** | Each line can set a mood (`neutral` / `warm` / `worried` / `grim`). A missing mood image falls back to `neutral`; a missing portrait falls back to the drawn placeholder already in `art.ts`. |
| **"X will remember that."** | A small toast after flagged choices, in the speaker's colour. |
| **Accessibility** | The box is an `aria-live="polite"` region; the full page text is written to the live region at once, not per letter. Choices are real `<button>`s. Focus is trapped in the box while it's open and restored after. |

### 10.3 Markup

Inline, kept tiny:

```
Hands.| Six of them.            ← | = a beat pause
I've {gold}never{/} carried…   ← colour span (gold, danger, head:red …)
~She stirred.~                  ← gentle wave (CSS), for head voices and dreams
*Tuesday.*                      ← small shake (one-shot), for comedy
{keeper} / {hero:best:insight}  ← substitutions: keeper name, the roster hero best at a skill
```

### 10.4 Script format

Scripts are **data** (serialisable, lintable, testable), not functions. One file per character in `src/content/dialogue/`.

```ts
// src/content/dialogue/eren.ts
import type { Script } from '../dialogue.ts';

export const EREN_HANDS: Script = {
  id: 'eren.hands',
  where: 'tavern',
  speakers: ['eren', 'bet'],
  when: { headsAtLeast: 1, has: ['ev:E1'], not: ['seen:eren.hands'] },
  priority: 90,                       // higher plays first when several are ready
  start: 'a',
  nodes: {
    a: { who: 'eren', mood: 'grin', say: "You found it! I owe you a drink. I owe you two. Let's see what my wheel cost me…", next: 'b' },
    b: { who: 'eren', mood: 'worried', say: 'Hands.| Six of them. I\'ve carried oil, hardtack, a piano once, God help me. I\'ve never carried hands.', next: 'c' },
    c: { who: 'eren', mood: 'worried', say: '"Rec\'d V." …Right.', choices: [
      { label: '"Who\'s V.?"', goto: 'who' },
      { label: '"Could be a clerk\'s mistake."', goto: 'mistake' },
      { label: '"You already know who V. is."', check: { skill: 'insight', dc: 12 }, goto: 'knows', fail: 'mistake',
        effects: [{ trust: ['eren', 1] }] },
    ] },
    // …
    end: { who: 'bet', mood: 'neutral', say: "Drink's on him. He just doesn't know it yet.",
      effects: [{ flag: 'act1.hands' }, { rumor: 'dockhand.sixLads' }], end: true },
  },
};
```

**Conditions** (`when`, also allowed per choice): `headsAtLeast`, `headsExactly`, `has` / `not` (flags and evidence), `trust: [npc, ≥n]`, `fate: [npc, state]`, `resolve ≥ n`, `mode: 'legacy' | 'story'`, `daysSince: [flag, n]`.

**Effects**: `flag`, `evidence`, `trust`, `resolve`, `lead` (offer/complete), `fate`, `gold`, `item`, `token`, `drink`, `rumor`, `remember` (shows the toast).

### 10.5 Dice checks in dialogue (the BG3 move, made ours)

This game is about dice, so a dialogue check **rolls a real d20 in the box**, using the existing die visuals.

- The roller is the **living roster hero with the best modifier** for that skill. Their portrait slides in on the right and *they* say the line, so a procedurally made hero gets a moment in the story.
- Rolls use the **town RNG stream** (`g.townRng`), so a reload doesn't change the outcome. It's a command, so it autosaves.
- **Advantage** if the hero's background or class fits (an Acolyte on Religion checks with Sereth). Shown as two dice.
- **A failed check never blocks the quest** (fairness invariant). It closes one line of conversation and opens a worse or slower one.

### 10.6 Interjections from the party

When a scene starts, the system can insert a one-line interjection from a roster hero, chosen by **class, ancestry or background** from a small template table. Examples:

| Trigger | Hero | Line |
|---|---|---|
| Sereth's faith (Act 2) | Any Dragonborn hero | *"My grandmother sang that hymn. I never knew the words were backwards."* |
| Veska's ledger | Any Criminal background | *"Two sets of books. Seen it a hundred times. Never with people in them."* |
| The Lullaby read aloud | Any Cleric | *"It's a prayer. They wrote her a prayer to sleep through."* |
| Bet's candle shelf | The hero with the most clears | *"How many of these have you pinched out, Bet?"* Bet: *"Don't."* |

About 20 templates gets a lot of mileage. Each is used once per save.

---

## 11. Where else dialogue boxes should go

Priority **P0** ships with the quest; **P1** follows soon; **P2** is nice to have.

| Pri | Where | What speaks | Why it matters |
|---|---|---|---|
| **P0** | **The Low Lantern** | Bet, Eren, Veska, Sereth, Aldane, rumors | The quest's home |
| **P0** | **Result screen (homecoming)** | The head-voice when an echo breaks (replaces the plain Chapter text's quoted line, e.g. the Red Head's *"You have only woken me sooner"*). Bet at the top of the Stair after a **wipe** or **retreat** (*"Sit. I'll bring it to you."*) | The emotional moment after every run already exists; voice it |
| **P0** | **Chronicle** | The Chronicler reads new chapters aloud and later writes the annotations (`read` variant) | The reveal's delivery vehicle |
| **P0** | **Cartographer** | Pim the Cartographer briefs a lead when you pick an echo with a 📜 chip, and gives a one-time briefing the first time you open each Door | Connects the lead loop; makes "choose a run" feel like a mission |
| **P1** | **Guild Hall** | Guildmaster Maren Holt: a **eulogy** when a hero dies in Legacy mode (names the hero, their clears, their kills, using the existing `history`), first hire, the first **level-20 champion** ("The Sixth Door will open for you now.") | Turns permadeath into a story beat. Dark Souls meets Darkest Dungeon |
| **P1** | **Enchanter** | Sabeline Morrow reads the Lamp-Glass (Act 3); barks per head | Delivers a key clue |
| **P1** | **Vault** | Clerk Pell: tarnished coins (Act 3); tribute mismatch (Act 4) | Optional extra evidence for completionists |
| **P1** | **Armory / Apothecary** | Hulda / Mother Fennick: per-head barks; Choir-stamped stock; redirected medicine | The world reacting without new systems |
| **P2** | **Training Grounds** | Drillmaster Kost: morale warnings, the Shelter-track closure | Flavour |
| **P2** | **Codex** | `read` boxes for evidence and the Lullaby | Already covered by the journal UI; boxes add ceremony |
| **P2** | **Guided tour** | Re-voice the coach marks as Guildmaster Holt (the tutorial keeps its rings and targets; only the bubble becomes a box) | Gives the first 10 minutes a face. **Large change**; separate decision |
| **P2** | **In the dungeon** (out of Keep scope) | The Peddler, the Dicing Ghost, quest-room NPCs, BG3-style camp banter at Cooling Cisterns and Anchor Shrines | The same component works anywhere; a natural follow-on |

**Rule:** facility keepers **bark** (non-blocking `bark` boxes) unless the quest needs a full scene. Players are in the Armory to shop. Nobody should have to click through a conversation to buy a sword.

---

## 12. The facility keepers

Each gets **one** portrait (neutral), a name, a voice, and about 7 barks (one idle, one per head, one awakened). Full bark text is a writing task for milestone 6 (§15). One example each:

| Facility | Keeper | Species | Voice | Head-3 bark (example) |
|---|---|---|---|---|
| Guild Hall | **Guildmaster Maren Holt** | Human, 60s, one eye, ex-adventurer | Gruff and proud; reads the Wall of the Fallen every morning | *"Half the board's empty. Folks say the wells taste wrong. Wells don't fight back, I tell them."* |
| Chronicle | **The Chronicler, Ilvane** | Elf, ageless, ink-stained | Careful, honest, a little vain about prose | *"I wrote 'triumph' three times in this chapter. I am going to have to stop writing 'triumph'."* |
| Cartographer | **Pim Ashgrove** | Gnome, wild white hair, spectacles | Excitable, talks to the maps | *"The Sixth Door's on the map where I drew it. It's also somewhere else on the map. I didn't draw that."* |
| Armory | **Hulda Stonebrace** | Dwarf, burn-scarred forearms | Few words, all about metal | *"Trust paid in coin. Coin's been underwater. Tastes of ink. I took it anyway."* |
| Apothecary | **Mother Fennick** | Halfling, very old, sharp | Grandmotherly, then suddenly not | *"Somebody's buying all my willow bark for Kiln Row. Kiln Row hasn't had any."* |
| Enchanter | **Sabeline Morrow** | Tiefling, horns ringed with silver | Dry, precise, privately scared | *"This isn't a weapon. It's a cradle."* |
| Training | **Drillmaster Kost** | Goliath | Booming; morale is his whole job | *"Three of my recruits won't hold a sword. Says it's no good. Says something's listening."* |
| Vault | **Clerk Abernathy Pell** | Human, young, nervous | Counts out loud | *"Seventy-one. Seventy-two. Seventy-th— they've gone black. Why have they gone black?"* |

The Chronicler, Pim, Sabeline and Clerk Pell carry quest information in P0/P1. The rest are flavour. If portraits are too expensive, use the `bark` box with the facility's icon (Decision 4).

---

## 13. Art and icon callouts

Following the house pipeline: subjects are written explicitly in `scripts/export-art-spec.ts` before anything is generated. Generation runs in **batches of about 10, reviewed each time**, storybook style, **text-only (`--no-ref`)**, with one deliberate exception below.

> **⚠ The one exception: expression variants.** For mood portraits we *want* the reference to lock composition: same face, same framing, different expression. Generate each character's `neutral` text-only, then generate `warm` / `worried` / `grim` **with the neutral as reference**. Review all of a character's moods side by side. The pipeline may need a per-entry `ref` field (it currently anchors by group). Call this out in the pipeline before batch 2.

### 13.1 Portraits: new group `npc:keep` (kind `portrait`)

Square bust, shoulders up, plain warm background (a soft lamp-lit tavern blur), facing slightly right so it sits well at the left of the box. Same framing as `heroes/*`.

| Key | Subject (draft) | Pri |
|---|---|---|
| `npcs/bet_neutral` | a human woman innkeeper in her late fifties, cropped grey hair, strong forearms, an old quartermaster's coat with the insignia cut away, a cleaning rag over one shoulder, a level unimpressed look | P0 |
| `npcs/bet_warm` | *(same, ref neutral)*: a small rare smile, eyes crinkled | P0 |
| `npcs/bet_worried` | *(ref)*: jaw set, looking past the viewer at something | P0 |
| `npcs/bet_grief` | *(ref)*: eyes down, holding a pinched-out candle | P0 |
| `npcs/eren_neutral` | a young bronze-scaled dragonborn man courier, about 24, a rope coiled over one shoulder, a leather harness, a pencil tucked behind his head frill, an easy open face | P0 |
| `npcs/eren_grin` | *(ref)*: a wide toothy grin, mid-laugh | P0 |
| `npcs/eren_worried` | *(ref)*: frowning down at a paper manifest in his claws | P0 |
| `npcs/eren_resolved` | *(ref)*: no grin, determined, a lantern-less harness, a scrape on his snout | P0 |
| `npcs/veska_neutral` | an older white-scaled dragonborn woman registrar in her fifties, reading spectacles on a fine chain, a grey high-buttoned clerk's coat, ink stains on her claws, composed and polite | P0 |
| `npcs/veska_cornered` | *(ref)*: spectacles off, held tightly, eyes hard | P0 |
| `npcs/veska_ashamed` | *(ref)*: head bowed, a thick ledger held to her chest | P1 |
| `npcs/sereth_neutral` | a red-scaled dragonborn man healer in his thirties, a healer's apron over plain grey robes, five tiny bells sewn at his collar, steady kind eyes | P0 |
| `npcs/sereth_fervent` | *(ref)*: eyes bright, one hand raised as if mid-hymn | P0 |
| `npcs/sereth_broken` | *(ref)*: the five bells cut from his collar (loose threads), tired, gentle | P1 |
| `npcs/aldane_neutral` | a genial silver-haired human gentleman in his sixties, an elegant plum coat, a cane with a gold egg-shaped pommel, a generous smile that doesn't reach his eyes | P1 |
| `npcs/aldane_exultant` | *(ref)*: in Choir grey over the plum coat, arms open, golden light from below | P1 |
| `npcs/hessa` | an old bronze-scaled dragonborn woman, flour on her apron, holding a small clay lamp with a blue flame | P2 |
| `npcs/ilo` | a thin young dragonborn labourer, rope burns on his wrists, a blanket around his shoulders | P2 |

**Facility keepers** (one each; P1; skip if Decision 4 = icons): `npcs/maren`, `npcs/ilvane`, `npcs/pim`, `npcs/hulda`, `npcs/fennick`, `npcs/sabeline`, `npcs/kost`, `npcs/pell`. Subjects are in the §12 table. *Lesson from the repaint: check each one against the full hero portrait sheet so no keeper reads as a recruitable hero (Hulda vs. `fighter_2`, the copper-haired dwarf, is the risk).*

**Head voices** (kind `icon`, group `npc:heads`, P0): `npcs/head_red`, `_green`, `_black`, `_white`, `_blue`. Each is a single slit-pupil dragon eye, filling the frame, in the head's colour, painted. The box's portrait for the `head` variant.

### 13.2 Scenes: group `scene:town` (kind `scene`)

| Key | Subject | Pri |
|---|---|---|
| `town/tavern` | a low warm stone tavern dug into a mountainside at the top of a long stair, a single oil lamp over the door, inside a long bar with a shelf of small lit candles behind it, patrons of many peoples, dusky and inviting | P0 |
| `town/tavern_uneasy` | the same tavern, fewer patrons, a group in plain grey robes in one corner, frost on the windows, the candle shelf half lit | P1 |
| `town/tavern_muster` | the same tavern crowded with townsfolk and families with blankets, maps pinned to the bar, the only lit window in a dark town seen through the door | P0 |
| `town/tavern_dawn` | the same tavern at dawn, nearly empty, sunlight through the door, the innkeeper pouring one drink, a row of full glasses on the candle shelf | P1 |
| `town/tavern_gold` | the tavern's back-bar mirror showing a vast hall of piled gold instead of the room (one-time Act 4 swap) | P2 |
| `town/keep_awakened` | the hilltop Lantern Keep at night with every lantern dark, a storm overhead, one small warm window glowing at the foot of the town; five coloured glows beneath the cliff | P0 |
| `town/kilnrow` | a narrow street of dragonborn forge-homes, each doorway with a small clay hearth lamp burning, smoke and warm light | P2 |

### 13.3 Quest-room vignettes: new group `event:quest` (kind `vignette`)

| Key | Subject | Pri |
|---|---|---|
| `events/q_stalledCart` | a tipped mine rail cart with a shattered wheel in an ash tunnel, sacks of lamp oil and a chained brass lockbox, six sets of footprints leading away into the dark | P0 |
| `events/q_choirGrove` | a cleared grove in a fungal necropolis, grey cloth lanterns with no flame, crates stamped with a ring of five open mouths, a chained figure asleep on a bedroll | P0 |
| `events/q_pumpRoom` | a flooded brass pump room in a sunken library, a calm mule standing in black water, a young dragonborn tied to a great pump wheel | P1 |
| `events/q_reflectedCharge` | a tall ornate mirror showing an ancient town gate with a fresh carved inscription, a crack running across the glass through one line of words (no legible letters) | P1 |
| `events/q_throneRoad` | a vast cavern road strewn with dropped coins, a line of tired labourers carrying sacks toward a distant golden glow | P1 |

### 13.4 Chronicle

| Key | Subject | Pri |
|---|---|---|
| `story/awakening` | a hilltop keep at night, every lantern on its tower going dark at once in a storm, one small warm window glowing at the foot of the town | P0 |
| `story/lullaby` | the inside face of a colossal opened stone door carved with long lines of ancient verse around five dragon-head reliefs (no legible letters) | P1 |

### 13.5 Icons: evidence, drinks and the Choir (kind `icon`)

**Evidence** (group `item:evidence`, P1). Shown in the journal and in the box when found: `evidence/shortCount` (a creased paper manifest with a wax thumbprint), `evidence/hessaTally` (a folded paper of names tied with red thread), `evidence/groveRoster` (a grey cloth-bound roster with a five-mouth stamp), `evidence/hymnalPage` (a torn hymnal page with music notation), `evidence/lampGlass` (a warm round amber lens in a bronze ring etched with a rune), `evidence/precentorLetter` (a sealed letter, plum wax, a single flourished initial), `evidence/reflectedCharge` (a cracked hand mirror), `evidence/veskaLedger` (a thick registrar's ledger with a spectacles chain looped round it), `evidence/lullaby` (a rubbing on rough paper, charcoal).

**Drinks** (group `item:drink`, P0): `drinks/houseAle` (a foaming pewter tankard), `drinks/kilnStout` (a dark stout in a clay mug with a small blue-flame motif), `drinks/spicedMead` (amber mead in a horn cup with a cinnamon stick), `drinks/minersTea` (a dented tin cup of steaming tea), `drinks/cordial` (a small glass of luminous pale-gold cordial with a sprig of herbs), `drinks/lastLight` (a single plain glass with a candle reflected in it).

**The Choir's sigil** (P0): `ui/choirSigil`: five open dragon mouths arranged in a ring, facing inward, simple and emblematic. Used on crates, stamps, the Grove Roster and enemy name tags.

**Keep sign** (P1): `ui/lowLanternSign`: a hanging wooden tavern sign showing a small oil lamp, low on the board. The tab icon.

### 13.6 UI elements: CSS first, art optional

| Element | Plan | Art needed? |
|---|---|---|
| Dialogue frame | CSS borders + `clip-path` stepped corners | Optional `ui/dlgFrame.png` 9-slice (24×24, pixel art) if CSS looks too clean |
| ▼ advance cursor | CSS triangle, blinking | No |
| ▶ choice cursor | Text glyph | Optional `ui/cursorGlove` (16×16 pixel gauntlet pointer) for full FF flavour |
| (!) story marker | CSS badge (reuse `.badge red`) | No |
| 📜 lead chip | Emoji v1 | Optional `ui/leadScroll` |
| Rumor source icons | Emoji v1 (⛏ miner, 🗡 sellsword, 🔔 Choir, 📋 clerk, ⚓ dockhand) | Optional set of 5 |
| Trust indicator | 3 small lantern pips | Optional `ui/trustPip` |
| Quill for Chronicle annotations | Emoji ✒ v1 | Optional |

### 13.7 Budget and batches

| Batch | Contents | Count |
|---|---|---|
| 1 | Bet neutral, Eren neutral, Veska neutral, Sereth neutral, `town/tavern`, `town/keep_awakened`, `story/awakening`, `ui/choirSigil`, 2 quest vignettes | 10 |
| 2 | Mood variants for Bet (3) and Eren (3), ref-anchored; Veska cornered; Sereth fervent; 2 head eyes | 10 |
| 3 | 3 head eyes, 6 drinks, `town/tavern_muster` | 10 |
| 4 | Aldane ×2, Veska ashamed, Sereth broken, 3 quest vignettes, `town/tavern_uneasy`, `tavern_dawn`, `story/lullaby` | 10 |
| 5 | 9 evidence icons + Low Lantern sign | 10 |
| 6 | 8 facility keepers (if Decision 4 = portraits), Hessa, Ilo | 10 |
| 7 | P2 leftovers (Kiln Row, tavern_gold, optional UI sprites) | ~6 |

**About 66 images total**, about 44 of them P0/P1.

---

## 14. Technical plan

### 14.1 Files

| File | Change |
|---|---|
| `src/engine/types.ts` | `Profile.quest?: QuestState`; `Expedition.drink?`, `Expedition.lead?`; new `Outcome` variant `{ type: 'quest'; effects: Effect[] }` |
| `src/content/quest.ts` *(new)* | Stage table, leads, evidence, drinks, rumors, Muster tasks, finale boons. Pure data. |
| `src/content/npcs.ts` *(new)* | Speakers: name, "???" alias, colour, portrait keys by mood, blip voice |
| `src/content/dialogue.ts` *(new)* | `Script`, `Node`, `Choice`, `Cond`, `Effect` types and the markup parser |
| `src/content/dialogue/*.ts` *(new)* | One file per speaker: `bet.ts`, `eren.ts`, `veska.ts`, `sereth.ts`, `aldane.ts`, `keepers.ts`, `heads.ts`, `interjections.ts` |
| `src/meta/quest.ts` *(new)* | State machine: `heads(g)`, `readyScenes(g, where)`, `applyEffects(g, effects)`, `onExpeditionEnd(g, result)`, `rollCheck(g, skill, dc)`, `buyDrink`, `takeLead`, `musterTasks` |
| `src/content/events.ts` | Quest events (`q_stalledCart` …) with `biome` set and a new `quest: true` flag so `eventsFor()` never picks them randomly |
| `src/dungeon/generator.ts` | Post-pass `injectQuestRoom(map, lead)` (§14.5) |
| `src/dungeon/explore.ts` | `startExpedition`: copy the active drink and matching lead onto the expedition, apply the drink. End of run (~L965): call `onExpeditionEnd`; tick timed leads. Finale run: apply Muster boons. |
| `src/app/commands.ts` | New commands (§14.3) |
| `src/ui/dialogue.ts` *(new)* | The box component, typewriter, input, backlog, check-roll animation |
| `src/ui/tavern.ts` *(new)* | The Low Lantern tab and the Muster board |
| `src/ui/town.ts` | Add the tab to `TABS`/`TAB_RENDER`; lead chips on biome cards; Chronicle annotations and the Dissent entry; Codex journal; awakened topbar title; bark hook per tab |
| `src/ui/modals.ts` | Result screen: head-voice box and homecoming line |
| `src/ui/audio.ts` | `sfx.blip(voice)`, `sfx.rumble()` |
| `src/styles/main.css` | `.dlg`, `.dlg-portrait`, `.dlg-name`, variants, `prefers-reduced-motion` |
| `src/persistence/save.ts` | Migration (§14.4) |
| `src/meta/town.ts` | `SCHEMA_VERSION` → 2, `CONTENT_REVISION` → `td-1.2`; price modifiers from Muster costs |
| `scripts/export-art-spec.ts` | `NPC_ART`, tavern scenes, quest vignettes, evidence, drinks, UI |
| `src/app/autoplay.ts`, `scripts/playtest.ts` | Drink policy; `--muster none|shelter|break|unite|all` flag |
| `tests/quest.test.ts`, `tests/dialogue.test.ts` *(new)*, UI test `dialogue` | See §14.8 |

### 14.2 State

```ts
export interface QuestState {
  /** Flags: 'seen:<scriptId>', 'act1.hands', 'warned', … and 'ev:E1'… for evidence. */
  flags: string[];
  trust: Partial<Record<NpcId, number>>;          // 0..3
  fate: Partial<Record<NpcId, 'alive' | 'captured' | 'lost' | 'testifies' | 'fled' | 'imprisoned' | 'faith' | 'broken' | 'martyr' | 'exposed' | 'captive'>>;
  resolve: number;                                // 0..10
  leads: { id: string; biome: BiomeId | 'town'; taken: boolean; runsLeft?: number }[];
  rumorsHeard: string[];
  drink?: DrinkId;
  muster: Partial<Record<'shelter' | 'break' | 'unite', string[]>>;  // completed task ids
  /** Day the Low Lantern opened; drives "daysSince" conditions. */
  openedDay?: number;
}
```

`heads(g)` is **derived** from `profile.sigils` (count of biomes with ≥1 clear). It is never stored, so it can't drift from the main story.

### 14.3 Commands

All state changes go through `dispatch`, so they autosave and work for tests and the autoplayer:

```ts
| { type: 'talk'; scriptId: string }                       // mark started; returns the script
| { type: 'dialogueChoice'; scriptId: string; node: string; choice: number } // resolves checks via townRng, applies effects
| { type: 'dialogueEnd'; scriptId: string }                // marks seen, applies end effects
| { type: 'buyDrink'; id: DrinkId }
| { type: 'takeLead'; id: string }
| { type: 'musterTask'; id: string }                       // town-only Muster tasks
```

The **UI state** of a dialogue (current node, page, typewriter position) lives in `app.ui` and is never saved. Reloading mid-scene restarts the current node, which is safe because effects only apply on choice or end.

### 14.4 Migration (existing saves)

`migrate()` adds `profile.quest` with defaults. For a save that already has clears:

- Open the Low Lantern immediately and set flags so **only the current act's scenes** are ready.
- Grant the evidence the player *would* have been able to see in the town scenes (no dungeon evidence).
- Queue a one-time **catch-up scene**: *Bet: "You've been busy, love. Sit. Let me tell you what you missed."* It summarises earlier acts in five lines and offers the current lead.
- A save that has already **beaten Tiamat** gets the epilogue tavern scene once, with neutral fates (Eren alive, Veska absent, Sereth broken).

### 14.5 Quest room injection (keeping seeds stable)

Seeds must reproduce layouts, and the 1,000-seed property test must keep passing. So:

1. The generator runs exactly as today, with no extra RNG draws.
2. **After** generation, `injectQuestRoom` picks the target room with a **separate RNG** seeded by `seed + lead.id`: the `event` room farthest from the entrance that isn't on the critical path. Fallback: any `event` room. Then it swaps its `eventId` to the quest event. Layout, loot, encounters and everything else stay identical.
3. Quest events set their own art key (`events/q_*`) and fall back to the room's biome scene if the art doesn't exist yet.
4. If no `event` room exists (short runs), the lead rides along to the next run of that echo, and the Cartographer chip says *"Not this time: try a Normal or Long run."* (Better: force at least one event room when a lead is active. Decide during implementation after checking the generator's `place('event', rng.int(2, 3))`, which suggests there are always 2–3.)

### 14.6 Hooking story beats to the end of a run

In `explore.ts`'s end-of-run block, after `story.seen.push(exp.biome)`:

```ts
onExpeditionEnd(g, { kind, biome: exp.biome, firstClear, finale: exp.finale, lead: exp.lead, questFlags: exp.questFlags });
```

It ticks timed leads, records evidence gathered in the run, sets act flags, and adds a `result.quest` summary so the result screen can show *"📜 Evidence found: The Short Count"* and queue the head-voice box.

### 14.7 Balance

- **Drinks:** small and front-loaded. Run `npm run playtest -- --mode sweep` with the autoplayer always buying House Ale; win rates should move by less than 2 points.
- **Muster boons:** run `npm run playtest -- --finale --runs 40` four times (`none`, `shelter`, `break`, `unite`, `all`) on standard and perilous. Target: `all` stays under +10 points on perilous. **Silenced Hymn** is the one to watch.
- **Muster costs:** the Armory +25% is a gold sink at a point where players have a lot of gold. Check it doesn't block level-20 gear.

### 14.8 Tests

| Test | Checks |
|---|---|
| `dialogue.test.ts` (lint) | Every `goto`/`next` resolves; no unreachable nodes; every speaker exists in `npcs.ts` with a `neutral` portrait key that is in the art spec; every page fits 3 lines (about 160 characters); every check has a `fail` path; markup parses |
| `quest.test.ts` | Act gating follows `heads`, never level; every act's lead is reachable; Eren's timer → captured → rescuable; Warning needs its evidence; Unite needs its prerequisites; migration from a v1 save at 0, 3 and 5 heads, and post-Tiamat |
| `dungeon.test.ts` (extend) | 1,000 seeds: layouts byte-identical with and without a lead; a quest room is placed whenever a lead is active |
| `story.test.ts` (extend) | Finale gating unchanged by any quest state |
| UI test `dialogue` | Typewriter finishes on the first press and advances on the second; arrow keys + Enter pick a choice; Esc skip prompt; `aria-live` text present; reduced motion → instant |

---

## 15. Build order

Each milestone is playable and shippable on its own.

| # | Milestone | Done when | Art batch |
|---|---|---|---|
| **M1** | **Dialogue box + the Low Lantern (no quest)** | The box works everywhere (keyboard, mouse, touch, reduced motion, sound); the tavern tab exists with Bet, drinks and everyday rumors; Scene 0.1 plays | 1 |
| **M2** | **Quest state + Acts 0–1 + the lead loop** | Lead → Cartographer chip → quest room → evidence → consequence scene, end to end; save migration; dialogue lint test | 2 |
| **M3** | **Acts 2–3** | Sereth, the Trust, the Grove (with Choir Wardens), Eren's timed run and its fates; head-voice boxes on the result screen; Choir Warden monster stats | 3 |
| **M4** | **Act 4** | Veska's confrontation, the Three Voices scene with evidence gating, the Warning, Aldane's exposure | 4 |
| **M5** | **Awakening + Muster + Epilogue** | Emergency Keep state, Chronicle annotations, the Lullaby, three Muster tracks, finale boons (playtested), the Last Light | 5 |
| **M6** | **The Keep speaks** | Facility keeper barks for every head; Guild eulogies; Cartographer briefings; party interjections | 6–7 |

**Writing pass** sits beside every milestone: write each act's scenes before building it, then read them aloud in the box at real speed. A line that's too long to sit through is too long.

---

## 16. Scene drafts (the ones that need real writing)

First drafts, written to be cut. `|` is a beat.

### 16.1 Scene 0.1: "Last Orders"

> **BET** *(neutral)*: You're the new Keeper. Thought you'd be taller.| Sit anywhere that isn't wet.
>
> **BET**: See that shelf? One candle for every party that goes down the Stair. I light it when you leave.| I pinch it out when you come home.
>
> **BET**: That's the deal. You come home, I pinch it out. Don't make me wait.
>
> *(At the next table: a clatter of dice and a groan.)*
>
> **EREN** *(grin)*: That's — no. No, that's a four. That's clearly a four if you're standing over here.
>
> **BET**: That's Eren. He runs crates down the Doors for the Provisions Office. He has never once won at dice.
>
> **EREN** *(grin)*: *Statistically*, Bet, that means I'm *due*. — Hello! You're the Keeper. Could your heroes lend a man two silver? For science.
>
> ▶ *Lend him two silver.* → **EREN**: A patron of the sciences! *(He loses it immediately.)* …Science is hard.
> ▶ *"Not a chance."* → **EREN**: Fair. Wise. Cruel, but wise.
> ▶ 🎲 *[{hero:best:sleightOfHand}: SLEIGHT OF HAND 12] "Your dice are loaded."* → **EREN** *(worried)*: They're *what?* …Oh, *that's* why I keep — Joss! *JOSS!*
>
> **EREN** *(neutral)*: Hey, are you going through the First Door? There's a cart of mine stuck on the rail cut past the gate. Bad wheel. Manifest's in the lockbox.
>
> **EREN**: Count was off on the last run, too. Forty sacks of oil, one crate of hardtack, and six of something I never loaded.| Probably nothing. Clerk's hand.
>
> **EREN** *(grin)*: Bring me the manifest and I'll owe you a drink. Bet, write that down.
>
> **BET**: I don't do credit.
>
> **EREN**: She does credit.
>
> 📜 *New lead: The Short Count (The Cinder Vaults).*

### 16.2 Scene 2.2: "Sereth"

> **???** *(neutral)*: Sit them down. Gently.| There. What's her name?
>
> **{hero:wounded}**: {hero:wounded:name}.
>
> **???**: {hero:wounded:name}. You took a root through the shoulder, {hero:wounded:name}. It missed everything that matters. You're very lucky, or very good.
>
> *(Nameplate becomes: SERETH)*
>
> **SERETH** *(warm)*: I'm Sereth. I'm here most nights, at the foot of the Stair. The Choir sends supplies. I send them where they're needed.
>
> ▶ *"Why help us?"*
> **SERETH**: Because you're bleeding.| Is there usually another reason?
>
> ▶ *"The Choir. What is it?"*
> **SERETH** *(fervent)*: A family, mostly. Soup on cold nights. A doctor who'll come to Kiln Row. A song.
> **SERETH**: And a hope, I suppose. That's the part people don't like.
> ▶▶ *"Hope for what?"*
> **SERETH**: That she wakes.| I know. I know how that sounds up here.
> **SERETH**: Every people with a god who loves them gets to be a people. We had a mother once. The wardens put her to sleep and called it peace.
> **SERETH**: I don't want the world to burn, Keeper. I want her to open her eyes and see us. Is that so different from what you want from your gods?
> 🎲 *[{hero:best:insight}: INSIGHT 14]* → **{hero}**: *(aside)* He believes every word. And he's good at this. That shoulder will heal clean.
> 🎲 *[{hero:best:religion}: RELIGION 13]* → **{hero}**: *(aside)* Five bells. One per head. That's a devotional to Tiamat, not a healer's habit.
>
> **SERETH** *(warm)*: Come back before you go down. I'll have something ready for you.| No charge. No hymn either, if you'd rather.
>
> ✦ *Sereth will tend your heroes before each run.*

### 16.3 Scene 4.1: "Veska's Ledger" (core path)

> **VESKA** *(neutral)*: Keeper. If this is about Eren's hours —
>
> ▶ *Put the Grove Roster on the desk.*
>
> **VESKA** *(cornered)*: …Where did you get that.
>
> **VESKA**: Six winters ago the Guild refused Kiln Row credit. Forty-one people died between the first snow and the thaw. I wrote them down.| I'm a registrar. I write things down.
>
> **VESKA**: The Choir came with grain. They asked for a tithe, and then for hands. A season's work below, and the family's debt was forgiven. It was a good arrangement.| It was a good arrangement.
>
> ▶ *"The last two seasons have no return dates."*
> **VESKA**: …I stopped writing them.
> **VESKA**: Not because I knew. Because I didn't want to keep writing a date and then having to cross it out.
>
> *(If E6, the Precentor's Letter:)*
> ▶ *Show her the letter signed "P."*
> **VESKA** *(cornered)*: "Keep the Keep grateful."| That's Aldane's hand. I've had a hundred slips from him. *Splendidly.* He always writes *splendidly.*
>
> *(If Eren is present:)*
> **EREN** *(resolved)*: Tarn's on that list, Veska.
> **VESKA** *(ashamed)*: I know where Tarn is on the list, Eren. I know where everyone is on the list.
>
> **VESKA**: What do you want from me, Keeper?
>
> ▶ *"Help me make it right."* → **VESKA**: …Then I'll need my ledger back.| No. You keep it. *(Evidence: Veska's Ledger.)* — *Veska will remember that.*
> ▶ *"The Keep deserves to know what you did."* → **VESKA**: Yes.| Yes, it does. Tell them about the winter too. — *Veska will remember that.*
> ▶ *(Leave.)* → *(Veska is gone by morning.)*

### 16.4 Scene 5.1: "The Only Light" (opening)

> *(The screen is dark except for the tavern banner. No music. Blips are quieter.)*
>
> **BET** *(worried)*: Every lamp in the Keep went out.| Every lamp. The tower. The Guild. The Chronicler's little reading candles.
>
> **BET**: Not mine.
>
> **BET**: I buy my oil.
>
> *(Pause. Then, quietly:)*
>
> **BET** *(grief)*: Sit down, love. Everyone else has.
>
> *(Fate-dependent beats: Eren / Sereth / Veska, §5 Act 5.)*
>
> **ILVANE** *(read variant, then speech)*: I copied it off the inside of the Sixth Door. It's open, by the way. You'll want to know that.| I'll read it once. I don't think I can do it twice.
>
> *(The full Lullaby, one couplet per page, in the `read` box.)*
>
> **ILVANE**: "Break no dream that she is dreaming."| No. Not now.| *No.*
>
> **BET**: …Right.| Who's hungry. Nobody's hungry. I'm cooking anyway.
>
> *(Head-voice box, five colours:)* ~*You sang me five lullabies, little lantern-bearers. Then you came and put out every one.*~ ~*I am awake.*~ ~*I remember who did it.*~

### 16.5 The Last Light (epilogue)

> **BET** *(neutral)*: There you are.
>
> *(She sets a glass on the bar.)*
>
> **BET**: On the house.| Don't get used to it.
>
> *(For each fallen hero, Legacy mode:)*
> **BET** *(grief)*: {fallen:name}. *(She pours a glass and sets it on the candle shelf.)*
>
> *(Fate-dependent room lines, §7.4.)*
>
> **BET** *(warm)*: To those who come back.

---

## 17. Open questions

| # | Question | My recommendation |
|---|---|---|
| 1 | Cult name | **The Dragon's Choir** |
| 2 | Keep Aldane as the visible villain? | **Yes.** Cut-safe if needed |
| 3 | Eren can be lost? | **Yes**: captured, rescuable in the Muster; only "lost" if never rescued |
| 4 | Facility keepers: portraits or icons? | **Portraits** for Ilvane, Pim, Sabeline and Pell (quest-relevant); icons for the rest in v1 |
| 5 | Re-voice the guided tour as Guildmaster Holt? | **Later** (P2). The tour works; don't destabilise it in the same release |
| 6 | Silenced Hymn finale boon (one fewer debuffed colour) | **Prototype it**, but keep Provisions/Kindred Chorus as fallbacks if playtests show it moves perilous win rates more than 10 points |
| 7 | Rename the cast? | Names here are working names. Bet, Eren, Veska, Sereth are close to your notes; change freely, the scripts substitute from `npcs.ts` |
| 8 | Should the Prologue text itself change? | **No.** It's the Keep's honest misreading; the annotations do the work. The only optional tweak: title it *"The Lantern Charge, as the Keep tells it"* |
| 9 | Pixel font or prose font for dialogue by default? | **Pixel** (the NES feel you asked for), with a settings toggle |
| 10 | Story mode: same quest? | **Yes.** Eren's timer pauses after a wipe in Story mode so a bad run doesn't cost him |


---

## 18. What shipped (2026-11-08)

Everything in §§3–13 is in the game, with the changes noted in §0 and §5. Where to find it:

| Piece | Code |
|---|---|
| Quest state machine, leads (33% + pity), drinks, Muster, migration | `src/meta/quest.ts` |
| Quest data: evidence, drinks, leads, rumors, Muster, Lullaby, Chronicle notes | `src/content/quest.ts` |
| Ten quest rooms | `src/content/questEvents.ts` |
| Cast (portraits, voices, aliases) | `src/content/npcs.ts` |
| Scenes: tavern acts 0–5, Muster, epilogue | `src/content/dialogue/tavern.ts` |
| Keeper scenes, 56 barks, the heads' voices | `src/content/dialogue/keep.ts` |
| Dialogue box (typewriter, blips, ▶ cursor, d20 checks, log, Esc skip) | `src/ui/dialogue.ts` |
| The Low Lantern tab and Muster board | `src/ui/tavern.ts` |
| Keep wiring: tab, barks, eulogies, lead chips, annotations, Lullaby, journal, prices, training closure | `src/ui/town.ts` |
| Hooks: drinks and quest room at run start, quest outcomes, end-of-run | `src/dungeon/explore.ts` |
| Stout ward and Kindred Chorus | `src/combat/core.ts` · Silenced Hymn: `src/fortune/scoring.ts` |
| Tests | `tests/quest.test.ts` (script lint + questline), `scripts/ui-dialogue.mjs` |
| Playtest | `npm run playtest -- --mode sweep --finale --muster all` |

**Art: 76 new images**, all storybook style: 26 townsfolk portraits (15 people, 11 mood variants painted from each person's neutral portrait so the face holds), 5 dragon eyes, 6 tavern and Keep scenes, 10 quest-room scenes and 10 quest-room vignettes, 2 Chronicle plates, 9 evidence icons, 6 drinks, the cult sigil and the tavern sign. The pipeline gained `npc:*`, `item:evidence` and `item:drink` identities, a per-entry `ref` (identity reference for mood variants) and `regen --missing`.

**Finale balance** (sweep, level 20, 60 runs per cell, seed MU):

| Muster finished | standard | perilous |
|---|---|---|
| none | 47% | 32% |
| Shelter only | 47% | 32% |
| Unite only | 45% | 32% |
| Break only (Silenced Hymn) | 65% | 47% |
| all three | 65% | 50% |

Silenced Hymn carries almost all of it (+18 standard, +15 perilous), deliberately kept as the quest's big prize. Shelter's Tonics barely register because the autoplayer rarely spends tokens, so real players will get more from it than the table shows.

### Earned, not automatic (revision 3)

- **Quest rooms pay out only on success.** A passed check grants the reward; a fight holds it until the fight is won (fleeing or wiping forfeits it). A failed check costs HP and closes the room for that run, but the lead stays open. No option grants a reward without a check or a fight, and walking away gets nothing. Checks run DC 13–18 plus the tier bonus.
- **No free evidence in conversation.** Eren no longer hands over the manifest if you skip the cart; the lead simply stays open.
- **The Muster has real gates.** *Carry the hearth-flames* needs Kiln Row's trust 2 (freeing Ilo, hearing Hessa, rescuing Tarn, returning the Due); *Take the Precentor* needs his letter; Unite needs Resolve 5, then 7, then 8. At most about 7 Resolve can be earned before the awakening, so Unite takes a near-complete investigation plus Muster work.
- **No price penalty** for Silencing the Choir.
- Tests enforce it: `tests/quest.test.ts` fails if any quest room grants a reward without a check or a won fight.
