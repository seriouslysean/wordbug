// Re-export pure functions from the shared layer (single source of truth)
export {
  getWordStats,
  getLetterStats,
  getLetterPatternStats,
  getWordEndingStats,
  getPartOfSpeechStats,
  getPatternStats,
  getLongestStreakWords,
  getChronologicalMilestones,
  getCurrentStreakStats,
  getAntiStreakStats,
  getSyllableStats,
  getLetterTypeStats,
  findWordDate,
} from '#utils/word-stats-utils';
