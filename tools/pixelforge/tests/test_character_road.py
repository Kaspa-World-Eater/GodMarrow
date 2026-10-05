"""The character road fixes (track/pf-fixes): the docs and the hero note, the game's default height, painting to
shapes (measure, draft --from-measure, sample-materials, compare), the format traps, the parts kit, the skins entry
on export, and the Hemomancer generator."""
import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from pixelforge import api, shape_rig as R, shape_tools as T, shapes as S
from pixelforge.cli import HERO_NOTE, main

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]


# ------------------------------------------------------------------------------------------- 1. docs and the hero note
def test_hero_prints_the_old_road_note_unless_cutout(monkeypatch, capsys):
    import pixelforge.hero as hero

    monkeypatch.setenv("PIXELFORGE_OLD_ROADS", "1")      # the retired cutout road, reopened for the test
    monkeypatch.setattr(hero, "make_hero", lambda *a, **k: {"ok": True, "stub": True})
    main(["hero", "sheet.png", "x", "--json"])
    err = capsys.readouterr().err
    assert "old cutout road" in err and "shapes" in err and HERO_NOTE in err
    main(["hero", "sheet.png", "x", "--json", "--cutout"])
    assert "old cutout road" not in capsys.readouterr().err


def test_docs_point_at_the_shape_road():
    for f in (REPO / "CLAUDE.md", REPO / "tools" / "pixelforge" / "CLAUDE.md", HERE.parent / "docs" / "GUIDE_AI.md", HERE.parent / "docs" / "GUIDE_HUMANS.md"):
        text = f.read_text().lower()
        assert "shape" in text and ("character road" in text or "characters are shape" in text or "characters are made as shape" in text), f
    ai = (HERE.parent / "docs" / "GUIDE_AI.md").read_text()
    assert "## Retired roads" in ai and "PIXELFORGE_OLD_ROADS" in ai.split("## Retired roads")[1]      # the cutout road is named only there
    assert "pixelforge hero" not in ai.split("## Retired roads")[0]


# ------------------------------------------------------------------------------------------- 2. the game's default height
def test_a_character_defaults_to_the_games_hero_height_and_objects_keep_their_size():
    from pixelforge.styles import STYLES
    keeper = S.load_shapes(S.ASSETS / "characters" / "keeper.shapes.json")
    chest = S.load_shapes(S.ASSETS / "objects" / "chest.shapes.json")
    assert T.is_character(keeper) and not T.is_character(chest)
    assert T.default_style_for(keeper) == "godmarrow" and T.default_style_for(chest) is None
    opt = T.options_for(keeper, T.default_style_for(keeper))
    assert opt["scale"] == pytest.approx(STYLES["godmarrow"].figure_height / keeper["height"])


def test_cli_still_renders_a_character_at_195_px_by_default(tmp_path, capsys):
    f = str(S.ASSETS / "characters" / "keeper.shapes.json")
    main(["shapes", "still", f, "-o", str(tmp_path / "s.png"), "--json"])
    r = json.loads(capsys.readouterr().out)
    assert r["size"][1] == round(138 * 195 / 120)                     # the file's canvas at the godmarrow scale
    main(["shapes", "still", f, "-o", str(tmp_path / "s1.png"), "--scale", "1", "--json"])
    assert json.loads(capsys.readouterr().out)["size"][1] == 138        # an explicit scale keeps the file's own size


def test_new_project_defaults_to_the_games_look(tmp_path):
    r = api.new_project(tmp_path / "p", "p")
    from pixelforge.project import Project
    assert Project.load(tmp_path / "p").style == "godmarrow"


def test_export_game_warns_when_the_figure_is_not_the_games_height(tmp_path):
    from pixelforge.godmarrow_export import figure_height_of, height_warning
    man = {"figure_height": 120, "render_scale": 1.0}
    assert figure_height_of(tmp_path, man) == 120
    w = height_warning(tmp_path, man, "hero")
    assert w and "120 px" in w and "195 px" in w and "short" in w
    assert height_warning(tmp_path, {"figure_height": 120, "render_scale": 195 / 120}, "hero") is None
    assert height_warning(tmp_path, man, "object") is None               # no fixed height for the category
    # measured from the frames when the manifest carries no shape numbers
    fr = tmp_path / "frames" / "idle_S"; fr.mkdir(parents=True)
    im = np.zeros((300, 100, 4), np.uint8); im[40:235, 30:60] = 255
    Image.fromarray(im, "RGBA").save(fr / "frame_000.png")
    assert figure_height_of(tmp_path / "frames", {}) == 195 and height_warning(tmp_path / "frames", {}, "hero") is None
    # through the project road: a set rendered at the 76 px look is called out, in the result and the notes
    api.new_project(tmp_path / "proj", "p", style="rendered_arpg")
    from pixelforge.project import Project
    project = Project.load(tmp_path / "proj")
    api.add_character(project, "keeper", "the keeper")
    api.import_shapes(project, "keeper", S.ASSETS / "characters" / "keeper.shapes.json")
    api.render_shapes(project, "keeper", clips="idle", directions="S")
    said = []
    g = api.export_game(project, "keeper", kind="keeper_small", out_dir=tmp_path / "game", log=said.append)
    assert g["ok"] and len(g["warnings"]) == 1 and "76 px" in g["warnings"][0] and said and "warning" in said[0]
    assert "WARNING" in Project.load(tmp_path / "proj").character("keeper").notes["export_game"]


