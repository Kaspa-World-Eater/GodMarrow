
// =================================================================== errors
function reportError(e) {
  const m = (e && (e.message || e.toString())) || 'unknown error';
  if (G.error !== m) { G.error = m; console.error(e); }
}

// =================================================================== drawing helpers
const FONT = '8px Silkscreen, monospace';
const TITLE_FONT = '16px "IM Fell English SC", Georgia, serif';
function txt(s, x, y, col = '#e8e2d0', align = 'left', shadow = true) {
  ctx.font = FONT; ctx.textAlign = align;
  if (shadow) { ctx.fillStyle = '#0a090d'; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function tw(s) { ctx.font = FONT; return ctx.measureText(s).width; }
function glow(sx, sy, r, rgb, a) {
  if (!isFinite(sx) || !isFinite(sy) || !(r > 0)) return;   // v0.36: a bad point skips the glow instead of stopping the frame
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
}
function drawBlock(x, y, h, top, left, right) {
  const a = iso(x, y), sx = Math.round(a.sx), sy = Math.round(a.sy);
  ctx.fillStyle = top;
  ctx.beginPath(); ctx.moveTo(sx, sy - h); ctx.lineTo(sx + 8, sy + 4 - h); ctx.lineTo(sx, sy + 8 - h); ctx.lineTo(sx - 8, sy + 4 - h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = left;
  ctx.beginPath(); ctx.moveTo(sx - 8, sy + 4 - h); ctx.lineTo(sx, sy + 8 - h); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx - 8, sy + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = right;
  ctx.beginPath(); ctx.moveTo(sx + 8, sy + 4 - h); ctx.lineTo(sx, sy + 8 - h); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx + 8, sy + 4); ctx.closePath(); ctx.fill();
}
const TINTS = {};
function monSprite(m) {
  let base = SPR[m.b.spr];
  if (m.b.tint) base = TINTS[m.type] || (TINTS[m.type] = tint(base, m.b.tint, 0.4));
  if (m.rank !== 'champion' && m.rank !== 'unique') return base;
  const k = m.type + m.rank;
  return TINTS[k] || (TINTS[k] = tint(base, m.rank === 'champion' ? '#5b6cff' : '#d9a441', 0.35));
}
// v0.16: the player's sprite walks: the legs step in turn and the body bobs; standing still, it breathes
function stepDraw(img, X, Y, w, h, k) {
  const mv = P._sx == null ? 0 : Math.hypot(P.x - P._sx, P.y - P._sy); P._sx = P.x; P._sy = P.y; P._wd = (P._wd || 0) + mv;
  const walking = mv > 0.004 && P.roll <= 0, ph = walking ? Math.floor(P._wd * 4.5) % 4 : -1;
  const bob = walking ? (ph % 2 ? -1 : 0) : (Math.sin(G.time * 2.2) > 0.6 ? -1 : 0);
  const lh = Math.min(h, 4), sh = h - lh, hw = Math.floor(w / 2), K = k || 1;
  ctx.drawImage(img, 0, 0, w, sh, X, Y + bob * K, w * K, sh * K);
  ctx.drawImage(img, 0, sh, hw, lh, X, Y + sh * K - (ph === 1 ? K : 0), hw * K, lh * K);
  ctx.drawImage(img, hw, sh, w - hw, lh, X + hw * K, Y + sh * K - (ph === 3 ? K : 0), (w - hw) * K, lh * K);
}
function drawSpr(s, x, y, face, flash, alpha = 1, lift = 0) {
  const p = iso(x, y);
  const img = (flash && OPT.flash) ? (face < 0 ? s.flf : s.fl) : (face < 0 ? s.f : s.c);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if ((s === SPR.golem || s === SPR.golemDormant) && G.golem) return drawGiant('igolem', SPR.golem, G.golem, x, y, face, flash, alpha, 1, lift);
  if (x === P.x && y === P.y && s === HERO_SPR()[P.cls]) { const r = drawHero(s, x, y, face, flash, alpha, lift, 1); ctx.globalAlpha = 1; return r; }
  ctx.drawImage(img, Math.round(p.sx - s.w / 2), Math.round(p.sy + 3 - s.h - lift));
  ctx.globalAlpha = 1;
  return { x: Math.round(p.sx - s.w / 2), y: Math.round(p.sy + 3 - s.h - lift), w: s.w, h: s.h };
}
function shadow(x, y, r) {
  const p = iso(x, y); ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath(); ctx.ellipse(p.sx, p.sy + 2, r * ISO_R, r * ISO_RY, 0, 0, Math.PI * 2); ctx.fill();
}

// golem weapon: drawn by hand so it can swing (sword, axe or morning star)
function drawGolemWeapon(g, p, dorm) {
  const f = g.face, hx = p.sx + f * 10, hy = p.sy - 6;
  let ang = -1.0, k = -1;
  if (dorm) ang = 1.3;
  else if (g.atk) { k = g.atk.t / g.atk.dur; ang = k < 0.5 ? -1.0 - 1.3 * (k / 0.5) : k < 0.65 ? -2.3 + 3.1 * ((k - 0.5) / 0.15) : 0.8 - 1.8 * ((k - 0.65) / 0.35); }
  else if (g.state === 'charge' || g.state === 'chargeWind') ang = -0.35;
  const dx = Math.cos(ang) * f, dy = Math.sin(ang), nx = -dy * f, ny = dx * f;
  const dot = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const line = (t0, t1, c, off = 0) => { for (let t = t0; t <= t1; t += 0.5) dot(hx + dx * t + nx * off, hy + dy * t + ny * off, c); };
  const L = P.gweapon === 'flail' ? 12 : 14;
  if (k > 0.5 && k < 0.85) {
    ctx.strokeStyle = `rgba(216,226,240,${0.55 * (1 - (k - 0.5) / 0.35)})`; ctx.lineWidth = 2;
    ctx.beginPath();
    if (f > 0) ctx.arc(hx, hy, L - 1, -2.3, ang); else ctx.arc(hx, hy, L - 1, Math.PI + 2.3, Math.PI - ang, true);
    ctx.stroke(); ctx.lineWidth = 1;
  }
  if (dorm) ctx.globalAlpha = 0.55;
  if (P.gweapon === 'axe') {
    line(-3, 14, '#5a4330');
    for (let t = 10; t <= 14; t += 0.5) { const w = (t < 10.6 || t > 13.4) ? 3 : 5; for (let o = 1; o <= w; o += 0.5) dot(hx + dx * t + nx * o, hy + dy * t + ny * o, o >= w - 0.5 ? '#e8eef5' : '#8b93a0'); }
  } else if (P.gweapon === 'flail') {
    line(-2, 5, '#5a4330');
    const ex = hx + dx * 5, ey = hy + dy * 5;
    const a2 = g.atk && k > 0.4 ? ang - 0.6 : 1.45, bx = ex + Math.cos(a2) * f * 7, by = ey + Math.sin(a2) * 7;
    for (let t = 0; t <= 1; t += 0.2) dot(ex + (bx - ex) * t, ey + (by - ey) * t, '#8f8a7c');
    ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 5, 5);
    ctx.fillStyle = '#5d6470'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 3, 3);
    ctx.fillStyle = '#cfd6e0'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 1, 1);
    [[0, -3], [3, 0], [0, 3], [-3, 0]].forEach(([a, b]) => dot(bx + a, by + b, '#9aa3b0'));
  } else {
    line(-2, 0, '#5a4330'); dot(hx - dx * 2.5, hy - dy * 2.5, '#d9a441');
    for (let o = -2.5; o <= 2.5; o += 0.5) dot(hx + dx + nx * o, hy + dy + ny * o, '#8f8a7c');
    line(1.5, 14, '#aab4c2'); line(2, 13, '#e8eef5', 0.8); dot(hx + dx * 14.5, hy + dy * 14.5, '#e8eef5');
  }
  ctx.globalAlpha = 1;
}

function drawPillar(pl) {
  const p = iso(pl.x, pl.y), k = pl.rise > 0 ? 1 - pl.rise / 0.22 : 1, h = Math.round(20 * k), sx = Math.round(p.sx), sy = Math.round(p.sy);
  if (pl.life < 1.5 && pl.rise <= 0 && Math.floor(G.time * 8) % 2) return;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (pl.bone) { ctx.fillStyle = '#0e0d12'; ctx.fillRect(sx - 4, sy - h - 3, 8, h + 3); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(sx - 3, sy - h, 3, h); ctx.fillStyle = '#b8ae94'; ctx.fillRect(sx, sy - h, 3, h); ctx.fillStyle = '#f4efe2'; ctx.fillRect(sx - 2, sy - h - 2, 4, 2); ctx.fillStyle = '#8f8a7c'; for (let y = sy - h + 3; y < sy - 1; y += 4) ctx.fillRect(sx - 3, y, 6, 1); return; }
  ctx.fillStyle = '#3b3f47'; ctx.fillRect(sx - 4, sy - h, 4, h); ctx.fillStyle = '#2c3038'; ctx.fillRect(sx, sy - h, 4, h);
  ctx.fillStyle = '#8b93a0'; ctx.fillRect(sx - 4, sy - h - 2, 8, 2); ctx.fillStyle = '#cfd6e0'; ctx.fillRect(sx - 3, sy - h - 2, 3, 1);
  ctx.fillStyle = '#5d6470'; for (let y = sy - h + 4; y < sy - 1; y += 6) { ctx.fillRect(sx - 3, y, 1, 1); ctx.fillRect(sx + 2, y, 1, 1); }
  if (pl.rise > 0) { ctx.fillStyle = '#8f8a7c'; for (let i = 0; i < 4; i++) ctx.fillRect(sx - 6 + i * 4, sy - 1 - (i % 2), 2, 1); }
}
const ECHO_SPR = {};
function echoSprite(e) { return ECHO_SPR[e.type] || (ECHO_SPR[e.type] = tint(SPR[e.b.spr], '#e8f4ff', 0.75)); }

const dark = mkCanvas(VW, VH), dctx = dark.getContext('2d');
function lightHole(sx, sy, r, a = 1) { addLight(sx, sy, Math.min(r, 90) * 0.7, LCOL, a * 0.3); }

// =================================================================== world render
function visibleRange(margin) {
  const c = [screenToWorld(0, 0), screenToWorld(W, 0), screenToWorld(0, H), screenToWorld(W, H)];
  const z = G.zone;
  return {
    x0: Math.max(0, Math.floor(Math.min(...c.map(p => p.x))) - margin), x1: Math.min(z.w - 1, Math.ceil(Math.max(...c.map(p => p.x))) + margin),
    y0: Math.max(0, Math.floor(Math.min(...c.map(p => p.y))) - margin), y1: Math.min(z.h - 1, Math.ceil(Math.max(...c.map(p => p.y))) + margin)
  };
}
function onScreen(x, y, pad = 30) { const p = iso(x, y); return p.sx > -pad && p.sx < VW + pad && p.sy > -pad - 20 && p.sy < VH + pad; }

function renderWorld(list) {
  const z = G.zone, v = visibleRange(3);
  // v0.23: the ground comes from world-painted chunks (zt_env32.js); single tiles only fill in while a chunk paints
  const painted = ztDrawGround(z, v);
  for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
    const t = z.t[y * z.w + x];
    const a = iso(x, y);
    if (a.sx < -30 || a.sx > W + 30 || a.sy < -140 || a.sy > H + 12) continue;
    if (!painted(x, y)) { const tile = floorTileFor(z, x, y, t); if (tile) ctx.drawImage(tile, Math.round(a.sx) - TW / 2, Math.round(a.sy)); }
    if (t === T.WATER) drawWaterGlints(x, y, a); else if (t === T.SHALLOW) drawShallowGlints(x, y, a);
    if (!TALL[t]) continue;
    const depth = x + y + 1;
    if (t === T.TREE) list.push({ d: depth, f: () => drawTree16(x, y, z) });
    else if (t === T.ROCK) list.push({ d: depth, f: () => drawWall16(x, y, t, z) });
    else if (t === T.CLIFF || t === T.WALL || t === T.PALISADE || t === T.PILLAR || t === T.RUIN) {
      let edge = t === T.PILLAR || t === T.RUIN;
      if (!edge) for (let j = -1; j <= 1 && !edge; j++) for (let i = -1; i <= 1; i++) if (SOLID[z.get(x + i, y + j)] === 0 || z.get(x + i, y + j) === T.FOG) { edge = true; break; }
      if (!edge) continue;
      const sh = hash(x * 3, y * 7) * 8 | 0;
      list.push({ d: depth, f: () => drawWall16(x, y, t, z, sh) });
    } else if (t === T.FOG) list.push({ d: depth + .1, f: () => {
      const p = iso(x, y);
      for (let i = 0; i < 8; i++) { const tt = G.time * 0.8 + i * 1.3 + x + y; ctx.fillStyle = `rgba(232,240,245,${0.12 + 0.06 * Math.sin(tt)})`; ctx.fillRect(Math.round(p.sx - 11 + i * 3 + Math.sin(tt) * 2), Math.round(p.sy - 30 + (i % 3) * 7), 3, 34); }
    } });
  }
}

