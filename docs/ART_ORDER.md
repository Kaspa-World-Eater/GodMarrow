# Art order for Act I (paint these in Midjourney, in this order)

Every prompt below carries the same style block and your hero sheet as `--sref`, so the objects are painted with the
same brush as the heroes. Save each upscaled PNG under the name given, then run the Forge line under it.

## 1. moor_grass  (Ground texture)

```
seamless tileable top-down texture of dark moorland grass with patches of bare peat and small grey stones, flat even lighting, no shadows, no objects, fills the whole frame edge to edge, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 1:1 --style raw --tile --sref [HERO SHEET IMAGE URL] --sw 60 --no text, watermark, border, perspective, horizon, objects, people
```
Save as `moor_grass.png`. Then: `pixelforge tiles moor_grass.png moor_grass [--second other.png]`

## 2. stone_flags  (Ground texture)

```
seamless tileable top-down texture of old cracked stone flagstones with moss in the joints, flat even lighting, no shadows, no objects, fills the whole frame edge to edge, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 1:1 --style raw --tile --sref [HERO SHEET IMAGE URL] --sw 60 --no text, watermark, border, perspective, horizon, objects, people
```
Save as `stone_flags.png`. Then: `pixelforge tiles stone_flags.png stone_flags [--second other.png]`

## 3. fen_mud  (Ground texture)

```
seamless tileable top-down texture of wet black fen mud with shallow puddles and dead reeds, flat even lighting, no shadows, no objects, fills the whole frame edge to edge, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 1:1 --style raw --tile --sref [HERO SHEET IMAGE URL] --sw 60 --no text, watermark, border, perspective, horizon, objects, people
```
Save as `fen_mud.png`. Then: `pixelforge tiles fen_mud.png fen_mud [--second other.png]`

## 4. ash_shore  (Ground texture)

```
seamless tileable top-down texture of grey volcanic ash ground with charred splinters and pale bone fragments, flat even lighting, no shadows, no objects, fills the whole frame edge to edge, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 1:1 --style raw --tile --sref [HERO SHEET IMAGE URL] --sw 60 --no text, watermark, border, perspective, horizon, objects, people
```
Save as `ash_shore.png`. Then: `pixelforge tiles ash_shore.png ash_shore [--second other.png]`

## 5. dead_tree  (Tree / large plant sheet)

```
turnaround reference sheet of a tall dead moorland tree with twisted bare branches and peeling black bark, two views side by side: front view, side view, same tree in every view, whole tree from crown to roots, trunk upright, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `dead_tree.png`. Then: `pixelforge object dead_tree.png dead_tree --height <metres> --views 2`

## 6. dead_tree_2  (Tree / large plant sheet)

```
turnaround reference sheet of a short gnarled dead oak with a split trunk and bare branches, two views side by side: front view, side view, same tree in every view, whole tree from crown to roots, trunk upright, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `dead_tree_2.png`. Then: `pixelforge object dead_tree_2.png dead_tree_2 --height <metres> --views 2`

## 7. pine  (Tree / large plant sheet)

```
turnaround reference sheet of a thin dark pine with sparse drooping needles, lower branches dead, two views side by side: front view, side view, same tree in every view, whole tree from crown to roots, trunk upright, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `pine.png`. Then: `pixelforge object pine.png pine --height <metres> --views 2`

## 8. gravestone  (Object sheet)

```
object turnaround reference sheet of a weathered stone gravestone with a worn bone sigil carved in it, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `gravestone.png`. Then: `pixelforge object gravestone.png gravestone --height <metres>`

## 9. gravestone_cross  (Object sheet)

```
object turnaround reference sheet of a cracked stone cross grave marker leaning slightly, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `gravestone_cross.png`. Then: `pixelforge object gravestone_cross.png gravestone_cross --height <metres>`

## 10. iron_fence  (Object sheet)

```
object turnaround reference sheet of a short section of rusted iron graveyard fence with spear-tip finials, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `iron_fence.png`. Then: `pixelforge object iron_fence.png iron_fence --height <metres>`

