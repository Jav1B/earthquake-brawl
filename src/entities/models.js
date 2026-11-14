import * as THREE from 'three';

// Placeholder 3D models built from simple shapes. Each builder returns:
//   root    – the model, standing on y = 0, facing +x
//   weapons – pivots that swing when attacking (pointing up at rest)
//   shield  – optional mesh shown while a shield is up
// Swap these for real models/sprites later without touching game logic.

const SKIN = 0xf1c27d;

function mat(color, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.7 });
}
function mesh(geo, color, x = 0, y = 0, z = 0, emissive) {
  const m = new THREE.Mesh(geo, mat(color, emissive));
  m.position.set(x, y, z);
  return m;
}
const box = (w, h, d, color, x, y, z, emissive) => mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, emissive);
const ball = (r, color, x, y, z, emissive) => mesh(new THREE.SphereGeometry(r, 12, 8), color, x, y, z, emissive);
const cyl = (r, h, color, x, y, z) => mesh(new THREE.CylinderGeometry(r, r, h, 8), color, x, y, z);
const cone = (r, h, color, x, y, z, emissive) => mesh(new THREE.ConeGeometry(r, h, 8), color, x, y, z, emissive);
function pivot(x, y, z, swingScale, ...children) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData.swingScale = swingScale;
  g.add(...children);
  return g;
}
function group(...children) {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}

