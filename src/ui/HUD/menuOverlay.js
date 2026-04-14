export function buildMenuOverlay(track, levelCount) {
  return {
    title: 'Run the SLA lane',
    subtitle: `Track selected: ${track.label} (${levelCount} levels)`,
    body: 'Use the concept menu to switch between Availability, Response Time, and Error Budget. Each track contains three levels with increasing difficulty specific to that SLA.',
    cta: 'Press Space to open the selected track briefing.',
  };
}