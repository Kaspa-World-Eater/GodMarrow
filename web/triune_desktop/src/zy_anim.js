// =================================================================== v0.34 zy_anim: the Animancer's Mirror tree and living wisps
// Every shot of soul-light the Animancer's choir looses is a living wisp: a bright soul-flame with a comet
// tail that darts at a foe, strikes, and ricochets on to the next. Mirrors catch them: a wisp that strikes a
// standing mirror, the golem's polished iron or its shield rebounds renewed, brighter and with more leaps in it,
// and a wisp that crosses cracked mirror-glass fissures into more wisps. The Iron tree is now the Mirror tree:
// standing mirrors, a fissure of cracking glass, the Hall of Mirrors, a great mirror that falls out of the sky and
// shatters, and the Iron Golem (still the Iron Golem: polished to a mirror sheen, its art is in zx_minions32.js).
// The berserk golem keeps its base-game phosphorus beam (startPhos/phosTick in o_skills14.js): nothing here overrides it.
// Loads late (after zx_minions32.js, before e_ui.js): everything here overrides by assignment, never by redeclaring.

// ------------------------------------------------------------------- names and words
TAB_SETS.animancer[0] = 'Mirror';
{
  const T = {
    pillars: { name: 'Standing Mirrors', desc: 'Tall panes of polished silver burst from the ground in a wall at the target: they cut and stun as they rise, then stand as cover. Your wisps rebound off them renewed, brighter and with more leaps in them.',
      perks: [{ name: 'Lure of the Glass', desc: 'Enemies are drawn to their own reflections: mirrors drag nearby enemies toward them.' }, { name: 'Resonance', desc: 'Wisps rebound off mirrors harder, gain more leaps, and can rebound more times.' }] },
    golem: { name: 'Iron Golem', desc: 'A hulking knight of iron polished to a mirror sheen that never dies: at zero life it falls dormant and rises again. Your wisps rebound off it. Once summoned, casting it again orders it to that spot; casting it on the golem itself banishes it. With Overcharge you pour wisps into it: each one heals it and adds a charge. Full charge sends it berserk. G opens its orders and weapon loadout.',
      perks: [{ name: 'Bulwark', desc: 'Its shield charge knocks enemies back harder.' }, { name: 'Juggernaut', desc: 'Berserk lasts longer (up to 30s) and hits harder.' }, { name: 'Living Mirror', desc: 'More life, damage and armor.' }] },
    fissure: { name: 'Mirror Fissure', desc: 'A crack of mirror-glass races along the ground toward the target, and jagged shards burst up out of it, cutting and stunning. The ground it leaves stays cracked mirror for a while: any wisp that crosses the broken glass fissures into more wisps. The last shards stay standing as mirrors, cracked, and split wisps too.',
      perks: [{ name: 'Deep Crack', desc: 'The shards stun twice as long.' }, { name: 'Flying Glass', desc: 'Every shard flings slivers of glass to either side.' }] },
    toss: { name: 'Mirror Shield', desc: 'The golem hurls its mirror-bright tower shield at distant foes. It spins at the end of its flight, then flies back. Wisps rebound off it the whole way.' },
    challenge: { name: 'Dazzling Challenge', desc: 'Every few seconds the golem flashes its polished face: nearby enemies, dazzled by their own reflection, must fight it instead of you.',
      perks: [{ name: 'Blinding Flash', desc: 'The flash also slows enemies by 30% for 3 s.' }, { name: 'Defiance', desc: 'For 3 s after each challenge, the golem takes 30% less damage.' }] },
    cage: { name: 'Hall of Mirrors', desc: 'A ring of standing mirrors bursts up around the target, caging whatever stands inside. Wisps that fly into the hall rebound from mirror to mirror, gaining a leap from each.',
      perks: [{ name: 'Razor Glass', desc: 'Whatever is caged inside is cut every second.' }, { name: 'Shattering Hall', desc: 'When the hall ends its mirrors shatter inward, cutting everything inside.' }] },
    thorns: { name: 'Reflection', desc: 'The golem\'s polish throws blows back: enemies that strike it in melee take part of the damage back.',
      perks: [{ name: 'Anima Overflow', desc: 'Damage the golem takes also charges it, and its final burst looses a ring of seeking souls.' }, { name: 'Cutting Glare', desc: 'Enemies that strike your mirror-iron are staggered.' }] },
    overcharge: { desc: 'Hold to pour your wisps into the Iron Golem. Each wisp heals it and adds a charge; at full charge it goes berserk in white fire, then bursts. Each level needs more wisps for a full charge, but the rampage lasts longer and hits harder. The charge never needs more wisps than you can hold, and a charge left alone slowly bleeds its wisps back to you.',
      perks: [{ name: 'Ghostfire', desc: 'While berserk, its white beams fire twice as often.' }] },
    anvil: { name: 'Falling Mirror', desc: 'A great mirror drops out of the sky onto the target. It crushes and stuns everything under it, and its glass bursts outward in a ring of flying shards. The cracked mirror stands where it fell until it breaks: wisps rebound off it, and split on its broken glass.',
      perks: [{ name: 'Shatterburst', desc: 'Twice as many shards burst out, and they cut deeper.' }, { name: 'Heavy Frame', desc: 'The mirror stands twice as long, and enemies near it, caught by their reflection, are slowed.' }, { name: 'Mirror Rain', desc: 'Two more mirrors fall around the first.' }] },
    forge: { name: 'Quicksilver Heart', desc: 'Mirrors, glass and the golem all hit harder, and your mirrors stand longer.',
      perks: [{ name: 'Tempered Glass', desc: 'Standing mirrors stand 50% longer.' }, { name: 'Sun-Catch', desc: 'The golem\'s polish catches the light: its blows set enemies on fire.' }] },
    beam: { name: 'Darting Wisps', desc: 'Unlocks darting wisps: living soul-flames that dart out from your choir, strike a foe and ricochet on to the next before flying home. Levels add damage, leaps and reach. They rebound off mirrors renewed, and fissure into more wisps on cracked glass.',
      perks: [{ name: 'Weaving Flight', desc: 'Darting wisps weave as they fly, cutting everything they pass.' }, { name: 'Searing Wisps', desc: 'Darting wisps set what they strike on fire.' }] },
    prism: { name: 'Splitting Wisps', desc: 'Unlocks splitting wisps: when one strikes a foe it splits, throwing off sparks of itself that dart at others nearby. On a mirror it splits whole.',
      perks: [{ name: 'Wide Split', desc: 'One more spark on every split.' }, { name: 'Bright Sparks', desc: 'Sparks hit 30% harder.' }] },
    lance: { name: 'Spirit Dart', desc: 'Loose a darting wisp at the enemy nearest the cursor. It ricochets from foe to foe like chain lightning, weaker with each leap, trailing a comet of soul-light. Mirrors catch it: a rebound off your golem, its shield or your mirrors costs it nothing and buys two more leaps. Hold to keep loosing them.',
      perks: [{ name: 'Focused Dart', desc: 'The longer you hold it, the harder the darts strike.' }, { name: 'Prismatic Dart', desc: 'Every rebound off a mirror splits off sparks at nearby enemies.' }, { name: 'Siphon', desc: 'Returns part of its damage as life and Essence.' }] }
  };
  for (const k in T) {
    const s = SK[k], o = T[k]; if (!s) continue;
    if (o.name) s.name = o.name; if (o.desc) s.desc = o.desc;
    if (o.perks) o.perks.forEach((p, i) => { if (p && s.perks && s.perks[i]) Object.assign(s.perks[i], p); });
  }
  // the fate reading of the Soul-Smith
  const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 4) return; if (typeof o.blurb === 'string') if (o.id === 'smith' && typeof o.txt === 'string') { o.txt = o.txt.replace('Iron skills', 'Mirror skills'); o.say = 'The Soul-Smith polishes breath into iron until it shines. What looks into it sees itself, and obeys.'; return; } for (const k in o) walk(o[k], d + 1); };
  walk(FATE, 0);
}
// a few fixed UI words that live in other files
{
  const AN_WORDS = { 'Beam': 'Darting', 'Prism': 'Split' };
  const _txt = txt;
  txt = function (s, ...a) { if (typeof s === 'string' && AN_WORDS[s] && P.cls === 'animancer') s = AN_WORDS[s]; return _txt(s, ...a); };
}
// the numbers in the skill tree
{
  const r = Math.round, pc = v => Math.round(v * 100) + '%';
  const INFO = {
    pillars: () => `${WS.pillarN()} mirrors · ${r(WS.pillarDmg())} damage as they rise · stand ${WS.pillarLife().toFixed(1)}s`,
    fissure: () => `${r(WS.fissureDmg())} per shard · ${WS.fissureLen().toFixed(1)} yd of cracked glass for ${anCrackLife().toFixed(1)}s · last ${WS.fissureKeep()} stand as mirrors`,
    cage: () => `${WS.cageN()} mirrors · ${r(WS.cageDmg())} damage each · stand ${WS.cageLife().toFixed(1)}s`,
    anvil: () => `${r(WS.anvilDmg())} crush · ${P.skills.anvilquake > 0 ? 16 : 8} shards × ${r(WS.anvilDmg() * (P.skills.anvilquake > 0 ? 0.4 : 0.22))} · stands ${P.skills.anvilstay > 0 ? 16 : 8}s`,
    forge: () => `Mirrors and glass +${8 * P.skills.forge}% damage · mirrors stand +${4 * P.skills.forge}%`,
    ironm: () => `Golem +${10 * P.skills.ironm}% life · +${8 * P.skills.ironm}% damage · mirrors +${8 * P.skills.ironm}%`,
    resonance: () => `x${WS.bounceMult().toFixed(2)} per rebound · up to ${WS.maxBounce()} rebounds · +1 leap each`,
    beam: () => `${r(WS.beamDps() * 0.6)} per strike · ${WS.pierce('beam') + 1} leaps · reach ${WS.range('beam').toFixed(1)} yd`,
    sweep: () => `Grazes what it passes for ${r(WS.beamDps() * 0.6 * 0.35)}`,
    prism: () => `${r(WS.prismDps() * 0.6)} per strike · splits into ${WS.prismN()} sparks at ${pc(WS.prismPct())}`,
    lance: () => `${r(WS.lanceDps() * 0.42)} per strike · ${WS.lancePierce() + 1} leaps · reach ${WS.lanceRange().toFixed(1)} yd · -18% per leap`,
    prismL: () => `Splits into ${WS.prismLN()} sparks at ${pc(WS.prismLPct())} on each rebound`
  };
  const _si = skillInfo;
  skillInfo = function (id, l) {
    const f = INFO[id]; if (!f || (SK[id] ? (SK[id].cls || 'animancer') !== 'animancer' : P.cls !== 'animancer')) return _si(id, l);
    const old = P.skills[id]; P.skills[id] = Math.max(1, l); syncPerks(D);
    let s = ''; try { s = f(); } finally { P.skills[id] = old; syncPerks(D); }
    return s;
  };
}

