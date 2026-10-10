shader_type canvas_item;
// shaders/reading_veil.gdshader: the Reading's slow breathing dark at the edges of the cloth (ui/reading.gd). Under the
// cards, over the dimmed cave: the corners close in and open again on a long breath. Black, never coloured; no fog.
// Every cell 2 x 2 screen px, its levels laid out on a 4 x 4 ordered dither of 2-px cells (MASTER_RULES 3.7).

uniform vec2 size = vec2(1920.0, 1080.0);
uniform float breath = 0.0;              // 0 .. 1, the slow breath (driven by ui/reading.gd)
uniform float strength = 0.0;            // 0 .. 1, faded in with the Reading

float bayer4(vec2 c) {
	int x = int(mod(c.x, 4.0));
	int y = int(mod(c.y, 4.0));
	int B[16] = int[](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
	return (float(B[y * 4 + x]) + 0.5) / 16.0;
}

void fragment() {
	vec2 cell = floor(UV * size / 2.0);          // the 2 x 2 grid
	vec2 p = (cell * 2.0 - size * 0.5) / (size.y * 0.5);
	p.x *= 0.82;
	float d = length(p);
	float r0 = 0.62 - 0.07 * breath;
	float v = smoothstep(r0, r0 + 0.95, d) * (0.62 + 0.18 * breath) * strength;
	float on = step(bayer4(cell), v);
	COLOR = vec4(0.0, 0.0, 0.004, on);
}
