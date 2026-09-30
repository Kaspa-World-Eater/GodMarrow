const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.HTML); await p.waitForTimeout(300);
  const Z = +process.argv[2], out = process.argv[3], pose = process.argv[4] || 'idle', ph = +(process.argv[5] || 0);
  const d = await p.evaluate(([Z, pose, ph]) => {
    const S = window.__spm, cls = ['hemomancer', 'animancer', 'ossumancer', 'miasmancer'];
    const cf = [{}, { body: { base: 'robe' } }, { body: { base: 'mail' } }, { body: { base: 'robe' }, head: { base: 'hood' } }, { body: { base: 'mail', q: 'unique' }, head: { base: 'mask' } }, { body: { base: 'mail' }, head: { base: 'hood' } }];
    const fw = 46 * Z, fh = 52 * Z, cv = document.createElement('canvas'); cv.width = cf.length * fw + 46 * cf.length + 8; cv.height = cls.length * fh;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#1c1f21'; x.fillRect(0, 0, cv.width, cv.height);
    cls.forEach((c, r) => cf.forEach((e, i) => { S.P.eq = e; const f = S.heroFrame(c, pose, ph); x.drawImage(f.c, i * fw, r * fh, fw, fh); x.drawImage(f.c, cf.length * fw + 8 + i * 46, r * fh); }));
    return cv.toDataURL();
  }, [Z, pose, ph]);
  require('fs').writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log(errs); await b.close();
})();
