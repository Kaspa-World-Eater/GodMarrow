"""The main pipeline: any image -> clean, palette-locked, game-ready sprite.

The order of work for one frame:

1. the grid (detected on fake pixel art, or the preset's figure height on a painting or a render);
2. the cells: an area-aware downsample in OKLab, a cell opaque when at least half of it is paint, and the identity
   details of the source found at the painting's resolution (:mod:`readable`);
3. the value structure: the lightness remap (contrast, guaranteed span, midtones expanded) and the local contrast
   pass, the chroma grade, the shading bands, the details painted in;
4. the palette, built with k-means weighted toward the features, then the lock (nearest colour);
5. clusters, not noise: orphans, small clusters and 2 px checkers join their area; the majority filter;
6. the edges: the gap lines in the concavities, the ``dark`` or ``rim`` edge on the silhouette's own cells, or the
   older outer outline (``auto`` / a hex colour).

An animation (:func:`pixelate_frames`) runs the same passes with one grid, one lightness reference, one palette and
a temporal stabiliser shared by every frame.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field

import numpy as np
from PIL import Image

from . import cleanup
from . import readable as rd
from .color import hex_to_rgb, oklab_to_rgb, rgb_to_oklab
from .grid import MIN_CONFIDENCE, Grid, detect_grid, downsample
from .palette import Palette
from .quantize import quantize

OUTLINES = ("none", "auto", "dark", "rim")   # plus a hex colour; dark / rim recolour the figure's own edge cells


@dataclass
class PixelateOptions:
    scale: float | str = "auto"  # "auto" or logical pixel size in source pixels
    max_size: int = 224  # fallback when auto-detection is not confident
    width: int | None = None  # force output width in sprite pixels
    height: int | None = None  # force output height in sprite pixels
    colors: int = 96
    palette: Palette | None = None
    dither: str = "none"
    dither_strength: float = 0.6
    remove_background: bool = False
    bg_tolerance: float = 0.03
    despeckle: bool = True
    outline: str | None = None  # None | "auto" (outer, darkest colour) | "dark" | "rim" (the figure's own edge cells) | hex colour (outer)
    outline_diagonal: bool = False
    crop: bool = False
    # the look (see styles.py): a grade of the source in OKLab before the palette is extracted, so the output still
    # never holds a colour outside its palette
    bands: int = 0  # 0 = the painting's own shading; N = lightness flattened to N levels across the figure
    saturation: float = 1.0  # chroma multiplier
    contrast: float = 1.0  # lightness contrast about the figure's median
    lightness: float = 0.0  # lightness lift
    edge: str = "crisp"  # soft (area mean, median where an edge crosses the cell) | crisp (median of the inner 70%) | hard (inner 35%)
    clean: int = 0  # passes of the 3x3 majority filter on the palette indices (the small flat-shaded looks use 1)
    grade_ref: tuple | None = None  # (median, low, high) lightness anchors; set once for a whole animation
    # the pixel conversion (readable.py)
    value_span: float = 0.0  # the least lightness range (2nd..99th percentile) the figure ends with; 0 = the painting's own
    local_contrast: float = 0.0  # unsharp amount on lightness at the pixel scale; 0 = off
    detail: float = 0.0  # detail keep: 1 = the default thresholds, 2 = fainter details too; 0 = off
    cluster: int = 0  # the smallest run of one colour kept, in cells; smaller runs join their neighbour; 0 / 1 = off


def _bleed_passes(grid: Grid) -> int:
    return int(min(12, max(2, np.ceil(max(grid.scale_x, grid.scale_y)) + 1)))


def paint_under_edges(rgba: np.ndarray, passes: int) -> np.ndarray:
    """The RGB of a cutout with its paint spread under the soft and transparent edge pixels, so a cell window that
    straddles the silhouette samples paint and never the white or black the edge was mixed with (the pale rim and
    the bright specks small looks showed along a hem)."""
    solid = rgba[..., 3] > 127
    if solid.all():
        return rgba[..., :3]
    tmp = rgba.copy()
    tmp[..., 3] = np.where(solid, 255, 0).astype(np.uint8)
    return cleanup.bleed_edges(tmp, passes=passes)[..., :3]


def conversion_on(opts: PixelateOptions) -> bool:
    """Whether any of the pixel conversion's passes is asked for. With none of them (the ``godmarrow`` look, the
    older size tiers) the cells are sampled exactly as before this conversion existed, so those looks do not drift."""
    return (opts.cluster > 1 or opts.value_span > 0 or opts.detail > 0 or opts.local_contrast > 0
            or opts.outline in ("dark", "rim"))


# how much of each cell is sampled and with how many samples, per edge treatment, on a painting, when the conversion
# is off (a detected pixel grid is always sampled crisp: the inner half, where blur and compression have not reached)
_EDGE_SAMPLING = {"soft": (0.9, 4), "crisp": (0.5, 3), "hard": (0.35, 3)}


def _legacy_sampling(grid: Grid, edge: str, detected: bool) -> tuple[float, int]:
    if grid.scale_x < 3:
        return 0.9, 2
    if detected or edge not in _EDGE_SAMPLING:
        return _EDGE_SAMPLING["crisp"]
    return _EDGE_SAMPLING[edge]


def _centre_alpha(src_alpha: np.ndarray, grid: Grid, h: int, w: int) -> np.ndarray:
    """The source alpha sampled at every cell centre (255 / 0): the rule the looks without the conversion keep."""
    ys = np.clip(((np.arange(h) + 0.5) * grid.scale_y + grid.offset_y).astype(int), 0, src_alpha.shape[0] - 1)
    xs = np.clip(((np.arange(w) + 0.5) * grid.scale_x + grid.offset_x).astype(int), 0, src_alpha.shape[1] - 1)
    return np.where(src_alpha[ys[:, None], xs[None, :]] > 127, 255, 0).astype(np.uint8)


def grading(opts: PixelateOptions) -> bool:
    return (opts.bands > 0 or abs(opts.saturation - 1.0) > 1e-6 or abs(opts.contrast - 1.0) > 1e-6
            or abs(opts.lightness) > 1e-6 or opts.value_span > 0 or opts.local_contrast > 0)


def lightness_reference(labs: list[np.ndarray], masks: list[np.ndarray] | None = None) -> tuple[float, float, float]:
    """(median, low, high) lightness over the opaque cells of one or more frames: the anchors the grade and the
    shading bands are measured from. One reference for a whole clip keeps the bands from flickering."""
    parts = []
    for i, lab in enumerate(labs):
        L = lab[..., 0]
        parts.append(L[masks[i] > 0] if masks is not None else L.reshape(-1))
    L = np.concatenate(parts) if parts else np.zeros(1)
    if L.size == 0:
        return 0.5, 0.0, 1.0
    med, lo, hi = (float(v) for v in np.percentile(L, [50, 2, 99]))
    if hi - lo < 1e-3:
        lo, hi = max(med - 0.05, 0.0), min(med + 0.05, 1.0)
    return med, lo, hi


def _contrast_radius(mask: np.ndarray) -> float:
    """The local contrast pass separates masses (hat, face, straps, skirt), not texture: its radius is about a
    sixteenth of the figure's height, never under 1.5 cells."""
    rows = np.nonzero((mask > 0).any(axis=1))[0]
    height = (rows.max() - rows.min() + 1) if rows.size else mask.shape[0]
    return float(min(8.0, max(1.5, height / 16.0)))


