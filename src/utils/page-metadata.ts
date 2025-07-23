import { formatWordCount } from '~utils/text-utils';
import { getAllWords, getAvailableYears, getWordsByYear } from '~utils/word-data-utils';
import { getLetterPatternStats,getWordEndingStats } from '~utils/word-stats-utils';

export const PAGE_METADATA = {
  '': {
    title: null,
    description: null,
    category: 'root',
  },
  'words': {
    title: 'All Words',
    description: 'Complete alphabetical list of all featured words',
    category: 'pages',
  },
  'stats': {
    title: 'Statistics',
    description: 'Word patterns and linguistic analysis',
    category: 'pages',
  },
  'stats/words-ending-ly': {
    title: '-ly words',
    description: (count: number) => `${formatWordCount(count)} that end with the suffix "-ly".`,
    category: 'stats',
  },
  'stats/words-ending-ing': {
    title: '-ing words',
    description: (count: number) => `${formatWordCount(count)} that end with the suffix "-ing".`,
    category: 'stats',
  },
  'stats/words-ending-ed': {
    title: '-ed words',
    description: (count: number) => `${formatWordCount(count)} that end with the suffix "-ed".`,
    category: 'stats',
  },
  'stats/double-letters': {
    title: 'Double Letters',
    description: (count: number) => `${formatWordCount(count)} with repeated letters.`,
    category: 'stats',
  },
  'stats/same-start-end': {
    title: 'Same Start/End Letter',
    description: (count: number) => `${formatWordCount(count)} that begin and end with the same letter.`,
    category: 'stats',
  },
  'stats/alphabetical-order': {
    title: 'Alphabetical Order',
    description: (count: number) => `${formatWordCount(count)} with letters in alphabetical sequence.`,
    category: 'stats',
  },
};

function getCountForPath(path: string): number {
  const words = getAllWords();

  switch (path) {
    case 'stats/words-ending-ly':
      return getWordEndingStats(words).ly.length;
    case 'stats/words-ending-ing':
      return getWordEndingStats(words).ing.length;
    case 'stats/words-ending-ed':
      return getWordEndingStats(words).ed.length;
    case 'stats/double-letters':
      return getLetterPatternStats(words).doubleLetters.length;
    case 'stats/same-start-end':
      return getLetterPatternStats(words).startEndSame.length;
    case 'stats/alphabetical-order':
      return getLetterPatternStats(words).alphabetical.length;
    default:
      // Handle dynamic year pages
      if (path.startsWith('words/')) {
        const year = path.replace('words/', '');
        return getWordsByYear(year).length;
      }
      return 0;
  }
}

export function getPageMetadata(pathname?: string) {
  // Auto-detect current path if not provided (for use in .astro files)
  const path = pathname || (typeof Astro !== 'undefined' ? Astro.url.pathname.slice(1) : '');

  // Handle dynamic year pages
  if (path.startsWith('words/') && path !== 'words') {
    const year = path.replace('words/', '');
    return {
      title: `${year} Words`,
      description: `Words featured during ${year}.`,
      category: 'pages',
    };
  }

  const metadata = PAGE_METADATA[path];
  if (!metadata) {
return {};
}

  if (typeof metadata.description === 'function') {
    const count = getCountForPath(path);
    return {
      ...metadata,
      description: metadata.description(count),
    };
  }

  return { ...metadata };
}

export function getAllPageMetadata() {
  const pages = [];

  // Add static pages
  Object.keys(PAGE_METADATA).forEach(path => {
    if (path !== '') { // Skip root
      pages.push({ path, ...getPageMetadata(path) });
    }
  });

  // Add dynamic year pages
  const years = getAvailableYears();
  years.forEach(year => {
    const path = `words/${year}`;
    pages.push({ path, ...getPageMetadata(path) });
  });

  return pages;
}