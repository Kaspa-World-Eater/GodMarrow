"""The music editor's engine: the song model, the renderer's speed, the composer, the scale lock, every edit
operation, the library and the CLI."""

from __future__ import annotations

import json
import subprocess
import sys
import time
import wave
from pathlib import Path

import numpy as np
import pytest

from pixelforge.music import compose as C, edit as E, library as L, render as R, song as S, synth, theory

ROOT = Path(__file__).resolve().parents[1]


def test_song_model_round_trip(tmp_path):
    s = S.new_song("Trial", tempo=96, key="C# minor", bars=2)
    assert s["root"] == 1 and s["scale"] == "minor" and S.key_text(s) == "C# minor"
    s["patterns"]["A"]["notes"]["lead"].append({"s": 3, "p": 61, "v": 0.7, "l": 2})
    p = S.save(s, tmp_path / "t.song.json")
    back = S.load(p)
    assert back["patterns"]["A"]["notes"]["lead"][0]["p"] == 61 and back["tempo"] == 96.0
    assert S.total_bars(back) == 2 and abs(S.bar_seconds(back) - 2.5) < 1e-9
    assert S.summary(back)["sections"] == ["A:Ax1"]
    # a hand-written file with a key string and lists for notes still loads
    (tmp_path / "h.json").write_text(json.dumps({"tempo": 100, "key": "D dorian", "patterns": {"P": {"bars": 1, "notes": {"bass": [[0, 38, 0.8, 4]]}}}}))
    h = S.load(tmp_path / "h.json")
    assert h["root"] == 2 and h["scale"] == "dorian" and h["patterns"]["P"]["notes"]["bass"][0] == {"s": 0, "p": 38, "v": 0.8, "l": 4.0}
    assert h["sections"][0]["pattern"] == "P" and h["fx"]["rate"] == 32000
    with pytest.raises(S.SongError):
        S.normalise({"tempo": 5, "patterns": {"A": {"bars": 1}}})
    with pytest.raises(S.SongError):
        S.normalise({"tempo": 100, "patterns": {"A": {"bars": 1}}, "sections": [{"pattern": "nope"}]})


def test_theory_scales_chords_and_snapping():
    assert theory.parse_key("C# minor") == (1, "minor") and theory.parse_key("Bb major") == (10, "major") and theory.parse_key("A") == (9, "minor")
    assert theory.note_name(61) == "C#4" and theory.parse_note("C#4") == 61 and theory.parse_note("Eb3") == 51
    assert theory.chord(0, "minor", 0, 4) == [60, 63, 67] and theory.chord(0, "major", 4, 3, "seventh") == [55, 59, 62, 65]
    assert theory.roman(0, "minor", 0) == "i" and theory.roman(0, "minor", 5) == "VI" and theory.roman(0, "major", 6) == "vii°"
    assert theory.snap(62, 1, "minor") in (61, 63) and theory.snap(61, 1, "minor") == 61 and theory.snap(62, 1, "minor", -1) == 61
    assert theory.step_in_scale(73, 1, 1, "minor") == 75 and theory.step_in_scale(73, -1, 1, "minor") == 71 and theory.step_in_scale(73, 7, 1, "minor") == 85
    v = theory.smooth_voicing([60, 64, 67], [57, 60, 64], 48, 72)
    assert min(v) >= 48 and max(v) <= 72 and sorted(v) == v


def test_every_instrument_and_drum_renders():
    rng = np.random.default_rng(1)
    for name in synth.INSTRUMENTS:
        if synth.is_kit(name):
            for d in theory.DRUMS.values():
                y = synth.drum_hit(name, d, 0.8, 0.5, 32000, rng)
                assert np.isfinite(y).all() and len(y) > 100, (name, d)
        else:
            y = synth.render_note(name, 60, 0.5, 0.8, 0.5, 32000, rng)
            assert np.isfinite(y).all() and 0.05 < float(np.abs(y).max()) < 2.0, name
    assert len(synth.instrument_table()) == len(synth.INSTRUMENTS) >= 45


def test_a_bar_renders_faster_than_it_plays():
    s = C.compose("gothic_orchestral", "dark", "D minor", 84, 16, 5)
    for section, bar in ((1, 0), (3, 2)):
        t0 = time.perf_counter()
        x = R.render_bar(s, section, bar)
        dt = time.perf_counter() - t0
        assert x.shape == (int(round(S.bar_seconds(s) * 32000)), 2) and np.isfinite(x).all()
        assert dt < S.bar_seconds(s) * 0.5, f"a bar of {S.bar_seconds(s):.2f} s took {dt:.2f} s to render"
    assert float(np.abs(x).max()) <= 1.0


