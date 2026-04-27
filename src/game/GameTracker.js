import { DEFAULT_WINDOW_SECONDS } from './constants.js';

/**
 * Base class for game tracking systems with shared experiment mode and rolling window management
 */
export class GameTracker {
  constructor() {
    this._progressHitMarkers = [];
    this._experimentMode = false;
    this._rollingTimeWindow = DEFAULT_WINDOW_SECONDS;
  }

  get progressHitMarkers() {
    return this._progressHitMarkers;
  }

  get experimentMode() {
    return this._experimentMode;
  }

  get rollingWindowSeconds() {
    return this._rollingTimeWindow;
  }

  reset() {
    this._progressHitMarkers = [];
  }

  toggleExperimentMode() {
    this._experimentMode = !this._experimentMode;
  }

  setRollingTimeWindowSeconds(value) {
    this._rollingTimeWindow = value;
  }

  getRollingTimeWindowSeconds(level) {
    if (this._experimentMode) {
      return this._rollingTimeWindow;
    }
    return level.availabilityWindowSeconds ?? DEFAULT_WINDOW_SECONDS;
  }

  recordCollisionIncident(elapsedSeconds, level, _obstacle) {
    this._progressHitMarkers.push(Math.min(1, elapsedSeconds / level.durationSeconds));
  }

  handleObstacleCollision(game, _track, level, _obstacle) {
    this.recordCollisionIncident(game.elapsedSeconds, level, _obstacle);
    game.breaches += 1;
    if (game.breaches > level.allowedBreaches) {
      game.state = 'failed';
      return false;
    }

    return true;
  }
}
