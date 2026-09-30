// zz_quests.js — The Pilgrim-Warden: the five acts stitched into one road.
//   * inter-act links: each act's final boss opens a way to the next act's town (Act I: the Ossuary Matron in cata2)
//   * act bosses II-V in aN_lair at z.bossSpot, built from the existing boss plumbing with HP-threshold stages,
//     summons and arena hazards (telegraphed circles, expanding rings, beams, lingering pools)
//   * towns: vendor / healer / shared stash / smith (wares) / quest-giver / the Stranger at z.npcSpots; towns are safe
//   * waypoints: one per town and about every other zone, kindled by walking onto them; panel grouped by act
//   * quests: 5-6 per act (kill a named one, retrieve, cleanse, free, open a sealed way, the act boss); journal on J
//   * save/load: quests, waypoints, act progress ride inside the existing save (d.qst); old saves load clean
// Zones of other acts are discovered at runtime (ZONE_GEN[id]); a missing town or lair gets a plain fallback so the
// road never dead-ends. No base file is touched: everything is wrapped.
{
  if (typeof ZONE_GEN === 'object' && typeof enterZone === 'function' && typeof Zone === 'function') {
    const QV = 1;
    const Q = { haz: [], tab: 0, wtab: 0, sel: null, wpNear: false, wave: null, wares: {}, credits: null, t: 0, stash: null, vendorName: null, fbTown: {}, fbLair: {} };
    const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
    const ACT_NAME = ['', 'Act I · The Ashen Moor', 'Act II · The Bleached Barrens', 'Act III · The Fen of Shog-Mire', 'Act IV · The Heights of An-Vhar', 'Act V · The Descent'];
    const ACT_MLVL = [0, [1, 17], [18, 24], [24, 30], [30, 34], [34, 40]];
    const BOSS_LVL = [0, 16, 26, 31, 36, 42];
    const qErr = e => { try { reportError(e); } catch (x) { } };
    const qHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    const qRng = salt => mulberry32(((G.seed | 0) ^ qHash(salt)) >>> 0);

    // =========================================================== acts & zones
    function actOf(id) {
      if (!id) return 1;
      const m = /^a(\d)_/.exec(id); if (m) return clamp(+m[1], 1, 5);
      const v = /^qvault_(\d)/.exec(id); if (v) return +v[1];
      if (/scar|nihl/i.test(id)) return 5;
      return 1;
    }
    const isSide = id => /scar|nihl/i.test(id) || /^qvault_/.test(id);
    const townOf = n => n === 1 ? 'moor' : 'a' + n + '_town';
    const lairOf = n => n === 1 ? 'cata2' : 'a' + n + '_lair';
    const isTown = id => id === 'moor' || /^a\d_town$/.test(id);
    function zoneName(id) {
      if (G.zones && G.zones[id] && G.zones[id].name) return G.zones[id].name;
      if (typeof ZONE_NAMES === 'object' && ZONE_NAMES[id]) return ZONE_NAMES[id];
      if (P.qst && P.qst.wpn && P.qst.wpn[id]) return P.qst.wpn[id];
      return id.replace(/^a\d_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    function actZones(n) { return Object.keys(ZONE_GEN).filter(id => actOf(id) === n && !isSide(id)).sort(); }
    function scarZone() { const ids = Object.keys(ZONE_GEN).filter(id => /scar|nihl/i.test(id)).sort(); return ids.find(id => /1|rim|edge|mouth|entry/.test(id)) || ids[0] || null; }

    // =========================================================== fallback town / lair / vaults (only when missing)
    function qArena(id, name, W, H, theme, dark, outdoor) {
      const z = new Zone(id, name, W, H, dark); z.theme = theme;
      z.t.fill(outdoor ? T.CLIFF : T.WALL);
      const cx = W / 2, cy = H / 2;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const dx = (x - cx) / (W / 2 - 3), dy = (y - cy) / (H / 2 - 3);
        if (dx * dx + dy * dy < 1) z.set(x, y, outdoor ? T.GRASS : T.FLOOR);
      }
      return z;
    }
    function qGenFallbackTown(n, seed) {
      const id = townOf(n), z = qArena(id, ['', '', 'Femur-Gate Waystation', 'The Drowned Step', 'Monastery of the Warm Stone', 'The Last Hearth'][n], 64, 64, n === 3 ? 'fen' : 'moor', 0.35, true);
      const cx = 32, cy = 32;
      for (let k = -24; k <= 24; k++) { z.set(cx + k, cy, T.ROAD); z.set(cx + k, cy + 1, T.ROAD); z.set(cx, cy + k, T.ROAD); z.set(cx + 1, cy + k, T.ROAD); }
      clearArea(z, cx, cy, 4, T.DIRT);
      z.start = { x: cx + 0.5, y: cy + 7.5 };
      z.lanterns.push({ x: cx + 2.5, y: cy + 2.5, name: z.name });
      z.objects.push({ type: 'lantern', x: cx + 2.5, y: cy + 2.5, idx: 0, name: z.name });
      z.objects.push({ type: 'portal', x: cx + 22.5, y: cy + 0.5, to: lairOf(n), name: 'The road down', spr: 'gate' });
      z.arrive = { [lairOf(n)]: { x: cx + 20.5, y: cy + 1.5 } };
      z.townCenter = { x: cx + 0.5, y: cy + 0.5 };
      return z;
    }
    function qGenFallbackLair(n, seed) {
      const id = lairOf(n), z = qArena(id, ['', '', 'Hollow of the Shattered Femur', 'Crown of the First Ziggurat', 'Choir-Loft of the Chime-Abbot', 'Alien Temple of the Slayers'][n], 56, 56, n === 3 ? 'fen' : 'bone', 0.8, false);
      const cx = 28, cy = 28, rng = mulberry32(seed * 31 + n);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; z.set(Math.round(cx + Math.cos(a) * 11), Math.round(cy + Math.sin(a) * 11), T.PILLAR); }
      z.start = { x: cx + 0.5, y: cy + 21.5 };
      z.objects.push({ type: 'portal', x: cx - 2.5, y: cy + 23, to: townOf(n), name: 'Back to the town', spr: 'stairs' });
      z.arrive = { [townOf(n)]: z.start };
      z.bossSpot = { x: cx + 0.5, y: cy + 0.5 };
      const tbl = typeof PACKS_HIGH !== 'undefined' ? PACKS_HIGH : PACKS_MID, lv = ACT_MLVL[n][1];
      for (let k = 0; k < 4; k++) { const a = rng() * Math.PI * 2; placePack(z, cx + 0.5 + Math.cos(a) * 17, cy + 0.5 + Math.sin(a) * 17, lv, tbl, 'qfb' + k, rng); }
      return z;
    }
    function qGenVault(n, seed) {
      const def = QUESTS.find(q => q.act === n && q.kind === 'seal');
      const z = qArena('qvault_' + n, def ? def.vault.name : 'A Sealed Vault', 44, 44, n === 2 ? 'bone' : 'crypt', 0.82, false);
      const cx = 22, cy = 22;
      z.start = { x: cx + 0.5, y: cy + 15.5 };
      const st = P.qst && P.qst.q[def && def.id], back = st && st.z && ZONE_GEN[st.z] ? st.z : townOf(n);
      z.objects.push({ type: 'portal', x: cx - 1.5, y: cy + 17, to: back, name: 'The way back up', spr: 'stairs' });
      z.arrive = { [back]: z.start };
      const ilvl = ACT_MLVL[n][1] + 2;
      for (const [dx, dy] of [[-5, -5], [5, -5], [0, -9]]) z.objects.push({ type: 'chest', x: cx + dx + 0.5, y: cy + dy + 0.5, open: false, ilvl });
      z.qVaultOf = def && def.id;
      return z;
    }
    for (let n = 2; n <= 5; n++) { ZONE_GEN['qvault_' + n] = s => qGenVault(n, s); }
    function qEnsureAct(n) {
      if (n < 2 || n > 5) return;
      const tid = townOf(n), lid = lairOf(n);
      if (!ZONE_GEN[tid]) { ZONE_GEN[tid] = s => qGenFallbackTown(n, s); Q.fbTown[n] = true; if (typeof ZONE_NAMES === 'object') ZONE_NAMES[tid] = zoneName(tid); }
      if (!ZONE_GEN[lid]) { ZONE_GEN[lid] = s => qGenFallbackLair(n, s); Q.fbLair[n] = true; }
    }
    function qEnsureZone(id) {
      if (/^a\d_(town|lair)$/.test(id)) qEnsureAct(actOf(id));
      if (!G.zones[id]) { if (!ZONE_GEN[id]) return null; G.zones[id] = ZONE_GEN[id](G.seed); }
      const z = G.zones[id]; try { qDecorate(z); } catch (e) { qErr(e); }
      return z;
    }

    // =========================================================== spots
    function qWalk3(z, x, y) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (!z.walkTile(x + i, y + j)) return false; return true; }
    function qNearObj(z, x, y, r) { return z.objects.some(o => Math.hypot(o.x - x, o.y - y) < r); }
    function qFreeSpot(z, cx, cy, r0, r1, rng) {
      rng = rng || Math.random;
      for (let k = 0; k < 160; k++) {
        const a = rng() * Math.PI * 2, r = r0 + rng() * (r1 - r0) * Math.min(1, 0.4 + k / 80);
        const x = Math.floor(cx + Math.cos(a) * r), y = Math.floor(cy + Math.sin(a) * r);
        if (qWalk3(z, x, y) && !qNearObj(z, x + 0.5, y + 0.5, 2.2)) return { x: x + 0.5, y: y + 0.5 };
      }
      const nw = nearestWalk(z, Math.floor(cx), Math.floor(cy)); return nw ? { x: nw[0] + 0.5, y: nw[1] + 0.5 } : { x: cx, y: cy };
    }
    function qStart(z) { const s = z.start || z.townCenter || { x: z.w / 2, y: z.h / 2 }; return s; }
    function qDist(z) {
      if (z._qd) return z._qd;
      const s = qStart(z), nw = nearestWalk(z, Math.floor(s.x), Math.floor(s.y));
      if (!nw) return (z._qd = { d: new Int32Array(z.w * z.h).fill(-1), max: 0 });
      const d = bfsDist(z, nw[0], nw[1]); let max = 0; for (let i = 0; i < d.length; i++) if (d[i] > max) max = d[i];
      return (z._qd = { d, max });
    }
    function qFarSpot(z, frac, salt) {
      const { d, max } = qDist(z), rng = qRng(z.id + salt);
      if (!max) return qFreeSpot(z, qStart(z).x, qStart(z).y, 3, 10, rng);
      for (const spread of [0.12, 0.25, 0.5]) {
        const lo = max * (frac - spread), hi = max * (frac + spread), cands = [];
        for (let i = 0; i < d.length; i += 3) if (d[i] >= lo && d[i] <= hi) { const x = i % z.w, y = (i / z.w) | 0; if (qWalk3(z, x, y) && !qNearObj(z, x + 0.5, y + 0.5, 3)) cands.push(i); }
        if (cands.length) { const i = cands[Math.floor(rng() * cands.length)]; return { x: i % z.w + 0.5, y: ((i / z.w) | 0) + 0.5 }; }
      }
      return qFreeSpot(z, qStart(z).x, qStart(z).y, 3, 10, rng);
    }
    function qZoneMlvl(z) { let m = 0; for (const x of z.monsters) if (!x.dead && x.rank !== 'boss' && x.mlvl > m) m = x.mlvl; return m || ACT_MLVL[actOf(z.id)][1]; }
    function qZoneType(z) {
      const c = {}; for (const m of z.monsters) if (!m.dead && m.rank !== 'boss' && !m.qadd && MON[m.type] && m.b && m.b.ai !== 'bomber') c[m.type] = (c[m.type] || 0) + 1;
      let best = null, bn = 0; for (const k in c) if (c[k] > bn) { bn = c[k]; best = k; }
      return best || 'hollow';
    }

    // =========================================================== state
    function qFresh() { return { v: QV, act: 1, q: {}, wp: {}, wpn: {}, res: 0, life: 0, ended: false, seen: {} }; }
    function qLoad(src, d) {
      const s = qFresh();
      if (src && typeof src === 'object') {
        s.act = clamp(src.act | 0 || 1, 1, 5); s.res = +src.res || 0; s.life = +src.life || 0; s.ended = !!src.ended;
        if (src.q && typeof src.q === 'object') for (const k in src.q) { const e = src.q[k]; if (e && typeof e === 'object') s.q[k] = { s: e.s | 0, n: e.n | 0, z: typeof e.z === 'string' ? e.z : null }; }
        if (src.wp && typeof src.wp === 'object') for (const k in src.wp) s.wp[k] = 1;
        if (src.wpn && typeof src.wpn === 'object') for (const k in src.wpn) s.wpn[k] = String(src.wpn[k]).slice(0, 60);
        if (src.seen && typeof src.seen === 'object') for (const k in src.seen) s.seen[k] = 1;
      }
      // an old save that already felled the Matron walks straight on into Act II
      if (Array.isArray(P.done) && P.done.includes('boss:cata2')) s.act = Math.max(s.act, 2);
      return s;
    }
    function qSt(q) { return P.qst && P.qst.q[q.id]; }

    // =========================================================== quest data
    // kinds: zoneboss (a zone's existing boss), kill (a named one placed in a zone), relic (retrieve), shrine (cleanse:
    // hold it through two waves), captive (free someone: their keepers must fall first), seal (three seals open a vault),
    // actboss (the act's final boss)
    const QUESTS = [
      // ---------------------------------------------------------------- Act I
      { id: 'a1_warden', act: 1, kind: 'zoneboss', zones: ['crypt'], name: 'The Carrion Warden', target: 'The Carrion Warden',
        desc: 'Beneath the Moor the Hollow Crypt keeps a warden who forgot what he guards. He eats what the Tithed bury. Go down into {Z} and let him stop.',
        done: "Esk: 'Then the Tithed can bury their mothers again. Take this. It was his, and he will not want it.'", rew: { gold: 200, item: 'magic' } },
      { id: 'a1_lantern', act: 1, kind: 'shrine', zones: ['sighing_ridge', 'moor'], name: 'The Sighing Lantern', target: 'The Sighing Lantern',
        desc: 'The bronze lantern at the crossing has stopped singing. Something drinks the light before it reaches the road. Kneel at it in {Z} and hold it until the drinkers are gone.',
        done: "Esk: 'It sings again. Badly. It always sang badly. Here, a small truth for your trouble.'", rew: { skill: 1 } },
      { id: 'a1_daughter', act: 1, kind: 'captive', zones: ['drowned_village', 'fen'], name: "The Widow's Daughter", target: "Nell, the foreman's daughter",
        desc: "The caravan-foreman died holding both his daughters' hands. One of them let go. She lives, and the drowned keep her in {Z}. Free her.",
        done: "Nell: 'I let go, and I lived. Tell no one, and I will teach you to stand as he stood.'", rew: { stat: 3 } },
      { id: 'a1_ink', act: 1, kind: 'relic', zones: ['cata1'], name: "The Reader's Ink", target: "The Reader's Book",
        desc: 'In the Reader\'s Bay of {Z} a book lies open, and the page is always in your hand. Bring it up before it finishes writing you.',
        done: "Esk: 'Do not read it. I did, once. Keep it closed and let it keep you.'", rew: { item: 'rare', arcana: 1 } },
      { id: 'a1_hesk', act: 1, kind: 'kill', zones: ['bogwitch_shack', 'sunken_bog', 'root_deep', 'fen'], name: 'The Tallow-Mother', target: 'Tallow-Mother Hesk',
        desc: 'A bog-witch renders the drowned into candles in {Z}, and the candles walk. Put out Hesk, the Tallow-Mother, and the wicks with her.',
        done: "Esk: 'Her candles went out all at once; I felt it in my teeth. Wear this ash. It remembers her fire and refuses it.'", rew: { res: 5 } },
      { id: 'a1_matron', act: 1, kind: 'actboss', zones: ['cata2'], name: 'The Ossuary Matron', target: 'The Ossuary Matron',
        desc: 'At the bottom of the ossuary, where the monks struck something warm, the Matron counts the dead she has stood up. Go down into {Z}. End the count. The way down opens behind her.',
        done: "The Stranger: 'Down. Always down. The Barrens are waiting, and they are very dry.'", rew: { gold: 400, item: 'rare' } },
      // ---------------------------------------------------------------- Act II
      { id: 'a2_obb', act: 2, kind: 'kill', prefs: ['dune', 'barren', 'waste', 'sand', 'bleach', 'flat', 'desert'], fb: 0, name: 'The Marrow-Gnawer', target: 'Obb the Marrow-Gnawer',
        desc: 'A ghoul the size of a cart drags a heraldic shield across {Z} and gnaws the marrow out of pilgrims who are not quite dead. The gnawing must stop.',
        done: "The Last Reliquarist: 'He had a knight's shield, and a knight's name once. Neither helped him. Here: a thing learned.'", rew: { skill: 1 } },
      { id: 'a2_banner', act: 2, kind: 'relic', prefs: ['citadel', 'femur', 'fortress', 'keep', 'bastion'], fb: 1, name: 'The Banner of the Last Crusade', target: 'The Crusade Banner',
        desc: 'The cloth rotted a century ago; the metal thread did not. The banner of the last holy war still stands in {Z}. Bring the thread home.',
        done: "The Last Reliquarist: 'The thread still knows the shape of the saint. Good. Then someone does.'", rew: { item: 'rare', arcana: 1 } },
      { id: 'a2_avenue', act: 2, kind: 'shrine', prefs: ['reliquary', 'avenue', 'procession', 'road'], fb: 2, name: 'The Lantern of the Avenue', target: 'The Avenue Lantern',
        desc: 'In {Z} the calcified pilgrims still hold their stone lanterns. One has gone dark, and the dark is spreading down the line. Relight it and stand while the dust comes for you.',
        done: "The Last Reliquarist: 'Lit to the horizon again. They will hold their lanterns another thousand years. Take strength from the stubborn.'", rew: { stat: 3 } },
      { id: 'a2_seals', act: 2, kind: 'seal', prefs: ['rib', 'arch', 'hull', 'tomb', 'crypt', 'ossuary'], fb: 3, name: 'The Three Knuckle-Seals', target: 'the Ossified Vault',
        vault: { name: 'The Ossified Vault', guard: 'Hessary, the Vault-Wight' },
        desc: 'Three knuckle-seals of god-bone lock a vault somewhere in {Z}. Press each one. What the Ossuary Lords hid below will not be glad to see you.',
        done: "The Last Reliquarist: 'You opened it. Of course you did. Everyone opens it.'", rew: { arcana: 1, gold: 500 } },
      { id: 'a2_saint', act: 2, kind: 'actboss', zones: ['a2_lair'], name: 'Saint Calcifer', target: 'Saint Calcifer of the Shattered Femur',
        desc: 'In the hollow of the Shattered Femur a crusader-saint knelt to pray and was calcified where he knelt. He has risen since. He does not know the war is over. Tell him.',
        done: "The Stranger: 'He knelt so long he became the altar. Do not kneel too long, pilgrim. Go on, down into the mire.'", rew: { gold: 900, item: 'rare' } },
      // ---------------------------------------------------------------- Act III
      { id: 'a3_sewn', act: 3, kind: 'captive', prefs: ['grove', 'fetish', 'mangrove', 'tree', 'wood'], fb: 0, name: 'The Sewn Pilgrim', target: 'a pilgrim sewn into a fetish-tree',
        desc: 'The masked priests sew the living into the fetish-trees of {Z} so the trees will learn to scream. One of them still answers when called. Cut him down.',
        done: "The pilgrim: 'I heard the tree thinking. It wanted to be a man. Take my warmth; I have more than I can use now.'", rew: { life: 20 } },
      { id: 'a3_ukko', act: 3, kind: 'kill', prefs: ['temple', 'village', 'shrine', 'altar', 'jungle'], fb: 1, name: 'The Masked Priest', target: 'Ukko-Tal of the Avian Mask',
        desc: 'Ukko-Tal wears a bird-skull and speaks through its beak. He mixes the poisons that make the brood-husks swell. He keeps his rites in {Z}.',
        done: "Ninsun: 'The mask is off. Under it was a very ordinary face. That is always the worst part.'", rew: { skill: 1 } },
      { id: 'a3_egg', act: 3, kind: 'relic', prefs: ['hive', 'brood', 'nest', 'egg', 'cave', 'sunken', 'hollow'], fb: 2, name: 'The Shell of the First Egg', target: 'The First Shell',
        desc: 'Before the Ziggurat there was an egg, and the egg hatched the fen. The shell is kept in {Z}. Ninsun wants it back where it can be watched.',
        done: "Ninsun: 'It is warm still. Everything here is warm still. Wear the old warmth; it turns the fen's teeth.'", rew: { res: 5, gold: 300 } },
      { id: 'a3_well', act: 3, kind: 'shrine', prefs: ['delta', 'bog', 'marsh', 'mire', 'pool', 'well'], fb: 3, name: 'The Pulse-Well', target: 'The Pulse-Well',
        desc: 'The mud of {Z} beats like a heart, and the Pulse-Well is where it beats loudest. Something has fouled it. Cleanse the well and endure what climbs out.',
        done: "Ninsun: 'It beats slower now. Slower is a blessing, here. Remember that.'", rew: { arcana: 1, gold: 400 } },
      { id: 'a3_brood', act: 3, kind: 'actboss', zones: ['a3_lair'], name: 'The Brood-Mother', target: 'The Brood-Mother of the First Ziggurat',
        desc: 'At the crown of the Ziggurat of the First Brood a basin of warm blood feeds the mother of the fen\'s hunger. Climb. Empty her.',
        done: "The Stranger: 'Hear how the fen misses her. Up now, into the cold. The breath is kept there.'", rew: { gold: 1400, item: 'rare' } },
      // ---------------------------------------------------------------- Act IV
      { id: 'a4_slips', act: 4, kind: 'relic', prefs: ['glacier', 'ice', 'pass', 'frozen', 'snow'], fb: 0, name: 'The Frozen Mantras', target: 'The Prayer-Slips',
        desc: 'Monks sealed prayer-slips into the ice of {Z} to tether their dying brothers. The tethers are fraying. Bring the slips up out of the ice before the brothers drift.',
        done: "Tenzar: 'Each of these held a man. Now they hold only ink. That is also a kind of rest.'", rew: { arcana: 1 } },
      { id: 'a4_keeper', act: 4, kind: 'captive', prefs: ['spire', 'lantern', 'tower', 'brass'], fb: 1, name: 'The Lantern-Keeper', target: 'the Keeper of the Spires',
        desc: 'The Lantern-Spires of {Z} burn without fuel because a keeper feeds them his own warmth. The anima-bound have chained him to the last spire. Unchain him.',
        done: "The Keeper: 'I was warm for a hundred winters so that others might be. Take some back. It was always yours.'", rew: { res: 10 } },
      { id: 'a4_bells', act: 4, kind: 'seal', prefs: ['monastery', 'bell', 'cloister', 'temple', 'abbey'], fb: 2, name: 'The Silent Bells', target: 'the Vault of the Unrung Bell',
        vault: { name: 'The Vault of the Unrung Bell', guard: 'Brother Silence' },
        desc: 'Three bells in {Z} were cast to be struck once, at the end. Strike them. The harmony will break, and behind it lies the Abbey\'s hidden stair.',
        done: "Tenzar: 'You rang them. I hoped someone would, and that it would not be me.'", rew: { skill: 1 } },
      { id: 'a4_throat', act: 4, kind: 'kill', prefs: ['summit', 'ridge', 'cliff', 'peak', 'height', 'climb'], fb: 3, name: 'Hollow-Throat', target: 'Hollow-Throat the Anima-Bound',
        desc: 'A mummified monk walks {Z} on threads of stolen soul, and every step pulls a thread from someone still breathing. Cut Hollow-Throat\'s threads.',
        done: "Tenzar: 'The threads went slack all over the mountain. I heard three old women sigh.'", rew: { stat: 3 } },
      { id: 'a4_abbot', act: 4, kind: 'actboss', zones: ['a4_lair'], name: 'The Chime-Abbot', target: 'The Chime-Abbot of An-Vhar',
        desc: 'The Abbot of the Sky-Climbers has tuned his choir of bronze to the god\'s last breath. Break the harmony and the pass will open downward, into the body.',
        done: "The Stranger: 'No more mountain. Only the way in. The body is waiting; it has been waiting a long time.'", rew: { gold: 1800, item: 'rare' } },
      // ---------------------------------------------------------------- Act V
      { id: 'a5_grist', act: 5, kind: 'kill', prefs: ['marrow', 'catacomb', 'siphon', 'highway', 'vault'], fb: 0, name: 'The Siphon-Foreman', target: 'Foreman Grist',
        desc: 'In {Z} the labor-cults still scoop marrow-grease with rusted chains, and Foreman Grist still drives them. He drove them while the god was cooling. Stop him driving.',
        done: "The Seer: 'Grist had a chisel in the god before it was cold. Ha. You were late by only a thousand years, little one.'", rew: { skill: 1 } },
      { id: 'a5_bell', act: 5, kind: 'shrine', prefs: ['shaft', 'echo', 'synapse', 'bell', 'nerve', 'web'], fb: 1, name: 'The Bell of Reminiscence', target: 'The Hanging Bell',
        desc: 'A bronze bell hangs over nothing in {Z}. Struck, it remembers the god\'s thoughts aloud, and the thoughts come to see who struck it. Strike it. Stand.',
        done: "The Seer: 'What did it remember? No, do not tell me. Keep it slow.'", rew: { arcana: 2 } },
      { id: 'a5_crown', act: 5, kind: 'relic', prefs: ['crucible', 'digest', 'acid', 'stomach', 'ruin'], fb: 2, name: 'A Crown of the Forgotten Epoch', target: 'The Unmelted Crown',
        desc: 'The acid of {Z} dissolves everything but the things that were never of this world. A crown of pre-divine metal lies there, unmelted. Take it before the floor closes.',
        done: "The Seer: 'It was made for a head with no eyes. Wear what it gives anyway. Heads change.'", rew: { item: 'unique' } },
      { id: 'a5_thought', act: 5, kind: 'captive', prefs: ['cerebrum', 'labyrinth', 'sanguine', 'cavity', 'sulci', 'optic'], fb: 3, name: 'The Thought That Remembers You', target: 'a thought that remembers you',
        desc: 'Somewhere in {Z} one of the god\'s last thoughts is about someone like you, who walked all the way down. The Slayers\' forms keep it. Free it, and let it finish.',
        done: "The thought: '...and you came all the way down. I knew you would. I am only glad I got to think it.'", rew: { stat: 5 } },
      { id: 'a5_slayer', act: 5, kind: 'actboss', zones: ['a5_lair'], name: 'The Thought of the Slayer', target: 'The Thought of the Slayer',
        desc: 'At the heart of the Cerebrum stands the Alien Temple, and in it the one thought the god never finished: the face of what killed it. Go and unthink it.',
        done: "The Stranger: 'So. You walked all the way down, and the god is still dead. Good. Now it can stop dreaming of the knife.'", rew: { gold: 3000, item: 'unique' } }
    ];

    const TOWN = {
      1: { giver: 'Warden-Crone Esk', healer: 'Sister Ysolde, Tallow-Nurse', smith: 'Brannoc of the Nail', vendor: null,
        greet: "Esk: 'Another pilgrim. Good. The dead have errands and no legs left to run them. Open your journal (J).'" },
      2: { giver: 'The Last Reliquarist', healer: 'Mother Oss-Ana', smith: 'Ibbat the Knuckle-Smith', vendor: 'Qasim the Dust-Factor',
        greet: "The Last Reliquarist: 'You came down out of the Hide with ash on your boots. Here the dust is bone. Sit. Then walk.'" },
      3: { giver: 'Priestess Ninsun of the Drowned Step', healer: 'Asheth the Leech-Wife', smith: 'Old Tamb, Fetish-Carver', vendor: 'Lugh the Eel-Monger',
        greet: "Ninsun: 'The mud is beating faster since you came. It knows. Stand on the step; it is the only dry thing for a day's walk.'" },
      4: { giver: 'Brother Tenzar of the Unrung Bell', healer: 'Sister Palden of the Warm Stone', smith: 'Chime-Wright Ulan', vendor: 'Dorje the Salt-Trader',
        greet: "Tenzar: 'Breathe slowly. The air here was the god's last breath, and there is not much of it left.'" },
      5: { giver: 'The Mysterious Stranger, come down at last', healer: 'The Nurse Without a Face', smith: 'Ferrous, the Last Smith', vendor: 'The Tallow-Merchant Who Came Down',
        greet: "The Seer: 'Messenger. Walker of the down-road. You are nearly at the bottom. Slow, now. Slow is a blessing.'" }
    };
    const HEAL_LINES = ['"Lie still. The wound remembers being skin; I only remind it."', '"There. Whole again, for a while. That is all anyone is."', '"Drink. It tastes of tallow and of mother. It will do."'];
    const STRANGER_LINES = {
      1: ["The Stranger: 'You have found the Sighing Lantern? Good. Not all of them still sing.'", "The Stranger: 'Down. Always down. If a road here rises for long, it is lying to you.'", "The Stranger: 'Do not thank me. Thanks are a kind of debt, and the god counts debts.'"],
      2: ["The Stranger: 'The bell in the ash used to be in a tower. The tower did not move. The bell did.'", "The Stranger: 'Bone remembers being a shape. The Barrens remember nothing else.'", "The Stranger: 'The Saint prays still. Be the end of his prayer.'"],
      3: ["The Stranger: 'Everything here is warm. Warmth is not kindness. Remember that in the fen.'", "The Stranger: 'The Ziggurat was built by hands that did not know they were being fed.'"],
      4: ["The Stranger: 'Up here the breath is thin because it is almost all spent. Walk softly; you are standing in a sigh.'", "The Stranger: 'The bells were tuned to a note the god never finished. Do not finish it for them.'"],
      5: ["The Stranger: 'You walk like someone who was buried gently. Hold on to that.'", "The Stranger: 'This is the inside. There is no more down after this. Only in.'", "The Stranger: 'I walked this far once. I came back up. I have regretted it every day since.'"]
    };

    function qResolveZone(q) {
      if (q.zones) { for (const id of q.zones) if (ZONE_GEN[id]) return id; if (q.kind === 'actboss') { qEnsureAct(q.act); return lairOf(q.act); } return q.zones[q.zones.length - 1]; }
      const cands = actZones(q.act).filter(id => !isTown(id) && id !== lairOf(q.act));
      for (const kw of q.prefs || []) { const f = cands.find(id => id.includes(kw) || String((typeof ZONE_NAMES === 'object' && ZONE_NAMES[id]) || '').toLowerCase().includes(kw)); if (f && !QUESTS.some(o => o !== q && o.act === q.act && P.qst.q[o.id] && P.qst.q[o.id].z === f && o.kind === q.kind)) return f; }
      if (cands.length) return cands[(q.fb || 0) % cands.length];
      qEnsureAct(q.act); return lairOf(q.act);
    }
    function qActivate(n) {
      if (!P.qst) return;
      let fresh = 0;
      for (const q of QUESTS) if (q.act === n) {
        const st = P.qst.q[q.id];
        if (!st) { P.qst.q[q.id] = { s: 1, n: 0, z: qResolveZone(q) }; fresh++; }
        else if (st.s < 3 && (!st.z || !ZONE_GEN[st.z])) st.z = qResolveZone(q);
      }
      if (fresh) setTimeout(() => { say('New errands are written in your journal (J)', 4); }, 2600);
    }
    const withThe = n => /^(the|a|an)\s/i.test(n) ? n.replace(/^The /, 'the ') : 'the ' + n;
    function qDesc(q) { const st = qSt(q); return q.desc.replace('{Z}', st && st.z ? withThe(zoneName(st.z)) : 'the deep places'); }
    function qRewardText(r) {
      const o = [];
      if (r.skill) o.push(`${r.skill} skill point${r.skill > 1 ? 's' : ''}`);
      if (r.stat) o.push(`${r.stat} stat points`);
      if (r.arcana) o.push(`${r.arcana} Arcana`);
      if (r.res) o.push(`+${r.res}% to every resistance`);
      if (r.life) o.push(`+${r.life} life`);
      if (r.item) o.push(`a ${r.item} relic`);
      if (r.gold) o.push(`${r.gold} gold`);
      return o.join(', ');
    }
    function qArcana(n, why) {
      try { if (typeof webGrantPoints === 'function') { webGrantPoints(n, why); return; } } catch (e) { }
      try { const f = (window.__spm && window.__spm.webGrantPoints) || window.webGrantPoints; if (typeof f === 'function') { f(n, why); return; } } catch (e) { }
      if (typeof gainArcana === 'function') gainArcana(n, why); else P.arc.pts += n;
    }
    function qRollItem(ilvl, want) {
      const rank = { normal: 0, magic: 1, rare: 2, unique: 3 };
      let it = null, best = null;
      for (let i = 0; i < 400; i++) { it = rollItem(ilvl, 300); if (!it || it.potion) continue; if (!best || (rank[it.q] || 0) > (rank[best.q] || 0)) best = it; if ((rank[it.q] || 0) >= (rank[want] || 0)) return it; }
      return best || it;
    }
    function qComplete(q, x, y) {
      const st = P.qst.q[q.id] || (P.qst.q[q.id] = { s: 1, n: 0, z: null });
      if (st.s === 3) return false;
      st.s = 3;
      const r = q.rew || {};
      if (r.gold) P.gold += r.gold;
      if (r.skill) P.skillPts += r.skill;
      if (r.stat) P.statPts += r.stat;
      if (r.res) P.qst.res += r.res;
      if (r.life) P.qst.life += r.life;
      if (r.res || r.life) { D = derive(); if (r.life) P.hp = Math.min(D.maxHp, P.hp + r.life); }
      if (r.item) { const it = qRollItem(Math.max(P.level, ACT_MLVL[q.act][1]) + 2, r.item); if (it) dropItem(it, (x != null ? x : P.x), (y != null ? y : P.y) + 0.6); }
      if (r.arcana) setTimeout(() => qArcana(r.arcana, q.name), 2200);
      banner('ERRAND FULFILLED', '#c9a45a', 3.2);
      say(q.done + '   (' + qRewardText(r) + ')', 7);
      sfx(392, 0.5, 'sine', 0.05, 196); sfx(588, 0.7, 'sine', 0.04, 294);
      try { burst(P.x, P.y, '#c9a45a', 26, 3); } catch (e) { }
      save();
      return true;
    }
    const qById = id => QUESTS.find(q => q.id === id);

    // =========================================================== bosses
    Object.assign(MON, {
      qa_calcknight: { name: 'Calcified Knight', spr: 'warden', tint: '#cfc2a0', hp: 60, dmg: [9, 14], spd: 1.6, r: .4, xp: 60, ai: 'shield', range: 1.4, wind: .6, rec: .8, armor: 40, poiseK: .9 },
      qa_broodling: { name: 'Brood-Mouth', spr: 'worm', tint: '#8a2a30', hp: 24, dmg: [7, 11], spd: 3.0, r: .3, xp: 20, ai: 'burrow', range: 1.3, wind: .4, poiseK: .5 },
      qa_chimegolem: { name: 'Chime-Golem of the Upper Bell', spr: 'warden', tint: '#a88a48', hp: 150, dmg: [13, 21], spd: 1.3, r: .6, xp: 200, ai: 'shield', range: 1.8, wind: .8, rec: 1.0, armor: 80, poiseK: 1.2 },
      qa_thoughtform: { name: 'Thought-Form', spr: 'gasp', tint: '#cfc8ff', hp: 40, dmg: [10, 16], spd: 1.8, r: .3, xp: 50, ai: 'ghost', wind: 1.0, poiseK: .35 },
      qb_calcifer: { name: 'Saint Calcifer of the Shattered Femur', spr: 'warden', tint: '#e8dcc0', hp: 480, dmg: [14, 22], spd: 2.0, r: .9, xp: 2600, ai: 'boss', armor: 40, poiseK: 1.2 },
      qb_brood: { name: 'The Brood-Mother of the First Ziggurat', spr: 'bloat', tint: '#7a1e24', hp: 520, dmg: [13, 20], spd: 1.0, r: 1.1, xp: 3000, ai: 'boss', poiseK: 1.4 },
      qb_abbot: { name: 'The Chime-Abbot of An-Vhar', spr: 'gasp', tint: '#a8c8e8', hp: 430, dmg: [13, 20], spd: 2.2, r: .7, xp: 3400, ai: 'boss', poiseK: 1.0 },
      qb_slayer: { name: 'The Thought of the Slayer', spr: 'moth', tint: '#8a78c8', hp: 560, dmg: [14, 22], spd: 1.6, r: 1.0, xp: 4200, ai: 'boss', poiseK: 1.5 }
    });
    const dmgRoll = m => rand(m.dmg[0], m.dmg[1]);
    function qBoom(x, y, r, dmg, type, elem, col) {
      try { burst(x, y, col || '#d8f3ff', 14, 2.6); } catch (e) { }
      if (!P.dead && Math.hypot(P.x - x, P.y - y) < r) hurtPlayer(dmg, type || 'magic', x, y, elem);
      const g = G.golem; if (g && g.state !== 'dormant' && Math.hypot(g.x - x, g.y - y) < r) hurtGolem(dmg, type || 'magic');
      for (const e of (G.echoes || []).slice()) if (Math.hypot(e.x - x, e.y - y) < r) hurtEcho(e, dmg, type || 'magic');
      try { boneAoeHurt(x, y, r, dmg, type || 'magic'); } catch (e) { }
      try { bloodAoeHurt(x, y, r, dmg, type || 'magic'); } catch (e) { }
    }
    const hazCircle = (x, y, r, delay, dmg, elem, col) => Q.haz.push({ k: 'circle', x, y, r, t: 0, delay, dmg, elem, col: col || '216,243,255' });
    const hazRing = (x, y, max, spd, dmg, elem, col) => Q.haz.push({ k: 'ring', x, y, r: 0.6, max, spd, w: 0.55, dmg, elem, col: col || '216,243,255', hit: false });
    const hazLine = (x, y, ang, len, w, delay, dmg, elem, col) => Q.haz.push({ k: 'line', x, y, ax: Math.cos(ang), ay: Math.sin(ang), len, w, t: 0, delay, dmg, elem, col: col || '200,180,255' });
    const hazPool = (x, y, r, life, dps, elem, col) => Q.haz.push({ k: 'pool', x, y, r, life, max: life, tick: 0.3, dps, elem, col: col || '150,30,40' });
    function qShot(m, ang, spd, dmg, elem) { shots.push({ x: m.x + Math.cos(ang) * (m.r + 0.2), y: m.y + Math.sin(ang) * (m.r + 0.2), vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, t: 2.8, dmg, type: 'magic', kind: 'orb', r: 0.3, elem }); }
    function qHazTick(dt) {
      if (!Q.haz.length) return;
      const out = [];
      for (const h of Q.haz) {
        if (h.k === 'circle') { h.t += dt; if (h.t >= h.delay) { qBoom(h.x, h.y, h.r, h.dmg, 'magic', h.elem, `rgb(${h.col})`); sfx(70, 0.25, 'sawtooth', 0.03, -20); continue; } }
        else if (h.k === 'ring') { h.r += h.spd * dt; if (!h.hit && !P.dead && P.roll <= 0 && Math.abs(Math.hypot(P.x - h.x, P.y - h.y) - h.r) < h.w) { h.hit = true; hurtPlayer(h.dmg, 'magic', h.x, h.y, h.elem); } if (h.r > h.max) continue; }
        else if (h.k === 'line') { h.t += dt; if (h.t >= h.delay) { const bx = h.x + h.ax * h.len, by = h.y + h.ay * h.len; if (!P.dead && segDist(P.x, P.y, h.x, h.y, bx, by) < h.w) hurtPlayer(h.dmg, 'magic', h.x, h.y, h.elem); for (let k = 0; k < 8; k++) { try { burst(h.x + h.ax * h.len * k / 8, h.y + h.ay * h.len * k / 8, `rgb(${h.col})`, 3, 1.6); } catch (e) { } } if (h.t >= h.delay + 0.18) continue; } }
        else if (h.k === 'pool') { h.life -= dt; h.tick -= dt; if (h.tick <= 0) { h.tick = 0.5; if (!P.dead && Math.hypot(P.x - h.x, P.y - h.y) < h.r) hurtPlayer(h.dps * 0.5, 'magic', h.x, h.y, h.elem); } if (h.life <= 0) continue; }
        out.push(h);
      }
      Q.haz = out;
    }
    function qHazDraw() {
      for (const h of Q.haz) {
        const p = iso(h.x, h.y);
        if (h.k === 'circle') { const k = Math.min(1, h.t / h.delay); ctx.strokeStyle = `rgba(${h.col},${0.35 + 0.5 * k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, h.r * ISO_R, h.r * ISO_RY, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = `rgba(${h.col},${0.08 + 0.18 * k})`; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, h.r * ISO_R * k, h.r * ISO_RY * k, 0, 0, Math.PI * 2); ctx.fill(); }
        else if (h.k === 'ring') { ctx.strokeStyle = `rgba(${h.col},0.75)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, h.r * ISO_R, h.r * ISO_RY, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
        else if (h.k === 'line') { const k = Math.min(1, h.t / h.delay), q = iso(h.x + h.ax * h.len, h.y + h.ay * h.len); ctx.strokeStyle = h.t >= h.delay ? `rgba(255,255,255,0.9)` : `rgba(${h.col},${0.25 + 0.45 * k})`; ctx.lineWidth = h.t >= h.delay ? 5 : 1 + 3 * k; ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(q.sx, q.sy); ctx.stroke(); ctx.lineWidth = 1; }
        else if (h.k === 'pool') { const a = Math.min(1, h.life / 1.2, (h.max - h.life) * 3 + 0.2); ctx.fillStyle = `rgba(${h.col},${0.45 * a})`; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, h.r * ISO_R, h.r * ISO_RY, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = `rgba(220,80,90,${0.35 * a})`; ctx.stroke(); }
      }
    }
    function qAdd(m, type, n, rad, rank, scale) {
      const z = G.zone, out = [];
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < 12; k++) {
          const a = Math.random() * Math.PI * 2, r = rad * (0.6 + Math.random() * 0.6), x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r;
          if (z.solidAt(x, y)) continue;
          const a2 = makeMon(type, x, y, Math.max(1, m.mlvl - 2), rank || 'normal', rank && rank !== 'normal' ? ['Extra Strong'] : []);
          a2.qadd = true; a2.state = 'chase'; if (scale) a2.qScale = scale; z.monsters.push(a2); out.push(a2);
          try { burst(x, y, '#9c9584', 10, 2); } catch (e) { } break;
        }
      }
      return out;
    }
    function qClearAdds(z) { z.monsters = z.monsters.filter(a => !(a.qadd && !a.dead)); Q.haz = []; }
    function qBlink(m, z, minP) {
      const s = z.bossSpot || { x: m.hx, y: m.hy };
      for (let k = 0; k < 30; k++) { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 6, x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r; if (!z.solidAt(x, y) && Math.hypot(x - P.x, y - P.y) >= (minP || 3.5)) { try { burst(m.x, m.y, '#cfc8ff', 16, 3); } catch (e) { } m.x = x; m.y = y; m.path = null; try { burst(x, y, '#cfc8ff', 16, 3); } catch (e) { } sfx(300, 0.3, 'sine', 0.04, -200); return; } }
    }
    // the old boss chassis: close in, slam (the base draws its ring), charge from range (the base draws its line)
    function qChassis(m, dt, T, d, tp, k, opt) {
      switch (m.state) {
        case 'idle': m.state = 'chase'; break;
        case 'chase':
          if (!opt.hold && d > 1.4 + m.r * 0.6) monMove(m, T.x, T.y, m.spd * k, dt);
          if (m.cd <= 0) {
            if (d < 2.3 + m.r * 0.6) { m.state = 'slamWind'; m.t = 0; m.target = { x: m.x + tp.x * 1.2, y: m.y + tp.y * 1.2 }; }
            else if (opt.charge && d < 8.5) { m.state = 'chargeWind'; m.t = 0; m.aim = { x: tp.x, y: tp.y }; }
          }
          break;
        case 'slamWind':
          if (m.t > 0.9 / k) { m.state = 'recover'; m.t = 0; G.shake = 5; qBoom(m.target.x, m.target.y, 2.1, dmgRoll(m) * 1.3, 'magic', opt.elem, opt.col || '#d8f3ff'); sfx(55, 0.5, 'sawtooth', 0.07, -20); }
          break;
        case 'chargeWind': if (m.t > 0.7 / k) { m.state = 'charge'; m.t = 0; m.hitOnce = false; sfx(90, 0.4, 'sawtooth', 0.05, 60); } break;
        case 'charge': {
          const ox = m.x, oy = m.y; moveCircle(m, m.aim.x * 10 * dt, m.aim.y * 10 * dt); pushOut(m);
          if (!m.hitOnce && Math.hypot(P.x - m.x, P.y - m.y) < m.r + P.r + 0.1) { m.hitOnce = true; hurtPlayer(dmgRoll(m), 'phys', ox, oy); }
          if (G.golem && G.golem.state !== 'dormant' && Math.hypot(G.golem.x - m.x, G.golem.y - m.y) < m.r + G.golem.r + 0.1) { hurtGolem(dmgRoll(m), 'phys', m); m.state = 'recover'; m.t = 0; }
          if (m.t > 0.6 || (Math.abs(m.x - ox) < 1e-4 && Math.abs(m.y - oy) < 1e-4)) { m.state = 'recover'; m.t = 0; }
          break;
        }
        case 'recover': if (m.t > 0.9 / k) { m.state = 'chase'; m.cd = 0.5 + Math.random() * 0.8; } break;
        default: m.state = 'chase';
      }
    }
    const QB = {
      // Act II — a crusader-saint calcified at prayer: slams, charges, reliquary lances; later his knights rise and
      // the bone-dust storms; at the end he drives the femur-standard down and rings of lances roll out of it
      calcifer: {
        type: 'qb_calcifer', act: 2, scale: 2.1,
        intro: 'Saint Calcifer: "Kneel. The war is not over. The war is never over."',
        stages: [
          { at: 0.7, fn: m => { say('The Saint raises the femur-standard, and his knights stand up out of the dust', 3); qAdd(m, 'qa_calcknight', 4, 4, 'normal', 1.2); } },
          { at: 0.4, fn: m => { say('The bone-dust rises. The Saint\'s skin calcifies further', 3); m.armor += 40; } },
          { at: 0.15, fn: m => { say('He drives the standard into the femur. The ground answers', 3); G.shake = 8; } }
        ],
        tick(m, dt, T, d, tp) {
          const k = m.qstage >= 2 ? 1.25 : 1;
          m.qL = (m.qL || 4) - dt;
          if (m.state === 'chase' && m.qL <= 0 && d > 2.5) {
            m.qL = m.qstage >= 1 ? 5 : 6.5; const px = T.x, py = T.y;
            for (const [dx, dy] of [[0, 0], [1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]]) hazCircle(px + dx, py + dy, 1.2, 1.1, dmgRoll(m) * 1.0, 'phys', '232,220,192');
            say('Reliquary lances', 1.2);
          }
          if (m.qstage >= 2) { m.qA = (m.qA || 2) - dt; if (m.qA <= 0) { m.qA = 3.2; for (let i = 0; i < 3; i++) hazCircle(T.x + rand(-3, 3), T.y + rand(-3, 3), 1.4, 1.3, dmgRoll(m) * 0.7, 'phys', '220,210,180'); } }
          if (m.qstage >= 3) { m.qB = (m.qB || 1) - dt; if (m.qB <= 0) { m.qB = 5.5; hazRing(m.x, m.y, 11, 5, dmgRoll(m) * 0.9, 'phys', '240,230,200'); } }
          qChassis(m, dt, T, d, tp, k, { charge: true, col: '#e8dcc0' });
        }
      },
      // Act III — the Brood-Mother squats on the basin: spits fans of bile, lays eggs, floods the crown with blood
      brood: {
        type: 'qb_brood', act: 3, scale: 2.6,
        intro: 'The Brood-Mother turns in the basin, and the blood turns with her.',
        stages: [
          { at: 0.75, fn: m => { say('She lays. The eggs split before they land', 3); qAdd(m, 'qa_broodling', 5, 3); } },
          { at: 0.45, fn: m => { say('The basin overflows', 3); } },
          { at: 0.2, fn: m => { say('The Mother is frenzied. Everything in the fen is hungry at once', 3); m.spd *= 1.3; } }
        ],
        tick(m, dt, T, d, tp) {
          m.qA = (m.qA || 1.5) - dt;
          if (m.qA <= 0 && d < 12 && m.state === 'chase') {
            m.qA = m.qstage >= 3 ? 1.3 : 2.3; const a0 = Math.atan2(tp.y, tp.x), n = m.qstage >= 3 ? 7 : 5;
            for (let i = 0; i < n; i++) qShot(m, a0 + (i - (n - 1) / 2) * 0.22, 5.2, dmgRoll(m) * 0.7, 'poison');
            sfx(180, 0.3, 'sawtooth', 0.04, -80);
          }
          if (m.qstage >= 2) { m.qB = (m.qB || 1) - dt; if (m.qB <= 0) { m.qB = 4; hazPool(T.x + rand(-1, 1), T.y + rand(-1, 1), 1.7, 7, dmgRoll(m) * 0.35, 'blood'); } }
          if (m.qstage >= 3) { m.qC = (m.qC || 3) - dt; if (m.qC <= 0) { m.qC = 7; if (G.zone.monsters.filter(a => a.qadd && !a.dead).length < 8) qAdd(m, 'qa_broodling', 2, 3); } }
          qChassis(m, dt, T, d, tp, 1, { hold: d < 4.5, col: '#b04048', elem: 'poison' });
        }
      },
      // Act IV — the Chime-Abbot keeps his distance and tolls rings of cold; his bronze golems wake; the harmony breaks
      abbot: {
        type: 'qb_abbot', act: 4, scale: 2.2,
        intro: 'The Chime-Abbot: "Hush. The choir is about to begin."',
        stages: [
          { at: 0.66, fn: m => { say('The bells\' harmony wavers. The Chime-Golems wake', 3); qAdd(m, 'qa_chimegolem', 2, 4, 'champion', 1.5); } },
          { at: 0.33, fn: m => { say('The harmony breaks. Every bell on the mountain answers', 3); G.shake = 6; } }
        ],
        tick(m, dt, T, d, tp) {
          if (m.state === 'idle') m.state = 'chase';
          if (d < 4) stepToward(m, m.x - tp.x, m.y - tp.y, m.spd * dt); else if (d > 7.5) monMove(m, T.x, T.y, m.spd, dt);
          m.qA = (m.qA || 1.2) - dt;
          if (m.qA <= 0) { m.qA = m.qstage >= 2 ? 2.2 : 3; const n = m.qstage >= 2 ? 12 : 8, o = Math.random(); for (let i = 0; i < n; i++) qShot(m, o + i / n * Math.PI * 2, m.qstage >= 2 ? 5 : 4, dmgRoll(m) * 0.6, 'cold'); sfx(660, 0.6, 'sine', 0.04, -300); }
          m.qB = (m.qB || 0) - dt;
          if (d < 2.4 && m.qB <= 0) { m.qB = 4; qBlink(m, G.zone, 4); }
          if (m.qstage >= 2) { m.qC = (m.qC || 2) - dt; if (m.qC <= 0) { m.qC = 4; hazRing(m.x, m.y, 12, 5.5, dmgRoll(m) * 0.9, 'cold', '168,200,232'); } }
        }
      },
      // Act V — the Thought of the Slayer: cold beams that ignore flesh, thought-forms split off it, the temple inverts
      slayer: {
        type: 'qb_slayer', act: 5, scale: 2.3,
        intro: 'The Thought of the Slayer turns toward you. It has a face now. It is not a face.',
        stages: [
          { at: 0.6, fn: m => { say('The Thought splits. Its forms step out of the angles', 3); qAdd(m, 'qa_thoughtform', 4, 4); qBlink(m, G.zone, 5); } },
          { at: 0.3, fn: m => { say('The temple inverts. The ceiling is falling upward into you', 3); G.shake = 8; } }
        ],
        tick(m, dt, T, d, tp) {
          m.qA = (m.qA || 2) - dt;
          if (m.qA <= 0 && m.state === 'chase') {
            m.qA = m.qstage >= 1 ? 3.2 : 4.2; const a0 = Math.atan2(tp.y, tp.x), n = m.qstage >= 1 ? 5 : 3;
            for (let i = 0; i < n; i++) hazLine(m.x, m.y, a0 + (i - (n - 1) / 2) * 0.33, 14, 0.8, 1.1, dmgRoll(m) * 1.2, 'void', '170,150,255');
            sfx(120, 0.9, 'sine', 0.04, 400);
          }
          if (m.qstage >= 2) {
            m.qB = (m.qB || 1) - dt; if (m.qB <= 0) { m.qB = 1.5; for (let i = 0; i < 2; i++) hazCircle(T.x + rand(-2.5, 2.5), T.y + rand(-2.5, 2.5), 1.3, 1.0, dmgRoll(m) * 0.8, 'void', '140,120,220'); }
            m.qC = (m.qC || 6) - dt; if (m.qC <= 0) { m.qC = 6; qBlink(m, G.zone, 4); }
          }
          qChassis(m, dt, T, d, tp, m.qstage >= 2 ? 1.2 : 1, { col: '#9a88ff', elem: 'void' });
        }
      }
    };
    const QB_BY_ACT = { 2: 'calcifer', 3: 'brood', 4: 'abbot', 5: 'slayer' };
    function qBossUpdate(m, dt) {
      const def = QB[m.qb], z = G.zone;
      if (!G.bossFight) { m.state = 'idle'; if (m.hp < m.max) m.hp = Math.min(m.max, m.hp + m.max * 0.2 * dt); if (m.hp >= m.max && m.qstage) { m.qstage = 0; qClearAdds(z); } return; }
      if (P.dead) return;
      const T = monTarget(m), d = dist(m, T), tp = { x: (T.x - m.x) / (d || 1), y: (T.y - m.y) / (d || 1) };
      if (Math.abs(tp.x - tp.y) > 0.05) m.face = tp.x - tp.y > 0 ? 1 : -1;
      m.tgt = T;
      m.qstage = m.qstage || 0;
      while (m.qstage < def.stages.length && m.hp <= m.max * def.stages[m.qstage].at) { const s = def.stages[m.qstage]; m.qstage++; try { s.fn(m); } catch (e) { qErr(e); } }
      def.tick(m, dt, T, d, tp);
    }
    function qMakeLairBoss(z, n) {
      const key = QB_BY_ACT[n]; if (!key) return;
      if (z.boss && !z.boss.qb) { const old = z.boss; z.monsters = z.monsters.filter(x => x !== old); }
      const s = z.bossSpot ? { x: z.bossSpot.x, y: z.bossSpot.y } : qFarSpot(z, 0.95, 'boss');
      const nw = nearestWalk(z, Math.floor(s.x), Math.floor(s.y)); if (nw && !z.walkTile(Math.floor(s.x), Math.floor(s.y))) { s.x = nw[0] + 0.5; s.y = nw[1] + 0.5; }
      z.bossSpot = s;
      const b = makeMon(QB[key].type, s.x, s.y, BOSS_LVL[n], 'boss', []);
      b.qb = key; b.qScale = QB[key].scale; b.pack = 'boss'; b.qstage = 0;
      z.monsters.push(b); z.boss = b; z.qLair = true;
      z.bossRoom = { x: Math.floor(s.x) - 9, y: Math.floor(s.y) - 9, w: 18, h: 18, cx: s.x, cy: s.y };
      // clear the arena of ordinary packs so the fight reads
      z.monsters = z.monsters.filter(x => x === b || x.dead || Math.hypot(x.x - s.x, x.y - s.y) > 11);
    }
    function qCheckLair(z) {
      const b = z.boss; if (!b || b.dead) return;
      const s = z.bossSpot || { x: b.hx, y: b.hy }, dp = Math.hypot(P.x - s.x, P.y - s.y);
      if (G.bossFight && G.bossZone === z.id) {
        if (dp > 26) { G.bossFight = false; G.seal = []; say('It lets you go. It is patient. It has been patient for a thousand years.', 3); b.x = b.hx; b.y = b.hy; b.state = 'idle'; b.path = null; }
        return;
      }
      if (!G.bossFight && !P.dead && dp < 8.5) {
        G.bossFight = true; G.seal = []; G.bossZone = z.id; b.state = 'chase'; b.cd = 1.2;
        banner(b.name.toUpperCase(), '#c8553d', 3); sfx(60, 1.2, 'sawtooth', 0.06, 40);
        const def = QB[b.qb]; if (def && def.intro) say(def.intro, 4);
      }
    }

    // =========================================================== towns, waypoints, objectives
    const ROLE_ALIAS = { quest: 'giver', elder: 'giver', questgiver: 'giver', priest: 'giver', trader: 'vendor', merchant: 'vendor', shop: 'vendor', heal: 'healer', chest: 'stash', blacksmith: 'smith', wp: 'waypoint' };
    function qTownNpcs(z, n, center, spots) {
      const T0 = TOWN[n], rng = qRng(z.id + 'npc');
      const bySpot = {}; for (const s of (spots || [])) { const r = ROLE_ALIAS[s.role] || s.role; if (r && !bySpot[r]) bySpot[r] = s; }
      const place = (role, obj) => {
        const s = bySpot[role]; let p;
        if (s) { const nw = nearestWalk(z, Math.floor(s.x), Math.floor(s.y)); p = nw && !z.walkTile(Math.floor(s.x), Math.floor(s.y)) ? { x: nw[0] + 0.5, y: nw[1] + 0.5 } : { x: s.x, y: s.y }; }
        else p = qFreeSpot(z, center.x, center.y, 2.5, 7, rng);
        z.objects.push(Object.assign({ x: p.x, y: p.y }, obj));
      };
      const hasVendor = z.objects.some(o => o.type === 'vendor');
      if (!hasVendor) place('vendor', { type: 'vendor', name: T0.vendor || 'The Peddler', qname: T0.vendor || 'The Peddler' });
      place('healer', { type: 'qobj', q: 'npc', role: 'healer', name: T0.healer, spr: 'vendor' });
      place('stash', { type: 'qobj', q: 'npc', role: 'stash', name: 'The Reliquary Chest', spr: 'chest' });
      place('smith', { type: 'qobj', q: 'npc', role: 'smith', name: T0.smith, spr: 'vendor' });
      place('giver', { type: 'qobj', q: 'npc', role: 'giver', name: T0.giver, spr: 'vendor' });
      place('stranger', { type: 'qobj', q: 'npc', role: 'stranger', name: 'The Stranger', spr: 'vendor' });
      if (!z.objects.some(o => o.q === 'wp')) { if (wpSpotOf(z) || bySpot.waypoint) { if (bySpot.waypoint && !wpSpotOf(z)) z.wpSpot = bySpot.waypoint; qPlaceWp(z); } else place('waypoint', { type: 'qobj', q: 'wp', name: 'Waypoint', spr: 'shrine' }); }
    }
    const A1_WP = ['moor', 'hollow_wood', 'fen', 'crypt', 'barrow', 'cata1', 'cata2', 'root_deep', 'sighing_ridge', 'pilgrim_road', 'drowned_village', 'sunken_bog', 'burnt_heath'];
    function qWantsWp(z) {
      if (z.waypoint === false || /^qvault_/.test(z.id)) return false;
      if (isTown(z.id) || z.waypoint === true || wpSpotOf(z)) return true;
      const n = actOf(z.id);
      if (n === 1) return A1_WP.includes(z.id);
      if (z.id === lairOf(n)) return false;
      if (isSide(z.id)) { const ids = Object.keys(ZONE_GEN).filter(id => /scar|nihl/i.test(id)).sort(); return ids.indexOf(z.id) % 2 === 0; }
      const ids = actZones(n).filter(id => !isTown(id) && id !== lairOf(n));
      return ids.indexOf(z.id) % 2 === 0;
    }
    const wpSpotOf = z => z.wpSpot || z.waypointSpot || (z.questSpots && z.questSpots.waypoint) || null;
    function qPlaceWp(z) {
      if (z.objects.some(o => o.q === 'wp')) return;
      let p; const ws = wpSpotOf(z);
      if (ws) { const nw = z.walkTile(Math.floor(ws.x), Math.floor(ws.y)) ? null : nearestWalk(z, Math.floor(ws.x), Math.floor(ws.y)); p = nw ? { x: nw[0] + 0.5, y: nw[1] + 0.5 } : { x: ws.x, y: ws.y }; }
      else { const s = qStart(z); p = qFreeSpot(z, s.x, s.y, 3, 8, qRng(z.id + 'wp')); }
      z.objects.push({ type: 'qobj', q: 'wp', x: p.x, y: p.y, name: 'Waypoint', spr: 'shrine' });
    }
    function qNextTownPortal(z, n, x, y) {
      if (n >= 5) return;
      qEnsureAct(n + 1);
      const to = townOf(n + 1);
      if (z.objects.some(o => o.type === 'portal' && o.to === to)) return;
      const p = (x != null && !z.solidAt(x, y)) ? { x, y } : qFreeSpot(z, x != null ? x : (z.bossSpot || qStart(z)).x, y != null ? y : (z.bossSpot || qStart(z)).y, 1.5, 5);
      z.objects.push({ type: 'portal', x: p.x, y: p.y, to, name: ['', '', 'Down into the Bleached Barrens', 'Down into the Fen of Shog-Mire', 'Up into the Heights of An-Vhar', 'Into the body: the Descent'][n + 1], spr: 'gate', qlink: true });
    }
    function qPostGamePortals(z, x, y) {
      const sc = scarZone();
      if (sc && !z.objects.some(o => o.type === 'portal' && o.to === sc)) { const p = x != null ? { x: x + 1.5, y } : qFreeSpot(z, z.bossSpot.x, z.bossSpot.y, 1.5, 5); z.objects.push({ type: 'portal', x: p.x, y: p.y, to: sc, name: 'The Scar of Ur-Nihl', spr: 'cave' }); }
      if (!z.objects.some(o => o.type === 'portal' && o.to === 'a5_town')) { const p = x != null ? { x: x - 1.5, y } : qFreeSpot(z, z.bossSpot.x, z.bossSpot.y, 1.5, 5); z.objects.push({ type: 'portal', x: p.x, y: p.y, to: 'a5_town', name: 'Back up to the Last Hearth', spr: 'stairs' }); }
    }
    function qPlaceObjective(z, q, st) {
      const rng = qRng(z.id + q.id), mlvl = qZoneMlvl(z) + 1, type = qZoneType(z);
      if (q.kind === 'kill' || (q.kind === 'zoneboss' && !z.boss)) {
        if (z.monsters.some(m => m.qid === q.id && !m.dead)) return;
        const p = qFarSpot(z, 0.82, q.id);
        const u = makeMon(q.kind === 'zoneboss' ? 'boss' : type, p.x, p.y, mlvl + 1, 'unique', ['Extra Strong', 'Stone Skin']);
        u.name = q.target; u.qid = q.id; u.qScale = 1.3; u.pack = 'q' + q.id; z.monsters.push(u);
        for (let i = 0; i < 3; i++) { const a = rng() * 6.28, x = p.x + Math.cos(a) * 1.6, y = p.y + Math.sin(a) * 1.6; if (!z.solidAt(x, y)) { const mm = makeMon(type, x, y, mlvl, 'minion', []); mm.pack = 'q' + q.id; z.monsters.push(mm); } }
      } else if (q.kind === 'relic') {
        const p = qFarSpot(z, 0.85, q.id);
        z.objects.push({ type: 'qobj', q: 'relic', qid: q.id, x: p.x, y: p.y, name: q.target, spr: 'chest' });
        for (let i = 0; i < 4; i++) { const a = rng() * 6.28, x = p.x + Math.cos(a) * 2.4, y = p.y + Math.sin(a) * 2.4; if (!z.solidAt(x, y)) { const mm = makeMon(type, x, y, mlvl, i < 2 ? 'champion' : 'normal', i < 2 ? ['Extra Fast'] : []); mm.pack = 'q' + q.id; z.monsters.push(mm); } }
      } else if (q.kind === 'shrine') {
        const p = qFarSpot(z, 0.6, q.id);
        z.objects.push({ type: 'qobj', q: 'shrine', qid: q.id, x: p.x, y: p.y, name: q.target, spr: 'shrine' });
        z.monsters = z.monsters.filter(m => m.qid || Math.hypot(m.x - p.x, m.y - p.y) > 6);
      } else if (q.kind === 'captive') {
        const p = qFarSpot(z, 0.78, q.id);
        z.objects.push({ type: 'qobj', q: 'captive', qid: q.id, x: p.x, y: p.y, name: q.target.replace(/^\w/, c => c.toUpperCase()), spr: 'vendor' });
        for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + rng(), x = p.x + Math.cos(a) * 2.8, y = p.y + Math.sin(a) * 2.8; if (!z.solidAt(x, y)) { const mm = makeMon(type, x, y, mlvl, i === 0 ? 'champion' : 'normal', i === 0 ? ['Stone Skin'] : []); mm.qguard = q.id; mm.pack = 'q' + q.id; z.monsters.push(mm); } }
      } else if (q.kind === 'seal') {
        const lit = st.n | 0;
        [0.35, 0.6, 0.88].forEach((f, i) => { const p = qFarSpot(z, f, q.id + 's' + i); z.objects.push({ type: 'qobj', q: 'sigil', qid: q.id, idx: i, lit: !!(lit & (1 << i)), x: p.x, y: p.y, name: q.act === 4 ? 'A Silent Bell' : 'A Knuckle-Seal', spr: 'shrine' }); });
        if (st.s === 2) { const last = z.objects.filter(o => o.q === 'sigil' && o.qid === q.id).pop(); qVaultPortal(z, q, last.x + 1.5, last.y); }
      }
    }
    function qVaultPortal(z, q, x, y) {
      const to = 'qvault_' + q.act;
      if (z.objects.some(o => o.type === 'portal' && o.to === to)) return;
      const p = z.solidAt(x, y) ? qFreeSpot(z, x, y, 1, 4) : { x, y };
      z.objects.push({ type: 'portal', x: p.x, y: p.y, to, name: q.vault.name, spr: 'stairs' });
      if (typeof ZONE_NAMES === 'object') ZONE_NAMES[to] = q.vault.name;
    }
    function qDecorate(z) {
      if (!z || z._qdec) return; z._qdec = true;
      if (!P.qst) P.qst = qFresh();
      const n = actOf(z.id);
      // Act I: the Lantern Camp on the Moor is the hub
      if (z.id === 'moor') {
        const v = z.objects.find(o => o.type === 'vendor'), l = z.lanterns[0], c = v ? { x: v.x + 2.5, y: v.y + 1.5 } : l ? { x: l.x, y: l.y } : qStart(z);
        z.qSafeC = { x: c.x, y: c.y, r: 9 };
        z.monsters = z.monsters.filter(m => Math.hypot(m.x - c.x, m.y - c.y) > 15);
        qTownNpcs(z, 1, c, z.npcSpots);
      } else if (isTown(z.id)) {
        z.qSafe = true; z.monsters = [];
        const c = z.townCenter || (z.npcSpots && z.npcSpots.length ? { x: z.npcSpots.reduce((a, s) => a + s.x, 0) / z.npcSpots.length, y: z.npcSpots.reduce((a, s) => a + s.y, 0) / z.npcSpots.length } : qStart(z));
        qTownNpcs(z, n, c, z.npcSpots);
        // arrivals from the previous act's lair come in at the town's act gate, where its builder left one
        const gate = (z.questSpots && (z.questSpots.actGateArrive || z.questSpots.actGate)) || z.prevActSpot || z.upSpot;
        if (gate) { z.arrive = z.arrive || {}; const prev = lairOf(n - 1); if (!z.arrive[prev]) z.arrive[prev] = { x: gate.x, y: gate.y }; }
        if (!z.lanterns.length) { const p = qFreeSpot(z, qStart(z).x, qStart(z).y, 1.5, 4); z.lanterns.push({ x: p.x, y: p.y, name: z.name }); z.objects.push({ type: 'lantern', x: p.x, y: p.y, idx: 0, name: z.name }); }
        if (Q.fbLair[n] && !Q.fbTown[n] && !z.objects.some(o => o.type === 'portal' && o.to === lairOf(n))) { const p = qFreeSpot(z, qStart(z).x, qStart(z).y, 4, 9); z.objects.push({ type: 'portal', x: p.x, y: p.y, to: lairOf(n), name: 'The road down', spr: 'gate' }); }
        if (P.qst.act > n) qNextTownPortal(z, n);
      }
      if (qWantsWp(z)) qPlaceWp(z);
      // the act's final boss and the way onward
      if (n >= 2 && z.id === lairOf(n)) qMakeLairBoss(z, n);
      if (z.id === 'cata2' && !z.boss) { const s = qFarSpot(z, 0.95, 'matron'); const b = makeMon('matron', s.x, s.y, 16, 'boss', []); b.pack = 'boss'; z.monsters.push(b); z.boss = b; z.bossRoom = { x: Math.floor(s.x) - 6, y: Math.floor(s.y) - 6, w: 12, h: 12, cx: s.x, cy: s.y }; z.qLair = true; z.bossSpot = s; }
      if (z.id === lairOf(n) && P.qst.act > n) { const s = z.bossSpot || (z.bossRoom && { x: z.bossRoom.cx, y: z.bossRoom.cy }) || qStart(z); z.bossSpot = z.bossSpot || s; if (n < 5) qNextTownPortal(z, n, s.x + 0.5, s.y + 2); }
      if (z.id === 'a5_lair' && P.qst.ended) qPostGamePortals(z);
      // vaults: the guardian
      if (/^qvault_/.test(z.id)) {
        const q = qById(z.qVaultOf) || QUESTS.find(x => x.kind === 'seal' && x.act === n), st = q && qSt(q);
        if (q && (!st || st.s !== 3)) { const g = makeMon(qZoneType(z) === 'hollow' ? (n >= 4 ? 'knight' : 'hollow') : qZoneType(z), 22.5, 18.5, ACT_MLVL[n][1] + 2, 'unique', ['Extra Strong', 'Stone Skin']); g.name = q.vault.guard; g.qvault = q.id; g.qScale = 1.35; z.monsters.push(g); }
        if (q) { const tbl = typeof PACKS_HIGH !== 'undefined' ? PACKS_HIGH : PACKS_MID, rng = qRng(z.id); for (let k = 0; k < 3; k++) placePack(z, 22.5 + rand(-8, 8), 22.5 + rand(-8, 4), ACT_MLVL[n][1], tbl, 'qv' + k, rng); }
      }
      // quest objectives in this zone
      for (const q of QUESTS) { const st = qSt(q); if (!st || st.s === 3 || st.z !== z.id) continue; try { qPlaceObjective(z, q, st); } catch (e) { qErr(e); } }
    }
    function qDiscoverWp(z) {
      if (!P.qst || P.qst.wp[z.id]) return;
      P.qst.wp[z.id] = 1; P.qst.wpn[z.id] = z.name || zoneName(z.id);
      say(`${z.name || 'The waystone'} knows your step.`, 2.5); sfx(70, 0.6, 'sine', 0.05, -20); sfx(140, 0.25, 'triangle', 0.02, -60);
      try { const o = z.objects.find(o => o.q === 'wp'); if (o) { burst(o.x, o.y, '#3a1a14', 10, 1.2); if (window.__maw) window.__maw.wake(o); } } catch (e) { }
    }
    // v94: the Trial of Thirty starts with every waypoint kindled (the user: "set the test character to have every waypoint")
    function qKindleAll() {
      if (!P.qst) P.qst = qFresh();
      P.qst.act = Math.max(P.qst.act || 1, 5);
      for (const id of Object.keys(ZONE_GEN)) {
        let want = false; try { want = !!actOf(id) && qWantsWp({ id, objects: [] }); } catch (e) { want = false; }
        if (want) { P.qst.wp[id] = 1; P.qst.wpn[id] = zoneName(id); }
      }
      return Object.keys(P.qst.wp).length;
    }
    function qTravel(id) { if (window.__maw && window.__maw.begin && window.__maw.begin(id, qTravelNow)) return; qTravelNow(id); }
    function qTravelNow(id) {
      const n = actOf(id); qEnsureAct(n);
      const z = qEnsureZone(id); if (!z) { say('That waystone has closed', 2); return; }
      const wp = z.objects.find(o => o.q === 'wp');
      G.panels.qwp = false; Q.wpNear = true;
      enterZone(id, wp ? { x: wp.x, y: wp.y + 1.3 } : null);
      sfx(300, 0.6, 'sine', 0.05, 300);
    }
    function qGoTown(n) {
      qEnsureAct(n); const id = townOf(n), z = qEnsureZone(id); if (!z) return;
      enterZone(id);
      if (z.lanterns.length) { P.lastLantern = { zone: id, idx: 0 }; const key = id + ':0'; if (!P.found.includes(key)) P.found.push(key); }
      P.qst.wp[id] = 1; P.qst.wpn[id] = z.name;
    }

    // =========================================================== interaction
    function qOpen(p) { G.panels.char = G.panels.skills = G.panels.vendor = G.panels.lantern = false; G.panels.qlog = G.panels.qwp = G.panels.qstash = G.panels.qwares = false; G.panels[p] = true; }
    function qCloseLeft() { G.panels.qlog = G.panels.qwp = G.panels.qstash = G.panels.qwares = false; }
    const qLeftOpen = () => G.panels.qlog || G.panels.qwp || G.panels.qstash || G.panels.qwares;
    function qInteract(o) {
      const z = G.zone;
      if (o.q === 'wp') { qDiscoverWp(z); Q.wtab = actOf(z.id); qOpen('qwp'); return; }
      if (o.q === 'npc') {
        const n = actOf(z.id);
        if (o.role === 'healer') { D = derive(); P.hp = D.maxHp; P.mana = D.maxMana; P.stam = D.maxStam; P.poison = null; P.burn = null; say(`${o.name}: ${HEAL_LINES[Math.floor(Math.random() * HEAL_LINES.length)]}`, 3.5); try { burst(P.x, P.y, '#d8f3ff', 20, 2); } catch (e) { } sfx(440, 0.5, 'sine', 0.05, 220); return; }
        if (o.role === 'stash') { qStashLoad(); qOpen('qstash'); G.panels.inv = true; return; }
        if (o.role === 'smith') { Q.smithName = o.name; qOpen('qwares'); G.panels.inv = true; return; }
        if (o.role === 'giver') { Q.tab = n; Q.sel = null; qOpen('qlog'); const pend = QUESTS.filter(q => q.act === n && qSt(q) && qSt(q).s !== 3).length; say(pend ? `${o.name}: '${pend === 1 ? 'One errand remains.' : pend + ' errands remain.'} The dead are patient. I am less so.'` : `${o.name}: 'Nothing left here that needs you. Go down.'`, 3.5); return; }
        if (o.role === 'stranger') { const L = STRANGER_LINES[n] || STRANGER_LINES[1]; o.li = ((o.li == null ? Math.floor(Math.random() * L.length) : o.li) + 1) % L.length; say(L[o.li], 4.5); return; }
        return;
      }
      const q = qById(o.qid), st = q && qSt(q);
      if (!q || !st || st.s === 3) return;
      if (o.q === 'relic') { z.objects.splice(z.objects.indexOf(o), 1); try { burst(o.x, o.y, '#c9a45a', 24, 2.5); } catch (e) { } qComplete(q, o.x, o.y); return; }
      if (o.q === 'shrine') { if (Q.wave && Q.wave.qid === q.id) return; qStartWave(z, o, q, 0); return; }
      if (o.q === 'captive') {
        const left = z.monsters.filter(m => m.qguard === q.id && !m.dead && Math.hypot(m.x - o.x, m.y - o.y) < 12).length;
        if (left) { say(`Her keepers still stand (${left}). Cut them down first.`.replace('Her', /Nell|daughter/.test(q.target) ? 'Her' : 'Its'), 2.5); return; }
        z.objects.splice(z.objects.indexOf(o), 1); try { burst(o.x, o.y, '#e8e2d0', 26, 3); } catch (e) { } qComplete(q, o.x, o.y); return;
      }
      if (o.q === 'sigil') {
        if (o.lit) return;
        o.lit = true; st.n = (st.n | 0) | (1 << o.idx); try { burst(o.x, o.y, '#ffcf70', 20, 2.5); } catch (e) { } sfx(q.act === 4 ? 880 : 240, 0.8, 'sine', 0.05, q.act === 4 ? -440 : 60);
        const lit = [0, 1, 2].filter(i => st.n & (1 << i)).length;
        if (lit >= 3) { st.s = 2; qVaultPortal(z, q, o.x + 1.5, o.y); banner('THE SEALED WAY OPENS', '#c9a45a', 3); say(`${q.vault.name} lies open. Something below has heard.`, 3); save(); }
        else say(`${lit} of 3 ${q.act === 4 ? 'bells rung' : 'seals pressed'}`, 2);
        return;
      }
    }
    function qStartWave(z, o, q, k) {
      const type = qZoneType(z), mlvl = qZoneMlvl(z), n = k === 0 ? 5 : 6;
      Q.wave = { qid: q.id, k, z: z.id, o };
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.28 + Math.random(), r = 4 + Math.random() * 2, x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
        if (z.solidAt(x, y)) continue;
        const m = makeMon(type, x, y, mlvl, k === 1 && i === 0 ? 'champion' : 'normal', k === 1 && i === 0 ? ['Extra Fast'] : []);
        m.qwave = q.id; m.state = 'chase'; z.monsters.push(m); try { burst(x, y, '#6f6a79', 10, 2); } catch (e) { }
      }
      say(k === 0 ? `You kneel at ${q.target}. The drinkers of light come` : 'Hold. More of them', 2.5);
      sfx(150, 0.6, 'sawtooth', 0.04, -40);
    }
    function qWaveCheck(z) {
      const w = Q.wave; if (!w) return;
      if (w.z !== z.id) { Q.wave = null; return; }
      if (z.monsters.some(m => m.qwave === w.qid && !m.dead)) return;
      const q = qById(w.qid);
      if (w.k === 0) { qStartWave(z, w.o, q, 1); return; }
      Q.wave = null; w.o.used = true; qComplete(q, w.o.x, w.o.y);
    }
    function qSafeSweep(z) {
      const c = z.qSafeC; if (!c) return;
      for (const m of z.monsters) if (!m.dead && Math.hypot(m.x - c.x, m.y - c.y) < c.r + 1) { m.state = 'idle'; m.path = null; if (Math.hypot(m.hx - c.x, m.hy - c.y) > c.r + 2) { m.x = m.hx; m.y = m.hy; } else m.dead = true; }
    }
    function qSafeHere() { const z = G.zone; if (!z) return false; if (z.qSafe) return true; const c = z.qSafeC; return !!(c && Math.hypot(P.x - c.x, P.y - c.y) < c.r); }

    // =========================================================== kills
    function qOnKill(m) {
      const z = G.zone, n = actOf(z.id);
      if (m.qid) { const q = qById(m.qid); if (q && qSt(q) && qSt(q).s !== 3) qComplete(q, m.x, m.y); }
      if (m.qvault) { const q = qById(m.qvault); if (q && qSt(q) && qSt(q).s !== 3) qComplete(q, m.x, m.y); }
      if (m.qwave) Q.t = 0;
      if (m.rank === 'boss' && m === z.boss) {
        const zq = QUESTS.find(q => q.kind === 'zoneboss' && qSt(q) && qSt(q).z === z.id && qSt(q).s !== 3);
        if (zq) qComplete(zq, m.x, m.y);
        if (z.id === lairOf(n)) qActDone(n, m);
      }
    }
    function qActDone(n, m) {
      const aq = QUESTS.find(q => q.act === n && q.kind === 'actboss');
      const first = P.qst.act <= n;
      P.qst.act = Math.max(P.qst.act, Math.min(5, n + 1));
      if (aq) { if (!P.qst.q[aq.id]) P.qst.q[aq.id] = { s: 1, n: 0, z: G.zone.id }; qComplete(aq, m.x, m.y); }
      const z = G.zone;
      if (n < 5) {
        qNextTownPortal(z, n, m.x + 0.5, m.y + 1.8);
        const zid = z.id; setTimeout(() => { if (G.zone && G.zone.id === zid) banner('THE WAY DOWN OPENS', '#c9a45a', 4); }, 3400);
      } else {
        const firstEnd = !P.qst.ended; P.qst.ended = true; save();
        setTimeout(() => { try { qPostGamePortals(z, m.x, m.y + 2); } catch (e) { qErr(e); } if (firstEnd || first) qCredits(); }, 3600);
      }
      save();
    }

    // =========================================================== credits
    const CREDITS = [
      ['THE THOUGHT IS UNTHOUGHT', 'title'],
      ['', ''],
      ["The Stranger: 'So. You walked all the way down, and the god is still dead.", 'v'],
      ["Good. Now it can stop dreaming of the knife.'", 'v'],
      ['', ''],
      ['GODMARROW', 'h'],
      ['the first descent is ended', ''],
      ['', ''],
      ['written in bone, blood and breath by the Scribe and his many hands', ''],
      ['with the Pilgrim-Warden, the Cartographers of Bone-Sand, Mire and Summit,', ''],
      ['the Descent Cartographer, the Openness Warden and the Arcana Weaver', ''],
      ['', ''],
      ['The Scar of Ur-Nihl lies open for those who would walk further.', 'y'],
      ['Click to go on walking.', 'dim']
    ];
    function qCredits() { Q.credits = { t0: performance.now() }; try { closeAll(); } catch (e) { } G.bannerT = 0; G.msgT = 0; G.paused = true; mouse.l = mouse.r = false; mouse.holdMove = false; sfx(98, 3, 'sine', 0.05, 0); }
    function qEndCredits() { if (!Q.credits || performance.now() - Q.credits.t0 < 2500) return false; Q.credits = null; G.paused = false; return true; }
    function qDrawCredits() {
      const k = Math.min(1, (performance.now() - Q.credits.t0) / 900); G.bannerT = 0; G.msgT = 0;
      ctx.fillStyle = `rgba(4,3,6,${0.97 * k})`; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = k;
      let y = 44;
      for (const [s, kind] of CREDITS) {
        if (kind === 'title' || kind === 'h') { ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = kind === 'title' ? '#c9a45a' : '#e8e2d0'; ctx.fillText(s, W / 2, y); y += 18; continue; }
        if (s) txt(s, W / 2, y, kind === 'v' ? '#bfe8ff' : kind === 'y' ? '#d9a441' : kind === 'dim' ? '#6f6a79' : '#a39d8c', 'center', false);
        y += 12;
      }
      ctx.globalAlpha = 1;
    }

    // =========================================================== stash (shared by every pilgrim on this machine)
    const STASH_MAX = 48;
    const stashKey = () => G.saveKey === 'spiritmancer.test' ? 'triune.stash.test' : 'triune.stash.v1';
    function qStashLoad() { try { const s = localStorage.getItem(stashKey()); const a = s ? JSON.parse(s) : []; Q.stash = Array.isArray(a) ? a.filter(it => it && typeof it === 'object') : []; } catch (e) { Q.stash = []; } for (const it of Q.stash) if (it.uid >= itemUid) itemUid = it.uid + 1; }
    function qStashSave() { try { localStorage.setItem(stashKey(), JSON.stringify(Q.stash || [])); } catch (e) { } }
    function qDeposit(entry) {
      if (!Q.stash) qStashLoad();
      if (Q.stash.length >= STASH_MAX) { say('The chest is full', 1.5); return; }
      P.inv.splice(P.inv.indexOf(entry), 1); Q.stash.push(entry.item); qStashSave(); sfx(300, 0.08, 'square', 0.03); save();
    }
    function qWithdraw(i) {
      const it = Q.stash[i]; if (!it) return;
      if (!invAdd(it)) { say('No room in your pack', 1.5); return; }
      Q.stash.splice(i, 1); qStashSave(); sfx(500, 0.08, 'square', 0.03); save();
    }

    // =========================================================== smith's wares
    function qWares() {
      const id = G.zone.id, n = actOf(id);
      if (Q.wares[id] && Q.wares[id].lvl === P.level) return Q.wares[id].items;
      const ilvl = Math.max(P.level, ACT_MLVL[n][0] + 2), items = [];
      for (let i = 0; i < 40 && items.length < 7; i++) { const it = rollItem(ilvl, 60); if (it && !it.potion && it.q !== 'unique') items.push(it); }
      Q.wares[id] = { lvl: P.level, items }; return items;
    }
    const wareCost = it => Math.round(itemValue(it) * 5 + (it.lvl || 1) * 6);

    // =========================================================== panels
    const QCOL = { unique: '#c9a45a', rare: '#f1e05a', magic: '#8b95ff', normal: '#e8e2d0' };
    function qWrap(s, w) { const out = []; let line = ''; for (const wd of s.split(' ')) { const t = line ? line + ' ' + wd : wd; if (tw(t) > w && line) { out.push(line); line = wd; } else line = t; } if (line) out.push(line); return out; }
    function qCloseBtn() { uiButton(LP.x + LP.w - 14, LP.y + 4, 12, 12, qCloseLeft); }
    function qTabs(cur, set) {
      const maxA = Math.max(1, P.qst.act); let x = 14;
      for (let n = 1; n <= maxA; n++) { const w = smallBtn((n === cur ? '> ' : '') + 'Act ' + ROMAN[n], x, 28, () => set(n), true); x += w + 3; }
    }
    function qFitIcon(it, x, y, box) {
      const ic = getIcon(it.potion || BASES[it.base].icon, it.w, it.h), s = Math.min(box / (it.w * CELL), box / (it.h * CELL), 1);
      const w = it.w * CELL * s, h = it.h * CELL * s; ctx.drawImage(ic, Math.round(x + (box - w) / 2), Math.round(y + (box - h) / 2), Math.round(w), Math.round(h));
    }
    function qDrawJournal() {
      panelBox(LP, 'Journal'); qCloseBtn();
      const maxA = Math.max(1, P.qst.act); if (!Q.tab || Q.tab > maxA) Q.tab = Math.min(maxA, actOf(G.zone.id));
      qTabs(Q.tab, n => { Q.tab = n; Q.sel = null; });
      txt(ACT_NAME[Q.tab], 118, 52, '#c9a45a', 'center', false);
      const list = QUESTS.filter(q => q.act === Q.tab);
      let y = 66;
      if (!Q.sel || !list.some(q => q.id === Q.sel)) { const open = list.find(q => qSt(q) && qSt(q).s !== 3); Q.sel = (open || list[0]).id; }
      for (const q of list) {
        const st = qSt(q), sel = Q.sel === q.id;
        if (sel) { ctx.fillStyle = '#2a2430'; ctx.fillRect(10, y - 9, 216, 12); }
        const col = !st ? '#5a5563' : st.s === 3 ? '#7f8f62' : '#e8e2d0';
        txt(st ? q.name : '? ? ?', 16, y, col, 'left', false);
        txt(!st ? 'unheard' : st.s === 3 ? 'fulfilled' : st.s === 2 ? 'opened' : 'open', 222, y, st && st.s === 3 ? '#7f8f62' : '#8a8494', 'right', false);
        uiButton(10, y - 9, 216, 12, () => { Q.sel = q.id; });
        y += 13;
      }
      const q = list.find(x => x.id === Q.sel), st = q && qSt(q);
      ctx.fillStyle = '#3a3446'; ctx.fillRect(14, y - 2, 208, 1);
      y += 10;
      if (!q) return;
      if (!st) { txt('You have not yet heard of this errand.', 16, y, '#6f6a79', 'left', false); return; }
      for (const line of qWrap(qDesc(q), 206).slice(0, 7)) { txt(line, 16, y, '#a39d8c', 'left', false); y += 10; }
      y += 3;
      if (st.z) { txt('Where: ' + zoneName(st.z), 16, y, '#8a8494', 'left', false); y += 10; }
      if (q.kind === 'seal' && st.s < 3) { txt(`${[0, 1, 2].filter(i => (st.n | 0) & (1 << i)).length} of 3 ${q.act === 4 ? 'bells rung' : 'seals pressed'}`, 16, y, '#8a8494', 'left', false); y += 10; }
      for (const line of qWrap('Reward: ' + qRewardText(q.rew), 206)) { if (y > HUD_Y - 6) break; txt(line, 16, y, st.s === 3 ? '#6f6a79' : '#d9a441', 'left', false); y += 10; }
    }
    function qDrawWaypoints() {
      panelBox(LP, 'Waystones'); qCloseBtn();
      const maxA = Math.max(1, P.qst.act); if (!Q.wtab || Q.wtab > maxA) Q.wtab = Math.min(maxA, actOf(G.zone.id));
      qTabs(Q.wtab, n => { Q.wtab = n; });
      txt(ACT_NAME[Q.wtab], 118, 52, '#c9a45a', 'center', false);
      const ids = Object.keys(P.qst.wp).filter(id => actOf(id) === Q.wtab && ZONE_GEN[id]).sort((a, b) => (isTown(b) - isTown(a)) || (isSide(a) - isSide(b)) || zoneName(a).localeCompare(zoneName(b)));
      let y = 62;
      if (!ids.length) txt('No waystone knows you in this act yet.', 16, y + 8, '#6f6a79', 'left', false);
      for (const id of ids) { if (y > HUD_Y - 26) break; smallBtn((isTown(id) ? '* ' : '') + zoneName(id), 16, y, () => qTravel(id), id !== G.zone.id); y += 15; }
      txt('Stand in a waystone and it will learn you.', 16, HUD_Y - 8, '#6f6a79', 'left', false);
    }
    function qDrawStash() {
      if (!Q.stash) qStashLoad();
      panelBox(LP, 'The Reliquary Chest'); qCloseBtn();
      txt('Shared by all your pilgrims.', 118, 36, '#a39d8c', 'center', false);
      const X = 14, Y = 44, S = 26;
      for (let i = 0; i < STASH_MAX; i++) {
        const cx = X + (i % 8) * S, cy = Y + Math.floor(i / 8) * S;
        ctx.fillStyle = (i + Math.floor(i / 8)) % 2 ? '#141117' : '#171319'; ctx.fillRect(cx, cy, S - 2, S - 2);
        const it = Q.stash[i]; if (!it) continue;
        if (it.q && it.q !== 'normal' && it.q !== 'potion') { ctx.fillStyle = it.q === 'unique' ? 'rgba(201,164,90,0.2)' : it.q === 'rare' ? 'rgba(241,224,90,0.16)' : 'rgba(139,149,255,0.18)'; ctx.fillRect(cx, cy, S - 2, S - 2); }
        try { qFitIcon(it, cx + 1, cy + 1, S - 4); } catch (e) { }
        if (inRect(mouse, cx, cy, S - 2, S - 2) && !G.cursorItem) tooltip = itemLines(it).concat([['Click to take it back', '#6f6a79']]);
        uiButton(cx, cy, S - 2, S - 2, () => qWithdraw(i));
      }
      txt(`${Q.stash.length} / ${STASH_MAX}`, 222, Y + 6 * S + 8, '#6f6a79', 'right', false);
      txt('Right-click pack items to store them.', 14, Y + 6 * S + 20, '#6f6a79', 'left', false);
    }
    function qDrawWares() {
      const items = qWares();
      panelBox(LP, Q.smithName || 'The Smith'); qCloseBtn();
      txt('"Iron outlives the hand. Mostly."', 118, 36, '#a39d8c', 'center', false);
      let y = 46;
      items.forEach((it, i) => {
        const cost = wareCost(it);
        ctx.fillStyle = '#1b1920'; ctx.fillRect(10, y, 216, 20);
        try { qFitIcon(it, 12, y + 1, 18); } catch (e) { }
        txt(it.name.length > 26 ? it.name.slice(0, 25) + '.' : it.name, 34, y + 9, QCOL[it.q] || '#e8e2d0', 'left', false);
        txt(`${cost}g`, 222, y + 16, P.gold >= cost ? '#d9a441' : '#6a4a3a', 'right', false);
        if (inRect(mouse, 10, y, 216, 20) && !G.cursorItem) tooltip = itemLines(it).concat([[`Buy for ${cost} gold (click)`, '#d9a441']]);
        uiButton(10, y, 216, 20, () => { if (P.gold < cost) { say('Not enough gold', 1.2); return; } if (!invAdd(it)) { say('No room', 1); return; } P.gold -= cost; items.splice(items.indexOf(it), 1); sfx(1200, 0.06, 'square', 0.03); save(); });
        y += 22;
      });
      txt(`Your gold: ${P.gold}`, 14, HUD_Y - 18, '#d9a441');
      txt('Right-click pack items to sell them.', 14, HUD_Y - 7, '#6f6a79', 'left', false);
    }

    // =========================================================== painted placeholders (Claude paints the real art)
    function qFig(A, ox, oy, robe, hood, eyes) {
      A.ell(ox, oy, 8, 2.5, '#0a0708', { flat: true, contour: false });
      A.poly([[ox - 6, oy], [ox - 5, oy - 18], [ox - 2, oy - 26], [ox + 3, oy - 26], [ox + 5, oy - 16], [ox + 6, oy]], robe, { band: 2 });
      A.ell(ox, oy - 29, 4.5, 5, hood, { band: 2 });
      A.ell(ox - 1, oy - 28, 2.2, 2.8, '#060506', { flat: true, contour: false });
      if (eyes) { A.px(ox - 2, oy - 28, eyes); A.px(ox, oy - 28, eyes); }
      A.limb([[ox - 3, oy - 20], [ox - 8, oy - 16], [ox - 9, oy - 12]], 1.4, 1.1, robe, { tone: 1 });
    }
    if (typeof ZT_OBJP === 'object') Object.assign(ZT_OBJP, {
      qwp(A, ox, oy, lit) {
        A.ell(ox, oy + 1, 14, 5, '#0a0708', { flat: true, contour: false });
        A.poly([[ox - 12, oy - 1], [ox, oy + 5], [ox + 12, oy - 1], [ox, oy - 7]], 'ztStO', { band: 2 });
        A.poly([[ox - 12, oy - 1], [ox, oy + 5], [ox, oy + 8], [ox - 12, oy + 2]], 'ztStO', { tone: -1 });
        A.poly([[ox, oy + 5], [ox + 12, oy - 1], [ox + 12, oy + 2], [ox, oy + 8]], 'ztStO', { tone: -2 });
        A.poly([[ox - 5, oy - 1], [ox - 4, oy - 34], [ox, oy - 41], [ox + 1, oy - 34], [ox + 1, oy + 1]], 'ztStO', { band: 3 });
        A.poly([[ox + 1, oy + 1], [ox + 1, oy - 34], [ox + 4, oy - 35], [ox + 5, oy - 2]], 'ztStO', { tone: -1 });
        for (let k = 0; k < 5; k++) { A.px(ox - 2, oy - 8 - k * 6, lit ? '#e8f8ff' : '#2a2e36'); A.px(ox - 2, oy - 9 - k * 6, lit ? '#a8e0ff' : '#3a3f4a'); A.px(ox - 1, oy - 10 - k * 6, lit ? '#6ab0e0' : '#23262c'); }
      },
      qnpc_healer(A, ox, oy) { qFig(A, ox, oy, 'ztRagW', 'ztRagW', '#e8d8b0'); A.cyl(ox - 9, oy - 12, oy - 17, 0.8, 'ztWax', {}); A.px(ox - 9, oy - 18, '#ffe090'); A.px(ox - 9, oy - 19, '#fff6c8'); },
      qnpc_smith(A, ox, oy) {
        A.poly([[ox + 5, oy], [ox + 5, oy - 6], [ox + 16, oy - 6], [ox + 16, oy]], 'ztIron', { band: 2 }); A.poly([[ox + 3, oy - 6], [ox + 18, oy - 6], [ox + 17, oy - 9], [ox + 4, oy - 9]], 'ztIron', { tone: 1 });
        qFig(A, ox - 2, oy, 'ztCloth', 'ztSkin', null); A.limb([[ox - 5, oy - 20], [ox + 2, oy - 22], [ox + 6, oy - 26]], 1.2, 0.9, 'ztSkin', {}); A.poly([[ox + 4, oy - 30], [ox + 9, oy - 28], [ox + 8, oy - 25], [ox + 3, oy - 27]], 'ztIron', {});
      },
      qnpc_giver(A, ox, oy) { qFig(A, ox, oy, 'ztRobe', 'ztRobe', '#c8b8a0'); A.limb([[ox + 8, oy], [ox + 8, oy - 38], [ox + 6, oy - 41]], 0.8, 0.7, 'ztBark', {}); A.ell(ox + 6, oy - 38, 2.4, 2.8, 'ztBell', {}); },
      qnpc_stranger(A, ox, oy) {
        A.ell(ox, oy, 8, 2.5, '#0a0708', { flat: true, contour: false });
        A.poly([[ox - 7, oy], [ox - 5, oy - 24], [ox - 2, oy - 31], [ox + 3, oy - 31], [ox + 6, oy - 22], [ox + 7, oy]], 'ztCloth', { band: 3 });
        A.ell(ox, oy - 33, 4, 4.5, 'ztCloth', { tone: -1 }); A.ell(ox - 1, oy - 32, 2, 2.6, '#040305', { flat: true, contour: false });
        A.px(ox - 2, oy - 32, '#9fd8ff'); A.px(ox, oy - 32, '#9fd8ff');
        A.ell(ox, oy - 37, 10, 2.4, 'ztWoodD', {}); A.ell(ox, oy - 39, 4.5, 3, 'ztWoodD', { tone: 1 });
        A.limb([[ox + 9, oy], [ox + 9, oy - 30]], 0.7, 0.6, 'ztBark', {});
      },
      qrelic(A, ox, oy) {
        A.ell(ox, oy, 11, 3, '#0a0708', { flat: true, contour: false });
        A.poly([[ox - 9, oy - 1], [ox + 9, oy - 1], [ox + 9, oy - 6], [ox - 9, oy - 6]], 'ztStO', { band: 2 });
        A.poly([[ox - 6, oy - 6], [ox + 6, oy - 6], [ox + 6, oy - 15], [ox - 6, oy - 15]], 'ztGold', { band: 2 });
        A.poly([[ox - 7, oy - 15], [ox + 7, oy - 15], [ox, oy - 21]], 'ztGold', { tone: 1 });
        A.px(ox - 1, oy - 11, '#fff2b0'); A.px(ox, oy - 11, '#ffd070');
      },
      qcaptive(A, ox, oy) {
        A.ell(ox, oy, 10, 3, '#0a0708', { flat: true, contour: false });
        A.ell(ox, oy - 6, 5, 6, 'ztRagW', { band: 2 }); A.ell(ox - 1, oy - 14, 3.2, 3.5, 'ztSkin', {}); A.px(ox - 2, oy - 14, '#1a1012');
        for (let k = -2; k <= 2; k++) A.line(ox + k * 4, oy + 1, ox + k * 4, oy - 26, '#4a4652');
        A.line(ox - 9, oy - 26, ox + 9, oy - 26, '#5a5662'); A.line(ox - 9, oy - 25, ox + 9, oy - 25, '#2a2830');
      },
      qsigil(A, ox, oy, lit) {
        A.ell(ox, oy, 8, 2.5, '#0a0708', { flat: true, contour: false });
        A.poly([[ox - 5, oy], [ox - 4, oy - 20], [ox, oy - 24], [ox + 4, oy - 20], [ox + 5, oy]], 'ztSt', { band: 2 });
        const c = lit ? '#ffcf70' : '#2c2a30'; A.px(ox - 1, oy - 14, c); A.px(ox, oy - 13, c); A.px(ox - 2, oy - 12, c); A.px(ox, oy - 11, c); A.px(ox - 1, oy - 10, c);
      }
    });
    function qPaintKind(o) {
      if (o.q === 'wp') return ['qwp', P.qst && P.qst.wp[G.zone.id] ? 1 : 0];
      if (o.q === 'npc') return o.role === 'stash' ? ['chest', 0] : ['qnpc_' + o.role, 0];
      if (o.q === 'relic') return ['qrelic', 0];
      if (o.q === 'shrine') return ['shrine', o.used ? 1 : 0];
      if (o.q === 'captive') return ['qcaptive', 0];
      if (o.q === 'sigil') return ['qsigil', o.lit ? 1 : 0];
      return null;
    }
    if (typeof ztObjSprite === 'function') {
      const _zos = ztObjSprite;
      ztObjSprite = function (o) {
        if (o && o.type === 'qobj') { const k = qPaintKind(o); if (!k || !ZT_OBJP[k[0]]) return null; try { return ztSprite(k[0] + (k[1] ? 1 : 0), ztObjFrame(k[0], k[1])); } catch (e) { return null; } }
        return _zos.apply(this, arguments);
      };
    }

    // =========================================================== wrappers
    Object.assign(G.panels, { qlog: false, qwp: false, qstash: false, qwares: false });
    { const _nc = newCharacter; newCharacter = function () { const r = _nc.apply(this, arguments); P.qst = qFresh(); return r; }; }
    { const _tc = testCharacter; testCharacter = function () { const r = _tc.apply(this, arguments); try { P.qst = qFresh(); qKindleAll(); } catch (e) { qErr(e); } return r; }; }
    { const _as = applySave; applySave = function (d) { const r = _as.apply(this, arguments); P.qst = qLoad(d && d.qst, d); return r; }; }
    { const _sv = save; save = function () { const r = _sv.apply(this, arguments); try { if (G.saveKey && P.qst) { const s = localStorage.getItem(G.saveKey); if (s) { const d = JSON.parse(s); d.qst = P.qst; localStorage.setItem(G.saveKey, JSON.stringify(d)); } } } catch (e) { } return r; }; }
    { const _sg = startGame; startGame = function (mode) { Q.haz = []; Q.wave = null; Q.wares = {}; Q.credits = null; Q.stash = null; const r = _sg.apply(this, arguments); try { if (!P.qst) P.qst = qFresh(); if (mode === 'continue' && P.qst.act > 1) qGoTown(P.qst.act); } catch (e) { qErr(e); } return r; }; }
    { const _ez = enterZone; enterZone = function (id, pos, li) {
        try { if (!P.qst) P.qst = qFresh(); qEnsureZone(id); } catch (e) { qErr(e); }
        const r = _ez.apply(this, arguments);
        try {
          Q.haz = []; if (Q.wave && Q.wave.z !== id) Q.wave = null; Q.wpNear = false;
          const n = actOf(id); if (n > P.qst.act && !isSide(id)) P.qst.act = n;
          qActivate(n);
          if (isTown(id)) { qDiscoverWp(G.zone); if (!P.qst.seen['t' + n]) { P.qst.seen['t' + n] = 1; const g = TOWN[n] && TOWN[n].greet; if (g) setTimeout(() => say(g, 6), 2400); } }
        } catch (e) { qErr(e); }
        return r;
      }; }
    { const _ik = interact; interact = function (o) { if (o && o.type === 'qobj') { try { qInteract(o); } catch (e) { qErr(e); } return; } if (o && o.type === 'vendor') Q.vendorName = o.qname || null; if (o && o.type === 'vendor') qCloseLeft(); return _ik.apply(this, arguments); }; }
    { const _km = killMon; killMon = function (m) { const was = m && m.dead; const r = _km.apply(this, arguments); try { if (m && !was && m.dead) qOnKill(m); } catch (e) { qErr(e); } return r; }; }
    { const _ub = updateBoss; updateBoss = function (m, dt) { if (m && m.qb && QB[m.qb]) { try { qBossUpdate(m, dt); } catch (e) { qErr(e); m.state = 'chase'; } return; } return _ub.apply(this, arguments); }; }
    { const _cb = checkBossRoom; checkBossRoom = function () { const z = G.zone; if (z && z.qLair) { try { qCheckLair(z); } catch (e) { qErr(e); } return; } return _cb.apply(this, arguments); }; }
    { const _hp = hurtPlayer; hurtPlayer = function () { if (qSafeHere()) return; return _hp.apply(this, arguments); }; }
    { const _dv = derive; derive = function () { const d = _dv.apply(this, arguments); try { const q = P.qst; if (q && d) { if (q.res) { d.res = (d.res || 0) + q.res; if (d.resists) for (const k in d.resists) if (k !== 'phys') d.resists[k] = (d.resists[k] || 0) + q.res; } if (q.life) d.maxHp += q.life; } } catch (e) { } return d; }; }
    { const _up = update; update = function (dt) { const r = _up.apply(this, arguments); try { qTick(dt); } catch (e) { qErr(e); } return r; }; }
    { const _ds = drawScars; drawScars = function () { const r = _ds.apply(this, arguments); try { qGroundDraw(); } catch (e) { qErr(e); } return r; }; }
    { const _dm = drawMon16; drawMon16 = function (m, flash, alpha) {
        const k = m && m.qScale; if (!k || k === 1) return _dm.apply(this, arguments);
        const p = iso(m.x, m.y); ctx.save(); ctx.translate(p.sx, p.sy); ctx.scale(k, k); ctx.translate(-p.sx, -p.sy);
        let r; try { r = _dm.apply(this, arguments); } finally { ctx.restore(); }
        return r ? { x: p.sx + (r.x - p.sx) * k, y: p.sy + (r.y - p.sy) * k, w: r.w * k, h: r.h * k } : r;
      }; }
    { const _pb = panelBox; panelBox = function (p, title) { if (title === 'Maren the Gravekeeper' && Q.vendorName && G.panels.vendor) title = Q.vendorName; return _pb.call(this, p, title); }; }
    { const _ub2 = uiBlocksMouse; uiBlocksMouse = function () { if (Q.credits) return true; if (qLeftOpen() && mouse.x < LP.w && mouse.y < HUD_Y) return true; return _ub2.apply(this, arguments); }; }
    { const _gc = gridClick; gridClick = function (right) {
        if (right && G.panels.qstash && !G.cursorItem) { const cx = Math.floor((mouse.x - GRID.x) / CELL), cy = Math.floor((mouse.y - GRID.y) / CELL); const at = P.inv.find(e => cx >= e.x && cx < e.x + e.item.w && cy >= e.y && cy < e.y + e.item.h); if (at) { qDeposit(at); return; } }
        if (right && G.panels.qwares && !G.cursorItem) { const cx = Math.floor((mouse.x - GRID.x) / CELL), cy = Math.floor((mouse.y - GRID.y) / CELL); const at = P.inv.find(e => cx >= e.x && cx < e.x + e.item.w && cy >= e.y && cy < e.y + e.item.h); if (at) { P.gold += itemValue(at.item); P.inv.splice(P.inv.indexOf(at), 1); sfx(1200, 0.08, 'square', 0.03); return; } }
        return _gc.apply(this, arguments);
      }; }
    { const _dl = drawLantern; drawLantern = function () {
        // the lantern list keeps to the act you stand in; the waypoints carry you between acts
        const all = P.found, n = actOf(G.zone.id); P.found = all.filter(k => actOf(k.split(':')[0]) === n);
        try { return _dl.apply(this, arguments); } finally { P.found = all; txt('Waypoints carry you between the acts.', 14, HUD_Y - 8, '#6f6a79', 'left', false); }
      }; }
    { const _sd = drawTouchUI; drawTouchUI = function () {
        // drawn just before the tooltip pass (zz_polish replaces drawSkyDial outright, so the touch pass is the hook)
        const r = _sd.apply(this, arguments);
        try {
          if (G.running && G.zone && P.qst) {
            if (leftOpen()) qCloseLeft();
            if (G.panels.qlog) qDrawJournal(); else if (G.panels.qwp) qDrawWaypoints(); else if (G.panels.qstash) qDrawStash(); else if (G.panels.qwares) qDrawWares();
          }
        } catch (e) { qErr(e); }
        return r;
      }; }
    if (typeof light14 === 'function') { const _l14 = light14; light14 = function () {
        const r = _l14.apply(this, arguments);
        try {
          const z = G.zone; if (z && P.qst) {
            const b = z.boss; if (b && b.qb && !b.dead && G.bossFight) { const p = iso(b.x, b.y), k = b.qScale || 1; addLight(p.sx, p.sy - 14 * k, 70 * k, '215,205,255', 0.55); }
            for (const o of z.objects) if (o.type === 'qobj' && (o.q === 'wp' || o.q === 'relic' || o.q === 'captive' || o.q === 'sigil' || o.q === 'npc')) { const p = iso(o.x, o.y); if (p.sx > -100 && p.sx < W + 100 && p.sy > -100 && p.sy < H + 100) lightHole(p.sx, p.sy - 10, o.q === 'npc' ? 40 : 50, 0.6); }
          }
        } catch (e) { qErr(e); }
        return r;
      }; }
    { const _ra = renderAll; renderAll = function () { const r = _ra.apply(this, arguments); try { if (Q.credits) qDrawCredits(); } catch (e) { qErr(e); } return r; }; }

    function qTick(dt) {
      const z = G.zone; if (!z || !G.running || !P.qst) return;
      qHazTick(dt);
      if (!P.dead) for (const o of z.objects) if (o.q === 'wp') {
        const d = Math.hypot(o.x - P.x, o.y - P.y);
        if (d < 3.2) qDiscoverWp(z);
        if (d < 1.1) { if (!Q.wpNear) { Q.wpNear = true; Q.wtab = actOf(z.id); qOpen('qwp'); } } else if (d > 2.4) Q.wpNear = false;
      }
      Q.t -= dt;
      if (Q.t <= 0) { Q.t = 0.25; qSafeSweep(z); qWaveCheck(z); }
    }
    function qGroundDraw() {
      const z = G.zone; if (!z || !P.qst) return;
      for (const o of z.objects) {
        if (o.type !== 'qobj') continue;
        if (o.q === 'wp') { /* v95: the waystone is a maw: no glow */ }
        else if (o.q === 'relic' || o.q === 'captive' || (o.q === 'sigil' && !o.lit) || (o.q === 'shrine' && !o.used)) { const p = iso(o.x, o.y); ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 8, 14, '217,164,65', 0.2 + 0.08 * Math.sin(G.time * 3)); ctx.globalCompositeOperation = 'source-over'; }
      }
      qHazDraw();
    }

    // input: J opens the journal; any key or click after the credits have settled goes on walking
    addEventListener('keydown', e => {
      if (Q.credits) { if (e.key !== 'Escape') qEndCredits(); return; }
      if (!G.running || G.paused || G.divine || e.repeat) return;
      if (e.key === 'j' || e.key === 'J') { if (G.panels.qlog) qCloseLeft(); else { Q.tab = Math.min(Math.max(1, P.qst ? P.qst.act : 1), actOf(G.zone && G.zone.id)); Q.sel = null; qOpen('qlog'); } }
    });
    cv.addEventListener('mousedown', () => { if (Q.credits) qEndCredits(); });

    // test and tooling hooks
    try {
      window.__spm.q = { qKindleAll, Q, QUESTS, QB, ZONE_GEN, TOWN, actOf, townOf, lairOf, qEnsureZone, qEnsureAct, qTravel, qGoTown, qOpen, qComplete: (id) => qComplete(qById(id)), qActivate, kill: m => killMon(m), state: () => P.qst, credits: qCredits, endCredits: () => { if (Q.credits) Q.credits.t0 = -1e9; return qEndCredits(); }, stashLoad: qStashLoad, deposit: qDeposit, withdraw: qWithdraw, wares: qWares, interact: o => interact(o), save: () => save(), enter: (id, pos, li) => enterZone(id, pos, li), start: mode => startGame(mode), portal: o => usePortal(o), hurt: (d) => hurtPlayer(d, 'phys', P.x + 1, P.y) };
    } catch (e) { }
  }
}
