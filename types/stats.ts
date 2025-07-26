export interface StatsDefinition {
  title: string;
  pageDescription: string;
  metaDescription: (count: number) => string;
  category: 'stats';
}

export interface StaticStatsDefinition {
  title: string;
  pageDescription: string;
  metaDescription: string;
  category: 'stats';
}

export interface DynamicStatsDefinition {
  title: string;
  pageDescription: (arg?: string | number) => string;
  metaDescription: (count: number, arg?: string) => string;
  category: 'stats';
}

export type SuffixDefinition = StatsDefinition;

export type LetterPatternDefinition = StatsDefinition;

export type PatternDefinition = StatsDefinition;

export type StatsDefinitionKey =
  | 'alphabetical-order'
  | 'double-letters'
  | 'triple-letters'
  | 'same-start-end'
  | 'palindromes'
  | 'all-consonants'
  | 'all-vowels'
  | 'most-common-letter'
  | 'least-common-letter'
  | 'milestone-words'
  | 'current-streak'
  | 'longest-streak'
  | `words-ending-${string}`;

export type SuffixKey = 'ed' | 'ing' | 'ly' | 'ness' | 'ful' | 'less';

export type StatsSlug =
  | 'alphabetical-order'
  | 'double-letters'
  | 'triple-letters'
  | 'same-start-end'
  | 'palindromes'
  | 'all-consonants'
  | 'all-vowels'
  | 'most-common-letter'
  | 'least-common-letter'
  | 'milestone-words'
  | 'current-streak'
  | 'longest-streak'
  | 'words-ending-ed'
  | 'words-ending-ing'
  | 'words-ending-ly'
  | 'words-ending-ness'
  | 'words-ending-ful'
  | 'words-ending-less';