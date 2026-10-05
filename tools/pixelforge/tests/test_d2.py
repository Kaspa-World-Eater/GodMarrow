"""The Diablo 2 bridge: the formats (DCC, DC6, COF, palettes, AnimData.d2) as round trips, the act-palette quantiser, the
repository-tree refusal, the importer on a synthetic token, the mod export in both layouts with its validator, the
clip-to-mode mapping, the measure report, the skill port's rows, the play plan, the CLI parsers."""
import json
import os
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from pixelforge.d2 import animdata, cof as COF, dc6, dcc, measure, modexport, pal, paths, port, synthetic, tables
from pixelforge.d2.importer import CLIP_TO_MODE, MODE_TO_CLIP, import_token
from pixelforge.d2.source import D2Source, find_case_insensitive

REPO = Path(__file__).resolve().parents[3]
SKILLS = REPO / "data" / "skills.json"


@pytest.fixture
def ref(tmp_path, monkeypatch):
    monkeypatch.setenv("PIXELFORGE_D2_DIR", str(tmp_path / "ref"))
    monkeypatch.delenv("PIXELFORGE_D2_GAME", raising=False)
    monkeypatch.setattr(paths, "_registry_paths", lambda: [])
    monkeypatch.setattr(paths, "USUAL_FOLDERS", [])
    synthetic.make_token(tmp_path / "ref", "ZZ", frames=5)
    return tmp_path / "ref"


def _frames(rng, n=4, w=30, h=40, colours=(3, 40, 41, 100)):
    out = []
    for k in range(n):
        px = np.zeros((h, w), np.uint8)
        px[6:h - 2, 9 + k:21 + k] = colours[1]
        px[0:6, 12:18] = colours[2]
        px[10:16, 8:12] = colours[3]
        px[h - 2:, 9:21] = colours[0]
        out.append(dcc.Frame(px, -15 + k, -(h - 1)))
    return out


# ---------------------------------------------------------------- formats
def test_bits_round_trip():
    from pixelforge.d2.bits import BitReader, BitWriter
    w = BitWriter()
    vals = [(5, 3), (1023, 10), (0, 0), (1, 1), (123456, 20), (7, 32)]
    for v, n in vals:
        w.bits(v, n)
    w.signed(-5, 6); w.signed(3, 4)
    r = BitReader(w.bytes())
    assert [r.bits(n) for _, n in vals] == [v for v, _ in vals]
    assert r.signed(6) == -5 and r.signed(4) == 3


def test_dcc_round_trip_pixel_identical_over_directions_and_offsets():
    rng = np.random.default_rng(0)
    dirs = [_frames(rng), [dcc.Frame(f.pixels.copy(), f.left + 3, f.top - 1) for f in _frames(rng)]]
    d = dcc.DCC(dirs)
    data, rep = dcc.encode(d, pal.synthetic_palette().lab)
    assert data[:1] == b"\x74" and rep["cells_reduced"] == 0
    back = dcc.decode(data)
    assert len(back.directions) == 2 and back.frames_per_direction == 4
    for A, B in zip(dirs, back.directions):
        for a, b in zip(A, B):
            assert (a.left, a.top, a.width, a.height) == (b.left, b.top, b.width, b.height)
            assert np.array_equal(a.pixels, b.pixels)


def test_dcc_equal_cells_and_odd_sizes_decode_exactly():
    # frames of unequal size where many cells repeat between frames (the equal-cell path) and edges are not multiples of 4
    frames = []
    for k in range(5):
        px = np.zeros((33 + k % 2, 21), np.uint8)
        px[3:30, 2:19] = 50
        px[5 + k:9 + k, 4:8] = 60
        px[0, 0] = 2
        frames.append(dcc.Frame(px, -10 - (k % 3), -32))
    data, _ = dcc.encode(dcc.DCC([frames]))
    back = dcc.decode(data)
    for a, b in zip(frames, back.directions[0]):
        assert np.array_equal(a.pixels, b.pixels) and a.left == b.left and a.top == b.top


