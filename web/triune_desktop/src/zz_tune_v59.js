// zz_tune_v59.js — the user after the PixelLab Ossuarch: "the lantern effect was supposed to be more present, so the
// world needs to darken so we can capture that atmosphere, bonus is it makes hiding ugly graphics easy."
// Every land's shade (the ambient the light map starts from) drops by day to about 45% and by night to about 70%, so
// the world sits in gloom and the hero's lantern, fires and braziers carry the scene. Underground drops a little too.
{
  try {
    const GR = window.__grade && window.__grade.GR;
    if (GR) for (const k of ['moor', 'wood', 'fen', 'ossa']) {
      const L = GR[k]; if (!L || L._v59) continue; L._v59 = 1;
      if (L.day) L.day = L.day.map(v => Math.round(v * 0.85));   // v0.64: day brighter again; the dark layer rules the night
      if (L.night) L.night = L.night.map(v => Math.round(v * 0.7));
      if (L.hz) L.hz = [L.hz[0], L.hz[1] * 0.5];
    }
    if (typeof AMBIENT !== 'undefined') for (const k in AMBIENT) if (!/moor|fen|wild/.test(k)) AMBIENT[k] = AMBIENT[k].map(v => Math.round(v * 0.8));
  } catch (e) { reportError && reportError(e); }
}

