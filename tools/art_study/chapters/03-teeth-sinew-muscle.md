# Chapter 3: teeth, sinew, muscle and flesh (2026-10-07)

Derek: "study teeth and sinew and muscle, muscle fibers and all that stuff. Learn how to do it." Researched from
dental anatomy, histology, forensic and butchery sources and VFX shading breakdowns, listed in each section. The hex
colours are approximations from described colours ("coral pink", "greenish black"); use them as starting points,
before the moon and lantern, and hue-shift them in the ramp.

## 1. Teeth and fangs

### 1a. The shape is the detail: canine morphology
- **Five lobes, not a cone.**
  - **Outer face:** three vertical lobes. The big middle one stands out as a rounded **labial ridge** from the
    tip toward the neck, with a shallow vertical depression on either side.
  - **Section:** a rounded triangle or lens, about 1 : 0.75, not a circle.
- **The tip is off-centre.** The front cusp ridge is shorter and the back one longer, so the point sits a little
  forward. They meet at about 105° when fresh and flatten as the tooth wears.
- **The inner face** is more sculpted than the outer:
  - two **marginal ridges** down the edges;
  - a strong **lingual ridge** down the middle, splitting it into two shallow hollows;
  - a big **cingulum** bulge at the neck.
- **Profile:** widest about a third of the way down from the tip, narrowing to the neck. The root is 1.5 to 2 times
  the crown, flattened side to side. The whole tooth curves slightly back.
- **The neck line** (the cemento-enamel junction, CEJ) is scalloped: it rises toward the tip on the sides and dips
  toward the root front and back. The gum follows it.
- **Recipe:**
  1. Start from a tapered lens-section cone.
  2. Add a soft capsule ridge down the outer midline, with two shallow grooves beside it.
  3. On the inner face, add two marginal ridges, a midline ridge and a cingulum blob.
  4. Move the tip forward 10% and bend the axis back in a gentle arc.
  5. Define a CEJ height function round the perimeter (high on the sides, low front and back). It marks both the
     enamel and root boundary and the gum line.
- Sources: ecampusontario.pressbooks.pub/oralfacialonline/?p=1034 ; anatomy.app/article/canines/maxillary-canine ;
  en.wikipedia.org/wiki/Canine_tooth

