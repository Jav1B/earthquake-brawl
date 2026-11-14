import * as THREE from 'three';

// Cartoon-style 3D models built from simple shapes. Each builder returns:
//   root    – the model, standing on y = 0, facing +x (z is left/right)
//   weapons – pivots that animate when attacking (see `pose` below)
//   legs    – pivots that swing when walking (userData.phase = 0 or π)
//   arms    – pivots that swing while walking (non-attacking arms)
//   shield  – optional mesh shown while a shield is up
// Parts marked `flicker` (flames, glows) wobble every frame.
// Swap these for real models/sprites later without touching game logic.

const SKIN = 0xf1c27d;
const BLACK = 0x1a1a1a;

// --- Materials ---------------------------------------------------------------
// Toon shading: 3 flat bands of light instead of smooth gradients.
const gradientMap = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 180, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
function mat(color, emissive = 0x000000) {
  return new THREE.MeshToonMaterial({ color, emissive, gradientMap });
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });

// --- Shapes ------------------------------------------------------------------
const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  ball: (r) => new THREE.SphereGeometry(r, 16, 12),
  dome: (r) => new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  cap: (r, len) => new THREE.CapsuleGeometry(r, len, 4, 10),
  cyl: (rt, rb, h, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg),
  cone: (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg),
  rock: (r) => new THREE.IcosahedronGeometry(r, 0),
  torus: (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 8, 20, arc),
  // A half-moon axe blade, flat in the x/y plane
  blade: (r) => new THREE.CylinderGeometry(r, r, 0.04, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2),
};

// One mesh. Options: x y z position, rx ry rz rotation, s scale (number or [x,y,z]),
// glow (bright, no outline), flicker (wobbles like a flame).
function part(geo, color, o = {}) {
  const m = new THREE.Mesh(geo, mat(color, o.glow ? color : 0x000000));
  m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  if (o.s) m.scale.set(...(Array.isArray(o.s) ? o.s : [o.s, o.s, o.s]));
  if (o.glow) m.userData.noOutline = true;
  if (o.flicker) m.userData.flicker = true;
  return m;
}

function group(...children) {
  const g = new THREE.Group();
  const parts = children.flat();
  if (parts.length) g.add(...parts);
  return g;
}
function pivot(x, y, z, ...children) {
  const g = group(...children);
  g.position.set(x, y, z);
  return g;
}

// A limb hanging down from a joint at (x, y, z), with optional things at its end.
function limb(x, y, z, r, len, color, phase = 0, ...atEnd) {
  const end = pivot(0, -(len + r), 0, ...atEnd);
  const p = pivot(x, y, z, part(G.cap(r, len), color, { y: -(len / 2 + r * 0.6) }), end);
  p.userData.phase = phase;
  p.userData.end = end;
  return p;
}

// Weapon animation: angle (rotation around z) at rest, when winding up,
// and at the end of the strike. For arms: 0 = hanging down, π/2 = straight forward.
function pose(w, rest, windup, strike) {
  w.userData.pose = { rest, windup, strike };
  w.rotation.z = rest;
  return w;
}

// Something held in a hand, tilted relative to the arm.
function held(tilt, ...children) {
  const g = group(...children);
  g.rotation.z = tilt;
  return g;
}

// Black outlines: a slightly bigger copy of each mesh, inside-out.
function addOutlines(root) {
  const meshes = [];
  root.traverse((o) => o.isMesh && !o.userData.noOutline && meshes.push(o));
  for (const m of meshes) {
    m.geometry.computeBoundingSphere();
    const r = m.geometry.boundingSphere.radius || 1;
    const shell = new THREE.Mesh(m.geometry, outlineMat);
    shell.scale.setScalar(1 + 0.035 / r);
    shell.userData.noFlash = true;
    shell.userData.isOutline = true;
    m.add(shell);
  }
}

