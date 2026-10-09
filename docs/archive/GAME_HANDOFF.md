# Godmarrow: the game handoff

For the session that builds the game. The PixelForge session builds the tool.
Everything Derek decided about the game on 2026-10-04 and 2026-10-05 is here, with the state of the work and where
to start. Nothing here is adopted until Derek says so in `docs/wiki/01-rules-and-decisions.md`.

## 1. The design

Godmarrow is an action role-playing game in the Diablo line whose melee already runs on souls-like rules. The
redesign deepens that melee toward the feel of Secret of Mana and Dark Souls and grows the genre layers toward
Diablo 2 and Path of Exile. Everything below starts from what the game is, with its numbers, taken from
`docs/wiki/04-systems-and-combat.md` and `14-mechanics-checklist.md` (sections 2, 3 and 6 there).

What the game already is, and keeps:
- Five orders, each with its own resource: the Hollow Mystic's Essence and a choir of wisps that fuel and shape his
  spells; the Ossuarch's Marrow; the Hemomancer's Vitae, where every skill costs life; the Shrine Keeper's Miasma,
  breathed in and out; the Empty Hand's hourglass of amber and black sand. Three trees each, Diablo 2 layout, rows at
  levels 1, 6, 12, 18, 24 and 30, synergies, a melee and a caster way through every order.
- **Power is gated by cost, never by timers.** There are no cooldowns anywhere. Melee costs poise for every order.
- **Poise is the stamina.** One pool: about 52 at level 1, regenerating 9 a second after a one-second delay; walking
  drains it slowly; rolls (34), heavy attacks (12 to 24), the finisher and every melee skill spend it; blows drain it.
  At zero the hero is stunned and rooted 0.9 s, refills in a burst to half, and cannot roll until it is full.
