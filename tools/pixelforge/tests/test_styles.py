"""The look presets: the table, one pixelate run per preset, the wiring through api / vfx / tiles / CLI, the demo."""
import json

import numpy as np
import pytest
from PIL import Image

from pixelforge import api, styles
from pixelforge.color import rgb_to_oklab
from pixelforge.cleanup import majority_filter
from pixelforge.pixelate import PixelateOptions, _clip_cells, clip_lightness_reference, lightness_reference, pixelate, pixelate_frames
from pixelforge.project import Project
from pixelforge.styles import FIELDS, LOOKS, STYLES, Style, describe_style, get_style, options_for_style, style_table, validate

REQUIRED = {
    "name", "title", "description", "group", "figure_height", "pixel_step", "colors", "palette_lock", "dither",
    "dither_strength", "shading_bands", "saturation", "contrast", "lightness", "outline", "outline_diagonal", "edge",
    "clean", "fx_bands", "fx_glow", "fx_haze", "fx_frames", "fx_fps", "anim_frames", "anim_fps", "clip_frames",
    "tile_width", "tile_height", "tile_hr",
}


def _painting(seed=0, w=160, h=300):
    """A soft 'painting' of a figure: a dark robe with a lighter hood, a pale sash and a tiny bright accent, on
    transparency, with smooth shading so there is something for bands and grades to work on."""
    rng = np.random.default_rng(seed)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    cx = w / 2
    body = (np.abs(xs - cx) < (18 + 40 * (ys / h) ** 1.5)) & (ys > 30)
    hood = ((xs - cx) ** 2 + (ys - 27) ** 2) < 27 ** 2
    mask = body | hood   # fills the canvas top to bottom, as a tight cutout does
    shade = 0.35 + 0.45 * (1 - np.abs(xs - cx) / 60).clip(0, 1) * (0.6 + 0.4 * np.sin(ys / 23))
    rgb = np.zeros((h, w, 3), np.float32)
    rgb[..., 0] = 70 * shade + 12
    rgb[..., 1] = 48 * shade + 10
    rgb[..., 2] = 92 * shade + 20
    sash = body & (np.abs(ys - 150 - (xs - cx) * 0.4) < 6)
    rgb[sash] = (200 * shade[sash][:, None] + 40) * np.array([1.0, 0.92, 0.72])
    accent = ((xs - cx - 6) ** 2 + (ys - 26) ** 2) < 3 ** 2
    rgb[accent] = (230, 250, 240)
    rgb += rng.normal(0, 3, rgb.shape)
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = np.clip(rgb, 0, 255)
    rgba[..., 3] = mask * 255
    return Image.fromarray(rgba, "RGBA")


# ------------------------------------------------------------------ the table
REQUIRED = REQUIRED | {"form_light", "creases", "ink", "rim"}       # the light and ink of the solid renderer (3.2)


def test_every_preset_has_every_key_and_sane_numbers():
    assert set(FIELDS) == REQUIRED
    for name, st in STYLES.items():
        assert st.name == name
        assert not validate(st), (name, validate(st))
        d = st.as_dict()
        assert REQUIRED <= set(d) and "summary" in d
        json.dumps(d)   # JSON-serialisable
    assert set(LOOKS) == {"godmarrow", "gothic_hd", "rendered_arpg", "snes", "handheld", "indie", "painterly"}
    assert style_table()[0]["name"] == "godmarrow" and all(r["group"] == "tier" for r in style_table()[len(LOOKS):])


def test_the_looks_are_what_they_say():
    g = STYLES["godmarrow"]
    assert g.figure_height == 195 and g.colors == 0 and g.outline == "auto" and g.clip_frames == 24 and g.tile == (72, 36)
    assert 100 <= STYLES["gothic_hd"].figure_height <= 140 and 32 <= STYLES["gothic_hd"].colors <= 48 and STYLES["gothic_hd"].outline == "none"
    assert 70 <= STYLES["rendered_arpg"].figure_height <= 80 and 24 <= STYLES["rendered_arpg"].colors <= 32
    s = STYLES["snes"]
    assert 48 <= s.figure_height <= 64 and s.colors == 16 and s.outline == "auto" and s.shading_bands == 3 and 8 <= s.anim_frames <= 12 and s.fx_glow == "off"
    assert 32 <= STYLES["handheld"].figure_height <= 48 and STYLES["handheld"].colors <= 16 and STYLES["handheld"].saturation > 1
    i = STYLES["indie"]
    assert 64 <= i.figure_height <= 96 and i.saturation > 1 and i.anim_frames == 12
    assert STYLES["painterly"].figure_height >= 128 and STYLES["painterly"].colors >= 64
    # tiers still answer to their old names with their old numbers
    assert STYLES["16bit"].max_size == 128 and STYLES["16bit"].colors == 32 and STYLES["8bit"].max_size == 64


