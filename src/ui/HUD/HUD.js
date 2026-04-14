import { LevelBriefing } from '../LevelBriefing/LevelBriefing.js';
import { buildMenuOverlay } from './menuOverlay.js';
import {
  buildFailedOverlay,
  buildFinishedOverlay,
  buildLevelCompleteOverlay,
} from './stateOverlays.js';

export class HUD {
  constructor() {
    this.levelBriefing = new LevelBriefing();
  }

  getOverlay({ state, level, track, breaches, levelIndex, levelCount }) {
    if (state === 'menu') {
      return buildMenuOverlay(track, levelCount);
    }

    if (state === 'level-intro') {
      return {
        briefing: this.levelBriefing.build(level, levelIndex),
      };
    }

    if (state === 'level-complete') {
      return buildLevelCompleteOverlay(level, levelIndex, levelCount, breaches);
    }

    if (state === 'failed') {
      return buildFailedOverlay(level);
    }

    if (state === 'finished') {
      return buildFinishedOverlay(track);
    }

    return null;
  }
}