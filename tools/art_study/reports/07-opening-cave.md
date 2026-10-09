# 07 The opening cave, and how the stone was remade

**The piece:** the cave under the black cliffs where the game begins: the pool of blood, the stairs and the hall.
- **Code:** `tools/landkit3d/` (`cave3d.py`; `cliff3d.py` for the columns; `paint_cave.py` for the cave's painter;
  `cine_check.py` for the cinematography checks; `blend_scene.py` for the passes).
- **Pass log:** `tools/landkit/passes/opening_cave.md`.
- **Review page:** https://claude.ai/artifact/UiDv3XxS7TmkW5v3ahzTDn.
- **Status:** pass 10. Derek gave pass 5 a B and, after pass 9, said "Overall I like it."

Derek asked for this report: "Be sure to write about how you massively improved the stone look."

## Where the stone started (pass 4, Derek's D)

His words: "The cave looks too blocks not enough painted look, lacks fine details is too brightly lit. The floor and
walls aren't rough enough"; "The basalt is too uniform"; "There's no cinematography."

**What was really wrong:**
- **The geometry was uniform.** Every column was a hexagon of one size on a regular lattice, with flat faces and sharp
  corners. That is a tiling pattern, not rock.
- **The light was even.** The shared painter lit every surface by a sky that a cave doesn't have, then laid the lamps
  over the top. Every stone took nearly the same tone, so the rock read as blocks.
- **The texture was noise, not form.** Stipple and speckle sat on flat planes, and that read as "not painted".
- **No surface had a history:** no breakage, no wear, no water.

## What made the stone (each with its reason)

### 1. Form: columns as the real rock is built (chapter 12, section 5; Fingal's Cave, the Giant's Causeway)
- **Every girth** (`cliff3d.seeds`, `cells`). Column centres come from dart throwing, each with its own radius from a
  field of thick colonnade and thin, fast-cooled rock. A power diagram (a Voronoi weighted by girth) packs them tight,
  4 to 8 sided. This one change ended "too uniform".
- **Drums** (`cliff3d.rough_prism`). Each column is a stack of drums of uneven height with real gaps between them:
  - the drum tops domed or cupped (ball and socket);
  - every face split and bellied or hollowed;
  - the corners worn round by age and sometimes knocked off;
  - a flake broken out of some drums.

  Short drums read as stacked masonry, so the walls take long ones (1.2 to 3.2 yd).
- **The entablature.** Above four or five yards each wall column splits into thin, crooked columns leaning every way,
  rising out of the light.
- **Breakdown** (`cliff3d.chunk`): fallen drums lying among the stumps, broken blocks at the walls' feet, grit.
- **Dressed stone made raw:** the hall's flags, walls, pillars, steps and dais are subdivided and displaced, so their
  grit is real form the fire grazes.
- **The cut stone's age:**
  - flags tilted, cracked through or missing (the holes full of dust);
  - stair treads cupped where feet went;
  - nosings worn;
  - dust drifted against the risers.

### 2. Light: the cave's own painter (`paint_cave.py`)
- **The light is the lamps.** There is no sky. Every surface's tone comes from the light that truly reaches it,
  rendered through the real forms with their real shadows. Between the fires the stone falls a step above black.
  - The single biggest change: it turned "blocks" into rock, because each chip and spall now has a lit and a shaded
    side.
- **A logarithmic curve,** as the eye sees, so a carving's turn toward or away from a fire stays readable right
  beside the flame.
- **Light zones** (Derek: "more defined light zones"). The falloff is stepped into bands, each wider than the one
  inside it, with the form's own shading kept within each band.
  - The falloff is calibrated locally to the light that truly arrives.
  - Calibrated once for the whole frame, it saturated the form flat beside close fires.
- **Black is a note, not a fill** (rule 4). No darkening takes stone below its ramp's darkest swatch, except the
  contacts and the onyx mirror.
- **Quiet darks** (rule 7). No dither, tooth or stain where there is no light to show it. Texture lives in the light.

### 3. Paint: each stone its own, by cause
- **Each column its own value and lean of hue**, via a per-object id pass (`blend_scene` writes object ids). The
  cooling made each column its own.
- **Strokes.** Long dry-brush strokes run along each column's faces and across the tops, and show only in the light.
- **Stains by cause:**
  - rust running down from the joints;
  - pale mineral crusting the crevices where a fire finds it;
  - dark mineral tears weeping from every socket and crevice down the wall below (ancient, forlorn).
- **Wet near the blood:** darker, holding small sharp glints toward each fire.
- **The dressed stone:**
  - gritty: grit, pits and fresh pale bites;
  - worn smooth and a breath paler down the paths where countless feet have climbed (the scene records each path for
    the painter);
  - never reflective (Derek).
- **The carved faces:**
  - a paler, warmer stone than the walls, finished smooth by hand: the contrast to the rough walls Derek asked for;
  - no chisel lines and no hard outlines (his "weird orange squish line" was the painted lit lip);
  - a soft polish that takes a highlight of the fire.

### 4. The faces in the rock (Derek's reference)
- **Carved as his reference is** (`cave3d.serene_depth`):
  - a rounded head tapering to the jaw, rising out of the broken rock with no outline (its edge broken by noise and
    joined to the rock by a smooth maximum);
  - heavy closed lids with a dark crease;
  - a nose rising out of the brow;
  - full lips and a firm chin.
- **Despair:**
  - the inner brows raised and drawn together, with a knot and furrows between them;
  - the lids sagging at the outer corners;
  - the mouth's corners pulled down, the lips parted on a moan.
- **Lit from above,** as the reference is: each face's fire hangs above its head. Side light from mid-height flooded
  the faces flat.

## What failed, and why (do not repeat)

| Tried | Why it failed |
|---|---|
| Hexagons of one size on a lattice | A tiling, not rock: "too uniform" |
| The sky's light with the lamps laid over it | Every stone the same tone in the dark: "blocks", "too brightly lit" |
| Short drums on the walls | Read as stacked brick |
| Dither at every band edge, tooth everywhere | Stipple over whole walls, noise in the dark |
| Light bands with a wide dither seam | Brought the stipple back over walls |
| The lowest light band stepped to black | The colossal face vanished in its own fringe |
| A flat pale "near the fire" wash | Erased every face's shading beside a flame |
| Form taken as the light over its own blur | Flattened large shapes (a great face's sockets) |
| One falloff calibration for the whole frame | Saturated faces flat beside close fires |
| Faces as an egg with stylised features | Read as masks, then as "too hard to see" at the game's distance |
| A bunch of little faces covering the big one | Too small to read; Derek: one great face instead |
| A hard lit lip painted round every carving | "A weird orange squish line" |
| Python's `hash()` for seeds | Different every run: the columns changed between renders (now `zlib.crc32`) |
| Objects turned with `rotation_euler` | Swung round the world origin (shields flew 19 yd up); spheres now take `rot` |

## What carries to later pieces

- **`cliff3d.seeds` / `cells` / `rough_prism` / `chunk`** are the basalt for every cliff, stack, cave and ruin of the
  black rock. The black cliffs should be rebuilt on them.
- **`paint_cave.py`** is the painter for every dark interior lit only by its fires: catacombs, crypts, the bog's
  chambers.
  - Its light model: the lamps as the light, the log curve, locally calibrated zones, black as a note, quiet darks.
  - Its fire: a base and tongues, embers, shimmer.
- **`cine_check.py`** runs on every render. Its numbers go in the pass log.
- **The face model** (`serene_depth`) is the carving for every face in stone in the game.
- **The object-id and reflection passes** in `blend_scene` are available to every scene.
