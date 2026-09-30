const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=hemomancer]'); await p.click('#newBtn'); await p.waitForTimeout(500);
  // path trace in open ground (no monsters near): record lateral wobble and range
  const tr = await p.evaluate(async () => { const { castSkill, P, G } = window.__spm; for (const m of G.zone.monsters) if (Math.hypot(m.x - P.x, m.y - P.y) < 12) m.dead = true;
    P.cast = 0; castSkill('blance', { x: P.x + 6, y: P.y }); const s = G.blances[0]; const x0 = P.x, y0 = P.y, pts = [];
    await new Promise(r => { const id = setInterval(() => { if (s.done) { clearInterval(id); r(); } else pts.push([+(s.x - x0).toFixed(2), +(s.y - y0).toFixed(2), +s.z.toFixed(1)]); }, 50); });
    return { pts, pools: G.pools.length }; });
  console.log('trace', JSON.stringify(tr));
  // hit a monster: set up next to one
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.x = m.x - 3; P.y = m.y; m.hp = m.maxHp = 999; window._m = m; });
  const hp0 = await p.evaluate(() => window._m.hp); console.log('setup', await p.evaluate(() => { const { P, G } = window.__spm; const m = window._m; return [P.x, P.y, m.x, m.y, m.hp, m.dead, G.zone.get(Math.floor(m.x - 1.5), Math.floor(m.y))]; }));
  await p.evaluate(() => { const { castSkill, P } = window.__spm; P.cast = 0; castSkill('blance', { x: window._m.x, y: window._m.y }); });
  console.log('fly', await p.evaluate(() => JSON.stringify(window.__spm.G.blances.map(s => [s.x, s.y, s.done])))); await p.waitForTimeout(130); await p.screenshot({ path: 'shot16_fly.png' });
  await p.waitForTimeout(250); await p.screenshot({ path: 'shot16_splash.png' }); console.log('mid', await p.evaluate(() => { const { G } = window.__spm; const m = window._m; return JSON.stringify([m.hp, m.x, m.y, m.r, G.blances.map(s => [s.x, s.y, s.hit.size, s.done])]); }));
  await p.waitForTimeout(600);
  console.log('monster dmg', hp0 - await p.evaluate(() => window._m.hp), 'bleed', await p.evaluate(() => !!window._m.bleed));
  await p.evaluate(() => { const { castSkill, P } = window.__spm; P.cast = 0; castSkill('vwhip', { x: window._m.x, y: window._m.y }); P.cast = 0; castSkill('hemor', { x: window._m.x, y: window._m.y }); });
  await p.waitForTimeout(150); await p.screenshot({ path: 'shot16_spray.png' });
  console.log('errs', errs);
  await b.close();
})();
