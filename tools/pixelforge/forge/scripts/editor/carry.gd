extends RefCounted
const Px := preload("res://scripts/editor/pixels.gd")
const Doc := preload("res://scripts/editor/document.gd")
## scripts/editor/carry.gd: paint on one frame, carry it to the others. The engine's renders are deterministic, so a
## pixel's place means the same thing in every frame of a clip and at the same frame index of every direction. The
## carry takes the last change's pixels (the difference the history recorded on one frame) and lays them on the
## chosen frames: by part id when the render wrote part masks (frame_NNN.parts.png: the pixel lands only where the
## target's part at that place is the same part), else by position (a painted pixel lands where the target has the
## figure, or where the source had none either; an erased pixel lands where the target has one). Explicit: a Carry
## choice runs it; reviewable: the result lists every frame it touched with a count and a thumbnail; undoable: one
## history entry.

const SCOPE_CLIP := "clip"        # the other frames of this clip and direction
const SCOPE_DIRS := "directions"  # the same frame index in the other directions of this clip
const SCOPE_ALL := "all"          # both

## the frames a scope names, as [key, index] pairs, never the source itself
static func targets(doc: Doc, src_key: String, src_index: int, scope: String) -> Array:
	var out := []
	if doc.single:
		return out
	var clip := Doc.clip_of(src_key)
	if scope in [SCOPE_CLIP, SCOPE_ALL]:
		for i in int(doc.counts.get(src_key, 0)):
			if i != src_index:
				out.append([src_key, i])
	if scope in [SCOPE_DIRS, SCOPE_ALL]:
		for k in doc.keys:
			if k == src_key or Doc.clip_of(k) != clip:
				continue
			if src_index < int(doc.counts.get(k, 0)):
				out.append([k, src_index])
	return out

## the change: [[x, y, rgba32], ...] over the layer, from the history entry's before/after on the source frame
static func change_of(entry, src_key: String, src_index: int, layer_i: int) -> Array:
	if entry == null:
		return []
	var id := "%s:%d:%d" % [src_key, src_index, layer_i]
	if not entry.layers.has(id):
		return []
	var rec: Dictionary = entry.layers[id]
	return Px.diff(rec["before"], rec["after"])

## lay a change on one frame's layer; returns the count. `src_parts` / `src_base` describe the source frame.
static func apply_to(doc: Doc, f: Doc.Frame, layer_i: int, change: Array, src_base: Image, src_parts: Image) -> int:
	if f == null or layer_i >= f.layers.size():
		return 0
	var L: Doc.Layer = f.layers[layer_i]
	if L.locked or L.image == null:
		return 0
	var base := f.base().image
	var tgt_parts := doc.parts_of(f)
	var by_part := src_parts != null and tgt_parts != null
	var n := 0
	for ch in change:
		var x: int = ch[0]
		var y: int = ch[1]
		if x < 0 or y < 0 or x >= L.image.get_width() or y >= L.image.get_height():
			continue
		var c := _col(ch[2])
		var ok := false
		if by_part:
			var sp := Doc.part_at(src_parts, x, y)
			ok = sp >= 0 and sp == Doc.part_at(tgt_parts, x, y)
		else:
			var src_on := src_base != null and src_base.get_pixel(x, y).a >= 0.5
			var tgt_on := base.get_pixel(x, y).a >= 0.5
			if c.a < 0.5:
				ok = tgt_on
			else:
				ok = tgt_on or not src_on
		if ok and L.image.get_pixel(x, y) != c:
			L.image.set_pixel(x, y, c)
			n += 1
	return n

static func _col(rgba32: int) -> Color:
	return Color8((rgba32 >> 24) & 255, (rgba32 >> 16) & 255, (rgba32 >> 8) & 255, rgba32 & 255)

## the carry itself: the last change on the current frame, to the scope's frames, inside one history entry.
## Returns {ok, count, landed: [{key, index, count, thumb}], scope}
static func run(doc: Doc, history, scope: String, entry = null) -> Dictionary:
	if entry == null:
		entry = history.last()
	if entry == null:
		return {"ok": false, "error": "Nothing to carry: paint something first."}
	var src := doc.current()
	var layer_i := doc.active_layer
	var change := change_of(entry, doc.key, doc.index, layer_i)
	if change.is_empty():
		return {"ok": false, "error": "The last change was not on this frame's layer; carry runs from the frame you painted."}
	var list := targets(doc, doc.key, doc.index, scope)
	if list.is_empty():
		return {"ok": false, "error": "No other frames to carry to."}
	var src_base := src.base().image
	var src_parts := doc.parts_of(src)
	history.begin("carry %s" % scope, doc.selection)
	var landed := []
	var total := 0
	for t in list:
		var f := doc.frame(t[0], t[1])
		if f == null:
			continue
		while f.layers.size() <= layer_i:
			f.layers.append(Doc.Layer.new(doc.current().layers[f.layers.size()].name, Px.blank(doc.width, doc.height)))
		history.touch(f, layer_i)
		var n := apply_to(doc, f, layer_i, change, src_base, src_parts)
		total += n
		landed.append({"key": t[0], "index": t[1], "count": n, "thumb": doc.composite(f)})
	var e = history.commit(doc.selection)
	if e != null:
		e.extra["carry"] = {"scope": scope, "landed": landed.size(), "pixels": total, "by": "part" if src_parts != null else "position"}
	return {"ok": true, "count": total, "landed": landed, "scope": scope, "by": "part" if src_parts != null else "position", "pixels": change.size()}
