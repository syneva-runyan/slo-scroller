import test from 'node:test';
import assert from 'node:assert/strict';

import { intersects } from './Collision.js';

test('intersects returns true for overlapping rectangles', () => {
  assert.equal(
    intersects(
      { x: 10, y: 20, width: 40, height: 30 },
      { x: 35, y: 30, width: 50, height: 20 },
    ),
    true,
  );
});

test('intersects returns false when rectangles are separated', () => {
  assert.equal(
    intersects(
      { x: 10, y: 20, width: 40, height: 30 },
      { x: 60, y: 20, width: 25, height: 25 },
    ),
    false,
  );
});

test('intersects treats touching edges as non-overlapping', () => {
  assert.equal(
    intersects(
      { x: 10, y: 20, width: 40, height: 30 },
      { x: 50, y: 20, width: 25, height: 25 },
    ),
    false,
  );
});