def test_dcc_reduces_cells_past_four_colours_and_keeps_transparency():
    rng = np.random.default_rng(3)
    px = rng.integers(1, 200, (16, 16)).astype(np.uint8)          # every cell has many colours
    px[0:4, 0:4] = 0; px[0, 0] = 9; px[0, 1] = 10; px[0, 2] = 11; px[0, 3] = 12; px[1, 0] = 13   # a cell with 0 and five colours
    d = dcc.DCC([[dcc.Frame(px, 0, -15)]])
    data, rep = dcc.encode(d, pal.synthetic_palette().lab)
    assert rep["cells_reduced"] > 0 and rep["pixels_changed"] > 0
    back = dcc.decode(data).directions[0][0].pixels
    assert back.shape == px.shape
    assert (back[0:4, 0:4] == 0).sum() == (px[0:4, 0:4] == 0).sum()           # transparent pixels stayed transparent
    for y in range(0, 16, 4):
        for x in range(0, 16, 4):
            assert len(np.unique(back[y:y + 4, x:x + 4])) <= 4


def test_dcc_sizes_follow_the_game_decoder_rules():
    frames = _frames(np.random.default_rng(1))
    data, rep = dcc.encode(dcc.DCC([frames]))
    coded = [dcc.dc6_coded_size(f.pixels) for f in frames]
    assert rep["final_dc6_size"] == 24 + sum(c + 39 for c in coded)
    import struct
    assert struct.unpack_from("<I", data, 11)[0] == rep["final_dc6_size"]
    with pytest.raises(dcc.DCCError):
        dcc.encode(dcc.DCC([[dcc.Frame(np.ones((300, 10), np.uint8), 0, 0)]]))


def test_dc6_round_trip_and_rle_size_match():
    frames = _frames(np.random.default_rng(2))
    data = dc6.encode(dcc.DCC([frames, frames]))
    back = dc6.decode(data)
    assert len(back.directions) == 2
    for a, b in zip(frames, back.directions[0]):
        assert np.array_equal(a.pixels, b.pixels) and (a.left, a.top) == (b.left, b.top)
    assert len(dc6.encode_rows(frames[0].pixels)) == dcc.dc6_coded_size(frames[0].pixels)


def test_cof_round_trip_and_fields():
    c = COF.make([COF.Layer("TR", 1, 1, 0, 0, "1HS"), COF.Layer("HD", 0, 1, 0, 0, "1HS")], 7, 8, 192, (-12, 13, -70, 1), trigger_frame=4)
    data = COF.encode(c)
    assert len(data) == 28 + 2 * 9 + 7 + 8 * 7 * 2 and data[3] == 20
    b = COF.decode(data)
    assert b.frames_per_direction == 7 and b.directions == 8 and b.speed == 192 and b.box == (-12, 13, -70, 1)
    assert b.triggers[4] == 1 and sum(b.triggers) == 1
    assert [l.composite for l in b.layers] == ["TR", "HD"] and b.layers[0].weapon_class == "1HS" and b.layers[0].shadow == 1
    assert b.order[3][2] == [1, 0]
    assert COF.direction_names(8) == ["SW", "NW", "NE", "SE", "S", "W", "N", "E"] and COF.direction_names(1) == ["S"]


def test_palette_dat_and_pl2_and_quantiser(tmp_path):
    P = pal.synthetic_palette()
    P.save_dat(tmp_path / "pal.dat")
    assert (tmp_path / "pal.dat").stat().st_size == 768
    Q = pal.ActPalette.load(tmp_path / "pal.dat")
    assert np.array_equal(P.rgb, Q.rgb)
    pl2 = bytearray()
    for r, g, b in P.rgb:
        pl2 += bytes([r, g, b, 0])
    pl2 += b"\0" * 2048
    (tmp_path / "pal.pl2").write_bytes(bytes(pl2))
    assert np.array_equal(pal.ActPalette.load(tmp_path / "pal.pl2").rgb, P.rgb)
    rgba = np.zeros((4, 4, 4), np.uint8)
    rgba[1:3, 1:3] = (*P.rgb[40], 255)              # an exact palette colour
    rgba[0, 0] = (P.rgb[41][0], P.rgb[41][1], P.rgb[41][2], 255)
    rgba[3, 3] = (200, 200, 200, 60)                # see-through: stays index 0
    idx, loss = P.quantise(rgba)
    assert idx[1, 1] == 40 and idx[0, 0] == 41 and idx[3, 3] == 0 and loss["pixels"] == 5 and loss["max"] == 0.0
    back = P.to_rgba(idx)
    assert back[1, 1, 3] == 255 and back[3, 3, 3] == 0 and tuple(back[1, 1, :3]) == tuple(P.rgb[40])
    off = rgba.copy(); off[1:3, 1:3, :3] = (255, 0, 255)          # nowhere near the ramps
    _, loss2 = P.quantise(off)
    assert loss2["mean"] > 0 and 0 < loss2["share_visible"] <= 1


