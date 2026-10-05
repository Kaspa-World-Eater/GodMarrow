# Godmarrow: the game handoff

For the session that builds the game. The PixelForge session builds the tool.
Everything Derek decided about the game on 2026-10-04 and 2026-10-05 is here, with the state of the work and where
to start. Nothing here is adopted until Derek says so in `docs/wiki/01-rules-and-decisions.md`.

## 1. The design

Godmarrow is an action role-playing game in the Diablo line, played with a souls-like swing. The breadth comes from
the genre: five classes with deep skill trees, hundreds of item affixes, crowds, loot, difficulties, builds. The
weight comes from the melee of Secret of Mana and Dark Souls: every swing has a wind-up, a contact frame and a
recovery, and timing is what the player is always doing, whatever the build.

The game keeps everything that makes it Godmarrow: the five classes and their cults, the lantern that carries a soul,
poise, light as the measure of safety, the Tithed, the elegiac voice, the openness rule, the acts. It is built in
Godot on the code that exists.

## 2. The swing

Five systems carry the feel. Every value lives in `data/feel.json` so it can be tuned by hand.

**The charge gauge.** A basic attack empties the gauge; it refills over about one second at base, faster with attack
speed. A swing taken early lands soft, scaled by the percentage on a tunable curve. A swing taken at full lands hard,
with its full hit-stop and knockback. Holding the attack past full charges levels, three by default with tunable hold
times, and the release is a committed blow: more poise damage, longer hit-stop, wider knockback, a drawn-back stance
and a sound to mark it. Right-click casting runs beside the gauge and leaves it untouched, so spells keep the genre's
pace. Heavy attacks require a full gauge.

**Poise as the shared currency.** Every hit does poise damage before anything else. An enemy below its threshold
flinches; an enemy at zero is knocked down. The hero has the same rules and takes knockback from heavy enemy blows.
Bosses resist knockback by a factor and are beaten by breaking their poise. A charged blow is the fastest way to a
break, which is the reward for commitment.

**Hit-stop and weight.** Contact freezes the hero and the struck enemy for a few frames by hit weight: two for a
light blow, four for a full one, six to eight for a charged release, at sixty frames a second. The freeze is per
entity, so the world keeps moving. The camera shakes a little on charged and heavy hits. Sound and the animation's
contact pose do the rest.

**Telegraphs, openings and cancels.** Enemies wind up through their animation and a sound, with a data-driven timing
per creature, and leave an opening after each swing. Packs take turns through the AI's attack tokens, so a crowd reads
as a sequence of threats. The hero's basic attack can be cancelled into a dodge after its contact frame. A charged
release, once started, finishes. A hit on the hero opens a short, silent invulnerability window, shown at most by the
hero's rim light dimming.

**The ring menu.** The pause menu is a ring around the hero: inventory, skills, journal, settings as its pages, the
world paused while it is open, driven by keyboard, mouse or gamepad, drawn in the game's iron, bone and ember.

## 3. The genre layers

The role-playing systems change how the swing plays rather than standing beside it.

- **Skill trees and synergies.** The trees stay as built. Synergies and breakpoints are added so that points change
  the gauge's refill, what a charged release does, what a stagger triggers, how a class's heavy differs.
- **Items.** Affixes, rarities and uniques exist; sockets, omen-words in the manner of runewords, and charms are
  added. Affixes act on the swing: hit-stop, knockback distance, poise damage, recovery time, charge speed.
- **Ailments.** Chill, freeze, shatter, bleed and miasma land on hits that connect at full charge, and each has a
  tell in the creature's animation.
- **Difficulties, flasks and potions, a companion.** Difficulties scale poise and telegraph timing as well as damage.
  The belt stays. The lantern is the companion, with the soul's choices as its growth.
- **Open questions for the redesign document**, decided with Derek before they are built: a passive tree, gem-and-link
  skills, an endgame loop in this world, and the figure height, where a smaller figure in the manner of Mana would make
  the art cheaper and the crowds larger.

## 4. The order of building

