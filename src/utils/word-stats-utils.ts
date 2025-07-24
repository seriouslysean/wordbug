import type {
  WordData,
  WordEndingStatsResult,
  WordLetterStatsResult,
  WordMilestoneResult,
  WordPatternStatsResult,
  WordStatsResult,
  WordStreakStatsResult,
} from '~types/word';
import { dateToYYYYMMDD, YYYYMMDDToDate } from '~utils/date-utils';
import { logger } from '~utils/logger';
import { countSyllables, getConsonantCount,getVowelCount } from '~utils/text-utils';

/**
 * Analyzes word data to extract basic statistics including longest/shortest words and letter frequency.
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {WordStatsResult} Statistics object containing longest/shortest words, palindromes, and letter frequency
 */
export const getWordStats = (words: WordData[]): WordStatsResult => {
  const emptyStats: WordStatsResult = {
    longest: null,
    shortest: null,
    longestPalindrome: null,
    shortestPalindrome: null,
    letterFrequency: {},
  };


  return words.reduce((stats, wordData) => {
    const word = wordData.word;
    const length = word.length;

    if (!stats.longest || length > stats.longest.length) {
      stats.longest = { word, length };
    }
    if (!stats.shortest || length < stats.shortest.length) {
      stats.shortest = { word, length };
    }

    const isPalindrome = word.toLowerCase() === word.toLowerCase().split('').reverse().join('');
    if (isPalindrome) {
      if (!stats.longestPalindrome || length > stats.longestPalindrome.length) {
        stats.longestPalindrome = { word, length };
      }
      if (!stats.shortestPalindrome || length < stats.shortestPalindrome.length) {
        stats.shortestPalindrome = { word, length };
      }
    }

    for (const letter of word.toLowerCase()) {
      stats.letterFrequency[letter] = (stats.letterFrequency[letter] || 0) + 1;
    }

    return stats;
  }, emptyStats);
};

/**
 * Converts letter frequency data into sorted statistics.
 * @param {Record<string, number>} letterFrequency - Object mapping letters to their frequency counts
 * @returns {WordLetterStatsResult} Array of letter-frequency pairs sorted by frequency (descending)
 */
export const getLetterStats = (letterFrequency: Record<string, number>): WordLetterStatsResult => {
  if (Object.keys(letterFrequency).length === 0) {
    return [];
  }
  return Object.entries(letterFrequency)
    .sort(([, a], [, b]) => b - a);
};

/**
 * Get words at specific milestone positions (25th, 50th, 100th).
 * @param {WordData[]} words - Array of word data objects
 * @returns {WordMilestoneResult} Object containing words at milestone positions or null if not reached
 */
export const getMilestoneWords = (words: WordData[]): WordMilestoneResult => {
  return {
    25: words.length >= 25 ? words[24] : null,
    50: words.length >= 50 ? words[49] : null,
    100: words.length >= 100 ? words[99] : null,
  };
};

/**
 * Analyzes words for various letter patterns including start/end matches, double letters, and alphabetical sequences.
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {WordPatternStatsResult} Object containing arrays of words matching different letter patterns
 */
export const getLetterPatternStats = (words: WordData[]): WordPatternStatsResult => {
  const patterns = {
    startEndSame: [],
    doubleLetters: [],
    tripleLetters: [],
    alphabetical: [],
  };

  words.forEach(wordObj => {
    const word = wordObj.word.toLowerCase();

    if (word.length > 1 && word[0] === word[word.length - 1]) {
      patterns.startEndSame.push(wordObj);
    }

    if (/(.)\1/.test(word)) {
      patterns.doubleLetters.push(wordObj);
    }

    if (/(.)\1{2,}/.test(word)) {
      patterns.tripleLetters.push(wordObj);
    }

    const letters = word.split('');
    let isAlphabetical = false;
    for (let i = 0; i < letters.length - 2; i++) {
      const a = letters[i].charCodeAt(0);
      const b = letters[i + 1].charCodeAt(0);
      const c = letters[i + 2].charCodeAt(0);
      if (b === a + 1 && c === b + 1) {
        isAlphabetical = true;
        break;
      }
    }
    if (isAlphabetical) {
      patterns.alphabetical.push(wordObj);
    }
  });

  return patterns;
};

