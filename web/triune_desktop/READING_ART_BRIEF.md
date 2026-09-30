# Redraw the Reading (character creation) at the title screen's level

Root: /tmp/claude-0/-home-claude/97784205-80df-5ff9-af53-809f027ba14e/scratchpad/triune_desktop/
Your only file is `src/zz_art_reading.js`. Board id `reading`, order 8, name "Reading art". Follow /tmp/claude-0/-home-claude/97784205-80df-5ff9-af53-809f027ba14e/scratchpad/triune_desktop/MECH_BRIEF.md.

## The problem
The Reading scene (character creation) draws its art as sculpted 3D relief maps: `faPutG`, `faShade`, per-pixel normals, lighting from `faLum`, quantised into ramps by `faPixelize`. That is the "blocky 3D" look the user banned. Every figure in the scene has it: **the Hollow Seer** most of all, plus the god statues, the god-faces, the divining cards, the bone throws, and the chamber.

Compare:
- `/tmp/title_screen.png`: the target. Hand-drawn pixel art. The blood bowl, the weeping cathedral face, the candles, the flagstones. This is the bar.
- `/tmp/fate_intro.png`: the Reading now. The Seer looks 3D-rendered. Wrong.

## The job
Replace the Reading's art with hand-drawn pixel art in the title screen's style. It must sit BESIDE the title art without looking wrong.

**Look:**
- Chunky pixel art on an even grid, drawn shapes, hard-edged folds, big cloth panels, painted highlights.
- Muted, gritty palette, one bold saturated accent (blood crimson works for the Seer's stole and drips).
- Details drawn as PIXEL CLUSTERS, not as per-pixel normal maps: eyes as a few dark pixels; a beaded rosary as bright dots; lace as a texture stamp.
- One key light from the upper left, with rim light. NO per-pixel shading of ellipsoids.
- All animation is subtle: candles flicker, the Seer breathes, cloth sways. No 3D bones.

**Coverage.**
1. **The Hollow Seer.** The top priority. A tall starved old woman, hooded, veiled, empty sockets with soot tears, a gilt band with tin votives on her brow, a collar of finger bones, a crimson stole worked in gold, a rosary of knuckle bones. Two poses: hands laid on the table ("closed") and hands opened toward the seeker ("open"). Draw both.
2. **The chamber around her.** Extend the title screen's cathedral: the stone walls, hanging chains, candles, offering table. Look at `zp_title.js` for the title's chamber code to keep it consistent.
3. **The gods (FATE.stars).** Four idols the seeker looks up at when choosing a god:
    - **Oss-Vharoth, the Standing Dead** (Ossuarch): a skeleton idol that will not lie down, bone-white and cracked.
    - **Yh'Anuul, the Last Breath** (Animancer): a lantern-goddess wreathed in wisps.
    - **The Myriad** (Shrine Keeper): a many-faced idol of every stone and river.
    - **The corpse-god** (Hemomancer if that's how the Reading routes; check q_fate.js): the dead god itself, with a weeping heart.
   Each idol is a still pixel painting, about 200x300 art px.
4. **The god-faces (FATE.faces).** Three faces per god: small mask paintings, 96x96 each.
5. **The reading cards (FATE.cards).** Tarot-style cards drawn as pixel art, showing the card's icon.
6. **The bone throw (FATE.bones).** A dark table with cast bones, each bone hand-drawn.
7. **The other props.** The offering bowl, the candles, the chains, the sacrifices scene, the fears scene, the seeks scene.

## How to build it
- Wrap the existing `drawDivine` and its helpers so the sculpted art is replaced. The Reading's scene state (`G.divine`) and its logic (`divineAdvance`, `divineChoose`) stay intact.
- Draw with 2D canvas at the game's UI grid (480x270 logical). Anything you draw goes through the base game's crisp pixel scaling. Do NOT set imageSmoothingEnabled = true anywhere.
- Cache each painting as an offscreen canvas the first time it's needed. Building all the paintings must not stall the game: bake them one at a time on frame budgets, like the base `faPump`.
- Palette: reuse the title's palette. Read the constants at the top of `zp_title.js` and match them.
- Bake to a native art-pixel grid (e.g. 240x135 for the whole scene, or per-figure sheets), then let the scaling do its job.
- Every figure is DRAWN pixel by pixel by you. Do not call any function that lights an ellipsoid, extrudes a slab, or quantises a normal map. If you find yourself writing `faShade`, `faLum`, `faPutG` in your file, stop and draw with plain `fillRect` on the offscreen canvas instead.
- No 3D lighting; no calculated per-pixel shading. Values are drawn.

## Test
- Build with `bash build_x.sh /tmp/reading.html` (SYNTAX OK).
- Screenshot the Reading at 1920x1080 at each scene: intro, cards, cardsDone, bones, star, starDone, face, sacrifices, fears, seeks, ask, end. `G.divine.scene = '<name>'` sets it. Look at every screenshot yourself with the Read tool.
- Compare each to `/tmp/title_screen.png`. If a screenshot looks 3D anywhere, redraw the offending piece.
- Screenshots go in `/tmp/reading_shots/` and one comparison to the board.

## Live board
Load ArtifactData with ToolSearch "select:ArtifactData". Post at start and after every step, with snapshots. URL: https://claude.ai/artifact/JeDyFJtvPeaMm4HhRHUVkW.

## Final message
List every figure you drew, the screenshot paths, honest weak spots, and any base-file change that would help.
