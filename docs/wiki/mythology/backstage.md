# Backstage: the lore canon in one place

*Not lore. This is the reference behind the myths: everything decided, gathered from every source on 2026-10-08,
with its gaps and contradictions. Read it before writing; never quote it in the world's voice. Derek's newest dated
ruling in `../01-rules-and-decisions.md` always wins. Section 8 lists what the 2026-10-08 rewrite added.*

**Retired since this digest was gathered (2026-10-08):**
- the small towns and villages it names (Ashwake, Villa Llaga, Greywell, Kerrow Cross and the rest): the lore names
  no little towns that are not in the game;
- "the Hush": the Silence is That Which Cannot Be Named, That Which Cannot Be Held, the Unmaking, or a pause.

The digest keeps the old words as a record of its sources. The bible is `00-the-deep-lore.md` to `07-who-is-who.md`.

## 0. Sources, precedence and shorthand

**Read in full:**
- `docs/wiki/02-world-and-lore.md`
- the mythology pages of 2026-10-05 (now in `docs/archive/mythology_2026-10-05/`) and their brief
- `12-lore-notes.md`
- All five `05-class-*.md` pages
- `01-rules-and-decisions.md`
- `16-errant-ways.md` (its duplicate `docs/errants.md` was removed on 2026-10-08)
- `11-codex-voices.md` (all 3,019 lines)
- `11a-codex-stranger.md` (all)
- **Both owner docs, through the Claude Docs connector:**
  - Lore Bible, rev 29, dated 2026-10-04. Its header says "Proposed canon unless marked adopted". Its "Your decisions" table says it outranks every older document.
  - The Second Mouth, rev 17, marked "Proposed canon".
  - Neither doc has comments.

**Skimmed:**
- `12b-codex-interviews.md`. I read the Held-Space interviews and the Peak interviews in full; the rest I took from the lore-notes summary.
- `data/codex.json`, the in-game Codex. It is newer than `11-codex-voices.md`:
  - "Friday" became "fast-day"; "three hundred miles" became "a hundred leagues"; "Ninth Mile" became "Ninth Stone".
  - It adds one work, "What the Marked Carry", a road-warden's notice signed Aldous Pell.
  - "Minutes Kept in the Presence" is renamed "The Record Kept in the Presence".
- Old browser text: voice lines (`web/triune_desktop/src/zz_voice.js`) and errands (`zz_quests.js`).
- `tools/landkit/passes/spine_path.md` (the serpent god) and the memory notes.

**Not in the repo:** `claude/godmarrow-naming-codex.md`, which `02-world-and-lore.md` cites.

**Precedence.** Newest wins. Otherwise contradictions stay as rival tellings.
1. Derek's rulings: the Lore Bible "Your decisions" (10-04); the rulings of 10-05; 10-07 (insects allowed); 10-08 (the serpent god).
2. The class pages' "user's direction" blocks.
3. The mythology pages (10-05).
4. The Stranger's pages (09-30).
5. The Codex voices (09-29).
6. `02-world-and-lore.md`.
7. The interviews. Nothing from them is canon until adopted, and none was ever marked adopted in 01. In practice, whatever the Lore Bible, the mythology pages or the Stranger reused is adopted.
8. The browser voice lines and errands. Many of them break later laws.

**Shorthand used below:**
- LB = Lore Bible; SM = The Second Mouth.
- M01 to M05 = the mythology pages of 2026-10-05 (archived).
- W02 = `02-world-and-lore.md`; R01 = `01-rules-and-decisions.md`; LN = `12-lore-notes.md`.
- CV = `11-codex-voices.md`; ST = `11a-codex-stranger.md`; IV = `12b-codex-interviews.md`.
- C-Oss, C-RP, C-HM, C-SK, C-EH = the class pages (Ossuarch, Red Penitent, Hollow Mystic, Shrine Keeper, Empty Hand).
- EW = Errant Ways; VO = voice lines; Q = errand text; SP = the spine-path pass log.

---

## 1. Cosmology

### 1.1 The corpse

**Derek's ruling (LB):**
- "The Reliquary is a corpse, and no one knows whose." Every people says something different, and none is confirmed.
- What every faith agrees on: "the ground is warm, the dead do not stay down, and things still come up out of the body."
- The Pale Order calls it the Bearing Mother. The Gilded Peak says it is a mouth. Others say it was the greatest god, or a beast, or that it is not dead.
- What lives under the Hide does not call it anything.
- "The skin is the Hide; the ridges are its bones; what runs in the rivers is what runs in it still."

**Names for it:**
- The Reliquary: the scholars' word, "as though it were a box someone had set down with care" (ST).
- Triune (the working title); the Three-in-One; the God Beneath. All three are "only descriptions" (W02, M01).
- The great one (Myriad); the Holder (the Keeper of the Spiral Hollow).
- "She" or "her" for the builders and, through the Bearing Mother, the Pale Order.
- The Mother (Maiden faith and Pale Order, each meaning its own power).

**The older telling, now one belief among several** (W02, CV, M01):
- A god of three natures, Soul, Bone and Flesh, "the way a knot is three turns and one thing."
- It held a space open inside the Silence. The Silence unsaid it, one name at a time, until it forgot how to be three-in-one and died.
- Lowland rhyme (CV, M01): "Soul for the thread and Bone for the frame, / Flesh for the feeding, and none for the name."

### 1.2 The rule the world runs on (LB, M01, M02)

- "A god is a belief that grew a body." Fear and worship feed it, and a forgotten god starves. So the old powers ruled by terror: "a city that trembles is a city that feeds."
- **Marrow:** belief does not pass through a god, it settles. In the bones of anything long feared or prayed to, it hardens into marrow. Godmarrow is "what still lives in the corpse's bones" (W02), and every faith spends it.
- **Dreams:** "sleepers dream, and powers graze there. A nightmare is something feeding."
- **Not everything is a god.** Behemoths, lords, the dead, demons and things from outside live by other rules or none, "some of them eat gods."
- A god that starves to the end "breaks into demons, as a carcass breaks into flies." Demons bargain because a bargain is the nearest thing to prayer they can get.
- "Necromancy is the spine" (LB): the Risen, the tithed, wraiths, liches and revenants.

### 1.3 The Silence: Derek's ruling, then the faiths' readings

**The ruling (LB):**
- Ur-Nihl is the space between words, "the silence between sounds."
- It holds every meaning, and is "written everywhere for those who can see and hear it": the gap between letters, the pause in a chant, a blank margin, the still air between breaths, "the empty place in a ring of standing stones."
- Gods are made of being spoken of. The Silence is the one power that is not spoken and cannot be. "Every god is held inside it the way a word is held between two pauses."
- Those who hear it once hear the spaces ever after.
- Its true name is "written as a gap by those who know it best, because the gap is where it is."

**Older readings, kept as some faiths' beliefs (LB):**
- **The Edgeless:** what there was before anything had a name. Taboo in most mouths.
- **The Unsaying** (the Pale Order and the old Codex): it took the god's names one at a time. LB's gloss: "a god that fell into the spaces between its own names."
- **The two empty hands** (the Peak): Radiance and Absence.
- **The Void That Emanates, or the Mouth With No Lips** (the Reading and the Crone): it "hears its name as you hear yours across a crowded room."
- **Its servants leave nothing:** no corpse, bone, blood, breath or thread, only "a little glass, a little dust." Every faith fears this most, "and has once been glad of it."
- **The wounds and the Scar:** where the corpse lies open the Silence is nearest. "Every wound in the Hide is a door left on the latch" (CV preacher).
- **The Slayers' reading:** the end is a thought that remembers no one, "which may be the Silence by another name, or its opposite."

**All its names:**
- Ur-Nihl (taboo); the Hush (lowlands); the Void That Emanates; the Mouth With No Lips; the Edgeless (what came before).
- From the Stranger (ST): the Quiet, the Unsaying, the Unnaming, the Long Silence, the Mouth That Eats Its Own Echo.
- From the Reading: "the hole the gods are lying in."
- Altar speaker-name: "the Hush."

### 1.4 The powers and every name each goes by

**Soul: Yh'Anuul** (W02, C-HM, ST, Reading)
- The threads of fate the god wove and still weaves; "weaving with no pattern" now. Faith: the Veiled Crone.
- Names: the Veiled Crone, the Weaver, Grandmother Spindle, the Knot, the Tangle, the Old Spinner (ST).
- Aspects: the Spinner, the Weaver, the Unraveller, and the Hollow, "the eye of the loom." The Hollow's name is said "with the mouth shut, a hum" (LN).
- A secret first name: "the name you would call a knot before anything was tied in it" (LN).
- No Herald yet (open).

**Bone: Oss-Vharoth** (W02, C-Oss)
- "the skeleton that refuses to lie down." Faith: the Pale Order.
- Names: the Bearing Mother, the Mother, Old Upright (altar speaker-name), "the Standing Dead" (Reading).
- Herald: the Marrow Pontiff, also called "the Herald of Bone" by salt-carriers. Cult name Oss'khalath.

