# What the game needs from PixelForge, and what it doesn't

*From the game session, 2026-10-05, for the PixelForge session. Derek asked for this after the Hemomancer work: "does it
have a bunch of shit that's useless, like the automatic drawing which just makes a blob?" This is the game side's
answer, from what the game actually loads and from making the Hemomancer. The Forge is yours; this is a request,
and Derek decides.*

## 0. Update, 2026-10-05: the character road is now painting → 3D model

Derek's verdict on the samples: "better than anything so far". The road that makes the model is
`tools/pixelforge/model3d.py`:
```
.venv/Scripts/python model3d.py NAME --front F.png [--side S.png] [--back B.png]    (or --sheet SHEET.png)
```
1. **The shape:** Hunyuan3D-2's free Hugging Face demo makes it from the front view, about 20 s. A token in
   `~/.huggingface/token` gives more daily GPU time.
2. **Blender** (`pixelforge/blender/model_from_views.py`) cleans it, removing sliver triangles and crumbs.
3. **Colour from the painting:** the painting's own views are projected onto the shape.
   - Each point is ray-tested, and the view it faces squarely wins.
   - The picture the shape was made from counts most.
   - The one side view is mirrored for the other side; a missing back is the front mirrored.
   - Hidden points are filled from their neighbours.
4. **Reduced** to about 120k faces with vertex colour, which is plenty at 195 px.
5. **Judging pictures:** `NAME_views.png` and `NAME_size.png`.

Samples: `docs/concepts/hemomancer/model3d/hemomancer_views.png`,
`docs/concepts/tree_test/model3d/ash_oak_views.png`.

**Tried and dropped:**
- TRELLIS (`trellis_gen.py`): squat and murky.
- Hunyuan's own texturing: broken on their server.
- A texture bake from the full model: its rays hit the wrong layer where cloth and planks lie close.
- Silhouette-search alignment: worse than the plain height-and-centre match.

**What this means for the Forge.** The model no longer has to be authored. What the game needs from the Forge is
everything after the model:
- rig: fit the standard skeleton and weight it;
- animate: the motion library;
- film 8 directions at game scale with the game camera;
- pixelate and finish;
- `export-game`, and `objects.json` for props.

Section 3.1 (painted detail riding the parts) and 3.2 (light and ink in the renderer) matter much less now, because
the model carries its painting. The shape road and the auto-drafts in section 2 are now clearly the ones to retire.

## 1. What the game uses today (checked in the code, 2026-10-05)

In real play the Godot build reads exactly two things the Forge makes:

| Forge output | Where the game reads it | Status |
| --- | --- | --- |
| Hero sprite sets: `art/sprites/<kind>.png/json` from `project export-game`, with `art/sprites/skins.json` | `core/data.gd` (`skin_for`, `is_pixelforge_set`), `entities/hero.gd` | **Essential.** The Mystic, the Keeper and the Hemomancer play with them. |
| Music: `audio/music/*.ogg` (rendered by `tools/make_music.py` through the Forge's music code) | `world/soundscape.gd` | **Used.** |

Everything else the Forge has put into the repo is used only by test hooks (`core/test_hooks.gd --fx / --place`) or
not at all:

| Forge output | In the game | Note |
| --- | --- | --- |
| `art/fx/` (259 files, effect sheets) | only `--fx` previews | No skill plays them. Worth keeping if they get wired in; see section 3. |
| `art/objects/pf_*` (84 CC0-kit props, painted stand-in buildings) | only `--place` previews | Derek: "not game quality". Zones don't place them. |
| `art/tiles/` (ground sets, TileSets) | nothing | The ground is the browser's painted textures (`world/zone.gd _ground`). |
| 9-slice UI frames | nothing | |
| `art/sfx/pf` (synthesised sounds) | nothing | |
| Normal and depth map passes (`<kind>_normal/_depth`) | nothing | Nothing lights sprites with them. |
| Portraits, icons, recolour (`@champion/@unique`) | nothing | |
| `addons/pixelforge` (PFSpriteSet, PFFx, PFObjects) | test hooks only | |

## 2. What doesn't help, and should be cut or hidden

These cost the Forge's time and attention and produce nothing the game keeps. The worst is that they look like a
road to a character and lead to a blob.

1. **Automatic drafting of characters.** `shapes draft` (a sentence → a starter model) and the picture road
   (`character from-picture`: picture → cutouts → measured draft → coloured). They make the blob Derek keeps
   seeing. The draft is a mannequin sized to a silhouette, around 0.7 overlap with the painting, and it has none of
   what makes a character: the face, the folds, the plates, the wear. Those are all hand work. Measuring and
   `compare` are useful (below). Presenting a draft as "your character" is not. **Ask:** take the draft out of the
   Characters bench's main path. Keep `measure`, `sample-materials` and `compare` as tools a person uses while
   building by hand.
2. **The old cutout road:** `hero` (split → carve → Blender → rig → render). The first Hemomancer came out of it as a
   blob. It is already labelled "the old road". **Ask:** remove it from the app and the guides, or move it behind a
   flag, so no session or person reaches for it again.
3. **Kit props and painted stand-ins:** `prop3d` with the auto-fetched CC0 kits, `make_buildings.py`/`pf_paint` buildings,
   `tiles3d`. Rejected by Derek, unused by the game. **Ask:** stop making more; leave the files until a painted
   replacement exists, or delete them with Derek's word.
4. **Two music engines:** the old generator (the port of the web score) and the new song editor. **Ask:** one of them;
   Derek picks which sound he wants.
5. **Breadth before depth:** effects engine, spell designer, skin editor, portraits, icons, recolour, the Diablo 2
   bridge, jobs, `describe`. Each may be fine, but none of them is in the game, and the game's real gap is that its
   characters don't yet look like their paintings. **Ask:** no new tools until the character road makes a character
   Derek calls finished.

## 3. What the game needs that the Forge doesn't do yet

In order of value.

### 3.1 Painted detail that rides the parts (the most important)

**What happened.** The Hemomancer's model (`tools/pixelforge/assets/shapes/characters/hemomancer.shapes.json`, 173
shapes) renders as flat pieces. Next to the painting (`docs/concepts/hemomancer/test1/sheet_original.png`) it lacks:
- a face (brow, eye sockets, nose, cheekbones);
- muscle on the chest, belly, back and arms;
- the wrapped folds of the shawl and the hanging folds of the cape;
- wood grain and the bleeding nail holes on the planks;
- the wraps of the bandages and leg-cloth;
- lit edges on the iron.

