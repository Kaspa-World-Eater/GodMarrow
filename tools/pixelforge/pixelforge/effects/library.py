"""The library: saved graphs with two or three levers each, in the editor's library format (name, family, levers with
default / min / max), so the Effects bench racks them and the editor drags them onto frames.

House defaults (the fire recipe): grow slow, shrink fast; S and C curve licks; light at the source darkening outward;
eight-frame loops at 12 a second. Every effect renders in palette: the colours of a sheet are its ramp's and nothing
else. A one-shot (loop false) plays once and holds or clears on its last frame.
"""
from __future__ import annotations

from pathlib import Path

FAMILIES = ("fire", "spark", "blood", "weather", "water", "magic", "bone", "soul", "weird")

EFFECTS: dict[str, dict] = {}


def _lever(default, lo, hi, label="", step=None):
    d = {"default": default, "min": lo, "max": hi}
    if label:
        d["label"] = label
    if step is not None:
        d["step"] = step
    return d


def _add(name: str, family: str, doc: str, levers: dict, nodes: list, *, size=(64, 64), frames=8, fps=12.0, loop=True, anchor=None, out=None,
         missile=False, displacement=False):
    EFFECTS[name] = {"name": name, "family": family, "doc": doc, "levers": levers, "missile": missile, "displacement": displacement,
                     "graph": {"size": list(size), "frames": frames, "fps": fps, "loop": loop, "anchor": list(anchor) if anchor else [size[0] // 2, size[1] - 4],
                               "levers": {k: v["default"] for k, v in levers.items()}, "nodes": nodes, "out": out or "@" + nodes[-1]["id"]}}


STRENGTH = _lever(1.0, 0.0, 2.0, "strength")
SPEED = _lever(1.0, 0.25, 3.0, "speed")
SIZE = _lever(1.0, 0.4, 2.0, "size")


def get_effect(name: str) -> dict:
    if name not in EFFECTS:
        raise KeyError(f"no effect named {name!r}; the library has: {', '.join(sorted(EFFECTS))}")
    return EFFECTS[name]


def list_effects(family: str = "") -> list[dict]:
    rows = []
    for name, e in EFFECTS.items():
        if family and e["family"] != family:
            continue
        rows.append({"name": name, "family": e["family"], "doc": e["doc"], "levers": e["levers"], "frames": e["graph"]["frames"], "fps": e["graph"]["fps"],
                     "size": e["graph"]["size"], "loop": e["graph"]["loop"], "missile": e.get("missile", False), "displacement": e.get("displacement", False),
                     "nodes": [n["op"] for n in e["graph"]["nodes"]]})
    return rows


def library_table() -> dict:
    """What the Forge and the editor load: families in order, the effects, the node ops, the palettes."""
    from .colour import PALETTES
    from .graph import node_table
    return {"ok": True, "families": list(FAMILIES), "effects": list_effects(), "names": sorted(EFFECTS), "nodes": node_table(), "palettes": sorted(PALETTES)}


def render_effect(name: str, out_dir: str | Path, *, levers: dict | None = None, size=None, frames=None, fps=None, seed=None, gif: bool = False,
                  rotations: int = 0, out_name: str = "", palette: str | None = None) -> dict:
    """Render a library effect to ``<out_dir>/<name>.png|json`` (+ GIF). ``palette`` swaps every ramp's colours (a palette name or hex list)."""
    from .output import render_graph
    e = get_effect(name)
    lv = {k: float(v) for k, v in (levers or {}).items()}
    unknown = [k for k in lv if k not in e["levers"]]
    if unknown:
        return {"ok": False, "error": f"{name} has no lever named {', '.join(unknown)}; its levers are {', '.join(e['levers'])}"}
    graph = e["graph"]
    if palette:
        graph = {**graph, "nodes": [({**n, "colours": palette} if n["op"] == "ramp" else n) for n in graph["nodes"]]}
    r = render_graph(graph, out_name or name, out_dir, levers=lv, size=size, frames=frames, fps=fps, seed=seed, gif=gif, rotations=rotations,
                     kind=name, extra={"family": e["family"], "effect": name, "displacement": bool(e.get("displacement"))})
    r["effect"] = name
    r["family"] = e["family"]
    r["lever_table"] = e["levers"]
    r["doc"] = e["doc"]
    return r


def R(id_, colours, bands=6, **kw):
    return {"id": id_, "op": "ramp", "colours": colours, "bands": bands, **kw}


# ====================================================================== fire
_add("flame", "fire",
     "A standing flame: bright at the heart, darker upward, swaying in an S, its top broken into licks that climb and pinch off; embers lift off the tips.",
     {"size": SIZE, "heat": _lever(1.0, 0.3, 2.0, "heat"), "speed": SPEED},
     [{"id": "fl", "op": "flow", "cells": 3.0, "strength": 1.0},
      {"id": "body", "op": "flame_body", "x": 0.5, "y": 0.92, "width": "0.55 * $size", "height": "0.85 * min($size, 1.1)", "licks": 2.5, "rise": "$speed", "curve": "s", "sway": 0.08},
      R("ramp", "fire"),
      {"id": "img", "op": "paint", "field": "@body", "ramp": "@ramp", "cut": 0.12, "gamma": "2.0 / $heat"},
      {"id": "embers", "op": "emitter", "x": 0.5, "y": 0.45, "jitter": 0.3, "shape": "area", "count": 5, "life": 7, "angle": -90, "spread": 25, "speed": "1.1 * $speed",
       "size": 0.8, "size_curve": "fade_out", "turbulence": 0.7, "flow": "@fl"},
      {"id": "eimg", "op": "paint", "field": "@embers", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.5},
      {"id": "final", "op": "layers", "images": ["@img", "@eimg"]}],
     size=(48, 64), anchor=(24, 60))

_add("torch", "fire",
     "A torch head: a short wide flame on its brand, smoke thinning above, embers spitting; the brand's top glows.",
     {"size": SIZE, "smoke": _lever(0.6, 0.0, 1.5, "smoke"), "speed": SPEED},
     [{"id": "fl", "op": "flow", "cells": 3.0, "strength": 1.2},
      {"id": "sm", "op": "smoke", "x": 0.5, "y": 0.5, "width": 0.1, "rise": "1.4 * $speed", "swirl": 1.6, "spread": 0.5, "decay": 0.1, "amount": "0.5 * $smoke"},
      {"id": "smt", "op": "mask_height", "field": "@sm", "lo": 0.55, "hi": 1.0, "feather": 0.15},
      R("sramp", "smoke", 4),
      {"id": "simg", "op": "paint", "field": "@smt", "ramp": "@sramp", "cut": 0.22, "dither": 0.3},
      {"id": "body", "op": "flame_body", "x": 0.5, "y": 0.6, "width": "0.62 * $size", "height": "0.42 * $size", "licks": 3.0, "rise": "1.2 * $speed", "curve": "s", "sway": 0.1, "flicker": 0.3},
      R("ramp", "fire"),
      {"id": "img", "op": "paint", "field": "@body", "ramp": "@ramp", "cut": 0.12, "gamma": 1.8},
      {"id": "brand", "op": "line", "x0": 0.5, "y0": 0.6, "x1": 0.5, "y1": 0.98, "width": 5.0},
      {"id": "bglow", "op": "gradient", "direction": "up", "power": 2.5},
      {"id": "bshade", "op": "mul", "a": "@brand", "b": "@bglow"},
      {"id": "bf", "op": "gain", "field": "@bshade", "mult": 0.6, "lift": 0.12, "inside": True},
      {"id": "wrap", "op": "line", "x0": 0.5, "y0": 0.6, "x1": 0.5, "y1": 0.7, "width": 7.0},
      {"id": "wf", "op": "gain", "field": "@wrap", "mult": 0.55},
      {"id": "bw", "op": "max", "a": "@bf", "b": "@wf"},
      R("bramp", "amber", 5),
      {"id": "bimg", "op": "paint", "field": "@bw", "ramp": "@bramp", "cut": 0.05},
      {"id": "embers", "op": "emitter", "x": 0.5, "y": 0.42, "jitter": 0.25, "shape": "area", "count": 6, "life": 6, "angle": -90, "spread": 40, "speed": "1.3 * $speed",
       "size": 0.8, "size_curve": "fade_out", "turbulence": 0.8, "flow": "@fl"},
      {"id": "eimg", "op": "paint", "field": "@embers", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.5},
      {"id": "final", "op": "layers", "images": ["@simg", "@bimg", "@img", "@eimg"]}],
     size=(48, 72), anchor=(24, 70))

_add("candle", "fire",
     "A candle flame: tiny, slow, a blue root under a cream heart, leaning and recovering in a draught.",
     {"size": SIZE, "draught": _lever(0.5, 0.0, 1.5, "draught"), "speed": _lever(0.6, 0.25, 2.0, "speed")},
     [{"id": "body", "op": "flame_body", "x": 0.5, "y": 0.9, "width": "0.5 * $size", "height": "0.75 * $size", "licks": 1.5, "rise": "0.7 * $speed", "curve": "c",
       "sway": "0.1 * $draught", "flicker": "0.2 * $draught", "sharp": 0.7},
      {"id": "pulse", "op": "pulse", "field": "@body", "depth": "0.12 * $draught", "beats": 2},
      R("ramp", "#3a1408,#8a3010,#d8782a,#f6c050,#fff8e0", 5),
      {"id": "img", "op": "paint", "field": "@pulse", "ramp": "@ramp", "cut": 0.1, "gamma": 1.4},
      {"id": "root", "op": "circle", "x": 0.5, "y": 0.9, "radius": "0.16 * $size", "squash": 0.7, "falloff": 0.5},
      {"id": "rootin", "op": "mul", "a": "@root", "b": "@body"},
      R("rramp", "#1a2a5a,#2c4c9a,#6a94e0", 3),
      {"id": "rimg", "op": "paint", "field": "@rootin", "ramp": "@rramp", "cut": 0.25},
      {"id": "final", "op": "layers", "images": ["@img", "@rimg"]}],
     size=(16, 28), anchor=(8, 26))

_add("ember", "fire",
     "A bed of embers: separate coals that breathe between dark and orange over grey ash, the hottest cracking white, sparks lifting now and then.",
     {"heat": _lever(1.0, 0.2, 2.0, "heat"), "sparks": _lever(1.0, 0.0, 3.0, "sparks"), "speed": SPEED},
     [{"id": "fl", "op": "flow", "cells": 2.0, "strength": 0.8},
      {"id": "cells", "op": "cellular", "cells": 9.0, "mode": "f1", "drift": 0.0},
      {"id": "cinv", "op": "invert", "field": "@cells"},
      {"id": "coals", "op": "threshold", "field": "@cinv", "level": 0.66, "soft": 0.12},
      {"id": "bed", "op": "mask_height", "field": "@coals", "lo": 0.02, "hi": 0.32, "feather": 0.06},
      {"id": "ashm", "op": "mask_height", "field": "@cinv", "lo": 0.0, "hi": 0.3, "feather": 0.05},
      {"id": "ash", "op": "gain", "field": "@ashm", "mult": 0.5, "power": 1.5},
      R("aramp", "ash", 3),
      {"id": "aimg", "op": "paint", "field": "@ash", "ramp": "@aramp", "cut": 0.18, "dither": 0.4},
      {"id": "breath", "op": "perlin", "cells": 3.0, "tcells": 1, "octaves": 2},
      {"id": "bg", "op": "gain", "field": "@breath", "mult": 0.9, "lift": 0.3},
      {"id": "glow", "op": "mul", "a": "@bed", "b": "@bg"},
      {"id": "hot", "op": "gain", "field": "@glow", "mult": "1.1 * $heat", "power": 1.2},
      {"id": "banded", "op": "posterize", "field": "@hot", "levels": 6},
      R("ramp", "#2a0804,#6a1808,#b83a0c,#e8781a,#f8c040,#fff4d0", 6),
      {"id": "img", "op": "paint", "field": "@banded", "ramp": "@ramp", "cut": 0.25, "gamma": 1.6},
      {"id": "sp", "op": "emitter", "x": 0.5, "y": 0.78, "jitter": 0.45, "shape": "line", "count": "int(6 * $sparks)", "life": 8, "angle": -90, "spread": 35,
       "speed": "1.2 * $speed", "size": 0.7, "size_curve": "fade_out", "turbulence": 0.8, "flow": "@fl"},
      {"id": "simg", "op": "paint", "field": "@sp", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.5},
      {"id": "final", "op": "layers", "images": ["@aimg", "@img", "@simg"]}],
     size=(64, 40), anchor=(32, 36))

# ====================================================================== sparks and light
_add("spark_burst", "spark",
     "Sparks thrown from a strike: bright heads with short tails, slowing under gravity, bouncing once off the ground, cooling from white to red.",
     {"count": _lever(1.0, 0.3, 3.0, "count"), "spread": _lever(1.0, 0.3, 2.0, "spread"), "speed": SPEED},
     [{"id": "sp", "op": "emitter", "x": 0.5, "y": 0.6, "count": "int(22 * $count)", "life": 9, "life_jitter": 0.4, "angle": -90, "spread": "70 * $spread",
       "speed": "3.2 * $speed", "speed_jitter": 0.5, "speed_curve": "fade_out", "size": 1.3, "size_curve": "pop", "gravity": 0.3, "drag": 0.04, "trail": 3,
       "ground": 0.92, "bounce": 0.45, "burst": True},
      R("ramp", "spark"),
      {"id": "img", "op": "paint", "field": "@sp", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.3},
      {"id": "flash", "op": "circle", "x": 0.5, "y": 0.6, "radius": 0.12, "falloff": 0.5},
      {"id": "fonly", "op": "mask_age", "bundle": "@sp", "lo": 0.0, "hi": 0.12, "feather": 0.05},
      {"id": "fgate", "op": "mul", "a": "@flash", "b": "@fonly"},
      {"id": "fimg", "op": "paint", "field": "@fgate", "ramp": "@ramp", "cut": 0.3},
      {"id": "final", "op": "layers", "images": ["@fimg", "@img"], "blends": ["normal", "lighten"]}],
     size=(64, 64), frames=10, loop=False, anchor=(32, 58))

_add("sparkle", "spark",
     "Sparkles: little four-point stars that wink in and out over a patch, never two the same moment.",
     {"count": _lever(1.0, 0.3, 3.0, "count"), "size": SIZE, "speed": SPEED},
     [{"id": "dots", "op": "emitter", "x": 0.5, "y": 0.5, "jitter": 0.4, "shape": "area", "count": "int(9 * $count)", "life": "int(6 / $speed) + 2", "life_jitter": 0.5,
       "speed": 0.0, "size": "2.2 * $size", "size_jitter": 0.4, "size_curve": "bell", "soft": 0.0},
      {"id": "star", "op": "take", "bundle": "@dots", "key": "v"},
      {"id": "core", "op": "erode", "field": "@star", "radius": 1},
      {"id": "up", "op": "shift", "field": "@core", "dy": -1},
      {"id": "down", "op": "shift", "field": "@core", "dy": 1},
      {"id": "left", "op": "shift", "field": "@core", "dx": -1},
      {"id": "right", "op": "shift", "field": "@core", "dx": 1},
      {"id": "cross1", "op": "max", "a": "@up", "b": "@down"},
      {"id": "cross2", "op": "max", "a": "@left", "b": "@right"},
      {"id": "cross", "op": "max", "a": "@cross1", "b": "@cross2"},
      {"id": "armsdim", "op": "gain", "field": "@cross", "mult": 0.6},
      {"id": "shape", "op": "max", "a": "@core", "b": "@armsdim"},
      R("ramp", "#3a3050,#8a84c0,#d8d4ff,#ffffff", 4),
      {"id": "img", "op": "paint", "field": "@shape", "ramp": "@ramp", "cut": 0.3}],
     size=(48, 48), anchor=(24, 24))

_add("flare", "spark",
     "A flare: a hot core with four long thin rays that breathe, two shorter between them, and a thin ring of glare that swells out and fades.",
     {"size": SIZE, "rays": _lever(1.0, 0.0, 2.0, "rays"), "speed": SPEED},
     [{"id": "core", "op": "circle", "x": 0.5, "y": 0.5, "radius": "0.08 * $size", "falloff": 0.6},
      {"id": "rv", "op": "line", "x0": 0.5, "y0": "0.5 - 0.42 * $size * $rays", "x1": 0.5, "y1": "0.5 + 0.42 * $size * $rays", "width": 2.4, "edge": 0.5},
      {"id": "rh", "op": "line", "x0": "0.5 - 0.42 * $size * $rays", "y0": 0.5, "x1": "0.5 + 0.42 * $size * $rays", "y1": 0.5, "width": 2.4, "edge": 0.5},
      {"id": "d1", "op": "line", "x0": "0.5 - 0.2 * $size * $rays", "y0": "0.5 - 0.2 * $size * $rays", "x1": "0.5 + 0.2 * $size * $rays", "y1": "0.5 + 0.2 * $size * $rays", "width": 1.2, "edge": 0.5},
      {"id": "d2", "op": "line", "x0": "0.5 - 0.2 * $size * $rays", "y0": "0.5 + 0.2 * $size * $rays", "x1": "0.5 + 0.2 * $size * $rays", "y1": "0.5 - 0.2 * $size * $rays", "width": 1.2, "edge": 0.5},
      {"id": "cross", "op": "max", "a": "@rv", "b": "@rh"},
      {"id": "diag", "op": "max", "a": "@d1", "b": "@d2"},
      {"id": "dd", "op": "gain", "field": "@diag", "mult": 0.6},
      {"id": "rr", "op": "max", "a": "@cross", "b": "@dd"},
      {"id": "fade", "op": "radial", "x": 0.5, "y": 0.5, "radius": "0.45 * $size * max($rays, 0.1)"},
      {"id": "finv", "op": "invert", "field": "@fade"},
      {"id": "fpow", "op": "gain", "field": "@finv", "power": 0.7},
      {"id": "rayfade", "op": "mul", "a": "@rr", "b": "@fpow"},
      {"id": "rpulse", "op": "pulse", "field": "@rayfade", "depth": 0.45, "beats": 1},
      {"id": "ring", "op": "ring", "x": 0.5, "y": 0.5, "radius": "0.46 * $size", "width": 0.025, "grow": 1.0, "edge": 0.5},
      {"id": "rfade", "op": "pulse", "field": "@ring", "depth": 0.75, "beats": 1, "shape": "saw_down"},
      {"id": "rg", "op": "gain", "field": "@rfade", "mult": 0.6},
      {"id": "a", "op": "max", "a": "@core", "b": "@rpulse"},
      {"id": "b", "op": "max", "a": "@a", "b": "@rg"},
      R("ramp", "holy", 5),
      {"id": "img", "op": "paint", "field": "@b", "ramp": "@ramp", "cut": 0.22, "gamma": 0.9}],
     size=(64, 64), anchor=(32, 32))

_add("arc", "spark",
     "An arc of discharge between two points: a jagged white core with a cold blue rim, re-forking every second frame, forks flickering off it.",
     {"jag": _lever(1.0, 0.2, 2.5, "jag"), "forks": _lever(1.0, 0.0, 3.0, "forks"), "speed": SPEED},
     [{"id": "b", "op": "bolt", "x0": 0.5, "y0": 0.02, "x1": 0.5, "y1": 0.98, "jag": "0.1 * $jag", "segments": 14, "branches": "int(3 * $forks)", "width": 1.4,
       "hold": "max(1, int(round(2 / $speed)))", "flash": 0.5},
      {"id": "rim", "op": "dilate", "field": "@b", "radius": 1},
      {"id": "rimdim", "op": "gain", "field": "@rim", "mult": 0.5},
      {"id": "all", "op": "max", "a": "@b", "b": "@rimdim"},
      R("ramp", "arc", 5),
      {"id": "img", "op": "paint", "field": "@all", "ramp": "@ramp", "cut": 0.3}],
     size=(32, 64), anchor=(16, 62))

_add("saber", "spark",
     "A blade of light: a white core along the edge with a coloured rim that hums (flickers by a pixel), ghost copies trailing its swing.",
     {"length": _lever(1.0, 0.4, 1.5, "length"), "hum": _lever(1.0, 0.0, 2.0, "hum"), "speed": SPEED},
     [{"id": "core", "op": "line", "x0": 0.5, "y0": 0.92, "x1": 0.5, "y1": "0.92 - 0.8 * $length", "width": 2.0, "taper": 0.3},
      {"id": "rim", "op": "dilate", "field": "@core", "radius": 1},
      {"id": "rimdim", "op": "gain", "field": "@rim", "mult": 0.55},
      {"id": "hum", "op": "pulse", "field": "@rimdim", "depth": "0.3 * $hum", "beats": 4, "shape": "flicker"},
      {"id": "blade", "op": "max", "a": "@core", "b": "@hum"},
      R("ramp", "saber", 5),
      {"id": "img", "op": "paint", "field": "@blade", "ramp": "@ramp", "cut": 0.25},
      {"id": "swing", "op": "transform", "image": "@img", "angle": -35, "dy": 0},
      {"id": "final", "op": "echo", "image": "@swing", "copies": 3, "lag": 1, "dx": -3, "dy": 0, "fade": 0.7, "ramp": "@ramp"}],
     size=(64, 64), anchor=(32, 58))

# ====================================================================== blood
_add("blood_spray", "blood",
     "Blood thrown from a wound: bright drops arcing up and out under gravity, darkening as they fly, splitting into droplets as they land and stick.",
     {"amount": _lever(1.0, 0.3, 3.0, "amount"), "force": _lever(1.0, 0.3, 2.5, "force"), "angle": _lever(-45.0, -170.0, -10.0, "angle")},
     [{"id": "sp", "op": "emitter", "x": 0.3, "y": 0.5, "count": "int(18 * $amount)", "life": 10, "life_jitter": 0.3, "angle": "$angle", "spread": 30,
       "speed": "3.0 * $force", "speed_jitter": 0.5, "size": 1.8, "size_jitter": 0.5, "size_curve": "flat", "gravity": 0.36, "drag": 0.02, "trail": 2,
       "ground": 0.88, "stick": True, "burst": True,
       "sub": {"count": 3, "when": "land", "life": 6, "angle": -90, "spread": 60, "speed": 1.2, "size": 0.9, "size_curve": "flat", "gravity": 0.3, "ground": 0.9, "stick": True}},
      R("ramp", "#200202,#4a0808,#7a1010,#a81c1c,#cc3030", 5),
      {"id": "img", "op": "paint", "field": "@sp", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.3, "gamma": 0.7}],
     size=(64, 48), frames=12, loop=False, anchor=(20, 42))

_add("blood_pool", "blood",
     "A pool spreading from a point: a dark blot that creeps outward with an uneven edge, a wet gleam near its middle, then stays.",
     {"size": SIZE, "speed": SPEED},
     [{"id": "blot", "op": "circle", "x": 0.5, "y": 0.6, "radius": "0.4 * $size", "falloff": 0.7, "grow": "0.6 / $speed", "squash": 0.45},
      {"id": "edge", "op": "perlin", "cells": 7.0, "tcells": 1, "octaves": 2},
      {"id": "en", "op": "gain", "field": "@edge", "mult": 0.7, "lift": 0.65},
      {"id": "rough", "op": "mul", "a": "@blot", "b": "@en"},
      {"id": "shape", "op": "threshold", "field": "@rough", "level": 0.18, "soft": 0.0},
      {"id": "depth", "op": "mul", "a": "@rough", "b": "@shape"},
      {"id": "p", "op": "posterize", "field": "@depth", "levels": 5},
      R("ramp", "#6a1414,#3c0808,#1c0202,#1c0202,#7a2020", 5),
      {"id": "img", "op": "paint", "field": "@p", "ramp": "@ramp", "cut": 0.2}],
     size=(64, 40), frames=12, loop=False, anchor=(32, 28))

_add("drips", "blood",
     "Drips from above: beads gather under a ledge, swell, fall with a thin tail and burst small where they land.",
     {"count": _lever(1.0, 0.3, 3.0, "count"), "colour": _lever(0.0, 0.0, 1.0, "blood..water"), "speed": SPEED},
     [{"id": "d", "op": "emitter", "x": 0.5, "y": 0.06, "jitter": 0.42, "shape": "line", "count": "int(4 * $count)", "life": "int(11 / $speed)", "life_jitter": 0.3,
       "angle": 90, "spread": 0, "speed": 0.0, "size": 1.7, "size_curve": "fade_in", "size_end": 0.45, "gravity": "0.3 * $speed", "trail": 3, "ground": 0.94, "bounce": 0,
       "sub": {"count": 3, "when": "land", "life": 4, "angle": -90, "spread": 70, "speed": 1.0, "size": 0.8, "size_curve": "fade_out", "gravity": 0.3}},
      {"id": "ledge", "op": "line", "x0": 0.0, "y0": 0.03, "x1": 1.0, "y1": 0.03, "width": 3.0},
      R("lramp", "iron", 3),
      {"id": "ldim", "op": "gain", "field": "@ledge", "mult": 0.4},
      {"id": "limg", "op": "paint", "field": "@ldim", "ramp": "@lramp", "cut": 0.2},
      R("rb", "#2a0404,#5c0a0a,#8c1414,#b82020", 4),
      R("rw", "water", 5),
      {"id": "ib", "op": "paint", "field": "@d", "ramp": "@rb", "cut": 0.28, "gamma": 0.8},
      {"id": "iw", "op": "paint", "field": "@d", "ramp": "@rw", "cut": 0.28, "gamma": 0.8},
      {"id": "drops", "op": "blend", "base": "@ib", "top": "@iw", "mode": "normal", "opacity": "$colour"},
      {"id": "final", "op": "layers", "images": ["@limg", "@drops"]}],
     size=(48, 64), frames=12, anchor=(24, 62))

# ====================================================================== weather
_add("rain", "weather",
     "Rain: thin slanted streaks falling fast, splashing into short crowns where they strike the ground; seamless across the tile.",
     {"amount": _lever(1.0, 0.3, 3.0, "amount"), "slant": _lever(0.3, -1.0, 1.0, "slant"), "speed": SPEED},
     [{"id": "r", "op": "emitter", "x": 0.5, "y": -0.05, "jitter": 0.6, "shape": "line", "count": "int(16 * $amount)", "life": "int(10 / $speed) + 1", "angle": "90 - 25 * $slant",
       "spread": 2, "speed": "7.5 * $speed", "speed_jitter": 0.15, "size": 0.9, "size_curve": "flat", "trail": 3, "ground": 0.93, "bounce": 0, "soft": 0.2,
       "sub": {"count": 3, "when": "land", "life": 3, "angle": -90, "spread": 60, "speed": 1.3, "size": 0.7, "size_curve": "fade_out", "gravity": 0.4}},
      R("ramp", "rain", 5),
      {"id": "img", "op": "paint", "field": "@r", "ramp": "@ramp", "cut": 0.22, "gamma": 0.8}],
     size=(64, 64), anchor=(32, 60))

_add("snow", "weather",
     "Snow: flakes of two sizes drifting down through a slow swirl everywhere on the tile, the near ones larger and brighter, the far ones dim.",
     {"amount": _lever(1.0, 0.3, 3.0, "amount"), "wind": _lever(0.5, 0.0, 2.0, "wind"), "speed": _lever(0.7, 0.25, 2.0, "speed")},
     [{"id": "fl", "op": "flow", "cells": 2.0, "strength": "1.2 * $wind"},
      {"id": "near", "op": "emitter", "x": 0.5, "y": 0.4, "jitter": 0.55, "shape": "area", "count": "int(12 * $amount)", "life": "int(14 / $speed)", "angle": 90,
       "spread": 10, "speed": "1.4 * $speed", "size": 1.3, "size_jitter": 0.3, "size_curve": "flat", "turbulence": 1.0, "flow": "@fl", "soft": 0.0},
      {"id": "far", "op": "emitter", "x": 0.5, "y": 0.4, "jitter": 0.55, "shape": "area", "count": "int(16 * $amount)", "life": "int(18 / $speed)", "angle": 90,
       "spread": 10, "speed": "0.9 * $speed", "size": 0.6, "size_curve": "flat", "turbulence": 0.6, "flow": "@fl", "soft": 0.0, "seed": 2},
      R("ramp", "#3c4458,#8c94a8,#e8ecf4,#ffffff", 4),
      {"id": "fv", "op": "take", "bundle": "@far", "key": "v"},
      {"id": "fdim", "op": "gain", "field": "@fv", "mult": 0.5},
      {"id": "fimg", "op": "paint", "field": "@fdim", "ramp": "@ramp", "cut": 0.2},
      {"id": "nimg", "op": "paint", "field": "@near", "ramp": "@ramp", "cut": 0.4, "gamma": 0.5},
      {"id": "final", "op": "layers", "images": ["@fimg", "@nimg"]}],
     size=(64, 64), frames=12, anchor=(32, 60))

_add("dust_motes", "weather",
     "Dust motes: faint specks hanging in a shaft of air, drifting on a slow swirl, each catching the light for a moment.",
     {"amount": _lever(1.0, 0.3, 3.0, "amount"), "drift": _lever(1.0, 0.0, 2.0, "drift"), "speed": _lever(0.5, 0.25, 2.0, "speed")},
     [{"id": "fl", "op": "flow", "cells": 2.0, "tcells": 1, "strength": "0.6 * $drift"},
      {"id": "dots", "op": "blue", "cells": "6 * sqrt($amount)", "radius": 0.12, "twinkle": 0.9},
      {"id": "moved", "op": "warp", "field": "@dots", "vectors": "@fl", "amount": "2.0 * $speed"},
      {"id": "cut", "op": "threshold", "field": "@moved", "level": 0.35},
      R("ramp", "#4a4438,#9a9070,#e8dcb0", 3),
      {"id": "img", "op": "paint", "field": "@moved", "ramp": "@ramp", "cut": 0.3}],
     size=(64, 64), frames=12, anchor=(32, 32))

_add("fog", "weather",
     "Fog: two banks of pale vapour creeping sideways at different speeds, lobed, thickest at the ground, dithered thin at the top.",
     {"height": _lever(1.0, 0.3, 2.0, "height"), "density": _lever(1.0, 0.3, 2.0, "density"), "speed": _lever(0.5, 0.1, 2.0, "speed")},
     [{"id": "n", "op": "perlin", "cells": 3.0, "tcells": 1, "octaves": 3, "stretch": 0.5},
      {"id": "s", "op": "scroll", "field": "@n", "dx": "0.5 * $speed", "dy": 0.0},
      {"id": "low", "op": "mask_height", "field": "@s", "lo": 0.0, "hi": "0.4 * $height", "feather": "0.3 * $height"},
      {"id": "bank", "op": "threshold", "field": "@low", "level": 0.32, "soft": 0.3},
      {"id": "g", "op": "gain", "field": "@bank", "mult": "1.1 * $density"},
      {"id": "p", "op": "posterize", "field": "@g", "levels": 3},
      R("ramp", "#2a2e3a,#4a5060,#747c8c,#a8b0bc", 4),
      {"id": "back", "op": "paint", "field": "@p", "ramp": "@ramp", "cut": 0.3, "dither": 0.6},
      {"id": "n2", "op": "perlin", "cells": 4.0, "tcells": 1, "octaves": 2, "stretch": 0.5, "seed": 3},
      {"id": "s2", "op": "scroll", "field": "@n2", "dx": "0.9 * $speed", "dy": 0.0},
      {"id": "low2", "op": "mask_height", "field": "@s2", "lo": 0.0, "hi": "0.22 * $height", "feather": "0.18 * $height"},
      {"id": "bank2", "op": "threshold", "field": "@low2", "level": 0.4, "soft": 0.25},
      {"id": "g2", "op": "gain", "field": "@bank2", "mult": "1.3 * $density", "power": 0.8},
      {"id": "p2", "op": "posterize", "field": "@g2", "levels": 3},
      {"id": "front", "op": "paint", "field": "@p2", "ramp": "@ramp", "cut": 0.3, "dither": 0.4},
      {"id": "final", "op": "layers", "images": ["@back", "@front"]}],
     size=(96, 48), anchor=(48, 44))

_add("poison_cloud", "magic",
     "A poison cloud: sick green vapour boiling up from the ground in lobes that swell and burst, dark at the heart, flecks drifting off it.",
     {"size": SIZE, "density": _lever(1.0, 0.3, 2.0, "density"), "speed": SPEED},
     [{"id": "sm", "op": "smoke", "x": 0.5, "y": 0.85, "width": "0.3 * $size", "rise": "0.5 * $speed", "swirl": 2.0, "spread": 0.5, "decay": 0.08, "amount": "0.6 * $density"},
      {"id": "lobes", "op": "cellular", "cells": 3.5, "mode": "f1", "drift": 0.6},
      {"id": "li", "op": "invert", "field": "@lobes"},
      {"id": "lg", "op": "gain", "field": "@li", "mult": 0.6, "lift": 0.4},
      {"id": "mix", "op": "mul", "a": "@sm", "b": "@lg"},
      {"id": "g", "op": "gain", "field": "@mix", "mult": 2.2, "power": 1.1},
      {"id": "p", "op": "posterize", "field": "@g", "levels": 6},
      R("ramp", "poison", 5),
      {"id": "img", "op": "paint", "field": "@p", "ramp": "@ramp", "cut": 0.2, "dither": 0.15, "gamma": 2.0},
      {"id": "flecks", "op": "emitter", "x": 0.5, "y": 0.6, "jitter": 0.3, "shape": "area", "count": 6, "life": 8, "angle": -90, "spread": 50, "speed": "0.6 * $speed",
       "size": 0.8, "size_curve": "bell", "drag": 0.02},
      {"id": "fimg", "op": "paint", "field": "@flecks", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.5},
      {"id": "final", "op": "layers", "images": ["@img", "@fimg"]}],
     size=(64, 64), anchor=(32, 58))

# ====================================================================== water
_add("waterfall", "water",
     "A waterfall: streaks of white water pouring down a tall column, a plunge pool of spray boiling at its foot under a rising mist.",
     {"width": _lever(1.0, 0.4, 2.0, "width"), "spray": _lever(1.0, 0.0, 2.0, "spray"), "speed": SPEED},
     [{"id": "n", "op": "ridged", "cells": 9.0, "tcells": 1, "octaves": 2, "stretch": 6.0},
      {"id": "stretch", "op": "scroll", "field": "@n", "dx": 0.0, "dy": "1.0 * $speed"},
      {"id": "col", "op": "line", "x0": 0.5, "y0": 0.0, "x1": 0.5, "y1": 0.8, "width": "20 * $width", "edge": 2.0},
      {"id": "body", "op": "mul", "a": "@stretch", "b": "@col"},
      {"id": "g", "op": "gain", "field": "@body", "mult": 1.3, "lift": 0.2, "inside": True},
      {"id": "p", "op": "posterize", "field": "@g", "levels": 4},
      R("ramp", "water", 6),
      {"id": "img", "op": "paint", "field": "@p", "ramp": "@ramp", "cut": 0.3, "gamma": 1.4},
      {"id": "spray", "op": "emitter", "x": 0.5, "y": 0.8, "jitter": "0.16 * $width", "shape": "line", "count": "int(18 * $spray)", "life": 6, "angle": -90, "spread": 60,
       "speed": "1.6 * $speed", "size": 1.1, "size_curve": "pop", "gravity": 0.25, "ground": 0.95, "bounce": 0},
      {"id": "simg", "op": "paint", "field": "@spray", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.45, "gamma": 0.6},
      {"id": "mist", "op": "smoke", "x": 0.5, "y": 0.85, "width": "0.25 * $width", "rise": 0.8, "swirl": 1.2, "spread": 0.6, "decay": 0.12, "amount": "0.5 * $spray"},
      {"id": "mp", "op": "posterize", "field": "@mist", "levels": 3},
      {"id": "mimg", "op": "paint", "field": "@mp", "ramp": "@ramp", "cut": 0.3, "dither": 0.4, "gamma": 0.7},
      {"id": "final", "op": "layers", "images": ["@mimg", "@img", "@simg"]}],
     size=(48, 80), frames=12, anchor=(24, 76))

# ====================================================================== magic
_add("portal", "magic",
     "A portal: a ring of violet light with three bright knots running round it, a six-fold mirrored storm turning inside, motes drifting out.",
     {"size": SIZE, "spin": _lever(1.0, 0.0, 3.0, "spin"), "speed": SPEED},
     [{"id": "n", "op": "perlin", "cells": 4.0, "tcells": 1, "octaves": 3},
      {"id": "disc", "op": "circle", "x": 0.5, "y": 0.5, "radius": "0.33 * $size", "falloff": 0.9},
      {"id": "inner", "op": "mul", "a": "@n", "b": "@disc"},
      {"id": "g", "op": "gain", "field": "@inner", "mult": 1.6},
      R("ramp", "miasma", 6),
      {"id": "iimg", "op": "paint", "field": "@g", "ramp": "@ramp", "cut": 0.25, "dither": 0.2},
      {"id": "kal", "op": "polar_mirror", "image": "@iimg", "segments": 6, "spin": "120 * $spin"},
      {"id": "ring", "op": "ring", "x": 0.5, "y": 0.5, "radius": "0.38 * $size", "width": 0.05},
      {"id": "runner", "op": "polygon", "x": 0.5, "y": 0.5, "radius": "0.95 * $size", "sides": 3, "star": 0.9, "spin": "360 * $speed"},
      {"id": "rsoft", "op": "dilate", "field": "@runner", "radius": 2},
      {"id": "rk", "op": "gain", "field": "@rsoft", "mult": 0.6, "lift": 0.4},
      {"id": "rf", "op": "mul", "a": "@ring", "b": "@rk"},
      {"id": "rimg", "op": "paint", "field": "@rf", "ramp": "@ramp", "cut": 0.3},
      {"id": "motes", "op": "emitter", "x": 0.5, "y": 0.5, "jitter": "0.42 * $size", "shape": "circle", "count": 10, "life": 8, "angle": 0, "spread": 180, "speed": "0.8 * $speed",
       "size": 0.9, "size_curve": "bell"},
      {"id": "mimg", "op": "paint", "field": "@motes", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.5},
      {"id": "final", "op": "layers", "images": ["@kal", "@rimg", "@mimg"]}],
     size=(64, 64), anchor=(32, 60))

_add("holy_beam", "magic",
     "A beam from above: a soft-edged pillar of gold light, brightest at the top, breathing slowly, motes rising inside it.",
     {"width": _lever(1.0, 0.4, 2.0, "width"), "strength": STRENGTH, "speed": _lever(0.5, 0.25, 2.0, "speed")},
     [{"id": "col", "op": "line", "x0": 0.5, "y0": 0.0, "x1": 0.5, "y1": 1.0, "width": "14 * $width", "edge": 6.0},
      {"id": "top", "op": "gradient", "direction": "down", "power": 0.5},
      {"id": "tl", "op": "gain", "field": "@top", "mult": 0.65, "lift": 0.35},
      {"id": "pillar", "op": "mul", "a": "@col", "b": "@tl"},
      {"id": "shim", "op": "perlin", "cells": 3.0, "tcells": 1, "octaves": 2, "stretch": 3.0},
      {"id": "sh", "op": "gain", "field": "@shim", "mult": 0.4, "lift": 0.6},
      {"id": "p2", "op": "mul", "a": "@pillar", "b": "@sh"},
      {"id": "g", "op": "gain", "field": "@p2", "mult": "1.3 * $strength"},
      {"id": "breath", "op": "pulse", "field": "@g", "depth": 0.2, "beats": 1},
      {"id": "p", "op": "posterize", "field": "@breath", "levels": 6},
      R("ramp", "holy", 5),
      {"id": "img", "op": "paint", "field": "@p", "ramp": "@ramp", "cut": 0.3, "dither": 0.45, "gamma": 1.3},
      {"id": "motes", "op": "emitter", "x": 0.5, "y": 0.9, "jitter": "0.1 * $width", "shape": "line", "count": 8, "life": 10, "angle": -90, "spread": 10, "speed": "1.0 * $speed",
       "size": 1.0, "size_curve": "bell", "soft": 0.0},
      {"id": "mimg", "op": "paint", "field": "@motes", "ramp": "@ramp", "cut": 0.4, "gamma": 0.4},
      {"id": "final", "op": "layers", "images": ["@img", "@mimg"]}],
     size=(48, 80), anchor=(24, 76))

# ====================================================================== bone
_add("bone_shards", "bone",
     "A bone breaking: a long bone shatters into shards that fly out, tumble under gravity and scatter on the ground.",
     {"pieces": _lever(1.0, 0.4, 2.0, "pieces"), "force": _lever(1.0, 0.3, 2.5, "force")},
     [{"id": "shaft", "op": "line", "x0": 0.3, "y0": 0.55, "x1": 0.7, "y1": 0.45, "width": 5.0},
      {"id": "k1", "op": "circle", "x": 0.3, "y": 0.55, "radius": 0.07},
      {"id": "k2", "op": "circle", "x": 0.7, "y": 0.45, "radius": 0.07},
      {"id": "b1", "op": "max", "a": "@shaft", "b": "@k1"},
      {"id": "bone", "op": "max", "a": "@b1", "b": "@k2"},
      {"id": "shade", "op": "gradient", "direction": "down", "power": 1.0},
      {"id": "sb", "op": "mul", "a": "@bone", "b": "@shade"},
      {"id": "lit", "op": "gain", "field": "@sb", "mult": 0.8, "lift": 0.25, "inside": True},
      R("ramp", "bone", 5),
      {"id": "img", "op": "paint", "field": "@lit", "ramp": "@ramp", "cut": 0.1},
      {"id": "final", "op": "fracture", "image": "@img", "pieces": "int(9 * $pieces)", "x": 0.5, "y": 0.5, "speed": "1.6 * $force", "gravity": 0.2, "spin": 12, "fade_from": 0.7}],
     size=(64, 64), frames=10, loop=False, anchor=(32, 58))

_add("marrow_light", "bone",
     "Marrow-light: a bone that glows from within, warm light breathing out through cracks that run its length.",
     {"glow": _lever(1.0, 0.2, 2.0, "glow"), "cracks": _lever(1.0, 0.3, 2.0, "cracks"), "speed": _lever(0.5, 0.25, 2.0, "speed")},
     [{"id": "shaft", "op": "line", "x0": 0.5, "y0": 0.12, "x1": 0.5, "y1": 0.88, "width": 7.0},
      {"id": "k1", "op": "circle", "x": 0.5, "y": 0.12, "radius": 0.11},
      {"id": "k2", "op": "circle", "x": 0.5, "y": 0.88, "radius": 0.11},
      {"id": "b1", "op": "max", "a": "@shaft", "b": "@k1"},
      {"id": "bone", "op": "max", "a": "@b1", "b": "@k2"},
      {"id": "shade", "op": "gradient", "direction": "right", "power": 1.4},
      {"id": "sb", "op": "mul", "a": "@bone", "b": "@shade"},
      {"id": "lit", "op": "gain", "field": "@sb", "mult": 0.7, "lift": 0.3, "inside": True},
      R("bramp", "bone", 5),
      {"id": "bimg", "op": "paint", "field": "@lit", "ramp": "@bramp", "cut": 0.1},
      {"id": "cr", "op": "ridged", "cells": "2.5 * $cracks", "tcells": 1, "octaves": 2, "stretch": 3.0},
      {"id": "crt", "op": "threshold", "field": "@cr", "level": 0.76},
      {"id": "crb", "op": "mul", "a": "@crt", "b": "@bone"},
      {"id": "inner", "op": "erode", "field": "@bone", "radius": 1},
      {"id": "cracks", "op": "mul", "a": "@crb", "b": "@inner"},
      {"id": "pulse", "op": "pulse", "field": "@cracks", "depth": 0.6, "beats": 1},
      {"id": "halo", "op": "dilate", "field": "@pulse", "radius": 1},
      {"id": "hd", "op": "gain", "field": "@halo", "mult": "0.5 * $glow"},
      {"id": "light", "op": "max", "a": "@pulse", "b": "@hd"},
      R("mramp", "marrow", 5),
      {"id": "limg", "op": "paint", "field": "@light", "ramp": "@mramp", "cut": 0.3},
      {"id": "final", "op": "layers", "images": ["@bimg", "@limg"]}],
     size=(32, 64), anchor=(16, 60))

# ====================================================================== soul
_add("soul_wisps", "soul",
     "Soul wisps: pale teal lights wandering up the whole height on a swirl, each trailing a thinning tail, brightest at the head.",
     {"count": _lever(1.0, 0.3, 3.0, "count"), "size": SIZE, "speed": _lever(0.7, 0.25, 2.0, "speed")},
     [{"id": "fl", "op": "flow", "cells": 2.0, "strength": 1.4},
      {"id": "w", "op": "emitter", "x": 0.5, "y": 0.9, "jitter": 0.35, "shape": "line", "count": "int(4 * $count)", "life": 14, "life_jitter": 0.3, "angle": -90, "spread": 25,
       "speed": "3.2 * $speed", "size": "2.8 * $size", "size_curve": "bell", "turbulence": 1.5, "flow": "@fl", "trail": 5, "soft": 0.4},
      R("ramp", "wisp", 5),
      {"id": "img", "op": "paint", "field": "@w", "ramp": "@ramp", "cut": 0.25, "gamma": 1.2}],
     size=(64, 64), frames=12, anchor=(32, 60))

_add("soul_fire", "soul",
     "Soul-fire for the Keeper's staff: a green flame, cold at the heart, swaying in a C and leaning more than true fire, shedding pale motes.",
     {"size": SIZE, "lean": _lever(1.0, 0.0, 2.0, "lean"), "speed": SPEED},
     [{"id": "fl", "op": "flow", "cells": 3.0, "strength": 1.0},
      {"id": "body", "op": "flame_body", "x": 0.5, "y": 0.92, "width": "0.5 * $size", "height": "0.88 * min($size, 1.1)", "licks": 2.0, "rise": "0.9 * $speed", "curve": "c",
       "sway": "0.12 * $lean", "flicker": 0.1, "sharp": 1.1},
      R("ramp", "soul_fire"),
      {"id": "img", "op": "paint", "field": "@body", "ramp": "@ramp", "cut": 0.12, "gamma": 1.5},
      {"id": "motes", "op": "emitter", "x": 0.5, "y": 0.4, "jitter": 0.3, "shape": "area", "count": 6, "life": 8, "angle": -90, "spread": 40, "speed": "0.8 * $speed",
       "size": 0.9, "size_curve": "bell", "turbulence": 0.8, "flow": "@fl"},
      {"id": "mimg", "op": "paint", "field": "@motes", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.5},
      {"id": "final", "op": "layers", "images": ["@img", "@mimg"]}],
     size=(48, 64), anchor=(24, 60))

_add("soul_drain", "soul",
     "Soul drain: threads pulled from a figure into a point, bowing and trembling, knots of light running along them to the sink.",
     {"threads": _lever(1.0, 0.3, 2.5, "threads"), "pull": _lever(1.0, 0.3, 2.0, "pull"), "speed": SPEED},
     [{"id": "th", "op": "threads", "x": 0.28, "y": 0.5, "radius": 0.2, "sx": 0.82, "sy": 0.35, "count": "int(6 * $threads)", "beads": "int(2 * $pull)", "width": 1.0, "bow": 0.18, "wobble": 1.0},
      {"id": "sink", "op": "circle", "x": 0.82, "y": 0.35, "radius": 0.06, "falloff": 0.6},
      {"id": "sp", "op": "pulse", "field": "@sink", "depth": 0.3, "beats": 2},
      {"id": "sv", "op": "take", "bundle": "@th", "key": "v"},
      {"id": "all", "op": "max", "a": "@sv", "b": "@sp"},
      R("ramp", "wisp", 5),
      {"id": "img", "op": "paint", "field": "@all", "ramp": "@ramp", "cut": 0.3}],
     size=(80, 48), anchor=(22, 44))

# ====================================================================== the weird ones
_add("phosphorus", "weird",
     "Phosphorus: patches of cold green-white glow clinging to a surface, one flaring now and then where it is disturbed, smears that fade behind, drips burning as they fall.",
     {"spread": _lever(1.0, 0.3, 2.0, "spread"), "flare": _lever(1.0, 0.0, 2.0, "flare"), "speed": _lever(0.7, 0.25, 2.0, "speed")},
     [{"id": "cells", "op": "cellular", "cells": "5.0 * $spread", "mode": "f1", "drift": 0.15},
      {"id": "cling", "op": "invert", "field": "@cells"},
      {"id": "patches", "op": "threshold", "field": "@cling", "level": 0.5, "soft": 0.25},
      {"id": "surf", "op": "mask_height", "field": "@patches", "lo": 0.0, "hi": 0.32, "feather": 0.1},
      {"id": "g", "op": "gain", "field": "@surf", "mult": 0.8, "power": 1.2},
      {"id": "flareid", "op": "cellular", "cells": "5.0 * $spread", "mode": "id", "drift": 0.0},
      {"id": "fl_t", "op": "threshold", "field": "@flareid", "level": 0.82},
      {"id": "fl_p", "op": "pulse", "field": "@fl_t", "depth": 1.0, "beats": 3, "shape": "flicker"},
      {"id": "fl_m", "op": "mul", "a": "@fl_p", "b": "@surf"},
      {"id": "fl_g", "op": "gain", "field": "@fl_m", "mult": "1.5 * $flare"},
      {"id": "lit", "op": "max", "a": "@g", "b": "@fl_g"},
      {"id": "p", "op": "posterize", "field": "@lit", "levels": 5},
      R("ramp", "phosphorus", 6),
      {"id": "img", "op": "paint", "field": "@p", "ramp": "@ramp", "cut": 0.3, "dither": 0.2, "gamma": 1.5},
      {"id": "smear", "op": "echo", "image": "@img", "copies": 2, "lag": 2, "dx": 0, "dy": 0, "fade": 0.8, "ramp": "@ramp"},
      {"id": "dr", "op": "emitter", "x": 0.5, "y": 0.72, "jitter": 0.45, "shape": "line", "count": 4, "life": "int(8 / $speed)", "angle": 90, "spread": 0, "speed": 0.0,
       "size": 1.1, "size_curve": "flat", "gravity": "0.2 * $speed", "trail": 3, "ground": 0.96, "bounce": 0},
      {"id": "dimg", "op": "paint", "field": "@dr", "ramp": "@ramp", "by": "age", "reverse_by": True, "cut": 0.4, "gamma": 0.6},
      {"id": "final", "op": "layers", "images": ["@smear", "@dimg"]}],
     size=(64, 48), frames=12, anchor=(32, 34))

_add("haze", "weird",
     "Heat haze: a shimmer that displaces what is behind it, rising and wavering. The sheet is a displacement map (R, G offsets; alpha the strength); the preview bends a stone wall.",
     {"strength": STRENGTH, "height": _lever(1.0, 0.3, 2.0, "height"), "speed": SPEED},
     [{"id": "n", "op": "perlin", "cells": 5.0, "tcells": 1, "octaves": 2},
      {"id": "fl0", "op": "flow", "cells": 4.0, "tcells": 1, "strength": "0.8 * $strength"},
      {"id": "fl", "op": "scroll_vectors", "vectors": "@fl0", "dy": "-1.0 * $speed"},
      {"id": "col", "op": "line", "x0": 0.5, "y0": 1.0, "x1": 0.5, "y1": "1.0 - 0.9 * $height", "width": 24.0, "taper": 0.5, "edge": 8.0},
      {"id": "fade", "op": "gradient", "direction": "up", "power": 0.8},
      {"id": "mask", "op": "mul", "a": "@col", "b": "@fade"},
      {"id": "final", "op": "displacement_map", "vectors": "@fl", "mask": "@mask", "range": 4.0, "levels": 6}],
     size=(48, 64), anchor=(24, 60), displacement=True)

_add("echo", "weird",
     "Echo: ghost copies trailing a moving thing and fading behind it. Here a pale light runs a figure of eight; on a sprite, the echo node does the same.",
     {"copies": _lever(3.0, 1.0, 6.0, "copies"), "lag": _lever(1.0, 1.0, 3.0, "lag"), "fade": _lever(0.7, 0.2, 1.0, "fade")},
     [{"id": "dot", "op": "circle", "x": 0.5, "y": 0.5, "radius": 0.06},
      {"id": "core", "op": "erode", "field": "@dot", "radius": 1},
      {"id": "cd", "op": "gain", "field": "@core", "mult": 0.5, "lift": 0.5, "inside": True},
      {"id": "dotv", "op": "max", "a": "@cd", "b": "@dot"},
      R("ramp", "frost", 5),
      {"id": "img", "op": "paint", "field": "@dotv", "ramp": "@ramp", "cut": 0.3},
      {"id": "run", "op": "path_scatter", "image": "@img", "points": [[0.2, 0.3], [0.5, 0.5], [0.8, 0.7], [0.8, 0.3], [0.5, 0.5], [0.2, 0.7], [0.2, 0.3]], "count": 1, "speed": 1.0},
      {"id": "final", "op": "echo", "image": "@run", "copies": "int($copies)", "lag": "int($lag)", "dx": 0, "dy": 0, "fade": "$fade", "ramp": "@ramp"}],
     size=(64, 64), frames=12, anchor=(32, 32))

_add("unlight", "weird",
     "Unlight, for the Silent Ones: a dark glow that eats the light round it; rings of shadow fall inward to a core that is blacker than black, a violet bruise at the rim.",
     {"size": SIZE, "hunger": _lever(1.0, 0.3, 2.0, "hunger"), "speed": _lever(0.6, 0.25, 2.0, "speed")},
     [{"id": "core", "op": "circle", "x": 0.5, "y": 0.5, "radius": "0.16 * $size", "falloff": 0.3},
      {"id": "fall", "op": "radial", "x": 0.5, "y": 0.5, "radius": "0.46 * $size"},
      {"id": "rings0", "op": "ring", "x": 0.5, "y": 0.5, "radius": "0.44 * $size", "width": 0.06, "grow": 1.0},
      {"id": "rings", "op": "reverse", "field": "@rings0"},
      {"id": "halo", "op": "invert", "field": "@fall"},
      {"id": "hg", "op": "gain", "field": "@halo", "mult": "0.7 * $hunger", "power": 1.5},
      {"id": "n", "op": "perlin", "cells": 4.0, "tcells": 1, "octaves": 2},
      {"id": "ng", "op": "gain", "field": "@n", "mult": 0.4, "lift": 0.6},
      {"id": "hn", "op": "mul", "a": "@hg", "b": "@ng"},
      {"id": "dark", "op": "max", "a": "@hn", "b": "@core"},
      {"id": "rimdim", "op": "gain", "field": "@rings", "mult": 0.5},
      {"id": "all", "op": "max", "a": "@dark", "b": "@rimdim"},
      {"id": "p", "op": "posterize", "field": "@all", "levels": 5},
      R("ramp", "unlight", 5, reverse=True),
      {"id": "img", "op": "paint", "field": "@p", "ramp": "@ramp", "cut": 0.2, "dither": 0.3}],
     size=(64, 64), anchor=(32, 32))

_add("miasma", "weird",
     "Miasma, breath gone wrong: a veil of violet vapour drifting low, mouths opening in it and closing, the whole recoiling from the light at the left.",
     {"size": SIZE, "mouths": _lever(1.0, 0.0, 2.5, "mouths"), "speed": _lever(0.6, 0.25, 2.0, "speed")},
     [{"id": "sm", "op": "smoke", "x": 0.55, "y": 0.7, "width": "0.3 * $size", "rise": "0.3 * $speed", "swirl": 1.8, "spread": 0.6, "decay": 0.07, "amount": 0.8},
      {"id": "lightd", "op": "radial", "x": 0.0, "y": 0.5, "radius": 0.7},
      {"id": "recoil", "op": "pulse", "field": "@lightd", "depth": 0.4, "beats": 1},
      {"id": "veil", "op": "mul", "a": "@sm", "b": "@recoil"},
      {"id": "g", "op": "gain", "field": "@veil", "mult": 1.6},
      {"id": "p", "op": "posterize", "field": "@g", "levels": 6},
      R("ramp", "miasma", 5),
      {"id": "img", "op": "paint", "field": "@p", "ramp": "@ramp", "cut": 0.3, "dither": 0.3, "gamma": 2.0},
      {"id": "thick", "op": "threshold", "field": "@g", "level": 0.6},
      {"id": "m", "op": "mouths", "mask": "@thick", "count": "int(5 * $mouths)", "size": 3.5},
      R("mramp", "mouth", 4),
      {"id": "mimg", "op": "paint", "field": "@m", "ramp": "@mramp", "by": "age", "cut": 0.5},
      {"id": "final", "op": "layers", "images": ["@img", "@mimg"]}],
     size=(80, 48), frames=12, anchor=(40, 44))

_add("eye_ooze", "weird",
     "Eye-ooze: a slow heaving mass with eyes opening in it, glancing about and closing again, never all at once.",
     {"size": SIZE, "eyes": _lever(1.0, 0.3, 2.5, "eyes"), "speed": _lever(0.5, 0.25, 2.0, "speed")},
     [{"id": "n", "op": "perlin", "cells": 3.0, "tcells": 1, "octaves": 3},
      {"id": "blob", "op": "circle", "x": 0.5, "y": 0.62, "radius": "0.36 * $size", "falloff": 0.5},
      {"id": "sq", "op": "mask_height", "field": "@blob", "lo": 0.0, "hi": 0.75, "feather": 0.2},
      {"id": "mass", "op": "mul", "a": "@sq", "b": "@n"},
      {"id": "g", "op": "gain", "field": "@mass", "mult": 2.2, "lift": 0.1},
      {"id": "heave", "op": "pulse", "field": "@g", "depth": 0.15, "beats": 1},
      {"id": "p", "op": "posterize", "field": "@heave", "levels": 4},
      R("ramp", "ooze", 5),
      {"id": "img", "op": "paint", "field": "@p", "ramp": "@ramp", "cut": 0.3},
      {"id": "solid", "op": "threshold", "field": "@heave", "level": 0.45},
      {"id": "e", "op": "eyes", "mask": "@solid", "count": "int(6 * $eyes)", "size": 3.0, "blink": 0.3},
      R("eramp", "#0a0a10,#5a1a1a,#f0ead8,#ffffff", 4),
      {"id": "eimg", "op": "paint", "field": "@e", "ramp": "@eramp", "by": "age", "reverse_by": True, "cut": 0.5},
      {"id": "final", "op": "layers", "images": ["@img", "@eimg"]}],
     size=(64, 56), frames=12, anchor=(32, 52))

_add("tally_marks", "weird",
     "Tally marks: scratches that appear one by one, four and a strike, each bleeding a little as it is cut.",
     {"marks": _lever(5.0, 1.0, 5.0, "marks"), "bleed": _lever(1.0, 0.0, 2.0, "bleed"), "pace": _lever(1.0, 0.5, 2.0, "pace")},
     [{"id": "m1", "op": "line", "x0": 0.2, "y0": 0.25, "x1": 0.22, "y1": 0.75, "width": 1.6},
      {"id": "m2", "op": "line", "x0": 0.34, "y0": 0.25, "x1": 0.36, "y1": 0.75, "width": 1.6},
      {"id": "m3", "op": "line", "x0": 0.48, "y0": 0.25, "x1": 0.5, "y1": 0.75, "width": 1.6},
      {"id": "m4", "op": "line", "x0": 0.62, "y0": 0.25, "x1": 0.64, "y1": 0.75, "width": 1.6},
      {"id": "m5", "op": "line", "x0": 0.12, "y0": 0.7, "x1": 0.74, "y1": 0.3, "width": 1.6},
      {"id": "w1", "op": "wipe", "field": "@m1", "start": 0, "length": 2, "direction": "down"},
      {"id": "w2", "op": "wipe", "field": "@m2", "start": "int(3 / $pace)", "length": 2, "direction": "down"},
      {"id": "w3", "op": "wipe", "field": "@m3", "start": "int(6 / $pace)", "length": 2, "direction": "down"},
      {"id": "w4", "op": "wipe", "field": "@m4", "start": "int(9 / $pace)", "length": 2, "direction": "down"},
      {"id": "w5", "op": "wipe", "field": "@m5", "start": "int(12 / $pace)", "length": 3, "direction": "right"},
      {"id": "k2", "op": "mul", "a": "@w2", "b": "min(1, max(0, $marks - 1))"},
      {"id": "k3", "op": "mul", "a": "@w3", "b": "min(1, max(0, $marks - 2))"},
      {"id": "k4", "op": "mul", "a": "@w4", "b": "min(1, max(0, $marks - 3))"},
      {"id": "k5", "op": "mul", "a": "@w5", "b": "min(1, max(0, $marks - 4))"},
      {"id": "a1", "op": "max", "a": "@w1", "b": "@k2"},
      {"id": "a2", "op": "max", "a": "@a1", "b": "@k3"},
      {"id": "a3", "op": "max", "a": "@a2", "b": "@k4"},
      {"id": "all", "op": "max", "a": "@a3", "b": "@k5"},
      {"id": "fresh", "op": "outline", "field": "@all", "width": 1, "level": 0.3, "inside": True},
      {"id": "b1", "op": "emitter", "x": 0.21, "y": 0.75, "count": "int(2 * $bleed)", "life": 4, "angle": 90, "spread": 15, "speed": 0.4, "size": 0.9, "size_curve": "flat", "gravity": 0.3, "trail": 1, "burst": True, "soft": 0.0},
      {"id": "b2", "op": "emitter", "x": 0.35, "y": 0.75, "count": "int(2 * $bleed)", "life": 4, "angle": 90, "spread": 15, "speed": 0.4, "size": 0.9, "size_curve": "flat", "gravity": 0.3, "trail": 1, "burst": True, "soft": 0.0, "seed": 2},
      {"id": "b3", "op": "emitter", "x": 0.49, "y": 0.75, "count": "int(2 * $bleed)", "life": 4, "angle": 90, "spread": 15, "speed": 0.4, "size": 0.9, "size_curve": "flat", "gravity": 0.3, "trail": 1, "burst": True, "soft": 0.0, "seed": 3},
      {"id": "b4", "op": "emitter", "x": 0.63, "y": 0.75, "count": "int(2 * $bleed)", "life": 4, "angle": 90, "spread": 15, "speed": 0.4, "size": 0.9, "size_curve": "flat", "gravity": 0.3, "trail": 1, "burst": True, "soft": 0.0, "seed": 4},
      {"id": "bv1", "op": "take", "bundle": "@b1"}, {"id": "bv2", "op": "take", "bundle": "@b2"}, {"id": "bv3", "op": "take", "bundle": "@b3"}, {"id": "bv4", "op": "take", "bundle": "@b4"},
      {"id": "t1", "op": "after", "field": "@bv1", "start": 0},
      {"id": "s2", "op": "time_shift", "field": "@bv2", "frames": "int(3 / $pace) + 1"}, {"id": "t2", "op": "after", "field": "@s2", "start": "int(3 / $pace) + 1"},
      {"id": "s3", "op": "time_shift", "field": "@bv3", "frames": "int(6 / $pace) + 1"}, {"id": "t3", "op": "after", "field": "@s3", "start": "int(6 / $pace) + 1"},
      {"id": "s4", "op": "time_shift", "field": "@bv4", "frames": "int(9 / $pace) + 1"}, {"id": "t4", "op": "after", "field": "@s4", "start": "int(9 / $pace) + 1"},
      {"id": "d1", "op": "max", "a": "@t1", "b": "@t2"}, {"id": "d2", "op": "max", "a": "@d1", "b": "@t3"}, {"id": "drops", "op": "max", "a": "@d2", "b": "@t4"},
      R("ramp", "#2a0a0a,#5c1010,#8c2020,#c84040", 4),
      {"id": "img", "op": "paint", "field": "@all", "ramp": "@ramp", "cut": 0.3, "gamma": 0.7},
      {"id": "dimg", "op": "paint", "field": "@drops", "ramp": "@ramp", "cut": 0.4},
      {"id": "final", "op": "layers", "images": ["@dimg", "@img"]}],
     size=(64, 48), frames=16, loop=False, anchor=(32, 44))

_add("bell_ring", "weird",
     "Bell-ring: rings spreading from a struck point that bend what they cross. The sheet is a displacement map (its alpha the ring); the preview bends a stone wall.",
     {"size": SIZE, "rings": _lever(2.0, 1.0, 4.0, "rings"), "speed": SPEED},
     [{"id": "r1", "op": "ring", "x": 0.5, "y": 0.5, "radius": "0.48 * $size", "width": 0.1, "grow": 1.0, "edge": 2.0},
      {"id": "r2", "op": "time_shift", "field": "@r1", "frames": "int(12 / $rings)"},
      {"id": "r3", "op": "time_shift", "field": "@r1", "frames": "int(24 / $rings)"},
      {"id": "a", "op": "max", "a": "@r1", "b": "@r2"},
      {"id": "all", "op": "max", "a": "@a", "b": "@r3"},
      {"id": "d", "op": "radial", "x": 0.5, "y": 0.5, "radius": 0.5},
      {"id": "fade", "op": "invert", "field": "@d"},
      {"id": "ringf", "op": "mul", "a": "@all", "b": "@fade"},
      {"id": "push", "op": "radial_vectors", "x": 0.5, "y": 0.5, "strength": 6.0, "radius": 0.8},
      {"id": "final", "op": "displacement_map", "vectors": "@push", "mask": "@ringf", "range": 6.0, "levels": 6}],
     size=(64, 64), frames=12, anchor=(32, 32), displacement=True)
