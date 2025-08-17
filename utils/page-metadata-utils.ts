import { format } from 'date-fns';

import { URL_PATTERNS } from '~constants/urls';

import type { WordData } from '~types';
import { MONTH_NAMES, monthSlugToNumber } from '~utils/date-utils';
import {
  DYNAMIC_STATS_DEFINITIONS,
  LETTER_PATTERN_DEFINITIONS,
  PATTERN_DEFINITIONS,
  STATS_SLUGS,
} from '~constants/stats';
import { t, tp } from '~utils/i18n-utils';
import {
  getAvailableLetters,
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
  partOfSpeech?: string;
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
  home: {
    type: 'home',
    title: t('home.heading'),
    description: (currentWord: string): string => t('home.description', { word: currentWord }),
    category: 'pages',
  },

  // Main pages
  words: {
    type: 'static',
    title: t('words.heading'),
    description: t('words.description'),
    category: 'pages',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'words/browse': {
    type: 'static',
    title: t('browse.heading'),
    description: t('browse.description'),
    category: 'pages',
    secondaryText: t('browse.subheading'),
  },
  'words/length': {
    type: 'static',
    title: t('words.by_length_heading'),
    description: t('words.by_length_description'),
    category: 'pages',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'words/letter': {
    type: 'static',
    title: t('words.by_letter_heading'),
    description: t('words.by_letter_description'),
    category: 'pages',
    secondaryText: (count: number) => tp('common.words', count),
  },
  stats: {
    type: 'static',
    title: t('stats.heading'),
    description: t('stats.description'),
    category: 'pages',
    secondaryText: t('stats.subheading'),
  },
  'stats/word-facts': {
    type: 'static',
    title: t('stats.word_facts_heading'),
    description: t('stats.word_facts_description'),
    category: 'pages',
    secondaryText: t('stats.word_facts_subheading'),
  },
  'stats/streaks': {
    type: 'static',
    title: t('stats.streaks_index_heading'),
    description: t('stats.streaks_index_description'),
    category: 'pages',
    secondaryText: t('stats.streaks_index_subheading'),
  },
  'stats/letter-patterns': {
    type: 'static',
    title: t('stats.letter_patterns_index_heading'),
    description: t('stats.letter_patterns_index_description'),
    category: 'pages',
    secondaryText: t('stats.letter_patterns_index_subheading'),
  },
  'stats/word-endings': {
    type: 'static',
    title: t('stats.word_endings_index_heading'),
    description: t('stats.word_endings_index_description'),
    category: 'pages',
    secondaryText: t('stats.word_endings_index_subheading'),
  },
  '404': {
    type: 'static',
    title: t('error.heading'),
    description: t('error.description'),
    category: 'pages',
    partOfSpeech: 'noun',
  },

  // Stats pages with dynamic counts
  'stats/words-ending-ly': {
    type: 'stats',
    title: 'Words Ending in "ly"',
    description: (count: number) => `${count} words that end with the suffix "ly".`,
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/words-ending-ing': {
    type: 'stats',
    title: 'Words Ending in "ing"',
    description: (count: number) => `${count} words that end with the suffix "ing".`,
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/words-ending-ed': {
    type: 'stats',
    title: 'Words Ending in "ed"',
    description: (count: number) => `${count} words that end with the suffix "ed".`,
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/words-ending-ness': {
    type: 'stats',
    title: 'Words Ending in "ness"',
    description: (count: number) => `${count} words that end with the suffix "ness".`,
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/words-ending-ful': {
    type: 'stats',
    title: 'Words Ending in "ful"',
    description: (count: number) => `${count} words that end with the suffix "ful".`,
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/words-ending-less': {
    type: 'stats',
    title: 'Words Ending in "less"',
    description: (count: number) => `${count} words that end with the suffix "less".`,
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/double-letters': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/same-start-end': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.SAME_START_END].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.SAME_START_END].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/alphabetical-order': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/triple-letters': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.TRIPLE_LETTERS].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.TRIPLE_LETTERS].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/most-common-letter': {
    type: 'stats',
    title: `Words with "${stats.mostCommonLetter.toUpperCase()}" (Most Common Letter)`,
    description: (count: number) => `${count} words containing the most common letter "${stats.mostCommonLetter}".`,
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/least-common-letter': {
    type: 'stats',
    title: `Words with "${stats.leastCommonLetter.toUpperCase()}" (Least Common Letter)`,
    description: (count: number) => `${count} words containing the least common letter "${stats.leastCommonLetter}".`,
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/milestone-words': {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS].title,
    description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/palindromes': {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES].title,
    description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/all-consonants': {
    type: 'stats',
    title: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS].title,
    description: (count: number) => PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/all-vowels': {
    type: 'stats',
    title: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS].title,
    description: (count: number) => PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/current-streak': {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.CURRENT_STREAK].title,
    description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.CURRENT_STREAK].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
  },
  'stats/longest-streak': {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LONGEST_STREAK].title,
    description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LONGEST_STREAK].metaDescription(count),
    category: 'stats',
    secondaryText: (count: number) => tp('common.words', count),
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
 * Standardized page metadata returned by getPageMetadata
 */
