# Fungi and the three lights

Godmarrow has no animals, so the fungi are the only decomposers: they fruit everywhere the dead lie, and a wood of the
dying god is a fungal kingdom. In the Hollow Wood the fungi glow in three colours and the people read them. A Wood
voice: "Learn the three lights on the ground, or leave the Wood. The white caps hold a little light, the way a coal
holds it under ash, and they mean the ground is sound. The blue ones grow over something hollow. Step round them. The
red ones grow where the god is still bleeding underneath. Eat none of them." The Coldhearth voice disagrees: "the grey
is good in broth, the other two you leave"; another: "teal caps for the young, ghost-blue for the tall, amber where
something lies dead". The voices disagree, as people do; the art follows the first and lets the others stand. On Flat
Days, the hunter says, "Nobody hunts. The pickers put white caps on every flat stone." On the Moor's putrid flesh, the
decay grows tall as trees. This page covers `wood_lights.py`, the caps on `flat_stone.py`, `fungus.py`, the flora
mushrooms, brackets and foxfire.

## The real thing
- **The old-growth ecosystem** ([`old_growth_forest.md`](../../ecosystems/old_growth_forest.md), STUDY round 13): fungi
  decay the wood (white and brown rot), feed the trees through their nets, and fruit on logs of class 3 to 4, on
  stumps, on snags (brackets in tiers), in rings in the litter; foxfire glows in the softest dead wood.
- **Shaggy mane** (*Coprinus comatus*): a slender white stalk; a tall closed bell of a cap wrapped in shaggy upturned
  scales, its crown smooth and brown; the rim turning black and dissolving into ink that drips (it eats itself).
- **A cap at true scale** is two pixels across: it reads as a small pale dome with a darker gill-rim, by placement and
  a little light, never by detail.

## How it is made
**The three lights** (`tools/landkit/wood_lights.py`), placed by cause, never scattered:
- `place(rng, seeds, ground)`: each seed `(x, y, kind)` becomes a cluster round it (offsets `|N(0, 0.14)|` yd, sizes 0.7
  to 1.2), each cap 0.02 yd above the ground;
- **white** on sound, dry ground: the hummocks, away from the blood and the path; **blue** round the feet of the
  hollowed trees (the altar, the alcoves), over something hollow; **red** at the blood's margins (a band 2 to 6 grid cells,
  about 0.08 to 0.24 yd, out from the pools), where the god bleeds beneath;
- `draw(img, to_px, dep, caps, T)`: a dome of 3 px (size under 0.9) or 4 px with a darker rim (`COL[kind]`: top, rim,
  glow); white and blue lay a small dithered glow on the ground round them; **red casts none** (only smoulders in its
  own flesh: no red light); each breathes `0.85 + 0.15 sin(2πT + i * 1.7)`; depth-tested and drawn far to near;
- in the glade (`vigil.place_lights`): nine red seeds on the pools' margins, blue round the three hollowed trees,
  white on the sound hummocks, all **chosen only where the eye can find them** (in view).