// v0.23: the world pass runs zoomed out: W/H and the mouse are the world view's while it draws
function render() {
  const W0 = W, H0 = H, mx = mouse.x, my = mouse.y;
  ctx.fillStyle = '#08070b'; ctx.fillRect(0, 0, W, H);
  W = VW; H = VH; mouse.x = mx / ZK; mouse.y = my / ZK; G._inWorld = true;
  ctx.save(); ctx.setTransform(RS * ZK, 0, 0, RS * ZK, 0, 0);
  try { renderWorldPass(); } finally { ctx.restore(); W = W0; H = H0; mouse.x = mx; mouse.y = my; G._inWorld = false; }
}
function renderWorldPass() {
  const z = G.zone;
  ctx.fillStyle = '#08070b'; ctx.fillRect(0, 0, W, H);
  if (!z) return;
  // v0.59 (user: "a tiny screen shake when they walk"): the camera eased 20% a frame and was then rounded, so while walking
  // the world stepped by uneven whole pixels (1, 2, 1, 1, 2...) and the hero wobbled against it. Now it locks onto the
  // hero once it is close, and only eases in after a jump (a teleport, a zone change).
  const t = camTarget(), cdx = t.x - cam.x, cdy = t.y - cam.y;
  if (Math.hypot(cdx, cdy) < 24) { cam.x = t.x; cam.y = t.y; } else { cam.x += cdx * 0.2; cam.y += cdy * 0.2; }
  const shk = OPT.shake ? G.shake : 0, shx = shk ? (Math.random() - .5) * shk : 0, shy = shk ? (Math.random() - .5) * shk : 0;
  const cx0 = cam.x, cy0 = cam.y; cam.x = Math.round(cam.x + shx); cam.y = Math.round(cam.y + shy);

  const list = [];
  renderWorld(list);
  propsToList(list);
  corpsesToList(list);
  drawSplats();
  drawScars();
  drawMissiles(list);

  // ground layer: remnant, items, telegraphs
  if (P.remnant && P.remnant.zone === z.id) {
    const p = iso(P.remnant.x, P.remnant.y);
    if (window.__emberDraw) window.__emberDraw(p); else { ctx.fillStyle = '#6e1f25'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, 6, 3, 0, 0, Math.PI * 2); ctx.fill(); glow(p.sx, p.sy - 6 - Math.sin(G.time * 3) * 2, 8, '217,164,65', 0.8); }
  }
  const hoverCands = []; G.golemRect = null;
  for (const g of z.items) {
    if (!onScreen(g.x, g.y)) continue;
    const p = iso(g.x, g.y), bounce = g.t > 0 ? Math.sin(g.t / 0.4 * Math.PI) * 5 : 0;
    if (g.gold) { ctx.fillStyle = '#d9a441'; ctx.fillRect(Math.round(p.sx) - 2, Math.round(p.sy - 2 - bounce), 4, 2); ctx.fillStyle = '#ffe3a0'; ctx.fillRect(Math.round(p.sx) - 1, Math.round(p.sy - 3 - bounce), 2, 1); }
    else {
      const it = g.item, ic = getIcon(it.potion || BASES[it.base].icon, it.w, it.h), w = it.w * 6, h = it.h * 6;
      ctx.drawImage(ic, Math.round(p.sx - w / 2), Math.round(p.sy - h + 2 - bounce), w, h);
      if (it.q === 'unique' || it.q === 'rare') glow(p.sx, p.sy - 3, 6, it.q === 'unique' ? '201,164,90' : '241,224,90', 0.25);
    }
    hoverCands.push({ kind: 'item', ref: g, rect: { x: p.sx - 6, y: p.sy - 10, w: 12, h: 12 }, d: g.x + g.y - 5 });
  }
  for (const m of z.monsters) {
    if (m.dead || !onScreen(m.x, m.y, 60)) continue;
    if (m.state === 'slamWind' && m.target) {
      const p = iso(m.target.x, m.target.y), k = Math.min(1, m.t / 0.9);
      ctx.strokeStyle = `rgba(216,243,255,${0.3 + 0.5 * k})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.sx, p.sy, 2.1 * ISO_R, 2.1 * ISO_RY, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(216,243,255,${0.08 + 0.15 * k})`; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, 2.1 * ISO_R * k, 2.1 * ISO_RY * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    // v0.55: no telegraph lines or rings on enemy wind-ups (the user: learn the behaviours the hard way)
    // v0.55: no telegraph lines or rings on enemy wind-ups (the user: learn the behaviours the hard way)
  }

  // objects
  for (const o of z.objects) {
    if (o.type === 'altar' || o.type === 'statue') continue;
    if (!onScreen(o.x, o.y, 40)) continue;
    list.push({ d: o.x + o.y, f: () => {
      let s = ztObjSprite(o);   // v0.23: 32-bit objects (zt_env32.js)
      if (s) { /* painted */ } else if (o.type === 'lantern') s = SPR.lantern; else if (o.type === 'vendor') s = SPR.vendor; else if (o.type === 'chest') s = o.open ? SPR.chestOpen : SPR.chest;
      else if (o.type === 'shrine') s = o.used ? SPR.shrineUsed : SPR.shrine; else s = SPR[o.spr];
      shadow(o.x, o.y, 0.35);
      const r = drawSpr(s, o.x, o.y, 1, false);
      if (o.type === 'lantern') { const p = iso(o.x, o.y); ctx.globalCompositeOperation = 'lighter'; glow(p.sx + 15, p.sy - 61, 24, '217,190,120', 0.4 + 0.05 * Math.sin(G.time * 5)); ctx.globalCompositeOperation = 'source-over'; }
      else if (o.type === 'shrine' && !o.used) { const p = iso(o.x, o.y); ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 37, 18, '170,215,255', 0.3 + 0.08 * Math.sin(G.time * 3)); ctx.globalCompositeOperation = 'source-over'; }
      if (!(o.type === 'chest' && o.open) && !(o.type === 'shrine' && o.used)) hoverCands.push({ kind: 'obj', ref: o, rect: { x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 }, d: o.x + o.y });
    } });
  }
  // monsters
  for (const m of z.monsters) {
    if (m.dead || m.hidden || !onScreen(m.x, m.y, 40)) continue;
    list.push({ d: m.x + m.y, f: () => {
      shadow(m.x, m.y, m.r * (m.fly ? 0.7 : 1));
      const lz = m.fly ? Math.round(m.z || 0) : 0; if (lz) ctx.translate(0, -lz);
      const tele = false; // v0.17: no strobing on wind-ups; the painted wind-up pose telegraphs the blow
      // distant enemies melt into the gloom unless something lights them
      const va = monVisibility(m) * (m.rise > 0 ? 1 - m.rise / 1.2 : 1) * (m.b.ai === 'herald' && m.b.god === 'breath' ? 0.35 + 0.65 * lightLevel(m.x, m.y) : 1);
      const r = drawMon16(m, m.hurt > 0 || tele, va) || drawSpr(monSprite(m), m.x, m.y, m.face, m.hurt > 0 || tele, va);
      if (m.marked > 0) { const cx = r.x + r.w / 2, cy = r.y - 4; ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.3 * Math.sin(G.time * 6)})`; ctx.beginPath(); ctx.moveTo(cx, cy - 3); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx, cy + 3); ctx.lineTo(cx - 3, cy); ctx.closePath(); ctx.stroke(); }
      if (m.taunt > 0) { ctx.fillStyle = '#c8553d'; ctx.fillRect(Math.round(r.x + r.w / 2) - 1, r.y - 9, 2, 3); ctx.fillRect(Math.round(r.x + r.w / 2) - 1, r.y - 5, 2, 1); }
      if (lz) ctx.translate(0, lz);
      hoverCands.push({ kind: 'mon', ref: m, rect: { x: r.x - 2, y: r.y - 2 - lz, w: r.w + 4, h: r.h + 4 }, d: m.x + m.y + 10 });
    } });
  }
  // player
  if (!P.dead) list.push({ d: P.x + P.y, f: () => {
    shadow(P.x, P.y, P.r);
    const alpha = P.wraith ? 0.45 + 0.1 * Math.sin(G.time * 10) : (P.iframe > 0 ? 0.6 : 1);
    const lift = (P.roll > 0 ? Math.sin((0.34 - P.roll) / 0.34 * Math.PI) * 3 : 0) + (P.leapZ || 0);
    const mk = P.mawSink || 0; if (mk > 0) { const q = iso(P.x, P.y); ctx.save(); ctx.beginPath(); ctx.rect(q.sx - 60, q.sy - 160, 120, 162); ctx.clip(); ctx.translate(0, mk); }   // v95: sinking into a waystone
    if (P.cls === 'monk') drawMonk(alpha, lift); else if (P.cls === 'miasmancer') drawMias(alpha, lift); else if (P.cls === 'hemomancer') drawHemo(alpha, lift); else if (P.cls === 'ossumancer') drawOssu(alpha, lift); else if (P.shell) drawShell(alpha, lift); else drawSpr(SPR.player, P.x, P.y, P.face, P.hurt > 0, alpha, lift);
    if (mk > 0) ctx.restore();
    if (false && P.swing > 0) { const p = iso(P.x, P.y), k = 1 - P.swing / 0.22; ctx.strokeStyle = `rgba(232,226,208,${0.8 - k * 0.6})`; ctx.beginPath(); ctx.arc(p.sx + P.face * 5, p.sy - 8, 7, -1.2 + k * 1.6 - (P.face < 0 ? Math.PI : 0) * 0, 0.2 + k * 1.6); ctx.stroke(); }
    if (P.infuse || P.condensing) { const p = iso(P.x, P.y); ctx.strokeStyle = `rgba(216,243,255,${0.35 + 0.25 * Math.sin(G.time * 12)})`; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, 11, 5.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  } });
  const WCOL = { rev: '160,215,255', beam: '255,226,160', prism: '225,200,255' }, WDOT = { rev: '#d8f3ff', beam: '#ffe2a0', prism: '#eedcff' };
  if (!P.dead) for (const w of P.wisps) {
    list.push({ d: w.x + w.y + 0.01, f: () => {
      const lan = w.kind !== 'rev', rgb = WCOL[w.kind];
      ctx.globalCompositeOperation = 'lighter';
      w.trail.forEach((q, i) => { const p = iso(q.x, q.y); ctx.fillStyle = `rgba(${rgb},${0.12 + i * 0.06})`; ctx.fillRect(Math.round(p.sx), Math.round(p.sy - q.z), 2, 2); });
      const p = iso(w.x, w.y), sx = Math.round(p.sx), sy = Math.round(p.sy - w.z);
      glow(sx + .5, sy + .5, lan ? 7 : 6, rgb, w.state === 'drift' ? 0.5 : 0.75);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 2, 2);
      ctx.fillStyle = WDOT[w.kind]; ctx.fillRect(sx + (w.wt * 3 | 0) % 2, sy + 2, 1, 1);
      if (w.kind === 'prism') { ctx.fillStyle = `hsl(${(G.time * 200 + w.wt * 50) % 360},90%,75%)`; ctx.fillRect(sx - 1 + ((w.wt * 5 | 0) % 4), sy - 1, 1, 1); }
    } });
  }
  if (G.great) { const gw = G.great; list.push({ d: gw.x + gw.y + 0.02, f: () => {
    const p = iso(gw.x, gw.y), sx = p.sx, sy = p.sy - gw.z, r = 3 + gw.size * 0.45;
    if (gw.state === 'hunt') { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy + 1, r * 0.9, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalCompositeOperation = 'lighter';
    glow(sx, sy, r * 3, '160,215,255', 0.55); glow(sx, sy, r * 1.4, '232,247,255', 0.8);
    ctx.globalCompositeOperation = 'source-over';
    const pul = 1 + 0.12 * Math.sin(G.time * 9);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy, Math.max(1.5, r * 0.55 * pul), 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < Math.min(12, gw.size); i++) { const a = G.time * 3 + i / Math.min(12, gw.size) * Math.PI * 2; ctx.fillStyle = '#d8f3ff'; ctx.fillRect(Math.round(sx + Math.cos(a) * r), Math.round(sy + Math.sin(a) * r * 0.6), 1, 1); }
    if (gw.state === 'hunt') { const k = clamp(gw.life / (WS.condLife() + 0.15 * gw.size), 0, 1); ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(sx - 8), Math.round(sy - r - 6), 16, 2); ctx.fillStyle = '#d8f3ff'; ctx.fillRect(Math.round(sx - 8), Math.round(sy - r - 6), Math.round(16 * k), 2); }
    else txt(String(gw.size), Math.round(sx), Math.round(sy - r - 3), '#d8f3ff', 'center');
  } }); }
  if (G.golem) { const g = G.golem; list.push({ d: g.x + g.y, f: () => {
    shadow(g.x, g.y, g.r);
    const dorm = g.state === 'dormant', tele = false;
    const p = iso(g.x, g.y), ramp = g.ramp > 0;
    if (ramp) {
      const R = WS.auraR(), pul = 0.5 + 0.5 * Math.sin(G.time * 10);
      ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.05 * pul})`; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, R * ISO_R, R * ISO_RY, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.3 * pul})`; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, R * ISO_R, R * ISO_RY, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 12, 22, '255,255,255', 0.35 + 0.15 * pul); ctx.globalCompositeOperation = 'source-over';
    } else if (g.charge > 0) { ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 12, 10 + g.charge * 1.5, '216,243,255', 0.1 + 0.03 * g.charge); ctx.globalCompositeOperation = 'source-over'; }
    const r = drawSpr(dorm ? SPR.golemDormant : SPR.golem, g.x, g.y, g.face, g.hurt > 0 || tele || (ramp && Math.floor(G.time * 8) % 3 === 0));
    hoverCands.push({ kind: 'golem', ref: g, rect: { x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 }, d: g.x + g.y + 5 });
    G.golemRect = { x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 };
    drawGolemWeapon(g, p, dorm);
    const charging = g.state === 'charge' || g.state === 'chargeWind';
    if (g.shield) { const sh = SPR.towerShield; if (dorm) ctx.globalAlpha = 0.55; ctx.drawImage(g.face < 0 ? sh.f : sh.c, Math.round(p.sx + (charging ? g.face * 6 : -g.face * 9) - sh.w / 2), Math.round(p.sy - (charging ? 17 : 15))); ctx.globalAlpha = 1; }
    if (ramp) for (let i = 0; i < 3; i++) { const a = G.time * 7 + i * 2.1; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.sx + Math.cos(a) * 9), Math.round(p.sy - 14 - Math.abs(Math.sin(a * 1.3)) * 10), 1, 2); }
    if (dorm) {
      const k = 1 - g.rt / g.rtMax;
      ctx.strokeStyle = '#aab4c2'; ctx.beginPath(); ctx.arc(p.sx, p.sy - 28, 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = '#0e0d12'; ctx.fillRect(r.x, r.y - 3, r.w, 2); ctx.fillStyle = '#8b93a0'; ctx.fillRect(r.x, r.y - 3, Math.round(r.w * g.hp / g.max), 2);
      const ck = ramp ? g.ramp / WS.rampLife() : g.charge / WS.chargeMax();
      if (ck > 0) { ctx.fillStyle = '#0e0d12'; ctx.fillRect(r.x, r.y - 6, r.w, 2); ctx.fillStyle = ramp ? '#ffffff' : '#9fd8ff'; ctx.fillRect(r.x, r.y - 6, Math.round(r.w * clamp(ck, 0, 1)), 2); }
    }
    if (P.infuse) { const q = iso(P.x, P.y); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(216,243,255,${0.4 + 0.3 * Math.sin(G.time * 20)})`; ctx.beginPath(); ctx.moveTo(q.sx, q.sy - 8); ctx.lineTo(p.sx, p.sy - 14); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  } }); }
  if (G.flyShield) { const s = G.flyShield; list.push({ d: s.x + s.y, f: () => {
    const p = iso(s.x, s.y), sh = SPR.towerShield, sq = Math.abs(Math.cos(s.spin));
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy + 1, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    const w = Math.max(2, Math.round(sh.w * sq));
    ctx.drawImage(sh.c, Math.round(p.sx - w / 2), Math.round(p.sy - 16), w, sh.h);
    ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 9, 8, '216,243,255', 0.3); ctx.globalCompositeOperation = 'source-over';
  } }); }
  for (const pl of G.pillars) list.push({ d: pl.x + pl.y, f: () => drawPillar(pl) });
  drawEFires(list); drawBurrowFx(list); drawAltars(list, hoverCands); drawStatues(list); drawBoneWalls(list); drawClassLamp(list);
  bloodRender(list, hoverCands); boneRender(list, hoverCands); arcanaRender(list); miasRender(list); render14(list); monkRender(list);
  for (const t of G.totems) list.push({ d: t.x + t.y, f: () => {
    const q = iso(t.x, t.y), sx = Math.round(q.sx), sy = Math.round(q.sy), fl = t.life < 2 && Math.floor(G.time * 8) % 2;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a4330'; ctx.fillRect(sx - 1, sy - 16, 2, 16); ctx.fillRect(sx - 3, sy - 1, 6, 2);
    ctx.fillStyle = '#8f8a7c'; ctx.fillRect(sx - 3, sy - 22, 6, 7); ctx.fillStyle = fl ? '#5a4330' : '#ffe2a0'; ctx.fillRect(sx - 2, sy - 21, 4, 5);
    ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - 19, 12, '255,226,160', fl ? 0.2 : 0.55); ctx.globalCompositeOperation = 'source-over';
    for (const w of t.wisps) { const p = iso(w.x, w.y); ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - w.z, 5, '255,226,160', 0.6); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.sx), Math.round(p.sy - w.z), 2, 2); }
  } });
  if (G.golem && G.golem.order) { const o = G.golem.order, q = iso(o.x, o.y); ctx.strokeStyle = `rgba(170,180,194,${0.4 + 0.2 * Math.sin(G.time * 6)})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, 8, 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#aab4c2'; ctx.fillRect(Math.round(q.sx), Math.round(q.sy) - 6, 1, 6); ctx.fillRect(Math.round(q.sx) + 1, Math.round(q.sy) - 6, 4, 2); }
  for (const k of G.marks) { const q = iso(k.x, k.y), a = Math.min(1, k.t * 2); ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, k.R * ISO_R, k.R * ISO_RY, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = `rgba(255,255,255,${0.08 * a})`; ctx.fill(); }
  for (const e of G.echoes) list.push({ d: e.x + e.y, f: () => {
    shadow(e.x, e.y, e.r);
    const spr = echoSprite(e), q = iso(e.x, e.y);
    ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 8, 10, '200,235,255', 0.25); ctx.globalCompositeOperation = 'source-over';
    drawSpr(spr, e.x, e.y, e.face, e.hurt > 0, 0.72 + 0.1 * Math.sin(G.time * 4 + e.x));
    if (e.hp < e.max) { ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(q.sx - 6), Math.round(q.sy - spr.h - 1), 12, 2); ctx.fillStyle = '#bfe8ff'; ctx.fillRect(Math.round(q.sx - 6), Math.round(q.sy - spr.h - 1), Math.round(12 * e.hp / e.max), 2); }
  } });
  for (const ph of G.phantoms) list.push({ d: ph.x + ph.y, f: () => drawSpr(SPR.player, ph.x, ph.y, ph.face, true, 0.25 + 0.3 * (1 - ph.t / 0.8)) });
  for (const o of G.orbs) list.push({ d: o.x + o.y + 0.03, f: () => {
    const q = iso(o.x, o.y), sx = q.sx, sy = q.sy - 10, r = o.gen ? 2 : 3.5;
    ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, r * 4, '230,240,255', 0.7); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#cfe6ff'; ctx.beginPath(); ctx.arc(sx, sy, r + 2, o.ang, o.ang + 2); ctx.stroke();
  } });
  for (const st of G.storms) list.push({ d: st.x + st.y, f: () => {
    const q = iso(st.x, st.y);
    for (let i = 0; i < 3; i++) { const R = 0.6 + i * 0.45; ctx.strokeStyle = `rgba(216,243,255,${0.5 - i * 0.12})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy - i * 3, R * ISO_R, R * ISO_RY, 0, st.spin * (i % 2 ? -1 : 1), st.spin * (i % 2 ? -1 : 1) + 4.2); ctx.stroke(); }
    ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 8, 16, '216,243,255', 0.35); ctx.globalCompositeOperation = 'source-over';
  } });
  for (const s of souls) list.push({ d: s.x + s.y + .02, f: () => {
    const p = iso(s.x, s.y), sx = Math.round(p.sx), sy = Math.round(p.sy - 8);
    ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, 5, '232,226,208', 0.4); ctx.globalCompositeOperation = 'source-over';
    const a = Math.atan2((s.vx + s.vy) * 4, (s.vx - s.vy) * 8);
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(sx, sy, 2, 2); ctx.fillRect(Math.round(sx - Math.cos(a) * 2), Math.round(sy - Math.sin(a) * 2), 1, 1);
    ctx.fillStyle = '#a39d8c'; ctx.fillRect(Math.round(sx - Math.cos(a) * 4), Math.round(sy - Math.sin(a) * 4), 1, 1);
  } });
  for (const s of shots) list.push({ d: s.x + s.y, f: () => {
    const p = iso(s.x, s.y), sx = p.sx, sy = p.sy - 6;
    if (s.kind === 'orb') { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, 7, '138,190,74', 0.7); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#d6ff9a'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3); return; }
    const dx = (s.vx - s.vy) * 0.5, dy = (s.vx + s.vy) * 0.25, l = Math.hypot(dx, dy) || 1;
    ctx.strokeStyle = '#cfc6ae'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx / l * 5, sy - dy / l * 5); ctx.stroke();
    ctx.fillStyle = '#c8553d'; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
  } });
  list.sort((a, b) => a.d - b.d);
  for (const o of list) o.f();

  ctx.globalCompositeOperation = 'lighter';
  for (const w of P.wisps) {
    const b = w.beam; if (!b) continue;
    const fade = 1 - 0.75 * (b.t / b.dur), prism = w.kind === 'prism';
    b.segs.forEach((sg, i) => {
      const a = iso(sg[0], sg[1]), c = iso(sg[2], sg[3]), h0 = i === 0 ? w.z : 10;
      ctx.strokeStyle = prism ? `rgba(215,180,255,${0.35 * fade})` : `rgba(255,214,140,${0.35 * fade})`; ctx.lineWidth = prism ? 2 : 3; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - h0); ctx.lineTo(c.sx, c.sy - 8); ctx.stroke();
      ctx.strokeStyle = `rgba(255,250,235,${0.9 * fade})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - h0); ctx.lineTo(c.sx, c.sy - 8); ctx.stroke();
      if (i > 0) glow(a.sx, a.sy - 10, 6, '255,240,200', 0.6 * fade);
    });
    (b.refr || []).forEach((r, j) => { const a = iso(r[0], r[1]), c = iso(r[2], r[3]); ctx.strokeStyle = `hsla(${(G.time * 300 + j * 70) % 360},90%,78%,${0.8 * fade})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 8); ctx.lineTo(c.sx, c.sy - 8); ctx.stroke(); });
  }
  // v0.24: the lance pulses: a bright line leaping target to target, fading from its tail to its head
  for (const pu of G.pulses || []) {
    const k = pu.t / pu.max, n = pu.pts.length - 1;
    for (let i = 0; i < n; i++) {
      const fade = Math.max(0, Math.min(1, k * 1.6 - (i / Math.max(1, n)) * 0.5)); if (fade <= 0) continue;
      const [x0, y0, z0] = pu.pts[i], [x1, y1, z1] = pu.pts[i + 1], a = iso(x0, y0), c = iso(x1, y1);
      // a slight jag, re-rolled each frame, so it reads as a pulse and not a rod
      const mx = (a.sx + c.sx) / 2 + (Math.random() - 0.5) * 3, my = (a.sy - z0 + c.sy - z1) / 2 + (Math.random() - 0.5) * 3;
      ctx.globalCompositeOperation = 'lighter';
      if (!pu.thin) { ctx.strokeStyle = `rgba(140,190,255,${0.35 * fade})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - z0); ctx.lineTo(mx, my); ctx.lineTo(c.sx, c.sy - z1); ctx.stroke(); }
      ctx.strokeStyle = `rgba(240,250,255,${0.95 * fade})`; ctx.lineWidth = pu.thin ? 1 : 1.5; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - z0); ctx.lineTo(mx, my); ctx.lineTo(c.sx, c.sy - z1); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      if (i === n - 1 || !pu.thin) glow(c.sx, c.sy - z1, 5, '220,240,255', 0.5 * fade);
    }
  }
  ctx.lineWidth = 1;
  // Spirit Lance
  if (P.lance && !P.dead) {
    const fl = 0.75 + 0.25 * Math.sin(G.time * 40);
    P.lance.segs.forEach((sg, i) => {
      const a = iso(sg[0], sg[1]), c = iso(sg[2], sg[3]), h0 = i === 0 ? 11 : 10, m = Math.min(2, sg[4]);
      ctx.strokeStyle = `rgba(120,180,255,${0.18 * fl * m})`; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - h0); ctx.lineTo(c.sx, c.sy - 10); ctx.stroke();
      ctx.strokeStyle = `rgba(180,215,255,${0.35 * fl * m})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - h0); ctx.lineTo(c.sx, c.sy - 10); ctx.stroke();
      { const n = Math.max(3, Math.round(Math.hypot(c.sx - a.sx, c.sy - a.sy) / 6)); ctx.strokeStyle = 'rgba(220,240,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k <= n; k++) { const t = k / n, x = a.sx + (c.sx - a.sx) * t, y = a.sy - h0 + (c.sy - 10 - a.sy + h0) * t + (k && k < n ? (Math.random() - 0.5) * 5 : 0); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.strokeStyle = `rgba(255,255,255,${0.95})`; ctx.lineWidth = 1 + (sg[4] > 1.4 ? 1 : 0); ctx.beginPath(); ctx.moveTo(a.sx, a.sy - h0); ctx.lineTo(c.sx, c.sy - 10); ctx.stroke();
      if (i > 0) glow(a.sx, a.sy - 10, 9, '230,240,255', 0.8);
    });
    ctx.lineWidth = 1;
    (P.lance.refr || []).forEach((r, j) => { const a = iso(r[0], r[1]), c = iso(r[2], r[3]); ctx.strokeStyle = `hsla(${(G.time * 300 + j * 70) % 360},90%,85%,0.8)`; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 10); ctx.lineTo(c.sx, c.sy - 8); ctx.stroke(); });
    const e = P.lance.segs[P.lance.segs.length - 1]; if (e) { const q = iso(e[2], e[3]); glow(q.sx, q.sy - 10, 7, '255,255,255', 0.7); }
  }
  for (const sh of G.shards) { const q = iso(sh.x, sh.y), dx = (sh.vx - sh.vy) * 0.25, dy = (sh.vx + sh.vy) * 0.12; ctx.strokeStyle = 'rgba(235,245,255,0.9)'; ctx.beginPath(); ctx.moveTo(q.sx, q.sy - 9); ctx.lineTo(q.sx - dx, q.sy - 9 - dy); ctx.stroke(); }
  for (const L of G.leashes) {
    const fade = Math.min(1, L.life / 1.5), pts = L.pts.map(pp => { const q = iso(pp.x, pp.y); return [q.sx, q.sy - pp.z]; });
    for (const [w, a, col] of [[4, 0.18, '120,190,255'], [2, 0.5, '170,220,255'], [1, 0.95, '255,255,255']]) {
      ctx.strokeStyle = `rgba(${col},${a * fade})`; ctx.lineWidth = w; ctx.beginPath();
      pts.forEach(([x, y], i) => { const j = i === 0 || i === pts.length - 1 ? 0 : Math.sin(G.time * 22 + i * 2.1) * 0.8; if (i) ctx.lineTo(x, y + j); else ctx.moveTo(x, y); });
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (let i = 1; i < pts.length - 1; i += 3) { ctx.fillStyle = `rgba(255,255,255,${0.7 * fade})`; ctx.fillRect(Math.round(pts[i][0]) - 1, Math.round(pts[i][1]) - 1, 2, 2); }
    if (L.kind === 'ground') { const q = iso(L.ax, L.ay); glow(q.sx, q.sy - 2, 8, '170,220,255', 0.6 * fade); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy) - 3, 3, 3); }
  }
  for (const t of G.totems) for (const w of t.wisps) if (w.beam) w.beam.segs.forEach((sg, i) => {
    const a = iso(sg[0], sg[1]), c = iso(sg[2], sg[3]), h0 = i === 0 ? w.z : 10, fd = 1 - 0.6 * w.beam.t / w.beam.dur;
    ctx.strokeStyle = `rgba(255,214,140,${0.35 * fd})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - h0); ctx.lineTo(c.sx, c.sy - 8); ctx.stroke();
    ctx.strokeStyle = `rgba(255,250,235,${0.9 * fd})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - h0); ctx.lineTo(c.sx, c.sy - 8); ctx.stroke();
  });
  for (const w of G.whips) if (w.pts) {
    const a = 1 - Math.max(0, (w.t - w.dur) / 0.12);
    ctx.strokeStyle = `rgba(160,215,255,${0.4 * a})`; ctx.lineWidth = 4; ctx.beginPath(); w.pts.forEach((pp, i) => { const q = iso(pp.x, pp.y), y = q.sy - 9 + i * 0.5; if (i) ctx.lineTo(q.sx, y); else ctx.moveTo(q.sx, y); }); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1; ctx.stroke();
    const tip = iso(w.pts[w.pts.length - 1].x, w.pts[w.pts.length - 1].y); glow(tip.sx, tip.sy - 3, 8, '255,255,255', 0.8 * a);
  }
  ctx.lineWidth = 1;
  if (G.tether) {
    const q0 = iso(P.x, P.y), k = Math.min(1, G.tether.life);
    for (const a of tetherLinks()) {
      const q1 = iso(a.x, a.y), n = 10;
      ctx.strokeStyle = `rgba(160,215,255,${0.55 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q0.sx, q0.sy - 8); ctx.lineTo(q1.sx, q1.sy - 10); ctx.stroke(); ctx.lineWidth = 1;
      for (let i = 0; i <= n; i++) { const t = (i + (G.time * 3) % 1) / n; if (t > 1) continue; ctx.fillStyle = `rgba(255,255,255,${0.8 * k})`; ctx.fillRect(Math.round(q0.sx + (q1.sx - q0.sx) * t), Math.round(q0.sy - 8 + (q1.sy - 10 - q0.sy + 8) * t), 2, 1); }
    }
  }
  ctx.lineWidth = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (const p of parts) {
    const q = iso(p.x, p.y);
    if (p.g) { drawGlowPart(p, q); continue; }
    ctx.globalAlpha = Math.min(1, p.t * 3);
    if (p.ring) { ctx.strokeStyle = p.col; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, p.r * ISO_R, p.r * ISO_RY, 0, 0, Math.PI * 2); ctx.stroke(); continue; }
    if (p.spike) { ctx.globalAlpha = 1; const k = p.t / 0.45, h = Math.round(12 * Math.min(1, (1 - k) * 4) * (k > 0.3 ? 1 : k / 0.3)); ctx.fillStyle = '#5d6470'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy) - h, 3, h); ctx.fillStyle = '#cfd6e0'; ctx.fillRect(Math.round(q.sx), Math.round(q.sy) - h, 1, Math.max(1, h - 2)); continue; }
    if (p.fly) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - p.z, 5, '216,243,255', 0.7); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - p.z), 2, 2); continue; }
    ctx.fillStyle = p.col; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - p.z), 1, 1);
  }
  ctx.globalAlpha = 1;

  // darkness
  // v0.21: coloured light (y_light21.js). The old light holes pour light into the map.
  beginLights(z);
  if (P.lance) for (const sg of P.lance.segs) { const p = iso(sg[2], sg[3]); lightHole(p.sx, p.sy - 10, 26, 0.8); }
  for (const o of G.orbs) { const p = iso(o.x, o.y); lightHole(p.sx, p.sy - 10, 30, 0.8); }
  if (G.golem && G.golem.ramp > 0) { const p = iso(G.golem.x, G.golem.y); lightHole(p.sx, p.sy - 8, 50, 0.9); }
  boneLight(); bloodLight(); light14();
  for (const e of G.echoes) { const p = iso(e.x, e.y); lightHole(p.sx, p.sy - 8, 22, 0.5); }
  for (const t of G.totems) { const p = iso(t.x, t.y); lightHole(p.sx, p.sy - 18, 60, 0.9); }
  for (const L of G.leashes) for (let i = 2; i < L.pts.length; i += 4) { const q = iso(L.pts[i].x, L.pts[i].y); lightHole(q.sx, q.sy - L.pts[i].z, 14, 0.45); }
  if (G.great) { const p = iso(G.great.x, G.great.y); lightHole(p.sx, p.sy - G.great.z, 30 + G.great.size * 3, 0.9); }
  for (const l of z.lanterns) { const p = iso(l.x, l.y); if (p.sx > -120 && p.sx < W + 120 && p.sy > -120 && p.sy < H + 120) lightHole(p.sx, p.sy - 8, 80 + Math.sin(G.time * 5) * 3, 1); }
  if (G.bossFight && z.bossRoom) { const p = iso(z.bossRoom.cx, z.bossRoom.cy); lightHole(p.sx, p.sy, 140, 0.6); }
  if (P.remnant && P.remnant.zone === z.id) { const p = iso(P.remnant.x, P.remnant.y); lightHole(p.sx, p.sy, 22, 0.8); }
  for (const s of souls) { const p = iso(s.x, s.y); lightHole(p.sx, p.sy - 6, 14, 0.5); }
  for (const w of P.wisps) if (w.beam) for (const sg of w.beam.segs) { const p = iso(sg[2], sg[3]); lightHole(p.sx, p.sy - 8, 20, 0.7); }
  // v0.17: no circle of sight. The whole view is shown; only distant enemies fade (see the monster pass).
  // Lanterns and other lights still warm the ground around them.
  addLights16(z);
  applyLights();
  drawAtmos();
  drawJuice();
  postGrade(z);

  corpseHint();
  // floating texts
  drawTexts();

  // item labels (Alt) and hover detection
  const showAll = keys.has('alt');
  const labels = [];
  for (const g of z.items) {
    if (!onScreen(g.x, g.y)) continue;
    const p = iso(g.x, g.y);
    const near = Math.abs(mouse.x - p.sx) < 10 && Math.abs(mouse.y - (p.sy - 4)) < 10;
    if (!showAll && !near) continue;
    const name = g.gold ? `${g.gold} Gold` : g.item.name, w = tw(name) + 6;
    let rx = Math.round(p.sx - w / 2), ry = Math.round(p.sy - 20);
    for (let k = 0; k < 8 && labels.some(l => rx < l.x + l.w && rx + w > l.x && ry < l.y + 11 && ry + 11 > l.y); k++) ry -= 11;
    labels.push({ x: rx, y: ry, w, name, g });
  }
  const mx = mouse.x, my = mouse.y;
  let hov = null;
  for (const l of labels) if (mx >= l.x && mx <= l.x + l.w && my >= l.y && my <= l.y + 11) hov = { kind: 'item', ref: l.g };
  if (!hov) {
    let best = null;
    for (const c of hoverCands) { const r = c.rect; if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h && (!best || c.d > best.d)) best = c; }
    hov = best;
  }
  if (uiBlocksMouse()) hov = null;
  G.hover = hov;
  for (const l of labels) {
    const hl = hov && hov.ref === l.g;
    ctx.fillStyle = hl ? 'rgba(40,36,50,0.95)' : 'rgba(10,9,13,0.85)'; ctx.fillRect(l.x, l.y, l.w, 11);
    txt(l.name, l.x + 3, l.y + 8, l.g.gold ? '#d9a441' : (QCOL[l.g.item.q] || '#d6d2c8'), 'left', false);
  }
  cam.x = cx0; cam.y = cy0;
}

// =================================================================== automap
function drawMap() {
  const z = G.zone, cx = W / 2, cy = H / 2 - 12;
  ctx.globalAlpha = 0.85;
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    const i = y * z.w + x; if (!z.explored[i]) continue;
    const px = Math.round(cx + ((x - P.x) - (y - P.y)) * 2), py = Math.round(cy + ((x - P.x) + (y - P.y)));
    if (px < 0 || py < 0 || px >= W || py >= H - 32) continue;
    const t = z.t[i];
    if (SOLID[t]) {
      if (t === T.WATER) { ctx.fillStyle = '#1d3552'; ctx.fillRect(px, py, 2, 1); continue; }
      if (z.walkTile(x + 1, y) || z.walkTile(x - 1, y) || z.walkTile(x, y + 1) || z.walkTile(x, y - 1)) { ctx.fillStyle = t === T.FOG ? '#e8f0f5' : '#8f8a7c'; ctx.fillRect(px, py, 2, 1); }
    } else if (t === T.ROAD) { ctx.fillStyle = '#5b4b39'; ctx.fillRect(px, py, 2, 1); }
  }
  for (const o of z.objects) {
    const px = Math.round(cx + ((o.x - P.x) - (o.y - P.y)) * 2), py = Math.round(cy + ((o.x - P.x) + (o.y - P.y)));
    if (!z.explored[Math.floor(o.y) * z.w + Math.floor(o.x)]) continue;
    ctx.fillStyle = o.type === 'lantern' ? '#d9a441' : o.type === 'portal' ? '#e8f0f5' : o.type === 'vendor' ? '#6b8a4a' : null;
    if (ctx.fillStyle && ctx.fillStyle !== '#000000' && (o.type === 'lantern' || o.type === 'portal' || o.type === 'vendor')) ctx.fillRect(px - 1, py - 1, 3, 3);
  }
  ctx.globalAlpha = 1;
  if (Math.floor(G.time * 3) % 2 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3); }
  txt(z.name, W - 8, 12, '#a39d8c', 'right');
}

// =================================================================== HUD
const HUD_Y = H - 30;
const BELT_X = 188;
function drawOrb(cx, cy, r, v, max, col, dim) {
  ctx.fillStyle = '#0a090d'; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b1920'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  const k = clamp(v / max, 0, 1);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = col; ctx.fillRect(cx - r, cy + r - 2 * r * k, 2 * r, 2 * r * k);
  ctx.fillStyle = dim; ctx.fillRect(cx - r, cy + r - 2 * r * k, 2 * r, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(cx - r / 2, cy - r + 3, 3, 3);
  ctx.restore();
}
function skillIcon(id, x, y, active) {
  ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y - 1, 20, 20);
  ctx.fillStyle = active ? '#2a2733' : '#1b1920'; ctx.fillRect(x, y, 18, 18);
  const c = x + 9, m = y + 9;
  if (icon14(id, x, y)) return;
  ctx.fillStyle = '#d8f3ff';
  switch (id) {
    case 'attack': ctx.fillStyle = '#cfc6ae'; for (let i = 0; i < 9; i++) ctx.fillRect(x + 4 + i, y + 13 - i, 2, 2); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x + 12, y + 2, 4, 4); break;
    case 'wisps': [[5, 5], [12, 7], [7, 12], [13, 13]].forEach(([a, b]) => ctx.fillRect(x + a, y + b, 2, 2)); break;
    case 'restless': ctx.fillRect(x + 12, y + 5, 3, 3); ctx.globalAlpha = .5; ctx.fillRect(x + 8, y + 7, 3, 2); ctx.fillRect(x + 4, y + 9, 3, 2); ctx.globalAlpha = 1; break;
    case 'burst': [[0, -6], [4, -4], [6, 0], [4, 4], [0, 6], [-4, 4], [-6, 0], [-4, -4]].forEach(([a, b]) => ctx.fillRect(c + a - 1, m + b - 1, 2, 2)); ctx.fillRect(c - 1, m - 1, 3, 3); break;
    case 'leech': ctx.fillStyle = '#c24050'; ctx.fillRect(x + 4, y + 9, 4, 4); ctx.fillStyle = '#5c86d6'; ctx.fillRect(x + 10, y + 9, 4, 4); ctx.fillStyle = '#d8f3ff'; ctx.fillRect(x + 7, y + 4, 4, 3); break;
    case 'beam': case 'sweep': ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x + 3, y + 8, 3, 3); ctx.fillStyle = '#fff6df'; ctx.fillRect(x + 6, y + 9, 10, 1);
      if (id === 'sweep') { ctx.fillRect(x + 6, y + 5, 9, 1); ctx.fillRect(x + 6, y + 13, 9, 1); } break;
    case 'prism': ctx.fillStyle = '#eedcff'; ctx.fillRect(x + 3, y + 8, 3, 3); ctx.fillRect(x + 6, y + 9, 5, 1);
      ['#ff8a8a', '#ffe28a', '#8affa8', '#8ab8ff'].forEach((col, i) => { ctx.fillStyle = col; for (let j = 0; j < 5; j++) ctx.fillRect(x + 11 + j, y + 9 + Math.round((i - 1.5) * j * 0.8), 1, 1); }); break;
    case 'choir': [[4, 4, '#d8f3ff'], [12, 4, '#ffe2a0'], [8, 11, '#eedcff'], [3, 13, '#d8f3ff'], [13, 13, '#ffe2a0']].forEach(([a, b, col]) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, 2, 2); }); ctx.fillStyle = '#d9a441'; ctx.fillRect(x + 7, y + 2, 4, 1); break;
    case 'sword': ctx.fillStyle = '#e8eef5'; for (let i = 0; i < 10; i++) ctx.fillRect(x + 6 + i, y + 12 - i, 1, 1); ctx.fillStyle = '#aab4c2'; for (let i = 0; i < 9; i++) ctx.fillRect(x + 6 + i, y + 13 - i, 1, 1); ctx.fillStyle = '#8f8a7c'; ctx.fillRect(x + 3, y + 11, 6, 1); ctx.fillStyle = '#5a4330'; ctx.fillRect(x + 3, y + 14, 2, 2); break;
    case 'axe': ctx.fillStyle = '#5a4330'; for (let i = 0; i < 12; i++) ctx.fillRect(x + 3 + i, y + 15 - i, 1, 1); ctx.fillStyle = '#8b93a0'; ctx.fillRect(x + 10, y + 2, 5, 7); ctx.fillStyle = '#e8eef5'; ctx.fillRect(x + 14, y + 2, 1, 7); break;
    case 'flail': ctx.fillStyle = '#5a4330'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 3 + i, y + 15 - i, 1, 1); ctx.fillStyle = '#8f8a7c'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 9 + i, y + 9 - i, 1, 1); ctx.fillStyle = '#5d6470'; ctx.fillRect(x + 11, y + 2, 5, 5); ctx.fillStyle = '#cfd6e0'; ctx.fillRect(x + 12, y + 3, 1, 1); ctx.fillRect(x + 13, y + 1, 1, 1); ctx.fillRect(x + 16, y + 4, 1, 1); break;
    case 'bulwark': ctx.fillStyle = '#5d6470'; ctx.fillRect(x + 5, y + 2, 8, 11); ctx.fillRect(x + 6, y + 13, 6, 2); ctx.fillStyle = '#d8f3ff'; ctx.fillRect(x + 8, y + 4, 2, 8); ctx.fillRect(x + 6, y + 6, 6, 2); ctx.fillStyle = '#8f8a7c'; ctx.fillRect(x + 2, y + 16, 14, 1); break;
    case 'thorns': ctx.fillStyle = '#8b93a0'; ctx.fillRect(x + 5, y + 5, 8, 8); ctx.fillStyle = '#e8eef5'; [[9, 1], [9, 15], [1, 9], [15, 9], [3, 3], [14, 3], [3, 14], [14, 14]].forEach(([a, b]) => ctx.fillRect(x + a, y + b, 1, 2)); break;
    case 'overcharge': ctx.fillStyle = '#aab4c2'; ctx.fillRect(x + 5, y + 5, 8, 10); ctx.fillStyle = '#ffe9b0'; ctx.fillRect(x + 8, y + 2, 2, 3); ctx.fillRect(x + 7, y + 8, 4, 4); ctx.fillRect(x + 2, y + 9, 2, 1); ctx.fillRect(x + 14, y + 9, 2, 1); break;
    case 'overflow': ctx.fillStyle = '#8b93a0'; ctx.fillRect(x + 7, y + 7, 4, 4); ctx.fillStyle = '#d8f3ff'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.fillRect(Math.round(c + Math.cos(a) * 7) - 1, Math.round(m + Math.sin(a) * 7) - 1, 2, 2); } break;
    case 'ironm': ctx.fillStyle = '#aab4c2'; ctx.fillRect(x + 5, y + 3, 8, 6); ctx.fillRect(x + 3, y + 9, 12, 6); ctx.fillStyle = '#d9a441'; ctx.fillRect(x + 5, y + 1, 8, 2); ctx.fillStyle = '#d8f3ff'; ctx.fillRect(x + 7, y + 5, 1, 1); ctx.fillRect(x + 10, y + 5, 1, 1); break;
    case 'ward': ctx.strokeStyle = '#5c86d6'; ctx.beginPath(); ctx.arc(c, m, 6, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(c, m, 4, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(c - 1, m - 2, 2, 4); break;
    case 'condense': ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(c, m, 7, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(c, m, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(c - 1, m - 1, 2, 2); [[2, 2], [15, 3], [3, 15], [15, 14]].forEach(([a, b]) => { ctx.fillStyle = '#d8f3ff'; ctx.fillRect(x + a, y + b, 1, 1); }); break;
    case 'radiance': ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(c, m, 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(c, m, 7, 0, Math.PI * 2); ctx.stroke(); break;
    case 'nova': ctx.fillStyle = '#ffffff'; ctx.fillRect(c - 1, m - 1, 3, 3); [[0, -7], [5, -5], [7, 0], [5, 5], [0, 7], [-5, 5], [-7, 0], [-5, -5]].forEach(([a, b]) => { ctx.fillRect(c + Math.round(a * 0.55), m + Math.round(b * 0.55), 1, 1); ctx.fillRect(c + a, m + b, 1, 1); }); break;
    case 'animam': ctx.fillStyle = '#d8f3ff'; ctx.beginPath(); ctx.arc(c, m + 1, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d9a441'; ctx.fillRect(x + 5, y + 2, 8, 2); ctx.fillStyle = '#0a090d'; ctx.fillRect(c - 2, m, 1, 2); ctx.fillRect(c + 1, m, 1, 2); break;
    case 'golem': ctx.fillStyle = '#aab4c2'; ctx.fillRect(x + 5, y + 3, 8, 6); ctx.fillRect(x + 3, y + 9, 12, 6); ctx.fillStyle = '#d8f3ff'; ctx.fillRect(x + 7, y + 5, 1, 1); ctx.fillRect(x + 10, y + 5, 1, 1); break;
    case 'pillars': ctx.fillStyle = '#5d6470'; [[3, 6], [8, 3], [13, 7]].forEach(([a, b]) => { ctx.fillRect(x + a, y + b, 3, 16 - b); }); ctx.fillStyle = '#cfd6e0'; [[3, 6], [8, 3], [13, 7]].forEach(([a, b]) => ctx.fillRect(x + a, y + b, 3, 1)); ctx.fillStyle = '#8f8a7c'; ctx.fillRect(x + 1, y + 16, 16, 1); break;
    case 'fissure': ctx.fillStyle = '#cfd6e0'; for (let i = 0; i < 5; i++) { const h = 3 + i * 2; ctx.fillRect(x + 2 + i * 3, y + 15 - h, 2, h); } ctx.fillStyle = '#8f8a7c'; ctx.fillRect(x + 1, y + 16, 16, 1); break;
    case 'toss': ctx.fillStyle = '#5d6470'; ctx.fillRect(x + 9, y + 4, 7, 9); ctx.fillStyle = '#d8f3ff'; ctx.fillRect(x + 12, y + 5, 1, 7); ctx.fillStyle = '#8f8a7c'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 2 + i * 2, y + 9 + (i % 2), 1, 1); ctx.strokeStyle = '#8f8a7c'; ctx.beginPath(); ctx.arc(c, m + 2, 7, 0.2, 2.6); ctx.stroke(); break;
    case 'magnet': ctx.fillStyle = '#c24050'; ctx.fillRect(x + 3, y + 4, 4, 10); ctx.fillStyle = '#5c86d6'; ctx.fillRect(x + 11, y + 4, 4, 10); ctx.fillStyle = '#8b93a0'; ctx.fillRect(x + 3, y + 12, 12, 3); ctx.fillStyle = '#cfd6e0'; ctx.fillRect(x + 3, y + 3, 4, 1); ctx.fillRect(x + 11, y + 3, 4, 1); break;
    case 'cage': ctx.fillStyle = '#5d6470'; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ctx.fillRect(Math.round(c + Math.cos(a) * 6) - 1, Math.round(m + Math.sin(a) * 4) - 3, 2, 5); } ctx.fillStyle = '#c8553d'; ctx.fillRect(c - 1, m - 1, 2, 2); break;
    case 'resonance': ctx.fillStyle = '#8b93a0'; ctx.fillRect(x + 7, y + 7, 4, 9); ctx.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { ctx.fillRect(x + 1 + i, y + 3 + i, 1, 1); ctx.fillRect(x + 11 + i, y + 8 - i, 1, 1); } break;
    case 'jugg': ctx.fillStyle = '#aab4c2'; ctx.fillRect(x + 4, y + 5, 10, 10); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6; ctx.fillRect(x + 2, y + 3, 14, 2); ctx.fillRect(x + 1, y + 7, 2, 7); ctx.fillRect(x + 15, y + 7, 2, 7); ctx.globalAlpha = 1; ctx.fillStyle = '#d8f3ff'; ctx.fillRect(x + 7, y + 8, 4, 2); break;
    case 'echo': ctx.globalAlpha = 0.7; ctx.fillStyle = '#e8f4ff'; ctx.fillRect(x + 6, y + 3, 6, 5); ctx.fillRect(x + 5, y + 8, 8, 7); ctx.globalAlpha = 0.3; ctx.fillRect(x + 3, y + 5, 12, 11); ctx.globalAlpha = 1; ctx.fillStyle = '#0a090d'; ctx.fillRect(x + 7, y + 5, 1, 1); ctx.fillRect(x + 10, y + 5, 1, 1); break;
    case 'tether': ctx.fillStyle = '#d8f3ff'; ctx.fillRect(x + 2, y + 13, 3, 3); ctx.fillRect(x + 13, y + 2, 3, 3); ctx.fillStyle = '#9fd8ff'; for (let i = 0; i < 8; i++) ctx.fillRect(x + 4 + i, y + 12 - i + (i % 2), 1, 1); break;
    case 'ascend': ctx.globalAlpha = 0.7; ctx.fillStyle = '#e8f4ff'; ctx.fillRect(x + 6, y + 6, 6, 9); ctx.globalAlpha = 1; ctx.fillStyle = '#d9a441'; ctx.fillRect(x + 8, y + 1, 2, 4); ctx.fillRect(x + 7, y + 2, 4, 1); break;
    case 'harvest': ctx.fillStyle = '#8f8a7c'; ctx.beginPath(); ctx.arc(c - 1, m + 1, 6, -0.5, 2.2); ctx.stroke(); ctx.fillStyle = '#5a4330'; ctx.fillRect(x + 4, y + 12, 2, 5); ctx.fillStyle = '#d8f3ff'; ctx.fillRect(x + 12, y + 3, 2, 2); break;
    case 'lance': ctx.fillStyle = '#ffffff'; for (let i = 0; i < 14; i++) ctx.fillRect(x + 2 + i, y + 15 - i, 1, 2); ctx.globalAlpha = 0.4; ctx.fillStyle = '#9fd8ff'; for (let i = 0; i < 14; i++) ctx.fillRect(x + 1 + i, y + 15 - i, 3, 1); ctx.globalAlpha = 1; break;
    case 'hunger': [[3, 4], [9, 3], [13, 8], [6, 11]].forEach(([a, b]) => { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x + a, y + b, 2, 2); ctx.fillStyle = '#c8553d'; ctx.fillRect(x + a + 2, y + b, 1, 1); }); break;
    case 'focus': ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 8, 14, 2); ctx.strokeStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(x + 14, y + 9, 3, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 14, y + 9, 6, -1, 1); ctx.stroke(); break;
    case 'soullegion': for (let i = 0; i < 9; i++) { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x + 2 + (i % 3) * 5, y + 3 + Math.floor(i / 3) * 5, 2, 2); } break;
    case 'rebuke': ctx.strokeStyle = '#5c86d6'; ctx.beginPath(); ctx.arc(c, m, 4, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#9fd8ff'; [[0, -8], [8, 0], [0, 8], [-8, 0]].forEach(([a, b]) => { ctx.fillRect(c + a * 0.75 - 1, m + b * 0.75 - 1, 2, 2); }); break;
    case 'prismL': ctx.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) ctx.fillRect(x + 2 + i, y + 9, 1, 1); ['#ff8a8a', '#ffe28a', '#8affa8', '#8ab8ff'].forEach((col, i) => { ctx.fillStyle = col; for (let j = 0; j < 6; j++) ctx.fillRect(x + 10 + j, y + 9 + Math.round((i - 1.5) * j * 0.9), 1, 1); }); ctx.fillStyle = '#8b93a0'; ctx.fillRect(x + 9, y + 6, 2, 7); break;
    case 'storm': for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(216,243,255,${0.9 - i * 0.25})`; ctx.beginPath(); ctx.arc(c, m, 3 + i * 2.5, i, i + 4); ctx.stroke(); } ctx.fillStyle = '#ffffff'; ctx.fillRect(c - 1, m - 1, 2, 2); break;
    case 'orb': ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(c, m, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#cfe6ff'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; ctx.fillRect(Math.round(c + Math.cos(a) * 7), Math.round(m + Math.sin(a) * 7), 1, 2); } break;
    case 'lsiphon': ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 5, 10, 1); ctx.fillStyle = '#c24050'; ctx.fillRect(x + 5, y + 10, 4, 4); ctx.fillStyle = '#5c86d6'; ctx.fillRect(x + 11, y + 10, 4, 4); break;
    case 'phantom': ctx.fillStyle = '#e8f4ff'; ctx.globalAlpha = 0.25; ctx.fillRect(x + 2, y + 4, 5, 11); ctx.globalAlpha = 0.5; ctx.fillRect(x + 6, y + 4, 5, 11); ctx.globalAlpha = 0.9; ctx.fillRect(x + 11, y + 4, 5, 11); ctx.globalAlpha = 1; break;
    case 'shards': ctx.fillStyle = '#ffffff'; ctx.fillRect(c - 1, m - 1, 3, 3); ctx.fillStyle = '#cfe6ff'; for (let i = 0; i < 10; i++) { const a = i * 0.9, r = 2 + i * 0.7; ctx.fillRect(Math.round(c + Math.cos(a) * r), Math.round(m + Math.sin(a) * r), 1, 1); } break;
    case 'cascade': ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 6, y + 11, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x + 13, y + 6, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x + 14, y + 13, 2, 0, Math.PI * 2); ctx.fill(); break;
    case 'nmastery': ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(c, m + 1, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d9a441'; ctx.fillRect(x + 5, y + 2, 8, 2); ctx.fillStyle = '#5c86d6'; ctx.fillRect(c - 1, m, 2, 2); break;
    case 'leash': ctx.strokeStyle = '#bfe8ff'; ctx.beginPath(); ctx.moveTo(x + 2, y + 14); ctx.bezierCurveTo(x + 6, y + 2, x + 10, y + 18, x + 16, y + 4); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 13, 3, 3); ctx.fillRect(x + 15, y + 3, 3, 3); break;
    case 'totem': ctx.fillStyle = '#5a4330'; ctx.fillRect(x + 8, y + 7, 2, 10); ctx.fillStyle = '#8f8a7c'; ctx.fillRect(x + 6, y + 2, 6, 6); ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x + 7, y + 3, 4, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 5, 1, 1); ctx.fillRect(x + 15, y + 6, 1, 1); break;
    case 'mark': ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(c, m - 7); ctx.lineTo(c + 6, m); ctx.lineTo(c, m + 7); ctx.lineTo(c - 6, m); ctx.closePath(); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fillRect(c - 1, m - 1, 2, 2); break;
    case 'challenge': ctx.fillStyle = '#aab4c2'; ctx.fillRect(x + 3, y + 5, 7, 9); ctx.fillStyle = '#c8553d'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 12 + i * 2, y + 5 + i, 1, 7 - i * 2); break;
    case 'forge': ctx.fillStyle = '#8b93a0'; ctx.fillRect(x + 3, y + 10, 12, 5); ctx.fillStyle = '#e8904a'; ctx.fillRect(x + 6, y + 5, 6, 5); ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x + 8, y + 3, 2, 4); break;
    case 'anvil': ctx.fillStyle = '#8b93a0'; ctx.fillRect(x + 2, y + 5, 14, 3); ctx.fillRect(x + 6, y + 8, 6, 4); ctx.fillRect(x + 4, y + 12, 10, 3); break;
    case 'swarm': [[3, 4], [9, 3], [13, 8], [6, 11], [11, 13], [4, 8]].forEach(([a, b]) => ctx.fillRect(x + a, y + b, 2, 2)); break;
    case 'channel': ctx.strokeStyle = '#d8f3ff'; ctx.beginPath(); ctx.arc(c, m, 6, 0, Math.PI * 2); ctx.stroke(); ctx.fillRect(c - 1, m - 1, 2, 2); break;
    default: boneIcon(id, x, y); break;
    case 'wraith': ctx.globalAlpha = .7; ctx.fillRect(x + 6, y + 3, 6, 11); ctx.fillRect(x + 4, y + 11, 10, 4); ctx.globalAlpha = 1; ctx.fillStyle = '#0a090d'; ctx.fillRect(x + 7, y + 6, 1, 2); ctx.fillRect(x + 10, y + 6, 1, 2); break;
  }
}
function drawHud() {
  hudPanel16();
  drawOrb16(20, HUD_Y + 11, 17, P.hp, D.maxHp, '#8e2630', '#c24050');
  if (P.cls === 'miasmancer') drawOrb16(W - 20, HUD_Y + 11, 17, P.mana, D.maxMana, '#3a1e50', '#8a4ab8'); else if (P.cls === 'hemomancer') drawOrb16(W - 20, HUD_Y + 11, 17, P.mana, D.maxMana, '#5a1622', '#9a2a3a'); else drawOrb16(W - 20, HUD_Y + 11, 17, P.mana, D.maxMana, '#2f5aa8', '#5c86d6');
  if (P.cls === 'hemomancer' && inRect(mouse, W - 38, HUD_Y - 6, 36, 34)) tooltip = [['Vitae', '#e89aa0'], [`${Math.ceil(P.mana)} / ${D.maxMana}`, '#e8e2d0'], ['Every skill costs life. The fuller your', '#a39d8c'], ['Vitae, the less life it costs and the', '#a39d8c'], [`faster you heal: ${(vitaeHeal() * 100).toFixed(1)}% life/s now.`, '#a39d8c'], ['It refills three times as fast near blood:', '#c24050'], ['pools and bleeding enemies.', '#c24050']];
  // xp & stamina
  ctx.fillStyle = '#0a090d'; ctx.fillRect(44, HUD_Y + 2, W - 88, 3);
  ctx.fillStyle = '#b89640'; ctx.fillRect(44, HUD_Y + 2, Math.round((W - 88) * clamp(P.xp / xpNext(P.level), 0, 1)), 3);
  ctx.fillStyle = '#0a090d'; ctx.fillRect(68, HUD_Y + 7, 120, 2);
  ctx.fillStyle = '#6b8a4a'; ctx.fillRect(68, HUD_Y + 7, Math.round(120 * clamp(P.stam / D.maxStam, 0, 1)), 2);
  skillIcon(P.left, 46, HUD_Y + 8, true);
  skillIcon(P.right, W - 64, HUD_Y + 8, true);
  uiButton(46, HUD_Y + 8, 18, 18, () => { G.pick = G.pick === 'L' ? null : 'L'; });
  uiButton(W - 64, HUD_Y + 8, 18, 18, () => { G.pick = G.pick === 'R' ? null : 'R'; });
  if (inRect(mouse, 46, HUD_Y + 8, 18, 18) && !G.pick) tooltip = skillTip(P.left).concat([['Left skill · click to change', '#6f6a79']]);
  if (inRect(mouse, W - 64, HUD_Y + 8, 18, 18) && !G.pick) tooltip = skillTip(P.right).concat([['Right skill · click to change', '#6f6a79']]);
  // wisps: one pip per slot, grouped by type
  if (P.cls === 'hemomancer') drawBroodRow(); else if (P.cls === 'ossumancer') drawShardRow(); else if (P.cls === 'miasmancer') drawMiasRow(); else if (P.cls === 'monk') drawMonkRow(); else {
  const cap = D.wispCap, shown = Math.min(cap, 20), tg = wispTargets(), have = countKinds(), resv = reservedWisps();
  const order = [];
  for (const k of ['rev', 'beam', 'prism']) for (let i = 0; i < tg[k]; i++) order.push([k, i < have[k]]);
  for (let i = 0; i < resv; i++) order.push(['held', false]);
  const PIP = { rev: '#e8f7ff', beam: '#ffe2a0', prism: '#e0c8ff' };
  for (let i = 0; i < shown; i++) {
    const x = 68 + i * 6, [k, on] = order[i] || ['rev', false];
    ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, HUD_Y + 12, 5, 5);
    ctx.fillStyle = on ? PIP[k] : k === 'held' ? '#23405a' : '#2a2833'; ctx.fillRect(x, HUD_Y + 13, 3, 3);
  }
  uiButton(66, HUD_Y + 10, 120, 9, () => { G.panels.choir = !G.panels.choir; });
  if (inRect(mouse, 66, HUD_Y + 10, 120, 9) && !G.panels.choir) tooltip = [['Wisp choir', '#e8e2d0'], ['Click or press V: how your wisps behave', '#6f6a79']];
  const wl = `${P.wisps.length}/${cap}` + (resv ? ` (+${resv})` : '') + ' wisps';
  txt(wl, 68, HUD_Y + 26, '#a39d8c');
  txt(`Lv ${P.level}`, 68 + tw(wl) + 8, HUD_Y + 26, '#d9a441');
  }
  // belt
  for (let i = 0; i < 4; i++) {
    const x = BELT_X + i * 20, y = HUD_Y + 8, s = P.belt[i];
    ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y - 1, 18, 18); ctx.fillStyle = '#1b1920'; ctx.fillRect(x, y, 16, 16);
    if (s) { ctx.drawImage(getIcon(s.kind, 1, 1), x + 2, y + 2); if (s.n > 1) txt(String(s.n), x + 15, y + 15, '#e8e2d0', 'right'); }
    txt(String(i + 1), x + 1, y + 7, '#6f6a79', 'left', false);
  }
  // menu buttons: two rows
  const rows = [[['INV', 'inv'], ['CHAR', 'char'], ['SKILL', 'skills'], ['MAP', 'map']], P.cls === 'miasmancer' || P.cls === 'monk' ? [['CARDS', 'arcana'], ['MENU', 'menu']] : P.cls === 'hemomancer' ? [['FLESH', 'blood'], ['CARDS', 'arcana'], ['MENU', 'menu']] : P.cls === 'ossumancer' ? [['ARMY', 'army'], ['CARDS', 'arcana'], ['MENU', 'menu']] : [['CHOIR', 'choir'], ['GOLEM', 'gbeh'], ['CARDS', 'arcana'], ['MENU', 'menu']]];
  rows.forEach((row, ri) => {
    let bx = 272; const by = HUD_Y + 3 + ri * 13;
    row.forEach(([label, id]) => {
      const w = tw(label) + 6, on = id === 'map' ? G.map : id === 'menu' ? false : G.panels[id];
      ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, w, 11);
      txt(label, bx + 3, by + 8, on ? '#e8e2d0' : '#a39d8c', 'left', false);
      if ((id === 'char' && P.statPts) || (id === 'skills' && P.skillPts) || (id === 'arcana' && P.arc.pts)) { ctx.fillStyle = '#d9a441'; ctx.fillRect(bx + w - 3, by, 3, 3); }
      uiButton(bx, by, w, 11, () => { if (id === 'map') G.map = !G.map; else if (id === 'menu') openMenu(); else if (id === 'choir' || id === 'gbeh' || id === 'army' || id === 'blood' || id === 'arcana') G.panels[id] = !G.panels[id]; else togglePanel(id); });
      if (inRect(mouse, bx, by, w, 11) && (id === 'choir' || id === 'gbeh' || id === 'army' || id === 'arcana')) tooltip = [[id === 'choir' ? 'Wisp choir (V)' : id === 'army' ? 'Army orders (V)' : id === 'arcana' ? `The Inverted Triune (A) · ${P.arc.pts} Arcana to spend` : 'Golem orders (G)', '#e8e2d0']];
      bx += w + 3;
    });
  });
  // menu button
  if (false) { ctx.fillStyle = '#1b1920'; ctx.fillRect(W - 16, 3, 13, 11); ctx.fillStyle = '#a39d8c'; for (let i = 0; i < 3; i++) ctx.fillRect(W - 13, 5 + i * 3, 7, 1);
  uiButton(W - 16, 3, 13, 11, () => openMenu());
  if (inRect(mouse, W - 16, 3, 13, 11)) tooltip = [['Menu (Esc)', '#e8e2d0']]; }
  // buffs
  let fx = 8;
  for (const k in P.buffs) { txt(`${k} ${Math.ceil(P.buffs[k])}s`, fx, 12, '#d8f3ff'); fx += tw(`${k} ${Math.ceil(P.buffs[k])}s`) + 10; }
  if (P.wraith) txt('WRAITH FORM', 8, 22, '#d8f3ff');
  else if (P.infuse) txt('POURING WISPS INTO YOUR GOLEM', 8, 22, '#d8f3ff');
  else if (P.condensing) txt(`CONDENSING ${G.great ? G.great.size : 0}/${WS.condMax()}`, 8, 22, '#d8f3ff');
  if (G.golem) {
    const g = G.golem, gx = 8, gy = 30;
    txt(g.state === 'dormant' ? `Golem dormant ${Math.ceil(g.rt)}s` : g.ramp > 0 ? `Golem RAMPAGE ${Math.ceil(g.ramp)}s` : `Golem ${Math.ceil(g.hp)}/${g.max} · charge ${Math.floor(g.charge)}/${WS.chargeMax()}`, gx, gy, g.state === 'dormant' ? '#6f6a79' : g.ramp > 0 ? '#ffffff' : '#aab4c2');
    if (G.flyShield) txt('Shield thrown', gx, gy + 10, '#8b93a0');
  }
  if (G.echoes.length) txt(`Echoes ${G.echoes.length}/${WS.echoMax()}` + (G.tether ? ` · tethered ${Math.ceil(G.tether.life)}s` : ''), 8, G.golem ? 50 : 30, '#bfe8ff');
  if (P.lancing) txt('SPIRIT LANCE', 8, 22, '#ffffff');
  if (P.cls === 'ossumancer') boneHudText(); else if (P.cls === 'hemomancer') bloodHudText(); else if (P.cls === 'miasmancer') miasHudText(); else if (P.cls === 'monk') monkHudText();
  if (P.shell) txt(`IRON SHELL ${Math.ceil(P.shell.pool)}/${Math.round(P.shell.max)}`, 8, G.golem ? 60 : 40, '#aab4c2');
  if (P.maiden > 0) txt(`IRON MAIDEN ${Math.ceil(P.maiden)}s`, 8, 50, '#8b93a0');
  if (G.timeStop > 0) txt('TIME STANDS STILL', W / 2, 40, '#b48ad9', 'center');
  if (false) {
  }
  // hover target name
  const h = G.hover;
  if (h && h.kind === 'mon') {
    const m = h.ref, col = m.rank === 'champion' ? '#8b95ff' : m.rank === 'unique' ? '#c9a45a' : m.rank === 'boss' ? '#c8553d' : '#e8e2d0';
    const w = Math.max(90, tw(m.name) + 16);
    ctx.fillStyle = 'rgba(10,9,13,0.85)'; ctx.fillRect(W / 2 - w / 2, 4, w, m.mods.length ? 24 : 16);
    ctx.fillStyle = '#5a1a20'; ctx.fillRect(W / 2 - w / 2, 4, Math.round(w * clamp(m.hp / m.max, 0, 1)), 14);
    txt(m.name, W / 2, 14, col, 'center');
    if (m.mods.length) txt(m.mods.join(', '), W / 2, 25, '#8b95ff', 'center');
  } else if (h && h.kind === 'obj') {
    const o = h.ref, name = o.type === 'lantern' ? o.name + ' Lantern' : o.type === 'chest' ? 'Chest' : o.type === 'shrine' ? 'Shrine' : o.name;
    txt(name, W / 2, 14, '#e8e2d0', 'center');
  }
  // boss bar
  const z = G.zone;
  if (G.bossFight && z.boss && !z.boss.dead) {
    const b = z.boss; txt(b.name, 90, HUD_Y - 12, '#e8e2d0');
    ctx.fillStyle = '#0a090d'; ctx.fillRect(89, HUD_Y - 9, 302, 6); ctx.fillStyle = '#8e2630'; ctx.fillRect(90, HUD_Y - 8, Math.round(300 * clamp(b.hp / b.max, 0, 1)), 4);
  }
  if (G.msgT > 0) { ctx.globalAlpha = Math.min(1, G.msgT * 2); txt(G.msg, W / 2, HUD_Y - 22, '#e8e2d0', 'center'); ctx.globalAlpha = 1; }
  if (G.bannerT > 0) {
    const a = clamp(Math.min(1, G.bannerT, (G.bannerMax - G.bannerT) * 2 + 0.2), 0, 1);
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H / 2 - 30, W, 30);
    ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = G.bannerCol; ctx.fillText(G.banner, W / 2, H / 2 - 10);
    ctx.globalAlpha = 1;
  }
  if (P.dead) txt('Your anima drifts back to the lantern...', W / 2, H / 2 + 14, '#a39d8c', 'center');
}

