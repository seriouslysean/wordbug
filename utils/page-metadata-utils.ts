import { format } from 'date-fns';

import { URL_PATTERNS, BASE_PATHS, BROWSE_PATHS, ROUTES, STATS_SLUGS } from '~constants/urls';

import type { WordData } from '~types';
import { MONTH_NAMES, monthSlugToNumber } from '~utils/date-utils';
import {
  DYNAMIC_STATS_DEFINITIONS,
  LETTER_PATTERN_DEFINITIONS,
  PATTERN_DEFINITIONS,
  SUFFIX_DEFINITIONS,
} from '~constants/stats';
import { t, tp } from '~utils/i18n-utils';
import {
  getAvailableLetters,
  getAvailableLengths,
  getAvailableMonths,
  getAvailablePartsOfSpeech,
  getAvailableYears,
  getWordsByYear,
  getWordsByLength,
  getWordsByLetter,
  getWordsByPartOfSpeech,
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
import {
  getLengthUrl,
  getLetterUrl,
  getPartOfSpeechUrl,
} from '~utils/url-utils';

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

  // Create static pages using URL constants, preserving all i18n function calls
  const staticPages: Record<string, PageMeta> = {
    [BASE_PATHS.HOME]: {
      type: 'home',
      title: t('home.heading'),
      description: (currentWord: string): string => t('home.description', { word: currentWord }),
      category: 'pages',
    },
    [BASE_PATHS.WORD]: {
      type: 'static',
      title: t('words.heading'),
      description: t('words.description'),
      category: 'pages',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [BASE_PATHS.BROWSE]: {
      type: 'static',
      title: t('browse.heading'),
      description: t('browse.description'),
      category: 'pages',
      secondaryText: t('browse.subheading'),
    },
    [BROWSE_PATHS.LENGTH]: {
      type: 'static',
      title: t('words.by_length_heading'),
      description: t('words.by_length_description'),
      category: 'pages',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [BROWSE_PATHS.LETTER]: {
      type: 'static',
      title: t('words.by_letter_heading'),
      description: t('words.by_letter_description'),
      category: 'pages',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [BROWSE_PATHS.PART_OF_SPEECH]: {
      type: 'static',
      title: t('words.by_part_of_speech_heading'),
      description: t('words.by_part_of_speech_description'),
      category: 'pages',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [`${BROWSE_PATHS.BROWSE}/year`]: {
      type: 'static',
      title: 'Words by Year',
      description: 'Words grouped by year.',
      category: 'pages',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [BASE_PATHS.STATS]: {
      type: 'static',
      title: t('stats.heading'),
      description: t('stats.description'),
      category: 'pages',
      secondaryText: t('stats.subheading'),
    },
    [ROUTES.STAT(STATS_SLUGS.WORD_FACTS)]: {
      type: 'static',
      title: t('stats.word_facts_heading'),
      description: t('stats.word_facts_description'),
      category: 'pages',
      secondaryText: t('stats.word_facts_subheading'),
    },
    [ROUTES.STAT(STATS_SLUGS.STREAKS)]: {
      type: 'static',
      title: t('stats.streaks_index_heading'),
      description: t('stats.streaks_index_description'),
      category: 'pages',
      secondaryText: t('stats.streaks_index_subheading'),
    },
    [ROUTES.STAT(STATS_SLUGS.LETTER_PATTERNS)]: {
      type: 'static',
      title: t('stats.letter_patterns_index_heading'),
      description: t('stats.letter_patterns_index_description'),
      category: 'pages',
      secondaryText: t('stats.letter_patterns_index_subheading'),
    },
    [ROUTES.STAT(STATS_SLUGS.WORD_ENDINGS)]: {
      type: 'static',
      title: t('stats.word_endings_index_heading'),
      description: t('stats.word_endings_index_description'),
      category: 'pages',
      secondaryText: t('stats.word_endings_index_subheading'),
    },
    [BASE_PATHS.NOT_FOUND]: {
      type: 'static',
      title: t('error.heading'),
      description: t('error.description'),
      category: 'pages',
      partOfSpeech: 'noun',
    },
  };

  // Stats pages with dynamic counts - using URL constants instead of hardcoded paths
  const statsPages: Record<string, PageMeta> = {
    [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_LY)]: {
      type: 'stats',
      title: SUFFIX_DEFINITIONS.ly.title,
      description: (count: number) => SUFFIX_DEFINITIONS.ly.metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_ING)]: {
      type: 'stats',
      title: SUFFIX_DEFINITIONS.ing.title,
      description: (count: number) => SUFFIX_DEFINITIONS.ing.metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_ED)]: {
      type: 'stats',
      title: SUFFIX_DEFINITIONS.ed.title,
      description: (count: number) => SUFFIX_DEFINITIONS.ed.metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_NESS)]: {
      type: 'stats',
      title: SUFFIX_DEFINITIONS.ness.title,
      description: (count: number) => SUFFIX_DEFINITIONS.ness.metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_FUL)]: {
      type: 'stats',
      title: SUFFIX_DEFINITIONS.ful.title,
      description: (count: number) => SUFFIX_DEFINITIONS.ful.metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_LESS)]: {
      type: 'stats',
      title: SUFFIX_DEFINITIONS.less.title,
      description: (count: number) => SUFFIX_DEFINITIONS.less.metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.DOUBLE_LETTERS)]: {
      type: 'stats',
      title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS].title,
      description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.SAME_START_END)]: {
      type: 'stats',
      title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.SAME_START_END].title,
      description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.SAME_START_END].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.ALPHABETICAL_ORDER)]: {
      type: 'stats',
      title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER].title,
      description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.TRIPLE_LETTERS)]: {
      type: 'stats',
      title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.TRIPLE_LETTERS].title,
      description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.TRIPLE_LETTERS].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.MOST_COMMON_LETTER)]: {
      type: 'stats',
      title: `Words with "${stats.mostCommonLetter.toUpperCase()}" (Most Common Letter)`,
      description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MOST_COMMON_LETTER].metaDescription(count, stats.mostCommonLetter),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.LEAST_COMMON_LETTER)]: {
      type: 'stats',
      title: `Words with "${stats.leastCommonLetter.toUpperCase()}" (Least Common Letter)`,
      description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LEAST_COMMON_LETTER].metaDescription(count, stats.leastCommonLetter),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.MILESTONE_WORDS)]: {
      type: 'stats',
      title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS].title,
      description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.PALINDROMES)]: {
      type: 'stats',
      title: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES].title,
      description: (count: number) => LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.ALL_CONSONANTS)]: {
      type: 'stats',
      title: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS].title,
      description: (count: number) => PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.ALL_VOWELS)]: {
      type: 'stats',
      title: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS].title,
      description: (count: number) => PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.CURRENT_STREAK)]: {
      type: 'stats',
      title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.CURRENT_STREAK].title,
      description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.CURRENT_STREAK].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
    [ROUTES.STAT(STATS_SLUGS.LONGEST_STREAK)]: {
      type: 'stats',
      title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LONGEST_STREAK].title,
      description: (count: number) => DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LONGEST_STREAK].metaDescription(count),
      category: 'stats',
      secondaryText: (count: number) => tp('common.words', count),
    },
  };

  return { ...staticPages, ...statsPages };
}

