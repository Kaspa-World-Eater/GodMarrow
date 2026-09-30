// zz_zz_empty92.js — the user (2026-09-29): "The monk's lore is not up to date either with the character. No mask, called
// the Empty Hand, etc." The skill text still spoke for the old fat, gilded, laughing Buddha: a belly that laughs, a jolly
// breath, a golden hand, gold turned to pitch, silks, a belly-first landing, a stone Buddha, a bodhisattva, and "once every
// 30 s" waits that break the no-cooldown law (the waits themselves were removed in v0.55). This rewrites only the words,
// for the gaunt, barefoot beggar-monk he is now (see claude/godmarrow-class-kusho.md). No numbers change.
(function () {
  if (typeof SK === 'undefined') return;
  const T = {
    klaugh: { desc: 'Every few seconds a dry laugh rattles out of you: a pulse of white radiation that burns everything near and strips wards. Shield-guards drop, parries break, and the Silent Ones\' darkness lifts.',
      perks: [{ name: 'Laugh Down The Valley', desc: 'The laugh reaches 25% farther.' }] },
    kstar: { desc: 'A long, rattling breath out, then a cone of radiant fire that sweeps the arc of your aim. It is half again as strong against the raised dead.' },
    kfist: { desc: 'Raise one bare hand: a colossal fist of light slams down from the sky on the cursor. It deals huge damage to whatever is beneath it, then leaves a ring of holy fire.' },
    ksutra: { desc: 'A halo of burning paper sutras floats behind your head. Cast to loose it: each sutra peels off, seeks an enemy near the cursor and bursts. The halo regrows over time.',
      perks: [{ name: 'Long Sutra', desc: 'Two more sutras in the halo.' }] },
    ksun: { desc: 'Laugh, rise into the air and become a small sun for 10 s. No blow can reach you, and amber beams track and melt every enemy in your gaze. The glass pays dearly for it.' },
    kwalk: { desc: 'Toggle: float an inch above the ground, your shawl gone black as pitch. Rhythmic waves of shadow wither everything around you. Mud and water no longer slow you. Drains Essence while it lasts.' },
    kmirror: { desc: 'A short stance: your shawl goes abyss-black. Any melee blow that lands is swallowed, and a shadow-copy of the attacker strikes it back at double force.' },
    knothing: { desc: 'For 8 s you do not exist: nothing can strike or see you, and the world drains to grey. Everything you pass near is marked. When you return, every mark collapses inward at once. The glass pays dearly for it.' },
    kmount: { desc: 'Leap with shocking agility for a starved old man and come down knees-first at the cursor, flattening everything beneath you. An earthquake of jagged stone rolls out from the impact.' },
    kweep: { desc: 'Call up the weeping stone guardian from the gate of the Peak, many-armed and taller than a house. It lumbers after your enemies, smashes them flat and draws their anger to itself. Only one walks at a time: cast again to send it to the cursor, or on it to dismiss it. It keeps its wounds.' },
    kthousand: { desc: 'A spectral many-armed figure stands up behind you, and a thousand arms of ash and stone strike out in a cone. Armour is pulverised; crowds turn to red mist. The glass pays dearly for it.' },
  };
  for (const k in T) {
    const s = SK[k], o = T[k]; if (!s) continue;
    if (o.desc) s.desc = (/^\[Passive\]/.test(s.desc || '') ? '[Passive] ' : '') + o.desc;
    if (o.perks) o.perks.forEach((q, i) => { const p = s.perks && s.perks[i]; if (!p) return; const pas = /^\[Passive\]/.test(p.desc || ''); if (q.name) p.name = q.name; if (q.desc) p.desc = (pas ? '[Passive] ' : '') + q.desc; });
  }
})();
