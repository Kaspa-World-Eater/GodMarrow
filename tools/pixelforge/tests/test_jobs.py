"""The job runner (pixelforge/jobs.py) with the mock bridge: plan parsing and validation, the order, the approval pause and
resume, the failure retry with Claude's fix, resume after an interruption, the report, cancel, the bench classifier and the CLI."""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from pixelforge import jobs as J

MOCKS = Path(__file__).resolve().parent / "claude_mock"


@pytest.fixture
def project(tmp_path, monkeypatch):
    from pixelforge import api
    api.new_project(tmp_path / "forge", "Forge", "godmarrow")
    monkeypatch.setenv("PIXELFORGE_MOCK_DELAY", "0.01")
    monkeypatch.setenv("PIXELFORGE_CLAUDE", f"mock:{MOCKS / 'plan.jsonl'}")
    return tmp_path / "forge"


def plan_of(*steps, title="test job"):
    return {"title": title, "steps": list(steps)}


def vfx_step(sid="s1", kind="wisp", name="w", approve=False, inputs=()):
    return {"id": sid, "title": f"a {kind} effect", "kind": "pipeline", "command": ["vfx", kind, name, "-o", "<project>/fx", "--frames", "4"],
            "outputs": [f"<project>/fx/{name}.png"], "check": {"exists": [f"<project>/fx/{name}.png"]}, "approve": approve, "bench": "effects", "inputs": list(inputs)}


def sfx_step(sid="s2", approve=False):
    return {"id": sid, "title": "a hit sound", "kind": "pipeline", "command": ["sfx", "hit", "-o", "<project>/sfx"], "outputs": ["<project>/sfx"],
            "check": {"min_files": 1, "in": "<project>/sfx"}, "approve": approve, "bench": "sound"}


def progress_list():
    seen = []
    return seen, lambda jid, i, n, words: seen.append((i, n, words))


# ---------------------------------------------------------------- the plan
def test_parse_and_normalise_a_plan_fills_the_project_placeholder(project):
    text = 'Here is the plan. {"title": "t", "steps": [{"title": "x", "kind": "pipeline", "command": ["vfx", "wisp", "w", "-o", "<project>/fx"], "outputs": ["<project>/fx/w.png"]}]} done'
    raw = J.parse_plan(text)
    assert raw and raw["title"] == "t"
    plan = J.normalise_plan(raw, "a wisp", project)
    s = plan["steps"][0]
    assert s["id"] == "s1" and s["command"][4] == str(project / "fx") and s["outputs"] == [str(project / "fx" / "w.png")] and s["approve"] is False and s["check"] == {}
    assert J.validate_plan(plan) == []
    assert J.parse_plan("no json here") is None and J.parse_plan('{"did": []}') is None


def test_validate_plan_names_the_problems():
    assert "no steps" in J.validate_plan({"steps": []})[0]
    bad = J.normalise_plan(plan_of({"id": "a", "kind": "tool"}, {"id": "a", "kind": "claude", "bench": "music"}, {"id": "c", "kind": "pipeline", "command": ["forge"]},
                                   {"id": "d", "kind": "walk"}, {"id": "e", "kind": "pipeline", "command": ["vfx"], "title": "a loot bag"}), "x", "/p")
    probs = " | ".join(J.validate_plan(bad))
    assert "needs tool and action" in probs and "used twice" in probs and "needs bench and text" in probs and "`forge`" in probs and "kind must be" in probs and "'loot' is banned" in probs


def test_approve_none_turns_every_pause_off(project):
    plan = J.normalise_plan(plan_of(vfx_step(approve=True)), "x", project, approve="none")
    assert plan["steps"][0]["approve"] is False


def test_ask_plan_through_the_mock_bridge(project):
    r = J.ask_plan(project, "a pale wisp effect, a hit sound and a short crypt tune")
    assert r["ok"], r
    plan = r["plan"]
    assert [s["id"] for s in plan["steps"]] == ["s1", "s2", "s3", "s4"] and plan["steps"][3]["approve"] is True and plan["steps"][0]["command"][4] == str(project / "fx")
    assert plan["title"] == "a wisp, a hit and a crypt tune" and "Effects" in plan["notes"]
    dry = J.ask_plan(project, "x", dry_run=True)
    assert dry["dry_run"] and "planner" in dry["system_prompt"] and "<project>" in dry["system_prompt"] and "vfx <kind>" in dry["system_prompt"]


