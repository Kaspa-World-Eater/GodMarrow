// screenshot a skill tooltip at 1920x1080
// usage: HTML=/tmp/names.html CLS=ossumancer TAB=1 SID=spear OUT=/tmp/shot.png node shot_tip.js
const { chromium } = require('playwright');
(async () => {
  const HTML = process.env.HTML || '/tmp/names.html';
  const CLS  = process.env.CLS  || 'ossumancer';
  const TAB  = parseInt(process.env.TAB || '1', 10);
  const SID  = process.env.SID  || 'spear';
  const OUT  = process.env.OUT  || '/tmp/shot.png';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('pageerror:', e.message));
  await p.goto('file://' + HTML);
  const wait = ms => p.waitForTimeout(ms);
  // start test character in the requested class, open the skills panel, pick the tab
  await p.evaluate(cls => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = cls; S.startGame('test'); }, CLS);
  await wait(600);
  await p.evaluate(([tab, sid]) => {
    const S = window.__spm;
    for (const k in S.G.panels) S.G.panels[k] = false;
    S.G.panels.skills = true;
    S.G.tab = tab;
    // put the mouse over the skill's icon in logical coords
    const s = S.SK[sid];
    const cx = 30 + s.c * 58, cy = 42 + s.r * 31;
    S.mouse.x = cx; S.mouse.y = cy;
    // hint to zz_ui_desc that Shift is held so the numeric tooltip shows too
    S.G_.tipMore = true;
  }, [TAB, SID]);
  // let a couple of frames run so drawSkills paints the tooltip
  await wait(300);
  // hold mouse in place every frame in case something resets it
  await p.evaluate(([tab, sid]) => {
    const S = window.__spm; const s = S.SK[sid];
    const cx = 30 + s.c * 58, cy = 42 + s.r * 31;
    S.mouse.x = cx; S.mouse.y = cy; S.G.tab = tab;
  }, [TAB, SID]);
  await wait(200);
  await p.screenshot({ path: OUT });
  await b.close();
  console.log('wrote', OUT);
})();
