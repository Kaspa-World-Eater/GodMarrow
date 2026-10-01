"""The pixel conversion (readable.py): each pass on synthetic images, the knobs through the presets, the CLI and
the api, and the Keeper's cutout and renders when they are on this machine."""
import json
import os
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from pixelforge import api, readable as rd
from pixelforge.color import rgb_to_oklab
from pixelforge.grid import Grid
from pixelforge.palette import Palette
from pixelforge.pixelate import PixelateOptions, grade_lab, lightness_reference, pixelate, pixelate_frames
from pixelforge.styles import LOOKS, STYLES, options_for_style, validate

# the Keeper's project folder (characters/keeper, with views/ and renders/) for the two slow tests at the end; they
# are skipped when the variable is not set
KEEPER = Path(os.environ.get("PIXELFORGE_KEEPER", "/nonexistent"))


def _figure(seed=0, w=160, h=300, eye=True, shift=0):
    """A soft, dark, low-contrast 'painting' of a hooded figure with fine texture, a pale sash and two tiny
    saturated eyes, on transparency; ``shift`` moves it sideways (an animation frame)."""
    rng = np.random.default_rng(seed)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    cx = w / 2 + shift
    body = (np.abs(xs - cx) < (18 + 40 * (ys / h) ** 1.5)) & (ys > 30)
    hood = ((xs - cx) ** 2 + (ys - 27) ** 2) < 27 ** 2
    arm = (np.abs(xs - (cx + 50)) < 7) & (ys > 90) & (ys < 200)       # an arm held off the body: a 6 px gap
    mask = body | hood | arm
    shade = 0.25 + 0.18 * (1 - np.abs(xs - cx) / 60).clip(0, 1) * (0.6 + 0.4 * np.sin(ys / 23))
    shade += rng.normal(0, 0.03, shade.shape)                          # fine texture (the mush)
    rgb = np.zeros((h, w, 3), np.float32)
    rgb[..., 0] = 70 * shade + 12
    rgb[..., 1] = 48 * shade + 10
    rgb[..., 2] = 92 * shade + 20
    sash = body & (np.abs(ys - 150 - (xs - cx) * 0.4) < 6)
    rgb[sash] = (160 * shade[sash][:, None] + 60) * np.array([1.0, 0.92, 0.72])
    if eye:
        for ex in (cx - 8, cx + 8):
            e = ((xs - ex) ** 2 + (ys - 26) ** 2) < 2.5 ** 2
            rgb[e] = (170, 60, 230)                                   # tiny saturated eyes
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = np.clip(rgb, 0, 255)
    rgba[..., 3] = mask * 255
    return Image.fromarray(rgba, "RGBA")


def _lab_and_alpha(image: Image.Image):
    arr = np.asarray(image.convert("RGBA"))
    return rgb_to_oklab(arr[..., :3]), arr[..., 3]


# ------------------------------------------------------------------ 1. value structure
def test_value_remap_guarantees_the_span_and_keeps_the_order():
    rng = np.random.default_rng(1)
    L = np.clip(rng.normal(0.25, 0.05, (60, 40)), 0.0, 1.0)
    ref = lightness_reference([np.dstack([L, L * 0, L * 0])])
    out, ref2 = rd.value_remap(L, ref, span=0.55)
    assert ref2[2] - ref2[1] >= 0.55 - 1e-6
    assert rd.value_separation(out, np.ones_like(L)) > 2.5 * rd.value_separation(L, np.ones_like(L))
    assert out.min() >= 0.0 and out.max() <= 1.0
    # monotonic: a lighter pixel stays lighter
    flat_in, flat_out = L.reshape(-1), out.reshape(-1)
    order = np.argsort(flat_in)
    assert np.all(np.diff(flat_out[order]) >= -1e-9)
    # the midtone expansion moves the median toward the middle of the range
    med_pos = (np.median(out) - ref2[1]) / (ref2[2] - ref2[1])
    assert 0.35 < med_pos < 0.65


def test_grade_lab_separates_the_values_and_keeps_hue():
    lab, alpha = _lab_and_alpha(_figure())
    opts = PixelateOptions(value_span=0.55, local_contrast=0.5)
    ref = lightness_reference([lab], [alpha])
    out = grade_lab(lab, opts, ref, alpha)
    assert rd.value_separation(out[..., 0], alpha) > 2 * rd.value_separation(lab[..., 0], alpha)
    assert np.allclose(out[..., 1:], lab[..., 1:])                   # hue and chroma untouched
    # the shadow floor holds in the remap; the local contrast pass may push a few cells a little under it
    assert np.percentile(out[..., 0][alpha > 0], 2) >= rd.SHADOW_FLOOR - 0.04


