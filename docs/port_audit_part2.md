# Port audit, part 2 of 3: browser `web/triune_desktop/src` vs Godot

*Written 2026-10-01. Files: zy_anim … zz_ossu_active_melee (54 files, 16 976 lines). Method: read each browser file (art-data
files skimmed for behaviour), grep the GDScript for the counterpart, compare numbers. The browser's FINAL behaviour (after
every later `zz_*` wrapper) is the reference; `_exclude.txt` files were skipped. Line numbers are to the files in this
repo. "Via export" means the behaviour is not code in Godot but data baked by `tools/export_data.js` /
the zone exporter from the live browser build (zones, monsters, skills, items, board), which is faithful by construction.*

**Status key.** EXACT = ported faithfully (numbers checked). DIFFERENT = ported but numbers/behaviour/look differ (how, with
refs). MISSING = not in Godot. LATER = art-data / platform-only / retired / belongs to an unported class. SUPERSEDED = a later
browser file replaces it (named). UNVERIFIED = I could not confirm by reading; stated, never guessed.

A note on the data layer that matters for many rows: Godot has **Act I only**: 25 zones × 3 fixed seeds (12345, 777, 4242)
in `data/zones/`, `data/zones/index.json`. `data/world.json` lists all 75 browser zones with their acts, and
`data/monsters.json` carries the Act 2–5 creature kinds, but no Act 2–5 zone was exported, and `world/quests.gd:236`
(`zone_exists`) gates on the index.

---

## zy_anim.js (628 lines) — the Hollow Mystic's Mirror tree, living wisps, mirror art

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Mirror-tree names/descs/perks (Standing Mirrors, Mirror Fissure, Hall of Mirrors, Falling Mirror, Mirror Shield, Dazzling Challenge, Reflection, Quicksilver Heart, Darting/Splitting Wisps) | zy_anim.js:11-44 | data/skills.json (`pillars`, `fissure`, `cage`, `anvil`, `toss`, `challenge`, `thorns`, `forge`, `beam`, `prism`) | EXACT (via export) | Names verified one by one; `forge` desc is zz_mech_names's later rewrite, as in the browser. |
| Tab name `Mirror` | zy_anim.js:11 | data/classes.json animancer tabs `["Mirror","Soul","Thread"]` | EXACT | |
| UI word swaps `Beam→Darting`, `Prism→Split` | zy_anim.js:50-54 | — | LATER | Canvas text hook; Godot draws its own labels from skills.json. |
| Tooltip numbers (INFO: pillars/fissure/cage/anvil/forge/ironm/resonance/beam/sweep/prism/lance/prismL) | zy_anim.js:58-82 | skills/animancer/tree_mirror.gd, skill_book.num() | UNVERIFIED | Godot has its own `num()` sampler; I did not compare the formulas line by line. `resonance` has **no row in skills.json** (printed `None`): either renamed later in the browser or dropped; needs a check in part 1/3 (o_skills14 / zs_heroes). |
| Living wisps: ricochet off standing mirrors / golem shield, fissure splits wisps, bounce multiplier and max bounces | zy_anim.js:1-9, 60-70 | skills/animancer/tree_mirror.gd (344 lines), tree_soul.gd | UNVERIFIED | Files exist and describe mirrors; rebound numbers not compared. |
| Mirror glass pixel art (anGlassPane, anCrackPx, silver ramps) | zy_anim.js:85-150 | skills/animancer/prop_view.gd, art/sprites (wisp_beam, wisp_prism, wisp_rev) | LATER | Procedural canvas painting; Godot draws mirrors in prop_view.gd. No mirror atlas in art/sprites: UNVERIFIED whether the look matches. |

## zy_flesh.js (456 lines) — the Flesh Golem (Hemomancer minion) art

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Flesh Golem painter (brood-beast: chitin back, three insect legs, gut-maw that pukes swarmlings; poses idle/walk/wind/atk/puke/eat, stock 0-3) | zy_flesh.js:1-120+ | art/sprites/flesh_golem.png/json, flesh_golem_gorged | LATER | Art exported; the Hemomancer (Red Penitent) is not in the Godot build (HANDOFF §1), so nothing uses it. |

## zz_act1_expand.js (769 lines) — 17 new Act I zones

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| 17 zones: sighing_ridge, ash_shore, burnt_heath, fern_gully, pilgrim_road, drowned_village, sunken_bog, fallen_monastery, wolf_den_chapel, plague_hospice, well_shaft, smugglers_hold, bogwitch_shack, tree_hollow, hunter_cache, fallen_watchtower, broken_bridge (mlvl bands :3-22, generators :70-587, registry :592-610) | zz_act1_expand.js:3-22, 592-610 | data/zones/<id>_s{12345,777,4242}.json (all 17 present), data/zones/index.json | EXACT (via export) | Layouts, lanterns (names :102,134,171,214,250,303,337…), portals, packs, chests, shrines are baked. Lantern names already carry zz_voice's renames (`vOld`/`vInscr` in the export), i.e. the FINAL browser state. |
| Per-zone seed derivation (`s*61+7` etc.) and fresh layouts each new game | zz_act1_expand.js:593-609 | core/data.gd:19-25 `zone(id, seed)` picks one of 3 files | DIFFERENT | Browser regenerates from the run seed; Godot has three fixed layouts per zone. Replayability gap. |
| dressZone + `G.__genZone` wrapper | zz_act1_expand.js:613-625 | — | LATER | Generation-time plumbing. |
| ZONE_NAMES | zz_act1_expand.js:626-643 | index.json `name` | EXACT | |

## zz_act2.js (839) / zz_act3.js (919) / zz_act4.js (399) / zz_act5.js (976) — Acts II–V

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Act II, The Bleached Barrens of Ossa (mlvl 18-24): 11 zones a2_town … a2_lair, themes `ossa`/`ossa_town`, white-sun ambient, chalk storms shrink the lamp | zz_act2.js:1-22, 713-723 | data/world.json lists the ids; no `data/zones/a2_*`; world/quests.gd:215 `act_of`, :236 `zone_exists` | MISSING | Creature kinds `calc_knight`, `chalk_worm`, `chalk_wraith`, `dune_kite`, `marrow_ghoul`, `oath_blade` ARE in monsters.json (unused). |
| Act III, The Parasitic Fen of Shog-Mire (mlvl 24-30): 12 zones; heartbeat mud (every 1.7 s, +40% slow on MUD); 7 natives (:494-500) | zz_act3.js:1-27, 494-500, 600-746 | monsters.json has a3_* kinds; no zones | MISSING | |
| Act IV, The Frigid Heights of An-Vhar (mlvl 30-34): 12 zones; chime-winds every 10-16 s drain poise (floor 35%), lantern shelter; dormant Chime-Golems; 6 natives | zz_act4.js:1-36, 114-243 | monsters.json has a4_* kinds; no zones | MISSING | |
| Act V, The Descent (mlvl 34-40) + Scar of Ur-Nihl: 11 zones, brain-coral labyrinth, five-tile morphological opening; 13 natives (:271-283); "Strike the Bell" | zz_act5.js:1-27, 271-283, 577 | monsters.json has a5_* kinds; no zones | MISSING | zz_act5.js:924 also slows the hero to 0.7 in some region (followPath wrap). |
| Act gating / lair naming | — | world/quests.gd:215-233 (`a%d_lair`), :250 `max_act` | EXACT (scaffold) | The code is ready for the ids; only the zone data is absent. |

