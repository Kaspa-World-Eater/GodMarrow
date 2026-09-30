const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + (process.env.HTML || '/tmp/balance.html'));
  const wait = ms => p.waitForTimeout(ms);
  const ev = (f, a) => p.evaluate(f, a);
  await wait(400);
  await ev(() => { const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); });
  await wait(500);
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; });
  // Give skills, raise 5 skeletons near the player, clear any death-march state
  await ev(() => {
    const S = window.__spm; const P = S.P;
    P.skills.raise = 5; P.skills.horn = 5; P.skills.aura = 1;
    P.mana = 999;
    S.G.skels = [];
    for (let i = 0; i < 5; i++) {
      const ang = i / 5 * 6.283, r = 1.2;
      const e = S.raiseSkel(P.x + Math.cos(ang) * r, P.y + Math.sin(ang) * r, true, 0);
      e.rise = 0;
    }
    // move the target enemies far
    S.G.zone.monsters.forEach(m => { m.x = P.x + 200; m.y = P.y + 200; m.state = 'idle'; });
  });
  await wait(500);
  // Snapshot skel positions BEFORE cast
  const before = await ev(() => {
    const S = window.__spm; const P = S.P;
    return { px: P.x, py: P.y, skels: S.G.skels.map(e => ({ x: e.x, y: e.y })) };
  });
  // Cast horn at a spot 8 yards north-east
  const castRes = await ev(() => {
    const S = window.__spm; const P = S.P;
    P.cast = 0; P.roll = 0;
    P.skills.raise = 5; P.skills.horn = 5; P.skills.aura = 1; P.skills.tithe = 5;
    P.mana = 999;
    const preMana = P.mana, preCls = P.cls, preHorn = P.skills.horn;
    S.castSkill('horn', { x: P.x + 6, y: P.y + 6 });
    return { preMana, preCls, preHorn, postMana: P.mana, dm: S.G.deathMarch };
  });
  console.log('CAST_RES:', JSON.stringify(castRes));
  // wait 1.5 seconds and take a shot mid-march
  await wait(600);
  const mid = await ev(() => {
    const S = window.__spm;
    return { dm: S.G.deathMarch && { x: S.G.deathMarch.x, y: S.G.deathMarch.y, t: S.G.deathMarch.t }, skels: S.G.skels.map(e => ({ x: e.x, y: e.y })) };
  });
  // Screenshot mid-march
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/97784205-80df-5ff9-af53-809f027ba14e/scratchpad/triune_desktop/shots/balance-deathmarch.png', fullPage: false });
  await wait(1500);
  const after = await ev(() => {
    const S = window.__spm;
    return { dm: S.G.deathMarch, skels: S.G.skels.map(e => ({ x: e.x, y: e.y })) };
  });
  console.log('BEFORE:', JSON.stringify(before));
  console.log('MID:',    JSON.stringify(mid));
  console.log('AFTER:',  JSON.stringify(after));
  // Compute distance change
  const moved = before.skels.map((s, i) => {
    const m = mid.skels[i]; if (!m) return { i, dead: true };
    return {
      i,
      before_d: Math.hypot(s.x - (before.px + 6), s.y - (before.py + 6)).toFixed(2),
      mid_d: Math.hypot(m.x - (before.px + 6), m.y - (before.py + 6)).toFixed(2)
    };
  });
  console.log('MOVEMENT toward march point:', JSON.stringify(moved));
  console.log('ERRS', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
