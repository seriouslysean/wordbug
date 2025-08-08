import { format } from 'date-fns';

import type { WordData } from '~types';
import { MONTH_NAMES, monthSlugToNumber } from '~utils/date-utils';
import { formatWordCount } from '~utils/text-utils';
import {
  DYNAMIC_STATS_DEFINITIONS,
  LETTER_PATTERN_DEFINITIONS,
  PATTERN_DEFINITIONS,
  STATS_SLUGS,
} from '~utils/stats-definitions';
import {
  getAvailableLengths,
  getAvailableMonths,
  getAvailableYears,
  getWordsByYear,
} from '~utils/word-data-utils';
import {
  getChronologicalMilestones,
  getCurrentStreakWords,
  getLetterPatternStats,
  getLetterStats,
  getLongestStreakWords,
  getPatternStats,
  getWordEndingStats,
} from '~utils/word-stats-utils';

type PrecomputedStats = {
  endings: ReturnType<typeof getWordEndingStats>;
  letterPatterns: ReturnType<typeof getLetterPatternStats>;
  patternStats: ReturnType<typeof getPatternStats>;
  mostCommonLetter: string;
  leastCommonLetter: string;
  wordsWithMostCommon: WordData[];
  wordsWithLeastCommon: WordData[];
  milestones: ReturnType<typeof getChronologicalMilestones>;
};

function getStats(words: WordData[]): PrecomputedStats {
  const { mostCommon, leastCommon } = getLetterStats(words);
  return {
    endings: getWordEndingStats(words),
    letterPatterns: getLetterPatternStats(words),
    patternStats: getPatternStats(words),
    mostCommonLetter: mostCommon,
    leastCommonLetter: leastCommon,
    wordsWithMostCommon: words.filter(w => w.word.toLowerCase().includes(mostCommon)),
    wordsWithLeastCommon: words.filter(w => w.word.toLowerCase().includes(leastCommon)),
    milestones: getChronologicalMilestones(words),
  };
}

type StaticPageMeta = {
  type: 'static';
  title: string;
  description: string;
  category: string;
  secondaryText?: string | ((data?: any) => string);
};

type HomepageMeta = {
  type: 'home';
  title: string;
  description: (currentWord: string) => string;
  category: string;
  secondaryText?: string | ((data?: any) => string);
};

type StatsPageMeta = {
  type: 'stats';
  title: string;
  description: (count: number) => string;
  category: string;
  secondaryText?: string | ((count: number) => string);
};
type PageMeta = StaticPageMeta | HomepageMeta | StatsPageMeta;

