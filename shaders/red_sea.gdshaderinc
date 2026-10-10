// The Red's waves, live (world/red_sea.gd): tools/landkit3d/beach_floor.py's model of the Blender loops, on the GPU.
// Everything is on the shore's (s, t) grid in yards: s seaward from the sand (the still waterline at WATER), t along
// the shore (screen right). The sea's clock (heart) runs on the dying heartbeat and is wound on the CPU.
//
// Derek, 2026-10-10: "what happened to the cool sideways blood foam tide, that effect looked good for foam, we need to
// enhance the blood ocean much much more". The break peels along the crest again (PEEL), but every wave still comes in.

const float WATER = 66.0;
const float STEP_S = 69.6;
const float CUSP = 15.0;
const float BREAK_S = 70.8;
const float PEEL = 46.0;          // yards along the shore the break runs in one beat: the sideways trail of foam
const float R2 = 1.41421356;

uniform float heart;              // the sea's time through this beat, 0..1 (quick in the surges, crawling between)
uniform float beat_v;             // how hard the heart pushes now
uniform float grp = 1.0;          // this wave against its peers
uniform float secs;               // seconds, for what drifts on its own
uniform vec2 origin;              // the viewport's top-left in the zone's px
uniform vec2 vsize;               // the viewport's size in the zone's px
uniform float zo = -108.0;        // the zone's (0, 0) corner in the world (yards)
uniform float lift_px = 84.0;     // zone px a yard of height
uniform float depth_sign = 1.0;
uniform sampler2D field : filter_linear, repeat_disable;   // (floor, solid, column distance): tools/landkit3d/sea_field.py
uniform vec2 win;                 // the grid's window on the shore (s, t), snapped to its own spacing: it follows the camera
uniform vec4 fgeo;                // s0, t0, res, unused
uniform vec2 fn;                  // texels along s, along t

float h1(float i, float sd) { return fract(sin(i * 127.1 + sd * 74.7) * 43758.5453); }
float vn1(float x, float sd) {
	float i = floor(x);
	float f = x - i;
	f = f * f * (3.0 - 2.0 * f);
	return mix(h1(i, sd), h1(i + 1.0, sd), f);
}
float h2(vec2 p, float sd) { return fract(sin(p.x * 127.1 + p.y * 311.7 + sd * 74.7) * 43758.5453); }
float vn2(vec2 p, float sd) {
	vec2 i = floor(p);
	vec2 f = p - i;
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h2(i, sd), h2(i + vec2(1.0, 0.0), sd), f.x), mix(h2(i + vec2(0.0, 1.0), sd), h2(i + vec2(1.0, 1.0), sd), f.x), f.y);
}

vec3 fld(float s, float t) {
	vec2 uv = vec2((s - fgeo.x) / fgeo.z, (t - fgeo.y) / fgeo.z) / fn;
	if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0)
		return vec3(-1.5, 0.0, 6.0);
	return texture(field, uv).rgb;
}

float cusp(float t) {
	float ph = t / CUSP + 0.35 * sin(t * 0.07 + 1.1) + 0.25 * (vn1(t / CUSP, 3.0) - 0.5);
	return cos(2.0 * PI * ph) * (0.8 + 0.4 * vn1(t / CUSP, 7.0));
}

float phase(float t) {
	return fract(heart + t / PEEL + 0.07 * (vn1(t * 0.12, 41.0) - 0.5) + 0.03 * (vn1(t * 0.5, 43.0) - 0.5));
}

float break_s(float t) { return BREAK_S + 0.5 * clamp((t - 2.0) / 6.0, 0.0, 1.0); }

// the unbroken crest's place (s) and height (yards) at phase ph < 0.38
vec2 crest(float ph, float t) {
	float sb = break_s(t);
	float sc = ph < 0.3 ? sb + (0.3 - ph) * 40.0 : sb - (ph - 0.3) * 8.0;
	sc += 1.1 * (vn1(t * 0.17, 73.0) - 0.5) + 0.4 * (vn1(t * 0.6, 79.0) - 0.5);
	float k = clamp(ph / 0.3, 0.0, 1.0);
	float H = (0.45 + 1.15 * k * k) * grp * (0.78 + 0.38 * vn1(t * 0.21, 71.0));
	return vec2(sc, H);
}

vec2 bore_front(float ph, float t) {
	float sb = break_s(t);
	float k = clamp((ph - 0.36) / 0.11, 0.0, 1.0);
	return vec2(sb - 1.2 - k * (sb - 1.2 - WATER), 0.5 * grp * (1.0 - 0.55 * k));
}

