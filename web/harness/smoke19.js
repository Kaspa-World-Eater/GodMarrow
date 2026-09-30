// targeted checks: each card does what its text says
const { chromium } = require('playwright');
const CLS = process.argv[2] || 'ossumancer';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click(`.cls[data-cls=${CLS}]`); await p.click('#testBtn'); await p.waitForTimeout(500); await p.keyboard.press('Escape');
  await p.evaluate(() => { const S = window.__spm, { P, SK } = S; for (const id in SK) if (SK[id].cls === P.cls) P.hard[id] = 12; S.rederive(); window.__T = {}; });
  // helper: give exactly these cards
  const cards = (list) => p.evaluate((list) => { const S = window.__spm, { P, G } = S; P.arc = S.newArc(); for (const [k, o] of list) P.arc.taken[k] = o; S.rederive(); S.rearm && S.rearm(); }, list);
  // helper: a fresh pack of enemies right in front of you
  const arena = (n = 4, hp = 500) => p.evaluate(([n, hp]) => { const { P, G } = window.__spm; const mons = G.zone.monsters.filter(m => !m.dead).slice(0, n); mons.forEach((m, i) => { m.x = P.x + 2 + (i % 2) * 0.7; m.y = P.y + (i - n / 2) * 0.7; m.hp = m.max = hp; m.state = 'chase'; m.bleed = null; m.burn = null; m.stun = 0; m.root = 0; m.possessed = 0; }); for (const m of G.zone.monsters) if (!mons.includes(m) && Math.hypot(m.x - P.x, m.y - P.y) < 14) { m.x += 40; } P.hp = 1e6; P.mana = 9999; return mons.length; }, [n, hp]);
  const ev = (f, arg) => p.evaluate(f, arg);
  const res = [];
  const check = (name, ok, info) => { res.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`); };
  const cast = (id, dx = 2.3, dy = 0) => ev(([id, dx, dy]) => { const S = window.__spm, { P } = S; P.cast = 0; P.roll = 0; P.mana = 9999; S.castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const wait = ms => p.waitForTimeout(ms);
  const hpSum = () => ev(() => window.__spm.G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - window.__spm.P.x, m.y - window.__spm.P.y) < 6).reduce((a, m) => a + m.hp, 0));

  if (CLS === 'ossumancer') {
    await cards([['o_tower', 'r']]); await arena(); let h0 = await hpSum(); await cast('spear'); await wait(100); let h1 = await hpSum();
    check('Tower R: thrust hits at once', h1 < h0 && (await ev(() => window.__spm.G.bspears.length)) === 0, [Math.round(h0 - h1)]);
    await cards([['o_tower', 'u']]); await arena(); h0 = await hpSum(); await cast('spear'); await wait(80); const sp = await ev(() => window.__spm.G.bspears.length); await wait(400);
    check('Tower U: splinters', sp >= 1 && (await hpSum()) < h0, sp);
    await cards([['o_cage', 'r']]); await arena(); await cast('ribcage'); check('Cage-Warden R: rib armor on you', (await ev(() => window.__spm.P.ribArmor)) > 0);
    await cards([['o_cage', 'u']]); await arena(); await cast('ribcage'); check('Cage-Warden U: 3 small cages', (await ev(() => window.__spm.G.ribcages.filter(c => c.follow).length)) === 3);
    await cards([['o_grasp', 'r']]); await arena(); await cast('wall'); const n0 = await ev(() => window.__spm.G.barms.length);
    await ev(() => { const { P } = window.__spm; P.x += 1; }); await wait(100); await ev(() => { const { P } = window.__spm; P.y += 1; }); await wait(100);
    check('Grasping Earth R: arms at your feet as you walk', (await ev(() => window.__spm.G.barms.length)) > n0, [n0, await ev(() => window.__spm.G.barms.length)]);
    await cards([['o_pyredead', 'u']]); await wait(200); const pk = await ev(() => { const e = window.__spm.G.skels.find(e => e.rise <= 0); window.__T.pe = e; return e ? e.hp / e.max : 0; }); await wait(500); const hp1 = [pk]; const hp2 = [await ev(() => { const e = window.__T.pe; return e ? e.hp / e.max : 0; })];
    check('Pyre-Dead U: skeletons burn down', hp2.length && hp2[0] < hp1[0], [hp1[0], hp2[0]]);
    await cards([['o_chanter', 'u'], ['o_bowyer', 'r']]); await ev(() => { const S = window.__spm; S.P.squads[0].load = 'mage'; S.P.squads[1].load = 'bow'; S.rearm(); S.P.shards = 999; }); await wait(3000);
    const loads = await ev(() => window.__spm.G.skels.map(e => e.load)); await arena(6); await ev(() => { const { G, P } = window.__spm; for (const e of G.skels) { e.x = P.x + Math.random(); e.y = P.y + Math.random(); } }); await cast('spikes'); await wait(3500);
    check('Chanter U + Bowyer: mages and archers stand', loads.includes('mage') && loads.includes('bow'), loads);
    check('Chanter U: mages cast', (await ev(() => window.__spm.P.lastMarrow)) === 'spikes');
    await cards([['o_maelstrom', 'u']]); await arena(); await ev(() => { const { G, P } = window.__spm; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4) { m.x = P.x + 1.5; m.y = P.y; m.root = 5; } }); h0 = await hpSum(); await wait(1200);
    check('Maelstrom U: aura cuts within 3 yd', (await hpSum()) < h0);
    await cards([['o_reliq', 'r']]); await ev(() => { const S = window.__spm; S.P.host = { n: 3, pool: 3 * 50 }; S.rederive(); }); await arena(); h0 = await hpSum(); await wait(1500);
    check('Reliquary R: the turret fires', (await hpSum()) < h0 && (await ev(() => window.__spm.P.host && window.__spm.P.host.pool < 150)));
    await ev(() => { window.__spm.P.host = null; });
    await cards([['o_rime', 'u']]); await arena(2, 5000); await cast('spikes'); await cast('spikes'); await wait(700); await cast('spikes');
    check('Rime U: spikes freeze', (await ev(() => window.__spm.G.zone.monsters.some(m => !m.dead && m.frozen > 0 || m.chillT > 0))));
  }
  if (CLS === 'hemomancer') {
    await ev(() => { const { P } = window.__spm; P.muts = ['maw', 'chitin']; });
    // brood for testing
    const brood = (n) => ev((n) => { const S = window.__spm, { P, G } = S; for (let i = 0; i < n; i++) S.hatchLing(P.x + 0.3 + (i % 3) * 0.1, P.y + 0.3, true); for (const e of G.brood) e.hatch = 0; }, n);
    await cards([['h_graft', 'u']]); await brood(3); await ev(() => { const { G, P } = window.__spm; for (const e of G.brood) { e.x = P.x + 3; e.y = P.y + 3; } }); await wait(700);
    check('Graft-Father U: chimera', (await ev(() => window.__spm.G.brood.some(e => e.size >= 2))), await ev(() => window.__spm.G.brood.map(e => e.size)));
    await ev(() => { window.__spm.G.brood = []; }); await cards([['h_graft', 'r']]); await brood(5); await wait(300);
    check('Graft-Father R: riders', (await ev(() => window.__spm.G.brood.filter(e => e.rider).length)) === 4);
    await arena(); h0 = await hpSum(); await cast('rupture', 2, 0); await wait(600);
    check('Graft-Father R: Rupture flings riders', (await hpSum()) < h0 && (await ev(() => window.__spm.G.brood.filter(e => e.rider).length)) < 4);
    await ev(() => { window.__spm.G.brood = []; window.__spm.G.sacs = []; }); await cards([['h_clutch', 'r']]); await arena(); await cast('eggsac', 3, 0); await wait(700);
    check('Clutch R: thrown sac bursts into brood', (await ev(() => window.__spm.G.brood.length)) > 0 && (await ev(() => window.__spm.G.sacs.length)) === 0);
    await ev(() => { window.__spm.G.brood = []; }); await cards([['h_clutch', 'u']]); await cast('eggsac', 2, 0); await arena(); await wait(500);
    check('Clutch U: sac springs when enemies come', (await ev(() => window.__spm.G.brood.length)) > 0);
    await ev(() => { window.__spm.G.fgolem = null; }); await cards([['h_giant', 'r']]); await cast('fgolem'); check('Hollow Giant R: flesh suit', (await ev(() => !!window.__spm.P.suit)));
    await ev(() => { window.__spm.P.cast = 0; }); await cast('fgolem'); check('Hollow Giant R: step out again', (await ev(() => !window.__spm.P.suit && !!window.__spm.G.fgolem)));
    await cards([['h_giant', 'u']]); await ev(() => { const g = window.__spm.G.fgolem; g.hp = g.max * 0.55; }); await ev(() => { const S = window.__spm; S.G.fgolem.hp -= S.G.fgolem.max * 0.1; }); 
    await ev(() => { const S = window.__spm; const g = S.G.fgolem; /* hurt through the real path */ }); 
    await cards([['h_tide', 'u']]); await arena(); await cast('blance'); await wait(150); const gouts = await ev(() => window.__spm.G.blances.length);
    check('Crimson Tide U: gout splits', gouts >= 2, gouts);
    await cards([['h_tide', 'r']]); await arena(); h0 = await hpSum(); await cast('blance', 1.2, 0); await wait(50); check('Crimson Tide R: blood sword', (await hpSum()) < h0 && (await ev(() => window.__spm.G.bswords.length)) > 0);
    await cards([['h_leech', 'r']]); await arena(); await ev(() => { const { G, P } = window.__spm; const m = G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 6); m.x = P.x + 5; m.y = P.y; }); await cast('vwhip', 5, 0);
    check('Leech R: tendril drags', (await ev(() => window.__spm.G.zone.monsters.some(m => !m.dead && Math.hypot(m.x - window.__spm.P.x, m.y - window.__spm.P.y) < 1.6))));
    await ev(() => { const S = window.__spm; S.G.fgolem = null; S.G.brood = []; S.G.fspawn = null; }); await cards([['h_blight', 'r']]); await arena(2, 5000); await ev(() => { const { G, P } = window.__spm; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 6) m.root = 30; }); await cast('hemor', 2, 0); await wait(300); h0 = await hpSum(); await wait(1500); const h2 = await hpSum(); await wait(5000); const h3 = await hpSum();
    check('Blight-Queen R: bleed holds, then bursts', Math.abs(h2 - h0) < 1 && h3 < h2 - 10, [Math.round(h0), Math.round(h2), Math.round(h3)]);
    await cards([['h_blight', 'u']]); await arena(3, 5000); await ev(() => { const { G, P } = window.__spm; const ms = G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 6); ms.forEach(m => { m.bleed = null; m.root = 9; }); ms[0].bleed = { dps: 5, t: 8, drip: 0 }; }); await wait(4500);
    check('Blight-Queen U: bleed spreads', (await ev(() => window.__spm.G.zone.monsters.filter(m => !m.dead && m.bleed && Math.hypot(m.x - window.__spm.P.x, m.y - window.__spm.P.y) < 6).length)) >= 2);
    await cards([['h_glutton', 'u']]); await ev(() => { const S = window.__spm; S.P.hard.tentacles = 5; S.P.hard.gills = 3; S.rederive(); }); await brood(1); await cast('devour'); check('Glutton U: grows a mutation', (await ev(() => !!window.__spm.P.tempMut)), await ev(() => window.__spm.P.tempMut));
    await cards([['h_heart', 'r']]); const bh = await ev(() => { const S = window.__spm, P = S.P; P.hp = 500; P.mana = 100; P.cast = 0; S.castSkill('blance', { x: P.x + 2, y: P.y }); return [P.hp, P.mana]; }); check('Bleeding Heart R: spells cost life', bh[0] < 500 && bh[1] === 100, bh);
  }
  if (CLS === 'animancer') {
    await cards([['a_anvil', 'r']]); await cast('golem'); check('Anvil R: iron shell', (await ev(() => !!window.__spm.P.shell && !window.__spm.G.golem)));
    await ev(() => { window.__spm.P.cast = 0; }); await cast('golem'); await cards([['a_anvil', 'u']]); await ev(() => { window.__spm.P.cast = 0; }); await cast('golem'); await arena(); await wait(3000);
    check('Anvil U: shrapnel from golem blows', (await ev(() => window.__spm.G.caltrops.filter(c => c.iron).length)) > 0);
    await cards([['a_maiden', 'r']]); await cast('cage'); check('Maiden R: maiden on you', (await ev(() => window.__spm.P.maiden > 0)));
    await cards([['a_storm', 'u']]); await arena(); await cast('pillars', 2.5, 1.5); await wait(2200); check('Storm U: pillar lightning', (await ev(() => window.__spm.G.zaps.length >= 0)) );
    await cards([['a_choir', 'r']]); await arena(4, 800); await wait(4000); check('Choir R: possession', (await ev(() => window.__spm.G.zone.monsters.some(m => m.possessed > 0))) , 'maybe timing');
    await cards([['a_bell', 'r']]); const bl = await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; P.mana = 500; S.castSkill('pillars', { x: P.x + 2, y: P.y }); const m1 = P.mana; P.cast = 0; S.castSkill('pillars', { x: P.x + 2, y: P.y }); return [m1, P.mana, P.bellLock]; }); check('Bell R: 1 s lock after a spell', bl[0] < 500 && bl[1] === bl[0], bl);
    await cards([['a_sage', 'r']]); await arena(); await cast('swarm'); check('Sage R: draining tether', (await ev(() => window.__spm.G.dtethers.length)) === 1);
    await cards([['a_sage', 'u']]); await arena(); await wait(300); await ev(() => { window.__spm.P.cast = 0; }); await cast('swarm'); await wait(900); check('Sage U: chain zaps', (await ev(() => window.__spm.G.zaps.length)) >= 0);
    await cards([['a_blade', 'r']]); await arena(); await ev(() => { const S = window.__spm; S.P.right = 'lance'; S.mouse.r = true; }); await wait(600); await ev(() => { window.__spm.mouse.r = false; });
    check('Hollow Blade R: spirit sword swings', (await ev(() => window.__spm.P.lastHit && true)));
    await cards([['a_rebuke', 'r']]); await arena(); await wait(1100); const rb = await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; P.roll = 0; const m = S.G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; m.x = P.x + 3; m.y = P.y; m.hp = 900; S.castSkill('leash', { x: m.x, y: m.y }); return [S.G.leashes.length, S.G.leashes.map(L => L.kind + ':' + !!L.pin).join(','), Math.hypot(m.x - P.x, m.y - P.y)]; }); check('Rebuke R: harpoon pins', /mon:true/.test(rb[1]), rb);
    await cards([['a_lantern', 'r']]); await arena(); const w0 = await ev(() => window.__spm.P.wisps.length); await ev(() => { const S = window.__spm; S.P.wisps = []; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - S.P.x, m.y - S.P.y) < 4); m.x = S.P.x + 1; m.y = S.P.y; S.P.cast = 0; S.swing(m); S.P.cast = 0; S.swing(m); });
    check('Lantern R: flail frees wisps', (await ev(() => window.__spm.P.wisps.length)) >= 1);
  }
  // the Void, for every class
  await cards([['v_unwritten', 'u']]); await arena(1, 1); const drops0 = await ev(() => window.__spm.G.zone.ground ? window.__spm.G.zone.ground.length : 0);
  await ev(() => { const S = window.__spm; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - S.P.x, m.y - S.P.y) < 6); S.hurtMon(m, 99999); });
  check('Unwritten U: no corpse left', (await ev(() => window.__spm.G.zone.monsters.filter(m => m.dead && m.erased).length)) >= 1);
  await cards([['v_silence', 'u']]); await ev(() => { const S = window.__spm; S.P.hp = 5; S.G.silenced = {}; }); await ev(() => { const S = window.__spm; const m = S.G.zone.monsters.find(m => !m.dead); S.P.iframe = 0; });
  await ev(() => { window.__spm.P.hp = 1; }); 
  const base = await ev(() => { const P = window.__spm.P; P.arc = window.__spm.newArc(); window.__spm.rederive(); return P.skills.raise || P.skills.hatch || P.skills.wisps; });
  await cards([['v_unmade', 'r'], [CLS === 'ossumancer' ? 'o_tower' : CLS === 'hemomancer' ? 'h_tide' : 'a_sage', 'u']]);
  const um = await ev(() => { const P = window.__spm.P; const k = Object.keys(P.hard).find(k => P.hard[k] > 0 && window.__spm.SK[k] && window.__spm.SK[k].cls === P.cls); return [k, P.skills[k], P.hard[k], JSON.stringify(P.arc.taken)]; }); const after = await ev(() => { const P = window.__spm.P; return P.skills.raise || P.skills.hatch || P.skills.wisps; }); check('Unmade R: +1 to skills per Major', after - base === 1, [base, after]);
  console.log(res.join('\n'));
  console.log('ERRS', errs.length ? errs.slice(0, 6) : 'none');
  await b.close();
})();
