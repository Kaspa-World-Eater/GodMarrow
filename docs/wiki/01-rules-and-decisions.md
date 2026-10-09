# 01 · Derek's rules and the decision log

*These are law. Each came from Derek. When a rule changes, edit it here and add a dated line to the log at the bottom.
Rewritten 2026-10-08: the rulings of 2026-10-02 to 2026-10-08 are in, the 2026-10-01 notes that sat under "Words" are
moved into the log, and what has been superseded is marked. The art laws in full are `docs/MASTER_RULES.md`.*

## How to work (process)

- **Say the plan first** for big changes, and wait for a go. Small, reviewable steps; a playable game after each.
- **One piece at a time,** approved before the next. Every art piece gets ten graded passes, an honest grade, and
  Derek's grade on the area's review page (`docs/MASTER_RULES.md` section 2).
- **Status reports:** prompt, plain, honest; no long silent stretches.
- **Check facts before stating them.** Never guess how something was made.
- **Midjourney is for reference only:**
  - prompts in Derek's own way: short plain sentences, one full prompt per view;
  - his profile `anngqkz`, stylize 350 to 750, weird 130 to 550;
  - never change his settings.
- **Never port the old browser code one to one** (Derek, 2026-10-05: "the one-to-one porting has been a disaster").
  Take the idea, design our own version, and say what's new about it.
- **Secrets:** the PixelLab token lives only in `~/.pixellab/token`, the Hugging Face token only in
  `~/.huggingface/token`. Never print them or put them in files; never read `_secrets`; never type passwords. Never
  delete Derek's PixelLab characters; deletions and downloads on his PC need his yes, and go to the Recycle Bin.

## Gameplay law

**Power and cost:**
- **No cooldowns anywhere.** Power is gated by cost (life, resource, poise, minions), never timers, and no durations
  that read like cooldowns.
- **Melee costs poise, never mana,** for every calling.
- **Poise break:** a short stagger, a burst refill to half, then normal regen; no rolling until poise is full.
- **No teleport skills** for any calling.

**Melee** is charged in the manner of Secret of Mana (2026-10-05):
- hold to charge through up to three tiers, each a different strike (a fourth from some uniques);
- it is optional by a setting, and with it off, holding strikes on and the string climbs the tiers;
- skills are charged, plain or held;
- stances (weaker auras, upkept in poise), rites borne by a minion, and one kept curse at a time.

**Fights:**
- **Boss fights are Diablo-style, never Dark Souls-style:** never lock the player in a small room. Bosses left behind
  never heal.
- **Every danger is plainly seen** (2026-09-30): no deaths to things you could not see. Tells and hazards draw
  unshaded so the dark never hides them. The death screen names the killer.
- **Monster marks are Diablo II's kind only.** Champion packs and uniques are rare (one champion pack in three of
  those the maps place, one named unique a zone, 2026-10-08).
- **Monsters are known by their eyes in the dark;** the eyeless are the jump scares. Each kind behaves differently;
  creatures loiter like D2's imps and are bold.

**Difficulty:**
- like Diablo II: Normal, Nightmare, Hell, each a little darker;
- in Normal, creatures are never more than two levels above the pilgrim;
- the night makes them at most 15% bolder (2026-10-08).

**Loot, stash, souls:**
- **Loot is scarce,** as in Diablo II. Gold is the currency and drops silently.
- **Souls are imbued in the lantern;** no gems. Small materials stack in a materials tab; one big main stash.

**The lantern and companions:**
- **The lantern** is carried by a bearer, each calling's own small companion (the Ossuarch's is the Candle-Hand). Its
  perks are benign: slow, fear, regeneration, radius, never damage.
- **Companions have real roles** (Lantern-Bearer, Porter, Reader, Warden, Mender): one at a time, hired at camp; they
  level and wear gear, can fall, and take orders.

**Death:** like Diablo II and Dark Souls together. Something is dropped where you fell, and you walk back for it.

**The world:**
- **Openness:** zones are open and spacious; paths may be constrictive where a land calls for it (the Sunken Bog's
  maze).
- **Maps are random from seeds;** towns and set pieces are hand-laid.

**Skills and the Reading:**
- **Skill trees:** three per calling, D2 layout, rows at levels 1, 6, 12, 18, 24, 30; Masteries at 30; the trees
  intersect like D2's.
- **The Reading:** every percent effect ±1% at most.
- **Major Arcana** never give +skill levels and never add waits.
- **Progression is built:** the skill trees and the Arcana board. Don't redesign them.