def test_ask_plan_without_a_plan_in_the_answer_is_a_sentence(project, monkeypatch):
    monkeypatch.setenv("PIXELFORGE_CLAUDE", f"mock:{MOCKS / 'music.jsonl'}")
    r = J.ask_plan(project, "x")
    assert r["ok"] is False and "without a plan" in r["error"]
    monkeypatch.setenv("PIXELFORGE_CLAUDE", f"mock:{MOCKS / 'error.jsonl'}")
    assert J.ask_plan(project, "x")["ok"] is False


def test_benches_in_a_sentence():
    assert J.benches_in("a pale wisp effect, a hit sound and a short crypt tune") == ["effects", "music", "sound"]
    assert J.benches_in("slower, 76 bpm, darker") == ["music"]
    assert J.benches_in("a hooded necromancer with a longer cape") == ["characters"]
    assert J.benches_in("some ground tiles and the inventory icons") == ["tiles", "interface"]


# ---------------------------------------------------------------- running: order, approval, resume, report
def test_start_runs_the_steps_in_order_and_writes_the_files(project):
    seen, on_p = progress_list()
    r = J.start(project, "a wisp and a hit", plan=plan_of(vfx_step(), sfx_step()), on_progress=on_p)
    assert r["ok"] and r["state"] == "done" and r["done"] == 2 and r["total"] == 2
    assert [s["status"] for s in r["steps"]] == ["done", "done"]
    assert (project / "fx" / "w.png").exists() and list((project / "sfx").glob("*.wav"))
    d = Path(r["dir"])
    assert (d / "plan.json").exists() and (d / "state.json").exists() and (d / "report.md").exists() and (d / "report.json").exists()
    assert (d / "steps" / "s1" / "result_1.json").exists() and (d / "steps" / "s1" / "stdout_1.txt").exists()
    assert [w for i, n, w in seen] == ["a wisp effect", "a hit sound", "finished"] and seen[0][1] == 2
    events = [json.loads(l)["event"] for l in (d / "log.jsonl").read_text().splitlines()]
    assert events == ["planned", "started", "step", "done", "step", "done", "done"]
    rep = json.loads((d / "report.json").read_text())
    assert [m["title"] for m in rep["made"]] == ["a wisp effect", "a hit sound"] and rep["could_not"] == [] and rep["pictures"] and rep["pictures"][0].endswith("w.png")
    md = (d / "report.md").read_text()
    assert "## What was made" in md and "![w.png]" in md and "Everything in the plan was done." in md
    assert J.list_jobs(project)["jobs"][0]["state"] == "done"


def test_an_approval_step_pauses_the_job_until_approved_then_resumes(project):
    seen, on_p = progress_list()
    r = J.start(project, "x", plan=plan_of(vfx_step(), sfx_step(approve=True)), on_progress=on_p)
    assert r["state"] == "waiting" and r["waiting"] == "a hit sound" and r["waiting_step"] == "s2" and r["done"] == 1 and r["resumable"]
    assert seen[-1][2].startswith("waiting for approval")
    assert not list((project / "sfx").glob("*.wav")) if (project / "sfx").exists() else True
    lst = J.list_jobs(project)
    assert lst["waiting"] == [r["id"]] and lst["jobs"][0]["waiting"] == "a hit sound"
    rep = json.loads(Path(r["dir"], "report.json").read_text())
    assert rep["state"] == "waiting" and rep["waiting"] == "a hit sound" and len(rep["made"]) == 1
    # resume without approval waits again; approve, then resume runs it
    again = J.resume(project, r["id"])
    assert again["state"] == "waiting"
    a = J.approve(project, r["id"])
    assert a["ok"] and a["approved"] == "s2" and a["state"] == "planned"
    done = J.resume(project, r["id"], on_progress=on_p)
    assert done["state"] == "done" and done["steps"][1]["status"] == "done" and list((project / "sfx").glob("*.wav"))
    assert done["steps"][0]["attempts"] == 1          # the finished step was not run again
    assert "nothing waits" in J.approve(project, r["id"])["error"]


