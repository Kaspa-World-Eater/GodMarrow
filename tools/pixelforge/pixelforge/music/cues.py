"""The game's cues from the song library: one music engine.

The game asks ``world/soundscape.gd`` for a cue by name (``a<act>_town``, ``a<act>_wild``, ``a<act>_deep``,
``boss<act>``, ``title``) and loads ``audio/music/<cue>.ogg`` (``.wav`` when there is no OGG). Those cues used to come
from the old generator (``score.py``, the port of the web score). They now come from the composer's library: every
cue names a library song (:data:`CUE_SONGS`, the game's dark set by mood), rendered with the song engine and written
under the cue's name, with the same ``music.json`` manifest the old road wrote. ``tools/make_music.py`` in the game and
``pixelforge music <cue> | all | act`` keep working unchanged.

A project may re-map cues without touching code: ``<out_dir>/cues.json`` (``{"a1_town": "town_moor_camp", ...}``) wins
over the table here.

The old generator stays reachable behind ``PIXELFORGE_OLD_ROADS=1`` (:mod:`pixelforge.old_roads`): with the flag
set, :func:`make_music` and :func:`cue_table` hand over to ``score.py`` as before.
"""
from __future__ import annotations

import json
from pathlib import Path

from ..old_roads import old_roads_on
from . import library as L, render as R, song as S, theory

# cue -> (library song, act, place): the game's dark set, by the place's mood (camp: rest; wilds: walking in the dark;
# depths: dread; boss: battle). Edit here or in <out_dir>/cues.json.
CUE_SONGS: dict[str, tuple[str, int, str]] = {
    "title": ("title_godmarrow", 0, "title"),
    "a1_town": ("town_moor_camp", 1, "town"),
    "a1_wild": ("explore_the_fen_road", 1, "wild"),
    "a1_deep": ("explore_under_the_barrows", 1, "deep"),
    "a2_town": ("acoustic_the_hanging_road", 2, "town"),
    "a2_wild": ("ambient_salt_and_bone", 2, "wild"),
    "a2_deep": ("dread_the_deep_vein", 2, "deep"),
    "a3_town": ("tavern_last_candle_inn", 3, "town"),
    "a3_wild": ("ambient_the_breathing_dark", 3, "wild"),
    "a3_deep": ("dungeon_candle_hall", 3, "deep"),
    "a4_town": ("town_an_vhar_hold", 4, "town"),
    "a4_wild": ("gothic_requiem_for_a_lantern", 4, "wild"),
    "a4_deep": ("gothic_black_cathedral", 4, "deep"),
    "a5_town": ("epic_the_last_cairn", 5, "town"),
    "a5_wild": ("rock_the_bone_stair", 5, "wild"),
    "a5_deep": ("dungeon_sunken_stair", 5, "deep"),
    "boss1": ("boss_the_ossuarch", 1, "boss"),
    "boss2": ("battle_iron_teeth", 2, "boss"),
    "boss3": ("battle_the_charge", 3, "boss"),
    "boss4": ("gothic_the_crest_procession", 4, "boss"),
    "boss5": ("boss_hemomancer", 5, "boss"),
}
CUES = tuple(CUE_SONGS)