def grade_lab(lab: np.ndarray, opts: PixelateOptions, ref: tuple[float, float, float], mask: np.ndarray | None = None,
              detail: np.ndarray | None = None, detail_lab: np.ndarray | None = None) -> np.ndarray:
    """The value structure and the colour grade in OKLab: the lightness remap (contrast about the figure's median,
    the guaranteed ``value_span`` with the midtones expanded toward the middle of it, the ``lightness`` lift), the
    local contrast pass, the chroma scale, the shading bands, and the identity details painted in last (remapped
    with the same anchors, so they sit in the figure's value system, a little above their band)."""
    out = lab.astype(np.float64, copy=True)
    m = np.full(out.shape[:2], 255, np.uint8) if mask is None else mask
    structured = opts.value_span > 0
    L, ref2 = rd.value_remap(out[..., 0], ref, contrast=opts.contrast, span=opts.value_span,
                             midtone=0.5 if structured else 0.0, lift=opts.lightness,
                             floor=rd.SHADOW_FLOOR if structured else 0.03)
    if opts.local_contrast > 0:
        L = rd.local_contrast(L, m, opts.local_contrast, _contrast_radius(m))
    if abs(opts.saturation - 1.0) > 1e-6:
        out[..., 1:] *= opts.saturation
    if opts.bands > 1:
        L = rd.posterise(L, ref2[1], ref2[2], opts.bands)
    out[..., 0] = np.clip(L, 0.0, 1.0)
    if detail is not None and detail.any() and detail_lab is not None:
        dl = detail_lab.astype(np.float64, copy=True)
        dL, _ = rd.value_remap(dl[..., 0], ref, contrast=opts.contrast, span=opts.value_span,
                               midtone=0.5 if structured else 0.0, lift=opts.lightness,
                               floor=rd.SHADOW_FLOOR if structured else 0.03)
        dl[..., 0] = dL
        if abs(opts.saturation - 1.0) > 1e-6:
            dl[..., 1:] *= opts.saturation
        out[detail] = dl[detail]
    return out


