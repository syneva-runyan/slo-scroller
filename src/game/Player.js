const BASE_GRAVITY = 1725;
const BASE_JUMP_VELOCITY = -790;
const HIT_RECOVERY_SECONDS = 1.1;
// Give a slightly higher jump on mobile so clearing obstacles feels natural.
const MOBILE_JUMP_BOOST = 1.14;

export class Player {
  constructor({ x, groundY, spriteScale = 1 }) {
    this.spriteScale = spriteScale;
    this.gravity = BASE_GRAVITY * spriteScale;
    const jumpBoost = spriteScale > 1 ? MOBILE_JUMP_BOOST : 1;
    this.jumpVelocity = BASE_JUMP_VELOCITY * spriteScale * jumpBoost;
    this.x = x;
    this.groundY = groundY;
    this.width = 70 * spriteScale;
    this.height = 96 * spriteScale;
    // On mobile (spriteScale > 1) allow unlimited mid-air jumps; desktop keeps double jump.
    this.maxJumps = spriteScale > 1 ? Infinity : 2;
    this.reset();
  }

  reset() {
    this.y = this.groundY - this.height;
    this.velocityY = 0;
    this.onGround = true;
    this.jumpsUsed = 0;
    this.hitRecovery = 0;
  }

  update(deltaSeconds) {
    this.hitRecovery = Math.max(0, this.hitRecovery - deltaSeconds);
    this.velocityY += this.gravity * deltaSeconds;
    this.y += this.velocityY * deltaSeconds;

    if (this.y >= this.groundY - this.height) {
      this.y = this.groundY - this.height;
      this.velocityY = 0;
      this.onGround = true;
      this.jumpsUsed = 0;
    }
  }

  jump() {
    if (this.jumpsUsed >= this.maxJumps) {
      return;
    }

    this.velocityY = this.jumpVelocity;
    this.onGround = false;
    this.jumpsUsed += 1;
  }

  canTakeHit() {
    return this.hitRecovery <= 0;
  }

  registerHit() {
    this.hitRecovery = HIT_RECOVERY_SECONDS;
  }

  getBounds() {
    const s = this.spriteScale;
    return {
      x: this.x + 10 * s,
      y: this.y + 8 * s,
      width: this.width - 22 * s,
      height: this.height - 8 * s,
    };
  }
}