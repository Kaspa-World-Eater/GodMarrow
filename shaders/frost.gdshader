shader_type canvas_item;
// Frost on the ground (ice: "be very creative"): it grows out from where the cold struck in feathered crystals, the
// way frost ferns grow on glass: branching spines with side barbs, white at their tips, pale blue along them, a faint
// rime filling between; it glitters where the light catches it, then melts back from its edges. Whole world pixels.
uniform float t = 0.0;
uniform float grow = 1.0;          // 0..1 how far the feathers have reached
uniform float melt = 0.0;          // 0..1 melting back
uniform float seed = 0.0;
uniform vec2 half_px = vec2(90.0, 45.0);
uniform vec2 rect_size = vec2(200.0, 100.0);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h11(float x) { return fract(sin(x * 91.3 + seed * 3.7) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 5.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = B4[(g.y & 3) * 4 + (g.x & 3)] / 16.0;
	vec2 q = (px - rect_size * 0.5) / half_px;           // the ellipse of the ground, -1..1
	q.y *= 1.0;
	float r = length(q);
	float ang = atan(q.y, q.x);
	float reach = grow * (0.85 + 0.25 * vn(vec2(ang * 2.0, seed))) * (1.0 - melt * 0.9);
	vec4 col = vec4(0.0);
	if (r < reach) {
		// spines: N rays, each with barbs at an angle; a pixel is frost if it is near a spine or a barb
		float N = 9.0;
		float a = ang / 6.2831853 * N;
		float k = floor(a + 0.5);
		float sa = (k + (h11(k) - 0.5) * 0.4) / N * 6.2831853;      // the spine's angle, jittered
		vec2 sd = vec2(cos(sa), sin(sa));
		float along = dot(q, sd);
		float across = abs(q.x * sd.y - q.y * sd.x);
		float spine = 1.0 - smoothstep(0.0, 0.035, across);
		// barbs: every 0.1 along the spine, short lines at +-55 degrees
		float bt = fract(along * 9.0 + h11(k + 3.0));
		float barbw = (1.0 - bt) * 0.18 * (1.0 - along * 0.6);
		float barb = (1.0 - smoothstep(0.0, 0.03, abs(across - bt * 0.12))) * step(across, barbw);
		float rime = step(0.62 + d * 0.2, vn(px * 0.06)) * 0.6;
		float f = max(max(spine, barb), rime) * step(0.0, along);
		if (f > 0.5) {
			float tip = smoothstep(reach - 0.15, reach, r);              // the growing tips are white
			vec3 c = mix(vec3(0.36, 0.6, 0.92), vec3(0.82, 0.94, 1.0), max(tip, spine * 0.4));
			float glit = step(0.985, h21(px + floor(t * 6.0)));            // glitter
			c = mix(c, vec3(1.0), glit);
			col = vec4(c, (rime > 0.5 && spine < 0.5 && barb < 0.5) ? 0.45 : 0.9);
		}
	}
	COLOR = col;
}
