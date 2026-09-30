const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  for (const [cls, zone, sk] of [['animancer', null, 'swarm'], ['ossumancer', 'crypt', 'spear'], ['hemomancer', 'fen', 'blance'], ['miasmancer', 'barrow', 'rarc']]) {
    await ev(() => { window.__spm.G.running = false; document.getElementById('intro').hidden = false; });
    await p.evaluate(c => { window.__spm.G.pickCls = c; window.__spm.startGame('test'); }, cls); await wait(400); await p.keyboard.press('Escape');
    if (zone) { await ev(z => window.__spm.enterZone(z), zone); await wait(500); }
    await ev(([sk]) => { const S = window.__spm, { P, G } = S; for (const k of Object.keys(S.SK)) if (S.SK[k].cls === P.cls || (!S.SK[k].cls && P.cls === 'animancer')) P.hard[k] = Math.max(P.hard[k] || 0, 5); S.rederive(); P.mana = 9999;
      const ms = G.zone.monsters.filter(m => !m.dead && m.rank !== 'boss').slice(0, 6); ms.forEach((m, i) => { m.x = P.x + 2.5 + (i % 3) * 0.9; m.y = P.y - 1.5 + Math.floor(i / 3) * 1.5; m.hp = m.max = 9999; m.state = 'chase'; }); P.hp = 99999; P.right = sk; }, [sk]);
    for (let i = 0; i < 8; i++) { await ev(([sk]) => { const S = window.__spm, P = S.P; P.cast = 0; P.mana = 9999; S.castSkill(sk, { x: P.x + 3, y: P.y }); }, [sk]); await wait(180); }
    await wait(200);
    await p.screenshot({ path: `shot17_${cls}.png`, clip: { x: 280, y: 110, width: 400, height: 260 } });
  }
  console.log(errs); await b.close();
})();
