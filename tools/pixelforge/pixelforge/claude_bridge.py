"""Claude on the bench: PixelForge's bridge to the Claude Code CLI.

The Forge's describe line on any bench (and ``pixelforge describe --bench ...``) hands a sentence to Claude Code,
which works through PixelForge's own MCP tools (``pixelforge mcp``) on the same project folder, and comes back with a
short JSON summary. This module finds the ``claude`` executable, says whether it is ready, builds the command
(``claude -p --output-format stream-json --mcp-config ... --allowedTools ... --append-system-prompt ...``), streams
the tool-use events back as progress sentences, enforces a timeout, keeps a log, snapshots the bench's files for
Undo, and names what changed.

    status()                               -> ready | not found | not signed in, with a plain sentence
    register()                             -> `claude mcp add -s user pixelforge -- <python> -m pixelforge.cli mcp` (idempotent)
    run("music", project, "slower, 76 bpm, darker", on_progress=print)
    fetch_midjourney(prompt, out_dir, project, image=...)   -> Claude in Chrome paints it (needs the extension)

Without the real CLI: ``PIXELFORGE_CLAUDE=mock:<script.jsonl>`` runs a mock that emits a canned stream (and can run
PixelForge commands so a bench really changes), and ``run(..., dry_run=True)`` only builds the command.
No model names live here: the product is Claude Code, the executable is ``claude``.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from queue import Empty, Queue

PF_ROOT = Path(__file__).resolve().parent.parent          # tools/pixelforge
SERVER_NAME = "pixelforge"
MCP_ALLOW = "mcp__pixelforge"                             # every tool of PixelForge's MCP server
CHROME_SERVER = "claude-in-chrome"
CHROME_ALLOW = "mcp__claude-in-chrome"
BENCHES = ("characters", "creatures", "objects", "effects", "tiles", "interface", "music", "sound", "midjourney", "author")
DEFAULT_TIMEOUT = 600.0
MIDJOURNEY_TIMEOUT = 900.0
LOG_DIR = "claude/logs"
UNDO_DIR = "claude/undo"

# the game's law for art and words (docs/HANDOFF.md section 4, docs/wiki/01-rules-and-decisions.md)
STYLE_RULES = [
    "Dark fantasy, worn and tattered, muted and desaturated: deep teal-blue, bone white, cold iron grey, near-black. No bright colours, no neon.",
    "No red light anywhere. No glows or trails on attacks or casts; lanterns, wisps and magic may glow.",
    "Effects live in the world, never pasted over the screen. Every danger plainly seen.",
    "No animals and no animal words. Copper, not pennies; lands and leagues; no weekday names.",
    "Characters are shape sprites (.shapes.json) rendered by PixelForge at the game's hero height (the godmarrow preset, 195 px); a painting is a reference to measure against, never carved.",
    "OKLab for every colour distance; a transform never adds a colour outside the sprite's palette.",
    "Diablo 2: Blizzard's files never enter the repository. Everything read from the game lives in the local reference folder (d2_doctor names it); "
    "our sprites and our mod files are ours. When a Diablo 2 step fails, say what to install or set in plain words (the tool's error does).",
]
BANNED_WORDS = ["cooldown", "dps", "proc", "aggro", "loot", "buff", "nerf", "stun", "lightning", "mana", "rot", "cell", "virus", "DNA", "organism", "biology"]

# what each bench is for, and the tools that belong to it (the names are the MCP server's)
BENCH_TOOLS = {
    "characters": "draft_shapes, measure_views, sample_materials, compare_shapes, validate_shapes, shape_template, import_shapes, render_shapes, "
                  "preview_shape_sprite, shape_sheet, add_character, prompts, status, export_game; Diablo 2: d2_doctor (the game, the extractor, the "
                  "reference folder), d2_fetch_tools, d2_list, d2_import (their sprites into our frames), d2_export_mod, d2_play (build the mod into the "
                  "install and start the game; the person has already agreed when the line says so), d2_port_skills",
    "creatures": "the characters' tools (the humanoid skeleton stands in for the beast rig, which is not in the engine yet)",
    "objects": "draft_shapes (an object is a .shapes.json without bones), validate_shapes, shape_object, preview_shape_sprite, make_prop",
    "effects": "make_effect (kinds: fire smoke wisp burst embers ring bolt slash circle cloud shards pillar decal drip flash ward vortex rain ashfall fog "
               "swarm chain rune pool nova firewall; palettes: wisp lantern miasma bone smoke blood frost amber iron silver poison paper), make_spell "
               "(presets fireball ward soul_drain bone_shatter lightning_strike, or your own layers_json), make_effect_from_art, describe(what=spell)",
    "tiles": "make_tiles (a painted ground texture -> iso diamonds, variants, edge tiles to a second texture)",
    "interface": "make_ui_frame (a painted panel -> 9-slice), make_icons (a flat lay -> inventory icons), make_portrait (a front view -> portraits)",
    "music": "music_library, compose_music (genres dungeon_synth gothic_orchestral chiptune dark_ambient battle boss tavern town title victory sorrow "
             "exploration synthwave; moods dark hopeful tense calm heroic sombre playful eerie), edit_song (ops set_tempo set_key scale_lock set_lane mute solo "
             "set_fx set_note remove_note clear copy paste transpose reverse double halve humanise quantise generate_bar generate_lane pattern_add "
             "section_add section_remove section_move section_set title), render_song",
    "sound": "make_sfx (presets: hit heavy_hit bone_click bone_break thud whoosh pour glass cast wisp pickup ui_tick ui_open death_rattle lantern_light step_stone step_soft coin)",
}


# ---------------------------------------------------------------- finding and asking the CLI
def mock_script() -> str | None:
    """The mock's script when PIXELFORGE_CLAUDE is ``mock:<path>``; else None."""
    v = os.environ.get("PIXELFORGE_CLAUDE", "")
    return v[5:] if v.startswith("mock:") else None


def _candidates() -> list[Path]:
    home = Path.home()
    out = [home / ".local" / "bin" / "claude", home / ".claude" / "local" / "claude", home / ".claude" / "local" / "node_modules" / ".bin" / "claude",
           Path("/usr/local/bin/claude"), Path("/opt/homebrew/bin/claude"), Path("/opt/node22/bin/claude")]
    for env in ("APPDATA", "LOCALAPPDATA", "USERPROFILE"):
        base = os.environ.get(env)
        if base:
            out += [Path(base) / "npm" / "claude.cmd", Path(base) / "npm" / "claude", Path(base) / "Programs" / "claude" / "claude.exe",
                    Path(base) / ".local" / "bin" / "claude.exe", Path(base) / ".claude" / "local" / "claude.exe"]
    return out


def find_claude(hint: str | None = None) -> str | None:
    """The ``claude`` executable: ``hint``, ``PIXELFORGE_CLAUDE`` (unless a mock), PATH, then the usual install places.
    ``PIXELFORGE_CLAUDE=none`` pretends there is none (the bench's no-Claude state, for tests and screenshots)."""
    env = os.environ.get("PIXELFORGE_CLAUDE", "")
    if env.strip().lower() == "none":
        return None
    for c in [hint, env if not env.startswith("mock:") else ""]:
        if c and Path(c).exists():
            return str(c)
    for name in ("claude", "claude.cmd", "claude.exe"):
        w = shutil.which(name)
        if w:
            return w
    for c in _candidates():
        if c.exists():
            return str(c)
    return None


