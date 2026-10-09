# 13 · The game's code: how the Godot build is put together

*Rewritten 2026-10-08. The Godot build is the only build: the browser build is retired (Derek, 2026-10-08: "we dont use
the browser anymore"), and its old port audits and the `PORTING.md` that pointed at it are in `docs/archive/`. How to
run, test and ship is page 08; how art is made is page 07.*

## 1. The basics

- **Godot 4.7.2**, GDScript, the **Compatibility renderer** (OpenGL), so it runs on Derek's PC's built-in Intel
  graphics. Viewport 1920 × 1080, stretch `canvas_items` / `expand`; the window opens at 1600 × 900.
- The main scene is `scenes/game.tscn`, whose script is `core/main.gd`.
- **Autoloads:** `Data`, `Game`, `Bus`, `Settings` (section 4).
- **Shader globals** (set every frame by `core/main.gd`, read by any shader): `lamp_world` (where the pilgrim's lantern
  is), `lamp_reach`, `lamp_night` (0 by day, 1 at night), `world_wind` (the one gust, `Game.wind`).

## 2. Units, space and the camera

- **Positions are tiles, and a tile is a yard.** Floats: `tp: Vector2`.
- **The projection:** `Iso.to_screen(tp) = ((x − y) × 72, (x + y) × 36)` Godot units. That is the old web build's
  18 × 9 px tile at 4 Godot units a pixel (`Iso.WPX`). One yard of height is 21 art pixels, which is 84 Godot units.
- **The camera** (`world/cam_director.gd`): zoom `BASE` 1.06, so the pilgrim stands about an eighth of the screen's
  height (Diablo II's proportion; Derek, 2026-10-07). Every body is drawn at `Iso.FIG` 0.78 against the ground, so the
  world reads large round the figures.
- **The lift:** where a zone has a baked land with a height map (the Sunken Bog), `Iso.to_screen` lifts every place onto
  its floor (the Back's crown stands out of the water, the skull and the pit higher still), and `Iso.to_tile` walks a
  screen point back down. Pure directions and offsets use `Iso.vec(v)`, which is never lifted. Other zones have no lift
  map, so they stay flat.
- **Draw order:**

| Layer | z | What |
|---|---|---|
| tile ground | −100 | the zone's ground classes through `shaders/ground_iso.gdshader` (`zone._ground`) |
| baked ground | −90 | a baked land's painted chunks (`world/baked_ground.gd`) |
| floor layer | −50 | ground decals, scatter, corpses' blood (`zone.floor_layer`) |
| shadow layer | −20 | figures' silhouette shadows (`zone.shadow_layer`) |
| sorted | 0, y-sorted | everything that stands: bodies, props, baked tall bands, lanterns (`zone.sorted`) |
| dark layer, HUD | canvas layers | the night and its light (`world/dark_layer.gd`), the interface |

  Standing things go in `zone.sorted` with `position = Iso.to_screen(tp)` at their feet; y-sorting then puts nearer
  things in front.

## 3. The folders

| Folder | What lives there |
|---|---|
| `core/` | `main.gd` (the game scene), the autoloads (`data`, `game`, `bus`, `settings`), `combat.gd`, `hero_stats.gd`, `arcana.gd` (the body board), `save.gd`, `iso.gd`, `lights.gd`, `sfx.gd`, `gust.gd` (the one wind), `sprite_set.gd`, `assets.gd`, `test_hooks.gd` |
| `entities/` | `hero.gd`, `monster.gd`, `missile.gd`, `anim_sprite.gd`, `lantern_unit.gd`, `sil_shadow.gd`, `affixes.gd` + `affix_fx.gd` (champions' deeds), `count_sigil.gd` |
| `entities/ai/` | `brain.gd` (what every creature shares) and one file per behaviour: `ai_husk`, `ai_flank`, `ai_kiter`, `ai_ghost`, `ai_bomber`, `ai_pyre`, `ai_charger`, `ai_burrow`, `ai_flyer`, `ai_shield`, `ai_duelist`, `ai_stalker`, `ai_boss`, `ai_herald`; `ai_world.gd` holds a zone's shared hazards |
| `skills/` | `skill_book.gd`, and one file per calling with its effects in a folder beside it: `animancer` (the Hollow Mystic), `miasmancer` (the Shrine Keeper), `monk` (the Empty Hand), `ossumancer` (the Ossuarch) |
| `items/` | items, loot rolls and drops, the bag, ground items, tooltips, the camp's trades |
| `world/` | a zone and what fills it (section 6) |
| `world/objects/` | lanterns, waystones, NPCs, passages, the object manager and its build and use halves |
| `ui/` | the HUD, the bar, every panel, the title and its stages (`ui/title_stage/`), the Reading, the Codex; `uikit.gd` is the shared look |
| `shaders/` | every shader (section 9) |
| `data/` | the tables the code reads (skills, classes, monsters, items, board, reading, codex) and `data/zones/` (the maps) |
| `art/` | `sprites/` (figures), `landkit/<set>/` (object sets), `zones/<zone>_s<seed>/` (baked lands), `tiles/`, `ui/`, `fx/`, `icons/`, `portraits/`, `reading/` |
| `audio/` | `amb/` (recorded beds), `sfx/`; `audio/music/` was removed with the old score (2026-10-08) |
| `tools/` | Python and other tools: art (`art_study/`, `landkit/`, `landkit3d/`), maps (`worldgen/`, `zone_export/`), PixelForge (`pixelforge/`), title study, skill trees, the Codex, `smoke.sh` |
| `legacy/`, `web/` | the first prototype and the retired browser build (its generators still feed `tools/zone_export`); both ignored by Godot |

## 4. The autoloads

- **`Data`** (`core/data.gd`):
  - `Data.table(name)` reads `data/<name>.json` (skills, monsters, items, classes, progression, world, board,
    reading, codex).
  - `Data.zone(id, seed)` reads `data/zones/<id>_s<seed>.json.gz` (or `.json`).
  - `Data.zone_index()` and `Data.zone_seeds(id)` give each zone's seeds from `data/zones/index.json`.
  - `Data.sprite_set(kind)` gives a `SpriteSet`; `Data.skin_for(kind)` reads `art/sprites/skins.json`, which maps a
    kind to the set that stands in for it.
- **`Game`** (`core/game.gd`):
  - the run's state: `Game.cls`, `Game.seed`, `Game.zone_seeds`;
  - `Game.seed_for(zone_id)` picks one of the zone's seeds from the run's seed;
  - the clock: a 600 s day, `Game.phase()`, `Game.hour_name()` (day, dusk, night, dawn), `Game.day_k()` (1 by day),
    `Game.sky_force`;
  - feel: `Game.hitstop(secs)`, `Game.shake(px)`;
  - the one wind: `Game.wind`.
- **`Bus`** (`core/bus.gd`): signals `monster_killed`, `hero_hit`, `hero_died`, `level_up`, `say(text, secs)`,
  `loot_dropped`, `gold_changed`, `zone_entered`, `boss_woke`, `boss_felled`. Add signals here (additive only).
- **`Settings`** (`core/settings.gd`): damage numbers, hit flash, screen shake, auto-attack, hold-heavy, charge melee,
  music and sound volume, the title scene, fewer effects.

## 5. The game scene (`core/main.gd`)

**Starting up:**
- It reads the user arguments after `--` into `args` (section 10).
- It opens the title when the game is launched plain. Otherwise it loads the saved pilgrim of the calling
  (`--cls`), or a new one with `--new`.
- It builds the dark layer, the atmosphere, the weather, the soundscape, the far pilgrims, the camera director and
  the HUD.
- It adds `world/sleepers.gd`, then enters the first zone (`--zone`, or the camp).

**`enter(zone_id, from)`:**
1. It loads the zone at the run's seed (or `--zseed`) and places the pilgrim at the arrival point for where they came
   from.
2. It spawns the creatures through **`_tame`**, which does two things:
   - only one champion pack in three stays a champion pack, and a zone keeps one named unique;
   - no creature stands more than two levels above the pilgrim.
3. It binds the camera, the dark layer, the atmosphere, the weather and the HUD to the zone.

**Death (`_on_hero_died`):**
- the gold falls where the pilgrim fell (the remnant);
- whatever was chasing loses the scent;
- the pilgrim wakes at the last lit lantern, or at the camp if none is lit.

**Every frame:** it sets the shader globals (the lantern's place and reach, the night, the wind).

**The sleepers** (`world/sleepers.gd`): Diablo II's rule. A creature more than 30 yards from the pilgrim is frozen
(`PROCESS_MODE_DISABLED`) until they come near; bosses and the dying never freeze. Without it, the old moor's 580
creatures all thinking every frame cost most of the frame.

## 6. A zone (`world/zone.gd`)

**Loading** (`load_zone(id, seed)`):
1. the grid, the solid tiles and the path grid;
2. the markers, the arrivals, the connections, the objects and the posts;
3. the layers (floor, shadow, sorted);
4. **the baked land** (`world/baked_ground.gd`), when one exists for this zone and seed;
5. the tile ground, the scatter, the walls, the sprites (props and landkit pieces) and the lights.

**The zone format** (a `.json.gz`; written by `tools/zone_export` from the old browser generators, or by our own
generators in `tools/worldgen`):
- `grid`: `w`, `h` and `cells`, run-length encoded `[value, count]`, row-major.
  - **Solid types:** 2, 3, 4, 5, 7, 8, 9, 10 and 15. Of these, 4 is deep water.
  - **Walkable types:** 0, 1 (road), 6, 11, 12, 13 (mud) and 14 (flags).
- `ground`: `classes` (RLE) and `texKeys`, each class's ground texture: main, mud, road, flags, water and the rest.
- `walls`: `info`, a builder per wall type (stone, cliff, palisade, the old fog strands); `cells`, where walls stand.
- `objects`: portals, lanterns, chests, shrines, waystones (`qobj` `wp`), NPCs (`qobj` `npc` with a role), vendors.
- `markers`: `start`, `safeCircle`, lanterns, waystones, chests, shrines, NPCs.
- `connections` and `arrive`: `arrive` is keyed by the zone you came from.
- `monsters`, `packs`: kind, rank, level, pack, mods, place.
- `lights`: `fire` (with kind: fire, brazier, lantern, sconce), `raw` (a pool of a colour), `wallCandle`.
- `ambient`: the sky colour by phase.
- Optional: `props`, `sprites`, `scatter`, `decor`, `landmarks`.

**Pathing:** `AStarGrid2D` with diagonals only when both sides are open, so nothing squeezes between two solid
corners. **Posts:**
- `add_post(tp, r)` makes any prop solid as a circle at its foot;
- `add_cover(tp, r, h, material, holder)` makes it stop shots by height and material;
- bodies test a ring of eight points.

**Queries:**
- `type_at(t)`, `is_solid(t)`, `blocks_sight(t)`;
- `move(p, v, r)` slides along walls;
- `line_clear(a, b)`, `sight_clear(a, b)`, `path(a, b)`, `room_at(p, r)`;
- `surface_at(t)`: ash, stone, leaf or wet, for footsteps;
- `ambient_at(phase)`.

## 7. What fills a zone (`world/`)

| File | What it does |
|---|---|
| `baked_ground.gd` | lays a **baked land** (`art/zones/<zone>_s<seed>/`). It does three things: draws the painted ground chunks (z −90); sorts the tall bands with the bodies; and sets the floor's height as `Iso`'s lift. The chunks are lit by the lantern through their normal maps, and the bands' plants bend in the wind (`shaders/baked_ground.gdshader`). `--baked=0` switches it off |
| `landkit.gd` | stands a zone's **landkit set** (`art/landkit/<set>/`, picked by the zone's land in `SETS`). It does three things: places each piece by its role, its spacing and its open-way rules; makes it solid at its foot; and gives it cover and material for combat (`struck`: arrows stick in wood, fire takes dry wood, stone throws grit). Pieces are lit by `shaders/landkit_lit.gdshader` |
| `dark_layer.gd` | **the night.** A cold dark overlay with the light map cut out of it: the lantern's pool, flames, wisps and world lights, plus occluder shadows. The night's floor outdoors is 0.52 (lifted from 0.72 on 2026-10-08: "unplayably dark"); underground it is 0.84. Each land has its own grade |
| `flames.gd` | world fires, braziers, sconces and lantern flames from the zone's `lights`: the flame sprites, embers and smoke. They burn warm only; a cold wisp-fire has no flame here yet |
| `atmos.gd`, `air37.gd` | the world's air: dust in the lantern, soul-lights at dusk, leaves on the wind. The mist banks, cloud shadows, haze strips and light bars were removed (Derek hated them, 2026-10-05) |
| `weather.gd` | rain and ash fall, acting in the world |
| `soundscape.gd` | the land's sound beds and the score's cues. The score was deleted on 2026-10-08, so it plays no music until the new one exists |
| `cam_director.gd` | the camera's eye: leads into the walk, opens on arrival, holds a woken boss in frame |
| `objects.gd`, `objects/` | lanterns, waystones, NPCs, passages, and their use (rest, travel, trade) |
| `quests.gd` | the errands, the waystone list (`A1_WP`), greetings and land sayings |
| `sleepers.gd` | far creatures frozen (section 5) |
| `see_through.gd` | anything standing between the camera and the pilgrim thins away while it hides them |
| `impacts.gd`, `splats.gd` | blows, gore, blood pools, bursts |
| `far_pilgrims.gd` | a far pilgrim of another calling crossing the frame at night |
| `zone.gd` | section 6 |
| `cm_*.gd` | the **dropped Cursemark loaders.** Every path goes through `core/cm_data.gd` `root()`, which points nowhere unless `--cm=1`, and the files themselves are gone. They can be deleted in a cleanup |

## 8. Bodies, combat, skills

- **`Hero`** (`entities/hero.gd`):
  - state: `tp`, `st` (a `HeroStats`), `skills` (a `SkillBook`), `face`, `view`, `act`, `dead`;
  - methods: `walk_to(t)`, `mouse_tile()`, `spend_poise(n)`, `poise_hit()`, `drink(i)`, `die()`, `revive(at)`,
    `light_radius()`;
  - the lantern is a bearer unit that follows (`lantern_unit.gd`).
- **`HeroStats`** (`core/hero_stats.gd`):
  - level, xp, the three attributes, life, resource and poise, and their maxima;
  - `item(stat)` for what equipment and the Reading give;
  - the inventory, skill and attribute points, the kept count.
- **`Monster`** (`entities/monster.gd`):
  - the numbers come from `data/monsters.json` (its `scaled` rows per rank and level), times the level curve
    `ease_k`, times **`DMG_K` 0.6** on this difficulty (Derek, 2026-10-08);
  - the night makes them bolder by at most 15% (`hour_mult`);
  - state: rank (normal, champion, unique, minion, boss), mods, poise and reeling, and the statuses (slow, root,
    fear, confusion, damage over time).
- **`Brain`** (`entities/ai/brain.gd`):
  - sleep, loiter and wake;
  - attack tokens;
  - the melee rhythm (chase, wind, strike, recover, gap);
  - the AI kinds override `think()` and the hit hooks.
- **`Combat`** (`core/combat.gd`): `hit_monster`, `hit_hero` (which records who struck and how, so the death screen
  can name the killer), `monsters_in`, `nearest_monster`.
- **`Missile`** (`entities/missile.gd`): `Missile.fire(zone, from, to, speed, dmg, elem, side, look)`.
- **`SkillBook`** (`skills/skill_book.gd`): points, levels, slots, `use(id, at, target)`. A calling overrides `_cast`,
  `tick`, `absorb` and `on_weapon_hit`. Four callings walk: the Hollow Mystic, the Shrine Keeper, the Empty Hand and
  the Ossuarch. The Red Penitent exists in the data only.

## 9. Shaders that matter

| Shader | For |
|---|---|
| `dark.gdshader`, `lightmap.gdshader` | the night overlay and its light map |
| `baked_ground.gdshader` | a baked land: water that slides and glints (alpha 254), the lantern raking through the normal map, plants bending in the wind (bands) |
| `landkit_lit.gdshader` | landkit pieces lit by the lantern through their normal maps; crowns thinning over the pilgrim |
| `hero_lit.gdshader`, `rim37.gdshader`, `shadow37.gdshader` | figures lit, rimmed and shadowed |
| `ground_iso.gdshader` | the old tile ground by class, with water that swells |
| `lake.gdshader`, `blood_pool.gdshader`, `meadow.gdshader`, `snowfield.gdshader` | painted-standard surfaces; the lake is the first piece in the standard |
| `sway.gdshader` | grass, cloth, chains in the one wind |
| skill effects | `acid`, `burn`, `frost`, `miasma`, `ossify`, `radiance_*`, `absence_hush`, `ground_fire` |
| `title_*` | the title's chapel, blood and breath |

## 10. Test hooks (user arguments after `--`)

**Where you start:**
- `--zone=ID`;
- `--zseed=S` (every zone at seed S, when it exists);
- `--hour=0..1` (0.15 is night);
- `--cls=ID` (animancer, miasmancer, monk, ossumancer);
- `--new`;
- `--lvl=N`, `--learn=all:N`;
- `--title`, `--title_scene=...`.

**Automatic play:**
- `--demo` (the pilgrim fights by itself);
- `--trace` (a line of state every few frames);
- `--autocast`;
- `--arena=N --arena_kind=K --arena_live --arena_rank=champion --affix=Name`.

**Looking:**
- `--shot=PATH --shot_t=SECS` (a screenshot, then quit);
- `--show=collision`;
- `--panel=skills|inv|char|board|journal`.

**Measuring:**
- `--perf` (each second: frames, script and physics time, draw calls, nodes, creatures);
- `--off=dark,atmos,sky,far,hud,sound` (switch whole systems off to see what each costs);
- `--ranks` (on entering a zone, print how many creatures of each rank it holds and the uniques by name: checks the
  taming in `core/main.gd` `_tame`).

**Switches:**
- `--baked=0`, `--landkit=0`;
- `--cm=1` (the dropped Cursemark paths);
- the effect benches (`--lakefx`, `--bonefx` and the others).

## 11. Rules for changing code

- **Test before calling it done:**
  - `tools/smoke.sh OUT` (every calling, the panels, the title, a champion fight: 0 script errors);
  - a zone and its look in the game with `--shot`.
- **Keep core changes additive:** a new function or signal, with a comment naming the area and why.
- **Avoid `class_name`** on new files; load scripts by path. A new global class needs the editor's import, and a
  plain launch won't see it.
- **Player-facing text is in the world's voice** (Dark Souls: oblique, grave, plain), never a tutorial voice. Keep the
  word rules (`01-rules-and-decisions.md`).
- **Performance:** keep far things asleep, keep draw calls down (the old moor drew 3,400 a frame; a baked land about
  300), and measure with `--perf`.
