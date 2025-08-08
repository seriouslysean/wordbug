/**
 * Shared stats definition fields
 */
interface BaseStatsDefinition {
  title: string;
  category: 'stats';
}

/**
 * Stats definition with static descriptions
 */
export interface StaticStatsDefinition extends BaseStatsDefinition {
  pageDescription: string;
  metaDescription: (count: number) => string;
}

/**
 * Stats definition with dynamic descriptions
 */
export interface DynamicStatsDefinition extends BaseStatsDefinition {
  pageDescription: (arg?: string | number) => string;
  metaDescription: (count: number, arg?: string | number) => string;
}

/**
 * Combined stats definition type
 */
export type StatsDefinition = StaticStatsDefinition | DynamicStatsDefinition;

/**
 * Available word suffix patterns
 */
export type SuffixKey = 'ed' | 'ing' | 'ly' | 'ness' | 'ful' | 'less';

/**
 * All available stats page slugs (consolidated from StatsDefinitionKey and StatsSlug)
 */
export type StatsSlug =
  // Letter patterns
  | 'alphabetical-order'
  | 'double-letters'
  | 'triple-letters'
  | 'same-start-end'
  | 'palindromes'
  // Word patterns
  | 'all-consonants'
  | 'all-vowels'
  // Dynamic stats
  | 'most-common-letter'
  | 'least-common-letter'
  | 'milestone-words'
  | 'current-streak'
  | 'longest-streak'
  // Word endings
  | 'words-ending-ed'
  | 'words-ending-ing'
  | 'words-ending-ly'
  | 'words-ending-ness'
  | 'words-ending-ful'
  | 'words-ending-less';

/**
 * Template type for suffix-based stats slugs
 */
export type SuffixStatsSlug = `words-ending-${SuffixKey}`;

/**
 * Type aliases for backward compatibility
 */
export type SuffixDefinition = StatsDefinition;
export type LetterPatternDefinition = StatsDefinition;
export type PatternDefinition = StatsDefinition;

