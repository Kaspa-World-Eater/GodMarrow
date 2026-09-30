
// =================================================================== v0.14: drawing for the new skills
function render14(list) {
  // falling and standing anvils
  for (const a of G.anvils) list.push({ d: a.x + a.y, f: () => {
    const q = iso(a.x, a.y), k = a.fall > 0 ? Math.max(0, a.fall - a.delay) / a.fallMax : 0, z = Math.max(0, k) * 130;
    if (a.fall - a.delay > a.fallMax) return;
    ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.3 * (1 - k)})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy + 1, 7 * (1.2 - k * 0.6), 3.5 * (1.2 - k * 0.6), 0, 0, 6.28); ctx.fill();
    if (a.fall <= 0 && a.life < 1.5 && Math.floor(G.time * 8) % 2) return;
    const s = SPR.anvil; ctx.drawImage(s.c, Math.round(q.sx - s.w / 2), Math.round(q.sy - s.h + 1 - z));
    if (z > 0) { ctx.strokeStyle = 'rgba(207,214,224,0.35)'; ctx.beginPath(); ctx.moveTo(q.sx - 4, q.sy - z - s.h); ctx.lineTo(q.sx - 4, q.sy - z - s.h - 14); ctx.moveTo(q.sx + 4, q.sy - z - s.h); ctx.lineTo(q.sx + 4, q.sy - z - s.h - 10); ctx.stroke(); }
  } });
  // Word of Unmaking: a turning sigil that closes
  for (const w of G.words) if (w.t >= 0) list.push({ d: w.x + w.y - 0.6, f: () => {
    const q = iso(w.x, w.y), k = Math.min(1, w.t / w.dur), R = w.R * (1 - 0.8 * k * k), a0 = G.time * 2 + w.seed;
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.5 * k})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, 6.28); ctx.stroke();
    ctx.strokeStyle = `rgba(200,230,255,${0.3 + 0.4 * k})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * 8, R * 4, 0, 0, 6.28); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = a0 + i / 6 * 6.28, x = q.sx + Math.cos(a) * R * ISO_R, y = q.sy + Math.sin(a) * R * ISO_RY; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 3, 2, 4); ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 1); ctx.strokeStyle = `rgba(255,255,255,${0.2 * k})`; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(q.sx, q.sy - 4); ctx.stroke(); }
    ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 4, 10 + 20 * k, '220,240,255', 0.2 + 0.4 * k); ctx.globalCompositeOperation = 'source-over';
  } });
  // the phosphorus beams of the berserk golem (and the iron shell)
  const phos = [];
  if (G.golem && G.golem.phos) phos.push([G.golem, G.golem.phos, 16]);
  if (P.shell && P.shell.phos) phos.push([P, P.shell.phos, 12]);
  for (const [src, ph, h] of phos) list.push({ d: 1e5, f: () => {
    if (!ph.end) return;
    const a = iso(src.x, src.y), b = iso(ph.end.x, ph.end.y), fl = 0.8 + 0.2 * Math.sin(G.time * 50);
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, col] of [[11, `rgba(120,255,140,${0.12 * fl})`], [6, `rgba(200,255,190,${0.4 * fl})`], [3, `rgba(240,255,230,${0.85})`], [1, 'rgba(255,255,255,1)']]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - h); ctx.lineTo(b.sx, b.sy - 5); ctx.stroke(); }
    glow(a.sx, a.sy - h, 14, '200,255,190', 0.7); glow(b.sx, b.sy - 5, 12 + 3 * Math.sin(G.time * 30), '230,255,220', 0.9);
    ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = 1;
  } });
  // Grave Banner
  for (const b of G.banners) list.push({ d: b.x + b.y, f: () => {
    const q = iso(b.x, b.y), sx = Math.round(q.sx), sy = Math.round(q.sy), wav = Math.sin(G.time * 4) * 1.5;
    ctx.strokeStyle = `rgba(142,38,48,${0.25 + 0.1 * Math.sin(G.time * 3)})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, b.R * ISO_R, b.R * ISO_RY, 0, 0, 6.28); ctx.stroke();
    ctx.fillStyle = '#0e0d12'; ctx.fillRect(sx - 1, sy - 30, 3, 31); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(sx, sy - 30, 1, 30);
    ctx.fillStyle = '#f4efe2'; ctx.fillRect(sx - 2, sy - 33, 5, 4); ctx.fillStyle = '#0e0d12'; ctx.fillRect(sx - 1, sy - 32, 1, 1); ctx.fillRect(sx + 1, sy - 32, 1, 1);
    ctx.fillStyle = '#6a1a24'; ctx.beginPath(); ctx.moveTo(sx + 1, sy - 28); ctx.lineTo(sx + 11, sy - 27 + wav); ctx.lineTo(sx + 9, sy - 20 + wav); ctx.lineTo(sx + 11, sy - 14 + wav); ctx.lineTo(sx + 1, sy - 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9a66b'; ctx.fillRect(sx + 3, sy - 24 + Math.round(wav / 2), 4, 3); ctx.fillStyle = '#0e0d12'; ctx.fillRect(sx + 4, sy - 23 + Math.round(wav / 2), 1, 1);
  } });
  // Bone Rain: shards dropping out of the sky
  for (const b of G.brains) {
    const q0 = iso(b.x, b.y); if (b.t > 0) { ctx.fillStyle = 'rgba(232,226,208,0.08)'; ctx.beginPath(); ctx.ellipse(q0.sx, q0.sy, b.R * ISO_R, b.R * ISO_RY, 0, 0, 6.28); ctx.fill(); }
    for (const s of b.drops) list.push({ d: s.x + s.y + 0.1, f: () => { const q = iso(s.x, s.y); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy), 3, 1); ctx.strokeStyle = '#0e0d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.sx, q.sy - s.z - 7); ctx.lineTo(q.sx, q.sy - s.z); ctx.stroke(); ctx.strokeStyle = '#f4efe2'; ctx.lineWidth = 1; ctx.stroke(); } });
  }
  // Grave Spirit: a howling skull with a comet tail
  for (const s of G.gspirits) list.push({ d: s.x + s.y + 0.2, f: () => {
    const q = iso(s.x, s.y), sx = Math.round(q.sx), sy = Math.round(q.sy - 10 + Math.sin(s.ph) * 2);
    ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, 12, '191,232,255', 0.5); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0e0d12'; ctx.fillRect(sx - 4, sy - 3, 8, 7); ctx.fillStyle = '#f4efe2'; ctx.fillRect(sx - 3, sy - 2, 6, 4); ctx.fillRect(sx - 2, sy + 2, 4, 1);
    ctx.fillStyle = '#0e0d12'; ctx.fillRect(sx - 2, sy - 1, 1, 2); ctx.fillRect(sx + 1, sy - 1, 1, 2); ctx.fillStyle = '#bfe8ff'; ctx.fillRect(sx - 2, sy - 1, 1, 1); ctx.fillRect(sx + 1, sy - 1, 1, 1);
  } });
  // Spine Lash
  for (const f of G.lashFx) list.push({ d: P.x + P.y + 0.3, f: () => {
    const k = Math.min(1, f.t / f.dur), fade = 1 - Math.max(0, (f.t - f.dur) / 0.1), a0 = Math.atan2(f.dy, f.dx), pts = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14 * k, ang = f.arc ? a0 - 0.9 + 1.8 * t : a0 + Math.sin(t * 12 + G.time * 30) * 0.05, rr = f.arc ? 3.2 : f.L * t, p = iso(P.x + Math.cos(ang) * rr, P.y + Math.sin(ang) * rr); pts.push([p.sx, p.sy - 9 + t * 3]); }
    ctx.globalAlpha = fade; ctx.strokeStyle = '#0e0d12'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#f4efe2'; for (let i = 2; i < pts.length; i += 2) ctx.fillRect(Math.round(pts[i][0]) - 1, Math.round(pts[i][1]) - 1, 2, 2); ctx.globalAlpha = 1;
  } });
  // Marrow Siphon: a cone of pale drawing light
  for (const f of G.siphFx) { const a0 = Math.atan2(f.dy, f.dx), q = iso(P.x, P.y); ctx.fillStyle = `rgba(232,226,208,${0.18 * f.t / 0.3})`; ctx.beginPath(); ctx.moveTo(q.sx, q.sy - 6); for (let i = 0; i <= 8; i++) { const a = a0 - 0.75 + 1.5 * i / 8, p = iso(P.x + Math.cos(a) * f.R, P.y + Math.sin(a) * f.R); ctx.lineTo(p.sx, p.sy - 4); } ctx.closePath(); ctx.fill(); }
  // Rending Arc, Black-Rag Flurry and Impaling Thrust
  for (const f of G.arcFx14) list.push({ d: f.x + f.y + 0.3, f: () => {
    const k = Math.min(1, f.t / f.dur), fade = 1 - Math.max(0, (f.t - f.dur) / 0.12), a0 = Math.atan2(f.dy, f.dx), span = f.narrow ? 0.5 : 1.45;
    ctx.globalAlpha = fade;
    for (const [w, col] of [[4, 'rgba(14,13,18,0.8)'], [2, f.col], [1, '#ffffff']]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const a = a0 + f.dir * (-span + 2 * span * k * i / 12), p = iso(f.x + Math.cos(a) * f.R, f.y + Math.sin(a) * f.R); i ? ctx.lineTo(p.sx, p.sy - 8) : ctx.moveTo(p.sx, p.sy - 8); } ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  } });
  for (const f of G.thrustFx) list.push({ d: f.x + f.y + 0.3, f: () => { const a = iso(f.x, f.y), b = iso(f.x + f.dx * f.L, f.y + f.dy * f.L), k = f.t / 0.22; for (const [o, w, col] of [[0, 4, `rgba(14,13,18,${0.7 * k})`], [-1.5, 1, `rgba(255,255,255,${k})`], [1.5, 1, `rgba(232,226,208,${k})`]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 8 + o); ctx.lineTo(b.sx, b.sy - 8 + o); ctx.stroke(); } ctx.lineWidth = 1; ctx.fillStyle = `rgba(255,255,255,${k})`; ctx.fillRect(Math.round(b.sx) - 1, Math.round(b.sy) - 9, 3, 3); } });
  // Bone Armor plates
  if (isBone() && P.barmor > 0 && !P.dead) list.push({ d: P.x + P.y + 0.08, f: () => { const q = iso(P.x, P.y), n = Math.max(1, Math.ceil(6 * P.barmor / Math.max(1, P.barmorMax))); for (let i = 0; i < n; i++) { const a = i / 6 * 6.28 + G.time * 0.8, x = q.sx + Math.cos(a) * 7, y = q.sy - 10 + Math.sin(a) * 4 - (P.leapZ || 0); ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 3, 4, 5); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 2, 3); } } });
  // ossified, crushed and culled enemies
  for (const m of G.zone.monsters) {
    if (m.dead || !onScreen(m.x, m.y)) continue;
    if (m.ossT > 0) list.push({ d: m.x + m.y + 0.04, f: () => { const q = iso(m.x, m.y); ctx.fillStyle = 'rgba(232,226,208,0.55)'; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(q.sx - 4 + ((i * 5 + Math.floor(m.x * 7)) % 8)), Math.round(q.sy - 4 - i * 3), 2, 2); } });
    if (m.crushT > 0) list.push({ d: m.x + m.y + 0.04, f: () => { const q = iso(m.x, m.y); ctx.strokeStyle = '#f4efe2'; ctx.beginPath(); ctx.moveTo(q.sx - 3, q.sy - 18); ctx.lineTo(q.sx, q.sy - 15); ctx.lineTo(q.sx - 1, q.sy - 12); ctx.lineTo(q.sx + 2, q.sy - 10); ctx.stroke(); } });
    if (m.boilT > 0 && m.bleed) list.push({ d: m.x + m.y + 0.04, f: () => { const q = iso(m.x, m.y); ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 8, 9, '255,80,90', 0.25 + 0.1 * Math.sin(G.time * 12)); ctx.globalCompositeOperation = 'source-over'; } });
  }
  // War Horn: the army glows
  if (G.hornT > 0) for (const e of G.skels.concat(G.colossus ? [G.colossus] : [])) list.push({ d: e.x + e.y - 0.01, f: () => { const q = iso(e.x, e.y); ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 8, 10, '200,85,61', 0.25 + 0.1 * Math.sin(G.time * 10 + e.x)); ctx.globalCompositeOperation = 'source-over'; } });
  // grave-risen skeletons and guards
  for (const e of G.skels) if (e.temp || e.guardT > 0) list.push({ d: e.x + e.y + 0.01, f: () => { const q = iso(e.x, e.y); if (e.temp) { ctx.fillStyle = `rgba(110,140,90,${0.35 + 0.15 * Math.sin(G.time * 6 + e.x)})`; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy) - 17, 6, 2); } if (e.guardT > 0) { ctx.strokeStyle = '#f4efe2'; ctx.strokeRect(Math.round(q.sx) - 5.5, Math.round(q.sy) - 18.5, 11, 18); } } });
  // the Colossus drags itself back together
  if (G.colRebuild) { const R = G.colRebuild; list.push({ d: R.x + R.y, f: () => { const q = iso(R.x, R.y), k = 1 - R.t / R.max; ctx.fillStyle = '#cfc6ae'; for (let i = 0; i < 14; i++) { const a = i * 2.4 + G.time, r = 8 * (1 - k); ctx.fillRect(Math.round(q.sx + Math.cos(a) * r), Math.round(q.sy - 2 - k * 14 * ((i % 4) / 4) + Math.sin(a) * r * 0.5), 2, 1); } } }); }
  // Hemomancer: nests, oozes, waves, skins
  for (const n of G.nests) list.push({ d: n.x + n.y, f: () => drawNest(n) });
  for (const th of G.thralls) list.push({ d: th.x + th.y, f: () => drawOoze(th) });
  for (const w of G.bwaves) list.push({ d: w.x + w.y + 0.2, f: () => drawBloodWave(w) });
  for (const s of G.skins) list.push({ d: s.x + s.y, f: () => { const r = drawSpr(SPR.hemo, s.x, s.y, s.face, false, 0.45 + 0.15 * Math.sin(G.time * 5)); ctx.strokeStyle = 'rgba(232,154,160,0.6)'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); ctx.fillStyle = '#0e0d12'; ctx.fillRect(r.x + 1, r.y - 3, r.w - 2, 2); ctx.fillStyle = '#e89aa0'; ctx.fillRect(r.x + 1, r.y - 3, Math.round((r.w - 2) * clamp(s.hp / s.max, 0, 1)), 2); } });
}
function light14() {
  for (const src of [G.golem, P.shell ? P : null]) { const ph = src && (src === P ? P.shell.phos : src.phos); if (ph && ph.end) { const q = iso(ph.end.x, ph.end.y); lightHole(q.sx, q.sy - 5, 40, 0.8); const a = iso(src.x, src.y); lightHole((a.sx + q.sx) / 2, (a.sy + q.sy) / 2 - 8, 36, 0.6); } }
  for (const w of G.words) if (w.t >= 0) { const q = iso(w.x, w.y); lightHole(q.sx, q.sy - 4, 40, 0.6); }
  for (const s of G.gspirits) { const q = iso(s.x, s.y); lightHole(q.sx, q.sy - 10, 20, 0.6); }
}
// a quivering ooze of blood with eyes drifting inside it
function drawOoze(th) {
  const q = iso(th.x, th.y), rk = th.rise > 0 ? 1 - th.rise / 0.6 : 1, k = th.size * rk, wob = Math.sin(th.wob * 2) * 0.8, pul = th.pulse > 0 ? th.pulse / 0.6 : 0, spit = th.spit > 0 ? 1 : 0;
  const w = (7 + wob + pul * 3) * k, h = (7 - wob * 0.6 + pul * 2 + spit) * k, X = q.sx, Y = q.sy - h * 0.7;
  shadow(th.x, th.y, 0.32 * k);
  if (th.hasteT > 0 || pul > 0) { ctx.globalCompositeOperation = 'lighter'; glow(X, Y, w * 2, '255,70,90', 0.2 + 0.4 * pul); ctx.globalCompositeOperation = 'source-over'; }
  bEll(X, Y + 1, w + 1, h + 1, '#0e0d12');
  bEll(X, Y, w, h, th.hurt > 0 && OPT.flash ? '#ffffff' : '#7a1622');
  bEll(X - w * 0.2, Y - h * 0.25, w * 0.75, h * 0.6, 'rgba(178,40,56,0.9)');
  bEll(X - w * 0.35, Y - h * 0.5, w * 0.25, h * 0.2, 'rgba(255,170,180,0.7)');
  // eyes drifting in the blood
  for (const e of th.eyes) { const a = e.a + G.time * 0.6 * e.s, ex = X + Math.cos(a) * w * 0.45 * e.r, ey = Y + Math.sin(a * 1.3) * h * 0.35 * e.r; ctx.fillStyle = '#f4efe2'; ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 2); ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(ex + (th.face > 0 ? 1 : 0)), Math.round(ey) - 1, 1, 1); }
  // drips
  ctx.fillStyle = '#5a1622'; ctx.fillRect(Math.round(X - w * 0.6), Math.round(Y + h * 0.6), 1, 2); ctx.fillRect(Math.round(X + w * 0.4), Math.round(Y + h * 0.7), 1, 1 + (Math.floor(G.time * 3) % 2));
  if (th.hp < th.max) { ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(X - 6), Math.round(Y - h - 4), 12, 2); ctx.fillStyle = '#e89aa0'; ctx.fillRect(Math.round(X - 6), Math.round(Y - h - 4), Math.round(12 * clamp(th.hp / th.max, 0, 1)), 2); }
}
function drawNest(n) {
  const q = iso(n.x, n.y), pul = 0.5 + 0.5 * Math.sin(n.pul * 5), fade = Math.min(1, n.t / 1);
  ctx.globalAlpha = fade;
  bEll(q.sx, q.sy, 12, 6, '#2a0a12'); bEll(q.sx, q.sy - 2, 10 + pul, 5 + pul * 0.5, '#6a1a24'); bEll(q.sx - 2, q.sy - 4, 6, 3, '#a8283a');
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.3; bEll(q.sx + Math.cos(a) * 7, q.sy - 3 + Math.sin(a) * 3, 2.2 + pul * (i % 2), 1.8, '#c24050'); }
  ctx.strokeStyle = '#3a0a14'; for (let i = 0; i < 4; i++) { const a = i * 1.6; ctx.beginPath(); ctx.moveTo(q.sx, q.sy - 3); ctx.quadraticCurveTo(q.sx + Math.cos(a) * 6, q.sy - 5, q.sx + Math.cos(a) * 12, q.sy + Math.sin(a) * 5); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function drawBloodWave(w) {
  const px = -w.dy, py = w.dx, n = 9, k = w.t / w.max, H = (10 + 6 * (w.grow - 1)) * (0.6 + 0.4 * k);
  for (let i = 0; i < n; i++) {
    const o = (i / (n - 1) - 0.5) * w.w, q = iso(w.x + px * o, w.y + py * o), h = H * (1 - Math.abs(i / (n - 1) - 0.5) * 0.8) + Math.sin(G.time * 18 + i) * 1.5;
    ctx.fillStyle = 'rgba(90,14,24,0.85)'; ctx.fillRect(Math.round(q.sx) - 4, Math.round(q.sy - h), 8, Math.round(h));
    ctx.fillStyle = 'rgba(184,40,56,0.9)'; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy - h), 6, Math.max(1, Math.round(h * 0.5)));
    ctx.fillStyle = '#ffb0b8'; ctx.fillRect(Math.round(q.sx) - 2, Math.round(q.sy - h), 4, 1);
  }
}
// ------------------------------------------------------------------- icons for the new skills
function icon14(id, x, y) {
  const f = (col, a, b, w, h) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); };
  const W = '#e8e2d0', U = '#f4efe2', K = '#0e0d12', R = '#8e2630', B = '#b8404a', P2 = '#e89aa0', S = '#d8f3ff', I = '#8b93a0', V = '#b070e0';
  const skull = (a, b) => { f(W, a, b, 5, 4); f(K, a + 1, b + 1, 1, 1); f(K, a + 3, b + 1, 1, 1); f(W, a + 1, b + 4, 3, 1); };
  switch (id) {
    // Animancer
    case 'cull': for (let i = 0; i < 4; i++) { f(S, 2 + i * 2, 2 + i * 3, 2, 2); f('rgba(216,243,255,0.4)', 1 + i * 2, 1 + i * 3, 1, 1); } f(K, 11, 9, 5, 7); f('#c8553d', 12, 10, 3, 5); break;
    case 'word': ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 9, y + 9, 7, 0, 6.28); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 9, y + 9, 3, 0, 6.28); ctx.stroke(); for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.78; f('#ffffff', Math.round(9 + Math.cos(a) * 7) - 1, Math.round(9 + Math.sin(a) * 7) - 1, 2, 2); } break;
    case 'chain': { const pts = [[2, 14], [6, 6], [10, 11], [15, 3]]; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(x + a, y + b) : ctx.moveTo(x + a, y + b)); ctx.stroke(); pts.forEach(([a, b]) => f(S, a - 1, b - 1, 2, 2)); break; }
    // Ossurarch
    case 'offering': skull(6, 7); [[0, -7], [6, -5], [-6, -5], [7, 1], [-7, 1]].forEach(([a, b]) => { f(U, 8 + a, 8 + b, 2, 1); f(U, 8 + a * 0.6, 8 + b * 0.6, 1, 1); }); f(R, 7, 14, 4, 2); break;
    case 'banner': f(W, 4, 2, 1, 15); f(U, 3, 1, 3, 2); f('#6a1a24', 5, 3, 9, 7); f('#c9a66b', 8, 5, 3, 2); f(K, 9, 5, 1, 1); break;
    case 'unearth': f('#5a4330', 1, 13, 16, 4); skull(6, 6); f(W, 4, 11, 2, 3); f(W, 12, 10, 2, 4); f('#6e8c5a', 7, 11, 4, 1); break;
    case 'horn': ctx.strokeStyle = W; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 12, y + 14, 9, 3.4, 4.9); ctx.stroke(); ctx.lineWidth = 1; f(U, 2, 9, 3, 4); f('#c8553d', 14, 2, 1, 3); f('#c8553d', 16, 5, 1, 2); break;
    case 'bward': f(W, 3, 3, 12, 12); f(K, 5, 5, 8, 8); skull(6, 6); f(U, 2, 2, 2, 2); f(U, 14, 2, 2, 2); break;
    case 'reasm': for (let i = 0; i < 5; i++) f(W, 2 + i * 3, 12 - (i % 2) * 3, 2, 1); skull(6, 2); ctx.strokeStyle = '#d9a441'; ctx.beginPath(); ctx.arc(x + 9, y + 10, 7, 0.5, 2.6); ctx.stroke(); break;
    case 'siphon': f(K, 12, 6, 5, 7); f(B, 13, 7, 3, 5); for (let i = 0; i < 4; i++) f(U, 3 + i * 2, 9 + (i % 2), 1, 1); ctx.strokeStyle = W; ctx.beginPath(); ctx.moveTo(x + 2, y + 9); ctx.lineTo(x + 12, y + 3); ctx.moveTo(x + 2, y + 9); ctx.lineTo(x + 12, y + 15); ctx.stroke(); break;
    case 'ossify': f('#6f6a79', 5, 3, 8, 12); f(W, 5, 3, 4, 5); f(W, 9, 9, 4, 3); f(U, 6, 12, 2, 3); f(K, 7, 5, 1, 1); f(K, 10, 5, 1, 1); break;
    case 'bonerain': for (let i = 0; i < 6; i++) { f(K, 2 + i * 3, 1 + (i % 3) * 3, 2, 6); f(U, 2 + i * 3, 1 + (i % 3) * 3, 1, 5); } f('#5a4330', 1, 16, 16, 1); break;
    case 'spirit': ctx.globalAlpha = 0.5; f('#bfe8ff', 1, 10, 8, 2); f('#bfe8ff', 3, 7, 6, 2); ctx.globalAlpha = 1; skull(9, 5); f(K, 9, 5, 5, 1); f('#bfe8ff', 10, 6, 1, 1); f('#bfe8ff', 12, 6, 1, 1); break;
    case 'barmor': f(K, 4, 2, 10, 14); for (let i = 0; i < 4; i++) { f(W, 5, 3 + i * 3, 8, 2); f(U, 5, 3 + i * 3, 8, 1); } break;
    case 'crush': f('#5a4330', 3, 10, 2, 7); f(W, 1, 4, 7, 6); f(U, 1, 4, 7, 1); f(K, 10, 8, 6, 8); f(W, 11, 9, 4, 6); f(K, 13, 9, 1, 3); f(K, 12, 12, 1, 3); break;
    case 'bscythe': ctx.strokeStyle = W; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 9, y + 9, 6, 0.3, 5.2); ctx.stroke(); ctx.lineWidth = 1; f(U, 14, 4, 3, 2); break;
    case 'leap': ctx.strokeStyle = '#8f8a7c'; ctx.beginPath(); ctx.arc(x + 9, y + 14, 7, 3.3, 6.1); ctx.stroke(); f(W, 13, 9, 3, 4); [[2, 15], [5, 13], [13, 15], [16, 13]].forEach(([a, b]) => f(U, a, b, 1, 2)); break;
    case 'lash': for (let i = 0; i < 7; i++) { f(K, 2 + i * 2, 8 + Math.round(Math.sin(i) * 2), 2, 3); f(W, 2 + i * 2, 9 + Math.round(Math.sin(i) * 2), 2, 1); } f(U, 15, 7, 2, 3); break;
    // Hemomancer
    case 'thrall': bEll(x + 9, y + 11, 7, 5.5, K); bEll(x + 9, y + 10.5, 6, 4.5, '#7a1622'); bEll(x + 7, y + 9, 3, 2, B); f(U, 6, 10, 2, 2); f(K, 7, 10, 1, 1); f(U, 11, 9, 2, 2); f(K, 12, 9, 1, 1); f('#5a1622', 5, 15, 1, 2); break;
    case 'nest': bEll(x + 9, y + 12, 8, 4.5, '#2a0a12'); bEll(x + 9, y + 11, 6.5, 3.5, '#6a1a24'); [[4, 10], [9, 8], [14, 10], [7, 13], [12, 13]].forEach(([a, b]) => bEll(x + a, y + b, 1.8, 1.4, '#c24050')); break;
    case 'hive': [[4, 4], [13, 5], [8, 10], [3, 13], [14, 14]].forEach(([a, b]) => { f(B, a, b, 3, 3); f(P2, a, b, 1, 1); }); ctx.strokeStyle = 'rgba(232,154,160,0.6)'; ctx.beginPath(); ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + 9, y + 11); ctx.lineTo(x + 14, y + 6); ctx.moveTo(x + 9, y + 11); ctx.lineTo(x + 4, y + 14); ctx.moveTo(x + 9, y + 11); ctx.lineTo(x + 15, y + 15); ctx.stroke(); break;
    case 'bboil': bEll(x + 9, y + 12, 7, 4, '#5a1622'); for (let i = 0; i < 5; i++) { const a = (i * 3 + Math.floor(G.time * 4)) % 9; bEll(x + 4 + i * 2.5, y + 11 - a * 0.9, 1.3, 1.3, i % 2 ? '#ff6070' : B); } break;
    case 'bwave': for (let i = 0; i < 5; i++) { f('#5a1622', 2 + i * 3, 16 - (3 + i * 2), 3, 3 + i * 2); f(B, 2 + i * 3, 16 - (3 + i * 2), 3, 1); } f('#ffb0b8', 14, 5, 3, 1); break;
    case 'pact': f(P2, 3, 5, 12, 2); f(R, 5, 7, 8, 8); f(B, 7, 8, 4, 5); f(K, 8, 1, 2, 5); f('#ffffff', 8, 1, 1, 3); break;
    case 'swallow': bEll(x + 9, y + 9, 7, 6, K); f(B, 3, 5, 12, 8); f(K, 5, 7, 8, 4); for (let i = 0; i < 4; i++) { f(U, 5 + i * 2, 7, 1, 1); f(U, 6 + i * 2, 10, 1, 1); } break;
    case 'molt': ctx.globalAlpha = 0.45; f(P2, 2, 4, 6, 12); ctx.globalAlpha = 1; f(B, 9, 3, 6, 13); f('#ffffff', 11, 5, 1, 1); f(P2, 7, 10, 2, 1); break;
    // Assassin
    case 'rarc': ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 4, y + 9, 10, -1.3, 1.3); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = W; ctx.beginPath(); ctx.arc(x + 4, y + 9, 7, -1.2, 1.2); ctx.stroke(); f('#3a2248', 1, 7, 4, 4); break;
    case 'thrust': for (let i = 0; i < 13; i++) { f(K, 2 + i, 8, 1, 3); f(i > 10 ? '#ffffff' : W, 2 + i, 9, 1, 1); } f(U, 2, 6, 5, 1); f(U, 2, 12, 5, 1); f('#ffffff', 15, 8, 2, 3); break;
    case 'flurry': for (let i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? W : '#ffffff'; ctx.beginPath(); ctx.moveTo(x + 2 + i * 4, y + 3); ctx.lineTo(x + 5 + i * 3, y + 15); ctx.stroke(); } f(V, 1, 15, 16, 1); break;
    default: return false;
  }
  return true;
}
