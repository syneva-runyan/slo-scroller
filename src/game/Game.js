import { Player } from './Player.js';
import { Obstacle } from './Obstacle.js';
import { LevelManager } from './LevelManager.js';
import { levelTracks } from './levels.js';
import { updateElapsedSeconds } from './timer.js';
import './Game.css';
import { Input } from '../systems/Input.js';
import { Renderer } from '../systems/Renderer.js';
import { intersects } from '../systems/Collision.js';
import { HUD } from '../ui/HUD/HUD.js';
import { OverlayView } from '../ui/OverlayView/OverlayView.js';
import { TrackMenuView } from '../ui/TrackMenu/TrackMenuView.js';

const WIDTH = 1280;
const HEIGHT = 720;
const GROUND_Y = 560;
const MAX_DELTA_SECONDS = 0.033;
const PLAYER_X = 180;

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
          <h1 class="game-title">SLA Scroller</h1>
          <p class="game-subtitle">Sprint through the data center, hop over cable hazards, and keep each level's SLA intact.</p>
        </div>
      </header>
      <div class="game-layout">
        <div class="game-menu"></div>
        <div class="game-stage"></div>
      </div>
      <footer class="game-footer">
        <div class="game-pill">Control: press Space to jump</div>
        <div class="game-pill">Boilerplate: Vite + canvas + mostly vanilla JS</div>
      </footer>
    `;

    this.menuContainer = this.shell.querySelector('.game-menu');
    this.stage = this.shell.querySelector('.game-stage');
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
    this.overlayView = new OverlayView(this.stage);
    this.trackMenuView = new TrackMenuView(this.menuContainer, {
      onSelectTrack: (trackId) => this.selectTrack(trackId),
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

    if (this.input.consumeJump()) {
      if (this.state === 'menu') {
        this.state = 'level-intro';
      } else if (this.state === 'level-intro') {
        this.beginLevel(time);
      } else if (this.state === 'playing') {
        this.player.jump();
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
    const track = this.levelManager.getCurrentTrack();
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

    for (const obstacle of this.obstacles) {
      if (obstacle.hit) {
        continue;
      }

      if (intersects(this.player.getBounds(), obstacle.getBounds()) && this.player.canTakeHit()) {
        obstacle.hit = true;
        this.player.registerHit();
        this.breaches += 1;
        this.flashTimer = 0.35;

        if (track.id === 'availability' && (obstacle.kind === 'cable' || obstacle.kind === 'power-strip')) {
          this.powerTripTimer = 1.6;
        }

        if (this.breaches > level.allowedBreaches) {
          this.state = 'failed';
          return;
        }
      }
    }

    if (this.elapsedSeconds >= level.durationSeconds) {
      this.state = 'level-complete';
    }
  }

  render() {
    const level = this.levelManager.getCurrentLevel();
    const track = this.levelManager.getCurrentTrack();
    const overlay = this.hud.getOverlay({
      state: this.state,
      level,
      track,
      breaches: this.breaches,
      levelIndex: this.levelManager.currentIndex + 1,
      levelCount: this.levelManager.levelCount,
    });

    this.renderer.render({
      state: this.state,
      level,
      timeRemaining: Math.max(0, level.durationSeconds - this.elapsedSeconds),
      progressRatio: Math.min(1, this.elapsedSeconds / level.durationSeconds),
      levelIndex: this.levelManager.currentIndex + 1,
      levelCount: this.levelManager.levelCount,
      player: this.player,
      obstacles: this.obstacles,
      distance: this.distance,
      breaches: this.breaches,
      flashTimer: this.flashTimer,
      powerTripTimer: this.powerTripTimer,
      track,
      elapsedSeconds: this.elapsedSeconds,
    });
    this.overlayView.render(overlay);
    this.trackMenuView.render({
      tracks: this.levelManager.getTrackMenuItems(),
      activeTrack: track,
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
    this.player.reset();
  }
}