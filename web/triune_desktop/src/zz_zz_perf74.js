// zz_zz_perf74.js — the user (2026-09-29): "The game runs really slow on mobile now." And: "there still is a dark circle
// shadow underneath the player." And: "for boss fights we will never lock our player into a small room with them. Like
// how Dark Souls does it — we want the Diablo approach where you can run as much as you need to."
(function () {
  // ------------------------------------------------------------------ a slow device, found out and spared
  // A phone or tablet (a coarse pointer, a mobile user agent) starts in the lighter mode; anything else is watched for its
  // first seconds of play and drops into it if frames run long. The lighter mode keeps the look (the lantern pool, the
  // dark, the shadows) and pays less for it: the dark is painted at half resolution and a third as often, the light map
  // is cut into bands every other frame, and the hero throws only the lantern's shadow.
  const PF = { slow: false, why: '', ft: 0, n: 0 };
  try {
    const mob = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (mob) { PF.slow = true; PF.why = 'mobile'; }
    const q = /[?&]fx=(lo|hi)\b/.exec(location.search || ''); if (q) { PF.slow = q[1] === 'lo'; PF.why = 'url'; }
    window.__perf74 = PF;
  } catch (e) { }
  let last = 0;
  const watch = t => {
    if (last && G.zone && !G.paused && PF.why !== 'url') {
      const d = Math.min(200, t - last); PF.ft = PF.ft ? PF.ft * 0.95 + d * 0.05 : d; PF.n++;
      if (!PF.slow && PF.n > 150 && PF.ft > 26) { PF.slow = true; PF.why = 'frame time ' + PF.ft.toFixed(0) + 'ms'; }
    }
    last = t; requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
  if (typeof quantLight37 === 'function') {
    const _q = quantLight37; let f = 0;
    quantLight37 = function () { return _q.apply(this, arguments); };   // v0.79: no skipping (stale bands jittered on phones)
  }
  if (typeof figureShadows37 === 'function') { const _f = figureShadows37; figureShadows37 = function () { if (PF.slow) return; return _f.apply(this, arguments); }; }
  // ------------------------------------------------------------------ no blob under the hero: the true shadow does it now
  if (typeof shadow === 'function') {
    const _sh = shadow;
    shadow = function (x, y, r) { if (x === P.x && y === P.y && window.__shadow70) return; return _sh.apply(this, arguments); };
  }
  // ------------------------------------------------------------------ bosses: no sealed rooms, ever
  // The old boss room ringed itself with fog walls the moment you stepped in. Now the fight simply begins: the boss wakes
  // and comes for you, and you can run as far as you need, kite it round the pillars, back out into the zone and come
  // again. It follows as far as it cares to; if you leave it far behind, it goes home and waits (it does not heal).
  if (typeof checkBossRoom === 'function') {
    const _cbr = checkBossRoom;
    checkBossRoom = function () {
      const z = G.zone; if (!z || !z.boss || z.boss.dead) return;
      if (z.qLair) return _cbr.apply(this, arguments);   // the quest lairs never sealed; they already let you run
      const b = z.boss, r = z.bossRoom; if (!r) return;
      if (G.bossFight && G.bossZone === z.id) {
        if (Math.hypot(P.x - b.x, P.y - b.y) > 34) { G.bossFight = false; G.seal = []; b.x = b.hx != null ? b.hx : b.x; b.y = b.hy != null ? b.hy : b.y; b.state = 'idle'; b.path = null; }
        return;
      }
      if (G.bossFight) return;
      if (P.x > r.x + 0.8 && P.y > r.y + 0.8 && P.x < r.x + r.w - 0.8 && P.y < r.y + r.h - 0.8) {
        G.bossFight = true; G.seal = []; G.bossZone = z.id; b.state = 'chase';
        if (typeof banner === 'function') banner(b.name.toUpperCase(), '#c8553d', 3);
        if (typeof sfx === 'function') sfx(60, 1.2, 'sawtooth', 0.06, 40);
      }
    };
  }
  // an old save caught mid-fight may still have fog on the doorways: lift it
  try { if (typeof unseal === 'function' && G.seal && G.seal.length) unseal(); } catch (e) { }
})();
