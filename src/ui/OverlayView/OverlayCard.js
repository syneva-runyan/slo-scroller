import { createElement } from '../shared/createElement.js';
import { createBriefingSection } from './BriefingSection.js';

export function createOverlayCard(overlay) {
  const card = createElement('section', 'game-overlay-card');

  if (overlay.briefing) {
    const { briefing } = overlay;
    card.append(
      createElement('h2', 'game-overlay-title', briefing.title),
      createElement('p', 'game-overlay-subtitle', briefing.subtitle),
      createElement('p', 'game-overlay-body', briefing.intro),
      createBriefingSection('Objective', briefing.objective),
      createBriefingSection('Operational Note', briefing.operationalNote),
      createElement('p', 'game-overlay-cta', briefing.cta),
    );
    return card;
  }

  card.append(
    createElement('h2', 'game-overlay-title', overlay.title),
    createElement('p', 'game-overlay-subtitle', overlay.subtitle),
    createElement('p', 'game-overlay-body', overlay.body),
    createElement('p', 'game-overlay-cta', overlay.cta),
  );

  return card;
}