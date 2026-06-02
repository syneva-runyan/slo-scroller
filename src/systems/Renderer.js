const CEILING_TOP = '#0f1825';
const CEILING_BOTTOM = '#243245';
const FLOOR_COLOR = '#d7dee8';
const FLOOR_SHADOW = '#b6c0cb';

import { DeployBugButton } from './collisionItems/DeployBugButton.js';
import { Cache } from './collisionItems/Cache.js';
import { ScrollHitch } from './collisionItems/ScrollHitch.js';
import { StickyBug } from './collisionItems/StickyBug.js';
import { AvailabilityWorkstation } from './AvailabilityWorkstation.js';
import { Hammer } from './Hammer.js';
import { isAvailabilityTrack, isAIHallucinationTrack } from '../game/trackUtils.js';

export class Renderer {
  constructor(ctx, { width, height, groundY, spriteScale = 1 }) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.groundY = groundY;
    this.spriteScale = spriteScale;
    this.deployBugButton = new DeployBugButton();
    this.cache = new Cache(spriteScale);
    this.scrollHitch = new ScrollHitch(spriteScale);
    this.stickyBug = new StickyBug(spriteScale);
    this.availabilityWorkstation = new AvailabilityWorkstation({ groundY });
    this.hammer = new Hammer();
  }

  render(scene) {
    const { ctx } = this;

    this.drawSky(scene.flashTimer);
    this.drawBackground(scene.distance, scene.track, scene.powerTripTimer);
    this.drawGround(scene.distance);
    this.drawFinishMarker(scene.distanceRemaining ?? scene.timeRemaining * scene.level.scrollSpeed);
    this.drawObstacles(scene.obstacles, scene.track?.id === 'error-budget', scene.elapsedSeconds);
    this.drawPlayer(
      scene.player,
      scene.state === 'playing' ? scene.flashTimer : 0,
      scene.track,
      scene.hammerStrike,
    );

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawSky(flashTimer) {
    const { ctx } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, CEILING_TOP);
    gradient.addColorStop(1, CEILING_BOTTOM);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    if (flashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashTimer * 0.5})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    for (let index = 0; index < 6; index += 1) {
      const x = 120 + index * 210;
      const fixture = ctx.createLinearGradient(x, 0, x + 120, 0);
      fixture.addColorStop(0, 'rgba(115, 244, 255, 0.06)');
      fixture.addColorStop(0.5, 'rgba(180, 251, 255, 0.55)');
      fixture.addColorStop(1, 'rgba(115, 244, 255, 0.06)');
      ctx.fillStyle = fixture;
      ctx.fillRect(x, 42, 120, 16);
    }
  }

  drawBackground(distance, track, powerTripTimer) {
    const { ctx } = this;
    const rackOffset = -(distance * 0.55) % 170;
    const lightOffset = -(distance * 0.18) % 260;
    const outageActive = isAvailabilityTrack(track) && powerTripTimer > 0;

    ctx.fillStyle = '#101926';
    ctx.fillRect(0, 90, this.width, this.groundY - 90);

    for (let index = -1; index < 10; index += 1) {
      const x = rackOffset + index * 170;
      this.drawRack(x, this.groundY - 210, 110, 210, index, outageActive);
    }

    for (let index = -1; index < 8; index += 1) {
      const x = lightOffset + index * 260;
      ctx.fillStyle = 'rgba(103, 219, 230, 0.08)';
      ctx.fillRect(x, 90, 130, this.groundY - 90);
    }

    ctx.strokeStyle = 'rgba(118, 173, 220, 0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 124);
    ctx.lineTo(this.width, 124);
    ctx.moveTo(0, 170);
    ctx.lineTo(this.width, 170);
    ctx.stroke();

    if (isAvailabilityTrack(track)) {
      this.availabilityWorkstation.draw(ctx, outageActive, powerTripTimer, distance);
    }

    if (isAIHallucinationTrack(track)) {
      this.drawAIBackdrop(distance);
    }
  }

  drawGround(distance) {
    const { ctx } = this;
    ctx.fillStyle = FLOOR_COLOR;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    ctx.fillStyle = FLOOR_SHADOW;
    ctx.fillRect(0, this.groundY + 30, this.width, this.height - this.groundY - 30);

    ctx.strokeStyle = 'rgba(34, 50, 70, 0.18)';
    ctx.lineWidth = 2;
    for (let x = -((distance * 0.8) % 86); x < this.width + 86; x += 86) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    for (let y = this.groundY; y < this.height; y += 42) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#2f5168';
    ctx.fillRect(0, this.groundY + 20, this.width, 8);
  }

  drawFinishMarker(distanceRemaining) {
    if (distanceRemaining <= 0 || distanceRemaining > this.width * 1.5) {
      return;
    }

    const { ctx } = this;
    const x = this.width - distanceRemaining;
    ctx.fillStyle = '#fff4ce';
    ctx.fillRect(x, this.groundY - 180, 12, 180);
    ctx.fillStyle = '#5f7f96';
    ctx.fillRect(x + 12, this.groundY - 180, 70, 42);
  }

  drawObstacles(obstacles, bugTrackActive = false, elapsedSeconds = 0) {
    const { ctx } = this;

    for (const obstacle of obstacles) {
      const bounds = obstacle.getBounds();
      if (obstacle.kind === 'ai-answer') {
        this.drawAIAnswer(bounds, obstacle, elapsedSeconds);
        continue;
      }
      if (obstacle.kind === 'button') {
        this.deployBugButton.draw(ctx, bounds, obstacle.color, obstacle.hit);
      } else if (obstacle.kind === 'cable') {
        this.drawCable(bounds, obstacle.color, obstacle.hit);
      } else if (obstacle.kind === 'scroll-hitch') {
        this.scrollHitch.draw(ctx, bounds, obstacle.color, obstacle.hit, elapsedSeconds);
      } else if (obstacle.kind === 'power-strip') {
        this.drawPowerStrip(bounds, obstacle.color, obstacle.hit);
      } else if (obstacle.kind === 'cart') {
        this.drawCart(bounds, obstacle.color, obstacle.hit);
      } else if (obstacle.kind === 'sticky-bug') {
        this.stickyBug.draw(ctx, bounds, obstacle.color, obstacle.hit);
      } else if (obstacle.kind === 'server') {
        this.drawServer(bounds, obstacle.color, obstacle.hit);
      } else if (obstacle.kind === 'cache') {
        this.cache.draw(ctx, bounds, obstacle.color, obstacle.hit, elapsedSeconds);
      } else {
        ctx.fillStyle = obstacle.hit ? 'rgba(255,255,255,0.6)' : obstacle.color;
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }

      if (bugTrackActive && obstacle.kind !== 'sticky-bug') {
        this.drawBugDetails(bounds, obstacle);
      }

      if (bugTrackActive && obstacle.squashTimer > 0) {
        this.drawHammerImpact(bounds, obstacle.squashTimer);
      }

      const s = this.spriteScale;
      ctx.fillStyle = 'rgba(232, 242, 255, 0.92)';
      ctx.font = `${Math.round(16 * s)}px Trebuchet MS`;
      if (obstacle.kind === 'button' || obstacle.kind === 'power-strip') {
        ctx.textAlign = 'center';
        ctx.fillText(obstacle.label, bounds.x + bounds.width * 0.5, bounds.y - 10 * s);
        ctx.textAlign = 'start';
      } else {
        ctx.fillText(obstacle.label, bounds.x - 4 * s, bounds.y - 10 * s);
      }
    }
  }

  drawPlayer(player, flashTimer, track, hammerStrike) {
    const { ctx } = this;
    const s = this.spriteScale;
    const alpha = player.hitRecovery > 0 && Math.floor(player.hitRecovery * 14) % 2 === 0 ? 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = flashTimer > 0 ? 0.86 : alpha;

    ctx.fillStyle = '#17304a';
    ctx.fillRect(player.x + 10 * s, player.y + 14 * s, 48 * s, 58 * s);
    ctx.fillStyle = '#ffd7a8';
    ctx.fillRect(player.x + 18 * s, player.y, 32 * s, 28 * s);
    ctx.fillStyle = '#46c2a8';
    ctx.fillRect(player.x, player.y + 28 * s, 70 * s, 32 * s);
    ctx.fillStyle = '#1e2f45';
    ctx.fillRect(player.x + 8 * s, player.y + 72 * s, 18 * s, 24 * s);
    ctx.fillRect(player.x + 42 * s, player.y + 72 * s, 18 * s, 24 * s);
    if (track?.id === 'error-budget') {
      this.hammer.draw(ctx, player, hammerStrike, this.spriteScale);
    }
    ctx.restore();
  }

  drawRack(x, y, width, height, index, outageActive) {
    const { ctx } = this;
    ctx.fillStyle = '#1b2432';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = 'rgba(129, 160, 190, 0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

    for (let row = 0; row < 6; row += 1) {
      const unitY = y + 18 + row * 30;
      ctx.fillStyle = row % 2 === 0 ? '#243347' : '#202b3c';
      ctx.fillRect(x + 12, unitY, width - 24, 18);
      const ledColor = outageActive ? '#28384a' : row === (index + 6) % 6 ? '#59f2d5' : '#79b1ff';
      ctx.fillStyle = ledColor;
      ctx.fillRect(x + width - 30, unitY + 5, 8, 8);
      ctx.fillStyle = outageActive ? 'rgba(70, 90, 112, 0.55)' : 'rgba(150, 183, 214, 0.8)';
      ctx.fillRect(x + 18, unitY + 6, 34, 4);
    }
  }

  drawCable(bounds, color, hit) {
    const { ctx } = this;
    const alpha = hit ? 0.45 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 10;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bounds.x, bounds.y + bounds.height - 4);
    ctx.bezierCurveTo(
      bounds.x + bounds.width * 0.2,
      bounds.y - bounds.height * 0.45,
      bounds.x + bounds.width * 0.6,
      bounds.y + bounds.height * 1.15,
      bounds.x + bounds.width,
      bounds.y + bounds.height - 6,
    );
    ctx.stroke();

    ctx.fillStyle = '#1d2430';
    ctx.fillRect(bounds.x + bounds.width - 18, bounds.y + bounds.height - 20, 18, 12);
    ctx.fillStyle = '#d9ecff';
    ctx.fillRect(bounds.x + bounds.width - 4, bounds.y + bounds.height - 18, 4, 3);
    ctx.fillRect(bounds.x + bounds.width - 4, bounds.y + bounds.height - 12, 4, 3);
    ctx.restore();
  }

  drawPowerStrip(bounds, color, hit) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = hit ? 0.45 : 1;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(bounds.x + 6, bounds.y + 10, bounds.width - 12, bounds.height - 16);
    ctx.fillStyle = color;
    ctx.fillRect(bounds.x, bounds.y + 16, bounds.width, bounds.height - 16);
    ctx.fillStyle = '#253242';
    for (let socket = 0; socket < 3; socket += 1) {
      const socketX = bounds.x + 18 + socket * 18;
      ctx.fillRect(socketX, bounds.y + 24, 8, 14);
    }
    ctx.restore();
  }

  drawCart(bounds, color, hit) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = hit ? 0.45 : 1;
    ctx.fillStyle = color;
    ctx.fillRect(bounds.x + 4, bounds.y + 12, bounds.width - 8, bounds.height - 20);
    ctx.fillStyle = '#263344';
    ctx.fillRect(bounds.x, bounds.y + 4, bounds.width, 12);
    ctx.fillStyle = '#1a1f29';
    ctx.beginPath();
    ctx.arc(bounds.x + 12, bounds.y + bounds.height - 4, 8, 0, Math.PI * 2);
    ctx.arc(bounds.x + bounds.width - 12, bounds.y + bounds.height - 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawServer(bounds, color, hit) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = hit ? 0.45 : 1;
    ctx.fillStyle = '#182230';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.fillStyle = color;
    for (let row = 0; row < 3; row += 1) {
      const rowY = bounds.y + 10 + row * 28;
      ctx.fillRect(bounds.x + 8, rowY, bounds.width - 16, 18);
      ctx.fillStyle = row === 1 ? '#66f0d2' : '#9fc6ff';
      ctx.fillRect(bounds.x + bounds.width - 20, rowY + 5, 6, 6);
      ctx.fillStyle = color;
    }
    ctx.restore();
  }

  drawBugDetails(bounds, obstacle) {
    const { ctx } = this;
    const s = this.spriteScale;
    ctx.save();
    ctx.globalAlpha = obstacle.hit ? 0.38 : 0.95;
    ctx.fillStyle = '#1b2230';
    ctx.beginPath();
    ctx.ellipse(bounds.x + bounds.width * 0.42, bounds.y + bounds.height * 0.36, 7 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(bounds.x + bounds.width * 0.62, bounds.y + bounds.height * 0.36, 7 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b2230';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(bounds.x + bounds.width * 0.35, bounds.y + bounds.height * 0.32);
    ctx.lineTo(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.22);
    ctx.moveTo(bounds.x + bounds.width * 0.69, bounds.y + bounds.height * 0.32);
    ctx.lineTo(bounds.x + bounds.width * 0.79, bounds.y + bounds.height * 0.22);
    ctx.stroke();
    ctx.fillStyle = '#fff7c2';
    ctx.beginPath();
    ctx.arc(bounds.x + bounds.width * 0.42, bounds.y + bounds.height * 0.36, 2.2 * s, 0, Math.PI * 2);
    ctx.arc(bounds.x + bounds.width * 0.62, bounds.y + bounds.height * 0.36, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHammerImpact(bounds, squashTimer) {
    const { ctx } = this;
    const s = this.spriteScale;
    const impactRatio = Math.max(0, Math.min(1, squashTimer / 0.24));
    const pulse = 1 - impactRatio;
    const centerX = bounds.x + bounds.width * 0.5;
    const centerY = bounds.y + bounds.height * 0.42;

    ctx.save();
    ctx.fillStyle = `rgba(255, 206, 96, ${impactRatio * 0.5})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, (18 + pulse * 16) * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(31, 39, 57, ${impactRatio * 0.75})`;
    ctx.fillRect(bounds.x + bounds.width * 0.18, bounds.y + bounds.height * 0.54, bounds.width * 0.64, (8 + pulse * 8) * s);
    ctx.restore();
  }

  drawScrollHitch(bounds, color, hit, elapsedSeconds = 0) {
    const { ctx } = this;
    const s = this.spriteScale;
    ctx.save();
    ctx.globalAlpha = hit ? 0.45 : 1;

    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const radius = Math.min(h * 0.5, 10 * s);

    // Track (rounded gutter)
    const drawRoundedRect = (rx, ry, rw, rh, rr) => {
      ctx.beginPath();
      ctx.moveTo(rx + rr, ry);
      ctx.lineTo(rx + rw - rr, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
      ctx.lineTo(rx + rw, ry + rh - rr);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
      ctx.lineTo(rx + rr, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
      ctx.lineTo(rx, ry + rr);
      ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
      ctx.closePath();
    };

    ctx.fillStyle = '#1d2636';
    drawRoundedRect(x, y, w, h, radius);
    ctx.fill();
    ctx.strokeStyle = '#3c4d68';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // End-cap arrow buttons
    const cap = Math.min(h, 18 * s);
    ctx.fillStyle = '#2a3548';
    drawRoundedRect(x + 1, y + 1, cap, h - 2, radius - 1);
    ctx.fill();
    drawRoundedRect(x + w - cap - 1, y + 1, cap, h - 2, radius - 1);
    ctx.fill();

    ctx.fillStyle = '#aab7ca';
    const arrowSize = h * 0.28;
    const arrowY = y + h * 0.5;
    // left arrow
    ctx.beginPath();
    ctx.moveTo(x + cap * 0.35, arrowY);
    ctx.lineTo(x + cap * 0.7, arrowY - arrowSize);
    ctx.lineTo(x + cap * 0.7, arrowY + arrowSize);
    ctx.closePath();
    ctx.fill();
    // right arrow
    ctx.beginPath();
    ctx.moveTo(x + w - cap * 0.35, arrowY);
    ctx.lineTo(x + w - cap * 0.7, arrowY - arrowSize);
    ctx.lineTo(x + w - cap * 0.7, arrowY + arrowSize);
    ctx.closePath();
    ctx.fill();

    // Thumb — hitching back and forth inside the track
    const trackInsetX = cap + 4 * s;
    const trackWidth = w - (trackInsetX * 2);
    const thumbWidth = Math.max(trackWidth * 0.32, 26 * s);
    const slackWidth = Math.max(0, trackWidth - thumbWidth);
    const hitchPhase = (Math.sin(elapsedSeconds * 14) * 0.5) + 0.5;
    const stutter = Math.sin(elapsedSeconds * 42) * 1.6 * s;
    const thumbX = x + trackInsetX + slackWidth * hitchPhase + stutter;
    const thumbY = y + 3 * s;
    const thumbH = h - 6 * s;
    const thumbR = Math.min(thumbH * 0.5, 6 * s);

    // Thumb shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    drawRoundedRect(thumbX, thumbY + 2 * s, thumbWidth, thumbH, thumbR);
    ctx.fill();

    // Thumb body — warm amber to read as "bug"
    const grad = ctx.createLinearGradient(thumbX, thumbY, thumbX, thumbY + thumbH);
    grad.addColorStop(0, '#ffe1a4');
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    drawRoundedRect(thumbX, thumbY, thumbWidth, thumbH, thumbR);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 40, 10, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Grip lines on the thumb
    ctx.strokeStyle = 'rgba(60, 40, 10, 0.55)';
    ctx.lineWidth = 1.5;
    const gripCenter = thumbX + thumbWidth * 0.5;
    for (let i = -1; i <= 1; i += 1) {
      const gx = gripCenter + i * 4 * s;
      ctx.beginPath();
      ctx.moveTo(gx, thumbY + thumbH * 0.28);
      ctx.lineTo(gx, thumbY + thumbH * 0.72);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawScrollHitch(bounds, color, hit, elapsedSeconds = 0) {
    const { ctx } = this;
    const s = this.spriteScale;
    ctx.save();
    ctx.globalAlpha = hit ? 0.45 : 1;

    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const radius = Math.min(h * 0.5, 10 * s);

    // Track (rounded gutter)
    const drawRoundedRect = (rx, ry, rw, rh, rr) => {
      ctx.beginPath();
      ctx.moveTo(rx + rr, ry);
      ctx.lineTo(rx + rw - rr, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
      ctx.lineTo(rx + rw, ry + rh - rr);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
      ctx.lineTo(rx + rr, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
      ctx.lineTo(rx, ry + rr);
      ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
      ctx.closePath();
    };

    ctx.fillStyle = '#1d2636';
    drawRoundedRect(x, y, w, h, radius);
    ctx.fill();
    ctx.strokeStyle = '#3c4d68';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // End-cap arrow buttons
    const cap = Math.min(h, 18 * s);
    ctx.fillStyle = '#2a3548';
    drawRoundedRect(x + 1, y + 1, cap, h - 2, radius - 1);
    ctx.fill();
    drawRoundedRect(x + w - cap - 1, y + 1, cap, h - 2, radius - 1);
    ctx.fill();

    ctx.fillStyle = '#aab7ca';
    const arrowSize = h * 0.28;
    const arrowY = y + h * 0.5;
    // left arrow
    ctx.beginPath();
    ctx.moveTo(x + cap * 0.35, arrowY);
    ctx.lineTo(x + cap * 0.7, arrowY - arrowSize);
    ctx.lineTo(x + cap * 0.7, arrowY + arrowSize);
    ctx.closePath();
    ctx.fill();
    // right arrow
    ctx.beginPath();
    ctx.moveTo(x + w - cap * 0.35, arrowY);
    ctx.lineTo(x + w - cap * 0.7, arrowY - arrowSize);
    ctx.lineTo(x + w - cap * 0.7, arrowY + arrowSize);
    ctx.closePath();
    ctx.fill();

    // Thumb — hitching back and forth inside the track
    const trackInsetX = cap + 4 * s;
    const trackWidth = w - (trackInsetX * 2);
    const thumbWidth = Math.max(trackWidth * 0.32, 26 * s);
    const slackWidth = Math.max(0, trackWidth - thumbWidth);
    const hitchPhase = (Math.sin(elapsedSeconds * 14) * 0.5) + 0.5;
    const stutter = Math.sin(elapsedSeconds * 42) * 1.6 * s;
    const thumbX = x + trackInsetX + slackWidth * hitchPhase + stutter;
    const thumbY = y + 3 * s;
    const thumbH = h - 6 * s;
    const thumbR = Math.min(thumbH * 0.5, 6 * s);

    // Thumb shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    drawRoundedRect(thumbX, thumbY + 2 * s, thumbWidth, thumbH, thumbR);
    ctx.fill();

    // Thumb body — warm amber to read as "bug"
    const grad = ctx.createLinearGradient(thumbX, thumbY, thumbX, thumbY + thumbH);
    grad.addColorStop(0, '#ffe1a4');
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    drawRoundedRect(thumbX, thumbY, thumbWidth, thumbH, thumbR);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 40, 10, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Grip lines on the thumb
    ctx.strokeStyle = 'rgba(60, 40, 10, 0.55)';
    ctx.lineWidth = 1.5;
    const gripCenter = thumbX + thumbWidth * 0.5;
    for (let i = -1; i <= 1; i += 1) {
      const gx = gripCenter + i * 4 * s;
      ctx.beginPath();
      ctx.moveTo(gx, thumbY + thumbH * 0.28);
      ctx.lineTo(gx, thumbY + thumbH * 0.72);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawAIBackdrop(distance) {
    const { ctx } = this;
    // Soft violet-to-teal model-serving gradient overlay.
    const gradient = ctx.createLinearGradient(0, 90, 0, this.groundY);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
    gradient.addColorStop(1, 'rgba(34, 211, 238, 0.10)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 90, this.width, this.groundY - 90);

    // Faint token streams scrolling with the world.
    ctx.save();
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.18)';
    const tokens = ['<tok>', '0xA1', '">"', 'cite', '{...}', 'ref?', '\u00b6'];
    const baseOffset = -(distance * 0.35) % 180;
    for (let row = 0; row < 4; row += 1) {
      const rowY = 130 + row * 90;
      for (let col = -1; col < 10; col += 1) {
        const x = baseOffset + col * 180 + (row % 2) * 60;
        const token = tokens[(row * 3 + col + 7) % tokens.length];
        ctx.fillText(token, x, rowY);
      }
    }
    ctx.restore();
  }

  drawAIAnswer(bounds, obstacle, elapsedSeconds = 0) {
    const { ctx } = this;
    const s = this.spriteScale;
    const grounded = obstacle.disposition === 'grounded';
    const hit = obstacle.hit;
    const baseAlpha = hit ? 0.4 : grounded ? 0.92 : 1;

    ctx.save();
    ctx.globalAlpha = baseAlpha;

    // Hallucination glitch jitter
    let jitterX = 0;
    let jitterY = 0;
    if (!grounded && !hit) {
      const t = elapsedSeconds * 14 + bounds.x * 0.013;
      jitterX = Math.sin(t) * 1.6;
      jitterY = Math.cos(t * 1.7) * 1.2;
    }

    const x = bounds.x + jitterX;
    const y = bounds.y + jitterY;
    const w = bounds.width;
    const h = bounds.height;

    // Chat bubble body
    const fill = grounded ? '#0e7490' : '#6b21a8';
    const stroke = grounded ? '#5eead4' : '#e879f9';
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    const radius = 10 * s;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    // Bubble tail at bottom
    ctx.lineTo(x + w * 0.48, y + h);
    ctx.lineTo(x + w * 0.36, y + h + 10 * s);
    ctx.lineTo(x + w * 0.34, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glitch overlay for hallucinations
    if (!grounded && !hit) {
      const stripeY = y + ((elapsedSeconds * 90) % h);
      ctx.fillStyle = 'rgba(232, 121, 249, 0.18)';
      ctx.fillRect(x, stripeY, w, 3);
    }

    // Cite / unsourced badge
    const badgeText = grounded ? '\u2713 cited' : '\u26a0 unsourced';
    const badgeColor = grounded ? '#022c22' : '#3b0764';
    const badgeBg = grounded ? '#5eead4' : '#fbcfe8';
    ctx.font = `bold ${Math.round(11 * s)}px Trebuchet MS`;
    const badgeW = ctx.measureText(badgeText).width + 14 * s;
    const badgeH = 18 * s;
    ctx.fillStyle = badgeBg;
    ctx.fillRect(x + 8 * s, y + 8 * s, badgeW, badgeH);
    ctx.fillStyle = badgeColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, x + 15 * s, y + 8 * s + badgeH / 2);
    ctx.textBaseline = 'alphabetic';

    // Answer label inside bubble (slightly jittered glyphs for hallucinations).
    ctx.fillStyle = '#f1f5f9';
    ctx.font = `${Math.round(14 * s)}px Trebuchet MS`;
    ctx.textAlign = 'center';
    const labelX = x + w * 0.5;
    const labelY = y + h * 0.72;
    if (grounded) {
      ctx.fillText(obstacle.label, labelX, labelY);
    } else {
      // Per-character jitter to suggest unstable output.
      const text = obstacle.label;
      const totalW = ctx.measureText(text).width;
      let cursor = labelX - totalW / 2;
      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const chWidth = ctx.measureText(ch).width;
        const j = Math.sin(elapsedSeconds * 18 + i * 1.3) * 1.3 * s;
        ctx.fillText(ch, cursor + chWidth / 2, labelY + j);
        cursor += chWidth;
      }
    }
    ctx.textAlign = 'start';

    ctx.restore();

    // "Shipped" pop indicator stays minimal; the label above already conveys intent.
  }
}