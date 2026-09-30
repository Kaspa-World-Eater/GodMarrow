
// =================================================================== MIASMANCER: sprite, world effects, HUD, icons
Object.assign(PAL, { o: '#b070e0', u: '#3a2248', v: '#6a4a8a', l: '#b8c8d8', c: '#5a4436', k: '#9a8a6a' });
// an elk-skull mask with short antlers, a fur mantle, rot-dark robes and a bone sickle
SPR.mias = sprite([
  '.W.......W..',
  '.WW.....WW..',
  '..WKKKKKW...',
  '...KWWWWK...',
  '...KWKKWK...',
  '...KWooWK...',
  '..KckWWkcK..',
  '.KckkckkckK.',
  'KcKuuuuuuKcK',
  'KkKuovvouKkK',
  '.KKuuvvuuKK.',
  '..KuuooouK..',
  '..KuuuuuuK..',
  '..KuuuuuuK..',
  '..KuuKKuuK..',
  '..KiuK.KuiK.',
  '.KKKK..KKKK.'
]);
SPR.sister = tint(SPR.mias, '#a8c0e0', 0.55);
// the claws: three curved bone blades on each hand, raking forward when you strike
function drawClaws(r, f, sw, venom, alpha) {
  const col = venom ? '#d0a0f0' : '#e6e9ee', dk = '#0e0d12';
  const hand = (hx, hy, fwd, lift) => {
    for (let i = 0; i < 3; i++) {
      const a = (-0.9 + 0.35 * i) + (sw ? 0.9 * fwd : 0), L = 5 + (i === 1 ? 1 : 0);
      const x0 = hx, y0 = hy + i * 0.6 - lift, x1 = hx + f * Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
      ctx.strokeStyle = dk; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  };
  ctx.globalAlpha = alpha;
  hand(r.x + r.w / 2 + f * 5, r.y + 10, 1, 0);
  hand(r.x + r.w / 2 - f * 3, r.y + 11, 0.6, 1);
  ctx.globalAlpha = 1;
}
// Omens: pale skulls that circle you, larger and brighter the more you hold
function drawOmens(cx, cy, n) {
  for (let i = 0; i < n; i++) {
    const a = G.time * 1.8 + i / n * 6.28, x = Math.round(cx + Math.cos(a) * 11), y = Math.round(cy - 20 + Math.sin(a) * 4 + Math.sin(G.time * 4 + i) * 1.5), front = Math.sin(a) > 0;
    ctx.globalCompositeOperation = 'lighter'; glow(x + 2, y + 2, 8, '232,226,208', 0.3 + 0.1 * Math.sin(G.time * 6 + i)); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = front ? 1 : 0.6;
    ctx.fillStyle = '#0e0d12'; ctx.fillRect(x - 1, y - 1, 7, 7);
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x, y, 5, 4); ctx.fillRect(x + 1, y + 4, 3, 1);
    ctx.fillStyle = '#0e0d12'; ctx.fillRect(x + 1, y + 1, 1, 2); ctx.fillRect(x + 3, y + 1, 1, 2); ctx.fillRect(x + 2, y + 4, 1, 1);
    ctx.globalAlpha = 1;
  }
}
function drawMias(alpha, lift) {
  const hide = P.unseenT > 0 ? 0.35 : 1, kick = P.kickT > 0;
  const r = drawSpr(SPR.mias, P.x, P.y, P.face, P.hurt > 0, alpha * hide, lift + (kick ? 3 : 0));
  const f = P.face;
  if (kick) { const lx = r.x + r.w / 2 + f * 3, ly = r.y + r.h - 5; ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(lx + (f > 0 ? 0 : -8)), Math.round(ly), 9, 3); ctx.fillStyle = '#3a2248'; ctx.fillRect(Math.round(lx + (f > 0 ? 1 : -7)), Math.round(ly + 1), 7, 1); }
  if (P.venomT > 0) { ctx.globalCompositeOperation = 'lighter'; glow(r.x + r.w / 2 + f * 6, r.y + r.h - 7, 6, '154,255,106', 0.35 + 0.1 * Math.sin(G.time * 9)); ctx.globalCompositeOperation = 'source-over'; }
  if (P.omens > 0) drawOmens(r.x + r.w / 2 - 2, r.y + 18, P.omens);
}
// the Mirror-Sister: your reflection, turned the wrong way and never quite still
function drawSister(s) {
  const q = iso(s.x, s.y), jit = s.blink > 0 ? rand(-2, 2) : Math.sin(G.time * 13) * 0.6;
  ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 10, 16, '150,180,220', 0.25 + 0.1 * Math.sin(G.time * 7)); ctx.globalCompositeOperation = 'source-over';
  shadow(s.x, s.y, 0.25);
  const img = s.face < 0 ? SPR.sister.f : SPR.sister.c, w = SPR.sister.w, h = SPR.sister.h, rx = Math.round(q.sx - w / 2), ry = Math.round(q.sy + 3 - h);
  // she is drawn in torn horizontal slices that slide against each other
  for (let y = 0; y < h; y += 3) { const off = Math.round(Math.sin(G.time * 9 + y * 0.9) * (y % 2 ? 1 : -1) + jit), hh = Math.min(3, h - y); ctx.globalAlpha = 0.75; ctx.drawImage(img, 0, y, w, hh, rx + off, ry + y, w, hh); }
  ctx.globalAlpha = 0.25; ctx.drawImage(img, rx - 2, ry); ctx.drawImage(img, rx + 2, ry); ctx.globalAlpha = 1;
  drawClaws({ x: rx, y: ry, w, h }, s.face, s.act > 0, false, 0.7);
  if (s.act > 0) s.act -= 0.016;
}
function cloudBlob(x, y, R, col, a, seed) {
  const q = iso(x, y);
  for (let i = 0; i < 5; i++) {
    const t = G.time * 0.6 + seed + i * 1.7, ox = Math.cos(t) * R * 4, oy = Math.sin(t * 1.3) * R * 2;
    ctx.fillStyle = `rgba(${col},${a * (0.6 + 0.4 * Math.sin(t * 2))})`;
    ctx.beginPath(); ctx.ellipse(q.sx + ox, q.sy - 3 + oy, R * 8, R * 4, 0, 0, 6.28); ctx.fill();
  }
}
function miasRender(list) {
  // the cloud around you
  if (isMias() && !P.dead) { const R = MS.auraR(), col = aR('z_grave') ? '130,124,110' : '120,60,170'; list.push({ d: P.x + P.y - 0.8, f: () => { const q = iso(P.x, P.y); ctx.fillStyle = `rgba(${col},${0.08 + 0.1 * MS.frac()})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, 6.28); ctx.fill(); cloudBlob(P.x, P.y, R * 0.5, col, 0.08 + 0.06 * MS.frac(), 0); } }); }
  // clouds of every kind (gear poison lingers for any class)
  for (const c of G.clouds) { if (!onScreen(c.x, c.y)) continue; const a = Math.min(1, c.t / 0.8), col = c.kind === 'haze' ? '164,132,200' : c.kind === 'frost' ? '191,232,255' : '138,74,184'; list.push({ d: c.x + c.y - 0.4, f: () => cloudBlob(c.x, c.y, c.R, col, 0.16 * a, c.seed) }); }
  // mirages and lures
  for (const f of G.mirages) list.push({ d: f.x + f.y - 0.7, f: () => { const q = iso(f.x, f.y); ctx.strokeStyle = `rgba(168,192,224,${0.25 + 0.15 * Math.sin(G.time * 5)})`; for (let i = 0; i < 3; i++) { const R = f.R * (0.5 + 0.25 * i) + Math.sin(G.time * 3 + i) * 0.1; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, 6.28); ctx.stroke(); } } });
  for (const l of G.lures) list.push({ d: l.x + l.y, f: () => { const q = iso(l.x, l.y); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy) - 9, 2, 8); ctx.fillStyle = '#d9a441'; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy) - 11, 6, 3); ctx.strokeStyle = `rgba(217,164,65,${0.4 * (1 - (G.time * 1.5) % 1)})`; const R = ((G.time * 1.5) % 1) * 5; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, 6.28); ctx.stroke(); } });
  // traps, and traps in the air
  for (const t of G.mtraps) list.push({ d: t.x + t.y - 0.3, f: () => {
    const q = iso(t.x, t.y), armed = t.arm <= 0, blink = armed && Math.floor(G.time * 3) % 2 === 0, x = Math.round(q.sx), y = Math.round(q.sy);
    ctx.fillStyle = '#0e0d12'; ctx.fillRect(x - 4, y - 3, 9, 4);
    if (t.kind === 'ntrap') { ctx.fillStyle = '#cfc6ae'; ctx.fillRect(x - 3, y - 2, 7, 2); ctx.fillStyle = '#e8e2d0'; for (let i = -2; i <= 2; i += 2) ctx.fillRect(x + i, y - 5, 1, 3); }
    else if (t.kind === 'mwake') { ctx.fillStyle = '#5a4436'; ctx.fillRect(x - 3, y - 6, 7, 5); ctx.fillStyle = '#8a4ab8'; ctx.fillRect(x - 2, y - 7, 5, 2); ctx.fillStyle = '#e0b8ff'; ctx.fillRect(x, y - 5, 1, 1); if (Math.random() < 0.5) parts.push({ x: t.x + rand(-0.1, 0.1), y: t.y + rand(-0.1, 0.1), z: 8, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: 6, t: 0.8, col: '#8a4ab8' }); }
    else if (t.kind === 'dsentry') { ctx.fillStyle = '#cfc6ae'; ctx.fillRect(x - 1, y - 12, 3, 10); ctx.fillRect(x - 4, y - 14, 2, 4); ctx.fillRect(x + 3, y - 14, 2, 4); ctx.fillRect(x - 5, y - 16, 1, 2); ctx.fillRect(x + 5, y - 16, 1, 2); ctx.fillStyle = '#0e0d12'; ctx.fillRect(x, y - 10, 1, 1); ctx.fillStyle = '#b070e0'; ctx.fillRect(x, y - 8, 1, 1); }
    else { ctx.fillStyle = '#8a4ab8'; ctx.beginPath(); ctx.ellipse(x, y - 3, 4 + Math.sin(G.time * 5) * 0.5, 3, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = '#e0b8ff'; ctx.fillRect(x - 1, y - 5, 2, 1); }
    if (blink) { ctx.fillStyle = '#c8553d'; ctx.fillRect(x, y - 1, 1, 1); }
  } });
  for (const th of G.mthrows) list.push({ d: 1e4, f: () => { const k = Math.min(1, th.t / th.dur), x = th.x0 + (th.x1 - th.x0) * k, y = th.y0 + (th.y1 - th.y0) * k, q = iso(x, y), z = Math.sin(k * Math.PI) * 18 + 6; ctx.fillStyle = '#cfc6ae'; ctx.fillRect(Math.round(q.sx) - 2, Math.round(q.sy - z) - 1, 4, 3); } });
  // rot shurikens, spinning
  for (const sh of G.shuris) list.push({ d: sh.x + sh.y + 0.1, f: () => { const q = iso(sh.x, sh.y), y = q.sy - 8; for (let i = 0; i < 4; i++) { const a = sh.spin + i * Math.PI / 2; ctx.strokeStyle = '#0e0d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.sx, y); ctx.lineTo(q.sx + Math.cos(a) * 4, y + Math.sin(a) * 2); ctx.stroke(); ctx.strokeStyle = i % 2 ? '#e8e2d0' : '#d0a0f0'; ctx.lineWidth = 1; ctx.stroke(); } ctx.fillStyle = '#3a2248'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(y) - 1, 2, 2); } });
  // the hurricane: bands of rot wheeling around you
  if (P.mstormT > 0 && isMias()) list.push({ d: P.x + P.y + 0.3, f: () => { const R = MS.stormR(), fade = Math.min(1, P.mstormT); for (let b = 0; b < 3; b++) { const rr = R * (0.45 + 0.27 * b); ctx.strokeStyle = `rgba(176,112,224,${(0.35 - b * 0.08) * fade})`; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const a = G.time * (4 - b) + b * 2 + i * 0.3, p = iso(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr); i ? ctx.lineTo(p.sx, p.sy - 4 - b * 5 - i * 0.4) : ctx.moveTo(p.sx, p.sy - 4 - b * 5); } ctx.stroke(); } ctx.lineWidth = 1; } });
  // claw slashes
  for (const c of G.clawfx) list.push({ d: c.x + c.y + 0.2, f: () => { const q = iso(c.x, c.y), k = c.t / 0.2, dx = Math.cos(c.a + 1.2), dy = Math.sin(c.a + 1.2) * 0.6; for (let i = -1; i <= 1; i++) { ctx.strokeStyle = `rgba(232,226,208,${k})`; ctx.beginPath(); ctx.moveTo(q.sx - dx * 6 + i * 2, q.sy - 10 - dy * 6 + i); ctx.lineTo(q.sx + dx * 6 + i * 2, q.sy - 10 + dy * 6 + i); ctx.stroke(); } } });
  // the Mirror-Sister
  if (G.sister) { const s = G.sister; list.push({ d: s.x + s.y, f: () => drawSister(s) }); }
  // decoys
  for (const e of G.decoys) list.push({ d: e.x + e.y, f: () => { drawSpr(SPR.mias, e.x, e.y, e.face, false, 0.45 + 0.1 * Math.sin(G.time * 9)); } });
  // poison novas
  for (const n of G.mnovas) list.push({ d: -1e4, f: () => { const q = iso(n.x, n.y); for (let i = 0; i < 2; i++) { ctx.strokeStyle = `rgba(176,112,224,${(0.6 - i * 0.25) * (1 - n.r / n.max * 0.6)})`; ctx.lineWidth = 3 - i; ctx.beginPath(); ctx.ellipse(q.sx, q.sy - 2, (n.r - i * 0.3) * ISO_R, (n.r - i * 0.3) * ISO_RY, 0, 0, 6.28); ctx.stroke(); } ctx.lineWidth = 1; } });
  // rot tides: a moving wall of green slashes
  for (const w of G.rtides) list.push({ d: (w.x || P.x) + (w.y || P.y) + 0.1, f: () => {
    if (w.spin) { const q = iso(P.x, P.y); ctx.strokeStyle = 'rgba(176,112,224,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 10; i++) { const a = w.ang - i * 0.25, p = iso(P.x + Math.cos(a) * w.w, P.y + Math.sin(a) * w.w); i ? ctx.lineTo(p.sx, p.sy - 6) : ctx.moveTo(p.sx, p.sy - 6); } ctx.stroke(); ctx.lineWidth = 1; return; }
    const px = -w.dy, py = w.dx, n = 7;
    for (let i = 0; i < n; i++) { const o = (i / (n - 1) - 0.5) * w.w, q = iso(w.x + px * o, w.y + py * o), h = 10 + Math.sin(G.time * 20 + i) * 3; ctx.fillStyle = 'rgba(138,74,184,0.35)'; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy - h), 6, h); ctx.fillStyle = '#e0b8ff'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy - h), 2, 1); }
  } });
  // the thrown scythe, the reap sweep
  for (const s of G.rscythes) list.push({ d: s.x + s.y + 0.1, f: () => { const q = iso(s.x, s.y); ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.sx, q.sy - 9, 6, s.spin, s.spin + 2.4); ctx.stroke(); ctx.lineWidth = 1; } });
  if (G.reapFx && G.reapFx.t > 0) { G.reapFx.t -= 0.016; const R = G.reapFx.R, k = 1 - G.reapFx.t / 0.3; list.push({ d: P.x + P.y + 0.2, f: () => { ctx.strokeStyle = `rgba(232,226,208,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 16; i++) { const a = k * 6.28 - i * 0.3, p = iso(P.x + Math.cos(a) * R, P.y + Math.sin(a) * R); i ? ctx.lineTo(p.sx, p.sy - 7) : ctx.moveTo(p.sx, p.sy - 7); } ctx.stroke(); ctx.lineWidth = 1; } }); }
  // confused, terrified and marked enemies
  for (const m of G.zone.monsters) {
    if (m.dead || !onScreen(m.x, m.y)) continue;
    if (m.confused > 0) list.push({ d: m.x + m.y + 0.05, f: () => { const q = iso(m.x, m.y); for (let i = 0; i < 3; i++) { const a = G.time * 5 + i * 2.1; ctx.fillStyle = '#a8c0e0'; ctx.fillRect(Math.round(q.sx + Math.cos(a) * 5), Math.round(q.sy - 22 + Math.sin(a) * 2), 2, 2); } } });
    if (m.feared > 0) list.push({ d: m.x + m.y + 0.05, f: () => { const q = iso(m.x, m.y); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy) - 25, 2, 4); ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy) - 20, 2, 1); } });
    if (m.contagion > 0) list.push({ d: m.x + m.y + 0.05, f: () => { const q = iso(m.x, m.y); ctx.strokeStyle = '#b070e0'; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, 8, 4, 0, 0, 6.28); ctx.stroke(); } });
  }
}
// HUD: the Miasma gauge and Omens in the bar
function drawMiasRow() {
  const x0 = 68, y0 = HUD_Y + 12;
  // Omens: skulls in the bar (the Miasma itself is the orb)
  for (let i = 0; i < MS.omenMax(); i++) { const x = x0 + i * 9, on = i < P.omens; ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y0 - 1, 7, 7); ctx.fillStyle = on ? '#e8e2d0' : '#2a2833'; ctx.fillRect(x, y0, 5, 3); ctx.fillRect(x + 1, y0 + 3, 3, 2); if (on) { ctx.fillStyle = '#0a090d'; ctx.fillRect(x + 1, y0 + 1, 1, 1); ctx.fillRect(x + 3, y0 + 1, 1, 1); } }
  txt(`${P.omens}/${MS.omenMax()} omens`, 68, HUD_Y + 26, '#a39d8c'); txt(`Lv ${P.level}`, 68 + tw(`${P.omens}/${MS.omenMax()} omens`) + 8, HUD_Y + 26, '#d9a441');
  if (inRect(mouse, 66, HUD_Y + 10, 140, 9)) tooltip = [['Miasma', '#b070e0'], [`${Math.ceil(P.mana)} / ${D.maxMana} · cloud ${MS.auraR().toFixed(1)} yd`, '#a39d8c'], [`Sickens ${Math.round(MS.auraDps())}/s · ${Math.round(MS.evade() * 100)}% of blows miss you`, '#a39d8c'], ['Miasma skills breathe it out and thin it.', '#a39d8c'], [`Omens ${P.omens}/${MS.omenMax()}: strikes build them, finishers spend them`, '#e8e2d0'], ['Each Omen: +6% damage, +5% attack and cast speed', '#e8e2d0'], ['Standing in miasma thickens yours fast; the sickened leak it.', '#8a4ab8']];
}
function miasHudText() {
  let y = 22;
  if (P.omens > 0) { txt(`OMENS ${P.omens} · +${6 * P.omens}% damage, +${5 * P.omens}% speed · ${aR('z_death') ? 'held' : Math.ceil(P.omenT) + 's'}`, 8, y, '#e8e2d0'); y += 10; }
  if (P.mstormT > 0) { txt(`MIASMA HURRICANE ${Math.ceil(P.mstormT)}s`, 8, y, '#b070e0'); y += 10; }
  if (P.venomT > 0) { txt(`VENOM CLAWS ${Math.ceil(P.venomT)}s`, 8, y, '#b070e0'); y += 10; }
  if (P.inMiasma) { txt('IN MIASMA · thickening fast', 8, y, '#8a4ab8'); y += 10; }
  if (!clawOn()) { txt('No claws: martial skills are weaker', 8, y, '#6f6a79'); y += 10; }
  if (P.wornTraps.length) { txt(`WORN TRAPS ${P.wornTraps.length}`, 8, y, '#c9a66b'); y += 10; }
  if (P.hazeMantle > 0) { txt(`HAZE MANTLE ${Math.ceil(P.hazeMantle)}s`, 8, y, '#a8c0e0'); y += 10; }
  if (P.skills.lbreath > 0) { txt(P.breathCd > 0 ? `Last Breath in ${Math.ceil(P.breathCd)}s` : 'Last Breath ready', 8, y, P.breathCd > 0 ? '#6f6a79' : '#e8e2d0'); y += 10; }
  const traps = G.mtraps.length; if (traps) { txt(`Traps ${traps}/${MS.trapMax()}`, 8, y, '#c9a66b'); y += 10; }
}
// skill icons
function miasIcon(id, x, y) {
  const f = (col, a, b, w, h) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); };
  const G1 = '#b070e0', G2 = '#3a2248', W = '#e8e2d0', V = '#7f9cc0', I = '#bfe8ff', K = '#0e0d12', R = '#8e2630';
  const skull = (a, b) => { f(W, a, b, 5, 4); f(K, a + 1, b + 1, 1, 1); f(K, a + 3, b + 1, 1, 1); f(W, a + 1, b + 4, 3, 1); };
  switch (id) {
    case 'mcloud': for (let i = 0; i < 4; i++) f(i % 2 ? G1 : G2, 2 + i * 3, 6 + (i % 2) * 3, 6, 5); f(W, 7, 3, 4, 3); break;
    case 'thickair': case 'cbloom': case 'shroud': f(G1, 4, 4, 10, 10); f(K, 7, 7, 4, 4); break;
    case 'vblade': f('#3a2248', 3, 12, 5, 4); for (let k = 0; k < 3; k++) for (let i = 0; i < 8; i++) f(i > 4 ? G1 : W, 5 + i + k, (11 - i + k * 1.5) | 0, 1, 1); break;
    case 'fang': for (const o of [-3, 0, 3]) { for (let i = 0; i < 7; i++) f(W, 5 + i, 9 + o * (i / 7) - 0, 1, 1); f(G1, 12, 9 + o, 2, 1); } break;
    case 'pnova': ctx.strokeStyle = G1; ctx.beginPath(); ctx.arc(x + 9, y + 9, 6, 0, 6.28); ctx.stroke(); ctx.strokeStyle = G2; ctx.beginPath(); ctx.arc(x + 9, y + 9, 3, 0, 6.28); ctx.stroke(); break;
    case 'contagion': f(G1, 7, 7, 4, 4); f(G2, 2, 3, 3, 3); f(G2, 13, 4, 3, 3); f(G2, 8, 14, 3, 3); f(G1, 5, 5, 2, 1); f(G1, 11, 6, 2, 1); f(G1, 9, 11, 1, 3); break;
    case 'rotwall': for (let i = 0; i < 5; i++) f(i % 2 ? G1 : G2, 3 + i * 3, 4, 2, 11); f(W, 14, 8, 2, 2); break;
    case 'exhale': skull(3, 6); for (let i = 0; i < 3; i++) f(G1, 9 + i * 2, 7 + i, 2, 2 + i); break;
    case 'inhale': for (let i = 0; i < 3; i++) f(G1, 12 - i * 3, 5 + i * 3, 2, 2); skull(3, 9); break;
    case 'deepdraw': case 'sickbreath': f(G1, 5, 5, 8, 8); f(W, 8, 8, 2, 2); break;
    case 'toxic': f(W, 7, 3, 4, 3); f(G1, 5, 6, 8, 9); f(G2, 6, 10, 6, 4); break;
    case 'blur': f(V, 3, 4, 4, 11); f(W, 11, 4, 4, 11); f(K, 12, 6, 1, 1); f(K, 14, 6, 1, 1); break;
    case 'ntrap': f('#cfc6ae', 3, 11, 12, 3); for (let i = 0; i < 5; i++) f(W, 4 + i * 2, 5 + (i % 2) * 2, 1, 6); break;
    case 'haze': for (let i = 0; i < 3; i++) f(V, 3 + i * 4, 5 + (i % 2) * 3, 5, 5); f('#dde8ff', 8, 3, 2, 2); f('#dde8ff', 12, 12, 2, 2); break;
    case 'mwake': f('#5a4436', 5, 9, 8, 6); f(G1, 6, 7, 6, 2); for (let i = 0; i < 3; i++) f(i % 2 ? G1 : G2, 3 + i * 4, 2 + (i % 2) * 2, 4, 4); break;
    case 'dsentry': f('#cfc6ae', 8, 5, 3, 11); f('#cfc6ae', 4, 2, 2, 5); f('#cfc6ae', 13, 2, 2, 5); f(K, 9, 7, 1, 1); f(G1, 2, 13, 4, 3); f(G1, 13, 13, 4, 3); break;
    case 'shuriken': for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; ctx.strokeStyle = i % 2 ? W : G1; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 9, y + 9); ctx.lineTo(x + 9 + Math.cos(a) * 7, y + 9 + Math.sin(a) * 7); ctx.stroke(); } ctx.lineWidth = 1; f(G2, 8, 8, 2, 2); break;
    case 'mstorm': ctx.strokeStyle = G1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + 9, y + 12 - i * 4, 7 - i * 1.5, 2.5, 0, 0.3, 5.8); ctx.stroke(); } f(W, 8, 1, 2, 2); break;
    case 'warp': f(V, 3, 3, 12, 12); f(G1, 5, 5, 8, 8); f('#dde8ff', 8, 3, 1, 12); f('#dde8ff', 3, 8, 12, 1); break;
    case 'sister': f(V, 2, 4, 5, 11); f('#dde8ff', 3, 5, 3, 3); f(W, 11, 4, 5, 11); f(K, 12, 6, 1, 1); f(K, 14, 6, 1, 1); f('#dde8ff', 8, 2, 1, 14); break;
    case 'talon': f('#3a2248', 3, 10, 9, 3); f(K, 11, 10, 4, 3); for (let i = 0; i < 3; i++) f(W, 12 + i, 4 + i * 2, 3, 1); break;
    case 'flurry': for (let i = 0; i < 3; i++) for (let j = 0; j < 8; j++) f(i === 1 ? W : '#cfc6ae', 3 + j + i * 3, 3 + j, 1, 1); break;
    case 'dflight': f(V, 2, 8, 4, 6); f('#4a4556', 7, 6, 3, 6); f(W, 11, 4, 4, 4); f('#3a2248', 12, 9, 5, 2); break;
    case 'rsnare_old': f(I, 3, 11, 12, 2); f('#8b93a0', 3, 6, 1, 5); f('#8b93a0', 14, 6, 1, 5); for (let i = 0; i < 4; i++) f(I, 5 + i * 2, 7 + (i % 2), 1, 4); break;
    case 'mirage': ctx.strokeStyle = V; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(x + 9, y + 9, i * 2.5, i * 1.5, 0, 0, 6.28); ctx.stroke(); } break;
    case 'bmine': f(G1, 4, 5, 10, 9); f(G2, 6, 7, 6, 5); f('#e0b8ff', 7, 5, 2, 2); break;
    case 'lure': f(W, 8, 3, 2, 12); f('#d9a441', 5, 3, 8, 3); ctx.strokeStyle = '#d9a441'; ctx.beginPath(); ctx.arc(x + 9, y + 9, 7, 0, 6.28); ctx.stroke(); break;
    case 'trapm': f('#cfc6ae', 2, 12, 14, 3); f(G1, 5, 7, 3, 4); f(I, 10, 7, 3, 4); break;
    case 'unseen': f(V, 4, 4, 10, 10); f(K, 6, 7, 2, 1); f(K, 10, 7, 2, 1); break;
    case 'gstrike': skull(6, 3); for (let i = 0; i < 8; i++) f('#cfc6ae', 3 + i, 15 - i, 2, 1); break;
    case 'soulrend': f(R, 5, 5, 8, 8); skull(6, 6); break;
    case 'dstep': for (let i = 0; i < 4; i++) f(i === 3 ? W : '#4a4556', 2 + i * 4, 6, 3, 8); break;
    case 'reap': ctx.strokeStyle = W; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 9, y + 9, 6, 0.3, 5); ctx.stroke(); ctx.lineWidth = 1; f('#5a4330', 8, 8, 2, 8); break;
    case 'execute': skull(6, 7); f(W, 3, 3, 12, 2); f('#5a4330', 8, 1, 2, 3); break;
    case 'dhead': skull(6, 5); f('#d9a441', 4, 3, 10, 1); break;
    case 'knell': f('#d9a441', 5, 4, 8, 8); f('#8f7a55', 4, 12, 10, 2); f(K, 8, 14, 2, 2); break;
    case 'lbreath': skull(6, 4); f('#bfe8ff', 5, 11, 8, 1); f('#bfe8ff', 7, 13, 4, 1); break;
    case 'deathm': skull(6, 3); f(W, 4, 10, 10, 1); f(W, 8, 8, 2, 8); break;
    case 'vflick': case 'vdeep': case 'fan5': case 'fpierce': case 'novacloud': case 'twinnova': case 'epidemic': case 'wwide': case 'wtrail': case 'gasp': f(G1, 5, 5, 8, 8); f(W, 8, 8, 2, 2); break;
    case 'rotdouble': case 'smear': case 'hazelong': case 'madness': f(V, 5, 5, 8, 8); f(W, 8, 8, 2, 2); break;
    default: return false;
  }
  return true;
}
