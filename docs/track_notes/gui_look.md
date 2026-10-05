# The Forge app's look: old-school dungeon text-adventure framing

Reference: `docs/refs/forge_gui_reference.png` (the owner: "i want the gui to look something like this with sweet
old school mystery dungeon bit style music"). What it is:

- A near-black screen with ONE palette: ink black and a pale bone-grey, nothing else (two or three tones at most;
  teal only for the focused control). The whole UI is 1-bit-ish pixel art: dithered shading, no gradients, no
  anti-aliasing, pixel fonts only.
- An ornate hand-drawn pixel border round everything: a thick frame with thorned/bony corner flourishes, the title in
  a blackletter-style pixel font on a banner at the top of the frame. Panels inside are framed the same way.
- A picture window in the upper part (in the reference, a dungeon corridor; for the Forge: the thing being made,
  the preview, or a dungeon-corridor idle scene on Home with the quest tiles as objects in it) drawn in the same
  1-bit dithered style.
- A text box below in a pixel serif, narrative tone ("two torches flicker on the far side of the room..."): the
  Forge's "what happens next" and the checks' notes are written and shown like this, as if a dungeon master were
  describing the step. Buttons are text in the same box, chosen with the d-pad or the mouse, the chosen one marked
  with a pixel cursor glyph (a sword, a hand), not a glowing rectangle.
- Transitions: a pixel dissolve or a torch-flicker fade. Cursor: a pixel hand or dagger.
- Music: "sweet old-school mystery-dungeon bit-style" chip music, looping, quiet: square/triangle leads over a soft
  minor progression, gentle arpeggios, a slow 90-110 bpm, Shiren/Mystery Dungeon and early Zelda-dungeon feel,
  warm not grim; make it with `music.py` (a new "forge" cue family, chiptune instruments: pulse 12.5/25/50%,
  triangle bass, noise percussion) and ship 2-3 loops (home, working, done) plus UI blips in the same voice.
- Still a tool: the picture window is where previews, frame strips, racks of knobs (drawn as pixel dials) and the
  drop target live; the text box is where the step's words and choices live. Full screen, integer scaled.

## Music reference (the owner's upload)

`docs/refs/forge_music_reference.mp3` (a Pixabay dungeon-synth track, reference only, not to ship). The owner:
"maybe not so distorted and some sparkly high notes but stuff like this". Measured: 107 s, loud for ambient
(RMS 0.13), very dark spectrum (median spectral centroid about 275 Hz: nearly all energy under 1 kHz), tonal centre
around C#, slow drifting pads with no real beat. So the Forge's music family is DUNGEON SYNTH, not chiptune:
- slow (60-80 bpm or free time), long detuned pad chords in C# minor / phrygian, a low drone, soft noise wash,
  plenty of hall reverb and a slow echo;
- cleaner than the reference: no distortion or clipping, the low end tidy (high-pass the pads at ~60 Hz), master
  RMS about 0.09 like the game's cues;
- the "sparkly high notes": a bell / music-box / glass-pluck voice (sine with a short bright attack, long decay,
  shimmer reverb) playing sparse pentatonic or minor-scale arpeggios and occasional high trills in the 1-4 kHz
  range, quiet, as the one bright thing over the dark pads, with the spectral centroid landing around 600-900 Hz
  overall;
- three loops (home, working, done) sharing one motif, 90-120 s, seamless, plus matching UI blips (a soft bell
  for confirm, a low thud for back).
Built in `music.py` as a "forge" cue family with its own instruments, rendered by the same path as the game's cues
(`pixelforge music forge_home` etc.), knobs on the music rack.

## Correction from the owner (2026-10-02): aesthetic, not quests

"We are keeping the gamified aesthetic. We don't necessarily need the quest thing; it's more the aesthetic of
PixelForge itself having that old-school Super Nintendo feel while being a highly technical program that is easy
for humans and for AIs in their own way."

So: drop the quest framing (no "quests", no progress strips dressed as level selects, no narrative hand-holding).
Keep the look and feel: full screen, integer-scaled pixel rendering, the 1-bit dungeon frame and pixel fonts, the
dungeon-synth music and bell/thud sounds, pixel cursor, gamepad and keyboard, transitions. Inside that skin the
Forge is a straightforward professional tool: Home with the nine things it makes as tiles; each one opens a
workbench with tabs; every workbench is picker / live preview / knobs / bottom bar (Keep, Reset, Start over,
Undo); Advanced is a fold, not a mode; text is adult and precise (docs/track_notes/tone.md). A person clicks
through it; an AI drives the same functions by CLI and MCP and never needs the window.

## Correction (2026-10-02): not 1-bit

"It doesn't have to be one bit. It can be more sophisticated than that." The reference image set the framing
(ornate pixel border, picture window above, text below, pixel fonts), not the colour budget. Use a full
16-bit-era palette: the game's own near-black, bone, iron and dull teal with a dull gold for warnings, dithered
gradients where they help, shaded frames with a lit edge, coloured icons on the tiles, live previews in full
colour. Think a polished SNES RPG menu or a late-'90s PC tool with a pixel skin, not a Game Boy.

## From the mockup round (2026-10-02)
Approved direction: the reference's framing (ornate pixel frame with thorned edges and skull corners, blackletter
banner, picture window above, text box with choices and dials below). Accent is NOT teal in the Forge app: use a
dull ember gold / bone for pointers and values (the game keeps teal for its own next-action; the Forge is warmer).
The app has its own ambient effects: torches that flicker (light pools breathing on the stone, flames that move),
motes drifting up, a faint glow under the thing on the bench, pixel-dissolve transitions; all respecting reduced
motion. Drag and drop stays: a picture dropped anywhere starts a build, and the frame answers while a file hovers
("A painting hovers over the bench. Let it fall...").