# ------------------------------------------------------------------------------------------- 3. painting to shapes
def _synthetic_front(skirted: bool = False, depth_view: bool = False):
    """A plain figure on white, 400 x 800: a head, a torso with an arm each side, two legs (or a skirt)."""
    from PIL import ImageDraw
    im = Image.new("RGB", (400, 800), (255, 255, 255))
    d = ImageDraw.Draw(im)
    skin, cloth, legs = (200, 150, 120), (40, 60, 160), (40, 120, 50)
    if depth_view:                                                        # the side view: a narrower column
        d.ellipse([170, 10, 230, 110], fill=skin)
        d.rectangle([170, 110, 230, 400], fill=cloth)
        d.rectangle([180, 400, 220, 799], fill=legs)
        return im
    d.ellipse([150, 10, 250, 110], fill=skin)
    d.rectangle([130, 110, 270, 400], fill=cloth)
    d.rectangle([95, 130, 125, 380], fill=skin); d.rectangle([275, 130, 305, 380], fill=skin)
    if skirted:
        d.polygon([(130, 400), (270, 400), (320, 780), (80, 780)], fill=cloth)
    else:
        d.rectangle([150, 400, 190, 799], fill=legs); d.rectangle([210, 400, 250, 799], fill=legs)
    return im


def test_measure_reads_the_landmarks_of_a_synthetic_figure(tmp_path):
    from pixelforge import shape_measure as M
    _synthetic_front().save(tmp_path / "front.png"); _synthetic_front(depth_view=True).save(tmp_path / "side.png")
    m = M.measure_views(tmp_path / "front.png", tmp_path / "side.png", out=tmp_path / "m.json")
    lm = m["landmarks"]
    assert m["height_px"] == 790 and Path(m["file"]).exists() and set(m["views"]) == {"front", "side"}
    assert lm["head"]["w"] == pytest.approx(100 / 790, abs=0.012) and lm["head"]["bottom"] == pytest.approx(0.13, abs=0.03)
    assert lm["shoulders"]["w"] == pytest.approx(210 / 790, abs=0.012)
    assert lm["leg"]["w"] == pytest.approx(40 / 790, abs=0.006) and lm["arm"]["w"] == pytest.approx(30 / 790, abs=0.006)
    assert lm["hips"]["w"] == pytest.approx(100 / 790, abs=0.012) and not lm["hem"]["skirted"]
    assert lm["chest"]["d"] == pytest.approx(60 / 790, abs=0.012) and lm["head"]["d"] == pytest.approx(60 / 790, abs=0.012)
    # a transparent cutout reads the same as a plain background
    rgba = M.figure_rgba(tmp_path / "front.png")
    Image.fromarray(rgba, "RGBA").save(tmp_path / "front_t.png")
    m2 = M.measure_views(tmp_path / "front_t.png")
    assert m2["landmarks"]["shoulders"]["w"] == pytest.approx(lm["shoulders"]["w"], abs=0.005)
    # a skirt: the hem is the lowest row still as wide as the hips
    _synthetic_front(skirted=True).save(tmp_path / "skirt.png")
    lm2 = M.measure_views(tmp_path / "skirt.png")["landmarks"]
    assert lm2["hem"]["skirted"] and lm2["hem"]["y"] > 0.93 and lm2["hem"]["w"] == pytest.approx(240 / 770, abs=0.03)


