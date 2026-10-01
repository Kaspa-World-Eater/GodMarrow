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
    def make_effect(kind: str, name: str, out_dir: str, palette: str = "lantern", frames: int = 8, fps: float = 10.0, atlas_dir: str | None = None) -> dict:
        """Procedural effect sheet: fire smoke wisp burst embers ring bolt slash circle cloud shards pillar decal drip flash ward vortex."""
        from .vfx import make_vfx
        return make_vfx(kind, name, out_dir, frames=frames, fps=fps, palette=palette, atlas_dir=atlas_dir)

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
    def quick_sprite(project: str, character: str, view: str = "style", preset: str = "idle") -> dict:
        """No-3D path: one image -> sprite -> animated clip -> Godot export."""
        p = _project(project)
        api.pixelate_still(p, character, view)
        api.animate_still(p, character, view, [preset])
        return api.export(p, character)

    return mcp


def main() -> None:
    build_server().run()


if __name__ == "__main__":
    main()