## zz_arcana_monk.js (536 lines) — the Empty Hand's 26 Arcana cards

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| 9 Majors, 15 Minors, 2 hybrids (names/up/rev text) | zz_arcana_monk.js:13-47 | data/board.json `arcana` (all 26 ids present), `classes.monk.web_def` | EXACT (via export) | |
| WEB_DEF.monk clusters/hybrids, SUIT Bowls | :50-58 | board.json classes.monk.web_def | EXACT | |
| Card effects | :60-520 | skills/monk/tree_radiance.gd, tree_absence.gd, tree_destroyer.gd (grep of `aU/aR/aM("k…")`) | DIFFERENT | 21 of 26 cards are wired: kr_noon, kr_star, kr_sutra(U only), kr_ash, kr_belly, kr_tears, ka_spade, ka_palm, ka_clap, ka_bowl, ka_roots, ka_grip, ka_face, kd_finger, kd_mount, kd_arms, kd_bedrock, kd_obsid, kd_stone, kd_snap, kh_unraised. **No effect found** for kr_brush (halo regrows 30% faster, :380), kr_wax (Amber eats a third less, :381), ka_pitch (Walks pours a third less sand, :382; zz_monk_sand rewrites it), kd_door (10% less damage after standing 1 s, :470), kh_lantern (kills hold the sky +1 s up to 10, :485), and kr_sutra reversed (the worn halo riposte, :456-461). UNVERIFIED whether they live under other names. |

