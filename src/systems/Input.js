export class Input {
  constructor(target, touchTarget = target) {
    this.jumpQueued = false;
    this.holdingKey = false;
    this.holdingTouch = false;
    this.holdReleasedQueued = false;

    this.handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) {
          this.jumpQueued = true;
          this.holdingKey = true;
        }
      }
    };

    this.handleKeyUp = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (this.holdingKey) {
          this.holdingKey = false;
          if (!this.holdingTouch) this.holdReleasedQueued = true;
        }
      }
    };

    this.handleTouchStart = (event) => {
      event.preventDefault();
      this.jumpQueued = true;
      this.holdingTouch = true;
    };

    this.handleTouchEnd = (event) => {
      if (event.cancelable) event.preventDefault();
      if (this.holdingTouch) {
        this.holdingTouch = false;
        if (!this.holdingKey) this.holdReleasedQueued = true;
      }
    };

    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    touchTarget.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    touchTarget.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    touchTarget.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
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

  isHolding() {
    return this.holdingKey || this.holdingTouch;
  }

  consumeHoldRelease() {
    if (!this.holdReleasedQueued) return false;
    this.holdReleasedQueued = false;
    return true;
  }

  destroy() {
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.touchTarget.removeEventListener('touchstart', this.handleTouchStart);
    this.touchTarget.removeEventListener('touchend', this.handleTouchEnd);
    this.touchTarget.removeEventListener('touchcancel', this.handleTouchEnd);
  }
}