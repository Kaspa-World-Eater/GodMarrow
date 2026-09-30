// v0.34 hemomancer changes in play: HTML=/tmp/flesh.html node fg2shot.js /tmp/h34
// -> _veins.png (Root Veins mid-cast), _veinhold.png, _leech.png (leeches crawling and latched), _grafts.png (graft sheet), _bleed.png
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + (process.env.HTML || '/tmp/flesh.html'));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), out = process.argv[2] || '/tmp/h34', log = [];
  const clip = async (name) => { const r = await ev(() => { const S = window.__spm, q = S.iso(S.P.x, S.P.y); return { x: q.sx, y: q.sy }; }); await p.screenshot({ path: `${out}_${name}.png` }); await p.screenshot({ path: `${out}_${name}_c.png`, clip: { x: Math.max(0, Math.min(960 - 320, r.x * 1.5 - 160)), y: Math.max(0, Math.min(540 - 200, r.y * 1.5 - 130)), width: 320, height: 200 } }); };
  const start = async () => { await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'hemomancer'; S.startGame('test'); }); await wait(500);
    await ev(() => { const S = window.__spm, P = S.P, G = S.G; for (const k in G.panels) G.panels[k] = false; G.zone.monsters.forEach(m => { if (Math.hypot(m.x - P.x, m.y - P.y) < 16) { m.x += 60; m.y += 60; m.state = 'idle'; } }); P.hp = S.getD().maxHp; P.mana = S.getD().maxMana; P.cast = 0; }); };
  const spawn = (list) => ev(list => { const S = window.__spm, P = S.P; for (const [t, dx, dy] of list) { const m = S.makeMon(t, P.x + dx, P.y + dy, 5, 'normal', []); m.state = 'chase'; m.hp = m.max = 300; m.spd = 0.01; m.b = Object.assign({}, m.b, { ai: 'none' }); S.G.zone.monsters.push(m); } }, list);

  // ---- 1. the hatch discipline pays Vitae then life
  await start();
  const h = await ev(() => { const S = window.__spm, P = S.P, D = S.getD(); P.skills.hatch = P.hard.hatch = 8; S.rederive(); P.mana = D.maxMana; P.hp = D.maxHp;
    const m0 = P.mana, h0 = P.hp; P.hatchT = 0.69; window.__mn32.ev('updateHatchChannel(0.02)'); return { vitaeBefore: m0, vitaeAfter: P.mana, lifeBefore: h0, lifeAfter: P.hp, info: window.__mn32.ev("bloodInfo('hatch')") }; });
  log.push('hatch: ' + JSON.stringify(h));
  // held: heldSkill needs a key: simulate through the update with the mouse held
  const h2 = await ev(() => { const S = window.__spm, P = S.P, D = S.getD(); P.mana = 2; P.hp = D.maxHp; const h0 = P.hp; P.hatchT = 0.69; window.__mn32.ev('P.hatchChan = true; (function(){ const need = HS.hatchBleedVitae(); bloodPay(bloodLifeCost(need) * 1.4); P.mana = Math.max(0, P.mana - need); })()'); return { emptyVitaeLifePaid: h0 - P.hp, fullVitaeLifePaid: (() => { P.mana = D.maxMana; const a = P.hp; window.__mn32.ev('(function(){ const need = HS.hatchBleedVitae(); bloodPay(bloodLifeCost(need) * 1.4); P.mana = Math.max(0, P.mana - need); })()'); return a - P.hp; })() }; });
  log.push('hatch cost: ' + JSON.stringify(h2));

  // ---- 2. leeches as a passive
  await start();
  await ev(() => { const S = window.__spm, P = S.P; P.skills.spool = P.hard.spool = 8; P.skills.blance = P.hard.blance = 1; S.rederive(); });
  await spawn([['hollow', 2.5, 0], ['hound', 2.2, 1.2], ['hollow', 3, -1]]);
  const lk = await ev(() => { const S = window.__spm; return { kind: S.SK.spool.kind, name: S.SK.spool.name, inRight: window.__mn32.ev("RIGHT_SKILLS.includes('spool')"), info: window.__mn32.ev("bloodInfo('spool')") }; });
  log.push('spool: ' + JSON.stringify(lk));
  for (let i = 0; i < 12; i++) { await ev(() => { const S = window.__spm, P = S.P; for (const m of S.G.zone.monsters) if (!m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4) S.hurtMon(m, 3, '#fff'); }); await wait(120); }
  await wait(500);
  const l1 = await ev(() => { const G = window.__spm.G; return { n: G.leeches.length, states: G.leeches.map(l => l.state) }; });
  log.push('leeches after wounds: ' + JSON.stringify(l1));
  await clip('leech');
  await wait(3500);
  const l2 = await ev(() => { const G = window.__spm.G, P = window.__spm.P; return { n: G.leeches.length, states: G.leeches.map(l => l.state + ':' + Math.round(l.store)), hp: Math.round(P.hp) }; });
  log.push('leeches later: ' + JSON.stringify(l2));
  await clip('leech2');

  // ---- 3. root veins
  await start();
  await ev(() => { const S = window.__spm, P = S.P; P.skills.vwhip = P.hard.vwhip = 7; P.skills.veinlong = P.hard.veinlong = 1; S.rederive(); });
  await spawn([['hollow', 3, -0.5], ['hound', 2.5, 1.5], ['hollow', 4, 1]]);
  await ev(() => { const S = window.__spm, P = S.P; P.mana = 999; P.cast = 0; S.bloodCast('vwhip', { x: P.x + 3, y: P.y }); });
  await wait(100); await clip('veins');
  await wait(120); await clip('veinhold');
  const v = await ev(() => { const S = window.__spm, G = S.G; return { veins: G.rveins.length, kinds: G.rveins.map(x => (x.thrash ? 'thrash' : 'bite') + (x.hold > 0 ? '+hold' : '')), hurt: G.zone.monsters.filter(m => m.hp < m.max && m.hp > 0).length, bleeding: G.zone.monsters.filter(m => m.bleed).length, info: window.__mn32.ev("bloodInfo('vwhip')"), name: S.SK.vwhip.name }; });
  log.push('veins: ' + JSON.stringify(v));
  await wait(400); await clip('veinsq');
  // an empty cast: all thrash
  await ev(() => { const S = window.__spm, P = S.P; for (const m of S.G.zone.monsters) if (Math.hypot(m.x - P.x, m.y - P.y) < 8) { m.x += 50; } P.cast = 0; S.bloodCast('vwhip', { x: P.x - 3, y: P.y }); });
  await wait(150); await clip('veinsmiss'); await wait(250); await clip('veinsmiss2');

  // ---- 4. grafts: a sheet of the swarmling with every graft, front and back
  await start();
  const url = await ev(() => {
    const S = window.__spm, ev2 = window.__mn32.ev, Z = 4, sets = [{}, { fevered: 1 }, { leapers: 1 }, { clingers: 1 }, { volatile: 1 }, { legs: 1 }, { fevered: 1, legs: 1 }, { clingers: 1, volatile: 1 }];
    const names = ['plain', 'fevered', 'leapers', 'clingers', 'volatile', 'legs', 'fev+legs', 'cling+vol'];
    const f0 = ev2("fgLingFrame(0,{},'front')"), fw = f0.w * Z, fh = f0.h * Z;
    const c = document.createElement('canvas'); c.width = sets.length * (fw + 4) + 4; c.height = 8 * (fh + 4) + 4; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#16191b'; x.fillRect(0, 0, c.width, c.height);
    sets.forEach((gr, i) => { [0, 1, 2, 3].forEach(ph => ['front', 'back'].forEach((vw, vi) => {
      const fr = ev2(`fgLingFrame(${ph},${JSON.stringify(gr)},'${vw}')`), X = 4 + i * (fw + 4), Y = 4 + (ph * 2 + vi) * (fh + 4);
      x.fillStyle = (i + ph + vi) % 2 ? '#3a3632' : '#423d38'; x.fillRect(X, Y, fw, fh); x.drawImage(fr.c, X, Y, fw, fh);
      x.fillStyle = '#aaa'; x.font = '11px monospace'; x.fillText(names[i] + ' ' + ph + vw[0], X + 2, Y + 11);
    })); });
    return c.toDataURL();
  });
  require('fs').writeFileSync(`${out}_grafts.png`, Buffer.from(url.split(',')[1], 'base64'));
  // and in play: a brood with two grafts
  await ev(() => { const S = window.__spm, P = S.P; P.skills.hatch = P.hard.hatch = 5; P.skills.graft = P.hard.graft = 10; P.skills.graft2 = P.hard.graft2 = 1; S.rederive(); P.grafts = ['volatile', 'legs']; for (let i = 0; i < 4; i++) S.hatchLing(P.x + 1 + i * 0.5, P.y - 0.5 + (i % 2)); });
  await wait(700); await clip('grafts_play');
  await ev(() => { const S = window.__spm, P = S.P; P.grafts = ['fevered', 'leapers']; });
  await wait(300); await clip('grafts_play2');

  console.log(log.join('\n')); console.log('errors', errs.slice(0, 5)); await b.close();
})();
