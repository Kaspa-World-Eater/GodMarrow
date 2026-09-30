// the monk beside the Iron Golem, in game, for scale. usage: HTML=... node mm_scale.js out.png
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.HTML); await p.waitForTimeout(300);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'monk'; window.__spm.startGame('test'); }); await p.waitForTimeout(500);
  await ev(() => { const S = window.__spm, P = S.P, G = S.G; for (const k in G.panels) G.panels[k] = false; P.hp = 1e6; for (const m of G.zone.monsters) m.hidden = true; G.clock = 600 * 0.2; const g = window.__mkGolem(P.x + 2.6, P.y - 2.6); g.state = 'idle'; g.hp = g.max; const m = S.makeMon('hollow', P.x - 2.4, P.y + 2.4, 5, 'normal', []); m.state = 'idle'; m.hidden = false; m.hp = m.max = 9999; G.zone.monsters.push(m); });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: process.argv[2] || '/tmp/mm_scale.png' });
  console.log(errs.slice(0, 3)); await b.close();
})();
