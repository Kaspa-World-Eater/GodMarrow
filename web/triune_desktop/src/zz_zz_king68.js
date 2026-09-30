// zz_zz_king68.js — the user (2026-09-29): "Add a mini cow boss, an undead cow king (hinted at), it's a zombie, wrapping
// for an age past and glories lost."
// In the ring of the dead herd on the Burnt Heath, the herd's lord still stands: a bull-headed thing of bone and grave
// wrappings, its crown slipped down around one horn, its purple rotted to rags, a poleaxe too heavy for anyone living.
// Nothing names him outright. He wakes when you step into the ring, and his escorts (the herd's own dead) rise with him.
(function () {
  if (typeof MON !== 'object' || typeof makeMon !== 'function') return;
  const K = window.__KING || null;
  MON.herdlord = Object.assign({}, MON.bell || {}, { name: 'The Hollow King', spr: MON.bell ? MON.bell.spr : 'bell', hp: 260, dmg: [12, 22], spd: 1.15, r: 0.55, xp: 260, ai: 'melee', range: 1.5, wind: 0.95, rec: 1.1, armor: 35, poiseK: 1.6 });
  try { if (typeof UNIQUES !== 'undefined') UNIQUES.push({ name: 'Circlet of the Last Herd', base: 'hood', stats: { life: 30, armor: 25, lrad: 20, res: 10 }, lvl: 99 }); } catch (e) { }
  // ------------------------------------------------------------------ the frames
  const IMG = {}, S3 = 3.1;
  if (K) for (const key in K.f) { const im = new Image(); im.src = K.f[key][0]; IMG[key] = im; }
  const WH = {};
  const white = im => { if (WH[im.src]) return WH[im.src]; const c = mkCanvas(im.naturalWidth, im.naturalHeight), x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return (WH[im.src] = c); };
  function view(m) {
    const dx = P.x - m.x, dy = P.y - m.y, sx = dx - dy, sy = dx + dy;
    const v = sy < -Math.abs(sx) * 0.45 ? 'back' : Math.abs(sy) < Math.abs(sx) * 0.45 ? 'side' : 'front';
    return [v, sx < 0 ? -1 : 1];
  }
  function blit(key, m, flip, flash, alpha) {
    const e = K && K.f[key], im = IMG[key]; if (!e || !im || !im.complete) return null;
    const p = iso(m.x, m.y), w = im.naturalWidth / S3, h = im.naturalHeight / S3, dx = e[1] / S3, dy = e[2] / S3;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(p.sx), Math.round(p.sy + 2)); if (flip < 0) ctx.scale(-1, 1);
    const src = flash ? white(im) : im;
    (typeof _drawImage !== 'undefined' ? _drawImage : ctx.drawImage).call(ctx, src, dx, dy, w, h);
    ctx.restore();
    return { x: Math.round(p.sx - w / 2), y: Math.round(p.sy + 2 + dy), w: Math.round(w), h: Math.round(h) };
  }
  const has = k => !!(K && K.f[k]);
  const N = pose => { let n = 0; while (has(pose + '/front/' + n)) n++; return n || 1; };
  if (typeof drawMon16 === 'function') {
    const _dm = drawMon16;
    drawMon16 = function (m, flash, alpha) {
      if (m.type !== 'herdlord' || !K) return _dm.apply(this, arguments);
      const [v, f] = view(m);
      const mv = m._kx == null ? 0 : Math.hypot(m.x - m._kx, m.y - m._ky); m._kx = m.x; m._ky = m.y; m._kw = (m._kw || 0) + mv;
      let pose = 'walk', i = 0;
      if (m.state === 'windup') { pose = 'attack'; i = Math.min(3, Math.floor(m.t / (m.b.wind || 1) * 4)); }
      else if (m.state === 'recover') { pose = 'attack'; i = Math.min(N('attack') - 1, 4 + Math.floor(m.t / 0.3)); }
      else if (m.state === 'idle') { pose = 'walk'; i = 0; }
      else i = Math.floor(m._kw * 3.2) % N('walk');
      const vv = has(pose + '/' + v + '/' + i) ? v : 'front';
      return blit(pose + '/' + vv + '/' + i, m, f, flash, alpha) || _dm.apply(this, arguments);
    };
  }
  // the fall: the death frames play where he died, then he lies there
  const FALLS = [];
  if (typeof drawClassLamp === 'function') {
    const _dcl = drawClassLamp;
    drawClassLamp = function (list) {
      _dcl(list);
      for (const d of FALLS) if (d.z === G.zone && onScreen(d.m.x, d.m.y, 80)) list.push({ d: d.m.x + d.m.y - 0.1, f: () => { const n = N('death'), i = Math.min(n - 1, Math.floor((G.time - d.t) * 6)); blit('death/front/' + i, d.m, d.f, false, 1); } });
    };
  }
  // ------------------------------------------------------------------ the waking and the fall
  const spawn = z => {
    if (z._king || z.id !== 'burnt_heath' || !window.__decor66) return;
    window.__decor66.place(z); const h = z._herd; if (!h) return;
    const lv = Math.max(6, (z.mlvl || z.lo || 5) + 2);
    const k = makeMon('herdlord', h.x, h.y + 0.5, lv, 'unique', ['Stone Skin']); k.name = 'The Hollow King'; k._king = true; z.monsters.push(k); z._king = k;
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.7, e = makeMon(MON.hollow ? 'hollow' : Object.keys(MON)[0], h.x + Math.cos(a) * 2.2, h.y + Math.sin(a) * 2.2, lv - 1, 'minion', []); e.pack = k.pack = 'king'; e.name = 'Herd-Dead'; z.monsters.push(e); }
  };
  if (typeof updateMonsters === 'function') {
    const _um = updateMonsters;
    updateMonsters = function (dt) {
      try {
        const z = G.zone; if (z) { spawn(z); const k = z._king;
          if (k && !k.dead && !z._kingWoke && k.state !== 'idle') { z._kingWoke = true; if (typeof say === 'function') say('In the middle of the herd, something that was kneeling stands up. It still wears its crown.', 5); }
        }
      } catch (e) { }
      return _um.apply(this, arguments);
    };
  }
  if (typeof killMon === 'function') {
    const _km = killMon;
    killMon = function (m) {
      const was = m && !m.dead && m.type === 'herdlord';
      const r = _km.apply(this, arguments);
      try {
        if (was) {
          FALLS.push({ m: { x: m.x, y: m.y }, t: G.time, f: view(m)[1], z: G.zone });
          if (typeof say === 'function') say('The crown rolls into the ash. There is no one left to kneel.', 5);
          const u = typeof UNIQUES !== 'undefined' && UNIQUES.find(q => q.name === 'Circlet of the Last Herd');
          if (u && typeof newBaseItem === 'function' && typeof dropItem === 'function') { const it = newBaseItem(u.base); it.q = 'unique'; it.name = u.name; it.stats = { ...u.stats }; it.lvl = 6; dropItem(it, m.x, m.y); }
        }
      } catch (e) { }
      return r;
    };
  }
})();
