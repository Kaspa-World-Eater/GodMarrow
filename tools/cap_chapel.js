// capture the old title's chapel (zp_title.js) without the Seer's bowl, lit by a fire on the floor instead
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file:///tmp/gd/x73_ev.html'); await p.waitForTimeout(2500);
  const out = await p.evaluate(() => window.__ev(`(() => {
    // the fire where the bowl stood: a warm low light on the floor; the blood's red bounce goes
    TT_LIGHTS[2] = { x: 330, y: 214, z: 16, i: 1.05, r: 92 };
    TT_LIGHTS[3].i = 0.35; TT_LIGHTS[4].i = 0.35;
    let src = ttBuildBg.toString();
    const a = src.indexOf('// ---- the bronze bowl'), z = src.indexOf('// ---- candles');
    src = src.slice(0, a) + src.slice(z);
    src = src.replace(/const sh = Math\\.hypot\\(\\(i - TT_BX\\)[^;]*;[^;]*;/, '');
    src = src.replace(/stain\\(300, 160[^\\n]*\\n/, '');
    const f = eval('(' + src + ')');
    const c = f();
    const bx = c.getContext('2d'); bx.globalCompositeOperation = 'lighter'; bx.drawImage(ttBuildShaft(), 0, 0); bx.globalCompositeOperation = 'source-over';
    return { png: c.toDataURL('image/png'), w: c.width, h: c.height, candles: TT_CANDLES, face: [TT_GX, TT_GY, TT_CHIN] };
  })()`));
  fs.writeFileSync('/tmp/gd/chapel.png', Buffer.from(out.png.split(',')[1], 'base64'));
  fs.writeFileSync('/tmp/gd/chapel.json', JSON.stringify({ w: out.w, h: out.h, candles: out.candles, face: out.face }));
  console.log(out.w, out.h, JSON.stringify(out.face));
  await b.close();
})();
