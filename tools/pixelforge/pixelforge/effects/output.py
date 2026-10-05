"""Output: an evaluated graph -> frames, the sheet the game plays (``<name>.png`` + ``<name>.json`` in the ``vfx``
layout the add-on and SheetFx read), GIF previews, rotation sheets for missiles, and the library render entry point."""
from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np
from PIL import Image

from .graph import Context, evaluate

HOUSE = {"frames": 8, "fps": 12.0, "size": [64, 64]}   # the house defaults: eight-frame loops at 12 a second


def frames_of(graph: dict, levers: dict | None = None, *, size: tuple[int, int] | None = None, frames: int | None = None, fps: float | None = None,
              seed: int | None = None) -> tuple[list[np.ndarray], Context, dict]:
    """Render a graph to RGBA frames (H, W, 4) uint8. Overrides win over the graph's own size / frames / fps / seed."""
    g = dict(graph)
    if size:
        g["size"] = [int(size[0]), int(size[1])]
    if frames:
        g["frames"] = int(frames)
    if fps:
        g["fps"] = float(fps)
    if seed is not None:
        g["seed"] = int(seed)
    g.setdefault("size", list(HOUSE["size"]))
    g.setdefault("frames", HOUSE["frames"])
    g.setdefault("fps", HOUSE["fps"])
    out, ctx, values = evaluate(g, levers)
    if out.ndim == 3:  # a bare field: paint it grey so a half-built graph still shows
        a = (out >= 0.35).astype(np.uint8) * 255
        grey = (np.clip(out, 0, 1) * 255).astype(np.uint8)
        out = np.stack([grey, grey, grey, a], -1)
    if out.ndim == 4 and out.shape[-1] == 2:
        raise ValueError("the graph's output is a vector field; paint a field or end on an image")
    return [f for f in out], ctx, values


def palette_of(frames: list[np.ndarray]) -> list[str]:
    px = np.concatenate([f[f[..., 3] > 0][:, :3] for f in frames]) if any((f[..., 3] > 0).any() for f in frames) else np.zeros((0, 3), np.uint8)
    if len(px) == 0:
        return []
    uniq = np.unique(px, axis=0)
    from ..color import rgb_to_hex, rgb_to_oklab
    order = np.argsort(rgb_to_oklab(uniq)[:, 0])
    return ["#" + rgb_to_hex(c) for c in uniq[order]]


