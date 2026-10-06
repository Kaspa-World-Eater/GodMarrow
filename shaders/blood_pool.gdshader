shader_type canvas_item;
// Blood on the ground, the liquid fire's method turned to blood (Derek 2026-10-06: "blood can borrow from it too"): it
// runs out from where the body fell, its edge seeping forward in fingers; its surface slowly churns and takes a wet
// gloss where the light is (a bright rim on the side toward the lantern); as it ages it darkens, goes dull and its edge
// cracks dry. Whole world pixels, a short red ramp, the 4x4 ordered dither.
uniform float t = 0.0;            // seconds since it began
uniform float spread = 1.0;       // 0..1 how far it has run
uniform float dry = 0.0;          // 0 wet .. 1 dried
uniform float fade = 1.0;         // overall alpha (its last seconds)
uniform float seed = 0.0;
uniform vec2 half_px = vec2(60.0, 30.0);
uniform vec2 rect_size = vec2(140.0, 80.0);
uniform vec2 light_dir = vec2(-0.6, -0.8);   // toward the lantern, screen
uniform vec3 tint = vec3(1.0);    // bile, ichor: a multiplier on the ramp

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 17.3) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 9.0) * 0.3 + vn(p * 4.3 + 3.0) * 0.15; }

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = B4[(g.y & 3) * 4 + (g.x & 3)] / 16.0;
	vec2 c = rect_size * 0.5;
	vec2 q = (px - c) / half_px;
	float r = length(q);
	vec2 dir = q / max(r, 0.001);
	// the edge: lobed, with fingers that seep further than the rest
	float lobe = 0.75 + 0.35 * fbm(dir * 2.2 + seed);
	float finger = pow(max(0.0, fbm(dir * 6.0 + seed * 2.0) - 0.45) * 2.0, 2.0) * 0.6;
	float edge = spread * (lobe + finger);
	vec4 col = vec4(0.0);
	if (r < edge) {
		float depth = 1.0 - r / max(edge, 0.001);                       // deeper in the middle
		float churn = fbm(px * 0.05 + vec2(t * 0.15, -t * 0.1));
		float v = depth * 0.7 + churn * 0.35;
		// the ramp: near-black clot, dark red, the body, a lit red; drying pulls it all darker and browner
		float lv = v * 3.6 + d * 0.8 - dry * 1.4;
		vec3 c0 = vec3(0.09, 0.01, 0.02), c1 = vec3(0.24, 0.02, 0.04), c2 = vec3(0.42, 0.04, 0.06), c3 = vec3(0.6, 0.08, 0.08);
		vec3 cc = lv > 2.6 ? c3 : lv > 1.7 ? c2 : lv > 0.8 ? c1 : c0;
		cc = mix(cc, vec3(0.16, 0.06, 0.04), dry * 0.6);
		// the wet rim of light on the side toward the lantern, and a few glints on the surface
		float rim = step(edge - 0.08, r) * max(0.0, dot(dir, normalize(light_dir))) * (1.0 - dry);
		float glint = step(0.92, fbm(px * 0.12 + vec2(t * 0.4, 0.0))) * (1.0 - dry) * depth;
		if (rim > 0.45 + d * 0.3 || glint > 0.5) cc = vec3(0.86, 0.36, 0.3);
		// a dried edge cracks: a darker broken line just inside the rim
		if (dry > 0.5 && r > edge - 0.1 && d < dry - 0.4) cc *= 0.55;
		col = vec4(cc * tint, 0.92 * fade);
	}
	COLOR = col;
}
