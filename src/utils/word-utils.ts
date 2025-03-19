// This file is deprecated - functions have been moved to specific utils files
// Import from the new locations:
// - Word data functions → word-data-utils.js
// - Word stats functions → word-stats-utils.js
// - Text formatting functions → text-utils.js

export {
  countSyllables,
  formatWordCount,
} from '~utils/text-utils';
export {
  generateWordDataHash,
  getAdjacentWords,
  getAllWords,
  getAvailableYears,
  getCurrentWord,
  getPastWords,
  getWordByDate,
  getWordDetails,
  getWordsByYear,
  groupWordsByYear,
} from '~utils/word-data-utils';
export {
  findWordDate,
  getCurrentStreakStats,
  getLetterPatternStats,
  getLetterStats,
  getLetterTypeStats,
  getMilestoneWords,
  getPatternStats,
  getSyllableStats,
  getWordEndingStats,
  getWordStats,
} from '~utils/word-stats-utils';