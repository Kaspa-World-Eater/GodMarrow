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

import json
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
    "nova": "nova", "wave": "nova", "wall": "firewall", "fire wall": "firewall", "impact": "bone_burst", "hit": "bone_burst",
}
PLACES = {"eye": "eye", "eyes": "eyes", "left eye": "eye_left", "right eye": "eye_right", "hand": "hand", "hands": "hands", "left hand": "hand_left",
          "right hand": "hand_right", "head": "head", "hood": "head", "hat": "head", "helm": "head", "feet": "feet", "foot": "feet", "ground": "feet",
          "chest": "chest", "body": "chest", "robe": "chest", "cloak": "chest", "cape": "back", "armour": "chest", "armor": "chest", "back": "back", "lantern": "lantern", "lamp": "lantern", "mouth": "mouth", "face": "face", "shoulder": "shoulder", "shoulders": "shoulders"}
SIZE = {"tiny": 0.3, "small": 0.5, "little": 0.5, "medium": 1.0, "big": 1.5, "large": 1.5, "huge": 2.2, "massive": 2.6}
SPEED = {"slow": 0.5, "slowly": 0.5, "lazy": 0.5, "drifting": 0.5, "fast": 1.8, "quick": 1.8, "rapid": 2.0, "flickering": 1.6}
STRENGTH = {"faint": 0.35, "subtle": 0.4, "soft": 0.5, "pale": 0.55, "bright": 0.9, "strong": 1.0, "intense": 1.0, "blazing": 1.0}
SPELL_WORDS = {"fireball": "fireball", "ward": "ward", "drain": "soul_drain", "soul drain": "soul_drain", "shatter": "bone_shatter", "strike": "lightning_strike",
               "lightning strike": "lightning_strike", "bolt from": "lightning_strike", "frost nova": "frost_nova", "ice nova": "frost_nova",
               "fire wall": "fire_wall", "firewall": "fire_wall", "corpse": "corpse_burst", "corpse explosion": "corpse_burst", "spear hit": "bone_spear_hit"}


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
    if re.search(r"\b(shape sprite|shapes|draw (him|her|it|a|an|the)|as shapes|solid sprite)\b", t):
        return "shapes"
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


# ---------------------------------------------------------------------------------------------- shape sprites
# costume words -> what they add to the humanoid; materials by word; colours as ramps of the library
SHAPE_MATERIALS = {
    "iron": "iron7", "steel": "steel", "plate": "steel", "armour": "steel", "armor": "steel", "mail": "iron7", "lacquer": "lacquer", "lacquered": "lacquer",
    "gold": "gold6", "golden": "gold6", "brass": "gold6", "bone": "bone6", "skull": "bone6", "leather": "leather5", "hide": "leather5", "wood": "wood5",
    "wooden": "wood5", "straw": "straw", "rope": "rope", "cord": "rope", "cords": "rope", "fur": "fur", "cloth": "cloth", "linen": "tabard", "grey": "tabard",
    "gray": "tabard", "black": "rag", "dark": "cloth", "crimson": "crimson", "red": "crimson", "blood": "crimson", "violet": "violet", "purple": "violet",
    "mauve": "wrap", "wrapped": "wrap", "wrappings": "wrap", "bandages": "wrap", "bandaged": "wrap", "rags": "rag", "tattered": "rag", "ragged": "rag",
    "silver": "steel", "skin": "skin", "pale": "bone6",
}
SHAPE_GLOWS = {"green": "soul", "soul": "soul", "fire": "ember", "flame": "ember", "ember": "ember", "amber": "ember", "violet": "miasma", "purple": "miasma",
               "miasma": "miasma", "blue": "frost", "frost": "frost", "ice": "frost", "white": "frost", "cold": "frost"}