def test_draft_from_measure_sizes_the_rings_and_limbs(tmp_path, capsys):
    from pixelforge import describe
    _synthetic_front(skirted=True).save(tmp_path / "front.png"); _synthetic_front(depth_view=True).save(tmp_path / "side.png")
    main(["shapes", "measure", str(tmp_path / "front.png"), str(tmp_path / "side.png"), "-o", str(tmp_path / "m.json")])
    assert "shoulders" in capsys.readouterr().out
    m = json.loads((tmp_path / "m.json").read_text())["landmarks"]
    plain = describe.draft_shapes("a warrior in a long robe with a cape", height=120)["doc"]
    sized = describe.draft_shapes("a warrior in a long robe with a cape", height=120, measure=tmp_path / "m.json")["doc"]
    by = lambda doc, n: next(s for s in doc["shapes"] if s["name"] == n)
    H = 120
    assert by(sized, "chest")["radii"][0] == pytest.approx(m["chest"]["w"] * H / 2 * 0.92, abs=0.02) and by(sized, "chest")["radii"][0] != by(plain, "chest")["radii"][0]
    assert by(sized, "head")["radii"][0] == pytest.approx(m["head"]["w"] * H / 2, abs=0.02) and by(sized, "head")["radii"][2] == pytest.approx(m["head"]["d"] * H / 2, abs=0.02)
    assert by(sized, "upper_arm.L")["r"][0] == pytest.approx(m["arm"]["w"] * H / 2, abs=0.02)
    skirt = by(sized, "skirt")
    top = sized["ground"] - H
    assert skirt["y"][1] == pytest.approx(top + m["hem"]["y"] * H, abs=0.5) and skirt["rx"][0] == pytest.approx(m["hips"]["w"] * H / 2, abs=0.02)
    assert skirt["rx"][0] + skirt["rx"][1] * (skirt["y"][1] - skirt["y"][0]) == pytest.approx(m["hem"]["w"] * H / 2, abs=0.1)
    assert by(sized, "belt")["rx"] == pytest.approx(m["hips"]["w"] * H / 2, abs=0.02)
    assert "measured" in sized and not S.validate(sized)
    # the CLI road (retired: it answers only with the flag set)
    import os
    os.environ["PIXELFORGE_OLD_ROADS"] = "1"
    try:
        main(["shapes", "draft", "a warrior in a long robe", "-o", str(tmp_path / "w.shapes.json"), "--from-measure", str(tmp_path / "m.json")])
    finally:
        os.environ.pop("PIXELFORGE_OLD_ROADS", None)
    assert "sized from the measured painting" in capsys.readouterr().out and (tmp_path / "w.shapes.json").exists()


def _plain_doc():
    """A figure of three materials in the synthetic painting's proportions (120 units: head 15, torso 44, legs 61)."""
    cx, ground = 69.0, 134.0
    top = ground - 120
    return {"name": "plain", "mode": "solid", "size": [138, 138], "height": 120, "ground": ground, "axis": [cx, 0], "materials": {},
            "shapes": [
                {"name": "head", "kind": "ellipsoid", "centre": [cx, top + 7.5, 0], "radii": [7.5, 7.5, 7.5], "material": "skin", "bone": "head"},
                {"name": "torso", "kind": "box", "centre": [cx, top + 38, 0], "half": [10.5, 22, 4.5], "material": "cloth", "bone": "spine.002"},
                {"name": "leg.L", "kind": "capsule", "a": [cx - 4.5, top + 62, 0], "b": [cx - 4.5, ground - 2.5, 0], "r": 2.5, "material": "wrap", "bone": "thigh.L"},
                {"name": "leg.R", "kind": "capsule", "a": [cx + 4.5, top + 62, 0], "b": [cx + 4.5, ground - 2.5, 0], "r": 2.5, "material": "wrap", "bone": "thigh.R"},
            ], "shadow": {"radii": [12, 3]}}


def test_sample_materials_takes_the_paintings_colours_per_region(tmp_path, capsys):
    from pixelforge import shape_measure as M
    from pixelforge.color import rgb_to_oklab
    _synthetic_front().save(tmp_path / "front.png")
    doc = _plain_doc()
    r = M.sample_materials(tmp_path / "front.png", doc, tmp_path / "coloured.shapes.json")
    assert set(r["materials"]) == {"skin", "cloth", "wrap"} and Path(r["file"]).exists()
    painted = {"skin": (200, 150, 120), "cloth": (40, 60, 160), "wrap": (40, 120, 50)}
    for name, rgb in painted.items():
        ramp = np.array([S.hexrgb(c) for c in doc["materials"][name]["ramp"]])
        assert len(ramp) >= 5
        mean = rgb_to_oklab(ramp.mean(axis=0)[None].astype(np.uint8))[0]
        assert np.linalg.norm(mean - rgb_to_oklab(np.array([rgb], np.uint8))[0]) < 0.12, (name, doc["materials"][name]["ramp"])
        light = rgb_to_oklab(ramp.astype(np.uint8))[:, 0]
        assert np.all(np.diff(light) >= -1e-6)                           # shadow first
    saved = json.loads((tmp_path / "coloured.shapes.json").read_text())
    assert not S.validate(saved) and saved["materials"]["skin"]["ramp"] == doc["materials"]["skin"]["ramp"]
    json.dump(_plain_doc(), open(tmp_path / "p.shapes.json", "w"))
    main(["shapes", "sample-materials", str(tmp_path / "front.png"), "--model", str(tmp_path / "p.shapes.json"), "--only", "skin"])
    out = capsys.readouterr().out
    assert "skin" in out and "written" in out and "cloth" not in json.loads((tmp_path / "p.shapes.json").read_text())["materials"]


