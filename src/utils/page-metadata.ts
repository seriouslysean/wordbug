import { format } from 'date-fns';

import type { WordData } from '~types/word';
import { MONTH_NAMES, monthSlugToNumber } from '~utils/date-utils';
import { logger } from '~utils-client/logger';
import {
  DYNAMIC_STATS_DEFINITIONS,
  LETTER_PATTERN_DEFINITIONS,
  PATTERN_DEFINITIONS,
  STATS_SLUGS,
  SUFFIX_DEFINITIONS,
} from '~utils-client/stats-definitions';
import {
  allWords,
  getAvailableLengths,
  getAvailableMonths,
  getAvailableYears,
  getWordsByYear,
} from '~utils-client/word-data-utils';
import {
  getChronologicalMilestones,
  getLetterPatternStats,
  getLetterStats,
  getPatternStats,
  getWordEndingStats,
  getWordStats,
} from '~utils-client/word-stats-utils';

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

const statsCache = new WeakMap<WordData[], PrecomputedStats>();

function getStats(words: WordData[]): PrecomputedStats {
  const cached = statsCache.get(words);
  if (cached) {
    return cached;
  }

  const endings = getWordEndingStats(words);
  const letterPatterns = getLetterPatternStats(words);
  const patternStats = getPatternStats(words);
  const wordStats = getWordStats(words);
  const letterStats = getLetterStats(wordStats.letterFrequency);
  const mostCommonLetter = letterStats[0]?.[0] || '';
  const leastCommonLetter = letterStats[letterStats.length - 1]?.[0] || '';
  const wordsWithMostCommon = mostCommonLetter
    ? words.filter(word => word.word.includes(mostCommonLetter))
    : [];
  const wordsWithLeastCommon = leastCommonLetter
    ? words.filter(word => word.word.includes(leastCommonLetter))
    : [];
  const milestones = getChronologicalMilestones(
    [...words].sort((a, b) => a.date.localeCompare(b.date)),
  );

  const stats: PrecomputedStats = {
    endings,
    letterPatterns,
    patternStats,
    mostCommonLetter,
    leastCommonLetter,
    wordsWithMostCommon,
    wordsWithLeastCommon,
    milestones,
  };

  statsCache.set(words, stats);
  return stats;
}

type StaticPageMeta = {
  type: 'static';
  title: string;
  description: string;
  category: string;
};
type HomepageMeta = {
  type: 'home';
  title: string;
  description: (word: string) => string;
  category: string;
};
type StatsPageMeta = {
  type: 'stats';
  title: string;
  description: (count: number) => string;
  category: string;
};
type PageMeta = StaticPageMeta | HomepageMeta | StatsPageMeta;

