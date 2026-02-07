import type {
  WordData,
  WordEndingStatsResult,
  WordPatternStatsResult,
  WordStatsResult,
  WordAntiStreakStatsResult,
  WordStreakStatsResult,
} from '#types';
import { areConsecutiveDays, dateToYYYYMMDD, YYYYMMDDToDate } from '#utils/date-utils';
import { TEXT_PATTERNS, MILESTONES } from '#constants/text-patterns';
import {
  isStartEndSame,
  hasDoubleLetters,
  hasTripleLetters,
  hasAlphabeticalSequence,
  getWordEndings,
  isAllVowels,
  isAllConsonants,
  isPalindrome,
  getVowelCount,
  getConsonantCount,
  countSyllables,
} from '#utils/text-utils';

/**
 * Analyzes words for various letter patterns
 */
export const getLetterPatternStats = (words: WordData[]): WordPatternStatsResult => {
  const patterns: WordPatternStatsResult = {
    startEndSame: [],
    doubleLetters: [],
    tripleLetters: [],
    alphabetical: [],
    palindromes: [],
  };

  for (const wordObj of words) {
    const word = wordObj.word;

    if (isPalindrome(word)) {
      patterns.palindromes.push(wordObj);
    }
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
  }

  return patterns;
};

/**
 * Analyzes words for specific ending patterns
 */
export const getWordEndingStats = (words: WordData[]): WordEndingStatsResult => {
  const endings: WordEndingStatsResult = {
    ing: [],
    ed: [],
    ly: [],
    ness: [],
    ful: [],
    less: [],
  };

  for (const wordObj of words) {
    const matchedEndings = getWordEndings(wordObj.word);
    for (const ending of matchedEndings) {
      if (ending in endings) {
        endings[ending as keyof typeof endings].push(wordObj);
      }
    }
  }

  return endings;
};

/**
 * Analyzes words for vowel/consonant patterns
 */
export const getPatternStats = (words: WordData[]) => {
  return {
    allVowels: words.filter(w => isAllVowels(w.word)),
    allConsonants: words.filter(w => isAllConsonants(w.word)),
    palindromes: words.filter(w => isPalindrome(w.word)),
  };
};

/**
 * Analyzes letter frequency and returns most/least common letters
 */
export const getLetterStats = (words: WordData[]) => {
  const letterFrequency: Record<string, number> = {};

  for (const wordObj of words) {
    const word = wordObj.word.toLowerCase();
    for (const letter of word) {
      if (TEXT_PATTERNS.LETTER_ONLY.test(letter)) {
        letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
      }
    }
  }

  const sortedLetters = Object.entries(letterFrequency)
    .filter(([letter]) => TEXT_PATTERNS.LETTER_ONLY.test(letter))
    .sort(([, a], [, b]) => b - a);

  const [mostCommonEntry] = sortedLetters;
  const leastCommonEntry = sortedLetters[sortedLetters.length - 1];

  return {
    mostCommon: mostCommonEntry?.[0] || '',
    leastCommon: leastCommonEntry?.[0] || '',
    frequency: letterFrequency,
  };
};


/**
 * Calculate chronological milestone words (1st, 100th, 200th, etc.) from sorted words
 */
export function getChronologicalMilestones(words: WordData[]): Array<{milestone: number, word: WordData}> {
  if (words.length === 0) {
    return [];
  }

  return [
    { milestone: MILESTONES.FIRST, word: words[0] },
    ...MILESTONES.EARLY
      .filter(m => words.length >= m)
      .map(m => ({ milestone: m, word: words[m - 1] })),
    ...Array.from(
      { length: Math.floor(words.length / MILESTONES.CENTURY) },
      (_, idx) => {
        const milestone = (idx + 1) * MILESTONES.CENTURY;
        return { milestone, word: words[milestone - 1] };
      },
    ),
  ];
}

export function getCurrentStreakWords(words: WordData[]): WordData[] {
  if (words.length === 0) return [];

  const sortedWords = [...words].sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date();
  const todayString = dateToYYYYMMDD(today);
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(today.getDate() - 1);
  const yesterdayString = dateToYYYYMMDD(yesterdayDate);

  const mostRecentWord = sortedWords[0];
  const isActive = !!mostRecentWord && (mostRecentWord.date === todayString || mostRecentWord.date === yesterdayString);

  if (!isActive || !mostRecentWord) return [];

  const streakWords = [mostRecentWord];
  let lastDate = mostRecentWord.date;

  for (const word of sortedWords.slice(1)) {
    if (areConsecutiveDays(word.date, lastDate)) {
      streakWords.push(word);
      lastDate = word.date;
    } else {
      break;
    }
  }

  return streakWords;
}

export function getLongestStreakWords(words: WordData[]): WordData[] {
  if (words.length <= 1) return words;

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
}

/**
 * Analyzes word data to extract basic statistics including longest/shortest words and word count by letter.
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
 * Finds words with the most and least syllables.
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
 * Helper function to find a word's date from a list of words.
 */
export const findWordDate = (words: WordData[], targetWord: string): string | undefined => {
  if (!targetWord) {
    return undefined;
  }
  return words.find(w => w?.word === targetWord)?.date;
};

/**
 * Converts letter word count data into sorted statistics, filtering to a-z only.
 */
export const getLetterStatsFromFrequency = (letterFrequency: Record<string, number>): Array<[string, number]> => {
  if (Object.keys(letterFrequency).length === 0) {
    return [];
  }
  return Object.entries(letterFrequency)
    .filter(([letter]) => TEXT_PATTERNS.LETTER_ONLY.test(letter))
    .sort(([, a], [, b]) => b - a);
};

/**
 * Calculate current and longest word streaks based on consecutive days.
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
 * Calculate the longest gap between consecutive word dates (anti-streak).
 * Core logic without logging - use the Astro wrapper for logging support.
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
      continue;
    }

    const diffTime = currentDate.getTime() - previousDate.getTime();
    const rawDiffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const gapDays = rawDiffDays - 1;

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
