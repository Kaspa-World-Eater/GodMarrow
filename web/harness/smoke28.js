const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  const start = async cls => { await ev(() => { window.__spm.G.running = false; document.getElementById('intro').hidden = false; }); await p.evaluate(c => { window.__spm.G.pickCls = c; window.__spm.startGame('test'); }, cls); await wait(400); await p.keyboard.press('Escape'); await ev(() => { const S = window.__spm, { P, SK } = S; for (const id in SK) if (SK[id].cls === P.cls) P.hard[id] = 12; S.rederive(); }); };
  const arena = (n = 4, hp = 5000, d = 2) => ev(([n, hp, d]) => { const { P, G } = window.__spm; const mons = G.zone.monsters.filter(m => !m.dead).slice(0, n); mons.forEach((m, i) => { m.x = P.x + d + (i % 2) * 0.7; m.y = P.y + (i - n / 2) * 0.7; m.hp = m.max = hp; m.state = 'chase'; m.stun = 0; m.root = 0; }); for (const m of G.zone.monsters) if (!mons.includes(m) && !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 16) m.x += 40; P.hp = 1e6; P.mana = 9999; P.stam = 999; return mons.length; }, [n, hp, d]);
  // --- Animancer: the golem plants and sweeps a phosphorus beam; no stray beams
  await start('animancer'); await arena(4, 20000, 3);
  await ev(() => { const S = window.__spm, { P, G } = S; P.cast = 0; S.castSkill('golem', { x: P.x + 1, y: P.y }); });
  await wait(300); await ev(() => { const S = window.__spm; S.G.golem.charge = 0; S.addCharge(S.G.golem, 99); });
  let saw = false, pos = null, still = true; for (let i = 0; i < 30; i++) { await wait(150); const r = await ev(() => { const g = window.__spm.G.golem; return g && g.phos ? { x: g.x, y: g.y } : null; }); if (r) { if (pos && Math.hypot(r.x - pos.x, r.y - pos.y) > 0.05) still = false; pos = r; if (!saw) { saw = true; await p.screenshot({ path: 'shot28_phos.png' }); } } }
  check('berserk golem fires a planted phosphorus beam', saw && still, [saw, still, await ev(() => { const g = window.__spm.G.golem; return g ? { ramp: g.ramp, st: g.state, bt: g.beamT } : null; })]);
  check('no ghost beams linger', await ev(() => !(window.__spm.G.gbeams || []).length));
  // costs climb with level
  const cc = await ev(() => { const S = window.__spm, { P } = S; P.skills.swarm = 1; const a = S.skillCost('swarm'); P.skills.swarm = 20; const b = S.skillCost('swarm'); return [a, b]; }); check('costs climb with level', cc[1] > cc[0] * 1.8, cc);
  // --- Ossumancer: shard regrowth is slow; Command Bones is gone; directing the Colossus leads the skeletons; Scythe Sweep takes points
  await start('ossumancer');
  const rate = await ev(() => window.__spm.BS.rate());
  check('shards regrow slowly (<2.4/s at lvl30)', rate < 2.4, rate);
  check('Command Bones is gone', await ev(() => !window.__spm.SK.command));
  const sc = await ev(() => { const S = window.__spm, { P } = S; P.skillPts = 5; P.hard.bscythe = 3; S.rederive(); const ok = S.learn('bscythe'); return [ok, P.skills.bscythe]; });
  check('Scythe Sweep accepts points', sc[0] && sc[1] >= 4, sc);
  // --- Assassin: melee walks, never teleports
  await start('miasmancer'); await arena(1, 5000, 5);
  const p0 = await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castSkill('gstrike', { x: P.x + 5, y: P.y }); return { x: P.x, y: P.y, ap: !!P.approach }; });
  await wait(60); const p1 = await ev(() => ({ x: window.__spm.P.x, y: window.__spm.P.y }));
  check('melee strike starts walking instead of lunging', p0.ap && Math.hypot(p1.x - p0.x, p1.y - p0.y) < 0.6, [p0, p1]);
  await wait(2000); check('it strikes on arrival', await ev(() => window.__spm.P.omens >= 1));
  await arena(4, 5000, 1.2); await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castSkill('rarc', { x: P.x + 2, y: P.y }); }); await wait(100); await p.screenshot({ path: 'shot28_rarc.png' });
  await arena(4, 5000, 1.2); await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; P.stam = 999; S.castSkill('thrust', { x: P.x + 2, y: P.y }); }); await wait(60); await p.screenshot({ path: 'shot28_thrust.png' });
  // --- Hemomancer: tentacles cycle, vein whip cleaves, oozes, vitae is dear
  await start('hemomancer');
  await ev(() => { const { P } = window.__spm; P.muts = ['tentacles', 'maw']; }); await arena(4, 5000, 2.5);
  const tstates = new Set(); for (let i = 0; i < 25; i++) { await wait(80); (await ev(() => window.__spm.P.tentArms.map(a => a.state))).forEach(s => tstates.add(s)); if (i === 3) await p.screenshot({ path: 'shot28_tent.png' }); }
  check('tentacles coil, strike, tear off and regrow', ['coil', 'lash', 'regrow'].every(s => tstates.has(s)) && (await ev(() => window.__spm.G.tbinds.length)) > 0, [...tstates]);
  await arena(4, 5000, 1.2); await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castSkill('vwhip', { x: P.x + 2, y: P.y }); }); await wait(100); await p.screenshot({ path: 'shot28_whip.png' });
  check('vein whip leaves nothing on the ground', await ev(() => !window.__spm.G.vgrnd.length));
  await ev(() => { const S = window.__spm, { P, G } = S; const m = G.zone.monsters.find(m => !m.dead); m.x = P.x + 2; m.y = P.y; S.addBleed(m, 5, 10); S.hurtMon(m, 1e7); });
  const pools = await ev(() => window.__spm.G.pools.filter(p => !p.own).length);
  check('a bleeding death leaves a pool', pools > 0, pools);
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; P.mana = 9999; S.castSkill('thrall', { x: P.x + 2, y: P.y }); });
  check('Blood Ooze forms', await ev(() => window.__spm.G.thralls.length === 1 && window.__spm.G.thralls[0].ooze));
  await arena(3, 5000, 4); await wait(2500); await p.screenshot({ path: 'shot28_ooze.png' });
  check('the ooze spits blood shards', await ev(() => window.__spm.G.zone.monsters.some(m => !m.dead && m.hp < 5000)));
  const vr = await ev(() => { const S = window.__spm, P = S.P; return [S.getD().manaRegen, S.getD().maxMana, S.SK.hatch.mana]; });
  check('Vitae refills slowly', vr[0] < 2, vr);
  const gh = await ev(() => { const S = window.__spm; S.P.hard.fgolem = 1; S.rederive(); return S.HS.golemHp(); });
  check('Flesh Golem has 2.5x the life', gh > 200, gh);
  // loot: fewer drops, Keen is rare
  const loot = await ev(() => { const S = window.__spm; let dmg = 0, n = 0; for (let i = 0; i < 3000; i++) { const it = S.rollItem(10, 0); if (it.stats && it.stats.dmg) { dmg++; if (it.stats.dmg > 15) n++; } } return [dmg, n]; });
  check('+% skill damage is rare and at most 15%', loot[0] < 40 && loot[1] === 0, loot);
  for (const r of res) console.log(r); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 10).join('\n') : 'none'); await b.close();
})();