// =================================================================== panels & ui hit-testing
let BTN = [];
function uiButton(x, y, w, h, fn, rfn) { BTN.push({ x, y, w, h, fn, rfn }); }
const LP = { x: 0, y: 0, w: 236, h: HUD_Y };
const RP = { x: W - 236, y: 0, w: 236, h: HUD_Y };
const leftOpen = () => G.panels.char || G.panels.skills || G.panels.vendor || G.panels.lantern;
function uiBlocksMouse() {
  const mx = mouse.x, my = mouse.y;
  if (my >= HUD_Y) return true;
  if (G.panels.arcana) return true;
  if (G.pick) { const r = pickRect(); if (inRect(mouse, r.x, r.y, r.w, r.h)) return true; }
  if (G.panels.choir && inRect(mouse, POP.x, POP.y, POP.w, POP.h)) return true;
  if ((G.panels.gbeh || G.panels.army || G.panels.blood) && inRect(mouse, GB.x, GB.y, GB.w, GB.h)) return true;
  if (G.panels.inv && mx >= RP.x) return true;
  if (leftOpen() && mx < LP.w) return true;
  return false;
}
function panelBox(p, title) {
  gothicBg(p); titlePlate(p, title);
  ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#e8e2d0'; ctx.fillText(title, p.x + p.w / 2, p.y + 18);
  // close
  txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79');
  uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { if (p === RP) G.panels.inv = false; else G.panels.char = G.panels.skills = G.panels.vendor = G.panels.lantern = false; });
}
function smallBtn(label, x, y, fn, enabled = true) {
  const w = tw(label) + 8;
  ctx.fillStyle = enabled ? '#3a3446' : '#1f1c24'; ctx.fillRect(x, y, w, 12);
  txt(label, x + 4, y + 9, enabled ? '#e8e2d0' : '#5a5563', 'left', false);
  if (enabled) uiButton(x, y, w, 12, fn);
  return w;
}
const EQ_SLOTS = {
  head: [106, 26, 24, 24], neck: [136, 32, 12, 12], weapon: [18, 46, 24, 48], body: [106, 54, 24, 36],
  offhand: [194, 46, 24, 48], hands: [18, 102, 24, 24], ring1: [86, 98, 12, 12], waist: [106, 96, 24, 12],
  ring2: [136, 98, 12, 12], feet: [194, 102, 24, 24]
};
const GRID = { x: RP.x + 58, y: 140 };
let tooltip = null;
function drawInventory() {
  panelBox(RP, 'Inventory');
  for (const slot in EQ_SLOTS) {
    const [ox, oy, w, h] = EQ_SLOTS[slot], x = RP.x + ox, y = oy;
    ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = '#1b1920'; ctx.fillRect(x, y, w, h);
    const it = P.eq[slot];
    if (it) {
      const ic = getIcon(BASES[it.base].icon, it.w, it.h);
      const iw = Math.min(w, it.w * CELL), ih = Math.min(h, it.h * CELL);
      ctx.fillStyle = it.q === 'unique' ? 'rgba(201,164,90,0.15)' : it.q === 'rare' ? 'rgba(241,224,90,0.12)' : it.q === 'magic' ? 'rgba(139,149,255,0.12)' : 'rgba(0,0,0,0)';
      ctx.fillRect(x, y, w, h);
      ctx.drawImage(ic, Math.round(x + (w - iw) / 2), Math.round(y + (h - ih) / 2), iw, ih);
      if (inRect(mouse, x, y, w, h) && !G.cursorItem) tooltip = itemLines(it);
    }
    uiButton(x, y, w, h, () => equipSwap(slot), () => { if (P.eq[slot] && !G.cursorItem && invAdd(P.eq[slot])) { P.eq[slot] = null; D = derive(); } });
  }
  // grid
  ctx.fillStyle = '#0a090d'; ctx.fillRect(GRID.x - 1, GRID.y - 1, INV_W * CELL + 2, INV_H * CELL + 2);
  for (let y = 0; y < INV_H; y++) for (let x = 0; x < INV_W; x++) { ctx.fillStyle = (x + y) % 2 ? '#1b1920' : '#1e1c24'; ctx.fillRect(GRID.x + x * CELL, GRID.y + y * CELL, CELL, CELL); }
  for (const e of P.inv) {
    const it = e.item, x = GRID.x + e.x * CELL, y = GRID.y + e.y * CELL;
    if (it.q !== 'normal' && it.q !== 'potion') { ctx.fillStyle = it.q === 'unique' ? 'rgba(201,164,90,0.18)' : it.q === 'rare' ? 'rgba(241,224,90,0.14)' : 'rgba(139,149,255,0.16)'; ctx.fillRect(x, y, it.w * CELL, it.h * CELL); }
    ctx.drawImage(getIcon(it.potion || BASES[it.base].icon, it.w, it.h), x, y);
    if (it.lvl > P.level) { ctx.fillStyle = 'rgba(200,40,40,0.25)'; ctx.fillRect(x, y, it.w * CELL, it.h * CELL); }
    if (inRect(mouse, x, y, it.w * CELL, it.h * CELL) && !G.cursorItem) tooltip = itemLines(it).concat(G.panels.vendor ? [[`Sell value: ${itemValue(it)} gold (right-click)`, '#d9a441']] : []);
  }
  uiButton(GRID.x, GRID.y, INV_W * CELL, INV_H * CELL, () => gridClick(false), () => gridClick(true));
  txt(`Gold: ${P.gold}`, RP.x + 58, 206, '#d9a441');
  txt('Click to pick up and place.', RP.x + 12, 222, '#6f6a79', 'left', false);
  txt(G.panels.vendor ? 'Right-click an item to sell it.' : 'Right-click to equip or drink.', RP.x + 12, 232, '#6f6a79', 'left', false);
}
function inRect(m, x, y, w, h) { return m.x >= x && m.x < x + w && m.y >= y && m.y < y + h; }
function gridClick(right) {
  const cx = Math.floor((mouse.x - GRID.x) / CELL), cy = Math.floor((mouse.y - GRID.y) / CELL);
  const at = P.inv.find(e => cx >= e.x && cx < e.x + e.item.w && cy >= e.y && cy < e.y + e.item.h);
  if (right) {
    if (!at || G.cursorItem) return;
    if (G.panels.vendor) { P.gold += itemValue(at.item); P.inv.splice(P.inv.indexOf(at), 1); sfx(1200, 0.08, 'square', 0.03); return; }
    quickEquip(at); return;
  }
  const c = G.cursorItem;
  if (c) {
    const px = clamp(cx - Math.floor((c.w - 1) / 2), 0, INV_W - c.w), py = clamp(cy - Math.floor((c.h - 1) / 2), 0, INV_H - c.h);
    const over = invOverlaps(c, px, py);
    if (over.length === 0) { P.inv.push({ item: c, x: px, y: py }); G.cursorItem = null; }
    else if (over.length === 1) { P.inv.splice(P.inv.indexOf(over[0]), 1); P.inv.push({ item: c, x: px, y: py }); G.cursorItem = over[0].item; }
    sfx(240, 0.04, 'square', 0.025);
  } else if (at) { P.inv.splice(P.inv.indexOf(at), 1); G.cursorItem = at.item; sfx(300, 0.04, 'square', 0.025); }
}
function drawChar() {
  panelBox(LP, CLASS_NAME[P.cls] || 'Animancer');
  let y = 36;
  txt(`Level ${P.level}`, 14, y, '#d9a441'); txt(`Experience ${P.xp} / ${xpNext(P.level)}`, 222, y, '#a39d8c', 'right'); y += 16;
  txt(`Stat points: ${P.statPts}`, 14, y, P.statPts ? '#d9a441' : '#6f6a79'); y += 14;
  [['vit', 'Vitality', 'Life and stamina'], ['spi', 'Essence', P.cls === 'hemomancer' ? 'Vitae: size, refill, spell power' : P.cls === 'miasmancer' ? 'Miasma: size, refill, spell power' : P.cls === 'ossumancer' ? 'Essence and shards: size, refill, power' : 'Essence pool, refill and spell power'], ['con', 'Constitution', 'Melee, armor, stamina']].forEach(([k, name, desc]) => {
    ctx.fillStyle = '#1b1920'; ctx.fillRect(10, y - 9, 216, 22);
    txt(name, 14, y, '#e8e2d0'); txt(desc, 14, y + 10, '#6f6a79', 'left', false);
    const bonus = D[k] - P.attrs[k];
    txt(String(D[k]), 186, y + 4, bonus ? '#8b95ff' : '#e8e2d0', 'right');
    if (P.statPts > 0) smallBtn('+', 196, y - 4, () => { P.attrs[k]++; P.statPts--; D = derive(); });
    y += 24;
  });
  y += 2;
  const rows = [
    ['Life', `${Math.ceil(P.hp)} / ${D.maxHp}`], [P.cls === 'hemomancer' ? 'Vitae' : P.cls === 'miasmancer' ? 'Miasma' : P.cls === 'ossumancer' ? 'Marrow' : 'Essence', `${Math.ceil(P.mana)} / ${D.maxMana}` + (P.cls === 'hemomancer' ? ` · heals ${(vitaeHeal() * 100).toFixed(1)}%/s` : '') + (D.wardPct ? ` · ward ${Math.round(D.wardPct * 100)}%` : '')], ['Stamina', `${Math.ceil(P.stam)} / ${D.maxStam}`],
    ['Armor', `${D.armor}  (-${Math.round(100 - 10000 / (100 + D.armor))}% physical)`], ['Skill damage', `+${Math.round((D.dmgMult - 1) * 100)}%`],
    P.cls === 'miasmancer' ? ['Cloud', `${MS.auraR().toFixed(1)} yd · ${Math.round(MS.evade() * 100)}% of blows miss · ${MS.omenMax()} Omens`] : P.cls === 'hemomancer' ? ['Brood', `${HS.broodMax()} max · ${mutSlots()} mutation slots`] : P.cls === 'ossumancer' ? ['Shards', `${D.shardCap} max · 1 per ${(1 / BS.rate()).toFixed(2)}s · turns ${Math.round(BS.dr() * 100)}%`] : ['Wisps', `${D.wispCap} max (items +${D.itemWisps}, cap 3) · ${D.wispRegen.toFixed(2)}s`], ['Cast rate', `+${Math.round((D.castSpd - 1) * 100)}%`],
    ['Magic resist', `${D.res}%`], ['Magic find', `${D.mf}%`], ['Gold', `${P.gold}`]
  ];
  rows.forEach(([a, b]) => { txt(a, 14, y, '#a39d8c'); txt(b, 222, y, '#e8e2d0', 'right'); y += 9.5; });
  if (P.fate && inRect(mouse, 8, 30, 220, 20)) tooltip = [['Your fate, as the Mysterious Stranger read it', '#b48ad9']].concat(...fateLines().map(([a, b]) => [[a, '#e8e2d0'], ['  ' + b, '#8b95ff']]));
  if (P.fate) txt('fate', 118, 36, '#6a5a7a', 'center', false);
  smallBtn(`Reset all (${P.respecs})`, 138, 43, () => respecStats(), P.respecs > 0);
}
// D2-style skill tree: three tabs (Iron, Anima, Logos), a 3×6 grid, prerequisite arrows, click to learn
const TREE = { col: c => 30 + c * 58, row: r => 42 + r * 31 };
// a hover tooltip for any skill: what it does, what it costs, what it does now
function skillTip(id) {
  if (!id || id === 'attack' || !SK[id]) return [['Attack', '#e8e2d0'], ['Strike with your weapon', '#a39d8c']];
  const s = SK[id], l = P.skills[id] || 0, res = P.cls === 'hemomancer' ? 'Vitae' : P.cls === 'miasmancer' ? 'Miasma' : P.cls === 'ossumancer' ? 'Marrow' : 'Essence';
  const out = [[s.name + (l ? ` (level ${l})` : ''), '#e8e2d0']].concat(wrap(s.desc, 46).map(t => [t, '#a39d8c']));
  if (s.mana) out.push([`${res}: ${skillCost(id).toFixed(1)}` + (P.cls === 'hemomancer' ? ` · life ${(bloodLifeCost(skillCost(id)) * 100 / Math.max(1, D.maxHp)).toFixed(1)}% now` : ''), '#5c86d6']);
  if (s.stam) out.push([`Stamina: ${s.stam}`, '#d9a441']);
  if (s.shards) out.push([`Bone shards: ${s.shards}`, '#e8e2d0']);
  const info = skillInfo(id, l || 1); if (info) out.push([(l ? 'Now: ' : 'Level 1: ') + info, '#8b95ff']);
  return out.concat(synLines(id));
}
function keyOf(id) { for (const k in P.keys) if (P.keys[k] === id) return k.toUpperCase(); return ''; }
function treeArrow(pa, ch, lit) {
  const px = TREE.col(pa.c), py = TREE.row(pa.r), cx = TREE.col(ch.c), cy = TREE.row(ch.r);
  ctx.strokeStyle = lit ? '#a39d8c' : '#3f3a4a'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1;
  const between = SK_ORDER.some(id => { const s = SK[id]; return s.cls === ch.cls && s.tab === ch.tab && s.c === ch.c && s.r > pa.r && s.r < ch.r; });
  ctx.beginPath();
  if (pa.c === ch.c && !between) {
    ctx.moveTo(px + .5, py + 12); ctx.lineTo(cx + .5, cy - 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 2.5, cy - 15); ctx.lineTo(cx + 3.5, cy - 15); ctx.lineTo(cx + .5, cy - 12); ctx.fill();
  } else {
    // route through the gutters so arrows never cross an icon
    const gy = py + 15.5, gx = cx + (ch.c > pa.c || (ch.c === pa.c) ? -20.5 : 20.5);
    ctx.moveTo(px + .5, py + 12); ctx.lineTo(px + .5, gy); ctx.lineTo(gx, gy); ctx.lineTo(gx, cy + .5);
    if (gx < cx) { ctx.lineTo(cx - 14, cy + .5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 15, cy - 2.5); ctx.lineTo(cx - 15, cy + 3.5); ctx.lineTo(cx - 12, cy + .5); ctx.fill(); }
    else { ctx.lineTo(cx + 14, cy + .5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + 15, cy - 2.5); ctx.lineTo(cx + 15, cy + 3.5); ctx.lineTo(cx + 12, cy + .5); ctx.fill(); }
  }
}
function drawSkills() {
  const p = LP;
  gothicBg(p);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  ctx.strokeStyle = '#0a090d'; ctx.strokeRect(p.x + 2.5, p.y + 2.5, p.w - 5, p.h - 5);
  txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79');
  uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.skills = false; });
  // points
  ctx.fillStyle = '#0a090d'; ctx.fillRect(182, 8, 44, 28); ctx.strokeStyle = '#3a3446'; ctx.strokeRect(182.5, 8.5, 43, 27);
  txt('POINTS', 204, 18, '#8f8a7c', 'center', false);
  ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = P.skillPts ? '#d9a441' : '#6f6a79'; ctx.fillText(String(P.skillPts), 204, 33);
  // tabs on the right edge, like D2
  tabNames().forEach((name, t) => {
    const y = 44 + t * 46, on = G.tab === t;
    ctx.fillStyle = on ? '#2a2733' : '#16141a'; ctx.fillRect(182, y, 44, 42);
    ctx.strokeStyle = on ? '#8f8a7c' : '#3a3446'; ctx.strokeRect(182.5, y + .5, 43, 41);
    ctx.font = TITLE_FONT; if (ctx.measureText(name).width > 42) ctx.font = '12px "IM Fell English SC", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = on ? '#e8e2d0' : '#8f8a7c'; ctx.fillText(name, 204, y + 20);
    let n = 0; for (const id of SK_ORDER) if (SK[id].tab === t && SK[id].cls === P.cls) n += P.hard[id] || 0;
    txt(`${n} pts`, 204, y + 34, on ? '#d9a441' : '#6f6a79', 'center', false);
    uiButton(182, y, 44, 42, () => { G.tab = t; });
  });
  // grid frame
  ctx.fillStyle = '#0d0c11'; ctx.fillRect(8, 24, 170, 196);
  ctx.strokeStyle = '#2a2733'; ctx.strokeRect(8.5, 24.5, 169, 195);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText(tabNames()[G.tab], 10, 19);
  ROWREQ.forEach((lv, r) => txt(String(lv), 12, TREE.row(r) + 3, '#3f3a4a', 'left', false));
  const ids = SK_ORDER.filter(id => SK[id].tab === G.tab && SK[id].cls === P.cls);
  for (const id of ids) { const s = SK[id]; if (s.pre && SK[s.pre].tab === G.tab) treeArrow(SK[s.pre], s, P.skills[s.pre] > 0); }
  for (const id of ids) {
    const s = SK[id], l = P.skills[id] || 0, ready = skillReady(id), cx = TREE.col(s.c), cy = TREE.row(s.r);
    const hl = P.hard[id] || 0, x = cx - 9, y = cy - 9, canAdd = P.skillPts > 0 && ready && hl < 20;
    ctx.fillStyle = canAdd ? '#d9a441' : l > 0 ? '#8f8a7c' : '#2a2733'; ctx.fillRect(x - 3, y - 3, 24, 24);
    if (!ready) ctx.globalAlpha = 0.35;
    skillIcon(id, x, y, l > 0);
    ctx.globalAlpha = 1;
    if (s.kind === 'weapon' && P.gweapon === id) { ctx.strokeStyle = '#d8f3ff'; ctx.strokeRect(x - 4.5, y - 4.5, 27, 27); }
    const kk = keyOf(id); if (kk && l > 0) txt(kk, x - 1, y + 5, '#d9a441', 'left');
    (s.perks || []).forEach((pk, pi) => { ctx.fillStyle = perkOn(id, pi) ? '#d9a441' : '#2a2733'; ctx.fillRect(x - 2 + pi * 4, y + 20, 3, 2); });
    if (P.right === id) txt('R', x - 1, y + 17, '#d8f3ff', 'left');
    ctx.fillStyle = '#0a090d'; ctx.fillRect(cx + 5, cy + 5, 12, 9);
    txt(String(l), cx + 11, cy + 12, l > hl ? '#8b95ff' : l > 0 ? '#e8e2d0' : '#6f6a79', 'center', false);
    uiButton(x - 3, y - 3, 24, 24, () => {
      if (learn(id)) return;
      if (s.kind === 'weapon' && l > 0) { P.gweapon = id; say(`Golem wields the ${s.name}`, 1.2); }
      else if (!ready) say(P.level < s.req ? `Requires level ${s.req}` : `Requires ${SK[s.pre].name}`, 1.2);
    }, () => {
      if (s.kind === 'weapon' && l > 0) { P.gweapon = id; say(`Golem wields the ${s.name}`, 1.2); }
      else if ((s.kind === 'cast' || s.kind === 'hold') && l > 0) { if (keys.has('shift')) setLeft(id); else setRight(id); }
    });
    if (inRect(mouse, x - 3, y - 3, 24, 24)) {
      G.hoverSkill = id;
      const lines = [[s.name, '#e8e2d0']].concat(wrap(s.desc, 46).map(t => [t, '#a39d8c']));
      if (s.mana) lines.push([`${P.cls === 'hemomancer' ? 'Vitae' : P.cls === 'miasmancer' ? 'Miasma' : P.cls === 'ossumancer' ? 'Marrow' : 'Essence'}: ${skillCost(id, Math.max(1, l)).toFixed(1)}${l > 0 && hl < 20 ? ` (next level ${skillCost(id, l + 1).toFixed(1)})` : ''}${s.kind === 'hold' ? (id === 'lance' ? '/s' : id === 'colossus' || id === 'host' ? ' per skeleton fused' : ' per wisp') : ''}`, '#5c86d6']);
      if (s.mana && P.cls === 'hemomancer') { const c = skillCost(id, Math.max(1, l)); const pc = v => (v * 100 / Math.max(1, D.maxHp)).toFixed(1) + '%'; lines.push([`Life: ${pc(bloodLifeCost(c))} of max now · castable at 1 life (weaker), never lethal`, '#c24050']); }
      if (s.shards) lines.push([`Bone shards: ${s.shards}`, '#e8e2d0']);
      if (id === 'raise') lines.push(['Each standing skeleton holds 5 shards of the aura', '#e8e2d0']);
      lines.push([(l > 0 ? 'Now: ' : 'Level 1: ') + skillInfo(id, l || 1), '#8b95ff']);
      if (l > hl) lines.push([`${hl} points + ${l - hl} from items and Major Arcana`, '#8b95ff']);
      if (l > 0 && hl < 20) lines.push(['Next: ' + skillInfo(id, l + 1), '#6f7bd8']);
      for (const [pi, pk] of (s.perks || []).entries()) {
        const on = perkOn(id, pi), need = `lv ${pk.l}` + (pk.stat ? ` + ${pk.stat[1]} ${STAT_NAME[pk.stat[0]]}` : '');
        lines.push([(on ? '+ ' : '- ') + pk.name + (on ? '' : ` (${need})`), on ? '#d9a441' : '#6f6a79']);
        wrap(pk.desc, 46).forEach(t => lines.push(['   ' + t, on ? '#a39d8c' : '#5a5563']));
      }
      for (const q of synLines(id)) lines.push(q);
      if (s.pre && !P.skills[s.pre]) lines.push([`Requires ${SK[s.pre].name}`, '#c8553d']);
      if (P.level < s.req) lines.push([`Requires level ${s.req}`, '#c8553d']);
      const how = s.kind === 'weapon' ? (l > 0 ? (P.gweapon === id ? 'Wielded by your golem' : 'Right-click: golem wields it') : 'Learn it to arm your golem')
        : s.kind === 'cast' || s.kind === 'hold' ? 'Right-click: right skill · Shift+right-click: left skill · hover + key: hotkey' : 'Passive';
      lines.push([how, '#6f6a79']);
      tooltip = lines;
    }
  }
  txt('Click: learn · Right-click: use · Hover + key: bind', 10, 234, '#6f6a79', 'left', false);
  smallBtn(`Reset ${P.respecs}`, 184, 186, () => respecSkills(), P.respecs > 0);
  if (inRect(mouse, 184, 186, 44, 12)) tooltip = [['Full reset', '#e8e2d0'], ['Refunds skills, attributes and Arcana', '#a39d8c'], [`${P.respecs} left · bosses leave Hollow Tokens`, '#a39d8c']];
}
function wrap(t, n) { const out = []; let line = ''; for (const w of t.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; }
// wisp choir: choose how many of each wisp type you keep
const POP = { x: 62, y: HUD_Y - 168, w: 176, h: 166 };
function drawChoir() {
  const p = POP;
  gothicBg(p, true);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
  txt('WISP CHOIR', p.x + 6, p.y + 10, '#d9a441');
  txt('V', p.x + p.w - 8, p.y + 10, '#6f6a79', 'right', false);
  const tg = wispTargets(), c = countKinds(), resv = reservedWisps();
  const rows = [['rev', 'Revenant', '#d8f3ff'], ['beam', 'Beam', '#ffe2a0'], ['prism', 'Prism', '#e0c8ff']];
  rows.forEach(([k, name, col], i) => {
    const y = p.y + 16 + i * 15;
    ctx.fillStyle = '#1b1920'; ctx.fillRect(p.x + 4, y, p.w - 8, 13);
    ctx.fillStyle = col; ctx.fillRect(p.x + 8, y + 5, 3, 3);
    txt(k === 'rev' ? 'Revnt' : name, p.x + 15, y + 9, '#e8e2d0', 'left', false);
    txt(`${c[k]}/${tg[k]}`, p.x + 88, y + 9, col, 'right', false);
    if (k === 'rev') { txt('the rest', p.x + 92, y + 9, '#6f6a79', 'left', false); return; }
    if (!P.skills[k]) { txt(`learn ${SK[k].name}`, p.x + 88, y + 9, '#5a5563', 'left', false); return; }
    smallBtn('-', p.x + 92, y, () => { P.alloc[k] = Math.max(0, tg[k] - 1); }, tg[k] > 0);
    smallBtn('+', p.x + 108, y, () => { P.alloc[k] = tg[k] + 1; }, tg.rev > 0);
    smallBtn('max', p.x + 124, y, () => { P.alloc[k] = tg[k] + tg.rev; }, tg.rev > 0);
  });
  txt(`${D.wispCap} total · ${resv} held by skills`, p.x + 6, p.y + 68, '#6f6a79', 'left', false);
  // behavior: the same grid as the golem's
  const W = P.wbeh, gx = p.x + 20, gy = p.y + 88, cs = 11;
  txt('BEHAVIOR', p.x + 6, p.y + 80, '#d9a441');
  txt('ATTACK', gx + cs * 2.5, gy - 2, '#c8553d', 'center', false);
  txt('GUARD', gx + cs * 2.5, gy + cs * 5 + 8, '#5c86d6', 'center', false);
  for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) {
    const cx = gx + xx * cs, cy = gy + yy * cs, on = W.x === xx && 4 - W.y === yy, agg = (4 - yy) / 4;
    ctx.fillStyle = `rgb(${24 + agg * 40},${22 + xx * 3},${30 + (1 - agg) * 30})`; ctx.fillRect(cx, cy, cs - 1, cs - 1);
    if (on) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 3, cy + 3, 4, 4); ctx.strokeStyle = '#d9a441'; ctx.strokeRect(cx - .5, cy - .5, cs, cs); }
    uiButton(cx, cy, cs - 1, cs - 1, () => { W.x = xx; W.y = 4 - yy; });
  }
  txt('close', gx - 2, gy + cs * 5 + 16, '#6f6a79', 'left', false); txt('roam', gx + cs * 5, gy + cs * 5 + 16, '#6f6a79', 'right', false);
  const tx = p.x + 90;
  [['focus', 'Attack my target'], ['hold', 'Hold fire']].forEach(([k, label], i) => {
    const y = p.y + 90 + i * 14;
    ctx.fillStyle = '#0a090d'; ctx.fillRect(tx, y, 9, 9); ctx.fillStyle = W[k] ? '#d9a441' : '#2a2733'; ctx.fillRect(tx + 2, y + 2, 5, 5);
    txt(label, tx + 12, y + 8, '#e8e2d0', 'left', false);
    uiButton(tx, y, 80, 11, () => { W[k] = !W[k]; });
  });
  const desc = W.hold ? ['Wisps drift and', 'never attack'] : [W.y <= 1 ? 'Only strike what' : 'Seek out enemies', W.y <= 1 ? 'threatens you' : `up to ${wispRange(4.6).toFixed(1)} yd away`];
  desc.forEach((l, i) => txt(l, tx, p.y + 128 + i * 9, '#8f8a7c', 'left', false));
}
// golem orders, Secret of Mana style: place the golem on the grid, plus toggles
const GB = { x: 124, y: 18, w: 232, h: 176 };
function drawGolemOrders() {
  const p = GB, B = P.gbeh, O = golemOrders();
  gothicBg(p, true);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText('Golem orders', p.x + 8, p.y + 16);
  txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79'); uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.gbeh = false; });
  const gx = p.x + 26, gy = p.y + 34, cs = 16;
  txt('ATTACK', gx + cs * 2.5, gy - 4, '#c8553d', 'center', false);
  txt('GUARD', gx + cs * 2.5, gy + cs * 5 + 9, '#5c86d6', 'center', false);
  txt('CLOSE', gx - 3, gy + cs * 5 + 18, '#6f6a79', 'left', false); txt('ROAM', gx + cs * 5 + 3, gy + cs * 5 + 18, '#6f6a79', 'right', false);
  for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) {
    const cx = gx + xx * cs, cy = gy + yy * cs, on = B.x === xx && 4 - B.y === yy;
    const agg = (4 - yy) / 4, rng = xx / 4;
    ctx.fillStyle = `rgb(${24 + agg * 40},${22 + rng * 10},${30 + (1 - agg) * 30})`; ctx.fillRect(cx, cy, cs - 1, cs - 1);
    if (on) { skillIcon('golem', cx - 1, cy - 1, true); ctx.strokeStyle = '#d9a441'; ctx.strokeRect(cx - 1.5, cy - 1.5, cs + 2, cs + 2); }
    uiButton(cx, cy, cs - 1, cs - 1, () => { B.x = xx; B.y = 4 - yy; });
  }
  const tx = p.x + 124;
  const tog = [['charge', 'Shield charges'], ['toss', 'Shield toss'], ['focus', 'Attack my target'], ['hold', 'Hold position']];
  tog.forEach(([k, label], i) => {
    const y = p.y + 34 + i * 16, on = B[k], dis = k === 'toss' && !P.skills.toss;
    ctx.fillStyle = '#0a090d'; ctx.fillRect(tx, y, 9, 9); ctx.fillStyle = on && !dis ? '#d9a441' : '#2a2733'; ctx.fillRect(tx + 2, y + 2, 5, 5);
    txt(label, tx + 13, y + 8, dis ? '#5a5563' : '#e8e2d0', 'left', false);
    uiButton(tx, y, 100, 11, () => { B[k] = !B[k]; if (k === 'hold' && G.golem) G.golem.hold = B.hold ? { x: G.golem.x, y: G.golem.y } : null; });
  });
  txt('WEAPON', tx, p.y + 104, '#8f8a7c', 'left', false);
  WEAPONS.forEach((wid, i) => {
    const bx = tx + i * 34, by = p.y + 108, on = P.gweapon === wid;
    ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, 30, 22); if (on) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(bx + .5, by + .5, 29, 21); }
    skillIcon(wid, bx + 6, by + 2, on);
    uiButton(bx, by, 30, 22, () => { P.gweapon = wid; say(`Golem wields the ${WEAPON_NAMES[wid]}`, 1.2); });
    if (inRect(mouse, bx, by, 30, 22)) { const w = WS.weapon(wid); tooltip = [[WEAPON_NAMES[wid], '#e8e2d0'], [wid === 'sword' ? 'Fast strikes that sometimes land twice' : wid === 'axe' ? 'Slow swings that cleave a wide arc' : 'Slow, long-reaching smashes that stun', '#a39d8c'], [`x${w.mult.toFixed(2)} damage`, '#8b95ff']]; }
  });
  const lines = [`Engages foes within ${O.aggro.toFixed(1)} yd`, O.guard ? 'Only fights what threatens you' : 'Seeks out any enemy', B.hold ? 'Holds where you last placed it' : 'Follows you'];
  lines.forEach((l, i) => txt(l, gx - 18, p.y + 142 + i * 8, '#8f8a7c', 'left', false));
  txt('Cast Iron Golem again to send it somewhere', gx - 18, p.y + 168, '#6f6a79', 'left', false);
}
function pickOptions() { return G.pick === 'L' ? LEFT_SKILLS.filter(id => id === 'attack' || P.skills[id] > 0) : RIGHT_SKILLS.filter(id => id === 'attack' || P.skills[id] > 0); }
function pickRect() {
  const n = Math.max(1, pickOptions().length), per = 8, cols = Math.min(per, n), rows = Math.ceil(n / per), w = cols * 20 + 4, h = rows * 20 + 2;
  return G.pick === 'L' ? { x: 44, y: HUD_Y - 2 - h, w, h, cols } : { x: W - 42 - w, y: HUD_Y - 2 - h, w, h, cols };
}
function drawPick() {
  const r = pickRect(), opts = pickOptions(), cur = G.pick === 'L' ? P.left : P.right;
  ctx.fillStyle = 'rgba(14,13,18,0.97)'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
  if (!opts.length) { txt('Nothing learned', r.x + 2, r.y - 3, '#6f6a79'); return; }
  opts.forEach((id, i) => {
    const x = r.x + 3 + (i % r.cols) * 20, y = r.y + 2 + Math.floor(i / r.cols) * 20;
    skillIcon(id, x, y, id === cur);
    if (id === cur) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(x - .5, y - .5, 19, 19); }
    const kk = id === 'attack' ? '' : keyOf(id); if (kk) txt(kk, x + 1, y + 7, '#d9a441', 'left');
    uiButton(x, y, 18, 18, () => { if (G.pick === 'L') setLeft(id); else setRight(id); G.pick = null; });
    if (inRect(mouse, x, y, 18, 18)) { G.hoverSkill = id; tooltip = skillTip(id).concat(id === 'attack' ? [] : [['Press a key to bind it', '#6f6a79']]); }
  });
}
function drawVendor() {
  panelBox(LP, 'Maren the Gravekeeper');
  txt('"The dead do not need coin. I do."', 118, 38, '#a39d8c', 'center');
  let y = 58;
  [['hp', 'Healing Draught'], ['mp', 'Essence Draught']].forEach(([k, name]) => {
    ctx.fillStyle = '#1b1920'; ctx.fillRect(10, y - 9, 216, 22);
    ctx.drawImage(getIcon(k, 1, 1), 14, y - 7);
    txt(name, 32, y + 2, '#e8e2d0');
    smallBtn('Buy 30g', 170, y - 5, () => { if (P.gold < 30) { say('Not enough gold', 1.2); return; } const it = newPotion(k); if (beltAdd(it) || invAdd(it)) { P.gold -= 30; sfx(1200, 0.06, 'square', 0.03); } else say('No room', 1); }, P.gold >= 30);
    y += 28;
  });
  txt(`Your gold: ${P.gold}`, 14, y + 6, '#d9a441');
  txt('Right-click items in your inventory to sell.', 14, y + 22, '#6f6a79', 'left', false);
}
function drawLantern() {
  panelBox(LP, 'Lantern');
  txt('You rest. Life, Essence and wisps are restored.', 118, 38, '#a39d8c', 'center');
  txt('This lantern is now where you return if you fall.', 118, 50, '#6f6a79', 'center', false);
  txt('Travel to:', 14, 72, '#e8e2d0');
  let y = 84;
  for (const key of P.found) {
    const [zid, idx] = key.split(':'); const zname = ZONE_NAMES[zid] || zid;
    const z = G.zones[zid]; const l = z ? z.lanterns[+idx] : null; const name = l ? l.name : key;
    const here = G.zone.id === zid && P.lastLantern.idx === +idx && P.lastLantern.zone === zid;
    smallBtn(`${name} · ${zname}`, 14, y, () => { G.panels.lantern = false; P.lastLantern = { zone: zid, idx: +idx }; enterZone(zid, null, +idx); }, !here);
    y += 16;
  }
}
function drawTooltip() {
  if (!tooltip) return;
  const lines = tooltip, w = Math.max(...lines.map(l => tw(l[0]))) + 10, h = lines.length * 10 + 6;
  let x = mouse.x + 10, y = mouse.y + 10;
  if (x + w > W) x = mouse.x - w - 6; if (y + h > HUD_Y) y = HUD_Y - h - 2; if (x < 0) x = 0; if (y < 0) y = 0;
  ctx.fillStyle = 'rgba(6,5,9,0.96)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#0a090d'; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); ctx.strokeStyle = '#3a3446'; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  const qc = lines[0] && lines[0][1] || '#8a6a2a'; ctx.fillStyle = qc; ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillStyle = '#d9a441'; for (const [cx, cy] of [[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + h - 3], [x + w - 3, y + h - 3]]) ctx.fillRect(cx, cy, 2, 2);
  lines.forEach((l, i) => txt(l[0], x + w / 2, y + 11 + i * 10, l[1], 'center', false));
}
function uiClick(mx, my, button) {
  for (let i = BTN.length - 1; i >= 0; i--) {
    const b = BTN[i];
    const pd = G.touch ? 3 : 0;
    if (mx >= b.x - pd && mx < b.x + b.w + pd && my >= b.y - pd && my < b.y + b.h + pd) { if (button === 0 && b.fn) b.fn(); if (button === 2 && b.rfn) b.rfn(); return true; }
  }
  if (G.pick) { G.pick = null; return true; }
  if (my >= HUD_Y) {
    for (let i = 0; i < 4; i++) if (mx >= BELT_X + i * 20 && mx < BELT_X + i * 20 + 16) { drinkBelt(i); return true; }
    return true;
  }
  return uiBlocksMouse();
}

