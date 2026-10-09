# Chapter 12: cinematography, atmosphere and wonder (caves, ancient temples) (2026-10-09)

Derek, 2026-10-09, on the opening cave:
- "The cave looks too blocks not enough painted look, lacks fine details is too brightly lit. The floor and walls
  aren't rough enough, I don't see the faces, it doesn't give mystical ancient and forlorn vibes."
- "There's no cinematography. No. Ambiance. It doesn't inspire wonder."
- "The basalt is too uniform."
- "Study cinematography again, setting atmosphere, caves, ancient fantasy temples etc."
- "Add it to the rules why it's important."
- "The throne sucks too. Add some mirrors as well."

An earlier round of study (1917, INSIDE, Hyper Light Drifter) left only links in `docs/wiki/10-study-great-games.md`
and six lines in `docs/wiki/06-art-direction.md`. This chapter is the full study, with the recipes for our road.

**The second, deeper round** (the same day) is `tools/art_study/private/cinematography_research.md`: Gurney, Bacher,
Caravaggio, Rembrandt, La Tour, Wright of Derby, John Martin, Piranesi, Alton, Deakins, Storaro, Blaschke, McCurdy,
Palermo, Diablo, Darkest Dungeon, Blasphemous, Hollow Knight, Playdead, Miyazaki's reveals, Hades, Disney's lures,
Burke, Kant, Friedrich, saint11 and Slynyrd, with every quote, its source, and what could not be verified. **Its rules
are bound in their own chapter of the rules, `docs/CINEMATOGRAPHY.md`,** and checked on every render by
`tools/landkit3d/cine_check.py`.

**Its key finding for us:** an isometric camera is orthographic, so nothing shrinks with distance and no lines
converge, and the fog ban takes away haze. Three of the strongest depth cues are gone. What carries depth here is
overlap, height in the frame, shadows (cast and contact), value stepped by falloff, rims, colour temperature and known
scale. Alton's law becomes ours: "The spot which should appear to be the most distant should be the lightest," so the
near band is darkest and the far feature or opening is lit.

## 0. Why it matters (the reason in the rules)

The player never reads a frame the way we grade it. They feel it before they see it.
- **Cinematography decides what the feeling is:** where the eye goes first, what is hidden, how big the place is, how
  old, how alone.
- **A scene can have perfect form and material and still be dead,** if light falls evenly on everything. That was the
  cave at pass 4:
  - every column the same size, tone and light, so nothing leads the eye;
  - nothing withheld, so there is no mystery;
  - no visible source, so the light is no one's.
- **Wonder is not detail.** It is scale shown against something small, the unknown kept in the dark, and one thing lit
  so the eye goes there and the mind fills in the rest.
