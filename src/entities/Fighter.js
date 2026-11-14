import * as THREE from 'three';
import { MOVES } from '../data/moves.js';
import { buildModel } from './models.js';

const GRAVITY = 20;
const BURN_DAMAGE_PER_SEC = 3;
const BURN_TIME = 3;
export const LANE_MIN_Z = -2.5; // how far "into" the screen fighters can walk
export const LANE_MAX_Z = 2.5;

// Shared base for heroes and enemies: position, health, jumping,
// attacking, getting hit, status effects (burn, sleep) and shields.
export class Fighter {
  constructor(def, world) {
    this.def = def;
    this.world = world;
    this.team = 'player';
    this.hp = def.maxHp;
    this.pos = new THREE.Vector3();
    this.velY = 0;
    this.facing = 1;
    this.state = 'idle'; // idle | walk | attack | hurt | sleep | emerge | dead
    this.attack = null; // { move, t, hasHit, fired }
    this.hurtTimer = 0;
    this.knockVel = 0;
    this.burnTimer = 0;
    this.sleepTimer = 0;
    this.deadTimer = 0;
    this.animTime = 0;
    this.shieldUp = !!def.shield;
    this.shieldTimer = def.shield?.up ?? 0;
    this.shieldFlash = 0;

    const model = buildModel(def.model, def);
    this.visual = model.root;
    this.weapons = model.weapons;
    this.shieldMesh = model.shield ?? null;
    this.group = new THREE.Group();
    this.group.add(this.visual);

    // Give each fighter its own materials so hit flashes don't affect others.
    this.materials = [];
    this.visual.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      if (o.userData.noFlash) return;
      o.material = o.material.clone();
      o.material.userData.baseEmissive = o.material.emissive.getHex();
      this.materials.push(o.material);
    });
    world.scene.add(this.group);
  }

  get onGround() { return this.pos.y <= 0; }
  get alive() { return this.state !== 'dead'; }
  get hittable() { return this.alive && this.state !== 'emerge'; }
  get busy() { return ['attack', 'hurt', 'sleep', 'emerge', 'dead'].includes(this.state); }

  move(dx, dz, dt) {
    if (this.busy) return;
    this.pos.x += dx * this.def.speed * dt;
    this.pos.z = THREE.MathUtils.clamp(this.pos.z + dz * this.def.speed * 0.6 * dt, LANE_MIN_Z, LANE_MAX_Z);
    if (dx !== 0) this.facing = Math.sign(dx);
    this.state = dx || dz ? 'walk' : 'idle';
  }

  jump() {
    if (this.busy || !this.onGround) return;
    this.velY = this.def.jumpPower ?? 6;
    this.world.sfx('jump');
  }

  startAttack(moveId) {
    if (this.busy) return;
    this.state = 'attack';
    this.attack = { move: MOVES[moveId], t: 0, hasHit: false, fired: false };
    this.world.sfx(this.attack.move.sound ?? 'swing');
  }

  // Returns the melee attack if it can hit this frame, otherwise null.
  activeAttack() {
    const a = this.attack;
    if (!a || a.hasHit || a.move.projectile) return null;
    const { startup, active } = a.move;
    return a.t >= startup && a.t < startup + active ? a : null;
  }

  // True if `other` is inside this fighter's attack range.
  canHit(other, move) {
    const dx = (other.pos.x - this.pos.x) * this.facing;
    const reach = move.range + other.def.size.w / 2;
    const inReach = move.bothSides ? Math.abs(dx) < reach : dx > -0.2 && dx < reach;
    return inReach && Math.abs(other.pos.z - this.pos.z) < 0.7 && Math.abs(other.pos.y - this.pos.y) < 1.2;
  }

  // Returns true if the hit landed, false if it was blocked or ignored.
  takeHit(move, fromX) {
    if (!this.hittable) return false;
    const fromFront = Math.sign(fromX - this.pos.x) === this.facing;
    if (this.shieldUp && fromFront) {
      this.shieldFlash = 0.15;
      return false;
    }
    this.hp = Math.max(0, this.hp - move.damage);
    this.knockVel = Math.sign(this.pos.x - fromX || 1) * (move.knockback ?? 0) * 6 * (this.def.boss ? 0.3 : 1);
    if (move.effect === 'burn') this.burnTimer = BURN_TIME;
    this.attack = null;
    if (this.hp <= 0) {
      this.die();
    } else if (move.effect === 'sleep') {
      this.state = 'sleep';
      this.sleepTimer = this.def.boss ? 1 : 3.5;
    } else {
      this.state = 'hurt';
      this.hurtTimer = this.def.boss ? 0.12 : 0.3;
    }
    return true;
  }

  die() {
    this.state = 'dead';
    this.attack = null;
    this.burnTimer = 0;
    this.deadTimer = 0;
  }

  update(dt) {
    this.animTime += dt;

    // Gravity / jumping
    if (this.pos.y > 0 || this.velY > 0) {
      this.velY -= GRAVITY * dt;
      this.pos.y = Math.max(0, this.pos.y + this.velY * dt);
      if (this.pos.y === 0) this.velY = 0;
    }
    // Knockback slides to a stop
    this.pos.x += this.knockVel * dt;
    this.knockVel *= Math.pow(0.001, dt);

    // Burning: damage over time
    if (this.burnTimer > 0 && this.alive) {
      this.burnTimer -= dt;
      this.hp = Math.max(0, this.hp - BURN_DAMAGE_PER_SEC * dt);
      if (this.hp <= 0) this.die();
    }

    // Shield turns on and off
    if (this.def.shield && this.alive) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldUp = !this.shieldUp;
        this.shieldTimer = this.shieldUp ? this.def.shield.up : this.def.shield.down;
      }
    }
    this.shieldFlash = Math.max(0, this.shieldFlash - dt);

    switch (this.state) {
      case 'attack': this.updateAttack(dt); break;
      case 'hurt': if ((this.hurtTimer -= dt) <= 0) this.state = 'idle'; break;
      case 'sleep': if ((this.sleepTimer -= dt) <= 0) this.state = 'idle'; break;
      case 'dead': this.deadTimer += dt; break;
    }

    this.syncMesh();
  }

  updateAttack(dt) {
    const a = this.attack;
    const m = a.move;
    a.t += dt;
    if (m.projectile && !a.fired && a.t >= m.startup) {
      a.fired = true;
      this.world.spawnProjectile(this, m);
    }
    if (m.lunge && a.t >= m.startup && a.t < m.startup + m.active) {
      this.pos.x += this.facing * (m.lunge / m.active) * dt;
    }
    if (a.t >= m.startup + m.active + m.recovery) {
      this.attack = null;
      this.state = 'idle';
    }
  }

  // Weapon angle during an attack: wind back, swing forward, return.
  weaponAngle() {
    const a = this.attack;
    if (!a) return 0;
    const { startup, active, recovery } = a.move;
    if (a.t < startup) return 0.8 * (a.t / startup);
    if (a.t < startup + active) return 0.8 - 2.4 * ((a.t - startup) / active);
    return -1.6 * Math.max(0, 1 - (a.t - startup - active) / recovery);
  }

  syncMesh() {
    this.group.position.copy(this.pos);
    this.visual.scale.x = this.facing;

    const swing = this.weaponAngle();
    for (const w of this.weapons) w.rotation.z = swing * (w.userData.swingScale ?? 1);

    // Spin attacks rotate the whole body
    const a = this.attack;
    const spinning = a?.move.bothSides && a.t >= a.move.startup && a.t < a.move.startup + a.move.active;
    this.visual.rotation.y = spinning ? ((a.t - a.move.startup) / a.move.active) * Math.PI * 2 : 0;

    // Little bounce while walking
    this.visual.position.y = this.state === 'walk' ? Math.abs(Math.sin(this.animTime * 12)) * 0.08 : 0;

    // Fall over when asleep or dead, then sink into the ground
    const tilt = this.state === 'dead' ? Math.PI / 2 : this.state === 'sleep' ? 0.35 : 0;
    this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, tilt, 0.2);
    if (this.state === 'dead' && this.deadTimer > 1) this.visual.position.y = -(this.deadTimer - 1) * 1.5;

    const flashing = this.state === 'hurt' && Math.floor(this.hurtTimer * 20) % 2 === 0;
    const burning = this.burnTimer > 0 && Math.floor(this.animTime * 10) % 2 === 0;
    for (const m of this.materials) {
      m.emissive.setHex(
        flashing ? 0xffffff
          : burning ? 0xff4400
          : this.state === 'sleep' ? 0x223366
          : m.userData.baseEmissive,
      );
    }

    if (this.shieldMesh) {
      this.shieldMesh.visible = this.shieldUp && this.alive;
      this.shieldMesh.material.opacity = this.shieldFlash > 0 ? 0.8 : 0.35;
    }
  }

  dispose() {
    this.world.scene.remove(this.group);
  }
}
