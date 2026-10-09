# Godmarrow: the hand-off

*For any Claude session that picks up the game. Written 2026-10-08; keep it current (replace, don't append a log). If
anything here disagrees with Derek, Derek wins. The old hand-off (to 2026-10-05, mostly PixelForge's history) is
`docs/archive/HANDOFF_to_2026-10-05.md`.*

## 1. What this is

Godmarrow is Derek's grimdark isometric action RPG: Diablo II's structure (acts, a camp, waypoints, scarce loot, open
fights), Path of Exile's depth (the body board), Dark Souls' feel (poise, stagger, readable tells, oblique lore). The
world is the corpse of a dead god, walked with a soul-bound lantern.

- **The game is the Godot 4.7.2 project at the root of this repository,** on Derek's PC at `C:\Users\derek\GodMarrow`,
  pushed to the public GitHub repository's `main`. The browser build is retired; the Cursemark assets were dropped.
- **PixelForge** (`tools/pixelforge/`) is Derek's art tool for characters. It has its own documents and, at times,
  its own session.
- **This session's job:** the game: its art, its maps, its code, its lore. One piece at a time, to Derek's grade.

## 2. Read first

1. `CLAUDE.md` (the short version of this).
2. This page.
3. `docs/README.md`: the map of every document.
4. For art: `docs/MASTER_RULES.md` and the pages it lists, above all the area's lore
   (`docs/wiki/mythology/areas/`).
5. For code: `docs/wiki/13-godot.md` and `08-tech-and-build.md`.
6. For lore and design: `docs/wiki/01-rules-and-decisions.md`, then the mythology.

## 3. How Derek works

- **He decides; you propose.** Say the plan first for anything big, and wait for his go ("do it", "go for it").
  Questions are fine when the answer changes what you do; otherwise pick the sensible default and say so.
- **Plain, prompt reports.** What changed, what he can try, what still fails. No long silences: a line of where you
  are when work runs long.
- **Art is graded, one piece at a time.** Every area has its own review page where he grades each piece A to D and
  leaves notes (read them with ArtifactData before the next pass). His bar is an A. He grades honestly and
  expects honest grades back.
- **He plays on his laptop.** It updates from GitHub `main` at launch, so push when a change is ready for him to
  play. On this PC the desktop folder `Godmarrow Game` has **Play Godmarrow** and **Start in the Sunken Bog**.
- **Standing orders:**
  - **The rules check every 15 minutes:** a session reminder (`CronCreate`, recurring at `4,19,34,49 * * * *`, with
    the RULES CHECK prompt). If you are waiting on Derek and three reminders pass with no reply, delete it and say so,
    then recreate it when he next writes. Each check improves the piece, not only records it.
  - **The workbench** (https://claude.ai/artifact/XCo2vaBbJ5vxFgpMAW8dC1) is updated at true milestones.
  - **Test captures use the Ossuarch.**
- **Things he has rejected, so don't repeat them:**
  - fog and mist over the screen or the water;
  - a dark game you can't see in;
  - lag;
  - one-to-one ports of the old browser code ("has been a disaster");
  - automatic or AI-drawn characters;
  - calm, barren floors;
  - mock-ups shown as results;
  - jargon-heavy lore in odd forms.
- **His rulings are in `docs/wiki/01-rules-and-decisions.md`** (the decision log) and in Claude's memory for this
  project. When he rules, log it there.

## 4. The state of the game (2026-10-08)

**Playable, start to finish of what exists.**
- The title, the Reading (character creation), four callings that walk:
  - the Hollow Mystic;
  - the Shrine Keeper;
  - the Empty Hand;
  - the Ossuarch (Derek's first; captures use him).
- The Red Penitent is data only.

**The world:**
- **Act I is 25 zones** (`data/zones/index.json`): most are the old browser-generated maps at 20 seeds each.
- **The camp** (`moor`) is a bare clearing (`tools/worldgen/camp_export.py`): the camp's people, the stash, the
  lantern, the waystone, and the five roads out. Derek wiped the old Ashen Moor ("fucking trash"); it stands in until
  the first area is built.
- **The Sunken Bog** (`sunken_bog`, seed 9101) is the first land made our own way, end to end:
  - generated as a maze;
  - proved walkable (100 seeds out of 100);
  - baked whole through the bog's art engine;
  - lit by the lantern through its normal maps, the plants in the wind;
  - 60 frames a second.
- **The Hollow Wood** has a seeded zone (`hollow_wood_s9001`, with `--zseed=9001`) built from the baked 50-piece set.
  It is not in the zone list yet; the floor is still bare.

**Difficulty** (2026-10-08, "unplayably dark ... I can't get anywhere without immediately dying"):
- the night's dark floor lifted to 0.52;
- monster blows ×0.6;
- the night at most +15%;
- one champion pack in three;
- one named unique a zone;
- no creature more than two levels above the pilgrim.

**Performance:** far creatures sleep (Diablo II's rule); the old moor's lag came mostly from its 580 creatures all
thinking.

**Removed:**
- the old music (the new score is to be made);
- the Cursemark assets;
- the old moor's maps;
- the old bog's maps.

## 5. The work in progress

**The first area, the Red Shore** (Derek's brief, 2026-10-08, in memory `godmarrow-first-area-vision` and
`docs/wiki/mythology/areas/the-red-shore.md`):
- the start is on black sand at the edge of the Red Water, a sea of blood nobody there knows is a sea; much of the
  area is the sand and the coast, then it works inland by real ecology to old-growth rainforest, always overcast;
- the shore folk's village: round hide huts inside a palisade broken after seven winters' siege by the dead and the
  things that came up out of the Red, and a great fire pit still burning the dead;
- a temple hall with a serpent stair, and spirit houses on carved posts;
- a fusion of Thai and Northwest Coast forms (Derek overturned "all Thai" the same day), in a true Dark Souls mood;
- safe, with one mad merchant mocking the pilgrim's ignorance as he picks the village clean;
- world-building only: "we're not writing story or quests or anything. We're just building the world."

**The method is decided:** the 3D road (Derek: "absolutely fucking crushed with the 3d ... this is the way"). The temple
trial is on its review page (https://claude.ai/artifact/T28WGqopEAxcLm6v68hBer), at pass 6, my grade B-.

**Next, in order** (`docs/MASTER_RULES.md` section 8):
1. **The study chapters:** the Olympic coast, and Northwest Coast forms (forms only: no animal crests, nothing taken
   from a real nation's crests, stories or ceremonies).
2. **The temple to an A.** First the painter's weaknesses:
   - broad shapes;
   - wet edges;
   - strokes;
   - sheen;
   - stucco loss as geometry.

   Then the fusion details, the guardian and the candle.
3. The Red Water and the black sand.
4. The drift logs and sea stacks.
5. The giant trees and the wind-bent fringe.
6. The hide hut kit, the palisade, the fire pit of the dead, the merchant's corner.
7. The land laid out from a seed, from the water inland, baked into the game.

**Then:**
- a full play run of Act I's main path;
- the new music;
- the wisp-fire's live flame in the game;
- the Ossuarch's metal;
- the effects repaint;
- melee.

**The lore was rewritten (2026-10-08)** at Derek's word.
- **`docs/wiki/mythology/` 01 to 11:** each people and faith as found texts (scrolls, tomb and stair inscriptions,
  stories passed down), with a creation, myths and an end. They are written in plain running prose with little jargon.
- **The Red Water's myth** is the shore folk's own (08).
- **`areas/`:** one page per Act I zone, with local texts and a builder's brief.
- **`backstage.md`:** all of the canon in one place, not lore.
- **The old pages** are in `docs/archive/mythology_2026-10-05/`.

The rule is world-building only: no story, no quests.

## 6. Where things are

- **The documents:** `docs/README.md` is the map.
- **The code:** `docs/wiki/13-godot.md`.
- **The art tools:**
  - `tools/landkit3d/`: the 3D road;
  - `tools/art_study/`: the height engine, the scenes, the library, chapters, reports, ecosystems;
  - `tools/landkit/`: object generators, the set baker, the pass logs in `passes/`;
  - `tools/worldgen/`: our own map generators and the land bake.
- **The review pages:**
  - the Sunken Bog: https://claude.ai/artifact/Bp6bCHbLWiWt3MMnqfLznY
  - the temple trial: https://claude.ai/artifact/T28WGqopEAxcLm6v68hBer
- **Security and the PC** (`docs/wiki/08-tech-and-build.md`, sections 6 and 7):
  - never print or commit a token;
  - never read `_secrets`;
  - never type passwords;
  - ask before downloads or deletions, and send deletions to the Recycle Bin;
  - never touch Derek's Midjourney settings;
  - commit only your own files, ending with the attribution line.

## 7. Open questions for Derek

- What does "playable" mean for the next milestone: a fun start-to-boss run of Act I, all five acts, or a demo for
  others?
- **The Red Shore:**
  - its names (the area, the village, the merchant, the sea);
  - how many zones it is, and how it joins the rest;
  - which town services the village has with only the merchant;
  - whether the camp's people (Esk, Ysolde, Brannoc, Maren) return later in the act.
- **The Flesh herald's name:** the game still shows the retired "Wet Nurse".
- **Names in Acts II to V that break the word laws** (`docs/wiki/09-backlog-and-open-questions.md`).
- Which of the frictions in the old Act I plan (`docs/archive/ACT1_PLAN.md` section 6) he wants, if any.
