extends SceneTree
## tools/check_scripts.gd: load every script of the Forge and report the ones that fail to parse.
##   godot --headless --path tools/pixelforge/forge --script res://tools/check_scripts.gd
## Exit code 1 when any script fails. (The app itself loads screens lazily, so a broken quest would only show
## when opened; this checks them all at once.)

func _init() -> void:
	var bad := 0
	var n := 0
	for path in _scripts("res://scripts"):
		n += 1
		var s = load(path)
		if s == null or not (s is GDScript) or not s.can_instantiate() and s.get_instance_base_type() == "":
			print("FAIL ", path)
			bad += 1
		elif s.reload() != OK:
			print("FAIL ", path, " (reload)")
			bad += 1
	print("checked %d scripts, %d failed" % [n, bad])
	quit(1 if bad > 0 else 0)

func _scripts(dir: String) -> Array:
	var out := []
	var d := DirAccess.open(dir)
	if d == null:
		return out
	for f in d.get_files():
		if f.ends_with(".gd"):
			out.append(dir.path_join(f))
	for sub in d.get_directories():
		out.append_array(_scripts(dir.path_join(sub)))
	out.sort()
	return out