def test_posterise_lands_on_the_bands():
    L = np.linspace(0, 1, 101)
    out = rd.posterise(L, 0.1, 0.7, 3)
    assert set(np.round(np.unique(out), 3)) == {0.1, 0.4, 0.7}


# ------------------------------------------------------------------ 2. clusters, not noise
def test_cluster_clean_removes_orphans_pairs_and_checkers_but_keeps_lines_blocks_and_details():
    idx = np.zeros((20, 20), np.int32)
    alpha = np.full((20, 20), 255, np.uint8)
    idx[3, 3] = 1                   # an orphan
    idx[6, 6:8] = 1                 # a pair
    idx[9:11, 9:11] = [[1, 2], [2, 1]]   # a 2 px checker on 0
    idx[14, 2:12] = 3               # a 1 px line
    idx[2:5, 14:17] = 4             # a 3x3 block
    idx[17, 17] = 5                 # an eye: an orphan that is a detail
    protect = np.zeros((20, 20), bool)
    protect[17, 17] = True
    before = rd.orphan_count(idx, alpha)
    out = rd.cluster_clean(idx, alpha, min_size=3, protect=protect)
    assert before == 2                                               # the orphan and the eye
    assert out[3, 3] == 0 and (out[6, 6:8] == 0).all()
    assert (out[9:11, 9:11] == 0).all()
    assert (out[14, 2:12] == 3).all() and (out[2:5, 14:17] == 4).all()
    assert out[17, 17] == 5
    assert rd.orphan_count(out, alpha) == 1          # only the protected eye is left
    # only indices moved: nothing new appeared
    assert set(np.unique(out)) <= set(np.unique(idx))


def test_cluster_smooth_collapses_texture_and_keeps_the_border():
    rng = np.random.default_rng(2)
    lab = np.zeros((30, 30, 3))
    lab[..., 0] = 0.3 + rng.normal(0, 0.03, (30, 30))
    lab[:, 15:, 0] += 0.3                                           # a hard border between two values
    alpha = np.full((30, 30), 255, np.uint8)
    out = rd.cluster_smooth(lab, alpha, radius=1, passes=2)
    assert out[:, :13, 0].std() < lab[:, :13, 0].std() / 2
    assert abs(out[:, 16:, 0].mean() - out[:, :14, 0].mean()) > 0.25   # the border is still a border
    assert np.allclose(out[..., 1:], 0.0)


# ------------------------------------------------------------------ 3. identity details
def test_find_details_keeps_a_tiny_saturated_eye_but_not_a_thin_bright_line():
    src = _figure()
    lab, alpha = _lab_and_alpha(src)
    grid = Grid(5.0, 5.0)
    w, h = grid.output_size(*src.size)
    mask, colour = rd.find_details(lab, alpha, grid, h, w, 1.0)
    ys, xs = np.nonzero(mask)
    eyes = ys <= 7                                                    # at the eyes' height
    assert eyes.sum() >= 2                                            # both eyes
    chroma = np.hypot(colour[mask][:, 1], colour[mask][:, 2])
    assert (chroma[eyes] > 0.08).all()                                # the eyes' own colour, lifted
    # the long sash line itself is not a detail (only its compact end at the silhouette may be)
    assert mask.sum() <= 6
    off, _ = rd.find_details(lab, alpha, grid, h, w, 0.0)
    assert not off.any()


def test_small_bright_feature_survives_downsampling():
    src = _figure()
    with_detail = pixelate(src, PixelateOptions(max_size=60, colors=16, value_span=0.55, cluster=3, detail=1.0, outline="dark"))
    without = pixelate(src, PixelateOptions(max_size=60, colors=16, value_span=0.55, cluster=3, detail=0.0, outline="dark"))

    def purple_cells(r):
        arr = np.asarray(r.image)
        lab = rgb_to_oklab(arr[..., :3])
        return int(((lab[..., 1] > 0.05) & (lab[..., 2] < -0.1) & (arr[..., 3] > 0)).sum())

    assert purple_cells(with_detail) >= 2
    assert purple_cells(with_detail) > purple_cells(without)
    assert len(with_detail.palette) <= 16


