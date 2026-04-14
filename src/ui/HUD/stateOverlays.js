export function buildLevelCompleteOverlay(level, levelIndex, levelCount, breaches) {
  return {
    title: `Level ${levelIndex} complete`,
    subtitle: level.title,
    body: `${level.lesson} You finished this stage with ${breaches} breach${breaches === 1 ? '' : 'es'}, which stayed within the allowed budget.`,
    cta: levelIndex < levelCount ? 'Press Space to load the next SLA.' : 'Press Space to view the campaign summary.',
  };
}

export function buildFailedOverlay(level) {
  return {
    title: 'SLA breached',
    subtitle: level.title,
    body: `This level only allowed ${level.allowedBreaches} breach${level.allowedBreaches === 1 ? '' : 'es'}. Reset and try again to see how stricter SLAs reduce room for mistakes.`,
    cta: 'Press Space to retry the current level.',
  };
}

export function buildFinishedOverlay(track) {
  return {
    title: `${track.label} track complete`,
    subtitle: 'You cleared this SLA difficulty ladder',
    body: 'Use the concept menu to switch tracks, or press Space to restart the selected track from level 1.',
    cta: 'Press Space to restart this track.',
  };
}