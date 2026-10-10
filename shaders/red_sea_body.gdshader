// The dead in the Red, live (world/red_sea.gd; tools/landkit3d/drowned_glb.py): each body laid on the live surface
// where it floats, every point of it at the sea's own height there, so it heaves with the swell, tips on the crest's
// slope and lies on the sand when the drain bares it; it drifts a little toward the shore on each surge and back, and
// sways on the beat. Mostly under: only the back, the shoulders and the hood break the blood (the sea's depth hides
// the rest).
shader_type spatial;
render_mode unshaded, cull_disabled, skip_vertex_transform, depth_draw_opaque;

#include "res://shaders/red_sea.gdshaderinc"

uniform vec2 anchor;              // where it floats (s, t)
uniform float wyaw;               // its heading in the world (radians)
uniform float kph;                // its own phase on the beat
uniform vec3 base : source_color = vec3(0.36, 0.3, 0.3);

varying vec3 P;
uniform int debug = 0;
varying vec3 NRM;

vec2 st_xy(float s, float t) { return vec2((t - s) / R2, (-s - t) / R2); }

void vertex() {
	float drift = -0.35 * sin(2.0 * PI * (heart + kph));
	float yaw = wyaw + 0.12 * sin(2.0 * PI * (heart * 2.0 + kph));
	vec2 o = st_xy(anchor.x + drift, anchor.y);
	// the glb's local frame (Y up) back to the builder's yards: x, y on the ground, z up
	vec3 b = vec3(VERTEX.x, -VERTEX.z, VERTEX.y);
	vec3 nb = vec3(NORMAL.x, -NORMAL.z, NORMAL.y);
	float c = cos(yaw);
	float sn = sin(yaw);
	vec2 w = o + vec2(b.x * c - b.y * sn, b.x * sn + b.y * c);
	vec2 nw = vec2(nb.x * c - nb.y * sn, nb.x * sn + nb.y * c);
	float s = -(w.x + w.y) / R2;
	float t = (w.x - w.y) / R2;
	float g = fld(s, t).r;
	float z = max(sea_z(s, t, g), g + 0.05) + b.z + 0.09;          // (bloated: they ride a little high)
	NRM = normalize(vec3(-(nw.x + nw.y) / R2, (nw.x - nw.y) / R2, nb.z));
	P = vec3(s, t, z);
	POSITION = to_clip(s, t, z);
	// (a hair nearer than the surface it pokes through, so the waterline is clean)
	POSITION.z += depth_sign * 0.0004;
}

void fragment() {
	vec2 px = FRAGCOORD.xy;
	vec3 n = normalize(NRM);
	vec3 V = normalize(vec3(-0.866, 0.0, 0.5));
	vec3 L = normalize(vec3(0.55, -0.35, 0.62));
	float d = max(dot(n, L), 0.0);
	// wet: the dawn's dome glazes it where it turns away
	float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
	float v = 0.16 + 0.58 * d + 0.22 * fres;
	v = stepped(clamp(v, 0.0, 1.0), px, 5.0);
	// the hue walks: the shadows sink to the Red's own dark, the lights cool and pale
	vec3 dark = mix(base * 0.25, vec3(0.06, 0.012, 0.018), 0.5);
	vec3 lit = base * 1.25 + vec3(0.02, 0.03, 0.04);
	ALBEDO = mix(dark, lit, v);
	// the Red's stain on all it touches, heaviest low on the body
	ALBEDO = mix(ALBEDO, vec3(0.2, 0.03, 0.04), 0.35 * smoothstep(0.25, -0.05, P.z - fld(P.x, P.y).r - 0.0));
	if (debug == 2)
		ALBEDO = vec3(0.0, 1.0, 0.0);
}
