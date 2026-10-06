shader_type canvas_item;
// Radiance, the open hand (docs/wiki/05-class-empty-hand.md: "noon with no shadow: white fire, glare, a brightness so
// complete it leaves nothing to see"). A patch of the world under a glare that erases: the scene behind is read and
// washed out (its shadows lifted first, its detail flattened) into four white-gold tones in whole world pixels, the
// ordered dither eating the ragged rim; shafts of noon fall through it, and gold-leaf glints wink in the glare.
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform float t = 0.0;
uniform float life = 1.0;          // 0..1: flares in, holds, fades
uniform float seed = 0.0;
uniform vec2 rect_size = vec2(300.0, 150.0);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 13.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 9.0) * 0.3 + vn(p * 4.3 + 3.0) * 0.15; }

vec3 tone(float l) {               // the glare's four tones: burnt gold, gold, pale gold, white
	if (l > 0.86) return vec3(1.0, 0.99, 0.94);
	if (l > 0.66) return vec3(1.0, 0.9, 0.66);
	if (l > 0.42) return vec3(0.92, 0.72, 0.38);
	return vec3(0.6, 0.42, 0.2);
}

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = (B4[(g.y & 3) * 4 + (g.x & 3)] + 0.5) / 16.0;
	vec2 q = (px + 2.0 - rect_size * 0.5) / (rect_size * 0.5);
	float e = length(q);
	float n = fbm(px * 0.03 + vec2(t * 0.4, 0.0));
	float k = (1.0 - smoothstep(0.45, 1.0, e + (n - 0.5) * 0.35)) * life;
	// shafts of noon falling through it, slow
	float shaft = smoothstep(0.55, 0.85, vn(vec2(px.x * 0.025 + px.y * 0.012 + t * 0.25, seed)));
	k = clamp(k * (0.85 + 0.35 * shaft), 0.0, 1.0);
	vec2 sp = SCREEN_UV;
	vec3 sc = texture(screen_tex, sp).rgb;
	float l = dot(sc, vec3(0.3, 0.59, 0.11));
	// shadows go first: the darkest are lifted most, then all of it flattens toward one blinding value
	float lifted = mix(l * 1.4, 1.0, k * 0.5) + (1.0 - l) * k * 0.12;
	vec3 erased = tone(clamp(lifted + (d - 0.5) * 0.18, 0.0, 1.0));
	vec3 col = sc;
	if (k > d * 0.95) col = erased;
	else if (k > 0.02) col = mix(sc, vec3(1.0, 0.9, 0.66), k * 0.5);   // the rim: the scene only warming, not yet gone
	// gold-leaf glints winking in the glare
	vec2 cell = floor(px / 8.0);
	float hh = h21(cell + 3.0);
	if (k > 0.3 && hh > 0.975 && sin(t * 7.0 + hh * 60.0) > 0.6) col = vec3(1.0);
	COLOR = vec4(col, step(0.01, k));
}