**The pickers' caps** (`tools/landkit/flat_stone.py:caps`, `draw_caps`): laid by hand, so placed as hands place things:
a ring of 6 to 8 on stones larger than 0.9 (at half the stone's radii), a row of 3 to 5 on the smaller; each sits on the
stone's tilted top; a pale dome two pixels wide (`CAP_TOP` `(0.86, 0.87, 0.8)`) over a darker gill-rim (`CAP_RIM`), a
banked-coal glow (`CAP_GLOW`) dithered round it, breathing `0.85 + 0.15 sin`. In Cap Hollow, shrivelled white caps
still glowing on the flat stones round the camp, and troops of white caps in the litter below the yard.

**Giant fungi** (`tools/landkit/fungus.py`), drawn per pixel and depth-tested (a cap overhangs its stalk; a height field
cannot hold it):
- `draw(img, zb, dep_scene, to_px, base, height, cap_r, seed, moon, warm)`: five to seven yards; a pale swollen fibrous
  stalk from a bulb sunk in the flesh, bruised where old (`R_STALK`); a torn ring; a broad dome cap, darker at the crown,
  cracked into scales, spotted with pale warts (`R_CAP`, `WART`), the rim curling down; fine dark radiating gills
  (`R_GILL`); slime drips from the rim;
- `draw_shaggy(..., height, seed, moon, warm, light_at)`: a giant shaggy mane drawn as a stack of discs (near half only):
  cap from 0.42 to 0.5 of the height, radius 0.13 to 0.16 of it, shaggy upturned scales each with a dark shadow beneath
  (`R_SHAG`), a brown crown, the rim dissolving into ink (`R_INK`, 0.12 to 0.28 of the cap) that drips and pools.

**Small mushrooms** (`tools/landkit/flora.py:mushrooms(seed, pale)`): three to seven caps of different sizes on pale
stems, gills dark beneath, crowns lit; one pale kind (`CAP_P`) and one rust-brown (`CAP_R`); a scatter sprite, no
collision. The engine's own clusters (`wood_scene.py`) sit on old logs, round the stump and the snag's foot.

**Brackets and foxfire:** `deadwood.snag` draws 3 to 5 bracket tiers up the snag's moon side (drawn on, since they jut
out; `FUNG_TOP`, `FUNG_RIM`, `FUNG_PORE`); `wood_scene.py` draws the same on its snags (placed from the ground beside the
snag). Foxfire in the softest wood (class 4 to 5 logs, the stump's crumbled heart): a faint cold blue-green
`(0.28, 0.62, 0.52)` breathing slowly, only in shade, never where moon or lantern light is on it.

## Variants and parameters
| Piece | Where | Key parameters |
|---|---|---|
| Three lights | `wood_lights.place` / `draw` | seeds by cause; `kind` white, blue, red |
| Pickers' caps | `flat_stone.caps` / `draw_caps` | ring if `size > 0.9`, else row |
| Giant fungus | `fungus.draw` | `height` 5 to 7 yd, `cap_r` |
| Giant shaggy mane | `fungus.draw_shaggy` | `height`, `light_at` |
| Mushroom cluster | `flora.mushrooms` | `pale` |
| Brackets, foxfire | `deadwood.snag`, `wood_scene.py` | tiers 3 to 5 |

## What worked
- **Placement by cause** from the lore: red round the blood, blue at hollowed trees, white on sound ground. The lights
  are small and read as meaning, not decoration (the glade's B- critique round).
- **Hand placement for an offering:** a ring and a row read as laid by the pickers, never a scatter.
- **A little light like a banked coal,** breathing, dithered only round each cap.
- **Red that only smoulders:** keeps the no-red-light law and still reads as red.
- **Shaggy manes in groups** (Gate pass 6): "big step".

## What failed, and why (traps)
- **Placed over the whole 30-yard world grid,** so most caps fell off-screen. Choose places only where the eye can find
  them.
- **The engine's mushrooms leaking into a new scene** as white specks (stump pass 4): reused, switched off.
- **Pustules that read as little yellow mushrooms everywhere** (Gate pass 1): a pustule is flesh yellowing at its head,
  not a cap.
- **The giant fungus's cap off-frame;** "pull the shaggy manes and refine them as an asset later" (pass 13).
- **Brackets placed from the snag's own seven-yard top** instead of the ground beside it.

## Derek's rulings and grades (verbatim)
- 2026-10-07: "a couple of large mushrooms as trees"; "The mushrooms should be shaggy manes".
- 2026-10-07: "pull the shaggy manes and refine them as an asset later, just add some broken pillars instead".
- 2026-10-07, the glade's critique: "i agree with the critique ... do the rest" (the three lights placed by cause were
  part of it).
- The lore stands as the voices give it, contradictions kept (MASTER_RULES 7: lore is hinted, spoken only by in-world
  voices).

## Where it is used
- [The ritual glade](../environments/the-vigil.md): the three lights; the caps on the flat stones and every fifth
  stone of the spiral.
- [Old-growth wood](../environments/old-growth-wood.md): Cap Hollow's caps; the judge scene's clusters, brackets and
  foxfire; `flora.mushrooms` in the game's set.
- [Ruins and stone](../environments/ruins-and-stone.md): the ring of blue caps on the church floor, over something
  hollow.
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): the giant fungi and shaggy manes (since
  removed from the Gate, kept in `fungus.py`).

## Status
- **The three lights:** 4 passes, **C+**. **The pickers' caps:** 2 passes, **C+**. Both owed more passes.
- **`fungus.py`:** out of the Gate, waiting to be refined as an asset (Derek). **Brackets:** still drawn twice
  (`deadwood.py`, `wood_scene.py`) and called reused in the glade; a bracket tier as its own object is not built.
- **Contradiction in code:** `wood_lights.py`'s docstring says clusters of three to seven; `place` makes five to nine.
- **Duplicates to merge:** three cap painters (`wood_lights.draw`, `flat_stone.draw_caps`, Cap Hollow's caps) are one
  small glowing cap; `wood_scene`'s `FUNG_*` and `deadwood`'s `FUNG_*` are one bracket.
