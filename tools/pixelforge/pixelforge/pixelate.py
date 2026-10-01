"""The main pipeline: any image -> clean, palette-locked, game-ready sprite."""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field

import numpy as np
from PIL import Image

from . import cleanup
from .color import oklab_to_rgb
from .grid import MIN_CONFIDENCE, Grid, detect_grid, downsample
from .palette import Palette
from .quantize import quantize


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
    outline: str | None = None  # None | "auto" | hex color
    outline_diagonal: bool = False
    crop: bool = False
    # the look (see styles.py): a grade of the source in OKLab before the palette is extracted, so the output still
    # never holds a colour outside its palette
    bands: int = 0  # 0 = the painting's own shading; N = lightness flattened to N levels across the figure
    saturation: float = 1.0  # chroma multiplier
    contrast: float = 1.0  # lightness contrast about the figure's median
    lightness: float = 0.0  # lightness lift
    edge: str = "crisp"  # soft (cell average) | crisp (median of the inner half) | hard (near the cell centre)
    clean: int = 0  # passes of the 3x3 majority filter on the palette indices (the small flat-shaded looks use 1)
    grade_ref: tuple | None = None  # (median, low, high) lightness anchors; set once for a whole animation


# how much of each cell is sampled and with how many samples, per edge treatment, on a painting (a detected pixel
# grid is always sampled crisp: the inner half, where blur and compression have not reached)
_EDGE_SAMPLING = {"soft": (0.9, 4), "crisp": (0.5, 3), "hard": (0.35, 3)}


def _sampling(grid: Grid, edge: str, detected: bool) -> tuple[float, int]:
    if grid.scale_x < 3:
        return 0.9, 2
    if detected or edge not in _EDGE_SAMPLING:
        return _EDGE_SAMPLING["crisp"]
    return _EDGE_SAMPLING[edge]


def _cell_alpha(src_alpha: np.ndarray, grid: Grid, h: int, w: int) -> np.ndarray:
    """The source alpha sampled at every cell centre (255 / 0)."""
    ys = np.clip(((np.arange(h) + 0.5) * grid.scale_y + grid.offset_y).astype(int), 0, src_alpha.shape[0] - 1)
    xs = np.clip(((np.arange(w) + 0.5) * grid.scale_x + grid.offset_x).astype(int), 0, src_alpha.shape[1] - 1)
    return np.where(src_alpha[ys[:, None], xs[None, :]] > 127, 255, 0).astype(np.uint8)


def paint_under_edges(rgba: np.ndarray, passes: int) -> np.ndarray:
    """The RGB of a cutout with its paint spread under the soft and transparent edge pixels, so a cell window that
    straddles the silhouette samples paint and never the white or black the edge was mixed with (the pale rim and
    the bright specks small looks showed along a hem)."""
    solid = rgba[..., 3] > 127
    if solid.all():
        return rgba[..., :3]
    ys, xs = np.nonzero(rgba[..., 3])
    if len(ys) == 0:
        return rgba[..., :3]
    # only the painted box (plus the bleed's reach) is worked on: a figure in a large frame costs its own size
    h, w = solid.shape
    y0, y1 = max(int(ys.min()) - passes - 1, 0), min(int(ys.max()) + passes + 2, h)
    x0, x1 = max(int(xs.min()) - passes - 1, 0), min(int(xs.max()) + passes + 2, w)
    tmp = rgba[y0:y1, x0:x1].copy()
    tmp[..., 3] = np.where(solid[y0:y1, x0:x1], 255, 0).astype(np.uint8)
    out = rgba[..., :3].copy()
    out[y0:y1, x0:x1] = cleanup.bleed_edges(tmp, passes=passes)[..., :3]
    return out


def _bleed_passes(grid: Grid) -> int:
    return int(min(12, max(2, np.ceil(max(grid.scale_x, grid.scale_y)) + 1)))


