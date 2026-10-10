// The Red, live (world/red_sea.gd): the curl. Where a stretch of the crest is between 0.265 and 0.37 of its life the
// front bulges and sags over on itself, a heavy rounded roll closing on a dark crease, sinking as it goes (blood is thick:
// tools/landkit3d/beach3d.py lip()). A strip along the shore: VERTEX.x is t, VERTEX.y the point of the profile (0..11).
shader_type spatial;
render_mode unshaded, cull_disabled, skip_vertex_transform, depth_draw_opaque;

#include "res://shaders/red_sea.gdshaderinc"

varying vec3 P;
varying vec3 NRM;
varying float live;
varying float under;

void vertex() {
	float t = VERTEX.x + win.y;
	int j = int(VERTEX.y + 0.5);
	float ph = phase(t);
	live = (ph >= 0.265 && ph < 0.37) ? 1.0 : 0.0;
	float k = clamp((ph - 0.265) / 0.105, 0.0, 1.0);
	vec2 cH = crest(min(ph, 0.36), t);
	float L = 1.0 * pow(k, 0.8) * (0.9 + 0.2 * vn1(t * 0.7, 61.0));
	float sag = 1.0 - 0.35 * k;
	// (ds, height fraction): up the back of the hump to its top, then forward and over, down into the crease
	vec2 pr[12] = vec2[](vec2(3.0, 0.57), vec2(2.0, 0.78), vec2(1.2, 0.91), vec2(0.5, 0.985), vec2(0.0, 1.0),
		vec2(-0.25 * L, 1.03 * sag), vec2(-0.55 * L, 1.0 * sag), vec2(-0.8 * L, 0.9 * sag), vec2(-0.96 * L, 0.74 * sag),
		vec2(-1.0 * L, 0.57 * sag), vec2(-0.9 * L, 0.44 * sag), vec2(-0.7 * L, 0.4 * sag + 0.1 * k));
	vec2 q = pr[j];
	float s = cH.x + q.x;
	float z = q.y * cH.y;
	// the profile's tangent for its light: the roll's outside faces up and toward the beach, its underside the crease
	vec2 a = pr[max(j - 1, 0)];
	vec2 b = pr[min(j + 1, 11)];
	vec2 tg = vec2(b.x - a.x, (b.y - a.y) * cH.y);
	NRM = normalize(vec3(-tg.y, 0.0, tg.x) * (tg.x < 0.0 ? -1.0 : 1.0));
	if (NRM.z < 0.0)
		NRM = -NRM;
	under = j >= 9 ? 1.0 : 0.0;
	P = vec3(s, t, z);
	POSITION = to_clip(s, t, z);                    // (always placed: where it is not breaking the fragments go)
}

void fragment() {
	if (live < 0.999)
		discard;
	vec3 f = fld(P.x, P.y);
	if (f.g > 0.5)
		discard;
	vec2 px = FRAGCOORD.xy;
	vec3 n = normalize(NRM);
	// spray tearing off the roll as it falls, heaviest on its nose
	float foam = 0.0;
	if (vn2(vec2(P.y * 2.2, P.z * 4.0 - heart * 6.0), 59.0) > 0.58)
		foam = 0.8;
	vec3 c = shade(n, foam, 1.0, px, 0.0);
	// the crease under the roll: the hollow in its own shadow
	ALBEDO = mix(c, blood_ramp(0.05), under * 0.7);
}