def _call(cmd: list[str], timeout: float = 30.0) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8", errors="replace")


def version(exe: str) -> str:
    try:
        return _call([exe, "--version"], 20).stdout.strip().split("\n")[0]
    except (OSError, subprocess.TimeoutExpired):
        return ""


def signed_in(exe: str) -> bool | None:
    """True / False from ``claude auth status --json``; None when the CLI did not answer."""
    try:
        r = _call([exe, "auth", "status", "--json"], 30)
    except (OSError, subprocess.TimeoutExpired):
        return None
    for chunk in (r.stdout, r.stderr):
        m = re.search(r"\{.*\}", chunk, re.S)
        if m:
            try:
                return bool(json.loads(m.group(0)).get("loggedIn", False))
            except json.JSONDecodeError:
                pass
    if "not logged in" in (r.stdout + r.stderr).lower():
        return False
    return None


def registered(exe: str) -> bool:
    """Is PixelForge's MCP server registered with Claude Code (``claude mcp get pixelforge``)?"""
    try:
        r = _call([exe, "mcp", "get", SERVER_NAME], 30)
    except (OSError, subprocess.TimeoutExpired):
        return False
    return r.returncode == 0 and "No MCP server" not in r.stdout and SERVER_NAME in (r.stdout + r.stderr)


NOT_FOUND = ("Claude Code was not found. Install it (claude.com/claude-code), open a terminal and run `claude` once to sign in; "
             "the Forge finds it on PATH, or set PIXELFORGE_CLAUDE to the executable.")
NOT_SIGNED_IN = "Claude Code is installed but not signed in: open a terminal, run `claude`, and sign in once."


def status(exe: str | None = None) -> dict:
    """Ready / not found / not signed in, with the sentence the bench shows."""
    if mock_script():
        return {"ok": True, "state": "ready", "mock": True, "exe": "mock", "sentence": "Claude: ready (a mock stands in for Claude Code).", "registered": True}
    exe = find_claude(exe)
    if not exe:
        return {"ok": False, "state": "not_found", "exe": "", "sentence": NOT_FOUND, "registered": False}
    v = version(exe)
    s = signed_in(exe)
    if s is False:
        return {"ok": False, "state": "not_signed_in", "exe": exe, "version": v, "sentence": NOT_SIGNED_IN, "registered": registered(exe)}
    reg = registered(exe)
    note = "" if reg else " PixelForge's tools are not registered yet: `pixelforge claude register` does it (the Forge does it on first launch)."
    return {"ok": True, "state": "ready", "exe": exe, "version": v, "registered": reg,
            "sentence": ("Claude: ready" + (f" ({v})" if v else "") + "." + note) if s else "Claude: found; whether it is signed in could not be read. Run `claude` once if a job stops at sign-in."}


def python_for_server() -> str:
    """The interpreter that has PixelForge: this one (install.bat's private environment when launched from it)."""
    return sys.executable


def server_command(python: str | None = None) -> list[str]:
    return [python or python_for_server(), "-m", "pixelforge.cli", "mcp"]


def register(exe: str | None = None, python: str | None = None, scope: str = "user") -> dict:
    """Register PixelForge's MCP server with Claude Code once (user scope: every folder). Idempotent."""
    if mock_script():
        return {"ok": True, "registered": True, "note": "mock: nothing to register"}
    exe = find_claude(exe)
    if not exe:
        return {"ok": False, "registered": False, "error": NOT_FOUND}
    if registered(exe):
        return {"ok": True, "registered": True, "note": "already registered", "command": server_command(python)}
    cmd = [exe, "mcp", "add", "-s", scope, SERVER_NAME, "--"] + server_command(python)
    try:
        r = _call(cmd, 60)
    except (OSError, subprocess.TimeoutExpired) as e:
        return {"ok": False, "registered": False, "error": f"`claude mcp add` did not finish: {e}"}
    if r.returncode != 0 and "already exists" not in (r.stdout + r.stderr):
        return {"ok": False, "registered": False, "error": "`claude mcp add` stopped: " + (r.stderr or r.stdout).strip().split("\n")[-1][:200]}
    return {"ok": True, "registered": True, "note": "registered", "command": server_command(python)}


# ---------------------------------------------------------------- the command
def mcp_config(python: str | None = None) -> dict:
    """The --mcp-config JSON: PixelForge's server on the same interpreter, with the package on its path."""
    env = {"PYTHONPATH": str(PF_ROOT)}
    if os.environ.get("PYTHONPATH"):
        env["PYTHONPATH"] = str(PF_ROOT) + os.pathsep + os.environ["PYTHONPATH"]
    cmd = server_command(python)
    return {"mcpServers": {SERVER_NAME: {"type": "stdio", "command": cmd[0], "args": cmd[1:], "env": env}}}


def write_mcp_config(folder: Path, python: str | None = None) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    p = folder / "mcp_config.json"
    p.write_text(json.dumps(mcp_config(python), indent=2), encoding="utf-8")
    return p


def default_context(bench: str, project: Path) -> dict:
    """What is on the bench, read from the project folder when the caller gave nothing."""
    ctx: dict = {}
    pj = project / "project.json"
    if pj.exists():
        try:
            d = json.loads(pj.read_text(encoding="utf-8"))
            ctx["style"] = d.get("settings", {}).get("style", d.get("style", ""))
            ctx["characters"] = sorted(d.get("characters", {}).keys())
        except (json.JSONDecodeError, OSError):
            pass
    song = project / "music" / "current.song.json"
    if song.exists():
        ctx["song"] = str(song)
    models = sorted(project.glob("characters/*/shapes/*.shapes.json")) if bench in ("characters", "creatures") else sorted(project.glob("objects/*/*.shapes.json"))
    if len(models) == 1 and "model_file" not in ctx:
        ctx["model_file"] = str(models[0])
    return ctx


