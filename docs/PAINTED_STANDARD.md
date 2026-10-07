# The painted standard

**Derek, 2026-10-06:** "Make it the new standard and apply it to everything moving forward."

Everything made for Godmarrow from now on (effects, ground, water, props, environment, characters' living layers) is
painted the way the lake test was painted (`shaders/lake.gdshader`). It came from looking at Understory ("gouache and
ink on warm paper", art made by generators), and it beat the dithered-block look of the earlier effects.

## The rules

1. **Broad flat tones from a short ramp.** Four or five tones per material. Large shapes of one tone, not speckle.
2. **Dither lightly, and mostly at edges.** Full-strength per-pixel Bayer dither reads as gravel, not paint. Keep its
   amplitude small (about ±0.07 of the value) and let it work where one tone meets another.
3. **Pigment pools at the wet edge.** Where a wash ends (a lake's shore, a pool's rim, a cloud's edge), the colour
   darkens in a thin band just inside the edge, then a thin lit lip.
4. **Surfaces are laid in strokes.** Long dry-brush strokes: noise stretched along one axis (the wind, the flow, the
   form), drifting with it. Not round blobs, not cells.
5. **Highlights are a loaded brush dragged across.** Stretched strokes thresholded from the same stretched noise.
   Never square dabs on a grid (they read as a QR code).
6. **Paper tooth under everything.** A soft, broad grain fixed to the world (fed the node's world position), never
   to the screen, so it does not swim when the camera moves.
7. **Whole world pixels.** Still 4 px cells, still the art grid. The paint is in the pixel art, not instead of it.
8. **Still alive.** Everything moves a little: the wind in the strokes, lapping edges, breathing glows.

9. **Hue-shift every ramp.** Darks lean blue-violet, lights lean warm. A ramp that only gets lighter looks dead.
10. **Light tells the story.** A cool key (moonlight) plus a warm local light (fire, lantern), each casting shadows.
    The light's temperature tints the tone, in steps, as a painter mixes it.
11. **Iso light comes from the screen's upper left.** In world terms that is -x and a little +y: the faces toward
    the viewer's left are lit, the faces toward the right fall in shade. Get this wrong and every prop reads black.
12. **Form before texture.** Build props as real form (the title's height field, ray-cast), so tops, faces,
    occlusion and cast shadows are true. Texture (blocks, flutes, carving, streaks) goes on after and stays gentle.
13. **Contact.** Darken where things meet the ground (ambient occlusion), let grass and moss grow over the feet of
    things, and give silhouettes a lit rim against what is behind them.
14. **Detail where it counts.** Lit edges, chips, carving and moss on the props; the open ground stays quiet.

Lessons from the first ruins pass (Derek: "you can do better"): props on a black void with no shadow or contact,
one-hue ramps, and fine texture noise all read as cheap. `tools/art_study/painted_scene.py` is the reference now.

## The masterwork rule (Derek, 2026-10-06)

"Every piece must be crafted as a masterwork piece of art. Nothing skipped, no speeding through. Every detail
individually crafted." No mock-ups shown as results; no primitive stand-ins (cones for trees, tubes for limbs, blobs for
crowns); every element (each tree, window, stone, tuft) designed as its own thing; everything in this standard applied
every time, not only on the pieces that get a second pass.

## One at a time, ten passes (Derek, 2026-10-07)

"I don't want to see shit rushed: 1 at a time, painted and refined 10x." One piece is in work at a time. It gets at
least ten painting-and-refining passes before it is shown or placed in the game, and each pass is numbered, graded in
writing against the checklist below, and fixes the worst failure the last grade found. No other piece starts until
this one has had its ten. Placement and generation code may be finished alongside, but no new art is begun.

## The order of work

1. Finish the current agenda in this standard (environment: snow, grass, ruins, stone; cloth; pulsing flesh; armour
   plates with their own silhouettes; shadows; skill-tree effect types; wisps).
2. Then repaint everything already made in it: fire, ice, lightning, bone, acid, blood, miasma, souls, wisps,
   radiance, absence, slashes, threads, the title.
3. Melee: there will be many melee styles, each with its own look, and the special melee skills need theirs. These
   are done when the Ossuarch's skills are finalised. The Ossuarch is finished before any other class is touched.

## Reference

- `shaders/lake.gdshader`: the first piece in this standard (see its header comment).
- `--lakefx` (core/test_hooks.gd): the test scene.

## The checklist (Derek, 2026-10-06: "are you applying the techniques you've learned and documented?")
Every piece is checked against every line, in writing, before it is shown. A piece that fails a line is not shown.
1. **Brief:** written first, from the lore and from the real thing (anatomy, ecology, geology), every detail with its
   reason. Built from the cause, not the surface (a forest floor follows its canopy and its dead).
2. **Scale:** true size from the code's projection (a yard is 36x18; ~19-22 px per yard of height); the hero beside
   it for scale.
3. **Form:** a height field / 3D model, ray-cast, lit through normals. No flat sprites standing in for form.
4. **Light:** the cold key (moon) AND the warm local light (lantern, fire), each casting real shadows; temperature in
   steps; sunflecks / moonflecks where a canopy is.
5. **Values:** big shapes in clean tone groups first (3-5); texture subordinate (small amplitude) and following the
   form; contrast saved for form and focus; neighbours close in value.
6. **Ramps:** hue-shifted (darks violet-blue, lights warm), 6-8 tones per material.
7. **Paint:** broad tones, dry-brush strokes along the form, pigment pooled at wet edges, lit lips, a world-fixed
   paper tooth, dither only at tone boundaries.
8. **Contact:** AO where things meet, grass and litter over the feet of things, lit rims against what is behind.
9. **Detail where it counts:** drawn shapes (hand-made stamps / designed forms) on the lit side and the silhouette;
   the shade flat; open ground quiet.
10. **Life:** something moves in the one wind (Gust); light breathes; nothing pasted.
11. **Seen as the player sees it:** the game's camera, zoom and lighting; tiled and composed if it is a tile, with no
    visible repeat.
12. **Skeptic round:** compared side by side with the best pieces (the Seer's Bowl title, the ruins, the dune); the
    worst difference fixed first; repeat until none is obvious.
