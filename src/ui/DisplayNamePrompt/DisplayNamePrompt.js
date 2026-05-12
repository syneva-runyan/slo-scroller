import { getDisplayName, setDisplayName } from '../../game/identity.js';

/**
 * Prompts the player for a display name if they haven't set one yet.
 * Resolves with the display name (existing or newly entered).
 * Mounts a prompt over the game stage; removes itself when done.
 */
export function promptDisplayName(container) {
  const existing = getDisplayName();
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'display-name-backdrop';

    const card = document.createElement('div');
    card.className = 'display-name-card';

    const title = document.createElement('p');
    title.className = 'display-name-title';
    title.textContent = 'Enter your name for the leaderboard';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'display-name-input';
    input.placeholder = 'Your name';
    input.maxLength = 32;
    input.setAttribute('aria-label', 'Display name');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'display-name-submit';
    button.textContent = 'Save';

    function submit() {
      const name = input.value.trim() || 'Anonymous';
      setDisplayName(name);
      backdrop.remove();
      resolve(name);
    }

    button.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        submit();
      }
      // Prevent Space from triggering game jump while typing
      e.stopPropagation();
    });

    card.append(title, input, button);
    backdrop.append(card);
    container.append(backdrop);
    input.focus();
  });
}
