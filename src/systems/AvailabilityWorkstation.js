export class AvailabilityWorkstation {
  constructor({ groundY }) {
    this.groundY = groundY;
  }

  draw(ctx, outageActive, powerTripTimer, distance) {
    const deskX = 862;
    const floatLift = 34 + Math.sin(distance * 0.018) * 5;
    const deskY = this.groundY - 152 - floatLift;
    const unplugOffset = outageActive ? Math.min(24, powerTripTimer * 18) : 0;
    const plugX = deskX + 164 + unplugOffset;
    const monitorGlow = outageActive ? '#121820' : '#78ffd5';
    const cableColor = outageActive ? '#ffb347' : '#8fd1ff';
    const serviceStatusLabel = outageActive ? 'DOWN' : 'UP';
    const usableStatusLabel = outageActive ? 'NO USE' : 'USABLE';
    const serviceStatusColor = outageActive ? '#ff4d5f' : '#34d17a';
    const usableStatusColor = outageActive ? '#ffb000' : '#3dd5f3';

    // Draw the floating shadow under the workstation.
    ctx.fillStyle = 'rgba(36, 49, 65, 0.18)';
    ctx.beginPath();
    ctx.ellipse(deskX + 88, this.groundY + 22, 118, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw the cloud-like backdrop behind the workstation.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.74)';
    ctx.beginPath();
    ctx.ellipse(deskX - 26, deskY + 54, 52, 38, 0, 0, Math.PI * 2);
    ctx.ellipse(deskX + 38, deskY + 34, 68, 48, 0, 0, Math.PI * 2);
    ctx.ellipse(deskX + 126, deskY + 28, 76, 54, 0, 0, Math.PI * 2);
    ctx.ellipse(deskX + 214, deskY + 52, 46, 34, 0, 0, Math.PI * 2);
    ctx.ellipse(deskX + 18, deskY + 114, 54, 30, 0, 0, Math.PI * 2);
    ctx.ellipse(deskX + 96, deskY + 126, 82, 34, 0, 0, Math.PI * 2);
    ctx.ellipse(deskX + 186, deskY + 112, 56, 28, 0, 0, Math.PI * 2);
    ctx.fillRect(deskX - 8, deskY + 52, 212, 68);
    ctx.fill();

    // Draw the cable first so the monitor and status panel sit in front of it.
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

    // Draw the desk surface and support legs.
    ctx.fillStyle = '#445568';
    ctx.fillRect(deskX + 12, deskY + 70, 180, 12);
    ctx.fillRect(deskX + 24, deskY + 82, 10, 40);
    ctx.fillRect(deskX + 170, deskY + 82, 10, 40);

    // Draw the left monitor and its stand.
    ctx.fillStyle = '#1d2633';
    ctx.fillRect(deskX + 34, deskY, 92, 58);
    ctx.fillStyle = monitorGlow;
    ctx.fillRect(deskX + 42, deskY + 8, 76, 42);
    ctx.fillStyle = '#263344';
    ctx.fillRect(deskX + 72, deskY + 58, 14, 16);
    ctx.fillRect(deskX + 60, deskY + 74, 38, 8);

    // Draw the keyboard in front of the main monitor.
    ctx.fillStyle = '#cfd8e3';
    ctx.fillRect(deskX + 138, deskY + 32, 54, 16);

    // Draw the status panel that shows uptime and usability.
    ctx.fillStyle = '#1b2533';
    ctx.fillRect(deskX + 138, deskY + 10, 92, 64);
    ctx.fillStyle = '#253141';
    ctx.fillRect(deskX + 144, deskY + 18, 80, 52);

    ctx.fillStyle = serviceStatusColor;
    ctx.fillRect(deskX + 148, deskY + 22, 32, 14);
    ctx.fillStyle = '#0f1825';
    ctx.font = 'bold 10px Trebuchet MS';
    ctx.fillText(serviceStatusLabel, deskX + 151, deskY + 32);

    ctx.fillStyle = usableStatusColor;
    ctx.fillRect(deskX + 184, deskY + 22, 38, 14);
    ctx.fillStyle = '#0f1825';
    ctx.fillText(usableStatusLabel, deskX + 187, deskY + 32);

    ctx.fillStyle = outageActive ? '#ffd2a1' : '#f4f8ff';
    ctx.font = 'bold 12px Trebuchet MS';
    ctx.fillText(outageActive ? 'NO RESP' : '200 OK', deskX + 150, deskY + 50);
    ctx.font = 'bold 9px Trebuchet MS';
    ctx.fillText(
      outageActive ? 'Users blocked' : 'Users served',
      deskX + 150,
      deskY + 62,
    );

    // Draw the loose power plug on the far side of the desk.
    ctx.fillStyle = '#1d2430';
    ctx.fillRect(plugX, deskY + 104, 18, 14);
    ctx.fillStyle = outageActive ? '#ffd1a4' : '#d9ecff';
    ctx.fillRect(plugX + 16, deskY + 107, 4, 3);
    ctx.fillRect(plugX + 16, deskY + 112, 4, 3);

    // Draw the service label and summary card on the main monitor.
    ctx.fillStyle = outageActive ? '#8f2032' : '#116a45';
    ctx.fillRect(deskX + 46, deskY + 11, 30, 12);
    ctx.fillStyle = '#f4f8ff';
    ctx.font = 'bold 9px Trebuchet MS';
    ctx.fillText(outageActive ? 'SVC!' : 'SVC', deskX + 51, deskY + 20);

    ctx.fillStyle = outageActive ? 'rgba(255, 77, 95, 0.24)' : 'rgba(52, 209, 122, 0.22)';
    ctx.fillRect(deskX + 46, deskY + 26, 68, 20);
    ctx.strokeStyle = outageActive ? 'rgba(255, 77, 95, 0.9)' : 'rgba(61, 213, 243, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(deskX + 46, deskY + 26, 68, 20);
    ctx.fillStyle = '#f4f8ff';
    ctx.font = 'bold 11px Trebuchet MS';
    ctx.fillText(outageActive ? 'Service down' : 'Service live', deskX + 49, deskY + 39);

    // Draw the monitor state icon for outage vs healthy service.
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

      ctx.fillStyle = 'rgba(255, 107, 107, 0.16)';
      ctx.fillRect(deskX + 42, deskY + 8, 76, 42);
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(deskX + 52, deskY + 18);
      ctx.lineTo(deskX + 108, deskY + 42);
      ctx.moveTo(deskX + 108, deskY + 18);
      ctx.lineTo(deskX + 52, deskY + 42);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(102, 217, 239, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(deskX + 50, deskY + 38);
      ctx.lineTo(deskX + 64, deskY + 28);
      ctx.lineTo(deskX + 78, deskY + 36);
      ctx.lineTo(deskX + 96, deskY + 22);
      ctx.lineTo(deskX + 110, deskY + 30);
      ctx.stroke();
    }
  }
}