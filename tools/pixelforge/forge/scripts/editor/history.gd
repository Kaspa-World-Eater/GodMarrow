extends RefCounted
const Px := preload("res://scripts/editor/pixels.gd")
## scripts/editor/history.gd: every change the editor makes, without limit, as a list the person can see and click
## back to. An entry holds, per frame and layer it touched, the pixels before and after (whole layer copies: a sprite
## frame is small), and the selection before and after. Undo and redo walk the list; `goto` jumps.

class Entry:
	extends RefCounted
	var label := ""
	var when := ""
	var layers := {}          # "key:index:layer" -> {before: Image, after: Image, frame, layer}
	var sel_before := PackedByteArray()
	var sel_after := PackedByteArray()
	var touched := 0          # pixels changed
	var frames_touched := []  # [key:index, ...] for the carry strip
	var extra := {}           # anything else (anchors before/after)

var entries: Array = []
var cursor := 0               # entries[0..cursor) are applied
var open: Entry = null

func begin(label: String, sel: PackedByteArray) -> void:
	open = Entry.new()
	open.label = label
	open.when = Time.get_time_string_from_system()
	open.sel_before = sel.duplicate()

## snapshot a layer before it changes (once per layer per entry)
func touch(frame, layer_i: int) -> void:
	if open == null or frame == null or layer_i < 0 or layer_i >= frame.layers.size():
		return
	var id := "%s:%d:%d" % [frame.key, frame.index, layer_i]
	if open.layers.has(id):
		return
	open.layers[id] = {"before": Px.copy_of(frame.layers[layer_i].image), "after": null, "frame": frame, "layer": layer_i}
	var fid := "%s:%d" % [frame.key, frame.index]
	if not open.frames_touched.has(fid):
		open.frames_touched.append(fid)

## close the entry: snapshot the layers after; an entry that changed nothing is dropped
func commit(sel: PackedByteArray) -> Entry:
	if open == null:
		return null
	var e := open
	open = null
	e.sel_after = sel.duplicate()
	var n := 0
	for id in e.layers:
		var rec: Dictionary = e.layers[id]
		var f = rec["frame"]
		var li: int = rec["layer"]
		# a layer merged or deleted since the touch has no "after": the extra says what happened to it
		rec["after"] = Px.copy_of(f.layers[li].image) if li < f.layers.size() else null
		if rec["after"] != null:
			n += Px.diff(rec["before"], rec["after"]).size()
		f.dirty = true
	e.touched = n
	if n == 0 and e.sel_before == e.sel_after and e.extra.is_empty():
		return null
	# a new change after undos drops the redo branch
	if cursor < entries.size():
		entries = entries.slice(0, cursor)
	entries.append(e)
	cursor = entries.size()
	return e

func cancel() -> void:
	open = null

func can_undo() -> bool:
	return cursor > 0

func can_redo() -> bool:
	return cursor < entries.size()

## put a layer back (the frame may have swapped layer objects since: look it up by index)
static func _restore(rec: Dictionary, img: Image) -> void:
	var f = rec["frame"]
	var li: int = rec["layer"]
	if img == null or li >= f.layers.size():
		return
	f.layers[li].image = Px.copy_of(img)
	f.dirty = true

## undo one entry; returns the selection to put back (or null)
func undo():
	if not can_undo():
		return null
	cursor -= 1
	var e: Entry = entries[cursor]
	for id in e.layers:
		_restore(e.layers[id], e.layers[id]["before"])
	return e.sel_before

func redo():
	if not can_redo():
		return null
	var e: Entry = entries[cursor]
	cursor += 1
	for id in e.layers:
		_restore(e.layers[id], e.layers[id]["after"])
	return e.sel_after

## jump so that exactly `n` entries are applied (0 = the opening state)
func goto(n: int):
	n = clampi(n, 0, entries.size())
	var sel = null
	while cursor > n:
		sel = undo()
	while cursor < n:
		sel = redo()
	return sel

func last() -> Entry:
	return entries[cursor - 1] if cursor > 0 else null

## the list as words: "12  brush  3 px" with the applied ones first
func lines() -> PackedStringArray:
	var out: PackedStringArray = []
	for i in entries.size():
		var e: Entry = entries[i]
		out.append("%d  %s%s" % [i + 1, e.label, ("  %d px" % e.touched) if e.touched > 0 else ""])
	return out
