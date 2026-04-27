import './OverlayView.css';
import { createOverlayCard } from './OverlayCard.js';

function overlaySignature(overlay) {
  return JSON.stringify(overlay, (_, value) => (typeof value === 'function' ? undefined : value));
}

export class OverlayView {
  constructor(container) {
    this.container = container;
    this.root = document.createElement('div');
    this.root.className = 'game-overlay';
    this.container.append(this.root);
    this.lastSignature = null;
  }

  render(overlay) {
    if (!overlay) {
      if (this.lastSignature !== null) {
        this.lastSignature = null;
        this.root.hidden = true;
        this.root.replaceChildren();
      }
      return;
    }

    const sig = overlaySignature(overlay);
    if (sig === this.lastSignature) {
      return;
    }

    this.lastSignature = sig;
    this.root.hidden = false;
    this.root.replaceChildren(createOverlayCard(overlay));
  }
}