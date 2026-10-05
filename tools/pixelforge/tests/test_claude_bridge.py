"""Claude on the bench: the bridge to the Claude Code CLI (command construction, the stream, progress words, the summary, the
snapshot and undo, the timeout, the mock, register's idempotence, the status sentences, the CLI verbs)."""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from pixelforge import claude_bridge as CB
from pixelforge.cli import build_parser, describe_on_bench

MOCKS = Path(__file__).resolve().parent / "claude_mock"


@pytest.fixture
def project(tmp_path, monkeypatch):
    from pixelforge import api
    api.new_project(tmp_path / "forge", "Forge", "godmarrow")
    monkeypatch.setenv("PIXELFORGE_MOCK_DELAY", "0.01")
    return tmp_path / "forge"


def use_mock(monkeypatch, name: str) -> None:
    monkeypatch.setenv("PIXELFORGE_CLAUDE", f"mock:{MOCKS / name}")


# ---------------------------------------------------------------- finding and status
def test_find_claude_takes_the_env_hint_then_path(monkeypatch, tmp_path):
    exe = tmp_path / "claude"
    exe.write_text("")
    monkeypatch.setenv("PIXELFORGE_CLAUDE", str(exe))
    assert CB.find_claude() == str(exe)
    monkeypatch.setenv("PIXELFORGE_CLAUDE", "mock:/x.jsonl")      # a mock is not an executable
    monkeypatch.setattr(CB.shutil, "which", lambda n: None)
    monkeypatch.setattr(CB, "_candidates", lambda: [])
    assert CB.find_claude() is None
    monkeypatch.setattr(CB.shutil, "which", lambda n: "/usr/bin/claude" if n == "claude" else None)
    assert CB.find_claude() == "/usr/bin/claude"


def test_status_sentences(monkeypatch):
    monkeypatch.delenv("PIXELFORGE_CLAUDE", raising=False)
    monkeypatch.setattr(CB, "find_claude", lambda hint=None: None)
    s = CB.status()
    assert s["state"] == "not_found" and not s["ok"] and "Claude Code was not found" in s["sentence"] and "claude" in s["sentence"]
    monkeypatch.setattr(CB, "find_claude", lambda hint=None: "/x/claude")
    monkeypatch.setattr(CB, "version", lambda exe: "2.1.0 (Claude Code)")
    monkeypatch.setattr(CB, "signed_in", lambda exe: False)
    monkeypatch.setattr(CB, "registered", lambda exe: False)
    s = CB.status()
    assert s["state"] == "not_signed_in" and "not signed in" in s["sentence"] and "run `claude`" in s["sentence"]
    monkeypatch.setattr(CB, "signed_in", lambda exe: True)
    s = CB.status()
    assert s["state"] == "ready" and s["sentence"].startswith("Claude: ready") and "register" in s["sentence"] and s["registered"] is False
    monkeypatch.setattr(CB, "registered", lambda exe: True)
    assert "register" not in CB.status()["sentence"]
    use_mock(monkeypatch, "music.jsonl")
    assert CB.status()["state"] == "ready" and CB.status()["mock"]


def test_signed_in_reads_the_auth_json(monkeypatch):
    class R:
        def __init__(self, out):
            self.stdout, self.stderr, self.returncode = out, "", 0
    monkeypatch.setattr(CB, "_call", lambda cmd, timeout=30: R('{"loggedIn": true, "authMethod": "oauth_token"}'))
    assert CB.signed_in("/x") is True
    monkeypatch.setattr(CB, "_call", lambda cmd, timeout=30: R('{"loggedIn": false}'))
    assert CB.signed_in("/x") is False
    monkeypatch.setattr(CB, "_call", lambda cmd, timeout=30: R("garbage"))
    assert CB.signed_in("/x") is None


