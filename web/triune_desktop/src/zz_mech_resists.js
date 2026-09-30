// =================================================================== zz_mech_resists.js
// Board id: resists. 9-element resistance system, M1: typing + math.
//
// M1 scope only:
//   - Elements enum + per-skill mapping table (used later by M2).
//   - resists table on player (D.resists) via derive() wrap.
//   - resists table on monsters via makeMon() wrap.
//   - hurtMon and hurtPlayer accept an optional element and apply resist math.
//   - Removes 'ltng' (no lightning in this world): AFFIX 'of Sparks' and
//     'of the Storm' now roll magic instead, and any legacy 'ltng' key
//     coming in from an existing item is folded into 'magic' at derive time.
//   - Debug hotkey 0: spawn a rat with 50% miasma resist next to the player
//     and hit it once with 100 phys and once with 100 miasma so you can see
//     100 vs 50 float. This is the M1 verification path only; M2 wires the
//     real skills to their elements.
//
// Not in M1 (do not touch):
//   - Char panel resist row, gear affixes for each element, monster natural
//     resists by family, ailment reworks. Those are M2-M5.

(() => {

  // -------------------------------------------------------------- elements
  const ELEMENTS = ['phys', 'magic', 'miasma', 'blood', 'void', 'radiance', 'fire', 'cold', 'poison'];
  const RESIST_CAP = 75;
  const RESIST_FLOOR = -100;
  const DMG_CAP_MULT = 2; // taken damage capped at 2x when resist is deeply negative

  // Every currently active damage source, mapped to its ONE primary element.
  // The map is authoritative for M2 wiring. hurtMon call sites don't pass
  // element yet, so at runtime this is reference data + a starting point.
  //   ossumancer: bone spikes and bone constructs are physical (they're bone,
  //     not "magic"); the class flavour is bone-shaped kinetics.
  //   hemomancer: everything blood-tagged is 'blood'.
  //   miasmancer: cloud/gas skills are 'miasma'. Direct-touch venom is 'poison'
  //     (reserved element) so it survives even when the miasma cloud doesn't.
  //   kusho (monk): unarmed strikes are 'phys', dawn is 'radiance', eclipse
  //     is 'void'. Thousand-fists is bulk 'phys'.
  //   animancer: wisp bolts/beam/prism/lance/rebuke/phantom are 'magic'
  //     (soul-light, "the word made force"). Iron golem melee is 'phys'.
  //   Weapon melee: 'phys' unless the item carries a fire/cold/poison affix
  //     (M2 splits weapon-adds into their own element hits).
  //   Fire from affixes and 'burn' ticks: 'fire'.
  const SKILL_ELEMENT = {
    // --- iron / animancer
    pillars: 'phys', golem: 'phys', fissure: 'phys', toss: 'phys', cage: 'phys',
    anvil: 'phys', thorns: 'phys', challenge: 'phys',
    swarm: 'magic', ward: 'magic', lance: 'magic', beam: 'magic', prism: 'magic',
    cull: 'magic', condense: 'magic', leash: 'magic', totem: 'magic',
    rebuke: 'magic', phantom: 'magic', wraith: 'void', overcharge: 'magic',
    // --- ossumancer (bone)
    bspike: 'phys', bspear: 'phys', bwall: 'phys', bshard: 'phys', bnova: 'phys',
    bskel: 'phys', bpriest: 'phys', bknight: 'phys', bcolossus: 'phys',
    barmor: 'phys', bcage: 'phys', bprison: 'phys',
    // --- hemomancer (blood)
    bloodspike: 'blood', bloodbolt: 'blood', bloodrain: 'blood', bloodnova: 'blood',
    bloodgolem: 'blood', hemothrall: 'blood', engulf: 'blood', bleedout: 'blood',
    bleedecho: 'blood',
    // --- miasmancer
    miasgas: 'miasma', mias_cloud: 'miasma', miasbreath: 'miasma', miasplague: 'miasma',
    miaspool: 'miasma', miasvenom: 'poison', miasrot: 'miasma',
    // --- kusho / monk
    kthousand: 'phys', kfists: 'phys', kbreath: 'phys', kstance: 'phys',
    kdawn: 'radiance', klight: 'radiance', kbeacon: 'radiance',
    keclipse: 'void', kshadow: 'void', kabyss: 'void',
    // --- weapon-add affixes
    _fireAffix: 'fire', _coldAffix: 'cold', _psnAffix: 'poison'
  };

  // exposed globals for other agents (M2+) that want to look up an element
  if (typeof globalThis !== 'undefined') {
    globalThis.ELEMENTS = ELEMENTS;
    globalThis.SKILL_ELEMENT = SKILL_ELEMENT;
    globalThis.RESIST_CAP = RESIST_CAP;
    globalThis.RESIST_FLOOR = RESIST_FLOOR;
  }

  const zeroResists = () => ELEMENTS.reduce((o, e) => { o[e] = 0; return o; }, {});

  // ------------------------------------------------------- no lightning
  // 'of Sparks' / 'of the Storm' now roll into magic (the world has no
  // lightning). Existing items already dropped as 'ltng' fold into 'magic'
  // at derive time, below.
  if (typeof AFFIX !== 'undefined' && Array.isArray(AFFIX)) {
    for (const a of AFFIX) if (a && a.s === 'ltng') { a.s = 'magic'; a.n = a.n === 'of Sparks' ? 'of Wisps' : 'of the Aether'; }
  }
  if (typeof STAT_TEXT !== 'undefined' && STAT_TEXT.ltng) {
    // if anything still asks for a description under 'ltng' let it read as magic
    STAT_TEXT.ltng = STAT_TEXT.magic || '+# Magic Damage to weapon attacks';
  }

  // -------------------------------------------------------- resist stats
  // A hero's per-element resist comes from item stats. For M1 we support the
  // existing 'res' key (rolls into every non-phys element, half strength, so
  // "of Warding" behaves like the D2 all-res it originally hinted at) and
  // any explicit per-element keys future affixes may write:
  //   magRes, miaRes, blkRes, vodRes, radRes, firRes, cldRes, psnRes
  const AFFIX_KEY = {
    magic: 'magRes', miasma: 'miaRes', blood: 'blkRes', void: 'vodRes',
    radiance: 'radRes', fire: 'firRes', cold: 'cldRes', poison: 'psnRes'
  };

  function computeResists(s) {
    const r = zeroResists();
    // legacy 'res' stat: light all-res, half value.
    const allRes = (s && s.res) || 0;
    // legacy 'ltng': fold into magic (no lightning).
    const magicExtra = (s && s.ltng) || 0;
    for (const el of ELEMENTS) {
      if (el === 'phys') continue;
      const key = AFFIX_KEY[el];
      const own = key && s ? (s[key] || 0) : 0;
      r[el] = own + Math.floor(allRes * 0.5);
    }
    r.magic += magicExtra;
    // clamp
    for (const el of ELEMENTS) r[el] = Math.max(RESIST_FLOOR, Math.min(RESIST_CAP, r[el]));
    return r;
  }

  // Wrap derive() so D.resists is populated every time it's rebuilt.
  if (typeof derive === 'function') {
    const _derive = derive;
    // reassign the global; it's a top-level function so this works because
    // every caller reads the name at call-time (P.hp = derive().maxHp, etc.)
    derive = function () {
      const d = _derive.apply(this, arguments);
      try {
        const s = (typeof itemStatSum === 'function') ? itemStatSum() : {};
        d.resists = computeResists(s);
      } catch (e) { d.resists = zeroResists(); }
      return d;
    };
    // one immediate rebuild so a live D already carries .resists
    try { if (typeof D !== 'undefined' && D) D = derive(); } catch (e) {}
    try { if (typeof window !== 'undefined' && window.__spm) { window.__spm.rederive = () => { D = derive(); return D; }; window.__spm.getD = () => D; } } catch (e) {}
  }

  // ---------------------------------------------------- monster resists
  // For M1 every monster starts at zero resists across the board (base rule).
  // makeMon is wrapped so any code path that pre-sets natural resists (M2+)
  // can layer on top; we only fill defaults if none exist.
  if (typeof makeMon === 'function') {
    const _makeMon = makeMon;
    makeMon = function () {
      const m = _makeMon.apply(this, arguments);
      if (m && !m.resists) m.resists = zeroResists();
      return m;
    };
    // e_ui.js froze the base names onto window.__spm at file-load time; keep
    // that surface in sync so anything that reaches through it (smoke tests,
    // other zz files that copied the ref) hits our wrapper.
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.makeMon = makeMon; } catch (e) {}
  }

  // --------------------------------------------------- damage math helpers
  function applyResist(dmg, resistPct) {
    const r = Math.max(RESIST_FLOOR, Math.min(RESIST_CAP, resistPct || 0));
    const out = dmg * (1 - r / 100);
    // clamp: never negative, never more than 2x baseline
    return Math.max(0, Math.min(dmg * DMG_CAP_MULT, out));
  }

  function resolveElem(elem, fallback) {
    if (!elem) return fallback;
    if (ELEMENTS.indexOf(elem) === -1) return fallback;
    return elem;
  }

  // exposed for external callers (skill files that want an element-aware hit)
  if (typeof globalThis !== 'undefined') {
    globalThis.applyResist = applyResist;
    globalThis.resolveElem = resolveElem;
  }

  // ------------------------------------------------------ wrap hurtMon
  // Signature is now: hurtMon(m, dmg, col, elem?)
  //   elem missing => 'phys' (backwards compatible).
  if (typeof hurtMon === 'function') {
    const _hurtMon = hurtMon;
    hurtMon = function (m, dmg, col, elem) {
      if (!m || m.dead) return _hurtMon.apply(this, arguments);
      const e = resolveElem(elem, 'phys');
      let d = dmg;
      if (e !== 'phys' && m.resists) {
        d = applyResist(dmg, m.resists[e] || 0);
      }
      return _hurtMon.call(this, m, d, col);
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.hurtMon = hurtMon; } catch (e) {}
  }

  // ----------------------------------------------------- wrap hurtPlayer
  // Signature is now: hurtPlayer(dmg, type, fx, fy, elem?)
  //   'type' still governs the phys/magic branch in the base (armour vs D.res).
  //   'elem', when given, further reduces damage by the player's per-element
  //   resist. For 'phys' we do NOT double-dip on top of armour (base handles
  //   it); for anything else, base already applies D.res as "magic" — we peel
  //   that off and re-apply the specific element instead.
  if (typeof hurtPlayer === 'function') {
    const _hurtPlayer = hurtPlayer;
    hurtPlayer = function (dmg, type, fx, fy, elem) {
      const e = resolveElem(elem, type === 'phys' ? 'phys' : 'magic');
      let inDmg = dmg;
      if (e !== 'phys' && e !== 'magic') {
        // The base multiplies by (1 - D.res/100) for the non-phys branch.
        // Undo that and re-apply the correct element's resist.
        try {
          const baseRes = (typeof D !== 'undefined' && D) ? (D.res || 0) : 0;
          const perEl = (typeof D !== 'undefined' && D && D.resists) ? (D.resists[e] || 0) : 0;
          const baseFactor = 1 - baseRes / 100;
          const wantFactor = 1 - Math.max(RESIST_FLOOR, Math.min(RESIST_CAP, perEl)) / 100;
          if (baseFactor > 0.0001) inDmg = dmg * (wantFactor / baseFactor);
          else inDmg = dmg * wantFactor;
          // final clamp
          inDmg = Math.max(0, Math.min(dmg * DMG_CAP_MULT, inDmg));
        } catch (err) { /* fall through with dmg untouched */ }
      }
      return _hurtPlayer.call(this, inDmg, type, fx, fy);
    };
  }

  // =========================================================== M1 debug
  // Hotkey '0': spawn a rat-shaped test dummy with 50% miasma resist right
  // next to the player, hit it once with 100 phys and once with 100 miasma.
  // You'll see two float texts: 100 and 50.
  addEventListener('keydown', e => {
    if (e.key !== '0' || e.repeat) return;
    if (!(typeof G !== 'undefined' && G && G.running && G.zone && !G.paused)) return;
    if (typeof P === 'undefined' || P.dead) return;
    // pick an existing monster type from MON that's easy to spawn
    let type = null;
    if (typeof MON === 'object' && MON) {
      for (const k of Object.keys(MON)) { type = k; break; }
    }
    if (!type || typeof makeMon !== 'function') return;
    const mx = P.x + 1.5, my = P.y;
    const m = makeMon(type, mx, my, Math.max(1, P.level), 'normal', []);
    if (!m) return;
    m.resists = zeroResists(); m.resists.miasma = 50;
    m.hp = m.max = 99999; // dummy: won't die from the demo hits
    m.name = 'Resist Test (50% miasma)';
    G.zone.monsters.push(m);
    // now the two hits
    if (typeof hurtMon === 'function') {
      hurtMon(m, 100, '#e8e2d0', 'phys');
      hurtMon(m, 100, '#a4d68c', 'miasma');
    }
    if (typeof floatText === 'function') floatText(P.x, P.y - 1, 'resist test: phys/miasma', '#d0d6c0');
    if (typeof say === 'function') say('resist test: phys 100 / miasma 100 vs 50% miasma resist', 3);
  });

})();