## Swappable backgrounds (2026-10-02)
The picture window shows the thing being made in a chosen pseudo-environment, switchable from the foot: dungeon,
crypt, moor, fen, snow, plain (neutral grey for colour checks), each with its own palette, light colour, floor
pattern, fog and torch count, all animated. Later: the game's own zones rendered as backdrops, and a "day/night"
hour knob, so a sprite is judged where it will live.

## Controls (2026-10-02)
Knobs are large and of the dungeon: iron levers in slotted brackets (value = handle height, a bone-and-gold grip),
valve wheels (value = spoke angle) for angles and directions, chain pulls or toggles for on/off; drawn in 2-px pixel
steps with a lit top edge and a dark cast; each with its name and its value under it in the text typeface; dragging a
lever makes an iron scrape, a wheel a ratchet tick; double-click resets. Smaller fine values live in the Advanced fold
as plain pixel sliders.

## Light comes from the flames (2026-10-02)
Every light in the picture window is anchored to a real flame: the torches' pools sit at the torch flames and breathe
with them, and the sprite's own emissives (a staff fire, an orb, glowing eyes, embers) cast their own coloured,
flickering light onto the backdrop and the floor. In the app this comes for free from the renderer: the shape
file marks emissive solids, and the preview reads their screen positions and colours as point lights.

## Scene light off; the character's own lights and colours are knobs (2026-10-02)
- A "scene light" lever on the picture window: off renders the sprite with only its own preset light (no torch
  tint, no fog, the plain ground), so colours are judged clean; on shows it as it would sit in the chosen place.
  Also "sprite lights only" (its own emissives light the backdrop, nothing else).
- On the character itself, everything that is a light or a colour is a control on the Materials tab: each material
  ramp (base hue, lightness, contrast, steps), each emissive (colour, strength, pulse rate, radius of the light it
  casts), the key light (direction, colour, strength), rim (colour, strength), ambient. Presets per game style;
  "Randomise within the preset" for variants; champion / unique recolours are saved alternate ramp sets on the same
  model. Every one is a field in the .shapes.json so the AI sets it the same way.

## Shaped glows (2026-10-02)
An emissive is not a dot with a halo; it has a shape and a behaviour chosen on the Materials tab. Glow kinds: flame
(a tongue that licks upward, flickers and sheds embers, its light pool warm and jittering), orb (a steady sphere with
a soft bloom and a slow pulse), eyes (two points with a thin trail when the head turns), runes (lit in sequence along
a path), crackle (lightning branches that re-draw each frame), smoke-lit (a haze that carries the colour), ember
(sparks drifting), beam. Each has knobs: height, width, speed, flicker, ember count, colour ramp, light radius and
how much it tints the model and the ground. The glow's shape also drives the light it casts: a flame lights above
itself more than below, an orb evenly. These are the same generators the effects workbench uses (vfx kinds),
attached to a solid, so a character's staff fire and a spell's fire are one thing.

Controls are drawn as true pixel art (a tiny canvas per control, scaled up crisp): iron bracket with a lit top-left
edge, a dark slot with ticks, rivets, a bar handle with a bone-gold grip; wheels with a dithered iron face, rim
rivets and a gold spoke. No CSS gradients or anti-aliasing anywhere in the app.

## Motion and sound discipline (2026-10-02)
The only animated interface element is the selector: a pixel-drawn arrow that nudges one pixel on a two-frame cycle.
Nothing else in the chrome moves (no hover glows, no sliding panels, no pulsing buttons); the ambient scene and the
sprite preview are the only other motion. Moving the selector plays a short square-wave cursor blip (higher for
right/down, lower for left/up, a two-note confirm on select), as SNES menus did; levers scrape, wheels tick. Volume
in Settings; silent when reduced motion or mute is set.

