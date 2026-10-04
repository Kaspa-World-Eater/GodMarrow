"""Edit operations on a song: what the Forge's Music bench, `pixelforge music edit` and an assistant all apply.

Every operation is a dict with an `op` and its fields; `apply(song, op)` returns a new song (the input is never
changed). Steps are inside the pattern (bar 2's first step is 16). Operations that take a `steps` range use
[from, to) in steps; without it they act on the whole pattern (or the bar given as `bar`).

    set_note        pattern lane step pitch [vel length]      place or replace the note at (step, pitch); the scale lock snaps the pitch
    remove_note     pattern lane step [pitch]                 remove the note(s) at step (one pitch, or all)
    set_velocity    pattern lane step pitch vel
    set_length      pattern lane step pitch length
    clear           pattern [lane] [bar | steps]
    copy            pattern lane [bar | steps]                -> result['clipboard'] (notes with steps from 0)
    paste           pattern lane at clipboard                 at = the step the clipboard's 0 lands on
    transpose       pattern [lane] semitones [in_scale] [bar | steps]
    reverse         pattern [lane] [bar | steps]
    double          pattern [lane]                            twice as fast: steps and lengths halved, the content repeated
    halve           pattern [lane]                            twice as slow: steps and lengths doubled; the pattern grows
    humanise        pattern [lane] [amount] [seed]            small offsets and velocity changes
    quantise        pattern [lane] [grid]                     offsets dropped, steps snapped to the grid (1, 2, 4 steps)
    set_lane        lane [instrument volume tone pan]
    mute / solo     lane [on]
    set_tempo       tempo
    set_key         key ('C# minor') | root scale
    scale_lock      on
    set_fx          name value
    pattern_add     name [bars] [copy_of]
    pattern_remove  name
    pattern_rename  name new
    section_add     pattern [name repeat transpose at]
    section_remove  index
    section_move    index to
    section_set     index [pattern repeat transpose name]
    generate_bar    pattern bar [seed] [lanes]                the composer writes that bar in the song's genre
    generate_lane   pattern lane [seed]
    title           title
"""

from __future__ import annotations

import copy

import numpy as np

from . import song as S, theory

OPS = ["set_note", "remove_note", "set_velocity", "set_length", "clear", "copy", "paste", "transpose", "reverse", "double", "halve",
       "humanise", "quantise", "set_lane", "mute", "solo", "set_tempo", "set_key", "scale_lock", "set_fx", "pattern_add",
       "pattern_remove", "pattern_rename", "section_add", "section_remove", "section_move", "section_set", "generate_bar",
       "generate_lane", "title"]


class EditError(ValueError):
    pass


def apply(song: dict, op: dict) -> dict:
    """One operation; returns the edited song. Raises EditError in plain words when it cannot."""
    s = S.normalise(song)
    name = str(op.get("op", ""))
    fn = _OPS.get(name)
    if fn is None:
        raise EditError(f"unknown operation {name!r}; operations: {', '.join(OPS)}")
    out = fn(s, op)
    return S.normalise(out if out is not None else s)


def apply_all(song: dict, ops: list[dict]) -> dict:
    for op in ops:
        song = apply(song, op)
    return song


def apply_with_result(song: dict, op: dict) -> tuple[dict, dict]:
    """Like apply, with a result dict (copy puts the clipboard there)."""
    s = S.normalise(song)
    if op.get("op") == "copy":
        return s, {"clipboard": _copy(s, op)}
    return apply(s, op), {}


# ------------------------------------------------------------------ helpers
def _pattern(s: dict, op: dict) -> tuple[str, dict]:
    name = str(op.get("pattern", next(iter(s["patterns"]))))
    if name not in s["patterns"]:
        raise EditError(f"no pattern named {name!r}; patterns: {', '.join(s['patterns'])}")
    return name, s["patterns"][name]


