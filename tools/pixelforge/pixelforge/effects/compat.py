"""The compatibility shim: the old ``vfx`` kinds and ``spell`` files rendered by the effects engine.

Old callers keep their words. ``make_vfx("fire", "f", out)`` and ``pixelforge vfx fire`` still mean a fire; here they
reach the library's ``flame`` with its levers, and a spell file's layers (``kind``, ``palette``, ``scale``, ``x``,
``y``, ``start``, ``speed``, ``opacity``, ``blend``, ``seed``) become one graph of ``effect`` layers. The functions
mirror the old module's signatures and result keys (``ok``, ``png``, ``json``, ``size``, ``frames``, ``fps``,
``loop``, ``gif``, ``atlas``), so the Forge, the add-on and the describe line need no change. ``pixelforge.vfx`` and
``pixelforge.spell`` themselves are untouched: the old road still runs when someone asks for it by module.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

__all__ = ["KIND_MAP", "resolve_kind", "make_vfx", "render_spell", "export_spell", "spell_graph", "new_spell", "KINDS", "PRESETS"]

# old vfx kind -> (library effect, lever overrides, palette or None for the effect's own)
KIND_MAP: dict[str, tuple[str, dict, str | None]] = {
    "fire": ("flame", {}, None),
    "smoke": ("poison_cloud", {"density": 0.8}, "smoke"),
    "wisp": ("soul_wisps", {}, None),
    "burst": ("spark_burst", {}, None),
    "embers": ("ember", {}, None),
    "ring": ("portal", {"spin": 0.0}, "wisp"),
    "bolt": ("arc", {}, None),
    "slash": ("saber", {"hum": 0.5}, None),
    "circle": ("portal", {}, None),
    "cloud": ("poison_cloud", {}, "smoke"),
    "shards": ("bone_shards", {}, None),
    "pillar": ("holy_beam", {}, None),
    "decal": ("blood_pool", {}, "bone"),
    "drip": ("drips", {}, None),
    "flash": ("flare", {"rays": 0.6}, None),
    "ward": ("portal", {"spin": 0.5}, "wisp"),
    "vortex": ("portal", {"spin": 2.5}, None),
    "rain": ("rain", {}, None),
    "ashfall": ("snow", {"speed": 0.5}, "ash"),
    "fog": ("fog", {}, None),
    "lightning": ("arc", {"forks": 2.0}, None),
    "swarm": ("dust_motes", {"speed": 1.5}, None),
    "chain": ("soul_drain", {}, None),
    "rune": ("sparkle", {"size": 1.4}, None),
    "pool": ("blood_pool", {}, "miasma"),
    "cookie": ("holy_beam", {"width": 2.0}, "white"),
    "nova": ("spark_burst", {"spread": 2.0}, None),
    "firewall": ("flame", {"size": 2.0}, None),
    "bone_burst": ("bone_shards", {"force": 1.5}, None),
    "bone_spear": ("saber", {"length": 1.2, "hum": 0.0}, "bone"),
    "teeth": ("saber", {"length": 0.6, "hum": 0.0}, "bone"),
    "ice_bolt": ("saber", {"length": 1.0, "hum": 0.5}, "frost"),
    "fire_bolt": ("saber", {"length": 1.0, "hum": 1.0}, "fire"),
    "bone_armor_front": ("sparkle", {"count": 1.5}, "bone"),
    "bone_armor_back": ("sparkle", {"count": 1.0}, "bone"),
    "bone_shard_aura_front": ("bone_shards", {"pieces": 1.5, "force": 0.5}, None),
    "bone_shard_aura_back": ("bone_shards", {"pieces": 1.0, "force": 0.4}, None),
}

# the editor's old anchor words that are not vfx kinds
KIND_MAP.update({"fireball": ("flame", {"heat": 1.4}, None), "bone_shatter": ("bone_shards", {}, None), "lightning_strike": ("arc", {"forks": 2.5}, None),
                 "soul_drain": ("soul_drain", {}, None)})

KINDS = tuple(KIND_MAP)


def resolve_kind(kind: str) -> tuple[str, dict, str | None]:
    """A library name passes through; an old kind is mapped; anything else is an error naming both lists."""
    from .library import EFFECTS
    if kind in EFFECTS:
        return kind, {}, None
    if kind in KIND_MAP:
        return KIND_MAP[kind]
    raise KeyError(f"no effect or old kind named {kind!r}; effects: {', '.join(sorted(EFFECTS))}; old kinds: {', '.join(sorted(KIND_MAP))}")


def make_vfx(kind: str, name: str, out_dir, *, size=None, frames=None, fps=None, palette=None, bands=None, seed: int = 1, glow=None, haze=None,
             gif: bool = False, atlas_dir=None, rotations: int = 0, style=None) -> dict:
    """``vfx.make_vfx``'s signature, the effects engine underneath. ``bands``, ``glow``, ``haze`` and ``style`` are
    accepted and recorded; the graph's ramps decide the look."""
    from .library import render_effect
    effect, levers, pal = resolve_kind(kind)
    if isinstance(palette, (list, tuple)):
        pal = ",".join(palette)
    elif palette:
        pal = palette
    r = render_effect(effect, out_dir, levers=levers, size=size, frames=frames, fps=fps, seed=seed, gif=gif, rotations=rotations, out_name=name, palette=pal)
    if not r.get("ok"):
        return r
    meta_path = Path(r["json"])
    meta = json.loads(meta_path.read_text())
    meta.update({"kind": kind, "effect": effect, "bands": bands, "glow": bool(glow) if glow is not None else False, "haze": bool(haze) if haze is not None else False,
                 **({"style": style} if style else {})})
    meta_path.write_text(json.dumps(meta, indent=2) + "\n")
    r["kind"] = kind
    if atlas_dir:
        from ..vfx import export_vfx_set
        from PIL import Image
        sheet = np.asarray(Image.open(r["png"]).convert("RGBA"))
        n = int(r["frames"])
        fw = sheet.shape[1] // n
        seq = [sheet[:, i * fw:(i + 1) * fw] for i in range(n)]
        r["atlas"] = export_vfx_set(seq, name, atlas_dir, fps=float(r["fps"]), loop=bool(r["loop"]), anchor=meta["anchor"])
    return r