def bench_sentence(bench: str, ctx: dict) -> str:
    """One paragraph: what is on the bench right now."""
    lines = []
    if ctx.get("model_file"):
        lines.append(f"The model on the bench is {ctx['model_file']} (a .shapes.json; edit it with the tools or by reading it and writing a corrected copy through draft/import tools, never by hand outside the project).")
    elif bench in ("characters", "creatures", "objects"):
        lines.append("The bench is empty: no model file yet. A description means: draft one (draft_shapes with an out path under the project), validate it, and for a character add_character + import_shapes so it stands on the bench.")
    if ctx.get("character"):
        lines.append(f"The character is '{ctx['character']}'.")
    if ctx.get("painting"):
        lines.append(f"The reference painting is {ctx['painting']} (measure_views / sample_materials / compare_shapes read it).")
    if ctx.get("song"):
        lines.append(f"The current song is {ctx['song']} (edit_song writes back to it; compose_music with out_path={ctx['song']} replaces it).")
    elif bench == "music":
        lines.append("No song is on the bench yet: compose_music to <project>/music/current.song.json.")
    if ctx.get("effect"):
        lines.append(f"The current effect is {ctx['effect']}" + (f" in the {ctx['palette']} palette" if ctx.get("palette") else "") + f"; strips go to {ctx.get('fx_dir', '<project>/fx')}.")
    if ctx.get("spell"):
        lines.append(f"The spell on the bench is {ctx['spell']}.")
    if ctx.get("frames_dir"):
        lines.append(f"Rendered frames: {ctx['frames_dir']}.")
    if ctx.get("texture"):
        lines.append(f"The ground texture is {ctx['texture']}; tiles go to {ctx.get('out_dir', '<project>/tiles')}.")
    if ctx.get("image"):
        lines.append(f"The painting on the bench is {ctx['image']}; output goes to {ctx.get('out_dir', '<project>')}.")
    if ctx.get("pad"):
        lines.append(f"The pad is {ctx['pad']}; sounds go to {ctx.get('out_dir', '<project>/sfx')}.")
    if ctx.get("style"):
        lines.append(f"The project's look preset is {ctx['style']}.")
    if ctx.get("characters"):
        lines.append("Characters in the project: " + ", ".join(ctx["characters"]) + ".")
    return " ".join(lines) if lines else "Nothing is on the bench yet."


def system_prompt(bench: str, project: Path, ctx: dict | None = None) -> str:
    ctx = ctx or {}
    tools = BENCH_TOOLS.get(bench, "the PixelForge tools that fit")
    return "\n".join([
        f"You are the Claude on PixelForge's {bench.capitalize()} bench. A person typed one line on the bench and is watching the picture window.",
        f"The project folder is {project}. Work only inside it, through the pixelforge MCP tools; Read is for looking at files in it.",
        f"On the bench: {bench_sentence(bench, ctx)}",
        f"The tools for this bench: {tools}. Call status first when you need the project's facts.",
        "Rules of the game's art and words: " + " ".join(STYLE_RULES),
        "Banned words (never in names, notes or prompts): " + ", ".join(BANNED_WORDS) + ".",
        "Behave like a bench hand, not a chat: no questions back, no plans, one job at a time, the fewest tool calls that do what the line says, "
        "and nothing beyond it. If the line cannot be done with these tools, do nothing and say so in the notes.",
        "Do not write files by hand; every change goes through a tool so the bench and the log agree. British spelling in notes (colour).",
        'Finish with one line of JSON and nothing after it: {"did": ["short past-tense sentences"], "changed": ["absolute paths of files you made or changed"], "notes": "one or two plain sentences for the person"}.',
    ])


def allowed_tools(chrome: bool = False) -> list[str]:
    out = [MCP_ALLOW, "Read"]
    if chrome:
        out.append(CHROME_ALLOW)
    return out


def author_tools(folder: str | Path) -> tuple[list[str], list[str]]:
    """The tools the authoring Claude gets (``character author``): Read anywhere in the project, Write and Edit only under
    ``folder`` (the character's ``shapes/``, where the generator script and the model live), Bash only to run Python
    (the script), and PixelForge's MCP tools. Returns (``--tools``, ``--allowedTools``)."""
    f = Path(folder).resolve().as_posix().rstrip("/")
    tools = ["Read", "Write", "Edit", "Bash"]
    allowed = [MCP_ALLOW, "Read", f"Write(//{f.lstrip('/')}/**)", f"Edit(//{f.lstrip('/')}/**)", "Bash(python *)", "Bash(python3 *)", "Bash(py *)"]
    return tools, allowed


def budget() -> str | None:
    v = os.environ.get("PIXELFORGE_CLAUDE_BUDGET", "3")
    return v if v and v != "0" else None


def build_command(exe: str, bench: str, project: Path, text: str, mcp_cfg: Path, chrome: bool = False, ctx: dict | None = None,
                  prompt: str | None = None, add_dirs: list[str] | None = None, tools: list[str] | None = None, allowed: list[str] | None = None) -> list[str]:
    """The claude command line: print mode, streamed JSON, PixelForge's MCP server only, Read plus the server's tools pre-approved,
    anything else denied, the bench's system prompt appended. ``tools`` / ``allowed`` widen the built-in tools (the author
    loop's Write, Edit and Bash scoped to one folder, :func:`author_tools`)."""
    cmd = [exe, "-p", "--output-format", "stream-json", "--verbose", "--mcp-config", str(mcp_cfg),
           "--tools", ",".join(tools or ["Read"]), "--allowedTools", ",".join(allowed or allowed_tools(chrome)), "--permission-prompts", "none",
           "--append-system-prompt", prompt if prompt is not None else system_prompt(bench, project, ctx), "--add-dir", str(project)]
    for d in add_dirs or []:
        cmd += ["--add-dir", str(d)]
    if chrome:
        cmd.append("--chrome")
    else:
        cmd.append("--strict-mcp-config")
    b = budget()
    if b:
        cmd += ["--max-budget-usd", b]
    cmd.append(text)
    return cmd


# ---------------------------------------------------------------- the stream
_WORDS = {
    "draft_shapes": "drafting the model", "import_shapes": "putting the model on the bench", "validate_shapes": "checking the model",
    "render_shapes": "rendering the clips", "render_shape_sprite": "rendering the clips", "preview_shape_sprite": "a preview of {clip} {direction}",
    "shape_sheet": "drawing a contact sheet", "shape_object": "writing the object", "shape_template": "reading the author pose",
    "measure_views": "measuring the painting", "sample_materials": "sampling the painting's colours", "compare_shapes": "comparing with the painting",
    "add_character": "adding {name}", "new_project": "making the project", "status": "reading the project", "prompts": "writing the prompts",
    "export_game": "writing the sheets", "import_image": "importing the {kind}",
    "compose_music": "composing a {genre} piece", "render_song": "rendering the song", "music_library": "reading the library", "music_cues": "reading the cues",
    "make_music": "rendering the cue", "make_effect": "drawing a {kind} effect", "make_spell": "building the {preset} spell", "make_effect_from_art": "reading the painted effect",
    "make_tiles": "cutting the tiles", "make_ui_frame": "cutting the frame", "make_icons": "cutting the icons", "make_portrait": "cutting the portrait",
    "make_sfx": "making the {preset} sound", "make_prop": "cutting the prop", "recolor": "recolouring", "edit_skin": "editing the skin", "describe": "reading the words",
    "list_styles": "reading the looks", "set_style": "setting the look", "doctor": "checking the computer",
    "shape_still": "drawing a still facing {direction}", "add_part": "adding {part}", "edit_shapes": "editing the model",
    "Write": "writing {file}", "Edit": "editing {file}", "Bash": "running the script",
    "Read": "reading {file}", "navigate": "opening {host}", "type": "typing", "click": "clicking", "screenshot": "looking at the page",
    "upload_file": "attaching the picture", "download": "downloading", "scroll": "scrolling", "find": "finding {query}", "read_page": "reading the page",
}
_OPS = {"set_tempo": "setting tempo {tempo}", "set_key": "setting the key", "scale_lock": "scale lock {on}", "set_lane": "setting the {lane} lane", "mute": "muting {lane}",
        "solo": "soloing {lane}", "set_fx": "setting {name}", "set_note": "placing a note", "remove_note": "removing a note", "clear": "clearing {lane}",
        "transpose": "transposing {lane}", "generate_bar": "writing bar {bar}", "generate_lane": "writing the {lane} lane", "humanise": "humanising {lane}",
        "quantise": "quantising {lane}", "double": "doubling {lane}", "halve": "halving {lane}", "reverse": "reversing {lane}", "section_add": "adding a part",
        "section_remove": "removing a part", "section_move": "moving a part", "section_set": "setting a part", "pattern_add": "adding a pattern", "title": "naming it"}


