// monA38 in-game shot: the hero with husks, drowned, bloats, worms, a champion, a corpse. HTML=.. node ma38shot.js cls out.png [night]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.env.HTML);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await ev(c => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = c; window.__spm.startGame('test'); }, process.argv[2] || 'hemomancer'); await wait(500);
  await ev(night => { const S = window.__spm, { G, P } = S; for (const k in G.panels) G.panels[k] = false; P.hp = 1e6; if (night) G.clock = 600 * 0.75;
    for (const m of G.zone.monsters) { m.hidden = true; m.dead = true; m.deadAt = -999; }
    const L = [['hollow', 2.2, -1.2], ['drowned', 3.4, 0.4], ['bloat', 1.2, 1.9], ['worm', -1.6, 1.6], ['leech', -2.6, -0.6], ['hollow', 0.5, -2.6, 'champion'], ['bloat', 3.6, -2.4, 'unique'], ['hollow', -1.2, -2.4]];
    const ms = L.map(([t, dx, dy, rk]) => { const m = S.makeMon(t, P.x + dx, P.y + dy, 5, rk || 'normal', []); m.hp = m.max = 1e6; m.spd = 0; m.r = 0; G.zone.monsters.push(m); return m; });
    const dead = S.makeMon('hollow', P.x - 0.4, P.y + 2.6, 5, 'normal', []); dead.dead = true; dead.deadAt = G.time - 2; G.zone.monsters.push(dead);
    const dead2 = S.makeMon('worm', P.x + 1.6, P.y + 3.4, 5, 'normal', []); dead2.dead = true; dead2.deadAt = G.time - 2; G.zone.monsters.push(dead2);
    window.__ms = ms;
  }, !!process.argv[4]);
  await wait(7500);
  await p.screenshot({ path: process.argv[3] || '/tmp/ma38shot.png', clip: { x: 240, y: 110, width: 480, height: 300 } });
  console.log(errs); await b.close();
})();