def _lane(op: dict, required: bool = True) -> str | None:
    ln = op.get("lane")
    if ln is None:
        if required:
            raise EditError("which lane? one of " + ", ".join(S.LANES))
        return None
    if ln not in S.LANES:
        raise EditError(f"no lane named {ln!r}; lanes: {', '.join(S.LANES)}")
    return ln


def _lanes(op: dict) -> list[str]:
    ln = _lane(op, required=False)
    return [ln] if ln else list(S.LANES)


def _range(pat: dict, op: dict) -> tuple[int, int]:
    if "steps" in op and op["steps"] is not None:
        a, b = op["steps"]
        return int(a), int(b)
    if "bar" in op and op["bar"] is not None:
        b = int(op["bar"])
        return b * 16, (b + 1) * 16


    return 0, pat["bars"] * 16


def _snap(s: dict, lane: str, pitch: int, op: dict) -> int:
    if lane == "drums" or op.get("free") or not s.get("scale_lock", True):
        return int(pitch)
    return theory.snap(int(pitch), s["root"], s["scale"])


def _split(notes: list[dict], a: int, b: int) -> tuple[list[dict], list[dict]]:
    inside = [n for n in notes if a <= n["s"] < b]
    outside = [n for n in notes if not a <= n["s"] < b]
    return inside, outside


# ------------------------------------------------------------------ notes
def _set_note(s, op):
    name, pat = _pattern(s, op)
    ln = _lane(op)
    step = int(op.get("step", 0))
    if not 0 <= step < pat["bars"] * 16:
        raise EditError(f"step {step} is outside the pattern (0..{pat['bars'] * 16 - 1})")
    pitch = _snap(s, ln, int(op.get("pitch", 60)), op)
    old_pitch = int(op["old_pitch"]) if op.get("old_pitch") is not None else pitch
    notes = [n for n in pat["notes"][ln] if not (n["s"] == step and n["p"] in (pitch, old_pitch))]
    vel = float(op.get("vel", 0.8))
    length = float(op.get("length", 1.0))
    if ln != "drums" and length <= 0:
        raise EditError("a note's length must be above 0")
    notes.append(S.normalise_note({"s": step, "p": pitch, "v": vel, "l": length, "o": op.get("offset", 0.0)}, ln))
    pat["notes"][ln] = notes


def _remove_note(s, op):
    name, pat = _pattern(s, op)
    ln = _lane(op)
    step = int(op.get("step", 0))
    pitch = op.get("pitch")
    pat["notes"][ln] = [n for n in pat["notes"][ln] if not (n["s"] == step and (pitch is None or n["p"] == int(pitch)))]


def _set_velocity(s, op):
    name, pat = _pattern(s, op)
    ln = _lane(op)
    hit = False
    for n in pat["notes"][ln]:
        if n["s"] == int(op.get("step", 0)) and (op.get("pitch") is None or n["p"] == int(op["pitch"])):
            n["v"] = float(op.get("vel", n["v"]))
            hit = True
    if not hit:
        raise EditError("no note there")


def _set_length(s, op):
    name, pat = _pattern(s, op)
    ln = _lane(op)
    hit = False
    for n in pat["notes"][ln]:
        if n["s"] == int(op.get("step", 0)) and (op.get("pitch") is None or n["p"] == int(op["pitch"])):
            n["l"] = max(0.25, float(op.get("length", n["l"])))
            hit = True
    if not hit:
        raise EditError("no note there")


def _clear(s, op):
    name, pat = _pattern(s, op)
    a, b = _range(pat, op)
    for ln in _lanes(op):
        _, outside = _split(pat["notes"][ln], a, b)
        pat["notes"][ln] = outside


def _copy(s, op) -> list[dict]:
    name, pat = _pattern(s, op)
    ln = _lane(op)
    a, b = _range(pat, op)
    inside, _ = _split(pat["notes"][ln], a, b)
    return [{**n, "s": n["s"] - a} for n in inside]


