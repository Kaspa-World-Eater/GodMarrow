// =================================================================== HUD board: a cleaner bottom bar
// The user: the HUD is too cluttered. This redraws the bottom bar on a grid, keeping the carved-stone panel,
// the caged glass orbs and the grimdark palette:
//  - both orbs sit fully on screen and show their value; the bar reads left to right:
//    life orb | left skill | class gauges | belt | menu studs | right skill | resource orb
//  - the XP bar is a clear gold rule along the top of the panel (it was lost in the trim)
//  - skill slots show their bound key and their cost in the class's resource (life % for the Hemomancer,
//    shards for bone skills), and dim red when the Essence or Miasma can't pay
//  - the Ossuarch's shards and marrow are two separate bars with their own labels
//  - the two rows of text buttons become one row of icon studs, named in tooltips with their keys
//  - zone banners sit in the upper third instead of over the hero; the start-up helper line is shorter-lived
//  - on a Steam Deck (1280x800) the game fills the screen instead of drawing at 960x540
// Everything wraps the base: the original drawHud still runs (so other wrappers keep working), clipped away
// from the bar, and its bar buttons are dropped in favour of the ones placed here.
{
  const HX = {
    y0: HUD_Y - 4,                 // top of the stone panel
    mid: HUD_Y + 17,               // the bar's centre line
    lOrb: { x: 28, y: HUD_Y + 7, r: 16 },
    rOrb: { x: W - 28, y: HUD_Y + 7, r: 16 },
    lSkill: 60, rSkill: W - 76, skillY: HUD_Y + 9,
    gx: 86, gw: 96,               // the class gauge block (poise, class gauge, labels); zz_polish pulses here
    beltY: HUD_Y + 10,
    menuX0: 270, menuX1: 398, menuY: HUD_Y + 10,
  };

  // ---- a 3x5 pixel face for small numerals and labels (keys, costs, stack counts, gauge readouts)
  const MF = {
    '0': '### #.# #.# #.# ###',
    '1': '.#. ##. .#. .#. ###',
    '2': '### ..# ### #.. ###',
    '3': '### ..# .## ..# ###',
    '4': '#.# #.# ### ..# ..#',
    '5': '### #.. ### ..# ###',
    '6': '### #.. ### #.# ###',
    '7': '### ..# ..# .#. .#.',
    '8': '### #.# ### #.# ###',
    '9': '### #.# ### ..# ###',
    '/': '..# ..# .#. #.. #..',
    '%': '##..# ##.#. ..#.. .#.## #..##',
    '+': '... .#. ### .#. ...',
    '-': '... ... ### ... ...',
    '.': '... ... ... ... .#.',
    ':': '... .#. ... .#. ...',
    '(': '.#. #.. #.. #.. .#.',
    ')': '.#. ..# ..# ..# .#.',
    A: '.#. #.# ### #.# #.#',
    B: '##. #.# ##. #.# ##.',
    C: '.## #.. #.. #.. .##',
    D: '##. #.# #.# #.# ##.',
    E: '### #.. ##. #.. ###',
    F: '### #.. ##. #.. #..',
    G: '.## #.. #.# #.# .##',
    H: '#.# #.# ### #.# #.#',
    I: '### .#. .#. .#. ###',
    J: '..# ..# ..# #.# .#.',
    K: '#.# #.# ##. #.# #.#',
    L: '#.. #.. #.. #.. ###',
    M: '#.# ### ### #.# #.#',
    N: '##. #.# #.# #.# #.#',
    O: '.#. #.# #.# #.# .#.',
    P: '##. #.# ##. #.. #..',
    Q: '.#. #.# #.# ##. .##',
    R: '##. #.# ##. #.# #.#',
    S: '.## #.. .#. ..# ##.',
    T: '### .#. .#. .#. .#.',
    U: '#.# #.# #.# #.# ###',
    V: '#.# #.# #.# #.# .#.',
    W: '#.# #.# ### ### #.#',
    X: '#.# #.# .#. #.# #.#',
    Y: '#.# #.# .#. .#. .#.',
    Z: '### ..# .#. #.. ###',
  };
  for (const k in MF) { const rows = MF[k].split(' '); MF[k] = { w: rows[0].length, px: rows.join('') }; }
  const gw = ch => ch === ' ' ? 2 : MF[ch] ? MF[ch].w : 3;
  function microW(s) { s = String(s).toUpperCase(); let w = 0; for (const ch of s) w += gw(ch) + 1; return Math.max(0, w - 1); }
  function micro(s, x, y, col, align = 'left', shadow = true) {
    s = String(s).toUpperCase(); const w = microW(s);
    let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x); y = Math.round(y);
    const pass = (c, dx, dy) => {
      ctx.fillStyle = c; let px = cx + dx;
      for (const ch of s) {
        if (ch === ' ') { px += 3; continue; }
        const g = MF[ch]; if (g) for (let i = 0; i < g.px.length; i++) if (g.px[i] === '#') ctx.fillRect(px + i % g.w, y + dy + (i / g.w | 0), 1, 1);
        px += gw(ch) + 1;
      }
    };
    if (shadow) pass('#060508', 1, 1);
    pass(col, 0, 0);
    return w;
  }

  // ---- small pixel icons for the menu studs, 12x12, drawn from strings once and cached
  const ICONS = {
    inv: [{ k: '#0e0d12', a: '#6a4a2a', b: '#9a7040', c: '#d9a441' }, ['....kkkk....', '...kbbbbk...', '...k....k...', '..kkkkkkkk..', '.kaaaaaaaak.', 'kabbaaaaaaak', 'kabaaaaaaaak', 'kaaaaccaaaak', 'kaaaaccaaaak', 'kaaaaaaaaaak', '.kaaaaaaaak.', '..kkkkkkkk..']],
    char: [{ k: '#0e0d12', a: '#6b7280', b: '#a3aab8' }, ['...kkkkkk...', '..kbbbbbbk..', '.kbaaaaaabk.', '.kaaaaaaaak.', '.kaakkkkaak.', '.kaak..kaak.', '.kaaakkaaak.', '.kaaakkaaak.', '..kaakkaak..', '..kaaaaaak..', '...kaaaak...', '....kkkk....']],
    skills: [{ k: '#0e0d12', a: '#6a5a40', b: '#cfc6ae', c: '#8e2630' }, ['............', 'kkkkk..kkkkk', 'kbbbbkkbbbbk', 'kbaabkkbaabk', 'kbbbbkkbbbbk', 'kbaabkkbaabk', 'kbbbbkkbbbbk', 'kbaabkkbaabk', 'kbbbbkkbbbbk', 'kkkkkkkkkkkk', '.kcccccccck.', '............']],
    map: [{ k: '#0e0d12', a: '#6a4a2a', b: '#b8ae94', c: '#c8553d' }, ['..kkkkkkkk..', '.kbbbbbbbbk.', '.kbaabbbbbk.', '.kbbbabbbbk.', '.kbbbbaabbk.', '.kbbbbbbabk.', '.kbbcbbbabk.', '.kbccbbbbbk.', '.kbbbbbaabk.', '.kbbbbbbbbk.', '.kkkkkkkkkk.', '............']],
    arcana: [{ k: '#0e0d12', a: '#2a2440', b: '#b070e0', c: '#d9a441' }, ['..kkkkkkkk..', '..kaaaaaak..', '..kcccccck..', '..kaccccak..', '..kaaccaak..', '..kaaaaaak..', '..kaabbaak..', '..kabaabak..', '..kaabbaak..', '..kaaaaaak..', '..kkkkkkkk..', '............']],
    menu: [{ k: '#0e0d12', b: '#a39d8c' }, ['............', '.kkkkkkkkkk.', '.kbbbbbbbbk.', '.kkkkkkkkkk.', '............', '.kkkkkkkkkk.', '.kbbbbbbbbk.', '.kkkkkkkkkk.', '............', '.kkkkkkkkkk.', '.kbbbbbbbbk.', '.kkkkkkkkkk.']],
    choir: [{ a: '#5c9ce0', b: '#e8f7ff' }, ['............', '..bb....bb..', '..ba....ba..', '............', '.....bb.....', '.....ba.....', '............', '.bb......bb.', '.ba......ba.', '............', '....bb......', '....ba......']],
    gbeh: [{ k: '#0e0d12', a: '#6b7280', b: '#a3aab8', c: '#8ecbff' }, ['...kkkkkk...', '..kaaaaaak..', '.kabbbbbbak.', '.kaaaaaaaak.', '.kakkaakkak.', '.kakcaakcak.', '.kaaaaaaaak.', '.kaakkkkaak.', '..kaaaaaak..', '.kkaaaaaakk.', 'kaaaaaaaaaak', 'kkkkkkkkkkkk']],
    army: [{ k: '#0e0d12', b: '#e8e2d0' }, ['...kkkkkk...', '..kbbbbbbk..', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '.kbkkbbkkbk.', '.kbkkbbkkbk.', '.kbbbbbbbbk.', '..kbbkkbbk..', '...kbbbbk...', '...kbkbkk...', '...kkkkk....', '............']],
    blood: [{ k: '#0e0d12', a: '#b8303f', b: '#ff8090' }, ['............', '.kkk....kkk.', 'kaaak..kaaak', 'kabaakkaaaak', 'kabaaaaaaaak', 'kaaaaaaaaaak', '.kaaaaaaaak.', '..kaaaaaak..', '...kaaaak...', '....kaak....', '.....kk.....', '............']],
  };
  const iconCache = {};
  function menuIcon(id) {
    if (iconCache[id]) return iconCache[id];
    const d = ICONS[id]; if (!d) return null;
    const c = document.createElement('canvas'); c.width = 12; c.height = 12; const x = c.getContext('2d');
    d[1].forEach((row, j) => { for (let i = 0; i < 12; i++) { const col = d[0][row[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } } });
    return (iconCache[id] = c);
  }

  // ---- the class resource: names, colours and what a skill costs
  const RES = () => P.cls === 'hemomancer' ? { name: 'Vitae', col: '#e89aa0' } : P.cls === 'miasmancer' ? { name: 'Miasma', col: '#c090f0' } : P.cls === 'ossumancer' ? { name: 'Marrow', col: '#e8c070' } : { name: 'Essence', col: '#8ecbff' };
  function costOf(id) {
    try {
      if (!id || id === 'attack' || !SK[id]) return null;
      const s = SK[id], l = Math.max(1, P.skills[id] || 0);
      if (s.mana && P.cls === 'monk' && typeof KS !== 'undefined' && KS.fill) {
        // v0.54: nothing locks him out; the cost is the sand it pours
        const c = skillCost(id, l);
        if (s.tab === 2) return { t: String(Math.max(1, Math.round(c * 0.6))), col: '#9ac070', ok: true };
        return { t: Math.max(1, Math.round(Math.min(25, 5 * c / 12.8))) + '%', col: s.tab === 1 ? '#b8acd0' : '#ffd070', ok: true };
      }
      if (s.mana) {
        const c = skillCost(id, l);
        if (P.cls === 'hemomancer' && typeof bloodLifeCost === 'function') { const pct = bloodLifeCost(c) * 100 / Math.max(1, D.maxHp); return { t: Math.max(1, Math.round(pct)) + '%', col: '#ff6a78', ok: true }; }
        return { t: String(Math.max(1, Math.round(c))), col: RES().col, ok: P.mana >= c - 1e-6 };
      }
      if (s.shards) return { t: String(s.shards), col: '#f4efe2', ok: (P.shards || 0) >= s.shards };
      if (s.stam) return { t: String(s.stam), col: '#9ac070', ok: true };   // poise never locks a skill out
    } catch (e) { }
    return null;
  }

  // ---- pieces of the bar
  function well(x, y, w, h) {   // a recess cut into the stone (v0.54: the carved bar has its own wells)
    if (typeof HUD54 !== 'undefined' && HUD54.on) return;
    ctx.fillStyle = '#060508'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#3a3642'; ctx.fillRect(x - 1, y + h, w + 2, 1); ctx.fillRect(x + w, y - 1, 1, h + 2);
    ctx.fillStyle = '#14121a'; ctx.fillRect(x, y, w, h);
  }
  function orb(o, v, max, col, dim, label, lc) {
    drawOrb16(o.x, o.y, o.r, v, max, col, dim);
    const low = max > 0 && v / max < 0.25 && !P.dead;
    const s = String(Math.max(0, Math.ceil(v)));
    if (typeof HUD54 !== 'undefined' && HUD54.on) HUD54.plaque(o, s, low); else txt(s, o.x, o.y + 3, low ? '#ffd0c0' : '#f4efe2', 'center');
    if (inRect(mouse, o.x - o.r - 3, o.y - o.r - 3, 2 * o.r + 6, 2 * o.r + 6)) return true;
    return false;
  }
  function slot(id, x, y, which) {
    skillIcon(id, x, y, true);
    const c = costOf(id);
    if (c && !c.ok) { ctx.fillStyle = 'rgba(120,10,20,0.55)'; ctx.fillRect(x, y, 18, 18); }
    const k = id && id !== 'attack' && typeof keyOf === 'function' ? keyOf(id) : '';
    if (k) { ctx.fillStyle = 'rgba(6,5,8,0.85)'; ctx.fillRect(x, y, microW(k) + 2, 7); micro(k, x + 1, y + 1, '#d9a441', 'left', false); }
    if (c) { const w = microW(c.t); ctx.fillStyle = 'rgba(6,5,8,0.85)'; ctx.fillRect(x + 18 - w - 2, y + 11, w + 2, 7); micro(c.t, x + 17, y + 12, c.ok ? c.col : '#ff5a4a', 'right', false); }
    uiButton(x, y, 18, 18, () => { G.pick = G.pick === which ? null : which; });
    if (inRect(mouse, x, y, 18, 18) && !G.pick) tooltip = skillTip(id).concat([[(which === 'L' ? 'Left skill' : 'Right skill') + ' · click to change', '#6f6a79']]);
  }
  function xpBar() {
    const x0 = 84, x1 = 398, y = HUD_Y - 1.5, w = x1 - x0, k = clamp(P.xp / xpNext(P.level), 0, 1);
    // v0.54: it runs in the channel carved under the rail
    const fw = Math.round(w * k * 2) / 2;
    ctx.fillStyle = '#7a5a26'; ctx.fillRect(x0, y, fw, 1.5); ctx.fillStyle = '#d8b060'; ctx.fillRect(x0, y, fw, 0.5); ctx.fillStyle = '#f4dc98'; if (fw > 0) ctx.fillRect(x0 + fw - 0.5, y, 0.5, 1.5);
    ctx.fillStyle = 'rgba(6,5,8,0.8)'; for (let i = 1; i < 10; i++) ctx.fillRect(x0 + Math.round(w * i / 10), y, 0.5, 1.5);
    if (inRect(mouse, x0, y - 3, w, 7)) tooltip = [[`Level ${P.level}`, '#d9a441'], [`Experience ${Math.floor(P.xp)} / ${xpNext(P.level)} (${Math.floor(k * 100)}%)`, '#a39d8c']];
  }
  function poiseBar() {
    const x = HX.gx, y = HUD_Y + 7, w = HX.gw, k = clamp(P.stam / Math.max(1, D.maxStam), 0, 1);
    ctx.fillStyle = '#060508'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
    ctx.fillStyle = '#1a2014'; ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = k < 0.1 ? '#b0a040' : '#6b8a4a'; ctx.fillRect(x, y, Math.round(w * k), 2); ctx.fillStyle = '#9ac070'; ctx.fillRect(x, y, Math.round(w * k), 1);
    if (inRect(mouse, x, y - 2, w, 5)) tooltip = [['Poise', '#9ac070'], [`${Math.floor(P.stam)} / ${Math.round(D.maxStam)}`, '#e8e2d0'], ['Rolling and heavy blows spend it. It refills', '#a39d8c'], ['when you pause. Low poise makes you heavier.', '#a39d8c']];
  }
  // the label row under the class gauge
  const LBL_Y = HUD_Y + 23;
  function labels(left, lcol, right, rcol) {
    if (left) micro(left, HX.gx, LBL_Y, lcol || '#a39d8c');
    if (right) micro(right, HX.gx + HX.gw, LBL_Y, rcol || '#a39d8c', 'right');
  }
  // run a base draw function with its text muted: we keep its gauge, buttons and tooltips and write our own labels
  function mutedText(fn) { const t0 = txt; txt = function () { }; try { fn(); } finally { txt = t0; } }
  // the base rows draw their gauges from x 68, 116 wide; fit them into the gauge block
  function fitted(fn) { ctx.save(); ctx.translate(HX.gx, 0); ctx.scale(HX.gw / 116, 1); ctx.translate(-68, 0); try { mutedText(fn); } finally { ctx.restore(); } }

  function wispRow() {
    const cap = D.wispCap, shown = Math.min(cap, 16), tg = wispTargets(), have = countKinds(), resv = reservedWisps();
    const order = [];
    for (const k of ['rev', 'beam', 'prism']) for (let i = 0; i < tg[k]; i++) order.push([k, i < have[k]]);
    for (let i = 0; i < resv; i++) order.push(['held', false]);
    const PIP = { rev: '#e8f7ff', beam: '#ffe2a0', prism: '#e0c8ff' };
    for (let i = 0; i < shown; i++) {
      const x = HX.gx + i * 6, [k, on] = order[i] || ['rev', false];
      ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, HUD_Y + 12, 5, 5);
      ctx.fillStyle = on ? PIP[k] : k === 'held' ? '#23405a' : '#2a2833'; ctx.fillRect(x, HUD_Y + 13, 3, 3);
    }
    uiButton(HX.gx - 2, HUD_Y + 10, HX.gw, 16, () => { G.panels.choir = !G.panels.choir; });
    if (inRect(mouse, HX.gx - 2, HUD_Y + 10, HX.gw, 16) && !G.panels.choir) tooltip = [['Wisp choir', '#e8e2d0'], [`${P.wisps.length} of ${cap} wisps` + (resv ? ` · ${resv} held` : ''), '#a39d8c'], ['Click or press V: how your wisps behave', '#6f6a79']];
    labels('WISPS ' + P.wisps.length + '/' + cap + (resv ? ' +' + resv : ''), '#bfe8ff');
  }
  function boneRow() {
    fitted(drawShardRow);
    const have = Math.floor(P.shards);
    labels('SHARDS ' + have + '/' + freeCap(), '#f4efe2');
  }
  function bloodRow() {
    fitted(drawBroodRow);
    const mx = HS.broodMax(), n = broodCount(), tmp = G.brood.length - n, show = Math.min(16, mx + Math.max(0, tmp));
    for (let i = 0; i < show; i++) {
      const x = HX.gx + i * 6, on = i < n + Math.max(0, tmp), extra = i >= mx;
      ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, HUD_Y + 12, 5, 5);
      ctx.fillStyle = on ? (extra ? '#e89aa0' : '#c24050') : '#2a2226'; ctx.fillRect(x, HUD_Y + 13, 3, 3);
    }
    labels('BROOD ' + n + '/' + mx + (tmp ? ' +' + tmp : ''), '#e89aa0');
  }
  function miasRow() {
    fitted(drawMiasRow);
    labels('OMENS ' + P.omens + '/' + MS.omenMax(), '#e8e2d0', P.inMiasma ? 'IN MIASMA' : '', '#b070e0');
  }
  function monkRow() {
    // v0.54: one bar, from the centre. It tips toward the fuller bulb, the tree that is spending itself.
    const q = KS.fill(), gx = HX.gx, gw = HX.gw, cxm = gx + gw / 2, y = HUD_Y + 12, half = gw / 2 - 1;
    ctx.fillStyle = '#060508'; ctx.fillRect(gx - 1, y - 1, gw + 2, 5);
    ctx.fillStyle = '#1c1610'; ctx.fillRect(gx, y, gw / 2, 3); ctx.fillStyle = '#141220'; ctx.fillRect(cxm, y, gw / 2, 3);
    // how full each bulb is, faint, from the centre outward
    ctx.fillStyle = '#4a3014'; ctx.fillRect(Math.round(cxm - half * q.fR), y + 2, Math.round(half * q.fR), 1);
    ctx.fillStyle = '#2e2642'; ctx.fillRect(cxm, y + 2, Math.round(half * q.fA), 1);
    // the balance: from the centre to the needle
    const b = q.fR - q.fA, len = Math.round(Math.abs(b) * half);
    if (b > 0) { ctx.fillStyle = '#c07424'; ctx.fillRect(cxm - len, y, len, 2); ctx.fillStyle = '#ffd070'; ctx.fillRect(cxm - len, y, len, 1); }
    else if (b < 0) { ctx.fillStyle = '#3a3050'; ctx.fillRect(cxm, y, len, 2); ctx.fillStyle = '#8a7ab0'; ctx.fillRect(cxm, y, len, 1); }
    const nx = b > 0 ? cxm - len : cxm + len;
    ctx.fillStyle = '#f4efe2'; ctx.fillRect(Math.round(nx) - 0.5, y - 1, 1, 5);
    ctx.fillStyle = '#a39d8c'; ctx.fillRect(cxm - 0.5, y + 3, 1, 2);
    const pct = tab => Math.round(KS.sand(tab) * 100);
    micro('RADIANCE ' + pct(0), gx, LBL_Y, q.fR > 0.6 ? '#c08a50' : '#ffd070');
    micro('ABSENCE ' + pct(1), gx + gw, LBL_Y, q.fA > 0.6 ? '#7a6e90' : '#b8acd0', 'right');
    if (inRect(mouse, gx - 2, HUD_Y + 8, gw, 20)) tooltip = resTip();
  }
  function monkRowOld() {
    // the weight bar is drawn 120 wide and ran into the belt: keep it inside the gauge block
    ctx.save(); ctx.beginPath(); ctx.rect(HX.gx - 3, HUD_Y + 4, 121, 20); ctx.clip();
    try { mutedText(drawMonkRow); } finally { ctx.restore(); }
    const s = KS.wS(), perfect = P.kpoise;
    micro('LIGHT', HX.gx, LBL_Y, s < -0.3 ? '#d8f0ff' : '#6a7a8a');
    micro('HEAVY', HX.gx + 116, LBL_Y, s > 0.3 ? '#f0c860' : '#7a6a50', 'right');
    micro(perfect ? 'POISED' : String(Math.round(P.weight)), HX.gx + HX.gw / 2, LBL_Y, perfect ? '#fff0a0' : '#e8e2d0', 'center');
  }
  function belt() {
    for (let i = 0; i < 4; i++) {
      const x = BELT_X + i * 20, y = HX.beltY, s = P.belt[i];
      well(x, y, 16, 16);
      if (s) { ctx.drawImage(getIcon(s.kind, 1, 1), x + 2, y + 2); if (s.n > 1) micro(String(s.n), x + 16, y + 11, '#e8e2d0', 'right'); }
      micro(String(i + 1), x + 1, y + 1, '#6f6a79', 'left', false);
      if (s && inRect(mouse, x, y, 16, 16)) tooltip = [[s.kind === 'hp' ? 'Healing Draught' : s.kind === 'mp' ? 'Essence Draught' : 'Draught', '#e8e2d0'], [`${s.n || 1} in this column · press ${i + 1} or click to drink`, '#a39d8c']];
    }
  }
  function menuRow() {
    if (typeof HUD55 !== 'undefined' && HUD55.menuRow && HUD55.menuRow(HX)) return;   // v0.55: engraved stone tablets (zz_hud55.js)
    const cls = P.cls;
    const cp = cls === 'hemomancer' ? [['blood', 'The Flesh (V)']] : cls === 'ossumancer' ? [['army', 'Army orders (V)']] : cls === 'animancer' ? [['choir', 'Wisp choir (V)'], ['gbeh', 'Golem orders (G)']] : [];
    const items = [['inv', 'Inventory (I)'], ['char', 'Character (C)'], ['skills', 'Skills (S)'], ['map', 'Map (Tab)']].concat(cp, [['arcana', 'The Inverted Triune (A)'], ['menu', 'Menu (Esc)']]);
    const pitch = 16, total = items.length * pitch - 2;
    let bx = Math.round((HX.menuX0 + HX.menuX1) / 2 - total / 2); const by = HX.menuY;
    for (const [id, name] of items) {
      const on = id === 'map' ? G.map : id === 'menu' ? false : !!G.panels[id], hov = inRect(mouse, bx, by, 14, 14);
      well(bx, by, 14, 14);
      ctx.fillStyle = on ? '#3a3446' : hov ? '#26222e' : '#1b1920'; ctx.fillRect(bx, by, 14, 14);
      ctx.fillStyle = on ? '#d9a441' : '#2e2a36'; ctx.fillRect(bx, by, 14, 1);
      const ic = menuIcon(id); if (ic) { ctx.globalAlpha = on || hov ? 1 : 0.82; ctx.drawImage(ic, bx + 1, by + 1); ctx.globalAlpha = 1; }
      const pts = (id === 'char' && P.statPts) || (id === 'skills' && P.skillPts) || (id === 'arcana' && P.arc && P.arc.pts);
      if (pts) { ctx.fillStyle = '#0a090d'; ctx.fillRect(bx + 10, by - 1, 5, 5); ctx.fillStyle = '#d9a441'; ctx.fillRect(bx + 11, by, 3, 3); }
      uiButton(bx, by, 14, 14, () => { if (id === 'map') G.map = !G.map; else if (id === 'menu') openMenu(); else if (id === 'choir' || id === 'gbeh' || id === 'army' || id === 'blood' || id === 'arcana') G.panels[id] = !G.panels[id]; else togglePanel(id); });
      if (hov) {
        const extra = id === 'char' && P.statPts ? `${P.statPts} stat points to spend` : id === 'skills' && P.skillPts ? `${P.skillPts} skill points to spend` : id === 'arcana' && P.arc && P.arc.pts ? `${P.arc.pts} Arcana to spend` : '';
        tooltip = [[name, '#e8e2d0']].concat(extra ? [[extra, '#d9a441']] : []);
      }
      bx += pitch;
    }
  }
  function resTip() {
    const r = RES();
    if (P.cls === 'hemomancer') return [['Vitae', '#e89aa0'], [`${Math.ceil(P.mana)} / ${D.maxMana}`, '#e8e2d0'], ['Every skill costs life. The fuller your', '#a39d8c'], ['Vitae, the less life it costs and the', '#a39d8c'], [`faster you heal: ${(typeof vitaeHeal === 'function' ? vitaeHeal() * 100 : 0).toFixed(1)}% life/s now.`, '#a39d8c'], ['It refills three times as fast near blood:', '#c24050'], ['pools and bleeding enemies.', '#c24050']];
    if (P.cls === 'miasmancer') return [['Miasma', '#b070e0'], [`${Math.ceil(P.mana)} / ${D.maxMana}`, '#e8e2d0'], ['Miasma skills breathe it out and thin it.', '#a39d8c'], ['Standing in miasma thickens yours fast.', '#8a4ab8']];
    if (P.cls === 'monk' && typeof KS !== 'undefined' && KS.fill) { const q = KS.fill(), pc = f => Math.round(f * 100) + '%'; return [['The Glass', '#f0c040'],
      [`Radiance sand ${pc(q.fR)} · Absence sand ${pc(q.fA)}`, '#e8e2d0'],
      ['Radiance pours amber sand down into the glass;', '#a39d8c'], ['Absence pours black sand up. The fuller a bulb,', '#a39d8c'], ['the weaker its skills: a full bulb strikes at a tenth.', '#a39d8c'],
      [`Radiance at ${pc(KS.sand(0))} · Absence at ${pc(KS.sand(1))}`, '#f0d070'],
      ['The sand always runs back: slowly while you fight,', '#a39d8c'], ['fast the moment you stop. Every hit and kill runs', '#a39d8c'], ['both bulbs back, whichever tree struck.', '#a39d8c'], ['Destroyer costs poise.', '#9ac070']]; }
    if (P.cls === 'ossumancer') return [['Marrow', '#e8c070'], [`${Math.ceil(P.mana)} / ${D.maxMana}`, '#e8e2d0'], ['What is still alive inside the bone.', '#a39d8c'], ['Your bone spells draw on it. It seeps back over time.', '#a39d8c']];
    return [[r.name, r.col], [`${Math.ceil(P.mana)} / ${D.maxMana}`, '#e8e2d0'], ['Skills spend it. It refills over time.', '#a39d8c']];
  }

  function drawBar() {
    hudPanel16();
    xpBar();
    // orbs
    const lh = orb(HX.lOrb, P.hp, D.maxHp, '#8e2630', '#c24050');
    const rc = P.cls === 'miasmancer' ? ['#3a1e50', '#8a4ab8'] : P.cls === 'hemomancer' ? ['#5a1622', '#9a2a3a'] : P.cls === 'ossumancer' ? ['#7a4a1c', '#c89048'] : ['#2f5aa8', '#5c86d6'];
    let rh;
    if (P.cls === 'monk' && typeof drawHourglassOrb === 'function') {
      // v0.54: the Empty Hand's orb is an hourglass: amber sand heaps below, black sand hangs above
      const o = HX.rOrb; drawHourglassOrb(o.x, o.y, o.r);
      rh = inRect(mouse, o.x - o.r - 3, o.y - o.r - 3, 2 * o.r + 6, 2 * o.r + 6);
    } else rh = orb(HX.rOrb, P.mana, D.maxMana, rc[0], rc[1]);
    if (lh) tooltip = [['Life', '#e05060'], [`${Math.ceil(P.hp)} / ${Math.round(D.maxHp)}`, '#e8e2d0']];
    if (rh) tooltip = resTip();
    // skills
    slot(P.left, HX.lSkill, HX.skillY, 'L');
    slot(P.right, HX.rSkill, HX.skillY, 'R');
    // class gauges
    poiseBar();
    if (P.cls === 'hemomancer') bloodRow(); else if (P.cls === 'ossumancer') boneRow(); else if (P.cls === 'miasmancer') miasRow(); else if (P.cls === 'monk') monkRow(); else wispRow();
    belt();
    menuRow();
  }

  // ---- messages and banners: the helper line sits on a dark plate above the bar; banners in the upper third
  function drawMsg(msg, msgT) {
    if (!(msgT > 0) || !msg) return;
    const a = Math.min(1, msgT * 2), w = tw(msg) + 12, y = HUD_Y - 36;
    ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#060508'; ctx.fillRect(Math.round(W / 2 - w / 2), y - 8, Math.round(w), 12);
    ctx.globalAlpha = a; txt(msg, W / 2, y + 1, '#e8e2d0', 'center'); ctx.globalAlpha = 1;
  }
  function drawBanner() {
    if (!(G.bannerT > 0)) return;
    const a = clamp(Math.min(1, G.bannerT, (G.bannerMax - G.bannerT) * 2 + 0.2), 0, 1), y = 46;
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.25, 'rgba(0,0,0,0.55)'); g.addColorStop(0.75, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 15, W, 22);
    ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#0a090d'; ctx.fillText(G.banner, W / 2 + 1, y + 1); ctx.fillStyle = G.bannerCol; ctx.fillText(G.banner, W / 2, y);
    ctx.globalAlpha = 1;
  }

  // ---- the wrapper
  const _hud = drawHud;
  drawHud = function () {
    const n0 = BTN.length, msg = G.msg, msgT = G.msgT, bT = G.bannerT;
    G.msgT = 0; G.bannerT = 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(0, HX.y0, W, H - HX.y0); ctx.rect(0, HX.y0 - 14, 48, 14); ctx.rect(W - 48, HX.y0 - 14, 48, 14);
    ctx.clip('evenodd');
    try { _hud(); } finally { ctx.restore(); G.msgT = msgT; G.bannerT = bT; }
    // drop the base's bar buttons and bar tooltips; ours replace them
    const keep = BTN.slice(n0).filter(b => b.y + b.h <= HX.y0 - 14 || (b.y < HX.y0 - 14 && b.x > 48 && b.x + b.w < W - 48 && b.y + b.h <= HX.y0));
    BTN.length = n0; for (const b of keep) BTN.push(b);
    if (mouse.y >= HX.y0 - 14 && (mouse.y >= HX.y0 || mouse.x < 48 || mouse.x > W - 48)) tooltip = null;
    try { drawBar(); } catch (e) { reportError(e); }
    if (G.running) { drawMsg(msg, msgT); drawBanner(); }
  };

  // ---- the start-up helper line leaves sooner, and zone banners are a touch shorter
  const _say = say;
  say = function (m, t) { if (typeof m === 'string' && /^Test character/.test(m)) t = Math.min(t == null ? 2.2 : t, 2.5); return _say(m, t); };
  const _banner = banner;
  banner = function (m, col, t) { return _banner(m, col, t == null ? 2.6 : t); };

  // ---- Steam Deck and other odd sizes: fill the screen. Whole-number scaling is kept only when it wastes little;
  // otherwise the 4x canvas is scaled smoothly to fit (at 1280x800 that is 1280x720 instead of 960x540).
  function fitHud() {
    try {
      const LW = 480, LH = 270, s = Math.min(innerWidth / LW, innerHeight / LH), f = Math.floor(s);
      viewScale = s >= 2 && f / s >= 0.9 ? f : s;
      cv.style.width = Math.round(LW * viewScale) + 'px'; cv.style.height = Math.round(LH * viewScale) + 'px';
      cv.style.imageRendering = viewScale < RS && viewScale % 1 ? 'auto' : '';
    } catch (e) { }
  }
  addEventListener('resize', fitHud); fitHud();
  if (typeof window !== 'undefined' && window.__spm) window.__spm.hud = { costOf, micro, HX };
}