// --- Heroes ------------------------------------------------------------------
const BUILDERS = {
  samurai() {
    const RED = 0xc0392b, DARK = 0x2c2c34, GOLD = 0xf1c40f, HAKAMA = 0x3a3a55;
    const foot = () => part(G.box(0.3, 0.1, 0.18), DARK, { x: 0.06, y: 0.02 });
    const legs = [limb(0, 0.95, 0.14, 0.12, 0.65, HAKAMA, 0, foot()), limb(0, 0.95, -0.14, 0.12, 0.65, HAKAMA, Math.PI, foot())];
    const fireSword = held(-Math.PI / 2,
      part(G.cyl(0.04, 0.04, 0.28, 8), BLACK, { y: 0.1 }),
      part(G.cyl(0.11, 0.11, 0.03, 12), GOLD, { y: 0.25 }),
      part(G.box(0.07, 1.05, 0.03), 0xffe0b0, { y: 0.8 }),
      part(G.cone(0.09, 0.5, 6), 0xff6a00, { y: 0.7, x: 0.04, glow: true, flicker: true }),
      part(G.cone(0.07, 0.45, 6), 0xffcc00, { y: 1.05, x: 0.03, glow: true, flicker: true }),
    );
    const swordArm = pose(limb(0, 1.5, 0.34, 0.09, 0.42, RED, 0, part(G.ball(0.09), SKIN), fireSword), 0.4, 2.6, 0.7);
    const backArm = limb(0, 1.5, -0.34, 0.09, 0.42, RED, Math.PI, part(G.ball(0.09), SKIN));
    const root = group(
      legs,
      part(G.cyl(0.28, 0.4, 0.45, 10), HAKAMA, { y: 0.82 }),
      part(G.cyl(0.29, 0.29, 0.1, 12), GOLD, { y: 1.05 }),
      part(G.box(0.48, 0.5, 0.5), RED, { y: 1.33 }),
      part(G.box(0.5, 0.05, 0.52), GOLD, { y: 1.2 }),
      part(G.box(0.5, 0.05, 0.52), GOLD, { y: 1.42 }),
      part(G.box(0.36, 0.08, 0.24), RED, { y: 1.57, z: 0.34, rx: -0.35 }),
      part(G.box(0.36, 0.08, 0.24), RED, { y: 1.57, z: -0.34, rx: 0.35 }),
      part(G.ball(0.2), SKIN, { y: 1.78 }),
      part(G.ball(0.03), BLACK, { x: 0.18, y: 1.8, z: 0.07 }),
      part(G.ball(0.03), BLACK, { x: 0.18, y: 1.8, z: -0.07 }),
      part(G.dome(0.23), DARK, { y: 1.83 }),
      part(G.cyl(0.33, 0.35, 0.04, 16), DARK, { y: 1.83 }),
      part(G.box(0.04, 0.3, 0.04), GOLD, { x: 0.12, y: 2.06, z: 0.08, rx: -0.45, rz: -0.3 }),
      part(G.box(0.04, 0.3, 0.04), GOLD, { x: 0.12, y: 2.06, z: -0.08, rx: 0.45, rz: -0.3 }),
      backArm,
      swordArm,
    );
    return { root, weapons: [swordArm], legs, arms: [backArm] };
  },

  rhino() {
    const GREY = 0x8e9396, DARK = 0x6a6f72, HORN = 0xf3ead2;
    const leg = (x, z, phase) => limb(x, 0.75, z, 0.15, 0.4, DARK, phase, part(G.cyl(0.17, 0.17, 0.08, 10), 0x4a4f52, { y: 0.03 }));
    const legs = [leg(0.45, 0.28, 0), leg(0.45, -0.28, Math.PI), leg(-0.5, 0.28, Math.PI), leg(-0.5, -0.28, 0)];
    const head = pose(pivot(0.7, 1.0, 0,
      part(G.ball(0.34), GREY, { x: 0.25, s: [1.25, 0.9, 0.95] }),
      part(G.ball(0.22), GREY, { x: 0.58, y: -0.1, s: [1.1, 0.8, 0.9] }),
      part(G.cone(0.12, 0.5), HORN, { x: 0.72, y: 0.22, rz: -0.35 }),
      part(G.cone(0.07, 0.22), HORN, { x: 0.45, y: 0.26, rz: -0.2 }),
      part(G.cone(0.07, 0.18), DARK, { x: 0.05, y: 0.33, z: 0.18, rx: -0.4 }),
      part(G.cone(0.07, 0.18), DARK, { x: 0.05, y: 0.33, z: -0.18, rx: 0.4 }),
      part(G.ball(0.045), BLACK, { x: 0.38, y: 0.08, z: 0.24 }),
      part(G.ball(0.045), BLACK, { x: 0.38, y: 0.08, z: -0.24 }),
      part(G.ball(0.09), 0xff6600, { x: 0.76, y: -0.2, glow: true, flicker: true }),
    ), 0, 0.35, -0.4);
    const root = group(
      legs,
      part(G.ball(0.6), GREY, { y: 1.0, s: [1.35, 0.85, 0.8] }),
      part(G.ball(0.45), 0xa3a8ab, { y: 0.85, x: 0.1, s: [1.4, 0.7, 0.85] }),
      part(G.box(0.5, 0.06, 0.95), DARK, { y: 1.2, x: 0.25, rz: 0.1 }),
      part(G.box(0.5, 0.06, 0.95), DARK, { y: 1.2, x: -0.3, rz: -0.1 }),
      part(G.cap(0.04, 0.25), DARK, { x: -0.85, y: 1.05, rz: 0.8 }),
      head,
    );
    return { root, weapons: [head], legs, arms: [] };
  },

  hammerer() {
    const BLUE = 0x2e86de, PANTS = 0x2c3e50, BROWN = 0x6b3e1f, HAIR = 0x5d3a1a, STEEL = 0x95a5a6, GOLD = 0xf1c40f;
    const boot = () => part(G.box(0.3, 0.14, 0.2), BROWN, { x: 0.05, y: 0.04 });
    const legs = [limb(0, 0.9, 0.14, 0.11, 0.6, PANTS, 0, boot()), limb(0, 0.9, -0.14, 0.11, 0.6, PANTS, Math.PI, boot())];
    const hammer = held(-2.0,
      part(G.cyl(0.045, 0.045, 1.25, 8), BROWN, { y: 0.45 }),
      part(G.cyl(0.2, 0.2, 0.55, 12), STEEL, { y: 1.1, rz: Math.PI / 2 }),
      part(G.cyl(0.21, 0.21, 0.06, 12), GOLD, { y: 1.1, x: 0.2, rz: Math.PI / 2 }),
      part(G.cyl(0.21, 0.21, 0.06, 12), GOLD, { y: 1.1, x: -0.2, rz: Math.PI / 2 }),
    );
    const hammerArm = pose(limb(0, 1.48, 0.33, 0.09, 0.42, BLUE, 0, part(G.ball(0.09), SKIN), hammer), 0.1, 2.8, 0.6);
    const backArm = limb(0, 1.48, -0.33, 0.09, 0.42, BLUE, Math.PI, part(G.ball(0.09), SKIN));
    const bow = part(G.torus(0.45, 0.025, Math.PI), BROWN, { x: -0.32, y: 1.2, rz: Math.PI / 2 });
    const quiver = group(
      part(G.cyl(0.08, 0.08, 0.6, 8), BROWN, { x: -0.3, y: 1.3, z: -0.1, rz: 0.4 }),
      part(G.box(0.03, 0.2, 0.03), 0x99ccff, { x: -0.43, y: 1.62, z: -0.13, rz: 0.4, glow: true }),
      part(G.box(0.03, 0.2, 0.03), 0x99ccff, { x: -0.38, y: 1.64, z: -0.07, rz: 0.4, glow: true }),
    );
    const root = group(
      legs,
      part(G.box(0.46, 0.65, 0.42), BLUE, { y: 1.22 }),
      part(G.cyl(0.25, 0.3, 0.25, 10), BLUE, { y: 0.88 }),
      part(G.box(0.48, 0.08, 0.44), BROWN, { y: 0.98 }),
      part(G.box(0.1, 0.08, 0.1), GOLD, { x: 0.24, y: 0.98 }),
      part(G.box(0.04, 0.7, 0.44), BROWN, { x: 0.05, y: 1.25, rz: 0.6 }),
      part(G.ball(0.2), SKIN, { y: 1.75 }),
      part(G.ball(0.03), BLACK, { x: 0.18, y: 1.78, z: 0.07 }),
      part(G.ball(0.03), BLACK, { x: 0.18, y: 1.78, z: -0.07 }),
      part(G.dome(0.21), HAIR, { y: 1.78, x: -0.02 }),
      part(G.box(0.12, 0.08, 0.2), HAIR, { x: 0.15, y: 1.64 }),
      bow,
      quiver,
      backArm,
      hammerArm,
    );
    return { root, weapons: [hammerArm], legs, arms: [backArm] };
  },

  gnome() {
    const GREEN = 0x27ae60, RED = 0xc0392b, BROWN = 0x5d3a1a, STEEL = 0xbdc3c7;
    const boot = () => part(G.box(0.22, 0.1, 0.15), BROWN, { x: 0.05, y: 0.03 });
    const legs = [limb(0, 0.38, 0.1, 0.08, 0.2, 0x2c3e50, 0, boot()), limb(0, 0.38, -0.1, 0.08, 0.2, 0x2c3e50, Math.PI, boot())];
    // Big double-bladed axes (a gnome needs reach!)
    const axe = () => held(-Math.PI / 2,
      part(G.cyl(0.035, 0.035, 0.9, 6), BROWN, { y: 0.38 }),
      part(G.blade(0.26), STEEL, { y: 0.72, x: 0.03, rz: -Math.PI / 2 }),
      part(G.blade(0.2), STEEL, { y: 0.72, x: -0.03, rz: Math.PI / 2 }),
      part(G.cone(0.05, 0.15, 6), STEEL, { y: 0.9 }),
    );
    const frontArm = pose(limb(0, 0.68, 0.27, 0.07, 0.18, GREEN, 0, part(G.ball(0.07), SKIN), axe()), 0.5, 2.3, 0.5);
    const backArm = pose(limb(0, 0.68, -0.27, 0.07, 0.18, GREEN, Math.PI, part(G.ball(0.07), SKIN), axe()), 0.3, 2.0, 0.3);
    const root = group(
      legs,
      part(G.ball(0.28), GREEN, { y: 0.55, s: [1, 1.05, 1] }),
      part(G.box(0.5, 0.06, 0.5), BROWN, { y: 0.45 }),
      part(G.ball(0.18), SKIN, { y: 0.88 }),
      part(G.ball(0.06), 0xe8967a, { x: 0.19, y: 0.86 }),
      part(G.ball(0.025), BLACK, { x: 0.15, y: 0.93, z: 0.07 }),
      part(G.ball(0.025), BLACK, { x: 0.15, y: 0.93, z: -0.07 }),
      part(G.cone(0.2, 0.42, 10), 0xffffff, { x: 0.1, y: 0.68, rx: Math.PI }),
      part(G.cyl(0.21, 0.21, 0.06, 12), RED, { y: 1.0 }),
      part(G.cone(0.2, 0.55, 12), RED, { x: -0.06, y: 1.27, rz: 0.25 }),
      backArm,
      frontArm,
    );
    return { root, weapons: [frontArm, backArm], legs, arms: [] };
  },

  // --- Enemies -----------------------------------------------------------------
  crawler() {
    const PURPLE = 0x5b2c6f, DARK = 0x3a1a48, LAVA = 0xff7a00;
    const legs = [limb(-0.1, 0.5, 0.18, 0.09, 0.3, DARK, 0), limb(-0.1, 0.5, -0.18, 0.09, 0.3, DARK, Math.PI)];
    const claws = () => [-0.05, 0, 0.05].map((z) => part(G.cone(0.03, 0.18, 5), 0xeeeeee, { x: 0.02, y: -0.08, z, rz: 0.3 }));
    const clawArm = pose(limb(0.25, 0.85, 0.3, 0.07, 0.45, PURPLE, 0, claws()), 0.3, 2.0, 0.1);
    const backArm = limb(0.25, 0.85, -0.3, 0.07, 0.45, PURPLE, Math.PI, claws());
    const root = group(
      legs,
      part(G.ball(0.4), PURPLE, { x: 0.05, y: 0.75, s: [1.2, 0.85, 0.9], rz: -0.3 }),
      [-0.25, 0, 0.25].map((x, i) => part(G.cone(0.08, 0.25, 6), DARK, { x, y: 1.1 - i * 0.03, rz: 0.3 })),
      part(G.box(0.25, 0.03, 0.02), LAVA, { x: 0.05, y: 0.75, z: 0.36, rz: 0.5, glow: true }),
      part(G.box(0.18, 0.03, 0.02), LAVA, { x: -0.12, y: 0.65, z: 0.35, rz: -0.4, glow: true }),
      part(G.ball(0.24), PURPLE, { x: 0.45, y: 0.95, s: [1.1, 0.9, 1] }),
      part(G.ball(0.06), 0xffee00, { x: 0.67, y: 1.0, z: 0.1, glow: true }),
      part(G.ball(0.06), 0xffee00, { x: 0.67, y: 1.0, z: -0.1, glow: true }),
      part(G.box(0.08, 0.04, 0.2), 0xffffff, { x: 0.68, y: 0.85 }),
      backArm,
      clawArm,
    );
    return { root, weapons: [clawArm], legs, arms: [backArm] };
  },

  brute() {
    const ROCK = 0x7d6d5b, DARK = 0x5d4d3b, LAVA = 0xff5500;
    const legs = [limb(0, 0.75, 0.28, 0.17, 0.35, DARK, 0), limb(0, 0.75, -0.28, 0.17, 0.35, DARK, Math.PI)];
    const fist = () => part(G.rock(0.28), DARK, { y: -0.05 });
    const punchArm = pose(limb(0.1, 1.75, 0.6, 0.15, 0.6, ROCK, 0, fist()), 0.15, -0.6, 1.6);
    const backArm = limb(0.1, 1.75, -0.6, 0.15, 0.6, ROCK, Math.PI, fist());
    const root = group(
      legs,
      part(G.rock(0.65), ROCK, { y: 1.35, s: [1, 1.1, 0.9] }),
      part(G.rock(0.3), DARK, { x: 0.1, y: 1.85, z: 0.4 }),
      part(G.rock(0.3), DARK, { x: 0.1, y: 1.85, z: -0.4 }),
      part(G.rock(0.3), ROCK, { x: 0.25, y: 2.1 }),
      part(G.box(0.04, 0.05, 0.12), LAVA, { x: 0.52, y: 2.15, z: 0.1, glow: true }),
      part(G.box(0.04, 0.05, 0.12), LAVA, { x: 0.52, y: 2.15, z: -0.1, glow: true }),
      part(G.box(0.03, 0.5, 0.03), LAVA, { x: 0.4, y: 1.35, z: 0.35, rz: 0.4, glow: true, flicker: true }),
      part(G.box(0.03, 0.35, 0.03), LAVA, { x: 0.45, y: 1.2, z: 0.2, rz: -0.5, glow: true }),
      backArm,
      punchArm,
    );
    return { root, weapons: [punchArm], legs, arms: [backArm] };
  },

  house() {
    const WALL = 0xe8d5b0, ROOF = 0xa93226, WOOD = 0x7b4a2a, METAL = 0xaab7b8, WINDOW = 0xffe066;
    const legs = [limb(0, 0.45, 0.35, 0.13, 0.15, WOOD, 0, part(G.box(0.35, 0.12, 0.3), WOOD, { x: 0.05 })),
      limb(0, 0.45, -0.35, 0.13, 0.15, WOOD, Math.PI, part(G.box(0.35, 0.12, 0.3), WOOD, { x: 0.05 }))];
    const metalFist = () => [
      part(G.box(0.4, 0.4, 0.4), METAL, { y: -0.1 }),
      part(G.box(0.06, 0.12, 0.42), 0x7f8c8d, { x: 0.2, y: 0.0 }),
    ];
    const punchArm = pose(limb(0.1, 1.5, 0.78, 0.09, 0.6, METAL, 0, metalFist()), 0.15, -0.5, 1.6);
    const backArm = limb(0.1, 1.5, -0.78, 0.09, 0.6, METAL, Math.PI, metalFist());
    const roof = part(G.cone(1.05, 0.75, 4), ROOF, { y: 2.15, ry: Math.PI / 4, s: [1, 1, 0.8] });
    const root = group(
      legs,
      part(G.box(1.3, 1.25, 1.2), WALL, { y: 1.1 }),
      roof,
      part(G.box(0.22, 0.5, 0.22), 0x8b4513, { x: -0.3, y: 2.35, z: 0.2 }),
      part(G.box(0.05, 0.6, 0.35), WOOD, { x: 0.66, y: 0.8 }),
      part(G.box(0.05, 0.25, 0.25), WINDOW, { x: 0.66, y: 1.45, z: 0.3, glow: true }),
      part(G.box(0.05, 0.25, 0.25), WINDOW, { x: 0.66, y: 1.45, z: -0.3, glow: true }),
      part(G.box(0.06, 0.06, 0.3), 0x5d3a1a, { x: 0.67, y: 1.65, z: 0.3, rx: 0.3 }),
      part(G.box(0.06, 0.06, 0.3), 0x5d3a1a, { x: 0.67, y: 1.65, z: -0.3, rx: -0.3 }),
      part(G.box(0.05, 0.22, 0.22), WINDOW, { y: 1.3, z: 0.61, glow: true }),
      backArm,
      punchArm,
    );
    return { root, weapons: [punchArm], legs, arms: [backArm] };
  },

  cat() {
    const FUR = 0x34495e, LIGHT = 0x5d6d7e, LAVA = 0xff5a00;
    const paw = (lava) => lava
      ? [-0.05, 0, 0.05].map((z) => part(G.cone(0.03, 0.16, 5), LAVA, { x: 0.06, y: -0.02, z, rz: -1.2, glow: true, flicker: true }))
      : [];
    const leg = (x, z, phase, lava = false) => limb(x, 0.55, z, 0.07, 0.35, FUR, phase, part(G.ball(0.08), LIGHT), paw(lava));
    const clawLeg = pose(leg(0.42, 0.2, 0, true), 0, 1.3, -0.3);
    const legs = [leg(0.42, -0.2, Math.PI, true), leg(-0.42, 0.2, Math.PI), leg(-0.42, -0.2, 0)];
    const tail = group([0, 1, 2, 3, 4].map((i) => part(G.ball(0.07 - i * 0.005), FUR, { x: -0.6 - i * 0.08, y: 0.75 + i * 0.12 + i * i * 0.01 })));
    const root = group(
      legs,
      part(G.ball(0.35), FUR, { y: 0.68, s: [1.6, 0.8, 0.85] }),
      part(G.ball(0.25), LIGHT, { y: 0.6, x: 0.15, s: [1.4, 0.6, 0.8] }),
      part(G.ball(0.25), FUR, { x: 0.62, y: 0.92 }),
      part(G.ball(0.12), LIGHT, { x: 0.82, y: 0.86, s: [1, 0.8, 1.2] }),
      part(G.ball(0.03), 0xff9999, { x: 0.93, y: 0.9 }),
      part(G.cone(0.09, 0.2, 4), FUR, { x: 0.58, y: 1.18, z: 0.12 }),
      part(G.cone(0.09, 0.2, 4), FUR, { x: 0.58, y: 1.18, z: -0.12 }),
      part(G.ball(0.05), LAVA, { x: 0.82, y: 1.0, z: 0.1, s: [0.6, 1, 1], glow: true }),
      part(G.ball(0.05), LAVA, { x: 0.82, y: 1.0, z: -0.1, s: [0.6, 1, 1], glow: true }),
      part(G.box(0.02, 0.02, 0.3), 0xdddddd, { x: 0.88, y: 0.85, ry: 0.3 }),
      tail,
      clawLeg,
    );
    return { root, weapons: [clawLeg], legs, arms: [] };
  },

  ninja() {
    const SUIT = 0x22232b, SCARF = 0xe74c3c, STEEL = 0xd5dbdb;
    const legs = [limb(0, 0.92, 0.13, 0.1, 0.65, SUIT, 0), limb(0, 0.92, -0.13, 0.1, 0.65, SUIT, Math.PI)];
    const katana = held(-Math.PI / 2,
      part(G.cyl(0.035, 0.035, 0.25, 6), SCARF, { y: 0.1 }),
      part(G.box(0.12, 0.03, 0.12), 0x111111, { y: 0.24 }),
      part(G.box(0.05, 0.9, 0.02), STEEL, { y: 0.7 }),
    );
    const swordArm = pose(limb(0, 1.45, 0.3, 0.08, 0.42, SUIT, 0, part(G.ball(0.08), SUIT), katana), 0.6, 2.4, 0.9);
    const backArm = limb(0, 1.45, -0.3, 0.08, 0.42, SUIT, Math.PI, part(G.ball(0.08), SUIT));
    const scarf = group(
      part(G.box(0.35, 0.06, 0.05), SCARF, { x: -0.3, y: 1.8, z: 0.05, rz: 0.25 }),
      part(G.box(0.3, 0.06, 0.05), SCARF, { x: -0.32, y: 1.72, z: -0.05, rz: 0.4 }),
    );
    const root = group(
      legs,
      part(G.box(0.4, 0.6, 0.4), SUIT, { y: 1.22 }),
      part(G.box(0.42, 0.07, 0.42), SCARF, { y: 0.96 }),
      part(G.ball(0.19), SUIT, { y: 1.72 }),
      part(G.box(0.08, 0.07, 0.3), SKIN, { x: 0.16, y: 1.74 }),
      part(G.box(0.03, 0.025, 0.06), BLACK, { x: 0.2, y: 1.75, z: 0.07 }),
      part(G.box(0.03, 0.025, 0.06), BLACK, { x: 0.2, y: 1.75, z: -0.07 }),
      part(G.cyl(0.2, 0.2, 0.06, 14), SCARF, { y: 1.83 }),
      scarf,
      part(G.box(0.05, 0.8, 0.05), 0x111111, { x: -0.22, y: 1.3, rz: 0.6 }),
      backArm,
      swordArm,
    );
    return { root, weapons: [swordArm], legs, arms: [backArm] };
  },

  ape() {
    const FUR = 0x4e342e, FACE = 0xa1887f, ICE = 0x99eeff;
    const legs = [limb(-0.1, 0.7, 0.25, 0.15, 0.3, FUR, 0), limb(-0.1, 0.7, -0.25, 0.15, 0.3, FUR, Math.PI)];
    const fist = () => part(G.ball(0.2), FACE);
    const slamArm = pose(limb(0.2, 1.65, 0.55, 0.15, 0.85, FUR, 0, fist()), 0.4, 2.8, 0.5);
    const backArm = pose(limb(0.2, 1.65, -0.55, 0.15, 0.85, FUR, Math.PI, fist()), 0.4, 2.8, 0.5);
    const root = group(
      legs,
      part(G.ball(0.6), FUR, { x: 0.1, y: 1.3, s: [1, 1.05, 0.95], rz: -0.25 }),
      part(G.ball(0.42), FACE, { x: 0.35, y: 1.2, s: [0.6, 1, 0.9] }),
      part(G.ball(0.28), FUR, { x: 0.5, y: 1.85 }),
      part(G.ball(0.2), FACE, { x: 0.68, y: 1.8, s: [0.7, 1, 1.1] }),
      part(G.box(0.1, 0.05, 0.3), FUR, { x: 0.68, y: 1.95 }),
      part(G.ball(0.04), BLACK, { x: 0.78, y: 1.88, z: 0.08 }),
      part(G.ball(0.04), BLACK, { x: 0.78, y: 1.88, z: -0.08 }),
      part(G.ball(0.07), ICE, { x: 0.82, y: 1.7, glow: true, flicker: true }),
      part(G.ball(0.08), FACE, { x: 0.45, y: 1.88, z: 0.27 }),
      part(G.ball(0.08), FACE, { x: 0.45, y: 1.88, z: -0.27 }),
      backArm,
      slamArm,
    );
    return { root, weapons: [slamArm, backArm], legs, arms: [] };
  },

  sushi() {
    const RICE = 0xf7f5ee, SALMON = 0xff8a5c, STRIPE = 0xffe2d4;
    const legs = [limb(0, 0.16, 0.14, 0.05, 0.05, RICE, 0), limb(0, 0.16, -0.14, 0.05, 0.05, RICE, Math.PI)];
    // The whole body leans back and then bumps forward when attacking
    const body = pose(pivot(0, 0.05, 0,
      part(G.cap(0.2, 0.42), RICE, { y: 0.27, rz: Math.PI / 2, s: [1, 1, 1.25] }),
      part(G.box(0.85, 0.12, 0.5), SALMON, { y: 0.5, rz: -0.06 }),
      [-0.25, -0.05, 0.15].map((x) => part(G.box(0.05, 0.13, 0.52), STRIPE, { x, y: 0.51, ry: 0.5 })),
      part(G.ball(0.05), BLACK, { x: 0.38, y: 0.33, z: 0.11 }),
      part(G.ball(0.05), BLACK, { x: 0.38, y: 0.33, z: -0.11 }),
      part(G.box(0.03, 0.03, 0.12), BLACK, { x: 0.4, y: 0.42, z: 0.11, rx: 0.4 }),
      part(G.box(0.03, 0.03, 0.12), BLACK, { x: 0.4, y: 0.42, z: -0.11, rx: -0.4 }),
      part(G.ball(0.04), 0xcc3333, { x: 0.41, y: 0.22, s: [0.6, 0.6, 1.4] }),
    ), 0, 0.35, -0.45);
    const root = group(legs, body);
    return { root, weapons: [body], legs, arms: [] };
  },

  waiter() {
    const SHIRT = 0xfafafa, VEST = 0x1c1c1c, PANTS = 0x2b2b2b, TRAY = 0xc8ccd0, HAIR = 0x111111;
    const shoe = () => part(G.box(0.28, 0.09, 0.16), BLACK, { x: 0.05, y: 0.03 });
    const legs = [limb(0, 0.92, 0.13, 0.1, 0.65, PANTS, 0, shoe()), limb(0, 0.92, -0.13, 0.1, 0.65, PANTS, Math.PI, shoe())];
    const tray = held(-1.4, part(G.cyl(0.3, 0.3, 0.03, 20), TRAY, { x: 0.15 }), part(G.torus(0.3, 0.02), TRAY, { x: 0.15, rx: Math.PI / 2 }));
    const trayArm = pose(limb(0, 1.48, 0.3, 0.08, 0.42, SHIRT, 0, part(G.ball(0.08), SKIN), tray), 1.4, -0.6, 1.7);
    const backArm = limb(0, 1.48, -0.3, 0.08, 0.42, SHIRT, Math.PI, part(G.ball(0.08), SKIN),
      part(G.box(0.12, 0.3, 0.18), 0xffffff, { y: 0.3 }));
    const root = group(
      legs,
      part(G.box(0.42, 0.62, 0.42), VEST, { y: 1.23 }),
      part(G.box(0.05, 0.6, 0.16), SHIRT, { x: 0.2, y: 1.24 }),
      part(G.cone(0.06, 0.12, 4), 0xc0392b, { x: 0.23, y: 1.5, z: 0.06, rx: Math.PI / 2 }),
      part(G.cone(0.06, 0.12, 4), 0xc0392b, { x: 0.23, y: 1.5, z: -0.06, rx: -Math.PI / 2 }),
      part(G.box(0.06, 0.4, 0.44), 0xffffff, { x: 0.12, y: 0.75 }),
      part(G.ball(0.2), SKIN, { y: 1.74 }),
      part(G.ball(0.03), BLACK, { x: 0.18, y: 1.77, z: 0.07 }),
      part(G.ball(0.03), BLACK, { x: 0.18, y: 1.77, z: -0.07 }),
      part(G.box(0.04, 0.04, 0.18), HAIR, { x: 0.2, y: 1.66 }),
      part(G.dome(0.21), HAIR, { y: 1.78, s: [1, 0.7, 1] }),
      backArm,
      trayArm,
    );
    return { root, weapons: [trayArm], legs, arms: [backArm] };
  },

  sensei() {
    const KIMONO = 0x1f4e79, HAKAMA = 0x222831, WHITE = 0xf5f5f5, STEEL = 0xd0d6da, RICE = 0xf7f5ee, SALMON = 0xff8a5c;
    const legs = [limb(0, 0.95, 0.15, 0.12, 0.65, HAKAMA, 0, part(G.box(0.3, 0.08, 0.17), 0x6b3e1f, { x: 0.06, y: 0.02 })),
      limb(0, 0.95, -0.15, 0.12, 0.65, HAKAMA, Math.PI, part(G.box(0.3, 0.08, 0.17), 0x6b3e1f, { x: 0.06, y: 0.02 }))];
    const sleeve = () => part(G.cyl(0.1, 0.22, 0.45, 10), KIMONO, { y: -0.3 });
    const chopsticks = held(-Math.PI / 2,
      part(G.cyl(0.02, 0.012, 1.0, 6), STEEL, { y: 0.4, z: 0.03 }),
      part(G.cyl(0.02, 0.012, 1.0, 6), STEEL, { y: 0.4, z: -0.03, rx: 0.06 }),
    );
    const stickArm = pose(pivot(0, 1.55, 0.36, sleeve(), pivot(0, -0.58, 0, part(G.ball(0.09), SKIN), chopsticks)), 0.5, 2.3, 0.9);
    const energyArm = pivot(0, 1.55, -0.36, sleeve(), pivot(0, -0.58, 0, part(G.ball(0.09), SKIN),
      part(G.ball(0.12), 0xffdd00, { y: -0.1, glow: true, flicker: true })));
    energyArm.userData.phase = Math.PI;
    // The sushi logo on his kimono (on both sides)
    const logo = (z) => group(
      part(G.cap(0.05, 0.1), RICE, { x: 0.02, y: 1.38, z, rz: Math.PI / 2 }),
      part(G.box(0.22, 0.04, 0.03), SALMON, { x: 0.02, y: 1.44, z }),
    );
    const root = group(
      legs,
      part(G.cyl(0.3, 0.45, 0.55, 12), HAKAMA, { y: 0.85 }),
      part(G.box(0.5, 0.65, 0.52), KIMONO, { y: 1.35 }),
      part(G.box(0.03, 0.55, 0.08), WHITE, { x: 0.26, y: 1.42, z: 0.06, rx: 0.5 }),
      part(G.box(0.03, 0.55, 0.08), WHITE, { x: 0.26, y: 1.42, z: -0.06, rx: -0.5 }),
      part(G.box(0.54, 0.12, 0.56), BLACK, { y: 1.08 }),
      logo(0.27),
      logo(-0.27),
      part(G.ball(0.23), SKIN, { y: 1.88 }),
      part(G.box(0.03, 0.03, 0.1), WHITE, { x: 0.21, y: 1.95, z: 0.08 }),
      part(G.box(0.03, 0.03, 0.1), WHITE, { x: 0.21, y: 1.95, z: -0.08 }),
      part(G.ball(0.03), BLACK, { x: 0.21, y: 1.9, z: 0.08 }),
      part(G.ball(0.03), BLACK, { x: 0.21, y: 1.9, z: -0.08 }),
      part(G.cone(0.03, 0.3, 6), WHITE, { x: 0.23, y: 1.72, z: 0.08, rx: Math.PI, rz: -0.3 }),
      part(G.cone(0.03, 0.3, 6), WHITE, { x: 0.23, y: 1.72, z: -0.08, rx: Math.PI, rz: -0.3 }),
      part(G.cone(0.08, 0.28, 8), WHITE, { x: 0.2, y: 1.6, rx: Math.PI }),
      energyArm,
      stickArm,
    );
    return { root, weapons: [stickArm], legs, arms: [energyArm] };
  },

  robot() {
    const BODY = 0x8a9199, DARK = 0x4a5056, RED = 0xff2222, CORE = 0x33ccff;
    const foot = () => part(G.box(0.55, 0.15, 0.4), DARK, { x: 0.08, y: 0.05 });
    const legs = [limb(0, 1.05, 0.35, 0.16, 0.7, DARK, 0, foot()), limb(0, 1.05, -0.35, 0.16, 0.7, DARK, Math.PI, foot())];
    const punchArm = pose(limb(0.05, 2.0, 0.78, 0.15, 0.7, BODY, 0,
      part(G.box(0.45, 0.4, 0.45), DARK, { y: -0.05 }),
      part(G.cyl(0.24, 0.24, 0.08, 12), RED, { y: -0.05, z: 0.23, rx: Math.PI / 2, glow: true }),
    ), 0.15, -0.5, 1.6);
    const backArm = limb(0.05, 2.0, -0.78, 0.15, 0.7, BODY, Math.PI, part(G.box(0.45, 0.4, 0.45), DARK, { y: -0.05 }));
    const pod = (z) => group(
      part(G.box(0.55, 0.45, 0.45), DARK, { x: -0.15, y: 2.55, z }),
      [-0.1, 0.1].flatMap((dz) => [
        part(G.cyl(0.07, 0.07, 0.2, 8), 0xdddddd, { x: 0.15, y: 2.6, z: z + dz, rz: -Math.PI / 2 }),
        part(G.cone(0.07, 0.14, 8), RED, { x: 0.3, y: 2.6, z: z + dz, rz: -Math.PI / 2 }),
      ]),
    );
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff, emissive: 0x2288ff, transparent: true, opacity: 0.35, depthWrite: false,
    });
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.08, 6), shieldMat);
    shield.rotation.z = Math.PI / 2;
    shield.position.set(1.15, 1.5, 0);
    shield.userData.noFlash = true;
    shield.userData.noOutline = true;
    const root = group(
      legs,
      part(G.box(1.2, 0.3, 0.9), DARK, { y: 1.15 }),
      part(G.box(1.3, 1.1, 1.0), BODY, { y: 1.8 }),
      part(G.cyl(0.22, 0.22, 0.06, 16), CORE, { x: 0.66, y: 1.85, rz: Math.PI / 2, glow: true, flicker: true }),
      part(G.box(0.6, 0.5, 0.6), 0x9aa1a9, { y: 2.6 }),
      part(G.box(0.08, 0.12, 0.45), RED, { x: 0.31, y: 2.63, glow: true }),
      part(G.cyl(0.02, 0.02, 0.35, 6), DARK, { y: 3.0, x: -0.1 }),
      part(G.ball(0.06), RED, { y: 3.18, x: -0.1, glow: true, flicker: true }),
      pod(0.6),
      pod(-0.6),
      backArm,
      punchArm,
      shield,
    );
    return { root, weapons: [punchArm], legs, arms: [backArm], shield };
  },
};

