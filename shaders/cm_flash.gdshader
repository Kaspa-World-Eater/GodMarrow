shader_type canvas_item;
// A Cursemark body, lit (the title's lesson: forms are lit, not flat): its own normal map shaded by the pilgrim's
// lantern (warm, from where the lantern stands) and a faint cold sky from high on the left, kept gentle: a slight
// relief, never plastic. A struck body turns white for a blink, as Cursemark flashes it.
uniform float flash = 0.0;
uniform vec3 lamp_dir = vec3(0.0, 0.0, 1.0);   // toward the lantern, screen space (x right, y down), z out of the screen
uniform float lamp_k = 0.0;                    // how near and bright the lantern is to this body, 0..1
uniform float sky_k = 0.3;                     // the cold of the sky / the vault
uniform bool face_left = false;

void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	vec3 n = texture(NORMAL_TEXTURE, UV).rgb;
	if (length(n) > 0.05) {
		n = n * 2.0 - 1.0;
		n.y = -n.y;                                  // the maps' green points up the screen
		if (face_left) n.x = -n.x;                   // a flipped body turns its normals with it
		n = normalize(n);
		float lam = max(0.0, dot(n, normalize(lamp_dir)));
		float sky = max(0.0, dot(n, normalize(vec3(-0.6, -0.7, 0.4))));
		// the side toward the lantern takes its warmth; the side away sinks; the sky's edge is a faint cold rim
		float shade = mix(1.0, 0.72 + 0.55 * lam, lamp_k);
		vec3 warm = vec3(1.0, 0.86, 0.68);
		c.rgb *= shade * mix(vec3(1.0), warm, lamp_k * lam * 0.45);
		c.rgb += vec3(0.55, 0.65, 0.9) * pow(sky, 3.0) * sky_k * 0.18;
	}
	COLOR = vec4(mix(c.rgb, vec3(1.0), flash), c.a);
}
