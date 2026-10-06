shader_type canvas_item;
// Fire on the ground, as liquid (Derek 2026-10-05: "fire spreading should move like liquid"; "effects should be in the
// world, interacting with it"). The title's method: a value field (flowing, warped noise) snapped to a short ramp with
// the 4x4 ordered dither, in whole world pixels. The pool spreads out from where it fell with a bright licking rim and
// leaves a scorch behind it; tongues rise off its hottest parts and lean with the wind; it gutters as it dies.

uniform float t = 0.0;          // seconds alive
uniform float life = 1.0;       // 1 at full, falling to 0 as it dies
uniform float spread = 1.0;     // 0..1: how far it has run out
uniform vec2 half_px = vec2(72.0, 36.0);   // the pool's half size on screen
uniform float flame_h = 60.0;   // room above the pool for the tongues
uniform float seed = 0.0;
uniform float wind = 0.3;
uniform vec2 rect_size = vec2(160.0, 140.0);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 13.7) * 43758.5453); }
float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { return vnoise(p) * 0.55 + vnoise(p * 2.1 + 17.0) * 0.3 + vnoise(p * 4.3 + 3.0) * 0.15; }

// the pool's heat at a point relative to its centre (screen px), 0 outside the run of the fire
float pool(vec2 d) {
	float r = length(d / half_px);
	// the front: the run so far, ragged, licking forward
	vec2 dir = d / max(1.0, length(d));
	float ragged = 0.82 + 0.36 * vnoise(dir * 3.0 + vec2(t * 0.6, seed));
	float front = spread * ragged;
	if (r > front) return -1.0 + max(0.0, 1.0 - (r - front) / 0.18) * 0.6;   // the scorch just past it
	// flowing heat: the field drifts outward from the middle and churns, like something poured
	vec2 q = vec2(d.x, d.y * 2.0) / 26.0;
	vec2 w = vec2(fbm(q + vec2(t * 0.5, -t * 0.3)), fbm(q + vec2(-t * 0.4, t * 0.45) + 5.0));
	float v = fbm(q * 1.3 + w * 1.6 - dir * t * 0.7);
	// embers with bright veins through them: the heat runs in the folds of the flow
	float vein = 1.0 - abs(fbm(q * 0.9 - w * 1.2 + vec2(t * 0.2, 0.0)) * 2.0 - 1.0);
	float heat = v * (0.62 - r * 0.32) + pow(vein, 3.0) * 0.62;
	heat += smoothstep(front - 0.25, front, r) * 0.3;          // the licking rim burns brightest
	return heat * life;
}

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;                  // whole world pixels
	vec2 c = vec2(rect_size.x * 0.5, flame_h + half_px.y);
	vec2 d = px - c;
	ivec2 g = ivec2(px / 4.0);
	float dith = B4[(g.y & 3) * 4 + (g.x & 3)] / 16.0 - 0.47;
	vec4 col = vec4(0.0);
	float h = pool(d);
	if (h < 0.0) {
		// scorch: soot on the ground where it has run
		float s = h + 1.0;
		if (s > 0.15 + dith * 0.3) col = vec4(0.07, 0.035, 0.02, 0.55 * min(1.0, s * 1.6));
	} else {
		float lv = floor(h * 4.3 + dith * 0.9);
		if (lv <= 0.0) col = vec4(0.16, 0.05, 0.02, 0.85);
		else if (lv <= 1.0) col = vec4(0.48, 0.16, 0.06, 0.95);
		else if (lv <= 2.0) col = vec4(0.82, 0.38, 0.11, 1.0);
		else if (lv <= 3.0) col = vec4(0.94, 0.63, 0.25, 1.0);
		else col = vec4(1.0, 0.85, 0.56, 1.0);
	}
	// tongues: look down the column for heat beneath this pixel; a hot spot throws a tongue up to its height
	float lean = wind * 0.35;
	for (int i = 1; i <= 10; i++) {
		float s = float(i) * flame_h / 10.0;
		vec2 below = d + vec2(-lean * s, s);
		float hb = pool(below);
		if (hb > 0.68) {
			float tall = (0.25 + 0.75 * vnoise(vec2((px.x - lean * s) * 0.07 + seed, t * 2.4))) * flame_h * (hb - 0.6) * 2.2;
			if (s < tall) {
				float k = s / tall + dith * 0.3;            // hot at the root, dark at the tip
				vec4 fc = k < 0.25 ? vec4(0.98, 0.72, 0.36, 1.0) : k < 0.6 ? vec4(0.85, 0.38, 0.1, 1.0) : vec4(0.45, 0.13, 0.05, 0.85);
				if (col.a < 0.9 || k < 0.35) col = fc;
				break;
			}
		}
	}
	COLOR = col;
}