// ---- the Ossuarch's lantern, v3 (user: "lantern is terrible and sways too much, should move lazily and dream like, glowing
// bone white vapors pouring out like incense smoke. light should come from the lantern, you need to let pixel lab make it")
// v3.1 (user: "way too big ... twice the size of his head ... grittier and darker"): redrawn by hand at the hero's grain,
// 11x17 HD px, a small stained skull in a black iron cage, dim ember-pale eyes. It hangs from his hand on a short chain and drifts like something underwater, trailing a little when he moves.
// Incense-thick bone-white vapour pours from it in a slow ribbon and rises; his light comes from inside the skull.
{
const LAN = {"frames": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAARCAYAAAAL4VbbAAABIUlEQVR4nGNgwAI4OTj/YxPHqZBkDeiACZugpJgIVkNQFHNycP7n5OD8LyctDmcjyzMiK+xtzmFgYGBg6Jm8giEi0IGBgYGBoX/mGobvP74zwk1GVvjkyQsUqwM9rOB+QHEGusIHD5+h8Bk5OTj/mxtqMzx6+hKrp2Dg+as3EJPDghwZXr95w/D6zRu4WyMCHeBiFkZqiNCAWb97y2wME3dvmc3w5NkrRGhwcnD+L0wPYWBgYGCYPHsNg6iICMPrN28YfN2sGJ48e8Vw+tIdhu8/vjPCPfjg4TOGdZv2M+SmhjCwMf9nyE0NYTh38SaKLUwMDAwM3398Z1y/4xhKCMBomKkYQScmKoiVhgcdMoeTg/M/crp4/uoN3FSsAF8SBQAyEHMcaQNGtgAAAABJRU5ErkJggg==", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAARCAYAAAAL4VbbAAABIUlEQVR4nGNgwAI4OTj/YxPHqZBkDeiACZugpJgIVkNQFHNycP7n5OD8LyctDmcjyzMiK+xtzmFgYGBg6Jm8giEi0IGBgYGBoX/mGobvP74zwk1GVvjkyQsUqwM9rOB+QHEGusIHD5+h8Bk5OTj/mxtqMzx6+hKrp2Dg+as3EJPDghwZXr95w/D6zRu4WyMCHeBiFkZqiNCAWX/90l4ME69f2svw5NkrRGhwcnD+L0wPYWBgYGCYPHsNg6iICMPrN28YfN2sGJ48e8Vw+tIdhu8/vjPCPfjg4TOGdZv2M+SmhjCwMf9nyE0NYTh38SaKLUwMDAwM3398Z1y/4xhKCMBomKkYQScmKoiVhgcdMoeTg/M/crp4/uoN3FSsAF8SBQADO3PUtXTIwwAAAABJRU5ErkJggg==", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAARCAYAAAAL4VbbAAABIUlEQVR4nGNgwAI4OTj/YxPHqZBkDeiACZugpJgIVkNQFHNycP7n5OD8LyctDmcjyzMiK+xtzmFgYGBg6Jm8giEi0IGBgYGBoX/mGobvP74zwk1GVvjkyQsUqwM9rOB+QHEGusIHD5+h8Bk5OTj/mxtqMzx6+hKrp2Dg+as3EJPDghwZXr95w/D6zRu4WyMCHeBiFkZqiNCAWb97y2wME3dvmc3w5NkrRGhwcnD+L0wPYWBgYGCYPHsNg6iICMPrN28YfN2sGJ48e8Vw+tIdhu8/vjPCPfjg4TOGdZv2M+SmhjCwMf9nyE0NYTh38SaKLUwMDAwM3398Z1y/4xhKCMBomKkYQScmKoiVhgcdMoeTg/M/crp4/uoN3FSsAF8SBQAyEHMcaQNGtgAAAABJRU5ErkJggg==", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAARCAYAAAAL4VbbAAABIElEQVR4nGNgwAI4OTj/YxPHqZBkDeiACZugpJgIVkNQFHNycP7n5OD8LyctDmcjyzMiK+xtzmFgYGBg6Jm8giEi0IGBgYGBoX/mGobvP74zwk1GVvjkyQsUqwM9rOB+QHEGusIHD5+h8Bk5OTj/mxtqMzx6+hKrp2Dg+as3EJPDghwZXr95w/D6zRu4WyMCHeBiFkZqiNCAWd/ZlI1hYmdTNsOTZ68QocHJwfm/MD2EgYGBgWHy7DUMoiIiDK/fvGHwdbNiePLsFcPpS3cYvv/4zgj34IOHzxjWbdrPkJsawsDG/J8hNzWE4dzFmyi2MDEwMDB8//Gdcf2OYyghAKNhpmIEnZioIFYaHnTIHE4Ozv/I6eL5qzdwU7ECfEkUAOF2cfTkwivTAAAAAElFTkSuQmCC"], "hang": [5, 0], "w": 11, "h": 17};
  const HR = LAN.frames.map(src => { const im = new Image(); im.src = src; return im; });
  const S3 = 3, LWW = LAN.w / S3, LWH = LAN.h / S3, CHAIN = 2;
  const st = { a: 0, va: 0, px: null, py: null, t: 0, vap: [], acc: 0 };
  const lampPos = () => {
    const f = P.face || 1, v = P._view || 'front', back = v === 'back' || v === 'up';
    // where his hand actually is in each view (measured on the sprite): front holds it low at the near hip
    const H = v === 'front' ? [-3, -18] : v === 'side' ? [6, -19] : v === 'down' ? [7, -18] : v === 'back' ? [-4, -19] : [5, -19];
    const dx = f * H[0], dy = H[1], a = st.a, R = CHAIN + LWH * 0.45;
    return { f, back, dx, dy, ang: a, cx: dx - Math.sin(a) * R, cy: dy + Math.cos(a) * R };   // cx,cy: the skull's heart
  };
  try { window.__lampPos = lampPos; } catch (e) { }
  function tickLamp() {
    const dt = Math.min(0.05, Math.max(0, G.time - (st.t || G.time))); st.t = G.time; if (!dt) return;
    const vx = st.px == null ? 0 : (P.x - st.px - (P.y - st.py)) / dt; st.px = P.x; st.py = P.y;
    const drift = Math.sin(G.time * 0.55) * 0.035 + Math.sin(G.time * 0.23 + 1.7) * 0.025;       // slow, small, dreamy
    const want = drift - Math.max(-0.22, Math.min(0.22, vx * 0.05));
    st.va += ((want - st.a) * 3.2 - st.va * 2.6) * dt; st.a += st.va * dt;
    if (P.dead) return;
    // vapour: a steady pour (evenly spaced, so it reads as a ribbon), each wisp born at the skull and left in the world
    st.acc += dt * 30;
    const L = lampPos();
    while (st.acc >= 1) {
      st.acc -= 1;
      st.vap.push({ x: P.x, y: P.y, sx: L.cx + (Math.random() - 0.5) * 1.5, sy: L.cy - 2, ox: 0, oy: 0,
        vz: 4 + Math.random() * 2, vx: (Math.random() - 0.5) * 0.8, t: 0, T: 2.6 + Math.random() * 1.2, ph: Math.random() * 6, s: 0.8 + Math.random() * 0.6 });
    }
    for (const w of st.vap) { w.t += dt; w.oy -= w.vz * dt; w.vz *= 1 - dt * 0.28; w.ox += (w.vx + Math.sin(G.time * 0.7 + w.ph * 0.15) * 1.1 * Math.min(1, w.t)) * dt; }
    st.vap = st.vap.filter(w => w.t < w.T); if (st.vap.length > 150) st.vap.splice(0, st.vap.length - 150);
  }
  const _dcl = drawClassLamp;
  drawClassLamp = function (list) {
    if (P.cls !== 'ossumancer' || !window.__ossuHD || !window.__ossuHD.ok) return _dcl(list);
    if (P.dead || !G.zone) return;
    tickLamp();
    const L = lampPos();
    list.push({ d: P.x + P.y + (L.back ? -0.06 : 0.06), f: () => {
      if (P.roll > 0) return;
      const q = iso(P.x, P.y), lift = P.leapZ || 0, seq = [0, 1, 2, 3, 2, 1], fi = seq[Math.floor(G.time * 2.2) % seq.length], img = HR[fi];
      if (!img.complete) return;
      const hx = q.sx + L.dx, hy = q.sy + L.dy - lift;
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(hx * S3) / S3, Math.round(hy * S3) / S3); ctx.rotate(L.ang);
      ctx.fillStyle = '#16131a'; for (let i = 0; i < CHAIN; i++) ctx.fillRect(-1 / S3, i, 2 / S3, i % 2 ? 0.67 : 1);
      if (L.f < 0) ctx.scale(-1, 1);
      _drawImage.call(ctx, img, -LAN.hang[0] / S3, CHAIN, LWW, LWH);
      ctx.restore();
      if (window.__dbgMark) { ctx.fillStyle = '#ff00ff'; ctx.fillRect(q.sx - 0.5, q.sy - 0.5, 1, 1); ctx.fillStyle = '#00ffff'; ctx.fillRect(hx - 0.5, hy - 0.5, 1, 1); }
    } });
    // the vapour: soft bone-white wisps, dense and small as they leave the skull, widening and thinning as they climb
    for (const w of st.vap) list.push({ d: w.x + w.y + 0.07, f: () => {
      const q = iso(w.x, w.y), k = w.t / w.T, a = k < 0.1 ? k / 0.1 : Math.pow(1 - (k - 0.1) / 0.9, 1.4);
      const x = q.sx + w.sx + w.ox, y = q.sy + w.sy + w.oy, r = (0.45 + k * 2.4) * w.s;
      ctx.fillStyle = `rgba(226,220,204,${a * (0.34 - k * 0.2)})`;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, 6.2832); ctx.fill();
      if (k < 0.45) { ctx.fillStyle = `rgba(242,238,226,${a * 0.22 * (1 - k / 0.45)})`; ctx.fillRect(Math.round(x * S3) / S3 - 1 / S3, Math.round(y * S3) / S3, 2 / S3, 2 / S3); }
    } });
  };
  // ---- the light lives inside the skull: it gutters and flares, and pools on him and the ground around it
  const _al = addLights16;
  addLights16 = function (z) {
    _al(z);
    try {
      if (P.dead || !(window.__grade && window.__grade.on)) return;
      if (P.cls !== 'ossumancer' && window.__plHD && window.__plHD[P.cls]) return;   // v0.62: the PixelLab heroes light from their own lanterns (zz_zv61)
      const fl = window.__grade.flame ? window.__grade.flame(3.3) : 1, k = Math.max(0.4, 1 + (fl - 1) * 2.2);
      const out = isOutdoor(z), dk = out ? dayK() : 0, q = iso(P.x, P.y);
      let lx = q.sx, ly = q.sy - 18, oss = P.cls === 'ossumancer' && window.__lampPos;
      if (oss) { const L = window.__lampPos(); lx = q.sx + L.cx; ly = q.sy + L.cy; }
      addLightRaw(lx, ly, 50, oss ? '240,228,204' : '255,190,120', (0.36 + 0.22 * (1 - dk)) * k);   // the spot, centred on the skull
      addLightRaw(lx, ly, 16, '250,238,214', (0.08 + 0.05 * (1 - dk)) * k);                          // its hot heart
    } catch (e) { }
  };
}