Each step is a commit, the game plays after each, smoke errors 0, a scripted fight under xvfb with screenshots into
`docs/screens/combat/`. Headless running and the screenshot flags: `core/test_hooks.gd`, `docs/wiki/13-godot.md`,
`08-tech-and-build.md`. Read first: the wiki (`00`, `01`, `04`, the five `05-class-*`, `09`, `10`, `14`, `15`,
`16`), `docs/PLAN.md`, `data/*.json`, `core/combat.gd`, `core/hero_stats.gd`, `entities/hero.gd`,
`entities/ai/brain.gd`, `skills/skill_book.gd`.

1. **The redesign document**, `docs/REDESIGN.md`: sections 1 to 3 above expanded with numbers taken from Mana,
   Diablo 2 and Path of Exile, current Godmarrow values beside proposed ones, and the open questions. Shown to Derek
   before building.
2. **The charge gauge and hit-stop.** One day's work that changes everything's feel. HUD bar in the existing style.
3. **Knockback and stagger on poise**, hero and enemy, bosses resisting.
4. **Telegraphs, openings and cancel rules**, data-driven per creature.
5. **The ring menu.**
6. **The genre hooks**, one at a time: synergies and breakpoints; affixes on the swing; ailments; difficulties on
   poise and timing; then the open questions as decided.
7. **Clips for the swing** from PixelForge: wind-up, contact and recovery frames per attack and a held-charge pose,
   a clip-mapping change in the shape rig.
Record the Mana numbers adopted and the before and after values in `docs/track_notes/combat_feel.md`; update the
wiki's `04` and `14`; HANDOFF §7.

The lore rewrite runs in its own session from `docs/codex/LORE_REWRITE_GUIDE.md` on branch `track/codex`. PixelForge
is the other session's job; the game consumes its exports (`art/sprites/<kind>.*`, `art/sprites/skins.json`,
`audio/music/`, effects sheets).

## 5. The Diablo 2 bridge

`pixelforge d2 ...` on the command line, `d2_*` tools on the MCP server, and the Characters bench's tool list.
A testbed for seeing a Godmarrow sprite inside Diablo 2. Blizzard's files live in a local reference folder (`~/PixelForge Reference/d2`, or `PIXELFORGE_D2_DIR`); every
writer refuses the repository tree.
- `d2 doctor`: the game folder, the extractor, the reference folder and the tools on this computer, in plain words.
- `d2 fetch-tools`: Ladik's MPQ Editor (Windows) and `d2animdata`. Resurrected's CASC is extracted by hand with CascView.
- `d2 list`: the tokens, palettes and tables the install has.
- `d2 import --token NE --out DIR`: one token's sprites (DCC/DC6 through the COFs and the act palette) into our
  frames layout (`frames/<clip>_<DIR>/frame_NNN.png` + `animations.json`), outside the repository; opens on the
  Characters bench and in the editor like any frames.
- `d2 measure FRAMES... [--md docs/track_notes/d2_measure.md] [--write-preset godmarrow]`: heights, frames a clip,
  speeds, directions, palette use, outline and shadow conventions; `--write-preset` lays the measured values over a
  look preset in `assets/styles/overrides.json` when the flag is given.
- `d2 export-mod --character NAME --as NE --mod NAME --out GAMEDIR`: our frames quantised to the act palette (with a
  colour-loss report), encoded to DCC (or `--dc6`), a COF per mode with our fps mapped to their speeds, `AnimData.d2`,
  the `-direct` or `-mod` folder layout, read back whole by the validator. Targets: replace a character token; add a
  monster skin (`--name`).
- `d2 play --character NAME [--as NE] [--yes]`: finds the install (settings, registry, the usual folders), builds the
  mod into it, writes a launch shortcut with the flags, starts the game; asks first.
- `d2 port-skills --class KEEPER`: the Shrine Keeper's first three skills as `Skills.txt`/`SkillDesc.txt` rows on the
  nearest Diablo templates (Poison Dagger, Holy Fire, Plague Javelin). Groundwork for data-level ports; new game logic belongs in Godot.
Unproven on a real install (none here); the first run is on Derek's PC with his local Claude Code present.

## 6. Rules for the session

- Every commit ends with the attribution footer used in this repository's recent commits; content names no models.
- The Words section of `01-rules-and-decisions.md` governs vocabulary; the Hemomancer's goddess is the Bleeding Maiden.
- Weight is shown by hit-stop, sound, shake on heavy hits and animation poses; the screen stays steady.
- The game plays at every commit; smoke errors 0 before every push.
