extends SceneTree
## A look at a live 3D body alone (entities/body3d.gd): each clip at a few times, in a few headings, saved as the
## picture the game draws (before the world's dark). godot --path . -s tools/body3d_test/look.gd -- OUT_DIR

func _initialize() -> void:
	var out: String = OS.get_cmdline_user_args()[0] if OS.get_cmdline_user_args().size() > 0 else "user://look"
	DirAccess.make_dir_recursive_absolute(out)
	var b := Body3D.new("res://art/characters3d/newborn/newborn.glb")
	root.add_child(b)
	b.position = Vector2(300, 400)
	b.enable_drips()
	await process_frame
	var shots := [["crawl", 0.0], ["crawl", 0.9], ["slip", 0.8], ["retch", 2.1], ["rise", 1.4], ["rise", 2.9], ["rise", 3.6], ["idle", 0.0], ["walk", 0.4]]
	var heads := {"front": Vector2(1, 0), "side": Vector2(1, -1), "down": Vector2(1, 1), "back": Vector2(0, -1)}
	for s in shots:
		for hn in heads:
			b.face_ground(heads[hn], true)
			b.anim.play(s[0], 0.0)
			b.anim.seek(s[1], true)
			b.anim.pause()
			b._process(0.0)
			for i in 3:
				await process_frame
			var img: Image = b.vp.get_texture().get_image()
			img.save_png("%s/%s_%s_%s.png" % [out, s[0], str(s[1]).replace(".", "_"), hn])
	quit()