**No tutorials, ever, from any character.** People talk about their lives, not about buttons or menus.

## Art and presentation law

The full art law is `docs/MASTER_RULES.md`; the look is `06-art-direction.md`. The core:
- **No red light,** except the pit of offering's throat in the Sunken Bog (Derek's ruling for that landmark).
- **Restrained effects** in the manner of Diablo II Resurrected:
  - no glow for its own sake, though glow is fine on magic, lanterns and wisps;
  - no swing arcs or comet trails;
  - nothing pasted over the screen;
  - no fog or mist layers.
- **The painted standard** for everything, and **FORM IS LAW:** real form under the paint, never flat. Never a
  *cheap* 3D look; the 3D road's form is always painted.
- **True scale:** the pilgrim small in a big world; forest crowns out of frame.
- **Gritty and dark, never unplayable.** The lantern is the key light, a pool that pushes the dark back. The night's
  floor is 0.52 (2026-10-08). Each difficulty is a little darker.
- **The hero casts a real shadow.**
- **No corny markers** (no "!" over NPCs).
- **Use Derek's own art directly where it exists.** Never reduce his colours.
- **Realistic proportions** (7.5 to 8 heads), muted hue-shifted palettes, one bold mass per figure.
- **No animals, no animal motifs.** Every creature is a piece of the god. Three exceptions:
  - insects are allowed (2026-10-07);
  - the crows on the moor were allowed (2026-10-01);
  - the Sunken Bog's long-dead serpent god may be called a serpent (2026-10-08).
- **The god's body shows through the world,** more the deeper you go; in the first area only a hint (2026-10-08).
- **Sap is dark blood.**
- **The Hemomancer (Red Penitent)** reads dark brown, a Black man drawn with dignity: penitent, not tribal, not a
  mummy, no head cage.

## Words and lore

**The Silence is never "the Hush"** (2026-10-08: "it's so corny"). In the world it is That Which Cannot Be Named,
That Which Cannot Be Held, the Unmaking, or nothing at all: a pause in speech, a gap in writing.

**Banned words:** never use cooldown, dps, proc, aggro, loot, buff, nerf, stun, lightning (as a word), mana (except in
code), chain lightning, rot, cell, virus, DNA, organism or biology. The world speaks in flesh, bone, breath, blood,
marrow.

**Real-world words:** copper not pennies, lands not country, leagues not miles, the fast-day (there is no Friday).

**Names:**
- the Bleeding Maiden, never "Weeping";
- the Ossuarch's order is the Pale Order;
- the Shrine Keeper's stacks are Omens; the Word skill's sigil stays a sigil; the runeword-style words are sigils;
- "Minor Arcana", not nodes or knots;
- the Empty Hand's name is "The Empty Hand".

**Lore rulings** (2026-10-04 and 2026-10-05):
- no "house" or "brotherhood" for faiths; each faith has its own word;
- there is only one cult, the Second Mouth;
- never "the five" as a title;
- the classes are callings, never written as characters;
- "Polished Heart" is retired (hearts belong to the Bleeding Maiden); "Wet Nurse" is retired; the Laden Board is
  scrapped;
- no food, tables or kitchen framing (esoteric, occult);
- the faiths are called by their goddess (the Bleeding Maiden, the Veiled Crone); the breath faith is the Myriad,
  commonly the Shrine Keepers;
- the Silence is the space between words, holding all meaning;
- **contradictions are canon** (rival tellings);
- **the Tithe has two meanings** (to be tithed is to be hollowed out; the people are also the tithe);
- dragons were one power among many in the age before; the dracolich is the last.

**How lore is written:**
- **Only in-world voices,** never an all-knowing narrator. Writers believe they live in the world; they can be wrong
  and disagree.
- **Readable** (2026-10-05, 2026-10-08): plain stories and discussion, with a little jargon at most. No Q&A, no "What
  is said / What is known" blocks, no aphorism stacks.
- **Myths are told as texts found on scrolls, in tombs, or passed down** by priests and families.
- **The gods are unknowable** (2026-10-08): Lovecraftian, alien entities. Every name and face a faith gives them (the
  Bearing Mother, the Veiled Crone, the Bleeding Maiden, the small gods) is an aspect people define so they can try to
  understand. It is never what the thing is.
- **A world of unknowns** (2026-10-08). The player makes the connections ("not Baldur's Gate"). No little towns or
  villages that are not in the game; regions like the Ossa are fine.