def test_compare_lays_painting_and_sprite_side_by_side_per_view(tmp_path, capsys):
    from pixelforge import shape_measure as M
    front, side = _synthetic_front(), _synthetic_front(depth_view=True)
    sheet = Image.new("RGB", (900, 820), (255, 255, 255)); sheet.paste(front, (20, 10)); sheet.paste(side, (480, 10))
    sheet.save(tmp_path / "sheet.png")
    r = M.compare(_plain_doc(), tmp_path / "sheet.png", tmp_path / "cmp.png", height=160, views=["front", "side"])
    assert r["ok"] and Path(r["out"]).exists() and set(r["views"]) == {"front", "side"}
    assert r["views"]["front"]["direction"] == "S" and r["views"]["side"]["direction"] == "E"
    assert r["views"]["front"]["silhouette_iou"] > 0.6 and r["views"]["side"]["silhouette_iou"] > 0.5
    im = Image.open(tmp_path / "cmp.png")
    assert im.size[1] >= 160 + 14 and im.size[0] > 100               # two views: painting + sprite each, with gaps
    json.dump(_plain_doc(), open(tmp_path / "p.shapes.json", "w"))
    main(["shapes", "compare", str(tmp_path / "p.shapes.json"), "--ref", str(tmp_path / "sheet.png"), "-o", str(tmp_path / "c2.png"), "--height", "120", "--views", "front,side"])
    assert "overlap" in capsys.readouterr().out and (tmp_path / "c2.png").exists()


# ------------------------------------------------------------------------------------------- 4. the format traps
def _ring_doc(**ring):
    cx, ground = 69.0, 134.0
    return {"size": [138, 138], "height": 120, "ground": ground, "axis": [cx, 0], "materials": {}, "parts": {},
            "shapes": [{"name": "thigh.L", "kind": "capsule", "a": [cx - 6, 72, 0], "b": [cx - 6, 98, 0], "r": 4, "material": "cloth", "bone": "thigh.L"},
                       {"name": "shin.L", "kind": "capsule", "a": [cx - 6, 98, 0], "b": [cx - 6, 127, 0], "r": 3, "material": "cloth", "bone": "shin.L"},
                       {"name": "cape", "kind": "ring", "y": [32, 122], "rx": 10, "rz": 9, "thickness": 1.6, "material": "cloth", "bone": "spine.003", **ring}]}


def test_back_strip_is_the_clear_spelling_of_the_old_keep_back():
    a = _ring_doc(keep={"back": 2.42}); b = _ring_doc(keep={"back_strip": round(np.pi - 2.42, 6)})
    fa = S.render_still(a, phi=0.0).rgba; fb = S.render_still(b, phi=0.0).rgba
    assert np.array_equal(fa[..., 3] > 0, fb[..., 3] > 0)
    # the strip is a strip (12 units wide here); the old key with the strip's number keeps nearly the whole ring round the legs
    cape = 2
    extent = lambda doc: np.ptp(np.nonzero(S.render_still(doc, phi=0.0).pid == cape)[1]) + 1
    wrong = _ring_doc(keep={"back": 0.72})                             # what the first build wrote: the cape wrapped round the legs
    assert extent(b) <= 14 and extent(wrong) >= 19
    assert S.validate(_ring_doc(keep={"sideways": 1})) and not S.validate(b)
    w = S.warnings(a)
    assert len(w) == 1 and "keep.back" in w[0] and "back_strip 0.72" in w[0]
    assert S.warnings(b) == []


def test_warning_when_a_cloth_ring_would_hide_the_legs():
    w = S.warnings(_ring_doc())
    assert len(w) == 1 and "covers the legs" in w[0] and "knee" in w[0]
    assert S.warnings(_ring_doc(y=[32, 90])) == []                                        # above the knee
    assert S.warnings(_ring_doc(y=[32, 90], hem={"depth": 20})) and "covers the legs" in S.warnings(_ring_doc(y=[32, 90], hem={"depth": 20}))[0]
    assert S.warnings(_ring_doc(open={"angle": 0.5, "below": 60})) == []                   # an open front shows the legs
    assert S.warnings(_ring_doc(keep={"front": 0.3})) == []
    legless = _ring_doc(); legless["shapes"] = legless["shapes"][2:]
    assert S.warnings(legless) == []                                                       # nothing to hide
    assert S.warnings(_ring_doc(bone="shin.L", y=[100, 126])) == []                        # a greave rides the leg
    r = T.validate_file(S.ASSETS / "characters" / "keeper.shapes.json")
    assert r["ok"] and any("underskirt" in x for x in r["warnings"])                     # the Keeper's long underskirt: a robe, said once


