import { LevelBriefing } from '../LevelBriefing/LevelBriefing.js';
import { buildMenuOverlay } from './menuOverlay.js';
import {
  buildFailedOverlay,
  buildFinishedOverlay,
  buildLevelCompleteOverlay,
} from './stateOverlays.js';
import { isAvailabilityTrack } from '../../game/trackUtils.js';

export class HUD {
  constructor() {
    this.levelBriefing = new LevelBriefing();
  }

  getOverlay({ state, level, track, breaches, rollingAvailability, availabilityTarget, levelIndex, levelCount, experimentMode, rollingWindowSeconds, leaderboard, hallucination }) {
    if (state === 'menu') {
      return buildMenuOverlay(track, levelCount);
    }

    if (state === 'level-intro') {
      const expWindow = experimentMode && isAvailabilityTrack(track) ? rollingWindowSeconds : null;
      return {
        briefing: this.levelBriefing.build(level, levelIndex, expWindow),
      };
    }

    if (state === 'level-complete') {
      const overlay = buildLevelCompleteOverlay(level, track, levelIndex, levelCount, breaches, rollingAvailability, availabilityTarget, hallucination);
      overlay.leaderboard = leaderboard ?? 'loading';
      return overlay;
    }

    if (state === 'failed') {
      return buildFailedOverlay(level, track, rollingAvailability, availabilityTarget, hallucination);
    }

    if (state === 'finished') {
      return buildFinishedOverlay(track);
    }

    return null;
  }
}