# Tiles and ground: a rack too

The Tiles tab of the workbench (Forge app and classic Studio), backed by `tiles.py` (`make_seamless`,
`make_tiles(texture, name, out, tw, th, count, seed, wobble, second, ...)`, `tileset_tres`) and `tiles3d.py`
(`make_tiles3d(material, second, name, out, tiles, seed, tile_m, ...)`, Blender-rendered ground patches).

- **Source**: drop a Midjourney ground painting (the art order's seamless textures) or pick one of the game's
  materials; a "blend with" second slot for transitions (grass into mud, flags into moss).
- **Dials and knobs**: tile size (the game's iso diamond, locked to the style preset), variants (count, with a
  dice for a new seed), edge wobble, seam blend (make_seamless strength), blend edge width and bits (which sides
  take the second material), brightness/contrast/saturation grade (the style's grade), palette lock on/off, dither.
- **Live preview**: a small iso patch (4x4 diamonds) laid with the variants so repetition shows, at 1x and 3x,
  with a "walk over it" button that opens the game's preview on a zone using that ground.
- **Bottom bar**: Play (cycle variants), Randomise, Keep (writes art/tiles/<name>.png + .json + .tres, the game
  picks it up), Reset, Start over, Undo/Redo.
- Props and trees get the same rack on the Objects tab (sway on/off and strength, outline, shadow, scale, seed).
- Every knob is a flag of `pixelforge tiles` / `pixelforge tiles3d` / `pixelforge object`, so the AI path matches.
