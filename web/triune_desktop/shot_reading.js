// Screenshot the Reading (character creation) scene at 1920x1080.
// Usage: HTML=/tmp/reading.html OUT=/tmp/reading_shots/m1 SCENE=intro node shot_reading.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.env.HTML);
  const scene = process.env.SCENE || 'intro';
  const out = process.env.OUT || '/tmp/reading_shots/shot';

  // Wait for the DOM to settle and the reading-art hooks to install
  await p.waitForTimeout(1500);

  // Kick off the divination via the exposed hook
  const opened = await p.evaluate(async () => {
    const S = window.__spm;
    if (!S || !S.beginDivination) return { err: 'no beginDivination' };
    try {
      S.beginDivination(false);
    } catch (e) { return { err: 'beginDivination threw: ' + e.message }; }
    return { ok: true, ra: !!window.__readingArt };
  });
  console.log('opened:', JSON.stringify(opened));

  // Force the scene we want
  await p.evaluate((sc) => {
    const G = window.__spm && window.__spm.G;
    if (!G || !G.divine) return;
    G.divine.scene = sc;
    G.divine.lines = ['A quiet moment.'];
    G.divine.li = 0; G.divine.shown = 99;
    G.divine.fade = 0;
  }, scene);

  // Give the paint pipeline a couple of frames + prebake time
  await p.waitForTimeout(1200);

  await p.screenshot({ path: out + '_' + scene + '.png' });

  const info = await p.evaluate(() => ({
    ra: !!window.__readingArt,
    scene: window.__spm && window.__spm.G && window.__spm.G.divine ? window.__spm.G.divine.scene : null,
    cache: window.__readingArt ? Object.keys(window.__readingArt.cache) : []
  }));
  console.log('info:', JSON.stringify(info), 'ERRS', errs.length ? errs.slice(0, 6).join(' | ') : 'none');
  await b.close();
})();