## 11. iron_fence_gate  (Object sheet)

```
object turnaround reference sheet of a rusted iron graveyard gate between two stone posts, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `iron_fence_gate.png`. Then: `pixelforge object iron_fence_gate.png iron_fence_gate --height <metres>`

## 12. lantern_post  (Object sheet)

```
object turnaround reference sheet of a tall iron lantern post with a hanging glass lantern, unlit, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `lantern_post.png`. Then: `pixelforge object lantern_post.png lantern_post --height <metres>`

## 13. altar  (Object sheet)

```
object turnaround reference sheet of a low stone altar stained dark, with bone offerings on top, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `altar.png`. Then: `pixelforge object altar.png altar --height <metres>`

## 14. coffin  (Object sheet)

```
object turnaround reference sheet of an old wooden coffin with iron bands, lid ajar, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `coffin.png`. Then: `pixelforge object coffin.png coffin --height <metres>`

## 15. urn  (Object sheet)

```
object turnaround reference sheet of a tall cracked clay funeral urn with a bone-white rim, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `urn.png`. Then: `pixelforge object urn.png urn --height <metres>`

## 16. obelisk  (Object sheet)

```
object turnaround reference sheet of a narrow stone obelisk carved with tally marks of the Count, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `obelisk.png`. Then: `pixelforge object obelisk.png obelisk --height <metres>`

## 17. rocks  (Object sheet)

```
object turnaround reference sheet of a cluster of mossy grey boulders, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `rocks.png`. Then: `pixelforge object rocks.png rocks --height <metres>`

## 18. stump  (Object sheet)

```
object turnaround reference sheet of a rotten tree stump with fungus on one side, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `stump.png`. Then: `pixelforge object stump.png stump --height <metres>`

## 19. chest  (Object sheet)

```
object turnaround reference sheet of a small iron-bound wooden chest, closed, worn, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `chest.png`. Then: `pixelforge object chest.png chest --height <metres>`

## 20. barrel  (Object sheet)

```
object turnaround reference sheet of an old wooden barrel with rusted hoops, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `barrel.png`. Then: `pixelforge object barrel.png barrel --height <metres>`

## 21. cart  (Object sheet)

```
object turnaround reference sheet of a broken wooden hand cart with one wheel missing, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `cart.png`. Then: `pixelforge object cart.png cart --height <metres>`

## 22. cage  (Object sheet)

```
object turnaround reference sheet of a hanging iron gibbet cage, empty, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `cage.png`. Then: `pixelforge object cage.png cage --height <metres>`

## 23. fire_basket  (Object sheet)

```
object turnaround reference sheet of an iron fire basket on a tripod, cold ashes inside, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `fire_basket.png`. Then: `pixelforge object fire_basket.png fire_basket --height <metres>`

## 24. bone_pile  (Object sheet)

```
object turnaround reference sheet of a heap of human bones and skulls, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `bone_pile.png`. Then: `pixelforge object bone_pile.png bone_pile --height <metres>`

## 25. signpost  (Object sheet)

```
object turnaround reference sheet of a leaning wooden signpost with two blank boards, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `signpost.png`. Then: `pixelforge object signpost.png signpost --height <metres>`

## 26. well  (Object sheet)

```
object turnaround reference sheet of a round stone well with a wooden winch frame and rope, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `well.png`. Then: `pixelforge object well.png well --height <metres>`

## 27. hut  (Building sheet)

