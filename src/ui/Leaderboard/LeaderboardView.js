import './LeaderboardView.css';

/**
 * Renders a top-N leaderboard list.
 * Supports a loading skeleton and an empty state.
 */
export class LeaderboardView {
  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'leaderboard';
  }

  renderLoading() {
    this.root.replaceChildren();
    const title = document.createElement('p');
    title.className = 'leaderboard-title';
    title.textContent = 'Top scores';
    const skeleton = document.createElement('div');
    skeleton.className = 'leaderboard-skeleton';
    for (let i = 0; i < 5; i++) {
      const row = document.createElement('div');
      row.className = 'leaderboard-skeleton-row';
      skeleton.append(row);
    }
    this.root.append(title, skeleton);
  }

  render(scores, highlightedRank = null) {
    this.root.replaceChildren();

    const title = document.createElement('p');
    title.className = 'leaderboard-title';
    title.textContent = 'Top scores';
    this.root.append(title);

    if (scores.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'leaderboard-empty';
      empty.textContent = 'No scores yet — be the first!';
      this.root.append(empty);
      return;
    }

    const list = document.createElement('ol');
    list.className = 'leaderboard-list';

    for (const [index, score] of scores.entries()) {
      const rank = index + 1;
      const item = document.createElement('li');
      item.className = `leaderboard-row${rank === highlightedRank ? ' leaderboard-row--highlight' : ''}`;

      const rankEl = document.createElement('span');
      rankEl.className = 'leaderboard-rank';
      rankEl.textContent = String(rank);

      const nameEl = document.createElement('span');
      nameEl.className = 'leaderboard-name';
      nameEl.textContent = score.displayName;

      const statEl = document.createElement('span');
      statEl.className = 'leaderboard-stat';
      statEl.textContent = `${score.breaches}B · ${score.elapsedSeconds.toFixed(1)}s`;

      item.append(rankEl, nameEl, statEl);
      list.append(item);
    }

    this.root.append(list);
  }
}
