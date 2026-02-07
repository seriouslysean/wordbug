// Re-export pure functions from the shared layer (single source of truth)
export {
  getWordStats,
  getLetterPatternStats,
  getWordEndingStats,
  getPatternStats,
  getLongestStreakWords,
  getChronologicalMilestones,
  getCurrentStreakStats,
  getAntiStreakStats,
  getSyllableStats,
  getLetterTypeStats,
  findWordDate,
} from '#utils/word-stats-utils';

// Re-export getLetterStatsFromFrequency under its original Astro-layer name
export { getLetterStatsFromFrequency as getLetterStats } from '#utils/word-stats-utils';
