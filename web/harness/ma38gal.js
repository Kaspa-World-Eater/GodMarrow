// monA38 gallery: every pose of a creature (front row block, back row block), hr at Z. usage: HTML=.. node ma38gal.js type Z out.png [tint]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await p.goto('file://' + process.env.HTML); await p.waitForTimeout(300);
  const [type, Z, out, tint] = [process.argv[2], +process.argv[3], process.argv[4], process.argv[5] || ''];
  const r = await p.evaluate(([type, Z, tint]) => {
    const S = window.__spm, seq = [['idle', 4], ['walk', 8], ['wind', 3], ['atk', 3], ['hit', 2], ['death', 4]];
    const all = [], t0 = performance.now(); let n = 0;
    for (const view of ['front', 'back']) for (const [po, k] of seq) for (let ph = 0; ph < k; ph++) { const pal = Object.assign({}, S.MPAL[type] || {}, { tint: tint || null }); all.push([view, po, ph, S.monFrame(type, 'gal' + tint, pal, po, ph, view)]); n++; }
    const ms = (performance.now() - t0) / n;
    const f0 = all[0][3], DEN = f0.c._hr ? f0.c._hr.width / f0.w : 1, fw = f0.w * DEN * Z, fh = f0.h * DEN * Z, cols = 8;
    const cv = document.createElement('canvas'); cv.width = cols * (fw + 4) + 4; cv.height = Math.ceil(all.length / cols) * (fh + 4) + 4; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#101214'; x.fillRect(0, 0, cv.width, cv.height);
    all.forEach(([v, po, ph, fr], i) => { const X = 4 + (i % cols) * (fw + 4), Y = 4 + Math.floor(i / cols) * (fh + 4); x.fillStyle = '#26282a'; x.fillRect(X, Y, fw, fh); x.drawImage(fr.c._hr || fr.c, X, Y, fw, fh); x.fillStyle = '#5a5866'; x.font = '10px monospace'; x.fillText(v[0] + ' ' + po + ph, X + 3, Y + 11); });
    return { url: cv.toDataURL(), ms, err: window.__zsErr || '' };
  }, [type, Z, tint]);
  require('fs').writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
  console.log('ms/frame', r.ms.toFixed(1), r.err, errs.slice(0, 5)); await b.close();
})();