# ------------------------------------------------------------------ spells
def _presets() -> dict:
    from ..spell import PRESETS
    return PRESETS


def new_spell(name: str, preset: str = "fireball") -> dict:
    from ..spell import new_spell as _new
    return _new(name, preset)


def spell_graph(spell: dict) -> dict:
    """A spell file as an effects graph: one ``effect`` layer per spell layer, stacked with the spell's blends."""
    from ..spell import LAYER_DEFAULTS
    W, H = spell["size"]
    n = int(spell["frames"])
    nodes, images, blends, opacities = [], [], [], []
    for i, lyr in enumerate(spell["layers"]):
        lyr = {**LAYER_DEFAULTS, **lyr}
        if lyr.get("hidden"):
            continue
        if lyr["kind"] == "image":
            nodes.append({"id": f"l{i}", "op": "picture", "path": lyr.get("image", ""), "frames": n})
        else:
            effect, levers, pal = resolve_kind(lyr["kind"])
            lv = dict(levers)
            lv_table = __import__("pixelforge.effects.library", fromlist=["EFFECTS"]).EFFECTS[effect]["levers"]
            if "speed" in lv_table and float(lyr["speed"]) != 1.0:
                lv["speed"] = float(lyr["speed"])
            pal = lyr["palette"] if lyr.get("palette") not in (None, "", "auto") else pal
            spec = {"id": f"l{i}", "op": "effect", "name": effect, "levers": lv, "dx": float(lyr["x"]), "dy": float(lyr["y"]), "scale": float(lyr["scale"]),
                    "start": int(lyr["start"]), "seed": int(lyr["seed"]), "angle": float(lyr["rotation"]), "flip_x": bool(lyr["flip"])}
            if pal:
                spec["palette"] = pal
            nodes.append(spec)
        images.append(f"@l{i}")
        blends.append("add" if lyr["blend"] == "add" else "normal")
        opacities.append(float(lyr["opacity"]))
    nodes.append({"id": "final", "op": "layers", "images": images, "blends": blends, "opacities": opacities})
    return {"size": [int(W), int(H)], "frames": n, "fps": float(spell.get("fps", 12)), "loop": bool(spell.get("loop", True)), "seed": int(spell.get("seed", 1)),
            "anchor": list(spell.get("anchor", [W // 2, H // 2])), "levers": {}, "nodes": nodes, "out": "@final"}


def render_spell(spell: dict) -> list[np.ndarray]:
    """``spell.render_spell``: the frames of the strip, by the engine."""
    from .output import frames_of
    fr, _, _ = frames_of(spell_graph(spell))
    return fr


def export_spell(spell: dict, out_dir, gif: bool = False, atlas_dir=None) -> dict:
    """``spell.export_spell``: the strip + json (+ GIF, atlas) and the editable ``.spell.json``."""
    from ..spell import save_spell
    from .output import render_graph
    name = spell["name"]
    g = spell_graph(spell)
    r = render_graph(g, name, out_dir, gif=gif, kind="spell", extra={"layers": [l.get("kind") for l in spell["layers"]], "glow": True})
    r["spell"] = save_spell(spell, Path(out_dir) / f"{name}.spell.json")
    if atlas_dir:
        from ..vfx import export_vfx_set
        fr = render_spell(spell)
        r["atlas"] = export_vfx_set(fr, name, atlas_dir, fps=float(r["fps"]), loop=bool(r["loop"]), anchor=g["anchor"])
    return r


def __getattr__(name: str):
    if name == "PRESETS":
        return _presets()
    raise AttributeError(name)
