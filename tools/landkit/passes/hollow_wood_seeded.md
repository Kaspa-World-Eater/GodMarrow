# The Hollow Wood from a seed (stages 2 and 3 of docs/REWORK_AND_SEEDS_PLAN.md)

The baker (`tools/landkit/bake.py`), the set (`art/landkit/hollow_wood/`, 50 pieces), the generator
(`tools/worldgen/forest.py`) and the game hook (`world/landkit.gd` `take_named`). Commit 00d846a; workbench v42.

## Rules check, 2026-10-08 (the 15-minute reminder; the work in progress)

**Read for this:**
- MASTER_RULES, in full.
- The Hollow Wood's lore:
  - `02-world-and-lore.md`: "the god's veins stood up as pale trees; luminous fungi in three colours; every tenth trunk holds something the god was carrying".
  - `05-legends-of-the-first-lands.md`: "Count the trunks as you walk, because every tenth one has grown round something".
  - `11-codex-voices.md`, the hunter's paths:
    - "Dig anywhere and you will find them all lying the same way, like hair combed by a hand";
    - the Vein-Worms "rise under soft ground and never under a road";
    - "Keep your feet on the flat stone".
  - The woodcutter: "I took the eleventh ... it ran red down the blade".
- The library:
  - `environments/old-growth-wood.md`;
  - objects: `trees-and-bark.md`, `plants-and-litter.md`, `fungi-and-lights.md`, `stumps-and-deadwood.md`.

**The one true detail still missing: the tenth trunk.** Every tenth trunk on a line grows round a carried thing, and the generator does not know this yet. It is a placement rule, so it belongs in the code: count trunks along each way, and make every tenth a carried-thing trunk. The pieces themselves (bell, skull, candle, ribs with a badge, lantern) are new art and wait for the gate.

**The checklist, line by line, for the set as the game shows it:**

| # | Line | Status |
|---|---|---|
| 1 | Brief | Pieces come from the Vigil's graded vein-tree. The tenth trunk is not yet placed (above). |
| 2 | Scale | Pass. 18/9/21 px per yd, the same as the game's; checked beside the Ossuarch in game. |
| 3 | Form | Pass. Trunks, flares, roots, splintered tops and stones are geometry lit through normals. The healthy bark's flat peel and canker blots were removed. **The dying trees still carry flat peel: the worst remaining form failure.** |
| 4 | Light | Moon in the bake, lantern through the normal map in game. No canopy flecks on the floor in game yet. |
| 5 | Values | Pass after the haze fix: bark near 51/255, against the old set's 48. |
| 6 | Ramps | Pass. `R_BARK`, eight hue-shifted tones. |
| 7 | Paint | Dither only at edges once the haze was gone. The bark's horizontal hatch still reads a little busy at game zoom. |
| 8 | Contact | Root flares meet the ground. No litter over the feet in game, because the floor is the browser's. |
| 9 | Detail where it counts | Splintered tops, eyes on the dying. |
| 10 | Life | **Fail: the trunks have no sway.** That is right for giants, which don't move. Floor life is absent. |
| 11 | Seen as the player sees it | Pass, in game by day, at four spots plus the start. |
| 12 | Skeptic round | Against the browser: more open, truer, no repeat. **The bare floor is the worst difference.** |

**Section 5:**
- Spacing: pass (worst clump 3, mean 4.65 yd).
- Corridors and clearings: pass.
- No visible repeats: pass.
- Collision at every base: posts from the bake.
- Objects in combat: material, cover and hp on every piece.

**Worst failure first:** the bare floor (lines 8, 10 and 12). It needs new pieces, so the gate applies: the brief below goes to Derek, and no art is begun until he says go. Code may run alongside (2.6), so I'll add the tenth-trunk rule and the cap-ring placement to the generator using the pieces that exist.

## Brief for the floor life (for Derek's go)

Everything here comes from the Wood's own lore. There is no green on the floor (the library's ruling for the grim wood).
1. **The combed root-threads:** pale threads in the soil, all lying one way toward the ring, "like hair combed by a hand". This is relief in the ground generator: height, not paint. It shows where the litter is thin and on the ways' edges.
2. **The three lights** as baked clusters: white on sound ground, blue over hollow ground (round the hollowed trunks), red at the Vein-Worms' soft ground. The Vigil's `wood_lights` are already graded.
3. **Vein-Worm ground:** rings of soft red bubbles in soft ground, never on a way. These are hazard patches that breathe, a floor piece with its own living layer.
4. **The carried things:** a trunk grown round a bell (lip only), a skull (wood in at the eyes), a candle (bark drawn back from the flame), ribs with a pilgrim's badge, a lantern (flame turned to the road). Each is a vein-tree variant with its own ten passes. They're placed by the tenth-trunk rule.
5. **Fallen veins:** the lore says the trees are never cut and heal by morning, so a fallen vein doesn't rot like wood. It withers to a husk: a collapsed pale skin over fibre, sinking into the litter, in stages of drying, not decay classes. They're rare, and they give cover.
6. **The floor itself:** the litter generator as a Godot ground shader painted from world position, so no two yards are alike (2b.6).

## Rules check, 2026-10-08 (second reminder)

MASTER_RULES is unchanged since the last full read. The work in progress is waiting at the gate for Derek's go on the floor-life brief. No art has been begun. The code that may run alongside (the tenth trunk) is done and committed (a06c292). Worst failure, still the bare floor; it needs his go.
