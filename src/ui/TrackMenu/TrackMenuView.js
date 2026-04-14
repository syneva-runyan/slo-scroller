import './TrackMenu.css';
import { createTrackMenuHeader } from './TrackMenuHeader.js';
import { createTrackMenuList } from './TrackMenuList.js';

export class TrackMenuView {
  constructor(container, { onSelectTrack }) {
    this.container = container;
    this.onSelectTrack = onSelectTrack;
    this.root = document.createElement('aside');
    this.root.className = 'track-menu';
    this.container.append(this.root);
    this.lastSignature = '';
  }

  render({ tracks, activeTrack }) {
    const signature = JSON.stringify({ tracks, activeTrackId: activeTrack.id });
    if (signature === this.lastSignature) {
      return;
    }

    this.lastSignature = signature;
    this.root.replaceChildren(
      createTrackMenuHeader(activeTrack),
      createTrackMenuList(tracks, { onSelectTrack: this.onSelectTrack }),
    );
  }
}