function createPageMetadata(words: WordData[]): Record<string, PageMeta> {
  const stats = getStats(words);

  return {
  '': {
    type: 'home',
    title: 'Word of the Day',
    description: (currentWord: string): string =>
      currentWord
        ? `Today's word: ${currentWord}. Discover a new word every day.`
        : 'Discover a new word every day.',
    category: 'root',
  },
  '404': {
    type: 'static',
    title: '404 - Page Not Found',
    description: 'A web page that cannot be found; an error indicating the requested content does not exist.',
    category: 'pages',
  },
  '[date]': {
    type: 'static',
    title: 'Word by Date',
    description: 'See the word featured on a specific date.',
    category: 'pages',
  },
  '[word]': {
    type: 'static',
    title: 'Word Details',
    description: 'Details and history for a specific word.',
    category: 'pages',
  },
  'words': {
    type: 'static',
    title: 'All Words',
    description: 'Browse the complete alphabetical list of all featured words, organized by year.',
    category: 'pages',
  },
  'words/length': {
    type: 'static',
    title: 'Words by Length',
    description: 'Words organized by character length.',
    category: 'pages',
  },
  'stats': {
    type: 'static',
    title: 'Stats',
    description: 'Explore word statistics, patterns, and linguistic analysis for all featured words.',
    category: 'pages',
  },
  [`stats/${STATS_SLUGS.ALPHABETICAL_ORDER}`]: {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER].title,
    description: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER].metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.DOUBLE_LETTERS}`]: {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS].title,
    description: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS].metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.SAME_START_END}`]: {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.SAME_START_END].title,
    description: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.SAME_START_END].metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.TRIPLE_LETTERS}`]: {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.TRIPLE_LETTERS].title,
    description: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.TRIPLE_LETTERS].metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.WORDS_ENDING_ED}`]: {
    type: 'stats',
    title: SUFFIX_DEFINITIONS.ed.title,
    description: SUFFIX_DEFINITIONS.ed.metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.WORDS_ENDING_ING}`]: {
    type: 'stats',
    title: SUFFIX_DEFINITIONS.ing.title,
    description: SUFFIX_DEFINITIONS.ing.metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.MOST_COMMON_LETTER}`]: {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MOST_COMMON_LETTER].title,
    description: (count: number) =>
      DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MOST_COMMON_LETTER].metaDescription(
        count,
        stats.mostCommonLetter,
      ),
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.LEAST_COMMON_LETTER}`]: {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LEAST_COMMON_LETTER].title,
    description: (count: number) =>
      DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LEAST_COMMON_LETTER].metaDescription(
        count,
        stats.leastCommonLetter,
      ),
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.MILESTONE_WORDS}`]: {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS].title,
    description: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS].metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.CURRENT_STREAK}`]: {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.CURRENT_STREAK].title,
    description: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.CURRENT_STREAK].metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.LONGEST_STREAK}`]: {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LONGEST_STREAK].title,
    description: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LONGEST_STREAK].metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.WORDS_ENDING_LY}`]: {
    type: 'stats',
    title: SUFFIX_DEFINITIONS.ly.title,
    description: SUFFIX_DEFINITIONS.ly.metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.WORDS_ENDING_NESS}`]: {
    type: 'stats',
    title: SUFFIX_DEFINITIONS.ness.title,
    description: SUFFIX_DEFINITIONS.ness.metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.WORDS_ENDING_FUL}`]: {
    type: 'stats',
    title: SUFFIX_DEFINITIONS.ful.title,
    description: SUFFIX_DEFINITIONS.ful.metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.WORDS_ENDING_LESS}`]: {
    type: 'stats',
    title: SUFFIX_DEFINITIONS.less.title,
    description: SUFFIX_DEFINITIONS.less.metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.PALINDROMES}`]: {
    type: 'stats',
    title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES].title,
    description: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES].metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.ALL_CONSONANTS}`]: {
    type: 'stats',
    title: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS].title,
    description: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS].metaDescription,
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.ALL_VOWELS}`]: {
    type: 'stats',
    title: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS].title,
    description: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS].metaDescription,
    category: 'stats',
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

function getCountForPath(path: string, words: WordData[] = allWords): number {
  const stats = getStats(words);
  const countFn = COUNT_FUNCTIONS[path];

  if (countFn) {
    return countFn(stats);
  }

  if (path.startsWith('words/')) {
    const year = path.replace('words/', '');
    return getWordsByYear(year, words).length;
  }

  return 0;
}

/**
 * Get metadata for a specific page path
 * @param pathname - Path of the page
 * @param words - Word dataset to evaluate
 * @returns Metadata including title and description
 */
export function getPageMetadata(pathname?: string, words: WordData[] = allWords) {
  if (!pathname) {
throw new Error('getPageMetadata: pathname is required. Pass Astro.url.pathname from your page.');
}
    let path = pathname.replace(/^\//, '').replace(/\/$/, '');
    const basePath = import.meta.env.BASE_PATH?.replace(/^\/|\/$/g, '') || '';
    if (basePath && (path === basePath || path.startsWith(`${basePath}/`))) {
      path = path.slice(basePath.length).replace(/^\//, '');
    }

  if (path.startsWith('words/length/') && path !== 'words/length') {
    const lengthStr = path.replace('words/length/', '');
    const length = Number(lengthStr);
    if (!isNaN(length)) {
      return {
        title: `${length}-Letter Words`,
        description: `Words containing exactly ${length} letters.`,
        category: 'pages' as const,
      };
    }
  }

  if (path === 'words/length') {
    return {
      title: 'Words by Length',
      description: 'Words organized by character length.',
      category: 'pages' as const,
    };
  }

  if (path.startsWith('words/') && path !== 'words') {
    const [year, month] = path.replace('words/', '').split('/');
    if (year && month) {
      const monthNumber = monthSlugToNumber(month);
      if (monthNumber) {
        const monthName = format(new Date(Number(year), monthNumber - 1), 'MMMM');
        return {
          title: `${monthName} ${year} words`,
          description: `Words from ${monthName} ${year}.`,
          category: 'pages' as const,
        };
      }
    }
    return {
      title: `${year} words`,
      description: `Words from ${year}, organized by month.`,
      category: 'pages' as const,
    };
  }

  const PAGE_METADATA = createPageMetadata(words);
  const metadata = PAGE_METADATA[path as keyof typeof PAGE_METADATA];
  if (!metadata) {
    logger.warn('No metadata found', {
      path,
    });
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
        description: metadata.description(words.length > 0 ? words[words.length - 1].word : ''),
      };
    case 'stats':
      return {
        ...metadata,
        title: metadata.title,
        description: metadata.description(getCountForPath(path, words)),
      };
    case 'static':
    default:
      return {
        ...metadata,
        title: metadata.title,
        description: metadata.description,
      };
  }
}

/**
 * Get metadata for all pages
 * @param words - Word dataset to evaluate
 * @returns Array of metadata objects
 */
export function getAllPageMetadata(words: WordData[] = allWords) {
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