def test_warning_when_a_hanging_part_rides_a_limb_without_upright_from():
    doc = _ring_doc()
    doc["parts"] = {"planks_L": {"bone": "thigh.L", "hang": 0.3}}
    doc["shapes"].append({"name": "plank", "kind": "box", "centre": [60, 85, 12], "half": [2.5, 18, 1], "material": "wood5", "part": "planks_L"})
    w = [x for x in S.warnings(doc) if "upright_from" in x]
    assert len(w) == 1 and "planks_L" in w[0] and "thigh.L" in w[0] and "lies flat" in w[0]
    doc["parts"]["planks_L"]["upright_from"] = "hips"
    assert not [x for x in S.warnings(doc) if "upright_from" in x]
    doc["parts"] = {}
    doc["shapes"][-1] = {"name": "plate", "kind": "box", "centre": [60, 85, 12], "half": [2.5, 8, 1], "material": "wood5", "bone": "forearm.L", "hang": 0.5}
    w = [x for x in S.warnings(doc) if "upright_from" in x]
    assert len(w) == 1 and "plate" in w[0] and "forearm.L" in w[0]
    doc["shapes"][-1]["bone"] = "hips"
    assert not [x for x in S.warnings(doc) if "upright_from" in x]                        # the body, not a limb
    hemo = S.load_shapes(S.ASSETS / "characters" / "hemomancer.shapes.json")
    assert not [x for x in S.warnings(hemo) if "upright_from" in x or "keep.back" in x]


def test_warning_when_a_centre_has_the_wrong_number_of_dimensions():
    cx = 69.0
    base = {"size": [138, 138], "height": 120, "ground": 134, "axis": [cx, 0], "materials": {}, "shapes": []}
    d2 = {**base, "shapes": [{"name": "head", "kind": "ellipsoid", "centre": [cx, 20], "radii": [6, 7, 6], "material": "skin"}]}
    d3 = {**base, "shapes": [{"name": "head", "kind": "ellipsoid", "centre": [cx, 20, 0], "radii": [6, 7, 6], "material": "skin"}]}
    assert not S.validate(d2)
    w = S.warnings(d2)
    assert len(w) == 1 and "ellipsoid takes a 3D centre" in w[0] and "only a prism's is 2D" in w[0]
    assert np.array_equal(S.render_still(d2).rgba, S.render_still(d3).rgba)              # z taken as the axis'
    box2 = {**base, "shapes": [{"name": "b", "kind": "box", "centre": [cx, 20], "half": [4, 4, 4], "material": "wood5", "rotate": {"y": 30}}]}
    assert not S.validate(box2) and "box takes a 3D centre" in S.warnings(box2)[0] and S.render_still(box2).stats["filled"] > 0
    p3 = {**base, "shapes": [{"name": "arch", "kind": "prism", "centre": [cx, 40, 9], "radii": [7, 6], "z": [8, 10], "material": "wood5"}]}
    p2 = {**base, "shapes": [{"name": "arch", "kind": "prism", "centre": [cx, 40], "radii": [7, 6], "z": [8, 10], "material": "wood5"}]}
    assert not S.validate(p3) and not S.validate(p2)
    w = S.warnings(p3)
    assert len(w) == 1 and "prism's centre is 2D" in w[0] and S.warnings(p2) == []
    assert np.array_equal(S.render_still(p3).rgba, S.render_still(p2).rgba)
    assert "its depth comes from z" in S.validate({**base, "shapes": [{"kind": "prism", "centre": [1], "radii": [7, 6], "z": [8, 10]}]})[0]


def test_cli_validate_prints_the_warnings(tmp_path, capsys):
    json.dump(_ring_doc(keep={"back": 2.42}), open(tmp_path / "c.shapes.json", "w"))
    main(["shapes", "validate", str(tmp_path / "c.shapes.json")])
    out = capsys.readouterr().out
    assert out.startswith("ok:") and "warnings" in out and "back_strip" in out
    r = T.validate_file(tmp_path / "c.shapes.json")
    assert r["ok"] and len(r["warnings"]) == 1


# ------------------------------------------------------------------------------------------- 5. the parts kit
GENERATOR = REPO / "docs" / "concepts" / "hemomancer" / "shapes" / "make_hemomancer_shapes.py"


