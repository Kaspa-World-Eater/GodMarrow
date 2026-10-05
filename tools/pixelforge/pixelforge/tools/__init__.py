"""The tool adapters: free programs the Forge uses instead of building their work itself. One module per tool with the
same face (see _base.py): find() what is already installed, version(), run(action, **params), explain_missing().

    from pixelforge import tools
    tools.status()                      -> every tool, found or not, with its version and the install sentence
    tools.run("ffmpeg", "gif", frames_dir=..., out=...)
    tools.get("aseprite").find()

Two rules of this package, kept on purpose: nothing is downloaded or installed (a missing tool is a sentence with the
official page), and nothing runs detached (a program opened for hand editing is a child process that waits).
"""

from __future__ import annotations

import importlib
import inspect

ADAPTERS = ["aseprite", "libresprite", "pixelorama", "furnace", "blender", "ffmpeg", "imagemagick", "rembg", "tiled", "ldtk", "godot", "mixamo", "midjourney"]


def get(name: str):
    n = str(name).lower().replace("-", "").replace("_", "")
    alias = {"magick": "imagemagick", "convert": "imagemagick", "ase": "aseprite", "libre": "libresprite"}
    n = alias.get(n, n)
    if n not in ADAPTERS:
        raise KeyError(f"no tool adapter named '{name}'; the adapters: " + ", ".join(ADAPTERS))
    return importlib.import_module(f"pixelforge.tools.{n}")


def actions_of(mod) -> dict[str, str]:
    """action -> its parameters in words, from the function signatures (what the MCP tool and `tools status` print)."""
    out = {}
    for name, fn in mod.ACTIONS.items():
        params = []
        for p in inspect.signature(fn).parameters.values():
            params.append(p.name if p.default is inspect.Parameter.empty else f"{p.name}={p.default!r}")
        out[name] = "(" + ", ".join(params) + ")" + ((": " + fn.__doc__.strip().split("\n")[0]) if fn.__doc__ else "")
    return out


def one(name: str, with_version: bool = True) -> dict:
    mod = get(name)
    exe = mod.find()
    row = {"name": mod.NAME, "title": mod.TITLE, "found": exe is not None, "exe": exe or "", "version": (mod.version(exe) if exe and with_version else ""),
           "what": mod.WHAT, "home": mod.HOME, "licence": mod.LICENCE, "install": mod.explain_missing(), "actions": sorted(mod.ACTIONS),
           "browser": bool(getattr(mod, "BROWSER", False))}
    return row


def status(with_version: bool = True) -> dict:
    """Every tool, found or not. Honest: `found` is what is installed on this computer right now."""
    rows = [one(n, with_version) for n in ADAPTERS]
    return {"ok": True, "tools": rows, "found": [r["name"] for r in rows if r["found"]], "missing": [r["name"] for r in rows if not r["found"] and not r["browser"]],
            "browser": [r["name"] for r in rows if r["browser"]]}


def run(name: str, action: str, params: dict | None = None) -> dict:
    try:
        mod = get(name)
    except KeyError as e:
        return {"ok": False, "error": str(e)}
    return mod.run(action, **(params or {}))


def format_status(s: dict) -> str:
    lines = []
    for r in s["tools"]:
        mark = "browser" if r["browser"] else ("found  " if r["found"] else "missing")
        head = f"{mark}  {r['title']:12s} {r['version'] or ('-' if r['found'] else '')}".rstrip()
        lines.append(head)
        lines.append(f"         {r['what']}")
        if not r["found"]:
            lines.append(f"         {r['install']}")
        elif r["exe"]:
            lines.append(f"         {r['exe']}")
    lines.append(f"found {len(s['found'])}: {', '.join(s['found']) or 'none'}; missing {len(s['missing'])}: {', '.join(s['missing']) or 'none'}; websites: {', '.join(s['browser'])}")
    return "\n".join(lines)


def mcp_description(name: str) -> str:
    mod = get(name)
    acts = "; ".join(f"{k}{v}" for k, v in actions_of(mod).items())
    return (f"{mod.TITLE}: {mod.WHAT}. A free tool already on the computer, never installed by this server; when it is missing the result says the install "
            f"step ({mod.HOME}). action is one of: {acts}. params is a JSON object of that action's parameters.")
