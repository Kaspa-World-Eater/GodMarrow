// v0.50 monsters-new: six new creatures for the expanded Act I bestiary, plus one new AI archetype.
//   moth_saint     — a taller Wick-Saint variant, dives out of the wood canopy (flyer, mlvl 6-10, hollow_wood)
//   veinworm_elder — a larger Vein-Borer that surfaces deeper (burrow, mlvl 12-16, root_deep)
//   stalker_crone  — new stalker AI: skulks in tall grass, springs when the player turns away (mlvl 5-9, hollow_wood)
//   trunk_thing    — a face grown into a great trunk, root-lashes anything close (shield, mlvl 14-18, root_deep boss-lite)
//   chorister      — a Gasp variant that sings while it drifts, its dirge slows the wanderer (ghost, mlvl 8-12, catacombs)
//   bloatling      — smaller, quicker Gravebloat, a light fuse (bomber, mlvl 3-6, moor/fen)
// The file adds entries to MON, extends the PACKS_* tables, adds the new 'stalker' branch to AI22, and wraps
// followPath so a nearby singing chorister damps the wanderer's step. No base file is touched.
{
  if (typeof MON === 'object' && typeof AI22 === 'object') {

    // -------------------------------------------------------------- MON entries
    // stats scale through makeMon (mlvl ease + hm/dm), so bases here are the raw shape of each creature at mlvl 1.
    Object.assign(MON, {
      moth_saint:     { name: 'Wick-Saint of the Canopy', spr: 'moth', tint: '#e8d8c0', hp: 20, dmg: [5, 9],  spd: 2.8, r: .32, xp: 28, ai: 'flyer',    wind: .5,  poiseK: .35 },
      veinworm_elder: { name: 'Elder Vein-Borer',          spr: 'worm', tint: '#5a3a2a', hp: 44, dmg: [7, 12], spd: 3.2, r: .42, xp: 60, ai: 'burrow',   range: 1.5, wind: .4, poiseK: .7 },
      stalker_crone:  { name: 'Stalker Crone',            spr: 'hand',  tint: '#4a5a3a', hp: 22, dmg: [6, 10], spd: 2.6, r: .3,  xp: 34, ai: 'stalker', range: .9,  wind: .3, rec: .6, poiseK: .45 },
      trunk_thing:    { name: 'The Trunk-Thing',          spr: 'warden',tint: '#5a4a2c', hp:180, dmg: [12,20], spd: 0.35, r: .55, xp:220, ai: 'shield',  range: 1.8, wind: .7, rec: 1.1, armor: 60, poiseK: 1.0 },
      chorister:      { name: 'Chorister',                spr: 'gasp', tint: '#c8b8f0', hp: 26, dmg: [7, 11], spd: 1.4, r: .28, xp: 46, ai: 'ghost',    wind: 1.05, poiseK: .35 },
      bloatling:      { name: 'Bloatling',                spr: 'bloat',tint: '#b0c880', hp: 14, dmg: [7, 11], spd: 2.2, r: .28, xp: 12, ai: 'bomber',   wind: .55, poiseK: .5 }
    });

    // MON.trunk_thing is stationary in feel: it never chases, only lashes what steps in reach.
    // With shield AI + tiny spd + big range the effect is a rooted lash-tank.

    // ------------------------------------------------------------- PACKS tables
    // hollow_wood (mlvl 4-8) draws from PACKS_MID; root_deep (mlvl 12-16) from PACKS_HIGH; moor from PACKS_LOW;
    // fen from PACKS_FEN; catacombs from PACKS_CRYPT. Extend rather than reassign so callers keep working.
    if (typeof PACKS_LOW  !== 'undefined') { PACKS_LOW.push(  ['bloatling', 2, 3],                                  ['hollow', 2, 3, 'bloatling', 1, 2]); }
    if (typeof PACKS_MID  !== 'undefined') { PACKS_MID.push(  ['moth_saint', 2, 3],                                 ['stalker_crone', 1, 2, 'hollow', 1, 2], ['bloatling', 2, 3, 'hollow', 1, 2]); }
    if (typeof PACKS_HIGH !== 'undefined') { PACKS_HIGH.push( ['veinworm_elder', 1, 2, 'hollow', 2, 3],             ['trunk_thing', 1, 1, 'archer', 1, 2],   ['moth_saint', 2, 3]); }
    if (typeof PACKS_FEN  !== 'undefined') { PACKS_FEN.push(  ['bloatling', 3, 4, 'drowned', 1, 2],                 ['moth_saint', 2, 3]); }
    if (typeof PACKS_CRYPT!== 'undefined') { PACKS_CRYPT.push(['chorister', 2, 3],                                  ['chorister', 1, 2, 'knight', 1, 1]); }

    // ------------------------------------------------------------- AI: stalker
    // The stalker skulks in the wanderer's rear cone. She waits for the moment their front turns away, then springs
    // in a straight-line dash for a heavy strike. If she is seen, she circles wide and tries again.
    AI22.stalker = function (m, dt, T, d, tp) {
      const b = m.b;
      // dash mid-flight: bore in along the locked aim, one hit only, then recover.
      if (m.state === 'dash') {
        const ox = m.x, oy = m.y;
        if (typeof moveCircle === 'function') moveCircle(m, m.aim.x * 7 * dt, m.aim.y * 7 * dt);
        else { m.x += m.aim.x * 7 * dt; m.y += m.aim.y * 7 * dt; }
        if (!m.hitOnce && Math.hypot(T.x - m.x, T.y - m.y) < m.r + (T.r || 0.3) + 0.25) {
          m.hitOnce = true;
          hitTarget(T, rand(m.dmg[0], m.dmg[1]) * 1.4, 'phys', ox, oy, m);
          if (typeof sfx === 'function') sfx(240, 0.09, 'square', 0.03, -60);
        }
        // wall or fence: fall out
        if (Math.hypot(m.x - ox, m.y - oy) < 7 * dt * 0.4) { m.state = 'recover'; m.t = 0; m.cd = 2.4; return; }
        if (m.t > 0.35) { m.state = 'recover'; m.t = 0; m.cd = 2.4; }
        return;
      }
      // brief crouch tell before the spring
      if (m.state === 'windup') {
        if (m.t > (b.wind || 0.28)) { m.state = 'dash'; m.t = 0; m.hitOnce = false; if (typeof sfx === 'function') sfx(140, 0.18, 'sawtooth', 0.02, -30); }
        return;
      }
      if (m.state === 'recover') { if (m.t > (b.rec || 0.6)) { m.state = 'chase'; } return; }
      // decision: when the wanderer's back is to us and we are close enough, spring
      if (d < 4 && m.cd <= 0 && typeof lineClear === 'function' && lineClear(G.zone, m, T)) {
        const f = playerFront(T);
        // dot of (m - T) with f: > 0 means we are in front of them, < 0 means behind
        const rel = ((m.x - T.x) * f.x + (m.y - T.y) * f.y) / Math.max(0.001, d);
        if (rel < -0.15) {
          m.state = 'windup'; m.t = 0;
          m.aim = { x: (T.x - m.x) / d, y: (T.y - m.y) / d };
          return;
        }
      }
      // skulk: stay in a slow rear-arc orbit at a shy radius; approach when far.
      m.state = 'chase';
      const f = playerFront(T);
      m.odir = m.odir || (Math.random() < 0.5 ? 1 : -1);
      // rear anchor: two-and-a-half yards behind the wanderer, offset sideways so she creeps in from a hip
      const side = -f.y, sideY = f.x;
      const rad = d > 6 ? 3.2 : 2.6;
      const gx = T.x - f.x * rad + side * m.odir * 0.9;
      const gy = T.y - f.y * rad + sideY * m.odir * 0.9;
      if (G.zone.solidAt(gx, gy)) m.odir = -m.odir;
      monMove(m, gx, gy, m.spd * (d > 6 ? 0.85 : 0.55), dt);
    };

    // Chorister's dirge: while a chorister is drifting near the wanderer, their step is dampened. We wrap the
    // existing followPath so we do not touch the base file. The wrap is transparent when nothing is singing.
    if (typeof followPath === 'function') {
      const _followPath_pre_chorister = followPath;
      // eslint-disable-next-line no-func-assign
      followPath = function (dt) {
        if (!P.path || !P.path.length) return _followPath_pre_chorister(dt);
        let scale = 1;
        if (G.zone && G.zone.monsters) {
          for (const m of G.zone.monsters) {
            if (!m || m.dead || !m.b || m.b.ai !== 'ghost' || m.type !== 'chorister') continue;
            const dd = Math.hypot(m.x - P.x, m.y - P.y);
            if (dd < 5.5) { scale = Math.min(scale, 0.55); break; }
          }
        }
        if (scale >= 1) return _followPath_pre_chorister(dt);
        // temporarily scale the derived move speed for one step
        const oldMs = D.moveSpd;
        try { D.moveSpd = oldMs * scale; _followPath_pre_chorister(dt); }
        finally { D.moveSpd = oldMs; }
      };
    }

    // ------------------------------------------------------------- Painters
    // Every new type reuses an existing spr key so the existing MPAINT/MPAL entries paint them. The tint on each
    // MON entry recolours the sprite. When Claude hand-draws the real art, add new keys and drop the reuse.
    // Nothing to wire here beyond the SPR_ALIAS pass that already ran in zc_combat22.js — moth/worm/hound/knight/
    // gasp/bloat all have working painters. The tints do the reading.

    // Debug hook: expose the new set to the console for tests.
    if (typeof window !== 'undefined') {
      window.__monstersNew = {
        keys: ['moth_saint', 'veinworm_elder', 'stalker_crone', 'trunk_thing', 'chorister', 'bloatling'],
        stalkerAI: AI22.stalker
      };
    }
  }
}
