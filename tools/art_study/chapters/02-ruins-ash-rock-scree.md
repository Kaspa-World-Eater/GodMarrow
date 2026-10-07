# Chapter 2: ruins, ash ground, rock and scree (2026-10-07)

Derek: "study famous ruins and Ashen grounds and the forms of different types of rocks and scree and then apply it to
your tile building." Researched from the sources listed in each section. The hex colours, pixel conversions and some
dimensions are approximations from typical photographs; check them against photos before fixing them in a piece.

Scale: at the game's 18 px per yard, **1 px is about 5 cm, 1 m about 20 px**. Anything under about 5 cm is colour
or noise only. Features of 1 to 3 px (joints, flutes, ruts, ripples) need **one lit pixel on the lip toward the
light and one shadow pixel on the far lip**. That pair is what reads as carved in pixel art.

**The lesson under it all:** real stone is never one noise field. Every mark has a cause and a place it belongs:
edges, joints, horizontal tops, sheltered undersides, the paths of feet and of water. It looks fake when the marks
are spread evenly, and real when each is placed by a **cause mask** (exposure, shelter, edge distance, water path,
traffic path, wind, age, burial).

## 1. Ruins: how their stone aged

### Pompeii street paving (Vesuvian lava)
- **The stones:** dark grey irregular **polygons 40 to 90 cm (8 to 18 px), 4 to 7 sides**, fitted tight. Joints of
  0.5 to 2 cm show as dark hairlines, not gaps. Fresh colour is #3c3d3f to #55534f; worn tops are polished lighter
  and bluer (#6a6c70) with a sheen in raking light.
- **Form:** each block is domed by wear into a **pillow**, with every arris rounded to a 2 to 5 cm radius. In
  raking light: a bright rim on the light side and a hairline shadow in the joint.
- **Wheel ruts:** paired grooves 8 to 15 cm wide and 10 to 30 cm deep, about 1.4 m apart. They run straight down the
  street and deepen and multiply at corners, where carts turned.
- **Stepping stones:** oblong blocks about 90 x 50 cm standing 30 to 40 cm proud, with the ruts passing between
  them.
- **Curbs:** 30 to 50 cm higher, in paler tuff or limestone.
- **Recipe:** Voronoi polygons about 60 cm across. Height is a pillow dome rising from each joint, minus a joint
  groove 1 to 2 px. Subtract ruts along a traffic spline, deeper where it curves, and polish lighter and smoother
  along the traffic. Grit and ash go only into the joint and rut lows.
- Sources: worldhistory.org/image/11248/the-streets-of-pompeii ; digi.ub.uni-heidelberg.de/diglit/mau1899/0278 ;
  thecolefamily.com/italy/pompeii/slide34.htm

### Greek temples (Delphi, Olympia, Selinunte): the fluted column
- **Drums:** columns are stacks of drums **0.5 to 1.5 m tall, 1.0 to 2.2 m across**, dry-laid.
- **Anathyrosis:** each drum face has a smooth contact band 5 to 15 cm round the rim, a recessed rough-picked
  centre, and a **square socket** (about 10 to 15 cm) in the middle. A fallen drum showing this face is the single
  most recognisable "real ruin" detail.
- **Fluting:**
  - **Doric:** 20 shallow flutes meeting at **sharp arrises** (about 25 cm, 5 px, each on a 1.6 m column).
  - **Ionic and Corinthian:** 24 deeper flutes separated by flat fillets.
  - The arrises go first: chipped to a saw-tooth and sugared round, so a weathered drum is "soft-ribbed", not crisp.
- **Lifting marks:** **lewis holes** (dovetailed slots about 10 x 4 cm on top faces), rope grooves, and lifting
  bosses left uncut.
- **Cramps:** blocks were tied with iron cramps set in lead. Later scavengers **hacked them out**, leaving ragged
  pits at the joints. Where the iron stayed, it rusted, swelled and split the stone, with **orange-brown rust runs
  down from the joint**.
- **Recipe:** a cylinder with a flute profile (|sin|, N = 20), its crest sharp or flat and its arris eroded by
  exposure. Anathyrosis ring and socket on drum ends; cramp pits only at joints, rust trailing downslope from them.
- Sources: en.wikipedia.org/wiki/Anathyrosis ; ncbi.nlm.nih.gov/pmc/articles/PMC9232069 ;
  repository.royalholloway.ac.uk (Pakkanen 2011, Messene column shaft)

### Baalbek and Palmyra: how colonnades fall
- **Stone:** pale limestone (#c9b79a to #e0d2b8), honey-gold where lit.
- **Earthquake falls:** the drums **separate and lie in a rough line like dominoes**, all along one fall direction,
  half buried. The capital lands furthest out, often face-down. Survivors rocked and "walked" before they settled,
  so standing columns have **drums offset by a few cm**: a slight stagger in the profile.
- **Reuse:** at Palmyra, later people used fallen drums as benches and wall fill.
- **Recipe:** one fall direction per quake. Drums laid along it about 1.1 x drum height apart, rotated ±15°, sunk 10
  to 40%. The capital at the far end; standing columns keep small per-drum offsets.
- Sources: laur.lau.edu.lb:8443/xmlui/handle/10725/8643 ;
  deadseaquake.info (Palmyra praetorium earthquake damage)

### Marble and limestone decay (any classical ruin)
- **Sugaring:** where rain falls, the surface goes granular like a sugar cube, edges round and carving blurs. It
  turns bright, near white (#e4e0d6).
- **Black crusts:** only where rain never reaches (under cornices and capitals, in lee flute bottoms, in recesses).
  Gypsum traps soot as a black-brown cauliflower crust (#2a2622 to #4a4038).
- **The cue for "centuries old":** **inverted shading.** Undersides and overhangs are black, tops are bleached
  white, following rain, not light. Vertical rain-streaks hang below every ledge.
- **Recipe:** a rain-exposure mask (normal up and open to the sky). Exposed: bleached, granular, rounded. Sheltered:
  black crust with blobby height. Streaks below ledges.
- Sources: ysma.gr/en/?p=60446 ; pubs.usgs.gov/gip/acidrain/5.html

### Angkor: sandstone and laterite under the jungle
- **Laterite:** rusty, vesicular brick-red stone (#8a4a2c to #a8603a) with holes 0.5 to 3 cm.
- **Facing:** grey-green sandstone.
- **Biofilm, in order:** a red-orange algal film first on shaded faces (#b0604a), then grey, green and black films
  and grey-white lichen. The black crust is about 1 mm thick, so it is colour, not height.
- **Roots** (Ta Prohm) **follow the joints**: they lift and tilt blocks, pour over walls like wax, and drop the
  displaced blocks in piles at the foot.
- **The template for the god's flesh:** it enters through the joints, lifts blocks along their edges and drapes over
  tops. It never paints across faces at random.
- Sources: pmc.ncbi.nlm.nih.gov/articles/PMC2917545 ; jpgu.org 2015 HGM02-03 (black crust on Angkor sandstone)

### Petra: rose sandstone
- **Colour:** banded pink, crimson, ochre, mauve, white and grey (#c47a68, #a24a3e, #d9a46a, #8a6a7c, #e6d8c4)
  from iron and manganese.
- **Banding:** Liesegang bands are wavy and nested, cutting across the bedding. The iron-rich bands resist erosion
  and **stand proud** as thin ledges.
- **Tafoni and honeycomb:** salt pries grains loose in pits from 1 cm to metres. The pits grow inward, leaving thin,
  sharp, case-hardened rims.
- **Recipe:**
  - colour bands from domain-warped sines, with the hard bands raised;
  - honeycomb as inverted Voronoi pits, only where it is sheltered and salt-wet (wall bases, undersides);
  - the rims between pits thin, bright and sharp.
- Sources: geoexpro.com/petra-the-rose-red-wonder ; imaggeo.egu.eu/view/15112 ;
  worldatlas.com (what is a tafoni)

### Gothic abbey ruins (Rievaulx, Fountains, Tintern)
- **Robbed walls:** walls are a rubble core faced with ashlar. After the Dissolution, locals **robbed the dressed
  facing**, so neat blocks survive in places and a raw, lumpy, mortar-bound core shows where they were taken.
- **Wall tops:** ragged and stepped, capped with turf, ivy and moss.
- **Marks:** masons' marks, Roman assembly numerals, diagonal chisel tooling.
- **Floors:** an unkept floor is hummocks of fallen stone under turf.
- **Recipe:** walls in two layers. The facing is removed by a "robbing" mask, strongest at human height and near
  openings; the core is lumpy rubble; the top is a stepped profile; vegetation only on horizontal tops.
- Sources: english-heritage.org.uk (Rievaulx research) ; artsandculture.google.com (rediscovery of Rievaulx)

### Ani, Machu Picchu, the Roman Forum
- **Ani:** red, black and buff volcanic tuff laid in chequers and bands. It is soft, so edges are very round, with
  wind-scoured hollows at corner bases.
- **Machu Picchu:** white-grey granite, either pillowed polygonal ashlar with sunken joints (the blocks bulge) or
  coarse fieldstone set in clay. Orange and black-green lichen.
- **The Roman Forum:**
  - basalt paving like Pompeii's;
  - travertine (cream #d6cbb4, with horizontal pore streaks);
  - brick cores showing where the marble veneer was stripped, **pocked with rows of empty peg holes**.

### Where plants (and here, the flesh) grow
Only where water and fines collect: paving joints, wall bases, the uphill side of fallen blocks, cracks on top
faces. Moss sits on the shaded side and on ledges. Crustose lichen makes round patches 1 to 15 cm on stable,
exposed faces, in grey-white, orange (#c88a2a) and black.

## 2. Ash ground

### Volcanic tephra (Pompeii, St Helens, Iceland, Etna, Sakurajima, Pinatubo)
- **Grain sizes:**

  | Class | Size | How it reads at game scale |
  |---|---|---|
  | Ash | under 2 mm | colour only |
  | Lapilli | 2 to 64 mm | about 0.5 to 1 px speckle |
  | Blocks and bombs | over 64 mm | sprites; spindle or bread-crust bombs with cracked skins |

- **Colours:**
  - pumice ash: white to light grey (#d8d4cc to #b9b4aa), with pumice lapilli near white;
  - iron-stained zones: yellow-brown (#a08860);
  - basalt ash and scoria: black to charcoal (#1c1c1e to #3a3836);
  - oxidised scoria: rust-red to purple-brown (#6e3226 to #8a4a34);
  - wet ash: 30 to 40% darker.
- **Rain:**
  - fresh ash crusts a few mm thick and carves **branching rill networks** within days: channels 2 to 30 cm wide,
    merging into gullies, V-shaped with sharp lips;
  - on flat ground they become braided sheetwash fans;
  - mudcracks are polygons 5 to 40 cm across with **curled-up edges**;
  - lahars leave flat grey unsorted mud with floating boulders and a lobed front.
- **Wind:**
  - **ripples 5 to 20 cm apart** (1 to 4 px) run across the wind, with coarse grains on their crests and a lag
    pavement where the fines blew away;
  - **against an object:** a windward pile, a scour-moat round its base, and **a tapering tail of ash streaming
    downwind behind every block**.
- **Burial:** ash fills every ledge, flute bottom and joint first. **The groove bottoms are pale (ash) and the ribs
  dark (stone)**, the reverse of the usual dark-crevice rule, and a great cue.
- **Obsidian:** black glass with **conchoidal, rippled fractures**, razor edges and specular glints, brown-green at
  thin edges, smoky flow banding. It lies as shards 1 to 10 cm among the scoria.
- **Recipe:** a soft low base height. Rills carved by flow accumulation, branching and deepening downslope. Ripples
  as sin(wind·pos + noise) at 5 to 20 cm, with a sharp crest. Every object gets a windward drift and a downwind tail.
  Colour: the base ash, a darker coarse lag on crests, **paler fines in the lows**, wet dark in rill bottoms.
- Sources: pubs.usgs.gov/pp/p1563/tephraunits.html ; Collins & Dunne 2019 (thirty years of tephra erosion, St
  Helens) ; en.wikipedia.org/wiki/Lapilli ; frontiersin.org 10.3389/feart.2019.00343

### Wildfire ash
- **Colour is a thermometer:**

  | Fire temperature | Ash colour |
  |---|---|
  | about 150 °C | yellowish |
  | 200 to 250 °C | reddish |
  | about 300 °C | **black char** (#1a1816), coarse and flaky |
  | over 400 °C | **grey to white** (#9c9892 to #e2e0dc), fine and fluffy |

- **The mosaic:** white ash where logs and stumps burned out completely, leaving **white "ghosts" in the shape of
  what burned**, black char between them, red baked soil where it was hottest. Rain makes a grey slurry crust; wind
  strips it into streaks.
- **For the Moor:** volcanic grit as the texture, and pale ghosts of things wholly consumed (a body, a root, a log)
  as the story.
- **Recipe:** black char as the base, white ash in the shapes of burned objects with soft edges, small red halos
  where the heat was greatest.
- Sources: agris.fao.org (wildland fire ash review) ; usgs.gov (fire temperature and ash characteristics) ;
  meetingorganizer.copernicus.org EGU2013-10641

## 3. Rock types: how they look and break

| Rock | Breaks | Edges | Lit colour | Shadow | Signature |
|---|---|---|---|---|---|
| Granite | blocky on 3 joint sets, then rounds | round corestones; crisp only fresh | #b9b0a6, pink #c8a898 | blue-violet #4a4858 | salt-and-pepper speckle 2-10 mm |
| Basalt | columnar (5-7 sides), blocky | sharp fresh, round old | #3a3a3c | blue-black #1a1c22 | vesicles, orange rust rind |
| Sandstone | blocky on bedding, flakes | soft, rounded | buff #c8a070, red #b06048 | warm brown #5a3828 | bedding, cross-beds, honeycomb |
| Limestone | blocky, dissolves | rounded, fluted | #cfcab8 | cool grey #6a6a70 | karren grooves, pits, fossils |
| Slate, shale | platy | thin, sharp, stepped | #4a5058 | #20242c | laminae, staircase edges |
| Marble | blocky, sugars | sugary, round | #e4e0d6 | #8a8ea0 | veins, black crusts |
| Obsidian | conchoidal | razor | #121214 + glints | black | ripple shells |
| Tuff | soft, blocky | very round | red #c49070 to buff #b8b09a | #5a4038 | pale pumice clasts, cavities |

- **Granite:** water rots it along the joints to grus (pink-grey grit). The sound block centres survive as **rounded
  corestones 0.4 to 1.5 m**, peeling in onion-skin rinds a few cm thick, sitting on a grus apron and stacking into
  tors.
- **Basalt:**
  - **columns:** 5 to 7 sides, faces 8 cm to 3 m, the faces banded with horizontal striae;
  - **from above:** a **polygon mosaic, a natural pavement**, apt for a god's petrified cheek;
  - vesicles 1 to 20 mm and rust in the joints.
- **Sandstone:** bedding every 5 to 100 cm, with cross-beds at 15 to 30°. It flakes parallel to the face, and its
  arrises round within decades.
- **Limestone:**
  - **rillenkarren:** sharp parallel grooves 1 to 3 cm wide down slopes;
  - **runnels:** 10 to 50 cm wide;
  - **pavement:** **clints** (blocks 1 to 3 m) split by **grikes** (slots 10 to 50 cm wide), with plants in the
    grikes;
  - pitted and pale, with fossils.
- **Slate and shale:** plates 1 to 5 cm thick, every edge a small staircase.
- **Age is read at the edges:** a fresh break is sharp and lighter; old exposure is rounded, darker and lichened;
  soil stains a brown line where it once stood. **Pale fresh scars on dark old rinds read as recent damage.**
- **Recipe:** each rock type is a function of joint spacing, joint sets, break mode, rounding rate, grain speckle,
  rind colour and its signature mark. Age drives the rounding and the darkening of the rind.
- Sources: jpgu.org 2015 HGM02-02 (corestones) ; arxiv.org/pdf/cond-mat/0501015 (columnar joints) ;
  geoguide.scottishgeologytrust.org (limestone pavement, Gait Barrows)

## 4. Scree, talus and collapse rubble

- **Scree:**
  - it stands at **33 to 37°**, steepest at the top, its profile concave and easing out into a toe that meets the
    flat with a gentle apron, never a hard line. From the iso camera it reads as a fan or cone below a notch;
  - **the biggest blocks lie at the bottom.** Small clasts lodge high up, while big boulders roll past the toe and
    lie out on the flat as outliers;
  - **clast shapes:** granite chunky, basalt prisms, slate thin plates lying with the slope, limestone sharp and
    pale, sandstone slabs;
  - **active scree** is clean and pale, with no lichen. **Stable scree** has a dark patina, lichen (which grows about
    1 cm across per decade, so patch size reads as age) and soil and moss in the gaps. **Fresh chutes** run as pale
    stripes down a dark fan.
- **A collapsed wall:**
  - it falls **mostly to one side**, spreading 1 to 2 times its height;
  - the dressed blocks land furthest out, some in toppled rows that keep their coursing;
  - small core rubble and mortar heap in a ridge at the foot;
  - the remaining stump has a stepped, ragged top, and the ridge buries its base;
  - dressed blocks keep a flat face and a sharp arris; core stones are 10 to 30 cm, irregular and mortar-crusted;
  - over centuries, fines fill the gaps and ash covers the low pieces, until **only the tops of the biggest stones
    show: islands of stone in ash**.
- **Recipe:**
  - **scree:** a concave cone, clast size set by distance down it, outliers past the toe, small clasts thick near
    the top, lichen and patina by stability;
  - **a wall:** one fall side, a near ridge of small rubble, a far row of big dressed blocks, then buried by an ash
    height that fills the lows first.
- Sources: en.wikipedia.org/wiki/Scree ; geoguide.scottishgeologytrust.org/page/2138 ; Pearson NEA exemplar 4
  (scree) ; Bithell et al. 2014 (talus processes)

## 5. The cause masks, computed before any colour
1. **Rain exposure** (normal up, open to the sky): bleach, sugaring and rounding where exposed; black crust where
   sheltered; streaks below ledges.
2. **Edge distance:** arris rounding, chips, pillow doming, joint grooves of 1 to 2 px.
3. **Water path** (flow accumulation): rills in ash, wet dark bottoms, moss and flesh in the joints, rust below
   iron.
4. **Traffic path** (the old processional way): polish, ruts, dished treads; the polish catches the moon as the only
   soft shine on the Moor.
5. **Wind:** drifts and tails on every object, ripples, lag crests.
6. **Age and stability:** lichen, pale fresh scars against dark old rinds.
7. **Burial:** ash fills the lows first. Pale ash lies in flute bottoms, joints and round every foot, and a block's
   visible outline is where it rises above the ash.

**Light:** under the moon, lit planes go cool grey-blue, shadows deep blue-violet (never black), and pale ash glows
faintly in the lows. The lantern's warm falloff picks out each pillowed block's near rim and the ripples near it.
Each material gets three or four value steps, hue-shifted toward the shadow hue in the table, with dither only where
materials meet.

## 6. What it changes in the Gate in the Flesh
- **The courtyard floor:** Pompeii-style polygonal paving, dark and pillowed, polished pale along the old
  processional way to the gate, perhaps with **ruts**. Or the god's cheek as basalt-like polygon mosaic where the
  paving gives out. The flesh enters **through the joints first**, lifting stones by their edges (Angkor).
- **The ash:** pale fines in the lows and in every joint and flute bottom; drift tails downwind of every block,
  drum and fang, with a scour-moat at their feet; ripples with lag crests; curled mudcrack crust where blood or pus
  has wetted it; **black glass** (obsidian, conchoidal, glinting) where blood ran into the ash (the lore); **white
  ghosts** of things burned wholly away.
- **The pillars:**
  - drums offset a few cm;
  - Doric arrises chipped and sugared;
  - black crust under the ledges, tops bleached;
  - the broken tops conchoidal and paler (fresh);
  - cramp pits with rust runs.
- **The fallen drums:** laid in a domino line along one fall direction, sunk in ash, each end face showing the
  **anathyrosis ring and square socket**; the capital furthest out.
- **The rubble:** a near ridge of small rubble, the big blocks further out, the tops of the biggest standing as
  islands in the ash.