// ------------------------------------------------------------------- the art: mirrors in 32-bit pixel art
// Polished silver frames (a steep cold ramp that throws hard white glints), glass that reflects a pale sky over a
// dark horizon and a dusk-dark ground, two hard specular streaks, crisp dark seams, and broken glass with lit edges.
pmat('anSilver', ['#0a0c12', '#3a4252', '#7c889c', '#c8d4e2', '#ffffff']);
pmat('anSilverD', ['#06080c', '#1e2430', '#44506a', '#8a98ae', '#d8e2ee']);
pmat('anGlassF', ['#10182a', '#3a5a82', '#7aa6d0', '#bfe0f8', '#ffffff']);
const AN_SKY = ['#f0f8ff', '#cfe8fa', '#a6ceee', '#7eaede', '#5a8cc4', '#3e6aa0'];
const AN_SEED = n => { let s = n * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
// fill a pane of mirror glass: inG(x, y) says which pixels are glass; (x0..x1, y0..y1) is its box
function anGlassPane(A, inG, x0, y0, x1, y1, o) {
  o = o || {}; const hz = o.hz || 0.56, rnd = AN_SEED(o.seed || 1), H = y1 - y0 + 1;
  const tree = []; for (let x = x0; x <= x1; x++) tree[x] = rnd() < 0.45 ? (rnd() < 0.4 ? 2 : 1) : 0;   // a ragged reflected skyline
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inG(x, y)) continue;
    const v = (y - y0) / H, hy = Math.round(y0 + H * hz);
    let c;
    if (y < hy - tree[x]) { const f = v / hz * AN_SKY.length, i = Math.floor(f); c = AN_SKY[Math.min(AN_SKY.length - 1, i + ((f - i > 0.7 && (x + y) & 1) ? 1 : 0))]; }
    else if (y <= hy) c = '#141a28';
    else if (y === hy + 1) c = (x & 1) ? '#5a6a84' : '#3a4a62';
    else c = ((y - hy) % 4 === 0) ? '#3a3648' : (y - hy) % 4 === 2 ? '#26222e' : '#2e2a3a';
    // bevel: the left and top edges catch light, the right edge falls away
    if (!inG(x - 1, y) || !inG(x, y - 1)) c = y < hy ? '#ffffff' : '#8aa0bc';
    else if (!inG(x + 1, y)) c = y < hy ? '#3e6aa0' : '#1a1e2a';
    A.px(x, y, c);
  }
  // two hard specular streaks, running down to the right; dimmer where they cross the reflected ground
  const sk = o.slope || 0.45, s0 = o.streak != null ? o.streak : 1.5;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inG(x, y) || !inG(x - 1, y) || !inG(x + 1, y)) continue;
    const u = (x - x0) - (y - y0) * sk, low = y > y0 + H * hz;
    if (u >= s0 && u < s0 + 2) A.px(x, y, low ? '#b8c8dc' : (u < s0 + 1 ? '#ffffff' : '#e4f2ff'));
    else if (u >= s0 + 3.5 && u < s0 + 4.5 && y < y0 + H * 0.8) A.px(x, y, low ? '#8aa0bc' : '#d6ecff');
  }
  if (o.sheen != null) {   // a travelling sheen: a bright band sliding across the glass
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inG(x, y)) continue; const u = (x - x0) + (y - y0) * 0.6 - o.sheen;
      if (u >= 0 && u < 1.5) A.px(x, y, '#ffffff'); else if (u >= 1.5 && u < 3) A.px(x, y, '#dff2ff');
    }
  }
  if (o.crack) anCrackPx(A, inG, o.crack[0], o.crack[1], o.seed || 3, o.crack[2] || 1);
}
// a star of cracks from an impact point: dark seams with a lit pixel on the upper-left of each
function anCrackPx(A, inG, cx, cy, seed, big) {
  const rnd = AN_SEED(seed + 7), n = 6 + Math.round(big * 2);
  for (let i = 0; i < n; i++) {
    let a = i / n * Math.PI * 2 + rnd() * 0.6, x = cx, y = cy; const L = (5 + rnd() * 9) * big;
    for (let s = 0; s < L; s++) {
      a += (rnd() - 0.5) * 0.5; x += Math.cos(a); y += Math.sin(a);
      const X = Math.round(x), Y = Math.round(y); if (!inG(X, Y)) break;
      A.px(X, Y, '#0c1018'); if (inG(X - 1, Y - 1) && (s & 1)) A.px(X - 1, Y - 1, '#ffffff');
      if (s === 3 && rnd() < 0.6) { let b = a + (rnd() < 0.5 ? 1 : -1) * 0.9, bx = X, by = Y; for (let t = 0; t < 3 * big; t++) { bx += Math.cos(b); by += Math.sin(b); if (!inG(Math.round(bx), Math.round(by))) break; A.px(Math.round(bx), Math.round(by), '#1a2230'); } }
    }
  }
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) if (inG(cx + dx, cy + dy)) A.px(cx + dx, cy + dy, dx || dy ? '#0c1018' : '#ffffff');
}
// a standing mirror: an arched pane of silvered glass in a polished silver frame on a stepped plinth
function anMirrorFrame(cracked, sheen) {
  return mnFrame('anmir|' + (cracked ? 1 : 0) + '|' + sheen, 20, 44, 10, 41, A => {
    A.poly([[1, 38], [19, 38], [20, 42], [0, 42]], 'anSilverD', { band: 1 });                              // the plinth
    A.poly([[3, 35], [17, 35], [18, 38.5], [2, 38.5]], 'anSilver', {});
    A.poly([[3, 36], [3, 10], [4, 6], [7, 3], [10, 1.5], [13, 3], [16, 6], [17, 10], [17, 36]], 'anSilver', { band: 2 });   // the frame
    A.ell(10, 1.5, 1.6, 1.6, 'anSilver', {});                                                              // the finial
    const inG = (x, y) => x >= 5 && x <= 14 && y >= 5 && y <= 33 && (y >= 10 || ((x + 0.5 - 10) / 5.2) ** 2 + ((y + 0.5 - 10) / 5.4) ** 2 <= 1);
    // the inner rim: a dark seam round the glass
    for (let y = 3; y <= 35; y++) for (let x = 3; x <= 17; x++) if (!inG(x, y) && (inG(x + 1, y) || inG(x - 1, y) || inG(x, y + 1) || inG(x, y - 1))) A.px(x, y, inG(x + 1, y) || inG(x, y + 1) ? '#c8d4e2' : '#1e2430');
    anGlassPane(A, inG, 5, 5, 14, 33, { seed: 11, sheen: sheen >= 0 ? sheen * 4 - 6 : null, crack: cracked ? [11, 21, 1] : null });
    // hand-placed glints and seams on the frame
    for (const y of [12, 20, 28]) { A.px(4, y, '#ffffff'); A.px(16, y, '#3a4252'); A.px(4, y + 1, '#c8d4e2'); }
    A.px(9, 0, '#ffffff'); A.px(10, 1, '#ffffff'); A.px(6, 4, '#ffffff'); A.px(5, 5, '#e8f0f8');
    for (let x = 4; x <= 16; x += 3) A.px(x, 37, '#ffffff');
    A.px(18, 40, '#8a98ae'); A.px(2, 40, '#d8e2ee');
  });
}
// the great mirror that falls: a tall oval of glass in a heavy silver frame with a crest and clawed feet
function anGreatFrame(cracked) {
  return mnFrame('angreat|' + (cracked ? 1 : 0), 34, 56, 17, 53, A => {
    A.poly([[7, 47], [11, 45], [13, 53], [5, 53]], 'anSilverD', { band: 1 });                              // the clawed feet
    A.poly([[27, 47], [23, 45], [21, 53], [29, 53]], 'anSilverD', { band: 1 });
    A.ell(17, 27, 14, 22, 'anSilver', { band: 2 });                                                         // the frame
    A.poly([[12, 7], [17, 1], [22, 7]], 'anSilver', {});                                                    // the crest
    A.ell(17, 3, 2.2, 2.2, 'anSilver', {});
    const inG = (x, y) => ((x + 0.5 - 17) / 10.6) ** 2 + ((y + 0.5 - 27) / 18.6) ** 2 <= 1;
    for (let y = 4; y <= 50; y++) for (let x = 2; x <= 32; x++) if (!inG(x, y) && (inG(x + 1, y) || inG(x - 1, y) || inG(x, y + 1) || inG(x, y - 1))) A.px(x, y, inG(x + 1, y) || inG(x, y + 1) ? '#c8d4e2' : '#1e2430');
    anGlassPane(A, inG, 7, 9, 27, 45, { seed: 23, slope: 0.4, streak: 3, crack: cracked ? [15, 29, 1.6] : null });
    if (cracked) {   // a wedge of glass knocked out: the black backing shows through, the broken edge glints
      const hole = [[19, 33], [26, 30], [25, 40]];
      for (let y = 30; y <= 41; y++) for (let x = 18; x <= 27; x++) {
        if (!inG(x, y)) continue; let c = false;
        for (let i = 0, j = 2; i < 3; j = i++) { const [xi, yi] = hole[i], [xj, yj] = hole[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
        if (c) A.px(x, y, (x + y) % 5 ? '#0a0c12' : '#141a24');
      }
      A.px(19, 33, '#ffffff'); A.px(22, 32, '#ffffff'); A.px(25, 36, '#e4f2ff');
    }
    // the frame's glints: a ring of studs, bright on the lit side
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, x = Math.round(17 + Math.cos(a) * 12.6), y = Math.round(27 + Math.sin(a) * 20.6); A.px(x, y, Math.cos(a) + Math.sin(a) < 0 ? '#ffffff' : '#3a4252'); }
    A.px(16, 2, '#ffffff'); A.px(17, 1, '#ffffff'); A.px(9, 47, '#d8e2ee'); A.px(25, 47, '#8a98ae');
  });
}
// a patch of cracked mirror lying in the ground: broken plates of glass with dark seams, reflecting the sky
function anCrackFrame(v) {
  return mnFrame('ancrack|' + v, 20, 11, 10, 6, A => {
    const rnd = AN_SEED(v * 31 + 5), pts = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rnd() * 0.3, R = 0.75 + rnd() * 0.3; pts.push([10 + Math.cos(a) * 8.5 * R, 5.5 + Math.sin(a) * 4.2 * R]); }
    // split the patch into wedges round a point: each plate tilts a little, so each catches the sky differently
    const cx = 9 + rnd() * 2, cy = 5 + rnd();
    for (let i = 0; i < pts.length; i += 2) { const a = pts[i], b = pts[(i + 1) % pts.length], c = pts[(i + 2) % pts.length]; A.poly([[cx, cy], a, b, c], 'anGlassF', { tone: [0, 1, -1, 1, 0][(i / 2 + v) % 5], band: 1 }); }
    A.px(Math.round(cx), Math.round(cy), '#ffffff');
    for (let i = 0; i < 3; i++) A.px(Math.round(4 + rnd() * 12), Math.round(3 + rnd() * 5), '#ffffff');
  });
}
// jagged slivers of mirror-glass bursting up out of the crack
function anSpikeFrame(v) {
  return mnFrame('anspike|' + v, 16, 24, 8, 21, A => {
    const rnd = AN_SEED(v * 13 + 1), s = [[-1, -18 - rnd() * 3, 2.2], [-4.5, -10 - rnd() * 3, 1.8], [3.5, -12 - rnd() * 4, 2]];
    s.forEach(([x, h, w], i) => A.poly([[8 + x - w, 21], [8 + x + (i === 1 ? -1 : i === 2 ? 1.5 : 0.3), 21 + h], [8 + x + w, 21]], 'anGlassF', { band: 1, tone: i === 0 ? 1 : 0 }));
    s.forEach(([x, h], i) => { const tx = Math.round(8 + x + (i === 1 ? -1 : i === 2 ? 1.5 : 0.3)), ty = Math.round(21 + h) + 1; A.px(tx, ty, '#ffffff'); A.px(tx, ty + 2, '#dff2ff'); });
  });
}
// the living wisps' colours: the lance burns ice-white, the golem's ghostfire pale green-white
if (typeof MN_WISP !== 'undefined') {
  MN_WISP.lance = ['#0e2a44', '#2e7aba', '#7ad0ff', '#d8f6ff', '#ffffff'];
  MN_WISP.bolt = ['#0c3222', '#2a8a5a', '#8ae8b0', '#e4ffec', '#ffffff'];
}
const AN_RGB = { beam: '255,214,140', prism: '215,180,255', lance: '150,210,255', bolt: '190,255,210', gold: '255,214,140' };
const AN_HEX = { beam: '#fff2c8', prism: '#eedcff', lance: '#e8f6ff', bolt: '#eaffd8', gold: '#fff2c8' };

