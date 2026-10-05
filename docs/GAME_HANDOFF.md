# Godmarrow: the game handoff

For the session that takes over the game. The PixelForge session no longer works on Godmarrow; it builds the tool.
Everything Derek decided about the game on 2026-10-04 and 2026-10-05 is here, with the state of the work and where
to start. Nothing here is adopted until Derek says so in `docs/wiki/01-rules-and-decisions.md`.

## 1. Derek's decisions (condensed from his words)

1. The game is Godmarrow, in Godot, with its existing acts, classes, skill trees, loot, codex and music. The two
   problems are that it does not look finished and does not feel good to play.
2. **Combat: Secret of Mana's melee, because it is souls-like.** Deliberate, weighty, committed swings with real
   recovery; a charge gauge that recovers after each swing and scales damage by percentage; held charge levels; hit-stop
   on contact; knockback and stagger on the existing poise system; a short silent invulnerability window after a hit;
   enemy telegraphs as animation and sound; attack-cancel rules; the ring menu as the pause menu. Right-click casting
   and the skill trees stay as built. **No flashing or visual noise of any kind**: no invulnerability blink, no weapon
   glow per charge level, no screen flash, no flashing telegraph markers. The wiki's rule that nothing flashes stands.
3. **Systems: Diablo 2 and Path of Exile ARPG**, judged one by one against what Godmarrow has: skill synergies and
   breakpoints, item affixes, uniques, sockets, charms, difficulties, flasks or potions, ailments, companions, an
   endgame loop. Keep, change, add or cut each with a reason. A passive tree and gem links are open questions.
4. Godmarrow's own designs stay: the five classes and their cults, the lantern, poise, light as danger, the Tithed,
   the elegiac voice, the openness rule.
5. The lore is being rewritten by another session (`docs/codex/LORE_REWRITE_GUIDE.md` on branch `track/codex`).
6. Diablo 2 is NOT a base and not a priority ("fuck Diablo 2 then"). The bridge below exists because it was finished;
   use it only if Derek asks to see a sprite in that game.
7. Secret of Mana's ROM is not a base either; its systems and numbers are read as a specification and rebuilt in
   Godot.

## 2. State of the work

- **Combat-feel pass**: started on branch `track/combat` and stopped by Derek before anything was committed; the
  branch is empty beyond main. The brief is in §4 and is still the right first job.
- **Redesign document**: started on branch `track/redesign` and stopped before commit; branch empty. The brief is §3.
- **Diablo 2 bridge**: finished and merged to main (`tools/pixelforge/pixelforge/d2/`, 25 tests). §5 says how it works.
- **The art tool**: PixelForge is the other session's job. The game consumes its exports: `art/sprites/<kind>.*`,
  `art/sprites/skins.json`, `audio/music/`, effects sheets. Do not edit `tools/pixelforge`.
