"""Describe it, get it: plain words -> a draft the editors open (a spell, skin edits, an effect, a prompt, music).

    draft("a wisp lantern spell, pale blue, slow, with embers")
    -> {"what": "spell", "spell": {...layers...}, "read": ["effect: wisp ...", ...]}
    draft("make the left eye teal with a pale glow", image="views/front.png")
    -> {"what": "skin", "ops": [...], "read": [...]}

No model is needed: a vocabulary of colours, effects, places on a figure and adjectives is enough for a first
draft, and every result is a thing the person then adjusts in the designer or the skin editor. An AI assistant with
the MCP tools can write the same structures directly for anything the vocabulary does not cover.
"""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np

from . import spell as S
from . import vfx

# colour words -> effect palette, and a hex for skin recolours
COLORS = {
    "teal": ("wisp", "#4fd1c5"), "cyan": ("wisp", "#5ae6d2"), "pale blue": ("wisp", "#9ff4ea"), "blue": ("frost", "#5c8fd6"), "ice": ("frost", "#bfe6ff"),
    "frost": ("frost", "#bfe6ff"), "white": ("white", "#f4f4f4"), "silver": ("silver", "#c9d1d9"), "grey": ("smoke", "#8a8a8a"), "gray": ("smoke", "#8a8a8a"),
    "amber": ("amber", "#e0a040"), "orange": ("amber", "#e08a30"), "gold": ("amber", "#d4af37"), "yellow": ("amber", "#e6c84a"), "fire": ("lantern", "#f0a040"),
    "lantern": ("lantern", "#f0a040"), "warm": ("lantern", "#f0a040"), "red": ("blood", "#a52a2a"), "blood": ("blood", "#7a1f1f"), "crimson": ("blood", "#8b1a1a"),
    "green": ("poison", "#4caf50"), "poison": ("poison", "#6fbf3a"), "sickly": ("poison", "#8fbf3a"), "purple": ("miasma", "#8a4fbf"), "violet": ("miasma", "#9a5fd0"),
    "magenta": ("miasma", "#c040c0"), "pink": ("miasma", "#e080c0"), "bone": ("bone", "#e8e2d2"), "ivory": ("bone", "#efe9d8"), "black": ("black", "#121214"),
    "dark": ("black", "#1a1a1e"), "shadow": ("smoke", "#2a2a30"), "smoke": ("smoke", "#6a6a70"), "ash": ("smoke", "#8a8a8a"), "iron": ("iron", "#5a5e66"),
    "rust": ("iron", "#8a4a2a"), "brown": ("iron", "#6b4a2a"), "paper": ("paper", "#e6dcc0"), "miasma": ("miasma", "#8a4fbf"), "wisp": ("wisp", "#9ff4ea"),
}
# effect words -> vfx kinds
EFFECTS = {
    "fire": "fire", "flame": "fire", "flames": "fire", "burning": "fire", "smoke": "smoke", "smoky": "smoke", "wisp": "wisp", "wisps": "wisp", "spirit": "wisp",
    "burst": "burst", "explosion": "burst", "explode": "burst", "blast": "burst", "embers": "embers", "ember": "embers", "sparks": "embers", "spark": "embers",
    "ring": "ring", "circle": "circle", "halo": "ring", "bolt": "bolt", "beam": "bolt", "lightning": "lightning", "thunder": "lightning", "slash": "slash",
    "cut": "slash", "cloud": "cloud", "puff": "cloud", "dust": "cloud", "shards": "shards", "shatter": "shards", "splinters": "shards", "pillar": "pillar",
    "column": "pillar", "decal": "decal", "scorch": "decal", "stain": "decal", "drip": "drip", "drips": "drip", "dripping": "drip", "flash": "flash",
    "ward": "ward", "shield": "ward", "barrier": "ward", "vortex": "vortex", "whirl": "vortex", "swirl": "vortex", "rain": "rain", "ashfall": "ashfall",
    "falling ash": "ashfall", "fog": "fog", "mist": "fog", "swarm": "swarm", "flies": "swarm", "chain": "chain", "chains": "chain", "rune": "rune",
    "sigil": "rune", "glyph": "rune", "pool": "pool", "puddle": "pool", "glow": "cookie", "light": "cookie", "aura": "ring",
    "bone spear": "bone_spear", "spear": "bone_spear", "teeth": "teeth", "tooth": "teeth", "ice bolt": "ice_bolt", "frost bolt": "ice_bolt",
    "fire bolt": "fire_bolt", "fireball": "fire_bolt", "missile": "bone_spear", "projectile": "bone_spear", "dart": "teeth",
}
PLACES = {"eye": "eye", "eyes": "eyes", "left eye": "eye_left", "right eye": "eye_right", "hand": "hand", "hands": "hands", "left hand": "hand_left",
          "right hand": "hand_right", "head": "head", "hood": "head", "hat": "head", "helm": "head", "feet": "feet", "foot": "feet", "ground": "feet",
          "chest": "chest", "body": "chest", "robe": "chest", "cloak": "chest", "cape": "back", "armour": "chest", "armor": "chest", "back": "back", "lantern": "lantern", "lamp": "lantern", "mouth": "mouth", "face": "face", "shoulder": "shoulder", "shoulders": "shoulders"}
