extends Node
## scripts/main.gd: the entry point. Reads the arguments after `--`, sets the window, and raises the App.
##   --python=PATH   the interpreter with PixelForge (forge_launch.py passes its own)
##   --game=PATH     the Godot project to put things in (default: three folders up)
##   --project=PATH  the Forge project folder (default: Documents/PixelForge/Forge)
##   --windowed      start in a window (Settings has the switch; the choice is remembered)
##   --nosound --nomusic --reduced
##   --screen=NAME [--tab=NAME --model=FILE --advanced --env=NAME --light=0|1|2 ...]   open a screen directly (test hook)
##   --shot=PATH [--shot_t=S] [--shot_n=N]   save the window to PATH after S seconds (default 2), N frames 0.1 s apart, then quit
##   --script=FILE   drive a sequence of inputs (scripts/driver.gd lists the lines), then quit
##   --log[=S]       open the log drawer after S seconds

var app: Control

func _ready() -> void:
	var args := {}
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--"):
			var kv := a.substr(2).split("=", true, 1)
			args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	var cfg := _load_cfg()
	if args.has("windowed") or (cfg.get("windowed", false) and not args.has("fullscreen")):
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
		if not args.has("shot") and not args.has("script"):
			var k := int(cfg.get("scale", 2))
			DisplayServer.window_set_size(Vector2i(640 * k, 360 * k))
			var sc := DisplayServer.screen_get_size()
			DisplayServer.window_set_position((sc - Vector2i(640 * k, 360 * k)) / 2)
	app = load("res://scripts/app.gd").new()
	app.args = args
	app.cfg = cfg
	add_child(app)
	if args.has("toggle") and String(args["toggle"]) == "window":
		get_tree().create_timer(1.0).timeout.connect(func(): app.toggle_fullscreen())
	if args.has("shot"):
		_shot(args)

static func cfg_path() -> String:
	return OS.get_user_data_dir().path_join("forge_settings.json")

static func _load_cfg() -> Dictionary:
	var f := FileAccess.open(cfg_path(), FileAccess.READ)
	if f:
		var d = JSON.parse_string(f.get_as_text())
		if d is Dictionary:
			return d
	return {}

static func save_cfg(d: Dictionary) -> void:
	DirAccess.make_dir_recursive_absolute(OS.get_user_data_dir())
	var f := FileAccess.open(cfg_path(), FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(d, "  "))

## the window, saved (test hook): read back from the screen and cropped to the window, so the letterbox shows as it
## does to the person; the viewport's own texture (the content without the bars) is the fallback where the screen
## cannot be read. --shot_n=N saves N frames 0.1 s apart (path_0.png ...), for GIFs of the motion.
func _shot(a: Dictionary) -> void:
	await get_tree().create_timer(float(a.get("shot_t", "2"))).timeout
	var n := int(a.get("shot_n", "1"))
	var path := String(a["shot"])
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	for i in n:
		await RenderingServer.frame_post_draw
		var p := path if n == 1 else path.get_basename() + "_%02d.png" % i
		var img := window_image()
		var how := "screen"
		if img == null:
			img = get_viewport().get_texture().get_image()
			how = "viewport"
		img.save_png(p)
		print("SHOT ", p, " ", img.get_size(), " ", how)
		if i < n - 1:
			await get_tree().create_timer(0.1).timeout
	get_tree().quit()

static func window_image() -> Image:
	if not DisplayServer.has_feature(DisplayServer.FEATURE_SCREEN_CAPTURE):
		return null
	var screen := DisplayServer.window_get_current_screen()
	var img := DisplayServer.screen_get_image(screen)
	if img == null or img.is_empty():
		return null
	var at := DisplayServer.window_get_position() - DisplayServer.screen_get_position(screen)
	var rect := Rect2i(at, DisplayServer.window_get_size()).intersection(Rect2i(Vector2i.ZERO, img.get_size()))
	if rect.size.x < 8 or rect.size.y < 8:
		return null
	return img.get_region(rect)
