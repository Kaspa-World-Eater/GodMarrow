// targeted checks: each card does what its text says
const { chromium } = require('playwright');
const CLS = 'hemomancer';
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

  const S = () => 0;
  await cards([]);
  await ev(() => { const { P } = window.__spm; P.muts = []; window.__spm.rederive(); });
  // life cost and Vitae
  const lc = await ev(() => { const S = window.__spm, P = S.P, D = S.getD(); P.hp = 500; P.mana = D.maxMana; P.cast = 0; S.castSkill('bfrenzy', { x: P.x + 1, y: P.y }); const full = 500 - P.hp; P.hp = 500; P.mana = 0; P.cast = 0; S.castSkill('bfrenzy', { x: P.x + 1, y: P.y }); return [full, 500 - P.hp]; });
  check('Life cost: cheaper at full Vitae', lc[0] > 0 && lc[1] > lc[0] * 3, lc);
  check('Blood Frenzy on you', await ev(() => window.__spm.P.bfrenzyT > 0));
  // tumor toss
  await arena(3, 2000); await ev(() => { window.__spm.G.brood = []; });
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; P.hp = 1e6; P.mana = 999; S.castSkill('eggsac', { x: P.x + 2.2, y: P.y }); }); await wait(700);
  check('Tumor Toss: tumor spawnlings', await ev(() => window.__spm.G.brood.filter(e => e.temp && e.max <= 1 || e.temp).length > 0), await ev(() => window.__spm.G.brood.map(e => [e.temp, Math.round(e.max)])));
  // rabid charge
  await ev(() => { const S = window.__spm, P = S.P; S.G.brood = []; for (let i = 0; i < 2; i++) { const e = S.hatchLing ? S.hatchLing(P.x + 0.5, P.y, true) : null; } });
  const hasHatch = await ev(() => !!window.__spm.hatchLing);
  await arena(2, 3000); let h0 = await hpSum();
  await ev(() => { const S = window.__spm, P = S.P; for (const e of S.G.brood) e.hatch = 0; P.cast = 0; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4); S.castSkill('rush', { x: m.x, y: m.y }); }); await wait(900);
  const pw = await ev(() => window.__spm.HS.power()); check('Rabid Charge bursts', (await hpSum()) < h0 && (await ev(() => window.__spm.G.brood.filter(e => !e.temp).length)) <= 1, [pw, Math.round(h0 - await hpSum())]);
  // hemorrhage: % of life
  await arena(1, 1000); const hm = await ev(() => { const S = window.__spm, P = S.P; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4); m.bleed = null; const h = m.hp; P.cast = 0; S.castSkill('hemor', { x: m.x, y: m.y }); return (h - m.hp) / h; });
  check('Hemorrhage takes a share of life', hm > 0.15 && hm < 0.5, hm);
  // vomit channel
  await arena(3, 3000); h0 = await hpSum(); await ev(() => { const S = window.__spm; S.P.right = 'blance'; S.P.cast = 0; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - S.P.x, m.y - S.P.y) < 4); S.mouse.r = true; window.__T.m = m; });
  const g0 = await ev(() => window.__spm.G.blances.length); await wait(900); const g1 = await ev(() => window.__spm.G.blances.length); await ev(() => { window.__spm.mouse.r = false; }); await wait(600);
  check('Blood Vomit channels', (await hpSum()) < h0, [g0, g1, Math.round(h0 - await hpSum())]);
  // vein whip constricts
  await arena(2, 3000); await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4); S.castSkill('vwhip', { x: m.x, y: m.y }); }); await wait(300);
  check('Vein Whip constricts', await ev(() => window.__spm.G.veins.length > 0 && window.__spm.G.vgrnd.length > 0), await ev(() => window.__spm.G.veins.length));
  // leeches
  await arena(2, 5000); await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; P.hp = 50; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4); m.root = 20; m.stun = 20; S.castSkill('spool', { x: m.x, y: m.y }); }); await wait(1200);
  check('Leeches latch', await ev(() => window.__spm.G.leeches.some(l => l.state === 'latch')), await ev(() => window.__spm.G.leeches.map(l => l.state)));
  await wait(5500); check('Leeches come home and feed', await ev(() => window.__spm.G.leeches.length < 3 && window.__spm.P.hp > 50), await ev(() => [window.__spm.G.leeches.map(l => l.state), Math.round(window.__spm.P.hp)]));
  await ev(() => { window.__spm.P.hp = 1e6; });
  // belly maw engulf
  await ev(() => { const S = window.__spm; S.P.muts = ['maw', 'tentacles']; S.rederive(); });
  await arena(1, 400); const eg = await ev(() => { const S = window.__spm, P = S.P; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4); m.x = P.x + 0.8; m.y = P.y; let n = 0; for (let i = 0; i < 80 && !S.G.engulfs.length; i++) { P.cast = 0; S.swing(m); n++; } return [S.G.engulfs.length, n]; });
  check('Belly Maw engulfs', eg[0] === 1, eg);
  await wait(4500); check('Engulfed: digested or spat out', await ev(() => window.__spm.G.engulfs.length === 0));
  // tentacles
  await arena(3, 3000); await wait(1500);
  check('Tentacles grasp and bind', await ev(() => window.__spm.P.tentArms.length >= 2 && window.__spm.G.tbinds.length + window.__spm.P.tentArms.filter(a => a.state === 'lash').length > 0), await ev(() => [window.__spm.P.tentArms.length, window.__spm.G.tbinds.length]));
  // golem: engulf, vomit, mutations
  await ev(() => { const S = window.__spm, P = S.P; P.muts = []; P.gmuts = ['chitin']; S.rederive(); P.cast = 0; S.castSkill('fgolem', { x: P.x + 1, y: P.y }); });
  await arena(1, 5000); await ev(() => { const S = window.__spm, g = S.G.fgolem; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - S.P.x, m.y - S.P.y) < 5); g.x = m.x + 0.9; g.y = m.y; g.engulfCd = 0; }); await wait(1500);
  check('Flesh Golem engulfs', await ev(() => window.__spm.G.engulfs.some(e => e.h === window.__spm.G.fgolem)));
  await ev(() => { const S = window.__spm; for (const e of S.G.engulfs) e.t = 99; }); await wait(200);
  await arena(1, 5000); await ev(() => { const S = window.__spm, g = S.G.fgolem; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - S.P.x, m.y - S.P.y) < 5); g.x = m.x + 4; g.y = m.y; g.vomitCd = 0; g.engulfCd = 99; g.order = null; }); await wait(600);
  check('Flesh Golem spews blood', await ev(() => window.__spm.G.fgolem.vomitT > 0 || window.__spm.G.blances.some(b => b.golem)));
  // frenzy on minions
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; S.G.fgolem.x = P.x + 1; S.G.fgolem.y = P.y; S.castSkill('bfrenzy', { x: P.x, y: P.y }); }); check('Frenzy on golem', await ev(() => window.__spm.G.fgolem.frenzyT > 0));
  // tumor hump
  await ev(() => { const S = window.__spm; S.P.muts = ['bilehump']; S.rederive(); }); await arena(2, 3000); await ev(() => { window.__spm.P.bileT = 0; }); await wait(150);
  check('Tumor Hump buds spawn', await ev(() => window.__spm.G.biles.some(b => b.orb)));
  // spider legs graft speed
  const sp = await ev(() => { const S = window.__spm, P = S.P; P.grafts = ['legs']; S.rederive(); const e = S.G.brood[0]; return e ? e.spd : null; }); await wait(100);
  const sp2 = await ev(() => { const e = window.__spm.G.brood.find(e => !e.temp) || window.__spm.G.brood[0]; return e ? e.spd : null; });
  check('Spider legs: faster brood', sp2 == null || sp2 > 4.5, [sp, sp2]);
  // draw a frame with everything
  await ev(() => { const S = window.__spm; S.P.muts = ['maw', 'tentacles', 'bilehump']; S.rederive(); }); await wait(500);
  await p.screenshot({ path: 'hemo_shot.png' });
  for (const r of res) console.log(r); console.log('ERRS', errs.length ? errs.join('\n') : 'none'); await b.close();
})();
