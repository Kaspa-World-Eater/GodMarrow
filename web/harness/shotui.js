const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.evaluate(() => { window.__spm.G.pickCls = 'ossumancer'; window.__spm.startGame('test'); }); await p.waitForTimeout(800);
  for (const [n, fn] of [['inv', 'inv'], ['skills', 'skills'], ['char', 'char'], ['army', 'army']]) {
    await p.evaluate(k => { const G = window.__spm.G; for (const q in G.panels) G.panels[q] = false; G.panels[k] = true; }, fn); await p.mouse.move(700, 150); await p.waitForTimeout(300);
    await p.screenshot({ path: `shotui_${n}.png` });
  }
  console.log(errs); await b.close();
})();
