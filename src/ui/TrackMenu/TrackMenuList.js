import { createElement } from '../shared/createElement.js';

export function createTrackMenuList(tracks, { onSelectTrack }) {
  const list = document.createElement('div');
  list.className = 'track-menu-list';

  for (const track of tracks) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `track-menu-item${track.active ? ' is-active' : ''}`;
    button.addEventListener('click', () => onSelectTrack(track.id));
    button.append(
      createElement('span', 'track-menu-item-title', track.label),
      createElement('span', 'track-menu-item-copy', track.description),
      createElement('span', 'track-menu-item-meta', track.progressLabel),
    );
    list.append(button);
  }

  return list;
}