def test_register_is_idempotent_and_user_scoped(monkeypatch):
    monkeypatch.delenv("PIXELFORGE_CLAUDE", raising=False)
    monkeypatch.setattr(CB, "find_claude", lambda hint=None: "/x/claude")
    calls = []

    class R:
        def __init__(self, code=0, out=""):
            self.returncode, self.stdout, self.stderr = code, out, ""

    state = {"reg": False}

    def call(cmd, timeout=30):
        calls.append(cmd)
        if cmd[1:3] == ["mcp", "get"]:
            return R(0, "pixelforge: python -m pixelforge.cli mcp") if state["reg"] else R(1, "No MCP server found with name: pixelforge")
        if cmd[1:3] == ["mcp", "add"]:
            state["reg"] = True
            return R(0, "Added stdio MCP server pixelforge")
        return R()
    monkeypatch.setattr(CB, "_call", call)
    r = CB.register(python="/py")
    assert r["ok"] and r["note"] == "registered"
    add = [c for c in calls if c[1:3] == ["mcp", "add"]]
    assert add == [["/x/claude", "mcp", "add", "-s", "user", "pixelforge", "--", "/py", "-m", "pixelforge.cli", "mcp"]]
    r2 = CB.register(python="/py")
    assert r2["ok"] and r2["note"] == "already registered"
    assert len([c for c in calls if c[1:3] == ["mcp", "add"]]) == 1          # no second add
    monkeypatch.setattr(CB, "find_claude", lambda hint=None: None)
    assert CB.register()["ok"] is False


# ---------------------------------------------------------------- the command and the prompt
def test_build_command_limits_tools_and_names_the_bench(tmp_path):
    cfg = tmp_path / "mcp.json"
    cmd = CB.build_command("/x/claude", "music", tmp_path, "slower, 76 bpm", cfg, ctx={"song": str(tmp_path / "music/current.song.json")})
    assert cmd[:4] == ["/x/claude", "-p", "--output-format", "stream-json"]
    assert cmd[cmd.index("--mcp-config") + 1] == str(cfg)
    assert cmd[cmd.index("--tools") + 1] == "Read"
    assert cmd[cmd.index("--allowedTools") + 1] == "mcp__pixelforge,Read"
    assert cmd[cmd.index("--permission-prompts") + 1] == "none"
    assert "--strict-mcp-config" in cmd and "--chrome" not in cmd
    assert cmd[cmd.index("--add-dir") + 1] == str(tmp_path)
    assert cmd[-1] == "slower, 76 bpm"
    sp = cmd[cmd.index("--append-system-prompt") + 1]
    assert "Music bench" in sp and str(tmp_path) in sp and "current.song.json" in sp
    assert "No red light" in sp and "cooldown" in sp and "lightning" in sp              # the bible and the banned words
    assert '{"did": [' in sp and '"changed"' in sp and '"notes"' in sp                   # the summary contract
    assert "edit_song" in sp and "compose_music" in sp
    # the Chrome road: the extension's tools allowed, the MCP config not strict (the chrome server must stay)
    cmd = CB.build_command("/x/claude", "midjourney", tmp_path, "paint", cfg, chrome=True, prompt="go", add_dirs=["/pics"])
    assert "--chrome" in cmd and "--strict-mcp-config" not in cmd
    assert cmd[cmd.index("--allowedTools") + 1] == "mcp__pixelforge,Read,mcp__claude-in-chrome"
    assert cmd[cmd.index("--append-system-prompt") + 1] == "go" and "/pics" in cmd


def test_budget_flag_follows_the_env(monkeypatch, tmp_path):
    monkeypatch.setenv("PIXELFORGE_CLAUDE_BUDGET", "1.5")
    cmd = CB.build_command("/x/claude", "effects", tmp_path, "x", tmp_path / "c.json")
    assert cmd[cmd.index("--max-budget-usd") + 1] == "1.5"
    monkeypatch.setenv("PIXELFORGE_CLAUDE_BUDGET", "0")
    assert "--max-budget-usd" not in CB.build_command("/x/claude", "effects", tmp_path, "x", tmp_path / "c.json")


