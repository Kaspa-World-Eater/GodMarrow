// =================================================================== v0.37: the HEMOMANCER, sculpted
// A penitent of the Weeping Maiden. A tall, heavy-shouldered man bare to the waist, his back and forearms opened by
// the scourge; a tall pointed helm of hammered black iron (a capirote forged shut over the face) ringed with iron
// thorns at the brow, blood weeping from its eye slit; a mantle of wool gone stiff and black with old blood hanging
// from his left shoulder; a chain worn as a sash; a spiked cilice biting the right arm; his robe lowered and knotted
// at the waist with a rope, the skirt dark with blood from the hem up; shins bound in rags; the knotted scourge in
// his hand; a small iron reliquary with a smouldering heart at his hip (his lamp).
// v0.37: sculpted, not drawn. A small 3D rig is turned to each view; every form (trunk, limbs, helm, skirt, mantle)
// is a mesh rasterised into a z-buffer with per-pixel normals, lit by one warm key from the upper left and a cool rim
// from behind, with screen-space cast shadows and occlusion, then quantised into hand-picked hue-shifted ramps, with
// specular hits on iron and wet blood, texture as clusters, and a coloured outline broken where the light hits.
// The frame is 60 x 68 world px (feet at 30,64); its _hr twin is painted at 1.5x (one hero pixel = 2 screen pixels).
// Tag: hq (every top-level name here starts with HQ / hq).
{
  const HQ_W = 60, HQ_H = 68, HQ_OX = 30, HQ_OY = 64, HQ_S = 1.5, OXh = HQ_OX * HQ_S, OYh = HQ_OY * HQ_S, W2 = Math.round(HQ_W * HQ_S), H2 = Math.round(HQ_H * HQ_S);
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // hue-shifted ramps: shadows cool and saturated (violet, deep red), lights warm (ochre); o = coloured outline
  const HQM = {
    skin: { r: ['#1a1018', '#33202a', '#553438', '#7a4c48', '#9e6a58', '#c28e6e', '#e2b890'], o: '#12060d', tex: 0.07, spec: 0.22, sc: '#d9b294', sh: 24 },
    skinR: { r: ['#1a0a12', '#33101a', '#521a22', '#6e282a', '#8a3a32', '#a4523e', '#be6e50'], o: '#14050c', tex: 0.05, spec: 0 },
    iron: { r: ['#060609', '#0f0f16', '#1a1a23', '#282630', '#3a3640', '#554d52', '#7d6f6a'], o: '#050409', tex: 0.12, spec: 0.8, sc: '#e2d2bc', sh: 40, dent: 1, rimK: 0.75 },
    rust: { r: ['#120a0d', '#241011', '#3a1812', '#512314', '#693219', '#7e4420', '#945a2c'], o: '#0c0508', tex: 0.1, spec: 0 },
    robe: { r: ['#07060a', '#0e0b10', '#161116', '#1f181c', '#2a2124', '#372b2c', '#453633'], o: '#07050b', tex: 0.1, spec: 0, weave: 1 },
    blood: { r: ['#07030a', '#10060d', '#1a0a12', '#250e16', '#33141b', '#46201f', '#5c2e27'], o: '#07030a', tex: 0.1, spec: 0, weave: 1 },
    wet: { r: ['#12020a', '#2e0410', '#4e0817', '#700d1e', '#921626', '#b02530', '#c84240'], o: '#10020a', tex: 0.02, spec: 1, sc: '#f0b8a8', sh: 22 },
    rope: { r: ['#0f0a0c', '#1e1513', '#30231a', '#443224', '#58422f', '#6d533b', '#82664a'], o: '#0b0709', tex: 0.08, spec: 0, twist: 1 },
    rag: { r: ['#0e0b0f', '#1a1518', '#2a2224', '#3b302e', '#4d3f3a', '#605046', '#736253'], o: '#09070b', tex: 0.12, spec: 0, wrap: 1 },
    wood: { r: ['#0c070a', '#1a0f0f', '#2c1a15', '#40271c', '#553625', '#6b4730', '#80593c'], o: '#08050a', tex: 0.08, spec: 0.2, sc: '#9a7050', sh: 10 },
    lea: { r: ['#0c080b', '#1a1014', '#2a1a1b', '#3c2622', '#50342b', '#664436', '#7c5644'], o: '#08050a', tex: 0.06, spec: 0.2, sc: '#8a6a58', sh: 14 },
    tumor: { r: ['#1c0610', '#3a0c18', '#5e1622', '#84242c', '#a63a38', '#c45a4a', '#dc8266'], o: '#12030a', tex: 0.04, spec: 0.8, sc: '#f4c8b8', sh: 18 },
    chit: { r: ['#07050a', '#110c14', '#1c1420', '#2a1e2e', '#3a2a3e', '#4e3a50', '#664c64'], o: '#050308', tex: 0.05, spec: 0.9, sc: '#c8b8d0', sh: 30 },
    bone: { r: ['#1a1612', '#342c24', '#54483a', '#766852', '#988a6e', '#b8ab8c', '#d6cbb0'], o: '#100c0a', tex: 0.05, spec: 0.2, sc: '#eee6d0', sh: 14 },
    ember: { r: ['#140304', '#2a0606', '#420b06', '#5c1407', '#78200a', '#94300e', '#ae4414'], o: '#120306', tex: 0, spec: 0, emit: 0.3 }
  };
  const HQK = Object.keys(HQM); HQK.forEach((k, i) => { const m = HQM[k]; m.i = i; m.R = m.r.map(rgb); m.O = rgb(m.o); if (m.sc) m.SC = rgb(m.sc); });
  const hqCol = (m, i) => HQM[m].r[Math.max(0, Math.min(HQM[m].r.length - 1, i))];
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, s = t => t * t * (3 - 2 * t), a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * s(u) + (c - a) * s(v) + (a - b - c + d) * s(u) * s(v); };
  // key light from the upper left and a little toward us; a cool rim from behind on the right (x right, y up, z to us)
  const LK = (() => { const v = [-0.32, 0.55, 0.78], l = Math.hypot(...v); return v.map(c => c / l); })();
  const LR = (() => { const v = [0.75, 0.35, -0.55], l = Math.hypot(...v); return v.map(c => c / l); })();
  const LH = (() => { const v = [LK[0], LK[1], LK[2] + 1], l = Math.hypot(...v); return v.map(c => c / l); })();

  // ------------------------------------------------------------------- the sculptor: a z-buffered mesh painter
  function hqSculpt(Wd, Ht) {
    const N = Wd * Ht, Z = new Float32Array(N).fill(-1e9), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
    const M = new Int16Array(N).fill(-1), GR = new Int16Array(N).fill(-1), BI = new Float32Array(N), TU = new Float32Array(N), TV = new Float32Array(N);
    const FIN = new Map(), post = [];
    let gid = 0;
    const S = {
      W: Wd, H: Ht, Z, M, GR,
      group() { return gid++; },
      // a triangle: v = [sx, sy, depth], n = view-space normal [x, y up, z to us], uv = texture coords per vertex
      tri(a, b, c, na, nb, nc, mat, g, bias = 0, ua, ub, uc) {
        const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(Wd - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(Ht - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
        const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); if (Math.abs(area) < 1e-6) return;
        const mi = HQM[mat].i;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          let w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area, w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area, w2 = 1 - w0 - w1;
          if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
          const z = a[2] * w0 + b[2] * w1 + c[2] * w2, i = y * Wd + x; if (z <= Z[i]) continue;
          Z[i] = z; M[i] = mi; GR[i] = g; BI[i] = bias;
          const nx = na[0] * w0 + nb[0] * w1 + nc[0] * w2, ny = na[1] * w0 + nb[1] * w1 + nc[1] * w2, nz = na[2] * w0 + nb[2] * w1 + nc[2] * w2, l = Math.hypot(nx, ny, nz) || 1;
          NX[i] = nx / l; NY[i] = ny / l; NZ[i] = nz / l;
          if (ua) { TU[i] = ua[0] * w0 + ub[0] * w1 + uc[0] * w2; TV[i] = ua[1] * w0 + ub[1] * w1 + uc[1] * w2; } else { TU[i] = x; TV[i] = y; }
        }
      },
      // a shaded mark on whatever surface is there (if it is in front): takes that surface's normal, its own material
      mark(x, y, d, mat, bias = 0, eps = 0.8) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= Wd || y >= Ht) return false; const i = y * Wd + x; if (M[i] < 0 || d < Z[i] - eps) return false; M[i] = HQM[mat].i; BI[i] = bias; return true; },
      // a final colour (no shading) where the surface there is not in front of it
      dot(x, y, d, col, eps = 0.8) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= Wd || y >= Ht) return false; const i = y * Wd + x; if (M[i] >= 0 && d < Z[i] - eps) return false; FIN.set(i, col); return true; },
      // a free-floating solid pixel (cords, drops) that also writes depth, so later marks respect it
      solid(x, y, d, mat, n, bias = 0) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= Wd || y >= Ht) return; const i = y * Wd + x; if (d <= Z[i]) return; Z[i] = d; M[i] = HQM[mat].i; GR[i] = -2; BI[i] = bias; NX[i] = n[0]; NY[i] = n[1]; NZ[i] = n[2]; TU[i] = x; TV[i] = y; },
      at(x, y) { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= Wd || y >= Ht ? null : { z: Z[y * Wd + x], m: M[y * Wd + x] >= 0 ? HQK[M[y * Wd + x]] : null, g: GR[y * Wd + x] }; },
      post(f) { post.push(f); },
      render() {
        const c = mkCanvas(Wd, Ht), x = c.getContext('2d'), img = x.createImageData(Wd, Ht), D = img.data, IDX = new Int8Array(N).fill(-1), VAL = new Float32Array(N);
        const tl = Math.hypot(LK[0], LK[1]), sdx = -LK[0] / tl, sdy = -LK[1] / tl, zPerPx = LK[2] / (tl * HQ_S);
        for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
          const p = j * Wd + i, mi = M[p]; if (mi < 0) continue;
          const m = HQM[HQK[mi]], z = Z[p];
          let nx = NX[p], ny = NY[p], nz = NZ[p], bias = BI[p];
          if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; bias -= 0.12; }        // the inside of cloth
          // a dent field on hammered iron bends the normal
          if (m.dent) { const u = TU[p], v = TV[p], e = 0.6, h0 = vn(u / 1.6, v / 1.6), hx2 = vn((u + e) / 1.6, v / 1.6), hy2 = vn(u / 1.6, (v + e) / 1.6); nx += (h0 - hx2) * 0.45; ny -= (h0 - hy2) * 0.45; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; }
          let dif = nx * LK[0] + ny * LK[1] + nz * LK[2]; dif = Math.max(0, (dif + 0.1) / 1.1);
          // cast shadow: march toward the light across the screen; anything well in front of the ray there shades us
          let sh = 0;
          for (let k = 1; k <= 9; k++) { const qx = Math.round(i + sdx * k), qy = Math.round(j + sdy * k); if (qx < 0 || qy < 0 || qx >= Wd || qy >= Ht) break; const q = qy * Wd + qx; if (M[q] < 0 || GR[q] === GR[p]) continue; const zr = z + zPerPx * k; if (Z[q] > zr + 0.6 && Z[q] < zr + 7) { sh = 1; break; } }
          // occlusion: crevices between forms
          let oc = 0; for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const qx = i + dx, qy = j + dy; if (qx < 0 || qy < 0 || qx >= Wd || qy >= Ht) continue; const q = qy * Wd + qx; if (M[q] >= 0 && Z[q] > z + 0.9) oc++; }
          let v = 0.03 + 1.0 * Math.pow(dif, 1.28) * (sh ? 0.38 : 1);
          v *= 1 - 0.07 * oc;
          const rim = Math.max(0, nx * LR[0] + ny * LR[1] + nz * LR[2]) * Math.pow(1 - nz, 1.2);
          v += rim * (m.rimK || 0.45);
          // texture as clusters: grime, weave, rope twist, rag windings (in the surface's own coordinates)
          if (m.tex) { const u = TU[p], w = TV[p], g = vn(u / 2.3 + mi * 7, w / 2.3); if (g > 0.66) v -= m.tex * 1.6; else if (g < 0.2) v += m.tex * 0.7; }
          if (m.weave && ((Math.floor(TU[p] * 1.1) + Math.floor(TV[p] * 0.55)) % 5 === 0)) v -= 0.05;
          if (m.twist && ((Math.floor(TU[p] * 2) - Math.floor(TV[p] * 2)) % 3 + 3) % 3 === 0) v -= 0.13;
          if (m.wrap && (Math.floor(TV[p] * 1.2 + TU[p] * 0.35) % 3 === 0)) v -= 0.12;
          if (m.emit) v = Math.max(v, m.emit + 0.35 * dif);
          v += bias;
          const n = m.R.length; let idx = Math.round(Math.pow(Math.max(0, Math.min(1, v)), 0.9) * (n - 1));
          idx = Math.max(0, Math.min(n - 1, idx));
          // a specular hit: tight, on metal and wet blood
          let spec = 0; if (m.spec && !sh) { const hs = Math.max(0, nx * LH[0] + ny * LH[1] + nz * LH[2]); spec = Math.pow(hs, m.sh) * m.spec; }
          IDX[p] = spec > 0.6 ? 99 : idx; VAL[p] = v;
        }
        // clean-up: a lone pixel whose four neighbours of the same material agree takes their tone
        for (let j = 1; j < Ht - 1; j++) for (let i = 1; i < Wd - 1; i++) {
          const p = j * Wd + i; if (IDX[p] < 0 || IDX[p] === 99) continue; const mi = M[p]; let t = -2, ok = true;
          for (const q of [p - 1, p + 1, p - Wd, p + Wd]) { if (M[q] !== mi || IDX[q] < 0 || IDX[q] === 99) { ok = false; break; } if (t === -2) t = IDX[q]; else if (IDX[q] !== t) { ok = false; break; } }
          if (ok && t !== IDX[p] && Math.abs(t - IDX[p]) === 1) IDX[p] = t;
        }
        // a crease where one form passes in front of another: the one behind darkens a step along the edge
        for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
          const p = j * Wd + i; if (IDX[p] < 0 || IDX[p] === 99) continue;
          for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const qx = i + dx, qy = j + dy; if (qx < 0 || qy < 0 || qx >= Wd || qy >= Ht) continue; const q = qy * Wd + qx; if (M[q] >= 0 && GR[q] !== GR[p] && Z[q] > Z[p] + 1.4) { IDX[p] = Math.max(0, IDX[p] - (dx < 0 || dy < 0 ? 1 : 2)); break; } }
        }
        for (let p = 0; p < N; p++) { if (IDX[p] < 0) continue; const m = HQM[HQK[M[p]]], col = IDX[p] === 99 ? m.SC : m.R[IDX[p]]; const q = p * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
        for (const [p, cv] of FIN) { const col = rgb(cv), q = p * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
        for (const f of post) f(D, IDX);
        // the outline: coloured by the form it bounds; left open where that form's edge is in full light (upper left)
        const A0 = new Uint8ClampedArray(D);
        for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
          const q = (j * Wd + i) * 4; if (A0[q + 3]) continue;
          let best = -1, lit = true;
          for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const a = i + dx, b = j + dy; if (a < 0 || b < 0 || a >= Wd || b >= Ht) continue; const p = b * Wd + a; if (!A0[p * 4 + 3]) continue; if (best < 0) best = p; const hiLit = IDX[p] >= 5 || IDX[p] === 99; if (!(hiLit && (dx > 0 || dy > 0))) lit = false; }
          if (best < 0 || lit) continue;
          const O = M[best] >= 0 ? HQM[HQK[M[best]]].O : [10, 6, 10]; D[q] = O[0]; D[q + 1] = O[1]; D[q + 2] = O[2]; D[q + 3] = 255;
        }
        x.putImageData(img, 0, 0); return c;
      }
    };
    return S;
  }
  // ------------------------------------------------------------------- the rig
  const V3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], len: a => Math.hypot(a[0], a[1], a[2]), lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] };
  V3.norm = a => V3.mul(a, 1 / (V3.len(a) || 1));
  V3.cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  V3.dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // two-bone reach: the middle joint bent toward hint
  function ik(a, b, L1, L2, hint) {
    let d = V3.sub(b, a), L = V3.len(d); const maxL = (L1 + L2) * 0.995;
    if (L > maxL) { b = V3.add(a, V3.mul(d, maxL / L)); d = V3.sub(b, a); L = maxL; }
    const dn = V3.norm(d), x = (L * L + L1 * L1 - L2 * L2) / (2 * L), h = Math.sqrt(Math.max(0, L1 * L1 - x * x));
    let hp = V3.sub(hint, V3.mul(dn, V3.dot(hint, dn))); if (V3.len(hp) < 1e-4) hp = [0, 0, -1]; hp = V3.norm(hp);
    return [V3.add(V3.add(a, V3.mul(dn, x)), V3.mul(hp, h)), b];
  }
  const HQ_YAW = { side: 0, front: 0.9, down: Math.PI / 2, back: -0.9, up: -Math.PI / 2 };
  const HQ_PH = { idle: 4, walk: 8, atk: 4, cast: 4, rend: 4, hurl: 4, spew: 4, raise: 4 };
  // pose keys (body space: f forward, r toward his right, y up; world px)
  function hqPose(pose, ph) {
    const Q = { roll: 0, sroll: 0, htw: 0, pel: [0, 0, 19.2], lean: 0.1, tw: 0.1, nod: 0.16, fN: [3.0, 3.3, 0], fF: [-2.8, -3.2, 0], hN: [2.2, 7.6, 18.2], hF: [-0.8, -7.3, 18.6], eN: [-1, 0.5, 0], eF: [-1, -0.5, 0], chest: 0, scg: 'hang', sway: 0, hem: [0, 0], sleeve: 0, openF: false, gait: 0 };
    if (pose === 'idle') {
      const b = Math.sin(ph / 4 * Math.PI * 2);
      // contrapposto: his weight on the left leg, the hip there high, the right knee loose and forward, the shoulders
      // counter-tilted and turned, the scourge held out and ready, the helm bowed but breathing
      Q.pel = [0.1, -0.8, 19.0 - 0.12 * (1 - b) / 2]; Q.roll = 0.75; Q.sroll = 0.55 + 0.08 * b; Q.tw = 0.26; Q.htw = -0.16; Q.lean = 0.12;
      Q.fF = [-0.9, -3.1, 0]; Q.fN = [4.3, 4.7, 0.25]; Q.chest = 0.3 * b; Q.nod = 0.13 + 0.04 * b; Q.sway = 0.4 * b;
      Q.hN = [4.4, 6.6, 21.4 + 0.25 * b]; Q.eN = [-1, 0.7, -0.3]; Q.hF = [-1.6, -7.0, 18.8 + 0.25 * b]; Q.eF = [-0.6, -1, 0];
    } else if (pose === 'walk') {
      const t = ph / 8 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), A = 5.2;
      Q.fN = [A * c + 0.6, 2.9, Math.max(0, -s) * 2.6]; Q.fF = [-A * c + 0.6, -2.9, Math.max(0, s) * 2.6];
      Q.pel = [0.5, -0.25 * s, 19.3 + 0.8 * Math.abs(s)]; Q.lean = 0.13; Q.tw = -0.2 * c; Q.htw = 0.17 * c; Q.roll = 0.5 * s; Q.sroll = -0.4 * s; Q.nod = 0.1;
      Q.hF = [3.2 * c + 0.4, -6.8, 18.4 + Math.max(0, c) * 1.2]; Q.hN = [-1.8 * c + 3, 6.8, 19.5 + Math.max(0, -c) * 0.8]; Q.eN = [-1, 0.7, -0.2];
      Q.hem = [1.4 * Math.cos(t - 0.9), 0.2 * s]; Q.sway = -2.2 * Math.cos(t - 1.2); Q.sleeve = -1.6 * Math.cos(t - 1.3); Q.gait = s;
    } else if (pose === 'atk') {
      // anticipation (scourge raised back over the head), the smear, the lash, a quick settle
      const K = [
        { pel: [-0.6, 0, 19.3], lean: -0.05, tw: -0.4, nod: -0.06, fN: [4, 2.6, 0], fF: [-3.4, -2.4, 0], hN: [-7, 5.2, 40.5], eN: [0.4, 1, 0.9], hF: [4, -4.2, 27], eF: [-1, -1, -0.2], scg: 'trail', hem: [-0.8, 0] },
        { pel: [0.4, 0, 19.1], lean: 0.12, tw: 0.2, nod: 0.02, fN: [4.4, 2.6, 0], fF: [-3.4, -2.4, 0.6], hN: [5.5, 4.4, 37], eN: [-0.4, 1, 0.3], hF: [1.5, -5, 23], eF: [-1, -1, 0], scg: 'smear', hem: [0.4, 0] },
        { pel: [1.8, 0, 18.4], lean: 0.3, tw: 0.6, nod: -0.12, fN: [6, 2.6, 0], fF: [-3.6, -2.4, 0.4], hN: [11, 3.2, 23.5], eN: [-1, 1, 0], hF: [-3.5, -5.5, 19.5], eF: [0.2, -1, -1], scg: 'lash', hem: [1.4, 0] },
        { pel: [1.2, 0, 19], lean: 0.2, tw: 0.28, nod: 0.18, fN: [5, 2.6, 0], fF: [-3.2, -2.4, 0], hN: [7.5, 4.8, 20.5], eN: [-1, 0.8, 0], hF: [-1.5, -6, 19.5], eF: [-1, -1, 0], scg: 'settle', hem: [0.9, 0] }
      ][ph];
      Object.assign(Q, K);
    } else if (pose === 'cast') {
      // he lays the scourge across his own back, then opens the far hand and gives the blood out
      const K = [
        { pel: [0, 0, 19.4], lean: 0.18, tw: 0.15, nod: 0.3, hN: [1.6, 6.4, 18.5], eN: [-1, 0.6, 0], hF: [3.2, 0.4, 28.5], eF: [-1, -1, -0.6], scg: 'hang', hem: [0.1, 0] },
        { pel: [-0.4, 0, 19.2], lean: 0.02, tw: 0.35, nod: 0.05, fN: [3.4, 2.6, 0], hN: [2, 6.4, 19], eN: [-1, 0.6, 0], hF: [-3.5, -5.5, 25], eF: [0.2, -1, -0.8], scg: 'hang', hem: [-0.3, 0] },
        { pel: [0.9, 0, 19.4], lean: 0.1, tw: -0.45, nod: -0.08, fN: [3.6, 2.6, 0], hN: [1.8, 6.4, 19.5], eN: [-1, 0.6, 0], hF: [10.5, -2.2, 30.5], eF: [-0.3, -1, -0.6], scg: 'hang', openF: true, hem: [0.7, 0] },
        { pel: [0.7, 0, 19.5], lean: 0.08, tw: -0.4, nod: -0.02, fN: [3.6, 2.6, 0], hN: [1.6, 6.5, 19], eN: [-1, 0.6, 0], hF: [9.8, -2.6, 29.2], eF: [-0.3, -1, -0.6], scg: 'hang', openF: true, hem: [0.5, 0] }
      ][ph];
      Object.assign(Q, K);
    } else if (pose === 'rend') {
      // he lays the scourge over his shoulder across his own back, again and again
      const K = [
        { pel: [0, 0, 19.5], lean: 0.12, tw: -0.25, nod: 0.24, hN: [2.6, -1.8, 36], eN: [0.4, 1, -1], hF: [2.6, -0.6, 27], eF: [-1, -1, -0.3], scg: 'back', hem: [0.2, 0] },
        { pel: [0.3, 0, 19.2], lean: 0.22, tw: -0.3, nod: 0.3, hN: [1.2, -3.6, 37.5], eN: [0.6, 1, -0.6], hF: [2.8, -0.8, 26], eF: [-1, -1, -0.3], scg: 'back2', hem: [0.3, 0] },
        { pel: [0.1, 0, 19.4], lean: 0.16, tw: -0.2, nod: 0.26, hN: [3.4, 0.5, 34.5], eN: [0.3, 1, -1], hF: [2.4, -0.4, 27.5], eF: [-1, -1, -0.3], scg: 'back', hem: [0.2, 0] },
        { pel: [0.4, 0, 19.1], lean: 0.24, tw: -0.32, nod: 0.32, hN: [1, -3.9, 37.8], eN: [0.6, 1, -0.6], hF: [2.8, -0.8, 25.6], eF: [-1, -1, -0.3], scg: 'back2', hem: [0.3, 0] }
      ][ph];
      Object.assign(Q, K);
    } else if (pose === 'hurl') {
      // he tears a growth off his side and hurls it overhand with the free hand
      const K = [
        { pel: [0, 0, 19.3], lean: 0.18, tw: 0.3, nod: 0.25, hF: [0.5, -4.2, 21], eF: [-1, -1, 0], hN: [1.5, 6.6, 18], scg: 'hang', hem: [0, 0] },
        { pel: [-0.8, 0, 19.3], lean: -0.08, tw: 0.55, nod: -0.05, fN: [3.8, 2.6, 0], fF: [-3.4, -2.4, 0], hF: [-6.5, -4.5, 38], eF: [0.3, -1, 0.8], hN: [3, 6.4, 22], scg: 'hang', hem: [-0.6, 0] },
        { pel: [1.4, 0, 18.8], lean: 0.26, tw: -0.5, nod: -0.05, fN: [5.2, 2.6, 0], fF: [-3.4, -2.4, 0.4], hF: [10, -2, 33], eF: [-0.4, -1, -0.3], hN: [-2, 6.4, 20], scg: 'hang', openF: true, hem: [1.1, 0] },
        { pel: [1.2, 0, 19], lean: 0.2, tw: -0.35, nod: 0.08, fN: [5, 2.6, 0], fF: [-3.2, -2.4, 0], hF: [8, -1, 22.5], eF: [-1, -1, 0], hN: [-0.5, 6.5, 19], scg: 'hang', openF: true, hem: [0.8, 0] }
      ][ph];
      Object.assign(Q, K);
    } else if (pose === 'spew') {
      // hunched over, hands braced on his knees, blood pouring out of the helm's slit
      const h = [0, 0.4, -0.2, 0.3][ph];
      Object.assign(Q, { pel: [-0.4, 0, 18.2 - h * 0.3], lean: 0.5 + h * 0.05, tw: 0.05, nod: 0.3 + h * 0.1, fN: [3.4, 2.8, 0], fF: [-2.2, -2.8, 0], hN: [4.6, 3.6, 12.5], eN: [-0.6, 1, 0.3], hF: [4, -3.8, 12.8], eF: [-0.6, -1, 0.3], scg: 'hang', hem: [0.4, 0], spew: true });
    } else if (pose === 'raise') {
      // gathered low, then thrown open: arms wide and up, the helm tipped back in a scream
      const K = [
        { pel: [0, 0, 18.4], lean: 0.32, tw: 0, nod: 0.35, fN: [3, 2.9, 0], fF: [-2.4, -2.9, 0], hN: [3.4, -1, 22], eN: [-1, 1, 0], hF: [3.2, 1, 23], eF: [-1, -1, 0], scg: 'hang', hem: [0.3, 0] },
        { pel: [0, 0, 19.3], lean: 0.05, tw: 0, nod: 0.05, fN: [3, 2.9, 0], fF: [-2.4, -2.9, 0], hN: [2.4, 9.5, 32], eN: [-1, 1, -0.5], hF: [2.2, -9.5, 32], eF: [-1, -1, -0.5], scg: 'hang', hem: [0, 0] },
        { pel: [-0.2, 0, 19.8], lean: -0.12, tw: 0, nod: -0.3, fN: [3, 2.9, 0], fF: [-2.4, -2.9, 0], hN: [1, 10.5, 39], eN: [-0.5, 1, -0.2], hF: [1, -10.5, 39], eF: [-0.5, -1, -0.2], scg: 'hang', hem: [-0.3, 0], chest: 0.5 },
        { pel: [-0.1, 0, 19.7], lean: -0.1, tw: 0, nod: -0.26, fN: [3, 2.9, 0], fF: [-2.4, -2.9, 0], hN: [1.4, 10.2, 37.5], eN: [-0.5, 1, -0.2], hF: [1.4, -10.2, 37.5], eF: [-0.5, -1, -0.2], scg: 'hang', hem: [-0.2, 0], chest: 0.4 }
      ][ph];
      Object.assign(Q, K);
    }
    return Q;
  }
  function hqRig(pose, ph, view) {
    const phi = HQ_YAW[view] != null ? HQ_YAW[view] : HQ_YAW.front, Fx = Math.cos(phi), Fd = Math.sin(phi), Rx = -Math.sin(phi), Rd = Math.cos(phi);
    const Q = hqPose(pose, ph), J = { Q, view, pose, ph, Fx, Fd, Rx, Rd };
    // project a body-space point to HD pixels (with its depth toward the viewer)
    J.P = p => { const X = p[0] * Fx + p[1] * Rx, D = p[0] * Fd + p[1] * Rd; return [OXh + X * HQ_S, OYh + (-p[2] + D * 0.3) * HQ_S, D]; };
    J.D = p => p[0] * Fd + p[1] * Rd;
    // the trunk: cross-sections up the spine (height above the pelvis, half-width, half-depth)
    const up = [Math.sin(Q.lean), 0, Math.cos(Q.lean)];
    J.levels = [[-1.5, 3.8, 3.4], [0, 3.6, 3.2], [4, 3.3, 3.0], [7.5, 4.5, 3.25], [10.5, 5.4, 3.95], [12.2, 6.1, 3.9], [13.4, 4.6, 3.1], [14.7, 1.9, 1.9]];
    J.lv = h => { const L = J.levels; let i = 0; while (i < L.length - 2 && h > L[i + 1][0]) i++; const a = L[i], b = L[i + 1], t = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0]))); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
    J.twAt = h => Q.tw * Math.max(0, Math.min(1, (h - 2) / 11));
    J.spine = h => { const c = V3.add(Q.pel, V3.mul(up, h)); if (h > 9) c[2] += Q.chest * (h - 9) / 5; return c; };
    // a point on the trunk's surface: angle a (0 his right side, PI/2 his front, -PI/2 his back), out = offset
    J.surf = (h, a, out = 0) => {
      const [w, d] = J.lv(h), t = J.twAt(h), c = J.spine(h), ur = [Math.sin(t), Math.cos(t)], uf = [Math.cos(t), -Math.sin(t)];
      const ca = Math.cos(a), sa = Math.sin(a), p = [c[0] + ur[0] * (w + out) * ca + uf[0] * (d + out) * sa, c[1] + ur[1] * (w + out) * ca + uf[1] * (d + out) * sa, c[2]];
      const n = [ur[0] * ca * d + uf[0] * sa * w, ur[1] * ca * d + uf[1] * sa * w], nl = Math.hypot(n[0], n[1]) || 1;
      p.face = (n[0] * Fd + n[1] * Rd) / nl; return p;
    };
    // screen half-width and centre of a section
    J.sect = (h, dw = 0) => { const [w, d] = J.lv(h), t = J.twAt(h), ux = Math.sin(t) * Fx + Math.cos(t) * Rx, vx = Math.cos(t) * Fx - Math.sin(t) * Rx; const c = J.P(J.spine(h)); return [c[0], c[1], Math.hypot((w + dw) * ux, (d + dw) * vx) * HQ_S]; };
    // shoulders, arms
    const shH = 12.9, cS = J.spine(shH), tS = J.twAt(shH);
    J.shN = [cS[0] + Math.sin(tS) * 5.8, cS[1] + Math.cos(tS) * 5.8, cS[2] - 0.8 + (Q.sroll || 0)]; J.shF = [cS[0] - Math.sin(tS) * 5.8, cS[1] - Math.cos(tS) * 5.8, cS[2] - 0.8 - (Q.sroll || 0)];
    [J.elN, J.haN] = ik(J.shN, Q.hN, 7.3, 6.9, Q.eN); [J.elF, J.haF] = ik(J.shF, Q.hF, 7.3, 6.9, Q.eF);
    // legs
    const ht = Q.htw || 0, hr = Q.roll || 0, hipN = V3.add(Q.pel, [Math.sin(ht) * 2.9, Math.cos(ht) * 2.9, -0.4 - hr]), hipF = V3.add(Q.pel, [-Math.sin(ht) * 2.9, -Math.cos(ht) * 2.9, -0.4 + hr]);
    J.hipN = hipN; J.hipF = hipF;
    J.anN = V3.add(Q.fN, [0, 0, 1.9]); J.anF = V3.add(Q.fF, [0, 0, 1.9]);
    [J.knN] = ik(hipN, J.anN, 9.1, 9.1, [1, 0.15, 0]); [J.knF] = ik(hipF, J.anF, 9.1, 9.1, [1, -0.15, 0]);
    // the head: on the neck, bowed by nod
    const hd = Q.lean + Q.nod, nk = J.spine(14.6);
    J.neck = nk; J.hdir = [Math.sin(hd), 0, Math.cos(hd)]; J.head = V3.add(nk, V3.mul(J.hdir, 3.0));
    return J;
  }

  // ------------------------------------------------------------------- meshes
  const angD = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  const gs = (x, w) => Math.exp(-(x / w) * (x / w));
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // body-space normal (f, r, y) to view space (x right, y up, z toward us)
  const vN = (J, n) => { const x = n[0] * J.Fx + n[1] * J.Rx, z = n[0] * J.Fd + n[1] * J.Rd, l = Math.hypot(x, n[2], z) || 1; return [x / l, n[2] / l, z / l]; };
  // a grid of points P(i, j) as a surface; normals from the grid, turned outward from centre(i) when given
  function hqGrid(S, J, rows, cols, P, o) {
    const wrap = o.wrap, pts = [], nrm = [], scr = [];
    for (let i = 0; i <= rows; i++) { pts.push([]); for (let j = 0; j <= cols; j++) pts[i].push(P(i, j)); }
    for (let i = 0; i <= rows; i++) { nrm.push([]); scr.push([]); for (let j = 0; j <= cols; j++) {
      const a = pts[Math.max(0, i - 1)][j], b = pts[Math.min(rows, i + 1)][j];
      const jl = wrap ? (j === 0 ? cols - 1 : j - 1) : Math.max(0, j - 1), jr = wrap ? (j === cols ? 1 : j + 1) : Math.min(cols, j + 1);
      const c = pts[i][jl], d = pts[i][jr];
      let n = V3.cross(V3.sub(d, c), V3.sub(b, a)); if (V3.len(n) < 1e-6) n = o.nrm0 ? o.nrm0(i, j) : [1, 0, 0];
      n = V3.norm(n); if (o.centre) { const C = o.centre(i, j); if (V3.dot(n, V3.sub(pts[i][j], C)) < 0) n = V3.mul(n, -1); }
      if (o.nrm) n = o.nrm(i, j, n);
      nrm[i].push(vN(J, n)); scr[i].push(J.P(pts[i][j]));
    } }
    const uv = o.uv || ((i, j) => [j * 2, i * 2]);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const mat = o.matAt ? o.matAt(i, j, pts[i][j]) : o.mat; if (!mat) continue;
      const bias = o.biasAt ? o.biasAt(i, j) : (o.bias || 0);
      const A = scr[i][j], B = scr[i][j + 1], C = scr[i + 1][j + 1], Dd = scr[i + 1][j];
      S.tri(A, B, C, nrm[i][j], nrm[i][j + 1], nrm[i + 1][j + 1], mat, o.g, bias, uv(i, j), uv(i, j + 1), uv(i + 1, j + 1));
      S.tri(A, C, Dd, nrm[i][j], nrm[i + 1][j + 1], nrm[i + 1][j], mat, o.g, bias, uv(i, j), uv(i + 1, j + 1), uv(i + 1, j));
    }
    return { pts, scr };
  }
  // a tube along an axis (radii per axis point), sealed with round ends
  function hqTube(S, J, axis, radii, mat, g, o = {}) {
    const n = axis.length, sides = o.sides || 10, frames = [];
    for (let i = 0; i < n; i++) {
      const t = V3.norm(V3.sub(axis[Math.min(n - 1, i + 1)], axis[Math.max(0, i - 1)]));
      let u = V3.cross(t, Math.abs(t[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]); u = V3.norm(u); const v = V3.cross(t, u); frames.push([u, v]);
    }
    const out = hqGrid(S, J, n - 1, sides, (i, j) => { const a = j / sides * Math.PI * 2, [u, v] = frames[i], r = radii[i] * (o.prof ? o.prof(i, a) : 1); return V3.add(axis[i], V3.add(V3.mul(u, Math.cos(a) * r), V3.mul(v, Math.sin(a) * r))); },
      { wrap: true, g, mat, bias: o.bias, matAt: o.matAt, uv: (i, j) => [j / sides * 2 * Math.PI * radii[Math.min(i, n - 1)] * HQ_S, i * (o.vstep || 3)], nrm: (i, j) => { const a = j / sides * Math.PI * 2, [u, v] = frames[i]; return V3.add(V3.mul(u, Math.cos(a)), V3.mul(v, Math.sin(a))); } });
    if (o.caps !== false) { hqBall(S, J, axis[0], [radii[0], radii[0], radii[0]], mat, g, { bias: o.bias }); hqBall(S, J, axis[n - 1], [radii[n - 1], radii[n - 1], radii[n - 1]], mat, g, { bias: o.bias }); }
    return out;
  }
  // an ellipsoid (radii along f, r, y)
  function hqBall(S, J, c, R, mat, g, o = {}) {
    const rows = o.rows || 7, cols = o.cols || 12;
    return hqGrid(S, J, rows, cols, (i, j) => { const ph = -Math.PI / 2 + i / rows * Math.PI, th = j / cols * Math.PI * 2; return [c[0] + R[0] * Math.cos(ph) * Math.cos(th), c[1] + R[1] * Math.cos(ph) * Math.sin(th), c[2] + R[2] * Math.sin(ph)]; },
      { wrap: true, g, mat, bias: o.bias, nrm: (i, j) => { const ph = -Math.PI / 2 + i / rows * Math.PI, th = j / cols * Math.PI * 2; return V3.norm([Math.cos(ph) * Math.cos(th) / R[0], Math.cos(ph) * Math.sin(th) / R[1], Math.sin(ph) / R[2]]); }, uv: (i, j) => [j * 1.5, i * 1.5] });
  }
  // a line of free pixels between 3D points (cords, fingers); each takes a normal facing the light a little
  function hqCord(S, J, pts, mat, bias = 0, n = [-0.3, 0.4, 0.86]) {
    for (let k = 0; k < pts.length - 1; k++) {
      const a = J.P(pts[k]), b = J.P(pts[k + 1]), L = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.3));
      for (let s = 0; s <= L; s++) { const t = s / L; S.solid(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + 0.2, mat, n, bias); }
    }
  }
  // the trunk's radius field: muscle under the skin (additive to the section's half-width and half-depth)
  function hqTorsoBump(h, a) {
    let b = 0;
    for (const s of [0.3 * Math.PI, 0.7 * Math.PI]) b += 0.8 * gs(angD(a, s), 0.2 * Math.PI) * gs(h - 10.6, 1.4) * sstep(8.9, 9.6, h);   // the chest, a hard lower edge
    b -= 0.2 * gs(angD(a, Math.PI / 2), 0.035 * Math.PI) * sstep(2.5, 3.5, h) * (1 - sstep(12, 13, h));                               // the groove down the middle
    for (const hk of [4.3, 6.1, 7.9]) b -= 0.22 * gs(h - hk, 0.32) * gs(angD(a, Math.PI / 2), 0.14 * Math.PI);                          // the gut's ridges
    for (const s of [0.07 * Math.PI, 0.93 * Math.PI]) b += 0.5 * gs(angD(a, s), 0.12 * Math.PI) * gs(h - 9.6, 1.9);                    // lats
    b -= 0.42 * gs(angD(a, 1.5 * Math.PI), 0.045 * Math.PI) * sstep(1, 2.5, h) * (1 - sstep(13, 14, h));                              // the spine's groove
    for (const s of [1.28 * Math.PI, 1.72 * Math.PI]) b += 0.6 * gs(angD(a, s), 0.11 * Math.PI) * gs(h - 11, 1.3);                   // the blades
    return b;
  }

  // ------------------------------------------------------------------- the painting
  function hqPaint(S, J, g) {
    const Q = J.Q, P = J.P;
    const gL = S.group(), gT = S.group(), gA = S.group(), gH = S.group(), gC = S.group(), gK = S.group(), gW = S.group(), gM = S.group(), gX = S.group();
    // ---- legs, bound in rags; bare feet
    for (const [kn, an, ft] of [[J.knF, J.anF, Q.fF], [J.knN, J.anN, Q.fN]]) {
      hqTube(S, J, [kn, V3.lerp(kn, an, 0.45), an], [1.85, 1.6, 1.2], 'rag', gL, { sides: 9, vstep: 2 });
      const lift = ft[2] > 0.3, heel = V3.add(an, [-0.9, 0, -1.3]), toe = V3.add(an, [3.1, 0, lift ? -1.1 : -1.65]);
      hqTube(S, J, [heel, V3.add(an, [1.1, 0, -1.3]), toe], [0.95, 1.0, 0.75], 'skin', gL, { sides: 8, bias: -0.12 });
    }
    // ---- the skirt: heavy wool falling in folds from the knot, stiff and black with blood from the hem up
    const topY = Q.pel[2] + 3.4, hemY = 8.6 + Math.abs(Q.gait) * 0.3, hf = Q.hem[0], stride = Math.abs(Q.fN[0] - Q.fF[0]);
    const secs = [[topY, 4.1, 3.2, 0], [Q.pel[2] - 0.5, 4.8, 3.9, 0.1], [12.5, 5.9, 5.0 + stride * 0.08, hf * 0.5], [hemY, 6.9, 6.0 + stride * 0.15, hf]];
    const secAt = t => { const x = t * 3, i = Math.min(2, Math.floor(x)), u = x - i, a = secs[i], b = secs[i + 1]; return a.map((v, k) => v + (b[k] - v) * u); };
    const SR = 10, SC = 64, stainY = g.tier >= 1 ? 17 : 14.5, topF = J.spine(3.4)[0];
    hqGrid(S, J, SR, SC, (i, j) => {
      const t = i / SR, s = secAt(t), a = j / SC * Math.PI * 2, fold = 1 + (0.13 * (0.62 - Math.abs(Math.sin(a * 4.5 + 0.8 + Q.sway * 0.3 * t))) + 0.05 * (0.6 - Math.abs(Math.sin(a * 8.5 + 2 - Q.sway * 0.2 * t)))) * sstep(0, 0.45, t);
      let y = s[0]; if (i === SR) y += -hash(j, 3) * 1.6 - (j % 4 === 0 ? 0.9 : 0);
      const cf = topF * (1 - t) + (Q.pel[0] + s[3]) * t;
      return [cf + Math.sin(a) * s[2] * fold, Math.cos(a) * s[1] * fold, y];
    }, { wrap: true, g: gT, centre: (i) => [Q.pel[0] + secAt(i / SR)[3], 0, secAt(i / SR)[0]], uv: (i, j) => [j * 1.6, i * 2.6], matAt: (i, j, p) => (i >= SR * 0.45 && Math.abs(angD(j / SC * Math.PI * 2, Math.PI / 2 + 0.12)) < 0.2 * Math.PI * Math.min(1, (i / SR - 0.4) / 0.6)) ? null : p[2] < stainY + (hash(j, 5) - 0.5) * 2.5 ? 'blood' : 'robe' });
    // ---- the trunk, bare, scourged
    const TR = 34, TC = 36, h0 = -1.5, h1 = 14.9, up = [Math.sin(Q.lean), 0, Math.cos(Q.lean)];
    const tsurf = (h, a, out = 0) => { const [w, d] = J.lv(h), tw = J.twAt(h), c = J.spine(h), b = hqTorsoBump(h, a) + out, ur = [Math.sin(tw), Math.cos(tw), 0], uf = [Math.cos(tw), -Math.sin(tw), 0]; return V3.add(c, V3.add(V3.mul(ur, (w + b) * Math.cos(a)), V3.mul(uf, (d + b) * Math.sin(a)))); };
    J.tsurf = tsurf;
    hqGrid(S, J, TR, TC, (i, j) => tsurf(h0 + (h1 - h0) * i / TR, j / TC * Math.PI * 2), { wrap: true, g: gT, mat: 'skin', centre: i => J.spine(h0 + (h1 - h0) * i / TR), uv: (i, j) => [j / TC * 40, i * 1.2] });
    // the neck under the helm
    hqTube(S, J, [J.spine(14.2), V3.add(J.neck, V3.mul(J.hdir, 1))], [2.2, 1.9], 'skin', gT, { sides: 10 });
    // ---- the robe rolled at the waist, the rope over it and its knot, the empty sleeve
    const band = (hc, off, rt, mat, g2, twistUV) => hqGrid(S, J, 5, 36, (i, j) => { const ph = i / 5 * Math.PI * 2, a = j / 36 * Math.PI * 2, [w, d] = J.lv(hc), tw = J.twAt(hc), c = J.spine(hc + Math.sin(ph) * rt), ur = [Math.sin(tw), Math.cos(tw), 0], uf = [Math.cos(tw), -Math.sin(tw), 0], rr = off + rt * Math.cos(ph) + 0.12 * Math.sin(a * 6); return V3.add(c, V3.add(V3.mul(ur, (w + rr) * Math.cos(a)), V3.mul(uf, (d + rr) * Math.sin(a)))); },
      { wrap: true, g: g2, mat, centre: () => J.spine(hc), uv: (i, j) => twistUV ? [j * 1.4, i * 1.4 + j * 0.7] : [j * 1.5, i * 2] });
    band(3.3, 0.6, 1.1, g.tier >= 1 ? 'blood' : 'robe', gW);
    band(1.7, 1.1, 0.55, 'rope', gW, true);
    const knot = tsurf(1.6, 0.36 * Math.PI, 1.5);
    hqBall(S, J, knot, [1.2, 1.1, 1.0], 'rope', gW);
    for (const [dr, len, lag] of [[-0.5, 6.5, 0.3], [0.6, 5, 0.6]]) { const tip = V3.add(knot, [0.3 + Q.sway * 0.25 * (1 + lag), dr, -len]); hqTube(S, J, [knot, V3.add(V3.lerp(knot, tip, 0.5), [Q.sway * 0.25, 0, 0]), tip], [0.55, 0.5, 0.42], 'rope', gW, { sides: 6 }); }
    { const s0 = tsurf(3.2, 0.06 * Math.PI, 1.4), s1 = V3.add(s0, [-0.6 + Q.sleeve * 0.7, 0.6, -7.5]), s2 = V3.add(s0, [-1.3 + Q.sleeve, 0.8, -11]);
      hqTube(S, J, [s0, s1, s2], [1.5, 1.35, 1.1], 'robe', gW, { sides: 8, prof: (i, a) => 1 + 0.12 * Math.sin(a * 3), matAt: (i) => i >= 1 ? 'blood' : 'robe' }); }
    // ---- the mantle: wool stiff with old blood, hanging from his left shoulder round his back
    { const MR = 12, MC = 30, a0 = 0.55 * Math.PI, a1 = 1.52 * Math.PI, top = J.spine(12.9), tw = J.twAt(12.9), ur = [Math.sin(tw), Math.cos(tw), 0], uf = [Math.cos(tw), -Math.sin(tw), 0];
      hqGrid(S, J, MR, MC, (i, j) => {
        const t = i / MR, a = a0 + (a1 - a0) * j / MC, edge = Math.min(j, MC - j) / MC;
        const drop = (12.5 + hash(j, 11) * 2.5 + (j % 3 === 1 ? 1.4 : 0)) * t + (edge < 0.12 ? -1.2 * (0.12 - edge) * 8 * t : 0);
        const fo = 0.75 * (0.6 - Math.abs(Math.sin(a * 5 + 1 + Q.sway * 0.2 * t))) * sstep(0, 0.5, t), rw = 6.1 + 1.6 * t + fo, rd = 4.3 + 1.8 * t + fo, sw = -Q.sway * 0.4 * t * t;
        const c = [top[0] * (1 - t) + (Q.pel[0] - 0.4) * t + sw, top[1], top[2] + 1.0 - drop];
        return V3.add(c, V3.add(V3.mul(ur, rw * Math.cos(a)), V3.mul(uf, rd * Math.sin(a))));
      }, { g: gM, mat: 'blood', bias: 0.04, centre: (i) => [J.spine(12.9)[0], 0, J.spine(12.9)[2] - 6 * i / MR], uv: (i, j) => [j * 2.2, i * 2.5] });
      // the fold of it over the shoulder
      hqBall(S, J, V3.add(J.shF, [0, -0.6, 0.9]), [2.6, 2.3, 1.7], 'blood', gM, { bias: 0.06 });
    }
    // ---- arms
    const arm = (far) => {
      const sh = far ? J.shF : J.shN, el = far ? J.elF : J.elN, ha = far ? J.haF : J.haN, g2 = far ? gK : gA, dir = V3.norm(V3.sub(ha, el));
      hqBall(S, J, V3.add(sh, [0, 0, -0.2]), [2.3, 2.4, 2.2], 'skin', g2);
      hqTube(S, J, [sh, V3.lerp(sh, el, 0.35), V3.lerp(sh, el, 0.7), el], [2.1, 2.0, 1.6, 1.25], 'skin', g2, { sides: 10 });
      const wr = V3.lerp(el, ha, 0.92);
      hqTube(S, J, [el, V3.lerp(el, ha, 0.25), V3.lerp(el, ha, 0.65), wr], [1.3, 1.45, 1.1, 0.88], 'skin', g2, { sides: 10 });
      const fist = V3.add(ha, V3.mul(dir, 0.8));
      if (far && Q.openF) {
        hqBall(S, J, fist, [1.25, 1.0, 1.1], 'skin', g2);
        for (let i = 0; i < 4; i++) { const side = (i - 1.5) * 0.5, tip = V3.add(fist, V3.add(V3.mul(dir, 2.6 - Math.abs(side) * 0.4), [0, side, side * 0.3 - 0.2])); hqCord(S, J, [fist, tip], 'skin', 0.05); }
      } else hqBall(S, J, fist, [1.3, 1.25, 1.2], 'skin', g2);
      // rope bound round the wrist
      hqTube(S, J, [V3.add(wr, V3.mul(dir, -0.35)), V3.add(wr, V3.mul(dir, 0.35))], [1.05, 1.05], 'rope', g2, { sides: 8, caps: false });
      // the cilice on the right arm: an iron band biting the muscle, spikes standing out of it
      if (!far) {
        const c = V3.lerp(sh, el, 0.5), t = V3.norm(V3.sub(el, sh));
        hqTube(S, J, [V3.add(c, V3.mul(t, -0.45)), V3.add(c, V3.mul(t, 0.45))], [2.0, 2.0], 'iron', gX, { sides: 12, caps: false });
        let u = V3.norm(V3.cross(t, [0, 0, 1])); const v = V3.cross(t, u);
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, d = V3.add(V3.mul(u, Math.cos(a)), V3.mul(v, Math.sin(a))); hqTube(S, J, [V3.add(c, V3.mul(d, 1.9)), V3.add(c, V3.mul(d, 3.0))], [0.42, 0.05], 'iron', gX, { sides: 5, caps: false }); }
        J.cilice = { c, t, u, v };
      }
    };
    arm(true); arm(false);
    // ---- the helm
    hqHelm(S, J, gH);
    // ---- the scourge, the reliquary
    const sc = hqScourge(S, J, gC);
    const rl = hqReliquary(S, J, gC); J.lamp = rl;
    // ---- marks on the flesh: welts on the back, the chain sash, the forearms, blood run down the skirt
    hqMarks(S, J, g, tsurf);
    if (g.mut) hqMutations(S, J, g, tsurf, gX);
    if (Q.scg === 'smear') hqSmear(S, J, sc);
  }

  // his mutations, grown into the body so they follow every pose and view
  function hqMutations(S, J, g, tsurf, gX) {
    const m = g.mut, P = J.P;
    if (m.includes('h')) {   // the tumor hump on his upper back
      for (const [h, a, r] of [[11.6, 1.5, 2.6], [10.2, 1.36, 1.9], [12.6, 1.62, 1.7], [9.4, 1.6, 1.4], [11.2, 1.72, 1.5]]) hqBall(S, J, tsurf(h, a * Math.PI, r * 0.6), [r, r, r * 0.9], 'tumor', gX);
    }
    if (m.includes('c')) {   // chitin plates on the shoulders, forearms and breast
      for (const far of [false, true]) { const sh = far ? J.shF : J.shN, el = far ? J.elF : J.elN, ha = far ? J.haF : J.haN;
        hqBall(S, J, V3.add(sh, [0, far ? -0.4 : 0.4, 1.3]), [2.4, 2.2, 1.1], 'chit', gX); hqBall(S, J, V3.add(sh, [0, far ? -1.2 : 1.2, -0.4]), [1.9, 1.3, 1.6], 'chit', gX);
        hqBall(S, J, V3.lerp(el, ha, 0.45), [1.4, 1.4, 1.9], 'chit', gX); }
      for (const a of [0.36, 0.64]) hqBall(S, J, tsurf(10.8, a * Math.PI, 0.5), [1.3, 1.9, 1.2], 'chit', gX);
    }
    if (m.includes('g')) {   // gills split along the neck
      for (const side of [0.15, 0.85]) for (let k = 0; k < 3; k++) { const p = P(tsurf(14.1 - k * 0.45, side * Math.PI, 0.1)); for (let d = -1; d <= 1; d++) { S.mark(p[0] + d, p[1], p[2] + 0.5, 'wet', -0.2, 1.5); S.mark(p[0] + d, p[1] - 1, p[2] + 0.5, 'skinR', 0.15, 1.5); } }
    }
    if (m.includes('m')) {   // the belly maw: a toothed split, gaping when it opens
      const open = m.includes('o'), c = tsurf(5.2, 0.5 * Math.PI, 0.2);
      if (open) hqBall(S, J, V3.add(c, [0.6, 0, 0]), [0.8, 2.6, 2.2], 'wet', gX, { bias: -0.35 });
      for (let k = -4; k <= 4; k++) { const p = P(tsurf(5.2 + k * (open ? 0.45 : 0.32), 0.5 * Math.PI, 0.25)); S.dot(p[0], p[1], p[2] + 0.6, '#08020a', 2); if (Math.abs(k) < 4) { S.dot(p[0] - 1, p[1], p[2] + 0.6, '#d6cbb0', 2); S.dot(p[0] + 1, p[1], p[2] + 0.6, '#b8ab8c', 2); } }
    }
    if (m.includes('b')) {   // the second heart, swollen under the skin, beating
      const beat = m.includes('B') ? 1.2 : 1;
      hqBall(S, J, tsurf(10.4, 0.72 * Math.PI, 0.4 * beat), [1.4 * beat, 1.5 * beat, 1.6 * beat], 'tumor', gX);
      for (let k = 0; k < 4; k++) { const p = P(tsurf(10.4 + (k - 1.5) * 1.1, (0.72 + (k % 2 ? 0.1 : -0.1)) * Math.PI, 0.3)); S.mark(p[0], p[1], p[2] + 0.5, 'wet', -0.1, 1.5); }
    }
    if (m.includes('t')) {   // the stubs his tentacles grow from
      for (const a of [1.35, 1.5, 1.65]) hqBall(S, J, tsurf(11.5, a * Math.PI, 0.6), [0.9, 0.9, 0.9], 'tumor', gX);
    }
  }

  function hqHelm(S, J, g) {
    const Q = J.Q, hd = Q.lean + Q.nod, ax = J.hdir, ff = [Math.cos(hd), 0, -Math.sin(hd)], head = J.head;
    const prof = [[-4.0, 3.2, 3.3], [-3.2, 2.85, 3.15], [-2.2, 2.65, 3.1], [0, 2.75, 3.15], [1.7, 2.7, 3.0], [2.5, 2.5, 2.75], [4, 2.15, 2.35], [6, 1.72, 1.85], [8.5, 1.2, 1.3], [11, 0.72, 0.78], [13, 0.34, 0.38], [14.6, 0.02, 0.02]];
    const pAt = h => { let i = 0; while (i < prof.length - 2 && h > prof[i + 1][0]) i++; const a = prof[i], b = prof[i + 1], t = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0]))); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
    const cAt = h => { const c = V3.add(head, V3.mul(ax, h)); if (h > 2.5) { const k = (h - 2.5); c[0] -= 0.012 * k * k; } return c; };
    const hs = (h, a, out = 0) => { const [w, d] = pAt(h), prow = 0.38 * gs(angD(a, Math.PI / 2), 0.2 * Math.PI) * gs(h + 0.8, 2.2); return V3.add(cAt(h), V3.add([0, (w + out) * Math.cos(a), 0], V3.mul(ff, (d + out + prow) * Math.sin(a)))); };
    J.hs = hs;
    const HR = 30, HC = 28, hA = -4.0, hB = 14.6;
    hqGrid(S, J, HR, HC, (i, j) => hs(hA + (hB - hA) * Math.pow(i / HR, 1.15), j / HC * Math.PI * 2), { wrap: true, g, mat: 'iron', centre: i => cAt(hA + (hB - hA) * Math.pow(i / HR, 1.15)), uv: (i, j) => [j * 1.3, i * 1.4],
      matAt: (i, j, p) => { const h = hA + (hB - hA) * Math.pow(i / HR, 1.15); return vn(j * 0.9, h * 0.35) > 0.74 - (h > 3 ? 0.05 : 0) ? 'rust' : 'iron'; } });
    // the brow band, riveted, and the thorns standing out of it
    hqGrid(S, J, 4, 28, (i, j) => { const ph = i / 4 * Math.PI * 2, a = j / 28 * Math.PI * 2; return hs(1.9 + Math.sin(ph) * 0.38, a, 0.15 + 0.3 * Math.cos(ph)); }, { wrap: true, g, mat: 'iron', centre: () => cAt(1.9), bias: 0.06 });
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + 0.25, b = hs(2.1, a, 0.2), tip = hs(4.4 + (k % 2) * 1.2, a, 1.0 + (k % 3) * 0.35); hqTube(S, J, [b, tip], [0.55, 0.04], 'iron', g, { sides: 6, caps: false }); }
    // the eye slit and breathing slit: black; the lip above lit; blood weeping from the slit
    const front = vN(J, V3.sub(hs(0, Math.PI / 2), cAt(0)))[2];
    if (front > -0.1) {
      for (let k = 0; k <= 16; k++) { const a = Math.PI / 2 + (k / 16 - 0.5) * 1.55, p = J.P(hs(0.35, a, 0.02)), q = J.P(hs(0.8, a, 0.02)); S.dot(p[0], p[1], p[2], '#030204'); S.dot(p[0], p[1] + 1, p[2], '#07040a'); S.mark(q[0], q[1], q[2], 'iron', 0.28); }
      for (let h = -0.3; h > -3.1; h -= 0.3) { const p = J.P(hs(h, Math.PI / 2, 0.02)); S.dot(p[0], p[1], p[2], '#030204'); }
      for (const [da, len] of [[-0.55, 3.2], [0.55, 4.0], [0.18, 2.2]]) for (let h = 0.2; h > 0.2 - len; h -= 0.25) { const p = J.P(hs(h, Math.PI / 2 + da + (h < -1.5 ? da * 0.1 : 0), 0.05)); S.mark(p[0], p[1], p[2], 'wet', 0.05); }
    }
    // rivets up the seam of the cone
    for (let h = 3; h < 12; h += 1.5) { const p = J.P(hs(h, Math.PI / 2 - 0.3, 0.12)); S.mark(p[0], p[1], p[2], 'iron', 0.35); }
    if (J.Q.spew) for (let k = 0; k < 7; k++) { const p = J.P(V3.add(hs(-1.8, Math.PI / 2, 0.3), [0.3 + k * 0.15, 0, -k * 0.75])); S.solid(p[0], p[1], p[2] + 1, 'wet', [-0.3, 0.3, 0.9], 0.05); S.solid(p[0] + 1, p[1], p[2] + 1, 'wet', [0.4, 0.2, 0.9], -0.05); }
  }

  // the scourge: a wooden grip and five knotted cords with iron barbs
  function hqScourge(S, J, g) {
    const Q = J.Q, ha = J.haN, el = J.elN, dir = V3.norm(V3.sub(ha, el)), mode = Q.scg, n = 5, L = 11.5, sw = Q.sway;
    let gd;
    if (mode === 'trail') gd = V3.norm([-0.6, 0.1, 0.6]); else if (mode === 'smear') gd = V3.norm([0.9, 0.1, 0.5]); else if (mode === 'lash') gd = V3.norm([1, 0, -0.25]);
    else if (mode === 'back' || mode === 'back2') gd = V3.norm([-0.4, -0.3, 0.85]); else gd = V3.norm(V3.add(V3.mul(dir, 0.4), [0.9, 0.35, -0.2]));
    const g0 = V3.add(ha, V3.mul(gd, -0.9)), g1 = V3.add(ha, V3.mul(gd, 3.4)), cords = [];
    hqTube(S, J, [g0, g1], [0.6, 0.55], 'wood', g, { sides: 6 });
    hqBall(S, J, g1, [0.75, 0.75, 0.75], 'iron', g);
    for (let i = 0; i < n; i++) {
      const s = i - (n - 1) / 2, pts = [g1];
      for (let k = 1; k <= 7; k++) {
        const t = k / 7; let p;
        if (mode === 'hang') p = V3.add(g1, [1.4 * t - 0.6 * t * t + sw * 0.35 * t * t + s * 0.12 * t, 0.8 * t + s * 0.45 * t, -L * t * 0.95]);
        else if (mode === 'settle') p = V3.add(g1, [2.2 * t - 0.8 * t * t + s * 0.2 * t, s * 0.5 * t, -L * t * 0.92]);
        else if (mode === 'trail') p = V3.add(g1, [-3.5 * t - 1 * t * t + s * 0.3 * t, s * 0.5 * t, -L * t * 0.85 + 2 * t * (1 - t)]);
        else if (mode === 'smear') p = V3.add(g1, [L * 0.7 * t - s * 0.6 * t, s * 0.4 * t, L * 0.6 * t - 4 * t * t]);
        else if (mode === 'lash') p = V3.add(g1, [L * (0.95 - Math.abs(s) * 0.06) * t, s * 0.9 * t, -L * 0.28 * t + s * 1.5 * t - (1.2 + s * 0.6) * Math.sin(t * Math.PI)]);
        else p = V3.add(g1, [-3.8 * t - s * 0.2 * t, -2.5 * t + s * 0.5 * t, -L * t * 0.8 + 3 * t * (1 - t)]);
        const fan = mode === 'lash' ? 0.2 : mode === 'smear' ? 0.5 : 0.45; p = V3.add(p, V3.mul([0.8, 0.5, 0.6], s * t * fan)); pts.push(p);
      }
      cords.push(pts);
      hqCord(S, J, pts, 'lea', (i % 2) * 0.08);
      for (const kt of [2, 4]) { const q = J.P(pts[kt]); S.solid(q[0] + 1, q[1], q[2] + 0.3, 'lea', [0.2, 0.6, 0.8], 0.1); S.solid(q[0], q[1] + 1, q[2] + 0.3, 'lea', [0.2, -0.6, 0.8], -0.1); }
      const e = J.P(pts[7]), e0 = J.P(pts[6]), ang = Math.atan2(e[1] - e0[1], e[0] - e0[0]);
      S.solid(e[0], e[1], e[2] + 0.5, 'iron', [-0.5, 0.5, 0.7]); S.solid(e[0] + Math.cos(ang + 1.3) * 1.2, e[1] + Math.sin(ang + 1.3) * 1.2, e[2] + 0.5, 'iron', LH); S.solid(e[0] + Math.cos(ang) * 1.2, e[1] + Math.sin(ang) * 1.2, e[2] + 0.5, 'wet', LH);
    }
    return { g1: J.P(g1), cords: cords.map(c => c.map(p => J.P(p))), mode };
  }
  function hqReliquary(S, J, g) {
    const Q = J.Q, top = J.tsurf(1.4, -0.28 * Math.PI, 1.6), cage = V3.add(top, [-0.6 + Q.sway * 0.45, 0.3, -4.0]);
    hqCord(S, J, [top, V3.add(cage, [0, 0, 2.2])], 'iron', 0.1);
    hqBall(S, J, cage, [1.25, 1.25, 1.7], 'ember', g, { rows: 6, cols: 10 });
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; hqCord(S, J, [V3.add(cage, [Math.cos(a) * 1.35, Math.sin(a) * 1.35, 1.8]), V3.add(cage, [Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0]), V3.add(cage, [Math.cos(a) * 0.9, Math.sin(a) * 0.9, -1.8])], 'iron', 0.05); }
    hqBall(S, J, V3.add(cage, [0, 0, 1.9]), [1.1, 1.1, 0.55], 'iron', g);
    const c = J.P(cage); return [(c[0] - OXh) / HQ_S, (c[1] - OYh) / HQ_S];
  }
  function hqMarks(S, J, g, tsurf) {
    const Q = J.Q, P = J.P;
    const run = (pts, fn, eps = 0.7) => { for (let k = 0; k < pts.length - 1; k++) { const a = P(pts[k]), b = P(pts[k + 1]), L = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.4)); for (let s = 0; s <= L; s++) { const t = s / L; fn(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, k + t); } } };
    // welts across the back: old ones dark and raised, fresh ones wet; blood running down from the fresh
    for (let i = 0; i < 12; i++) {
      const hA = 3 + hash(i, 3) * 9.5, aA = Math.PI * (1.26 + hash(i, 4) * 0.48), len = 0.2 + hash(i, 5) * 0.22, dh = (hash(i, 6) - 0.5) * 3, fresh = i % 3 === 0, pts = [];
      for (let k = 0; k <= 6; k++) pts.push(tsurf(hA + dh * k / 6, aA + len * Math.PI * (k / 6 - 0.5), 0.05));
      run(pts, (x, y, d) => { S.mark(x, y, d, fresh ? 'wet' : 'skinR', fresh ? 0 : -0.05); S.mark(x, y - 1, d, 'skinR', 0.12); });
      if (fresh) { const m = tsurf(hA + dh / 2, aA, 0.05), q = P(m); for (let j = 1; j < 3 + (i % 3); j++) S.mark(q[0], q[1] + j, q[2], 'wet', -0.05 * j); }
    }
    // the chain sash: over the right shoulder, across the chest to the left hip, round the back and up again
    for (let i = 0; i <= 52; i++) {
      const s = i / 52, a = 0.1 * Math.PI + s * 1.8 * Math.PI, h = 13.2 - (1 - Math.abs(2 * s - 1)) * 11.2, p = P(tsurf(h, a, 0.35));
      if (i % 2 === 0) { for (const [dx, dy, b] of [[0, -1, 0.3], [-1, 0, 0.15], [1, 0, -0.1], [0, 1, -0.2]]) S.mark(p[0] + dx, p[1] + dy, p[2] + 0.4, 'iron', b, 1.2); S.dot(p[0], p[1], p[2] + 0.4, '#07060b', 1.2); }
      else { S.mark(p[0], p[1], p[2] + 0.4, 'iron', 0.1, 1.2); S.mark(p[0] + 1, p[1], p[2] + 0.4, i % 4 === 1 ? 'rust' : 'iron', 0, 1.2); }
    }
    // the forearms: welts
    for (const far of [false, true]) {
      const el = far ? J.elF : J.elN, ha = far ? J.haF : J.haN;
      for (let i = 0; i < 2; i++) { const c = P(V3.lerp(el, ha, 0.35 + i * 0.28)); for (let k = -1; k <= 1; k++) S.mark(c[0] + k, c[1] + k * 0.5, c[2] + 1.2, i ? 'skinR' : 'wet', 0, 2); }
    }
    // the cilice: blood run from it
    if (J.cilice) { const { c, t } = J.cilice; for (const k of [-1, 1]) { const b = P(V3.add(c, V3.add(V3.mul(t, 0.6), [0, k * 0.8, 0]))); for (let j = 0; j < 4; j++) S.mark(b[0], b[1] + j, b[2] + 1.5, 'wet', -0.04 * j, 2.5); } }
    // fresh blood run down the front of the skirt
    { const a = 0.55 * Math.PI, pts = []; for (let k = 0; k <= 5; k++) { const y = Q.pel[2] + 2 - k * 1.8; pts.push([Q.pel[0] + Q.hem[0] * k / 10 + Math.sin(a) * (4.1 + k * 0.35), Math.cos(a) * (4.4 + k * 0.3), y]); } run(pts, (x, y, d, u) => { if (u < 4.6) S.mark(x, y, d + 0.6, 'wet', -0.02, 1.5); }); }
  }
  // the smear: the path the cords just swept; a crescent behind the figure in dark blood tones, lit on its leading edge
  function hqSmear(S, J, sc) {
    const c = sc.g1, R0 = 7 * HQ_S, R1 = 12.5 * HQ_S, a0 = -2.0, a1 = 0.5, face = J.Fx >= 0 ? 1 : -1, tones = ['#1c070b', '#34101a', '#521822', '#72222a', '#963238'];
    S.post((D, IDX) => {
      const Wd = S.W, Ht = S.H;
      for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
        const q = (j * Wd + i) * 4; if (D[q + 3]) continue;
        const dx = (i - c[0]) * face, dy = (j - c[1]) / 0.9, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); if (a < a0 || a > a1) continue;
        const u = (a - a0) / (a1 - a0), rIn = R1 - (R1 - R0) * Math.pow(u, 1.5); if (r < rIn || r > R1) continue;
        const k = (r - rIn) / Math.max(1, R1 - rIn), tone = Math.min(4, Math.floor(u * 3 + k * 2)); if (u < 0.2 && hash(i, j) < 0.5) continue;
        const col = rgb(tones[tone]); D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
    });
  }

  // ------------------------------------------------------------------- frames
  function hqFrame(pose, ph, view, g) {
    const key = '37|hemo|' + pose + '|' + ph + '|' + view + '|' + g.key;
    let fr = HERO_FR[key]; if (fr) return fr;
    const S = hqSculpt(W2, H2), J = hqRig(pose, ph, view);
    hqPaint(S, J, g);
    const hr = S.render();
    const flipC = src => { const f = mkCanvas(src.width, src.height), fx = f.getContext('2d'); fx.translate(src.width, 0); fx.scale(-1, 1); fx.drawImage(src, 0, 0); return f; };
    const lo = src => { const c = mkCanvas(HQ_W, HQ_H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, HQ_W, HQ_H); c._hr = src; return c; };
    const tintHR = (src, col) => { const q = mkCanvas(src.width, src.height), qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = col; qx.fillRect(0, 0, q.width, q.height); return q; };
    const hrF = flipC(hr), c = lo(hr), f = lo(hrF);
    const tint = (src, col) => lo(tintHR(src._hr || src, col));
    fr = { c, f, fl: tint(c, '#fff'), flf: tint(f, '#fff'), w: HQ_W, h: HQ_H, ox: HQ_OX, oy: HQ_OY, bb: { x: HQ_OX - 8, y: HQ_OY - 50, w: 16, h: 51 }, tint, lamp: J.lamp, hd: true, J };
    HERO_FR[key] = fr; return fr;
  }
  // =================================================================== the Hemomancer's effects: blood, not light
  // Everything he does is wet crimson and glossy: blood is thrown in gouts and droplets that fall, land and pool (they
  // never bounce), pools shine where the light catches them and dry dark, flesh ruptures. No glow anywhere. Every cast
  // has an anticipation (blood gathers to the hand, the body winds up in its pose), a burst with a smear, a quick
  // settle (drips, pools); every hit spurts, and every death ruptures. Drawn at the world grain.
  const BL = { ink: '#0c0206', out: '#1c0409', deep: '#34060f', dark: '#4e0915', mid: '#6c0e1a', lit: '#8e1822', hi: '#b02a2e', spec: '#e89a88', spec2: '#fbd8c8', dry: '#2a080c', dry2: '#3b0e10' };
  const BLOODCOLS = new Set(['#b8404a', '#8e2630', '#5a1622', '#ff6070', '#c24050', '#e89aa0', '#a8283a', '#9a2a3a', '#ffb0b8', '#c8505e', '#ff9aa0', '#b8283a', '#d06a70', '#7a1622']);
  const NOGLOW = new Set(['255,80,100', '255,70,90', '255,80,90', '255,90,110', '255,110,130', '200,40,60', '255,60,70', '255,48,72', '255,110,90']);
  Object.assign(G, { hqD: [], hqS: [], hqFx: [], hqGore: [] });
  const R = Math.round;
  const pxr = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(R(x), R(y), Math.max(1, R(w)), Math.max(1, R(h))); };
  // a crisp pixel ellipse (no anti-aliasing), rows of whole pixels
  function pEll(cx, cy, rx, ry, c) { ctx.fillStyle = c; const y0 = Math.ceil(cy - ry - 0.5), y1 = Math.floor(cy + ry - 0.5); for (let y = y0; y <= y1; y++) { const t = (y + 0.5 - cy) / Math.max(0.5, ry), w = rx * Math.sqrt(Math.max(0, 1 - t * t)); if (w < 0.35) continue; const x0 = R(cx - w), x1 = R(cx + w); if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1); else ctx.fillRect(x0, y, 1, 1); } }
  // a glossy drop of blood: dark rim, body, lit upper-left, a specular pixel
  function gDrop(cx, cy, rx, ry, spec = true, pal = BL) {
    pEll(cx + 0.3, cy + 0.4, rx + 0.7, ry + 0.7, pal.out); pEll(cx, cy, rx, ry, pal.mid);
    if (rx >= 1.2) { pEll(cx + rx * 0.25, cy + ry * 0.3, rx * 0.72, ry * 0.62, pal.dark); pEll(cx - rx * 0.2, cy - ry * 0.2, rx * 0.6, ry * 0.5, pal.mid); pEll(cx - rx * 0.35, cy - ry * 0.4, rx * 0.35, ry * 0.3, pal.lit); }
    if (spec && rx >= 1) pxr(cx - rx * 0.45, cy - ry * 0.55, 1, 1, rx >= 2 ? pal.spec2 : pal.spec);
  }
  // a shaded tube along a polyline (veins, streams): outline, underside, body, a lit ridge, glints
  function gTube(pts, r0, r1, pal, glints = 5) {
    const n = pts.length, rad = i => r0 + (r1 - r0) * i / Math.max(1, n - 1);
    for (let i = 0; i < n; i++) pEll(pts[i][0], pts[i][1], rad(i) + 0.8, rad(i) + 0.8, pal.out);
    for (let i = 0; i < n; i++) pEll(pts[i][0], pts[i][1] + 0.3, rad(i), rad(i), pal.dark);
    for (let i = 0; i < n; i++) { const r = rad(i); pEll(pts[i][0] - 0.2, pts[i][1] - r * 0.25, Math.max(0.5, r * 0.7), Math.max(0.5, r * 0.55), pal.mid); }
    for (let i = 0; i < n; i++) { const r = rad(i); if (r >= 0.8) pxr(pts[i][0] - r * 0.4, pts[i][1] - r * 0.8, 1, 1, pal.lit); }
    if (glints) for (let i = 2; i < n - 1; i += glints) { const r = rad(i); if (r >= 1) pxr(pts[i][0] - r * 0.45, pts[i][1] - r * 0.85, 1, 1, pal.spec); }
  }
  const VEIN = { out: '#10030a', dark: '#3a0712', mid: '#6a0f1c', lit: '#962028', spec: '#e2988a' };
  // no glow for the Hemomancer
  { const _g = glow; glow = function (sx, sy, r, rgb, a) { if (isBlood() && NOGLOW.has(rgb)) return; return _g(sx, sy, r, rgb, a); }; }
  bloodLight = function () { };
  // a hit in blood makes no sparks: the spurt (below) is the reaction; gouts and spit leave no glowing trail
  { const _vh = vfxHit; vfxHit = function (m, col, d) { if (isBlood() && BLOODCOLS.has(col)) return; return _vh(m, col, d); }; }
  for (let i = 0; i < TRAILS.length; i++) { const f = TRAILS[i], src = f.toString(); if (src.includes('G.blances') || src.includes('G.spits')) TRAILS[i] = () => { const r = f(); return isBlood() ? [[], r[1], r[2]] : r; }; }
  // the tentacles' mouths: a wet split lined with small teeth, not a bright bead
  tentMaw = function (x, y, ang, open) {
    const c = Math.cos(ang), s2 = Math.sin(ang), o = 1.2 + open * 2.2;
    pEll(x, y, 2.2, 2.2, '#10030a'); pEll(x, y, 1.5, 1.5, '#5a1420');
    for (const sd of [-1, 1]) { const px = x + c * 1.8 - s2 * o * sd * 0.8, py = y + s2 * 1.8 + c * o * sd * 0.8; pxr(px, py, 1, 1, '#72162a'); pxr(px + c, py + s2, 1, 1, '#c8b8a0'); }
    if (open > 0.3) pxr(x + c, y + s2, 1, 1, '#1a0408'); pxr(x - 0.7, y - 1, 1, 1, '#d8908a');
  };
  // his tentacles, root veins and coils take the wet crimson palette
  Object.assign(TENTPAL, { out: '#10030a', dark: '#3e0a16', mid: '#72162a', hi: '#b04048', suck: '#d88a88' });
  Object.assign(RVPAL, { out: '#10030a', dark: '#3a0712', mid: '#6a0f1c', lite: '#962028', hi: '#c86058', pulse: '#e89a88' });

  // ------------------------------------------------------------------- droplets and stains
  function hqDrop(x, y, z, vx, vy, vz, s) { if (G.hqD.length > 420) G.hqD.shift(); G.hqD.push({ x, y, z, vx, vy, vz, s: s || 1, t: 0 }); }
  function hqStain(x, y, r, life, kind) {
    if (G.zone && G.zone.solidAt && G.zone.solidAt(x, y)) return;
    for (const s of G.hqS) if (!kind && !s.kind && Math.hypot(s.x - x, s.y - y) < s.r * 0.08 + 0.05) { s.r = Math.min(3.4, s.r + r * 0.25); s.life = Math.max(s.life, life); s.t = Math.min(s.t, 0.4); return; }
    if (G.hqS.length > 160) G.hqS.shift();
    G.hqS.push({ x, y, r, life, max: life, t: 0, seed: Math.floor(Math.random() * 997), kind: kind || null });
  }
  function hqSpray(x, y, z, n, spd, dir, spread, up) {
    for (let i = 0; i < n; i++) { const a = (dir == null ? Math.random() * Math.PI * 2 : dir + (Math.random() - 0.5) * (spread || 1)), s = spd * (0.35 + Math.random()); hqDrop(x, y, z + Math.random() * 3, Math.cos(a) * s, Math.sin(a) * s, (up || 14) + Math.random() * 18, Math.random() < 0.25 ? 2 : 1); }
  }
  function hqUpdateDrops(dt) {
    for (const d of G.hqD) {
      d.t += dt; d.x += d.vx * dt * 0.3; d.y += d.vy * dt * 0.3; d.vz -= 80 * dt; d.z += d.vz * dt;
      if (d.z <= 0) { d.dead = true; hqStain(d.x, d.y, d.s * (0.45 + Math.random() * 0.3), 5 + Math.random() * 3); }
    }
    G.hqD = G.hqD.filter(d => !d.dead && d.t < 3);
    for (const s of G.hqS) { s.t += dt; s.life -= dt; }
    G.hqS = G.hqS.filter(s => s.life > 0);
    for (const c of G.hqGore) { c.t += dt; if (c.z > 0 || c.vz > 0) { c.x += c.vx * dt * 0.3; c.y += c.vy * dt * 0.3; c.vz -= 80 * dt; c.z = Math.max(0, c.z + c.vz * dt); c.rot += c.spin * dt; if (c.z === 0) { c.vz = 0; c.vx = c.vy = 0; hqStain(c.x, c.y, 0.9, 6); } } }
    G.hqGore = G.hqGore.filter(c => c.t < c.life);
  }
  function drawHqDrop(d) {
    const q = iso(d.x, d.y), x = q.sx, y = q.sy - d.z, vx = (d.vx - d.vy) * 0.5, vy = (d.vx + d.vy) * 0.25 - d.vz * 0.12, sp = Math.hypot(vx, vy);
    if (sp > 2.2) { const ux = vx / sp, uy = vy / sp; pxr(x - ux * 2, y - uy * 2, 1, 1, BL.dark); pxr(x - ux, y - uy, 1, 1, BL.mid); }
    if (d.s >= 2) { pxr(x, y, 2, 2, BL.mid); pxr(x + 1, y + 1, 1, 1, BL.dark); pxr(x, y, 1, 1, BL.spec); } else pxr(x, y, 1, 1, d.t < 0.12 ? BL.lit : BL.mid);
  }
  // a stain: a small pool that shines while it is wet and dries dark
  const STAIN_FR = new Map();
  function stainFrame(seed, rq, stage, kind) {
    const key = seed + '|' + rq + '|' + stage + '|' + (kind || ''); let c = STAIN_FR.get(key); if (c) return c;
    const r = rq / 4, Wd = Math.ceil(r * ISO_R * 2.4) + 4, Ht = Math.ceil(r * ISO_RY * 2.4) + 4, cx = Wd / 2, cy = Ht / 2;
    c = mkCanvas(Wd, Ht); const x = c.getContext('2d'), img = x.createImageData(Wd, Ht), D = img.data, inside = new Uint8Array(Wd * Ht);
    const lobes = [[0, 0, 0.9, 0.9]]; for (let i = 0; i < 9; i++) { const a = hash(seed, i) * 6.28, d = 0.35 + hash(seed, i + 9) * 0.45, rr = 0.18 + hash(seed, i + 3) * (i < 4 ? 0.4 : 0.2); lobes.push([Math.cos(a) * d, Math.sin(a) * d, rr, rr * (0.8 + hash(seed, i + 5) * 0.4)]); }
    for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) { const u = (i + 0.5 - cx) / (r * ISO_R), v = (j + 0.5 - cy) / (r * ISO_RY); for (const [ox, oy, rx, ry] of lobes) if (((u - ox) / rx) ** 2 + ((v - oy) / ry) ** 2 <= 1) { inside[j * Wd + i] = 1; break; } }
    const In = (i, j) => i >= 0 && j >= 0 && i < Wd && j < Ht && inside[j * Wd + i];
    const wet = stage === 0, gore = kind === 'gore';
    const body = gore ? (wet ? '#4a0c14' : '#2e0a0e') : wet ? BL.dark : stage === 1 ? '#3c0a12' : BL.dry, rim = gore ? '#1a0508' : wet ? BL.out : '#1e060a', lit = wet ? BL.lit : stage === 1 ? '#50121a' : BL.dry2;
    let glints = 0;
    for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
      if (!In(i, j)) continue; let col = body;
      if (!In(i + 1, j) || !In(i, j + 1)) col = rim; else if ((!In(i - 1, j) || !In(i, j - 1)) && hash(i + seed * 3, j) < 0.55) col = lit;
      else if (wet && ((j * 7 + seed) % 5 === 0) && hash((i >> 2) + seed, j) < 0.35) col = BL.mid;            // the sky caught in it, in streaks
      else if (!gore && vn(i / 4 + seed, j / 3) > 0.6) col = wet ? BL.deep : '#240609';
      if (wet && glints < 2 && !In(i - 1, j - 1) && In(i + 1, j + 1) && hash(i, j + seed) < 0.3) { col = glints ? BL.spec : BL.spec2; glints++; }
      const q = (j * Wd + i) * 4, cc = rgb(col); D[q] = cc[0]; D[q + 1] = cc[1]; D[q + 2] = cc[2];
      const edge = !In(i + 2, j) || !In(i - 2, j) || !In(i, j + 2) || !In(i, j - 2), thin = r > 0.9 && !gore; D[q + 3] = !thin || edge || col === BL.spec || col === BL.spec2 ? 255 : (wet ? 125 : 105);
    }
    x.putImageData(img, 0, 0); if (STAIN_FR.size > 900) STAIN_FR.clear(); STAIN_FR.set(key, c); return c;
  }
  function drawStain(s, rr) {
    const q = iso(s.x, s.y), grow = Math.min(1, 0.4 + s.t / 0.25), r = Math.max(0.25, (rr || s.r) * grow), rq = Math.max(1, Math.round(r * 4));
    const stage = s.t < 1.6 ? 0 : s.life > s.max * 0.35 ? 1 : 2, c = stainFrame(s.seed % 61, rq, stage, s.kind);
    const a = Math.min(1, s.life / 1.2) * 0.92; ctx.globalAlpha = a;
    ctx.drawImage(c, R(q.sx - c.width / 2), R(q.sy - c.height / 2)); ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------- pools (the game's own): glossy, drying at the edge
  drawPools = function () {
    for (const p of G.pools) {
      const fade = Math.min(1, p.life / 1.5), stage = p.life > p.max * 0.5 ? 0 : 1, rq = Math.max(1, Math.round(p.r * 8) / 2 * 4 / 4 * 2);
      const c = stainFrame(Math.floor(p.seed * 7) % 61, Math.max(1, Math.round(p.r * 4)), stage, null), q = iso(p.x, p.y);
      ctx.globalAlpha = fade * 0.9; ctx.drawImage(c, R(q.sx - c.width / 2), R(q.sy - c.height / 2)); ctx.globalAlpha = 1;
      if (p.big) { const t = G.time * 1.3 + p.seed; pxr(q.sx - p.r * 5 + Math.sin(t) * p.r * 3, q.sy - 1, 2, 1, BL.lit); }
    }
    for (const s of G.hqS) drawStain(s);
    for (const g of G.vgrnd) { const q = iso(g.x, g.y), a = Math.min(1, g.t / 0.5), pts = []; for (let i = 0; i <= 7; i++) { const t = i / 7; pts.push([q.sx - 7 + t * 14, q.sy + Math.sin(G.time * 9 + g.seed + t * 7) * 1.6]); } ctx.globalAlpha = a; gTube(pts, 1.2, 0.6, VEIN, 3); ctx.globalAlpha = 1; }
  };

  // ------------------------------------------------------------------- the game's blood particles become real drops
  function hqConvertParts() {
    if (!isBlood()) return;
    let n = 0;
    for (const p of parts) {
      if (p.g || p.fly || p.spike || p.hq) continue;
      if (!BLOODCOLS.has(p.col)) continue;
      if (p.ring) { G.hqFx.push({ k: 'ripple', x: p.x, y: p.y, R: p.max, t: 0, dur: 0.5 }); p.t = 0; continue; }
      if (n++ < 60) hqDrop(p.x, p.y, p.z, p.vx, p.vy, p.vz, p.col === '#5a1622' || p.col === '#8e2630' ? 1 : (Math.random() < 0.3 ? 2 : 1));
      p.t = 0;
    }
  }

  // ------------------------------------------------------------------- casts: anticipation, burst with smear, settle
  function hqHand(far) {
    const fr = HQ_LAST.fr, f = P.face || 1; if (!fr || !fr.J) return { x: P.x, y: P.y, z: 24 };
    const J = fr.J, h = J.P(far ? J.haF : J.haN), dx = (h[0] - OXh) / HQ_S * f, dz = -(h[1] - OYh) / HQ_S;
    // screen offset to world: along the iso x-axis
    return { x: P.x + dx / TW, y: P.y - dx / TW, z: dz };
  }
  function hqOnCast(id, pt, hp0) {
    const a = pt || (typeof aimPoint === 'function' ? aimPoint() : { x: P.x + P.face, y: P.y });
    const far = ['hurl', 'cast', 'raise'].includes(HQ_SKPOSE[id]);
    G.hqFx.push({ k: 'gather', t: 0, dur: 0.14, far });
    const tx = a.x, ty = a.y;
    switch (id) {
      case 'thrall': case 'fgolem': case 'nest': G.hqFx.push({ k: 'pour', t: 0, dur: 0.34, tx, ty, far: id === 'thrall', delay: 0.1 }); break;
      case 'bboil': G.hqFx.push({ k: 'boilring', x: tx, y: ty, R: typeof HS !== 'undefined' && HS.boilR ? HS.boilR() : 2.5, t: 0, dur: 0.7, delay: 0.1 }); break;
      case 'bfrenzy': case 'bwave': case 'molt': G.hqFx.push({ k: 'scream', x: P.x, y: P.y, t: 0, dur: 0.5, delay: 0.12, big: id === 'bfrenzy' }); break;
      case 'pact': G.hqFx.push({ k: 'pact', t: 0, dur: 0.9, delay: 0.1 }); break;
      case 'eggsac': G.hqFx.push({ k: 'tear', t: 0, dur: 0.25 }); break;
      case 'hatch': case 'spool': G.hqFx.push({ k: 'flecks', t: 0, dur: 0.35 }); break;
      case 'rush': case 'cburst': case 'hemor': G.hqFx.push({ k: 'point', x: tx, y: ty, t: 0, dur: 0.2 }); break;
      case 'devour': case 'swallow': G.hqFx.push({ k: 'gulp', t: 0, dur: 0.35 }); break;
    }
  }
  let hqZone = null;
  function hqUpdateFx(dt) {
    if (G.zone !== hqZone) { hqZone = G.zone; G.hqD = []; G.hqS = []; G.hqFx = []; G.hqGore = []; }
    hqConvertParts();
    for (const f of G.hqFx) {
      if (f.delay > 0) { f.delay -= dt; continue; }
      const t0 = f.t; f.t += dt; const k = f.t / f.dur;
      if (f.k === 'pour' && Math.random() < 0.8) { const h = hqHand(f.far); const u = Math.min(1, k * 1.4); if (u >= 1 && !f.hit) { f.hit = true; hqSpray(f.tx, f.ty, 1, 10, 2.2, null, 0, 8); hqStain(f.tx, f.ty, 1.6, 6); } }
      if (f.k === 'scream' && t0 === 0) { const h = hqHand(false); hqSpray(P.x, P.y, 30, f.big ? 26 : 16, 3.2, null, 0, 16); }
      if (f.k === 'tear' && t0 === 0) { const h = hqHand(true); hqSpray(h.x, h.y, 18, 8, 1.4, null, 0, 10); }
      if (f.k === 'flecks' && Math.random() < 0.6) hqSpray(P.x - (P.face || 1) * 0.15, P.y + (P.face || 1) * 0.15, 30, 2, 1.1, null, 0, 18);
      if (f.k === 'point' && t0 === 0) hqSpray(f.x, f.y, 10, 12, 2.6, null, 0, 20);
      if (f.k === 'gulp' && Math.random() < 0.5) hqSpray(P.x, P.y, 20, 2, 0.8, null, 0, 6);
      if (f.k === 'pact' && t0 === 0) { const h = hqHand(false), g = hqHand(true); hqSpray(h.x, h.y, h.z, 6, 1.2, null, 0, 12); hqSpray(g.x, g.y, g.z, 6, 1.2, null, 0, 12); }
    }
    G.hqFx = G.hqFx.filter(f => f.delay > 0 || f.t < f.dur);
    // the scourged back sheds drops while he scourges it; frenzy sweats blood
    if (isBlood() && !P.dead) {
      if (P.hatchChan && Math.random() < 0.35) hqSpray(P.x, P.y, 30, 1, 0.9, null, 0, 14);
      if (P.bfrenzyT > 0 && Math.random() < 0.3) hqSpray(P.x + rand(-0.15, 0.15), P.y + rand(-0.15, 0.15), 20 + Math.random() * 12, 1, 0.3, null, 0, 4);
      if (G.zone) for (const m of G.zone.monsters) if (!m.dead && m.boilT > 0 && Math.random() < 0.12 && onScreen(m.x, m.y)) hqDrop(m.x + rand(-0.2, 0.2), m.y + rand(-0.2, 0.2), 14 + Math.random() * 8, rand(-0.4, 0.4), rand(-0.4, 0.4), 12, 1);
    }
    hqUpdateDrops(dt);
  }
  function drawHqFx(f) {
    if (f.delay > 0) return;
    const k = Math.min(1, f.t / f.dur);
    if (f.k === 'gather') {
      // anticipation: beads of blood run in from his body to the hand that will cast
      const h = hqHand(f.far), q = iso(h.x, h.y), hx2 = q.sx, hy2 = q.sy - h.z;
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.4, r = (1 - k) * (7 + (i % 3) * 3); const x = hx2 + Math.cos(a) * r, y = hy2 + Math.sin(a) * r * 0.8 + (1 - k) * 4; pxr(x, y, 1, 1, i % 3 ? BL.mid : BL.lit); }
      if (k > 0.6) gDrop(hx2, hy2, 1.4, 1.3, true);
    } else if (f.k === 'pour') {
      // a rope of blood poured from the hand, arcing down onto the target
      const h = hqHand(f.far), a = iso(h.x, h.y), b = iso(f.tx, f.ty), u = Math.min(1, k * 1.4), u0 = Math.max(0, k * 1.4 - 1), pts = [];
      for (let i = 0; i <= 14; i++) { const t = u0 + (u - u0) * i / 14, x = a.sx + (b.sx - a.sx) * t, y = (a.sy - h.z) + (b.sy - (a.sy - h.z)) * t - Math.sin(t * Math.PI) * 10 + Math.sin(i * 1.7 + G.time * 30) * 0.4; pts.push([x, y]); }
      gTube(pts, 1.4, 1.0, BL, 4);
    } else if (f.k === 'boilring') {
      // the blood around the cursor comes to the boil: a ring of bubbles running outward, popping
      const q = iso(f.x, f.y), r = f.R * (0.3 + 0.7 * Math.sqrt(k));
      for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + hash(i, 5), rr = r * (0.85 + hash(i, 7) * 0.2), x = q.sx + Math.cos(a) * rr * ISO_R, y = q.sy + Math.sin(a) * rr * ISO_RY, ph = (k * 3 + hash(i, 9)) % 1;
        if (ph < 0.7) { const s = 0.8 + ph * 1.4; pEll(x, y - ph * 3, s + 0.6, s * 0.9 + 0.6, BL.out); pEll(x, y - ph * 3, s, s * 0.9, BL.mid); pxr(x - s * 0.4, y - ph * 3 - s * 0.5, 1, 1, BL.spec); } else { pxr(x - 1, y - 3, 1, 1, BL.lit); pxr(x + 1, y - 4, 1, 1, BL.mid); } }
    } else if (f.k === 'scream') {
      // a ring of blood flung out of him and a dark ripple on the ground
      const q = iso(f.x, f.y), r = (f.big ? 3.4 : 2.6) * Math.sqrt(k), fade = 1 - k;
      ctx.globalAlpha = fade * 0.9;
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.28, x = q.sx + Math.cos(a) * r * ISO_R, y = q.sy + Math.sin(a) * r * ISO_RY; pxr(x, y, 2, 1, i % 2 ? BL.dark : BL.mid); if (i % 5 === 0) pxr(x, y - 1, 1, 1, BL.lit); }
      ctx.globalAlpha = 1;
    } else if (f.k === 'ripple') {
      const q = iso(f.x, f.y), r = f.R * Math.sqrt(k); ctx.globalAlpha = 1 - k;
      for (let i = 0; i < 36; i++) { const a = i / 36 * 6.28; pxr(q.sx + Math.cos(a) * r * ISO_R, q.sy + Math.sin(a) * r * ISO_RY, 2, 1, i % 3 ? BL.dark : BL.lit); }
      ctx.globalAlpha = 1;
    } else if (f.k === 'pact') {
      // threads of blood from his opened wrists to every one of his brood, a drop running down each
      const h = hqHand(false), a = iso(h.x, h.y), mins = G.brood.concat(G.thralls || [], G.fgolem ? [G.fgolem] : []).slice(0, 14), fade = k < 0.8 ? 1 : (1 - k) / 0.2;
      ctx.globalAlpha = fade;
      for (const [i, m] of mins.entries()) { const b = iso(m.x, m.y), pts = []; for (let j = 0; j <= 12; j++) { const t = j / 12 * Math.min(1, k * 3); pts.push([a.sx + (b.sx - a.sx) * t, (a.sy - h.z) + (b.sy - 8 - (a.sy - h.z)) * t - Math.sin(t * Math.PI) * 8]); } for (const p of pts) pxr(p[0], p[1], 1, 1, BL.dark); const d = pts[Math.min(12, Math.floor(((G.time * 1.7 + i * 0.3) % 1) * 12))]; gDrop(d[0], d[1], 1.1, 1.1, true); }
      ctx.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------------- hit reaction and the death signature
  {
    const _hm = hurtMon;
    hurtMon = function (m, dmg, col) {
      const hp0 = m && m.hp; _hm(m, dmg, col);
      if (!isBlood() || !m || !(m.hp < hp0) || m.hqSp > G.time) return;
      m.hqSp = G.time + 0.09;
      // a spurt away from him: a short jet and a few drops
      const d = Math.hypot(m.x - P.x, m.y - P.y) || 1, dir = Math.atan2(m.y - P.y, m.x - P.x), z = 10 + (m.r || 0.3) * 14;
      hqSpray(m.x, m.y, z, 4 + Math.min(6, Math.round((hp0 - Math.max(0, m.hp)) / 8)), 2.4, dir, 1.1, 10);
      G.hqFx.push({ k: 'spurt', x: m.x, y: m.y, z, dir, t: 0, dur: 0.12 });
    };
    const _km = killMon;
    killMon = function (m) {
      const was = m && m.dead; _km(m);
      if (!isBlood() || !m || was || !m.dead || m.engulfed) return;
      // it ruptures: gore and bone thrown out, gouts of blood, a wide pool
      const z = 8 + (m.r || 0.3) * 12, big = m.rank === 'boss' || m.rank === 'unique';
      hqSpray(m.x, m.y, z, big ? 40 : 22, big ? 4 : 3, null, 0, 20);
      for (let i = 0; i < (big ? 12 : 7); i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 2.2; G.hqGore.push({ x: m.x, y: m.y, z: z * 0.8, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 18 + Math.random() * 22, rot: Math.random() * 6, spin: rand(-12, 12), kind: i % 3 === 0 ? 'bone' : 'meat', s: 1 + Math.random() * (big ? 2 : 1.2), t: 0, life: 5 + Math.random() * 3 }); }
      hqStain(m.x, m.y, big ? 3 : 1.8, 9, 'gore');
      G.hqFx.push({ k: 'rupture', x: m.x, y: m.y, z, t: 0, dur: 0.22, big });
    };
  }
  function drawGore(c) {
    const q = iso(c.x, c.y), x = q.sx, y = q.sy - c.z, fade = Math.min(1, (c.life - c.t) / 0.8);
    if (fade < 1) ctx.globalAlpha = fade;
    if (c.kind === 'bone') { const ca = Math.cos(c.rot), sa = Math.sin(c.rot), L = 1.5 + c.s; for (let i = -1; i <= 1; i++) pxr(x + ca * L * i, y + sa * L * i * 0.6, 1, 1, i ? '#b8ab8c' : '#d6cbb0'); pxr(x + ca * L * 1.4, y + sa * L * 0.8, 1, 1, '#766852'); }
    else { gDrop(x, y, 1 + c.s * 0.7, 0.8 + c.s * 0.5, true, { out: '#12040a', mid: '#7e2028', dark: '#521218', lit: '#a8423e', spec: '#e8a898', spec2: '#f4c8b8' }); }
    ctx.globalAlpha = 1;
  }
  function drawSpurt(f) {
    const q = iso(f.x, f.y), k = f.t / f.dur, ca = Math.cos(f.dir), sa = Math.sin(f.dir), ux = (ca - sa) * 0.5, uy = (ca + sa) * 0.25, l = Math.hypot(ux, uy) || 1, dx = ux / l, dy = uy / l;
    const x0 = q.sx, y0 = q.sy - f.z, L = 3 + k * 6;
    for (let i = 0; i <= L; i++) { const w = i < L * 0.3 ? 1.6 : 1.1, x = x0 + dx * i, y = y0 + dy * i + i * i * 0.04; pEll(x, y, w, w * 0.8, i < 2 ? BL.lit : BL.mid); }
    pxr(x0 + dx * L, y0 + dy * L, 1, 1, BL.spec);
  }
  function drawRupture(f) {
    // the body bursts: a crown of blood thrown up round it, a smear of gore
    const q = iso(f.x, f.y), k = f.t / f.dur, n = f.big ? 11 : 8, R0 = (f.big ? 10 : 7) * (0.4 + k);
    for (let i = 0; i < n; i++) { const a = -Math.PI + (i + 0.5) / n * Math.PI * 2, x = q.sx + Math.cos(a) * R0, y = q.sy - f.z * (1 - k) + Math.sin(a) * R0 * 0.6 - (1 - k) * 4; gDrop(x, y, 1.6 - k * 0.6, 1.3 - k * 0.4, i % 2 === 0); }
    if (k < 0.5) gDrop(q.sx, q.sy - f.z, 4 * (1 - k), 3.4 * (1 - k), true);
  }

  // ------------------------------------------------------------------- the blood render, redone
  {
    bloodRender = function (list, hoverCands) {
      if (!G.zone || !isBlood() && !G.pools.length && !G.brood.length && !G.hqS.length) return;
      drawPools();
      // hemorrhage: the veins of the victim swell dark, then burst outward in gouts
      if (G.hemorFx) { const h = G.hemorFx; list.push({ d: h.x + h.y + 0.08, f: () => {
        const q = iso(h.x, h.y), a = 1 - h.t / 0.6, cy = q.sy - 12;
        if (a < 0.15) { const s = a / 0.15; for (const v of h.veins) { const pts = []; for (let j = 0; j <= 5; j++) { const t = j / 5; pts.push([q.sx + Math.cos(v) * t * 6 * s, cy + Math.sin(v) * t * 5 * s + Math.sin(t * 9 + v) * 0.8]); } gTube(pts, 0.9, 0.4, VEIN, 0); } }
        else { const k = (a - 0.15) / 0.85; for (const v of h.veins) { const r = 3 + k * 13, x = q.sx + Math.cos(v) * r, y = cy + Math.sin(v) * r * 0.7 + k * k * 10; gDrop(x, y, 1.8 * (1 - k * 0.6), 1.4 * (1 - k * 0.5), true); gDrop(x - Math.cos(v) * 3, y - Math.sin(v) * 2, 1, 1, false); } }
      } }); }
      // fresh corpses that could become minions: a dark wet sheen that heaves
      if (isBlood()) for (const m of G.zone.monsters) if (m.dead && !m.hatched && !m.eaten && !m.burst && m.rank !== 'boss' && G.time - (m.deadAt || 0) < CORPSE_LIFE && onScreen(m.x, m.y)) list.push({ d: m.x + m.y - 0.3, f: () => { const q = iso(m.x, m.y), pul = Math.sin(G.time * 4 + m.x); pxr(q.sx - 3 + pul, q.sy - 3, 1, 1, m.infected ? BL.hi : BL.lit); pxr(q.sx + 2, q.sy - 2 - (pul > 0.5 ? 1 : 0), 1, 1, BL.spec); } });
      for (const s of G.sacs) list.push({ d: s.x + s.y, f: () => {
        const q = iso(s.x, s.y), k = 1 - s.t / s.max, pul = Math.sin(G.time * (6 + k * 14));
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(R(q.sx) - 4, R(q.sy), 8, 2);
        drawTumor(q.sx, q.sy + 2, 1 + 0.1 * Math.min(3, s.n - 1), pul, 0);
        hoverCands.push({ kind: 'minion', ref: s, rect: { x: q.sx - 4, y: q.sy - 8, w: 8, h: 9 }, d: s.x + s.y + 3 });
      } });
      for (const s of G.tumors) list.push({ d: s.x + s.y + 0.05, f: () => { const q = iso(s.x, s.y); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(R(q.sx) - 2, R(q.sy), 4, 1); drawTumor(q.sx, q.sy - s.z, s.fat ? 1.2 : 0.8, Math.sin(G.time * 20), 0); if (Math.random() < 0.4) hqDrop(s.x, s.y, s.z, 0, 0, 0, 1); } });
      for (const e of G.brood) list.push({ d: e.x + e.y, f: () => { drawSpawnling(e); } });
      for (const l of G.leeches) list.push({ d: l.x + l.y + (l.state === 'latch' ? 0.2 : 0), f: () => drawLeech(l) });
      if (G.fgolem) { const g = G.fgolem; list.push({ d: g.x + g.y, f: () => {
        const k = 1 + 0.03 * g.meals;
        shadow(g.x, g.y, g.r * 1.2);
        const r = drawFleshGolem(g, g.x, g.y, 0.62 * k, { eng: engulfing(g), vomit: !!g.puke, chitin: gmutOn('chitin'), tent: gmutOn('tentacles'), hump: gmutOn('bilehump') });
        if (g.eat && Math.random() < 0.5) hqDrop(g.x, g.y, 10, rand(-0.5, 0.5), rand(-0.5, 0.5), 10, 1);
        hoverCands.push({ kind: 'minion', ref: g, rect: r, d: g.x + g.y + 4 });
        const bw = R(r.w - 6); ctx.fillStyle = '#0e0d12'; ctx.fillRect(R(r.x + 3), R(r.y) - 3, bw, 2); ctx.fillStyle = '#e89aa0'; ctx.fillRect(R(r.x + 3), R(r.y) - 3, R(bw * clamp(g.hp / g.max, 0, 1)), 2);
        { const sm = HS.golemStockMax(), st = R(g.stock || 0), pw = 3, x0 = R(r.x + r.w / 2 - (sm * pw) / 2), y0 = R(r.y) - 6, ok = st >= HS.golemPukeCost();
          ctx.fillStyle = '#0e0d12'; ctx.fillRect(x0 - 1, y0 - 1, sm * pw + 1, 3);
          for (let i = 0; i < sm; i++) { ctx.fillStyle = i < st ? (ok ? '#c8d070' : '#8a9a3a') : '#2a2226'; ctx.fillRect(x0 + i * pw, y0, pw - 1, 1); } }
      } }); }
      if (G.fheap) { const h = G.fheap; list.push({ d: h.x + h.y, f: () => drawFHeap(h) }); }
      for (const b of G.biles) {
        if (b.orb) list.push({ d: b.x + b.y + 0.02, f: () => {
          const q = iso(b.x, b.y), sy = q.sy - b.z, bob = Math.sin(G.time * 6 + b.x * 3) * 1.5;
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(R(q.sx) - 2, R(q.sy), 4, 1);
          gTube([[q.sx, sy + bob + 2], [q.sx + Math.sin(G.time * 9) * 1.5, sy + bob + 5], [q.sx - 1, sy + bob + 8]], 0.6, 0.4, VEIN, 0);
          drawTumor(q.sx, sy + bob + 3, 0.75, Math.sin(G.time * 12), 0);
          ctx.fillStyle = '#0e0d12'; ctx.fillRect(R(q.sx + (b.face > 0 ? 1 : -2)), R(sy + bob), 1, 1);
        } });
        else if (b.splat) list.push({ d: b.x + b.y + 0.03, f: () => { const q = iso(b.x, b.y), a = 1 - b.t / 0.4, n = 7, R0 = b.R * ISO_R * (0.4 + a * 0.6); for (let i = 0; i < n; i++) { const ang = -Math.PI + (i + 0.5) / n * Math.PI, x = q.sx + Math.cos(ang) * R0, y = q.sy + Math.sin(ang) * R0 * 0.5 - (1 - a) * 3; gDrop(x, y, 1.2 * (1 - a * 0.5), 1.1, i % 2 === 0); } } });
        else if (b.fx) list.push({ d: b.x + b.y + 0.03, f: () => { const a = iso(b.x, b.y), c = iso(b.tx, b.ty), k = 1 - b.t / 0.3, pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10 * Math.min(1, k * 1.5); pts.push([a.sx + (c.sx - a.sx) * t, a.sy - 6 + (c.sy - a.sy) * t - Math.sin(t * Math.PI) * 14]); } gTube(pts, 1.1, 0.7, BL, 4); } });
      }
      // gouts of vomited blood: glossy, stretched along their flight, dripping as they go
      for (const s of G.blances) list.push({ d: s.x + s.y + 0.05, f: () => {
        const q = iso(s.x, s.y), dx = (s.vx - s.vy) * 0.5, dy = (s.vx + s.vy) * 0.25, sp = Math.hypot(dx, dy) || 1, ux = dx / sp, uy = dy / sp, sy = q.sy - s.z - 2;
        const wob = 1 + Math.sin(G.time * 30 + s.ph) * 0.15, len = (2.5 + Math.min(3, sp * 0.25)) * s.mass * wob + 1, wid = (1.8 * s.mass) / wob + 0.6;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(R(q.sx) - 2, R(q.sy), 4, 1);
        for (let i = s.trail.length - 1; i >= 1; i--) { const p = s.trail[i], pq = iso(p.x, p.y); gDrop(pq.sx, pq.sy - p.z - 2, Math.max(0.6, (1.6 - i * 0.3) * s.mass), Math.max(0.6, (1.4 - i * 0.3) * s.mass), i < 2); }
        const n = Math.max(2, R(len)); for (let i = n; i >= 0; i--) { const t = i / n, w = wid * (0.45 + 0.55 * Math.sin((1 - t * 0.85) * Math.PI * 0.5 + 0.2)); pEll(q.sx - ux * len * (t - 0.4), sy - uy * len * (t - 0.4), w + 0.7, w * 0.85 + 0.7, BL.out); }
        for (let i = n; i >= 0; i--) { const t = i / n, w = wid * (0.45 + 0.55 * Math.sin((1 - t * 0.85) * Math.PI * 0.5 + 0.2)); pEll(q.sx - ux * len * (t - 0.4), sy - uy * len * (t - 0.4), w, w * 0.85, t > 0.6 ? BL.dark : BL.mid); }
        pxr(q.sx + ux * len * 0.25 - uy, sy + uy * len * 0.25 - wid * 0.5, 2, 1, BL.lit); pxr(q.sx + ux * len * 0.35, sy + uy * len * 0.35 - wid * 0.6, 1, 1, BL.spec2);
      } });
      // the vein whip: veins burst out of his arm and sweep the arc; the swept arc left as a dark smear
      for (const w of G.vwhips) list.push({ d: P.x + P.y + 0.4, f: () => {
        const k = Math.min(1, w.t / w.dur), fade = 1 - Math.max(0, (w.t - w.dur) / 0.18), a0 = Math.atan2(w.dy, w.dx), o = iso(P.x, P.y), oy = o.sy - 22;
        ctx.globalAlpha = fade;
        if (w.arc) {
          const s0 = -1.2, s1 = -1.2 + 2.4 * k, lag = Math.max(s0, s1 - 1.0);
          for (let i = 0; i <= 26; i++) { const t = i / 26, a = a0 + lag + (s1 - lag) * t; for (const rr of [0.55, 0.7, 0.85, 1]) { const p = iso(P.x + Math.cos(a) * w.R * rr, P.y + Math.sin(a) * w.R * rr), y = p.sy - 9 + rr * 3; pxr(p.sx, y, 2, 1, t > 0.8 ? BL.lit : t > 0.45 ? BL.mid : t > 0.2 ? BL.dark : BL.deep); } }
        }
        for (let v = -2; v <= 2; v++) {
          const pts = [];
          const hd = hqHand(false), hq2 = iso(hd.x, hd.y), hx0 = hq2.sx, hy0 = hq2.sy - hd.z;
          for (let i = 0; i <= 14; i++) { const t = i / 14, sweep = w.arc ? -1.2 + 2.4 * k : 0, a = a0 + sweep + v * 0.09 * t + Math.sin(t * 11 + G.time * 26 + v) * 0.06, rr = w.R * t * (w.arc ? 1 : k), p = iso(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr), e = Math.min(1, t * 1.6);
            pts.push([hx0 + (p.sx - hx0) * e + (1 - e) * (p.sx - o.sx) * 0, hy0 + (p.sy - 10 + t * 3 - hy0) * e - Math.sin(t * Math.PI) * 5]); }
          gTube(pts, v ? 1.1 : 1.5, 0.5, VEIN, 5);
          const e = pts[pts.length - 1]; if (k > 0.3 && Math.random() < 0.35) { const a = a0 + (w.arc ? -1.2 + 2.4 * k : 0); hqDrop(P.x + Math.cos(a) * w.R, P.y + Math.sin(a) * w.R, 10, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 10, 1); }
        }
        ctx.globalAlpha = 1;
      } });
      for (const v of G.rveins) list.push({ d: (v.ref ? v.ref.x + v.ref.y : v.ex + v.ey) + 0.04, f: () => drawRootVein(v) });
      for (const v of G.veins) if (!v.ref.dead) list.push({ d: v.ref.x + v.ref.y + 0.05, f: () => drawCoils(v.ref, v.t, v.max, '#8e2630', '#e89aa0', v.seed) });
      for (const b of G.tbinds) if (!b.ref.dead) list.push({ d: b.ref.x + b.ref.y + 0.06, f: () => drawCoils(b.ref, b.t, b.max, '#b8404a', '#ffb0b8', b.seed) });
      for (const t of G.tents) list.push({ d: (t.from || P).x + (t.from || P).y + 0.3, f: () => {
        const m = t.ref, src = t.from || P, k = t.t / t.dur, reach = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) * 0.4, a = iso(src.x, src.y), b = iso(src.x + (m.x - src.x) * reach, src.y + (m.y - src.y) * reach);
        const lift = t.from ? 18 : 28, pts = [];
        for (let j = 0; j <= 10; j++) { const u = j / 10, bow = Math.sin(u * Math.PI) * (t.from ? 14 : 9) * (1 - reach * 0.4); pts.push([a.sx + (b.sx - a.sx) * u + Math.sin(u * 7 + G.time * 20) * 1.2, a.sy - lift + (b.sy - 7 - a.sy + lift) * u - bow]); }
        tentBody(pts, t.from ? 3 : 2, 1.1, TENTPAL);
        const tp = pts[pts.length - 1], t0 = pts[pts.length - 2]; tentMaw(tp[0], tp[1], Math.atan2(tp[1] - t0[1], tp[0] - t0[0]), k < 0.45 ? 1 : 0.2);
      } });
      ctx.lineWidth = 1;
      // bleeding monsters drip: drops that fall and stay
      for (const m of G.zone.monsters) if (!m.dead && m.bleed && onScreen(m.x, m.y) && Math.random() < 0.18) hqDrop(m.x + rand(-0.15, 0.15), m.y + rand(-0.15, 0.15), 10 + Math.random() * 6, rand(-0.3, 0.3), rand(-0.3, 0.3), 2, 1);
      // boiling enemies: bubbles swelling on them and bursting
      for (const m of G.zone.monsters) if (!m.dead && m.boilT > 0 && onScreen(m.x, m.y)) list.push({ d: m.x + m.y + 0.05, f: () => { const q = iso(m.x, m.y); for (let i = 0; i < 4; i++) { const ph = (G.time * 1.8 + i * 0.27 + m.x) % 1, x = q.sx + Math.sin(i * 2.3 + m.y) * 5, y = q.sy - 6 - i * 4 - ph * 3; if (ph < 0.8) { const s = 0.6 + ph * 1.3; pEll(x, y, s + 0.6, s + 0.6, BL.out); pEll(x, y, s, s, BL.mid); pxr(x - s * 0.4, y - s * 0.6, 1, 1, BL.spec); } else pxr(x, y - 2, 1, 1, BL.lit); } } });
      // drops, gore and the cast effects
      for (const d of G.hqD) list.push({ d: d.x + d.y + 0.02, f: () => drawHqDrop(d) });
      for (const c of G.hqGore) list.push({ d: c.x + c.y + (c.z > 0 ? 0.02 : -0.2), f: () => drawGore(c) });
      for (const f of G.hqFx) {
        const fx = f.x != null ? f.x : P.x, fy = f.y != null ? f.y : P.y;
        if (f.k === 'spurt') list.push({ d: fx + fy + 0.06, f: () => drawSpurt(f) });
        else if (f.k === 'rupture') list.push({ d: fx + fy + 0.06, f: () => drawRupture(f) });
        else list.push({ d: fx + fy + (f.k === 'ripple' || f.k === 'scream' || f.k === 'boilring' ? -0.4 : 0.35), f: () => drawHqFx(f) });
      }
    };
  }
  // a tumor: a glossy lump of raw flesh, veined, no glow
  drawTumor = function (sx, sy, k, pul, glowA) {
    const K = k * (1 + 0.07 * pul), cx = sx, cy = sy - 3 * K;
    pEll(cx + 0.3, cy + 0.5, 4.3 * K + 0.6, 3.7 * K + 0.6, '#12040a');
    pEll(cx, cy, 4.1 * K, 3.5 * K, '#6e1a24'); pEll(cx + 1 * K, cy + 1 * K, 2.8 * K, 2.2 * K, '#4e1018');
    pEll(cx - 1.2 * K, cy - 0.9 * K, 2.2 * K, 1.8 * K, '#9a3438'); pEll(cx + 1.8 * K, cy - 1.6 * K, 1.3 * K, 1.1 * K, '#8a2a30');
    pxr(cx - 2 * K, cy - 1.8 * K, 1, 1, '#e8a898'); if (K > 0.9) pxr(cx + 1.4 * K, cy - 2.2 * K, 1, 1, '#c86a60');
    pxr(cx - 0.5, cy + 0.4 * K, 1, Math.max(1, 2 * K), '#3a0a12'); pxr(cx + 0.5 * K, cy - 0.6 * K, Math.max(1, 2 * K), 1, '#3a0a12');
  };
  // the ooze: a quivering glossy mass of blood with eyes drifting in it
  drawOoze = function (th) {
    const q = iso(th.x, th.y), rk = th.rise > 0 ? 1 - th.rise / 0.6 : 1, k = th.size * rk, wob = Math.sin(th.wob * 2) * 0.8, pul = th.pulse > 0 ? th.pulse / 0.6 : 0, spit = th.spit > 0 ? 1 : 0;
    const w = (7 + wob + pul * 3) * k, h = (7 - wob * 0.6 + pul * 2 + spit) * k, X = q.sx, Y = q.sy - h * 0.7;
    shadow(th.x, th.y, 0.32 * k);
    const fl = th.hurt > 0 && OPT.flash;
    pEll(X + 0.4, Y + 0.8, w + 1, h + 1, '#10020a');
    pEll(X, Y, w, h, fl ? '#ffffff' : BL.mid); pEll(X + w * 0.25, Y + h * 0.3, w * 0.7, h * 0.6, BL.dark); pEll(X - w * 0.2, Y - h * 0.25, w * 0.6, h * 0.5, BL.lit);
    pEll(X - w * 0.38, Y - h * 0.5, w * 0.22, h * 0.14, BL.hi); pxr(X - w * 0.42, Y - h * 0.58, 1, 1, BL.spec2); pxr(X + w * 0.3, Y - h * 0.4, 1, 1, BL.spec);
    for (const e of th.eyes) { const a = e.a + G.time * 0.6 * e.s, ex = X + Math.cos(a) * w * 0.45 * e.r, ey = Y + Math.sin(a * 1.3) * h * 0.35 * e.r; pxr(ex - 1, ey - 1, 3, 2, '#d8cfbc'); pxr(ex + (th.face > 0 ? 1 : 0), ey - 1, 1, 1, '#0e0d12'); }
    pxr(X - w * 0.6, Y + h * 0.6, 1, 2, BL.dark); pxr(X + w * 0.4, Y + h * 0.7, 1, 1 + (Math.floor(G.time * 3) % 2), BL.dark);
    if (th.hp < th.max) { ctx.fillStyle = '#0e0d12'; ctx.fillRect(R(X - 6), R(Y - h - 4), 12, 2); ctx.fillStyle = '#e89aa0'; ctx.fillRect(R(X - 6), R(Y - h - 4), R(12 * clamp(th.hp / th.max, 0, 1)), 2); }
  };
  // the nest: a heaving mound of raw flesh and blood sacs, rooted in the ground with veins
  drawNest = function (n) {
    const q = iso(n.x, n.y), pul = 0.5 + 0.5 * Math.sin(n.pul * 5), fade = Math.min(1, n.t / 1);
    ctx.globalAlpha = fade;
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.3, pts = []; for (let j = 0; j <= 5; j++) { const t = j / 5; pts.push([q.sx + Math.cos(a) * (3 + t * 11), q.sy - 1 + Math.sin(a) * (1.5 + t * 5) + Math.sin(t * 6 + i) * 0.6]); } gTube(pts, 1.1, 0.4, VEIN, 0); }
    pEll(q.sx + 0.5, q.sy - 1.5, 11, 6, '#10030a'); pEll(q.sx, q.sy - 2.5, 10 + pul * 0.6, 5.2, '#4a0e18'); pEll(q.sx - 1.5, q.sy - 4, 7, 3.4, '#6e1a24'); pEll(q.sx - 3, q.sy - 5, 3.2, 1.6, '#8e2a30');
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.3, x = q.sx + Math.cos(a) * 6.5, y = q.sy - 4 + Math.sin(a) * 2.6, s = 1.6 + pul * 0.5 * (i % 2); gDrop(x, y, s, s * 0.9, true, { out: '#12040a', mid: '#8a2a30', dark: '#5e1820', lit: '#b24a48', spec: '#e8a898', spec2: '#f8d0c0' }); }
    pxr(q.sx - 5, q.sy - 6, 1, 1, BL.spec2);
    ctx.globalAlpha = 1;
  };
  // the blood wave: a wall of blood rolling over, its crest curling and throwing drops, leaving the ground wet
  drawBloodWave = function (w) {
    const px = -w.dy, py = w.dx, n = 13, k = w.t / w.max, H = (12 + 7 * (w.grow - 1)) * (0.55 + 0.45 * k);
    const cols = [];
    for (let i = 0; i < n; i++) { const u = i / (n - 1) - 0.5, o = u * w.w, q = iso(w.x + px * o, w.y + py * o), h = H * (1 - Math.abs(u) * 0.9) + Math.sin(G.time * 16 + i * 1.3) * 1.3; cols.push([q.sx, q.sy, h]); }
    // travel direction on screen: the crest curls over toward it
    const tq = iso(w.x + w.dx, w.y + w.dy), oq = iso(w.x, w.y), tdx = Math.sign(tq.sx - oq.sx) || 1;
    for (const [x, y, h] of cols) { pxr(x - 3.5, y - h + 2, 8, h - 2, BL.out); pEll(x, y - h + 2, 4.2, 3.2, BL.out); }
    for (const [x, y, h] of cols) { pxr(x - 2.5, y - h + 2, 6, h - 2, BL.deep); pxr(x - 2.5, y - h * 0.62, 6, h * 0.4, BL.dark); pEll(x, y - h + 2.5, 3.4, 2.6, BL.dark); pEll(x - tdx * 0.4, y - h + 1.8, 2.8, 1.8, BL.mid); }
    for (const [i, [x, y, h]] of cols.entries()) {
      pxr(x - 1.5 + tdx, y - h + 0.5, 3, 1, BL.lit); pxr(x + tdx * 2.6, y - h + 1.5, 1, 2, BL.mid);           // the lip curling over
      if (i % 3 === 1) pxr(x - 1 + tdx, y - h + 0.5, 1, 1, BL.spec2); else if (i % 3 === 2) pxr(x, y - h + 1, 1, 1, BL.spec);
      pxr(x - 2.5, y - 1, 6, 1, BL.out);
      if (Math.random() < 0.25) hqDrop(w.x + px * (i / (n - 1) - 0.5) * w.w, w.y + py * (i / (n - 1) - 0.5) * w.w, h, w.dx * 3, w.dy * 3, 10, 1);
    }
    if (Math.random() < 0.6) hqStain(w.x - w.dx * 0.5 + px * rand(-0.5, 0.5) * w.w, w.y - w.dy * 0.5 + py * rand(-0.5, 0.5) * w.w, 1.2 + Math.random(), 4);
  };
  // Molt: the empty skin stands where he was, a wet translucent husk
  {
    const _r14 = render14;
    render14 = function (list) {
      const SKN = G.skins; G.skins = [];
      try { _r14(list); } finally { G.skins = SKN; }
      for (const s of G.skins) list.push({ d: s.x + s.y, f: () => {
        const q = iso(s.x, s.y), fr = heroFrame('hemomancer', 'raise', 3, 'front'), f = s.face || 1, key = '_husk' + (f < 0 ? 'f' : 'c');
        const husk = fr[key] || (fr[key] = (() => { const src = f < 0 ? fr.f : fr.c, hr = src._hr, t = mkCanvas(hr.width, hr.height), x = t.getContext('2d'); x.drawImage(hr, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(170,110,100,0.55)'; x.fillRect(0, 0, t.width, t.height); const lo = mkCanvas(fr.w, fr.h); lo._hr = t; return lo; })());
        ctx.globalAlpha = 0.55 + 0.1 * Math.sin(G.time * 5); ctx.drawImage(husk, R(q.sx - (f < 0 ? fr.w - fr.ox : fr.ox)), R(q.sy + 3 - (fr.oy + 1)), fr.w, fr.h); ctx.globalAlpha = 1;
        if (Math.random() < 0.15) hqDrop(s.x + rand(-0.1, 0.1), s.y + rand(-0.1, 0.1), 10 + Math.random() * 20, 0, 0, 0, 1);
        const r = { x: R(q.sx - 8), y: R(q.sy - 46) }; ctx.fillStyle = '#0e0d12'; ctx.fillRect(r.x + 1, r.y - 3, 14, 2); ctx.fillStyle = '#e89aa0'; ctx.fillRect(r.x + 1, r.y - 3, R(14 * clamp(s.hp / s.max, 0, 1)), 2);
      } });
    };
  }
  // the hero on the map: the painted sprite carries his mutations; the tentacles grow from his back
  drawHemo = function (alpha, lift) {
    if (P.suit) { drawSuit(alpha, lift); return; }
    const q0 = iso(P.x, P.y), bx = q0.sx - (P.face || 1) * 4, by = q0.sy - 30 - lift;
    if (mutOn('tentacles')) drawTentArms(bx, by, false);
    const r = drawSpr(SPR.hemo, P.x, P.y, P.face, P.hurt > 0, alpha, lift);
    if (mutOn('tentacles')) drawTentArms(bx, by, true);
    return r;
  };
  // ------------------------------------------------------------------- the hero in the game
  // each skill has its own pose: anticipation, burst, settle, run through with the cast
  const HQ_SKPOSE = { eggsac: 'hurl', hatch: 'rend', thrall: 'cast', rush: 'cast', fgolem: 'rend', nest: 'rend', bboil: 'cast', blance: 'spew', hemor: 'cast', vwhip: 'atk', bfrenzy: 'raise', cburst: 'cast', spool: 'rend', bwave: 'raise', pact: 'rend', swallow: 'spew', devour: 'spew', molt: 'raise' };
  window.__hqSkPose = HQ_SKPOSE;
  {
    const _hf = heroFrame;
    heroFrame = function (cls, pose, ph, view) {
      if (cls !== 'hemomancer') return _hf(cls, pose, ph, view);
      if (!view) view = P._view || (P._fb ? 'back' : 'front');
      if (HQ_YAW[view] == null) view = 'front';
      if (!HQ_PH[pose]) pose = pose === 'wind' ? 'cast' : 'idle';
      // a strike or a cast seen straight on hides its line: those use the three-quarter views
      if ((view === 'down' || view === 'up') && pose !== 'idle' && pose !== 'walk') view = view === 'down' ? 'front' : 'back';
      const g = heroGear();
      if (G.running && isBlood()) {
        const mu = (mutOn('bilehump') ? 'h' : '') + (mutOn('chitin') ? 'c' : '') + (mutOn('gills') ? 'g' : '') + (mutOn('maw') ? 'm' + ((P.mawOpen || 0) > 0.5 ? 'o' : '') : '') + (mutOn('heart') ? 'b' + (Math.sin(G.time * 7) > 0.6 ? 'B' : '') : '') + (mutOn('tentacles') ? 't' : '');
        if (mu) { g.mut = mu; g.key += '|' + mu; }
      } else if (window.__hqMut) { g.mut = window.__hqMut; g.key += '|' + g.mut; }
      return hqFrame(pose, ((ph | 0) % HQ_PH[pose] + HQ_PH[pose]) % HQ_PH[pose], view, g);
    };
    const _hp = heroPose;
    heroPose = function () {
      const r = _hp(); if (P.cls !== 'hemomancer') return r;
      if (P.swing > (P._swL || 0) + 1e-6) P._sw0 = P.swing; P._swL = P.swing;
      if (P.cast > (P._caL || 0) + 1e-6) P._ca0 = P.cast; P._caL = P.cast;
      const prog = () => P.cast > 0 ? Math.min(3, Math.floor((1 - P.cast / Math.max(0.05, P._ca0 || 0.5)) * 4)) : 3;
      if (P.hatchChan) return ['rend', Math.floor(G.time * 7) % 4];
      if (P.vomiting > 0) return ['spew', Math.floor(G.time * 10) % 4];
      if (P.hqPoseT > 0 && P.hqPoseId) {
        const po = HQ_SKPOSE[P.hqPoseId] || 'cast';
        if (po === 'rend') return ['rend', P.cast > 0 ? prog() : 3];
        return [po, prog()];
      }
      if (r[0] === 'walk') return ['walk', Math.floor(P._wd * 7.2) % 8];
      if (r[0] === 'idle') return ['idle', Math.floor(G.time * 1.9) % 4];
      return r;
    };
    // record the skill behind each cast, so the pose (and its effect) can follow it
    const _bc = bloodCast;
    bloodCast = function (id, pt) {
      const c0 = P.cast, hp0 = P.hp; _bc(id, pt);
      if (SK[id] && SK[id].cls === 'hemomancer' && (P.cast > c0 || id === 'devour' || id === 'blance' || id === 'fgolem')) {
        P.hqPoseId = id; P.hqPoseT = Math.max(0.3, P.cast || 0) + 0.06;
        if (typeof hqOnCast === 'function') hqOnCast(id, pt, hp0);
      }
    };
    const _ub = updateBlood;
    updateBlood = function (dt) { _ub(dt); if (P.hqPoseT > 0) { P.hqPoseT -= dt; if (P.hqPoseT <= 0) P.hqPoseId = null; } if (typeof hqUpdateFx === 'function') hqUpdateFx(dt); };
  }
  // the lamp: its light sits on the reliquary painted at his hip, not floating beside him
  {
    const _dcl = drawClassLamp;
    drawClassLamp = function (list) {
      if (P.cls !== 'hemomancer') return _dcl(list);
      if (P.dead || !G.zone || P.suit) return;
      list.push({ d: P.x + P.y + 0.05, f: () => {
        const fr = HQ_LAST.fr; if (!fr || !fr.lamp) return;
        const q = iso(P.x, P.y), f = P.face || 1, lift = (P.roll > 0 ? Math.sin((0.34 - P.roll) / 0.34 * Math.PI) * 3 : 0) + (P.leapZ || 0);
        const x = q.sx + f * fr.lamp[0], y = q.sy + 3 - 1 + fr.lamp[1] - lift;
        ctx.globalCompositeOperation = 'lighter'; glow(x, y, 7, '190,50,34', 0.14 + 0.04 * Math.sin(G.time * 7) * Math.sin(G.time * 4.3)); ctx.globalCompositeOperation = 'source-over';
      } });
    };
  }
  // the frame drawn last this tick (for the lamp and the overlays, without stepping the pose twice)
  const HQ_LAST = { fr: null };
  {
    const _dh = drawHero;
    drawHero = function (s, x, y, face, flash, alpha, lift, k) {
      if (P.cls !== 'hemomancer') return _dh(s, x, y, face, flash, alpha, lift, k);
      const [pose, ph] = heroPose(), fr = heroFrame('hemomancer', pose, ph), p = iso(x, y), K = k || 1; HQ_LAST.fr = fr; HQ_LAST.face = face; HQ_LAST.lift = lift;
      const img = (flash && OPT.flash) ? (face < 0 ? fr.flf : fr.fl) : (face < 0 ? fr.f : fr.c);
      const w = fr.w * K, h = fr.h * K, X = Math.round(p.sx - (face < 0 ? fr.w - fr.ox : fr.ox) * K), Y = Math.round(p.sy + 3 - (fr.oy + 1) * K - lift);
      if (P.roll > 0) ctx.drawImage(img, X, Math.round(Y + h * 0.3), w, Math.round(h * 0.7)); else ctx.drawImage(img, X, Y, w, h);
      const sw = Math.round(s.w * K), sh = Math.round(s.h * K);
      return { x: Math.round(p.sx - sw / 2), y: Math.round(p.sy + 3 - sh - lift), w: sw, h: sh };
    };
  }
  window.__hqFrame = (pose, ph, view) => hqFrame(pose, ph, view, heroGear());
}
