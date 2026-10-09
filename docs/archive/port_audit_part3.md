# Port audit, part 3 of 3: browser `zz_pace_and_density.js` … `zz_zz_world89.js` vs the Godot build

Audited 2026-10-01 against the repository at HEAD (browser source `web/triune_desktop/src/*.js`, Godot code `core/ entities/ skills/ items/ world/ ui/ fx/ data/`). Method: every browser file was read in full (art-data files skimmed), its features listed with their numbers, then the Godot counterpart was found by grep and read. Nothing was run; "EXACT" means the code and numbers match on reading, not that frames were compared.

Statuses: **EXACT** ported faithfully · **DIFFERENT** ported but numbers/behaviour/look differ (how is stated) · **MISSING** not in Godot · **LATER** art-data / platform-only / retired, or belongs to content not yet built (Acts II–V) · **SUPERSEDED** a later browser file replaces it (named). **UNVERIFIED** is used where the port could not be confirmed from the code alone.

Two Godot-only deliberate deviations recur and are flagged where they bite: `skills/animancer/base.gd:293-301` `BAL_COST`/`BAL_DMG` and `WISP_NERF` (0.65×0.65, line 42), and `core/hero_stats.gd:97` (Mystic Essence regen ×2). Both are switched off with `--nobal`; neither exists in the browser.

---

