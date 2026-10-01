"""A 3D model -> a graded, pixelated game prop with a foot point (the Diablo II Resurrected way: real geometry,
real light, then a painterly pass and the pixel grid). Uses ``blender/render_prop.py`` then ``grade`` and the
same pixel/outline pass as everything else.

    pixelforge prop3d crypt.glb crypt -o art/objects --height 3.6 [--yaw 45] [--game-objects objects.json]
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

from . import api
from .cleanup import add_outline, pad
from .grade import Target, grade, measure
from .pixelate import PixelateOptions, pixelate
from .props import merge_game_objects


def render_model(model: str | Path, out_png: str | Path, *, height: float = 0.0, yaw: float = 45.0, ppu: float = 108.0, samples: int = 16,
                 grime: float = 0.45, bump: float = 0.35, dust: float = 0.25, ground_shadow: bool = False, stack: bool = False, blender: str | None = None, log=None) -> dict:
    exe = blender or api.find_blender(None)
    if exe is None:
        raise api.StepError("Blender was not found (pixelforge project blender-download, or set the path)")
    script = Path(__file__).resolve().parent / "blender" / "render_prop.py"
    models = [str(m) for m in (model if isinstance(model, (list, tuple)) else [model])]
    args = [exe, "-b", "--python", str(script), "--", "--model", *models, "--out", str(out_png), "--height", str(height), "--yaw", str(yaw),
            "--ppu", str(ppu), "--samples", str(samples), "--grime", str(grime), "--bump", str(bump), "--dust", str(dust)]
    if ground_shadow:
        args.append("--ground-shadow")
    if stack:
        args.append("--stack")
    proc = subprocess.run(args, capture_output=True, text=True)
    lines = (proc.stdout + proc.stderr).splitlines()
    ok = [l for l in lines if l.startswith("PF_OK")]
    if proc.returncode != 0 or not ok:
        raise api.StepError("render failed:\n" + "\n".join(l for l in lines if "PF_" in l or "Error" in l)[-1500:])
    if log:
        log(ok[-1])
    return json.loads(Path(str(out_png)[:-4] + ".json").read_text())


def make_prop3d(model: str | Path, name: str, out_dir: str | Path, *, height: float = 0.0, yaw: float = 45.0, ppu: float = 108.0,
                target: Target | None = None, reference: str | Path | None = None, strength: float = 1.0, scale: float = 2.0,
                outline: bool = True, game_objects: str | Path | None = None, hr: float = 4.0, samples: int = 16,
                grime: float = 0.45, bump: float = 0.35, dust: float = 0.25, stack: bool = False, keep_raw: bool = False, blender: str | None = None, log=None) -> dict:
    """``scale``: render pixels per final pixel (2 = render at double size, press down: crisper edges).
    ``reference``: an image whose tones to grade toward (default: the Godmarrow painting target)."""
    out = Path(out_dir) / name
    out.mkdir(parents=True, exist_ok=True)
    raw = out / f"{name}_render.png"
    meta = render_model(model, raw, height=height, yaw=yaw, ppu=ppu * scale, samples=samples, grime=grime, bump=bump, dust=dust, stack=stack, blender=blender, log=log)
    rgba = np.asarray(Image.open(raw).convert("RGBA"))
    tgt = target or (measure(np.asarray(Image.open(reference).convert("RGBA"))) if reference else Target())
    graded = grade(rgba, tgt, strength=strength)
    im = Image.fromarray(graded, "RGBA")
    if scale != 1:
        im = im.resize((max(1, int(im.width / scale)), max(1, int(im.height / scale))), Image.BOX)
    px = np.asarray(im)
    if outline:
        px = add_outline(px, (0, 0, 0))
    px = pad(px, 2)
    ys, xs = np.nonzero(px[..., 3])
    px = px[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    # the foot point: the model's origin on the ground, carried through scale, outline, pad and crop
    ax = (meta["anchor"][0] / scale) + (1 if outline else 0) + 2 - xs.min()
    ay = (meta["anchor"][1] / scale) + (1 if outline else 0) + 2 - ys.min()
    final = out / f"{name}_v1.png"
    Image.fromarray(np.ascontiguousarray(px), "RGBA").save(final)
    entry = {"size": [int(px.shape[1]), int(px.shape[0])], "anchor": [int(round(ax)), int(round(ay))],
             "ellipse": [int(round(ax)), int(round(ay)), int(meta["footprint_m"][0] * ppu), int(meta["footprint_m"][1] * ppu * 0.5)], "frames": 1, "fps": 0}
    (out / f"{name}.json").write_text(json.dumps({"name": name, "variations": {"v1": entry}, "model": [str(m) for m in (model if isinstance(model, (list, tuple)) else [model])], "source": "pixelforge prop3d"}, indent=2) + "\n")
    if not keep_raw:   # the 2x raw render is large and reproducible
        raw.unlink(missing_ok=True)
        Path(str(raw)[:-4] + ".json").unlink(missing_ok=True)
    result = {"ok": True, "name": name, "png": str(final), "size": entry["size"], "anchor": entry["anchor"]}
    if game_objects:
        result["game_objects"] = merge_game_objects(game_objects, name, out, {"v1": entry}, hr)
    return result
