# Spells and effects: a rack of knobs and dials, so you can really play

The Spells tab and the Effects tab of the workbench (Forge app and classic Studio) are instruments, not forms.
Backed by `spell.py` (`LAYER_DEFAULTS`, `PRESETS`, `new_spell`, `render_spell`, `export_spell`), `vfx.py`
(`make_vfx`, `MISSILES`, `ORBITS`, `PRESETS` palettes, `gen_*`), `fxlook.py` when it lands (looks and their
parameters), and `effect_art.py` (painted frames).

- **Shape dial**: missile · bolt · nova · ring · wall · burst · shards · pillar · orbit (armour) · aura · cloud ·
  vortex · ward · flash · decal · drip, turned like a selector; a "from my painting" slot (drop a Midjourney effect
  picture) for the painted road.
- **Knobs per layer** (the spell designer's layers become a strip of layer cards, each with knobs): size, speed,
  frames (length), fps, rotation, start delay, opacity, blend (normal/add), seed (with a dice), palette (the game's
  named palettes as swatches), glow, bands, scale, x/y offset.
- **Look dials** (fxlook): phosphorus, haze, ethereal, glow, cyberpunk, psychedelic, echo, smooth, embers, smoke,
  shimmer, outline, pulse, grain, flicker, dissolve, ice, rot: each an on/off pad with 2-4 knobs (strength, radius,
  count, drift...).
- **Missile dials**: length, shard count, twist, tip brightness, wake length, rotations (8/16), and for orbits the
  ring radius, chunk count and spin.
- **Live preview** in the middle, playing the loop at game size (1x) and 3x, with a "fly it" button that shoots it
  across the preview, and "in the game" that runs the game's preview (`--fx`, and `--fx_fly` when it lands).
- **Bottom bar**: Play / Stop, Randomise (new seed for everything), Keep (export into art/fx, same strip + json the
  add-on plays), Save as preset (named, appears on the shape dial), Reset layer, Reset all, Start over, Undo/Redo.
- Every knob is a field of the same spell json the CLI renders (`pixelforge spell render x.spell.json`), so an AI can
  set the same values headlessly; "Save ops" writes the json.
