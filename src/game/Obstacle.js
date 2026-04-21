export class Obstacle {
  constructor({ x, groundY, width, height, color, label, kind = 'crate' }) {
    this.x = x;
    this.groundY = groundY;
    this.width = width;
    this.height = height;
    this.color = color;
    this.label = label;
    this.kind = kind;
    this.hit = false;
    this.squashTimer = 0;
  }

  update(deltaSeconds, scrollSpeed) {
    this.x -= scrollSpeed * deltaSeconds;
    this.squashTimer = Math.max(0, this.squashTimer - deltaSeconds);
  }

  isOffscreen() {
    return this.x + this.width < -40;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.groundY - this.height,
      width: this.width,
      height: this.height,
    };
  }
}