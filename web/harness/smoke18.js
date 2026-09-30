// every card of every class, upright then reversed, under fire: no errors allowed
const { chromium } = require('playwright');
const CLS = process.argv[2] || 'ossumancer', OR = process.argv[3] || 'u';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '))); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click(`.cls[data-cls=${CLS}]`); await p.click('#testBtn'); await p.waitForTimeout(500);
  await p.keyboard.press('Escape');
  const setup = await p.evaluate(([OR]) => {
    const S = window.__spm, { P, SK, G } = S;
    for (const id in SK) if (SK[id].cls === P.cls) P.hard[id] = 12;
    P.attrs.vit = 200; P.attrs.spi = 150; S.rederive();
    P.arc = S.newArc(); P.arc.pts = 200;
    const W = S.web(); let guard = 0, took = 0;
    while (guard++ < 200) { let any = false; for (const id in W) { if (id === 'heart' || S.arcOf(id)) continue; if (S.takeCard(id, OR)) { any = true; took++; } } if (!any) break; }
    if (S.arcOf('v_unmade') === 'u') { const maj = Object.keys(P.arc.taken).find(k => S.ARC[k].kind === 'major'); G.panels.lantern = true; window.__spm.G.panels.lantern = true; }
    P.squads[1].load = 'bow'; P.squads[2].load = 'mage'; if (S.rearm) S.rearm();
    return { took, total: Object.keys(W).length - 1, pts: P.arc.pts };
  }, [OR]);
  console.log(CLS, OR, 'cards', JSON.stringify(setup));
  // walk to the densest monsters
  const goNear = () => p.evaluate(() => { const { P, G } = window.__spm; const alive = G.zone.monsters.filter(m => !m.dead); if (!alive.length) return 0; const m = alive.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.x = m.x - 2.2; P.y = m.y + 0.3; if (G.zone.solidAt(P.x, P.y)) { P.x = m.x; P.y = m.y + 1; } return alive.length; });
  const ids = await p.evaluate(() => { const { SK, P } = window.__spm; return Object.keys(SK).filter(id => SK[id].cls === P.cls && (SK[id].kind === 'cast' || SK[id].kind === 'hold')); });
  let rounds = 0;
  for (let r = 0; r < 14; r++) {
    await goNear();
    for (const id of ids) {
      await p.evaluate((id) => {
        const S = window.__spm, { P, G } = S; P.hp = Math.max(P.hp, 1e6); P.mana = 9999; P.cast = 0; P.roll = 0; P.shards = 999;
        const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
        const pt = m ? { x: m.x, y: m.y } : { x: P.x + 2, y: P.y };
        if (id === 'host') { S.toggleHost(); return; } if (id === 'colossus') { S.fuseOne(); return; }
        S.castSkill(id, pt);
        if (m) S.swing(m);
      }, id);
      await p.waitForTimeout(60);
    }
    // hold channels: spirit lance / condense for a moment
    if (CLS === 'animancer') { await p.evaluate(() => { const { P, mouse } = window.__spm; P.right = 'lance'; mouse.r = true; }); await p.waitForTimeout(500); await p.evaluate(() => { window.__spm.mouse.r = false; }); }
    await p.evaluate(() => { window.__spm.tryRoll(); });
    await p.waitForTimeout(400);
    rounds++;
  }
  // let everything play out, including dying minions, burning ground and time stop
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `shot18_${CLS}_${OR}.png` });
  // flip every major at the lantern and back
  const flips = await p.evaluate(() => { const S = window.__spm, { P, G } = S; G.panels.lantern = true; let n = 0; for (const k in P.arc.taken) if (S.flipCard(k)) n++; for (const k in P.arc.taken) S.flipCard(k); G.panels.lantern = false; return n; });
  // kill the player once (D2 death) and respawn; open the panel
  await p.evaluate(() => { const { P } = window.__spm; P.hp = 1; });
  await p.keyboard.press('a'); await p.waitForTimeout(200); await p.screenshot({ path: `shot18_${CLS}_${OR}_web.png` }); await p.keyboard.press('a');
  const st = await p.evaluate(() => { const { P, G } = window.__spm; return { kills: G.zone.monsters.filter(m => m.dead).length, alive: G.zone.monsters.filter(m => !m.dead).length, skels: G.skels.length, brood: G.brood.length, err: G.error, hp: Math.round(P.hp), suit: !!P.suit, shell: !!P.shell }; });
  console.log('state', JSON.stringify(st), 'flips', flips, 'rounds', rounds);
  console.log('ERRS', errs.length ? errs.slice(0, 8) : 'none');
  await b.close();
})();
