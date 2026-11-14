import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { ENEMIES } from '../data/enemies.js';
import { LANE_MIN_Z, LANE_MAX_Z } from '../entities/Fighter.js';

// Builds the scenery for a level and spawns enemy waves out of
// earthquake cracks as the hero moves forward.
export class Level {
  constructor(def, world) {
    this.def = def;
    this.world = world;
    this.scene = world.scene;
    this.enemies = [];
    this.waveIndex = 0;
    this.locked = false; // screen stops scrolling during a fight

    this.scene.background = new THREE.Color(def.skyColor);
    this.scene.fog = new THREE.Fog(def.skyColor, 18, 45);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(def.length + 60, 40),
      new THREE.MeshStandardMaterial({ color: def.groundColor }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(def.length / 2, 0, -10);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Dirt path the fighters walk on
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(def.length + 60, LANE_MAX_Z - LANE_MIN_Z + 1.5),
      new THREE.MeshStandardMaterial({ color: 0x7a5c3a }),
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(def.length / 2, 0.005, 0);
    path.receiveShadow = true;
    this.scene.add(path);

    if (def.theme === 'forest') this.buildForest();
  }

  buildForest() {
    const rand = THREE.MathUtils.randFloat;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d3a1a });
    const leafMats = [0x1e5631, 0x2d6a3e, 0x3b7d4a].map((c) => new THREE.MeshStandardMaterial({ color: c }));
    const tree = (x, z, s) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 1.5 * s, 6), trunkMat);
      trunk.position.y = 0.75 * s;
      t.add(trunk);
      const leaves = leafMats[Math.floor(Math.random() * leafMats.length)];
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry((1.4 - i * 0.35) * s, 1.6 * s, 7), leaves);
        c.position.y = (1.6 + i * 0.9) * s;
        c.castShadow = true;
        t.add(c);
      }
      t.position.set(x, 0, z);
      this.scene.add(t);
    };
    // Rows of trees behind the path, getting bigger further back
    for (let x = -15; x < this.def.length + 25; x += rand(1.5, 3.5)) tree(x, rand(-5, -4), rand(0.8, 1.2));
    for (let x = -15; x < this.def.length + 25; x += rand(2, 4)) tree(x, rand(-10, -7), rand(1.2, 1.8));
    // A few bushes in front
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2d6a3e });
    for (let x = -10; x < this.def.length + 20; x += rand(6, 12)) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(rand(0.4, 0.7), 8, 6), bushMat);
      b.position.set(x, 0.2, rand(3.8, 4.5));
      this.scene.add(b);
    }
  }

  // A glowing crack in the ground where an enemy climbs out.
  addCrack(x, z, size) {
    const crack = new THREE.Group();
    const dark = new THREE.Mesh(new THREE.CircleGeometry(size, 7), new THREE.MeshBasicMaterial({ color: 0x110805 }));
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(size * 0.55, 5),
      new THREE.MeshBasicMaterial({ color: 0xff5500 }),
    );
    glow.position.z = 0.001;
    crack.add(dark, glow);
    crack.rotation.x = -Math.PI / 2;
    crack.rotation.z = Math.random() * Math.PI;
    crack.scale.set(1.6, 0.6, 1);
    crack.position.set(x, 0.02, z);
    this.scene.add(crack);
  }

  update(player, cameraX, dt) {
    const wave = this.def.waves[this.waveIndex];
    if (!this.locked && wave && player.pos.x >= wave.x) {
      this.spawnWave(wave, cameraX);
      this.locked = true;
    }
    for (const e of this.enemies) e.think(player, dt);

    // Clean up enemies that finished sinking into the ground
    this.enemies = this.enemies.filter((e) => {
      if (e.state === 'dead' && e.deadTimer > 2.5) {
        e.dispose();
        return false;
      }
      return true;
    });

    if (this.locked && this.enemies.every((e) => !e.alive)) {
      this.locked = false;
      this.waveIndex++;
    }
  }

  spawnWave(wave, cameraX) {
    this.world.sfx('rumble');
    const rand = THREE.MathUtils.randFloat;
    wave.enemies.forEach((id, i) => {
      const def = ENEMIES[id];
      const e = new Enemy(def, this.world);
      const x = def.boss ? cameraX + 5 : cameraX + (i % 2 === 0 ? rand(2, 6.5) : rand(-6.5, -2));
      const z = def.boss ? 0 : rand(LANE_MIN_Z + 0.5, LANE_MAX_Z - 0.5);
      this.addCrack(x, z, def.size.w * 0.9);
      e.emergeAt(x, z);
      this.enemies.push(e);
    });
  }

  get complete() {
    return this.waveIndex >= this.def.waves.length;
  }

  get boss() {
    return this.enemies.find((e) => e.def.boss);
  }
}
