/**
 * Base stats definition structure
 */
export interface StatsDefinition {
  title: string;
  pageDescription: string;
  metaDescription: (count: number) => string;
  category: 'stats';
}

/**
 * Static stats definition with string-only meta description
 */
export interface StaticStatsDefinition {
  title: string;
  pageDescription: string;
  metaDescription: string;
  category: 'stats';
}

/**
 * Dynamic stats definition with function-based descriptions
 */
export interface DynamicStatsDefinition {
  title: string;
  pageDescription: (arg?: string | number) => string;
  metaDescription: (count: number, arg?: string) => string;
  category: 'stats';
}

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

/**
 * @deprecated Use StatsSlug instead
 */
export type StatsDefinitionKey = StatsSlug;