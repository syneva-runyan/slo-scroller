import test from 'node:test';
import assert from 'node:assert/strict';

import { updateElapsedSeconds } from './timer.js';

test('updateElapsedSeconds advances while the run is active', () => {
  assert.equal(updateElapsedSeconds(3.2, 0.5, 'playing'), 3.7);
});

test('updateElapsedSeconds stops advancing after an SLA breach', () => {
  assert.equal(updateElapsedSeconds(4.8, 1.25, 'failed'), 4.8);
});

test('updateElapsedSeconds stays unchanged for menu and completion states', () => {
  assert.equal(updateElapsedSeconds(0, 2, 'menu'), 0);
  assert.equal(updateElapsedSeconds(9.1, 0.3, 'level-complete'), 9.1);
  assert.equal(updateElapsedSeconds(12.4, 0.8, 'finished'), 12.4);
});