## Notes for later: Godmarrow's title screen (owner, 2026-10-02)
- "I really liked the old title screen we had of the face and the blood pool; mixing it with this style would be
  cool." The current Godmarrow title (ui/title.gd, shaders/title_blood.gdshader, title_breath.gdshader: the face
  and the blood pool) should be kept and placed inside this menu framing when the game's presentation is done:
  the face and pool as the picture window, the choices in the text box with the pixel selector and blip.
- "I like the tarot card idea; they didn't look great in the title screen, laid weird and were hard to select, but
  the idea was ace." Keep the cards (the Arcana: upright / reversed) as a mechanic and a motif; redo their layout:
  a clean fanned or ruled row in the text box area, large enough to read, one card per selector step, the selected
  card lifts one pixel with the blip, art on the cards drawn through the Forge's icon road in the game's palette.
  Mock it up first (docs/PLAN.md: mock first).

## From the mockup round 3 (2026-10-02)
Transitions are quick: the pixel dissolve is 4 steps each way at 24 fps (about a third of a second in all).
Selecting plays a quick falling "shrink" blip and the selector flashes white-to-gold for three frames. The Forge's
music plays in the app from the first interaction (a toggle in the title bar, volume in Settings): the dungeon-synth
family (docs/track_notes/gui_look.md, music reference), rendered by music.py; the mockup carries a procedural
in-browser stand-in (detuned pads in C# minor over a drone, breathing lowpass, sparse pentatonic bell sparkles
through a long reverb) that states the intent.

## The look pass (2026-10-05, track/look): higher fidelity, same design

The owner: "the theme of the entire forge is still that low pixel look, should be higher fidelity"; "the pixel look
is still too blocky"; "it's not clear what you can click or change, it's confusing to navigate or edit anything";
"make sure the look of the forge stays how I wanted it: the SNES look and interface, and readable". The design did
not change (the mockup `docs/mockups/forge_app_v8.html`, the reference `docs/refs/forge_gui_reference.png`); the
drawing did. Everything is drawn at the app's 640x360 logic resolution, one image pixel per logic pixel, integer
scaled on screen (2x at 1280x720 and 1366x768), in 16-bit-style ramps of seven tones; nothing is anti-aliased.

**The frame** (`forge/scripts/frame.gd`, one cached image per environment):
- carved stone bands in blocks of about 30 px with a lit top-left bevel, a dark foot, mortar joints, chips bitten
  from the corners, a wandering crack through a third of the blocks, grain speckle, moss in the lower joints (more
  near the floor), frost on the upper faces in the snow;
- an iron strap round the outside with a lit bead, a groove and rivets every 16 px; iron window rims three pixels
  thick with rivets every 24 px and corner plates; a dithered recess shadow inside each window so it reads as set in;
- sconces: two torches on the side bands, two candles on the bottom band. Their flames are real frames (eight,
  10 fps, `Frame.flame_frames`), and each flame re-shades the stone round it in dither at four levels
  (`Frame.light_patch`) so the light breathes with the flame; reduced motion holds frame 0 at level 2;
- a worn wooden sill under the text box (two planks, grain, knots, worn lighter in the middle, nails at the ends);
  the foot line sits on it;
- the banner's keystone: a carved plaque with a gold inlay line and studs, the title in blackletter at 36 px (the
  mockup's 48 css px in an 860 px frame) with a one-pixel dark edge;
- corner details: a skull on the top-left quoin, a moth top-right, a key on a nail bottom-left, a rat bottom-right;
  chains of three links hanging from rings on the four corner plates;
- per-environment materials: `Frame.ENV` gives each ground (dungeon, crypt, moor, fen, snow, plain) its own
  stone ramp, moss ramp and amount, and light colour; the scene-light lever still drives the picture window's light.
- **Anchors for effects**: `Frame.anchors()` names points in logic pixels (`torch_left`, `torch_right`,
  `candle_left`, `candle_right`, `brazier`, `banner`, `corner_tl..br`, `sill_left/right`, `chain_tl..br`,
  `drip_1..6` along the top band); `app.frame_anchors()` hands them out. Torches, braziers and drips land there.

**The controls** (`px.gd`, each a tiny canvas drawn at 1 px and shown at 2x): levers in iron bracket plates with a
dithered ramp, four rivets, a carved slot with a lit lower lip, a scale beside it, a gold-and-bone grip over an iron
bar; the three-stop lever with notches at its stops; toothed valve wheels (twelve teeth cut into the rim, a worn
face with a groove, four spokes, the gold one marking the angle, a hub); chain pulls (bracket, links, a wooden T-grip
with gold caps) that sway for a second after a pull; sliders as iron channels with a gold stud; the selector is a
16x14 dagger (gold pommel and guard, a wrapped grip, a steel blade) whose edge highlight moves on a two-frame
shimmer when it lands (`shimmer` in app.gd), with the old three-frame white flash on select.

