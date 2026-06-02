import { GameTracker } from './GameTracker.js';

const SAMPLE_INTERVAL_SECONDS = 0.5;
const SAMPLE_BUFFER_CAP = 80;
const TIMEOUT_LATENCY_FACTOR = 3;
const MIN_SAMPLES_FOR_PERCENTILE = 5;
const DEFAULT_TARGET_PERCENTILE = 0.95;
const ALLOWED_PERCENTILES = [0.5, 0.9, 0.95, 0.99];

/**
 * Tracker for the response-time / latency track.
 *
 * Owns all of the speed, latency-penalty, and cache-boost state that is
 * specific to this track type so that Game.js does not need to branch on
 * `isResponseTimeTrack` for the implementation details. Also collects a
 * rolling buffer of synthetic latency samples that backs experiment-mode's
 * real measured-percentile SLO gate.
 */
export class ResponseTimeTracker extends GameTracker {
  constructor() {
    super();
    this.currentScrollSpeed = 0;
    this.latencyPenaltyRemaining = 0;
    this.activePenaltyFactor = 1;
    this.cacheBoostRemaining = 0;
    this.cacheBoostFactor = 1;
    this._samples = [];
    this._sampleTimer = 0;
    this._targetPercentile = DEFAULT_TARGET_PERCENTILE;
  }

  reset() {
    super.reset();
    this.currentScrollSpeed = 0;
    this.latencyPenaltyRemaining = 0;
    this.activePenaltyFactor = 1;
    this.cacheBoostRemaining = 0;
    this.cacheBoostFactor = 1;
    this._samples = [];
    this._sampleTimer = 0;
  }

  /** Seed the live scroll speed with the level's starting value. */
  primeForLevel(level) {
    this.currentScrollSpeed = level.scrollSpeed;
    this.latencyPenaltyRemaining = 0;
    this.activePenaltyFactor = 1;
    this.cacheBoostRemaining = 0;
    this.cacheBoostFactor = 1;
    this._samples = [];
    this._sampleTimer = 0;
  }

  get targetPercentile() {
    return this._targetPercentile;
  }

  setTargetPercentile(value) {
    const num = Number(value);
    if (ALLOWED_PERCENTILES.includes(num)) {
      this._targetPercentile = num;
    }
  }

  /**
   * Advance per-frame timers (speed ramp, penalty, boost) and return the
   * effective scroll speed to use this frame. Also accumulates synthetic
   * latency samples on a fixed cadence.
   */
  tickSpeed(deltaSeconds, level) {
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

    const effectiveSpeed = this.getEffectiveScrollSpeed();
    this._sampleTimer += deltaSeconds;
    while (this._sampleTimer >= SAMPLE_INTERVAL_SECONDS) {
      this._sampleTimer -= SAMPLE_INTERVAL_SECONDS;
      if (level.baseLatencyMs != null && effectiveSpeed > 0) {
        const latencyMs = (level.baseLatencyMs * level.scrollSpeed) / effectiveSpeed;
        this.recordRequestSample(latencyMs);
      }
    }
    return effectiveSpeed;
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

  /** Push a latency sample into the rolling buffer (FIFO drop oldest). */
  recordRequestSample(latencyMs) {
    if (!Number.isFinite(latencyMs) || latencyMs < 0) return;
    this._samples.push(latencyMs);
    if (this._samples.length > SAMPLE_BUFFER_CAP) {
      this._samples.shift();
    }
  }

  /** Record a "timed-out request" sample (3x the level's baseline). */
  recordTimeout(level) {
    if (level?.baseLatencyMs == null) return;
    this.recordRequestSample(level.baseLatencyMs * TIMEOUT_LATENCY_FACTOR);
  }

  get sampleCount() {
    return this._samples.length;
  }

  /**
   * Linear-interpolation percentile (matches numpy's default behaviour).
   * Returns null until enough samples have been collected.
   */
  getPercentile(p) {
    if (this._samples.length < MIN_SAMPLES_FOR_PERCENTILE) return null;
    const sorted = [...this._samples].sort((a, b) => a - b);
    const idx = p * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  /**
   * Experiment-mode pass check: measured target-percentile latency must be
   * at or below the level's baseLatencyMs. Returns false if not enough
   * samples have been collected to compute a percentile.
   */
  meetsPercentileTarget(level) {
    if (level?.baseLatencyMs == null) return true;
    const measured = this.getPercentile(this._targetPercentile);
    if (measured == null) return false;
    return measured <= level.baseLatencyMs;
  }

  /**
   * Determine whether the level has ended.
   * Standard mode: finish on goalDistance reached, fail on timeout.
   * Experiment mode: same distance/timeout, but reaching the finish only
   * counts as a pass if the measured target-percentile latency met its SLO.
   */
  checkCompletion(game, level) {
    if (level.goalDistance == null) return null;
    if (game.distance >= level.goalDistance) {
      if (this.experimentMode && !this.meetsPercentileTarget(level)) {
        return 'failed';
      }
      return 'complete';
    }
    if (game.elapsedSeconds >= level.durationSeconds) return 'failed';
    return null;
  }

  handleObstacleCollision(game, track, level, obstacle) {
    let result;
    if (this.experimentMode) {
      // Experiment mode: percentile SLO replaces the breach-count gate, so
      // a breach is purely a latency event (records a timeout sample, bumps
      // the breach counter for the HUD, but never fails the run on its own).
      this.recordCollisionIncident(game.elapsedSeconds, level, obstacle);
      game.breaches += 1;
      result = true;
    } else {
      result = super.handleObstacleCollision(game, track, level, obstacle);
    }

    this.recordTimeout(level);
    if (level.latencyPenalty) {
      this.latencyPenaltyRemaining = level.latencyPenalty.durationSeconds;
      this.activePenaltyFactor = level.latencyPenalty.slowFactor;
    }
    return result;
  }
}
