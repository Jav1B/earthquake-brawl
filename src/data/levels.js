// Levels scroll left to right. Each wave triggers when the player reaches
// its x position; enemies climb out of cracks and the screen stops
// scrolling until they're all beaten.
export const LEVELS = [
  {
    name: 'Level 1 – The Forest',
    theme: 'forest',
    length: 80,
    groundColor: 0x3d6b35,
    skyColor: 0x9cc7e4,
    waves: [
      { x: 8,  enemies: ['crawler', 'crawler'] },
      { x: 24, enemies: ['crawler', 'crawler', 'crawler'] },
      { x: 40, enemies: ['brute', 'crawler', 'crawler'] },
      { x: 58, enemies: ['brute', 'brute', 'crawler'] },
      { x: 75, enemies: ['robot'] },
    ],
  },
];
