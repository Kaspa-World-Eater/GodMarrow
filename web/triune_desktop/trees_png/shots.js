// screenshots of every class's skill page, every tab. OUT=prefix  LEVEL=n  SPEND=1 (spend points in greedy valid order)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.HTML);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  for (const cls of ['animancer', 'ossumancer', 'hemomancer', 'miasmancer', 'monk']) {
    await ev(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, cls);
    await wait(700);
    await ev(lv => { const S = window.__spm, P = S.P; for (const k in S.G.panels) S.G.panels[k] = false; P.hp = 1e6; P.level = lv; P.skillPts = 0; S.G.panels.skills = true; }, +(process.env.LEVEL || 30));
    for (let t = 0; t < 3; t++) {
      await ev(t => { const S = window.__spm; S.G.tab = t; S.mouse.x = -100; S.mouse.y = -100; }, t);
      await p.mouse.move(1900, 1070); await wait(250);
      await p.screenshot({ path: `${process.env.OUT}_${cls}_${t}.png` });
    }
  }
  console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 5).join('\n') : 'none'); await b.close();
})();
