# Blood and fluids

The god is still bleeding underneath. Sap is dark blood everywhere in the world: the woodcutter's eleventh trunk "ran
red down the blade and warm over my wrists", and the hunter speaks of "sour red sap". The ritual glade's puddles are
dark blood; its candles' wax is the trees' red sap ("Sap or blood? Nobody knows"); under the Gate the eye blinks pus
into a pool of pus and blood, and blood seeps from the vein where it broke the floor. Combat blood (splashes, pools
under the dead) shares the same effect. This page covers `blood.py` and `shaders/blood_pool.gdshader`, the blood pools
in `fen_ground.py` and `shaders/lake.gdshader`, sap, wax tears and pus.

## The real thing
- **Old blood is dark red-black and thin,** glossy where fresh, crusted brown where old; it dries darker and browner
  from the edge, and the edge cracks.
- **Chapter 3:** blood pigment soaks into dentin and stains it pink-violet; dried vessels are black-brown threads;
  pustules are a creamy yellow-white centre (`#F0E0A0`) under a thin glossy cap with a red halo, at every stage (fresh,
  ruptured, crusted honey-brown `#A87830`); necrotic slough yellow-cream where wet.
- **The lake test** (`shaders/lake.gdshader`), for blood: clots drifting, a skin that wrinkles slowly, a duller,
  heavier gloss, the pigment pooled dark at the wet edge, light broken into dabs.
- **A pool under a body is hidden by it:** it must run out past the body to read (effects library lesson).

## How it is made
**The game's blood effect, one thing everywhere** (`tools/landkit/blood.py` = `shaders/blood_pool.gdshader`; see
[effects and weather](../methods/06-effects-and-weather.md)):
- `edge(px, py, seed, reach=0.6)`: a lobed edge `0.75 + 0.35 fbm(2.2)` plus fingers that run further,
  `clip((fbm(6) - 0.45) * 2)^2 * 0.6`;
- `shade(depth, px, py, sx, sy, T, dry, light_side, light)`: value `depth * 0.7 + churn * 0.35` (a slow fbm churn),
  snapped through the 4x4 ordered dither to a short ramp `C0..C3` (near-black clot `(0.09, 0.01, 0.02)`, dark red,
  the body, a lit red `(0.6, 0.08, 0.08)`); drying pulls it darker and toward `DRIED`; a wet rim (`WET`) on the edge
  toward the lantern; a few glints on wet depth; a dried edge cracks; lit only by what lights it
  (`0.35 + light * 0.75`). No red light: blood never glows.
- The shader version runs it from where a body fell (`spread`, `dry`, `fade`, `light_dir`, `tint` for bile and ichor).

**Blood pools of the glade** (`tools/landkit/fen_ground.py:paint`, the pools levelled at their own rims by `height`):
- the blood effect at half depth (`depth * 0.5`), light capped at 0.38 ("dark blood");
- the pigment pooled at the wet edge (`depth < 0.12` to `C0`), then a lit lip, the shore's lip stained;
- clots drifting (`fbm(4) > 0.68` over depth above 0.25), a skin wrinkling slowly (a warped sine band at 0.8);
- the moon as broken dull heavy dabs, never a smooth sheen; rain rings on it (see [water](water.md)).

**The wax pour into the blood** (`vigil.wax_pour`): red wax runs over the sill and down the bark in curtains, into
the pool at the tree's foot where it sets in skins and lumps; see [fire, candles, wax](fire-candles-wax.md).

**Sap as blood:** `bark.SAP` (`#120406` to `#6e1c1e`) and `SAP_OLD`; every limb scar weeps 1 to 3 runs (more on a
weeping eye), glossy red-black and beaded on the moon side where fresh, crusting brown and thinning lower; the eye
tree's sap from each lower lid (`vigil.eye_sap`); cankers bleeding black-red. The stump's blood is traced downhill
over the real height field from each bore and pools only on the ground (`vein_stump.paint_blood`, light capped at 0.55,
soaked in by `alpha = B * 1.8`).

**Blood along the vein** (Gate pass 91): the game's blood effect seeping out of the broken floor beside the vein in
lobes and fingers and down the cracks, wet at its heart and toward the lantern, drying brown and cracked at its edges.

