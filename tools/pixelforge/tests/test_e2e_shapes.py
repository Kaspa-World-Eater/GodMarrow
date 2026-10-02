"""End to end: a sentence becomes a shape file, frames in the game's layout and the game's atlas, headlessly.

This is the sequence docs/GUIDE_SESSION.md gives a new session: draft -> validate -> still -> preview -> render -> export.
"""
import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from pixelforge import api, describe, shape_rig as R, shape_tools as T, shapes as S
from pixelforge.godmarrow_export import export_godmarrow

SENTENCE = "a hooded grave warden in dark lacquered armour with a wide straw hat, rope cords, charm gourds at the belt, a tattered black skirt and violet glowing eyes"


def test_sentence_to_game_atlas(tmp_path):
    # 1. draft
    r = describe.draft_shapes(SENTENCE, out=tmp_path / "warden.shapes.json")
    assert r["what"] == "shapes" and Path(r["file"]).exists() and r["shapes"] >= 20
    names = {s["name"] for s in r["doc"]["shapes"]}
    assert {"hat", "skirt", "gourd_big", "cord_x1", "head"} <= names
    # 2. validate
    v = T.validate_file(tmp_path / "warden.shapes.json")
    assert v["ok"] and v["mode"] == "solid" and v["unbound_shapes"] == [], v
    doc = S.load_shapes(tmp_path / "warden.shapes.json")
    # 3. stills S and E: a full figure, the eyes lit
    for d in ("S", "E"):
        st = T.still(doc, tmp_path / f"still_{d}.png", direction=d, style="gothic_hd")
        assert st["ok"] and st["filled"] > 2500
    rgba = np.asarray(Image.open(tmp_path / "still_S.png"))
    glow = (rgba[..., 3] > 0) & (rgba[..., 2] > 180) & (rgba[..., 0] > 150)          # the miasma ramp's bright steps
    assert glow.sum() >= 2
    # 4. preview GIF of the walk
    g = T.gif_of(doc, "walk", "E", tmp_path / "walk_E.gif", style="gothic_hd", max_frames=6)
    assert Path(g["gif"]).exists() and g["frames"] == 6
    # 5. render idle + walk in S and E at the rendered-ARPG size, in the frames layout
    frames = tmp_path / "frames"
    rs = T.render_set(doc, frames, clips=["idle", "walk"], directions=["S", "E"], style="rendered_arpg", max_frames=4)
    assert rs["ok"] and sorted(rs["frames"]) == ["idle_E", "idle_S", "walk_E", "walk_S"] and rs["size"] >= 76
    assert (frames / "manifest.json").exists() and (frames / "animations.json").exists()
    # 6. the game's atlas with foot anchors
    manifest = json.loads((frames / "manifest.json").read_text())
    ex = export_godmarrow(frames, manifest, tmp_path / "game", "warden_shapes", max_frames=16)
    atlas = Image.open(ex["color"]["png"]) if isinstance(ex.get("color"), dict) else Image.open(ex["png"])
    data = json.loads(Path(ex["color"]["json"] if isinstance(ex.get("color"), dict) else ex["json"]).read_text())
    assert atlas.size[0] > 0 and set(data["meta"]["anims"]) == {"idle", "walk"}
    assert all(len(v) == 7 for v in data["idx"].values()) and "idle/down/0" in data["idx"] and "walk/side/0" in data["idx"]
    k, x, y, w, h, dx, dy = data["idx"]["walk/side/0"]
    assert w > 20 and h > 40 and abs(dy + h) <= 8
    assert "camera 12 deg" in data["meta"]["scale"]


def test_project_road_with_a_drafted_file(tmp_path):
    api.new_project(tmp_path / "proj", "p", style="rendered_arpg")
    from pixelforge.project import Project
    project = Project.load(tmp_path / "proj")
    api.add_character(project, "warden", SENTENCE)
    r = api.draft_shapes(SENTENCE, out=tmp_path / "warden.shapes.json")
    assert Path(r["file"]).exists()
    assert api.import_shapes(project, "warden", r["file"])["ok"]
    rr = api.render_shapes(project, "warden", clips="idle", directions="S")
    assert rr["ok"] and rr["frames"]["idle_S"] >= 4
    g = api.export_game(project, "warden", kind="warden_shapes", out_dir=tmp_path / "game")
    assert g["ok"] and (tmp_path / "game" / "warden_shapes.png").exists() and (tmp_path / "game" / "warden_shapes.json").exists()


def test_cli_sequence(tmp_path, capsys):
    from pixelforge.cli import main
    main(["shapes", "draft", SENTENCE, "-o", str(tmp_path / "w.shapes.json")])
    main(["shapes", "validate", str(tmp_path / "w.shapes.json")])
    assert "ok" in capsys.readouterr().out
    main(["shapes", "still", str(tmp_path / "w.shapes.json"), "-o", str(tmp_path / "w_S.png"), "--direction", "S", "--style", "gothic_hd"])
    assert "foot anchor" in capsys.readouterr().out
    main(["shapes", "render", str(tmp_path / "w.shapes.json"), "-o", str(tmp_path / "fr"), "--clips", "idle", "--directions", "S,E", "--frames", "3", "--style", "rendered_arpg", "--json"])
    out = json.loads(capsys.readouterr().out)
    assert out["ok"] and out["frames"]["idle_E"] == 3 and (tmp_path / "fr" / "idle_E" / "frame_002.png").exists()


def test_guide_render_command_as_written(tmp_path):
    """The guide's render command, run the way the guide says to run it without an install: from tools/pixelforge
    through ``python -m pixelforge``, with ``--gif``."""
    import subprocess
    import sys

    from PIL import Image

    here = Path(__file__).resolve().parents[1]
    cmd = [sys.executable, "-m", "pixelforge", "shapes", "render", str(S.ASSETS / "characters" / "keeper.shapes.json"), "-o", str(tmp_path / "frames"),
           "--style", "gothic_hd", "--clips", "idle", "--directions", "S", "--frames", "2", "--gif"]
    proc = subprocess.run(cmd, cwd=str(here), capture_output=True, text=True, timeout=600)
    assert proc.returncode == 0, proc.stderr[-2000:]
    assert "NameError" not in proc.stderr and "1 clips x 1 directions" in proc.stdout
    assert Image.open(tmp_path / "frames" / "idle_S.gif").n_frames == 2
