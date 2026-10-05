"""The character loop (track/refine): `pixelforge character author` hands the painting (or a sentence) to Claude Code, which
hand-authors a generator script in rounds; the loop renders, compares and scores each round, keeps the bookkeeping, stops at
the target or when two rounds bring no better score. The mock Claude (tests/claude_mock/author.jsonl) writes a fixed
generator per round with rising scores. Also: the painting stays untouched, the scoped tools, the brief's contents, the small
MCP edit tools, the CLI's progress lines, and the bench's wiring."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import pytest
from PIL import Image

from pixelforge import author_loop as AL, claude_bridge as CB, prompts_author as PA, shape_tools as T, shapes as S
from pixelforge.api import StepError
from pixelforge.cli import main

HERE = Path(__file__).resolve().parent
MOCKS = HERE / "claude_mock"
KEEPER_FRONT = HERE.parent / "assets" / "styles" / "keeper_front.png"


@pytest.fixture(autouse=True)
def mock_claude(monkeypatch):
    """Every test here runs the mock author: never the real CLI, whatever is installed on the box."""
    monkeypatch.setenv("PIXELFORGE_CLAUDE", f"mock:{MOCKS / 'author.jsonl'}")
    monkeypatch.setenv("PIXELFORGE_MOCK_DELAY", "0.01")


@pytest.fixture(scope="module")
def loop(tmp_path_factory):
    """The Keeper's front through three mock rounds once, shared by the tests that read the result."""
    import os
    os.environ["PIXELFORGE_CLAUDE"] = f"mock:{MOCKS / 'author.jsonl'}"
    os.environ["PIXELFORGE_MOCK_DELAY"] = "0.01"
    root = tmp_path_factory.mktemp("author")
    said = []
    r = AL.author("keeper", root / "proj", painting=KEEPER_FRONT, progress=lambda w, n, d, t: said.append((w, n, d, t)))
    return r, root / "proj", said


# ------------------------------------------------------------------------------------------- the rounds
def test_three_rounds_with_rising_scores_and_the_bookkeeping(loop):
    r, proj, said = loop
    assert r["ok"] and r["character"] == "keeper" and r["stopped"] == "rounds done" and r["best"] == 3
    scores = [h["score"] for h in r["rounds"]]
    assert len(scores) == 3 and scores[0] < scores[1] < scores[2] and scores == [0.5, pytest.approx(0.64, abs=0.02), pytest.approx(0.69, abs=0.02)]
    assert r["score"] == scores[2] and r["overlap"] == {"front": scores[2]} and "overlap" in r["judgement"]
    # every round's script, model, three stills, compare and record are under author/round_N; the summary beside them
    for n in (1, 2, 3):
        d = proj / "characters" / "keeper" / "author" / f"round_{n}"
        assert {p.name for p in d.iterdir()} >= {"make_keeper_shapes.py", "keeper.shapes.json", "still_S.png", "still_E.png", "still_N.png", "compare.png", "round.json"}
        rec = json.loads((d / "round.json").read_text())
        assert rec["round"] == n and rec["score"] == scores[n - 1] and rec["focus"] == f"round {n} of the figure" and rec["cost_usd"] == 0.4 and Path(rec["log"]).exists()
    summary = json.loads(Path(r["summary"]).read_text())
    assert summary["best"] == 3 and summary["score"] == scores[2] and len(summary["rounds"]) == 3 and summary["target"] == 0.85
    # the model Claude left in shapes/ is the character's; the best round's still and compare are the bench's previews
    assert Path(r["model"]) == proj / "characters" / "keeper" / "shapes" / "keeper.shapes.json" and Path(r["model"]).exists()
    assert (proj / "characters" / "keeper" / "shapes" / "make_keeper_shapes.py").exists()
    assert Path(r["still"]).exists() and Path(r["compare"]).exists()
    assert S.load_shapes(r["model"])["shapes"] == S.load_shapes(proj / "characters" / "keeper" / "author" / "round_3" / "keeper.shapes.json")["shapes"]
    from pixelforge.project import Project
    c = Project.load(proj).character("keeper")
    assert c.sources["shapes"].endswith("keeper.shapes.json") and c.sources["painting"] == "characters/keeper/source/painting.png" and c.done["model"]
    assert "authored by Claude" in c.notes["shapes"]
    # the progress: the round's start, Claude's tool words with the round in front, the score line with the focus
    words = [w for w, *_ in said]
    assert words[0] == "round 1 · drawing from the painting" and "round 1 · writing make_keeper_shapes.py" in words and "round 1 · running the script" in words
    assert "round 1 · front 0.50 · round 1 of the figure" in words and "round 2 · another round" in words and words[-1].startswith("round 3 · front 0.")
    assert said[-1][1:] == (3, 3, 3)


