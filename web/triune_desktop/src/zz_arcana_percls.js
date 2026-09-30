// zz_arcana_percls.js (v0.54) — every order's own Major Arcana. The user (2026-09-29): "Some of the major arcana don't
// work for all classes like wisps don't die, so each class needs its own major arcana".
// The class clusters and hybrids were already each order's own. The shared ones were the Hollow and Void cards at the
// seat of every body. Two of them assumed minions and a refillable pool:
//  - The Hollow Crown ("your minions can't die...") did nothing for the Hollow Mystic's wisps, the Shrine Keeper or the
//    Empty Hand. Each order now wears its own crown: the Ossuarch keeps the Hollow Crown, the Hemomancer the Crown of
//    the Brood (the same pact, over the brood), the Hollow Mystic the Choir Crown (spent wisps come back), the Shrine
//    Keeper the Paper Crown (Omens that never fade) and the Empty Hand the Crown of Nothing (the sand held back).
//  - The Unwritten names each order's own resource, and for the Empty Hand runs the sand back instead.
// Hollow Step, Unheard, The Last Silence and The Unmade are the same for everyone and read true for everyone.
(function () {
  if (typeof ARC === 'undefined' || !ARC.v_crown) return;
  const CROWN = {
    ossumancer: { name: 'The Hollow Crown', up: 'Your minions can\'t die while you are above half life, but each one drains 0.5% of your life per second.', rev: 'Potions don\'t heal you. Each minion within 4 yd mends 1% of your life per second instead.' },
    hemomancer: { name: 'The Crown of the Brood', up: 'Your brood, thralls and golem can\'t die while you are above half life, but each one drains 0.5% of your life per second.', rev: 'Potions don\'t heal you. Each of your brood within 4 yd mends 1% of your life per second instead.' },
    animancer: { name: 'The Choir Crown', up: 'While you are above half life, every wisp you spend or lose comes back to the choir 3 s later. Each wisp in your choir drains 0.3% of your life per second.', rev: 'Potions don\'t heal you. Each wisp in your choir mends 0.3% of your life per second instead.' },
    miasmancer: { name: 'The Paper Crown', up: 'While you are above half life your Omens never fade. Each Omen you carry drains 0.5% of your life per second.', rev: 'Potions don\'t heal you. Each Omen you carry mends 0.6% of your life per second instead.' },
    monk: { name: 'The Crown of Nothing', up: 'While you are above half life, neither bulb of your glass fills past four fifths. Each bulb more than half full drains 0.5% of your life per second.', rev: 'Potions don\'t heal you. While both bulbs are less than a quarter full you mend 1.5% of your life per second instead.' }
  };
  const REFILL = { ossumancer: 'refills 5% of your bone shards', hemomancer: 'refills 5% of your Vitae', animancer: 'refills 5% of your Essence', miasmancer: 'thickens your Miasma by 5%', monk: 'runs 5% of the sand back out of both bulbs of your glass' };
  const cls = () => (typeof P !== 'undefined' && P && P.cls) || 'ossumancer';
  const crown = () => CROWN[cls()] || CROWN.ossumancer;
  const def = (o, k, get) => { try { Object.defineProperty(o, k, { get, configurable: true, enumerable: true }); } catch (e) { } };
  def(ARC.v_crown, 'name', () => crown().name);
  def(ARC.v_crown, 'up', () => crown().up);
  def(ARC.v_crown, 'rev', () => crown().rev);
  const unwUp = 'Your kills leave no corpse and drop nothing, but each one ';
  if (ARC.v_unwritten) def(ARC.v_unwritten, 'up', () => unwUp + (REFILL[cls()] || REFILL.animancer) + '.');

  const OWN = { animancer: 1, miasmancer: 1, monk: 1 };   // the orders whose crown is not about minions
  // the base crown's minion drain and heal: only for the orders whose crown is about minions
  let inVoid = false;
  const _ml = minionList;
  minionList = function () { if (inVoid && OWN[P.cls]) return []; return _ml.apply(this, arguments); };
  const _cs = crownSave;
  crownSave = function () { if (OWN[P.cls]) return; return _cs.apply(this, arguments); };
  const _ph = potionHeal;
  potionHeal = function (amt) { if (aR('v_crown')) { say(crown().name + ' refuses the draught', 1.4); return 0; } return _ph.apply(this, arguments); };

  // the Choir Crown: wisps that leave come back
  G.crownWisps = G.crownWisps || [];
  const upOk = () => aU('v_crown') && P.hp > D.maxHp * 0.5;
  if (typeof takeWisp === 'function') { const _tw = takeWisp; takeWisp = function () { const w = _tw.apply(this, arguments); try { if (w && P.cls === 'animancer' && upOk()) G.crownWisps.push(G.time + 3); } catch (e) { } return w; }; }
  if (typeof perish === 'function') { const _pe = perish; perish = function (w) { const r = _pe.apply(this, arguments); try { if (P.cls === 'animancer' && upOk()) G.crownWisps.push(G.time + 3); } catch (e) { } return r; }; }

  const _uv = updateVoid;
  updateVoid = function (dt) {
    inVoid = true;
    try { _uv.apply(this, arguments); } finally { inVoid = false; }
    try {
      if (P.dead) return;
      const c = P.cls, up = aU('v_crown'), rv = aR('v_crown'), half = P.hp > D.maxHp * 0.5;
      if (c === 'animancer') {
        const n = (P.wisps || []).length;
        if (up && n) P.hp = Math.max(1, P.hp - D.maxHp * 0.003 * n * dt);
        if (rv && n) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.003 * Math.min(10, n) * dt);
        if (G.crownWisps && G.crownWisps.length) {
          const cap = typeof effCap === 'function' ? effCap() : D.wispCap;
          G.crownWisps = G.crownWisps.filter(t => { if (G.time < t) return true; if (up && P.wisps.length < cap) { spawnWisp(); const w = P.wisps[P.wisps.length - 1]; if (w) burst(P.x, P.y, '#d8f3ff', 6, 1.4); } return false; });
        }
      } else if (c === 'miasmancer') {
        const n = P.omens || 0;
        if (up && n) { if (half) P.omenT = Math.max(P.omenT || 0, 1); P.hp = Math.max(1, P.hp - D.maxHp * 0.005 * n * dt); }
        if (rv && n) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.006 * n * dt);
      } else if (c === 'monk' && typeof KS !== 'undefined' && KS.fill) {
        const q = KS.fill();
        if (up) {
          if (half) { P.kR = Math.min(P.kR, q.h * 0.8); P.kA = Math.min(P.kA, q.h * 0.8); }
          const n = (q.fR > 0.5 ? 1 : 0) + (q.fA > 0.5 ? 1 : 0);
          if (n) P.hp = Math.max(1, P.hp - D.maxHp * 0.005 * n * dt);
        }
        if (rv && q.fR < 0.25 && q.fA < 0.25) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.015 * dt);
      }
    } catch (e) { }
  };
  // the Unwritten for the Empty Hand: the sand runs back
  const _kv = onKillVoid;
  onKillVoid = function (m) {
    const r = _kv.apply(this, arguments);
    try { if (P.cls === 'monk' && aU('v_unwritten') && m.rank !== 'boss' && window.__sand) { window.__sand.runBack(0.05, 0); window.__sand.runBack(0.05, 1); } } catch (e) { }
    return r;
  };
  try { window.__percls = { CROWN, REFILL, crown }; } catch (e) { }
})();
