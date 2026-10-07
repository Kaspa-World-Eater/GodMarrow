# Chapter 4: stone and caves at 5 cm a pixel (2026-10-07)

Derek: "do another study on stone and caves, because it looks cartoony. I get the impression you aren't using enough
pixels, whereas your desert sands look great"; "it's 1 dimensional, there's no depth to it, no 3D". Researched from the
sources listed in each section. Pixel counts, heights and hex values are working estimates at the game's scale; check
them against renders.

## 0. The diagnosis
At 5 cm a pixel, a paving stone of 40 to 60 cm is **8 to 12 pixels**, a rubble block of 20 cm is **4**, a 2 cm step
between stones is **0.4 of a pixel**, and a 1 cm chip cannot be drawn. Every form in the courtyard is under 12 pixels.

**What fails:**
- **A smooth dome at that size,** lit and snapped to a ramp, becomes **concentric rings of tone: pillow shading by
  construction**. That is the cartoony look.
- **Fine height noise at pixel frequency** turns the normals into speckle, so the pixels carry grain instead of
  structure. That is what "not using enough pixels" really means.

**Why the dunes worked:** their forms are hundreds of pixels wide under one light, so the ramp bands follow the real
form.

**The fix is not more detail.** It is **fewer, larger, flat facets per stone**, each landing on one tone, with edges
and joints at least a pixel wide, clearly lit or shadowed. Diablo II did exactly this: real geometry rendered once into
pixels, so the facets stay geometric.

## 1. Real caves
### Wall forms
- **Limestone solution caves:**
  - **scallops,** cup-shaped hollows with sharp crests, tiling whole walls and steep on their downstream side. At our
    scale only those of 15 to 50 cm (3 to 10 px) can be drawn: a soft hollow with a sharp bright crest toward the
    light;
  - **flowstone,** draped, layered and wet;
  - stalactites and stalagmites.
- **Lava tubes** (the nearest thing to a basalt cavern under a moor):
  - **flow lines:** horizontal benches along the walls recording old lava levels, which give a wall horizontal
    structure, each undercut so it casts a shadow line;
  - **wall linings** that peel and slump;
  - **lavacicles:** short shark-tooth drips from the ceiling and from the undersides of benches;
  - **runners:** beads of lava down the walls;
  - **floors** of ropy pāhoehoe folds, often under breakdown;
  - **breakdown:** slabs fallen as the lining cooled and cracked.
- **Columnar basalt:** 5- to 7-sided columns from a cooling flow (Fingal's Cave on Staffa is a whole sea cave cut in
  them). Broken column stumps are natural paving, flat tops with hard polygon edges, which read as 3D at once.
- **Quarried caverns:** flat planes with tool marks, square corners and spoil heaps. The strongest contrast to
  natural rock, so they suit what was made.

### Floors
- **Breakdown:** angular slabs tilted at random, every size mixed, piled against walls and under collapses.
- **Silt and clay:** flat and matte, cracked when dry.
- **Guano:** loose masses and slumps, dissolving pits.
- **Drip pits,** splash cups, small rimmed pools and calcite crust.
- **Puddles:** flat mirrors that take a highlight from any light.

### Light in a cave
- **A skylight shaft:**
  - it throws a **hard-edged pool** with a short penumbra;
  - the beam is seen only where dust or moisture hangs in it, and only against darkness;
  - place it to start and end in the frame, diagonal or vertical, exposed between the opening and the dark.
- **Bounce:** the lit pool lifts the nearest walls and the undersides of overhangs with a dim fill of the floor's
  colour. Nothing further away gets it.
- **Falloff:**
  - real sources die within a few yards;
  - *The Descent*'s cinematographer: "the blacks were most important", on a stock that "dropped right off in the
    shadows". Rock texture was shown only where light **grazes** it, and each light had its own hue.
- **Wet surfaces:** a few small sharp highlights toward each light say "wet stone" better than any texture.

### What reads as deep and enclosed
1. **Black is a shape:** large areas of near-black, with no texture in them.
2. **Overhead mass:** the ceiling implied by a dark band at the top of the frame, and drips hanging into view.
3. **Grazing light:** every chip becomes a highlight and a shadow.
4. **Value steps by distance:** near rock lit and textured, middle rock a silhouette with a rim, far rock gone.
5. **Few lights,** each with a reason and its own hue.

### Colours (estimates)
- **Basalt:** lit #6A6A70 to #8A8C92, mid #3A3B40 to #4E4F55, shadow #15161A to #24252B. Wet: darker and more
  saturated.
- **Limestone:** #B8A88E to #D8CBB0, shadow #3A3226.
- **Floors:** clay #5A4636 to #7A5E44; guano #3A2E22 to #5A4A30; calcite crust #C8C2B0.
- **The moon** pushes highlights toward #A8C0D8 to #D0E0F0. **A lantern** runs #FFB060 to #FFD8A0, falling through
  #6A3A20 to black. **Deep shadow** is #0A0C12, a blue-black, never grey.

