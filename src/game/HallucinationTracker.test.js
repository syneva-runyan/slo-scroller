import test from 'node:test';
import assert from 'node:assert/strict';

import { HallucinationTracker } from './HallucinationTracker.js';

test('HallucinationTracker starts at 100% accuracy with no dispositions', () => {
  const tracker = new HallucinationTracker();
  assert.equal(tracker.getAccuracy(), 1);
  assert.equal(tracker.totalDispositions, 0);
});

test('HallucinationTracker records correct dispositions', () => {
  const tracker = new HallucinationTracker();
  tracker.recordCorrectDisposition();
  tracker.recordCorrectDisposition();
  assert.equal(tracker.correctDispositions, 2);
  assert.equal(tracker.getAccuracy(), 1);
});

test('HallucinationTracker handleObstacleCollision counts a false accept and a breach', () => {
  const tracker = new HallucinationTracker();
  const game = { breaches: 0, state: 'playing', elapsedSeconds: 3 };

  const didContinue = tracker.handleObstacleCollision(
    game,
    { id: 'ai-hallucination' },
    { durationSeconds: 12, allowedBreaches: 2 },
    { kind: 'ai-answer', disposition: 'hallucination' },
  );

  assert.equal(didContinue, true);
  assert.equal(tracker.falseAccepts, 1);
  assert.equal(tracker.falseRejects, 0);
  assert.equal(game.breaches, 1);
  assert.equal(game.state, 'playing');
  assert.deepEqual(tracker.progressHitMarkers, [0.25]);
});

test('HallucinationTracker handleFalseReject counts a false reject and a breach', () => {
  const tracker = new HallucinationTracker();
  const game = { breaches: 0, state: 'playing', elapsedSeconds: 6 };

  const didContinue = tracker.handleFalseReject(
    game,
    { durationSeconds: 12, allowedBreaches: 2 },
    { kind: 'ai-answer', disposition: 'grounded' },
  );

  assert.equal(didContinue, true);
  assert.equal(tracker.falseAccepts, 0);
  assert.equal(tracker.falseRejects, 1);
  assert.equal(game.breaches, 1);
  assert.equal(game.state, 'playing');
  assert.deepEqual(tracker.progressHitMarkers, [0.5]);
});

test('HallucinationTracker fails the run when total breaches exceed the allowance', () => {
  const tracker = new HallucinationTracker();
  const level = { durationSeconds: 10, allowedBreaches: 1 };
  const game = { breaches: 1, state: 'playing', elapsedSeconds: 4 };

  const didContinue = tracker.handleObstacleCollision(
    game,
    { id: 'ai-hallucination' },
    level,
    { kind: 'ai-answer', disposition: 'hallucination' },
  );

  assert.equal(didContinue, false);
  assert.equal(game.breaches, 2);
  assert.equal(game.state, 'failed');
});

test('HallucinationTracker accuracy reflects a mix of dispositions', () => {
  const tracker = new HallucinationTracker();
  const level = { durationSeconds: 10, allowedBreaches: 5 };
  const game = { breaches: 0, state: 'playing', elapsedSeconds: 2 };

  tracker.recordCorrectDisposition();
  tracker.recordCorrectDisposition();
  tracker.recordCorrectDisposition();
  tracker.handleObstacleCollision(game, { id: 'ai-hallucination' }, level, { kind: 'ai-answer' });

  // 3 correct out of 4 dispositions = 75%
  assert.equal(tracker.totalDispositions, 4);
  assert.equal(tracker.getAccuracy(), 0.75);
});

test('HallucinationTracker reset clears disposition counters', () => {
  const tracker = new HallucinationTracker();
  const game = { breaches: 0, state: 'playing', elapsedSeconds: 1 };
  tracker.recordCorrectDisposition();
  tracker.handleObstacleCollision(
    game,
    { id: 'ai-hallucination' },
    { durationSeconds: 10, allowedBreaches: 5 },
    { kind: 'ai-answer' },
  );

  tracker.reset();

  assert.equal(tracker.correctDispositions, 0);
  assert.equal(tracker.falseAccepts, 0);
  assert.equal(tracker.falseRejects, 0);
  assert.equal(tracker.totalDispositions, 0);
  assert.equal(tracker.getAccuracy(), 1);
  assert.deepEqual(tracker.progressHitMarkers, []);
});
