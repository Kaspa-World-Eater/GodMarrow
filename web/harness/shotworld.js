const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: process.argv[5] ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await p.evaluate(c => { window.__spm.G.pickCls = c; window.__spm.startGame('test'); }, (process.argv[3] || 'animancer')); await wait(400); await p.keyboard.press('Escape');
  if (process.argv[4]) { await ev(z => window.__spm.enterZone(z), process.argv[4]); await wait(600); }
  await ev(() => { const S = window.__spm, { P, G } = S; const ms = G.zone.monsters.filter(m => !m.dead && m.rank !== 'boss').slice(0, 8); ms.forEach((m, i) => { m.x = P.x + 2 + (i % 4) * 1.2 - 1.5; m.y = P.y - 2 + Math.floor(i / 4) * 2 + (i % 4) * -0.5; m.hp = m.max = 99999; m.state = 'chase'; }); P.hp = 99999; P.dmgTaken = 0; if (G.golem) G.golem.x = P.x - 3; });
  await wait(3200); await p.screenshot({ path: process.argv[2] || 'world.png', clip: process.argv[5] ? { x: 300, y: 120, width: 360, height: 240 } : undefined });
  console.log(errs, await ev(() => window.__spm.G.zone.monsters.filter(m => !m.dead).slice(0, 8).map(m => m.type).join(','))); await b.close();
})();
