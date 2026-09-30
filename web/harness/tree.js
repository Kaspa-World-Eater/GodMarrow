// D2-style skill tree: three tabs, a 3-column grid, prerequisite arrows, click to learn
const TREE = { col: c => 30 + c * 58, row: r => 46 + r * 37 };
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
    const gy = py + 18.5, gx = cx - 20.5;
    ctx.moveTo(px + .5, py + 12); ctx.lineTo(px + .5, gy); ctx.lineTo(gx, gy); ctx.lineTo(gx, cy + .5); ctx.lineTo(cx - 14, cy + .5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 15, cy - 2.5); ctx.lineTo(cx - 15, cy + 3.5); ctx.lineTo(cx - 12, cy + .5); ctx.fill();
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
  // tabs, D2-style on the right edge
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
  ctx.fillStyle = '#0d0c11'; ctx.fillRect(8, 26, 170, 190);
  ctx.strokeStyle = '#2a2733'; ctx.strokeRect(8.5, 26.5, 169, 189);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText(TAB_NAMES[G.tab] + ' tree', 10, 20);
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
    if (P.right === id || P.left === id) txt(P.right === id ? 'R' : 'L', x - 2, y + 4, '#d8f3ff', 'left');
    // level box
    ctx.fillStyle = '#0a090d'; ctx.fillRect(cx + 5, cy + 7, 12, 9);
    txt(String(l), cx + 11, cy + 15, l > 0 ? '#e8e2d0' : '#6f6a79', 'center', false);
    uiButton(x - 3, y - 3, 24, 24, () => {
      if (learn(id)) return;
      if (s.kind === 'weapon' && l > 0) { P.gweapon = id; say(`Golem wields the ${s.name}`, 1.2); }
      else if (!ready) say(P.level < s.req ? `Requires level ${s.req}` : `Requires ${SK[s.pre].name}`, 1.2);
    }, () => {
      if (s.kind === 'weapon' && l > 0) { P.gweapon = id; say(`Golem wields the ${s.name}`, 1.2); }
      else if ((s.kind === 'cast' || s.kind === 'hold') && l > 0) setRight(id);
    });
    if (inRect(mouse, x - 3, y - 3, 24, 24)) {
      const lines = [[s.name, '#e8e2d0']].concat(wrap(s.desc, 46).map(t => [t, '#a39d8c']));
      lines.push([(l > 0 ? 'Now: ' : 'Level 1: ') + skillInfo(id, l || 1), '#8b95ff']);
      if (l > 0 && l < 20) lines.push(['Next: ' + skillInfo(id, l + 1), '#6f7bd8']);
      if (s.pre && !P.skills[s.pre]) lines.push([`Requires ${SK[s.pre].name}`, '#c8553d']);
      if (P.level < s.req) lines.push([`Requires level ${s.req}`, '#c8553d']);
      const how = s.kind === 'weapon' ? (l > 0 ? (P.gweapon === id ? 'Wielded by your golem' : 'Right-click: golem wields it') : 'Learn it to arm your golem')
        : s.kind === 'cast' || s.kind === 'hold' ? 'Right-click: set as right skill' : 'Passive';
      lines.push([how, '#6f6a79']);
      tooltip = lines;
    }
  }
  txt('Click: learn · Right-click: use / wield', 10, 235, '#6f6a79', 'left', false);
  smallBtn('Reset skills', 150, 219, () => respecSkills());
}
function wrap(t, n) { const out = []; let line = ''; for (const w of t.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; }
// wisp choir: choose how many of each wisp type you keep
const POP = { x: 62, y: HUD_Y - 64, w: 150, h: 62 };
function drawChoir() {
  const p = POP;
  ctx.fillStyle = 'rgba(14,13,18,0.97)'; ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
  txt('WISP CHOIR', p.x + 6, p.y + 10, '#d9a441');
  txt('V', p.x + p.w - 8, p.y + 10, '#6f6a79', 'right', false);
  const tg = wispTargets(), c = countKinds();
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
}
function pickOptions() { return G.pick === 'L' ? LEFT_SKILLS.filter(id => id === 'attack' || P.skills[id] > 0) : RIGHT_SKILLS.filter(id => P.skills[id] > 0); }
function pickRect() { const n = Math.max(1, pickOptions().length), w = n * 20 + 4; return G.pick === 'L' ? { x: 44, y: HUD_Y - 24, w, h: 22 } : { x: W - 42 - w, y: HUD_Y - 24, w, h: 22 }; }
function drawPick() {
  const r = pickRect(), opts = pickOptions(), cur = G.pick === 'L' ? P.left : P.right;
  ctx.fillStyle = 'rgba(14,13,18,0.97)'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
  if (!opts.length) { txt('Nothing learned', r.x + 2, r.y - 3, '#6f6a79'); return; }
  opts.forEach((id, i) => {
    const x = r.x + 3 + i * 20, y = r.y + 2;
    skillIcon(id, x, y, id === cur);
    if (id === cur) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(x - .5, y - .5, 19, 19); }
    uiButton(x, y, 18, 18, () => { if (G.pick === 'L') setLeft(id); else setRight(id); G.pick = null; });
    if (inRect(mouse, x, y, 18, 18)) tooltip = [[id === 'attack' ? 'Attack' : SK[id].name, '#e8e2d0']];
  });
}
