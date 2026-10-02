extends Node
## scripts/driver.gd: the scripted walkthrough (--script=FILE). One command a line, run in order; blank lines and
## lines starting with # are skipped. Used for the documented walkthrough and the GIFs; an assistant can write one.
##   wait S                  seconds
##   shot PATH [N]           save the window (N frames 0.1 s apart as PATH_00.png ...)
##   go SCREEN [key=value ...]
##   tab NAME                the workbench's tab by name
##   key up|down|left|right|enter|esc|lb|rb|f11
##   choose LABEL            activate a choice by its words on the active screen (the selector moves there first)
##   set NAME VALUE          a rack control by name: a lever 0..1, a wheel in degrees, a pull on|off, the scene light 0|1|2
##   env NAME                the ground
##   light 0|1|2             the scene-light lever
##   drop PATH               as if the file were dropped on the window
##   type TEXT               into the describe line (Home) and press Enter
##   waitjob [S]             wait until the pipeline is idle (at most S seconds, default 600)
##   music on|off
##   log                     toggle the log drawer
##   say TEXT                print a line to the terminal
##   quit

var app: Node
var path := ""
var lines: PackedStringArray = []
var i := 0

func _ready() -> void:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("no script at " + path)
		get_tree().quit(2)
		return
	lines = f.get_as_text().split("\n")
	call_deferred("_run")

func _run() -> void:
	await get_tree().create_timer(0.6).timeout
	while i < lines.size():
		var line := lines[i].strip_edges()
		i += 1
		if line == "" or line.begins_with("#"):
			continue
		var parts := line.split(" ", false, 1)
		var cmd := parts[0]
		var arg := parts[1] if parts.size() > 1 else ""
		print("SCRIPT ", line)
		match cmd:
			"wait":
				await get_tree().create_timer(float(arg)).timeout
			"shot":
				var a := arg.split(" ")
				await _shot(a[0], int(a[1]) if a.size() > 1 else 1)
			"go":
				var a := arg.split(" ")
				var d := {}
				for kv in a.slice(1):
					var p := kv.split("=", true, 1)
					d[p[0]] = p[1] if p.size() > 1 else "1"
				app.go(a[0], d)
				await _settle()
			"tab":
				if app.current:
					for k in app.current.tabs.size():
						if app.current.tabs[k].to_lower() == arg.to_lower():
							app.tabs_ctrl.set_sel(k)
				await _settle()
			"key":
				_key(arg)
				await _settle(0.15)
			"choose":
				_choose(arg)
				await _settle()
			"set":
				var a := arg.rsplit(" ", true, 1)
				_set_control(a[0], a[1] if a.size() > 1 else "")
				await _settle(0.1)
			"env":
				app._pick_env(arg)
			"light":
				app.scene.set_light_mode(int(arg))
				if app.current and app.current.has_method("set_light_stop"):
					app.current.set_light_stop(int(arg))
			"drop":
				app._on_files_dropped(PackedStringArray([arg]))
				await _settle()
			"type":
				if app.current and app.current.has_method("_describe") and app.current.describe:
					app.current.describe.text = arg
					app.current._describe()
				await _settle()
			"waitjob":
				var limit := float(arg) if arg != "" else 600.0
				var t := 0.0
				while (app.backend.busy() or (app.current and app.current.job != null)) and t < limit:
					await get_tree().create_timer(0.25).timeout
					t += 0.25
				await _settle(0.3)
			"music":
				app.set_music(arg == "on")
			"log":
				app.toggle_log()
			"say":
				print(arg)
			"quit":
				get_tree().quit()
				return
			_:
				print("SCRIPT unknown: ", line)
	print("SCRIPT done")
	get_tree().quit()

func _settle(s: float = 0.5) -> void:
	await get_tree().create_timer(s).timeout
	while app.transitioning:
		await get_tree().process_frame

func _shot(p: String, n: int) -> void:
	DirAccess.make_dir_recursive_absolute(p.get_base_dir())
	for k in n:
		await RenderingServer.frame_post_draw
		var out := p if n == 1 else p.get_basename() + "_%02d.png" % k
		var img: Image = load("res://scripts/main.gd").window_image()
		var how := "screen"
		if img == null:
			img = get_viewport().get_texture().get_image()
			how = "viewport"
		img.save_png(out)
		print("SHOT ", out, " ", img.get_size(), " ", how)
		if k < n - 1:
			await get_tree().create_timer(0.1).timeout

func _key(name: String) -> void:
	match name:
		"up", "down", "left", "right":
			app.move(name)
		"enter":
			app.select_current()
		"esc":
			app.back()
		"lb":
			app.next_tab(-1)
		"rb":
			app.next_tab(1)
		"f11":
			app.toggle_fullscreen()
		"undo":
			if app.current:
				app.current.undo()

func _choose(label: String) -> void:
	for g in app.groups:
		if g.has_method("index_of"):
			var k: int = g.index_of(label)
			if k >= 0:
				app.focus_on(g, k, false)
				app.select_current()
				return
	print("SCRIPT no choice named ", label)

func _set_control(name: String, value: String) -> void:
	for g in app.groups:
		if g.has_method("by_name"):
			var c: Control = g.by_name(name)
			if c == null:
				continue
			app.focus_on(g, g.controls.find(c), false)
			if c.has_method("set_stop"):
				c.set_stop(int(value))
			elif c.has_method("set_on"):
				c.set_on(value == "on" or value == "1")
			elif c.has_method("set_angle"):
				c.set_angle(float(value))
			else:
				c.set_value(float(value))
			return
	print("SCRIPT no control named ", name)
