"""2D puppet characters: the pixel road (no Blender, no 3D model).

A painted turnaround (front, side, back, optionally three-quarter) becomes an 8-direction animated sprite set
without Blender:

1. **Joint tracks, once.** ``assets/animations/joints.json.gz`` holds the 3D positions of 24 joints per frame of
   every motion-library clip the game uses, normalised to the mannequin's height (``blender/export_joints.py``
   wrote it; nothing here needs Blender again).
2. **Parts with pivots.** :func:`build_view_puppet` fits a skeleton to each view's silhouette
   (:func:`pixelforge.rig.fit_view`) and cuts the painting into parts along it: head (with the hat), torso, upper
   and lower arms, thighs, shins, feet, and a skirt or robe as a garment of its own. Parts overlap a little at the
   joints so a bend never opens a gap; what a limb hides on the body is filled in from the body's own paint.
3. **Posing.** For every frame of a clip and every direction the joint tracks are retargeted to the painting's
   proportions (the clip gives each bone its direction, the painting its length), the lowest foot is put on the
   floor, the skeleton is turned to the direction and projected with the game camera (orthographic, 30 degrees
   above), and the nearest painted view is posed: each part is rotated and foreshortened about its pivot to lie on
   its projected bone and drawn far-to-near by the joints' depth. Garments lag the hips through a damped spring and
   their hem follows the legs (a mesh warp), the hat lags the head.
4. The frames land in the character's ``renders/`` folder with the same manifest the Blender road writes, so the
   usual ``pixelate`` (palette-locked, in the look preset) and both exports run unchanged.

Every function returns plain data; :mod:`pixelforge.api` wires the steps into a project.
"""

from __future__ import annotations

import gzip
import json
import math
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

from . import cleanup
from .color import oklab_to_rgb, rgb_to_oklab
from .rig import VIEW_KINDS, fit_view

JOINTS_FILE = Path(__file__).resolve().parent.parent / "assets" / "animations" / "joints.json.gz"
DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
YAW = {d: 45.0 * i for i, d in enumerate(DIRECTIONS)}   # the yaw render_sprites.py uses for each direction
SIDES = ("L", "R")

# part name -> (bone start, bone end, kind, radius as a fraction of the figure height)
# kind: rigid (head, torso) | limb (claims only pixels near its bone) | garment (a skirt or robe: warped, lagging)
PART_DEFS: dict[str, tuple[str, str, str, float]] = {
    "head": ("neck", "head_top", "rigid", 0.16),
    "torso": ("hips", "neck", "rigid", 0.13),
    "upper_arm_L": ("shoulder_L", "elbow_L", "limb", 0.05),
    "lower_arm_L": ("elbow_L", "hand_L", "limb", 0.045),
    "upper_arm_R": ("shoulder_R", "elbow_R", "limb", 0.05),
    "lower_arm_R": ("elbow_R", "hand_R", "limb", 0.045),
    "thigh_L": ("hip_L", "knee_L", "limb", 0.07),
    "shin_L": ("knee_L", "ankle_L", "limb", 0.05),
    "foot_L": ("ankle_L", "toe_tip_L", "limb", 0.05),
    "thigh_R": ("hip_R", "knee_R", "limb", 0.07),
    "shin_R": ("knee_R", "ankle_R", "limb", 0.05),
    "foot_R": ("ankle_R", "toe_tip_R", "limb", 0.05),
    "skirt": ("hips", "hem", "garment", 0.0),
}
FOOT_JOINTS = ("ankle_L", "toe_L", "toe_tip_L", "ankle_R", "toe_R", "toe_tip_R")


# ====================================================================================================== joint library
class JointLibrary:
    """The exported joint tracks: ``joints`` (names), ``rest`` (J, 3), ``clips`` {library clip: {fps, loop, frames
    (F, J, 3)}} and ``map`` (forge clip name -> library clip). Axes: x = the figure's left, y = behind it (it faces
    -y), z = up; the floor is 0 and the top of the mannequin's head 1."""

    def __init__(self, data: dict):
        self.joints: list[str] = list(data["joints"])
        self.index = {n: i for i, n in enumerate(self.joints)}
        self.rest = np.asarray(data["rest"], dtype=float)
        self.clips = {k: {"fps": float(v["fps"]), "loop": bool(v["loop"]), "frames": np.asarray(v["frames"], dtype=float)}
                      for k, v in data["clips"].items()}
        self.map: dict[str, str] = dict(data.get("map", {}))
        self.source = data.get("source", "")
        self.licence = data.get("licence", "")

    def resolve(self, name: str) -> str:
        lib = self.map.get(name, name)
        if lib not in self.clips:
            raise KeyError(f"no clip {name!r} in the joint library (have {sorted(self.map)} and {sorted(self.clips)})")
        return lib

    def sample(self, name: str, per_clip: int = 0) -> tuple[np.ndarray, float, bool, list[int]]:
        """``per_clip`` evenly spaced frames of a clip (0 = every frame): (frames (n, J, 3), playback fps that keeps
        the clip's real duration, loop, source frame indices). The same sampling as the Blender render."""
        c = self.clips[self.resolve(name)]
        F = len(c["frames"])
        if per_clip and per_clip > 0:
            n = max(2, min(per_clip, F))
            idx = sorted({int(round(i * (F - 1) / n)) for i in range(n)})
        else:
            idx = list(range(F))
        span = max(1, (idx[-1] - idx[0]) + (idx[1] - idx[0] if len(idx) > 1 else 1))
        fps = c["fps"] * len(idx) / span
        return c["frames"][idx], float(fps), c["loop"], idx


_LIB: JointLibrary | None = None


def load_joints(path: str | Path | None = None) -> JointLibrary:
    global _LIB
    if path is None and _LIB is not None:
        return _LIB
    p = Path(path) if path else JOINTS_FILE
    if not p.exists():
        raise FileNotFoundError(f"no joint tracks at {p}; run blender/export_joints.py once to make them")
    with gzip.open(p, "rt", encoding="utf-8") as fh:
        lib = JointLibrary(json.load(fh))
    if path is None:
        _LIB = lib
    return lib


