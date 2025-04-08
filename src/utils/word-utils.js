const wordFiles = import.meta.glob('../data/words/**/*.json', { eager: true });

export const getAllWords = () => {
    try {
        const words = Object.entries(wordFiles)
            .map(([path, data]) => {
                const date = path.match(/(\d{8})\.json$/)?.[1];
                if (!date) return null;
                const wordData = Array.isArray(data) ? data[0] : data;
                return wordData;
            })
            .filter(Boolean)
            .sort((a, b) => b.date.localeCompare(a.date));

        return words;
    } catch (error) {
        throw error;
    }
};

/**
 * Gets the current word (most recent word not after today)
 * @returns {Object} The current word object
 */
export const getCurrentWord = () => {
    try {
        const words = getAllWords();
        if (!words.length) throw new Error('No word data available');

        const today = new Date();
        const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
        return words.find(word => word.date <= dateString) || words[0];
    } catch (error) {
        throw error;
    }
};

/**
 * Gets the past words before the given date
 * @param {string} currentDate - The reference date in YYYYMMDD format
 * @returns {Array} Array of past word objects
 */
export const getPastWords = (currentDate) => {
    try {
        if (!currentDate) return [];

        const words = getAllWords();
        return words
            .filter(word => word.date < currentDate)
            .slice(0, 5);
    } catch (error) {
        return [];
    }
};

/**
 * Gets a word by its date
 * @param {string} date - The date in YYYYMMDD format
 * @returns {Object|null} The word object or null if not found
 */
export const getWordByDate = (date) => {
    try {
        if (!date) return null;

        const words = getAllWords();
        return words.find(word => word.date === date) || null;
    } catch (error) {
        return null;
    }
};

/**
 * Gets the previous and next words relative to the given date
 * @param {string} date - The reference date in YYYYMMDD format
 * @returns {Object} Object containing previousWord and nextWord
 */
export const getAdjacentWords = (date) => {
    try {
        if (!date) return { previousWord: null, nextWord: null };

        const words = getAllWords();
        const currentIndex = words.findIndex(word => word.date === date);

        if (currentIndex === -1) return { previousWord: null, nextWord: null };

        return {
            previousWord: words[currentIndex + 1] || null,
            nextWord: words[currentIndex - 1] || null
        };
    } catch (error) {
        return { previousWord: null, nextWord: null };
    }
};

/**
 * Safely extracts word details from the word object
 * @param {Object} word - Word object containing meanings and definitions
 * @returns {Object} - Extracted word details
 */
export const getWordDetails = (word) => {
    if (!word?.data?.meanings || !word.data.meanings.length) {
        return { partOfSpeech: '', definition: '' };
    }

    const firstMeaning = word.data.meanings[0];
    if (!firstMeaning) {
        return { partOfSpeech: '', definition: '' };
    }

    const partOfSpeech = firstMeaning.partOfSpeech || '';
    const definitions = firstMeaning.definitions || [];
    const firstDefinition = definitions[0] || {};
    const definition = firstDefinition.definition || '';

    // Only add a period if there's a definition and it doesn't already end with one
    const formattedDefinition = definition ? (definition.endsWith('.') ? definition : `${definition}.`) : '';

    return { partOfSpeech, definition: formattedDefinition };
};

/**
 * Counts syllables in a word using a combination of rules
 * @param {string} word - The word to count syllables for
 * @returns {number} - The number of syllables
 */
export function countSyllables(word) {
    if (!word) return 0;

    word = word.toLowerCase().trim();

    // Handle special cases
    const specialCases = {
        'ululated': 4,
        // Add more special cases here as needed
    };
    if (specialCases[word]) return specialCases[word];

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
        letterFrequency: {}
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
            if (weekCount === 7) perfectWeeks++;
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
        100: words[99]
    };
}