def _paste(s, op):
    name, pat = _pattern(s, op)
    ln = _lane(op)
    at = int(op.get("at", 0))
    clip = op.get("clipboard") or []
    limit = pat["bars"] * 16
    new = [{**S.normalise_note(n, ln), "s": int(n["s"]) + at} for n in clip]
    new = [n for n in new if 0 <= n["s"] < limit]
    if new:
        lo, hi = min(n["s"] for n in new), max(n["s"] for n in new) + 1
        _, outside = _split(pat["notes"][ln], lo, hi)
        pat["notes"][ln] = outside + new


def _transpose(s, op):
    name, pat = _pattern(s, op)
    a, b = _range(pat, op)
    semis = int(op.get("semitones", 0))
    in_scale = bool(op.get("in_scale", False))
    for ln in _lanes(op):
        if ln == "drums":
            continue
        for n in pat["notes"][ln]:
            if a <= n["s"] < b:
                if in_scale:
                    n["p"] = theory.step_in_scale(n["p"], semis, s["root"], s["scale"])
                else:
                    n["p"] = int(np.clip(n["p"] + semis, 12, 120))
                    if s.get("scale_lock", True) and not op.get("free"):
                        n["p"] = theory.snap(n["p"], s["root"], s["scale"])


def _reverse(s, op):
    name, pat = _pattern(s, op)
    a, b = _range(pat, op)
    for ln in _lanes(op):
        inside, outside = _split(pat["notes"][ln], a, b)
        for n in inside:
            end = n["s"] + n["l"]
            n["s"] = int(round(a + (b - end)))
            n["s"] = max(a, min(b - 1, n["s"]))
        pat["notes"][ln] = outside + inside


