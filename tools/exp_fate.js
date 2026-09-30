const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file:///tmp/gd/x73_ev.html'); await p.waitForTimeout(2500);
  const out = await p.evaluate(() => window.__ev(`JSON.stringify({FATE, caps: (typeof FATE_CAP!=='undefined'?FATE_CAP:null)})`));
  fs.writeFileSync('/tmp/gd/fate_raw.json', out);
  console.log(out.length);
  await b.close();
})();
