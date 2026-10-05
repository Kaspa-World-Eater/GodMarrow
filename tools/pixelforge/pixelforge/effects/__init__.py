"""PixelForge's effects engine: pure NumPy nodes composed in a JSON graph, rendered as palette-locked pixel frames.

    from pixelforge import effects
    effects.render_effect("flame", "art/fx", levers={"size": 1.2})     # a library effect -> strip + json
    effects.render_graph(graph, "mine", "art/fx", gif=True)           # any graph
    effects.list_effects()                                            # the library by family with its levers
    effects.node_table()                                              # every node op, its parameters and doc

Modules: noise (tileable sources), sources (noise, shapes, the emitter), shaping, colour, compose, sims, output,
library (the saved effects), compat (the shim under the old vfx / spell calls).
"""
from __future__ import annotations

from . import colour, compose, shaping, sims, sources  # noqa: F401  (registering the nodes)
from .colour import PALETTES
from .graph import NODES, Context, evaluate, lever_value, node_table
from .library import EFFECTS, FAMILIES, get_effect, library_table, list_effects, render_effect
from .output import HOUSE, frames_of, render_graph, write_gif, write_sheet

__all__ = ["NODES", "Context", "evaluate", "node_table", "lever_value", "PALETTES", "EFFECTS", "FAMILIES", "get_effect", "library_table",
           "list_effects", "render_effect", "HOUSE", "frames_of", "render_graph", "write_gif", "write_sheet"]
