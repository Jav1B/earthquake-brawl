import * as THREE from 'three';
import { MOVES } from '../data/moves.js';
import { buildModel } from './models.js';

const GRAVITY = 20;
const BURN_DAMAGE_PER_SEC = 3;
const BURN_TIME = 3;
const FREEZE_TIME = 2.5;
const FREEZE_SLOWDOWN = 0.45; // frozen fighters move at 45% speed
const SOY_FRICTION = 0.5; // on soy sauce you keep 50% of your sliding speed per second
const FOG_SLOWDOWN = 0.4; // enemies in Phantominus' fog walk at 40% speed
export const STUN_TIME = 1.5; // enemies that slide across soy fall down for this long
export const LANE_MIN_Z = -2.5; // how far "into" the screen fighters can walk
export const LANE_MAX_Z = 2.5;

// Shared base for heroes and enemies: position, health, jumping,
// attacking, getting hit, status effects (burn, sleep) and shields.
export class Fighter {
  constructor(def, world) {
    this.def = def;
    this.world = world;
    this.team = 'player';
    this.invincible = false; // god mode: hits still land, but no HP is lost
    this.hp = def.maxHp;
    this.pos = new THREE.Vector3();
    this.velY = 0;
    this.facing = 1;
    this.state = 'idle'; // idle | walk | attack | hurt | sleep | emerge | slide | stun | dead
    this.attack = null; // { move, t, hasHit, fired }
    this.hurtTimer = 0;
    this.knockVel = 0;
    this.burnTimer = 0;
    this.sleepTimer = 0;
    this.freezeTimer = 0;
    this.walkPhase = 0;
    this.onSoy = false; // standing on spilled soy sauce (set by Game every frame)
    this.slideVel = new THREE.Vector2(); // x/z sliding speed on soy
    this.stunTimer = 0;
    this.inFog = false; // inside an enemy's fog cloud (set by Game every frame)
    this.stillTime = 0; // seconds the hero has been standing still (set by Game)
    this.bowTimer = 0;
    this.bowCooldown = 0;
    this.pulse = 0; // short 'gulp' grow effect
    this.phaseFlash = 0; // a melee attack just passed through a ghost
    this.deadTimer = 0;
    this.animTime = 0;
    this.shieldUp = !!def.shield;
    this.shieldTimer = def.shield?.up ?? 0;
    this.shieldFlash = 0;

    const model = buildModel(def.model, def);
    this.visual = model.root;
    this.weapons = model.weapons;
    this.legs = model.legs ?? [];
    this.arms = model.arms ?? [];
    this.floats = !!model.floats;
    this.shieldMesh = model.shield ?? null;
    this.group = new THREE.Group();
    this.group.add(this.visual);

    // Give each fighter its own materials so hit flashes don't affect others.
    this.materials = [];
    this.flickers = [];
    this.visual.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = !o.userData.isOutline;
      if (o.userData.flicker) this.flickers.push(o);
      if (o.userData.noFlash) return;
      o.material = o.material.clone();
      o.material.userData.baseEmissive = o.material.emissive.getHex();
      o.material.userData.baseOpacity = o.material.opacity;
      this.materials.push(o.material);
    });
    world.scene.add(this.group);
  }

  get onGround() { return this.pos.y <= 0; }
  get alive() { return this.state !== 'dead'; }
  get hittable() { return this.alive && this.state !== 'emerge'; }
  get busy() { return ['attack', 'hurt', 'sleep', 'emerge', 'slide', 'stun', 'bow', 'dead'].includes(this.state); }

  move(dx, dz, dt) {
    if (this.busy) return;
    const speed = this.def.speed * (this.freezeTimer > 0 ? FREEZE_SLOWDOWN : 1) * (this.inFog ? FOG_SLOWDOWN : 1);
    if (this.onSoy) {
      // Slippery! Pressing a direction only pushes you; you keep sliding.
      this.slideVel.x += dx * speed * 3 * dt;
      this.slideVel.y += dz * speed * 1.8 * dt;
      this.slideVel.clampLength(0, speed * 1.4);
      if (dx !== 0) this.facing = Math.sign(dx);
      this.state = dx || dz ? 'walk' : 'idle';
      if (dx || dz) this.walkPhase += speed * 2.6 * dt;
      return;
    }
    this.pos.x += dx * speed * dt;
    this.pos.z = THREE.MathUtils.clamp(this.pos.z + dz * speed * 0.6 * dt, LANE_MIN_Z, LANE_MAX_Z);
    if (dx || dz) this.walkPhase += speed * 2.6 * dt;
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
    if (!this.invincible) this.hp = Math.max(0, this.hp - move.damage);
    this.knockVel = Math.sign(this.pos.x - fromX || 1) * (move.knockback ?? 0) * 6 * (this.def.boss ? 0.3 : 1);
    if (move.effect === 'burn') this.burnTimer = BURN_TIME;
    if (move.effect === 'freeze') this.freezeTimer = FREEZE_TIME;
    this.attack = null;
    if (this.hp <= 0) {
      this.die();
    } else if (this.state === 'stun' || this.state === 'slide' || this.state === 'bow') {
      // Knocked down or bowing: take the damage but don't get interrupted
      this.knockVel = 0;
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

    // Sliding on soy sauce
    if (this.onSoy) {
      this.pos.x += this.slideVel.x * dt;
      this.pos.z = THREE.MathUtils.clamp(this.pos.z + this.slideVel.y * dt, LANE_MIN_Z, LANE_MAX_Z);
      this.slideVel.multiplyScalar(Math.pow(SOY_FRICTION, dt));
    } else {
      this.slideVel.set(0, 0);
    }
    this.pulse = Math.max(0, this.pulse - dt);
    this.phaseFlash = Math.max(0, this.phaseFlash - dt);

    // Burning: damage over time
    if (this.burnTimer > 0 && this.alive) {
      this.burnTimer -= dt;
      if (!this.invincible) this.hp = Math.max(0, this.hp - BURN_DAMAGE_PER_SEC * dt);
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
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);

    switch (this.state) {
      case 'attack': this.updateAttack(dt); break;
      case 'hurt': if ((this.hurtTimer -= dt) <= 0) this.state = 'idle'; break;
      case 'sleep': if ((this.sleepTimer -= dt) <= 0) this.state = 'idle'; break;
      case 'stun': if ((this.stunTimer -= dt) <= 0) this.state = 'idle'; break;
      case 'bow':
        if ((this.bowTimer -= dt) <= 0) {
          this.state = 'idle';
          this.bowCooldown = this.def.bowWhenStill.still; // must wait again before the next bow
        }
        break;
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
    if (m.fog && !a.fogged && a.t >= m.startup) {
      a.fogged = true;
      this.world.spawnFog(this, m.fog);
    }
    if (m.lunge && a.t >= m.startup && a.t < m.startup + m.active) {
      this.pos.x += this.facing * (m.lunge / m.active) * dt;
    }
    if (a.t >= m.startup + m.active + m.recovery) {
      this.attack = null;
      this.state = 'idle';
    }
  }

  // Weapon angle during an attack: rest → wind up → strike → back to rest.
  weaponAngle(weapon) {
    const { rest, windup, strike, onlyFor } = weapon.userData.pose ?? { rest: 0, windup: 0.8, strike: -1.6 };
    const a = this.attack;
    if (!a) return rest;
    // Some weapons only move for one kind of attack (a kicking leg, casting arms)
    if (onlyFor && onlyFor !== (a.move.projectile ? 'projectile' : 'melee')) return rest;
    const { startup, active, recovery } = a.move;
    const lerp = THREE.MathUtils.lerp;
    if (a.t < startup) return lerp(rest, windup, a.t / startup);
    if (a.t < startup + active) return lerp(windup, strike, (a.t - startup) / active);
    return lerp(strike, rest, Math.min(1, (a.t - startup - active) / recovery));
  }

  syncMesh() {
    this.group.position.copy(this.pos);
    this.visual.scale.x = this.facing;

    for (const w of this.weapons) w.rotation.z = this.weaponAngle(w);

    // Legs and arms swing while walking, tuck in while jumping
    const walking = this.state === 'walk';
    const inAir = this.pos.y > 0.05;
    for (const leg of this.legs) {
      const target = inAir ? 0.5 * Math.cos(leg.userData.phase) : walking ? Math.sin(this.walkPhase + leg.userData.phase) * 0.6 : 0;
      leg.rotation.z = THREE.MathUtils.lerp(leg.rotation.z, target, 0.35);
    }
    for (const arm of this.arms) {
      const target = walking ? -Math.sin(this.walkPhase + arm.userData.phase) * 0.45 : 0;
      arm.rotation.z = THREE.MathUtils.lerp(arm.rotation.z, target, 0.3);
    }
    // Flames and glows wobble
    for (const f of this.flickers) f.scale.setScalar(0.8 + Math.random() * 0.4);

    // Spin attacks rotate the whole body
    const a = this.attack;
    const spinning = a?.move.bothSides && a.t >= a.move.startup && a.t < a.move.startup + a.move.active;
    this.visual.rotation.y = spinning ? ((a.t - a.move.startup) / a.move.active) * Math.PI * 2 : 0;

    // Little bounce while walking
    this.visual.position.y = this.floats
      ? 0.18 + Math.sin(this.animTime * 3) * 0.08 // ghosts hover
      : walking ? Math.abs(Math.sin(this.walkPhase)) * 0.06 : 0;

    // Fall over when asleep or dead, then sink into the ground
    const tilt =
      this.state === 'dead' || this.state === 'stun' ? Math.PI / 2
      : this.state === 'sleep' ? 0.35
      : this.state === 'slide' ? -0.4
      : this.state === 'bow' ? -0.75 * this.facing // bend forward politely
      : 0;
    this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, tilt, 0.2);
    if (this.state === 'dead' && this.deadTimer > 1) this.visual.position.y = -(this.deadTimer - 1) * 1.5;

    const flashing = this.state === 'hurt' && Math.floor(this.hurtTimer * 20) % 2 === 0;
    const burning = this.burnTimer > 0 && Math.floor(this.animTime * 10) % 2 === 0;
    // Something passed through a ghost: it fades out for a moment
    const fade = this.phaseFlash > 0 ? 0.35 : 1;
    for (const m of this.materials) {
      if (m.transparent) m.opacity = m.userData.baseOpacity * fade;
      m.emissive.setHex(
        flashing ? 0xffffff
          : burning ? 0xff4400
          : this.state === 'sleep' ? 0x223366
          : this.freezeTimer > 0 ? 0x1166aa
          : m.userData.baseEmissive,
      );
    }

    // Quick grow-and-shrink when swallowing something
    const grow = 1 + Math.sin((this.pulse / 0.3) * Math.PI) * 0.25;
    this.visual.scale.set(this.facing * grow, grow, grow);

    if (this.shieldMesh) {
      this.shieldMesh.visible = this.shieldUp && this.alive;
      this.shieldMesh.material.opacity = this.shieldFlash > 0 ? 0.8 : 0.35;
    }
  }

  dispose() {
    this.world.scene.remove(this.group);
  }
}
