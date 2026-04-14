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
      operationalNote: 'Recurring hazards count as a reliability process problem.',
    },
    2,
  );

  assert.deepEqual(briefing, {
    title: 'Level 2: Availability II: 99.5% Uptime',
    subtitle: 'Availability target: 99.5% uptime',
    intro: 'Downtime windows get tighter as the target rises.',
    objective: 'Finish with one breach or fewer.',
    operationalNote: 'Recurring hazards count as a reliability process problem.',
    cta: 'Press Space to start this level.',
  });
});