# Music editor (track/music)

The owner: "I want the music generator to be more like an actual music editor. More tools for editing, more premade
tunes of many genres." Composition standard: Final Fantasy VI, A Link to the Past, Super Metroid: real melodies and
chord progressions, counterpoint between lead and bass, key changes, a motif per piece, SNES-style instruments, the
crunch of the hardware welcome. The Forge's theme rewritten to that standard, dungeon synth near his reference, with
sparkly high notes, playing on launch. The SNES look kept, readable, pixel-drawn controls, levers with typed numbers.

## What is built

- **Engine** `tools/pixelforge/pixelforge/music/` (the old `music.py` is `music/score.py`, the game's 21 cues, with a
  shim so every old import works). `song.py` the model (tempo, key, scale lock, lanes lead/counter/pad/bass/sparkle/
  drums with instrument/volume/tone/pan/mute/solo, patterns of 16-step bars with per-bar chords, sections with
  repeat and transpose, fx), `theory.py`, `synth.py` (49 presets, 6 drum kits), `dsp.py`, `render.py` (8-voice
  stealing, crunch, bit depth, SPC echo, hall, seamless loops; a bar renders about ten times faster than it plays),
  `compose.py` (13 genres, 8 moods; motif stated, sequenced, ornamented, inverted in a bridge that the section
  transposes; counter-line in the lead's rests moving against it; pads voiced smoothly; bass pedal/root5/walk/pump/
  octaves/arpeggio; sparkle arpeggios; drum tables with fills; intro and cadence), `edit.py` (30 operations),
  `library.py` (26 pieces over the 13 genres + the hand-written Forge theme and its working / done variants, all as
  editable song files), `blips.py` (the two-note bell confirm), `measure.py`.
- **CLI** `pixelforge music new|compose|render|play-bar|export|edit|list|load|info|measure|build-library|blips`, all
  `--json`; MCP `compose_music`, `edit_song`, `render_song`, `music_library`. GUIDE_AI has the song format.
- **The bench** `forge/scripts/screens/music.gd` + `forge/scripts/music_canvas.gd`: Tracks, Pattern (grid + piano
  roll, click and keyboard, running cursor, live re-render of the edited bar), Song (parts, key, scale, tempo, the
  sound), Library (by genre, one-click load, Compose from genre/mood/seed), Export (Keep as a game cue by name).
  Every control is one `music edit` op; the bench applies it locally first, the pipeline's file is the truth.
- **The theme**: `library/forge_home.song.json`, C# minor at 72, i VI III VII with a bridge in the iv key, choir
  lead, dark strings counter, cathedral organ, sub bass, glass bells, taiko. Against the reference (`music measure`):
  key C# minor both; centroid 302 Hz vs 310; RMS 0.085 vs 0.127. `forge_working` is the thinned theme over a
  heartbeat; `forge_done` the cadence. Both play from `forge/assets/audio` as before (home on launch).

## Measured (2026-10-04)

| | reference | forge_home | forge_working | forge_done |
|---|---|---|---|---|
| key | C# minor | C# minor | B minor (the iv-key bridge weighs in) | G# major (the dominant held) |
| spectral centroid | 310 Hz | 302 Hz | 214 Hz | 216 Hz |
| RMS | 0.127 | 0.085 | 0.081 | 0.088 |
| length | 107 s | 67 s | 38 s | 18 s |

Bands (dB re total): reference 20-60 -11.9, 60-120 -7.7, 120-250 -5.1, 250-500 -5.4, 500-1k -8.3, 1-2k -18.2, 2-4k
-31.6; theme 20-60 -5.9, 60-120 -4.4, 120-250 -9.5, 250-500 -10.2, 500-1k -9.1, 1-2k -14.3, 2-4k -19.2 (the bells).

## Still short

- Chords are inferred from the pad when a hand-written pattern has none; a chord lane in the editor would be clearer.
- No swing setting (humanise stands in); no per-note pan; one pattern length per song is not enforced.
- The describe line still drafts the older score's cues; mapping mood words to `music compose` is the next step.
- Render latency in the app is the Python start (about half a second), not the DSP.
