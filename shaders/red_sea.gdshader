// The Red, live (world/red_sea.gd): the surface, a grid on the shore's (s, t) in VERTEX.xz, heaved by the beat
shader_type spatial;
render_mode unshaded, cull_disabled, skip_vertex_transform, depth_draw_opaque;

#include "res://shaders/red_sea.gdshaderinc"

varying vec3 P;
varying vec3 NRM;
uniform int debug = 0;

void vertex() {
	float s = VERTEX.x + win.x;
	float t = VERTEX.z + win.y;
	float z = sea_z(s, t, fld(s, t).r);
	// a smooth normal from the surface a hand's breadth on (the swells read as broad glossy bands, not facets)
	float e = 0.12;
	float zs = sea_z(s + e, t, fld(s + e, t).r);
	float zt = sea_z(s, t + e, fld(s, t + e).r);
	NRM = normalize(vec3(-(zs - z) / e, -(zt - z) / e, 1.0));
	P = vec3(s, t, z);
	POSITION = to_clip(s, t, z);
}

void fragment() {
	float s = P.x;
	float t = P.y;
	vec3 f = fld(s, t);
	if (debug == 0 && f.g > 0.5)
		discard;                                       // rock, a column: the water stands round it
	float depth = P.z - f.r;
	if (debug == 0 && depth < 0.004)
		discard;                                       // the sand stands above it here
	vec2 px = FRAGCOORD.xy;
	// the film's thin edge: a dithered coverage, so the lip of the swash is ragged pixels, never a smooth fade
	if (depth < 0.045 && bayer4(px) > depth / 0.045 + 0.2)
		discard;
	vec3 n = normalize(NRM);
	float ph = phase(t);
	float sb = break_s(t);
	float foam = 0.0;
	float fage = 0.0;
	// the bore's foam (chapter 13, section 3), laid as the break runs along the crest (the sideways trail), carried in,
	// then drawn back out and along the shore by the current. Stage A: a mat, heaped and lumpy, few holes. Stage B: the
	// mat thins and tears: round holes punched in it by the boils, growing and stretching along the drift until only a
	// lace of holes is left, then scraps, then nothing. Holes in a sheet, never lines on the water; white scarce.
	float age = foam_age(s, t);
	if (age < 0.8 && s < sb + 0.3 + 1.0 * vn1(t * 0.5 + age * 3.0, 39.0)) {
		vec2 q = vec2(s + age * 1.8, t - age * 6.5);
		// the mat's own extent: patches, shrinking as it drains
		float nz = vn2(q * vec2(0.8, 1.3), 21.0) * 0.6 + vn2(q * vec2(2.2, 3.5), 23.0) * 0.4;
		float mat_ = step(0.42 + 0.45 * age, nz);
		// the holes: stretched along the drift (in t), growing with age
		float hole = worley(q * vec2(3.2, 2.0), 41.0);
		float hr = 0.2 + 0.55 * smoothstep(0.02, 0.6, age);
		float holes = step(hole, hr);
		// the heap's lumps: thick fresh foam a little lifted, its lit tops the only near-white
		float lump = vn2(q * vec2(6.0, 9.0), 29.0);
		if (mat_ > 0.5 && holes < 0.5) {
			// lumps: the mat heaped and hollowed, its tone by its own small relief
			foam = (age < 0.12 ? 0.35 + 0.65 * lump * lump : 0.2 + 0.35 * lump - 0.2 * age) * (0.9 + 0.2 * grp);
			fage = age;
		}
	}
	// the crest spilling as it comes over: ragged white along its top in the last moments before the break
	vec2 cH = crest(min(ph, 0.38), t);
	if (ph > 0.24 && ph < 0.38 && abs(s - cH.x + 0.15) < 0.2 + 0.35 * (ph - 0.24) / 0.14) {
		if (vn2(vec2(s * 3.0, t * 4.5 - heart * 2.0), 37.0) > 0.74 - (ph - 0.24) * 0.9)
			foam = max(foam, 0.5);                     // (thick: a skin wrinkling over, never a burst of white)
	}
	// the swash's running front: a low roll of foam along its nose while it climbs
	vec3 sw = swash_front(t);
	if (sw.z > 0.5 && s >= sw.x && s < sw.x + 0.3 + 0.25 * vn1(t * 2.3, 47.0)) {
		if (vn2(vec2(s * 5.0, t * 3.0), 41.0) > 0.3)
			foam = max(foam, 0.8);
	}
	// round the columns: a collar the bore piles against them, and a wake of it trailing back on the draw
	float cd = f.b;
	if (cd < 2.6) {
		float surge = clamp(1.0 - age * 2.0, 0.0, 1.0);
		float rim = 0.25 + 0.5 * surge + 0.15 * vn2(vec2(s, t) * 2.0 + secs * 0.2, 43.0);
		float wake = vn2(vec2((s - age * 2.0) * 1.6, t * 2.4), 53.0);
		if (cd < rim || (cd < 2.4 && wake > 0.62 + cd * 0.12))
			foam = max(foam, 0.7 * (1.0 - cd / 3.0) + 0.3);
	}
	ALBEDO = shade(n, foam, depth, px, fage);
	if (debug == 1)
		ALBEDO = vec3(fract(s / 10.0), fract(t / 10.0), step(WATER, s));
}