```
architectural turnaround reference sheet of a small moorland hut of grey stone with a sagging thatched roof and one shuttered window, four views side by side: front elevation, three-quarter view, side elevation, back elevation, same building in every view, whole building from roof to ground, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 2:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `hut.png`. Then: `pixelforge object hut.png hut --height <metres> --views 4`

## 28. crypt  (Building sheet)

```
architectural turnaround reference sheet of a squat stone crypt with a peaked slate roof, an iron door and bone sigils over the lintel, four views side by side: front elevation, three-quarter view, side elevation, back elevation, same building in every view, whole building from roof to ground, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 2:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `crypt.png`. Then: `pixelforge object crypt.png crypt --height <metres> --views 4`

## 29. chapel_ruin  (Building sheet)

```
architectural turnaround reference sheet of a ruined stone chapel with a collapsed roof, one standing arch and empty lancet windows, four views side by side: front elevation, three-quarter view, side elevation, back elevation, same building in every view, whole building from roof to ground, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 2:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `chapel_ruin.png`. Then: `pixelforge object chapel_ruin.png chapel_ruin --height <metres> --views 4`

## 30. watchtower  (Building sheet)

```
architectural turnaround reference sheet of a narrow round stone watchtower with a pointed slate roof and arrow slits, four views side by side: front elevation, three-quarter view, side elevation, back elevation, same building in every view, whole building from roof to ground, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 2:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `watchtower.png`. Then: `pixelforge object watchtower.png watchtower --height <metres> --views 4`

## 31. gate_arch  (Building sheet)

```
architectural turnaround reference sheet of a stone gate arch with iron-studded doors, part of a town wall, four views side by side: front elevation, three-quarter view, side elevation, back elevation, same building in every view, whole building from roof to ground, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 2:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `gate_arch.png`. Then: `pixelforge object gate_arch.png gate_arch --height <metres> --views 4`

## 32. wall_segment  (Building sheet)

```
architectural turnaround reference sheet of a section of crenellated grey stone town wall, four views side by side: front elevation, three-quarter view, side elevation, back elevation, same building in every view, whole building from roof to ground, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 2:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `wall_segment.png`. Then: `pixelforge object wall_segment.png wall_segment --height <metres> --views 4`

## 33. shrine  (Building sheet)

```
architectural turnaround reference sheet of a small roadside shrine of stone and bone with a candle niche, four views side by side: front elevation, three-quarter view, side elevation, back elevation, same building in every view, whole building from roof to ground, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 2:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `shrine.png`. Then: `pixelforge object shrine.png shrine --height <metres> --views 4`

## 34. smithy  (Building sheet)

```
architectural turnaround reference sheet of an open-fronted stone smithy with a forge, anvil and a sloped slate roof, four views side by side: front elevation, three-quarter view, side elevation, back elevation, same building in every view, whole building from roof to ground, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 2:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `smithy.png`. Then: `pixelforge object smithy.png smithy --height <metres> --views 4`

## 35. longhouse  (Building sheet)

```
architectural turnaround reference sheet of a long timber hall with a steep slate roof and two lit windows, four views side by side: front elevation, three-quarter view, side elevation, back elevation, same building in every view, whole building from roof to ground, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 2:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `longhouse.png`. Then: `pixelforge object longhouse.png longhouse --height <metres> --views 4`

## 36. panel_bone  (UI frame / panel)

```
flat rectangular UI panel frame of a bone and iron inventory panel frame with riveted corners, ornate worn border, empty dark center, straight edges, front-on, orthographic, flat even lighting, no cast shadows, plain solid white background around the panel, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 4:3 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `panel_bone.png`. Then: `pixelforge ui9 panel_bone.png panel_bone`

## 37. panel_vellum  (UI frame / panel)

```
flat rectangular UI panel frame of a vellum and dark wood tome page frame, ornate worn border, empty dark center, straight edges, front-on, orthographic, flat even lighting, no cast shadows, plain solid white background around the panel, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 4:3 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `panel_vellum.png`. Then: `pixelforge ui9 panel_vellum.png panel_vellum`

## 38. weapons_1  (Item icons flat lay)

```
flat lay of a grave knight's weapons: a bone sword, an iron mace, a hooked scythe, a short dagger, a bone wand, a staff, a round shield, a lantern, a ring, items arranged in a neat grid with space between them, not touching, each item whole, top-down, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 1:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `weapons_1.png`. Then: `pixelforge icons weapons_1.png --names "sword:1x3,ring,..."`

