"""Part-id masks: every rendered frame gets ``frame_NNN.parts.png`` (the part index per pixel, 0 = empty) and the
manifest the part table the indices refer to (what the editor's carry matches by)."""
import json

import numpy as np
import pytest
from PIL import Image

from pixelforge import shape_rig as R
from pixelforge import shape_tools as T
from pixelforge import shapes as S

ASSETS = S.ASSETS


@pytest.fixture(scope="module")
def keeper():
    return S.load_shapes(ASSETS / "characters" / "keeper.shapes.json")


@pytest.fixture(scope="module")
def rendered(keeper, tmp_path_factory):
    out = tmp_path_factory.mktemp("parts") / "frames"
    r = T.render_set(keeper, out, clips=["idle"], directions=["S", "E"], style="rendered_arpg", max_frames=3)
    return out, r


def test_part_table_names_parts_and_lone_shapes(keeper):
    table, lut = S.part_table(keeper)
    names = [p["name"] for p in table]
    assert names[0] == "hat" and len(set(names)) == len(names)
    hat = table[0]
    assert hat == {"index": 1, "name": "hat", "group": "head", "material": "straw", "shapes": [0, 1]}
    assert len(table) == len(keeper["parts"]) + sum(1 for s in keeper["shapes"] if not s.get("part"))
    assert lut[0] == 0 and lut[1] == 1 and lut[2] == 1                 # lut[shape + 1]: both hat shapes are part 1
    head = next(p for p in table if p["name"] == "head")
    assert head["group"] == "head" and lut[head["shapes"][0] + 1] == head["index"]
    for p in table:                                                   # every entry is JSON-plain
        json.dumps(p)


def test_every_frame_has_a_parts_mask_whose_values_map_to_the_table(rendered):
    out, r = rendered
    manifest = json.loads((out / "manifest.json").read_text())
    table = manifest["parts"]
    assert r["parts"] == len(table) and [p["index"] for p in table] == list(range(1, len(table) + 1))
    for key, n in r["frames"].items():
        for i in range(n):
            png = out / key / f"frame_{i:03d}.png"
            mask = out / key / f"frame_{i:03d}.parts.png"
            assert mask.exists(), mask
            im = Image.open(mask)
            assert im.mode == "P" and im.info.get("transparency") == 0, "a paletted PNG with index 0 transparent"
            a = T.load_parts(mask)
            rgba = np.asarray(Image.open(png))
            assert a.shape == rgba.shape[:2] and a.dtype == np.uint16
            assert set(np.unique(a).tolist()) <= set(range(len(table) + 1))
            assert (a[rgba[..., 3] == 0] == 0).all(), "empty pixels are 0"
            body = rgba[..., 3] > 0
            assert (a[body] > 0).mean() > 0.95, "the figure (shadow and glow aside) is covered"
            # the editor's view: palette entry i is grey level i, so r8 == index and alpha marks a part
            view = np.asarray(im.convert("RGBA"))
            assert np.array_equal(view[..., 0], a) and (view[a == 0, 3] == 0).all() and (view[a > 0, 3] == 255).all()


