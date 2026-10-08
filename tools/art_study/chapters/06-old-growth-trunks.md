# Chapter 6: old-growth trunks (2026-10-07)

Derek: "No tree is a perfect tube like you've made. They have changes in thickness. They taper, they twist ... do a
study on trees, old growth trees like Douglas firs ... channels running down the bark that give it kind of a wavy
shape."

## 1. The real thing
**Douglas fir (old growth).**
- The bark is dark red-brown and very rough, **up to a foot thick** at the base of old trees. It is split by deep,
  wide **furrows** between great **ridges**, and the ridges are **joined at intervals by narrow cross ridges**: a
  braided net, never parallel lines.
- With age the ridges go grey to grey-brown on their faces. The furrows stay brown, and the bark is loose and punky.
- Dry, exposed trees have rougher, harder bark. Sheltered wet ones are smoother.
- Furrow depth varies with the tree's size, its growth rate and its site (USGS study of Oregon Coast Range firs).
- Furrows are deepest at the foot, where the bark is oldest and thickest. Higher up they grow shallower, narrower
  and smoother, and the crown's bark is thin and plated.

**Taper.**
- **Butt swell:** the lowest metres flare out into the root collar, often to 1.5 times the trunk's breast-height
  width.
- Above the swell, the bole tapers slowly and almost straight: a Douglas fir loses only about a third of its
  diameter over its first 30 m.
- The taper is not smooth. The trunk **swells** slightly round old branch collars and burls, and pinches where a
  wound healed.

**Twist (spiral grain).**
- Douglas fir, elm, sweetgum and many pines grow with spiral grain. It is in the genes, and the wind strengthens it
  (an uneven crown loaded by a prevailing wind twists the tree year after year).
- **The spiral angle grows with the tree's size**, so the oldest trees twist most visibly.
- Species keep a direction: Jeffrey and ponderosa pines spiral right, sugar pine left.
- The bark's furrows follow the grain, so on an old twisted tree **the channels wind round the trunk**.

**Fluting.**
- Western redcedar, Sitka spruce and old firs are **fluted**: erratic radial growth leaves deep vertical channels
  and lobes. They run upward from the root collar and down from branch junctions, and they **may spiral**.
- Fluting is worst in the butt and in large, open-grown trees.
- The cross-section is lobed, not round, and **the lobes wander**: a flute begins, deepens, and fades out higher up.

**The silhouette.**
- The trunk's edge against the dark is never a straight line. Every ridge and channel that passes the edge makes it
  waver.
- The axis itself is not straight either: a slight lean, a slow sweep, a kink where a leader was lost.
- Old trees carry **burls**, **catfaces** (basal fire scars, hollows), broken tops and reiterated trunks.

## 2. What this means at game scale (a yard is 18 px across, 21 px tall)
- A giant's trunk 2 yards across is about 36 px wide on screen.
- A Douglas-fir furrow 10 to 15 cm deep is about 2 to 3 px. **The channels are real geometry** and must cast their
  own shadow, a dark stripe on the side away from the moon.
- Taper over a screen's height (6 to 8 yards of trunk) is small, 5 to 10 percent. It reads mostly at the foot (butt
  swell) and in the sway of the outline.
- Twist reads through the channels' slant: 3 to 10 degrees from vertical, steeper on the oldest.
- The waver of the outline, 1 to 2 px, is what kills the "tube" read.

## 3. Recipe: each trunk a warped column
The engine stores a trunk as a height column, so its cross-section can't change with height. The fix: when casting
and lighting, each trunk's coordinates are **warped by height** back into its own canonical column (as the wind's lean
already is). The column holds the lobed, channelled cross-section. The warp gives it:
1. **Taper and swell:** the radius scale `s(z)`:
   - butt swell `1 + 0.45 * exp(-z / 1.2)`;
   - a slow taper of about 1 percent a yard;
   - slow swellings of plus or minus 4 percent on wavelengths of 3 to 6 yards;
   - each tree its own.
