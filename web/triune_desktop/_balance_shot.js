// Screenshot verification for balance milestones
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + (process.env.HTML || '/tmp/balance.html'));
  const wait = ms => p.waitForTimeout(ms);
  const ev = (f, a) => p.evaluate(f, a);
  await wait(500);

  // pick class and start
  const cls = process.argv[2] || 'ossumancer';
  await ev(c => { const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, cls);
  await wait(500);
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; });

  // Give a point to each skill so tooltips show live numbers, then open skills panel
  await ev(() => { const S = window.__spm; const P = S.P;
    for (const k in S.SK) { P.skills[k] = Math.max(1, P.skills[k] || 0); }
    S.G.panels.skills = true;
  });
  await wait(200);

  // Verify names via JS
  const names = await ev(() => {
    const S = window.__spm;
    return {
      spear: S.SK.spear && S.SK.spear.name,
      spikes: S.SK.spikes && S.SK.spikes.name,
      ribcage: S.SK.ribcage && S.SK.ribcage.name,
      horn: S.SK.horn && S.SK.horn.name,
      hornDesc: S.SK.horn && S.SK.horn.desc,
      banner: S.SK.banner && S.SK.banner.name,
      marrowm: S.SK.marrowm && S.SK.marrowm.name,
      hatch: S.SK.hatch && S.SK.hatch.name,
      thrall: S.SK.thrall && S.SK.thrall.name,
      blance: S.SK.blance && S.SK.blance.name,
      bfrenzy: S.SK.bfrenzy && S.SK.bfrenzy.name,
      pact: S.SK.pact && S.SK.pact.name,
      bwave: S.SK.bwave && S.SK.bwave.name,
      vwhip: S.SK.vwhip && S.SK.vwhip.name,
      cburst: S.SK.cburst && S.SK.cburst.name,
      eggsac: S.SK.eggsac && S.SK.eggsac.name,
      eggsacDesc: S.SK.eggsac && S.SK.eggsac.desc,
      shuriken: S.SK.shuriken && S.SK.shuriken.name,
      deathm: S.SK.deathm && S.SK.deathm.name,
      talon: S.SK.talon && S.SK.talon.name,
      lance: S.SK.lance && S.SK.lance.name,
      chain: S.SK.chain && S.SK.chain.name,
      mark: S.SK.mark && S.SK.mark.name,
      orb: S.SK.orb && S.SK.orb.name,
      word: S.SK.word && S.SK.word.name,
      ward: S.SK.ward && S.SK.ward.name,
      nmastery: S.SK.nmastery && S.SK.nmastery.name,
      kdawn: S.SK.kdawn && S.SK.kdawn.name,
      keclipse: S.SK.keclipse && S.SK.keclipse.name,
      classAnim: S.CLASS_NAME && S.CLASS_NAME.animancer,
      classMonk: S.CLASS_NAME && S.CLASS_NAME.monk,
      tabsAnim: S.TAB_SETS && S.TAB_SETS.animancer,
      tabsOss: S.TAB_SETS && S.TAB_SETS.ossumancer,
      tabsMias: S.TAB_SETS && S.TAB_SETS.miasmancer,
      talonPerks: S.SK.talon && S.SK.talon.perks && S.SK.talon.perks.map(x => x.name),
      gstrikeDesc: S.SK.gstrike && S.SK.gstrike.desc
    };
  });
  console.log(JSON.stringify(names, null, 2));

  await wait(400);
  const outPath = process.argv[3] || `/tmp/balance-${cls}.png`;
  await p.screenshot({ path: outPath, fullPage: false });
  console.log('shot', outPath);
  console.log('ERRS', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
