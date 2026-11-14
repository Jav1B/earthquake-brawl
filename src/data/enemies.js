// Bad guys that climb out of the earthquake cracks.
// Bosses are enemies with boss: true (they get a big health bar).
//   aggression – 0..1, how often it attacks when it gets the chance
//   shield     – seconds the shield stays up / down. Hits from the front are blocked while it's up.
//   turnDelay  – seconds it takes to turn around (sneak behind it!)
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
