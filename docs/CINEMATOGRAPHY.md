# Cinematography: depth, light and atmosphere in Godmarrow

Derek, 2026-10-09:
- "There's no cinematography. No. Ambiance. It doesn't inspire wonder."
- "Depth and lighting in atmosphere and cinematography [are] very incredibly important for everything we do. This study
  needs to be taken super seriously in order to build true art. And then applied to the rules with its own very
  specific chapter."

This is that chapter. It binds every piece of art as the painted standard does (`docs/PAINTED_STANDARD.md`), and
`MASTER_RULES` section 0c and checklist line 13 point here.
- **The study behind it:** chapter 12 of the art library
  (`tools/art_study/chapters/12-cinematography-atmosphere-wonder.md`).
- **The full research, with every quote and source:** `tools/art_study/private/cinematography_research.md` (private).
- **The rules a machine can measure** are checked on every render by `tools/landkit3d/cine_check.py`, and its numbers go
  in the pass log.

## Why it matters

1. **The player feels a frame before reading it.** Light decides the feeling: where the eye goes first, what is
   hidden, how big, how old and how alone a place is.
2. **A frame with perfect form and material is still dead if the light falls evenly.** The opening cave proved it at
   pass 4:
   - every column the same, nothing leading the eye;
   - nothing withheld;
   - no source seen.
3. **Wonder is not detail.** It is the great against the small, the unknown kept in the dark, and one thing lit so the
   mind fills in the rest. In Burke's words (1757): "When we know the full extent of any danger ... a great deal of the
   apprehension vanishes"; "darkness is more productive of sublime ideas than light."
4. **Our camera takes away most of what cinematographers use.**
   - It is fixed: one isometric view, one zoom, no cut, no move, no lens.
   - Isometric is orthographic: nothing shrinks with distance and no lines converge, so relative size and linear
     perspective are gone.
   - The fog ban (`MASTER_RULES` 6) takes away atmospheric perspective.

   What remains is overlap, height in the frame, cast and contact shadows, value stepped by falloff, rim light, colour
   temperature, the density of detail, and known scale. **The set and the light must do all the composing,** so every
   room is designed as a sequence of frames the player walks through.

## How a room is made (before any form is built)

