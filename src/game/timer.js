export function updateElapsedSeconds(elapsedSeconds, deltaSeconds, state) {
  if (state !== 'playing') {
    return elapsedSeconds;
  }

  return elapsedSeconds + deltaSeconds;
}