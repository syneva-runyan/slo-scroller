import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLevelBriefing } from './buildLevelBriefing.js';

test('buildLevelBriefing maps level content into overlay briefing copy', () => {
  const briefing = buildLevelBriefing(
    {
      title: 'Availability II: 99.5% Uptime',
      concept: 'Availability target: 99.5% uptime',
      lesson: 'Downtime windows get tighter as the target rises.',
      objective: 'Finish with one breach or fewer.',
    },
    2,
  );

  assert.deepEqual(briefing, {
    title: 'Level 2: Availability II: 99.5% Uptime',
    subtitle: 'Availability target: 99.5% uptime',
    intro: 'Downtime windows get tighter as the target rises.',
    objective: 'Finish with one breach or fewer.',
    targetLabel: undefined,
    cta: 'Press Space to start this level.',
  });
});

test('buildLevelBriefing uses a custom briefing CTA when provided', () => {
  const briefing = buildLevelBriefing(
    {
      title: 'Availability Lab',
      concept: 'Target: 75% availability in a rolling 10s window',
      lesson: 'Tune the knobs and see how the math changes.',
      objective: 'Keep the rolling window above target.',
      briefingCta: 'Use Left/Right and Up/Down to tune the lab, then press Space to start.',
    },
    1,
  );

  assert.equal(briefing.cta, 'Use Left/Right and Up/Down to tune the lab, then press Space to start.');
});