# The old-growth judge scene (tools/art_study/wood_scene.py), reworked

Derek (2026-10-07): "continue with the plan: rework and improve old scenes" (docs/REWORK_AND_SEEDS_PLAN.md, stage 1).

**Rules check, before the rework:**
- **Read:**
  - the library (methods 01, 03, 05, 08; objects trees-and-bark, stumps-and-deadwood, ground-generators;
    environments old-growth-wood);
  - chapter 6 (old-growth trunks);
  - the old-growth ecosystem chapter (every age at once, small trees mostly dead, gaps, dead wood half the forest,
    the floor in layers);
  - MASTER_RULES 0 (form; normals never blurred), 2b.6 (no fixed tiles), 5 (the forest felt from under it).
- **The old scene's failures, worst first:**
  1. the trunks are thin straight tubes;
  2. the floor is the retired tiles, busy with leaf confetti;
  3. the fallen giant lies straight toward the camera, so it reads as a standing pillar;
  4. ten young living trees crowd the frame against three giants;
  5. the normals are blurred.

**Passes:**
1. **The engine's own trees warped and channelled** (`AUTO_WARP`): every trunk gets the bark channels and its own
   taper, swell, wander and twist (`vein_tree.Warp`, tags 100+); round normals dropped for warped trunks (they take
   their real shape's); `NORMAL_BLUR` 0 (the engine default). **Graded D+:** the snag at front right fluted and
   broken, but the frame is still thin poles and a pillar.
2. **The judge's own plan** (`judge_plan`, run only as the judge): the young away from the gap's light stand dead
   (thin broken poles); the fallen giant turned a quarter. **Graded C-:** no pillar, but the root plate is now seen
   edge-on, a post.
3. The giant turned an eighth instead, so its length and its plate's face both read. **Graded C:** it lies across the
   left with its limb stubs; its plate stands at the back, a fan of torn roots.
4. **The floor:** `landkit/litter_ground.py` replaces the retired tiles (`LITTER_GEN`): litter, humus, moss and bare
   soil from world position and the ecology's litter map, quiet (broad patches, near hues); the fallen-leaf scatter
   halved. **Graded C+:** the ground rests the eye; every object reads against it.

**Still to do:**
- **The broadleaf trunks:** at r 0.35, the middle-aged ones still read as poles. They need their bark plates and
  channels at a size the eye can find.
- **The canopy shadows:** a check.
- **Weather in the world:** as an option, from the Vigil's rain and fog.
- The **loop**, checked.

## Rules check, 2026-10-08: the floor brought back to life (commit 75df7b4)

Derek: "you lost the life, the ground is 35% too barren". `litter_ground.py` was rebuilt and checked against the originals, side by side.

| # | Line | Status |
|---|---|---|
| 3 | Form | Pass: every leaf and twig is a raised plate in the world height, lit through its own normal. |
| 5 | Values | Drifts against humus patches a yard or two across. The species lean by patch, so there are no camouflage blotches. |
| 6 | Ramps | Five leaf ramps of seven tones each. The bright kinds are pulled toward dun at night. |
| 7 | Paint | First try was confetti (2-3 px leaves at random). Leaves are now about 5 px, each a small step of its own. |
| 8 | Contact | Worn ground (the yard, the ways) stays near bare. Leaves drift against things. |
| 12 | Skeptic round | Against the "before" frames: at least as alive, with more depth. |

**Worst remaining failure: the Jaw's ash.** It is colour with its own shading baked in (`ground.ash` self-shades), which breaks the form law, and it is bare. The fix belongs to the moor in the Act I ground set (`passes/act1_ground.md`), which is awaiting Derek's three decisions. **Also waiting:** his go on the spine path (`passes/spine_path.md`).
