import { buildLevelBriefing } from './buildLevelBriefing.js';

export class LevelBriefing {
  build(level, levelIndex, experimentWindowSeconds = null) {
    return buildLevelBriefing(level, levelIndex, experimentWindowSeconds);
  }
}