import { Fighter } from './Fighter.js';

export class Player extends Fighter {
  handleInput(input, dt) {
    let dx = 0, dz = 0;
    if (input.isDown('left')) dx -= 1;
    if (input.isDown('right')) dx += 1;
    if (input.isDown('up')) dz -= 1;
    if (input.isDown('down')) dz += 1;
    this.move(dx, dz, dt);
    if (input.pressed('jump')) this.jump();
    if (input.pressed('attack')) this.startAttack(this.def.moves.attack);
    if (input.pressed('special')) this.startAttack(this.def.moves.special);

    // How long has the player not touched the controls? (Maître Sushi notices.)
    const touched = dx || dz || ['jump', 'attack', 'special'].some((a) => input.pressed(a));
    this.stillTime = touched ? 0 : this.stillTime + dt;
  }
}
