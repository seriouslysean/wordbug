import { dateToYYYYMMDD, YYYYMMDDToDate } from '~utils/date-utils';
import { logger } from '~utils/logger';
import { countSyllables, getVowelCount, getConsonantCount } from '~utils/text-utils';
import type {
  WordData,
  WordStatsResult,
  WordLetterStatsResult,
  WordMilestoneResult,
  WordPatternStatsResult,
  WordEndingStatsResult,
  WordStreakStatsResult,
} from '~types/word';

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

export const getLetterStats = (letterFrequency: Record<string, number>): WordLetterStatsResult => {
  if (Object.keys(letterFrequency).length === 0) {
    return [];
  }
  return Object.entries(letterFrequency)
    .sort(([, a], [, b]) => b - a);
};

/**
 * Get words at specific milestone positions
 */
export const getMilestoneWords = (words: WordData[]): WordMilestoneResult => {
  // Handle empty words array
  if (!words || words.length === 0) {
    return {
      25: null,
      50: null,
      100: null,
    };
  }

  return {
    25: words.length >= 25 ? words[24] : null,
    50: words.length >= 50 ? words[49] : null,
    100: words.length >= 100 ? words[99] : null,
  };
};

export const getLetterPatternStats = (words: WordData[]): WordPatternStatsResult => {
  const patterns = {
    startEndSame: [],
    doubleLetters: [],
    tripleLetters: [],
    alphabetical: [],
  };

  // Handle empty words array
  if (!words || words.length === 0) {
    return patterns;
  }

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

export const getWordEndingStats = (words: WordData[]): WordEndingStatsResult => {
  const endings = {
    ing: [],
    ed: [],
    ly: [],
  };

  // Handle empty words array
  if (!words || words.length === 0) {
    return endings;
  }

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
  });

  return endings;
};

/**
 * Calculate current and longest word streaks
 */
export const getCurrentStreakStats = (words: WordData[]): WordStreakStatsResult => {
  // Handle empty words array
  if (!words || words.length === 0) {
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
 * Check if two dates are consecutive days
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

export const getSyllableStats = (words: WordData[]) => {
  // Handle empty words array
  if (!words || words.length === 0) {
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

export const getLetterTypeStats = (words: WordData[]) => {
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
    mostVowels: words?.[0] || null,
    mostConsonants: words?.[0] || null,
  });
};

export const getPatternStats = (words: WordData[]) => {
  // Empty arrays are fine here since we're just filtering the array
  return {
    allVowels: words ? words.filter(w => /^[aeiou]+$/i.test(w.word)) : [],
    allConsonants: words ? words.filter(w => /^[^aeiou]+$/i.test(w.word)) : [],
    palindromes: words ? words.filter(w => w.word.toLowerCase() === w.word.toLowerCase().split('').reverse().join('')) : [],
  };
};

/**
 * Helper function to find a word's date from a list of words
 */
export const findWordDate = (words: WordData[], targetWord: string) => {
  return words.find(w => w.word === targetWord)?.date;
};