type CountMap = Record<string, (stats: PrecomputedStats) => number>;

const COUNT_FUNCTIONS: CountMap = {
  [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_LY)]: stats => stats.endings.ly.length,
  [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_ING)]: stats => stats.endings.ing.length,
  [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_ED)]: stats => stats.endings.ed.length,
  [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_NESS)]: stats => stats.endings.ness.length,
  [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_FUL)]: stats => stats.endings.ful.length,
  [ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_LESS)]: stats => stats.endings.less.length,
  [ROUTES.STAT(STATS_SLUGS.DOUBLE_LETTERS)]: stats => stats.letterPatterns.doubleLetters.length,
  [ROUTES.STAT(STATS_SLUGS.SAME_START_END)]: stats => stats.letterPatterns.startEndSame.length,
  [ROUTES.STAT(STATS_SLUGS.ALPHABETICAL_ORDER)]: stats => stats.letterPatterns.alphabetical.length,
  [ROUTES.STAT(STATS_SLUGS.TRIPLE_LETTERS)]: stats => stats.letterPatterns.tripleLetters.length,
  [ROUTES.STAT(STATS_SLUGS.MOST_COMMON_LETTER)]: stats => stats.wordsWithMostCommon.length,
  [ROUTES.STAT(STATS_SLUGS.LEAST_COMMON_LETTER)]: stats => stats.wordsWithLeastCommon.length,
  [ROUTES.STAT(STATS_SLUGS.MILESTONE_WORDS)]: stats => stats.milestones.length,
  [ROUTES.STAT(STATS_SLUGS.ALL_CONSONANTS)]: stats => stats.patternStats.allConsonants.length,
  [ROUTES.STAT(STATS_SLUGS.ALL_VOWELS)]: stats => stats.patternStats.allVowels.length,
  [ROUTES.STAT(STATS_SLUGS.PALINDROMES)]: stats => stats.letterPatterns.palindromes.length,
};