def _fill(template: str, d: dict) -> str:
    def sub(m):
        k = m.group(1)
        v = d.get(k, "")
        if k == "host" and not v:
            v = re.sub(r"^https?://", "", str(d.get("url", ""))).split("/")[0]
        if k == "file" and not v:
            v = os.path.basename(str(d.get("file_path", d.get("path", ""))))
        if k == "on":
            v = "on" if d.get("on", True) else "off"
        return str(v).replace("_", " ") if k in ("genre", "kind", "preset") else str(v)
    return re.sub(r"\{(\w+)\}", sub, template).replace("  ", " ").strip()


def tool_words(name: str, inp: dict) -> list[str]:
    """The progress sentences for one tool call ('drafting the model', 'setting tempo 76')."""
    short = name.split("__")[-1]
    if short == "edit_song":
        out = []
        for op in inp.get("ops", []) or []:
            if isinstance(op, dict):
                out.append(_fill(_OPS.get(str(op.get("op", "")), str(op.get("op", "editing")).replace("_", " ")), op))
        return out or ["editing the song"]
    if short in _WORDS:
        return [_fill(_WORDS[short], inp if isinstance(inp, dict) else {})]
    return [short.replace("_", " ")]


def event_words(ev: dict) -> list[str]:
    """Progress sentences from one stream-json event (tool_use blocks of assistant messages)."""
    if ev.get("type") != "assistant":
        return []
    out = []
    for block in (ev.get("message") or {}).get("content", []) or []:
        if isinstance(block, dict) and block.get("type") == "tool_use":
            out += tool_words(str(block.get("name", "")), block.get("input") or {})
    return out


def parse_summary(text: str) -> dict | None:
    """The last JSON object in the text that carries "did" (or "changed")."""
    dec = json.JSONDecoder()
    found = None
    for i, ch in enumerate(text):
        if ch != "{":
            continue
        try:
            obj, _ = dec.raw_decode(text, i)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and ("did" in obj or "changed" in obj):
            found = obj
    if found is None:
        return None
    did = found.get("did", [])
    changed = found.get("changed", [])
    out = {"did": [str(x) for x in (did if isinstance(did, list) else [did])],
           "changed": [str(x) for x in (changed if isinstance(changed, list) else [changed])],
           "notes": str(found.get("notes", "")).strip()}
    if found.get("focus"):
        out["focus"] = str(found["focus"]).strip()
    return out


def result_text(ev: dict) -> str:
    r = ev.get("result", "")
    if isinstance(r, list):
        return " ".join(str(x.get("text", "")) if isinstance(x, dict) else str(x) for x in r)
    return str(r or "")


# ---------------------------------------------------------------- files: what changed, and the undo snapshot
_SNAP_EXT = {".json", ".png", ".wav", ".ogg", ".txt", ".tres", ".gif"}
_SNAP_MAX = 6_000_000


def bench_roots(bench: str) -> list[str]:
    """The project sub-folders a bench's Claude run may change (what Undo restores)."""
    return {"characters": ["characters", "drafts", "project.json"], "creatures": ["characters", "drafts", "project.json"], "author": ["characters", "project.json"],
            "objects": ["objects", "drafts", "project.json"], "music": ["music"], "effects": ["fx"], "tiles": ["tiles"],
            "interface": ["ui", "items", "portraits"], "sound": ["sfx"], "midjourney": []}.get(bench, [])


def file_state(root: Path, skip: tuple[str, ...] = ("claude",)) -> dict[str, tuple[float, int]]:
    out = {}
    if not root.exists():
        return out
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(root)
        if rel.parts and rel.parts[0] in skip:
            continue
        try:
            st = p.stat()
        except OSError:
            continue
        out[str(p)] = (st.st_mtime, st.st_size)
    return out


def changed_files(before: dict, after: dict) -> list[str]:
    return sorted(p for p, v in after.items() if before.get(p) != v)


def snapshot(project: Path, bench: str) -> dict:
    """Copy the bench's files aside so Undo can put them back; returns the manifest (also written under claude/undo)."""
    stamp = time.strftime("%Y%m%d_%H%M%S")
    store = project / UNDO_DIR / f"{stamp}_{bench}"
    files = {}
    roots = []
    for r in bench_roots(bench):
        src = project / r
        roots.append(str(src))
        if src.is_file():
            cands = [src]
        elif src.is_dir():
            cands = [p for p in src.rglob("*") if p.is_file()]
        else:
            continue
        for p in cands:
            if p.suffix.lower() not in _SNAP_EXT or p.stat().st_size > _SNAP_MAX:
                continue
            rel = p.relative_to(project)
            dst = store / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dst)
            files[str(rel)] = str(dst)
    manifest = {"stamp": stamp, "bench": bench, "project": str(project), "roots": roots, "files": files}
    store.mkdir(parents=True, exist_ok=True)
    mpath = store.with_suffix(".json")
    mpath.write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    manifest["manifest"] = str(mpath)
    return manifest


def restore(manifest: str | Path | dict) -> dict:
    """Undo a Claude run: the snapshot's files back in place, files it made since (under the bench's roots) removed."""
    m = manifest if isinstance(manifest, dict) else json.loads(Path(manifest).read_text(encoding="utf-8"))
    project = Path(m["project"])
    removed = []
    for r in m.get("roots", []):
        root = Path(r)
        if root.is_dir():
            for p in root.rglob("*"):
                if p.is_file() and p.suffix.lower() in _SNAP_EXT and str(p.relative_to(project)) not in m["files"]:
                    p.unlink()
                    removed.append(str(p))
    restored = []
    for rel, stored in m["files"].items():
        dst = project / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(stored, dst)
        restored.append(str(dst))
    return {"ok": True, "restored": restored, "removed": removed, "bench": m.get("bench", "")}


# ---------------------------------------------------------------- running
def _reader(pipe, q: Queue) -> None:
    try:
        for line in iter(pipe.readline, ""):
            q.put(line)
    finally:
        q.put(None)


def _popen(cmd: list[str], cwd: Path, env: dict) -> subprocess.Popen:
    kw = {}
    if os.name == "nt":
        kw["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return subprocess.Popen(cmd, cwd=str(cwd), env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL,
                            text=True, encoding="utf-8", errors="replace", bufsize=1, **kw)


def _mock_command(script: str, bench: str, project: Path, text: str) -> list[str]:
    return [sys.executable, "-m", "pixelforge.claude_bridge", "mock", script, bench, str(project), text]


