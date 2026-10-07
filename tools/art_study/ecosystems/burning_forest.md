# Burning forest

*Fire as an event in any wooded land. The Burnt Heath and the Ash Shore remember it (Act I); in play, skills and
braziers start it.*

## The real thing
Fire needs fuel, heat and air, and spreads by them:
- faster uphill, because the flames lean onto the fuel above;
- faster with the wind;
- far faster through dry, fine fuel (grass, litter, needles) than through logs.

**Kinds of fire.**
- **Ground fire:** creeps through the litter on low flames.
- **Surface fire:** runs through shrubs and young trees.
- **Crown fire:** runs through the canopy; the fiercest.

**Spread.** Embers carried on the wind start spot fires ahead of the front.

**Behind the front:**
- logs and stumps smoulder for days;
- ash covers the ground;
- then the forest renews: fireweed, grass, the seedlings of fire-adapted trees.

## In Godmarrow
A fire-spread system is already designed for the game, but not yet built:
- **The grid:** coarse, half-tile cells, each holding fuel, moisture and heat.
- **Spread:** driven by the one wind (Gust), by slope, and by embers.
- **Cell stages:** catching, burning, smouldering, ash.
- **What catches:** props, trees, corpses and creatures. Skills ignite fire; rain and water put it out.

The painted fire is `../fire_study.py`, and the burning tree is `../tree_study.py`.

## Species and elements
- Fire by stage: catching licks, the full front, crown fire in a tree, smoulder in logs.
- Embers and smoke.
- Ash ground.
- Charred trunks and snags.
- The glow of coals under ash.

## Rules
- **The fuel map** comes from the ecosystem: litter depth, grass, dead wood, crowns.
- **The moisture map** comes from its wet map.
- **Spread** follows fuel, moisture and the wind.
- **What the fire leaves** becomes the dead forest's charred variant.

## Transitions
- **Burning into burnt:** the charred dead forest.
- **Burnt back into living:** the first grass and seedlings.

## Objects to craft
- Burning variants of every tree and log, by stage.
- Ember and smoke layers.
- Charred materials.
- Ash ground tiles.

## Status
The fire studies exist. The spread system is designed but not built.