const DYNAMIC_COUNT_FUNCTIONS: Record<string, (words: WordData[]) => number> = {
  [ROUTES.STAT(STATS_SLUGS.CURRENT_STREAK)]: words => getCurrentStreakWords(words).length,
  [ROUTES.STAT(STATS_SLUGS.LONGEST_STREAK)]: words => getLongestStreakWords(words).length,
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

  // Handle year pages using existing URL pattern
  const yearMatch = path.match(URL_PATTERNS.YEAR_PAGE);
  if (yearMatch) {
    const year = yearMatch[1];
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
 * @param path - The page path to get metadata for
 * @param words - Word dataset to evaluate
 * @returns Page metadata object
 */
export function getPageMetadata(path: string, words: WordData[] = []): PageMetadataResult {
  if (!path) {
    throw new Error('getPageMetadata: path is required');
  }

  // Handle dynamic word pages
  const wordMatch = path.match(URL_PATTERNS.WORD_DETAIL);
  if (wordMatch) {
    const word = wordMatch[1];
    return {
      title: word,
      description: `Definition and meaning of ${word}.`,
      category: 'pages' as const,
    };
  }

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
  const monthMatch = path.match(URL_PATTERNS.MONTH_PAGE);
  if (monthMatch) {
    const [, year, monthSlug] = monthMatch;
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
  const lengthMatch = path.match(URL_PATTERNS.LENGTH_PAGE);
  if (lengthMatch) {
    const length = parseInt(lengthMatch[1], 10);
    const wordsOfLength = getWordsByLength(length, words);
    return {
      title: t('words.length_words', { length }),
      description: t('words.length_words_description', { length }),
      category: 'pages' as const,
      secondaryText: tp('common.words', wordsOfLength.length),
    };
  }

  // Handle dynamic letter pages
  const letterMatch = path.match(URL_PATTERNS.LETTER_PAGE);
  if (letterMatch) {
    const letter = letterMatch[1].toUpperCase();
    const wordsOfLetter = getWordsByLetter(letter, words);
    return {
      title: letter,
      description: t('words.letter_words_description', { letter }),
      category: 'pages' as const,
      secondaryText: tp('common.words', wordsOfLetter.length),
    };
  }

  // Handle dynamic part-of-speech pages
  const partOfSpeechMatch = path.match(URL_PATTERNS.PART_OF_SPEECH_PAGE);
  if (partOfSpeechMatch) {
    const partOfSpeech = partOfSpeechMatch[1];
    const wordsOfPartOfSpeech = getWordsByPartOfSpeech(partOfSpeech, words);
    const displayName = t(`parts_of_speech.${partOfSpeech}`);
    return {
      title: displayName,
      description: t('words.part_of_speech_words_description', { partOfSpeech }),
      category: 'pages' as const,
      secondaryText: tp('common.words', wordsOfPartOfSpeech.length),
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

  // Get static pages (excluding root '/')
  const staticPages = Object.keys(PAGE_METADATA)
    .filter(path => path !== '/')
    .map(path => ({ path, ...getPageMetadata(path, words) }))
    .filter(page => {
      // Only filter stats pages for empty results
      if (!page.path.startsWith('/stats/') || page.path === '/stats' || showEmptyPages) {
        return true;
      }
      return getCountForPath(page.path, words) > 0;
    });

  // Get dynamic year pages
  const years = getAvailableYears(words);
  const yearPages = years.map(year => {
    const path = ROUTES.YEAR(year);
    return { path, ...getPageMetadata(path, words) };
  });

  // Get dynamic month pages
  const monthPages = years.flatMap(year =>
    getAvailableMonths(year, words).map(month => {
      const monthSlug = MONTH_NAMES[Number(month) - 1];
      const path = ROUTES.MONTH(year, monthSlug);
      return { path, ...getPageMetadata(path, words) };
    }),
  );

  // Get dynamic word length pages
  const lengthPages = getAvailableLengths(words).map(length => {
    const path = getLengthUrl(length);
    return { path, ...getPageMetadata(path, words) };
  });

  // Get dynamic word letter pages  
  const letterPages = getAvailableLetters(words).map(letter => {
    const path = getLetterUrl(letter);
    return { path, ...getPageMetadata(path, words) };
  });

  // Get dynamic part-of-speech pages  
  const partOfSpeechPages = getAvailablePartsOfSpeech(words).map(partOfSpeech => {
    const path = getPartOfSpeechUrl(partOfSpeech);
    return { path, ...getPageMetadata(path, words) };
  });

  return [...staticPages, ...yearPages, ...monthPages, ...lengthPages, ...letterPages, ...partOfSpeechPages];
}