def grading(opts: PixelateOptions) -> bool:
    return opts.bands > 0 or abs(opts.saturation - 1.0) > 1e-6 or abs(opts.contrast - 1.0) > 1e-6 or abs(opts.lightness) > 1e-6


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


def grade_lab(lab: np.ndarray, opts: PixelateOptions, ref: tuple[float, float, float]) -> np.ndarray:
    """Saturation, contrast and shading bands in OKLab. Lightness is stretched about the figure's median; chroma is
    scaled; with ``bands`` the lightness between the low and high anchors is flattened to that many even levels
    (anything brighter than the high anchor, a glowing eye, lands on the top band)."""
    med, lo, hi = ref
    out = lab.astype(np.float64, copy=True)
    L = out[..., 0]
    if abs(opts.contrast - 1.0) > 1e-6:
        L = med + (L - med) * opts.contrast
        lo, hi = med + (lo - med) * opts.contrast, med + (hi - med) * opts.contrast
    if abs(opts.lightness) > 1e-6:
        L = L + opts.lightness
        lo, hi = lo + opts.lightness, hi + opts.lightness
    if abs(opts.saturation - 1.0) > 1e-6:
        out[..., 1:] *= opts.saturation
    if opts.bands > 1:
        lo, hi = max(lo, 0.0), min(hi, 1.0)
        t = np.clip((L - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
        L = lo + np.rint(t * (opts.bands - 1)) / (opts.bands - 1) * (hi - lo)
    out[..., 0] = np.clip(L, 0.0, 1.0)
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


def pixelate(image: Image.Image | str, opts: PixelateOptions | None = None) -> PixelateResult:
    opts = opts or PixelateOptions()
    if isinstance(image, str):
        image = Image.open(image)
    rgba_src = np.asarray(image.convert("RGBA"))
    rgb = rgba_src[..., :3]
    notes: list[str] = []

    grid = resolve_grid(rgb, opts, notes)
    detected = opts.scale == "auto" and not (opts.width or opts.height) and grid.confidence >= MIN_CONFIDENCE
    inner, samples = _sampling(grid, opts.edge, detected)
    src_alpha = rgba_src[..., 3]
    cutout = bool((src_alpha < 255).any())
    if cutout:
        rgb = paint_under_edges(rgba_src, _bleed_passes(grid))
    lab = downsample(rgb, grid, inner=inner, samples=samples)
    h, w = lab.shape[:2]

    # alpha: keep source transparency, optionally flood-remove the background
    alpha = np.full((h, w), 255, dtype=np.uint8)
    if cutout:
        alpha = _cell_alpha(src_alpha, grid, h, w)
    if opts.remove_background:
        alpha[cleanup.background_mask(lab, opts.bg_tolerance)] = 0
        if opts.despeckle:
            alpha = cleanup.remove_alpha_specks(alpha)
            alpha = cleanup.remove_islands(alpha)

    # the look's grade (shading bands, saturation, contrast) on the source cells, before any palette is drawn from them
    if grading(opts):
        ref = opts.grade_ref or lightness_reference([lab], [alpha])
        lab = grade_lab(lab, opts, ref)
        notes.append(f"graded: {opts.bands or 'painted'} bands, saturation x{opts.saturation:g}, contrast x{opts.contrast:g}, "
                     f"lightness {opts.lightness:+g}")

    palette = opts.palette
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    if palette is None and opts.colors <= 0:
        # full colour: one true colour per cell, nothing merged
        rgba[..., :3] = oklab_to_rgb(lab)
        rgba[..., 3] = alpha
        uniq = np.unique(rgba[alpha > 0][:, :3], axis=0)
        palette = Palette(uniq[:4096]) if len(uniq) else Palette(np.zeros((1, 3), np.uint8))
        notes.append(f"full colour: {len(uniq)} colours")
    else:
        if palette is None:
            opaque_rgb = oklab_to_rgb(lab)[alpha > 0]
            palette = Palette.from_image(opaque_rgb[None], n_colors=opts.colors)
        indices = quantize(lab, palette, dither=opts.dither, strength=opts.dither_strength, mask=alpha > 0)
        if opts.despeckle and opts.dither == "none":
            indices = cleanup.remove_orphans(indices, alpha, passes=2 if opts.bands > 0 else 1)
        if opts.clean > 0 and opts.dither == "none":
            indices = cleanup.majority_filter(indices, alpha, passes=opts.clean)
        rgba[..., :3] = palette.colors[indices]
        rgba[..., 3] = alpha

    if opts.outline:
        from .color import hex_to_rgb

        color = cleanup.darkest(palette.colors) if opts.outline == "auto" else hex_to_rgb(opts.outline)
        rgba = cleanup.add_outline(cleanup.pad(rgba), color, diagonal=opts.outline_diagonal)
        if opts.outline != "auto" and not (palette.colors == np.array(color)).all(1).any():
            palette = Palette(np.vstack([palette.colors, color]))
    if opts.crop:
        rgba = cleanup.crop_to_content(rgba)

    final_idx = _indices_for(rgba, palette) if len(palette) <= 4096 and opts.colors > 0 else np.where(rgba[..., 3] > 0, 0, -1)
    return PixelateResult(Image.fromarray(rgba, "RGBA"), final_idx, palette, grid, notes)


def _indices_for(rgba: np.ndarray, palette: Palette) -> np.ndarray:
    key = lambda c: (c[..., 0].astype(np.int64) << 16) | (c[..., 1].astype(np.int64) << 8) | c[..., 2]
    lookup = {int(k): i for i, k in enumerate(key(palette.colors))}
    k = key(rgba[..., :3])
    uniq, inv = np.unique(k, return_inverse=True)   # one lookup per distinct colour, not per pixel
    table = np.array([lookup.get(int(v), -1) for v in uniq], dtype=np.int32)
    out = table[inv].reshape(k.shape)
    out[rgba[..., 3] == 0] = -1
    return out


def _clip_box(frames: list[Image.Image], opts: PixelateOptions) -> tuple[int, int, int, int, int] | None:
    """The painted box of a clip (with an edge of cells round it) on a fixed integer-scale grid, when cutting the
    frames to it would save real work; ``None`` otherwise (auto grids, forced sizes, small or nearly full frames)."""
    if opts.scale == "auto" or opts.width or opts.height or opts.crop:
        return None
    s = float(opts.scale)
    if s < 1.0 or abs(s - round(s)) > 1e-6:
        return None
    s = int(round(s))
    w, h = frames[0].size
    if w * h < 300_000 or any(f.size != (w, h) for f in frames):
        return None
    x0, y0, x1, y1 = w, h, 0, 0
    for f in frames:
        a = np.asarray(f.getchannel("A")) if f.mode in ("RGBA", "LA") else None
        if a is None:
            return None
        ys, xs = np.nonzero(a)
        if len(ys) == 0:
            continue
        x0, y0, x1, y1 = min(x0, int(xs.min())), min(y0, int(ys.min())), max(x1, int(xs.max()) + 1), max(y1, int(ys.max()) + 1)
    if x1 <= x0 or y1 <= y0:
        return None
    pad = 2 * s
    x0, y0 = max((x0 - pad) // s * s, 0), max((y0 - pad) // s * s, 0)
    x1, y1 = min(-(-(x1 + pad) // s) * s, w), min(-(-(y1 + pad) // s) * s, h)
    if (x1 - x0) * (y1 - y0) > 0.6 * w * h:
        return None
    return x0, y0, x1, y1, s


def _pad_result(r: "PixelateResult", full_w: int, full_h: int, x0: int, y0: int, s: int, outlined: bool) -> "PixelateResult":
    """A sprite made from a cut-out box put back into the full canvas's sprite (transparent round it)."""
    ring = 1 if outlined else 0
    H, W = full_h // s + 2 * ring, full_w // s + 2 * ring
    ox, oy = x0 // s, y0 // s
    img = np.zeros((H, W, 4), dtype=np.uint8)
    idx = np.full((H, W), -1, dtype=np.int32)
    src = np.asarray(r.image)
    h, w = src.shape[:2]
    h, w = min(h, H - oy), min(w, W - ox)
    img[oy:oy + h, ox:ox + w] = src[:h, :w]
    idx[oy:oy + h, ox:ox + w] = r.indices[:h, :w]
    return PixelateResult(Image.fromarray(img, "RGBA"), idx, r.palette, r.grid, r.notes)


def _clip_cells(frames: list[Image.Image], opts: PixelateOptions):
    """The front half of :func:`pixelate_frames`: the grid detected on the first frame, the options fixed to it, and
    every frame's cells in OKLab (ungraded) with their opaque masks."""
    notes: list[str] = []
    first = np.asarray(frames[0].convert("RGB"))
    grid = resolve_grid(first, opts, notes)
    detected = opts.scale == "auto" and not (opts.width or opts.height) and grid.confidence >= MIN_CONFIDENCE
    # Per-frame cropping would misalign frames, so it is never applied here; a detected pixel grid is sampled crisp.
    fixed = PixelateOptions(
        **{**opts.__dict__, "scale": grid.scale_x, "width": None, "height": None, "crop": False,
           "edge": "crisp" if detected else opts.edge}
    )
    inner, samples = _sampling(grid, fixed.edge, detected)
    passes = _bleed_passes(grid)
    srcs = [np.asarray(f.convert("RGBA")) for f in frames]
    labs = [downsample(paint_under_edges(a, passes) if (a[..., 3] < 255).any() else a[..., :3], grid, inner=inner, samples=samples)
            for a in srcs]
    masks = [_cell_alpha(a[..., 3], grid, *l.shape[:2]) if (a[..., 3] < 255).any() else np.full(l.shape[:2], 255, np.uint8)
             for a, l in zip(srcs, labs)]
    return notes, fixed, labs, masks


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

    * one palette shared by every frame (extracted jointly),
    * one grid shared by every frame (detected on the first frame),
    * temporal stabilization: a pixel whose color changed by less than
      ``stabilize`` (OKLab distance) keeps its previous-frame color, which kills
      most of the "boiling" that makes AI animations look wrong as pixel art.
    """
    opts = opts or PixelateOptions()
    if not frames:
        return []
    box = _clip_box(frames, opts)
    if box is not None:
        # a figure in a large frame (the rendered roads) costs its own size: cut the clip to the painted box, on
        # cell boundaries, and pad the sprites back into the full canvas afterwards
        x0, y0, x1, y1, s = box
        inner = pixelate_frames([f.crop((x0, y0, x1, y1)) for f in frames], opts, stabilize=stabilize)
        full_w, full_h = frames[0].size
        return [_pad_result(r, full_w, full_h, x0, y0, s, bool(opts.outline)) for r in inner]
    notes, fixed, labs, masks = _clip_cells(frames, opts)
    if grading(fixed):
        # one set of lightness anchors for the whole clip (or the whole character, when the caller measured one with
        # clip_lightness_reference), so bands and contrast never flicker between frames or jump between clips
        fixed.grade_ref = opts.grade_ref or lightness_reference(labs, masks)
        labs = [grade_lab(l, fixed, fixed.grade_ref) for l in labs]
    if fixed.palette is None and opts.colors > 0:
        stacked = np.concatenate([oklab_to_rgb(l).reshape(-1, 3) for l in labs])
        fixed.palette = Palette.from_image(stacked[None], n_colors=opts.colors)

    results = [pixelate(f, fixed) for f in frames]
    if stabilize > 0 and len(results) > 1 and fixed.palette is not None:
        pad = 1 if fixed.outline else 0
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
    for r in results:
        r.notes = notes + r.notes
    if any("no reliable" in n for n in notes):
        warnings.warn(notes[0])
    return results
