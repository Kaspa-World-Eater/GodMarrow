shader_type canvas_item;
// Acid (Derek: "acid etc ... be very creative"): a pool that eats into the ground: its rim a corroded brown-black
// ring where the ground is being dissolved; inside, sick green with darker eddies; bubbles swell and pop (a ring that
// widens and is gone); above it the air bends green in its fumes (the heat shimmer's method). Whole world pixels.
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform float t = 0.0;
uniform float spread = 1.0;
uniform float fade = 1.0;
uniform float seed = 0.0;
uniform vec2 half_px = vec2(70.0, 35.0);
uniform vec2 rect_size = vec2(160.0, 140.0);
uniform float fume_h = 60.0;

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 9.3) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 9.0) * 0.3 + vn(p * 4.3 + 3.0) * 0.15; }

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = B4[(g.y & 3) * 4 + (g.x & 3)] / 16.0;
	vec2 c = vec2(rect_size.x * 0.5, fume_h + half_px.y);
	vec2 q = (px - c) / half_px;
	float r = length(q);
	float edge = spread * (0.8 + 0.3 * fbm(normalize(q + 0.0001) * 2.0 + seed));
	vec4 col = vec4(0.0);
	if (r < edge) {
		if (r > edge - 0.12) {
			col = vec4(mix(vec3(0.07, 0.05, 0.03), vec3(0.26, 0.2, 0.08), step(0.6, d)), 0.9 * fade);   // the corroded rim
		} else {
			float e = fbm(px * 0.04 + vec2(t * 0.25, -t * 0.18));
			float lv = e * 2.4 + d * 0.7;
			vec3 a0 = vec3(0.05, 0.1, 0.03), a1 = vec3(0.14, 0.26, 0.05), a2 = vec3(0.32, 0.52, 0.08), a3 = vec3(0.72, 0.92, 0.32);
			vec3 cc = lv > 2.4 ? a2 : lv > 1.5 ? a1 : a0;
			// bubbles: cells that swell and pop, each on its own clock
			vec2 cell = floor(px / 28.0);
			float ph = fract(t * (0.4 + h21(cell) * 0.6) + h21(cell + 3.0));
			vec2 bc = (cell + 0.5) * 28.0 + (vec2(h21(cell + 5.0), h21(cell + 7.0)) - 0.5) * 12.0;
			float bd = length((px - bc) * vec2(1.0, 2.0));
			float br = ph * 13.0;
			bool live = h21(cell + 11.0) > 0.45;
			if (live && ph < 0.8 && bd < br) cc = (bd > br - 4.0) ? a3 : mix(a2, a1, 0.3);                 // the swelling dome, lit rim
			else if (live && ph >= 0.8 && abs(bd - (ph - 0.8) * 60.0) < 3.0) cc = a3;          // the pop: a ring
			col = vec4(cc, 0.95 * fade);
		}
	}
	// fumes: above the pool the air wavers green
	float above = (px.y < c.y) ? 1.0 : 0.0;
	float fx = 1.0 - smoothstep(0.4, 1.0, abs(q.x));
	float fy = smoothstep(0.0, fume_h, c.y - px.y) * (1.0 - smoothstep(fume_h * 0.5, fume_h + half_px.y, c.y - px.y));
	float near = fx * (above > 0.5 ? (1.0 - fy * 0.6) * step(r, 2.5) : 0.0) * fade * spread;
	if (col.a < 0.5 && near > 0.1 && px.y < c.y - half_px.y * 0.6) {
		vec2 off = vec2(sin(px.y * 0.11 + t * 5.0), cos(px.x * 0.09 + t * 4.0)) * 4.0 * near / vec2(textureSize(screen_tex, 0));
		vec3 bent = texture(screen_tex, SCREEN_UV + off).rgb;
		col = vec4(mix(bent, vec3(0.5, 0.8, 0.2), 0.12 * near), 1.0);
	}
	COLOR = col;
}
