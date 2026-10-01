extends SceneTree
## Loads the PixelForge add-on scripts against real game data. Run: godot --headless --path . -s tests/addon_check.gd

func _init() -> void:
	var errs := 0
	var s := PFSpriteSet.new()
	if not s.load_file("res://art/sprites/wraith.json"):
		errs += 1
	var f := s.frame("walk", "front_l", 2)
	if f.is_empty() or not (f["tex"] is AtlasTexture):
		errs += 1
	var mirrored := s.frame("walk", "side_l", 0)
	print("ADDON sprite set: anims=%d walk/front frames=%d fps=%.1f side_l flip=%s" % [s.anims.size(), s.count("walk", "front"), s.fps("walk"), str(mirrored.get("flip"))])
	var dv := PFSpriteSet.dir_to_view(Vector2(-1, 0.2))
	print("ADDON dir_to_view(-1,0.2) = ", dv)
	var root := Node2D.new()
	var fx := PFFx.spawn(root, "res://art/fx", "world_hit_flash", Vector2(10, 10), 2.0)
	if fx == null or fx.sprite_frames.get_frame_count("play") != 4:
		errs += 1
	print("ADDON fx frames: ", fx.sprite_frames.get_frame_count("play") if fx else -1)
	var ob := PFObjects.place(root, "res://art/objects/objects.json", "statue0", Vector2.ZERO, 4.0)
	if ob == null:
		errs += 1
	print("ADDON object placed: ", ob != null, " scale ", ob.scale if ob else null)
	print("ADDON_RESULT errors ", errs)
	quit(errs)