**Flesh: Nol-Shogthuth** (C-RP, CV, ST)
- "the flesh that keeps growing without a mind." Faith: the Bleeding Maiden.
- Names: the Bleeding Maiden (never "Weeping"); Mother of the Wheel; Our Lady of the Open Side; the Red Mother (lowlands, and the altar name); She Who Turns; the Generous One (ST); the Glutton (her enemies' name).
- Faces, in the old order: the Maiden (the wound that gives), the Mother (the growing), the Nurse (tends what she makes).
- Herald: formerly "the Wet Nurse", now retired. Proposed "the Weeping Gash" (cult name Shog'maathe), not yet confirmed.

**Breath: no true name** (W02, C-SK, ST)
- The god's last breath, and the small gods of every stone, ford and bell that ride it. Faith: the Myriad.
- Names: the Myriad, the Eight Million, the Small Gods, the Last Breath (also its altar name), the Long Exhale, the Sigh Under the Door, Grandmother Wind, "the Spirits in All Things" (Reading).
- Asking its true name is an insult.
- Herald: the Long Exhale, a wind of faces (cult name Hau'Nuulh).

**The Silence: Ur-Nihl.** Names are in 1.3. Herald: "a Silent One", which has no name, only a gap.

### 1.5 How it died: rival tellings, all canon as beliefs

1. **The Moor:** the Hush pressed like cold at a tent. It took little names first: the smallest finger, one eyelash, "the hour before morning." The people sang louder, and one night the god forgot how to be three (CV, M01).
2. **The sages:**
   - Aumery: the Hush unsaid it "the way a reader unsays a line by reading it aloud too many times."
   - Idrenne of the Lower Stacks: it took the names in order, smallest outward.
   - Mahault the Blind: it took them all at once, "and the god has been slow to notice" (CV).
3. **The Choir:** they breathed in turns so the note was always held. Once, all drew breath together. The Hush came in through that rest, "the first silence," their "holiest, sharpest day" (CV, IV).
4. **The preacher at the Dry Ford:** "The sages say the god was murdered. I say the god was eased," like loosening a dying person's fingers. "The last fingers hold hardest" (CV).
5. **"The faithful divided it":** told on the roads and by some of the faithful. Worshippers took knives to it, dying or dead or sleeping, and shared out Bone, Soul and Flesh. The grandmothers won't have it told (M01). Tithe-Hands are then "the god's right hand, taken off at the wrist."
6. **The builders:** "She listened toward them, or too far… While she listened she forgot to [the sign of a closed hand]" (CV), that is, she forgot to close her hand.
7. **The Keeper of the Spiral Hollow:** "a speaking came in at the wide end with no mouth behind it," among the singers, and said the Holder's names one at a time. The Keeper let it pass "and found it light" (CV).
8. **The Gilded Peak:** the Hush is the god's rest. The god grew tired, "and the Hush came in to let it lie down" (CV abbot).
9. **The Pale Order:** the Mother fell. It says no more about a killing (M03).
10. **The Myriad:** "the great one went still" (M02). **The Veiled Crone:** the threads went slack, "the hand at the treadle tires" (M04). **The Maiden's faithful:** nobody remembers.
11. **Greywell:** what stood at the east wall "was here before. The Crone held this room open inside it… now the holding is over and it has come back to stand where it stood" (CV, Brother Hal).
12. **Old browser and errand text:** "The Slayers killed the Triune before there was a when. This is where they kept the knife." The Act V boss is "the face of what killed it" (VO, Q). The Lore Bible softens this to "they came in where it was open."
13. **Some say it is not dead at all** (LB, M01).

### 1.6 What the world is: the body map (W02, M01, M05, ST, LB)

**The Hide, Act I, is the skin.**
- **Ashen Moor (the Cheek):** "where the face struck first." The ash is warm because the flesh under it is still cooling. The surveyor's sheets make a face: the Moor at the cheek, the Fen at the throat, the face "turned a little, toward the camp," eyes drawn closed (CV).
- **Rib Crypts:** dug between the ribs, nine galleries.
- **Drowned Fen:** the god's lymph, "clear water that does not wet."
- **Hollow Wood:** the god's veins stood up as pale trees.
- **Root Deep (Ne-no-kuni):** the country under the Hide. It breathes.
- **The mouth:** where the people walked out.
- **The Hide showing through:** a rib arching from the turf, a vein breaching soil, skin with pores and hairs, "a pool that looks back like an eye" (W02 v66).

**The other lands:**
- **The Ossa and the Bleached Barrens** are the bones. Ridges are bones, the ground is "bone ground fine", and ribs stand in rows.
- **The Citadel of the Shattered Femur** is a thighbone. The Empty Socket is the hip-socket.
- **The Gilded Peak** is "the god's knee-bone broken up through the Hide."
- **Shog-Mire** is flesh and blood: a heartbeat in the mud, a blood delta.
- **An-Vhar** is the Heights. A Stranger line: "the mountain is her chest."
- **The Descent** goes inside the body, in order: spinal canal, marrow siphons, blood sea, heart valves, nerves, stomach, brain.
- **The Scar** is where the ground will not close.

**The sky** (CV, "The Sky over the Hide"):
- **Dark arches at the rim of the world**, "very far and very tall, set close, and meeting overhead." The reader counted 24, then more.
- **The day:** grey light from the east, the same length every day "to the width of a thread." His master said it is "the god's eye, still opening." The Peak said day is the open hand and night the closed.
- **The stars:**
  - The Pale Order: the Unfallen, pieces of the Mother's bone.
  - The lodges: souls. The Myriad: spirits of the breath.
  - The sky-reader's "nail-heads" go out without falling, seven lost in forty years.
- **The wind:** a steady pull "toward the same quarter, out past the Sighing Ridge toward the dark." "Ash has never once come back."

### 1.7 The ages and the calendar

**Two schemes conflict:**
- **Codex writer brief:** three ages. (1) The Hush alone. (2) The Age of the Held Space. (3) The Age of the Last Breath.
- **Lore Bible:** four ages. Names are undecided (open question):
  - Set A: The Uncounted / The Age of Terrors / The Starving / The Age of the Last Breath.
  - Set B: The Unspoken / The Age of the Loud Gods / The Long Hush / Last Breath.
  - Set C: Ur-Vhaal / Vhaal-Khoroth / Nhaal-Uthrim / Last Breath.
- M01 uses "the Age of the Held Space," "the loud gods" and "the starving," and says nobody knows how the Held Space fits beside the loud gods.

**The Held Space** (CV, LB, M01):
- No night. Light "lay evenly over everything and came from nowhere." It "smelled of being held."
- Others were there long before the people:
  - the Choir behind the ribs;
  - builders who cut stairs in the bone;
  - "a court of white faces that judged its thoughts."
- Near the end, the congregation knelt and sang. The Tithed descend from it.
- The god "set something down among them, small and folded, the way a woman banks a coal in ash" (CV Choir, Deep). It lies "nearest the top" in infants, whose bones are still closing (LN).
- LB: whether the Held Space was "the corpse's life, a dream it had, or a story told by things that need one, no voice agrees."

**The heights** (LB): the gods walked, loud with worship. Dragons were among them, "one power of many, perhaps the greatest." Colossi fed on countries, towers drank, citadels marched, and mortal lords ruled through dread. "Most of what is known of it is wrong."

**The fall** (LB): the gods starved as their peoples died, stopped believing or were eaten. Starved gods broke into demons, the cities emptied, and knowledge died with the hands that held it. "Some powers did not die: they slept, went under, or kept walking because no one told them to stop."

**Now, the Age of the Last Breath:**
- "The corpse's last breath is still leaving it, and people live in that breath."
- Knowledge is the rarest thing. The tablets lie in ruins no one reads whole.
- What is left: "roads that were avenues, a stair no one climbs, a citadel still walking somewhere far off."
- "The faiths of this age keep the dark back with a soul in a jar for a lamp."

**The counts:**
- **Common count (the Pale Order's):** years "from the last breath." **Now is 1114** (the Stranger's letter; also LB and M01).
- **Others:**
  - Maiden: "from the first cup." Myriad: by Cuttings, one a year. Crone: "by winters, and by the length of threads read." Peak: "None; only noons."
  - Tithed: "rarely; the old count is the Order's." Citadel scholars: "the Order's, corrected, and argued over."
  - Root Deep: "by warmth, not by years." Slayers: none.
- The Stranger also cites an "Ashwake reckoning."

**Dated events** (ST unless noted):

| Year (of the Last Breath) | Event |
|---|---|
| about 80 (derived) | Villa Llaga's faithful begin paying; in 1091 their books said 1,000 years, "it was a thousand and eleven. They rounded down" |
| 206 | The Pilgrim Road's milestones are set, "by people who found the road already lying there"; the figures count down going outward from Ashwake |
| about 794 (derived) | A pilgrim-roll 304 years older than the Peak's fall records a barefoot brother with a black lamp asking for a name |
| about 867 (derived) | Year 1 of the Well-Shrine's count by Cuttings |
| 981 | The Stranger climbs to the Ossa behind the tithe and stays nine winters |
| about 1070–71 | The grey year, Cutting 204 (the Stranger reached the Well-Shrine "a season after, in 1071") |
| 1071 (summer) | The Stranger first climbs the Peak |
| 1091 | The Stranger walks Villa Llaga's Day of the Measure; the hatching comes after this, year not given |
| 1098 (spring) | The Peak falls; "comes down to nine" |
| 1103 (thaw) | The Stranger meets "the one who came up" |
| 1106 | The loose winter ("by the Ashwake reckoning") |
| 1109 | The god died 1,109 years before the Stranger "cut my first pen"; some give a year less, "all short by the same winter" |
| 1114 | The Codex letter is dated |

### 1.8 The lanterns, the rings and the dead

**The Wickbound** (W02, CV, M05):
- No lantern burns oil. Each burns a soul "that chose to be kept rather than go down into the Last Breath." It chooses whom it follows and cannot be struck or ordered.
- When you fall it carries you back to the lantern-stones and "keeps a little" each time. That is what it burns: "a way of whistling, a sister's name, the second verse of a harvest song."
- Inscription: "Dust on the glass. Wipe it. It is someone."
- The guild of the **Wick-Binders** first kept a soul in a lantern and was hunted out. "Every lantern on every road is theirs still" (LB).
- **The Sighing Lantern:** carried home a woman in grey (Aveth, "She was kind about the road") until nothing was left. Now it breathes in and out.
- **The Peak's black-flame lanterns:** a teacher burns his own name for fuel; the lamp goes out when the name is gone.

**The waystones, "rings with teeth"** (CV, ST, LB):
- Eight hooked fang-stones, seven standing and one fallen pointing at the pit. Banded like vigil candles; the bands grow. A dark stain seeps from each plinth and never dries.
- A pit of ash crust "lifts and settles," and something under it breathes.
- Walkers step in, come apart (blood first, bone last), feel a long pull "like being breathed in" with others in the dark, and rise at another ring. "It keeps a little" and moves scars.
- **Who made them, in rival claims:**
  - The builders: "WE CUT THEM FACING IN / SO THE MOUTH IS KEPT / BY WHAT IT HOLDS" (ST carving).
  - The Deep: they are its throats or ears, "where my teeth come through the skin in rings."
  - The Choir: "[mouth / door / wound]… Step through."
  - The Keeper of the Spiral Hollow: "the other hollow."
- Whispered: "the rings are coming nearer to each other, and someone is still cutting them" (LB). The Ford-Bell: "Something under the ash is breathing in" (CV).
- Every faith keeps away. Only pilgrims use them.

**Where the dead go: rival beliefs** (M01, M02, LN):
- **Moor grandmothers:** "down with the breath… like a leaf on a ford." "Some say you go back in."
- **The lantern-soul:** the down-place was warm and singing.
- **Children:** the dead are "laid" until the Mother has her bones, "then everybody goes home" (they point down).
- **The Pale Order:** niche, vigil, dust to the sky.
- **The Crone:** "through the eye of the loom" and woven again, or kept in glass.
- **The Maiden:** blood given with the Words carries the giver's name down into her and "comes back up as a saint descending the crypt stair."
- **The Myriad:** out on the breath. The boatmen's mothers say down to the drowned pews to wait for the bell; others say down the warm road under the Hide.
- **The Peak:** gilded and given to the Silence, leaving nothing.

---

## 2. Faiths, factions and peoples

**Hard rules for this whole section:**
- Each faith has its own word: **order, monastery, circle, procession, shrine** (LB table; open question whether to keep these). The Second Mouth is the only "cult."
- No "house" or "brotherhood" for any faith. Never "the five" as a title.
- Classes are **callings** (Ossuarch, Empty Hand, Hollow Mystic, Hemomancer/Red Penitent, Shrine Keeper), never particular characters.
- LB says: "Each [faith] keeps one power fed, each has an inner circle that knows a name the rest must not, and each has a calling."
- **The crafts of the dead** (LB): Order anoints bone and it stands; Maiden gives blood "and the blood gets up"; Crone holds souls in glass; Myriad takes a wrong breath into itself; Peak lets the dead finish. "Each faith calls its own craft holy and the others' theft."

### 2.1 The Pale Order (Bone): word "order"

**Names:**
- The lowlands named it for three things: the dust on its plate, the pale sky over its mountains, and the Pale, its path (ST).
- In its own old tongue it is **the Kostyak**: a skeleton, "and the few who hold a thing together."
- Briefly called "the Chapter of the Frame"; "Pale Order" has been locked since 09-29.
- Claims to be as old as the world.

**Its goddess:** Oss-Vharoth, the Bearing Mother, "the frame the whole Hide hangs on," who "has never once set it down."

**Seat:**
- Nine great ossuaries and a hundred lesser, cut into the white ridges of the Ossa. Nine Stairs is the first. Each has a Ninth Stair holding its running Count.
- Built over older halls the Order did not cut: knee-high risers, niches too long for any body, floors sloping to the middle. The Order hides this.
- LB: the ossuaries are cut "in the shape of a cavern it will not name" (see Oss-Karrhath, 2.8).
- Other places:
  - the Sky Pogost on the highest peak;
  - the Fifth Well (capped and sealed);
  - the Wall of the Come Down;
  - the Wardens' Wall;
  - the Seventh Ossuary, which has gone silent;
  - the Chapter-House of the Kostyak, on the fourth stair.

**Ranks and offices** (LB, M03, CV):
- **Novice:**
  - ties a cord of 206 knots;
  - carries a dead teacher on a yoke;
  - lays his birth-name in a niche with his first teeth "so that the Hush has nothing of theirs to unsay."
- **Brother:** written by number, never by name.
- **Warden of an ossuary:** an **Ossuarch**, the name of an office and of no one man.
- **The Wardens in Agreement.**
- **The Marrow Pontiff:** an office "that kneels at the bottom of the Fifth Well and never comes up," eldest of all things, "went down before the stair was cut," perhaps "one bone never replaced."
- **Offices:**
  - talliers (carry open counts "behind the teeth");
  - sweepers (the oldest brothers; the highest honour);
  - Brothers of the Well (draw marrow, render chrism);
  - star-watchers;
  - Seekers (walk the line of a fallen star);
  - knights of the Kostyak (plate of carved bone cut with the names of former wearers; ride "the low road");
  - the knight-scribe "Counter of the Peak."
- **The three offices of the Order:** "to keep the bones, to tend the marrow, to let finish what is ready to finish."

**Rites and rules:**
- **The Laying:** wash; chrism "joint by joint, thumb and two fingers"; the niche; the name (or the bone's name, "the long bone of the left arm, from the lowlands"); the number. "Nothing goes into the wall nameless."
- Hold a bone in two hands: "one hand is a grasp. Two hands are a bearing." A dropped bone is a sin, a broken bone a mourning.
- **The Feast of the Laying:** every wall is counted, and "the count is higher than the year before." The difference is "the Mother's gift," kept on a second leaf "in a hand no tallier has ever seen at work." "A tallier may add across that leaf. He may never add down it."
- **The standing dead:** anointed, they stand facing the stair and step down when asked. "I do not raise them. I ask. They were always going to stand." Skulls turn to follow a lamp, chrism lamps only. The long skulls on the lowest stair never turn.
- **The funerals:**
  - flesh to the high ledges of the Pogost, for the cold and the Myriad;
  - bones to the niche for the vigil;
  - dust to the wind at first light from the Sky Pogost.
  - "No one has ever seen the dust come down." The dust is weighed first on the Ninth Stair, which only an Ossuarch descends, and the weights are never spoken of.
- **The Rule and chant:** "Bear what is given. Keep what is laid. Let finish what is ready. Ask nothing of the Ninth Stair."
- **Sayings:** "The flesh is lent. The bone is kept." "Bone holds, or it breaks clean." "Nobody thanks the floor." "Letters wear. Figures do not."
- **The Order's sign:** "a figure bowed under a bar across its shoulders." Its mark on the truce-stone is nine notches.

**The Count (numerology):**
- Numbers outlast names, because the Hush cannot unsay a number.
- Roots: add the figures until one remains. **Nine keeps itself** and is the Mother's root, hence nine ossuaries, nine stairs and prayers in nines.
- A man is 206, root 8: "an open count, one short of the Mother all his life," closing only in the niche.
- "The fewer is the holier": a child has more bones than a man. The Mother seeks **the One Bone**.
- **The Last Number** closes the Count, and "she rests." "Rest" is said only of dust and of her.
- The Great Count's root is always one (CV tallier).
- **The Unfallen:** the stars are pieces of her bone not yet down. The roof is a frame of bone strung with cords nine by nine, 81 squares. Seekers fetch fallen star-bone, "colder than any bone of the niches, with no marrow in it," for the Wall of the Come Down. An Ossuarch can ask them down early (Bone Rain).
- **The Pale:** an Ossuarch sent out does not come home; he "walks the Pale," setting white Pale-Stones where he gathers bone. Lowland saying: "beyond the Pale."
- **The marrow:** amber, slow, warm. The rope is spliced longer every year and still comes heavy at the 900th turn. "The Mother gives it freely." Chrism closes wounds, which "stay hard and warm, and swell a little with the years."

**Creation, "the Falling"** (LB, M03):
- "Before the Count there was no count," and the Order forbids saying more. In its old books that time is written as a gap.
- The Mother fell and her frame came to rest as the world. The first brothers stood beside her and laid her bones.
- "The world was not made. It was set down, and is waiting to be set down again."
- Over the Ninth Stair: "WE WERE HERE WHEN SHE FELL. WE WILL BE HERE WHEN SHE RESTS." The Stranger's copy reads "WE STOOD BESIDE HER… WE WILL STAND BESIDE HER." The older lines under it never copy the same twice.

**Eschaton, "the Setting Down"** (LB):
- The Count closes at the Last Number and the Mother sets the world down.
- "Everything finished stays with her: laid bone, closed counts, dust. Everything unfinished is given to the wind: flesh still growing, breath still leaving, every name."
- "The sky, which is the Order's dust, comes down and lies over her like a cloth over a face."
- Anathemas at every Feast condemn every other end by name.

**Hidden; hint only, never state (C-Oss §4, the rulings):**
- They did not build the ossuaries.
- The count rises, and rooms nobody dug appear.
- The weights are wrong: the dust weighs more than the bone it came from, and the pale sky over the Ossa thickens and hangs lower.
- The builders' many-jointed bones never go brittle.
- The Rule on the Ninth Stair: "Keep her where she is." The Hush would end her all at once.
- **The Bone is growing. Never say it.**

**Factions (LB):**
- **The Ninefold:** militant closers who "count the living, close frames before their time." The Wardens "disown them in daylight and use them at night."
- **The Undercount:** scholars who go down into the older halls. They believe the Count "was never the Order's," that someone below still keeps it, and that the Order only copies it.

**Folk names for its calling:**
- "Grandfather Dust" in lowland villages; a counting rhyme says he "sweeps the child behind the door."
- "The Ungated": an outcast Ossuarch the Order shut out. His frame counts above 206, he came with dead of no known house, and he read the old lines aloud (CV).

**Feuds:**
- **The Maiden:** "two mothers, and one world of dead between them." The oldest feud, old terms on the barrows: meat to the processions, frame to the Order.
- **The Crone:** "neglect" against "desecration."
- **The Myriad:** the knights dredge their water-dead. The two "curse each other in the lanes and pay each other on the step" (the knight's purse counted to nine and the paper figure pinned on his back).
- **The Peak:** "the bloodiest quarrel."
- **Every faith:** hates the Silence "the way a mason hates frost."
- **Villages under the Ossa** give a tithe of sons, one from every ten households each third year by lot (CV Cold Adit).

**Vocabulary:**
- **Use:** bone, frame, marrow, well, chrism, niche, stair, ossuary, vigil, count, pogost, dust, grit, weight, warden, sweeper, relic; bear, keep, lay, anoint, stand, sweep, weigh, finish, give back, ask. A sparing Russian register: Kostyak, Pogost.
- **Never:** say the Bone grows; explain the builders, the count or the weights; pregnancy; mills or bellows; iron as a theme; "the Knitting"; eating dust; anything Tibetan; anything that glows.

### 2.2 The Gilded Peak, the Silence, and the Empty Hand: word "monastery"

**Names:**
- The Gilded Peak, the Kinrei-shū, "the Gold Bell."
- The lowlands called every monk "an Empty Hand" long before the name meant any one of them.
- Old pilgrim name: Hōkai-bō, "the Monk of the Broken Realm." Other folk names: "the Smiling Oblivion"; "the Palm," which the flesh-faithful spit when they say.
- The monks alone (and the mad) say "Ur-Nihl" plainly.

**Seat:**
- A monastery cut into a mountain of bone, the god's knee. 1,090 risers, with gold leaf on every seventh. Now fallen.
- **The courtyard** became black glass, "warm under the hand, by noon and by night."
- **The inner sanctum** held 108 gilded saints in niches; "the last on the left" was always empty, "kept."
- **The east stone,** where names were given at noon. **The old water-cut,** the novices' quick way down.
- **The great bell over the courtyard:** silent there, heard ringing long in the valley.
- **Lower Stair,** the parish below, where the survivors live.
- The music decision of 09-29 places "the Gilded Peak's mountains" with An-Vhar in Act IV. No lore text places it.

**Ranks and offices:**
- Novice: shaved on the stair one step below the teacher, grey smock with no belt.
- Monk: owns a bowl, a robe, "in time a lantern" holding a teacher. Master gilder. The abbot.
- Offices: chanters; gilders; bowl-bearers, who go down in fours at dusk with small brass bells; lay goldbeaters and bell-casters "who eat and keep the work coming."
- **A teacher walks one step behind and below the novice on the stair,** to catch the fall.
- No novice may listen to a silence alone; "always a shoulder against yours."

**Rites:**
- **The chant of one breath:** one syllable, then a silence as long. "The syllable is a fence, and the silence is the field it marks." The lowlands believed the chant held the miasma off the slopes.
- **Radiance and Absence**, "the Silence has two hands, and both are empty":
  - Radiance, the open hand, erases with light: "noon with no shadow."
  - Absence, the closed hand, erases with dark.
  - Gilding is Radiance made solid: "To be looked at and not seen" was holiness.
- **The Bowl:** "Put a name in it." Lowlanders whispered names they wanted gone (grief, debt, a man) and forgot them. The abbot gave the names "to the open hand at noon, over the lip of the east stone." The forgetting "has no edge," and the bowls grew heavier.
- **The dead** were gilded and "given to the Silence": no bone, no dust. The oldest masters were gilded while still breathing and set in the sanctum. Dark tracks ran from their eyes each night, and pilgrims said they wept for the living.
- **Rites from the interviews, adopted in LB:** the Noon of No Shadow (midsummer). Also from interviews: the Ringing of the Great Bell (midwinter) and Bowl Eve (a lowland rite).
- Each bell had "one syllable." The bell-caster cast a final tongueless bell, "the width of shoulders," and the monk tipped an empty bowl into the pour.

**Creation, "the Mouth"** (LB, M03):
- "In the Silence a mouth opened, and the opening was the god. It drew one breath in and held it, and everything that has been was inside that one held breath. It was small. The Silence it opened in did not notice it. Creation is a pause held too long."
- The abbot's version: "For an age the god held a space open in it, and held us inside that space, and it grew tired."
- **"Everything on the Hide is a wound that has not yet been allowed to close. We are wounds too. We have tried to be clean ones."**

**Eschaton, "the Pause Completed"** (LB): "The held breath is let go, and what remains is the Silence the breath was held in, which held the meaning all along. Nothing is destroyed; the sentence is finished, and a finished sentence has been said." The monks who were below keep the last office: "to be the empty space outside when it ends, holding nothing, so nothing is kept wrongly."

**The fall of the Peak, 1098** (CV, M03; see myths, section 3).

**Hidden; hint only:**
- The saints are the old masters, still alive under the gold, which "keeps them from finishing." "They were not weeping for us."
- The chant did not hold the miasma back: the Silence was so near that breath went quiet.
- Nobody knows where the names went, or whether they are forgotten or kept.

**Factions (LB):**
- **The Bowl:** still go down in fours. A name in the bowl is "laid in the pause where all meaning is held, and kept there safer than in any mouth." "Towns empty of names behind them."
- **The Gilt:** ascetics who gild themselves living, a leaf a day, until nobody can see them. Where one stood, people "cannot afterward say who was there."

**The calling:** an Empty Hand is "any monk of the Peak who has heard the space between words and carries nothing." What it strikes leaves "smooth black glass, a little dust, or nothing, never a corpse." A black flame follows a little behind.

**Feuds:**
- The Order: "The Peak leaves glass where the Order wants bone."
- The Myriad's purifiers hunt the Peak's monks.
- The flesh-faithful "hate the Silence more than they hated the Peak."
- The Crone's circles bar their doors to anyone who speaks its name.

**Never:** a mask; a gilded Buddha; a yin-yang (non-duality only implied); anything about his own body or fasting; explaining the saints.

### 2.3 The Veiled Crone (Soul): word "circle"

**Names:**
- Called by her name: the faith of the Veiled Crone.
- "House of the Polished Heart" is **retired**, because hearts belong to the Maiden.
- Old terms in the Codex and class page: "the Pir," which newer docs call "the eldest of a circle"; "lodge" survives as the building.
- **Folk names for her calling:** the Glass Man (villages turn mirrors to the wall); the Hundred-Faced; Needle-Brother (mourners pay him to sew their dead a little longer into the world).

**Seat and holy places:**
- Circles meet in lodges "where her threads come up through the skin of the world."
- The greatest stood at the head of **the valley of cold lakes**, where threads show in the lake ice. Forty-one sat in the ring around the eldest.
- **Greywell:** where the Silence came in. Seven chairs; the east wall flags stay dry.
- **Tarn Hollow:** a round lodge on round water, with a lowest room under the tarn that "keeps something in glass."
- **The Lower Reach:** dye-women by the river.

**Ranks and offices:**
- Novice; reader of threads; circle-keeper, who lights the one candle and begins and ends the names; the eldest of a circle.
- The eldest wears **the coat of glass**: iron sewn with small hollowed mirrors by every eldest before, until it "weighs what a second body weighs."
- Offices: readers; grinders (lay workers who make hollowed glass from Greenkiln green glass); menders of the coat's lining; coverers.

**Rites:**
- **The circle of names**, dusk to the grey hour: "Veiled Crone. Weaver. Grandmother Spindle. Knot. Tangle." The names go mouth to mouth "until they came back from the far side," and "remembering and the self become one thread."
- **Polishing glass:** "felt and ash, one of her names to every stroke," so a dying thread can read its road.
- **At a death:** cover every mirror, pail and window with grey felt, a stone on the corner. "A soul that meets its own face stops to look." Covered, it passes "through the eye of the loom, into the cloth."
- **From interviews, adopted in LB:** the Folding of the year's cloth (midwinter; one knitted row per death); the Casting-On of a child's thread. Also from interviews: a death-row must have no knot.
- **The oldest law, held by all:** "a soul cannot pass its own reflection."

**Creation, "the First Thread":**
- "Before her, everything was like the east wall at Greywell: dry, unmoving, held by nothing."
- "She drew the first thread out of nothing and tied the first knot, and the knot was the world, and every life is a length of that one thread."
- Whispered, never before novices: "someone tied a knot before she began."
- On the fall: "the threads began to go slack," and the circles were set to tighten them.

**On the Silence:**
- The oldest reading: "the Mouth With No Lips," "the Void That Emanates." Never say its name.
- Newer, called heresy: the Silence is the Hollow itself, "every meaning in the cloth is held in the gaps between the threads."
- "The servants of the Silence show nothing in a mirror. No lodge ever let one past its door alive."

**Eschaton, "the Still Winter":** "one winter every thread that ever went through the eye comes back up its valley at once and stands at its door asking which way." The Unveiled say the dead will stop at their own faces and be home. The Covered say the weave will finish its cloth and fold it. "Either way, nothing moves again; the candle stops burning down."

**The split after the loose winter (1106):**
- **The Covered:** the orthodox. They cover and send the dead on "faster now and more fiercely," and burn uncovered glass. "The loom is there, and saying so is the work."
- **The Unveiled:** "took the felt off." They keep the dead at their own faces in glass and carry them. Widows pay them for more time.
- The Hollow Mystic calling comes from the Unveiled: needles on soul-thread; mirrors that catch a soul; kept dead circling as wisps; "an iron coat of glass that stands up full of the kept and does not die for good."

**Feuds:**
- The Order: the standing dead are "a frame with no thread in it, walking, like a loom still knocking after the Weaver has left the room."
- The Maiden: "each calls the other's dead stolen."
- The Myriad, uneasy cousins: "a soul held in glass is a breath held forever."
- Lowland children say a reader's mirror "shows who will bury you."

**Vocabulary:** Sufi in rhythm (circles, remembrance, turning). Never "Polished Heart." Do not polish hearts. No drums, no fur, no breath-rites (breath belongs to the Myriad).

### 2.4 The Bleeding Maiden (Flesh): word "procession"

**Names:**
- Called by her name: the faith of the Bleeding Maiden. Never "Weeping."
- **Retired:** "Brotherhood of the Precious Wound," "the Precious Wound," "flesh-houses," "fattening houses," "the Laden Board" (scrapped).
- **Codex terms still in older text:**
  - sangrador (newer docs say "the bloodletter");
  - Spanish and Vodou flavour: El Penitente Rojo, Frè Plè ("Brother Wound"), Villa Llaga;
  - costalero, Nazareno, paso (EW).
- **Folk names for the calling:** the Red Penitent; "the Tall Red Hat" of the nursery rhyme.
- Rule: no real saint, lwa or sacrament.

**Seat:**
- Chapters along open wounds in the world.
- **Villa Llaga:** "a town built down both lips of a long wound… as long as a morning's walk." Forty hoods walked its procession. Its gutters run "the colour of old brown ink, and anyone who said red had never been" (M04, ST); others say red. Now it is empty.
- **Sallow Lip:** a daughter chapter on the salt road, "Measured." Its walls are its bricked-in dead. It sets Villa Llaga's tithe-cup at its closed gate every year, and "someone in their robes takes it in the night."
- **The crypt stair:** the Maiden's niche above it. The chapter's dead lie in their own wall, each robe on a peg. No knight of the Order may enter.

**Ranks and offices:**
- **Hoods**, known by place: "the twenty-ninth hood." When one goes into the wall, everyone behind moves up.
- **The Elder** at the front. **The bloodletter** at the back opens the others' welts and keeps the tally. By the oldest rule, "the one who opens others never opens themself: sleeves down, arms dry, for life." The reason is told only to each bloodletter.
- **Offices:**
  - cup-beaters;
  - carvers (images the saints come down into);
  - the keeper of the chained Rule;
  - "the counted-down" (ruled dead by a disputed count; they keep quiet offices);
  - allied **leech-wives of the mire** (Asheth of Kettlewick; their leeches are "small pieces of the mire").

**Rites and Rule** (CV, M02, M04):
- **The Day of the Measure,** once a year: the tin tithe-cup is filled to its line and poured "from the lip of the cup to the lip of the wound" while the Words are said. Blood let on any other day is spilled, not given.
- **The Elder raises the line** a thumbnail each eve of the Measure, and "she asked a little more" is chalked many times inside the crypt door.
- **The procession:** "the sway, the stop, the sway," the scourge "nine strokes to a verse." "It goes out from its chapter door and comes home to it. It must have somewhere to go."
- **The niche Maiden:** "her face left rough from the axe," never to be finished. On the fast-day each penitent kisses it and says nothing of what was seen. **Never "Friday."**
- **At night the saints come down the crypt stair** into carved images, and penitents go down two by two with candles. While the saints are down, a penitent must answer to any name spoken, kindly.
- **The fourth clause** of the Rule is scraped off, "kept in the Elder's mouth."
- After the hatching, new clauses appear in brown ink "in a hand that leans the other way" (CV Rule XXI–XXIX):
  - "The measure is all of it."
  - "The fourth clause is restored. The Words are spoken now at the front of the procession, by one who knows what the blood is for."
  - "The eleventh clause is struck through. … There is room."
  - "The niche shall hold a face."
  - "The procession goes out, and goes out, and goes out. It needs no door."
  - "The saints come down at night. They stay down."
  - "She hears."
- **Core belief:** "Blood given is not blood taken." "The Mother has no mind." The Words tell her whose the blood is and what it is for. "Blood given without the Words is given to no one."
- **Hearts are hers.** "A heart is a cup that fills itself." Tin heart milagros hung round the niche at Villa Llaga.

**Creation, "the Wound":** "The world began as a wound that opened and did not close. What came out of it was flesh, and the flesh grew because nothing told it to stop. The Maiden is that first opening; the Mother is the growing." What was wounded, they do not say. Of the fall they remember nothing: "the cup came down to them from somewhere."

**Eschaton, "the Filling":** "The Flesh fills every hollow: every wound, mouth, grave, room, and the gap between one word and the next. When nothing is hollow there is no *then*." This is "the Mother made whole," said carefully because it ends the Silence too.
- The chapters carry every knight's name in their litanies "so that she will know whom to take first when the time comes."
- The rhyme's last verse: "who will open the Tall Red Hat? … Mother will."

**Factions:**
- **The Measured:** most chapters. "A gift must be whole to be heard."
- **The Open Vein:** "the measure starves her and the Words are a fence." They scourge in the streets and their processions "go out and do not come home." The Second Mouth recruits from them.
- **The hemomancers,** a calling within the faith, revered and feared:
  - they open their own veins and let the Mother come through "with the Words said forward";
  - blood "flung and poured" that "falls and pools";
  - penances (cilice, thorns, nails) as armour, "a penance is only blood given slowly."

**Feuds:**
- The Order (the oldest feud).
- The Crone: stolen dead.
- The Myriad: "war, and also trade." Mindless flesh twists breath fastest; the Maiden's people are "the Myriad's worst enemy and, grimly, its best supplier." A purifier came to close Villa Llaga's wound.
- The Silence "unmakes flesh."
- The Laden Board material is scrapped.

**Never:** "Weeping"; "Friday"; "brood" (the Red Penitent rulings: no brood, no science or animal words; mutations are "penances"); "Second" or "Sacred Heart"; "Precious Wound."

### 2.5 The Myriad (Breath): word "shrine"; common folk call them Shrine Keepers

**Names:**
- **Retired:** "House of Eight Million."
- **Japanese terms in older text, which newer docs give in English:**
  - Misogi-ido is the Well-Shrine.
  - Minasoko-dō is the Drowned Nave.
  - Katashiro is the paper figure, "doll" in older text.
  - Torii is the shrine gate.
  - Ōharae is the rite at which a doll is hung on the Iron Hook.
  - "Oni" is the older word; newer docs say **"the Horned."**
- **Folk names:** Fan-Bearers (the boatmen); "Paper Dolls"; Shrine Keepers (wherever a forgotten shrine is set right).
- "Eight million" survives as the Myriad's own count of small gods, "and stopped counting long ago."

**Seat:**
- Wayside shrines everywhere: "two posts and a lintel at a crossing, a stone at a spring, a strip of white paper knotted to a bell, wherever the wind snags."
- **The Well-Shrine** at "the one clean pool of the Drowned Fen," the first of the shrines. Its day-book counts years by Cuttings.
- Under the water lies the Drowned Nave: bell, pews, altar, stair.

**Ranks and offices:**
- Novice folder; purifier; keeper of the day-book; elders.
- **The folding:** a novice is "folded, not ordained." Her birth-name is written into a paper figure and burned, and she takes another.
- Purifiers keep a knotted cord at the wrist, one knot per held breath.
- Offices: purifiers; folders of figures (reed-camp women, who never breathe on a doll); keepers of the guardian stones; allied boatmen ("pay at the Hook"; "a boat has no side").

**Rites:**
- **Bow to every small god you pass, and never ask its name.** Each gave its name to the wind on the way out "and is proud of it."
- **The guardian stone** of a forgotten shrine "turns to the wall, a finger's width a year, with no hand on it." A keeper turns it back and breathes on its face until the dust stirs.
  - Taught: it turns in grief.
  - Whispered: "it turns toward the wall to listen to something on the far side."
- **The rite of the figure:**
  - fold it by lamplight, never at noon, arms left open ("closed arms has already refused");
  - the troubled person breathes on it three times, and on the third it "leans toward them a little, as if called";
  - the purifier breathes it in, holds it, ties a knot;
  - she opens her fan "one rib at a time, for every rib is a road" and breathes out at whoever made the wrong. "The fan tells the breath where to go. Breath on its own only knows how to leave."
- **Miasma** is "breath gone wrong": breath that "turns round in some narrow place and forgets the door." It comes of moving a boundary stone, cursing a neighbour's well, growing flesh without a word. **Never "rot."**
- **The dead are given to the water**, so what is left of the last breath goes outward.
- **The Cutting-Away:** for 200+ years the year's wrong breath was breathed into the Fen. It ended with the grey year (Cutting 204). Since then **the Small Cutting**: breath into paper boats burned on a dry bank, silence until the ash is cold. The day-book: "Where does the year go now. It goes into us."
- **A fan opened and shut** means "I will take that in later, alone."
- **A doll on a doorstep** "asks once."

**Creation, "the Breath":** "The great one breathed in once, long, and every small god was inside that breath, warm, one sound. Then it began to breathe out, and the world is the out-breath, and every stone, ford and bell is a small god riding it on the way out." On the morning the great one went still, each small god gave its name to the wind. "It matters less what breathes than that the breath is leaving."

**Eschaton, "the Last Breath Out":** "The out-breath finishes. Every small god… settles like dust. A purifier who has already walked down into the water comes back up and breathes the world in, once, as the last rite; the world is folded like a paper figure with its arms open and set on a step, and nothing comes to breathe on it."
- The Ford-Bell: "Out is closer than it was."

**The ending of every purifier:**
- "Every held breath leaves a little of itself behind." The cord grows longer than the knots she tied.
- The face "goes long and hard; the horns come in slowly, like a child's teeth."
- One morning she stands up "with her hands full of everything she took and walks down": into the water, or the Root Deep.
- "They say *ends*, and they say it gently." Her time is near "when the guardian stones begin to turn toward her."

**Factions:**
- **The Folded:** the orthodox. They serve while they have room.
- **The Horned:** have begun to turn and stopped resisting. "The end is the true office." They gather at drowned places, patient, and the Folded will not speak their names.

**The calling:** "a purifier running out of room."
- A drifting haze that sickens and makes blows miss.
- The fan; turning harm back on its maker.
- "a reversed presence in the haze beside her," whose name nobody asks.
- Omens: the small gods of the dying gather as pale omens and are spent in the finishing blow.

**Feuds:**
- The Order: dredging. The Myriad claims the raised bone "came up bent" and caused the grey year.
- The Maiden: war and trade.
- The Crone: cousins.
- They hunt the Peak's monks.
- The Silence: "A purifier can hold a wrong breath until it bends her. She cannot hold an absence."

### 2.6 The Second Mouth: the only cult (SM, LB, M02)

**What it is:** a heresy of theophagy hidden inside the Bleeding Maiden's processions. Use "theophagy" in design notes only; in the world they say "the oldest theft in the world."
- The faithful's word for an initiate is the same as their word "for the thing that lives in a wound and keeps it from closing." The doc calls it "parasitism"; M02 avoids naming the word.

**What it takes and wants:**
- The Mother's flesh "where it lies close under the Hide, opened at night in places the Myriad will not go," and "the bodies of those she has touched."
- It wants to carry her.

**Doctrine:**
- The wound is "a door, not a mouth." What comes out is her, looking for somewhere to go.
- "Worship starves her": belief keeps her under the Hide, mindless. Taken into a living body she has eyes, hands and a voice again.
- "The Words run both ways": forward they give, backward they take, "and the Mother cannot tell who is taking her."

**The rite:** "The god never enters by the mouth." A second mouth is cut under the breastbone, then opened and sewn shut "with gut thread at every rite, in darkness, to the backward litany."

**Grades:**
- **Vessel:** one mouth; wounds close without a mark; runs warm.
- **Shrine:** three mouths, two new at the flanks; no longer bleeds; dreams in her voice.
- **Reliquary:** stops aging. "No one below this grade is told what it takes," and none has been seen to leave the dark.
- **Sign:** a hand held flat over the breastbone. By day they keep the hood, the Words and the cup.

**The crone, the founder and first Reliquary:**
- "Her name is unchosen; she has outlived the one she was given." Keep her nameless. **She is not the Veiled Crone.**
- Folded nearly double in a chair she has not left in a lifetime, covered in second mouths. Most are sewn; a few whisper in the Maiden's voice, out of time.
- She cuts every initiate's first mouth and says the first backward word into it. She reads the Mother's will in fresh wounds "the way the Veiled Crone's people read glass" and says only who may go on.
- Initiates disagree: a woman who holds the Mother, or "the Mother, wearing what is left of a woman."
- "Her mouths have begun to answer one another."

**Claims:**
- The unspoken fourth clause is the first backward word.
- The Maiden "has worn an initiate's face more than once."
- Every hemomancer "is a Reliquary who has not been told."

**Creation, "the Door":** "The world is not a body but the outside of one. The Mother is inside, and every wound in the world is a door she is trying to come out of. Creation is not finished: it ends when she has walked out wearing her people."

**Eschaton, "the Walking":** "When enough Reliquaries carry her, the Mother walks out of the world in them, many bodies, one will." The faithful call this the end. The cult calls it "the beginning finishing."

**Enemies:**
- The faithful burn it wherever they find a sewn breastbone, and "an initiate's bones do not burn clean." A penitent who will not open the robe is not trusted with the cup.
- The Pale Order counts the cult's dead twice: high initiates' frames "come up heavier than a body allows."

### 2.7 The Tithed: common folk of the lowlands

**What they are:**
- Descendants of the congregation that knelt inside the god at worship when it died. They are "the only things not made of the god," and so "the only readers the corpse has" (CV Aumery).
- The god's pieces want them: some to take back inside, some to "put us on like a coat, and kneel, and be us." "They are homesick." "They do not hate you. That would be simpler."

**The double Tithe, kept on purpose:**
- "We are the Tithed: owed, and given."
- To be tithed is also to be hollowed out. Those who gave everything (to a power, a faith, or the toil of keeping the world going) "do not lie down… wait in rows, and rise when three gather."
- A hood's view (M04): "a tithe is what you give, not what you are." The lowlanders say the hoods "are the tithe themselves."

**Creation, "the Kneeling":**
- They knelt inside something warm and sang. It died around them.
- They "took hold of each other's belts in the dark" and walked through soft, hard and pulsing places to "a door, warm and wet, that opened and shut." That was the mouth. They walked out on the breath, fell on the Cheek, and kissed the ash.
- "Did they all come out?" "All of them." On the second night: "most of them."
- They keep three notes of the song, low and going down, and **never sing the fourth**, which goes up "like a question."

**Rites and rules** (adopted in M01 and M05):
- **Kneel-Night:** once a year when the ash is wettest. Kneel round a banked fire dark to grey, no singing; stand at once at first grey; walk one ring holding belts.
- Belts are knotted at the back "so that whoever walks behind you has something to hold."
- **Never sing on the Moor at night: "They know the tune."**
- **Keep your true name behind your teeth.** A mother gives the name "in her mouth" and says it aloud once at the hearth at weaning.
- Salt on the doorstep, sill and round the bed: "the congregation carried salt in with them, and the god never had any of its own." A lantern at the cradle's head.
- Bank fires low "so as not to scorch the place where we were let out."
- "We come in owing": a newborn's first breath out is longer than its first breath in.
- "Somebody always sits up."
- **Low Day** at the Barrows: lanterns at every barrow foot, and nine times: "lie down, lie still, lie low, lie long, till the Kneeler finishes."
- Keep children's names low near the old drifts and when crossing the rings.

**Eschaton:** "no end of their own… the lanterns go out one at a time, and somebody always sits up."

### 2.8 Other faiths, heresies and powers

**Faiths of this age (LB):**
- **Herald-cults:** each power's herald draws its own worshippers. The Marrow Pontiff (Oss'khalath), the Weeping Gash (proposed; Shog'maathe), the Long Exhale (Hau'Nuulh), a Silent One (a gap).
- **The Last Vigil:** lamp-bearers who went down into the body and keep a watch at its gate "against whatever was left thinking in the deep." Act V's town; Brother Ansel of the Last Vigil.
- **The Count-breakers:** lowland apostates who believe the Order's numbers keep the dead walking, and unmake tallies at night.
- **Faiths of the Dreth'ael towns:** a town owned by a blood-lord worships it without saying so.
- **Far faiths:** the sea people who pray to a drowned god's memory; pilgrims of the mountain that is one mind.

**The Marrow Pontiff's appearances** (CV):
- At the Fifth Well it counted a brother down "4050, 405, 45, 9" and said "*Kneel*."
- At the well of Old Upright in the Barrens:
  - It rose: "long pale fingers pressed tip to tip… the way a crown is tall," with "a bowl of bone, worn hollow" for a face.
  - Its words: "*Early.*" "*Has she fallen. Is it after.*" "*Carried thing, in her.*" "*Kneel, as you knelt.*" "*She has stood since before… Someone kneels for her.*" "*One bone. She sets down one.*"
  - It counted a pilgrim woman 206, then 207: "*Closed. Nine.*"

**The Flesh's herald, the retired "Wet Nurse"** (CV midwife): taller than the door, front soaked dark, kindly. "She said she had room." She takes the bleeding, then speaks the child's secret name. The child grew up with wounds that close without a drop.

**The Long Exhale** (CV, "Four in the Traces"): a wind of grey faces coming up the road on the Heights. Each speaks one word as it passes ("*Hahh*"). The carter Ivo slipped the traces and walked into it.

**Prehuman voices of the Held Space** (CV chapter VIII, IV, LB):
- **The Choir** (the Hymn under the Long Candle), in "the long groove behind the ribs":
  - "We were the part of the god that told it what it was." "We were eleven hundred and one, and then one."
  - It waits for the out-breath to finish "so we may come in on the next line."
  - The congregation "answered badly, with names."
- **The builders**, called by LB **the Lintel-Folk (Khurr-Ossat)**, self-named "the hinge":
  - "We were cut from the first of the room, and began cutting at once."
  - They cut the knee-high stairs and the long niches. "Lie down facing the stair. Watch." "Our joints do not finish."
  - "Do not say its name. We cut no name for it. We cut around it." Every ring leaves a thumb-wide gap.
  - "Now one of you" should take the seat at the pillar's foot.
  - LB: they walled themselves into their own halls when the Order came. The ossuaries are their upper floors.
- **The Porcelain Court (Ael-Yh'ani):** "faces that sat in judgment on souls," now worn by moth-winged things at dusk (the Moth-Saints).
- **The Keeper of the Spiral Hollow:** far down the Descent, "where the Holder hears." Its "law of after": "The Holder will hear again. Then it will answer."
- **The Deep, the Root Deep:** "the floor under the skin… before the skin was laid over, I was the floor of the [ ]." It is courteous and asks for infants "where the folded thing lies nearest." "Soon" it will breathe in. It calls being kept in the floor "a kind of up."
- **A Silent One at Greywell:** a servant of the Silence. Ink whitens around it; the light leans east; "a fourth breath, drawn in, that does not go out."

**Peoples who are gone (LB):**
- **The First Brood (Yl-Nothuun, "the One Swallow"):** one mind in many bodies in the mire; built the ziggurat and causeway. Creation: "the whole of the beginning was one swallow, and they were inside it going down, and it was the only time they were warm all through."
- **The Sky-Climbers (An-Vhar'ith):** believed the sky was an open mouth and climbed out by it. None came down.
- **The Marrow-Eaters (Ghauul):** "tall, hollow and courteous, made of hunger." Creation: "the hunger of something that wanted nothing… stood a long while in a warm room where nothing wanted, and were at rest."
- **The Slayers (Vhoor-Qhan, a scholars' name):** "things from outside that left no bodies"; a temple deep in the body with "a thought left thinking in it."
  - Creation: "something was opened, and they came in where it was open, and there was never a beginning, only a way in."
  - End, "the Thought": the world is a thought "forgetting what is in it one thing at a time… a thought that remembers no one, and that is rest."
- **The Wick-Binders** (see 1.8).

**Old powers of the heights (LB, M01):**
- **The Ythraal, "the First Terrors":** dragon gods who lived on "the terror of a world without walls," "one among many, perhaps the greatest, perhaps only the ones that lasted longest." Some say the ribs of a valley in the white lands were one of them.
- **Morrh-Ythraal, "the Starved Crown":** the last dragon and **the dracolich**. It ate its worshippers, then its own flesh. It wears an iron crown it forged when it had subjects, on a broken throne in the Crown Citadel it consumed to stay awake, "desperate to be feared again."
- **The Gorrhaun, "the Famines":** god-corpses the height of hills; kingdoms worshipped by walking up the ramp into them. One still walks, and the ground keeps a pulse where it treads. Dhum the Swallowed is still lit inside one.
- **Vhul-Oghra, "the Tower That Drinks":** one ooze filling a tower, full of eyes, every eye someone's. Awake; "a town in its sight has no dreams of its own."
- **Oss-Karrhath, "the Reaper Below":** a giant skeleton whose right arm is a scythe of its own bone, in a cavern floored with an age's dead. "Asleep, perhaps; every ossuary is cut in the shape of its cavern."
- **Nhul-Thessaruun, "the Shell Beneath":** a shell the size of a cathedral under a delta, filtering blood. "Its slime raises the drowned." Thessar sank itself to be near it. LB describes it with animal words (clam, sponge, snail), so describe it without them in the world's voice.
- **The Khar-Dhuum, "the Walking Walls":** cities that worshipped their walls until the walls stood up. Vesk walks still, "its people iron where they stood."
- **The Unworshipped, "the Bargainers":** demons.
- **The Yh'Vhoor, "the Mouths at the Wick":** soul eaters, rivals of gods, hunting the roads at night near lanterns.
- **The Dreth'ael, "the Unforgotten":** mortals who drink the belief blood carries, killed only by being forgotten, one to a town.
- **The Lords:** kings, abbots, matrons and generals believed into small godhood. Some became liches.
- **Behemoths:** "great beasts that never learned a name." Avoid the word "beasts" in the world's voice.

**The Visitors**, who owe nothing to the corpse, gods or Silence:
- Ykkoth-Taal **the Tallyman** takes the difference where a count is wrong.
- Nhar-Ghulim **the Ferryman of the Dry Ford** still takes fares across a river that left.
- Ath-Sorrauun **the Gaunt Pilgrim** has walked upward since before the last breath; where he passes, the dead lie back down, "and some of the living."
- Vel-Qorrath **the Lectern** is a reading-stand with a book that is the reader's own life, a page ahead (compare the Reader's Bay).

**The serpent god of the Sunken Bog** (Derek, 2026-10-08; MEM, SP):
- "a giant demon snake god long dead." "Serpent" is allowed for it.
- Its spine is the bog's path, mostly overgrown, vertebrae poking through, ribs out of the water, a great skull and an eye socket.
- **Folk names, all wrong, true name never given:**
  - **the Long Back** (bog folk, who think the Tithed laid it as a causeway);
  - **Saint Uss's Causeway** (pilgrims; a saint in no calendar, "worn down like a step");
  - **Old Coil** (children);
  - **the Stair of the Drowned King** (boatmen: a king walked down it into the water and is still walking).
- **Its landmark, the pit of offering:**
  - an obsidian platform of concentric rings, partly sunk and ringed by the serpent's coil;
  - gutters, and blood "as if a thousand were sacrificed, channelled into the hole to feed the god";
  - an altar, iron racks, runes, and tendrils climbing from the throat;
  - a red glow from below.
- No myth is written yet.

**Status of the oni, the Root Deep and the "House of Eight Million":**
- "House of Eight Million" is retired. "Oni" survives in old text and the voice lines ("The oni walk down this road with their sacks"); newer docs say the Horned.
- **The Root Deep (Ne-no-kuni)** stays as a place: "the oni's road down" and "the country under the Hide."

---

## 3. Myths already told

| Myth | One-line summary | Where it lives |
|---|---|---|
| Of the Name That Will Not Keep | Aumery spends forty years writing the god's name; leaves come clean; at last only a pale palm-shaped place; leaves vanish between numbered ones | CV I; M01 |
| How We Came Out onto the Cheek | The kneeling, the belts, the warm wet door, kissing the ash; "most of them" | CV I; M01; M05 |
| The Sermon at the Dry Ford | "The god was eased"; he takes names in his hands; his place becomes black glass shaped like a seated man | CV I; M01 |
| The Sky over the Hide | The wind-thread, the whitening Ossa sky, the arches, the measured day, vanishing stars, white flashes over rings | CV I |
| What the Cradle Keeps | Salt; babies born holding things (a knuckle-bone the Order numbered); the Flesh's herald takes a girl's bleeding | CV I; ST |
| Held to the Ear | A lantern-soul says how it chose ("wanting to see who") and what it burns | CV I |
| The Round at Ashwake | The tender's letter; the Sighing Lantern; lanterns heavier on the scale; "WHICH OF YOU IS ME" | CV I; M05 |
| Margins of a Chart of the Hide | The surveyor draws a face; it turns toward the camp; the pen draws the eyes closed | CV I; M05 |
| What the Children Sing | Grandfather Dust, the Tall Red Hat, Needle-Brother, the Bowl, the Unfallen, the Stones; refused last verses | CV I |
| The Fourteenth Grave at Coldhearth | A Silence servant empties a hamlet; 14 graves, 13 spoons; a forgotten child's coat | CV I |
| The Beggar at the Ninth Stone; the walkers' counsel; the measurer's tables; Wenna between the stones | The waystone accounts | CV II; ST |
| The Digger's Tally | The Barrows' rules; the Empty Ninth | CV II; M05 |
| The Hunter's Paths | The tenth trunks; the Wood leans to the Root Deep | CV II; M05 |
| The Door Left Ajar | The Drowned Village; dry water; the Iron Hook; the bowed arch; the reed that points down | CV II; M05 |
| The Rules of the Heath Fire | The herd ring and its four tellings; the seat beneath; gibbet cages for "the ones who came up wrong" | CV II; M05 |
| What Kettlewick Stands On | Tallow; knot-lamps; stilts growing taller; tall grey walkers on the Flats | CV II |
| What the White Road Asks | Valley of Standing Ribs (23 or 24); the Drowned Caravan; seated saints taken into the Mother; Saint Calcifer; finger-counting | CV II |
| The Foreman and His Daughters | Widow's Stumps; one daughter, Nell, let go and lived, kept by the drowned | M05; Q |
| The Kneelers, Barrows, Rib Crypts, Carrion Warden | Kneelers; barrows; the Great Standing; the Long Candle; the Counting Wall; the Carrion Warden "let stop" | M05; Q |
| Hesk the Tallow-Mother | The bog-witch renders the drowned into candles that walk | M05; VO |
| The catacombs and the Ossuary Matron | The Reader's Bay book; the Miscount; "end the count" | M05; Q |
| The Pale Order's teaching texts | The sweeper's letter; the Lesser Catechism (Q&A form, banned now); the tallier's arithmetic; At the Windlass (the Fifth Well); Radko's letter; Cold Adit's book; Benn's letters (206 becomes 207) | CV III |
| Entry the Four Hundred and Fifth; Of the Unfallen; Old Upright | The Ungated shut out; the star-watcher sees a man ask the stars down; the Pontiff counts a woman to 207 | CV III; M03 |
| The fall of the Peak | Nine days of counting dead; the abbot's letter; the tenth night (1098); the morning of glass; the knight-scribe's 206/209 count and the empty niche | CV IV; M03; ST |
| The Peak's survivors | The lamp-seller novice; the bread-woman's second cup; the goldbeater's pinholes at the saints' mouths; the tongueless bell; the magistrate's clean spaces | CV IV |
| The loose winter (1106) | Forty nights; "There is no loom. It goes on and on, and it never finishes"; the dead ask "Which way?"; the felt pulled; the coat stands up; the blind grandmother walks on | CV V; M02; M04 |
| Greywell | A circle meets the Silence; seven chairs, no bones, the glass shows nothing | CV VIII; M02 |
| Villa Llaga's hatching | The crust year; the fast-day of the Fall; mindless children in the hoods' robes; the sewn giant carrying the Maiden, now faced | CV VI; M02; M04 |
| The Year of the Water Giving It Back (Cutting 204) | 33/34 steps; six turn Horned; one carries up a girl never sent; the reversed one in the haze | CV VII; M02; M04 |
| What the Sixth Doll Carried; The Count of His Breathing | A ring of teeth behind the drowned altar; a road down; a wife counts her husband's breaths | CV VII |
| Four in the Traces | The Long Exhale on the Heights | CV VII |
| The Assize at Four Wents | Four faiths claim one dead man; he walks "down"; a soft place widens | CV IX |
| The Terms of the Truce-Stone | Long Field dead; who broke which clause; a mysterious eighth clause | CV IX |
| The Unfallen; the Three Funerals; the Laying | The Order's teachings | M03 |
| The Kneeling's congregation tune | Three notes and the forbidden fourth; Ottelin knew the next line | M01; CV VIII |

---

## 4. Places

### 4.1 Act I, the Hide (25 zones)

**Ashen Moor, the Cheek** (W02, M05, CV):
- Warm ash. Black glass where Husk blood ran ("stays warm"); sold for knife-edges.
- **Landmarks:**
  - **The Sighing Lantern:** bronze, cracked bell. Its place differs by teller (the Ashwake crossroad, past the Widow's Stumps, or on the Ridge crest). "Aveth. She was kind about the road." Errand: something drinks its light.
  - **The Widow's Stumps.**
  - **The Broken Kneeler:** a stone bench halved "the night the god died." The Ash Shore claims another.
  - **The Ashwake milestones:** chalked yearly by Villa Llaga's penitents (VO). The Copyists' Mile.
  - **The Jaw,** a long rise. **The Fallen Watchtower.** **The east drift** of the Moor workings, where the Deep speaks.
  - **Maren's camp:** its lantern was "the first lit on the Moor after the fall."
- **Act I people:**
  - Maren (vendor; "the Gravekeeper" in M05);
  - Sister Ysolde (healer; the Mender's order);
  - Brannoc of the Nail (smith);
  - Warden-Crone Esk ("I was a warden once");
  - the Stranger.
- Crows are allowed on the Moor (R01, 10-01).

**Sighing Ridge:** wind like breath; colonnade stumps; the Widow's Stumps.

**Ash Shore:** a grey sea "that does not move like water." VO: "Some say the sea is the god's eye, filmed over."

**Burnt Heath:**
- Burned a year after the god died, and nobody lit it. Pyre-Saints; the ash-circle.
- **The dead herd**, seven great horned carcasses facing one way:
  - Garrow: "the god's first thoughts, sent walking to carry something."
  - Brannoc's girl: "knelt to something coming up."
  - A knight: "to hold a door shut."
  - The fire-keeper's mother: "The ground between them was opened once, and closed."
  - "A seat under it, and someone sitting in the seat, very patient, waiting to be asked," with seven empty places at its feet (LN).
  - Its homage king (the Hollow King) is parked.

**Rib Crypts** (Dur-nang, "the inside grave"; the Hollow Crypt):
- Nine galleries. The flagstones lift as something below breathes.
- **The mothers' niches** were emptied by **the Great Standing:** walked out, or taken.
- The Long Candle, burning "since before the fall." The Counting Wall, in groups of 108. The Empty Reliquary of Sister Un, where no dust settles. The Weeping Rib.
- The Choir's singing comes through the floor.
- **The Carrion Warden** "forgot what he guarded and began to eat what the Tithed buried."

**The Barrows:**
- Nine barrows to a ring, nine of a family to each. Lids are dished inward, deeper at dawn, all pointing to the tooth-stone ring. Whispered: "the lids have begun to lift."
- The dead rise clean and stand at their own doors. They are put back face down with a stone on the neck and no name said.
- The Turned Mound; Widow's Lane; the Grieving Stone.
- **The Empty Ninth:** full of long clean bones that are not the digger's dead. The only flat lid. "Waiting."
- Bellwethers carry names on their bell rims. Low Day is kept here.

**Drowned Fen** (lymph):
- Dry clear water; every reed bends toward something.
- **The Well-Shrine:** the one clean pool. **The Drowned Nave** below it: bell, pews, altar, a stair of 33, 34 or 36 steps. Behind the altar, a ring of teeth and a warm road going down.
- **The Kneeling Arch:** bowed forty degrees "toward the edge of the world," where the boatmen sleep. **The Reed That Points Home**, which "points down" for the old woman. **The Iron Hook,** with a paper figure hung yearly.

**Drowned Village:**
- An iron hook in the well; water "clear as a held breath" rose and never wetted. "The drowning never finished."
- Doors ajar; the table set. Bells ring at dusk though "the belfry fell a thousand years ago" (and she rang it). The Sunken Square; the Lych-Gate.
- Nell was kept here.

**Sunken Bog:**
- "The Fen gives up pretending to be water"; the mud clutches and lets go.
- The serpent god's spine and its pit of offering (2.8).
- The Bog-Witch's Shack: Hesk the Tallow-Mother; chimney smoke and no fire; a doorstone worn by knees.
- Art references: the "Famine" painting of a sunken Gorrhaun face; the wisp-fire.

**Hollow Wood** (veins):
- Pale trunks warm a hand's depth in, with a slow beat. Cuts weep clear and close by morning.
- **Every tenth trunk holds something the god carried:** a bell in its hand, a candle in its mouth, a skull, ribs with a pilgrim badge, a lantern that "was a ninth the year before."
- Three colours of light caps; the Codex says white for sound ground, blue for hollow, red where it still bleeds.
- The roads were "there first; the Wood grew away from them."
- **Landmarks:** the Ribcage Bough; the Niche Candle; the Sword-in-Root. **The Blind Face is struck** (Derek, 2026-10-07:
  "Better yet, no face, scratch it from the lore too"); the Vigil, the altar glade, took its place.
- **Hamlets:** Coldhearth (14 hearths, emptied by the Silence) and Cap Hollow.
- The Stalker Crone haunts its tall grass (M05).

**Root Deep (Ne-no-kuni):**
- Breathes; courteous; "answers iron." Leave a coin on the milestone, "something will be kinder."
- The Horned walk down with sacks, "nothing walks up." It keeps a little of everyone.
- Halls are "wider when I enter than when I leave."

**The catacombs:**
- **Upper (pilgrim ossuary):** bone laid as sermons; the Cup Wall rings; Ossuary Wardens salute each other; Marrow Duelists; Choristers. The Reader's Bay book, "the hand on the page is yours."
- **Lower:** the patterns forget themselves; a ceiling sagged into a face; the Miscount; a snapped pick. "Monks dug until they struck something warm."
- **The Ossuary Matron** counts the dead she stands up. "End the count."

**Lesser Act I zones (mostly VO only):**
- Fern Gully (the Berry-Warden).
- Pilgrim Road (glass-paved patches; "Down").
- Fallen Monastery (the altar turned "the night of the fall").
- **The Gnawed Chapel** (`wolf_den_chapel`): the game already shows this name; "Wolf-Den" broke the animal-word law and is gone from the docs.
- Plague Hospice.
- Well-Shaft (iron rungs, then bone).
- Smugglers' Hold (contraband bone for "the Ossuary Lords").
- Tree-Hollow (a candle 800 years in a knot).
- Hunter's Cache.
- Fallen Watchtower (the Buried Bell).
- Broken Bridge (Old Garrow's fire; "it is not a river. It is a vein").

**Other lowland places:**
- **Ashwake:** crossroads, lantern-stones, ring, inn, scriptorium.
- **Kerrow Cross:** the truce-stone where five roads meet; the Share Fair "on the fourth morning."
- **Four Wents:** the Barrow road crosses the salt road; the reeve; the soft place.
- **The Dry Ford:** its river god "rode off on the breath."
- **Cold Adit:** an iron hamlet under the Ossa that tithes sons.
- **Lower Stair:** under the Peak.
- **Others:** Greywell; Tarn Hollow; the valley of cold lakes / Lower Reach; Greenkiln; Kesk; the Lower Stacks (a sages' place); Cinderholt; the Salt Ford (a ropeless bell).

### 4.2 The other acts

**II. The Bleached Barrens of Ossa, the Pale Order's land:**
- White ground of bone. Ossuaries in the ridges.
- **The Citadel of the Shattered Femur:** its reliquarists and scholars "read what comes up… and do not finish."
- Valley of Standing Ribs; the Drowned Caravan; roadside sitting saints; **Saint Calcifer** in the Empty Socket, "finished nearly everything"; the well of Old Upright.
- Whispered: "Counts taken twice come out one higher; the white line of stones walks outward on its own."
- Old VO lines speak of "crusader orders," "nine orders," "the Last Crusade" and "Ossuary Lords." These are superseded.

**III. Shog-Mire, the Flesh's land:**
- A mire whose mud clutches on its heartbeat; the Kettlewick Stilts.
- People: Priestess Ninsun; Asheth the leech-wife; Mother Brisk.
- The Blood Delta; Brood-Banks; Amber-Grease Mire.
- The Causeway and the Ziggurat of the First Brood. The Blood-Basin's mother is "the one who is learning."
- Whispered: "Something in the red water is learning the words."
- Errand myth: "Before the Ziggurat there was an egg, and the egg hatched the fen."
- The Brood-Mother.

**IV. The Heights of An-Vhar, the Sky-Climbers' land:**
- Frost; flames that barely move; a stair nobody climbs. Bellrest Hearth; Bellrest That Was "climbed, all of it."
- The Unrung Bell and the Chime-Abbot. "Every bell in the world rings flat by one breath."
- The Long Exhale walks here.
- NPC names (Dorje, Palden, Ulan, Tenzar) and "mantras/prayer flags" are Tibetan. Whether to keep them is an open question.

**V. The Descent:**
- The Last Vigil's fire. Spine, marrow siphons, blood sea, valves, the nerve shaft, the Digesting Crucible ("ruins older than the god"), the Cerebrum.
- The Slayers' Alien Temple and the Thought of the Slayer.

**The Scar of Ur-Nihl and the Silent Monolith:** where the Silence came in, or "is most legible."

**Beyond the known lands (LB):**
- A salt coast where the sea answers.
- The Hand Forest: "pale trunks that end in fingers, all pointing the same way."
- A walking citadel; cities on the backs of things.
- A white country of snow that is "the dandruff of something asleep."
- "None of them has heard of the corpse, and some are older than it."

**Dead cities (LB):** Khurr-Ossat; the Crown Citadel; Vesk; Thessar the Sunken; Dhum the Swallowed; the City Beneath the Tower ("every bed is made"); Bellrest That Was; Villa Llaga; Greywell.

---

## 5. Names and word rules

**Glossary of people and minor figures:**
- **Sages and copyists:** Aumery the Copyist; Idrenne of the Lower Stacks; Mahault the Blind; Hesk of the Pale Order; Ottelin of the Lower Stacks.
- **Ashwake and the lowlands:** the tender of Ashwake round (her teacher "leans east"; lanterns Old Hesk and Little Brand); Ninth-Stone beggar; Wenna (child, "Pip"); Old Garrow; Brannoc's girl.
- **Pale Order:** Radko, knight of the Kostyak; Benn, written 9,106 then 9,107, with his teacher Brother Oskol; Wat Orrin of Cold Adit; Vasko the novice; 7,209 the tallier; 4,050 the well-brother; 5,013 the star-watcher; 3,114 the scholar; 4,410 the Tallier; 405 the knight; the Ungated.
- **The Peak:** Sō (the youngest novice, who carried the abbot's letter; now "the washer" of Lower Stair); Master Enshō (gilded while warm); the Counter of the Peak.
- **The Veiled Crone:** Mother Ysolt, reader; Keeper Aubren and the scribe Pell (Greywell); Sister Oda and Brother Hal (Greywell); Oswy.
- **The Myriad (Well-Shrine):**
  - The seven who went down: Hisa, Chiyo, Nae, Sen (Jinpei), Rin, Kasane, and the one who asked to go.
  - The keepers Tomoe and Kasane; the old folder Tsuru; Tae, Jinpei's wife.
  - The class-hero names Shiori and Akane. The Lore Bible suggests dropping the people and keeping the events.
- **The Maiden:** Asheth; Mother Brisk.
- **Heights, Moor workings, the Descent:** Ren and Ivo; Dunne Hask and Tobin Carrow; Brother Ansel.
- **Bog-witch and roads:** Hesk the Tallow-Mother; Aldous Pell.
- **Repeated names that may confuse:** Hesk (four uses, and Hask); Wenna (three); Tam (three); Pell (two); crones (the Veiled Crone, the Second Mouth's crone, Warden-Crone Esk, the Stalker Crone).
- **"Reliquary" means several things:** the corpse; the Second Mouth's top grade; the stash chest; "the Last Reliquarist."

**Relics and sayings:** see section 2. Key fixed wordings:
- "Put a name in the bowl."
- "Bear what is given…" (the Pale Order's Rule).
- "Blood given is not blood taken."
- "There is no loom…"
- "The doll asks once."
- "Somebody always sits up."
- "We come in owing."
- "THEY WERE NOT WEEPING FOR US."

**Hard word rules:**
- **Banned:** cooldown, dps, proc, aggro, loot, buff, nerf, stun, lightning, mana, chain lightning, rot, cell, virus, DNA, organism, biology. The Codex brief adds: chemical, bacteria, evolution, species, level, class, player.
- **No animals or animal words.** Allowed exceptions:
  - insects (10-07);
  - crows on the Moor (10-01);
  - "serpent," for the bog god only.
- Watch for these in old text: wolf, oxen, birds, eels, leeches, worms ("Vein-Worm"), beasts.
- **Substitutions:** copper not pennies; leagues not miles (the old text has "mile-long," "a mile under," "every mile or so"); no real weekdays or months ("fast-day," never Friday).
- **Fixed names:**
  - "the Bleeding Maiden," never "Weeping."
  - "Pale Order" is locked.
  - "Omens," not Sigil, for the Shrine Keeper; the Ossuarch keeps count sigils.
  - "Minor Arcana," not nodes.
- **Retired:** House / Brotherhood (for faiths); Polished Heart; Precious Wound; House of Eight Million; Wet Nurse; Laden Board; "the five" as a title; class heroes as people.
- **No food, table or kitchen framing.** Avoid "the congregation ate the walls," the Nurse "feeds," feasts, recipes.
- **No Tibetan, mask or gilded Buddha** for the Peak and the Order. No yin-yang.
- **Miasma = breath gone wrong.**
- **Never state the hidden truths:** the Bone grows; the builders; the count; the weights; the saints alive.
- **Codex brief:** never use "it is not X, it is Y" or "not X, but Y."
- **Name register (LB):** old names are guttural and apostrophed (-oth, -uul, -aath, -ith, -qhan). "Common names are what frightened people call a thing." Taboo names are written as a gap.

---

## 6. Gaps and contradictions

**Missing or open:**
- **The ages:** three ages against four, and the four have no chosen names.
- **Flesh's herald name** is unconfirmed ("Weeping Gash?"). **Soul has no herald.**
- **The faiths' words** are proposed, not confirmed.
- **The old hero stories:** keep the events and drop the people? Undecided.
- **The serpent god** has no myth: who worshipped it, what the pit fed, or how it died.
- **No in-world Gilded Peak Codex chapter** after its fall, beyond the glass.
- **No creation myth for:**
  - the Root Deep, beyond fragments;
  - the Sky-Climbers;
  - the Dreth'ael;
  - the Herald-cults;
  - the Last Vigil;
  - the Count-breakers.
- **No eschaton for:** the Lintel-Folk (beyond "joints do not finish"); the Marrow-Eaters; the First Brood; the Herald-cults; the Vigil.
- **Undated:** Villa Llaga's hatching (after 1091); the Fall of Coldhearth; Greywell.
- **The Gilded Peak's location** (the god's knee; music puts it in Act IV) is not fixed in lore.

**Rival tellings to keep:**
- The god's death (1.5).
- What the Silence is.
- **The sanctum door inscription:**
  - "THEY WERE NOT WEEPING FOR US" (class page, knight-scribe, M03);
  - "UNDER THE GOLD / THEY WERE STILL LOOKING" (ST carving).
- **The Ninth Stair inscription:** "WERE HERE" against "STOOD BESIDE HER."
- **Who opened the sanctum doors:**
  - Sō saw nobody go up;
  - a monk handed the Stranger a lantern and went up;
  - the beggar "walked out of the empty niche."
- **The empty niche:** "always empty, kept," against footprints going out.
- **Who gave the Maiden her face:** the bloodletter's face, the carver's apprentice's gouge, "whatever face you bring," or the Second Mouth's claim.
- **The Maiden on the giant's back:** face up or face down.
- **The Nave's ruin:** the House's century of breath, or the Order's bent bones.
- **Which daughter let go** at the Widow's Stumps.
- **Husks:** drinkers from the red places, or the tithed hollow.
- **The Peak's miasma:** the chant held it off, or the Silence was near.
- **Stars:** bones, souls or spirits.
- **Where the dead go** (1.8).
- **The funerals:** two or three.
- **Saint versus herd stories** on the Heath.
- **Gutters:** red or brown ink.

**Probable errors to fix rather than keep:**
- **Old wiki and Codex text still uses retired names:** Wet Nurse in W02; Precious Wound, Polished Heart and House in CV, ST and the class pages.
- **CV still has "Friday" and "miles,"** which codex.json fixed.
- **Wolf-Den Chapel** (fixed 2026-10-08: the Gnawed Chapel everywhere).
- **M05 and the bestiary disagree on names:** "Wick-Saints" and "Vein-Borers" in M05, "Moth-Saint" and "Vein-Worm" in the bestiary.
- **VO lines give breath to the Crone** ("This wind is the Crone's last breath"; "Ring it, and the Crone finishes breathing out"). That contradicts "breath belongs to the Myriad."
- **Old VO and Q text has animal words, "rotted," crusaders and mantras.**
- **Lore Bible: "Lore is not progression."** M05 hooks "the way… opens behind" the Matron; remove such boss and act hooks.

---

## 7. How lore is written

Moved to `README.md` ("How these are written"). In short: found texts, one-line provenance, plain running prose,
little jargon, rival tellings, mystery kept, world-building only.

## 8. Added in the 2026-10-08 rewrite (Derek may veto any of it)

**The start moves to the Red Shore** (Derek, 2026-10-08):
- the land ends in black sand at the edge of the Red Water, an ocean of blood going on forever, which nobody in the
  world knows is a sea;
- the area runs inland through a real coast's bands to the old growth;
- the culture is a fusion of Thai and Northwest Coast forms, in a Dark Souls mood;
- the lore is world-building only, with no story or quests.

**The shore folk** (`08-the-shore-folk.md`): the people of the first village, in the giant trees above the sand. Their
beliefs:
- **The Fallen One:** the land is the body of the Fallen One, which came down from higher than the sky, and the forest
  grows out of its back as young trees grow from a nurse log. (Their name for the dead god; whether it is the
  Reliquary's god, nobody in the world can say.)
- **The Red Water** is its blood, run out of a wound in its side:
  - the tide is its heartbeat, because it has not finished dying;
  - the black sand is its edge, burned black by the blood and ground fine;
  - it has no other side: of seven canoes sent to find one, one came back, and "the farther they went, the warmer it
    grew".
- **Whatever goes into the Red comes back.** Once they gave their dead to it in canoes. The dead came back up the
  sand, so now they burn every dead body on the night it dies, and give the Red nothing.
- **The stair:** their ancestors fed the Long One (the bog's serpent god) blood at the pit of black stone. A keeper
  refused to give her daughter and led the people up into the trees. She carved him on the temple stair's rails so
  he would believe he was still kept, and set the rule that the stair is swept every morning. Unfed, he starved and
  broke; the bog is what is left. "He is not as dead as the bog folk think."
- **Spirit houses:** every great tree's spirit gets a house on a carved post, so it does not come down into a child.
  The Myriad's purifier: a small god kept in a house cannot leave when the breath goes out.
- **The teacher's dance:** every fighter dances their teacher's motions before a fight, to drum and pipe, so the dead
  teacher knows them and comes for them before the Red can.
- **Their end, two tellings:** the tide stops, the Red runs back into the wound, and either the Fallen One gets up
  (the forest slides off its back; everything the Red kept stands on the dry sand) or it has simply finished dying
  (the dead lie down for good, the fire goes out, quiet).
- **The siege**, seven winters long: the dead of other places came up out of the Red, then the things that come up.
  The wall fell; eleven died on the temple platform; the last keeper's account is cut inside the temple door.

**The village now:**
- the fire still burns the dead, and nobody is seen to feed it;
- a candle burns in the temple that no one living could have lit, before a square of knee-polished black stone
  whose underside is never described;
- one spirit house has fresh flowers;
- the merchant has no lantern, knows the names of the dead, and answers "Tomorrow".

**What the faiths call the Red Water** (a mapmaker's margin note, `areas/the-red-shore.md`):
- the Maiden's processions: the Open Side, the first wound;
- the Pale Order: the Unfinished;
- the Veiled Crone's circles: a mirror nobody can cover, which is why the dead come back;
- the Shrine Keepers: where the spent breath goes;
- the lowland grandmothers: the god's blood, trying to get back in.

**The Ash Shore (a proposal):** its grey sea "that does not move like water" is the same blood, under a skin of ash.

**The bog** (`areas/sunken-bog.md`):
- the guides hold that the Long Back is a road their people laid;
- "stand still and it lets go" (the mud listens for fear);
- the cold fire on the hump is a lost breath going round a narrow place, a widow's, still waiting.
