export class LevelManager {
  constructor(levelTracks) {
    this.levelTracks = levelTracks;
    this.activeTrackIndex = 0;
    this.currentIndex = 0;
    this.syncTrackState();
  }

  syncTrackState() {
    this.activeTrack = this.levelTracks[this.activeTrackIndex];
    this.levels = this.activeTrack.levels;
    this.levelCount = this.levels.length;
  }

  getCurrentTrack() {
    return this.activeTrack;
  }

  getCurrentLevel() {
    return this.levels[this.currentIndex];
  }

  getTrackMenuItems(experimentMode = false) {
    return this.levelTracks.map((track) => ({
      id: track.id,
      label: track.label,
      description: track.description,
      levelCount: track.levels.length,
      active: track.id === this.activeTrack.id,
      sloLevelLabel:
        track.id === this.activeTrack.id
          ? `Level ${this.currentIndex + 1} of ${track.levels.length}`
          : `${track.levels.length} levels`,
    }));
  }

  advance() {
    if (this.currentIndex >= this.levels.length - 1) {
      return false;
    }

    this.currentIndex += 1;
    return true;
  }

  ensureValidIndex() {
    if (this.currentIndex >= this.levels.length) {
      this.currentIndex = 0;
    }
  }

  restartCampaign() {
    this.currentIndex = 0;
  }

  selectTrack(trackId) {
    const trackIndex = this.levelTracks.findIndex((track) => track.id === trackId);
    if (trackIndex === -1) {
      return false;
    }

    this.activeTrackIndex = trackIndex;
    this.currentIndex = 0;
    this.syncTrackState();
    return true;
  }
}