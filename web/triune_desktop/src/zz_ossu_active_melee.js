// zz_ossu_active_melee.js (v0.52) — the Ossuarch's melee skills are active strikes, like a D2 Paladin's Zeal or a
// Barbarian's Bash. User (2026-09-28): "the melee skills for ossuarch shouldnt be passive, they will be like the
// pally and barb skills in d2 ... if you have a sword equipped and use bone scythe, you swing a bone scythe instead".
//
//  - Bone Blade stops being a passive. It is a strike you put on either mouse button: for one stroke your weapon,
//    whatever it is, grows a long blade of bone that hits harder, reaches further and cleaves. Hold to keep striking.
//  - Every Carapace strike shows its own bone weapon in his hands (zz_hero_ossumancer.js, O6_WPN): Scythe Sweep,
//    Grave Leap and Grinding Charge a scythe of vertebrae, Marrow Crush a femur maul, Spine Lash a spine whip,
//    Bone Blade the long bone blade. A plain attack still shows the equipped weapon.
//  - Held strikes (repeat casts) now keep their own animation: the hold-to-repeat path called boneCast directly
//    and skipped the pose marker, so a held Scythe Sweep played the generic cast pose.
(function () {
  if (typeof SK === 'undefined' || !SK.blade || typeof BS === 'undefined') return;
  const POISE = 5;
  const bladeK = () => 1.3 + 0.1 * Math.max(1, P.skills.blade || 0);
  const BLADE_REACH = 0.45;

  // ---- the skill record
  const B = SK.blade;
  B.kind = 'cast'; B.mana = 0; B.shards = 0; B.stam = POISE;
  B.desc = 'For one stroke your weapon, whatever you hold, grows a long blade of bone. The stroke hits harder, reaches further and cleaves into the enemies beside the one you strike. Put it on either mouse button and hold to keep striking. [Poise: ' + POISE + ']';
  try { if (!LEFT_SKILLS.includes('blade')) LEFT_SKILLS.push('blade'); if (!RIGHT_SKILLS.includes('blade')) RIGHT_SKILLS.push('blade'); } catch (e) { }

  // ---- the passive part is gone: no standing melee bonus, no cleave on ordinary swings
  BS.blade = () => 1;
  if (typeof boneSwing === 'function') {
    const _bs = boneSwing;
    boneSwing = function (m) {
      if (P._bladeOn) return _bs.apply(this, arguments);
      const lv = P.skills.blade; P.skills.blade = 0;
      try { return _bs.apply(this, arguments); } finally { P.skills.blade = lv; }
    };
  }
  if (typeof meleeReach === 'function') {
    const _mr = meleeReach;
    meleeReach = function () { return _mr() + (P._bladeOn ? BLADE_REACH : 0); };
  }
  if (typeof boneInfo === 'function') {
    const _bi = boneInfo;
    boneInfo = function (id) {
      if (id !== 'blade') return _bi.apply(this, arguments);
      const n = P.skills.bladecleave > 0 ? 3 : 1;
      return `x${bladeK().toFixed(2)} weapon damage · +${BLADE_REACH} yd reach · cleaves ${n} for ${Math.round(BS.cleave() * 100)}%`;
    };
  }

  // ---- the strike
  function bladeStrike(pt) {
    if (!P.skills.blade || P.roll > 0 || P.cast > 0 || P.dead) return;
    const a = losPoint(pt || aimPoint());
    P._bladeOn = true;
    let reach; try { reach = meleeReach(); } finally { P._bladeOn = false; }
    if (!meleeApproach('blade', a, reach + 0.05)) return;
    if (!spendMana('blade')) return;
    const m = meleeFoe(a, 9), tgt = m && !m.dead && dist(m, P) <= reach + m.r + 0.05 ? m : null;
    if (typeof O6_MELEE !== 'undefined') { P._melSk = O6_MELEE.blade; P._melSk0 = 0; }
    faceTo(a.x, a.y);
    const mm = D.meleeMult; P._bladeOn = true; D.meleeMult = mm * bladeK();
    try { swing(tgt); } finally { D.meleeMult = mm; P._bladeOn = false; }
    P.cast = 0.5 / D.castSpd;
    if (tgt) { burst(tgt.x, tgt.y, '#e8dcc0', 5, 1.4); sfx(150, 0.08, 'sawtooth', 0.04, -60); }
    try { onBoneCastArc('blade', a); } catch (e) { }
  }

  if (typeof boneCast === 'function') {
    const _bc = boneCast;
    boneCast = function (id, pt) {
      if (id === 'blade' && isBone()) { bladeStrike(pt); return; }
      // every Carapace strike marks its pose, whichever path cast it (click, held repeat, approach)
      if (isBone() && typeof O6_MELEE !== 'undefined' && O6_MELEE[id] && P.cast <= 0 && P.roll <= 0) { P._melSk = O6_MELEE[id]; P._melSk0 = 0; }
      return _bc.apply(this, arguments);
    };
    try { if (window.__spm) window.__spm.boneCast = boneCast; } catch (e) { }
  }

  // ---- hold to keep striking (Bone Blade and Spine Lash join the quick strikes that repeat while held)
  if (typeof updateBones === 'function') {
    const _ub = updateBones;
    updateBones = function (dt) {
      const r = _ub.apply(this, arguments);
      if (isBone() && !G.paused) for (const id of ['blade', 'lash']) if (P.skills[id] && heldSkill(id) && P.cast <= 0 && P.roll <= 0 && !P.dead) boneCast(id);
      return r;
    };
  }
  try { if (typeof rederive === 'function' && typeof P !== 'undefined' && P.cls === 'ossumancer') rederive(); } catch (e) { }
})();