## zz_arcana_percls.js (84 lines) — each order's own Hollow/Void crown

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Per-class v_crown text (Hollow Crown / Crown of the Brood / Choir Crown / Paper Crown / Crown of Nothing) and v_unwritten refill text | zz_arcana_percls.js:13-27 | data/board.json `classes.<cls>.pcls` | EXACT (via export, text) | |
| Choir Crown mechanics (spent/lost wisps return after 3 s above half life; 0.3%/s per wisp drain; reversed mends 0.3%/s) | :43-56 | core/arcana.gd (grep crown/unwritten/choir: no hits), skills/animancer/* | UNVERIFIED | Text is in data; I found no implementation in core/arcana.gd. Likely MISSING unless inside skills/animancer. |
| Paper Crown (Omens never fade above half life; 0.5%/s per Omen; rev mends 0.6%) | :57-60 | skills/miasmancer/* | UNVERIFIED | |
| Crown of Nothing (bulbs capped at 4/5; drain 0.5%/s per bulb over half; rev mends 1.5%/s when both under a quarter) | :61-67 | skills/monk/base.gd | UNVERIFIED | |
| The Unwritten for the Empty Hand runs 5% sand back per kill | :71-75 | — | UNVERIFIED | |
| Potions refused under a reversed crown | :35 | — | UNVERIFIED | |

## zz_arcana_web.js (559 lines) — the Long Web (Minor Arcana knots)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Shared five-region ring layout (REG :74-104, BRIDGE :105-111, HUB :112) | zz_arcana_web.js:72-150 | — | SUPERSEDED | zz_arcana_zbody.js swaps the node table for per-order bodies. |
| Knot values V (life 1%, ess 1%, regen 2%, armor 2, poise 2, prec 3%, shard 1, dmg 1%, melee 1%, fcr 1%, wisp 2%, res 1%, mf 2%, frw 0.5%, lok 1, bleed 2%, sick 2%, evade 0.5%, sun/moon 1.5%, vit/spi/con 1) | :21 | data/board.json nodes `fx` | EXACT (via export) | |
| Points: one per level from 2 + bonus; lift cost 10 + 5×level gold; roads from gate/anchors; leaf-only untie; prune | :160-249 | core/arcana.gd:7-12, 105-130, 184 | EXACT | Rules match the header; path search ported. |
| Sum caps: attributes ≤ 2 each, evade ≤ 8 | :239-241 | core/arcana.gd `_sums` | UNVERIFIED | |
| derive() effects (life%, ess%, armor, poise, prec→stamRegen, dmg/sun, melee/moon, fcr and frw through the item curve, res cap 75, mf, lok, regen, wisp, shardCap, webEvade/Bleed/Sick) | :273-305 | core/hero_stats.gd `W(...)` (e.g. :63 `W("res")`, :151 `W("frw")`) | EXACT (sampled) | frw goes through the same 25/0.6/40 taper (:270 vs hero_stats.gd:152-154). Sun/moon day-night switch UNVERIFIED. |
| Web panel drawing (dark UI, tabs Arcana/Web) | :330-480 | — | SUPERSEDED | by the body board. |

## zz_arcana_zbody.js (870 lines) — the Inverted Triune: one engraved body per order

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Five bodies (paths, pools, notables, keys) for ossumancer/hemomancer/animancer/miasmancer/monk | zz_arcana_zbody.js:22-180 | data/board.json `classes.<cls>.plate` (paths/pool/name/root/box verified for ossumancer) | EXACT (via export) | |
| Graph build: a node every 1.25 units, ends join within 0.42, notables snap within 1.2; cards flowering past each keystone, hybrids at the feet, Hollow steps + four Void cards at the seat; v103 rungs between a page's Majors and the Outer Circle | :250-360 | board.json `classes.monk.nodes`: 209 nodes incl. 6 rung ids, 55 circ ids, 32 cards | EXACT (via export) | core/arcana.gd header describes the same rules. |
| Thread cards refunded on load | :370 | — | LATER | Save migration. |
| Ink/paper palette: INK #1a130d, INK2 #3f3022, GOLD #b8862a, RUB #9a2616, paper #a69472/#b09e7b/#baa985 | :395-397, 400-410 | ui/panel_board.gd:17-21 INKC #2b2017, INK2C #6b5a44, PAPER #d9ccad, RUB #9a2a1c, GOLDK #b88a2e | DIFFERENT | Godot's ink is lighter/browner and the paper is one flat colour (browser: 3-tone foxed tile). |
| The engraved anatomical plate: body outline, the order's system drawn (bones as capsules + skull + pelvis; vessels with heart; nerves with brain and loom; breath curls with lungs and fan; meridians with dantian), lower-right hatching, degree circle, 10 LOD levels | :415-560 | ui/panel_board.gd (481 lines) | UNVERIFIED | panel_board.gd says "an engraved plate on old paper"; I did not find the anatomy drawing code in the part I read. Treat as probably DIFFERENT (simplified). |
| Cards drawn as inked tarot with triangle mark (upright/reversed), hybrids as diamonds | :575-590 | panel_board.gd | UNVERIFIED | |
| Reader column (RW 150), header "Major n · Minor n · laid", footer controls, Whole/Mine/Sums | :600-660, 700-760 | panel_board.gd:9-12 (PW 400, right column), show_sums | EXACT (structure) | |
| Pan/zoom/touch (ZMIN 2.6, ZMAX 34), keys +/-/0 | :560-575, 790-860 | panel_board.gd:2-4 (drag, wheel, 0) | EXACT (structure) | Zoom limits UNVERIFIED. |

## zz_art_rd0_stranger.js (3 lines) — the Stranger's animation data

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| 121-frame 320×270 animated WebP | zz_art_rd0_stranger.js:1-3 | art/reading/stranger_sheet.webp; ui/reading.gd:8, 81 | EXACT (asset) | |

## zz_art_reading.js (479 lines) — the Reading, remade

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Stranger idle: rests through frames 99-120 + 0-3 at 5-9 fps, drifting back and forth with pauses; a random gesture every 9-25 s (45% the full reach to frame 98, else a hand lowered and raised) | zz_art_reading.js:37-70 | ui/reading.gd:19 `FPS := 10.0`, :348 `int(t * FPS) % 121` | DIFFERENT | Godot loops all 121 frames at a flat 10 fps, so he gestures constantly; the browser mostly sits still. |
| Backdrop: art at x4 centred, edges sunk into dark, fire glow at the right edge (lighter), 14 embers | :73-96 | ui/reading.gd:346-360 | UNVERIFIED | Godot draws the cloth darkening; glow/embers not checked. |
| Card emblems painted as ink on paper (hatching by tone) | :100-200 | art/reading/cards/ | EXACT (asset) | Pre-rendered. |
| MAP emblem per choice (star/fear/seek/road/sac) | :185-192 | data/reading.json + art/reading/cards | UNVERIFIED | |

## zz_atmos62.js (159 lines) — mist, dust, soul-lights, leaves, clouds, one wind

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Gust: 8-20 s period, 0.6-1 strength, decay 0.35/s, wind = (sin 0.21t·0.5+0.8)·gust | zz_atmos62.js:425-428 | world/atmos.gd:108 | EXACT | |
| Mist banks: 18 fen / 6+8·night outdoor / 8 underground; life 18-40; colour `q8(130L+44, 136L+50, 144L+62)`, alpha min(0.26, (0.06+0.16·min(1.3,l))·f) | :430-434, 496-503 | atmos.gd:120-122, 256 | EXACT | |
| Dust in the lantern light (10, lit threshold 0.55) | :436-440, 505-513 | atmos.gd dust | EXACT (count) | |
| Soul-lights 2·max(0, night-0.3), life 14-30, lights 30 px/0.3 + 9 px/0.25 | :441-446, 466-477 | atmos.gd:136-163 | EXACT (count/life); light energies UNVERIFIED | |
| Leaves in woody zones, rate 0.25+gust·1.2, cap 40 | :448-455 | atmos.gd:173 | EXACT | |
| Clouds: 2 by day (dk>0.2), multiply 0.18 | :456-460, 489-493 | atmos.gd:182 | EXACT (count) | |

## zz_blood_pool_tone.js (31 lines) — blood puddles toned down

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Pools merge within 0.75 r, grow +0.02 per merge, caps 0.8 (1.4 big), initial ≤ 0.8, max 60 pools | zz_blood_pool_tone.js:17-29 | grep `pool` in fx/fx.gd, world/objects/gore.gd, items/ground.gd: none | MISSING | Godot has blood splatter (`Fx.blood`) and corpse gore (gore.gd) but no growing ground pool system that I could find. |

## zz_bone_melee_shard_costs.js (42 lines) — Carapace strikes cost poise, never Marrow

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| crush 8, gcharge 10, bscythe 7, leap 12, lash 6 poise; mana 0, shards 0 | zz_bone_melee_shard_costs.js:46-52 | data/skills.json cost.poise 8/10/7/12/6, base 0 | EXACT (via export) | Bone Blade 5 (zz_ossu_active_melee) also present. |
| Never refused for low poise (`useStam` then the cast proceeds) | :63-74 | skills/skill_book.gd:249-256 `if pc > 0.0 and hero.st.poise < pc * 0.5:` (refuses) | DIFFERENT | Godot refuses a bone strike under half its poise cost: breaks "poise is stamina, nothing locks you out" (PORTING hard rules; browser :65-66). |

## zz_dbg_hooks.js (2 lines)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| `window.__zt` painter test hooks | zz_dbg_hooks.js:2 | core/test_hooks.gd | LATER | Headless review only. |

## zz_env.js (122 lines) — v0.35 mist/embers/rays/dust, v0.37 grade

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Ground mist puffs (dithered, 3 sizes), 16 fen / 11 outdoor / 6 deep, strength fen 0.2, moor 0.08+0.12·(1-dk), vaults 0.06; only over open ground | zz_env.js:6-53 | world/atmos.gd (atmos62's mist only) | DIFFERENT | In the browser BOTH mist systems run (atmos62 wraps drawAtmos after this one). Godot has only the atmos62 banks: thinner mist, no always-on fen haze layer. |
| Embers over the moor after dark: 8·(1-dk), rising, flickering orange | :55-66 | atmos.gd:21 `embers` ("dusk: embers lifting off the ash") | DIFFERENT | Godot: dusk only; browser: whenever dk<0.7 (dusk, night, dawn). |
| Dawn rays (fen+moor) and dusk rays (moor), `screen`, 3 bands | :67-74 | world/weather.gd `shafts` ("the woods by day") | DIFFERENT | Different hours and lands. |
| Day motes on the moor (14) | :75-80 | atmos.gd:22 `motes` ("dawn: gold dust") | DIFFERENT | |
| postGrade v0.37 (soft-light split, saturation drain, haze, vignette) | :88-122 | — | SUPERSEDED | by zz_grade55.js. |

## zz_fate_tune.js (107 lines) and zz_fate_zcap.js (19 lines) — the Reading's numbers

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Bone-throwing rite removed from the flow | zz_fate_tune.js:142-162 | ui/reading.gd:23 STEPS (no bones); data/reading.json has no `bones` | EXACT | |
| "The Milk Tooth" → "The First Coin" (+say/rev text) | :168-182 | reading.json cards include "The First Coin" | EXACT | |
| Per-choice caps (xp 3, frw 2 … ) | :188-229 | — | SUPERSEDED | by zz_fate_zcap. |
| **Final** per-choice clamp: every percent fx ±1 (dmg, frw, fcr, res, mf, regen, hpPct, xp, gold); flat vit/spi/con 2, armor 4, stam 4, lok 1; text rebuilt | zz_fate_zcap.js:86-97 | data/reading.json (max |fx| found: frw 7, xp 6, mf 17, dmg 6, res 12, armor 14, stam 8, lok 4, vit 4, gold 31, hpPct 7, regen 8); ui/reading.gd:201-213 clamps only the SUM to reading.json `caps` (vit 8, frw 10, mf 30, xp 10, dmg 10, armor 24…) | DIFFERENT | reading.json was built by tools/reading_data.py from source, not from the patched runtime FATE, so the user's "at most 1%" rule (2026-09-28) is not in effect: a Godot pilgrim can start with +7% walk speed and +17% magic find from single choices. |

## zz_fix_ui53.js (34 lines)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Smart quotes in the book faces | zz_fix_ui53.js:107-124 | ui/uikit.gd:126-140 `smart()` | EXACT | Same rules (opening after space/paren/dash). |
| Sky dial hidden while a panel is open | :128-132 | ui/hud.gd (no dial/clock found) | LATER | Godot has no corner sky dial, so nothing to hide. |

## zz_grade55.js (139 lines) — colour grade, the living flame, lantern pool, light through trees

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| GR per land (moor/wood/fen/under/ossa/night: sat, con, bri, hi, lo, hz) | zz_grade55.js:250-255 | world/dark_layer.gd:14-20 GR | EXACT | ossa omitted (Act 2). |
| landOf (moor; fen|shog|bog|mire; wood|root|fern; ossa; else outdoor→moor, indoor→under) | :257-259 | dark_layer.gd:22-30 | EXACT | |
| gradeOf blends toward `night` by (1-dayK) | :265-271 | dark_layer.gd | UNVERIFIED | |
| Ambient per land: day [196,206,224]/night [42,56,102] moor; wood [176,204,194]/[26,52,58]; fen [182,204,190]/[28,50,50]; smoothstep by dayK, keeps the old hour tints ×0.8 | :306-317 | grep of those triples in world/: none | UNVERIFIED | Possibly MISSING; the dark layer may take its ambient from the zone export's `ambient` (4 entries per zone). |
| Dusk haze `90,88,110` 0.1 (no red), day haze per land; vignette dithered 0.66→ | :289-305 | dark_layer.gd | UNVERIFIED | |
| flame55: slow drift + fine tremble + per-flame windows of 4.1 s with a 50% chance of a gutter (78%, depth 0.16-0.32) or a flare (0.09), shaky 0.75 s envelope | :321-337 | fx/flicker.gd:12 `sin(1.3t)·0.06 + sin(7.1t)·0.03 + sin(12.7t)·0.02` | DIFFERENT | Godot flames breathe evenly; no gutters, no flares. The user's "pulsing but realistic, not pulsing all the time" is the browser's event flicker. |
| Hero lantern pool: visPoly ×1.05 at 80 rays, radius ×(0.84+0.04f), alpha (0.34+0.86·night outdoor, 1.05 inside) ×0.62 when the lantern hangs; extra 30 px warm light at the body | :343-355 | world/dark_layer.gd:118 `A := (0.82 - 0.5 dk²) if outdoor else 0.84`, :151-158 | DIFFERENT | Different alpha curve (Godot 0.32-0.82 by day², browser 0.34-1.2 by night, then ×0.62). Shape/radius UNVERIFIED. |
| Light passes between trees: only CLIFF/WALL/FOG/PILLAR/PALISADE stop it (visPoly LTALL) | :361-370 | world/zone.gd `blocks_sight(t)` | UNVERIFIED | |

## zz_ground55.js (74 lines) — painted ground textures

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Per-land seamless textures (moor, fen, ridge, bone, ossa…), class→texture mapping, two variants mixed by world noise with a dithered edge | zz_ground55.js:306-313, 340-345 | world/zone.gd:163-169 `_ground()` (Assets.ground(land), exported `ground.classes` + `texKeys`), assets/ground | EXACT (via export) | Textures extracted into assets/assets.json `ground`. |
| GAIN per land (fen .78, ridge .86, bone .84, ossa .86, a5 .88, shog .9) and the wall/cliff foot shadows (0.78/0.6/0.45 steps), wet-edge darkening | :310, 348-356 | zone.gd ground shader (`ground_mat`) | UNVERIFIED | |

## zz_hero_animancer.js (1054), zz_hero_animancer_r8.js (64)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Sculpted Weaver painter (72×60 frame, 1.5×; rig, materials, trinket hem…) | zz_hero_animancer.js:1-400 | — | SUPERSEDED | by zz_hero_animancer_r8.js (PixelLab sheet). |
| r8: PixelLab 5-view sheet, poses idle/walk/atk/atk2/cast/hit/death/dodge; idle at G.time·1.8, walk at distance·3.8, blows alternate atk/atk2, roll→dodge over 0.34 s | zz_hero_animancer_r8.js:4-50 | art/sprites/animancer.json (atk, atk2, cast, death, dodge, hit, idle, walk; 5 views) | EXACT (asset) | Godot picks atk/atk2/atk3 by string index (hero.gd:355), browser alternates every blow: minor DIFFERENT in which frame plays. |
| Weaver's skill effects, class lamp, light14 hooks in the big file (castSkill/drawClassLamp/light14/arcanaRender wrappers) | zz_hero_animancer.js (wrappers list: castSkill, drawClassLamp, drawHero, heroFrame, heroPose, hurtMon, killMon, light14, render, arcanaRender) | skills/animancer/*.gd, fx.gd | UNVERIFIED | Not compared; part 1/3 covers the Mystic's skills proper. |

## zz_hero_hemomancer.js (1061), _r4 (4), _r5 (1017), _r8 (64)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Sculpted Hemomancer (v0.37) and hand-drawn r5 (100×180) | zz_hero_hemomancer.js, zz_hero_hemomancer_r5.js | — | SUPERSEDED | by r8 (PixelLab). r4 is a no-op (`zz_hero_hemomancer_r4.js:4`). |
| r8 PixelLab sheet | zz_hero_hemomancer_r8.js | art/sprites/hemomancer.json (same 8 anims) | LATER | Asset exported; the class is not playable in Godot (HANDOFF §1). |
| Hemomancer skill effects/renderers (bloodCast, bloodRender, drawPools, drawTumor, tentMaw…) | zz_hero_hemomancer.js wrappers | — | LATER | Unported class. |

## zz_hero_miasmancer.js (913) — the Shrine Keeper, painted

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| HD-twin painter, 64×62 frame, 5 views from one 3D rig | zz_hero_miasmancer.js:1-30 | art/sprites/miasmancer.json: idle(4) walk(8) atk cast lunge rake spin thrust, 5 views | EXACT (asset) | This is her FINAL art (no r-file). |
| Hit and death poses | (heroPose/deathFx wrappers) | miasmancer.json has no `hit`/`death` anims; entities/hero.gd:512, 540 fall back to idle | DIFFERENT | She does not flinch or fall in Godot. |
| Her effect renderers (miasRender, vfxHit, floatText wraps) | wrappers list | skills/miasmancer/fx.gd | UNVERIFIED | |

## zz_hero_monk_hd.js (78) and zz_monk_hitdeath.js (32)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Approved slim monk HD sheet (258×249 at 3×), gear 0 | zz_hero_monk_hd.js:1-40 | art/sprites/monk.json: idle walk cast clap death dodge flurry(+wind/end) heavy hit hungry leap light1-3 pinch sky skyfist | EXACT (asset) | Godot even carries more poses than the browser maps. |
| Hit: three frames over 0.18 s (0.06 each) while not striking/casting/rolling; death: six frames at 0.13 s, then lies | zz_monk_hitdeath.js:9-11, 20-24 | entities/hero.gd:512 (`hit`), :540 (`death`) | EXACT (timing UNVERIFIED) | Frame rate comes from the atlas fps. |

## zz_hero_ossumancer.js (1264), zz_hero_ossumancer_r7.js (61)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Sculpted bone-plate Ossuarch (80×68), per-skill poses O6_PH (crush, sweep, lash, gleap, gcharge, batk…) and per-strike bone weapons O6_WPN (maul, scythe, whip, blade) | zz_hero_ossumancer.js:17-29 | — | SUPERSEDED | r7 maps every melee skill to `atk` and every cast to `cast` (zz_hero_ossumancer_r7.js:36-47); the bone weapons in hand are gone in the FINAL browser too. |
| r7 PixelLab Ossuarch (quilted slate coat), 5 views | zz_hero_ossumancer_r7.js | art/sprites/ossumancer.json: atk cast death hit idle walk, 5 views; art/sprites/ossuarch (front-only idle/walk: a Forge test) | EXACT (asset) | |
| Skeleton/colossus painters (drawSkel16, drawGiant, drawColossusWeapon, skelDies) | zz_hero_ossumancer.js wrappers | art/sprites/skeleton_* (bow, flail, greatsword, halberd, mage, shield), colossus_* (flail, scythe, shield, swords) | EXACT (asset) | |

## zz_hud54.js (129) — the bar rebuilt (slab, glass, serpents, plaques)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Liquid palettes life/vitae/marrow(pearl)/essence/miasma/empty | zz_hud54.js:34-41 | ui/bar.gd:20-27 LIQ (+`sand`) | EXACT | Hex for hex. |
| Glass painter: 6 flat steps, rim bands at rr .62/.86, swirl clusters, lit upper-left, meniscus 0.035, pearl flecks 0.965, bubbles, empty-glass reflection, crescent highlight, dot | :49-95 | ui/orb.gdshader (whole file) | EXACT | A line-for-line port. |
| Repaint throttle (12/s, 6/s slow) | :54 | — | LATER | Perf only. |
| Baked slab + serpents (h54) | :10-33, :96-110 | art/ui/h54_*.png present; bar.gd uses h55 fronts | SUPERSEDED | by zz_hud55. |
| Plaque numbers (7px IM Fell, bronze plate) | :111-128 | — | SUPERSEDED | by hud55 plaque. |

## zz_hud55.js (207) — the bar carved again

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Slab panel at y0 216, housing split 425, plaque R | zz_hud55.js:12-33 | ui/bar.gd:7, 250-257 (h55_DP_panel, housA, plaqR) | EXACT | |
| Front layers L/R (serpent + bronze bezel) over the glass | :48-56 | bar.gd:271-279 | EXACT | |
| Plaque text: L [52,225,22,9], R [406,225,22,9], 7px book face, low = #f0a080 else #e2cfa8 | :12, 60-68 | bar.gd:282-291 (cx 63 / 417, same colours) | EXACT | |
| **The Empty Hand's housing**: housB (pointed niche) instead of the serpent roundel, frontH caps and pillars | :30, 49-53, 178 | art/ui/h55_DP_housB.png and h55_DP_frontH_png.png exist; **no reference in ui/** (grep housB/frontH: none); bar.gd:253 always draws housA | MISSING | The monk's HUD wears the serpent housing. |
| Hourglass glass painter: DP.hg geometry (cx 452, y 224.5-261.5, maxw 12.5, neck 0.75), bulb width sin^0.75, volume-true fill, streams in the neck, grains lifting when running back, glint | :99-178 | ui/hourglass.gdshader (NECK 0.06, V0/V1/MAXW sqrt profile, ring of stars) | DIFFERENT | Godot ported zz_monk_sand.js's **fallback** painter `hgOld` (:140-200 there), not the HUD55 niche hourglass that the browser actually shows. |
| Menu row: inv, char, skills, map, + class panels (blood V / army V / choir V + golem G), arcana (A), menu; stone tablets, 16 px pitch, stud when points wait, tooltips with "n points to spend" | :75-96 | ui/bar.gd:28 `MENU` = inv, char, skills, map, menu; :110 `_menu_items()` returns MENU; MENU_IDS :29 knows the other icons but never shows them | MISSING (arcana + class buttons) | The A/V/G panels exist in Godot (panel_board, panel_orders) but have no bar button; the Arcana stud (points waiting) is therefore not shown either. |
| Skill wells recoloured to dark stone | :41-50 | bar.gd | UNVERIFIED | |

## zz_landmarks55.js (94) — 21 one-of-a-kind landmarks

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| LM table (id, name, inscription, lands, footprint, lights) | zz_landmarks55.js:380 | art/landmarks/landmarks.json (21 entries, same keys incl. `lights`), art/landmarks/lm_*.webp | EXACT (asset) | |
| Placement: 3-4 outdoor / 2 indoor, ≥14 from start, ≥24 apart, ≥7 from lanterns, open footprint, reachability kept; monsters pushed off | :392-426 | zone export `landmarks` (moor: 4), `landmarkFootprintRocks` | EXACT (via export) | |
| Walking near surfaces name + inscription | :3, 421 | world/objects/manager_build.gd:4-5, manager_use.gd:3 ("landmarks' inscriptions") | EXACT (claimed in headers) | Trigger radius UNVERIFIED. |
| Candles are real lights (×0.9 radius, 0.55 flicker) + halos | :453-466 | world/zone.gd:371-387 `_lights()` reads the export's `lights` | UNVERIFIED | Whether the export's `lights` include the landmarks' candles was not checked. |
| Hero-shaped hole when the hero stands behind one | :434-445 | entities/sil_shadow.gd? | UNVERIFIED | |

## zz_mech_balance.js (468) — renames, Death March, Blessed Growth, scaling ladder, difficulty

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| RENAMES (Bone Lance, Bone Spurs, Charnel Cage, Prayer Banner, Bone Mastery; Penitent Womb…; Iron War-Fan, Sigil Mastery, Hanged Man's Heel; Needle and Thread, Binding Thread, Needle's Mark, Spool, Unravelling, Veil, Thread Mastery) | zz_mech_balance.js:28-57 | data/skills.json names (spear, lance, chain, ward, shuriken… verified) | EXACT (via export) | |
| CLASS_NAME animancer "Animancer", monk "The Monk" | :16-19 | data/classes.json display_name "Hollow Mystic", "The Empty Hand" | SUPERSEDED | by zz_rename_mystic.js / later; classes.json notes the runtime bug ("The Monk"). Godot uses the correct final names. |
| Tabs: animancer Mirror/Soul/Thread; ossumancer[1] Bone; miasmancer Trap/Sigil | :20-23 | classes.json tabs | EXACT for animancer; DIFFERENT for the Ossuarch (Godot-only trees Ossuary/Carapace/Count, by design: HANDOFF §5.4) | |
| Halo-That-Turns / Gate-Without-A-Gate names | :63-71 | skills.json kdawn/keclipse | EXACT | Their "(shares its cooldown…)" desc is overwritten by zz_monk_sand :skyText, which Godot follows (skills/monk/base.gd:239). |
| Omen → Sigil in every Shrine Keeper text | :77-90 | skills.json names say Sigil; **Godot runtime strings still say Omen** (skills/miasmancer/base.gd:155 "Omens", :173 "+1 Omen", :177 "per Omen"; hud.gd mentions OMENS) | DIFFERENT | Text only, but it is the word the user asked to change. |
| **Death March (horn) FINAL mechanic**: point at a spot; every standing skeleton rushes there at ~2× for 3 s (+2 with Long March); first blow on arrival stuns 1 s (non-boss) and shoves 0.6 yd; Rally March mends 25% at the start; cast 0.5 s | :95-103, 127-149, 205-239 | skills/ossumancer/tree_ossuary.gd:23-32, 197-199: a 6 s (+4) buff: skeletons speed ×1.25, haste ×1.4, damage ×1.2, "the living near him falter" | DIFFERENT | Godot implemented zz_mech_names's flavour text (:42), not the browser's rush-to-a-point behaviour. (Godot's Ossuary tree is a declared Godot-only rework; still a divergence from the reference.) |
| Blessed Growth (eggsac) curse: r 3, 6 s (+3), 2·(1+0.5(L-1)) dps, growths from cursed on death and every 2 s | :105-116, 150-190, 241-296 | — | LATER | Hemomancer not ported. |
| Difficulty profiles normal/nightmare/hell (hp 1/1.5/2.5, dmg 1/1.5/2, res 0/-40/-100) | :326-339, 405-437 | data/world.json `difficulty` (data only); no code | LATER | Browser live = normal only (`window.__setDifficulty`). |
| ZONE_MLVL_BUMP crypt +3, barrow +3, fen +4, cata1 +8, cata2 +11 | :346-353 | zone exports carry final mlvl | EXACT (via export) | |
| Ease curve 0.5 at ≤5 → 1.0 at 10 → 1.2 at 25, hp/dmg rescaled | :370-401 | data/monsters.json `scaling.ease_measured_husk` (0.5, 1.002 @10, 1.2 @25), `kinds.*.scaled` per level; entities/monster.gd:94 | EXACT (via export) | |
| Test character 120 → 30 skill points | :442-466 | Trial of Thirty (`--trial --new`) | LATER | Different test harness. |

## zz_mech_heavy.js (185) — the held heavy swing

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Hold > 0.18 s = wind-up; full at 0.75 s | zz_mech_heavy.js:12-13 | entities/hero.gd:577-581 (`0.18`, `/0.57` ⇒ full at 0.75) | EXACT | Godot also scales the 0.18 threshold by the low-poise 1.35 (browser scales only the charge rate, :137): trivial. |
| Low poise (<10%): wind-up ×1.35, recovery ×1.3; never locked out | :14-16 | hero.gd:568, 599 | EXACT | |
| Walk at 35% while winding up | :17, 161 | hero.gd:239-245, 304 | EXACT | |
| Damage ×1.25 at wind-up start → ×1.75 just short of full → ×2.0 at full | :18, 88 | hero.gd:602 `lerpf(1.25, 2.0, k)` | DIFFERENT | Browser rewards a FULL charge with a jump 1.75→2.0; Godot is linear. |
| Poise damage ×2.0 → ×3.0 → ×3.5 | :19, 89 | hero.gd:603 `lerpf(2.0, 3.5, k)` | DIFFERENT | Same linearisation. |
| Poise cost 12 → 24 on release | :20, 77 | hero.gd:598 | EXACT | |
| Recovery ×1.25 of a normal blow's cast | :21, 92 | hero.gd:599 act length `0.55·lerp(1.1,1.5,k)/attack_speed` | UNVERIFIED | Different formulation; not equal in general. |
| Lunge: toward the target's centre, length = dist − (hero r + target r + 0.25), max 0.9 yd, animated over 0.12 s; 0.5 yd into the air with no target | :22, 72-80, 119-125 | hero.gd:592-596: `min(0.9, len − target.r − 0.9)`, applied instantly; no air lunge | DIFFERENT | Godot's lunge is shorter (subtracts 0.9 instead of ≈0.6) and teleports. |
| Impact: hit-stop 0.06 → 0.11, shake 1.5+2c, dark-red burst (6+6c) and a ring at the target, sfx 95 Hz | :23, 93-98 | hero.gd:_land_blow: hit-stop only for the overhead (:441-443) and the reel finisher (:432) | MISSING | A landed heavy has no hit-stop, shake or impact burst in Godot. |
| Full-charge cue: ring + burst + two sfx | :138-143 | — | MISSING | |
| Embers drifting off the weapon while charging (every 0.12-0.05 s) | :146-148 | — | MISSING | (The v0.59 note removed the glow, not these particles.) |
| Attack buttons: left (attack), right (attack) and pad A | :32-35 | hero.gd:565-566 LMB only, `skills.left == "attack"` | DIFFERENT | |
| Cancel on roll (with a small burst) or stagger | :57-61, 128-129 | hero.gd:569-574 (roll/stun) | EXACT (burst MISSING) | |
| Option "Hold to charge heavy attacks", default on | :26, 173-182 | core/settings.gd:7 `hold_heavy := true` | EXACT | |
| Pose: hold the attack's wind-up frame | :165 | hero.gd:249 plays `heavy` if the set has it | DIFFERENT (richer) | Godot uses a dedicated heavy anim where the atlas has one (monk). |

## zz_melee_chain.js (123) — every order's three-blow string; Ossuarch bone strings

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| STEP: ×1.00/0.85/0.12 yd, ×1.10/0.95/0.20, ×1.60/1.35/0.42 (+0.35 reach, 4 poise, stop 0.07, stagger 0.35) | zz_melee_chain.js:15-19 | hero.gd:53 STRING, :340 reach, :360 poise, :435 stagger, :442 hit-stop | EXACT | |
| String resets after 0.8 s idle, on roll, on heavy | :31, 65, 30 | hero.gd:227-228, 489, 580 | EXACT | |
| Finisher staggers non-boss only | :56 | hero.gd:434-435 (no boss test) | DIFFERENT | Godot's overhead stuns bosses 0.35 s. |
| Finisher shake 2.2 | :55 | hero.gd:443 `Game.shake(4.0)` | DIFFERENT | |
| Overhead leaves dark grit flecks at the landing point (no light, no arcs) | :67-90 | — | MISSING | Minor. |
| Step-in toward the struck creature, never into it | :44-48 | hero.gd:362 `zone.move(tp, dir·step)` | DIFFERENT (minor) | Godot steps the full STEP distance regardless of the gap; browser clamps to `gap−0.15`. |
| Ossuarch bone strikes (Scythe Sweep, Marrow Crush, Spine Lash, Grave Leap, Grinding Charge) each keep a 3-blow string: ×1.0/1.1/1.5, time ×0.9/1.0/1.3, 0.9 s window, finisher staggers 0.35 (non-boss), shake 2, hit-stop 0.06 | :97-123 | grep string/chain/MULT in skills/ossumancer/*.gd: none | MISSING | |
| Painted chain count for the Empty Hand (`P._mkChain`) | :49 | hero.gd:355 light1/2/3 by string index | EXACT (equivalent) | |

## zz_mech_loot.js (103) — D2-style drops

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Per-rank CFG (normal 1 roll 0.32, minion 0.28, champion 3/0.85/1 magic/+40 mf, unique 5/1.0/1 rare/+90, boss 8/1.0/2 rare/+200, chest 2/0.6; gold chance/[min,max]/mult; potion chance) | zz_mech_loot.js:44-51 | data/items.json `drops.per_rank_cfg` (identical), items/loot.gd:roll_drops | EXACT (via export) | |
| rollItemMin: up to 40 tries to meet the floor, else best seen | :22-33 | loot.gd `roll_min` | EXACT | |
| Gold = rand(min,max)·ilvl·mult; potion 55% life | :77-86 | loot.gd:roll_drops | EXACT | |
| Scatter 0.3 + rand·(1.3 if >3 drops else 0.7), fall back to the corpse if solid | :89-96 | loot.gd:on_kill | EXACT | |
| Unique chime 880 Hz | :97 | GROUND.drop_sound (zz_zz_study82 rule) | SUPERSEDED | |

## zz_mech_names.js (77) — approved renames and flavour

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| OSS_NAMES + REWRITE descs (ward, restless, storm, mark, wraith, choir, animam, nmastery, forge; spear, spikes, ribcage, horn, banner, tithe, barmor, gcharge, bscythe, leap, legion, marrowm, carapm; hemom, broodm, fmastery, chitin; vblade, bmine, lure, dhead, toxic, deathm) | zz_mech_names.js:10-67 | data/skills.json `description` (spear verified verbatim, :39) | EXACT (via export, sampled) | bmine's desc is later replaced by zz_miasma_flavor (Sighing Bladder), which skills.json carries. |
| `horn` desc "Sound the march… step in time and strike faster; the living near you falter" | :42 | skills/ossumancer/tree_ossuary.gd:12 | EXACT (text) | See zz_mech_balance: the text matches but the browser's mechanic is the rush. |

## zz_mech_resists.js (253) — nine elements

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| ELEMENTS phys/magic/miasma/blood/void/radiance/fire/cold/poison; cap 75, floor −100, taken damage ≤ 2× | zz_mech_resists.js:24-27, 157-162 | core/combat.gd:4, 22 `clampf(res, -100, 75)` | EXACT | |
| Hero resists: legacy `res` gives half to every non-phys element (magic keeps the full `res` through the base branch), per-element keys magRes… | :98-119, 200-221 | core/hero_stats.gd:58-64 (`res` full for magic, ×0.5 others, + `res_<elem>`) | EXACT | |
| Lightning removed: "of Sparks"→"of Wisps", "of the Storm"→"of the Aether", stat magic | :84-90 | data/items.json affixes (no `ltng`; both names present) | EXACT (via export) | |
| Monster natural resists default 0 | :143-154 | monsters.json `resists_at_spawn` | EXACT (via export) | |
| SKILL_ELEMENT map | :44-68 | per-skill `elem` in skills/*/ | UNVERIFIED | Reference data in the browser; later files wire it. |
| Debug key 0 resist dummy | :227-251 | — | LATER | |

