// Levels, played in order. Each level has its own place (theme, colors),
// waves of enemies, and a boss at the end. Enemy ids come from enemies.js.
//
// Levels scroll left to right. Each wave triggers when the hero reaches
// its x position; enemies climb out of cracks and the screen stops
// scrolling until they're all beaten. After the last wave, the boss
// appears near the end of the level.
//
// To add a level: copy the whole { ... } block below, paste it after it,
// and change the name, theme, colors, waves and boss.
export const LEVELS = [
  {
    name: 'Level 1 – The Forest',
    theme: 'forest', // scenery to build (see levels/Level.js)
    length: 110,
    groundColor: 0x3d6b35,
    skyColor: 0x9cc7e4,
    waves: [
      { x: 8,  enemies: ['crawler', 'crawler'] },
      { x: 22, enemies: ['chatiGrife', 'crawler', 'chatiGrife'] },
      { x: 36, enemies: ['brute', 'ningage'] },
      { x: 50, enemies: ['house', 'crawler', 'crawler'] },
      { x: 64, enemies: ['chimpanze', 'chatiGrife', 'ningage'] },
      { x: 78, enemies: ['house', 'chimpanze'] },
      { x: 92, enemies: ['ningage', 'ningage', 'chatiGrife'] },
    ],
    boss: 'robot',
  },
];
