import { transformExistingWordData } from '~adapters/wordnik.js';
import { logSentryError } from './sentry-client.js';

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

export function getStreakStats(words) {
  let currentStreak = 0;
  let longestStreak = 0;
  let perfectWeeks = 0;
  let perfectMonths = 0;
  let currentWeek = null;
  let currentMonth = null;
  let weekCount = 0;
  let monthCount = 0;

  // Process words in reverse chronological order for current streak
  const sortedWords = [...words].sort((a, b) => b.date.localeCompare(a.date));

  // Helper to check if two dates are consecutive
  const areConsecutiveDays = (date1, date2) => {
    const d1 = new Date(date1.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    const d2 = new Date(date2.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  };

  sortedWords.forEach((word, index) => {
    const currentDate = new Date(word.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));

    if (index === 0) {
      currentStreak = 1;
    } else {
      if (areConsecutiveDays(word.date, sortedWords[index - 1].date)) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    // Week and month calculations
    const week = `${currentDate.getFullYear()}-${getWeekNumber(currentDate)}`;
    const month = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

    if (week !== currentWeek) {
      if (weekCount === 7) {perfectWeeks++;}
      currentWeek = week;
      weekCount = 1;
    } else {
      weekCount++;
    }

    if (month !== currentMonth) {
      if (monthCount === new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()) {
        perfectMonths++;
      }
      currentMonth = month;
      monthCount = 1;
    } else {
      monthCount++;
    }
  });

  return { longestStreak, perfectWeeks, perfectMonths };
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
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
  
  // Calculate current streak
  let currentStreak = 0;
  const mostRecentWord = sortedWords[0];
  
  // Check if we have today's word or yesterday's word
  const isActive = mostRecentWord.date >= todayString || 
    areConsecutiveDays(mostRecentWord.date, todayString);
  
  if (isActive) {
    currentStreak = 1;
    let lastDate = mostRecentWord.date;
    
    for (let i = 1; i < sortedWords.length; i++) {
      if (areConsecutiveDays(sortedWords[i].date, lastDate)) {
        currentStreak++;
        lastDate = sortedWords[i].date;
      } else {
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
  
  return {
    currentStreak,
    longestStreak,
    isActive,
  };
}

function areConsecutiveDays(date1, date2) {
  const d1 = new Date(date1.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  const d2 = new Date(date2.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}
