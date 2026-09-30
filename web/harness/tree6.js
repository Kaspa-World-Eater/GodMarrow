// D2-style skill tree: three tabs (Iron, Anima, Logos), a 3×6 grid, prerequisite arrows, click to learn
const TREE = { col: c => 30 + c * 58, row: r => 42 + r * 31 };
function keyOf(id) { for (const k in P.keys) if (P.keys[k] === id) return k.toUpperCase(); return ''; }
function treeArrow(pa, ch, lit) {
  const px = TREE.col(pa.c), py = TREE.row(pa.r), cx = TREE.col(ch.c), cy = TREE.row(ch.r);
  ctx.strokeStyle = lit ? '#a39d8c' : '#3f3a4a'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1;
  const between = SK_ORDER.some(id => { const s = SK[id]; return s.tab === ch.tab && s.c === ch.c && s.r > pa.r && s.r < ch.r; });
  ctx.beginPath();
  if (pa.c === ch.c && !between) {
    ctx.moveTo(px + .5, py + 12); ctx.lineTo(cx + .5, cy - 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 2.5, cy - 15); ctx.lineTo(cx + 3.5, cy - 15); ctx.lineTo(cx + .5, cy - 12); ctx.fill();
  } else {
    // route through the gutters so arrows never cross an icon
    const gy = py + 15.5, gx = cx + (ch.c > pa.c || (ch.c === pa.c) ? -20.5 : 20.5);
    ctx.moveTo(px + .5, py + 12); ctx.lineTo(px + .5, gy); ctx.lineTo(gx, gy); ctx.lineTo(gx, cy + .5);
    if (gx < cx) { ctx.lineTo(cx - 14, cy + .5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 15, cy - 2.5); ctx.lineTo(cx - 15, cy + 3.5); ctx.lineTo(cx - 12, cy + .5); ctx.fill(); }
    else { ctx.lineTo(cx + 14, cy + .5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + 15, cy - 2.5); ctx.lineTo(cx + 15, cy + 3.5); ctx.lineTo(cx + 12, cy + .5); ctx.fill(); }
  }
}
function drawSkills() {
  const p = LP;
  ctx.fillStyle = 'rgba(18,16,22,0.97)'; ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  ctx.strokeStyle = '#0a090d'; ctx.strokeRect(p.x + 2.5, p.y + 2.5, p.w - 5, p.h - 5);
  txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79');
  uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.skills = false; });
  // points
  ctx.fillStyle = '#0a090d'; ctx.fillRect(182, 8, 44, 28); ctx.strokeStyle = '#3a3446'; ctx.strokeRect(182.5, 8.5, 43, 27);
  txt('POINTS', 204, 18, '#8f8a7c', 'center', false);
  ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = P.skillPts ? '#d9a441' : '#6f6a79'; ctx.fillText(String(P.skillPts), 204, 33);
  // tabs on the right edge, like D2
  TAB_NAMES.forEach((name, t) => {
    const y = 44 + t * 46, on = G.tab === t;
    ctx.fillStyle = on ? '#2a2733' : '#16141a'; ctx.fillRect(182, y, 44, 42);
    ctx.strokeStyle = on ? '#8f8a7c' : '#3a3446'; ctx.strokeRect(182.5, y + .5, 43, 41);
    ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = on ? '#e8e2d0' : '#8f8a7c'; ctx.fillText(name, 204, y + 20);
    let n = 0; for (const id of SK_ORDER) if (SK[id].tab === t) n += P.skills[id] || 0;
    txt(`${n} pts`, 204, y + 34, on ? '#d9a441' : '#6f6a79', 'center', false);
    uiButton(182, y, 44, 42, () => { G.tab = t; });
  });
  // grid frame
  ctx.fillStyle = '#0d0c11'; ctx.fillRect(8, 24, 170, 196);
  ctx.strokeStyle = '#2a2733'; ctx.strokeRect(8.5, 24.5, 169, 195);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText(TAB_NAMES[G.tab], 10, 19);
  ROWREQ.forEach((lv, r) => txt(String(lv), 12, TREE.row(r) + 3, '#3f3a4a', 'left', false));
  const ids = SK_ORDER.filter(id => SK[id].tab === G.tab);
  for (const id of ids) { const s = SK[id]; if (s.pre && SK[s.pre].tab === G.tab) treeArrow(SK[s.pre], s, P.skills[s.pre] > 0); }
  for (const id of ids) {
    const s = SK[id], l = P.skills[id] || 0, ready = skillReady(id), cx = TREE.col(s.c), cy = TREE.row(s.r);
    const x = cx - 9, y = cy - 9, canAdd = P.skillPts > 0 && ready && l < 20;
    ctx.fillStyle = canAdd ? '#d9a441' : l > 0 ? '#8f8a7c' : '#2a2733'; ctx.fillRect(x - 3, y - 3, 24, 24);
    if (!ready) ctx.globalAlpha = 0.35;
    skillIcon(id, x, y, l > 0);
    ctx.globalAlpha = 1;
    if (s.kind === 'weapon' && P.gweapon === id) { ctx.strokeStyle = '#d8f3ff'; ctx.strokeRect(x - 4.5, y - 4.5, 27, 27); }
    const kk = keyOf(id); if (kk && l > 0) txt(kk, x - 1, y + 5, '#d9a441', 'left');
    if (P.right === id) txt('R', x - 1, y + 17, '#d8f3ff', 'left');
    ctx.fillStyle = '#0a090d'; ctx.fillRect(cx + 5, cy + 5, 12, 9);
    txt(String(l), cx + 11, cy + 12, l > 0 ? '#e8e2d0' : '#6f6a79', 'center', false);
    uiButton(x - 3, y - 3, 24, 24, () => {
      if (learn(id)) return;
      if (s.kind === 'weapon' && l > 0) { P.gweapon = id; say(`Golem wields the ${s.name}`, 1.2); }
      else if (!ready) say(P.level < s.req ? `Requires level ${s.req}` : `Requires ${SK[s.pre].name}`, 1.2);
    }, () => {
      if (s.kind === 'weapon' && l > 0) { P.gweapon = id; say(`Golem wields the ${s.name}`, 1.2); }
      else if ((s.kind === 'cast' || s.kind === 'hold') && l > 0) setRight(id);
    });
    if (inRect(mouse, x - 3, y - 3, 24, 24)) {
      G.hoverSkill = id;
      const lines = [[s.name, '#e8e2d0']].concat(wrap(s.desc, 46).map(t => [t, '#a39d8c']));
      if (s.mana) lines.push([`Mana: ${s.mana}${s.kind === 'hold' ? (id === 'lance' ? '/s' : ' per wisp') : ''}`, '#5c86d6']);
      lines.push([(l > 0 ? 'Now: ' : 'Level 1: ') + skillInfo(id, l || 1), '#8b95ff']);
      if (l > 0 && l < 20) lines.push(['Next: ' + skillInfo(id, l + 1), '#6f7bd8']);
      if (s.pre && !P.skills[s.pre]) lines.push([`Requires ${SK[s.pre].name}`, '#c8553d']);
      if (P.level < s.req) lines.push([`Requires level ${s.req}`, '#c8553d']);
      const how = s.kind === 'weapon' ? (l > 0 ? (P.gweapon === id ? 'Wielded by your golem' : 'Right-click: golem wields it') : 'Learn it to arm your golem')
        : s.kind === 'cast' || s.kind === 'hold' ? 'Right-click: set as right skill · hover + key to bind a hotkey' : 'Passive';
      lines.push([how, '#6f6a79']);
      tooltip = lines;
    }
  }
  txt('Click: learn · Right-click: use · Hover + key: bind', 10, 234, '#6f6a79', 'left', false);
  smallBtn('Reset', 186, 226, () => respecSkills());
}
function wrap(t, n) { const out = []; let line = ''; for (const w of t.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; }
// wisp choir: choose how many of each wisp type you keep
const POP = { x: 62, y: HUD_Y - 76, w: 160, h: 74 };
function drawChoir() {
  const p = POP;
  ctx.fillStyle = 'rgba(14,13,18,0.97)'; ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
  txt('WISP CHOIR', p.x + 6, p.y + 10, '#d9a441');
  txt('V', p.x + p.w - 8, p.y + 10, '#6f6a79', 'right', false);
  const tg = wispTargets(), c = countKinds(), resv = reservedWisps();
  const rows = [['rev', 'Revenant', '#d8f3ff'], ['beam', 'Beam', '#ffe2a0'], ['prism', 'Prism', '#e0c8ff']];
  rows.forEach(([k, name, col], i) => {
    const y = p.y + 16 + i * 15;
    ctx.fillStyle = '#1b1920'; ctx.fillRect(p.x + 4, y, p.w - 8, 13);
    ctx.fillStyle = col; ctx.fillRect(p.x + 8, y + 5, 3, 3);
    txt(name, p.x + 15, y + 9, '#e8e2d0', 'left', false);
    txt(`${c[k]}/${tg[k]}`, p.x + 84, y + 9, col, 'right', false);
    if (k === 'rev') { txt('the rest', p.x + 92, y + 9, '#6f6a79', 'left', false); return; }
    if (!P.skills[k]) { txt(`learn ${SK[k].name}`, p.x + 88, y + 9, '#5a5563', 'left', false); return; }
    smallBtn('-', p.x + 92, y, () => { P.alloc[k] = Math.max(0, tg[k] - 1); }, tg[k] > 0);
    smallBtn('+', p.x + 108, y, () => { P.alloc[k] = tg[k] + 1; }, tg.rev > 0);
    smallBtn('max', p.x + 124, y, () => { P.alloc[k] = tg[k] + tg.rev; }, tg.rev > 0);
  });
  txt(`${D.wispCap} total · ${resv} held by skills`, p.x + 6, p.y + 68, '#6f6a79', 'left', false);
}
// golem orders, Secret of Mana style: place the golem on the grid, plus toggles
const GB = { x: 124, y: 30, w: 232, h: 148 };
function drawGolemOrders() {
  const p = GB, B = P.gbeh, O = golemOrders();
  ctx.fillStyle = 'rgba(14,13,18,0.97)'; ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText('Golem orders', p.x + 8, p.y + 16);
  txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79'); uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.gbeh = false; });
  const gx = p.x + 26, gy = p.y + 34, cs = 16;
  txt('ATTACK', gx + cs * 2.5, gy - 4, '#c8553d', 'center', false);
  txt('GUARD', gx + cs * 2.5, gy + cs * 5 + 9, '#5c86d6', 'center', false);
  txt('CLOSE', gx - 3, gy + cs * 5 + 18, '#6f6a79', 'left', false); txt('ROAM', gx + cs * 5 + 3, gy + cs * 5 + 18, '#6f6a79', 'right', false);
  for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) {
    const cx = gx + xx * cs, cy = gy + yy * cs, on = B.x === xx && 4 - B.y === yy;
    const agg = (4 - yy) / 4, rng = xx / 4;
    ctx.fillStyle = `rgb(${24 + agg * 40},${22 + rng * 10},${30 + (1 - agg) * 30})`; ctx.fillRect(cx, cy, cs - 1, cs - 1);
    if (on) { skillIcon('golem', cx - 1, cy - 1, true); ctx.strokeStyle = '#d9a441'; ctx.strokeRect(cx - 1.5, cy - 1.5, cs + 2, cs + 2); }
    uiButton(cx, cy, cs - 1, cs - 1, () => { B.x = xx; B.y = 4 - yy; });
  }
  const tx = p.x + 124;
  const tog = [['charge', 'Shield charges'], ['toss', 'Shield toss'], ['focus', 'Attack my target'], ['hold', 'Hold position']];
  tog.forEach(([k, label], i) => {
    const y = p.y + 34 + i * 16, on = B[k], dis = k === 'toss' && !P.skills.toss;
    ctx.fillStyle = '#0a090d'; ctx.fillRect(tx, y, 9, 9); ctx.fillStyle = on && !dis ? '#d9a441' : '#2a2733'; ctx.fillRect(tx + 2, y + 2, 5, 5);
    txt(label, tx + 13, y + 8, dis ? '#5a5563' : '#e8e2d0', 'left', false);
    uiButton(tx, y, 100, 11, () => { B[k] = !B[k]; if (k === 'hold' && G.golem) G.golem.hold = B.hold ? { x: G.golem.x, y: G.golem.y } : null; });
  });
  const lines = [`Engages foes within ${O.aggro.toFixed(1)} yd`, O.guard ? 'Only fights what threatens you' : 'Seeks out any enemy', B.hold ? 'Holds where you last placed it' : 'Follows you'];
  lines.forEach((l, i) => txt(l, tx, p.y + 108 + i * 10, '#8f8a7c', 'left', false));
}
function pickOptions() { return G.pick === 'L' ? LEFT_SKILLS.filter(id => id === 'attack' || P.skills[id] > 0) : RIGHT_SKILLS.filter(id => P.skills[id] > 0); }
function pickRect() {
  const n = Math.max(1, pickOptions().length), per = 8, cols = Math.min(per, n), rows = Math.ceil(n / per), w = cols * 20 + 4, h = rows * 20 + 2;
  return G.pick === 'L' ? { x: 44, y: HUD_Y - 2 - h, w, h, cols } : { x: W - 42 - w, y: HUD_Y - 2 - h, w, h, cols };
}
function drawPick() {
  const r = pickRect(), opts = pickOptions(), cur = G.pick === 'L' ? P.left : P.right;
  ctx.fillStyle = 'rgba(14,13,18,0.97)'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
  if (!opts.length) { txt('Nothing learned', r.x + 2, r.y - 3, '#6f6a79'); return; }
  opts.forEach((id, i) => {
    const x = r.x + 3 + (i % r.cols) * 20, y = r.y + 2 + Math.floor(i / r.cols) * 20;
    skillIcon(id, x, y, id === cur);
    if (id === cur) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(x - .5, y - .5, 19, 19); }
    const kk = id === 'attack' ? '' : keyOf(id); if (kk) txt(kk, x + 1, y + 7, '#d9a441', 'left');
    uiButton(x, y, 18, 18, () => { if (G.pick === 'L') setLeft(id); else setRight(id); G.pick = null; });
    if (inRect(mouse, x, y, 18, 18)) { G.hoverSkill = id; tooltip = [[id === 'attack' ? 'Attack' : SK[id].name, '#e8e2d0']].concat(id === 'attack' ? [] : [[SK[id].mana ? `Mana ${SK[id].mana}` : '', '#5c86d6'], ['Press a key to bind it', '#6f6a79']]); }
  });
}