def test_animdata_round_trip_hash_and_upsert(tmp_path):
    recs = [{"name": "NENUHTH", "frames": 12, "speed": 96, "triggers": {}}, {"name": "NEA1HTH", "frames": 16, "speed": 256, "triggers": {9: 1}}]
    recs = animdata.upsert(recs, "NENUHTH", 10, 128)
    assert [r["frames"] for r in recs] == [10, 16]
    tool = animdata.write(recs, tmp_path / "animdata.d2")
    assert tool in ("d2animdata", "built-in")
    back, _ = animdata.read(tmp_path / "animdata.d2")
    by = {r["name"]: r for r in back}
    assert by["NENUHTH"]["frames"] == 10 and by["NENUHTH"]["speed"] == 128 and by["NEA1HTH"]["triggers"] == {9: 1}
    assert animdata.hash_name("NENUHTH") == sum(b"NENUHTH") % 256
    assert animdata.speed_for_fps(25) == 256 and animdata.fps_for_speed(96) == 9.375
    # the built-in struct and the file agree on size: 256 counts + records of 160 bytes
    assert (tmp_path / "animdata.d2").stat().st_size == 256 * 4 + 2 * 160


def test_tables_round_trip(tmp_path):
    t = {"columns": ["Id", "a", "b"], "rows": [{"Id": "x", "a": "1", "b": ""}, {"Id": "Expansion", "a": "", "b": ""}]}
    tables.upsert_row(t, "Id", {"Id": "y", "a": "2", "c": "new"})
    tables.write(t, tmp_path / "t.txt")
    back = tables.read(tmp_path / "t.txt")
    assert back["columns"] == ["Id", "a", "b", "c"] and tables.find_row(back, "Id", "y")["c"] == "new" and tables.expansion_marker(back) == 1
    assert (tmp_path / "t.txt").read_bytes().count(b"\r\n") == 4


# ---------------------------------------------------------------- the rule
def test_every_writer_refuses_the_repository_tree(tmp_path, monkeypatch):
    inside = REPO / "tools" / "pixelforge" / "tests" / "_d2_should_never_exist"
    assert paths.inside_repo(inside) and not paths.inside_repo(tmp_path)
    with pytest.raises(paths.RepoTreeError):
        paths.guard_destination(inside)
    with pytest.raises(paths.RepoTreeError):
        synthetic.make_token(inside)
    monkeypatch.setenv("PIXELFORGE_D2_DIR", str(tmp_path / "ref"))
    synthetic.make_token(tmp_path / "ref", "ZZ", frames=3)
    src = D2Source(tmp_path / "ref")
    with pytest.raises(paths.RepoTreeError):
        import_token("ZZ", inside, src)
    with pytest.raises(paths.RepoTreeError):
        modexport.export_mod(tmp_path / "nothing", "NE", "m", inside, source=src)
    monkeypatch.setenv("PIXELFORGE_D2_DIR", str(inside))
    with pytest.raises(paths.RepoTreeError):
        paths.reference_dir()
    assert not inside.exists()


