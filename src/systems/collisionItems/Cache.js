export class Cache {
  constructor(spriteScale = 1) {
    this.spriteScale = spriteScale;
  }

  draw(ctx, bounds, color, hit, elapsedSeconds = 0) {
    const s = this.spriteScale;
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(elapsedSeconds * 6));
    ctx.save();
    ctx.globalAlpha = hit ? 0.25 : 1;
    // Soft outer glow.
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * s * pulse;
    // Body: rounded box with a lighter inner panel.
    ctx.fillStyle = '#0b2236';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.fillRect(bounds.x + 4, bounds.y + 4, bounds.width - 8, bounds.height - 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(bounds.x + 8, bounds.y + 8, bounds.width - 16, 6);
    // Lightning bolt to signal speed.
    ctx.fillStyle = '#fef9c3';
    const cx = bounds.x + bounds.width * 0.5;
    const cy = bounds.y + bounds.height * 0.5;
    const bw = bounds.width * 0.16;
    const bh = bounds.height * 0.34;
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.4, cy - bh);
    ctx.lineTo(cx + bw, cy - bh * 0.15);
    ctx.lineTo(cx + bw * 0.1, cy + bh * 0.1);
    ctx.lineTo(cx + bw * 0.9, cy + bh);
    ctx.lineTo(cx - bw, cy + bh * 0.2);
    ctx.lineTo(cx + bw * 0.05, cy - bh * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