def _material_near(words: list[str], noun_pattern: str, default: str) -> str:
    """The material word closest before a noun ("dark lacquered armour" -> lacquer)."""
    t = " ".join(words)
    m = re.search(r"((?:\w+\s+){0,3})\b(" + noun_pattern + r")\b", t)
    if not m:
        return default
    before = m.group(1).split()
    for w in reversed(before):
        if w in SHAPE_MATERIALS:
            return SHAPE_MATERIALS[w]
    return default


def draft_shapes(text: str, out: str | Path | None = None, height: int = 120) -> dict:
    """A sentence -> a starter solid .shapes.json: a humanoid drawn around the author pose, with the costume words of
    the sentence as parts (hat, hood, cape, cloak, robe, skirt, armour, pauldrons, belt, boots, staff, sword, shield,
    gourds, cords) in the materials the words name. It is a draft to edit: move the shapes, change the ramps."""
    from . import shape_rig

    t = text.lower()
    words = re.findall(r"[a-z']+", t)
    read = []
    tpl = shape_rig.template(height)
    B = tpl["bones"]
    cx = tpl["axis"][0]
    W = tpl["size"][0]
    head_y = B["head"]["head"][1]; top_y = B["head"]["tail"][1]
    hips_y = B["hips"]["head"][1]; ground = tpl["ground"]
    shapes: list[dict] = []
    parts: dict = {}

    def add(**kw):
        shapes.append(kw)

    body_mat = _material_near(words, "robe|robes|coat|tunic|dress|gown|shirt|jerkin|cloth|body", "cloth")
    armour_mat = _material_near(words, "armou?r|plate|mail|cuirass|breastplate", "steel")
    has_armour = bool(re.search(r"\b(armou?r|plate|mail|cuirass|breastplate)\b", t))
    legs_mat = _material_near(words, "legs|trousers|breeches|leggings|greaves", body_mat)
    boots_mat = _material_near(words, "boots|shoes|feet|sandals", "leather5" if not re.search(r"\bwrapped feet\b", t) else "wrap")
    skin_mat = "shadowskin" if re.search(r"\b(dark skin|shadow|undead|wraith|ghoul)\b", t) else "skin"
    # head
    hood = bool(re.search(r"\b(hood|hooded|cowl|veil|wrappings|wrapped head|bandaged)\b", t))
    head_mat = _material_near(words, "hood|cowl|veil|wrappings|bandages|head|face|helm|helmet", "wrap" if hood else skin_mat)
    helm = bool(re.search(r"\b(helm|helmet)\b", t))
    add(name="head", kind="ellipsoid", centre=[cx, (head_y + top_y) / 2 + 1, 0.3], radii=[6.0, (head_y - top_y) / 2 + 1, 6.6], material=head_mat if (hood or helm) else skin_mat,
        bone="head", rules=([{"every_y": [3, 0], "t": -1}] if hood else []))
    read.append(("a hooded " if hood else "a helmed " if helm else "a bare ") + "head")
    glow = next((SHAPE_GLOWS[w] for w in words if w in SHAPE_GLOWS and re.search(r"\b(eyes?|glow|glowing|burning)\b", t)), None)
    if glow or re.search(r"\b(glowing eyes|burning eyes|eyes glow)\b", t):
        glow = glow or "soul"
        ey = (head_y + top_y) / 2 + 1
        shapes[-1].setdefault("rules", []).append({"z": [4.5, None], "near": [[[cx - 2.5, ey, None], [cx + 2.5, ey, None]], 2.0], "t": -3})
        shapes[-1]["rules"].append({"z": [4.5, None], "near": [[[cx - 2.5, ey, None], [cx + 2.5, ey, None]], 1.4], "material": glow, "emit": "pulse"})
        shapes[-1]["rules"].append({"z": [4.5, None], "near": [[[cx - 2.5, ey, None], [cx + 2.5, ey, None]], 0.6], "material": glow, "emit": "pulse", "t": 1})
        read.append(f"glowing eyes ({glow})")
    add(name="neck", kind="capsule", a=[cx, B["neck"]["head"][1], 0], b=[cx, head_y, 0], r=[2.8, 2.6], material=head_mat if hood else skin_mat, bone="neck")
    if re.search(r"\b(hat|straw hat|wide hat|brim)\b", t):
        hat_mat = _material_near(words, "hat|brim", "straw")
        add(name="hat", kind="ring", y=[top_y - 13, top_y + 7], rx=[1.0, 1.2], rz=[1.0, 1.15], thickness=1.8,
            material=hat_mat, part="hat", rotate={"x": 16, "about": [cx, top_y + 2, 0]}, bump={"ridges": [0.18, 5]},
            rules=[{"every_angle": [36, 0], "y": [top_y - 5, None], "t": -1}])
        parts["hat"] = {"bone": "head", "lag": {"frames": 1, "sway": 0.12}}
        read.append(f"a wide hat ({hat_mat})")
    # torso
    sp2 = B["spine.002"]["head"][1]; sp3 = B["spine.003"]["head"][1]
    chest_c = (sp3 + hips_y) / 2 - 2
    add(name="chest", kind="ellipsoid", centre=[cx, chest_c, 0], radii=[10, (hips_y - sp3) / 2 + 2, 7.2], material=armour_mat if has_armour else body_mat, bone="spine.002",
        rules=([{"every_y": [5, 0], "t": -1}, {"x": [cx - 0.7, cx + 0.7], "z": [4, None], "t": 1}] if has_armour else [{"every_y": [4, 0], "hash": [0.3, 2, 2], "t": -1}]))
    read.append(("armoured " if has_armour else "") + f"torso ({armour_mat if has_armour else body_mat})")
    if re.search(r"\b(cords?|ropes?|straps?)\b", t):
        add(name="cord_x1", kind="capsule", a=[cx - 10, sp3 - 5, 6.2], b=[cx + 9, sp2 + 5, 6.4], r=[1.6, 1.4], material="rope", bone="spine.002", rules=[{"every_y": [2, 0], "t": -1}])
        add(name="cord_x2", kind="capsule", a=[cx + 10, sp3 - 5, 6.2], b=[cx - 9, sp2 + 5, 6.4], r=[1.6, 1.4], material="rope", bone="spine.002", rules=[{"every_y": [2, 1], "t": -1}])
        read.append("rope cords across the chest")
    pauldrons = bool(re.search(r"\b(pauldrons?|shoulder plates?|shoulders?)\b", t)) or has_armour
    for side, sx in (("L", 1), ("R", -1)):
        ua = B[f"upper_arm.{side}"]; fa = B[f"forearm.{side}"]; ha = B[f"hand.{side}"]
        if pauldrons:
            add(name=f"pauldron.{side}", kind="ellipsoid", centre=[ua["head"][0] + sx * 1, ua["head"][1] + 2, -2], radii=[7.0, 4.5, 7.0], material=armour_mat,
                bone=f"shoulder.{side}", rules=[{"every_y": [3, 0], "t": -1}])
        add(name=f"upper_arm.{side}", kind="capsule", a=ua["head"], b=ua["tail"], r=[3.8, 3.3], material=body_mat, bone=f"upper_arm.{side}", rules=[{"every_y": [3, 0], "t": -1}])
        add(name=f"forearm.{side}", kind="capsule", a=fa["head"], b=fa["tail"], r=[3.5, 2.9], material=armour_mat if has_armour else body_mat, bone=f"forearm.{side}",
            rules=[{"every_y": [4, 0], "t": -1}])
        add(name=f"hand.{side}", kind="ellipsoid", centre=[ha["head"][0] + sx * 0.5, ha["head"][1] + 3, ha["head"][2] + 1], radii=[2.7, 3.4, 2.3], material=skin_mat, bone=f"hand.{side}")
        th = B[f"thigh.{side}"]; sh = B[f"shin.{side}"]; ft = B[f"foot.{side}"]
        add(name=f"thigh.{side}", kind="capsule", a=th["head"], b=th["tail"], r=[4.4, 3.5], material=legs_mat, bone=f"thigh.{side}")
        add(name=f"shin.{side}", kind="capsule", a=sh["head"], b=sh["tail"], r=[3.5, 2.9], material=legs_mat, bone=f"shin.{side}", rules=[{"every_y": [3, 0], "t": -1}])
        add(name=f"foot.{side}", kind="ellipsoid", centre=[ft["head"][0], ground - 3.4, 3.0], radii=[3.9, 3.3, 7.2], material=boots_mat, bone=f"foot.{side}",
            rules=[{"y": [ground - 1.6, None], "material": "leather5", "t": -2}])
    if pauldrons:
        read.append(f"pauldrons ({armour_mat})")
    read.append(f"arms and legs ({body_mat}, {legs_mat}), {boots_mat} feet")
    # belt and hangings
    belt_mat = _material_near(words, "belt|sash|girdle", "leather5")
    add(name="belt", kind="ring", y=[hips_y - 3.5, hips_y + 2.5], rx=12.6, rz=9.6, material=belt_mat, bone="hips", rules=[{"every_angle": [14, 0], "t": 1}])
    read.append(f"a belt ({belt_mat})")
    if re.search(r"\b(gourds?|flasks?|vials?|bottles?|pouch|pouches)\b", t):
        add(name="gourd_big", kind="ellipsoid", centre=[cx + 7, hips_y + 11, 9.6], radii=[4.6, 5.6, 4.4], material="gourd", part="gourds", rules=[{"dy": [None, -3.8], "material": "rope", "t": -1}, {"hash": [0.14, 3, 2], "t": -3}])
        add(name="gourd_small", kind="ellipsoid", centre=[cx - 5, hips_y + 9, 9.0], radii=[3.6, 4.6, 3.6], material="gourd", part="gourds", rules=[{"dy": [None, -3.1], "material": "rope", "t": -1}])
        parts["gourds"] = {"bone": "hips", "lag": {"frames": 1, "sway": 0.7}, "hang": 0.5}
        read.append("charm gourds at the belt")
    # long garments
    if re.search(r"\b(skirts?|robes?|gown|dress|kilt|tabard)\b", t):
        sk_mat = _material_near(words, "skirts?|robes?|gown|dress|kilt|tabard", body_mat)
        add(name="skirt", kind="ring", y=[hips_y + 2, ground - 22], rx=[12.4, 0.2], rz=[9.6, 0.15], thickness=2.2, hem={"tongues": 14, "depth": 9 if "tattered" in t else 3, "seed": 8},
            open={"angle": 0.55, "below": hips_y + 12}, material=sk_mat, part="skirt", bump={"folds": [0.5, 8, 3.1]}, rules=[{"hem_band": [0, 2.5], "t": -1}],
            **({"holes": {"p": 0.08, "band": 24, "seed": 5}} if re.search(r"\b(tattered|torn|ragged)\b", t) else {}))
        parts["skirt"] = {"bone": "hips", "lag": {"frames": 2, "sway": 0.8}, "hang": 0.25}
        read.append(f"a long {sk_mat} skirt" + (" (tattered)" if "tattered" in t else ""))
    if re.search(r"\b(cape|cloak|mantle)\b", t):
        cp_mat = _material_near(words, "cape|cloak|mantle", "cape6")
        add(name="cape", kind="ring", y=[sp3 - 2, ground - 12], rx=[12, 0.17], rz=[9.8, 0.12], thickness=1.6, hem={"tongues": 18, "depth": 6, "seed": 5}, keep={"back": 1.75},
            material=cp_mat, part="cape", bump={"folds": [0.4, 7, 0.3]}, **({"holes": {"p": 0.07, "band": 16}} if re.search(r"\b(tattered|torn|ragged)\b", t) else {}))
        parts["cape"] = {"bone": "spine.003", "lag": {"frames": 2, "sway": 0.7}, "hang": 0.35}
        read.append(f"a cape ({cp_mat})")
    if re.search(r"\b(veil|wrappings|shawl)\b", t):
        add(name="veil", kind="ring", y=[head_y + 3, hips_y - 2], rx=[8.0, 0.14], rz=[7.6, 0.08], thickness=1.6, hem={"tongues": 9, "depth": 14, "seed": 6}, keep={"back": 1.95},
            holes={"p": 0.1, "band": 26, "seed": 3}, material="wrap", t=-1, part="veil", bump={"folds": [0.5, 6, 1.0]})
        parts["veil"] = {"bone": "spine.003", "lag": {"frames": 2, "sway": 0.45}, "hang": 0.35}
        read.append("a long veil down the back")
    # the hands' things
    hl = B["hand.L"]["head"]; hr = B["hand.R"]["head"]
    if re.search(r"\b(staff|stave|rod)\b", t):
        add(name="staff", kind="capsule", a=[hl[0] + 1.5, ground - 2, hl[2] + 4], b=[hl[0] + 1.5, top_y - 8, hl[2] + 4], r=1.6, material="wood5", bone="hand.L", rules=[{"every_y": [7, 0], "t": -1}])
        add(name="staff_fist", kind="ellipsoid", centre=[hl[0] + 1, hl[1] + 3, hl[2] + 4], radii=[3.4, 3.8, 3.4], material=skin_mat, bone="hand.L")
        read.append("a staff in the left hand")
    if re.search(r"\b(sword|blade|sabre|saber)\b", t):
        add(name="sword", kind="box", centre=[hr[0] - 1, hr[1] + 16, hr[2] + 3], half=[1.1, 20, 0.5], material="steel", bone="hand.R", rules=[{"dy": [-20, -17], "material": "gold6"}])
        read.append("a sword in the right hand")
    if re.search(r"\b(shield|buckler)\b", t):
        add(name="shield", kind="ellipsoid", centre=[hl[0] + 2, hl[1] - 6, hl[2] + 3], radii=[7, 9, 1.4], material="steel", bone="forearm.L", rules=[{"every_y": [6, 0], "t": -1}])
        read.append("a shield on the left arm")
    lights = []
    if glow:
        ey = (head_y + top_y) / 2 + 1
        lights.append({"name": "eyes", "bone": "head", "at": [cx, ey, 7.5], "radius": 11, "strength": 0.85, "pulse": 0.25,
                       "colour": {"soul": "#7dff78", "ember": "#f0a040", "miasma": "#b57ae0", "frost": "#8fd0ec"}[glow]})
    name = re.sub(r"[^a-z0-9]+", "_", re.sub(r"^(a |an |the )", "", t.split(",")[0].strip())).strip("_")[:32] or "figure"
    doc = {
        "name": name, "about": f"Drafted from: {text.strip()}", "mode": "solid", "size": tpl["size"], "height": height, "ground": ground, "axis": [cx, 0],
        "view": {"elevation": 12}, "outline": "#0a080c", "skeleton": {"height": height, "ground": ground, "cx": cx}, "materials": {}, "parts": parts,
        "shapes": shapes, "effects": [], "lights": lights, "shadow": {"radii": [22, 4.2], "colour": "#4b4a4f"},
    }
    result = {"what": "shapes", "doc": doc, "read": read, "shapes": len(shapes)}
    if out:
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        Path(out).write_text(json.dumps(doc, indent=1))
        result["file"] = str(out)
    return result


def draft(text: str, image: str | Path | None = None, what: str | None = None) -> dict:
    """The dispatcher: ``what`` forces spell | skin | prompt | music | shapes; otherwise the words decide."""
    what = what or classify(text)
    if what == "shapes":
        return draft_shapes(text)
    if what == "skin":
        return draft_skin(text, image)
    if what == "prompt":
        return draft_prompt(text)
    if what == "music":
        return draft_music(text)
    return draft_spell(text)