// =================================================================== frame
function renderAll() {
  BTN = []; tooltip = null; G.hoverSkill = null;
  render();
  if (!G.zone) return;
  if (G.map) drawMap();
  drawHud();
  if (G.panels.char) drawChar(); else if (G.panels.skills) drawSkills(); else if (G.panels.vendor) drawVendor(); else if (G.panels.lantern) drawLantern();
  if (G.panels.inv) drawInventory();
  if (G.panels.choir) drawChoir();
  if (G.panels.gbeh) drawGolemOrders();
  if (G.panels.army) drawArmy();
  if (G.panels.blood) drawBloodPanel();
  if (G.panels.arcana) drawArcana();
  if (G.pick) drawPick();
  drawTouchUI(); drawSkyDial();
  drawTooltip();
  drawPadCursor();
  if (G.cursorItem) { const it = G.cursorItem; ctx.drawImage(getIcon(it.potion || BASES[it.base].icon, it.w, it.h), Math.round(mouse.x - it.w * 6), Math.round(mouse.y - it.h * 6)); }
  if (G.error) txt('Error: ' + G.error.slice(0, 70), 4, 56, '#ff7a6a');
}
function update(dt) {
  if (G.msgT > 0) G.msgT -= dt;
  if (G.bannerT > 0) G.bannerT -= dt;
  G.shake = Math.max(0, G.shake - dt * 12);
  updateTouch(dt); trackDir(); updateAtmos(dt); updateDeath(dt); updateJuice(dt);
  updatePlayer(dt);
  updateGolem(dt);
  updateGreat(dt);
  updateSpells(dt);
  updateArcana(dt);
  updateMonsters(dt);
  updateProjectiles(dt);
  updateMissiles(dt); updateEFires(dt); updateBoneWalls(dt); updateDay(dt); G.dtLast = dt;
  G.saveT -= dt; if (G.saveT <= 0) { G.saveT = 20; save(); }
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // v0.21: slow devices drop the costliest effects (bloom, mote lights, light shafts) automatically
  if (G.running) { G.fAvg = (G.fAvg || 16) * 0.97 + dt * 1000 * 0.03; if (!G.lowFx && G.fAvg > 24) { G.lowFx = true; } else if (G.lowFx && G.fAvg < 17.5) G.lowFx = false; }
  try {
    updateMusic();
    try { pollPad(dt); } catch (e) { }
    if (G.divine) { G.time += dt; updateDivine(dt); drawDivine(); drawPadCursor(); return; }
    if (!G.running && !G.divine && !document.getElementById('intro').hidden) { G.time += dt; drawTitleScene(dt); return; }
    if (G.running && !G.paused) { if (JUICE.stop > 0) JUICE.stop -= dt; else { G.time += dt; update(dt); } }
    if (G.zone && D) renderAll();
  } catch (e) { reportError(e); }
}
requestAnimationFrame(frame);