def test_mcp_config_uses_this_interpreter_and_the_package_path(tmp_path):
    cfg = CB.mcp_config("/py")
    srv = cfg["mcpServers"]["pixelforge"]
    assert srv["command"] == "/py" and srv["args"] == ["-m", "pixelforge.cli", "mcp"] and str(CB.PF_ROOT) in srv["env"]["PYTHONPATH"]
    p = CB.write_mcp_config(tmp_path / "claude")
    assert json.loads(p.read_text())["mcpServers"]["pixelforge"]["command"] == sys.executable


def test_system_prompt_says_what_is_on_the_bench(tmp_path):
    sp = CB.system_prompt("characters", tmp_path, {"model_file": "/p/k.shapes.json", "painting": "/p/ref.png", "character": "keeper", "style": "godmarrow"})
    assert "/p/k.shapes.json" in sp and "/p/ref.png" in sp and "'keeper'" in sp and "godmarrow" in sp and "Characters bench" in sp
    sp = CB.system_prompt("characters", tmp_path, {})
    assert "The bench is empty" in sp and "draft_shapes" in sp
    sp = CB.system_prompt("effects", tmp_path, {"effect": "wisp", "palette": "lantern"})
    assert "wisp" in sp and "lantern palette" in sp and "make_effect" in sp
    for bench in CB.BENCHES[:-1]:
        assert "British spelling" in CB.system_prompt(bench, tmp_path)


def test_default_context_reads_the_project(project):
    (project / "music").mkdir()
    (project / "music" / "current.song.json").write_text("{}")
    ctx = CB.default_context("music", project)
    assert ctx["song"].endswith("current.song.json") and ctx["style"] == "godmarrow" and ctx["characters"] == []


# ---------------------------------------------------------------- the stream: progress words and the summary
def test_tool_words_map_tools_and_song_ops():
    assert CB.tool_words("mcp__pixelforge__draft_shapes", {"text": "x"}) == ["drafting the model"]
    assert CB.tool_words("mcp__pixelforge__edit_song", {"ops": [{"op": "set_tempo", "tempo": 76}, {"op": "mute", "lane": "drums"}, {"op": "generate_bar", "bar": 3}]}) == \
        ["setting tempo 76", "muting drums", "writing bar 3"]
    assert CB.tool_words("mcp__pixelforge__compose_music", {"genre": "dungeon_synth"}) == ["composing a dungeon synth piece"]
    assert CB.tool_words("mcp__pixelforge__make_effect", {"kind": "wisp"}) == ["drawing a wisp effect"]
    assert CB.tool_words("Read", {"file_path": "/p/music/current.song.json"}) == ["reading current.song.json"]
    assert CB.tool_words("mcp__claude-in-chrome__navigate", {"url": "https://www.midjourney.com/imagine"}) == ["opening www.midjourney.com"]
    assert CB.tool_words("mcp__pixelforge__something_new", {}) == ["something new"]
    ev = {"type": "assistant", "message": {"content": [{"type": "text", "text": "hm"}, {"type": "tool_use", "name": "mcp__pixelforge__render_shapes", "input": {}}]}}
    assert CB.event_words(ev) == ["rendering the clips"]
    assert CB.event_words({"type": "user"}) == []


def test_parse_summary_finds_the_last_json_with_did():
    text = 'Done. Here is the summary:\n{"did": ["set tempo"], "changed": ["/p/s.json"], "notes": "Slower."}\n'
    assert CB.parse_summary(text) == {"did": ["set tempo"], "changed": ["/p/s.json"], "notes": "Slower."}
    text = '{"other": 1} then {"did": "one thing", "changed": [], "notes": ""} and {"did": ["last"], "changed": ["a"], "notes": "x"}'
    assert CB.parse_summary(text)["did"] == ["last"]
    assert CB.parse_summary("no json here") is None
    assert CB.parse_summary('{"notes": "no did or changed"}') is None
    assert CB.result_text({"result": [{"type": "text", "text": "a"}, "b"]}) == "a b"


