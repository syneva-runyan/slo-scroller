const GRAVITY = 1850;
const JUMP_VELOCITY = -760;
const HIT_RECOVERY_SECONDS = 1.1;

export class Player {
  constructor({ x, groundY }) {
    this.x = x;
    this.groundY = groundY;
    this.width = 70;
    this.height = 96;
    this.reset();
  }

  reset() {
    this.y = this.groundY - this.height;
    this.velocityY = 0;
    this.onGround = true;
    this.hitRecovery = 0;
  }

  update(deltaSeconds) {
    this.hitRecovery = Math.max(0, this.hitRecovery - deltaSeconds);
    this.velocityY += GRAVITY * deltaSeconds;
    this.y += this.velocityY * deltaSeconds;

    if (this.y >= this.groundY - this.height) {
      this.y = this.groundY - this.height;
      this.velocityY = 0;
      this.onGround = true;
    }
  }

  jump() {
    if (!this.onGround) {
      return;
    }

    this.velocityY = JUMP_VELOCITY;
    this.onGround = false;
  }

  canTakeHit() {
    return this.hitRecovery <= 0;
  }

  registerHit() {
    this.hitRecovery = HIT_RECOVERY_SECONDS;
  }

  getBounds() {
    return {
      x: this.x + 10,
      y: this.y + 8,
      width: this.width - 22,
      height: this.height - 8,
    };
  }
}