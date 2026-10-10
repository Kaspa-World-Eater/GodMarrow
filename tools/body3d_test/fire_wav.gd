extends SceneTree
## the fire loops and the Red's sounds written out as .wav files to listen to (core/sfx.gd loop): godot --path . -s tools/body3d_test/fire_wav.gd -- OUT_DIR
func _initialize() -> void:
	var out: String = OS.get_cmdline_user_args()[0]
	var sfx = load("res://core/sfx.gd")
	for k in ["fire_torch", "fire_brazier", "fire_candle", "red_surge", "red_mass"]:
		var w: AudioStreamWAV = sfx.loop(k)
		print("WAV ", k, " ", w.save_to_wav(out + "/" + k + ".wav"))
	# the live Red's one-shots (world/red_sea.gd)
	print("WAV red_slump ", sfx.red_slump().save_to_wav(out + "/red_slump.wav"))
	print("WAV red_drag ", sfx.red_drag().save_to_wav(out + "/red_drag.wav"))
	quit()