# ---------------------------------------------------------------- files: changed, snapshot and undo
def test_snapshot_and_restore_round_trip(project):
    music = project / "music"
    music.mkdir()
    song = music / "current.song.json"
    song.write_text('{"tempo": 72}')
    m = CB.snapshot(project, "music")
    assert Path(m["manifest"]).exists() and "music/current.song.json" in m["files"]
    song.write_text('{"tempo": 76}')
    (music / "extra.song.json").write_text("{}")
    (music / "bar.wav").write_bytes(b"RIFF")
    r = CB.restore(m["manifest"])
    assert r["ok"] and json.loads(song.read_text())["tempo"] == 72
    assert not (music / "extra.song.json").exists() and not (music / "bar.wav").exists()
    assert CB.bench_roots("characters") == ["characters", "drafts", "project.json"] and CB.bench_roots("midjourney") == []


def test_changed_files_sees_new_and_edited(project):
    before = CB.file_state(project)
    (project / "fx").mkdir()
    (project / "fx" / "a.png").write_bytes(b"x")
    (project / "claude").mkdir()
    (project / "claude" / "log.jsonl").write_text("ignored")
    after = CB.file_state(project)
    assert CB.changed_files(before, after) == [str(project / "fx" / "a.png")]


# ---------------------------------------------------------------- running the mock
def test_run_mock_on_characters_makes_a_model_and_reports(project, monkeypatch):
    use_mock(monkeypatch, "characters.jsonl")
    seen = []
    r = CB.run("characters", project, "a hooded necromancer with a skull staff", on_progress=seen.append)
    assert r["ok"], r
    assert seen == ["adding a_hooded_necromancer", "drafting the model", "putting the model on the bench"]
    assert r["did"][0].startswith("added") and "painting prompts" in r["notes"]
    model = project / "characters" / "a_hooded_necromancer" / "shapes" / "a_hooded_necromancer.shapes.json"
    assert model.exists() and str(model) in r["changed"]
    assert Path(r["log"]).exists() and Path(r["snapshot"]).exists() and r["cost_usd"] == 0.12
    first = json.loads(Path(r["log"]).read_text().splitlines()[0])
    assert first["bench"] == "characters" and "mock" in " ".join(first["command"])
    # undo puts the project back as it was: the character folder's files gone, project.json as before
    r2 = CB.restore(r["snapshot"])
    assert r2["ok"] and not model.exists()
    assert "a_hooded_necromancer" not in json.loads((project / "project.json").read_text()).get("characters", {})


def test_run_mock_on_music_edits_the_song(project, monkeypatch):
    use_mock(monkeypatch, "music.jsonl")
    from pixelforge.music import library as L, song as S
    (project / "music").mkdir()
    S.save(L.load_piece("forge_home"), project / "music" / "current.song.json")
    r = CB.run("music", project, "slower, darker")
    assert r["ok"] and r["progress"] == ["reading current.song.json", "setting tempo 76", "setting crunch", "placing a note"]
    assert S.load(project / "music" / "current.song.json")["tempo"] == 76.0
    assert r["changed"] == [str(project / "music" / "current.song.json")]


def test_run_times_out_with_a_plain_sentence(project, monkeypatch):
    use_mock(monkeypatch, "slow.jsonl")
    r = CB.run("characters", project, "anything", timeout=1.0)
    assert r["ok"] is False and r["error"].startswith("Claude did not finish within 1 s") and r["progress"] == ["rendering the clips"]


def test_run_error_result_becomes_a_sentence(project, monkeypatch):
    use_mock(monkeypatch, "error.jsonl")
    r = CB.run("effects", project, "a wisp")
    assert r["ok"] is False and r["error"] == CB.NOT_SIGNED_IN


def test_run_without_the_cli_says_so(project, monkeypatch):
    monkeypatch.delenv("PIXELFORGE_CLAUDE", raising=False)
    monkeypatch.setattr(CB, "find_claude", lambda hint=None: None)
    r = CB.run("effects", project, "a wisp")
    assert r["ok"] is False and r["state"] == "not_found" and "Claude Code was not found" in r["error"]


def test_dry_run_builds_only(project, monkeypatch):
    monkeypatch.delenv("PIXELFORGE_CLAUDE", raising=False)
    monkeypatch.setattr(CB, "find_claude", lambda hint=None: "/x/claude")
    r = CB.run("tiles", project, "mossy stone", dry_run=True)
    assert r["dry_run"] and r["command"][0] == "/x/claude" and "Tiles bench" in r["system_prompt"]
    assert not (project / "claude").exists()