// how far up the beach the swash reaches now: (the front, its phase 0..1, rising 1/0)
vec3 swash_front(float t) {
	float cell = floor(t / CUSP + 0.5);
	float ps = fract(phase(t) - 0.47 + 0.04 * h1(cell, 11.0));
	float k = clamp((ps - 0.32) / 0.55, 0.0, 1.0);
	float up = ps < 0.24 ? sin(clamp(ps / 0.24, 0.0, 1.0) * PI * 0.5) : (ps < 0.32 ? 1.0 : pow(cos(k * PI * 0.5), 0.8));
	float reach = (2.9 + 1.2 * h1(cell, 13.0) - 1.0 * cusp(t)) * grp;
	float drw = ps > 0.87 ? 0.45 * sin(clamp((ps - 0.87) / 0.13, 0.0, 1.0) * PI) : 0.0;
	return vec3(WATER - up * reach + drw, ps, ps < 0.24 ? 1.0 : 0.0);
}

// thick blood: only long, low, slow small waves are left on the swell
float chop(float s, float t) {
	float w = 0.6 * (vn2(vec2(s, t) * 0.35, 3.0) - 0.5);
	float z = 0.0;
	z += 0.018 * pow(0.5 + 0.5 * sin(2.0 * PI * ((s * cos(0.25) + t * sin(0.25)) / 2.6 + w - heart)), 1.6);
	z += 0.012 * pow(0.5 + 0.5 * sin(2.0 * PI * ((s * cos(-0.5) + t * sin(-0.5)) / 1.9 + w - heart)), 1.6);
	z += 0.02 * pow(0.5 + 0.5 * sin(2.0 * PI * ((s * cos(0.6) + t * sin(0.6)) / 3.8 + w - heart)), 1.6);
	return z * (0.55 + 0.9 * vn2(vec2(s * 0.12 + 5.0, t * 0.12), 9.0));
}

// the Red's surface (yards) at (s, t), the floor g under it given
float sea_z(float s, float t, float g) {
	float ph = phase(t);
	vec2 cH = crest(min(ph, 0.38), t);
	float sc = cH.x;
	float H = cH.y;
	float z = 0.0;
	if (ph < 0.5) {
		float wf = clamp(2.8 - 2.0 * clamp(ph / 0.3, 0.0, 1.0), 0.85, 2.8);   // thick: it never sharpens to an edge
		float ds = s - sc;
		float hump = H * exp(-pow(ds / (ds < 0.0 ? wf : 4.0), 2.0));
		float kc = clamp((ph - 0.34) / 0.14, 0.0, 1.0);
		hump *= 1.0 - kc * kc * (3.0 - 2.0 * kc);
		float trough = 0.2 * H * exp(-pow((s - (sc - wf * 1.9)) / 1.3, 2.0));
		z += hump - trough;
	}
	// the sets out on the open Red: the next swells already coming in, a beat apart, low and broad, rising as they near
	float sb = break_s(t);
	float u = (s - sb) / 40.0 + ph - 0.3;
	float dn = (fract(u + 0.5) - 0.5) * 40.0;
	float far_k = smoothstep(sc + 4.0, sc + 14.0, s) * (ph < 0.5 ? 1.0 : smoothstep(sb + 6.0, sb + 16.0, s));
	float hf = 0.5 * grp * (0.75 + 0.4 * vn1(t * 0.05 + floor(u + 0.5) * 3.1, 17.0)) * (0.7 + 0.3 * exp(-(s - sb) / 60.0));
	z += far_k * (hf * exp(-pow(dn / (dn < 0.0 ? 5.0 : 9.0), 2.0)) - 0.12 * hf);
	// the bore: a front of broken water, its height falling off behind it
	if (ph >= 0.34 && ph < 0.6) {
		vec2 bh = bore_front(ph, t);
		float k = clamp((s - bh.x) / 0.3 + 1.0, 0.0, 1.0);
		z += bh.y * k * k * (3.0 - 2.0 * k) * exp(-max(s - bh.x, 0.0) / 2.4) * clamp(1.0 - (ph - 0.47) / 0.13, 0.0, 1.0);
		z += 0.06 * (vn2(vec2(s * 1.2, t * 1.2 - heart * 3.0), 13.0) - 0.4) * clamp(1.0 - abs(s - bh.x - 1.2) / 2.5, 0.0, 1.0);
	}
	z += chop(s, t) * clamp((s - WATER + 0.3) / 1.5, 0.0, 1.0);
	// the swash sheet over the face up to its front: blunt and raised at its nose while it runs up, thinning back
	vec3 sw = swash_front(t);
	float fr = sw.x;
	if (s >= fr && s < WATER + 2.0) {
		float film = sw.z > 0.5 ? 0.05 + 0.06 * exp(-pow((s - fr - 0.28) / 0.32, 2.0))
			: 0.03 + 0.02 * clamp((s - fr) / 2.0, 0.0, 1.0) + 0.025 * exp(-pow((s - fr - 0.2) / 0.25, 2.0));
		z = max(z, g + film);
	}
	return z;
}

// how long since the bore's foam was laid here, in beats (it thins and tears into lace as it ages)
float foam_age(float s, float t) {
	float ph = phase(t);
	float sb = break_s(t);
	float pb = s > WATER ? 0.36 + clamp((sb - 1.2 - s) / (sb - 1.2 - WATER), 0.0, 1.0) * 0.11
		: 0.47 + 0.24 * asin(clamp((WATER - s) / 4.0, 0.0, 1.0)) / (PI * 0.5);
	return fract(ph - pb);
}

