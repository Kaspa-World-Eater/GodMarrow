
// =================================================================== HEMOMANCER: sprites, rendering, HUD and the Flesh panel
Object.assign(PAL, { q: '#5a1622', x: '#b8404a', z: '#e89aa0', j: '#d8c07a', f: '#2a8a7a', s: '#4a1c3a', a: '#c9a66b' });
// the Hemomancer: carved wooden mask, crest of feathers, blood-dark wrappings, bead strings
SPR.hemo = sprite([
  '..f.y.x.f...',
  '...fyxxf....',
  '...KwwwwK...',
  '..KwayyawK..',
  '..KwKwwKwK..',
  '..KwwxxwwK..',
  '..KwaxxawK..',
  '.KKKwwwwKKK.',
  'KqqKjjjjKqqK',
  'KxqKqxxqKqxK',
  'KqqKxqqxKqqK',
  '.KKKqxxqKKK.',
  '..KqjqqjqK..',
  '..KqqqqqqK..',
  '..KqqKKqqK..',
  '..KwqK.KqwK.',
  '.KKKK..KKKK.'
]);
// a spawnling for small icons: a torn torso on its hands
SPR.ling = sprite([
  '.....KK.',
  '.KKKKzzK',
  'KqzzzzWK',
  'KxxzzzKK',
  '.KqK.K.K'
]);
// the old mound sprite is kept only as a fallback
SPR.fgolem = sprite([
  '...KKKK...',
  '..KxxxxK..',
  '.KxzxxxxK.',
  'KxxxxxxxxK',
  'KxqqxxqqxK',
  '.KxK..KxK.'
]);
const FLESH = '#c98a80', FLESH2 = '#8e5a54', BONEW = '#f0d8c8';
// ------------------------------------------------------------------- small drawing helpers (mirrored by facing)
function bEll(cx, cy, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); ctx.fill(); }
function bRect(X, Y, f, k, a, b, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(X + (f > 0 ? a : -a - w) * k), Math.round(Y + b * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))); }
function bLine(pts, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.lineWidth = 1; }

// a spawnling: the gory upper half of a body, dragging itself along on its hands
function drawSpawnling(e) {
  const q = iso(e.x, e.y), hk = e.hatch > 0 ? 1 - e.hatch / (e.temp ? 0.15 : 0.35) : 1;
  const k = hk * (0.85 + 0.15 * e.size) * (e.rush ? 1 + 0.6 * e.rush.swell : 1), f = e.face || 1, ph = e.wob;
  const hop = e.leap ? Math.sin(Math.min(1, e.leap.t / 0.25) * Math.PI) * 6 : 0;
  const X = Math.round(q.sx), Y = Math.round(q.sy + 2 - hop - (e.cling ? 6 : 0)), fl = e.hurt > 0 && OPT.flash;
  const c = col => fl ? '#ffffff' : col, R = (a, b, w, h, col) => bRect(X, Y, f, k, a, b, w, h, c(col));
  shadow(e.x, e.y, e.r * k);
  if (e.temp) ctx.globalAlpha = 0.85;
  if (e.frenzyT > 0 || e.rush) { ctx.globalCompositeOperation = 'lighter'; glow(X, Y - 4 * k, 9 * k, '255,70,90', 0.35 + 0.15 * Math.sin(G.time * 18)); ctx.globalCompositeOperation = 'source-over'; }
  // spider legs, if grafted
  if (graftOn('legs')) for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
    const lp = Math.sin(ph * 1.6 + i * 2 + (sd > 0 ? 0 : 1.5)), bx = X + f * (-1 + i * 1.2) * k, by = Y - 3 * k;
    bLine([[bx, by], [bx + f * (lp * 2 - 1) * k + sd * 2 * k, by - 4 * k], [bx + f * (lp * 3 - 1) * k + sd * 3 * k, Y]], 1, c('#2a1a22'));
  }
  // entrails trailing behind
  const sw = Math.sin(ph * 0.8) * 1;
  R(-6 + sw * 0.3, -1, 2, 1, '#8e2630'); R(-5, -2, 2, 1, '#5a1622'); R(-7 + sw, 0, 2, 1, '#b8404a'); R(-4, 0, 1, 1, '#5a1622');
  // the far arm, behind the torso
  const hand = (p0) => { const s = Math.sin(ph + p0), up = Math.max(0, Math.cos(ph + p0)) * 1.6; return [X + f * (3 + 2.2 * s) * k, Y - up * k]; };
  const sh = [X + f * 1 * k, Y - 4 * k], h1 = hand(Math.PI), h0 = hand(0);
  bLine([sh, [(sh[0] + h1[0]) / 2 + f * k, sh[1] - 1.5 * k], h1], Math.max(1, k), c(FLESH2));
  // torso: a torn rib cage, ragged and wet where the legs used to be
  const E = (a, b, rx, ry, col) => bEll(X + f * a * k, Y + b * k, rx * k, ry * k, c(col));
  E(-0.5, -3.5, 3.6, 2.9, '#0e0d12'); E(-3, -2.4, 2, 2.2, '#0e0d12');
  E(-3, -2.4, 1.4, 1.7, '#8e2630'); E(-0.5, -3.5, 2.9, 2.2, FLESH); E(-0.8, -4.6, 2.2, 0.8, FLESH2);
  R(-2, -4, 1, 2, BONEW); R(0, -4, 1, 2, BONEW); R(-4, -3, 1, 1, BONEW);
  R(-4, -1, 1, 2, '#5a1622'); R(-2, -1, 1, 1, '#b8404a');
  // head, low and forward, jaw hanging open
  E(2.8, -5.2, 2.2, 2, '#0e0d12'); E(2.8, -5.3, 1.6, 1.5, '#d8a090');
  R(3, -6, 1, 1, '#0e0d12'); R(2, -4, 3, 1, '#5a1622'); R(4, -4, 1, 1, '#ffffff');
  // the near arm, in front
  bLine([sh, [(sh[0] + h0[0]) / 2 + f * k, sh[1] - 1.5 * k], h0], Math.max(1, k), c(FLESH));
  ctx.fillStyle = c('#8e2630'); ctx.fillRect(Math.round(h0[0]), Math.round(h0[1]) - 1, 1, 1); ctx.fillRect(Math.round(h1[0]), Math.round(h1[1]) - 1, 1, 1);
  if (e.temp) { R(-1, -7, 2, 2, '#c24050'); }
  if (e.biteT > 0) { e.biteT -= 0.016; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X + f * 6 * k), Math.round(Y - 6 * k), 1, 1); }
  ctx.globalAlpha = 1;
  if (e.hp < e.max && !e.temp) { const bw = 8, by = Math.round(Y - 10 * k); ctx.fillStyle = '#0e0d12'; ctx.fillRect(X - 4, by, bw, 1); ctx.fillStyle = '#e89aa0'; ctx.fillRect(X - 4, by, Math.round(bw * e.hp / e.max), 1); }
  return { x: X - 6 * k, y: Y - 9 * k, w: 12 * k, h: 10 * k };
}
// the Flesh Golem: a heaving mound of melted-down bodies that drags itself on one great clawed arm.
// A heavy brow over one swollen eye, a jaw crowded with fangs, pale fat dripping from every overhang,
// and the faces of what it has eaten pressed out through the skin at its base, one for every meal.
const GOL = { out: '#140606', deep: '#2e0f0c', dark: '#5a2216', mid: '#80381f', lite: '#b05e34', hi: '#e0a060', rim: '#f0c890',
  goo: '#eedcaa', gooD: '#c8b078', gum: '#8e1a1e', throat: '#2a0606', tooth: '#e6ecee', toothD: '#8e9ca4', vic: '#d6b48c', vicD: '#8a6448' };