# ============================================================================================================ parts
@dataclass
class Part:
    name: str
    bone: tuple[str, str]          # pivot joint, tip joint (the garment's tip is the virtual "hem")
    kind: str                      # rigid | limb | garment | clone
    image: np.ndarray              # RGBA layer, cropped
    offset: tuple[int, int]        # the crop's top-left in the view's pixels
    pivot: tuple[float, float]     # view px
    tip: tuple[float, float]       # view px
    clone_of: str | None = None    # a far-side limb copied from the near one (side views)
    pil: Image.Image | None = field(default=None, repr=False, compare=False)

    def pil_image(self) -> Image.Image:
        if self.pil is None:
            self.pil = Image.fromarray(np.ascontiguousarray(self.image), "RGBA")
        return self.pil

    @property
    def extent(self) -> float:
        """The farthest the layer reaches from its pivot (view px): the frame margin a pose may need."""
        h, w = self.image.shape[:2]
        px, py = self.pivot[0] - self.offset[0], self.pivot[1] - self.offset[1]
        return max(math.hypot(x - px, y - py) for x in (0, w) for y in (0, h))


@dataclass
class ViewPuppet:
    view: str
    skeleton: dict                 # rig.fit_view's result
    parts: list[Part]
    size: tuple[int, int]          # the view image's (w, h)

    @property
    def facing(self) -> str:
        return self.skeleton.get("facing", "none")

    def joint(self, name: str) -> tuple[float, float]:
        if name == "hem":
            hips = self.skeleton["joints"]["hips"]
            hem_y = self.skeleton.get("hem")
            if hem_y is None:
                hem_y = self.skeleton["box"][3] - 1
            return (float(hips[0]), float(hem_y))
        x, y = self.skeleton["joints"][name]
        return (float(x), float(y))

    def part(self, name: str) -> Part | None:
        return next((p for p in self.parts if p.name == name), None)


def _seg_dist(px: np.ndarray, py: np.ndarray, a: tuple[float, float], b: tuple[float, float]) -> np.ndarray:
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    if L2 < 1e-9:
        return np.hypot(px - ax, py - ay)
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / L2, 0.0, 1.0)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy))


def _dilate(mask: np.ndarray, r: int) -> np.ndarray:
    if r <= 0:
        return mask
    out = mask.copy()
    for _ in range(r):
        m = out
        grown = m.copy()
        grown[1:] |= m[:-1]
        grown[:-1] |= m[1:]
        grown[:, 1:] |= m[:, :-1]
        grown[:, :-1] |= m[:, 1:]
        out = grown
    return out


def _darken(rgba: np.ndarray, dl: float = 0.07, chroma: float = 0.9) -> np.ndarray:
    """A far-side clone sits in shadow: a little darker and duller, in OKLab."""
    out = rgba.copy()
    opaque = rgba[..., 3] > 0
    if not opaque.any():
        return out
    lab = rgb_to_oklab(rgba[..., :3][opaque])
    lab[:, 0] = np.clip(lab[:, 0] - dl, 0.0, 1.0)
    lab[:, 1:] *= chroma
    out[..., :3][opaque] = oklab_to_rgb(lab)
    return out


def drop_shadow_line(mask: np.ndarray, skel: dict) -> np.ndarray:
    """A floor shadow sometimes survives the cutout as a thin line along the bottom, wider than the feet above it;
    the Blender road carried it into every frame. Rows in the bottom 1.5% that are twice as wide as the rows just
    above them are dropped."""
    h = mask.shape[0]
    H = float(skel["height"])
    bottom = skel["box"][3]
    band = max(2, int(0.015 * H))
    above = mask[max(bottom - 5 * band, 0): max(bottom - band, 1)].sum(axis=1)
    if len(above) == 0:
        return mask
    ref = float(np.median(above[above > 0])) if (above > 0).any() else 0.0
    if ref <= 0:
        return mask
    out = mask.copy()
    for r in range(max(bottom - band, 0), min(bottom, h)):
        if out[r].sum() > 2.0 * ref:
            out[r] = False
    return out


