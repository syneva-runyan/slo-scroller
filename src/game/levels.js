import { Hammer } from '../systems/Hammer.js';

const defaultTrackBehavior = {
  onPlayingJump(game) {
    game.player.jump();
    game.sfx.playJump();
  },
  onUpdate() {},
  getCollisionBounds() {
    return null;
  },
  handleCollisionBoundsHit() {},
  getControlText({ isTouchDevice }) {
    return isTouchDevice ? 'Control: tap to jump' : 'Control: press Space to jump';
  },
};

function startHammerSwing(game) {
  if (game.hammerStrike) {
    return;
  }

  game.hammerStrike = {
    phase: Hammer.WINDUP_PHASE,
    elapsed: 0,
    duration: Hammer.WINDUP_RAMP_SECONDS,
    angle: Hammer.REST_ANGLE,
    connected: false,
    targetX: null,
    targetY: null,
  };
}

function updateHammerState(game, deltaSeconds) {
  if (game.state !== 'playing') {
    return;
  }

  const holding = game.input.isHolding();
  const released = game.input.consumeHoldRelease();

  if (game.hammerStrike?.phase === Hammer.WINDUP_PHASE) {
    game.hammerStrike.elapsed = Math.min(
      Hammer.WINDUP_RAMP_SECONDS,
      game.hammerStrike.elapsed + deltaSeconds,
    );
    const progress = game.hammerStrike.elapsed / Hammer.WINDUP_RAMP_SECONDS;
    game.hammerStrike.angle = Hammer.REST_ANGLE
      + (Hammer.MAX_WINDUP_ANGLE - Hammer.REST_ANGLE) * progress;
    if (released || !holding) {
      game.sfx.playStrike();
      game.hammerStrike = {
        phase: Hammer.STRIKE_PHASE,
        elapsed: 0,
        duration: Hammer.STRIKE_SECONDS,
        startAngle: game.hammerStrike.angle,
        angle: game.hammerStrike.angle,
        connected: false,
        targetX: null,
        targetY: null,
      };
    }
    return;
  }

  if (game.hammerStrike?.phase === Hammer.STRIKE_PHASE) {
    game.hammerStrike.elapsed = Math.min(
      Hammer.STRIKE_SECONDS,
      game.hammerStrike.elapsed + deltaSeconds,
    );
    const raw = game.hammerStrike.elapsed / Hammer.STRIKE_SECONDS;
    const eased = 1 - (1 - raw) * (1 - raw);
    game.hammerStrike.angle = game.hammerStrike.startAngle
      + (Hammer.END_STRIKE_ANGLE - game.hammerStrike.startAngle) * eased;
    if (game.hammerStrike.elapsed >= Hammer.STRIKE_SECONDS) {
      game.hammerStrike = null;
    }
    return;
  }

  if (holding) {
    startHammerSwing(game);
    game.sfx.playWindup({ rampSeconds: Hammer.WINDUP_RAMP_SECONDS });
  }
}

function getHammerBounds(game) {
  if (!game.hammerStrike
      || game.hammerStrike.phase !== Hammer.STRIKE_PHASE
      || game.hammerStrike.connected) {
    return null;
  }

  const progress = Math.min(1, game.hammerStrike.elapsed / game.hammerStrike.duration);
  if (progress < 0.25 || progress > 0.95) {
    return null;
  }

  return {
    x: game.player.x + 28,
    y: game.player.y - 18,
    width: 92 + progress * 54,
    height: 132,
  };
}

const errorBudgetTrackBehavior = {
  ...defaultTrackBehavior,
  onPlayingJump() {},
  onUpdate(game, deltaSeconds) {
    updateHammerState(game, deltaSeconds);
  },
  getCollisionBounds(game) {
    return getHammerBounds(game);
  },
  handleCollisionBoundsHit(game, obstacle) {
    obstacle.squashTimer = Hammer.STRIKE_SECONDS;
    game.hammerStrike.connected = true;
    game.hammerStrike.targetX = obstacle.x + obstacle.width * 0.5;
    game.hammerStrike.targetY = obstacle.groundY - obstacle.height * 0.45;
    game.sfx.playSquash();
  },
  getControlText({ isTouchDevice }) {
    return isTouchDevice
      ? 'Control: hold to wind up, release to smash'
      : 'Control: hold Space to wind up, release to smash';
  },
};

