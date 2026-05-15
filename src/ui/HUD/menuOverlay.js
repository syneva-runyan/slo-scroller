import { ctaAction } from '../shared/ctaText.js';

export function buildMenuOverlay(track, levelCount) {
  return {
    title: 'Run the SLO lane',
    subtitle: `Track selected: ${track.label}`,
    body: 'Use the concept menu to switch between Availability, Response Time, and Error Budget. Each track contains three levels with increasing difficulty specific to that SLO.',
    cta: `${ctaAction} to open the selected track briefing.`,
  };
}