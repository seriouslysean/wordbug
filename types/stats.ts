import type { STATS_SLUGS } from '#constants/stats';
import type { COMMON_WORD_ENDINGS } from '#constants/text-patterns';
import type { WordData, WordMilestoneItem } from '#types/word';

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
 * Available word suffix patterns, derived from the tracked endings
 */
export type SuffixKey = typeof COMMON_WORD_ENDINGS[number];

/**
 * All available stats page slugs, derived from the slug constants
 */
export type StatsSlug = typeof STATS_SLUGS[keyof typeof STATS_SLUGS];

/**
 * Template type for suffix-based stats slugs
 */
export type SuffixStatsSlug = `words-ending-${SuffixKey}`;


/**
 * Props for a stats detail page, discriminated by `type` so the page narrows
 * `words` with a plain comparison instead of asserting.
 */
export interface StatsWordListPageProps {
  type: 'word-list';
  words: WordData[];
  description: string;
}

export interface StatsMilestonePageProps {
  type: 'milestone';
  words: WordMilestoneItem[];
  description: string;
}

export type StatsPageProps = StatsWordListPageProps | StatsMilestonePageProps;