**Pus** (the Gate's eye): pus crusting the lids' margins and beading glossy along the lower lid; four runs travelling
over the socket's real surface to the pool, a wet trail behind each swelling drop, a dull old trail ahead; the pool
mostly blood with the pus in thin dull sour streaks, finely marbled; its hollow levelled; its edge soaked into the flesh
with a patchy crust and a meniscus catching light on the far edge; rings where the drops land.

**Pustules** (gore tendrils): tense domes, a creamy yellow centre under a glossy cap with a wet glint and a red halo,
each breathing slowly and giving a small sickly yellow light (`gore_pillar.SICKC`); see [tendrils and
vessels](tendrils-and-vessels.md).

## Variants and parameters
| Use | Where | Key settings |
|---|---|---|
| Combat pools | `shaders/blood_pool.gdshader` | `spread`, `dry`, `fade`, `light_dir`, `tint` |
| Scene blood | `blood.shade`, `blood.edge` | `depth`, `dry`, `light_side`, `light` |
| Blood pools (fen) | `fen_ground.paint` | light cap 0.38, depth x0.5, clots, skin, dabs |
| Blood lake / painted pool | `lake.gdshader` `kind = 1` | `wind`, `ripples[8]`, blood moves at 0.35 the speed |
| Sap | `bark.SAP`, `SAP_OLD` | runs per scar, `dying` |
| Stump blood | `vein_stump.paint_blood` | light cap 0.55 |

## What worked
- **One blood effect in one place:** the shader and `blood.py` agree, so blood looks the same in a scene and in combat.
- **Held dark:** light capped (0.38 on pools, 0.55 on the stump), depth halved; dark blood with clots and dull dabs.
- **Fluids that travel over real surfaces** (each point lifted to the ground's height), pooling only where level.
- **Soaking in at the edges** (alpha by depth) instead of a block sitting on top.
- **The dithered red ramp** along the vein: "the game's own blood".
- **Derek's A+ on the gore** (the flesh, the vein, the eye's pus and pool, the fangs' blood) after Gate pass 61.

## What failed, and why (traps)
- **Ketchup:** bright red blobs and smears (fang pass 41, stump pass 1, the glade's pools pass 1 near the lantern).
  Real old blood is dark red-black and thin; cap the light.
- **Blood stuck on a face** in blobs instead of running off it (stump pass 1).
- **The pool as a round blob, then a dithered block** (stump passes 2 to 10).
- **The pus pool as a gold bowl, a gold bell, a gold sign, a rug, gold leaf** (Gate passes 12 to 38): too yellow, too
  deep a hollow, lying on the socket's slope, marbling in broad bands with a hard outline. A liquid surface is level;
  pus is dull and sour, in thin streaks; the edge soaks in.
- **Pus drips as straight lines through the air:** scratches.
- **The gate's red glow and any red light:** broken rule (MASTER_RULES 6); the red caps only smoulder, the pustules are
  yellow.
- **The wisp-fire over the blood** (seven cold flames): Derek, "I don't think it's necessary". Removed; kept in
  `wisp_fire.py`.

## Derek's rulings and grades (verbatim)
- 2026-10-06: "your liquid fire looks good but fire comes in many forms ... blood can borrow from it too."
- 2026-10-07: "sap in the world will look like dark blood" (MASTER_RULES 5: "Sap is dark blood, everywhere").
- 2026-10-07: "Your water could definitely use a lot of work ... I want the puddles here to be blood ... I like the depth,
  but instead of the black water, let's make it dark blood with the occasional wisp of white fire flaring up."
- 2026-10-07: "Dither the blood within the blood effect along the veins"; "remember you have blood effects made already
  too".
- 2026-10-07: **"A+ on the gore."**
- 2026-10-07: "the eye should be 3 dimensional and slowly blink a pus filled blink then drips into the pool".
- 2026-10-07: "many dripping red wax candles, wax pour out and into the blood".

## Where it is used
- [The ritual glade](../environments/the-vigil.md): the blood pools, the stump's blood, the eye tree's sap, the wax
  pour into the blood at the altar tree's foot.
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): the pus and blood pool, blood along the
  vein, the fangs' dried blood, pustules.
- [Old-growth wood](../environments/old-growth-wood.md) and [ruins and stone](../environments/ruins-and-stone.md): weeping
  scars and cankers on every dying tree.
- The game: `shaders/blood_pool.gdshader` under the dead.

## Status
- **Blood pools (glade):** 3 passes, **C+**. **Wax pour into blood:** 3 passes, **C+**. **The gore (Gate):** **A+**.
- **To build (MASTER_RULES 8.4):** blood lakes (the pool method at the size of a lake, slow churn, bodies half sunk);
  splashes, arcs, drips and drag smears; black glass where blood ran into ash; repaint the blood effect to the
  painted standard (8.3).
- **Duplicates to merge:** `fang.BLOOD_FRESH/OLD`, `bark.SAP/SAP_OLD`, the stump's `STAIN`/`WETLIP` colours and the
  tendrils' `R_TENDRIL` are separate blood colours; they should draw from `blood.py`'s ramp.
