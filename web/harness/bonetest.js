const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'ossumancer'; window.__spm.startGame('test'); });
  await p.waitForTimeout(600); await p.evaluate(() => { const S = window.__spm; S.P.hard.raise = 6; S.P.hard.aura = 3; S.P.skills.raise = 6; S.P.skills.aura = 3; S.rederive(); });
  await p.waitForTimeout(8000);
  const r = await p.evaluate(() => { const S = window.__spm, P = S.P; return { skels: S.G.skels.length, marrow: P.marrow, shards: P.shards, auraKind: S.SK.aura.kind }; });
  const r2 = await p.evaluate(() => { const S = window.__spm, P = S.P; const n = S.G.skels.length; S.skelDies(S.G.skels[0]); return { before: n, after: S.G.skels.length, marrow: P.marrow }; });
  await p.waitForTimeout(3000);
  const r3 = await p.evaluate(() => ({ skels: window.__spm.G.skels.length, marrow: window.__spm.P.marrow }));
  console.log(JSON.stringify({ r, r2, r3 }), errs.slice(0, 3)); await b.close();
})();
