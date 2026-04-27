function replaceWindow(text, originalSeconds, newSeconds) {
  if (!text || originalSeconds == null || originalSeconds === newSeconds) return text;
  return text.replaceAll(`${originalSeconds}s`, `${newSeconds}s`);
}

export function buildLevelBriefing(level, levelIndex, rollingWindowSeconds = null) {
  const patch = (text) =>
    rollingWindowSeconds != null
      ? replaceWindow(text, level.availabilityWindowSeconds, rollingWindowSeconds)
      : text;

  return {
    title: `Level ${levelIndex}: ${level.title}`,
    subtitle: patch(level.concept),
    intro: patch(level.lesson),
    objective: patch(level.objective),
    targetLabel: patch(level.targetLabel),
    cta: level.briefingCta ?? 'Press Space to start this level.',
  };
}