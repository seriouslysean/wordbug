import type { StatsDefinition, StatsSlug, SuffixKey } from '~types';
import { formatWordCount } from '~utils/text-utils';

// Stats page slug constants - defined here since this is where they're used
export const STATS_SLUGS = {
  // Letter patterns
  ALPHABETICAL_ORDER: 'alphabetical-order',
  DOUBLE_LETTERS: 'double-letters',
  TRIPLE_LETTERS: 'triple-letters',
  SAME_START_END: 'same-start-end',
  PALINDROMES: 'palindromes',

  // Consonant/vowel patterns
  ALL_CONSONANTS: 'all-consonants',
  ALL_VOWELS: 'all-vowels',

  // Dynamic stats
  MOST_COMMON_LETTER: 'most-common-letter',
  LEAST_COMMON_LETTER: 'least-common-letter',
  MILESTONE_WORDS: 'milestone-words',
  CURRENT_STREAK: 'current-streak',
  LONGEST_STREAK: 'longest-streak',

  // Word endings
  WORDS_ENDING_ED: 'words-ending-ed',
  WORDS_ENDING_ING: 'words-ending-ing',
  WORDS_ENDING_LY: 'words-ending-ly',
  WORDS_ENDING_NESS: 'words-ending-ness',
  WORDS_ENDING_FUL: 'words-ending-ful',
  WORDS_ENDING_LESS: 'words-ending-less',
} as const satisfies Record<string, StatsSlug>;

// Word ending definitions
export const SUFFIX_DEFINITIONS: Record<SuffixKey, StatsDefinition> = {
  ed: {
    title: '-ed words',
    pageDescription: `Words ending with the suffix '-ed', typically indicating past tense or past participle forms.`,
    metaDescription: (count: number) => `${formatWordCount(count)} that end with the suffix '-ed'.`,
    category: 'stats' as const,
  },
  ing: {
    title: '-ing words',
    pageDescription: `Words ending with the suffix '-ing', typically indicating present participle or gerund forms.`,
    metaDescription: (count: number) => `${formatWordCount(count)} that end with the suffix '-ing'.`,
    category: 'stats' as const,
  },
  ly: {
    title: '-ly words',
    pageDescription: `Words ending with the suffix '-ly', typically forming adverbs.`,
    metaDescription: (count: number) => `${formatWordCount(count)} that end with the suffix '-ly'.`,
    category: 'stats' as const,
  },
  ness: {
    title: '-ness words',
    pageDescription: `Words ending with the suffix '-ness', typically forming abstract nouns expressing a state or quality.`,
    metaDescription: (count: number) => `${formatWordCount(count)} that end with the suffix '-ness'.`,
    category: 'stats' as const,
  },
  ful: {
    title: '-ful words',
    pageDescription: `Words ending with the suffix '-ful', meaning 'full of' or 'characterized by' a particular quality.`,
    metaDescription: (count: number) => `${formatWordCount(count)} that end with the suffix '-ful'.`,
    category: 'stats' as const,
  },
  less: {
    title: '-less words',
    pageDescription: `Words ending with the suffix '-less', meaning 'without' or 'lacking' a particular quality.`,
    metaDescription: (count: number) => `${formatWordCount(count)} that end with the suffix '-less'.`,
    category: 'stats' as const,
  },
} as const;

// Letter pattern definitions
export const LETTER_PATTERN_DEFINITIONS: Record<string, StatsDefinition> = {
  [STATS_SLUGS.ALPHABETICAL_ORDER]: {
    title: 'Alphabetical Order',
    pageDescription: 'Words with three or more consecutive letters in alphabetical order.',
    metaDescription: (count: number) => `${formatWordCount(count)} with consecutive letters in alphabetical order.`,
    category: 'stats' as const,
  },
  [STATS_SLUGS.DOUBLE_LETTERS]: {
    title: 'Double Letters',
    pageDescription: 'Words containing double letters (the same letter appearing twice in a row).',
    metaDescription: (count: number) => `${formatWordCount(count)} with repeated letters.`,
    category: 'stats' as const,
  },
  [STATS_SLUGS.TRIPLE_LETTERS]: {
    title: 'Triple Letters',
    pageDescription: 'Words containing triple letters (the same letter appearing three or more times in a row).',
    metaDescription: (count: number) => `${formatWordCount(count)} with three or more consecutive identical letters.`,
    category: 'stats' as const,
  },
  [STATS_SLUGS.SAME_START_END]: {
    title: 'Same Start/End Letter',
    pageDescription: 'Words that begin and end with the same letter.',
    metaDescription: (count: number) => `${formatWordCount(count)} that start and end with the same letter.`,
    category: 'stats' as const,
  },
  [STATS_SLUGS.PALINDROMES]: {
    title: 'palindrome words',
    pageDescription: `Total number of palindromes (words that read the same forwards and backwards) in our collection.`,
    metaDescription: (count: number) => `${formatWordCount(count)} that are palindromes (words that read the same forwards and backwards).`,
    category: 'stats' as const,
  },
} as const;

