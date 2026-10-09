# The painted standard: how every pixel gets its colour

**Derek, 2026-10-06:** "Make it the new standard and apply it to everything moving forward."

Everything made for Godmarrow is painted the way the lake test was painted (`shaders/lake.gdshader`). The lake came from
looking at *Understory* ("gouache and ink on warm paper", art made by generators). It beat the dithered-block look of
the earlier effects, because full-strength per-pixel dither reads as gravel, not paint.

This page is the painting manual: each rule, why it exists, and how each road puts it into practice. The rules list is
`docs/MASTER_RULES.md` section 3; the checklist every pass is graded against is section 4 there. *Rewritten 2026-10-08
with what the bog, the pit and the 3D temple taught.*

## The rules, and how they are painted

**1. Broad flat tones from a short ramp.**
- Large shapes of one tone, not speckle.
- Tones by size (decided 2026-10-07): big forms 6 to 8 tones, small things (a 10 px stone, a leaf) 3 to 4, plus
  near-black.
- In code a ramp is a short list of hand-picked colours (`kit.ramp`). A value is mapped to its step, never blended
  between steps (`paint3d.tone`, `wood_scene._r`).

**2. Dither lightly, and only at edges.**
- The 4×4 ordered dither (`kit.B4`) works only where one tone meets the next (the middle of a step's band), with a
  small amplitude. Everywhere else the tone is flat.

**3. Pigment pools at the wet edge.**
- Where a wash ends (a lake's shore, a pool's rim, blood's edge), the colour darkens in a thin band just inside the edge,
  then a thin lit lip.
- The bog's water does it with a dark lip at the bank; the blood pools and the pit's blood do it in their own shaders
  and painters.

**4. Surfaces are laid in strokes.**
- Long dry-brush strokes: noise stretched along one axis (the wind, the flow, the form), drifting with it. Not round
  blobs, not cells.
- The bog's sky streaks on the water and the bone's tea-stain run along the walk are strokes.

**5. Highlights are a loaded brush dragged across.**
- Stretched strokes thresholded from the same stretched noise, never square dabs on a grid (they read as a QR code).
- **Hold glints back:** on the pit's obsidian, glints everywhere read as gravel. Rare and larger, only where a face turns
  fully to the light, they read as glass.

**6. A paper tooth under everything, fixed to the world.**
- A soft grain fed by world position, never screen position, so it does not swim when the camera moves.
- `paint3d` takes it from the world position pass, the height engine from the hit point, shaders from the node's world
  position.

**7. Whole world pixels.**
- The art grid is 4 screen pixels; the paint is in the pixel art, not instead of it.
- Bakes render at the engine's scale (18 × 9 px a yard), and the game draws them at 4× with nearest filtering.

**8. Still alive.**
- Everything moves a little in the one wind (`core/gust.gd`, `Game.wind`, the shader global `world_wind`): grass,
  reeds, flames, the water's swell. Glows breathe.
- A baked land's plants bend in the game (`shaders/baked_ground.gdshader`); a still's living layers loop seamlessly
  (each term moves on a circle or a whole number of cycles).

**9. Hue-shift every ramp.**
- Darks lean violet-blue, lights lean warm. A ramp that only gets lighter looks dead.

**10. Light tells the story.**
- A cool key (the moon, or the overcast sky) and a warm local light (the lantern, a fire, a candle), each casting real
  shadows. The light's temperature tints the tone in steps, as a painter mixes it.
- One dramatic light from a hidden source, where the story is, makes a landmark (the pit's red throat).

**11. The light comes from the screen's upper left** (world −x, a little +y).
- Faces toward the viewer's left are lit, faces toward the right fall in shade. Get this wrong and every prop reads
  black.

**12. Form before texture.**
- The form is real (FORM IS LAW). The paint gives it its material; the light comes from its normals. Texture (blocks,
  flutes, carving, streaks) goes on after and stays gentle.

**13. Contact.**
- Darken where things meet (ambient occlusion: from the height engine's height minus its blur, or from the 3D road's
  occlusion pass).
- Let grass, moss and litter grow over the feet of things. Give silhouettes a lit rim against what is behind.

**14. Detail where it counts.**
- Lit edges, chips, carving and moss on the props; the shade kept flat. The ground is alive (dense, many-toned litter at
  leaf scale) but never noisy at the scale of the big shapes.

## How each road paints

**The 3D road** (`tools/landkit3d/paint3d.py`) paints from Blender's data passes:
- **The light:**
  - the overcast sky, stronger on what faces up and darker in the sheltered (occlusion);
  - a soft key from the upper left;
  - a breath of the moon's true shadow.
- **Each material** by its causes:
  - stucco lost where the damp rises and the eaves drip;
  - algae on the low shade side;
  - streaks under every lip;
  - gold only in the recesses;
  - moss where the surface faces up and holds the wet;
  - every roof tile its own;
  - the forest floor a moss carpet with every leaf placed by world position.
- **The lips:** lit where the form turns toward the light, dark where it turns away (from the normals).
- **Still to reach the standard** (Derek, 2026-10-08: "the painting and details have a long ways to go"):
  - broad tone shapes instead of noise;
  - wet edges;
  - dry-brush strokes along the form;
  - rain's sheen by material;
  - stucco loss as real chipped geometry rather than paint.

**The height engine** (`tools/art_study/wood_scene.py` and the scenes on it):
- **Shade** gives the moon, the lantern, the sky fill and occlusion.
- **Paint** gives each material by its own painter (bark, bone, stone, peat, water).
- **The living layers** come last.
- The bog's water is a true mirror: reflected rays marched through the world, then the Famine study's strength, ripple
  wobble, sky streaks and dark lip.

**Shaders in the game:**
- the lake, blood pools, meadow, snowfield and the skill effects;
- the baked land's water slides its rows in a slow swell and glints a texel at a time;
- the lantern rakes the baked ground and the landkit pieces through their normal maps.

## What failed (and stays failed)

- **Props on a black void** with no shadow or contact, one-hue ramps, fine texture noise: cheap.
- **Camouflage blotches:** large flat noise islands of a second material (moss, algae, stucco loss, litter). Wear is
  small, ragged and placed by its cause.
- **Calm, flat floors** ("35% too barren").
- **Glints everywhere:** gravel.
- **Fog and mist layers:** filters.
- **Form put into colour:** flat.
- **Pillowed stones and blurred normals:** cartoony.

## The masterwork rule and the ten passes

- **The masterwork rule** (Derek, 2026-10-06): "Every piece must be crafted as a masterwork piece of art. Nothing
  skipped, no speeding through. Every detail individually crafted."
- **The ten passes** (Derek, 2026-10-07): "I don't want to see shit rushed: 1 at a time, painted and refined 10x."

How they are kept is `docs/MASTER_RULES.md` section 2.
