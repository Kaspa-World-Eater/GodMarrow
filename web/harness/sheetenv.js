// a sheet of environment frames: HTML=... node sheetenv.js trees|walls <out.png> [zoom]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + process.env.HTML); await p.waitForTimeout(300);
  const what = process.argv[2], Z = +(process.argv[4] || 3);
  const url = await p.evaluate(([what, Z]) => {
    const Zt = window.__zt, frames = [];
    if (what === 'objs') { for (const [k, st] of [['chest', 0], ['chest', 1], ['shrine', 0], ['shrine', 1], ['lantern', 0], ['cave', 0], ['gate', 0], ['stairs', 0], ['vendor', 0]]) frames.push(Zt.ztObjFrame(k, st).c); for (const g of ['bone', 'flesh', 'breath', 'hollow']) frames.push(Zt.ztAltarFrame(g).c); for (let v = 0; v < 3; v++) frames.push(Zt.ztStatueFrame(v).c); }
    if (what === 'props') { for (const k of ['grave', 'cairn', 'shrub', 'stump', 'coffin', 'pillar', 'bones', 'fungus', 'brazier', 'candles']) for (let v = 0; v < 4; v++) frames.push(Zt.ztPropFrame(k, v).c); frames.push(Zt.ztPropFrame('gibbetPost', 0).c, Zt.ztPropFrame('cage', 0).c); }
    if (what === 'trees') for (let k = 0; k < 10; k++) for (let s = 0; s < 2; s++) frames.push(Zt.ztTreeFrame(k, s).c);
    const W = 1600, pad = 6; let x = pad, y = pad, rowH = 0; const pos = [];
    for (const f of frames) { if (x + f.width * Z > W) { x = pad; y += rowH + pad; rowH = 0; } pos.push([x, y]); x += f.width * Z + pad; rowH = Math.max(rowH, f.height * Z); }
    const c = document.createElement('canvas'); c.width = W; c.height = y + rowH + pad; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#2a2320'; g.fillRect(0, 0, c.width, c.height);
    frames.forEach((f, i) => g.drawImage(f, pos[i][0], pos[i][1], f.width * Z, f.height * Z));
    return c.toDataURL();
  }, [what, Z]);
  require('fs').writeFileSync(process.argv[3], Buffer.from(url.split(',')[1], 'base64')); console.log(errs); await b.close();
})();
