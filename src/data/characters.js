// Playable heroes. `model` picks the look from entities/models.js.
//   moves.attack  – J key
//   moves.special – K key
export const CHARACTERS = {
  samacaille: {
    name: 'Samacaille',
    title: 'Samurai with a fire sword',
    model: 'samurai',
    color: 0xc0392b,
    maxHp: 100,
    speed: 4.2,
    jumpPower: 7,
    size: { w: 0.8, h: 1.9 },
    moves: { attack: 'swordSlash', special: 'fireSlash' },
  },
  rinoserase: {
    name: 'Rinoserase',
    title: 'Rhino that spits fire',
    model: 'rhino',
    color: 0x8e8e8e,
    maxHp: 140,
    speed: 3.2,
    jumpPower: 6,
    size: { w: 1.8, h: 1.6 },
    moves: { attack: 'hornCharge', special: 'fireSpit' },
  },
  alima: {
    name: 'Alima',
    title: 'Big hammer & sleep arrows',
    model: 'hammerer',
    color: 0x2e86de,
    maxHp: 110,
    speed: 3.8,
    jumpPower: 7,
    size: { w: 0.8, h: 1.8 },
    moves: { attack: 'hammerSmash', special: 'sleepArrow' },
  },
  lutar: {
    name: 'Lutar',
    title: 'Gnome with double axes',
    model: 'gnome',
    color: 0x27ae60,
    maxHp: 85,
    speed: 5,
    jumpPower: 8,
    size: { w: 0.7, h: 1.1 },
    moves: { attack: 'axeChop', special: 'axeSpin' },
  },
};
