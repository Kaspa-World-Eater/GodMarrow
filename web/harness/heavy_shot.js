const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.HTML);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  for (const cls of (process.env.CLS || 'animancer,hemomancer,monk').split(',')) {
    await ev(c => { const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, cls); await wait(2500);
    await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { m.x += 80; m.y += 80; }); S.P.left = 'attack'; S.P.eq.weapon = null; S.rederive();
      const m = S.makeMon('hollow', S.P.x + 1.0, S.P.y - 1.0, 5, 'normal', []); m.hp = m.max = 1e6; m.b = { ...m.b, ai: 'none' }; S.G.zone.monsters.push(m); S.mouse.l = true; S.P.target = { kind: 'mon', ref: m }; });
    for (let k = 0; k < 600 && !(await ev(() => window.__spm.HV.full)); k++) await wait(50);
    console.log(cls, JSON.stringify(await ev(() => ({ st: window.__spm.HV.st, full: window.__spm.HV.full, frH: window.__spm.HV.frH, fade: 0 })))); await wait(150);
    await p.screenshot({ path: `/tmp/heavy_charge_${cls}.png` });
    await ev(() => { window.__spm.mouse.l = false; }); await wait(800);
  }
  console.log('ERRS', errs.length ? errs.join('\n') : 'none'); await b.close();
})();