// Other pattern definitions
export const PATTERN_DEFINITIONS: Record<string, StatsDefinition> = {
  [STATS_SLUGS.ALL_CONSONANTS]: {
    title: 'All Consonants',
    pageDescription: `Words made up of only consonants (no vowels).`,
    metaDescription: (count: number) => `${formatWordCount(count)} made up of only consonants (no vowels).`,
    category: 'stats' as const,
  },
  [STATS_SLUGS.ALL_VOWELS]: {
    title: 'All Vowels',
    pageDescription: `Words made up of only vowels (no consonants).`,
    metaDescription: (count: number) => `${formatWordCount(count)} made up of only vowels (no consonants).`,
    category: 'stats' as const,
  },
} as const;

// Special stats definitions that need dynamic data
export const DYNAMIC_STATS_DEFINITIONS: Record<string, StatsDefinition> = {
  [STATS_SLUGS.MOST_COMMON_LETTER]: {
    title: 'Most Common Letter',
    pageDescription: (letter: string) => `Words containing the letter "${letter}" (appears in multiple words).`,
    metaDescription: (count: number, letter: string) => `The most common letter is "${letter}" and has ${formatWordCount(count)}.`,
    category: 'stats' as const,
  },
  [STATS_SLUGS.LEAST_COMMON_LETTER]: {
    title: 'Least Common Letter',
    pageDescription: (letter: string) => `Words containing the letter "${letter}" (appears in multiple words).`,
    metaDescription: (count: number, letter: string) => `The least common letter is "${letter}" and has ${formatWordCount(count)}.`,
    category: 'stats' as const,
  },
  [STATS_SLUGS.MILESTONE_WORDS]: {
    title: 'Milestone Words',
    pageDescription: () => `Important word milestones from our collection's chronological journey.`,
    metaDescription: (count: number) => `${formatWordCount(count)} that mark major milestones in the collection.`,
    category: 'stats' as const,
  },
  [STATS_SLUGS.CURRENT_STREAK]: {
    title: 'Current Streak',
    pageDescription: (streakLength: number) => `Words from the current ${streakLength}-word streak.`,
    metaDescription: (count: number) => `${formatWordCount(count)} from the current word streak.`,
    category: 'stats' as const,
  },
  [STATS_SLUGS.LONGEST_STREAK]: {
    title: 'Longest Streak',
    pageDescription: (streakLength: number) => `Words from the longest ${streakLength}-word streak.`,
    metaDescription: (count: number) => `${formatWordCount(count)} from the longest word streak.`,
    category: 'stats' as const,
  },
} as const;

/**
 * Retrieve a stats definition by slug key
 * @param key - Stats slug
 * @returns Stats definition or undefined if not found
 */
export function getStatsDefinition(key: string) {
  // Check suffix definitions
  for (const [suffix, def] of Object.entries(SUFFIX_DEFINITIONS)) {
    if (key === STATS_SLUGS[`WORDS_ENDING_${suffix.toUpperCase()}` as keyof typeof STATS_SLUGS]) {
      return def;
    }
  }

  // Check letter pattern definitions
  if (key in LETTER_PATTERN_DEFINITIONS) {
    return LETTER_PATTERN_DEFINITIONS[key];
  }

  // Check other pattern definitions
  if (key in PATTERN_DEFINITIONS) {
    return PATTERN_DEFINITIONS[key];
  }

  // Dynamic stats need special handling by the caller
  if (key in DYNAMIC_STATS_DEFINITIONS) {
    return DYNAMIC_STATS_DEFINITIONS[key];
  }

  return null;
}

// Export all keys for iteration - just use Object.values of STATS_SLUGS
export const ALL_STATS_KEYS = Object.values(STATS_SLUGS);