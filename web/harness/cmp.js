const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = [];
  for (const [den, mode] of [[1, ''], [2, 'cel'], [4, 'cel'], [4, '']]) {
    const p = await b.newPage();
    await p.addInitScript(([d, m]) => { window.__pxDen = d; window.__pxMode = m; }, [den, mode]);
    await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.waitForTimeout(300);
    out.push(await p.evaluate(() => {
      const S = window.__spm; S.P.eq = { body: { base: 'robe' }, weapon: { base: 'staff' } };
      const fs = [S.heroFrame('hemomancer', 'idle', 0), S.monFrame('hollow', 'show', Object.assign({}, S.MPAL.hollow || {}), 'walk', 2)];
      const cv = document.createElement('canvas'); cv.width = 2 * 60 * 6; cv.height = 56 * 6; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#16191b'; x.fillRect(0, 0, cv.width, cv.height);
      fs.forEach((f, i) => x.drawImage(f.c._hr || f.c, i * 360 + 20, 10, f.w * 6, f.h * 6));
      return cv.toDataURL();
    }));
    await p.close();
  }
  require('fs').writeFileSync('/tmp/cmp.json', JSON.stringify(out)); await b.close();
})();