def test_voice_limit_cuts_the_oldest_note():
    s = S.new_song("v", tempo=120, key="C major", bars=1)
    s["lanes"]["pad"]["instrument"] = "organ_cathedral"
    s["patterns"]["A"]["notes"]["pad"] = [{"s": 0, "p": 48 + k, "v": 0.8, "l": 16} for k in range(12)]
    s["fx"]["reverb"] = 0.0
    s["fx"]["echo"] = 0.0
    s["fx"]["snes"] = 0.0
    full = R.render_plan(S.normalise({**s, "fx": {**s["fx"], "voices": 0}}), R.timeline(s))
    limited = R.render_plan(S.normalise({**s, "fx": {**s["fx"], "voices": 8}}), R.timeline(s))
    assert float(np.abs(limited[8000:]).mean()) < float(np.abs(full[8000:]).mean())


def test_snes_ness_band_limits_and_caps_the_voices():
    s = C.compose("gothic_orchestral", "dark", "D minor", 84, 8, 5)
    assert s["fx"]["snes"] == 0.7
    clean = R.render_bar(S.normalise({**s, "fx": {**s["fx"], "snes": 0.0, "voices": 0}}), 1, 0)
    snes = R.render_bar(S.normalise({**s, "fx": {**s["fx"], "snes": 1.0, "voices": 0}}), 1, 0)
    spec_c = np.abs(np.fft.rfft(clean[:, 0].astype(np.float64)))
    spec_s = np.abs(np.fft.rfft(snes[:, 0].astype(np.float64)))
    f = np.fft.rfftfreq(len(clean), 1 / 32000)
    high = f > 9000
    assert spec_s[high].sum() / spec_s.sum() < spec_c[high].sum() / spec_c.sum() * 0.5    # the top band is gone, as on the console
    assert np.isfinite(snes).all() and float(np.abs(snes).max()) <= 1.0
    assert "snes" in S.FX_FIELDS


def test_composer_is_deterministic_per_seed_and_covers_every_genre():
    for g in C.GENRES:
        a = C.compose(g, "", None, None, 24, 3)
        b = C.compose(g, "", None, None, 24, 3)
        c = C.compose(g, "", None, None, 24, 4)
        assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True), g
        assert json.dumps(a, sort_keys=True) != json.dumps(c, sort_keys=True), g
        assert S.total_bars(a) >= 24 and a["genre"] == g
        assert a["patterns"]["A"]["notes"]["lead"] and a["patterns"]["A"]["notes"]["bass"] and a["patterns"]["A"]["notes"]["pad"]
        for pat in a["patterns"].values():
            for ln in S.LANES:
                for n in pat["notes"][ln]:
                    assert 0 <= n["s"] < pat["bars"] * 16
    # key, tempo and mood are honoured; the bridge changes key through its section
    s = C.compose("title", "heroic", "E minor", 90, 32, 8)
    assert S.key_text(s) == "E minor" and s["tempo"] == 90 and s["mood"] == "heroic"
    assert any(sec["transpose"] != 0 for sec in s["sections"]) and "motif" in s
    with pytest.raises(ValueError):
        C.compose("polka")


