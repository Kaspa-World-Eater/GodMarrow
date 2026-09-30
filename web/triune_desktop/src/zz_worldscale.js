// zz_worldscale.js (v0.54) — the world a third larger around the same-sized hero. The user: "where are you on upgrading
// the world? So everything's larger and bigger so we feel properly sized compared to the objects of the world like in
// the old growth demo". The camera now draws a world pixel at 4 screen pixels (ZK 1.0, was 0.75: 3), so ground, walls,
// trees, props and every yard are a third larger on screen; the creatures and heroes are drawn three quarters as large
// in world terms, so on screen they stay exactly the size (and the pixel grain) they were.
const WSCALE = { on: true, k: 0.75, depth: 0 };
{
  const _di = ctx.drawImage;
  ctx.drawImage = function (img, a, b) {
    if (WSCALE.on && G._inWorld && !WSCALE.depth && arguments.length === 3 && img && img._hr && !img._world) {
      const w = img.width, h = img.height, k = WSCALE.k;
      return _di.call(this, img, a + w * (1 - k) / 2, b + h * (1 - k), w * k, h * k);
    }
    return _di.apply(this, arguments);
  };
}
// the townsfolk (the hooded vendor figures) are painted as objects, not creatures: mark their frames as characters
{
  const _os = ztObjSprite;
  ztObjSprite = function (o) {
    const s = _os.apply(this, arguments);
    if (s && (o.type === 'vendor' || o.spr === 'vendor') && !s._charMarked) { s._charMarked = true; for (const k of ['c', 'f', 'fl', 'flf']) if (s[k]) s[k]._char = true; }
    return s;
  };
  const _di = ctx.drawImage;
  ctx.drawImage = function (img, a, b) {
    if (WSCALE.on && G._inWorld && !WSCALE.depth && arguments.length === 3 && img && img._char && !img._hr) {
      const w = img.width, h = img.height, k = WSCALE.k;
      return _di.call(this, img, a + w * (1 - k) / 2, b + h * (1 - k), w * k, h * k);
    }
    return _di.apply(this, arguments);
  };
}
// Whole creatures (their painted frame and everything drawn by hand around it: weapons, tentacles, claws, auras on the
// body) are drawn through a scale about their feet. Inside such a call the single-image rule above stands aside.
{
  const K = () => WSCALE.k;
  const scaleRect = (r, p) => {
    if (!r || typeof r !== 'object' || r.x == null || r.w == null) return r;
    const k = K(); return Object.assign({}, r, { x: p.sx + (r.x - p.sx) * k, y: p.sy + (r.y - p.sy) * k, w: r.w * k, h: r.h * k });
  };
  function scoped(fn, foot) {
    return function () {
      if (!WSCALE.on || !G._inWorld || WSCALE.depth) return fn.apply(this, arguments);
      let p = null; try { p = foot.apply(this, arguments); } catch (e) { }
      if (!p) return fn.apply(this, arguments);
      const k = K(); WSCALE.depth++; ctx.save(); ctx.translate(p.sx, p.sy); ctx.scale(k, k); ctx.translate(-p.sx, -p.sy);
      try { return scaleRect(fn.apply(this, arguments), p); } finally { ctx.restore(); WSCALE.depth--; }
    };
  }
  const at = (x, y) => { const q = iso(x, y); return { sx: q.sx, sy: q.sy }; };
  const heroFoot = () => at(P.x, P.y);
  // objects drawn through drawSpr (chests, lanterns and the like) keep the world's size; everything else is a creature
  const OBJ = new Set();
  try { for (const k of ['lantern', 'chest', 'chestOpen', 'shrine', 'shrineUsed', 'portal', 'altar']) if (typeof SPR !== 'undefined' && SPR[k]) OBJ.add(SPR[k]); } catch (e) { }
  { const _os2 = ztObjSprite; ztObjSprite = function (o) { const s = _os2.apply(this, arguments); if (s && !(o.type === 'vendor' || o.spr === 'vendor')) OBJ.add(s); return s; }; }
  const _ds = drawSpr;
  const drawSprScoped = scoped(_ds, (s, x, y) => at(x, y));
  drawSpr = function (s) { if (OBJ.has(s)) return _ds.apply(this, arguments); return drawSprScoped.apply(this, arguments); };
  drawMon16 = scoped(drawMon16, m => at(m.x, m.y));
  drawSkel16 = scoped(drawSkel16, e => at(e.x, e.y));
  if (typeof drawSpawnling === 'function') drawSpawnling = scoped(drawSpawnling, e => at(e.x, e.y));
  if (typeof drawSister === 'function') drawSister = scoped(drawSister, e => at(e.x, e.y));
  if (typeof drawFleshGolem === 'function') drawFleshGolem = scoped(drawFleshGolem, (g, x, y) => at(x, y));
  if (typeof drawGiant === 'function') drawGiant = scoped(drawGiant, (kind, s, o, x, y) => at(x, y));
  for (const n of ['drawMonk', 'drawMias', 'drawHemo', 'drawOssu', 'drawShell', 'drawSuit']) {
    try {
      if (n === 'drawMonk' && typeof drawMonk === 'function') drawMonk = scoped(drawMonk, heroFoot);
      if (n === 'drawMias' && typeof drawMias === 'function') drawMias = scoped(drawMias, heroFoot);
      if (n === 'drawHemo' && typeof drawHemo === 'function') drawHemo = scoped(drawHemo, heroFoot);
      if (n === 'drawOssu' && typeof drawOssu === 'function') drawOssu = scoped(drawOssu, heroFoot);
      if (n === 'drawShell' && typeof drawShell === 'function') drawShell = scoped(drawShell, heroFoot);
      if (n === 'drawSuit' && typeof drawSuit === 'function') drawSuit = scoped(drawSuit, heroFoot);
    } catch (e) { }
  }
  try { window.__wscale = WSCALE; } catch (e) { }
}
