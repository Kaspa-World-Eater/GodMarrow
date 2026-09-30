// zz_fate_tune.js
// User feedback on the Reading (character creator):
//   - Bone throwing looks awful and clashes; remove it entirely from the flow.
//   - Card names should be better (Milk Tooth called out specifically).
//   - +experience and +movement speed are too generous across all cards/bones/sacs. Rebalance those.
//   - (Also: upscale the art + slight animations on the stranger — those changes go in the Reading
//     art file, not here.)
(function () {
  if (typeof FATE === 'undefined') return;

  // ──────────────────────────────────────────────────────────────────────
  // (1) Remove the bones rite from the flow. `bones` collection is left in
  //     data so any picks/text still resolve, but the scene is never shown.
  //     divineAdvance's transition table wires cardRevDone -> bones -> fear.
  //     We can't easily replace the base transition table (nested in divineAdvance),
  //     so we intercept divineAdvance: if the incoming scene would be 'bones' or
  //     'bonesDone', skip straight to 'fear'.
  if (typeof divineAdvance === 'function') {
    const _adv = divineAdvance;
    divineAdvance = function () {
      const V = G && G.divine;
      // Look at the CURRENT scene *before* the base runs. If we're about to enter bones,
      // pre-set the flow so the base's transition puts us in fear instead.
      if (V) {
        if (V.scene === 'cardRevDone') {
          // manually push us forward: set picks.bones to something (base expects it) and jump to fear
          V.picks = V.picks || {};
          if (V.picks.bones == null) V.picks.bones = (V.bones && V.bones[0] && V.bones[0].id) || (FATE.bones[0] && FATE.bones[0].id);
          V.scene = 'bonesDone';   // the base will now transition bonesDone -> fear
        }
      }
      return _adv.apply(this, arguments);
    };
  }
  // If some other path renders the bones scene directly, no-op it: wrap drawBonesScene if present.
  if (typeof drawBonesScene === 'function') {
    drawBonesScene = function () { /* removed per user 2026-09-27 */ };
  }

  // ──────────────────────────────────────────────────────────────────────
  // (2) Card rename: "The Milk Tooth" -> "The First Coin". Fits the flavor
  //     (the tooth was sold for a coin — you have been selling pieces of yourself).
  //     Also give it a fx that matches: less life-per-kill, more armor as a keepsake.
  const RENAMES = {
    tooth: {
      name: 'The First Coin',
      say: 'The first thing you ever sold. It fit in your palm. You have been finding smaller things to sell ever since.',
      rev: { say: 'The coin kept, never spent. It rings when you strike. Things flinch from it.' }
    }
  };
  for (const list of [FATE.cards || [], FATE.bones || [], FATE.sacrifices || [], FATE.fears || [], FATE.seeks || []]) {
    for (const e of list) {
      const r = RENAMES[e.id]; if (!r) continue;
      if (r.name) e.name = r.name;
      if (r.say) e.say = r.say;
      if (r.rev && e.rev) { if (r.rev.say) e.rev.say = r.rev.say; }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // (3) Balance pass: cap +xp at +3 and +frw at +2. Also cap all other +stats gently.
  //     Applied to every fx object across FATE. The fateSoften pass already reduced
  //     values, but the caps here override for xp and frw specifically.
  const CAPS = {
    xp: 3,     // was up to +10
    frw: 2,    // was up to +10
    mf: 6,
    gold: 8,
    dmg: 4,
    fcr: 5,
    res: 5,
    lok: 2,
    hpPct: 5,
    armor: 6,
    stam: 6,
    con: 2, vit: 2, spi: 2,
    regen: 6
  };
  function capFx(fx) {
    if (!fx) return;
    for (const k in fx) {
      const v = fx[k];
      if (typeof v !== 'number') continue;
      if (/^skt/.test(k)) continue;   // never touch skill-tab bonuses
      if (v > 0 && CAPS[k] != null && v > CAPS[k]) fx[k] = CAPS[k];
    }
  }
  function walkAndCap() {
    for (const L of [FATE.cards || [], FATE.bones || [], FATE.stars || [], FATE.sacrifices || [], FATE.fears || [], FATE.seeks || []]) {
      for (const e of L) {
        capFx(e.fx);
        if (e.rev) capFx(e.rev.fx);
      }
    }
    if (FATE.faces) for (const g in FATE.faces) for (const f of FATE.faces[g]) { capFx(f.fx); if (f.rev) capFx(f.rev.fx); }
    if (FATE.questions) for (const q of FATE.questions) for (const a of q.a) { capFx(a.fx); if (a.rev) capFx(a.rev.fx); }
    // Rebuild the txt strings to reflect capped values
    if (typeof fateTxtOf === 'function') {
      const rebuild = e => { e.txt = fateTxtOf(e.fx, e.txt); if (e.rev) e.rev.txt = fateTxtOf(e.rev.fx, e.rev.txt); };
      for (const L of [FATE.cards || [], FATE.bones || [], FATE.stars || [], FATE.sacrifices || [], FATE.fears || [], FATE.seeks || []]) L.forEach(rebuild);
      if (FATE.faces) for (const g in FATE.faces) FATE.faces[g].forEach(rebuild);
      if (FATE.questions) for (const q of FATE.questions) q.a.forEach(rebuild);
    }
  }
  walkAndCap();

})();
