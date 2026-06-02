import { Player } from './Player.js';
import { Obstacle } from './Obstacle.js';
import { LevelManager } from './LevelManager.js';
import { levelTracks } from './levels.js';
import { isAvailabilityTrack, isAIHallucinationTrack, isResponseTimeTrack } from './trackUtils.js';
import { updateElapsedSeconds } from './timer.js';
import { AvailabilityTracker } from './AvailabilityTracker.js';
import { GameTracker } from './GameTracker.js';
import { HallucinationTracker } from './HallucinationTracker.js';
import { getOrCreatePlayerId, getDisplayName } from './identity.js';
import { submitScore, fetchRank, fetchTopScores, isLeaderboardEnabled } from '../services/leaderboard.js';
import './Game.css';
import { Input } from '../systems/Input.js';
import { Renderer } from '../systems/Renderer.js';
import { intersects } from '../systems/Collision.js';
import { HUD } from '../ui/HUD/HUD.js';
import { GameHUDView } from '../ui/HUD/GameHUDView.js';
import { OverlayView } from '../ui/OverlayView/OverlayView.js';
import { TrackMenuView } from '../ui/TrackMenu/TrackMenuView.js';
import { promptDisplayName } from '../ui/DisplayNamePrompt/DisplayNamePrompt.js';
import { LeaderboardView } from '../ui/Leaderboard/LeaderboardView.js';
import '../ui/DisplayNamePrompt/DisplayNamePrompt.css';

const WIDTH = 1280;
const HEIGHT = 720;
const GROUND_Y = 560;
const MAX_DELTA_SECONDS = 0.033;
const PLAYER_X = 180;
const HAMMER_STRIKE_SECONDS = 0.24;
// Scale up sprites on narrow screens so they remain legible. Formula keeps
// things at natural size on desktop (>= 720px) and scales up to 1.75× on
// the smallest phones (~375px).
const SPRITE_SCALE = Math.max(1, Math.min(1.75, (1280 / Math.max(window.innerWidth, 720)) * 0.98));
// Reduce SHIP IT button size on mobile so it stays jumpable at larger scales.
const BUTTON_OBSTACLE_SCALE = SPRITE_SCALE > 1 ? 0.82 : 1;
// Slightly shrink all obstacles on mobile so the game stays playable.
const MOBILE_OBSTACLE_SCALE = SPRITE_SCALE > 1 ? 0.88 : 1;

export class Game {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.canvas.className = 'game-canvas';

    this.shell = document.createElement('section');
    this.shell.className = 'game-shell';
    this.shell.innerHTML = `
      <header class="game-header">
        <div>
          <h1 class="game-title">99.9% Fun</h1>
          <p class="game-subtitle">Sprint through the data center, hop over cable hazards, and keep each level's SLO intact.</p>
        </div>
      </header>
      <div class="game-layout">
        <div class="game-menu"></div>
        <div class="game-stage-area">
          <div class="game-stage"></div>
          <div class="game-pill game-controls-pill">Control: press Space to jump</div>
          <div class="game-leaderboard-slot" hidden></div>
        </div>
      </div>
    `;

