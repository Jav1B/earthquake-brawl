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
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