## 39. armor_1  (Item icons flat lay)

```
flat lay of a pilgrim's gear: a hooded robe, a mail shirt, iron gloves, curled-toe boots, a leather belt, a mask, an amulet, a potion flask, a scroll, items arranged in a neat grid with space between them, not touching, each item whole, top-down, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 1:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `armor_1.png`. Then: `pixelforge icons armor_1.png --names "sword:1x3,ring,..."`

## 40. lantern_mystic  (Object sheet)

```
object turnaround reference sheet of an ornate gold hand lantern with a small cyan flame behind glass, a short chain handle, the Hollow Mystic's lantern, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `lantern_mystic.png`. Then: `pixelforge object lantern_mystic.png lantern_mystic --height <metres>`

## 41. lantern_ossuarch  (Object sheet)

```
object turnaround reference sheet of a hand lamp of bone and grey iron burning marrow-tallow with a warm amber flame, a bone handle, dust in its joints, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `lantern_ossuarch.png`. Then: `pixelforge object lantern_ossuarch.png lantern_ossuarch --height <metres>`

## 42. lantern_keeper  (Object sheet)

```
object turnaround reference sheet of a folded paper hand lantern with a charm strip hanging from it, a faint violet haze inside, a thin wooden handle, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `lantern_keeper.png`. Then: `pixelforge object lantern_keeper.png lantern_keeper --height <metres>`

## 43. lantern_hand  (Object sheet)

```
object turnaround reference sheet of a plain clay bowl lamp with a wick, amber flame, no ornament, carried by a wandering ascetic, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `lantern_hand.png`. Then: `pixelforge object lantern_hand.png lantern_hand --height <metres>`

## 44. lantern_penitent  (Object sheet)

```
object turnaround reference sheet of a dark iron censer lantern on a short chain, pierced with slits, a dim red-brown ember inside, unlit look, three views side by side: front view, side view, back view, same object in every view, resting on the ground, full object top to bottom, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 3:2 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, people, characters, animals, sky
```
Save as `lantern_penitent.png`. Then: `pixelforge object lantern_penitent.png lantern_penitent --height <metres>`

## 45. hollow_mystic  (Portrait)

```
head and shoulders portrait of a gaunt hooded wanderer with a faceless black void under a teal-blue tattered hood, facing the viewer, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 1:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, animals, sky
```
Save as `hollow_mystic.png`. Then: `pixelforge portrait hollow_mystic.png hollow_mystic`

## 46. ossuarch  (Portrait)

```
head and shoulders portrait of a tall grim man in bone plate with a pale shaven head and iron-grey eyes, facing the viewer, orthographic, flat even lighting, no cast shadows, plain solid white background, detailed dark fantasy digital painting in one consistent style, muted desaturated palette of deep teal-blue, bone white, cold iron grey and near-black, painterly gritty texture with visible brushwork, weathered and worn surfaces, grim and quiet, no bright colors, no neon, no glow --ar 1:1 --style raw --sref [HERO SHEET IMAGE URL] --sw 60 --no text, labels, watermark, frame, border, perspective, scenery, animals, sky
```
Save as `ossuarch.png`. Then: `pixelforge portrait ossuarch.png ossuarch`

## Rules

- Paste the hero sheet's image URL into --sref so every object is painted with the same brush as the heroes.
- White background and flat light for anything the Forge will carve (object, building, tree): light gets baked into the model's skin.
- Never write 'pixel art' or 'glow' for world art; the Forge adds the pixels and the glow where the law allows it.
- Upscale, save PNG, never a screenshot. Keep the description sentence identical if you re-roll.
