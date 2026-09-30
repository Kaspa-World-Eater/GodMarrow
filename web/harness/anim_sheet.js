// the Animancer's mirror art on one sheet, 4x: HTML=/tmp/anim.html node anim_sheet.js out.png
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const H = process.env.HTML || 'spiritmancer.html';
  await p.goto('file://' + (H[0] === '/' ? H : process.cwd() + '/' + H)); await p.waitForTimeout(300);
  const url = await p.evaluate(() => window.__mn32.ev(`(() => {
    const frs = [anMirrorFrame(false, -1), anMirrorFrame(false, 3), anMirrorFrame(true, -1), mnSteleFrame(false), anGreatFrame(false), anGreatFrame(true), mnSlabFrame(),
      anCrackFrame(0), anCrackFrame(1), anCrackFrame(2), anCrackFrame(3), anSpikeFrame(0), anSpikeFrame(1), anSpikeFrame(2), mnWispFrame('lance', 0), mnWispFrame('bolt', 1), mnWispFrame('beam', 2), mnWispFrame('prism', 3)];
    const K = 4, pad = 6; let W = pad, Hh = 0; for (const f of frs) { W += f.w * K + pad; Hh = Math.max(Hh, f.h * K); }
    const c = document.createElement('canvas'); c.width = W; c.height = Hh + pad * 2; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#2a2622'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#3a342e'; for (let i = 0; i < c.width; i += 16) x.fillRect(i, 0, 8, c.height);
    let X = pad; for (const f of frs) { x.drawImage(f.c, X, pad + Hh - f.h * K, f.w * K, f.h * K); X += f.w * K + pad; }
    return c.toDataURL();
  })()`));
  require('fs').writeFileSync(process.argv[2] || 'anim_sheet.png', Buffer.from(url.split(',')[1], 'base64'));
  console.log('ERRS', errs.length ? errs.join('\n') : 'none'); await b.close();
})();
