const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.HTML);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'hemomancer'; S.startGame('test'); });
  await wait(1500);
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; });
  await wait(800);
  await p.screenshot({ path: process.env.OUT + '_idle.png' });
  await ev(() => { const S = window.__spm; S.P.hp = 1e6; });
  await p.mouse.move(1500, 700); await p.mouse.down(); await wait(900);
  await p.screenshot({ path: process.env.OUT + '_walk.png' }); await p.mouse.up();
  const info = await ev(() => { const S = window.__spm, P = S.P; return { cls: P.cls, pose: S.heroPose ? 1 : 0, r3: typeof window.__r3Frame }; });
  console.log(JSON.stringify(info), 'ERRS', errs.length ? errs.slice(0,5).join('\n') : 'none'); await b.close();
})();