def test_validate_catches_bad_numbers_and_get_style_rejects_unknown():
    bad = Style("x", "x", "x", figure_height=4, colors=999, dither="plaid", outline="red", edge="fuzzy", tile_width=50, tile_height=30, clean=9)
    problems = validate(bad)
    assert len(problems) >= 7 and any("clean" in b for b in problems)
    assert any("clean needs a palette" in b for b in validate(Style("y", "y", "y", colors=0, clean=1)))
    with pytest.raises(ValueError):
        get_style("no_such_look")
    assert get_style(STYLES["snes"]) is STYLES["snes"]
    assert "SNES" in describe_style("snes") and "16 colours" in describe_style("snes")


def test_options_for_style_carries_every_number_and_overrides_win():
    o = options_for_style("snes")
    assert isinstance(o, PixelateOptions)
    assert o.max_size == 56 and o.colors == 16 and o.outline == "auto" and o.bands == 3 and o.edge == "soft" and o.clean == 1
    assert o.saturation == pytest.approx(1.15) and o.contrast == pytest.approx(1.3)
    assert options_for_style("gothic_hd").outline is None and options_for_style("gothic_hd").clean == 0
    o = options_for_style("snes", outline=None, colors=8, crop=True)
    assert o.outline is None and o.colors == 8 and o.crop
    assert options_for_style("gothic_hd", outline="auto").outline == "auto"


