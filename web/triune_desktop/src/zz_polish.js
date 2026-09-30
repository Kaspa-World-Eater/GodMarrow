
// =================================================================== v0.34: quieter screen, louder gauges
// The user: on-screen text announcing the hour or a skill is obstructive. A decorative clock is enough for the hour, and
// skills need no announcement. Short state messages (poise broken, poise spent) stay. Gauges flash when critical.
{
  // ---- banners: only the moments that matter (level, zone, boss, herald, arcana, death). Skill and hour banners are dropped.
  const KEEP = /LEVEL \d|FELLED|ARCAN|SEVERED|SILENCE|MAJOR/;
  const _banner = banner;
  banner = function (m, col, t) {
    if (!m) return;
    if (KEEP.test(m)) return _banner(m, col, t);
    if (typeof HOUR_TXT !== 'undefined' && Object.values(HOUR_TXT).some(h => h[0] === m)) return;
    // zone names, boss names and herald names come with t >= 2.2 and are not skill names; skill banners are shorter or named below
    if (t != null && t < 2.2) return;
    if (/^HAND THAT|ONE WITH NOTHING|RETURNED|HEART POUNDS|RAMPAGE|NOON|SUN$/.test(m)) return;
    return _banner(m, col, t);
  };
  // ---- says: the hour's lines and the sky-turning lines go; everything else stays
  const QUIET = new Set(['Night falls. Keep to the light.', 'The sky greys toward day', 'A blinding noon. Radiance peaks.', 'The sun goes out. Every light but yours gutters.']);
  if (typeof HOUR_TXT !== 'undefined') for (const k in HOUR_TXT) QUIET.add(HOUR_TXT[k][1]);
  const _say = say;
  say = function (m, t) { if (QUIET.has(m)) return; return _say(m, t); };
  // ---- the monk's floating skill-name callout is off
  if (typeof G !== 'undefined') Object.defineProperty(G, 'kcall', { get() { return null; }, set(v) { }, configurable: true });

  // ---- the clock: a small decorative dial, no words. Sun by day, moon by night, a red rim at dusk and a gold one at dawn.
  drawSkyDial = function () {
    if (!G.zone || !isOutdoor(G.zone) || !G.running) return;
    const cx = W - 22, cy = 16, R = 10, p = dayPhase();
    const h = typeof hourOf === 'function' ? hourOf() : (G.night ? 'night' : 'day');
    ctx.fillStyle = 'rgba(10,9,13,0.75)'; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, 6.29); ctx.fill();
    ctx.fillStyle = h === 'night' ? '#141a2a' : h === 'dusk' ? '#3a1a16' : h === 'dawn' ? '#3a2c18' : '#2a3040';
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#17141c'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = h === 'dusk' ? '#b0402a' : h === 'dawn' ? '#c9a24a' : '#4a4458'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.29); ctx.stroke();
    ctx.strokeStyle = '#3a3446'; ctx.beginPath(); ctx.moveTo(cx - R, cy + 0.5); ctx.lineTo(cx + R, cy + 0.5); ctx.stroke();   // the horizon
    for (let i = 0; i < 8; i++) { const t = i / 8 * 6.283; ctx.fillStyle = '#5a5468'; ctx.fillRect(Math.round(cx + Math.cos(t) * (R - 2)), Math.round(cy + Math.sin(t) * (R - 2)), 1, 1); }
    // the sun crosses the sky through the day (0 to 0.55 of the cycle), the moon through the night
    const day = p < 0.55, f = day ? p / 0.55 : (p - 0.55) / 0.45, t = Math.PI + Math.PI * f;
    const bx = cx + Math.cos(t) * (R - 3), by = cy + Math.sin(t) * (R - 3);
    if (day) { ctx.fillStyle = h === 'dusk' ? '#f0a060' : '#f0d080'; ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, 6.29); ctx.fill(); ctx.fillStyle = '#fff2c0'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 1, 1); }
    else { ctx.fillStyle = '#d8e0f0'; ctx.beginPath(); ctx.arc(bx, by, 2, 0, 6.29); ctx.fill(); ctx.fillStyle = '#17141c'; ctx.beginPath(); ctx.arc(bx + 1, by - 0.7, 1.5, 0, 6.29); ctx.fill(); }
    if (inRect(mouse, cx - R - 2, cy - R - 2, 2 * R + 4, 2 * R + 4)) tooltip = [[dayName(), '#e8e2d0'], [typeof HOUR_TXT !== 'undefined' && HOUR_TXT[h] ? HOUR_TXT[h][1] : '', '#a39d8c']];
  };

  // ---- critical gauges pulse. Orbs (life, essence, Vitae) when under a quarter; poise when under a quarter; shards when
  // the aura is nearly empty; miasma when it nears overflow; wisps when the choir is nearly spent.
  const pulse = (rate = 6) => 0.55 + 0.45 * Math.sin(G.time * rate);
  const _orb = drawOrb16;
  drawOrb16 = function (cx, cy, r, v, max, col, dim) {
    _orb(cx, cy, r, v, max, col, dim);
    if (!G.running || P.dead || !(max > 0) || v / max >= 0.25) return;
    const k = pulse(7), rr = r + 2 + Math.round(k * 2);
    ctx.save(); ctx.globalAlpha = 0.35 + 0.5 * k; ctx.strokeStyle = dim; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.29); ctx.stroke();
    ctx.globalAlpha = 0.18 * k; ctx.fillStyle = dim; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill(); ctx.restore();
  };
  const critBar = (x, y, w, h, col, rate) => {
    const k = pulse(rate || 6); ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * k; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3); ctx.globalAlpha = 0.25 * k; ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.restore();
  };
  const _hud = drawHud;
  drawHud = function () {
    _hud();
    if (!G.running || P.dead) return;
    try {
      // poise (the stamina bar under the xp bar)
      if (D.maxStam > 0 && P.stam / D.maxStam < 0.25) critBar(86, HUD_Y + 7, 96, 2, P.stam <= 0 ? '#ff6a4a' : '#d8c060', 7);
      if (P.cls === 'ossumancer' && D.shardCap > 0 && P.shards / D.shardCap < 0.2) critBar(86, HUD_Y + 12, 96, 5, '#f4efe2', 6);
      if (P.cls === 'animancer' && D.wispCap > 0 && P.wisps.length <= Math.max(0, Math.floor(D.wispCap * 0.2))) critBar(85, HUD_Y + 12, Math.min(D.wispCap, 16) * 6, 5, '#8ecbff', 6);
    } catch (e) { }
  };

  // ---- attributes reach what they should: Spirit quickens casting a little, Constitution quickens the swing, Vitality mends
  const _derive = derive;
  derive = function () {
    const d = _derive();
    d.castSpd = (d.castSpd || 1) * (1 + d.spi * 0.0015);   // 40 Spirit: +6% cast speed
    d.atkSpd = (d.atkSpd || 1) * (1 + d.con * 0.0015);    // 40 Constitution: +6% swing speed
    d.hpRegen = (d.hpRegen || 0) + d.vit * 0.01;           // 40 Vitality: +0.4 life a second
    return d;
  };
  const _swing = swing;
  swing = function (m) { const c0 = P.cast; _swing(m); if (D.atkSpd > 1) { P.cast = c0 + (P.cast - c0) / D.atkSpd; P.swing = P.swing / D.atkSpd; } };
  const _ud = updateDay;
  updateDay = function (dt) { _ud(dt); if (G.running && !P.dead && D.hpRegen > 0 && P.hp < D.maxHp) P.hp = Math.min(D.maxHp, P.hp + D.hpRegen * dt); };
}
