// A live 3D body's picture (entities/body3d.gd) made the game's pixel art, by the painting rules a live picture can
// keep (MASTER_RULES 3; the newborn's pass 6):
// - hard edges, no half-alpha, and the dark outline the sprite heroes carry (#08060a, as PixelForge's);
// - a short ramp: the value stepped in a square-root space, so the darks get their tones (a body in a cave is mostly
//   dark), the hue kept;
// - the ramp hue-shifted: its darks lean violet-blue, its lights warm (3.9);
// - dither only where one tone meets another (3.2): a 4x4 ordered pattern in the band at each step's edge, fixed to the
//   picture's own pixels, so it rides with the body and never crawls over it;
// - a lit lip (3.3, 3.13): an edge pixel already in the light is lifted a step, the rim the flame catches;
// - dry-brush strokes along the form (3.4; pass 9): the picture doesn't carry the form's direction, but its light
//   does. Across a turning form the light's iso-lines run along it, so each stroke is laid at right angles to the
//   value's gradient. The strokes nudge the value before it is stepped, so the tone edges take brushed, ragged shapes;
// - a tooth under everything (3.6), fixed to the body's own pixels so it rides with the body.
shader_type canvas_item;

uniform float steps = 5.0;        // hard tone groups (the Last Faith study: flat masses, crisp edges)
uniform float band = 0.1;            // how wide the dithered band at a step's edge is (of one step)
uniform float stroke = 0.0;          // (pass 10: the strokes and the tooth moved onto the skin, shaders/body3d_model.gdshader)         // how much a stroke moves the value (of the whole ramp, in its square-root space)
uniform float tooth = 0.0;
const vec3 OUTLINE = vec3(0.031, 0.024, 0.039);

float a_at(sampler2D tex, vec2 uv) {
	return texture(tex, uv).a;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float val(sampler2D tex, vec2 uv) {
	vec4 c = texture(tex, uv);
	return c.a < 0.5 ? -1.0 : sqrt(max(max(c.r, c.g), c.b));
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
		// the stroke's direction: along the light's iso-line, at right angles to the value's gradient (off the
		// silhouette, a neighbour counts as this pixel, so the edge makes no false gradient)
		float vr = val(TEXTURE, UV + vec2(px.x, 0.0)), vl = val(TEXTURE, UV - vec2(px.x, 0.0));
		float vu = val(TEXTURE, UV - vec2(0.0, px.y)), vd = val(TEXTURE, UV + vec2(0.0, px.y));
		vr = vr < 0.0 ? g : vr; vl = vl < 0.0 ? g : vl; vu = vu < 0.0 ? g : vu; vd = vd < 0.0 ? g : vd;
		vec2 grad = vec2(vr - vl, vd - vu);
		vec2 along = length(grad) > 0.004 ? normalize(vec2(-grad.y, grad.x)) : vec2(0.0, 1.0);
		vec2 q = UV / px;
		float sa = dot(q, along), sc = dot(q, vec2(-along.y, along.x));
		float st = vnoise(vec2(sa * 0.11, sc * 0.75)) - 0.5;          // long along the stroke, fine across it
		g += st * stroke + (hash(q) - 0.5) * tooth;
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
