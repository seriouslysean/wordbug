import {
  DYNAMIC_STATS_DEFINITIONS,
  LETTER_PATTERN_DEFINITIONS,
  PATTERN_DEFINITIONS,
  STATS_SLUGS,
  SUFFIX_DEFINITIONS,
  SUFFIX_ENTRIES,
} from '#constants/stats';
import {
  getChronologicalMilestones,
  getCurrentStreakStats,
  getLetterPatternStats,
  getLetterStats,
  getLongestStreakWords,
  getPatternStats,
  getWordEndingStats,
} from '#astro-utils/word-stats-utils';

const ORDINAL_RULES = new Intl.PluralRules('en', { type: 'ordinal' });

// English ordinals resolve to one, two, few or other; other is every 'th'
const ORDINAL_SUFFIXES: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'st', two: 'nd', few: 'rd' };

const ordinal = (n: number): string => `${n}${ORDINAL_SUFFIXES[ORDINAL_RULES.select(n)] ?? 'th'}`;

import type { StatsPageProps, WordData, WordMilestoneItem } from '#types';

// Template constants
const TEMPLATE = {
  WORD_LIST: 'word-list',
  MILESTONE: 'milestone',
} as const;


// Configuration for stats generation - eliminates duplication
interface BaseStatsConfig {
  slug: string;
  definition: {
    pageDescription: string | ((arg?: string | number) => string);
    title: string;
    metaDescription: ((count: number, arg?: string) => string) | string;
  };
  arg?: string | number;
}

interface WordListStatsConfig extends BaseStatsConfig {
  type: typeof TEMPLATE.WORD_LIST;
  data: WordData[];
}

interface MilestoneStatsConfig extends BaseStatsConfig {
  type: typeof TEMPLATE.MILESTONE;
  data: WordMilestoneItem[];
}

// The literal `type` ties each config to the shape of its data
type StatsConfig = WordListStatsConfig | MilestoneStatsConfig;

import { getDefinition } from '#utils/page-metadata-utils';

const createStatsConfig = (words: WordData[]): StatsConfig[] => {
  const letterPatterns = getLetterPatternStats(words);
  const patternStats = getPatternStats(words);
  const endings = getWordEndingStats(words);
  const letterStats = getLetterStats(words);
  const streakStats = getCurrentStreakStats(words);

  return [
    // Pattern stats
    { slug: STATS_SLUGS.ALL_CONSONANTS, data: patternStats.allConsonants, definition: getDefinition(PATTERN_DEFINITIONS, STATS_SLUGS.ALL_CONSONANTS), type: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.ALL_VOWELS, data: patternStats.allVowels, definition: getDefinition(PATTERN_DEFINITIONS, STATS_SLUGS.ALL_VOWELS), type: TEMPLATE.WORD_LIST },

    // Suffix stats
    ...SUFFIX_ENTRIES.map(([suffix, slug]) => ({
      slug,
      data: endings[suffix],
      definition: getDefinition(SUFFIX_DEFINITIONS, suffix),
      type: TEMPLATE.WORD_LIST,
    })),

    // Letter pattern stats
    { slug: STATS_SLUGS.ALPHABETICAL_ORDER, data: letterPatterns.alphabetical, definition: getDefinition(LETTER_PATTERN_DEFINITIONS, STATS_SLUGS.ALPHABETICAL_ORDER), type: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.DOUBLE_LETTERS, data: letterPatterns.doubleLetters, definition: getDefinition(LETTER_PATTERN_DEFINITIONS, STATS_SLUGS.DOUBLE_LETTERS), type: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.TRIPLE_LETTERS, data: letterPatterns.tripleLetters, definition: getDefinition(LETTER_PATTERN_DEFINITIONS, STATS_SLUGS.TRIPLE_LETTERS), type: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.SAME_START_END, data: letterPatterns.startEndSame, definition: getDefinition(LETTER_PATTERN_DEFINITIONS, STATS_SLUGS.SAME_START_END), type: TEMPLATE.WORD_LIST },
    { slug: STATS_SLUGS.PALINDROMES, data: letterPatterns.palindromes, definition: getDefinition(LETTER_PATTERN_DEFINITIONS, STATS_SLUGS.PALINDROMES), type: TEMPLATE.WORD_LIST },

    // Letter frequency stats
    {
      slug: STATS_SLUGS.MOST_COMMON_LETTER,
      data: letterStats.wordsWithMostCommon,
      definition: getDefinition(DYNAMIC_STATS_DEFINITIONS, STATS_SLUGS.MOST_COMMON_LETTER),
      type: TEMPLATE.WORD_LIST,
      arg: letterStats.mostCommon || undefined,
    },
    {
      slug: STATS_SLUGS.LEAST_COMMON_LETTER,
      data: letterStats.wordsWithLeastCommon,
      definition: getDefinition(DYNAMIC_STATS_DEFINITIONS, STATS_SLUGS.LEAST_COMMON_LETTER),
      type: TEMPLATE.WORD_LIST,
      arg: letterStats.leastCommon || undefined,
    },

    // Milestone stats
    {
      slug: STATS_SLUGS.MILESTONE_WORDS,
      data: getChronologicalMilestones(words.toSorted((a, b) => a.date.localeCompare(b.date)))
        .toReversed()
        .map(w => ({ ...w.word, label: `${ordinal(w.milestone)} Word` })),
      definition: getDefinition(DYNAMIC_STATS_DEFINITIONS, STATS_SLUGS.MILESTONE_WORDS),
      type: TEMPLATE.MILESTONE,
    },

    // Streak stats
    {
      slug: STATS_SLUGS.CURRENT_STREAK,
      data: (() => {
        if (streakStats.currentStreak <= 0) {
          return [];
        }
        return words
          .toSorted((a, b) => b.date.localeCompare(a.date))
          .slice(0, streakStats.currentStreak)
          .map((w, i) => ({
            ...w,
            label: `${ordinal(i + 1)} Day`,
          }))
          .toReversed();
      })(),
      definition: getDefinition(DYNAMIC_STATS_DEFINITIONS, STATS_SLUGS.CURRENT_STREAK),
      type: TEMPLATE.MILESTONE,
      arg: streakStats.currentStreak,
    },
    {
      slug: STATS_SLUGS.LONGEST_STREAK,
      data: getLongestStreakWords(words).map((w, i) => ({
        ...w,
        label: `${ordinal(i + 1)} Day`,
      })),
      definition: getDefinition(DYNAMIC_STATS_DEFINITIONS, STATS_SLUGS.LONGEST_STREAK),
      type: TEMPLATE.MILESTONE,
      arg: streakStats.longestStreak,
    },
  ];
};
/**
 * Builds page props one variant at a time so `type` and `words` stay paired.
 */
const toStatsPageProps = (config: StatsConfig): StatsPageProps => {
  const description = typeof config.definition.pageDescription === 'function'
    ? config.definition.pageDescription(config.arg)
    : config.definition.pageDescription;

  // Narrowing-only: both branches read the same, but each sees one StatsConfig
  // variant, so `type` and `words` stay correlated without an assertion
  return config.type === TEMPLATE.MILESTONE
    ? { type: config.type, words: config.data, description }
    : { type: config.type, words: config.data, description };
};

/**
 * Generate Astro static paths for statistics pages
 * @returns Array of path definitions for stats pages
 */
export const generateStatsStaticPaths = async () => {
  const { allWords: words } = await import('#astro-utils/word-data-utils');

  const statsConfig = createStatsConfig(words);

  return statsConfig.map(config => ({
    params: { stat: config.slug },
    props: toStatsPageProps(config),
  }));
};
