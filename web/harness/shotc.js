const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.click('#testBtn'); await p.waitForTimeout(300); await p.keyboard.press('Escape');
  await p.evaluate(() => { const { learn, castSkill, P } = window.__spm; for (let i = 0; i < 3; i++) { learn('golem'); learn('pillars'); } P.cast = 0; castSkill('golem', { x: P.x + 1.5, y: P.y }); });
  await p.waitForTimeout(3200);
  await p.screenshot({ path: 'shot6_centaur.png' });
  const { execSync } = require('child_process');
  console.log(errs);
  await b.close();
})();
