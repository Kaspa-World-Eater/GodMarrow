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
    assert "old" in ai.split("pixelforge hero <sheet.png>")[1].split("\n")[0].lower()


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
    # the CLI road
    main(["shapes", "draft", "a warrior in a long robe", "-o", str(tmp_path / "w.shapes.json"), "--from-measure", str(tmp_path / "m.json")])
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
