// animancer hero-pass sheet: node ab_poses.js out.png "pose:ph:view,..." [Z] [eqJSON]   (HTML=...)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  const H = process.env.HTML || 'spiritmancer.html'; await p.goto('file://' + (H[0] === '/' ? H : process.cwd() + '/' + H)); await p.waitForTimeout(300);
  const out = process.argv[2] || '/tmp/ab.png', spec = process.argv[3] || 'idle:0:front', Z = +(process.argv[4] || 5), eq = process.argv[5] || '', cols = +(process.env.COLS || 8);
  const data = await p.evaluate(([spec, Z, eq, cols, night]) => {
    const S = window.__spm; if (eq) S.P.eq = JSON.parse(eq);
    if (night) { S.G.running = true; S.G.zone = S.G.zone || { theme: 'moor' }; }
    const items = spec.split(',').map(s => s.split(':'));
    const frs = items.map(([po, ph, v]) => [po + ' ' + ph + ' ' + v, S.heroFrame('animancer', po, +ph, v || 'front')]);
    const fw = frs[0][1].w * Z, fh = frs[0][1].h * Z;
    const cv = document.createElement('canvas'); cv.width = cols * (fw + 4) + 4; cv.height = Math.ceil(frs.length / cols) * (fh + 4) + 4; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#16191b'; x.fillRect(0, 0, cv.width, cv.height);
    frs.forEach(([lab, fr], i) => { const X = 4 + (i % cols) * (fw + 4), Y = 4 + Math.floor(i / cols) * (fh + 4); x.fillStyle = '#23282a'; x.fillRect(X, Y, fw, fh); x.drawImage(fr.c, X, Y, fw, fh); x.fillStyle = '#8f8a9a'; x.font = '12px monospace'; x.fillText(lab, X + 3, Y + 12); });
    return cv.toDataURL();
  }, [spec, Z, eq, cols, process.env.NIGHT || '']);
  require('fs').writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(errs); await b.close();
})();