# ---------------------------------------------------------------- import, measure, export
def test_import_synthetic_token_to_our_frames(ref, tmp_path):
    src = D2Source(ref)
    assert src.describe()["characters"] == ["ZZ"] and src.token_kind("ZZ") == "character"
    r = import_token("ZZ", tmp_path / "frames", src)
    assert r["ok"] and r["kind"] == "character" and set(r["clips"]) == {"idle", "walk", "attack", "hit", "death"}
    for clip in ("idle", "walk", "attack"):
        for d in ("S", "SE", "E", "NE", "N", "NW", "W", "SW"):
            files = sorted((tmp_path / "frames" / f"{clip}_{d}").glob("frame_[0-9][0-9][0-9].png"))
            assert len(files) == 5, (clip, d)
    anims = json.loads((tmp_path / "frames" / "animations.json").read_text())
    assert anims["source"] == "d2" and anims["clip_fps"]["walk"] == 18.75 and anims["clip_fps"]["idle"] == 25.0
    im = np.asarray(Image.open(tmp_path / "frames" / "idle_S" / "frame_000.png").convert("RGBA"))
    assert im.shape[0] == im.shape[1] == anims["canvas_width"]
    a = im[..., 3] > 0
    ys = np.nonzero(a.any(axis=1))[0]
    assert ys.max() == int(anims["ground_y"])                          # the feet stand on the floor line
    assert abs(np.nonzero(a.any(axis=0))[0].mean() - anims["axis_x"]) < 2
    assert r["clips"]["attack"]["triggers"] == {3: 1}
    assert (tmp_path / "frames" / "manifest.json").exists() and (tmp_path / "frames" / "d2_import.json").exists()
    # the frames read like any PixelForge frames: the game export packs them
    from pixelforge.godmarrow_export import export_godmarrow
    out = export_godmarrow(tmp_path / "frames", json.loads((tmp_path / "frames" / "manifest.json").read_text()), tmp_path / "game", "zz")
    assert out["color"]["frames"] == 5 * 8 * 5


def test_case_insensitive_lookup_and_missing_file_words(ref, tmp_path):
    assert find_case_insensitive(ref, "DATA/GLOBAL/CHARS/zz/cof/zznuhth.cof") is not None
    src = D2Source(ref)
    with pytest.raises(paths.D2Error) as e:
        src.get("data/global/chars/QQ/COF/QQNUHTH.cof", "the test")
    assert "Diablo 2 was not found" in str(e.value) and "d2 set --game" in str(e.value)


def test_measure_report_numbers_and_markdown(ref, tmp_path):
    import_token("ZZ", tmp_path / "frames", D2Source(ref))
    m = measure.measure([tmp_path / "frames"], tmp_path / "d2_measure.md")
    s = m["sets"][0]
    assert s["figure"]["height"] == 40 and s["clips"]["walk"]["fps"] == 18.75 and s["clips"]["idle"]["frames"] == 5 and s["tier"] == "small"
    assert m["suggestion"]["figure_height"] == 40 and m["suggestion"]["clip_frames"] == 5
    md = (tmp_path / "d2_measure.md").read_text()
    assert "| ZZ | character | small | 40 |" in md and "not applied without" in md


def test_measure_write_preset_is_a_flag_and_reversible(ref, tmp_path, monkeypatch):
    from pixelforge import styles
    monkeypatch.setattr(styles, "OVERRIDES_FILE", tmp_path / "overrides.json")
    import_token("ZZ", tmp_path / "frames", D2Source(ref))
    measure.measure([tmp_path / "frames"])
    assert styles.get_style("godmarrow").figure_height == 195
    m = measure.measure([tmp_path / "frames"], write_preset="godmarrow")
    assert m["preset_written"]["values"]["figure_height"] == 40 and styles.get_style("godmarrow").figure_height == 40
    (tmp_path / "overrides.json").unlink()
    assert styles.get_style("godmarrow").figure_height == 195


def test_clip_to_mode_mapping():
    assert MODE_TO_CLIP["NU"] == "idle" and MODE_TO_CLIP["WL"] == "walk" and MODE_TO_CLIP["RN"] == "run" and MODE_TO_CLIP["A1"] == "attack"
    assert MODE_TO_CLIP["SC"] == "cast" and MODE_TO_CLIP["GH"] == "hit" and MODE_TO_CLIP["DT"] == "death" and MODE_TO_CLIP["DD"] == "dead"
    assert CLIP_TO_MODE["idle"] == "NU" and CLIP_TO_MODE["town_walk"] == "TW" and CLIP_TO_MODE["skill3"] == "S3"
    ours = {"clips": {"idle": {"S": [1]}, "walk": {"S": [2]}, "attack": {"S": [3]}, "death": {"S": [4, 5]}}}
    assert modexport.frames_for_mode(ours, "TN", False)[0] == "idle" and modexport.frames_for_mode(ours, "TN", True)[0] is None
    assert modexport.frames_for_mode(ours, "RN", False)[0] == "walk" and modexport.frames_for_mode(ours, "KK", False)[0] == "attack"
    clip, fr = modexport.frames_for_mode(ours, "DD", False)
    assert clip == "death" and fr["S"] == [5]
    assert set(modexport.CHARACTER_MODES) >= {"NU", "WL", "RN", "A1", "A2", "SC", "GH", "DT", "DD", "TN", "TW"}


