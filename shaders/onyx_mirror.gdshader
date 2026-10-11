// The onyx in the colossal face's mouth (world/onyx_mirror.gd; Derek, 2026-10-10: "put a black onyx mirror in the
// mouth that shows a weird distorted reflection"). Polished black stone: almost nothing comes back from it but a slow
// grey sheen and the lit floor before it, faint and wrong; and the newborn, if it stands before it, seen from the front
// as the mirror would show it, but stretched a little too tall, swimming, with a second of itself a breath behind.
// Only the one who looks: the Stranger is not in it. On the 2 x 2 art grid.
shader_type canvas_item;

uniform sampler2D refl : filter_nearest, repeat_disable;  // the body seen in the mirror (entities/body3d.gd mirror_view)
uniform bool has_refl = false;
uniform vec2 refl_pos;             // the reflection picture's top-left, zone px
uniform vec2 refl_size;            // its size, zone px
uniform float refl_k = 0.0;        // how near the body stands (0 none .. 1 close): the reflection's strength
uniform vec2 base_pos;             // this node's place, zone px (its polygon is drawn relative to it)
uniform vec2 sill;                 // the mirror's sill, centre, zone px (the line the floor is reflected about)
uniform float top_y;               // the arch's top, zone px
uniform float zoom = 1.0;          // the camera's zoom (zone px to screen px)
uniform sampler2D screen : hint_screen_texture, filter_nearest;

varying vec2 W;

void vertex() {
	W = VERTEX + base_pos;
}

float bayer4(vec2 p) {
	ivec2 q = ivec2(mod(p, 4.0));
	int i = q.x + q.y * 4;
	float m[16] = float[](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
	return (m[i] + 0.5) / 16.0;
}

void fragment() {
	vec2 w = floor(W / 2.0) * 2.0 + 1.0;            // the art pixel
	vec2 cell = floor(W / 2.0);
	float h = clamp((sill.y - w.y) / max(sill.y - top_y, 1.0), 0.0, 1.0);   // 0 at the sill, 1 at the arch's top
	// the stone: black with violet in it, a slow sheen band walking across, a little more light low where the floor's
	// glow reaches
	vec3 c = vec3(0.016, 0.012, 0.02);
	float band = sin((w.x * 0.004 + w.y * 0.009) - TIME * 0.11);
	c += vec3(0.075, 0.068, 0.09) * smoothstep(0.8, 0.97, band);
	// a polished face: a thin cold highlight near the arch's crown where the hall's fires catch the curve
	c += vec3(0.06, 0.045, 0.04) * smoothstep(0.72, 0.95, h) * (0.6 + 0.4 * sin(TIME * 0.7 + w.x * 0.02));
	c += vec3(0.03, 0.012, 0.008) * (1.0 - h) * (1.0 - h);
	// the lit floor before it, held faintly and swimming: the screen below the sill, folded up into the stone
	vec2 fold = vec2(w.x + 6.0 * sin(w.y * 0.03 + TIME * 0.5), sill.y + (sill.y - w.y) * 0.8);
	vec2 suv = SCREEN_UV + (fold - w) * zoom * SCREEN_PIXEL_SIZE;
	if (suv.y < 1.0 && suv.y > 0.0) {
		vec3 fl = texture(screen, suv).rgb;
		c += fl * 0.34 * (1.0 - h * 0.7);
	}
	// the one before it: its reflection, swimming, too tall, with its ghost a breath behind
	if (has_refl && refl_k > 0.01) {
		vec2 uv = (w - refl_pos) / refl_size;
		float foot = 250.0 / 320.0;
		uv.y = foot + (uv.y - foot) * 0.84;                 // stretched upward
		uv.x += 0.022 * sin(uv.y * 11.0 + TIME * 0.8) + 0.01 * sin(uv.y * 29.0 - TIME * 1.7);
		vec2 fuv = vec2(1.0 - uv.x, uv.y);                   // the camera's picture flipped back: a true reflection
		vec4 r = texture(refl, fuv);
		vec2 guv = fuv + vec2(0.035 * sin(TIME * 0.37), -0.02 + 0.012 * sin(TIME * 0.53));
		vec4 g = texture(refl, guv);
		float a = r.a * refl_k;
		float ga = g.a * refl_k * 0.35;
		// darkened into the stone, cold, in three tones
		float lr = dot(r.rgb, vec3(0.3, 0.5, 0.2));
		lr = floor(clamp(lr * 4.5, 0.0, 1.0) * 3.0 + bayer4(cell) * 0.6) / 3.0;
		vec3 rc = mix(vec3(0.05, 0.025, 0.04), vec3(0.5, 0.36, 0.38), lr) * mix(vec3(1.0), r.rgb * 2.5, 0.35);
		vec3 gc = vec3(0.12, 0.08, 0.12);
		if (ga > bayer4(cell + 7.0) * 0.8)
			c = mix(c, gc, 0.6);
		if (a > bayer4(cell) * 0.9)
			c = rc;
	}
	COLOR = vec4(c, 1.0);
}
