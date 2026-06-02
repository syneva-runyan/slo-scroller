import { GameTracker } from './GameTracker.js';

/**
 * Tracker for the response-time / latency track.
 *
 * Owns all of the speed, latency-penalty, and cache-boost state that is
 * specific to this track type so that Game.js does not need to branch on
 * `isResponseTimeTrack` for the implementation details.
 */
export class ResponseTimeTracker extends GameTracker {
  constructor() {
    super();
    this.currentScrollSpeed = 0;
    this.latencyPenaltyRemaining = 0;
    this.activePenaltyFactor = 1;
    this.cacheBoostRemaining = 0;
    this.cacheBoostFactor = 1;
  }

  reset() {
    super.reset();
    this.currentScrollSpeed = 0;
    this.latencyPenaltyRemaining = 0;
    this.activePenaltyFactor = 1;
    this.cacheBoostRemaining = 0;
    this.cacheBoostFactor = 1;
  }

  /** Seed the live scroll speed with the level's starting value. */
  primeForLevel(level) {
    this.currentScrollSpeed = level.scrollSpeed;
    this.latencyPenaltyRemaining = 0;
    this.activePenaltyFactor = 1;
    this.cacheBoostRemaining = 0;
    this.cacheBoostFactor = 1;
  }

  /**
   * Advance per-frame timers (speed ramp, penalty, boost) and return the
   * effective scroll speed to use this frame.
   */
  tickSpeed(deltaSeconds, level) {
    // Ramp scroll speed up toward the level's max.
    if (level.maxScrollSpeed != null && level.speedRampPerSecond) {
      this.currentScrollSpeed = Math.min(
        level.maxScrollSpeed,
        this.currentScrollSpeed + level.speedRampPerSecond * deltaSeconds,
      );
    } else {
      this.currentScrollSpeed = level.scrollSpeed;
    }
    this.latencyPenaltyRemaining = Math.max(0, this.latencyPenaltyRemaining - deltaSeconds);
    this.cacheBoostRemaining = Math.max(0, this.cacheBoostRemaining - deltaSeconds);
    return this.getEffectiveScrollSpeed();
  }

  get latencyActive() {
    return this.latencyPenaltyRemaining > 0;
  }

  get cacheBoostActive() {
    return this.cacheBoostRemaining > 0;
  }

  getEffectiveScrollSpeed() {
    const boost = this.cacheBoostActive ? this.cacheBoostFactor : 1;
    const penalty = this.latencyActive ? this.activePenaltyFactor : 1;
    return this.currentScrollSpeed * penalty * boost;
  }

  /** Apply a cache pickup: temporary speed boost and clear any active penalty. */
  applyCacheBoost(level) {
    if (!level.cacheBoost) return;
    this.cacheBoostRemaining = level.cacheBoost.durationSeconds;
    this.cacheBoostFactor = level.cacheBoost.boostFactor;
    this.latencyPenaltyRemaining = 0;
  }

  /**
   * Determine whether the level has ended.
   * Response-time levels finish when the player covers `goalDistance`;
   * if `durationSeconds` elapses first, they fail (too slow).
   */
  checkCompletion(game, level) {
    if (level.goalDistance == null) return null;
    if (game.distance >= level.goalDistance) return 'complete';
    if (game.elapsedSeconds >= level.durationSeconds) return 'failed';
    return null;
  }

  handleObstacleCollision(game, track, level, obstacle) {
    const result = super.handleObstacleCollision(game, track, level, obstacle);
    // Each breach imposes a temporary latency penalty (scroll slowdown)
    // on top of the breach count.
    if (level.latencyPenalty) {
      this.latencyPenaltyRemaining = level.latencyPenalty.durationSeconds;
      this.activePenaltyFactor = level.latencyPenalty.slowFactor;
    }
    return result;
  }
}