def test_midjourney_fetch_through_the_mock(project, monkeypatch):
    use_mock(monkeypatch, "midjourney.jsonl")
    out = project / "midjourney_mock"
    words = []
    r = CB.fetch_midjourney("a prompt", out, project, image=None, on_progress=words.append)
    assert r["ok"], r
    assert words[:2] == ["opening www.midjourney.com", "typing"] and "looking at the page" in words
    assert r["files"] and all(Path(f).exists() and f.endswith(".png") for f in r["files"])
    assert "Picked the second" in r["notes"]
    use_mock(monkeypatch, "no_chrome.jsonl")
    r = CB.fetch_midjourney("a prompt", out, project)
    assert r["ok"] is False and r["error"] == CB.CHROME_NOT_CONNECTED and "Copy prompt" in r["error"]


def test_midjourney_prompt_kinds_and_system_prompt(tmp_path):
    p = CB.midjourney_prompt("props9", "an iron lantern")
    assert p.startswith("reference sheet of nine iron lantern props") and "--no text" in p
    assert "object turnaround reference sheet of a chest" in CB.midjourney_prompt("turnaround", "a chest")
    assert "character turnaround reference sheet of a knight" in CB.midjourney_prompt("sheet_px", "a knight")
    sp = CB.midjourney_system_prompt("THE PROMPT", tmp_path, "/clay/front.png", "best")
    assert "midjourney.com/imagine" in sp and "THE PROMPT" in sp and "/clay/front.png" in sp and "one job" in sp and "best matches" in sp
    assert "all four" in CB.midjourney_system_prompt("x", tmp_path, None, "all")
    cmd = CB.fetch_midjourney("x", tmp_path / "o", tmp_path, image=str(tmp_path / "img.png"), dry_run=True)["command"]
    assert "--chrome" in cmd and str(tmp_path) in cmd and cmd[-1].startswith("Paint it")


# ---------------------------------------------------------------- the mock itself and the CLI
def test_mock_substitutes_and_exits(tmp_path, monkeypatch):
    monkeypatch.setenv("PIXELFORGE_MOCK_DELAY", "0")
    script = tmp_path / "s.jsonl"
    script.write_text('{"type":"system","subtype":"init","cwd":"{project}","slug":"{slug}"}\n{"mock":"exit","code":3}\n{"type":"result"}\n')
    r = subprocess.run([sys.executable, "-m", "pixelforge.claude_bridge", "mock", str(script), "music", "C:\\\\Forge", "A Hooded Necromancer, tall"],
                       capture_output=True, text=True, cwd=str(CB.PF_ROOT))
    assert r.returncode == 3
    lines = [json.loads(l) for l in r.stdout.splitlines()]
    assert lines == [{"type": "system", "subtype": "init", "cwd": "C:\\\\Forge", "slug": "a_hooded_necromancer"}]


def test_cli_parsers_for_the_bench_verbs():
    p = build_parser()
    a = p.parse_args(["describe", "--bench", "music", "-p", "/f", "slower", "--json", "--dry-run"])
    assert a.bench == "music" and a.project == "/f" and a.text == "slower" and a.dry_run and a.timeout == 600.0
    a = p.parse_args(["claude", "status", "--json"])
    assert a.claude_cmd == "status"
    a = p.parse_args(["claude", "register", "--python", "/py"])
    assert a.claude_cmd == "register" and a.python == "/py"
    a = p.parse_args(["claude", "undo", "/m.json"])
    assert a.manifest == "/m.json"
    a = p.parse_args(["midjourney", "fetch", "--prompt", "x", "--image", "c.png", "-o", "/out", "-p", "/f", "--pick", "all", "--json"])
    assert a.midjourney_cmd == "fetch" and a.pick == "all" and a.image == "c.png" and a.timeout == 900.0
    a = p.parse_args(["midjourney", "prompt", "--kind", "props9", "--describe", "a chest"])
    assert a.kind == "props9"
    with pytest.raises(SystemExit):
        p.parse_args(["describe", "--bench", "kitchen", "x"])


