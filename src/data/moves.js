// Every attack in the game. Characters and enemies reference these by id.
//   damage     – HP removed on hit
//   startup    – seconds of wind-up before the attack hits
//   active     – seconds the attack can hit
//   recovery   – seconds after, before you can act again
//   range      – how far in front it reaches (for enemies with projectiles:
//                the farthest distance they'll shoot from)
//   knockback  – how far the target gets pushed
// Optional extras:
//   effect     – 'burn' (damage over time) or 'sleep' (target can't move)
//   lunge      – dash forward this far during the attack
//   bothSides  – hits in front AND behind (spin attacks)
//   projectile – shoots something instead of hitting up close
//   sound      – sound effect when the move starts (default: 'swing').
//                See src/core/Sound.js for the list.
export const MOVES = {
  // --- Samacaille ---
  swordSlash: { name: 'Sword Slash', damage: 7, startup: 0.06, active: 0.1, recovery: 0.12, range: 1.5, knockback: 0.4 },
  fireSlash:  { name: 'Fire Slash', damage: 12, startup: 0.2, active: 0.15, recovery: 0.3, range: 2.0, knockback: 1.0, effect: 'burn', sound: 'fire' },

  // --- Rinoserase ---
  hornCharge: { name: 'Horn Charge', damage: 10, startup: 0.15, active: 0.3, recovery: 0.3, range: 1.0, knockback: 1.8, lunge: 3, sound: 'charge' },
  fireSpit:   { name: 'Fire Spit', damage: 6, startup: 0.15, active: 0.05, recovery: 0.3, effect: 'burn', sound: 'fire',
                projectile: { shape: 'ball', speed: 12, size: 0.3, color: 0xff6600, life: 0.9 } },

  // --- Alima ---
  hammerSmash: { name: 'Hammer Smash', damage: 12, startup: 0.2, active: 0.12, recovery: 0.25, range: 1.6, knockback: 1.5 },
  sleepArrow:  { name: 'Sleep Arrow', damage: 2, startup: 0.25, active: 0.05, recovery: 0.25, effect: 'sleep', sound: 'arrow',
                 projectile: { shape: 'arrow', speed: 18, size: 0.15, color: 0x99ccff, life: 1.2 } },

  // --- Lutar ---
  axeChop: { name: 'Axe Chop', damage: 5, startup: 0.03, active: 0.08, recovery: 0.08, range: 1.0, knockback: 0.2 },
  axeSpin: { name: 'Axe Spin', damage: 9, startup: 0.1, active: 0.35, recovery: 0.25, range: 1.4, knockback: 1.0, bothSides: true, sound: 'spin' },

  // --- Enemies ---
  claw:       { name: 'Claw', damage: 5, startup: 0.25, active: 0.1, recovery: 0.3, range: 1.0, knockback: 0.3 },
  rockPunch:  { name: 'Rock Punch', damage: 12, startup: 0.45, active: 0.12, recovery: 0.5, range: 1.4, knockback: 1.5 },
  robotPunch: { name: 'Robot Punch', damage: 10, startup: 0.55, active: 0.15, recovery: 0.4, range: 1.6, knockback: 2.0 },
  missile:    { name: 'Missile', damage: 10, startup: 0.5, active: 0.05, recovery: 0.6, range: 12, sound: 'missile',
                projectile: { shape: 'missile', speed: 8, size: 0.25, color: 0xdddddd, life: 2.5, aimZ: true } },
};
