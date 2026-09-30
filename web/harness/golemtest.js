const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'animancer'; window.__spm.startGame('test'); }); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { const S = window.__spm, P = S.P, G = S.G; P.hard.golem = P.skills.golem = 5; S.rederive(); P.mana = 999; P.cast = 0;
    S.castSkill('golem', { x: P.x + 2, y: P.y }); const g = G.golem; g.hp = 0; g.state = 'dormant'; g.rt = g.rtMax = 15; g.downT = 0; P.cast = 0;
    const out = {}; out.made = !!g;
    // let it fall dormant
    return out; });
  await p.waitForTimeout(300);
  const r2 = await p.evaluate(() => { const S = window.__spm, P = S.P, G = S.G, g = G.golem; const st = g.state; P.cast = 0; P.mana = 999;
    S.castSkill('golem', { x: g.x, y: g.y }); const gone = !G.golem; P.cast = 0; P.mana = 999; S.castSkill('golem', { x: P.x + 2, y: P.y }); return { st, gone, after: G.golem && G.golem.state, hp: G.golem && G.golem.hp }; });
  // right-click attack binding
  const r3 = await p.evaluate(() => { const S = window.__spm; S.P.right = 'attack'; S.P.cast = 0; S.P.swing = 0; S.castSkill('attack'); return { swing: S.P.swing }; });
  console.log(JSON.stringify({ r, r2, r3 }), errs.slice(0, 3)); await b.close();
})();
