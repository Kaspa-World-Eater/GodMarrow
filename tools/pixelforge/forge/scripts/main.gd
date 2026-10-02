extends Node
const FSfx := preload("res://scripts/sfx.gd")
## scripts/main.gd: the entry point. Reads the arguments after `--`, sets the window, and raises the App.
##   --python=PATH   the interpreter with PixelForge (forge_launch.py passes its own)
##   --game=PATH     the Godot project to put things in (default: three folders up)
##   --project=PATH  the Forge project folder (default: Documents/PixelForge/Forge)
##   --windowed      start in a window (Settings has the toggle; the choice is remembered)
##   --nosound
##   --screen=NAME [--character=NAME --kind=x --advanced --play ...]   open a screen directly (test hook)
##   --shot=PATH [--shot_t=S]   save the window to PATH after S seconds (default 2), then quit (test hook)
##   --toggle=window            flip the window (full screen / window) after a second, as the header button does (test hook)

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
		if not args.has("shot"):
			DisplayServer.window_set_size(Vector2i(1280, 720))
			var sc := DisplayServer.screen_get_size()
			DisplayServer.window_set_position((sc - Vector2i(1280, 720)) / 2)
	if args.has("nosound") or cfg.get("sound", true) == false:
		FSfx.enabled = false
	get_tree().root.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
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
## cannot be read
func _shot(a: Dictionary) -> void:
	await get_tree().create_timer(float(a.get("shot_t", "2"))).timeout
	await RenderingServer.frame_post_draw
	var path := String(a["shot"])
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	var img := _window_image()
	var how := "screen"
	if img == null:
		img = get_viewport().get_texture().get_image()
		how = "viewport"
	img.save_png(path)
	print("SHOT ", path, " ", img.get_size(), " ", how)
	get_tree().quit()

static func _window_image() -> Image:
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
