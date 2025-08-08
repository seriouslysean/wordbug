import type { WordData } from '~types/word';
import { areConsecutiveDays, dateToYYYYMMDD } from '~utils/date-utils';

// Text analysis functions needed by stats
function isStartEndSame(word: string): boolean {
  return word.length > 1 && word[0] === word[word.length - 1];
}

function hasDoubleLetters(word: string): boolean {
  return /(.)(\1)/.test(word);
}

function hasTripleLetters(word: string): boolean {
  return /(.)(\1){2,}/.test(word);
}

function hasAlphabeticalSequence(word: string): boolean {
  const letters = word.toLowerCase().split('');
  return letters.slice(0, -2).some((_, i) => {
    const a = letters[i].charCodeAt(0);
    const b = letters[i + 1].charCodeAt(0);
    const c = letters[i + 2].charCodeAt(0);
    return b === a + 1 && c === b + 1;
  });
}

function getWordEndings(word: string): string[] {
  const endings = ['ing', 'ed', 'ly', 'ness', 'ful', 'less'];
  return endings.filter(ending => word.endsWith(ending));
}

function isAllVowels(word: string): boolean {
  return /^[aeiou]+$/i.test(word);
}

function isAllConsonants(word: string): boolean {
  return /^[^aeiou]+$/i.test(word);
}

function isPalindrome(word: string): boolean {
  if (!word) return false;
  const normalized = word.toLowerCase();
  return normalized === normalized.split('').reverse().join('');
}

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
 * Calculate chronological milestone words (1st, 100th, 200th, etc.) from sorted words
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