def test_the_painting_is_the_reference_and_nothing_else(loop):
    """A dropped painting is stored byte for byte and nothing derived from it is written: no cutout, no measurement, no quantised copy."""
    r, proj, _ = loop
    kept = proj / "characters" / "keeper" / "source" / "painting.png"
    assert kept.read_bytes() == KEEPER_FRONT.read_bytes() and hashlib.sha1(kept.read_bytes()).hexdigest() == hashlib.sha1(KEEPER_FRONT.read_bytes()).hexdigest()
    assert r["painting"] == str(kept)
    src = proj / "characters" / "keeper" / "source"
    assert sorted(p.name for p in src.iterdir()) == ["painting.png"]                       # no front.png, no picture.png
    assert not list((proj / "characters" / "keeper" / "shapes").glob("*.measure.json")) and not list(src.glob("*.draft.*"))
    allpng = [p for p in (proj / "characters" / "keeper").rglob("*.png")]
    assert all(p.name.startswith(("still_", "compare", "painting", "claude_still")) for p in allpng), [p.name for p in allpng]
    # the model is Claude's, not a draft of the picture road
    doc = S.load_shapes(r["model"])
    assert "measured" not in doc and "mock author" in doc["about"]


def test_another_round_carries_on_with_the_note(loop):
    r, proj, _ = loop
    said = []
    again = AL.author("keeper", proj, rounds=1, note="widen the brim", progress=lambda w, n, d, t: said.append((w, n, d, t)))
    assert again["ok"] and [h["round"] for h in again["rounds"]] == [1, 2, 3, 4] and again["best"] == 3   # round 4 draws round 3's figure again: no better
    assert (proj / "characters" / "keeper" / "author" / "round_4" / "round.json").exists()
    assert said[0] == ("round 4 · another round", 4, 3, 4) and said[-1][1] == 4
    # the note and the last round's picture are in the message the mock received
    first = json.loads(Path(again["rounds"][-1]["log"]).read_text().splitlines()[0])
    text = first["command"][-1]
    assert "widen the brim" in text and "round_3/compare.png" in text.replace("\\", "/") and "front 0.69" in text and "Round 4" in text


def test_stops_at_the_target(tmp_path):
    r = AL.author("keeper", tmp_path / "p", painting=KEEPER_FRONT, target=0.6)
    assert r["ok"] and r["stopped"] == "target reached" and [h["round"] for h in r["rounds"]] == [1, 2] and r["best"] == 2


def test_stops_when_two_rounds_bring_nothing_better(tmp_path, monkeypatch):
    monkeypatch.setenv("PIXELFORGE_CLAUDE", f"mock:{MOCKS / 'author_flat.jsonl'}")
    r = AL.author("flat", tmp_path / "p", painting=KEEPER_FRONT, rounds=5)
    assert r["ok"] and r["stopped"] == "no improvement in two rounds" and [h["score"] for h in r["rounds"]] == [0.5, 0.5, 0.5] and r["best"] == 1


def test_a_sentence_alone_is_one_round_without_a_score(tmp_path):
    r = AL.author(None, tmp_path / "p", sentence="a hooded keeper with a lantern")
    assert r["ok"] and r["character"] == "hooded_keeper_lantern" and len(r["rounds"]) == 1 and r["score"] is None and r["compare"] == "" and r["overlap"] == {}
    assert r["rounds"][0]["stills"] and Path(r["still"]).exists() and r["stopped"] == "rounds done"
    assert AL.name_for(None, "derek_a_hooded_warrior_in_a_long_robe_3f2a9c1e-7b1d-4c2e-9a0f-5d6e7f8a9b0c.png", None) == "hooded_warrior_long_robe"
    with pytest.raises(StepError, match="painting .*or a sentence"):
        AL.author(None, tmp_path / "q")


