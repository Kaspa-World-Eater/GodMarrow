const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' in {} ? undefined : undefined });
  const p = await b.newPage({ viewport: { width: 1200, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('#startBtn');
  await p.mouse.move(700, 350);
  await p.keyboard.down('d'); await p.waitForTimeout(900); await p.keyboard.up('d');
  await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(200);
  await p.screenshot({ path: 'shot.png' });
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
