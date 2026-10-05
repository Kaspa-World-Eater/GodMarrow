"""The retired roads (docs/FORGE_FROM_THE_GAME.md section 2): the cutout road, the kit props and 3D ground, the automatic
drafts and the old music generator answer with one line unless PIXELFORGE_OLD_ROADS=1; the game's cues still render,
from the song library; the Forge app shows no button for them."""
import json
import wave
from pathlib import Path

import pytest

from pixelforge import old_roads
from pixelforge.cli import main

HERE = Path(__file__).resolve().parent
FORGE = HERE.parent / "forge"


@pytest.fixture(autouse=True)
def _roads_closed(monkeypatch):
    monkeypatch.delenv(old_roads.FLAG, raising=False)


@pytest.mark.parametrize("argv, road", [
    (["hero", "sheet.png", "x"], "hero"),
    (["prop3d", "m.glb", "x", "-o", "out"], "prop3d"),
    (["tiles3d", "grass", "stone", "x", "-o", "out"], "tiles3d"),
    (["shapes", "draft", "a knight", "-o", "k.shapes.json"], "draft"),
    (["character", "from-picture", "p.png", "-p", "proj"], "from-picture"),
    (["character", "measure", "keeper", "-p", "proj"], "from-picture"),
])
def test_a_retired_entry_point_prints_one_line_and_stops(argv, road, capsys):
    with pytest.raises(SystemExit) as e:
        main(argv)
    assert e.value.code == 2
    out = capsys.readouterr()
    assert out.err.count("\n") == 1 and "retired" in out.err and old_roads.FLAG in out.err and road in out.err
    # --json: the Forge gets a plain error object
    with pytest.raises(SystemExit):
        main(argv + ["--json"])
    r = json.loads(capsys.readouterr().out)
    assert r["ok"] is False and r["retired"] == road and r["flag"] == old_roads.FLAG


def test_the_flag_reopens_a_road(monkeypatch):
    import pixelforge.hero as hero

    monkeypatch.setenv(old_roads.FLAG, "1")
    assert old_roads.old_roads_on()
    monkeypatch.setattr(hero, "make_hero", lambda *a, **k: {"ok": True, "stub": True})
    main(["hero", "sheet.png", "x", "--json", "--cutout"])     # runs through to the stub instead of stopping
    for v in ("0", "", "no"):
        monkeypatch.setenv(old_roads.FLAG, v)
        assert not old_roads.old_roads_on()


def test_describe_no_longer_drafts_a_model(monkeypatch):
    from pixelforge import describe

    d = describe.draft("draw a hooded necromancer with a bone staff as shapes")
    assert d["what"] == "shapes" and "doc" not in d and "retired" in d and d["text"].startswith("draw a hooded")
    monkeypatch.setenv(old_roads.FLAG, "1")
    assert "doc" in describe.draft("draw a hooded necromancer with a bone staff as shapes")


def test_every_game_cue_is_a_library_song():
    from pixelforge import music
    from pixelforge.music import cues, library

    names = {r["name"] for r in library.list_pieces()}
    assert len(cues.CUES) == 21 and set(cues.CUES) == set(music.score.CUE_INFO)     # the same keys the game asks for
    for k, (song, act, place) in cues.CUE_SONGS.items():
        assert song in names, (k, song)
        assert place in ("town", "wild", "deep", "boss", "title") and 0 <= act <= 5
    rows = music.cue_table()
    assert [r["key"] for r in rows] == list(cues.CUES) and all(r["song"] in names and r["bpm"] > 0 for r in rows)
    assert cues.cue_keys("act", 2) == ["a2_town", "a2_wild", "a2_deep", "boss2"] and cues.cue_keys("all") == list(cues.CUES)
    with pytest.raises(ValueError):
        cues.cue_keys("a9_town")


def test_make_music_renders_a_cue_from_the_library(tmp_path):
    from pixelforge import music

    r = music.make_music("a1_town", tmp_path, fmt="wav", preview=False, log=lambda m: None)
    assert r["ok"] and r["engine"] == "song library" and r["songs"] == {"a1_town": "town_moor_camp"}
    assert Path(r["files"][0]).name == "a1_town.wav" and not (tmp_path / "a1_town.song.json").exists()
    with wave.open(str(tmp_path / "a1_town.wav")) as w:
        assert w.getnchannels() == 2 and w.getnframes() > w.getframerate() * 10
    m = json.loads((tmp_path / "music.json").read_text())
    assert m["cues"]["a1_town"]["loop"] and m["cues"]["a1_town"]["song"] == "town_moor_camp" and m["cues"]["a1_town"]["act"] == 1
    # the old knobs are noted, not applied; a project's cues.json re-maps a cue without code
    r2 = music.make_music("title", tmp_path, fmt="wav", preview=False, overrides={"bpm": 60})
    assert any("retired generator" in n for n in r2["notes"])
    (tmp_path / "cues.json").write_text(json.dumps({"boss1": "boss_hemomancer"}))
    assert music.cues.song_for("boss1", tmp_path) == "boss_hemomancer" and music.cues.song_for("boss1") == "boss_the_ossuarch"


def test_the_cli_music_cue_and_the_forge_hooks(tmp_path, capsys):
    main(["music", "list-cues", "--json"])
    r = json.loads(capsys.readouterr().out)
    assert r["ok"] and len(r["cues"]) == 21 and r["cues"][0]["song"]
    # the app: the retired choices are filtered in one place, pictures dropped on Home are the reference
    screen = (FORGE / "scripts/screen.gd").read_text()
    assert "RETIRED_CHOICES" in screen and "PIXELFORGE_OLD_ROADS" in screen and '"Start from a picture"' in screen
    chars = (FORGE / "scripts/screens/characters.gd").read_text()
    assert "from-picture" not in chars.replace("## ", "") or '"character", "author"' in chars   # the bench runs the author loop, never the draft
