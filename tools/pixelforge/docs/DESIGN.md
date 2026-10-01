# PixelForge design notes

PixelForge turns paintings into game-ready pixel art: characters in 8 directions, props, effects, tiles, UI, sounds
and music, with files a Godot game loads. It runs unattended on a laptop without a GPU and needs no paid tools.

## The pipeline

```
character sheet (front / side / back [/ three-quarter] [+ plan sheet: top / underside])
   -> split     (cut each view out, clean the edge, fill white specks, check)
   -> palette   (lock the colours once, in OKLab)
   -> model     (carve a visual hull from the views; parts: hat cones, painted cards; paint by projection; check)
   -> rig       (built-in humanoid skeleton + motion library; Mixamo FBX optional)
   -> render    (Blender, orthographic, 30 degrees above, 8 directions, every clip; check)
   -> pixelate  (shared palette, fixed scale: stable pixel frames)
   -> export    (sprite sheet + Godot SpriteFrames / scene, or the game atlas with foot anchors)
```

`pixelforge/api.py` holds one function per step. The Studio (`gui.py`), the command line (`cli.py`) and the MCP
server (`mcp_server.py`) are thin layers over it.

## Decisions and the reasons

- **Pixelate last.** The model carries the smooth painting; pixels are made on the final rendered frame so they sit
  on the screen grid and never shimmer between frames.
- **Carve from the painting; do not generate geometry with AI.** Free image-to-3D models need a large GPU or give
  washed-out blobs on CPU. A visual hull carved from the views, painted by projection, keeps the painting's own
  detail and runs anywhere. A user-supplied GLB/FBX is still accepted.
- **Carve rules.** A thin run in one view only pairs with a thin run in the other (no plates across the body); loose
  islands are culled; thin parts the front view shows come back as painted cards; a wide thin band at the top is a
  hat brim and becomes a real cone; a cell is solid at 35% coverage so lacy hems keep their cloth; the carve is
  form-fitted (depth 0.8 of the side silhouette, superellipse cross-sections) because a side view shows a cloak's
  widest sweep, not the body.
- **Plan views.** A top view (and an underside) carves the footprint and paints upward faces, which the game camera
  sees in every direction. Without one, a top is synthesized from the front view and hat cones are revolved from the
  brim's colours.
- **Trees are cards.** A crown carved solid loses the lace of the leaves; the crown becomes crossed painted cards
  over a solid trunk, the way game trees are built.
- **Humanoid first, where it helps.** When the silhouette shows legs, the bundled mannequin is posed to the sheet and
  shrink-wrapped onto the carve for clean limbs; robes fall back to the carve.
- **Every view paints.** Front, side, back, three-quarter, top and underside each paint the faces that turn toward
  them; the blend is by surface normal.
- **Checks at each step.** Cutouts, carve and frames are checked automatically for the failure modes seen in
  practice (white pockets, floating pieces, dropped dark paint, plates, height jumps) and the verdict is shown.
- **Colours in OKLab; transforms never add colours.** Dark teal, green and blue collapse under RGB distance.
- **One pixels-per-unit scale per project** so every character is the right size relative to the others.
- **Mixamo is optional.** The pipeline must run unattended; the built-in rig and motion library are the default.
- **Rendered props, painted objects.** Props and buildings are real geometry (painted sheets carved like heroes, or
  CC0 kits) filmed with the same camera and lantern rig as the heroes; flat clip art is not used.
- **Looks are a layer, not new generators.** A finishing look (phosphorus, haze, ethereal, glow, cyberpunk, psychedelic,
  echo, smooth, embers, smoke, shimmer, outline, pulse, grain, flicker, dissolve, ice, rot; `fxlook.py`) takes frames
  and gives frames, so one implementation serves procedural effects, missiles and orbits, spell layers and spells,
  painted effects and sprite clips. Looks stack in order; everything time-based is periodic over the frame count so
  loops close; the output is locked in OKLab to the effect's palette plus the look's own colours, and the json lists
  the palette actually used. The game's theme keeps the neon and hue-cycling looks for magic.
- **Music is generated, not sampled.** Twenty-one seeded cues from synthesised instruments, an editable knob sheet,
  seamless loops at one loudness.

## Conventions

- Directions `S SW W NW N NE E SE` are where the character faces on screen; clips are `<action>_<dir>`.
- Bone names follow Mixamo (`mixamorig:Hips` ...) so Mixamo FBX and the built-in rig are interchangeable.
- Scripts in `pixelforge/blender/` run inside Blender: no Pillow, numpy is fine, print `PF_OK` on success.
- Tests: `pytest`. `pip install bpy` adds the Blender-script tests. Render tests set `PF_FAKE_RENDER=1`.
- Headless rendering on a server: `apt-get install libegl1 libgl1 libgles2 xvfb`, `pip install bpy`, run Blender
  scripts under `xvfb-run`.