def test_melody_moves_in_steps_and_lands_on_chord_tones():
    s = C.compose("town", "calm", "C major", 100, 16, 2)
    lead = sorted(s["patterns"]["A"]["notes"]["lead"], key=lambda n: n["s"])
    leaps = [abs(b["p"] - a["p"]) for a, b in zip(lead, lead[1:])]
    assert sum(1 for l in leaps if l <= 4) >= len(leaps) * 0.6     # mostly seconds and thirds
    assert all(theory.in_scale(0, "major", n["p"]) for n in lead)  # in the key
    chords = s["patterns"]["A"]["chords"]
    last = lead[-1]
    tones = {t % 12 for t in theory.chord(0, "major", chords[last["s"] // 16], 4)}
    assert last["p"] % 12 in tones                                 # the phrase ends on a chord tone


def test_scale_lock_snaps_placed_and_transposed_notes():
    s = C.compose("exploration", "", "A minor", 110, 8, 1)
    s = E.apply(s, {"op": "set_note", "pattern": "A", "lane": "lead", "step": 0, "pitch": 70, "vel": 0.8, "length": 2})   # A# is not in A minor
    assert all(theory.in_scale(9, "minor", n["p"]) for n in s["patterns"]["A"]["notes"]["lead"])
    free = E.apply(s, {"op": "set_note", "pattern": "A", "lane": "lead", "step": 2, "pitch": 70, "free": True})
    assert any(n["p"] == 70 for n in free["patterns"]["A"]["notes"]["lead"])
    off = E.apply(E.apply(s, {"op": "scale_lock", "on": False}), {"op": "set_note", "pattern": "A", "lane": "lead", "step": 4, "pitch": 70})
    assert any(n["p"] == 70 and n["s"] == 4 for n in off["patterns"]["A"]["notes"]["lead"])
    t = E.apply(s, {"op": "transpose", "pattern": "A", "semitones": 1})
    assert all(theory.in_scale(9, "minor", n["p"]) for n in t["patterns"]["A"]["notes"]["lead"])
    t2 = E.apply(s, {"op": "transpose", "pattern": "A", "lane": "bass", "semitones": 2, "in_scale": True})
    a = sorted(s["patterns"]["A"]["notes"]["bass"], key=lambda n: (n["s"], n["p"]))[0]["p"]
    b = sorted(t2["patterns"]["A"]["notes"]["bass"], key=lambda n: (n["s"], n["p"]))[0]["p"]
    assert b == theory.step_in_scale(a, 2, 9, "minor")
    # drums never snap
    d = E.apply(s, {"op": "set_note", "pattern": "A", "lane": "drums", "step": 0, "pitch": 46})
    assert any(n["p"] == 46 and n["s"] == 0 for n in d["patterns"]["A"]["notes"]["drums"])


def test_every_edit_operation():
    s = C.compose("chiptune", "playful", "C major", 140, 16, 9)
    base = json.dumps(s, sort_keys=True)
    lead0 = s["patterns"]["A"]["notes"]["lead"]
    # notes
    e = E.apply(s, {"op": "set_note", "pattern": "A", "lane": "lead", "step": 1, "pitch": 72, "vel": 0.5, "length": 3})
    n = next(n for n in e["patterns"]["A"]["notes"]["lead"] if n["s"] == 1 and n["p"] == 72)
    assert n["v"] == 0.5 and n["l"] == 3.0
    e = E.apply(e, {"op": "set_velocity", "pattern": "A", "lane": "lead", "step": 1, "pitch": 72, "vel": 0.9})
    e = E.apply(e, {"op": "set_length", "pattern": "A", "lane": "lead", "step": 1, "pitch": 72, "length": 1})
    n = next(n for n in e["patterns"]["A"]["notes"]["lead"] if n["s"] == 1 and n["p"] == 72)
    assert n["v"] == 0.9 and n["l"] == 1.0
    e = E.apply(e, {"op": "remove_note", "pattern": "A", "lane": "lead", "step": 1, "pitch": 72})
    assert not any(n["s"] == 1 and n["p"] == 72 for n in e["patterns"]["A"]["notes"]["lead"])
    with pytest.raises(E.EditError):
        E.apply(s, {"op": "set_velocity", "pattern": "A", "lane": "lead", "step": 15, "pitch": 1, "vel": 0.5})
    # clear a bar, a lane, the pattern
    c = E.apply(s, {"op": "clear", "pattern": "A", "lane": "drums", "bar": 0})
    assert not any(n["s"] < 16 for n in c["patterns"]["A"]["notes"]["drums"]) and any(n["s"] >= 16 for n in c["patterns"]["A"]["notes"]["drums"])
    c = E.apply(s, {"op": "clear", "pattern": "A"})
    assert all(not c["patterns"]["A"]["notes"][ln] for ln in S.LANES)
    # copy and paste
    _, r = E.apply_with_result(s, {"op": "copy", "pattern": "A", "lane": "bass", "bar": 0})
    clip = r["clipboard"]
    assert clip and all(0 <= n["s"] < 16 for n in clip)
    p = E.apply(E.apply(s, {"op": "clear", "pattern": "A", "lane": "bass", "bar": 1}), {"op": "paste", "pattern": "A", "lane": "bass", "at": 16, "clipboard": clip})
    assert sorted((n["s"] - 16, n["p"]) for n in p["patterns"]["A"]["notes"]["bass"] if 16 <= n["s"] < 32) == sorted((n["s"], n["p"]) for n in clip)
    # transpose, reverse
    t = E.apply(s, {"op": "transpose", "pattern": "A", "lane": "lead", "semitones": 12})
    assert sorted(n["p"] for n in t["patterns"]["A"]["notes"]["lead"]) == sorted(n["p"] + 12 for n in lead0)
    assert t["patterns"]["A"]["notes"]["drums"] == s["patterns"]["A"]["notes"]["drums"]
    rv = E.apply(s, {"op": "reverse", "pattern": "A", "lane": "lead", "bar": 0})
    first = [n for n in lead0 if n["s"] < 16]
    assert len([n for n in rv["patterns"]["A"]["notes"]["lead"] if n["s"] < 16]) == len(first)
    rr = E.apply(rv, {"op": "reverse", "pattern": "A", "lane": "lead", "bar": 0})
    assert sorted(n["p"] for n in rr["patterns"]["A"]["notes"]["lead"]) == sorted(n["p"] for n in lead0)
    # double (twice as fast, repeated) and halve (twice as slow, the pattern grows)
    d = E.apply(s, {"op": "double", "pattern": "A", "lane": "bass"})
    bass = s["patterns"]["A"]["notes"]["bass"]
    assert len(d["patterns"]["A"]["notes"]["bass"]) == 2 * len([n for n in bass if n["s"] // 2 < s["patterns"]["A"]["bars"] * 8])
    h = E.apply(s, {"op": "halve", "pattern": "A"})
    assert h["patterns"]["A"]["bars"] == 2 * s["patterns"]["A"]["bars"] and len(h["patterns"]["A"]["chords"]) == h["patterns"]["A"]["bars"]
    assert sorted(n["s"] for n in h["patterns"]["A"]["notes"]["lead"]) == sorted(n["s"] * 2 for n in lead0)
    # humanise then quantise is the original again (lengths rounded)
    hu = E.apply(s, {"op": "humanise", "pattern": "A", "amount": 0.6, "seed": 4})
    assert any("o" in n for n in hu["patterns"]["A"]["notes"]["lead"])
    q = E.apply(hu, {"op": "quantise", "pattern": "A"})
    assert not any("o" in n for n in q["patterns"]["A"]["notes"]["lead"]) and sorted(n["s"] for n in q["patterns"]["A"]["notes"]["lead"]) == sorted(n["s"] for n in lead0)
    # lanes
    ln = E.apply(s, {"op": "set_lane", "lane": "lead", "instrument": "brass_horn", "volume": 0.3, "tone": 0.9, "pan": -0.5})
    assert ln["lanes"]["lead"] == {**s["lanes"]["lead"], "instrument": "brass_horn", "volume": 0.3, "tone": 0.9, "pan": -0.5}
    with pytest.raises(E.EditError):
        E.apply(s, {"op": "set_lane", "lane": "lead", "instrument": "drums_rock"})
    m = E.apply(s, {"op": "mute", "lane": "pad"})
    assert m["lanes"]["pad"]["mute"] and S.sounding_lanes(m) == [l for l in S.LANES if l != "pad"]
    so = E.apply(s, {"op": "solo", "lane": "bass", "on": True})
    assert S.sounding_lanes(so) == ["bass"]
    # song
    k = E.apply(s, {"op": "set_key", "key": "D minor", "snap": True})
    assert S.key_text(k) == "D minor" and all(theory.in_scale(2, "minor", n["p"]) for n in k["patterns"]["A"]["notes"]["lead"])
    assert E.apply(s, {"op": "set_tempo", "tempo": 99})["tempo"] == 99.0
    with pytest.raises(E.EditError):
        E.apply(s, {"op": "set_tempo", "tempo": 999})
    fx = E.apply(s, {"op": "set_fx", "name": "bits", "value": 8})
    assert fx["fx"]["bits"] == 8
    with pytest.raises(E.EditError):
        E.apply(s, {"op": "set_fx", "name": "wobble", "value": 1})
    assert E.apply(s, {"op": "title", "title": "Named"})["title"] == "Named"
    # patterns and sections
    pa = E.apply(s, {"op": "pattern_add", "name": "C", "copy_of": "A"})
    assert pa["patterns"]["C"]["notes"] == s["patterns"]["A"]["notes"]
    pe = E.apply(s, {"op": "pattern_add", "name": "E", "bars": 2, "add_section": True})
    assert pe["patterns"]["E"]["bars"] == 2 and pe["sections"][-1]["pattern"] == "E"
    pr = E.apply(pa, {"op": "pattern_rename", "name": "C", "new": "D"})
    assert "D" in pr["patterns"] and "C" not in pr["patterns"]
    prm = E.apply(pa, {"op": "pattern_remove", "name": "C"})
    assert "C" not in prm["patterns"]
    n0 = len(s["sections"])
    sa = E.apply(s, {"op": "section_add", "pattern": "B", "at": 0, "repeat": 2, "transpose": -3})
    assert len(sa["sections"]) == n0 + 1 and sa["sections"][0] == {"name": "B", "pattern": "B", "repeat": 2, "transpose": -3}
    sm = E.apply(sa, {"op": "section_move", "index": 0, "to": 2})
    assert sm["sections"][2]["transpose"] == -3
    ss = E.apply(sm, {"op": "section_set", "index": 2, "repeat": 1, "transpose": 0, "name": "bridge"})
    assert ss["sections"][2]["name"] == "bridge" and ss["sections"][2]["repeat"] == 1
    sr = E.apply(ss, {"op": "section_remove", "index": 2})
    assert len(sr["sections"]) == n0
    with pytest.raises(E.EditError):
        E.apply(s, {"op": "section_remove", "index": 99})
    # generate
    gb = E.apply(s, {"op": "generate_bar", "pattern": "A", "bar": 1, "seed": 7})
    assert gb["patterns"]["A"]["notes"]["drums"] and gb["patterns"]["A"]["notes"]["lead"]
    assert [n for n in gb["patterns"]["A"]["notes"]["lead"] if n["s"] < 16] == [n for n in lead0 if n["s"] < 16]
    gl = E.apply(s, {"op": "generate_lane", "pattern": "A", "lane": "sparkle", "seed": 3})
    assert gl["patterns"]["A"]["notes"]["sparkle"] and gl["patterns"]["A"]["notes"]["lead"] == lead0
    assert E.apply(E.apply(s, {"op": "generate_lane", "pattern": "A", "lane": "counter", "seed": 2}), {"op": "quantise", "pattern": "A"})
    # words parse like JSON, the input is never changed, unknown ops are refused
    assert E.parse_op("transpose pattern=A semitones=2 in_scale=true") == {"op": "transpose", "pattern": "A", "semitones": 2, "in_scale": True}
    assert json.dumps(s, sort_keys=True) == base
    with pytest.raises(E.EditError):
        E.apply(s, {"op": "wobble"})
    with pytest.raises(E.EditError):
        E.apply(s, {"op": "set_note", "pattern": "A", "lane": "harp", "step": 0, "pitch": 60})


def test_library_pieces_load_and_render():
    pieces = L.list_pieces()
    names = {p["name"] for p in pieces}
    assert len(pieces) >= 27 and {"forge_home", "forge_working", "forge_done"} <= names
    genres = {p["genre"] for p in pieces}
    for g in ["dungeon_synth", "gothic_orchestral", "gothic_march", "barbarian_epic", "dark_acoustic", "ambient_dread", "gothic_rock", "chiptune", "dark_ambient",
              "battle", "boss", "tavern", "town", "title", "victory", "sorrow", "exploration", "synthwave"]:
        assert g in genres, g
    # the theme sets: the game's set is minor-mode and never chiptune; the bright pieces are general
    for p in pieces:
        assert p["theme"] in ("godmarrow", "general"), p["name"]
        if p["theme"] == "godmarrow":
            sc = L.load_piece(p["name"])["scale"]
            assert theory.SCALES[sc][2] == 3 and p["genre"] != "chiptune", (p["name"], sc)
        if p["genre"] in ("chiptune", "tavern", "town", "victory", "synthwave"):
            assert p["theme"] == "general", p["name"]
    assert L.list_pieces(theme="godmarrow") and all(p["theme"] == "general" for p in L.list_pieces(theme="general"))
    for p in pieces:
        s = L.load_piece(p["name"])
        assert s["title"] and S.total_bars(s) >= 2
        x = R.render_bar(s, 0, 0)
        assert np.isfinite(x).all() and float(np.abs(x).max()) > 0.01, p["name"]
    # the library files are what the recipes make (no drift between the two)
    assert json.dumps(L.build_piece("forge_home"), sort_keys=True) == json.dumps(L.load_piece("forge_home"), sort_keys=True)
    assert json.dumps(L.build_piece("dungeon_sunken_stair"), sort_keys=True) == json.dumps(L.load_piece("dungeon_sunken_stair"), sort_keys=True)
    assert L.list_pieces("boss") and all(p["genre"] == "boss" for p in L.list_pieces("boss"))
    with pytest.raises(FileNotFoundError):
        L.load_piece("nothing_here")


def test_forge_theme_is_dungeon_synth_in_the_reference_key():
    s = L.load_piece("forge_home")
    assert S.key_text(s) == "C# minor" and 66 <= s["tempo"] <= 76 and s["genre"] == "dungeon_synth" and s["theme"] == "godmarrow"
    assert s["lanes"]["sparkle"]["instrument"] in ("bells_glass", "celesta", "music_box")
    assert any(sec["transpose"] for sec in s["sections"])       # the bridge changes key
    assert s["patterns"]["A"]["notes"]["lead"] and s["patterns"]["A"]["notes"]["counter"]
    assert 40 < S.total_seconds(s) < 130
    lead = s["patterns"]["A"]["notes"]["lead"]
    assert max(n["p"] for n in lead) <= 72 and min(n["l"] for n in lead) >= 1.5      # a broad low melody, not a jig
    assert s["lanes"]["bass"]["instrument"] == "bass_sub" and all(n["l"] > 16 for n in s["patterns"]["A"]["notes"]["bass"])   # the drone
    assert s["lanes"]["counter"]["instrument"].startswith("guitar")                       # the sparse plucked figure


def test_export_writes_wav_and_song(tmp_path):
    s = C.compose("victory", "heroic", "D major", 132, 8, 6)
    r = R.export(s, tmp_path, "win", fmt="wav")
    assert r["ok"] and (tmp_path / "win.wav").exists() and (tmp_path / "win.song.json").exists() and (tmp_path / "win.png").exists()
    with wave.open(str(tmp_path / "win.wav")) as w:
        assert w.getnchannels() == 2 and w.getframerate() == 32000 and w.getnframes() == int(round(S.total_seconds(s) * 32000))
    assert 0.07 < r["rms"] < 0.13


def test_cli_music_verbs(tmp_path):
    def pf(*args):
        env = {"PIXELFORGE_NO_UPDATE": "1", "PATH": "/usr/bin:/bin:/usr/local/bin"}
        out = subprocess.run([sys.executable, "-m", "pixelforge.cli", "music", *args, "--json"], cwd=ROOT, capture_output=True, text=True, env=env)
        assert out.returncode == 0, out.stdout + out.stderr
        return json.loads(out.stdout[out.stdout.index("{"):])

    song = tmp_path / "t.song.json"
    r = pf("new", str(song), "--title", "Trial", "--tempo", "100", "--key", "D minor", "--bars", "2")
    assert r["ok"] and r["key"] == "D minor" and song.exists()
    r = pf("edit", str(song), "--op", "set_note pattern=A lane=lead step=0 pitch=62 length=4", "--op", '{"op": "set_lane", "lane": "lead", "instrument": "flute_wood"}')
    assert r["applied"] == ["set_note", "set_lane"] and r["instruments"]["lead"] == "flute_wood"
    r = pf("play-bar", str(song), "--section", "0", "--bar", "0", "-o", str(tmp_path))
    assert r["ok"] and Path(r["files"][0]).exists() and r["faster_than_real_time"] > 2
    r = pf("compose", "-o", str(tmp_path / "c.song.json"), "--genre", "tavern", "--mood", "playful", "--seed", "3", "--bars", "8")
    assert r["ok"] and (tmp_path / "c.song.json").exists()
    r = pf("render", str(tmp_path / "c.song.json"), "-o", str(tmp_path / "out"), "--name", "tav", "--no-preview")
    assert (tmp_path / "out" / "tav.wav").exists()
    r = pf("list", "--genre", "boss")
    assert r["count"] >= 2 and r["instruments"] and "set_note" in r["ops"]
    r = pf("load", "forge_done", "-o", str(tmp_path / "d.song.json"))
    assert (tmp_path / "d.song.json").exists()
    r = pf("info", str(tmp_path / "d.song.json"))
    assert r["key"] == "C# minor" and r["timeline"]
    r = pf("measure", str(tmp_path / "out" / "tav.wav"))
    assert r["ok"] and "centroid_hz" in r and "key" in r
    # the game's score still answers
    r = pf("list-cues")
    assert len(r["cues"]) == 21
