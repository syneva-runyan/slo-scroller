import test from 'node:test';
import assert from 'node:assert/strict';

import { GameTracker } from './GameTracker.js';

test('GameTracker records collision incidents as progress markers', () => {
  const tracker = new GameTracker();
  tracker.recordCollisionIncident(3, { durationSeconds: 12 });

  assert.deepEqual(tracker.progressHitMarkers, [0.25]);
});

test('GameTracker handleObstacleCollision increments breaches and preserves running state under budget', () => {
  const tracker = new GameTracker();
  const game = {
    breaches: 0,
    state: 'playing',
    elapsedSeconds: 2,
  };

  const didContinue = tracker.handleObstacleCollision(game, { id: 'response-time' }, { durationSeconds: 10, allowedBreaches: 2 }, { kind: 'cable' });

  assert.equal(didContinue, true);
  assert.equal(game.breaches, 1);
  assert.equal(game.state, 'playing');
  assert.deepEqual(tracker.progressHitMarkers, [0.2]);
});

test('GameTracker handleObstacleCollision fails the run when breaches exceed budget', () => {
  const tracker = new GameTracker();
  const game = {
    breaches: 2,
    state: 'playing',
    elapsedSeconds: 8,
  };

  const didContinue = tracker.handleObstacleCollision(game, { id: 'response-time' }, { durationSeconds: 10, allowedBreaches: 2 }, { kind: 'server' });

  assert.equal(didContinue, false);
  assert.equal(game.breaches, 3);
  assert.equal(game.state, 'failed');
  assert.deepEqual(tracker.progressHitMarkers, [0.8]);
});
