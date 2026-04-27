import test from 'node:test';
import assert from 'node:assert/strict';

import { AvailabilityTracker } from './AvailabilityTracker.js';

test('AvailabilityTracker recordCollisionIncident records marker and merged outage incidents', () => {
  const tracker = new AvailabilityTracker();
  const level = {
    durationSeconds: 20,
    availabilityWindowSeconds: 10,
    allowedBreaches: 2,
  };

  tracker.recordCollisionIncident(2, level, { kind: 'button' });
  tracker.recordCollisionIncident(3, level, { kind: 'button' });

  assert.deepEqual(tracker.progressHitMarkers, [0.1, 0.15]);
  assert.equal(tracker.getRollingAvailability(4, level), 0.8);
});

test('AvailabilityTracker handleObstacleCollision sets power trip timer for outage obstacles', () => {
  const tracker = new AvailabilityTracker();
  const level = {
    durationSeconds: 15,
    availabilityWindowSeconds: 10,
    targetAvailability: 0.75,
    allowedBreaches: 2,
  };
  const game = {
    elapsedSeconds: 5,
    powerTripTimer: 0,
    state: 'playing',
  };

  const didContinue = tracker.handleObstacleCollision(game, { id: 'availability' }, level, { kind: 'power-strip' });

  assert.equal(didContinue, true);
  assert.equal(game.state, 'playing');
  assert.equal(game.powerTripTimer, tracker.outageSeconds);
  assert.deepEqual(tracker.progressHitMarkers, [5 / 15]);
});

test('AvailabilityTracker handleObstacleCollision fails when target availability is breached', () => {
  const tracker = new AvailabilityTracker();
  const level = {
    durationSeconds: 15,
    availabilityWindowSeconds: 10,
    targetAvailability: 0.95,
    allowedBreaches: 0,
  };
  tracker.recordCollisionIncident(4, level, { kind: 'button' });
  const game = {
    elapsedSeconds: 5.2,
    powerTripTimer: 0,
    state: 'playing',
  };

  const didContinue = tracker.handleObstacleCollision(game, { id: 'availability' }, level, { kind: 'cart' });

  assert.equal(didContinue, false);
  assert.equal(game.state, 'failed');
});
