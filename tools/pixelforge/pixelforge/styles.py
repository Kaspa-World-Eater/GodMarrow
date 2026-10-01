"""Look presets: one name fixes everything that decides how a painting becomes game art.

A :class:`Style` carries the figure height in sprite pixels, the pixel step the game draws at, the palette size and
whether it is locked across frames, the outline rule, dither, the number of shading bands, a saturation / contrast
grade, the edge treatment and clean-up, the effect look (colour bands, glow, haze, frame count, speed), the animation frame counts
and speeds, the frame cap of the game export and the world tile scale. Every step of the pipeline reads its numbers
from the project's style (or a character's own), so switching the look is one setting, not twenty.

Presets are named for the look, not for a trademark. ``STYLES`` holds the look presets first and the older plain size
tiers (``8bit``, ``16bit``, ``hd``, ``full``) after them, kept so older projects and the Studio's tier box still work.
Every field can still be overridden where a step takes an argument.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, fields

DITHERS = ("none", "bayer", "floyd")
EDGES = ("soft", "crisp", "hard")          # cell average (flat areas, small looks) | median of the inner half | near the cell centre (noisy, crunchy)
GLOWS = ("auto", "on", "off")              # auto = the effect kind decides (fire, wisps, magic glow; smoke does not)
GROUPS = ("look", "tier")


@dataclass(frozen=True)
class Style:
    name: str
    title: str
    description: str
    group: str = "look"
    # --- figure and grid
    figure_height: int = 128          # a standing hero in sprite px (the longest side of a still)
    pixel_step: int = 1               # screen px per sprite px when the game draws it (a hint for the game and previews)
    # --- colour
    colors: int = 32                  # palette size; 0 = every colour of the painting is kept
    palette_lock: bool = True         # one palette for every frame and clip of a character
    dither: str = "none"
    dither_strength: float = 0.6
    shading_bands: int = 0            # 0 = the painting's own shading; 3 = flat three-band shading
    saturation: float = 1.0           # chroma grade in OKLab; 1 = as painted
    contrast: float = 1.0             # lightness contrast about the figure's median; 1 = as painted
    lightness: float = 0.0            # lightness lift (OKLab L, -0.3..0.3); small bright looks need a little
    # --- edges
    outline: str = "none"             # none | auto (the darkest palette colour) | #rrggbb
    outline_diagonal: bool = False
    edge: str = "crisp"               # soft | crisp | hard (see EDGES)
    clean: int = 0                    # passes of a 3x3 majority filter on the palette indices: specks join the colour area round them
    # --- effects
    fx_bands: int = 6                 # colour bands of a procedural effect
    fx_glow: str = "auto"             # auto | on | off: the soft halo under fire, wisps and magic
    fx_haze: bool = False             # a wide faint haze round an effect (painterly looks)
    fx_frames: int = 8
    fx_fps: float = 10.0
    # --- animation
    anim_frames: int = 8              # frames of a procedural loop (the still path)
    anim_fps: float = 8.0
    clip_frames: int = 24             # the most frames kept per clip in the game export (and rendered per clip)
    # --- world
    tile_width: int = 72              # the 2:1 ground diamond in texels
    tile_height: int = 36
    tile_hr: int = 2                  # texels per world px for tiles and props

    # ------------------------------------------------------------ compatibility with the older size tiers
    @property
    def max_size(self) -> int:
        return self.figure_height

    @property
    def outline_arg(self) -> str | None:
        """What :class:`PixelateOptions.outline` wants: ``None`` for no outline."""
        return None if self.outline in ("", "none") else self.outline

    @property
    def glow_arg(self) -> bool | None:
        return None if self.fx_glow == "auto" else self.fx_glow == "on"

    @property
    def tile(self) -> tuple[int, int]:
        return (self.tile_width, self.tile_height)

    def as_dict(self) -> dict:
        d = asdict(self)
        d["summary"] = self.summary()
        return d

    def summary(self) -> str:
        """One line of the numbers a person wants to see: ``56 px · 16 colours · outline · 3 bands · 10 f @ 10 fps``."""
        parts = [f"{self.figure_height} px", "every colour" if self.colors <= 0 else f"{self.colors} colours"]
        parts.append("outline" if self.outline not in ("", "none") else "no outline")
        parts.append("painted shading" if self.shading_bands <= 0 else f"{self.shading_bands} bands")
        parts.append(f"{self.anim_frames} f @ {self.anim_fps:g} fps")
        return " · ".join(parts)


def _look(name, title, description, **kw) -> Style:
    return Style(name, title, description, group="look", **kw)


def _tier(name, figure_height, colors, description) -> Style:
    return Style(name, name, description, group="tier", figure_height=figure_height, colors=colors)


STYLES: dict[str, Style] = {
    "godmarrow": _look(
        "godmarrow", "Godmarrow",
        "The game's own look: heroes about 195 px tall drawn 1:1, every colour of the painting kept, the dark 1 px "
        "edge, soft rendered shading, effects in six bands with glow only on magic, lanterns and wisps.",
        figure_height=195, pixel_step=1, colors=0, palette_lock=True, dither="none", shading_bands=0,
        saturation=1.0, contrast=1.0, outline="auto", edge="crisp",
        fx_bands=6, fx_glow="auto", fx_haze=False, fx_frames=8, fx_fps=10.0,
        anim_frames=8, anim_fps=8.0, clip_frames=24, tile_width=72, tile_height=36, tile_hr=2,
    ),
    "gothic_hd": _look(
        "gothic_hd", "Gothic hi-res",
        "Large, finely drawn figures about 120 px tall on a dark gothic palette with gold and bone accents; soft "
        "painted shading, no hard outline, long smooth loops (the look of the gothic hi-res metroidvanias).",
        figure_height=120, pixel_step=1, colors=40, palette_lock=True, dither="none", shading_bands=0,
        saturation=0.9, contrast=1.1, outline="none", edge="soft",
        fx_bands=8, fx_glow="auto", fx_haze=True, fx_frames=12, fx_fps=12.0,
        anim_frames=12, anim_fps=10.0, clip_frames=24, tile_width=96, tile_height=48, tile_hr=2,
    ),
    "rendered_arpg": _look(
        "rendered_arpg", "Rendered ARPG",
        "Rendered-to-sprite figures about 76 px tall on a cool, dark palette of 28 colours, soft edges, no outline, "
        "eight-frame cycles (the classic isometric action-RPG look).",
        figure_height=76, pixel_step=2, colors=28, palette_lock=True, dither="none", shading_bands=0,
        saturation=0.85, contrast=1.05, outline="none", edge="soft",
        fx_bands=6, fx_glow="auto", fx_haze=False, fx_frames=8, fx_fps=10.0,
        anim_frames=8, anim_fps=8.0, clip_frames=16, tile_width=80, tile_height=40, tile_hr=2,
    ),
    "snes": _look(
        "snes", "SNES 16-bit",
        "Chunky 16-colour figures 56 px tall with a hard 1 px dark outline, flat three-band shading in clean colour "
        "areas and short 8-12 frame loops; nothing glows and nothing is soft.",
        figure_height=56, pixel_step=3, colors=16, palette_lock=True, dither="none", shading_bands=3,
        saturation=1.15, contrast=1.3, lightness=0.1, outline="auto", edge="soft", clean=1,
        fx_bands=4, fx_glow="off", fx_haze=False, fx_frames=8, fx_fps=10.0,
        anim_frames=10, anim_fps=10.0, clip_frames=12, tile_width=64, tile_height=32, tile_hr=1,
    ),
    "handheld": _look(
        "handheld", "Handheld 32-bit",
        "Small bright figures about 40 px tall in a 15-colour palette with a hard outline and punchy saturation: "
        "the portable 32-bit look, made to read on a tiny screen.",
        figure_height=40, pixel_step=4, colors=15, palette_lock=True, dither="none", shading_bands=3,
        saturation=1.3, contrast=1.3, lightness=0.12, outline="auto", edge="soft", clean=1,
        fx_bands=4, fx_glow="off", fx_haze=False, fx_frames=6, fx_fps=8.0,
        anim_frames=6, anim_fps=8.0, clip_frames=8, tile_width=48, tile_height=24, tile_hr=1,
    ),
    "indie": _look(
        "indie", "Modern indie pixel",
        "Figures about 80 px tall with saturated accents, four clean shading bands, no outline and smooth "
        "twelve-frame loops: the modern indie pixel look.",
        figure_height=80, pixel_step=2, colors=32, palette_lock=True, dither="none", shading_bands=4,
        saturation=1.2, contrast=1.05, lightness=0.04, outline="none", edge="crisp",
        fx_bands=6, fx_glow="auto", fx_haze=False, fx_frames=12, fx_fps=12.0,
        anim_frames=12, anim_fps=12.0, clip_frames=24, tile_width=64, tile_height=32, tile_hr=2,
    ),
    "painterly": _look(
        "painterly", "Painterly hi-bit",
        "Almost the painting: figures 144 px tall, 96 colours, the painting's own shading, soft edges and no "
        "outline; pixels as a texture rather than a grid.",
        figure_height=144, pixel_step=1, colors=96, palette_lock=False, dither="none", shading_bands=0,
        saturation=1.0, contrast=1.0, outline="none", edge="soft",
        fx_bands=10, fx_glow="auto", fx_haze=True, fx_frames=12, fx_fps=12.0,
        anim_frames=12, anim_fps=12.0, clip_frames=24, tile_width=96, tile_height=48, tile_hr=2,
    ),
    # the older plain size tiers (longest side / palette size), kept for older projects
    "8bit": _tier("8bit", 64, 12, "NES-era: tiny, chunky, a dozen colours"),
    "16bit": _tier("16bit", 128, 32, "16-bit era: medium sprites, 32 colours"),
    "hd": _tier("hd", 224, 96, "modern HD pixel: all detail kept, 96 colours"),
    "full": _tier("full", 224, 0, "every colour of the painting kept (no palette), hard pixel edges"),
}

DEFAULT_STYLE = "hd"
LOOKS = [k for k, v in STYLES.items() if v.group == "look"]
FIELDS = [f.name for f in fields(Style)]

_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def get_style(name: str | Style) -> Style:
    if isinstance(name, Style):
        return name
    try:
        return STYLES[name]
    except KeyError:
        raise ValueError(f"unknown style {name!r}; choose from {sorted(STYLES)}") from None


def validate(style: Style) -> list[str]:
    """The reasons a preset is not sane (empty when it is); the tests run this over the whole table."""
    bad = []
    if not (16 <= style.figure_height <= 512):
        bad.append(f"figure_height {style.figure_height} outside 16..512")
    if not (1 <= style.pixel_step <= 8):
        bad.append(f"pixel_step {style.pixel_step} outside 1..8")
    if not (0 <= style.colors <= 256):
        bad.append(f"colors {style.colors} outside 0..256")
    if style.dither not in DITHERS:
        bad.append(f"dither {style.dither!r} not in {DITHERS}")
    if not (0.0 <= style.dither_strength <= 1.0):
        bad.append("dither_strength outside 0..1")
    if not (0 <= style.shading_bands <= 16):
        bad.append(f"shading_bands {style.shading_bands} outside 0..16")
    if style.shading_bands == 1:
        bad.append("shading_bands 1 would flatten the figure to one lightness")
    if not (0.3 <= style.saturation <= 2.0):
        bad.append("saturation outside 0.3..2")
    if not (0.5 <= style.contrast <= 2.0):
        bad.append("contrast outside 0.5..2")
    if not (-0.3 <= style.lightness <= 0.3):
        bad.append("lightness outside -0.3..0.3")
    if style.outline not in ("none", "auto") and not _HEX.match(style.outline):
        bad.append(f"outline {style.outline!r} is not none, auto or #rrggbb")
    if style.edge not in EDGES:
        bad.append(f"edge {style.edge!r} not in {EDGES}")
    if not (0 <= style.clean <= 4):
        bad.append(f"clean {style.clean} outside 0..4")
    if style.clean > 0 and style.colors == 0:
        bad.append("clean needs a palette")
    if not (2 <= style.fx_bands <= 16):
        bad.append("fx_bands outside 2..16")
    if style.fx_glow not in GLOWS:
        bad.append(f"fx_glow {style.fx_glow!r} not in {GLOWS}")
    for key in ("fx_frames", "anim_frames", "clip_frames"):
        v = getattr(style, key)
        if not (2 <= v <= 64):
            bad.append(f"{key} {v} outside 2..64")
    for key in ("fx_fps", "anim_fps"):
        v = getattr(style, key)
        if not (1.0 <= v <= 60.0):
            bad.append(f"{key} {v} outside 1..60")
    if style.tile_width != 2 * style.tile_height:
        bad.append("the ground diamond must be 2:1")
    if not (8 <= style.tile_height <= 256) or not (1 <= style.tile_hr <= 8):
        bad.append("tile size or tile_hr out of range")
    if style.group not in GROUPS:
        bad.append(f"group {style.group!r} not in {GROUPS}")
    if style.colors == 0 and style.dither != "none":
        bad.append("dither needs a palette")
    return bad


def style_table() -> list[dict]:
    """Every preset as a plain dict (looks first, then the tiers), for the CLI, the MCP server and the Studio."""
    looks = [STYLES[k].as_dict() for k in LOOKS]
    tiers = [v.as_dict() for v in STYLES.values() if v.group == "tier"]
    return looks + tiers


def options_for_style(style: str | Style, **overrides):
    """A :class:`~pixelforge.pixelate.PixelateOptions` with every field the preset decides; ``overrides`` win.

    ``outline`` may be given as ``"style"`` (the preset's), ``None`` (none), ``"auto"`` or a hex colour. A ``palette``
    override (a locked palette the caller loaded) is passed through untouched."""
    from .pixelate import PixelateOptions

    st = get_style(style)
    outline = overrides.pop("outline", "style")
    if outline == "style":
        outline = st.outline_arg
    elif outline in ("", "none"):
        outline = None
    base = dict(
        max_size=st.figure_height,
        colors=st.colors,
        dither=st.dither,
        dither_strength=st.dither_strength,
        outline=outline,
        outline_diagonal=st.outline_diagonal,
        bands=st.shading_bands,
        saturation=st.saturation,
        contrast=st.contrast,
        lightness=st.lightness,
        edge=st.edge,
        clean=st.clean,
    )
    base.update({k: v for k, v in overrides.items() if v is not None or k in ("palette", "outline")})
    return PixelateOptions(**base)


def describe_style(style: str | Style) -> str:
    """A short card of the preset, for ``pixelforge styles`` and the Studio."""
    st = get_style(style)
    rows = [
        f"{st.name}: {st.title}",
        f"  {st.description}",
        f"  figure {st.figure_height} px, drawn at {st.pixel_step} screen px per sprite px",
        f"  palette {'every colour kept' if st.colors <= 0 else f'{st.colors} colours'}"
        f"{', locked across frames' if st.palette_lock and st.colors > 0 else ''}, dither {st.dither}"
        f"{'' if st.dither == 'none' else f' ({st.dither_strength:g})'}",
        f"  shading {'as painted' if st.shading_bands <= 0 else f'{st.shading_bands} flat bands'}, "
        f"saturation x{st.saturation:g}, contrast x{st.contrast:g}, lightness {st.lightness:+g}, edge {st.edge}, "
        f"outline {st.outline}{f', clean x{st.clean}' if st.clean else ''}",
        f"  effects {st.fx_bands} bands, glow {st.fx_glow}, haze {'on' if st.fx_haze else 'off'}, "
        f"{st.fx_frames} frames @ {st.fx_fps:g} fps",
        f"  loops {st.anim_frames} frames @ {st.anim_fps:g} fps, game clips up to {st.clip_frames} frames",
        f"  ground tile {st.tile_width}x{st.tile_height} texels at {st.tile_hr} per world px",
    ]
    return "\n".join(rows)
