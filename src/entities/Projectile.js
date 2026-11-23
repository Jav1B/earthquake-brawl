import * as THREE from 'three';

// Fire spit, sleep arrows, missiles, trays... anything that flies.
const BOOMERANG_TURN_TIME = 0.75; // seconds before a boomerang flies back
export class Projectile {
  // `dir` = flying direction on the ground ({ x, z }); default: straight ahead
  constructor(owner, move, target, scene, dir = { x: owner.facing, z: 0 }) {
    const p = move.projectile;
    this.owner = owner;
    this.team = owner.team;
    this.move = move;
    this.size = p.size;
    this.life = p.life;
    this.scene = scene;
    this.dead = false;
    this.boomerang = !!p.boomerang;
    this.returning = false;
    this.age = 0;
    this.hitCooldown = 0; // a boomerang can hit again on the way back

    this.pos = owner.pos.clone().add(new THREE.Vector3(dir.x * (owner.def.size.w / 2 + 0.2), 0.8, dir.z * 0.4));
    this.vel = new THREE.Vector3(dir.x * p.speed, 0, dir.z * p.speed);
    // Aimed projectiles steer toward the target's lane.
    if (p.aimZ && target && dir.z === 0) {
      const travelTime = Math.max(0.1, Math.abs(target.pos.x - this.pos.x) / p.speed);
      this.vel.z = THREE.MathUtils.clamp((target.pos.z - this.pos.z) / travelTime, -4, 4);
    }

    const glow = p.shape === 'tray' ? 0.1 : p.shape === 'energy' || p.shape === 'ghost' ? 1 : 0.6;
    const material = new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: glow, metalness: p.shape === 'tray' ? 0.6 : 0 });
    const geometry =
      p.shape === 'arrow' ? new THREE.BoxGeometry(0.7, 0.05, 0.05)
      : p.shape === 'missile' ? new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8).rotateZ(Math.PI / 2)
      : p.shape === 'ice' ? new THREE.OctahedronGeometry(p.size, 0)
      : p.shape === 'tray' ? new THREE.CylinderGeometry(p.size, p.size, 0.04, 20)
      : new THREE.SphereGeometry(p.size, 12, 8);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  update(dt) {
    this.age += dt;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.boomerang) this.steerBack();
    this.pos.addScaledVector(this.vel, dt);
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = -Math.atan2(this.vel.z, this.vel.x);
    const shape = this.move.projectile.shape;
    if (shape === 'ice') this.mesh.rotation.x += dt * 10; // tumbling ice chunk
    if (shape === 'tray') this.mesh.rotation.set(0.25, this.age * 25, 0); // spinning tray
    if (shape === 'energy') this.mesh.scale.setScalar(0.85 + Math.random() * 0.3); // crackling energy
    if (shape === 'ghost') this.mesh.scale.setScalar(1 + Math.sin(this.age * 25) * 0.2); // pulsing ghost ball
  }

  // Boomerangs fly out, then turn around and home back to the thrower.
  steerBack() {
    if (!this.returning && this.age > BOOMERANG_TURN_TIME) this.returning = true;
    if (!this.returning) return;
    if (!this.owner.alive) {
      this.dead = true;
      return;
    }
    const home = this.owner.pos.clone().add(new THREE.Vector3(0, 0.8, 0));
    const toHome = home.sub(this.pos);
    if (toHome.length() < 0.5) this.dead = true;
    this.vel.copy(toHome.setLength(this.move.projectile.speed * 1.1));
  }

  // Called when it hits someone: boomerangs bounce back, others disappear.
  onHit() {
    if (this.boomerang && !this.returning) {
      this.returning = true;
      this.hitCooldown = 0.4;
    } else {
      this.dead = true;
    }
  }

  hits(f) {
    if (this.hitCooldown > 0) return false;
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
