---
name: godmarrow-sound
description: Use when making, changing or judging a Godmarrow sound - the synthesized loops and one-shots in core/sfx.gd (fires, the Red's mass, slump and drag, the shuffle, thunder), the recorded Kenney sounds in audio/sfx/, their gains, and the world's sound beds - including writing them out as .wav files to listen to (tools/body3d_test/fire_wav.gd) and measuring them (spectrum.py in this folder).
---

# Sounds: made, heard, measured

## Where sound lives

| Part | Where |
|---|---|
| The body's and the world's short sounds, `Sfx.play("name", vol, pitch)` from anywhere | `core/sfx.gd` (`class_name Sfx`): synthesized from noise and a few tones (`_make`, `_noise`, `_thud`, `_mix`), a few takes each with small random changes; recordings where they serve better (`SAMPLES`, `LAYERS`) |
| Recordings | `audio/sfx/*.ogg`: Kenney's CC0 "Impact Sounds" and "RPG Audio" (`audio/sfx/LICENSE_kenney.txt`); footsteps, blows, cloth, glass, iron, coins, leather, books, a bell |
| Loops | `Sfx.loop(kind)`: `fire_torch`, `fire_brazier`, `fire_candle`, `red_surge`, `red_mass` |
| The live Red's one-shots | `Sfx.red_slump()`, `Sfx.red_drag()`, played by `world/red_sea.gd` where each wave lands and drains in view |
| Gains (dB) | `GAIN` and `SGAIN` in `core/sfx.gd`; `OURS` lists our own synthesized names |
| The room | the "World" bus with a reverb whose wet grows underground (`Sfx.set_room(indoor)`) |
| Beds and the score's cues | `world/soundscape.gd`, `audio/amb/`. The old score was deleted (2026-10-08): there is no music until the new one exists (Derek's brief: Middle-Eastern in the manner of Diablo II, dark, a touch of Muay Thai's sarama). Do not start the music without his go |

The laws that bind sound: the Red moves slowly on a dying heartbeat, thick and viscous: a heavy slosh, a dull drag
back, then stillness, never a chop or a splash (memory "Red Water motion"). No animal sounds (insects are allowed).
Fires each have their own voice: a torch's dry crackle, a brazier's low roar and snaps, candles' faint flutter.

## Hear it: write the sounds out as .wav

```bash
cd /c/Users/derek/GodMarrow
G=/c/Users/derek/OneDrive/Desktop/Godot/Godot_v4.7.2-stable_win64_console.exe
SPW=$(cygpath -m "$SP"); mkdir -p "$SP/wav"
timeout 120 "$G" --path . -s tools/body3d_test/fire_wav.gd -- "$SPW/wav" 2>&1 | grep -E "^WAV|ERROR"
```

`fire_wav.gd` writes the five loops and the Red's two one-shots (`WAV <name> 0` means saved). To hear a new sound,
add its name (or its maker's call) to the list in `fire_wav.gd`. You cannot listen; Derek can: give him the paths, and
measure the files yourself.

## Measure it

```bash
tools/pixelforge/.venv/Scripts/python .claude/skills/godmarrow-sound/spectrum.py "$SPW"/wav/*.wav
```

`spectrum.py` prints for each file: its length, peak and RMS level (dBFS), and the share of its energy in bands
(under 100 Hz, 100 to 300, 300 to 1k, 1k to 3k, 3k to 8k, above). The commit that gave the live Red its sound
(793a48c6) reports 91 to 98% of the energy under 300 Hz (dull and heavy, thick blood); a sound meant to be heavy that
puts much of its energy above 1k reads as a splash. Compare before and after a change and put the numbers in the commit or the pass log.

## In the game

Sound is heard only with a window; a capture run (`godmarrow-capture`) plays it but saves only pictures. Check the
log for errors after a change (`SCRIPT ERROR` in `core/sfx.gd` breaks every sound). Run the smoke test: every
calling's skills and the panels call `Sfx.play`.
