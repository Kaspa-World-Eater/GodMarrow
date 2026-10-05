"""The tool adapters (pixelforge/tools): finding without installing, honest status, command construction and output parsing
with mocks (only ffmpeg, ImageMagick, rembg and Godot are likely present here), the .mod export, the map converters, the
MCP registration and the CLI."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from PIL import Image

from pixelforge import tools as T
from pixelforge.tools import _base as B
from pixelforge.tools import aseprite, blender, ffmpeg, furnace, godot, imagemagick, ldtk, libresprite, pixelorama, rembg, tiled


class Done:
    def __init__(self, code=0, out="", err=""):
        self.returncode, self.stdout, self.stderr = code, out, err


@pytest.fixture
def frames(tmp_path):
    d = tmp_path / "idle_S"
    d.mkdir()
    out = []
    for i in range(4):
        p = d / f"frame_{i:03d}.png"
        Image.new("RGBA", (8, 8), (10 * i, 20, 30, 255)).save(p)
        out.append(str(p))
    return d, out


def fake_call(record: list, touch_last: bool = True, out_text: str = ""):
    """A `_base.call` that records the command and writes the file named by its last argument (what the tool would make)."""
    def _call(cmd, timeout=60.0, cwd=None):
        record.append([str(c) for c in cmd])
        if touch_last:
            for arg in cmd:                      # the outputs a tool would write: paths named on the line that do not exist yet
                out = Path(str(arg))
                if out.suffix.lower() in (".png", ".gif", ".json", ".wav", ".ogg", ".mp4", ".aseprite") and not out.exists() and "%" not in str(arg) and "{" not in str(arg):
                    out.parent.mkdir(parents=True, exist_ok=True)
                    out.write_bytes(b"x")
        return Done(0, out_text)
    return _call


# ---------------------------------------------------------------- status: honest, complete, never installing
def test_status_lists_every_tool_with_the_install_sentence(monkeypatch):
    monkeypatch.setattr(B.shutil, "which", lambda n: None)
    monkeypatch.setattr(B, "env_override", lambda n: None)
    for m in (blender, godot, rembg):
        monkeypatch.setattr(m, "find", lambda: None)
    s = T.status(with_version=False)
    names = [r["name"] for r in s["tools"]]
    assert names == T.ADAPTERS and len(names) == 13
    for r in s["tools"]:
        assert r["install"].endswith(".") and r["home"].startswith("https://") and r["licence"] and r["what"]
        if not r["browser"]:
            assert r["found"] is False, r["name"]
    assert set(s["browser"]) == {"mixamo", "midjourney"} and not s["found"] and len(s["missing"]) == 11
    text = T.format_status(s)
    assert "missing  Aseprite" in text and "browser  Mixamo" in text and "found 0" in text


def test_found_tools_here_are_reported_as_found():
    s = T.status(with_version=False)
    here = set(s["found"])
    if shutil.which("ffmpeg"):
        assert "ffmpeg" in here
    if shutil.which("convert") or shutil.which("magick"):
        assert "imagemagick" in here
    assert "mixamo" not in here and "midjourney" not in here


def test_missing_tool_action_returns_the_install_sentence_not_a_traceback(monkeypatch):
    monkeypatch.setattr(aseprite, "find", lambda: None)
    r = aseprite.run("sheet", frames_dir="/nowhere")
    assert r["ok"] is False and r["missing"] and "aseprite.org" in r["error"]
    r = aseprite.run("no_such_action")
    assert r["ok"] is False and "no action" in r["error"] and "sheet" in r["error"]
    assert aseprite.run("status")["found"] is False      # status is an offline action


def test_get_knows_aliases_and_refuses_unknown_names():
    assert T.get("magick").NAME == "imagemagick" and T.get("Aseprite").NAME == "aseprite"
    with pytest.raises(KeyError):
        T.get("photoshop")
    assert T.run("photoshop", "open")["ok"] is False


def test_env_override_names_the_executable(monkeypatch, tmp_path):
    exe = tmp_path / "aseprite-here"
    exe.write_text("")
    monkeypatch.setenv("PIXELFORGE_ASEPRITE", str(exe))
    assert aseprite.find() == str(exe)


def test_which_takes_path_then_candidates(monkeypatch, tmp_path):
    cand = tmp_path / "Tool" / "tool.exe"
    cand.parent.mkdir()
    cand.write_text("")
    monkeypatch.setattr(B.shutil, "which", lambda n: None)
    assert B.which(["tool"], [str(tmp_path / "Tool" / "*.exe")]) == str(cand)
    assert B.which(["tool"], [str(tmp_path / "nothing")]) is None
    monkeypatch.setattr(B.shutil, "which", lambda n: "/usr/bin/tool" if n == "tool" else None)
    assert B.which(["tool"], []) == "/usr/bin/tool"


# ---------------------------------------------------------------- Aseprite, LibreSprite, Pixelorama
def test_aseprite_import_script_and_commands(frames):
    d, fr = frames
    lua = aseprite.import_script(fr, str(d / "idle.aseprite"), fps=10)
    assert "app.open(files[1])" in lua and lua.count(".png") == 4 and "spr:newEmptyFrame()" in lua and 'saveAs("' in lua and "0.100" in lua
    assert aseprite.script_command("ase", "x.lua", ["a.png"], {"k": 1}) == ["ase", "-b", "a.png", "--script-param", "k=1", "--script", "x.lua"]
    assert aseprite.export_command("ase", "s.aseprite", "f_{frame000}.png") == ["ase", "-b", "s.aseprite", "--save-as", "f_{frame000}.png"]
    cmd = aseprite.sheet_command("ase", fr[:2], "sheet.png", "sheet.json")
    assert cmd[:2] == ["ase", "-b"] and "--sheet" in cmd and "--data" in cmd and cmd[cmd.index("--format") + 1] == "json-array" and "--sheet-type" in cmd


def test_aseprite_open_builds_the_sprite_waits_and_reads_the_frames_back(monkeypatch, frames):
    d, fr = frames
    calls = []
    monkeypatch.setattr(aseprite, "find", lambda: "/x/aseprite")
    monkeypatch.setattr(B, "call", fake_call(calls, touch_last=False))

    def build_call(cmd, timeout=60.0, cwd=None):
        calls.append([str(c) for c in cmd])
        if "--script" in cmd:
            script = Path(cmd[cmd.index("--script") + 1]).read_text()
            out = script.split('saveAs("')[1].split('"')[0]
            Path(out).write_bytes(b"ase")
        elif "--save-as" in cmd:
            Image.new("RGBA", (8, 8), (1, 2, 3, 255)).save(fr[1])       # the person painted frame 1
        return Done(0)
    monkeypatch.setattr(B, "call", build_call)
    waited = []
    monkeypatch.setattr(B, "wait_for", lambda cmd, cwd=None, timeout=None: (waited.append(list(cmd)) or {"ok": True, "returncode": 0, "seconds": 3.0}))
    r = aseprite.run("open", frames_dir=str(d))
    assert r["ok"] and r["frames"] == 4 and waited == [["/x/aseprite", str(d / "idle_S.aseprite")]]
    assert any("--script" in c for c in calls) and any("--save-as" in c and c[-1].endswith("frame_{frame000}.png") for c in calls)
    assert r["changed"] == [fr[1]]


def test_libresprite_shares_the_command_line_and_opens_the_files(monkeypatch, frames):
    d, fr = frames
    monkeypatch.setattr(libresprite, "find", lambda: "/x/libresprite")
    waited = []

    def wait(cmd, cwd=None, timeout=None):
        waited.append(list(cmd))
        Image.new("RGBA", (8, 8), (9, 9, 9, 255)).save(fr[2])
        return {"ok": True, "returncode": 0, "seconds": 1.0}
    monkeypatch.setattr(B, "wait_for", wait)
    r = libresprite.run("open", frames_dir=str(d))
    assert r["ok"] and waited[0][0] == "/x/libresprite" and len(waited[0]) == 5 and r["changed"] == [fr[2]]
    calls = []
    monkeypatch.setattr(B, "call", fake_call(calls))
    r = libresprite.run("sheet", frames_dir=str(d), out_png=str(d / "sheet.png"))
    assert r["ok"] and calls[0][:2] == ["/x/libresprite", "-b"] and "--sheet" in calls[0]


def test_pixelorama_is_open_and_wait_only(monkeypatch, frames):
    d, fr = frames
    monkeypatch.setattr(pixelorama, "find", lambda: "/x/pixelorama")
    monkeypatch.setattr(B, "wait_for", lambda cmd, cwd=None, timeout=None: {"ok": True, "returncode": 0, "seconds": 2.0})
    assert sorted(pixelorama.ACTIONS) == ["open", "status"]
    r = pixelorama.run("open", files=fr[:2])
    assert r["ok"] and r["changed"] == [] and r["command"] == ["/x/pixelorama", fr[0], fr[1]]
    monkeypatch.setattr(B, "wait_for", lambda cmd, cwd=None, timeout=None: {"ok": False, "error": "Pixelorama could not be started (x)."})
    assert "could not be started" in pixelorama.run("open", files=fr[:1])["error"]


# ---------------------------------------------------------------- Furnace and the .mod export
@pytest.fixture
def song(tmp_path):
    from pixelforge.music import compose as C, song as S
    s = C.compose("dungeon_synth", "dark", None, 72, 4, 3, "Crypt")
    return S.save(s, tmp_path / "crypt.song.json")


def test_mod_export_writes_a_protracker_file_furnace_opens(song, tmp_path):
    from pixelforge.music import mod_export
    r = mod_export.export_mod(song, tmp_path / "crypt.mod")
    assert r["ok"] and r["patterns"] >= 1 and 1 <= r["samples"] <= 31 and r["channels"] == 4 and r["tempo"] == 72
    h = mod_export.read_header(r["mod"])
    assert h["tag"] == "M.K." and h["title"] == "Crypt" and h["patterns"] == r["patterns"] and len(h["samples"]) == r["samples"]
    first = h["first_row"][0]
    assert first["effect"] == 0xF and first["param"] == 72                      # the tempo on the first row
    size = Path(r["mod"]).stat().st_size
    assert size >= 1084 + 1024 * r["patterns"]
    assert mod_export._note(60) == 428 and mod_export._note(48) == 856 and mod_export._note(84) == 428 - 0 or mod_export._note(84) in mod_export.PERIODS
    assert mod_export.wave_kind("lead_square") == "square" and mod_export.wave_kind("strings_dark") == "saw" and mod_export.wave_kind("pad_dark") == "triangle"


def test_furnace_export_is_offline_and_render_uses_its_command_line(monkeypatch, song, tmp_path):
    monkeypatch.setattr(furnace, "find", lambda: None)
    r = furnace.run("export_mod", song=song)
    assert r["ok"] and r["mod"].endswith("crypt.mod") and Path(r["mod"]).exists()
    assert "furnace/releases" in furnace.run("render", song_file=r["mod"])["error"]
    monkeypatch.setattr(furnace, "find", lambda: "/x/furnace")
    calls = []
    monkeypatch.setattr(B, "call", fake_call(calls, touch_last=False))

    def render_call(cmd, timeout=60.0, cwd=None):
        calls.append([str(c) for c in cmd])
        Path(cmd[cmd.index("-output") + 1]).write_bytes(b"RIFF")
        return Done(0)
    monkeypatch.setattr(B, "call", render_call)
    r2 = furnace.run("render", song_file=song, loops=2)
    assert r2["ok"] and calls[-1] == ["/x/furnace", "-output", str(tmp_path / "crypt.wav"), "-loops", "2", str(tmp_path / "crypt.mod")]
    waited = []
    monkeypatch.setattr(B, "wait_for", lambda cmd, cwd=None, timeout=None: (waited.append(list(cmd)) or {"ok": True, "returncode": 0, "seconds": 5.0}))
    r3 = furnace.run("open", song=song)
    assert r3["ok"] and waited == [["/x/furnace", str(tmp_path / "crypt.mod")]]


# ---------------------------------------------------------------- Blender, Godot
def test_blender_and_godot_wrap_the_existing_finders(monkeypatch):
    assert blender.script_command("/b", "s.py", ["a", "1"], "x.blend") == ["/b", "-b", "x.blend", "--python", "s.py", "--", "a", "1"]
    monkeypatch.setattr(blender, "find", lambda: None)
    assert "blender.org" in blender.run("run_script", script="x.py")["error"]
    assert godot.script_command("/g", "/game", "res://tools/t.gd") == ["/g", "--headless", "--path", "/game", "--script", "res://tools/t.gd"]
    assert godot.script_command("/g", "/game", "/game/tools/t.gd")[-1] == "res://tools/t.gd"
    assert godot.import_command("/g", "/game") == ["/g", "--headless", "--path", "/game", "--import"]
    from pixelforge import game_preview
    monkeypatch.setattr(game_preview, "find_godot", lambda hint=None: "/found/godot")
    monkeypatch.setattr(B, "env_override", lambda n: None)
    assert godot.find() == "/found/godot"


# ---------------------------------------------------------------- ffmpeg, ImageMagick, rembg
def test_ffmpeg_commands(frames):
    d, fr = frames
    pattern, n = ffmpeg._pattern(str(d))
    assert pattern.endswith("frame_%03d.png") and n == 4
    cmd = ffmpeg.gif_command("ff", pattern, "out.gif", 12, 3)
    assert cmd[0] == "ff" and "-framerate" in cmd and "palettegen=reserve_transparent=1" in cmd[cmd.index("-vf") + 1] and "scale=iw*3:ih*3:flags=neighbor" in cmd[cmd.index("-vf") + 1] and cmd[-1] == "out.gif"
    a = ffmpeg.audio_command("ff", "a.wav", "a.ogg", 6)
    assert a[a.index("-c:a") + 1] == "libvorbis" and a[a.index("-q:a") + 1] == "6"
    assert "-c:a" not in ffmpeg.audio_command("ff", "a.wav", "a.mp3")
    v = ffmpeg.video_command("ff", pattern, "o.mp4", 8, 1)
    assert "libx264" in v and "yuv420p" in v[v.index("-vf") + 1]


def test_ffmpeg_gif_with_a_mock_and_for_real_when_present(monkeypatch, frames):
    d, fr = frames
    calls = []
    monkeypatch.setattr(ffmpeg, "find", lambda: "/x/ffmpeg")
    monkeypatch.setattr(B, "call", fake_call(calls))
    r = ffmpeg.run("gif", frames_dir=str(d), out=str(d / "idle.gif"), fps=10, zoom=2)
    assert r["ok"] and r["frames"] == 4 and calls[0][0] == "/x/ffmpeg" and r["gif"].endswith("idle.gif")
    monkeypatch.undo()
    if shutil.which("ffmpeg"):
        r = ffmpeg.run("gif", frames_dir=str(d), out=str(d / "real.gif"), fps=10, zoom=2)
        assert r["ok"], r
        im = Image.open(r["gif"])
        assert im.size == (16, 16) and getattr(im, "n_frames", 1) == 4


def test_imagemagick_commands_for_both_versions(frames):
    d, fr = frames
    assert imagemagick.is_v7("/usr/bin/magick") and not imagemagick.is_v7("/usr/bin/convert")
    s6 = imagemagick.strip_command("/usr/bin/convert", fr[:2], "s.png")
    assert s6[0] == "/usr/bin/convert" and s6[-2:] == ["+append", "s.png"] and "-background" in s6
    m6 = imagemagick.montage_command("/usr/bin/convert", fr, "m.png", 2)
    assert m6[0] == "/usr/bin/montage" and m6[m6.index("-tile") + 1] == "2x" and "+0+0" in m6
    m7 = imagemagick.montage_command("C:/im/magick.exe", fr, "m.png")
    assert m7[:2] == ["C:/im/magick.exe", "montage"]
    sc = imagemagick.scale_command("/usr/bin/magick", "a.png", "b.png", 4)
    assert sc[1:] == ["a.png", "-filter", "point", "-resize", "400%", "b.png"]


def test_imagemagick_strip_with_mock_and_real_when_present(monkeypatch, frames):
    d, fr = frames
    calls = []
    monkeypatch.setattr(imagemagick, "find", lambda: "/usr/bin/convert")
    monkeypatch.setattr(B, "call", fake_call(calls))
    r = imagemagick.run("strip", frames_dir=str(d), out=str(d / "strip.png"))
    assert r["ok"] and calls[0][-1].endswith("strip.png")
    monkeypatch.undo()
    if imagemagick.find():
        r = imagemagick.run("strip", frames_dir=str(d), out=str(d / "real_strip.png"))
        assert r["ok"] and Image.open(r["png"]).size == (32, 8)
        info = imagemagick.run("identify", file=fr[0])
        assert info["ok"] and info["width"] == 8 and info["height"] == 8


def test_rembg_command_through_the_module_or_the_executable():
    assert rembg.cutout_command("/usr/local/bin/rembg", "in.png", "out.png") == ["/usr/local/bin/rembg", "i", "-m", "u2net", "in.png", "out.png"]
    assert rembg.cutout_command(sys.executable + " -m rembg", "in.png", "out.png", "silueta") == [sys.executable, "-m", "rembg", "i", "-m", "silueta", "in.png", "out.png"]
    assert "170 MB" in rembg.NOTE and "170 MB" in rembg.INSTALL


# ---------------------------------------------------------------- Tiled and LDtk to one plain layout
def test_tiled_export_command_and_map_to_layout(tmp_path):
    assert tiled.export_command("/t", "m.tmx", "m.tmj") == ["/t", "--export-map", "json", "m.tmx", "m.tmj"]
    tmj = {"width": 3, "height": 2, "tilewidth": 16, "tileheight": 16, "orientation": "isometric",
           "tilesets": [{"name": "ground", "firstgid": 1, "image": "ground.png", "columns": 4}],
           "layers": [{"type": "tilelayer", "name": "floor", "width": 3, "height": 2, "data": [1, 2, 0, 3, 0, 2147483649]},
                      {"type": "group", "layers": [{"type": "objectgroup", "name": "things", "objects": [{"name": "chest", "type": "prop", "x": 16, "y": 32, "width": 16, "height": 16,
                                                                                                        "properties": [{"name": "locked", "value": True}]}]}]}]}
    src = tmp_path / "crypt.tmj"
    src.write_text(json.dumps(tmj))
    r = tiled.run("to_godot", map_json=str(src))      # offline: no Tiled needed
    assert r["ok"] and r["layers"] == 1 and r["objects"] == 1 and r["size"] == [3, 2]
    lay = json.loads(Path(r["file"]).read_text())
    assert lay["tool"] == "tiled" and lay["orientation"] == "isometric" and lay["layers"][0]["cells"] == [[1, 2, 0], [3, 0, 1]]   # the flip bits are stripped
    assert lay["objects"][0]["properties"] == {"locked": True} and lay["tilesets"][0]["image"] == "ground.png"


def test_ldtk_level_to_layout_and_version_from_the_file(tmp_path):
    ldtk_doc = {"jsonVersion": "1.5.3", "appBuildId": 473703, "defaultGridSize": 16,
                "defs": {"tilesets": [{"identifier": "Crypt", "uid": 7, "relPath": "crypt.png", "__cWid": 8, "tileGridSize": 16}]},
                "levels": [{"identifier": "Level_0", "pxWid": 48, "pxHei": 32, "fieldInstances": [{"__identifier": "zone", "__value": "crypt"}],
                            "layerInstances": [
                                {"__identifier": "Walls", "__type": "IntGrid", "__cWid": 3, "__cHei": 2, "__gridSize": 16, "intGridCsv": [1, 0, 1, 0, 0, 1], "autoLayerTiles": [{"px": [0, 0], "t": 4}]},
                                {"__identifier": "Floor", "__type": "Tiles", "__cWid": 3, "__cHei": 2, "__gridSize": 16, "__tilesetDefUid": 7, "gridTiles": [{"px": [16, 16], "t": 2}]},
                                {"__identifier": "Entities", "__type": "Entities", "__cWid": 3, "__cHei": 2, "__gridSize": 16,
                                 "entityInstances": [{"__identifier": "Lantern", "px": [32, 16], "width": 16, "height": 16, "fieldInstances": [{"__identifier": "lit", "__value": True}]}]}]}]}
    src = tmp_path / "crypt.ldtk"
    src.write_text(json.dumps(ldtk_doc))
    r = ldtk.run("to_godot", ldtk_file=str(src))
    assert r["ok"] and r["level"] == "Level_0" and r["layers"] == 2 and r["objects"] == 1 and r["size"] == [3, 2]
    lay = json.loads(Path(r["file"]).read_text())
    assert lay["layers"][0]["kind"] == "intgrid" and lay["layers"][0]["cells"] == [[5, 0, 1], [0, 0, 1]]     # the auto tile 4 -> id 5 on top of the intgrid value
    assert lay["layers"][1]["cells"] == [[0, 0, 0], [0, 3, 0]] and lay["objects"][0]["name"] == "Lantern" and lay["objects"][0]["properties"] == {"lit": True}
    assert lay["properties"] == {"zone": "crypt"}
    assert ldtk.version("/x/ldtk", str(src)) == "LDtk 473703" and ldtk.version("/x/ldtk") == ""


# ---------------------------------------------------------------- the MCP face and the CLI
def test_mcp_description_lists_the_actions_and_the_server_registers_one_tool_per_adapter():
    d = T.mcp_description("ffmpeg")
    assert "gif(" in d and "convert_audio(" in d and "ffmpeg.org" in d and "never installed" in d
    pytest.importorskip("mcp")
    from pixelforge.mcp_server import build_server
    import asyncio
    server = build_server()
    names = {t.name for t in asyncio.run(server.list_tools())}
    assert "tools_status" in names and {"tool_" + n for n in T.ADAPTERS} <= names


def test_cli_tools_status_and_explain(capsys):
    from pixelforge.cli import main
    main(["tools", "status", "--quick", "--json"])
    out = json.loads(capsys.readouterr().out)
    assert len(out["tools"]) == 13 and out["ok"]
    main(["tools", "explain", "furnace"])
    assert "furnace/releases" in capsys.readouterr().out
    main(["tools", "explain", "mixamo", "--json"])
    assert json.loads(capsys.readouterr().out)["found"] is False
