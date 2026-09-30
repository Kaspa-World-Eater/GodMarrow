// =================================================================== v0.61 animancer from PixelLab: the user's approved front (their own
// art with the lantern in hand), turned into 5 directions and animated in PixelLab (custom v3). Packed by /tmp/port/port.py.
{
  const HHD = window.__HHD_animancer || { sheets: [], idx: {}, meta: { poses: {}, views: {} } };
  const K = 3, FW = 258, FH = 249, AXp = 129, AYp = 234, LW = FW / K, LH = FH / K, OX = AXp / K, OY = AYp / K;
  let ok = false, left = HHD.sheets.length; const SH = [];
  HHD.sheets.forEach((src, i) => { const im = new Image(); im.onload = () => { SH[i] = im; if (--left === 0) ok = true; }; im.src = src; });
  const lo = src => { const q = mkCanvas(LW, LH), x = q.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, LW, LH); q._hr = src; return q; };
  const flipC = src => { const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return q; };
  const tintH = (src, col) => { const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, q.width, q.height); return q; };
  const CACHE = new Map();
  function build(key) {
    const e = HHD.idx[key]; if (!e) return null;
    const [si, sx, sy, w, h, dx, dy] = e, hr = mkCanvas(FW, FH), x = hr.getContext('2d');
    x.drawImage(SH[si], sx, sy, w, h, AXp + dx, AYp + dy, w, h);
    const hf = flipC(hr), fr = { c: lo(hr), f: lo(hf), w: LW, h: LH, ox: OX, oy: OY, bb: { x: OX - 11, y: OY - 57, w: 22, h: 57 }, hd: true, key,
      tint: (src, col) => lo(tintH(src._hr || src, col)) };
    let fl = null, flf = null;
    Object.defineProperty(fr, 'fl', { get: () => fl || (fl = lo(tintH(hr, '#fff'))) });
    Object.defineProperty(fr, 'flf', { get: () => flf || (flf = lo(tintH(hf, '#fff'))) });
    return fr;
  }
  function frameOf(pose, view, ph) {
    const vs = HHD.meta.views[pose]; if (!vs) return null;
    if (!vs.includes(view)) view = view === 'down' ? 'front' : view === 'up' ? 'back' : 'front';
    const n = HHD.meta.poses[pose]; ph = ((ph | 0) % n + n) % n;
    const key = pose + '/' + view + '/' + ph; let fr = CACHE.get(key);
    if (fr) { CACHE.delete(key); CACHE.set(key, fr); return fr; }
    fr = build(key); if (!fr) return null;
    CACHE.set(key, fr); if (CACHE.size > 160) CACHE.delete(CACHE.keys().next().value);
    return fr;
  }
  // every pose the class's older layers ask for, mapped to the six PixelLab moves (skills are casts)
  const ST = { s0: 0, sL: 0, c0: 0, cL: 0 };
  function hdPose(pose, ph) {
    const N = HHD.meta.poses;
    if (P.roll > 0) return N.dodge ? ['dodge', Math.min(N.dodge - 1, Math.floor((1 - P.roll / 0.34) * N.dodge))] : ['walk', Math.floor((1 - P.roll / 0.34) * N.walk)];
    switch (pose) {
      case 'idle': return ['idle', Math.floor(G.time * 1.8) % N.idle];
      case 'walk': return ['walk', Math.floor((P._wd || 0) * 3.8) % N.walk];
      case 'hit': return ['hit', ph];
      case 'death': return ['death', Math.min(N.death - 1, ph | 0)];
      case 'leap': return ['cast', ph ? 5 : 2];
      case 'atk': case 'crush': case 'bscythe': case 'lash': case 'charge': case 'pull': {
        if (P.swing > ST.sL + 1e-6) { ST.s0 = P.swing; ST.alt = !ST.alt; } ST.sL = P.swing;
        const an = ST.alt && N.atk2 ? 'atk2' : 'atk';   // blows alternate between the two strikes
        const pr = P.swing > 0 ? 1 - P.swing / Math.max(0.05, ST.s0 || 0.3) : 0.99; return [an, Math.max(0, Math.min(N[an] - 1, Math.floor(pr * N[an])))]; }
      default: {
        if (P.cast > ST.cL + 1e-6) ST.c0 = P.cast; ST.cL = P.cast;
        const pr = P.cast > 0 ? 1 - P.cast / Math.max(0.05, ST.c0 || 0.5) : 0.6; return ['cast', Math.max(0, Math.min(N.cast - 1, Math.floor(pr * N.cast)))]; }
    }
  }
  const _hf = heroFrame;
  heroFrame = function (cls, pose, ph, view) {
    if (cls !== 'animancer' || !ok) return _hf(cls, pose, ph, view);
    if (!view) view = P._view || (P._fb ? 'back' : 'front');
    const [p2, f2] = hdPose(pose, ph | 0);
    const fr = frameOf(p2, view, f2);
    if (fr) { fr._pl = [p2, view, f2]; return fr; }
    return _hf(cls, pose, ph, view);
  };
  try { window.__plHD = window.__plHD || {}; window.__plHD['animancer'] = { frameOf, get ok() { return ok; }, HHD }; } catch (e) { }
  if (window.__spm) window.__spm.heroFrame = (...a) => heroFrame(...a);
}
