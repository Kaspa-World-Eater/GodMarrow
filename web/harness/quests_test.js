// Pilgrim-Warden test: acts, bosses, towns, waypoints, quests, save/load. HTML=/tmp/quests.html node quests_test.js
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const OUT = process.env.OUT || '/tmp/qshots'; fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.env.HTML);
  process.on('exit', () => { for (const x of res) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 10).join('\n') : 'none'); });
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  const shot = async name => { await p.screenshot({ path: `${OUT}/${name}.png` }); };
  const calm = () => ev(() => { const S = window.__spm; S.G.zone.monsters.forEach(m => { if (!m.qb && Math.hypot(m.x - S.P.x, m.y - S.P.y) < 14) { m.state = 'idle'; } }); });
  await wait(500);
  // ---- new character
  await ev(() => { localStorage.removeItem('spiritmancer.save.v2'); localStorage.removeItem('triune.stash.v1'); const S = window.__spm; S.G.pickCls = 'animancer'; S.q.start('new'); });
  await wait(800);
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; });
  const a1 = await ev(() => { const S = window.__spm, z = S.G.zone, st = S.q.state(); const roles = z.objects.filter(o => o.type === 'qobj' && o.q === 'npc').map(o => o.role); return { zone: z.id, roles, wp: z.objects.some(o => o.q === 'wp'), vendor: z.objects.some(o => o.type === 'vendor'), act: st.act, quests: Object.keys(st.q), wps: Object.keys(st.wp), safe: !!z.qSafeC, zones: Object.keys(S.q.ZONE_GEN).length }; });
  check('Act I camp has healer, stash, smith, giver, Stranger, waypoint, vendor', ['healer', 'stash', 'smith', 'giver', 'stranger'].every(r => a1.roles.includes(r)) && a1.wp && a1.vendor, a1);
  check('Act I errands open from the start', a1.quests.filter(x => x.startsWith('a1_')).length >= 5, a1.quests);
  // camp is safe
  const safe = await ev(() => { const S = window.__spm, P = S.P, c = S.G.zone.qSafeC; P.x = c.x; P.y = c.y; const h0 = P.hp; P.iframe = 0; S.q.hurt(50); return { h0, h1: P.hp }; });
  check('the camp is a safe place (no damage)', safe.h0 === safe.h1, safe);
  // walk the player next to NPCs for a camp screenshot
  await ev(() => { const S = window.__spm, z = S.G.zone, g = z.objects.find(o => o.role === 'giver'); S.P.x = g.x + 1.5; S.P.y = g.y + 1.5; });
  await wait(900);
  await shot('q_town_act1');
  // journal
  await p.keyboard.press('j'); await wait(400);
  const jOpen = await ev(() => window.__spm.G.panels.qlog);
  check('J opens the journal', jOpen);
  await shot('q_journal');
  await p.keyboard.press('j'); await wait(200);
  // ---- Act I quest: kill the Tallow-Mother (named unique placed in her zone)
  const hesk = await ev(() => { const S = window.__spm, st = S.q.state().q.a1_hesk; const z = S.q.qEnsureZone(st.z); S.q.enter(st.z); const u = S.G.zone.monsters.find(m => m.qid === 'a1_hesk'); if (!u) return { zone: st.z, u: false }; const sp0 = S.P.statPts; S.q.kill(u); return { zone: st.z, name: u.name, s: st.s, res: S.q.state().res }; });
  check('Act I: killing the Tallow-Mother fulfils her errand (+5% res)', hesk.s === 3 && hesk.res === 5, hesk);
  // relic
  const ink = await ev(() => { const S = window.__spm, st = S.q.state().q.a1_ink; S.q.enter(st.z); const o = S.G.zone.objects.find(o => o.q === 'relic'); if (!o) return { zone: st.z, o: false }; S.q.interact(o); return { zone: st.z, s: st.s, items: S.G.zone.items.length }; });
  check('Act I: taking the Reader\'s Book fulfils its errand and drops a relic', ink.s === 3 && ink.items > 0, ink);
  // shrine: two waves, then fulfilled
  const shr = await ev(() => { const S = window.__spm, st = S.q.state().q.a1_lantern; S.q.enter(st.z); S.P.iframe = 1e5; const o = S.G.zone.objects.find(o => o.q === 'shrine' && o.qid === 'a1_lantern'); if (!o) return { zone: st.z, o: false }; S.P.x = o.x; S.P.y = o.y + 1; S.q.interact(o); const w1 = S.G.zone.monsters.filter(m => m.qwave === 'a1_lantern' && !m.dead); w1.forEach(m => S.q.kill(m)); return { zone: st.z, w1: w1.length }; });
  await wait(700);
  const shr2 = await ev(() => { const S = window.__spm, w2 = S.G.zone.monsters.filter(m => m.qwave === 'a1_lantern' && !m.dead); w2.forEach(m => S.q.kill(m)); return w2.length; });
  await wait(700);
  const shr3 = await ev(() => window.__spm.q.state().q.a1_lantern.s);
  check('Act I: the Sighing Lantern holds through two waves and is cleansed', shr.w1 > 0 && shr2 > 0 && shr3 === 3, { shr, shr2, shr3 });
  // captive: keepers first
  const cap = await ev(() => { const S = window.__spm, st = S.q.state().q.a1_daughter; S.q.enter(st.z); const z = S.G.zone, o = z.objects.find(o => o.q === 'captive'); if (!o) return { zone: st.z, o: false }; S.q.interact(o); const early = st.s; z.monsters.filter(m => m.qguard === 'a1_daughter').forEach(m => S.q.kill(m)); S.q.interact(o); return { zone: st.z, early, s: st.s }; });
  check('Act I: Nell is freed only after her keepers fall', cap.early === 1 && cap.s === 3, cap);
  await wait(300);
  // ---- Act I final boss: the Matron in cata2 → portal to a2_town
  const m1 = await ev(() => { const S = window.__spm; S.q.enter('cata2'); const z = S.G.zone, b = z.boss; if (!b) return { boss: false }; S.P.x = b.x; S.P.y = b.y + 2; S.q.kill(b); const pt = z.objects.find(o => o.type === 'portal' && o.to === 'a2_town'); return { boss: b.name, dead: b.dead, portal: !!pt, act: S.q.state().act, a2gen: !!S.q.ZONE_GEN.a2_town }; });
  check('Act I boss death opens a way to a2_town', m1.dead && m1.portal && m1.act === 2, m1);
  await wait(3800);
  await calm();
  const t2 = await ev(() => { const S = window.__spm, z = S.G.zone, pt = z.objects.find(o => o.type === 'portal' && o.to === 'a2_town'); S.q.portal(pt); const t = S.G.zone; return { zone: t.id, name: t.name, safe: !!t.qSafe, mons: t.monsters.length, roles: t.objects.filter(o => o.q === 'npc').map(o => o.role), vendor: t.objects.some(o => o.type === 'vendor'), wp: !!S.q.state().wp.a2_town, quests: Object.keys(S.q.state().q).filter(k => k.startsWith('a2_')), fb: !!S.q.Q.fbTown[2] }; });
  check('the portal carries you to the Act II town: safe, no monsters, NPCs, waypoint kindled', t2.zone === 'a2_town' && t2.safe && t2.mons === 0 && t2.roles.length >= 5 && t2.vendor && t2.wp, t2);
  check('Act II errands open on arrival', t2.quests.length >= 5, t2.quests);
  await wait(600);
  await shot('q_town_act2');
  // ---- waypoint panel + travel
  const wpo = await ev(() => { const S = window.__spm, z = S.G.zone, o = z.objects.find(o => o.q === 'wp'); S.P.x = o.x; S.P.y = o.y + 0.3; return true; });
  await wait(600);
  const wpPanel = await ev(() => window.__spm.G.panels.qwp);
  check('walking onto the waypoint opens the waypoint panel', wpPanel);
  await ev(() => { const S = window.__spm; for (const id of ['hollow_wood','fen','crypt','cata1','cata2','sighing_ridge','drowned_village']) { if (S.q.ZONE_GEN[id]) { S.q.state().wp[id] = 1; } } S.q.Q.wtab = 1; }); await wait(300);
  await shot('q_waypoints');
  const trav = await ev(() => { const S = window.__spm; S.q.qTravel('moor'); return { zone: S.G.zone.id, near: S.G.zone.objects.some(o => o.q === 'wp' && Math.hypot(o.x - S.P.x, o.y - S.P.y) < 2) }; });
  check('waypoint travel to the Moor lands at its waypoint', trav.zone === 'moor' && trav.near, trav);
  await ev(() => { window.__spm.q.qTravel('a2_town'); });
  // sealed way: three seals open a vault; its guardian ends the errand
  const seal = await ev(() => { const S = window.__spm, st = S.q.state().q.a2_seals; S.q.enter(st.z); const z = S.G.zone, sg = z.objects.filter(o => o.q === 'sigil'); sg.forEach(o => S.q.interact(o)); const pt = z.objects.find(o => o.type === 'portal' && o.to === 'qvault_2'); if (!pt) return { zone: st.z, n: sg.length, s: st.s, portal: false }; S.q.portal(pt); const v = S.G.zone, g = v.monsters.find(m => m.qvault === 'a2_seals'); const back = v.objects.find(o => o.type === 'portal'); if (g) S.q.kill(g); return { zone: st.z, n: sg.length, vault: v.id, name: v.name, guard: g && g.name, back: back && back.to, s: st.s }; });
  check('Act II: three knuckle-seals open the Ossified Vault; its guardian ends the errand', seal.n === 3 && seal.vault === 'qvault_2' && seal.s === 3 && seal.back === seal.zone, seal);
  await wait(2400);
  await ev(() => { window.__spm.q.qTravel('a2_town'); });
  // ---- one errand per act II-V completes and pays; each lair boss runs its stages; each death opens the next town
  for (const n of [2, 3, 4, 5]) {
    const r = await ev(n => {
      const S = window.__spm, st = S.q.state();
      S.q.qActivate(n);
      const qs = S.q.QUESTS.filter(q => q.act === n && q.kind !== 'actboss');
      const q = qs.find(q => q.kind === 'kill' || q.kind === 'relic') || qs[0], e = st.q[q.id];
      S.q.enter(e.z); const z = S.G.zone;
      const before = { gold: S.P.gold, sk: S.P.skillPts, sp: S.P.statPts, arc: S.P.arc.pts, life: st.life, res: st.res };
      if (q.kind === 'kill') { const u = z.monsters.find(m => m.qid === q.id); if (u) S.q.kill(u); }
      else if (q.kind === 'relic') { const o = z.objects.find(o => o.qid === q.id); if (o) S.q.interact(o); }
      return { q: q.id, kind: q.kind, zone: e.z, s: e.s, before, after: { gold: S.P.gold, sk: S.P.skillPts, sp: S.P.statPts, life: st.life, res: st.res } };
    }, n);
    check(`Act ${n}: errand "${r.q}" (${r.kind} in ${r.zone}) completes and pays`, r.s === 3 && (r.after.sk > r.before.sk || r.after.sp > r.before.sp || r.after.life > r.before.life || r.after.res > r.before.res || r.kind === 'relic'), r);
    await wait(2500);
    const bz = await ev(n => {
      const S = window.__spm; S.q.enter('a' + n + '_lair'); const z = S.G.zone, b = z.boss;
      if (!b) return { boss: false };
      S.P.iframe = 1e5;
      const s = z.bossSpot; S.P.x = s.x; S.P.y = s.y + 5; return { boss: b.name, qb: b.qb, lvl: b.mlvl, hp: Math.round(b.max), scale: b.qScale, fb: !!S.q.Q.fbLair[n] };
    }, n);
    check(`Act ${n}: the lair boss stands at the boss spot`, bz.qb, bz);
    await wait(700);
    const fight = await ev(() => { const S = window.__spm; return { fight: S.G.bossFight }; });
    // push through the stages
    const stages = [];
    for (const f of [0.69, 0.44, 0.29, 0.14]) {
      await ev(f => { const S = window.__spm, b = S.G.zone.boss; b.hp = b.max * f; S.P.hp = 1e6; }, f);
      await wait(1300);
      stages.push(await ev(() => { const S = window.__spm, b = S.G.zone.boss, z = S.G.zone; if (!b) return { zone: z.id, dead: S.P.dead }; return { st: b.qstage, adds: z.monsters.filter(m => m.qadd && !m.dead).length, haz: S.q.Q.haz.length }; }));
    }
    check(`Act ${n}: the fight starts near the boss and its stages fire (adds, hazards)`, fight.fight && stages[stages.length - 1].st >= 2 && stages.some(s => s.adds > 0 || s.haz > 0), { fight, stages });
    await ev(() => { const S = window.__spm, b = S.G.zone.boss; if (b) b.hp = b.max * 0.5; });
    await wait(900);
    await shot('q_boss_act' + n);
    const dead = await ev(n => { const S = window.__spm, z = S.G.zone, b = z.boss; S.q.kill(b); return { dead: b.dead, act: S.q.state().act, portal: n < 5 ? !!z.objects.find(o => o.type === 'portal' && o.to === 'a' + (n + 1) + '_town') : null, ended: S.q.state().ended, done: S.q.state().q['a' + n + '_' + ({ 2: 'saint', 3: 'brood', 4: 'abbot', 5: 'slayer' })[n]] }; }, n);
    check(`Act ${n}: boss death ${n < 5 ? 'opens the way to Act ' + (n + 1) : 'ends playthrough 1'}`, dead.dead && (n < 5 ? dead.portal && dead.act === n + 1 : dead.ended), dead);
    if (n < 5) { await ev(n => { const S = window.__spm, pt = S.G.zone.objects.find(o => o.type === 'portal' && o.to === 'a' + (n + 1) + '_town'); S.q.portal(pt); }, n); await wait(400); const tn = await ev(() => ({ id: window.__spm.G.zone.id, safe: !!window.__spm.G.zone.qSafe, npcs: window.__spm.G.zone.objects.filter(o => o.q === 'npc').length })); check(`Act ${n + 1} town reached through the boss portal`, tn.id === 'a' + (n + 1) + '_town' && tn.safe && tn.npcs >= 5, tn); }
  }
  await wait(4200);
  const cr = await ev(() => !!window.__spm.q.Q.credits);
  check('the closing sequence plays after the last boss', cr);
  await shot('q_credits');
  await ev(() => window.__spm.q.endCredits());
  await wait(300);
  const post = await ev(() => { const S = window.__spm, z = S.G.zone; return { paused: S.G.paused, portals: z.objects.filter(o => o.type === 'portal').map(o => o.to) }; });
  check('after the credits you can keep playing', !post.paused && post.portals.includes('a5_town'), post);
  // ---- stash: deposit + withdraw
  const stash = await ev(() => { const S = window.__spm, P = S.P; const it = S.rollItem(10, 100); const ok = S.q.Q; P.inv = []; const e = { item: it, x: 0, y: 0 }; P.inv.push(e); S.q.stashLoad(); S.q.deposit(e); const n1 = S.q.Q.stash.length, inv1 = P.inv.length; const raw = JSON.parse(localStorage.getItem('triune.stash.v1') || '[]').length; S.q.withdraw(0); return { n1, inv1, raw, n2: S.q.Q.stash.length, inv2: P.inv.length }; });
  check('the shared stash takes and gives back an item (persisted)', stash.n1 === 1 && stash.inv1 === 0 && stash.raw === 1 && stash.n2 === 0 && stash.inv2 === 1, stash);
  // ---- save/load round-trip
  const sv = await ev(() => { const S = window.__spm; S.q.save(); const d = JSON.parse(localStorage.getItem('spiritmancer.save.v2')); return { hasQ: !!d.qst, act: d.qst.act, wps: Object.keys(d.qst.wp).length, done: Object.values(d.qst.q).filter(e => e.s === 3).length, res: d.qst.res }; });
  await ev(() => { const S = window.__spm; S.G.running = false; S.q.start('continue'); });
  await wait(800);
  const ld = await ev(() => { const S = window.__spm, st = S.q.state(); return { zone: S.G.zone.id, act: st.act, wps: Object.keys(st.wp).length, done: Object.values(st.q).filter(e => e.s === 3).length, res: st.res, ended: st.ended }; });
  check('save/load keeps act, waypoints, errands and rewards; continue starts in the furthest town', sv.hasQ && ld.act === sv.act && ld.wps >= sv.wps && ld.done === sv.done && ld.res === sv.res && ld.zone === 'a5_town', { sv, ld });
  // ---- an old save (no qst) still loads
  const old = await ev(() => { const S = window.__spm; const d = JSON.parse(localStorage.getItem('spiritmancer.save.v2')); delete d.qst; d.done = ['boss:cata2']; localStorage.setItem('spiritmancer.save.v2', JSON.stringify(d)); S.G.running = false; S.q.start('continue'); const st = S.q.state(); return { act: st.act, zone: S.G.zone.id }; });
  check('an old save without errand data loads (and a felled Matron opens Act II)', old.act === 2 && old.zone === 'a2_town', old);
  const gerr = await ev(() => window.__spm.G.error || null);
  console.log('G.error', gerr);
  await b.close();
})();
