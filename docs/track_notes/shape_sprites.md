# Shape sprites: the renderer the necromancer page proves

Reference: `docs/refs/necromancer_shape_sprite.html` (+ .png), a 96x108 idle-animated necromancer drawn entirely by
code: the figure is a list of shapes (polygons, ellipses, dots) with a material each; a renderer turns them into
pixel art that reads like hand-made work. It is what the readable-pixels track is reaching for, achieved by
construction instead of by conversion. Take ALL of its recipe into PixelForge:

The recipe (port to `pixelforge/shapes.py`, numpy, OKLab-aware):
- Materials are 5-step ramps (robe, bone, gold, iron, leather, skin, wood...) with one emissive ramp (soul fire).
- Form shading per shape from its own mask: +1 step near the top-left edges (one or two pixels in), -1 near the
  bottom-right edges, plus a directional gradient across the shape's box (gx, gy) with a half-step Bayer dither,
  contour pixels (touching an already painted shape) forced to the ramp's darkest step, optional fold stripes.
- Paint order back to front; a 1-px outline in a single near-black round everything painted; emissives drawn after
  the outline; point lights that tint lit pixels toward the light colour through a Bayer threshold; a dithered
  contact shadow on the ground.
- Animation is real frames: shape points move per frame (hem vertices wave, the upper body breathes 1 px, the orb
  pulses, runes flow, flame flickers, motes rise); every frame is rendered from the same shapes so nothing shimmers.

How PixelForge uses it:
1. A `.shapes.json` sprite format (shapes, materials, animations as per-frame point offsets and emissive rules) the
   renderer turns into frames at any preset (the preset gives the figure height, ramp length and outline rule).
2. Describe-it and the AI path author shape sprites directly (the AI writes the shape list the way this page was
   written); a person adjusts them with knobs (ramp colours, light position, fold density, hem depth, breath) and
   the shape editor (drag points) in the frame editor.
3. From a painting: extract the ramps (palette per region) and the silhouette, propose the shape list (the pixel
   road's parts become shapes), so a Midjourney character gets this renderer's clean shading instead of a shrunk
   painting; and the same shapes bind to the puppet's bones so the motion clips drive them in 8 directions.
4. Objects and effects the same way (a barrel, a lantern, a flame are a few shapes each): the clip-art look goes
   away because the shading, outline and lighting are the same for everything in the game.