@dataclass
class PixelateResult:
    image: Image.Image  # RGBA, sprite resolution
    indices: np.ndarray  # (h, w) palette indices, -1 = transparent
    palette: Palette
    grid: Grid
    notes: list[str] = field(default_factory=list)

    def preview(self, zoom: int = 4) -> Image.Image:
        return self.image.resize((self.image.width * zoom, self.image.height * zoom), Image.NEAREST)


def resolve_grid(rgb: np.ndarray, opts: PixelateOptions, notes: list[str]) -> Grid:
    h, w = rgb.shape[:2]
    if opts.width or opts.height:
        s = w / opts.width if opts.width else h / opts.height
        return Grid(s, s, 0.0, 0.0, 1.0)
    if opts.scale != "auto":
        s = float(opts.scale)
        return Grid(s, s, 0.0, 0.0, 1.0)
    grid = detect_grid(rgb)
    if grid.confidence >= MIN_CONFIDENCE:
        notes.append(f"detected grid: {grid.scale_x:g}px (confidence {grid.confidence:.2f})")
        return grid
    s = max(w, h) / opts.max_size
    notes.append(
        f"no reliable pixel grid (confidence {grid.confidence:.2f}); "
        f"resampling to fit {opts.max_size}px"
    )
    return Grid(s, s, 0.0, 0.0, grid.confidence)


def _detected(grid: Grid, opts: PixelateOptions) -> bool:
    return opts.scale == "auto" and not (opts.width or opts.height) and grid.confidence >= MIN_CONFIDENCE


# ------------------------------------------------------------------ the cells of one frame
def frame_cells(rgba_src: np.ndarray, grid: Grid, opts: PixelateOptions, detected: bool = False) -> rd.Cells:
    """One frame downsampled to the grid: colours, opaque mask, paint coverage, identity details (ungraded)."""
    src_alpha = rgba_src[..., 3]
    cutout = bool((src_alpha < 255).any())
    rgb = paint_under_edges(rgba_src, _bleed_passes(grid)) if cutout else rgba_src[..., :3]
    edge = "crisp" if detected else opts.edge
    if not conversion_on(opts):
        # the sampling the looks without the conversion have always had: a sparse sample of each cell's inner part
        # and the alpha at the cell centre
        inner, samples = _legacy_sampling(grid, edge, detected)
        lab = downsample(rgb, grid, inner=inner, samples=samples)
        h, w = lab.shape[:2]
        alpha = _centre_alpha(src_alpha, grid, h, w) if cutout else np.full((h, w), 255, np.uint8)
        return rd.Cells(lab, alpha, np.ones((h, w)), np.zeros((h, w), bool), np.zeros((h, w, 3)), np.ones((h, w)))
    lab_src = rgb_to_oklab(rgb)
    lab, cover = rd.sample_cells(lab_src, src_alpha if cutout else np.full(src_alpha.shape, 255, np.uint8), grid, edge=edge)
    h, w = lab.shape[:2]
    if cutout:
        alpha = rd.coverage_alpha(cover)
    else:
        alpha = np.full((h, w), 255, np.uint8)
        cover = np.ones((h, w))
    if opts.detail > 0 and cutout:
        detail, detail_lab = rd.find_details(lab_src, src_alpha, grid, h, w, opts.detail)
    else:
        detail, detail_lab = np.zeros((h, w), bool), np.zeros((h, w, 3))
    return rd.Cells(lab, alpha, cover, detail, detail_lab, np.ones((h, w)))


