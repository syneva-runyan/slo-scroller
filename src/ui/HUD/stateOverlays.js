import { isAvailabilityTrack, isAIHallucinationTrack } from '../../game/trackUtils.js';
import { ctaAction } from '../shared/ctaText.js';

export function buildLevelCompleteOverlay(level, track, levelIndex, levelCount, breaches, rollingAvailability, availabilityTarget, hallucination = null) {
  if (isAvailabilityTrack(track)) {
    return {
      tone: 'success',
      eyebrow: 'SLO locked in',
      title: `Level ${levelIndex} complete!`,
      subtitle: level.title,
      body: `${level.lesson} \n\n   You closed this stage with rolling availability at ${(rollingAvailability * 100).toFixed(0)}%, safely above the ${(availabilityTarget * 100).toFixed(0)}% target. The service stayed usable enough to keep the promise.`,
      cta: levelIndex < levelCount ? `${ctaAction} to load the next SLO.` : `${ctaAction} to view the campaign summary.`,
    };
  }

  if (isAIHallucinationTrack(track) && hallucination) {
    const accuracy = (hallucination.getAccuracy() * 100).toFixed(0);
    return {
      tone: 'success',
      eyebrow: 'AI trust held',
      title: `Level ${levelIndex} complete!`,
      subtitle: level.title,
      body: `${level.lesson}\n\n   You closed with ${accuracy}% disposition accuracy: ${hallucination.falseAccepts} hallucination${hallucination.falseAccepts === 1 ? '' : 's'} shipped and ${hallucination.falseRejects} grounded answer${hallucination.falseRejects === 1 ? '' : 's'} suppressed, within the allowed budget.`,
      cta: levelIndex < levelCount ? `${ctaAction} to load the next SLO.` : `${ctaAction} to view the campaign summary.`,
    };
  }

  return {
    tone: 'success',
    eyebrow: 'Run cleared',
    title: `Level ${levelIndex} complete!`,
    subtitle: level.title,
    body: `${level.lesson} You finished this stage with ${breaches} breach${breaches === 1 ? '' : 'es'}, which stayed within the allowed budget and kept the run on track.`,
    cta: levelIndex < levelCount ? `${ctaAction} to load the next SLO.` : `${ctaAction} to view the campaign summary.`,
  };
}

export function buildFailedOverlay(level, track, rollingAvailability, availabilityTarget, hallucination = null) {
  if (isAvailabilityTrack(track)) {
    return {
      title: 'SLO breached',
      subtitle: level.title,
      body: `Your rolling availability dropped to ${(rollingAvailability * 100).toFixed(0)}%, below the ${(availabilityTarget * 100).toFixed(0)}% target. Reset and try again to keep the service usable more consistently.`,
      cta: `${ctaAction} to retry the current level.`,
    };
  }

  if (isAIHallucinationTrack(track) && hallucination) {
    return {
      title: 'AI trust breached',
      subtitle: level.title,
      body: `You shipped ${hallucination.falseAccepts} hallucination${hallucination.falseAccepts === 1 ? '' : 's'} and suppressed ${hallucination.falseRejects} grounded answer${hallucination.falseRejects === 1 ? '' : 's'}, exceeding the ${level.allowedBreaches}-misdisposition allowance. Reset and try again — jump only on the unsourced ones.`,
      cta: `${ctaAction} to retry the current level.`,
    };
  }

  return {
    title: 'SLO breached',
    subtitle: level.title,
    body: `This level only allowed ${level.allowedBreaches} breach${level.allowedBreaches === 1 ? '' : 'es'}. Reset and try again to see how stricter SLOs reduce room for mistakes.`,
    cta: `${ctaAction} to retry the current level.`,
  };
}

export function buildFinishedOverlay(track) {
  return {
    title: `${track.label} track complete`,
    subtitle: 'You cleared this SLO difficulty ladder',
    body: `Use the concept menu to switch tracks, or tap to restart the selected track from level 1.`,
    cta: `${ctaAction} to restart this track.`,
  };
}