// a point on the shore grid to the viewport's clip space: the game's own iso (core/iso.gd), lifted by its height
vec4 to_clip(float s, float t, float z) {
	float X = 72.0 * R2 * t;
	float Y = 36.0 * (-R2 * s - 2.0 * zo) - z * lift_px;
	vec2 ndc = vec2((X - origin.x) / vsize.x * 2.0 - 1.0, (Y - origin.y) / vsize.y * 2.0 - 1.0);   // (the compatibility renderer: the viewport texture reads y down)
	// nearer the camera: further down the beach, or higher (the hero camera's 30 degrees)
	float key = -s * 0.866 + z * 0.5;
	return vec4(ndc, depth_sign * clamp((key + 60.0) / 260.0, -0.99, 0.99), 1.0);
}

// ---- the paint (docs/PAINTED_STANDARD.md): stepped tones on the 2 x 2 grid, dithered only at the steps' edges ----
float bayer4(vec2 p) {
	ivec2 q = ivec2(mod(p, 4.0));
	int i = q.x + q.y * 4;
	float m[16] = float[](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
	return (m[i] + 0.5) / 16.0;
}

// the blood's ramp, dark to the sky's glaze, the hue walking warm-to-rose as it lightens
vec3 blood_ramp(float v) {
	vec3 c0 = vec3(0.03, 0.004, 0.009);
	vec3 c1 = vec3(0.095, 0.01, 0.02);
	vec3 c2 = vec3(0.17, 0.022, 0.035);
	vec3 c3 = vec3(0.29, 0.06, 0.075);
	vec3 c4 = vec3(0.45, 0.2, 0.22);
	vec3 c5 = vec3(0.62, 0.42, 0.43);
	v = clamp(v, 0.0, 1.0) * 5.0;
	if (v < 1.0) return mix(c0, c1, v);
	if (v < 2.0) return mix(c1, c2, v - 1.0);
	if (v < 3.0) return mix(c2, c3, v - 2.0);
	if (v < 4.0) return mix(c3, c4, v - 3.0);
	return mix(c4, c5, v - 4.0);
}

float stepped(float v, vec2 px, float steps) {
	float x = v * steps;
	float f = fract(x);
	float b = floor(x);
	// within the band's last tenth either side of a step, the ordered dither decides
	float edge = 0.12;
	if (f > 1.0 - edge)
		b += step(bayer4(px), (f - (1.0 - edge)) / (2.0 * edge));
	else if (f < edge)
		b -= step((f + edge) / (2.0 * edge), bayer4(px));
	return clamp(b / steps, 0.0, 1.0);
}

// the light on the water: the grey dawn's dome glazing every facet that tips toward it, the blood's own body under it
vec3 shade(vec3 n, float foam, float depth, vec2 px, float glint_seed) {
	vec3 V = normalize(vec3(-0.866, 0.0, 0.5));          // toward the camera, in (s, t, z)
	vec3 L = normalize(vec3(0.55, -0.35, 0.62));         // the dawn, low over the Red and off to the left
	float nv = max(dot(n, V), 0.0);
	vec3 R = reflect(-V, n);
	float sky = 0.35 + 0.65 * smoothstep(-0.1, 0.9, R.z);                  // the dome, brighter overhead
	sky += 0.5 * pow(max(dot(normalize(R.xy + vec2(1e-4)), normalize(L.xy)), 0.0), 6.0) * smoothstep(0.6, 0.05, R.z);   // the dawn's band on the horizon
	float fres = 0.05 + 0.95 * pow(1.0 - nv, 4.0);
	float body = 0.22 + 0.4 * max(dot(n, L), 0.0);
	// thin over the sand it is a film: darker, the wet floor through it
	body *= mix(0.6, 1.0, smoothstep(0.0, 0.25, depth));
	float v = body * 0.78 + fres * sky * 1.0;
	// the dawn's own glint off a facet turned just so: hard pink specks
	vec3 H = normalize(V + L);
	float spec = pow(max(dot(n, H), 0.0), 220.0);
	v += spec * 1.2;
	v += 0.08 * beat_v;                                  // the push of the beat lifts it a breath
	v = stepped(clamp(v, 0.0, 1.0), px, 6.0);
	vec3 c = blood_ramp(v);
	if (foam > 0.0) {
		// the foam in three tones by its thickness and its light: shadowed rose, flesh, the lit tops
		float fv = clamp(-0.05 + 0.6 * foam + 0.5 * max(dot(n, L), 0.0) + 0.25 * (fres * sky), 0.0, 1.0);
		fv = stepped(fv, px, 3.0);
		vec3 f0 = vec3(0.2, 0.05, 0.065);
		vec3 f1 = vec3(0.44, 0.22, 0.23);
		vec3 f2 = vec3(0.76, 0.56, 0.53);
		c = fv < 0.5 ? mix(f0, f1, fv * 2.0) : mix(f1, f2, fv * 2.0 - 1.0);
	}
	return c;
}