def test_describe_on_bench_carries_the_prompts_and_progress_lines(project, monkeypatch, capsys):
    use_mock(monkeypatch, "characters.jsonl")
    r = describe_on_bench("characters", str(project), "a hooded necromancer with a skull staff")
    assert r["ok"] and r["model_file"].endswith("characters/a_hooded_necromancer/shapes/a_hooded_necromancer.shapes.json")
    assert set(r["prompts"]) >= {"sheet", "sheet_px", "sheet4", "sprite"} and r["about"] == "a hooded necromancer with a skull staff"
    assert "a hooded necromancer with a skull staff" in r["prompts"]["sheet_px"] and r["prompt_titles"]["sheet_px"].startswith("A5.")
    err = capsys.readouterr().err
    assert "PF_PROGRESS step=claude done=1 total=0 note=adding+a_hooded_necromancer" in err and "note=drafting+the+model" in err
    use_mock(monkeypatch, "music.jsonl")
    (project / "music").mkdir(exist_ok=True)
    from pixelforge.music import library as L, song as S
    S.save(L.load_piece("forge_home"), project / "music" / "current.song.json")
    r = describe_on_bench("music", str(project), "slower")
    assert r["ok"] and "prompts" not in r


def test_cli_claude_log_and_undo(project, monkeypatch, capsys):
    from pixelforge.cli import main
    use_mock(monkeypatch, "music.jsonl")
    (project / "music").mkdir()
    from pixelforge.music import library as L, song as S
    S.save(L.load_piece("forge_home"), project / "music" / "current.song.json")
    tempo0 = S.load(project / "music" / "current.song.json")["tempo"]
    main(["describe", "--bench", "music", "-p", str(project), "slower", "--json"])
    r = json.loads(capsys.readouterr().out)
    assert r["ok"] and S.load(project / "music" / "current.song.json")["tempo"] == 76.0
    main(["claude", "log", "-p", str(project), "--json"])
    log = json.loads(capsys.readouterr().out)
    assert log["ok"] and log["log"].endswith("_music.jsonl") and log["lines"] > 3
    main(["claude", "undo", r["snapshot"], "--json"])
    u = json.loads(capsys.readouterr().out)
    assert u["ok"] and S.load(project / "music" / "current.song.json")["tempo"] == tempo0
    main(["claude", "status"])
    assert "ready" in capsys.readouterr().out


def test_forge_benches_carry_the_claude_hooks():
    """Every workbench script answers the describe line: the base has the line, the run and the undo; each bench its reload."""
    forge = CB.PF_ROOT / "forge"
    base = (forge / "scripts/screen.gd").read_text()
    for name in ["add_describe_line", "_describe", "on_claude_done", "on_claude_undone", "claude_context", "_highlight_changed", "claude_snapshot",
                 '"describe", "--bench"', '"claude", "undo"']:
        assert name in base, name
    for screen in ["characters", "music", "effects", "tiles", "interface", "sound"]:
        text = (forge / "scripts/screens" / f"{screen}.gd").read_text()
        assert "func on_claude_done" in text and "func claude_context" in text, screen
    chars = (forge / "scripts/screens/characters.gd").read_text()
    assert '"midjourney", "fetch"' in chars and "Paint it in Midjourney" in chars and "Copy prompt" in chars
    assert "Fetch a prop sheet of nine" in (forge / "scripts/screens/objects.gd").read_text()
    app = (forge / "scripts/app.gd").read_text()
    assert '"claude", "status"' in app and '"claude", "register"' in app and "Claude: working" in app and "install Claude Code" in app
    for walk in ["describe_walk.txt", "describe_walk_music.txt"]:
        assert (forge / "tools" / walk).exists()
    assert "describe_walk.txt characters.jsonl" in (forge / "tools/screens.sh").read_text()
    assert "claude register" in (CB.PF_ROOT / "install.bat").read_text()