def assign_pixels(mask: np.ndarray, skel: dict, view: str) -> dict[str, np.ndarray]:
    """Every opaque pixel of a view to one part: the head above the neck, the garment between the hips and the hem,
    limbs by the nearest bone (scaled by the bone's thickness), the torso for the rest. Returns {part: mask}."""
    h, w = mask.shape
    H = float(skel["height"])
    J = {k: (float(v[0]), float(v[1])) for k, v in skel["joints"].items()}
    ys, xs = np.nonzero(mask)
    px, py = xs.astype(float), ys.astype(float)
    side_view = view == "side"
    skirt = bool(skel.get("skirt"))
    hem_y = skel.get("hem")
    hips_y = J["hips"][1]
    neck_y = J["neck"][1]
    scores: dict[str, np.ndarray] = {}
    for name, (a, b, kind, radius) in PART_DEFS.items():
        if kind == "garment":
            continue
        if side_view and name.endswith(("_L", "_R")):
            # a side view shows one arm and one leg; the far side is a clone made later
            near = "L" if skel.get("facing") == "left" else "R"
            if not name.endswith("_" + near):
                continue
        scores[name] = _seg_dist(px, py, J[a], J[b]) / max(radius * H, 1.0)
    names = list(scores)
    S = np.stack([scores[n] for n in names], axis=1)
    best = np.array(names, dtype=object)[S.argmin(axis=1)].astype(str)
    best_score = S.min(axis=1)
    limb_names = [n for n in names if PART_DEFS[n][2] == "limb"]
    limb_cols = [names.index(n) for n in limb_names]
    limb_best = np.array(limb_names, dtype=object)[S[:, limb_cols].argmin(axis=1)].astype(str) if limb_cols else best
    limb_score = S[:, limb_cols].min(axis=1) if limb_cols else best_score
    arm_cols = [names.index(n) for n in limb_names if "arm" in n]
    arm_score = S[:, arm_cols].min(axis=1) if arm_cols else np.full(len(px), np.inf)
    arm_best = np.array([n for n in limb_names if "arm" in n], dtype=object)[S[:, arm_cols].argmin(axis=1)].astype(str) if arm_cols else best
    out = best.copy()
    # a leg claims nothing above the hips and an arm nothing above the shoulders (cloth there is the body's)
    shoulder_y = min(J["shoulder_L"][1], J["shoulder_R"][1])
    for i, n in enumerate(names):
        if n.startswith(("thigh", "shin", "foot")):
            S[:, i] = np.where(py < hips_y, np.inf, S[:, i])
        elif "arm" in n:
            S[:, i] = np.where(py < shoulder_y - 0.02 * H, np.inf, S[:, i])
    best = np.array(names, dtype=object)[S.argmin(axis=1)].astype(str)
    limb_best = np.array(limb_names, dtype=object)[S[:, limb_cols].argmin(axis=1)].astype(str) if limb_cols else best
    limb_score = S[:, limb_cols].min(axis=1) if limb_cols else best_score
    arm_score = S[:, arm_cols].min(axis=1) if arm_cols else np.full(len(px), np.inf)
    arm_best = np.array([n for n in limb_names if "arm" in n], dtype=object)[S[:, arm_cols].argmin(axis=1)].astype(str) if arm_cols else best
    out = best.copy()
    # the head is everything above the neck (the hat and the face wrap go with it)
    head = py < neck_y
    out[head] = "head"
    # in a side view a limb claims only what lies near its bone; the body keeps the rest
    if side_view:
        far = np.isin(out, limb_names) & (limb_score > 1.15)
        out[far] = "torso"
    if skirt and hem_y is not None:
        band = (py >= hips_y) & (py <= hem_y)
        # the garment takes the band between the hips and the hem, except an arm hanging over it
        take = band & ~((arm_score < 1.0) & (py < hem_y))
        out[take] = "skirt"
        out[band & ~take] = arm_best[band & ~take]
        below = py > hem_y
        legs = [n for n in limb_names if n.startswith(("shin", "foot"))]
        if legs:
            cols = [names.index(n) for n in legs]
            lb = np.array(legs, dtype=object)[S[:, cols].argmin(axis=1)].astype(str)
            ls = S[:, cols].min(axis=1)
            out[below & (ls <= 1.0)] = lb[below & (ls <= 1.0)]
            out[below & (ls > 1.0)] = "skirt"   # shreds of the hem hang with the garment
    else:
        # no garment: nothing below the hips is the torso
        low = (py > hips_y + 0.03 * H) & (out == "torso")
        out[low] = limb_best[low]
    masks: dict[str, np.ndarray] = {}
    for n in set(out.tolist()):
        m = np.zeros((h, w), dtype=bool)
        sel = out == n
        m[ys[sel], xs[sel]] = True
        masks[n] = m
    return masks


def cut_parts(image: Image.Image, skel: dict, overlap: float = 0.012) -> list[Part]:
    """The view's painting cut into :class:`Part` layers along ``skel`` (from :func:`pixelforge.rig.fit_view`).
    ``overlap`` (a fraction of the height) is how far each part reaches into its neighbours at the seams."""
    rgba = np.asarray(image.convert("RGBA"))
    mask = drop_shadow_line(rgba[..., 3] > 127, skel)
    h, w = mask.shape
    H = float(skel["height"])
    view = skel["view"]
    masks = assign_pixels(mask, skel, view)
    grow = max(2, int(round(overlap * H)))
    J = {k: (float(v[0]), float(v[1])) for k, v in skel["joints"].items()}
    hem = (J["hips"][0], float(skel["hem"] if skel.get("hem") is not None else skel["box"][3] - 1))
    parts: list[Part] = []
    side_view = view == "side"
    near = "L" if skel.get("facing") == "left" else "R"
    far = "R" if near == "L" else "L"
    for name, (a, b, kind, _r) in PART_DEFS.items():
        if name not in masks:
            continue
        m = masks[name]
        grown = _dilate(m, grow) & mask
        layer = rgba.copy()
        layer[..., 3] = np.where(grown, rgba[..., 3], 0)
        if name == "torso":
            # what a limb or the garment hides on the body is filled from the body's own paint, so an arm that swings
            # away leaves no hole; the fill stays inside the body's column between the neck and the hips (or hem)
            top, bottom = J["neck"][1], (hem[1] if skel.get("skirt") else J["hips"][1] + 0.03 * H)
            cover = masks.get("torso", m).copy()
            for other, om in masks.items():
                if other != "torso":
                    cover |= om
            rows = np.arange(h)[:, None]
            region = cover & (rows >= top) & (rows <= bottom)
            # only columns the torso itself spans on that row (not an arm held out)
            torso_rows = np.where(m.any(axis=1))[0]
            col_lo = np.full(h, w, dtype=int)
            col_hi = np.full(h, -1, dtype=int)
            for r in torso_rows:
                cols = np.nonzero(m[r])[0]
                col_lo[r], col_hi[r] = cols.min(), cols.max()
            colgrid = np.arange(w)[None, :]
            region &= (colgrid >= col_lo[:, None]) & (colgrid <= col_hi[:, None])
            hole = region & ~grown
            if hole.any():
                filled = cleanup.bleed_edges(layer, passes=int(min(64, max(4, 0.12 * H))))
                layer[hole] = filled[hole]
                layer[..., 3][hole] = 255
        ys, xs = np.nonzero(layer[..., 3])
        if len(ys) == 0:
            continue
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
        crop = np.ascontiguousarray(layer[y0:y1, x0:x1])
        pivot = J[a] if a in J else hem
        tip = hem if b == "hem" else J[b]
        parts.append(Part(name, (a, b), kind, crop, (x0, y0), pivot, tip))
        if side_view and name.endswith("_" + near):
            # the far limb: the same paint, in shadow, bound to the other side's bones
            fname = name[:-2] + "_" + far
            fa, fb = a[:-2] + "_" + far, b[:-2] + "_" + far
            parts.append(Part(fname, (fa, fb), "clone", _darken(crop), (x0, y0), pivot, tip, clone_of=name))
    return parts