def _chrome_missing(ev: dict) -> bool:
    servers = ev.get("mcp_servers", []) or []
    for s in servers:
        if isinstance(s, dict) and s.get("name") == CHROME_SERVER:
            return str(s.get("status", "connected")) not in ("connected", "ready")
    return True


CHROME_NOT_CONNECTED = ("Chrome is not connected to Claude Code. Open Chrome with the Claude in Chrome extension installed and signed in to claude.ai, "
                        "run `claude --chrome` once in a terminal to pair them, then try again. Until then: Copy prompt, paint it in Midjourney "
                        "yourself, and drop the file on the bench.")


def _plain_failure(text: str, chrome: bool) -> str | None:
    t = text.lower()
    if chrome:
        if "extension is not connected" in t or "browser extension" in t and "not" in t or "no tab available" in t:
            return CHROME_NOT_CONNECTED
        if "captcha" in t or "challenge" in t or "verify you are human" in t or "sign in" in t or "log in" in t:
            return "Midjourney asked for a sign-in or a check. Do it in the Chrome tab yourself, then try again; Claude does not pass those."
    if "budget" in t and ("exceeded" in t or "reached" in t):
        return "Claude stopped at the spending limit for one job (PIXELFORGE_CLAUDE_BUDGET raises it)."
    if "not logged in" in t or "please run /login" in t or "authentication" in t and "fail" in t:
        return NOT_SIGNED_IN
    return None


def run(bench: str, project: str | Path, text: str, ctx: dict | None = None, on_progress=None, timeout: float = DEFAULT_TIMEOUT,
        dry_run: bool = False, chrome: bool = False, exe: str | None = None, prompt: str | None = None, add_dirs: list[str] | None = None,
        snapshot_files: bool = True, watch_dir: str | Path | None = None, tools: list[str] | None = None, allowed: list[str] | None = None,
        cwd: str | Path | None = None, mock_vars: dict | None = None, log_name: str | None = None) -> dict:
    """One job on a bench. Returns {"ok", "did", "changed", "notes", "summary", "log", "snapshot", "progress", "seconds", "cost_usd"} or an error sentence.
    ``tools`` / ``allowed`` widen the built-in tools (the author loop); ``cwd`` is where Claude runs (the project by default);
    ``mock_vars`` are extra ``{placeholders}`` the mock fills (``round``, ``name``, ``shapes_dir``, ...)."""
    project = Path(project).resolve()
    ctx = {**default_context(bench, project), **(ctx or {})}
    mock = mock_script()
    exe = "mock" if mock else find_claude(exe)
    cfg_dir = project / "claude"
    mcp_cfg = cfg_dir / "mcp_config.json" if dry_run else write_mcp_config(cfg_dir)
    cmd = build_command(exe or "claude", bench, project, text, mcp_cfg, chrome=chrome, ctx=ctx, prompt=prompt, add_dirs=add_dirs, tools=tools, allowed=allowed)
    if dry_run:
        return {"ok": True, "dry_run": True, "command": cmd, "system_prompt": cmd[cmd.index("--append-system-prompt") + 1], "mcp_config": str(mcp_cfg), "exe": exe or ""}
    if not exe:
        return {"ok": False, "error": NOT_FOUND, "state": "not_found"}
    if mock:
        cmd = _mock_command(mock, bench, project, text)
    stamp = time.strftime("%Y%m%d_%H%M%S")
    log_dir = project / LOG_DIR
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{stamp}_{log_name or bench}.jsonl"
    manifest = snapshot(project, bench) if snapshot_files and bench_roots(bench) else None
    watch = Path(watch_dir).resolve() if watch_dir else project
    before = file_state(watch)
    env = dict(os.environ)
    env.setdefault("PYTHONIOENCODING", "utf-8")
    env["PYTHONPATH"] = str(PF_ROOT) + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")   # the server and the mock find the package
    env["PF_BRIDGE_BENCH"] = bench
    env["PF_BRIDGE_PROJECT"] = str(project)
    if mock_vars:
        env["PF_BRIDGE_VARS"] = json.dumps({k: str(v) for k, v in mock_vars.items()})
    run_dir = Path(cwd) if cwd else project
    t0 = time.time()
    progress: list[str] = []
    events: list[dict] = []
    result_ev: dict | None = None
    error = None
    with log_path.open("w", encoding="utf-8") as log:
        log.write(json.dumps({"command": cmd, "bench": bench, "project": str(project), "text": text, "chrome": chrome, "started": stamp}) + "\n")
        try:
            proc = _popen(cmd, run_dir if run_dir.exists() else PF_ROOT, env)
        except OSError as e:
            return {"ok": False, "error": f"Claude Code could not be started ({e}).", "log": str(log_path)}
        q: Queue = Queue()
        threading.Thread(target=_reader, args=(proc.stdout, q), daemon=True).start()
        err_q: Queue = Queue()
        threading.Thread(target=_reader, args=(proc.stderr, err_q), daemon=True).start()
        done = False
        while not done:
            if time.time() - t0 > timeout:
                proc.kill()
                error = f"Claude did not finish within {int(timeout)} s; it was stopped. The log has what it did so far."
                break
            try:
                line = q.get(timeout=0.25)
            except Empty:
                continue
            if line is None:
                done = True
                break
            line = line.rstrip("\n")
            if not line.strip():
                continue
            log.write(line + "\n")
            log.flush()
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(ev, dict):
                continue
            events.append(ev)
            if ev.get("type") == "system" and ev.get("subtype") == "init" and chrome and _chrome_missing(ev):
                proc.kill()
                error = CHROME_NOT_CONNECTED
                break
            for w in event_words(ev):
                progress.append(w)
                if on_progress:
                    on_progress(w)
            if ev.get("type") == "result":
                result_ev = ev
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()
        stderr_tail = []
        while True:
            try:
                l = err_q.get(timeout=0.2)
            except Empty:
                break
            if l is None:
                break
            stderr_tail.append(l.rstrip("\n"))
        if stderr_tail:
            log.write(json.dumps({"stderr": stderr_tail[-20:]}) + "\n")
    seconds = round(time.time() - t0, 1)
    after = file_state(watch)
    detected = changed_files(before, after)
    text_out = result_text(result_ev) if result_ev else ""
    summary = parse_summary(text_out) if text_out else None
    out: dict = {"bench": bench, "text": text, "log": str(log_path), "progress": progress, "seconds": seconds, "detected": detected,
                 "cost_usd": (result_ev or {}).get("total_cost_usd", 0.0), "exe": exe, "result_text": text_out}
    if manifest:
        out["snapshot"] = manifest["manifest"]
    if error is None and result_ev is None:
        tail = "\n".join(stderr_tail[-3:]) if stderr_tail else ""
        error = _plain_failure(tail, chrome) or ("Claude Code stopped without an answer" + (f": {tail.strip().splitlines()[-1][:160]}" if tail.strip() else ".") + " The log has the details.")
    if error is None and result_ev is not None and result_ev.get("is_error"):
        error = _plain_failure(text_out, chrome) or ("Claude stopped: " + (text_out.strip().split("\n")[0][:200] or "no reason given."))
    if error:
        out.update({"ok": False, "error": error, "did": [], "changed": detected, "notes": ""})
        return out
    if summary is None:
        summary = {"did": [w for w in progress if not w.startswith("reading ")][:12], "changed": detected, "notes": text_out.strip()[:240]}
    changed = sorted(set(summary["changed"]) | set(detected))
    out.update({"ok": True, "did": summary["did"], "changed": changed, "notes": summary["notes"], "summary": summary})
    return out