    this.menuContainer = this.shell.querySelector('.game-menu');
    this.stage = this.shell.querySelector('.game-stage');
    this.controlsPill = this.shell.querySelector('.game-controls-pill');
    this.leaderboardSlot = this.shell.querySelector('.game-leaderboard-slot');
    this.leaderboardView = new LeaderboardView();
    this.leaderboardSlot.append(this.leaderboardView.root);
    this.lastLeaderboardSignature = null;
    const isTouchDevice = navigator.maxTouchPoints > 0;
    this.controlsPill.textContent = isTouchDevice ? 'Control: tap to jump' : 'Control: press Space to jump';
    this.stage.append(this.canvas);
    this.container.append(this.shell);

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('2D context not available');
    }

    this.input = new Input(window, this.canvas);
    this.levelManager = new LevelManager(levelTracks);
    this.renderer = new Renderer(this.ctx, {
      width: WIDTH,
      height: HEIGHT,
      groundY: GROUND_Y,
      spriteScale: SPRITE_SCALE,
    });
    this.hud = new HUD();
    this.gameHudView = new GameHUDView(this.stage);
    this.overlayView = new OverlayView(this.stage);
    this.trackMenuView = new TrackMenuView(this.menuContainer, {
      onSelectTrack: (trackId) => this.selectTrack(trackId),
      onExperimentToggle: () => this.availability.toggleExperimentMode(),
      // TODO - eventually we may want to implement rolling time windows in
      // levels other than availability
      onRollingTimeWindowConfigChange: (value) => this.availability.setRollingTimeWindowSeconds(value),
    });
    this.player = new Player({
      x: PLAYER_X,
      groundY: GROUND_Y,
      spriteScale: SPRITE_SCALE,
    });

    this.availability = new AvailabilityTracker();
    this.defaultTracker = new GameTracker();
    this.hallucination = new HallucinationTracker();
    this.animationFrameId = 0;
    this.lastTime = 0;
    this.state = 'menu';
    this.distance = 0;
    this.breaches = 0;
    this.obstacles = [];
    this.obstaclesCleared = 0;
    this.spawnCooldown = 0;
    this.levelStartAt = 0;
    this.flashTimer = 0;
    this.elapsedSeconds = 0;
    this.powerTripTimer = 0;
    this.hammerStrike = null;
    this.leaderboard = null;
    this.currentScrollSpeed = 0;
    this.latencyPenaltyRemaining = 0;
    this.activePenaltyFactor = 1;
    this.cacheBoostRemaining = 0;
    this.cacheBoostFactor = 1;
    this.resetTrackers();
  }

  start() {
    this.lastTime = performance.now();
    this.animationFrameId = window.requestAnimationFrame((time) => this.frame(time));
  }

  destroy() {
    window.cancelAnimationFrame(this.animationFrameId);
    this.input.destroy();
  }

  frame(time) {
    const deltaSeconds = Math.min((time - this.lastTime) / 1000, MAX_DELTA_SECONDS);
    this.lastTime = time;

    this.update(deltaSeconds, time);
    this.render();

    this.animationFrameId = window.requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  update(deltaSeconds, time) {
    this.elapsedSeconds = updateElapsedSeconds(this.elapsedSeconds, deltaSeconds, this.state);
    this.powerTripTimer = Math.max(0, this.powerTripTimer - deltaSeconds);
    const currentTrack = this.levelManager.getCurrentTrack();
    if (this.hammerStrike) {
      this.hammerStrike.timer = Math.max(0, this.hammerStrike.timer - deltaSeconds);
      if (this.hammerStrike.timer === 0) {
        this.hammerStrike = null;
      }
    }

    if (this.input.consumeJump()) {
      if (this.state === 'menu') {
        this.state = 'level-intro';
      } else if (this.state === 'level-intro') {
        this.beginLevel(time);
      } else if (this.state === 'playing') {
        if (currentTrack.id === 'error-budget') {
          this.startHammerSwing();
        } else {
          this.player.jump();
        }
      } else if (this.state === 'level-complete') {
        if (this.levelManager.advance()) {
          this.state = 'level-intro';
        } else {
          this.state = 'finished';
        }
      } else if (this.state === 'failed') {
        this.state = 'level-intro';
      } else if (this.state === 'finished') {
        this.levelManager.restartCampaign();
        this.state = 'level-intro';
      }
    }

    if (this.state !== 'playing') {
      return;
    }

    const level = this.levelManager.getCurrentLevel();
    const track = currentTrack;

    // Ramp scroll speed for response-time levels; other tracks stay constant.
    if (isResponseTimeTrack(track) && level.maxScrollSpeed != null && level.speedRampPerSecond) {
      this.currentScrollSpeed = Math.min(
        level.maxScrollSpeed,
        this.currentScrollSpeed + level.speedRampPerSecond * deltaSeconds,
      );
    } else {
      this.currentScrollSpeed = level.scrollSpeed;
    }

    // Latency penalty: temporary slowdown after a breach (response-time only).
    this.latencyPenaltyRemaining = Math.max(0, this.latencyPenaltyRemaining - deltaSeconds);
    const penaltyActive = this.latencyPenaltyRemaining > 0;
    // Cache boost: temporary speed-up after collecting a cache (response-time only).
    this.cacheBoostRemaining = Math.max(0, this.cacheBoostRemaining - deltaSeconds);
    const boostActive = this.cacheBoostRemaining > 0;
    const boostFactor = boostActive ? this.cacheBoostFactor : 1;
    const effectiveSpeed = penaltyActive
      ? this.currentScrollSpeed * this.activePenaltyFactor * boostFactor
      : this.currentScrollSpeed * boostFactor;

    this.distance += effectiveSpeed * deltaSeconds;
    this.spawnCooldown -= deltaSeconds;
    this.flashTimer = Math.max(0, this.flashTimer - deltaSeconds);

    this.player.update(deltaSeconds);

    if (this.spawnCooldown <= 0) {
      this.spawnObstacle(level);
      const variance = Math.random() * level.spawnVariance;
      this.spawnCooldown = level.spawnInterval - variance;
    }

    for (const obstacle of this.obstacles) {
      obstacle.update(deltaSeconds, effectiveSpeed);
    }

    // On the AI track, a player who is airborne while overlapping a grounded
    // answer has "flagged" it -> false reject (suppressed a real answer).
    if (isAIHallucinationTrack(track) && !this.player.onGround) {
      const playerBounds = this.player.getBounds();
      for (const obstacle of this.obstacles) {
        if (
          obstacle.kind === 'ai-answer'
          && obstacle.disposition === 'grounded'
          && !obstacle.dispositionRecorded
        ) {
          const obsBounds = obstacle.getBounds();
          const xOverlap = playerBounds.x < obsBounds.x + obsBounds.width
            && playerBounds.x + playerBounds.width > obsBounds.x;
          if (xOverlap) {
            obstacle.dispositionRecorded = true;
            obstacle.falseReject = true;
            obstacle.hit = true;
            this.flashTimer = 0.35;
            if (!this.hallucination.handleFalseReject(this, level, obstacle)) {
              return;
            }
          }
        }
      }
    }

    this.obstacles = this.obstacles.filter((obstacle) => {
      if (obstacle.isOffscreen()) {
        if (!obstacle.hit) {
          this.obstaclesCleared += 1;
          if (isAIHallucinationTrack(track) && obstacle.kind === 'ai-answer' && !obstacle.dispositionRecorded) {
            // Hallucination flown over (jump cleared) or grounded answer passed
            // under -> correct disposition either way.
            this.hallucination.recordCorrectDisposition();
            obstacle.dispositionRecorded = true;
          }
        }
        return false;
      }
      return true;
    });
    const hammerBounds = track.id === 'error-budget' ? this.getHammerBounds() : null;

    for (const obstacle of this.obstacles) {
      if (obstacle.hit) {
        continue;
      }

      if (hammerBounds && intersects(hammerBounds, obstacle.getBounds())) {
        obstacle.hit = true;
        obstacle.squashTimer = HAMMER_STRIKE_SECONDS;
        this.hammerStrike.connected = true;
        this.hammerStrike.targetX = obstacle.x + obstacle.width * 0.5;
        this.hammerStrike.targetY = obstacle.groundY - obstacle.height * 0.45;
        continue;
      }

      // Grounded AI answers pass through the player -- shipping them is the
      // correct disposition, so they should never trigger a physical collision.
      if (obstacle.kind === 'ai-answer' && obstacle.disposition === 'grounded') {
        continue;
      }

      // Cache pickups grant a temporary speed boost on touch and never count
      // as a breach. They pass through the player rather than blocking.
      if (obstacle.kind === 'cache') {
        if (intersects(this.player.getBounds(), obstacle.getBounds())) {
          obstacle.hit = true;
          obstacle.dispositionRecorded = true;
          if (isResponseTimeTrack(track) && level.cacheBoost) {
            this.cacheBoostRemaining = level.cacheBoost.durationSeconds;
            this.cacheBoostFactor = level.cacheBoost.boostFactor;
            // Picking up a cache shakes off any active latency penalty.
            this.latencyPenaltyRemaining = 0;
          }
        }
        continue;
      }

      if (intersects(this.player.getBounds(), obstacle.getBounds()) && this.player.canTakeHit()) {
        obstacle.hit = true;
        obstacle.dispositionRecorded = true;
        this.player.registerHit();
        this.flashTimer = 0.35;

        if (!this.handleObstacleCollision(track, level, obstacle)) {
          return;
        }
      }
    }

    if (isAvailabilityTrack(track) && !this.availability.meetsTarget(this.elapsedSeconds, level)) {
      this.state = 'failed';
      return;
    }

    if (isResponseTimeTrack(track) && level.goalDistance != null) {
      if (this.distance >= level.goalDistance) {
        this.state = 'level-complete';
        this.onLevelComplete(level, track);
        return;
      }
      if (this.elapsedSeconds >= level.durationSeconds) {
        // Ran out of time before covering the distance — too slow.
        this.state = 'failed';
        return;
      }
      return;
    }

    if (this.elapsedSeconds >= level.durationSeconds) {
      this.state = 'level-complete';
      this.onLevelComplete(level, track);
    }
  }

  render() {
    const level = this.levelManager.getCurrentLevel();
    const track = this.levelManager.getCurrentTrack();
    const activeTracker = this.getTrackerForTrack(track);
    const respTime = isResponseTimeTrack(track);
    const liveSpeed = this.currentScrollSpeed || level.scrollSpeed;
    const latencyActive = this.latencyPenaltyRemaining > 0;
    const cacheBoostActive = this.cacheBoostRemaining > 0;
    const boostMultiplier = cacheBoostActive ? this.cacheBoostFactor : 1;
    const effectiveSpeed = (latencyActive ? liveSpeed * this.activePenaltyFactor : liveSpeed) * boostMultiplier;
    const progressRatio = respTime && level.goalDistance
      ? Math.min(1, this.distance / level.goalDistance)
      : Math.min(1, this.elapsedSeconds / level.durationSeconds);
    const distanceRemaining = respTime && level.goalDistance
      ? Math.max(0, level.goalDistance - this.distance)
      : Math.max(0, level.durationSeconds - this.elapsedSeconds) * level.scrollSpeed;
    if (this.controlsPill) {
      const isTouchDevice = navigator.maxTouchPoints > 0;
      this.controlsPill.textContent = isTouchDevice
        ? 'Control: tap to jump'
        : track.id === 'error-budget'
          ? 'Control: press Space to swing the hammer'
          : isAIHallucinationTrack(track)
            ? 'Control: press Space to flag a hallucination — let grounded answers pass'
            : 'Control: press Space to jump';
    }
    const overlay = this.hud.getOverlay({
      state: this.state,
      level,
      track,
      breaches: this.breaches,
      rollingAvailability: this.availability.getRollingAvailability(this.elapsedSeconds, level),
      availabilityTarget: this.availability.getTarget(level),
      levelIndex: this.levelManager.currentIndex + 1,
      levelCount: this.levelManager.levelCount,
      experimentMode: this.availability.experimentMode,
      rollingWindowSeconds: this.availability.rollingWindowSeconds,
      hallucination: this.hallucination,
    });

    this.renderer.render({
      state: this.state,
      level,
      timeRemaining: Math.max(0, level.durationSeconds - this.elapsedSeconds),
      distanceRemaining,
      progressRatio,
      progressHitMarkers: activeTracker.progressHitMarkers,
      levelIndex: this.levelManager.currentIndex + 1,
      levelCount: this.levelManager.levelCount,
      player: this.player,
      obstacles: this.obstacles,
      distance: this.distance,
      breaches: this.breaches,
      flashTimer: this.flashTimer,
      powerTripTimer: this.powerTripTimer,
      hammerStrike: this.hammerStrike,
      rollingAvailability: this.availability.getRollingAvailability(this.elapsedSeconds, level),
      availabilityTarget: this.availability.getTarget(level),
      availabilityWindowSeconds: this.availability.getRollingTimeWindowSeconds(level),
      track,
      elapsedSeconds: this.elapsedSeconds,
    });
    this.overlayView.render(overlay);
    this.renderLeaderboardSlot();
    this.gameHudView.render({
      level,
      track,
      state: this.state,
      progressRatio,
      progressHitMarkers: activeTracker.progressHitMarkers,
      rollingAvailability: this.availability.getRollingAvailability(this.elapsedSeconds, level),
      availabilityTarget: this.availability.getTarget(level),
      availabilityWindowSeconds: this.availability.getRollingTimeWindowSeconds(level),
      breaches: this.breaches,
      elapsedSeconds: this.elapsedSeconds,
      hallucination: this.hallucination,
      currentScrollSpeed: liveSpeed,
      effectiveScrollSpeed: effectiveSpeed,
      latencyActive,
      cacheBoostActive,
      distance: this.distance,
    });
    this.trackMenuView.render({
      tracks: this.levelManager.getTrackMenuItems(),
      showExperimentToggle: isAvailabilityTrack(track),
      experimentMode: this.availability.experimentMode,
      rollingWindowSeconds: this.availability.rollingWindowSeconds,
      activeLevelId: level.id,
    });
  }

  renderLeaderboardSlot() {
    if (this.state !== 'level-complete') {
      if (this.lastLeaderboardSignature !== null) {
        this.lastLeaderboardSignature = null;
        this.leaderboardSlot.hidden = true;
        this.leaderboardView.root.replaceChildren();
      }
      return;
    }

    const data = this.leaderboard;
    const signature = data == null
      ? 'loading'
      : JSON.stringify({ scores: data.scores, rank: data.rank });

    if (signature === this.lastLeaderboardSignature) {
      return;
    }

    this.lastLeaderboardSignature = signature;
    this.leaderboardSlot.hidden = false;
    if (data == null) {
      this.leaderboardView.renderLoading();
    } else {
      this.leaderboardView.render(data.scores, data.rank);
    }
  }

  beginLevel(time, options = {}) {
    if (!options.keepCurrentLevel) {
      this.levelManager.ensureValidIndex();
    }

    this.state = 'playing';
    this.distance = 0;
    this.breaches = 0;
    this.obstacles = [];
    this.obstaclesCleared = 0;
    this.spawnCooldown = 0.6;
    this.levelStartAt = time;
    this.flashTimer = 0;
    this.elapsedSeconds = 0;
    this.powerTripTimer = 0;
    this.hammerStrike = null;
    this.leaderboard = null;
    this.currentScrollSpeed = this.levelManager.getCurrentLevel().scrollSpeed;
    this.latencyPenaltyRemaining = 0;
    this.activePenaltyFactor = 1;
    this.cacheBoostRemaining = 0;
    this.cacheBoostFactor = 1;
    this.resetTrackers();
    this.player.reset();
  }

  spawnObstacle(level) {
    const profile = level.obstacleProfiles[Math.floor(Math.random() * level.obstacleProfiles.length)];
    const profileScale = profile.kind === 'button' ? BUTTON_OBSTACLE_SCALE : 1;
    this.obstacles.push(
      new Obstacle({
        x: WIDTH + 40,
        groundY: GROUND_Y,
        width: profile.width * SPRITE_SCALE * MOBILE_OBSTACLE_SCALE * profileScale,
        height: profile.height * SPRITE_SCALE * MOBILE_OBSTACLE_SCALE * profileScale,
        color: profile.color,
        label: profile.label,
        kind: profile.kind,
        disposition: profile.disposition,
      }),
    );
  }

  startHammerSwing() {
    if (this.hammerStrike) {
      return;
    }

    this.hammerStrike = {
      timer: HAMMER_STRIKE_SECONDS,
      duration: HAMMER_STRIKE_SECONDS,
      connected: false,
      targetX: null,
      targetY: null,
    };
  }

  getHammerBounds() {
    if (!this.hammerStrike || this.hammerStrike.connected) {
      return null;
    }

    const progress = 1 - this.hammerStrike.timer / this.hammerStrike.duration;
    return {
      x: this.player.x + 28,
      y: this.player.y - 18,
      width: 92 + progress * 54,
      height: 132,
    };
  }

  selectTrack(trackId) {
    const didSelect = this.levelManager.selectTrack(trackId);
    if (!didSelect) {
      return;
    }

    this.state = 'level-intro';
    this.distance = 0;
    this.breaches = 0;
    this.obstacles = [];
    this.obstaclesCleared = 0;
    this.spawnCooldown = 0;
    this.flashTimer = 0;
    this.elapsedSeconds = 0;
    this.powerTripTimer = 0;
    this.hammerStrike = null;
    this.currentScrollSpeed = this.levelManager.getCurrentLevel().scrollSpeed;
    this.latencyPenaltyRemaining = 0;
    this.activePenaltyFactor = 1;
    this.cacheBoostRemaining = 0;
    this.cacheBoostFactor = 1;
    this.resetTrackers();
    this.player.reset();
  }

  getTrackerForTrack(track) {
    if (isAvailabilityTrack(track)) return this.availability;
    if (isAIHallucinationTrack(track)) return this.hallucination;
    return this.defaultTracker;
  }

  resetTrackers() {
    this.availability.reset();
    this.defaultTracker.reset();
    this.hallucination.reset();
  }

  onLevelComplete(level, track) {
    if (!isLeaderboardEnabled()) {
      return;
    }
    const playerId = getOrCreatePlayerId();
    const rollingAvailability = isAvailabilityTrack(track)
      ? this.availability.getRollingAvailability(this.elapsedSeconds, level)
      : null;
    const breaches = this.breaches;
    const obstaclesCleared = this.obstaclesCleared;
    const elapsedSeconds = isResponseTimeTrack(track)
      ? Number(this.elapsedSeconds.toFixed(2))
      : null;

    promptDisplayName(this.stage).then((displayName) => {
      return submitScore({
        playerId,
        displayName: displayName ?? getDisplayName() ?? 'Anonymous',
        trackId: track.id,
        levelId: level.id,
        breaches,
        rollingAvailability,
        obstaclesCleared,
        elapsedSeconds,
      }).then(() => Promise.all([
        fetchRank({ trackId: track.id, levelId: level.id, breaches, obstaclesCleared, elapsedSeconds }),
        fetchTopScores({ trackId: track.id, levelId: level.id, limit: 5 }),
      ]));
    }).then(([rank, scores]) => {
      this.leaderboard = { rank, scores };
      this.trackMenuView.invalidateLeaderboard();
    }).catch(console.error);
  }

  recordCollisionIncident(track, level, obstacle) {
    const tracker = this.getTrackerForTrack(track);
    tracker.recordCollisionIncident(this.elapsedSeconds, level, obstacle);
  }

  handleObstacleCollision(track, level, obstacle) {
    const tracker = this.getTrackerForTrack(track);
    const result = tracker.handleObstacleCollision(this, track, level, obstacle);
    // Response-time: each breach also imposes a temporary latency penalty
    // (scroll slowdown) on top of the breach count.
    if (isResponseTimeTrack(track) && level.latencyPenalty) {
      this.latencyPenaltyRemaining = level.latencyPenalty.durationSeconds;
      this.activePenaltyFactor = level.latencyPenalty.slowFactor;
    }
    return result;
  }
}