def _close(x, y, path=""):
    import math
    if isinstance(x, dict) and isinstance(y, dict):
        if set(x) != set(y):
            return [f"{path}: keys {sorted(set(x) ^ set(y))}"]
        return sum((_close(x[k], y[k], path + "/" + str(k)) for k in x), [])
    if isinstance(x, list) and isinstance(y, list):
        if len(x) != len(y):
            return [f"{path}: len {len(x)} vs {len(y)}"]
        return sum((_close(p, q, path + f"[{i}]") for i, (p, q) in enumerate(zip(x, y))), [])
    if isinstance(x, (int, float)) and isinstance(y, (int, float)) and not isinstance(x, bool) and not isinstance(y, bool):
        return [] if math.isclose(x, y, abs_tol=1e-6) else [f"{path}: {x} vs {y}"]
    return [] if x == y else [f"{path}: {x!r} vs {y!r}"]


def test_the_hemomancer_generator_on_the_kit_writes_the_committed_file(tmp_path):
    import subprocess, sys
    out = tmp_path / "hemo.shapes.json"
    proc = subprocess.run([sys.executable, str(GENERATOR), "--out", str(out)], capture_output=True, text=True, cwd=str(HERE.parent), timeout=120)
    assert proc.returncode == 0, proc.stderr[-1500:]
    made = json.loads(out.read_text())
    committed = S.load_shapes(S.ASSETS / "characters" / "hemomancer.shapes.json")      # with its path: the detail textures beside it load
    by_name = lambda d: {s["name"]: s for s in d["shapes"]}
    assert set(by_name(made)) == set(by_name(committed)) and len(made["shapes"]) == len(committed["shapes"])
    diffs = []
    for name, sh in by_name(committed).items():
        diffs += _close(sh, by_name(made)[name], name)
    diffs += _close({k: v for k, v in committed.items() if k not in ("shapes", "detail", "_file")}, {k: v for k, v in made.items() if k not in ("shapes", "detail")}, "doc")
    assert set(made.get("detail", {})) == set(committed.get("detail", {}))      # the stock detail layer, written beside each
    assert diffs == [], diffs[:12]
    # the shape order may differ by part; the picture does not
    a = S.render_still(S.load_shapes(out)).rgba; b = S.render_still(committed).rgba
    assert np.array_equal(a, b)
    assert "clips" not in made or made["clips"].get("attack") in (None, "punch", "jab", "attack")


def test_the_kit_functions_make_the_pieces():
    from pixelforge import shape_parts as K
    links = K.chain("c", [[0, 0, 0], [10, 0, 0], [10, 10, 0]], bone="hips")
    assert len(links) == 10 and links[0]["radii"] == [1.5, 0.95, 0.55] and links[1]["radii"] == [1.5, 0.5, 0.9]      # across, then down
    assert links[5]["radii"][1] == 1.5 and all(l["bone"] == "hips" for l in links) and {l["t"] for l in links} == {-1, 1}
    assert K.rivet_row(y=103, every=3, z_from=3.0) == {"y": [102.5, 103.5], "every_x": [3, 0], "z": [3.0, None], "rivet": True, "px": [90, None]}
    assert K.rivet_row(dy=(-7, -6)) == {"dy": [-7, -6], "every_x": [3, 0], "rivet": True, "px": [90, None]}
    spikes = K.spike_ring("spike", 69.0, 17.0, -0.4, 6.4, [(90, 10, 0.5)])
    assert [s["name"] for s in spikes] == ["spike0", "spike0_s"] and spikes[0]["px"] == [90, None] and spikes[1]["px"] == [None, 90]
    assert spikes[0]["b"][0] == pytest.approx(69 + 16.4) and spikes[0]["b"][1] == 16.5
    planks = K.plank_skirt("plank", 69.0, 67, [22, 94, 166, -166, -94, -22], heights=(18, 18))
    assert [p["part"] for p in planks] == ["planks_L", "planks_L", "planks_back", "planks_back", "planks_R", "planks_R"]
    assert all(p["rotate"]["about"] == [69.0, 67, -0.6] and p["half"][1] == 18 for p in planks)
    parts = K.plank_skirt_parts()
    assert parts["planks_L"]["bone"] == "thigh.L" and parts["planks_L"]["upright_from"] == "hips" and parts["planks_back"]["bone"] == "hips"
    gr = K.greave("R", 69.0)
    names = [g["name"] for g in gr]
    assert names[:2] == ["greave.R", "kneecop.R"] and names[2] == "legspike0.R" and len(gr) == 10
    assert gr[0]["centre"][0] == pytest.approx(69 - 6.04) and any(r.get("rivet") for r in gr[0]["rules"])
    assert len(K.greave("L", 69.0, spikes=False, knee_cop=False, rivets=False)) == 1
    sh = K.shackle("L", 69.0)
    assert sh[0]["name"] == "shackle.L" and sh[1]["name"] == "wristchainL_0" and all(s["bone"] == "forearm.L" for s in sh)
    lo = K.locs("loc", 69.0)
    assert len(lo) == 9 * 2 + 6 * 2 and {s["part"] for s in lo} == {"locs", "locs_front"} and set(K.locs_parts()) == {"locs", "locs_front"}
    cape = K.back_cape("cape", strip=0.72, holes={"p": 0.1, "band": 10})
    assert cape["keep"] == {"back_strip": 0.72} and cape["holes"]["p"] == 0.1 and K.cape_parts()["cape"]["hang"] == 0.3
    doc = {"size": [138, 138], "height": 120, "ground": 134, "axis": [69.0, 0], "materials": {}, "parts": {**parts, **K.locs_parts(), **K.cape_parts()},
           "shapes": links + spikes + planks + gr + sh + lo + [cape] + K.chest_chain() + K.thigh_plate("L", 69.0) + K.chain_loop("loop", 69.0, 72, rx=15, rz=14, deg0=20, deg1=80, part="planks_back")}
    assert S.validate(doc) == [] and S.render_still(doc).stats["filled"] > 500       # the library carries the kit's materials