1. **Image words.** Give each area two or three words to judge every light and colour against (Miyazaki: "I gave each
   of the artists a few simple 'image words'"; Blighttown "a deep sadness and ... bitterly cold"). The opening cave's
   words are *forlorn, ancient, sacred-dreadful*.
2. **A value thumbnail first.** Plan the room in four to five greys (Bacher: "we usually work with four to five grey
   values"). If the thumbnail does not read, the painting will not.
3. **Lights on the floor plan.** Each source is level data: where it sits, its colour, its reach, what it is for (the
   subject, a breadcrumb, an edge found). Light is never a finishing pass (Bacher: "Always indicate in your floor plan
   where the light source is").
4. **The reveal designed.** Plan narrow and dark first, then the wide room with its far end lit. Plan where the
   subject comes into view, and from where.

## The rules

Each rule is testable on a still frame. A rule marked **[measured]** is checked by `cine_check.py`; the numbers are our
starting thresholds, to be tuned by Derek's grades.

### Value
1. **The brightest pixels are a source's core** (flame, opening, spell). **The brightest lit surface is the subject:**
   the room's one thing, or the pilgrim's path to it. **[measured]**
2. **Low key.**
   - At least 60% of a dungeon or interior frame sits in the bottom third of the value range.
   - Pools of light cover no more than about 30%. **[measured]**
3. **Between pools the stone falls to within two steps of black,** but not to black itself (Gurney: "within the shadow
   is not darkness but the effect of other, weaker sources").
4. **Black is a note, not a fill.** The darkest swatch covers about 5% or less, at contacts, voids and chosen accents
   only (Gurney, "Separateness of Black"). **[measured]**
5. **One large, simple dark mass** covers at least 15% of the frame (Johansen via Gurney: "The areas of dark are large
   and simple"; Miyazaki: "it's the darkness behind the two that is the key to the design"). **[measured]**
6. **The squint test.** At an eighth of the size and blurred, the frame reads as three to five value masses, and the
   pilgrim can still be found. **[measured: the count of masses]**
7. **Thick lights, quiet darks** (Rembrandt). Detail, crisp clusters and sparkle live in the light; the darks are
   smoother, with fewer colours and bigger clusters. Detail in the dark is at most a third of the lit area's.
   **[measured: edge density lit vs dark]**

### Sources and falloff
8. **Every lit area traces to a source,** seen in the frame or plainly placed behind an object. There is no fill
   without a source (Deakins: "I find myself lighting more and more with practical light sources").
9. **One master source per frame.** Every other source has at most about half its reach.
10. **Pools follow the inverse square:** at least three bands, each wider than the one inside it, the sharpest step
    innermost ("At twice the distance, the light is only one-fourth as bright").
11. **A flame is a flat near-white core at its true size,** with no more than three stepped halo bands. There are no
    smooth airbrush gradients. The base is bright and holds its volume, the tip is pointed, and tongues tear off (saint11:
    "the bright colors come from bottom"; "the wave top fades in a pointy shape").
12. **No deep dark within a pilgrim's height of a visible flame,** except contact shadows (Gurney's candlelight corona).
13. **The wisp-fire is white-blue, flickering and ethereal** (Derek, 2026-10-09).
    - Its core is white, its body pale cyan to cold blue, its edge half there (dithered).
    - Its aura lies only on what is near it.
    - It swells and gutters on its own breath, never strobing.
14. **Fire never turns red.** Red light is only the two exceptions: the bog's pit throat and the opening cave's pool.
15. **Light's direction is meaning.**
    - Light from above is sacred; light from below is sinister (saint11; Gurney: underlighting "can suggest magical,
      sinister or dramatic feeling").
    - Choose each landmark's light direction by its image words. The cave's colossal face is lit from below.

### Shadows and edges
16. **Every contact with the ground has a one- or two-pixel line of the darkest step.** Floating things are the
    commonest failure of depth.
17. **Cast shadows point away from their source,** sharpest and darkest where they leave the object, softer with
    distance (Gurney on Sargent: "Keep cast shadow edge dark, cool, and sharp").
18. **Flatten the lights, open the shadows.** Lit planes vary by no more than two steps; the hue variety lives in the
    shadow families.
19. **Grazing light on carving.** A relief and its age show only when light rakes across them, so a source is placed to
    skim a carving, never to hit it face on.
    - The Ice Age carvings were made to move in firelight (PLOS ONE, 2022).
    - The Buddha of Ajanta's Cave 1 has three expressions, one for each light.
20. **The four relations on a landmark** (Gurney's Windmill Principle): light on dark, dark on light, light on light and
    dark on dark all appear. The pilgrim is always light on dark or dark on light against what is directly behind, never
    mid on mid.

### Depth without fog
21. **At least three overlapping planes:** a near occluder (the bottom of the screen), the play plane, and a back plane
    or void.
22. **The near plane is the darkest and the far feature among the lightest** (Alton, *Painting with Light*: "The spot
    which should appear to be the most distant should be the lightest"). **[measured: bottom band vs top band]**
23. **Repeated units step in value:** each column or arch in a row moves about one step as it goes away from, or toward,
    its light. This is our replacement for atmospheric perspective.
24. **A rim separates dark from dark.** Where a dark near shape overlaps a dark far one, give it a one-pixel rim on the
    side toward the source, or a lit floor behind it. The rim is never on the side away from every source.
25. **A thing of known size is in every frame** (a door, a step, a skull, a torch bracket, the pilgrim), so scale can
    be read.

### Colour
26. **The lit plane takes the light's colour; the shadow keeps the ramp's violet-blue.** Sample the same material lit
    and unlit: they must differ in hue as well as value.
27. **Colour is earned by a fire or by magic** (Blaschke on *The Northman*: firelight the only saturated thing). What
    only the dark touches is near-monochrome. **[measured: saturation in the dark vs in the pools]**
28. **Each room has its own colour of light, and the colour changes as the walk goes deeper** (McCurdy on *The
    Descent*). The cave runs red at the birth, cold blue for the dead's light, and white at the door to the world.

### Composition and the way
29. **One lure per frame:** a distant lit opening, a pale landmark, a fire across the dark. It is smaller and higher in
    the frame than the play space and brighter than what is round it (Disney's "wienie"; Yang: "Light for player
    progression, and highlight exits / critical path").
30. **Breadcrumbs:** from any pool on the main way, the next pool, or its spill, is in the same frame.
31. **Compression, then release:** the frame before a reveal is darker and narrower than the reveal itself (Burke: "you
    ought to pass from the greatest light, to as much darkness"; Anor Londo after Sen's Fortress, Ash Lake after the
    Great Hollow).
32. **The sublime never shows the whole room** (Burke, Kant, John Martin).
    - At least one bound stays unseen: the roof, a far wall, the floor of a void.
    - At least one form is four or more pilgrim-heights tall, or leaves the frame.
33. **Repetition for grandeur:** a great hall shows five or more like units in a row along an axis, the far end lost in
    the dark or ending at a far light (Burke's "artificial infinite").
34. **Emptiness is allowed** (Friedrich, *Monk by the Sea*): a frame that is mostly one dark field, one lit feature and
    the pilgrim. Clutter kills the sublime.
35. **The pilgrim as the figure seen from behind** (the *Rückenfigur*). The camera already looks over the pilgrim's
    shoulder; stage the wonders so the pilgrim stands at the threshold between us and them.

### Mood: forlorn, ancient, mystical
36. **Forlorn** is told by what the absent left, where they left it:
    - dust drifted where no foot goes;
    - wax run hard;
    - rags, cold braziers, chains hanging from nothing;
    - the heap of the ones before.
37. **Ancient** is told by wear in raking light:
    - edges rounded;
    - steps cupped;
    - faces rubbed blind;
    - mineral weeping from the joints;
    - soot above old fire places;
    - the builders' work stopped half done.
38. **Mystical** is light with an uncanny source:
    - a cold flame that does not burn;
    - dark mirrors holding more fires than the room has;
    - faces everywhere, though "there's no faces here".
39. **Sorrow, not gore** (Miyazaki: "the deep sorrow of a magnificent beast doomed to a slow ... descent into ruin").
    Decay is broken magnificence, half lit.

## What we take from others, and what we never take

- **Take:**
  - from Hollow Knight, Limbo, INSIDE, Bloodborne and Kotaki: silhouettes, shapes and palettes;
  - from Darkest Dungeon and Diablo: light as a resource, and the pilgrim's light radius as a real source;
  - from Hades: rims that separate the actors.
- **Never take:** the depth haze those games rely on. It is banned here.
- **Visible beams of light** need dust or smoke, which is close to the fog ban. By default, light is shown by where it
  lands; a visible shaft is an exception only Derek grants.
