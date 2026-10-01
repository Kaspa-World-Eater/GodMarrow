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
# the game's fixed animation set for heroes: Forge clip -> (game anim, frame count)
HERO_ANIMS = {
    "idle": ("idle", 8),
    "walk": ("walk", 8),
    "attack": ("atk", 8),
    "punch": ("atk2", 8),
    "attack2": ("atk2", 8),
    "cast": ("cast", 8),
    "hit": ("hit", 6),
    "death": ("death", 8),
    "roll": ("dodge", 8),
    "dodge": ("dodge", 8),
    "run": ("run", 8),
}


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


def shelf_pack(frames: list[tuple[str, np.ndarray]], max_width: int = 4096, pad: int = 1):
    """Simple shelf packing, tallest first. Returns (sheet_rgba, {key: (x, y, w, h)})."""
    order = sorted(range(len(frames)), key=lambda i: -frames[i][1].shape[0])
    placed: dict[str, tuple[int, int, int, int]] = {}
    x = y = shelf_h = 0
    for i in order:
        key, fr = frames[i]
        h, w = fr.shape[:2]
        if x + w + pad > max_width:
            x, y, shelf_h = 0, y + shelf_h + pad, 0
        placed[key] = (x, y, w, h)
        x += w + pad
        shelf_h = max(shelf_h, h)
    width = max((px + w for px, _, w, _ in placed.values()), default=1)
    height = y + shelf_h
    sheet = np.zeros((max(height, 1), max(width, 1), 4), dtype=np.uint8)
    for key, fr in frames:
        px, py, w, h = placed[key]
        sheet[py : py + h, px : px + w] = fr
    return sheet, placed


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
            anim, n_dst = anim_map[clip]
            n_src_files = len(list(clip_dir.glob("frame_*.png")))
            src_fps = float(per_clip_fps.get(clip, clip_fps))
            anim_fps[anim] = src_fps * n_dst / max(n_src_files, 1) if n_src_files else clip_fps
            view = DIR_TO_VIEW[d]
            files = sorted(clip_dir.glob("frame_*.png"))
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
        sheet, placed = shelf_pack(packed_frames)
        png = out_dir / f"{name}.png"
        Image.fromarray(sheet, "RGBA").save(png)
        full_idx = {}
        xs, ys, ws, hs = [], [], [], []
        for key, (dx, dy) in idx.items():
            px, py, w, h = placed[key]
            full_idx[key] = [0, px, py, w, h, int(round(dx)), int(round(dy))]
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
                     f"camera {manifest.get('elevation', 30)} deg, {manifest['ppu'] * scale:.1f} px per metre.",
            "source": "pixelforge",
        }
        if passes_meta:
            meta.update(passes_meta)
        data = {"sheets": [png.name], "meta": meta, "idx": full_idx}
        (out_dir / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
        return {"png": str(png), "json": str(out_dir / f"{name}.json"), "frames": len(full_idx), "sheet": list(sheet.shape[1::-1]), "anims": meta_anims}

    result = {"color": write_set(frames_dir, kind)}
    for pass_name, pass_dir in (extra_passes or {}).items():
        if Path(pass_dir).exists():
            result[pass_name] = write_set(Path(pass_dir), f"{kind}_{pass_name}", {"pass": pass_name, "of": kind})
    return result
