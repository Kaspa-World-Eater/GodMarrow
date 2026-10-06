shader_type canvas_item;
// The Seer's bowl chapel, lit live (tools/title_study/chapel_light.py made the layers). Each pixel keeps every light's
// share; here they are summed again with each light's strength this frame (w0..w4: the two candle clusters, the blood's
// glow, the two front stubs), snapped to the 12-tone stone ramp with the 4x4 dither, tinted red by the blood and blue by
// the cold shaft as the painter did, then the floor's cracks and stains, the painted things over the stone, the shaft.
// The rect covers the screen's 480x270 grid; the chapel stands 100 px left (the face in the middle) and the strip it
// never painted on the right is its own left side, mirrored about the face, with a stepped cross-fade (zz_title54.js).

uniform sampler2D kA : filter_nearest;
uniform sampler2D kB : filter_nearest;
uniform sampler2D kC : filter_nearest;
uniform sampler2D kD : filter_nearest;
uniform sampler2D kE : filter_nearest;
uniform sampler2D over : filter_nearest;
uniform vec4 w03 = vec4(1.0);
uniform float w4 = 1.0;
uniform vec3 stone[12];

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);

vec3 rnd(vec3 c) { return clamp(floor(c + 0.5), 0.0, 255.0); }

vec3 chapel(ivec2 p) {
	vec4 a = texelFetch(kA, p, 0);
	vec4 b = texelFetch(kB, p, 0);
	vec4 c = texelFetch(kC, p, 0);
	vec4 d = texelFetch(kD, p, 0);
	vec4 o = texelFetch(over, p, 0);
	vec3 col;
	if (o.a > 0.5) {
		col = floor(o.rgb * 255.0 + 0.5);
	} else {
		float s = a.x * w03.x + a.y * w03.y + a.z * w03.z + a.w * w03.w + b.x * w4;
		float pre = b.y + c.z * s;
		float val = pre * b.w + c.x;
		float dith = B4[(p.y & 3) * 4 + (p.x & 3)] / 16.0 - 0.47;
		int t = int(floor(sqrt(max(0.0, val)) * 12.5 + dith * 1.1 + c.w));
		col = stone[clamp(t, 0, 11)] * 255.0;
		float red = min(0.8, 1.6 * a.z * w03.z * c.y);
		if (red > 0.0) {
			col = vec3(min(255.0, col.r * (1.0 + red * 0.55)), col.g * (1.0 - red * 0.3), col.b * (1.0 - red * 0.25));
		}
		col = rnd(col);
		float cf = b.z / (pre + 0.0001);
		if (cf > 0.05) {
			col = rnd(vec3(col.r * (1.0 - 0.4 * cf), col.g * (1.0 - 0.12 * cf), min(255.0, col.b * (1.0 + 0.35 * cf))));
		}
		for (int n = 1; n <= 3; n++) {
			if (d.x >= float(n)) col = rnd(col * 0.4);
		}
		if (d.y > 0.0) col = rnd(vec3(col.r * 0.7 + 14.0, col.g * 0.35, col.b * 0.4));
	}
	col = rnd(col + texelFetch(kE, p, 0).rgb);
	return col / 255.0;
}

void fragment() {
	ivec2 s = ivec2(floor(UV * vec2(480.0, 270.0)));
	s = clamp(s, ivec2(0), ivec2(479, 269));
	vec3 n = s.x < 380 ? chapel(ivec2(s.x + 100, s.y)) : vec3(0.0);
	vec3 m = s.x >= 368 ? chapel(ivec2(579 - s.x, s.y)) : vec3(0.0);
	vec3 col = n;
	if (s.x >= 380) col = m;
	else if (s.x >= 368) col = mix(n, m, float((s.x - 368) / 2 + 1) / 7.0);
	COLOR = vec4(col, 1.0);
}
