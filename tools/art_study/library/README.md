# The Godmarrow art library

Derek, 2026-10-07: "all our notes probably need to be cleaned up and consolidated and reorganized ... The goal is to
make a repository that is breaking down all the techniques we use for each environmental type in each object for
references." Then: "do the upgrades, then rewrite the guide."

This is that library. It holds **how things are made**: every technique, what worked, what failed and why, Derek's
rulings and grades, and where the code is. Read the pages that touch a piece before starting it (MASTER_RULES
section 1).

## How the notes fit together
| Kind | Where | What it holds |
|---|---|---|
| **The rules** | `docs/MASTER_RULES.md` | The one list of laws (the gate, FORM IS LAW, scenes make assets, weather in the world, the checklist). Rules live there and nowhere else |
| **The library** (this) | `tools/art_study/library/` | Techniques: methods, environments, objects |
| **The studies** | `tools/art_study/chapters/` | The real world, studied from sources: detail, ruins and ash, teeth and flesh, stone and caves, cut wood, old-growth trunks, faces in trees |
| **The ecosystems** | `tools/art_study/ecosystems/` | Each land's real ecology, species, rules for where things grow, transitions |
| **The reports** | `tools/art_study/reports/` | One per finished piece: the lessons drawn out |
| **The pass logs** | `tools/landkit/passes/` | History: every pass, graded, in order. The library cites them; it does not repeat them |
| **The code** | `tools/landkit/` (objects, effects, ground) and `tools/art_study/` (scenes, the engine) | The generators themselves; each module's docstring is its short brief |

## Methods: how things are made
| Page | For |
|---|---|
| [Form and depth](methods/01-form-and-depth.md) | FORM IS LAW, the depth effect, planes not domes, the value-only test |
| [Ray-casting](methods/02-ray-casting.md) | Forms ray-marched along the game's camera: eyes, bone, vessels, hollows, carving |
| [The warped column](methods/03-warped-column.md) | Trunks that taper, swell, wander and twist |
| [Light](methods/04-light.md) | Moon, lantern, candles; light adds; one strong statement; no red light |
| [Values, ramps, dither](methods/05-values-ramps-dither.md) | Tones by size, quiet ground, small things by contrast |
| [Effects and weather](methods/06-effects-and-weather.md) | Blood, fire and wax, rain in the world, fog in the lows |
| [Living layers](methods/07-living-layers.md) | The seamless loop, blinks, flicker, sway |
| [The scene engine](methods/08-scene-engine.md) | `wood_scene.py` as a framework: hooks, order, switches, traps |

## Environments: one page per land
[Old-growth wood](environments/old-growth-wood.md) ·
[The ritual glade](environments/the-vigil.md) ·
[Fen and carr](environments/fen-and-carr.md) ·
[The Ashen Moor](environments/ash-moor.md) ·
[Ruins and stone](environments/ruins-and-stone.md) ·
[Caves and the organic deep](environments/caves-and-the-organic-deep.md) ·
[Lands not yet built](environments/lands-not-yet-built.md)

## Objects: one page per family
[Trees and bark](objects/trees-and-bark.md) ·
[Stumps and deadwood](objects/stumps-and-deadwood.md) ·
[Stones, rocks, paving](objects/stones-rocks-paving.md) ·
[Columns, ruins, iron](objects/columns-ruins-iron.md) ·
[Eyes](objects/eyes.md) ·
[Teeth and fangs](objects/teeth-and-fangs.md) ·
[Bone](objects/bone.md) ·
[Blood and fluids](objects/blood-and-fluids.md) ·
[Water](objects/water.md) ·
[Fire, candles, wax](objects/fire-candles-wax.md) ·
[Hollows, alcoves, altars](objects/hollows-alcoves-altars.md) ·
[Fungi and the three lights](objects/fungi-and-lights.md) ·
[Plants and litter](objects/plants-and-litter.md) ·
[Ground generators](objects/ground-generators.md) ·
[Tendrils and vessels](objects/tendrils-and-vessels.md)

## Settled by the latest evidence
Older notes disagree with these. The older notes are history; these stand:
- **Stones are tilted planes with chips and a bevel, never domes** (chapter 4). The dome or pillow look is what Derek
  called cartoony. Chapter 2 and report 1's "pillowed" paving are superseded.
- **Floors are world-position generators, not fixed tiles** (MASTER_RULES 2b.6). STUDY round 12, LIVING_LANDSCAPES
  step 6 and `tile_sheet.py` describe the retired tile road.
- **Form is never put into colour** (MASTER_RULES 0). STUDY rounds 10 and 12 did so; they are superseded.
- **Normals are never blurred into pillows** (chapter 4). Where a scene still sets `NORMAL_BLUR` above 0, it is a
  debt.
- **The Hollow Wood's trees are the pale vein-trees,** towering, their crowns out of frame. The oak-like crowns in
  the old-growth study are superseded.
- **"Never 3D-looking"** (wiki 01, 06) means never a cheap 3D look. Real form, ray-cast and painted, is the law.
- **Weather happens in the world, not on it** (Derek, 2026-10-07).
- **Insects are allowed** in the world; the no-animals law does not cover them (Derek, 2026-10-07: "bugs are fine").

## Decided (Derek, 2026-10-07: "You decide. We can also be flexible")
- **Tones per material, by size:** big forms 6 to 8 tones, small things (a 10 px stone) 3 to 4, always hue-shifted,
  plus near-black. This settles PAINTED_STANDARD rule 1 against rule 9 and chapter 4.
- **The duplicates in code merge into one shared piece each,** as part of the old-scene upgrade (so nothing breaks
  mid-work): `tooth.py` into `fang.py`; the moor scene's painted eye into `eye.py`; `deadwood.stump` into
  `vein_stump.py`'s method.
- **The ritual glade is named the Vigil:** its candles have been kept burning since the rite, as if something is
  still being waited for. Scene `tools/art_study/vigil.py`, log `tools/landkit/passes/vigil.md`, manifest
  `tools/landkit/sets/vigil.json`.
- **Flexible where it serves:** a technique that breaks a rule can stand if Derek judges it better (the old dune
  stays open to that test).

## Debts found while writing the library (to fix)
- ~~Several animated terms grew with time instead of cycling~~ (fixed 2026-10-07: each now moves on a small circle
  or a whole number of cycles a loop, so the loop has no seam).
- ~~The engine's moon rim skipped tags of 400 and above~~ (fixed 2026-10-07: `wood_scene.RIM_EXTRA` names a scene's own
  tags to rim; the Vigil's trunks take it).
- `NORMAL_BLUR` is still above 0 in the engine default (1.0), the Vigil (0.6) and the Gate (0.35).
- No value-only render switch exists yet for the form test.
- MASTER_RULES 0.1 and 0.6 still say "domes" for paving; chapter 4's planes supersede them.
- Retired fixed tiles still ship through `build_set.py` (`tiles_wood`, `church_flags`).
- `bone.SINEW` is brown; chapter 3 says dried sinew is translucent amber.