def _remove_background(cells: rd.Cells, opts: PixelateOptions) -> None:
    alpha = cells.alpha.copy()
    alpha[cleanup.background_mask(cells.lab, opts.bg_tolerance)] = 0
    if opts.despeckle:
        alpha = cleanup.remove_alpha_specks(alpha)
        alpha = cleanup.remove_islands(alpha)
    cells.alpha = alpha
    cells.detail &= alpha > 0


def _clustered(cells: rd.Cells, opts: PixelateOptions) -> np.ndarray:
    """The cells' colours with the painting's texture collapsed into clusters (``cluster`` > 1), or as sampled."""
    if opts.cluster > 1:
        return rd.cluster_smooth(cells.lab, cells.alpha, radius=1, passes=min(opts.cluster - 1, 3))
    return cells.lab.copy()


def _graded(cells: rd.Cells, opts: PixelateOptions, notes: list[str]) -> np.ndarray:
    """The cells' colours after the value structure and the grade (the cells themselves stay ungraded)."""
    if not grading(opts):
        lab = _clustered(cells, opts)
        if cells.detail.any():
            lab[cells.detail] = cells.detail_lab[cells.detail]
        return lab
    ref = opts.grade_ref or lightness_reference([cells.lab], [cells.alpha])
    lab = grade_lab(_clustered(cells, opts), opts, ref, cells.alpha, cells.detail, cells.detail_lab)
    notes.append(f"graded: {opts.bands or 'painted'} bands, saturation x{opts.saturation:g}, contrast x{opts.contrast:g}, "
                 f"lightness {opts.lightness:+g}, span {opts.value_span:g}, local contrast {opts.local_contrast:g}")
    return lab


def _edged(lab: np.ndarray, cells: rd.Cells, opts: PixelateOptions) -> np.ndarray:
    """The edge pass on the graded colours: the gap lines whenever the conversion is on, the ``dark`` / ``rim``
    edge on request (an ``auto`` / hex outline is drawn outside the figure after the lock instead)."""
    if not (opts.outline or opts.cluster > 1):
        return lab
    mode = opts.outline if opts.outline in ("dark", "rim") else "none"
    out, _ = rd.edge_lab(lab, cells.alpha, mode, coverage=cells.coverage, protect=cells.detail)
    return out


def _build_palette(labs: list[np.ndarray], cells: list[rd.Cells], opts: PixelateOptions) -> Palette:
    rgb = np.concatenate([oklab_to_rgb(l)[c.alpha > 0] for l, c in zip(labs, cells)])
    wgt = np.concatenate([rd.feature_weights(l, c.alpha, c.detail)[c.alpha > 0] for l, c in zip(labs, cells)])
    return Palette.from_image(rgb[None], n_colors=opts.colors, weights=wgt)