// ------------------------------------------------------------------- state
const AN_STATS = { darts: 0, strikes: 0, rebounds: 0, splits: 0, bolts: 0, crackSplits: 0 };   // for the play-test scripts
function anReset() { G.adarts = []; G.afis = []; G.acracks = []; G.aspikes = []; G.aglass = []; G.agshots = []; G.aglints = []; }
anReset();
function anCrackLife() { return 5 + 0.25 * (P.skills.fissure || 0); }
function anGlint(x, y, z, big) { G.aglints.push({ x, y, z: z || 14, t: big ? 0.45 : 0.32, max: big ? 0.45 : 0.32, big: !!big }); if (G.aglints.length > 60) G.aglints.shift(); }
function anGlassBurst(x, y, n, spd, z0) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.8); G.aglass.push({ x, y, z: (z0 || 6) * (0.5 + Math.random()), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 10 + Math.random() * 30, t: 0.8 + Math.random() * 0.8, max: 1.6, s: Math.random() < 0.35 ? 2 : 1, seed: Math.random() * 10 }); }
  if (G.aglass.length > 500) G.aglass.splice(0, G.aglass.length - 500);
}
function anGlassShot(x, y, vx, vy, dmg, t) { G.agshots.push({ x, y, vx, vy, t: t || 0.45, dmg, hit: new Set() }); }
function anIsMirror(o) { return !!o && metals().includes(o) && o.state !== 'dormant'; }
function anCracked(o) { return !!o && (o.cracked || (G.anvils.includes(o) && o.fall <= 0)); }
function anMirZ(o) { return o === G.golem ? 20 : G.anvils.includes(o) ? 22 : o === G.flyShield ? 14 : 18; }

