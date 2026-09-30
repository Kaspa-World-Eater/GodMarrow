
// =================================================================== v0.23: creatures in 32-bit pixel art
// A creature painter registers M32[type] = function (A, pose, ph, pal) and M32F[type] = [W, H, ox, oy]: the frame
// size in game pixels and where its feet stand in it (ox across, oy down). The painter draws facing right with
// the native pixel painter (Pix, zo_pix.js). Poses: idle 0-3, walk 0-7, wind 0-2, atk 0-2 (and parry 0 where the
// creature parries). These frames win over every older painter.
const M32 = {}, M32F = {}, M32WALK = {}, M32BACK = {};   // M32BACK[type] = true once its painter draws a 'back' view
function frameM32(type, pose, ph, pal, view) {
  const [W2, H2, ox, oy] = M32F[type], A = Pix(W2, H2);
  M32[type](A, pose, ph, pal || {}, view || 'front');
  const c = A.render();
  const f = mkCanvas(W2, H2), fx = f.getContext('2d'); fx.translate(W2, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
  const wht = src => { const q = mkCanvas(W2, H2), qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = '#fff'; qx.fillRect(0, 0, W2, H2); return q; };
  // the painted bounds, for hit boxes and name plates
  const d = c.getContext('2d').getImageData(0, 0, W2, H2).data; let x0 = W2, y0 = H2, x1 = 0, y1 = 0;
  for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) if (d[(j * W2 + i) * 4 + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  return { c, f, fl: wht(c), flf: wht(f), w: W2, h: H2, ox, oy, bb: { x: x0, y: y0, w: Math.max(1, x1 - x0 + 1), h: Math.max(1, y1 - y0 + 1) } };
}
{
  const _mf = monFrame;
  monFrame = function (type, palKey, pal, pose, ph, view) {
    if (!M32[type]) return _mf(type, palKey, pal, pose, ph);
    view = view === 'back' && M32BACK[type] ? 'back' : 'front';
    const key = '32|' + type + '|' + palKey + '|' + pose + '|' + ph + '|' + view; let fr = ART16.cache[key]; if (fr) return fr;
    fr = frameM32(type, pose, ph, pal, view); ART16.cache[key] = fr; return fr;
  };
}
// a tint for champions and uniques: shift a 5-tone material toward a colour, cached under a new name
function tint32(name, tint, k = 0.45) {
  if (!tint || !PMAT[name]) return name; const key = name + '~' + tint; if (PMAT[key]) return key;
  const T = [parseInt(tint.slice(1, 3), 16), parseInt(tint.slice(3, 5), 16), parseInt(tint.slice(5, 7), 16)], tl = (T[0] + T[1] + T[2]) / 3 || 1;
  PMAT[key] = PMAT[name].map(c => { const l = (c[0] + c[1] + c[2]) / 3; return c.map((v, i) => Math.round(Math.max(0, Math.min(255, v + (T[i] * l / tl - v) * k)))); });
  return key;
}
