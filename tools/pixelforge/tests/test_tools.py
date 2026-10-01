"""Props, VFX, tiles, UI 9-slice and the skill-tree editor (headless)."""
import json

import numpy as np
import pytest
from PIL import Image

from pixelforge import skilltree as st
from pixelforge.props import make_prop
from pixelforge.tiles import make_tiles
from pixelforge.ui9 import detect_border, make_ui9
from pixelforge.vfx import KINDS, LOOPING, make_vfx, periodic_noise, ramp_lut


def _tex(seed, c0, c1, n=96):
    f = periodic_noise(n, n, 4, np.random.default_rng(seed))[..., None]
    return Image.fromarray((np.array(c0) * (1 - f) + np.array(c1) * f).astype(np.uint8), "RGB")


@pytest.mark.parametrize("kind", KINDS)
def test_vfx_every_kind_loops_and_exports(tmp_path, kind):
    r = make_vfx(kind, "fx", tmp_path, frames=6, atlas_dir=tmp_path / "atlas")
    im = Image.open(r["png"])
    assert im.size == (r["size"][0] * 6, r["size"][1])
    assert np.asarray(im)[..., 3].max() == 255
    atlas = json.loads((tmp_path / "atlas" / "fx.json").read_text())
    anim = "loop" if kind in LOOPING else "once"
    assert len(atlas["idx"]) == 6 and f"{anim}/down/0" in atlas["idx"]
    assert atlas["meta"]["anims"][anim]["views"] == ["down"]


def test_vfx_ramp_is_the_palette_and_noise_tiles():
    lut = ramp_lut(["#2a1206", "#fff1b0"], 4)
    assert tuple(lut[0]) == (0x2A, 0x12, 0x06) and tuple(lut[-1]) == (0xFF, 0xF1, 0xB0)
    n = periodic_noise(32, 32, 2, np.random.default_rng(0))
    assert 0.0 <= n.min() and n.max() <= 1.0
    # wrap: the field is periodic, so rolling by a full period is the identity
    assert np.allclose(np.roll(n, 32, axis=0), n)


def test_tiles_variants_transitions_and_tileset(tmp_path):
    r = make_tiles(_tex(1, (28, 44, 30), (70, 96, 52)), "grass", tmp_path, second=_tex(2, (40, 42, 48), (110, 112, 118)), variants=3, tile=(36, 18))
    assert r["tiles"] == 3 + 16
    im = np.asarray(Image.open(r["png"]))
    assert im.shape == (18, 36 * 19, 4)
    # diamond mask: corners transparent, centre opaque
    assert im[0, 0, 3] == 0 and im[9, 18, 3] == 255
    # bits 0 = all first material, 15 = all second: their centres differ
    a = im[:, 36 * 3 : 36 * 4][im[:, 36 * 3 : 36 * 4, 3] > 0][:, :3].mean(axis=0)
    b = im[:, 36 * 18 : 36 * 19][im[:, 36 * 18 : 36 * 19, 3] > 0][:, :3].mean(axis=0)
    assert b[0] - a[0] > 20 and a[1] - a[0] > 10  # second = grey stone, first = green grass
    tres = (tmp_path / "grass.tres").read_text()
    assert "TileSetAtlasSource" in tres and "18:0/0 = 0" in tres and "tile_shape = 1" in tres


def test_ui9_detects_border_and_writes_stylebox(tmp_path):
    fr = np.zeros((60, 90, 4), np.uint8)
    fr[..., :3] = (24, 20, 18)
    fr[..., 3] = 255
    for a, b, c in ((0, 6, (120, 96, 60)), (2, 4, (200, 170, 90))):
        fr[a:b, :, :3] = c; fr[-b:(-a or None), :, :3] = c; fr[:, a:b, :3] = c; fr[:, -b:(-a or None), :3] = c
    assert detect_border(fr) == (6, 6, 6, 6)
    r = make_ui9(Image.fromarray(fr, "RGBA"), "panel", tmp_path, mid=4)
    assert r["size"] == [16, 16]
    assert "texture_margin_left = 6.0" in (tmp_path / "panel.tres").read_text()


