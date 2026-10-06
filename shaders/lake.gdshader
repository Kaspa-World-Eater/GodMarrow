shader_type canvas_item;
// A lake, painted (Derek 2026-10-06: Understory's "gouache and ink on warm paper" as a test of a painterly layer).
// Water or blood. Gouache traits in whole world pixels: the pigment pools dark at the shoreline (the wet edge of a
// wash), the surface is laid in dry-brush strokes running with the wind, a paper grain sits under it (fixed in the
// world, so it does not swim), and the light on it is broken into brush dabs, not a smooth sheen. The shore laps in and
// out, wetting a band of ground; rings spread where things wade or drops fall (ripples[] from world/impacts.gd); blood
// has clots drifting in it, a skin that wrinkles slowly, and a duller, heavier gloss.
uniform float t = 0.0;
uniform float seed = 0.0;
uniform int kind = 0;                       // 0 water, 1 blood
uniform vec2 rect_size = vec2(400.0, 200.0);
uniform vec2 half_px = vec2(180.0, 90.0);
uniform vec2 wind = vec2(1.0, 0.0);         // Gust: its way (x) and strength (y)
uniform vec2 world_ofs = vec2(0.0);         // the rect's world position (the grain is fixed to the world)
uniform vec4 ripples[8];                    // x, y (px in the rect), age (s), strength

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 13.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 9.0) * 0.3 + vn(p * 4.3 + 3.0) * 0.15; }

vec3 ramp(float v, int k) {
	// five tones each: deep, body, mid, lit, glint
	if (k == 0) {
		if (v > 0.9) return vec3(0.86, 0.9, 0.84);
		if (v > 0.68) return vec3(0.44, 0.55, 0.56);
		if (v > 0.46) return vec3(0.22, 0.31, 0.34);
		if (v > 0.24) return vec3(0.12, 0.18, 0.21);
		return vec3(0.06, 0.09, 0.11);
	}
	if (v > 0.9) return vec3(0.92, 0.55, 0.48);
	if (v > 0.68) return vec3(0.55, 0.1, 0.1);
	if (v > 0.46) return vec3(0.36, 0.04, 0.06);
	if (v > 0.24) return vec3(0.22, 0.02, 0.04);
	return vec3(0.1, 0.01, 0.02);
}

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = (B4[(g.y & 3) * 4 + (g.x & 3)] + 0.5) / 16.0;
	vec2 c = rect_size * 0.5;
	vec2 q = (px + 2.0 - c) / half_px;
	float r = length(q);
	vec2 dir = q / max(r, 0.001);
	float edge = 0.78 + 0.3 * fbm(dir * 2.0 + seed);                     // the lobed shore
	float lap = 0.035 * sin(t * 0.9 + fbm(dir * 3.0 + seed) * 6.0);        // the shore lapping in and out
	float shore = edge + lap;
	vec2 wp = px + world_ofs;                                              // world px, for the grain
	float grain = vn(wp * 0.045 + 71.0) * 0.7 + vn(wp * 0.12) * 0.3;          // paper tooth: soft, broad
	vec4 col = vec4(0.0);
	float heavy = kind == 1 ? 0.35 : 1.0;                                  // blood moves less
	if (r < shore) {
		float depth = 1.0 - r / max(shore, 0.001);
		// dry-brush: noise stretched along the wind, drifting with it
		vec2 wd = normalize(vec2(wind.x, 0.35));
		vec2 ax = vec2(dot(px, wd), dot(px, vec2(-wd.y, wd.x)));
		float stroke = vn(vec2(ax.x * 0.012 - t * 0.25 * heavy * (0.5 + wind.y), ax.y * 0.16));
		float stroke2 = vn(vec2(ax.x * 0.03 + t * 0.4 * heavy, ax.y * 0.3 + 5.0));
		float v = 0.1 + depth * 0.24 + (stroke - 0.5) * 0.3 + (stroke2 - 0.5) * 0.06 + (grain - 0.5) * 0.05 - (kind == 1 ? 0.07 : 0.0);
		// ripples: thin broken rings
		float rip = 0.0;
		for (int i = 0; i < 8; i++) {
			vec4 rp = ripples[i];
			if (rp.w <= 0.0) continue;
			vec2 dv = (px + 2.0 - rp.xy) * vec2(1.0, 2.0);
			float rr = length(dv);
			float rad = rp.z * (kind == 1 ? 22.0 : 46.0);
			float band = 1.0 - smoothstep(0.0, 5.0, abs(rr - rad));
			float br = step(0.35, vn(vec2(atan(dv.y, dv.x) * 4.0, rp.z)));     // broken, like a brush lifted
			rip += band * br * rp.w * (1.0 - smoothstep(0.4, 1.6, rp.z));
		}
		v += rip * 0.5;
		// the light broken into dabs: a sheen band toward the sky side, dabbed
		float sheen = smoothstep(0.25, 0.95, -q.y * 0.5 + 0.55 + (stroke - 0.5) * 0.6) * (kind == 1 ? 0.55 : 1.0);
		float dab = step(0.66, vn(vec2(ax.x * 0.035 - t * 0.5 * heavy, ax.y * 0.22 + 31.0)));   // a loaded brush dragged with the wind
		v += sheen * dab * (kind == 1 ? 0.3 : 0.4);
		if (kind == 1) {
			// clots drifting, and a skin that wrinkles slowly
			float clot = vn(px * 0.035 + vec2(t * 0.05, t * 0.03) + 40.0);
			if (clot > 0.74) v = min(v, 0.14 + (grain - 0.5) * 0.05);
			float wr = 1.0 - abs(vn(px * 0.06 + vec2(t * 0.04, 0.0)) * 2.0 - 1.0);
			if (wr > 0.9) v += 0.16;
		}
		// the wet edge of the wash: pigment pools dark at the shoreline, then a thin lit lip
		float toE = shore - r;
		if (toE < 0.07) v -= 0.22 * (1.0 - toE / 0.07);
		float lv = clamp(v + (d - 0.5) * 0.07, 0.0, 1.0);
		col = vec4(ramp(lv, kind), 1.0);
		if (toE < 0.018) col.rgb = kind == 1 ? vec3(0.42, 0.06, 0.07) : vec3(0.3, 0.38, 0.42);
	} else if (r < shore + 0.09 + abs(lap) * 1.5) {
		// the wet band of ground the lapping leaves: darkened, in broken dabs, with grain showing
		float wet = 1.0 - (r - shore) / (0.09 + abs(lap) * 1.5);
		if (wet * 0.8 + (grain - 0.5) * 0.4 > d) col = kind == 1 ? vec4(0.16, 0.02, 0.03, 0.55) : vec4(0.02, 0.03, 0.04, 0.45);
		if (kind == 0 && wet > 0.75 && vn(px * 0.2 + vec2(t * 1.5, 0.0)) > 0.7) col = vec4(0.62, 0.7, 0.72, 0.6);   // foam, in dabs
	}
	COLOR = col;
}