# ------------------------------------------------------------------ 4. edges
def test_edge_lab_darkens_the_edge_a_step_below_the_body_and_keeps_gaps_open():
    src = _figure()
    r = pixelate(src, PixelateOptions(max_size=60, colors=16, value_span=0.55, cluster=3, outline="dark"))
    arr = np.asarray(r.image)
    lab = rgb_to_oklab(arr[..., :3])
    lit, dark = rd.edge_cells(arr[..., 3])
    edge = lit | dark
    body = (arr[..., 3] > 0) & ~edge
    inside = rd.inside_lightness(lab[..., 0], body)
    assert np.mean(lab[..., 0][edge] < inside[edge] - 0.05) > 0.6
    assert np.mean(inside[edge] - lab[..., 0][edge]) > 0.08
    # the gap between the arm and the body is still open: a transparent column between them at mid height
    row = arr[arr.shape[0] // 2]
    runs = np.diff(np.concatenate([[0], (row[:, 3] > 0).astype(int), [0]]))
    assert (runs == 1).sum() >= 2


def test_rim_lights_the_lit_side_only():
    L = np.full((12, 12), 0.4)
    alpha = np.zeros((12, 12), np.uint8)
    alpha[3:9, 3:9] = 255
    lab = np.dstack([L, L * 0, L * 0])
    out, moved = rd.edge_lab(lab, alpha, "rim")
    assert out[3, 5, 0] > 0.45 and out[5, 3, 0] > 0.45            # top and left edges lit
    assert out[8, 5, 0] < 0.3 and out[5, 8, 0] < 0.3              # bottom and right edges dark
    assert out[5, 5, 0] == 0.4                                   # the inside untouched
    assert moved[3, 5] and not moved[5, 5]


# ------------------------------------------------------------------ 5. frames
def test_frames_stay_stable_and_palette_locked():
    frames = [_figure(seed=k, shift=k) for k in range(4)]
    opts = options_for_style("rendered_arpg")
    res = pixelate_frames(frames, opts)
    pal = {tuple(c) for c in res[0].palette.colors}
    for r in res:
        px = np.asarray(r.image)
        assert {tuple(p) for p in px[px[..., 3] > 0][:, :3]} <= pal
        assert r.image.size == res[0].image.size
    change = rd.frame_change([np.asarray(r.image) for r in res])
    # the figure only slides one source pixel a frame: most shared pixels keep their colour
    assert change["changed_fraction"] < 0.35
    assert change["mean_change"] < 0.06


# ------------------------------------------------------------------ 6. the knobs, the presets, the CLI, the api
def test_presets_carry_the_conversion_and_validate():
    for name in LOOKS:
        st = STYLES[name]
        assert not validate(st), name
        o = options_for_style(st)
        assert (o.value_span, o.local_contrast, o.detail, o.cluster) == (st.value_span, st.local_contrast, st.detail, st.cluster)
    assert STYLES["rendered_arpg"].outline == "dark" and STYLES["gothic_hd"].outline == "rim"
    assert options_for_style("snes", value_span=0.0, cluster=0).value_span == 0.0
    from dataclasses import replace
    assert validate(replace(STYLES["snes"], outline="rim")) == []
    assert validate(replace(STYLES["snes"], outline="glow"))
    assert validate(replace(STYLES["snes"], cluster=20))


def test_every_look_converts_a_figure_and_the_structured_ones_read_better():
    src = _figure()
    for name in LOOKS:
        st = STYLES[name]
        r = pixelate(src, options_for_style(st, crop=True))
        arr = np.asarray(r.image)
        assert abs(arr.shape[0] - st.figure_height) <= 4, name
        if st.value_span > 0 and st.shading_bands == 0:
            flat = pixelate(src, options_for_style(st, crop=True, value_span=0.0, local_contrast=0.0, cluster=0, detail=0.0))
            f = np.asarray(flat.image)
            sep_new = rd.value_separation(rgb_to_oklab(arr[..., :3])[..., 0], arr[..., 3])
            sep_old = rd.value_separation(rgb_to_oklab(f[..., :3])[..., 0], f[..., 3])
            assert sep_new > sep_old, (name, sep_new, sep_old)
        if st.shading_bands > 0:
            # a banded look: the body sits on at least three clearly separate lightness levels
            L = rgb_to_oklab(arr[..., :3])[..., 0][arr[..., 3] > 0]
            levels = np.unique(np.round(L, 1))
            assert len(levels) >= 3, (name, levels)


def test_cli_pixelate_takes_the_knobs(tmp_path, capsys):
    from pixelforge.cli import main

    src = tmp_path / "fig.png"
    _figure().save(src)
    out = tmp_path / "fig_px.png"
    main(["pixelate", str(src), "-o", str(out), "--style", "rendered_arpg", "--value-span", "0.6", "--local-contrast", "0.4",
          "--detail", "1.5", "--cluster", "4", "--outline", "rim", "--crop"])
    assert out.exists()
    text = capsys.readouterr().out
    assert "span 0.6" in text and "local contrast 0.4" in text


def test_api_convert_image_reports_the_measures(tmp_path):
    src = tmp_path / "fig.png"
    _figure().save(src)
    r = api.convert_image(src, tmp_path / "out" / "fig.png", "snes", preview=2, cluster=4)
    assert r["ok"] and Path(r["sprite"]).exists() and Path(r["preview"]).exists()
    assert r["colors"] <= 16 and r["value_separation"] > 0.2
    assert isinstance(r["orphans"], int)
    json.dumps(r)
    with pytest.raises(api.StepError):
        api.convert_image(tmp_path / "missing.png", tmp_path / "x.png")


def test_mcp_server_lists_pixelate_image():
    pytest.importorskip("mcp")
    from pixelforge.mcp_server import build_server

    server = build_server()
    import asyncio

    tools = {t.name for t in asyncio.run(server.list_tools())}
    assert "pixelate_image" in tools


def test_looks_without_the_conversion_sample_exactly_as_before():
    """The game's own look (godmarrow) and the older tiers have no conversion knob: their cells are the old sparse
    sample of each cell's inner part, with the alpha at the cell centre, so their sprites do not drift."""
    from pixelforge.grid import downsample
    from pixelforge.pixelate import _centre_alpha, conversion_on, frame_cells

    src = np.asarray(_figure().convert("RGBA"))
    opts = options_for_style("godmarrow")
    assert not conversion_on(opts) and conversion_on(options_for_style("snes"))
    grid = Grid(4.0, 4.0)
    cells = frame_cells(src, grid, opts)
    from pixelforge.pixelate import paint_under_edges, _bleed_passes

    legacy = downsample(paint_under_edges(src, _bleed_passes(grid)), grid, inner=0.5, samples=3)
    assert np.allclose(cells.lab, legacy)
    assert (cells.alpha == _centre_alpha(src[..., 3], grid, *legacy.shape[:2])).all()
    assert not cells.detail.any()


# ------------------------------------------------------------------ 7. the Keeper (slow, only when her files are here)
@pytest.mark.skipif(not (KEEPER / "views" / "front.png").exists(), reason="the Keeper's cutouts are not on this machine")
def test_keeper_reads_at_every_size():
    src = Image.open(KEEPER / "views" / "front.png")
    for name, eyes in (("gothic_hd", 2), ("rendered_arpg", 2), ("snes", 1)):
        st = STYLES[name]
        r = pixelate(src, options_for_style(st, crop=True))
        arr = np.asarray(r.image)
        lab = rgb_to_oklab(arr[..., :3])
        opaque = arr[..., 3] > 0
        assert abs(arr.shape[0] - st.figure_height) <= 4
        assert len(r.palette) <= st.colors
        # the eyes: saturated purple cells in the top fifth of the figure
        top = np.zeros_like(opaque)
        top[: arr.shape[0] // 5] = True
        purple = opaque & top & (np.hypot(lab[..., 1], lab[..., 2]) > 0.08) & (lab[..., 2] < 0)
        assert purple.sum() >= eyes, name
        # the value structure: dark and light clusters far apart, the shadow above black
        assert rd.value_separation(lab[..., 0], arr[..., 3]) > 0.25, name
        assert np.percentile(lab[..., 0][opaque], 10) > 0.05, name
        assert rd.orphan_count(r.indices, arr[..., 3]) <= 0.02 * opaque.sum(), name


@pytest.mark.skipif(not (KEEPER / "renders" / "walk" / "E").exists(), reason="the Keeper's renders are not on this machine")
def test_keeper_walk_does_not_flicker():
    frames = [Image.open(p) for p in sorted((KEEPER / "renders" / "walk" / "E").glob("frame_*.png"))[:6]]
    opts = options_for_style("rendered_arpg")
    opts.scale = 127.0 / 76
    res = pixelate_frames(frames, opts)
    change = rd.frame_change([np.asarray(r.image) for r in res])
    assert change["changed_fraction"] < 0.5
    assert change["mean_change"] < 0.06
