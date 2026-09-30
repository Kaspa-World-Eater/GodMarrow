
// =================================================================== THE INVERTED TRIUNE: panel (A), world effects
const AP = { x: 6, y: 4, w: 468, h: 232 };
const SUIT = { ossumancer: { name: 'Towers', face: '#e8e2d0', ink: '#6f6a5c' }, hemomancer: { name: 'Wheels', face: '#b8404a', ink: '#5a1622' }, animancer: { name: 'Lanterns', face: '#bfe8ff', ink: '#3f5f7a' }, '*': { name: 'Hollows', face: '#3a3446', ink: '#b48ad9' } };
function wrapPx(t, w) { const out = []; let line = ''; for (const word of t.split(' ')) { const tryL = line ? line + ' ' + word : word; if (tw(tryL) > w && line) { out.push(line); line = word; } else line = tryL; } if (line) out.push(line); return out; }
function webPos(n) { const u = 19.5; return { x: AP.x + 158 + n.x * u, y: AP.y + 146 + n.y * u }; }
function arcKindLabel(id) {
  const c = ARC[id], pages = tabNames();
  if (c.kind === 'major') { const cl = (WEB_DEF[P.cls] || { clusters: [] }).clusters.find(k => k.majors.includes(id)); return 'Major Arcana' + (cl ? ' · ' + pages[cl.page] : ''); }
  if (c.kind === 'minor') { const cl = (WEB_DEF[P.cls] || { clusters: [] }).clusters.find(k => k.minors.includes(id)); return 'Minor Arcana' + (cl ? ' · ' + pages[cl.page] : ''); }
  if (c.kind === 'hybrid') return 'Hybrid · ' + c.gods;
  if (c.kind === 'hollow') return 'Minor Arcana · the Void';
  return 'Major Arcana · the Void';
}
function drawCardGlyph(x, y, c, id, orient, lit) {
  // a little tarot card: face, border, a mark in the middle; reversed cards are drawn upside down with a red corner
  const s = SUIT[c.cls] || SUIT['*'], w = 9, h = 13, rx = Math.round(x - w / 2), ry = Math.round(y - h / 2);
  ctx.fillStyle = '#0a090d'; ctx.fillRect(rx - 1, ry - 1, w + 2, h + 2);
  ctx.fillStyle = lit ? s.face : '#2a2733'; ctx.fillRect(rx, ry, w, h);
  ctx.fillStyle = lit ? s.ink : '#3a3446'; ctx.fillRect(rx + 1, ry + 1, w - 2, 1); ctx.fillRect(rx + 1, ry + h - 2, w - 2, 1);
  const up = orient !== 'r';
  ctx.fillStyle = lit ? s.ink : '#4a4556';
  // a triangle: point up (upright) or down (reversed)
  for (let i = 0; i < 4; i++) { const yy = up ? ry + 4 + i : ry + h - 5 - i; ctx.fillRect(rx + 4 - i, yy, 1 + i * 2 > 7 ? 7 : 1 + i * 2, 1); }
  if (orient === 'r') { ctx.fillStyle = '#c8553d'; ctx.fillRect(rx + w - 2, ry, 2, 2); }
  if (P.arc.both === id) { ctx.fillStyle = '#b48ad9'; ctx.fillRect(rx, ry, 2, 2); ctx.fillRect(rx + w - 2, ry + h - 2, 2, 2); }
}
function drawArcana() {
  const p = AP, W_ = web();
  ctx.fillStyle = '#0a090e'; ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText('The Inverted Triune', p.x + 8, p.y + 17);
  txt(`Arcana ${P.arc.pts}`, p.x + 318, p.y + 15, P.arc.pts ? '#d9a441' : '#6f6a79', 'left', false);
  txt(`${arcSpent()} Major`, p.x + 390, p.y + 15, '#8f8a7c', 'left', false);
  txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79'); uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.arcana = false; });
  if (!W_) { txt('This class has no web yet.', p.x + 150, p.y + 120, '#a39d8c', 'center', false); return; }
  const cx = p.x + 158, cy = p.y + 146, u = 19.5, t = G.time;
  // the triangle turned over: three corners above, the Void below
  const corner = (a, r) => ({ x: cx + Math.cos(a) * r * u, y: cy + Math.sin(a) * r * u });
  const A0 = corner(-150 * Math.PI / 180, 6.4), A2 = corner(-30 * Math.PI / 180, 6.4), V = { x: cx, y: cy + 3.9 * u };
  ctx.strokeStyle = 'rgba(180,138,217,0.13)'; ctx.beginPath(); ctx.moveTo(A0.x, A0.y); ctx.lineTo(A2.x, A2.y); ctx.lineTo(V.x, V.y); ctx.closePath(); ctx.stroke();
  const pages = tabNames();
  (WEB_DEF[P.cls].clusters).forEach((c, i) => { const q = i === 1 ? { x: cx, y: p.y + 33 } : { x: i === 0 ? p.x + 34 : p.x + 282, y: cy - 3.9 * u }; txt(pages[c.page].toUpperCase(), q.x, q.y, '#6f6a79', 'center', false); });
  txt('THE VOID', cx + 70, V.y - 4, '#6a5a7a', 'center', false);
  // links
  const drawn = new Set();
  for (const id in W_) for (const l of W_[id].links) {
    const key = id < l ? id + '|' + l : l + '|' + id; if (drawn.has(key)) continue; drawn.add(key);
    const a = webPos(W_[id]), b = webPos(W_[l]), ta = id === 'heart' || arcOf(id), tb = l === 'heart' || arcOf(l);
    ctx.strokeStyle = ta && tb ? '#d9a441' : ta || tb ? 'rgba(217,164,65,0.35)' : '#2e2a36'; ctx.lineWidth = ta && tb ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.lineWidth = 1;
  // nodes
  let hov = null;
  for (const id in W_) {
    const n = W_[id], q = webPos(n), c = ARC[id], tk = arcOf(id), can = id !== 'heart' && !arcWhyNot(id) && !tk;
    if (id === 'heart') {
      ctx.fillStyle = '#0a090d'; ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#8e2630'; ctx.beginPath(); ctx.arc(q.x, q.y, 4.5, 0, 6.28); ctx.fill(); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 3, 2, 6); ctx.fillRect(Math.round(q.x) - 3, Math.round(q.y) - 1, 6, 2);
    } else if (c.kind === 'major' || c.kind === 'void') {
      if (can) glow(q.x, q.y, 12, '217,164,65', 0.25 + 0.15 * Math.sin(t * 4));
      if (tk) glow(q.x, q.y, 11, c.kind === 'void' ? '180,138,217' : '217,190,120', 0.3);
      drawCardGlyph(q.x, q.y, c, id, tk, !!tk || can);
      if (tk) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(Math.round(q.x) - 5.5, Math.round(q.y) - 7.5, 11, 15); }
    } else if (c.kind === 'hybrid') {
      if (can) glow(q.x, q.y, 10, '217,164,65', 0.25 + 0.15 * Math.sin(t * 4));
      ctx.fillStyle = '#0a090d'; ctx.beginPath(); ctx.moveTo(q.x, q.y - 6); ctx.lineTo(q.x + 6, q.y); ctx.lineTo(q.x, q.y + 6); ctx.lineTo(q.x - 6, q.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = tk ? '#d9a441' : can ? '#8f7a55' : '#3a3446'; ctx.beginPath(); ctx.moveTo(q.x, q.y - 4.5); ctx.lineTo(q.x + 4.5, q.y); ctx.lineTo(q.x, q.y + 4.5); ctx.lineTo(q.x - 4.5, q.y); ctx.closePath(); ctx.fill();
    } else {
      if (can) glow(q.x, q.y, 8, '217,164,65', 0.2 + 0.15 * Math.sin(t * 4));
      ctx.fillStyle = '#0a090d'; ctx.beginPath(); ctx.arc(q.x, q.y, 4.2, 0, 6.28); ctx.fill();
      ctx.fillStyle = tk ? (c.kind === 'hollow' ? '#b48ad9' : '#d9a441') : can ? '#6f6250' : c.kind === 'hollow' ? '#2a2236' : '#2e2a36'; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, 6.28); ctx.fill();
    }
    if (G.arcSel === id) { ctx.strokeStyle = '#ffffff'; ctx.strokeRect(Math.round(q.x) - 8.5, Math.round(q.y) - 9.5, 17, 19); }
    if (id !== 'heart') { uiButton(q.x - 7, q.y - 8, 14, 16, () => { G.arcSel = id; }); if (inRect(mouse, q.x - 7, q.y - 8, 14, 16)) hov = id; }
  }
  // the card reader
  const sel = hov || G.arcSel, rx = p.x + 318, rw = 142;
  ctx.fillStyle = '#121016'; ctx.fillRect(rx - 4, p.y + 24, rw + 6, p.h - 30);
  if (!sel) {
    let y = p.y + 38;
    const help = ['Cards change how your skills work. Arcana to spend them come from bosses, guardians and hidden shrines, never from levels.', 'Start next to the heart and walk outward. Majors are set upright or reversed.', 'Flip a Major for free at any lantern. A full reset costs a Hollow Token.'];
    for (const h of help) { for (const l of wrapPx(h, rw)) { txt(l, rx, y, '#a39d8c', 'left', false); y += 9; } y += 5; }
    txt(`Resets left: ${P.respecs}`, rx, y + 4, '#8f8a7c', 'left', false);
    return;
  }
  const c = ARC[sel], tk = arcOf(sel); let y = p.y + 38;
  txt(c.name, rx, y, c.kind === 'void' || c.kind === 'hollow' ? '#b48ad9' : c.kind === 'major' ? '#e8d6a0' : '#e8e2d0', 'left', false); y += 10;
  txt(arcKindLabel(sel), rx, y, '#6f6a79', 'left', false); y += 12;
  const para = (label, body, col) => { const lines = wrapPx((label ? label + ': ' : '') + body, rw); for (const l of lines) { txt(l, rx, y, col, 'left', false); y += 9; } y += 4; };
  if (hasOrient(sel)) { para('Upright', c.up, tk === 'u' || aU(sel) && tk ? '#e8e2d0' : '#a39d8c'); para('Reversed', c.rev, tk === 'r' || aR(sel) && tk ? '#e8e2d0' : '#a39d8c'); }
  else para('', c.up, tk ? '#e8e2d0' : '#a39d8c');
  if (P.arc.both === sel) { txt('Unmade: counts both ways', rx, y, '#b48ad9', 'left', false); y += 11; }
  const why = arcWhyNot(sel), by = p.y + p.h - 34;
  if (!tk) {
    if (why) txt(why, rx, by + 4, '#c8553d', 'left', false);
    else if (hasOrient(sel)) { const w1 = smallBtn('Take upright', rx, by, () => takeCard(sel, 'u')); smallBtn('Reversed', rx + w1 + 4, by, () => takeCard(sel, 'r')); }
    else smallBtn('Take (1 Arcana)', rx, by, () => takeCard(sel));
  } else if (hasOrient(sel)) {
    const shr = atShrine();
    smallBtn(tk === 'u' ? 'Flip to reversed' : 'Flip to upright', rx, by, () => flipCard(sel), shr);
    if (aU('v_unmade') && c.kind === 'major') smallBtn(P.arc.both === sel ? 'Unmake: off' : 'Unmake: both', rx, by + 14, () => setBoth(sel), shr);
    if (!shr) txt('Flip at a lantern', rx, by + (aU('v_unmade') && c.kind === 'major' ? 30 : 18), '#6f6a79', 'left', false);
  } else txt('Taken', rx, by + 4, '#d9a441', 'left', false);
}

