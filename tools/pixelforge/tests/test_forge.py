"""The Forge app's launcher and the CLI additions it relies on (forge_launch, project run flags, game-preview --play/--import)."""
import json
from pathlib import Path

import pytest

from pixelforge import forge_launch, game_preview
from pixelforge.cli import build_parser

FORGE = Path(__file__).resolve().parent.parent / "forge"


def test_forge_project_is_there_and_plain():
    assert (FORGE / "project.godot").exists()
    text = (FORGE / "project.godot").read_text()
    assert 'run/main_scene="res://scenes/main.tscn"' in text
    assert 'window/stretch/scale_mode="integer"' in text and 'window/stretch/aspect="keep"' in text
    assert "window/size/mode=3" in text   # full screen by default
    # every screen the shell names exists, and no script needs the editor's class registry
    app = (FORGE / "scripts/app.gd").read_text()
    for line in app.splitlines():
        if '"res://scripts/' in line and ".gd" in line and line.strip().startswith('"'):
            path = line.split('"res://')[1].split('"')[0]
            assert (FORGE / path).exists(), path
    for gd in FORGE.rglob("*.gd"):
        assert not gd.read_text().startswith("class_name"), gd


def test_forge_launch_command_carries_python_game_and_screen(tmp_path):
    cmd = forge_launch.command("/x/godot", python="/py", game="/game", project=tmp_path, screen="spell", windowed=True, extra=["--advanced"])
    assert cmd[:3] == ["/x/godot", "--path", str(FORGE)]
    assert "--windowed" in cmd[:4]
    i = cmd.index("--")
    tail = cmd[i + 1:]
    assert "--python=/py" in tail and "--game=/game" in tail and f"--project={tmp_path}" in tail and "--screen=spell" in tail
    assert tail[-1] == "--advanced" and "--windowed" in tail


def test_forge_launch_without_godot_is_a_plain_error(monkeypatch):
    monkeypatch.setattr(forge_launch, "find_godot", lambda hint=None: None)
    r = forge_launch.launch(download=False)
    assert r["ok"] is False and "Godot" in r["error"]


def test_forge_launch_runs_the_command(monkeypatch, tmp_path):
    monkeypatch.setattr(forge_launch, "find_godot", lambda hint=None: "/fake/godot")
    seen = {}

    class P:
        pid = 4242

    def popen(cmd, **kw):
        seen["cmd"] = cmd
        return P()

    monkeypatch.setattr(forge_launch.subprocess, "Popen", popen)
    r = forge_launch.launch(project=tmp_path, screen="home")
    assert r["ok"] and r["pid"] == 4242 and seen["cmd"][0] == "/fake/godot" and "--screen=home" in seen["cmd"]


def test_cli_run_flags_reach_the_steps():
    p = build_parser()
    a = p.parse_args(["project", "run", "hero", "split", "--tolerance", "0.12", "--views", "4", "--json"])
    from pixelforge.cli import _run_kwargs
    assert _run_kwargs(a) == {"tolerance": 0.12, "expected_views": 4}
    a = p.parse_args(["project", "run", "hero", "render", "--per-clip", "12", "--actions", "walk,idle"])
    kw = _run_kwargs(a)
    assert kw["per_clip"] == 12 and kw["actions"] == ["walk", "idle"] and kw["elevation"] == 30.0
    a = p.parse_args(["project", "run", "hero", "model", "--model-mode", "hull"])
    assert _run_kwargs(a) == {"mode": "hull"}
    a = p.parse_args(["project", "run", "hero", "pixelate", "--outline", "none"])
    assert _run_kwargs(a) == {"outline": None}
    a = p.parse_args(["project", "preview-gif", "hero", "--clip", "idle", "--dir", "W"])
    assert a.project_cmd == "preview-gif" and a.clip == "idle" and a.dir == "W"
    a = p.parse_args(["forge", "--screen", "spell", "--windowed", "--json"])
    assert a.screen == "spell" and a.windowed
    a = p.parse_args(["game-preview", "--play", "--import"])
    assert a.play and a.do_import


def test_game_preview_play_is_the_plain_game(tmp_path):
    (tmp_path / "project.godot").write_text("")
    cmd = game_preview.preview_command("/g", tmp_path, play=True)
    assert cmd == ["/g", "--path", str(tmp_path)]
    cmd = game_preview.preview_command("/g", tmp_path, skin="keeper", fx=["nova"])
    assert "--skin=keeper" in cmd and "--fx=nova" in cmd and "--" in cmd


def test_import_game_runs_the_headless_import(monkeypatch, tmp_path):
    (tmp_path / "project.godot").write_text("")
    seen = {}

    class R:
        returncode = 0
        stdout = "ok"
        stderr = ""

    def run(cmd, **kw):
        seen["cmd"] = cmd
        return R()

    monkeypatch.setattr(game_preview.subprocess, "run", run)
    monkeypatch.setattr(game_preview, "find_godot", lambda hint=None: "/g")
    r = game_preview.import_game(tmp_path, godot="/g")
    assert r["ok"] and seen["cmd"] == ["/g", "--headless", "--path", str(tmp_path), "--import"]


@pytest.fixture
def project(tmp_path):
    import numpy as np
    from PIL import Image
    from pixelforge import api
    from pixelforge.project import Project

    rng = np.random.default_rng(1)
    pal = rng.integers(40, 255, (6, 3)).astype(np.uint8)
    fig = Image.fromarray(pal[rng.integers(0, 6, (80, 30))]).convert("RGBA")
    api.new_project(tmp_path / "game", "Game", "16bit")
    p = Project.load(tmp_path / "game")
    api.add_character(p, "Test Hero", "a hero with a lantern")
    sheet = Image.new("RGB", (3 * 30 + 4 * 20, 120), (255, 255, 255))
    for i in range(3):
        sheet.paste(fig, (20 + i * 50, 20))
    sheet.save(tmp_path / "sheet.png")
    api.import_source(p, "test_hero", "sheet", tmp_path / "sheet.png")
    return Project.load(tmp_path / "game")


def test_build_model_writes_a_hull_preview_before_blender(project, monkeypatch):
    from pixelforge import api

    api.split(project, "test_hero")
    api.make_palette(project, "test_hero")
    monkeypatch.setattr(api, "find_blender", lambda p=None: None)
    with pytest.raises(api.StepError, match="Blender"):
        api.build_model(project, "test_hero", mode="hull")
    hull = project.sub("test_hero", "model") / "test_hero_hull.png"
    assert hull.exists()
    assert project.character("test_hero").settings["model_mode"] == "hull"


def test_the_pictures_and_assets_the_app_needs_are_committed():
    for n in ["character", "object", "spell", "tiles", "ui", "sound", "fix", "play", "settings", "icon"]:
        assert (FORGE / "assets/pics" / f"{n}.png").exists(), n
    for n in ["Silkscreen-Regular.ttf", "IMFeENrm28P.ttf", "IMFeENsc28P.ttf", "IMFeENit28P.ttf", "OFL.txt"]:
        assert (FORGE / "assets/fonts" / n).exists(), n
    for n in ["pf_bone_frame", "pf_iron_frame", "pf_teal_ward_frame", "pf_vellum_panel"]:
        assert (FORGE / "assets/ui" / f"{n}.png").exists() and json.loads((FORGE / "assets/ui" / f"{n}.json").read_text())["margins"]
    assert (FORGE / "assets/sfx/LICENSE_kenney.txt").exists()
