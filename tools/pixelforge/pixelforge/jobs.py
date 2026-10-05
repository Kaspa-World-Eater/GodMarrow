"""Jobs: one sentence becomes a plan of steps, and the runner carries the plan out while the Forge watches.

    pixelforge job start "a pale wisp effect, a hit sound and a short crypt tune" -p <project> [--approve steps|none] [--plan FILE]
    pixelforge job list | status ID | log ID | approve ID [--step S] [--run] | cancel ID | resume ID | report ID

A plan is JSON written by Claude through the bridge (``ask_plan``: the planner's system prompt names the pipeline's
commands, the tool adapters found on this computer and the benches) or given by hand (``--plan``). Each step is one
of three kinds, with inputs, outputs and a check:

    {"id": "s1", "title": "a pale wisp effect", "kind": "pipeline", "command": ["vfx", "wisp", "pale_wisp", "-o", "<project>/fx", "--palette", "wisp"],
     "inputs": [], "outputs": ["<project>/fx/pale_wisp.png"], "check": {"exists": ["<project>/fx/pale_wisp.png"]}, "approve": false, "bench": "effects"}
    {"id": "s2", "kind": "tool", "tool": "ffmpeg", "action": "gif", "params": {"frames_dir": "...", "out": "..."}, ...}
    {"id": "s3", "kind": "claude", "bench": "music", "text": "slower, 76 bpm, darker", ...}

The runner (``run_job``) is an ordinary child process of whoever started it (the Forge's backend or a terminal) and
stops with it; nothing is detached. Everything it knows is on disk under ``<project>/jobs/<id>/``: ``plan.json``,
``state.json`` (each step's status, the runner's pid, the cancel flag, the approvals), ``log.jsonl``, ``steps/<id>/``
(each step's result and pictures), ``report.md`` and ``report.json``. So a job stopped by a restart is resumed from
its last finished step with ``job resume``; a step marked ``approve`` pauses the job (state ``waiting``) until ``job
approve``; a failed step is tried once more after Claude is asked to fix it (``ask_fix``), then marked failed and the
steps that need its outputs are skipped; the report says what was made, where, with pictures, and what could not be
done and why. Progress goes to the caller as ``PF_PROGRESS step=job id=... done=i total=n note=words``.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

from . import claude_bridge as CB

JOBS_DIR = "jobs"
KINDS = ("pipeline", "tool", "claude")
STEP_TIMEOUT = 1800.0
PLAN_TIMEOUT = 300.0
PICTURE_EXT = (".png", ".gif", ".jpg", ".jpeg", ".webp")
BENCH_WORDS = {
    "characters": ["character", "hero", "necromancer", "knight", "mage", "warrior", "priest", "figure", "humanoid", "npc", "villager", "guard", "skeleton", "revenant"],
    "creatures": ["creature", "beast", "fiend", "horror", "monster", "hound", "wraith"],
    "objects": ["object", "prop", "chest", "skull", "tree", "barrel", "crate", "door", "table", "statue", "altar", "lantern post", "gravestone", "coffin"],
    "effects": ["effect", "spell", "wisp", "fire", "smoke", "burst", "ember", "vfx", "missile", "bolt", "ward", "nova", "ring", "shards", "fog", "rune"],
    "tiles": ["tile", "ground", "floor", "terrain", "flagstone", "mud", "grass", "snow"],
    "interface": ["ui", "interface", "frame", "panel", "icon", "portrait", "button", "menu", "inventory"],
    "music": ["music", "tune", "song", "theme", "melody", "piece", "bpm", "tempo", "chiptune", "score"],
    "sound": ["sound", "sfx", "hit", "footstep", "click", "thud", "whoosh", "rattle", "noise"],
}
PIPELINE_CHEATSHEET = """Pipeline commands (the words after `pixelforge`; every path under the project folder; `--json` is added for you):
  vfx <kind> <name> -o <project>/fx [--palette P --frames N --fps F --style S]        kinds: fire smoke wisp burst embers ring bolt slash circle cloud shards pillar decal drip flash ward vortex rain ashfall fog swarm chain rune pool nova firewall; palettes: wisp lantern miasma bone smoke blood frost amber iron silver poison paper
  spell new <name> -o <project>/fx --preset P  |  spell render <file> -o <project>/fx    presets fireball ward soul_drain bone_shatter lightning_strike
  sfx <preset> -o <project>/sfx [--set freq_mul=1.2 --set decay_mul=0.8 --set crush=2 --set wave=square --seed N]   presets: hit heavy_hit bone_click bone_break thud whoosh pour glass cast wisp pickup ui_tick ui_open death_rattle lantern_light step_stone step_soft coin
  music compose -o <project>/music/<name>.song.json --genre G --mood M --bars 16 [--seed N --key "C# minor" --tempo 76]   genres dungeon_synth gothic_orchestral chiptune dark_ambient battle boss tavern town title victory sorrow exploration synthwave; moods dark hopeful tense calm heroic sombre playful eerie
  music render <song> -o <project>/music --name <name>  |  music edit <song> --op '{"op": "set_tempo", "tempo": 76}'  |  music export <song> -o <game>/audio/music --name <name> --format ogg
  shapes draft "<sentence>" -o <project>/drafts/<name>.shapes.json --height 195  |  shapes validate <file>  |  shapes render <file> -o <dir> --clips idle,walk --directions S,E --style godmarrow  |  shapes preview <file> -o <gif> --clip idle --direction S  |  shapes object <file> -o <dir> --name N
  project add <name> --describe "<sentence>" -p <project>  |  project import-shapes <name> <file> -p <project>  |  project render-shapes <name> -p <project>  |  project export-game <name> --kind K --out <dir> -p <project>
  tiles <texture.png> <name> -o <project>/tiles [--variants 6 --style S]  |  ui9 <panel.png> <name> -o <project>/ui  |  icons <flatlay.png> -o <project>/items  |  portrait <front.png> <name> -o <project>/portraits
  effect <painting.png> <name> -o <project>/fx --kind loop  |  prop <painting.png> <name> -o <project>/objects  |  recolor <sprite.png> <out.png> --hue 20  |  compare <a> <b> -o <out.png>"""


# ---------------------------------------------------------------- the files
def jobs_root(project: str | Path) -> Path:
    return Path(project).resolve() / JOBS_DIR


def job_dir(project: str | Path, job_id: str) -> Path:
    return jobs_root(project) / job_id


def new_id(project: str | Path) -> str:
    base = time.strftime("%Y%m%d_%H%M%S")
    jid = base
    k = 1
    while job_dir(project, jid).exists():
        k += 1
        jid = f"{base}_{k}"
    return jid


def _read(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _write(path: Path, d: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(d, indent=1, default=str), encoding="utf-8")
    os.replace(tmp, path)


def load(project: str | Path, job_id: str) -> tuple[dict, dict]:
    d = job_dir(project, job_id)
    plan, state = _read(d / "plan.json"), _read(d / "state.json")
    if not plan:
        raise FileNotFoundError(f"no job {job_id} under {jobs_root(project)}")
    return plan, state


def log_event(d: Path, event: str, **kw) -> None:
    with (d / "log.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps({"t": time.strftime("%Y-%m-%d %H:%M:%S"), "event": event, **kw}, default=str) + "\n")


def pid_alive(pid: int) -> bool:
    if not pid or pid <= 0:
        return False
    if os.name == "nt":
        try:
            out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/NH"], capture_output=True, text=True, timeout=20).stdout
        except (OSError, subprocess.TimeoutExpired):
            return False
        return str(pid) in out
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


# ---------------------------------------------------------------- the plan
def benches_in(sentence: str) -> list[str]:
    """The benches a sentence touches, by its words (Home starts a job when there are two or more)."""
    s = " " + re.sub(r"[^a-z0-9 ]+", " ", sentence.lower()) + " "
    out = []
    for bench, words in BENCH_WORDS.items():
        if any((" " + w + " ") in s or (" " + w + "s ") in s for w in words):
            out.append(bench)
    return out


def _subst(x, project: Path, game: str):
    if isinstance(x, str):
        return x.replace("<project>", str(project)).replace("<game>", game or str(project / "game"))
    if isinstance(x, list):
        return [_subst(v, project, game) for v in x]
    if isinstance(x, dict):
        return {k: _subst(v, project, game) for k, v in x.items()}
    return x


def normalise_plan(plan: dict, sentence: str, project: str | Path, approve: str = "steps", game: str = "") -> dict:
    """Ids, defaults and the <project> placeholder filled; what the runner reads."""
    project = Path(project).resolve()
    steps = []
    for i, s in enumerate(plan.get("steps", []) or []):
        if not isinstance(s, dict):
            continue
        st = dict(s)
        st["id"] = str(st.get("id") or f"s{i + 1}")
        st["title"] = str(st.get("title") or st.get("id"))
        st["kind"] = str(st.get("kind", "pipeline")).lower()
        st.setdefault("inputs", [])
        st.setdefault("outputs", [])
        st.setdefault("check", {})
        st["approve"] = bool(st.get("approve", False)) and approve != "none"
        st.setdefault("bench", "")
        if st["kind"] == "pipeline":
            st["command"] = [str(c) for c in st.get("command", [])]
        elif st["kind"] == "tool":
            st.setdefault("params", {})
        steps.append(_subst(st, project, game))
    return {"title": str(plan.get("title") or sentence[:60]), "sentence": sentence, "steps": steps, "approve": approve,
            "created": time.strftime("%Y-%m-%d %H:%M:%S"), "project": str(project), "notes": str(plan.get("notes", ""))}


def validate_plan(plan: dict) -> list[str]:
    problems = []
    steps = plan.get("steps", [])
    if not steps:
        problems.append("the plan has no steps")
    ids = set()
    for s in steps:
        sid = s.get("id", "?")
        if sid in ids:
            problems.append(f"step id {sid} is used twice")
        ids.add(sid)
        k = s.get("kind")
        if k not in KINDS:
            problems.append(f"step {sid}: kind must be one of {', '.join(KINDS)}, not {k!r}")
        elif k == "pipeline" and not s.get("command"):
            problems.append(f"step {sid}: a pipeline step needs a command (the words after `pixelforge`)")
        elif k == "tool" and not (s.get("tool") and s.get("action")):
            problems.append(f"step {sid}: a tool step needs tool and action")
        elif k == "claude" and not (s.get("bench") and s.get("text")):
            problems.append(f"step {sid}: a claude step needs bench and text")
        if k == "pipeline" and s.get("command") and str(s["command"][0]) in ("forge", "studio", "mcp", "job", "claude"):
            problems.append(f"step {sid}: `{s['command'][0]}` is not a step a job may run")
        for word in CB.BANNED_WORDS:
            if re.search(r"\b" + re.escape(word) + r"\b", json.dumps(s), re.I) and word.lower() not in ("rot", "cell", "proc"):
                problems.append(f"step {sid}: the word '{word}' is banned in this game")
    return problems


def _json_objects(text: str):
    """The top-level JSON objects in a text, in order (a decoded object is skipped over, so nested ones are not yielded)."""
    dec = json.JSONDecoder()
    text = text or ""
    i = 0
    while i < len(text):
        j = text.find("{", i)
        if j < 0:
            return
        try:
            obj, end = dec.raw_decode(text, j)
        except json.JSONDecodeError:
            i = j + 1
            continue
        if isinstance(obj, dict):
            yield obj
        i = end


def parse_plan(text: str) -> dict | None:
    """The last JSON object in the text that carries "steps"."""
    found = None
    for obj in _json_objects(text):
        if "steps" in obj:
            found = obj
    return found


def _last_json(text: str) -> dict | None:
    found = None
    for obj in _json_objects(text):
        found = obj
    return found


def tools_sentence() -> str:
    from . import tools as T
    s = T.status(with_version=False)
    lines = []
    for r in s["tools"]:
        if r["found"]:
            acts = T.actions_of(T.get(r["name"]))
            lines.append(f"  {r['name']} (found): " + "; ".join(f"{k}{v.split(':')[0]}" for k, v in acts.items() if k != "status"))
    missing = [r["title"] for r in s["tools"] if not r["found"] and not r["browser"]]
    return ("Tool adapters on this computer (kind \"tool\", with tool, action, params):\n" + "\n".join(lines) if lines else "No tool adapter is installed here.") + \
           (f"\nNot installed (do not plan steps with them; say so in notes if the sentence needs one): {', '.join(missing)}." if missing else "")


def plan_prompt(project: str | Path, sentence: str, game: str = "") -> str:
    project = Path(project).resolve()
    return "\n".join([
        "You are the planner of PixelForge's job runner. A person typed one sentence that spans several benches of the Forge; you turn it into a plan of steps "
        "the runner carries out one after another while the person watches. You do not run anything yourself.",
        f"The project folder is {project}. Every output path is under it (use the literal text <project> for the folder; <game> is the game folder). "
        + (f"The game folder is {game}." if game else "No game folder is known: nothing goes into a game in this plan."),
        "Step kinds: \"pipeline\" (a PixelForge command: the words after `pixelforge`, as a JSON list), \"tool\" (a free tool through its adapter: tool, action, params), "
        "\"claude\" (a sentence for the Claude of one bench: bench, text; for edits of a thing already on a bench, such as a song's tempo or a model's cape).",
        PIPELINE_CHEATSHEET,
        tools_sentence(),
        "Benches: characters creatures objects effects tiles interface music sound. Give each step the bench it concerns.",
        "Rules: one thing per step; the fewest steps that do what the sentence says and nothing beyond it; every step lists its outputs (files or folders it makes) and a "
        "check ({\"exists\": [paths]} or {\"min_files\": N, \"in\": folder}); a step's inputs name the outputs of earlier steps it needs; approve is true for a step that "
        "writes into the game folder, opens a program for hand work, or renders a whole character (render-shapes), false otherwise. A short tune is 8 or 16 bars. "
        "Names are lowercase with underscores. British spelling (colour). Never use the words: " + ", ".join(CB.BANNED_WORDS) + ".",
        "Rules of the game's art: " + " ".join(CB.STYLE_RULES[:3]),
        "If part of the sentence cannot be done with these commands and tools, leave it out and say why in notes.",
        'Finish with one line of JSON and nothing after it: {"title": "a few words", "notes": "one sentence for the person, or empty", '
        '"steps": [{"id": "s1", "title": "short words", "kind": "pipeline", "command": ["vfx", "wisp", "pale_wisp", "-o", "<project>/fx", "--palette", "wisp"], '
        '"inputs": [], "outputs": ["<project>/fx/pale_wisp.png"], "check": {"exists": ["<project>/fx/pale_wisp.png"]}, "approve": false, "bench": "effects"}, ...]}',
    ])


def ask_plan(project: str | Path, sentence: str, approve: str = "steps", game: str = "", on_progress=None, dry_run: bool = False, timeout: float = PLAN_TIMEOUT) -> dict:
    """Claude writes the plan through the bridge (the mock stands in with PIXELFORGE_CLAUDE=mock:...)."""
    project = Path(project).resolve()
    r = CB.run("job", project, sentence, prompt=plan_prompt(project, sentence, game), on_progress=(lambda w: on_progress("planning: " + w)) if on_progress else None,
               timeout=timeout, dry_run=dry_run, snapshot_files=False)
    if dry_run:
        return r
    if not r.get("ok"):
        return {"ok": False, "error": r.get("error", "Claude did not answer."), "log": r.get("log", "")}
    text = r.get("result_text") or r.get("notes", "")
    raw = parse_plan(text)
    if raw is None:
        return {"ok": False, "error": "Claude answered without a plan (no JSON with steps). " + (text.strip()[:200] if text.strip() else ""), "log": r.get("log", "")}
    plan = normalise_plan(raw, sentence, project, approve, game)
    problems = validate_plan(plan)
    if problems:
        return {"ok": False, "error": "The plan has problems: " + "; ".join(problems[:4]), "plan": plan, "log": r.get("log", "")}
    plan["cost_usd"] = r.get("cost_usd", 0.0)
    return {"ok": True, "plan": plan, "log": r.get("log", "")}


# ---------------------------------------------------------------- starting, state
def _blank_state(plan: dict) -> dict:
    return {"state": "planned", "current": "", "pid": 0, "started": "", "updated": time.strftime("%Y-%m-%d %H:%M:%S"), "cancel": False, "approved": [],
            "steps": {s["id"]: {"status": "pending", "attempts": 0, "error": "", "outputs": [], "seconds": 0.0, "fixed": False} for s in plan["steps"]}}


def start(project: str | Path, sentence: str, approve: str = "steps", plan: dict | None = None, game: str = "", run_now: bool = True, on_progress=None) -> dict:
    """Write the plan (Claude's, or the one given) under <project>/jobs/<id>/ and run it (unless run_now is False)."""
    project = Path(project).resolve()
    if plan is None:
        got = ask_plan(project, sentence, approve, game, (lambda w: on_progress("", 0, 0, w)) if on_progress else None)
        if not got.get("ok"):
            return got
        plan = got["plan"]
    else:
        plan = normalise_plan(plan, sentence, project, approve, game)
        problems = validate_plan(plan)
        if problems:
            return {"ok": False, "error": "The plan has problems: " + "; ".join(problems[:4]), "plan": plan}
    jid = new_id(project)
    plan["id"] = jid
    d = job_dir(project, jid)
    d.mkdir(parents=True, exist_ok=True)
    (d / "steps").mkdir(exist_ok=True)
    _write(d / "plan.json", plan)
    _write(d / "state.json", _blank_state(plan))
    log_event(d, "planned", title=plan["title"], steps=len(plan["steps"]), sentence=sentence)
    if not run_now:
        return {"ok": True, "id": jid, "state": "planned", "title": plan["title"], "plan": plan, "dir": str(d)}
    return run_job(project, jid, on_progress)


def _refresh(d: Path, st: dict, **kw) -> dict:
    """Update the state on disk (kw may set "state" itself). A cancel flag another process wrote meanwhile is kept."""
    if "cancel" not in kw and _read(d / "state.json").get("cancel"):
        st["cancel"] = True
    st.update(kw)
    st["updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
    _write(d / "state.json", st)
    return st


def display_state(state: dict) -> str:
    """The state with the dead runner found out: 'running' with no process behind it is 'interrupted' (resumable)."""
    s = str(state.get("state", "planned"))
    if s == "running" and not pid_alive(int(state.get("pid", 0) or 0)):
        return "interrupted"
    return s


# ---------------------------------------------------------------- running
def _pf_env() -> dict:
    env = dict(os.environ)
    env.setdefault("PYTHONIOENCODING", "utf-8")
    env["PYTHONPATH"] = str(CB.PF_ROOT) + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
    return env


def run_pipeline_step(step: dict, project: Path, timeout: float = STEP_TIMEOUT, on_line=None) -> dict:
    """One PixelForge command as a child process (`python -m pixelforge.cli <words> --json`); the last JSON it prints is the result."""
    cmd = [sys.executable, "-u", "-m", "pixelforge.cli", *step["command"]]
    if "--json" not in cmd:
        cmd.append("--json")
    t0 = time.time()
    try:
        proc = subprocess.Popen(cmd, cwd=str(project), env=_pf_env(), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
    except OSError as e:
        return {"ok": False, "error": f"the command could not be started ({e})", "command": cmd}
    lines = []
    try:
        for line in iter(proc.stdout.readline, ""):
            lines.append(line.rstrip("\n"))
            if on_line and line.startswith("PF_PROGRESS"):
                on_line(line.strip())
            if time.time() - t0 > timeout:
                proc.kill()
                return {"ok": False, "error": f"the step did not finish within {int(timeout)} s and was stopped", "command": cmd, "stdout": "\n".join(lines[-40:])}
        proc.wait(timeout=30)
    except subprocess.TimeoutExpired:
        proc.kill()
    text = "\n".join(lines)
    res = _last_json(text) or {}
    ok = proc.returncode == 0 and res.get("ok", True) is not False
    err = ""
    if not ok:
        err = str(res.get("error", "")) or _plain_tail(lines) or f"the command stopped with code {proc.returncode}"
    return {"ok": ok, "error": err.split("\n")[0][:300], "result": res, "command": cmd, "stdout": text[-6000:], "seconds": round(time.time() - t0, 1)}


def _plain_tail(lines: list[str]) -> str:
    for l in reversed(lines):
        s = l.strip()
        if s and not s.startswith(("PF_PROGRESS", "{", "}", '"', "[", "]")) and "Traceback" not in s and not s.startswith("File "):
            return s
    return ""


def run_tool_step(step: dict) -> dict:
    from . import tools as T
    t0 = time.time()
    r = T.run(str(step.get("tool", "")), str(step.get("action", "")), dict(step.get("params") or {}))
    r = dict(r)
    r.setdefault("ok", False)
    if not r["ok"]:
        r["error"] = str(r.get("error", "the tool stopped"))
    r["seconds"] = round(time.time() - t0, 1)
    r["result"] = {k: v for k, v in r.items() if k not in ("ok", "error", "seconds")}
    return r


def run_claude_step(step: dict, project: Path, on_progress=None) -> dict:
    r = CB.run(str(step.get("bench", "characters")), project, str(step.get("text", "")), on_progress=on_progress, timeout=float(step.get("timeout", CB.DEFAULT_TIMEOUT)))
    return {"ok": bool(r.get("ok")), "error": str(r.get("error", "")), "result": {"did": r.get("did", []), "changed": r.get("changed", []), "notes": r.get("notes", "")},
            "seconds": r.get("seconds", 0.0), "changed": r.get("changed", [])}


def check_step(step: dict, result: dict) -> str:
    """"" when the step's outputs are there, else the plain problem."""
    chk = step.get("check") or {}
    missing = [p for p in list(chk.get("exists", [])) + list(step.get("outputs", [])) if p and not Path(p).exists()]
    if missing:
        return "expected output missing: " + ", ".join(Path(m).name for m in missing[:3])
    if chk.get("min_files"):
        folder = Path(chk.get("in") or (step.get("outputs") or ["."])[0])
        n = len([p for p in folder.rglob("*") if p.is_file()]) if folder.is_dir() else 0
        if n < int(chk["min_files"]):
            return f"only {n} files in {folder.name}, {int(chk['min_files'])} expected"
    return ""


def pictures_of(step: dict, result: dict, step_dir: Path) -> list[str]:
    """The pictures to show for a step: PNG/GIF outputs, a strip of a frames folder, pictures the result names."""
    pics: list[str] = []
    cands: list[str] = list(step.get("outputs", []))
    res = result.get("result") or {}
    for k in ("png", "gif", "file", "sheet", "strip", "image", "out"):
        if isinstance(res.get(k), str):
            cands.append(res[k])
    for k in ("files", "changed", "pngs"):
        if isinstance(res.get(k), list):
            cands += [str(x) for x in res[k]]
    cands += [str(x) for x in result.get("changed", [])]
    seen = set()
    for c in cands:
        p = Path(c)
        if str(p) in seen or not p.exists():
            continue
        seen.add(str(p))
        if p.is_file() and p.suffix.lower() in PICTURE_EXT and ".parts." not in p.name:
            pics.append(str(p))
        elif p.is_dir():
            frames = sorted(x for x in p.rglob("frame_*.png") if ".parts." not in x.name)
            if frames:
                strip = _strip(frames[:8], step_dir / f"{step['id']}_strip.png")
                if strip:
                    pics.append(strip)
            else:
                pics += [str(x) for x in sorted(p.glob("*.png"))[:2]]
        if len(pics) >= 4:
            break
    return pics


def _strip(frames: list[Path], out: Path) -> str:
    try:
        from PIL import Image
        ims = [Image.open(f).convert("RGBA") for f in frames]
        w = sum(i.width for i in ims)
        h = max(i.height for i in ims)
        sheet = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        x = 0
        for i in ims:
            sheet.paste(i, (x, h - i.height))
            x += i.width
        out.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(out)
        return str(out)
    except Exception:  # noqa: BLE001
        return ""


def fix_prompt(step: dict, result: dict, project: Path) -> str:
    return "\n".join([
        "You are the fixer of PixelForge's job runner. One step of a job failed; you write the corrected step and nothing else. You run nothing yourself.",
        f"The project folder is {project}.",
        "The step, as JSON: " + json.dumps(step),
        "What went wrong: " + str(result.get("error", ""))[:400],
        "The command's last lines: " + str(result.get("stdout", ""))[-800:],
        PIPELINE_CHEATSHEET,
        "Keep the same id, kind and outputs unless the outputs were the mistake. Change only what the error asks for (a flag, a name, a path, a value). "
        "If the step cannot be fixed with these commands, answer {\"give_up\": \"one sentence why\"}.",
        "Finish with one line of JSON and nothing after it: the corrected step object, or the give_up object.",
    ])


def ask_fix(project: Path, step: dict, result: dict, on_progress=None) -> dict | None:
    """Claude's corrected step, or None (gave up, not ready, no answer)."""
    st = CB.status()
    if not st.get("ok"):
        return None
    r = CB.run("job", project, "Fix the step.", prompt=fix_prompt(step, result, project), on_progress=(lambda w: on_progress("asking for a fix: " + w)) if on_progress else None,
               timeout=PLAN_TIMEOUT, snapshot_files=False)
    if not r.get("ok"):
        return None
    obj = _last_json(r.get("result_text") or r.get("notes", ""))
    if not isinstance(obj, dict) or "give_up" in obj or obj.get("kind") not in KINDS:
        return None
    fixed = dict(step)
    fixed.update(obj)
    fixed["id"] = step["id"]
    fixed = _subst(fixed, project, "")
    return fixed if not validate_plan({"steps": [fixed]}) else None


def _depends_on_failed(step: dict, failed_outputs: set[str]) -> bool:
    return any(str(i) in failed_outputs for i in step.get("inputs", []))


def run_job(project: str | Path, job_id: str, on_progress=None) -> dict:
    """Carry the plan out from its first unfinished step. Returns the job's status dict (see `status`)."""
    project = Path(project).resolve()
    plan, state = load(project, job_id)
    d = job_dir(project, job_id)
    if display_state(state) == "running":
        return {"ok": False, "error": f"job {job_id} is already running (pid {state.get('pid')}).", **status(project, job_id)}
    if state.get("state") in ("done", "cancelled"):
        return {"ok": True, **status(project, job_id)}
    steps = plan["steps"]
    total = len(steps)
    state = _refresh(d, state, state="running", pid=os.getpid(), started=state.get("started") or time.strftime("%Y-%m-%d %H:%M:%S"), cancel=False)
    log_event(d, "started", pid=os.getpid())
    failed_outputs: set[str] = set()
    for s in steps:
        if state["steps"][s["id"]]["status"] == "failed":
            failed_outputs |= set(map(str, s.get("outputs", [])))

    def progress(i: int, words: str) -> None:
        if on_progress:
            on_progress(job_id, i, total, words)

    final = "done"
    for i, step in enumerate(steps):
        sid = step["id"]
        rec = state["steps"][sid]
        if rec["status"] == "done":
            continue
        if rec["status"] == "skipped" and not _depends_on_failed(step, failed_outputs):
            rec["status"] = "pending"
        # the cancel flag is on disk so `job cancel` from another process reaches a running job between steps
        if _read(d / "state.json").get("cancel"):
            final = "cancelled"
            break
        if _depends_on_failed(step, failed_outputs):
            rec.update(status="skipped", error="skipped: it needs what a failed step did not make")
            log_event(d, "skipped", step=sid, title=step["title"])
            state = _refresh(d, state)
            continue
        if step.get("approve") and sid not in state.get("approved", []):
            state = _refresh(d, state, state="waiting", current=sid, pid=0)
            log_event(d, "waiting", step=sid, title=step["title"])
            progress(i, "waiting for approval: " + step["title"])
            write_report(project, job_id)
            return {"ok": True, **status(project, job_id)}
        state = _refresh(d, state, current=sid)
        progress(i, step["title"])
        log_event(d, "step", step=sid, title=step["title"], kind=step["kind"])
        result = _run_one(step, project, d, rec, progress, i, total)
        if not result["ok"]:
            # once more, with Claude asked to fix it
            fixed = ask_fix(project, step, result, on_progress=(lambda w: progress(i, w)) if on_progress else None)
            if fixed is not None:
                log_event(d, "fix", step=sid, fixed=fixed)
                step.clear()
                step.update(fixed)
                rec["fixed"] = True
                _write(d / "plan.json", plan)
                progress(i, "again, fixed: " + step["title"])
            else:
                log_event(d, "retry", step=sid, note="no fix came; tried once more as it was")
                progress(i, "again: " + step["title"])
            result = _run_one(step, project, d, rec, progress, i, total)
        if result["ok"]:
            rec.update(status="done", error="", outputs=[p for p in step.get("outputs", []) if Path(str(p)).exists()] or result.get("changed", []))
            log_event(d, "done", step=sid, seconds=result.get("seconds", 0))
        else:
            rec.update(status="failed", error=result.get("error", "stopped"))
            failed_outputs |= set(map(str, step.get("outputs", [])))
            log_event(d, "failed", step=sid, error=rec["error"])
            final = "failed"
        state = _refresh(d, state)
    if final == "done" and any(r["status"] == "failed" for r in state["steps"].values()):
        final = "failed"
    state = _refresh(d, state, state=final, current="", pid=0)
    log_event(d, final)
    progress(total, {"done": "finished", "failed": "finished with a step that could not be done", "cancelled": "stopped"}[final])
    write_report(project, job_id)
    return {"ok": final != "failed" or True, **status(project, job_id)}


def _run_one(step: dict, project: Path, d: Path, rec: dict, progress, i: int, total: int) -> dict:
    rec["attempts"] = int(rec.get("attempts", 0)) + 1
    sdir = d / "steps" / step["id"]
    sdir.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    if step["kind"] == "pipeline":
        result = run_pipeline_step(step, project, float(step.get("timeout", STEP_TIMEOUT)),
                                   on_line=lambda l: progress(i, step["title"] + ": " + _inner_words(l)))
    elif step["kind"] == "tool":
        result = run_tool_step(step)
    else:
        result = run_claude_step(step, project, on_progress=lambda w: progress(i, step["title"] + ": " + w))
    if result.get("ok"):
        problem = check_step(step, result)
        if problem:
            result["ok"] = False
            result["error"] = problem
    result["seconds"] = round(time.time() - t0, 1)
    result["pictures"] = pictures_of(step, result, sdir) if result.get("ok") else []
    rec["seconds"] = float(rec.get("seconds", 0.0)) + result["seconds"]
    rec["pictures"] = result["pictures"]
    _write(sdir / f"result_{rec['attempts']}.json", {k: v for k, v in result.items() if k != "stdout"})
    if result.get("stdout"):
        (sdir / f"stdout_{rec['attempts']}.txt").write_text(result["stdout"], encoding="utf-8")
    return result


def _inner_words(progress_line: str) -> str:
    d = {}
    for part in progress_line[11:].split():
        if "=" in part:
            k, v = part.split("=", 1)
            d[k] = v
    if d.get("note"):
        return d["note"].replace("+", " ")
    if d.get("total") and d.get("total") != "0":
        return f"{d.get('done', '0')} of {d['total']}" + ((" " + d.get("clip", "") + " " + d.get("dir", "")).rstrip() if d.get("clip") else "")
    return ""


# ---------------------------------------------------------------- approve, cancel, resume
def approve(project: str | Path, job_id: str, step: str | None = None) -> dict:
    plan, state = load(project, job_id)
    d = job_dir(project, job_id)
    sid = step or state.get("current") or next((s["id"] for s in plan["steps"] if s.get("approve") and s["id"] not in state.get("approved", [])), "")
    if not sid:
        return {"ok": False, "error": "nothing waits for approval in this job", **status(project, job_id)}
    approved = list(state.get("approved", []))
    if sid not in approved:
        approved.append(sid)
    new_state = "planned" if state.get("state") == "waiting" else state.get("state", "planned")
    _refresh(d, state, approved=approved, state=new_state)
    log_event(d, "approved", step=sid)
    return {"ok": True, "approved": sid, **status(project, job_id)}


def cancel(project: str | Path, job_id: str) -> dict:
    plan, state = load(project, job_id)
    d = job_dir(project, job_id)
    pid = int(state.get("pid", 0) or 0)
    killed = False
    if display_state(state) == "running" and pid and pid != os.getpid():
        try:
            os.kill(pid, signal.SIGTERM)
            killed = True
        except (OSError, ProcessLookupError):
            pass
    for rec in state["steps"].values():
        if rec["status"] == "running":
            rec["status"] = "pending"
    _refresh(d, state, cancel=True, state="cancelled", pid=0, current="")
    log_event(d, "cancelled", killed=killed)
    write_report(project, job_id)
    return {"ok": True, "killed": killed, **status(project, job_id)}


def resume(project: str | Path, job_id: str, on_progress=None) -> dict:
    """Carry on from the last finished step (after a restart, an approval, or a failure to try again)."""
    plan, state = load(project, job_id)
    d = job_dir(project, job_id)
    ds = display_state(state)
    if ds == "running":
        return {"ok": False, "error": f"job {job_id} is running already.", **status(project, job_id)}
    if ds == "done":
        return {"ok": True, "note": "the job is done already", **status(project, job_id)}
    for rec in state["steps"].values():
        if rec["status"] in ("failed", "skipped"):
            rec["status"] = "pending"
            rec["error"] = ""
    _refresh(d, state, state="planned", cancel=False, pid=0)
    log_event(d, "resumed", was=ds)
    return run_job(project, job_id, on_progress)


# ---------------------------------------------------------------- status, list, log, report
def status(project: str | Path, job_id: str) -> dict:
    plan, state = load(project, job_id)
    d = job_dir(project, job_id)
    ds = display_state(state)
    steps = []
    done = 0
    for s in plan["steps"]:
        rec = state["steps"].get(s["id"], {})
        if rec.get("status") == "done":
            done += 1
        steps.append({"id": s["id"], "title": s["title"], "kind": s["kind"], "bench": s.get("bench", ""), "status": rec.get("status", "pending"), "error": rec.get("error", ""),
                      "approve": bool(s.get("approve")), "approved": s["id"] in state.get("approved", []), "outputs": rec.get("outputs", []), "pictures": rec.get("pictures", []),
                      "attempts": rec.get("attempts", 0), "fixed": rec.get("fixed", False)})
    cur = state.get("current", "")
    waiting = next((s for s in steps if s["id"] == cur), None) if ds == "waiting" else None
    last = _last_log_line(d)
    return {"id": job_id, "title": plan["title"], "sentence": plan.get("sentence", ""), "state": ds, "done": done, "total": len(steps), "current": cur,
            "current_title": next((s["title"] for s in steps if s["id"] == cur), ""), "waiting": waiting["title"] if waiting else "", "waiting_step": waiting["id"] if waiting else "",
            "steps": steps, "last": last, "dir": str(d), "report": str(d / "report.md") if (d / "report.md").exists() else "", "report_json": str(d / "report.json") if (d / "report.json").exists() else "",
            "resumable": ds in ("interrupted", "waiting", "failed", "planned"), "made": len([s for s in steps if s["status"] == "done"]),
            "could_not": len([s for s in steps if s["status"] in ("failed", "skipped")]), "updated": state.get("updated", ""), "bench": _main_bench(steps)}


def _main_bench(steps: list[dict]) -> str:
    for s in steps:
        if s.get("status") == "done" and s.get("bench"):
            return s["bench"]
    return next((s["bench"] for s in steps if s.get("bench")), "")


def _last_log_line(d: Path) -> str:
    p = d / "log.jsonl"
    if not p.exists():
        return ""
    try:
        lines = p.read_text(encoding="utf-8").splitlines()
    except OSError:
        return ""
    for l in reversed(lines):
        try:
            ev = json.loads(l)
        except json.JSONDecodeError:
            continue
        e = ev.get("event", "")
        if e == "step":
            return ev.get("title", "")
        if e == "waiting":
            return "waiting: " + ev.get("title", "")
        if e == "failed":
            return "could not: " + str(ev.get("error", ""))[:80]
        if e in ("done", "skipped", "fix", "retry", "approved", "resumed"):
            continue
        return e
    return ""


def list_jobs(project: str | Path, limit: int = 20) -> dict:
    root = jobs_root(project)
    out = []
    if root.is_dir():
        for d in sorted(root.iterdir(), reverse=True):
            if (d / "plan.json").exists():
                try:
                    st = status(project, d.name)
                except (FileNotFoundError, KeyError):
                    continue
                out.append({k: st[k] for k in ("id", "title", "state", "done", "total", "waiting", "waiting_step", "last", "resumable", "made", "could_not", "report", "report_json", "bench", "updated", "current_title")})
            if len(out) >= limit:
                break
    return {"ok": True, "jobs": out, "running": [j["id"] for j in out if j["state"] == "running"], "waiting": [j["id"] for j in out if j["state"] == "waiting"],
            "resumable": [j["id"] for j in out if j["state"] in ("interrupted", "waiting", "failed")]}


def tail_log(project: str | Path, job_id: str, n: int = 40) -> dict:
    d = job_dir(project, job_id)
    p = d / "log.jsonl"
    lines = p.read_text(encoding="utf-8").splitlines() if p.exists() else []
    return {"ok": True, "id": job_id, "log": str(p), "lines": len(lines), "tail": lines[-n:]}


def write_report(project: str | Path, job_id: str) -> dict:
    """report.md (pictures as relative links) and report.json (what the Forge shows on the bench)."""
    st = status(project, job_id)
    d = Path(st["dir"])
    plan, _ = load(project, job_id)
    made, could_not = [], []
    for s in st["steps"]:
        if s["status"] == "done":
            made.append({"step": s["id"], "title": s["title"], "bench": s["bench"], "files": [str(p) for p in s.get("outputs", [])], "pictures": [str(p) for p in s.get("pictures", [])],
                         "fixed": s.get("fixed", False)})
        elif s["status"] in ("failed", "skipped"):
            could_not.append({"step": s["id"], "title": s["title"], "bench": s["bench"], "why": s.get("error", "") or "not reached"})
        elif st["state"] in ("cancelled", "interrupted") or (st["state"] == "waiting" and s["id"] != st["waiting_step"]):
            could_not.append({"step": s["id"], "title": s["title"], "bench": s["bench"], "why": {"cancelled": "the job was stopped", "interrupted": "the Forge closed before it; Resume carries on",
                                                                                              "waiting": "after the step that waits for approval"}.get(st["state"], "not reached")})
    pictures = [p for m in made for p in m["pictures"]]
    rep = {"id": job_id, "title": st["title"], "sentence": st["sentence"], "state": st["state"], "project": str(Path(project).resolve()), "made": made, "could_not": could_not,
           "pictures": pictures, "waiting": st["waiting"], "notes": plan.get("notes", ""), "bench": st["bench"], "written": time.strftime("%Y-%m-%d %H:%M:%S")}
    _write(d / "report.json", rep)
    words = {"done": "finished", "failed": "finished; a step could not be done", "cancelled": "stopped", "waiting": "waiting for approval", "interrupted": "interrupted; Resume carries on",
             "running": "running", "planned": "not started"}[st["state"]]
    lines = [f"# {st['title']}", "", f"*{st['sentence']}*", "", f"State: **{words}**. Project: `{rep['project']}`. Job folder: `{d}`.", ""]
    if plan.get("notes"):
        lines += [f"Planner's note: {plan['notes']}", ""]
    lines.append("## What was made")
    if not made:
        lines.append("Nothing yet.")
    for m in made:
        lines.append(f"- **{m['title']}**" + (" (fixed once)" if m["fixed"] else "") + (": " + ", ".join(f"`{f}`" for f in m["files"]) if m["files"] else ""))
        for p in m["pictures"]:
            rel = os.path.relpath(p, d).replace(os.sep, "/")
            lines.append(f"  ![{Path(p).name}]({rel})")
    lines += ["", "## What could not be done, and why"]
    if not could_not:
        lines.append("Everything in the plan was done." if st["state"] == "done" else "Nothing so far.")
    for c in could_not:
        lines.append(f"- **{c['title']}**: {c['why']}")
    if st["waiting"]:
        lines += ["", f"Waiting for approval: **{st['waiting']}** (`pixelforge job approve {job_id} --run`, or Approve on the Forge's Home)."]
    (d / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {"ok": True, "report": str(d / "report.md"), "report_json": str(d / "report.json"), **rep}
