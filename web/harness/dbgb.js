const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'ossumancer'; window.__spm.startGame('test'); });
  await p.waitForTimeout(600); await p.evaluate(() => { const S = window.__spm; S.P.skills.raise = 6; S.rederive(); });
  await p.waitForTimeout(4000);
  console.log(await p.evaluate(() => { const S = window.__spm, P = S.P; return JSON.stringify({ cls: P.cls, raise: P.skills.raise, want: S.P.squads.map(s => s.n), next: S.nextSquad(), fusing: P.fusing, summonT: P.summonT, cap: S.getD().shardCap, skels: S.G.skels.length, marrow: P.marrow, mc: S.BS.marrowCap(), live: S.G.skels.filter(e=>!e.temp).length, res: 0, pul: P.pulling, paused: S.G.paused, zone: !!S.G.zone }); }), errs);
  await b.close();
})();
