# The Lore Rewrite: guide for the session that takes it over

Owner: Derek. This is a world-building project, not a game-design one. The previous session (PixelForge) drafted the
first expansion of the Codex, then Derek rewrote the cosmology under it. Everything below is what he decided, what is
saved, and what has to be done, in order. Read it whole before touching anything.

## 1. What Derek decided (his words, condensed; these outrank every older document)

1. **The Reliquary is a corpse and no one knows whose.** Not "the greatest god". Ultimately unknowable. Every people
   says something different about it and none is confirmed. The world is still called the Reliquary.
2. **The rule the world runs on:** the world is fed on dreams and beliefs. A god is a belief that grew a body. Each
   god cultivates its domain through fear and domination; the more that worship it or fear it, the more powerful it
   grows. A forgotten god starves. (Marrow is belief congealed in bone; the Silence, Ur-Nihl, is the Forgetting.)
3. **Not everything is a god.** Behemoths, great beasts, lords, the risen dead, demons, things from outside. Some are
   mindless. "A citadel that walks: legend, because it is a mindless colossus, dragging itself through some ancient
   far-away wasteland."
4. **The world is huge and ancient. Do not tie everything together.** Far-away places, peoples and powers that have
   nothing to do with the Hide, the five classes or each other. Loose ends are the point.
5. **The five classes' orders are cults, not "the five houses".** They are five among many. Most of the lore is not
   about them.
