// Every attack in the game. Characters and enemies reference these by id.
// `name` is shown to the player, so it must be in French (see DESIGN.md).
//   damage     – HP removed on hit
//   startup    – seconds of wind-up before the attack hits
//   active     – seconds the attack can hit
//   recovery   – seconds after, before you can act again
//   range      – how far in front it reaches (for enemies with projectiles:
//                the farthest distance they'll shoot from)
//   knockback  – how far the target gets pushed
// Optional extras:
//   effect     – 'burn' (damage over time), 'sleep' (target can't move)
//                or 'freeze' (target moves slowly)
//   lunge      – dash forward this far during the attack
//   bothSides  – hits in front AND behind (spin attacks)
//   projectile – shoots something instead of hitting up close
//                (boomerang: true = comes back to the thrower)
//   sound      – sound effect when the move starts (default: 'swing').
//                See src/core/Sound.js for the list.
export const MOVES = {
  // --- Samacaille ---
  swordSlash: { name: "Coup d'épée", damage: 7, startup: 0.06, active: 0.1, recovery: 0.12, range: 1.5, knockback: 0.4 },
  fireSlash:  { name: 'Lame de feu', damage: 12, startup: 0.2, active: 0.15, recovery: 0.3, range: 2.0, knockback: 1.0, effect: 'burn', sound: 'fire' },

  // --- Rinoserase ---
  hornCharge: { name: 'Charge de corne', damage: 10, startup: 0.15, active: 0.3, recovery: 0.3, range: 1.0, knockback: 1.8, lunge: 3, sound: 'charge' },
  fireSpit:   { name: 'Crachat de feu', damage: 6, startup: 0.15, active: 0.05, recovery: 0.3, effect: 'burn', sound: 'fire',
                projectile: { shape: 'ball', speed: 12, size: 0.3, color: 0xff6600, life: 0.9 } },

  // --- Alima ---
  hammerSmash: { name: 'Coup de marteau', damage: 12, startup: 0.2, active: 0.12, recovery: 0.25, range: 1.6, knockback: 1.5 },
  sleepArrow:  { name: 'Flèche somnifère', damage: 2, startup: 0.25, active: 0.05, recovery: 0.25, effect: 'sleep', sound: 'arrow',
                 projectile: { shape: 'arrow', speed: 18, size: 0.15, color: 0x99ccff, life: 1.2 } },

  // --- Lutar ---
  axeChop: { name: 'Coup de hache', damage: 6, startup: 0.03, active: 0.08, recovery: 0.08, range: 1.6, knockback: 0.2 },
  axeSpin: { name: 'Tourbillon de haches', damage: 9, startup: 0.1, active: 0.35, recovery: 0.25, range: 1.9, knockback: 1.0, bothSides: true, sound: 'spin' },

  // --- Enemies: level 1 ---
  claw:       { name: 'Griffe', damage: 5, startup: 0.25, active: 0.1, recovery: 0.3, range: 1.0, knockback: 0.3 },
  rockPunch:  { name: 'Poing de roche', damage: 12, startup: 0.45, active: 0.12, recovery: 0.5, range: 1.4, knockback: 1.5 },
  robotPunch: { name: 'Poing robot', damage: 10, startup: 0.55, active: 0.15, recovery: 0.4, range: 1.6, knockback: 2.0 },
  metalPunch: { name: 'Poing de métal', damage: 13, startup: 0.5, active: 0.12, recovery: 0.5, range: 1.5, knockback: 2.0, sound: 'heavy' },
  lavaClaw:   { name: 'Griffe de lave', damage: 6, startup: 0.15, active: 0.12, recovery: 0.3, range: 1.0, knockback: 0.3, lunge: 1.5, effect: 'burn' },
  ninjaSlash: { name: 'Taillade ninja', damage: 7, startup: 0.12, active: 0.1, recovery: 0.25, range: 1.3, knockback: 0.5, lunge: 2.5 },
  apeSlam:    { name: 'Frappe du singe', damage: 12, startup: 0.45, active: 0.15, recovery: 0.45, range: 1.5, knockback: 1.8, sound: 'heavy' },
  iceSpit:    { name: 'Crachat de glace', damage: 6, startup: 0.35, active: 0.05, recovery: 0.5, range: 10, effect: 'freeze', sound: 'ice',
                projectile: { shape: 'ice', speed: 9, size: 0.28, color: 0x99eeff, life: 2, aimZ: true } },
  missile:    { name: 'Missile', damage: 10, startup: 0.5, active: 0.05, recovery: 0.6, range: 12, sound: 'missile',
                projectile: { shape: 'missile', speed: 8, size: 0.25, color: 0xdddddd, life: 2.5, aimZ: true } },

  // --- Enemies: level 2 ---
  sushiBump:  { name: 'Coup de riz', damage: 4, startup: 0.25, active: 0.15, recovery: 0.35, range: 0.8, knockback: 0.5, lunge: 1.2 },
  trayThrow:  { name: 'Plateau boomerang', damage: 4, startup: 0.35, active: 0.05, recovery: 0.4, range: 9,
                projectile: { shape: 'tray', speed: 9, size: 0.3, color: 0xc8ccd0, life: 3, aimZ: true, boomerang: true } },
  chopsticks: { name: "Baguettes d'acier", damage: 9, startup: 0.2, active: 0.12, recovery: 0.3, range: 1.6, knockback: 1.0, sound: 'clang' },
  energyBall: { name: "Boule d'énergie", damage: 10, startup: 0.5, active: 0.05, recovery: 0.5, range: 12, sound: 'energy',
                projectile: { shape: 'energy', speed: 8, size: 0.4, color: 0xffdd00, life: 2.5, aimZ: true } },
};
