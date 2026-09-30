// renders a creature's frames big, on a dark ground, plus a walk-cycle GIF (via python)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.waitForTimeout(300);
  const type = process.argv[2] || 'hollow', Z = +(process.argv[3] || 4), out = process.argv[4] || 'show_' + type;
  const data = await p.evaluate(([type, Z]) => {
    const S = window.__spm, poses = [['idle', 0], ['idle', 1], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['wind', 0], ['atk', 0]];
    const pal = Object.assign({}, S.MPAL[type] || {});
    const frames = poses.map(([po, ph]) => S.monFrame(type, 'show', pal, po, ph));
    const fw = frames[0].w * 2 * Z, fh = frames[0].h * 2 * Z;
    const cv = document.createElement('canvas'); cv.width = fw * 4 + 50; cv.height = fh * 2 + 30; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#1e2224'; x.fillRect(0, 0, cv.width, cv.height);
    frames.forEach((fr, i) => { const X = 10 + (i % 4) * (fw + 10), Y = 10 + Math.floor(i / 4) * (fh + 10); x.fillStyle = '#262b2d'; x.fillRect(X, Y, fw, fh); x.drawImage(fr.c._hr, X, Y, fw, fh); });
    const sheet = cv.toDataURL();
    const walk = [2, 3, 4, 5].map(i => { const c = document.createElement('canvas'); c.width = fw; c.height = fh; const q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.fillStyle = '#1e2224'; q.fillRect(0, 0, fw, fh); q.drawImage(frames[i].c._hr, 0, 0, fw, fh); return c.toDataURL(); });
    const atk = [0, 6, 7, 0].map(i => { const c = document.createElement('canvas'); c.width = fw; c.height = fh; const q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.fillStyle = '#1e2224'; q.fillRect(0, 0, fw, fh); q.drawImage(frames[i].c._hr, 0, 0, fw, fh); return c.toDataURL(); });
    return { sheet, walk, atk };
  }, [type, Z]);
  const fs = require('fs'); const w = (n, d) => fs.writeFileSync(n, Buffer.from(d.split(',')[1], 'base64'));
  w(out + '.png', data.sheet); data.walk.forEach((d, i) => w(`/tmp/${out}_w${i}.png`, d)); data.atk.forEach((d, i) => w(`/tmp/${out}_a${i}.png`, d));
  console.log(errs); await b.close();
})();
