// The pool's surface, simulated (world/pool_life.gd; Derek, 2026-10-10: "a blood pool that flows like it has an
// underground source that swells it and sloshes it, with the blood flowing from the faces into it like real water"):
// one step of the wave equation on a grid of cells over the pool, run every frame in two viewports that each read the
// other's last frame exactly (the screen texture was not exact).
// A cell holds its height and its height a step ago, each as 16 bits over two channels. The stumps and the shore are
// walls (their height held at zero, so a wave reflects from them: the slosh round the rocks). Sources: the spring at
// the heart welling up on the heartbeat and wandering a little; the ropes of blood out of the faces striking the
// surface, a churn of small falls; impulses (a step, a hand, a drip); and a body wading as a moving hollow, pushing a
// wake. Thick blood: slow waves, damped quickly.
shader_type canvas_item;
render_mode blend_disabled;          // the state lives in all four channels, alpha too: written as it is, never blended

uniform sampler2D prev : filter_nearest;      // the last state: the other viewport's last frame (a ping-pong)
uniform bool init = true;                     // the first frame: level
uniform sampler2D field : filter_nearest;     // R, G the flow; B the blood mask (pool_sim.png)
uniform vec2 cells = vec2(192.0, 96.0);
uniform float t = 0.0;
uniform vec4 spring = vec4(0.5, 0.5, 0.0, 0.0);   // uv, strength now
uniform vec4 spouts[6];                           // uv, strength (0 none)
uniform vec4 imps[16];                            // uv, strength (a one-frame push: down +, up -), radius in cells
uniform vec4 body = vec4(-1.0, -1.0, 0.0, 0.0);   // uv, radius in cells, depth

// the viewports are float targets (HDR 2D): a height is stored as it is, R now and G a step ago
float dec(vec2 hl) { return hl.x; }
vec2 enc(float v) {
	float u = clamp(v / 8.0 + 0.5, 0.0, 1.0) * 65535.0;
	float hi = floor(u / 256.0);
	return vec2(hi / 255.0, (u - hi * 256.0) / 255.0);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float H(vec2 suv) { return texture(prev, suv).r; }

void fragment() {
	if (init) {
		COLOR = vec4(0.0, 0.0, 0.0, 1.0);
	} else {
	vec2 px = 1.0 / cells;
	vec2 uv = (floor(UV * cells) + 0.5) / cells;
	float wall = 1.0 - step(0.5, texture(field, uv).b);
	vec2 sp = px;
	vec2 suv = uv;
	vec2 fy = vec2(1.0, 1.0);
	vec4 s = texture(prev, suv);
	float h = s.r;
	float hp = s.g;
	// the neighbours: a wall reads as zero height (a fixed edge: the wave reflects)
	float hl = H(suv - vec2(sp.x, 0.0)) * step(0.5, texture(field, uv - vec2(px.x, 0.0)).b);
	float hr = H(suv + vec2(sp.x, 0.0)) * step(0.5, texture(field, uv + vec2(px.x, 0.0)).b);
	float hu = H(suv - vec2(0.0, sp.y * fy.y)) * step(0.5, texture(field, uv - vec2(0.0, px.y)).b);
	float hd = H(suv + vec2(0.0, sp.y * fy.y)) * step(0.5, texture(field, uv + vec2(0.0, px.y)).b);
	// thick blood (Derek, 2026-10-10: "too fast and noisy", "needs to be thicker and sloshier"): slow waves; a strong
	// viscosity that smooths every small ripple away within moments, so only long heavy swells travel; little loss on those
	float c2 = 0.025;                                // (slower still: thick blood)
	float avg = (hl + hr + hu + hd) * 0.25;
	float hn = (2.0 * h - hp + c2 * 4.0 * (avg - h)) * 0.994;
	hn += 0.22 * (avg - h);                          // viscosity: the surface pulled toward its neighbours' mean
	hn -= 0.004 * h;                                 // it settles back toward level, as a basin's blood finds it
	// the slosh: the whole basin rocking, slowly, back and forth and round (the swell from beneath pushing it), so
	// the blood heaps against one shore, then the other, and the stumps cut through it
	vec2 rk = vec2(sin(t * 0.3), sin(t * 0.21 + 1.2));
	hn += 0.0015 * dot(rk, (uv - 0.5) * vec2(2.0, 2.0));
	// the spring: an upwelling at the heart, swelling on each beat
	vec2 ds = (uv - spring.xy) * cells;
	hn += spring.z * exp(-dot(ds, ds) / 900.0);       // the welling: broad, from beneath the whole heart
	// the ropes of blood striking: small falls churning the surface
	for (int i = 0; i < 6; i++) {
		vec4 S = spouts[i];
		if (S.z <= 0.0) continue;
		vec2 d = (uv - S.xy) * cells;
		float k = exp(-dot(d, d) / 14.0);
		// a heavy fall, not a spray: a slow, broad churn (the rope's own beat), never noise
		hn += k * S.z * (0.6 * sin(t * 1.3 + float(i) * 1.7) + 0.4 * sin(t * 2.1 + float(i) * 2.9)) * 0.03;
	}
	// impulses: a step or a hand going in pushes the surface down; the newborn's back coming up lifts it
	for (int i = 0; i < 16; i++) {
		vec4 I = imps[i];
		if (I.z == 0.0) continue;
		vec2 d = (uv - I.xy) * cells;
		hn -= I.z * exp(-dot(d, d) / max(I.w * I.w, 1.0));
	}
	// a body wading: the surface held down round its legs, so as it moves it pushes a wake
	if (body.x >= 0.0) {
		vec2 d = (uv - body.xy) * cells;
		float k = exp(-dot(d, d) / max(body.z * body.z, 1.0));
		hn = mix(hn, -body.w, k * 0.35);
	}
	hn *= 1.0 - wall;
	COLOR = vec4(clamp(hn, -6.0, 6.0), h, 0.0, 1.0);
	}
}
