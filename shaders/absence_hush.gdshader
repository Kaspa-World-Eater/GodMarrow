shader_type canvas_item;
// Absence, the closed hand (docs/wiki/05-class-empty-hand.md: "erases with dark: the palm that swallows"). A hole in
// the world: the scene round it is drawn inward (read from further out, so it shrinks toward the middle) and drained,
// darkening to a true black at the heart, a thin violet-grey lip where the dark meets what is left, dark rays creeping
// in along the ground, and round it all a ring where the light is already thinner. Whole world pixels, the dither.
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform float t = 0.0;
uniform float life = 1.0;
uniform float seed = 0.0;
uniform vec2 rect_size = vec2(300.0, 150.0);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 13.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 9.0) * 0.3 + vn(p * 4.3 + 3.0) * 0.15; }

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = (B4[(g.y & 3) * 4 + (g.x & 3)] + 0.5) / 16.0;
	vec2 off = px + 2.0 - rect_size * 0.5;                 // from the heart, in screen px
	vec2 q = off / (rect_size * 0.5);
	float e = length(q) * 1.6;                              // the hole fills the inner part; the thinning ring the rest
	float ang = atan(q.y, q.x * 0.5);
	float n = fbm(vec2(ang * 2.0 + seed, e * 2.0 - t * 0.6));
	float k = (1.0 - smoothstep(0.3, 1.0, e + (n - 0.5) * 0.4)) * life;
	// dark rays creeping in along the ground
	float ray = smoothstep(0.82, 0.95, vn(vec2(ang * 5.0 + seed, 0.0))) * (1.0 - smoothstep(0.6, 1.45, e)) * life;
	// the pull: read the world from further out, turned a little, so it is drawn in and round
	float a = k * 0.55;
	float rot = k * 0.5 * sin(t * 0.7);
	vec2 ro = vec2(off.x * cos(rot) - off.y * sin(rot), off.x * sin(rot) + off.y * cos(rot));
	vec2 suv = SCREEN_UV + (ro * (1.0 + a) - off) * SCREEN_PIXEL_SIZE;
	suv = (floor(suv / SCREEN_PIXEL_SIZE / 4.0) * 4.0 + 2.0) * SCREEN_PIXEL_SIZE;
	vec3 sc = texture(screen_tex, suv).rgb;
	vec3 col = sc * (1.0 - smoothstep(0.0, 0.9, k) * 0.95);
	if (k > 0.55 + d * 0.3) col = vec3(0.02, 0.012, 0.03);                      // the heart: nothing
	else if (k > 0.4 + d * 0.25 && k < 0.62) col = mix(col, vec3(0.34, 0.28, 0.44), 0.55);   // its lip
	if (ray > d) col *= 0.25;
	// the ring round it, where the light is already thinner
	float ring = (1.0 - smoothstep(0.9, 1.6, e)) * life;
	col *= 1.0 - ring * 0.35;
	float show = max(max(k, ring), ray);
	COLOR = vec4(col, step(0.01, show));
}
