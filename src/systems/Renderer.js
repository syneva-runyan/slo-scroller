const CEILING_TOP = '#0f1825';
const CEILING_BOTTOM = '#243245';
const FLOOR_COLOR = '#d7dee8';
const FLOOR_SHADOW = '#b6c0cb';

export class Renderer {
  constructor(ctx, { width, height, groundY }) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.groundY = groundY;
  }

  render(scene) {
    const { ctx } = this;

    this.drawSky(scene.flashTimer);
    this.drawBackground(scene.distance, scene.track, scene.powerTripTimer);
    this.drawGround(scene.distance);
    this.drawFinishMarker(scene.timeRemaining, scene.level.scrollSpeed);
    this.drawObstacles(scene.obstacles, scene.track?.id === 'error-budget');
    this.drawPlayer(
      scene.player,
      scene.state === 'playing' ? scene.flashTimer : 0,
      scene.track,
      scene.hammerStrike,
    );
    this.drawHud(scene);

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
    const outageActive = track?.id === 'availability' && powerTripTimer > 0;

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

    if (track?.id === 'availability') {
      this.drawAvailabilityWorkstation(outageActive, powerTripTimer);
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

  drawFinishMarker(timeRemaining, scrollSpeed) {
    const distanceRemaining = timeRemaining * scrollSpeed;
    if (distanceRemaining <= 0 || distanceRemaining > this.width * 1.5) {
      return;
    }

    const { ctx } = this;
    const x = this.width - distanceRemaining;
    ctx.fillStyle = '#fff4ce';
    ctx.fillRect(x, this.groundY - 180, 12, 180);
    ctx.fillStyle = '#d05244';
    ctx.fillRect(x + 12, this.groundY - 180, 70, 42);
  }

  drawObstacles(obstacles, bugTrackActive = false) {
    const { ctx } = this;

    for (const obstacle of obstacles) {
      const bounds = obstacle.getBounds();
      if (obstacle.kind === 'cable') {
        this.drawCable(bounds, obstacle.color, obstacle.hit);
      } else if (obstacle.kind === 'power-strip') {
        this.drawPowerStrip(bounds, obstacle.color, obstacle.hit);
      } else if (obstacle.kind === 'cart') {
        this.drawCart(bounds, obstacle.color, obstacle.hit);
      } else if (obstacle.kind === 'server') {
        this.drawServer(bounds, obstacle.color, obstacle.hit);
      } else {
        ctx.fillStyle = obstacle.hit ? 'rgba(255,255,255,0.6)' : obstacle.color;
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }

      if (bugTrackActive) {
        this.drawBugDetails(bounds, obstacle);
      }

      if (bugTrackActive && obstacle.squashTimer > 0) {
        this.drawHammerImpact(bounds, obstacle.squashTimer);
      }

      ctx.fillStyle = 'rgba(232, 242, 255, 0.92)';
      ctx.font = '16px Trebuchet MS';
      ctx.fillText(obstacle.label, bounds.x - 4, bounds.y - 10);
    }
  }

  drawPlayer(player, flashTimer, track, hammerStrike) {
    const { ctx } = this;
    const alpha = player.hitRecovery > 0 && Math.floor(player.hitRecovery * 14) % 2 === 0 ? 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = flashTimer > 0 ? 0.86 : alpha;

    ctx.fillStyle = '#17304a';
    ctx.fillRect(player.x + 10, player.y + 14, 48, 58);
    ctx.fillStyle = '#ffd7a8';
    ctx.fillRect(player.x + 18, player.y, 32, 28);
    ctx.fillStyle = '#46c2a8';
    ctx.fillRect(player.x, player.y + 28, 70, 32);
    ctx.fillStyle = '#1e2f45';
    ctx.fillRect(player.x + 8, player.y + 72, 18, 24);
    ctx.fillRect(player.x + 42, player.y + 72, 18, 24);
    if (track?.id === 'error-budget') {
      this.drawHammer(player, hammerStrike);
    }
    ctx.restore();
  }

  drawHud(scene) {
    const { ctx } = this;
    const progressPercent = scene.progressRatio;

    ctx.fillStyle = 'rgba(244, 249, 255, 0.84)';
    ctx.fillRect(28, 24, 520, 132);
    ctx.fillStyle = '#17304a';
    ctx.font = 'bold 28px Trebuchet MS';
    ctx.fillText(`${scene.levelIndex}/${scene.levelCount} ${scene.level.title}`, 44, 58);
    ctx.font = '18px Trebuchet MS';
    ctx.fillText(scene.level.concept, 44, 86);
    ctx.fillText(`Breaches: ${scene.breaches}/${scene.level.allowedBreaches}`, 44, 112);
    ctx.fillText(`Time: ${scene.elapsedSeconds.toFixed(1)} / ${scene.level.durationSeconds}s`, 44, 138);

    ctx.fillStyle = 'rgba(23, 48, 74, 0.16)';
    ctx.fillRect(580, 34, 672, 26);
    ctx.fillStyle = '#3bc2ae';
    ctx.fillRect(580, 34, 672 * progressPercent, 26);
    ctx.strokeStyle = 'rgba(23, 48, 74, 0.18)';
    ctx.strokeRect(580, 34, 672, 26);

    ctx.fillStyle = '#17304a';
    ctx.font = '16px Trebuchet MS';
    ctx.fillText(scene.level.targetLabel, 580, 86);
    ctx.fillText(`Time remaining: ${scene.timeRemaining.toFixed(1)}s`, 580, 112);
    ctx.fillText(
      scene.track?.id === 'error-budget'
        ? 'Press Space to hammer bugs, start, retry, or advance.'
        : 'Press Space to jump, start, retry, or advance.',
      580,
      138,
    );
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

  drawAvailabilityWorkstation(outageActive, powerTripTimer) {
    const { ctx } = this;
    const deskX = 862;
    const deskY = this.groundY - 122;
    const unplugOffset = outageActive ? Math.min(24, powerTripTimer * 18) : 0;
    const plugX = deskX + 164 + unplugOffset;
    const monitorGlow = outageActive ? '#121820' : '#78ffd5';
    const cableColor = outageActive ? '#ffb347' : '#8fd1ff';

    ctx.fillStyle = '#445568';
    ctx.fillRect(deskX + 12, deskY + 70, 180, 12);
    ctx.fillRect(deskX + 24, deskY + 82, 10, 40);
    ctx.fillRect(deskX + 170, deskY + 82, 10, 40);

    ctx.fillStyle = '#1d2633';
    ctx.fillRect(deskX + 34, deskY, 92, 58);
    ctx.fillStyle = monitorGlow;
    ctx.fillRect(deskX + 42, deskY + 8, 76, 42);
    ctx.fillStyle = '#263344';
    ctx.fillRect(deskX + 72, deskY + 58, 14, 16);
    ctx.fillRect(deskX + 60, deskY + 74, 38, 8);

    ctx.fillStyle = '#cfd8e3';
    ctx.fillRect(deskX + 138, deskY + 32, 54, 16);

    ctx.save();
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = cableColor;
    ctx.beginPath();
    ctx.moveTo(deskX + 188, deskY + 40);
    ctx.bezierCurveTo(
      deskX + 226,
      deskY + 68,
      deskX + 214,
      deskY + 104,
      plugX,
      deskY + 112,
    );
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#1d2430';
    ctx.fillRect(plugX, deskY + 104, 18, 14);
    ctx.fillStyle = outageActive ? '#ffd1a4' : '#d9ecff';
    ctx.fillRect(plugX + 16, deskY + 107, 4, 3);
    ctx.fillRect(plugX + 16, deskY + 112, 4, 3);

    if (outageActive) {
      ctx.strokeStyle = 'rgba(255, 196, 102, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(deskX + 188, deskY + 40);
      ctx.lineTo(deskX + 202, deskY + 30);
      ctx.lineTo(deskX + 210, deskY + 42);
      ctx.moveTo(deskX + 198, deskY + 54);
      ctx.lineTo(deskX + 214, deskY + 46);
      ctx.stroke();
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
    ctx.save();
    ctx.globalAlpha = obstacle.hit ? 0.38 : 0.95;
    ctx.fillStyle = '#1b2230';
    ctx.beginPath();
    ctx.ellipse(bounds.x + bounds.width * 0.42, bounds.y + bounds.height * 0.36, 7, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(bounds.x + bounds.width * 0.62, bounds.y + bounds.height * 0.36, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b2230';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bounds.x + bounds.width * 0.35, bounds.y + bounds.height * 0.32);
    ctx.lineTo(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.22);
    ctx.moveTo(bounds.x + bounds.width * 0.69, bounds.y + bounds.height * 0.32);
    ctx.lineTo(bounds.x + bounds.width * 0.79, bounds.y + bounds.height * 0.22);
    ctx.stroke();
    ctx.fillStyle = '#fff7c2';
    ctx.beginPath();
    ctx.arc(bounds.x + bounds.width * 0.42, bounds.y + bounds.height * 0.36, 2.2, 0, Math.PI * 2);
    ctx.arc(bounds.x + bounds.width * 0.62, bounds.y + bounds.height * 0.36, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHammer(player, hammerStrike) {
    const { ctx } = this;
    const progress = hammerStrike ? 1 - hammerStrike.timer / hammerStrike.duration : 0;
    const eased = 1 - (1 - progress) * (1 - progress);
    const angle = hammerStrike ? -0.95 + eased * 2.1 : -0.42;

    ctx.save();
    ctx.translate(player.x + 54, player.y + 40);
    ctx.rotate(angle);
    ctx.fillStyle = '#7b4c20';
    ctx.fillRect(-4, -2, 12, 58);
    ctx.fillStyle = '#a86a2b';
    ctx.fillRect(-2, 2, 8, 48);
    ctx.fillStyle = '#b8c6d6';
    ctx.fillRect(-14, -14, 30, 16);
    ctx.fillStyle = '#7c8ca0';
    ctx.fillRect(10, -14, 8, 16);
    ctx.fillStyle = '#dbe7f2';
    ctx.fillRect(-10, -10, 16, 6);
    ctx.restore();

    if (!hammerStrike || hammerStrike.targetX == null || hammerStrike.targetY == null) {
      return;
    }

    const burst = 1 - hammerStrike.timer / hammerStrike.duration;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 212, 102, ${1 - burst * 0.65})`;
    ctx.lineWidth = 4;
    for (let index = 0; index < 6; index += 1) {
      const angleStep = (Math.PI * 2 * index) / 6;
      const radius = 18 + burst * 18;
      ctx.beginPath();
      ctx.moveTo(hammerStrike.targetX, hammerStrike.targetY);
      ctx.lineTo(
        hammerStrike.targetX + Math.cos(angleStep) * radius,
        hammerStrike.targetY + Math.sin(angleStep) * radius,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHammerImpact(bounds, squashTimer) {
    const { ctx } = this;
    const impactRatio = Math.max(0, Math.min(1, squashTimer / 0.24));
    const pulse = 1 - impactRatio;
    const centerX = bounds.x + bounds.width * 0.5;
    const centerY = bounds.y + bounds.height * 0.42;

    ctx.save();
    ctx.fillStyle = `rgba(255, 206, 96, ${impactRatio * 0.5})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 18 + pulse * 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(31, 39, 57, ${impactRatio * 0.75})`;
    ctx.fillRect(bounds.x + bounds.width * 0.18, bounds.y + bounds.height * 0.54, bounds.width * 0.64, 8 + pulse * 8);
    ctx.restore();
  }
}