SIZE = {"tiny": 0.3, "small": 0.5, "little": 0.5, "medium": 1.0, "big": 1.5, "large": 1.5, "huge": 2.2, "massive": 2.6}
SPEED = {"slow": 0.5, "slowly": 0.5, "lazy": 0.5, "drifting": 0.5, "fast": 1.8, "quick": 1.8, "rapid": 2.0, "flickering": 1.6}
STRENGTH = {"faint": 0.35, "subtle": 0.4, "soft": 0.5, "pale": 0.55, "bright": 0.9, "strong": 1.0, "intense": 1.0, "blazing": 1.0}
SPELL_WORDS = {"fireball": "fireball", "ward": "ward", "drain": "soul_drain", "soul": "soul_drain", "shatter": "bone_shatter", "strike": "lightning_strike",
               "lightning strike": "lightning_strike", "bolt from": "lightning_strike"}


def _find(text: str, table: dict) -> list[str]:
    found = []
    for k in sorted(table, key=len, reverse=True):   # longest phrase first ("pale blue" before "blue")
        if re.search(r"\b" + re.escape(k) + r"\b", text):
            if not any(k in f for f in found):
                found.append(k)
    return found


def classify(text: str) -> str:
    t = text.lower()
    nouns = "|".join(re.escape(k) for k in list(PLACES) + ["robe", "cloak", "skin", "armour", "armor", "trim", "cord", "cords", "hair", "beard", "cape", "belt", "boots"])
    if re.search(r"\b(" + nouns + r")\b", t) and re.search(r"\b(make|turn|paint|recolou?r|change|give|add|erase|remove|darken|lighten|brighten|dim|tint)\b", t):
        return "skin"
    if re.search(r"\b(music|song|tune|cue|theme|track|drums?|melody)\b", t):
        return "music"
    if re.search(r"\b(prompt|midjourney|paint me|sheet|turnaround|concept)\b", t):
        return "prompt"
    figure = (r"\b(character|hero|heroine|monster|creature|boss|npc|villager|warrior|knight|skeleton|undead|zombie|ghoul|wraith|mage|wizard|"
              r"witch|necromancer|priest|monk|archer|rogue|assassin|paladin|barbarian|soldier|guard|king|queen|lord|lady|hunter|golem|"
              r"demon|beast|wolf|spider|dragon|giant|ogre|troll|goblin|orc|lich|vampire|cultist|pilgrim|keeper|mystic|building|tree|"
              r"gravestone|statue|altar|shrine|house|tower|gate|bridge|cart|wagon|barrel|chest|lantern post)\b")
    person = r"\b(he|she|they|his|her|their|wearing|wears|wields|wielding|welding|armou?r|armored|sword|axe|spear|bow|staff|shield|helm|helmet|robe|cloak)\b"
    if (re.search(figure, t) or re.search(person, t)) and not re.search(r"\bspell\b", t) and not re.search(r"\b(make|turn|paint|recolou?r|erase)\b", t):
        return "prompt"
    if _find(t, EFFECTS) or _find(t, SPELL_WORDS) or re.search(r"\bspell\b", t):
        return "spell"
    return "spell"


