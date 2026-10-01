# Looks: what the Effects page and the Spell designer should show

Backed by `tools/pixelforge/pixelforge/fxlook.py` (shipped on `track/fxlook`; tests in `tests/test_looks.py`):
`LOOKS` (the registry: name, one-line doc, `params` of `Param(default, lo, hi, doc, choices)`, `extra` when the look
adds colours), `looks_table()` (the same as plain dicts, for a UI to build from), `parse_looks(spec)` /
`spec_string(chain)` (the text form every CLI flag, json field and MCP argument uses), `apply_looks(frames, spec,
palette, loop, seed, fps) -> (frames, info)` and `relook(json, spec, name, out_dir)`.

## The Look picker (Effects tab, Spell designer, Painted effect, Quick path animate)

- **A row of look pads** in the registry's order: phosphorus · haze · ethereal · glow · cyberpunk · psychedelic · echo ·
  smooth · embers · smoke · shimmer · outline · pulse · grain · flicker · dissolve · ice · rot. A pad is on/off; the
  on pads form the chain **in the order they were switched on** (order matters: `phosphorus+echo` is not
  `echo+phosphorus`). Show the chain as the spec string under the pads (`phosphorus:strength=0.9+echo:count=2`), editable
  as text, so an AI's spec and the person's clicks are the same thing.
- **Knobs per pad** (2-4 each) from `looks_table()`: a slider from `min` to `max` starting at `default`, the `doc` as
  its label; `choices` become a selector (smooth's `ease`, outline's `side`, dissolve's `direction`); a colour knob
  (outline's `colour`) is a swatch that opens the colour picker. Double-click resets a knob. Integers (count, cycles,
  rate, width...) snap.
- **Live preview** in the middle, the effect looping at 1x and 3x on the game's dark (`#0f1317`), re-rendered on
  release of a knob (apply_looks on a 12-frame effect takes under 0.1 s; the spell designer's `render_spell` already
  caches layers by their look). A "before / after" toggle: `render_spell(spell, with_look=False)`.
- **Pad thumbnails**: the demo GIFs (`pixelforge looks --demo`, committed under `docs/screens/fxlook/look_<name>.gif`)
  are the hover previews; the contact sheet `looks_contact.png` is the "show me all of them" view.
- **Seam check**: a small readout next to Play, "loop seam: 2.1" = the mean difference between the last and first
  frame (looks with `smooth` should bring it down); and the frame count and fps as the look leaves them (`smooth`
  doubles both when `keep_speed` is on; `dissolve` turns the loop into a one-shot: show "plays once").
- **Where the look lives**:
  - Effects tab: one chain for the effect; `make_vfx(..., looks=spec)`; the json carries `look`, `looks`, `palette`.
  - Spell designer: each layer card has its own Look picker (the layer's `look` field, rendered with that layer's
    palette) and the spell has one on top (the spell's `look`; its lock palette is the colours the composite uses).
  - Painted effect: `make_effect(..., looks=spec)`.
  - Quick path (animate a still): a Look picker beside the motion presets; `animate(..., looks=spec)`; presets `pulse`,
    `haunt`, `heat` already carry a look (`LookEffect`).
  - Effects editor (attachments): a Look picker beside Colours / Size / Glow; the attachment's `look` field;
    `attachment_fx_name(att, kind)` gives the sheet name (the look is in it, so changing the look makes a new sheet).
  - Any exported sheet: "Apply a look to this effect" = `relook(json, spec, new_name)`; rotation sheets keep their rows.
- **Describe it**: the words already map (`describe.looks_from_words`): phosphorus, hazy, ghostly / ethereal, bloom /
  glowing, neon / cyberpunk, trippy / psychedelic, afterimages / echo, smooth loop, shimmer, outlined, pulsing,
  grainy, flickering, dissolving, icy / frosted, rotting; the draft spell arrives with `look` set, and the Spell
  designer should open with those pads on.
- **Theme note for the page**: a small line under the pads, "The game keeps cyberpunk and psychedelic for magic"
  (the rule in docs/wiki/01: glow only on magic, lanterns and wisps; no bright red in the world's own things).

## In the game

`art/fx/wisp_phosphorus`, `bone_spear_echo` (8 headings), `vortex_psychedelic`, `ward_ethereal`, `fire_cyberpunk`
are exported examples; `--fx=<name>` shows any of them at the pilgrim; crops in `docs/screens/fxlook/game_*.png`.
