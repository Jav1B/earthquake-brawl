// Bad guys that climb out of the earthquake cracks.
// Bosses are enemies with boss: true (they get a big health bar).
//   aggression – 0..1, how often it attacks when it gets the chance
//   shield     – seconds the shield stays up / down. Hits from the front are blocked while it's up.
//   turnDelay  – seconds it takes to turn around (sneak behind it!)
//   dodge      – 0..1, chance to hop away when the hero attacks
export const ENEMIES = {
  crawler: {
    name: 'Crack Crawler',
    model: 'crawler',
    maxHp: 25,
    speed: 2.4,
    size: { w: 0.9, h: 1.3 },
    attacks: ['claw'],
    aggression: 0.55,
  },
  brute: {
    name: 'Rock Brute',
    model: 'brute',
    maxHp: 60,
    speed: 1.6,
    size: { w: 1.2, h: 2.1 },
    attacks: ['rockPunch'],
    aggression: 0.5,
  },
  house: {
    name: 'House',
    model: 'house',
    maxHp: 80,
    speed: 1.1,
    size: { w: 1.6, h: 2.5 },
    attacks: ['metalPunch'],
    aggression: 0.5,
  },
  chatiGrife: {
    name: 'Chati-grife',
    model: 'cat',
    maxHp: 30,
    speed: 3.6,
    size: { w: 1.3, h: 1.1 },
    attacks: ['lavaClaw'],
    aggression: 0.65,
  },
  ningage: {
    name: 'Ningage',
    model: 'ninja',
    maxHp: 35,
    speed: 4,
    size: { w: 0.8, h: 1.85 },
    attacks: ['ninjaSlash'],
    aggression: 0.7,
    dodge: 0.45,
  },
  chimpanze: {
    name: 'Chimpanze',
    model: 'ape',
    maxHp: 70,
    speed: 2,
    size: { w: 1.4, h: 2.1 },
    attacks: ['apeSlam', 'iceSpit'],
    aggression: 0.55,
  },
  robot: {
    name: 'Missile Robot',
    boss: true,
    model: 'robot',
    maxHp: 220,
    speed: 1.4,
    size: { w: 1.6, h: 2.8 },
    attacks: ['robotPunch', 'missile'],
    aggression: 0.75,
    shield: { up: 3.5, down: 3 },
    turnDelay: 1.2,
  },
};
