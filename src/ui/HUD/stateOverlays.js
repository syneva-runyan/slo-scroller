import { isAvailabilityTrack } from '../../game/trackUtils.js';

export function buildLevelCompleteOverlay(level, track, levelIndex, levelCount, breaches, rollingAvailability, availabilityTarget) {
  if (isAvailabilityTrack(track)) {
    return {
      tone: 'success',
      eyebrow: 'SLO locked in',
      title: `Level ${levelIndex} complete!`,
      subtitle: level.title,
      body: `${level.lesson} \n\n   You closed this stage with rolling availability at ${(rollingAvailability * 100).toFixed(0)}%, safely above the ${(availabilityTarget * 100).toFixed(0)}% target. The service stayed usable enough to keep the promise.`,
      cta: levelIndex < levelCount ? 'Press Space to load the next SLO.' : 'Press Space to view the campaign summary.',
    };
  }

  return {
    tone: 'success',
    eyebrow: 'Run cleared',
    title: `Level ${levelIndex} complete!`,
    subtitle: level.title,
    body: `${level.lesson} You finished this stage with ${breaches} breach${breaches === 1 ? '' : 'es'}, which stayed within the allowed budget and kept the run on track.`,
    cta: levelIndex < levelCount ? 'Press Space to load the next SLO.' : 'Press Space to view the campaign summary.',
  };
}

export function buildFailedOverlay(level, track, rollingAvailability, availabilityTarget) {
  if (isAvailabilityTrack(track)) {
    return {
      title: 'SLO breached',
      subtitle: level.title,
      body: `Your rolling availability dropped to ${(rollingAvailability * 100).toFixed(0)}%, below the ${(availabilityTarget * 100).toFixed(0)}% target. Reset and try again to keep the service usable more consistently.`,
      cta: 'Press Space to retry the current level.',
    };
  }

  return {
    title: 'SLO breached',
    subtitle: level.title,
    body: `This level only allowed ${level.allowedBreaches} breach${level.allowedBreaches === 1 ? '' : 'es'}. Reset and try again to see how stricter SLOs reduce room for mistakes.`,
    cta: 'Press Space to retry the current level.',
  };
}

export function buildFinishedOverlay(track) {
  return {
    title: `${track.label} track complete`,
    subtitle: 'You cleared this SLO difficulty ladder',
    body: 'Use the concept menu to switch tracks, or press Space to restart the selected track from level 1.',
    cta: 'Press Space to restart this track.',
  };
}