def test_a_failed_step_is_tried_once_more_with_claudes_fix(project, monkeypatch):
    broken = vfx_step(kind="nosuchkind")
    fixes = []

    def fake_fix(proj, step, result, on_progress=None):
        fixes.append((step["id"], result["error"]))
        fixed = dict(step)
        fixed["command"] = ["vfx", "wisp", "w", "-o", str(project / "fx"), "--frames", "4"]
        return fixed
    monkeypatch.setattr(J, "ask_fix", fake_fix)
    r = J.start(project, "x", plan=plan_of(broken, sfx_step()))
    assert r["state"] == "done", r
    s1 = r["steps"][0]
    assert s1["status"] == "done" and s1["attempts"] == 2 and s1["fixed"] is True and fixes and fixes[0][0] == "s1" and fixes[0][1]
    plan = json.loads(Path(r["dir"], "plan.json").read_text())
    assert plan["steps"][0]["command"][1] == "wisp"               # the fixed step is what the plan now holds
    events = [json.loads(l) for l in Path(r["dir"], "log.jsonl").read_text().splitlines()]
    assert any(e["event"] == "fix" for e in events)
    assert "(fixed once)" in Path(r["dir"], "report.md").read_text()


def test_without_a_fix_the_step_fails_and_its_dependants_are_skipped(project, monkeypatch):
    monkeypatch.setattr(J, "ask_fix", lambda proj, step, result, on_progress=None: None)
    dep = sfx_step()
    dep["inputs"] = ["<project>/fx/w.png"]
    r = J.start(project, "x", plan=plan_of(vfx_step(kind="nosuchkind"), dep, vfx_step(sid="s3", kind="fire", name="f")))
    assert r["state"] == "failed" and [s["status"] for s in r["steps"]] == ["failed", "skipped", "done"]
    assert r["steps"][0]["attempts"] == 2 and r["steps"][0]["error"] and "needs what a failed step" in r["steps"][1]["error"]
    rep = json.loads(Path(r["dir"], "report.json").read_text())
    assert [c["title"] for c in rep["could_not"]] == ["a nosuchkind effect", "a hit sound"] and rep["could_not"][0]["why"] and len(rep["made"]) == 1
    md = Path(r["dir"], "report.md").read_text()
    assert "## What could not be done, and why" in md and "- **a hit sound**: skipped" in md
    # resume tries the failed and skipped steps again (still broken here: the fix is None)
    again = J.resume(project, r["id"])
    assert again["state"] == "failed" and again["steps"][2]["attempts"] == 1


def test_fix_prompt_and_ask_fix_parse(project, monkeypatch):
    step = vfx_step(kind="nosuchkind")
    p = J.fix_prompt(step, {"error": "unknown kind", "stdout": "tail"}, project)
    assert "fixer" in p and "nosuchkind" in p and "give_up" in p
    from pixelforge import claude_bridge as CB
    monkeypatch.setattr(CB, "status", lambda exe=None: {"ok": True})
    monkeypatch.setattr(CB, "run", lambda *a, **k: {"ok": True, "result_text": json.dumps({**step, "command": ["vfx", "wisp", "w", "-o", "<project>/fx"]})})
    fixed = J.ask_fix(project, step, {"error": "x"})
    assert fixed["command"][1] == "wisp" and fixed["command"][4] == str(project / "fx") and fixed["id"] == "s1"
    monkeypatch.setattr(CB, "run", lambda *a, **k: {"ok": True, "result_text": '{"give_up": "no such kind exists"}'})
    assert J.ask_fix(project, step, {"error": "x"}) is None
    monkeypatch.setattr(CB, "status", lambda exe=None: {"ok": False})
    assert J.ask_fix(project, step, {"error": "x"}) is None


