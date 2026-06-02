/**
 * Renders the player's bug-squashing hammer on the error-budget track.
 * State comes from Game.js (`hammerStrike`): { phase, elapsed, duration,
 * angle, connected, targetX, targetY }.
 *
 * Geometry: the rotation pivot is the player's hand. In the local (rotated)
 * frame the shaft extends along -Y (upward) so the head is at the tip of
 * the shaft. That way it's the head — not the handle butt — that sweeps
 * overhead on windup and crashes down on strike.
 */
export class Hammer {
  draw(ctx, player, hammerStrike, spriteScale) {
    const s = spriteScale;
    const angle = hammerStrike?.angle ?? 0.5;
    const shaftLen = 58 * s;

    ctx.save();
    // Pivot at the player's right hand (waist height, body's right side).
    ctx.translate(player.x + 50 * s, player.y + 44 * s);
    ctx.rotate(angle);

    // Handle (darker core)
    ctx.fillStyle = '#7b4c20';
    ctx.fillRect(-4 * s, -shaftLen + 4 * s, 8 * s, shaftLen);
    // Grip wrap (lighter highlight on top of the core)
    ctx.fillStyle = '#a86a2b';
    ctx.fillRect(-2 * s, -shaftLen + 6 * s, 4 * s, shaftLen - 6 * s);

    // Head, centered horizontally and sitting on top of the shaft.
    ctx.fillStyle = '#b8c6d6';
    ctx.fillRect(-14 * s, -shaftLen - 12 * s, 30 * s, 16 * s);
    // Dark stripe on the rear face of the head.
    ctx.fillStyle = '#7c8ca0';
    ctx.fillRect(-14 * s, -shaftLen - 12 * s, 8 * s, 16 * s);
    // Highlight along the top edge.
    ctx.fillStyle = '#dbe7f2';
    ctx.fillRect(-8 * s, -shaftLen - 10 * s, 16 * s, 4 * s);
    ctx.restore();

    if (!hammerStrike || !hammerStrike.connected
        || hammerStrike.targetX == null || hammerStrike.targetY == null) {
      return;
    }

    const burst = hammerStrike.phase === 'strike'
      ? Math.min(1, hammerStrike.elapsed / hammerStrike.duration)
      : 0;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 212, 102, ${1 - burst * 0.65})`;
    ctx.lineWidth = 4 * s;
    for (let index = 0; index < 6; index += 1) {
      const angleStep = (Math.PI * 2 * index) / 6;
      const radius = (18 + burst * 18) * s;
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
}