## zz_pace_and_density.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Cast speed baseline 0.72 × (1 + fcr/100) | zz_pace_and_density.js:12-19 | core/hero_stats.gd:147-148 | EXACT | |
| Halve TREE tiles per zone (deterministic on seed) | :24-46 | data/zones/*.json `trees` (export) | EXACT (via export) | The zone export was taken from the final browser build, so the halving is baked in. |
| Drop gate by rank (normal 0.22, minion 0.18, champion 0.7, unique 0.9, boss/chest 1.0) | :60-74 | items/loot.gd:29, data/items.json `drops.rank_gate` | EXACT | |
| Affix density: magic filled to 2, rare to 6, no stat twice | :78-108 | items/loot.gd:180-205 | EXACT | |

## zz_passive_tag.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| "[Passive] " prefix on every passive skill's and perk's desc | zz_passive_tag.js:5-17 | ui/hud.gd:462-464 (a separate "[Passive]" line); data/skills.json `description` (0 of 40 passives carry the prefix) | DIFFERENT | Browser puts the tag inside the text wherever it shows (tree, hotbar pick, Flesh panel). Godot adds a dim line only in `skill_tip`. Perk texts never say Passive. |

## zz_polish.js (v0.34)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Banner filter: keep LEVEL/FELLED/ARCANA/SEVERED/SILENCE/MAJOR, drop hour and skill banners | zz_polish.js:6-15 | ui/hud.gd:134 (zone banner), world/objects/world_ui.gd:144 (quest/boss banners) | DIFFERENT | Godot never banners "LEVEL N": level-up is a `Bus.say` line (core/main.gd:361). Herald "SEVERED"/Arcana "MAJOR" banners: UNVERIFIED (other parts). |
| Quiet hour "say" lines | :17-20 | — | EXACT | Godot emits no hour lines at all. |
| Monk floating skill-name callout off | :22 | — | EXACT (absent) | |
| Sky dial: sun/moon crossing a 10 px dial top-right, red rim at dusk, gold at dawn, tooltip with the day's name and hour text | :25-45 | none (grep "dial", "moon", "sun" in ui/: nothing) | MISSING | The only clock the browser shows. |
| Orb pulse under 25% (ring + fill flash at 7 Hz) | :48-55 | ui/bar.gd:282-291 | DIFFERENT | Godot only recolours the numeral plaque (`low` → `#f0a080`); no pulse, no ring. |
| Critical gauge bars pulse (poise <25%, Ossuarch shards <20%, Mystic wisps ≤20%) | :56-68 | ui/bar.gd:338-363 | MISSING | Godot poise bar changes colour under 10% only (`#b0a040`), no pulse; no shard/wisp alarm. |
| Spirit: cast speed × (1 + spi·0.0015) | :71-74 | core/hero_stats.gd:147 | MISSING | Godot `cast_speed()` has no Essence term. |
| Constitution: swing speed × (1 + con·0.0015) | :72,76 | core/hero_stats.gd:182-183 | EXACT | `1 + (con-15)·0.0015 + 0.0225` ≡ `1 + con·0.0015`. |
| Vitality: life regen vit·0.01 /s | :73,78 | core/hero_stats.gd:185-201 | MISSING | tick() has heal pools, the Hearth wick and poise only; no Vitality regen. |

## zz_progression.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| XP_KNOTS by creature level (1:.72, 24:.74, 30:.78, 34:.6, 40:.72) applied to m.xp | zz_progression.js:22,47-55 | core/main.gd:341 (constant kept), 356 (comment: the export's m.xp already carries it) | EXACT (via export) | data/zones monsters carry pre-scaled xp. UNVERIFIED for creatures spawned at runtime (quest waves, boss adds) in manager_use.gd:210 `_spawn`. |
| LVL_KNOTS by hero level (1:1, 16:1, 21:.92, 27:.9, 32:.6, 36:.58, 40:.53) on XP gained | :23,57-62 | core/main.gd:342,356 | EXACT | Godot adds a Godot-only over-level penalty (main.gd:358-359: −15%/level past +5) and `xpK` items. |
| Act I catacomb level bumps (cata1 13-16, cata2 15-17, Matron 18) | :32-55 | data/zones/cata*.json `mlvl` | EXACT (via export) | Matron level in export: UNVERIFIED. |
| QA hooks (`__qa`, `__qaHurt`) | :65-95 | core/test_hooks.gd | LATER | Test plumbing. |

## zz_quests.js (Act I–V quest frame)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Act names, ACT_MLVL, kinds (zoneboss/kill/relic/shrine/captive/seal/actboss) | zz_quests.js:16-18,162-164 | world/quests.gd:10-18 | EXACT | |
| Act I quests (6) with desc/done/rewards | :167-184 | world/quests.gd:19-38 | EXACT | Text identical. |
| Acts II–V quests (20), towns, lairs, vaults, fallback town/lair/vault generators | :55-105,186-250 | world/quests.gd (Act I only); data/monsters.json has `qa_*`/`qb_*` kinds | LATER | Acts II–V are not built in Godot (quests.gd:444 "Act II is not built yet"). |
| Act bosses II–V (Calcifer, Brood-Mother, Chime-Abbot, Slayer): HP-stage scripts, hazards (telegraphed circles, rings, beams, pools), blink, chassis | :338-550 | none (entities/ai/ai_boss.gd is the Act I Warden/Matron chassis) | LATER | Hazard system `qHaz*` has no Godot counterpart. |
| TOWN roles Act I (Esk, Ysolde, Brannoc, vendor Maren) + greet | :253-255 | world/quests.gd:40-42, data/zones/moor_*.json objects | EXACT | Godot greet text differs slightly ("The dead swore what they could not finish…" vs "The dead have errands and no legs…"): DIFFERENT wording, quests.gd:42. |
| HEAL_LINES, STRANGER_LINES Act I | :265-267 | world/quests.gd:44-47; healer lines UNVERIFIED | EXACT (Stranger) | |
| Quest placement (far spot fractions .82/.85/.6/.78; seals .35/.6/.88; guards) | :604-629 | data/zones `quests`/`objects` (export) + manager_build.gd:111 | EXACT (via export) | |
| Complete: rewards, "ERRAND FULFILLED" banner, say done + reward text, two sine notes, gold burst, save | :315-334 | world/quests.gd:344 `complete`, world_ui.banner | DIFFERENT | "ERRAND FULFILLED" string is absent from Godot (grep). Banner text UNVERIFIED (quests.gd:344-400 not read line by line). |
| Shrine quest: two waves (5, then 6 with an Extra Fast champion) | :739-758 | world/objects/manager_use.gd:251-312 | EXACT | |
| Captive: keepers within 12 yd must fall | :725-729 | manager_use.gd:227 | EXACT (per header) | |
| Waystones: A1_WP list, discover at 3.2 yd, panel opens at 1.1 yd, "knows your step" | :572-590,673-678,1077-1081 | world/quests.gd:14,474-482; manager.gd:54 `_proximity` | EXACT (list/text) | Radii UNVERIFIED. |
| Trial of Thirty kindles every waystone | :680-688 | core/game.gd / main.gd `--trial` | UNVERIFIED | |
| Town safe circle r 9, monsters swept | :642-645,759-763 | data/zones markers.safeCircle; manager.gd:41 `_sweep` | EXACT | |
| Shared stash 48, right-click to store | :826-839,902-918 | items/shop.gd:13, ui/panel_town.gd:5 | EXACT | localStorage → user://stash.json. |
| Smith: 7 wares, ilvl max(level, act min+2), mf 60, no uniques, price value×5 + lvl×6, restock on level | :842-849,919-936 | items/shop.gd:61-83 | EXACT | |
| Journal (J) panel, act tabs, state words (unheard/open/opened/fulfilled) | :863-890 | ui/panel_town.gd (journal mode), world/quests.gd:314 | EXACT | Row look UNVERIFIED. |
| Credits roll after Act V ("THE THOUGHT IS UNTHOUGHT") | :794-823 | none | LATER | Act V not built. |
| Quest objects' light holes (50 px) and gold ground glow 14 px | :1062-1071,1085-1093 | manager_build.gd:279 `_quiet_light`, :290 `_quest_glow` | EXACT | |
| Boss qScale drawing (uniques ×1.3, act bosses 2.1-2.6) | :1033-1038 | — | UNVERIFIED | Quest uniques in Godot use the kind's sprite at scale 1? Not found. |
| Painted placeholder sprites for qobj (qwp, npcs, relic, captive, sigil) | :938-1005 | manager_build.gd:237 `_art_node` (art/objects) | LATER | Browser's own were placeholders; Godot has its own painted ones. |
| Save/load of `qst` | :1009-1013 | world/quests.gd to_dict/from_dict, core/save.gd | EXACT | |

## zz_rename_mystic.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| CLASS_NAME.animancer = "Hollow Mystic"; "Weeping Maiden" → "Bleeding Maiden"; "Hollow Seer" → "Mysterious Stranger" everywhere | zz_rename_mystic.js:4-10 | data/classes.json, ui/title.gd:23, data/codex.json; grep "Weeping Maiden" → none | EXACT | |

## zz_stagger_deep.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| staggerT 0.8 s after the reel (walk-slow window) | zz_stagger_deep.js:20-23 | entities/monster.gd:308 `after_reel = 0.8` | EXACT | |
| Walk speed ×0.55 while staggered | :38-44 | monster.gd:173-174 | EXACT | |
| Damage taken ×1.12 after the reel (×1.25 during) | :29-34 | core/combat.gd:21-24 | EXACT | |
| Amber wisp particles above staggered monsters every 0.15 s | :59-72 | none | MISSING | Minor visual tell; the stagger meter (boss83) covers the boss case. |

## zz_text53.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Hemomancer "Scar-Plates" rename + perk texts | zz_text53.js | data/skills.json `chitin` = "Cilice" (Penance tree) | LATER | The Red Penitent is not ported; Godot's data already carries a later rename (Cilice). |

## zz_title54.js (the title menu)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Chapel moved so the god's face and bowl are centred; right strip mirrored with stepped cross-fade; stepped vignettes | zz_title54.js:12,114-132 | ui/title_stage/bowl.gd (captured chapel art/ui/title_bowl.png) | DIFFERENT | Godot's stages (stranger/bowl/fire) are a redesign; the words stand on the left (title.gd:358-423), not centred on the bowl. |
| GODMARROW cut in stepped bronze (6-step ramp, lit/dark lips, cut bed), 300×34 at ×4 | :45-76,136-139 | ui/title.gd:375-380 (IM Fell SC at 112 px, gold with a pale top line) | DIFFERENT | No bronze banding, no pit shading. |
| Rule under the title with a blinking eye (6.5 s cycle, pupil drifts) | :141-149 | title.gd:381 (plain line) | MISSING | |
| Lede "The god is dead, and has not finished dying." | :150-152 | title.gd:382 | EXACT | |
| Choices as pitted-bronze cast labels (tarnished, verdigris pits; chosen rubbed bright), kindle fade 0.08/0.05, turning sigils either side, the god's drop falling into the chosen word and ringing the blood | :78-111,154-179 | title.gd:410-416 (IM Fell SC rows, "❧" marker on hover) | MISSING | None of the esoteric animation. |
| Menu items: Continue · New Pilgrim · Trial of Thirty · Full screen · The Ossuary of Words · Controls | :22-32 | title.gd:96-119: Continue · The Codex · Options · Those Who Lent Their Hands · Leave; per-order page with Begin/Continue/Trial | DIFFERENT | Godot's order pages (portraits, Stranger's words) are additions; "New Pilgrim"/"Controls" wording gone (Controls under Options/pause). |
| Keyboard/controller navigation of the painted menu, click outside closes the panel | :191-203 | title.gd:171-216 | EXACT (in spirit) | |

## zz_touch53.js, zz_ux_touch54.js, zz_ux_save_hidden.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Phone column LOOT / AUTO / skill bubble / DRINK / ROLL, long press = details card pinned away from the finger, double tap = right click | zz_touch53.js, zz_ux_touch54.js | items/ground.gd:5 (`show_labels`, "the touch LOOT toggle") | LATER | Desktop build; only the label toggle survives. |
| AUTO: pick the auto-attack skill (saved), engage a foe that is on you, strike from the edge of reach, fall back to the plain attack when unaffordable | zz_ux_touch54.js:72-117 | core/settings.gd:6 `auto_attack` | UNVERIFIED | Godot has an auto-attack option; whether it uses the chosen skill / edge-of-reach rule was not checked (entities/hero.gd). |
| Save when hidden / paused (visibilitychange, pagehide, Android pause) | zz_ux_save_hidden.js:4-7 | core/main.gd:263 (WM_CLOSE_REQUEST, APPLICATION_PAUSED) | EXACT | Focus-out is not a trigger in either. |

## zz_tune_batch_c.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Blanket 50% drop cut | :14-21 | — | SUPERSEDED | Removed in the browser itself (v0.88); rank gate rules (pace_and_density). |
| Half of magic/rare rolls fall back to normal | :22-36 | items/loot.gd:206-215 | EXACT | |
| Poise 32 + 1.2 con + 0.3 vit + 0.25 armorBase, regen 4 + 0.2 con, walking drain 1.6/s | :43-73 | — | SUPERSEDED by zz_tune_batch_d (max/regen); walking drain survives: entities/hero.gd:285 | EXACT (drain) | |
| Mystic Essence regen (0.6 + 0.03 spi)(1 + 0.05 nmastery) | :78-88 | core/hero_stats.gd:96-97 | DIFFERENT | Godot ×2 (Godot-only "v103 balance"; `--nobal` restores). The nmastery factor: UNVERIFIED in Godot. |
| Iron Pillars breakable: hp 40 + 5/lvl, glint particles, monsters bash within 0.9 yd (0.6× damage), chargers/bosses shatter at ≥75% max in one blow, player hits damage them | :93-170 | skills/animancer/tree_mirror.gd:17,220,233-234 | EXACT | Glint particles UNVERIFIED. |
| Desc scrub of game words (lightning → arc-light, mana → essence, cooldown → wait…) | :173-191 | data/skills.json (exported after the scrub) | EXACT (via export) | |

## zz_tune_batch_d.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Poise max 28 + 1.4 con + 0.08 vit + 0.25 armorBase (min 20); regen 4 + 0.35 con | :11-23 | core/hero_stats.gd:123-127 | EXACT | Godot adds board/fate terms; no `max(20, …)` floor (minor). |
| Move speed ×0.75 at level 1 | :60-67 | core/hero_stats.gd:155 | EXACT | |
| "Recovering" shaken state (×0.55 speed, ×0.6 damage, ×0.7 cast, no roll until 20%) | :30-91 | — | SUPERSEDED by zz_tune_v58 then zz_zv60 (removed) | Godot has none, as the final browser. |
| Shrine Keeper Essence regen ×0.5 | :98-108 | core/hero_stats.gd:104 `(1.5 + 0.03 ess) × 0.5` | EXACT | |
| Miasma cloud regen stacking cap | :113-133 | skills/miasmancer | UNVERIFIED | Not audited here. |
| Monster poise max ×3; reel 0.35/0.25/0.2 (normal/unique/boss); grace 2.0/1.4/0.9; hits during grace do nothing | :143-173 | entities/monster.gd:125,200-209,309 | EXACT | |

## zz_tune_batch_e.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| +45% normal-rank kin beside pack members | :6-37 | data/zones monsters (export) | EXACT (via export) | |
| Rare/unique rerolled to lesser 30% | :41-51 | items/loot.gd:217-230 | EXACT | |

## zz_tune_v58.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Pack size by strength: (20/xp)^0.75 clamped .5–1.6, × (0.75 + 0.55 rng) | :11-34 | data/zones packs (export) | EXACT (via export) | |
| +40% more packs per zone (copies of its own, `x58_` ids) | :39-80 | data/zones/moor_s12345.json: 133 monsters in `x58_*` packs | EXACT (via export) | |
| Hollow Mystic skill costs ×1.2 | :83-87 | data/skills.json (e.g. proc 3 → 3.6) | EXACT (via export) | Godot then applies BAL_COST (base.gd:293) on top: DIFFERENT, Godot-only. |
| Poise break 40% less stun-lock (reel ×0.6, shaken 0.73/0.76/0.82, roll while shaken) | :94-127 | — | SUPERSEDED by zz_zv60 | |

## zz_tune_v59.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Land grades darker: day ×0.85, night ×0.7, haze ×0.5; AMBIENT ×0.8 except moor/fen/wild | :5-16 | world/dark_layer.gd:14 `GR`, world/zone.gd:391 `ambient_at` (export byPhase) | UNVERIFIED | Whether the exported `ambient.byPhase` already includes the ×0.85/×0.7 was not checked. |
| Ossuarch hand lantern v3.1 (11×17 skull cage, dreamy sway, incense vapour ribbon 30/s, light from the skull) | :18-96 | entities/lantern_unit.gd (floating Wickbound for every order) | SUPERSEDED (browser) / DIFFERENT (Godot) | In the browser the Ossuarch kept this hand lantern (only PixelLab heroes got the floating one, zz_zy_lanclip64:19 `WHO = hemo, animancer`). Godot gives every order the floating gold/iron lantern (lantern_unit.gd:9). The bone-white vapour ribbon is MISSING. |

## zz_ui.js (v0.35 grimoire pages, icons, tooltips)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Five-tone ramps, class and tab colours | zz_ui.js:13-39 | ui/uikit.gd (U.tab_col, cls_col) | EXACT | Values UNVERIFIED one by one. |
| 24 px pixel icons per skill, 3 states (lit/dim/lock + stamp) | :44-256 | art/icons/<id>[@dim|@lock].png (1014 files), uikit.gd:76 | EXACT (via export) | |
| Icon cell: recess, glow when learned, pulsing gold rim when a point can go in | :259-270 | ui/panel_skills.gd:260-279 `_skill_cell` | EXACT (per header) | |
| Page: dark vellum, carved frame, rivets, corner rosettes in class colour | :274-305 | uikit.gd (page) | EXACT (per header) | |
| Tooltip: name + 3 lines + cost + "Now:" + hint; Shift/MORE stud for perks, synergies, next level; box ≤ 60% of screen, carved | :332-370 | ui/hud.gd:448-533, uikit.gd:303 | EXACT | Layout rules (two columns, 60% cap) see zz_ui_desc. |
| Item tooltips capped at 9 lines | :355-356 | items/tooltip.gd | UNVERIFIED | |
| Skill page: tabs with spine, points plate, ROWREQ numerals, channel arrows that light, level plate, perk pips, R mark, Reset stud, MORE stud | :372-450 | ui/panel_skills.gd:140-258 | EXACT (per header) | "Reset N" stud / respecs: UNVERIFIED. |
| Character page: attribute sigils, + studs, derived rows, fate tooltip, "Reset all" | :453-491 | ui/panel_char.gd:113-166 | EXACT (per header) | "Reset all" UNVERIFIED. |
| Inventory v0.53: compact page top-right, engraved slot sigils, grid, gold line; world live under the shorter page | :494-556 | ui/panel_inv.gd:2-5 | EXACT (per header) | |
| 18 px scaled icons in hotbar/picker | :559-565 | ui/bar.gd:306-310 (72 px = 18 logical) | EXACT | |

## zz_ui_desc.js (lore by default, numbers on Shift)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| LORE table (one souls-like paragraph per skill, all five orders), keyed by current name | zz_ui_desc.js:13-171 | data/skills.json `lore` (155 of 156) | EXACT (via export) | `cull` still says "hunting eagle" in both (banned animal word, HANDOFF §4). |
| Short tip: name·level, lore (≤4 lines), requirement, "Hold Shift for details" / "MORE stud: details" | :289-295 | ui/hud.gd:462-468,531-532 | DIFFERENT | Hint text is "shift: the numbers, perks and synergies"; browser "Hold Shift for details". |
| Full tip: kind text, description, cost lines (resource/next level, Hemomancer life %, poise, shards, wisps, skeleton hold, weight), "Level L > L+1" with changed numbers marked `a>b`, perks with stat needs, synergies measured live, "Scales with" lines, requirements, use hint | :232-341 | ui/hud.gd:470-530 | DIFFERENT | Godot shows Now/Next as two lines (no `a>b` merge), no "Scales with" block, no wisp/skeleton cost lines, synergies from data `per_hard_point_pct` (equivalent). |
| Two-column D2-style box when tall, wrapped to 222 px columns, rule lines, title colour bar | :402-449 | uikit.gd:303 tooltip (single column) | DIFFERENT | |
| Flesh panel mutation cards share the lore/Shift tooltip | :363-375 | — | LATER | Hemomancer not ported. |
| Arcana web card: Shift shows the named skills' live numbers | :377-400 | ui/panel_board.gd:236 `tip` | UNVERIFIED | |

## zz_ui_hud.js (the bottom bar, v0.3x; look superseded by zz_hud54/55)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Layout: life orb · left skill · poise + class gauge · belt · menu studs · right skill · resource orb | zz_ui_hud.js:16-25,297-319 | ui/bar.gd:2-4 | EXACT | |
| 3×5 micro numerals | :28-91 | uikit.gd:282 `micro` | EXACT | |
| Skill slot: bound key top-left, cost bottom-right, dim red when unpayable; Hemomancer life %, monk sand % | :115-162 | ui/bar.gd:306-336 | EXACT | Monk shows poise/sand per hud.gd:476-484. |
| XP bar in the channel under the rail, 10 ticks, tooltip | :163-170 | ui/bar.gd:293 `_xp_bar` | EXACT (per header) | |
| Class rows: wisp pips coloured by kind + held; shards; brood; omens; monk balance needle bar | :189-251 | ui/bar.gd:346-363 (generic `hud_gauge` pips + micro text; monk "Amber % Black %") | DIFFERENT | Monk's centre-balance needle bar (browser :223-242) is a text line in Godot; per-kind wisp pip colours are moot (one choir, v90). |
| Belt 4 wells with counts and numerals | :252-260 | ui/bar.gd:366 | EXACT (per header) | |
| Menu studs with icons, point dots, tooltips with keys | :261-283 | ui/bar.gd:380 `_menu`, 398 `_level_buttons` | EXACT (per header) | Godot adds D2 level-up studs. |
| Message plate above the bar; banners in the upper third with gradient band | :322-336 | ui/hud.gd:742-776 `_band` | EXACT | |
| Steam Deck / odd sizes: fill the screen | :363-371 | — | LATER | Godot renders at 1920×1080 scaled by the window. |

## zz_voice.js (the world's voice)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Zone entry lines (75 zones) | zz_voice.js:17-400 `e` | art/ui/zone_lines.json (75), ui/hud.gd:59,133 | EXACT | |
| Whisper pools (75 zones) + act fallbacks (5×3), every 60-120 s of quiet, never twice running, never in a boss fight or with a panel open | :17-408, :865-911 | art/ui/voice.json (75 + 5×3), core/main.gd:298-326 | EXACT | Godot sometimes swaps in a Godot-only folk saying (main.gd:307-312, quests.gd `LAND_SAYINGS`): an addition. |
| LAN_RENAME (generic lantern names → named, with inscriptions) | :412-452 | data/zones objects (e.g. moor "Ashwake Crossroads", crypt "The Long Candle") | EXACT (via export) | Inscriptions for renamed lanterns: UNVERIFIED (quests.gd `lantern_inscription`). |
| LAN_INSCR (32 named lanterns) | :454-485 | world/quests.gd:163-176 (12, Act I) | LATER (Acts II–V) / EXACT (Act I) | |
| LAN_POOL per act (5 each) | :487-500 | quests.gd:177-179 (Act 1 only) | LATER (acts) / EXACT (Act I) | |
| WAYSTONE names + inscriptions per act | :502-508 | quests.gd:161 (Act 1 only) | LATER / EXACT | |
| MARKS: landmark names + inscriptions by decor kind (Act I: Luminous Caps, A Trunk-Relic; Acts II–V props) | :511-585 | art/landmarks/landmarks.json (21 `lm_*` landmarks from zz_landmarks55), manager_use.gd:338 `_marks` | DIFFERENT | Godot inscribes the zz_landmarks55 landmarks (part 2's file) but not the decor-kind marks: "Luminous Caps"/"A Trunk-Relic" never surface (grep: MISSING). |
| BARKS: 5 towns × 6 roles × 4-5 lines, next-bark rotation avoiding repeats | :593-749, 970-975 | quests.gd:50-92 (Act 1 only) | LATER / EXACT (Act I) | Rotation rule UNVERIFIED. |
| Speech routing "Name: 'line'" → named italic line over the bar; giver's errand count first; Stranger alternates | :977-1019 | quests.gd:572 `split_speech`, world_ui.gd:122-135 | EXACT | Alternation rules UNVERIFIED. |
| DEATH lines (10) on the death screen, RETURN lines (10) on respawn | :752-775, 1021-1031 | core/main.gd:373-438 | EXACT | Godot also whispers "Slain by X." (addition) and the HUD draws a fixed "The lantern carries you back." (hud.gd:770-774) under the death line: DIFFERENT (extra line). |
| Item lore line on rares/uniques, by base and by unique name | :778-807, 1038-1056 | items/tooltip.gd:14-66 | DIFFERENT | Two lines rewritten by the animal-word rule (claw, talons); the rest identical. |
| Drawing: entry line italic 11 px at y 66 on a gradient plate; whisper at 76/96; barks above the bar; shifts aside when a panel is open | :913-961 | world/objects/world_ui.gd (Labels + plates) | DIFFERENT (look) | Same placement idea; fonts/plate gradients not compared. |
| Durations: min(9, max(4, 2.2 + words·0.28)) | :831-837 | world_ui.gd `_dur` | UNVERIFIED | |
| Lantern inscription on touch; waystone inscription on touch | :1002-1010 | manager_use.gd:98-116 `_say(e.name, Q.lantern_inscription(...), true)` | EXACT | |

## zz_walls63.js, zz_world55.js, zz_world_props.js (world art)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Wall/cliff blocks get a 3× twin textured with PixelLab materials (per theme), courses following the face slope, mirrored tiling | zz_walls63.js | world/wall_block.gd, data/zones `walls`, assets `wtex` | LATER (art) / UNVERIFIED | Godot rebuilds blocks from the export with the same textures; the lighting-by-block-luminance blend (:40-41) was not compared. |
| W55 hand-drawn pieces (gate, props, trees, rocks, pillars), species trees per zone with life stages (giant/edge/inner weights, giantR), sway in 3 bands, hero-shaped hole cut in the trunk in front of the hero | zz_world55.js:8-205 | data/zones `trees` (sprite `sp_ashoak_young0` …), world/zone.gd:296 `_sprites`, shaders/sway.gdshader | EXACT (via export, stages baked) | The trunk hole for a hero behind a tree (:147-158,172-180) is UNVERIFIED in Godot (no "hole" in zone.gd). |
| Luminous shroom / trunk relic / ruin pillar baked props with night glow stamps | zz_world_props.js | superseded by W55 PixelLab pieces in the browser | SUPERSEDED (zz_world55 / w61) | |

## zz_world_expand.js (Hollow Wood, Root Deep)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Two zones (152² and 164²), openness builders, lanterns, portals, back-stairs from crypt/cata1, moor/fen portals | :147-284 | data/zones/hollow_wood_*.json, root_deep_*.json, index.json links | EXACT (via export) | |
| Ambient day/night per theme (hollow_wood 120,138,110 / 46,62,70; root_deep 84,104,96 / 34,44,58) | :29-45 | data/zones `ambient.byPhase` | EXACT (via export) UNVERIFIED | |
| Props: luminous caps (teal/ghost/amber, pulsing glow 8s px), trunk relics (ribcage/skull/niche/sword/face) | :62-98, 288-356 | data/zones `props`; zone.gd `_sprites` | EXACT (via export) | Glow pulse `0.55 + 0.25 sin(2t)` at 0.28 alpha: UNVERIFIED (lights come from the export's `lights`). |

## zz_worldscale.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| World drawn at 4 screen px per world px (ZK 1.0); creatures and heroes ×0.75 about their feet so they keep screen size | zz_worldscale.js:6-77 | core/iso.gd:7-9 (WPX 4, tile 144×72) | EXACT (world) / UNVERIFIED (creatures) | Godot atlases are "screen px at scale 1"; whether they were captured post-×0.75 was not checked. |

## zz_zv60.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Packs 15% smaller | :6-15 | data/zones packs (export) | EXACT (via export) | |
| Hero poise break: stun 0.75 (×1.2 = 0.9), rooted, grace 1.6 after, refill to 50% over 0.35 s, no roll until full, light blows do not shove | :22-77 | entities/hero.gd:49-51,219-225,501-517, core/combat.gd:69 | EXACT | grace 0.9+1.6 = 2.5 ≈ browser 2.35 + stagger/6 (light79). |
| "too shaken to roll" | :74 | hero.gd:472 "Too shaken to roll." | EXACT | |
| Hit pose through the stun | :79-86 | hero.gd:512 plays "hit" | EXACT | |

## zz_zv61.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| PixelLab lantern positions per view; light from the lantern; colours (hemo 238,222,198; mystic 176,214,255) | :8-40 | — | SUPERSEDED by zz_zy_lanclip64 (floating) | |
| PixelLab heroes flinch when struck (hit anim 0.42 s when hurt > 0.17) | :43-57 | hero.gd:512 (on break only) | UNVERIFIED | Flinch on ordinary hits not found. |

## zz_zw_lantern63.js (the lantern's light, perks, wicks)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Lantern affixes: Bright 10-25 (l1), Blazing 26-45 (l9 rare), Ghostlight 8-20, Hearth-wick 1-3, Pale Flame 10-22, Green Taper 1-2, Violet Wick 1-3 with weights | :11-19 | data/items.json affixes 31-37 | EXACT | |
| STAT_TEXT for the wicks | :21-29 | data/items.json stat_text | EXACT | |
| Strongest wick tints the lamp; `__lampK = 1.5 + lrad·0.5/100` | :30-36 | items/ground.gd:106 `wick`, dark_layer.gd:146 | EXACT | Pool tint by wick colour: dark_layer uses class colour only (dark_layer.gd:152) → DIFFERENT (wick tint not applied to the pool). |
| heroLightR × 0.62 × (1 + lrad/100) | :44 | entities/hero.gd:93-105 | DIFFERENT | Godot multiplies by `1 + lrad·0.5/100` (that is lampK's slope) and applies ×0.62 only when the wick is down. The pool radius in dark_layer.gd:147 therefore clamps at 5.4·lampK/1.5 (browser: heroLightR ≈ 4.3–5.3 wins the min), so Godot's pool is ~10–25% wider, and does not shrink with `7 + 1.5(1-dayK)` through the day (Godot: +1.5 only at "night"). |
| Light sources: pool RR 64·lampK/1.5 at the foot (0.17+0.15·night)·k, glass 22 (0.2+0.12), body 26 (0.1+0.08), hot heart 16 at 0.5 | :51-70 | shaders/dark.gdshader hD (glass glow), dark_layer.gd:158 | DIFFERENT (approximation) | Godot has the pool and the dithered glass glow; the body-climbing light (26 px) is not separate: UNVERIFIED. |
| Glow sprite in the glass: 3 Bayer-dithered discs 9/5/2 px, breath 0.86 + 0.09 sin1.7t + 0.05 sin(2.9t + sin0.7t) | :71-103 | dark_layer.gd:155, dark.gdshader:144-156 | EXACT | |
| Wick effects every 0.25 s: Hearth life/s, Green Essence/s, Pale slow %, Ghostlight fear chance/s (not bosses), Violet Essence on kill in light (radius heroLightR·0.7) | :105-133 | items/ground.gd:335-370, 122-125; core/hero_stats.gd:195-197 | EXACT | Light radius used for "in light": ground.gd:118 UNVERIFIED (0.7 factor). |

## zz_zx_dark64.js (the dark layer, wisps)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Open dark A = outdoor ? 0.82 − 0.5·dk² : 0.84, ×(1 − 0.6·flash); colour (8,13,27) outdoor, (8,9,20) under | :118,145 | world/dark_layer.gd:118,136 | EXACT | |
| Hero pool: core 0.22, far 2.1, ring 0.26, w 1, R = min(heroLightR, 5.4·lampK/1.5)·ISO_R·0.4·(1+0.5dk)·mood, breath; tint amber/ghost-blue | :121-127 | dark_layer.gd:146-158 | DIFFERENT | Radius differs as in lantern63 above; Godot adds per-order tints for ossumancer/miasmancer/monk. |
| Band falloff: 4 smoothed steps `v = 0.64·(s/3)^1.15`, faint ring at 0.9, dark deepening to `0.64 + 0.36·u^0.6`, 12-step Bayer dither, overlay tint 0.2 + 0.1·night | :45-71,151 | shaders/dark.gdshader:106-125,164-172 | EXACT | |
| Occluders: trees r.24, rocks .4, pillars .34, walls/cliff/palisade squares; shadow 0.9 inside the pool falling to 0 at far; decor round things (saints .32/.34, cages .22, tent .75), shrines/altars .4 | :78-109 | dark_layer.gd:9-11,276-337 | EXACT | |
| World flames: pools by kind (lantern .26, brazier .36, wallc .3, else .32)·R·f, core .4, far 1.6, w .3; nearest 4 throw shadows (1 on slow devices) | :129-134 | dark_layer.gd:70-86,163-183 | EXACT | |
| Fires: r 26 + 18R, core .35, far 1.5 | :135 | dark_layer.gd:78 ("raw" r 30·…, core .35, far 1.5) | EXACT (approx.) | |
| Wisps: pool r 21·br on the ground (core .25, far 1.5, w .5) and r 12 around the body | :138-143 | skills/animancer/wisp_view.gd:29-30 (dark_r 21), dark_layer.gd:202-205 | DIFFERENT | Only the ground pool; no second small pool at the body. |
| Half-resolution / every-other-frame repaint on slow devices | :147-150 | — | LATER | Shader does it every frame. |
| **Wisp drawing (v0.66/74/80)**: 0.9 s ghostly wake of 1 px points rising and curling, twinkling dust motes (≤14), three additive glows (18/10/5 px) with a slow "ethereal breath", 2×2 heart + cross; darting wisps drawn the same (no comet) | :158-206 | skills/animancer/wisp_view.gd (an 8-frame additive atlas `wisp_rev`, "No comet tail"), lamp PointLight2D | DIFFERENT | No wake, no dust, no breathing triple glow. The user names the browser wisps as the target (HANDOFF §5.3/§5.5). |

## zz_zy_lanclip64.js (the Wickbound follower)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Soul-lantern follower: spring 30/9, target back 0.08+0.22·mv and side 0.4−0.08·mv, idle wander, leash 0.75, z = 20 + 1.6 sin1.55t + 0.8 sin0.6t, tilt from screen speed (−svx·0.004, ±0.35), re-attaches after a zone/4 yd jump | :22-44 | entities/lantern_unit.gd:40-79 | EXACT | Godot adds a gust lean (Game.wind). |
| Only PixelLab heroes (hemo iron, mystic gold); others keep their old lamps | :19-20 | lantern_unit.gd:9 (all five orders) | DIFFERENT | Deliberate in Godot; the Ossuarch's hand-skull lantern (v59) is gone. |
| Glass = light source; sprite hangs from nothing, flips with facing | :45-70 | lantern_unit.gd:31,72-79 | EXACT | Glass breath `0.85 + 0.1 sin5.1t + 0.05 sin13t` (lantern_unit.gd:78) is a fast flutter the browser removed in v0.79 (lantern63:90): DIFFERENT. |

## zz_zz_boss83.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Slam telegraph: dust disc thickening from the centre (k), broken grit rim, cracks after k > 0.55; charge lane 6 yd; small tell under great creatures' wind-ups; drawn above the dark, bone-grey | :16-72 | entities/ai/ai_world.gd:6-8, ai_boss.gd:145-150 `tell` | EXACT (per header) | Exact dither/densities UNVERIFIED. |
| Stagger meter: boss under its life bar (primed ≥ .8), hovered champions/uniques (≥ .7), eased 0.25 | :75-100 | ui/hud.gd:799-803, 825-829 | EXACT | Godot has no "primed" brightening (two colours only: reeling white / else `#b8ae94`): DIFFERENT (minor). |
| Slam aftermath: cracked ground 2.5 s, drains 14 poise/s (not while rolling) | :105-133 | ai_world.gd:111 `slam_scar`, header "2.5 s, drains 14 poise/s" | EXACT | |
| Bosses left behind do not heal | :136-139 | ai_boss.gd:53-58 | EXACT | |

## zz_zz_chest91.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Chest: +25% item roll, coins (2-6)·ilvl half the time when empty, spill 1.05-1.75 tiles toward the camera fanned 1.9 rad | :11-29 | items/loot.gd:25-45 | EXACT | |

## zz_zz_cine76.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Flame mood: hp < 30% shrinks (−18%) and struggles; boss fight gutters (0.92 + …) | :28-41 | world/dark_layer.gd:107-115 | EXACT | |
| Far flash: outdoor night ≥ 0.6, not in town, first 30-70 s then 55-125 s, two flickers 0.07/0.74, lifts the dark 60% | :43-55 | dark_layer.gd:119-135 | EXACT | The cold screen-blend wash `#9fb4dc` at 0.12·v (cine76:115): UNVERIFIED in Godot. |
| Lantern-cast creature shadows (lamp as a flame source, R = poolR·2.4) | :62-69 | entities/sil_shadow.gd:60-69 (R = light_radius·0.55) | EXACT (idea) / DIFFERENT (numbers) | |
| Eye-shine: two pixels, facing you, between 1.05R and 3.2R, blink, brighter when hunting | :71-92 | world/atmos.gd:281-321 | EXACT | |
| Glints on ground items in the pool every ~3 s | :93-106 | items/ground_item.gd:4,16-17,49 | EXACT (per header) | |
| Blue-teal dark | :145 | dark_layer.gd:136 | EXACT | |

## zz_zz_decor66.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Organic Hide pieces (ribs, vein, flesh, eye) ~1 per 2500 tiles, ≥14 apart; camp (tent + fire) in ~60% of open zones; wayside saints by roads (2); gibbet cages (1-2); the herd on the Burnt Heath (7 carcasses in a ring + skulls) | :22-65 | data/zones `decor`, `markers.camp/herd` (export) ; world/zone.gd:316 | EXACT (via export) | |
| Camp fire lights its ring (fireLight37 5.5 yd) | :67-70 | data/zones `lights` | UNVERIFIED | |
| One line on first reaching the herd ("The herd lay down here…") | :85-88 | none (grep) | MISSING | |

## zz_zz_empty92.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Empty Hand skill texts rewritten for the beggar-monk (11 skills, 2 perks) | :8-27 | data/skills.json (e.g. klaugh "a dry laugh rattles") | EXACT (via export) | |

## zz_zz_fix88.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Mirror skills ×1.2 damage (pillars, cage, fissure, anvil) | :4-6 | skills/animancer/base.gd:351-363 | EXACT | Godot then multiplies by BAL_DMG (fissure ×2, cage ×1.3, anvil ×1.2…) and WISP_NERF: DIFFERENT, Godot-only, `--nobal`. |

## zz_zz_imps67.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Skittishness 14.4/xp clamped .08–.48 (×0.5 unique, 0 boss); crowd factor .3/.6/1 | :9-12 | entities/ai/brain.gd:480-494 | EXACT | |
| Panic flee (packmate death within 5 yd: 30%·k; low life 18%: 45%·k), hop back after a blow (45%·k, 0.25-0.45 s), weaving approach with hesitations, idle camp milling toward packmates | :14-79 | brain.gd:505-570, ai_world.gd:300-305 | EXACT (per code read) | |

## zz_zz_light79.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Flame flicker smoothed (eased over ~0.2 s, no flutter, no strobe) | :11-20 | fx/flicker.gd:12 (`sin7.1t·0.03 + sin12.7t·0.02`), lantern_unit.gd:78 (`sin13t`) | DIFFERENT | Godot's PointLight flames and the lantern glass keep fast components the browser removed because they strobed on phones. The dark pool's breath (dark_layer.gd:155) is the slow one. |
| Monster stagger 20% stronger (poise damage ×1.2, reel ×1.2) and player's too | :29-36, 86-96 | core/combat.gd:6 `STAGGER 1.2`, monster.gd:207, hero.gd:511 | EXACT | |
| Wisps as fuel: a wisp per cast (two if cost ≥ 40), never refused; OWN = swarm/storm/echo/condense/attack | :43-55 | skills/animancer/base.gd:43,610-622 | EXACT | OWN lacks "echo" in Godot (no such skill): fine. |
| choirK 0.65 → 1.2 by choir fullness on spell damage (not melee/golem) | :44,56-62 | base.gd:450-452 | EXACT | |
| The choir shapes the spell: counts ±1 (≥ .8 / < .2), lifetimes ×(0.75 + 0.4f), sizes ×(0.8 + 0.3f) | :66-83 | base.gd:277-287 | EXACT | |

## zz_zz_maw95.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Waystone drawn as a ruined ring: 16 flagstones, two step rings, dark wet bottom with veins, one slow ridge, sheen, ash crust that falls in when known; 8 fang stones with plinths, stains, fibres, bands, channel, one fallen | :29-107 | world/objects/waystone.gd:9-227 | EXACT | Colours and geometry match line for line. |
| Passage: walk 0.45 s → sink 0.95 s (52 px, gore 40/s) → close 0.55 s (26 gore, stain) → dark 0.35 s → rise 1.2 s (reform 70, gore 24, stain 26, drips 4 s after) | :172-220 | world/objects/passage.gd:101-165, world/objects/gore.gd | EXACT | Drips after arrival UNVERIFIED. |
| Black fade over everything; sounds | :222-225 | world_ui.gd:162 `set_fade` | EXACT | Sounds UNVERIFIED. |

## zz_zz_moon86.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Moonlit clearings: 2-3 per outdoor zone (not towns), cool pool r 2.3 yd (150,176,222), 14 falling motes, rest: +15 poise/s and +0.6% life/s inside; one line "A gap in the cloud…" | :13-57 | none (grep "clearing", "moon": nothing) | MISSING | |
| Canopy light shafts by day in the woods (screen-blend bands, world-anchored, dust turning) | :58-73 | world/weather.gd:7,114-123,196 (shafts, "s15") | DIFFERENT | Godot has shafts from the s15 pass (part 2); the browser's moon86 shafts are world-anchored with span 190 and alpha 0.11·…; not compared further. |

## zz_zz_music96.js (the score)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Live synthesis: Karplus-Strong twelve-string, bells, mallets, log drums, darbuka, flute, strings, horn, formant choir, swells, scrapes, clangs, drips, breath; reverb 5.5 s + ping-pong delay; compressor | :17-200 | world/soundscape.gd:4-5 (loops rendered by tools/render_mus.js), audio/music/*.ogg | DIFFERENT | Timbre kept (rendered from the same code), liveness lost. |
| Seeded motifs stated / answered / varied per cue | :205-231 | — (fixed loops) | MISSING | Each place no longer varies its tune. |
| Cues: a1_town (6/8 fingerpicked, 132 bpm), a1_wild (70, silences), a1_deep (58), a2_town/wild/deep (hijaz oud, darbuka), a3 (log drums, flute, marimba), a4 (strings, horn, choir, bells), a5 (industrial), boss1-5, title (= a1_town at 110 bpm) | :236-422 | audio/music: a1_town, a1_wild, a1_deep, boss1, title, dirge | LATER (acts II–V) / DIFFERENT (title) | soundscape.gd:84-85 plays `dirge` on the title, not the slowed Moor tune (`title.ogg` exists but is unused there: UNVERIFIED). |
| Cue choice: boss → town → DEEP regex (crypt|cata|barrow|…|hollow|…) or indoor → wild | :425-437 | soundscape.gd:82-97 (town / !outdoor / wild) | DIFFERENT | The browser's regex sends Hollow Wood (and any id with "hollow") to the deep cue; Godot plays wild there. |
| Cross-fades: new bus tc 1.6 s (boss 0.3), old tc 0.9; music to 0 while paused | :438-456 | soundscape.gd:107 (3.5 s / 0.8 s), 124 (×0.55 while paused) | DIFFERENT | |
| Audio wakes on first click/key so the title can play | :466-467 | n/a | LATER | Browser autoplay rule. |

## zz_zz_mystic90.js (one choir, Binding Thread)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| One choir (every wisp a revenant) | :32-33 | skills/animancer/base.gd header | EXACT | |
| Chances per strike: thread .04 + .01/lvl ≤ .20; pass .10 + .03/lvl ≤ .45; needle .08 + .025/lvl ≤ .40; split .08 + .025/lvl ≤ .40 | :18-23 | base.gd:412-415 | EXACT | |
| Needle: 0.6 + 0.04/lvl of rev dmg, 2.6 yd (4.5 with sweep), stops at tall tiles, burn perk | :24-25, 58-72 | base.gd:417-418, tree_thread.gd | EXACT | Godot adds ×1.3 with an Arcana (w_ember). |
| Split: spark 0.5 + 0.04/lvl (×1.3 prismchain), 1-2 sparks ≤ 4.5 yd | :26-27, 73-76 | base.gd:419-420 | EXACT | |
| Snag: slow 0.6, poise 10 | :53-57 | tree_thread.gd (snags list) | UNVERIFIED (numbers) | |
| Binding Thread: first within 2.5 of cursor (≤10 yd), 0.4 dmg on cast, others within 5.5 yd (chainN−1 (+2 fork)), dragged for 0.55 s (great ones held), snap: full dmg, poise 18, slow 0.8, Marked 3 s (perk), shake 2 | :79-122 | skills/animancer/tree_thread.gd:156-176, 318-354 | EXACT (structure) | Snap poise/slow numbers UNVERIFIED. |
| Drawing: sagging 1 px pale threads, needle dash, spark motes, no glow | :141-167 | skills/animancer/fx.gd:118-161 | EXACT | Line width 2 Godot px = 0.5 web px: thinner than the browser's 1 web px (4 Godot px) → DIFFERENT (minor). |
| Choir panel shows the four chances | :170-183 | ui/panel_orders.gd:3,130 | EXACT | |
| Skill texts/names (Darting Wisps, Splitting Wisps, Binding Thread + perks) and info lines | :186-216 | data/skills.json | EXACT (via export) | |

## zz_zz_perf74.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Slow-device mode (mobile, or frame time > 26 ms): half-res dark, fewer shadows | :10-30 | — | LATER | |
| No blob shadow under the hero (the silhouette does it) | :32-35 | entities/sil_shadow.gd | EXACT | |
| Bosses never sealed in; fight starts in the room; leaves at 34 yd and goes home | :40-59 | entities/ai/ai_boss.gd:37-58 | EXACT | |

## zz_zz_shadow70.js (the hero's true shadow)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Silhouette of the current frame laid along a world direction, length × figure height, alpha fading to the tip (penumbra), two-step Bayer dither in (8,6,14) | :31-72, 103-112 | entities/sil_shadow.gd:14-81 (Sprite2D transform, flat alpha, no dither) | DIFFERENT | |
| Up to three casters at once: lantern (1.1 + 0.15·night long, a 0.04 + 0.4·night outdoors), the two strongest world flames within reach, the sun (angle −2.4 + 2.2·h turning with the hour, length 0.85 + 0.9·|h−.5|, a 0.34·dk) | :79-101 | sil_shadow.gd:43-58: one caster (sun from a fixed (0.85,0.45) when dk > 0.3, else the lantern), no world flames | DIFFERENT | The sun does not turn with the hour; braziers/campfires throw no hero shadow. |
| Lantern-cast creature shadows | (cine76) | sil_shadow.gd:60-69 | EXACT (idea) | |

## zz_zz_study82.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Wick down (L or a tap on the lantern): pool ×0.62, wake range ×0.7, damage taken ×1.15, +40 mf, ×1.25 gold; reset on death | :16-50, 59 | entities/hero.gd:100-101,182-185, brain.gd:93-94, combat.gd:57-58, loot.gd:40-57 | EXACT | Tap/click on the lantern to toggle (:30-37) is MISSING (key only). Reset on death UNVERIFIED. |
| The lantern keeps a little: kept ≤ 3, light ×(1 − 0.12·kept), mf −10/gold −10% per kept, remnant armed at 2.5 yd, reclaimed within 0.8 → +25% life, line | :52-80 | hero.gd:103, loot.gd:40-57, core/main.gd:283-293,408-409 | EXACT | Reclaim radius 0.9 vs 0.8 (main.gd:288): trivially DIFFERENT. |
| Remnant drawn as a small pale breathing light with a thread rising; cuts a small hole (r 12) | :82-93 | main.gd (remnant node) | UNVERIFIED | |
| Finishing blow: melee on a reeling creature ×2.2 once per 1.5 s; gives 15% resource (monk: sand ×0.8), a wisp, +20 poise, hitstop 0.09, shake 3 | :95-114 | core/combat.gd:25-29, hero.gd:429-431 | EXACT | Hitstop/shake amounts UNVERIFIED. |
| Drop sounds by best rarity (unique bell 196/392/588, rare 880+1318, magic 1560 tick, normal 170 thud); gold silent | :116-136 | items/ground.gd:96-104 `drop_sound`, core/sfx.gd `SFX.drop` | EXACT (gold silent) | Note frequencies in sfx.gd UNVERIFIED. |

## zz_zz_thread93.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Burrowed creatures untargetable by wisps, sparks, needles, threads | :18-28 | tree_thread.gd:365-371, 450, 531 (`buried` checks) | EXACT | |
| Soul Leash (Thread tree, r3 c1 under Needle's Mark): every wisp throws a thread to a foe ≤ 5 yd (2 with Double Thread); 3 + 0.1/lvl s; tick 0.25 of leashDps·0.25·k (k 0.65 without wisps, 3 threads from the Mystic); crossing creatures take 0.7×; Barbed slows .4/.5; Soul Snare frees a wisp; breaks at 6.5 yd | :31-79, 152-157 | tree_thread.gd:80-137, 357-404; data/skills.json leash tab 2 | EXACT (structure) | Godot adds poise damage and a 0.9-yd shove on crossing (tree_thread.gd:387-390,396,401): DIFFERENT (Godot-only). Opening 1.6× blow at :95 UNVERIFIED vs browser. |
| Procession (Soul tree under Condense): hold, ring r 1.7 (+0.9 Wide), ≤ 8 yd from you, wisps circle at 1.1 rad/s, strike nearest inside every 0.45 s for 0.6 rev dmg, Dirge slow .45, costs 3 (→3.6) Essence/s, the v90 chances ride on it; faint dashed ring on the ground | :82-130, 141-146, 158-165 | skills/animancer.gd:280-295, base.gd:166,230, fx.gd:2-3 ("the procession's worn ring") | EXACT | |
| Procession icon (ring of motes) | :167-177 | art/icons/proc*.png | UNVERIFIED | |

## zz_zz_tome94.js + zz_zz_tome94_text.js (the Codex book)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Text: 10 chapters (prologue + 9), prefaces, 66 works, Relics and Rites | zz_zz_tome94_text.js | data/codex.json: 10 chapters, 77 pages (1+11+12+11+8+7+8+9+6+4) | EXACT (via lore/gen.py → codex_to_bb.py) | Page split is Godot's (BBCode pages). |
| Look: book bound in pitted bronze with verdigris, two vellum leaves (foxed, darkened edges), bronze corner guards with rivets, stacked page edges, gutter, ribbon, torn corner, stain and smudge, clasps; index leaf with the Hush's sigil and Roman numerals; illuminated drop initial with a knot plate; page-turn animation; folio numbers | zz_zz_tome94.js:15-163, 228-268 | ui/codex.gd:2-5 ("A dark reliquary book: chapters on a rail at the left, one page at a time on the right") | DIFFERENT | Godot's codex is a different, plainer design. |
| Keys: Esc close, ←/→ turn pages, PgUp/PgDn chapters; remembers the page | :274-285, 266 | codex.gd:6 (Up/Down pages, Left/Right chapters) | DIFFERENT | Page memory UNVERIFIED. |
| Opened from the title ("The Ossuary of Words") and in play (K) | title54:29; tome94 | ui/title.gd:103 ("The Codex"), ui/hud.gd:301-302 | EXACT | Title label wording differs. |

## zz_zz_world77.js (ground scatter, canopy)

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Scatter per land (wood/moor/fen/heath kinds and weights), density 0.16 (0.1 slow), grass/reeds with 3 lean frames swapped by wind | :19-120, 137-155 | data/zones `scatter` (export), world/zone.gd:228-266, world/scatter_layer.gd | EXACT (via export) | Lean thresholds ±0.35 vs Godot ±0.45 (scatter_layer.gd:25): DIFFERENT (minor). |
| Canopy dapple: a 192² Bayer-dithered leaf-shadow tile, world-anchored, drifting with the crowns, alpha 0.16 + 0.2·dk | :122-134, 157-163 | world/atmos.gd:24,219-224,343 (a few drifting bright "dapple" patches on the additive layer) | DIFFERENT | Browser darkens the ground in a leaf pattern; Godot adds bright patches. |

## zz_zz_world89.js

| Feature | Browser ref | Godot ref | Status | Notes |
|---|---|---|---|---|
| Channels: 2-6 tree lines / broken colonnades (pillars with rubble), some in parallel pairs 4-6 apart, gaps every 3-6, never near roads/entries/lanterns/camps | :25-61 | data/zones grid (export) | EXACT (via export) UNVERIFIED | Counted nothing; the grid is the browser's. |
| Wanderers: singles/pairs of the zone's own normals, 4-18 per zone, ≥ 9 yd from packs | :62-84 | data/zones/moor_s12345.json: 24 creatures in `w89_*` packs | EXACT (via export) | |

---

## Top 15 gaps by player-visible impact

1. **Wisps look nothing like the browser's** (zz_zx_dark64.js:158-206 vs skills/animancer/wisp_view.gd): no ghostly wake, no twinkling dust, no breathing triple glow. The user names the browser wisps as the target.
2. **The lantern pool is wider than the browser's and does not breathe with the day** (lantern63:44, dark64:124 vs entities/hero.gd:93-105, world/dark_layer.gd:146-147): the ×0.62 factor and `7 + 1.5·(1−dayK)` are missing, so Godot clamps at 5.4·lampK/1.5. Also the wick colour never tints the pool (dark_layer.gd:152).
3. **Flames flutter** (light79:11-20 vs fx/flicker.gd:12, entities/lantern_unit.gd:78): the browser eased every flame to a slow breath because the fast flutter strobed; Godot kept 7-13 Hz terms on world flames and the lantern glass.
4. **The title screen is a different design** (zz_title54.js): no centred bowl composition, no stepped-bronze GODMARROW, no blinking eye, no bronze-cast choices with turning sigils and the god's drop. The user listed "menus" among what the browser does better.
5. **The Codex is a plainer book** (zz_zz_tome94.js vs ui/codex.gd): same text, but the bronze binding, vellum leaves, guards, ribbon, illuminated initials, folios and page-turn are gone; page keys differ.
6. **Music is fixed loops without the seeded motif variation** (music96:205-231), the title plays `dirge` instead of the slowed Moor tune (soundscape.gd:84), Hollow Wood/Root Deep get the wild cue where the browser (by its regex) played the deep one, and pause ducks to 55% instead of silence.
7. **The hero's shadow is a single flat shadow** (shadow70): no dither, the sun does not turn with the hour, braziers and campfires throw none (entities/sil_shadow.gd:43-58).
8. **Moonlit clearings are missing entirely** (zz_zz_moon86.js:13-57): no cool pools, motes, or the poise/life rest they give.
9. **No sky dial** (zz_polish.js:25-45): the game has no clock at all.
10. **Low-gauge alarms missing** (zz_polish.js:48-68): orbs and the poise/shard/wisp bars do not pulse when critical; only the numeral recolours (ui/bar.gd:282-291).
11. **Two attribute effects missing** (zz_polish.js:71-78): Essence no longer quickens casting (+6% at 40) and Vitality gives no life regen (+0.4/s at 40) — core/hero_stats.gd:147,185-201.
12. **Full (Shift) tooltips are thinner** (zz_ui_desc.js:296-341,402-449 vs ui/hud.gd:470-530): no two-column layout, no `now>next` merged numbers, no "Scales with" block, no wisp/skeleton cost lines; passives are not tagged "[Passive]" in their text (zz_passive_tag.js).
13. **Canopy dapple inverted** (world77:122-163 vs world/atmos.gd:219-224,343): the browser lays a dithered leaf-shadow over the ground; Godot adds bright patches instead.
14. **Godot-only balance layered on the ported numbers** (skills/animancer/base.gd:42,293-301; core/hero_stats.gd:97): WISP_NERF, BAL_COST/BAL_DMG and Mystic regen ×2 change what the browser tuned (fix88 ×1.2, v58 ×1.2 costs). Not a port error, but a parity break the `--nobal` flag hides.
15. **Small lines and tells lost**: the herd's one line (decor66:85-88), "ERRAND FULFILLED" banner and LEVEL banner (quests:328, polish:6-15), decor-kind landmark inscriptions "Luminous Caps"/"A Trunk-Relic" (voice MARKS:511-514), the amber stagger motes over reeling creatures (stagger_deep:59-72), tap-the-lantern to dim (study82:30-37), the wisp's second small light at its body (dark64:142).

Everything in Acts II–V (quests, towns, lairs, the four scripted bosses and their hazard system, Acts II–V cues, barks and inscriptions) is **LATER**: the Godot build is Act I; the data exported for those zones and kinds (voice.json, zone_lines.json, monsters.json qa_/qb_) is already in place.
