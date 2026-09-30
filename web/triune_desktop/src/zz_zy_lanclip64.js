// zz_zy_lanclip64.js — the lantern.
// v0.64 hung it at the hip on a chain. v0.74 (the user, 2026-09-29): "treat them like its own unit that is untargetable
// and follows you very closely. It just hovers and follows you, because every lantern is bound with a soul."
//
// THE WICKBOUND. No lantern in the Godmarrow burns oil. Each is lit with a soul that chose to be kept rather than go down
// into the Last Breath: a pilgrim who fell on the road, a mother from the crypt niches, someone nobody remembers. The soul
// is the flame. It picks the one it will follow, and it goes where they go, a little behind, a little to one side, the way
// a dog walks with you at night. It cannot be struck and it cannot be told what to do. When you fall, it is what carries
// your anima back to the lantern-stones; it keeps a little of you each time, and that is what it burns.
// (The voice lines already say it: "The lantern gives you back. It keeps a little, as it always does.")
//
// So the lantern is its own small, unhittable follower: it floats at about shoulder height, drifts behind you as you
// walk, comes round to your side when you stop, idles in small slow loops, bobs on its own breath and leans with its
// motion. It carries no chain and throws no shadow; it is the light. Its glass is where the light comes from, and the
// pool of light on the ground lies under it, wherever it is.
(function () {
  const LS = window.__LANTERNS || {}, IMG = {};
  for (const k in LS) { const im = new Image(); im.src = LS[k].png; IMG[k] = im; }
  const WHO = { hemomancer: 'iron', animancer: 'gold' };
  const on = () => { const h = window['__HHD_' + P.cls]; return !!(WHO[P.cls] && h && h.meta && h.meta.clip && IMG[WHO[P.cls]]); };
  // the soul's body in the world: position (tiles), velocity, the way you were last going, and its own slow wandering
  const S = { x: null, y: null, vx: 0, vy: 0, mdx: 0.7, mdy: 0.7, t: 0, px: null, py: null, z: null, tilt: 0, ph: Math.random() * 6.28, zone: null };
  function tick() {
    const dt = Math.min(0.05, Math.max(0, G.time - (S.t || G.time))); S.t = G.time;
    if (S.x == null || S.zone !== G.zone || Math.hypot(S.x - P.x, S.y - P.y) > 4) {   // a new zone, a waypoint: it arrives with you
      S.zone = G.zone; S.x = P.x + 0.35; S.y = P.y - 0.35; S.vx = S.vy = 0; S.px = P.x; S.py = P.y; return;
    }
    if (!dt) return;
    const hvx = (P.x - S.px) / dt, hvy = (P.y - S.py) / dt, hs = Math.hypot(hvx, hvy); S.px = P.x; S.py = P.y;
    if (hs > 0.4) { const k = Math.min(1, dt * 6); S.mdx += (hvx / hs - S.mdx) * k; S.mdy += (hvy / hs - S.mdy) * k; const n = Math.hypot(S.mdx, S.mdy) || 1; S.mdx /= n; S.mdy /= n; }
    // where it wants to be: walking, a little behind and to the side; standing, at your side, idling in slow loops
    const mv = Math.min(1, hs / 2.5), px = -S.mdy, py = S.mdx, t = G.time + S.ph;
    const back = 0.08 + 0.22 * mv, side = 0.4 - 0.08 * mv;
    const wx = Math.sin(t * 0.37) * 0.1 + Math.sin(t * 0.91) * 0.04, wy = Math.cos(t * 0.29) * 0.1 + Math.cos(t * 0.73) * 0.04;
    const tx = P.x - S.mdx * back + px * side + wx * (1 - mv), ty = P.y - S.mdy * back + py * side + wy * (1 - mv);
    // a soft, slightly floaty spring
    S.vx += ((tx - S.x) * 30 - S.vx * 9) * dt; S.vy += ((ty - S.y) * 30 - S.vy * 9) * dt;
    S.x += S.vx * dt; S.y += S.vy * dt;
    const d = Math.hypot(S.x - P.x, S.y - P.y); if (d > 0.75) { S.x = P.x + (S.x - P.x) / d * 0.75; S.y = P.y + (S.y - P.y) / d * 0.75; }
    // height: it rides at about the shoulder, breathing up and down on its own
    S.z = 20 + Math.sin(t * 1.55) * 1.6 + Math.sin(t * 0.6) * 0.8;
    const svx = (S.vx - S.vy) * TW / 2;                                         // screen-x speed leans it
    S.tilt += (Math.max(-0.35, Math.min(0.35, -svx * 0.004)) - S.tilt) * Math.min(1, dt * 5);
  }
  const glass = () => { const q = iso(S.x, S.y), L = LS[WHO[P.cls]]; return { x: q.sx, y: q.sy - S.z + (L ? L.h / L.k * 0.15 : 0) }; };
  // the light, the glow and the pool read these
  const _pl = window.__plLamp;
  window.__plLamp = function () { if (!on() || S.x == null) return _pl ? _pl() : null; return glass(); };
  window.__lampW = () => (on() && S.x != null ? { x: S.x, y: S.y, z: S.z } : null);
  if (typeof drawClassLamp === 'function') {
    const _dcl = drawClassLamp;
    drawClassLamp = function (list) {
      _dcl(list);
      try {
        if (!on() || P.dead || !G.zone) { S.x = null; return; }
        tick();
        const q = iso(S.x, S.y), hq = iso(P.x, P.y);
        // behind the hero (for the glow): further from the eye and overlapping the figure
        window.__lanBehind = (S.x + S.y) < (P.x + P.y) - 0.05 && Math.abs(q.sx - hq.sx) < 9 && (q.sy - S.z) > hq.sy - 58;
        list.push({ d: S.x + S.y, f: () => {
          const im = IMG[WHO[P.cls]]; if (!im.complete) return;
          const L = LS[WHO[P.cls]], k = L.k, w = L.w / k, h = L.h / k;
          ctx.save(); ctx.imageSmoothingEnabled = false;
          ctx.translate(Math.round(q.sx * 4) / 4, Math.round((q.sy - S.z - h * 0.35) * 4) / 4); ctx.rotate(S.tilt);   // it hangs from nothing
          if ((P.face || 1) < 0) ctx.scale(-1, 1);
          (typeof _drawImage !== 'undefined' ? _drawImage : ctx.drawImage).call(ctx, im, -w / 2, 0, w, h);
          ctx.restore();
        } });
      } catch (e) { if (typeof reportError === 'function') reportError(e); }
    };
  }
})();