/**
 * Categorizes words by common endings (-ing, -ed, -ly, -ness, -ful, -less).
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {WordEndingStatsResult} Object containing arrays of words grouped by ending type
 */
export const getWordEndingStats = (words: WordData[]): WordEndingStatsResult => {
  const endings = {
    ing: [],
    ed: [],
    ly: [],
    ness: [],
    ful: [],
    less: [],
  };

  words.forEach(wordObj => {
    const word = wordObj.word.toLowerCase();

    if (word.endsWith('ing')) {
      endings.ing.push(wordObj);
    }
    if (word.endsWith('ed')) {
      endings.ed.push(wordObj);
    }
    if (word.endsWith('ly')) {
      endings.ly.push(wordObj);
    }
    if (word.endsWith('ness')) {
      endings.ness.push(wordObj);
    }
    if (word.endsWith('ful')) {
      endings.ful.push(wordObj);
    }
    if (word.endsWith('less')) {
      endings.less.push(wordObj);
    }
  });

  return endings;
};

/**
 * Calculate current and longest word streaks based on consecutive days.
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {WordStreakStatsResult} Object containing current streak, longest streak, and active status
 */
export const getCurrentStreakStats = (words: WordData[]): WordStreakStatsResult => {
  if (words.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isActive: false,
    };
  }

  const sortedWords = [...words].sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date();
  const todayString = dateToYYYYMMDD(today);
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(today.getDate() - 1);
  const yesterdayString = dateToYYYYMMDD(yesterdayDate);

  // Check if streak is active (a word exists for today or yesterday)
  const mostRecentWord = sortedWords[0];
  // Defensive check to ensure mostRecentWord exists before accessing date
  const isActive = !!mostRecentWord && (mostRecentWord.date === todayString || mostRecentWord.date === yesterdayString);

  // Calculate current streak
  const calculateCurrentStreak = () => {
    if (!isActive || !mostRecentWord) {
      return 0;
    }

    const streakData = {
      count: 1,
      lastDate: mostRecentWord.date,
    };

    for (const word of sortedWords.slice(1)) {
      if (areConsecutiveDays(word.date, streakData.lastDate)) {
        streakData.count++;
        streakData.lastDate = word.date;
      } else {
        break;
      }
    }

    return streakData.count;
  };

  // Calculate longest streak
  const calculateLongestStreak = () => {
    if (!words.length || words.length === 1) {
      return words.length;
    }

    const streakData = {
      longest: 0,
      current: 1,
    };

    for (const [index, word] of sortedWords.entries()) {
      if (index === 0) {
        continue;
      }

      if (areConsecutiveDays(word.date, sortedWords[index - 1].date)) {
        streakData.current++;
      } else {
        streakData.longest = Math.max(streakData.longest, streakData.current);
        streakData.current = 1;
      }
    }

    return Math.max(streakData.longest, streakData.current);
  };

  const currentStreak = calculateCurrentStreak();
  const longestStreak = calculateLongestStreak();

  return {
    currentStreak,
    longestStreak,
    isActive,
  };
};

/**
 * Check if two dates are consecutive days.
 * @param {string} olderDate - Earlier date in YYYYMMDD format
 * @param {string} newerDate - Later date in YYYYMMDD format
 * @returns {boolean} True if the dates are exactly one day apart
 */
const areConsecutiveDays = (olderDate: string, newerDate: string): boolean => {
  const dOlder = YYYYMMDDToDate(olderDate);
  const dNewer = YYYYMMDDToDate(newerDate);

  if (!dOlder || !dNewer) {
    logger.warn('Invalid date in areConsecutiveDays', { olderDate, newerDate });
    return false;
  }

  const diffTime = dNewer.getTime() - dOlder.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays === 1;
};

