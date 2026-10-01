"""A painted object sheet -> a game prop, the hero way: cut out the views, carve the shape from them (visual hull),
wrap the painting onto it, film it at the game angle with the lantern light rig, press to pixels.

    pixelforge object gravestone.png gravestone -o art/objects --height 1.2 [--views 3] [--game-objects objects.json]
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

from . import api, cleanup
from .model_spec import build_hull_spec, build_spec, synthesize_top, transpose_image, write_spec
from .prop3d import make_prop3d
from .sheet import cutout, normalize_heights, split_sheet


def make_object(sheet: str | Path, name: str, out_dir: str | Path, *, height: float = 1.0, views: int | None = None, tolerance: float = 0.08,
                columns: int = 96, yaw: float = 45.0, ppu: float = 108.0, strength: float = 0.35, grime: float = 0.15, bump: float = 0.2, dust: float = 0.1,
                game_objects: str | Path | None = None, hr: float = 4.0, blender: str | None = None, top: str | Path | None = None,
                canopy: bool = False, log=None) -> dict:
    """``top``: a second sheet with the plan view and the underside side by side (carves the footprint, paints the top).
    ``canopy``: a tree: the crown becomes crossed painted cards instead of a carved blob."""
    exe = blender or api.find_blender(None)
    if exe is None:
        raise api.StepError("Blender was not found (pixelforge project blender-download)")
    out = Path(out_dir) / name
    work = out / "_model"
    work.mkdir(parents=True, exist_ok=True)
    im = Image.open(sheet).convert("RGB")
    names = {2: ["front", "side"], 3: ["front", "side", "back"], 4: ["front", "quarter", "side", "back"]}
    vs = normalize_heights(split_sheet(im, names=names.get(views) if views else None, tolerance=tolerance, expected=views))
    if not vs:
        raise api.StepError("no figures found on the sheet; is the background plain?")
    got = {v.name: v for v in vs}
    if top is not None:
        tv = split_sheet(Image.open(top).convert("RGB"), names=["top", "bottom"], tolerance=tolerance, expected=2)
        for v in tv[:2]:
            got[v.name] = v
    if "front" not in got:
        raise api.StepError(f"could not find a front view (found {sorted(got)})")
    tex = {}
    for k, v in got.items():
        rgba = np.asarray(v.image.convert("RGBA"))
        clean = cleanup.remove_background_pockets(rgba if k in ("top", "bottom") else cleanup.drop_floor_shadow(rgba))
        clean = cleanup.fill_bright_specks(clean)
        Image.fromarray(clean, "RGBA").save(work / f"{k}.png")
        rgba = cleanup.bleed_edges(clean)
        p = work / f"tex_{k}.png"
        Image.fromarray(rgba, "RGBA").save(p)
        tex[k] = p
    front = got["front"].image
    if "side" in got:
        spec = build_hull_spec(front, got["side"].image, got["back"].image if "back" in got else None, got["quarter"].image if "quarter" in got else None, columns=columns,
                               top=got["top"].image if "top" in got else None, bottom=got["bottom"].image if "bottom" in got else None, canopy=canopy)
        if "top" not in tex:
            tex["top"] = work / "tex_top.png"
            synthesize_top(front, spec).save(tex["top"])
        for k in ("top", "bottom"):   # the plan views, turned the way the carve matched them
            kk = spec.get("orient", {}).get(k, {}).get("transpose", 0)
            if k in tex and kk:
                transpose_image(Image.open(tex[k]).convert("RGBA"), kk).save(tex[k])
    else:
        spec = build_spec(front, None, columns=columns)
    spec_path = write_spec(spec, work / f"{name}_spec.json")
    blend = work / f"{name}.blend"
    script = Path(__file__).resolve().parent / "blender" / "build_mesh.py"
    args = [exe, "-b", "--python", str(script), "--", "--spec", str(spec_path), "--front", str(tex["front"]), "--height", str(height), "--name", name, "--out", str(blend), "--smooth", "1"]
    for k in ("back", "side", "quarter", "top", "bottom"):
        if k in tex:
            args += [f"--{k}", str(tex[k])]
    proc = subprocess.run(args, capture_output=True, text=True)
    if "PF_OK" not in proc.stdout + proc.stderr:
        raise api.StepError("model build failed:\n" + (proc.stdout + proc.stderr)[-1200:])
    if log:
        log(f"model carved from {sorted(got)} views")
    r = make_prop3d(blend, name, out_dir, height=0.0, yaw=yaw, ppu=ppu, strength=strength, grime=grime, bump=bump, dust=dust,
                    game_objects=game_objects, hr=hr, blender=exe, log=log)
    r["views"] = sorted(got)
    r["blend"] = str(blend)
    return r