- **The bible and the in-game texts are different things** (2026-10-08). `mythology/` is the makers' bible: myths told as
  myths, with depth of time. `in-game-texts/` holds what players find, in the world's own voices.
- **World-building only** (2026-10-08): "we're not writing story or quests or anything. We're just building the world." Lore is never a quest hook, a boss hook or a story beat.

## Decision log (newest first)

- **2026-10-08, the deep lore** (Derek; for us, never stated in the game):
  - "everything in this world is simply narrative. Even the gods aren't real. They're simply dreams. Manifesting because they think they're real. People think they're real ... Thoughts and words can manifest and gain power in this world and that's why they say the god has a thousand faces and 1,000 hands."
  - "everything is everything, reflecting off one another and people still think what they [are] seeing but it's really them projecting themselves and recognizing that and providing identity to those things."
  - **Mantles:** "things just fulfill roles. Killing one just leaves another to take [the] mantle. And there are an infinite number of mantles that have always existed even if they're merely born that day. They have always existed and they've never existed."
  - **The hero, a direction and not a story:** "I like the idea of the hero really being a world killer, slaying the thoughts and dreams, but with no real purpose. No meaning."
  - **The Silence's names:** "I don't like the word hush, it's so corny." Better: "that which cannot be named, that which cannot be held, simply saying nothing, the unmaking, kind of like a fusion of nihilism and daoism."
  - **Story notes, a direction not a story:** "perhaps the hero doesn't have a backstory. Maybe they always were around. Maybe they're just a dream that manifested, maybe they just popped out of the digestion warp point thing [the waystones] ... They don't really know ... at the end the cosmic joke is that the world has gone through many world endings, it's a cycle. You're not a hero. You're a world ender, brought back into being like Kali, to renew things, to take up the mantle of the evil bad guys at the [end] and become merely the next one in the next cycle like it's always been."
  - **The tarot:** "a unifying theme across all people at all times is the use of the tarot, and its myriad of cards. No one even knows all the cards or the formations that they can take when drawn."
  - **The Reading:** "Weaving in the hero myth to the tarot building at the beginning of the game would be cool too. More archetypal so that the narrator is kind of mocking you because it's like they're in on it. They know what's happening as you pick each aspect each tarot each archetype to build your character." The idea "you don't draw the cards the deck draws you", but never that exact line.
  - All of it is written up in `mythology/00-the-deep-lore.md`.
- **2026-10-08, the bible and the mythos:**
  - "I want mythologies. I want creation myths. Not always done the same journal format. Consider this a Bible for us, the creators of the world to reference. The in-game writing is more for finding shit in the game for the players." The lore had lost "the depth of time" and was told "from the perspective of the [Ossuarch] or other characters".
  - "I want it lovecraftian, the gods being unknowable alien-like entities defined [by] mythos. [People] merely define aspects so they can try to understand it."
  - "I don't want to talk anymore about little villages and shit because they don't exist yet" ("ossa is fine").
  - "This is the world of unknowns where the player simply has to make connections themselves. Not baldur's gate."
  - So `mythology/` is now the makers' bible, the found texts are in `in-game-texts/`, and no lore names small towns or villages that are not in the game.
- **2026-10-08, the start on the Red Water:** "Let's make the starting area also on the edge of the ocean. Of course they don't know it's the ocean, but it's also completely made of blood. When they go down to the black sands all they see is the red blood going forever. Come up with a myth for that."
  - Much of the area is black sand and coast, then it "works its way inward through the environment following the natural landscape ecosystem trends".
  - The culture: "combine some native American elements with the thai theme and some sort of new fusion all wrapped in a real dark souls like atmosphere". This overturns "all Thai" of the same morning.
  - "We're not writing story or quests or anything. We're just building the world."
  - Written up in `mythology/08-the-shore-folk.md` (the myth of the Red Water) and `mythology/areas/the-red-shore.md`.