def test_claude_stopping_is_an_error_in_words(tmp_path, monkeypatch):
    monkeypatch.setenv("PIXELFORGE_CLAUDE", f"mock:{MOCKS / 'error.jsonl'}")
    r = AL.author("x", tmp_path / "p", painting=KEEPER_FRONT)
    assert not r["ok"] and r["stopped"] == "claude stopped" and "not signed in" in r["error"].lower() and len(r["rounds"]) == 1 and r["rounds"][0]["error"]
    monkeypatch.setattr(CB, "find_claude", lambda hint=None: None)
    monkeypatch.delenv("PIXELFORGE_CLAUDE")
    r = AL.author("y", tmp_path / "p", painting=KEEPER_FRONT)
    assert not r["ok"] and "Claude Code was not found" in r["error"]


# ------------------------------------------------------------------------------------------- the scoped tools and the brief
def test_the_command_grants_write_edit_and_bash_for_the_shapes_folder_only(tmp_path):
    r = AL.author("scoped", tmp_path / "p", sentence="a monk", dry_run=True)
    assert r["dry_run"] and r["tools"] == ["Read", "Write", "Edit", "Bash"]
    folder = (tmp_path / "p" / "characters" / "scoped" / "shapes").resolve().as_posix().lstrip("/")
    assert r["allowed"] == [CB.MCP_ALLOW, "Read", f"Write(//{folder}/**)", f"Edit(//{folder}/**)", "Bash(python *)", "Bash(python3 *)", "Bash(py *)"]
    cmd = r["command"]
    assert cmd[cmd.index("--tools") + 1] == "Read,Write,Edit,Bash" and "--strict-mcp-config" in cmd and "--permission-prompts" in cmd
    assert str(tmp_path / "p" / "characters" / "scoped" / "shapes") in cmd[cmd.index("--add-dir") + 3:]
    assert r["text"].startswith("Round 1: draw scoped from the words") and r["system_prompt"] == cmd[cmd.index("--append-system-prompt") + 1]


def test_the_brief_carries_the_method_the_example_the_kit_the_traps_and_the_standard(tmp_path):
    p = PA.system_prompt("hemo", tmp_path, tmp_path / "shapes", painting=KEEPER_FRONT, views=["front"], sentence="a blood mage")
    for must in ["GENERATOR SCRIPT", "shape_template", "make_hemomancer_shapes.py", "K.plank_skirt(", "K.greave(", "back_strip", "upright_from", "prism takes a 2D centre",
                 "STAINS", "Claude hand drawing was better", "measure_views\nand sample_materials exist as reference tools", "195 px", "one unit is 1.6 px",
                 "compare picture", "intersection over union", "0.85 is the target", "British spelling", '"focus"', "No red light", "keeper_front.png",
                 "never cut, converted or copied into the model", "a blood mage", "Write and Edit are allowed there and nowhere"]:
        assert must in p, must
    import re
    body = p.replace("Banned words (never in names, notes or comments): " + ", ".join(CB.BANNED_WORDS), "")
    for banned in CB.BANNED_WORDS:
        assert not re.search(r"\b" + re.escape(banned) + r"\b", body, re.I), banned
    assert "sonnet" not in p.lower() and "opus" not in p.lower()
    # the round messages: round 1 draws; later rounds get the overlap, the compare picture, the stills, the notes and the person's note
    t1 = PA.round_text("hemo", 1, tmp_path / "r1", painting=KEEPER_FRONT)
    assert "draw hemo from the painting" in t1 and "compare_shapes" in t1 and "r1/compare.png" in t1.replace("\\", "/")
    prev = {"round": 1, "score": 0.5, "views": {"front": 0.5}, "compare": "/x/compare.png", "stills": ["/x/still_S.png"], "notes": "the hat is wrong"}
    t2 = PA.round_text("hemo", 2, tmp_path / "r2", painting=KEEPER_FRONT, previous=prev, note="longer sleeves", script_exists=True)
    assert "another pass" in t2 and "front 0.50" in t2 and "/x/compare.png" in t2 and "the hat is wrong" in t2 and '"longer sleeves"' in t2 and "Do what it says first" in t2
    # the mock author never says a model name either
    for f in (MOCKS / "author.jsonl", MOCKS / "author_flat.jsonl", MOCKS / "author_generator.py"):
        assert "sonnet" not in f.read_text().lower() and "opus" not in f.read_text().lower()


