// v0.14 sweep: trees, every skill of every class in combat, the divination, new characters
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  // the trees: 10 skills per page, unique cells, prerequisites exist, no perk name collides with a skill
  const tree = await ev(() => { const { SK } = window.__spm, out = {}, bad = []; const vs = new Set(); for (const id in SK) for (const pk of SK[id].perks || []) { if (SK[pk.v]) bad.push('perk=skill ' + pk.v); if (vs.has(pk.v)) bad.push('dup perk ' + pk.v); vs.add(pk.v); const L = SK[id].perks; if (!L[L.length - 1].stat) bad.push('last perk no stat ' + id); }
    for (const id in SK) { const s = SK[id]; if (['sword', 'axe', 'flail'].includes(id)) continue; const k = s.cls + ':' + s.tab; (out[k] = out[k] || []).push(id); if (s.pre && (!SK[s.pre] || SK[s.pre].cls !== s.cls)) bad.push('pre ' + id); if (!s.perks) bad.push('noperks ' + id); }
    const cells = {}; for (const id in SK) { const s = SK[id]; if (['sword', 'axe', 'flail'].includes(id)) continue; const c = s.cls + s.tab + ':' + s.r + ',' + s.c; if (cells[c]) bad.push('cell ' + id + '/' + cells[c]); cells[c] = id; }
    return { counts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])), bad }; });
  check('10 skills on every page', Object.values(tree.counts).every(n => n === 10), tree.counts);
  check('tree data sound', !tree.bad.length, tree.bad);
  for (const CLS of ['animancer', 'ossumancer', 'hemomancer', 'miasmancer']) {
    await p.evaluate(c => { window.__spm.G.pickCls = c; window.__spm.startGame('test'); }, CLS); await wait(400); await p.keyboard.press('Escape');
    await ev(() => { const S = window.__spm, { P, SK } = S; for (const id in SK) if (SK[id].cls === P.cls) P.hard[id] = 14; P.attrs.spi = 80; P.attrs.vit = 80; P.attrs.con = 80; S.rederive(); });
    const ids = await ev(() => { const { SK, P } = window.__spm; return Object.keys(SK).filter(id => SK[id].cls === P.cls && (SK[id].kind === 'cast' || SK[id].kind === 'hold')); });
    let fails = [];
    for (const id of ids) {
      await ev(() => { const { P, G } = window.__spm; const mons = G.zone.monsters.filter(m => !m.dead).slice(0, 5); mons.forEach((m, i) => { m.x = P.x + 1.2 + (i % 2) * 0.8; m.y = P.y + (i - 2) * 0.6; m.hp = m.max = 3000; m.state = 'chase'; }); for (const m of G.zone.monsters) if (!mons.includes(m) && !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 14) m.x += 40; const d = G.zone.monsters.find(m => !m.dead && !mons.includes(m)); if (d) { d.x = P.x + 1.5; d.y = P.y + 0.3; window.__spm.hurtMon(d, 1e7); } P.hp = 1e6; P.mana = 9999; P.stam = 999; });
      const e0 = errs.length;
      const r = await ev(id => { const S = window.__spm, { P, G } = S; P.cast = 0; P.roll = 0; P.right = id; const h0 = G.zone.monsters.reduce((a, m) => a + (m.dead ? 0 : m.hp), 0); try { S.castSkill(id, { x: P.x + 1.8, y: P.y }); } catch (e) { return 'throw ' + e.message; } window.__h0 = h0; return 'ok'; }, id);
      if (['colossus', 'host', 'lance', 'condense', 'blance'].includes(id)) { await p.mouse.move(700, 270); await p.mouse.down({ button: 'right' }); await wait(900); await p.mouse.up({ button: 'right' }); }
      await wait(900);
      if (r !== 'ok' || errs.length > e0) fails.push(id + ':' + r + (errs.length > e0 ? ' ' + errs[errs.length - 1] : ''));
    }
    check(`${CLS}: every skill casts cleanly (${ids.length})`, !fails.length, fails);
    await wait(2000);
    await p.screenshot({ path: `shot27_${CLS}.png` });
    await p.keyboard.press('s'); await wait(200); await p.mouse.move(60, 80); await wait(100); await p.screenshot({ path: `shot27_${CLS}_tree.png` }); await p.keyboard.press('s');
    await ev(() => { const S = window.__spm; S.G.running = false; }); await p.evaluate(() => { document.getElementById('intro').hidden = false; });
  }
  // the divination: a full reading by clicks
  await p.evaluate(() => { window.__spm.G.pickCls = 'ossumancer'; }); await p.click('#newBtn'); await wait(300);
  const box = await p.$('canvas#game'), bb = await box.boundingBox(), cl = (x, y) => p.mouse.click(bb.x + x * bb.width / 480, bb.y + y * bb.height / 270);
  const shot = async n => { await wait(250); await p.screenshot({ path: `shot27_div_${n}.png` }); };
  const talk = async (n) => { for (let i = 0; i < n; i++) { await cl(240, 240); await wait(120); await cl(240, 240); await wait(120); } };
  await wait(1200); await shot('intro'); await talk(3);
  await wait(400); await shot('star'); await talk(2); await wait(300); await p.mouse.move(bb.x + 187 * bb.width / 480, bb.y + 96 * bb.height / 270); await wait(200); await shot('starhover'); await cl(187, 96); await wait(300); await shot('stardone'); await talk(2);
  await wait(400); await shot('face'); await talk(2); await wait(300); await p.mouse.move(bb.x + 240 * bb.width / 480, bb.y + 96 * bb.height / 270); await wait(200); await shot('facehover'); await cl(240, 96); await wait(300); await talk(1);
  await wait(400); await shot('cards'); await talk(2); await wait(300); await cl(176, 158); await wait(2600); await shot('cardsdone'); await talk(3);
  await wait(400); await talk(2); await wait(300); await p.mouse.move(bb.x + 336 * bb.width / 480, bb.y + 140 * bb.height / 270); await wait(500); await shot('cardrev'); await cl(336, 140); await wait(300); await talk(1);
  await wait(400); await shot('bones'); await talk(2); await wait(300); await cl(118, 196); await wait(300); await talk(1);
  await wait(400); await talk(2); await wait(300); await p.mouse.move(bb.x + 104 * bb.width / 480, bb.y + 198 * bb.height / 270); await wait(300); await shot('fear'); await cl(104, 198); await wait(300); await shot('feardone'); await talk(1);
  await wait(400); await talk(2); await wait(300); await p.mouse.move(bb.x + 240 * bb.width / 480, bb.y + 120 * bb.height / 270); await wait(400); await shot('seek'); await cl(240, 120); await wait(600); await shot('seekdone'); await talk(1);
  await wait(400); await shot('sac'); await talk(2); await wait(300); await cl(110, 132); await wait(300); await talk(2);
  await wait(400); await shot('end'); await talk(5); await wait(800);
  const st = await ev(() => { const { P, G } = window.__spm; return { running: G.running, fate: P.fate, pts: P.skillPts, learned: Object.values(P.hard).reduce((a, b) => a + b, 0), cls: P.cls, hp: window.__spm.getD().maxHp }; });
  check('the reading ends in a new character with a fate', st.running && st.fate && st.fate.card && st.fate.bones && st.fate.star && st.fate.sac && st.fate.face && st.fate.fear && st.fate.seek && st.fate.cardRev === true, st);
  check('the god chose the class (Hemera = Hemomancer)', st.cls === 'hemomancer', st.cls);
  check('a new character starts with 1 point and nothing learned', st.pts === 1 && st.learned === 0, st);
  await wait(300); await p.screenshot({ path: 'shot27_newchar.png' });
  for (const r of res) console.log(r); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 12).join('\n') : 'none'); await b.close();
})();
