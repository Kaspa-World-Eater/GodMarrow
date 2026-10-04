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