const BUILDERS = {
  samurai() {
    const sword = pivot(0.25, 1.2, 0.32, 1,
      box(0.1, 0.3, 0.1, 0x333333, 0, 0.1, 0),
      box(0.18, 0.05, 0.18, 0xd4ac0d, 0, 0.27, 0),
      box(0.08, 1.1, 0.04, 0xff8833, 0, 0.85, 0, 0xff3300), // fire blade
    );
    const root = group(
      box(0.25, 0.8, 0.3, 0x222222, -0.15, 0.4, 0),
      box(0.25, 0.8, 0.3, 0x222222, 0.15, 0.4, 0),
      box(0.7, 0.75, 0.45, 0xc0392b, 0, 1.2, 0),
      box(0.9, 0.15, 0.5, 0x7b241c, 0, 1.55, 0),
      ball(0.22, SKIN, 0, 1.75, 0),
      box(0.5, 0.12, 0.5, 0x222222, 0, 1.93, 0),
      cone(0.08, 0.3, 0xd4ac0d, 0, 2.12, 0),
      sword,
    );
    return { root, weapons: [sword] };
  },

  rhino() {
    const head = pivot(0.6, 1.0, 0, 0.25,
      box(0.6, 0.5, 0.55, 0x9a9a9a, 0.3, 0, 0),
      cone(0.12, 0.45, 0xeeeedd, 0.55, 0.4, 0),
      cone(0.07, 0.2, 0xeeeedd, 0.3, 0.35, 0),
      ball(0.06, 0x111111, 0.4, 0.1, 0.25),
      ball(0.06, 0x111111, 0.4, 0.1, -0.25),
      ball(0.08, 0xff6600, 0.6, -0.15, 0, 0xff4400), // fire in the mouth
    );
    const root = group(
      box(1.4, 0.9, 0.9, 0x8e8e8e, -0.1, 0.9, 0),
      box(0.25, 0.5, 0.25, 0x6e6e6e, 0.4, 0.25, 0.3),
      box(0.25, 0.5, 0.25, 0x6e6e6e, 0.4, 0.25, -0.3),
      box(0.25, 0.5, 0.25, 0x6e6e6e, -0.5, 0.25, 0.3),
      box(0.25, 0.5, 0.25, 0x6e6e6e, -0.5, 0.25, -0.3),
      box(0.15, 0.3, 0.1, 0x6e6e6e, -0.85, 1.1, 0),
      head,
    );
    return { root, weapons: [head] };
  },

  hammerer() {
    const hammer = pivot(0.25, 1.15, 0.32, 1,
      cyl(0.05, 1.2, 0x8b5a2b, 0, 0.5, 0),
      box(0.55, 0.35, 0.35, 0x555555, 0, 1.1, 0),
    );
    const bow = mesh(new THREE.TorusGeometry(0.45, 0.03, 6, 16, Math.PI), 0x6b3e1f, -0.35, 1.15, 0);
    bow.rotation.z = Math.PI / 2;
    const root = group(
      box(0.24, 0.8, 0.28, 0x1b4f72, -0.14, 0.4, 0),
      box(0.24, 0.8, 0.28, 0x1b4f72, 0.14, 0.4, 0),
      box(0.62, 0.75, 0.4, 0x2e86de, 0, 1.2, 0),
      box(0.66, 0.1, 0.44, 0x6b3e1f, 0, 0.88, 0),
      ball(0.22, SKIN, 0, 1.75, 0),
      box(0.46, 0.15, 0.46, 0x5d3a1a, -0.02, 1.92, 0),
      bow,
      hammer,
    );
    return { root, weapons: [hammer] };
  },

  gnome() {
    const axe = (z, s) => pivot(0.15, 0.55, z, s,
      box(0.05, 0.55, 0.05, 0x8b5a2b, 0, 0.25, 0),
      box(0.25, 0.22, 0.04, 0xcccccc, 0.1, 0.48, 0),
    );
    const front = axe(0.3, 1);
    const back = axe(-0.3, 0.8);
    const beard = cone(0.18, 0.35, 0xffffff, 0.1, 0.62, 0);
    beard.rotation.x = Math.PI;
    const root = group(
      box(0.18, 0.3, 0.2, 0x5d3a1a, -0.1, 0.15, 0),
      box(0.18, 0.3, 0.2, 0x5d3a1a, 0.1, 0.15, 0),
      box(0.5, 0.45, 0.4, 0x27ae60, 0, 0.52, 0),
      ball(0.17, SKIN, 0, 0.87, 0),
      beard,
      cone(0.22, 0.5, 0xc0392b, 0, 1.2, 0),
      front,
      back,
    );
    return { root, weapons: [front, back] };
  },

  crawler() {
    const claw = pivot(0.35, 0.75, 0.33, 1, box(0.12, 0.5, 0.12, 0x2c1338, 0, 0.25, 0));
    const body = box(0.9, 0.8, 0.6, 0x4a235a, 0, 0.6, 0);
    body.rotation.z = -0.2;
    const root = group(
      body,
      box(0.45, 0.4, 0.45, 0x5b2c6f, 0.4, 0.95, 0),
      ball(0.06, 0xffee00, 0.63, 1.0, 0.12, 0xffcc00),
      ball(0.06, 0xffee00, 0.63, 1.0, -0.12, 0xffcc00),
      claw,
    );
    return { root, weapons: [claw] };
  },

  brute() {
    const fist = pivot(0.5, 1.4, 0.5, 1,
      box(0.3, 0.8, 0.3, 0x5d4d3b, 0, 0.35, 0),
      box(0.45, 0.45, 0.45, 0x4d3d2b, 0, 0.85, 0),
    );
    const root = group(
      box(0.35, 0.7, 0.4, 0x5d4d3b, -0.25, 0.35, 0),
      box(0.35, 0.7, 0.4, 0x5d4d3b, 0.25, 0.35, 0),
      box(1.1, 1.2, 0.8, 0x6d5d4b, 0, 1.3, 0),
      box(0.5, 0.45, 0.5, 0x7d6d5b, 0.15, 2.1, 0),
      ball(0.07, 0xff7700, 0.41, 2.15, 0.12, 0xff5500),
      ball(0.07, 0xff7700, 0.41, 2.15, -0.12, 0xff5500),
      fist,
    );
    return { root, weapons: [fist] };
  },

  robot() {
    const arm = pivot(0.65, 1.8, 0.6, 0.8,
      box(0.3, 1.0, 0.3, 0x6c737a, 0, 0.35, 0),
      box(0.45, 0.4, 0.45, 0x444a50, 0, 0.9, 0),
    );
    const pod = (z) => {
      const tip = cone(0.1, 0.25, 0xcc2222, -0.05, 2.35, z); // missile tip, pointing forward
      tip.rotation.z = -Math.PI / 2;
      return group(box(0.45, 0.4, 0.4, 0x444a50, -0.3, 2.35, z), tip);
    };
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff, emissive: 0x2288ff, transparent: true, opacity: 0.35, depthWrite: false,
    });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 1.4), shieldMat);
    shield.position.set(1.1, 1.4, 0);
    shield.userData.noFlash = true;
    const root = group(
      box(0.45, 1.0, 0.5, 0x555a60, -0.35, 0.5, 0),
      box(0.45, 1.0, 0.5, 0x555a60, 0.35, 0.5, 0),
      box(1.4, 1.2, 0.9, 0x8a9199, 0, 1.6, 0),
      box(0.6, 0.45, 0.55, 0x9aa1a9, 0, 2.45, 0),
      box(0.1, 0.12, 0.4, 0xff0000, 0.31, 2.47, 0, 0xff0000),
      pod(0.6),
      pod(-0.6),
      arm,
      shield,
    );
    return { root, weapons: [arm], shield };
  },
};

export function buildModel(name, def) {
  const builder = BUILDERS[name];
  if (builder) return builder();
  // Fallback: a plain colored box.
  const { w, h } = def.size;
  return { root: group(box(w, h, w * 0.6, def.color ?? 0xff00ff, 0, h / 2, 0)), weapons: [] };
}
