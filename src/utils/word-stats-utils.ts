import type {
  WordData,
  WordEndingStatsResult,
  WordLetterStatsResult,
  WordPatternStatsResult,
  WordStatsResult,
  WordStreakStatsResult,
  WordAntiStreakStatsResult,
} from '~types';
import { dateToYYYYMMDD, YYYYMMDDToDate } from '~utils/date-utils';
import { logger } from '~astro-utils/logger';
import {
  countSyllables,
  getConsonantCount,
  getVowelCount,
  getWordEndings,
  hasAlphabeticalSequence,
  hasDoubleLetters,
  hasTripleLetters,
  isAllConsonants,
  isAllVowels,
  isPalindrome,
  isStartEndSame,
} from '~utils/text-utils';

/**
 * Analyzes word data to extract basic statistics including longest/shortest words and word count by letter.
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {WordStatsResult} Statistics object containing longest/shortest words, palindromes, and count of words containing each letter
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

    if (!stats.longest || length > stats.longest.word.length) {
      stats.longest = wordData;
    }
    if (!stats.shortest || length < stats.shortest.word.length) {
      stats.shortest = wordData;
    }

    if (isPalindrome(word)) {
      if (!stats.longestPalindrome || length > stats.longestPalindrome.word.length) {
        stats.longestPalindrome = wordData;
      }
      if (!stats.shortestPalindrome || length < stats.shortestPalindrome.word.length) {
        stats.shortestPalindrome = wordData;
      }
    }

    const uniqueLetters = new Set(word.toLowerCase());
    for (const letter of uniqueLetters) {
      stats.letterFrequency[letter] = (stats.letterFrequency[letter] || 0) + 1;
    }

    return stats;
  }, emptyStats);
};

/**
 * Converts letter word count data into sorted statistics, filtering to a-z only (case-insensitive).
 * @param {Record<string, number>} letterFrequency - Object mapping letters to count of words containing them
 * @returns {WordLetterStatsResult} Array of letter-wordcount pairs sorted by word count (descending), only a-z
 *
 * Note: This intentionally ignores spaces, punctuation, and accented letters for stats purposes.
 */
export const getLetterStats = (letterFrequency: Record<string, number>): WordLetterStatsResult => {
  if (Object.keys(letterFrequency).length === 0) {
    return [];
  }
  return Object.entries(letterFrequency)
    .filter(([letter]) => /^[a-z]$/i.test(letter))
    .sort(([, a], [, b]) => b - a);
};



/**
 * Get words at specific milestone positions (25th, 50th, 100th).
 * @param {WordData[]} words - Array of word data objects
 * @returns {WordMilestoneResult} Object containing words at milestone positions or null if not reached
 */


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
    palindromes: [],
  };

  words.forEach(wordObj => {
    const word = wordObj.word;
    if (isStartEndSame(word)) {
      patterns.startEndSame.push(wordObj);
    }
    if (hasDoubleLetters(word)) {
      patterns.doubleLetters.push(wordObj);
    }
    if (hasTripleLetters(word)) {
      patterns.tripleLetters.push(wordObj);
    }
    if (hasAlphabeticalSequence(word)) {
      patterns.alphabetical.push(wordObj);
    }
    if (isPalindrome(word)) {
      patterns.palindromes.push(wordObj);
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
    const word = wordObj.word;
    const matchedEndings = getWordEndings(word);
    matchedEndings.forEach(ending => {
      if (endings[ending]) {
        endings[ending].push(wordObj);
      }
    });
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

  const mostRecentWord = sortedWords[0];
  const isActive = !!mostRecentWord && (mostRecentWord.date === todayString || mostRecentWord.date === yesterdayString);
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
 * Get the words that make up the longest streak in the collection.
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {WordData[]} Array of words from the longest consecutive streak
 */
export const getLongestStreakWords = (words: WordData[]): WordData[] => {
  if (words.length <= 1) {
    return words;
  }

  const sortedWords = [...words].sort((a, b) => b.date.localeCompare(a.date));

  const { longestStreak } = sortedWords.slice(1).reduce(
    ({ longestStreak, currentStreak, previousWord }, word) => {
      const isConsecutive = areConsecutiveDays(word.date, previousWord.date);
      const newCurrentStreak = isConsecutive ? [...currentStreak, word] : [word];
      const newLongestStreak = newCurrentStreak.length > longestStreak.length
        ? newCurrentStreak
        : longestStreak;

      return {
        longestStreak: newLongestStreak,
        currentStreak: newCurrentStreak,
        previousWord: word,
      };
    },
    {
      longestStreak: [sortedWords[0]],
      currentStreak: [sortedWords[0]],
      previousWord: sortedWords[0],
    },
  );

  return longestStreak.reverse();
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
    allVowels: words.filter(w => isAllVowels(w.word)),
    allConsonants: words.filter(w => isAllConsonants(w.word)),
    palindromes: words.filter(w => isPalindrome(w.word)),
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
export function getChronologicalMilestones(words: WordData[]): Array<{milestone: number, word: WordData}> {
  if (words.length === 0) {
    return [];
  }
  return [
    { milestone: 1, word: words[0] },
    ...[25, 50, 75]
      .filter(m => words.length >= m)
      .map(m => ({ milestone: m, word: words[m - 1] })),
    ...Array.from(
      { length: Math.floor(words.length / 100) },
      (_, idx) => {
        const milestone = (idx + 1) * 100;
        return { milestone, word: words[milestone - 1] };
      },
    ),
  ];
}

/**
 * Calculate the longest gap between consecutive word dates (anti-streak).
 * @param {WordData[]} words - Array of word data objects to analyze
 * @returns {WordAntiStreakStatsResult} Object containing longest gap details
 */
export const getAntiStreakStats = (words: WordData[]): WordAntiStreakStatsResult => {
  const emptyResult: WordAntiStreakStatsResult = {
    longestGap: 0,
    gapStartWord: null,
    gapEndWord: null,
    gapStartDate: null,
    gapEndDate: null,
  };

  if (words.length <= 1) {
    return emptyResult;
  }

  // Sort words chronologically (oldest first)
  const sortedWords = [...words].sort((a, b) => a.date.localeCompare(b.date));
  
  let longestGap = 0;
  let gapStartWord: WordData | null = null;
  let gapEndWord: WordData | null = null;
  let gapStartDate: string | null = null;
  let gapEndDate: string | null = null;

  for (let i = 1; i < sortedWords.length; i++) {
    const previousWord = sortedWords[i - 1];
    const currentWord = sortedWords[i];
    
    const previousDate = YYYYMMDDToDate(previousWord.date);
    const currentDate = YYYYMMDDToDate(currentWord.date);
    
    if (!previousDate || !currentDate) {
      logger.warn('Invalid date in getAntiStreakStats', { 
        previousDate: previousWord.date, 
        currentDate: currentWord.date 
      });
      continue;
    }

    // Calculate gap in days (subtract 1 because gap is the days between words, not the time difference)
    const diffTime = currentDate.getTime() - previousDate.getTime();
    const rawDiffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const gapDays = rawDiffDays - 1; // Gap is the days between, not including the words themselves
    
    // Only consider gaps longer than 0 (non-consecutive words)
    if (gapDays > 0 && gapDays > longestGap) {
      longestGap = gapDays;
      gapStartWord = previousWord;
      gapEndWord = currentWord;
      gapStartDate = previousWord.date;
      gapEndDate = currentWord.date;
    }
  }

  return {
    longestGap,
    gapStartWord,
    gapEndWord,
    gapStartDate,
    gapEndDate,
  };
};