function createPageMetadata(words: WordData[]): Record<string, PageMeta> {
  const stats = getStats(words);

  return {
  '': {
    type: 'home',
    title: 'Word of the Day',
    description: (currentWord: string): string =>
      `Today's word is "${currentWord}". Learn something new every day with our Word of the Day.`,
    category: 'pages',
  },

  // Main pages
  words: {
    type: 'static',
    title: 'All Words',
    description: 'Explore every word in our collection, organized chronologically.',
    category: 'pages',
    secondaryText: formatWordCount,
  },
  'words/length': {
    type: 'static',
    title: 'Words by Length',
    description: 'Words organized by character length.',
    category: 'pages',
    secondaryText: formatWordCount,
  },
  stats: {
    type: 'static',
    title: 'Stats',
    description: 'Explore patterns and statistics from our word collection.',
    category: 'pages',
    secondaryText: 'For Nerds',
  },
  about: {
    type: 'static',
    title: 'About',
    description: 'Learn more about this Word of the Day collection.',
    category: 'pages',
  },

  // Stats pages with dynamic counts
  'stats/words-ending-ly': {
    type: 'stats',
    title: 'Words Ending in "ly"',
    description: (count: number) => `${count} words that end with the suffix "ly".`,
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/words-ending-ing': {
    type: 'stats',
    title: 'Words Ending in "ing"',
    description: (count: number) => `${count} words that end with the suffix "ing".`,
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/words-ending-ed': {
    type: 'stats',
    title: 'Words Ending in "ed"',
    description: (count: number) => `${count} words that end with the suffix "ed".`,
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/words-ending-ness': {
    type: 'stats',
    title: 'Words Ending in "ness"',
    description: (count: number) => `${count} words that end with the suffix "ness".`,
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/words-ending-ful': {
    type: 'stats',
    title: 'Words Ending in "ful"',
    description: (count: number) => `${count} words that end with the suffix "ful".`,
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/words-ending-less': {
    type: 'stats',
    title: 'Words Ending in "less"',
    description: (count: number) => `${count} words that end with the suffix "less".`,
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/double-letters': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/same-start-end': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.SAME_START_END].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.SAME_START_END].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/alphabetical-order': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/triple-letters': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.TRIPLE_LETTERS].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.TRIPLE_LETTERS].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/most-common-letter': {
    type: 'stats',
    title: `Words with "${stats.mostCommonLetter.toUpperCase()}" (Most Common Letter)`,
    description: (count: number) => `${count} words containing the most common letter "${stats.mostCommonLetter}".`,
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/least-common-letter': {
    type: 'stats',
    title: `Words with "${stats.leastCommonLetter.toUpperCase()}" (Least Common Letter)`,
    description: (count: number) => `${count} words containing the least common letter "${stats.leastCommonLetter}".`,
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/milestone-words': {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS].title,
    description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/palindromes': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/all-consonants': {
    type: 'stats',
    title: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS].title,
    description: (count: number) => PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/all-vowels': {
    type: 'stats',
    title: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS].title,
    description: (count: number) => PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/current-streak': {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.CURRENT_STREAK].title,
    description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.CURRENT_STREAK].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  'stats/longest-streak': {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LONGEST_STREAK].title,
    description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LONGEST_STREAK].metaDescription(count),
    category: 'stats',
    secondaryText: formatWordCount,
  },
  } as const;
}

type CountMap = Record<string, (stats: PrecomputedStats) => number>;

const COUNT_FUNCTIONS: CountMap = {
  'stats/words-ending-ly': stats => stats.endings.ly.length,
  'stats/words-ending-ing': stats => stats.endings.ing.length,
  'stats/words-ending-ed': stats => stats.endings.ed.length,
  'stats/words-ending-ness': stats => stats.endings.ness.length,
  'stats/words-ending-ful': stats => stats.endings.ful.length,
  'stats/words-ending-less': stats => stats.endings.less.length,
  'stats/double-letters': stats => stats.letterPatterns.doubleLetters.length,
  'stats/same-start-end': stats => stats.letterPatterns.startEndSame.length,
  'stats/alphabetical-order': stats => stats.letterPatterns.alphabetical.length,
  'stats/triple-letters': stats => stats.letterPatterns.tripleLetters.length,
  'stats/most-common-letter': stats => stats.wordsWithMostCommon.length,
  'stats/least-common-letter': stats => stats.wordsWithLeastCommon.length,
  'stats/milestone-words': stats => stats.milestones.length,
  'stats/all-consonants': stats => stats.patternStats.allConsonants.length,
  'stats/all-vowels': stats => stats.patternStats.allVowels.length,
  'stats/palindromes': stats => stats.letterPatterns.palindromes.length,
};

const DYNAMIC_COUNT_FUNCTIONS: Record<string, (words: WordData[]) => number> = {
  'stats/current-streak': words => getCurrentStreakWords(words).length,
  'stats/longest-streak': words => getLongestStreakWords(words).length,
};

function getCountForPath(path: string, words: WordData[]): number {
  const stats = getStats(words);
  const countFn = COUNT_FUNCTIONS[path];

  if (countFn) {
    return countFn(stats);
  }

  const dynamicCountFn = DYNAMIC_COUNT_FUNCTIONS[path];
  if (dynamicCountFn) {
    return dynamicCountFn(words);
  }

  if (path.startsWith('words/')) {
    const year = path.replace('words/', '');
    return getWordsByYear(year, words).length;
  }

  return 0;
}

/**
 * Get metadata for a specific page path
 * @param pathname - The page path to get metadata for
 * @param words - Word dataset to evaluate
 * @returns Page metadata object
 */
