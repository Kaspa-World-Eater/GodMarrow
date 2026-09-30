const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.HTML);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'hemomancer'; S.startGame('test'); });
  await wait(1500);

  const stripPath = process.env.OUT + '_walk_strip.png';
  await ev(({ stripPath }) => {
    const H = window.__r5Hemo;
    const scale = 5, pad = 6, W = H.WALK_BAKED[0].width, Hh = H.WALK_BAKED[0].height;
    const c = document.createElement('canvas');
    c.width = (W * scale + pad) * 8 + pad;
    c.height = Hh * scale + pad * 2 + 30;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = '#0a0507'; cx.fillRect(0, 0, c.width, c.height);
    cx.fillStyle = '#8a5a3c'; cx.font = '14px monospace';
    cx.fillText('r5 walk-front M2  frames 0..7  @ 5x  (F0 contactL, F3 highL, F4 contactR, F7 highR)', pad, 20);
    for (let i = 0; i < 8; i++) {
      const x0 = pad + i * (W * scale + pad);
      cx.drawImage(H.WALK_BAKED[i], x0, 30 + pad, W * scale, Hh * scale);
      cx.fillStyle = '#5c3a24';
      cx.fillText('f' + i, x0 + 4, 30 + pad + Hh * scale + 14);
    }
    window.__stripDataURL = c.toDataURL('image/png');
  }, { stripPath });
  const stripDataURL = await ev(() => window.__stripDataURL);
  require('fs').writeFileSync(stripPath, Buffer.from(stripDataURL.split(',')[1], 'base64'));

  // Force walking pose for in-game shot: give the character a movement target
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; if (S.P) { S.P.tx = S.P.x + 200; S.P.ty = S.P.y; } });
  await wait(300);
  await p.screenshot({ path: process.env.OUT + '_walk_ingame.png' });

  const info = await ev(() => {
    const S = window.__spm, P = S.P;
    return {
      cls: P.cls,
      walkFrames: window.__r5Hemo.WALK_BAKED.length,
      idleFrames: window.__r5Hemo.BAKED.length,
      w: window.__r5Hemo.WALK_BAKED[0].width, h: window.__r5Hemo.WALK_BAKED[0].height
    };
  });
  console.log(JSON.stringify(info), 'ERRS', errs.length ? errs.slice(0, 5).join('\n') : 'none');
  await b.close();
})();