// ------------------------------------------------------------------- living wisps: darting, ricocheting, rebounding, splitting
function anMeta(kind, o) {
  return Object.assign({ kind, ck: kind, t: 0, tk: 'pt', tgt: null, hops: 1, mult: 1, decay: 0.85, dmg: 1, hit: new Set(), used: new Set(), bounces: 0, maxB: 3, mirHops: 1, bounceK: 1, mirR: 3, leap: 4.2, spd: 14, turn: 10, weave: 0, gen: 0, trail: [], vx: 1, vy: 0, splitN: 2, x: 0, y: 0, z: 12 }, o || {});
}
function anNextFoe(from, M, R) {
  let best = null, bd = R;
  for (const m of G.zone.monsters) { if (m.dead || m.hidden || M.hit.has(m) || Math.abs(m.x - from.x) > R || Math.abs(m.y - from.y) > R) continue; const d = Math.hypot(m.x - from.x, m.y - from.y); if (d < bd && lineClear(G.zone, from, m)) { bd = d; best = m; } }
  return best;
}
function anNearMirror(from, M, R) {
  let best = null, bd = R;
  for (const o of metals()) { if (M.used.has(o) || o.state === 'dormant') continue; const d = Math.hypot(o.x - from.x, o.y - from.y); if (d < bd && d > 0.2 && lineClear(G.zone, from, o) && anNextFoe(o, M, 6.5)) { bd = d; best = o; } }
  return best;
}
// start a wisp toward a monster ('mon'), a mirror ('mir') or a bare point ('pt'); it leaves at an angle, like a living thing
function anLaunch(F, M, tgt, tk, bend) {
  M.tgt = tgt; M.tk = tk; M.from = { x: F.x, y: F.y };
  const a = Math.atan2(tgt.y - F.y, tgt.x - F.x) + (bend || 0); M.vx = Math.cos(a); M.vy = Math.sin(a);
}
// throw off sparks of a wisp at the nearest foes it has not struck
function anSplit(F, M, n, pct) {
  const foes = G.zone.monsters.filter(m => !m.dead && !m.hidden && !M.hit.has(m) && Math.hypot(m.x - F.x, m.y - F.y) < 5 && lineClear(G.zone, F, m)).sort((a, b) => Math.hypot(a.x - F.x, a.y - F.y) - Math.hypot(b.x - F.x, b.y - F.y)).slice(0, n);
  foes.forEach((m, i) => {
    const s = anMeta(M.kind, { ck: M.ck, x: F.x, y: F.y, z: F.z, dmg: M.dmg * pct, hops: 1, decay: 0.8, maxB: 1, mirHops: 0, bounceK: 1, spd: M.spd * 1.15, turn: 14, gen: M.gen + 1, hit: new Set(M.hit), small: true, onHit: M.onHitChild || null, used: new Set(M.used) });
    anLaunch(s, s, m, 'mon', (i - (foes.length - 1) / 2) * 0.9 + (Math.random() - 0.5) * 0.3);
    G.adarts.push(s);
  });
  if (foes.length) { sfx(1800 + Math.random() * 400, 0.06, 'triangle', 0.02, 600); AN_STATS.splits += foes.length; }
  return foes.length;
}
// one step of a wisp's flight; F is what moves (a choir wisp, or the dart itself), M its flight. true when it is done
function anFly(F, M, dt) {
  M.t += dt; if (M.t > 5) return true;
  let T = M.tgt;
  if (M.tk === 'mon' && (!T || T.dead)) { const n = anNextFoe(F, M, 4.5); if (!n) return true; M.tgt = T = n; }
  if (M.tk === 'mir' && !anIsMirror(T)) { const n = anNextFoe(F, M, 5); if (!n) return true; M.tk = 'mon'; M.tgt = T = n; }
  if (!T) return true;
  const tz = M.tk === 'mon' ? 9 : M.tk === 'mir' ? anMirZ(T) : 8;
  const dx = T.x - F.x, dy = T.y - F.y, l = Math.hypot(dx, dy) || 1e-6, step = M.spd * dt;
  const reach = M.tk === 'mon' ? (T.r || 0.3) * 0.5 + 0.08 : 0.25;
  M.trail.push({ x: F.x, y: F.y, z: F.z, t: M.t }); while (M.trail.length > 10 || (M.trail.length > 2 && M.t - M.trail[0].t > (M.small ? 0.06 : 0.1))) M.trail.shift();   // a comet a tenth of a second long
  if (l <= step + reach) {
    F.x = T.x - dx / l * reach; F.y = T.y - dy / l * reach; F.z += (tz - F.z) * 0.6;
    return anArrive(F, M);
  }
  const k = l < 1.1 ? 1 : Math.min(1, dt * M.turn);
  M.vx += (dx / l - M.vx) * k; M.vy += (dy / l - M.vy) * k; const vl = Math.hypot(M.vx, M.vy) || 1; M.vx /= vl; M.vy /= vl;
  const wv = M.weave ? Math.sin(M.t * 17) * M.weave * Math.min(1, l / 1.5) : 0;
  F.x += (M.vx - M.vy * wv) * step; F.y += (M.vy + M.vx * wv) * step;
  F.z += (tz + Math.sin(M.t * 21) * 1.5 - F.z) * Math.min(1, dt * 9);
  // Weaving Flight: what it passes is cut
  if (M.graze) for (const m of G.zone.monsters) { if (m.dead || m === T || Math.abs(m.x - F.x) > 0.8 || Math.abs(m.y - F.y) > 0.8) continue; if (Math.hypot(m.x - F.x, m.y - F.y) > m.r + 0.25) continue; (M.grazed = M.grazed || new Set()); if (M.grazed.has(m)) continue; M.grazed.add(m); hurtMon(m, M.dmg * 0.35, AN_HEX[M.ck]); }
  // cracked mirror-glass fissures it into more wisps
  if (M.gen === 0 && !M.split) for (const c of G.acracks) { if (Math.abs(c.x - F.x) > 0.5 || Math.abs(c.y - F.y) > 0.5 || Math.hypot(c.x - F.x, c.y - F.y) > 0.45) continue; M.split = true; AN_STATS.crackSplits++; anGlint(c.x, c.y, 3, true); anGlassBurst(c.x, c.y, 4, 1.5, 3); anSplit(F, M, M.splitN, 0.6); break; }
  return false;
}
function anArrive(F, M) {
  if (M.tk === 'pt') return true;
  if (M.tk === 'mon') {
    const m = M.tgt, dmg = M.dmg * M.mult;
    hurtMon(m, dmg, AN_HEX[M.ck]); M.hit.add(m); AN_STATS.strikes++;
    if (M.onHit) M.onHit(m, dmg, M, F);
    burst(m.x, m.y, AN_HEX[M.ck], M.small ? 2 : 4, 1.2);
    M.hops--; M.mult *= M.decay; M.from = { x: m.x, y: m.y };
    if (M.bounces < M.maxB) { const mir = anNearMirror(m, M, M.mirR); if (mir) { M.tk = 'mir'; M.tgt = mir; return false; } }
    if (M.hops > 0) { const n = anNextFoe(m, M, M.leap); if (n) { M.tgt = n; return false; } }
    if (M.onEnd) M.onEnd(m, M);
    return true;
  }
  // a mirror: the wisp rebounds renewed; cracked glass splits it
  const o = M.tgt; M.used.add(o); M.bounces++; AN_STATS.rebounds++; M.mult = Math.max(1, M.mult) * M.bounceK; M.hops += M.mirHops + (o.hall ? 1 : 0);
  anGlint(o.x, o.y, anMirZ(o), true); sfx(1500 + Math.random() * 500, 0.08, 'triangle', 0.025, 900);
  if (anCracked(o) && M.gen === 0) { anSplit(F, M, M.splitN, 0.6); anGlassBurst(o.x, o.y, 3, 1.2, anMirZ(o)); }
  if (M.onMirror) M.onMirror(o, M, F);
  const n = anNextFoe(o, M, 6.5); if (!n) return true;
  M.tk = 'mon'; M.tgt = n; M.from = { x: o.x, y: o.y };
  const d = Math.hypot(n.x - o.x, n.y - o.y) || 1; M.vx = (n.x - o.x) / d; M.vy = (n.y - o.y) / d;   // a sharp ricochet
  return false;
}

