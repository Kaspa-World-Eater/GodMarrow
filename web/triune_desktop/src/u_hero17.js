
// =================================================================== v0.17: the four heroes, painted and animated
// Each class is painted per pixel in poses: idle (breathing), walk (4), cast (hands up, spell light), strike (2), roll.
// Frames are cached per class, pose and phase, and draw anchored where the old sprite stood, so every overlay
// (mutations, bone armor, claws, omens) still finds the body.
const HPAL = {
  animancer: { r0: '#10141f', r1: '#1e2638', r2: '#34405a', r3: '#52607e', tr: '#9aa6bc', trHi: '#dce4f0', sk: '#c8c0b0', sk0: '#7a7064', eye: '#9fe8ff', eyeHi: '#ffffff', ir0: '#3a3e48', ir1: '#6e7480', ir2: '#b4bac6', rune: '#6ad0ff', w0: '#3a2618', w1: '#6a4a2c', gl: '#bfefff' },
  ossumancer: { r0: '#4a4236', r1: '#8c8266', r2: '#c8bea0', r3: '#eee6ce', s0: '#3a0c10', s1: '#6e1a20', s2: '#a02a2e', b0: '#6a6250', b1: '#b0a684', b2: '#e8e0c4', b3: '#fffaea', gap: '#16121a', eye: '#ff6a3d', eyeHi: '#ffd8a0', i1: '#5a5e68', i2: '#9aa0ac', gl: '#f4efe2' },
  hemomancer: { r0: '#1e0810', r1: '#3e1220', r2: '#6a1c2e', r3: '#94304a', lt0: '#2e1a10', lt1: '#5a3a22', hair: '#141014', war: '#ece6d6', sk1: '#6e3e2a', sk2: '#9c6444', sk3: '#c48a60', skHi: '#e8b88a', pnt: '#a0141e', pnt2: '#e03040', bone: '#d8d0b8', boneHi: '#ffffff', wd0: '#5a4630', wd1: '#cdb88c', wd2: '#eee0b8', wd3: '#ffffff', f0: '#1a6a5e', f1: '#2e9a8a', f2: '#e8c070', bead: '#d8c07a', bead2: '#c24050', sk: '#9c6444', sk0: '#4a2418', eye: '#ff4050', bl: '#c8283a', blHi: '#ff7080', i1: '#5a5e68', i2: '#aab0bc', gl: '#ff6070' },
  miasmancer: { r0: '#120a18', r1: '#241830', r2: '#3a2848', r3: '#584070', m0: '#8a8270', m1: '#cfc8b4', m2: '#f2eee0', h0: '#6a6250', h1: '#c8c0a8', h2: '#fffaec', eye: '#c890ff', eyeHi: '#f4e8ff', cl0: '#3a3e48', cl1: '#8a90a0', cl2: '#dce2ec', sc0: '#2a1a34', sc1: '#4a2e5a', gl: '#b070e0', ven: '#9aff6a' }
};
const PPAINT = {
  // The Animancer: a hooded seer of the lantern-dead in blue-grey robes, iron clasp and chain, eyes lit cold
  animancer(A, pose, ph) {
    const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0, u = br * 0.5, cast = pose === 'cast', hit = pose === 'atk';
    // robe: a long bell, the hem swaying with the stride; the far leg shows as a shadow fold
    for (let y = -15; y <= 0; y++) { const t = (y + 15) / 15, hw = 2.6 + t * 3.2, xs = -hw + sw * t * 0.6; A.R(xs, y, hw * 2, 1, y < -11 ? 'r2' : 'r1'); A.R(xs, y, 1.2, 1, 'r0'); A.R(xs + hw * 2 - 1.5, y, 1.5, 1, 'r3'); }
    A.L(-1 + sw, -8, -2 + sw * 2, 0, 'r0'); A.L(2 - sw, -9, 3 - sw * 2, 0, 'r3');
    for (let i = 0; i < 6; i++) A.P(-5 + i * 2 + sw * 0.6, 0 + (i + ph) % 2, 'r0');
    A.R(-5 + sw * 0.6, -1, 11, 1, 'tr');
    // mantle, iron clasp and a hanging chain
    A.E(0.5, -14.5 + u, 4.2, 2.4, 'r3'); A.E(0, -15 + u, 3.4, 1.4, 'tr'); A.P(-2, -15 + u, 'trHi');
    A.R(0, -14 + u, 2, 2, 'ir1'); A.P(0, -14 + u, 'ir2'); for (let i = 0; i < 4; i++) A.P(1 + i * 0.7, -12 + i + u, i % 2 ? 'ir1' : 'ir2');
    A.P(0, -10 + u, 'rune'); A.P(1, -11 + u, 'rune');
    // hood: tall and peaked, a shadow for a face, two cold eyes
    const hx = 0.5, hy = -19 + u;
    A.E(hx, hy, 3.2, 3.4, 'r2'); A.E(hx - 0.8, hy - 1, 2.2, 2.2, 'r3'); A.L(hx - 2, hy - 3, hx - 4, hy - 6, 'r2', 2); A.P(hx - 4, hy - 7, 'r3');
    A.E(hx + 1.2, hy + 0.6, 2, 2.1, 'r0'); A.P(hx + 2, hy, 'eye'); A.P(hx + 0.5, hy, 'eye'); A.P(hx + 2, hy - 1, 'eyeHi');
    A.P(hx + 1, hy + 2, 'sk0');
    // arms and the wand; casting raises both hands, spell light gathering between them
    if (cast) {
      const k = ph ? 1 : 0.6;
      A.limb([[-1, -14 + u], [-3, -18], [-2, -21 - k]], 'r2', 'r0', 2); A.limb([[2, -14 + u], [5, -17], [6, -20 - k]], 'r3', 'r1', 2);
      A.R(-3, -22 - k, 2, 2, 'sk'); A.R(5, -21 - k, 2, 2, 'sk');
      A.E(2, -24 - k, 1.5 + k, 1.5 + k, 'gl'); A.P(2, -24 - k, 'eyeHi'); A.P(-1, -26, 'rune'); A.P(5, -26, 'rune');
    } else {
      const wa = hit ? [[2, -14 + u], [6, -14], [9, -12]] : [[2, -14 + u], [4, -11 + u], [5 + sw * 0.5, -8 + u]];
      A.limb([[-1, -14 + u], [-3, -11 + u], [-3 - sw * 0.5, -8 + u]], 'r2', 'r0', 2); A.R(-4 - sw * 0.5, -8 + u, 2, 2, 'sk0');
      A.limb(wa, 'r3', 'r1', 2); const h = wa[2]; A.R(h[0], h[1] - 1, 2, 2, 'sk');
      const wx = h[0] + 1, wy = h[1];
      if (hit) { A.L(wx, wy, wx + 6, wy + 2, 'w1'); A.P(wx + 6, wy + 2, 'gl'); A.P(wx + 7, wy + 2, 'eyeHi'); }
      else { A.L(wx, wy + 1, wx + 1, wy - 6, 'w1'); A.P(wx + 1, wy - 7, 'gl'); A.P(wx + 1, wy - 6, 'rune'); }
    }
  },
  // The Ossurarch: a bone-priest in bleached robes and a red sash, a horned skull for a helm, ribs worn as a breastplate
  ossumancer(A, pose, ph) {
    const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0, u = br * 0.5, cast = pose === 'cast', hit = pose === 'atk';
    // legs in bone greaves
    A.limb([[-1, -8], [-1 - sw, -4], [-1 - sw * 2, -1]], 'r1', null, 2); A.R(-2 - sw * 2, -1, 3, 1, 'b0');
    A.limb([[1, -8], [2 + sw, -4], [1 + sw * 2, -1]], 'r2', null, 2); A.R(1 + sw * 2, -1, 4, 1, 'b1'); A.P(2 + sw, -5, 'b2'); A.P(2 + sw, -3, 'b2');
    // robe skirt with a red sash hanging
    for (let y = -10; y <= -4; y++) { const t = (y + 10) / 6, hw = 3 + t * 1.6; A.R(-hw + sw * t * 0.4, y, hw * 2, 1, 'r2'); A.R(-hw + sw * t * 0.4, y, 1, 1, 'r1'); A.R(hw - 1 + sw * t * 0.4, y, 1, 1, 'r3'); }
    A.R(0, -10, 2, 8, 's1'); A.R(0, -10, 1, 8, 's2'); A.P(1, -2, 's0');
    // torso: ribs worn over the robe as a breastplate
    A.R(-3, -16 + u, 7, 6, 'r2'); A.R(-3, -16 + u, 7, 1, 'r3'); A.R(-3, -16 + u, 1, 6, 'r1');
    for (let i = 0; i < 3; i++) { A.L(-2, -15 + i * 1.8 + u, 3, -15.5 + i * 1.8 + u, 'b2'); A.P(3, -15 + i * 1.8 + u, 'b3'); }
    A.L(0.5, -16 + u, 0.5, -10.5, 'b1');
    // pauldrons: jawbones
    A.E(-3, -16 + u, 2, 1.4, 'b1'); A.E(4, -16 + u, 2.2, 1.5, 'b2'); A.P(5, -17 + u, 'b3'); A.P(4, -15 + u, 'gap');
    // the helm: a beast skull with swept horns, eyes burning under it
    const hx = 1, hy = -19.5 + u;
    A.E(hx, hy, 2.8, 2.8, 'b2'); A.E(hx - 0.6, hy - 1, 2, 1.6, 'b3'); A.R(hx - 1, hy + 1, 4, 2, 'b1');
    A.R(hx, hy - 0.5, 2, 1.5, 'gap'); A.P(hx + 1, hy - 0.5, 'eye'); A.P(hx, hy, 'eyeHi'); A.P(hx + 2, hy + 2, 'gap'); A.P(hx, hy + 2, 'gap');
    A.limb([[hx - 2, hy - 1], [hx - 5, hy - 3], [hx - 6, hy - 6]], 'b1'); A.P(hx - 6, hy - 7, 'b3');
    A.limb([[hx + 2, hy - 2], [hx + 3, hy - 5], [hx + 2, hy - 7]], 'b2'); A.P(hx + 2, hy - 8, 'b3');
    // arms and bone dagger
    if (cast) {
      const k = ph ? 1 : 0.6;
      A.limb([[-2, -15 + u], [-4, -17], [-4, -20 - k]], 'r1', null, 2); A.limb([[3, -15 + u], [5, -18], [6, -21 - k]], 'r2', 'r1', 2);
      A.R(-5, -21 - k, 2, 2, 'b2'); A.R(6, -22 - k, 2, 2, 'b2');
      for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + ph; A.P(1 + Math.cos(a) * 4, -24 - k + Math.sin(a) * 2, i % 2 ? 'b3' : 'gl'); }
    } else {
      A.limb([[-2, -15 + u], [-3, -12 + u], [-3 - sw * 0.5, -9 + u]], 'r1', null, 2); A.R(-4 - sw * 0.5, -9 + u, 2, 2, 'b1');
      const wa = hit ? (ph ? [[3, -15 + u], [7, -14], [10, -12]] : [[3, -15 + u], [5, -19], [4, -22]]) : [[3, -15 + u], [4, -12 + u], [5 + sw * 0.5, -9 + u]];
      A.limb(wa, 'r3', 'r1', 2); const h = wa[2]; A.R(h[0], h[1] - 1, 2, 2, 'b2');
      const dx = hit && ph ? 1 : hit ? 0 : 0.3, dy = hit && ph ? 0.4 : hit ? -1 : 1, L0 = Math.hypot(dx, dy);
      for (let i = 1; i <= 5; i++) A.P(h[0] + 1 + dx / L0 * i, h[1] + dy / L0 * i, i === 5 ? 'b3' : 'b2');
    }
  },
  // The Hemomancer: a lean, hard-muscled blood-shaman, bare to the waist and painted in blood, a long layered
  // battle skirt of leather and red cloth to the ankles, braids down the back, a carved mask crowned with feathers
  hemomancer(A, pose, ph) {
    const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0, u = br * 0.5, cast = pose === 'cast', hit = pose === 'atk';
    // braids behind the head
    A.L(-1, -21 + u, -3, -12 + u, 'hair', 1); A.L(0, -21 + u, -2, -11 + u + (ph % 2), 'hair'); A.P(-3, -11 + u, 'bead'); A.P(-2, -10 + u, 'bead2');
    // feet peeking under the skirt
    A.R(-3 - sw * 2, -1, 3, 1, 'sk1'); A.R(1 + sw * 2, -1, 3, 1, 'sk2');
    // the battle skirt: long, flared, layered strips of dark leather and blood-red cloth; the hem swings with the stride
    for (let y = -10; y <= -1; y++) {
      const t = (y + 10) / 9, hw = 2.8 + t * 2.6, xs = -hw + sw * t * 0.9;
      for (let i = 0; i < Math.round(hw * 2); i++) { const strip = Math.floor((i + (y < -6 ? 0 : 1)) / 2) % 3; A.P(xs + i, y, strip === 0 ? 'lt1' : strip === 1 ? 'r2' : 'lt0'); }
      A.P(xs, y, 'r0'); A.P(xs + hw * 2 - 1, y, 'r3');
    }
    for (let i = 0; i < 6; i++) { const x0 = -5 + i * 2 + sw * 0.9; A.P(x0, -1 + ((i + ph) % 2), i % 2 ? 'r1' : 'lt0'); }
    A.L(-1 + sw * 0.4, -9, -2 + sw * 0.9, -2, 'r0'); A.L(2 + sw * 0.3, -9, 3 + sw * 0.9, -2, 'r3');
    // belt: thick leather, a bone buckle, a hanging fetish of beads
    A.R(-3, -11, 7, 2, 'lt0'); A.R(-3, -11, 7, 1, 'lt1'); A.R(0, -11, 2, 2, 'bone'); A.P(0, -11, 'boneHi');
    A.L(3, -10, 4, -6, 'lt0'); A.P(4, -7, 'bead'); A.P(4, -6, 'bead2'); A.P(3, -8, 'bead');
    // the bare torso: broad shoulders, narrow waist, chest and belly cut into plates of muscle, painted in blood
    for (let y = -17; y <= -11; y++) { const t = (y + 17) / 6, hw = 4.2 - t * 1.4; A.R(0.5 - hw, y + u * (1 - t), hw * 2, 1, 'sk2'); A.P(0.5 - hw, y + u * (1 - t), 'sk1'); A.P(0.5 + hw - 1, y + u * (1 - t), 'sk3'); }
    A.L(-2.5, -15 + u, -0.5, -14 + u, 'sk1'); A.L(1.5, -14 + u, 3.5, -15 + u, 'sk1');               // pectorals
    A.P(-2, -16 + u, 'skHi'); A.P(2, -16 + u, 'skHi');
    for (let i = 0; i < 2; i++) { A.P(0, -13 + i * 1.5 + u * 0.5, 'sk1'); A.P(1, -13 + i * 1.5 + u * 0.5, 'sk1'); A.P(-0.5, -12.5 + i * 1.5, 'sk3'); A.P(1.5, -12.5 + i * 1.5, 'sk3'); } // abdominals
    for (let i = 0; i < 2; i++) { A.L(-3, -13.5 + i * 1.5 + u * 0.5, -2, -13 + i * 1.5 + u * 0.5, 'pnt'); A.L(3, -13 + i * 1.5 + u * 0.5, 4, -13.5 + i * 1.5 + u * 0.5, 'pnt'); }   // blood stripes on the ribs
    A.P(0.5, -16 + u, 'pnt2'); A.P(0.5, -15 + u, 'pnt');                                                   // a mark on the breastbone
    A.R(-0.5, -18 + u, 2, 1, 'sk1');                                                                    // neck
    // the head: a hard, bare face under a black topknot, painted for war: white bars across the eyes,
    // blood lines down the cheeks and chin, a bone ring through the ear; the eyes burn faintly red
    const hx = 1, hy = -20.5 + u;
    A.E(hx, hy, 2.6, 2.9, 'sk2'); A.E(hx + 0.6, hy + 0.4, 1.9, 2.3, 'sk3'); A.P(hx - 1, hy - 2, 'skHi'); A.P(hx + 2, hy - 1, 'skHi');
    A.R(hx - 2, hy + 1.5, 1, 2, 'sk1'); A.R(hx - 1, hy + 2.5, 3.5, 1, 'sk1');                               // jaw in shadow
    A.R(hx - 2, hy - 3.5, 5, 2, 'hair'); A.P(hx - 3, hy - 2, 'hair'); A.P(hx - 3, hy - 1, 'hair');          // hair, shaved at the sides
    A.R(hx - 1, hy - 5.5, 2, 2, 'hair'); A.P(hx - 2, hy - 6, 'hair'); A.P(hx, hy - 7, 'hair'); A.P(hx - 1, hy - 5, 'bead2'); // topknot bound in red
    A.R(hx - 1, hy - 2, 4, 1, 'war'); A.P(hx - 1, hy - 3, 'war');                                        // a white bar of paint across the brow
    A.R(hx - 1, hy - 1, 4, 1, 'sk0'); A.P(hx, hy - 1, 'eye'); A.P(hx + 2, hy - 1, 'eye');                  // deep-set eyes, a red glint
    A.P(hx, hy, 'pnt'); A.P(hx + 2, hy, 'pnt');                                                            // a blood tear under each
    A.P(hx + 3, hy, 'sk1');                                                                                // nose
    A.R(hx + 0.5, hy + 1.5, 2, 1, 'sk0');                                                                  // mouth
    A.P(hx, hy + 2.5, 'war'); A.P(hx + 1.5, hy + 2.5, 'war'); A.P(hx + 3, hy + 2.5, 'war');                // white bars on the chin
    A.P(hx - 2, hy + 0.5, 'bone'); A.P(hx - 2, hy + 1.5, 'boneHi');                                        // bone in the ear
    // arms: bare and corded, a band of beads on each bicep, wraps at the wrists
    const arm = (pts, near) => { A.limb(pts, near ? 'sk2' : 'sk1', near ? 'sk0' : null, 2); const m = pts[1]; A.P(m[0], m[1] - 1, near ? 'skHi' : 'sk2'); const b0 = [(pts[0][0] + m[0]) / 2, (pts[0][1] + m[1]) / 2]; A.P(b0[0], b0[1], 'bead'); A.P(b0[0] + 1, b0[1], 'bead2'); const w = pts[2]; A.R(w[0] - 0.5, w[1] - 1, 2, 1, 'lt1'); };
    if (cast) {
      const k = ph ? 1 : 0.6;
      arm([[-3, -16 + u], [-5, -19], [-4, -22 - k]], false); arm([[4, -16 + u], [6, -19], [6, -22 - k]], true);
      A.P(6, -23 - k, 'bl'); for (let i = 0; i < 3; i++) A.P(6 + (i % 2), -24 - k - i * 1.5, i === 2 ? 'blHi' : 'bl');
      A.E(1, -25 - k, 1.4 + k * 0.7, 1.4 + k * 0.7, 'bl'); A.P(1, -25 - k, 'blHi');
    } else {
      arm([[-3, -16 + u], [-4, -13 + u], [-4 - sw * 0.6, -10 + u]], false);
      const wa = hit ? (ph ? [[4, -16 + u], [8, -14], [11, -13]] : [[4, -16 + u], [6, -19], [4, -22]]) : [[4, -16 + u], [5, -13 + u], [6 + sw * 0.6, -10 + u]];
      arm(wa, true); const h = wa[2];
      const dx = hit && ph ? 1 : hit ? 0 : 0.3, dy = hit && ph ? 0.3 : hit ? -1 : 1, L0 = Math.hypot(dx, dy);
      for (let i = 1; i <= 4; i++) A.P(h[0] + 1 + dx / L0 * i, h[1] + dy / L0 * i, i === 4 ? 'i2' : 'i1');
      A.P(h[0] + 1, h[1] + 1, 'bl');
    }
  },
  // The Assassin: lean, wrapped in violet, a horned bone mask, a trailing scarf, steel claws on both hands
  miasmancer(A, pose, ph) {
    const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0, u = br * 0.5, cast = pose === 'cast', hit = pose === 'atk', crouch = hit ? 1 : 0;
    // the scarf streams behind, longer when running
    const sl = 5 + Math.abs(sw) * 2 + (pose === 'walk' ? 2 : 0);
    for (let i = 0; i < sl; i++) A.P(-2 - i, -16 + u + Math.sin(G.time * 8 + i * 0.8) * (i * 0.15) + i * 0.3, i % 3 ? 'sc1' : 'sc0');
    // legs: long and light, wrapped tight
    A.limb([[-1, -8 + crouch], [-2 - sw, -4], [-1 - sw * 2.2, -1]], 'r1', null, 2); A.R(-2 - sw * 2.2, -1, 3, 1, 'r0');
    A.limb([[1, -8 + crouch], [3 + sw, -4 + crouch * 0.5], [2 + sw * 2.2, -1]], 'r3', 'r1', 2); A.R(2 + sw * 2.2, -1, 3, 1, 'r2');
    // torso: wrapped, a belt of bones
    A.R(-2, -16 + u + crouch, 5, 7, 'r2'); A.R(-2, -16 + u + crouch, 5, 1, 'r3'); A.R(-2, -16 + u + crouch, 1, 7, 'r1');
    for (let i = 0; i < 3; i++) A.L(-2, -14 + i * 2 + u + crouch, 2, -13 + i * 2 + u + crouch, 'r1');
    A.R(-2, -10 + crouch, 5, 1, 'm0'); A.P(0, -10 + crouch, 'm1'); A.P(2, -10 + crouch, 'm1');
    // the mask: a pale bone face with two curling horns, violet eye-light
    const hx = 1, hy = -19 + u + crouch;
    A.E(hx - 0.5, hy, 2.8, 2.9, 'r2'); A.E(hx + 0.5, hy + 0.3, 2.2, 2.4, 'm1'); A.E(hx, hy - 0.5, 1.4, 1.3, 'm2');
    A.R(hx, hy - 0.5, 2, 1, 'r0'); A.P(hx + 1, hy - 0.5, 'eye'); A.P(hx, hy - 0.5, 'eyeHi'); A.P(hx + 2, hy + 2, 'm0'); A.L(hx, hy + 1.5, hx + 1, hy + 2.5, 'm0');
    A.limb([[hx - 1, hy - 2], [hx - 3, hy - 5], [hx - 2, hy - 7], [hx, hy - 7]], 'h1'); A.P(hx, hy - 7, 'h2'); A.P(hx - 3, hy - 4, 'h2');
    A.limb([[hx + 2, hy - 2], [hx + 4, hy - 4], [hx + 4, hy - 6]], 'h0'); A.P(hx + 4, hy - 7, 'h1');
    // arms with claws: three blades each; a strike rakes across, the back arm following
    const claw = (h, dx, dy, c) => { for (let j = -1; j <= 1; j++) { const px = h[0] + 1, py = h[1] + j; A.L(px, py, px + dx * 3 - j * dy * 0.5, py + dy * 3 + j * 0.5, c); } A.P(h[0] + 1 + dx * 3, h[1] + dy * 3, 'cl2'); };
    if (cast) {
      const k = ph ? 1 : 0.6;
      A.limb([[-1, -15 + u], [-3, -18], [-3, -21 - k]], 'r1', null, 2); A.limb([[2, -15 + u], [5, -18], [5, -21 - k]], 'r3', 'r1', 2);
      A.E(1, -24 - k, 1.6 + k * 0.6, 1.6 + k * 0.6, 'gl'); A.P(1, -24 - k, 'eyeHi'); A.P(-3, -22 - k, 'cl1'); A.P(5, -22 - k, 'cl1');
    } else if (hit) {
      const a0 = ph ? [[-1, -14 + crouch], [3, -14], [6, -13]] : [[-1, -14 + crouch], [-3, -16], [-4, -18]];
      const a1 = ph ? [[2, -14 + crouch], [6, -11], [9, -9]] : [[2, -14 + crouch], [4, -18], [3, -21]];
      A.limb(a0, 'r1', null, 2); claw(a0[2], ph ? 1 : -0.3, ph ? 0.2 : -1, 'cl1');
      A.limb(a1, 'r3', 'r1', 2); claw(a1[2], ph ? 1 : 0.3, ph ? 0.6 : -1, 'cl2');
    } else {
      const a0 = [[-1, -14 + u], [-2, -11 + u], [-2 - sw * 0.6, -8 + u]], a1 = [[2, -14 + u], [3, -11 + u], [4 + sw * 0.6, -8 + u]];
      A.limb(a0, 'r1', null, 2); claw(a0[2], 0.3, 1, 'cl0'); A.limb(a1, 'r3', 'r1', 2); claw(a1[2], 0.6, 0.8, 'cl1');
    }
  }
};
const HERO_FR = {};
function heroFrame(cls, pose, ph) {
  const key = cls + '|' + pose + '|' + ph; let fr = HERO_FR[key]; if (fr) return fr;
  fr = mkFrame(38, 38, (x, ox, oy) => PPAINT[cls](painter(x, ox, oy, HPAL[cls]), pose, ph));
  HERO_FR[key] = fr; return fr;
}
// v0.24: eight facings. A world step (dx, dy) is snapped to one of the eight world directions (centred on the grid
// axes and diagonals, which is where paths run) and each is a painted view and a mirror, by where it goes on screen
// (iso: right = +x-y, down = +x+y):
//   R side, DR front (3/4 toward us), D down (straight toward us), DL front mirrored, L side mirrored,
//   UL back mirrored (3/4 away), U up (straight away), UR back. Straight up and down keep the last mirror.
// keep: stay in the current octant until the direction is well past its edge, so a path that runs near a
// boundary does not flicker between two views.
const VIEW8 = [['side', 1], ['front', 1], ['down', 0], ['front', -1], ['side', -1], ['back', -1], ['up', 0], ['back', 1]];
function dir8(o, dx, dy, keep) {
  if (dx * dx + dy * dy < 1e-10) return false;
  const a = Math.atan2(dy, dx) + Math.PI / 4; let oct = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;   // world +x is octant 1 (DR)
  if (keep && o._oct != null && oct !== o._oct) { let d = Math.abs(a - o._oct * Math.PI / 4) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d; if (d < Math.PI / 8 + 0.14) oct = o._oct; }
  const [v, f] = VIEW8[oct]; o._oct = oct; o._view = v; o._fb = v === 'back' || v === 'up'; if (f) o.face = f;
  return true;
}
function heroPose() {
  let mv = P._sx == null ? 0 : Math.hypot(P.x - P._sx, P.y - P._sy); if (mv > 1) mv = 0;   // a teleport or a zone change is not a step
  // moving (and not striking or casting, which face their target): face the way the body is actually going
  if (mv > 0.004 && P.cast <= 0 && P.swing <= 0) { dir8(P, P.x - P._sx, P.y - P._sy, true); P._mvT = G.time; }
  P._sx = P.x; P._sy = P.y; P._wd = (P._wd || 0) + mv;
  const moving = mv > 0.004 || (P._mvT != null && G.time - P._mvT < 0.09 && P.path && P.path.length);   // no one-frame idle blips mid-stride
  if (P.swing > 0) return ['atk', P.swing > 0.11 ? 0 : 1];
  if (P.cast > 0 || P.infuse || P.condensing || P.lancing) return ['cast', Math.floor(G.time * 6) % 2];
  if (moving && P.roll <= 0) return ['walk', Math.floor(P._wd * 4.5) % 4];
  return ['idle', Math.floor(G.time * 1.4) % 2];
}
// draws the hero where the old sprite s would have stood (scaled by k); returns that old rect
const HERO_SPR = () => ({ animancer: SPR.player, ossumancer: SPR.ossu, hemomancer: SPR.hemo, miasmancer: SPR.mias });
function drawHero(s, x, y, face, flash, alpha, lift, k) {
  const cls = P.cls, [pose, ph] = heroPose(), fr = heroFrame(cls, pose, ph), p = iso(x, y), K = k || 1;
  const img = (flash && OPT.flash) ? (face < 0 ? fr.flf : fr.fl) : (face < 0 ? fr.f : fr.c);
  const w = fr.w * K, h = fr.h * K, X = Math.round(p.sx - (face < 0 ? fr.w - fr.ox : fr.ox) * K), Y = Math.round(p.sy + 3 - (fr.oy + 1) * K - lift);
  if (P.roll > 0) { // a tumbling roll: the frame squashed low
    ctx.drawImage(img, X, Math.round(Y + h * 0.3), w, Math.round(h * 0.7));
  } else ctx.drawImage(img, X, Y, w, h);
  const sw = Math.round(s.w * K), sh = Math.round(s.h * K);
  return { x: Math.round(p.sx - sw / 2), y: Math.round(p.sy + 3 - sh - lift), w: sw, h: sh };
}