## zz_mech_trees.js (95) — tree layout moves and cross-page marks

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| LAYOUT moves (animancer: challenge←golem, leash c1←condense, choir←cull, wraith←ward, mark←swarm, orb←lance, chain c2←word; miasmancer mstorm c1←exhale; monk kmirror c0←kbowl, kwalk c2←kspit, kgrip c2, kfinger c1, kpagoda←kgrip, kmount←kbar) | zz_mech_trees.js:9-54 | data/skills.json row/col/prerequisites (leash row 4 col 2, chain row 5 col 3, kmirror row 4 col 1: consistent with c+1) | EXACT (via export) | |
| Ossuarch moves (offering, tithe, unearth, horn, bward, legion, ribcage, ossify, wall, spikes, sstorm, host) | :19-30 | skills.json: `wall` ABSENT; offering row 2 col 1; Godot trees Ossuary/Carapace/Count | DIFFERENT (by design) | HANDOFF §5.4: the Ossuarch's three trees are a Godot-only rework to be re-applied after parity. |
| Cross-page prerequisite stub in the other page's colour; tooltip "Requires X (Y page)" | :70-94 | ui/panel_skills.gd | UNVERIFIED | |

## zz_miasma_breath.js (212) — aura grows with rank, passive Inhale, Miasmic Exhalation, the Sister lives

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| auraR = (0.35 + 0.15·max(0,L−1) + 0.9·frac·(0.4+0.05L)) × 1.2 with zm_thick | zz_miasma_breath.js:19-26 | skills/miasmancer/base.gd:98-100 | EXACT | |
| Extra violet puffs with rank (+1 per 2 levels, cap 6, 45% each frame) | :30-48 | skills/miasmancer/fx.gd:50 | UNVERIFIED | |
| Inhale passive: every max(0.9, 2.4−0.08L) s, radius 5+0.1L; gain from clouds (0.5+0.15t), sickened (min 1.5, dps·0.05), ×1.5 Sick Breath, +0.6+0.08L baseline; Deep Draw pulls 0.08 | :54-130 | base.gd:155 (interval and radius identical; gain formula) | EXACT (interval/radius); gains UNVERIFIED | |
| Miasma Nova → "Miasmic Exhalation" | :133-141 | skills.json pnova "Miasmic Exhalation" | EXACT | |
| Sister: life maxHp·(0.35+0.02(L−1)), mana 0.4+…, 2%/s regen out of combat, disperses at 0, reforms after 6 s at 60% life | :146-176 | skills/miasmancer/ally.gd:84, 87, 45, 77 | EXACT | |
| Blows nearer the sister than you (within 1.4) give her 60% of the damage | :180-195 | ally.gd | UNVERIFIED | |

