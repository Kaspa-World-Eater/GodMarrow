"""Midjourney prompts for everything that is not a character, locked to the heroes' look.

The STYLE block is measured from the Hollow Mystic painting (OKLab: median lightness 0.35, chroma ~0.035, hues
pulled to teal, shadows green-cyan, bone and iron for the lights, gritty painterly texture) and repeated word for
word in every prompt. ``--sref`` takes the hero sheet's image URL so Midjourney copies the brushwork, not just
the words. Each kind also states the exact views the Forge needs, because the pipeline is the same as for heroes:
cut out -> carve from the views -> wrap the painting on -> film at the game angle -> pixels.

    pixelforge prompt --world object --describe "a cracked gravestone with a bone sigil" --sref <hero sheet url>
"""

from __future__ import annotations

from dataclasses import dataclass

STYLE = (
    "detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, "
    "bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn "
    "surfaces, grim and quiet, no bright colors, no neon, no glow"
)
LIGHT_FLAT = "orthographic, flat even lighting, no cast shadows, plain solid white background"
NEG = "--no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky"


@dataclass(frozen=True)
class WorldKind:
    key: str
    title: str
    purpose: str
    template: str
    forge: str   # what the Forge does with it


WORLD_KINDS: list[WorldKind] = [
    WorldKind("object", "Object sheet (props: gravestones, altars, chests, lanterns, urns...)",
              "Three views of one object in one image. The Forge carves the shape from them like a hero.",
              "object turnaround reference sheet of {description}, three views side by side: front view, side view, back view, "
              "same object in every view, resting on the ground, full object top to bottom, " + LIGHT_FLAT + ", " + STYLE +
              " --ar 3:2 --style raw {sref} " + NEG,
              "pixelforge object sheet.png <name> --height <metres>"),
    WorldKind("building", "Building sheet (huts, crypts, towers, gates, walls, shrines)",
              "Four views: front, three-quarter, side, back elevations. The three-quarter view is what the player sees most.",
              "architectural turnaround reference sheet of {description}, four views side by side: front elevation, three-quarter view, "
              "side elevation, back elevation, same building in every view, whole building from roof to ground, " + LIGHT_FLAT + ", " + STYLE +
              " --ar 2:1 --style raw {sref} " + NEG,
              "pixelforge object sheet.png <name> --height <metres> --views 4"),
    WorldKind("tree", "Tree / large plant sheet",
              "Front and side. Bare branches must be bare; keep the trunk upright.",
              "turnaround reference sheet of {description}, two views side by side: front view, side view, same tree in every view, "
              "whole tree from crown to roots, trunk upright, " + LIGHT_FLAT + ", " + STYLE + " --ar 3:2 --style raw {sref} " + NEG,
              "pixelforge object sheet.png <name> --height <metres> --views 2"),
    WorldKind("ground", "Ground texture (grass, mud, ash, stone flags, bone field, shallow water)",
              "Seamless, top-down. The Forge cuts the iso diamonds and the edges between two materials.",
              "seamless tileable top-down texture of {description}, flat even lighting, no shadows, no objects, fills the whole frame edge to edge, "
              + STYLE + " --ar 1:1 --style raw --tile {sref} --no text, watermark, border, perspective, horizon, objects, people",
              "pixelforge tiles texture.png <name> [--second other.png]"),
    WorldKind("effect", "Effect / spell sprite (a single frame the Forge animates)",
              "One shape on pure black. The Forge makes the loop and keeps the glow where the law allows it.",
              "{description}, single effect centered, seen from the side, pure black background, soft edges, " + STYLE.replace(", no glow", "") +
              " --ar 1:1 --style raw {sref} --no text, watermark, frame, border, scenery, people, characters",
              "pixelforge animate effect.png --preset glow|flame|hover  (or paint none and use pixelforge vfx)"),
    WorldKind("ui", "UI frame / panel",
              "A flat panel with an ornate border, nothing inside. The Forge 9-slices it.",
              "flat rectangular UI panel frame of {description}, ornate worn border, empty dark center, straight edges, front-on, "
              + LIGHT_FLAT.replace("plain solid white background", "plain solid white background around the panel") + ", " + STYLE +
              " --ar 4:3 --style raw {sref} " + NEG,
              "pixelforge ui9 panel.png <name>"),
    WorldKind("icons", "Item icons flat lay",
              "Nine to sixteen items laid out in a grid, not touching. The Forge cuts them into inventory icons.",
              "flat lay of {description}, items arranged in a neat grid with space between them, not touching, each item whole, "
              "top-down, " + LIGHT_FLAT + ", " + STYLE + " --ar 1:1 --style raw {sref} " + NEG,
              "pixelforge icons flatlay.png --names \"sword:1x3,ring,...\""),
    WorldKind("portrait", "Portrait (dialogue, character panel)",
              "Head and shoulders, front, for the talking heads.",
              "head and shoulders portrait of {description}, facing the viewer, " + LIGHT_FLAT + ", " + STYLE +
              " --ar 1:1 --style raw {sref} " + NEG.replace(", people, characters", ""),
              "pixelforge portrait portrait.png <name>"),
]

WORLD_RULES = [
    "Paste the hero sheet's image URL into --sref so every object is painted with the same brush as the heroes.",
    "White background and flat light for anything the Forge will carve (object, building, tree): light gets baked into the model's skin.",
    "Never write 'pixel art' or 'glow' for world art; the Forge adds the pixels and the glow where the law allows it.",
    "Upscale, save PNG, never a screenshot. Keep the description sentence identical if you re-roll.",
]


