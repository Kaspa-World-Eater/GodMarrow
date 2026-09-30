# Triune desktop fork: shared brief for the mechanics, skills and UI agents

Root: /tmp/claude-0/-home-claude/97784205-80df-5ff9-af53-809f027ba14e/scratchpad/triune_desktop/
The game is v0.40, forked as a desktop-only game (Windows and Steam Deck). The code is in src/, and it builds into one HTML page.

## Hard rules
1. **Only touch your own file(s):** `src/zz_<yours>.js`, named in your task. Never edit any other file in src/.
   - Change behaviour by wrapping or overriding: reassign global functions, `Object.assign` onto `SK[id]` entries, wrap draw functions, and so on. Everything runs in one closure, so the base game's top-level names are in scope.
   - Files load in sorted order after the base game (zz_polish.js last), so your wrappers run on top of the base.
   - If something truly can't be done from your own file, stop and say so in your final message. Do not edit the base.
2. **Build privately:** `bash build_x.sh /tmp/<your id>.html`. It must print SYNTAX OK.
3. **Test:** `cd ../spiritmancer && HTML=/tmp/<your id>.html node smoke32.js`. It must print `ERRS none`. Also write your own Playwright checks for your feature; copy the start flow from smoke32.js.
   - Screenshot your work at 1920x1080 and look at the screenshots with the Read tool.
   - Never kill processes you didn't start.
4. **Other agents work in parallel on other files.** Don't depend on their changes. Wrap functions defensively: call the original and keep its return value.
5. **Skills are logic-checked:**
   - Nothing may need something the player can't have yet (e.g. a skeleton burst at level 1 with no skeletons).
   - No minions at level 1 without a point in the skill.
   - No cooldowns on skills.
   - Tarot/arcana cards never give +skill levels.
   - Resource costs must match the class's resource model.
6. **No lightning** anywhere in new skills or effects.
7. **Poise works as stamina:** penalties only start to stack below 10%, and there is never a lockout. At zero poise you can still attack, but it feels heavier. Don't break this.
8. **Lore names:**
   - Weaver of Mirrors = code class `animancer`
   - Ossuarch = `ossumancer`
   - Hemomancer = `hemomancer`, penitent of the **Bleeding Maiden** (not the Weeping Maiden)
   - Shrine Keeper = `miasmancer`
   - Kusho = `monk`
9. **Keep the v0.40 classes, trees, UI style and progression.** Improve them; don't replace them.
10. **Do not touch hero art or sprites.** Another artist owns those.

## Class docs
They are useful for intent. Read them with the Projects tool (load it via ToolSearch if needed); the path is in your task. The code's SK table (src/c_game.js and the class files) is what is actually in the game.

## Live board, required
The user watches https://claude.ai/artifact/JeDyFJtvPeaMm4HhRHUVkW. Load ArtifactData with ToolSearch "select:ArtifactData".
- **At the start:** write `agents/<your id>` {order, name, role, status:"running", task, step, updatedAt} with `set` (it's a new doc), plus `log/<id>-<epoch ms>` {t, who, text}.
- **Roughly every 10-15 minutes, and after each milestone:**
  - Update `agents/<id>` {step, updatedAt}. `get` it first, then pass `if_version`.
  - Add one log line.
  - When you have something visible, upload a 1920x1080 screenshot (PNG under 2 MB) with the Artifact tool (url = the board, asset:true, file_path). Then write `snaps/<id>-<epoch ms>` {t, agent:<id>, who, caption, url:"/_blob/<id>"}.
- **When finished,** set status "done" (or "failed").
- Get epoch ms with `date +%s%3N`. Write in plain words and keep it short.

## Final message
List:
- what you changed, with file and functions
- how you tested it
- anything that needs a base-file change
- any balance numbers you chose, with the reasoning
- weak spots
