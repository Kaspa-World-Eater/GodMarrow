const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const out = await p.evaluate(() => { const R = {}, PH = { idle: 4, walk: 8, atk: 4, cast: 4 };
   for (const pose in PH) for (const view of ['front', 'back', 'side', 'down', 'up']) for (let ph = 0; ph < PH[pose]; ph++) {
     if ((view === 'down' || view === 'up') && !(pose === 'idle' || pose === 'walk')) continue;
     R[pose + '/' + view + '/' + ph] = window.__zt.wvRig(pose, ph, view); }
   return R; });
 require('fs').writeFileSync(process.env.OUT, JSON.stringify(out)); console.log(Object.keys(out).length); await b.close(); })();
