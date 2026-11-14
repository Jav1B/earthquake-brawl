import * as THREE from 'three';
import { Input } from './core/Input.js';
import { Game } from './core/Game.js';
import { Sound } from './core/Sound.js';
import { CHARACTERS } from './data/characters.js';
import { MOVES } from './data/moves.js';

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
function resetScene() {
  scene.clear();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445533, 1.3));
  sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 });
  scene.add(sun, sun.target);
}

// --- UI --------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const show = (id, visible) => $(id).classList.toggle('hidden', !visible);
const heroIds = Object.keys(CHARACTERS);
let selected = 0;

function buildSelectScreen() {
  $('cards').innerHTML = '';
  heroIds.forEach((id, i) => {
    const c = CHARACTERS[id];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="swatch" style="background:#${c.color.toString(16).padStart(6, '0')}"></div>
      <h2>${i + 1}. ${c.name}</h2>
      <div class="title">${c.title}</div>
      <div class="moves">J: ${MOVES[c.moves.attack].name}<br>K: ${MOVES[c.moves.special].name}</div>`;
    card.onmouseenter = () => select(i);
    card.onclick = () => startGame(heroIds[i]);
    $('cards').appendChild(card);
  });
  select(selected);
}

function select(i) {
  const next = (i + heroIds.length) % heroIds.length;
  if (next !== selected) sound.play('select');
  selected = next;
  [...$('cards').children].forEach((card, j) => card.classList.toggle('selected', j === selected));
}

function showMessage(title, subtitle) {
  $('message').innerHTML = title ? `${title}<small>${subtitle}</small>` : '';
  show('message', !!title);
}

// --- Game flow -------------------------------------------------------------
const input = new Input();
const sound = new Sound();
let game = null;
let lastResult = null;

// Browsers only allow sound after the player interacts with the page.
addEventListener('keydown', () => sound.unlock());
addEventListener('pointerdown', () => sound.unlock());
addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') $('mute').textContent = sound.toggleMute() ? '🔇 M' : '🔊 M';
});

function startGame(heroId) {
  resetScene();
  game = new Game(scene, heroId, sound);
  lastResult = null;
  sound.play('start');
  sound.playMusic('forest');
  $('player-name').textContent = CHARACTERS[heroId].name;
  show('select', false);
  show('hud', true);
  show('help', true);
  showMessage(null);
}

function backToSelect() {
  game = null;
  sound.playMusic('forest');
  resetScene();
  show('select', true);
  show('hud', false);
  show('help', false);
  show('boss', false);
  showMessage(null);
}

function updateSelect() {
  if (input.pressed('left')) select(selected - 1);
  if (input.pressed('right')) select(selected + 1);
  heroIds.forEach((_, i) => input.pressedCode(`Digit${i + 1}`) && select(i));
  if (input.pressed('start')) startGame(heroIds[selected]);
}

function updateHud() {
  const p = game.player;
  $('player-hp').style.width = `${(p.hp / p.def.maxHp) * 100}%`;
  const boss = game.level.boss;
  show('boss', !!boss);
  if (boss) {
    $('boss-name').textContent = boss.def.name + (boss.shieldUp ? ' 🛡️' : '');
    $('boss-hp').style.width = `${(boss.hp / boss.def.maxHp) * 100}%`;
  }
  // Music: boss theme while the boss is alive, jingle when the game ends.
  if (game.result !== lastResult) {
    lastResult = game.result;
    sound.playMusic(null);
    sound.play(game.result);
  } else if (!game.result) {
    sound.playMusic(boss?.alive ? 'boss' : 'forest');
  }
  if (game.result === 'win') showMessage('STAGE CLEAR!', 'Press Enter to play again');
  if (game.result === 'lose') showMessage('GAME OVER', 'Press Enter to try again');
}

// --- Main loop -------------------------------------------------------------
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 1 / 30);

  if (!game) {
    updateSelect();
  } else {
    game.update(dt, input);
    updateHud();
    if (game.result && input.pressed('start')) backToSelect();

    const x = game.cameraX;
    camera.position.set(x, CAM_HEIGHT, CAM_DISTANCE);
    camera.lookAt(x, 0.9, 0);
    sun.position.set(x + 6, 12, 8);
    sun.target.position.set(x, 0, 0);
    renderer.render(scene, camera);
  }

  input.endFrame();
  requestAnimationFrame(tick);
}

resetScene();
buildSelectScreen();
sound.playMusic('forest');
// Handy for testing: ?hero=lutar skips the select screen.
const heroParam = new URLSearchParams(location.search).get('hero');
if (CHARACTERS[heroParam]) startGame(heroParam);
tick();