def _our_frames(tmp_path, side=64, n=3, colours=((120, 80, 40), (200, 190, 170), (40, 60, 120))):
    root = tmp_path / "ours"
    clip_fps = {}
    for clip, fps in (("idle", 8.0), ("walk", 12.0), ("attack", 10.0), ("death", 6.0)):
        clip_fps[clip] = fps
        for d in ("S", "SE", "E", "NE", "N", "NW", "W", "SW"):
            f = root / f"{clip}_{d}"; f.mkdir(parents=True)
            for i in range(n):
                img = np.zeros((side, side, 4), np.uint8)
                img[20:60, 26 + i:38 + i] = (*colours[0], 255)
                img[12:20, 29:35] = (*colours[1], 255)
                img[30:36, 24 + i:28 + i] = (*colours[2], 255)
                Image.fromarray(img, "RGBA").save(f / f"frame_{i:03d}.png")
    (root / "animations.json").write_text(json.dumps({"fps": 10, "clip_fps": clip_fps, "ground_y": 59.0, "axis_x": 32.0, "source": "shapes"}))
    return root


def test_export_mod_character_direct_layout_validates_and_maps_speed(ref, tmp_path):
    ours = _our_frames(tmp_path)
    r = modexport.export_mod(ours, "NE", "pf_test", tmp_path / "install", target="character", layout="direct", source=D2Source(ref), weapon_classes=["HTH", "1HS"])
    assert r["ok"] and r["validation"]["ok"] and r["flags"] == ["-direct", "-txt"]
    data = tmp_path / "install" / "data" / "global"
    assert (data / "chars" / "NE" / "TR" / "NETRLITNUHTH.dcc").exists() and (data / "chars" / "NE" / "TR" / "NETRHVYWL1HS.dcc").exists()
    assert (data / "chars" / "NE" / "COF" / "NENUHTH.cof").exists() and (data / "chars" / "NE" / "COF" / "NEA11HS.cof").exists()
    assert (data / "animdata.d2").exists()
    assert r["modes"]["NU"]["speed"] == animdata.speed_for_fps(8.0) == 82 and r["modes"]["WL"]["speed"] == 123
    assert r["modes"]["TN"]["borrowed"] and r["modes"]["TN"]["clip"] == "idle" and r["modes"]["DD"]["frames"] == 1
    assert r["modes"]["A1"]["trigger_frame"] == 1 and r["modes"]["NU"]["trigger_frame"] is None
    c = COF.decode((data / "chars" / "NE" / "COF" / "NEA1HTH.cof").read_bytes())
    assert c.triggers == [0, 1, 0] and c.speed == 102 and c.layers[0].weapon_class == "HTH"
    recs, _ = animdata.read(data / "animdata.d2")
    assert animdata.find(recs, "NEWL1HS")["speed"] == 123 and animdata.find(recs, "ZXNUHTH") is not None    # the game's other records kept
    d = dcc.decode((data / "chars" / "NE" / "TR" / "NETRLITNUHTH.dcc").read_bytes())
    assert len(d.directions) == 8 and d.frames_per_direction == 3
    f = d.directions[4][0]            # D2 direction 4 is S
    assert f.bottom == 0 and f.left == -8 and f.width == 14 and f.height == 48       # feet on the origin; the body 12 px wide centred on the axis plus the arm at 24..28
    assert r["colour_loss"]["mean"] >= 0 and "colour" in r["colour_loss"]["words"]
    # the validator notices a damaged file
    bad = data / "chars" / "NE" / "TR" / "NETRLITNUHTH.dcc"
    bad.write_bytes(bad.read_bytes()[:40])
    v = modexport.validate_mod(r)
    assert not v["ok"] and any("NETRLITNUHTH" in p for p in v["problems"])
    assert modexport.remove_mod(tmp_path / "install")["removed"] > 0 and not (data / "chars" / "NE" / "COF" / "NENUHTH.cof").exists()


