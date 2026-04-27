export class Input {
  constructor(target) {
    this.jumpQueued = false;
    this.handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) {
          this.jumpQueued = true;
        }
      }
    };

    target.addEventListener('keydown', this.handleKeyDown);
    this.target = target;
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
  }
}