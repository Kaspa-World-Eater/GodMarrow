# HUD critique and fix (board: hud)

Screens: `scratchpad/hud/before/` and `scratchpad/hud/after/`. They cover every class at 1920x1080 and 1280x800, in three states:
- `_start`: the start-up banner and helper line
- `_idle`: out of combat
- `_low`: in combat with low life and low resource

`board_compare.png` puts the before and after bars side by side.
Code: `src/zz_ui_hud.js`. It wraps `drawHud`, `say` and `banner`, and adds a second resize handler.

## Before, compared with Diablo 2 Resurrected

D2R's bar has large orbs at the ends and one belt in the middle. The skill buttons sit next to the orbs and the menu is a small panel of icons. Numbers show on the orbs, and everything is centered on one line.

- **Alignment:**
  - The orbs were centered on the panel's lower edge, so their bottom 3 px (about 12 px on screen) were cut off.
  - Each group sat on a different baseline:
    - skill slots at y+8
    - belt at y+8
    - text buttons at y+3 and y+16
    - labels at y+26
  - The monk's weight bar ran 2 px into the first belt slot, and its HEAVY label overlapped the slot.
- **Spacing:**
  - The menu was two rows of text buttons of different widths (INV, CHAR, SKILL, MAP, then 2 to 4 more). Button widths followed the text, so the rows did not line up, and the Weaver's second row reached the right skill slot.
  - This was the main source of clutter.
- **Overlaps:**
  - Belt numbers ("1" to "4") were full-size text drawn over the potion icons.
  - The XP bar was drawn over the iron studs of the trim. It was 3 px of gold on a busy row and could not be seen at 0%.
- **Text size and readability:** every label was 8 px Silkscreen at 4x. That is readable, but lines like "34/35 SHARDS LV 30" used the whole gauge width. The orbs had no numbers, so you had to hover to read your life.
- **Fonts:** Silkscreen was used for labels and IM Fell for banners. That is consistent, but there was no small face for counts, so stack counts and keys were as large as labels.
- **Orb readability:**
  - The liquid was clear but the orbs were partly clipped and had no value on them.
  - The Hemomancer's Vitae orb is the same red as her life orb, and nothing on the bar says that her skills cost life.
- **Skill slots:** there was no key bind and no cost. D2R shows the hotkey on the icon. Costs only appeared in the tooltip.
- **Class resources:**
  - Ossuarch: marrow was a 1 px line under the shard bar, with no label, and could not be told apart from it. Only the tooltip explained it.
  - Hemomancer: the brood was text only. Life cost was not shown anywhere on the bar.
  - Shrine Keeper: the omen skulls were fine. The miasma orb had no number.
  - Kusho: the weight bar was good, but its labels ran into the belt.
- **Helper text and banners:**
  - The zone banner ("ASHEN MOOR") was a full-width dark band across the middle of the screen, right over the hero, for 3 s.
  - The "Test character: level 30, 120 skill points..." line stayed for 4 s over the lower play area with no backing plate.
- **Steam Deck (1280x800):**
  - `fit()` rounds the scale down to a whole number, so 2.67x became 2x. The game drew at 960x540 with 160 px black borders on each side and 130 px above and below.
  - Every piece of HUD text was 16 px on screen. That was the worst readability problem in the game.

## After

The bar is laid out on a fixed grid, and everything sits on the bar's center line (y+17).

| Section | x (logical 480 px) |
|---|---|
| Life orb | 0 to 44 |
| Left skill | 46 to 64 |
| Class gauges | 68 to 184 |
| Belt | 188 to 264 |
| Menu icons | 268 to 412 (centered) |
| Right skill | 416 to 434 |
| Resource orb | 436 to 480 |

- **Orbs:**
  - Moved up 3 px so the cage is fully on screen.
  - The current value is written in the glass and turns pale when under 25%. zz_polish still pulses the rim at that level.
  - The tooltip gives current / max.
- **Skill slots:**
  - The bound key is shown top-left in gold.
  - The cost is shown bottom-right in the resource's color:
    - Essence in blue
    - Miasma in violet
    - life % in red for the Hemomancer
    - shards in bone white
    - poise in green
  - When the Essence or Miasma can't pay, the icon gets a dark red wash and the cost turns red. Life and poise costs never lock a skill out, so they are never washed.
- **XP bar:** a thin gold rule along the top of the panel, with tick marks every 10%. Hovering it shows the level and XP.
- **Class gauges:** the poise bar is on top. Below it is the class gauge, then one row of labels in a small 3x5 pixel face.
  - Weaver: wisp pips and WISPS n/cap (+held).
  - Ossuarch: two separate readouts.
    - Shards: the white bar, labeled SHARDS n/cap.
    - Marrow: an amber bar with one tick per skeleton's cost, labeled MARROW n/cap, with its own tooltip.
  - Hemomancer: brood pips and BROOD n/max, plus a "SKILLS COST LIFE" reminder. Each slot shows its life %.
  - Shrine Keeper: the omen skulls and OMENS n/3. IN MIASMA shows while you stand in it.
  - Kusho: the weight bar is clipped to the gauge block, with LIGHT, the weight and HEAVY in the small face.
- **Belt:** recessed wells. The key number and stack count are in the small face, so they no longer cover the potion. There is a tooltip.
- **Menu:** one row of 16 px carved studs with pixel icons:
  - satchel, helm, book, map
  - the class panel: wisps, golem, skull or heart
  - a card with the inverted triangle, and the menu bars
  
  The open panel's stud is lit gold. A gold pip marks unspent points. The tooltip gives the name, the key, and how many points are left to spend.
- **Level:** "LV 30" is no longer on the bar. D2R doesn't show it either. It is in the XP bar tooltip.
- **Banners:**
  - Zone and boss banners now sit in the upper third (y 31 to 53), on a band that fades at both ends, so they no longer cover the hero.
  - Banners with no set duration last 2.6 s instead of 3 s.
  - The helper line sits on a dark plate just above the bar, and the test-character line lasts 2.5 s.
- **Steam Deck:**
  - A whole-number scale is kept only when it wastes under 10%. Otherwise the 1920x1080 canvas is scaled to fit and smoothed, so at 1280x800 it shows at 1280x720.
  - 1920x1080 is unchanged: 4x, pixelated.

## Notes
- The base `drawHud` still runs, clipped away from the bar, so other boards' wrappers and the top-left status lines keep working. Its bar buttons and bar tooltips are dropped and replaced.
- zz_polish's warning boxes for low poise, low shards and low wisps draw at fixed spots. The poise bar and the shard and wisp gauges were kept at exactly those spots so the boxes still frame them. The poise box reaches 2 px into belt slot 1, which can only be fixed in zz_polish.
- Not changed:
  - tooltips and skill descriptions (another board owns them)
  - the top-left status lines (buffs, golem, class states)
  - the hover name plate
  - the boss bar
