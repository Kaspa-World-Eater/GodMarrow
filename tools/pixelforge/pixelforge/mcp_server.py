"""MCP server so Claude Desktop / Claude Code can drive a project directly.

Start it with ``pixelforge mcp`` (needs ``pip install mcp``).  Claude Desktop
config example (``claude_desktop_config.json``)::

    {"mcpServers": {"pixelforge": {"command": "pixelforge", "args": ["mcp"]}}}

Every tool mirrors a function in :mod:`pixelforge.api` and returns its dict.
"""

from __future__ import annotations

import json
from pathlib import Path

from . import api
from .project import Project


def _project(path: str) -> Project:
    return Project.load(path)


def build_server():
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError as e:  # pragma: no cover
        raise SystemExit("the MCP server needs the 'mcp' package: pip install mcp") from e

    mcp = FastMCP("pixelforge", instructions=(Path(__file__).parent.parent / "docs" / "GUIDE_AI.md").read_text(errors="replace")
                  if (Path(__file__).parent.parent / "docs" / "GUIDE_AI.md").exists() else "PixelForge pipeline tools")

    @mcp.tool()
    def new_project(folder: str, name: str, style: str = "hd") -> dict:
        """Create a project folder. style: 8bit | 16bit | snes | hd."""
        return api.new_project(folder, name, style)

    @mcp.tool()
    def status(project: str) -> dict:
        """Show characters, what is done and what the next step is."""
        return api.status(_project(project))

    @mcp.tool()
    def configure(project: str, style: str | None = None, blender: str | None = None, directions: int | None = None, render_size: int | None = None, godot_res_dir: str | None = None) -> dict:
        """Change project settings."""
        return api.configure(_project(project), style=style, blender=blender, directions=directions, render_size=render_size, godot_res_dir=godot_res_dir)

    @mcp.tool()
    def add_character(project: str, name: str, description: str) -> dict:
        """Add a character with its one-sentence description."""
        p = _project(project)
        r = api.add_character(p, name, description)
        api.set_description(p, r["character"], description)
        return r

    @mcp.tool()
    def prompts(project: str, character: str, sheet_url: str = "[SHEET IMAGE URL]") -> dict:
        """The Midjourney prompts for a character (give the person prompt A first)."""
        return api.get_prompts(_project(project), character, sheet_url)

    @mcp.tool()
    def import_image(project: str, character: str, kind: str, path: str) -> dict:
        """Import an image. kind: sheet | front | back | side | style."""
        return api.import_source(_project(project), character, kind, path)

    @mcp.tool()
    def run_step(project: str, character: str, step: str) -> dict:
        """Run one step: split | palette | model | rig | render | pixelate | export."""
        try:
            return api.run_step(_project(project), character, step)
        except api.StepError as e:
            return {"ok": False, "error": str(e)}

    @mcp.tool()
    def run_all(project: str, character: str) -> dict:
        """Run every remaining automatic step; stops where a person is needed."""
        return api.run_until_blocked(_project(project), character)

    @mcp.tool()
    def export_game(project: str, character: str, kind: str, category: str = "hero", display_name: str | None = None) -> dict:
        """Write the Godmarrow atlas (art/sprites/<kind>.png|json, 8 views, foot anchors, normal/depth sets if rendered)."""
        return api.export_game(_project(project), character, kind, category=category, display_name=display_name)

    @mcp.tool()
    def preview_gif(project: str, character: str, clip: str = "walk", direction: str = "S") -> dict:
        """A looping GIF of one clip from one direction, to judge the motion."""
        return api.preview_gif(_project(project), character, clip, direction)

    @mcp.tool()
    def make_effect(kind: str, name: str, out_dir: str, palette: str = "lantern", frames: int = 8, fps: float = 10.0, atlas_dir: str | None = None,
                    looks: str = "", rotations: int = 0, seed: int = 1, gif: bool = False) -> dict:
        """Procedural effect sheet: fire smoke wisp burst embers ring bolt slash circle cloud shards pillar decal drip flash ward vortex rain
        ashfall fog lightning swarm chain rune pool cookie nova firewall bone_burst, missiles bone_spear teeth ice_bolt fire_bolt (rotations=16
        for a heading sheet), orbits bone_armor_front/_back. looks: finishing looks in order, e.g. "phosphorus:strength=0.8+echo:count=3"
        (list_looks)."""
        from .vfx import make_vfx
        return make_vfx(kind, name, out_dir, frames=frames, fps=fps, palette=palette, atlas_dir=atlas_dir, looks=looks or None, rotations=rotations, seed=seed, gif=gif)

    @mcp.tool()
    def list_looks() -> dict:
        """The looks (finishing layers for any effect) with a one-line description and every parameter's default, range and meaning:
        phosphorus haze ethereal glow cyberpunk psychedelic echo smooth embers smoke shimmer outline pulse grain flicker dissolve ice rot.
        Spec syntax: name[:param=value,...], several joined with +. The game's own theme keeps cyberpunk and psychedelic for magic."""
        from . import fxlook
        return {"ok": True, "looks": fxlook.looks_table(), "syntax": "phosphorus:strength=0.8+echo:count=3"}

    @mcp.tool()
    def relook(sheet_json: str, looks: str, name: str = "", out_dir: str = "", gif: bool = False) -> dict:
        """Apply looks to an exported effect (its <name>.json next to the strip; rotation sheets get the look on every row) and write a
        new sheet (name, out_dir) in the same layout; the json lists the palette used."""
        from . import fxlook
        return fxlook.relook(sheet_json, looks, name=name or None, out_dir=out_dir or None, gif=gif)

    @mcp.tool()
    def looks_demo(out_dir: str, frames: int = 12, fps: float = 10.0) -> dict:
        """One GIF per look on a wisp and the bone spear, plus a contact sheet PNG, so a person can compare them side by side."""
        from . import fxlook
        return fxlook.demo(out_dir, frames=frames, fps=fps)

    @mcp.tool()
    def make_prop(image: str, name: str, out_dir: str, height: int = 96, sway: str | None = None, variations: int = 1, game_objects: str | None = None) -> dict:
        """A painted object -> game sprite with a foot point (sway: canopy|banner|flame); merges into objects.json when given."""
        from .props import make_prop as _mp
        return _mp(image, name, out_dir, height=height, sway=sway, variations=variations, game_objects=game_objects)

    @mcp.tool()
    def make_icons(image: str, out_dir: str, names: str = "", cell: int = 12, scale: int = 4) -> dict:
        """Inventory icons from one flat-lay painting; names in reading order like "sword:1x3,ring,hood:2x2"."""
        from .icons import make_icons as _mi
        return _mi(image, out_dir, [n.strip() for n in names.split(",")] if names else None, cell_art=cell, scale=scale)

    @mcp.tool()
    def make_portrait(image: str, name: str, out_dir: str, sizes: str = "48 96") -> dict:
        """Head-and-shoulders portraits from a front view cutout."""
        from .portrait import make_portrait as _mp
        return _mp(image, name, out_dir, sizes=tuple(int(x) for x in sizes.split()))

    @mcp.tool()
    def make_tiles(texture: str, name: str, out_dir: str, second: str | None = None, variants: int = 6) -> dict:
        """Iso diamond ground tiles (+16 edge tiles to a second material) and a Godot TileSet."""
        from .tiles import make_tiles as _mt
        return _mt(texture, name, out_dir, second=second, variants=variants)

    @mcp.tool()
    def make_ui_frame(image: str, name: str, out_dir: str, mid: int = 8) -> dict:
        """9-slice texture + StyleBoxTexture from a painted panel."""
        from .ui9 import make_ui9
        return make_ui9(image, name, out_dir, mid=mid)

    @mcp.tool()
    def make_music(cue: str, out_dir: str, seconds: float = 120.0, seed: int | None = None, knobs: str = "", act: int | None = None,
                   sheet: str = "", fmt: str = "wav") -> dict:
        """The score: cue key | 'all' | 'act' (with act) -> looping WAV/OGG + spectrogram PNG + music.json.
        knobs like "bpm=90 sc=phr"; sheet = a JSON from music_sheet with edits. Cues and knobs: music_cues."""
        from . import music
        return music.make_music(cue, out_dir, seconds=seconds, seed=seed, overrides=music.parse_overrides(knobs.split()), act=act,
                                sheet=sheet or None, fmt=fmt)

    @mcp.tool()
    def music_cues() -> dict:
        """Every cue (act, place, tempo, key, mode, seed, what it sounds like) and the knobs that can be set."""
        from . import music
        return {"cues": music.cue_table(), "knobs": music.FIELDS, "modes": list(music.SC)}

    @mcp.tool()
    def music_sheet(path: str) -> dict:
        """Write the editable sheet (every cue's knobs) to a JSON file; edit it and pass it to make_music."""
        from . import music
        return music.write_sheet(path)

    @mcp.tool()
    def describe(text: str, image: str = "", what: str = "") -> dict:
        """Plain words -> a draft: a spell (layers), skin ops (located on the image: eyes, hands, lantern, hood...), a Midjourney
        prompt, or a music cue with knobs. what: spell | skin | prompt | music (else the words decide). Adjust, then make_spell / edit_skin / make_music."""
        from . import describe as D
        return D.draft(text, image=image or None, what=what or None)

    @mcp.tool()
    def preview_in_game(game_dir: str = "", skin: str = "", fx: str = "", attach: bool = False, shot: str = "", zone: str = "moor",
                        fx_scale: float = 1.0, shot_n: int = 1, shot_dt: float = 0.25) -> dict:
        """Launch the Godot game with a skin / effects (a,b) / the skin's attachments on the moor; with shot=path it saves a screenshot
        after 4 s and quits (needs a display); shot_n > 1 saves that many frames shot_dt seconds apart (<shot>_0.png ...); fx_scale draws
        the effects that many times their size, to judge a small effect's frames. Godot is found automatically or via PIXELFORGE_GODOT."""
        from .game_preview import preview_in_game as _p
        return _p(game_dir or None, skin=skin or None, fx=fx.split(",") if fx else None, attach=attach, shot=shot or None, zone=zone,
                  fx_scale=fx_scale, shot_n=shot_n, shot_dt=shot_dt)

    @mcp.tool()
    def make_effect_from_art(image: str, name: str, out_dir: str, kind: str = "loop", preset: str = "glow", frames: int = 8, width: int = 0, rotations: int = 0,
                             looks: str = "") -> dict:
        """A painted effect (on black) -> animated game effect. kind: missile (spins, sheds chips; use rotations=16) | loop (preset glow|flame|hover) |
        burst (one-shot grow + dissolve) | frames (a painted strip of key frames). looks: finishing looks (list_looks). Writes the vfx layout the
        add-on and the spell designer load."""
        from .effect_art import make_effect
        return make_effect(image, name, out_dir, kind=kind, preset=preset, frames=frames, width=width or None, rotations=rotations, looks=looks or None)

    @mcp.tool()
    def make_spell(name: str, out_dir: str, preset: str = "fireball", layers_json: str = "", gif: bool = True, look: str = "", frames: int = 0, fps: float = 0.0) -> dict:
        """A layered spell effect -> strip + json (+ gif). preset: fireball | ward | soul_drain | bone_shatter | bone_spear_hit | frost_nova | fire_wall |
        corpse_burst | bone_armor | bone_shard_aura | lightning_strike. layers_json: optional JSON list of layers [{kind, palette, scale, x, y, rotation,
        start, speed, opacity, blend, seed, look}] replacing the preset's; look: the spell's top-level look(s) (list_looks); frames/fps: the loop's length."""
        from . import spell
        sp = spell.new_spell(name, preset)
        if layers_json:
            sp["layers"] = [{**spell.LAYER_DEFAULTS, **lyr} for lyr in json.loads(layers_json)]
        if look:
            sp["look"] = look
        if frames:
            sp["frames"] = int(frames)
        if fps:
            sp["fps"] = float(fps)
        return spell.export_spell(sp, out_dir, gif=gif)

    @mcp.tool()
    def edit_skin(image: str, ops_json: str, out: str = "") -> dict:
        """Edit a cutout / sprite / atlas with ops: [{"op":"recolor","at":[x,y],"to":"#hex","range":0.1,"radius":30},
        {"op":"glow","at":[x,y],"color":"#hex","radius":10,"strength":0.6}, {"op":"paint","at":[x,y],"color":"#hex","radius":4},
        {"op":"erase","at":[x,y],"radius":6}, {"op":"restore","at":[x,y],"radius":6}, {"op":"region","name":"eye","polygon":[[x,y],...]},
        {"op":"recolor","region":"eye","to":"#hex"}, {"op":"smooth","region":"hood","sigma":1}]. Shading is kept."""
        from . import skin_ops
        return skin_ops.apply_ops(image, json.loads(ops_json), out_path=out or None)

    @mcp.tool()
    def make_sfx(preset: str, out_dir: str, variations: int = 1, seed: int = 0) -> dict:
        """Synthesised sound effects (preset or 'all') -> WAV."""
        from .sfx import make_sfx as _ms
        return _ms(preset, out_dir, seed=seed, variations=variations)

    @mcp.tool()
    def recolor(image: str, out: str, hue: float = 0.0, lightness: float = 1.0, chroma: float = 1.0, mapping: str = "") -> dict:
        """Recolour a sprite/atlas without re-rendering; mapping like "#1d4a4c=#7a3d10"."""
        from .recolor import recolor_file
        m = dict(p.split("=", 1) for p in mapping.split(",")) if mapping else None
        return recolor_file(image, out, mapping=m, hue=hue, lightness=lightness, chroma=chroma)

    @mcp.tool()
    def compare(a: str, b: str, out: str = "compare.png") -> dict:
        """Before/after strip (+GIF for frame folders) and a mean difference number."""
        from .compare import compare as _c
        return _c(a, b, out)

    @mcp.tool()
    def doctor(project: str | None = None) -> dict:
        """What works on this machine and what is missing, with the fix."""
        from .doctor import run
        return run(project)

    @mcp.tool()
    def quick_sprite(project: str, character: str, view: str = "style", preset: str = "idle", looks: str = "") -> dict:
        """No-3D path: one image -> sprite -> animated clip (preset idle|cloak|hover|flame|glow|grass|pulse|haunt|heat; looks: a finishing look,
        list_looks) -> Godot export."""
        p = _project(project)
        api.pixelate_still(p, character, view)
        api.animate_still(p, character, view, [preset], looks=looks or None)
        return api.export(p, character)

    return mcp


def main() -> None:
    build_server().run()


if __name__ == "__main__":
    main()
