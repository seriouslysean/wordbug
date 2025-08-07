import {
  DYNAMIC_STATS_DEFINITIONS,
  LETTER_PATTERN_DEFINITIONS,
  PATTERN_DEFINITIONS,
  STATS_SLUGS,
  SUFFIX_DEFINITIONS,
} from '~utils-client/stats-definitions';
import {
  getChronologicalMilestones,
  getCurrentStreakStats,
  getLetterPatternStats,
  getLetterStats,
  getLongestStreakWords,
  getPatternStats,
  getWordEndingStats,
  getWordStats,
} from '~utils-client/word-stats-utils';

const ordinal = (n: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = n % 100;
  return n + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]);
};

import type { WordData, WordMilestoneItem } from '~types/word';

// Template constants
const TEMPLATE = {
  WORD_LIST: 'word-list',
  MILESTONE: 'milestone',
} as const;


// Configuration for stats generation - eliminates duplication
interface StatsConfig {
  slug: string;
  data: WordData[] | WordMilestoneItem[];
  def: {
    pageDescription: string | ((arg?: string | number) => string);
    title: string;
    metaDescription: ((count: number, arg?: string) => string) | string;
  };
  template: typeof TEMPLATE[keyof typeof TEMPLATE];
  arg?: string | number;
}

const createStatsConfig = (words: WordData[]): StatsConfig[] => {
  const letterPatterns = getLetterPatternStats(words);
  const patternStats = getPatternStats(words);
  const endings = getWordEndingStats(words);
  const letterStats = getLetterStats(getWordStats(words).letterFrequency);
  const mostCommon = letterStats[0];
  const leastCommon = letterStats[letterStats.length - 1];
  const streakStats = getCurrentStreakStats([...words].sort((a, b) => b.date.localeCompare(a.date)));

  return [
    // Pattern stats
    { slug: STATS_SLUGS.ALL_CONSONANTS, data: patternStats.allConsonants, def: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS], template: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.ALL_VOWELS, data: patternStats.allVowels, def: PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS], template: TEMPLATE.WORD_LIST },

    // Suffix stats
    ...Object.keys(SUFFIX_DEFINITIONS).map(suffix => ({
      slug: STATS_SLUGS[`WORDS_ENDING_${suffix.toUpperCase()}` as keyof typeof STATS_SLUGS],
      data: endings[suffix as keyof typeof endings] || [],
      def: SUFFIX_DEFINITIONS[suffix as keyof typeof SUFFIX_DEFINITIONS],
      template: TEMPLATE.WORD_LIST,
    })),

    // Letter pattern stats
    { slug: STATS_SLUGS.ALPHABETICAL_ORDER, data: letterPatterns.alphabetical, def: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER], template: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.DOUBLE_LETTERS, data: letterPatterns.doubleLetters, def: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS], template: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.TRIPLE_LETTERS, data: letterPatterns.tripleLetters, def: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.TRIPLE_LETTERS], template: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.SAME_START_END, data: letterPatterns.startEndSame, def: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.SAME_START_END], template: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.PALINDROMES, data: letterPatterns.palindromes, def: LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES], template: TEMPLATE.WORD_LIST },

    // Letter frequency stats
    {
      slug: STATS_SLUGS.MOST_COMMON_LETTER,
      data: mostCommon ? words.filter(w => w.word.includes(mostCommon[0])) : [],
      def: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MOST_COMMON_LETTER],
      template: TEMPLATE.WORD_LIST,
      arg: mostCommon?.[0],
    },
    {
      slug: STATS_SLUGS.LEAST_COMMON_LETTER,
      data: leastCommon ? words.filter(w => w.word.includes(leastCommon[0])) : [],
      def: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LEAST_COMMON_LETTER],
      template: TEMPLATE.WORD_LIST,
      arg: leastCommon?.[0],
    },

    // Milestone stats
    {
      slug: STATS_SLUGS.MILESTONE_WORDS,
      data: getChronologicalMilestones([...words].sort((a, b) => a.date.localeCompare(b.date)))
        .reverse()
        .map(w => ({ ...w.word, label: `${ordinal(w.milestone)} Word` })),
      def: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS],
      template: TEMPLATE.MILESTONE,
    },

    // Streak stats
    {
      slug: STATS_SLUGS.CURRENT_STREAK,
      data: (() => {
        if (streakStats.currentStreak <= 0) {
          return [];
        }
        return [...words]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, streakStats.currentStreak)
          .map((w, i) => ({
            ...w,
            label: `${ordinal(i + 1)} Day`,
          }))
          .reverse();
      })(),
      def: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.CURRENT_STREAK],
      template: TEMPLATE.MILESTONE,
      arg: streakStats.currentStreak,
    },
    {
      slug: STATS_SLUGS.LONGEST_STREAK,
      data: getLongestStreakWords(words).map((w, i) => ({
        ...w,
        label: `${ordinal(i + 1)} Day`,
      })),
      def: DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LONGEST_STREAK],
      template: TEMPLATE.MILESTONE,
      arg: streakStats.longestStreak,
    },
  ];
};
/**
 * Generate Astro static paths for statistics pages
 * @returns Array of path definitions for stats pages
 */
export const generateStatsStaticPaths = async () => {
  const { getWordsFromCollection } = await import('~utils-client/word-data-utils');
  const words = await getWordsFromCollection();

  const showEmptyPages = __SHOW_EMPTY_STATS__;
  const statsConfig = createStatsConfig(words);

  const stats = statsConfig
    .filter(config => showEmptyPages || (config.data?.length > 0))
    .map(config => ({
      params: { stat: config.slug },
      props: {
        words: config.data,
        description: config.arg
          ? (typeof config.def.pageDescription === 'function'
              ? config.def.pageDescription(config.arg)
              : config.def.pageDescription)
          : (typeof config.def.pageDescription === 'function'
              ? config.def.pageDescription()
              : config.def.pageDescription),
        template: config.template,
      },
    }));

  return stats;
};
