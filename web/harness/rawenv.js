// raw (unlit) ground around the player: HTML=... node rawenv.js <zone> <out.png> [NEAR] [cells]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const H = process.env.HTML; await p.goto('file://' + H);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await ev(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'hemomancer'; window.__spm.startGame('test'); }); await wait(400);
  const zone = process.argv[2]; if (zone !== '-') { await ev(z => window.__spm.enterZone(z), zone); await wait(400); }
  const url = await ev(([near, n]) => {
    const S = window.__spm, z = S.G.zone, P = S.P, Z = window.__zt;
    let cx = Math.floor(P.x), cy = Math.floor(P.y);
    if (near) { const want = S.T[near.toUpperCase()]; let best = 0; for (let y = 4; y < z.h - 4; y += 2) for (let x = 4; x < z.w - 4; x += 2) { let k = 0; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (z.get(x + i, y + j) === want) k++; if (k > best && k < 40) { best = k; cx = x; cy = y; } } }
    const ci = Math.floor(cx / Z.ZT_CH), cj = Math.floor(cy / Z.ZT_CH), R = n;
    const chs = []; for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) chs.push(Z.ztPaintChunk(z, ci + i, cj + j));
    const X0 = Math.min(...chs.map(c => c.X0)), Y0 = Math.min(...chs.map(c => c.Y0)), X1 = Math.max(...chs.map(c => c.X0 + c.c.width)), Y1 = Math.max(...chs.map(c => c.Y0 + c.c.height));
    const c = document.createElement('canvas'); c.width = X1 - X0; c.height = Y1 - Y0; const x = c.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0, 0, c.width, c.height);
    for (const ch of chs) x.drawImage(ch.c, ch.X0 - X0, ch.Y0 - Y0);
    return c.toDataURL();
  }, [process.argv[4] || '', +(process.argv[5] || 1)]);
  require('fs').writeFileSync(process.argv[3], Buffer.from(url.split(',')[1], 'base64'));
  console.log(errs); await b.close();
})();