def build_view_puppet(image: Image.Image, view: str, facing: str | None = None, skirt: bool | None = None, hem_z: float | None = None) -> ViewPuppet:
    if view not in VIEW_KINDS:
        raise ValueError(f"view must be one of {VIEW_KINDS}")
    skel = fit_view(image, view, facing=facing, skirt=skirt, hem_z=hem_z)
    parts = cut_parts(image, skel)
    return ViewPuppet(view, skel, parts, image.size)


def build_puppets(views: dict[str, Image.Image], facing: dict[str, str] | None = None) -> dict[str, ViewPuppet]:
    """Every painted view cut into parts; the front (else the back) decides whether there is a skirt and where its
    hem is, so the side and back agree with it. ``facing`` may force ``side`` / ``quarter`` to left or right."""
    facing = facing or {}
    order = [v for v in ("front", "back", "side", "quarter") if v in views]
    if not order:
        raise ValueError("no views to build a puppet from (need at least views/front.png)")
    out: dict[str, ViewPuppet] = {}
    lead = build_view_puppet(views[order[0]], order[0], facing=facing.get(order[0]))
    out[order[0]] = lead
    for v in order[1:]:
        out[v] = build_view_puppet(views[v], v, facing=facing.get(v), skirt=lead.skeleton["skirt"], hem_z=lead.skeleton.get("hem_z"))
    return out


def save_view_puppet(vp: ViewPuppet, folder: str | Path) -> Path:
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("*.png"):
        old.unlink()
    parts = []
    for p in vp.parts:
        Image.fromarray(p.image, "RGBA").save(folder / f"{p.name}.png")
        parts.append({"name": p.name, "bone": list(p.bone), "kind": p.kind, "file": f"{p.name}.png", "offset": list(p.offset),
                      "pivot": [float(p.pivot[0]), float(p.pivot[1])], "tip": [float(p.tip[0]), float(p.tip[1])], "clone_of": p.clone_of})
    data = {"version": 1, "view": vp.view, "size": list(vp.size), "skeleton": vp.skeleton, "parts": parts}
    out = folder.with_suffix(".json")
    out.write_text(json.dumps(data, indent=1) + "\n")
    return out


def load_view_puppet(json_path: str | Path) -> ViewPuppet:
    json_path = Path(json_path)
    data = json.loads(json_path.read_text())
    folder = json_path.with_suffix("")
    parts = []
    for p in data["parts"]:
        img = np.asarray(Image.open(folder / p["file"]).convert("RGBA"))
        parts.append(Part(p["name"], tuple(p["bone"]), p["kind"], img, tuple(p["offset"]), tuple(p["pivot"]), tuple(p["tip"]), p.get("clone_of")))
    return ViewPuppet(data["view"], data["skeleton"], parts, tuple(data["size"]))


def parts_sheet(vp: ViewPuppet, gap: int = 12) -> Image.Image:
    """A contact sheet for a person to check the cut: the view, the parts laid out in a row, each with its pivot
    (a dot) and bone (a line)."""
    from PIL import ImageDraw

    w, h = vp.size
    tiles = []
    for p in vp.parts:
        if p.clone_of:
            continue
        ph, pw = p.image.shape[:2]
        tile = Image.new("RGBA", (pw + 2 * gap, ph + 2 * gap), (40, 40, 40, 255))
        tile.alpha_composite(p.pil_image(), (gap, gap))
        d = ImageDraw.Draw(tile)
        px, py = p.pivot[0] - p.offset[0] + gap, p.pivot[1] - p.offset[1] + gap
        tx, ty = p.tip[0] - p.offset[0] + gap, p.tip[1] - p.offset[1] + gap
        d.line([(px, py), (tx, ty)], fill=(120, 220, 255, 255), width=3)
        d.ellipse([px - 5, py - 5, px + 5, py + 5], fill=(255, 220, 80, 255))
        d.text((4, 2), p.name, fill=(230, 230, 230, 255))
        tiles.append(tile)
    width = sum(t.width for t in tiles) + gap * (len(tiles) + 1)
    height = max([t.height for t in tiles] + [1]) + 2 * gap
    sheet = Image.new("RGBA", (width, height), (24, 24, 24, 255))
    x = gap
    for t in tiles:
        sheet.alpha_composite(t, (x, gap))
        x += t.width + gap
    return sheet


# ========================================================================================================= posing
def proportions(vp: ViewPuppet, side: ViewPuppet | None = None) -> dict[str, float]:
    """Bone lengths as fractions of the figure's height, from the front (or back) fit; the foot's length from the
    side view when there is one. The skirt's length and half-width too."""
    J = {k: np.array(v, dtype=float) for k, v in vp.skeleton["joints"].items()}
    H = float(vp.skeleton["height"])

    def L(a: str, b: str) -> float:
        return float(np.linalg.norm(J[a] - J[b]) / H)

    out = {
        "hips_z": float(1.0 - (J["hips"][1] - vp.skeleton["box"][1]) / max(H - 1, 1)),
        "torso": L("hips", "neck"),
        "head": L("neck", "head_top"),
        "shoulder": (L("neck", "shoulder_L") + L("neck", "shoulder_R")) / 2,
        "upper_arm": (L("shoulder_L", "elbow_L") + L("shoulder_R", "elbow_R")) / 2,
        "lower_arm": (L("elbow_L", "wrist_L") + L("elbow_R", "wrist_R")) / 2,
        "hand": (L("wrist_L", "hand_L") + L("wrist_R", "hand_R")) / 2,
        "hip": (L("hips", "hip_L") + L("hips", "hip_R")) / 2,
        "thigh": (L("hip_L", "knee_L") + L("hip_R", "knee_R")) / 2,
        "shin": (L("knee_L", "ankle_L") + L("knee_R", "ankle_R")) / 2,
        "foot": 0.14,
    }
    if side is not None:
        SJ = {k: np.array(v, dtype=float) for k, v in side.skeleton["joints"].items()}
        SH = float(side.skeleton["height"])
        out["foot"] = float(max(0.06, np.linalg.norm(SJ["ankle_L"] - SJ["toe_tip_L"]) / SH))
    hem = vp.skeleton.get("hem")
    if vp.skeleton.get("skirt") and hem is not None:
        out["skirt"] = float((hem - J["hips"][1]) / H)
    return out