// =================================================================== start
// =================================================================== game menu
const menuEl = document.getElementById('menu');
document.getElementById('menuKeys').innerHTML = document.getElementById('introKeys').innerHTML;
function menuOpen() { return !menuEl.hidden; }
function anyPanelOpen() { return Object.values(G.panels).some(Boolean) || G.map || !!G.pick || !!G.cursorItem; }
function openMenu() {
  if (!G.running) return;
  G.paused = true; menuEl.hidden = false; mouse.l = mouse.r = false; mouse.holdMove = false;
  document.getElementById('menuKeys').hidden = true; document.getElementById('menuMain').hidden = false;
  document.getElementById('mSound').textContent = 'Sound: ' + (muted ? 'off' : 'on');
  document.getElementById('menuWhere').textContent = `Level ${P.level} ${CLASS_NAME[P.cls] || 'Animancer'} · ${G.zone ? G.zone.name : ''}` + (G.saveKey === 'spiritmancer.test' ? ' · test character' : '');
  document.getElementById('mResume').focus();
}
function closeMenu() { menuEl.hidden = true; G.paused = false; cv.focus(); }
document.getElementById('mResume').addEventListener('click', closeMenu);
document.getElementById('mSave').addEventListener('click', () => { save(); document.getElementById('mSave').textContent = 'Saved'; setTimeout(() => { document.getElementById('mSave').textContent = 'Save game'; }, 1200); });
document.getElementById('mKeys').addEventListener('click', () => { const k = document.getElementById('menuKeys'); k.hidden = !k.hidden; });
document.getElementById('mSound').addEventListener('click', () => { muted = !muted; document.getElementById('mSound').textContent = 'Sound: ' + (muted ? 'off' : 'on'); });
document.getElementById('mMusic').addEventListener('click', () => { musSetOn(!MUS.on); document.getElementById('mMusic').textContent = 'Music: ' + (MUS.on ? 'on' : 'off'); });
document.getElementById('mMusic').textContent = 'Music: ' + (MUS.on ? 'on' : 'off');
// v0.22: options
function autoOn() { return OPT.auto == null ? !!G.touch : !!OPT.auto; }
function optLabels() {
  const on = v => v ? 'on' : 'off', el = id => document.getElementById(id);
  el('oNums').textContent = 'Damage numbers: ' + on(OPT.dmgNums); el('oFlash').textContent = 'Hit flash: ' + on(OPT.flash);
  el('oShake').textContent = 'Screen shake: ' + on(OPT.shake); el('oAuto').textContent = 'Auto-attack: ' + on(autoOn());
}
document.getElementById('mOpts').addEventListener('click', () => { const o = document.getElementById('menuOpts'); o.hidden = !o.hidden; optLabels(); });
document.getElementById('oNums').addEventListener('click', () => { OPT.dmgNums = !OPT.dmgNums; saveOpts(); optLabels(); });
document.getElementById('oFlash').addEventListener('click', () => { OPT.flash = !OPT.flash; saveOpts(); optLabels(); });
document.getElementById('oShake').addEventListener('click', () => { OPT.shake = !OPT.shake; saveOpts(); optLabels(); });
document.getElementById('oAuto').addEventListener('click', () => { OPT.auto = !autoOn(); saveOpts(); optLabels(); });
optLabels();
document.getElementById('mQuit').addEventListener('click', () => {
  save(); menuEl.hidden = true; G.paused = false; G.running = false; closeAll();
  const ex = loadSave(); if (ex) { contBtn.hidden = false; contBtn.textContent = `Continue (level ${ex.level})`; }
  document.getElementById('intro').hidden = false;
});
menuEl.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } });

const CLASS_NAME = { animancer: 'Hollow Mystic', ossumancer: 'Ossuarch', hemomancer: 'Hemomancer', miasmancer: 'Shrine Keeper', monk: 'The Empty Hand' };   // v0.36: the orders' names
function startGame(mode) {
  try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; }
  G.seed = (Math.random() * 1e9) | 0;
  G.zones = {}; G.zone = null; G.bossFight = false; G.seal = []; G.paused = false; P.dead = false; P.remnant = null; P.found = ['moor:0']; P.lastLantern = { zone: 'moor', idx: 0 }; P.buffs = {};
  G.saveKey = mode === 'test' ? 'spiritmancer.test' : 'spiritmancer.save.v2';
  const saved = mode === 'continue' ? loadSave() : null;
  if (saved) applySave(saved); else if (mode === 'test') testCharacter(); else newCharacter();
  D = derive();
  enterZone('moor');
  P.hp = D.maxHp; P.mana = D.maxMana; P.stam = D.maxStam; G.golem = null; G.anvils = []; G.pillars = []; G.flyShield = null; G.great = null; G.echoes = []; G.tether = null; G.orbs = []; G.shards = []; G.storms = []; G.phantoms = []; G.eshots = []; G.fissures = []; P.lancing = false; P.lance = null; resetBone(); resetBlood(); resetArcana(); resetMias();
  fillWisps();
  document.getElementById('intro').hidden = true;
  G.running = true; cv.focus();
  say(mode === 'test' ? 'Test character: level 30, 120 skill points (S), 145 stat points (C)' : saved ? `Welcome back, ${CLASS_NAME[P.cls] || 'Animancer'}` : 'Find the Hollow Crypt beyond the Ashen Moor', 4);
  if (mode === 'test') G.panels.skills = true;
  if (mode === 'new') { G.panels.skills = true; say('You have one skill point: choose your first skill (S). Every level gives another.', 5); }
  G.tab = P.cls === 'animancer' ? 1 : 0;
}
const existing = loadSave();
const contBtn = document.getElementById('continueBtn');
if (existing) { contBtn.hidden = false; contBtn.textContent = `Continue (level ${existing.level})`; }
contBtn.addEventListener('click', () => startGame('continue'));
document.getElementById('newBtn').addEventListener('click', () => beginDivination());
document.getElementById('testBtn').addEventListener('click', () => beginDivination(true));
G.pickCls = 'animancer';
window.__spm = { heroFrame: (...a) => heroFrame(...a), heroGear: () => heroGear(), altarInteract, dressZone, gainArcana: (...a) => gainArcana(...a), arcWhyNot: (...a) => arcWhyNot(...a), dayK, lightLevel, GODS22, monFrame: (...a) => monFrame(...a), MPAL, MPAINT_HR, makeMon, MON, OPT, AI22, poiseHit, playerPoiseHit, bloodLifeCost, feedFGolem, updateAuto: typeof updateAuto === 'function' ? updateAuto : null, FATE, fateFx, golemBoostCap, T, terrainSpd, HS, MUS, bloodCast, hatchLing, addPool, G_: G, SL, rearm, nextSquad, BS, boneCast, fuseOne, toggleHost, hostOne, G, P, enterZone, usePortal, learn, mouse, WS, startGame, wispTargets, countKinds, iso, castSkill, reservedWisps, effCap, addCharge, SK, ARC, takeCard, flipCard, web, arcOf, killMon, hurtMon, gainXp, xpNext, getD: () => D, rederive: () => { D = derive(); return D; }, skelDies, raiseSkel, spikeBurst, chillMon, burnMon, interact, fullRespec, rollItem, itemLines, WEB_DEF, swing, tryRoll, toggleWraith, spawnWisp, newArc, miasCast, MS, poisonMon, addCloud, confuse, addBleed, skillCost, syn, divineAdvance, TOUCH, PAD, pollPad, anyPanelOpen, corpseUnderCursor, corpseSummonKind, WS, spawnWisp: typeof spawnWisp !== 'undefined' ? spawnWisp : null, SPR, PAL, sprite, monFrame, MPAL, MPAINT, skelFrame, heroFrame, giantFrame };
})();
</script>
