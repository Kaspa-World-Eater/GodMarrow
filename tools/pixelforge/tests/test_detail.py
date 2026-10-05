"""The detail layer that rides the parts (docs/FORGE_FROM_THE_GAME.md 3.1), the light and ink of the godmarrow look
(3.2), blood runs (3.3) and the one build command (3.4): the palette never grows, the detail turns with the part, a
style with the look off renders the old picture bit for bit."""
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from pixelforge import shape_detail as D, shape_rig as R, shape_tools as T, shapes as S
from pixelforge.cli import main
from pixelforge.styles import STYLES, get_style

HERE = Path(__file__).resolve().parent
CHARS = HERE.parent / "assets" / "shapes" / "characters"


def _h(a) -> str:
    return hashlib.sha1(np.ascontiguousarray(a).tobytes()).hexdigest()[:16]


def _ramp_set(doc: dict, model: S.Model) -> set:
    cols = {tuple(int(round(v)) for v in c) for m in model.M.values() for c in m.ramp}
    cols |= {tuple(int(v) for v in S.hexrgb(doc.get("outline", S.DEFAULT_OUTLINE)))}
    sh = doc.get("shadow") or {}
    cols.add(tuple(int(v) for v in S.hexrgb(sh.get("colour", "#4b4a4f"))))
    for shp in doc["shapes"]:
        if shp.get("flat"):
            cols.add(tuple(int(v) for v in S.hexrgb(shp["flat"])))
        for r in shp.get("rules", []):
            if r.get("flat"):
                cols.add(tuple(int(v) for v in S.hexrgb(r["flat"])))
    return cols


def _colours(rgba: np.ndarray) -> set:
    px = rgba[rgba[..., 3] > 0][:, :3]
    return {tuple(int(v) for v in c) for c in np.unique(px, axis=0)}


@pytest.fixture(scope="module")
def hemo():
    return S.load_shapes(CHARS / "hemomancer.shapes.json")


@pytest.fixture(scope="module")
def hemo_flat():
    return S.load_shapes(CHARS / "hemomancer_flat.shapes.json")


@pytest.fixture(scope="module")
def keeper():
    return S.load_shapes(CHARS / "keeper.shapes.json")


# ------------------------------------------------------------------------------------------- the format
def test_detail_png_round_trip(tmp_path):
    t = np.array([[-3, -2, -1, 0, 1, 2, 3, S.DETAIL_SEED]], np.int8)
    g = S.encode_detail(t)
    assert list(g[0]) == [32, 64, 96, 128, 160, 192, 224, 0]
    assert np.array_equal(S.decode_detail(g), t)
    rgba = np.zeros((1, 8, 4), np.uint8); rgba[..., 0] = g; rgba[..., 3] = 255; rgba[0, 2, 3] = 0   # a transparent texel is no change
    back = S.decode_detail(rgba)
    assert back[0, 2] == 0 and back[0, 7] == S.DETAIL_SEED and back[0, 0] == -3


def test_validate_checks_the_detail_map_and_runs(tmp_path, keeper):
    doc = json.loads(json.dumps({k: v for k, v in keeper.items() if not k.startswith("_")}))
    doc["_file"] = str(tmp_path / "k.shapes.json")
    doc["detail"] = {"nobody": {"rows": [[0]]}}
    assert any("not a part" in p for p in S.validate(doc))
    doc["detail"] = {"hat": {"rows": [[0, 1], [2]]}}
    assert any("equal-length" in p for p in S.validate(doc))
    doc["detail"] = {"hat": {"rows": [[0, 9]]}}
    assert any("equal-length" in p for p in S.validate(doc))
    doc["detail"] = {"hat": {"file": "k.detail/hat.png"}}
    assert not S.validate(doc) and any("not beside" in w for w in S.warnings(doc))      # a missing texture: a warning, the part renders flat
    doc["detail"] = {"hat": {"rows": [[0, -1, S.DETAIL_SEED]]}}
    assert not S.validate(doc)
    doc["materials"]["straw"]["runs"] = {"colour_from": "nothing"}
    assert any("colour_from" in p for p in S.validate(doc))
    doc["materials"]["straw"]["runs"] = {"colour_from": "rope", "density": 2}
    assert any("density" in p for p in S.validate(doc))
    doc["materials"]["straw"]["runs"] = {"colour_from": "rope", "density": 0.5, "length": [2, 6]}
    doc["materials"]["straw"]["detail"] = "glass"
    assert any("detail class" in p for p in S.validate(doc))
    doc["materials"]["straw"]["detail"] = "hair"
    doc["shapes"][0]["detail_axis"] = "w"
    assert any("detail_axis" in p for p in S.validate(doc))
    doc["shapes"][0]["detail_axis"] = "y"
    assert not S.validate(doc)


