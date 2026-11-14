import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { ENEMIES } from '../data/enemies.js';
import { LANE_MIN_Z, LANE_MAX_Z } from '../entities/Fighter.js';
import { buildProp } from '../entities/models.js';

const PUDDLE_SIZE = { x: 2.2, z: 1.1 }; // soy sauce spill radius along x and z

// A soy sauce barrel. It has `pos`, `def.size` and `takeHit` like a fighter,
// so the normal attack code can hit it.
class Barrel {
  constructor(x, z, level) {
    this.level = level;
    this.isProp = true;
    this.broken = false;
    this.pos = new THREE.Vector3(x, 0, z);
    this.def = { size: { w: 0.7, h: 0.9 } };
    this.mesh = buildProp('soyBarrel');
    this.mesh.position.copy(this.pos);
    this.mesh.traverse((o) => o.isMesh && !o.userData.isOutline && (o.castShadow = true));
    level.scene.add(this.mesh);
  }
  get hittable() { return !this.broken; }
  get alive() { return !this.broken; }
  takeHit() {
    if (this.broken) return false;
    this.broken = true;
    this.level.breakBarrel(this);
    return true;
  }
}

const WAVE_CLEAR_HEAL = 0.25; // fraction of max HP restored after each wave

// Builds the scenery for a level and spawns enemy waves out of
// earthquake cracks as the hero moves forward.
export class Level {
  constructor(def, world) {
    this.def = def;
    this.world = world;
    this.scene = world.scene;
    this.enemies = [];
    this.waveIndex = 0;
    // The boss is the final wave, near the end of the level.
    this.waves = def.boss ? [...def.waves, { x: def.length - 4, enemies: [def.boss] }] : def.waves;
    this.locked = false; // screen stops scrolling during a fight
    this.puddles = [];
    this.debris = [];

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
      new THREE.MeshStandardMaterial({ color: def.pathColor ?? 0x7a5c3a }),
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(def.length / 2, 0.005, 0);
    path.receiveShadow = true;
    this.scene.add(path);

    if (def.theme === 'forest') this.buildForest();
    if (def.theme === 'sushi') this.buildSushiMountains();
    this.barrels = (def.barrels ?? []).map((b) => new Barrel(b.x, b.z, this));
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

  buildSushiMountains() {
    const rand = THREE.MathUtils.randFloat;
    const place = (name, x, z, scale = 1) => {
      const p = buildProp(name);
      p.position.set(x, 0, z);
      p.scale.setScalar(scale);
      this.scene.add(p);
      return p;
    };
    // Snowy mountains far away on both sides of the valley
    for (let x = -30; x < this.def.length + 40; x += rand(12, 18)) place('mountain', x, rand(-38, -30), rand(0.8, 1.4));
    // Sushi restaurants all along the path
    for (let x = -6; x < this.def.length + 15; x += rand(9, 12)) place('restaurant', x, -6.5);
    // Cherry blossom trees between them
    for (let x = -2; x < this.def.length + 15; x += rand(5, 8)) place('sakura', x, rand(-5.2, -4.4), rand(0.8, 1.1));
    for (let x = -10; x < this.def.length + 20; x += rand(4, 7)) place('sakura', x, rand(-12, -9), rand(1.2, 1.6));
    // Red gates at the start and before the boss
    place('torii', -2, -4);
    place('torii', this.def.length - 10, -4);
  }

  // Breaking a barrel: wooden pieces fly and soy sauce spills.
  breakBarrel(barrel) {
    this.scene.remove(barrel.mesh);
    this.world.sfx('crash');
    const rand = THREE.MathUtils.randFloat;
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    for (let i = 0; i < 8; i++) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.05), woodMat);
      piece.position.copy(barrel.pos).add(new THREE.Vector3(0, 0.5, 0));
      this.scene.add(piece);
      this.debris.push({ mesh: piece, vel: new THREE.Vector3(rand(-3, 3), rand(3, 6), rand(-2, 2)), t: 0 });
    }
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshStandardMaterial({ color: 0x6b3412, emissive: 0x2a1004, roughness: 0.05, metalness: 0.3 }),
    );
    // A shiny highlight so it looks wet
    const shine = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), new THREE.MeshBasicMaterial({ color: 0xc08050, transparent: true, opacity: 0.6 }));
    shine.position.set(-0.3, 0.2, 0.001);
    shine.scale.set(1, 0.4, 1);
    puddle.add(shine);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(barrel.pos.x, 0.015, barrel.pos.z);
    puddle.scale.set(0.01, 0.01, 1);
    puddle.receiveShadow = true;
    this.scene.add(puddle);
    this.puddles.push({ x: barrel.pos.x, z: barrel.pos.z, grow: 0, mesh: puddle });
  }

  // Is this spot on spilled soy sauce?
  isOnSoy(pos) {
    return this.puddles.some((p) => {
      const dx = (pos.x - p.x) / (PUDDLE_SIZE.x * p.grow);
      const dz = (pos.z - p.z) / (PUDDLE_SIZE.z * p.grow);
      return p.grow > 0.2 && dx * dx + dz * dz < 1;
    });
  }

  updateProps(dt) {
    for (const p of this.puddles) {
      p.grow = Math.min(1, p.grow + dt * 2.5);
      p.mesh.scale.set(PUDDLE_SIZE.x * p.grow, PUDDLE_SIZE.z * p.grow, 1);
    }
    for (const d of this.debris) {
      d.t += dt;
      d.vel.y -= 20 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += dt * 8;
      d.mesh.rotation.z += dt * 6;
      if (d.mesh.position.y < 0.05) {
        d.mesh.position.y = 0.05;
        d.vel.set(0, 0, 0);
      }
    }
    // Pieces disappear after a while
    this.debris = this.debris.filter((d) => (d.t > 3 ? (this.scene.remove(d.mesh), false) : true));
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
    this.updateProps(dt);
    const wave = this.waves[this.waveIndex];
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
      // Reward for clearing a wave: heal a bit
      if (player.alive && player.hp < player.def.maxHp) {
        player.hp = Math.min(player.def.maxHp, player.hp + player.def.maxHp * WAVE_CLEAR_HEAL);
        this.world.sfx('heal');
      }
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
    return this.waveIndex >= this.waves.length;
  }

  get boss() {
    return this.enemies.find((e) => e.def.boss);
  }
}