# ------------------------------------------------------------------ one pixelate run per preset
@pytest.mark.parametrize("name", LOOKS)
def test_pixelate_every_look_on_a_synthetic_painting(name):
    st = STYLES[name]
    r = pixelate(_painting(), options_for_style(st, crop=True))
    im = np.asarray(r.image)
    pad = 2 if st.outline != "none" else 0
    # the figure stands the preset's height (the outline adds a pixel each side; the crop keeps a 1 px margin)
    assert abs(im.shape[0] - st.figure_height) <= pad + 2, (name, im.shape)
    opaque = im[im[..., 3] > 0][:, :3]
    uniq = np.unique(opaque, axis=0)
    if st.colors > 0:
        assert len(uniq) <= st.colors + (1 if st.outline not in ("none", "auto") else 0)
    else:
        assert len(uniq) > 200   # every colour kept
    if st.shading_bands > 0:
        # the flattened lightness: the body falls on very few lightness levels (the outline and the accent add a couple)
        L = np.round(rgb_to_oklab(uniq)[:, 0], 2)
        assert len(np.unique(L)) <= st.shading_bands + 4, (name, sorted(np.unique(L)))
    if st.outline == "auto":
        # the darkest palette colour wraps the figure: the pixel right of the leftmost opaque pixel of the middle row
        row = im[im.shape[0] // 2]
        xs = np.nonzero(row[:, 3])[0]
        darkest = r.palette.colors[np.argmin(rgb_to_oklab(r.palette.colors)[:, 0])]
        assert (row[xs[0], :3] == darkest).all()
    assert r.notes and any("graded" in n or "full colour" in n or "resampling" in n for n in r.notes)


def test_grade_is_stable_across_frames_and_adds_no_colour_outside_the_palette():
    frames = [_painting(seed=k) for k in range(3)]
    res = pixelate_frames(frames, options_for_style("snes"))
    assert len(res) == 3
    pal = {tuple(c) for c in res[0].palette.colors}
    for r in res:
        px = np.asarray(r.image)
        assert {tuple(p) for p in px[px[..., 3] > 0][:, :3]} <= pal
        assert r.image.size == res[0].image.size
    # one lightness reference for the clip (the anchors do not drift frame to frame)
    heights = [np.asarray(r.image).shape[0] for r in res]
    assert len(set(heights)) == 1


def test_majority_filter_joins_specks_to_their_area_and_keeps_lines_and_borders():
    idx = np.zeros((12, 12), dtype=np.int32)
    idx[:, 6:] = 1            # two flat areas with a border down the middle
    idx[3, 3] = 2             # a speck in the left area
    idx[8, 9] = 0             # a speck of the left colour in the right area
    idx[5, :] = 3             # a 1 px line across both
    idx[10, 1:3] = 4          # a pair of specks
    idx[1:3, 8:10] = 5        # a 2x2 block
    alpha = np.full((12, 12), 255, np.uint8)
    out = majority_filter(idx, alpha, passes=1)
    assert out[3, 3] == 0 and out[8, 9] == 1 and (out[10, 1:3] == 0).all()   # specks and a pair take the area's colour
    assert (out[5, :] == 3).all() and (out[1:3, 8:10] == 5).all()            # the line and the block survive
    assert set(np.unique(out[:, :6])) == {0, 3} and set(np.unique(out[:, 6:])) == {1, 3, 5}   # the border is where it was
    assert set(np.unique(out)) <= set(np.unique(idx))              # no new index
    # through pixelate: the clean pass moves nothing outside the palette and leaves the size alone
    a = pixelate(_painting(), options_for_style("snes", crop=True, clean=0))
    b = pixelate(_painting(), options_for_style("snes", crop=True, clean=1))
    assert a.image.size == b.image.size
    pb = np.asarray(b.image)
    assert {tuple(p) for p in pb[pb[..., 3] > 0][:, :3]} <= {tuple(c) for c in b.palette.colors}


def test_one_lightness_reference_for_every_clip_of_a_character(project, monkeypatch):
    bright = [_painting(seed=k) for k in range(2)]
    dark = []
    for f in bright:
        d = Image.eval(f.convert("RGB"), lambda v: v // 2).convert("RGBA")
        d.putalpha(f.getchannel("A"))
        dark.append(d)
    opts = options_for_style("snes")
    both = clip_lightness_reference([bright, dark], opts)
    _, _, lb, mb = _clip_cells(bright, opts)
    _, _, ld, md = _clip_cells(dark, opts)
    only_bright, only_dark = lightness_reference(lb, mb), lightness_reference(ld, md)
    assert only_dark[0] < both[0] < only_bright[0]          # one anchor between the two clips, not each its own
    # pixelate_renders measures it once and hands the same anchors to every clip
    api.set_style(project, "snes", "hero")
    renders = project.sub("hero", "renders")
    manifest = {"directions": ["S"], "size": 128, "fps": 12, "actions": {"idle": {"frames": 3}, "walk": {"frames": 3}}, "ppu": 60.0, "elevation": 30.0, "z_min": 0.0, "z_max": 1.8}
    (renders / "manifest.json").write_text(json.dumps(manifest))
    for action, fig in (("idle", bright[0]), ("walk", dark[0])):
        out = renders / action / "S"
        out.mkdir(parents=True, exist_ok=True)
        for i in range(3):
            frame = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
            frame.paste(fig.resize((40, 76), Image.LANCZOS), (44 + i, 26))
            frame.save(out / f"frame_{i:03d}.png")
    seen = []
    real = api.pixelate_frames

    def spy(frames, opts, **kw):
        seen.append(opts.grade_ref)
        return real(frames, opts, **kw)

    monkeypatch.setattr(api, "pixelate_frames", spy)
    r = api.pixelate_renders(project, "hero")
    assert r["clips"] == {"idle_S": 3, "walk_S": 3}
    assert len(seen) == 2 and seen[0] is not None and seen[0] == seen[1]
    s = api.status(project)["characters"]
    assert s["hero"]["style"] == "snes" and s["hero"]["own_style"] and s["imp"]["style"] == "rendered_arpg" and not s["imp"]["own_style"]


def test_saturation_and_contrast_move_the_colours_the_right_way():
    src = _painting()
    flat = pixelate(src, PixelateOptions(colors=0, max_size=120, crop=True))
    vivid = pixelate(src, PixelateOptions(colors=0, max_size=120, crop=True, saturation=1.6, contrast=1.4, lightness=0.1))
    a, b = (np.asarray(x.image) for x in (flat, vivid))
    la, lb = rgb_to_oklab(a[a[..., 3] > 0][:, :3]), rgb_to_oklab(b[b[..., 3] > 0][:, :3])
    assert np.hypot(lb[:, 1], lb[:, 2]).mean() > np.hypot(la[:, 1], la[:, 2]).mean() * 1.2
    assert lb[:, 0].std() > la[:, 0].std() * 1.15
    assert lb[:, 0].mean() > la[:, 0].mean() + 0.05


# ------------------------------------------------------------------ the wiring
@pytest.fixture
def project(tmp_path):
    api.new_project(tmp_path / "game", "Game", "rendered_arpg")
    p = Project.load(tmp_path / "game")
    api.add_character(p, "hero", "a hooded figure")
    api.add_character(p, "imp", "a small thing")
    _painting().save(tmp_path / "front.png")
    api.import_source(p, "hero", "front", tmp_path / "front.png")
    api.import_source(p, "imp", "front", tmp_path / "front.png")
    return Project.load(tmp_path / "game")


def test_set_style_project_and_per_character(project):
    r = api.list_styles()
    assert r["ok"] and r["looks"] == LOOKS and len(r["styles"]) == len(STYLES)
    r = api.set_style(project, "snes")
    assert r["ok"] and r["scope"] == "project" and r["style"]["name"] == "snes"
    assert Project.load(project.root).style == "snes"
    r = api.set_style(project, "handheld", "imp")
    assert r["scope"] == "character" and r["style"]["figure_height"] == 40
    p = Project.load(project.root)
    assert p.characters["imp"].settings["style"] == "handheld" and "style" not in p.characters["hero"].settings
    assert api.style_of(p, "imp").name == "handheld" and api.style_of(p, "hero").name == "snes"
    r = api.set_style(p, "project", "imp")
    assert r["style"]["name"] == "snes" and "style" not in Project.load(p.root).characters["imp"].settings
    with pytest.raises(ValueError):
        api.set_style(p, "no_such_look")


def test_still_path_reads_its_numbers_from_the_look(project, tmp_path):
    api.set_style(project, "snes", "hero")
    front = project.sub("hero", "views") / "front.png"
    _painting().save(front)
    r = api.pixelate_still(project, "hero", "front")
    assert r["style"] == "snes" and r["colors"] <= 16
    assert abs(Image.open(r["sprite"]).height - 56) <= 4
    r = api.animate_still(project, "hero", "front", ["idle"])
    assert r["count"] == STYLES["snes"].anim_frames and r["fps"] == STYLES["snes"].anim_fps
    r = api.animate_still(project, "hero", "front", ["idle"], frames=4, fps=3)
    assert r["count"] == 4 and r["fps"] == 3
    # the project's own look applies to the other character
    _painting().save(project.sub("imp", "views") / "front.png")
    r = api.pixelate_still(project, "imp", "front")
    assert r["style"] == "rendered_arpg" and abs(Image.open(r["sprite"]).height - 76) <= 4


def test_game_export_caps_clips_at_the_looks_frame_count(project):
    api.set_style(project, "handheld", "hero")   # clip_frames 8
    renders = project.sub("hero", "renders")
    manifest = {"directions": ["S", "E"], "size": 128, "fps": 24, "actions": {"walk": {"frames": 12}}, "ppu": 60.0, "elevation": 30.0, "z_mid": 0.9, "z_min": 0.0, "z_max": 1.8}
    (renders / "manifest.json").write_text(json.dumps(manifest))
    fig = _painting(w=60, h=110)
    for d in manifest["directions"]:
        for i in range(12):
            out = renders / "walk" / d
            out.mkdir(parents=True, exist_ok=True)
            frame = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
            frame.paste(fig.resize((40, 76), Image.LANCZOS), (44 + (i % 3), 26))
            frame.save(out / f"frame_{i:03d}.png")
    r = api.pixelate_renders(project, "hero")
    assert r["clips"] == {"walk_S": 12, "walk_E": 12}
    first = np.asarray(Image.open(project.sub("hero", "frames") / "walk_S" / "frame_000.png"))
    assert len(np.unique(first[first[..., 3] > 0][:, :3], axis=0)) <= 15
    r = api.export_game(project, "hero", kind="hero_test")
    meta = json.loads(open(r["color"]["json"]).read())["meta"]
    assert meta["anims"]["walk"]["frames"] == 8 and meta["style"] == "handheld" and meta["pixel_step"] == 4


def test_effects_and_tiles_take_the_look(tmp_path):
    from pixelforge.tiles import make_tiles
    from pixelforge.vfx import make_vfx, render_frames

    r = make_vfx("wisp", "w", tmp_path, style="snes")
    meta = json.loads(open(r["json"]).read())
    assert meta["bands"] == 4 and meta["glow"] is False and meta["frames"] == 8 and meta["fps"] == 10.0 and meta["style"] == "snes"
    r = make_vfx("wisp", "p", tmp_path, style="painterly")
    meta = json.loads(open(r["json"]).read())
    assert meta["bands"] == 10 and meta["glow"] is True and meta["haze"] is True and meta["frames"] == 12
    sheet = np.asarray(Image.open(r["png"]))
    assert ((sheet[..., 3] > 0) & (sheet[..., 3] < 120)).any()   # the haze: soft alpha outside the halo
    r = make_vfx("wisp", "x", tmp_path, style="painterly", frames=5, bands=3, haze=False)
    meta = json.loads(open(r["json"]).read())
    assert meta["frames"] == 5 and meta["bands"] == 3 and meta["haze"] is False   # explicit arguments win
    seq, info = render_frames("fire", frames=4, bands=5)
    assert len(seq) == 4 and info["bands"] == 5 and info["size"] == (32, 48)
    tex = Image.fromarray(np.random.default_rng(0).integers(40, 120, (96, 96, 3)).astype(np.uint8), "RGB")
    r = make_tiles(tex, "ground", tmp_path / "tiles", style="handheld", variants=2)
    assert r["tile"] == [48, 24]
    meta = json.loads(open(r["json"]).read())
    assert meta["hr"] == 1 and meta["style"] == "handheld"
    r = make_tiles(tex, "ground2", tmp_path / "tiles", variants=2)
    assert r["tile"] == [72, 36] and json.loads(open(r["json"]).read())["hr"] == 2


def test_cli_styles_lists_and_sets(tmp_path, capsys):
    from pixelforge.cli import main

    main(["styles"])
    out = capsys.readouterr().out
    assert "SNES 16-bit" in out and "Gothic hi-res" in out and "ground tile" in out
    _painting().save(tmp_path / "src.png")
    main(["pixelate", str(tmp_path / "src.png"), "-o", str(tmp_path / "clean0.png"), "--style", "snes", "--clean", "0", "--crop"])
    capsys.readouterr()
    assert (tmp_path / "clean0.png").exists()
    main(["styles", "--json"])
    data = json.loads(capsys.readouterr().out)
    assert data["looks"] == LOOKS and data["styles"][0]["name"] == "godmarrow"
    main(["project", "new", str(tmp_path / "p"), "--style", "indie", "--json"])
    capsys.readouterr()
    main(["project", "add", "hero", "--project", str(tmp_path / "p"), "--json"])
    capsys.readouterr()
    main(["project", "set", "--project", str(tmp_path / "p"), "--style", "snes", "--character", "hero", "--json"])
    r = json.loads(capsys.readouterr().out)
    assert r["scope"] == "character" and r["style"]["name"] == "snes"
    assert Project.load(tmp_path / "p").characters["hero"].settings["style"] == "snes"


def test_style_demo_writes_a_gif_per_look_and_the_sheet(tmp_path):
    from pixelforge.style_demo import SOURCE, make_demo

    assert SOURCE.exists()   # the bundled Keeper front cutout
    _painting().save(tmp_path / "src.png")
    r = make_demo(tmp_path / "demo", source=tmp_path / "src.png", only=["snes", "painterly"], effect="wisp")
    assert set(r["gifs"]) == {"snes", "painterly"}
    for name, gif in r["gifs"].items():
        im = Image.open(gif)
        st = STYLES[name]
        assert im.n_frames == st.anim_frames
        assert im.height >= 96
    table = json.loads((tmp_path / "demo" / "styles.json").read_text())
    assert table["snes"]["gif"] == "snes.gif" and table["snes"]["figure_height"] == 56 and table["snes"]["effect"]["bands"] == 4
    sheet = Image.open(r["sheet"])
    assert sheet.width > 200 and sheet.height > 120
