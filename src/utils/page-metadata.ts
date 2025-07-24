import { logger } from '~utils/logger';
import { formatWordCount } from '~utils/text-utils';
import { getAllWords, getAvailableYears, getWordsByYear } from '~utils/word-data-utils';
import {
  getChronologicalMilestones,
  getLetterPatternStats,
  getLetterStats,
  getWordEndingStats,
  getWordStats,
} from '~utils/word-stats-utils';

const words = getAllWords();


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

const PAGE_METADATA: Record<string, PageMeta> = {
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
  'stats/alphabetical-order': {
    type: 'stats',
    title: 'Alphabetical Order',
    description: (count: number) => `${formatWordCount(count)} with consecutive letters in alphabetical order.`,
    category: 'stats',
  },
  'stats/double-letters': {
    type: 'stats',
    title: 'Double Letters',
    description: (count: number) => `${formatWordCount(count)} with repeated letters.`,
    category: 'stats',
  },
  'stats/same-start-end': {
    type: 'stats',
    title: 'Same Start/End Letter',
    description: (count: number) => `${formatWordCount(count)} that start and end with the same letter.`,
    category: 'stats',
  },
  'stats/triple-letters': {
    type: 'stats',
    title: 'Triple Letters',
    description: (count: number) => `${formatWordCount(count)} with three or more consecutive identical letters.`,
    category: 'stats',
  },
  'stats/words-ending-ed': {
    type: 'stats',
    title: '-ed words',
    description: (count: number) => `${formatWordCount(count)} that end with the suffix "-ed".`,
    category: 'stats',
  },
  'stats/words-ending-ing': {
    type: 'stats',
    title: '-ing words',
    description: (count: number) => `${formatWordCount(count)} that end with the suffix "-ing".`,
    category: 'stats',
  },
  'stats/most-common-letter': {
    type: 'stats',
    title: 'Most Common Letter',
    description: (count: number) => {
      const wordStats = getWordStats(words);
      const letterStats = getLetterStats(wordStats.letterFrequency);
      const mostCommonLetter = letterStats.length > 0 ? letterStats[0][0] : '';
      return `The most common letter is "${mostCommonLetter}" and has ${formatWordCount(count)}.`;
    },
    category: 'stats',
  },
  'stats/least-common-letter': {
    type: 'stats',
    title: 'Least Common Letter',
    description: (count: number) => {
      const wordStats = getWordStats(words);
      const letterStats = getLetterStats(wordStats.letterFrequency);
      const leastCommonLetter = letterStats.length > 0 ? letterStats[letterStats.length - 1][0] : '';
      return `The least common letter is "${leastCommonLetter}" and has ${formatWordCount(count)}.`;
    },
    category: 'stats',
  },
  'stats/milestone-words': {
    type: 'stats',
    title: 'Milestone Words',
    description: (count: number) => `${formatWordCount(count)} that mark major milestones in the collection.`,
    category: 'stats',
  },
  'stats/words-ending-ly': {
    type: 'stats',
    title: '-ly words',
    description: (count: number) => `${formatWordCount(count)} that end with the suffix "-ly".`,
    category: 'stats',
  },
  'stats/words-ending-ness': {
    type: 'stats',
    title: '-ness words',
    description: (count: number) => `${formatWordCount(count)} that end with the suffix "-ness".`,
    category: 'stats',
  },
  'stats/words-ending-ful': {
    type: 'stats',
    title: '-ful words',
    description: (count: number) => `${formatWordCount(count)} that end with the suffix "-ful".`,
    category: 'stats',
  },
  'stats/words-ending-less': {
    type: 'stats',
    title: '-less words',
    description: (count: number) => `${formatWordCount(count)} that end with the suffix "-less".`,
    category: 'stats',
  },
} as const;

function getCountForPath(path: string): number {
  // use top-level words

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
      return words.filter(wordData => wordData.word.toLowerCase().includes(mostCommonLetter)).length;
    }
    case 'stats/least-common-letter': {
      const wordStats = getWordStats(words);
      const letterStats = getLetterStats(wordStats.letterFrequency);
      const leastCommonLetter = letterStats.length > 0 ? letterStats[letterStats.length - 1][0] : '';
      return words.filter(wordData => wordData.word.toLowerCase().includes(leastCommonLetter)).length;
    }
    case 'stats/milestone-words': {
      const sortedWords = words.sort((a, b) => a.date.localeCompare(b.date));
      return getChronologicalMilestones(sortedWords).length;
    }
    default:
      if (path.startsWith('words/')) {
        const year = path.replace('words/', '');
        return getWordsByYear(year).length;
      }
      return 0;
  }
}


export function getPageMetadata(pathname?: string) {
  if (!pathname) {
throw new Error('getPageMetadata: pathname is required. Pass Astro.url.pathname from your page.');
}
  const path = pathname.replace(/^\//, '').replace(/\/$/, '');

  if (path.startsWith('words/') && path !== 'words') {
    const year = path.replace('words/', '');
    return {
      title: `${year} words`,
      description: `Words featured during ${year}.`,
      category: 'pages' as const,
    };
  }

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
        title: metadata.title?.toLowerCase(),
        description: metadata.description(words.length > 0 ? words[words.length - 1].word : ''),
      };
    case 'stats':
      return {
        ...metadata,
        title: metadata.title?.toLowerCase(),
        description: metadata.description(getCountForPath(path)),
      };
    case 'static':
    default:
      return {
        ...metadata,
        title: metadata.title?.toLowerCase(),
        description: metadata.description,
      };
  }
}

export function getAllPageMetadata() {
  const pages = [];

  // Check for debug flag to show all pages (including empty ones)
  const showEmptyPages = __SHOW_EMPTY_STATS__;

  // Add static pages, filtering out empty stats pages
  for (const [path] of Object.entries(PAGE_METADATA)) {
    if (path !== '') {
      // Filter out stats pages with 0 results (unless debug flag is set)
      if (path.startsWith('stats/') && path !== 'stats') {
        const count = getCountForPath(path);
        if (count === 0 && !showEmptyPages) {
          continue; // Skip empty pages
        }
      }
      pages.push({ path, ...getPageMetadata(path) });
    }
  }

  // Add dynamic year pages
  const years = getAvailableYears();
  for (const year of years) {
    const path = `words/${year}`;
    pages.push({ path, ...getPageMetadata(path) });
  }

  return pages;
}
