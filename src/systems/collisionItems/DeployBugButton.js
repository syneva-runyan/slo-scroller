export class DeployBugButton {
  draw(ctx, bounds, color, hit) {
    const buttonCenterX = bounds.x + bounds.width * 0.5;
    const faceX = bounds.x + 6;
    const faceY = bounds.y + 6;
    const faceWidth = bounds.width - 12;
    const faceHeight = bounds.height - 25;
    const buttonCenterY = faceY + faceHeight * 0.5;
    const baseX = bounds.x + 10;
    const baseY = bounds.y + bounds.height - 25;
    const baseWidth = bounds.width - 20;
    const baseHeight = 25;

    ctx.save();
    ctx.globalAlpha = hit ? 0.45 : 1;

    // Draw the base platform under the button face.
    ctx.fillStyle = '#445568';
    ctx.fillRect(baseX, baseY, baseWidth, baseHeight);

    // Draw the shadowed outer body behind the button face.
    ctx.fillStyle = '#243347';
    ctx.fillRect(faceX - 2, faceY - 2, faceWidth + 4, faceHeight + 4);

    // Draw the main red button face.
    ctx.fillStyle = '#d94d57';
    ctx.beginPath();
    ctx.roundRect(faceX, faceY, faceWidth, faceHeight, 18);
    ctx.fill();

    // Draw the glossy highlight across the top of the face.
    ctx.fillStyle = '#ee7580';
    ctx.beginPath();
    ctx.roundRect(faceX + 6, faceY + 5, faceWidth - 12, faceHeight * 0.34, 14);
    ctx.fill();

    // Draw the centered bug icon on the face.
    ctx.strokeStyle = '#eef8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(buttonCenterX - 6, buttonCenterY - 11);
    ctx.quadraticCurveTo(buttonCenterX - 10, buttonCenterY - 15, buttonCenterX - 5, buttonCenterY - 18);
    ctx.moveTo(buttonCenterX + 6, buttonCenterY - 11);
    ctx.quadraticCurveTo(buttonCenterX + 10, buttonCenterY - 15, buttonCenterX + 5, buttonCenterY - 18);

    ctx.moveTo(buttonCenterX - 9, buttonCenterY - 2);
    ctx.quadraticCurveTo(buttonCenterX - 15, buttonCenterY - 3, buttonCenterX - 17, buttonCenterY + 3);
    ctx.moveTo(buttonCenterX - 10, buttonCenterY + 5);
    ctx.quadraticCurveTo(buttonCenterX - 16, buttonCenterY + 8, buttonCenterX - 18, buttonCenterY + 14);
    ctx.moveTo(buttonCenterX - 8, buttonCenterY + 9);
    ctx.quadraticCurveTo(buttonCenterX - 13, buttonCenterY + 13, buttonCenterX - 14, buttonCenterY + 18);

    ctx.moveTo(buttonCenterX + 9, buttonCenterY - 2);
    ctx.quadraticCurveTo(buttonCenterX + 15, buttonCenterY - 3, buttonCenterX + 17, buttonCenterY + 3);
    ctx.moveTo(buttonCenterX + 10, buttonCenterY + 5);
    ctx.quadraticCurveTo(buttonCenterX + 16, buttonCenterY + 8, buttonCenterX + 18, buttonCenterY + 14);
    ctx.moveTo(buttonCenterX + 8, buttonCenterY + 9);
    ctx.quadraticCurveTo(buttonCenterX + 13, buttonCenterY + 13, buttonCenterX + 14, buttonCenterY + 18);

    ctx.arc(buttonCenterX, buttonCenterY - 4, 8, 0, Math.PI * 2);
    ctx.moveTo(buttonCenterX - 13, buttonCenterY + 2);
    ctx.lineTo(buttonCenterX + 13, buttonCenterY + 2);
    ctx.lineTo(buttonCenterX + 10, buttonCenterY + 16);
    ctx.quadraticCurveTo(buttonCenterX, buttonCenterY + 21, buttonCenterX - 10, buttonCenterY + 16);
    ctx.closePath();

    ctx.moveTo(buttonCenterX, buttonCenterY + 3);
    ctx.lineTo(buttonCenterX, buttonCenterY + 17);
    ctx.stroke();

    // Draw the platform label text.
    ctx.fillStyle = '#eef8ff';
    ctx.font = 'bold 15px Trebuchet MS';
    ctx.fillText('buggy code', baseX + 15, baseY + 20);
    ctx.restore();
  }
}