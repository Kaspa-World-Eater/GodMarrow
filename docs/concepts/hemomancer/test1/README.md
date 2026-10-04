# Hemomancer test 1 (2026-10-04, derek-33 on Derek's PC, real Blender 4.5)

Source: Derek's Midjourney three-view sheet (`sheet_original.png`, 1200x960, front / side / back on off-white with a sand floor).
Result: `art/sprites/hemomancer_test1.*` (1,576 frames, 8 real views, 24 frames a clip; two sheets). Not wired into the game
(no `skins.json` entry); look test with `--skin=hemomancer_test1`. Previews: `hemomancer_test1_walk.gif`,
`hemomancer_test1_atk.gif` (all 8 directions, 2x), `idle_8dir.png`.

**Preparing the sheet (`prep_sheet.py`):** the Forge's split saw the whole sheet as one figure, because the sand floor and
cast shadows join the three figures and the paper is off-white. The script cuts the views at the empty gaps (x 445 / 800),
whitens the paper, and below the floor line (y 848) keeps only the columns under each figure's legs with sand and cool
blue-grey shadow removed (boots are warm brown, shadows cool). After the split, white pockets between the feet were made
transparent and loose floor scraps dropped (largest connected component kept). Then palette -> model -> rig -> render
(`per_clip` 24) -> pixelate -> `export_game`, the same calls as `pixelforge hero`.

**Verdict (derek-33):** motion is smooth, 8 directions read, colours match the painting, the crimson mantle reads well from
the back. But the crown of iron spikes is lost (too thin to survive the carve), the wooden plank skirt is mush, the dreadlocks
blur into the head, and he is one solid column: the arms are not separated from the body, so they cannot swing. The carved
hull has nothing to separate in a robed figure with arms against the sides. Next test: an A-pose sheet (arms clearly away
from the body, legs apart, nothing over the torso) on plain white with no floor; or the pixel-puppet road (lost with the
cloud session, `docs/HANDOFF.md` 7.3 `track/pixel2d`).
