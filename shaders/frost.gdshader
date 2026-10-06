shader_type canvas_item;
// Ice on the ground: a sheet of faceted glass grown out from where the cold struck. Each facet (a cell) bends the
// ground under it a little its own way (the shimmer's trick: the scene read and shifted), tinted cold blue, darker in
// its depths; the facets' edges catch the light in white lines; at the growing front the ice is feathered (frost
// ferns: spines with barbs), white; it glitters; it melts back from its edge. Whole world pixels.
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform float t = 0.0;
uniform float grow = 1.0;
uniform float melt = 0.0;
uniform float seed = 0.0;
uniform vec2 half_px = vec2(90.0, 45.0);
uniform vec2 rect_size = vec2(200.0, 100.0);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h11(float x) { return fract(sin(x * 91.3 + seed * 3.7) * 43758.5453); }
vec2 h22(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))) + seed) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 5.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = B4[(g.y & 3) * 4 + (g.x & 3)] / 16.0;
	vec2 q = (px - rect_size * 0.5) / half_px;
	float r = length(q);
	float ang = atan(q.y, q.x);
	float reach = grow * (0.85 + 0.25 * vn(vec2(ang * 2.0, seed))) * (1.0 - melt * 0.9);
	vec4 col = vec4(0.0);
	if (r < reach) {
		// facets: the nearest and second-nearest cell centres (voronoi) in a squashed grid (the ground's perspective)
		vec2 gp = px / vec2(26.0, 13.0);
		vec2 ip = floor(gp);
		float d1 = 9.0, d2 = 9.0; vec2 id = vec2(0.0);
		for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
			vec2 o = vec2(float(i), float(j));
			vec2 cc = ip + o + h22(ip + o);
			float dd = length(gp - cc);
			if (dd < d1) { d2 = d1; d1 = dd; id = ip + o; } else if (dd < d2) { d2 = dd; }
		}
		vec2 tilt = (h22(id + 7.0) - 0.5) * 2.0;                      // this facet's slope
		vec2 tx = 1.0 / vec2(textureSize(screen_tex, 0));
		vec3 under = texture(screen_tex, SCREEN_UV + tilt * tx * 10.0).rgb;
		float depth = 0.5 + 0.5 * dot(tilt, vec2(-0.7, -0.7));          // facets tilted to the light are paler
		vec3 c = mix(under * vec3(0.45, 0.62, 0.95), vec3(0.42, 0.62, 0.9), 0.45) * (0.75 + 0.45 * depth);
		if (d2 - d1 < 0.08) c = mix(c, vec3(0.9, 0.97, 1.0), 0.8);         // facet edges catch the light
		// the feathered front
		float front = smoothstep(reach - 0.22, reach, r);
		if (front > 0.0) {
			float N = 11.0;
			float a = ang / 6.2831853 * N;
			float k = floor(a + 0.5);
			float sa = (k + (h11(k) - 0.5) * 0.4) / N * 6.2831853;
			vec2 sd = vec2(cos(sa), sin(sa));
			float across = abs(q.x * sd.y - q.y * sd.x);
			float bt = fract(dot(q, sd) * 14.0);
			bool feather = across < 0.03 || (abs(across - bt * 0.08) < 0.025 && across < 0.1);
			if (!feather && d > 0.25) { col = vec4(0.0); } else { c = mix(c, vec3(0.93, 0.98, 1.0), 0.7); }
			if (!feather && d > 0.25) c = vec3(-1.0);
		}
		if (c.r >= 0.0) {
			if (step(0.988, h21(px + floor(t * 6.0))) > 0.5) c = vec3(1.0);   // glitter
			col = vec4(c, 0.92);
		}
	}
	COLOR = col;
}
