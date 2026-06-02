export class ScrollHitch {
  constructor(spriteScale = 1) {
    this.spriteScale = spriteScale;
  }

  draw(ctx, bounds, color, hit, elapsedSeconds = 0) {
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
}