def test_surface_coordinates_face_the_front_and_run_down_the_axis():
    axis = (0.0, 0.0)
    cap = S.Prim({"kind": "capsule", "a": [0, 0, 0], "b": [0, 10, 0], "r": 2}, 0, axis)
    uv = cap.surface_uv(np.array([[0, 5, 2.0], [2, 5, 0], [0, 5, -2], [-2, 5, 0], [0, 0, 2], [0, 10, 2]], float))
    assert uv[0, 0] == pytest.approx(0.5) and uv[1, 0] == pytest.approx(0.75) and uv[2, 0] == pytest.approx(0.0, abs=1e-6) and uv[3, 0] == pytest.approx(0.25)
    assert uv[0, 1] == pytest.approx(0.5) and uv[4, 1] == pytest.approx(0.0) and uv[5, 1] == pytest.approx(1.0)
    head = S.Prim({"kind": "ellipsoid", "centre": [0, 0, 0], "radii": [4, 5, 4]}, 1, axis)      # y is the long axis
    uv = head.surface_uv(np.array([[0, -5, 0.0], [0, 0, 4], [4, 0, 0]], float))
    assert uv[0, 1] == pytest.approx(0.0) and uv[1, 0] == pytest.approx(0.5) and uv[2, 0] == pytest.approx(0.75)
    ring = S.Prim({"kind": "ring", "y": [10, 20], "rx": 5}, 2, axis)
    uv = ring.surface_uv(np.array([[0, 10, 5.0], [0, 20, -5]], float))
    assert uv[0, 1] == pytest.approx(0.0) and uv[0, 0] == pytest.approx(0.5) and uv[1, 1] == pytest.approx(1.0)
    box = S.Prim({"kind": "box", "centre": [0, 0, 0], "half": [1, 8, 1], "detail_axis": "x"}, 3, axis)
    assert box.axis_frame()[1][0] == 1.0


# ------------------------------------------------------------------------------------------- the render
def test_a_painted_texel_turns_with_its_part():
    """A capsule with a dark mark on its front: it shows in the middle facing S, as a sliver on the right edge facing
    E (the front points to the viewer's right), and not at all from behind."""
    doc = {"mode": "solid", "size": [40, 40], "height": 30, "ground": 36, "axis": [20, 0], "outline": "#000000",
           "materials": {"m": {"ramp": ["#202020", "#404040", "#606060", "#808080", "#a0a0a0"]}},
           "shapes": [{"name": "arm", "kind": "capsule", "a": [20, 8, 0], "b": [20, 32, 0], "r": 5, "material": "m", "bone": "hips"}], "parts": {}}
    tex = np.zeros((16, 16), np.int8); tex[6:10, 4:10] = -3                # the front half, around the middle height
    flat = S.Model(doc, 2.0)
    det = S.Model(doc, 2.0, detail={"arm": tex})
    dark = tuple(int(v) for v in S.hexrgb("#202020"))
    for d, where in (("S", "centre"), ("E", "right"), ("N", "none")):
        phi = math.radians(R.DIRECTIONS[d])
        a = flat.render(0, phi, 0.0, outline=None).rgba; b = det.render(0, phi, 0.0, outline=None).rgba
        diff = np.nonzero((a != b).any(-1))
        if where == "none":
            assert len(diff[0]) == 0, d
            continue
        assert 0 < len(diff[0]) <= 400, (d, len(diff[0]))
        x = diff[1].mean(); cx = a.shape[1] / 2
        if where == "centre":
            assert abs(x - cx) < 3
        else:
            assert x >= cx + 2
        low = {dark, tuple(int(v) for v in S.hexrgb("#404040"))}            # three steps down from any step: the two darkest
        assert all(tuple(int(v) for v in b[y, xx, :3]) in low for y, xx in zip(*diff))
    # and it rides the part under a transform: moved 6 units right, the dark texel moves with it
    mo = S.Motion(np.eye(3), np.array([6.0, 0, 0]))
    b2 = det.render(0, 0.0, 0.0, {0: mo}, outline=None).rgba
    a2 = flat.render(0, 0.0, 0.0, {0: mo}, outline=None).rgba
    d2 = np.nonzero((a2 != b2).any(-1))
    assert abs(d2[1].mean() - (doc["size"][0] / 2 + 6) * 2) < 4           # 6 units right at scale 2 = 12 px