- **2026-10-08, the lore:** rewrite the lore as readable myths (a creation myth, myths and the end of the world for each faith and people), told as texts found on scrolls, in tombs, or passed down, with only a little jargon; and area lore for every Act I zone, as inspiration for building each one; and the inconsistencies fixed. In `mythology/`.
- **2026-10-08, the first area:** the Ashen Moor is wiped to a bare camp ("we can nuke the entire first area anyways, its fucking trash"; "wipe it, keep a bare camp ... make it very basic so we can finish the bog"). The new first area is a destroyed village of the forest folk, deep in overcast old-growth rainforest (the Olympic rain forest): round hide huts, a palisade collapsed after years of siege by "creatures from the outside world. the beasts and the undead", a central fire pit burning the dead, a destroyed Thai temple shrine, a dark-Souls Thai theme, darker; **all Thai, no Native American elements** *(overturned the same day: a Thai and Native American fusion, and the start moved to the edge of the Red Water)*; **safe**; its only soul is "the wandering merchant who seems kinda insane and mocking at your ignorance", looting it; the god only as a hint there.
- **2026-10-08, the music:** the old score is deleted. The new main music is "a more middle eastern diablo 2 sound ... dark and maybe a slight tone of traditional thai kick boxing music".
- **2026-10-08, the 3D road:** after the temple trial (the same temple as real 3D and as a height field): "absolutely fucking crushed with the 3d, beautiful the painting and details have a long ways to go but this is the way." Built things and anything that overhangs are made as 3D forms in Blender, painted our way.
- **2026-10-08, Cursemark dropped:** "Drop it." The game uses its own monsters, sounds and fonts; Cursemark's files went to the Recycle Bin. The game was pushed to GitHub `main` so the laptop updates.
- **2026-10-08, playable again:** "the game is unplayably dark at night currently, magic+ monsters are too often and i cant get anywhere with out immediatley dyin." The night's floor 0.52 (was 0.72); monster blows x0.6; the night at most +15%; one champion pack in three; one named unique a zone; no creature more than two levels above the pilgrim. Far creatures sleep (Diablo II's rule) for the lag.
- **2026-10-08, the browser retired for good:** "we dont use the browser anymore, so we will need to launch every one into the game when we decide act 1 is complete."
- **2026-10-08, the Sunken Bog:**
  - The Long Back is the spine of a long-dead demon serpent god, its names half-remembered and all wrong ("serpent" allowed).
  - The black mirror water, mostly overgrown bone, vertebrae breaking through, lots of plants.
  - A maze like Diablo II's maggot lair, with open marsh chambers.
  - The pit of offering is "exceptional"; red light allowed at its throat only.
  - The fog over the water is removed ("its ugly").