def write_sheet(frames: list[np.ndarray], name: str, out_dir: str | Path, *, fps: float, loop: bool = True, anchor=None, kind: str = "effect",
                gif: bool = False, rotations: int = 0, extra: dict | None = None, gif_zoom: int = 4) -> dict:
    """The strip (frames in a row; ``rotations`` rows of headings when asked) + the json the game's loaders read."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    h, w = frames[0].shape[:2]
    rows = [frames]
    if rotations and rotations > 1:
        from ..transform import rotate
        turned = [[rotate(f, k * 360.0 / rotations, expand=True) for f in frames] for k in range(rotations)]
        cw = max(f.shape[1] for row in turned for f in row)
        ch = max(f.shape[0] for row in turned for f in row)
        rows = []
        for row in turned:
            cells = []
            for f in row:
                cell = np.zeros((ch, cw, 4), np.uint8)
                oy, ox = (ch - f.shape[0]) // 2, (cw - f.shape[1]) // 2
                cell[oy:oy + f.shape[0], ox:ox + f.shape[1]] = f
                cells.append(cell)
            rows.append(cells)
        w, h = cw, ch
        anchor = [cw // 2, ch // 2]
    sheet = np.concatenate([np.concatenate(r, axis=1) for r in rows], axis=0)
    Image.fromarray(sheet, "RGBA").save(out / f"{name}.png")
    anchor = list(anchor) if anchor is not None else [w // 2, h - 4]
    meta = {"name": name, "kind": kind, "size": [w, h], "frames": len(frames), "frame_width": w, "frame_height": h, "fps": float(fps), "loop": bool(loop),
            "anchor": [int(anchor[0]), int(anchor[1])], "glow": False, "haze": False, "palette": palette_of(frames), "rotations": int(rotations or 1),
            "heading": "row k faces k * 360 / rotations degrees anticlockwise from flying right" if rotations and rotations > 1 else "as drawn",
            "source": "pixelforge effects", **(extra or {})}
    (out / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    r = {"ok": True, "png": str(out / f"{name}.png"), "json": str(out / f"{name}.json"), "size": meta["size"], "frames": meta["frames"], "fps": meta["fps"],
         "loop": meta["loop"], "palette": meta["palette"]}
    if gif:
        r["gif"] = write_gif(frames, out / f"{name}.gif", fps, zoom=gif_zoom, displacement=bool((extra or {}).get("displacement")))
    return r


def write_gif(frames: list[np.ndarray], path: str | Path, fps: float, zoom: int = 4, background=None, displacement: bool = False) -> str:
    from ..spritesheet import save_gif
    if displacement:
        frames = apply_displacement(frames)
    save_gif([Image.fromarray(f, "RGBA") for f in frames], path, fps=fps, zoom=zoom, background=background)
    return str(path)


def backdrop(w: int, h: int, seed: int = 3) -> np.ndarray:
    """A stone wall with a pale mortar grid, for showing what a displacement sheet does to what is behind it."""
    from . import noise as N
    n = N.perlin(w, h, 1, cells=5, octaves=3, seed=seed)[0]
    g = (np.round(n * 3) / 3 * 70 + 50).astype(np.uint8)
    ys, xs = np.mgrid[0:h, 0:w]
    grid = ((ys % 12) == 0) | (((xs + (ys // 12) * 6) % 16) == 0)
    rgb = np.stack([g, g, (g * 1.1).clip(0, 255).astype(np.uint8)], -1)
    rgb[grid] = (150, 140, 120)
    return np.concatenate([rgb, np.full((h, w, 1), 255, np.uint8)], -1)


def apply_displacement(frames: list[np.ndarray], scene: np.ndarray | None = None, range_px: float = 6.0) -> list[np.ndarray]:
    """What the game's shader does: sample the backdrop shifted by the sheet's (R, G) offsets, scaled by its alpha."""
    h, w = frames[0].shape[:2]
    scene = backdrop(w, h) if scene is None else scene
    ys, xs = np.mgrid[0:h, 0:w]
    out = []
    for f in frames:
        dx = (f[..., 0].astype(np.float32) - 128) / 127 * range_px * (f[..., 3] / 255.0)
        dy = (f[..., 1].astype(np.float32) - 128) / 127 * range_px * (f[..., 3] / 255.0)
        sx = np.clip(np.rint(xs - dx).astype(int), 0, w - 1)
        sy = np.clip(np.rint(ys - dy).astype(int), 0, h - 1)
        out.append(scene[sy, sx])
    return out


def render_graph(graph: dict, name: str, out_dir: str | Path, *, levers: dict | None = None, size=None, frames=None, fps=None, seed=None,
                 gif: bool = False, rotations: int = 0, kind: str = "effect", extra: dict | None = None) -> dict:
    """Evaluate and write. The result carries the files, the timing, the palette and the node chain (id, op) for a UI."""
    t0 = time.perf_counter()
    fr, ctx, _ = frames_of(graph, levers, size=size, frames=frames, fps=fps, seed=seed)
    took = time.perf_counter() - t0
    r = write_sheet(fr, name, out_dir, fps=ctx.fps, loop=bool(graph.get("loop", True)), anchor=graph.get("anchor", ctx.anchor), kind=kind, gif=gif,
                    rotations=rotations, extra={**(extra or {}), "levers": ctx.levers, "seed": ctx.seed})
    r["seconds"] = round(took, 3)
    r["nodes"] = [{"id": n["id"], "op": n["op"]} for n in graph.get("nodes", [])]
    r["levers"] = ctx.levers
    r["seed"] = ctx.seed
    return r
