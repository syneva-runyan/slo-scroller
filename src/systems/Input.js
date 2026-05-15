export class Input {
  constructor(target, touchTarget = target) {
    this.jumpQueued = false;
    this.handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) {
          this.jumpQueued = true;
        }
      }
    };

    this.handleTouchStart = (event) => {
      event.preventDefault();
      this.jumpQueued = true;
    };

    target.addEventListener('keydown', this.handleKeyDown);
    touchTarget.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.target = target;
    this.touchTarget = touchTarget;
  }

  consumeJump() {
    if (!this.jumpQueued) {
      return false;
    }

    this.jumpQueued = false;
    return true;
  }

  destroy() {
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.touchTarget.removeEventListener('touchstart', this.handleTouchStart);
  }
}