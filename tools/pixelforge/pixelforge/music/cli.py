"""`pixelforge music ...`: the verbs the Forge app and an assistant both drive. Every verb has `--json`.

    music new <song.json> [--title T] [--tempo 110] [--key "A minor"] [--bars 4]
    music compose [-o <song.json>] --genre G [--mood M] [--key K] [--tempo T] [--bars 32] [--seed N] [--render]
    music render <song.json> [-o <folder>] [--name N] [--format wav|ogg|both] [--no-loop] [--lanes lead,bass]
    music play-bar <song.json> [--section 0] [--bar 0] [--pattern A] [--bars 1] [-o <folder>] [--lanes ...] [--play]
    music export <song.json> -o <game>/audio/music [--name N] [--format ogg]
    music edit <song.json> --op '<json or words>' [--op ...] [-o <out.json>] [--render-bar]
    music list [--genre G]                        the library, the genres, the instruments, the moods, the scales
    music load <library name> -o <song.json>      a copy of a library piece to edit
    music info <song.json>                        the song's facts
    music measure <audio> [<audio> ...]           loudness, spectral balance, key, tempo; the first is the reference
    music build-library [-o <folder>]             rewrite the library files from their recipes
    music blips -o <folder> [--format ogg]        the Forge app's interface sounds
    music <cue> | all | act | sheet ...           the game's own score (the older generator)
"""

from __future__ import annotations

import json
import time
from pathlib import Path

from . import compose as C, edit as E, library as L, measure as M, render as R, song as S, synth, theory
from .song import SongError

VERBS = ["new", "compose", "render", "play-bar", "export", "edit", "list", "load", "info", "measure", "build-library", "blips"]


def _song_path(a) -> Path:
    if not getattr(a, "rest", None):
        raise SongError("which song file? give its path")
    return Path(a.rest[0])


def _load(a) -> dict:
    return S.load(_song_path(a))


def _result_song(song: dict, path: str | Path | None = None) -> dict:
    d = {"ok": True, **S.summary(song)}
    if path:
        d["song"] = str(path)
    return d


