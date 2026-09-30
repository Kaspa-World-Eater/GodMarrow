// frame-time probe: HTML=... node anim_perf.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); p.setDefaultTimeout(150000);
  await p.goto('file://' + process.env.HTML);
  await p.evaluate(() => { const S = window.__spm; S.G.pickCls = 'animancer'; S.startGame('test'); }); await p.waitForTimeout(800);
  await p.evaluate(() => { const S = window.__spm, P = S.P, G = S.G; for (const k in G.panels) G.panels[k] = false; G.zone.monsters.forEach(m => { m.dead = true; });
    for (const k of Object.keys(S.SK)) if ((S.SK[k].cls || 'animancer') === 'animancer') { P.skills[k] = 10; P.hard[k] = 10; } S.rederive(); P.hp = 1e6; S.getD().maxHp = 1e6; P.mana = 9999; P.alloc = { beam: 4, prism: 3 };
    for (const [dx, dy] of [[3, 0.5], [4, -1], [5, 1], [3.5, 2.5], [6, -0.5], [4.5, 3.5]]) { const m = S.makeMon('hollow', P.x + dx, P.y + dy, 5, 'normal', []); m.hp = m.max = 1e6; m.b = { ...m.b, ai: 'none' }; m.spd = 0.0001; G.zone.monsters.push(m); }
    S.castSkill('pillars', { x: P.x + 3, y: P.y }); S.castSkill('golem', { x: P.x + 1, y: P.y + 2 }); });
  await p.waitForTimeout(1000);
  const r = await p.evaluate(() => new Promise(res => { const t0 = performance.now(), g0 = window.__spm.G.time; let n = 0; const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res({ fps: n / 4, gameSecPerSec: (window.__spm.G.time - g0) / 4 }); }; requestAnimationFrame(f); }));
  console.log(process.env.HTML, JSON.stringify(r)); await b.close();
})();