The game session paints these on afterwards in `tools/paintover/detail_hemomancer.py`, frame by frame, using the
part masks (`frame_NNN.parts.png`; thank you for those, they made it possible). It works, but it is a script outside
the Forge. It guesses each part's orientation from its pixels, and it has to be re-run after every render.

**Ask: a detail layer in the shape file, painted once, rendered into every frame.**
- Each part (or shape) gets a small painted texture in its own surface coordinates, like UVs: a face texture on the
  head, a fold texture on the cape, a grain-and-holes texture on each plank.
- The renderer samples it in every frame and direction, so the detail turns and bends with the part. It should then
  be a render step, not a post-process.
- An editor bench: pick a part, see it unwrapped (front/back or cylindrical for limbs), paint on it with the
  material's ramp (pencil, a few brushes, the ramp's shades), and see it on the turning figure at once.
- Stock detail per material, so a new character doesn't start blank:
  - **face:** brow and sockets, by head size;
  - **cloth:** hanging and wrapped folds;
  - **wood:** grain and holes;
  - **bandage / leg-cloth:** wraps;
  - **metal:** worn edges and rivets.
  The painter starts from these and changes them.

### 3.2 Light and ink in the renderer

What `tools/paintover/paint_hemomancer.py` does after the fact belongs in the render:
- form light from the upper left on each piece;
- creases where pieces meet;
- a darker inked edge between pieces and round the silhouette;
- a faint lit rim on the light side.

The paintings have it, and a sprite without it reads as plastic. Keep it as a style setting (`styles`), on for the
`godmarrow` preset.

### 3.3 Blood and wear as materials, not specks

Blood today is random red pixels on the cloth. In the paintings it runs: streaks and drips down from wounds, holes
and edges. **Ask:** a "runs" option on a material, so blood decals drip downward in the rendered view and stay put on
the part.

### 3.4 One command from a changed shape file to the game

Today: `import-shapes` → `render-shapes` → (the game session's paint scripts) → `export-game`. **Ask:**
`project build <char>` runs all of it, including the detail layer and light. It should write `skins.json` and say
plainly if the figure is the wrong height. The game session will retire its paint scripts once 3.1 and 3.2 exist.

### 3.5 Act I's creatures and the camp's folk

The game needs the 20 Act I creature kinds, 4 Heralds, 2 bosses, and the camp's folk:
- Maren, Ysolde, Brannoc, Esk, the Stranger, Nell.

They need real art through the same road (shape model + detail layer). Today most are the browser's old sprites, and
the camp's folk are blank figures with black faces. This is the art half of finishing Act I
(`docs/archive/ACT1_PLAN.md`, step 7). Each needs idle, walk, attack, hit and death in 8 directions; the game's monster
loader reads the same atlas format as the heroes.

### 3.6 Effects, only when a skill asks

When the combat-feel work wires effects into skills (`docs/archive/GAME_HANDOFF.md`), the game will ask for specific
effects by name. Until then `art/fx` stays unused.

## 4. Rules the game holds the Forge to

From `docs/wiki/01-rules-and-decisions.md`, the ones that bite art:
- No red light.
- No glows or trails on attacks or casts; lanterns, wisps and magic may glow.
- Never a "3D look"; never reduce Derek's colours.
- No animals.
- Heroes stand 195 px (the `godmarrow` preset).
- 8 views.
- The fixed animation set: idle, walk, atk, atk2, cast 8; hit 6; death 8; dodge 8.

## 5. Where to look

*PixelForge session, 2026-10-05, on 3.1 to 3.4:* landed on `track/finish`. The detail layer (`pixelforge shapes
detail FILE --stock`, the Forge's Detail bench), the light and ink in the `godmarrow` preset, blood `runs` as a
material option, and `pixelforge project build <character>` (import, the fixed animation set in eight views with the
detail and the light, export, `skins.json`, the height check). The Hemomancer and the Keeper carry stock detail beside
their files (`<name>.detail/`); `docs/screens/forge/hemomancer_detail_compare.png` and `keeper_detail_compare.png`
show the painting, the flat model, the detail and the light side by side. The game session can retire
`tools/paintover/*` once it has rebuilt the Hemomancer with `project build` (the scripts are left in place).

- The Hemomancer's model and its history: `docs/concepts/hemomancer/shapes/README.md`.
- The paint-over scripts and before/after pictures: `tools/paintover/`,
  `docs/concepts/hemomancer/shapes/paintover_*.png`.
- His masked render (the input to the detail script): Derek's PC, `PixelForge Projects/godmarrow/characters/hemomancer_paint`.
- The Act I plan: `docs/archive/ACT1_PLAN.md`; the game's state: `docs/HANDOFF.md` section 8.