def retarget(frame: np.ndarray, lib: JointLibrary, props: dict[str, float]) -> dict[str, np.ndarray]:
    """One clip frame on the painting's proportions: every bone keeps the clip's direction and takes the painting's
    length (forward kinematics from the hips), then the lowest foot is set on the floor. Returns {joint: (x, y, z)}
    in figure-height units, plus ``hem`` under the hips when the puppet has a skirt."""
    g = lambda n: frame[lib.index[n]]
    out: dict[str, np.ndarray] = {}
    hips = g("hips").copy()
    hips[2] *= props["hips_z"] / max(lib.rest[lib.index["hips"]][2], 1e-6)
    out["hips"] = hips

    def place(child: str, parent: str, length: float, fallback=(0.0, 0.0, -1.0)) -> None:
        d = g(child) - g(parent)
        n = float(np.linalg.norm(d))
        d = d / n if n > 1e-6 else np.array(fallback, dtype=float)
        out[child] = out[parent] + d * length

    place("neck", "hips", props["torso"], (0.0, 0.0, 1.0))
    out["spine"] = out["hips"] + (out["neck"] - out["hips"]) * 0.3
    out["chest"] = out["hips"] + (out["neck"] - out["hips"]) * 0.65
    place("head_top", "neck", props["head"], (0.0, 0.0, 1.0))
    out["head"] = out["neck"] + (out["head_top"] - out["neck"]) * 0.5
    for s in SIDES:
        place(f"shoulder_{s}", "neck", props["shoulder"], (1.0 if s == "L" else -1.0, 0.0, 0.0))
        place(f"elbow_{s}", f"shoulder_{s}", props["upper_arm"])
        place(f"wrist_{s}", f"elbow_{s}", props["lower_arm"])
        place(f"hand_{s}", f"wrist_{s}", props["hand"])
        place(f"hip_{s}", "hips", props["hip"], (1.0 if s == "L" else -1.0, 0.0, 0.0))
        place(f"knee_{s}", f"hip_{s}", props["thigh"])
        place(f"ankle_{s}", f"knee_{s}", props["shin"])
        place(f"toe_tip_{s}", f"ankle_{s}", props["foot"], (0.0, -1.0, 0.0))
        out[f"toe_{s}"] = out[f"ankle_{s}"] + (out[f"toe_tip_{s}"] - out[f"ankle_{s}"]) * 0.75
    low = min(float(out[j][2]) for j in FOOT_JOINTS)
    if low < 0.08:   # a foot near the floor stands on it (a leg shorter or longer than the mannequin's never hovers or sinks)
        for v in out.values():
            v[2] -= low
    return out


