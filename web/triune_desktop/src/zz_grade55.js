// zz_grade55.js (v0.55) — colour and the living flame.
// The user: "The color palette is a bit washed out, a little too much ... The goal is to capture the look and feel of
// the title screen, and the world imagery I gave you from the dark souls pixel art." And: "The character lantern should
// be a major source of light in this world. Even during the day ... flickering light, a pulsing look but realistic and
// not pulsing all the time."
// 1. The grade. The old day grade drained the frame (a 42% desaturation, then a grey screen that lifted every black).
//    Gone. Each land has its own grade instead, after the references: deep true blacks, rich local colour, the shadows
//    pulled toward the land's colour (teal-green in the woods, slate in the moor, bruise-green in the fen, umber below
//    ground) and the lit side toward warm ochre. Saturation and contrast go up a little (a filtered copy of the frame);
//    the haze is kept but thin and tinted, never grey.
// 2. The flame. flick37 (every flame's flicker) becomes a real flame: a slow uneven drift and a fine tremble, and every
//    few seconds (not on a beat: each flame has its own schedule) a gutter, a quick dip and a shaky recovery, or now
//    and then a flare. The hero's lantern is a strong warm pool by day and the main light of the night.
{
  const GR = {
    // sat, con, bri: the filter; hi/lo: soft-light tints at the top and bottom of the frame [rgb, alpha]; day/night: the
    // ambient light of the land (the colour its shade takes; lamps and fires pour warm light over it); hz: day haze
    moor:  { sat: 1.22, con: 1.1, bri: 1.08, hi: ['60,86,112', 0.18], lo: ['176,112,56', 0.14], day: [196, 206, 224], night: [42, 56, 102], hz: ['96,112,128', 0.05] },
    wood:  { sat: 1.3, con: 1.12, bri: 1.04, hi: ['30,96,92', 0.2], lo: ['168,118,52', 0.14], day: [176, 204, 194], night: [26, 52, 58], hz: ['60,110,100', 0.06] },
    fen:   { sat: 1.24, con: 1.1, bri: 1.03, hi: ['50,100,76', 0.18], lo: ['116,74,126', 0.14], day: [182, 204, 190], night: [28, 50, 50], hz: ['80,118,98', 0.07] },
    under: { sat: 1.1, con: 1.12, bri: 1.0, hi: ['40,38,78', 0.16], lo: ['156,90,42', 0.1] },
    ossa:  { sat: 1.14, con: 1.08, bri: 1.04, hi: ['86,100,136', 0.14], lo: ['196,136,74', 0.16], day: [222, 212, 196], night: [48, 50, 84], hz: ['200,170,130', 0.05] },
    night: { sat: 1.16, con: 1.14, hi: ['26,46,100', 0.18], lo: ['130,76,42', 0.08] },
  };
  const landOf = z => { const t = z && z.theme; if (!t) return 'under';
    if (t === 'moor') return 'moor'; if (t === 'fen' || /shog|bog|mire/.test(t)) return 'fen'; if (/wood|root|fern/.test(t)) return 'wood';
    if (/ossa/.test(t) && !/tomb|marrow|chapter/.test(t)) return 'ossa'; return isOutdoor(z) ? 'moor' : 'under'; };
  const mixA = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const num = s => s.split(',').map(Number), str = a => a.map(v => Math.round(v)).join(',');
  let TMP = null;
  try { window.__grade = { GR, on: true }; } catch (e) { }
  const G55 = () => (window.__grade && window.__grade.GR) || GR;
  function gradeOf(z) {
    const T = G55(), land = landOf(z), base = T[land], out = isOutdoor(z) || land === 'wood' || land === 'ossa';
    const dk = out && typeof dayK === 'function' && isOutdoor(z) ? dayK() : 1, n = 1 - dk, N = T.night;
    if (!out || n <= 0) return base;
    const m = (a, b) => [str(mixA(num(a[0]), num(b[0]), n)), a[1] + (b[1] - a[1]) * n];
    return { sat: base.sat + (N.sat - base.sat) * n, con: base.con + (N.con - base.con) * n, bri: base.bri, hi: m(base.hi, N.hi), lo: m(base.lo, N.lo), hz: base.hz ? [base.hz[0], base.hz[1] * dk] : null };
  }
  const _pg = postGrade;
  postGrade = function (z) {
    if (!(window.__grade && window.__grade.on)) return _pg.apply(this, arguments);
    const g = gradeOf(z);
    // saturation and contrast: the frame through a filter, once
    if (!G.lowFx) {
      if (!TMP || TMP.width !== cv.width || TMP.height !== cv.height) { TMP = document.createElement('canvas'); TMP.width = cv.width; TMP.height = cv.height; }
      const t = TMP.getContext('2d'); t.globalCompositeOperation = 'copy'; t.drawImage(cv, 0, 0);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `saturate(${g.sat}) contrast(${g.con}) brightness(${g.bri})`; ctx.globalCompositeOperation = 'copy';
      _drawImage.call(ctx, TMP, 0, 0); ctx.filter = 'none'; ctx.restore();
    }
    // cool from above, warm from below: a soft-light split
    ctx.globalCompositeOperation = 'soft-light';
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, `rgba(${g.hi[0]},${g.hi[1]})`); gr.addColorStop(0.55, `rgba(${g.hi[0]},${g.hi[1] * 0.35})`); gr.addColorStop(1, `rgba(${g.lo[0]},${g.lo[1]})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    // a thin tinted haze by day, the hour's colour at dusk, and the old dithered vignette
    const hr = isOutdoor(z) && typeof hourOf === 'function' ? hourOf() : null;
    if (hr === 'dusk') drawHaze37(0.1, '90,88,110', 60);   // v0.64: no red
    else if (g.hz && g.hz[1] > 0.005) drawHaze37(g.hz[1], g.hz[0], 64);
    if (VIG55) ctx.drawImage(VIG55, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  };
  // the vignette: the frame darkens toward its corners in dithered steps (as the old one did, a touch deeper)
  const VIG55 = (() => {
    const c = mkCanvas(VW, VH), g = c.getContext('2d'), img = g.createImageData(VW, VH), D = img.data;
    for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
      const dx = (i - VW / 2) / (VW / 2), dy = (j - VH / 2) / (VH / 2), d = Math.sqrt(dx * dx * 0.8 + dy * dy * 1.1);
      const v = Math.max(0, (d - 0.66) / 0.5) * 3, lv = Math.min(3, (v | 0) + ((v - (v | 0) - 0.3) * 2.5 > BAY4[((j & 3) << 2) + (i & 3)] ? 1 : 0)); if (!lv) continue;
      const o = (j * VW + i) * 4; D[o] = 5; D[o + 1] = 4; D[o + 2] = 9; D[o + 3] = lv * 60;
    }
    g.putImageData(img, 0, 0); return c;
  })();
  // ---- the ambient: the colour the land's shade takes, by day and by night (lamps pour warm light over it)
  const _amb = ambient37;
  ambient37 = function (z) {
    const a = _amb(z); if (!(window.__grade && window.__grade.on)) return a;
    const L = G55()[landOf(z)]; if (!L || !L.day) return a;
    const k = isOutdoor(z) ? dayK() : 1, e = k * k * (3 - 2 * k);
    let c = mixA(L.night, L.day, e);
    // keep the hours' colour (dusk red, dawn gold) that the old sky put on top
    const old = _amb.call(this, z), base = mixA(isOutdoor(z) ? (z.theme === 'fen' ? [50, 64, 74] : [56, 62, 98]) : old, isOutdoor(z) ? (z.theme === 'fen' ? [192, 204, 200] : [206, 204, 212]) : old, e);
    c = c.map((v, i) => v + (old[i] - base[i]) * 0.8);
    return c.map(v => Math.max(0, Math.min(255, Math.round(v))));
  };

  // ---- the flame: drift, tremble, and now and then a gutter or a flare, each flame on its own schedule
  const vn = (t, s) => { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return hash(i * 7 + 3, s) * (1 - u) + hash(i * 7 + 10, s) * u; };
  function flame55(seed) {
    const t = G.time, s = (seed * 131 | 0) + 7;
    let f = 1 + 0.016 * Math.sin(t * 1.3 + seed * 1.7) + 0.012 * Math.sin(t * 2.7 + seed * 0.61) + 0.05 * (vn(t * 0.7, s + 11) - 0.5) + 0.05 * (vn(t * 9, s) - 0.5) + 0.025 * (vn(t * 23, s + 3) - 0.5);
    // events: the timeline is cut into windows of 4.1 s (shifted per flame); about half the windows hold one event
    const T = t + seed * 3.1, W0 = 4.1, w = Math.floor(T / W0);
    if (hash(w * 13 + 5, s) < 0.5) {
      const at = hash(w * 5 + 3, s + 17) * (W0 - 0.8), u = T - w * W0 - at;
      if (u > 0 && u < 0.75) {
        const gutter = hash(w * 11 + 1, s + 5) < 0.78, depth = gutter ? 0.16 + 0.16 * hash(w, s + 9) : 0.09;
        const env = u < 0.06 ? u / 0.06 : Math.max(0, 1 - (u - 0.06) / 0.69) ** 1.6;
        const shake = 1 + 0.45 * Math.sin(u * 55 + seed) * env;
        f += (gutter ? -1 : 1) * depth * env * shake;
      }
    }
    return f;
  }
  flick37 = function (seed) { return flame55(seed); };
  try { window.__grade.flame = flame55; } catch (e) { }

  // ---- the hero's lantern: after the old pools are laid, a strong warm pool of its own (lighten keeps the brighter)
  const warm = (rgb, k) => { const a = num(rgb), w = [255, 178, 104]; return str(mixA(a, w, k)); };
  const _al = addLights16;
  addLights16 = function (z) {
    _al(z);
    if (!(window.__grade && window.__grade.on) || P.dead) return;
    const out = isOutdoor(z), dk = out ? dayK() : 0, f = flick37(3.3);   // v0.79: the smoothed flame (no strobe)
    const LF = window.__lampFoot ? window.__lampFoot() : null;   // v0.69: the light stands where the lantern hangs
    const Ry0 = heroLightR(), Ry = LF && window.__poolTiles ? Math.min(Ry0, window.__poolTiles() * 1.35) : Ry0, lx = LF ? LF[0] : P.x + (P.face || 1) * 0.25, ly = LF ? LF[1] : P.y - (P.face || 1) * 0.25;
    const poly = visPoly(z, lx, ly, Ry * 1.05, 80);
    const rgb = (LF && window.__lampRGB && window.__lampRGB()) || warm(LAMP_RGB[P.cls] || '255,214,160', 0.45);
    // by night the main light of the world; by day still a clear warm pool
    const a = (out ? 0.34 + 0.86 * (1 - dk) : 1.05) * (LF ? 0.62 : 1);   // v0.79: less wash; the pool does the work
    shadowLight(poly, lx, ly, Ry * (0.84 + 0.04 * f), rgb, a * f, 1);
    if (!LF) { const p = iso(P.x, P.y); addLightRaw(p.sx, p.sy - 14, 30, '255,214,160', (0.22 + 0.2 * (1 - dk)) * f); }
  };
}
// light passes between trees and over boulders: only walls, cliffs, pillars and palisades stop it. (A tree tile used to
// block light as a whole diamond, which cut hard tile-shaped shadows through the lantern's pool in every wood; the
// trees throw their own drawn shadows.)
{
  const LTALL = new Uint8Array(16); [T.CLIFF, T.WALL, T.FOG, T.PILLAR, T.PALISADE].forEach(t => LTALL[t] = 1);
  visPoly = function (z, x0, y0, R, n = 96) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); let d = 0.3, hit = R;
      for (; d < R; d += 0.2) { const t = z.get(Math.floor(x0 + dx * d), Math.floor(y0 + dy * d)); if (t == null || LTALL[t]) { hit = d + 0.35; break; } }
      pts.push([x0 + dx * hit, y0 + dy * hit]);
    }
    return pts;
  };
}
