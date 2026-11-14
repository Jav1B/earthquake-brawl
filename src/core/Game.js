import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { Projectile } from '../entities/Projectile.js';
import { Level } from '../levels/Level.js';
import { CHARACTERS } from '../data/characters.js';
import { LEVELS } from '../data/levels.js';

const VIEW_HALF_WIDTH = 8; // how far the hero can walk from the screen center

// One play-through: a hero, a level, enemies, projectiles and hit effects.
export class Game {
  // `sound` is optional so the game can also run without audio (in tests).
  constructor(scene, heroId, sound = null) {
    this.scene = scene;
    this.sound = sound;
    this.projectiles = [];
    this.sparks = [];
    this.cameraX = 0;
    this.result = null; // null while playing, then 'win' or 'lose'
    this.player = new Player(CHARACTERS[heroId], this);
    this.level = new Level(LEVELS[0], this);
  }

  get enemies() {
    return this.level.enemies;
  }

  spawnProjectile(owner, move) {
    const target = owner.team === 'player' ? null : this.player;
    this.projectiles.push(new Projectile(owner, move, target, this.scene));
  }

  sfx(name) {
    this.sound?.play(name);
  }

  // Hit spark + sound. `landed` is false when a shield blocked it.
  hitFeedback(target, landed) {
    this.spark(target, !landed);
    this.sfx(!landed ? 'block' : !target.alive ? 'ko' : target.team === 'player' ? 'hurt' : 'hit');
  }

  // Little burst where a hit lands (yellow = hit, blue = blocked by a shield).
  spark(target, blocked) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 6),
      new THREE.MeshBasicMaterial({ color: blocked ? 0x66ccff : 0xffee88, transparent: true }),
    );
    mesh.position.copy(target.pos).add(new THREE.Vector3(0, target.def.size.h * 0.6, 0.5));
    this.scene.add(mesh);
    this.sparks.push({ mesh, t: 0 });
  }

  meleeHits(attacker, targets) {
    const atk = attacker.activeAttack();
    if (!atk) return;
    for (const t of targets) {
      if (t.hittable && attacker.canHit(t, atk.move)) {
        this.hitFeedback(t, t.takeHit(atk.move, attacker.pos.x));
        atk.hasHit = true;
      }
    }
  }

  update(dt, input) {
    const p = this.player;
    if (p.alive && !this.result) p.handleInput(input, dt);
    this.level.update(p, this.cameraX, dt);

    p.update(dt);
    for (const e of this.enemies) e.update(dt);

    this.meleeHits(p, this.enemies);
    for (const e of this.enemies) this.meleeHits(e, [p]);

    for (const proj of this.projectiles) {
      proj.update(dt);
      const targets = proj.team === 'player' ? this.enemies : [p];
      for (const t of targets) {
        if (!proj.dead && proj.hits(t)) {
          this.hitFeedback(t, t.takeHit(proj.move, proj.pos.x - Math.sign(proj.vel.x)));
          proj.dead = true;
        }
      }
    }
    this.projectiles = this.projectiles.filter((proj) => (proj.dead ? (proj.dispose(), false) : true));

    for (const s of this.sparks) {
      s.t += dt;
      s.mesh.scale.setScalar(1 + s.t * 12);
      s.mesh.material.opacity = 1 - s.t / 0.2;
    }
    this.sparks = this.sparks.filter((s) => (s.t > 0.2 ? (this.scene.remove(s.mesh), false) : true));

    // Camera follows the hero but never goes backwards, and stops during fights.
    if (!this.level.locked) this.cameraX = Math.max(this.cameraX, Math.min(p.pos.x, this.level.def.length));
    p.pos.x = THREE.MathUtils.clamp(p.pos.x, this.cameraX - VIEW_HALF_WIDTH, this.cameraX + VIEW_HALF_WIDTH);
    p.syncMesh();

    if (!this.result) {
      if (!p.alive && p.deadTimer > 1) this.result = 'lose';
      else if (this.level.complete) this.result = 'win';
    }
  }
}