2. **A wandering axis:** the centre drifts with height, a lean plus a slow sweep of 0.1 to 0.3 yards over 15.
3. **Twist:** the cross-section rotates with height, 3 to 8 degrees a yard, each tree its own direction. The channels
   then wind round the trunk, and the bark's fissures (painted in the canonical frame) wind with them.
4. **Channels:** deep furrows cut into the canonical column. They are braided:
   - 9 to 16 of them, each fading in and out with height;
   - joined by cross ridges at intervals;
   - deepest at the foot and shallower above.
   This adds to the vein-ridges, the god's veins, which stay the big lobes.
5. **Normals** come from the canonical column's gradient, rotated back by the twist.
6. **Test:** the value-only render. Every trunk's edge wavers, the channels show as shadowed stripes winding up, and
   the foot swells. No two trunks are alike.

Sources: [Characteristics of old-growth Douglas firs](https://scmbc.org/characteristics-of-old-growth-douglas-firs);
[Douglas fir (Rowan arboretum)](https://arboretum.rowan.edu/?p=7050);
[Douglas-fir bark furrows, Oregon Coast Range (USGS)](https://pubs.usgs.gov/publication/70046913);
[Of water and wood, Chris Maser](https://chrismaser.com/waterwood.htm);
[Why tree trunks spiral (Alaska Science Forum)](https://www.gi.alaska.edu/alaska-science-forum/more-why-tree-trunks-spiral);
[Spiral grain at San Jacinto Mountain](https://tchester.org/sj/analysis/tree_wood_grain_helicity.html);
[Flute (glossary)](https://mgnv.org/glossary-flute/);
[Western redcedar (Virginia Tech dendrology)](https://dendro.cnre.vt.edu/DENDROLOGY/carddetail.cfm?ID=260);
[Stem characteristics of western redcedar](https://agris.fao.org/search/en/records/65df435c0f3e94b9e5d6c7c2).

## 4. How it was done, and what it gave (Derek, 2026-10-07: "great job on the turning trees. More realistic and not just tubes")
**The technique: the warped column.**
- `tools/landkit/vein_tree.py` stamps each trunk once, as a straight canonical column, into the world's height
  (`HT`). Its section is lobed by the vein-ridges (`_ridges`/`_lobe`) and cut by 9 to 16 bark channels
  (`_channels`).
- `vein_tree.Warp` gives each tree its own height functions:
  - a radius scale `s(z)`: butt swell, about 1 percent taper a yard, two slow swellings;
  - an axis offset (lean plus a slow sweep);
  - a twist angle (3 to 8 degrees a yard, more on the bigger trees, each tree its own direction).
- The engine (`wood_scene.py`) has a `TRUNK_WARP` hook:
  - in `cast`, every ray point tested against a trunk is first sent through the wind's lean, then `to_canon`
    (un-offset, un-twist, un-scale), and looked up in the straight column;
  - in `shade`, each trunk pixel's normal is turned back out by the twist at its height (`normal_back`).
- So the trunk is real geometry in every direction: the outline wavers as channels pass the edge, the moon lights the
  channels' walls and they cast their own shadow, and the bark's painted fissures (drawn in the canonical frame)
  wind with the twist for free.

**Rules learned on the way:**
- **Anything placed on a warped trunk must be carried out through the warp** (`Warp.from_canon`). The eyes and the
  hollows are found on the canonical column, then moved and turned by the twist at their height.
- **Choose a facing in the world, then undo the twist** for the canonical angle. Otherwise the twist turns a mouth
  edge-on.
- **A height field can only hold a downward-closed solid.** A section that changes with height can't be stamped; it
  must be a warp of a column.
- **Stills need the trees' own pass:** `cast` with no time skips the trunk lookup, so the hook forces `t = 0`.
- **Build-hook order matters:** insert the scene's hooks as one ordered list (floor, trees, stump, then what grows on
  the trees). Inserting one at a time at index 0 shifted the rest.

**To carry back** (Derek: "we're going to have to go back and edit our old assets with this"): every earlier tree,
meaning the old-growth judge scene, Cap Hollow and the landkit `tree.py`/`giant.py` trunks, gets the warp and the
channels.