def test_resume_after_an_interruption_continues_from_the_last_finished_step(project):
    r = J.start(project, "x", plan=plan_of(vfx_step(), sfx_step(), vfx_step(sid="s3", kind="fire", name="f")))
    assert r["state"] == "done"
    d = Path(r["dir"])
    # the Forge closed while s3 ran: the state says running under a pid that is gone, s3 never finished
    st = json.loads((d / "state.json").read_text())
    st["state"] = "running"
    st["pid"] = 999999
    st["current"] = "s3"
    st["steps"]["s3"] = {"status": "pending", "attempts": 0, "error": "", "outputs": [], "seconds": 0.0, "fixed": False}
    (d / "state.json").write_text(json.dumps(st))
    (project / "fx" / "f.png").unlink()
    assert J.status(project, r["id"])["state"] == "interrupted"
    lst = J.list_jobs(project)
    assert lst["resumable"] == [r["id"]] and lst["jobs"][0]["state"] == "interrupted"
    rep = J.write_report(project, r["id"])
    assert rep["could_not"][0]["why"].startswith("the Forge closed")
    seen, on_p = progress_list()
    again = J.resume(project, r["id"], on_progress=on_p)
    assert again["state"] == "done" and (project / "fx" / "f.png").exists()
    assert [w for i, n, w in seen] == ["a fire effect", "finished"] and again["steps"][0]["attempts"] == 1 and again["steps"][2]["attempts"] == 1


def test_a_running_job_is_not_started_twice(project):
    r = J.start(project, "x", plan=plan_of(vfx_step()), run_now=False)
    d = Path(r["dir"])
    st = json.loads((d / "state.json").read_text())
    st["state"] = "running"
    st["pid"] = os.getpid()           # alive
    (d / "state.json").write_text(json.dumps(st))
    assert "already running" in J.run_job(project, r["id"])["error"]
    assert "running already" in J.resume(project, r["id"])["error"]


def test_cancel_stops_a_job_before_its_next_step_and_a_waiting_job(project):
    r = J.start(project, "x", plan=plan_of(vfx_step(), sfx_step()), run_now=False)
    c = J.cancel(project, r["id"])
    assert c["ok"] and c["state"] == "cancelled"
    assert J.run_job(project, r["id"])["state"] == "cancelled" and not (project / "fx" / "w.png").exists()
    r2 = J.start(project, "x", plan=plan_of(vfx_step(name="w2"), sfx_step(approve=True)))
    assert r2["state"] == "waiting"
    c2 = J.cancel(project, r2["id"])
    assert c2["state"] == "cancelled" and c2["done"] == 1
    rep = json.loads(Path(r2["dir"], "report.json").read_text())
    assert rep["state"] == "cancelled" and rep["could_not"][0]["why"] == "the job was stopped" and len(rep["made"]) == 1
    assert "stopped" in Path(r2["dir"], "report.md").read_text()
    # resume after cancel carries on
    again = J.approve(project, r2["id"], "s2")
    assert J.resume(project, r2["id"])["state"] == "done"


def test_the_cancel_flag_on_disk_stops_a_runner_between_steps(project, monkeypatch):
    """A `job cancel` from another process writes the flag; the runner reads it before every step."""
    r = J.start(project, "x", plan=plan_of(vfx_step(), sfx_step()), run_now=False)
    d = Path(r["dir"])
    real = J.run_pipeline_step

    def run_and_cancel(step, proj, timeout=1800.0, on_line=None):
        res = real(step, proj, timeout, on_line)
        st = json.loads((d / "state.json").read_text())
        st["cancel"] = True
        (d / "state.json").write_text(json.dumps(st))
        return res
    monkeypatch.setattr(J, "run_pipeline_step", run_and_cancel)
    out = J.run_job(project, r["id"])
    assert out["state"] == "cancelled" and out["steps"][0]["status"] == "done" and out["steps"][1]["status"] == "pending"


def test_tool_and_claude_steps_run_through_the_adapters_and_the_bridge(project, monkeypatch):
    from pixelforge import tools as T
    calls = []
    monkeypatch.setattr(T, "run", lambda name, action, params: (calls.append((name, action, params)) or {"ok": True, "gif": params.get("out", "")}))
    gif = project / "fx" / "w.gif"
    gif.parent.mkdir(exist_ok=True)
    gif.write_bytes(b"GIF")
    plan = plan_of({"id": "t1", "title": "a gif of the frames", "kind": "tool", "tool": "ffmpeg", "action": "gif", "params": {"frames_dir": "<project>/fx", "out": "<project>/fx/w.gif"},
                    "outputs": ["<project>/fx/w.gif"], "bench": "effects"},
                   {"id": "c1", "title": "slower", "kind": "claude", "bench": "music", "text": "slower, 76 bpm", "outputs": []})
    monkeypatch.setenv("PIXELFORGE_CLAUDE", f"mock:{MOCKS / 'music.jsonl'}")
    (project / "music").mkdir(exist_ok=True)
    subprocess.run([sys.executable, "-m", "pixelforge.cli", "music", "compose", "-o", str(project / "music" / "current.song.json"), "--bars", "4", "--json"], capture_output=True, check=True)
    r = J.start(project, "x", plan=plan)
    assert r["state"] == "done", r
    assert calls == [("ffmpeg", "gif", {"frames_dir": str(project / "fx"), "out": str(gif)})]
    assert r["steps"][1]["status"] == "done" and json.loads((project / "music" / "current.song.json").read_text())["tempo"] == 76
    rep = json.loads(Path(r["dir"], "report.json").read_text())
    assert rep["made"][0]["pictures"] == [str(gif)]


