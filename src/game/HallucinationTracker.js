import { GameTracker } from './GameTracker.js';

/**
 * Tracks disposition decisions on the AI-trust track. The player jumps to flag
 * a hallucination and lets grounded answers pass underneath to ship them.
 *
 * Breaches accumulate from two distinct failure modes:
 *   - falseAccepts: a hallucination was shipped (player collided with it).
 *   - falseRejects: a grounded answer was suppressed (player jumped over it).
 *
 * Both contribute to the same `game.breaches` budget so that the existing fail
 * check (`breaches > allowedBreaches`) keeps working unchanged.
 */
export class HallucinationTracker extends GameTracker {
  constructor() {
    super();
    this._correctDispositions = 0;
    this._falseAccepts = 0;
    this._falseRejects = 0;
  }

  reset() {
    super.reset();
    this._correctDispositions = 0;
    this._falseAccepts = 0;
    this._falseRejects = 0;
  }

  get falseAccepts() {
    return this._falseAccepts;
  }

  get falseRejects() {
    return this._falseRejects;
  }

  get correctDispositions() {
    return this._correctDispositions;
  }

  get totalDispositions() {
    return this._correctDispositions + this._falseAccepts + this._falseRejects;
  }

  getAccuracy() {
    const total = this.totalDispositions;
    if (total === 0) {
      return 1;
    }
    return this._correctDispositions / total;
  }

  recordCorrectDisposition() {
    this._correctDispositions += 1;
  }

  /**
   * Player collided with a hallucination -> shipped it. Counts as a breach and
   * may fail the run if the allowance is exceeded.
   */
  handleObstacleCollision(game, _track, level, _obstacle) {
    this._falseAccepts += 1;
    this.recordCollisionIncident(game.elapsedSeconds, level, _obstacle);
    game.breaches += 1;
    if (game.breaches > level.allowedBreaches) {
      game.state = 'failed';
      return false;
    }
    return true;
  }

  /**
   * Player jumped while overlapping a grounded answer -> suppressed it.
   * Counts as a breach and may fail the run if the allowance is exceeded.
   */
  handleFalseReject(game, level, obstacle) {
    this._falseRejects += 1;
    this.recordCollisionIncident(game.elapsedSeconds, level, obstacle);
    game.breaches += 1;
    if (game.breaches > level.allowedBreaches) {
      game.state = 'failed';
      return false;
    }
    return true;
  }
}