// ------------------------------------------------------------------- world render
function arcanaRender(list) {
  const z = G.zone;
  arcanaRender2(list);
  // burning ground
  for (const f of G.fires) { if (!onScreen(f.x, f.y)) continue; list.push({ d: f.x + f.y - 0.6, f: () => { const q = iso(f.x, f.y), a = Math.min(1, f.t / 0.6); ctx.fillStyle = f.pale ? `rgba(170,255,170,${0.25 * a})` : `rgba(200,85,61,${0.28 * a})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, f.R * ISO_R, f.R * ISO_RY, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = f.pale ? `rgba(235,255,220,${0.5 * a})` : `rgba(255,154,60,${0.35 * a})`; for (let i = 0; i < 4; i++) { const k = (G.time * 3 + i * 0.25 + f.x) % 1; ctx.fillRect(Math.round(q.sx + Math.sin(i * 7 + f.y) * f.R * 7), Math.round(q.sy - k * 8), 1, 2); } } }); }
  // shard trails and caltrops
  for (const s of G.strail) if (onScreen(s.x, s.y)) list.push({ d: s.x + s.y - 0.5, f: () => { const q = iso(s.x, s.y); ctx.fillStyle = `rgba(232,226,208,${Math.min(1, s.t) * 0.8})`; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy) - 1, 2, 1); ctx.fillRect(Math.round(q.sx), Math.round(q.sy) - 2, 1, 1); } });
  for (const c of G.caltrops) if (onScreen(c.x, c.y)) list.push({ d: c.x + c.y - 0.5, f: () => { const q = iso(c.x, c.y); if (c.iron) { ctx.fillStyle = '#8b93a0'; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy) - 1, 2, 1); ctx.fillRect(Math.round(q.sx) + 1, Math.round(q.sy), 3, 1); ctx.fillRect(Math.round(q.sx), Math.round(q.sy) - 2, 1, 1); return; } ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy) - 2, 7, 3); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(q.sx) - 2, Math.round(q.sy) - 1, 5, 1); ctx.fillRect(Math.round(q.sx), Math.round(q.sy) - 3, 1, 3); } });
  // revenant spirits
  for (const g of G.ghosts) list.push({ d: g.x + g.y, f: () => { const r = drawSpr(SPR.skelBare, g.x, g.y, g.face, false, 0.45 + 0.15 * Math.sin(G.time * 8), 2); ctx.globalCompositeOperation = 'lighter'; const q = iso(g.x, g.y); glow(q.sx, q.sy - 8, 10, '191,232,255', 0.25); ctx.globalCompositeOperation = 'source-over'; } });
  // frozen and chilled enemies, lightning, afterimages
  for (const m of z.monsters) {
    if (m.dead || !onScreen(m.x, m.y)) continue;
    if (m.frozen > 0) list.push({ d: m.x + m.y + 0.02, f: () => { const q = iso(m.x, m.y); ctx.fillStyle = 'rgba(191,232,255,0.45)'; ctx.fillRect(Math.round(q.sx) - 6, Math.round(q.sy) - 16 * (m.r / 0.3), 12, Math.round(16 * (m.r / 0.3))); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(Math.round(q.sx) - 4, Math.round(q.sy) - 12, 1, 6); } });
    else if (m.chillT > 0) list.push({ d: m.x + m.y + 0.02, f: () => { const q = iso(m.x, m.y); ctx.fillStyle = 'rgba(191,232,255,0.5)'; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy) - 2, 6, 1); if (Math.random() < 0.1) parts.push({ x: m.x, y: m.y, z: 10, vx: 0, vy: 0, vz: -6, t: 0.3, col: '#bfe8ff' }); } });
  }
  for (const zp of G.zaps) list.push({ d: 1e5, f: () => {
    const a = iso(zp.x0, zp.y0), b = iso(zp.x1, zp.y1);
    if (zp.rope) { ctx.strokeStyle = '#8f7a55'; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 7); ctx.lineTo(b.sx, b.sy - 7); ctx.stroke(); return; }
    ctx.strokeStyle = (zp.col === '#ffffff' ? '#b8d0de' : zp.col) || '#b8d0de'; ctx.globalAlpha = Math.min(1, (zp.t || 0.2) / 0.2) * 0.7; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 8);   // v0.88: no hard white bolt
    for (let i = 1; i < 5; i++) { const k = i / 5; ctx.lineTo(a.sx + (b.sx - a.sx) * k + Math.sin(zp.seed + i * 3 + G.time * 60) * 3, a.sy - 8 + (b.sy - a.sy) * k + Math.cos(zp.seed + i * 5) * 3); }
    ctx.lineTo(b.sx, b.sy - 8); ctx.stroke(); ctx.globalAlpha = 1;
  } });
  for (const f of G.arcFx) {
    if (f.kind === 'after') list.push({ d: f.x + f.y, f: () => { drawSpr(SPR[P.cls === 'ossumancer' ? 'ossu' : P.cls === 'hemomancer' ? 'hemo' : 'player'] || SPR.player, f.x, f.y, f.face, false, 0.35 * (f.t / 0.6)); } });
    else if (f.kind === 'mage') list.push({ d: f.x + f.y + 0.1, f: () => { const q = iso(f.x, f.y); ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 16, 8, '180,138,217', f.t / 0.25 * 0.6); ctx.globalCompositeOperation = 'source-over'; } });
  }
  // Tower reversed: the thrust
  for (const th of G.thrusts) list.push({ d: P.x + P.y + 0.1, f: () => { const a = iso(P.x, P.y), b = iso(P.x + th.dx * th.L, P.y + th.dy * th.L), k = th.t / 0.2; ctx.strokeStyle = `rgba(244,239,226,${k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 8); ctx.lineTo(b.sx, b.sy - 8); ctx.stroke(); ctx.lineWidth = 1; } });
  // Rib armor (Cage-Warden reversed)
  if (P.ribArmor > 0) list.push({ d: P.x + P.y + 0.05, f: () => { const q = iso(P.x, P.y); ctx.strokeStyle = '#e8e2d0'; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + G.time; const x = q.sx + Math.cos(a) * 8; ctx.beginPath(); ctx.moveTo(x, q.sy); ctx.quadraticCurveTo(q.sx + Math.cos(a) * 11, q.sy - 12, q.sx, q.sy - 22); ctx.stroke(); } } });
  // hidden Arcana shrines glow violet
  for (const o of z.objects) if (o.type === 'shrine' && o.kind === 'arcana' && !o.used && onScreen(o.x, o.y)) list.push({ d: o.x + o.y + 0.01, f: () => { const q = iso(o.x, o.y); ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 8, 16, '180,138,217', 0.35 + 0.1 * Math.sin(G.time * 3)); ctx.globalCompositeOperation = 'source-over'; } });
  // time stopped
  if (G.timeStop > 0) list.push({ d: 1e6, f: () => { ctx.fillStyle = `rgba(40,30,60,${0.25 * Math.min(1, G.timeStop)})`; ctx.fillRect(0, 0, W, H); } });
}
function arcHudBadge() { return P.arc.pts > 0; }
// The Hollow Giant reversed: you walk inside the golem
function drawSuit(alpha, lift) {
  if (alpha !== 1) ctx.globalAlpha = alpha;
  const r = drawFleshGolem({ face: P.face, hurt: P.hurt, slam: P.swing > 0 ? P.swing * 1.3 : 0, mawOpen: 0.3 }, P.x, P.y - (lift || 0) / 11, 0.7, {});
  ctx.globalAlpha = 1;
  // you, inside it: a mask behind the maw
  ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(r.x + r.w / 2) + P.face * 2, Math.round(r.y + r.h * 0.55), 2, 2);
}
function drawShell(alpha, lift) {
  const s = SPR.golem, k = 0.72, p = iso(P.x, P.y), w = Math.round(s.w * k), h = Math.round(s.h * k), img = P.hurt > 0 && OPT.flash ? (P.face < 0 ? s.flf : s.fl) : (P.face < 0 ? s.f : s.c);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(img, Math.round(p.sx - w / 2), Math.round(p.sy + 3 - h - (lift || 0)), w, h); ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - h * 0.6, 6, '191,232,255', 0.35); ctx.globalCompositeOperation = 'source-over';
}
function arcanaRender2(list) {
  const g = G.golem;
  if (g && g.ramp > 0 && g.state !== 'dormant') list.push({ d: g.x + g.y + 0.3, f: () => { const q = iso(g.x, g.y); ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 14, 30 + Math.sin(G.time * 8) * 4, '230,245,255', 0.35); for (let i = 0; i < 4; i++) { const a = G.time * 2 + i * 1.57; glow(q.sx + Math.cos(a) * 12, q.sy - 16 + Math.sin(a * 1.3) * 6, 8, '255,255,255', 0.3); } ctx.globalCompositeOperation = 'source-over'; } });
  if (P.shell && P.shell.ramp > 0) list.push({ d: P.x + P.y + 0.3, f: () => { const q = iso(P.x, P.y); ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 12, 26 + Math.sin(G.time * 8) * 4, '230,245,255', 0.35); ctx.globalCompositeOperation = 'source-over'; } });
  for (const b of G.gbeams || []) list.push({ d: 1e5, f: () => { const a = iso(b.x0, b.y0), c = iso(b.x1, b.y1); ctx.strokeStyle = `rgba(255,255,255,${b.t / 0.22})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 16); ctx.lineTo(c.sx, c.sy - 8); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = '#bfe8ff'; ctx.stroke(); } });
  // draining tethers, ghost trails, spirit sword arcs
  for (const t of G.dtethers) if (t.ref && !t.ref.dead) list.push({ d: 1e4, f: () => { const a = iso(P.x, P.y), b = iso(t.ref.x, t.ref.y); ctx.strokeStyle = `rgba(191,232,255,${0.5 + 0.3 * Math.sin(G.time * 20)})`; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 10); ctx.quadraticCurveTo((a.sx + b.sx) / 2, Math.min(a.sy, b.sy) - 18 + Math.sin(G.time * 6) * 4, b.sx, b.sy - 8); ctx.stroke(); ctx.fillStyle = '#ffffff'; const k = (G.time * 2) % 1; ctx.fillRect(Math.round(b.sx + (a.sx - b.sx) * k), Math.round(b.sy - 8 + (a.sy - b.sy) * k - Math.sin(k * Math.PI) * 10), 2, 2); } });
  for (const g of G.strails2) list.push({ d: -1e4, f: () => { const a = iso(g.x0, g.y0), b = iso(g.x1, g.y1); ctx.strokeStyle = `rgba(230,244,255,${0.35 * Math.min(1, g.t)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 2); ctx.lineTo(b.sx, b.sy - 2); ctx.stroke(); ctx.lineWidth = 1; } });
  for (const w of G.sswords) list.push({ d: P.x + P.y + 0.2, f: () => { const k = Math.min(1, w.t / w.dur), a0 = Math.atan2(w.dy, w.dx), fade = 1 - Math.max(0, (w.t - w.dur) / 0.1); ctx.strokeStyle = `rgba(230,244,255,${fade})`; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = a0 - 1.05 + 2.1 * k * i / 8, q = iso(P.x + Math.cos(a) * w.R, P.y + Math.sin(a) * w.R); i ? ctx.lineTo(q.sx, q.sy - 8) : ctx.moveTo(q.sx, q.sy - 8); } ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = `rgba(255,255,255,${fade})`; ctx.stroke(); } });
  // possessed enemies glow, the maiden's bars
  for (const m of G.zone.monsters) if (!m.dead && m.possessed > 0 && onScreen(m.x, m.y)) list.push({ d: m.x + m.y + 0.03, f: () => { const q = iso(m.x, m.y); ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 10, 12, '191,232,255', 0.4); ctx.globalCompositeOperation = 'source-over'; } });
  if (P.maiden > 0) list.push({ d: P.x + P.y + 0.05, f: () => { const q = iso(P.x, P.y); ctx.fillStyle = '#8b93a0'; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, x = q.sx + Math.cos(a) * 9, y = q.sy + Math.sin(a) * 4.5; ctx.fillRect(Math.round(x), Math.round(y) - 20, 1, 20); } } });
  // thrown sacs arc through the air
  for (const s of G.sacThrows) list.push({ d: 1e4, f: () => { const k = Math.min(1, s.t / s.dur), x = s.x0 + (s.x1 - s.x0) * k, y = s.y0 + (s.y1 - s.y0) * k, q = iso(x, y), z = Math.sin(k * Math.PI) * 26 + 6; ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy - z) - 3, 7, 6); ctx.fillStyle = '#c9a66b'; ctx.fillRect(Math.round(q.sx) - 2, Math.round(q.sy - z) - 2, 5, 4); ctx.fillStyle = '#8e2630'; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - z) - 1, 1, 2); } });
  // blood sword arcs
  for (const w of G.bswords) list.push({ d: P.x + P.y + 0.2, f: () => { const k = Math.min(1, w.t / w.dur), a0 = Math.atan2(w.dy, w.dx), fade = 1 - Math.max(0, (w.t - w.dur) / 0.1); ctx.strokeStyle = `rgba(184,64,74,${fade})`; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = a0 - 1 + 2 * k * i / 8, q = iso(P.x + Math.cos(a) * w.R, P.y + Math.sin(a) * w.R); i ? ctx.lineTo(q.sx, q.sy - 8) : ctx.moveTo(q.sx, q.sy - 8); } ctx.stroke(); ctx.strokeStyle = `rgba(232,154,160,${fade})`; ctx.lineWidth = 1; ctx.stroke(); } });
  // the Flesh Spawn
  const f = G.fspawn; if (f) list.push({ d: f.x + f.y, f: () => { shadow(f.x, f.y, f.r); const r = drawFleshGolem(f, f.x, f.y, 0.5, {}); ctx.fillStyle = '#0e0d12'; ctx.fillRect(r.x + 2, r.y - 3, r.w - 4, 1); ctx.fillStyle = '#e89aa0'; ctx.fillRect(r.x + 2, r.y - 3, Math.round((r.w - 4) * Math.min(1, f.t / 20)), 1); } });
  // bone shards from Marrow-Kin, soul wisps from the Hungering Aether
  for (const s of G.arcShots) list.push({ d: s.x + s.y + 0.1, f: () => { const q = iso(s.x, s.y), l = Math.hypot(s.vx, s.vy) || 1, dx = (s.vx - s.vy) / l * 3, dy = (s.vx + s.vy) / l * 1.5; ctx.strokeStyle = s.col; ctx.beginPath(); ctx.moveTo(q.sx - dx, q.sy - 7 - dy); ctx.lineTo(q.sx + dx, q.sy - 7 + dy); ctx.stroke(); } });
  for (const w of G.soulw) list.push({ d: w.x + w.y + 0.2, f: () => { const q = iso(w.x, w.y), bob = Math.sin(G.time * 8 + w.x) * 2; ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 12 + bob, 6, '191,232,255', 0.5); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#e8f7ff'; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - 12 + bob), 1, 1); } });
}
