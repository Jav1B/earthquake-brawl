// Automated playtest: a simple bot plays every level with every hero.
// Catches crashes, broken numbers (NaN) and levels that can't be finished.
// Run with: npm test
import * as THREE from 'three';
import { Game } from '../src/core/Game.js';
import { CHARACTERS } from '../src/data/characters.js';
import { LEVELS } from '../src/data/levels.js';

const MAX_SECONDS = 240;
let failed = false;

for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex++) for (const hero of Object.keys(CHARACTERS)) {
  const game = new Game(new THREE.Scene(), hero, null, { levelIndex });
  const held = new Set();
  const pressed = new Set();
  const input = { isDown: (a) => held.has(a), pressed: (a) => pressed.has(a) };
  let t = 0;

  while (t < MAX_SECONDS && !game.result) {
    held.clear();
    pressed.clear();
    const p = game.player;
    const foes = game.enemies.filter((e) => e.hittable);
    if (foes.length) {
      const e = foes.reduce((a, b) => (Math.abs(a.pos.x - p.pos.x) < Math.abs(b.pos.x - p.pos.x) ? a : b));
      let dx = e.pos.x - p.pos.x;
      let dz = e.pos.z - p.pos.z;
      // Sneak behind shields
      if (e.shieldUp && Math.sign(-dx) === e.facing) {
        dx += e.facing * 2.5;
        dz = (e.pos.z > 0 ? -1.5 : 1.5) - p.pos.z + e.pos.z;
      }
      const reach = 1.0 + e.def.size.w / 2;
      if (Math.abs(dz) > 0.3) held.add(dz > 0 ? 'down' : 'up');
      if (Math.abs(dx) > reach || Math.sign(dx) !== p.facing) held.add(dx > 0 ? 'right' : 'left');
      if (Math.abs(dx) < reach + 0.6 && Math.abs(dz) < 0.5) pressed.add(Math.random() < 0.7 ? 'attack' : 'special');
    } else if (!game.level.locked) {
      held.add('right');
    }

    game.update(1 / 60, input);
    t += 1 / 60;

    for (const f of [p, ...game.enemies]) {
      if (![f.pos.x, f.pos.y, f.pos.z, f.hp].every(Number.isFinite)) {
        throw new Error(`${hero}: ${f.def.name} has a broken position/hp at ${t.toFixed(1)}s`);
      }
    }
  }

  const ok = game.result !== null;
  if (!ok) failed = true;
  console.log(
    `${ok ? '✓' : '✗'} level ${levelIndex + 1} ${hero.padEnd(11)} ${game.result ?? 'stuck (timeout)'} after ${t.toFixed(0)}s, ` +
      `hp ${game.player.hp.toFixed(0)}/${game.player.def.maxHp}, reached wave ${game.level.waveIndex}`,
  );
}

process.exit(failed ? 1 : 0);
