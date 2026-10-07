# Transitions (ecotones)

Where one land meets another is never a line. Ecologists call the meeting zone an **ecotone**. It holds species from
both sides, and some found only there, and it is often the richest ground of all: the wood's edge, the fen's margin.

## How a transition is built
1. **A gradient, not a border.** Every ecosystem's rules read the same maps: light, wet, soil, wind, and depth into
   the god. A transition is simply where those maps cross from one land's range into the next. The generator blends
   the two sets of rules by how far across the gradient a place lies.
2. **Fingers and islands.** The boundary follows the land. The wood runs up the damp gullies into the moor; the moor
   reaches into the wood along the dry ridges; islands of each lie inside the other.
3. **Edge species.** The edge has its own life:
   - shrubs and bramble where a wood meets open ground, because light comes in from the side;
   - reeds and carr where land meets water;
   - krummholz at the treeline.
4. **The ground tiles fray.** The game's ground shader already frays the borders between ground classes by warping
   where it looks up the texture (`shaders/ground_iso.gdshader`). The scatter and props follow the same gradient, so
   no straight seam shows.

## The transitions Godmarrow needs

| Transition | What happens there |
|---|---|
| Wood to moor | The wood's edge. |
| Wood to fen | Carr. |
| Moor to fen | Peat. |
| Living wood to dead | The blight's edge. |
| Anything to burnt | The fire's line. |
| The Hide to Ossa | Skin worn through to bone. |
| Ossa to Shog-Mire | Bone becoming flesh. |
| The surface to the deep | See [the organic deep](organic_deep.md). |
| Any land to a ruin | See [cities and ruins](cities_and_ruins.md). |
