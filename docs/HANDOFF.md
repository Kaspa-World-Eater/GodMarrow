# Godmarrow: the hand-off

*For any Claude session that picks up the game. Rewritten 2026-10-09; keep it current (replace, don't append a log).
If anything here disagrees with Derek, Derek wins. Older hand-offs are in `docs/archive/`.*

## 1. What this is

Godmarrow is Derek's grimdark isometric action RPG: Diablo II's structure (acts, a camp, waypoints, scarce loot, open
fights), Path of Exile's depth (the body board), Dark Souls' feel (poise, stagger, readable tells, oblique lore). The
world is the hide of a dead god, a desolate wasteland with almost nobody left, walked with a soul-bound lantern.

- **The game** is the Godot 4.7.2 project at the root of this repository (`C:\Users\derek\GodMarrow` on Derek's PC),
  pushed to GitHub `main` only when Derek asks; his laptop updates from it at launch.
- **PixelForge** (`tools/pixelforge/`) is Derek's character tool, with its own documents and at times its own session.
- **This session's job:** the game's art, maps, code and lore. One piece at a time, to Derek's grade.

## 2. Read first

1. `CLAUDE.md` (the short version of this).
2. This page.
3. `docs/README.md`: the map of every document and tool.
4. **For art:** `docs/MASTER_RULES.md` (its gate first) and the pages it lists, above all the area's lore
   (`docs/wiki/mythology/areas/`).
5. **For anything that moves:** `docs/animation/`.
6. **For code:** `docs/wiki/13-godot.md`, `08-tech-and-build.md`, and `tools/README.md` for the art tools.
7. **For lore:** `docs/wiki/mythology/README.md`, then the bible it indexes.
8. **For rulings:** `docs/wiki/01-rules-and-decisions.md`; the newest dated ruling wins.

## 3. How Derek works

- **He decides; you propose.** Say the plan first for anything big, and wait for his go. When he says "leave it to
  you", use your judgment and report what you did. Ask only when the answer changes what you do.
- **Plain, prompt reports.** What changed, what he can try, what still fails. A line of where you are when work runs
  long.
- **Art is graded one piece at a time,** on the area's review page, A to D, with notes. Read the notes from the page's
  database before the next pass. His bar is an A; grade yourself honestly.
- **Lore is graded on the Myths and Lands page** (notes per section in its `notes` collection). He reads it section by
  section and leaves notes as he goes; expect them, read them with ArtifactData, act on every one, republish.
- **Standing orders:**
  - **The rules check every 15 minutes:** a session reminder (`CronCreate`, recurring, the RULES CHECK prompt). Each
    check improves the piece in work, not only records it. If you are waiting on Derek and three reminders pass with no
    reply, delete it and say so; recreate it when he next writes.
  - **The workbench** (https://claude.ai/artifact/XCo2vaBbJ5vxFgpMAW8dC1) is updated at true milestones.
  - **Test captures use the Ossuarch** (`--cls=ossumancer`).
- **Rejected, don't repeat:** fog and mist layers; a game too dark to play; lag; one-to-one ports of the old browser
  code; automatic or AI-made characters and 3D (Hunyuan, TRELLIS, Modly); calm, barren floors; mock-ups shown as
  results; primitive stand-ins (tubes for limbs, spheres for bodies); jargon-heavy lore.
- **Lore laws** (memory `godmarrow-lore-naming`, the decision log): no "the [verb]-ers" or "the [past participle]"
  names; wordplay, Lovecraftian names and each people's own telling instead; no hard numbers of time; "the Pale", never
  "white"; nobody knows where the people came from; a desolate world; never "the dead stand up"; "god" used sparingly.

## 4. The state of the game (2026-10-09)

**Playable:** the title, the Reading (character creation, the Stranger's tarot), and four callings that walk: the
Ossuarch (Derek's first; to be rebuilt from the ground up), the Hollow Mystic, the Shrine Keeper (Miasma, Discordia,
Concordia), the Empty Hand. The Red Penitent is data only.

**The world** (`data/zones/index.json`, 26 zones):
- **The Red Shore's cove** (`red_shore`, seed 9201): the first area built on the 3D road and baked into the game. Four
  screens of black sand between headlands, the Red Water on a dying heartbeat, the jam of giant bones, the dead. Baked
  on the 2 x 2 grid, 60 fps.
- **The opening cave** (`opening_cave`, seed 9301): baking now (`tools/landkit3d/cave_bake.py`, then `cave_export.py`).
  The pilgrim rises in the pool of blood, climbs the stairs of bleeding faces, and finds the Stranger on the top step by
  the onyx mirror; speaking to him opens the Reading; the mirror leads out onto the cove. New characters start there
  only on trial (`--cave`, `GM_START=cave`, or a file `user://start_in_cave`) until Derek signs the cave off.
- **The camp** (`moor`) is a bare clearing standing in until the act is rebuilt.
- **The Sunken Bog** (`sunken_bog`, seed 9101) is the first land made our own way (maze, walkability proof, baked).
- The other Act I zones are older generated maps, to be rebuilt on the 3D road zone by zone.

## 5. The work in progress

**The first area, the Red Shore** (`docs/wiki/mythology/areas/the-red-shore.md`), in this order:
1. **The opening cave into the game:** finish the bake, export the zone, test it (start in the pool, the Stranger, the
   mirror out), capture it, put it on the review page.
2. **The shared corpse asset:** one properly built body (shaped limbs, joints, hands, feet, weight, bloat and rot as
   states) for the cave and the beach both, replacing the tube-limbed stand-ins (`opening_cave.md`, last checks).
3. **The cove's open items:** the drowned's legs, the shrine and cairns at game scale, the Red's true heartbeat loop in
   the game in place of the shader's heave.
4. **Then the rest of the area** (MASTER_RULES section 8): the giant trees and the wind-bent fringe; the shore folk's
   dead village (hide huts, the palisade, the fire pit of the dead, the merchant's corner); the bluffs as the first
   seeded zone (the map policy), with the blood rivers and estuaries.

**Review pages:**
- the Red Shore (cave and cove, current state only): https://claude.ai/artifact/UiDv3XxS7TmkW5v3ahzTDn
- the Myths and Lands (the bible, the areas, the in-game texts, with Derek's notes): https://claude.ai/artifact/FJszffP2zc6C48vyDHH9ja
- the Sunken Bog: https://claude.ai/artifact/Bp6bCHbLWiWt3MMnqfLznY
- the temple trial: https://claude.ai/artifact/T28WGqopEAxcLm6v68hBer

**Then:** a full play run of Act I; the new music; the wisp-fire's live flame; the Ossuarch's rebuild (metal, then his
animation by `docs/animation/`); the effects repaint; melee; the old zones rebuilt on the 3D road, the bog's serpent
way first.

## 6. How the art is made now (the short version)

- **The 3D road** (`tools/landkit3d/`, index in its `README.md`): every form is real geometry in Blender, rendered to data
  passes and painted to the painted standard by a painter per area. Nothing painted flat (MASTER_RULES section 0):
  ground with depth at three scales (0.5b), every rounded thing turned with the five tones of form (0.5c).
- **The 2 x 2 grid:** baked lands are painted at two texels an engine pixel (painted standard 7).
- **Light composes every frame** (`docs/CINEMATOGRAPHY.md`); `tools/landkit3d/cine_check.py` measures each render.
- **Into the game:** a bake renders the scene in aligned tiles and cuts them into chunks the game draws
  (`world/baked_ground.gd`); an exporter writes the zone file, proves it walkable, and places the start, portals,
  lights and folk.
- **Motion** (`docs/animation/`): timing sheets with a hold per frame, the head leads, moving holds, follow-through by
  weight; `tools/anim/contact_sheet.py` measures clips.
- **Every piece:** a written rules check, a brief from the area's lore with one true detail, ten graded passes logged in
  `tools/landkit/passes/<piece>.md`, a study chapter and a report in `tools/art_study/`.

## 7. Where things are

- **Documents:** `docs/README.md`.
- **Tools:** `tools/README.md`; the 3D road's modules in `tools/landkit3d/README.md`.
- **Code:** `docs/wiki/13-godot.md`.
- **Security and the PC** (`docs/wiki/08-tech-and-build.md`): never print or commit a token; never read `_secrets`;
  never type passwords; ask before downloads or deletions, and send deletions to the Recycle Bin; never touch Derek's
  Midjourney settings; commit only your own files, by name, ending with the attribution line; never commit anything
  from Cursemark; run Python with `tools/pixelforge/.venv/Scripts/python`.

## 8. Open questions for Derek

- His grade of the opening cave's pass 11, and the sign-off that makes the cave the real start.
- The Red Shore's names (the village, the merchant), and how the area joins the rest of Act I.
- The in-game Codex (`data/codex.json`) still tells retired lore (the congregation, salt, dates): rewrite it to the
  bible, voice by voice?
- The Flesh herald's name (the game still shows the retired "Wet Nurse").