def draft_spell(text: str) -> dict:
    t = text.lower()
    read = []
    preset = next((SPELL_WORDS[w] for w in _find(t, SPELL_WORDS)), None)
    name = re.sub(r"[^a-z0-9]+", "_", t).strip("_")[:24] or "spell"
    colors = _find(t, COLORS)
    palette = COLORS[colors[0]][0] if colors else "lantern"
    if colors:
        read.append(f"colour: {colors[0]} -> palette {palette}")
    effects = [EFFECTS[w] for w in _find(t, EFFECTS)]
    effects = list(dict.fromkeys(effects))
    scale = next((SIZE[w] for w in _find(t, SIZE)), 1.0)
    speed = next((SPEED[w] for w in _find(t, SPEED)), 1.0)
    strength = next((STRENGTH[w] for w in _find(t, STRENGTH)), None)
    if preset:
        sp = S.new_spell(name, preset)
        read.append(f"starting from the {preset} preset")
        for lyr in sp["layers"]:
            if colors:
                lyr["palette"] = palette
            lyr["speed"] = speed
            lyr["scale"] = round(lyr.get("scale", 1.0) * scale, 2)
            if strength is not None:
                lyr["opacity"] = strength
    else:
        sp = {"name": name, "size": [96, 72], "frames": 12, "fps": 12, "loop": True, "anchor": [48, 60], "layers": []}
        kinds = effects or ["wisp"]
        for i, k in enumerate(kinds):
            lyr = {**S.LAYER_DEFAULTS, "name": k, "kind": k, "palette": palette, "scale": scale, "speed": speed}
            if strength is not None:
                lyr["opacity"] = strength
            if k in ("embers", "smoke", "cloud", "fog") and i > 0:
                lyr["y"] = -8; lyr["opacity"] = min(lyr["opacity"], 0.8)   # a trailing or ambient layer sits behind, a touch lower
            if re.search(r"\b(behind|trail|trailing|tail)\b", t) and i > 0:
                lyr["x"] = -20
            if re.search(r"\b(above|over|overhead)\b", t) and i > 0:
                lyr["y"] = -24
            if re.search(r"\b(around|surround|orbit|circling)\b", t) and k in ("ring", "circle", "wisp"):
                lyr["scale"] = max(lyr["scale"], 1.3)
            if re.search(r"\b(glow|glowing|bright|shining)\b", t) and k in vfx.GLOW_KINDS | {"smoke", "cloud", "fog"}:
                lyr["blend"] = "add" if k not in ("smoke", "cloud", "fog") else "normal"
                lyr["glow"] = True
            sp["layers"].append(lyr)
        read.append("layers: " + ", ".join(kinds))
        if any(k in vfx.MISSILES for k in kinds):
            read.append("a missile: export with rotations (pixelforge vfx <kind> --rotations 16) for a projectile the game turns")
    if scale != 1.0:
        read.append(f"size x{scale}")
    if speed != 1.0:
        read.append(f"speed x{speed}")
        sp["fps"] = max(4, min(24, round(12 * speed)))
    if strength is not None:
        read.append(f"strength {strength}")
    if re.search(r"\b(once|single|one[- ]shot|impact|hit)\b", t):
        sp["loop"] = False
        read.append("plays once")
    return {"what": "spell", "spell": sp, "read": read}