def test_prop_merges_into_game_objects(tmp_path):
    im = Image.new("RGBA", (60, 90), (255, 255, 255, 255))
    px = np.asarray(im).copy()
    px[20:85, 20:40, :3] = (60, 40, 30)
    oj = tmp_path / "art" / "objects" / "objects.json"
    r = make_prop(Image.fromarray(px, "RGBA"), "post", tmp_path / "art" / "objects", height=48, game_objects=oj, hr=2)
    data = json.loads(oj.read_text())
    assert data["post"]["png"] == "res://art/objects/post/post_v1.png" and data["post"]["hr"] == 2
    assert data["post"]["oy"] > data["post"]["ox"]  # the foot anchor sits near the bottom
    assert r["game_objects"]["added"]["post"] == data["post"]


def test_skilltree_edits_apply_and_report_clashes(tmp_path):
    (tmp_path / "data").mkdir(); (tmp_path / "tools").mkdir()
    skills = [
        {"id": "a", "class": "x", "tab": 0, "row": 1, "col": 1, "name": "A", "required_level": 1, "prerequisites": [], "prerequisite_names": [], "kind": "cast"},
        {"id": "b", "class": "x", "tab": 0, "row": 2, "col": 1, "name": "B", "required_level": 6, "prerequisites": ["a"], "prerequisite_names": ["A"], "kind": "cast"},
    ]
    sp = tmp_path / "data" / "skills.json"
    sp.write_text(json.dumps({"skills": skills}))
    r = st.save_and_apply(sp, {"a": {"name": "Alpha", "row": 3}})
    assert r["changed"] == ["a"] and r["clashes"] == []
    d = st.load(sp)
    assert d["skills"][0]["required_level"] == 12 and d["skills"][1]["prerequisite_names"] == ["Alpha"]
    r = st.save_and_apply(sp, {"a": {"row": 2}})
    assert r["clashes"] and r["clashes"][0][1:] == ("a", "b")
    assert "Alpha" in st.list_tree(d, "x")


def test_recolor_map_and_hue(tmp_path):
    from pixelforge.recolor import recolor_image, recolor_set

    im = np.zeros((4, 4, 4), np.uint8)
    im[..., :3] = (29, 74, 76)   # the wisp teal
    im[..., 3] = 255
    im[0, 0, 3] = 0
    out = recolor_image(im, mapping={"#1d4a4c": "#7a3d10"})
    assert tuple(out[1, 1, :3]) == (0x7A, 0x3D, 0x10) and out[0, 0, 3] == 0
    shifted = recolor_image(im, hue=180.0)
    assert int(shifted[1, 1, 0]) > int(im[1, 1, 0])   # teal turned warm
    # a Godmarrow set
    d = tmp_path / "sprites"; d.mkdir()
    Image.fromarray(im, "RGBA").save(d / "wisp.png")
    (d / "wisp.json").write_text(json.dumps({"sheets": ["wisp.png"], "meta": {"kind": "wisp"}, "idx": {"idle/down/0": [0, 0, 0, 4, 4, 0, 0]}}))
    r = recolor_set(d, "wisp", "@champion", hue=90.0)
    assert (d / "wisp@champion.png").exists() and json.loads((d / "wisp@champion.json").read_text())["sheets"] == ["wisp@champion.png"]


def test_icons_from_flat_lay(tmp_path):
    from pixelforge.icons import make_icons

    im = np.full((120, 180, 3), 245, np.uint8)   # pale background, three objects
    im[20:60, 20:50] = (90, 60, 30)
    im[20:100, 80:95] = (120, 120, 130)          # a tall one -> 1x3
    im[70:105, 120:160] = (40, 80, 70)
    r = make_icons(Image.fromarray(im), tmp_path, ["pouch", "staff:1x3", "hood"])
    assert r["found"] == 3 and set(r["icons"]) == {"pouch", "staff", "hood"}
    assert Image.open(tmp_path / "staff@1x.png").size == (12, 36) and Image.open(tmp_path / "staff.png").size == (48, 144)
    assert Image.open(tmp_path / "hood@1x.png").size == (12, 12)
    data = json.loads((tmp_path / "icons.json").read_text())
    assert data["icons"]["staff"]["grid"] == [1, 3] and data["cell_px"] == 48
