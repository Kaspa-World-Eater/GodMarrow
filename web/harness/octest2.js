const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'animancer'; window.__spm.startGame('test'); }); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { const S = window.__spm, P = S.P; for (const k of ['golem', 'overcharge', 'condense', 'wisps']) { P.hard[k] = 5; } S.rederive(); P.mana = 999;
    S.castSkill('golem', { x: P.x + 2, y: P.y }); P.cast = 0; P.right = 'overcharge'; P.left = 'condense';
    return { wisps: P.wisps.length, golem: !!S.G.golem, gpos: [S.G.golem.x, S.G.golem.y] }; });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const S = window.__spm; S.P.right = 'condense'; S.mouse.r = true; S.castSkill('condense'); }); await p.waitForTimeout(1500); await p.evaluate(() => { const S = window.__spm; S.mouse.r = false; S.P.right = 'overcharge'; }); await p.waitForTimeout(2500);
  const r1 = await p.evaluate(() => { const S = window.__spm, P = S.P, g = S.G.golem; P.cast = 0; const q = S.iso(g.x, g.y); S.mouse.x = q.sx * 0.75; S.mouse.y = q.sy * 0.75; S.mouse.r = true; S.castSkill('overcharge'); return { infuse: P.infuse, wisps: P.wisps.length, charge: g.charge }; });
  await p.waitForTimeout(1500);
  const r2 = await p.evaluate(() => { const S = window.__spm, P = S.P, g = S.G.golem; return { infuse: P.infuse, cond: P.condensing, wisps: P.wisps.length, charge: g.charge, infused: g.infused, great: !!S.G.great, ramp: g.ramp, st: g.state }; });
  console.log(JSON.stringify({ r, r1, r2 }), errs.slice(0, 3)); await b.close();
})();
