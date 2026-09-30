const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.evaluate(() => { window.__spm.G.pickCls = 'hemomancer'; window.__spm.startGame('test'); }); await p.waitForTimeout(3200);
  await p.evaluate(() => { const S = window.__spm, { P, G } = S; for (const k in G.panels) G.panels[k] = false; const ms = G.zone.monsters.filter(m => !m.dead && m.rank !== 'boss').slice(0, 7); ms.forEach((m, i) => { m.x = P.x + 1.5 + (i % 4) * 0.9; m.y = P.y - 1 + Math.floor(i / 4) * 1.4; }); ms.slice(0, 5).forEach((m, i) => setTimeout(() => { S.hurtMon(m, 5, '#e8e2d0'); S.hurtMon(m, 3, '#e8e2d0'); S.killMon(m); }, i * 150)); P.hp = 99999; });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: 'shotdeath.png', clip: { x: 330, y: 150, width: 360, height: 220 } });
  console.log(errs); await b.close();
})();
