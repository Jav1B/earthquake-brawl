import * as THREE from 'three';
import { Input } from './core/Input.js';
import { Game } from './core/Game.js';
import { Sound } from './core/Sound.js';
import { CHARACTERS } from './data/characters.js';
import { MOVES } from './data/moves.js';
import { LEVELS } from './data/levels.js';
import { ENEMIES } from './data/enemies.js';
import { buildModel } from './entities/models.js';
import { Level } from './levels/Level.js';

// Everything the player sees must be in French (see DESIGN.md).

// --- Renderer & camera -----------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
const CAM_HEIGHT = 5;
const CAM_DISTANCE = 10.5;

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let sun;
function addLights(target) {
  target.add(new THREE.HemisphereLight(0xffffff, 0x445533, 1.3));
  const light = new THREE.DirectionalLight(0xfff2dd, 1.6);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 });
  target.add(light, light.target);
  return light;
}
function resetScene() {
  scene.clear();
  sun = addLights(scene);
}

// --- UI helpers --------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const show = (id, visible) => $(id).classList.toggle('hidden', !visible);
const heroIds = Object.keys(CHARACTERS);
const hex = (color) => '#' + color.toString(16).padStart(6, '0');

function showMessage(title, subtitle) {
  $('message').innerHTML = title ? `${title}<small>${subtitle}</small>` : '';
  show('message', !!title);
}

// Renders each hero's 3D model into a picture for the select screen.
function renderPortraits() {
  const size = 200;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setSize(size, size);
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xffffff, 0x665544, 1.6));
  const light = new THREE.DirectionalLight(0xffffff, 1.8);
  light.position.set(3, 4, 5);
  s.add(light);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const portraits = {};
  for (const id of heroIds) {
    const { root } = buildModel(CHARACTERS[id].model, CHARACTERS[id]);
    root.rotation.y = -0.6; // turn toward the camera a bit
    s.add(root);
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const fit = Math.max(box.max.y - box.min.y, box.max.x - box.min.x) * 1.9;
    cam.position.set(center.x + fit * 0.15, center.y + fit * 0.15, center.z + fit);
    cam.lookAt(center);
    r.render(s, cam);
    portraits[id] = r.domElement.toDataURL();
    s.remove(root);
  }
  r.dispose();
  return portraits;
}

// Builds each level's scenery off-screen and takes a picture of it.
function renderLevelPreviews() {
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setSize(320, 180);
  r.shadowMap.enabled = true;
  const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 200);
  const previews = LEVELS.map((def) => {
    const s = new THREE.Scene();
    const light = addLights(s);
    new Level(def, { scene: s, sfx() {} });
    const x = 12;
    light.position.set(x + 6, 12, 8);
    light.target.position.set(x, 0, 0);
    cam.position.set(x, CAM_HEIGHT, CAM_DISTANCE);
    cam.lookAt(x, 0.9, 0);
    r.render(s, cam);
    return r.domElement.toDataURL();
  });
  r.dispose();
  return previews;
}

// A row of selectable cards, controlled with arrows, number keys or the mouse.
// Items are HTML strings, or { html, secret: true } for hidden cards: they go
// at the end and only appear when you press → on the last visible card.
function makeMenu(containerId, items, onPick) {
  items = items.map((item) => (typeof item === 'string' ? { html: item } : item));
  const lastVisible = items.findLastIndex((item) => !item.secret);
  const menu = { selected: 0, cards: [] };
  menu.select = (i) => {
    const next = (i + items.length) % items.length;
    if (next !== menu.selected) sound.play(items[next].secret ? 'secret' : 'select');
    menu.selected = next;
    menu.cards.forEach((card, j) => card.classList.toggle('selected', j === next));
  };
  menu.update = () => {
    // ← from the first card wraps to the last visible one (never to a secret)
    if (input.pressed('left')) menu.select(menu.selected === 0 ? lastVisible : menu.selected - 1);
    // → past the last visible card reveals the secret ones
    if (input.pressed('right')) menu.select(menu.selected + 1);
    items.forEach((item, i) => !item.secret && input.pressedCode(`Digit${i + 1}`) && menu.select(i));
    if (input.pressed('start')) onPick(menu.selected);
  };
  $(containerId).innerHTML = '';
  items.forEach(({ html, secret }, i) => {
    const card = document.createElement('div');
    card.className = secret ? 'card secret' : 'card';
    card.innerHTML = html;
    card.onmouseenter = () => menu.select(i);
    card.onclick = () => onPick(i);
    $(containerId).appendChild(card);
    menu.cards.push(card);
  });
  menu.select(0);
  return menu;
}

// --- Sound & settings --------------------------------------------------------
const input = new Input();
const sound = new Sound();

// Browsers only allow sound after the player interacts with the page.
addEventListener('keydown', () => sound.unlock());
addEventListener('pointerdown', () => sound.unlock());
addEventListener('keydown', (e) => {
  // Use the letter, not the key position, so M works on AZERTY keyboards too
  if (e.key.toLowerCase() === 'm') $('mute').textContent = sound.toggleMute() ? '🔇 M' : '🔊 M';
});

