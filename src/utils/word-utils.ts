import type { Word, WordStats, WordDetails } from '../types/word';

const wordFiles = import.meta.glob<Word>('../data/words/**/*.json', { eager: true });

export const getAllWords = (): Word[] => {
    try {
        const words = Object.entries(wordFiles)
            .map(([path, data]) => {
                const date = path.match(/(\d{8})\.json$/)?.[1];
                if (!date) return null;
                const wordData = Array.isArray(data) ? data[0] : data;
                return wordData;
            })
            .filter((word): word is Word => Boolean(word))
            .sort((a, b) => b.date.localeCompare(a.date));

        return words;
    } catch (error) {
        throw error;
    }
};

/**
 * Gets the current word (most recent word not after today)
 */
export const getCurrentWord = (): Word | undefined => {
    try {
        const words = getAllWords();
        if (!words.length) throw new Error('No word data available');

        const today = new globalThis.Date();
        const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
        return words.find(word => word.date <= dateString) || words[0];
    } catch (error) {
        throw error;
    }
};

/**
 * Gets the past words before the given date
 * @param currentDate - The reference date in YYYYMMDD format
 */
export const getPastWords = (currentDate: string): Word[] => {
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
 * @param date - The date in YYYYMMDD format
 */
export const getWordByDate = (date: string): Word | null => {
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
 * @param date - The reference date in YYYYMMDD format
 */
export const getAdjacentWords = (date: string): { previousWord: Word | null; nextWord: Word | null } => {
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
 * @param word - Word object containing meanings and definitions
 */
export const getWordDetails = (word: Word | null | undefined): WordDetails => {
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
 * @param word - The word to count syllables for
 */
export function countSyllables(word: string): number {
    if (!word) return 0;

    word = word.toLowerCase().trim();

    // Handle special cases
    const specialCases: Record<string, number> = {
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

export function getWordStats(words: Word[]): WordStats {
    return words.reduce((acc: WordStats, word) => {
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

export function getLetterStats(letterFrequency: Record<string, number>): [string, number][] {
    return Object.entries(letterFrequency)
        .sort(([, a], [, b]) => b - a);
}

export function getStreakStats(words: Word[]): {
    currentStreak: number;
    longestStreak: number;
    perfectWeeks: number;
    perfectMonths: number;
} {
    let currentStreak = 0;
    let longestStreak = 0;
    let perfectWeeks = 0;
    let perfectMonths = 0;
    let currentWeek: string | null = null;
    let currentMonth: string | null = null;
    let weekCount = 0;
    let monthCount = 0;

    // Process words in reverse chronological order for current streak
    const sortedWords = [...words].sort((a, b) => b.date.localeCompare(a.date));

    // Helper to check if two dates are consecutive
    const areConsecutiveDays = (date1: string, date2: string): boolean => {
        const d1 = new globalThis.Date(date1.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        const d2 = new globalThis.Date(date2.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 1;
    };

    sortedWords.forEach((word, index) => {
        const currentDate = new globalThis.Date(word.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));

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
            if (monthCount === new globalThis.Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()) {
                perfectMonths++;
            }
            currentMonth = month;
            monthCount = 1;
        } else {
            monthCount++;
        }
    });

    return { currentStreak, longestStreak, perfectWeeks, perfectMonths };
}

function getWeekNumber(date: Date): number {
    const d = new globalThis.Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new globalThis.Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getMilestoneWords(words: Word[]): Word[] {
    const milestones = [1, 10, 25, 50, 100, 250, 500, 1000];
    return words
        .filter((_, index) => milestones.includes(index + 1))
        .sort((a, b) => a.date.localeCompare(b.date));
}