- **The melee string** (every order, built from the Empty Hand's moveset): cut, return cut, overhead finisher at 1.6x
  that lunges, costs 4 poise, freezes 0.07 s and staggers; the string resets after 0.8 s idle, a roll or a heavy.
  A plain swing costs 0.55 s over cast speed, with a 0.22 s swing pose. The Ossuarch's bone strikes ride either
  mouse button and cost poise.
- **The held heavy**: hold past 0.18 s to wind up, full at 0.75 s; the release lunges up to 0.9 yd, strikes 1.25x to
  2.0x damage and 2x to 3.5x poise damage, costs 12 to 24 poise; walking at 35 percent while charging; a roll cancels
  it; wands and thrown knives have none.
- **The roll**: 0.34 s at 8.5 yd/s toward the cursor with 0.3 s of invulnerability; cancels the heavy, the string and
  infusing; refused while stunned or until poise is full after a break. Block belongs to the Empty Hand's stances and
  to monsters with shields; the player has no generic block.
- **Monster poise, in the manner of Path of Exile 2**: high, refilled after 2.2 s without hits; a reel of 0.35 s
  (0.2 s for bosses) that breaks wind-ups and takes 1.25x damage, then 0.8 s of stagger, then a grace with no poise
  damage, so there is no stun-lock. A finishing blow on a reeling creature lands 2.2x, freezes 0.09 s, and returns
  resource and 20 poise, once per reel. A thin bone line under bosses and champions shows their poise giving way.
- **Hit-stop and shake** on heavies, finishers and slams only, 0.06 to 0.11 s; shake can be turned off. **No glows or
  effects on attacks and casts**: no swing arcs, no comet streaks, no glow on blood; only dark grit on the finisher.
- **Knockback**: the player is shoved 0.2 yd by heavy blows (over 12 percent of max life) or when stunned; a
  Bellwether charge throws him a yard and empties his poise; skills shove monsters by their own rules.
- The lantern that carries a soul, light as the measure of safety, the Tithed, the elegiac voice, the openness rule,
  the acts, the Reading, the Hollow Token respec.

## 2. What Mana and Dark Souls add to this melee

The souls-like frame is in place: a stamina that melee and rolls spend, a committed heavy, a roll with
invulnerability, a break that punishes. What the references add is the feel of each blow and the rhythm between blows.

- **Every blow gets a reaction.** Today only a reel at the poise threshold shows that a hit landed; ordinary hits
  pass through. Mana gives each hit a visible answer that leaves the monster's AI alone: a two- to three-frame flinch
  pose, a short push along the blow (a tunable fraction of a yard, scaled down for bosses), and a contact sound by
  armour type, all inside the existing grace rule so a pack cannot be stun-locked. The hero's string gains the same
  per-blow weight through its poses rather than through effects.
- **The rhythm of the string.** Mana's attack gauge, carried over as a percentage timer, would gate power by time,
  which the game forbids. Its purpose is carried instead by the string's windows: a swing taken inside the window
  after the previous one continues the string at full value; a swing taken early (before the swing pose ends)
  lands soft, at a tunable fraction; the finisher's window is the reward for patience. Those windows become data
  (`data/feel.json`) and are tuned so the string plays like Mana's full-gauge swings and Dark Souls' committed
  combos.
- **Charge levels on the heavy.** The held heavy already winds from 0.18 s to 0.75 s. Mana's weapon levels map onto
  it as three release points with their own multipliers and poses, each marked by the stance and a sound, with the
  top level costing the most poise.
- **Recovery that commits.** Each swing's recovery is explicit and data-driven: the string can be cancelled into a
  roll after the contact frame and at no other time; a heavy release finishes once it starts; casting leaves the
  string.
- **Telegraphs as data.** Monsters' wind-ups exist in the brain; their timings move to data per creature, the tell is
  the animation and a sound, and every attack leaves an opening after it, so the player's poise is spent on reading
  rather than on guessing.
- **The screen stays steady.** Hit-stop remains the heavy's and the finisher's; the per-blow weight comes from poses,
  push and sound.

## 3. The genre layers

The role-playing systems change how the swing plays rather than standing beside it.
- **Trees and synergies**: kept as built, with the planned twelve skills a tree; synergies that act on the string's
  windows, the heavy's levels, what a reel triggers, and each order's resource rhythm.
- **Items**: affixes, rarities, uniques and lantern perks exist; sockets, omen-words in the manner of runewords and
  charms are added; affixes act on the swing (push distance, poise damage, recovery, charge speed, the finishing
  blow's return).
- **Ailments**: chill, freeze, shatter, bleed, burn, poison and miasma exist as weapon and skill effects; they are
  tied to blows that land inside the string's windows and each shows in the creature's animation.
- **Difficulties**: resistance penalties and damage scaling exist; poise and telegraph timing scale with them.
- **The belt, the lantern as companion, the Reading, the respec**: kept.
- **Open questions for the redesign document**, decided with Derek before anything is built: a passive tree in the
  manner of Path of Exile, gem-and-link skills, an endgame loop in this world, and the figure height (heroes stand at
  195 px; Mana's smaller figures would make the art cheaper and crowds larger).

## 4. The order of building

Each step is a commit, the game plays after each, smoke errors 0, a scripted fight under xvfb with screenshots into
`docs/screens/combat/`. Headless running and the screenshot flags: `core/test_hooks.gd`, `docs/wiki/13-godot.md`,
`08-tech-and-build.md`. Read first: the wiki (`00`, `01`, `04`, the five `05-class-*`, `09`, `10`, `14`, `15`,
`16`), `docs/PLAN.md`, `data/*.json`, `core/combat.gd`, `core/hero_stats.gd`, `entities/hero.gd`,
`entities/ai/brain.gd`, `skills/skill_book.gd`, and the Empty Hand's moveset, which is the melee template.

1. **The redesign document**, `docs/REDESIGN.md`: sections 1 to 3 above with every current number beside its
   proposed value, the Mana and Dark Souls numbers measured from play, and the open questions. Shown to Derek first.
2. **Per-blow reactions**: flinch poses, push, contact sounds, inside the grace rule; `data/feel.json` created.
3. **String windows and recovery**: the early-swing fraction, the windows, the cancel rule, as data; tuned by play.
4. **Charge levels on the heavy**: three release points, poses and sounds, poise costs.
5. **Telegraph data per creature** and openings after attacks.
6. **The genre hooks**, one at a time: synergies on the swing, affixes on the swing, ailments on the windows,
   difficulties on poise and timing, then the open questions as decided.
7. **Clips for the swing** from PixelForge: flinch, wind-up, contact and recovery frames per attack and the three
   charge stances, a clip-mapping change in the shape rig.
Record the measured numbers and the before and after values in `docs/track_notes/combat_feel.md`; update the wiki's
`04` and `14`; HANDOFF §7.

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
- Weight is shown by poses, push, sound, and the heavy's and finisher's hit-stop; attacks and casts carry no glows or effects.
- The game plays at every commit; smoke errors 0 before every push.