/**
 * Finds words with the most and least syllables.
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {{mostSyllables: WordData | null, leastSyllables: WordData | null}} Object containing words with extreme syllable counts
 */
export const getSyllableStats = (words: WordData[]): { mostSyllables: WordData | null; leastSyllables: WordData | null } => {
  if (words.length === 0) {
    return {
      mostSyllables: null,
      leastSyllables: null,
    };
  }

  return words.reduce((acc, word) => {
    const syllables = countSyllables(word.word);

    if (!acc.mostSyllables || syllables > countSyllables(acc.mostSyllables.word)) {
      acc.mostSyllables = word;
    }

    if (!acc.leastSyllables || syllables < countSyllables(acc.leastSyllables.word)) {
      acc.leastSyllables = word;
    }

    return acc;
  }, {
    mostSyllables: words[0],
    leastSyllables: words[0],
  });
};

/**
 * Finds words with the most vowels and most consonants.
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {{mostVowels: WordData | null, mostConsonants: WordData | null}} Object containing words with extreme vowel/consonant counts
 */
export const getLetterTypeStats = (words: WordData[]): { mostVowels: WordData | null; mostConsonants: WordData | null } => {
  if (words.length === 0) {
    return {
      mostVowels: null,
      mostConsonants: null,
    };
  }

  return words.reduce((acc, word) => {
    const vowelCount = getVowelCount(word.word);
    const consonantCount = getConsonantCount(word.word);

    if (!acc.mostVowels || vowelCount > getVowelCount(acc.mostVowels.word)) {
      acc.mostVowels = word;
    }

    if (!acc.mostConsonants || consonantCount > getConsonantCount(acc.mostConsonants.word)) {
      acc.mostConsonants = word;
    }

    return acc;
  }, {
    mostVowels: words[0],
    mostConsonants: words[0],
  });
};

/**
 * Finds words matching special patterns (all vowels, all consonants, palindromes).
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {{allVowels: WordData[], allConsonants: WordData[], palindromes: WordData[]}} Object containing arrays of words matching special patterns
 */
export const getPatternStats = (words: WordData[]): { allVowels: WordData[]; allConsonants: WordData[]; palindromes: WordData[] } => {
  return {
    allVowels: words.filter(w => /^[aeiou]+$/i.test(w.word)),
    allConsonants: words.filter(w => /^[^aeiou]+$/i.test(w.word)),
    palindromes: words.filter(w => w.word.toLowerCase() === w.word.toLowerCase().split('').reverse().join('')),
  };
};

/**
 * Helper function to find a word's date from a list of words.
 * @param {WordData[]} words - Array of word data objects to search through
 * @param {string} targetWord - The word to find the date for
 * @returns {string | undefined} The date of the word in YYYYMMDD format, or undefined if not found
 */
export const findWordDate = (words: WordData[], targetWord: string): string | undefined => {
  if (!targetWord) {
    return undefined;
  }
  return words.find(w => w?.word === targetWord)?.date;
};

/**
 * Calculate chronological milestone words (1st, 100th, 200th, etc.) from sorted words.
 * @param {WordData[]} words - Array of word data objects sorted by date
 * @returns {Array<{milestone: number, word: WordData}>} Array of milestone word objects
 */
export const getChronologicalMilestones = (words: WordData[]): Array<{milestone: number, word: WordData}> => {
  if (words.length === 0) {
    return [];
  }

  const milestones: Array<{milestone: number, word: WordData}> = [];

  // Add 1st word if it exists
  if (words.length >= 1) {
    milestones.push({ milestone: 1, word: words[0] });
  }

  // Add every 100th word (100th, 200th, 300th, etc.)
  for (let i = 100; i <= words.length; i += 100) {
    milestones.push({ milestone: i, word: words[i - 1] }); // i-1 because array is 0-indexed
  }

  return milestones;
};