export type PageMetadataResult = {
  title: string;
  description: string;
  category: string;
  secondaryText?: string;
  partOfSpeech?: string;
};

/**
 * Get metadata for a specific page path
 * @param pathname - The page path to get metadata for
 * @param words - Word dataset to evaluate
 * @returns Page metadata object
 */
export function getPageMetadata(pathname: string, words: WordData[] = []): PageMetadataResult {
  if (!pathname) {
    throw new Error('getPageMetadata: pathname is required');
  }

  const path = pathname.replace(/^\/+|\/+$/g, '');

  // Handle dynamic year pages
  const yearMatch = path.match(URL_PATTERNS.YEAR_PAGE);
  if (yearMatch) {
    const [, year] = yearMatch;
    return {
      title: year,
      description: `Words from ${year}, organized by month.`,
      category: 'pages' as const,
      secondaryText: 'Words in',
    };
  }

  // Handle dynamic month pages
  if (path.match(URL_PATTERNS.MONTH_PAGE)) {
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
  if (path.match(URL_PATTERNS.LENGTH_PAGE)) {
    const length = parseInt(path.split('/')[2], 10);
    const wordsOfLength = words.filter(word => word.word.length === length);
    return {
      title: `${length}-Letter Words`,
      description: `Words containing exactly ${length} letters.`,
      category: 'pages' as const,
      secondaryText: tp('common.words', wordsOfLength.length),
    };
  }

  // Handle dynamic letter pages
  if (path.match(URL_PATTERNS.LETTER_PAGE)) {
    const letter = path.split('/')[2].toUpperCase();
    const wordsOfLetter = words.filter(word => 
      word.word.toLowerCase().startsWith(letter.toLowerCase())
    );
    return {
      title: letter,
      description: `Words that begin with the letter ${letter}.`,
      category: 'pages' as const,
      secondaryText: tp('common.words', wordsOfLetter.length),
    };
  }


  const PAGE_METADATA = createPageMetadata(words);
  const metadata = PAGE_METADATA[path as keyof typeof PAGE_METADATA];
  if (!metadata) {
    return {
      title: 'Unknown Page',
      description: '',
      category: 'unknown',
      secondaryText: undefined,
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
        ...(metadata.partOfSpeech ? { partOfSpeech: metadata.partOfSpeech } : {}),
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

  // Get dynamic word letter pages  
  const letterPages = getAvailableLetters(words).map(letter => {
    const path = `words/letter/${letter}`;
    return { path, ...getPageMetadata(path, words) };
  });

  return [...staticPages, ...yearPages, ...monthPages, ...lengthPages, ...letterPages];
}
