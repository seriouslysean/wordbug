import { transformExistingWordData } from '~adapters/wordnik.js';
import { logSentryError } from './sentry-client.js';
import crypto from 'crypto';

const wordFiles = import.meta.glob('../data/words/**/*.json', { eager: true });

export const getAllWords = () => {
  const words = Object.entries(wordFiles)
    .map(([path, data]) => {
      const date = path.match(/(\d{8})\.json$/)?.[1];
      if (!date) {
        logSentryError('WordDataMissingDate', { path });
        return null;
      }
      const wordData = Array.isArray(data) ? data[0] : data;
      return wordData;
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));

  return words;
};

/**
 * Gets the current word (most recent word not after today)
 * @returns {Object} The current word object
 */
export const getCurrentWord = () => {
  const words = getAllWords();
  if (!words.length) {
    logSentryError('NoWordData', {});
    throw new Error('No word data available');
  }

  const today = new Date();
  const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
  return words.find(word => word.date <= dateString) || words[0];
};

/**
 * Gets the past words before the given date
 * @param {string} currentDate - The reference date in YYYYMMDD format
 * @returns {Array} Array of past word objects
 */
export const getPastWords = (currentDate) => {
  if (!currentDate) {return [];}
  const words = getAllWords();
  return words
    .filter(word => word.date < currentDate)
    .slice(0, 5);
};

/**
 * Gets a word by its date
 * @param {string} date - The date in YYYYMMDD format
 * @returns {Object|null} The word object or null if not found
 */
export const getWordByDate = (date) => {
  if (!date) {return null;}
  const words = getAllWords();
  return words.find(word => word.date === date) || null;
};

/**
 * Gets the previous and next words relative to the given date
 * @param {string} date - The reference date in YYYYMMDD format
 * @returns {Object} Object containing previousWord and nextWord
 */
export const getAdjacentWords = (date) => {
  if (!date) {return { previousWord: null, nextWord: null };}
  const words = getAllWords();
  const currentIndex = words.findIndex(word => word.date === date);

  if (currentIndex === -1) {return { previousWord: null, nextWord: null };}

  return {
    previousWord: words[currentIndex + 1] || null,
    nextWord: words[currentIndex - 1] || null,
  };
};

/**
 * Safely extracts word details from the word object using Wordnik adapter
 * @param {Object} word - Word object containing data from API
 * @returns {Object} - Extracted word details
 */
export const getWordDetails = (word) => {
  if (!word?.data) {
    return { partOfSpeech: '', definition: '', meta: null };
  }

  return transformExistingWordData(word);
};

/**
 * Counts syllables in a word using a combination of rules
 * @param {string} word - The word to count syllables for
 * @returns {number} - The number of syllables
 */
export function countSyllables(word) {
  if (!word) {return 0;}

  word = word.toLowerCase().trim();

  // Handle special cases
  const specialCases = {
    'ululated': 4,
    // Add more special cases here as needed
  };
  if (specialCases[word]) {return specialCases[word];}

  // Remove final e if not sole vowel
  word = word.replace(/([^aeiou])e$/, '$1');

  // Count groups of vowels (including y)
  const syllableGroups = word.match(/[aeiouy]+/gi) || [];

  // Handle special cases for 'e' at the end
  const endsWithE = /[^aeiou]e$/i.test(word);
  const syllableCount = syllableGroups.length - (endsWithE ? 1 : 0);

  // Words should have at least one syllable
  return Math.max(1, syllableCount);
}