def _lock(lab: np.ndarray, cells: rd.Cells, opts: PixelateOptions, palette: Palette | None, notes: list[str]):
    """The palette lock and everything that moves indices after it: ``(rgba, indices, palette)``."""
    h, w = cells.shape
    alpha = cells.alpha
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    if palette is None and opts.colors <= 0:
        # full colour: one true colour per cell, nothing merged
        rgba[..., :3] = oklab_to_rgb(lab)
        rgba[..., 3] = alpha
        uniq = np.unique(rgba[alpha > 0][:, :3], axis=0)
        palette = Palette(uniq[:4096]) if len(uniq) else Palette(np.zeros((1, 3), np.uint8))
        notes.append(f"full colour: {len(uniq)} colours")
        indices = np.where(alpha > 0, 0, -1).astype(np.int32)
        if len(uniq) <= 4096:
            indices = palette.nearest(lab).astype(np.int32)
            indices[alpha == 0] = -1
        return rgba, indices, palette
    if palette is None:
        palette = _build_palette([lab], [cells], opts)
    indices = quantize(lab, palette, dither=opts.dither, strength=opts.dither_strength, mask=alpha > 0).astype(np.int32)
    protect = cells.detail & (alpha > 0)
    kept = indices[protect]
    if opts.dither == "none":
        if opts.despeckle:
            indices = cleanup.remove_orphans(indices, alpha, passes=2 if opts.bands > 0 else 1)
        if opts.cluster > 1:
            indices = rd.cluster_clean(indices, alpha, opts.cluster, protect=protect)
        if opts.clean > 0:
            indices = cleanup.majority_filter(indices, alpha, passes=opts.clean)
        indices[protect] = kept
    indices[alpha == 0] = -1
    rgba[..., :3] = palette.colors[np.clip(indices, 0, len(palette) - 1)]
    rgba[..., 3] = alpha
    return rgba, indices, palette


def _finish(rgba: np.ndarray, indices: np.ndarray, palette: Palette, opts: PixelateOptions, grid: Grid, notes: list[str]) -> PixelateResult:
    """The outer outline (``auto`` / hex), the crop, the result."""
    if opts.outline and opts.outline not in ("dark", "rim"):
        color = cleanup.darkest(palette.colors) if opts.outline == "auto" else hex_to_rgb(opts.outline)
        before = rgba[..., 3] > 0
        rgba = cleanup.add_outline(cleanup.pad(rgba), color, diagonal=opts.outline_diagonal)
        hit = np.nonzero((palette.colors == np.array(color)).all(1))[0]
        if len(hit) == 0:
            palette = Palette(np.vstack([palette.colors, color]))
            hit = [len(palette) - 1]
        indices = np.pad(indices, 1, constant_values=-1)
        new = (rgba[..., 3] > 0) & ~np.pad(before, 1)
        indices[new] = int(hit[0])
    if opts.crop:
        ys, xs = np.nonzero(rgba[..., 3])
        if len(ys):
            y0, y1 = max(ys.min() - 1, 0), min(ys.max() + 2, rgba.shape[0])
            x0, x1 = max(xs.min() - 1, 0), min(xs.max() + 2, rgba.shape[1])
            rgba, indices = rgba[y0:y1, x0:x1], indices[y0:y1, x0:x1]
    return PixelateResult(Image.fromarray(np.ascontiguousarray(rgba), "RGBA"), np.ascontiguousarray(indices), palette, grid, notes)


def pixelate(image: Image.Image | str, opts: PixelateOptions | None = None) -> PixelateResult:
    opts = opts or PixelateOptions()
    if isinstance(image, str):
        image = Image.open(image)
    rgba_src = np.asarray(image.convert("RGBA"))
    notes: list[str] = []
    grid = resolve_grid(rgba_src[..., :3], opts, notes)
    cells = frame_cells(rgba_src, grid, opts, _detected(grid, opts))
    if opts.remove_background:
        _remove_background(cells, opts)
    lab = _edged(_graded(cells, opts, notes), cells, opts)
    rgba, indices, palette = _lock(lab, cells, opts, opts.palette, notes)
    return _finish(rgba, indices, palette, opts, grid, notes)


# ------------------------------------------------------------------ animations
def _clip(frames: list[Image.Image], opts: PixelateOptions):
    """The front half of :func:`pixelate_frames`: the grid detected on the first frame, the options fixed to it,
    and every frame's cells (ungraded)."""
    notes: list[str] = []
    first = np.asarray(frames[0].convert("RGB"))
    grid = resolve_grid(first, opts, notes)
    detected = _detected(grid, opts)
    # Per-frame cropping would misalign frames, so it is never applied here; a detected pixel grid is sampled crisp.
    fixed = PixelateOptions(
        **{**opts.__dict__, "scale": grid.scale_x, "width": None, "height": None, "crop": False,
           "edge": "crisp" if detected else opts.edge}
    )
    cells = [frame_cells(np.asarray(f.convert("RGBA")), grid, fixed, detected) for f in frames]
    if fixed.remove_background:
        for c in cells:
            _remove_background(c, fixed)
    return notes, fixed, grid, cells