const aiTrackBehavior = {
  ...defaultTrackBehavior,
  getControlText({ isTouchDevice }) {
    return isTouchDevice
      ? 'Control: tap to flag a hallucination — let grounded answers pass'
      : 'Control: press Space to flag a hallucination — let grounded answers pass';
  },
};

export const levelTracks = [
  {
    id: 'availability',
    label: 'Availability',
    description: 'Availability measures how often a service is up and usable.',
    behavior: defaultTrackBehavior,
    levels: [
      {
        id: 'availability-1',
        title: '75% Availability',
        lesson: 'Availability measures how often a service is up and usable. A 75% availability target means the service needs to stay usable for most of the rolling window.',
        objective: 'Reach the finish while keeping the rolling 10s window at or above 75% availability.',
        targetLabel: 'Keep the rolling 10s window at or above 75% availability.',
        concept: 'Target: 75% availability in a rolling 10s window',
        durationSeconds: 15,
        goalDistance: 1800,
        scrollSpeed: 355,
        spawnInterval: 1.75,
        spawnVariance: 0.3,
        targetAvailability: 0.75,
        availabilityWindowSeconds: 10,
        allowedBreaches: 2,
        obstacleProfiles: [
          { width: 114, height: 82, color: '#ffb347', label: 'SHIP IT', kind: 'button' },
          { width: 76, height: 40, color: '#ff8f3c', label: 'floor plug', kind: 'power-strip' },
        ],
      },
      {
        id: 'availability-2',
        title: '85% Availability',
        lesson: 'Availability SLOs get stricter as the allowed downtime window gets smaller. At 85% availability, the service still has some room for mistakes, but repeated interruptions will push the rolling window below target quickly.',
        objective: 'Complete the aisle while keeping the rolling 10s window at or above 85% availability as hazard density increases.',
        targetLabel: 'Keep the rolling 10s window at or above 85% availability.',
        concept: 'Target: 85% availability in a rolling 10s window',
        durationSeconds: 15,
        goalDistance: 2250,
        scrollSpeed: 380,
        spawnInterval: 1.42,
        spawnVariance: 0.38,
        targetAvailability: 0.85,
        availabilityWindowSeconds: 10,
        allowedBreaches: 1,
        obstacleProfiles: [
          { width: 120, height: 85, color: '#ffb347', label: 'SHIP IT', kind: 'button' },
          { width: 84, height: 46, color: '#ff8f3c', label: 'power strip', kind: 'power-strip' },
          { width: 54, height: 76, color: '#cc6950', label: 'service cone', kind: 'cart' },
        ],
      },
      {
        id: 'availability-3',
        title: '99.9% Availability',
        lesson: 'A 99.9% availability target means downtime must be rare and brief. This concept is about protecting reliability continuously, because even one preventable outage can break the promise.',
        objective: 'Reach the finish with the rolling 10s window at or above 99.9% availability by clearing every SHIP IT button and power strip.',
        targetLabel: 'Keep the rolling 10s window at or above 99.9% availability.',
        concept: 'Target: 99.9% availability in a rolling 10s window',
        durationSeconds: 15,
        goalDistance: 2600,
        scrollSpeed: 390,
        spawnInterval: 1.28,
        spawnVariance: 0.42,
        targetAvailability: 0.999,
        availabilityWindowSeconds: 10,
        allowedBreaches: 0,
        obstacleProfiles: [
          { width: 120, height: 85, color: '#ffb347', label: 'SHIP IT', kind: 'button' },
          { width: 84, height: 46, color: '#ff8f3c', label: 'power strip', kind: 'power-strip' },
        ],
      },
    ],
  },
  {
    id: 'response-time',
    label: 'Response Time',
    description: 'Response-time SLOs measure how quickly a service answers a request.',
    behavior: defaultTrackBehavior,
    levels: [
      {
        id: 'response-time-1',
        title: 'P95 under 400 ms',
        lesson: 'Response-time SLOs measure how quickly a service answers requests. A p95 target means 95% of requests must finish within the promised threshold, even if a few outliers are slower.',
        objective: 'Sprint to the finish in as little time as possible — each breach costs you latency. Grab a glowing CACHE box to surge ahead and shake off any active slowdown.',
        targetLabel: 'Reach the finish fast. Max 2 breaches; each breach adds latency.',
        concept: 'Target: p95 under 400 ms',
        durationSeconds: 30,
        goalDistance: 6000,
        scrollSpeed: 400,
        maxScrollSpeed: 620,
        speedRampPerSecond: 18,
        baseLatencyMs: 400,
        latencyPenalty: { slowFactor: 0.55, durationSeconds: 1.2 },
        cacheBoost: { boostFactor: 1.35, durationSeconds: 2.0 },
        spawnInterval: 1.35,
        spawnVariance: 0.28,
        allowedBreaches: 2,
        obstacleProfiles: [
          { width: 120, height: 28, color: '#ffbf69', label: 'cable bundle', kind: 'cable' },
          { width: 48, height: 74, color: '#d65d45', label: 'tool cart', kind: 'cart' },
          { width: 58, height: 58, color: '#38bdf8', label: 'CACHE', kind: 'cache' },
        ],
      },
      {
        id: 'response-time-2',
        title: 'P95 under 300 ms',
        lesson: 'As response-time targets get tighter, teams have less room for slowdowns caused by load, queueing, or inefficient systems. The concept here is consistency, not just occasional speed.',
        objective: 'Sprint to the finish; a single breach now costs more latency. Run through a CACHE box for a brief speed boost that also clears any slowdown.',
        targetLabel: 'Reach the finish fast. Max 1 breach; each breach adds latency.',
        concept: 'Target: p95 under 300 ms',
        durationSeconds: 32,
        goalDistance: 7400,
        scrollSpeed: 450,
        maxScrollSpeed: 720,
        speedRampPerSecond: 22,
        baseLatencyMs: 300,
        latencyPenalty: { slowFactor: 0.5, durationSeconds: 1.4 },
        cacheBoost: { boostFactor: 1.4, durationSeconds: 2.0 },
        spawnInterval: 1.14,
        spawnVariance: 0.32,
        allowedBreaches: 1,
        obstacleProfiles: [
          { width: 132, height: 30, color: '#ffbf69', label: 'cable bundle', kind: 'cable' },
          { width: 56, height: 88, color: '#d65d45', label: 'tool cart', kind: 'cart' },
          { width: 60, height: 60, color: '#38bdf8', label: 'CACHE', kind: 'cache' },
        ],
      },
      {
        id: 'response-time-3',
        title: 'P95 under 250 ms',
        lesson: 'A strict latency SLO such as p95 under 250 ms means the system must stay fast under pressure. The concept is that predictable performance is part of reliability, not a nice-to-have.',
        objective: 'Push to the finish without breaching — every slowdown costs precious time. Snag a CACHE box whenever it appears for a big speed boost and instant slowdown reset.',
        targetLabel: 'Reach the finish fast. Max 1 breach; each breach adds heavy latency.',
        concept: 'Target: p95 under 250 ms',
        durationSeconds: 34,
        goalDistance: 9000,
        scrollSpeed: 500,
        maxScrollSpeed: 820,
        speedRampPerSecond: 26,
        baseLatencyMs: 250,
        latencyPenalty: { slowFactor: 0.45, durationSeconds: 1.5 },
        cacheBoost: { boostFactor: 1.45, durationSeconds: 2.0 },
        spawnInterval: 1.02,
        spawnVariance: 0.34,
        allowedBreaches: 1,
        obstacleProfiles: [
          { width: 132, height: 30, color: '#ffbf69', label: 'cable bundle', kind: 'cable' },
          { width: 56, height: 88, color: '#d65d45', label: 'tool cart', kind: 'cart' },
          { width: 68, height: 90, color: '#8d6576', label: 'open rack door', kind: 'server' },
          { width: 62, height: 62, color: '#38bdf8', label: 'CACHE', kind: 'cache' },
        ],
      },
    ],
  },
  {
    id: 'error-budget',
    label: 'Error Budget',
    description: 'An error budget is the amount of unreliability a service can spend while still meeting its SLO.',
    behavior: errorBudgetTrackBehavior,
    levels: [
      {
        id: 'error-budget-1',
        title: '5% Budget',
        lesson: 'An error budget is the amount of unreliability a service can spend while still meeting its SLO. Here, that allowance is framed as room to hammer scroller bugs flat before they pile up into a user-facing failure.',
        objective: 'Ship the run while hammering enough scroller bugs to stay within 4 breaches.',
        targetLabel: 'Finish the run while keeping bug-related breaches at or below 4.',
        concept: 'Target: preserve a 5% error budget',
        durationSeconds: 15,
        goalDistance: 2200,
        scrollSpeed: 390,
        spawnInterval: 1.22,
        spawnVariance: 0.24,
        allowedBreaches: 4,
        obstacleProfiles: [
          { width: 70, height: 104, color: '#8e4c3f', label: 'sticky collision bug', kind: 'sticky-bug' },
          { width: 132, height: 30, color: '#ffcf7b', label: 'scroll hitch bug', kind: 'scroll-hitch' },
        ],
      },
      {
        id: 'error-budget-2',
        title: '2% Budget',
        lesson: 'When the error budget gets smaller, teams must be more selective about risk. In this pass, that means the scroller can tolerate fewer unresolved bugs before the release tradeoff turns against you, so the hammer needs to come down faster.',
        objective: 'Hold the release together with no more than 3 breaches as bug types stack up faster and demand quicker hammer hits.',
        targetLabel: 'Finish the run while keeping bug-related breaches at or below 3.',
        concept: 'Target: protect a 2% error budget',
        durationSeconds: 15,
        goalDistance: 2850,
        scrollSpeed: 455,
        spawnInterval: 1.08,
        spawnVariance: 0.26,
        allowedBreaches: 3,
        obstacleProfiles: [
          { width: 74, height: 118, color: '#8e4c3f', label: 'sticky collision bug', kind: 'sticky-bug' },
          { width: 144, height: 34, color: '#ffcf7b', label: 'scroll hitch bug', kind: 'scroll-hitch' },
          { width: 62, height: 92, color: '#557b8f', label: 'render glitch bug', kind: 'server' },
        ],
      },
      {
        id: 'error-budget-3',
        title: '1% Budget',
        lesson: 'A tight error budget means there is very little room for incidents before the SLO is breached. At this point the scroller needs disciplined bug triage, because even a couple of unresolved defects can break the reliability promise if you do not hammer them out in time.',
        objective: 'Close out the run with no more than 2 breaches across collision, scrolling, and rendering bugs by smashing each one on sight.',
        targetLabel: 'Finish the run while keeping bug-related breaches at or below 2.',
        concept: 'Target: protect a 1% error budget',
        durationSeconds: 15,
        goalDistance: 3400,
        scrollSpeed: 520,
        spawnInterval: 1.02,
        spawnVariance: 0.28,
        allowedBreaches: 2,
        obstacleProfiles: [
          { width: 74, height: 118, color: '#8e4c3f', label: 'sticky collision bug', kind: 'sticky-bug' },
          { width: 144, height: 34, color: '#ffcf7b', label: 'scroll hitch bug', kind: 'scroll-hitch' },
          { width: 68, height: 96, color: '#557b8f', label: 'render glitch bug', kind: 'server' },
        ],
      },
    ],
  },
  {
    id: 'ai-hallucination',
    label: 'AI Trust',
    description: 'Ship grounded answers; reject hallucinations.',
    behavior: aiTrackBehavior,
    levels: [
      {
        id: 'ai-hallucination-1',
        title: 'Cite Your Sources',
        lesson: 'An AI-trust SLO measures how reliably the system rejects hallucinations and ships grounded answers. Most answers here are well-sourced; hallucinations are loud. Jump to flag a hallucination; let grounded answers pass to ship them.',
        objective: 'Finish with 3 or fewer misdispositions (hallucinations shipped or grounded answers suppressed).',
        targetLabel: 'Disposition accuracy ≥ 80%. Max 3 misdispositions.',
        concept: 'Target: 80% disposition accuracy (\u22643 misdispositions)',
        briefingCta: 'Press Space to flag a hallucination. Do nothing to ship a grounded answer.',
        durationSeconds: 15,
        goalDistance: 1900,
        scrollSpeed: 360,
        spawnInterval: 1.6,
        spawnVariance: 0.3,
        allowedBreaches: 3,
        obstacleProfiles: [
          { width: 132, height: 78, color: '#2dd4bf', label: 'cited answer', kind: 'ai-answer', disposition: 'grounded' },
          { width: 132, height: 78, color: '#a855f7', label: 'fabricated fact', kind: 'ai-answer', disposition: 'hallucination' },
          { width: 132, height: 78, color: '#2dd4bf', label: 'sourced reply', kind: 'ai-answer', disposition: 'grounded' },
        ],
      },
      {
        id: 'ai-hallucination-2',
        title: 'Trust But Verify',
        lesson: 'As models sound more fluent, hallucinations get harder to spot. Tighter SLOs leave less room to ship confident nonsense or suppress good answers. Flag only what is unsourced; ship what is grounded.',
        objective: 'Finish with 2 or fewer misdispositions as hallucinations grow more plausible.',
        targetLabel: 'Disposition accuracy ≥ 90%. Max 2 misdispositions.',
        concept: 'Target: 90% disposition accuracy (\u22642 misdispositions)',
        briefingCta: 'Press Space to flag a hallucination. Do nothing to ship a grounded answer.',
        durationSeconds: 15,
        goalDistance: 2400,
        scrollSpeed: 440,
        spawnInterval: 1.25,
        spawnVariance: 0.32,
        allowedBreaches: 2,
        obstacleProfiles: [
          { width: 138, height: 82, color: '#2dd4bf', label: 'cited answer', kind: 'ai-answer', disposition: 'grounded' },
          { width: 138, height: 82, color: '#a855f7', label: 'plausible-but-wrong', kind: 'ai-answer', disposition: 'hallucination' },
          { width: 138, height: 82, color: '#22d3ee', label: 'verified summary', kind: 'ai-answer', disposition: 'grounded' },
          { width: 138, height: 82, color: '#c084fc', label: 'made-up citation', kind: 'ai-answer', disposition: 'hallucination' },
        ],
      },
      {
        id: 'ai-hallucination-3',
        title: 'Confidently Wrong',
        lesson: 'At the strictest SLO, even confident outputs need grounding. One missed hallucination breaks trust; one suppressed real answer wastes a correct response. Every output is a deliberate decision.',
        objective: 'Finish with 1 or fewer misdispositions when hallucinations look nearly identical to grounded answers.',
        targetLabel: 'Disposition accuracy ≥ 98%. Max 1 misdisposition.',
        concept: 'Target: 98% disposition accuracy (\u22641 misdisposition)',
        briefingCta: 'Press Space to flag a hallucination. Do nothing to ship a grounded answer.',
        durationSeconds: 15,
        goalDistance: 2900,
        scrollSpeed: 510,
        spawnInterval: 1.0,
        spawnVariance: 0.32,
        allowedBreaches: 1,
        obstacleProfiles: [
          { width: 144, height: 86, color: '#2dd4bf', label: 'cited answer', kind: 'ai-answer', disposition: 'grounded' },
          { width: 144, height: 86, color: '#a855f7', label: 'fake URL cite', kind: 'ai-answer', disposition: 'hallucination' },
          { width: 144, height: 86, color: '#22d3ee', label: 'grounded reply', kind: 'ai-answer', disposition: 'grounded' },
          { width: 144, height: 86, color: '#c084fc', label: 'invented stat', kind: 'ai-answer', disposition: 'hallucination' },
        ],
      },
    ],
  },
];