def song_for(cue: str, out_dir: str | Path | None = None) -> str:
    """The library song a cue plays: the project's ``cues.json`` beside the output when it names one, else the table."""
    if out_dir is not None:
        p = Path(out_dir) / "cues.json"
        if p.exists():
            try:
                over = json.loads(p.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                over = {}
            if isinstance(over, dict) and isinstance(over.get(cue), str):
                return over[cue]
    if cue not in CUE_SONGS:
        raise ValueError(f"unknown cue {cue!r}; cues: {', '.join(CUES)}")
    return CUE_SONGS[cue][0]


def cue_keys(key: str, act: int | None = None) -> list[str]:
    """``key``: a cue, ``all``, or ``act`` with ``act`` (that act's town, wild, deep and boss)."""
    if key == "all":
        return list(CUES)
    if key == "act":
        a = act or 1
        return [k for k in CUES if k.startswith(f"a{a}_") or k == f"boss{a}"]
    if key not in CUE_SONGS:
        raise ValueError(f"unknown cue {key!r}; cues: {', '.join(CUES)}")
    return [key]


def make_music(key: str, out_dir: str | Path, *, seconds: float | None = None, seed: int | None = None, overrides: dict | None = None,
               act: int | None = None, sheet=None, fmt: str = "wav", preview: bool = True, log=None) -> dict:
    """Render the cue(s) from the song library into ``out_dir/<cue>.wav|.ogg`` (+ ``.png`` preview) and update
    ``music.json``. The signature is the old generator's so every caller keeps working; a song has its own length (it
    loops), so ``seconds`` is reported, not imposed, and the old knobs (``overrides``, ``sheet``, ``seed``) are noted as
    not applying here. ``key == "forge"`` renders the Forge's own pieces as before. With ``PIXELFORGE_OLD_ROADS=1`` the
    old generator renders instead."""
    from . import score
    if old_roads_on() or key == "forge":
        return score.make_music(key, out_dir, seconds=seconds or 120.0, seed=seed, overrides=overrides, act=act, sheet=sheet, fmt=fmt, preview=preview, log=log)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    keys = cue_keys(key, act)
    files, notes, entries, songs = [], [], {}, {}
    if overrides or sheet or seed is not None:
        notes.append("the old knobs (--set, --sheet, --seed) belong to the retired generator; edit the library song instead (pixelforge music load / edit)")
    manifest_path = out_dir / "music.json"
    manifest = {"cues": {}}
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            manifest = {"cues": {}}
    manifest.setdefault("cues", {})
    rate = None
    for k in keys:
        name = song_for(k, out_dir)
        song = L.load_piece(name)
        if log:
            log(f"rendering {k} from the library song {name} ({S.summary(song)['seconds']:.0f} s)")
        r = R.export(song, out_dir, k, fmt=fmt, loop=True, png=preview)
        # the song JSON beside the audio is the engine's habit; the game's folder keeps only the audio and the manifest
        try:
            Path(r["song"]).unlink()
        except (OSError, KeyError, TypeError):
            pass
        files += [f for f in r["files"] if f not in files]
        notes += [n for n in r.get("notes", []) if n not in notes]
        rate = r["rate"]
        _, a, place = CUE_SONGS.get(k, (name, 0, ""))
        entry = {"file": Path(r["files"][0]).name, "seconds": r["seconds"], "loop": True, "song": name, "act": a, "place": place,
                 "title": song.get("title", name), "seed": song.get("seed", 1)}
        if preview and r.get("png"):
            entry["png"] = r["png"]
        entries[k] = entry
        songs[k] = name
    manifest["cues"].update(entries)
    if rate:
        manifest["rate"] = rate
    manifest["engine"] = "song library"
    manifest_path.write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    out = {"ok": True, "files": files, "cues": keys, "songs": songs, "json": str(manifest_path), "dir": str(out_dir), "engine": "song library"}
    if preview and entries[keys[-1]].get("png"):
        out["png"] = entries[keys[-1]]["png"]
    if seconds is not None:
        out["seconds_asked"] = seconds
    if notes:
        out["notes"] = notes
    return out


def cue_table(out_dir: str | Path | None = None) -> list[dict]:
    """Every cue with the library song it plays, JSON-safe, in the shape the old table had (``key act place bpm steps
    root sc seed description``) plus ``song`` and ``title``. With ``PIXELFORGE_OLD_ROADS=1`` the old table."""
    from . import score
    if old_roads_on():
        return score.cue_table()
    index = {r["name"]: r for r in L.list_pieces()}
    rows = []
    for k in CUES:
        name = song_for(k, out_dir)
        _, act, place = CUE_SONGS[k]
        row = index.get(name, {})
        root, scale = (theory.parse_key(row["key"]) if row.get("key") else (0, "minor"))
        rows.append({"key": k, "act": act, "place": place, "song": name, "title": row.get("title", name), "bpm": float(row.get("tempo", 0)),
                     "steps": 16, "root": int(root), "sc": str(scale)[:5], "seed": int(row.get("seed", 0)), "description": row.get("words", "")})
    return rows