- **Figure height**: heroes render at 195 px (the `godmarrow` preset). Derek has not decided whether to go smaller
  (Mana's scale would make the art cheaper); raise it as a decision with a mock, do not change it alone.

## 3. The redesign document (to write first, show Derek, then build)

Write `docs/REDESIGN.md` as a product design document: (1) what Godmarrow is and keeps; (2) combat feel from Mana as
systems with numbers and Godot touch-points, current value against proposed; (3) the ARPG systems from Diablo 2 and
Path of Exile, each keep/change/add/cut with reasons; (4) the character-scale decision with trade-offs; (5) a build
order that keeps the game playable at every step, each job with files and verification; (6) open decisions for Derek.
Read first: the wiki (`00`, `01`, `04`, the five `05-class-*`, `09`, `10`, `14`, `15`, `16`), `docs/PLAN.md`,
`data/*.json`, `core/combat.gd`, `core/hero_stats.gd`, `entities/hero.gd`, `entities/ai/brain.gd`,
`skills/skill_book.gd`. Research the three references with their wikis and frame-data posts; take numbers. Under
9,000 words, plain prose with tables, no history, no banned words.

## 4. The combat-feel pass (the first build)

Every tunable in `data/feel.json`; nothing hard-coded. Each item a commit; the game playable after each; smoke errors 0
(`core/test_hooks.gd`; see `docs/wiki/13-godot.md` and `08-tech-and-build.md` for the headless run and the screenshot
flags); a scripted fight under xvfb with screenshots into `docs/screens/combat/`.
1. The charge gauge: drops to zero after a basic attack, recovers over a tunable time (Mana: about one second at
   base, modified by attack speed); early attacks scale by a tunable curve; full at 100 percent. A thin bar in the
   HUD's existing style. Casting never spends it; heavy attacks need it full.
2. Held charge levels (3 by default, tunable hold times) folded into the existing `heavy_pm`; stronger blow, longer
   hit-stop, wider knockback; shown only by the stance (a drawn-back or held frame) and a sound. Per-class
   multipliers in `data/classes.json`.
3. Hit-stop: a per-entity freeze on contact by hit weight (light 2 frames, full 4, charged 6 to 8 at 60 fps), not a
   tree pause; small camera shake on charged or heavy hits only.
4. Knockback and stagger on poise: every hit pushes a tunable distance along the blow; flinch below a threshold;
   knockdown on a break; bosses resist by a factor; the hero takes knockback from heavy enemy blows.
5. Invulnerability after a hit: a short silent window (at most the hero's rim light dimming). Telegraphs: the brain's
   wind-ups made data-driven, the tell is the animation and a sound.
6. Attack cancel: a basic attack cancels into a dodge after its hit frame, never before; casting cannot cancel a
   charged release once started.
7. The ring menu: the pause menu as a ring around the hero, pausing the world, the existing panels as its pages,
   keyboard, mouse and gamepad, in the game's iron-bone-ember style.
Write the adopted Mana numbers and the before/after values into `docs/track_notes/combat_feel.md`; update the wiki's
`04` and `14`; HANDOFF §7.

## 5. The Diablo 2 bridge (how it works; use only if asked)

`pixelforge d2 ...` on the command line, `d2_*` tools on the MCP server, and the Characters bench's tool list.
Blizzard's files live only in a local reference folder (`~/PixelForge Reference/d2`, or `PIXELFORGE_D2_DIR`); every
writer refuses the repository tree.
- `d2 doctor`: the game folder, the extractor, the reference folder and the tools on this computer, in plain words.
- `d2 fetch-tools`: Ladik's MPQ Editor (Windows) and `d2animdata`. Resurrected's CASC is extracted by hand with CascView.
- `d2 list`: the tokens, palettes and tables the install has.
- `d2 import --token NE --out DIR`: one token's sprites (DCC/DC6 through the COFs and the act palette) into our
  frames layout (`frames/<clip>_<DIR>/frame_NNN.png` + `animations.json`), outside the repository; opens on the
  Characters bench and in the editor like any frames.
- `d2 measure FRAMES... [--md docs/track_notes/d2_measure.md] [--write-preset godmarrow]`: heights, frames a clip,
  speeds, directions, palette use, outline and shadow conventions; `--write-preset` lays the measured values over a
  look preset in `assets/styles/overrides.json` (never without the flag).
- `d2 export-mod --character NAME --as NE --mod NAME --out GAMEDIR`: our frames quantised to the act palette (with a
  colour-loss report), encoded to DCC (or `--dc6`), a COF per mode with our fps mapped to their speeds, `AnimData.d2`,
  the `-direct` or `-mod` folder layout, read back whole by the validator. Targets: replace a character token; add a
  monster skin (`--name`).
- `d2 play --character NAME [--as NE] [--yes]`: finds the install (settings, registry, the usual folders), builds the
  mod into it, writes a launch shortcut with the flags, starts the game; asks first.
- `d2 port-skills --class KEEPER`: the Shrine Keeper's first three skills as `Skills.txt`/`SkillDesc.txt` rows on the
  nearest Diablo templates (Poison Dagger, Holy Fire, Plague Javelin). Groundwork only; new logic needs a code
  framework such as D2MOO and is not recommended.
Unproven on a real install (none here); the first run is on Derek's PC with his local Claude Code present.

## 6. Rules for the session

- Every commit ends with the attribution footer used in this repository's recent commits. No model names in content.
- Banned words (the Words section of `01-rules-and-decisions.md`): rot, cell, virus, DNA, organism, biology,
  cooldown, dps, proc, aggro, loot (in text), buff, nerf, stun, lightning, mana; "Bleeding Maiden", never "Weeping".
- Nothing flashes.
- Keep the game playable at every commit; smoke errors 0 before every push.
