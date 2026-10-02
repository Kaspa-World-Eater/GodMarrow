shader_type canvas_item;
// The pixel dissolve between screens: a 4x4 Bayer threshold over the whole frame, in four steps each way at 24 fps.
uniform float level = 0.0;
uniform vec4 ink : source_color = vec4(0.04, 0.035, 0.055, 1.0);
const int B[16] = {0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5};

void fragment() {
	ivec2 p = ivec2(floor(FRAGCOORD.xy / 2.0));
	float th = (float(B[(p.y & 3) * 4 + (p.x & 3)]) + 0.5) / 16.0;
	if (th < level) {
		COLOR = ink;
	} else {
		COLOR = vec4(0.0);
	}
}
