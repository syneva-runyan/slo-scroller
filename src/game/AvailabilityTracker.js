import { OUTAGE_SECONDS, TARGET_EPSILON } from './constants.js';
import { GameTracker } from './GameTracker.js';

export class AvailabilityTracker extends GameTracker {
  constructor() {
    super();
    this._incidents = [];
  }

  reset() {
    super.reset();
    this._incidents = [];
  }

  getTarget(level) {
    if (level.targetAvailability != null) {
      return level.targetAvailability;
    }
    const windowSeconds = this.getRollingTimeWindowSeconds(level);
    return Math.max(0, 1 - (level.allowedBreaches * OUTAGE_SECONDS) / windowSeconds);
  }

  recordCollisionIncident(elapsedSeconds, level, _obstacle) {
    super.recordCollisionIncident(elapsedSeconds, level, _obstacle);
    const startTime = elapsedSeconds;
    const endTime = startTime + OUTAGE_SECONDS;
    const last = this._incidents[this._incidents.length - 1];

    if (last && startTime <= last.endTime) {
      last.endTime = Math.max(last.endTime, endTime);
    } else {
      this._incidents.push({ startTime, endTime });
    }

    const windowStart = elapsedSeconds - this.getRollingTimeWindowSeconds(level);
    this._incidents = this._incidents.filter((i) => i.endTime >= windowStart);
  }

  getRollingAvailability(elapsedSeconds, level) {
    const windowSeconds = this.getRollingTimeWindowSeconds(level);
    const windowStart = elapsedSeconds - windowSeconds;
    let unavailableSeconds = 0;

    for (const incident of this._incidents) {
      const overlapStart = Math.max(windowStart, incident.startTime);
      const overlapEnd = Math.min(elapsedSeconds, incident.endTime);
      if (overlapEnd > overlapStart) {
        unavailableSeconds += overlapEnd - overlapStart;
      }
    }

    return Math.max(0, Math.min(1, 1 - unavailableSeconds / windowSeconds));
  }

  meetsTarget(elapsedSeconds, level) {
    return this.getRollingAvailability(elapsedSeconds, level) + TARGET_EPSILON >= this.getTarget(level);
  }

  handleObstacleCollision(game, _track, level, obstacle) {
    this.recordCollisionIncident(game.elapsedSeconds, level, obstacle);
    if (obstacle.kind === 'button' || obstacle.kind === 'power-strip') {
      game.powerTripTimer = this.outageSeconds;
    }

    if (!this.meetsTarget(game.elapsedSeconds, level)) {
      game.state = 'failed';
      return false;
    }

    return true;
  }

  get outageSeconds() {
    return OUTAGE_SECONDS;
  }
}
