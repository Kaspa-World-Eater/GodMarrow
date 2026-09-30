const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.waitForTimeout(300);
  const types = (process.argv[3] || 'hollow,hand,weeper,gasp,pyre,bell,worm,moth,warden,duelist').split(','), S0 = +(process.argv[4] || 3);
  await p.evaluate(([types, S0]) => {
    const S = window.__spm;
    const cv = document.createElement('canvas'); cv.width = 1500; cv.height = 1100; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99';
    document.body.appendChild(cv); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#2e2a33'; x.fillRect(0, 0, 1500, 1100);
    let py = 8; const poses = [['idle', 0], ['idle', 1], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['wind', 0], ['atk', 0], ['parry', 0]];
    for (const t of types) { let px = 8, mh = 0;
      for (const [po, ph] of poses) { if (po === 'parry' && t !== 'duelist') continue; const pal = t === 'pyre' && po === 'parry' ? Object.assign({}, S.MPAL[t], { _doused: 1 }) : S.MPAL[t]; const fr = S.monFrame(t, 'g' + po, pal, po, ph); x.drawImage(fr.c._hr || fr.c, px, py, fr.w * S0, fr.h * S0); px += fr.w * S0 + 4; mh = Math.max(mh, fr.h * S0); }
      if (t === 'pyre') { const pal = Object.assign({}, S.MPAL[t], { _doused: 1 }); const fr = S.monFrame(t, 'dz', pal, 'walk', 1); x.drawImage(fr.c._hr, px, py, fr.w * S0, fr.h * S0); }
      py += mh + 4; }
  }, [types, S0]);
  await p.screenshot({ path: process.argv[2] || 'hgal22.png' }); console.log(errs); await b.close();
})();
