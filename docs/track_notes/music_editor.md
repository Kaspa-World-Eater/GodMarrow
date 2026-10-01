# Music editor: knobs, not forms

Wanted in the Forge app's "Make sounds and music" quest (and the classic Studio's Music tool): a rack of real
controls, like a synth, backed by `pixelforge/music.py` (`FIELDS`, `cue_table()`, `default_sheet()`,
`parse_overrides()`, `make_music(key, out, seconds, seed, overrides, preview=True)`, `preview_png()`, `play()`).

- **Cue picker** as a row of place cards (Act 1 town / wilds / deep ... bosses, title), each with its mood line from
  `CUE_INFO` and a Play button that auditions a 20-second render.
- **Knobs** (rotary, drag up/down, double-click resets, value shown under each): Tempo (bpm), Key (root as a note
  name, C..B and octave), Mode (a selector: minor, dorian, phrygian, hijaz, harmonic minor, pentatonic minor),
  Metre (6 lilting / 8 straight), Tune (seed, with "another tune" dice), Level (gain), Wind, Wind pitch (windF),
  Echo (ds), Drone note, Drone level, Drone darkness (lowpass Hz), Drone kind (clean / distorted), Length (seconds).
- **Meters**: a live spectrogram or waveform strip from `preview_png`, and a loudness meter.
- **Buttons**: Play / Stop, Render this cue, Render all cues, Keep (writes the OGG into the game's audio/music and
  the sheet into music.json), Reset cue, Compare with the current game cue.
- Everything the knobs set is the same override dict the CLI takes (`pixelforge music a1_town --set bpm=70 ...`),
  so an AI can do the same headlessly.
- Sound effects page alongside: the `sfx.py` kinds as pads (hit, cast, pickup, UI...), each with 3-4 knobs
  (pitch, length, grit, tone) and a Play pad; Keep writes into art/sfx.
