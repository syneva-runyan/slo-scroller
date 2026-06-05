import './TrackMenu.css';
import { createTrackMenuHeader } from './TrackMenuHeader.js';
import { createTrackMenuList } from './TrackMenuList.js';
import { LeaderboardView } from '../Leaderboard/LeaderboardView.js';
import { fetchTopScores } from '../../services/leaderboard.js';

const WINDOW_OPTIONS = [4, 6, 8, 10, 12, 15];
const TAB_TRACKS = 'tracks';
const TAB_SCORES = 'scores';
const PERCENTILE_OPTIONS = [
  { value: 0.5, label: 'p50' },
  { value: 0.9, label: 'p90' },
  { value: 0.95, label: 'p95' },
  { value: 0.99, label: 'p99' },
];

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

function createRollingWindowSettings(rollingWindowSeconds, onRollingTimeWindowConfigChange) {
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

function createPercentileSettings(targetPercentile, onPercentileChange) {
  const panel = document.createElement('div');
  panel.className = 'track-menu-settings';

  const title = document.createElement('p');
  title.className = 'track-menu-settings-title';
  title.textContent = 'Settings';

  const row = document.createElement('div');
  row.className = 'track-menu-settings-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'track-menu-settings-label';
  labelEl.textContent = 'Target percentile';
  labelEl.setAttribute('for', 'target-percentile-select');

  const select = document.createElement('select');
  select.className = 'track-menu-settings-select';
  select.id = 'target-percentile-select';
  for (const opt of PERCENTILE_OPTIONS) {
    const option = document.createElement('option');
    option.value = String(opt.value);
    option.textContent = opt.label;
    option.selected = opt.value === targetPercentile;
    select.append(option);
  }
  select.addEventListener('change', () => onPercentileChange(Number(select.value)));

  row.append(labelEl, select);
  panel.append(title, row);
  return panel;
}

function createTabs(activeTab, onSelectTab) {
  const root = document.createElement('div');
  root.className = 'track-menu-tabs';

  const tabs = [
    { id: TAB_TRACKS, label: 'Tracks' },
    { id: TAB_SCORES, label: 'Top scores for track' },
  ];

  for (const tab of tabs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `track-menu-tab${activeTab === tab.id ? ' is-active' : ''}`;
    button.textContent = tab.label;
    button.addEventListener('click', () => onSelectTab(tab.id));
    root.append(button);
  }

  return root;
}

export class TrackMenuView {
  constructor(container, { onSelectTrack, onExperimentToggle, onRollingTimeWindowConfigChange, onPercentileChange }) {
    this.container = container;
    this.onSelectTrack = onSelectTrack;
    this.onExperimentToggle = onExperimentToggle;
    this.onRollingTimeWindowConfigChange = onRollingTimeWindowConfigChange;
    this.onPercentileChange = onPercentileChange;
    this.root = document.createElement('aside');
    this.root.className = 'track-menu';
    this.container.append(this.root);
    this.lastSignature = '';
    this.leaderboardView = new LeaderboardView();
    this.lastLeaderboardTrackId = null;
    this.lastLeaderboardLevelId = null;
    this.activeTab = TAB_TRACKS;
  }

  setActiveTab(tabId) {
    if (tabId === TAB_TRACKS || tabId === TAB_SCORES) {
      this.activeTab = tabId;
      this.lastSignature = '';
    }
  }

  _loadLeaderboard(trackId, levelId, highlightedRank = null) {
    if (trackId === this.lastLeaderboardTrackId && levelId === this.lastLeaderboardLevelId && highlightedRank == null) {
      return;
    }
    this.lastLeaderboardTrackId = trackId;
    this.lastLeaderboardLevelId = levelId;
    this.leaderboardView.renderLoading();
    fetchTopScores({ trackId, levelId, limit: 5 })
      .then((scores) => {
        if (trackId === this.lastLeaderboardTrackId && levelId === this.lastLeaderboardLevelId) {
          this.leaderboardView.render(scores, highlightedRank);
        }
      })
      .catch(console.error);
  }

  _renderLeaderboard(leaderboardData, activeTrack, activeLevelId) {
    if (!activeTrack || !activeLevelId) {
      this.leaderboardView.render([]);
      return;
    }

    if (leaderboardData?.scores) {
      this.lastLeaderboardTrackId = activeTrack.id;
      this.lastLeaderboardLevelId = activeLevelId;
      this.leaderboardView.render(leaderboardData.scores, leaderboardData.rank);
      return;
    }

    this._loadLeaderboard(activeTrack.id, activeLevelId);
  }

  invalidateLeaderboard() {
    this.lastLeaderboardTrackId = null;
    this.lastLeaderboardLevelId = null;
  }

  render({
    tracks,
    showExperimentToggle,
    experimentMode,
    rollingWindowSeconds,
    activeLevelId,
    activeTrackId,
    targetPercentile,
    leaderboardData,
  }) {
    const signature = JSON.stringify({
      tracks,
      showExperimentToggle,
      experimentMode,
      rollingWindowSeconds,
      activeTrackId,
      targetPercentile,
      activeTab: this.activeTab,
      leaderboardData,
    });
    const activeTrack = tracks.find((t) => t.active) ?? tracks[0];
    this._renderLeaderboard(leaderboardData, activeTrack, activeLevelId);

    if (signature === this.lastSignature) {
      return;
    }

    const settingsPanels = [];
    if (showExperimentToggle && experimentMode) {
      if (activeTrackId === 'response-time') {
        settingsPanels.push(createPercentileSettings(targetPercentile, this.onPercentileChange));
      } else {
        settingsPanels.push(createRollingWindowSettings(rollingWindowSeconds, this.onRollingTimeWindowConfigChange));
      }
    }

    this.lastSignature = signature;
    const bodyChildren = this.activeTab === TAB_SCORES
      ? [this.leaderboardView.root]
      : [
          createTrackMenuList(tracks, { onSelectTrack: this.onSelectTrack }),
          ...settingsPanels,
          ...(showExperimentToggle ? [createExperimentToggle(experimentMode, this.onExperimentToggle)] : []),
        ];

    this.root.replaceChildren(
      createTrackMenuHeader(activeTrack),
      createTabs(this.activeTab, (tabId) => this.setActiveTab(tabId)),
      ...bodyChildren,
    );
  }
}