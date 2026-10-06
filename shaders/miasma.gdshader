shader_type canvas_item;
// Miasma (wiki 05-class-shrine-keeper, 14-mechanics: "a purple, drifting haze that thickens"; "No green: every
// particle is purple gas"). Fog, not smoke: it covers what lies under it (the scene behind is softened and sunk into
// violet), thick in its heart and thinning to a dithered edge; two layers drift at different speeds, so it rolls; its
// upper edge lifts in slow billows. Now and then a face shows in it, barely, and is gone.
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform float t = 0.0;
uniform float life = 1.0;
uniform float seed = 0.0;
uniform vec2 half_px = vec2(90.0, 45.0);
uniform vec2 rect_size = vec2(200.0, 160.0);
uniform float rise_h = 70.0;
uniform float thick = 1.0;          // how dense at its heart (a choking cloud > 1)
uniform vec2 drift = vec2(1.0, 0.25);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 3.3) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.5 + vn(p * 2.03 + 9.0) * 0.3 + vn(p * 4.1 + 3.0) * 0.2; }

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = B4[(g.y & 3) * 4 + (g.x & 3)] / 16.0;
	vec2 c = vec2(rect_size.x * 0.5, rise_h + half_px.y);
	vec2 q = (px - c) / half_px;
	// two layers rolling past each other
	float a = fbm(px * 0.006 + vec2(t * 0.05 * drift.x, t * 0.012) + seed);
	float b = fbm(px * 0.012 - vec2(t * 0.07, -t * 0.02) + seed * 2.0);
	// the shape: a soft mass, low and wide on the ground, rising rounded above it; its edge torn by the drift
	float py = (px.y - c.y) / (px.y < c.y ? (rise_h + half_px.y * 0.5) : half_px.y);
	float mass = 1.0 - length(vec2(q.x, py)) + (a - 0.5) * 0.7 + (b - 0.5) * 0.3;
	float dens = smoothstep(-0.1, 0.9, mass) * (0.6 + 0.4 * a) * thick * life;
	if (dens < 0.04 + d * 0.08) {
		COLOR = vec4(0.0);
	} else {
		// the scene under it, softened (four taps) and sunk into violet
		vec2 tx = 1.0 / vec2(textureSize(screen_tex, 0));
		vec3 under = (texture(screen_tex, SCREEN_UV + vec2(tx.x * 6.0, 0)).rgb + texture(screen_tex, SCREEN_UV - vec2(tx.x * 6.0, 0)).rgb
			+ texture(screen_tex, SCREEN_UV + vec2(0, tx.y * 6.0)).rgb + texture(screen_tex, SCREEN_UV - vec2(0, tx.y * 6.0)).rgb) * 0.25;
		float lv = dens * 3.0 + d * 0.25;
		vec3 fog = lv > 2.2 ? vec3(0.36, 0.32, 0.74) : lv > 1.4 ? vec3(0.24, 0.2, 0.58) : vec3(0.14, 0.11, 0.4);
		// ghostly: thin, the world shows through it
		float cover = clamp(dens * 0.55, 0.0, 0.45);
		vec3 col = mix(under * vec3(0.85, 0.8, 1.0), fog * 0.7, cover);
		// pale wisps winding through it: thin ridges of a slow, stretched noise, glowing lavender
		// a few long wisps: single, slow, stretched ridges, shown only where a second slow field allows
		float w1 = 1.0 - abs(vn(vec2(px.x * 0.008 - t * 0.1 * drift.x, px.y * 0.03 + t * 0.04)) * 2.0 - 1.0);
		float gate = smoothstep(0.55, 0.75, vn(px * 0.006 + vec2(t * 0.03, 0.0) + 17.0));
		float wisp = smoothstep(0.9, 0.98, w1) * gate * smoothstep(0.1, 0.5, dens);
		col = mix(col, vec3(0.74, 0.7, 0.96), wisp * 0.55);
		// faces: they surface pale, glowing faintly, their eyes and mouth hollow, and sink again
		if (dens > 0.35) {
			vec2 cell = floor(px / 44.0);
			float ph = sin(t * (0.3 + h21(cell) * 0.35) + h21(cell + 2.0) * 6.28);
			if (ph > 0.6 && h21(cell + 4.0) > 0.72) {
				vec2 o = px - (cell * 44.0 + 22.0) - vec2(sin(t * 0.7 + h21(cell) * 6.0) * 4.0, -ph * 4.0);
				float k = (ph - 0.6) / 0.4;
				float head = length(o * vec2(1.0, 0.78));
				bool eye = (abs(o.x - 6.0) < 3.0 || abs(o.x + 6.0) < 3.0) && abs(o.y + 3.0) < 3.0;
				bool mouth = abs(o.x) < 3.0 && o.y > 5.0 && o.y < 8.0 + 6.0 * k;   // it opens as it rises
				if (head < 15.0 && d < k * 0.9) col = mix(col, vec3(0.72, 0.68, 0.92), 0.35 * k);
				if ((eye || mouth) && d < k) col = mix(col, vec3(0.06, 0.04, 0.12), 0.8);
			}
		}
		COLOR = vec4(col, 1.0);
	}
}
