shader_type canvas_item;
// The picture window's ground: a dithered pseudo-environment drawn two screen pixels per scene pixel, a port of the
// mockup's scene() (docs/mockups/forge_app_v8.html). Six tones, a vanishing corridor or an open horizon, a floor
// pattern per ground, two torch pools that breathe with their flames (fl1, fl2 from the flames' own flicker), the
// sprite's own lights (up to four, with a flame's upward bias and jitter), and fog where the ground has it.

uniform vec2 size = vec2(298.0, 84.0);     // scene pixels
uniform float chunk = 2.0;                   // screen pixels per scene pixel
uniform vec4 pal0 : source_color = vec4(0.04, 0.035, 0.055, 1.0);
uniform vec4 pal1 : source_color = vec4(0.086, 0.078, 0.11, 1.0);
uniform vec4 pal2 : source_color = vec4(0.133, 0.12, 0.165, 1.0);
uniform vec4 pal3 : source_color = vec4(0.19, 0.17, 0.23, 1.0);
uniform vec4 pal4 : source_color = vec4(0.25, 0.235, 0.3, 1.0);
uniform vec4 pal5 : source_color = vec4(0.36, 0.34, 0.41, 1.0);
uniform vec3 warm = vec3(0.235, 0.157, 0.078);
uniform float sky = 0.0;
uniform float fog = 0.0;
uniform int floor_kind = 0;        // 0 stone, 1 flags, 2 grass, 3 water, 4 snow, 5 none
uniform int torches = 2;
uniform int light_mode = 2;        // 0 off, 1 sprite lights only, 2 on
uniform float fl1 = 1.0;
uniform float fl2 = 1.0;
uniform float t = 0.0;
uniform int nlights = 0;
uniform vec4 la0 = vec4(0.0);      // x, y (scene px), radius (scene px), strength
uniform vec4 la1 = vec4(0.0);
uniform vec4 la2 = vec4(0.0);
uniform vec4 la3 = vec4(0.0);
uniform vec3 lc0 = vec3(0.0);
uniform vec3 lc1 = vec3(0.0);
uniform vec3 lc2 = vec3(0.0);
uniform vec3 lc3 = vec3(0.0);
uniform vec4 lk = vec4(0.0);       // per light: 1.0 = a flame (jitters, lights upward more)

const int B[16] = {0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5};

float hash(float x, float y) {
	return fract(sin(x * 127.1 + y * 311.7) * 43758.5453);
}

vec3 pal(int i) {
	if (i <= 0) return pal0.rgb;
	if (i == 1) return pal1.rgb;
	if (i == 2) return pal2.rgb;
	if (i == 3) return pal3.rgb;
	if (i == 4) return pal4.rgb;
	return pal5.rgb;
}

vec3 cast_light(vec3 col, vec4 la, vec3 lc, float kind, float x, float y, float bay) {
	if (la.z <= 0.0) return col;
	float dd = distance(vec2(x, y), la.xy) / la.z;
	if (dd >= 1.0) return col;
	float up = (kind > 0.5 && y > la.y) ? 0.45 : 1.0;
	float jit = kind > 0.5 ? (0.7 + 0.3 * sin(t * 9.1 + la.x) + 0.1 * sin(t * 23.0)) : (0.85 + 0.15 * sin(t * 1.5));
	float g = (1.0 - dd) * (1.0 - dd) * la.w * jit * up;
	float q = g > bay * 0.9 ? g : g * 0.3;
	return col + (lc * 1.6 - col) * min(0.55, q);
}

