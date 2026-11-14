import * as THREE from 'three';
import { Fighter } from './Fighter.js';
import { MOVES } from '../data/moves.js';

// Enemy AI: climb out of a crack, walk up to the hero, attack sometimes.
// Enemies with a projectile attack will shoot from far away.
export class Enemy extends Fighter {
  constructor(def, world) {
    super(def, world);
    this.team = 'enemy';
    this.thinkTimer = 0.5 + Math.random();
    this.zOffset = (Math.random() - 0.5) * 0.6; // so they don't all stand in one spot
    this.melee = def.attacks.filter((id) => !MOVES[id].projectile);
    this.ranged = def.attacks.filter((id) => MOVES[id].projectile);
    this.meleeRange = Math.max(1, ...this.melee.map((id) => MOVES[id].range));
    // Bosses get the big bar at the top of the screen instead.
    if (!def.boss) this.hpBar = makeHpBar(def.size.h + 0.45);
    if (this.hpBar) this.group.add(this.hpBar);
  }

  syncMesh() {
    super.syncMesh();
    if (!this.hpBar) return;
    const ratio = this.hp / this.def.maxHp;
    const fill = this.hpBar.userData.fill;
    fill.scale.x = Math.max(0.001, ratio);
    fill.material.color.setHex(ratio > 0.5 ? 0x33dd33 : ratio > 0.25 ? 0xffcc00 : 0xff3333);
    this.hpBar.visible = this.hittable;
  }

  emergeAt(x, z) {
    this.pos.set(x, -this.def.size.h, z);
    this.state = 'emerge';
    this.syncMesh();
  }

  update(dt) {
    if (this.state === 'emerge') {
      this.pos.y = Math.min(0, this.pos.y + (this.def.size.h / 0.9) * dt);
      if (this.pos.y >= 0) this.state = 'idle';
      this.syncMesh();
      return;
    }
    super.update(dt);
  }

  think(player, dt) {
    if (this.busy) return;
    if (this.tryDodge(player)) return;
    if (!player.alive) {
      this.state = 'idle';
      return;
    }
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z + this.zOffset - this.pos.z;
    // Slow turners (like the boss) take a moment to turn around,
    // so you can sneak behind them.
    const wantFacing = Math.sign(dx) || this.facing;
    if (this.def.turnDelay && wantFacing !== this.facing) {
      this.turnTimer = (this.turnTimer ?? 0) + dt;
      if (this.turnTimer < this.def.turnDelay) {
        this.state = 'idle';
        return;
      }
    }
    this.turnTimer = 0;
    this.facing = wantFacing;
    const inMelee = Math.abs(dx) < this.meleeRange + player.def.size.w / 2 && Math.abs(dz) < 0.5;

    this.thinkTimer -= dt;
    if (this.thinkTimer <= 0) {
      this.thinkTimer = 0.5 + Math.random() * 0.7;
      if (Math.random() < this.def.aggression) {
        if (inMelee && this.melee.length) return this.startAttack(pick(this.melee));
        if (this.ranged.length && Math.abs(dx) > 3) return this.startAttack(pick(this.ranged));
      }
    }

    if (inMelee) {
      this.state = 'idle';
      return;
    }
    const mx = Math.abs(dx) > this.meleeRange * 0.8 ? Math.sign(dx) : 0;
    const mz = Math.abs(dz) > 0.2 ? Math.sign(dz) : 0;
    this.move(mx, mz, dt);
    this.facing = Math.sign(dx) || this.facing;
  }

  // Agile enemies (def.dodge = chance 0..1) hop backwards when the hero
  // starts an attack close to them.
  tryDodge(player) {
    if (!this.def.dodge || !this.onGround || player.attack === this.lastSeenAttack) return false;
    this.lastSeenAttack = player.attack;
    if (!player.attack) return false;
    const dx = player.pos.x - this.pos.x;
    if (Math.abs(dx) > 2.5 || Math.abs(player.pos.z - this.pos.z) > 0.8 || Math.random() > this.def.dodge) return false;
    this.velY = 6;
    this.knockVel = -Math.sign(dx || 1) * 7;
    this.world.sfx('jump');
    return true;
  }
}

// Small health bar that floats above an enemy's head.
const BAR_WIDTH = 0.9;
function makeHpBar(height) {
  const bar = new THREE.Group();
  const layer = (w, h, color, order) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, depthTest: false }),
    );
    m.renderOrder = order; // always draw on top of the scenery
    return m;
  };
  const border = layer(BAR_WIDTH + 0.08, 0.18, 0x000000, 10);
  const empty = layer(BAR_WIDTH, 0.1, 0x551111, 11);
  // Shift the fill so it shrinks from the right, not from the middle
  const fill = layer(BAR_WIDTH, 0.1, 0x33dd33, 12);
  fill.geometry.translate(BAR_WIDTH / 2, 0, 0);
  fill.position.x = -BAR_WIDTH / 2;
  bar.add(border, empty, fill);
  bar.position.y = height;
  bar.userData.fill = fill;
  return bar;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