**Affordances** (the second complaint):
- ember means clickable; bone or grey means a label. Every choice sits on a carved iron plaque with a lit top edge
  and a dark foot; the one in hand has a gold edge and a 1-px glow; pressed, the edges swap so it sinks. A cycler's
  name is grey, its `< value >` is ember on a plaque; hovering the value shows a caret box (it can be typed).
  Cards (Settings > Style) are ember too, the chosen one on a plaque.
- hover and pressed states on every control: a lever, wheel or pull lights its handle and gets a gold outline;
  a slider its track; a ramp swatch its outline; a tab sign lifts a pixel with a gold line; the title line's plates
  light gold and sink for a moment when clicked. The pointer is a pixel hand over anything clickable
  (`PX.cursor_hand`), a closed grab hand over anything dragged (`PX.cursor_grab`), an I-beam over a typable value.
- **the hint line** on the wooden sill names the thing in hand or under the pointer and how to change it
  ("size · drag up or down, scroll, or click the value to type"; "Keep · write this into the game";
  "Materials tab · LB and RB, Tab, or click"). Groups give it through `hint_of(i)`, controls through `how()`;
  `app.hover_hint(h)` sets it while the pointer rests and clears it back to the selection.
- **"?"**: a choice on every bench (and a plate on the title line) overlays labelled callouts: a tag by every group
  saying how it is worked, a tag over every lever, a legend of the keys. Any key or click closes it. It shows itself
  once the first time a bench opens (`help_seen` in the settings file; `--help` forces it; never under the test
  hooks).
- **breadcrumbs** on the title line: `< back` (always there, dull on Home), then the screens under this one as
  plates (each a click back to it), this screen and its tab in bone. The oldest crumbs drop when they would run
  into the keystone. `go_back_to(k)` is what a crumb does.
- the status words (project, style, Claude's state) moved to a dark ledger strip on the bottom band, between the
  candles, so the sill holds the hint whole; the ground picker stays on the sill's right.

**Readability**: VT323 at 16 px for the body and 12 px for names, values and the foot (the mockup's sizes in the
640 canvas; body never smaller); a one-pixel dark edge behind every light word that sits on stone or wood (the
banner, the title line, the sill, the status strip, the tab signs; `EdgedLabel`, `_edged`); checked at 1280x720
and 1366x768 (both 2x, the second letterboxed).

**Test hooks**: `--hover=x,y` (logic pixels) warps the mouse there 1.2 s in so a screenshot shows the hover
state (`docs/screens/forgeapp/hover_lever.png`); `look_before_after.png` and `look_vs_mockup.png` beside it.
Controls kept their sizes and positions; typed numbers and the mouse paths are unchanged (`test_editor.gd` 106,
`test_scene.gd` 21, `check_scripts.gd` 34/0).

### The three critique rounds (what read plain or unreadable, and what changed)

**Round 1** (the first sweep, 48 shots at 1280x720 and 1366x768): the Claude state on the title line ran into the
keystone on every bench (moved to the status strip on the bottom band); the status words squeezed the hint line to a
few characters ("Esc back · LB/RB" cut; "drop a painting :" cut), so the foot became two lines, the hint whole on the
sill; the Settings > Style cards and the Frames tab's frame numbers were bone though every one can be clicked (ember
now, the chosen one bright on a plaque); a cycler's name touched its value plaque ("glow< eyes >"; a 3-px gap now);
the editor shots came out empty because the editor's three-direction render takes longer than the 16 s wait under
load (24 s now). Pre-existing and left: the Materials tab is full and loses its choices line; the Reference tab's
checks line is cut at one line; the Interface Frames choices wrap to a second row that the box clips by two pixels.

**Round 2** (re-shots, the hover shot): the hover hint vanished a moment after the pointer landed, because the bench
rebuilt after its render and `set_hint` wrote the selection's words back (the pointer's words now persist through
rebuilds until it leaves: `hover_words`); the editor's tool names were bone (ember now); the hover shot shows the
lit lever, its gold outline and "size · drag up or down, scroll, or click the value to type" on the sill.

**Round 3** (the "?" overlay): the callouts drew once at the bench's opening and never followed the rebuilt bench
(no lever tags at all; `set_groups` redraws them now); the per-lever tags were wider than their columns and overlapped
("drag up or dow|drag up or dow"), so each control carries one word (drag / turn / pull / cycle) and one long tag under
the rack says the rest; the ground tag hid behind the key legend (it sits on the sill now, left of "ground"); the tabs
tag covered the Export sign (it sits on the picture window's foot now). `docs/screens/forgeapp/callouts.png` is the
result.
