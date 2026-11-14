import * as THREE from 'three';

// Fire spit, sleep arrows, missiles... anything that flies.
export class Projectile {
  constructor(owner, move, target, scene) {
    const p = move.projectile;
    this.owner = owner;
    this.team = owner.team;
    this.move = move;
    this.size = p.size;
    this.life = p.life;
    this.scene = scene;
    this.dead = false;

    this.pos = owner.pos.clone().add(new THREE.Vector3(owner.facing * (owner.def.size.w / 2 + 0.2), 0.8, 0));
    this.vel = new THREE.Vector3(owner.facing * p.speed, 0, 0);
    // Aimed projectiles steer toward the target's lane.
    if (p.aimZ && target) {
      const travelTime = Math.max(0.1, Math.abs(target.pos.x - this.pos.x) / p.speed);
      this.vel.z = THREE.MathUtils.clamp((target.pos.z - this.pos.z) / travelTime, -4, 4);
    }

    const material = new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.6 });
    const geometry =
      p.shape === 'arrow' ? new THREE.BoxGeometry(0.7, 0.05, 0.05)
      : p.shape === 'missile' ? new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8).rotateZ(Math.PI / 2)
      : new THREE.SphereGeometry(p.size, 12, 8);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  update(dt) {
    this.pos.addScaledVector(this.vel, dt);
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = -Math.atan2(this.vel.z, this.vel.x);
  }

  hits(f) {
    return (
      f.hittable &&
      Math.abs(f.pos.x - this.pos.x) < f.def.size.w / 2 + this.size &&
      Math.abs(f.pos.z - this.pos.z) < 0.6 &&
      this.pos.y > f.pos.y &&
      this.pos.y < f.pos.y + f.def.size.h
    );
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}
