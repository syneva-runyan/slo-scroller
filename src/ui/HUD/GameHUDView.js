import './GameHUDView.css';
import { isAvailabilityTrack } from '../../game/trackUtils.js';

function el(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function patchWindow(text, originalSeconds, newSeconds) {
  if (!text || originalSeconds == null || originalSeconds === newSeconds) return text;
  return text.replaceAll(`${originalSeconds}s`, `${newSeconds}s`);
}

export class GameHUDView {
  constructor(container) {
    this.root = el('div', 'game-hud');
    this.root.setAttribute('aria-hidden', 'true');

    // ── Top row ──────────────────────────────────────────────────────────────
    const top = el('div', 'game-hud-top');

    // Left panel: level identity + live stat
    this.panel = el('div', 'game-hud-panel');
    this.levelTitleEl = el('p', 'game-hud-level-title');
    this.conceptEl = el('p', 'game-hud-concept');
    this.statEl = el('p', 'game-hud-stat');
    this.timeEl = el('p', 'game-hud-time');
    this.panel.append(this.levelTitleEl, this.conceptEl, this.statEl, this.timeEl);

    // Right section: progress bar + target label + meta
    this.rightSection = el('div', 'game-hud-right');
    this.progressBar = el('div', 'game-hud-progress-bar');
    this.progressFill = el('div', 'game-hud-progress-fill');
    this.progressBar.append(this.progressFill);
    this.targetLabelEl = el('p', 'game-hud-target-label');
    this.metaEl = el('p', 'game-hud-meta');
    this.rightSection.append(this.progressBar, this.targetLabelEl, this.metaEl);

    top.append(this.panel, this.rightSection);
    this.root.append(top);
    container.append(this.root);

    this._lastMarkerCount = -1;
    this._isAvailTrack = false;
  }

  render({ level, track, state, progressRatio, progressHitMarkers,
           rollingAvailability, availabilityTarget, availabilityWindowSeconds,
           breaches, elapsedSeconds }) {
    this.root.hidden = state === 'menu';
    if (state === 'menu') return;

    const avail = isAvailabilityTrack(track);
    const patch = (text) => patchWindow(text, level.availabilityWindowSeconds, availabilityWindowSeconds);

    // Left panel
    this.levelTitleEl.textContent = level.title;
    this.conceptEl.textContent = patch(level.concept);
    this.timeEl.textContent = `${elapsedSeconds.toFixed(1)}s / ${level.durationSeconds}s`;

    if (avail) {
      const gap = rollingAvailability - availabilityTarget;
      this.statEl.textContent =
        `${(rollingAvailability * 100).toFixed(0)}% / ${(availabilityTarget * 100).toFixed(0)}% target`;
      this.statEl.dataset.status = gap < 0 ? 'danger' : gap <= 0.05 ? 'warning' : 'ok';
    } else {
      this.statEl.textContent = `Breaches: ${breaches} / ${level.allowedBreaches}`;
      this.statEl.removeAttribute('data-status');
    }

    // Progress bar fill
    this.progressFill.style.width = `${Math.min(1, progressRatio) * 100}%`;

    // Hit markers — only rebuild when the count or track type changes
    if (progressHitMarkers.length !== this._lastMarkerCount || avail !== this._isAvailTrack) {
      for (const m of this.progressBar.querySelectorAll('.game-hud-hit-marker')) {
        m.remove();
      }
      if (avail) {
        for (const pos of progressHitMarkers) {
          const m = el('div', 'game-hud-hit-marker');
          m.style.left = `${pos * 100}%`;
          this.progressBar.append(m);
        }
      }
      this._lastMarkerCount = progressHitMarkers.length;
      this._isAvailTrack = avail;
    }

    // Right labels
    this.targetLabelEl.textContent = patch(level.targetLabel);
    this.metaEl.textContent = avail ? `Rolling ${availabilityWindowSeconds}s window` : '';
  }
}
