# Tools worth having (research, 2026-10-01)

What exists for free, what PixelForge already covers, and what would make building Godmarrow (and the next
project) easier for a person. Each row says whether the Forge has it, could add it cheaply, or should just point
at an outside tool. Costs: everything here is free; nothing needs a GPU unless marked.

## Already in PixelForge

| Need | Tool in the Forge | Notes |
|---|---|---|
| Prompt writing for a turnaround sheet | `pixelforge prompt`, Studio step 1 | A / A2 / B / C / D prompts with the house rules baked in |
| Sheet split, background removal, soft edges | `project split`, cutout editor | Fix by hand with erase / restore / magic erase |
| 3D from a painting with no GPU | `project run model` (humanoid fit, hull fallback) | The humanoid is the library mannequin fitted to the art |
| Rig + 46 clips, no Mixamo | `project run rig` | Mixamo FBX optional |
| 8-direction renders, normal + depth | `project run render --passes color,normal,depth` | Eevee on CPU, ~1 s a frame |
| Pixel frames, palette lock, outline, no flicker | `project run pixelate` | OKLab everywhere |
| Godot SpriteFrames + Godmarrow atlas | `project export`, `project export-game` | |
| Props, trees, banners with sway | `pixelforge prop` (+ `--game-objects`) | |
| Spell / aura / impact / weather sheets | `pixelforge vfx` (17 kinds, 13 palettes) | Loader `fx/sheet_fx.gd` in the game |
| Iso ground tiles with transitions + TileSet | `pixelforge tiles` | |
| UI frames (9-slice) + StyleBox | `pixelforge ui9` | |
| Skill-tree editing over the data | `pixelforge skilltree` | Edits file re-applied by `tools/skill_trees.py` |
| Still-image animation (sway, flicker, breathe) and RotSprite rotation | `pixelforge animate`, `pixelforge rotate` | |
| AI operator interface | `pixelforge mcp` (MCP server) + `docs/GUIDE_AI.md` | Any Claude can drive it |

## Added since (2026-10-01, all CPU, all offline)

Done from the list below: item icons (`icons`), portraits (`portrait`), palette swapper (`recolor`), sound
sheets (`sfx`, 18 presets), before/after (`compare`), batch mode (`project run-all --all`), a machine check
(`doctor`), the Godot add-on (`godot-addon`: PFSpriteSet / PFFx / PFObjects), the Studio's Tools window, and
`tools/make_world_art.py` in the game as the worked example. Still open: the shadow / rim-light baker, font to
bitmap, the zone preview renderer.

## Cheap to add next (a day each, all CPU, all offline)

1. **Item icon maker.** One Midjourney "flat lay" image of 9-16 items -> cut, square, outline, 32/48 px icons,
   a sheet + `items.json` with names. The inventory needs hundreds; this is the bottleneck after characters.
2. **Portrait / bust cutter.** Head-and-shoulders crops from the front view at 2-3 sizes for dialogue and the
   character panel, with the same palette lock.
3. **Palette swapper.** Recolour a finished atlas by mapping its palette to another (champion / unique tints,
   seasonal variants) without re-rendering: `pixelforge recolor hero.png --map teal=bone`. The game already has
   `@champion` / `@unique` sets; this makes them from one render.
4. **Shadow and rim-light baker.** From the normal + depth sets, pre-bake a soft shadow sprite and a rim-light
   mask per frame, so the lantern look works even where the shader is not wired yet.
5. **Font to bitmap.** Any free font (Google Fonts, OFL) -> Godot `FontFile` bitmap with the game's outline,
   for the HUD numbers and the tome. Godot can do this itself; a one-liner avoids the editor.
6. **Sound sheets.** Not pixel art, but the same shape of problem: `sfxr`-style synthesis (jsfxr port in numpy)
   for hits, pours, bone clicks, so a build never ships silent placeholders. Music stays the game's own.
7. **Zone preview renderer.** Read `data/zones/*.json` and draw the map with the tiles, props and the Forge's
   objects as one PNG, so level layout can be judged without launching Godot.
8. **Atlas diff / look-test page.** `pixelforge compare a.png b.png` -> before/after strip + GIF, for every push
   that touches art (the audits asked for this repeatedly).
9. **Batch mode.** `pixelforge project run-all --all` across every character in a project, resumable, with a
   summary table; for the night the laptop renders the whole cast.

## Outside tools to point at (free, no GPU) rather than rebuild

| Job | Tool | Why not in the Forge |
|---|---|---|
| Hand pixel editing | **Aseprite** (paid) / **LibreSprite** (free fork) / **Pixelorama** (free, Godot-made) | Editors are their own product; Pixelorama even runs inside Godot |
| Tile autotiling rules, terrains | **Godot 4 TileMap terrains**, **Tiled** | Godot's own terrain sets do 47-blob; the Forge makes the tiles |
| Big painting fixes (inpaint, extend) | **GIMP 3** + the G'MIC plug-in; **Krita** (free) | Krita's liquify is the fast fix for a bad limb on a sheet |
| Normal maps from art without 3D | **Laigter** (free), **SpriteIlluminator** (paid) | Our normals come from the model; Laigter covers props painted flat |
| Sprite packing with trimming | **free-tex-packer**, Godot's own atlas import | Shelf packing in the Forge is enough for the game's format |
| Mocap from a webcam | **FreeMoCap**, **Blender + Rokoko free tier** | Needs a camera and a person; the library covers the standard set |
| Free motion packs | **Quaternius UAL** (bundled), **Mixamo** (optional), **CMU mocap (BVH)** | CMU BVH retargets the same way as the UAL via `rig_character.py` |
| Image to 3D with a GPU | Hunyuan3D 2.1, TRELLIS, Pixal3D (`image-to-3dlab`) | Needs 16-24 GB VRAM; the fit beats CPU options; revisit if a GPU appears |
| Super-resolution for a bad Midjourney upscale | **Real-ESRGAN** (CPU ok, slow), **Upscayl** (app) | Only when the sheet is small; the Forge prefers pixels from the native render |
| Colour palette design | **Lospec** palettes, **coolors** | Pick a palette once, lock it with `pixelforge palette` |
| Godot dialogue, quests | **Dialogic 2**, **Godot Quest System** add-ons | Game logic, not art |

## For the next project (what to keep generic)

- Everything under `pixelforge/` is project-agnostic except `godmarrow_export.py` and `styles.py`'s `godmarrow`
  entry; a new game adds one style and one exporter.
- `tools/make_fx.py` and `tools/skill_trees.py` are the game's; copy the pattern, not the files.
- The GUI never hard-codes Godmarrow: it reads `STEPS` and the project's style.