def test_a_tool_step_for_a_missing_tool_fails_with_the_install_sentence(project, monkeypatch):
    from pixelforge.tools import aseprite
    monkeypatch.setattr(aseprite, "find", lambda: None)
    monkeypatch.setattr(J, "ask_fix", lambda *a, **k: None)
    r = J.start(project, "x", plan=plan_of({"id": "t1", "title": "open in Aseprite", "kind": "tool", "tool": "aseprite", "action": "open", "params": {"frames_dir": "<project>/fx"}, "approve": False}))
    assert r["state"] == "failed" and "aseprite.org" in r["steps"][0]["error"]


def test_check_step_reads_outputs_and_min_files(tmp_path):
    (tmp_path / "a.png").write_bytes(b"x")
    assert J.check_step({"outputs": [str(tmp_path / "a.png")], "check": {}}, {}) == ""
    assert "missing" in J.check_step({"outputs": [str(tmp_path / "b.png")], "check": {}}, {})
    assert "only 1 files" in J.check_step({"outputs": [str(tmp_path)], "check": {"min_files": 3, "in": str(tmp_path)}}, {})


def test_pictures_of_makes_a_strip_for_a_frames_folder(tmp_path):
    from PIL import Image
    fr = tmp_path / "idle_S"
    fr.mkdir()
    for i in range(3):
        Image.new("RGBA", (4, 6), (i, 0, 0, 255)).save(fr / f"frame_{i:03d}.png")
    pics = J.pictures_of({"id": "s1", "outputs": [str(tmp_path)]}, {"result": {}}, tmp_path / "steps")
    assert len(pics) == 1 and pics[0].endswith("s1_strip.png") and Image.open(pics[0]).size == (12, 6)


# ---------------------------------------------------------------- the CLI
def test_cli_job_verbs(project, capsys, tmp_path):
    from pixelforge.cli import main
    pfile = tmp_path / "plan.json"
    pfile.write_text(json.dumps(plan_of(vfx_step(), sfx_step(approve=True))))
    main(["job", "start", "a wisp and a hit", "-p", str(project), "--plan", str(pfile), "--json"])
    cap = capsys.readouterr()
    r = json.loads(cap.out)
    assert r["state"] == "waiting" and "PF_PROGRESS step=job id=" in cap.err and "note=waiting+for+approval" in cap.err
    main(["job", "list", "-p", str(project)])
    assert "waiting" in capsys.readouterr().out
    main(["job", "status", r["id"], "-p", str(project), "--json"])
    assert json.loads(capsys.readouterr().out)["waiting"] == "a hit sound"
    main(["job", "approve", r["id"], "-p", str(project), "--run", "--json"])
    assert json.loads(capsys.readouterr().out)["state"] == "done"
    main(["job", "report", r["id"], "-p", str(project)])
    assert "## What was made" in capsys.readouterr().out
    main(["job", "log", r["id"], "-p", str(project), "--lines", "3"])
    assert capsys.readouterr().out.count("\n") == 3
    with pytest.raises(SystemExit):
        main(["job", "status", "nope", "-p", str(project)])
    capsys.readouterr()
    main(["describe", "a pale wisp effect and a hit sound", "--json"])
    assert json.loads(capsys.readouterr().out)["benches"] == ["effects", "sound"]
    main(["job", "start", "a wisp", "-p", str(project), "--json"])        # the mock planner
    assert json.loads(capsys.readouterr().out)["state"] == "waiting"
