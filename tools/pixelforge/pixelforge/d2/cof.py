"""COF: the file that composes a unit's layers for one animation mode and weapon class (``NENUHTH.cof`` = token NE,
mode NU, weapon class HTH). 28-byte header: u8 layers, u8 frames per direction, u8 directions, u8 version (20),
4 unknown bytes, i32 xmin, i32 xmax, i32 ymin, i32 ymax, u16 animation rate, 2 zero bytes; then 9 bytes a layer
(component index, shadow, selectable, override transparency, transparency level, 4-char weapon class), one byte a
frame of trigger codes (0 none, 1 the attack lands or the cast fires, 2 a missile, 3 a sound), and the draw order:
directions x frames x layers component indices, back to front."""
from __future__ import annotations

import struct
from dataclasses import dataclass, field

COMPOSITES = ["HD", "TR", "LG", "RA", "LA", "RH", "LH", "SH", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]
COMPOSITE_NAMES = {"HD": "head", "TR": "torso", "LG": "legs", "RA": "right arm", "LA": "left arm", "RH": "right hand", "LH": "left hand", "SH": "shield"}
# the animation modes: players (PlrMode.txt) and monsters (MonMode.txt)
PLAYER_MODES = {"DT": "death", "NU": "neutral", "WL": "walk", "RN": "run", "GH": "get hit", "TN": "town neutral", "TW": "town walk", "A1": "attack 1",
                "A2": "attack 2", "BL": "block", "SC": "cast", "TH": "throw", "KK": "kick", "S1": "skill 1", "S2": "skill 2", "S3": "skill 3",
                "S4": "skill 4", "DD": "dead", "SQ": "sequence", "KB": "knockback"}
MONSTER_MODES = {"DT": "death", "NU": "neutral", "WL": "walk", "GH": "get hit", "A1": "attack 1", "A2": "attack 2", "BL": "block", "SC": "cast",
                 "S1": "skill 1", "S2": "skill 2", "S3": "skill 3", "S4": "skill 4", "DD": "dead", "KB": "knockback", "SQ": "sequence", "RN": "run"}
WEAPON_CLASSES = {"HTH": "hand to hand", "1HS": "one hand swing", "1HT": "one hand thrust", "2HS": "two hand swing", "2HT": "two hand thrust",
                  "BOW": "bow", "XBW": "crossbow", "STF": "staff", "1SS": "one hand swing + swing", "1ST": "one hand swing + thrust",
                  "1JS": "one hand thrust + swing", "1JT": "one hand thrust + thrust", "HT1": "one claw", "HT2": "two claws", "SSD": "one hand swing + shield (dead)"}
ARMOUR_CLASSES = ["LIT", "MED", "HVY"]
# the player tokens and the weapon classes their COFs cover in the game (the common set every class has first)
PLAYER_TOKENS = {"AM": "Amazon", "SO": "Sorceress", "NE": "Necromancer", "PA": "Paladin", "BA": "Barbarian", "DZ": "Druid", "AI": "Assassin"}
COMMON_WEAPON_CLASSES = ["HTH", "1HS", "1HT", "2HS", "2HT", "BOW", "XBW", "STF"]
EXTRA_WEAPON_CLASSES = {"BA": ["1SS", "1ST", "1JS", "1JT"], "AI": ["HT1", "HT2", "1SS", "1ST", "1JS", "1JT"]}
# Diablo 2 direction index -> compass facing (where the unit faces on screen); 8-direction files
DIRECTIONS_8 = ["SW", "NW", "NE", "SE", "S", "W", "N", "E"]
DIRECTIONS_16 = ["SW", "NW", "NE", "SE", "S", "W", "N", "E", "SSW", "WSW", "WNW", "NNW", "NNE", "ENE", "ESE", "SSE"]
DIRECTIONS_4 = ["SW", "NW", "NE", "SE"]
HEADER = 28
VERSION = 20


@dataclass
class Layer:
    composite: str = "TR"
    shadow: int = 1
    selectable: int = 1
    override_transparency: int = 0
    transparency: int = 0
    weapon_class: str = "HTH"