def build_world_prompt(kind: str, description: str, sref: str = "") -> str:
    for k in WORLD_KINDS:
        if k.key == kind:
            s = f"--sref {sref} --sw 60" if sref else "--sref [HERO SHEET IMAGE URL] --sw 60"
            return k.template.format(description=description.strip() or "[DESCRIPTION]", sref=s)
    raise ValueError(f"unknown world prompt kind {kind!r}; choose from {[k.key for k in WORLD_KINDS]}")


# ------------------------------------------------------------------ the art order: Act I, in the order it is needed
ART_ORDER = [
    ("ground", "moor_grass", "dark moorland grass with patches of bare peat and small grey stones"),
    ("ground", "stone_flags", "old cracked stone flagstones with moss in the joints"),
    ("ground", "fen_mud", "wet black fen mud with shallow puddles and dead reeds"),
    ("ground", "ash_shore", "grey volcanic ash ground with charred splinters and pale bone fragments"),
    ("tree", "dead_tree", "a tall dead moorland tree with twisted bare branches and peeling black bark"),
    ("tree", "dead_tree_2", "a short gnarled dead oak with a split trunk and bare branches"),
    ("tree", "pine", "a thin dark pine with sparse drooping needles, lower branches dead"),
    ("object", "gravestone", "a weathered stone gravestone with a worn bone sigil carved in it"),
    ("object", "gravestone_cross", "a cracked stone cross grave marker leaning slightly"),
    ("object", "iron_fence", "a short section of rusted iron graveyard fence with spear-tip finials"),
    ("object", "iron_fence_gate", "a rusted iron graveyard gate between two stone posts"),
    ("object", "lantern_post", "a tall iron lantern post with a hanging glass lantern, unlit"),
    ("object", "altar", "a low stone altar stained dark, with bone offerings on top"),
    ("object", "coffin", "an old wooden coffin with iron bands, lid ajar"),
    ("object", "urn", "a tall cracked clay funeral urn with a bone-white rim"),
    ("object", "obelisk", "a narrow stone obelisk carved with tally marks of the Count"),
    ("object", "rocks", "a cluster of mossy grey boulders"),
    ("object", "stump", "a rotten tree stump with fungus on one side"),
    ("object", "chest", "a small iron-bound wooden chest, closed, worn"),
    ("object", "barrel", "an old wooden barrel with rusted hoops"),
    ("object", "cart", "a broken wooden hand cart with one wheel missing"),
    ("object", "cage", "a hanging iron gibbet cage, empty"),
    ("object", "fire_basket", "an iron fire basket on a tripod, cold ashes inside"),
    ("object", "bone_pile", "a heap of human bones and skulls"),
    ("object", "signpost", "a leaning wooden signpost with two blank boards"),
    ("object", "well", "a round stone well with a wooden winch frame and rope"),
    ("building", "hut", "a small moorland hut of grey stone with a sagging thatched roof and one shuttered window"),
    ("building", "crypt", "a squat stone crypt with a peaked slate roof, an iron door and bone sigils over the lintel"),
    ("building", "chapel_ruin", "a ruined stone chapel with a collapsed roof, one standing arch and empty lancet windows"),
    ("building", "watchtower", "a narrow round stone watchtower with a pointed slate roof and arrow slits"),
    ("building", "gate_arch", "a stone gate arch with iron-studded doors, part of a town wall"),
    ("building", "wall_segment", "a section of crenellated grey stone town wall"),
    ("building", "shrine", "a small roadside shrine of stone and bone with a candle niche"),
    ("building", "smithy", "an open-fronted stone smithy with a forge, anvil and a sloped slate roof"),
    ("building", "longhouse", "a long timber hall with a steep slate roof and two lit windows"),
    ("ui", "panel_bone", "a bone and iron inventory panel frame with riveted corners"),
    ("ui", "panel_vellum", "a vellum and dark wood tome page frame"),
    ("icons", "weapons_1", "a grave knight's weapons: a bone sword, an iron mace, a hooked scythe, a short dagger, a bone wand, a staff, a round shield, a lantern, a ring"),
    ("icons", "armor_1", "a pilgrim's gear: a hooded robe, a mail shirt, iron gloves, curled-toe boots, a leather belt, a mask, an amulet, a potion flask, a scroll"),
    ("portrait", "hollow_mystic", "a gaunt hooded wanderer with a faceless black void under a teal-blue tattered hood"),
    ("portrait", "ossuarch", "a tall grim man in bone plate with a pale shaven head and iron-grey eyes"),
]


def art_order_markdown(sref: str = "") -> str:
    lines = ["# Art order for Act I (paint these in Midjourney, in this order)", "",
             "Every prompt below carries the same style block and your hero sheet as `--sref`, so the objects are painted with the",
             "same brush as the heroes. Save each upscaled PNG under the name given, then run the Forge line under it.", ""]
    for i, (kind, name, desc) in enumerate(ART_ORDER, 1):
        k = next(x for x in WORLD_KINDS if x.key == kind)
        lines += [f"## {i}. {name}  ({k.title.split(' (')[0]})", "", "```", build_world_prompt(kind, desc, sref), "```",
                  f"Save as `{name}.png`. Then: `{k.forge.replace('<name>', name).replace('sheet.png', name + '.png').replace('texture.png', name + '.png').replace('panel.png', name + '.png').replace('flatlay.png', name + '.png').replace('portrait.png', name + '.png').replace('effect.png', name + '.png')}`", ""]
    lines += ["## Rules", ""] + [f"- {r}" for r in WORLD_RULES]
    return "\n".join(lines) + "\n"
