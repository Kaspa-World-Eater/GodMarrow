shader_type canvas_item;
// Miasma (the god's dying breath, as on the title): heavy, it lies low and creeps; its body churns slowly in three
// dithered levels of sick violet-green; at its edge, tendrils curl up and fall back; inside it, now and then, a face
// surfaces (two hollows and a mouth) and sinks again. Whole world pixels, as the title's breath.
uniform float t = 0.0;
uniform float life = 1.0;
uniform float seed = 0.0;
uniform vec2 half_px = vec2(90.0, 45.0);
uniform vec2 rect_size = vec2(200.0, 160.0);
uniform float rise_h = 70.0;
uniform vec3 c_lo = vec3(0.18, 0.08, 0.28);
uniform vec3 c_mid = vec3(0.22, 0.34, 0.16);
uniform vec3 c_hi = vec3(0.42, 0.62, 0.2);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 3.3) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 9.0) * 0.3 + vn(p * 4.3 + 3.0) * 0.15; }

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = B4[(g.y & 3) * 4 + (g.x & 3)] / 16.0;
	vec2 c = vec2(rect_size.x * 0.5, rise_h + half_px.y);
	vec2 q = (px - c) / half_px;
	// the low body: an ellipse on the ground, ragged, thick in the middle
	float n = fbm(px * 0.025 + vec2(t * 0.12, -t * 0.05));
	float body = (1.0 - length(q) * (0.85 + 0.3 * n)) * 1.6;
	// tendrils: above the ground ellipse, columns of noise rising and falling
	float up = (c.y - px.y) / rise_h;                                   // 0 at the ground .. 1 at the top
	float col_n = fbm(vec2(px.x * 0.03, px.y * 0.02 + t * 0.6));
	float tend = (up > 0.0) ? (col_n * 1.4 - 0.55 - up * 0.9) * (1.0 - smoothstep(0.75, 1.15, abs(q.x))) : -1.0;
	float dens = max(body, tend) * life;
	dens *= n * 1.5 + 0.2;
	float lv = dens + d * 0.25;
	vec4 col = vec4(0.0);
	if (lv > 0.62) col = vec4(c_hi, 0.72);
	else if (lv > 0.4) col = vec4(c_mid, 0.6);
	else if (lv > 0.22) col = vec4(c_lo, 0.5);
	// faces: a cell grid inside the body; a cell's face rises and sinks on its own slow clock
	if (body > 0.5) {
		vec2 cell = floor(px / 36.0);
		float ph = sin(t * (0.35 + h21(cell) * 0.4) + h21(cell + 2.0) * 6.28);
		if (ph > 0.7 && h21(cell + 4.0) > 0.55) {
			vec2 o = px - (cell * 36.0 + 18.0);
			float k = (ph - 0.7) / 0.3;
			bool eye = (abs(o.x - 6.0) < 3.0 || abs(o.x + 6.0) < 3.0) && abs(o.y + 4.0) < 3.0;
			bool mouth = abs(o.x) < 4.0 && abs(o.y - 7.0) < (2.0 + 3.0 * k);
			if ((eye || mouth) && d < k) col = vec4(0.04, 0.03, 0.06, 0.8 * life);
			else if (length(o * vec2(1.0, 0.8)) < 15.0 && col.a > 0.0) col.rgb = mix(col.rgb, c_hi * 1.2, 0.35 * k);
		}
	}
	COLOR = col;
}