def test_draft_calls_the_kit_from_its_nouns(tmp_path):
    from pixelforge import describe
    r = describe.draft_shapes("a hemomancer with a spiked iron crown, locs, chains, iron shackles, a plank skirt, spiked riveted greaves and a black cape",
                              out=tmp_path / "k.shapes.json")
    names = {s["name"] for s in r["doc"]["shapes"]}
    assert {"crown_band", "spike0", "upright0", "loc_b0_0", "loc_f0_1", "chestchain0", "shackle.L", "wristchainR_0", "plank0", "plank13", "greave.L", "legspike0.R", "kneecop.R", "cape"} <= names
    assert {"planks_L", "planks_R", "planks_back", "locs", "locs_front", "cape"} <= set(r["doc"]["parts"]) and r["doc"]["parts"]["planks_L"]["upright_from"] == "hips"
    read = " ".join(r["read"])
    assert "spiked crown" in read and "locs" in read and "chain across the chest" in read and "shackles" in read and "plank skirt" in read and "spiked iron greaves" in read
    v = T.validate_file(tmp_path / "k.shapes.json")
    assert v["ok"] and v["unbound_shapes"] == [] and not [w for w in v["warnings"] if "upright_from" in w or "keep.back" in w]
    plain = describe.draft_shapes("a warrior with a sword")["doc"]
    assert not any(s["name"].startswith(("plank", "greave", "loc_", "chestchain", "shackle")) for s in plain["shapes"])
    assert T.still(S.load_shapes(tmp_path / "k.shapes.json"), tmp_path / "k.png", direction="S", style="gothic_hd")["filled"] > 3000


# ------------------------------------------------------------------------------------------- 6. the skins entry
def test_export_game_writes_the_skins_entry_into_the_games_sprites_folder(tmp_path):
    from pixelforge.godmarrow_export import write_skins_entry
    plain = tmp_path / "export"; plain.mkdir()
    assert write_skins_entry(plain, "x") is None and not (plain / "skins.json").exists()      # a plain export folder: nothing
    sprites = tmp_path / "art" / "sprites"; sprites.mkdir(parents=True)
    r = write_skins_entry(sprites, "hemomancer")
    assert r["changed"] and json.loads((sprites / "skins.json").read_text())["hemomancer"] == "hemomancer"
    (sprites / "skins.json").write_text(json.dumps({"_about": "x", "animancer": "mystic"}))
    r = write_skins_entry(sprites, "keeper_shapes", skin_for="miasmancer")
    data = json.loads((sprites / "skins.json").read_text())
    assert data == {"_about": "x", "animancer": "mystic", "miasmancer": "keeper_shapes"} and r["key"] == "miasmancer"
    assert write_skins_entry(sprites, "keeper_shapes", skin_for="miasmancer")["changed"] is False
    other = tmp_path / "other"; other.mkdir(); (other / "skins.json").write_text("{}")
    assert write_skins_entry(other, "k")["file"].endswith("skins.json")                      # an existing skins.json anywhere is kept up
    # through the project road
    api.new_project(tmp_path / "proj", "p", style="rendered_arpg")
    from pixelforge.project import Project
    project = Project.load(tmp_path / "proj")
    api.add_character(project, "keeper", "the keeper")
    api.import_shapes(project, "keeper", S.ASSETS / "characters" / "keeper.shapes.json")
    api.render_shapes(project, "keeper", clips="idle", directions="S")
    g = api.export_game(project, "keeper", kind="keeper_shapes", out_dir=sprites, skin_for="miasmancer")
    assert g["skins"]["key"] == "miasmancer" and json.loads((sprites / "skins.json").read_text())["miasmancer"] == "keeper_shapes" and "--cls=miasmancer" in g["godot"]
    g = api.export_game(project, "keeper", kind="keeper_shapes", out_dir=tmp_path / "game")
    assert g["skins"] is None