def test_export_mod_monster_d2r_layout_with_tables(ref, tmp_path):
    ours = _our_frames(tmp_path)
    r = modexport.export_mod(ours, "QQ", "pf_mon", tmp_path / "D2R", target="monster", layout="d2r", source=D2Source(ref), display_name="pf_wisp")
    assert r["ok"] and r["flags"] == ["-mod", "pf_mon", "-txt"]
    root = tmp_path / "D2R" / "mods" / "pf_mon" / "pf_mon.mpq"
    assert json.loads((root / "modinfo.json").read_text())["name"] == "pf_mon"
    assert (root / "data" / "global" / "monsters" / "QQ" / "TR" / "QQTRLITNUHTH.dcc").exists() and (root / "data" / "global" / "monsters" / "QQ" / "COF" / "QQWLHTH.cof").exists()
    ms2 = tables.read(root / "data" / "global" / "excel" / "MonStats2.txt")
    row = tables.find_row(ms2, "Id", "pf_wisp")
    assert row["TR"] == "1" and row["HD"] == "0" and row["TRv"] == "LIT" and row["mNU"] == "1" and row["mA1"] == "1" and row["dWL"] == "8" and row["TotalPieces"] == "1"
    ms = tables.read(root / "data" / "global" / "excel" / "MonStats.txt")
    mrow = tables.find_row(ms, "Id", "pf_wisp")
    assert mrow["Code"] == "QQ" and mrow["MonStatsEx"] == "pf_wisp" and mrow["*hcIdx"] == "2"
    assert set(r["modes"]) <= set(modexport.MONSTER_MODES) and "TN" not in r["modes"]


def test_export_mod_height_resamples(ref, tmp_path):
    ours = _our_frames(tmp_path)
    r = modexport.export_mod(ours, "NE", "pf_h", tmp_path / "inst", source=D2Source(ref), weapon_classes=["HTH"], height=24, only_our_clips=True)
    assert r["figure_height_in"] == 48 and r["figure_height_out"] == 24 and r["scale"] == 0.5
    d = dcc.decode((tmp_path / "inst" / "data" / "global" / "chars" / "NE" / "TR" / "NETRLITNUHTH.dcc").read_bytes())
    assert d.directions[4][0].height == 24 and sorted(r["modes"]) == ["A1", "DT", "NU", "WL"]


def test_export_mod_needs_animdata_from_the_game(tmp_path, monkeypatch):
    monkeypatch.setenv("PIXELFORGE_D2_DIR", str(tmp_path / "empty"))
    monkeypatch.setattr(paths, "_registry_paths", lambda: []); monkeypatch.setattr(paths, "USUAL_FOLDERS", [])
    (tmp_path / "empty" / "data" / "global" / "palette" / "ACT1").mkdir(parents=True)
    pal.synthetic_palette().save_dat(tmp_path / "empty" / "data" / "global" / "palette" / "ACT1" / "pal.dat")
    ours = _our_frames(tmp_path)
    with pytest.raises(paths.D2Error) as e:
        modexport.export_mod(ours, "NE", "m", tmp_path / "inst", source=D2Source(tmp_path / "empty"))
    assert "AnimData.d2" in str(e.value) and "d2 set --game" in str(e.value)


