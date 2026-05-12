import './TrackMenu.css';
import { createTrackMenuHeader } from './TrackMenuHeader.js';
import { createTrackMenuList } from './TrackMenuList.js';
import { LeaderboardView } from '../Leaderboard/LeaderboardView.js';
import { fetchTopScores } from '../../services/leaderboard.js';

const WINDOW_OPTIONS = [4, 6, 8, 10, 12, 15];

function createExperimentToggle(experimentMode, onToggle) {
  const footer = document.createElement('div');
  footer.className = 'track-menu-experiment-footer';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `track-menu-experiment-toggle${experimentMode ? ' is-active' : ''}`;
  button.textContent = experimentMode ? 'Exit experiment mode' : 'Experiment mode';
  button.addEventListener('click', onToggle);
  footer.append(button);
  return footer;
}

function createExperimentSettings(rollingWindowSeconds, onRollingTimeWindowConfigChange) {
  const panel = document.createElement('div');
  panel.className = 'track-menu-settings';

  const title = document.createElement('p');
  title.className = 'track-menu-settings-title';
  title.textContent = 'Settings';

  const row = document.createElement('div');
  row.className = 'track-menu-settings-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'track-menu-settings-label';
  labelEl.textContent = 'Rolling window';
  labelEl.setAttribute('for', 'rolling-window-select');

  const select = document.createElement('select');
  select.className = 'track-menu-settings-select';
  select.id = 'rolling-window-select';
  for (const opt of WINDOW_OPTIONS) {
    const option = document.createElement('option');
    option.value = String(opt);
    option.textContent = `${opt}s`;
    option.selected = opt === rollingWindowSeconds;
    select.append(option);
  }
  select.addEventListener('change', () => onRollingTimeWindowConfigChange(Number(select.value)));

  row.append(labelEl, select);
  panel.append(title, row);
  return panel;
}

export class TrackMenuView {
  constructor(container, { onSelectTrack, onExperimentToggle, onRollingTimeWindowConfigChange }) {
    this.container = container;
    this.onSelectTrack = onSelectTrack;
    this.onExperimentToggle = onExperimentToggle;
    this.onRollingTimeWindowConfigChange = onRollingTimeWindowConfigChange;
    this.root = document.createElement('aside');
    this.root.className = 'track-menu';
    this.container.append(this.root);
    this.lastSignature = '';
    this.leaderboardView = new LeaderboardView();
    this.lastLeaderboardTrackId = null;
    this.lastLeaderboardLevelId = null;
  }

  _loadLeaderboard(trackId, levelId) {
    if (trackId === this.lastLeaderboardTrackId && levelId === this.lastLeaderboardLevelId) {
      return;
    }
    this.lastLeaderboardTrackId = trackId;
    this.lastLeaderboardLevelId = levelId;
    this.leaderboardView.renderLoading();
    fetchTopScores({ trackId, levelId, limit: 5 })
      .then((scores) => {
        if (trackId === this.lastLeaderboardTrackId && levelId === this.lastLeaderboardLevelId) {
          this.leaderboardView.render(scores);
        }
      })
      .catch(console.error);
  }

  render({ tracks, showExperimentToggle, experimentMode, rollingWindowSeconds, activeLevelId }) {
    const signature = JSON.stringify({ tracks, showExperimentToggle, experimentMode, rollingWindowSeconds });
    const activeTrack = tracks.find((t) => t.active) ?? tracks[0];

    if (activeLevelId && activeTrack) {
      this._loadLeaderboard(activeTrack.id, activeLevelId);
    }

    if (signature === this.lastSignature) {
      return;
    }

    this.lastSignature = signature;
    this.root.replaceChildren(
      createTrackMenuHeader(activeTrack),
      createTrackMenuList(tracks, { onSelectTrack: this.onSelectTrack }),
      this.leaderboardView.root,
      ...(showExperimentToggle && experimentMode
        ? [createExperimentSettings(rollingWindowSeconds, this.onRollingTimeWindowConfigChange)]
        : []),
      ...(showExperimentToggle ? [createExperimentToggle(experimentMode, this.onExperimentToggle)] : []),
    );
  }
}