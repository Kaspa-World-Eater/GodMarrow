// A live 3D body's picture (entities/body3d.gd) made the game's pixel art, by the painting rules a live picture can
// keep (MASTER_RULES 3; the newborn's pass 6):
// - hard edges, no half-alpha, and the dark outline the sprite heroes carry (#08060a, as PixelForge's);
// - a short ramp: the value stepped in a square-root space, so the darks get their tones (a body in a cave is mostly
//   dark), the hue kept;
// - the ramp hue-shifted: its darks lean violet-blue, its lights warm (3.9);
// - dither only where one tone meets another (3.2): a 4x4 ordered pattern in the band at each step's edge, fixed to the
//   picture's own pixels, so it rides with the body and never crawls over it;
// - a lit lip (3.3, 3.13): an edge pixel already in the light is lifted a step, the rim the flame catches.
shader_type canvas_item;

uniform float steps = 8.0;
uniform float band = 0.16;            // how wide the dithered band at a step's edge is (of one step)
const vec3 OUTLINE = vec3(0.031, 0.024, 0.039);

float a_at(sampler2D tex, vec2 uv) {
	return texture(tex, uv).a;
}

float bayer4(vec2 p) {
	ivec2 q = ivec2(mod(p, 4.0));
	int i = q.x + q.y * 4;
	int m[16] = int[](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
	return (float(m[i]) + 0.5) / 16.0;
}

void fragment() {
	vec2 px = TEXTURE_PIXEL_SIZE;
	float a = a_at(TEXTURE, UV);
	float n = max(max(a_at(TEXTURE, UV + vec2(px.x, 0.0)), a_at(TEXTURE, UV - vec2(px.x, 0.0))),
				  max(a_at(TEXTURE, UV + vec2(0.0, px.y)), a_at(TEXTURE, UV - vec2(0.0, px.y))));
	if (a < 0.5) {
		// the outline: an empty pixel beside a solid one
		if (n < 0.5) discard;
		COLOR = vec4(OUTLINE, 1.0);
	} else {
		vec3 c = texture(TEXTURE, UV).rgb;
		float v = max(max(c.r, c.g), c.b);
		float g = sqrt(max(v, 0.0));
		float s = g * steps;
		float lo = floor(s);
		float f = s - lo;
		// at a step's edge, the ordered pattern decides which of the two tones a pixel takes
		float k = lo + ((f > 0.5) ? 1.0 : 0.0);
		if (abs(f - 0.5) < band) {
			k = lo + ((bayer4(UV / px) < (f - 0.5 + band) / (2.0 * band)) ? 1.0 : 0.0);
		}
		// the lit lip: an edge pixel (beside an empty one) already in the light, a step up
		float m4 = min(min(a_at(TEXTURE, UV + vec2(px.x, 0.0)), a_at(TEXTURE, UV - vec2(px.x, 0.0))),
					   min(a_at(TEXTURE, UV + vec2(0.0, px.y)), a_at(TEXTURE, UV - vec2(0.0, px.y))));
		if (m4 < 0.5 && g > 0.32) {
			k += 1.0;
		}
		float gs = max(k, 0.6) / steps;
		float vs = gs * gs;
		vec3 o = (v > 0.0001) ? c * (vs / v) : c;
		// the ramp's hue: darks toward violet-blue, lights warm
		vec3 tint = mix(vec3(0.9, 0.88, 1.16), vec3(1.08, 1.0, 0.88), clamp(gs * 1.4, 0.0, 1.0));
		COLOR = vec4(clamp(o * tint, 0.0, 1.0), 1.0);
	}
}