export function getWordStats(words) {
  return words.reduce((acc, word) => {
    // Length stats
    if (!acc.longest || word.word.length > acc.longest.word.length) {
      acc.longest = { word: word.word, length: word.word.length };
    }
    if (!acc.shortest || word.word.length < acc.shortest.word.length) {
      acc.shortest = { word: word.word, length: word.word.length };
    }

    // Palindrome stats
    const isPalindrome = word.word.toLowerCase() === word.word.toLowerCase().split('').reverse().join('');
    if (isPalindrome) {
      if (!acc.longestPalindrome || word.word.length > acc.longestPalindrome.word.length) {
        acc.longestPalindrome = { word: word.word, length: word.word.length };
      }
      if (!acc.shortestPalindrome || word.word.length < acc.shortestPalindrome.word.length) {
        acc.shortestPalindrome = { word: word.word, length: word.word.length };
      }
    }

    // Letter frequency - count all letters in each word
    const letters = word.word.toLowerCase().split('');
    letters.forEach(letter => {
      acc.letterFrequency[letter] = (acc.letterFrequency[letter] || 0) + 1;
    });

    return acc;
  }, {
    longest: null,
    shortest: null,
    longestPalindrome: null,
    shortestPalindrome: null,
    letterFrequency: {},
  });
}

export function getLetterStats(letterFrequency) {
  return Object.entries(letterFrequency)
    .sort(([, a], [, b]) => b - a);
}

export function getMilestoneWords(words) {
  return {
    25: words[24],
    50: words[49],
    100: words[99],
  };
}

export function getLetterPatternStats(words) {
  const patterns = {
    startEndSame: [],
    doubleLetters: [],
    tripleLetters: [],
    alphabetical: [],
  };

  words.forEach(wordObj => {
    const word = wordObj.word.toLowerCase();

    // Same start and end letter
    if (word.length > 1 && word[0] === word[word.length - 1]) {
      patterns.startEndSame.push(wordObj);
    }

    // Double letters
    if (/(.)\1/.test(word)) {
      patterns.doubleLetters.push(wordObj);
    }

    // Triple or more same letters
    if (/(.)\1{2,}/.test(word)) {
      patterns.tripleLetters.push(wordObj);
    }

    // Alphabetical order (consecutive letters)
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
}

export function getWordEndingStats(words) {
  const endings = {
    ing: [],
    ed: [],
    ly: [],
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
  });

  return endings;
}

export function getCurrentStreakStats(words) {
  if (!words.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isActive: false,
    };
  }

  const sortedWords = [...words].sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10).replace(/-/g, '');
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(today.getDate() - 1);
  const yesterdayString = yesterdayDate.toISOString().slice(0, 10).replace(/-/g, '');

  // Check if streak is active (a word exists for today or yesterday)
  const mostRecentWord = sortedWords[0];
  const isActive = mostRecentWord.date === todayString || mostRecentWord.date === yesterdayString;

  // Calculate current streak
  let currentStreak = 0;

  if (isActive) {
    // Start with 1 for the most recent day
    currentStreak = 1;
    let lastDate = mostRecentWord.date;

    for (let i = 1; i < sortedWords.length; i++) {
      // Check if this word is from the day before the last counted day
      if (areConsecutiveDays(sortedWords[i].date, lastDate)) {
        currentStreak++;
        lastDate = sortedWords[i].date;
      } else {
        // If a day was missed, the streak is broken
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedWords.length; i++) {
    if (areConsecutiveDays(sortedWords[i].date, sortedWords[i - 1].date)) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // If there's only one word, longestStreak should be 1
  if (words.length === 1) {
    longestStreak = 1;
  }

  return {
    currentStreak,
    longestStreak,
    isActive,
  };
}

function areConsecutiveDays(olderDate, newerDate) {
  // Convert dates from YYYYMMDD format to Date objects
  const dOlder = new Date(olderDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  const dNewer = new Date(newerDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));

  // Normalize times to midnight
  dOlder.setHours(0, 0, 0, 0);
  dNewer.setHours(0, 0, 0, 0);

  // Calculate the difference in milliseconds and convert to days
  const diffTime = dNewer - dOlder;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // For consecutive days, the older date should be exactly one day before the newer date
  return diffDays === 1;
}

/**
 * Generates a SHA-256 hash (hex) from a list of words and their count.
 * @param words Array of word strings
 * @returns string hash as hex string
 */
export function generateWordDataHash(words) {
  const sorted = [...words].sort();
  const input = `${sorted.length}:${sorted.join(',')}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Utility function to format word count with singular/plural form
export function formatWordCount(count) {
  return `${count} ${count === 1 ? 'word' : 'words'}`;
}