Sources: en.wikipedia.org/wiki/Scalloping_(cave_feature) ; en.wikipedia.org/wiki/Lava_tube ;
legacy.caves.org/virtual/virtual_tube/breakdown.html ; nps.gov (Carlsbad geology) ; historyhit.com (Fingal's Cave) ;
theasc.com/articles/the-descent-creepy-crawlers ; divernet.com (cavern photography)

## 2. Stone at game scale: geometry or colour
| Real feature | Size | At 5 cm/px | Make it |
|---|---|---|---|
| A stone's top | 40-80 cm | 8-16 px | **geometry: a slightly tilted plane, never a dome** |
| Worn arris | 2-5 cm radius | ~1 px | a lit pixel on the light's edges, a shadow pixel on the far edges |
| Chipped corner, spall | 5-15 cm | 1-3 px | **geometry: a planar cut at its own angle**, so it takes its own tone |
| Height step between neighbours | 1-6 cm | 0.2-1.2 px | shown by the edge pixel (a lit lip, a shadow line) |
| A heaved stone | tilted 3-10° | the whole stone a tone up or down | **geometry: the whole face's tilt, the strongest cue there is** |
| A joint | 1-5 cm wide | 1 px (2 where broken) | dark, with AO; a sharp shadow on the side away from the light |
| Vesicles | 0.5-3 cm | under a pixel | colour: a few dark 1-px clusters, on a third of the stones |
| Grain | mm | invisible | nothing: the material's colour carries it |
| Wear polish | broad | many px | colour and gloss: a little lighter, more specular |
| Ruts | 5-20 cm wide | 1-4 px | geometry, broad and shallow |
| A crack through a stone | — | 1 px | a dark line, and a lit lip on one side where the halves are offset |

- **Rough-hewn faces:** tool facets 1 to 3 px wide, each on its own tone, read as chiselled.
- **Broken faces:** a few large planes with sharp bright arrises.
- **Rubble:** reads by silhouette and three tones (top lit, side mid, underside or contact black). Texture inside it
  adds nothing.
- **Contact:** everything resting on the floor needs a 1 to 2 px near-black seam where it meets it. Without that it
  floats.
- **The rule:**
  - **geometry** is anything that should change tone when the light moves: tilt, facets, chips of 5 cm and up,
    bevels, joints, ruts, rubble, the flesh pushing up;
  - **colour** is only what is under a pixel, plus materials: vesicles, grain, stain, moss, wet, polish;
  - **never** put sub-pixel noise into height, because it only makes speckle.

Sources: historyrise.com (Roman road surfaces) ; itch.io (Zelda-style boulders tutorial) ;
en.wikipedia.org/wiki/Ambient_occlusion

## 3. How the best give stone depth
- **Diablo II:** environments were 3D geometry rendered to tiles under a top light, dark everywhere outside the light
  radius.
- **Dead Cells:** low-poly models rendered small, without anti-aliasing, through a toon ramp, with normal maps kept
  for the game's lights.
- **Octopath Traveler:** at first it "lacked depth"; then it overshot resolution and lost the pixel charm. Depth came
  from camera, palette and light, with **denser tile variation**.
- **Blasphemous:** hand pixels, depth from **value contrast**, dark grounds and silhouettes, not from texture.
- **Hyper Light Drifter:** "harshly geometric ... two-tone, the sides in shadow and the top lit"; gradients only for
  air and light, never for form.
- **3D-to-pixel renderers** (the t3ssel8r style), the edge pass:
  1. compare each pixel's depth with its neighbours; farther means an edge or crease, so darken it;
  2. compare normals; a convex break toward the light gets **one highlight pixel**;
  3. never put a highlight in cast shadow.
- **By hand (the tutorials):**
  - **one light, everywhere** ("where is the light coming from? If you can't answer, you might be pillow shading");
  - **tones by size:** 2 at 16 px, 3 at 32, 4 to 5 at 64, so **a 10 px stone gets three tones at most** plus a lit
    edge and a black joint;
  - **block in, then chisel planes;**
  - **clusters, not noise:** no orphan pixels, empty space left, never busy beside busy, 0 to 2 detail clusters per
    stone;
  - **selective outline:** light or none toward the light, dark only on the shadow side;
  - **hue shift:** cool under the moon, warm under the lantern, blue-black in the dark;
  - **iso floors show side planes:** a raised stone shows a 1 px darker side on its edges toward the camera and a lit
    lip toward the light; a heaved one shows 2.

Sources: gamedeveloper.com (Dead Cells 3D pipeline) ; siliconera.com (Octopath HD-2D) ; hollywoodreporter.com
(Blasphemous) ; engadget.com (Children of Morta) ; avclub.com (Hyper Light Drifter) ; slynyrd.com pixelblogs 2, 13, 41
(texture, rocks, isometric) ; derekyu.com/makegames/pixelart.html ; pixnote.net/en/learn/shading ; itch.io (desert
rock tutorial) ; godotshaders.com/?p=4754 ; Sprite Lamp

## 4. Why dunes are easy and stone is hard
**Dunes:** one smooth form over a hundred pixels with one light, so the ramp bands follow the real contours. The slip
face gives one hard crest, and the ripples are periodic clusters, not noise.

**Stone at 8 to 12 px:**
- a smooth small dome gives rings;
- height noise gives speckle;
- the steps between stones fall below a pixel;
- many busy stones side by side turn to grey mush.

**What follows for stone:**
1. Build stones as **faceted solids**: a flat or tilted top, 1 to 3 planar chips, a 1 px bevel, no dome.
2. Each face lands on its own tone (steps 15 to 25% apart).
3. Fewer, larger facets, none under 2 to 3 px.
4. Edges carry the depth: a lit lip, a shadow side, a dark joint.
5. **The stone's tilt is the variation, not texture.**
6. A raking light.

## 5. Procedural recipe (height + normal + material)
**A. Paving (basalt):**
- **Cells:** polygonal (5 to 7 sides, relaxed Voronoi), 8 to 16 px, mixed sizes, straight edges.
- **Joint:** under 0.5 to 1 px from the edge, its floor 4 to 8 cm down, dark earth; 2 to 3 px where a corner is
  broken.
- **Top:** a **plane** at its own height ±1 to 3 cm, tilted 2 to 8°. No noise, no dome.
- **Bevel:** the outer pixel drops 1.5 to 3 cm (1.5 to 2 px on the worn way).
- **Chips:** 0 to 3 planar cuts near edges and corners, 2 to 6 cm deep and at least 2 to 3 px, each a different
  facing, so each takes another tone.
- **Cracks:** on 10 to 20% of stones, the halves offset 1 to 2 cm and tilted apart.
- **Heave:** in the flesh's zones, 5 to 15 cm and 10 to 25°, so tipped stones show a 1 to 3 px side face.
- **Colour only for:** vesicles in sparse clusters, a per-stone shift (±5% value, ±3° hue), polish on the way.

**B. Rubble:**
- **Shape:** convex polytopes (the meet of 4 to 8 half-spaces), 3 to 12 px, sunk 10 to 20%, one face a fresh paler
  break.
- **Placement:** clustered at the feet of walls and the gate, big pieces first and small ones in the gaps, many small
  and few large.

**C. Cave walls:**
- **Big forms first:** lava-tube benches every 8 to 20 px, undercut; or columnar jointing (hex cells 6 to 12 px, flat
  faces, 1 px bevel, broken heights); or scallops (warped Voronoi cups 4 to 10 px with sharp crests).
- **Lavacicles** 1 to 3 px wide under the benches, lit only on the light's side.
- **Noise:** two octaves at most, above 6 px. No pixel noise.
- **Light:** walls darker than the floor and darker with distance from the lights; the top of the frame goes to black.

**D. Cave floor beyond the paving:**
- flat silt with sparse mud cracks;
- breakdown slabs 10 to 30 px, tilted 5 to 30°;
- puddles as level mirrors with 1 to 3 px highlights;
- calcite crust round the puddles and at the walls' feet.

**E. Normals, light, ramp:**
- **Normals:** over 1 px, **never blurred** (blurring makes pillows).
- **Light:** the moon a hard pool with a 1 to 2 px penumbra; the lanterns inverse-square, black within 3 to 5 yards.
- **Shadows:** cast by marching the height toward each light.
- **AO:** height minus its blur, at two radii (1 to 2 px for the joints and contacts, 6 to 10 px broad), only on the
  ambient. Contact pixels × 0.3.
- **Edge pass:** a convex pixel toward the light goes up one ramp step; a concave one or a step down away from the
  light goes down one step.
- **Ramp:** 3 to 4 steps per material plus near-black, hue-shifted. Dither only on large flat single-material areas,
  never on stone faces.
- **Bounce:** a faint fill from the lit pool on what faces it within 2 yards.
- **Beam:** additive and seen only against the dark, with a few motes.

**F. Tests on every render:**
1. **Value only,** posterized to 4: every stone shows a top tone, a facet of another tone, a lit lip and a dark
   joint.
2. **Thumbnail:** big shapes only.
3. **Light direction:** for any stone, can you say where the light comes from? "The middle" means pillow.
4. **Orphan pixels:** near zero.
5. **Contact:** everything seated in a near-black seam.
6. **Scale:** the hero beside it.

## 6. What it changes now
- **The paving:** move from domed pillow stones to **tilted planes with chips and a bevel**. The stones are
  `ground._poly`, and the floor's height now reaches the world (MASTER_RULES 0.6), so this goes straight into the
  render.
- **The rubble:** convex polytopes, not rounded boxes.
- **The cave walls:** lava-tube benches or columnar basalt, undercut, with lavacicles; black at the top of the frame.
- **The renderer:** no blur on the floor's normals; an edge pass (a lit lip, a dark crease); dither kept off stone
  faces.
- **The test:** add value-only and thumbnail renders to every pass.
