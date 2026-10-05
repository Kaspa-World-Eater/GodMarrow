"""Export a Forge character into Godmarrow's own sprite-set format.

The game (``core/sprite_set.gd``) reads ``art/sprites/<kind>.json``::

    {"sheets": ["<kind>.png", ...],
     "meta": {"kind", "category", "anims": {anim: {"frames": n, "views": [...]}}, "fps": {anim: f}, ...},
     "idx": {"<anim>/<view>/<i>": [sheet, x, y, w, h, dx, dy]}}

``(dx, dy)`` is the offset from the entity's ground point (the foot anchor) to
the frame's top-left.  Frames face screen-right; the game mirrors them for the
left octants.  Views: ``down front side back up`` (the five the game draws
today) plus the three real left-facing views ``front_l side_l back_l`` that an
8-view ``AnimSprite`` can use instead of mirroring.

Direction mapping (Forge direction = where the character faces on screen):
  S -> down, SE -> front, E -> side, NE -> back, N -> up,
  SW -> front_l, W -> side_l, NW -> back_l.

Normal and depth passes, when rendered, go to ``<kind>_normal.png/.json`` and
``<kind>_depth.png/.json`` with identical ``idx`` so a shader can sample them
with the same rects.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

DIR_TO_VIEW = {"S": "down", "SE": "front", "E": "side", "NE": "back", "N": "up", "SW": "front_l", "W": "side_l", "NW": "back_l"}
VIEW_ORDER = ["down", "front", "side", "back", "up", "front_l", "side_l", "back_l"]
# the game's fixed animation set for heroes: Forge clip -> (game anim, the most frames kept). Every rendered frame is
# kept up to that cap, and the clip keeps its real length, so a walk rendered with 24 frames plays at about 14 frames
# a second instead of the old 8 frames at 5 (which looked choppy); render with --per-clip 24 for smooth motion.
HERO_ANIMS = {
    "idle": ("idle", 24),
    "walk": ("walk", 24),
    "attack": ("atk", 24),
    "punch": ("atk2", 24),
    "attack2": ("atk2", 24),
    "cast": ("cast", 24),
    "hit": ("hit", 12),
    "death": ("death", 24),
    "roll": ("dodge", 24),
    "dodge": ("dodge", 24),
    "run": ("run", 24),
}
MAX_SHEET = 4096   # a sheet never grows past this on either side; more frames go on further sheets
# the figure height (sprite px) the game draws each category at: a hero is the godmarrow preset's 195 px. A set
# rendered at another look (gothic_hd's 120) stands in the game a head too short, which is what export_game warns about.
GAME_FIGURE_HEIGHTS = {"hero": 195}
HEIGHT_TOLERANCE = 0.10


def write_skins_entry(out_dir: str | Path, kind: str, skin_for: str | None = None, *, always: bool = False) -> dict | None:
    """Add or update the game's ``art/sprites/skins.json`` entry that makes the hero loader use this set: ``{"<class>":
    "<kind>"}`` (``skin_for`` is the class the set stands in for; the kind itself when not given). Written when the
    out folder already has a ``skins.json`` or is the game's ``sprites`` folder (or ``always``); a plain export
    folder gets none. Returns ``{"file", "key", "kind", "changed"}`` or None when nothing was written."""
    out_dir = Path(out_dir)
    sk = out_dir / "skins.json"
    if not (always or sk.exists() or out_dir.name == "sprites"):
        return None
    data = {}
    if sk.exists():
        try:
            data = json.loads(sk.read_text())
        except json.JSONDecodeError:
            data = {}
        if not isinstance(data, dict):
            data = {}
    key = skin_for or kind
    changed = data.get(key) != kind
    data[key] = kind
    if changed or not sk.exists():
        data.setdefault("_about", "which sprite set stands in for a kind; the PixelForge hero builds replace the old painter sets here")
        sk.write_text(json.dumps(data, indent=1) + "\n")
    return {"file": str(sk), "key": key, "kind": kind, "changed": changed}


def figure_height_of(frames_dir: str | Path, manifest: dict | None = None) -> float | None:
    """The height in sprite px of the standing figure in a frames folder: for a shape render the file's height times
    the render scale (both in the manifest); otherwise the opaque height of the first idle frame facing S (or of the
    first frame found). None when there is nothing to measure."""
    manifest = manifest or {}
    if manifest.get("figure_height") and manifest.get("render_scale"):
        return float(manifest["figure_height"]) * float(manifest["render_scale"])
    frames_dir = Path(frames_dir)
    sample = next(iter(sorted(frames_dir.glob("idle_S/frame_[0-9][0-9][0-9].png"))), None) or next(frames_dir.glob("*/frame_000.png"), None)
    if sample is None:
        return None
    alpha = np.asarray(Image.open(sample).convert("RGBA"))[..., 3]
    rows = np.nonzero(alpha.any(axis=1))[0]
    return float(rows.max() - rows.min() + 1) if len(rows) else None


def height_warning(frames_dir: str | Path, manifest: dict | None, category: str) -> str | None:
    """A plain sentence when the frames' figure height is not the game's for ``category`` (within
    :data:`HEIGHT_TOLERANCE`), else None. Categories the game has no fixed height for never warn."""
    want = GAME_FIGURE_HEIGHTS.get(category)
    if not want:
        return None
    have = figure_height_of(frames_dir, manifest)
    if have is None:
        return None
    if abs(have - want) / want <= HEIGHT_TOLERANCE:
        return None
    return (f"the frames' figure is about {have:.0f} px tall but the game draws a {category} at {want} px (the godmarrow preset): "
            f"it will stand {'short' if have < want else 'tall'} in the game. Render with --style godmarrow (or the project's style set to it) and export again.")


def resample_indices(n_src: int, n_dst: int, loop: bool) -> list[int]:
    """Evenly spaced source frame indices for ``n_dst`` output frames."""
    if n_src <= 0:
        return []
    if n_dst >= n_src:
        return list(range(n_src)) + [n_src - 1] * (n_dst - n_src) if not loop else [int(i * n_src / n_dst) for i in range(n_dst)]
    span = n_src if loop else n_src - 1
    return [min(n_src - 1, int(round(i * span / (n_dst if loop else max(n_dst - 1, 1))))) for i in range(n_dst)]


def trim(rgba: np.ndarray) -> tuple[np.ndarray, int, int]:
    ys, xs = np.nonzero(rgba[..., 3])
    if len(ys) == 0:
        return rgba[:1, :1], 0, 0
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return rgba[y0:y1, x0:x1], int(x0), int(y0)


def shelf_pack(frames: list[tuple[str, np.ndarray]], max_width: int = MAX_SHEET, pad: int = 1):
    """Simple shelf packing, tallest first, on one sheet. Returns (sheet_rgba, {key: (x, y, w, h)})."""
    sheets, placed = shelf_pack_sheets(frames, max_width, pad, max_height=1 << 30)
    return sheets[0], {k: v[1:] for k, v in placed.items()}


def shelf_pack_sheets(frames: list[tuple[str, np.ndarray]], max_width: int = MAX_SHEET, pad: int = 1, max_height: int = MAX_SHEET):
    """Shelf packing, tallest first, over as many sheets as needed (a new sheet when the next shelf would pass
    ``max_height``). Returns ([sheet_rgba, ...], {key: (sheet, x, y, w, h)})."""
    order = sorted(range(len(frames)), key=lambda i: -frames[i][1].shape[0])
    placed: dict[str, tuple[int, int, int, int, int]] = {}
    si = x = y = shelf_h = 0
    for i in order:
        key, fr = frames[i]
        h, w = fr.shape[:2]
        if x + w + pad > max_width:
            x, y, shelf_h = 0, y + shelf_h + pad, 0
        if y + h > max_height and y > 0:
            si, x, y, shelf_h = si + 1, 0, 0, 0
        placed[key] = (si, x, y, w, h)
        x += w + pad
        shelf_h = max(shelf_h, h)
    sheets = []
    for k in range(si + 1):
        mine = [v for v in placed.values() if v[0] == k]
        width = max((px + w for _, px, _, w, _ in mine), default=1)
        height = max((py + h for _, _, py, _, h in mine), default=1)
        sheets.append(np.zeros((max(height, 1), max(width, 1), 4), dtype=np.uint8))
    for key, fr in frames:
        k, px, py, w, h = placed[key]
        sheets[k][py : py + h, px : px + w] = fr
    return sheets, placed


def export_godmarrow(
    frames_dir: str | Path,
    manifest: dict,
    out_dir: str | Path,
    kind: str,
    *,
    category: str = "hero",
    display_name: str | None = None,
    anim_map: dict | None = None,
    fps: float | None = None,
    extra_passes: dict[str, Path] | None = None,
    max_frames: int | None = None,
    extra_meta: dict | None = None,
) -> dict:
    """Pack ``frames_dir/<clip>_<DIR>/frame_NNN.png`` into ``out_dir/<kind>.png|json``.

    ``manifest`` is the render manifest (needs ``size``, ``ppu``, ``elevation``,
    ``z_mid``); ``frames_dir/animations.json`` gives the sprite scale.  The foot
    anchor is computed from the camera: the ground point under the hips sits
    ``z_mid * cos(elevation) * ppu`` render px below the frame centre.
    """
    frames_dir, out_dir = Path(frames_dir), Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    anim_map = {**HERO_ANIMS, **(anim_map or {})}
    if max_frames:   # the look's clip cap (an 8-frame handheld loop, a 12-frame 16-bit one) on top of the game's own
        anim_map = {k: (a, min(int(cap), int(max_frames))) for k, (a, cap) in anim_map.items()}
    anims_json = json.loads((frames_dir / "animations.json").read_text()) if (frames_dir / "animations.json").exists() else {}
    clip_fps = fps or anims_json.get("fps", 10)
    per_clip_fps = anims_json.get("clip_fps", {})   # each clip keeps its real duration when it was sampled sparsely
    # render px -> sprite px
    sample = next(frames_dir.glob("*/frame_000.png"), None)
    if sample is None:
        raise FileNotFoundError(f"no frames under {frames_dir}")
    sprite_size = Image.open(sample).size[1]
    scale = sprite_size / manifest["size"]
    elev = math.radians(manifest.get("elevation", 30.0))
    anchor_x = manifest["size"] / 2 * scale
    anchor_y = (manifest["size"] / 2 + manifest.get("z_mid", 0.9) * math.cos(elev) * manifest["ppu"]) * scale

    def collect(src_root: Path) -> tuple[list, dict, dict]:
        packed_frames, idx, meta_anims = [], {}, {}
        anim_fps = {}
        for clip_dir in sorted(p for p in src_root.iterdir() if p.is_dir()):
            clip, _, d = clip_dir.name.rpartition("_")
            if d not in DIR_TO_VIEW or clip not in anim_map:
                continue
            anim, cap = anim_map[clip]
            n_src_files = len(list(clip_dir.glob("frame_[0-9][0-9][0-9].png")))
            n_dst = min(int(cap), n_src_files) if n_src_files else int(cap)
            src_fps = float(per_clip_fps.get(clip, clip_fps))
            anim_fps[anim] = src_fps * n_dst / max(n_src_files, 1) if n_src_files else clip_fps
            view = DIR_TO_VIEW[d]
            files = sorted(clip_dir.glob("frame_[0-9][0-9][0-9].png"))
            loop = anim in ("idle", "walk", "run")
            for i, si in enumerate(resample_indices(len(files), n_dst, loop)):
                rgba = np.asarray(Image.open(files[si]).convert("RGBA"))
                fr, x0, y0 = trim(rgba)
                key = f"{anim}/{view}/{i}"
                packed_frames.append((key, np.ascontiguousarray(fr)))
                idx[key] = [x0 - anchor_x, y0 - anchor_y]  # dx, dy; sheet rect filled after packing
            ma = meta_anims.setdefault(anim, {"frames": n_dst, "views": []})
            if view not in ma["views"]:
                ma["views"].append(view)
        for ma in meta_anims.values():
            ma["views"].sort(key=VIEW_ORDER.index)
        meta_anims["__fps__"] = anim_fps
        return packed_frames, idx, meta_anims

    def write_set(src_root: Path, name: str, passes_meta: dict | None = None) -> dict:
        packed_frames, idx, meta_anims = collect(src_root)
        anim_fps = meta_anims.pop("__fps__", {})
        if not packed_frames:
            raise FileNotFoundError(f"no exportable clips under {src_root}")
        sheets, placed = shelf_pack_sheets(packed_frames)
        pngs = []
        for k, sheet in enumerate(sheets):
            png = out_dir / (f"{name}.png" if k == 0 else f"{name}_{k + 1}.png")
            Image.fromarray(sheet, "RGBA").save(png)
            pngs.append(png)
        png = pngs[0]
        full_idx = {}
        xs, ys, ws, hs = [], [], [], []
        for key, (dx, dy) in idx.items():
            k, px, py, w, h = placed[key]
            full_idx[key] = [k, px, py, w, h, int(round(dx)), int(round(dy))]
            xs.append(dx); ys.append(dy); ws.append(dx + w); hs.append(dy + h)
        bounds = {"x": int(min(xs)), "y": int(min(ys)), "w": int(max(ws) - min(xs)), "h": int(max(hs) - min(ys))}
        meta = {
            "kind": kind,
            "category": category,
            "name": display_name or kind,
            "anims": meta_anims,
            "fps": {a: round(float(anim_fps.get(a, clip_fps)), 2) for a in meta_anims},
            "bounds": bounds,
            "frame_count": len(full_idx),
            "views_note": "down front side back up face screen-right (mirror for the left octants, as the web); "
                          "front_l side_l back_l are REAL left-facing views for an 8-view AnimSprite (no mirroring).",
            "anchor": "(0,0) = the entity's ground point; (dx,dy) = offset to the frame's top-left. No shadow in the frames.",
            "scale": f"{sprite_size} px frames at 1 atlas px = 1 screen px; made by PixelForge from the carved model, "
                     f"camera {float(manifest.get('view_elevation', manifest.get('elevation', 30))):g} deg, {manifest['ppu'] * scale:.1f} px per metre.",
            "source": "pixelforge",
        }
        if extra_meta:
            meta.update(extra_meta)
        if passes_meta:
            meta.update(passes_meta)
        data = {"sheets": [q.name for q in pngs], "meta": meta, "idx": full_idx}
        (out_dir / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
        return {"png": str(png), "pngs": [str(q) for q in pngs], "json": str(out_dir / f"{name}.json"), "frames": len(full_idx), "sheet": list(sheets[0].shape[1::-1]), "sheets": len(pngs), "anims": meta_anims}

    result = {"color": write_set(frames_dir, kind)}
    for pass_name, pass_dir in (extra_passes or {}).items():
        if Path(pass_dir).exists():
            result[pass_name] = write_set(Path(pass_dir), f"{kind}_{pass_name}", {"pass": pass_name, "of": kind})
    return result
