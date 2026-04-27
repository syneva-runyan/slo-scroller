import { createElement } from '../shared/createElement.js';
import { createBriefingSection } from './BriefingSection.js';

function createOverlayBodyNodes(body) {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => createElement('p', 'game-overlay-body', paragraph));
}

export function createOverlayCard(overlay) {
  const cardToneClass = overlay.tone ? ` game-overlay-card--${overlay.tone}` : '';
  const card = createElement('section', `game-overlay-card${cardToneClass}`);

  if (overlay.briefing) {
    const { briefing } = overlay;
    card.append(
      createElement('h2', 'game-overlay-title', briefing.title),
      createElement('p', 'game-overlay-subtitle', briefing.subtitle),
      createElement('p', 'game-overlay-body', briefing.intro),
      createBriefingSection('Objective', briefing.objective),
      createElement('p', 'game-overlay-cta', briefing.cta),
    );
    return card;
  }

  if (overlay.eyebrow) {
    card.append(createElement('p', 'game-overlay-eyebrow', overlay.eyebrow));
  }

  card.append(
    createElement('h2', 'game-overlay-title', overlay.title),
    createElement('p', 'game-overlay-subtitle', overlay.subtitle),
  );

  card.append(...createOverlayBodyNodes(overlay.body));
  card.append(createElement('p', 'game-overlay-cta', overlay.cta));

  return card;
}