import test from 'node:test';
import assert from 'node:assert/strict';

import { ResponseTimeTracker } from './ResponseTimeTracker.js';

const baseLevel = {
  id: 'rt-test',
  scrollSpeed: 200,
  maxScrollSpeed: 400,
  speedRampPerSecond: 50,
  durationSeconds: 30,
  goalDistance: 1000,
  allowedBreaches: 2,
  baseLatencyMs: 400,
  latencyPenalty: { slowFactor: 0.5, durationSeconds: 2 },
};

function fillSamples(tracker, values) {
  for (const v of values) tracker.recordRequestSample(v);
}

test('getPercentile returns null until min samples collected', () => {
  const t = new ResponseTimeTracker();
  fillSamples(t, [10, 20, 30, 40]);
  assert.equal(t.getPercentile(0.5), null);
  t.recordRequestSample(50);
  assert.equal(t.getPercentile(0.5), 30);
});

test('getPercentile uses linear interpolation', () => {
  const t = new ResponseTimeTracker();
  fillSamples(t, [100, 200, 300, 400, 500]);
  // p95 over [100,200,300,400,500]: idx = 0.95 * 4 = 3.8 -> 400 + 0.8*(500-400) = 480
  assert.equal(t.getPercentile(0.95), 480);
  assert.equal(t.getPercentile(0.5), 300);
});

test('recordRequestSample enforces FIFO buffer cap', () => {
  const t = new ResponseTimeTracker();
  for (let i = 0; i < 100; i += 1) t.recordRequestSample(i);
  // cap is 80; oldest 20 should be evicted, newest sample is 99
  assert.equal(t.sampleCount, 80);
  // p100-ish should be 99
  assert.equal(t.getPercentile(1), 99);
  // smallest remaining sample is 20
  assert.equal(t.getPercentile(0), 20);
});

test('recordTimeout pushes 3x baseLatencyMs', () => {
  const t = new ResponseTimeTracker();
  t.recordTimeout(baseLevel);
  assert.equal(t._samples[0], 1200);
});

test('setTargetPercentile only accepts allowed values', () => {
  const t = new ResponseTimeTracker();
  t.setTargetPercentile(0.9);
  assert.equal(t.targetPercentile, 0.9);
  t.setTargetPercentile(0.42);
  assert.equal(t.targetPercentile, 0.9);
});

test('meetsPercentileTarget false until enough samples, then compares to baseline', () => {
  const t = new ResponseTimeTracker();
  t.setTargetPercentile(0.95);
  fillSamples(t, [100, 200, 300, 400]);
  assert.equal(t.meetsPercentileTarget(baseLevel), false);
  fillSamples(t, [350, 350, 350, 350, 350, 350]); // p95 well under 400
  assert.equal(t.meetsPercentileTarget(baseLevel), true);
  // Push a couple of timeouts to lift the tail past 400
  for (let i = 0; i < 5; i += 1) t.recordTimeout(baseLevel);
  assert.equal(t.meetsPercentileTarget(baseLevel), false);
});

test('experiment-mode handleObstacleCollision never fails the run on breach budget', () => {
  const t = new ResponseTimeTracker();
  t.toggleExperimentMode();
  const game = { breaches: 5, state: 'playing', elapsedSeconds: 4, distance: 100 };
  const result = t.handleObstacleCollision(game, { id: 'response-time' }, baseLevel, { kind: 'cable' });
  assert.equal(result, true);
  assert.equal(game.state, 'playing');
  assert.equal(game.breaches, 6);
  // Should have recorded a timeout sample
  assert.equal(t._samples.length, 1);
  assert.equal(t._samples[0], 1200);
  // Latency penalty applied
  assert.equal(t.latencyActive, true);
});

test('standard-mode handleObstacleCollision still fails when breach budget exceeded', () => {
  const t = new ResponseTimeTracker();
  const game = { breaches: 2, state: 'playing', elapsedSeconds: 4, distance: 100 };
  const result = t.handleObstacleCollision(game, { id: 'response-time' }, baseLevel, { kind: 'cable' });
  assert.equal(result, false);
  assert.equal(game.state, 'failed');
  // Timeout sample still recorded
  assert.equal(t._samples.includes(1200), true);
});

test('checkCompletion in standard mode passes at goalDistance regardless of percentile', () => {
  const t = new ResponseTimeTracker();
  const game = { distance: 1000, elapsedSeconds: 10 };
  assert.equal(t.checkCompletion(game, baseLevel), 'complete');
});

test('checkCompletion in experiment mode requires percentile target to pass', () => {
  const t = new ResponseTimeTracker();
  t.toggleExperimentMode();
  const game = { distance: 1000, elapsedSeconds: 10 };
  // Not enough samples yet -> meetsPercentileTarget false -> failed
  assert.equal(t.checkCompletion(game, baseLevel), 'failed');
  // Add good samples (all well below 400 baseline)
  fillSamples(t, [100, 120, 140, 160, 180]);
  assert.equal(t.checkCompletion(game, baseLevel), 'complete');
  // Now push timeouts to blow p95
  for (let i = 0; i < 8; i += 1) t.recordTimeout(baseLevel);
  assert.equal(t.checkCompletion(game, baseLevel), 'failed');
});

test('tickSpeed accumulates samples at the 0.5s cadence', () => {
  const t = new ResponseTimeTracker();
  t.primeForLevel(baseLevel);
  // 1.2 seconds of ticking at small deltas -> two samples (at 0.5s and 1.0s)
  for (let i = 0; i < 12; i += 1) t.tickSpeed(0.1, baseLevel);
  assert.equal(t.sampleCount, 2);
});

test('primeForLevel and reset clear samples + timer', () => {
  const t = new ResponseTimeTracker();
  fillSamples(t, [1, 2, 3]);
  t._sampleTimer = 0.4;
  t.primeForLevel(baseLevel);
  assert.equal(t.sampleCount, 0);
  assert.equal(t._sampleTimer, 0);

  fillSamples(t, [4, 5, 6]);
  t._sampleTimer = 0.3;
  t.reset();
  assert.equal(t.sampleCount, 0);
  assert.equal(t._sampleTimer, 0);
});