def run(a) -> dict:
    """Dispatch on `a.cue` (the verb). Returns the JSON-safe result (the caller prints it)."""
    verb = a.cue
    if verb == "new":
        p = _song_path(a)
        s = S.new_song(a.title or p.stem.replace(".song", ""), tempo=a.tempo or 110.0, key=a.key or "A minor", bars=a.bars or 4)
        S.save(s, p)
        return _result_song(s, p)
    if verb == "compose":
        s = C.compose(a.genre or "dungeon_synth", a.mood or "", a.key, a.tempo, a.bars or 32, a.seed if a.seed is not None else 1, a.title)
        out = Path(a.out) if a.out and a.out.endswith(".json") else None
        r = _result_song(s)
        if out:
            r["song"] = S.save(s, out)
        elif a.out and a.out != "art/music":
            r["song"] = S.save(s, Path(a.out) / f"{R.slug(s['title'])}.song.json")
        if a.render:
            folder = Path(r["song"]).parent if "song" in r else Path(a.out or "art/music")
            r["render"] = R.export(s, folder, R.slug(s["title"]), fmt=a.format, png=not a.no_preview)
        if not a.json and "song" not in r:
            r["song_json"] = s
        return r
    if verb == "render" or verb == "export":
        p = _song_path(a)
        s = S.load(p)
        name = a.name or p.name.replace(".song.json", "").replace(".json", "")
        folder = Path(a.out) if a.out and a.out != "art/music" else p.parent
        fmt = a.format if verb == "render" else (a.format if a.format != "wav" else "ogg")
        if a.lanes:
            for ln in S.LANES:
                s["lanes"][ln]["mute"] = ln not in a.lanes.split(",")
                s["lanes"][ln]["solo"] = False
        r = R.export(s, folder, name, fmt=fmt, loop=not a.no_loop, png=not a.no_preview)
        if verb == "export":
            r["kept"] = r["files"][0]
        if a.play and r["files"]:
            from .score import play
            r["played"] = play(next((f for f in r["files"] if f.endswith(".wav")), r["files"][0]))
        return r
    if verb == "play-bar":
        p = _song_path(a)
        s = S.load(p)
        lanes = a.lanes.split(",") if a.lanes else None
        t0 = time.perf_counter()
        if a.pattern:
            if a.pattern not in s["patterns"]:
                raise SongError(f"no pattern named {a.pattern!r}; patterns: {', '.join(s['patterns'])}")
            if a.bar is not None:
                plan = [R.pattern_plan(s, a.pattern)[min(a.bar, s["patterns"][a.pattern]["bars"] - 1)]]
                x = R.render_plan(s, plan, loop=True, lanes=lanes)
                what = f"{a.pattern} bar {a.bar}"
            else:
                x = R.render_pattern(s, a.pattern, loop=True, lanes=lanes)
                what = f"pattern {a.pattern}"
        elif a.bars and a.bars > 1:
            start = R.section_bar_index(s, a.section or 0, a.bar or 0)
            x = R.render_bars(s, start, a.bars, loop=True, lanes=lanes)
            what = f"bars {start}..{start + a.bars - 1}"
        elif a.bar is None and a.section is not None:
            x = R.render_section(s, a.section, loop=True, lanes=lanes)
            what = f"section {a.section}"
        else:
            x = R.render_bar(s, a.section or 0, a.bar or 0, loop=True, lanes=lanes)
            what = f"section {a.section or 0} bar {a.bar or 0}"
        dt = time.perf_counter() - t0
        folder = Path(a.out) if a.out and a.out != "art/music" else p.parent
        folder.mkdir(parents=True, exist_ok=True)
        wav = folder / (a.name or "bar.wav")
        if not str(wav).endswith(".wav"):
            wav = wav.with_suffix(".wav")
        R.write_wav(x, wav, s["fx"]["rate"])
        r = {"ok": True, "files": [str(wav)], "what": what, "seconds": round(len(x) / s["fx"]["rate"], 3), "render_seconds": round(dt, 3),
             "bar_seconds": round(S.bar_seconds(s), 3), "faster_than_real_time": round((len(x) / s["fx"]["rate"]) / max(dt, 1e-6), 1)}
        if a.play:
            from .score import play
            r["played"] = play(wav)
        return r
    if verb == "edit":
        p = _song_path(a)
        s = S.load(p)
        ops = [E.parse_op(o) for o in (a.op or [])]
        if a.ops_file:
            ops += json.loads(Path(a.ops_file).read_text(encoding="utf-8"))
        if not ops:
            raise SongError("give at least one --op (see `pixelforge music edit --help`)")
        extra = {}
        for op in ops:
            s, res = E.apply_with_result(s, op)
            extra.update(res)
        out = Path(a.out) if a.out and a.out.endswith(".json") else p
        S.save(s, out)
        r = _result_song(s, out)
        r["applied"] = [op["op"] for op in ops]
        r.update(extra)
        if a.render_bar:
            folder = out.parent
            pat = next((op.get("pattern") for op in ops if op.get("pattern")), None)
            x = R.render_pattern(s, pat, loop=True) if pat else R.render_bar(s, 0, 0)
            r["files"] = [R.write_wav(x, folder / "bar.wav", s["fx"]["rate"])]
        return r
    if verb == "list":
        pieces = L.list_pieces(a.genre)
        return {"ok": True, "pieces": pieces, "genres": C.genre_table(), "moods": list(C.MOODS), "instruments": synth.instrument_table(),
                "scales": list(theory.SCALES), "scale_intervals": theory.SCALES, "drums": theory.DRUMS, "lanes": S.LANES, "fx": S.FX_FIELDS, "ops": E.OPS, "count": len(pieces)}
    if verb == "load":
        name = a.rest[0] if a.rest else ""
        s = L.load_piece(name)
        out = Path(a.out) if a.out and a.out.endswith(".json") else Path(a.out or ".") / f"{name}.song.json"
        S.save(s, out)
        return _result_song(s, out)
    if verb == "info":
        p = _song_path(a)
        s = S.load(p)
        r = _result_song(s, p)
        r["fx"] = s["fx"]
        r["lanes_detail"] = s["lanes"]
        r["timeline"] = [f"{b['name']}:{b['pattern_bar']}" for b in R.timeline(s)]
        return r
    if verb == "measure":
        files = list(a.rest or [])
        if not files:
            raise SongError("which audio files?")
        return M.compare(files[0], *files[1:]) if len(files) > 1 else {"ok": True, **M.measure(files[0])}
    if verb == "build-library":
        return L.build_library(a.out if a.out and a.out != "art/music" else None)
    if verb == "blips":
        from .blips import write_blips
        return write_blips(a.out, fmt=a.format)
    raise SongError(f"unknown music verb {verb!r}")


def print_plain(r: dict, verb: str) -> None:
    """The non-JSON output: short tables for list, one line for the rest."""
    if verb == "list":
        print(f"{'piece':30s} {'genre':18s} {'key':16s} {'bpm':>4s} {'bars':>4s}  {'secs':>5s}  what it is")
        for p in r["pieces"]:
            print(f"{p['name']:30s} {p['genre']:18s} {p['key']:16s} {p['tempo']:4.0f} {p['bars']:4d}  {p['seconds']:5.0f}  {p.get('words', '')}")
        print("\ngenres: " + ", ".join(g["name"] for g in r["genres"]))
        print("moods: " + ", ".join(r["moods"]))
        print("instruments: " + ", ".join(i["name"] for i in r["instruments"]))
        return
    if verb == "measure" and "pieces" in r:
        ref = r["reference"]
        print(f"reference {Path(ref['file']).name}: {ref['seconds']} s, rms {ref['rms']}, centroid {ref['centroid_hz']} Hz, key {ref['key']}, tempo ~{ref['tempo_bpm']}")
        for p in r["pieces"]:
            print(f"{Path(p['file']).name}: {p['seconds']} s, rms {p['rms']}, centroid {p['centroid_hz']} Hz, key {p['key']}, tempo ~{p['tempo_bpm']}  (centroid x{p['vs_reference']['centroid_ratio']}, rms x{p['vs_reference']['rms_ratio']})")
        return
    for k, v in r.items():
        if k == "song_json":
            continue
        if isinstance(v, (dict, list)):
            print(f"{k}: {json.dumps(v, default=str)[:400]}")
        else:
            print(f"{k}: {v}")
