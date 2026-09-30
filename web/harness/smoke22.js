// the Miasmancer: skill-by-skill checks
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.screenshot({ path: 'shot22_menu.png' });
  await p.click('.cls[data-cls=miasmancer]'); await p.click('#newBtn'); await p.waitForTimeout(600);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  console.log('new char', await ev(() => { const { P, getD } = window.__spm; const D = getD(); return JSON.stringify({ cls: P.cls, mana: Math.round(P.mana), max: D.maxMana, skills: Object.keys(P.hard).filter(k => P.hard[k] > 0), right: P.right, eq: Object.keys(P.eq) }); }));
  await wait(1500); await p.screenshot({ path: 'shot22_start.png' });
  await ev(() => { const S = window.__spm, { P, SK } = S; P.level = 30; for (const id in SK) if (SK[id].cls === 'miasmancer') P.hard[id] = 12; P.hard.sister = 0; P.hard.mstorm = 0; P.attrs.spi = 80; S.rederive(); P.mana = 999; P.hp = 1e6; });
  const cards = (list) => ev((list) => { const S = window.__spm, { P } = S; P.arc = S.newArc(); for (const [k, o] of list) P.arc.taken[k] = o; S.rederive(); }, list);
  const arena = (n = 4, hp = 600, dx = 2) => ev(([n, hp, dx]) => { const { P, G } = window.__spm; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 16) m.x += 60; const ms = G.zone.monsters.filter(m => !m.dead).slice(0, n); ms.forEach((m, i) => { m.x = P.x + dx + (i % 2) * 0.6; m.y = P.y + (i - n / 2) * 0.7; m.hp = m.max = hp; m.state = 'chase'; m.poison = null; m.confused = 0; m.feared = 0; m.root = 0; m.stun = 0; }); P.hp = 1e6; P.mana = 999; return ms.length; }, [n, hp, dx]);
  const cast = (id, dx = 2.3, dy = 0) => ev(([id, dx, dy]) => { const S = window.__spm, P = S.P; P.cast = 0; P.roll = 0; P.mana = Math.max(P.mana, 60); P.stam = 999; S.castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const near = (f) => ev((f) => { const { G, P } = window.__spm; const ms = G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 8); return ms.map(m => eval(f)); }, f);
  const hpSum = () => ev(() => { const { G, P } = window.__spm; return G.zone.monsters.filter(m => Math.hypot(m.x - P.x, m.y - P.y) < 8).reduce((a, m) => a + Math.max(0, m.hp), 0); });
  await cards([]);
  await arena(3, 600, 1.8); await wait(1500);
  check('Miasma aura poisons', (await near('!!m.poison')).some(Boolean));
  await arena(); let h0 = await hpSum(); await cast('fang'); await wait(400); check('Fang Knives hit and poison', (await hpSum()) < h0 && (await near('!!m.poison')).some(Boolean));
  await arena(); h0 = await hpSum(); await cast('pnova'); await wait(800); check('Poison Nova', (await hpSum()) < h0);
  await arena(); h0 = await hpSum(); await cast('rotwall', 4, 0); await wait(900); check('Rot Tide', (await hpSum()) < h0);
  await arena(); await cast('contagion', 2, 0); check('Contagion marks', (await near('m.contagion > 0')).some(Boolean));
  await arena(3, 600, 1.2); const m0 = await ev(() => window.__spm.P.mana); h0 = await hpSum(); await cast('exhale'); check('Exhale spends the cloud', (await ev(() => window.__spm.P.mana)) < m0 * 0.4 && (await hpSum()) < h0, m0);
  await arena(); await cast('haze', 2.2, 0); await wait(1200); check('Haze confuses', (await near('m.confused > 0')).some(Boolean));
  await arena(); const px = await ev(() => window.__spm.P.x); await cast('blur', -4, 0); check('Blur steps and leaves a decoy', (await ev(() => window.__spm.G.decoys.length)) === 1 && (await ev(() => window.__spm.P.x)) < px - 2);
  await arena(3, 600, 3); await cast('ntrap', 1.5, 0); await wait(2500); check('Needle Trap fires', (await near('!!m.poison')).some(Boolean));
  await arena(2, 600, 3); await cast('bmine', 3, 0); await wait(1500); check('Bloat Mine bursts into a cloud', (await ev(() => window.__spm.G.clouds.length)) > 0);
  await arena(2, 600, 4); await cast('lure', 1.5, 0); await wait(1200); const lr = await near('Math.hypot(m.x - window.__spm.P.x - 1.5, m.y - window.__spm.P.y)'); check('Siren Lure pulls', lr.some(d => d < 1.5), [lr, await ev(() => window.__spm.G.lures.map(l => [l.x - window.__spm.P.x, l.y - window.__spm.P.y, l.t]))]);
  await arena(2, 5000, 1); await cast('mirage', 1, 0); await wait(300); check('Mirage slows', (await near('m.slow')).some(s => s > 0.3));
  await arena(3, 3000, 2); await cast('pnova'); await wait(700); await ev(() => { const S = window.__spm; S.addCloud(S.P.x + 3, S.P.y, 1, 5, 5, 'poison'); S.P.mana = 5; }); h0 = await hpSum(); await ev(() => { window.__spm.P.cast = 0; }); await cast('inhale');
  check('Inhale tears poison out and refills Miasma', (await hpSum()) < h0 - 20 && (await ev(() => window.__spm.P.mana)) > 10 && (await near('!!m.poison')).every(x => !x), [Math.round(h0 - await hpSum()), await ev(() => Math.round(window.__spm.P.mana))]);
  // death: omens
  await arena(2, 5000, 1.0); await cast('gstrike', 1, 0); await ev(() => { window.__spm.P.cast = 0; }); await cast('talon', 1, 0); await ev(() => { window.__spm.P.cast = 0; }); await cast('gstrike', 1, 0);
  check('Strikes build Omens', (await ev(() => window.__spm.P.omens)) >= 3);
  h0 = await hpSum(); await ev(() => { window.__spm.P.cast = 0; }); await cast('reap'); check('Reap spends Omens', (await ev(() => window.__spm.P.omens)) === 0 && (await hpSum()) < h0);
  await arena(1, 1000, 1.0); await ev(() => { const { G, P } = window.__spm; const m = G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 3); m.hp = 150; P.omens = 3; P.cast = 0; }); await cast('execute', 1, 0);
  check('Execute kills below the threshold', (await ev(() => window.__spm.G.zone.monsters.filter(m => m.dead && Math.hypot(m.x - window.__spm.P.x, m.y - window.__spm.P.y) < 3).length)) >= 1);
  await arena(3, 5000, 3); await ev(() => { window.__spm.P.cast = 0; }); await cast('dstep', 5, 0); await wait(600); check("Death's Step dashes through", (await ev(() => window.__spm.P.omens)) >= 1);
  await cast('vblade'); check('Venom Blade', (await ev(() => window.__spm.P.venomT)) > 30);
  // evasion and last breath
  const ev0 = await ev(() => window.__spm.MS.evade()); check('Evasion from the cloud', ev0 > 0.1, ev0);
  await ev(() => { const S = window.__spm, P = S.P; P.hp = 5; P.iframe = 0; P.breathCd = 0; }); 
  // elements: shatter and poison clouds for any class
  await arena(1, 1000, 2); await ev(() => { const S = window.__spm, { G, P } = S; const m = G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4); m.hp = 50; for (let i = 0; i < 30; i++) { if (m.dead) break; S.chillMon(m, 0.3); } });
  check('Cold shatters the nearly dead', (await ev(() => window.__spm.G.zone.monsters.some(m => m.dead && Math.hypot(m.x - window.__spm.P.x, m.y - window.__spm.P.y) < 4))));
  // cards
  await cards([['z_tide', 'r']]); await arena(3, 600, 1.4); h0 = await hpSum(); await cast('rotwall'); await wait(800); check('Tide R: a spinning ring', (await hpSum()) < h0);
  await cards([['z_mirror', 'r']]); await arena(1, 600, 2.5); await ev(() => { window.__spm.P.omens = 0; }); await cast('blur', 2.5, 0); check('Mirror R: blink into the enemy and strike', (await ev(() => window.__spm.P.omens)) === 1);
  await cards([['z_trapq', 'r']]); await cast('bmine'); check('Trapper-Queen R: traps are worn', (await ev(() => window.__spm.P.wornTraps.length)) === 1);
  await cards([['z_reaper', 'r']]); await arena(2, 600, 3); await ev(() => { window.__spm.P.omens = 2; window.__spm.P.cast = 0; }); await cast('reap', 3, 0); await wait(100); check('Reaper R: thrown scythe', (await ev(() => window.__spm.G.rscythes.length)) === 1);
  await cards([['z_bloom', 'r']]); await arena(); await cast('pnova', 3, 0); check('Bloom R: nova at the cursor', (await ev(() => { const n = window.__spm.G.mnovas[0]; return n && Math.abs(n.x - window.__spm.P.x - 3) < 0.5; })));
  await cards([['z_hanged', 'r']]); await cast('haze'); check('Hanged R: haze mantle', (await ev(() => window.__spm.P.hazeMantle)) > 0);
  await cards([['z_venom', 'r']]); await cast('vblade'); await arena(1, 600, 2); const kn = await ev(() => { const S = window.__spm, { G, P } = S; const m = G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4); P.cast = 0; const n0 = G.arcShots.length; S.swing(m); return G.arcShots.length - n0; }); check('Serpent R: swings throw knives', kn === 3, kn);
  await p.keyboard.press('a'); await wait(200); await p.screenshot({ path: 'shot22_web.png' }); await p.keyboard.press('a');
  await p.keyboard.press('s'); await wait(150); await p.screenshot({ path: 'shot22_skills.png' });
  await ev(() => { window.__spm.G.tab = 2; }); await wait(100); await p.screenshot({ path: 'shot22_skills2.png' }); await p.keyboard.press('Escape');
  // a fight to look at
  await cards([]); await arena(5, 300, 2.5); await cast('haze', 3, 0); await cast('pnova'); await ev(() => { window.__spm.P.cast = 0; }); await cast('ntrap', 2, 1); await wait(350); await p.screenshot({ path: 'shot22_fight.png' });
  console.log(res.join('\n'));
  console.log('G.error', await ev(() => window.__spm.G.error)); console.log('ERRS', errs.length ? errs.slice(0, 6) : 'none');
  await b.close();
})();
