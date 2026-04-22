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

  getOverlay({ state, level, track, breaches, rollingAvailability, availabilityTarget, levelIndex, levelCount, experimentMode, experimentWindowSeconds }) {
    if (state === 'menu') {
      return buildMenuOverlay(track, levelCount);
    }

    if (state === 'level-intro') {
      const expWindow = experimentMode && isAvailabilityTrack(track) ? experimentWindowSeconds : null;
      return {
        briefing: this.levelBriefing.build(level, levelIndex, expWindow),
      };
    }

    if (state === 'level-complete') {
      return buildLevelCompleteOverlay(level, track, levelIndex, levelCount, breaches, rollingAvailability, availabilityTarget);
    }

    if (state === 'failed') {
      return buildFailedOverlay(level, track, rollingAvailability, availabilityTarget);
    }

    if (state === 'finished') {
      return buildFinishedOverlay(track);
    }

    return null;
  }
}