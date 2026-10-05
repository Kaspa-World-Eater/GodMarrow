"""Measure imported Diablo 2 sets (what ``d2 import`` wrote): figure heights, frames a clip, speeds, directions,
palette use, outline and shadow conventions, as numbers; and the values they suggest for a look preset."""
from __future__ import annotations

import json
import statistics
from pathlib import Path

import numpy as np
from PIL import Image

from ..color import rgb_to_oklab

TIERS = [("small", 0, 60), ("medium", 60, 100), ("large", 100, 160), ("huge", 160, 10000)]
HERO_FRAME_DOC = {"Barbarian": "44x78", "Amazon": "28x75", "Assassin": "22x75"}    # community documentation of the players' NU frame sizes, not measured here


def _figure(frames_dir: Path, clip: str = "idle", direction: str = "S") -> dict | None:
    folder = frames_dir / f"{clip}_{direction}"
    files = sorted(folder.glob("frame_[0-9][0-9][0-9].png"))
    if not files:
        return None
    heights, widths, dark_edge, edge_total, lum = [], [], 0, 0, []
    for f in files:
        rgba = np.asarray(Image.open(f).convert("RGBA"))
        a = rgba[..., 3] > 127
        if not a.any():
            continue
        ys, xs = np.nonzero(a)
        heights.append(int(ys.max() - ys.min() + 1)); widths.append(int(xs.max() - xs.min() + 1))
        # the silhouette's edge: opaque pixels with a transparent 4-neighbour
        pad = np.pad(a, 1)
        edge = a & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
        lab = rgb_to_oklab(rgba[..., :3][edge])
        if len(lab):
            dark_edge += int((lab[:, 0] < 0.3).sum()); edge_total += len(lab)
        lum.append(float(rgb_to_oklab(rgba[..., :3][a])[:, 0].mean()))
    if not heights:
        return None
    return {"height": int(statistics.median(heights)), "height_max": max(heights), "width": int(statistics.median(widths)), "frames": len(files),
            "dark_edge_share": round(dark_edge / edge_total, 3) if edge_total else 0.0, "mean_lightness": round(statistics.mean(lum), 3)}


def measure_set(frames_dir: str | Path) -> dict:
    frames_dir = Path(frames_dir)
    rep = json.loads((frames_dir / "d2_import.json").read_text()) if (frames_dir / "d2_import.json").exists() else {}
    anims = json.loads((frames_dir / "animations.json").read_text()) if (frames_dir / "animations.json").exists() else {}
    clips = rep.get("clips", {})
    fig = _figure(frames_dir, "idle") or _figure(frames_dir, next(iter(clips), "idle"))
    palette_used = set()
    for f in sorted(frames_dir.glob("*_S/frame_000.png"))[:12]:
        rgba = np.asarray(Image.open(f).convert("RGBA"))
        px = rgba[..., :3][rgba[..., 3] > 127]
        if len(px):
            palette_used.update(map(tuple, np.unique(px, axis=0).tolist()))
    out = {"token": rep.get("token", frames_dir.name), "kind": rep.get("kind", "?"), "frames_dir": str(frames_dir), "figure": fig,
           "clips": {c: {"frames": v["frames"], "fps": v["fps"], "speed": v["speed"], "directions": v["directions"], "triggers": v.get("triggers", {})} for c, v in clips.items()},
           "colours_used": len(palette_used), "palette_indices_used": rep.get("palette_indices_used"),
           "shadow": "drawn by the game from the COF's shadow flag (no shadow baked into the frames)" if any(v.get("shadow_layers") for v in clips.values()) else "none flagged",
           "fps_base": anims.get("fps", 25.0)}
    if fig:
        out["tier"] = next((t for t, lo, hi in TIERS if lo <= fig["height"] < hi), "huge")
    return out


