// flesh golem sprite sheet: HTML=/tmp/flesh.html node fgsheet.js out.png [Z] [old]
// rows: front / back views of every pose, plus the iron golem and a spawnling for scale; a strip at game zoom
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  const H = process.env.HTML || '/tmp/flesh.html'; await p.goto('file://' + H); await p.waitForTimeout(300);
  const out = process.argv[2] || '/tmp/fg_sheet.png', Z = +(process.argv[3] || 4), old = process.argv[4] === 'old';
  const url = await p.evaluate(([Z, old, STOCK]) => {
    const ev = window.__mn32.ev;
    const poses = [['idle', 0], ['idle', 2], ['walk', 0], ['walk', 2], ['walk', 4], ['walk', 6], ['wind', 0], ['atk', 0], ['atk', 1], ['atk', 2], ['puke', 0], ['puke', 1], ['puke', 2], ['eat', 0], ['eat', 1]];
    const get = (pose, ph, view, st) => old ? ev(`mnFGolemFrame({pose:'${pose === 'puke' || pose === 'eat' ? 'idle' : pose}',ph:${ph % 4},view:'${view}',open:0,meals:2},1)`)
      : ev(`fgFrame({pose:'${pose}',ph:${ph},view:'${view}',stock:${st}},1)`);
    const rows = [['front', STOCK], ['back', STOCK], ['front', 0], ['front', 3]];
    const f0 = get('idle', 0, 'front', 2), fw = f0.w * Z, fh = f0.h * Z, cols = poses.length;
    const c = document.createElement('canvas'); c.width = cols * (fw + 4) + 4; c.height = rows.length * (fh + 4) + 4 + 260; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#16191b'; x.fillRect(0, 0, c.width, c.height);
    rows.forEach(([v, st], r) => poses.forEach(([po, ph], i) => {
      const fr = get(po, ph, v, st), X = 4 + i * (fw + 4), Y = 4 + r * (fh + 4);
      x.fillStyle = (i + r) % 2 ? '#3a3632' : '#423d38'; x.fillRect(X, Y, fw, fh); x.drawImage(fr.c, X, Y, fr.w * Z, fr.h * Z);
      x.fillStyle = '#aaa'; x.font = '12px monospace'; x.fillText(po + ph + ' ' + v[0] + st, X + 3, Y + 13);
    }));
    // game-zoom strip: the golem next to the iron golem and a spawnling, drawn at 1x and 2x on a floor tone
    const Y0 = 4 + rows.length * (fh + 4);
    x.fillStyle = '#2c2620'; x.fillRect(0, Y0, c.width, 260);
    const ig = ev(`mnGolemFrame('idle',0,{view:'front',wpn:'sword'})`), ln = ev(`mnLingFrame(0,false,'front')`);
    const strip = (K, y) => {
      let X = 10;
      for (const [po, ph] of [['idle', 0], ['walk', 2], ['atk', 2], ['puke', 1], ['eat', 1]]) { const fr = get(po, ph, 'front', 2); x.drawImage(fr.c, X, y - fr.oy * K, fr.w * K, fr.h * K); X += fr.w * K + 4; }
      x.drawImage(ig.c, X, y - ig.oy * K, ig.w * K, ig.h * K); X += ig.w * K + 4;
      x.drawImage(ln.c, X, y - ln.oy * K, ln.w * K, ln.h * K); X += ln.w * K + 4; x.drawImage(ln.c, X, y - ln.oy * K, ln.w * K, ln.h * K);
    };
    strip(1, Y0 + 80); strip(2, Y0 + 250);
    return c.toDataURL();
  }, [Z, old, +(process.env.STOCK || 2)]);
  require('fs').writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