## zz_miasma_flavor.js (69) — Sighing Bladder, Miasma Vortex breathes

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| bmine → "Sighing Bladder" + perks Wider Sigh / Wailing Rot | zz_miasma_flavor.js:37-47 | skills.json bmine "Sighing Bladder" | EXACT | |
| mstorm → "Miasma Vortex", desc | :49-53 | skills.json mstorm | EXACT | |
| Vortex tick 0.35 s: dmg ×0.35, poison ×0.25 for 2 s, slow 0.35, tangential 0.22 | :280-289 | skills/miasmancer.gd:532-536 | EXACT | |
| **Breath cycle**: radial force sin((life−t)·2.6)·0.55 (pull then push, ~2.4 s), Storm Pull perk +0.12 inward; purple drift particles with sway | :263-279, 290-293 | skills/miasmancer.gd:537-545: only `if K("stormpull") > 0 and d > 1.0` pull; no sin/2.6/0.22 found | DIFFERENT | The inhale/exhale shove the user asked for ("vortex in and out like a breathing cycle") is not there. |

## zz_miasma_gas.js (57) — miasma is purple gas

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Greenish miasma particles recoloured to #8a4ab8/#b070e0; gas drift (life +0.35 up to 1.6, rise ×0.7, lateral sway) | zz_miasma_gas.js:179-227 | skills/miasmancer/fx.gd:3 ("violet, as gas: puffs that drift and breathe, never green") | EXACT (intent) | Exact hexes/sway UNVERIFIED. |