# ------------------------------------------------------------------------------------------- the small tools
def test_add_part_and_edit_shapes_change_a_file_and_refuse_a_broken_edit(tmp_path):
    subprocess.run([sys.executable, str(MOCKS / "author_generator.py"), "--round", "2", "--out", str(tmp_path / "m.shapes.json")], check=True,
                   env={**__import__("os").environ, "PYTHONPATH": str(HERE.parent)})
    f = tmp_path / "m.shapes.json"
    n0 = len(S.load_shapes(f)["shapes"])
    r = T.add_part(f, "shackle", {"side": "L", "cx": 69.0})
    assert r["ok"] and r["added"][0] == "shackle.L" and r["shapes"] > n0 and len(S.load_shapes(f)["shapes"]) == r["shapes"]
    r = T.add_part(f, "plank_skirt", {"name": "plank", "cx": 69.0, "belt_y": 67, "degs": [30, -30, 180], "rnd": 3})
    assert r["ok"] and len(r["added"]) == 3 and set(S.load_shapes(f)["parts"]) >= {"planks_L", "planks_R", "planks_back"}
    with pytest.raises(ValueError, match="not a piece of the kit"):
        T.add_part(f, "rivet_row", {})
    r = T.edit_shapes(f, [{"op": "set", "shape": "hat", "key": "rotate.x", "value": 20}, {"op": "set", "shape": "robe", "key": "y", "value": [74, 100]},
                         {"op": "remove", "shape": "neck"}, {"op": "add", "shape": {"name": "lantern", "kind": "ellipsoid", "centre": [90, 80, 4], "radii": [3, 4, 3], "material": "ropeold", "bone": "hand.L"}},
                         {"op": "material", "name": "glow", "spec": {"ramp": ["#102010", "#4a8a4a", "#9fe09f"], "emissive": True}},
                         {"op": "part", "name": "robe", "spec": {"bone": "hips", "hang": 0.3}}, {"op": "doc", "key": "clips", "value": {"attack": "punch"}}])
    assert r["ok"] and r["applied"] == ["hat.rotate.x", "robe.y", "-neck", "+lantern", "material glow", "part robe", "doc.clips"]
    doc = S.load_shapes(f)
    by = {s["name"]: s for s in doc["shapes"]}
    assert by["hat"]["rotate"]["x"] == 20 and by["robe"]["y"] == [74, 100] and "neck" not in by and "lantern" in by and doc["clips"] == {"attack": "punch"} and doc["parts"]["robe"]["hang"] == 0.3
    with pytest.raises(ValueError, match="no shape named"):
        T.edit_shapes(f, [{"op": "set", "shape": "nobody", "key": "t", "value": 1}])
    with pytest.raises(ValueError, match="problems"):
        T.edit_shapes(f, [{"op": "doc", "key": "clips", "value": {"attack": "no_such_clip"}}])
    assert S.load_shapes(f)["clips"] == {"attack": "punch"}                                   # a refused edit leaves the file alone
    from pixelforge import api
    still = api.shape_still(f, tmp_path / "s.png", "E")
    assert still["ok"] and Path(still["png"]).exists() and Image.open(still["png"]).size[1] > 150
    assert api.add_part(f, "thigh_plate", '{"side": "R", "cx": 69.0}')["ok"] and api.edit_shapes(f, '[{"op": "set", "shape": "hat", "key": "t", "value": -1}]')["ok"]
    with pytest.raises(StepError):
        api.add_part(f, "mirror", "{}")


