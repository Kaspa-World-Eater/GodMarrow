"""PixelForge music: the composition engine and the editor's functions.

    song      the song model (JSON): tempo, key, scale lock, lanes, patterns of 16-step bars, sections, fx
    theory    scales, keys, chords, progressions, snapping to a scale
    synth     the SNES-style voice set: named instrument presets and drum kits
    render    song -> stereo audio (a bar in well under its playing time), WAV / OGG export
    compose   a new piece from (genre, mood, key, tempo, length, seed); one bar or one lane for the editor
    edit      the edit operations (set note, clear, transpose, reverse, double, halve, humanise, quantise, ...)
    library   the premade pieces, every one an editable song file; the Forge's own theme
    blips     the Forge app's interface sounds
    measure   loudness, spectral balance, key and tempo of any audio (the reference track was measured with it)
    cues      the game's 21 cues as library songs (cue -> song table; the one engine)
    score     the older generator (the web score's port), reachable only with PIXELFORGE_OLD_ROADS=1

The names the rest of PixelForge used from the old single module (CUES, make_music, render_cue, parse_overrides,
write_sheet, cue_table, FIELDS, play, to_ogg, preview_png, write_blips, RATE, SC) are still here; ``make_music`` and
``cue_table`` now render and list the cues from the song library (``cues.py``).
"""

from __future__ import annotations

from . import blips, compose, edit, library, measure, render, score, song, synth, theory  # noqa: F401
from .blips import forge_blips, write_blips  # noqa: F401
from . import cues  # noqa: F401
from .cues import CUE_SONGS, cue_table, make_music  # noqa: F401  (the game's cues from the song library; score.py behind PIXELFORGE_OLD_ROADS)
from .score import (CUE_INFO, CUES, FIELDS, RATE, SC, Cue, default_sheet, load_sheet, parse_overrides,  # noqa: F401
                    play, preview_png, render_cue, to_ogg, write_sheet, write_wav)

__all__ = ["blips", "compose", "cues", "edit", "library", "measure", "render", "score", "song", "synth", "theory", "CUES", "CUE_SONGS", "CUE_INFO", "FIELDS", "RATE", "SC",
           "Cue", "cue_table", "default_sheet", "load_sheet", "make_music", "parse_overrides", "play", "preview_png", "render_cue", "to_ogg",
           "write_sheet", "write_wav", "forge_blips", "write_blips"]