def last_log(project: str | Path, n: int = 40) -> dict:
    d = Path(project) / LOG_DIR
    logs = sorted(d.glob("*.jsonl")) if d.exists() else []
    if not logs:
        return {"ok": False, "error": "No Claude job has run on this project yet."}
    p = logs[-1]
    lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
    return {"ok": True, "log": str(p), "lines": len(lines), "tail": lines[-n:], "all": [str(x) for x in logs]}


# ---------------------------------------------------------------- Midjourney through Chrome
PROP_SHEET_PROMPT = ("reference sheet of nine {description} props laid out in a neat three by three grid, each a different design of the same kind, "
                     "each one whole and separate with space around it, resting on the ground, orthographic, flat even lighting, no cast shadows, "
                     "plain solid white background, detailed dark fantasy digital painting, muted desaturated palette of deep teal-blue, bone white, "
                     "cold iron grey and near-black, painterly gritty texture, weathered and worn --ar 1:1 --style raw --no text, labels, watermark, "
                     "frame, border, perspective, scenery, people, characters, animals, sky")


def midjourney_prompt(kind: str, description: str) -> str:
    """A prompt for the fetch choices: character sheets from prompts.py, object turnarounds from world_prompts, the prop sheet of nine here."""
    if kind == "props9":
        desc = re.sub(r"^(a|an|the)\s+", "", description.strip(), flags=re.I)
        return PROP_SHEET_PROMPT.format(description=desc or "[OBJECT]")
    if kind in ("turnaround", "object"):
        from .world_prompts import build_world_prompt
        return build_world_prompt("object", description, "")
    from .prompts import build_prompt
    return build_prompt(kind if kind else "sheet_px", description)


def midjourney_system_prompt(prompt: str, out_dir: Path, image: str | None, pick: str) -> str:
    want = "all four variations" if pick == "all" else "the one variation that best matches the request (clearest views, plainest background, the whole figure in frame)"
    return "\n".join([
        "You are PixelForge's painter's hand: you fetch one painting from Midjourney through the person's own signed-in Chrome, with the Claude in Chrome tools.",
        "Human pace, one job: one prompt, one grid, the upscales it needs, then stop. No batches, no second prompt, no retries past one, nothing else on the site.",
        "Procedure: open https://www.midjourney.com/imagine in a new tab (the person is signed in there; if the page asks to sign in or shows a check, stop and say so in the notes). "
        + (f"Attach {image} as the image prompt first (the upload field, or drag the file in). " if image else "")
        + "Type the prompt exactly as given into the imagine bar and submit. Wait for the four-image grid to finish (watch the page; it can take a minute or two). "
        + f"Pick {want}. Upscale each pick. Download every upscaled picture at full size into {out_dir} (save as PNG when offered; never a screenshot). "
        + "Then close nothing; leave the tab for the person.",
        f"The prompt: {prompt}",
        "Do not change the prompt's words. Do not add 'pixel art'. Do not touch other tabs.",
        "For every picture you downloaded, also read its full-size address (the image's src or the open-image link: https://cdn.midjourney.com/<job id>/0_<n>.png) and list it under \"images\": Chrome may file the download somewhere else, and the Forge fetches the pictures from those addresses itself.",
        'Finish with one line of JSON and nothing after it: {"did": [...], "changed": ["absolute paths of the files downloaded"], "images": ["https://cdn.midjourney.com/..."], "notes": "what you picked and why, or why it stopped"}.',
    ])


def fetch_midjourney(prompt: str, out_dir: str | Path, project: str | Path, image: str | None = None, pick: str = "best", on_progress=None,
                     timeout: float = MIDJOURNEY_TIMEOUT, dry_run: bool = False, exe: str | None = None) -> dict:
    """Claude in Chrome paints the prompt on midjourney.com and downloads the picks into out_dir. Returns {"ok", "files", "notes", ...}."""
    out = Path(out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    add = [str(Path(image).resolve().parent)] if image else []
    add.append(str(out))
    r = run("midjourney", project, "Paint it in Midjourney and download the picks.", on_progress=on_progress, timeout=timeout, dry_run=dry_run, chrome=True,
            exe=exe, prompt=midjourney_system_prompt(prompt, out, image, pick), add_dirs=add, snapshot_files=False, watch_dir=out)
    r["prompt"] = prompt
    r["out"] = str(out)
    if r.get("dry_run"):
        return r
    files = [p for p in r.get("changed", []) if Path(p).suffix.lower() in (".png", ".jpg", ".jpeg", ".webp") and Path(p).exists()]
    # Chrome files Midjourney's downloads where it likes (the Downloads folder, or nowhere when it blocks a second
    # download): fetch every picture the hand listed by its address, straight into the folder
    import re as _re, urllib.request as _ur
    urls = list(r.get("images") or [])
    urls += _re.findall(r"https://cdn\.midjourney\.com/[^\s\"']+?\.(?:png|webp|jpe?g)", json.dumps(r))
    for i, u in enumerate(dict.fromkeys(urls)):
        dst = out / f"mj_{Path(u).parent.name[:8]}_{Path(u).stem}{Path(u).suffix}"
        if dst.exists():
            files.append(str(dst)); continue
        try:
            req = _ur.Request(u, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
                                          "Referer": "https://www.midjourney.com/"})
            dst.write_bytes(_ur.urlopen(req, timeout=60).read())
            files.append(str(dst))
        except Exception as e:   # noqa: BLE001
            r.setdefault("fetch_errors", []).append(f"{u}: {e}")
    r["files"] = sorted(set(files))
    if r.get("ok") and not r["files"]:
        r["ok"] = False
        r["error"] = r.get("notes") or "Midjourney gave nothing back: no picture landed in the folder. The log has what happened in the tab."
    return r


# ---------------------------------------------------------------- the mock (tests and the Forge's sweep)
def _subst(line: str, vars_: dict) -> str:
    for k, v in vars_.items():
        line = line.replace("{" + k + "}", json.dumps(str(v))[1:-1])
    return line