- **2026-10-08, the ground stays alive:** the reworked floors were "35% too barren"; calm floors are overturned; the old road tile is scrapped.
- **2026-10-08, review pages:** every area gets its own review page with grades and notes ("let's make that the standard"); on every rules-check ping, improve something too.
- **2026-10-07, the art laws:**
  - MASTER_RULES, read before every piece with the area's lore first, and the gate (the rules check before any new piece);
  - FORM IS LAW and the depth effect, with the craggy floor and the god's eye locked;
  - scenes make the game's assets, masterpieces lock, and every ground is unique;
  - study chapters and a report per piece;
  - one at a time, ten passes;
  - weather in the world, not on it;
  - more of the god in every place; sap is dark blood;
  - insects are allowed;
  - the forest felt from under it (towering trees, crowns out of frame, no clumps, small trees mostly dead, Diablo II's camera);
  - test captures with the Ossuarch only;
  - the art library; tones by size; the Vigil named; the reminder's pause rule.
- **2026-10-06, the painted standard** (the lake) for everything:
  - the masterwork rule;
  - true scale ("everything needs to be large");
  - every rock, tree and tuft a reusable object;
  - objects interact with missiles and spells by material;
  - lands grow from their ecosystems;
  - study and practise art, and repaint every frame;
  - balance slightly easier, with difficulties and gear doing the rest.
- **2026-10-05, Act I first:** finish and polish Act I before anything new. The same day:
  - never port one to one;
  - the Seer's Bowl title is the standard ("a slight 3D look is okay if it's done correctly");
  - the Diablo II lessons (monster design first, friction is the reward, items that matter, readability over realism);
  - the combat and stash rulings (above);
  - the design rulings: difficulties darker, no teleport, progression is built, souls not gems, death drop, companions, no tutorials, the lantern bearer;
  - characters are hand-drawn shape models ("The hand drawn is just way better"; AI 3D rejected), with the browser's sculpted Tithe-Hand as the minimum standard;
  - the Ossuarch first (a Custodes-like pointed helm, a pale green plume, black iron and bone, numerology);
  - lore: contradictions are canon, the Tithe has two meanings, and the myths are told as plain stories.
- **2026-10-04, the lore bible rulings** (above, under Words and lore).
- **2026-10-01 (Derek): PixelForge is the game's forge.** *Since narrowed:* PixelForge makes the characters (shape sprites); the world is made on the landkit, the 3D road and the land bakes (page 07).
- **2026-10-01 (Derek): the Hollow Mystic's carve is the reference fit.** *Superseded* by the hand-drawn shape road (2026-10-05).
- **2026-10-01 (Derek): every hero carries a lantern,** painted as objects. *Superseded* by the lantern bearer (2026-10-05).
- **2026-10-01 (Derek): the Shrine Keeper's stacks are Omens,** not Sigils.
- **2026-10-01 (Derek): crows are allowed** on the moor; the no-animals rule does not cover them. *(The old Godot page of 2026-09-30 said the crow props became offerings; this later ruling stands.)*
- **2026-10-01 (Derek): the wraith test skin is the Hollow Mystic.** *Superseded* by the PixelForge build `mystic_hd`.

- **2026-10-01, the look going forward (Derek, confirmed)** *(superseded 2026-10-06 to 2026-10-08: the painted standard, the baked lands lit through normal maps, the 3D road; the browser is retired)*: Diablo II sprites lit by a real 3D lantern. The game stays 2D pixel sprites made by the Forge (pre-rendered from carved models), standing as upright cards in the real-3D scene of `tests/scene3d` (orthographic 30° camera, real lantern light with stepped falloff, real shadows; normal + depth maps per frame from the Forge make the cards light like bodies). Not full 3D models in-game. The browser build's look and behaviour remain the reference for the port; its lighting is rebuilt on the 3D scene with the browser as the target.
- **2026-10-01, glows:** glows are fine on magic, lanterns and wisps. The rule is against a Diablo III look with glow on everything; attacks and plain melee stay unlit, the dark stays blue-teal, no red light. (Derek, to the PixelForge session.)
- **2026-10-01, PixelForge merged:** the asset forge lives at `tools/pixelforge/` in this repo. It replaces Marrowpress for anything that needs side or back views. The wiki is copied into `docs/wiki/`.

- **2026-09-30, skill trees:** every Mastery is a level-30 skill, and the trees intersect the way Diablo II's do (two-parent skills, lines crossing columns). The Hemomancer is shown as **the Red Penitent** (Mortification · Blood · Iron Maiden; mutations are **penances**); every skill does one thing no other does. The Ossuarch: Ossuary · Carapace · the Count (melee and numerology curses, small white strand-sigils over the cursed). The world has no Friday (fast-day).

- **2026-09-30, Godot:** the Stranger's box is the title (the user's favourite of three). He whispers of the order whose card you linger on, and draws its card from his deck when you begin. **Champion deeds** (one per pack, two for grown uniques): Grave-Called, Thirsting, Nail-Fisted, Thorned, Candle-Eater, Warded, Unquiet. The first reading of the rule cut Ash-Trailing, Bursting and the Pyre-Saint's death eruption; all came back the same day once the user explained he meant Diablo IV's invisible deaths, not visible hazards. Ash now smoulders unshaded and burns only once settled.

- **2026-09-29, the Unfallen:** the Pale Order believes the stars are pieces of the god's bones that have not yet fallen to rest. **Bone Rain** asks them to come down early.

- **2026-09-29, the Pale Order counts:** numerology joins the Order's theme. Numbers outlast names (the Silence unsays names), every bone gets its number in the Great Count, and counts are reduced to roots. Nine is the Mother's root ("nine keeps itself"). A man is two hundred and six bones, and the fewer is the holier. The Last Number closes the Count and lets her rest. The Count rises (implied only). See the Ossuarch page, §3.

- **2026-09-29, the Codex is mostly voices:** the main body of the Codex is in-world writing by many characters (sages, clerics, beggars, pilgrims, penitents, ancient things from before the Last Breath). Each chapter is a collection of works on its subject; found fragments are one part.

- **2026-09-30, v101:** music back to Claude's original v97 score (the user: "your music was better"). **The Codex is written entirely in-world:** every writer believes they live in this world and that what they write is true, never a tutorial or wiki voice. Everything not in another character's voice is written by the **Sage, the Mysterious Stranger**, who compiles the book: a letter to the reader opens it, and he wrote every chapter's preface, relics, carving notes and epigraphs anew (`wiki/11a-codex-stranger.md`). His facts so far: began the book in 1109 of the Last Breath, the letter is dated 1114; nine winters in the Ossa from 981; first climbed the Peak 1071; the Peak fell in spring 1098; he was the unnamed copyist in several works.