def measure(frames_dirs: list[str | Path], out_md: str | Path | None = None, write_preset: str | None = None) -> dict:
    sets = [measure_set(d) for d in frames_dirs]
    heroes = [s for s in sets if s["kind"] == "character" and s.get("figure")]
    monsters = [s for s in sets if s["kind"] == "monster" and s.get("figure")]
    hero_heights = [s["figure"]["height"] for s in heroes]
    idle_frames = [s["clips"]["idle"]["frames"] for s in sets if "idle" in s["clips"]]
    walk_fps = [s["clips"]["walk"]["fps"] for s in sets if "walk" in s["clips"]]
    all_fps = [c["fps"] for s in sets for c in s["clips"].values()]
    suggestion = {
        "figure_height": int(statistics.median(hero_heights)) if hero_heights else None,
        "clip_frames": int(max(idle_frames)) if idle_frames else None,
        "clip_fps": round(statistics.median(all_fps), 2) if all_fps else None,
        "walk_fps": round(statistics.median(walk_fps), 2) if walk_fps else None,
        "outline": "none" if sets and statistics.mean(s["figure"]["dark_edge_share"] for s in sets if s.get("figure")) < 0.5 else "dark",
        "note": "Diablo 2 runs at 25 frames a second; a clip's speed is 25 * speed / 256 frames a second. The figure height is the median standing hero.",
    }
    result = {"ok": True, "sets": sets, "heroes": len(heroes), "monsters": len(monsters), "suggestion": suggestion, "documented_hero_frames": HERO_FRAME_DOC}
    if out_md:
        Path(out_md).parent.mkdir(parents=True, exist_ok=True)
        Path(out_md).write_text(render_markdown(result))
        result["markdown"] = str(out_md)
    if write_preset:
        from ..styles import write_override
        values = {k: v for k, v in (("figure_height", suggestion["figure_height"]), ("clip_frames", suggestion["clip_frames"])) if v}
        if suggestion["clip_fps"]:
            values["anim_fps"] = suggestion["clip_fps"]
        result["preset_written"] = write_override(write_preset, values)
    return result


def render_markdown(result: dict) -> str:
    lines = ["# Diablo 2, measured", "", "Numbers read from the owner's own install by `pixelforge d2 measure` (frames made by `d2 import`, kept outside the repository).",
             "Diablo 2 runs at 25 frames a second; a clip plays at 25 x speed / 256.", ""]
    lines += ["| token | kind | tier | figure h (px) | w | frames (idle) | clips | dark edge share | colours (S frames) |", "|---|---|---|---|---|---|---|---|---|"]
    for s in result["sets"]:
        f = s.get("figure") or {}
        lines.append(f"| {s['token']} | {s['kind']} | {s.get('tier', '')} | {f.get('height', '')} | {f.get('width', '')} | {f.get('frames', '')} | {len(s['clips'])} | "
                     f"{f.get('dark_edge_share', '')} | {s['colours_used']} |")
    lines += ["", "## Clips", "", "| token | clip | mode | frames | fps | speed | directions | trigger frames |", "|---|---|---|---|---|---|---|---|"]
    for s in result["sets"]:
        for c, v in s["clips"].items():
            lines.append(f"| {s['token']} | {c} | | {v['frames']} | {v['fps']} | {v['speed']} | {v['directions']} | {', '.join(str(k) for k in v.get('triggers', {}))} |")
    sug = result["suggestion"]
    lines += ["", "## Shadow and outline", "", f"- Shadow: {result['sets'][0]['shadow'] if result['sets'] else 'no sets measured'}.",
              f"- Outline: {'dark edges on most sprites' if sug['outline'] == 'dark' else 'no drawn outline (the edge is the lit colour)'}.", "",
              "## Values offered for the godmarrow preset (not applied without `--write-preset godmarrow`)", "",
              f"- figure_height: {sug['figure_height']}", f"- clip_frames: {sug['clip_frames']}", f"- clip fps (median): {sug['clip_fps']}", f"- walk fps: {sug['walk_fps']}", f"- outline: {sug['outline']}", "",
              "## From the community documentation (not measured here)", "", "Player NU frames: " + ", ".join(f"{k} {v}" for k, v in result["documented_hero_frames"].items()) + ".", ""]
    return "\n".join(lines)