def _double(s, op):
    name, pat = _pattern(s, op)
    total = pat["bars"] * 16
    for ln in _lanes(op):
        fast = []
        for n in pat["notes"][ln]:
            fast.append({**n, "s": n["s"] // 2, "l": max(0.25, n["l"] / 2)})
        half = total // 2
        pat["notes"][ln] = [n for n in fast if n["s"] < half] + [{**n, "s": n["s"] + half} for n in fast if n["s"] < half]


def _halve(s, op):
    name, pat = _pattern(s, op)
    lanes = _lanes(op)
    whole = len(lanes) == len(S.LANES)
    for ln in lanes:
        slow = [{**n, "s": n["s"] * 2, "l": n["l"] * 2} for n in pat["notes"][ln]]
        if not whole:
            slow = [n for n in slow if n["s"] < pat["bars"] * 16]
        pat["notes"][ln] = slow
    if whole:
        pat["bars"] *= 2
        if pat.get("chords"):
            pat["chords"] = [c for c in pat["chords"] for _ in (0, 1)]


def _humanise(s, op):
    name, pat = _pattern(s, op)
    amount = float(op.get("amount", 0.5))
    rng = np.random.default_rng(int(op.get("seed", 1)))
    a, b = _range(pat, op)
    for ln in _lanes(op):
        for n in pat["notes"][ln]:
            if a <= n["s"] < b:
                n["o"] = round(float(rng.uniform(-0.25, 0.25) * amount), 3)
                n["v"] = float(np.clip(n["v"] + rng.uniform(-0.12, 0.12) * amount, 0.1, 1.0))


def _quantise(s, op):
    name, pat = _pattern(s, op)
    grid = max(1, int(op.get("grid", 1)))
    a, b = _range(pat, op)
    for ln in _lanes(op):
        for n in pat["notes"][ln]:
            if a <= n["s"] < b:
                n.pop("o", None)
                n["s"] = int(round(n["s"] / grid) * grid)
                n["s"] = min(n["s"], pat["bars"] * 16 - 1)
                n["l"] = max(0.25, round(n["l"] * 4) / 4)


# ------------------------------------------------------------------ lanes, song, structure
def _set_lane(s, op):
    ln = _lane(op)
    lane = s["lanes"][ln]
    if "instrument" in op:
        from .synth import INSTRUMENTS, is_kit
        inst = str(op["instrument"])
        if inst not in INSTRUMENTS:
            raise EditError(f"no instrument named {inst!r}")
        if (ln == "drums") != is_kit(inst):
            raise EditError("drum kits go on the drums lane and nowhere else")
        lane["instrument"] = inst
    for k in ("volume", "tone"):
        if k in op:
            lane[k] = float(np.clip(float(op[k]), 0.0, 1.0))
    if "pan" in op:
        lane["pan"] = float(np.clip(float(op["pan"]), -1.0, 1.0))
    for k in ("mute", "solo"):
        if k in op:
            lane[k] = bool(op[k])


def _mute(s, op):
    ln = _lane(op)
    s["lanes"][ln]["mute"] = bool(op.get("on", not s["lanes"][ln]["mute"]))


def _solo(s, op):
    ln = _lane(op)
    s["lanes"][ln]["solo"] = bool(op.get("on", not s["lanes"][ln]["solo"]))


def _set_tempo(s, op):
    t = float(op.get("tempo", s["tempo"]))
    if not 20 <= t <= 300:
        raise EditError("tempo must be 20..300")
    s["tempo"] = t


def _set_key(s, op):
    if "key" in op:
        s["root"], s["scale"] = theory.parse_key(str(op["key"]))
    if "root" in op:
        s["root"] = theory.parse_note(str(op["root"]), 0) % 12 if isinstance(op["root"], str) else int(op["root"]) % 12
    if "scale" in op:
        s["scale"] = theory.scale_name(str(op["scale"]))
    if op.get("snap"):
        for pat in s["patterns"].values():
            for ln in S.LANES:
                if ln != "drums":
                    for n in pat["notes"][ln]:
                        n["p"] = theory.snap(n["p"], s["root"], s["scale"])


def _scale_lock(s, op):
    s["scale_lock"] = bool(op.get("on", not s.get("scale_lock", True)))


def _set_fx(s, op):
    k = str(op.get("name", ""))
    if k not in S.FX_DEFAULTS:
        raise EditError(f"no effect setting named {k!r}; settings: {', '.join(S.FX_DEFAULTS)}")
    v = op.get("value")
    s["fx"][k] = int(v) if k in ("rate", "bits", "voices") else float(v)
    if k == "rate" and s["fx"]["rate"] not in (22050, 32000, 44100, 48000):
        raise EditError("rate must be 22050, 32000, 44100 or 48000")


def _pattern_add(s, op):
    name = str(op.get("name", ""))
    if not name:
        name = next(f"P{i}" for i in range(1, 99) if f"P{i}" not in s["patterns"])
    if name in s["patterns"]:
        raise EditError(f"a pattern named {name!r} is already there")
    src = op.get("copy_of")
    if src:
        if src not in s["patterns"]:
            raise EditError(f"no pattern named {src!r} to copy")
        s["patterns"][name] = copy.deepcopy(s["patterns"][src])
    else:
        bars = int(max(1, op.get("bars", 4)))
        s["patterns"][name] = {"bars": bars, "notes": {ln: [] for ln in S.LANES}}
    if op.get("add_section"):
        s["sections"].append({"name": name, "pattern": name, "repeat": 1, "transpose": 0})


def _pattern_remove(s, op):
    name = str(op.get("name", ""))
    if name not in s["patterns"]:
        raise EditError(f"no pattern named {name!r}")
    if len(s["patterns"]) == 1:
        raise EditError("the last pattern stays")
    del s["patterns"][name]
    s["sections"] = [sec for sec in s["sections"] if sec["pattern"] != name] or [{"name": k, "pattern": k, "repeat": 1, "transpose": 0} for k in list(s["patterns"])[:1]]


def _pattern_rename(s, op):
    old, new = str(op.get("name", "")), str(op.get("new", ""))
    if old not in s["patterns"] or not new or new in s["patterns"]:
        raise EditError("rename needs an existing pattern and a free new name")
    s["patterns"] = {(new if k == old else k): v for k, v in s["patterns"].items()}
    for sec in s["sections"]:
        if sec["pattern"] == old:
            sec["pattern"] = new
            if sec["name"] == old:
                sec["name"] = new


def _section_add(s, op):
    pat = str(op.get("pattern", next(iter(s["patterns"]))))
    if pat not in s["patterns"]:
        raise EditError(f"no pattern named {pat!r}")
    sec = {"name": str(op.get("name", pat)), "pattern": pat, "repeat": int(max(1, op.get("repeat", 1))), "transpose": int(op.get("transpose", 0))}
    at = op.get("at")
    if at is None:
        s["sections"].append(sec)
    else:
        s["sections"].insert(int(at), sec)


def _section_remove(s, op):
    i = int(op.get("index", -1))
    if not 0 <= i < len(s["sections"]):
        raise EditError("no such section")
    if len(s["sections"]) == 1:
        raise EditError("the last section stays")
    s["sections"].pop(i)


def _section_move(s, op):
    i, to = int(op.get("index", 0)), int(op.get("to", 0))
    if not (0 <= i < len(s["sections"]) and 0 <= to < len(s["sections"])):
        raise EditError("no such section")
    sec = s["sections"].pop(i)
    s["sections"].insert(to, sec)


def _section_set(s, op):
    i = int(op.get("index", 0))
    if not 0 <= i < len(s["sections"]):
        raise EditError("no such section")
    sec = s["sections"][i]
    if "pattern" in op:
        if op["pattern"] not in s["patterns"]:
            raise EditError(f"no pattern named {op['pattern']!r}")
        sec["pattern"] = op["pattern"]
    if "repeat" in op:
        sec["repeat"] = int(max(1, min(32, op["repeat"])))
    if "transpose" in op:
        sec["transpose"] = int(max(-24, min(24, op["transpose"])))
    if "name" in op:
        sec["name"] = str(op["name"])


def _generate_bar(s, op):
    from .compose import generate_bar
    name, pat = _pattern(s, op)
    return generate_bar(s, name, int(op.get("bar", 0)), op.get("seed"), op.get("lanes"))


def _generate_lane(s, op):
    from .compose import generate_lane
    name, pat = _pattern(s, op)
    return generate_lane(s, name, _lane(op), op.get("seed"), op.get("bar"))


def _title(s, op):
    s["title"] = str(op.get("title", s["title"]))


_OPS = {"set_note": _set_note, "remove_note": _remove_note, "set_velocity": _set_velocity, "set_length": _set_length, "clear": _clear,
        "copy": lambda s, op: None, "paste": _paste, "transpose": _transpose, "reverse": _reverse, "double": _double, "halve": _halve,
        "humanise": _humanise, "quantise": _quantise, "set_lane": _set_lane, "mute": _mute, "solo": _solo, "set_tempo": _set_tempo,
        "set_key": _set_key, "scale_lock": _scale_lock, "set_fx": _set_fx, "pattern_add": _pattern_add, "pattern_remove": _pattern_remove,
        "pattern_rename": _pattern_rename, "section_add": _section_add, "section_remove": _section_remove, "section_move": _section_move,
        "section_set": _section_set, "generate_bar": _generate_bar, "generate_lane": _generate_lane, "title": _title}


def parse_op(text: str) -> dict:
    """An op from JSON or from words: 'transpose pattern=A semitones=2' -> {"op": "transpose", "pattern": "A", "semitones": 2}."""
    import json

    t = text.strip()
    if t.startswith("{"):
        d = json.loads(t)
        if "op" not in d:
            raise EditError("an operation needs an 'op'")
        return d
    parts = t.split()
    if not parts:
        raise EditError("an empty operation")
    d: dict = {"op": parts[0]}
    for kv in parts[1:]:
        if "=" not in kv:
            raise EditError(f"expected key=value, got {kv!r}")
        k, v = kv.split("=", 1)
        try:
            d[k] = json.loads(v)
        except json.JSONDecodeError:
            d[k] = v
    return d