- **Our camera is fixed** (Diablo II's iso, one zoom), so we cannot cut, dolly or choose a lens. **The set and the light
  must do all the composing** that a cinematographer does with the camera. Every room is designed as a sequence of
  frames the player walks through.

## 1. What the masters do

**Roger Deakins** (No Country for Old Men, Blade Runner 2049, 1917):
- **Motivated light only:** every light has a source in the world (a window, a lamp, a fire), often seen in the frame.
  He lights for truth, not for beauty.
- **The fewest lights possible.** He takes light away (flags, black cards, negative fill) to sculpt shadow, rather than
  adding light to chase brightness.
- **Light tells where you are, what time it is and how the characters feel,** without a word.

Sources: [ACFM, lighting approaches of the masters](https://www.acfm.edu.in/blogs/some-great-lighting-approaches-from-the-masters-for-cinematography);
[MovieMaker, how Deakins creates a visual landscape](https://www.moviemaker.com/how-roger-deakins-creates-a-visual-landscape/amp/).

**Sam McCurdy, *The Descent*** (a whole film inside a cave), from his ASC interview:
- **Only the sources the characters carry:** "headlamps, flashlights, glow sticks, flares and improvised firebrands".
- **Each source has its own colour,** and the film moves from white light to greens and reds as it goes deeper ("various
  levels of hell"). The colour of the light tells you how deep you are.
- **"The darkest blacks to keep the audience guessing what was in those corners, away from the light."**
- **Rock texture appears only where a light grazes it.** He stapled reflector boards to the set where the headlamps
  would hit, so the light seemed to bounce off the rock.
- **Even the darkest shots have something in them:** a lamp swinging out of the black, a face caught for a moment.

Source: [ASC, The Descent](https://theasc.com/articles/the-descent-creepy-crawlers);
[Wikipedia](https://en.wikipedia.org/wiki/The_Descent).

**Playdead's INSIDE** (a game with a fixed side camera, the nearest thing to ours):
- **"Harsh and dramatically bright slashes of light coupled with long dark shadows"** break up a muted frame and mark
  the places that matter.
- **Silhouette against backlight:** dark outlines of simple mid-ground forms against a soft glow define edges and space.
- **Colour is rare,** used only to mark a thing or a light, never everywhere.
- **"Every single frame ... had a lot of thought put into it regarding the composition and lighting"**, with simple
  texturing so the big picture leads.

Source: [Pixel Fondue, INSIDE](https://www.pixelfondue.com/blog/2017/9/11/inside-inspiration-in-minimalist-lighting-and-composition).

**Piranesi, *Carceri d'invenzione*** (the imaginary prisons, 1745 to 1761):
- **Vast vaults dwarf tiny faceless figures,** so the scale is read off the figure.
- **Light falls from an unseen source above,** throwing long shadows. The deepest blacks were added in the second
  edition, when the plates were darkened.
- **Stairs, chains, beams, ropes and gangways run on past the frame's edge,** so the space never ends.

Sources: [GWU Brady Gallery, Imaginary Prisons](https://bradygallery.gwu.edu/imaginary-prisons);
[Nine Square Grid on Piranesi](https://ninesquaregrid.substack.com/p/iron-fists-impossible-architecture).

## 2. The sublime: why darkness makes wonder (Edmund Burke, 1757)

- **Obscurity:** "When we know the full extent of any danger ... a great deal of the apprehension vanishes." What is
  half seen is bigger than what is shown.
- **Darkness:** the night adds to dread, and temples have long used darkness for awe.
- **Vastness:** greatness of dimension, read against something small.
- **Infinity:** when the eye cannot find a thing's bounds, it fills the mind with "delightful horror". Columns that
  repeat into the dark, stairs past the frame, a roof never seen.
- **Burke on painting:** pictures are often too clear, and so look false. The imagination must be left gaps to fill.

The rule for us: **never light the whole room.** Light the one thing, and the edge of the next; let the rest go black.

Sources: [Burke, On the Sublime (Lumen)](https://courses.lumenlearning.com/suny-classicreadings/?p=73);
[Wordsworth Grasmere on Burke](https://moodle2.units.it/pluginfile.php/602320/mod_resource/content/1/Edmund%20Burke%20and%20the%20Sublime%20-%20Wordsworth%20Grasmere.pdf).

## 3. The real places

**Ice Age art by firelight:**
- **Carvings were made to be seen in moving light.** Needham's team (PLOS ONE, 2022) relit 15,000-year-old engraved
  plaquettes with real and virtual fire. The flicker made the animals seem to move, and overlapping lines seem to be
  deliberate frames.
- At Lascaux, the paintings sit where an entering torch first lights them from one angle, and the wall's curve catches
  the flame so the animals seem to move.
- **The painters used the rock itself,** a bulge for a flank, a crack for a back.

For the faces: **a face is placed where a torch rakes it from the side, and carved with deep hollows,** so the
flicker moves its shadows and it seems to watch. The rock's own bulges become brows and cheeks.

Sources: [Smithsonian](https://www.smithsonianmag.com/science-nature/ice-age-artists-may-have-used-firelight-to-animate-carvings-180979943/);
[My Modern Met](https://mymodernmet.com/prehistoric-cave-paintings-moving-torchlight/);
[History Rise](https://historyrise.com/article/the-use-of-light-and-shadow-in-paleolithic-cave-art/).

**Rock-cut temples (Ajanta, Ellora):**
- **They are cut from the living rock,** subtractive: walls, pillars, shrines and gods were all left standing when the
  rest was taken away. That is the opening cave's arc from the raw to the made.
- **They are kept in darkness.** "This lack of light is crucial ... intensifying a sense of the mystery." The monks
  painted by oil lamp and by sunlight thrown off water on the floor.
- **The Buddha of Cave 1 has three expressions,** depending on the light. A carving changes with its lamp.

Sources: [Smarthistory on Ajanta](https://smarthistory.org/?p=1968);
[Go Asia on Ajanta and Ellora](https://goasia.cc/en/article/ajanta-ellora-caves).

**Ancient mirrors** (common knowledge, archaeology):
- They were polished obsidian (the Aztec "smoking mirror" of Tezcatlipoca; Dee's obsidian mirror in the British
  Museum), bronze, speculum or silver.
- **They are dark mirrors.** They throw back only what is bright: a flame, a lit face, the white of an eye. The rest
  sinks into black.
- **In a dark temple, a dark mirror multiplies the lamps into the dark.** Each flame has a ghost deep in the wall. It is
  the cheapest wonder there is: the room seems to go on behind its walls (Burke's infinity).
- Mirrors were tools of scrying, of seeing the gods and the dead. The bronze ones are engraved on the back, and the
  obsidian ones are often round, framed in carved wood or stone.

**Conan the Barbarian (1982), the tomb:**
- A dead king on a stone throne, his sword across his knees, deep in a crypt.
- Light falls on him alone; the walls drop into darkness.
- The great sword is the brightest thing in the frame.
- (Duke Callaghan was the cinematographer; Ron Cobb designed the sets.)

Our throne is empty, and the heap before it is everyone's who came before. **The light belongs to the empty seat,** so
the emptiness is the subject.

## 4. The rules this gives us (each with its recipe on our road)

1. **One subject per frame, and it is the brightest thing.**
   - The eye goes to the lightest value and the strongest contrast first, so nothing else may compete.
   - In the cave: the pool in the first room, each face as the pilgrim reaches it on the stairs, the throne in the hall.
   - *Recipe:* lamps are placed for the subject first. Every other lamp is weaker by at least half and further from the
     camera's centre.
2. **Pools of light with black between them.**
   - A source lights a pool a few yards across and dies fast. Between pools the stone goes to near-black with no
     texture.
   - The rhythm of pools leads the walk (a chain of torches up the stairs is a leading line drawn in light).
   - *Recipe:* `AMBIENT` near 0.08 in caves; the lamp falloff steep (inverse square plus a cutoff); no fill light
     anywhere.
3. **The source is seen.**
   - Every pool has its flame in the frame: the fire itself, its holder, its glow on the wall behind it.
   - *Recipe:* the flame is its own painted asset (a hot core, a coloured body, a slow flicker), with a small halo on
     the stone right behind it.
4. **Texture only where light grazes** (McCurdy, chapter 4).
   - The stone's roughness shows on the lit side of each pool and vanishes in the black. The shade stays flat.
   - So the roughness must be real form, or the grazing light has nothing to catch.
5. **Silhouette and rim.**
   - A thing between the eye and a light reads as a dark shape with a thin lit edge: pillars before the throne's
     light, the pilgrim against the pool.
   - Foreground mass in near-black frames the frame (the cut walls and roof stubs on the camera side).
6. **Depth in layers by value, not by fog.**
   - We have no fog (MASTER_RULES section 6), so depth comes from light alone: the near layer is silhouette, the middle
     is lit, the far layer is gone into black, and a far light deep in the dark says the space goes on.
   - Light seen far off, through a gap or down a passage, promises more.
7. **Withhold.**
   - Show the edge of the thing and let the dark have the rest: the roof is never seen, the columns rise past the light,
     stairs leave the frame, the heap runs into the dark.
   - Half a face lit is more frightening than a whole one.
8. **Scale against the small.**
   - The pilgrim is small. The faces are bigger than the pilgrim, the throne far bigger, the pillars run out of the
     light.
   - Something human-scale beside each big thing shows how big it is: a skull, a candle, a sword.
9. **Colour is the depth gauge and the meaning.**
   - Red is the pool, the birth (the one ruled exception).
   - The cold blue of the wisp-fire is the dead's light.
   - The white of the door is the world outside.
   - Each room has its one colour of light, and the colour changes as the walk goes on, like *The Descent*.
10. **The light moves, slowly.**
    - Flames swell and gutter, never strobe. Their shadows breathe on the carvings (the Lascaux effect), and the faces
      seem to shift.
    - A few cold motes rise from each wisp-fire and die within a yard. These are lights in the world, never a mist
      layer.
11. **The reveal is designed.**
    - Each room opens on the walk: from narrow to wide, from dark to the subject lit.
    - The stairs end where the throne comes into view down the hall's axis, framed by the pillars, like Campo Santo's
      "cramped ... frame blooming open into a wide, dramatic ... vista".
12. **Age and abandonment are told by what lies where.**
    - Forlorn is the absence of the living, told by what they left: dust drifted against risers, wax runs gone hard,
      rags, cold braziers, a skull in a niche, chains hanging from nothing.
    - Ancient is worn edges, faces rubbed blind, steps cupped by feet, mineral weeping from the joints, and the
      builders' work stopped half done.
    - Mystical is light whose source is uncanny (a cold flame that does not burn, dark mirrors holding more flames than
      the room has), and faces everywhere though "there's no faces here".

## 5. Basalt that is not uniform (Derek: "The basalt is too uniform")

Real columnar basalt (Fingal's Cave, the Giant's Causeway, Svartifoss):
- **Column widths vary** from about a foot to five feet within one face. Thick, straight columns stand in the lower
  colonnade; above them sits the entablature, thin, curved, fanned and chaotic.
- **Cross-joints and ball-and-socket joints** cut each column into drums of different heights. The drum tops are cupped
  or domed, and the drums break off unevenly.
- **The faces are rough:** each column face is slightly concave or convex, spalled in flakes, and the arrises are
  chipped and rounded by water.
- **The colour varies by cause:**
  - iron oxide runs rust-brown down from the joints;
  - white zeolite and calcite crust the joints and wet places;
  - near-black where it is wet;
  - grey-brown where it is dry and weathered;
  - each column its own value.
- **Breakdown:** fallen drums, broken columns lying at angles, slabs and gravel heaped at the foot of the walls.

*Recipe on our road:*
- column sizes drawn from a wide distribution, with zones of thick colonnade and thin entablature;
- drums of uneven height, some missing, some fallen;
- real displacement on every face (spall and flake geometry), chipped arrises, and breakdown at the foot of the walls;
- in the paint, each column its own value step and stain by cause, laid in vertical dry-brush strokes along the column.

## 6. The checklist line it adds

**Cinematography** (MASTER_RULES checklist):
- one subject, brightest;
- pools with black between;
- every source seen;
- texture only where light grazes;
- silhouettes and rims;
- depth by value;
- something withheld;
- scale against the small;
- the room's colour of light;
- slow moving light;
- the reveal designed.
