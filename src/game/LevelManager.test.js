import test from 'node:test';
import assert from 'node:assert/strict';

import { LevelManager } from './LevelManager.js';

const levelTracks = [
  {
    id: 'availability',
    label: 'Availability',
    description: 'Track availability goals.',
    levels: [
      { id: 'availability-1', title: 'Availability 1' },
      { id: 'availability-2', title: 'Availability 2' },
    ],
  },
  {
    id: 'latency',
    label: 'Latency',
    description: 'Track response time goals.',
    levels: [
      { id: 'latency-1', title: 'Latency 1' },
      { id: 'latency-2', title: 'Latency 2' },
      { id: 'latency-3', title: 'Latency 3' },
    ],
  },
];

test('LevelManager exposes the active track in track menu items', () => {
  const manager = new LevelManager(levelTracks);

  assert.deepEqual(manager.getTrackMenuItems(), [
    {
      id: 'availability',
      label: 'Availability',
      description: 'Track availability goals.',
      levelCount: 2,
      active: true,
      progressLabel: 'Level 1 of 2',
    },
    {
      id: 'latency',
      label: 'Latency',
      description: 'Track response time goals.',
      levelCount: 3,
      active: false,
      progressLabel: '3 levels',
    },
  ]);
});

test('LevelManager advances until the final level and then stops', () => {
  const manager = new LevelManager(levelTracks);

  assert.equal(manager.advance(), true);
  assert.equal(manager.getCurrentLevel().id, 'availability-2');
  assert.equal(manager.advance(), false);
});

test('LevelManager resets progress when switching tracks', () => {
  const manager = new LevelManager(levelTracks);
  manager.advance();

  assert.equal(manager.selectTrack('latency'), true);
  assert.equal(manager.getCurrentTrack().id, 'latency');
  assert.equal(manager.getCurrentLevel().id, 'latency-1');
  assert.equal(manager.currentIndex, 0);
  assert.equal(manager.levelCount, 3);
});

test('LevelManager rejects unknown tracks without mutating state', () => {
  const manager = new LevelManager(levelTracks);

  assert.equal(manager.selectTrack('missing'), false);
  assert.equal(manager.getCurrentTrack().id, 'availability');
  assert.equal(manager.getCurrentLevel().id, 'availability-1');
});