export function getPageMetadata(pathname?: string, words: WordData[] = []) {
  if (!pathname) {
    throw new Error('getPageMetadata: pathname is required');
  }

  const path = pathname.replace(/^\/+|\/+$/g, '');

  // Handle dynamic year pages
  if (path.match(/^words\/\d{4}$/)) {
    const year = path.replace('words/', '');
    return {
      title: year,
      description: `Words from ${year}, organized by month.`,
      category: 'pages' as const,
      secondaryText: 'Words in',
    };
  }

  // Handle dynamic month pages  
  if (path.match(/^words\/\d{4}\/[a-z]+$/)) {
    const [, year, monthSlug] = path.split('/');
    const monthNumber = monthSlugToNumber(monthSlug);
    if (monthNumber) {
      const monthName = format(new Date(2000, monthNumber - 1), 'MMMM');
      return {
        title: monthName,
        description: `Words from ${monthName} ${year}.`,
        category: 'pages' as const,
        secondaryText: year,
      };
    }
  }

  // Handle dynamic length pages
  if (path.match(/^words\/length\/\d+$/)) {
    const length = parseInt(path.split('/')[2], 10);
    const wordsOfLength = words.filter(word => word.word.length === length);
    return {
      title: `${length}-Letter Words`,
      description: `Words containing exactly ${length} letters.`,
      category: 'pages' as const,
      secondaryText: formatWordCount(wordsOfLength.length),
    };
  }

  // Handle year pages for metadata
  if (path.match(/^words\/\d{4}$/)) {
    const year = path.replace('words/', '');
    return {
      title: `${year} Words`,
      description: `Words from ${year}, organized by month.`,
      category: 'pages' as const,
    };
  }

  const PAGE_METADATA = createPageMetadata(words);
  const metadata = PAGE_METADATA[path as keyof typeof PAGE_METADATA];
  if (!metadata) {
    return {
      title: 'Unknown Page',
      description: '',
      category: 'unknown',
    };
  }

  switch (metadata.type) {
    case 'home':
      return {
        ...metadata,
        title: metadata.title,
        description: metadata.description('example'),
        category: metadata.category,
        secondaryText: typeof metadata.secondaryText === 'function' 
          ? metadata.secondaryText(words.length) 
          : metadata.secondaryText,
      };
    case 'static':
      return {
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        secondaryText: typeof metadata.secondaryText === 'function' 
          ? metadata.secondaryText(words.length) 
          : metadata.secondaryText,
      };
    case 'stats':
      const count = getCountForPath(path, words);
      return {
        title: metadata.title,
        description: metadata.description(count),
        category: metadata.category,
        secondaryText: typeof metadata.secondaryText === 'function' 
          ? metadata.secondaryText(count) 
          : metadata.secondaryText,
      };
    default:
      return metadata;
  }
}

/**
 * Get metadata for all pages
 * @param words - Word dataset to evaluate
 * @returns Array of metadata objects
 */
export function getAllPageMetadata(words: WordData[]) {
  const showEmptyPages = (globalThis as Record<string, unknown>).__SHOW_EMPTY_STATS__ || false;
  const PAGE_METADATA = createPageMetadata(words);

  // Get static pages (excluding root '')
  const staticPages = Object.keys(PAGE_METADATA)
    .filter(path => path !== '')
    .map(path => ({ path, ...getPageMetadata(path, words) }))
    .filter(page => {
      // Only filter stats pages for empty results
      if (!page.path.startsWith('stats/') || page.path === 'stats' || showEmptyPages) {
        return true;
      }
      return getCountForPath(page.path, words) > 0;
    });

  // Get dynamic year pages
  const years = getAvailableYears(words);
  const yearPages = years.map(year => {
    const path = `words/${year}`;
    return { path, ...getPageMetadata(path, words) };
  });

  // Get dynamic month pages
  const monthPages = years.flatMap(year =>
    getAvailableMonths(year, words).map(month => {
      const monthSlug = MONTH_NAMES[Number(month) - 1];
      const path = `words/${year}/${monthSlug}`;
      return { path, ...getPageMetadata(path, words) };
    }),
  );

  // Get dynamic word length pages
  const lengthPages = getAvailableLengths(words).map(length => {
    const path = `words/length/${length}`;
    return { path, ...getPageMetadata(path, words) };
  });

  return [...staticPages, ...yearPages, ...monthPages, ...lengthPages];
}