def test_a_pixel_inside_the_hat_maps_to_the_hat_part(rendered, keeper):
    out, _ = rendered
    table = json.loads((out / "manifest.json").read_text())["parts"]
    hat = next(p for p in table if p["name"] == "hat")
    a = T.load_parts(out / "idle_S" / "frame_000.parts.png")
    rows = np.nonzero(a == hat["index"])[0]
    assert len(rows) > 50
    # the hat is the highest part of the figure: the top painted rows belong to it, and nothing else does above the brim
    top = int(np.nonzero(a > 0)[0].min())
    assert set(np.unique(a[top:top + 3]).tolist()) <= {0, hat["index"]}
    y = int(np.median(rows)); xs = np.nonzero(a[y] == hat["index"])[0]; x = int(xs[len(xs) // 2])
    assert a[y, x] == hat["index"] and table[a[y, x] - 1]["material"] == "straw"
    assert table[a[y + 1, x] - 1]["name"] in ("hat", "head"), "the pixel under the brim is the hat or the head"
    # the shapes the index names are the hat shapes of the file
    assert [keeper["shapes"][i]["part"] for i in hat["shapes"]] == ["hat", "hat"]


def test_outline_pixels_take_the_part_beside_them(keeper):
    doc = dict(keeper); doc.pop("shadow", None); doc.pop("effects", None)
    fr = S.render_still(doc, scale=0.5, outline="auto")
    outline = (fr.rgba[..., 3] > 0) & (fr.pid < 0)
    assert outline.sum() > 100, "the outline ring: painted pixels no shape owns"
    assert (fr.parts[outline] > 0).all(), "every outline pixel carries the part beside it"
    assert fr.parts.dtype == np.uint16 and fr.parts.shape == fr.rgba.shape[:2]
    assert 0 < fr.parts.max() <= len(S.part_table(keeper)[0])


def test_manifest_round_trips_and_frame_counts_ignore_the_masks(rendered):
    out, r = rendered
    manifest = json.loads((out / "manifest.json").read_text())
    again = json.loads(json.dumps(manifest))
    assert again["parts"] == manifest["parts"] == S.part_table(S.load_shapes(ASSETS / "characters" / "keeper.shapes.json"))[0]
    # the readers of the frames layout count frames, not masks
    assert len(sorted((out / "idle_S").glob("frame_[0-9][0-9][0-9].png"))) == r["frames"]["idle_S"] == 3
    from pixelforge.godmarrow_export import export_godmarrow
    g = export_godmarrow(out, manifest, out.parent / "game", "keeper_parts", max_frames=16)
    assert (out.parent / "game" / "keeper_parts.png").exists()
    assert g["color"]["anims"]["idle"]["frames"] == 3 and g["color"]["frames"] == 6, "3 frames x 2 views: the masks were not counted as frames"


def test_no_parts_leaves_the_folder_clean(keeper, tmp_path):
    out = tmp_path / "frames"
    r = T.render_set(keeper, out, clips=["idle"], directions=["S"], style="rendered_arpg", max_frames=2, parts=False)
    assert r["parts"] == 0 and not list(out.glob("*/*.parts.png"))
    assert "parts" not in json.loads((out / "manifest.json").read_text())


def test_still_and_turntable_write_the_masks(keeper, tmp_path):
    r = T.still(keeper, tmp_path / "k.png", scale=0.5, zoom=2)
    mask = tmp_path / "k.parts.png"
    assert r["parts"] == str(mask) and r["part_table"][0]["name"] == "hat"
    a = T.load_parts(mask)
    assert a.shape == tuple(Image.open(tmp_path / "k.png").size[::-1]), "the mask is zoomed with the picture"
    assert a.max() >= 1 and np.array_equal(a[::2, ::2], a[1::2, 1::2]), "zoom repeats pixels"
    r2 = T.still(keeper, tmp_path / "k2.png", scale=0.5, parts=False)
    assert "parts" not in r2 and not (tmp_path / "k2.parts.png").exists()
    chest = S.load_shapes(ASSETS / "objects" / "chest.shapes.json")
    t = T.turntable(chest, tmp_path / "turn.gif", frames=4, scale=0.5, zoom=1)
    pdir = tmp_path / "turn_parts"
    assert t["parts"] == str(pdir) and len(list(pdir.glob("frame_*.parts.png"))) == 4 and len(list(pdir.glob("view_*.parts.png"))) == 8
    table = json.loads((pdir / "manifest.json").read_text())["parts"]
    assert table == S.part_table(chest)[0] and T.load_parts(pdir / "view_S.parts.png").max() <= len(table)


def test_the_flat_path_writes_parts_too(tmp_path):
    necro = S.load_shapes(ASSETS / "characters" / "necromancer.shapes.json") if (ASSETS / "characters" / "necromancer.shapes.json").exists() else None
    if necro is None:
        necro = next((S.load_shapes(p) for p in ASSETS.glob("**/*.shapes.json") if S.mode_of(S.load_shapes(p)) == "flat"), None)
    if necro is None:
        pytest.skip("no flat file shipped")
    fr = S.render_flat(necro, 0)
    table, lut = S.part_table(necro)
    assert fr.parts is not None and fr.parts.max() <= len(table) and (fr.parts[fr.rgba[..., 3] == 0] == 0).all()
    res = R.render_clip(necro, "idle", "S", max_frames=2)
    assert len(res["parts"]) == 2 and res["parts"][0].shape == res["frames"][0].shape[:2]


def test_cli_no_parts_flag(tmp_path, capsys):
    from pixelforge.cli import main
    f = str(ASSETS / "characters" / "keeper.shapes.json")
    main(["shapes", "render", f, "-o", str(tmp_path / "a"), "--clips", "idle", "--directions", "S", "--frames", "2", "--style", "rendered_arpg", "--json"])
    assert (tmp_path / "a" / "idle_S" / "frame_001.parts.png").exists()
    main(["shapes", "render", f, "-o", str(tmp_path / "b"), "--clips", "idle", "--directions", "S", "--frames", "2", "--style", "rendered_arpg", "--no-parts", "--json"])
    assert not list((tmp_path / "b").glob("*/*.parts.png"))
    main(["shapes", "still", f, "-o", str(tmp_path / "s.png"), "--scale", "0.5", "--no-parts"])
    assert (tmp_path / "s.png").exists() and not (tmp_path / "s.parts.png").exists()
    capsys.readouterr()