6. **This is lore, not progression.** No "boss hooks", no act placement, no zone assignments in the lore documents.
   (The game will take from the lore later; the lore does not serve the game's structure.)
7. **The previous age is Dark Souls in feel:** ancient dragon gods; giant zombie colossus gods feasting on the lands;
   towers filled by a single giant ooze full of eyes and dissolving juices; a cavern of bones with a giant skeleton
   whose arm is a bone scythe; demons; iron golem citadels; an underwater blood clam/sponge/snail god; soul eaters;
   our own vampire; a dracolich, last of its kind, almost a zombie, ruling a great destroyed citadel, starving and
   forgotten; other ancient and unspeakable horrors; lords; dead cities. Some of these still exist.
8. **The necromancy core comes back:** zombies, liches, the fantasy spine. The dead rise because a corpse carries the
   belief it died with and a domain raises its dead. A lich is a mortal who learned to feed on fear and became a
   small god that cannot die.
9. **Our age is the Age of the Last Breath:** so much of what was is gone and lost; the rage against the dying of the
   light; an age of ignorance and fear; all that is left of the heights the prior ages reached.
10. **Ages need better names** than the ones on the page (he did not like "the Unremembered / the Age of Lords / the
    Long Forgetting"). Propose several; he picks.
11. **Lovecraftian names and feel** for the gods, half-gods and horrors, in the register of the game's own true names
    (Yh'Anuul, Oss-Vharoth, Nol-Shogthuth, Ur-Nihl). The bestiary chapter's creature names were approved as they are.
12. **Forms:** every document in its own form and hand (doctrine, chronicle, ledger, inscription with gaps and gloss,
    trial record, letter, field notes, catechism, inventory, confession, treaty, a thing's own account). **No poems,
    no songs, no verse. No commoner daily life** (no feasts, recipes, games, customs). Not conversational; the
    gatherer's one-line "by" note is the only frame.
13. **A total lore rewrite**, including the existing gatherer's book (the ten base chapters), the wiki's cosmology
    page, and later the in-game lines. "Make the world more alive."

## 2. Where everything is

- Branch **`track/codex`** (pushed). Work here; merge to main only when the book is whole and built clean.
- `docs/codex/BIBLE.md`: the first expansion's bible. **Partly superseded** by §1 above and by the page below; keep
  its rules for forms, BBCode and banned words; replace its cosmology.
- The world page Derek was shown (the new world as imagined, with the old powers, the dead, the dead cities and the
  name table): `https://claude.ai/artifact/HzgvhkQv63mo9YPmrSXfvn`. Its source is not in the repo; re-read it with
  the Artifact tool. It still says "five houses" in places and carries game hooks; both are wrong per §1.
- `docs/codex/base_codex.json`: the existing gatherer's book (10 chapters, 77 pages), frozen copy. To be rewritten.
- `docs/codex/chapters/*.json`: nine chapter files. State:
  - `bestiary.json`: **finished and approved** (10 creatures, builds clean). Keep.
  - `edgeless.json`: six documents complete, revised to the Lovecraftian register; two over length, marked [DRAFT].
    Cosmology is the old one (Held Space / Unsaying); revise to the new rule.
  - `held.json`: five complete first drafts, all [DRAFT], old cosmology.
  - `chronicle.json`: six complete drafts, all over length, [DRAFT]; dates follow the old bible.
  - `tablets.json`: seven complete drafts, [DRAFT], old brief.
  - `ends.json`: eight complete drafts, [DRAFT].
  - `halfgods.json`: two drafted, six not; needs the new names and the Visitors.
  - `heroes.json`: one drafted, six stubs.
  - `peoples.json`: one drafted, six not.
- `tools/codex_build.py`: assembles `data/codex.json` from the base book plus the chapters in `CHAPTER_ORDER`;
  flags banned words and lengths. Add new chapter ids to `CHAPTER_ORDER`. Run it from the repo root.
- `ui/codex.gd` renders the book; page format `{"title","by","epi","bb"}`; BBCode conventions in the bible.
- Hard canon still in force where §1 does not override it: `docs/wiki/02-world-and-lore.md` (to be rewritten by
  you), the Words section of `docs/wiki/01-rules-and-decisions.md` (banned words: rot, cell, virus, DNA, organism,
  biology, cooldown, dps, proc, aggro, loot, buff, nerf, stun, lightning, mana; "Bleeding Maiden" never "Weeping").
- Scratch generator scripts the drafting agents left (optional, same-machine only):
  `/tmp/claude-0/-home-user-Curriculum-Vitae-/5f52fd48-ca1b-59dc-9164-78637a49f298/scratchpad/build_*.py`.

## 3. Known conflicts to settle in the new bible

- **The count.** The base book dates the gatherer to Breath 1,114 and the Peak's fall to about 1,098; the first
  bible said 3,311 and 1,400. Pick one count that leaves room for a long age of forgetting, write it once, and let
  other peoples count differently and say so.
- **"Nothing was born, everything was shed"** (old wiki) becomes one cult's doctrine, not the truth.
- **"No animals"** stays for creatures of the corpse; dragons, behemoths and great beasts are not animals and not of
  the corpse.
- **The gatherer's prologue** must explain how documents from far-away places and dead ages came into one collection
  without tying them together.

## 4. The order of work

1. **New bible** (`docs/codex/BIBLE.md`, rewritten whole): the rule; the Reliquary as unknowable; the ages with
   proposed names (offer three sets, Derek picks); the old powers and horrors (the list in §1.7 plus more of your
   own, far apart from one another, many unrelated to the Hide); the dead and the crafts of the dead; the cults as
   five among many; the dead cities; the Visitors; the register for names; the forms; the banned words. Show Derek
   the bible as an artifact before writing chapters. Expect him to strike names.
2. **Wiki cosmology page** (`docs/wiki/02-world-and-lore.md` §1 and §9 at least) rewritten to the bible, clean, no
   history of how it got there.
3. **Chapter plan**: keep the nine chapter ids; add at least: `powers` (the old gods and horrors, each a document in
   a form its worshippers or victims would have made), `dead` (the risen, liches, wraiths, revenants, the crafts), and
   `cities` (the dead cities, each by someone who lived there or found it), and `far` (places and peoples with no
   connection to the Hide at all). Fifteen to twenty chapters, sixty to a hundred documents.
4. **Relaunch the writers**, one agent per chapter, in parallel, each given: this guide, the new bible, the wiki page,
   the chapter's saved drafts (to revise, not to start over, where they exist), and the bestiary as the example of
   the standard. Forms unique, lengths 500 to 1,400 words, no verse, no commoner life, Lovecraftian register, loose
   ends allowed. Then a reviewer agent reads every chapter for sameness of voice, contradictions with the bible,
   banned words, and verse that slipped in; writers fix.
5. **Rewrite the gatherer's book** (the ten base chapters) to the new world, in document forms, not one fireside
   voice; keep the chapter ids so nothing in the game breaks. Write to a new `docs/codex/base/*.json` and change the
   builder to read it instead of `base_codex.json`.
6. **Build, check, merge**: `python3 tools/codex_build.py` clean; open the book in the game headless or by reading
   `ui/codex.gd`'s expectations; commit on `track/codex` with the attribution lines; merge to main; push.
7. **Later, with Derek:** in-game lines, zone intros, item lore and the Reading, rewritten to the new world.

## 5. Rules for the session

- Nothing is canon until Derek adopts it; keep a short "proposed / adopted / struck" list at the top of the bible.
- Never write game progression into lore documents.
- Every commit ends with the attribution footer used in this repo's recent commits. No model names in content.
- Do not touch `tools/pixelforge`; that is the other session's project.