# ---------------------------------------------------------------- play, port, doctor, CLI
def test_play_plan_and_refusals(ref, tmp_path, monkeypatch):
    from pixelforge import api
    from pixelforge.d2 import play
    api.new_project(tmp_path / "proj", "Forge", "godmarrow")
    api.add_character(api.Project.load(tmp_path / "proj"), "keeper", "a keeper")
    r = play.plan("keeper", tmp_path / "proj")
    assert not r["ok"] and "Diablo 2 was not found" in r["error"]
    inst = tmp_path / "game"; inst.mkdir(); (inst / "Game.exe").write_bytes(b"MZ"); (inst / "d2data.mpq").write_bytes(b"")
    monkeypatch.setenv("PIXELFORGE_D2_GAME", str(inst))
    r = play.plan("keeper", tmp_path / "proj")
    assert not r["ok"] and "Render all" in r["error"]
    frames = _our_frames(tmp_path)
    import shutil
    shutil.copytree(frames, tmp_path / "proj" / "characters" / "keeper" / "frames")
    r = play.plan("keeper", tmp_path / "proj", token="ne")
    assert r["ok"] and r["layout"] == "direct" and r["flags"] == ["-direct", "-txt"] and r["token"] == "NE" and "open Diablo 2" in r["question"]
    # no agreement, no files
    r = play.play("keeper", tmp_path / "proj", ask=lambda q: "n", launch=False)
    assert not r["ok"] and "nothing was written" in r["error"] and not (inst / "data").exists()
    # agreed: the mod lands in the install, the shortcut carries the flags, no launch on this system
    shutil.copy(ref / "data" / "global" / "animdata.d2", inst / "animdata.d2")   # not where the source looks: the reference folder has it already
    r = play.play("keeper", tmp_path / "proj", yes=True, launch=False, weapon_classes=["HTH"])
    assert r["ok"], r
    assert (inst / "data" / "global" / "chars" / "NE" / "COF" / "NENUHTH.cof").exists()
    sc = Path(r["shortcut"]).read_text()
    assert "-direct -txt" in sc and str(inst) in sc and "Game.exe" in sc
    assert not r["launched"] and "NE token" in r["words"]
    # Resurrected: the mods layout and flags
    d2r = tmp_path / "d2r"; d2r.mkdir(); (d2r / "D2R.exe").write_bytes(b"MZ")
    monkeypatch.setenv("PIXELFORGE_D2_GAME", str(d2r))
    r = play.plan("keeper", tmp_path / "proj")
    assert r["ok"] and r["layout"] == "d2r" and r["flags"][0] == "-mod" and r["install"]["kind"] == "resurrected"


def test_find_install_words_and_settings(tmp_path, monkeypatch):
    monkeypatch.delenv("PIXELFORGE_D2_GAME", raising=False)
    monkeypatch.setattr(paths, "_registry_paths", lambda: []); monkeypatch.setattr(paths, "USUAL_FOLDERS", [])
    monkeypatch.setattr(paths, "user_settings_file", lambda: tmp_path / "u" / "d2.json")
    r = paths.find_install()
    assert not r["ok"] and "d2 set --game" in r["error"]
    inst = tmp_path / "Diablo II"; inst.mkdir(); (inst / "Diablo II.exe").write_bytes(b"MZ")
    paths.save_settings({"game": str(inst)})
    r = paths.find_install()
    assert r["ok"] and r["kind"] == "classic" and "settings" in r["how"] and r["exe"].endswith("Diablo II.exe")
    assert paths.mpq_files(inst) == []
    (inst / "d2data.mpq").write_bytes(b""); (inst / "patch_d2.mpq").write_bytes(b"")
    assert [p.name for p in paths.mpq_files(inst)] == ["patch_d2.mpq", "d2data.mpq"]