// Invincible mode: the hero can't lose health. On by default, remembered between visits.
let godMode = true;
try {
  godMode = localStorage.getItem('godMode') !== 'off';
} catch {}
function setGodMode(on) {
  godMode = on;
  try {
    localStorage.setItem('godMode', on ? 'on' : 'off');
  } catch {}
  if (game) game.player.invincible = on;
  $('god').textContent = on ? '⭐ INVINCIBLE (G)' : '';
  $('god-select').textContent = `Mode invincible : ${on ? 'ACTIVÉ ⭐' : 'DÉSACTIVÉ'} (touche G)`;
}
addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g') setGodMode(!godMode);
});

// --- Screens -----------------------------------------------------------------
// 'heroes' → 'levels' → 'game'
let screen = 'heroes';
let game = null;
let lastResult = null;
let heroId = null;
let levelIndex = 0;

const portraits = renderPortraits();
const heroMenu = makeMenu(
  'cards',
  heroIds.map((id, i) => {
    const c = CHARACTERS[id];
    const html = `
      <div class="portrait" style="--hero:${hex(c.color)}"><img src="${portraits[id]}" alt="${c.name}"></div>
      <h2>${c.hidden ? "👻" : i + 1 + "."} ${c.name}</h2>
      <div class="title">${c.title}</div>
      <div class="moves">J : ${MOVES[c.moves.attack].name}<br>K : ${MOVES[c.moves.special].name}</div>`;
    return { html, secret: !!c.hidden };
  }),
  (i) => {
    heroId = heroIds[i];
    sound.play('start');
    goTo('levels');
  },
);

const previews = renderLevelPreviews();
const levelMenu = makeMenu(
  'level-cards',
  LEVELS.map(
    (def, i) => `
      <img src="${previews[i]}" alt="${def.name}">
      <h2>${def.name}</h2>
      <div class="title">Boss : ${ENEMIES[def.boss]?.name ?? '?'}</div>`,
  ),
  (i) => startGame(heroId, i),
);
levelMenu.cards.forEach((c) => c.classList.add('level-card'));

function goTo(name) {
  screen = name;
  if (name !== 'game') {
    game = null;
    resetScene();
    sound.playMusic('forest');
  }
  show('select', name === 'heroes');
  show('levels', name === 'levels');
  show('hud', name === 'game');
  show('help', name === 'game');
  show('boss', false);
  show('level-name', false);
  showMessage(null);
}

function startGame(id, level) {
  heroId = id;
  levelIndex = level;
  goTo('game');
  resetScene();
  game = new Game(scene, heroId, sound, { godMode, levelIndex });
  lastResult = null;
  sound.play('start');
  $('player-name').textContent = CHARACTERS[heroId].name;
  $('level-name').textContent = LEVELS[levelIndex].name;
  show('level-name', true);
  setTimeout(() => game?.levelIndex === level && show('level-name', false), 2500);
}

function updateHud() {
  const p = game.player;
  $('player-hp').style.width = `${(p.hp / p.def.maxHp) * 100}%`;
  const boss = game.level.boss;
  show('boss', !!boss);
  if (boss) {
    $('boss-name').textContent =
      boss.def.name + (boss.shieldUp ? ' 🛡️' : '') + (boss.state === 'bow' ? ' 🙇 salue… frappe-le !' : '');
    $('boss-hp').style.width = `${(boss.hp / boss.def.maxHp) * 100}%`;
  }
  // Music: the level's song, boss theme while the boss is alive, jingle at the end.
  if (game.result !== lastResult) {
    lastResult = game.result;
    sound.playMusic(null);
    sound.play(game.result);
  } else if (!game.result) {
    sound.playMusic(boss?.alive ? 'boss' : game.level.def.music ?? 'forest');
  }
  const hasNextLevel = levelIndex + 1 < LEVELS.length;
  if (game.result === 'win' && hasNextLevel) showMessage('NIVEAU TERMINÉ&nbsp;!', 'Appuie sur Entrée pour le niveau suivant');
  if (game.result === 'win' && !hasNextLevel) showMessage('VICTOIRE&nbsp;!', 'Tu as fini tous les niveaux&nbsp;! Appuie sur Entrée pour rejouer');
  if (game.result === 'lose') showMessage('PERDU&nbsp;!', 'Appuie sur Entrée pour réessayer');
}

function updateGame(dt) {
  game.update(dt, input);
  updateHud();
  if (game.result && input.pressed('start')) {
    if (game.result === 'win' && levelIndex + 1 < LEVELS.length) startGame(heroId, levelIndex + 1);
    else if (game.result === 'lose') startGame(heroId, levelIndex);
    else goTo('heroes');
    return;
  }
  if (input.pressed('back')) return goTo('levels');

  const x = game.cameraX;
  camera.position.set(x, CAM_HEIGHT, CAM_DISTANCE);
  camera.lookAt(x, 0.9, 0);
  sun.position.set(x + 6, 12, 8);
  sun.target.position.set(x, 0, 0);
  renderer.render(scene, camera);
}

// --- Main loop -------------------------------------------------------------
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 1 / 30);

  if (screen === 'heroes') heroMenu.update();
  else if (screen === 'levels') {
    if (input.pressed('back')) goTo('heroes');
    else levelMenu.update();
  } else updateGame(dt);

  input.endFrame();
  requestAnimationFrame(tick);
}

goTo('heroes');
setGodMode(godMode);
// Handy for testing: ?hero=lutar&level=2 skips the menus.
const params = new URLSearchParams(location.search);
if (CHARACTERS[params.get('hero')]) startGame(params.get('hero'), Math.max(0, (+params.get('level') || 1) - 1) % LEVELS.length);
tick();