def mock_main(script: str, bench: str, project: str, text: str) -> int:
    """Emit a canned stream-json from a .jsonl script. Lines are events, or controls: {"mock": "sleep", "seconds": S},
    {"mock": "run", "args": [pixelforge words]} (runs the CLI so the bench really changes), {"mock": "copy", "from": A, "to": B}
    (a file written, as Write would), {"mock": "python", "args": [script, ...]} (the script run, as Bash would), {"mock": "exit",
    "code": N}. Placeholders {project} {bench} {text} {slug} {pf_root} are filled in every line, plus whatever the caller put in
    ``PF_BRIDGE_VARS`` (the author loop's {round} {name} {shapes_dir} {round_dir})."""
    delay = float(os.environ.get("PIXELFORGE_MOCK_DELAY", "0.15"))
    slug = re.sub(r"[^a-z0-9]+", "_", " ".join(text.lower().split()[:3])).strip("_") or "thing"
    vars_ = {"project": project, "bench": bench, "text": text, "slug": slug, "pf_root": str(PF_ROOT)}
    try:
        vars_.update(json.loads(os.environ.get("PF_BRIDGE_VARS", "") or "{}"))
    except json.JSONDecodeError:
        pass
    raw = Path(script).read_text(encoding="utf-8")
    for line in raw.splitlines():
        line = _subst(line.strip(), vars_)
        if not line or line.startswith("#"):
            continue
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(ev, dict) and "mock" in ev:
            if ev["mock"] == "sleep":
                time.sleep(float(ev.get("seconds", 1)))
            elif ev["mock"] == "run":
                env = dict(os.environ)
                env["PYTHONPATH"] = str(PF_ROOT) + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
                subprocess.run([sys.executable, "-m", "pixelforge.cli"] + [str(a) for a in ev.get("args", [])], env=env, capture_output=True, text=True)
            elif ev["mock"] == "copy":
                dst = Path(ev["to"]); dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(ev["from"], dst)
            elif ev["mock"] == "python":
                env = dict(os.environ)
                env["PYTHONPATH"] = str(PF_ROOT) + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
                subprocess.run([sys.executable] + [str(a) for a in ev.get("args", [])], env=env, capture_output=True, text=True)
            elif ev["mock"] == "exit":
                sys.stdout.flush()
                return int(ev.get("code", 0))
            continue
        sys.stdout.write(json.dumps(ev) + "\n")
        sys.stdout.flush()
        time.sleep(delay)
    return 0


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) >= 5 and argv[0] == "mock":
        return mock_main(argv[1], argv[2], argv[3], argv[4])
    print(json.dumps(status(), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())


# ---------------------------------------------------------------- the doctor: why does the describe line do nothing?
DOCTOR_STEPS = ("executable", "signed_in", "registered", "server", "round_trip", "chrome")


def _step(name: str, ok: bool, words: str, fix: str = "", optional: bool = False, **extra) -> dict:
    return {"step": name, "ok": bool(ok), "optional": optional, "words": words, "fix": fix, **extra}


def _api_key_only(exe: str) -> bool | None:
    """True when ``claude auth status --json`` says the sign-in is an API key alone (``/login`` not done)."""
    try:
        r = _call([exe, "auth", "status", "--json"], 30)
    except (OSError, subprocess.TimeoutExpired):
        return None
    m = re.search(r"\{.*\}", r.stdout + r.stderr, re.S)
    if not m:
        return None
    try:
        d = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    method = str(d.get("authMethod", d.get("method", d.get("auth_method", "")))).lower().replace("_", "").replace("-", "")
    return method in ("apikey", "api") if method else None


def mcp_server_check(timeout: float = 60.0) -> dict:
    """Start PixelForge's MCP server the way Claude Code does (``python -m pixelforge.cli mcp`` over stdio), say hello
    (``initialize``), list its tools and call ``list_styles``; one dict: ``ok``, ``tools`` (how many), ``words``."""
    try:
        import mcp  # noqa: F401
    except ImportError:
        return {"ok": False, "words": "The MCP server cannot start: the 'mcp' package is not installed.", "fix": "Run install.bat again, or `pip install mcp` in the Forge's Python."}
    cmd = server_command()
    env = dict(os.environ)
    env["PYTHONPATH"] = str(PF_ROOT) + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
    env.setdefault("PYTHONIOENCODING", "utf-8")
    try:
        proc = subprocess.Popen(cmd, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", bufsize=1,
                                **({"creationflags": getattr(subprocess, "CREATE_NO_WINDOW", 0)} if os.name == "nt" else {}))
    except OSError as e:
        return {"ok": False, "words": f"The MCP server could not be started ({e}).", "fix": "Set the Forge's Python in Settings, or run install.bat again."}
    q: Queue = Queue()
    threading.Thread(target=_reader, args=(proc.stdout, q), daemon=True).start()
    t0 = time.time()

    def send(msg: dict) -> None:
        proc.stdin.write(json.dumps(msg) + "\n")
        proc.stdin.flush()

    def wait_for(id_: int) -> dict | None:
        while time.time() - t0 < timeout:
            try:
                line = q.get(timeout=0.25)
            except Empty:
                if proc.poll() is not None:
                    return None
                continue
            if line is None:
                return None
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(ev, dict) and ev.get("id") == id_:
                return ev
        return None

    try:
        send({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "pixelforge-doctor", "version": "1"}}})
        hello = wait_for(1)
        if hello is None or "result" not in hello:
            return {"ok": False, "words": "The MCP server started but did not answer the hello within the time.", "fix": f"Run `{' '.join(cmd)}` in a terminal and read its first lines; the log drawer (Ctrl+L) has the Forge's side."}
        send({"jsonrpc": "2.0", "method": "notifications/initialized"})
        send({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
        tools = wait_for(2)
        names = [t.get("name", "") for t in ((tools or {}).get("result") or {}).get("tools", [])]
        send({"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "list_styles", "arguments": {}}})
        answer = wait_for(3)
        ok = bool(answer and "result" in answer and not (answer["result"] or {}).get("isError"))
        if not ok:
            return {"ok": False, "tools": len(names), "words": f"The MCP server lists {len(names)} tools but a call to list_styles did not come back.",
                    "fix": "Run `pixelforge list-styles` in a terminal; if that works, run install.bat again."}
        return {"ok": True, "tools": len(names), "words": f"PixelForge's MCP server starts and answers: {len(names)} tools, list_styles came back in {time.time() - t0:.1f} s."}
    finally:
        try:
            proc.stdin.close()
        except OSError:
            pass
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


def find_browser() -> str | None:
    """A Chrome or Edge executable, for the Midjourney road (optional)."""
    for name in ("google-chrome", "google-chrome-stable", "chrome", "chromium", "chromium-browser", "msedge", "microsoft-edge"):
        w = shutil.which(name)
        if w:
            return w
    for env in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
        base = os.environ.get(env)
        if base:
            for rel in (r"Google\Chrome\Application\chrome.exe", r"Microsoft\Edge\Application\msedge.exe"):
                p = Path(base) / rel
                if p.exists():
                    return str(p)
    for p in (Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge")):
        if p.exists():
            return str(p)
    return None


def doctor(project: str | Path | None = None, timeout: float = 180.0, log=None, round_trip: bool = True) -> dict:
    """Why does the describe line do nothing? Six checks in order, each a pass or a fail with one sentence on how to fix it:
    (1) the claude executable and its version, (2) signed in (not an API key alone), (3) PixelForge's MCP server registered
    with it (registered on the spot when not), (4) the MCP server itself starts and answers, (5) a real round trip: ``describe
    --bench music "set tempo 80"`` on a scratch project, the song file must change (with the time limit and the log path),
    (6) Chrome for the Midjourney road, reported but optional. ``pixelforge claude doctor``."""
    import tempfile

    steps: list[dict] = []
    say = log or (lambda s: None)
    mock = mock_script()
    exe = "mock" if mock else find_claude()
    # 1. the executable
    if mock:
        steps.append(_step("executable", True, f"A mock stands in for Claude Code ({mock}); the real executable is not checked.", exe=exe))
    elif exe:
        v = version(exe)
        steps.append(_step("executable", True, f"Claude Code found at {exe}" + (f", version {v}" if v else ", version unknown") + ".", exe=exe, version=v))
    else:
        steps.append(_step("executable", False, "Claude Code was not found on PATH or in the usual places.",
                           "Install it from claude.com/claude-code, open a terminal and run `claude` once; or set PIXELFORGE_CLAUDE to the executable."))
    say(_line_of(steps[-1], 1))
    found = steps[-1]["ok"]
    # 2. signed in
    if not found:
        steps.append(_step("signed_in", False, "Not checked: no Claude Code.", "Fix step 1 first.", skipped=True))
    elif mock:
        steps.append(_step("signed_in", True, "The mock is always signed in."))
    else:
        s = signed_in(exe)
        key_only = _api_key_only(exe) if s else None
        if s is False:
            steps.append(_step("signed_in", False, "Claude Code is installed but not signed in.", "Open a terminal, run `claude`, and type /login to sign in with your Anthropic account once."))
        elif key_only:
            steps.append(_step("signed_in", False, "Claude Code is using an API key alone, not a signed-in account.",
                               "Run `claude` and type /login to sign in; an API key alone keeps the browser integration and some tools off."))
        elif s is None:
            steps.append(_step("signed_in", True, "Whether Claude Code is signed in could not be read (`claude auth status` gave no answer); the round trip below tells.",
                               "If step 5 fails at sign-in: run `claude` and type /login."))
        else:
            steps.append(_step("signed_in", True, "Signed in" + (" (ANTHROPIC_API_KEY is also set in the environment; the account sign-in wins)." if os.environ.get("ANTHROPIC_API_KEY") else ".")))
    say(_line_of(steps[-1], 2))
    # 3. registered
    if not found:
        steps.append(_step("registered", False, "Not checked: no Claude Code.", "Fix step 1 first.", skipped=True))
    elif mock:
        steps.append(_step("registered", True, "The mock needs no registration."))
    elif registered(exe):
        steps.append(_step("registered", True, "PixelForge's MCP server is registered with Claude Code (`claude mcp get pixelforge`)."))
    else:
        r = register(exe)
        cmd = " ".join([exe, "mcp", "add", "-s", "user", SERVER_NAME, "--"] + server_command())
        if r.get("ok"):
            steps.append(_step("registered", True, "PixelForge's MCP server was not registered; it is now (registered just now).", registered_now=True))
        else:
            steps.append(_step("registered", False, "PixelForge's MCP server is not registered with Claude Code and registering it failed: " + str(r.get("error", "")),
                               f"Run in a terminal: {cmd}"))
    say(_line_of(steps[-1], 3))
    # 4. the server itself
    srv = mcp_server_check(min(timeout, 90.0))
    steps.append(_step("server", srv["ok"], srv["words"], srv.get("fix", ""), tools=srv.get("tools", 0)))
    say(_line_of(steps[-1], 4))
    # 5. the round trip
    if not round_trip:
        steps.append(_step("round_trip", True, "Skipped (no round trip asked).", skipped=True))
    elif not found or not steps[1]["ok"] or not srv["ok"]:
        steps.append(_step("round_trip", False, "Not run: the steps above must pass first.", "Fix the failed step above, then run the doctor again.", skipped=True))
    else:
        scratch = Path(tempfile.mkdtemp(prefix="pixelforge_doctor_"))
        try:
            from .api import new_project
            from .music import library as L, song as SONG
            new_project(scratch, "doctor", "godmarrow")
            (scratch / "music").mkdir(exist_ok=True)
            song_path = scratch / "music" / "current.song.json"
            SONG.save(L.load_piece("forge_home"), song_path)
            before = song_path.read_bytes()
            tempo_before = SONG.load(song_path).get("tempo")
            r = run("music", scratch, "set tempo 80", on_progress=lambda w: say("   " + w), timeout=min(timeout, 600.0), snapshot_files=False)
            log_path = r.get("log", "")
            if not r.get("ok"):
                steps.append(_step("round_trip", False, f"The round trip stopped: {r.get('error', 'no answer')}", f"The full log is {log_path}; `pixelforge claude log -p {scratch}` prints it.", log=log_path))
            else:
                after = song_path.read_bytes()
                tempo_after = SONG.load(song_path).get("tempo")
                if after != before:
                    steps.append(_step("round_trip", True, f"A real round trip works: \"set tempo 80\" on a scratch song went through Claude Code and PixelForge's tools, "
                                       f"the song file changed (tempo {tempo_before:g} to {tempo_after:g}) in {r.get('seconds', 0)} s.", log=log_path, seconds=r.get("seconds", 0)))
                else:
                    steps.append(_step("round_trip", False, "Claude Code answered but the song file did not change: its tool calls did not reach PixelForge's server.",
                                       f"Read the log {log_path}: look for the pixelforge server's status in the first (init) event; run install.bat again to re-register.", log=log_path))
        except Exception as e:  # noqa: BLE001 - the doctor reports, never crashes
            steps.append(_step("round_trip", False, f"The round trip could not be set up: {e}", "Run install.bat again; the Forge's Python is missing a piece."))
        # the scratch project stays (a few small files under the temp folder) so the log it names can be read
    say(_line_of(steps[-1], 5))
    # 6. chrome
    b = find_browser()
    if b:
        steps.append(_step("chrome", True, f"A browser for the Midjourney road is there ({b}); the Claude in Chrome extension must be installed and signed in inside it.", optional=True, browser=b))
    else:
        steps.append(_step("chrome", True, "No Chrome or Edge was found: the Midjourney road is off (optional; everything else works without it).",
                           "Install Chrome and the Claude in Chrome extension if you want the Forge to paint in Midjourney for you.", optional=True))
    say(_line_of(steps[-1], 6))
    required = [s for s in steps if not s["optional"]]
    ok = all(s["ok"] for s in required)
    first_bad = next((s for s in required if not s["ok"]), None)
    sentence = "Claude on the bench works end to end." if ok else f"The describe line cannot work yet: step {steps.index(first_bad) + 1} ({first_bad['step'].replace('_', ' ')}) failed. {first_bad['fix']}"
    return {"ok": ok, "steps": steps, "sentence": sentence, "lines": [_line_of(s, i + 1) for i, s in enumerate(steps)], "mock": bool(mock), "mock_script": mock or ""}


def _line_of(step: dict, n: int) -> str:
    """One line per check for a terminal and the bench: 'N. pass  words' or 'N. FAIL  words  -> fix'."""
    mark = "pass" if step["ok"] else "FAIL"
    if step.get("optional") and not step["ok"]:
        mark = "note"
    return f"{n}. {mark}  {step['words']}" + (f"  -> {step['fix']}" if step.get("fix") and not step["ok"] else "")