def _clip_cells(frames: list[Image.Image], opts: PixelateOptions):
    """``(notes, fixed options, labs, masks)``: every frame's cells in OKLab (ungraded) with their opaque masks."""
    notes, fixed, _, cells = _clip(frames, opts)
    return notes, fixed, [c.lab for c in cells], [c.alpha for c in cells]


def clip_lightness_reference(clips: list[list[Image.Image]], opts: PixelateOptions) -> tuple[float, float, float]:
    """One (median, low, high) lightness reference over sample frames of every clip of a character, to pass as
    ``opts.grade_ref`` to each :func:`pixelate_frames` call: a three-band figure then keeps the same three levels in
    idle, walk and cast instead of each clip finding its own, which would make the body jump in lightness when the
    game switches animation."""
    labs, masks = [], []
    for frames in clips:
        if not frames:
            continue
        _, _, l, m = _clip_cells(frames, opts)
        labs += l
        masks += m
    return lightness_reference(labs, masks)


def pixelate_frames(
    frames: list[Image.Image],
    opts: PixelateOptions | None = None,
    *,
    stabilize: float = 0.04,
) -> list[PixelateResult]:
    """Pixelate an animation (e.g. frames from a video model) consistently.

    * one palette shared by every frame (extracted jointly, weighted toward the features),
    * one grid shared by every frame (detected on the first frame),
    * one lightness reference for the grade and the bands (the clip's, or the character's when the caller measured
      one with :func:`clip_lightness_reference`),
    * temporal stabilization: a pixel whose color changed by less than
      ``stabilize`` (OKLab distance) keeps its previous-frame color, which kills
      most of the "boiling" that makes AI animations look wrong as pixel art.
    """
    opts = opts or PixelateOptions()
    if not frames:
        return []
    notes, fixed, grid, cells = _clip(frames, opts)
    if grading(fixed):
        fixed.grade_ref = opts.grade_ref or lightness_reference([c.lab for c in cells], [c.alpha for c in cells])
    labs = [_edged(_graded(c, fixed, notes if i == 0 else []), c, fixed) for i, c in enumerate(cells)]
    if fixed.palette is None and opts.colors > 0:
        fixed.palette = _build_palette(labs, cells, fixed)

    results = []
    for lab, c in zip(labs, cells):
        frame_notes = list(notes)
        rgba, indices, palette = _lock(lab, c, fixed, fixed.palette, frame_notes)
        results.append(_finish(rgba, indices, palette, fixed, grid, frame_notes))
    if stabilize > 0 and len(results) > 1 and fixed.palette is not None:
        pad = 1 if (fixed.outline and fixed.outline not in ("dark", "rim")) else 0
        colors = fixed.palette.colors
        prev_idx = results[0].indices
        for t in range(1, len(results)):
            r = results[t]
            idx = r.indices.copy()
            h, w = labs[t].shape[:2]
            region = idx[pad : pad + h, pad : pad + w]
            prev_region = prev_idx[pad : pad + h, pad : pad + w]
            # compare the *source* colors, not the quantized ones: small drift
            # in the source is what flips pixels between two palette entries.
            drift = np.sqrt(((labs[t] - labs[t - 1]) ** 2).sum(-1))
            keep = (drift < stabilize) & (region >= 0) & (prev_region >= 0)
            if keep.any():
                region[keep] = prev_region[keep]
                arr = np.asarray(r.image).copy()
                sub = arr[pad : pad + h, pad : pad + w]
                sub[keep, :3] = colors[region[keep]]
                r.image = Image.fromarray(arr, "RGBA")
                r.indices = idx
            prev_idx = idx
    if any("no reliable" in n for n in notes):
        warnings.warn(notes[0])
    return results