def test_the_games_hero_loader_prefers_the_pixelforge_set_over_unclipped():
    hero = (REPO / "entities" / "hero.gd").read_text()
    data = (REPO / "core" / "data.gd").read_text()
    assert "func is_pixelforge_set(kind: String) -> bool:" in data and '"pixelforge"' in data
    line = next(l for l in hero.splitlines() if "_unclipped.json" in l and l.strip().startswith("if "))
    assert "Data.skin_for(c) == c" in line and "not Data.is_pixelforge_set(c)" in line
    # the committed Hemomancer set is such a build, and skins.json names it
    meta = json.loads((REPO / "art" / "sprites" / "hemomancer.json").read_text())["meta"]
    assert meta.get("source") == "pixelforge"
    assert json.loads((REPO / "art" / "sprites" / "skins.json").read_text()).get("hemomancer") == "hemomancer"


# ------------------------------------------------------------------------------------------- 7. the Hemomancer pass
def test_a_model_can_map_a_game_clip_to_another_library_clip(tmp_path):
    tracks = R.load_joints()
    keeper = S.load_shapes(S.ASSETS / "characters" / "keeper.shapes.json")
    mapped = {**keeper, "clips": {"attack": "punch"}}
    assert R.clip_source(mapped, "attack") == "punch" and R.clip_source(mapped, "walk") == "walk" and R.clip_source(keeper, "attack") == "attack"
    model = S.Model(keeper, 0.5)
    a = R.render_clip(mapped, "attack", "S", tracks=tracks, model=model, scale=0.5, max_frames=3)
    b = R.render_clip(keeper, "punch", "S", tracks=tracks, model=model, scale=0.5, max_frames=3)
    assert a["clip"] == "attack" and a["fps"] == b["fps"] and np.array_equal(a["frames"][1], b["frames"][1])
    c = R.render_clip(keeper, "attack", "S", tracks=tracks, model=model, scale=0.5, max_frames=3)
    assert c["fps"] != a["fps"] or not np.array_equal(c["frames"][1], a["frames"][1])
    assert R.canvas_width(mapped, ["attack"], tracks) <= R.canvas_width(keeper, ["attack"], tracks)      # a planted thrust reaches less than the lunge
    bad = {**keeper, "clips": {"attack": "haymaker"}}
    json.dump({k: v for k, v in bad.items() if not k.startswith("_")}, open(tmp_path / "b.shapes.json", "w"))
    v = T.validate_file(tmp_path / "b.shapes.json")
    assert not v["ok"] and "haymaker" in v["problems"][0]
    assert S.validate({**keeper, "clips": ["attack"]})
    r = T.render_set(mapped, tmp_path / "fr", clips=["attack"], directions=["S"], style="rendered_arpg", max_frames=2)
    assert r["ok"] and (tmp_path / "fr" / "attack_S" / "frame_001.png").exists()                           # the folder keeps the game's name


def test_the_hemomancer_still_short_pass():
    doc = S.load_shapes(S.ASSETS / "characters" / "hemomancer.shapes.json")
    by = {s["name"]: s for s in doc["shapes"]}
    assert doc["clips"] == {"attack": "punch"}
    assert "beard" in by and by["beard"]["material"] == "locs" and by["beard"]["bone"] == "head"                # the beard is a mass, not specks
    head = by["head"]["rules"]
    assert any(r.get("t") == 2 and r.get("near") and len(r["near"][0]) == 2 for r in head)                     # two eye pixels
    assert any(r.get("t") == -2 and r.get("y", [0])[0] < 20 for r in head)                                       # the brow shadow
    assert all(s["centre"][2] >= 13.0 for n, s in by.items() if n.startswith("chestchain"))                    # the chain in front of the locs
    arch = next(o for o in by["shield"]["of"] if o["kind"] == "prism")
    assert arch["radii"][1] >= 9.0 and len(arch["centre"]) == 2                                                   # a tall round arch
    assert not T.validate_file(S.ASSETS / "characters" / "hemomancer.shapes.json")["warnings"]
    # facing S the chest chain shows: at least a few dozen chain pixels on the front
    model = S.Model(doc, 195 / 120)
    fr = model.render(0, 0.0, 12, None, outline=None, shadow=None)
    chain_ids = [s_i for s_i, s in enumerate(doc["shapes"]) if s["name"].startswith("chestchain")]
    assert np.isin(fr.pid, chain_ids).sum() >= 40
    eyes = [i for i, s in enumerate(doc["shapes"]) if s["name"] == "head"]
    head_px = fr.pid == eyes[0]
    # the lit eye pixels are lighter than the sockets round them: the head carries at least two pixels of its brightest two steps near the eye line
    ys, xs = np.nonzero(head_px)
    assert len(ys) > 50
