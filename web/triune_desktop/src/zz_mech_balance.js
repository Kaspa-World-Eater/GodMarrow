// =================================================================== zz_mech_balance.js
// Board id: balance. Handles the approved skill renames from proposals/renames-v1 AND swaps the effect of
// War Horn (-> Death March) and Tumor Toss (-> Blessed Growth). One combined pass so tooltip names and
// behaviour stay in sync.
//
// Rename-only skills: only SK[id].name/desc/perks[i].name, TAB_SETS[cls] and CLASS_NAME are touched. SK ids,
// tree positions, prerequisites, resource costs and other skills' effects are left as they are.
//
// Effect swaps (horn, eggsac): the SK id, tree position, prerequisites and resource cost are preserved; only
// the name/desc and the specific cast handler are rewritten. Vitae-only cost for Blessed Growth (no life
// cost) per the design note.

(() => {

  // ---------------------------------------------------------------- class + tab names
  if (typeof CLASS_NAME !== 'undefined') {
    CLASS_NAME.animancer = 'Animancer';
    CLASS_NAME.monk = 'The Monk';
  }
  if (typeof TAB_SETS !== 'undefined') {
    TAB_SETS.animancer = ['Mirror', 'Soul', 'Thread'];
    if (TAB_SETS.ossumancer) TAB_SETS.ossumancer[1] = 'Bone';
    if (TAB_SETS.miasmancer) { TAB_SETS.miasmancer[1] = 'Trap'; TAB_SETS.miasmancer[2] = 'Sigil'; }
  }

  // ---------------------------------------------------------------- pure renames (name only, unless a desc
  // is explicitly overridden below). Marrow Crush (crush) intentionally KEEPS its name.
  const RENAMES = {
    // Ossuarch
    spear:    { name: 'Bone Lance' },
    spikes:   { name: 'Bone Spurs' },
    ribcage:  { name: 'Charnel Cage' },
    banner:   { name: 'Prayer Banner' },
    marrowm:  { name: 'Bone Mastery' },
    // Hemomancer (pure renames)
    hatch:    { name: 'Penitent Womb' },
    thrall:   { name: 'Blood Thrall' },
    blance:   { name: 'Sin Purge' },
    bfrenzy:  { name: 'Red Fervour' },
    pact:     { name: 'Covenant of Blood' },
    bwave:    { name: 'Tide of the Maiden' },
    vwhip:    { name: 'Grasping Veins' },
    cburst:   { name: 'Burst Vessel' },
    // Shrine Keeper
    shuriken: { name: 'Iron War-Fan' },
    deathm:   { name: 'Sigil Mastery' },
    talon:    { name: "Hanged Man's Heel" },
    // Animancer
    lance:    { name: 'Needle and Thread' },
    chain:    { name: 'Binding Thread' },
    mark:     { name: "Needle's Mark" },
    orb:      { name: 'Spool' },
    word:     { name: 'Unravelling' },
    ward:     { name: 'Veil' },
    nmastery: { name: 'Thread Mastery' }
  };
  for (const id in RENAMES) { const s = (typeof SK !== 'undefined') && SK[id]; if (s) s.name = RENAMES[id].name; }

  // ---------------------------------------------------------------- Halo-That-Turns / Gate-Without-A-Gate
  // Kusho's two class skills keep their existing behaviour but wear the new poetic names as per the doc.
  // The internal kdawn / keclipse ids are untouched. Note: the Kusho class skills live on SK too but were
  // added by zw_monk.js after c_game.js; we override name AND desc.
  if (typeof SK !== 'undefined') {
    if (SK.kdawn) {
      SK.kdawn.name = 'Halo-That-Turns';
      SK.kdawn.desc = 'The class skill (shares its cooldown with Gate-Without-A-Gate). Raise your palm and force a blinding noon for 20 s. Radiance peaks; night creatures are dazzled; ghosts and Gasps are dragged into the open. Underground it lasts half as long and costs half.';
    }
    if (SK.keclipse) {
      SK.keclipse.name = 'Gate-Without-A-Gate';
      SK.keclipse.desc = 'The class skill (shares its cooldown with Halo-That-Turns). Close your hand over the sun and force night for 20 s. Every light but your own gutters; Absence peaks; enemies lose sight of you beyond 6 yd. Underground it lasts half as long and costs half.';
    }
  }

  // ---------------------------------------------------------------- Miasmancer Omen -> Sigil rewrite:
  // walk every miasmancer skill's desc and every perk name/desc, replacing "Omens"/"Omen" with the new word.
  // Case-preserving: "Omens"->"Sigils", "Omen"->"Sigil", "omens"->"sigils", "omen"->"sigil".
  if (typeof SK !== 'undefined') {
    const omen = s => {
      if (typeof s !== 'string') return s;
      return s
        .replace(/\ban Omen\b/g, 'a Sigil').replace(/\ban omen\b/g, 'a sigil')
        .replace(/Omens/g, 'Sigils').replace(/Omen/g, 'Sigil')
        .replace(/omens/g, 'sigils').replace(/omen/g, 'sigil');
    };
    for (const id in SK) {
      const s = SK[id]; if (!s || s.cls !== 'miasmancer') continue;
      if (s.desc) s.desc = omen(s.desc);
      if (s.perks) for (const p of s.perks) { if (p.name) p.name = omen(p.name); if (p.desc) p.desc = omen(p.desc); }
    }
  }

  // ---------------------------------------------------------------- effect swap #1: War Horn -> Death March
  // Ossuarch: point at a spot; every standing skeleton rushes there at 2x speed for 3 s. On arrival, its
  // first blow deals +100% poise damage and shoves the enemy back. Same Bone / mana cost as before.
  if (typeof SK !== 'undefined' && SK.horn) {
    SK.horn.name = 'Death March';
    SK.horn.desc = 'Point at a spot: every skeleton rushes there at twice its speed for 3 s. Their first blow on arrival hits with +100% poise and shoves the enemy back.';
    // Perks: keep them relevant to the new effect (still simple support, no new triggers)
    if (SK.horn.perks) {
      const P0 = SK.horn.perks[0]; if (P0) { P0.name = 'Long March'; P0.desc = 'The march lasts 2 s longer.'; }
      const P1 = SK.horn.perks[1]; if (P1) { P1.name = 'Rally March'; P1.desc = 'Skeletons mend 25% of their life when the march begins.'; }
    }
  }

  // ---------------------------------------------------------------- effect swap #2: Tumor Toss -> Blessed Growth
  // Hemomancer: a cheap curse on an area (radius 3) that hurts enemies over 6 s; every 2 s, and on the
  // death of a cursed enemy, one growth pops out as a weak 1-life spawnling. Vitae cost only, no life cost.
  if (typeof SK !== 'undefined' && SK.eggsac) {
    SK.eggsac.name = 'Blessed Growth';
    SK.eggsac.desc = 'Sow a curse over a patch of ground (3 yd) for 6 s. Every enemy that stands in it is cursed — their flesh loosens, they take a slow bleed, and a growth may split from them. When a cursed enemy dies, a spawnling crawls out of the wound. With no one to curse, the patch does nothing but wait. Vitae only, no life price.';
    if (SK.eggsac.perks) {
      const P0 = SK.eggsac.perks[0]; if (P0) { P0.name = 'Deep Roots';   P0.desc = 'The growth lasts 3 s longer.'; }
      const P1 = SK.eggsac.perks[1]; if (P1) { P1.name = 'Viable Growth'; P1.desc = 'Growth spawnlings live twice as long and hit harder.'; }
    }
  }

  // ================================================================ runtime hooks
  //
  // Wrap castSkill so 'horn' (Ossuarch) and 'eggsac' (Hemomancer) run our new logic. Wrap update(dt) so the
  // Death March per-frame movement and the Blessed Growth curse tick can run alongside the base loop.
  //
  // Both are top-level bindings (see d_play.js castSkill, e_ui.js update). Other agents also wrap them, so
  // we save the current ref and defer to it for anything we don't handle.

  if (typeof castSkill === 'function') {
    const _cast = castSkill;
    castSkill = function (id, pt) {
      // Death March: only when the caster is an Ossuarch and has any point in horn
      if (id === 'horn' && P && P.cls === 'ossumancer' && P.skills && P.skills.horn > 0) {
        if (P.cast > 0 || P.roll > 0) return;
        const a = (typeof losPoint === 'function' ? losPoint(pt || aimPoint()) : (pt || aimPoint()));
        // The horn keeps its base mana cost via spendMana('horn').
        if (typeof spendMana === 'function' && !spendMana('horn')) return;
        const p = (typeof clampCast === 'function') ? clampCast(a, 12) : a;
        const dur = 3 + (P.skills.hornlong > 0 ? 2 : 0);
        G.deathMarch = { x: p.x, y: p.y, t: dur, max: dur, arrived: new WeakSet() };
        // v0.50 Rally March perk (was: Rally Call): mend at start
        if (P.skills.hornheal > 0 && Array.isArray(G.skels)) {
          for (const e of G.skels) if (!e.dead) e.hp = Math.min(e.max, e.hp + e.max * 0.25);
          if (G.colossus) G.colossus.hp = Math.min(G.colossus.max, G.colossus.hp + G.colossus.max * 0.25);
        }
        if (typeof parts !== 'undefined') parts.push({ ring: true, x: p.x, y: p.y, r: 0.3, max: 3.5, t: 0.6, col: '#c8553d' });
        if (typeof burst === 'function') burst(p.x, p.y, '#c8553d', 20, 2.4);
        if (typeof banner === 'function') banner('DEATH MARCH', '#cfc6ae', 1);
        if (typeof sfx === 'function') { sfx(98, 1.2, 'sawtooth', 0.05, 30); sfx(147, 1, 'sawtooth', 0.03, 20); }
        if (typeof faceTo === 'function') faceTo(p.x, p.y);
        P.cast = 0.5 / (D && D.castSpd ? D.castSpd : 1);
        return;
      }
      // Blessed Growth: only when the caster is a Hemomancer and has any point in eggsac
      if (id === 'eggsac' && P && P.cls === 'hemomancer' && P.skills && P.skills.eggsac > 0) {
        if (P.cast > 0 || P.roll > 0) return;
        const a = (typeof losPoint === 'function' ? losPoint(pt || aimPoint()) : (pt || aimPoint()));
        // Vitae only, no life price. Use base skill mana as the Vitae cost.
        const need = (typeof skillCost === 'function') ? skillCost('eggsac') : (SK.eggsac && SK.eggsac.mana) || 7;
        if (P.mana < need) {
          if (typeof say === 'function') say('Not enough Vitae', 1);
          return;
        }
        P.mana = Math.max(0, P.mana - need);
        if (typeof arcOnSpend === 'function') { try { arcOnSpend('eggsac', need); } catch (e) { } }
        const p = (typeof clampCast === 'function') ? clampCast(a, 8) : a;
        const L = (P.skills.eggsac || 1);
        const dur = 6 + (P.skills.tumorlive > 0 ? 3 : 0);
        const dps = 2 * (1 + 0.5 * (L - 1));
        G.bgrowths = G.bgrowths || [];
        G.bgrowths.push({
          x: p.x, y: p.y, r: 3, t: dur, max: dur,
          dps, dmgAcc: 0,
          spawnT: 2,
          cursedIds: new Set(),
          cursed: new Set(),
          strong: P.skills.tumorlive > 0
        });
        // D2-style curse cast: a single dark-red bloom flashes at the target and vanishes.
        // No lingering ring. Little dripping tendrils drop and dissipate.
        if (typeof burst === 'function') { burst(p.x, p.y, '#7a1e28', 24, 2.6); burst(p.x, p.y, '#c24050', 14, 1.8); }
        if (typeof parts !== 'undefined') {
          parts.push({ ring: true, x: p.x, y: p.y, r: 0.15, max: 1.4, t: 0.35, col: '#c24050' });
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * 6.28, rr = Math.random() * 1.2;
            parts.push({ x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr, z: 8 + Math.random() * 6, vx: 0, vy: 0, vz: -6, t: 0.4, col: '#c24050' });
          }
        }
        if (typeof floatText === 'function') floatText(p.x, p.y, 'a curse settles', '#c24050');
        if (typeof sfx === 'function') sfx(170, 0.3, 'sine', 0.04, 120);
        if (typeof faceTo === 'function') faceTo(p.x, p.y);
        P.cast = 0.4 / (D && D.castSpd ? D.castSpd : 1);
        return;
      }
      return _cast(id, pt);
    };
    // Keep the debug/test namespace in sync with our wrapper so smoke tests hit it (it captured the pre-wrap ref)
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.castSkill = castSkill; } catch (e) { }
  }

  // ---------------------------------------------------------------- per-frame tick: Death March movement +
  // Blessed Growth curse. Wraps update(dt) and runs AFTER the base so speed boosts stick.
  if (typeof update === 'function') {
    const _upd = update;
    update = function (dt) {
      _upd(dt);
      if (!G || !G.zone || !dt) return;

      // ---- Death March per-frame ----
      const dm = G.deathMarch;
      if (dm && dm.t > 0 && Array.isArray(G.skels)) {
        dm.t -= dt;
        const arrivedR = 0.55;
        for (const e of G.skels) {
          if (!e || e.dead || e.rise > 0) continue;
          const dx = dm.x - e.x, dy = dm.y - e.y, d = Math.hypot(dx, dy);
          if (d > arrivedR) {
            // Add an extra 1x speed on top of the base's per-frame movement (base ~3.2, so total ~2x).
            const s = 3.2 * dt;
            const nx = e.x + dx / d * s, ny = e.y + dy / d * s;
            if (!G.zone.solidAt || !G.zone.solidAt(nx, e.y)) e.x = nx;
            if (!G.zone.solidAt || !G.zone.solidAt(e.x, ny)) e.y = ny;
            e.face = dx > 0 ? 1 : -1;
          } else if (!dm.arrived.has(e)) {
            // First arrival: apply +100% poise damage and a shove to the nearest enemy in reach.
            dm.arrived.add(e);
            let best = null, bd = 1.5;
            for (const m of G.zone.monsters) { if (m.dead) continue; const md = Math.hypot(m.x - e.x, m.y - e.y); if (md < bd) { bd = md; best = m; } }
            if (best) {
              if (best.rank !== 'boss') {
                best.stun = Math.max(best.stun || 0, 1.0); // +100% poise-damage: extended stun
                const dd = Math.hypot(best.x - e.x, best.y - e.y) || 1, kn = 0.6;
                const nx = best.x + (best.x - e.x) / dd * kn, ny = best.y + (best.y - e.y) / dd * kn;
                if (!G.zone.solidAt || !G.zone.solidAt(nx, ny)) { best.x = nx; best.y = ny; }
              }
              if (typeof aggro === 'function') aggro(best);
              if (typeof burst === 'function') burst(best.x, best.y, '#cfc6ae', 8, 1.6);
              if (typeof sfx === 'function') sfx(220, 0.1, 'square', 0.04, -100);
            }
          }
        }
        if (dm.t <= 0) G.deathMarch = null;
      }

      // ---- Blessed Growth per-frame ----
      if (Array.isArray(G.bgrowths) && G.bgrowths.length) {
        for (const g of G.bgrowths) {
          if (g.done) continue;
          g.t -= dt; g.spawnT -= dt;
          if (g.t <= 0) { g.done = true; continue; }
          // no ring — the curse is invisible once cast (D2-style). Only the cursed enemies show it (wisps below).
          // Curse: hurt enemies inside, mark them so death spawns a growth
          g.dmgAcc = (g.dmgAcc || 0) + dt;
          const tickDmg = g.dps * dt;
          for (const m of G.zone.monsters) {
            if (m.dead) continue;
            const md = Math.hypot(m.x - g.x, m.y - g.y);
            if (md < g.r + m.r) {
              if (typeof hurtMon === 'function') hurtMon(m, tickDmg, '#c9a66b');
              g.cursed.add(m);
              // visible curse marker on the monster
              m.bgrowT = Math.max(m.bgrowT || 0, 0.5);
              // faint amber wisp rising off a cursed enemy so the player sees the curse
              if (typeof parts !== 'undefined' && Math.random() < dt * 4) {
                parts.push({ x: m.x + rand(-0.2, 0.2), y: m.y + rand(-0.2, 0.2), z: 4 + Math.random() * 4, vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15), vz: 1.2, t: 0.7, col: '#c9a66b' });
              }
            }
          }
          // decay the curse mark on monsters no longer in range
          for (const m of G.zone.monsters) if (m.bgrowT > 0) m.bgrowT -= dt;
          // Death-triggered growth pop: any tracked monster that has died this frame spawns a spawnling
          for (const m of Array.from(g.cursed)) {
            if (m.dead) {
              g.cursed.delete(m);
              if (typeof tumorLing === 'function') { try { tumorLing(m.x, m.y); } catch (e) { } }
              if (typeof burst === 'function') burst(m.x, m.y, '#c9a66b', 10, 1.8);
            }
          }
          // v0.51 fix: Blessed Growth is a CURSE — it only produces growths from cursed creatures.
          // No more free periodic spawns on empty ground. If nothing is cursed inside, the ring just
          // sits and hurts. Every 2s, if at least one cursed enemy is inside, one of them bulges and
          // a growth crawls out beside it (small, weak, doesn't kill the host).
          if (g.spawnT <= 0 && g.cursed.size > 0) {
            g.spawnT += 2;
            // pick a random cursed victim
            const arr = Array.from(g.cursed).filter(m => !m.dead);
            if (arr.length) {
              const m = arr[Math.floor(Math.random() * arr.length)];
              const ang = Math.random() * 6.28318;
              const sx = m.x + Math.cos(ang) * (m.r + 0.4), sy = m.y + Math.sin(ang) * (m.r + 0.4);
              if (typeof tumorLing === 'function') { try { tumorLing(sx, sy); } catch (e) { } }
              if (typeof burst === 'function') burst(m.x, m.y, '#c9a66b', 6, 1.2);
              if (typeof floatText === 'function') floatText(m.x, m.y, 'a growth splits', '#c9a66b');
            }
          } else if (g.spawnT <= 0) {
            // nothing to curse — reset the clock so the next cursed entry gets a prompt bloom
            g.spawnT = 0.5;
          }
        }
        G.bgrowths = G.bgrowths.filter(g => !g.done);
      }
    };
  }

  // ---------------------------------------------------------------- zone reset cleanup: our G-side arrays
  // don't need base-code awareness, but we clear them defensively when the zone changes. The base's
  // boneZone14 already runs; we just piggy-back on it.
  if (typeof boneZone14 === 'function') {
    const _bz = boneZone14;
    boneZone14 = function () { _bz(); if (G) { G.deathMarch = null; G.bgrowths = []; } };
  }

  // =================================================================================================
  // D2-style scaling ladder (proposal: scale-ladder)
  // Three layers stacked on the base:
  //   1. per-zone mlvl bump so fen / mid / deep zones scale like D2 acts.
  //   2. ease-curve shift: full strength at mlvl 10 (not 15) and up to ~1.2x past mlvl 20.
  //   3. difficulty multiplier scaffolding: Normal live, Nightmare / Hell hooks in place.
  // Plus a test-character nerf: 120 skill points -> 30.
  // =================================================================================================

  // ---------------------------------------------------------------- 3. difficulty scaffolding
  // Public state on G. Set once at start; also normalised on every startGame() call below.
  if (typeof G !== 'undefined' && G) {
    if (!G.difficulty) G.difficulty = 'normal';
    if (G.diffHpMult == null) G.diffHpMult = 1;
    if (G.diffDmgMult == null) G.diffDmgMult = 1;
    if (G.diffResPenalty == null) G.diffResPenalty = 0;
  }
  const DIFF_PROFILES = {
    normal:    { hp: 1,   dmg: 1,   res: 0    },
    nightmare: { hp: 1.5, dmg: 1.5, res: -40  },
    hell:      { hp: 2.5, dmg: 2,   res: -100 }
  };
  const applyDifficulty = function (name) {
    const p = DIFF_PROFILES[name] || DIFF_PROFILES.normal;
    if (typeof G !== 'undefined' && G) {
      G.difficulty = name || 'normal';
      G.diffHpMult = p.hp; G.diffDmgMult = p.dmg; G.diffResPenalty = p.res;
    }
  };
  // Expose for the mode-select UI other agents may hook up later.
  try { if (typeof window !== 'undefined') window.__setDifficulty = applyDifficulty; } catch (e) { }

  // ---------------------------------------------------------------- 1. zone mlvl bump table
  // Bumps are added to whatever mlvl the base generator picked, so relative curves inside a zone are
  // preserved and the base's per-monster clamps to `mlvl` bands still hold. Values keyed by zone id.
  // Rationale: fen used to top out at 11, level-30 test char shreds it -> push toward the 8-16 mid
  // band. Bone catacombs (10-13, 13-15) push into the 16-26 deep band.
  const ZONE_MLVL_BUMP = {
    moor:   0,
    crypt:  3,   // 6-8   -> 9-11
    barrow: 3,   // 3-6   -> 6-9
    fen:    4,   // 6-11  -> 10-15
    cata1:  8,   // 10-13 -> 18-21
    cata2:  11   // 13-15 -> 24-26
  };
  // We can't tell which zone is being generated from inside makeMon (G.zone is still the previous
  // zone during gen), so wrap ZONE_GEN entries to stash a marker for the duration of the generator.
  if (typeof ZONE_GEN !== 'undefined' && ZONE_GEN) {
    for (const zid in ZONE_GEN) {
      const _gen = ZONE_GEN[zid];
      if (typeof _gen !== 'function') continue;
      ZONE_GEN[zid] = function (seed) {
        const prev = G.__genZone; G.__genZone = zid;
        try { return _gen(seed); } finally { G.__genZone = prev; }
      };
    }
  }

  // ---------------------------------------------------------------- 2. ease curve
  // Base ease (from c_game.js makeMon): 0.455 at <=5, ramps to 1.0 at 15, capped at 1.0.
  // New ease: 0.5 at <=5, ramps to 1.0 at 10, then keeps growing to ~1.2 at 25 (linear).
  const oldEase = function (m) {
    return m <= 5 ? 0.455 : m >= 15 ? 1 : 0.455 + 0.545 * (m - 5) / 10;
  };
  const newEase = function (m) {
    if (m <= 5) return 0.5;
    if (m <= 10) return 0.5 + 0.5 * (m - 5) / 5;
    if (m >= 25) return 1.2;
    return 1 + 0.2 * (m - 10) / 15;
  };

  // ---------------------------------------------------------------- makeMon wrapper: apply zone bump
  // then rescale hp/dmg by (newEase / oldEase). Difficulty scaling is NOT applied here — the brief
  // routes it through hurtMon / hurtPlayer instead so it's a clean toggle at runtime.
  if (typeof makeMon === 'function') {
    const _makeMon = makeMon;
    makeMon = function (type, x, y, mlvl, rank, mods) {
      const zid = (typeof G !== 'undefined' && G && (G.__genZone || (G.zone && G.zone.id))) || null;
      const bump = ZONE_MLVL_BUMP[zid] || 0;
      const nm = Math.max(1, (mlvl | 0) + bump);
      const m = _makeMon(type, x, y, nm, rank, mods);
      // Rescale by ease shift so a mlvl-8 fen brute now hits like the base's mlvl-8 would if the
      // ease curve had already been correct.
      const oe = oldEase(nm), ne = newEase(nm);
      if (oe > 0 && ne !== oe) {
        const f = ne / oe;
        m.hp = m.max = Math.max(1, Math.round(m.max * f));
        if (Array.isArray(m.dmg)) m.dmg = m.dmg.map(v => v * f);
      }
      // Tag so debug tools / tooltip can see the effective mlvl (base already writes m.mlvl = nm).
      m.mlvlBase = mlvl; m.mlvlBump = bump;
      return m;
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.makeMon = makeMon; } catch (e) { }
  }

  // ---------------------------------------------------------------- hurtMon wrapper: incoming
  // damage scaled by 1 / diffHpMult (harder -> monsters effectively have more HP). We call the
  // current hurtMon so other agents' wrappers keep working.
  if (typeof hurtMon === 'function') {
    const _hurtMon = hurtMon;
    hurtMon = function (m, dmg, col) {
      const dh = (typeof G !== 'undefined' && G && G.diffHpMult) || 1;
      return _hurtMon(m, dmg / dh, col);
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.hurtMon = hurtMon; } catch (e) { }
  }

  // ---------------------------------------------------------------- hurtPlayer wrapper: damage
  // taken scaled by diffDmgMult (harder -> player takes more). Res penalty from difficulty is
  // applied by folding it into the elemental branch: type != 'phys' uses D.res, so we subtract the
  // penalty from D.res for the duration of one call by pre-scaling dmg. Cleaner: just multiply the
  // final damage number.
  if (typeof hurtPlayer === 'function') {
    const _hurtPlayer = hurtPlayer;
    hurtPlayer = function (dmg, type, fx, fy) {
      const dd = (typeof G !== 'undefined' && G && G.diffDmgMult) || 1;
      let d = dmg * dd;
      // Fold res penalty: for elemental damage, the base applies (1 - D.res/100). We want the
      // equivalent of D.res being reduced by |res_penalty|. Only touch when it matters.
      if (type && type !== 'phys' && typeof D !== 'undefined' && D && G && G.diffResPenalty) {
        const baseResK = 1 - (D.res || 0) / 100;
        const effResK  = 1 - ((D.res || 0) + G.diffResPenalty) / 100;
        if (baseResK > 0) d *= (effResK / baseResK);
      }
      return _hurtPlayer(d, type, fx, fy);
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.hurtPlayer = hurtPlayer; } catch (e) { }
  }

  // ---------------------------------------------------------------- 4. test-char nerf: 120 -> 30
  // Wrap testCharacter directly so the free skill points come out to 30. Gold, arcana points and
  // gear are left alone per the brief (still convenient for testing).
  if (typeof testCharacter === 'function') {
    const _testCharacter = testCharacter;
    testCharacter = function () {
      _testCharacter();
      if (typeof P !== 'undefined' && P) P.skillPts = 30;
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.testCharacter = testCharacter; } catch (e) { }
  }

  // ---------------------------------------------------------------- startGame wrapper: reset
  // difficulty to Normal on every new / continue / test session so scaffolding is live.
  if (typeof startGame === 'function') {
    const _startGame = startGame;
    startGame = function (mode) {
      applyDifficulty('normal');
      const r = _startGame(mode);
      // Extra safety: if base's testCharacter path was taken and something else overrode our nerf,
      // clamp again. (Guarded so continue / new saves keep their own skill points.)
      if (mode === 'test' && typeof P !== 'undefined' && P && (P.skillPts | 0) > 30) P.skillPts = 30;
      // Also update the intro banner text if the base left it saying "120" — it's only a `say()`
      // that already fired, so nothing to do; the test-char panel reads P.skillPts directly.
      return r;
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.startGame = startGame; } catch (e) { }
  }

})();