### 1b. Layers and colour (why my fangs read as plastic)
- **Enamel:**
  - about 2 to 2.5 mm thick at the tip, under 0.1 mm at the neck;
  - 96% mineral and **translucent**, a near-colourless blue-grey glass;
  - where thick with nothing behind it, it reads **blue-grey and see-through** (#B9C3C8 to #9EAAB2).
- **Dentin:** opaque warm **ivory-yellow #E8D6A8 to ochre #D2B47A**, darkening with age. It shows through the
  enamel.
- **The one gradient that matters most:** the tooth is **most saturated yellow at the gum** (thin enamel over
  dentin) and **pale, cool and translucent at the tip**.
- **Cementum** (the root's skin) is matte, rough and dull (#D9C9A0 to #C2AE85), browner where exposed.
- **The pulp chamber** is a narrow copy of the tooth's shape with a horn toward the tip. It is pink-red in life
  (#C0505A), a dark brown void when dried or ancient (#3A2618), and narrows with age.
- **Light:**
  - **two speculars:** a sharp, small, near-white wet glint that breaks up along the growth lines, and a broader
    soft enamel sheen;
  - **the moon (rim):** passes **through** the thin tip and edges, so the tip glows blue-grey and the silhouette goes
    translucent;
  - **the lantern (key):** enters, scatters and comes back tinted by the dentin, so the tooth glows warm from
    inside, strongest at the neck;
  - **shadows are never grey:** olive-ochre (#6E5A3A) on the dentin areas, slate-blue on the enamel tip;
  - **wet or dry:** wet enamel has sharp contrasty glints; dry or ancient enamel is chalky and matte, with opaque
    white patches.
- **Recipe:**
  1. Find the enamel thickness at each point: the distance to an inner dentin core (the same shape about 0.85x,
     pulled back from the tip), or simply a function of height above the CEJ.
  2. Colour = lerp(dentin ochre, enamel blue-grey, smoothstep(thickness)).
  3. Transmission for the rim light ∝ exp(-k·thickness), blue at the tip.
  4. A warm inner scatter for the key light.
  5. Two specular lobes.
- Sources: codental.uobaghdad.edu.iq (enamel lecture) ; pmc.ncbi.nlm.nih.gov/articles/PMC4977345 ;
  diglib.eg.org/handle/10.1111/cgf13665 ; 80.lv (realistic subdermal shaders)

### 1c. The surface: nuance
- **Perikymata:** fine horizontal ripples parallel to the neck line, densest near the neck and fading toward the
  tip. They are seen **only in raking light**, where they break the highlight into stripes like a ribbed glass
  bottle. On a giant fang they become wavy rings following the CEJ: **the cheapest big win**.
- **Growth bands:** coarser horizontal grooves every few mm, some chalky white or brownish.
- **Craze lines:** a **few** long hairline vertical cracks in the enamel only, wavy, never crossing the neck line.
  Invisible head-on, thin bright or dark lines in raking or back light, and brown where stain has caught in them.
- **Attrition:** **flat, shiny, sharp-edged facets** where teeth met (on a canine, the tip and the inner slopes of
  the cusp ridges). Once the enamel is through, the softer dentin wears faster into a **cup**: a concave scoop of
  yellow-brown dentin (#B8955A, stained #7A5A30) inside a sharp bright rim of enamel. An old fang has **a blunted
  tip with a brown "eye" in it**.
- **Abrasion and erosion:** grit cuts notches and grooves; acid leaves smooth glassy hollows. **A fang that pushed up
  through earth carries abrasion scratches along the direction it moved.**
- **Developmental grooves** between the lobes collect stain and tartar.
- **Recipe:**
  - displace by sin(k·distance-from-CEJ + noise) for the perikymata, fading toward the tip;
  - a few long, noise-warped vertical crack curves that change only the specular and the colour;
  - a planar facet near the tip, high gloss, with a shallow stained-dentin cup inside it.
- Sources: en.wikipedia.org/wiki/Striae_of_Retzius ; colgate.com (craze lines) ;
  omfs-atlas.lovable.app/disease/attrition

### 1d. Stain, calculus and the gum
- **Calculus (tartar) above the gum:** chalky, porous, matte yellow-white to cream (#E6DCB4 to #CFC08A), browner
  with age (#9C8456). It forms as crusty layered ledges hugging the gum line and flows into the gaps between teeth
  like dripped wax.
- **Calculus below the gum:** dense, glassy dark brown to green-black (#3C3020, #2A3022) in thin bands. Where the
  gum has receded, **the root shows a black band**.
- **Stain:** gathers in grooves, pits, craze lines and the band by the gum (brown, black, green-grey). Age adds a
  general yellow-grey.
- **The gum:**
  - healthy gum is coral pink (#E39A94 to #D07A78), the attached band **stippled like orange peel**;
  - the free margin is smooth and shiny, rolled into a **knife-edge collar** following the scalloped neck line, with a
    **triangular papilla** in each gap;
  - inflamed gum loses its stipple and goes glossy, swollen, red-magenta (#B8404E) with a blue-purple margin
    (#7A3A5A);
  - recession exposes yellow root with a step at the neck line;
  - below the gum, the mucosa is redder and shiny, with small vessels showing (#C05060).
- **Recipe:**
  - the gum is a smooth roll hugging each tooth along its neck line, with papilla wedges;
  - stipple only on the attached band, wet and glossy with strong red scatter;
  - calculus is a crusty noisy deposit on the neck band, thickest on inner faces and in the gaps, matte and porous.
- Sources: en.wikipedia.org/wiki/Calculus_(dental) ; uky.edu/~cmiller/page3/s3p2.text.html ;
  en.wikipedia.org/wiki/Gums ; odontologie.usmf.md (periodontium)

### 1e. A broken tooth: the inside
- **The break surface:**
  - **enamel** breaks glassy and stepped, a thin rim translucent at its edge;
  - **dentin** breaks dull, silky and fine-fibrous, ivory to ochre;
  - **ancient teeth** have enamel crazed in a network and flaking off.
- **Inside the dentin:**
  - tubules run in gentle S-curves outward from the pulp, giving a radial sheen to a break;
  - **growth lines** form concentric shells mirroring the outline, like tree rings or an onion cut lengthwise;
  - a darker band of secondary dentin narrows the chamber.
- **The pulp canal:** a narrow hole down the centre, dark red fresh, black-brown dry.
- **Blood-soaked dentin:** after death, blood pigment soaks into the tubules and stains the dentin **pink-violet
  (#C08A9A) while the enamel stays clean**. A fine detail for the god's blood.
- **Burial:** soil stains teeth yellow to brown (#8A6A40), the roots more than the crowns, and plant roots etch
  wandering grooves.
- **Recipe:**
  1. Cut the tooth with a jagged noisy half-space.
  2. Shade the cut face by depth from the outer surface:
     - the outer 5 to 10% is the enamel rim, glassy and bluish;
     - inside it, dentin in rings (sin of inner distance) with a radial sheen;
     - at the centre, the pulp void (the outer shape shrunk about 70%), dark.
- Sources: codental.uobaghdad.edu.iq (dentin structures) ; collections.lib.utah.edu (secondary dentin) ;
  socialsci.libretexts.org (taphonomy) ; archaeologydataservice.ac.uk (archaeological dentition)

### 1f. Animal fangs, for the god's scale
- **Big cats and canids:** conical, with **two sharp keels** front and back and often a long vertical groove on the
  outer face. The enamel is thin, with yellow dentin under it.
- **Sabre-tooth:** **blade-like**, flattened side to side, curved back. Its front and back edges are **finely
  serrated**, like a tiny steak knife.
- **Crocodile:**
  - conical, round in section, finely **fluted** along its length, glossy, amber-ivory;
  - **each tooth a hollow cone with its replacement nested inside**, so a broken one shows a smaller tooth within:
    **teeth within teeth**;
  - neighbouring teeth differ in size and age, from fresh white to worn brown.
- **Boar tusk** (general knowledge, not the searches): curved in a spiral arc, triangular in section, enamel in
  bands on some faces only, honed to a **flat polished razor bevel** at the tip, open and hollow at the base.
- **Ivory:** Schreger lines (a crosshatch) in section. Weathered tusk splits into **cone-in-cone layers** and long
  cracks.
- **Recipe for a tower-sized fang:**
  - the macro form canid or sabre (keels, lens or blade section, the back curve);
  - croc flutes at mid scale;
  - the perikymata scaled up into growth terraces;
  - a polished bevel or cupped facet at a worn tip;
  - cone-in-cone splits exposing ringed dentin and a hollow core with a younger tooth nested inside.
- Sources: pubmed.ncbi.nlm.nih.gov/40401550 ; research.birmingham.ac.uk (scimitar and dirk sabretooths) ;
  tumblr.amnh.org (crocodilian teeth)

## 2. Sinew, tendon, ligament, fascia
- **Fresh tendon:** **glistening pearly blue-white** (#E8ECEE, shadow #A9B4BE) with a strong **anisotropic sheen
  along the fibres**, like brushed satin. **Old or diseased tendon** is dull yellow-grey (#C8B890, #9E9888) and loses
  the sheen.
- **Crimp:** under the sheath the collagen lies in a zig-zag wave, so a **slack** tendon shows fine bands across its
  sheen (about 1/20 of its width at our scale) that shift with the light. A **taut** one is plain satin.
- **Hierarchy:** fibres make fascicles, fascicles make the tendon. The surface reads as long parallel cords with fine
  grooves between them, twisting slowly along its length.
- **The sheath:** a thin, clear, wet film carrying fine branching pink-red capillaries and wisps of fat.
- **Where tendon meets bone (the enthesis):** it fans out and flattens into the bone, turning more opaque and
  bluish, and the bone there carries a **rough ridge or pitted tubercle**. The fibres insert at an angle, like a
  broom pressed down.
- **Where tendon meets muscle:** the red fascicles **interdigitate** with the white tendon in long ragged fingers, a
  saw-tooth boundary. Often the tendon begins as a silvery sheet on the muscle, with red fibres meeting it obliquely
  like the barbs of a feather.
- **A torn tendon is a "mop end":** the fascicles splay into strings of unequal length, curling and kinking, with
  bloody matted mass between. Never a clean cut.
- **Dried sinew** (cordage, bowstrings, hide glue):
  - flat stiff ribbons, **translucent amber to honey-brown** (#C89A50, thin edges #E0C080, thick #7A5428), horny,
    not white;
  - it splits lengthwise into hair-fine fibres, with flyaway frayed ends;
  - it shrinks as it dries, so it binds tight round what it wraps.
- **Fascia:** thin silvery translucent sheets ("silverskin") over muscle, the red seen through it blurred and cooled,
  crossed by a two-way weave of sheen with fat strands and small vessels.
- **Recipe:**
  1. Sweep an ellipse along a spline with a slow twist. Union N thinner fascicle cords with tiny grooves between them
     (AO).
  2. Specular is anisotropic along the tangent (Kajiya-Kay style), with crimp bands sin(k·s + noise) fading with
     tension.
  3. Fresh: pearly white with blue shadows, more transmission at thin edges. Dried: amber and translucent, with
     split-fibre curls at the ends.
  4. Torn ends: each fascicle ends at its own length and curls out.
  5. Bone end: fan into a wedge on a rough pitted patch. Muscle end: a comb-shaped interdigitation mask.
- Sources: wikimsk.org (tendinosis report ; myotendinous junction) ; ncbi.nlm.nih.gov/pmc/articles/PMC5894809 ;
  asipp.org (tendon and ligament basic science) ; images.radiopaedia.org/cases/61601 ;
  whatstheprocessfor.com (sinew cordage)

## 3. Muscle
- **What can be seen:**
  - the belly is wrapped in silvery translucent epimysium. Inside, **fascicles** (bundles; mm in mammals, scaled up
    for a god) are separated by thin white sheets of perimysium;
  - **a cut surface is a mosaic of polygonal red islands outlined in white-pink** (cut across), or **long parallel
    red fibres with fine white lines** (cut along);
  - fat marbles the perimysium in cream flecks and streaks (#F0E6D0) along the fascicle boundaries.
- **Fibre direction is the whole read:**
  - fibres run attachment to attachment: parallel (strap), fanning, or **pennate** (oblique to a central tendon,
    like a feather);
  - the sheen and faint grooves follow them, and the muscle tapers to white tendon at both ends;
  - **striations across a fibre are microscopic: never paint stripes across fibres.** The visible texture is the
    lengthwise grain of the fascicles.
- **Colour is myoglobin chemistry:**

  | Stage | Colour |
  |---|---|
  | freshly cut, unexposed | **purple-red** (#7A1F2E to #8C2A3A) |
  | minutes in air | **bright cherry** (#B8303A to #C8403E) on the surface, purple within |
  | hours or days | **brown-red to grey-brown** (#6E3A2A to #5A3A30), browning first at edges and dry spots |
  | long exposed, dried | a dark leathery crust, maroon-brown to near black (#3A1A16), tacky-glossy or dry-matte, fibres shrunk into ridges |

  Hard-working muscle is deeper red; "white" muscle pale pink-grey (#C89090).
- **Light:**
  - fresh muscle is wet: broken white specular over a deep red scattering body;
  - **thin edges and fibre tips glow orange-red under the lantern**, while under the moon the fascia takes the cool
    sheen and the red below goes deep wine;
  - **shadows maroon-violet (#3A0E1E), never black-brown**;
  - raking light shows the grain as fine parallel ridges and a cut face as cobbles.
- **Bulge and fold:** contracted muscle shortens and bulges, its fascia **wrinkling across the fibres** in fine
  parallel creases. Stretched, it goes smooth. **Torn**, it balls up and retracts, its edge stepped and stringy.
- **Rot, as a colour axis for the god's flesh:**
  1. **Fresh:** dulling, the gloss turning tacky.
  2. **Discoloration and bloat:**
     - hydrogen sulphide binds the blood pigment into **sulfhaemoglobin, which is green**, starting as a green-grey
       patch (#6E7A4A to #4E5A36);
     - then **marbling**: green-black pigment carried in the veins **outlines the vessel network** in branching dark
       lines (#2E3A2A to #3A2E40) on a dusky purple-green ground;
     - gas swells tissue into tight shiny domes, the skin **slips** off in sheets to glossy pink-red beneath, and
       blisters fill red-brown.
  3. **Active decay:** black-green-brown (#2A2618), wet, collapsing, fluid pooling.
  4. **Dry:** leathery, mummified dark brown to tan (#5A4030), shrunk tight, cracking and peeling.
- **Recipe:**
  1. A fibre-direction field (a spline from origin to insertion, or pennate off a midline), with the belly as a smooth
     capsule along it.
  2. Displacement by noise **stretched along the fibres** (the fascicle ridges), with cross-wrinkles where it is
     compressed.
  3. A translucent fascia layer: silvery anisotropic specular along the fibres, slightly cool.
  4. Cut faces as a Voronoi mosaic across the fibres, white perimysium seams and fat flecks on the cell borders,
     cherry at the surface and purple deeper.
  5. A per-region "rot" value blending cherry, then brown, then green-purple, with vein-network darkening.
- Sources: musculoskeletalkey.com (skeletal muscle and tendon) ; apunts.org (musculotendinous transition) ;
  canr.msu.edu (meat colour and myoglobin) ; pmc.ncbi.nlm.nih.gov/articles/PMC5223250 ; simplyforensic.com
  (decomposition) ; humanap.community.uaf.edu (stages of decomposition)

## 4. Skin, veins, necrosis
- **Veins under skin:**
  - they look **blue-grey to blue-green** (#6A7A9A, #5E7A78) though the blood is dark red: the skin scatters blue
    back while the vein soaks up the red;
  - soft-edged and blurred, deeper ones wider, fainter and bluer;
  - a faint raised ridge in raking light;
  - they wander and fork in **Y** shapes, few branches tapering downstream, with frequent cross-links: never a
    perfect tree.
- **Exposed vessels:**
  - veins dark purple-red (#4A1428), thin-walled and flattish;
  - arteries rounder, a pinkish-white wall (#D8A8A8) with red within;
  - capillary nets on wet membrane as fine red lace;
  - dried vessels as black-brown threads.
- **Necrosis:** dusky purple (#5A2A4A), then grey-blue, then black, dry and leathery (#1E1A18), with a **red
  inflamed rim** (#B83A3A) against living tissue and yellow-cream slough (#D8C890) where wet.
- **Ulcers:** punched-out craters with rolled raised edges, a base of bumpy wet red (#C04048) or yellow slough, and a
  dark halo.
- **Pustules:**
  - tense domes with a creamy yellow-white centre (#F0E0A0) under a thin glossy translucent cap, and a red halo
    fading out;
  - in clusters, at every stage: fresh, ruptured, crusted honey-brown (#A87830).
- **Recipe:**
  - grow veins by branching along the surface (taper downstream, a few cross-links);
  - use their distance field three ways: a faint bump, a blurred blue-grey darkening under skin (blur growing with
    depth), and the rot-marbling mask;
  - lesions are radial profiles (centre colour, rim height and colour, halo falloff) bent by noise.
- Sources: oikofuge.com/why-do-veins-look-blue ; uwspace.uwaterloo.ca/handle/10012/12879

## 5. What it changes in the Gate in the Flesh, worst first
1. **The fangs' colour:**
   - saturated warm dentin-yellow at the gum;
   - cool, translucent blue-grey enamel at the tip, glowing when the moon is behind it;
   - shadows olive-ochre and slate-blue, never grey.
2. **Their shape:** lobes and ridges (the labial ridge, two shallow grooves, keels front and back), a lens section,
   and the tip forward of centre. Never a smooth cone.
3. **Their surface:** perikymata rings following the scalloped neck line, seen only in the moon's raking light; a
   few long craze lines; abrasion scratches **along the direction they pushed up** through the ground.
4. **Their age:** a worn tip with a polished facet and a brown dentin cup; tartar ledges and a black band where the
   gum has receded.
5. **Their breaks:** enamel rim, ringed dentin, the dark pulp canal, the dentin stained **pink-violet by the god's
   blood**, and perhaps a younger tooth nested inside (crocodile).
6. **The gum:** a wet knife-edge collar on the scalloped neck line, with papillae between the fangs, swollen and
   inflamed (glossy red-magenta, blue-purple margin), receded on the old ones.
7. **The sinew on the arch rib:** **dried sinew is amber and translucent**, not brown stripes; flat ribbons split
   into fibres with frayed flyaway ends, shrunk tight round the bone's heads; fanned and pitted where it grips.
8. **The flesh ground:**
   - read as **muscle grain** (fascicles running in one direction per region, fascia sheen along them);
   - torn edges stepped and stringy;
   - colour by exposure: purple deep, cherry where fresh-opened, brown where old, green-black marbling along the
     veins where it rots;
   - veins under its skin blue-grey and blurred, exposed ones dark purple-red;
   - the pustules a creamy centre under a glossy cap with a red halo, at every stage.
