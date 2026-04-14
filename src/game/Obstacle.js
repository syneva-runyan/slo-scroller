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
  }

  update(deltaSeconds, scrollSpeed) {
    this.x -= scrollSpeed * deltaSeconds;
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