@dataclass
class COF:
    layers: list[Layer]
    frames_per_direction: int
    directions: int
    speed: int = 256
    box: tuple[int, int, int, int] = (0, 0, 0, 0)     # xmin, xmax, ymin, ymax
    triggers: list[int] = field(default_factory=list)   # one per frame
    order: list[list[list[int]]] = field(default_factory=list)   # [direction][frame] -> composite indices back to front
    version: int = VERSION
    unknown: bytes = b"\0\0\0\0"

    @property
    def composites(self) -> list[str]:
        return [l.composite for l in self.layers]


class COFError(ValueError):
    pass


def direction_names(n: int) -> list[str]:
    if n == 1:
        return ["S"]
    if n == 4:
        return DIRECTIONS_4
    if n == 8:
        return DIRECTIONS_8
    if n == 16:
        return DIRECTIONS_16
    if n == 32:
        return DIRECTIONS_16 + [f"d{i}" for i in range(16, 32)]
    return [f"d{i}" for i in range(n)]


def decode(data: bytes) -> COF:
    if len(data) < HEADER:
        raise COFError("not a COF file (too short)")
    nl, fpd, nd, ver = data[0], data[1], data[2], data[3]
    xmin, xmax, ymin, ymax = struct.unpack_from("<iiii", data, 8)
    speed = struct.unpack_from("<H", data, 24)[0]
    need = HEADER + nl * 9 + fpd + nd * fpd * nl
    if len(data) < need:
        raise COFError(f"COF is {len(data)} bytes but its header needs {need}")
    layers = []
    p = HEADER
    for _ in range(nl):
        comp = COMPOSITES[data[p]] if data[p] < len(COMPOSITES) else f"C{data[p]}"
        wc = bytes(data[p + 5:p + 9]).split(b"\0", 1)[0].decode("ascii", "replace")
        layers.append(Layer(comp, data[p + 1], data[p + 2], data[p + 3], data[p + 4], wc))
        p += 9
    triggers = list(data[p:p + fpd]); p += fpd
    order = []
    for _ in range(nd):
        frames = []
        for _ in range(fpd):
            frames.append(list(data[p:p + nl])); p += nl
        order.append(frames)
    return COF(layers, fpd, nd, speed, (xmin, xmax, ymin, ymax), triggers, order, ver, bytes(data[4:8]))


def encode(c: COF) -> bytes:
    nl = len(c.layers)
    out = bytearray(struct.pack("<BBBB", nl, c.frames_per_direction, c.directions, c.version) + (c.unknown or b"\0\0\0\0")[:4].ljust(4, b"\0"))
    out += struct.pack("<iiii", *c.box) + struct.pack("<H", c.speed & 0xFFFF) + b"\0\0"
    for l in c.layers:
        idx = COMPOSITES.index(l.composite) if l.composite in COMPOSITES else int(l.composite[1:])
        out += struct.pack("<BBBBB", idx, l.shadow, l.selectable, l.override_transparency, l.transparency)
        out += l.weapon_class.encode("ascii")[:4].ljust(4, b"\0")
    trig = list(c.triggers) + [0] * c.frames_per_direction
    out += bytes(trig[:c.frames_per_direction])
    default = [COMPOSITES.index(l.composite) if l.composite in COMPOSITES else 0 for l in c.layers]
    for d in range(c.directions):
        for f in range(c.frames_per_direction):
            row = c.order[d][f] if d < len(c.order) and f < len(c.order[d]) else default
            out += bytes((list(row) + default)[:nl])
    return bytes(out)


def make(layers: list[Layer], frames: int, directions: int, speed: int, box: tuple[int, int, int, int], trigger_frame: int | None = None,
         trigger_code: int = 1) -> COF:
    """A COF whose layers draw in the order given, with one optional trigger frame."""
    triggers = [0] * frames
    if trigger_frame is not None and 0 <= trigger_frame < frames:
        triggers[trigger_frame] = trigger_code
    idx = [COMPOSITES.index(l.composite) for l in layers]
    return COF(layers, frames, directions, speed, box, triggers, [[list(idx) for _ in range(frames)] for _ in range(directions)])