# ---------------------------------------------------------------- skin edits
def find_feature(rgba: np.ndarray, name: str) -> dict | None:
    """Where a named part sits on a cutout, from the picture alone: eyes are the small saturated bright blobs in
    the top third; head / chest / feet are bands; hands are the extremes of the middle band; lantern is the
    brightest warm blob. Returns {"at": [x, y], "radius": r} or None."""
    from scipy import ndimage

    a = rgba[..., 3] > 0
    ys, xs = np.nonzero(a)
    if len(ys) == 0:
        return None
    top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()
    h = bottom - top + 1
    w = right - left + 1
    rgb = rgba[..., :3].astype(int)
    if name in ("eye", "eyes", "eye_left", "eye_right"):
        band = np.zeros_like(a); band[top:top + h // 3] = True
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        bright = rgb.max(axis=2)
        cand = a & band & (sat > 90) & (bright > 150)
        lab, n = ndimage.label(cand)
        if n == 0:
            cand = a & band & (bright > 200)
            lab, n = ndimage.label(cand)
        if n == 0:
            return None
        sizes = ndimage.sum(cand, lab, range(1, n + 1))
        order = np.argsort(sizes)[::-1][:2]
        blobs = []
        for i in order:
            yy, xx = np.nonzero(lab == i + 1)
            blobs.append((float(xx.mean()), float(yy.mean()), max(3.0, float(np.sqrt(sizes[i]) * 1.2))))
        blobs.sort()
        if name == "eye_left":   # the viewer's left
            x, y, r = blobs[0]
        elif name == "eye_right":
            x, y, r = blobs[-1]
        elif name == "eyes":
            return {"points": [[int(b[0]), int(b[1])] for b in blobs], "radius": int(max(b[2] for b in blobs))}
        else:
            x, y, r = blobs[0]
        return {"at": [int(x), int(y)], "radius": int(r)}
    if name in ("head", "face", "mouth"):
        yy = top + h * (0.08 if name == "head" else 0.14 if name == "face" else 0.2)
        row = np.nonzero(a[int(yy)])[0]
        return {"at": [int(row.mean()) if len(row) else int((left + right) / 2), int(yy)], "radius": int(w * 0.12)}
    if name in ("chest", "back", "shoulders", "shoulder"):
        yy = top + h * (0.3 if name != "shoulders" else 0.22)
        row = np.nonzero(a[int(yy)])[0]
        return {"at": [int(row.mean()), int(yy)], "radius": int(w * 0.18)}
    if name == "feet":
        return {"at": [int((left + right) / 2), int(bottom - h * 0.03)], "radius": int(w * 0.25)}
    if name in ("hand", "hands", "hand_left", "hand_right"):
        band = a[int(top + h * 0.35):int(top + h * 0.65)]
        cols = np.nonzero(band.any(axis=0))[0]
        if len(cols) == 0:
            return None
        yy = int(top + h * 0.5)
        pts = [[int(cols.min() + 4), yy], [int(cols.max() - 4), yy]]
        if name == "hand_left":
            return {"at": pts[0], "radius": int(w * 0.06)}
        if name == "hand_right":
            return {"at": pts[1], "radius": int(w * 0.06)}
        if name == "hands":
            return {"points": pts, "radius": int(w * 0.06)}
        return {"at": pts[0], "radius": int(w * 0.06)}
    if name == "lantern":
        warm = a & (rgb[..., 0] > 170) & (rgb[..., 0] > rgb[..., 2] + 40)
        lab, n = ndimage.label(warm)
        if n == 0:
            return None
        sizes = ndimage.sum(warm, lab, range(1, n + 1))
        i = int(np.argmax(sizes)) + 1
        yy, xx = np.nonzero(lab == i)
        return {"at": [int(xx.mean()), int(yy.mean())], "radius": int(max(4, np.sqrt(sizes[i - 1]) * 1.2))}
    return None


def draft_skin(text: str, image: str | Path | None = None) -> dict:
    t = text.lower()
    read, ops = [], []
    places = _find(t, PLACES)
    place = PLACES[places[0]] if places else None
    colors = [c for c in _find(t, COLORS) if c not in PLACES]   # "lantern" names the place here, not the colour
    color_hex = COLORS[colors[0]][1] if colors else None
    glow = bool(re.search(r"\b(glow|glowing|light|lit|shine|shining)\b", t))
    strength = next((STRENGTH[w] for w in _find(t, STRENGTH)), 0.5)
    erase = bool(re.search(r"\b(erase|remove|delete|cut away)\b", t))
    darker = bool(re.search(r"\b(darker|darken|dim)\b", t))
    lighter = bool(re.search(r"\b(lighter|lighten|brighten|brighter)\b", t))
    targets = []
    regions = {}
    if image is not None and Path(image).exists():
        from PIL import Image

        from .skin_ops import load_regions

        rgba = np.array(Image.open(image).convert("RGBA"))
        regions = load_regions(image)
        if place and place in regions:
            targets.append({"region": place})
            read.append(f"target: your region '{place}'")
        elif place:
            f = find_feature(rgba, place)
            if f is None:
                read.append(f"could not find the {places[0]} on the picture; place it by hand in the skin editor")
            elif "points" in f:
                targets = [{"at": p, "radius": f["radius"]} for p in f["points"]]
                read.append(f"target: {places[0]} found at {f['points']}")
            else:
                targets.append({"at": f["at"], "radius": f["radius"]})
                read.append(f"target: {places[0]} found at {f['at']}")
    elif place:
        read.append(f"target: {places[0]} (open a picture to locate it; or name a region)")
        targets.append({"region": place})
    if not targets:
        targets.append({})
        read.append("target: the whole picture")
    for tg in targets:
        if erase:
            op = {"op": "erase", **tg}
            if "at" in op:
                op["radius"] = max(2, op.get("radius", 6))
            ops.append(op)
            continue
        if color_hex:
            op = {"op": "recolor", "to": color_hex, "range": 0.14}
            if "at" in tg:
                op["at"] = tg["at"]; op["radius"] = int(tg.get("radius", 6) * 3)
            elif "region" in tg:
                op["region"] = tg["region"]
            if darker:
                op["lightness"] = -0.12
            if lighter:
                op["lightness"] = 0.12
            ops.append(op)
        elif darker or lighter:
            op = {"op": "lightness", "amount": -0.12 if darker else 0.12, **tg}
            ops.append(op)
        if glow and "at" in tg:
            ops.append({"op": "glow", "at": tg["at"], "color": color_hex or "#9ff4ea", "radius": int(tg.get("radius", 6) * 2.5), "strength": strength})
    if colors:
        read.append(f"colour: {colors[0]} ({color_hex})")
    if glow:
        read.append(f"glow, strength {strength}")
    if erase:
        read.append("erase")
    return {"what": "skin", "ops": ops, "read": read, "regions": sorted(regions)}


def draft_prompt(text: str) -> dict:
    from .world_prompts import WORLD_KINDS, build_world_prompt

    t = text.lower()
    kind = "object"
    for k in ("building", "tree", "ground", "effect", "ui", "icons", "portrait", "topdown"):
        if re.search(r"\b" + k + r"\b", t):
            kind = k
    objects = r"\b(building|tree|gravestone|statue|altar|shrine|house|tower|gate|bridge|cart|wagon|barrel|chest|lantern post|ground|effect|ui|icons|portrait|topdown)\b"
    if not re.search(objects, t) or re.search(r"\b(character|hero|monster|creature|boss|figure|warrior|knight|skeleton|undead|he|she|wields|wielding|welding|wearing)\b", t):
        from .prompts import build_prompt

        desc = re.sub(r"^(a |an |paint me |prompt for |make |hero: |character: )", "", text.strip(), flags=re.I)
        desc = re.sub(r"\bwelding\b", "wielding", desc, flags=re.I)   # the common slip
        return {"what": "prompt", "prompt": build_prompt("sheet", desc), "read": [f"character sheet prompt (A, three views) for: {desc}",
                "paste it into Midjourney; use Copy A2 in the Studio for the four-view version"]}
    desc = re.sub(r"^(a |an |paint me |prompt for |make )", "", text.strip(), flags=re.I)
    return {"what": "prompt", "prompt": build_world_prompt(kind, desc, ""), "read": [f"world prompt, kind {kind}: {desc}"], "kinds": [k.key for k in WORLD_KINDS]}


def draft_music(text: str) -> dict:
    from . import music

    t = text.lower()
    read = []
    key = "a1_town"
    act = re.search(r"\bact\s*([1-5])\b", t)
    a = int(act.group(1)) if act else 1
    place = "town"
    if re.search(r"\b(wild|wilds|forest|moor|field|outdoors|wilderness)\b", t):
        place = "wild"
    if re.search(r"\b(deep|crypt|dungeon|cave|tomb|barrow|underground)\b", t):
        place = "deep"
    if re.search(r"\b(boss|great one|fight)\b", t):
        key = f"boss{a}"
    elif re.search(r"\btitle\b", t):
        key = "title"
    else:
        key = f"a{a}_{place}"
    knobs = {}
    if re.search(r"\b(slow|slower|sombre|somber|mournful|funeral)\b", t):
        knobs["bpm"] = round(music.CUES[key].bpm * 0.8)
    if re.search(r"\b(fast|faster|urgent|driving)\b", t):
        knobs["bpm"] = round(music.CUES[key].bpm * 1.2)
    if re.search(r"\b(dark|darker|menacing|dread|ominous)\b", t):
        knobs["sc"] = "phr"
    if re.search(r"\b(eastern|desert|arab|exotic)\b", t):
        knobs["sc"] = "hij"
    if re.search(r"\b(hopeful|lighter|brighter|warm)\b", t):
        knobs["sc"] = "dor"
    if re.search(r"\b(windy|wind|storm)\b", t):
        knobs["wind"] = round(music.CUES[key].wind * 2 + 0.01, 3)
    if re.search(r"\b(another|different|new) (tune|melody|version)\b", t):
        knobs["seed"] = music.CUES[key].seed + 1
    read.append(f"cue {key}" + (f" with {knobs}" if knobs else ""))
    return {"what": "music", "cue": key, "knobs": knobs, "read": read}


def draft(text: str, image: str | Path | None = None, what: str | None = None) -> dict:
    """The dispatcher: ``what`` forces spell | skin | prompt | music; otherwise the words decide."""
    what = what or classify(text)
    if what == "skin":
        return draft_skin(text, image)
    if what == "prompt":
        return draft_prompt(text)
    if what == "music":
        return draft_music(text)
    return draft_spell(text)