def project(points: np.ndarray, yaw_deg: float, elev_deg: float, centre_xy: tuple[float, float] = (0.0, 0.0)) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Orthographic camera ``elev_deg`` above the ground looking at the figure from direction ``yaw_deg`` (the
    render script's convention: 0 = the figure faces the camera, 90 = it faces screen-left). Returns screen x
    (right), screen height (up) and depth (larger = farther), all in the points' units."""
    yaw, el = math.radians(yaw_deg), math.radians(elev_deg)
    right = np.array([math.cos(yaw), math.sin(yaw), 0.0])
    away = np.array([-math.sin(yaw), math.cos(yaw), 0.0])
    rel = points - np.array([centre_xy[0], centre_xy[1], 0.0])
    sx = rel @ right
    back = rel @ away
    sup = rel[:, 2] * math.cos(el) + back * math.sin(el)
    depth = back * math.cos(el) - rel[:, 2] * math.sin(el)
    return sx, sup, depth


def view_for_yaw(puppets: dict[str, ViewPuppet], yaw: float) -> tuple[str, bool]:
    """The painted view nearest to a direction and whether to mirror it. A side or three-quarter view faces one way
    and serves the other way mirrored; ties go to the front and back views (the face and the hat read better)."""
    cands = []
    base = {"front": 0.0, "back": 180.0, "side": 90.0, "quarter": 45.0}
    for pref, (name, vp) in enumerate(sorted(puppets.items(), key=lambda kv: ["front", "back", "quarter", "side"].index(kv[0]))):
        y = base[name]
        if name in ("side", "quarter") and vp.facing == "right":
            y = 360.0 - y
        cands.append((name, y, False, pref))
        if name in ("side", "quarter"):
            cands.append((name, (360.0 - y) % 360.0, True, pref))
    def dist(y: float) -> float:
        d = abs((yaw - y + 180.0) % 360.0 - 180.0)
        return d
    name, _, mirrored, _ = min(cands, key=lambda c: (round(dist(c[1]), 3), c[3]))
    return name, mirrored


class Spring:
    """A damped follower for secondary motion (a hem, a hat): the state chases a target and overshoots a little."""

    def __init__(self, hz: float = 2.0, damping: float = 0.4):
        self.w = 2 * math.pi * hz
        self.z = damping
        self.x: np.ndarray | None = None
        self.v: np.ndarray | None = None

    def reset(self, target: np.ndarray) -> None:
        self.x = np.array(target, dtype=float)
        self.v = np.zeros_like(self.x)

    def step(self, target: np.ndarray, dt: float) -> np.ndarray:
        if self.x is None:
            self.reset(target)
        n = max(1, int(math.ceil(dt * self.w * 2)))
        h = dt / n
        for _ in range(n):
            acc = self.w * self.w * (target - self.x) - 2 * self.z * self.w * self.v
            self.v = self.v + acc * h
            self.x = self.x + self.v * h
        return self.x.copy()


def secondary_motion(frames: list[dict[str, np.ndarray]], fps: float, loop: bool, skirt_len: float | None, hat: bool = True) -> list[dict[str, np.ndarray]]:
    """Adds the lagging joints to every retargeted frame: ``hem`` (the skirt's hem under the hips, chasing it
    through a soft spring, clamped to hang) and ``head_top_lag`` (the hat's tip, a stiffer spring). A loop is run
    twice so its first frame already carries the motion of its last."""
    if not frames:
        return frames
    dt = 1.0 / max(fps, 1e-3)
    hem_spring, hat_spring = Spring(1.6, 0.35), Spring(3.0, 0.5)
    passes = 2 if loop else 1
    out = frames
    for p in range(passes):
        out = []
        for f in frames:
            f = dict(f)
            if skirt_len:
                target = f["hips"] + np.array([0.0, 0.0, -skirt_len])
                hem = hem_spring.step(target, dt)
                lag = hem - target
                lag[:2] = np.clip(lag[:2], -0.08, 0.08)
                lag[2] = np.clip(lag[2], -0.03, 0.03)
                f["hem"] = target + lag
            if hat:
                top = hat_spring.step(f["head_top"], dt)
                lag = np.clip(top - f["head_top"], -0.05, 0.05)
                f["head_top_lag"] = f["head_top"] + lag * 0.6
            out.append(f)
    return out


# ======================================================================================================== rendering
def _affine(a_s, b_s, a_t, b_t, k: float, min_axial: float = 0.35, max_axial: float = 1.3):
    """The forward 2x3 matrix mapping view px to canvas px: pivot to pivot, the bone's direction turned to the
    projected bone's, scaled ``k`` across and ``k * foreshortening`` along it."""
    ds = (b_s[0] - a_s[0], b_s[1] - a_s[1])
    dt = (b_t[0] - a_t[0], b_t[1] - a_t[1])
    ls, lt = math.hypot(*ds), math.hypot(*dt)
    th_s = math.atan2(ds[1], ds[0]) if ls > 1e-6 else -math.pi / 2
    if lt > 1e-6:
        th_t = math.atan2(dt[1], dt[0])
        ax = min(max(lt / max(k * ls, 1e-6), min_axial), max_axial)
    else:
        th_t, ax = th_s, min_axial
    c_s, s_s = math.cos(-th_s), math.sin(-th_s)
    c_t, s_t = math.cos(th_t), math.sin(th_t)
    # M = T(a_t) R(th_t) S(k*ax, k) R(-th_s) T(-a_s)
    r1 = np.array([[c_t, -s_t], [s_t, c_t]])
    sc = np.array([[k * ax, 0.0], [0.0, k]])
    r2 = np.array([[c_s, -s_s], [s_s, c_s]])
    A = r1 @ sc @ r2
    t = np.array(a_t) - A @ np.array(a_s)
    return np.array([[A[0, 0], A[0, 1], t[0]], [A[1, 0], A[1, 1], t[1]]])


def _invert(M: np.ndarray) -> np.ndarray:
    A = M[:, :2]
    Ai = np.linalg.inv(A)
    t = -Ai @ M[:, 2]
    return np.array([[Ai[0, 0], Ai[0, 1], t[0]], [Ai[1, 0], Ai[1, 1], t[1]]])


def _bbox_of(M: np.ndarray, w: int, h: int, ox: float, oy: float) -> tuple[float, float, float, float]:
    pts = np.array([[ox, oy], [ox + w, oy], [ox, oy + h], [ox + w, oy + h]])
    out = pts @ M[:, :2].T + M[:, 2]
    return float(out[:, 0].min()), float(out[:, 1].min()), float(out[:, 0].max()), float(out[:, 1].max())


def draw_rigid(canvas: Image.Image, part: Part, M: np.ndarray, mirror_w: int | None) -> None:
    img = part.pil_image()
    w, h = img.size
    ox, oy = part.offset
    if mirror_w is not None:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        ox = mirror_w - (ox + w)
    x0, y0, x1, y1 = _bbox_of(M, w, h, ox, oy)
    X0, Y0 = max(int(math.floor(x0)), 0), max(int(math.floor(y0)), 0)
    X1, Y1 = min(int(math.ceil(x1)) + 1, canvas.width), min(int(math.ceil(y1)) + 1, canvas.height)
    if X1 <= X0 or Y1 <= Y0:
        return
    inv = _invert(M)
    # output pixel (x, y) in the box -> view px -> layer px
    a, b, c = inv[0]
    d, e, f = inv[1]
    data = (a, b, a * X0 + b * Y0 + c - ox, d, e, d * X0 + e * Y0 + f - oy)
    piece = img.transform((X1 - X0, Y1 - Y0), Image.AFFINE, data, Image.BILINEAR)
    canvas.alpha_composite(piece, (X0, Y0))


def draw_garment(canvas: Image.Image, part: Part, M: np.ndarray, mirror_w: int | None, displace, max_disp: float, cell: int = 18) -> None:
    """A garment drawn through its rigid transform plus a mesh warp: ``displace(x, y)`` gives the screen-space shift
    of the cloth at a canvas point (the hem following the legs)."""
    img = part.pil_image()
    w, h = img.size
    ox, oy = part.offset
    if mirror_w is not None:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        ox = mirror_w - (ox + w)
    x0, y0, x1, y1 = _bbox_of(M, w, h, ox, oy)
    X0, Y0 = max(int(math.floor(x0 - max_disp)), 0), max(int(math.floor(y0 - max_disp)), 0)
    X1, Y1 = min(int(math.ceil(x1 + max_disp)) + 1, canvas.width), min(int(math.ceil(y1 + max_disp)) + 1, canvas.height)
    if X1 <= X0 or Y1 <= Y0:
        return
    inv = _invert(M)
    nx, ny = max(1, int(math.ceil((X1 - X0) / cell))), max(1, int(math.ceil((Y1 - Y0) / cell)))
    xs = np.linspace(X0, X1, nx + 1)
    ys = np.linspace(Y0, Y1, ny + 1)
    gx, gy = np.meshgrid(xs, ys)
    dx, dy = displace(gx, gy)
    sx = gx - dx
    sy = gy - dy
    ux = inv[0, 0] * sx + inv[0, 1] * sy + inv[0, 2] - ox
    uy = inv[1, 0] * sx + inv[1, 1] * sy + inv[1, 2] - oy
    mesh = []
    for j in range(ny):
        for i in range(nx):
            box = (int(round(xs[i] - X0)), int(round(ys[j] - Y0)), int(round(xs[i + 1] - X0)), int(round(ys[j + 1] - Y0)))
            if box[2] <= box[0] or box[3] <= box[1]:
                continue
            quad = (float(ux[j, i]), float(uy[j, i]), float(ux[j + 1, i]), float(uy[j + 1, i]),
                    float(ux[j + 1, i + 1]), float(uy[j + 1, i + 1]), float(ux[j, i + 1]), float(uy[j, i + 1]))
            mesh.append((box, quad))
    if not mesh:
        return
    piece = img.transform((X1 - X0, Y1 - Y0), Image.MESH, mesh, Image.BILINEAR)
    canvas.alpha_composite(piece, (X0, Y0))


def _swap_side(name: str) -> str:
    if name.endswith("_L"):
        return name[:-2] + "_R"
    if name.endswith("_R"):
        return name[:-2] + "_L"
    return name


def pose_parts(vp: ViewPuppet, mirrored: bool, joints3d: dict[str, np.ndarray], yaw: float, elevation: float,
               size: int, ppu: float, z_mid: float, height: float) -> list[dict]:
    """The draw plan of one frame: for every part (far to near) its forward transform, and for a garment the hem's
    displacement field. ``size`` only places the canvas centre; with 0 the plan is centred on (0, 0)."""
    names = list(joints3d)
    P = np.stack([joints3d[n] for n in names]) * height
    cx, cy = float(P[names.index("hips")][0]), float(P[names.index("hips")][1])
    sx, sup, depth = project(P, yaw, elevation, (cx, cy))
    S2 = {n: (size / 2 + sx[i] * ppu, size / 2 - (sup[i] - z_mid) * ppu) for i, n in enumerate(names)}
    D = {n: float(depth[i]) for i, n in enumerate(names)}
    vw, vh = vp.size
    k = ppu * height / float(vp.skeleton["height"])

    def tpl(joint: str) -> tuple[float, float]:
        x, y = vp.joint(joint)
        return ((vw - x) if mirrored else x, y)

    def bone_of(part: Part) -> tuple[str, str]:
        a, b = part.bone
        return (_swap_side(a), _swap_side(b)) if mirrored else (a, b)

    def target(joint: str) -> tuple[float, float]:
        if joint == "head_top" and "head_top_lag" in S2:
            return S2["head_top_lag"]
        return S2[joint]

    has_skirt = any(p.kind == "garment" for p in vp.parts) and "hem" in S2
    torso_depth = (D["hips"] + D["neck"]) / 2
    skirt_depth = torso_depth + 0.004 if has_skirt else None
    draws = []
    for part in vp.parts:
        a, b = bone_of(part)
        if b == "hem" and "hem" not in S2:
            continue
        key = (D[a] + D[b]) / 2 if b != "hem" else skirt_depth
        base = part.name.rsplit("_", 1)[0]
        if part.name == "head":
            key = min(key, torso_depth - 0.01)
        elif part.name == "torso":
            key = torso_depth
        elif base in ("thigh", "shin", "foot") and skirt_depth is not None:
            key = max(key, skirt_depth + 0.01)
        elif base in ("upper_arm", "lower_arm"):
            key = key - 0.002   # arms beside the body stay in front of the hood's drape
        draws.append((key, part, a, b))
    draws.sort(key=lambda d: -d[0])
    plan = []
    for key, part, a, b in draws:
        a_s, b_s = tpl(part.bone[0]), tpl(part.bone[1])
        a_t, b_t = target(a), target(b)
        if part.kind == "garment":
            M = _affine(a_s, b_s, a_t, b_t, k, min_axial=0.6, max_axial=1.15)
            # the hem follows the legs: each side of the cloth takes its ankle's shift from where the painting had it
            rest = {s: (M[:, :2] @ np.array(tpl(f"ankle_{s}")) + M[:, 2]) for s in SIDES}
            delta = {s: np.array(S2[f"ankle_{s}"]) - rest[s] for s in SIDES}
            axis = np.array(b_t) - np.array(a_t)
            L = max(float(np.linalg.norm(axis)), 1e-6)
            axis_u = axis / L
            half_w = max(float(vp.skeleton["hips_width"]) * k * 0.5, 1.0)
            span = rest["L"][0] - rest["R"][0]
            gain = 1.0
            max_disp = 0.25 * height * ppu

            def displace(gx, gy, a_t=a_t, axis_u=axis_u, L=L, span=span, rest=rest, delta=delta, half_w=half_w, max_disp=max_disp):
                rx, ry = gx - a_t[0], gy - a_t[1]
                t = np.clip((rx * axis_u[0] + ry * axis_u[1]) / L, 0.0, 1.2) ** 1.2
                if abs(span) < 0.1 * half_w:
                    wl = np.full_like(gx, 0.5)
                else:
                    wl = np.clip((gx - rest["R"][0]) / span, 0.0, 1.0)
                dx = t * gain * (wl * delta["L"][0] + (1 - wl) * delta["R"][0])
                dy = t * gain * (wl * delta["L"][1] + (1 - wl) * delta["R"][1])
                n = np.hypot(dx, dy)
                over = n > max_disp
                if over.any():
                    dx = np.where(over, dx * max_disp / np.maximum(n, 1e-6), dx)
                    dy = np.where(over, dy * max_disp / np.maximum(n, 1e-6), dy)
                return dx, dy

            reach = float(min(max_disp, max(np.hypot(*delta["L"]), np.hypot(*delta["R"])) * gain))
            plan.append({"part": part, "M": M, "mirror_w": vw if mirrored else None, "displace": displace, "max_disp": reach})
        else:
            plan.append({"part": part, "M": _affine(a_s, b_s, a_t, b_t, k), "mirror_w": vw if mirrored else None})
    return plan


def plan_bounds(plan: list[dict]) -> tuple[float, float, float, float]:
    """The box a draw plan can touch (canvas px): every part's transformed layer, a garment with its reach."""
    x0 = y0 = math.inf
    x1 = y1 = -math.inf
    for d in plan:
        part, M = d["part"], d["M"]
        h, w = part.image.shape[:2]
        ox, oy = part.offset
        if d["mirror_w"] is not None:
            ox = d["mirror_w"] - (ox + w)
        bx0, by0, bx1, by1 = _bbox_of(M, w, h, ox, oy)
        r = d.get("max_disp", 0.0)
        x0, y0, x1, y1 = min(x0, bx0 - r), min(y0, by0 - r), max(x1, bx1 + r), max(y1, by1 + r)
    return x0, y0, x1, y1


def draw_plan(plan: list[dict], size: int, bg=(0, 0, 0, 0)) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    for d in plan:
        if "displace" in d:
            draw_garment(canvas, d["part"], d["M"], d["mirror_w"], d["displace"], d["max_disp"])
        else:
            draw_rigid(canvas, d["part"], d["M"], d["mirror_w"])
    return canvas


def render_frame(vp: ViewPuppet, mirrored: bool, joints3d: dict[str, np.ndarray], yaw: float, elevation: float,
                 size: int, ppu: float, z_mid: float, height: float, bg=(0, 0, 0, 0)) -> Image.Image:
    """One frame: the view's parts posed on the projected skeleton and composited far-to-near."""
    return draw_plan(pose_parts(vp, mirrored, joints3d, yaw, elevation, size, ppu, z_mid, height), size, bg)


def frame_extent(puppets: dict[str, ViewPuppet]) -> float:
    """The farthest any part reaches from its pivot, as a fraction of the figure's height (a frame margin)."""
    best = 0.0
    for vp in puppets.values():
        H = float(vp.skeleton["height"])
        for p in vp.parts:
            best = max(best, p.extent / H)
    return best


def animate(puppets: dict[str, ViewPuppet], lib: JointLibrary, clips: list[str], out_dir: str | Path, *,
            directions: list[str] | None = None, per_clip: int = 24, figure_px: float = 512, height: float = 1.8,
            elevation: float = 30.0, margin: float = 1.06, log=None) -> dict:
    """Every clip in every direction as PNG frames under ``out_dir/<clip>/<DIR>/frame_NNN.png`` plus the render
    manifest the Blender road writes (size, ppu, elevation, z_mid, fps per action), so pixelate and the exports
    need no change. ``figure_px`` is the standing figure's height in render px (3-4x the sprite's for clean cells)."""
    out_dir = Path(out_dir)
    directions = directions or DIRECTIONS
    for d in directions:
        if d not in YAW:
            raise ValueError(f"unknown direction {d!r}; choose from {DIRECTIONS}")
    lead = puppets.get("front") or next(iter(puppets.values()))
    props = proportions(lead, puppets.get("side"))
    skirt_len = props.get("skirt")
    ppu = figure_px / height
    # ---------------------------------------------------------------- every clip retargeted, with the lagging joints
    posed: dict[str, tuple[list[dict[str, np.ndarray]], float, bool, list[int]]] = {}
    for clip in clips:
        frames, fps, loop, idx = lib.sample(clip, per_clip)
        rt = [retarget(f, lib, props) for f in frames]
        rt = secondary_motion(rt, fps, loop, skirt_len)
        posed[clip] = (rt, fps, loop, idx)
    # ---------------------------------------------------------------- framing: the box every pose at every yaw can touch
    z_mid = height / 2.0
    el = math.radians(elevation)
    reach = 0.0
    for clip, (rt, _, _, _) in posed.items():
        for d in directions:
            view, mirrored = view_for_yaw(puppets, YAW[d])
            for f in rt:
                x0, y0, x1, y1 = plan_bounds(pose_parts(puppets[view], mirrored, f, YAW[d], elevation, 0, ppu, z_mid, height))
                reach = max(reach, abs(x0), abs(y0), abs(x1), abs(y1))
    size = 2 * int(math.ceil(reach * margin + 2))   # a centred square: the anchor maths of the export need the centre
    manifest = {
        "directions": list(directions), "size": size, "elevation": float(elevation), "ortho_scale": float(size / ppu), "ppu": float(ppu),
        "z_mid": float(z_mid), "z_min": 0.0, "z_max": float(height), "passes": ["color"], "fps": 24.0, "actions": {},
        "road": "pixel", "views": {v: {"facing": vp.facing, "parts": len(vp.parts)} for v, vp in puppets.items()},
        "proportions": {k: round(v, 4) for k, v in props.items()},
    }
    total = 0
    for clip, (rt, fps, loop, idx) in posed.items():
        manifest["actions"][clip] = {"frames": len(rt), "source_frames": idx, "fps": float(fps), "loop": loop}
        for d in directions:
            view, mirrored = view_for_yaw(puppets, YAW[d])
            folder = out_dir / clip / d
            folder.mkdir(parents=True, exist_ok=True)
            for old in folder.glob("frame_*.png"):
                old.unlink()
            for i, f in enumerate(rt):
                im = render_frame(puppets[view], mirrored, f, YAW[d], elevation, size, ppu, z_mid, height)
                im.save(folder / f"frame_{i:03d}.png")
                total += 1
        if log:
            log(f"PF_PROGRESS action={clip} frames={len(rt)} directions={len(directions)}")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    manifest["renders"] = total
    return manifest
