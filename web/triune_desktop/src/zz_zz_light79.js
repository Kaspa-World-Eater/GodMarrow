// zz_zz_light79.js — the user (2026-09-29): "On mobile at least, the lights are doing a strobe effect that is annoying.
// Make the concentric rings of light a little more evident and contrast the light and darkness a bit more. Still kinda
// feels like there is too much glow and it's not coming from the lantern. Monsters need to be bolder by 20%, make the
// stagger 20% stronger. Sometimes when the Hollow Mystic is attacking there is a weird streak of light, maybe a wisp. His
// spells should also cost wisps."
(function () {
  // ------------------------------------------------------------------ flames without strobe
  // Every flame's flicker (flame55 via flick37) carried noise up to ~23 Hz. The light map is cut into bands, so a
  // flicker makes whole bands jump; at a phone's 30 fps that fast noise aliased into a strobe. Each flame is now eased
  // over about a fifth of a second: the slow swells and gutters stay, the flutter goes.
  const SM = new Map();
  function smooth(seed, raw) {
    let s = SM.get(seed); const t = G.time;
    if (!s) { s = { v: raw, t }; SM.set(seed, s); return raw; }
    const dt = Math.max(0, Math.min(0.2, t - s.t)); s.t = t; if (!dt) return s.v;
    s.v += (raw - s.v) * (1 - Math.exp(-dt * 5)); return s.v;
  }
  if (typeof flick37 === 'function') { const _f = flick37; flick37 = function (seed) { return smooth(seed, _f.apply(this, arguments)); }; }
  const _gf = window.__grade && window.__grade.flame;
  window.__flameS = seed => smooth('g' + seed, _gf ? _gf(seed) : 1);
  // ------------------------------------------------------------------ the pool's edge in tiles (for sizing lights to it)
  window.__poolTiles = () => {
    const hl = typeof heroLightR === 'function' ? heroLightR() : 5, lk = window.__lampK ? window.__lampK() / 1.5 : 1;
    const out = G.zone && isOutdoor(G.zone), dk = out ? dayK() : 0;
    return Math.min(hl, 5.4 * lk) * 0.4 * (1 + 0.5 * dk) * (window.__lampMood ? window.__lampMood() : 1);
  };
  // ------------------------------------------------------------------ stagger 20% stronger
  // Blows break a creature's poise 20% sooner, and the reel that follows lasts 20% longer.
  if (typeof poiseHit === 'function') {
    const _ph = poiseHit;
    poiseHit = function (m, amt) {
      const was = m ? (m.reel || 0) : 0;
      const r = _ph.call(this, m, amt * 1.2);
      try { if (m && (m.reel || 0) > was + 0.01) { m.reel *= 1.2; m.stun = Math.max(m.stun || 0, m.reel); } } catch (e) { }
      return r;
    };
  }
  // ------------------------------------------------------------------ the Hollow Mystic: wisps are fuel
  // v0.80 (user: "more wisps around lead to a stronger attack, but as your wisps decline the spells get weaker. 0 wisps
  // is a penalised spell"): each cast still burns a wisp (two for the dearest), but nothing is ever refused. His spells'
  // damage follows the choir he has at the moment they strike: 65% with no wisps at all, rising to 120% at a full choir.
  // His melee and his golem's blows are not affected.
  const OWN = new Set(['swarm', 'storm', 'echo', 'condense', 'attack']);
  const choirK = () => { const cap = Math.max(1, (typeof effCap === 'function' ? effCap() : 0) || (D && D.wispCap) || 4); const n = (P.wisps || []).length; return 0.65 + 0.55 * Math.min(1, n / cap); };
  window.__choirK = choirK;
  if (typeof spendMana === 'function') {
    const _sm = spendMana;
    spendMana = function (id, amt) {
      const ok = _sm.apply(this, arguments);
      if (!ok || P.cls !== 'animancer' || !id || OWN.has(id) || amt != null) return ok;
      let n = 1; try { if (typeof skillCost === 'function' && skillCost(id) >= 40) n = 2; } catch (e) { }
      for (let i = 0; i < n && P.wisps && P.wisps.length; i++) { if (typeof takeWisp === 'function') takeWisp(); else P.wisps.pop(); }
      return ok;
    };
  }
  if (typeof hurtMon === 'function') {
    const _hm = hurtMon;
    hurtMon = function (m, dmg, col) {
      if (P.cls === 'animancer' && !G.hitSrc && !(P.swing > 0) && dmg > 0) dmg *= choirK();
      return _hm.call(this, m, dmg, col);
    };
  }
  // v0.81 (user: "the other ideas were cool"): the choir also shapes the spell itself, judged at the moment of casting
  // (before its wisp burns). A full choir raises one more mirror or pillar, sends the chain one bounce further, and makes
  // what he conjures last longer and reach further; a thin choir takes one away and makes it brief and small.
  if (typeof WS === 'object' && typeof castSkill === 'function') {
    let CF = null;   // the choir, as a fraction of full, while a spell is being cast
    const COUNT = ['pillarN', 'cageN', 'chainN', 'totemN', 'prismN', 'cascadeN'];
    const LIFE = ['pillarLife', 'cageLife', 'markLife', 'leashLife', 'totemLife', 'stormLife', 'condLife'];
    const SIZE = ['fissureLen', 'markR', 'leashLen', 'burstR'];
    const wrap = (k, fn) => { const f0 = WS[k]; if (typeof f0 !== 'function') return; WS[k] = function () { const v = f0.apply(this, arguments); return CF == null || typeof v !== 'number' ? v : fn(v, CF); }; };
    COUNT.forEach(k => wrap(k, (v, f) => Math.max(1, Math.round(v) + (f >= 0.8 ? 1 : 0) - (f < 0.2 ? 1 : 0))));
    LIFE.forEach(k => wrap(k, (v, f) => v * (0.75 + 0.4 * f)));
    SIZE.forEach(k => wrap(k, (v, f) => v * (0.8 + 0.3 * f)));
    const _cs = castSkill;
    castSkill = function (id) {
      if (P.cls !== 'animancer' || OWN.has(id)) return _cs.apply(this, arguments);
      const cap = Math.max(1, (typeof effCap === 'function' ? effCap() : 0) || 4);
      CF = Math.min(1, (P.wisps || []).length / cap);
      try { return _cs.apply(this, arguments); } finally { CF = null; }
    };
    window.__choirShape = () => CF;
  }
  // ------------------------------------------------------------------ the player's stagger, 20% stronger too
  // Blows drain your poise 20% faster, and when it breaks the stun (and the grace after it) lasts 20% longer.
  if (typeof playerPoiseHit === 'function') {
    const _pph = playerPoiseHit;
    playerPoiseHit = function (d) {
      const was = P.stagger || 0, args = Array.prototype.slice.call(arguments); args[0] = (d || 0) * 1.2;
      const r = _pph.apply(this, args);
      if ((P.stagger || 0) > was + 0.01) {
        P.stagger *= 1.2; if (P.heavyStun) P.heavyStun *= 1.2; P.cast = Math.max(P.cast || 0, P.stagger); if (P.poiseGrace) P.poiseGrace += P.stagger / 6;
      }
      return r;
    };
  }
  try { window.__light79 = { SM, cast: (id, pt) => castSkill(id, pt), poiseHit: (m, a) => poiseHit(m, a), monPoiseMax: m => monPoiseMax(m) }; } catch (e) { }
})();
