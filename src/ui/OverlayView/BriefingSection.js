import { createElement } from '../shared/createElement.js';

export function createBriefingSection(label, text) {
  const section = createElement('section', 'game-overlay-section');
  section.append(
    createElement('h3', 'game-overlay-section-title', label),
    createElement('p', 'game-overlay-section-body', text),
  );
  return section;
}