export function buildModel(name, def) {
  const builder = BUILDERS[name];
  let model;
  if (builder) {
    model = builder();
  } else {
    // Fallback: a plain colored box.
    const { w, h } = def.size;
    model = { root: group(part(G.box(w, h, w * 0.6), def.color ?? 0xff00ff, { y: h / 2 })), weapons: [], legs: [], arms: [] };
  }
  addOutlines(model.root);
  return model;
}

// --- Scenery props ---------------------------------------------------------------
const PROPS = {
  soyBarrel() {
    const WOOD = 0x8b5a2b, BAND = 0x3d2b1f;
    return group(
      part(G.cyl(0.33, 0.33, 0.85, 14), WOOD, { y: 0.43 }),
      part(G.cyl(0.36, 0.36, 0.07, 14), BAND, { y: 0.15 }),
      part(G.cyl(0.36, 0.36, 0.07, 14), BAND, { y: 0.71 }),
      part(G.cyl(0.3, 0.3, 0.03, 14), 0x2a1405, { y: 0.87 }),
      part(G.box(0.3, 0.35, 0.02), 0xf5f0e0, { y: 0.43, z: 0.33 }),
      part(G.box(0.06, 0.22, 0.03), 0x1a0d05, { y: 0.43, z: 0.34 }),
      part(G.box(0.16, 0.05, 0.03), 0x1a0d05, { y: 0.5, z: 0.34 }),
    );
  },

  restaurant() {
    const WALL = 0xf3e6c8, WOOD = 0x5d3a1a, ROOF = 0x34495e;
    const lantern = (x, z) => group(
      part(G.ball(0.2), 0xe74c3c, { x, y: 1.9, z, s: [1, 1.3, 1], glow: true }),
      part(G.cyl(0.08, 0.08, 0.05, 8), BLACK, { x, y: 2.17, z }),
    );
    const noren = [-0.35, 0, 0.35].map((dx) => part(G.box(0.02, 0.5, 0.32), 0x1f4e79, { x: dx * 0.1, y: 1.65, z: 1.01 + dx * 0.0, ry: Math.PI / 2, s: [1, 1, 1] }));
    noren.forEach((n, i) => (n.position.x = -0.35 + i * 0.35));
    return group(
      part(G.box(3, 2.1, 2), WALL, { y: 1.05 }),
      [-1.45, 1.45].map((x) => part(G.box(0.15, 2.1, 0.15), WOOD, { x, y: 1.05, z: 1 })),
      part(G.box(3.1, 0.15, 0.15), WOOD, { y: 2.05, z: 1 }),
      part(G.box(1, 1.3, 0.05), 0x3d2b1f, { y: 0.65, z: 1.01 }),
      noren,
      part(G.cone(2.5, 1.2, 4), ROOF, { y: 2.65, ry: Math.PI / 4, s: [1.25, 1, 0.9] }),
      part(G.box(2.2, 0.12, 0.2), ROOF, { y: 3.25 }),
      part(G.box(1.2, 0.45, 0.06), WOOD, { y: 2.45, z: 1.1 }),
      part(G.cap(0.08, 0.16), 0xf7f5ee, { y: 2.42, z: 1.15, rz: Math.PI / 2 }),
      part(G.box(0.36, 0.06, 0.06), 0xff8a5c, { y: 2.53, z: 1.15 }),
      lantern(-1.45, 1.15),
      lantern(1.45, 1.15),
    );
  },

  sakura() {
    const PINK = [0xffb7c5, 0xff9eb5, 0xffc8d4];
    return group(
      part(G.cyl(0.12, 0.2, 1.6, 7), 0x5d3a1a, { y: 0.8 }),
      part(G.cyl(0.06, 0.08, 0.8, 6), 0x5d3a1a, { x: 0.3, y: 1.7, rz: -0.6 }),
      [[0, 2.1, 0, 0.75], [0.6, 1.95, 0.2, 0.55], [-0.5, 1.9, -0.1, 0.55], [0.1, 2.5, -0.2, 0.5]].map(
        ([x, y, z, r], i) => part(G.ball(r), PINK[i % 3], { x, y, z }),
      ),
    );
  },

  mountain() {
    return group(
      part(G.cone(9, 14, 7), 0x6b7d5c, { y: 7 }),
      part(G.cone(3.3, 5.2, 7), 0xffffff, { y: 11.4 }),
    );
  },

  torii() {
    const RED = 0xd03a2b;
    return group(
      part(G.cyl(0.15, 0.18, 3, 10), RED, { x: -1.2, y: 1.5 }),
      part(G.cyl(0.15, 0.18, 3, 10), RED, { x: 1.2, y: 1.5 }),
      part(G.box(3.4, 0.2, 0.3), BLACK, { y: 3.1 }),
      part(G.box(3.0, 0.18, 0.25), RED, { y: 2.6 }),
    );
  },
};

export function buildProp(name) {
  const root = PROPS[name]();
  addOutlines(root);
  return root;
}
