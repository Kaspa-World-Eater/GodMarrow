// Snap the 4 Marrow Crush frames plus an in-game cast screenshot. Each frame is grabbed straight
// out of the ossumancer atlas via heroFrame('ossumancer','crush',k,'front') so what the sprite
// looks like in-game is exactly what the snap shows.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.HTML);
  const wait = ms => p.waitForTimeout(ms);
  await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'ossumancer'; window.__spm.startGame('test'); });
  await wait(2000);
  await p.evaluate(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.P.hp = 1e6; S.P.mana = 1e6; });
  // dump 4 crush frames at 6x scale, front view
  const outDir = process.env.OUT_DIR || '/tmp/kito_crush';
  fs.mkdirSync(outDir, { recursive: true });
  const dumps = await p.evaluate(() => {
    const S = window.__spm, out = [];
    for (let k = 0; k < 4; k++) {
      const fr = S.heroFrame('ossumancer', 'crush', k, 'front');
      const src = fr._hr || fr.c._hr || fr.c;
      const c = document.createElement('canvas'); c.width = src.width * 6; c.height = src.height * 6;
      const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.fillStyle = '#0a0a10'; cx.fillRect(0, 0, c.width, c.height);
      cx.drawImage(src, 0, 0, c.width, c.height);
      out.push(c.toDataURL('image/png'));
    }
    return out;
  });
  for (let k = 0; k < 4; k++) {
    const b64 = dumps[k].split(',')[1];
    fs.writeFileSync(outDir + '/crush_' + k + '.png', Buffer.from(b64, 'base64'));
  }
  // also a strip of all 4 for the snap
  const strip = await p.evaluate(() => {
    const S = window.__spm;
    const frs = [0, 1, 2, 3].map(k => S.heroFrame('ossumancer', 'crush', k, 'front'));
    const src0 = frs[0]._hr || frs[0].c._hr || frs[0].c;
    const w = src0.width, h = src0.height, S6 = 5, pad = 8;
    const c = document.createElement('canvas'); c.width = (w * S6 + pad) * 4 + pad; c.height = h * S6 + pad * 2 + 32;
    const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false;
    cx.fillStyle = '#0a0a10'; cx.fillRect(0, 0, c.width, c.height);
    cx.fillStyle = '#c4a344'; cx.font = 'bold 18px sans-serif';
    cx.fillText('Marrow Crush (crush0..crush3) - 2H overhead crack, front view', pad, 22);
    for (let k = 0; k < 4; k++) {
      const src = frs[k]._hr || frs[k].c._hr || frs[k].c;
      cx.drawImage(src, pad + (w * S6 + pad) * k, 32 + pad, w * S6, h * S6);
      cx.fillStyle = '#c4a344'; cx.fillText('k=' + k, pad + (w * S6 + pad) * k + 4, 32 + pad + h * S6 - 6);
    }
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(outDir + '/crush_strip.png', Buffer.from(strip.split(',')[1], 'base64'));
  // in-game shot: force a crush cast and grab mid-swing
  await p.evaluate(() => {
    const S = window.__spm, P = S.P;
    P._melSk = 'crush'; P._ca0 = 0.5; P.cast = 0.25; P._sw0 = 0.5; P.swing = 0.25;
  });
  await wait(120);
  await p.screenshot({ path: outDir + '/crush_ingame.png', fullPage: false });
  console.log('ERRS', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
  await b.close();
})();
