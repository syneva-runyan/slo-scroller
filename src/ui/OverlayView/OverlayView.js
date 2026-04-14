import './OverlayView.css';
import { createOverlayCard } from './OverlayCard.js';

export class OverlayView {
  constructor(container) {
    this.container = container;
    this.root = document.createElement('div');
    this.root.className = 'game-overlay';
    this.container.append(this.root);
  }

  render(overlay) {
    if (!overlay) {
      this.root.hidden = true;
      this.root.replaceChildren();
      return;
    }

    this.root.hidden = false;
    this.root.replaceChildren(createOverlayCard(overlay));
  }
}