void fragment() {
	vec2 p = floor(UV * size);
	float x = p.x;
	float y = p.y;
	float w = size.x;
	float h = size.y;
	int ix = int(x);
	int iy = int(y);
	float bay = (float(B[(iy & 3) * 4 + (ix & 3)]) + 0.5) / 16.0;
	float cx = w / 2.0;
	float cy = h * 0.42;
	float dx = (x - cx) / w;
	float dy = (y - cy) / h;
	bool none = floor_kind == 5;
	bool open = sky > 0.0;
	float depth = none ? 0.2 : (open ? max(0.0, (y - cy) / h * 1.4) : max(abs(dx) * 2.2, abs(dy) * 2.6));
	float v = min(1.0, depth);
	bool fl = !none && (open ? y > cy : (y > cy && abs(dx) < (y - cy) / h * 1.1));
	float stone = none ? 0.0 : hash(floor(x / 6.0 + (fl ? y * 0.3 : 0.0)), floor(y / 4.0)) * 0.35;
	float edge = 0.0;
	if (none) {
		edge = 0.0;
	} else if (floor_kind == 2) {
		edge = fl ? (hash(x, y) < 0.12 ? 0.2 : 0.0) : (y < cy ? (hash(floor(x / 3.0), floor(y / 3.0)) < 0.08 ? -0.3 : 0.0) : 0.0);
	} else if (floor_kind == 3) {
		edge = fl ? (mod(floor(y * 0.7 + sin(x * 0.3 + t * 2.0) * 2.0), 5.0) == 0.0 ? 0.25 : 0.0) : (hash(floor(x / 4.0), floor(y / 3.0)) < 0.1 ? -0.25 : 0.0);
	} else if (floor_kind == 4) {
		edge = fl ? (hash(x, y) < 0.05 ? 0.25 : 0.0) : (y < cy ? (hash(floor(x / 5.0), floor(y / 5.0)) < 0.06 ? 0.3 : 0.0) : 0.0);
	} else {
		bool line = fl ? (mod(floor((y - cy) * 1.6 + x * 0.02), 6.0) == 0.0) : (mod(x, 9.0) == 0.0 || mod(y, 5.0) == 0.0);
		edge = line ? -0.25 : 0.0;
	}
	if (open && y < cy) {
		stone = 0.0;
		edge = (hash(floor(x / 2.0), floor(y / 2.0)) < 0.012) ? 0.5 : 0.0;
		v = 1.0 - sky * (1.0 - y / cy) * 0.6;
	}
	float l = (1.0 - v) * 0.9 + stone + edge;
	if (open && y < cy) l = (1.0 - v) * 0.5 + edge;
	float tl = distance(vec2(x, y), vec2(w * 0.27, h * 0.44)) / (w * 0.22);
	float tr = distance(vec2(x, y), vec2(w * 0.73, h * 0.44)) / (w * 0.22);
	float torch = 0.0;
	if (light_mode >= 2 && torches > 0) {
		if (torches == 1) {
			torch = pow(max(0.0, 1.0 - tl * 1.2), 2.0) * fl1;
		} else {
			torch = pow(max(0.0, 1.0 - tl), 2.0) * fl1 + pow(max(0.0, 1.0 - tr), 2.0) * fl2;
		}
	}
	l += torch * 0.9;
	int idx = int(floor(l * 6.0 + (bay - 0.5) * 0.6));
	idx = clamp(idx, 0, 5);
	vec3 col = pal(idx);
	if (torch > 0.08) {
		float k = min(0.6, torch * 0.7);
		col = col + (warm * 2.0 - col) * k;
	}
	if (light_mode > 0) {
		if (nlights > 0) col = cast_light(col, la0, lc0, lk.x, x, y, bay);
		if (nlights > 1) col = cast_light(col, la1, lc1, lk.y, x, y, bay);
		if (nlights > 2) col = cast_light(col, la2, lc2, lk.z, x, y, bay);
		if (nlights > 3) col = cast_light(col, la3, lc3, lk.w, x, y, bay);
	}
	if (fog > 0.0 && light_mode == 2) {
		float f = fog * (0.5 + 0.5 * sin(x * 0.08 + t * 0.4 + y * 0.05)) * (y > cy * 0.6 ? 1.0 : 0.4);
		vec3 fc = pal4.rgb;
		col = col + (fc - col) * f * (bay > 0.4 ? 1.0 : 0.6);
	}
	COLOR = vec4(col, 1.0);
}
