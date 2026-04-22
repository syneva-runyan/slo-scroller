import { createElement } from '../shared/createElement.js';

export function createTrackMenuHeader(activeTrack) {
  const header = document.createElement('div');
  header.className = 'track-menu-header';
  header.append(
    createElement('p', 'track-menu-kicker', 'SLO Concepts'),
    createElement('h2', 'track-menu-title', activeTrack.label),
  );
  return header;
}