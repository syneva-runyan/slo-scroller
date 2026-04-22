import { Player } from './Player.js';
import { Obstacle } from './Obstacle.js';
import { LevelManager } from './LevelManager.js';
import { levelTracks } from './levels.js';
import { isAvailabilityTrack } from './trackUtils.js';
import { updateElapsedSeconds } from './timer.js';
import './Game.css';
import { Input } from '../systems/Input.js';
import { Renderer } from '../systems/Renderer.js';
import { intersects } from '../systems/Collision.js';
import { HUD } from '../ui/HUD/HUD.js';
import { GameHUDView } from '../ui/HUD/GameHUDView.js';
import { OverlayView } from '../ui/OverlayView/OverlayView.js';
import { TrackMenuView } from '../ui/TrackMenu/TrackMenuView.js';

const WIDTH = 1280;
const HEIGHT = 720;
const GROUND_Y = 560;
const MAX_DELTA_SECONDS = 0.033;
const PLAYER_X = 180;
const HAMMER_STRIKE_SECONDS = 0.24;
const AVAILABILITY_OUTAGE_SECONDS = 1.6;
const DEFAULT_AVAILABILITY_WINDOW_SECONDS = 10;
const AVAILABILITY_TARGET_EPSILON = 0.0001;

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
          <h1 class="game-title">SLO Scroller</h1>
          <p class="game-subtitle">Sprint through the data center, hop over cable hazards, and keep each level's SLO intact.</p>
        </div>
      </header>
      <div class="game-layout">
        <div class="game-menu"></div>
        <div class="game-stage"></div>
      </div>
      <footer class="game-footer">
        <div class="game-pill game-controls-pill">Control: press Space to jump</div>
        <div class="game-pill">Boilerplate: Vite + canvas + mostly vanilla JS</div>
      </footer>
    `;

    this.menuContainer = this.shell.querySelector('.game-menu');
    this.stage = this.shell.querySelector('.game-stage');
    this.controlsPill = this.shell.querySelector('.game-controls-pill');
    this.stage.append(this.canvas);
    this.container.append(this.shell);

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('2D context not available');
    }

    this.input = new Input(window);
    this.levelManager = new LevelManager(levelTracks);
    this.renderer = new Renderer(this.ctx, {
      width: WIDTH,
      height: HEIGHT,
      groundY: GROUND_Y,
    });
    this.hud = new HUD();
    this.gameHudView = new GameHUDView(this.stage);
    this.overlayView = new OverlayView(this.stage);
    this.trackMenuView = new TrackMenuView(this.menuContainer, {
      onSelectTrack: (trackId) => this.selectTrack(trackId),
      onExperimentToggle: () => this.toggleExperimentMode(),
      onWindowConfigChange: (value) => { this.experimentWindowSeconds = value; },
    });
    this.player = new Player({
      x: PLAYER_X,
      groundY: GROUND_Y,
    });

    this.animationFrameId = 0;
    this.lastTime = 0;
    this.state = 'menu';
    this.distance = 0;
    this.breaches = 0;
    this.obstacles = [];
    this.spawnCooldown = 0;
    this.levelStartAt = 0;
    this.flashTimer = 0;
    this.elapsedSeconds = 0;
    this.powerTripTimer = 0;
    this.hammerStrike = null;
    this.availabilityIncidents = [];
    this.progressHitMarkers = [];
    this.experimentMode = false;
    this.experimentWindowSeconds = 10;
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
    this.distance += level.scrollSpeed * deltaSeconds;
    this.spawnCooldown -= deltaSeconds;
    this.flashTimer = Math.max(0, this.flashTimer - deltaSeconds);

    this.player.update(deltaSeconds);

    if (this.spawnCooldown <= 0) {
      this.spawnObstacle(level);
      const variance = Math.random() * level.spawnVariance;
      this.spawnCooldown = level.spawnInterval - variance;
    }

    for (const obstacle of this.obstacles) {
      obstacle.update(deltaSeconds, level.scrollSpeed);
    }

    this.obstacles = this.obstacles.filter((obstacle) => !obstacle.isOffscreen());
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

      if (intersects(this.player.getBounds(), obstacle.getBounds()) && this.player.canTakeHit()) {
        obstacle.hit = true;
        this.player.registerHit();
        this.flashTimer = 0.35;

        if (isAvailabilityTrack(track)) {
          this.recordAvailabilityIncident(level);
          if (obstacle.kind === 'button' || obstacle.kind === 'power-strip') {
            this.powerTripTimer = AVAILABILITY_OUTAGE_SECONDS;
          }

          if (!this.meetsAvailabilityTarget(level)) {
            this.state = 'failed';
            return;
          }
        } else {
          this.breaches += 1;
          if (this.breaches > level.allowedBreaches) {
            this.state = 'failed';
            return;
          }
        }
      }
    }

    if (isAvailabilityTrack(track) && !this.meetsAvailabilityTarget(level)) {
      this.state = 'failed';
      return;
    }

    if (this.elapsedSeconds >= level.durationSeconds) {
      this.state = 'level-complete';
    }
  }

  render() {
    const level = this.levelManager.getCurrentLevel();
    const track = this.levelManager.getCurrentTrack();
    if (this.controlsPill) {
      this.controlsPill.textContent =
        track.id === 'error-budget'
          ? 'Control: press Space to swing the hammer'
          : 'Control: press Space to jump';
    }
    const overlay = this.hud.getOverlay({
      state: this.state,
      level,
      track,
      breaches: this.breaches,
      rollingAvailability: this.getRollingAvailability(level),
      availabilityTarget: this.getAvailabilityTarget(level),
      levelIndex: this.levelManager.currentIndex + 1,
      levelCount: this.levelManager.levelCount,
      experimentMode: this.experimentMode,
      experimentWindowSeconds: this.experimentWindowSeconds,
    });

    this.renderer.render({
      state: this.state,
      level,
      timeRemaining: Math.max(0, level.durationSeconds - this.elapsedSeconds),
      progressRatio: Math.min(1, this.elapsedSeconds / level.durationSeconds),
      progressHitMarkers: this.progressHitMarkers,
      levelIndex: this.levelManager.currentIndex + 1,
      levelCount: this.levelManager.levelCount,
      player: this.player,
      obstacles: this.obstacles,
      distance: this.distance,
      breaches: this.breaches,
      flashTimer: this.flashTimer,
      powerTripTimer: this.powerTripTimer,
      hammerStrike: this.hammerStrike,
      rollingAvailability: this.getRollingAvailability(level),
      availabilityTarget: this.getAvailabilityTarget(level),
      availabilityWindowSeconds: this.getAvailabilityWindowSeconds(level),
      track,
      elapsedSeconds: this.elapsedSeconds,
    });
    this.overlayView.render(overlay);
    this.gameHudView.render({
      level,
      track,
      state: this.state,
      progressRatio: Math.min(1, this.elapsedSeconds / level.durationSeconds),
      progressHitMarkers: this.progressHitMarkers,
      rollingAvailability: this.getRollingAvailability(level),
      availabilityTarget: this.getAvailabilityTarget(level),
      availabilityWindowSeconds: this.getAvailabilityWindowSeconds(level),
      breaches: this.breaches,
      elapsedSeconds: this.elapsedSeconds,
    });
    this.trackMenuView.render({
      tracks: this.levelManager.getTrackMenuItems(this.experimentMode),
      showExperimentToggle: isAvailabilityTrack(track),
      experimentMode: this.experimentMode,
      experimentWindowSeconds: this.experimentWindowSeconds,
    });
  }

  beginLevel(time, options = {}) {
    if (!options.keepCurrentLevel) {
      this.levelManager.ensureValidIndex();
    }

    this.state = 'playing';
    this.distance = 0;
    this.breaches = 0;
    this.obstacles = [];
    this.spawnCooldown = 0.6;
    this.levelStartAt = time;
    this.flashTimer = 0;
    this.elapsedSeconds = 0;
    this.powerTripTimer = 0;
    this.hammerStrike = null;
    this.availabilityIncidents = [];
    this.progressHitMarkers = [];
    this.player.reset();
  }

  spawnObstacle(level) {
    const profile = level.obstacleProfiles[Math.floor(Math.random() * level.obstacleProfiles.length)];
    this.obstacles.push(
      new Obstacle({
        x: WIDTH + 40,
        groundY: GROUND_Y,
        width: profile.width,
        height: profile.height,
        color: profile.color,
        label: profile.label,
        kind: profile.kind,
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
    this.spawnCooldown = 0;
    this.flashTimer = 0;
    this.elapsedSeconds = 0;
    this.powerTripTimer = 0;
    this.hammerStrike = null;
    this.availabilityIncidents = [];
    this.progressHitMarkers = [];
    this.player.reset();
  }

  getAvailabilityWindowSeconds(level) {
    if (this.experimentMode) {
      return this.experimentWindowSeconds;
    }
    return level.availabilityWindowSeconds ?? DEFAULT_AVAILABILITY_WINDOW_SECONDS;
  }

  getAvailabilityTarget(level) {
    if (level.targetAvailability != null) {
      return level.targetAvailability;
    }

    const windowSeconds = this.getAvailabilityWindowSeconds(level);
    return Math.max(0, 1 - (level.allowedBreaches * AVAILABILITY_OUTAGE_SECONDS) / windowSeconds);
  }

  recordAvailabilityIncident(level) {
    const startTime = this.elapsedSeconds;
    const endTime = startTime + AVAILABILITY_OUTAGE_SECONDS;
    const lastIncident = this.availabilityIncidents[this.availabilityIncidents.length - 1];

    if (lastIncident && startTime <= lastIncident.endTime) {
      lastIncident.endTime = Math.max(lastIncident.endTime, endTime);
    } else {
      this.availabilityIncidents.push({ startTime, endTime });
    }

    this.progressHitMarkers.push(Math.min(1, startTime / level.durationSeconds));
    const windowStart = this.elapsedSeconds - this.getAvailabilityWindowSeconds(level);
    this.availabilityIncidents = this.availabilityIncidents.filter((incident) => incident.endTime >= windowStart);
  }

  getRollingAvailability(level) {
    const currentTrack = this.levelManager.getCurrentTrack();
    if (!isAvailabilityTrack(currentTrack)) {
      return 1;
    }

    const windowSeconds = this.getAvailabilityWindowSeconds(level);
    const windowStart = this.elapsedSeconds - windowSeconds;
    let unavailableSeconds = 0;

    for (const incident of this.availabilityIncidents) {
      const overlapStart = Math.max(windowStart, incident.startTime);
      const overlapEnd = Math.min(this.elapsedSeconds, incident.endTime);
      if (overlapEnd > overlapStart) {
        unavailableSeconds += overlapEnd - overlapStart;
      }
    }

    return Math.max(0, Math.min(1, 1 - unavailableSeconds / windowSeconds));
  }

  meetsAvailabilityTarget(level) {
    return this.getRollingAvailability(level) + AVAILABILITY_TARGET_EPSILON >= this.getAvailabilityTarget(level);
  }

  toggleExperimentMode() {
    this.experimentMode = !this.experimentMode;
  }
}