// ------------------------------------------------------------------- the choir: darting and splitting wisps
function anWispMeta(w) {
  const ember = aM('w_ember') ? 1 : 0;
  if (w.kind === 'prism') return anMeta('prism', {
    dmg: WS.prismDps() * 0.6, hops: 1 + ember, decay: 0.9, maxB: WS.maxBounce(), mirHops: 1 + (P.skills.resonance > 0 ? 1 : 0), bounceK: WS.bounceMult(), spd: 12, turn: 8, splitN: WS.prismN(),
    onHit: (m, dmg, M, F) => { if (M.gen === 0) anSplit(F, M, WS.prismN(), WS.prismPct()); },
    onMirror: (o, M, F) => { if (!anCracked(o)) anSplit(F, M, WS.prismN() + 1, WS.prismPct()); }
  });
  return anMeta('beam', {
    dmg: WS.beamDps() * 0.6, hops: WS.pierce('beam') + 1 + ember, decay: 0.88, maxB: WS.maxBounce(), mirHops: 1 + (P.skills.resonance > 0 ? 1 : 0), bounceK: WS.bounceMult(), spd: 13, turn: 9,
    weave: P.skills.sweep > 0 ? 0.5 : 0, graze: P.skills.sweep > 0,
    onHit: P.skills.beamburn > 0 ? (m, dmg) => burnMon(m, dmg * 1.2, 2) : null,
    onHitChild: P.skills.beamburn > 0 ? (m, dmg) => burnMon(m, dmg, 2) : null
  });
}
updateLanternWisp = function (w, dt) {
  const M = w.dart;
  if (!M) {
    drift(w, dt, false); w.cd -= dt;
    if (w.cd <= 0) {
      const a = lanternAim(w);
      if (a) { w.dart = anWispMeta(w); anLaunch(w, w.dart, a.target, a.metal ? 'mir' : 'mon', (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.5)); w.state = 'dart'; AN_STATS.wispDarts = (AN_STATS.wispDarts || 0) + 1; sfx(w.kind === 'prism' ? 900 : 700, 0.12, 'sine', 0.02, 500); }
      else w.cd = 0.25;
    }
    return;
  }
  if (anFly(w, M, dt) || dist(w, P) > 10) { w.dart = null; w.state = 'drift'; w.cd = w.kind === 'prism' ? 0.9 : 1.0; w.vx = M.vx * 4; w.vy = M.vy * 4; }
};
{ const _rw = resetWisp; resetWisp = function (w, kind) { w.dart = null; return _rw(w, kind); }; }

// ------------------------------------------------------------------- Spirit Dart (was Spirit Lance): a darting wisp that ricochets
lancePulse = function () {
  const a = aimPoint(), R0 = WS.lanceRange();
  faceTo(a.x, a.y);
  let first = null, bd = 2.2;
  for (const m of G.zone.monsters) { if (m.dead || m.hidden) continue; const dc = Math.hypot(m.x - a.x, m.y - a.y), dp = dist(m, P); if (dp > R0 + m.r || dc > bd || !lineClear(G.zone, P, m)) continue; bd = dc; first = m; }
  const focus = 1 + WS.focusMax() * Math.min(1, (P.anHold || 0) / 2), sp = WS.siphon() + lanceSiphon();
  const M = anMeta('lance', {
    x: P.x + P.face * 0.15, y: P.y, z: 13, dmg: WS.lanceDps() * 0.42 * focus, hops: WS.lancePierce() + 1, decay: 0.82, maxB: 99, mirHops: 2, bounceK: 1, mirR: 3.2, leap: 4.2, spd: 16, turn: 12,
    onHit: (m, dmg, M) => {
      P.lastHit = m; if (sp) { P.hp = Math.min(D.maxHp, P.hp + dmg * sp); P.mana = Math.min(D.maxMana, P.mana + dmg * sp); }
      if (aU('a_blade') && M.from) { G.strails2.push({ x0: M.from.x, y0: M.from.y, x1: m.x, y1: m.y, t: 1.5, tick: 0 }); while (G.strails2.length > 12) G.strails2.shift(); }
      G.shake = Math.max(G.shake, 0.5);
    },
    onEnd: (m, M) => { if (aU('a_sage')) shockArc(m, M.dmg * 0.6, 2, new Set(M.hit), '#ffffff'); },
    onMirror: P.skills.prismL > 0 ? (o, M, F) => { anSplit(F, M, WS.prismLN(), WS.prismLPct()); } : null
  });
  if (first) anLaunch(M, M, first, 'mon', (Math.random() - 0.5) * 0.8);
  else { const d = Math.min(R0, Math.hypot(a.x - P.x, a.y - P.y)) || 1, ang = Math.atan2(a.y - P.y, a.x - P.x); anLaunch(M, M, { x: P.x + Math.cos(ang) * d, y: P.y + Math.sin(ang) * d }, 'pt', 0); }
  G.adarts.push(M); AN_STATS.darts++;
  sfx(1100 + Math.random() * 200, 0.12, 'sine', 0.03, 700);
};

// ------------------------------------------------------------------- a wisp-bolt of ghostfire (kept for the play-test hooks; the berserk golem fires its base beam)
function anBolt(src, i, k) {
  const R = 7, foes = G.zone.monsters.filter(m => !m.dead && !m.hidden && Math.hypot(m.x - src.x, m.y - src.y) < R && lineClear(G.zone, src, m)).sort((a, b) => Math.hypot(a.x - src.x, a.y - src.y) - Math.hypot(b.x - src.x, b.y - src.y));
  if (!foes.length) return false;
  const m = foes[(i || 0) % Math.min(3, foes.length)];
  const M = anMeta('bolt', {
    x: src.x, y: src.y, z: src === P ? 14 : 24, dmg: WS.auraDps() * 0.32 * (k || 1), hops: 1 + (P.skills.jugg > 0 ? 1 : 0), decay: 0.8, maxB: 2, mirHops: 1, bounceK: 1.2, spd: 16, turn: 7,
    onHit: (m, dmg) => { burnMon(m, dmg * 0.45, 2); if (Math.random() < 0.3) { fireGround(m.x, m.y, 0.5, dmg * 0.3, 2.2); const f = G.fires[G.fires.length - 1]; if (f) f.pale = true; } }
  });
  anLaunch(M, M, m, 'mon', (Math.random() - 0.5) * 2.2);
  G.adarts.push(M); AN_STATS.bolts++;
  if (src.face != null && src !== P) src.face = (m.x - src.x) - (m.y - src.y) > 0 ? 1 : -1;
  return true;
}

// ------------------------------------------------------------------- Mirror Fissure: a crack of mirror-glass
castFissure = function (pt) {
  if (!P.skills.fissure || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('fissure')) return;
  endWraith();
  const a = pt || aimPoint(), d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d;
  const L = WS.fissureLen(), n = Math.round(L / 0.6), keep = WS.fissureKeep() + (aM('i_spikes') ? 1 : 0);
  G.afis.push({ x: P.x, y: P.y, dx, dy, i: 0, n, t: 0, keep, hit: new Set() });
  P.cast = 0.4 / D.castSpd; faceTo(a.x, a.y); sfx(2400, 0.3, 'triangle', 0.025, -1800);
};
function anUpdateFissures(dt) {
  for (const f of G.afis) {
    f.t -= dt;
    while (f.t <= 0 && f.i < f.n) {
      f.t += 0.045; f.i++;
      const x = f.x + f.dx * f.i * 0.6, y = f.y + f.dy * f.i * 0.6;
      if (G.zone.solidAt(x, y)) { f.i = f.n; break; }
      G.aspikes.push({ x, y, t: 0.5, max: 0.5, v: (f.i * 7 + Math.floor(Math.random() * 3)) % 4 });
      const life = anCrackLife(); G.acracks.push({ x: x + rand(-0.08, 0.08), y: y + rand(-0.08, 0.08), t: life, max: life, v: Math.floor(Math.random() * 4), tw: Math.random() * 6 });
      while (G.acracks.length > 90) G.acracks.shift();
      anGlassBurst(x, y, 3, 2, 8);
      for (const m of G.zone.monsters) if (!m.dead && !f.hit.has(m) && Math.hypot(m.x - x, m.y - y) < 0.7 + m.r) { f.hit.add(m); hurtMon(m, WS.fissureDmg(), '#e8f6ff'); m.stun = Math.max(m.stun || 0, P.skills.fdeep > 0 ? 0.8 : 0.4); }
      if (P.skills.fshrap > 0) for (const sg of [1, -1]) anGlassShot(x, y, -f.dy * 9 * sg, f.dx * 9 * sg, WS.fissureDmg() * 0.3);
      if (f.i > f.n - f.keep && raisePillar(x + f.dy * 0.01, y, WS.pillarLife() * 0.7, 0)) G.pillars[G.pillars.length - 1].cracked = true;
      if (f.i % 2) sfx(1800 + f.i * 40 + Math.random() * 300, 0.05, 'triangle', 0.02, -900);
    }
  }
  G.afis = G.afis.filter(f => f.i < f.n);
}