def test_the_mcp_server_offers_the_authors_tools():
    src = (HERE.parent / "pixelforge" / "mcp_server.py").read_text()
    for t in ("def shape_still(", "def add_part(", "def edit_shapes(", "def character_author("):
        assert t in src


# ------------------------------------------------------------------------------------------- the CLI
def test_cli_prints_progress_lines_and_the_result(tmp_path, capsys):
    main(["character", "author", "keeper", "-p", str(tmp_path / "proj"), "--painting", str(KEEPER_FRONT), "--rounds", "2", "--json"])
    out, err = capsys.readouterr()
    prog = [l for l in err.splitlines() if l.startswith("PF_PROGRESS step=author")]
    assert prog[0] == "PF_PROGRESS step=author round=1 done=0 total=2 note=round+1+·+drawing+from+the+painting"
    assert any(l.startswith("PF_PROGRESS step=author round=2 done=2 total=2 note=round+2+·+front+0.") for l in prog)
    r = json.loads(out)
    assert r["ok"] and r["best"] == 2 and len(r["rounds"]) == 2 and Path(r["compare"]).exists()
    main(["character", "author", "keeper", "-p", str(tmp_path / "proj"), "--rounds", "1", "--note", "a wider hat"])
    out = capsys.readouterr().out
    assert "round 3: front 0." in out and "best round 3" in out and "model " in out
    with pytest.raises(SystemExit) as e:
        main(["character", "author", "-p", str(tmp_path / "proj2"), "--json"])
    assert e.value.code == 2 and "painting" in json.loads(capsys.readouterr().out)["error"]


def test_the_mock_controls_copy_and_run_python(tmp_path, monkeypatch):
    src = tmp_path / "gen.py"
    src.write_text("import sys; open(sys.argv[1], 'w').write('made')\n")
    script = tmp_path / "s.jsonl"
    script.write_text('{"type":"system","subtype":"init"}\n{"mock":"copy","from":"%s","to":"{shapes_dir}/g.py"}\n{"mock":"python","args":["{shapes_dir}/g.py","{shapes_dir}/out.txt"]}\n{"type":"result","subtype":"success","result":"{\\"did\\": [\\"x\\"]}"}\n'
                      % str(src).replace("\\", "/"))
    monkeypatch.setenv("PIXELFORGE_CLAUDE", f"mock:{script}")
    r = CB.run("author", tmp_path / "p", "go", mock_vars={"shapes_dir": str(tmp_path / "shapes")}, snapshot_files=False)
    assert r["ok"] and (tmp_path / "shapes" / "g.py").exists() and (tmp_path / "shapes" / "out.txt").read_text() == "made"
    first = json.loads(Path(r["log"]).read_text().splitlines()[0])
    assert first["bench"] == "author"


# ------------------------------------------------------------------------------------------- the bench
def test_the_bench_runs_the_loop_and_never_the_automatic_draft():
    """A dropped picture is the reference; Claude draws; the old road's draft, measure and sample choices are gone from the bench."""
    forge = HERE.parent / "forge"
    bench = (forge / "scripts/screens/characters.gd").read_text()
    for must in ['"character", "author"', "Another round", "Render all", "Open in editor", '"Export"', "Use as reference only", "NEEDS_CLAUDE", "Claude Code is needed to draw",
                 "painting_tex", "INTERPOLATE_LANCZOS", "_rounds_line", 'step=="author"'.replace("==", '", "")) == "'), "--note", "--sentence", "--painting"]:
        assert must in bench, must
    for gone in ["from-picture", "_import_draft", "Measure again", "Sample materials again", "_road_again", "character_redo"]:
        assert gone not in bench, gone
    assert "author_walk.txt author.jsonl" in (forge / "tools/screens.sh").read_text() and (forge / "tools/author_walk.txt").exists()
    home = (forge / "scripts/screens/home.gd").read_text()
    assert "Claude draws the model against it" in home


def test_none_pretends_claude_is_absent(monkeypatch):
    monkeypatch.setenv("PIXELFORGE_CLAUDE", "none")
    assert CB.find_claude() is None and CB.status()["state"] == "not_found"
