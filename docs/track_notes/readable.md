# Readable pixels: the conversion as a rack of knobs (track/readable)

Backed by `tools/pixelforge/pixelforge/readable.py` (the passes), `pixelate.py` (runs them between the downsample
and the palette lock), `styles.py` (four new preset fields and two new outline rules), `api.convert_image`, CLI
`pixelforge pixelate --value-span --local-contrast --detail --cluster --outline dark|rim`, MCP `pixelate_image`.
Tests in `tests/test_readable.py`. Pictures in `docs/screens/readable/`.

## What the conversion does (one sentence per pass, for a tooltip)

1. **Cells**: every sprite pixel is the area of the painting under it (not one sample), and a pixel is solid when at
   least half of it is paint, so edges stop boiling between frames and the gap between an arm and the body stays open.
2. **Value span**: the figure's darkest and lightest shades are pushed a fixed distance apart and the midtones are
   opened up, so a dark painting still has three to five clearly different lightness levels at 56-120 px.
3. **Local contrast**: folds, straps and gear separate from the cloth round them (an unsharp pass on lightness at the
   size of the figure's masses, inside the figure only).
4. **Detail keep**: the eyes, glow, trim and metal of the painting are found at full size and placed as at least one
   clean, slightly brightened pixel each, the way a pixel artist does by hand; they are protected from every clean-up.
5. **Cluster**: the painting's fine texture collapses into clusters of one colour; orphan pixels, pairs and 2 px
   checkers join the colour next to them. Lines, blocks and the details stay.
6. **Edge**: the silhouette's own edge pixels drop a step darker than the body beside them (`dark`), or rise on the
   lit side and drop on the other (`rim`); concavities the downsample closed get a dark line. `auto` is the older
   outer outline in the darkest colour; `none` draws only the concavity lines.

Everything happens in OKLab before the palette is drawn, so the palette holds the edge shades and the details and the
output never has a colour outside its palette.

## The rack (the Style page's Advanced fold gets one more group, "Conversion")

| knob | field | range | plain label | default per look |
|---|---|---|---|---|
| value span | `value_span` | 0 (off) .. 0.9 | *how far apart the darkest and lightest shades sit* | gothic 0.55, ARPG 0.55, SNES 0.6, handheld 0.6, indie 0.55, painterly 0.45, Godmarrow 0 |
| local contrast | `local_contrast` | 0 (off) .. 2 | *how much folds and gear separate from the cloth* | 0.5 / 0.5 / 0.6 / 0.6 / 0.5 / 0.3 / 0 |
| detail keep | `detail` | 0 (off) .. 3 | *keep eyes, glow, trim and metal as clean pixels (2 = fainter ones too)* | 1 on every look but Godmarrow |
| cluster size | `cluster` | 0 (off) .. 8 | *the smallest speck kept, in pixels* | 3 / 3 / 4 / 4 / 3 / 2 / 0 |
| edge | `outline` | none, auto, dark, rim, #rrggbb | *the edge of the figure* | gothic rim, ARPG dark, SNES auto, handheld auto, indie none, painterly none, Godmarrow auto |
| contrast, bands, clean | existing | | | unchanged |

The page should show, beside the knobs, a live **before / after** of the character's front cutout (the current
knobs against the same look with the four conversion knobs at 0 and the outline at none) at 3x, and two numbers
from `api.convert_image(...)`: **value separation** (the 90th minus the 10th percentile of lightness; under 0.2 is a
blur) and **orphans** (lone pixels; more than 2% of the figure is noise). A **Reset to the look** link puts the
knobs back to the preset's. Nothing runs automatically: changing a knob marks the pixelate and export steps stale,
as the Style page already does for a look change.

## Where the numbers go

| field | step that reads it |
|---|---|
| `value_span`, `local_contrast` | pixelate, in the grade (`grade_lab`), anchored by the character's one lightness reference |
| `detail` | pixelate, `frame_cells` (found on the source, painted after the grade, protected after the lock) |
| `cluster` | pixelate: the bilateral smoothing before the grade and the cluster clean after the lock |
| `outline` dark / rim | pixelate, `edge_lab` before the lock (the older `auto` / hex still draw outside the figure after it) |

## Not done on this track

- The Studio / Forge app page (the UI tracks own `gui.py` and the Studio package); this file is its spec.
- Custom edited styles are still not saved in `project.json`.
- The conversion is tuned on one dark figure (the Keeper). A bright painting may want `value_span` lower and
  `detail` at 0; a very clean painting (flat colour art) wants `cluster` at 0.
