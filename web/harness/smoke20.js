const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const shots = [];
  for (const [cls, list, act] of [
    ['ossumancer', [['o_chanter', 'u'], ['o_bowyer', 'u'], ['o_pyredead', 'r'], ['o_reliq', 'r']], 'bone'],
    ['hemomancer', [['h_giant', 'r'], ['h_graft', 'r'], ['h_tide', 'r']], 'blood'],
    ['animancer', [['a_anvil', 'r'], ['a_sage', 'r'], ['a_pyre', 'u']], 'anim']]) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } });
    await p.goto('file://' + process.cwd() + '/spiritmancer.html');
    await p.click(`.cls[data-cls=${cls}]`); await p.click('#testBtn'); await p.waitForTimeout(400); await p.keyboard.press('Escape');
    await p.evaluate(([list]) => { const S = window.__spm, { P, SK, G } = S; for (const id in SK) if (SK[id].cls === P.cls) P.hard[id] = 12; P.arc = S.newArc(); for (const [k, o] of list) P.arc.taken[k] = o; S.rederive(); P.hp = 1e6; P.squads[0].load = 'mage'; P.squads[1].load = 'bow'; S.rearm(); P.shards = 999; P.muts = ['maw', 'tentacles']; }, [list]);
    await p.waitForTimeout(3500);
    await p.evaluate(() => { const { P, G } = window.__spm; const alive = G.zone.monsters.filter(m => !m.dead); const ms = alive.slice(0, 6); ms.forEach((m, i) => { m.x = P.x + 3 + (i % 3) * 0.8; m.y = P.y - 1 + Math.floor(i / 3) * 1.2; m.hp = m.max = 400; m.state = 'chase'; }); for (const e of G.skels) { e.x = P.x + Math.random(); e.y = P.y + Math.random(); } });
    const act2 = act;
    if (act2 === 'bone') { await p.evaluate(() => { const S = window.__spm; S.P.mana = 999; S.castSkill('spikes', { x: S.P.x + 3, y: S.P.y }); }); await p.waitForTimeout(1500); await p.evaluate(() => { const S = window.__spm; S.P.cast = 0; S.toggleHost(); }); await p.waitForTimeout(1200); }
    if (act2 === 'blood') { await p.evaluate(() => { const S = window.__spm, P = S.P; for (let i = 0; i < 4; i++) S.hatchLing(P.x + 0.5, P.y, true); P.cast = 0; S.castSkill('fgolem', { x: P.x + 1, y: P.y }); }); await p.waitForTimeout(800); await p.evaluate(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castSkill('blance', { x: P.x + 2, y: P.y }); }); await p.waitForTimeout(120); }
    if (act2 === 'anim') { await p.evaluate(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castSkill('golem', { x: P.x + 1, y: P.y }); P.cast = 0; S.castSkill('swarm', { x: P.x + 3, y: P.y }); P.cast = 0; S.castSkill('storm', { x: P.x + 3.5, y: P.y }); }); await p.waitForTimeout(900); }
    const f = `shot20_${cls}.png`; await p.screenshot({ path: f }); shots.push(f);
    await p.close();
  }
  await b.close();
})();
