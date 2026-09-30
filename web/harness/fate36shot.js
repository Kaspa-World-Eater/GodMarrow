// v0.36 fate art: walk the whole divination by its buttons, screenshot each scene. HTML=... OUT=dir PFX=name STAR=i
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + (process.env.HTML || process.cwd() + '/spiritmancer.html'));
  const OUT = process.env.OUT || '.', PFX = process.env.PFX || 'f36', STAR = +(process.env.STAR || 1), ONLY = process.env.ONLY;
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await wait(800);
  await p.evaluate(() => document.getElementById('newBtn').click()); await wait(400);
  const box = await p.$('canvas#game'), bb = await box.boundingBox();
  const to = (x, y) => p.mouse.move(bb.x + x * bb.width / 480, bb.y + y * bb.height / 270);
  const cl = async (x, y) => { await to(x, y); await p.mouse.down(); await p.mouse.up(); };
  const shot = async n => { if (ONLY && !n.includes(ONLY)) return; await wait(250); await p.screenshot({ path: `${OUT}/${PFX}_${n}.png` }); };
  const scene = () => ev(() => { const V = window.__spm.G.divine; return V ? V.scene : null; });
  const btns = () => ev(() => (window.__spm.G.divine.btn || []).map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h })));
  // talk until the scene changes or buttons appear (not counting the skip button)
  const talkUntil = async (want, max = 30) => { for (let i = 0; i < max; i++) { const s = await scene(); if (s === want) { const bs = await btns(); if (bs.length > 1 || !/^(star|face|cards|cardRev|bones|fear|seek|ask|sac)$/.test(s)) return; } await ev(() => window.__spm.divineAdvance()); await wait(60); } };
  const full = async () => { for (let i = 0; i < 20; i++) { const bs = await btns(); if (bs.length > 1) return bs; await ev(() => window.__spm.divineAdvance()); await wait(80); } return btns(); };
  const pickScene = async (name, idx, hoverIdx = idx) => {
    await talkUntil(name); await wait(700); await to(470, 200); await wait(200); await shot(name);
    const bs = (await full()).filter(b => !(b.x > 400 && b.y < 20));
    const h = bs[hoverIdx]; await to(h.x + h.w / 2, h.y + h.h / 2); await wait(600); await shot(name + '_hover');
    const c = bs[idx]; await cl(c.x + c.w / 2, c.y + c.h / 2); await wait(name === 'cards' ? 2800 : 900); await to(470, 200); await wait(300); await shot(name + '_done');
  };
  await wait(1500); await shot('intro');
  await pickScene('star', STAR);
  await pickScene('face', 1, 0);
  await pickScene('cards', 0, 1);
  await pickScene('cardRev', 1);
  await pickScene('bones', 2);
  await pickScene('fear', 0);
  await pickScene('seek', 2);
  await pickScene('ask', 1);
  await pickScene('sac', 0);
  await talkUntil('end'); await wait(600); await shot('end');
  for (let i = 0; i < 12 && await scene(); i++) { await ev(() => window.__spm.divineAdvance()); await wait(80); }
  await wait(900);
  const st = await ev(() => { const { P, G } = window.__spm; return { running: G.running, fate: P.fate, cls: P.cls, pick: G.pickCls }; });
  console.log(JSON.stringify(st)); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 8).join('\n') : 'none'); await b.close();
})();