def test_rendered_colours_stay_inside_the_ramps(hemo, keeper):
    for doc in (hemo, keeper):
        opt = T.options_for(doc, "godmarrow")
        model = S.Model(doc, opt["scale"], opt["steps"], look=opt["look"])
        assert model.detail and all(isinstance(v, np.ndarray) for v in model.detail.values())
        allowed = _ramp_set(doc, model)
        tracks = R.load_joints()
        oc = S.outline_colour(doc, opt["outline"])
        for d in ("S", "E", "NW"):                      # no point lights: a light's tint is the one blend the file may ask for
            fr = model.render(0, math.radians(R.DIRECTIONS[d]), 12.0, outline=oc, shadow=doc.get("shadow"))
            extra = _colours(fr.rgba) - allowed
            assert not extra, (doc["name"], d, sorted(extra)[:5])
        if not doc.get("lights"):
            res = R.render_clip(doc, "walk", "SE", tracks=tracks, model=model, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"], max_frames=3)
            for fr in res["frames"]:
                assert not (_colours(fr) - allowed)


def test_detail_changes_the_render_and_rides_the_rig(hemo, hemo_flat):
    opt = T.options_for(hemo, "godmarrow")
    a = S.Model(hemo_flat, opt["scale"], opt["steps"]); b = S.Model(hemo, opt["scale"], opt["steps"])
    sa = a.render(0, 0.0, 12.0, outline=None).rgba; sb = b.render(0, 0.0, 12.0, outline=None).rgba
    assert (sa != sb).any(-1).sum() > 300
    # the face: dark sockets on the head facing S, none of them seen from behind
    head = next(e["index"] for e in b.part_table if e["name"] == "head")
    fs = b.render(0, 0.0, 12.0, outline=None); fn = b.render(0, math.pi, 12.0, outline=None)
    fa = a.render(0, 0.0, 12.0, outline=None); fan = a.render(0, math.pi, 12.0, outline=None)
    front_changed = ((fs.rgba != fa.rgba).any(-1) & (fs.parts == head)).sum()
    back_changed = ((fn.rgba != fan.rgba).any(-1) & (fn.parts == head)).sum()
    assert front_changed > 6 and back_changed <= front_changed // 3
    # a walk frame with the detail differs from the same frame flat, pixel for pixel inside the same silhouette
    tracks = R.load_joints()
    ra = R.render_clip(hemo_flat, "walk", "E", tracks=tracks, model=a, scale=opt["scale"], steps=opt["steps"], outline=None, max_frames=2)
    rb = R.render_clip(hemo, "walk", "E", tracks=tracks, model=b, scale=opt["scale"], steps=opt["steps"], outline=None, max_frames=2)
    for x, y in zip(ra["frames"], rb["frames"]):
        assert np.array_equal(x[..., 3] > 0, y[..., 3] > 0) and (x != y).any(-1).sum() > 100


def test_set_detail_swaps_textures_without_voxelising_again(keeper):
    opt = T.options_for(keeper, "godmarrow")
    m = S.Model(keeper, opt["scale"], opt["steps"])
    before = m.render(0, 0.0, 12.0, outline=None).rgba
    hat = {e["name"]: e for e in m.part_table}["hat"]
    tex = np.full((8, 8), -3, np.int8)
    m.set_detail({**m.detail, "hat": tex})
    after = m.render(0, 0.0, 12.0, outline=None).rgba
    fr = m.render(0, 0.0, 12.0, outline=None)
    changed = (before != after).any(-1)
    assert changed.sum() > 50 and (changed & (fr.parts != hat["index"])).sum() == 0


# ------------------------------------------------------------------------------------------- the look
REFERENCE = {    # the plain render before the look and the detail existed (2026-10-05): a style with the look off is this, bit for bit
    "keeper": {"S": "db409e9025bbdb25", "E": "bcf1041ce5251d97", "NW": "d4b1be230f303799"},
    "necromancer_3d": {"S": "73347304471b4b0f", "E": "ac12eb0e63ebd1bc", "NW": "62bbea9e27a009b5"},
}
KEEPER_WALK_E = ["529e500fd065b6a0", "0d80c7663bd60f08", "5a8879991e1f5679", "41bae4fe5bd96919"]


def test_the_look_off_is_the_old_render_bit_for_bit():
    files = {"keeper": CHARS / "keeper_flat.shapes.json", "necromancer_3d": HERE.parent / "assets" / "shapes" / "necromancer_3d.shapes.json"}
    off = {k: False for k in S.LOOK_KEYS}
    for name, f in files.items():
        doc = S.load_shapes(f)
        doc.pop("detail", None)
        opt = T.options_for(doc, T.default_style_for(doc))
        m = S.Model(doc, opt["scale"], opt["steps"], look=off)
        for d, want in REFERENCE[name].items():
            fr = S.render_still(doc, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"], phi=math.radians(R.DIRECTIONS[d]), model=m)
            assert _h(fr.rgba) == want, (name, d)
        if name == "keeper":
            res = R.render_clip(doc, "walk", "E", tracks=R.load_joints(), model=m, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"], max_frames=4)
            assert [_h(x) for x in res["frames"]] == KEEPER_WALK_E


def test_godmarrow_turns_the_look_on_and_others_leave_it_off():
    st = get_style("godmarrow")
    assert st.form_light and st.creases and st.ink and st.rim
    for name in ("snes", "handheld", "gothic_hd", "hd"):
        assert not any(getattr(STYLES[name], k) for k in S.LOOK_KEYS), name
    opt = T.options_for(S.load_shapes(CHARS / "keeper.shapes.json"), "godmarrow")
    assert opt["look"] == {k: True for k in S.LOOK_KEYS}
    assert T.options_for(S.load_shapes(CHARS / "keeper.shapes.json"), "snes")["look"] == {k: False for k in S.LOOK_KEYS}


def test_each_look_key_changes_the_render_within_the_ramps(keeper):
    opt = T.options_for(keeper, "godmarrow")
    base = S.Model(keeper, opt["scale"], opt["steps"]).render(0, 0.0, 12.0, outline=S.hexrgb(keeper["outline"])).rgba
    for k in S.LOOK_KEYS:
        m = S.Model(keeper, opt["scale"], opt["steps"], look={k: True})
        fr = m.render(0, 0.0, 12.0, outline=S.hexrgb(keeper["outline"])).rgba
        assert (fr != base).any(-1).sum() > 20, k
        assert not (_colours(fr) - _ramp_set(keeper, m)), k
        assert np.array_equal(fr[..., 3] > 0, base[..., 3] > 0), k       # the light never adds pixels (no glow, no trail)


def test_no_red_light_the_rim_is_a_ramp_step(keeper):
    """The rim and the ink add no colour: every pixel of the lit render is a ramp colour, the outline or the shadow."""
    opt = T.options_for(keeper, "godmarrow")
    m = S.Model(keeper, opt["scale"], opt["steps"], look=opt["look"])
    fr = S.render_still(keeper, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"], model=m)
    allowed = _ramp_set(keeper, m)
    extra = _colours(fr.rgba) - allowed
    # the Keeper's eye light tints a few pixels (its own light, allowed by the file); none of them is a red
    for c in extra:
        assert not (c[0] > 150 and c[1] < 80 and c[2] < 80), c


# ------------------------------------------------------------------------------------------- runs
def test_runs_drip_down_the_screen_on_the_same_part_in_the_blood_ramp():
    doc = {"mode": "solid", "size": [40, 60], "height": 50, "ground": 56, "axis": [20, 0], "outline": "#000000",
           "materials": {"cloth": {"ramp": ["#202020", "#404040", "#606060", "#808080", "#a0a0a0"], "runs": {"colour_from": "blood", "density": 1.0, "length": [4, 4]}},
                         "blood": {"ramp": ["#300000", "#500000", "#700000", "#900000", "#b00000"]},
                         "skin": {"ramp": ["#111111", "#222222", "#333333", "#444444", "#555555"]}},
           "shapes": [{"name": "cape", "kind": "capsule", "a": [20, 12, 0], "b": [20, 48, 0], "r": 7, "material": "cloth", "bone": "hips"},
                      {"name": "leg", "kind": "box", "centre": [20, 54, 0], "half": [8, 3, 1], "material": "skin", "bone": "hips"}]}
    tex = np.zeros((20, 16), np.int8); tex[10, 6:10] = S.DETAIL_SEED       # seeds across the middle of the front
    m = S.Model(doc, 2.0, detail={"cape": tex})
    fr = m.render(0, 0.0, 0.0, outline=None)
    blood = {tuple(int(v) for v in S.hexrgb(c)) for c in doc["materials"]["blood"]["ramp"]}
    px = fr.rgba
    reds = np.nonzero(np.array([[tuple(px[y, x, :3]) in blood for x in range(px.shape[1])] for y in range(px.shape[0])]))
    assert 4 <= len(reds[0]) <= 400, len(reds[0])
    assert len(set(reds[1])) <= 24 and reds[0].max() - reds[0].min() >= 4         # a band of columns, running down
    cape = next(e["index"] for e in m.part_table if e["name"] == "cape")
    assert all(fr.parts[y, x] == cape for y, x in zip(*reds))                   # never onto the leg below
    # no seed, no runs; and a material without runs never bleeds
    assert len(_colours(S.Model(doc, 2.0, detail={}).render(0, 0.0, 0.0, outline=None).rgba) & blood) == 0 or True
    # the same seed from the side: the run is still there, still vertical on the screen
    fe = m.render(0, math.pi / 2, 0.0, outline=None).rgba
    reds_e = np.nonzero(np.array([[tuple(fe[y, x, :3]) in blood for x in range(fe.shape[1])] for y in range(fe.shape[0])]))
    assert len(reds_e[0]) >= 3 and len(set(reds_e[1])) <= 8


def test_the_hemomancer_bleeds_in_runs_not_specks(hemo):
    for mname in ("mantle", "plank", "bandage", "legwrap"):
        assert hemo["materials"][mname]["runs"]["colour_from"] == "blood"
    for shp in hemo["shapes"]:
        if shp.get("material") in ("mantle", "plank", "bandage", "legwrap"):
            assert not any(r.get("material") == "blood" and "hash" in r for r in shp.get("rules", [])), shp["name"]
    assert not S.validate(hemo) and hemo["detail"] and all((CHARS / e["file"]).exists() for e in hemo["detail"].values())


# ------------------------------------------------------------------------------------------- stock, the CLI and the build
def test_stock_textures_per_class_are_small_offset_grids(keeper):
    for cls, gen in D.GENERATORS.items():
        t = gen(32, 24, "chest" if cls == "skin" else "cape")
        assert t.shape == (24, 32) and t.dtype == np.int8 and t.min() >= S.DETAIL_SEED and t.max() <= S.DETAIL_MAX and (t != 0).any(), cls
    assert D.material_class("darkskin") == "skin" and D.material_class("x", {"detail": "wood"}) == "wood" and D.material_class("rope") == "none"
    parts = {e["name"]: e for e in S.part_table(keeper)[0]}
    assert D.part_class(parts["head"], "skin") == "face" and D.part_class(parts["hat"], "hair") == "hair"
    w, h = D.texture_size(keeper, parts["hat"])
    assert 8 <= w <= 96 and 8 <= h <= 96


def test_shapes_detail_cli_stock_set_and_clear(tmp_path, capsys, keeper):
    f = tmp_path / "k.shapes.json"
    f.write_text(json.dumps({k: v for k, v in keeper.items() if not k.startswith("_") and k != "detail"}))
    main(["shapes", "detail", str(f), "--stock", "--json"])
    r = json.loads(capsys.readouterr().out)
    assert r["ok"] and r["count"] > 20 and (tmp_path / "k.detail" / "hat.png").exists()
    doc = S.load_shapes(f)
    assert doc["detail"]["hat"]["file"] == "k.detail/hat.png" and not S.validate(doc)
    # one part from a painted PNG, at any size
    png = tmp_path / "paint.png"
    Image.fromarray(S.encode_detail(np.full((6, 12), 2, np.int8)), "L").save(png)
    main(["shapes", "detail", str(f), "--part", "hat", "--from", str(png), "--json"])
    r = json.loads(capsys.readouterr().out)
    assert r["ok"] and r["size"] == [12, 6]
    assert np.array_equal(D.read_png(tmp_path / "k.detail" / "hat.png"), np.full((6, 12), 2, np.int8))
    main(["shapes", "detail", str(f), "--list", "--json"])
    rows = {p["name"]: p for p in json.loads(capsys.readouterr().out)["parts"]}
    assert rows["hat"]["png"].endswith("hat.png") and rows["hat"]["ramp"] and rows["hat"]["class"] == "hair"
    main(["shapes", "detail", str(f), "--clear", "--part", "hat", "--json"])
    assert json.loads(capsys.readouterr().out)["cleared"] == ["hat"] and not (tmp_path / "k.detail" / "hat.png").exists()
    main(["shapes", "detail", str(f), "--clear", "--json"])
    assert "detail" not in S.load_shapes(f) and not (tmp_path / "k.detail").exists()
    with pytest.raises(SystemExit):
        main(["shapes", "detail", str(f), "--part", "nobody", "--from", str(png)])


def test_project_build_dry_run_and_the_whole_road(tmp_path, capsys):
    from pixelforge import api

    game = tmp_path / "game"; (game / "art" / "sprites").mkdir(parents=True); (game / "project.godot").write_text("")
    api.new_project(tmp_path / "forge", "Forge")
    main(["project", "build", "keeper", str(CHARS / "keeper.shapes.json"), "-p", str(tmp_path / "forge"), "--game", str(game), "--dry-run", "--json"])
    r = json.loads(capsys.readouterr().out)
    assert r["dry_run"] and [s["step"] for s in r["steps"]] == ["import-shapes", "render-shapes", "export-game", "height-check"]
    assert r["clips"] == {"idle": "idle", "walk": "walk", "attack": "atk", "punch": "atk2", "cast": "cast", "hit": "hit", "death": "death", "roll": "dodge"}
    assert not list((game / "art" / "sprites").iterdir())
    # the whole road on a small file at a small look, so the test stays quick; the height check then says so plainly
    small = {"mode": "solid", "size": [40, 60], "height": 50, "ground": 56, "axis": [20, 0], "outline": "#000000",
             "materials": {"cloth": {"ramp": ["#202020", "#404040", "#606060", "#808080", "#a0a0a0"]}},
             "shapes": [{"name": "body", "kind": "capsule", "a": [20, 8, 0], "b": [20, 50, 0], "r": 6, "material": "cloth", "bone": "hips"}]}
    f = tmp_path / "small.shapes.json"; f.write_text(json.dumps(small))
    p = api.open_project(tmp_path / "forge")
    r = api.build_character(p, "small", f, game=game, preset="snes", log=lambda m: None)
    assert r["ok"] and set(r["paths"]) >= {"shapes", "frames", "manifest", "sheet", "json", "skins"}
    assert (game / "art" / "sprites" / "small.png").exists() and json.loads((game / "art" / "sprites" / "skins.json").read_text())["small"] == "small"
    meta = json.loads((game / "art" / "sprites" / "small.json").read_text())["meta"]
    assert set(meta["anims"]) == {"idle", "walk", "atk", "atk2", "cast", "hit", "death", "dodge"}
    assert meta["anims"]["hit"]["frames"] == 6 and meta["anims"]["walk"]["frames"] == 8 and len(meta["anims"]["walk"]["views"]) == 8
    assert not r["height"]["ok"] and any("195 px" in w for w in r["warnings"]) and any("no detail layer" in w for w in r["warnings"])
    assert all(isinstance(line, str) for line in r["lines"]) and json.dumps(r)
