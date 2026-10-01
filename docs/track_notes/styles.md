# Look presets: what the Studio should show (track/styles)

Backed by `tools/pixelforge/pixelforge/styles.py` (the preset table), `style_demo.py` (the animated examples),
`api.list_styles / api.set_style / api.style_of`, CLI `pixelforge styles [--demo OUT]` and `pixelforge project set
--style NAME [--character C]`, MCP `list_styles / set_style / style_demo`. Tests in `tests/test_styles.py`. The GIFs
and the contact sheet are committed under `tools/pixelforge/assets/styles/` (the Studio reads them from there) and
`docs/screens/styles/`.

## The Style page

A page in the left nav, between Home and the character pages, titled **Style**. One sentence at the top: *"A style
fixes everything that decides how a painting becomes game art. Pick one; every step reads its numbers from it."*

- **Cards, one per look preset**, in the order `api.list_styles()["looks"]` gives (godmarrow first): Godmarrow, Gothic
  hi-res, Rendered ARPG, SNES 16-bit, Handheld 32-bit, Modern indie pixel, Painterly hi-bit. Each card:
  - the preset's GIF from `tools/pixelforge/assets/styles/<name>.gif`, playing (the Keeper animated in that look with a
    wisp loop beside her; frame delays are in the file; a Tk `PhotoImage` per frame driven by `after`, or the
    existing preview-GIF player);
  - the title, the one-line summary (`style["summary"]`, e.g. `56 px · 16 colours · outline · 3 bands · 10 f @ 10 fps`)
    and the description;
  - a **Use this style** button -> `api.set_style(project, name)`; the card of the project's current style is marked
    (teal border, "current"). With a character selected in the nav, a second small button **Only for <character>** ->
    `api.set_style(project, name, character)`; a character with its own style shows "follows the project" / "own
    style: X" and a link **Follow the project again** -> `api.set_style(project, "project", character)`.
  - after setting, the status line says what to run again: *"Run palette, pixelate and export again for the new look"*
    (the `next` field of the result). Nothing is re-run automatically.
- **Advanced fold** under the cards (closed by default): every number of the current style, editable, grouped as the
  dataclass is: Figure (figure height, pixel step), Colour (colours, palette lock, dither, dither strength, shading
  bands, saturation, contrast, lightness), Edges (outline none / auto / hex, diagonal, edge soft / crisp / hard),
  Effects (bands, glow auto / on / off, haze, frames, fps), Animation (loop frames, loop fps, clip frames), World
  (tile width, tile height, tile hr). Editing a number makes a custom style named `<preset>_custom` stored in
  `project.json` as a dict (`project.custom_styles[name] = fields`) and selected like a preset; `styles.validate()`
  gives the error text to show inline (no pop-ups). *Not built on this track:* custom styles in `project.json` need a
  small addition to `Project` and `get_style` (look the name up in the project before the table); the headless model
  for it is `Style(**fields)` + `validate()`.
- **Make the examples again** (small link): runs `style_demo.make_demo(assets/styles)` in the worker thread when the
  bundled GIFs are missing or a custom style exists (then the custom one gets a card too, using the project's own
  front cutout as the source: `make_demo(out, source=views/front.png, only=[name])`).
- The old **Settings -> Quality style** combo box becomes a link to this page; `set --style` on the CLI keeps working.
- The contact sheet `styles_sheet.png` is the picture for the Help page and the README.

## Where the numbers go (so the UI can explain them)

| preset field | step that reads it |
|---|---|
| figure_height | pixelate (stills and renders: the standing height), the game export meta |
| pixel_step | the game export meta (`pixel_step`), preview zoom |
| colors, palette_lock, dither, dither_strength | palette step, pixelate |
| shading_bands, saturation, contrast, lightness, edge, outline | pixelate (the grade runs in OKLab before the palette is drawn) |
| fx_bands, fx_glow, fx_haze, fx_frames, fx_fps | `vfx --style`, `make_effect(style=)`, the effects editor's defaults |
| anim_frames, anim_fps | the still path (`animate_still`, `animate --style`) |
| clip_frames | render `--per-clip` default and the game export's per-clip cap |
| tile_width, tile_height, tile_hr | `tiles --style`, `make_tiles(style=)` |

## Not done on this track

- The Studio page itself (the UI track owns `gui.py`); this file is its spec.
- Custom (edited) styles saved in `project.json`; `validate()` and `Style(**fields)` are ready for it.
- The game does not read `pixel_step` or the tile size yet; the export only records them in the atlas meta.
