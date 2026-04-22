export function isAvailabilityTrack(track) {
  return track?.id === 'availability' || track?.id === 'availability-lab';
}

export function formatAvailabilityPercent(value) {
  const percent = value * 100;
  return Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1);
}