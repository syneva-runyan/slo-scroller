const PLAYER_ID_KEY = 'slo_scroller_player_id';
const DISPLAY_NAME_KEY = 'slo_scroller_display_name';

export function getOrCreatePlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getDisplayName() {
  return localStorage.getItem(DISPLAY_NAME_KEY);
}

export function setDisplayName(name) {
  localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
}
