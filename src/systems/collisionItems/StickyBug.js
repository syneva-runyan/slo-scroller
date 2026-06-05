export class StickyBug {
  constructor(spriteScale = 1) {
    this.spriteScale = spriteScale;
  }

  draw(ctx, bounds, color, hit) {
    const s = this.spriteScale;
    const { x, y, width: w, height: h } = bounds;
    const cx = x + w * 0.5;

    ctx.save();
    ctx.globalAlpha = hit ? 0.45 : 1;

    // Sticky goo puddle at the base.
    const puddleY = y + h - 4 * s;
    const puddleRx = w * 0.55;
    const puddleRy = 8 * s;
    ctx.fillStyle = '#6b3a26';
    ctx.beginPath();
    ctx.ellipse(cx, puddleY, puddleRx, puddleRy, 0, 0, Math.PI * 2);
    ctx.fill();
    // glossy highlight on the puddle
    ctx.fillStyle = 'rgba(255, 220, 170, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.18, puddleY - 1 * s, w * 0.22, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body geometry — tall oval rising out of the puddle.
    const bodyTop = y + h * 0.18;
    const bodyBottom = puddleY - 2 * s;
    const bodyCenterY = (bodyTop + bodyBottom) * 0.5;
    const bodyRx = w * 0.42;
    const bodyRy = (bodyBottom - bodyTop) * 0.5;

    // Legs — three on each side, drawn before body so they tuck under.
    ctx.strokeStyle = '#3a1d12';
    ctx.lineWidth = Math.max(2, 2.4 * s);
    ctx.lineCap = 'round';
    const legAnchorYs = [
      bodyCenterY - bodyRy * 0.45,
      bodyCenterY,
      bodyCenterY + bodyRy * 0.45,
    ];
    for (const ay of legAnchorYs) {
      // left
      ctx.beginPath();
      ctx.moveTo(cx - bodyRx * 0.6, ay);
      ctx.quadraticCurveTo(cx - bodyRx - 10 * s, ay + 4 * s, cx - bodyRx - 6 * s, ay + 14 * s);
      ctx.stroke();
      // right
      ctx.beginPath();
      ctx.moveTo(cx + bodyRx * 0.6, ay);
      ctx.quadraticCurveTo(cx + bodyRx + 10 * s, ay + 4 * s, cx + bodyRx + 6 * s, ay + 14 * s);
      ctx.stroke();
    }

    // Body shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx + 2 * s, bodyCenterY + 2 * s, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body fill with a soft gradient for roundness.
    const grad = ctx.createRadialGradient(
      cx - bodyRx * 0.35, bodyTop + bodyRy * 0.4, bodyRx * 0.1,
      cx, bodyCenterY, bodyRx * 1.15,
    );
    grad.addColorStop(0, '#c97a5e');
    grad.addColorStop(0.55, color);
    grad.addColorStop(1, '#5e2f23');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, bodyCenterY, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body outline.
    ctx.strokeStyle = '#3a1d12';
    ctx.lineWidth = Math.max(1.5, 1.8 * s);
    ctx.stroke();

    // Carapace segment lines.
    ctx.strokeStyle = 'rgba(40, 18, 8, 0.55)';
    ctx.lineWidth = 1.5;
    for (const t of [0.32, 0.55, 0.78]) {
      const segY = bodyTop + (bodyBottom - bodyTop) * t;
      const dx = bodyRx * Math.sqrt(Math.max(0, 1 - Math.pow((segY - bodyCenterY) / bodyRy, 2))) * 0.92;
      ctx.beginPath();
      ctx.moveTo(cx - dx, segY);
      ctx.quadraticCurveTo(cx, segY + 3 * s, cx + dx, segY);
      ctx.stroke();
    }

    // Highlight stripe down the back.
    ctx.fillStyle = 'rgba(255, 220, 180, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx - bodyRx * 0.25, bodyCenterY - bodyRy * 0.2, bodyRx * 0.18, bodyRy * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Antennae.
    ctx.strokeStyle = '#2a140a';
    ctx.lineWidth = Math.max(1.4, 1.6 * s);
    ctx.beginPath();
    ctx.moveTo(cx - bodyRx * 0.35, bodyTop + 2 * s);
    ctx.quadraticCurveTo(cx - bodyRx * 0.6, y + 2 * s, cx - bodyRx * 0.85, y - 2 * s);
    ctx.moveTo(cx + bodyRx * 0.35, bodyTop + 2 * s);
    ctx.quadraticCurveTo(cx + bodyRx * 0.6, y + 2 * s, cx + bodyRx * 0.85, y - 2 * s);
    ctx.stroke();
    // antenna tips
    ctx.fillStyle = '#ffe188';
    ctx.beginPath();
    ctx.arc(cx - bodyRx * 0.85, y - 2 * s, 2.4 * s, 0, Math.PI * 2);
    ctx.arc(cx + bodyRx * 0.85, y - 2 * s, 2.4 * s, 0, Math.PI * 2);
    ctx.fill();

    // Drippy goo strings hanging off the body.
    ctx.strokeStyle = 'rgba(107, 58, 38, 0.85)';
    ctx.lineWidth = 2 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - bodyRx * 0.55, bodyBottom - 2 * s);
    ctx.lineTo(cx - bodyRx * 0.55, bodyBottom + 4 * s);
    ctx.moveTo(cx + bodyRx * 0.4, bodyBottom - 1 * s);
    ctx.lineTo(cx + bodyRx * 0.4, bodyBottom + 6 * s);
    ctx.stroke();

    ctx.restore();
  }
}
