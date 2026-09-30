# Godmarrow (Godot 4.7)

A vertical slice of Godmarrow rebuilt in Godot: the pilgrims' camp on the Ashen Moor, the Pilgrim Road, a ruined
chapel, and packs of Kneelers. The art is the web build's own (extracted by `tools/extract_assets.py`).

## Open it
1. Run `Godot_v4.7.2-stable_win64.exe` (in the `Godot` folder on your Desktop).
2. In the Project Manager choose **Import**, pick this folder's `project.godot`, then **Import & Edit**.
   The first open takes a minute while Godot imports the art.
3. Press **F5** (or the play arrow, top right) to play.

## Play
- **Left click / hold**: walk. **Left click a creature**: strike it. **Right click**: throw a thread (costs mana).
- Click gold or an item on the ground to take it. If you fall, click to rise at the camp.

## Where things are
- `scripts/main.gd` lays out the level: the camp, the chapel, trees and stones, lanterns, packs, fog, music.
- `scripts/hero.gd` the hero (eight directions from five painted views), `scripts/monster.gd` the Kneeler,
  `scripts/loot.gd` gold and items, `scripts/hud.gd` the orbs and text.
- `shaders/` the ground, fog and orb shaders. `audio/` the Moor's two music movements, rendered from the web score.
- Renderer: Compatibility (OpenGL), so it runs on almost anything.
