import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMenuOverlay } from './menuOverlay.js';
import {
  buildFailedOverlay,
  buildFinishedOverlay,
  buildLevelCompleteOverlay,
} from './stateOverlays.js';

test('buildMenuOverlay includes the selected track label and level count', () => {
  const overlay = buildMenuOverlay({ label: 'Availability' }, 3);

  assert.equal(overlay.title, 'Run the SLA lane');
  assert.equal(overlay.subtitle, 'Track selected: Availability (3 levels)');
  assert.match(overlay.body, /Availability, Response Time, and Error Budget/);
});

test('buildLevelCompleteOverlay pluralizes breaches and changes CTA on the last level', () => {
  const earlyOverlay = buildLevelCompleteOverlay(
    { title: 'Availability I', lesson: 'Keep uptime steady.' },
    1,
    3,
    2,
  );
  const finalOverlay = buildLevelCompleteOverlay(
    { title: 'Availability III', lesson: 'Protect reliability continuously.' },
    3,
    3,
    1,
  );

  assert.match(earlyOverlay.body, /2 breaches/);
  assert.equal(earlyOverlay.cta, 'Press Space to load the next SLA.');
  assert.match(finalOverlay.body, /1 breach,/);
  assert.equal(finalOverlay.cta, 'Press Space to view the campaign summary.');
});

test('buildFailedOverlay singularizes the breach count when only one is allowed', () => {
  const overlay = buildFailedOverlay({ title: 'Response Time II', allowedBreaches: 1 });

  assert.equal(overlay.title, 'SLA breached');
  assert.match(overlay.body, /only allowed 1 breach\./);
});

test('buildFinishedOverlay reflects the completed track', () => {
  const overlay = buildFinishedOverlay({ label: 'Error Budget' });

  assert.equal(overlay.title, 'Error Budget track complete');
  assert.equal(overlay.cta, 'Press Space to restart this track.');
});