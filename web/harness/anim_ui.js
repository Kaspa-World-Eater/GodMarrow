// the Animancer's skill tree (Mirror, Anima, Logos) and choir panel: HTML=/tmp/anim.html node anim_ui.js <prefix>
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); p.setDefaultTimeout(150000);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.HTML); const pre = process.argv[2] || 'anim_ui';
  await p.evaluate(() => { const S = window.__spm; S.G.pickCls = 'animancer'; S.startGame('test'); }); await p.waitForTimeout(800);
  await p.evaluate(() => { const S = window.__spm, P = S.P; for (const k of Object.keys(S.SK)) if ((S.SK[k].cls || 'animancer') === 'animancer') { P.skills[k] = 6; P.hard[k] = 6; } S.rederive(); });
  for (const t of [0, 1, 2]) {
    await p.evaluate(t => { const G = window.__spm.G; for (const q in G.panels) G.panels[q] = false; G.panels.skills = true; G.tab = t; }, t);
    await p.mouse.move(t === 0 ? 105 : 170, t === 0 ? 150 : 200); await p.waitForTimeout(400);
    await p.screenshot({ path: `${pre}_tree${t}.png` });
  }
  await p.evaluate(() => { const G = window.__spm.G; for (const q in G.panels) G.panels[q] = false; G.panels.choir = true; window.__spm.P.alloc = { beam: 2, prism: 2 }; }); await p.waitForTimeout(400);
  await p.screenshot({ path: `${pre}_choir.png` });
  console.log('ERRS', errs.length ? errs.join('\n') : 'none'); await b.close();
})();
