import type { WordData } from '~types';
import { areConsecutiveDays, dateToYYYYMMDD } from '~utils/date-utils';
import {
  isStartEndSame,
  hasDoubleLetters,
  hasTripleLetters,
  hasAlphabeticalSequence,
  getWordEndings,
  isAllVowels,
  isAllConsonants,
  isPalindrome,
} from '~utils/text-utils';
import { MILESTONE_BREAKPOINTS } from '~constants/text-patterns';

/**
 * Analyzes words for various letter patterns
 */
export const getLetterPatternStats = (words: WordData[]) => {
  const patterns = {
    startEndSame: [] as WordData[],
    doubleLetters: [] as WordData[],
    tripleLetters: [] as WordData[],
    alphabetical: [] as WordData[],
    palindromes: [] as WordData[],
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
export const getWordEndingStats = (words: WordData[]) => {
  const endings = {
    ing: [] as WordData[],
    ed: [] as WordData[],
    ly: [] as WordData[],
    ness: [] as WordData[],
    ful: [] as WordData[],
    less: [] as WordData[],
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
      if (/^[a-z]$/i.test(letter)) {
        letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
      }
    }
  }

  const sortedLetters = Object.entries(letterFrequency)
    .filter(([letter]) => /^[a-z]$/i.test(letter))
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
 * Calculate chronological milestone words (1st, 25th, 50th, 75th, 100th, 200th, etc.) from sorted words
 */
export function getChronologicalMilestones(words: WordData[]): Array<{milestone: number, word: WordData}> {
  if (words.length === 0) {
    return [];
  }

  return [
    { milestone: MILESTONE_BREAKPOINTS.INITIAL, word: words[0] },
    ...MILESTONE_BREAKPOINTS.EARLY
      .filter(m => words.length >= m)
      .map(m => ({ milestone: m, word: words[m - 1] })),
    ...Array.from(
      { length: Math.floor(words.length / MILESTONE_BREAKPOINTS.CENTURY_INTERVAL) },
      (_, idx) => {
        const milestone = (idx + 1) * MILESTONE_BREAKPOINTS.CENTURY_INTERVAL;
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