function drawFleshGolem(g, x, y, k, sp) {
  // v0.17: it crawls: reach with the arm, plant, haul the mass forward in a surge; it flinches when hit
  const mv = g._px == null ? 0 : Math.hypot(x - g._px, y - g._py); g._px = x; g._py = y; g._wd = (g._wd || 0) + mv; g._mv = (g._mv || 0) * 0.85 + (mv > 0.003 ? 0.15 : 0);
  const cp = g._wd * 5.5, crawl = g._mv, surge = -1.6 * Math.sin(cp) * crawl, shake = g.hurt > 0 ? (Math.random() - 0.5) * 2.2 : 0;
  const q = iso(x, y), f = g.face || 1, t = G.time, X = Math.round(q.sx + surge * (g.face || 1) + shake), Y = Math.round(q.sy + 3), fl = g.hurt > 0.08 && OPT.flash;
  const c = col => fl ? '#ffffff' : col, L = (a, b) => [X + f * a * k, Y + b * k];
  const E = (a, b, rx, ry, col) => bEll(X + f * a * k, Y + b * k, rx * k, ry * k, c(col));
  const poly = (pts, col) => { ctx.fillStyle = c(col); ctx.beginPath(); pts.forEach((p, i) => { const r = L(p[0], p[1]); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); }); ctx.closePath(); ctx.fill(); };
  const eating = !!g.eat, chew = eating ? 0.35 + 0.55 * Math.abs(Math.sin(t * 8)) : 0;
  const breathe = Math.sin(t * 2.2) * 0.7 + (eating ? 1.2 : 0), slam = g.slam > 0 ? Math.sin(g.slam / 0.3 * Math.PI) : 0, open = Math.max(chew, clamp(g.mawOpen || 0, 0, 1));
  const eng = sp && sp.eng, heave = (eng ? 1.08 + 0.05 * Math.sin(t * 9) : 1) * (1 + 0.05 * Math.cos(cp) * crawl) * (g.hurt > 0 ? 0.94 : 1), B = breathe, drag = Math.sin(t * 2.6 + x) * 0.8 * (1 - crawl) + Math.sin(cp + 1.5) * 2 * crawl;
  if (g.frenzyT > 0) { ctx.globalCompositeOperation = 'lighter'; glow(X, Y - 14 * k, 30 * k, '255,70,90', 0.3 + 0.1 * Math.sin(t * 14)); ctx.globalCompositeOperation = 'source-over'; }
  // the slick it leaves behind
  ctx.fillStyle = 'rgba(40,14,8,0.55)'; ctx.beginPath(); ctx.ellipse(X - f * 8 * k, Y + 1, 22 * k, 5 * k, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = 'rgba(200,170,110,0.18)'; ctx.beginPath(); ctx.ellipse(X - f * 14 * k, Y + 1, 7 * k, 1.5 * k, 0, 0, 6.28); ctx.fill();
  // tentacles from its back
  if (sp && sp.tent) for (let i = 0; i < 3; i++) { const base = L(-6, -24 + B), a0 = -Math.PI / 2 - f * (0.5 + i * 0.35); const pts = []; for (let j = 0; j <= 5; j++) { const tt = j / 5, a = a0 + Math.sin(t * 3 + i + tt * 4) * 0.4 * tt; pts.push([base[0] + Math.cos(a) * 14 * k * tt, base[1] + Math.sin(a) * 14 * k * tt]); } bLine(pts, 3.4 * k, '#0e0d12'); bLine(pts, 2 * k, c('#9a5a7a')); }
  // the mound's silhouette: a long slope rising from the tail to a great brow at the front
  const top = -30 * heave + B, S = [[-24, 0], [-23, -3], [-19, -8], [-13, -14], [-6, -19 + B * 0.5], [1, -22 * heave + B * 0.7], [7, -23 * heave + B], [12, -20 + B], [14, -8], [12, -1], [6, 0.5], [-6, 0.5], [-16, 0.5]];
  const grow = (pts, d) => pts.map(([a, b]) => [a + Math.sign(a - 0) * d * 0.4, b - (b < -1 ? d : -d * 0.5)]);
  poly(grow(S, 1.2), GOL.out); poly(S, GOL.mid);
  // light from above and in front: a warm hot band along the crest, deep shadow pooling along the underside and tail
  ctx.save(); ctx.beginPath(); S.forEach((p, i) => { const r = L(p[0], p[1]); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); }); ctx.closePath(); ctx.clip();
  E(-10, 0, 20, 8, GOL.dark); E(-18, -2, 8, 5, GOL.deep); E(4, -1, 12, 3, GOL.deep);
  E(0, -19, 14, 5, GOL.lite); E(2, -21.5, 7, 2, GOL.hi); E(-10, -13, 6, 2.4, GOL.lite);
  // folds of sagging skin running down the slope
  for (let i = 0; i < 5; i++) { const a0 = -18 + i * 5, sag = Math.sin(t * 1.5 + i) * 0.4; bLine([L(a0, -6 - i * 3.6 + B * 0.3), L(a0 + 2, -3 - i * 2 + sag), L(a0 + 1, 0)], 1, c(GOL.dark)); bLine([L(a0 - 1, -6.5 - i * 3.6), L(a0 + 1, -3.5 - i * 2)], 1, c(GOL.lite)); }
  // craters and blisters on the crest
  for (const [a, b, r] of [[-4, -17, 1.6], [2, -20, 2], [-11, -12, 1.3], [-17, -6, 1]]) { E(a, b + B * 0.5, r + 0.6, r * 0.7 + 0.4, GOL.deep); E(a - 0.3, b - 0.4 + B * 0.5, r, r * 0.6, GOL.dark); E(a - 0.6, b - 0.8 + B * 0.5, r * 0.4, r * 0.3, GOL.hi); }
  ctx.restore();
  if (sp && sp.hump) { ctx.globalCompositeOperation = 'lighter'; glow(X - f * 6 * k, Y - 26 * k, 10 * k, '255,110,130', 0.45 + 0.15 * Math.sin(t * 5)); ctx.globalCompositeOperation = 'source-over'; E(-6, -25, 3, 3, '#c24050'); E(-3, -27, 2.2, 2.2, '#e06070'); E(-8, -23, 1.8, 1.8, '#e89aa0'); }
  if (sp && sp.chitin) { E(-4, -24, 4, 2, '#4a3428'); E(-12, -16, 3.5, 1.8, '#4a3428'); E(-4.5, -24.5, 3, 0.8, '#8a6a4a'); }
  // the far limb: a stunted stump dragging behind
  E(-15 - drag, -1.5, 3.4, 2, GOL.out); E(-15 - drag, -2, 2.6, 1.4, GOL.dark); for (let i = 0; i < 3; i++) poly([[-17.5 - drag + i * 1.4, -1], [-18.5 - drag + i * 1.4, 1], [-16.8 - drag + i * 1.4, 0]], GOL.goo);
  // the eaten: faces pushed out through the skin at its base, mouths still open
  const nv = Math.max(1, Math.min(6, g.meals || 0));
  for (let i = 0; i < nv; i++) {
    const a = -13 + i * 3.6, b = -3.2 - (i % 2) * 1.2 + Math.sin(t * 2 + i) * 0.3, strain = eng ? Math.sin(t * 8 + i) * 0.4 : 0;
    E(a, b, 1.9, 2.3 + strain, GOL.out); E(a, b, 1.5, 1.9 + strain, GOL.vic); E(a + 0.4, b + 0.5, 1, 1.2, GOL.vicD);
    const e1 = L(a - 0.7, b - 0.8), e2 = L(a + 0.6, b - 0.8), m = L(a, b + 0.6);
    ctx.fillStyle = c(GOL.throat); ctx.fillRect(Math.round(e1[0]), Math.round(e1[1]), 1, 1); ctx.fillRect(Math.round(e2[0]), Math.round(e2[1]), 1, 1); ctx.fillRect(Math.round(m[0]), Math.round(m[1]), 1, Math.max(1, Math.round((1.4 + strain) * k)));
  }
  // digesting: something presses outward from inside
  if (eng) { E(-2 + Math.sin(t * 7) * 3, -12 + Math.cos(t * 5), 3, 2.4, GOL.lite); E(-2.5 + Math.sin(t * 7) * 3, -12.6 + Math.cos(t * 5), 1.6, 1, GOL.hi); }
  // the head: a great dome shoved forward out of the mound
  const hx0 = 13, hy0 = -17 + B, hrx = 8.6, hry = 12.5 * heave;
  E(hx0, hy0, hrx + 1.1, hry + 1.1, GOL.out); E(hx0, hy0, hrx, hry, GOL.mid);
  ctx.save(); ctx.beginPath(); ctx.ellipse(X + f * hx0 * k, Y + hy0 * k, hrx * k, hry * k, 0, 0, 6.28); ctx.clip();
  E(hx0 + 3, hy0 + 8, 9, 7, GOL.dark); E(hx0 - 4, hy0 + 2, 4, 10, GOL.dark); E(hx0 + 1, hy0 - 8, 7, 5, GOL.lite); E(hx0 + 2, hy0 - 10.5, 4, 2, GOL.hi);
  for (let i = 0; i < 3; i++) bLine([L(hx0 - 7 + i * 1.5, hy0 - 6 + i * 4), L(hx0 - 4 + i * 1.2, hy0 - 4 + i * 4)], 1, c(GOL.deep));
  E(hx0 + 8.5, hy0 - 4, 1.4, 6, GOL.rim);
  ctx.restore();
  // the face: brow ridge, one great eye, a second small one weeping in the fold below it
  const ex = 14, ey = -22 + B;
  E(14, -25.2 + B, 7.2, 2.8, GOL.out); E(14, -25.7 + B, 6.4, 2.2, GOL.lite); E(13, -26.6 + B, 3.8, 1, GOL.hi);
  E(ex, ey, 4.4, 3.8, GOL.out); E(ex, ey, 3.7, 3.1, '#e8d8b8'); E(ex + 1, ey + 1.2, 2.6, 1.6, '#c8b090');
  bLine([L(ex - 3, ey - 0.5), L(ex - 1.4, ey)], 1, c('#c0404a')); bLine([L(ex + 2.8, ey + 1.2), L(ex + 1.2, ey + 0.6)], 1, c('#c0404a'));
  // the eye tracks the nearest living thing, darts, and now and then blinks shut
  if (!g._lkT || t > g._lkT) { g._lkT = t + 0.4; let bd = 9, lk = 0; for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; lk = clamp(((m.x - x) - (m.y - y)) * f * 0.25, -1, 1); } } g._lk = bd < 9 ? lk : Math.sin(t * 0.9) * 0.8; }
  const look = (g._lkS = (g._lkS || 0) + ((g._lk || 0) - (g._lkS || 0)) * 0.2), rage = g.frenzyT > 0 || open > 0.5, blink = ((t + x * 1.7) % 4.3) < 0.13;
  E(ex + 0.6 + look, ey, 1.9, 2.1, rage ? '#e04030' : '#d88a28'); E(ex + 0.6 + look, ey, rage ? 0.9 : 0.5, 1.8, '#140404');
  if (!fl) { const hl = L(ex - 1 + look, ey - 1.2); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(hl[0]), Math.round(hl[1]), 1, 1); }
  if (blink) { E(ex, ey, 3.8, 3.2, GOL.mid); bLine([L(ex - 3.4, ey + 0.4), L(ex + 3.4, ey + 0.4)], 1, c(GOL.out)); }
  E(ex, ey - 2.9, 4.4, 1, GOL.lite);                       // the brow overhang cuts across the top of the eye
  E(19.5, -18 + B, 1.3, 1, GOL.out); E(19.5, -18 + B, 0.9, 0.7, '#e8d8b8'); E(19.7, -18 + B, 0.4, 0.5, '#140404');
  // the jaw: splits the whole front of the mound; rows of fangs, top and bottom
  const mx = 15, my = -12.5 + B * 0.7, mh = 1.6 + 4.2 * open, mw = 6;
  E(mx, my, mw + 1, mh + 1.4, GOL.out); E(mx, my, mw, mh + 0.6, GOL.gum); E(mx + 0.5, my + 0.3, mw - 1.2, mh, GOL.throat);
  if (open > 0.25) { E(mx - 1, my + mh * 0.4, 3, mh * 0.35, '#8e2630'); bLine([L(mx - 2.5, my + mh * 0.3), L(mx + 1, my + mh * 0.5)], 1, c('#c8505a')); }
  for (let i = 0; i < 7; i++) {
    const a = mx - mw + 0.8 + i * (2 * mw - 1.6) / 6, ln = 1.6 + ((i * 5) % 3) * 0.7 + open * 1.2, yt = my - mh - 0.2, yb = my + mh + 0.2;
    poly([[a - 0.7, yt], [a + 0.7, yt], [a, yt + ln]], GOL.tooth); poly([[a + 0.1, yt], [a + 0.7, yt], [a + 0.1, yt + ln * 0.8]], GOL.toothD);
    if (i > 0 && i < 6) { poly([[a - 0.6, yb], [a + 0.6, yb], [a + 0.2, yb - ln * 0.9]], GOL.tooth); poly([[a + 0.2, yb], [a + 0.6, yb], [a + 0.2, yb - ln * 0.7]], GOL.toothD); }
  }
  // two long tusks at the corners
  poly([[mx + mw - 0.5, my - 1], [mx + mw + 1.2, my - 0.6], [mx + mw + 1.8, my + 4 + open]], GOL.tooth); poly([[mx + mw + 1, my - 0.8], [mx + mw + 1.2, my - 0.6], [mx + mw + 1.8, my + 4 + open]], GOL.toothD);
  if (sp && sp.vomit) { for (let i = 0; i < 4; i++) { const p = L(mx + mw + 1 + i * 2.2, my + 1 + i * 0.8); bEll(p[0] + rand(-0.6, 0.6), p[1] + rand(-0.6, 0.6), 1.5 * k, 1.1 * k, '#b8404a'); } }
  // the arm: huge, lumpy, hauling it forward; three hooked claws; it rises and crashes down in a slam
  const sh = L(6, -6 + B * 0.5), hand = slam > 0 ? L(27, -26 + 25 * (1 - slam)) : L(25 + drag + 3 * Math.sin(cp) * crawl, -0.8 - 3.5 * Math.max(0, Math.cos(cp)) * crawl), el = slam > 0 ? L(21, -12) : L(17 + 1.5 * Math.sin(cp) * crawl, -3.5 + B * 0.3 - 2.5 * Math.max(0, Math.cos(cp)) * crawl);
  bLine([sh, el, hand], 7.4 * k, GOL.out); bLine([sh, el, hand], 5.8 * k, c(GOL.lite)); bLine([[sh[0], sh[1] + 1.4 * k], [el[0], el[1] + 1.4 * k], [hand[0], hand[1] + 1.2 * k]], 2.4 * k, c(GOL.mid)); bLine([[sh[0], sh[1] - 1.8 * k], [el[0], el[1] - 1.8 * k]], 1.2 * k, c(GOL.rim)); bLine([[el[0], el[1] + 1.5 * k], [hand[0], hand[1] + 1.2 * k]], 1.6 * k, c(GOL.dark));
  bEll(el[0], el[1], 3.4 * k, 3 * k, c(GOL.out)); bEll(el[0], el[1], 2.8 * k, 2.4 * k, c(GOL.mid)); bEll(el[0] - f * 0.6 * k, el[1] - 0.8 * k, 1.4 * k, 1 * k, c(GOL.hi));
  bEll(hand[0], hand[1], 4 * k, 2.8 * k, c(GOL.out)); bEll(hand[0], hand[1] - 0.3 * k, 3.3 * k, 2.2 * k, c(GOL.mid)); bEll(hand[0] - f * 0.8 * k, hand[1] - 1 * k, 1.6 * k, 0.9 * k, c(GOL.lite));
  for (let i = 0; i < 3; i++) { const bx = hand[0] + f * (1.2 + i * 1.3) * k, by = hand[1] + (i - 1) * 1.3 * k; ctx.fillStyle = c('#0e0d12'); ctx.beginPath(); ctx.moveTo(bx, by - 1.2 * k); ctx.quadraticCurveTo(bx + f * 3 * k, by - 1 * k, bx + f * 3.4 * k, by + 1.8 * k); ctx.lineTo(bx, by + 0.9 * k); ctx.fill(); ctx.fillStyle = c('#d8d0bc'); ctx.beginPath(); ctx.moveTo(bx, by - 0.6 * k); ctx.quadraticCurveTo(bx + f * 2.5 * k, by - 0.6 * k, bx + f * 3 * k, by + 1.4 * k); ctx.lineTo(bx, by + 0.4 * k); ctx.fill(); }
  // pale fat dripping off the brow, the jaw and the arm; the drips stretch, thin and let go
  const drips = [[10, -24 + B], [17.5, -24 + B], [12, my + mh + 1], [19, my + mh + 0.5], [13, -3], [20, -2.5]];
  drips.forEach(([a, b], i) => {
    const ph = (t * 0.55 + i * 0.37) % 1, len = 0.8 + ph * (2 + (i % 3)), p0 = L(a, b), p1 = L(a, b + len);
    ctx.fillStyle = c(GOL.goo); ctx.fillRect(Math.round(p0[0]), Math.round(p0[1]), 1, Math.max(1, Math.round(p1[1] - p0[1])));
    bEll(p1[0] + 0.5, p1[1] + 0.3, 0.9 * k, 1 * k, c(GOL.goo));
    if (ph > 0.85) { const pd = L(a, b + len + (ph - 0.85) * 40); ctx.fillStyle = c(GOL.goo); ctx.fillRect(Math.round(pd[0]), Math.round(pd[1]), 1, 2); }
  });
  { const a0 = L(8.5, -24.5 + B); ctx.fillStyle = c(GOL.goo); for (let i = 0; i < 12; i++) ctx.fillRect(Math.round(a0[0] + f * i * 0.9 * k), Math.round(a0[1] + Math.sin(i * 1.7) * 0.6), 1, 1); }
  return { x: X - 24 * k, y: Y - 32 * k, w: 48 * k, h: 33 * k };
}
function drawHemo(alpha, lift) {
  if (P.suit) { drawSuit(alpha, lift); return; }
  const q0 = iso(P.x, P.y), bx = q0.sx - P.face * 3, by = q0.sy - 6 - lift;
  // tentacles writhe from the back, behind the body
  if (mutOn('tentacles')) drawTentArms(bx, by, false);
  if (P.bfrenzyT > 0) { ctx.globalCompositeOperation = 'lighter'; glow(q0.sx, q0.sy - 8, 16, '255,70,90', 0.3 + 0.1 * Math.sin(G.time * 14)); ctx.globalCompositeOperation = 'source-over'; }
  const r = drawSpr(SPR.hemo, P.x, P.y, P.face, P.hurt > 0, alpha, lift);
  // worn mutations show on the body
  if (mutOn('bilehump')) { const hx = r.x + (P.face > 0 ? 0 : r.w - 1), hy = r.y + 6; ctx.globalCompositeOperation = 'lighter'; glow(hx, hy, 8, '255,110,130', 0.35 + 0.15 * Math.sin(G.time * 5)); ctx.globalCompositeOperation = 'source-over'; bEll(hx, hy, 3, 2.5, '#c24050'); bEll(hx - P.face, hy - 2, 1.8, 1.6, '#e06070'); bEll(hx + P.face * 1.5, hy + 1, 1.2, 1.2, '#e89aa0'); }
  if (mutOn('chitin')) { ctx.fillStyle = '#6a4a3a'; ctx.fillRect(r.x + 1, r.y + 8, 2, 1); ctx.fillRect(r.x + r.w - 3, r.y + 8, 2, 1); ctx.fillRect(r.x + 3, r.y + 12, 6, 1); }
  if (mutOn('gills')) { ctx.fillStyle = '#e89aa0'; ctx.fillRect(r.x + 3, r.y + 7, 1, 1); ctx.fillRect(r.x + 8, r.y + 7, 1, 1); }
  if (mutOn('maw')) {
    const open = clamp(P.mawOpen || 0, 0, 1), mx = r.x + r.w / 2 + P.face, my = r.y + 11, eng = engulfing(P);
    if (eng) bEll(mx, my, 5 + Math.sin(G.time * 9) * 0.6, 3.5, '#b8404a');
    ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(mx) - 2, Math.round(my - 1 - open * 1.5), 4, Math.round(2 + open * 3));
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(mx) - 2, Math.round(my - 1 - open * 1.5), 1, 1); ctx.fillRect(Math.round(mx), Math.round(my - 1 - open * 1.5), 1, 1); ctx.fillRect(Math.round(mx) - 1, Math.round(my + open * 1.5), 1, 1); ctx.fillRect(Math.round(mx) + 1, Math.round(my + open * 1.5), 1, 1);
  }
  if (mutOn('tentacles')) drawTentArms(bx, by, true);
  if (P.vomiting > 0) { for (let i = 0; i < 3; i++) { const a = iso(P.x, P.y); bEll(a.sx + P.face * (4 + i * 2), a.sy - 13 - lift + i, 1.2, 1, i ? '#8e2630' : '#b8404a'); } }
  return r;
}
// the tentacle arms: idle ones writhe, lashing ones reach for their prey (front = only the lashing ones)
// v0.17: a tentacle is a tapered, segmented body: dark underside, wet highlight on top, pale suckers along the belly
function tentBody(pts, r0, r1, pal) {
  const P2 = pal || TENTPAL, n = pts.length;
  const rad = j => r0 + (r1 - r0) * (j / Math.max(1, n - 1));
  for (let j = 0; j < n; j++) { const r = rad(j) + 0.9; bEll(pts[j][0], pts[j][1], r, r, P2.out); }
  for (let j = 0; j < n; j++) { const r = rad(j); bEll(pts[j][0], pts[j][1] + r * 0.25, r, r, P2.dark); bEll(pts[j][0], pts[j][1] - r * 0.15, r * 0.8, r * 0.75, P2.mid); }
  for (let j = 0; j < n; j++) { const r = rad(j); if (r > 1) { ctx.fillStyle = P2.hi; ctx.fillRect(Math.round(pts[j][0] - r * 0.4), Math.round(pts[j][1] - r * 0.6), 1, 1); } }
  // segment rings and suckers
  for (let j = 1; j < n - 1; j += 2) { const r = rad(j), a = pts[j - 1], b = pts[j + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, sgn = ny > 0 ? 1 : -1;
    ctx.fillStyle = P2.suck; ctx.fillRect(Math.round(pts[j][0] + nx * sgn * r * 0.7), Math.round(pts[j][1] + ny * sgn * r * 0.7), 1, 1);
    ctx.fillStyle = P2.dark; ctx.fillRect(Math.round(pts[j][0] - nx * sgn * r * 0.2), Math.round(pts[j][1] - ny * sgn * r * 0.2), 1, 1); }
}
const TENTPAL = { out: '#1a0508', dark: '#5a1622', mid: '#a8364a', hi: '#f0a0aa', suck: '#ffd0d4' };
function tentMaw(x, y, ang, open) {
  // the tip splits into a little toothed mouth
  const c = Math.cos(ang), s = Math.sin(ang), o = 1.5 + open * 2.5;
  bEll(x, y, 2.6, 2.6, '#1a0508'); bEll(x, y, 1.9, 1.9, '#6e1a28');
  for (const sd of [-1, 1]) { const px = x + c * 2 - s * o * sd * 0.8, py = y + s * 2 + c * o * sd * 0.8; bLine([[x, y], [px + c * 2, py + s * 2]], 2, '#1a0508'); bLine([[x, y], [px + c * 1.6, py + s * 1.6]], 1, '#c8505e'); ctx.fillStyle = '#f2ecd8'; ctx.fillRect(Math.round(px + c * 1.4), Math.round(py + s * 1.4), 1, 1); }
  if (open > 0.3) { ctx.fillStyle = '#ff6070'; ctx.fillRect(Math.round(x + c * 1.2), Math.round(y + s * 1.2), 1, 1); }
}
function drawTentArms(bx, by, front) {
  const arms = P.tentArms, n = arms.length;
  arms.forEach((a, i) => {
    const striking = (a.state === 'coil' || a.state === 'lash') && a.ref;
    if (striking !== front) return;
    let pts = [], tipAng = 0, open = 0;
    const a0 = -Math.PI / 2 + (i - (n - 1) / 2) * 0.46 - P.face * 0.55;
    if (!striking) {
      // at rest: rising from the back and swaying, each on its own rhythm; a regrowing one is a raw stub
      const grow = a.state === 'regrow' ? 0.12 + 0.88 * a.grow : 1, L = (13 + (i % 3) * 3) * grow;
      for (let j = 0; j <= 7; j++) { const t = j / 7, ang = a0 + Math.sin(G.time * 2.6 + a.ph + t * 3.4) * 0.55 * t + Math.sin(G.time * 5.3 + a.ph) * 0.12 * t; pts.push([bx + Math.cos(ang) * L * t, by + Math.sin(ang) * L * t * 0.9]); }
      tentBody(pts, 2.2 * Math.max(0.6, grow), 0.8, TENTPAL);
      const e = pts[pts.length - 1], e0 = pts[pts.length - 2];
      if (a.state === 'regrow') { bEll(e[0], e[1], 1.8, 1.8, '#ff6070'); if (Math.random() < 0.15) parts.push({ x: P.x, y: P.y, z: 14, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: 3, t: 0.4, col: '#b8404a' }); }
      else tentMaw(e[0], e[1], Math.atan2(e[1] - e0[1], e[0] - e0[0]), 0.1 + 0.1 * Math.sin(G.time * 4 + a.ph));
      return;
    }
    const m = a.ref, e = iso(m.x, m.y), tx = e.sx, ty = e.sy - 8;
    if (a.state === 'coil') {
      // it rears back like a snake, thickening, mouth opening
      const k = Math.min(1, a.t / 0.32), L = 14 + 5 * k, back = a0 - P.face * 0.9 * k, tremble = Math.sin(G.time * 40) * 0.6 * k;
      for (let j = 0; j <= 8; j++) { const t = j / 8, ang = back + Math.sin(t * 5.5) * 0.6 * t * k; pts.push([bx + Math.cos(ang) * L * t + tremble * t, by + Math.sin(ang) * L * t - 5 * k * t * t]); }
      tentBody(pts, 2.4 + 0.6 * k, 1, TENTPAL); open = k;
    } else {
      // the lash: whips out along an arc, the tip leading, and bites
      const k = Math.min(1, a.t / 0.2), ex = bx + (tx - bx) * k, ey = by + (ty - by) * k;
      for (let j = 0; j <= 10; j++) { const t = j / 10, bow = Math.sin(t * Math.PI) * (14 - 12 * k) * (1 - k * 0.5), px = bx + (ex - bx) * t, py = by + (ey - by) * t - bow; pts.push([px + Math.sin(t * 8 + G.time * 26) * (1.4 - k), py]); }
      tentBody(pts, 2.6, 1.1, TENTPAL); open = 1 - k * 0.4;
      if (k > 0.3) { ctx.globalCompositeOperation = 'lighter'; for (let j = 1; j < pts.length; j++) { ctx.fillStyle = `rgba(255,110,130,${0.12 * j / pts.length})`; ctx.fillRect(Math.round(pts[j][0] - 3), Math.round(pts[j][1] + 3), 2, 1); } ctx.globalCompositeOperation = 'source-over'; }
    }
    const tip = pts[pts.length - 1], t0 = pts[pts.length - 2]; tentMaw(tip[0], tip[1], Math.atan2(tip[1] - t0[1], tip[0] - t0[0]), open);
  });
  // the torn end, snapping free and whipping onto its victim
  for (const a of arms) if (a.torn) {
    const tr = a.torn; tr.t -= 0.016; if (tr.t <= 0 || tr.m.dead) { a.torn = null; continue; }
    const q = iso(tr.m.x, tr.m.y), k = 1 - tr.t / 0.35, pts = [];
    for (let j = 0; j <= 6; j++) { const t = j / 6, ang = t * 5 * k + G.time * 8; pts.push([q.sx + Math.cos(ang) * (9 - 5 * t * k), q.sy - 8 + Math.sin(ang) * (4 - 2 * t * k) - t * 3]); }
    tentBody(pts, 2.2, 1, TENTPAL);
  }
}
// a tumor: a lumpy, veined, throbbing growth
function drawFHeap(h) {
  const q = iso(h.x, h.y), X = Math.round(q.sx), Y = Math.round(q.sy), t = G.time, prog = clamp(1 - h.rt / h.rtMax, 0, 1);
  const s = 0.55 + 0.6 * prog, beat = 1 + 0.06 * Math.max(0, Math.sin(t * (4 + 4 * h.boost)));
  shadow(h.x, h.y, 0.7 + 0.4 * prog);
  const lobes = [[-5, 0, 7, 3.2, '#4a1418'], [4, 1, 6, 3, '#5a1c20'], [0, -2, 8, 4.2, '#6e2a2a'], [-2, -4, 5, 3, '#8a3a36'], [3, -4.5, 3.5, 2.2, '#a4524a']];
  for (const [ox, oy, rx, ry, c] of lobes) bEll(X + ox * s, Y + oy * s * beat - 1, rx * s * beat, ry * s * beat, c);
  // veins, a sunken eye, and the maw still twitching
  ctx.fillStyle = '#c86a5a'; for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(X - 6 * s + i * 3 * s), Math.round(Y - 3 * s + Math.sin(i * 2.1) * 2), 1, 1);
  bEll(X + 2 * s, Y - 4 * s, 1.4 * s, 1 * s, '#e8d8a0'); ctx.fillStyle = '#1a0806'; ctx.fillRect(Math.round(X + 2 * s), Math.round(Y - 4 * s), 1, 1);
  bEll(X - 3 * s, Y - 1 * s, 2.2 * s, 0.8 + 0.6 * Math.abs(Math.sin(t * 3)), '#1a0608');
  const bw = 22; ctx.fillStyle = '#0e0d12'; ctx.fillRect(X - bw / 2, Y - 16, bw, 2); ctx.fillStyle = h.downT < GOLEM_MIN_DOWN ? '#8a3a44' : '#e89aa0'; ctx.fillRect(X - bw / 2, Y - 16, Math.round(bw * prog), 2);
}
function drawTumor(sx, sy, k, pul, glowA) {
  const K = k * (1 + 0.08 * pul);
  if (glowA) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - 3 * K, 7 * K, '255,90,110', glowA); ctx.globalCompositeOperation = 'source-over'; }
  bEll(sx, sy - 3 * K, 4.4 * K, 3.8 * K, '#0e0d12');
  bEll(sx, sy - 3 * K, 3.6 * K, 3 * K, '#b8404a');
  bEll(sx - 1.5 * K, sy - 3.8 * K, 2 * K, 1.8 * K, FLESH);
  bEll(sx + 1.6 * K, sy - 4.5 * K, 1.4 * K, 1.3 * K, '#d06a70');
  bEll(sx + 0.8 * K, sy - 1.6 * K, 1.2 * K, 0.9 * K, '#8e2630');
  ctx.fillStyle = '#5a1622'; ctx.fillRect(Math.round(sx - 1), Math.round(sy - 5 * K), 1, Math.max(1, Math.round(2 * K))); ctx.fillRect(Math.round(sx + 1), Math.round(sy - 2 * K), Math.max(1, Math.round(2 * K)), 1);
}
// a root vein: a thick red vein snaking from the arm to its victim, forking side-roots along the way, a pulse of
// blood running down it, rootlets at the tip, all in hard pixels
const RVPAL = { out: '#12040a', dark: '#4a0e18', mid: '#8e2630', lite: '#c24050', hi: '#ff9aa0', pulse: '#ffe0e0' };
function rvPath(v) {
  const o = iso(v.x0, v.y0), e = v.ref ? iso(v.ref.x, v.ref.y) : iso(v.ex, v.ey);
  const p0 = [o.sx, o.sy - 10], p1 = v.ref ? [e.sx, e.sy - 4 - v.ref.r * 6] : [e.sx, e.sy - 2];
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, n = Math.max(6, Math.round(L / 1.4));
  const held = v.hold > 0, sq = held ? 0.5 + 0.5 * Math.sin(G.time * 9 + v.seed) : 0, th = v.thrash && v.t > v.grow ? Math.sin(G.time * 22 + v.seed) * 3 : 0;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, wob = Math.sin(u * 7.5 + v.seed) * 5 * Math.sin(u * Math.PI) + Math.sin(u * 19 + v.seed * 2 + G.time * 3) * 1.2 - sq * 2 * Math.sin(u * Math.PI) + th * u * u;
    pts.push([p0[0] + dx * u + nx * wob, p0[1] + dy * u + ny * wob - Math.sin(u * Math.PI) * 4]);
  }
  return pts;
}
function rvBody(pts, k, r0, r1, pulseU) {
  const n = pts.length, m = Math.max(1, Math.floor((n - 1) * k));
  const R = (x, y, r, c) => { ctx.fillStyle = c; const d = Math.max(1, Math.round(r * 2)); ctx.fillRect(Math.round(x - d / 2), Math.round(y - d / 2), d, d); };
  const rad = i => r0 + (r1 - r0) * i / Math.max(1, n - 1);
  // stepped pixel body: a dark outline, the dark underside, a lighter core, a one-pixel bright ridge along the top
  for (let i = 0; i <= m; i++) R(pts[i][0], pts[i][1], rad(i) + 1, RVPAL.out);
  for (let i = 0; i <= m; i++) R(pts[i][0], pts[i][1] + 0.3, rad(i), RVPAL.dark);
  for (let i = 0; i <= m; i++) { const r = rad(i); R(pts[i][0] - 0.3, pts[i][1] - r * 0.35, Math.max(0.5, r * 0.62), RVPAL.mid); }
  for (let i = 0; i <= m; i++) { const r = rad(i); if (r >= 0.9) { ctx.fillStyle = (i % 5 === 2) ? RVPAL.hi : RVPAL.lite; ctx.fillRect(Math.round(pts[i][0] - r * 0.45), Math.round(pts[i][1] - r * 0.95), 1, 1); } }
  // knots where the vein bulges
  for (let i = 4; i < m; i += 7) { const r = rad(i); R(pts[i][0], pts[i][1], r + 0.6, RVPAL.dark); R(pts[i][0] - 0.5, pts[i][1] - 0.5, r * 0.55, RVPAL.mid); ctx.fillStyle = RVPAL.hi; ctx.fillRect(Math.round(pts[i][0] - r * 0.5), Math.round(pts[i][1] - r * 0.9), 1, 1); }
  if (pulseU != null) { const i = Math.max(0, Math.min(m, Math.round(pulseU * (n - 1)))); const r = rad(i); R(pts[i][0], pts[i][1] - 0.3, Math.max(1, r * 0.9), RVPAL.pulse); if (i > 0) R(pts[i - 1][0], pts[i - 1][1] - 0.3, Math.max(0.6, r * 0.6), RVPAL.hi); }
}
function drawRootVein(v) {
  const pts = rvPath(v), k = Math.min(1, v.t / v.grow), n = pts.length;
  const age = v.t - v.grow, hold = v.hold > 0, fade = v.thrash ? Math.max(0, 1 - Math.max(0, age - 0.5) / 0.45) : hold ? 1 : Math.max(0, 1 - Math.max(0, age - (v.holdMax || 0)) / 0.4);
  if (fade <= 0) return;
  ctx.globalAlpha = fade;
  const r0 = hold ? 2.1 : 1.8, r1 = hold ? 1.2 : 0.8;
  // side roots: short forks that split off the trunk once it has grown past them
  for (const [u, side, len] of [[0.3, 1, 7], [0.55, -1, 8], [0.78, 1, 6]]) {
    if (k < u + 0.05) continue;
    const i = Math.round(u * (n - 1)), a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx) + side * 0.95 + Math.sin(G.time * 5 + v.seed + u * 9) * 0.15, br = [];
    for (let j = 0; j <= 5; j++) { const t = j / 5; br.push([pts[i][0] + Math.cos(ang) * len * t, pts[i][1] + Math.sin(ang) * len * t * 0.7 - t * t * 2]); }
    rvBody(br, Math.min(1, (k - u) / 0.15), 1.1, 0.5);
  }
  rvBody(pts, k, r0, r1, (G.time * 2.2 + v.seed) % 1.25);
  // the tip: rootlets that splay out and dig in; while it holds, they clench in a rhythm
  const ti = Math.max(1, Math.floor((n - 1) * k)), tip = pts[ti], a = pts[ti - 1], ang = Math.atan2(tip[1] - a[1], tip[0] - a[0]);
  const clench = hold ? 0.35 + 0.35 * Math.sin(G.time * 9 + v.seed) : v.thrash ? 0.9 : 0.6;
  for (const da of [-0.9, -0.3, 0.3, 0.9]) {
    const l = (4 + Math.abs(da) * 2) * (1 - clench * 0.5), rt = [];
    for (let j = 0; j <= 3; j++) { const t = j / 3; rt.push([tip[0] + Math.cos(ang + da * (1 + clench)) * l * t, tip[1] + Math.sin(ang + da * (1 + clench)) * l * t * 0.8]); }
    rvBody(rt, 1, 0.9, 0.4);
  }
  if (v.thrash && age > 0) { ctx.fillStyle = RVPAL.lite; ctx.fillRect(Math.round(tip[0] + Math.cos(ang) * 4), Math.round(tip[1] + 2 + age * 8), 1, 2); }
  if (!v.thrash && v.bit && age < 0.2) { ctx.fillStyle = RVPAL.hi; for (let j = 0; j < 5; j++) { const b = v.seed + j * 1.3, rr = 4 + age * 30; ctx.fillRect(Math.round(tip[0] + Math.cos(b) * rr), Math.round(tip[1] + Math.sin(b) * rr * 0.6 - age * 10), 1, 1); } }
  ctx.globalAlpha = 1;
}
// a leech: a fat black slug that swells as it drinks
function drawLeech(l) {
  const q = iso(l.x, l.y), latched = l.state === 'latch', z = latched ? 9 : 0, s = 1 + Math.min(0.9, l.store / 30), sq = 1 + 0.15 * Math.sin(l.ph), f = l.face || 1;
  const X = q.sx, Y = q.sy + 1 - z;
  if (!latched) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(X) - 3, Math.round(q.sy + 1), 6, 1); }
  for (let i = 0; i < 3; i++) { const ox = f * (i - 1) * 1.8 * s * sq; bEll(X + ox, Y - 1.5 * s, (1.8 - Math.abs(i - 1) * 0.3) * s, 1.4 * s / sq, l.hurt > 0 && OPT.flash ? '#ffffff' : '#2a0f1a'); }
  bEll(X, Y - 1 * s, 2.2 * s * sq, 0.6 * s, '#8e2630');
  ctx.fillStyle = '#e89aa0'; ctx.fillRect(Math.round(X + f * 2.5 * s), Math.round(Y - 2 * s), 1, 1);
  if (l.store > 5) { ctx.globalCompositeOperation = 'lighter'; glow(X, Y - 1.5 * s, 4 * s, '200,40,60', 0.25); ctx.globalCompositeOperation = 'source-over'; }
}
// coils around a victim: constricting veins or torn-off tentacles
function drawCoils(m, t, max, col, hi, seed) {
  // a severed tentacle wound round the victim, squeezing in waves; the free end flails
  const q = iso(m.x, m.y), fade = Math.min(1, t / 0.3), sq = 0.5 + 0.5 * Math.sin(G.time * 7 + seed), R = m.r * ISO_R * (0.92 - 0.1 * sq);
  const pal = col === '#8e2630' ? { out: '#12040a', dark: '#3a0c14', mid: '#7a1e2c', hi: '#e89aa0', suck: '#f4c0c4' } : TENTPAL;
  ctx.globalAlpha = fade;
  const pts = [];
  for (let j = 0; j <= 22; j++) { const u = j / 22, ang = seed + u * Math.PI * 5.2 + G.time * 0.6, rr = R * (1 - u * 0.25); pts.push([q.sx + Math.cos(ang) * rr, q.sy - 2 - u * 13 + Math.sin(ang) * rr * 0.38]); }
  tentBody(pts, 2.3, 1.2, pal);
  const e = pts[pts.length - 1]; const tail = []; for (let j = 0; j <= 4; j++) { const u = j / 4; tail.push([e[0] + u * 5, e[1] - u * 3 + Math.sin(G.time * 14 + seed + u * 3) * 2.5 * u]); }
  tentBody(tail, 1.2, 0.6, pal);
  if (Math.random() < 0.08) parts.push({ x: m.x + rand(-0.2, 0.2), y: m.y + rand(-0.2, 0.2), z: 6 + Math.random() * 6, vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: 4, t: 0.4, col: '#b8404a' });
  ctx.globalAlpha = 1; ctx.lineWidth = 1;
}
// blood pools lie flat under everything: drawn straight onto the ground
function drawPools() {
  for (const p of G.pools) {
    const q = iso(p.x, p.y), fade = Math.min(1, p.life / 1.5) * (p.big ? 0.75 : 0.85), R = p.r;
    ctx.fillStyle = `rgba(90,14,24,${fade})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(150,30,42,${fade * 0.7})`; ctx.beginPath(); ctx.ellipse(q.sx - R * 2, q.sy - R, R * 7, R * 3.4, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) { const a = p.seed + i * 2.1; ctx.fillStyle = `rgba(90,14,24,${fade})`; ctx.beginPath(); ctx.ellipse(q.sx + Math.cos(a) * R * 12, q.sy + Math.sin(a) * R * 6, R * 3, R * 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
    if (p.big) { ctx.strokeStyle = `rgba(200,60,70,${0.3 * fade + 0.1 * Math.sin(G.time * 3)})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  // torn veins writhing on the ground
  for (const g of G.vgrnd) {
    const q = iso(g.x, g.y), a = Math.min(1, g.t / 0.5);
    const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([q.sx - 6 + t * 12, q.sy + Math.sin(G.time * 9 + g.seed + t * 7) * 1.6]); }
    ctx.globalAlpha = a; bLine(pts, 2, '#5a1622'); bLine(pts, 1, '#c24050'); ctx.globalAlpha = 1;
  }
}
function bloodRender(list, hoverCands) {
  if (!G.zone || !isBlood() && !G.pools.length && !G.brood.length) return;
  drawPools();
  if (G.hemorFx) {
    const h = G.hemorFx, q = iso(h.x, h.y), a = h.t / 0.6, k = 1 - a;
    ctx.fillStyle = `rgba(184,64,74,${0.25 * a})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, h.R * ISO_R * (0.4 + k), h.R * ISO_RY * (0.4 + k), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,48,72,${a})`; ctx.lineWidth = 1;
    for (const v of h.veins || []) { ctx.beginPath(); ctx.moveTo(q.sx, q.sy - 8); ctx.lineTo(q.sx + Math.cos(v) * (4 + 10 * k), q.sy - 8 + Math.sin(v) * (3 + 6 * k)); ctx.stroke(); }
  }
  // fresh corpses that could become minions throb faintly
  if (isBlood()) for (const m of G.zone.monsters) if (m.dead && !m.hatched && !m.eaten && !m.burst && m.rank !== 'boss' && G.time - (m.deadAt || 0) < CORPSE_LIFE && onScreen(m.x, m.y)) list.push({ d: m.x + m.y - 0.3, f: () => { const q = iso(m.x, m.y), pul = 0.5 + 0.5 * Math.sin(G.time * 4 + m.x); ctx.fillStyle = m.infected ? `rgba(200,40,56,${0.45 + 0.3 * pul})` : `rgba(142,38,48,${0.45 + 0.3 * pul})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, 6 + pul, 3 + pul * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5a1622'; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy) - 3, 6, 3); ctx.fillStyle = '#b8404a'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy) - 4, 2, 1); } });
  // tumors lying in wait
  for (const s of G.sacs) list.push({ d: s.x + s.y, f: () => {
    const q = iso(s.x, s.y), k = 1 - s.t / s.max, pul = Math.sin(G.time * (6 + k * 14));
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(q.sx) - 4, Math.round(q.sy), 8, 2);
    drawTumor(q.sx, q.sy + 2, 1 + 0.1 * Math.min(3, s.n - 1), pul, 0.15 + 0.1 * pul);
    hoverCands.push({ kind: 'minion', ref: s, rect: { x: q.sx - 4, y: q.sy - 8, w: 8, h: 9 }, d: s.x + s.y + 3 });
  } });
  // tumors in flight
  for (const s of G.tumors) list.push({ d: s.x + s.y + 0.05, f: () => { const q = iso(s.x, s.y); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(q.sx) - 2, Math.round(q.sy), 4, 1); drawTumor(q.sx, q.sy - s.z, s.fat ? 1.2 : 0.8, Math.sin(G.time * 20), 0.2); } });
  // spawnlings
  for (const e of G.brood) list.push({ d: e.x + e.y, f: () => { const r = drawSpawnling(e); if (e.rider) return; } });
  // leeches
  for (const l of G.leeches) list.push({ d: l.x + l.y + (l.state === 'latch' ? 0.2 : 0), f: () => drawLeech(l) });
  // the Flesh Golem
  if (G.fgolem) { const g = G.fgolem; list.push({ d: g.x + g.y, f: () => {
    const k = 1 + 0.03 * g.meals;
    shadow(g.x, g.y, g.r * 1.2);
    const r = drawFleshGolem(g, g.x, g.y, 0.62 * k, { eng: engulfing(g), vomit: !!g.puke, chitin: gmutOn('chitin'), tent: gmutOn('tentacles'), hump: gmutOn('bilehump') });
    if (g.eat) { ctx.fillStyle = '#c24050'; for (let i = 0; i < 3; i++) ctx.fillRect(r.x + r.w / 2 + g.face * 4 + rand(-2, 2), r.y + r.h * 0.6 + rand(-2, 2), 1, 1); }
    hoverCands.push({ kind: 'minion', ref: g, rect: r, d: g.x + g.y + 4 });
    const bw = Math.round(r.w - 6); ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(r.x + 3), Math.round(r.y) - 3, bw, 2); ctx.fillStyle = '#e89aa0'; ctx.fillRect(Math.round(r.x + 3), Math.round(r.y) - 3, Math.round(bw * clamp(g.hp / g.max, 0, 1)), 2);
    // v0.34: its brood stock, one pip per unit, bile-bright when there is enough to puke
    { const sm = HS.golemStockMax(), st = Math.round(g.stock || 0), pw = 3, x0 = Math.round(r.x + r.w / 2 - (sm * pw) / 2), y0 = Math.round(r.y) - 6, ok = st >= HS.golemPukeCost();
      ctx.fillStyle = '#0e0d12'; ctx.fillRect(x0 - 1, y0 - 1, sm * pw + 1, 3);
      for (let i = 0; i < sm; i++) { ctx.fillStyle = i < st ? (ok ? '#c8d070' : '#8a9a3a') : '#2a2226'; ctx.fillRect(x0 + i * pw, y0, pw - 1, 1); } }
  } }); }
  // v0.22: the fallen golem's heap, heaving as it regrows
  if (G.fheap) { const h = G.fheap; list.push({ d: h.x + h.y, f: () => drawFHeap(h) }); }
  // tumor spawn floating after enemies, and gore splashes
  for (const b of G.biles) {
    if (b.orb) list.push({ d: b.x + b.y + 0.02, f: () => {
      const q = iso(b.x, b.y), sy = q.sy - b.z, bob = Math.sin(G.time * 6 + b.x * 3) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(q.sx) - 2, Math.round(q.sy), 4, 1);
      bLine([[q.sx, sy + bob + 2], [q.sx + Math.sin(G.time * 9) * 1.5, sy + bob + 5], [q.sx - 1, sy + bob + 8]], 1, '#8e2630');
      drawTumor(q.sx, sy + bob + 3, 0.75, Math.sin(G.time * 12), 0.5);
      ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(q.sx + (b.face > 0 ? 1 : -2)), Math.round(sy + bob), 1, 1);
    } });
    else if (b.splat) { const q = iso(b.x, b.y), a = b.t / 0.4, R = b.R * (1.2 - a * 0.5); ctx.fillStyle = `rgba(184,40,56,${0.35 * a})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (b.fx) { const a = iso(b.x, b.y), c = iso(b.tx, b.ty); ctx.strokeStyle = `rgba(184,64,74,${b.t / 0.3})`; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 6); ctx.quadraticCurveTo((a.sx + c.sx) / 2, Math.min(a.sy, c.sy) - 14, c.sx, c.sy - 6); ctx.stroke(); }
  }
  // gouts of blood
  for (const s of G.blances) list.push({ d: s.x + s.y + 0.05, f: () => {
    // a wobbling gout: a shadow on the ground, a stretched blob, and a tail of thinning drops
    const q = iso(s.x, s.y), dx = (s.vx - s.vy) * 0.5, dy = (s.vx + s.vy) * 0.25, a = Math.atan2(dy, dx), sy = q.sy - s.z - 2;
    const wob = 1 + Math.sin(G.time * 30 + s.ph) * 0.18, len = (3 + Math.min(3, Math.hypot(dx, dy) * 0.25)) * s.mass * wob + 1, wid = (2.2 * s.mass) / wob + 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(q.sx) - 2, Math.round(q.sy), 4, 1);
    for (let i = s.trail.length - 1; i >= 1; i--) { const p = s.trail[i], pq = iso(p.x, p.y), r = Math.max(0.6, (2 - i * 0.35) * s.mass); ctx.fillStyle = i > 2 ? '#5a1622' : '#8e2630'; ctx.beginPath(); ctx.arc(pq.sx, pq.sy - p.z - 2, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#0e0d12'; ctx.beginPath(); ctx.ellipse(q.sx, sy, len + 1, wid + 1, a, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.vomit ? '#a8283a' : '#9a2a3a'; ctx.beginPath(); ctx.ellipse(q.sx, sy, len, wid, a, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e89aa0'; ctx.fillRect(Math.round(q.sx + Math.cos(a) * len * 0.4), Math.round(sy - wid * 0.5), 2, 1);
  } });
  // the vein whip: a burst of veins out of your arm
  for (const w of G.vwhips) {
    const k = Math.min(1, w.t / w.dur), fade = 1 - Math.max(0, (w.t - w.dur) / 0.18), a0 = Math.atan2(w.dy, w.dx);
    for (let v = -2; v <= 2; v++) {
      // the veins sweep across the arc like a flail of red cords
      const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, sweep = w.arc ? -1.2 + 2.4 * k : 0, a = a0 + sweep + v * 0.1 * t + Math.sin(t * 11 + G.time * 26 + v) * 0.07, rr = w.R * t * (w.arc ? 1 : k); const p = iso(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr); pts.push([p.sx, p.sy - 9 + t * 4]); }
      ctx.globalAlpha = fade; bLine(pts, 2, '#5a1622'); bLine(pts, 1, v ? '#c24050' : '#e89aa0'); ctx.globalAlpha = 1;
    }
  }
  // v0.34: Root Veins, snaking out of the forearm to their victims
  for (const v of G.rveins) list.push({ d: (v.ref ? v.ref.x + v.ref.y : v.ex + v.ey) + 0.04, f: () => drawRootVein(v) });
  // veins and tentacles coiled around their victims
  for (const v of G.veins) if (!v.ref.dead) list.push({ d: v.ref.x + v.ref.y + 0.05, f: () => drawCoils(v.ref, v.t, v.max, '#8e2630', '#e89aa0', v.seed) });
  for (const b of G.tbinds) if (!b.ref.dead) list.push({ d: b.ref.x + b.ref.y + 0.06, f: () => drawCoils(b.ref, b.t, b.max, '#b8404a', '#ffb0b8', b.seed) });
  // tentacle lashes from the golem (and the Leech's hooked tendril)
  for (const t of G.tents) {
    const m = t.ref, src = t.from || P, k = t.t / t.dur, reach = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) * 0.4, a = iso(src.x, src.y), b = iso(src.x + (m.x - src.x) * reach, src.y + (m.y - src.y) * reach);
    const lift = t.from ? 18 : 10, pts = [];
    for (let j = 0; j <= 10; j++) { const u = j / 10, bow = Math.sin(u * Math.PI) * (t.from ? 14 : 9) * (1 - reach * 0.4); pts.push([a.sx + (b.sx - a.sx) * u + Math.sin(u * 7 + G.time * 20) * 1.2, a.sy - lift + (b.sy - 7 - a.sy + lift) * u - bow]); }
    tentBody(pts, t.from ? 3 : 2, 1.1, TENTPAL);
    const tp = pts[pts.length - 1], t0 = pts[pts.length - 2]; tentMaw(tp[0], tp[1], Math.atan2(tp[1] - t0[1], tp[0] - t0[0]), k < 0.45 ? 1 : 0.2);
  }
  ctx.lineWidth = 1;
  // bleeding monsters drip
  for (const m of G.zone.monsters) if (!m.dead && m.bleed && onScreen(m.x, m.y) && Math.random() < 0.3) parts.push({ x: m.x + rand(-0.15, 0.15), y: m.y + rand(-0.15, 0.15), z: 8, vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: 5, t: 0.5, col: '#b8404a' });
}
function bloodLight() {
  for (const p of G.pools) if (p.big) { const q = iso(p.x, p.y); lightHole(q.sx, q.sy, 30, 0.35); }
  if (G.fgolem) { const q = iso(G.fgolem.x, G.fgolem.y); lightHole(q.sx, q.sy - 10, 26, 0.4); }
  for (const b of G.biles) if (b.orb) { const q = iso(b.x, b.y); lightHole(q.sx, q.sy - b.z, 16, 0.5); }
}
// HUD: brood count
function drawBroodRow() {
  const mx = HS.broodMax(), n = broodCount(), tmp = G.brood.length - n;
  uiButton(66, HUD_Y + 10, 120, 9, () => { G.panels.blood = !G.panels.blood; });
  if (inRect(mouse, 66, HUD_Y + 10, 120, 9) && !G.panels.blood) tooltip = [['Your brood', '#e8e2d0'], [`${n} of ${mx} spawnlings${tmp ? ` (+${tmp} from tumors)` : ''} · ${G.sacs.length} tumors · ${G.thralls.length} oozes · ${G.leeches.length} leeches`, '#a39d8c'], ['Hatch Brood turns corpses and tumors into spawnlings', '#a39d8c'], ['Click or press V for the Flesh panel', '#6f6a79']];
  const wl = `${n}/${mx} brood` + (tmp ? ` +${tmp}` : '');
  txt(wl, 68, HUD_Y + 26, '#a39d8c'); txt(`Lv ${P.level}`, 68 + tw(wl) + 8, HUD_Y + 26, '#d9a441');
}
function bloodHudText() {
  let y = 22;
  if (P.bfrenzyT > 0) { txt(`BLOOD FRENZY ${Math.ceil(P.bfrenzyT)}s`, 8, y, '#ff6070'); y += 10; }
  if (P.devour > 0) { txt(`DEVOURED x${P.devour} · +${8 * P.devour}% damage · ${Math.ceil(P.devourT)}s`, 8, y, '#e89aa0'); y += 10; }
  const eg = G.engulfs.find(e => e.h === P); if (eg) { txt(`DIGESTING ${(eg.m.b && eg.m.b.name ? eg.m.b.name : 'prey').toUpperCase()} ${Math.ceil(eg.max - eg.t)}s`, 8, y, '#ff6070'); y += 10; }
  if (P.inPool) { txt(mutOn('gills') ? 'BREATHING BLOOD' : 'IN BLOOD', 8, y, '#c24050'); y += 10; }
  else if (P.nearBlood) { txt('NEAR BLOOD · Vitae x1.8', 8, y, '#8e2630'); y += 10; }
  if (P.suit) { txt(`FLESH SUIT ${Math.ceil(P.suit.pool)}/${Math.round(P.suit.max)}`, 8, y, '#b8404a'); y += 10; }
  if (P.tempMut && P.tempMutT > 0) { txt(`GROWN: ${SK[P.tempMut].name} ${Math.ceil(P.tempMutT)}s`, 8, y, '#e89aa0'); y += 10; }
  y = Math.max(y, 30);
  const worn = P.muts.filter(id => mutOn(id)).map(id => SK[id].name);
  if (worn.length) { txt('Mutations: ' + worn.join(', '), 8, y, '#b8404a'); y += 10; }
  if (G.fheap) { txt(`Flesh Golem regrowing ${Math.round(100 * clamp(1 - G.fheap.rt / G.fheap.rtMax, 0, 1))}%` + (G.fheap.boost > 0.05 ? ' · fed' : ''), 8, y, '#8a3a44'); y += 10; }
  if (G.fgolem) { const g = G.fgolem; txt(`Flesh Golem ${Math.ceil(g.hp)}/${Math.round(g.max)}` + (engulfing(g) ? ' · digesting' : g.eat ? ' · eating' : '') + ` · stock ${Math.round(g.stock || 0)}/${HS.golemStockMax()}` + (g.puke ? ' · puking' : '') + (g.meals ? ` · ${g.meals} meals` : ''), 8, y, '#e89aa0'); y += 10; }
  if (P.heartCd > 0 && mutOn('heart')) txt(`Second Heart ${Math.ceil(P.heartCd)}s`, 8, y, '#6f6a79');
}
// the Flesh panel: mutations, brood grafts and orders, Flesh Golem orders and mutations
function behGrid(B, gx, gy, cs, icon) {
  txt('ATTACK', gx + cs * 2.5, gy - 3, '#c8553d', 'center', false);
  txt('GUARD', gx + cs * 2.5, gy + cs * 5 + 8, '#5c86d6', 'center', false);
  txt('CLOSE', gx - 3, gy + cs * 5 + 16, '#6f6a79', 'left', false); txt('ROAM', gx + cs * 5 + 3, gy + cs * 5 + 16, '#6f6a79', 'right', false);
  for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) {
    const cx = gx + xx * cs, cy = gy + yy * cs, on = B.x === xx && 4 - B.y === yy, agg = (4 - yy) / 4;
    ctx.fillStyle = `rgb(${24 + agg * 40},${22 + xx * 2},${30 + (1 - agg) * 30})`; ctx.fillRect(cx, cy, cs - 1, cs - 1);
    if (on) { ctx.drawImage(SPR.ling.c, cx + 3, cy + 4); ctx.strokeStyle = '#d9a441'; ctx.strokeRect(cx - .5, cy - .5, cs, cs); }
    uiButton(cx, cy, cs - 1, cs - 1, () => { B.x = xx; B.y = 4 - yy; });
  }
}
function drawBloodPanel() {
  const p = GB, tab = G.bloodTab || 0;
  gothicBg(p, true);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText('The Flesh', p.x + 8, p.y + 16);
  txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79'); uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.blood = false; });
  ['Mutations', 'Brood', 'Golem'].forEach((name, i) => {
    const bx = p.x + 5 + i * 75, by = p.y + 22, on = tab === i;
    ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, 73, 13); if (on) { ctx.fillStyle = '#b8404a'; ctx.fillRect(bx, by + 12, 73, 1); }
    txt(name, bx + 36, by + 9, on ? '#e8e2d0' : '#a39d8c', 'center', false);
    uiButton(bx, by, 73, 13, () => { G.bloodTab = i; });
  });
  if (tab === 0) {
    const slots = mutSlots();
    txt(`WORN (${P.muts.filter(id => P.skills[id] > 0).length}/${slots}) · click to take off`, p.x + 8, p.y + 48, '#8f8a7c', 'left', false);
    for (let i = 0; i < 3; i++) {
      const bx = p.x + 8 + i * 30, by = p.y + 52, id = P.muts[i], open = i < slots;
      ctx.fillStyle = open ? '#1b1920' : '#0e0d12'; ctx.fillRect(bx, by, 26, 26); ctx.strokeStyle = open ? '#b8404a' : '#2a2733'; ctx.strokeRect(bx + .5, by + .5, 25, 25);
      if (!open) { txt('locked', bx + 13, by + 16, '#3f3a4a', 'center', false); if (inRect(mouse, bx, by, 26, 26)) tooltip = [['Third slot', '#e8e2d0'], ['Opens with Flesh Mastery', '#a39d8c']]; continue; }
      if (id && P.skills[id] > 0) { skillIcon(id, bx + 4, by + 4, true); uiButton(bx, by, 26, 26, () => { P.muts = P.muts.filter(m => m !== id); D = derive(); say(`${SK[id].name} withers away`, 1); }); if (inRect(mouse, bx, by, 26, 26)) tooltip = [[SK[id].name, '#e8e2d0'], [bloodInfo(id), '#8b95ff'], ['Click to take it off', '#6f6a79']]; }
    }
    txt('GROWN · click to wear', p.x + 8, p.y + 92, '#8f8a7c', 'left', false);
    MUTS.forEach((id, i) => {
      const bx = p.x + 8 + i * 36, by = p.y + 98, has = P.skills[id] > 0, on = P.muts.includes(id);
      ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, 32, 32); if (on) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(bx + .5, by + .5, 31, 31); }
      if (!has) ctx.globalAlpha = 0.3; skillIcon(id, bx + 7, by + 4, on); ctx.globalAlpha = 1;
      if (has) uiButton(bx, by, 32, 32, () => {
        if (on) { P.muts = P.muts.filter(m => m !== id); }
        else { P.muts = P.muts.filter(m => P.skills[m] > 0); if (P.muts.length >= slots) P.muts.shift(); P.muts.push(id); burst(P.x, P.y, '#8e2630', 12, 2); sfx(90, 0.25, 'sawtooth', 0.04, 40); say(`${SK[id].name} splits out of your flesh`, 1.2); }
        D = derive();
      });
      if (inRect(mouse, bx, by, 32, 32)) tooltip = [[SK[id].name, '#e8e2d0']].concat(wrap(SK[id].desc.replace('Mutation: ', ''), 44).map(t => [t, '#a39d8c'])).concat(has ? [[bloodInfo(id), '#8b95ff']] : [['Learn it on the Flesh page (S)', '#c8553d']]);
    });
    txt('Mutations work faster while you stand in blood.', p.x + 8, p.y + 146, '#6f6a79', 'left', false);
    txt('Swap them any time, anywhere.', p.x + 8, p.y + 156, '#6f6a79', 'left', false);
  } else if (tab === 1) {
    behGrid(P.hbeh, p.x + 22, p.y + 52, 14);
    const tx = p.x + 112, slots = HS.graftSlots();
    txt(slots ? `GRAFTS (${Math.min(P.grafts.length, slots)}/${slots})` : 'GRAFTS (learn Graft)', tx, p.y + 48, '#8f8a7c', 'left', false);
    GRAFTS.forEach((id, i) => {
      const bx = tx + (i % 2) * 58, by = p.y + 52 + Math.floor(i / 2) * 22, on = graftOn(id);
      ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, 56, 20); if (on) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(bx + .5, by + .5, 55, 19); }
      if (!slots) ctx.globalAlpha = 0.35; bloodIcon('g_' + id, bx + 1, by + 1); txt(({ fevered: 'Fever', leapers: 'Leap', clingers: 'Cling', volatile: 'Burst', legs: 'Legs' })[id], bx + 22, by + 13, on ? '#e8e2d0' : '#a39d8c', 'left', false); ctx.globalAlpha = 1;
      if (slots) uiButton(bx, by, 56, 20, () => { if (P.grafts.includes(id)) P.grafts = P.grafts.filter(g => g !== id); else { P.grafts.unshift(id); P.grafts = P.grafts.slice(0, slots); } });
      if (inRect(mouse, bx, by, 56, 20)) tooltip = [[GRAFT_NAMES[id], '#e8e2d0'], [GRAFT_DESC[id], '#a39d8c']].concat(slots ? [] : [['Needs the Graft skill (Brood page)', '#c8553d']]);
    });
    [['focus', 'Attack my target'], ['hold', 'Hold position']].forEach(([k, label], i) => {
      const y = p.y + 124 + i * 14, B = P.hbeh;
      ctx.fillStyle = '#0a090d'; ctx.fillRect(tx, y, 9, 9); ctx.fillStyle = B[k] ? '#d9a441' : '#2a2733'; ctx.fillRect(tx + 2, y + 2, 5, 5);
      txt(label, tx + 13, y + 8, '#e8e2d0', 'left', false);
      uiButton(tx, y, 100, 11, () => { B[k] = !B[k]; if (k === 'hold') for (const e of G.brood) e.hold = B.hold ? { x: e.x, y: e.y } : null; });
    });
    txt(`${broodCount()}/${HS.broodMax()} spawnlings · ${G.sacs.length} tumors · ${G.thralls.length} oozes`, p.x + 8, p.y + 164, '#8f8a7c', 'left', false);
  } else {
    behGrid(P.fbeh, p.x + 22, p.y + 52, 14);
    const tx = p.x + 112, g = G.fgolem;
    txt(g ? `Life ${Math.ceil(g.hp)}/${Math.round(g.max)}` : 'Not raised (cast Flesh Golem)', tx, p.y + 52, '#e8e2d0', 'left', false);
    if (g) { txt(`${g.meals} meals` + (engulfing(g) ? ' · digesting' : g.eat ? ' · eating' : ''), tx, p.y + 64, '#a39d8c', 'left', false); }
    [['focus', 'Attack my target'], ['hold', 'Hold position']].forEach(([k, label], i) => {
      const y = p.y + 78 + i * 14, B = P.fbeh;
      ctx.fillStyle = '#0a090d'; ctx.fillRect(tx, y, 9, 9); ctx.fillStyle = B[k] ? '#d9a441' : '#2a2733'; ctx.fillRect(tx + 2, y + 2, 5, 5);
      txt(label, tx + 13, y + 8, '#e8e2d0', 'left', false);
      uiButton(tx, y, 100, 11, () => { B[k] = !B[k]; if (k === 'hold' && G.fgolem) G.fgolem.hold = B.hold ? { x: G.fgolem.x, y: G.fgolem.y } : null; });
    });
    // the golem wears mutations you have grown
    const gs = HS.golemSlots();
    txt(`ITS MUTATIONS (${P.gmuts.filter(id => P.skills[id] > 0).slice(0, gs).length}/${gs}) · click to graft`, p.x + 8, p.y + 124, '#8f8a7c', 'left', false);
    MUTS.forEach((id, i) => {
      const bx = p.x + 8 + i * 36, by = p.y + 128, has = P.skills[id] > 0, on = P.gmuts.slice(0, gs).includes(id);
      ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, 32, 24); if (on) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(bx + .5, by + .5, 31, 23); }
      if (!has) ctx.globalAlpha = 0.3; skillIcon(id, bx + 7, by + 3, on); ctx.globalAlpha = 1;
      if (has) uiButton(bx, by, 32, 24, () => {
        if (on) P.gmuts = P.gmuts.filter(m => m !== id);
        else { P.gmuts = P.gmuts.filter(m => P.skills[m] > 0).slice(0, gs); if (P.gmuts.length >= gs) P.gmuts.shift(); P.gmuts.push(id); if (G.fgolem) { burst(G.fgolem.x, G.fgolem.y, '#8e2630', 16, 2); floatText(G.fgolem.x, G.fgolem.y, SK[id].name, '#e89aa0'); } sfx(80, 0.3, 'sawtooth', 0.04, 30); }
      });
      if (inRect(mouse, bx, by, 32, 24)) tooltip = [[SK[id].name + ' (on the golem)', '#e8e2d0'], [({ maw: 'Engulfs twice as often and digests faster.', chitin: 'Takes 30% less damage.', tentacles: 'A tentacle lashes, drags in and holds enemies nearby.', gills: 'Heals three times as fast in blood.', bilehump: 'Buds tumor spawn that hunt enemies.', heart: 'Mends 1% life a second, and once a minute a killing blow leaves it at 40%.' })[id], '#a39d8c']].concat(has ? [] : [['Grow it first (Flesh page, S)', '#c8553d']]);
    });
    txt('It engulfs, spews blood, eats corpses and', p.x + 8, p.y + 162, '#6f6a79', 'left', false);
    txt('lays a tumor for every meal.', p.x + 8, p.y + 171, '#6f6a79', 'left', false);
  }
}
// skill icons
function bloodIcon(id, x, y) {
  const c = x + 9, m = y + 9, X = '#b8404a', Z = '#e89aa0', Q = '#5a1622', J = '#d8c07a', K = '#0e0d12', Wd = '#5a4330', Fl = FLESH;
  const f = (col, a, b, w, h) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); };
  const ling = (a, b) => { f(Fl, a, b + 1, 4, 2); f(K, a + 4, b, 2, 2); f('#d8a090', a + 4, b, 1, 1); f(Q, a, b + 3, 1, 1); f(X, a - 1, b + 2, 1, 1); f(Fl, a + 3, b + 3, 1, 1); f(Fl, a + 5, b + 3, 1, 1); };
  const tumor = (a, b, s) => { f(K, a - 1, b - 1, s + 2, s + 2); f(X, a, b, s, s); f(Fl, a, b, Math.ceil(s / 2), Math.ceil(s / 2)); f('#d06a70', a + s - 2, b, 2, 1); f(Q, a + 1, b + s - 1, s - 1, 1); };
  switch (id) {
    case 'hatch': f(Q, 3, 10, 12, 5); f(X, 5, 8, 8, 3); ling(6, 3); f(Z, 8, 9, 2, 1); break;
    case 'frenzy': ling(2, 5); ling(10, 9); f(X, 7, 2, 1, 3); f(X, 14, 4, 1, 3); f(X, 3, 13, 1, 3); break;
    case 'swollen': ling(1, 10); ling(11, 10); f(X, 5, 3, 8, 6); f(Z, 7, 4, 3, 2); break;
    case 'infest': f('#5a5563', 4, 3, 9, 12); ling(6, 7); f(X, 3, 3, 2, 2); f(X, 12, 12, 2, 2); break;
    case 'eggsac': tumor(3, 9, 5); tumor(10, 3, 4); f(Z, 8, 9, 1, 1); f(Z, 7, 11, 1, 1); f(Q, 13, 12, 3, 3); break;
    case 'rush': ling(2, 9); f(X, 9, 7, 7, 7); f(Z, 10, 8, 3, 2); f('#ff6070', 13, 4, 2, 2); f('#ff6070', 15, 8, 2, 2); f('#ff6070', 14, 13, 2, 2); break;
    case 'graft': ling(6, 9); f(X, 4, 3, 3, 3); f('#8f8a7c', 7, 5, 4, 1); f(Z, 11, 3, 3, 3); for (let i = 0; i < 4; i++) f('#e8e2d0', 6 + i, 7, 1, 1); break;
    case 'fgolem': f(K, 2, 3, 14, 14); f('#a98470', 3, 4, 12, 12); f('#cfae96', 3, 4, 6, 6); f('#86667c', 9, 10, 6, 5); f('#962a34', 5, 7, 3, 3); f(K, 9, 8, 3, 6); f('#ece2cc', 9, 9, 1, 1); f('#ece2cc', 11, 11, 1, 1); f('#cfae96', 11, 1, 5, 4); f('#1e1214', 12, 2, 3, 1); f('#1e1214', 3, 9, 6, 1); break;
    case 'sacs': f(K, 2, 3, 14, 13); f('#a4303c', 3, 4, 12, 11); f('#d6606a', 4, 5, 4, 3); f('#ffb4b0', 4, 5, 1, 1); f('#2a0206', 10, 5, 2, 9); f('#f0f0e8', 9, 6, 1, 1); f('#f0f0e8', 12, 9, 1, 1); f('#f0f0e8', 9, 11, 1, 1); f('#c8d070', 12, 13, 3, 2); f('#c8d070', 14, 15, 2, 1); f('#3a0a14', 5, 10, 2, 1); f('#3a0a14', 6, 12, 2, 1); break;
    case 'gorge': f(X, 3, 3, 12, 11); f(K, 5, 8, 8, 4); f('#ffffff', 5, 8, 1, 1); f('#ffffff', 8, 8, 1, 1); f('#ffffff', 11, 8, 1, 1); f(Q, 6, 14, 6, 2); break;
    case 'splitG': f(X, 2, 4, 6, 8); f(X, 10, 4, 6, 8); f(K, 8, 3, 2, 11); ling(6, 13); break;
    case 'assim': ling(1, 11); f(X, 8, 3, 8, 7); f(Z, 9, 4, 5, 2); f('#ffffff', 10, 6, 1, 1); f('#ffffff', 13, 6, 1, 1); f(Q, 8, 10, 1, 1); f(Q, 15, 10, 1, 1); break;
    case 'broodm': f(X, 4, 4, 10, 10); f(Z, 6, 5, 6, 3); f('#d9a441', 5, 1, 8, 2); ling(6, 10); break;
    case 'blance': f('#c05a60', 2, 3, 6, 5); f(K, 6, 6, 2, 2); for (let i = 0; i < 9; i++) f(i % 2 ? X : '#a8283a', 8 + i, 7 + Math.round(Math.sin(i) * 1.5) + (i >> 2), 2, 2); f(Q, 14, 14, 3, 2); break;
    case 'coag': for (let i = 0; i < 10; i++) f(X, 2 + i, 12 - i, 1, 1); f(Q, 3, 14, 4, 2); f(Q, 9, 11, 4, 2); f(Q, 13, 5, 3, 2); break;
    case 'lacer': f(X, 3, 3, 1, 12); f(X, 8, 3, 1, 12); f(X, 13, 3, 1, 12); f(Q, 3, 15, 1, 2); f(Q, 8, 15, 1, 2); f(Q, 13, 15, 1, 2); break;
    case 'hemor': f('#6a6272', 5, 5, 8, 10); f(K, 6, 7, 2, 1); f(K, 10, 7, 2, 1); [[0, -7], [6, -4], [7, 3], [-6, 4], [-7, -3]].forEach(([a, b]) => f('#ff3048', 8 + a, 9 + b, 2, 2)); f('#ff3048', 8, 10, 2, 3); break;
    case 'exsang': f(X, 7, 7, 4, 4); [[0, -7], [6, -4], [7, 3], [0, 7], [-6, 4], [-7, -3]].forEach(([a, b]) => f(Z, 8 + a, 8 + b, 2, 2)); break;
    case 'vwhip': ctx.strokeStyle = X; ctx.lineWidth = 1; for (let v = 0; v < 3; v++) { ctx.beginPath(); ctx.moveTo(x + 2, y + 15); ctx.bezierCurveTo(x + 6, y + 2 + v * 2, x + 12, y + 16 - v, x + 16, y + 3 + v * 3); ctx.stroke(); } f(Z, 15, 2, 2, 2); f(Fl, 1, 14, 3, 3); break;
    case 'bfrenzy': f('#ff6070', 3, 2, 2, 5); f('#ff6070', 8, 1, 2, 6); f('#ff6070', 13, 2, 2, 5); ling(2, 11); ling(10, 11); f(X, 6, 8, 6, 2); break;
    case 'cburst': f(Q, 4, 10, 10, 5); f(X, 6, 7, 6, 4); [[0, -7], [6, -5], [-6, -5], [8, 0], [-8, 0]].forEach(([a, b]) => f(Z, 8 + a, 8 + b, 2, 2)); break;
    case 'chainb': f(X, 1, 9, 5, 4); f(X, 12, 9, 5, 4); f('#ff6070', 7, 5, 4, 4); f(Z, 2, 6, 2, 2); f(Z, 14, 6, 2, 2); break;
    case 'spool': for (let i = 0; i < 3; i++) { const a = 2 + i * 5, b = 4 + (i % 2) * 7; f(K, a, b, 5, 3); f('#2a0f1a', a + 1, b, 3, 2); f(X, a + 1, b + 2, 3, 1); f(Z, a + 4, b, 1, 1); } break;
    case 'hemom': f(X, 5, 5, 8, 10); f(Z, 7, 6, 3, 3); f('#d9a441', 5, 2, 8, 2); f(Q, 8, 12, 2, 2); break;
    case 'maw': f(Fl, 3, 2, 12, 14); f(K, 7, 4, 4, 10); for (let i = 0; i < 4; i++) { f('#ffffff', 7, 5 + i * 2, 1, 1); f('#ffffff', 10, 5 + i * 2, 1, 1); } f(X, 8, 7, 2, 4); break;
    case 'carnal': f(K, 4, 5, 10, 7); for (let i = 0; i < 5; i++) f('#ffffff', 4 + i * 2, 5, 1, 2); f(X, 6, 12, 6, 4); f(Z, 7, 13, 2, 1); break;
    case 'chitin': for (let i = 0; i < 4; i++) { f('#6a4a3a', 4, 2 + i * 4, 10, 3); f('#9a7a5a', 5, 2 + i * 4, 8, 1); } break;
    case 'barbed': for (let i = 0; i < 3; i++) f('#6a4a3a', 5, 4 + i * 4, 8, 3); [[9, 1], [2, 8], [15, 8], [9, 16], [3, 3], [14, 3]].forEach(([a, b]) => f('#e8e2d0', a, b, 1, 2)); break;
    case 'tentacles': ctx.strokeStyle = X; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 9, y + 16); ctx.quadraticCurveTo(x + 1 + k * 5, y + 8, x + 2 + k * 5, y + 2); ctx.stroke(); } ctx.lineWidth = 1; f(Z, 2, 1, 2, 2); f(Z, 15, 1, 2, 2); break;
    case 'gills': f(X, 4, 3, 10, 12); for (let i = 0; i < 3; i++) { f(Q, 6, 5 + i * 3, 6, 1); f(Z, 6, 6 + i * 3, 6, 1); } break;
    case 'bbreath': ctx.fillStyle = Q; ctx.beginPath(); ctx.ellipse(c, m + 4, 8, 3, 0, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 3; i++) f(Z, 5 + i * 3, 3 + i, 1, 5); break;
    case 'devour': f(K, 3, 4, 12, 10); for (let i = 0; i < 5; i++) { f('#ffffff', 4 + i * 2, 4, 1, 2); f('#ffffff', 5 + i * 2, 12, 1, 2); } ling(6, 7); break;
    case 'glutton': f(X, 2, 4, 14, 11); f(K, 5, 8, 8, 3); f('#ffffff', 6, 8, 1, 1); f('#ffffff', 10, 8, 1, 1); f('#d9a441', 7, 1, 4, 2); break;
    case 'bilehump': f(X, 2, 9, 10, 7); tumor(8, 3, 5); tumor(3, 5, 3); f('#ffb0b8', 10, 4, 1, 1); break;
    case 'bloated': tumor(3, 3, 12); f(K, 8, 9, 3, 1); break;
    case 'heart': f(X, 3, 4, 5, 5); f(X, 10, 4, 5, 5); f(X, 4, 8, 10, 4); f(X, 6, 12, 6, 2); f(X, 8, 14, 2, 2); f(Z, 4, 5, 2, 1); f(Q, 11, 8, 2, 3); break;
    case 'fmastery': f(X, 4, 4, 10, 11); f(Z, 6, 6, 3, 3); f(Q, 10, 10, 2, 3); f('#d9a441', 5, 1, 8, 2); break;
    case 'g_fevered': f(X, 3, 3, 12, 12); f(Q, 5, 5, 8, 8); f('#ffb070', 7, 7, 4, 4); break;
    case 'g_leapers': ling(2, 12); ctx.strokeStyle = Z; ctx.beginPath(); ctx.arc(x + 10, y + 12, 6, Math.PI, -0.3); ctx.stroke(); ling(11, 3); break;
    case 'g_clingers': f('#5a5563', 3, 4, 8, 12); ling(9, 5); f(Q, 8, 9, 2, 1); break;
    case 'g_volatile': ling(5, 9); f('#ff6070', 3, 3, 3, 3); f('#ff6070', 12, 3, 3, 3); f(Z, 8, 1, 2, 2); break;
    case 'g_legs': ling(6, 5); for (let i = 0; i < 3; i++) { f('#2a1a22', 3 + i * 4, 10, 1, 4); f('#2a1a22', 2 + i * 4, 14, 1, 2); f('#2a1a22', 4 + i * 4, 9, 2, 1); } break;
    case 'thrall': f(K, 4, 2, 10, 14); f(X, 5, 3, 8, 11); f(Z, 6, 4, 5, 3); f(J, 11, 6, 1, 3); f(Q, 6, 14, 2, 3); f(Q, 10, 14, 2, 3); f(K, 7, 5, 1, 1); f(K, 10, 5, 1, 1); break;
    case 'contag': f(X, 6, 6, 6, 6); [[0, -7], [7, 0], [0, 7], [-7, 0], [5, 5], [-5, -5]].forEach(([a, b]) => f(Z, 8 + a, 8 + b, 2, 2)); break;
    case 'rupture': ling(1, 3); ling(11, 3); ling(6, 11); [[4, 2], [14, 2], [9, 10]].forEach(([a, b]) => { f('#ff6070', a - 2, b - 1, 1, 1); f('#ff6070', a + 2, b - 2, 1, 1); }); break;
    case 'afterb': tumor(6, 6, 6); f('#ff6070', 3, 3, 2, 2); f('#ff6070', 13, 3, 2, 2); break;
    default: return miasIcon(id, x, y);
  }
  return true;
}
