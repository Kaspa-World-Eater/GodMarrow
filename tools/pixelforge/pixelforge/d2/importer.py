"""Their sprites into our frames: a token (``NE`` the Necromancer, ``SK`` a skeleton, any folder under
``data/global/chars`` or ``monsters`` or ``objects``) read through its COFs, each layer's DCC decoded, the layers
composed in the COF's draw order, coloured with the act palette, and written as ``frames/<clip>_<DIR>/frame_NNN.png``
with ``animations.json`` and ``manifest.json``: the layout every PixelForge step and the Forge's Characters bench read.
The frames go to a folder outside the repository (they are Blizzard's pixels)."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from . import animdata, cof as COF, dc6, dcc
from .paths import D2Error, guard_destination
from .source import KIND_DIRS, D2Source

# their animation modes -> our clip names
MODE_TO_CLIP = {"NU": "idle", "WL": "walk", "RN": "run", "A1": "attack", "A2": "attack2", "SC": "cast", "GH": "hit", "DT": "death", "DD": "dead",
                "TN": "town_idle", "TW": "town_walk", "BL": "block", "TH": "throw", "KK": "kick", "S1": "skill1", "S2": "skill2", "S3": "skill3",
                "S4": "skill4", "SQ": "sequence", "KB": "knockback", "OP": "operating", "ON": "opened", "S5": "skill5"}
CLIP_TO_MODE = {v: k for k, v in MODE_TO_CLIP.items()}
OUR_DIRECTIONS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]


def parse_cof_name(name: str, token: str) -> tuple[str, str]:
    stem = Path(name).stem.upper()
    if not stem.startswith(token.upper()) or len(stem) < len(token) + 2:
        raise D2Error(f"{name} is not a COF of token {token}")
    rest = stem[len(token):]
    return rest[:2], rest[2:]


def _dcc_for(source: D2Source, kind: str, token: str, comp: str, mode: str, wclass: str, variant: str) -> tuple[Path | None, str]:
    base = f"data/global/{KIND_DIRS[kind]}/{token}/{comp}"
    want = f"{token}{comp}{variant}{mode}{wclass}"
    for ext in (".dcc", ".dc6"):
        p = source.find(f"{base}/{want}{ext}")
        if p is not None:
            return p, variant
    folder = source.find(base)
    if folder is not None and folder.is_dir():
        head, tail = f"{token}{comp}".upper(), f"{mode}{wclass}".upper()
        for e in sorted(folder.iterdir()):
            n = e.name.upper()
            if e.suffix.lower() in (".dcc", ".dc6") and n.startswith(head) and n[:-4].endswith(tail) and len(n) == len(want) + 4:
                return e, n[len(head):len(head) + 3]
    return None, variant


def _decode_any(path: Path) -> dcc.DCC:
    data = path.read_bytes()
    if data[:1] == b"\x74":
        return dcc.decode(data)
    return dc6.decode(data)


def import_token(token: str, out_dir: str | Path, source: D2Source | None = None, *, kind: str | None = None, act: int = 1, weapon_class: str | None = None,
                 variant: str = "LIT", modes: list[str] | None = None, log=None) -> dict:
    """Read every mode of ``token`` and write our frames into ``out_dir`` (made; must be outside the repository)."""
    token = token.upper()
    out_dir = guard_destination(Path(out_dir), "frames made from the game's sprites")
    source = source or D2Source()
    kind = kind or source.token_kind(token)
    if kind is None:
        extracted = _try_extract_token(source, token)
        kind = source.token_kind(token)
        if kind is None:
            raise D2Error(f"no token {token} in the reference folder {source.reference} (looked under chars, monsters and objects){extracted}. "
                          "`pixelforge d2 list` shows what is there.")
    cofs = source.cofs(token, kind)
    if not cofs:
        raise D2Error(f"token {token} has no COF files under data/global/{KIND_DIRS[kind]}/{token}/COF in {source.reference}.")
    palette = source.palette(act)
    try:
        records, anim_tool = source.animdata()
    except D2Error:
        records, anim_tool = [], "none"
    # one COF per mode: the weapon class asked for, else HTH, else the first
    by_mode: dict[str, Path] = {}
    for p in cofs:
        mode, wc = parse_cof_name(p.name, token)
        if modes and mode not in modes:
            continue
        cur = by_mode.get(mode)
        rank = (wc == (weapon_class or "").upper(), wc == "HTH", -len(wc))
        if cur is None or rank > _rank(cur, token, weapon_class):
            by_mode[mode] = p
    decoded = {}       # (clip) -> {"frames": {dir_name: [rgba...]}, meta}
    boxes = []
    report_clips = {}
    for mode, cof_path in sorted(by_mode.items()):
        c = COF.decode(cof_path.read_bytes())
        _, wc = parse_cof_name(cof_path.name, token)
        clip = MODE_TO_CLIP.get(mode, mode.lower())
        layers: dict[str, dcc.DCC] = {}
        used = {}
        for layer in c.layers:
            p, var = _dcc_for(source, kind, token, layer.composite, mode, wc, variant)
            if p is None:
                if log:
                    log(f"{token} {mode}: no {layer.composite} sprite ({variant}); skipped")
                continue
            layers[layer.composite] = _decode_any(p)
            used[layer.composite] = {"file": str(p), "variant": var, "directions": len(layers[layer.composite].directions)}
        if not layers:
            continue
        ndirs = max(len(d.directions) for d in layers.values())
        names = COF.direction_names(ndirs)
        rec = animdata.find(records, Path(cof_path).stem)
        speed = rec["speed"] if rec else (c.speed or 256)
        fps = animdata.fps_for_speed(speed)
        frames_by_dir: dict[str, list] = {}
        for di in range(ndirs):
            out_frames = []
            for fi in range(c.frames_per_direction):
                parts = []
                for comp_idx in (c.order[di][fi] if di < len(c.order) and fi < len(c.order[di]) else [COF.COMPOSITES.index(l.composite) for l in c.layers]):
                    comp = COF.COMPOSITES[comp_idx] if comp_idx < len(COF.COMPOSITES) else None
                    d = layers.get(comp)
                    if d is None:
                        continue
                    dd = d.directions[di if di < len(d.directions) else 0]
                    if fi < len(dd):
                        parts.append(dd[fi])
                out_frames.append(_compose(parts))
            frames_by_dir[names[di] if di < len(names) else f"d{di}"] = out_frames
            for f in out_frames:
                if f.width and f.height:
                    boxes.append((f.left, f.top, f.left + f.width, f.top + f.height))
        decoded[clip] = frames_by_dir
        report_clips[clip] = {"mode": mode, "cof": str(cof_path), "weapon_class": wc, "frames": c.frames_per_direction, "directions": ndirs,
                              "speed": int(speed), "fps": round(fps, 3), "triggers": {i: t for i, t in enumerate(c.triggers) if t},
                              "layers": used, "cof_box": list(c.box), "shadow_layers": [l.composite for l in c.layers if l.shadow]}
    if not decoded:
        raise D2Error(f"token {token}: COFs were found but no sprite files for them (variant {variant}); try --variant with another armour class, or extract the token's folders.")
    # one square canvas for the set, the feet point on the floor line and the axis down the middle
    min_l = min(b[0] for b in boxes); min_t = min(b[1] for b in boxes); max_r = max(b[2] for b in boxes); max_b = max(b[3] for b in boxes)
    half = max(-min_l, max_r) + 1
    height = max_b - min_t + 1
    side = max(2 * half, height)
    axis_x = side // 2
    ground_y = side - (max_b - 0) - 1 if max_b >= 0 else side - 1          # row of the origin (y = 0) on the canvas
    ground_y = side - 1 - max(max_b, 0)
    out_dir.mkdir(parents=True, exist_ok=True)
    counts, clip_fps, palette_used = {}, {}, set()
    for clip, by_dir in decoded.items():
        clip_fps[clip] = report_clips[clip]["fps"]
        for dname, frames in by_dir.items():
            folder = out_dir / f"{clip}_{dname}"
            folder.mkdir(exist_ok=True)
            for old in folder.glob("frame_*.png"):
                old.unlink()
            for i, f in enumerate(frames):
                canvas = np.zeros((side, side), np.uint8)
                if f.width and f.height:
                    x0, y0 = axis_x + f.left, ground_y + f.top
                    canvas[max(y0, 0):y0 + f.height, max(x0, 0):x0 + f.width] = f.pixels[max(-y0, 0):, max(-x0, 0):][:side - max(y0, 0), :side - max(x0, 0)]
                    palette_used.update(int(v) for v in np.unique(f.pixels) if v)
                Image.fromarray(palette.to_rgba(canvas), "RGBA").save(folder / f"frame_{i:03d}.png")
            counts[f"{clip}_{dname}"] = len(frames)
    anims = {"fps": 25.0, "clip_fps": clip_fps, "frames": counts, "source": "d2", "token": token, "kind": kind, "palette": palette.name, "act": act,
             "scale": 1.0, "style": None, "elevation": 0.0, "ground_y": float(ground_y), "axis_x": float(axis_x), "canvas_width": side,
             "directions": OUR_DIRECTIONS, "note": "frames made from Diablo 2's own sprites: reference material, outside the repository"}
    (out_dir / "animations.json").write_text(json.dumps(anims, indent=1))
    manifest = {"size": side, "ppu": 1.0, "elevation": 0.0, "view_elevation": 0.0, "z_mid": ground_y - side / 2, "source": "d2", "style": None,
                "figure_height": None, "render_scale": 1.0}
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1))
    report = {"ok": True, "token": token, "kind": kind, "frames_dir": str(out_dir), "clips": report_clips, "canvas": side, "ground_y": ground_y, "axis_x": axis_x,
              "palette": palette.name, "palette_indices_used": len(palette_used), "animdata_tool": anim_tool, "frame_count": sum(counts.values()),
              "extracted": list(source.extracted)}
    (out_dir / "d2_import.json").write_text(json.dumps(report, indent=1))
    return report


def _rank(path: Path, token: str, weapon_class: str | None):
    _, wc = parse_cof_name(path.name, token)
    return (wc == (weapon_class or "").upper(), wc == "HTH", -len(wc))


def _try_extract_token(source: D2Source, token: str) -> str:
    if source.install is None or source.install_kind != "classic" or not source.extract_allowed:
        return ""
    from .extract import extract, extractor
    if extractor(source.reference, source.project) is None:
        return ""
    r = extract(source.install, [f"data/global/{d}/{token}/*" for d in KIND_DIRS.values()], source.reference, source.project, source.log)
    return f"; the extractor was tried ({r['tool']['tool']})" if r.get("tool") else ""


def _compose(parts: list[dcc.Frame]) -> dcc.Frame:
    parts = [p for p in parts if p.width and p.height]
    if not parts:
        return dcc.Frame(np.zeros((0, 0), np.uint8), 0, 0)
    l = min(p.left for p in parts); t = min(p.top for p in parts)
    r = max(p.left + p.width for p in parts); b = max(p.top + p.height for p in parts)
    canvas = np.zeros((b - t, r - l), np.uint8)
    for p in parts:
        y0, x0 = p.top - t, p.left - l
        sl = canvas[y0:y0 + p.height, x0:x0 + p.width]
        m = p.pixels != 0
        sl[m] = p.pixels[m]
    return dcc.Frame(canvas, l, t)
