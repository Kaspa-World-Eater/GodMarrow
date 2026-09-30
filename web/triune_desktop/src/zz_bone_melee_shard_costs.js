// zz_bone_melee_shard_costs.js
// User: "the bone melee skill shouldnt use mana, just some poise. this will be
// true for all melee actions. remember how we did the monk attacks in the side demo."
// Ossuarch's Carapace tree (melee) drops mana entirely and pays in poise (stam).
// Shards still ENHANCE these blows (existing shard consumption inside each spell
// is untouched) but are not the cost of pressing the button.
(function () {
  if (typeof SK === 'undefined') return;

  // poise cost per swing. tuned like miasmancer's rarc/talon/thrust:
  // light blows 3-5, heavier swings 6-8, big finishers 8-12. never a lockout
  // (see zc_combat22.js — cost is spent then poise refills after the delay).
  const tune = {
    crush:   { mana: 0, shards: 0, stam: 8 },   // Marrow Crush   — 2H overhead
    gcharge: { mana: 0, shards: 0, stam: 10 },  // Grinding Charge — shoulder rush
    bscythe: { mana: 0, shards: 0, stam: 7 },   // Scythe Sweep   — full arc
    leap:    { mana: 0, shards: 0, stam: 12 },  // Grave Leap     — heavy finisher
    lash:    { mana: 0, shards: 0, stam: 6 },   // Spine Lash     — quick whip
  };
  for (const k in tune) {
    if (!SK[k]) continue;
    SK[k].mana   = tune[k].mana;
    SK[k].shards = tune[k].shards;
    SK[k].stam   = tune[k].stam;
    // strip any older cost tag we may have appended
    if (SK[k].desc) SK[k].desc = SK[k].desc.replace(/\s*\[Cost:[^\]]+\]$/,'');
    if (SK[k].desc) SK[k].desc += ` [Poise: ${tune[k].stam}]`;
  }

  // wire the poise drain into the bone-skill cast path (f_bone.js boneCast).
  // Wrap spendMana so any SK[id].stam is deducted from P.stam even when mana:0,
  // and never fail the cast just because poise is low (souls-style — swings
  // still happen, they just make you heavier when poise runs out).
  if (typeof spendMana === 'function' && typeof useStam === 'function') {
    const _spend = spendMana;
    spendMana = function (id, amt) {
      const s = SK[id] && SK[id].stam;
      if (s) useStam(s);
      return _spend.apply(this, arguments);
    };
  }
})();
