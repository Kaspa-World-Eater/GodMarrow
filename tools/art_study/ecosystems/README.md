# Ecosystems and art

*A section of the art study. Derek (2026-10-06): "a section of the repository called ecosystems and art … sub-chapters
like old growth forests, rainforests, deciduous forests, conifer forests, dead forests, burning forests … different
zones having their own ecosystem types, different species, the transition areas … as we delve deeper into the more
organic parts of the world … the desert types, cities and ruins."*

Godmarrow's land is built from its ecology, not textured (see
[Living landscapes from seeds](../LIVING_LANDSCAPES.md) for the method and the pipeline). Every land is an ecosystem:
- it has its own species;
- it has its own rules for where things grow, decided by light, wet and history;
- it has its own dead (what dies there, how it decays, what eats it);
- it has its own transitions into its neighbours.

The world is also a body, the dead god's. The deeper you go, from the Hide's skin down through bone, flesh and blood to
the organs of Act V, the more of that body shows through every ecosystem.

## The shape of every chapter

1. **The real thing.** The ecosystem studied from life: its structure, its cycles, its dead, its light and its water.
   Facts, with sources.
2. **In Godmarrow.** Which zones and acts use it, and how the lore bends it. There are no animals in the world (the
   game's rule), so the fungi, the plants and the god's body fill every role animals would.
3. **Species and elements.** What lives and lies there, each one a crafted object (`tools/landkit/`).
4. **Rules.** Where each thing goes and why, as the generator decides it.
5. **Transitions.** How it gives way to each neighbour (see [transitions](transitions.md)).
6. **Objects to craft.** The landkit generators the land needs.
7. **Status.**

## Chapters

### Forests
- [Old-growth forest](old_growth_forest.md): the Hollow Wood. *The first built; the scene is the judge.*
- [Deciduous forest](deciduous_forest.md): the younger broadleaf woods, groves and edges.
- [Conifer forest](conifer_forest.md): the highland woods below An-Vhar.
- [Rainforest](rainforest.md): the dripping temperate rainforest, and the Weeping Mangroves of Shog-Mire.
- [Dead forest](dead_forest.md): blighted, drowned and standing-dead woods.
- [Burning forest](burning_forest.md): fire as an event, its spread, and what grows after.

### Open lands and waters
- [Moor and heath](moor_and_heath.md): the Ashen Moor, the Burnt Heath, the Sighing Ridge.
- [Wetlands: fen, bog, carr](wetlands.md): the Drowned Fen, the Sunken Bog, and the parasitic fen of Shog-Mire.
- [Deserts](deserts.md): the bone deserts of Ossa, and the other deserts.
- [Highlands and ice](highlands.md): the Frigid Heights of An-Vhar.

### Across the world
- [Transitions](transitions.md): ecotones, where one land becomes another.
- [The organic deep](organic_deep.md): how much of the god's body shows through, act by act.
- [Cities and ruins](cities_and_ruins.md): what people built, how it decays, and how the land takes it back.

## Lands, acts and ground sets

| Act | Region | Ecosystems | Ground sets (`assets/ground/set0`) |
|---|---|---|---|
| I | The Hide (skin) | moor, heath, old-growth and deciduous wood, fen, bog, barrows, crypts | `moor`, `heath`, `wood`, `fen`, `barrow`, `crypt`, `ridge`, `bone` |
| II | The Bleached Barrens of Ossa (bone) | bone deserts: dunes, chalk flats, rib valleys, dry oasis | `ossa`, `bone` |
| III | The Parasitic Fen of Shog-Mire (flesh, blood) | flesh fen, mangroves, blood delta, brood-banks | `shog`, `shogdeep` |
| IV | The Frigid Heights of An-Vhar (breath) | foothill conifers, glass passes, wind-scoured ridges | `anvhar`, `anvdeep` |
| V | The Descent (the body) | calcified highway, cavities, the cerebrum | `a5` |

## Rules every ecosystem shares

### Light rays, by the hour (Derek: "light rays occasionally … based on the time of day … as a rule when seed
generating")
In life, shafts of light (crepuscular rays, god rays) show only when three things meet:
- **a low light:** sun or moon near the horizon (dawn, dusk, a low moon), so the shafts slant long;
- **openings for it:** gaps in a canopy, a broken roof, a window, a cleft in rock;
- **something in the air to catch it:** mist, smoke, dust, spores, falling snow, chalk on the wind.

So rays are a rule, not decoration. When generating a land from its seed, the generator puts rays where:
- the hour's light is low enough (strongest at dawn and dusk, faint silver under a low moon, none at noon or in
  starless dark);
- the ecosystem has openings (canopy gaps, ruins' windows, rib-shade in the Ossa, the cracks of a cave);
- the air holds something (the wet map's mist, the burning forest's smoke, the Ossa's blown dust, spores in a fungal
  wood).

**How rays are painted:** stepped, see-through bands along the light's direction. The motes inside them drift with
the wind; the bands breathe as the canopy moves; they're never a glow laid over the screen.

**Per ecosystem:**
| Ecosystem | Rays |
|---|---|
| Old growth | Through the gaps at dawn and dusk; spores turning in them. |
| Conifer | Long and thin through the spires in morning mist. |
| Rainforest | Diffuse, green, in the dripping air. |
| Burning forest | Through the smoke, orange. |
| Deserts | Through dust in the rib-shade. |
| Ruins | Through the broken roofs and windows. |
| Highlands | Through blown snow. |

### Objects in combat (Derek: "the objects should also interact with missile attacks and spells in realistic ways,
which will improve the strategy aspect of gameplay")
The land is terrain to fight in, not scenery. Every landkit object exports, besides its collision posts:
- **`cover`:** how high it blocks missiles, in yards.
  - A trunk, a snag or the root plate blocks every shot (cover to full height).
  - A fresh log blocks low shots and lets high arcs pass; a sunk soft log, almost nothing.
  - A boulder blocks to its height.
  - Grass and ferns block nothing, but hide what lies prone in them.
- **`material`:** wood (living, dead-dry, dead-wet), stone, bone, moss, water, flesh. What a spell does follows from it:
  - **Fire** ignites dry dead wood, litter and grass, and spreads by the fire-spread plan (fuel, moisture, the wind).
    Living wet wood smoulders and resists; moss and water stop it. A snag burns like a torch and falls.
  - **Ice and frost** glaze stone and wood (slick ground, slowing); they freeze pools to walk on.
  - **Lightning** seeks the tallest thing near its path: a giant tree takes the strike and may split.
  - **Bone and stone** shatter piercing shots and throw splinters; wood takes arrows and holds them.
  - **Force** (knockback, the Colossus's landing) breaks rotten wood (log classes 4-5, snags), never stone.
  - **Water** douses fire and conducts lightning along it.
- **`hp`** for what can be destroyed: snags, rotten logs, saplings, a root plate's crumbling face.

Strategy follows: fight from behind a trunk, burn the dry deadfall the enemy stands in, draw lightning into a tall tree
beside a pack, freeze the pool to cross it.
