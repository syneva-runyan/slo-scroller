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

  setWindowSeconds(value) {
    this._rollingTimeWindow = value;
  }

  getWindowSeconds(level) {
    if (this._experimentMode) {
      return this._rollingTimeWindow;
    }
    return level.availabilityWindowSeconds ?? DEFAULT_WINDOW_SECONDS;
  }
}