// ------------------------------------------------------------------- Falling Mirror (was Iron Anvil): it lands, its glass bursts out
updateAnvils = function (dt) {
  for (const a of G.anvils) {
    if (a.fall > 0) {
      a.fall -= dt;
      if (a.fall <= 0 && a.fresh) {
        a.fresh = false; a.cracked = true; G.shake = Math.max(G.shake, 5);
        anGlassBurst(a.x, a.y, 40, 4, 22); anGlint(a.x, a.y, 24, true);
        sfx(55, 0.6, 'square', 0.06, -20); sfx(2600, 0.5, 'triangle', 0.04, -2000); sfx(3400, 0.3, 'square', 0.015, -2600);
        for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d > 1.25 + m.r) continue; hurtMon(m, a.dmg, '#e8f6ff'); m.stun = Math.max(m.stun || 0, m.rank === 'boss' ? 0.4 : 1.2); if (d < a.r + m.r) moveCircle(m, (m.x - a.x) / (d || 1) * (a.r + m.r - d + 0.05), (m.y - a.y) / (d || 1) * (a.r + m.r - d + 0.05)); }
        parts.push({ ring: true, x: a.x, y: a.y, r: 0.3, max: 1.4, t: 0.4, col: '#e8f6ff' });
        const q = P.skills.anvilquake > 0, n = q ? 16 : 8, k = q ? 0.4 : 0.22;
        for (let i = 0; i < n; i++) { const ang = i / n * Math.PI * 2 + 0.2; anGlassShot(a.x + Math.cos(ang) * 0.4, a.y + Math.sin(ang) * 0.4, Math.cos(ang) * 8, Math.sin(ang) * 8, a.dmg * k, q ? 0.4 : 0.3); }
      }
      continue;
    }
    a.life -= dt;
    if (P.skills.anvilstay > 0) for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - a.x, m.y - a.y) < 1.8 + m.r) m.slow = Math.max(m.slow || 0, 0.4);
  }
  G.anvils = G.anvils.filter(a => { if (a.life <= 0) { anGlassBurst(a.x, a.y, 26, 2.5, 18); sfx(2200, 0.3, 'triangle', 0.025, -1500); return false; } return true; });
};

// ------------------------------------------------------------------- mirrors: they glint as they rise, and shatter when they go
{
  const _up = updatePillars;
  updatePillars = function (dt) {
    const before = G.pillars.slice();
    _up(dt);
    for (const p of before) if (!p.bone && p.life <= 0 && !G.pillars.includes(p)) { anGlassBurst(p.x, p.y, 12, 2, 18); }
    for (const p of G.pillars) if (!p.bone && !p._anUp && p.rise <= 0) { p._anUp = true; anGlint(p.x, p.y, 30); }
  };
  const _cc = castCage;
  castCage = function (pt) { const n0 = G.pillars.length; _cc(pt); for (let i = n0; i < G.pillars.length; i++) G.pillars[i].hall = true; };
  // the challenge is a flash of the golem's polished face, not a red war-cry ring
  const _uc = updateChallenge;
  updateChallenge = function (g, dt) {
    const n0 = parts.length; _uc(g, dt);
    for (let i = n0; i < parts.length; i++) if (parts[i].ring && parts[i].col === '#c8553d') { parts[i].col = '#e8f6ff'; anGlint(g.x, g.y, 26, true); anGlint(g.x - 0.3, g.y + 0.3, 16); }
  };
}

// ------------------------------------------------------------------- the per-frame update
function anUpdate(dt) {
  if (G._anZone !== G.zone) { G._anZone = G.zone; anReset(); for (const w of P.wisps) w.dart = null; }
  P.anHold = heldSkill('lance') && P.skills.lance > 0 ? (P.anHold || 0) + dt : 0;
  for (const d of G.adarts) if (anFly(d, d, dt)) d.done = true;
  G.adarts = G.adarts.filter(d => !d.done); if (G.adarts.length > 160) G.adarts.splice(0, G.adarts.length - 160);
  anUpdateFissures(dt);
  for (const c of G.acracks) c.t -= dt;
  G.acracks = G.acracks.filter(c => { if (c.t <= 0) { if (Math.random() < 0.5) anGlassBurst(c.x, c.y, 2, 1, 2); return false; } return true; });
  for (const s of G.aspikes) { s.t -= dt; if (s.t <= 0) anGlassBurst(s.x, s.y, 3, 1.4, 6); }
  G.aspikes = G.aspikes.filter(s => s.t > 0);
  for (const g of G.aglass) {
    g.t -= dt; g.vz -= 70 * dt; g.z += g.vz * dt; g.x += g.vx * dt; g.y += g.vy * dt;
    if (g.z <= 0) { g.z = 0; g.vz = Math.abs(g.vz) > 8 ? -g.vz * 0.3 : 0; g.vx *= 0.4; g.vy *= 0.4; }
  }
  G.aglass = G.aglass.filter(g => g.t > 0);
  for (const s of G.agshots) {
    s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (G.zone.solidAt(s.x, s.y)) { s.t = 0; anGlassBurst(s.x, s.y, 2, 1, 6); continue; }
    for (const m of G.zone.monsters) if (!m.dead && !s.hit.has(m) && Math.abs(m.x - s.x) < 1 && Math.hypot(m.x - s.x, m.y - s.y) < m.r + 0.15) { s.hit.add(m); hurtMon(m, s.dmg, '#e8f6ff'); }
  }
  G.agshots = G.agshots.filter(s => s.t > 0);
  for (const g of G.aglints) g.t -= dt; G.aglints = G.aglints.filter(g => g.t > 0);
}
{ const _us = updateSpells; updateSpells = function (dt) { _us(dt); anUpdate(dt); }; }