def test_port_skills_rows_on_templates(ref, tmp_path):
    src = D2Source(ref)
    r = port.port_skills("KEEPER", tmp_path / "port", source=src, skills_file=SKILLS)
    assert r["ok"] and r["complete"] and r["charclass"] == "ass" and r["class"] == "Shrine Keeper"
    ids = [s["id"] for s in r["skills"]]
    assert ids == ["vblade", "mcloud", "shuriken"]
    assert [s["template"] for s in r["skills"]] == ["Poison Dagger", "Holy Fire", "Plague Javelin"] and all(s["template_found"] for s in r["skills"])
    t = tables.read(tmp_path / "port" / "Skills.txt")
    row = tables.find_row(t, "skill", "gm_vblade")
    assert row["charclass"] == "ass" and row["skilldesc"] == "gm_vblade" and row["reqlevel"] == "1" and row["manashift"] == "5" and row["mana"] == "77"   # 9.6 * 8
    assert row["lvlmana"] == "4" and row["EType"] == "pois" and row["srvdofunc"] == "24"      # inherited from Poison Dagger
    assert int(row["Id"]) > 400 and tables.find_row(t, "skill", "Poison Dagger") is not None     # the game's rows stay
    cloud = tables.find_row(t, "skill", "gm_mcloud")
    assert cloud["passive"] == "1" and cloud["aura"] == "1" and cloud["aurarangecalc"] not in ("", "43")
    fan = tables.find_row(t, "skill", "gm_shuriken")
    assert fan["srvmissile"] == "plaguejavelin" and fan["Param1"] != ""
    d = tables.read(tmp_path / "port" / "SkillDesc.txt")
    drow = tables.find_row(d, "skilldesc", "gm_vblade")
    assert drow["str name"] == "Venom Claws" and drow["SkillPage"] == "1" and drow["SkillRow"] == "1" and drow["SkillColumn"] == "1" and "%d" in drow["desctexta2"]
    assert any("slow" in c for c in r["skills"][0]["cannot"])
    # without the game's tables: fragments, still the three rows
    r2 = port.port_skills("miasmancer", tmp_path / "frag", skills_file=SKILLS)
    assert not r2["complete"] and "fragments" in r2["note"]
    t2 = tables.read(tmp_path / "frag" / "Skills.txt")
    assert [x["skill"] for x in t2["rows"]] == ["gm_vblade", "gm_mcloud", "gm_shuriken"] and t2["rows"][0]["anim"] == "A1"


def test_doctor_and_cli_parsers(ref, tmp_path):
    from pixelforge.cli import build_parser
    from pixelforge.d2.cli import doctor
    d = doctor()
    assert d["ok"] is False and d["reference"]["path"] == str(ref) and d["game"]["ok"] is False and "install" in d["words"].lower()
    p = build_parser()
    a = p.parse_args(["d2", "import", "--token", "ne", "--out", str(tmp_path / "x"), "--act", "2"])
    assert a.d2_cmd == "import" and a.token == "ne" and a.act == 2
    a = p.parse_args(["d2", "export-mod", "--frames", str(tmp_path), "--as", "NE", "--mod", "m", "--out", str(tmp_path), "--layout", "d2r", "--target", "monster"])
    assert a.layout == "d2r" and a.target == "monster" and a.token == "NE"
    a = p.parse_args(["d2", "play", "--character", "keeper", "-p", str(tmp_path), "--yes", "--no-launch"])
    assert a.yes and a.no_launch
    a = p.parse_args(["d2", "port-skills", "--class", "KEEPER", "--out", str(tmp_path)])
    assert a.class_name == "KEEPER"
    for verb in ("list", "doctor", "fetch-tools", "measure", "set", "demo-token", "remove-mod"):
        extra = [str(tmp_path)] if verb in ("measure", "remove-mod") else (["--out", str(tmp_path)] if verb == "demo-token" else [])
        assert p.parse_args(["d2", verb] + extra).d2_cmd == verb


def _last_json(text: str) -> dict:
    """The JSON object a --json run prints last (indented over several lines, as the Forge reads it)."""
    i = text.rfind("\n{")
    return json.loads(text[i + 1:] if i >= 0 else text)


def test_cli_demo_import_and_export_json(ref, tmp_path, capsys):
    from pixelforge.cli import main
    main(["d2", "list", "--json"])
    out = _last_json(capsys.readouterr().out)
    assert out["ok"] and out["characters"] == ["ZZ"]
    main(["d2", "import", "--token", "ZZ", "--out", str(tmp_path / "fr"), "--json"])
    out = _last_json(capsys.readouterr().out)
    assert out["ok"] and out["frame_count"] == 5 * 8 * 5
    with pytest.raises(SystemExit) as e:
        main(["d2", "import", "--token", "ZZ", "--out", str(REPO / "tools" / "pixelforge" / "_never"), "--json"])
    assert e.value.code == 1
    out = _last_json(capsys.readouterr().out)
    assert not out["ok"] and "inside the repository" in out["error"]
    main(["d2", "export-mod", "--frames", str(tmp_path / "fr"), "--as", "NE", "--mod", "m", "--out", str(tmp_path / "inst"), "--weapon-classes", "HTH", "--json"])
    out = _last_json(capsys.readouterr().out)
    assert out["ok"] and out["validation"]["ok"] and out["file_count"] > 20
