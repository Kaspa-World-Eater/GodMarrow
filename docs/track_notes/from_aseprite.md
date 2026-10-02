# What the Forge takes from Aseprite

Aseprite is the reference pixel editor. Take its ideas into the Forge's editors and its format for interchange.

Ideas (the frame animation editor and the skin editor):
- The timeline: frames along the top, layers down the side, a cel at each crossing; play, loop, frame rate per
  frame (hold a frame), tags that name a clip over a frame range (idle 1-12, walk 13-36), with a direction (forward,
  reverse, ping-pong). Our clips and directions become tags.
- Onion skin: previous and next frames ghosted in two tints, configurable count.
- Pixel-perfect pencil (no doubled corners on a line), a shading ink (click shifts a pixel to the next colour up or
  down its palette ramp instead of painting a flat colour), a contour tool, bucket with tolerance, symmetry (mirror
  x/y) for front and back views, a reference layer (the original painting, dimmed, under the pixels).
- The palette panel: the sprite's locked palette as swatches, drag to reorder into ramps, edit a colour and every
  pixel using it changes (indexed colour), ramps shown as ramps.
- Tilemap mode: paint with tiles from a tileset onto a grid; for our ground tiles, with the iso diamond grid.
- Slices: named rectangles in a sheet (for UI nine-slices and icons).
- Preview window at game size, and a zoom that snaps to whole numbers.
- Everything is a command with a shortcut; a script API (Aseprite uses Lua) drives the same commands headlessly: our
  replayable ops json is exactly this, keep it complete.

Format (interchange):
- Export sprite sheets with Aseprite's JSON metadata (frames with duration, frameTags, slices, layers), which many
  engines and people already read; and import that JSON (and the `.aseprite` file format, documented and simple:
  chunked, zlib cels) so a sprite touched up in Aseprite or LibreSprite (its free fork) comes back into the Forge
  with its frames, tags and palette intact. `pixelforge export --aseprite` / `pixelforge import x.aseprite`.
- This also means a person who wants more than the Forge's editor can use Aseprite on the frames and keep the
  pipeline; nothing is a dead end.
