# Animation means frames

The owner's rule: "shifting pixels sideways is not animating! animating means having frames and animating!"
The still path's sway / hover / cloak presets (animate.py) are NOT animation and must never be presented as a
character's animation; they are at most a prop's idle motion (grass, flame) and are labelled as such.

A character's animation in PixelForge is a set of drawn frames per clip per direction, made one of two ways:
1. The 3D road: the figure built from the painting, the motion clips (46 CC0 humanoid clips) played on it, every
   frame rendered, then pixelated with the style preset (what the Keeper has; 24 frames a clip now).
2. The pixel road (track/pixel2d): the painting cut into parts with pivots, posed by the same motion clips per
   frame per direction, with secondary motion (cloth, hair, hat, cords) driven by the joints' velocity, then
   pixelated with the preset. No Blender. Real frames, as many as the clip has.
Both end as the same frame sheets, and both must show in the Forge as a playing animation with a frame strip.

The Forge app and the classic Studio need a FRAME ANIMATION EDITOR for the result (Aseprite-like, in-window):
timeline with frames as thumbnails per clip and direction, play/pause/step, fps knob, onion skin (previous and
next frame ghosted), per-frame paint and clone with the same tools as the skin editor, copy / paste / insert /
delete a frame, mirror a direction, re-time (hold a frame, ease), "redo this frame from the clip", and Keep
(exports the sheet). Every edit is an op in a replayable json so an AI can do it headlessly.

The target look for every road: Morbid: The Seven Acolytes / There Is No Light / the Dark Souls bonfire pixel
painting: painted grit, dark palette with warm fire and cold ground, chunky but detailed, weight and momentum in
motion (anticipation, follow-through, hit-stop) with cloth and gear that lag the body.

Another reference from the owner: Eitr (isometric pixel-art action RPG, Norse): detailed sprites of about 64-96 px
with smooth, weighty frame animation, dark painted ground with cold light, readable silhouettes. It is the closest
match to Godmarrow's own view (isometric, 8 directions) and the bar for the pixel road's motion: anticipation,
follow-through, cloth lag, and hit reactions that move the whole body.
