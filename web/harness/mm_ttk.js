// time-to-kill: a level-30 monk (all skills at 10, weight 50) vs a pack of 8 Hollows, casting Fist-That-Was-A-Mountain and the flurry at them
// usage: HTML=... node mm_ttk.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.goto('file://' + process.env.HTML); await p.waitForTimeout(300);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'monk'; window.__spm.startGame('test'); }); await p.waitForTimeout(500);
  const r = await ev(() => new Promise(res => {
    const S = window.__spm, P = S.P, G = S.G, M = S.SK;
    P.level = 30; for (const id in M) if (M[id].cls === 'monk' && M[id].kind !== 'passive' && M[id].kind !== 'perk') { P.skills[id] = 4; P.hard[id] = 4; } S.rederive();
    for (const m of G.zone.monsters) m.hidden = true;
    P.hp = 1e6; for (let i = 0; i < 8; i++) { const m = S.makeMon('hollow', P.x + 1.5 + (i % 4) * 0.8, P.y - 1 + Math.floor(i / 4) * 1.2, 30, 'normal', []); m.state = 'chase'; m.hidden = false; G.zone.monsters.push(m); }
    const pack = G.zone.monsters.slice(-8), t0 = G.time; let casts = 0;
    const iv = setInterval(() => {
      P.mana = 999; P.weight = 50; const live = pack.filter(m => !m.dead);
      if (!live.length || G.time - t0 > 60) { clearInterval(iv); res({ t: +(G.time - t0).toFixed(1), casts, left: live.length, hp: pack[0].max, wmin: S.getD().wmin, wmax: S.getD().wmax, fist: window.__monk ? window.__monk.KS.fist() : null, d10: window.__monk ? window.__monk.KS.d('kfist', 10, 4) : null }); return; }
      if (P.cast <= 0) { const t = live[0]; S.castSkill(casts % 3 === 2 ? 'khands' : 'kfist', { x: t.x, y: t.y }); casts++; }
    }, 40);
  }));
  console.log(JSON.stringify(r)); await b.close();
})();
