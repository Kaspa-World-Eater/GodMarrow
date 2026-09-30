// army orders: three squads (count, loadout, orders) and the Colossus (loadout, orders)
function drawArmy() {
  const p = GB, tab = G.armyTab || 0, isCol = tab === 3;
  ctx.fillStyle = 'rgba(14,13,18,0.97)'; ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText('Army orders', p.x + 8, p.y + 16);
  txt(`${G.skels.length}/${BS.skelMax()} standing`, p.x + p.w - 18, p.y + 12, '#8f8a7c', 'right', false);
  txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79'); uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.army = false; });
  // tabs
  ['Squad I', 'Squad II', 'Squad III', 'Colossus'].forEach((name, i) => {
    const bx = p.x + 5 + i * 56, by = p.y + 22, on = tab === i;
    ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, 54, 13);
    if (on) { ctx.fillStyle = '#d9a441'; ctx.fillRect(bx, by + 12, 54, 1); }
    const sub = i < 3 ? ` ${squadCount(i)}/${P.squads[i].n}` : G.colossus ? ` ${G.colossus.n}` : '';
    txt(name + sub, bx + 27, by + 9, on ? '#e8e2d0' : '#a39d8c', 'center', false);
    uiButton(bx, by, 54, 13, () => { G.armyTab = i; });
  });
  const S = isCol ? null : P.squads[tab], B = isCol ? P.sbeh : S.beh;
  // behavior grid
  const gx = p.x + 22, gy = p.y + 52, cs = 14;
  txt('ATTACK', gx + cs * 2.5, gy - 3, '#c8553d', 'center', false);
  txt('GUARD', gx + cs * 2.5, gy + cs * 5 + 8, '#5c86d6', 'center', false);
  txt('CLOSE', gx - 3, gy + cs * 5 + 16, '#6f6a79', 'left', false); txt('ROAM', gx + cs * 5 + 3, gy + cs * 5 + 16, '#6f6a79', 'right', false);
  for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) {
    const cx = gx + xx * cs, cy = gy + yy * cs, on = B.x === xx && 4 - B.y === yy, agg = (4 - yy) / 4;
    ctx.fillStyle = `rgb(${24 + agg * 40},${22 + xx * 2},${30 + (1 - agg) * 30})`; ctx.fillRect(cx, cy, cs - 1, cs - 1);
    if (on) { ctx.fillStyle = '#f4efe2'; ctx.fillRect(cx + 4, cy + 3, 5, 4); ctx.fillStyle = '#0e0d12'; ctx.fillRect(cx + 5, cy + 4, 1, 1); ctx.fillRect(cx + 7, cy + 4, 1, 1); ctx.fillStyle = '#f4efe2'; ctx.fillRect(cx + 6, cy + 8, 1, 3); ctx.strokeStyle = '#d9a441'; ctx.strokeRect(cx - .5, cy - .5, cs, cs); }
    uiButton(cx, cy, cs - 1, cs - 1, () => { B.x = xx; B.y = 4 - yy; });
  }
  const tx = p.x + 112;
  // count
  if (!isCol) {
    const y = p.y + 44, total = P.squads.reduce((a, s) => a + s.n, 0), mx = BS.skelMax();
    txt(`Keep ${S.n}`, tx, y + 9, '#e8e2d0', 'left', false);
    smallBtn('-', tx + 46, y, () => { S.n = Math.max(0, S.n - 1); }, S.n > 0);
    smallBtn('+', tx + 60, y, () => { S.n++; }, total < mx);
    txt(`${total}/${mx} assigned`, tx + 76, y + 9, total > mx ? '#c8553d' : '#6f6a79', 'left', false);
    if (inRect(mouse, tx, y, 118, 12)) tooltip = [['Squad size', '#e8e2d0'], ['Each skeleton holds 5 shards of your aura.', '#a39d8c'], ['Squads fill in order: I, then II, then III.', '#a39d8c']];
  } else {
    txt(G.colossus ? `${G.colossus.n} skeletons fused` : 'Not raised (hold Colossus)', tx, p.y + 53, '#e8e2d0', 'left', false);
  }
  // loadout
  txt('LOADOUT', tx, p.y + 70, '#8f8a7c', 'left', false);
  const list = isCol ? CWEAPONS : SLOADS;
  list.forEach((wid, i) => {
    const bx = tx + i * 23, by = p.y + 74, on = isCol ? P.cweapon === wid : S.load === wid, ok = isCol || loadOk(wid);
    ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, 21, 21); if (on) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(bx + .5, by + .5, 20, 20); }
    if (!ok) ctx.globalAlpha = 0.3;
    boneIcon((isCol ? 'w_' : 's_') + wid, bx + 1, by + 1);
    ctx.globalAlpha = 1;
    if (ok) uiButton(bx, by, 21, 21, () => { if (isCol) { P.cweapon = wid; say(`The Colossus takes up the ${CWEAPON_NAMES[wid]}`, 1.2); } else { S.load = wid; rearm(); } });
    if (inRect(mouse, bx, by, 21, 21)) tooltip = isCol
      ? [[CWEAPON_NAMES[wid], '#e8e2d0'], [CWEAPON_DESC[wid], '#a39d8c'], [`x${CW[wid].mult.toFixed(2)} damage` + (CW[wid].dr ? ` · ${Math.round(CW[wid].dr * 100)}% less damage taken` : ''), '#8b95ff']]
      : [[SLOAD_NAMES[wid], '#e8e2d0'], [SLOAD_DESC[wid], '#a39d8c'], [`x${SL[wid].dmg.toFixed(2)} damage · x${SL[wid].hp.toFixed(2)} life` + (SL[wid].dr ? ` · ${Math.round(SL[wid].dr * 100)}% less damage taken` : ''), '#8b95ff']].concat(ok ? [] : [['Needs the Bone Archers perk (Raise Skeleton lv 10)', '#c8553d']]);
  });
  // toggles
  [['focus', 'Attack my target'], ['hold', 'Hold position']].forEach(([k, label], i) => {
    const y = p.y + 102 + i * 14;
    ctx.fillStyle = '#0a090d'; ctx.fillRect(tx, y, 9, 9); ctx.fillStyle = B[k] ? '#d9a441' : '#2a2733'; ctx.fillRect(tx + 2, y + 2, 5, 5);
    txt(label, tx + 13, y + 8, '#e8e2d0', 'left', false);
    uiButton(tx, y, 100, 11, () => { B[k] = !B[k]; if (k === 'hold') { if (isCol) { if (G.colossus) G.colossus.hold = B.hold ? { x: G.colossus.x, y: G.colossus.y } : null; } else for (const e of G.skels) if (e.sq === tab) e.hold = B.hold ? { x: e.x, y: e.y } : null; } });
  });
  const O = { aggro: 3 + B.x * 1.6, guard: B.y <= 1 };
  const lines = [`Engages foes within ${O.aggro.toFixed(1)} yd · ` + (O.guard ? 'only what threatens you' : 'seeks any enemy'), (B.hold ? 'Holds where they stand' : 'Follows you') + ' · Command Bones overrides'];
  lines.forEach((l, i) => txt(l, p.x + 8, p.y + 154 + i * 9, '#8f8a7c', 'left', false));
}
