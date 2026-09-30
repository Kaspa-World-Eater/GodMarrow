const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.HTML);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), out = [];
  for (const cls of ['animancer', 'ossumancer', 'hemomancer', 'miasmancer', 'monk']) {
    await ev(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, cls);
    await wait(600);
    // no minions at level 1 without points
    await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.P.hp = 1e6; });
    await wait(3500);
    const mins = await ev(() => { const S = window.__spm, G = S.G, P = S.P; const pts = Object.keys(P.hard || {}).filter(k => P.hard[k] > 0); return { lvl: P.level, learned: pts, skels: (G.skels || []).length, brood: (G.brood || []).length, golem: !!G.golem, fgolem: !!G.fgolem, oozes: (G.oozes || G.thralls || []).length, sister: !!(G.sister || P.sister), kweep: !!(G.kweep || G.weeper) }; });
    // real click on the panel: a level-1 skill of tab 0 with a point
    const click = await ev(() => { const S = window.__spm, P = S.P, G = S.G; P.skillPts = 1; G.panels.skills = true; G.tab = 0; const id = Object.keys(S.SK).find(k => S.SK[k].cls === P.cls && S.SK[k].tab === 0 && S.SK[k].r === 0 && !S.SK[k].pre); const s = S.SK[id]; return { id, x: 30 + s.c * 58, y: 42 + s.r * 31 }; });
    const cv = await p.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, cw: c.width, ch: c.height }; });
    const sc = cv.w / (await ev(() => typeof W !== 'undefined' ? W : 480).catch(() => 480));
    await wait(200);
    const k = cv.h / 270;
    await p.mouse.move(cv.l + click.x * k, cv.t + click.y * k); await wait(150); await p.mouse.down(); await wait(60); await p.mouse.up(); await wait(200);
    const clicked = await ev(id => ({ l: window.__spm.P.hard[id] || 0, pts: window.__spm.P.skillPts }), click.id);
    // walk levels 1..30: one point per level plus plenty, learn greedily; record first level each skill can be learned
    const walk = await ev(() => {
      const S = window.__spm, P = S.P, SK = S.SK; const ids = Object.keys(SK).filter(k => SK[k].cls === P.cls);
      for (const k of ids) { P.hard[k] = 0; P.skills[k] = 0; } S.rederive();
      const first = {}, bad = [];
      for (let lv = 1; lv <= 30; lv++) {
        P.level = lv; let progress = true;
        while (progress) { progress = false; for (const k of ids) if (!first[k]) { P.skillPts = 1; if (S.learn(k)) { first[k] = lv; progress = true; P.skills[k] = P.hard[k]; S.rederive(); } } }
      }
      for (const k of ids) { if (!first[k]) bad.push(k + ':never'); else if (first[k] !== SK[k].req) bad.push(`${k}: first at ${first[k]} but req ${SK[k].req}`); const pr = SK[k].pre; if (pr && first[pr] > first[k]) bad.push(k + ' before its pre'); }
      return { n: ids.length, learned: Object.keys(first).length, bad };
    });
    out.push(`${cls}: minions at start ${JSON.stringify(mins)} | click-learn ${click.id} -> lvl ${clicked.l}, pts left ${clicked.pts} | walk ${walk.learned}/${walk.n} ${walk.bad.length ? 'BAD ' + walk.bad.join(', ') : 'ok'}`);
  }
  // cross-tab tooltip names the page
  await ev(() => { const S = window.__spm; S.G.pickCls = 'hemomancer'; S.startGame('test'); });
  await wait(600);
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.P.level = 12; S.G.panels.skills = true; S.G.tab = 1; });
  const cv = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, h: r.height }; }); const k = cv.h / 270;
  const s = await ev(() => { const x = window.__spm.SK.bfrenzy; return { x: 30 + x.c * 58, y: 42 + x.r * 31 }; });
  await p.mouse.move(cv.l + s.x * k, cv.t + s.y * k); await wait(400);
  await p.screenshot({ path: '/tmp/trees/tip_bfrenzy.png' });
  for (const x of out) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 5).join('\n') : 'none'); await b.close();
})();
