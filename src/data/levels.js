// Levels, played in order. Each level has its own place (theme, colors,
// music), waves of enemies, and a boss at the end. Enemy ids come from enemies.js.
// `name` is shown to the player, so it must be in French.
//
// Levels scroll left to right. Each wave triggers when the hero reaches
// its x position; enemies climb out of cracks and the screen stops
// scrolling until they're all beaten. After the last wave, the boss
// appears near the end of the level.
//
// Optional: `barrels` – soy sauce barrels to break. The spill is slippery!
//
// To add a level: copy a whole { ... } block below, paste it after it,
// and change the name, theme, colors, waves and boss.
export const LEVELS = [
  {
    name: 'Niveau 1 – La Forêt',
    theme: 'forest', // scenery to build (see levels/Level.js)
    music: 'forest', // song while playing (see core/Sound.js)
    length: 110,
    groundColor: 0x3d6b35,
    pathColor: 0x7a5c3a,
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
  {
    name: 'Niveau 2 – Les Montagnes Sushi',
    theme: 'sushi',
    music: 'sushi',
    length: 100,
    groundColor: 0x7a9a4a,
    pathColor: 0xb9a888,
    skyColor: 0xf6d6b8,
    waves: [
      { x: 8,  enemies: ['miniSushi', 'miniSushi'] },
      { x: 22, enemies: ['waiter', 'miniSushi', 'miniSushi'] },
      { x: 36, enemies: ['waiter', 'waiter', 'miniSushi'] },
      { x: 50, enemies: ['miniSushi', 'miniSushi', 'miniSushi', 'waiter'] },
      { x: 66, enemies: ['waiter', 'waiter', 'miniSushi', 'miniSushi'] },
      { x: 82, enemies: ['waiter', 'waiter', 'waiter'] },
    ],
    boss: 'maitreSushi',
    barrels: [
      { x: 5, z: 1.2 }, { x: 13, z: -1.2 }, { x: 20, z: 0.5 }, { x: 28, z: -1.8 },
      { x: 34, z: 1.6 }, { x: 46, z: -0.6 }, { x: 54, z: 1.8 }, { x: 62, z: -1.4 },
      { x: 70, z: 0.8 }, { x: 79, z: -1.8 }, { x: 88, z: 1.4 }, { x: 93, z: -0.5 },
    ],
  },
];