// ------------------------------------------------------------------- drawing
// a comet of soul-light: the tail in stepped pixel squares, brightest and widest at the head
function anDrawTail(trail, ck, small, hx, hy, hz) {
  const C = MN_WISP[ck] || MN_WISP.rev, n = trail.length; if (!n) return;
  ctx.globalCompositeOperation = 'lighter';
  const pts = trail.concat([{ x: hx, y: hy, z: hz }]).map(q => { const s = iso(q.x, q.y); return [s.sx, s.sy - q.z]; }), N = pts.length;
  for (let i = 0; i < N - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], k = (i + 1) / N, near = k > 0.65;
    // near the head the flame is whole; further back it breaks into embers that curl and drift
    const steps = near ? Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 1.5)) : 1;
    for (let s = 0; s < steps; s++) {
      const t = s / steps, kk = k - (1 - t) / N, curl = Math.sin(G.time * 24 + i * 1.7) * (1 - kk) * 3.5;
      const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, x = ax + dx * t - dy / l * curl, y = ay + dy * t + dx / l * curl * 0.5;
      const w = small ? (kk > 0.7 ? 2 : 1) : (kk > 0.8 ? 3 : kk > 0.5 ? 2 : 1), col = kk > 0.85 ? C[4] : kk > 0.6 ? C[3] : kk > 0.35 ? C[2] : C[1];
      ctx.globalAlpha = Math.min(1, 0.2 + kk); ctx.fillStyle = col;
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
    }
    if (!small && !near && i % 2 === 0) { ctx.globalAlpha = 0.8; ctx.fillStyle = C[3]; ctx.fillRect(Math.round(ax + Math.sin(i * 2.3 + G.time * 30) * 3), Math.round(ay - 2 - Math.cos(i * 1.7 + G.time * 20) * 2), 1, 1); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function anDrawDart(d) {
  const q = iso(d.x, d.y), sx = Math.round(q.sx), sy = Math.round(q.sy - d.z), rgb = AN_RGB[d.ck] || '160,215,255';
  anDrawTail(d.trail, d.ck, d.small, d.x, d.y, d.z);
  ctx.globalCompositeOperation = 'lighter'; glow(sx + 0.5, sy + 0.5, d.small ? 5 : 9, rgb, d.small ? 0.55 : 0.8); ctx.globalCompositeOperation = 'source-over';
  if (d.small) { const C = MN_WISP[d.ck] || MN_WISP.rev; ctx.fillStyle = C[3]; ctx.fillRect(sx - 1, sy - 1, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy - 1, 1, 2); return; }
  const fr = mnWispFrame(d.ck, Math.floor(G.time * 12 + d.t * 7) % 4);
  ctx.drawImage(fr.c, sx - fr.ox, sy - fr.oy + 4);
}
function anDrawGlint(g) {
  const q = iso(g.x, g.y), sx = Math.round(q.sx), sy = Math.round(q.sy - g.z), k = g.t / g.max, L = Math.round((g.big ? 7 : 4) * Math.sin(Math.PI * k));
  ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, g.big ? 8 : 5, '232,246,255', 0.45 * k); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - L, sy, L * 2 + 1, 1); ctx.fillRect(sx, sy - L, 1, L * 2 + 1);
  ctx.fillStyle = '#cfe8fa'; const e = Math.max(1, L >> 1); ctx.fillRect(sx - e, sy - e, 1, 1); ctx.fillRect(sx + e, sy - e, 1, 1); ctx.fillRect(sx - e, sy + e, 1, 1); ctx.fillRect(sx + e, sy + e, 1, 1);
  ctx.fillRect(sx - 1, sy - 1, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 1, 1);
}
const AN_GLASS_C = ['#ffffff', '#cfe8fa', '#7eaede', '#3e5a80'];
function anDrawGlass(g) {
  const q = iso(g.x, g.y), sx = Math.round(q.sx), sy = Math.round(q.sy - g.z), ph = Math.floor(G.time * 14 + g.seed) % 4;
  if (g.t < 0.4 && ph % 2) return;
  const c = AN_GLASS_C[ph];
  if (g.z <= 0) { ctx.fillStyle = '#0c1018'; ctx.fillRect(sx - 1, sy + 1, g.s + 1, 1); }
  ctx.fillStyle = c; if (g.s > 1) { ctx.fillRect(sx, sy, ph % 2 ? 2 : 1, ph % 2 ? 1 : 2); ctx.fillStyle = ph === 0 ? '#7eaede' : '#ffffff'; ctx.fillRect(sx + (ph % 2 ? 1 : 0), sy + (ph % 2 ? 0 : 1), 1, 1); } else ctx.fillRect(sx, sy, 1, 1);
}
function anDrawGlassShot(s) {
  const q = iso(s.x, s.y), sx = q.sx, sy = q.sy - 9, l = Math.hypot(s.vx, s.vy) || 1, dx = (s.vx - s.vy) / l, dy = (s.vx + s.vy) / l * 0.5;
  ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, 5, '220,240,255', 0.45); ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 5; i++) { const x = Math.round(sx - dx * i), y = Math.round(sy - dy * i); ctx.fillStyle = i === 0 ? '#ffffff' : i < 3 ? '#bfe0f8' : '#5a8cc4'; ctx.fillRect(x, y, 1, 1); }
  ctx.fillStyle = '#10182a'; ctx.fillRect(Math.round(sx - dx * 2), Math.round(sy - dy * 2) + 1, 1, 1);
}
function anDrawCrack(c) {
  const q = iso(c.x, c.y), fr = anCrackFrame(c.v);
  if (c.t < 1 && Math.floor(G.time * 10) % 2) return;
  ctx.globalAlpha = Math.min(1, c.t / 0.5, (c.max - c.t) / 0.15); ctx.drawImage(fr.c, Math.round(q.sx) - fr.ox, Math.round(q.sy) - fr.oy); ctx.globalAlpha = 1;
  // it catches the sky: a travelling twinkle
  const tw = (G.time * 1.3 + c.tw) % 3; if (tw < 0.25) { const sx = Math.round(q.sx - 5 + tw * 40), sy = Math.round(q.sy - 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 1, 1); ctx.fillStyle = '#cfe8fa'; ctx.fillRect(sx - 1, sy, 1, 1); ctx.fillRect(sx + 1, sy, 1, 1); }
}
function anDrawSpike(s) {
  const q = iso(s.x, s.y), sx = Math.round(q.sx), sy = Math.round(q.sy), k = 1 - s.t / s.max, fr = anSpikeFrame(s.v);
  const up = k < 0.2 ? k / 0.2 : k > 0.7 ? (1 - k) / 0.3 : 1, h = Math.round(fr.h * up);
  ctx.save(); ctx.beginPath(); ctx.rect(sx - fr.w, sy + 3 - 40, fr.w * 2, 40); ctx.clip();
  mnBlit(fr, sx, sy + (fr.h - h), 1, false, 1); ctx.restore();
  if (k < 0.3) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - 8, 8, '220,240,255', 0.5 * (1 - k / 0.3)); ctx.globalCompositeOperation = 'source-over'; }
}
// standing mirrors (the bone pillars keep their own art)
{
  const _dp = drawPillar;
  drawPillar = function (pl) {
    if (pl.bone) return _dp(pl);
    const p = iso(pl.x, pl.y), k = pl.rise > 0 ? 1 - pl.rise / 0.22 : 1, sx = Math.round(p.sx), sy = Math.round(p.sy);
    if (pl.life < 1.5 && pl.rise <= 0 && Math.floor(G.time * 8) % 2) return;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    const cyc = (G.time + (pl.x * 7.3 + pl.y * 3.1) % 3) % 3, sh = cyc < 0.6 ? Math.floor(cyc / 0.6 * 8) : -1;
    const fr = anMirrorFrame(!!pl.cracked, sh), h = Math.round(fr.h * k);
    ctx.save(); ctx.beginPath(); ctx.rect(sx - fr.w, sy + 3 - 60, fr.w * 2, 60); ctx.clip();
    mnBlit(fr, sx, sy + (fr.h - h), 1, false, 1);
    ctx.restore();
    if (pl.rise > 0) { ctx.fillStyle = '#cfe8fa'; for (let i = 0; i < 4; i++) ctx.fillRect(sx - 7 + i * 4, sy - 1 - (i % 2), 1, 1); }
  };
}
// the great mirror falls, lands, and stands cracked
{
  const _r14 = render14;
  render14 = function (list) {
    const AN = G.anvils; G.anvils = [];
    try { _r14(list); } finally { G.anvils = AN; }
    for (const a of G.anvils) list.push({ d: a.x + a.y, f: () => {
      const q = iso(a.x, a.y), k = a.fall > 0 ? Math.max(0, a.fall - a.delay) / a.fallMax : 0, z = Math.max(0, k) * 140;
      if (a.fall - a.delay > a.fallMax) return;
      ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.3 * (1 - k)})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy + 1, 12 * (1.2 - k * 0.6), 6 * (1.2 - k * 0.6), 0, 0, 6.28); ctx.fill();
      if (a.fall <= 0 && a.life < 1.5 && Math.floor(G.time * 8) % 2) return;
      const fr = anGreatFrame(a.fall <= 0), r = mnBlit(fr, q.sx, q.sy - z, 1, false, 1);
      if (z > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(220,240,255,0.35)'; for (const [dx, L] of [[-10, 18], [-3, 26], [5, 22], [11, 14]]) ctx.fillRect(Math.round(q.sx + dx), r.y - L, 1, L); glow(q.sx, r.y + 20, 16, '220,240,255', 0.3); ctx.globalCompositeOperation = 'source-over'; }
    } });
  };
}
// the rest go into the world's draw list with the Animancer's other things
{
  const _ar = arcanaRender;
  arcanaRender = function (list) {
    _ar(list);
    for (const c of G.acracks) if (onScreen(c.x, c.y)) list.push({ d: c.x + c.y - 0.55, f: () => anDrawCrack(c) });
    for (const s of G.aspikes) if (onScreen(s.x, s.y)) list.push({ d: s.x + s.y + 0.02, f: () => anDrawSpike(s) });
    for (const g of G.aglass) list.push({ d: g.x + g.y + (g.z > 0 ? 0.05 : -0.5), f: () => anDrawGlass(g) });
    for (const s of G.agshots) list.push({ d: s.x + s.y + 0.1, f: () => anDrawGlassShot(s) });
    for (const d of G.adarts) list.push({ d: d.x + d.y + 0.2, f: () => anDrawDart(d) });
    if (!P.dead) for (const w of P.wisps) if (w.dart) { const M = w.dart; list.push({ d: w.x + w.y, f: () => anDrawTail(M.trail, w.kind, false, w.x, w.y, w.z) }); }
    for (const g of G.aglints) list.push({ d: 1e5, f: () => anDrawGlint(g) });
  };
  const _l14 = light14;
  light14 = function () {
    _l14();
    for (const d of G.adarts) { const q = iso(d.x, d.y); lightHole(q.sx, q.sy - d.z, d.small ? 10 : 18, 0.5); }
    for (const w of P.wisps) if (w.dart) { const q = iso(w.x, w.y); lightHole(q.sx, q.sy - w.z, 16, 0.45); }
    for (const g of G.aglints) { const q = iso(g.x, g.y); lightHole(q.sx, q.sy - g.z, 12, 0.4 * g.t / g.max); }
  };
}
// ------------------------------------------------------------------- skill icons: little mirrors and comet wisps
{
  const mir = (x, y, w, h) => {   // a tiny standing mirror: silver frame, sky over a dark horizon, one streak
    ctx.fillStyle = '#0a0c12'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#c8d4e2'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#7c889c'; ctx.fillRect(x + w - 1, y, 1, h); ctx.fillRect(x, y + h - 1, w, 1);
    const gx = x + 1, gy = y + 1, gw = w - 2, gh = h - 2, hz = Math.round(gh * 0.55);
    ctx.fillStyle = '#a6ceee'; ctx.fillRect(gx, gy, gw, hz); ctx.fillStyle = '#e4f2ff'; ctx.fillRect(gx, gy, gw, Math.max(1, hz >> 1));
    ctx.fillStyle = '#141a28'; ctx.fillRect(gx, gy + hz, gw, 1); ctx.fillStyle = '#2e2a3a'; ctx.fillRect(gx, gy + hz + 1, gw, gh - hz - 1);
    ctx.fillStyle = '#ffffff'; for (let i = 0; i < Math.min(gw, gh) - 1; i++) ctx.fillRect(gx + (i >> 1), gy + i, 1, 1);
  };
  const comet = (pts, head, col) => { pts.forEach(([a, b], i) => { ctx.fillStyle = i < pts.length / 2 ? col : '#ffffff'; ctx.globalAlpha = 0.35 + 0.65 * i / pts.length; ctx.fillRect(a, b, 1, 1); }); ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.fillRect(head[0] - 1, head[1] - 1, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(head[0], head[1] - 1, 1, 2); };
  const line = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); const o = []; for (let i = 0; i <= n; i++) o.push([Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)]); return o; };
  const ICON = {
    pillars: (x, y) => { mir(x + 2, y + 6, 4, 10); mir(x + 7, y + 2, 4, 14); mir(x + 12, y + 7, 4, 9); },
    magnet: (x, y) => { mir(x + 7, y + 3, 5, 12); ctx.fillStyle = '#c24050'; ctx.fillRect(x + 1, y + 9, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, y + 10, 2, 1); ctx.fillRect(x + 14, y + 10, 2, 1); ctx.fillStyle = '#5c86d6'; ctx.fillRect(x + 15, y + 5, 2, 3); },
    fissure: (x, y) => { ctx.fillStyle = '#7eaede'; ctx.fillRect(x + 1, y + 14, 16, 2); ctx.fillStyle = '#0c1018'; for (const [a, b] of line(1, 15, 16, 14)) ctx.fillRect(x + a, y + b, 1, 1); ctx.fillStyle = '#ffffff'; [[3, 13, 7], [7, 9, 5], [11, 11, 4], [14, 7, 6]].forEach(([a, h, w]) => { ctx.fillStyle = '#bfe0f8'; ctx.fillRect(x + a, y + h, 2, 15 - h); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + a, y + h, 1, 15 - h - 1); ctx.fillStyle = '#3e6aa0'; ctx.fillRect(x + a + 1, y + h + 2, 1, 15 - h - 2); }); },
    cage: (x, y) => { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; mir(Math.round(x + 9 + Math.cos(a) * 6) - 1, Math.round(y + 9 + Math.sin(a) * 4) - 4, 3, 7); } ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 8, y + 8, 2, 2); },
    anvil: (x, y) => { mir(x + 5, y + 1, 8, 11); ctx.fillStyle = 'rgba(220,240,255,0.6)'; ctx.fillRect(x + 3, y + 2, 1, 6); ctx.fillRect(x + 14, y + 1, 1, 5); ctx.fillStyle = '#ffffff'; [[2, 15], [5, 14], [9, 16], [13, 14], [16, 15]].forEach(([a, b]) => ctx.fillRect(x + a, y + b, 1, 1)); ctx.fillStyle = '#7eaede'; [[3, 16], [11, 15], [15, 16]].forEach(([a, b]) => ctx.fillRect(x + a, y + b, 1, 1)); },
    beam: (x, y) => comet(line(2, 15, 12, 6), [13, 5], '#e0a838'),
    sweep: (x, y) => comet([[2, 14], [3, 12], [5, 11], [6, 12], [8, 11], [9, 9], [10, 8], [12, 8]], [13, 6], '#e0a838'),
    beamburn: (x, y) => { comet(line(2, 15, 10, 8), [11, 7], '#e0a838'); ctx.fillStyle = '#c8553d'; ctx.fillRect(x + 13, y + 11, 3, 4); ctx.fillStyle = '#ffd050'; ctx.fillRect(x + 14, y + 12, 1, 2); },
    prism: (x, y) => { comet(line(2, 15, 8, 10), [9, 9], '#a882e0'); ctx.fillStyle = '#e6d4ff'; for (const [a, b] of [[12, 4], [14, 9], [12, 14]]) { ctx.fillRect(x + a, y + b, 2, 2); } ctx.fillStyle = '#5a3a96'; ctx.fillRect(x + 10, y + 7, 1, 1); ctx.fillRect(x + 11, y + 9, 1, 1); ctx.fillRect(x + 10, y + 11, 1, 1); },
    prismex: (x, y) => { ctx.fillStyle = '#e6d4ff'; ctx.fillRect(x + 7, y + 7, 4, 4); ctx.fillStyle = '#ffffff'; for (const [a, b] of [[2, 3], [14, 3], [2, 14], [14, 14], [8, 1]]) ctx.fillRect(x + a, y + b, 2, 2); },
    prismchain: (x, y) => { ctx.fillStyle = '#e6d4ff'; for (const [a, b] of [[3, 4], [13, 5], [8, 13]]) { ctx.fillRect(x + a, y + b, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + a + 1, y + b + 1, 1, 1); ctx.fillStyle = '#e6d4ff'; } },
    lance: (x, y) => { comet(line(1, 16, 7, 6).concat(line(7, 6, 11, 12)), [15, 3], '#7ad0ff'); ctx.fillStyle = '#d8f6ff'; for (const [a, b] of line(11, 12, 14, 4)) ctx.fillRect(x + a, y + b, 1, 1); },
    prismL: (x, y) => { mir(x + 1, y + 4, 4, 10); comet(line(15, 16, 6, 9), [6, 9], '#7ad0ff'); ctx.fillStyle = '#e6d4ff'; for (const [a, b] of [[12, 3], [15, 6], [10, 1]]) ctx.fillRect(x + a, y + b, 2, 2); },
    resonance: (x, y) => { mir(x + 7, y + 4, 5, 12); ctx.fillStyle = '#ffe2a0'; for (const [a, b] of line(1, 2, 6, 9)) ctx.fillRect(x + a, y + b, 1, 1); ctx.fillStyle = '#ffffff'; for (const [a, b] of line(6, 9, 16, 2)) ctx.fillRect(x + a, y + b, 1, 1); ctx.fillRect(x + 5, y + 8, 3, 3); },
    forge: (x, y) => { ctx.fillStyle = '#c8d4e2'; ctx.beginPath(); ctx.arc(x + 9, y + 10, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a6ceee'; ctx.beginPath(); ctx.arc(x + 9, y + 10, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, y + 7, 2, 2); ctx.fillRect(x + 11, y + 12, 1, 1); ctx.fillStyle = '#141a28'; ctx.fillRect(x + 5, y + 10, 8, 1); },
    temper: (x, y) => { mir(x + 5, y + 2, 8, 14); ctx.fillStyle = '#d9a441'; ctx.fillRect(x + 4, y + 16, 10, 1); },
    challenge: (x, y) => { mir(x + 6, y + 4, 6, 10); ctx.fillStyle = '#ffffff'; for (const [a, b] of [[2, 9], [16, 9], [9, 1], [3, 3], [15, 3]]) ctx.fillRect(x + a, y + b, 1, 1); ctx.fillRect(x + 1, y + 9, 3, 1); ctx.fillRect(x + 15, y + 9, 3, 1); },
    warcry: (x, y) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 8, y + 3, 2, 12); ctx.fillRect(x + 3, y + 8, 12, 2); ctx.fillStyle = '#cfe8fa'; ctx.fillRect(x + 5, y + 5, 2, 2); ctx.fillRect(x + 11, y + 5, 2, 2); ctx.fillRect(x + 5, y + 11, 2, 2); ctx.fillRect(x + 11, y + 11, 2, 2); },
    thorns: (x, y) => { mir(x + 5, y + 3, 8, 12); ctx.fillStyle = '#c8553d'; ctx.fillRect(x + 1, y + 8, 3, 1); ctx.fillRect(x + 1, y + 10, 3, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 14, y + 8, 3, 1); ctx.fillRect(x + 14, y + 10, 3, 1); },
    barbiron: (x, y) => { mir(x + 5, y + 3, 8, 12); ctx.fillStyle = '#ffffff'; for (const [a, b] of [[2, 4], [15, 5], [2, 13], [16, 14]]) ctx.fillRect(x + a, y + b, 1, 1); }
  };
  const _si = skillIcon;
  skillIcon = function (id, x, y, active) {
    const f = ICON[id]; if (!f || (SK[id] ? (SK[id].cls || 'animancer') !== 'animancer' : P.cls !== 'animancer')) return _si(id, x, y, active);
    ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y - 1, 20, 20);
    ctx.fillStyle = active ? '#2a2733' : '#1b1920'; ctx.fillRect(x, y, 18, 18);
    f(x, y);
  };
}

window.__anim = { stats: AN_STATS, G: () => G, anReset, anSplit, anBolt, metals: () => metals() };
