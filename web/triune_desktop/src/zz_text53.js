// zz_text53.js (v0.53) — text only. The Hemomancer's Chitin Plates become Scar-Plates: welts the scourge raised,
// hardened into ridged scar (the user: "Chitin Plates will be reflavoured as welts and hardened scars"). Ids unchanged.
(function () {
  const s = typeof SK !== 'undefined' && SK.chitin; if (!s) return;
  s.name = 'Scar-Plates';
  s.desc = 'Mutation: every welt the scourge ever raised on you hardens into a ridge of scar, split and seamed like old plate. Blows glance off them, and what does bite you loses much of its weight before it ever reaches meat.';
  if (s.perks) {
    if (s.perks[0]) { s.perks[0].name = 'Barbed Scars'; s.perks[0].desc = 'Enemies that strike you in melee are cut on the barbed ridges of scar.'; }
    if (s.perks[1]) { s.perks[1].name = 'Thick Scar'; }
  }
  try { if (typeof ARC !== 'undefined' && ARC.f_shed) { ARC.f_shed.name = 'Shed Scar'; ARC.f_shed.up = 'When you are struck, Scar-Plates may tear loose a ridge of scar that cuts the attacker.'; } } catch (e) { }
})();
