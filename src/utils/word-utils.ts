// This file is deprecated - functions have been moved to specific utils files
// Import from the new locations:
// - Word data functions → word-data-utils.js
// - Word stats functions → word-stats-utils.js
// - Text formatting functions → text-utils.js

export {
  getAllWords,
  getCurrentWord,
  getPastWords,
  getWordByDate,
  getAdjacentWords,
  getWordDetails,
  getWordsByYear,
  generateWordDataHash,
  groupWordsByYear,
  getAvailableYears,
} from '~utils/word-data-utils';

export {
  getWordStats,
  getLetterStats,
  getMilestoneWords,
  getLetterPatternStats,
  getWordEndingStats,
  getCurrentStreakStats,
  getSyllableStats,
  getLetterTypeStats,
  getPatternStats,
  findWordDate,
} from '~utils/word-stats-utils';

export {
  countSyllables,
  formatWordCount,
} from '~utils/text-utils';