## zz_mobai63.js (93) — loitering, waking, attack tokens

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Wake range × 0.7 at hero level ≤3, × 0.85 at ≤8 (on k_arcana's 7.5 base; study82 adds ×0.7 dim wick) | zz_mobai63.js:15-18 (k_arcana.js:712) | entities/ai/brain.gd:87-99 (7.5; 0.7/0.85; dim 0.7; Unheard 0.7; Last Silence 0.5) | EXACT | |
| Pack wakes one by one: packmates within 10 yd wake after 0.35-1.6 s + 0.08·d | :19-29 | brain.gd:130-135 | EXACT | |
| **Tokens** = min(7, round((3 + floor(**hero level**/5))·1.2)) | :12 | brain.gd:139 `floori(m.level / 5.0)` (the **creature's** level) | DIFFERENT | In a mlvl 15 zone Godot hands 7 tokens at hero level 1; the browser hands 4 (3·1.2). This is the "zerged at level 1" complaint the file exists to fix. |
| Big pack presses: tokens = max(tokens, ceil(close<5yd · 0.5)) | :41 | — | MISSING | |
| Token lost when > 5 yd, fleeing, idle | :39 | brain.gd (release on home/sleep) | UNVERIFIED | |
| After a strike, 50% give the turn away for 0.8-1.8 s | :44 | brain.gd:226-230 | EXACT | |
| Loiter: wander 0.5-2.6 yd about home at 28% speed for 1.2-3 s, then STOP 1.5-4.5 s, turn | :55-67 | brain.gd:113-120: 35% speed, new target every 1.2-3 s, no stop phase | DIFFERENT | Godot sleepers pace without pausing. |
| Ring without a token (d < 4.2): radius 2.4-3.4, direction flips 35% every 0.8-2.2 s, 25% feint in to r−1.1, 60% speed, face the hero | :72-85 | brain.gd:203, 268-273: ring clamped 1.8-2.6, constant 0.6 rad/s alternating by instance id, no feints, 60% speed; only when d < 3 | DIFFERENT | Godot's ring is a tight orbit at touching distance; the browser's hangs back a yard and feints. |

## zz_mon_kneeler.js (43) — the Kneeler, redrawn

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Sheet 100×88 at 1.5×, anims idle 4 / walk 8 / wind 3 / atk 3 / hit 2 / die 1 | zz_mon_kneeler.js:9-10 | art/sprites/kneeler.json: idle 4, walk 8, wind 3, atk, hit, death, death_back | EXACT (asset) | |
| MON.kneeler hp 30, dmg 5-10, spd 1.05, r .34, xp 19, husk, range 1.0, wind .75, rec 1.2, poiseK 1.0 | :23 | data/monsters.json kneeler (base_life 30, speed 1.05, radius .34, ai husk) | EXACT (via export) | |
| PACKS_LOW / PACKS_CRYPT additions | :24-25 | zone exports (moor has 3 kneelers at seed 12345) | EXACT (via export) | |
| Hit pose while hurt/dazed, die frame for corpses | :31-41 | entities/monster.gd + brain `_anim` (hurt recoil pose, corpses group) | EXACT (behaviour) | |

## zz_monk_sand.js (235) — the hourglass resource

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Two sands, one glass; strength = 1 − 0.9·f^2.5; never locked out | zz_monk_sand.js:16-20 | skills/monk/base.gd:10-12, 168 | EXACT | |
| A cast pours POUR 5% of the bulb per 12.8 of cost, cap 25%; the sky skills pour ×3 | :60-72 | base.gd:29-31 `POUR := 0.12`, CAP 0.25, NORM 12.8; :231 ×3 | DIFFERENT | Godot pours 2.4× more per cast (deliberate "G1 balance 2026-09-30", base.gd:15-17). |
| Destroyer costs poise round(cost·0.6), Thousand Arms ·1.2 | :66 | skills.json rules.monk_cost_expr; base.gd:224-231 | EXACT | |
| Sand runs back 10%/s while fighting, 35%/s after 0.4 s without a cast | :13-14, 155-160 | base.gd:13-14: 2%/s casting, 25%/s after 0.9 s | DIFFERENT | Godot empties roughly 3× slower in combat. |
| Every hit runs both bulbs back 1.5% (throttled 0.08 s), every kill 12% | :15, 90-100 | base.gd:14-15: 0.3% (≤4/s), 7% | DIFFERENT | |
| Weight removed, no cooldowns (MONK_CD cleared), manaRegen 0 | :28-33, 57-58 | base.gd:18 | EXACT | |
| Whiffed casts pour nothing | :218-228 | base.gd | UNVERIFIED | |
| DESC rewrites (kamber, khands, kbell, kbowl, kbar, kobsid, kmount) and "turning the sky is dear" | :35-45 | skills.json; base.gd:239 | EXACT | |
| ka_bowl / ka_pitch text re-aimed at the glass | :104-107 | board.json | EXACT (text) | |
| Fallback hourglass painter hgOld (bone frame, stars) | :118-205 | ui/hourglass.gdshader | see zz_hud55 | Godot ported this fallback instead of the HUD55 niche. |

## zz_monsters_new.js (123) — six creatures and the stalker AI

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| moth_saint 20 hp/2.8/.32 flyer; veinworm_elder 44/3.2/.42 burrow; stalker_crone 22/2.6/.3; trunk_thing 180/0.35/.55 armor 60 shield; chorister 26/1.4/.28 ghost; bloatling 14/2.2/.28 bomber | zz_monsters_new.js:15-22 | data/monsters.json kinds (all six; life/speed/radius/armor identical) | EXACT (via export) | Sprites exported (art/sprites, incl. @champion/@unique). |
| PACKS_* extensions | :30-34 | zone exports | EXACT (via export) | |
| Stalker AI: skulk 2.6 yd behind a hip (3.2 when far) at 55/85% speed; spring when behind you (rel < −0.15) within 4 yd with a clear line; crouch `wind`, dash 7 yd/s for 0.35 s, one blow ×1.4, cd 2.4, walls end it | :39-84 | entities/ai/ai_stalker.gd:1-40 (same numbers) | EXACT | |
| Chorister's dirge: hero walks at 55% within 5.5 yd | :88-107 | entities/ai/ai_world.gd:10, 225-234 | EXACT | |

## zz_movespd_curve.js (23) — walk speed growth reined in

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| moveSpd = 4.15 × (1 + frwEff/100), frw taper above 25 (×0.6 to 80), hard cap 40 | zz_movespd_curve.js:12-15 | core/hero_stats.gd:150-155 (… × 0.75) | EXACT | The extra ×0.75 is zz_tune_batch_d.js:64 (later browser file), so the final chain matches. |
| Wraith Form speed = min(1.35, 1.2 + 0.008·wraith + 0.1 wraithhaste) | :19-20 | skills/animancer/* | UNVERIFIED | |

## zz_openness.js (447) — the Openness Warden

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| buildOpen toolkit (noise groves, curving roads with verges, irregular rims, pocket stitching, spaced packs ×1.3 at 12-14 spacing, chests/shrines) | zz_openness.js:25-202 | baked into data/zones/*.json | EXACT (via export) | Moor export: 164×164, 29 objects, 97 packs, 561 monsters at seed 777. |
| wideDungeon (grid ×1.3-1.45, rooms 13-21, great hall 22-28×18-24, corridors 5-7, loops, pillars, boss arena ≥16×16, ~75% of the old pack count ×1.2 size) for crypt/barrow/cata1/cata2 + the Act I expansion dungeons | :204-313 | baked (crypt 109², barrow 87², cata1 117², cata2 113²) | EXACT (via export) | |
| Moor as a radial crossroads plain (camp 5..25, mid, cave/east/south/ridge/wood nodes, mere), 60 packs @12, 24 chests, 9 shrines; Fen as a braided delta (3 channels), 54 packs, 16 chests, 7 shrines, a way back up the Pilgrim Road | :328-438 | moor/fen exports (links: crypt, fen, barrow, sighing_ridge, hollow_wood; fen links incl. pilgrim_road) | EXACT (via export) | |
| dressZone wrapper protects designed groves; tree halving skipped | :314-323 | — | LATER | Generation-time. |
| Seeds: `seed*3+101` (moor), `seed*5+211` (fen), fresh each run | :330, 393 | 3 fixed seeds per zone | DIFFERENT | As for zz_act1_expand. |

## zz_ossu_active_melee.js (86) — Bone Blade is a strike

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Bone Blade: cast on either mouse button, poise 5, ×(1.3 + 0.1·L) weapon damage, +0.45 yd reach, cleaves; the passive bonus and ordinary-swing cleave are gone | zz_ossu_active_melee.js:15-45 | skills/ossumancer/base.gd:28-30 (POSE blade→atk, MELEE blade 0.45), :114 `blade_k = 1.3 + 0.1·max(1,K)`, :115 cleave_k; skills.json blade poise 5 | EXACT | cleave share vs `BS.cleave()` UNVERIFIED. |
| Hold to keep striking (blade, lash) | :73-80 | hero.gd:230-233 (hold right repeats a skill after 0.25 s) | EXACT (equivalent) | |
| Every Carapace strike shows its own bone weapon (O6_WPN) and pose | :7-10, 62-69 | — | SUPERSEDED | zz_hero_ossumancer_r7.js maps all strikes to `atk` (final browser). |

---

## Top 15 gaps by player-visible impact

1. **Acts II–V are absent** (48 zones, four towns, four act bosses, the Scar): zz_act2-5.js vs `data/zones` (Act I only). Known scope limit (HANDOFF §1), but it is the largest gap in this set.
2. **The HUD menu row lacks the Arcana (A) button and the class-panel buttons (V/G)**, so the "points waiting" stud never shows for Arcana (zz_hud55.js:75-96 vs ui/bar.gd:28, 110). The Empty Hand's HUD housing (pointed niche, hourglass caps/pillars: housB/frontH) is never drawn, and the hourglass glass is the fallback painter's geometry, not HUD55's.
3. **Monster AI pressure**: attack tokens scale with the creature's level instead of the hero's (brain.gd:139 vs zz_mobai63.js:12), the "half of those close" rule is missing, the no-token ring orbits at 1.8-2.6 yd without feints instead of 2.4-3.4 with feints, and sleepers never pause while loitering. This is exactly the "zerged at level 1 / heat-seeking missiles" complaint.
4. **The heavy swing has no impact**: no hit-stop (0.06→0.11), shake, burst or ring on a landed heavy, no full-charge cue, no embers while charging; the damage/poise curves are linear (no 1.75→2.0 jump), the lunge is shorter and instant, and only the left button charges (zz_mech_heavy.js:18-23, 93-98, 138-148 vs hero.gd:587-605).
5. **The Reading's fates are 5-30× the browser's**: single choices give +7% walk speed, +6% xp, +17% magic find where the browser caps every percent at ±1 (zz_fate_zcap.js vs data/reading.json, ui/reading.gd:206-210).
6. **Bone melee strikes are refused under half their poise cost** (skill_book.gd:250), against the "poise is stamina, never a lockout" rule the browser enforces (zz_bone_melee_shard_costs.js:63-74).
7. **Death March is a different skill**: the browser sends every skeleton rushing to a point at 2× for 3 s with a stunning, shoving first blow (zz_mech_balance.js:127-149, 205-239); Godot applies a 6 s speed/haste/damage buff (tree_ossuary.gd:29-32, 197-199).
8. **The Empty Hand's hourglass economy differs**: pour 12% vs 5% per cast, run-back 2%/25% vs 10%/35%, hits 0.3% vs 1.5%, kills 7% vs 12% (skills/monk/base.gd:12-15 vs zz_monk_sand.js:12-15). Deliberate rebalance, but not the reference.
9. **The Ossuarch's bone-strike strings are missing** (×1.0/1.1/1.5, 0.9 s window, finisher stagger: zz_melee_chain.js:97-123; nothing in skills/ossumancer).
10. **Flames do not gutter or flare**: fx/flicker.gd is three sines; the browser's flame55 has per-flame random gutters and flares every few seconds (zz_grade55.js:321-337). The hero lantern's alpha curve also differs (dark_layer.gd:118 vs zz_grade55.js:352).
11. **Blood pools are missing** (growing, merging puddles capped at 0.8/1.4 yd: zz_blood_pool_tone.js).
12. **The overhead finisher staggers bosses and shakes harder** (hero.gd:435, 443 vs zz_melee_chain.js:55-56); its grit flecks are missing.
13. **Miasma Vortex does not breathe** (no pull/push cycle: zz_miasma_flavor.js:263-293 vs miasmancer.gd:532-545), and the Shrine Keeper's runtime text still says "Omen" where the browser says "Sigil" (base.gd:155, 173, 177).
14. **The Stranger never rests**: Godot loops all 121 frames at 10 fps (reading.gd:19, 348); the browser holds the rest pose and gestures rarely (zz_art_reading.js:37-70). The Shrine Keeper has no hit/death frames (miasmancer.json), and the board's ink/paper palette is lighter than the browser's plate (panel_board.gd:17-21).
15. **Fixed seeds**: every zone exists in three layouts (12345, 777, 4242) instead of a fresh generation per run (zz_openness.js, zz_act1_expand.js); the env.js mist/ember/ray layers run at different hours or not at all in Godot.

Smaller or unverified items worth a follow-up: five Empty Hand cards without effects (kr_brush, kr_wax, ka_pitch, kd_door, kh_lantern) and kr_sutra reversed; the per-class crown mechanics (zz_arcana_percls) not found in core/arcana.gd; the engraved anatomical plate drawing; the land ambient day/night colours of zz_grade55; the `resonance` skill absent from skills.json.
