export function buildLevelBriefing(level, levelIndex) {
  return {
    title: `Level ${levelIndex}: ${level.title}`,
    subtitle: level.concept,
    intro: level.lesson,
    objective: level.objective,
    operationalNote: level.operationalNote,
    cta: 'Press Space to start this level.',
  };
}