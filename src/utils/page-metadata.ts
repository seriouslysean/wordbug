import { format } from 'date-fns';

import type { WordData } from '~types/word';
import { logger } from '~utils-client/logger';
import {
  DYNAMIC_STATS_DEFINITIONS,
  LETTER_PATTERN_DEFINITIONS,
  PATTERN_DEFINITIONS,
  STATS_SLUGS,
  SUFFIX_DEFINITIONS,
} from '~utils-client/stats-definitions';
import { allWords, getAvailableYears, getWordsByYear } from '~utils-client/word-data-utils';
import {
  getChronologicalMilestones,
  getLetterPatternStats,
  getLetterStats,
  getPatternStats,
  getWordEndingStats,
  getWordStats,
} from '~utils-client/word-stats-utils';

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
    description: (count: number) => {
      const wordStats = getWordStats(words);
      const letterStats = getLetterStats(wordStats.letterFrequency);
      const mostCommonLetter = letterStats.length > 0 ? letterStats[0][0] : '';
      return DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MOST_COMMON_LETTER].metaDescription(count, mostCommonLetter);
    },
    category: 'stats',
  },
  [`stats/${STATS_SLUGS.LEAST_COMMON_LETTER}`]: {
    type: 'stats',
    title: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LEAST_COMMON_LETTER].title,
    description: (count: number) => {
      const wordStats = getWordStats(words);
      const letterStats = getLetterStats(wordStats.letterFrequency);
      const leastCommonLetter = letterStats.length > 0 ? letterStats[letterStats.length - 1][0] : '';
      return DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LEAST_COMMON_LETTER].metaDescription(count, leastCommonLetter);
    },
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

function getCountForPath(path: string, words: WordData[] = allWords): number {
  switch (path) {
    case 'stats/words-ending-ly':
      return getWordEndingStats(words).ly.length;
    case 'stats/words-ending-ing':
      return getWordEndingStats(words).ing.length;
    case 'stats/words-ending-ed':
      return getWordEndingStats(words).ed.length;
    case 'stats/words-ending-ness':
      return getWordEndingStats(words).ness.length;
    case 'stats/words-ending-ful':
      return getWordEndingStats(words).ful.length;
    case 'stats/words-ending-less':
      return getWordEndingStats(words).less.length;
    case 'stats/double-letters':
      return getLetterPatternStats(words).doubleLetters.length;
    case 'stats/same-start-end':
      return getLetterPatternStats(words).startEndSame.length;
    case 'stats/alphabetical-order':
      return getLetterPatternStats(words).alphabetical.length;
    case 'stats/triple-letters':
      return getLetterPatternStats(words).tripleLetters.length;
    case 'stats/most-common-letter': {
      const wordStats = getWordStats(words);
      const letterStats = getLetterStats(wordStats.letterFrequency);
      const mostCommonLetter = letterStats.length > 0 ? letterStats[0][0] : '';
      return words.filter(wordData => wordData.word.includes(mostCommonLetter)).length;
    }
    case 'stats/least-common-letter': {
      const wordStats = getWordStats(words);
      const letterStats = getLetterStats(wordStats.letterFrequency);
      const leastCommonLetter = letterStats.length > 0 ? letterStats[letterStats.length - 1][0] : '';
      return words.filter(wordData => wordData.word.includes(leastCommonLetter)).length;
    }
    case 'stats/milestone-words': {
      const sortedWords = words.sort((a, b) => a.date.localeCompare(b.date));
      return getChronologicalMilestones(sortedWords).length;
    }
    case 'stats/all-consonants': {
      return getPatternStats(words).allConsonants.length;
    }
    case 'stats/all-vowels': {
      return getPatternStats(words).allVowels.length;
    }
    case 'stats/palindromes': {
      return getLetterPatternStats(words).palindromes.length;
    }
    default:
      if (path.startsWith('words/')) {
        const year = path.replace('words/', '');
        return getWordsByYear(year, words).length;
      }
      return 0;
  }
}


export function getPageMetadata(pathname?: string, words: WordData[] = allWords) {
  if (!pathname) {
throw new Error('getPageMetadata: pathname is required. Pass Astro.url.pathname from your page.');
}
  const path = pathname.replace(/^\//, '').replace(/\/$/, '');

  if (path.startsWith('words/') && path !== 'words') {
    const [year, month] = path.replace('words/', '').split('/');
    if (year && month) {
      const monthName = format(new Date(Number(year), Number(month) - 1), 'MMMM');
      return {
        title: `${monthName} ${year} words`,
        description: `Words featured during ${monthName} ${year}.`,
        category: 'pages' as const,
      };
    }
    return {
      title: `${year} words`,
      description: `Words featured during ${year}.`,
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
  const yearPages = getAvailableYears(words)
    .map(year => {
      const path = `words/${year}`;
      return { path, ...getPageMetadata(path, words) };
    });

  return [...staticPages, ...yearPages];
}