- **2026-09-29:** development moves toward **Godot 4.7.2** (installed portable on the Desktop; project at `Desktop\Godmarrow\Godot Project`). Vertical slice first: the Ashen Moor camp, road, chapel, Kneelers, loot, orbs, music. See `13-godot.md`. The web build stays the reference and playable demo meanwhile.

- **2026-09-29, v99:** lore: **Ossuarchs walk the Pale**, a path (see class-ossuarch, the Codex's Pale Order chapter and the Pale-Stone relic). Music: the v97 pieces come back as each place's **second movement** (slowed, drums in one section of three, the cello joining); places alternate the cello movement and the second movement every few minutes. The user likes both directions.

- **2026-09-29, v98:** music is drearier and led by a sad cello (bowed synth with late vibrato and glides) that sings each place's tune slowly and low; drums only now and then; long silences. Each act follows its land's culture: I the Moor's pilgrims (medieval minor, slow lute, frame drum); II the Pale Order's Barrens (harmonic minor, bass choir of brothers, tolling bells, rare great drum); III Shog-Mire and the Flesh (phrygian lament, muffled procession drum and rolls, the mud's heartbeat, a short strum); IV An-Vhar and the Gilded Peak's mountains (five-note mountain mode, temple bells, bamboo flute, one great drum); V the Descent (locrian, heartbeat, unresolved choir, distorted drone). Bosses: thunder drums under a driving cello in the act's mode. The v97 desert lute and jungle log drums are gone (they matched Diablo II's lands, not ours).

- **2026-09-29, v97:** new score (`zz_zz_music96.js`), live-synthesised in the manner of Diablo II and Lord of Destruction; no melody or sample copied. A cue per act and place: Act I camp is a fingerpicked twelve-string in 6/8; wilderness is long silences, wind, drones, reversed guitar and lone harmonics; dungeons are sub drones, clusters, scrapes, heartbeat drums and far bells; Act II is an oud-like lute in hijaz over darbuka; Act III is log drums in three-against-four, flute and marimba; Act IV is strings, low horn, men's choir and bells; Act V is a choir at the gate, then an industrial inferno; bosses get thunder drums, a phrygian ostinato and choir stabs with act colours. Each cue has its own seeded motif. The title screen now has music. Phone tome: the close button sits in the index leaf's top corner. Codex interviews: every Codex character was interviewed (beliefs, home, days, fears, the other orders); notes in `wiki/12-lore-notes.md`, full text in `wiki/12b-codex-interviews.md`. Nothing from the interviews is canon until adopted.

- **2026-09-29, v96:** the Codex is mostly **voices**: 66 in-world works written in character (pilgrims, brothers, sages, beggars, children, and a few prehuman things from the Held Space), gathered into nine chapters: The Reliquary; The Roads and the Stones; The Pale Order; The Gilded Peak; The Polished Heart; The Precious Wound; The House of Eight Million; Before the Last Breath; The Feuds. Each chapter is a preface, its works, then Relics and Rites. The in-game tome and the web Codex are generated from one source (`lore/chapters.py` plus `lore/voices/*.md`, via `lore/gen.py`). The tome got bronze corner guards with rivets, stacked page edges, a gutter, a ribbon, illuminated initials, a cup stain and a torn corner. The Ossuarch's skill flavour text is rewritten in the Pale Order's voice (the Tibetan terms are gone); Bone Rain is the Unfallen asked down early.

- **2026-09-29, v95:** waypoints are **waystones**. They look like ancient stone shrines, a broken ring of fang-shaped standing stones round a sunken pit, with only traces of biology: a dark wet something under an ash crust that breathes, stains seeping from the plinths, pale fibres in the ground. Travelling: you walk in, sink, and dissolve into blood, bone and viscera; the stones close; black; at the destination the matter draws back together and you rise out of the pit, wet. The title menu words hold still, with no dark box, and are brighter and larger.

- **2026-09-29, the Codex while we build:** The Codex (on the title screen) shows every chapter for now, so the lore is easy to find during development. When the game is ready it will fill in as players learn things in play.

- **2026-09-29, v94:** the Ossuarch's order is **the Pale Order** (locked). The title screen gains **The Codex**, a readable lore book styled as an ancient bronze-bound tome. The title menu is cast in old pitted bronze. The Trial of Thirty character starts with every waypoint kindled.

- **2026-09-29, v93:** **Soul Leash** moves to the Thread tree (row 18, under Needle's Mark). It is now a burst: every wisp throws a thread to an enemy within 5 yd for about 3–4 s; the held enemy burns and anything crossing a thread is cut, and the threads sweep as the wisps move (no wisps: three weaker threads from the hero). Its replacement in the Soul tree is **Procession** (hold: the choir circles the cursor in a ring and strikes inside it, costs Essence while held). **Burrowed creatures** can no longer be targeted by the wisps. **The white line was the melee swing arcs** drawn on every normal attack; removed (no light on attacks).

- **2026-09-29, Ossuarch lore, fourth pass.** The order **reveres bone**. Dropped: iron as a theme, the mills and bellows, and "the Knitting" (that is the Hollow Mystic's flavour). **The growth is never said**, only implied (a count that keeps rising, rooms nobody dug, dust that weighs more); the skills and art show it openly.

- **2026-09-29, the Bone grows.** A dark theme for the Ossuarch: the Bone grows, encroaches, calcifies and spreads like a cancer. His skills show it, with bone growing over his weapons, over his armour and in his enemies. The Chapter uses iron as a trellis for the growth and prunes it back each morning. In the doc's hidden layer, the growth is what the Mother has become, and the ossuaries are a quarantine.

- **2026-09-29, third pass on the Ossuarch and Empty Hand lore.**

- **Ossuarch:** no pregnancy, no lavras, no eating dust. **The Chapter of the Frame**: ancient (it claims as old as the world), keeping ossuaries built over older unknown ruins. It serves the **Bearing Mother**, tends bone and marrow, and makes the dust sacred (the only thing that has finished dying). **Sky funerals**, and it **hides something**.

- **Empty Hand:** the original order lore is restored and deepened. **Radiance is erasure by light** (the Peak's gold), and Absence is erasure by dark. The lore is about the order; the man is a beggar-monk of the same order, not the legend, and a mystery.

- **Both:** written Dark Souls style (fragments in game, the truth only in the doc).

- **2026-09-29, Empty Hand lore: second pass.** The user liked 90% of the original lore; only his personal story needed changing. The Gilded Peak, the Kinrei-shū, the chanting, non-duality, the courtyard of glass, the bowl and the black-flame lantern are restored. Gone: the mask (even as gear), the fasting-and-eating story, and anything that explains him. He is starved and gone, and the empty hand is read as the two trees: **open = Radiance, closed = Absence**. He is told only through hearsay that contradicts itself; for all anyone knows he is immortal.

- **2026-09-29, Ossuarch lore redone again.** The Atlant, Vault and Khrebet version was not liked. Now: **the Bearing Mother stays** (the Bone is pregnant with something); the **mountain bone monasteries (lavras)**; **raised dead power the mills and bellows** of their cities; bone grinds to **sacred dust**. The telling is Dark Souls style, esoteric and Lovecraftian: the game shows only fragments (item text, inscriptions, a hymn), and the truth stays in the doc.

- **2026-09-29, v92, the Empty Hand's lore brought up to date** ("not up to date with the character. No mask, called the Empty Hand"). He is the gaunt, barefoot beggar-monk. There is **no mask ever** (the later-gear mask is dropped). The name is the heart of the lore: he begs, he carries nothing, and what his hand closes on is gone. His order is the Brothers of the Bowl on the Kneeling Peak. They starved sitting, keeping their rule, and the Ossuarch's Levy came for their bones. The skill text now describes the man he is: no belly, gold, silks, Buddha or bodhisattva, and no "once every N s". Full page: `claude/godmarrow-class-kusho.md`.

- **2026-09-29, Ossuarch lore redone** ("no depth or feeling of ancient culture"). The Tibetan theme and the stone business are dropped. The new lore follows the user's direction: medieval knight, catacombs, mountains, grinding, Russian, stoic, eternal duty, a darker angel, bearing eternal weight; bone, brittle, dust, age, iron. The look is a colossal praetorian in bone and iron, never gold. His angel is **the Atlant**, who holds up the god's fallen skull, **the Vault**, over the mountain range **the Khrebet**. His order is **the Bearers** of **the Lower Lavra**. Full page: `claude/godmarrow-class-ossuarch.md`.

- **2026-09-29, v91:** chests "almost never drop anything". They were dropping, but the loot was hidden behind the big chest sprite. Loot now spills out in front of the chest, and the odds are slightly better. An empty chest is still allowed ("fine for them to drop nothing"), but it is rare.

- **2026-09-29, v90:** the two "chain lightning" Thread skills are made different: **Binding Thread** now threads nearby enemies to the one at the cursor, drags them in and strikes, jars and slows them on the snap; **Needle and Thread** stays the leaping dart. The Mystic's wisps are **one choir** (no types to choose); the wisp skills are passive **chances on each strike**: snag a thread (Wisps), pass on untired (Restless Dead), a needle through the foe (Darting Wisps), a spark splits off (Splitting Wisps).

- **2026-09-29, v89:** open zones get a few loose corridors (tree lines, broken colonnades; sometimes paired into lanes; always gappy) and lone wanderers (singles and pairs) in the quiet stretches. Openness still rules.

- **2026-09-29, v88:** hands that circled in fear now attack (a pre-existing bug; crowds send more in); shadows never darker than the dark; the white streak softened; mirror skills +20%; **gold drops silently**; drops raised toward D2 (about 7 items, 11 gold piles and 5 potions per 100 normal kills; magic and rare stay rare).

- **2026-09-29, v85–v87 ("do everything you want to do to enhance the game"):** decor casts lantern shadows; a boss slam leaves cracked ground (2.5 s, drains poise); moonlit clearings at night (rest: faster poise, slow healing); light shafts through the woods by day; world flames blocked by walls too.

- **2026-09-29, v84:** objects block the lantern's light and cast shadows (walls, cliffs, palisades, tree trunks, rocks, pillars); the light ring no longer just overlays.

- **2026-09-29, v83:** boss telegraphs (ground dust and grit, above the dark, never red, no glow) and a stagger meter under the boss's life; bosses left behind no longer heal.

- **2026-09-29, v82:** adopted from the game study: turning the wick down (risk/reward), the finishing blow on a reeling foe, the lantern keeping a little on each fall, drop sounds by rarity. **Declined:** a throwable light ("we don't need that for our base game").

- **2026-09-29, v81:** the choir also shapes the Mystic's spells (counts, duration, size), not only damage.

- **2026-09-29, v80:** wisps are **fuel**, not a gate: more wisps = stronger spells, fewer = weaker, 0 = a penalised spell (never refused). Wisps get more ethereal glow. The 20% stronger stagger applies to the **player** too.

- **2026-09-29:** "I prefer gold": gold stays the currency; no currency-as-crafting.

- **2026-09-29, v79:** lights strobed on mobile → all flames smoothed (no fast flicker); the pool has gentle stepped rings and more contrast; less warm glow (hero lights sized to the pool); monsters 20% bolder; stagger 20% stronger; no bright comet streak on darting wisps; **the Hollow Mystic's spells cost wisps**.

- **2026-09-29, v78:** world detail = non-solid per-land ground scatter + canopy dapple; no extra trees (openness).

- **2026-09-29:** the current Hemomancer ("Penitent") looks like a mummy, not brutal; **full redo later** (after the PixelLab reset on Oct 28, or from a user reference).

- **2026-09-29, v77:** cinematic pass approved in principle ("sounds good"): eye-shine, lantern-cast monster shadows, rare distant lightning, loot glints, lantern mood, blue-teal darkness.

- **2026-09-29, v76:** monsters were "a little too cowardly" → bolder; wisps "a little more glow".

- **2026-09-29, v75:** mobile was slow → automatic lighter mode (not download-only); no locked boss rooms ever.

- **2026-09-29, v74:** the lantern is **its own unit**: untargetable, hovers and follows closely, bound with a soul (the Wickbound lore).

- **2026-09-29, v73:** the hero casts a shadow; cinematography matters ("lighting drives moods and feelings").

- **2026-09-29, v70–v72:** lantern light tuning: v70 "too soft", v71 "too intense and stylized", v72 natural falloff accepted.

- **2026-09-29:** the Hollow King (zombie cow king) looked cartoony → back burner. Ossuarch out of commission. Armor tiers later.

- **2026-09-29:** use PixelLab animations (not PixelOver). Spend PixelLab generations to about zero and wait for the reset.

- **2026-09-28:** the game is named **Godmarrow**; gods are named the Dark Souls way (see 03).

- **2026-09-28:** Yh'Anuul is **Soul**; the Myriad is **Breath**.

- **2026-09-28:** the Kūshō is displayed as **The Empty Hand**; Weight meter and yin-yang orb removed; the hourglass orb.

- **2026-09-28:** body board: "Minor Arcana" instead of knots/nodes; each order has its own Major Arcana.
