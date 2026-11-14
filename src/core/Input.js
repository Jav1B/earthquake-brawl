// Keyboard input. `isDown` for held keys, `pressed` for one-frame taps.
const BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space'],
  attack: ['KeyJ'],
  special: ['KeyK'],
  start: ['Enter'],
};

export class Input {
  constructor() {
    this.down = new Set();
    this.justPressed = new Set();
    addEventListener('keydown', (e) => {
      if (!e.repeat) this.justPressed.add(e.code);
      this.down.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
  }
  isDown(action) { return BINDINGS[action].some((k) => this.down.has(k)); }
  pressed(action) { return BINDINGS[action].some((k) => this.justPressed.has(k)); }
  pressedCode(code) { return this.justPressed.has(code); }
  endFrame() { this.justPressed.clear(); }
}
